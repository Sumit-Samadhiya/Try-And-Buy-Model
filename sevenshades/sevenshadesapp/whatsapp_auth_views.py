import json
import logging
import os
import re
import secrets
import urllib.request
import urllib.error
from datetime import timedelta
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password, check_password
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.utils import timezone
from rest_framework.decorators import api_view

from .models import WhatsAppOtp, SignUp
from .mobile_tokens import issue_token
from .serializer import SignUpSafeSerializer
from .security import establish_session

logger = logging.getLogger(__name__)

RE_MOBILE = re.compile(r'^[6-9]\d{9}$')
RE_OTP = re.compile(r'^\d{6}$')


def _get_service_url():
    """Retrieve configured WhatsApp Baileys service URL dynamically from settings or environment."""
    configured = getattr(settings, 'WHATSAPP_SERVICE_URL', None) or os.environ.get('WHATSAPP_SERVICE_URL', '')
    url = str(configured).strip().rstrip('/') if configured else 'http://127.0.0.1:5001'
    return url or 'http://127.0.0.1:5001'


def _clean_phone(raw):
    digits = re.sub(r'\D', '', str(raw or '').strip())
    if len(digits) == 12 and digits.startswith('91'):
        digits = digits[2:]
    return digits


def _call_baileys_service(endpoint, payload=None, method='POST', timeout=20):
    service_url = _get_service_url()
    url = f"{service_url}/{endpoint.lstrip('/')}"
    data_bytes = json.dumps(payload).encode('utf-8') if payload is not None else None
    headers = {
        'User-Agent': 'SevenShades-Backend/1.0',
        'Accept': 'application/json'
    }
    if payload is not None:
        headers['Content-Type'] = 'application/json'
    req = urllib.request.Request(url, data=data_bytes, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            content = resp.read().decode('utf-8')
            return resp.status, json.loads(content) if content else {}
    except urllib.error.HTTPError as exc:
        try:
            err_content = json.loads(exc.read().decode('utf-8'))
        except Exception:
            err_content = {'message': exc.reason}
        return exc.code, err_content
    except Exception as exc:
        logger.warning("Failed to reach WhatsApp Baileys service at %s: %s", url, exc)
        return 503, {
            'message': 'WhatsApp service unreachable.',
            'target_url': url,
            'detail': str(exc)
        }


@api_view(['POST'])
def send_whatsapp_otp(request):
    """Generate and dispatch a 6-digit WhatsApp OTP with strict rate limiting and 5-min TTL."""
    data = request.data
    raw_phone = data.get('phone') or data.get('mobileno')
    phone = _clean_phone(raw_phone)
    purpose = str(data.get('purpose') or 'login').strip().lower()

    if not phone or not RE_MOBILE.fullmatch(phone):
        return JsonResponse({
            'status': False,
            'success': False,
            'message': 'Enter a valid 10-digit Indian mobile number.'
        }, status=400)

    # Validate purpose constraints before sending OTP
    if purpose == 'reset':
        if not SignUp.objects.filter(mobileno=phone).exists():
            return JsonResponse({
                'status': False,
                'success': False,
                'message': 'No account found with this mobile number. Please create an account.'
            }, status=404)
    elif purpose == 'signup':
        if SignUp.objects.filter(mobileno=phone).exists():
            return JsonResponse({
                'status': False,
                'success': False,
                'message': 'An account already exists with this mobile number. Please sign in.'
            }, status=409)

    now = timezone.now()

    # Rate Limit 1: Max 3 attempts per 15 minutes
    recent_attempts = WhatsAppOtp.objects.filter(phone=phone, created_at__gte=now - timedelta(minutes=15)).count()
    if recent_attempts >= 3:
        return JsonResponse({
            'status': False,
            'success': False,
            'message': 'Too many OTP requests. Maximum 3 attempts allowed per 15 minutes.'
        }, status=429)

    # Rate Limit 2: 60-second cooldown per phone number
    if WhatsAppOtp.objects.filter(phone=phone, created_at__gte=now - timedelta(seconds=60)).exists():
        return JsonResponse({
            'status': False,
            'success': False,
            'message': 'Please wait 60 seconds before requesting another WhatsApp OTP.'
        }, status=429)

    # Invalidate previous unconsumed OTPs for this number
    WhatsAppOtp.objects.filter(phone=phone, is_consumed=False).update(is_consumed=True)

    # Generate 6-digit cryptographically secure numeric OTP
    otp_code = f"{secrets.randbelow(900000) + 100000:06d}"
    otp_hash = make_password(otp_code)
    expires_at = now + timedelta(minutes=5)

    otp_record = WhatsAppOtp.objects.create(
        phone=phone,
        otp_hash=otp_hash,
        expires_at=expires_at
    )

    # Dispatch message via self-hosted Baileys socket service
    status_code, resp = _call_baileys_service('send-otp', {'phone': phone, 'otp': otp_code})

    if status_code != 200 or not resp.get('success'):
        otp_record.delete()  # Clean up record so rate limit isn't penalized if socket is down
        error_msg = resp.get('message') or 'WhatsApp verification service is temporarily unavailable. Please try again in a few moments.'
        return JsonResponse({
            'status': False,
            'success': False,
            'message': error_msg
        }, status=503 if status_code in (503, 502) else 500)

    return JsonResponse({
        'status': True,
        'success': True,
        'message': 'OTP sent to your WhatsApp successfully.',
        'phone': phone,
        'cooldown': 60,
        'expiresIn': 300,
    })


@api_view(['POST'])
def verify_whatsapp_otp(request):
    """Verify 6-digit WhatsApp OTP for login, registration, or password reset."""
    data = request.data
    raw_phone = data.get('phone') or data.get('mobileno')
    phone = _clean_phone(raw_phone)
    otp = str(data.get('otp') or '').strip()
    purpose = str(data.get('purpose') or 'login').strip().lower()

    if not phone or not RE_MOBILE.fullmatch(phone):
        return JsonResponse({
            'status': False,
            'success': False,
            'message': 'Enter a valid 10-digit Indian mobile number.'
        }, status=400)

    if not otp or not RE_OTP.fullmatch(otp):
        return JsonResponse({
            'status': False,
            'success': False,
            'message': 'Enter the 6-digit verification code received on WhatsApp.'
        }, status=400)

    now = timezone.now()
    otp_record = WhatsAppOtp.objects.filter(
        phone=phone,
        is_consumed=False,
        expires_at__gte=now
    ).order_by('-created_at').first()

    if not otp_record:
        return JsonResponse({
            'status': False,
            'success': False,
            'message': 'Invalid or expired OTP. Please request a new code.'
        }, status=400)

    # Brute-force protection: Max 5 incorrect attempts per OTP challenge
    if otp_record.attempts >= 5:
        otp_record.is_consumed = True
        otp_record.save(update_fields=['is_consumed'])
        return JsonResponse({
            'status': False,
            'success': False,
            'message': 'Too many incorrect attempts. Please request a new OTP.'
        }, status=429)

    if not check_password(otp, otp_record.otp_hash):
        otp_record.attempts += 1
        otp_record.save(update_fields=['attempts'])
        remaining = 5 - otp_record.attempts
        return JsonResponse({
            'status': False,
            'success': False,
            'message': f'Incorrect verification code. {remaining} attempt{"s" if remaining != 1 else ""} remaining.'
        }, status=400)

    # Mark OTP as consumed
    otp_record.is_consumed = True
    otp_record.save(update_fields=['is_consumed'])

    # 1. Reset Password Flow
    if purpose == 'reset':
        password = str(data.get('password') or '')
        confirm_password = str(data.get('confirm_password') or '')
        if not password or not confirm_password:
            return JsonResponse({'status': False, 'success': False, 'message': 'New password and confirmation are required.'}, status=400)
        if password != confirm_password:
            return JsonResponse({'status': False, 'success': False, 'message': 'Passwords do not match.'}, status=400)
        try:
            validate_password(password)
        except ValidationError as exc:
            return JsonResponse({'status': False, 'success': False, 'message': ' '.join(exc.messages)}, status=400)

        account = SignUp.objects.filter(mobileno=phone).first()
        if not account:
            return JsonResponse({'status': False, 'success': False, 'message': 'No account found with this mobile number.'}, status=404)

        account.password = make_password(password)
        account.save(update_fields=['password'])

        u, _ = get_user_model().objects.get_or_create(username=phone)
        u.password = account.password
        u.save(update_fields=['password'])

        establish_session(request, 'customer', account)
        token = issue_token(account)
        user_data = SignUpSafeSerializer(account).data
        return JsonResponse({
            'status': True,
            'success': True,
            'message': 'Password reset successfully. You are now signed in.',
            'token': token,
            'token_type': 'Bearer',
            'expires_in': 3600,
            'created': False,
            'user': user_data,
            'data': [user_data]
        })

    # 2. Signup Flow
    elif purpose == 'signup':
        password = str(data.get('password') or '')
        confirm_password = str(data.get('confirm_password') or '')
        fname = str(data.get('fname') or 'Customer').strip()
        lname = str(data.get('lname') or '').strip()
        emailid = str(data.get('emailid') or '').strip()

        if password or confirm_password:
            if password != confirm_password:
                return JsonResponse({'status': False, 'success': False, 'message': 'Passwords do not match.'}, status=400)
            try:
                validate_password(password)
            except ValidationError as exc:
                return JsonResponse({'status': False, 'success': False, 'message': ' '.join(exc.messages)}, status=400)

        account = SignUp.objects.filter(mobileno=phone).first()
        if account:
            return JsonResponse({'status': False, 'success': False, 'message': 'An account already exists with this mobile number. Please sign in.'}, status=409)

        account = SignUp.objects.create(
            mobileno=phone,
            fname=fname or 'Customer',
            lname=lname,
            emailid=emailid,
            password=make_password(password) if password else make_password(None)
        )
        get_user_model().objects.get_or_create(
            username=phone,
            defaults={
                'first_name': account.fname,
                'last_name': account.lname,
                'email': account.emailid or '',
                'password': account.password,
            }
        )
        establish_session(request, 'customer', account)
        token = issue_token(account)
        user_data = SignUpSafeSerializer(account).data
        return JsonResponse({
            'status': True,
            'success': True,
            'message': 'Account created successfully via WhatsApp verification.',
            'token': token,
            'token_type': 'Bearer',
            'expires_in': 3600,
            'created': True,
            'user': user_data,
            'data': [user_data]
        })

    # 3. Default Login Flow (Fetch or auto-create account)
    else:
        account = SignUp.objects.filter(mobileno=phone).first()
        created = False
        if not account:
            account = SignUp.objects.create(
                mobileno=phone,
                fname='Customer',
                lname='',
                password=make_password(None)
            )
            created = True

        get_user_model().objects.get_or_create(
            username=phone,
            defaults={
                'first_name': account.fname,
                'last_name': account.lname,
                'email': account.emailid or '',
                'password': make_password(None),
            }
        )
        establish_session(request, 'customer', account)
        token = issue_token(account)
        user_data = SignUpSafeSerializer(account).data

        return JsonResponse({
            'status': True,
            'success': True,
            'message': 'Signed in successfully via WhatsApp.',
            'token': token,
            'token_type': 'Bearer',
            'expires_in': 3600,
            'created': created,
            'user': user_data,
            'data': [user_data],
        })


@api_view(['GET'])
def whatsapp_status(request):
    """Inspect WhatsApp Baileys service connection status and QR availability."""
    service_url = _get_service_url()
    status_code, resp = _call_baileys_service('status', method='GET', timeout=15)
    if status_code == 200:
        return JsonResponse({
            'status': True,
            'service_online': True,
            'is_connected': resp.get('isConnected', False),
            'user_jid': resp.get('userJid'),
            'has_qr': resp.get('hasQr', False),
            'qr_code': resp.get('currentQr'),
            'qr_page_url': f"{service_url}/qr",
            'service_url': service_url,
        })
    return JsonResponse({
        'status': False,
        'service_online': False,
        'is_connected': False,
        'message': 'WhatsApp Baileys service is currently offline.',
        'target_url': service_url,
        'details': resp.get('message') if isinstance(resp, dict) else str(resp),
        'help': 'Verify WHATSAPP_SERVICE_URL in Render environment variables.',
    }, status=503)
