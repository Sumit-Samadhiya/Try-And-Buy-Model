import json
import re
from datetime import datetime
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from rest_framework.decorators import api_view

from .models import Coupon, CouponUsage, MainCategory, MySubCategory, Product
from .coupon_service import validate_and_calculate_coupon

RE_COUPON_CODE = re.compile(r'^[A-Z0-9_-]{3,30}$')


def _enrich_coupon_targets(coupons):
    """Batch fetch human-readable labels for coupon target IDs."""
    cat_ids = set()
    subcat_ids = set()
    prod_ids = set()

    for c in coupons:
        targets = [str(t) for t in (c.target_ids or [])]
        if c.scope == 'category':
            cat_ids.update(targets)
        elif c.scope == 'subcategory':
            subcat_ids.update(targets)
        elif c.scope == 'product':
            prod_ids.update(targets)

    cat_map = {str(cat.id): cat.maincategoryname for cat in MainCategory.objects.filter(id__in=cat_ids)}
    subcat_map = {str(sub.id): sub.subcategoryname for sub in MySubCategory.objects.filter(id__in=subcat_ids)}
    prod_map = {str(p.id): p.productname for p in Product.objects.filter(id__in=prod_ids)}

    now = timezone.now()
    results = []
    for c in coupons:
        targets = [str(t) for t in (c.target_ids or [])]
        if c.scope == 'category':
            target_names = [cat_map.get(t, f"Category #{t}") for t in targets]
        elif c.scope == 'subcategory':
            target_names = [subcat_map.get(t, f"Subcategory #{t}") for t in targets]
        elif c.scope == 'product':
            target_names = [prod_map.get(t, f"Product #{t}") for t in targets]
        else:
            target_names = ["All Products"]

        is_expired = bool(c.end_date and now > c.end_date)
        is_upcoming = bool(c.start_date and now < c.start_date)

        results.append({
            'id': c.id,
            'code': c.code,
            'description': c.description,
            'discount_type': c.discount_type,
            'discount_value': c.discount_value,
            'max_discount': c.max_discount,
            'min_order_amount': c.min_order_amount,
            'scope': c.scope,
            'target_ids': c.target_ids or [],
            'target_names': target_names,
            'total_usage_limit': c.total_usage_limit,
            'used_count': c.used_count,
            'per_user_limit': c.per_user_limit,
            'start_date': c.start_date.isoformat() if c.start_date else None,
            'end_date': c.end_date.isoformat() if c.end_date else None,
            'is_active': c.is_active,
            'is_expired': is_expired,
            'is_upcoming': is_upcoming,
            'created_at': c.created_at.isoformat() if c.created_at else None,
        })
    return results


@api_view(['GET', 'POST'])
def AdminCouponList(request):
    """List all coupons with optional search, status filtering, and usage metrics."""
    data = request.data if request.method == 'POST' else request.GET
    search = data.get('search', '').strip()
    status_filter = data.get('status', 'all').strip().lower()
    scope_filter = data.get('scope', 'all').strip().lower()

    queryset = Coupon.objects.all().order_by('-created_at')
    now = timezone.now()

    if search:
        queryset = queryset.filter(code__icontains=search) | queryset.filter(description__icontains=search)

    if scope_filter and scope_filter != 'all':
        queryset = queryset.filter(scope=scope_filter)

    if status_filter == 'active':
        queryset = queryset.filter(is_active=True, start_date__lte=now, end_date__gte=now)
    elif status_filter == 'expired':
        queryset = queryset.filter(end_date__lt=now)
    elif status_filter == 'inactive':
        queryset = queryset.filter(is_active=False)

    coupons = list(queryset)
    serialized = _enrich_coupon_targets(coupons)

    # Compute overall summary stats
    all_qs = Coupon.objects.all()
    stats = {
        'total': all_qs.count(),
        'active': all_qs.filter(is_active=True, start_date__lte=now, end_date__gte=now).count(),
        'expired': all_qs.filter(end_date__lt=now).count(),
        'total_redemptions': sum(all_qs.values_list('used_count', flat=True) or [0]),
    }

    return JsonResponse({
        'status': True,
        'data': serialized,
        'stats': stats,
        'count': len(serialized),
    })


