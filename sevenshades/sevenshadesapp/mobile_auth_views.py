"""Cache-backed mobile login/signup, with bounded guesses and single-use codes."""
import time
from django.core.cache import cache
from django.db import transaction
from django.contrib.auth.hashers import make_password
from django.http import JsonResponse
from django.utils.crypto import constant_time_compare, salted_hmac
from rest_framework.decorators import api_view
from .mobile_auth_serializers import SendOtpSerializer, VerifyOtpSerializer
from .mobile_tokens import issue_token
from .models import SignUp
from .serializer import SignUpSafeSerializer
from .security import establish_session, failure
from .sms_provider import available, new_code, send_sms, test_mode, SmsError


def code_hash(phone, code):
    return salted_hmac('mobile-auth-otp', phone + ':' + code, algorithm='sha256').hexdigest()


def limited(key, maximum, seconds):
    cache.add(key, 0, timeout=seconds)
    return cache.incr(key) > maximum


@api_view(['POST'])
def send_otp(request):
    serializer = SendOtpSerializer(data=request.data)
    if not serializer.is_valid():
        return JsonResponse({'status': False, 'errors': serializer.errors, 'message': 'Enter a valid 10-digit Indian mobile number.'}, status=400)
    if not available():
        return failure('SMS delivery is not configured.', 503)
    phone = serializer.validated_data['phone']
    ip = salted_hmac('otp-ip', request.META.get('REMOTE_ADDR', '')).hexdigest()
    if limited('sms_ip_' + ip, 30, 3600):
        return failure('Too many requests. Try again later.', 429)
    if not cache.add('sms_cooldown_' + phone, True, timeout=60):
        return failure('Please wait 60 seconds before requesting another OTP.', 429)
    if limited('sms_phone_' + phone, 10, 3600):
        return failure('Too many OTP requests. Try again later.', 429)
    lock = 'otp_lock_' + phone
    if not cache.add(lock, True, timeout=60):
        return failure('An OTP request is being processed. Try again shortly.', 429)
    try:
        # Invalidate old code even if delivery fails; never leave an undelivered code usable.
        cache.delete('otp_' + phone)
        code = new_code()
        try:
            send_sms(phone, code)
        except SmsError as exc:
            return failure(str(exc), 502)
        cache.set('otp_' + phone, {'hash': code_hash(phone, code), 'attempts': 0,
                  'expires_at': time.time() + 300}, timeout=300)
    finally:
        cache.delete(lock)
    return JsonResponse({'status': True, 'message': 'Development OTP is ready. No SMS is sent.' if test_mode() else 'OTP sent to your mobile number.',
        'data': {'expires_in': 300, 'resend_after': 60, 'test_mode': test_mode()}})


@api_view(['POST'])
def verify_otp(request):
    serializer = VerifyOtpSerializer(data=request.data)
    if not serializer.is_valid():
        return JsonResponse({'status': False, 'errors': serializer.errors, 'message': 'Enter a valid mobile number and 6-digit OTP.'}, status=400)
    phone, code = serializer.validated_data['phone'], serializer.validated_data['otp']
    lock = 'otp_lock_' + phone
    if not cache.add(lock, True, timeout=60):
        return failure('Verification is already in progress. Try again shortly.', 429)
    try:
        key = 'otp_' + phone
        record = cache.get(key)
        if not record or record['expires_at'] <= time.time():
            cache.delete(key)
            return failure('OTP expired or already used. Request a new OTP.', 400)
        if not constant_time_compare(record['hash'], code_hash(phone, code)):
            record['attempts'] += 1
            if record['attempts'] >= 5:
                cache.delete(key)
                return failure('Too many incorrect attempts. Request a new OTP.', 400)
            cache.set(key, record, timeout=max(1, int(record['expires_at'] - time.time())))
            return failure('Invalid OTP. Please try again.', 400)
        cache.delete(key)
        with transaction.atomic():
            # SignUp is the app's customer record; do not create a disconnected auth.User.
            account, created = SignUp.objects.get_or_create(mobileno=phone,
                defaults={'emailid': None, 'password': make_password(None)})
        token = issue_token(account)
        establish_session(request, 'customer', account)
        return JsonResponse({'status': True, 'token': token, 'token_type': 'Bearer', 'expires_in': 3600,
            'created': created, 'data': [SignUpSafeSerializer(account).data]})
    finally:
        cache.delete(lock)
