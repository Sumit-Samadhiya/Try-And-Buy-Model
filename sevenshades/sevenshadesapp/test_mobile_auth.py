"""Application bearer tokens after the Firebase phone-auth migration."""
from unittest.mock import patch
import time
import jwt
from django.conf import settings
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient
from .models import SignUp

class MobileAuthTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient(enforce_csrf_checks=True)
        self.phone = '9876543210'

    def login_phone(self, phone=None):
        claims = {'phone_number': '+91' + (phone or self.phone), 'auth_time': time.time(), 'firebase': {'sign_in_provider': 'phone'}}
        token = self.client.get('/api/auth_csrf').json()['csrfToken']
        with patch('sevenshadesapp.firebase_views.verify_firebase_id_token', return_value=(claims, None)):
            return self.client.post('/api/auth/firebase-login/', {'id_token': 'verified-proof'}, format='json', HTTP_X_CSRFTOKEN=token)

    def test_existing_and_multiple_phone_only_accounts(self):
        SignUp.objects.create(mobileno=self.phone, fname='Existing', emailid='existing@example.test', password='StrongTest123!')
        response = self.login_phone()
        self.assertFalse(response.json()['created'])
        self.assertEqual(response.json()['data'][0]['fname'], 'Existing')
        for phone in ('9876543211', '9876543212'):
            self.assertEqual(self.login_phone(phone).status_code, 200)
        self.assertEqual(SignUp.objects.count(), 3)

    def test_customer_token_cannot_access_admin_and_logout_revokes_it(self):
        token = self.login_phone().json()['token']
        client = APIClient(enforce_csrf_checks=True)
        client.credentials(HTTP_AUTHORIZATION='Bearer ' + token)
        self.assertEqual(client.get('/api/auth_session').json()['role'], 'customer')
        self.assertEqual(client.get('/api/admin_quick_dashboard').status_code, 403)
        self.assertEqual(client.post('/api/auth_logout', {}, format='json').status_code, 200)
        self.assertEqual(client.get('/api/auth_session').status_code, 401)

    def test_expired_forged_and_password_revoked_tokens(self):
        token = self.login_phone().json()['token']
        claims = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'], audience='sevenshades-customer')
        client = APIClient()
        claims['exp'] = int(time.time()) - 1
        expired = jwt.encode(claims, settings.SECRET_KEY, algorithm='HS256')
        for invalid in (expired, token + 'x'):
            client.credentials(HTTP_AUTHORIZATION='Bearer ' + invalid)
            self.assertEqual(client.get('/api/auth_session').status_code, 401)
        account = SignUp.objects.get(pk=self.phone)
        account.password = 'ChangedPassword123!'
        account.save()
        client.credentials(HTTP_AUTHORIZATION='Bearer ' + token)
        self.assertEqual(client.get('/api/auth_session').status_code, 401)
