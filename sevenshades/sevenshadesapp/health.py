from django.http import JsonResponse
from django.views.decorators.http import require_safe


@require_safe
def health(request):
    """Process liveness only: no database, credentials or external services."""
    response = JsonResponse({"status": "ok"})
    response["Cache-Control"] = "no-store"
    return response
