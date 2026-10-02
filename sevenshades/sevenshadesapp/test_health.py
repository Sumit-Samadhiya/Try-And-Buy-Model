from unittest.mock import patch
from django.db import OperationalError
from django.test import TestCase


class HealthTests(TestCase):
    def test_liveness_does_not_need_database(self):
        with patch('sevenshadesapp.health.connection.cursor', side_effect=OperationalError('private database address')):
            response = self.client.get('/health/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'status': 'ok'})
        self.assertEqual(response['Cache-Control'], 'no-store')

    def test_readiness_uses_read_only_query(self):
        with self.assertNumQueries(1):
            response = self.client.get('/ready/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'status': 'ok'})
        self.assertEqual(response['Cache-Control'], 'no-store')

    def test_database_failure_is_unavailable_without_details(self):
        with patch('sevenshadesapp.health.connection.cursor', side_effect=OperationalError('private database address')):
            response = self.client.get('/ready/')
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json(), {'status': 'unavailable'})
        self.assertEqual(response['Cache-Control'], 'no-store')

    def test_health_endpoints_are_safe_methods_only(self):
        for path in ('/health/', '/ready/'):
            self.assertEqual(self.client.post(path).status_code, 405)
            self.assertEqual(self.client.head(path).status_code, 200)
