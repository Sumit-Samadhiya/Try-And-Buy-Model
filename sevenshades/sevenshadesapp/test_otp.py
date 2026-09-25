from datetime import timedelta
from django.test import TestCase, override_settings
from django.utils import timezone
from django.contrib.auth.hashers import check_password
from rest_framework.test import APIClient
from .models import SignUp, OtpChallenge

PASSWORD = 'Example-Strong-472!'

@override_settings(DEBUG=True, OTP_TEST_MODE=True, FAST2SMS_API_KEY='')
class OtpTests(TestCase):
    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)
        self.mobile = '9000000091'
        self.user = SignUp.objects.create(mobileno=self.mobile, emailid='otp@example.test', fname='Test', lname='User', password=PASSWORD)

    def post(self, endpoint, data, client=None):
        client = client or self.client
        token = client.get('/api/auth_csrf').json()['csrfToken']
        return client.post('/api/'+endpoint, data, format='json', HTTP_X_CSRFTOKEN=token)

    def request(self, purpose='login', mobile=None):
        mobile = mobile or self.mobile
        result = self.post('otp_request', {'mobileno':mobile, 'purpose':purpose})
        self.assertEqual(result.status_code, 200, result.content)
        return {'mobileno':mobile, 'challenge_id':result.json()['data']['challenge_id'], 'otp':'123456'}

    def test_login_needs_request_and_code_and_consumes_once(self):
        data = self.request()
        self.assertNotIn('123456', OtpChallenge.objects.get().code_hash)
        self.assertEqual(self.post('otp_login', dict(data, otp='000000')).status_code, 400)
        self.assertEqual(self.post('otp_login', data).status_code, 200)
        self.assertEqual(self.client.get('/api/auth_session').json()['role'], 'customer')
        self.assertEqual(self.post('otp_login', data).status_code, 400)
        self.assertTrue(OtpChallenge.objects.get().consumed)

    def test_binding_to_session_mobile_and_purpose(self):
        data = self.request()
        other = APIClient(enforce_csrf_checks=True)
        self.assertEqual(self.post('otp_login', data, other).status_code, 400)
        self.assertEqual(self.post('otp_login', dict(data, mobileno='9000000092')).status_code, 400)
        self.assertEqual(self.post('reset_password', dict(data, password=PASSWORD, confirm_password=PASSWORD)).status_code, 400)
        self.assertEqual(self.post('otp_login', data).status_code, 200)

    def test_expiry_and_attempt_limit(self):
        data = self.request()
        for _ in range(5): self.assertEqual(self.post('otp_login', dict(data, otp='111111')).status_code, 400)
        self.assertEqual(self.post('otp_login', data).status_code, 400)
        OtpChallenge.objects.update(attempts=0, consumed=False, expires_at=timezone.now()-timedelta(seconds=1))
        self.assertEqual(self.post('otp_login', data).status_code, 400)

    def test_resend_cooldown_and_old_code_revocation(self):
        data = self.request()
        self.assertEqual(self.post('otp_request', {'mobileno':self.mobile, 'purpose':'login'}).status_code, 429)
        OtpChallenge.objects.update(created_at=timezone.now()-timedelta(seconds=61))
        fresh = self.request()
        self.assertEqual(self.post('otp_login', data).status_code, 400)
        self.assertEqual(self.post('otp_login', fresh).status_code, 200)

    def test_signup_requires_verification_and_rejects_duplicate_email(self):
        data = {'mobileno':'9000000092','fname':'New','lname':'User','emailid':'new@example.test','password':PASSWORD,'confirm_password':PASSWORD}
        self.assertEqual(self.post('signup_submit', data).status_code, 400)
        data.update(self.request('signup', data['mobileno']))
        self.assertEqual(self.post('signup_submit', data).status_code, 201)
        self.assertTrue(check_password(PASSWORD,SignUp.objects.get(pk=data['mobileno']).password))
        self.assertEqual(self.client.get('/api/auth_session').status_code, 401)
        duplicate = dict(data, mobileno='9000000093', emailid='NEW@example.test')
        self.assertEqual(self.post('signup_submit', duplicate).status_code, 400)

    def test_reset_revokes_previous_sessions_and_old_password(self):
        old = APIClient(enforce_csrf_checks=True)
        self.assertEqual(self.post('check_costumer_login', {'mobileno':self.mobile,'password':PASSWORD}, old).status_code, 200)
        data = self.request('reset')
        self.assertEqual(self.post('reset_password', dict(data,password='123',confirm_password='123')).status_code,400)
        data.update(password='Changed-Password-872!', confirm_password='Changed-Password-872!')
        self.assertEqual(self.post('reset_password', data).status_code,200)
        self.assertEqual(old.get('/api/auth_session').status_code,401)
        self.assertEqual(self.post('check_costumer_login', {'mobileno':self.mobile,'password':PASSWORD}).status_code,401)
        self.assertEqual(self.post('check_costumer_login', {'mobileno':self.mobile,'password':data['password']}).status_code,200)

    def test_missing_csrf_and_invalid_mobile_rejected(self):
        self.assertEqual(self.client.post('/api/otp_request', {'mobileno':self.mobile,'purpose':'login'},format='json').status_code,403)
        for mobile in ('123','1234567890', ['9000000091']):
            self.assertEqual(self.post('otp_request', {'mobileno':mobile,'purpose':'login'}).status_code,400)

    @override_settings(DEBUG=False, OTP_TEST_MODE=True)
    def test_fixed_otp_cannot_be_enabled_in_production(self):
        self.assertFalse(self.client.get('/api/otp_config').json()['data']['available'])
        self.assertEqual(self.post('otp_request', {'mobileno':self.mobile,'purpose':'login'}).status_code,503)
