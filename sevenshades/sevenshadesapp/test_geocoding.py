import json
from unittest.mock import patch, MagicMock
from urllib.error import HTTPError
from django.core.cache import cache
from django.test import SimpleTestCase, override_settings
from rest_framework.test import APIRequestFactory
from .geocoding_views import lookup, Geocoding


@override_settings(GEOAPIFY_API_KEY='test-key', CACHES={'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}})
class GeocodingTests(SimpleTestCase):
    def setUp(self):
        cache.clear()

    @override_settings(GEOAPIFY_API_KEY='')
    @patch('sevenshadesapp.geocoding_views.urllib.request.urlopen')
    def test_no_key_does_not_call_provider(self, fetch):
        self.assertFalse(lookup('autocomplete', {'text': 'Jhansi'})['available'])
        fetch.assert_not_called()

    @patch('sevenshadesapp.geocoding_views.urllib.request.urlopen')
    def test_expiry_and_quota_open_circuit(self, fetch):
        for code in (401, 402, 403, 429, 503):
            with self.subTest(code=code):
                cache.clear()
                fetch.reset_mock()
                fetch.side_effect = HTTPError('provider', code, 'unavailable', {}, None)
                self.assertFalse(lookup('autocomplete', {'text': 'Jhansi'})['status'])
                self.assertFalse(lookup('autocomplete', {'text': 'Sadar'})['status'])
                self.assertEqual(fetch.call_count, 1)

    @patch('sevenshadesapp.geocoding_views.urllib.request.urlopen', side_effect=TimeoutError)
    def test_timeout_is_recoverable(self, fetch):
        result = lookup('reverse', {'lat': 25.4, 'lon': 78.5})
        self.assertFalse(result['available'])
        self.assertIn('manually', result['message'])

    @patch('sevenshadesapp.geocoding_views.urllib.request.urlopen')
    def test_success_cached_and_key_not_returned(self, fetch):
        response = MagicMock()
        response.read.return_value = json.dumps({'results': [{'lat': 25.4, 'lon': 78.5, 'city': 'Jhansi'}]}).encode()
        fetch.return_value.__enter__.return_value = response
        first = lookup('autocomplete', {'text': 'Jhansi'})
        self.assertEqual(first, lookup('autocomplete', {'text': 'Jhansi'}))
        self.assertEqual(fetch.call_count, 1)
        self.assertEqual(first['results'][0]['city'], 'Jhansi')
        self.assertNotIn('test-key', json.dumps(first))

    @patch('sevenshadesapp.geocoding_views.lookup')
    def test_invalid_coordinates_never_leave_server(self, provider):
        request = APIRequestFactory().post('/api/geocoding', {'mode': 'reverse', 'latitude': 100, 'longitude': 78}, format='json')
        self.assertEqual(Geocoding(request).status_code, 400)
        provider.assert_not_called()
