from django.shortcuts import render
from django.http.response import JsonResponse
from rest_framework.parsers import JSONParser
from rest_framework import status
from django.shortcuts import render

from sevenshadesapp.models import SignUp,UserAddress
from sevenshadesapp.serializer import SignUpSerializer,UserAddressGetSerializer,UserAddressSerializer
from rest_framework.decorators import api_view

@api_view(['GET','POST','DELETE'])
def SignUp_Submit(request):
    try:
        if request.method=='POST':
            signup_serializer=SignUpSerializer(data=request.data)
        if(signup_serializer.is_valid()):
                signup_serializer.save()
                return JsonResponse({"message":'SignUp Successfully',"status":True},safe=False)
        else:
             return JsonResponse({"message":'Fail to SignUp ',"status":False},safe=False)
    except Exception as e:
        print("Error submit:",e)
        return JsonResponse({"message":'Fail to SignUp ',"status":False},safe=False)
    
@api_view(['GET','POST','DELETE'])
def CheckCostumerLogin(request):
    try:
        if request.method=='POST':
            mobile=request.data['mobileno']
            pwd = request.data['password']
           
            costumerLogin=SignUp.objects.all().filter(mobileno=mobile,password=pwd)
            costumer_serializer=SignUpSerializer(costumerLogin,many=True)
            if(len(costumer_serializer.data)==1):
                
                return JsonResponse({"data":costumer_serializer.data,"message":'Success',"status":True},safe=False)
        else:
             return JsonResponse({"data":[],"message":'Fail ',"status":False},safe=False)
    except Exception as e:
        print("Error submit:",e)
        return JsonResponse({"message":'Fail',"status":False},safe=False)
    

@api_view(['GET','POST','DELETE'])
def FetchUserAddress(request):
    try:
        if request.method=='POST':
            mobile=request.data['mobile']
            
           
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
            address_serializer=UserAddressSerializer(data=request.data)
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
        mobile = request.data.get('mobile')
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

        address_obj.address = request.data.get('address', address_obj.address)
        address_obj.city = request.data.get('city', address_obj.city)
        address_obj.postcode = request.data.get('postcode', address_obj.postcode)
        address_obj.country = request.data.get('country', address_obj.country)
        address_obj.save()

        return JsonResponse({"message": 'Address updated successfully', "status": True}, safe=False)
    except Exception as e:
        print("Address update error:", e)
        return JsonResponse({"message": 'Fail to update address', "status": False}, safe=False)


@api_view(['POST'])
def Address_Delete(request):
    try:
        mobile = request.data.get('mobile')
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