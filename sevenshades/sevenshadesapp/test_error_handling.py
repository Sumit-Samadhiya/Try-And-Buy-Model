"""Tests for error handling, exception sanitization, and structured server-side logging."""
from unittest.mock import patch, MagicMock
import logging
from django.test import TestCase, RequestFactory
from django.http import HttpResponse, JsonResponse
from django.db import OperationalError, IntegrityError, DatabaseError
from sevenshadesapp.error_handling import (
    SafeExceptionMiddleware,
    drf_exception_handler,
    sanitize_error_message,
    custom_bad_request,
    custom_permission_denied,
    custom_page_not_found,
    custom_server_error,
)
from sevenshadesapp.security import failure, protect_api


class ErrorHandlingTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()

    def test_sanitize_error_message_detects_traceback(self):
        leak = "Traceback (most recent call last):\n  File 'c:\\app\\views.py', line 42, in my_view\n    raise ValueError('secret')"
        sanitized = sanitize_error_message(leak)
        self.assertEqual(sanitized, "An unexpected error occurred. Please try again.")
        self.assertNotIn("c:\\app", sanitized)
        self.assertNotIn("Traceback", sanitized)

    def test_sanitize_error_message_detects_db_errors(self):
        leak = "OperationalError: database is locked (table try_order_item)"
        sanitized = sanitize_error_message(leak)
        self.assertEqual(sanitized, "An unexpected error occurred. Please try again.")
        self.assertNotIn("OperationalError", sanitized)
        self.assertNotIn("try_order_item", sanitized)

    def test_sanitize_error_message_detects_integrity_constraints(self):
        leak = "IntegrityError: UNIQUE constraint failed: sevenshadesapp_signup.mobileno"
        sanitized = sanitize_error_message(leak)
        self.assertEqual(sanitized, "An unexpected error occurred. Please try again.")
        self.assertNotIn("UNIQUE constraint", sanitized)
        self.assertNotIn("sevenshadesapp_signup", sanitized)

    def test_sanitize_error_message_detects_internal_paths(self):
        leak = "Cannot open /var/log/sevenshades/secret.key"
        sanitized = sanitize_error_message(leak)
        self.assertEqual(sanitized, "An unexpected error occurred. Please try again.")
        self.assertNotIn("/var/log", sanitized)

    def test_sanitize_error_message_preserves_safe_validation_messages(self):
        safe_msg = "Please enter a valid 10-digit mobile number."
        sanitized = sanitize_error_message(safe_msg)
        self.assertEqual(sanitized, safe_msg)

    def test_failure_helper_sanitizes_leaks(self):
        response = failure("IntegrityError: foreign key violation on table auth_user", 409)
        self.assertEqual(response.status_code, 409)
        content = response.content.decode()
        self.assertNotIn("IntegrityError", content)
        self.assertNotIn("foreign key", content)
        self.assertNotIn("auth_user", content)
        self.assertIn("An unexpected error occurred", content)

    def test_safe_exception_middleware_handles_api_exception(self):
        def crashing_view(request):
            raise RuntimeError("Secret internal failure with path C:\\app\\secret.py")

        middleware = SafeExceptionMiddleware(crashing_view)
        request = self.factory.get('/api/test_crash')

        with self.assertLogs('sevenshadesapp.error_handling', level='ERROR') as cm:
            response = middleware.process_exception(request, RuntimeError("Secret internal failure with path C:\\app\\secret.py"))

        self.assertIsInstance(response, JsonResponse)
        self.assertEqual(response.status_code, 500)
        body = response.content.decode()
        self.assertNotIn("Secret internal failure", body)
        self.assertNotIn("C:\\app", body)
        self.assertIn("An unexpected server error occurred", body)
        # Server-side logs MUST record the full details
        self.assertTrue(any("Secret internal failure" in log for log in cm.output))

    def test_safe_exception_middleware_handles_operational_error(self):
        middleware = SafeExceptionMiddleware(lambda req: None)
        request = self.factory.post('/api/test_db', content_type='application/json')

        with self.assertLogs('sevenshadesapp.error_handling', level='ERROR') as cm:
            response = middleware.process_exception(request, OperationalError("database table locked"))

        self.assertEqual(response.status_code, 503)
        body = response.content.decode()
        self.assertNotIn("database table locked", body)
        self.assertIn("database is currently busy", body)

    def test_safe_exception_middleware_handles_html_request(self):
        middleware = SafeExceptionMiddleware(lambda req: None)
        request = self.factory.get('/web_page/')

        response = middleware.process_exception(request, ValueError("Private calculation error"))
        self.assertEqual(response.status_code, 500)
        self.assertNotIn("Private calculation error", response.content.decode())
        self.assertIn("500 Server Error", response.content.decode())

    def test_protect_api_catches_unhandled_view_exception(self):
        from django.contrib.sessions.backends.db import SessionStore
        def crashing_api(request):
            raise TypeError("unhashable type: 'dict' in C:\\projects\\views.py")

        guarded = protect_api(crashing_api, 'test_unhandled_endpoint', public_catalog=True)
        request = self.factory.get('/api/test_unhandled_endpoint')
        request.session = SessionStore()

        with self.assertLogs('sevenshadesapp.security', level='ERROR') as cm:
            response = guarded(request)

        self.assertEqual(response.status_code, 500)
        body = response.content.decode()
        self.assertNotIn("unhashable type", body)
        self.assertNotIn("C:\\projects", body)
        self.assertIn("An unexpected server error occurred", body)

    def test_custom_http_handlers(self):
        req_api = self.factory.get('/api/nonexistent')
        res_404 = custom_page_not_found(req_api)
        self.assertEqual(res_404.status_code, 404)
        self.assertIn("Endpoint not found", res_404.content.decode())

        req_bad = self.factory.post('/api/bad')
        res_400 = custom_bad_request(req_bad)
        self.assertEqual(res_400.status_code, 400)
        self.assertIn("Bad request", res_400.content.decode())

        req_denied = self.factory.get('/api/denied')
        res_403 = custom_permission_denied(req_denied)
        self.assertEqual(res_403.status_code, 403)
        self.assertIn("Permission denied", res_403.content.decode())

        req_500 = self.factory.get('/api/crash')
        res_500 = custom_server_error(req_500)
        self.assertEqual(res_500.status_code, 500)
        self.assertIn("An unexpected server error occurred", res_500.content.decode())
