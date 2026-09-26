import time
from unittest.mock import patch
from django.test import TestCase
from django.core.cache import cache
from django.contrib.auth.hashers import check_password
from rest_framework.test import APIClient
from sevenshadesapp.models import SignUp
from sevenshadesapp.mobile_tokens import issue_token


class FirebaseAuthTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient(enforce_csrf_checks=True)
        self.claims = {'phone_number': '+919988776655', 'auth_time': time.time(),
                       'firebase': {'sign_in_provider': 'phone'}}
        self.mock = patch('sevenshadesapp.firebase_views.verify_firebase_id_token').start()
        self.addCleanup(patch.stopall)
        self.mock.return_value = (self.claims, None)

    def post(self, body):
        token = self.client.get('/api/auth_csrf').json()['csrfToken']
        return self.client.post('/api/auth/firebase-login/', body, format='json', HTTP_X_CSRFTOKEN=token)

    def test_creates_user_and_bearer_session_and_logout_revokes_token(self):
        response = self.post({'id_token': 'proof'})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['user']['mobileno'], '9988776655')
        token_client = APIClient(enforce_csrf_checks=True)
        token_client.credentials(HTTP_AUTHORIZATION='Bearer ' + data['token'])
        self.assertEqual(token_client.get('/api/auth_session').status_code, 200)
        self.assertEqual(token_client.post('/api/auth_logout', {}, format='json').status_code, 200)
        self.assertEqual(token_client.get('/api/auth_session').status_code, 401)

    def test_bad_and_missing_proof(self):
        self.assertEqual(self.post({}).status_code, 400)
        self.mock.return_value = (None, 'invalid')
        self.assertEqual(self.post({'id_token': 'bad'}).status_code, 401)
        self.mock.return_value = (None, 'unavailable')
        self.assertEqual(self.post({'id_token': 'bad'}).status_code, 503)

    def test_foreign_stale_or_non_phone_proof_rejected(self):
        for changes in ({'phone_number': '+19988776655'}, {'auth_time': time.time()-600},
                        {'firebase': {'sign_in_provider': 'password'}}):
            self.mock.return_value = ({**self.claims, **changes}, None)
            self.assertIn(self.post({'id_token': 'proof'}).status_code, (400, 401))
        self.assertEqual(SignUp.objects.count(), 0)

    def test_reset_changes_password_and_invalidates_old_jwt(self):
        account = SignUp.objects.create(mobileno='9988776655', password='Previous-Password!42')
        old_token = issue_token(account)
        response = self.post({'id_token': 'proof', 'purpose': 'reset',
                              'password': 'Fresh-password!429', 'confirm_password': 'Fresh-password!429'})
        self.assertEqual(response.status_code, 200)
        account.refresh_from_db()
        self.assertTrue(check_password('Fresh-password!429', account.password))
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION='Bearer ' + old_token)
        self.assertEqual(client.get('/api/auth_session').status_code, 401)

    def test_signup_cannot_overwrite_existing_account_and_weak_password_rejected(self):
        SignUp.objects.create(mobileno='9988776655', password='Original-password!42')
        body = {'id_token': 'proof', 'purpose': 'signup', 'fname': 'Test', 'lname': 'User',
                'emailid': 'test@example.com', 'password': 'Strong-password!42',
                'confirm_password': 'Strong-password!42'}
        self.assertEqual(self.post(body).status_code, 409)
        body.update(password='12345', confirm_password='12345')
        self.assertEqual(self.post(body).status_code, 400)
        self.assertEqual(self.post({'id_token': 'proof', 'password': 'Unexpected!42'}).status_code, 400)

    def test_old_otp_routes_do_not_send_sms(self):
        token = self.client.get('/api/auth_csrf').json()['csrfToken']
        response = self.client.post('/api/auth/send-otp/', {'phone': '9988776655'},
                                    format='json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 410)

class FirebaseVerificationTests(TestCase):
    @patch('sevenshadesapp.firebase_auth.auth.verify_id_token')
    @patch('sevenshadesapp.firebase_auth.get_firebase_app')
    def test_sdk_verification_checks_revocation(self, get_app, verify):
        from .firebase_auth import verify_firebase_id_token
        verify.return_value = {'phone_number': '+919988776655'}
        claims, error = verify_firebase_id_token('signed-proof')
        self.assertIsNone(error)
        verify.assert_called_once_with('signed-proof', app=get_app.return_value, check_revoked=True)
        self.assertEqual(claims['phone_number'], '+919988776655')
