import logging
from django.shortcuts import render
from django.http.response import JsonResponse
from rest_framework.parsers import JSONParser
from rest_framework import status
from sevenshadesapp.models import MainCategory
from sevenshadesapp.serializer import MainCategorySerializer
from rest_framework.decorators import api_view

logger = logging.getLogger(__name__)


@api_view(['GET','POST','DELETE'])
def MainCategory_Submit(request):
    try:
        if request.method=='POST':
            maincategory_serializer=MainCategorySerializer(data=request.data)
        if(maincategory_serializer.is_valid()):
                maincategory_serializer.save()
                return JsonResponse({"message":'MainCategory Submitted Successfully',"status":True},safe=False)
        else:
             return JsonResponse({"message":'Fail to submit ',"status":False},safe=False)
    except Exception as e:
        logger.exception("Error in MainCategory_Submit: %s", e)
        return JsonResponse({"message":'Fail to submit ',"status":False},safe=False)

def MainCategory_List(request):
     try:
          if request.method=='GET':
               maincategory_list=MainCategory.objects.all()
               maincategory_serializer_list=MainCategorySerializer(maincategory_list,many=True)
               return JsonResponse({"data":maincategory_serializer_list.data, "status":True})
          else:
               return JsonResponse({"data":[],"status":False},safe=False)
     except Exception as e:
          logger.exception('Error in MainCategory_List: %s', e)
          return JsonResponse({"data":[],"status":False},safe=False)
               
@api_view(['GET','POST','DELETE'])
def EditCategory_Icon(request):
    try:
        if request.method=='POST':
                from .upload_security import sanitize_filename
                maincategory_data=MainCategory.objects.get(pk=request.data['id'])
                icon_file = request.FILES.get('icon') or request.data.get('icon')
                if hasattr(icon_file, 'name'):
                    icon_file.name = sanitize_filename(icon_file.name, fallback_ext='.png')
                maincategory_data.icon=icon_file
                maincategory_data.save()
                return JsonResponse({"message":'MainCategory Icon Updated',"status":True},safe=False)
        else:
             return JsonResponse({"message":'Fail to update Icon ',"status":False},safe=False)
    except Exception as e:
        logger.exception("Error in EditCategory_Icon: %s", e)
        return JsonResponse({"message":'Fail to update Icon',"status":False},safe=False)



@api_view(['GET','POST','DELETE'])
def EditCategory_Data(request):
    try:
         if request.method=='POST':
                maincategory_data=MainCategory.objects.get(pk=request.data['id'])
                maincategory_data.maincategoryname=request.data['maincategoryname']
                maincategory_data.save()
                return JsonResponse({"message":'MainCategory Data Updated',"status":True},safe=False)
         else:
             return JsonResponse({"message":'Fail to update Data ',"status":False},safe=False)
    except Exception as e:
        logger.exception("Error in EditCategory_Data: %s", e)
        return JsonResponse({"message":'Fail to update Data',"status":False},safe=False)



@api_view(['POST'])
def DeleteCategory_Data(request):
    from .catalog_integrity import delete_unused
    return delete_unused(MainCategory, request.data.get('id'), 'Category')
