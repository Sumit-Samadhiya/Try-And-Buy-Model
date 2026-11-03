from django.shortcuts import render
from django.http.response import JsonResponse
from rest_framework.parsers import JSONParser
from rest_framework import status
from django.shortcuts import render
import logging

from sevenshadesapp.models import SignUp,UserAddress
from sevenshadesapp.serializer import SignUpSerializer,UserAddressGetSerializer,UserAddressSerializer
from rest_framework.decorators import api_view
from sevenshadesapp.security import authenticate_account, failure

logger = logging.getLogger(__name__)

@api_view(['POST'])
def SignUp_Submit(request):
    serializer = SignUpSerializer(data=request.data)
    if not serializer.is_valid():
        return JsonResponse({'status': False, 'message': 'Please check your signup details.', 'errors': serializer.errors}, status=400)
    serializer.save()
    return JsonResponse({'status': True, 'message': 'Account created. Please sign in.'}, status=201)


@api_view(['POST'])
def CheckCostumerLogin(request):
    mobile, password = request.data.get('mobileno'), request.data.get('password')
    if not mobile or not password or not isinstance(password, str):
        return failure('Mobile and password are required.', 400)
    account, error = authenticate_account(request, 'customer', mobile, password)
    if error is not None:
        return error
    return JsonResponse({'status': True, 'data': [SignUpSerializer(account).data]})


@api_view(['POST'])
def FetchUserAddress(request):
    try:
        mobile = request.account.mobileno
        userAddress = UserAddress.objects.filter(mobileno=mobile)
        user_AddressSerializer = UserAddressGetSerializer(userAddress, many=True)
        return JsonResponse({"data": user_AddressSerializer.data,
                             "status": len(user_AddressSerializer.data) > 0}, safe=False)
    except Exception:
        logger.exception('FetchUserAddress failed')
        return JsonResponse({"message": 'Fail', "status": False}, safe=False)


@api_view(['POST'])
def Address_Submit(request):
    try:
        payload = request.data.copy()
        payload['mobileno'] = request.account.mobileno
        for field in ('address', 'city', 'postcode', 'country'):
            if field in payload and isinstance(payload[field], str):
                payload[field] = payload[field].strip()
        if not payload.get('country'):
            payload['country'] = 'India'
        address_serializer = UserAddressSerializer(data=payload)
        if address_serializer.is_valid():
            address_serializer.save()
            return JsonResponse({"message": 'Data Submitted Successfully', "status": True}, safe=False)
        return JsonResponse({"message": 'Fail to submit ', "status": False,
                             "errors": address_serializer.errors}, safe=False)
    except Exception:
        logger.exception('Address_Submit failed')
        return JsonResponse({"message": 'Fail to submit ', "status": False}, safe=False)


@api_view(['POST'])
def Address_Update(request):
    try:
        mobile = request.account.mobileno
        address_id = request.data.get('id') or request.data.get('address_id')
        address_obj = None
        if address_id:
            address_obj = UserAddress.objects.filter(pk=address_id, mobileno=mobile).first()
        
        if not address_obj:
            old_address = request.data.get('old_address')
            old_city = request.data.get('old_city')
            old_postcode = request.data.get('old_postcode')
            old_country = request.data.get('old_country')
            address_obj = UserAddress.objects.filter(
                mobileno=mobile,
                address=old_address,
                city=old_city,
                postcode=old_postcode,
                country=old_country,
            ).first()

        if not address_obj:
            return JsonResponse({"message": 'Address not found', "status": False}, safe=False)

        new_address = request.data.get('address')
        new_city = request.data.get('city')
        new_postcode = request.data.get('postcode')
        new_country = request.data.get('country')
        if isinstance(new_address, str): new_address = new_address.strip()
        if isinstance(new_city, str): new_city = new_city.strip()
        if isinstance(new_postcode, str): new_postcode = new_postcode.strip()
        if isinstance(new_country, str): new_country = new_country.strip() or 'India'

        if any((val is not None and val != getattr(address_obj, field)) for field, val in [
            ('address', new_address), ('city', new_city), ('postcode', new_postcode), ('country', new_country)
        ]):
            address_obj.latitude = address_obj.longitude = None
        if new_address is not None: address_obj.address = new_address
        if new_city is not None: address_obj.city = new_city
        if new_postcode is not None: address_obj.postcode = new_postcode
        if new_country is not None: address_obj.country = new_country
        address_obj.address_type = request.data.get('address_type', address_obj.address_type)
        address_obj.save()

        return JsonResponse({"message": 'Address updated successfully', "status": True}, safe=False)
    except Exception:
        logger.exception('Address_Update failed')
        return JsonResponse({"message": 'Fail to update address', "status": False}, safe=False)


@api_view(['POST'])
def Address_Delete(request):
    try:
        mobile = request.account.mobileno
        address_id = request.data.get('id') or request.data.get('address_id')
        address_obj = None
        if address_id:
            address_obj = UserAddress.objects.filter(pk=address_id, mobileno=mobile).first()

        if not address_obj:
            old_address = request.data.get('old_address')
            old_city = request.data.get('old_city')
            old_postcode = request.data.get('old_postcode')
            old_country = request.data.get('old_country')
            address_obj = UserAddress.objects.filter(
                mobileno=mobile,
                address=old_address,
                city=old_city,
                postcode=old_postcode,
                country=old_country,
            ).first()

        if not address_obj:
            return JsonResponse({"message": 'Address not found', "status": False}, safe=False)

        address_obj.delete()
        return JsonResponse({"message": 'Address deleted successfully', "status": True}, safe=False)
    except Exception:
        logger.exception('Address_Delete failed')
        return JsonResponse({"message": 'Fail to delete address', "status": False}, safe=False)