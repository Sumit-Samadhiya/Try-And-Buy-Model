"""Authoritative checkout validation and atomic inventory reservation."""
import re
import uuid
from datetime import timedelta
from django.utils import timezone
from django.db import transaction
from django.db.models import F
from sevenshadesapp.models import SignUp, UserAddress, ProductDetails, TryOrder, TryOrderItem, DeliveryZone, ExcludedArea


class CheckoutError(ValueError):
    pass


STANDARD_DELIVERY_SLOTS = {
    '10:00 AM - 02:00 PM',
    '02:00 PM - 06:00 PM',
    '06:00 PM - 09:00 PM',
}


def normalized_size(value):
    value = str(value or '').strip().casefold()
    return {'small': 's', 'medium': 'm', 'large': 'l', 'extra large': 'xl', 'extra-large': 'xl'}.get(value, value)


@transaction.atomic
def create_trial(account, data):
    # A write before reads also serializes SQLite checkout transactions. On other
    # databases the customer row lock protects the active-order and first-trial checks.
    SignUp.objects.filter(pk=account.pk).update(fname=F('fname'))
    user = SignUp.objects.select_for_update().get(pk=account.pk)
    if not isinstance(data, dict):
        raise CheckoutError('Invalid checkout details.')
    address_id = data.get('address_id')
    if type(address_id) is not int:
        raise CheckoutError('Please select a saved delivery address.')
    address = UserAddress.objects.filter(pk=address_id, mobileno=user).first()
    if not address:
        raise CheckoutError('Please select one of your saved addresses.')
    if address.address_type not in ('Residential', 'Gated Society'):
        raise CheckoutError('Home trials require a Residential or Gated Society address.')
    postcode = address.postcode.strip()
    supported = {code.strip() for codes in DeliveryZone.objects.values_list('postcodes', flat=True) for code in codes.split(',')}
    if not re.fullmatch(r'[1-9][0-9]{5}', postcode) or postcode not in supported or ExcludedArea.objects.filter(postcode=postcode).exists():
        raise CheckoutError('Delivery not supported in this area.')
    if not address.address.strip() or not address.city.strip() or not address.country.strip():
        raise CheckoutError('Please complete your saved delivery address.')
    mode = data.get('delivery_mode', 'standard')
    slot = data.get('delivery_slot', '10:00 AM - 02:00 PM')
    if mode not in ('standard', 'emergency_sos'):
        raise CheckoutError('Please select a valid delivery mode.')

    today = timezone.localdate()
    if mode == 'emergency_sos':
        scheduled_date = today
        slot = 'Immediate SOS Delivery (90-120 mins)'
    else:
        raw_date = data.get('delivery_date') or data.get('scheduled_date')
        if raw_date:
            try:
                import datetime
                if isinstance(raw_date, str):
                    scheduled_date = datetime.date.fromisoformat(raw_date.strip())
                elif isinstance(raw_date, datetime.date):
                    scheduled_date = raw_date
                else:
                    raise ValueError
            except Exception:
                raise CheckoutError('Please select a valid scheduled delivery date (YYYY-MM-DD).')
            if scheduled_date < today or scheduled_date > today + timedelta(days=3):
                raise CheckoutError('Scheduled delivery date must be today or within the next 3 days.')
        else:
            scheduled_date = today

        if not isinstance(slot, str) or slot.strip() not in STANDARD_DELIVERY_SLOTS:
            raise CheckoutError('Please select a valid delivery time slot.')
        slot = slot.strip()
    items = data.get('items')
    if not isinstance(items, list) or not 1 <= len(items) <= 4:
        raise CheckoutError('Choose 1 to 4 different variants for your home trial.')
    terminal = ['NO_PURCHASE', 'DELIVERED', 'CANCELLED', 'Trial Completed - No Purchase', 'Completed', 'Completed - No Purchase']
    orders = TryOrder.objects.filter(mobileno=user.pk)
    if orders.exclude(status__in=terminal).exists():
        raise CheckoutError('You already have an active order. Please complete it first.')
    first = not orders.exclude(status='CANCELLED', dispatched_at__isnull=True).exists()
    fee = 99 if mode == 'emergency_sos' else (0 if first else 49)
    variants = []
    seen = set()
    for item in items:
        if not isinstance(item, dict) or type(item.get('product_details_id')) is not int or type(item.get('qty')) is not int or item['qty'] != 1:
            raise CheckoutError('Each trial variant must have quantity 1 and a valid product ID.')
        variant_id = item['product_details_id']
        if variant_id in seen:
            raise CheckoutError('The same variant cannot appear twice in a trial.')
        seen.add(variant_id)
        variant = ProductDetails.objects.select_related('productid', 'brandid').filter(pk=variant_id).first()
        if not variant:
            raise CheckoutError('A selected product is no longer available. Please update your bag.')
        if not normalized_size(variant.size) or normalized_size(item.get('size')) != normalized_size(variant.size):
            raise CheckoutError('The selected size is unavailable. Please select the product variant again.')
        price = variant.offerprice if 0 < variant.offerprice <= variant.price else variant.price
        if price <= 0:
            raise CheckoutError('A selected product has an invalid price. Please contact support.')
        if not ProductDetails.objects.filter(pk=variant_id, qty__gte=1).update(qty=F('qty') - 1):
            raise CheckoutError('A selected size is out of stock. Please update your bag.')
        variants.append((variant, price))
    order = TryOrder.objects.create(
        order_id='TRL-' + uuid.uuid4().hex[:20].upper(), mobileno=user.pk,
        address_text=address.address, city=address.city, country=address.country, latitude=address.latitude, longitude=address.longitude,
        postcode=postcode, address_type=address.address_type, delivery_mode=mode, trial_type='SOS' if mode == 'emergency_sos' else 'STANDARD',
        delivery_slot=slot, scheduled_date=scheduled_date, total_try_items=len(variants), reference_value=sum(price for _, price in variants),
        reservation_expires_at=None,
        try_fee=fee, is_first_order=first, try_payment_mode='cash',
        try_payment_status='cod', status='TRY_REQUESTED')
    for variant, price in variants:
        tag_code = f"TAG-TRY-{uuid.uuid4().hex[:10].upper()}"
        TryOrderItem.objects.create(try_order=order, product_details=variant,
            product_name=variant.productid.productname, brand_name=variant.brandid.brandname,
            size=variant.size, color=variant.color, stock_reserved=True,
            qty=1, unit_price=price, line_total=price, security_tag=tag_code)
    from sevenshadesapp.order_events import order_changed
    order_changed(order, 'order_created')
    return order
