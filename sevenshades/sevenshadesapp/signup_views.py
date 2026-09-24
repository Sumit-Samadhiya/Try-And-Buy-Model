from django.shortcuts import render
from django.http.response import JsonResponse
from rest_framework.parsers import JSONParser
from rest_framework import status
from django.shortcuts import render

from sevenshadesapp.models import SignUp,UserAddress
from sevenshadesapp.serializer import SignUpSerializer,UserAddressGetSerializer,UserAddressSerializer
from rest_framework.decorators import api_view
from .security import authenticate_account, failure

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


@api_view(['GET','POST','DELETE'])
def FetchUserAddress(request):
    try:
        if request.method=='POST':
            mobile=request.account.mobileno
            
           
            userAddress=UserAddress.objects.all().filter(mobileno=mobile)
            user_AddressSerializer=UserAddressGetSerializer(userAddress,many=True)
            
            if(len(user_AddressSerializer.data)>0):    
             return JsonResponse({"data":user_AddressSerializer.data,"status":True},safe=False)
            else:
             return JsonResponse({"data":user_AddressSerializer.data,"status":False},safe=True)   
        else:
             return JsonResponse({"data":[],"message":'Fail ',"status":False},safe=False)
    except Exception as e:
        print("Error submit:",e)
        return JsonResponse({"message":'Fail',"status":False},safe=False)
    

@api_view(['GET','POST','DELETE'])
def Address_Submit(request):
    try:
        
        if request.method=='POST':
            payload = request.data.copy()
            payload['mobileno'] = request.account.mobileno
            address_serializer=UserAddressSerializer(data=payload)
        if(address_serializer.is_valid()):
                address_serializer.save()
                return JsonResponse({"message":'Data Submitted Successfully',"status":True},safe=False)
        else:
             return JsonResponse({"message":'Fail to submit ',"status":False},safe=False)
    except Exception as e:
        print("Error submit:",e)
        return JsonResponse({"message":'Fail to submit ',"status":False},safe=False)


@api_view(['POST'])
def Address_Update(request):
    try:
        mobile = request.account.mobileno
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

        if any(request.data.get(field, getattr(address_obj, field)) != getattr(address_obj, field) for field in ('address', 'city', 'postcode', 'country')):
            address_obj.latitude = address_obj.longitude = None
        address_obj.address = request.data.get('address', address_obj.address)
        address_obj.city = request.data.get('city', address_obj.city)
        address_obj.postcode = request.data.get('postcode', address_obj.postcode)
        address_obj.country = request.data.get('country', address_obj.country)
        address_obj.address_type = request.data.get('address_type', address_obj.address_type)
        address_obj.save()

        return JsonResponse({"message": 'Address updated successfully', "status": True}, safe=False)
    except Exception as e:
        print("Address update error:", e)
        return JsonResponse({"message": 'Fail to update address', "status": False}, safe=False)


@api_view(['POST'])
def Address_Delete(request):
    try:
        mobile = request.account.mobileno
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
    except Exception as e:
        print("Address delete error:", e)
        return JsonResponse({"message": 'Fail to delete address', "status": False}, safe=False)