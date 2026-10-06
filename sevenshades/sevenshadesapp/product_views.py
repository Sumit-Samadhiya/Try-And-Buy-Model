from django.db import transaction
from django.db.models import F, Avg, Count, Prefetch
from django.http import JsonResponse
from rest_framework.decorators import api_view
from .models import MySubCategory, Product, ProductDetails
from .serializer import MySubCategoryGetSerializer, ProductSerializer, ProductGetSerializer
from .security import failure


def save_product(request, instance=None, image_only=False):
    from .upload_security import sanitize_filename, optimize_uploaded_image
    from django.core.files.base import ContentFile
    fields = ['icon'] if image_only else ['maincategoryid','subcategoryid','brandid','productname','description']
    if instance is None: fields.append('icon')
    raw_icon = request.FILES.get('icon') or request.data.get('icon')
    if hasattr(raw_icon, 'name') and hasattr(raw_icon, 'read'):
        safe_name = sanitize_filename(raw_icon.name, fallback_ext='.jpg')
        opt_data = optimize_uploaded_image(raw_icon, max_dimension=1200, quality=78)
        raw_icon = ContentFile(opt_data, name=safe_name)
    elif hasattr(raw_icon, 'name'):
        raw_icon.name = sanitize_filename(raw_icon.name, fallback_ext='.png')
    serializer = ProductSerializer(instance, data={key: (raw_icon if key == 'icon' else request.data.get(key)) for key in fields}, partial=image_only or instance is not None)
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

def catalog_products():
    # Aggregate once rather than issuing six queries for every product.
    return Product.objects.select_related('maincategoryid', 'subcategoryid', 'brandid').annotate(
        catalog_variant_count=Count('productdetails', distinct=True),
        catalog_review_count=Count('productdetails__productreview', distinct=True),
        catalog_avg_rating=Avg('productdetails__productreview__rating'),
    ).prefetch_related(Prefetch(
        'productdetails_set',
        queryset=ProductDetails.objects.filter(qty__gt=0).only('id', 'productid', 'price', 'offerprice'),
        to_attr='catalog_available_variants',
    )).order_by('-pk')


@api_view(['GET'])
def Product_List(request):
    rows=catalog_products()
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
