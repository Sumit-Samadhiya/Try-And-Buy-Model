from unittest.mock import patch
from django.test import TestCase
from rest_framework.test import APIClient
from sevenshadesapp.models import SignUp


class FirebaseAuthTests(TestCase):
    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)
        self.token = self.client.get('/api/auth_csrf').json()['csrfToken']

    def test_missing_id_token_returns_400(self):
        response = self.client.post('/api/auth/firebase-login/', {}, format='json', HTTP_X_CSRFTOKEN=self.token)
        self.assertEqual(response.status_code, 400)
        self.assertIn('id_token is required', response.json()['message'])

    @patch('sevenshadesapp.firebase_views.verify_firebase_id_token')
    def test_invalid_token_returns_401(self, mock_verify):
        mock_verify.return_value = (None, 'Token expired')
        response = self.client.post('/api/auth/firebase-login/', {'id_token': 'invalid.token.here'}, format='json', HTTP_X_CSRFTOKEN=self.token)
        self.assertEqual(response.status_code, 401)
        self.assertFalse(response.json()['status'])

    @patch('sevenshadesapp.firebase_views.verify_firebase_id_token')
    def test_valid_token_creates_and_logs_in_user(self, mock_verify):
        mock_verify.return_value = ({
            'phone_number': '+919988776655',
            'name': 'Firebase Tester',
            'email': 'tester@example.com'
        }, None)

        response = self.client.post('/api/auth/firebase-login/', {'id_token': 'valid.firebase.token'}, format='json', HTTP_X_CSRFTOKEN=self.token)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['status'])
        self.assertEqual(data['user']['mobileno'], '9988776655')
        self.assertIn('token', data)

        # Check in DB
        self.assertTrue(SignUp.objects.filter(mobileno='9988776655').exists())
