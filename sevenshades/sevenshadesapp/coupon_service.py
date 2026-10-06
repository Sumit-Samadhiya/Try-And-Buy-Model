from datetime import datetime
from django.utils import timezone
from django.db.models import F
from .models import Coupon, CouponUsage, Product, ProductDetails


def resolve_cart_items_metadata(items):
    """Ensure every item in cart has product_id, category_id, subcategory_id, price, and qty."""
    resolved_items = []
    if not items or not isinstance(items, list):
        return resolved_items

    # Collect product / product_details IDs needing lookups
    product_ids_to_fetch = set()
    for item in items:
        if not isinstance(item, dict):
            continue
        pid = item.get('product_id') or item.get('id')
        cat_id = item.get('category_id') or item.get('maincategoryid')
        subcat_id = item.get('subcategory_id')
        if pid and (not cat_id or not subcat_id):
            product_ids_to_fetch.add(pid)

    product_meta_map = {}
    if product_ids_to_fetch:
        # Check Product table
        for prod in Product.objects.filter(id__in=product_ids_to_fetch).select_related('maincategoryid', 'subcategoryid'):
            product_meta_map[prod.id] = {
                'product_id': prod.id,
                'category_id': prod.maincategoryid_id,
                'subcategory_id': prod.subcategoryid_id,
            }
        # Also check ProductDetails table if items were keyed by product_details ID
        missing_ids = product_ids_to_fetch - set(product_meta_map.keys())
        if missing_ids:
            for pdetail in ProductDetails.objects.filter(id__in=missing_ids).select_related('maincategoryid', 'subcategoryid', 'productid'):
                product_meta_map[pdetail.id] = {
                    'product_id': pdetail.productid_id,
                    'category_id': pdetail.maincategoryid_id,
                    'subcategory_id': pdetail.subcategoryid_id,
                }

    for item in items:
        if not isinstance(item, dict):
            continue
        pid = item.get('product_id') or item.get('id')
        meta = product_meta_map.get(pid, {})
        actual_product_id = meta.get('product_id', pid)
        cat_id = item.get('category_id') or item.get('maincategoryid') or meta.get('category_id')
        subcat_id = item.get('subcategory_id') or meta.get('subcategory_id')

        try:
            price = float(item.get('price', 0))
        except (ValueError, TypeError):
            price = 0.0

        try:
            qty = int(item.get('qty', 1))
        except (ValueError, TypeError):
            qty = 1

        resolved_items.append({
            'product_id': str(actual_product_id) if actual_product_id is not None else '',
            'category_id': str(cat_id) if cat_id is not None else '',
            'subcategory_id': str(subcat_id) if subcat_id is not None else '',
            'price': max(price, 0.0),
            'qty': max(qty, 1),
            'name': item.get('name') or item.get('productname') or 'Item',
        })

    return resolved_items


