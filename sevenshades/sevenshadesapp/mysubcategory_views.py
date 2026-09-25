import logging
from django.shortcuts import render
from django.http.response import JsonResponse
from rest_framework.parsers import JSONParser
from rest_framework import status

from sevenshadesapp.models import MySubCategory
from sevenshadesapp.serializer import MySubCategorySerializer
from sevenshadesapp.serializer import MySubCategoryGetSerializer
from rest_framework.decorators import api_view

logger = logging.getLogger(__name__)


@api_view(['GET','POST','DELETE'])
def MySubCategory_Submit(request):
    try:
        if request.method=='POST':
            mysubcategory_serializer=MySubCategorySerializer(data=request.data)
        if(mysubcategory_serializer.is_valid()):
                mysubcategory_serializer.save()
                return JsonResponse({"message":'SubCategory Submitted Successfully',"status":True},safe=False)
        else:
             return JsonResponse({"message":'Fail to submit ',"status":False},safe=False)
    except Exception as e:
        logger.exception("Error in MySubCategory_Submit: %s", e)
        return JsonResponse({"message":'Fail to submit ',"status":False},safe=False)
    



@api_view(['GET','POST','DELETE'])
def MySubCategory_List(request):
     try:
          if request.method=='GET':
               mysubcategory_list=MySubCategory.objects.all()
               mysubcategory_serializer_list=MySubCategoryGetSerializer(mysubcategory_list,many=True)
               return JsonResponse({"data":mysubcategory_serializer_list.data, "status":True})
          else:
               return JsonResponse({"data":[],"status":False},safe=False)
     except Exception as e:
          logger.exception('Error in MySubCategory_List: %s', e)
          return JsonResponse({"data":[],"status":False},safe=False)



@api_view(['GET','POST','DELETE'])
def EditMySubCategory_Icon(request):
    try:
        if request.method=='POST':
                from .upload_security import sanitize_filename
                mysubcategory_data=MySubCategory.objects.get(pk=request.data['id'])
                icon_file = request.FILES.get('icon') or request.data.get('icon')
                if hasattr(icon_file, 'name'):
                    icon_file.name = sanitize_filename(icon_file.name, fallback_ext='.png')
                mysubcategory_data.icon=icon_file
                mysubcategory_data.save()
                return JsonResponse({"message":'SubCategory Icon Updated',"status":True},safe=False)
        else:
             return JsonResponse({"message":'Fail to update Icon ',"status":False},safe=False)
    except Exception as e:
        logger.exception("Error in EditMySubCategory_Icon: %s", e)
        return JsonResponse({"message":'Fail to submit ',"status":False},safe=False)



@api_view(['GET','POST','DELETE'])
def EditMySubCategory_Data(request):
    try:
        if request.method == 'POST':
            mysubcategory_data = MySubCategory.objects.get(pk=request.data['id'])
            new_maincategory_id = int(request.data['maincategoryid'])
            if mysubcategory_data.maincategoryid_id != new_maincategory_id:
                from .models import Product
                if Product.objects.filter(subcategoryid=mysubcategory_data).exists():
                    return JsonResponse({
                        "message": 'Cannot change parent category while dependent products exist for this subcategory.',
                        "status": False
                    }, status=409)
            mysubcategory_data.maincategoryid_id = new_maincategory_id
            mysubcategory_data.subcategoryname = request.data['subcategoryname']
            mysubcategory_data.save()
            return JsonResponse({"message": 'SubCategory Data Updated', "status": True}, safe=False)
        else:
            return JsonResponse({"message": 'Fail to update Data', "status": False}, safe=False)
    except MySubCategory.DoesNotExist:
        return JsonResponse({"message": 'Subcategory not found', "status": False}, status=404)
    except Exception as e:
        logger.exception("Error in EditMySubCategory_Data: %s", e)
        return JsonResponse({"message": 'Fail to update Data', "status": False}, status=400)



@api_view(['POST'])
def DeleteMySubCategory_Data(request):
    from .catalog_integrity import delete_unused
    return delete_unused(MySubCategory, request.data.get('id'), 'Subcategory')
