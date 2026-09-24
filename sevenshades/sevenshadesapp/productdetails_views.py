from django.core.files.storage import default_storage
from django.db import transaction
from django.db.models import F
from django.http import JsonResponse
from rest_framework.decorators import api_view
from .models import Product, ProductDetails, TryOrderItem
from .serializer import ProductGetSerializer, ProductDetailsSerializer, ProductDetailsGetSerializer
from .security import failure

FIELDS=('maincategoryid','subcategoryid','brandid','productid','productsubname','description','qty','price','color','size','offerprice','offertype')

def Upload_Files(files):
    saved=[]
    try:
        for upload in files.getlist('icon'):
            saved.append(default_storage.save('static/'+upload.name.replace(',', '_'),upload))
    except Exception:
        for name in saved: default_storage.delete(name)
        raise
    return ','.join(name.removeprefix('static/') for name in saved)

def cleanup(names):
    for name in names.split(','):
        if name: default_storage.delete('static/'+name)

@api_view(['POST'])
@transaction.atomic
def ProductDetails_Submit(request):
    # Validate a plain copy before saving files; multipart request.data may be immutable.
    data={key:request.data.get(key) for key in FIELDS}
    serializer=ProductDetailsSerializer(data=data)
    if not serializer.is_valid():
        return JsonResponse({'status':False,'message':'Check variant fields.','errors':serializer.errors},status=400)
    names=Upload_Files(request.FILES)
    try: serializer.save(icon=names)
    except Exception:
        cleanup(names)
        raise
    return JsonResponse({'status':True,'message':'Variant created successfully.'})

@api_view(['POST'])
def Productdetail_product_list_by_subcategoryid(request):
    rows=Product.objects.filter(subcategoryid_id=request.data.get('subcategoryid')).select_related('maincategoryid','subcategoryid','brandid')
    return JsonResponse({'status':True,'data':ProductGetSerializer(rows,many=True).data})

@api_view(['POST'])
def Productdetail_brand_list_by_productid(request):
    rows=Product.objects.filter(pk=request.data.get('productid')).select_related('maincategoryid','subcategoryid','brandid')
    return JsonResponse({'status':True,'data':ProductGetSerializer(rows,many=True).data})

@api_view(['GET'])
def ProductDetails_List(request):
    rows=ProductDetails.objects.select_related('maincategoryid','subcategoryid','brandid','productid').order_by('-pk')
    return JsonResponse({'status':True,'data':ProductDetailsGetSerializer(rows,many=True).data})

@api_view(['POST'])
@transaction.atomic
def EditProductDetails_Icon(request):
    ProductDetails.objects.filter(pk=request.data.get('id')).update(qty=F('qty'))
    variant=ProductDetails.objects.select_for_update().filter(pk=request.data.get('id')).first()
    if not variant: return failure('Variant not found.',404)
    names=Upload_Files(request.FILES)
    try:
        variant.icon=names
        variant.save(update_fields=['icon'])
    except Exception:
        cleanup(names)
        raise
    return JsonResponse({'status':True,'message':'Variant images replaced.'})

@api_view(['POST'])
@transaction.atomic
def EditProductDetails_Data(request):
    ProductDetails.objects.filter(pk=request.data.get('id')).update(qty=F('qty'))
    variant=ProductDetails.objects.select_for_update().filter(pk=request.data.get('id')).first()
    if not variant: return failure('Variant not found.',404)
    expected=request.data.get('expected_qty')
    if type(expected) is not int or expected<0:
        return failure('Reload this variant before editing its stock.',400)
    if expected!=variant.qty:
        return failure('Stock changed while this form was open. Close and refresh the list before saving.',409)
    if TryOrderItem.objects.filter(product_details=variant).exists() and any(str(getattr(variant,key+'_id') if key in ('productid','maincategoryid','subcategoryid','brandid') else getattr(variant,key))!=str(request.data.get(key)) for key in ('productid','maincategoryid','subcategoryid','brandid','size','color')):
        return failure('An ordered variant cannot change product, category, brand, size or colour. Create a new variant instead.',409)
    serializer=ProductDetailsSerializer(variant,data={key:request.data.get(key) for key in FIELDS},partial=True)
    if not serializer.is_valid():
        return JsonResponse({'status':False,'message':'Check variant fields.','errors':serializer.errors},status=400)
    serializer.save()
    return JsonResponse({'status':True,'message':'Variant updated.'})

@api_view(['POST'])
@transaction.atomic
def DeleteProductDetails_Data(request):
    ProductDetails.objects.filter(pk=request.data.get('id')).update(qty=F('qty'))
    variant=ProductDetails.objects.select_for_update().filter(pk=request.data.get('id')).first()
    if not variant: return failure('Variant not found.',404)
    if TryOrderItem.objects.filter(product_details=variant).exists():
        return failure('This variant is linked to orders and must be kept for stock and return tracking.',409)
    variant.delete()
    return JsonResponse({'status':True,'message':'Variant deleted.'})
