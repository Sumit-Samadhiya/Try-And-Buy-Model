"""Shopkeeper Quick Intake, AI Auto-Naming, Staging Preview, Publish & Export APIs."""
import base64
import csv
import json
import logging
import re

from django.core.cache import cache
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db import transaction
from django.http import HttpResponse, JsonResponse
from django.utils import timezone
from rest_framework.decorators import api_view

from .intake_ai import analyze_garment_image, create_studio_product_photo
from .models import (
    Brands,
    MainCategory,
    MySubCategory,
    Product,
    ProductDetails,
    Shopkeeper,
    ShopkeeperIntakeItem,
)
from .productdetails_views import Upload_Files, cleanup
from .security import failure
from .upload_security import optimize_uploaded_image, validate_uploaded_image

logger = logging.getLogger(__name__)


def _next_shop_code():
    max_num = 0
    for code in Shopkeeper.objects.values_list('shop_code', flat=True):
        m = re.match(r'^SH(\d+)$', str(code or '').strip().upper())
        if m:
            max_num = max(max_num, int(m.group(1)))
    candidate = f"SH{max_num + 1:02d}"
    while Shopkeeper.objects.filter(shop_code=candidate).exists():
        max_num += 1
        candidate = f"SH{max_num + 1:02d}"
    return candidate


def _next_unique_code(shopkeeper):
    prefix = (shopkeeper.shop_code or 'SH01').strip().upper()
    max_num = 0
    for code in ShopkeeperIntakeItem.objects.filter(shopkeeper=shopkeeper).values_list('unique_code', flat=True):
        m = re.match(rf'^{re.escape(prefix)}-(\d+)$', str(code or '').strip().upper())
        if m:
            max_num = max(max_num, int(m.group(1)))
    num = max_num + 1
    candidate = f"{prefix}-{num:03d}"
    while ShopkeeperIntakeItem.objects.filter(unique_code=candidate).exists():
        num += 1
        candidate = f"{prefix}-{num:03d}"
    return candidate


def _parse_int(val, field_name, minimum=0):
    try:
        parsed = int(str(val).strip())
    except (TypeError, ValueError):
        raise ValueError(f"{field_name} must be a whole number.")
    if parsed < minimum:
        raise ValueError(f"{field_name} must be at least {minimum}.")
    return parsed


def _parse_sizes(raw):
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except (ValueError, TypeError):
            raise ValueError("Sizes must be a valid JSON list.")
    if not isinstance(raw, list) or not raw:
        raise ValueError("Select at least one size with quantity.")
    if len(raw) > 20:
        raise ValueError("At most 20 sizes can be added per item.")
    cleaned, seen = [], set()
    for row in raw:
        if not isinstance(row, dict):
            raise ValueError("Each size row must be an object.")
        size = str(row.get('size') or '').strip()
        if not size or len(size) > 70:
            raise ValueError("Each selected size must have a valid label.")
        key = size.casefold()
        if key in seen:
            raise ValueError(f"Duplicate size '{size}' in item.")
        seen.add(key)
        qty = _parse_int(row.get('qty', 1), f"Quantity for {size}", minimum=0)
        cleaned.append({'size': size, 'qty': qty})
    return cleaned


def _serialize_shopkeeper(s):
    return {
        'id': s.id,
        'shop_code': s.shop_code,
        'shop_name': s.shop_name,
        'owner_name': s.owner_name,
        'phone': s.phone,
        'address': s.address,
        'default_markup': s.default_markup,
        'is_active': s.is_active,
    }


def _serialize_intake_item(item, include_website_price=True):
    photo_list = [p for p in str(item.photos or '').split(',') if p]
    sizes = item.sizes_json if isinstance(item.sizes_json, list) else []
    total_qty = sum(int(s.get('qty') or 0) for s in sizes if isinstance(s, dict))
    data = {
        'id': item.id,
        'unique_code': item.unique_code,
        'shopkeeper_id': item.shopkeeper_id,
        'shop_code': item.shopkeeper.shop_code,
        'shop_name': item.shopkeeper.shop_name,
        'shop_phone': item.shopkeeper.phone,
        'maincategoryid': item.maincategoryid_id,
        'maincategoryname': item.maincategoryid.maincategoryname,
        'subcategoryid': item.subcategoryid_id,
        'subcategoryname': item.subcategoryid.subcategoryname,
        'brandid': item.brandid_id,
        'brandname': item.brandid.brandname,
        'product_name': item.product_name,
        'description': item.description,
        'color': item.color,
        'cost_price': item.cost_price,
        'sizes_json': sizes,
        'total_qty': total_qty,
        'photos': item.photos,
        'photo_list': photo_list,
        'ai_source': item.ai_source,
        'status': item.status,
        'published_product_id': item.published_product_id,
        'published_at': item.published_at.isoformat() if item.published_at else None,
        'created_at': item.created_at.isoformat() if item.created_at else None,
    }
    if include_website_price:
        data['markup_amount'] = item.markup_amount
        data['website_price'] = item.website_price
    return data


