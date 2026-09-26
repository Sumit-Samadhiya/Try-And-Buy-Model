"""Purpose/session-bound, expiring, single-use development OTP challenges."""
import re
import uuid
from datetime import timedelta
from django.conf import settings
from django.db import transaction, IntegrityError
from django.db.models import F
from django.http import JsonResponse
from django.utils import timezone
from django.utils.crypto import salted_hmac, constant_time_compare
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view
from .models import OtpChallenge, SignUp
from .serializer import SignUpSerializer, SignUpSafeSerializer
from .security import failure, establish_session
from .sms_provider import available, test_mode, new_code, send_sms, SmsError


def enabled():
    return available()


def digest(value):
    return salted_hmac('customer-otp', value, algorithm='sha256').hexdigest()


@api_view(['GET'])
def OtpConfig(request):
    return JsonResponse({'status': True, 'data': {'available': True, 'test_mode': test_mode(), 'expires_in': 300, 'resend_after': 60}})


@api_view(['POST'])
@transaction.atomic
def RequestOtp(request):
    if not enabled():
        return failure('OTP delivery is not configured. Please use password login.', 503)
    mobile, purpose = request.data.get('mobileno'), request.data.get('purpose')
    if not isinstance(mobile, str) or not re.fullmatch(r'[6-9][0-9]{9}', mobile) or purpose not in ('login', 'signup', 'reset'):
        return failure('Enter a valid 10-digit mobile number and OTP purpose.', 400)
    if not request.session.session_key:
        request.session.create()
    now = timezone.now()
    ip_hash = digest(request.META.get('REMOTE_ADDR', ''))
    # Serialize issuance on SQLite; limits persist across backend restarts.
    OtpChallenge.objects.filter(mobile=mobile).update(attempts=F('attempts'))
    if OtpChallenge.objects.filter(mobile=mobile, created_at__gt=now-timedelta(seconds=60)).exists():
        return failure('Please wait 60 seconds before requesting another OTP.', 429)
    recent = OtpChallenge.objects.filter(created_at__gt=now-timedelta(hours=1))
    if recent.filter(mobile=mobile).count() >= 10 or recent.filter(ip_hash=ip_hash).count() >= 30:
        return failure('Too many OTP requests. Please try again later.', 429)
    session_hash = digest(request.session.session_key)
    OtpChallenge.objects.filter(mobile=mobile, purpose=purpose, session_hash=session_hash, consumed=False).update(consumed=True)
    key = str(uuid.uuid4())
    code = new_code()
    challenge = OtpChallenge.objects.create(challenge_id=key, mobile=mobile, purpose=purpose, session_hash=session_hash,
        ip_hash=ip_hash, code_hash=digest(key + ':' + code), expires_at=now+timedelta(minutes=5), consumed=True)
    try:
        send_sms(mobile, code)
    except SmsError as exc:
        return failure(str(exc), 502)
    challenge.consumed = False
    challenge.save(update_fields=['consumed'])
    return JsonResponse({'status': True, 'message': 'Development OTP is ready. No SMS is sent.' if test_mode() else 'OTP sent to your mobile number.',
        'data': {'challenge_id': key, 'expires_in': 300, 'resend_after': 60, 'test_mode': test_mode()}})


def consume(request, purpose):
    if not enabled():
        return failure('OTP delivery is not configured.', 503)
    key, mobile, code = (request.data.get(field) for field in ('challenge_id', 'mobileno', 'otp'))
    if not isinstance(key, str) or len(key) != 36 or not isinstance(code, str) or not re.fullmatch(r'[0-9]{6}', code):
        return failure('Enter the 6-digit OTP from a current request.', 400)
    OtpChallenge.objects.filter(challenge_id=key).update(attempts=F('attempts'))
    challenge = OtpChallenge.objects.select_for_update().filter(challenge_id=key, mobile=mobile, purpose=purpose,
        session_hash=digest(request.session.session_key or '')).first()
    if not challenge or challenge.consumed or challenge.expires_at <= timezone.now() or challenge.attempts >= 5:
        return failure('OTP expired, already used or locked. Request a new OTP.', 400)
    challenge.attempts += 1
    valid = constant_time_compare(challenge.code_hash, digest(key + ':' + code))
    challenge.consumed = valid or challenge.attempts >= 5
    challenge.save(update_fields=['attempts', 'consumed'])
    if not valid:
        return failure('Incorrect OTP. Please check and try again.', 400)
    return None


@api_view(['POST'])
@transaction.atomic
def OtpLogin(request):
    error = consume(request, 'login')
    if error is not None:
        return error
    account = SignUp.objects.filter(pk=request.data.get('mobileno')).first()
    if not account:
        return failure('No account found. Please create an account.', 400)
    establish_session(request, 'customer', account)
    return JsonResponse({'status': True, 'data': [SignUpSafeSerializer(account).data]})


@api_view(['POST'])
@transaction.atomic
def OtpSignup(request):
    serializer = SignUpSerializer(data=request.data)
    if not serializer.is_valid():
        return JsonResponse({'status': False, 'message': 'Please check your details.', 'errors': serializer.errors}, status=400)
    error = consume(request, 'signup')
    if error is not None:
        return error
    try:
        with transaction.atomic():
            serializer.save()
    except IntegrityError:
        return failure('An account with these details already exists.', 409)
    return JsonResponse({'status': True, 'message': 'Mobile verified. Account created; you can now sign in.'}, status=201)


@api_view(['POST'])
@transaction.atomic
def ResetPassword(request):
    password = request.data.get('password')
    if not isinstance(password, str) or not 8 <= len(password) <= 128 or password != request.data.get('confirm_password'):
        return failure('Passwords must match and contain 8–128 characters.', 400)
    try:
        validate_password(password)
    except ValidationError as exc:
        return JsonResponse({'status': False, 'message': ' '.join(exc.messages), 'errors': {'password': exc.messages}}, status=400)
    error = consume(request, 'reset')
    if error is not None:
        return error
    account = SignUp.objects.select_for_update().filter(pk=request.data.get('mobileno')).first()
    if not account:
        return failure('No account found. Please create an account.', 400)
    from django.contrib.auth.hashers import make_password
    account.password = make_password(password)
    account.save(update_fields=['password'])
    # All prior sessions are revoked through the account password fingerprint.
    request.session.flush()
    return JsonResponse({'status': True, 'message': 'Password reset. Sign in with your new password.'})
