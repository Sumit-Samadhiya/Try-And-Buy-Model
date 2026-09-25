import time
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from .models import SignUp, AdminLogin, DeliveryRider
from .rate_limiter import (
    get_rate_limit_config, check_sliding_window, check_ip_rate_limit,
    check_account_backoff, record_auth_failure, reset_account_backoff
)


PASSWORD = 'Secret-test-password-123!'


class RateLimiterUnitTests(TestCase):
    def setUp(self):
        cache.clear()

    def test_configurable_thresholds_override(self):
        custom = {
            'AUTH': {'IP_MAX_REQUESTS': 5, 'IP_WINDOW': 30, 'ACCOUNT_MAX_ATTEMPTS': 3},
            'PUBLIC': {'MAX_REQUESTS': 15, 'WINDOW': 30},
            'AUTHENTICATED': {'MAX_REQUESTS': 50, 'WINDOW': 30},
        }
        with override_settings(RATE_LIMITS=custom):
            config = get_rate_limit_config()
            self.assertEqual(config['AUTH']['IP_MAX_REQUESTS'], 5)
            self.assertEqual(config['AUTH']['ACCOUNT_MAX_ATTEMPTS'], 3)
            self.assertEqual(config['PUBLIC']['MAX_REQUESTS'], 15)
            self.assertEqual(config['AUTHENTICATED']['MAX_REQUESTS'], 50)

    def test_sliding_window_blocks_and_returns_retry_after(self):
        key = 'test_sliding_window'
        max_req = 3
        window = 10
        # First 3 requests should be allowed
        for _ in range(max_req):
            allowed, retry_after = check_sliding_window(key, max_req, window)
            self.assertTrue(allowed)
            self.assertEqual(retry_after, 0)
        # 4th request within window must be rejected
        allowed, retry_after = check_sliding_window(key, max_req, window)
        self.assertFalse(allowed)
        self.assertGreater(retry_after, 0)
        self.assertLessEqual(retry_after, window)

    def test_exponential_backoff_progression_and_reset(self):
        custom = {
            'AUTH': {
                'ACCOUNT_MAX_ATTEMPTS': 2,
                'ACCOUNT_WINDOW': 300,
                'BACKOFF_BASE': 2.0,
                'BACKOFF_FACTOR': 2.0,
                'BACKOFF_MAX': 60,
            }
        }
        with override_settings(RATE_LIMITS=custom):
            account_id = 'user_test_backoff'
            # Attempt 1: failure recorded, no cooldown yet
            blocked, delay = record_auth_failure(account_id)
            self.assertFalse(blocked)
            is_blocked, retry = check_account_backoff(account_id)
            self.assertFalse(is_blocked)

            # Attempt 2: threshold reached, first backoff triggered (2.0s)
            blocked, delay = record_auth_failure(account_id)
            self.assertTrue(blocked)
            self.assertEqual(delay, 2)
            is_blocked, retry = check_account_backoff(account_id)
            self.assertTrue(is_blocked)
            self.assertGreater(retry, 0)

            # Attempt 3: escalation (4.0s)
            blocked, delay = record_auth_failure(account_id)
            self.assertTrue(blocked)
            self.assertEqual(delay, 4)

            # Attempt 4: escalation (8.0s)
            blocked, delay = record_auth_failure(account_id)
            self.assertTrue(blocked)
            self.assertEqual(delay, 8)

            # Successful auth resets the backoff state
            reset_account_backoff(account_id)
            is_blocked, retry = check_account_backoff(account_id)
            self.assertFalse(is_blocked)
            self.assertEqual(retry, 0)


class EndpointRateLimitingIntegrationTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = SignUp.objects.create(mobileno='9111111111', emailid='ratelimit@example.test', password=PASSWORD)
        cls.admin = AdminLogin.objects.create(emailid='admin_rate@example.test', mobileno='9111111112', password=PASSWORD)

    def setUp(self):
        cache.clear()
        self.client = APIClient(enforce_csrf_checks=True)
        self.token = self.client.get('/api/auth_csrf').json()['csrfToken']

    def post(self, endpoint, data):
        return self.client.post('/api/' + endpoint, data, format='json', HTTP_X_CSRFTOKEN=self.token)

    def test_auth_route_exponential_backoff_and_no_hard_lockout(self):
        """Verifies configurable attempts before backoff, 429 with Retry-After, and retry allowed after cooldown."""
        custom_limits = {
            'AUTH': {
                'IP_MAX_REQUESTS': 50,
                'IP_WINDOW': 60,
                'ACCOUNT_MAX_ATTEMPTS': 3,
                'ACCOUNT_WINDOW': 300,
                'BACKOFF_BASE': 1.0,
                'BACKOFF_FACTOR': 2.0,
                'BACKOFF_MAX': 10,
            }
        }
        with override_settings(RATE_LIMITS=custom_limits):
            # Attempts 1, 2, 3 return 401 Invalid credentials
            for _ in range(3):
                res = self.post('check_costumer_login', {'mobileno': self.user.pk, 'password': 'wrong_password'})
                self.assertEqual(res.status_code, 401)

            # 4th immediate attempt returns 429 Too Many Requests with Retry-After header
            res = self.post('check_costumer_login', {'mobileno': self.user.pk, 'password': 'wrong_password'})
            self.assertEqual(res.status_code, 429)
            self.assertIn('Retry-After', res.headers)
            self.assertIn('retry_after', res.json())

            # No hard lockout: once cooldown expires, legitimate login succeeds immediately
            time.sleep(1.1)
            success_res = self.post('check_costumer_login', {'mobileno': self.user.pk, 'password': PASSWORD})
            self.assertEqual(success_res.status_code, 200)
            self.assertTrue(success_res.json()['status'])

    def test_auth_route_ip_rate_limiting(self):
        """Verifies stricter per-IP limits on authentication routes."""
        custom_limits = {
            'AUTH': {
                'IP_MAX_REQUESTS': 3,
                'IP_WINDOW': 60,
                'ACCOUNT_MAX_ATTEMPTS': 10,
            }
        }
        with override_settings(RATE_LIMITS=custom_limits):
            for i in range(3):
                res = self.post('check_costumer_login', {'mobileno': f'922222222{i}', 'password': 'dummy'})
                self.assertEqual(res.status_code, 401)
            # 4th request from same IP is rate limited
            res = self.post('check_costumer_login', {'mobileno': '9222222299', 'password': 'dummy'})
            self.assertEqual(res.status_code, 429)
            self.assertIn('Retry-After', res.headers)

    def test_public_endpoint_moderate_rate_limiting(self):
        """Verifies moderate limits on public endpoints."""
        custom_limits = {
            'PUBLIC': {
                'MAX_REQUESTS': 3,
                'WINDOW': 60,
            }
        }
        cache.clear()
        with override_settings(RATE_LIMITS=custom_limits):
            # 3 public requests allowed
            for _ in range(3):
                res = self.client.get('/api/user_maincategory_list')
                self.assertEqual(res.status_code, 200)
            # 4th request exceeds public limit
            res = self.client.get('/api/user_maincategory_list')
            self.assertEqual(res.status_code, 429)
            self.assertIn('Retry-After', res.headers)

    def test_authenticated_user_action_looser_rate_limiting(self):
        """Verifies looser limits for authenticated user operations."""
        custom_limits = {
            'AUTHENTICATED': {
                'MAX_REQUESTS': 3,
                'WINDOW': 60,
            }
        }
        with override_settings(RATE_LIMITS=custom_limits):
            login_res = self.post('check_costumer_login', {'mobileno': self.user.pk, 'password': PASSWORD})
            self.assertEqual(login_res.status_code, 200)

            # Update token after session establishment (rotate_token on login)
            self.token = self.client.cookies['csrftoken'].value

            # Authenticated user requests within limit
            for _ in range(3):
                res = self.post('fetch_user_address', {'mobile': self.user.pk})
                self.assertEqual(res.status_code, 200)

            # Exceeding authenticated user limit returns 429
            res = self.post('fetch_user_address', {'mobile': self.user.pk})
            self.assertEqual(res.status_code, 429)
            self.assertIn('Retry-After', res.headers)