def validate_and_calculate_coupon(code, raw_items, user_identifier=None):
    """Validate coupon conditions and calculate cart discount based on scope and rules.

    Returns:
        (True, {
            'valid': True,
            'coupon_id': coupon.id,
            'code': coupon.code,
            'description': coupon.description,
            'discount_type': coupon.discount_type,
            'discount_value': coupon.discount_value,
            'max_discount': coupon.max_discount,
            'scope': coupon.scope,
            'eligible_subtotal': eligible_subtotal,
            'cart_total': cart_total,
            'discount': discount,
            'final_total': final_total,
            'eligible_items_count': len(eligible_items),
            'message': message,
        })
        OR
        (False, error_message_string)
    """
    if not code or not isinstance(code, str) or not code.strip():
        return False, "Please enter a coupon code."

    normalized_code = code.strip().upper()
    coupon = Coupon.objects.filter(code__iexact=normalized_code).first()

    if not coupon:
        return False, f"Coupon code '{normalized_code}' is invalid."

    if not coupon.is_active:
        return False, "This coupon is currently inactive."

    now = timezone.now()
    if coupon.start_date and now < coupon.start_date:
        start_str = coupon.start_date.strftime('%d %b %Y, %I:%M %p')
        return False, f"Coupon will be active from {start_str}."

    if coupon.end_date and now > coupon.end_date:
        return False, "Coupon has expired."

    if coupon.total_usage_limit is not None and coupon.used_count >= coupon.total_usage_limit:
        return False, "Coupon usage limit has been exceeded."

    if user_identifier and coupon.per_user_limit:
        user_clean = str(user_identifier).strip()
        user_usage = CouponUsage.objects.filter(coupon=coupon, user_identifier=user_clean).count()
        if user_usage >= coupon.per_user_limit:
            return False, f"You have already reached the maximum usage limit ({coupon.per_user_limit}) for this coupon."

    items = resolve_cart_items_metadata(raw_items)
    if not items:
        return False, "Cart is empty. Add items to apply coupon."

    cart_total = sum(it['price'] * it['qty'] for it in items)

    # Scope matching
    scope = coupon.scope
    target_ids = set(str(t).strip() for t in (coupon.target_ids or []) if str(t).strip())
    eligible_items = []

    if scope == 'all':
        eligible_items = list(items)
    elif scope == 'category':
        eligible_items = [it for it in items if it['category_id'] in target_ids]
    elif scope == 'subcategory':
        eligible_items = [it for it in items if it['subcategory_id'] in target_ids]
    elif scope == 'product':
        eligible_items = [it for it in items if it['product_id'] in target_ids]

    if not eligible_items:
        scope_labels = {
            'category': 'selected categories',
            'subcategory': 'selected subcategories',
            'product': 'selected products',
        }
        target_name = scope_labels.get(scope, 'qualifying items')
        return False, f"This coupon is only valid on {target_name}. No eligible items found in your cart."

    eligible_subtotal = sum(it['price'] * it['qty'] for it in eligible_items)

    # Minimum order check
    if coupon.min_order_amount and coupon.min_order_amount > 0:
        if eligible_subtotal < coupon.min_order_amount:
            return False, f"Minimum order amount of ₹{int(coupon.min_order_amount)} required on eligible items (current: ₹{int(eligible_subtotal)})."

    # Discount calculation
    if coupon.discount_type == 'percentage':
        calc_discount = (eligible_subtotal * coupon.discount_value) / 100.0
        if coupon.max_discount and coupon.max_discount > 0:
            discount = min(calc_discount, coupon.max_discount)
        else:
            discount = calc_discount
    elif coupon.discount_type == 'flat':
        discount = min(coupon.discount_value, eligible_subtotal)
    else:
        discount = 0.0

    discount = round(max(discount, 0.0), 2)
    final_total = round(max(cart_total - discount, 0.0), 2)

    return True, {
        'valid': True,
        'coupon_id': coupon.id,
        'code': coupon.code,
        'description': coupon.description,
        'discount_type': coupon.discount_type,
        'discount_value': coupon.discount_value,
        'max_discount': coupon.max_discount,
        'scope': coupon.scope,
        'eligible_subtotal': eligible_subtotal,
        'cart_total': cart_total,
        'discount': discount,
        'final_total': final_total,
        'eligible_items_count': len(eligible_items),
        'message': f"Coupon '{coupon.code}' applied! You saved ₹{int(discount) if discount.is_integer() else discount}."
    }


def record_coupon_usage(coupon_code, user_identifier, order_id='', discount_amount=0.0):
    """Record atomic usage of coupon for a user and increment total count."""
    if not coupon_code or not user_identifier:
        return None

    coupon = Coupon.objects.filter(code__iexact=coupon_code.strip()).first()
    if not coupon:
        return None

    Coupon.objects.filter(pk=coupon.pk).update(used_count=F('used_count') + 1)
    coupon.refresh_from_db(fields=['used_count'])

    usage = CouponUsage.objects.create(
        coupon=coupon,
        user_identifier=str(user_identifier).strip(),
        order_id=str(order_id).strip(),
        discount_amount=max(float(discount_amount or 0.0), 0.0)
    )
    return usage
