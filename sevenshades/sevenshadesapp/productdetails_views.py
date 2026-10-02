from django.core.files.storage import default_storage
from django.db import transaction
from django.db.models import F
from django.http import JsonResponse
from rest_framework.decorators import api_view
from .models import Product, ProductDetails, TryOrderItem
from .serializer import ProductGetSerializer, ProductDetailsSerializer, ProductDetailsGetSerializer
from .security import failure

from .upload_security import sanitize_filename

FIELDS=('maincategoryid','subcategoryid','brandid','productid','productsubname','description','qty','price','color','size','offerprice','offertype','sku')

def Upload_Files(files):
    from .upload_security import sanitize_filename, optimize_uploaded_image
    from django.core.files.base import ContentFile
    saved=[]
    try:
        for upload in files.getlist('icon'):
            safe_name = sanitize_filename(upload.name, fallback_ext='.jpg')
            opt_data = optimize_uploaded_image(upload, max_dimension=1200, quality=78)
            saved.append(default_storage.save('static/' + safe_name, ContentFile(opt_data)))
    except Exception:
        for name in saved: default_storage.delete(name)
        raise
    return ','.join(saved)

def cleanup(names):
    for name in names.split(','):
        if name: default_storage.delete(name)

def _field_value(request, key):
    value = request.data.get(key)
    if key == 'sku':
        return value.strip() if isinstance(value, str) else ''  # Optional; never null.
    if key in ('color', 'size') and isinstance(value, str):
        return value.strip()
    return value


@api_view(['POST'])
@transaction.atomic
def ProductDetails_Submit(request):
    # Validate a plain copy before saving files; multipart request.data may be immutable.
    data={key:_field_value(request, key) for key in FIELDS}
    serializer=ProductDetailsSerializer(data=data)
    if not serializer.is_valid():
        return JsonResponse({'status':False,'message':'Check variant fields.','errors':serializer.errors},status=400)
    names=Upload_Files(request.FILES)
    try: serializer.save(icon=names)
    except Exception:
        cleanup(names)
        raise
    return JsonResponse({'status':True,'message':'Variant created successfully.'})


# Shared fields apply to every size row; per-size fields come from the variants array.
BATCH_SHARED = ('maincategoryid', 'subcategoryid', 'brandid', 'productid', 'productsubname', 'description', 'color', 'offertype')
BATCH_PER_SIZE = ('size', 'qty', 'price', 'offerprice', 'sku')


@api_view(['POST'])
@transaction.atomic
def ProductDetails_BatchSubmit(request):
    """Create several same-colour size variants in one atomic request.

    One shared image set is stored once per row. Either every row is created or
    none are: the unique (productid, color, size) constraint and offerprice<=price
    rule are enforced per row, so a single bad or duplicate size rolls back all.
    """
    import json

    shared = {}
    for key in BATCH_SHARED:
        value = request.data.get(key)
        shared[key] = value.strip() if key in ('color',) and isinstance(value, str) else value

    raw_variants = request.data.get('variants')
    if isinstance(raw_variants, str):
        try:
            raw_variants = json.loads(raw_variants)
        except (ValueError, TypeError):
            return JsonResponse({'status': False, 'message': 'Variants must be a valid list.'}, status=400)
    if not isinstance(raw_variants, list) or not raw_variants:
        return JsonResponse({'status': False, 'message': 'Add at least one size row.'}, status=400)
    if len(raw_variants) > 20:
        return JsonResponse({'status': False, 'message': 'Add at most 20 size rows per submission.'}, status=400)

    # Validate every row against the model serializer before touching storage.
    prepared, seen_sizes, errors = [], set(), {}
    for index, entry in enumerate(raw_variants):
        if not isinstance(entry, dict):
            errors[f'variants[{index}]'] = ['Each size row must be an object.']
            break
        size = entry.get('size')
        size = size.strip() if isinstance(size, str) else size
        key = str(size).casefold() if isinstance(size, str) else size
        if key in seen_sizes:
            errors[f'variants[{index}].size'] = ['This size is repeated in the form.']
            break
        seen_sizes.add(key)
        row = dict(shared)
        row.update({
            'size': size,
            'qty': entry.get('qty'),
            'price': entry.get('price'),
            'offerprice': entry.get('offerprice', 0),
            'sku': (entry.get('sku') or '').strip() if isinstance(entry.get('sku'), str) else '',
        })
        serializer = ProductDetailsSerializer(data=row)
        if not serializer.is_valid():
            errors[f'variants[{index}]'] = serializer.errors
            break
        prepared.append(serializer)

    if errors:
        return JsonResponse({'status': False, 'message': 'Check the size rows.', 'errors': errors}, status=400)

    names = Upload_Files(request.FILES)
    try:
        created = 0
        for serializer in prepared:
            serializer.save(icon=names)
            created += 1
    except Exception:
        cleanup(names)
        raise
    return JsonResponse({'status': True, 'message': f'{created} size variant{"s" if created != 1 else ""} created successfully.', 'created': created})

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
    edit_data={key:_field_value(request, key) for key in FIELDS}
    serializer=ProductDetailsSerializer(variant,data=edit_data,partial=True)
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
