"""Global error handling, exception sanitization, and structured logging.

Ensures that clients never see raw database errors, SQL syntax, stack traces,
or internal filesystem paths. All unexpected errors are logged with full
traceback server-side for debugging.
"""
import logging
import re
from django.http import JsonResponse, HttpResponseServerError, HttpResponseBadRequest, HttpResponseForbidden, HttpResponseNotFound
from django.db import DatabaseError, OperationalError, IntegrityError
from rest_framework.views import exception_handler as drf_default_exception_handler
from rest_framework.response import Response

logger = logging.getLogger('sevenshadesapp.error_handling')

DB_OR_PATH_PATTERNS = re.compile(
    r'(OperationalError|IntegrityError|DatabaseError|ProgrammingError|InternalError|'
    r'sqlite3\.|pymysql\.|syntax error|UNIQUE constraint|FOREIGN KEY|table \w+|column \w+|'
    r'Traceback \(most recent call last\)|File "[^"]+", line \d+|'
    r'[A-Za-z]:\\[^"\'\s]+|/(?:home|usr|var|tmp|etc|app)/)',
    re.IGNORECASE
)


def sanitize_error_message(message: str, fallback: str = "An unexpected error occurred. Please try again.") -> str:
    """Return a generic message if the input contains stack traces, file paths, or DB errors."""
    if not isinstance(message, str) or not message.strip():
        return fallback
    if DB_OR_PATH_PATTERNS.search(message):
        return fallback
    return message.strip()


class SafeExceptionMiddleware:
    """Middleware that intercepts unhandled exceptions, logs full tracebacks server-side,
    and returns a clean, generic error response without leaking internal details.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        return self.get_response(request)

    def process_exception(self, request, exception):
        client_ip = request.META.get('REMOTE_ADDR', 'unknown')
        user_id = getattr(getattr(request, 'account', None), 'pk', 'anonymous')

        logger.exception(
            "Unhandled server exception [Method: %s, Path: %s, IP: %s, User: %s]: %s",
            request.method,
            request.path,
            client_ip,
            user_id,
            exception,
        )

        is_api = (
            request.path.startswith('/api/')
            or request.path.startswith('/payments/')
            or 'application/json' in request.headers.get('Accept', '')
            or getattr(request, 'content_type', '') == 'application/json'
        )

        if isinstance(exception, OperationalError):
            status_code = 503
            msg = 'The database is currently busy. Please retry shortly.'
        elif isinstance(exception, (DatabaseError, IntegrityError)):
            status_code = 500
            msg = 'A database operation could not be completed. Please try again.'
        else:
            status_code = 500
            msg = 'An unexpected server error occurred. Please try again later.'

        if is_api:
            return JsonResponse({'status': False, 'message': msg, 'data': []}, status=status_code)

        return HttpResponseServerError(
            "<!DOCTYPE html><html><head><title>Server Error</title></head>"
            "<body><h1>500 Server Error</h1><p>An unexpected error occurred. Please try again later.</p></body></html>",
            content_type="text/html",
        )


def drf_exception_handler(exc, context):
    """Custom exception handler for Django REST Framework.
    Logs full exception tracebacks server-side and guarantees no raw
    database errors or internal details are exposed in API responses.
    """
    response = drf_default_exception_handler(exc, context)

    view = context.get('view')
    view_name = view.__class__.__name__ if view else 'UnknownView'
    request = context.get('request')
    path = getattr(request, 'path', 'unknown') if request else 'unknown'

    if response is None:
        logger.exception("Unhandled DRF view exception in %s [%s]: %s", view_name, path, exc)

        if isinstance(exc, OperationalError):
            return Response(
                {'status': False, 'message': 'The database is currently busy. Please retry shortly.', 'data': []},
                status=503,
            )
        elif isinstance(exc, (DatabaseError, IntegrityError)):
            return Response(
                {'status': False, 'message': 'A database operation could not be completed. Please try again.', 'data': []},
                status=500,
            )

        return Response(
            {'status': False, 'message': 'An unexpected server error occurred. Please try again later.', 'data': []},
            status=500,
        )

    # Sanitize DRF responses if message or detail fields contain raw exceptions
    if isinstance(response.data, dict):
        if 'detail' in response.data and isinstance(response.data['detail'], str):
            response.data['detail'] = sanitize_error_message(response.data['detail'])
        if 'message' in response.data and isinstance(response.data['message'], str):
            response.data['message'] = sanitize_error_message(response.data['message'])

    if response.status_code >= 500:
        logger.error("API 5xx error in %s [%s]: %s", view_name, path, response.data)

    return response


def custom_bad_request(request, exception=None):
    logger.warning("400 Bad Request: %s", request.path)
    if request.path.startswith('/api/'):
        return JsonResponse({'status': False, 'message': 'Bad request.', 'data': []}, status=400)
    return HttpResponseBadRequest("<h1>400 Bad Request</h1>", content_type="text/html")


def custom_permission_denied(request, exception=None):
    logger.warning("403 Forbidden: %s", request.path)
    if request.path.startswith('/api/'):
        return JsonResponse({'status': False, 'message': 'Permission denied.', 'data': []}, status=403)
    return HttpResponseForbidden("<h1>403 Forbidden</h1>", content_type="text/html")


def custom_page_not_found(request, exception=None):
    if request.path.startswith('/api/'):
        return JsonResponse({'status': False, 'message': 'Endpoint not found.', 'data': []}, status=404)
    return HttpResponseNotFound("<h1>404 Not Found</h1>", content_type="text/html")


def custom_server_error(request):
    logger.error("500 Server Error: %s", request.path)
    if request.path.startswith('/api/'):
        return JsonResponse({'status': False, 'message': 'An unexpected server error occurred. Please try again later.', 'data': []}, status=500)
    return HttpResponseServerError("<h1>500 Server Error</h1>", content_type="text/html")
