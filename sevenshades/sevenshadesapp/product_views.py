from django.db import transaction
from django.db.models import F
from django.http import JsonResponse
from rest_framework.decorators import api_view
from .models import MySubCategory, Product, ProductDetails
from .serializer import MySubCategoryGetSerializer, ProductSerializer, ProductGetSerializer
from .security import failure


def save_product(request, instance=None, image_only=False):
    fields = ['icon'] if image_only else ['maincategoryid','subcategoryid','brandid','productname','description']
    if instance is None: fields.append('icon')
    serializer = ProductSerializer(instance, data={key:request.data.get(key) for key in fields}, partial=image_only or instance is not None)
    if not serializer.is_valid():
        return JsonResponse({'status':False,'message':'Check the product fields.','errors':serializer.errors},status=400)
    serializer.save()
    return JsonResponse({'status':True,'message':'Product saved successfully.'})

@api_view(['POST'])
def Product_Submit(request):
    return save_product(request)

@api_view(['POST'])
def mysubcategory_list_by_maincategoryid(request):
    rows=MySubCategory.objects.filter(maincategoryid=request.data.get('maincategoryid')).select_related('maincategoryid')
    return JsonResponse({'status':True,'data':MySubCategoryGetSerializer(rows,many=True).data})

@api_view(['GET'])
def Product_List(request):
    rows=Product.objects.select_related('maincategoryid','subcategoryid','brandid').order_by('-pk')
    return JsonResponse({'status':True,'data':ProductGetSerializer(rows,many=True).data})

@api_view(['POST'])
@transaction.atomic
def EditProduct_Icon(request):
    Product.objects.filter(pk=request.data.get('id')).update(productname=F('productname'))
    product=Product.objects.select_for_update().filter(pk=request.data.get('id')).first()
    if not product: return failure('Product not found.',404)
    return save_product(request,product,image_only=True)

@api_view(['POST'])
@transaction.atomic
def EditProduct_Data(request):
    Product.objects.filter(pk=request.data.get('id')).update(productname=F('productname'))
    product=Product.objects.select_for_update().filter(pk=request.data.get('id')).first()
    if not product: return failure('Product not found.',404)
    # Changing a parent hierarchy would silently reclassify existing variants.
    if ProductDetails.objects.filter(productid=product).exists() and any(str(getattr(product,key+'_id'))!=str(request.data.get(key)) for key in ('maincategoryid','subcategoryid','brandid')):
        return failure('This product has variants. Its category, subcategory and brand cannot be changed.',409)
    return save_product(request,product)

@api_view(['POST'])
@transaction.atomic
def DeleteProduct_Data(request):
    Product.objects.filter(pk=request.data.get('id')).update(productname=F('productname'))
    product=Product.objects.select_for_update().filter(pk=request.data.get('id')).first()
    if not product: return failure('Product not found.',404)
    if ProductDetails.objects.filter(productid=product).exists():
        return failure('This product has variants. Remove unused variants first; order-linked variants must be kept.',409)
    product.delete()
    return JsonResponse({'status':True,'message':'Product deleted.'})
