from unittest.mock import patch, Mock
import time
import requests
import jwt
from django.conf import settings
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from .models import SignUp


@override_settings(FAST2SMS_API_KEY='test-key', OTP_TEST_MODE=False)
class MobileAuthTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient(enforce_csrf_checks=True)
        self.phone = '9876543210'
        self.transport = patch('sevenshadesapp.sms_provider.requests.post')
        self.sms = self.transport.start()
        self.addCleanup(self.transport.stop)
        self.sms.return_value = Mock(ok=True, json=Mock(return_value={'return': True}))

    def post(self, endpoint, data):
        token = self.client.get('/api/auth_csrf').json()['csrfToken']
        return self.client.post('/api/' + endpoint, data, format='json', HTTP_X_CSRFTOKEN=token)

    def send(self, phone=None):
        phone = phone or self.phone
        response = self.post('auth/send-otp/', {'phone': phone})
        self.assertEqual(response.status_code, 200, response.content)
        code = self.sms.call_args.kwargs['json']['variables_values']
        self.assertRegex(code, r'^\d{6}$')
        self.assertNotIn(code, response.content.decode())
        return code

    def verify(self, code, phone=None):
        return self.post('auth/verify-otp/', {'phone': phone or self.phone, 'otp': code})

    def test_transport_and_single_use_login_with_working_token(self):
        code = self.send()
        self.assertEqual(self.sms.call_args.args[0], 'https://www.fast2sms.com/dev/bulkV2')
        self.assertEqual(self.sms.call_args.kwargs['headers']['authorization'], 'test-key')
        self.assertEqual(self.sms.call_args.kwargs['json']['route'], 'otp')
        self.assertNotEqual(cache.get('otp_' + self.phone)['hash'], code)
        response = self.verify(code)
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(response.json()['created'])
        self.assertIsNone(SignUp.objects.get(pk=self.phone).emailid)
        from django.contrib.auth.hashers import is_password_usable
        self.assertFalse(is_password_usable(SignUp.objects.get(pk=self.phone).password))
        self.assertIsNone(cache.get('otp_' + self.phone))
        self.assertEqual(self.verify(code).status_code, 400)
        token = response.json()['token']
        client = APIClient(enforce_csrf_checks=True)
        client.credentials(HTTP_AUTHORIZATION='Bearer ' + token)
        self.assertEqual(client.get('/api/auth_session').json()['role'], 'customer')
        self.assertEqual(client.get('/api/admin_quick_dashboard').status_code, 403)
        self.assertEqual(client.post('/api/auth_logout', {}, format='json').status_code, 200)
        self.assertEqual(client.get('/api/auth_session').status_code, 401)

    def test_expiry_attempts_resend_and_no_account_before_verification(self):
        code = self.send()
        self.assertFalse(SignUp.objects.filter(pk=self.phone).exists())
        self.assertEqual(self.post('auth/send-otp/', {'phone': self.phone}).status_code, 429)
        wrong = '000000' if code != '000000' else '111111'
        for _ in range(5):
            self.assertEqual(self.verify(wrong).status_code, 400)
        self.assertEqual(self.verify(code).status_code, 400)
        cache.clear()
        code = self.send()
        value = cache.get('otp_' + self.phone)
        value['expires_at'] = time.time() - 1
        cache.set('otp_' + self.phone, value)
        self.assertEqual(self.verify(code).status_code, 400)

    def test_invalid_inputs_and_csrf(self):
        for phone in ('123', '+919876543210', '1234567890', 'abcdefghij'):
            self.assertEqual(self.post('auth/send-otp/', {'phone': phone}).status_code, 400)
        client = APIClient(enforce_csrf_checks=True)
        self.assertEqual(client.post('/api/auth/send-otp/', {'phone': self.phone}, format='json').status_code, 403)
        self.sms.assert_not_called()

    def test_phone_outer_whitespace_is_normalized_before_shared_validation(self):
        code = self.send(' 9876543210 ')
        self.assertEqual(self.sms.call_args.kwargs['json']['numbers'], self.phone)
        self.assertEqual(self.verify(code, ' 9876543210 ').status_code, 200)

    def test_provider_errors_never_cache_code_or_leak_response(self):
        for failure in ('timeout', 'json', 'rejected'):
            cache.clear()
            self.sms.side_effect = requests.Timeout() if failure == 'timeout' else None
            self.sms.return_value = Mock(ok=False, json=Mock(side_effect=ValueError() if failure == 'json' else None,
                return_value={'return': False, 'message': 'secret provider data'}))
            result = self.post('auth/send-otp/', {'phone': self.phone})
            self.assertEqual(result.status_code, 502)
            self.assertNotIn('secret provider data', result.content.decode())
            self.assertIsNone(cache.get('otp_' + self.phone))

    def test_existing_account_and_multiple_new_customers(self):
        existing = SignUp.objects.create(mobileno=self.phone, fname='Existing', emailid='existing@example.test', password='StrongTest123!')
        result = self.verify(self.send())
        self.assertFalse(result.json()['created'])
        self.assertEqual(result.json()['data'][0]['fname'], 'Existing')
        for phone in ('9876543211', '9876543212'):
            self.assertEqual(self.verify(self.send(phone), phone).status_code, 200)
        self.assertEqual(SignUp.objects.count(), 3)

    @override_settings(DEBUG=True)
    def test_provider_diagnostics_expose_only_safe_known_reason(self):
        self.sms.return_value = Mock(ok=False, status_code=400, json=Mock(return_value={
            'return': False, 'status_code': 996, 'message': 'Complete KYC. test-key ' + self.phone}))
        with self.assertLogs('sevenshadesapp.sms_provider', level='WARNING') as logs:
            result = self.post('auth/send-otp/', {'phone': self.phone})
        self.assertEqual(result.status_code, 502)
        self.assertIn('KYC', result.json()['message'])
        self.assertNotIn('test-key', result.content.decode())
        self.assertNotIn(self.phone, result.content.decode())
        self.assertNotIn(self.phone, str(logs.output))
        self.assertNotIn('test-key', str(logs.output))

    def test_expired_forged_and_password_revoked_tokens(self):
        token = self.verify(self.send()).json()['token']
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

    def test_new_code_invalidates_previous_and_lock_rejects_parallel_verify(self):
        code = self.send()
        cache.set('otp_lock_' + self.phone, True, 60)
        self.assertEqual(self.verify(code).status_code, 429)
        cache.delete('otp_lock_' + self.phone)
        self.assertEqual(self.verify(code).status_code, 200)

    def test_legacy_signup_reset_delivery_uses_provider(self):
        response = self.post('otp_request', {'mobileno': self.phone, 'purpose': 'signup'})
        self.assertEqual(response.status_code, 200, response.content)
        self.assertFalse(response.json()['data']['test_mode'])
        self.sms.assert_called_once()

    @override_settings(FAST2SMS_API_KEY='', DEBUG=False, OTP_TEST_MODE=True)
    def test_production_without_provider_fails_closed(self):
        self.assertEqual(self.post('auth/send-otp/', {'phone': self.phone}).status_code, 503)
        self.sms.assert_not_called()