@api_view(['GET'])
def Shopkeeper_List(request):
    rows = Shopkeeper.objects.filter(is_active=True).order_by('shop_code', 'shop_name')
    return JsonResponse({'status': True, 'data': [_serialize_shopkeeper(r) for r in rows]})


@api_view(['POST'])
@transaction.atomic
def Shopkeeper_Save(request):
    shop_id = request.data.get('id')
    shop_name = str(request.data.get('shop_name') or '').strip()
    if not shop_name or len(shop_name) > 100:
        return failure('Shop name is required (up to 100 characters).', 400)
    owner_name = str(request.data.get('owner_name') or '').strip()[:70]
    phone = str(request.data.get('phone') or '').strip()[:15]
    address = str(request.data.get('address') or '').strip()[:250]
    try:
        default_markup = _parse_int(request.data.get('default_markup', 150), 'Default markup', minimum=0)
    except ValueError as exc:
        return failure(str(exc), 400)

    if shop_id:
        shop = Shopkeeper.objects.select_for_update().filter(pk=shop_id).first()
        if not shop:
            return failure('Shopkeeper not found.', 404)
        shop.shop_name = shop_name
        shop.owner_name = owner_name
        shop.phone = phone
        shop.address = address
        shop.default_markup = default_markup
        shop.save()
    else:
        shop_code = str(request.data.get('shop_code') or '').strip().upper()[:20] or _next_shop_code()
        if Shopkeeper.objects.filter(shop_code=shop_code).exists():
            return failure(f'Shop code "{shop_code}" already exists.', 409)
        shop = Shopkeeper.objects.create(
            shop_code=shop_code,
            shop_name=shop_name,
            owner_name=owner_name,
            phone=phone,
            address=address,
            default_markup=default_markup,
        )
    return JsonResponse({'status': True, 'message': 'Shopkeeper saved.', 'data': _serialize_shopkeeper(shop)})


@api_view(['POST'])
def Intake_Analyze(request):
    upload = request.FILES.get('icon')
    if not upload:
        return failure('Choose a garment photo to analyze.', 400)
    errs = validate_uploaded_image(upload)
    if errs:
        return failure(errs[0], 400)
    opt_bytes = optimize_uploaded_image(upload, max_dimension=1024, quality=78)
    cat = MainCategory.objects.filter(pk=request.data.get('maincategoryid')).first()
    sub = MySubCategory.objects.filter(pk=request.data.get('subcategoryid')).first()
    brand = Brands.objects.filter(pk=request.data.get('brandid')).first()
    result = analyze_garment_image(
        opt_bytes,
        mime_type='image/jpeg',
        category_name=cat.maincategoryname if cat else str(request.data.get('category_name') or ''),
        subcategory_name=sub.subcategoryname if sub else str(request.data.get('subcategory_name') or ''),
        brand_name=brand.brandname if brand else '',
        color_hint=str(request.data.get('color') or ''),
    )
    return JsonResponse({'status': True, 'data': result})


@api_view(['POST'])
def Intake_Studio_Photo(request):
    upload = request.FILES.get('icon')
    if not upload:
        return failure('Choose a garment photo to enhance.', 400)
    errs = validate_uploaded_image(upload)
    if errs:
        return failure(errs[0], 400)
    opt_bytes = optimize_uploaded_image(upload, max_dimension=1200, quality=85)
    cat = MainCategory.objects.filter(pk=request.data.get('maincategoryid')).first()
    sub = MySubCategory.objects.filter(pk=request.data.get('subcategoryid')).first()
    studio = create_studio_product_photo(
        opt_bytes,
        mime_type='image/jpeg',
        category_name=cat.maincategoryname if cat else '',
        subcategory_name=sub.subcategoryname if sub else '',
    )
    mime = studio['mime_type']
    b64 = base64.b64encode(studio['image_bytes']).decode('ascii')
    return JsonResponse({
        'status': True,
        'data': {
            'data_url': f"data:{mime};base64,{b64}",
            'mime_type': mime,
            'studio_mode': studio['studio_mode'],
            'notice': studio['notice'],
        },
    })


