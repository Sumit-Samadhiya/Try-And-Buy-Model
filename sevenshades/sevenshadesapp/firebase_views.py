import logging
from django.db import transaction
from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import User
from django.http import JsonResponse
from rest_framework.decorators import api_view
from .firebase_auth import verify_firebase_id_token
from .models import SignUp
from .mobile_tokens import issue_token
from .serializer import SignUpSafeSerializer
from .security import establish_session, failure

logger = logging.getLogger(__name__)


@api_view(['POST'])
def firebase_login(request):
    """Verifies Firebase ID token and authenticates/creates customer in Django."""
    id_token = request.data.get('id_token')
    if not id_token or not isinstance(id_token, str):
        return failure('id_token is required.', 400)

    decoded_token, error = verify_firebase_id_token(id_token)
    if error or not decoded_token:
        return failure(f'Authentication failed: {error or "Invalid token."}', 401)

    phone_number = decoded_token.get('phone_number')
    if not phone_number:
        return failure('No verified phone number found in the token.', 400)

    # Normalize phone: extract 10-digit Indian mobile number
    clean_phone = phone_number
    if clean_phone.startswith('+91'):
        clean_phone = clean_phone[3:]
    elif clean_phone.startswith('+'):
        clean_phone = clean_phone[1:]

    name = decoded_token.get('name') or ''
    name_parts = name.strip().split(' ') if name else []
    
    req_fname = request.data.get('fname')
    req_lname = request.data.get('lname')
    req_email = request.data.get('emailid')
    req_password = request.data.get('password')

    fname = req_fname or (name_parts[0] if name_parts else 'Customer')
    lname = req_lname or (' '.join(name_parts[1:]) if len(name_parts) > 1 else '')
    email = req_email or decoded_token.get('email') or None

    with transaction.atomic():
        account, created = SignUp.objects.get_or_create(
            mobileno=clean_phone,
            defaults={
                'fname': fname,
                'lname': lname,
                'emailid': email,
                'password': make_password(req_password) if req_password else make_password(None)
            }
        )
        if not created and (req_fname or req_email or req_password):
            if req_fname:
                account.fname = req_fname
            if req_lname:
                account.lname = req_lname
            if req_email:
                account.emailid = req_email
            if req_password:
                account.password = make_password(req_password)
            account.save()

        # Synchronize with Django's User model
        User.objects.get_or_create(
            username=clean_phone,
            defaults={
                'first_name': account.fname,
                'last_name': account.lname,
                'email': account.emailid or ''
            }
        )

    # Issue application JWT and establish session
    token = issue_token(account)
    establish_session(request, 'customer', account)

    safe_user_data = SignUpSafeSerializer(account).data

    return JsonResponse({
        'status': True,
        'message': 'Signed in successfully with Firebase.',
        'token': token,
        'token_type': 'Bearer',
        'expires_in': 3600,
        'created': created,
        'user': safe_user_data,
        'data': [safe_user_data]
    })