@api_view(['POST'])
def AdminCouponSave(request):
    """Create or update a coupon with strict field and logic validation."""
    data = request.data
    coupon_id = data.get('id')

    code = str(data.get('code', '')).strip().upper()
    if not code:
        return JsonResponse({'status': False, 'message': 'Coupon code is required.'}, status=400)
    if not RE_COUPON_CODE.fullmatch(code):
        return JsonResponse({'status': False, 'message': 'Coupon code must be 3–30 uppercase alphanumeric characters or hyphens/underscores.'}, status=400)

    # Uniqueness check
    existing = Coupon.objects.filter(code__iexact=code)
    if coupon_id:
        existing = existing.exclude(id=coupon_id)
    if existing.exists():
        return JsonResponse({'status': False, 'message': f"A coupon with code '{code}' already exists."}, status=400)

    description = str(data.get('description', '')).strip()

    discount_type = str(data.get('discount_type', 'percentage')).strip().lower()
    if discount_type not in ('percentage', 'flat'):
        return JsonResponse({'status': False, 'message': "Discount type must be 'percentage' or 'flat'."}, status=400)

    try:
        discount_value = float(data.get('discount_value', 0))
    except (ValueError, TypeError):
        return JsonResponse({'status': False, 'message': 'Enter a valid discount value.'}, status=400)

    if discount_value <= 0:
        return JsonResponse({'status': False, 'message': 'Discount value must be greater than 0.'}, status=400)

    if discount_type == 'percentage' and discount_value > 100:
        return JsonResponse({'status': False, 'message': 'Percentage discount cannot exceed 100%.'}, status=400)

    # Max discount
    max_discount = data.get('max_discount')
    if max_discount not in (None, '', 0, '0') and discount_type == 'percentage':
        try:
            max_discount = float(max_discount)
            if max_discount <= 0:
                max_discount = None
        except (ValueError, TypeError):
            max_discount = None
    else:
        max_discount = None

    # Min order amount
    min_order_amount = data.get('min_order_amount', 0)
    try:
        min_order_amount = max(float(min_order_amount or 0), 0.0)
    except (ValueError, TypeError):
        min_order_amount = 0.0

    # Scope & Target IDs
    scope = str(data.get('scope', 'all')).strip().lower()
    if scope not in ('all', 'category', 'subcategory', 'product'):
        return JsonResponse({'status': False, 'message': "Scope must be 'all', 'category', 'subcategory', or 'product'."}, status=400)

    target_ids = data.get('target_ids', [])
    if isinstance(target_ids, str):
        try:
            target_ids = json.loads(target_ids)
        except Exception:
            target_ids = [t.strip() for t in target_ids.split(',') if t.strip()]

    if not isinstance(target_ids, list):
        target_ids = []

    if scope != 'all' and not target_ids:
        return JsonResponse({'status': False, 'message': f'Please select at least one target for scope "{scope}".'}, status=400)

    # Usage limits
    total_usage_limit = data.get('total_usage_limit')
    if total_usage_limit not in (None, '', '0', 0):
        try:
            total_usage_limit = max(int(total_usage_limit), 1)
        except (ValueError, TypeError):
            total_usage_limit = None
    else:
        total_usage_limit = None

    per_user_limit = data.get('per_user_limit', 1)
    try:
        per_user_limit = max(int(per_user_limit or 1), 1)
    except (ValueError, TypeError):
        per_user_limit = 1

    # Dates
    start_raw = data.get('start_date')
    end_raw = data.get('end_date')

    if not start_raw or not end_raw:
        return JsonResponse({'status': False, 'message': 'Start date and expiry date are required.'}, status=400)

    start_date = parse_datetime(str(start_raw)) if isinstance(start_raw, str) else start_raw
    end_date = parse_datetime(str(end_raw)) if isinstance(end_raw, str) else end_raw

    if not start_date or not end_date:
        return JsonResponse({'status': False, 'message': 'Enter valid start and end dates.'}, status=400)

    if timezone.is_naive(start_date):
        start_date = timezone.make_aware(start_date)
    if timezone.is_naive(end_date):
        end_date = timezone.make_aware(end_date)

    if end_date <= start_date:
        return JsonResponse({'status': False, 'message': 'Expiry date must be after start date.'}, status=400)

    is_active = data.get('is_active')
    if isinstance(is_active, str):
        is_active = is_active.lower() in ('true', '1', 'yes')
    else:
        is_active = bool(is_active) if is_active is not None else True

    # Save / Update
    if coupon_id:
        coupon = Coupon.objects.filter(id=coupon_id).first()
        if not coupon:
            return JsonResponse({'status': False, 'message': 'Coupon not found.'}, status=404)
        coupon.code = code
        coupon.description = description
        coupon.discount_type = discount_type
        coupon.discount_value = discount_value
        coupon.max_discount = max_discount
        coupon.min_order_amount = min_order_amount
        coupon.scope = scope
        coupon.target_ids = target_ids
        coupon.total_usage_limit = total_usage_limit
        coupon.per_user_limit = per_user_limit
        coupon.start_date = start_date
        coupon.end_date = end_date
        coupon.is_active = is_active
        coupon.save()
        msg = f"Coupon '{code}' updated successfully."
    else:
        coupon = Coupon.objects.create(
            code=code,
            description=description,
            discount_type=discount_type,
            discount_value=discount_value,
            max_discount=max_discount,
            min_order_amount=min_order_amount,
            scope=scope,
            target_ids=target_ids,
            total_usage_limit=total_usage_limit,
            per_user_limit=per_user_limit,
            start_date=start_date,
            end_date=end_date,
            is_active=is_active,
        )
        msg = f"Coupon '{code}' created successfully."

    return JsonResponse({'status': True, 'message': msg, 'coupon_id': coupon.id})