@api_view(['GET'])
def Intake_List(request):
    qs = ShopkeeperIntakeItem.objects.select_related(
        'shopkeeper', 'maincategoryid', 'subcategoryid', 'brandid'
    ).order_by('-created_at', '-id')
    shopkeeper_id = request.GET.get('shopkeeper_id')
    if shopkeeper_id:
        qs = qs.filter(shopkeeper_id=shopkeeper_id)
    status_filter = str(request.GET.get('status') or '').strip().upper()
    if status_filter in ('DRAFT', 'PUBLISHED'):
        qs = qs.filter(status=status_filter)
    return JsonResponse({'status': True, 'data': [_serialize_intake_item(item) for item in qs]})


@api_view(['POST'])
@transaction.atomic
def Intake_Submit(request):
    shopkeeper = Shopkeeper.objects.filter(pk=request.data.get('shopkeeper_id'), is_active=True).first()
    if not shopkeeper:
        return failure('Select a valid shopkeeper.', 400)
    cat = MainCategory.objects.filter(pk=request.data.get('maincategoryid')).first()
    sub = MySubCategory.objects.filter(pk=request.data.get('subcategoryid')).first()
    brand = Brands.objects.filter(pk=request.data.get('brandid')).first()
    if not cat or not sub or not brand:
        return failure('Select valid category, subcategory, and brand.', 400)
    if sub.maincategoryid_id != cat.id:
        return failure('Selected subcategory does not belong to the chosen category.', 400)

    uploads = request.FILES.getlist('icon')
    if not uploads:
        return failure('Capture or upload at least one garment photo.', 400)
    for up in uploads:
        errs = validate_uploaded_image(up)
        if errs:
            return failure(errs[0], 400)

    try:
        cost_price = _parse_int(request.data.get('cost_price'), 'Shopkeeper rate', minimum=1)
        raw_markup = request.data.get('markup_amount')
        markup_amount = _parse_int(
            shopkeeper.default_markup if raw_markup in (None, '') else raw_markup,
            'Website markup',
            minimum=0,
        )
        sizes_json = _parse_sizes(request.data.get('sizes_json'))
    except ValueError as exc:
        return failure(str(exc), 400)

    website_price = cost_price + markup_amount
    if request.data.get('website_price') not in (None, ''):
        try:
            website_price = _parse_int(request.data.get('website_price'), 'Website price', minimum=1)
        except ValueError as exc:
            return failure(str(exc), 400)

    unique_code = _next_unique_code(shopkeeper)

    # Read optimized bytes of first photo for optional AI naming before Upload_Files consumes the stream.
    first_opt_bytes = optimize_uploaded_image(uploads[0], max_dimension=1024, quality=78)
    for up in uploads:
        try:
            up.seek(0)
        except Exception:
            pass

    manual_name = str(request.data.get('product_name') or '').strip()[:70]
    manual_desc = str(request.data.get('description') or '').strip()[:150]
    manual_color = str(request.data.get('color') or '').strip()[:70]

    if manual_name and manual_desc:
        ai_meta = {
            'product_name': manual_name,
            'description': manual_desc,
            'color': manual_color or 'Assorted',
            'ai_source': 'manual',
        }
    else:
        ai_meta = analyze_garment_image(
            first_opt_bytes,
            mime_type='image/jpeg',
            category_name=cat.maincategoryname,
            subcategory_name=sub.subcategoryname,
            brand_name=brand.brandname,
            unique_code=unique_code,
            color_hint=manual_color,
        )
        if manual_name:
            ai_meta['product_name'] = manual_name
        if manual_desc:
            ai_meta['description'] = manual_desc
        if manual_color:
            ai_meta['color'] = manual_color

    names = Upload_Files(request.FILES)
    try:
        item = ShopkeeperIntakeItem.objects.create(
            shopkeeper=shopkeeper,
            unique_code=unique_code,
            maincategoryid=cat,
            subcategoryid=sub,
            brandid=brand,
            product_name=ai_meta['product_name'],
            description=ai_meta['description'],
            color=ai_meta['color'],
            cost_price=cost_price,
            markup_amount=markup_amount,
            website_price=website_price,
            sizes_json=sizes_json,
            photos=names,
            ai_source=ai_meta['ai_source'],
            status='DRAFT',
        )
    except Exception:
        cleanup(names)
        raise

    return JsonResponse({
        'status': True,
        'message': f'Saved {item.unique_code} to staging.',
        'data': _serialize_intake_item(item),
    })


