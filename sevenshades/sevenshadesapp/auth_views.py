from django.http import JsonResponse
from django.middleware.csrf import get_token
from rest_framework.decorators import api_view
from .security import session_actor, failure
from .serializer import SignUpSafeSerializer, AdminLoginSerializer, DeliveryRiderSerializer


@api_view(['GET'])
def CsrfToken(request):
    return JsonResponse({'status': True, 'csrfToken': get_token(request)})


@api_view(['GET'])
def CurrentSession(request):
    role, account = session_actor(request.session)
    if not account:
        return failure('Please sign in.', 401)
    serializer = {'customer': SignUpSafeSerializer, 'admin': AdminLoginSerializer, 'rider': DeliveryRiderSerializer}[role]
    return JsonResponse({'status': True, 'role': role, 'data': serializer(account).data})


@api_view(['POST'])
def Logout(request):
    request.session.flush()
    return JsonResponse({'status': True, 'message': 'Signed out.'})
