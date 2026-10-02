from django.http import JsonResponse
from django.views.decorators.http import require_safe
from django.db import connection, DatabaseError


@require_safe
def health(request):
    """Process liveness only: no database, credentials or external services."""
    response = JsonResponse({"status": "ok"})
    response["Cache-Control"] = "no-store"
    return response


@require_safe
def ready(request):
    """Database readiness without disclosing connection details or changing data."""
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
            cursor.fetchone()
    except DatabaseError:
        response = JsonResponse({'status': 'unavailable'}, status=503)
    else:
        response = JsonResponse({'status': 'ok'})
    response['Cache-Control'] = 'no-store'
    return response