@api_view(['POST'])
@transaction.atomic
def Intake_Update(request):
    item = ShopkeeperIntakeItem.objects.select_for_update().select_related(
        'shopkeeper', 'maincategoryid', 'subcategoryid', 'brandid'
    ).filter(pk=request.data.get('id')).first()
    if not item:
        return failure('Staging item not found.', 404)
    if item.status == 'PUBLISHED':
        return failure('Published items cannot be edited in staging.', 409)

    try:
        if 'cost_price' in request.data:
            item.cost_price = _parse_int(request.data.get('cost_price'), 'Shopkeeper rate', minimum=1)
        if 'markup_amount' in request.data:
            item.markup_amount = _parse_int(request.data.get('markup_amount'), 'Website markup', minimum=0)
        if 'website_price' in request.data and request.data.get('website_price') not in (None, ''):
            item.website_price = _parse_int(request.data.get('website_price'), 'Website price', minimum=1)
        elif 'cost_price' in request.data or 'markup_amount' in request.data:
            item.website_price = item.cost_price + item.markup_amount
        if 'sizes_json' in request.data:
            item.sizes_json = _parse_sizes(request.data.get('sizes_json'))
    except ValueError as exc:
        return failure(str(exc), 400)

    if 'product_name' in request.data:
        name = str(request.data.get('product_name') or '').strip()[:70]
        if not name:
            return failure('Product name cannot be empty.', 400)
        item.product_name = name
    if 'description' in request.data:
        desc = str(request.data.get('description') or '').strip()[:150]
        if not desc:
            return failure('Description cannot be empty.', 400)
        item.description = desc
    if 'color' in request.data:
        color = str(request.data.get('color') or '').strip()[:70]
        item.color = color or 'Assorted'

    item.save()
    return JsonResponse({
        'status': True,
        'message': f'Updated {item.unique_code}.',
        'data': _serialize_intake_item(item),
    })


@api_view(['POST'])
@transaction.atomic
def Intake_Delete(request):
    item = ShopkeeperIntakeItem.objects.select_for_update().filter(pk=request.data.get('id')).first()
    if not item:
        return failure('Staging item not found.', 404)
    if item.status == 'PUBLISHED':
        return failure('Published items cannot be deleted from staging.', 409)
    photos = item.photos
    code = item.unique_code
    item.delete()
    cleanup(photos)
    return JsonResponse({'status': True, 'message': f'Removed draft {code}.'})


@api_view(['POST'])
@transaction.atomic
def Intake_Publish(request):
    raw_ids = request.data.get('ids')
    if raw_ids is None and request.data.get('id') is not None:
        raw_ids = [request.data.get('id')]
    if isinstance(raw_ids, str):
        try:
            raw_ids = json.loads(raw_ids)
        except (ValueError, TypeError):
            raw_ids = [raw_ids]
    if not isinstance(raw_ids, list) or not raw_ids:
        return failure('Select at least one draft item to upload to the website.', 400)

    clean_ids = []
    for x in raw_ids:
        try:
            clean_ids.append(int(x))
        except (TypeError, ValueError):
            return failure('Invalid item ID provided.', 400)

    items = list(
        ShopkeeperIntakeItem.objects.select_for_update()
        .select_related('shopkeeper', 'maincategoryid', 'subcategoryid', 'brandid')
        .filter(pk__in=clean_ids, status='DRAFT')
        .order_by('id')
    )
    if not items:
        return failure('No pending draft items found to publish.', 409)

    published_ids = []
    now = timezone.now()
    for item in items:
        photo_list = [p for p in str(item.photos or '').split(',') if p]
        first_photo = photo_list[0] if photo_list else ''
        product = Product.objects.create(
            maincategoryid=item.maincategoryid,
            subcategoryid=item.subcategoryid,
            brandid=item.brandid,
            productname=item.product_name[:70],
            description=item.description[:150],
            icon=first_photo,
        )
        sizes = item.sizes_json if isinstance(item.sizes_json, list) and item.sizes_json else [{'size': 'Free Size', 'qty': 1}]
        for s_row in sizes:
            size_label = str(s_row.get('size') or 'Free Size').strip()[:70]
            qty_val = max(0, int(s_row.get('qty') or 0))
            sku_code = f"{item.unique_code}-{size_label}".replace(' ', '')[:60]
            ProductDetails.objects.create(
                maincategoryid=item.maincategoryid,
                subcategoryid=item.subcategoryid,
                brandid=item.brandid,
                productid=product,
                productsubname=item.product_name[:70],
                description=item.description[:150],
                qty=qty_val,
                price=item.website_price,
                color=(item.color or 'Assorted')[:70],
                size=size_label,
                offerprice=0,
                offertype='None',
                sku=sku_code,
                icon=item.photos,
            )
        item.status = 'PUBLISHED'
        item.published_product = product
        item.published_at = now
        item.save(update_fields=['status', 'published_product', 'published_at', 'updated_at'])
        cache.delete(f"product_details_{product.pk}")
        published_ids.append(item.id)

    count = len(published_ids)
    return JsonResponse({
        'status': True,
        'message': f'Uploaded {count} item{"s" if count != 1 else ""} to website.',
        'published_count': count,
        'published_ids': published_ids,
    })


