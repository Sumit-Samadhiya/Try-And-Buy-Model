"""Exchange a recent Firebase phone proof for application credentials."""
import re
import time
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import transaction
from django.http import JsonResponse
from rest_framework import serializers
from rest_framework.decorators import api_view
from .firebase_auth import verify_firebase_id_token
from .models import SignUp
from .mobile_tokens import issue_token
from .serializer import SignUpSafeSerializer
from .security import establish_session, failure


class FirebaseLoginSerializer(serializers.Serializer):
    id_token = serializers.CharField(max_length=8192, trim_whitespace=True)
    purpose = serializers.ChoiceField(choices=['login', 'signup', 'reset'], default='login')
    fname = serializers.CharField(max_length=70, required=False)
    lname = serializers.CharField(max_length=70, required=False)
    emailid = serializers.EmailField(max_length=70, required=False)
    password = serializers.CharField(max_length=128, required=False, trim_whitespace=False)
    confirm_password = serializers.CharField(max_length=128, required=False, trim_whitespace=False)

    def validate(self, data):
        if set(self.initial_data) - set(self.fields):
            raise serializers.ValidationError('Unexpected authentication fields.')
        purpose = data['purpose']
        if purpose == 'login' and set(data) & {'password', 'fname', 'lname', 'emailid', 'confirm_password'}:
            raise serializers.ValidationError('Profile changes require signup or password reset.')
        required = ['password', 'confirm_password'] if purpose == 'reset' else (
            ['fname', 'lname', 'emailid', 'password', 'confirm_password'] if purpose == 'signup' else [])
        for key in required:
            if not data.get(key):
                raise serializers.ValidationError({key: 'This field is required.'})
        if purpose in ('signup', 'reset'):
            if data['password'] != data['confirm_password']:
                raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
            try:
                validate_password(data['password'])
            except ValidationError as exc:
                raise serializers.ValidationError({'password': exc.messages})
        return data


@api_view(['POST'])
def firebase_login(request):
    serializer = FirebaseLoginSerializer(data=request.data)
    if not serializer.is_valid():
        return JsonResponse({'status': False, 'message': 'Check your authentication details.',
                             'errors': serializer.errors}, status=400)
    data = serializer.validated_data
    decoded, error = verify_firebase_id_token(data['id_token'])
    if error or not decoded:
        return failure('Phone authentication is temporarily unavailable.' if error == 'unavailable'
                       else 'Phone verification expired or invalid. Request a new OTP.',
                       503 if error == 'unavailable' else 401)
    phone = decoded.get('phone_number', '')
    if not isinstance(phone, str) or not re.fullmatch(r'\+91[6-9][0-9]{9}', phone):
        return failure('A verified Indian mobile number is required.', 400)
    if decoded.get('firebase', {}).get('sign_in_provider') != 'phone':
        return failure('Verify your phone using OTP to continue.', 401)
    auth_time = decoded.get('auth_time')
    if not isinstance(auth_time, (int, float)) or not -60 <= time.time() - auth_time <= 300:
        return failure('Phone verification expired. Request a new OTP.', 401)
    mobile, purpose = phone[3:], data['purpose']
    with transaction.atomic():
        account = SignUp.objects.select_for_update().filter(mobileno=mobile).first()
        if purpose == 'signup' and account:
            return failure('An account already exists. Sign in or reset your password.', 409)
        if purpose == 'reset' and not account:
            return failure('No account found. Please sign up first.', 404)
        created = account is None
        if created:
            account, created = SignUp.objects.get_or_create(mobileno=mobile, defaults={
                'fname': data.get('fname', 'Customer'), 'lname': data.get('lname', ''),
                'emailid': data.get('emailid'),
                'password': make_password(data.get('password'))})
            if purpose == 'signup' and not created:
                return failure('An account already exists. Please sign in.', 409)
        if purpose == 'reset':
            account.password = make_password(data['password'])
            account.save(update_fields=['password'])
        get_user_model().objects.get_or_create(username=mobile, defaults={
            'first_name': account.fname, 'last_name': account.lname,
            'email': account.emailid or '', 'password': make_password(None)})
    establish_session(request, 'customer', account)
    user = SignUpSafeSerializer(account).data
    return JsonResponse({'status': True, 'message': 'Password reset successfully.' if purpose == 'reset'
                         else 'Signed in successfully.', 'token': issue_token(account),
                         'token_type': 'Bearer', 'expires_in': 3600, 'created': created,
                         'user': user, 'data': [user]})


@api_view(['GET', 'POST'])
def legacy_otp_disabled(request):
    return failure('Use Firebase phone verification in the app.', 410)
