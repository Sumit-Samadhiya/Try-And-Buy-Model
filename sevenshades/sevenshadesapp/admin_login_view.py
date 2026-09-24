from django.http import JsonResponse
from rest_framework.decorators import api_view
from .security import authenticate_account, failure
from .serializer import AdminLoginSerializer


@api_view(['POST'])
def CheckAdminLogin(request):
    email, password = request.data.get('emailid'), request.data.get('password')
    if not email or not password or not isinstance(password, str):
        return failure('Email and password are required.', 400)
    account, error = authenticate_account(request, 'admin', email, password)
    if error is not None:
        return error
    return JsonResponse({'status': True, 'data': [AdminLoginSerializer(account).data]})