@api_view(['POST'])
def AdminCouponToggle(request):
    """Toggle active/inactive status of a coupon."""
    coupon_id = request.data.get('id')
    coupon = Coupon.objects.filter(id=coupon_id).first()
    if not coupon:
        return JsonResponse({'status': False, 'message': 'Coupon not found.'}, status=404)

    explicit_status = request.data.get('is_active')
    if explicit_status is not None:
        if isinstance(explicit_status, str):
            coupon.is_active = explicit_status.lower() in ('true', '1', 'yes')
        else:
            coupon.is_active = bool(explicit_status)
    else:
        coupon.is_active = not coupon.is_active

    coupon.save(update_fields=['is_active', 'updated_at'])
    return JsonResponse({
        'status': True,
        'message': f"Coupon '{coupon.code}' is now {'active' if coupon.is_active else 'inactive'}.",
        'is_active': coupon.is_active,
    })


@api_view(['POST'])
def AdminCouponDelete(request):
    """Delete a coupon."""
    coupon_id = request.data.get('id')
    coupon = Coupon.objects.filter(id=coupon_id).first()
    if not coupon:
        return JsonResponse({'status': False, 'message': 'Coupon not found.'}, status=404)

    code = coupon.code
    coupon.delete()
    return JsonResponse({'status': True, 'message': f"Coupon '{code}' deleted successfully."})


@api_view(['GET'])
def AdminCouponDependencies(request):
    """Return categories, subcategories, and products for the coupon scope selectors."""
    categories = list(MainCategory.objects.all().values('id', 'maincategoryname'))
    subcategories = list(MySubCategory.objects.all().values('id', 'subcategoryname', 'maincategoryid_id'))
    products = list(Product.objects.all().values('id', 'productname', 'maincategoryid_id', 'subcategoryid_id'))

    return JsonResponse({
        'status': True,
        'categories': [{'id': c['id'], 'name': c['maincategoryname']} for c in categories],
        'subcategories': [{'id': s['id'], 'name': s['subcategoryname'], 'category_id': s['maincategoryid_id']} for s in subcategories],
        'products': [{'id': p['id'], 'name': p['productname'], 'category_id': p['maincategoryid_id'], 'subcategory_id': p['subcategoryid_id']} for p in products],
    })


@api_view(['POST'])
def ValidateCoupon(request):
    """Public / customer endpoint to validate and calculate coupon discount for cart."""
    data = request.data
    code = data.get('code', '')
    raw_items = data.get('items', [])
    if isinstance(raw_items, str):
        try:
            raw_items = json.loads(raw_items)
        except Exception:
            raw_items = []

    user_identifier = data.get('user_identifier') or data.get('mobileno') or getattr(request, 'account', None)
    if hasattr(user_identifier, 'mobileno'):
        user_identifier = user_identifier.mobileno

    is_valid, result = validate_and_calculate_coupon(code, raw_items, user_identifier)
    if not is_valid:
        return JsonResponse({'status': False, 'valid': False, 'message': result}, status=400)

    return JsonResponse({'status': True, **result})
