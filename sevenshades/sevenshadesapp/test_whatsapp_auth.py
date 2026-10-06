from datetime import timedelta
from unittest.mock import patch
from django.contrib.auth.hashers import make_password
from django.test import TestCase, Client
from django.utils import timezone
from .models import WhatsAppOtp, SignUp


class WhatsAppAuthTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.phone = "9876543210"

    @patch('sevenshadesapp.whatsapp_auth_views._call_baileys_service')
    def test_send_whatsapp_otp_success_and_rate_limit_60s(self, mock_baileys):
        mock_baileys.return_value = (200, {'success': True, 'messageId': 'MSG123'})

        # 1. First send request
        res = self.client.post('/api/auth/send-whatsapp-otp', {'phone': self.phone}, content_type='application/json')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json().get('success'))
        self.assertEqual(res.json().get('cooldown'), 60)

        # Check DB
        otp_rec = WhatsAppOtp.objects.filter(phone=self.phone, is_consumed=False).first()
        self.assertIsNotNone(otp_rec)

        # 2. Immediate second request (within 60s) -> should be rate limited
        res2 = self.client.post('/api/auth/send-whatsapp-otp', {'phone': self.phone}, content_type='application/json')
        self.assertEqual(res2.status_code, 429)
        self.assertIn('60 seconds', res2.json().get('message', ''))

    @patch('sevenshadesapp.whatsapp_auth_views._call_baileys_service')
    def test_rate_limit_max_3_attempts_in_15_minutes(self, mock_baileys):
        mock_baileys.return_value = (200, {'success': True, 'messageId': 'MSG123'})
        now = timezone.now()

        # Simulate 3 previous attempts in last 10 minutes (older than 60s each)
        for i in range(3):
            rec = WhatsAppOtp.objects.create(
                phone=self.phone,
                otp_hash="fakehash",
                expires_at=now + timedelta(minutes=5),
                is_consumed=True
            )
            WhatsAppOtp.objects.filter(pk=rec.pk).update(created_at=now - timedelta(minutes=5 + i))

        # 4th attempt within 15 minutes should be blocked
        res = self.client.post('/api/auth/send-whatsapp-otp', {'phone': self.phone}, content_type='application/json')
        self.assertEqual(res.status_code, 429)
        self.assertIn('Maximum 3 attempts', res.json().get('message', ''))

    @patch('sevenshadesapp.whatsapp_auth_views._call_baileys_service')
    def test_send_whatsapp_otp_baileys_service_unavailable(self, mock_baileys):
        mock_baileys.return_value = (503, {'success': False, 'message': 'WhatsApp service is temporarily unavailable.'})

        res = self.client.post('/api/auth/send-whatsapp-otp', {'phone': self.phone}, content_type='application/json')
        self.assertEqual(res.status_code, 503)
        self.assertIn('temporarily unavailable', res.json().get('message', ''))

        # Verify no active unconsumed OTP was left in DB
        self.assertFalse(WhatsAppOtp.objects.filter(phone=self.phone, is_consumed=False).exists())

    def test_verify_whatsapp_otp_success_new_user(self):
        now = timezone.now()
        WhatsAppOtp.objects.create(
            phone=self.phone,
            otp_hash=make_password("654321"),
            created_at=now,
            expires_at=now + timedelta(minutes=5),
            is_consumed=False
        )

        res = self.client.post('/api/auth/verify-whatsapp-otp', {'phone': self.phone, 'otp': '654321'}, content_type='application/json')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get('success'))
        self.assertTrue(data.get('created'))  # User was newly created
        self.assertTrue(data.get('token'))

        # Check user in DB
        account = SignUp.objects.filter(mobileno=self.phone).first()
        self.assertIsNotNone(account)
        self.assertEqual(account.mobileno, self.phone)

        # Check OTP is marked consumed
        otp_rec = WhatsAppOtp.objects.get(phone=self.phone)
        self.assertTrue(otp_rec.is_consumed)

    def test_verify_whatsapp_otp_incorrect_code(self):
        now = timezone.now()
        WhatsAppOtp.objects.create(
            phone=self.phone,
            otp_hash=make_password("112233"),
            created_at=now,
            expires_at=now + timedelta(minutes=5),
            is_consumed=False
        )

        res = self.client.post('/api/auth/verify-whatsapp-otp', {'phone': self.phone, 'otp': '999999'}, content_type='application/json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('Incorrect', res.json().get('message', ''))

        # Attempts incremented
        otp_rec = WhatsAppOtp.objects.get(phone=self.phone)
        self.assertEqual(otp_rec.attempts, 1)

    def test_verify_whatsapp_otp_expired(self):
        now = timezone.now()
        WhatsAppOtp.objects.create(
            phone=self.phone,
            otp_hash=make_password("123456"),
            created_at=now - timedelta(minutes=10),
            expires_at=now - timedelta(minutes=5),  # expired
            is_consumed=False
        )

        res = self.client.post('/api/auth/verify-whatsapp-otp', {'phone': self.phone, 'otp': '123456'}, content_type='application/json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('expired', res.json().get('message', '').lower())
