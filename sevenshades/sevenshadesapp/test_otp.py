"""Legacy OTP entry points stay disabled after Firebase migration."""
from unittest.mock import patch
from django.test import TestCase, override_settings
from django.core.cache import cache
from rest_framework.test import APIClient
from .models import SignUp, OtpChallenge

class RetiredOtpTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient(enforce_csrf_checks=True)

    @override_settings(DEBUG=False, OTP_TEST_MODE=True)
    @patch('sevenshadesapp.sms_provider.requests.post')
    def test_retired_routes_cannot_send_sms_or_create_accounts(self, send):
        cases = {
            'auth/send-otp/': {'phone': '9000000091'},
            'auth/verify-otp/': {'phone': '9000000091', 'otp': '123456'},
            'otp_request': {'mobileno': '9000000091', 'purpose': 'login'},
        }
        for endpoint, body in cases.items():
            with self.subTest(endpoint=endpoint):
                token = self.client.get('/api/auth_csrf').json()['csrfToken']
                result = self.client.post('/api/' + endpoint, body, format='json', HTTP_X_CSRFTOKEN=token)
                self.assertEqual(result.status_code, 410)
        self.assertEqual(self.client.get('/api/otp_config').status_code, 410)
        send.assert_not_called()
        self.assertFalse(SignUp.objects.exists())
        self.assertFalse(OtpChallenge.objects.exists())

    def test_retired_route_still_requires_csrf(self):
        result = self.client.post('/api/auth/send-otp/', {'phone': '9000000091'}, format='json')
        self.assertEqual(result.status_code, 403)