def _filtered_export_queryset(request):
    qs = ShopkeeperIntakeItem.objects.select_related(
        'shopkeeper', 'maincategoryid', 'subcategoryid', 'brandid'
    ).order_by('shopkeeper__shop_code', 'unique_code')
    shopkeeper_id = request.GET.get('shopkeeper_id')
    if shopkeeper_id:
        qs = qs.filter(shopkeeper_id=shopkeeper_id)
    status_filter = str(request.GET.get('status') or '').strip().upper()
    if status_filter in ('DRAFT', 'PUBLISHED'):
        qs = qs.filter(status=status_filter)
    return qs


def _csv_cell(value):
    text = str(value if value is not None else '')
    if text and text[0] in ('=', '+', '-', '@'):
        return "'" + text
    return text


@api_view(['GET'])
def Intake_Export_CSV(request):
    """Shopkeeper settlement sheet (CSV): strictly original cost_price only."""
    qs = _filtered_export_queryset(request)
    shopkeeper_id = request.GET.get('shopkeeper_id')
    shop = Shopkeeper.objects.filter(pk=shopkeeper_id).first() if shopkeeper_id else None
    filename_tag = shop.shop_code if shop else 'all_shops'

    response = HttpResponse(content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="shopkeeper_{filename_tag}_rate_sheet.csv"'
    response.write('\ufeff')
    writer = csv.writer(response)
    writer.writerow([
        'Unique Code',
        'Shop Code',
        'Shop Name',
        'Product Name',
        'Category',
        'Subcategory',
        'Color',
        'Sizes & Qty',
        'Total Qty',
        'Shopkeeper Rate (INR)',
        'Status',
        'Photo Path',
    ])
    for item in qs:
        sizes = item.sizes_json if isinstance(item.sizes_json, list) else []
        sizes_text = ', '.join(f"{s.get('size')}:{s.get('qty')}" for s in sizes if isinstance(s, dict))
        total_qty = sum(int(s.get('qty') or 0) for s in sizes if isinstance(s, dict))
        first_photo = str(item.photos or '').split(',')[0]
        writer.writerow([
            _csv_cell(item.unique_code),
            _csv_cell(item.shopkeeper.shop_code),
            _csv_cell(item.shopkeeper.shop_name),
            _csv_cell(item.product_name),
            _csv_cell(item.maincategoryid.maincategoryname),
            _csv_cell(item.subcategoryid.subcategoryname),
            _csv_cell(item.color),
            _csv_cell(sizes_text),
            total_qty,
            item.cost_price,
            _csv_cell(item.status),
            _csv_cell(first_photo),
        ])
    return response


@api_view(['GET'])
def Intake_Export_Sheet(request):
    """Structured photo-sheet payload for shopkeepers: strictly original cost_price only."""
    qs = list(_filtered_export_queryset(request))
    shopkeeper_id = request.GET.get('shopkeeper_id')
    shop = Shopkeeper.objects.filter(pk=shopkeeper_id).first() if shopkeeper_id else None
    rows = [_serialize_intake_item(item, include_website_price=False) for item in qs]
    total_pieces = sum(r['total_qty'] for r in rows)
    total_cost_value = sum(r['cost_price'] * max(1, r['total_qty']) for r in rows)
    return JsonResponse({
        'status': True,
        'data': {
            'shopkeeper': _serialize_shopkeeper(shop) if shop else None,
            'items': rows,
            'total_items': len(rows),
            'total_pieces': total_pieces,
            'total_cost_value': total_cost_value,
        },
    })
