"""Razorpay server orders, signature verification, captured-payment reconciliation."""
import hashlib
import hmac
import re
import uuid
import requests
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from .models import GatewayPayment, FinalOrder
from .inventory_workflow import lock_order, InventoryError
from .order_events import order_changed
from .settlement import approved, complete_payment


def gateway_configured():
    return bool(settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET)


def gateway_request(method, endpoint, payload=None):
    if not gateway_configured():
        raise InventoryError('Razorpay is not configured. No payment was initiated.')
    try:
        response = requests.request(method, 'https://api.razorpay.com/v1/' + endpoint,
            auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET), json=payload, timeout=15)
        response.raise_for_status()
        data = response.json()
        if not isinstance(data, dict):
            raise ValueError('Invalid gateway response')
        return data
    except (requests.RequestException, ValueError):
        raise InventoryError('Payment provider could not be verified. Please check payment status before retrying.')


def payment_options(attempt):
    return {'key': settings.RAZORPAY_KEY_ID, 'order_id': attempt.gateway_order_id,
        'amount': attempt.amount_paise, 'currency': 'INR', 'name': settings.RECEIPT_SELLER_NAME,
        'local_order_id': attempt.try_order.order_id, 'purpose': attempt.purpose, 'revision': attempt.revision}


def create_payment(account, order_id, purpose, revision=0):
    if not gateway_configured():
        raise InventoryError('Razorpay is not configured. Please contact support or choose cash for your final bill.')
    from .inventory_workflow import expire_pending_trials
    expire_pending_trials(account.pk)
    with transaction.atomic():
        order = lock_order(order_id)
        if order.mobileno != account.pk or purpose not in ('trial', 'final'):
            raise InventoryError('Payment not found.')
        if purpose == 'trial':
            revision = 0
            if order.status != 'AWAITING_TRIAL_PAYMENT' or order.trial_fee_paid or order.try_fee <= 0:
                raise InventoryError('This trial fee is not payable.')
            amount = order.try_fee * 100
        else:
            final = FinalOrder.objects.filter(try_order=order).first()
            if not final or type(revision) is not int or revision != final.bill_revision or not approved(final):
                raise InventoryError('Approve the current bill before payment.')
            if final.payment_status == 'paid' or final.payment_mode != 'razorpay' or final.final_payable <= 0:
                raise InventoryError('This bill is not awaiting an online payment.')
            amount = final.final_payable * 100
        existing = GatewayPayment.objects.filter(try_order=order, purpose=purpose, revision=revision).first()
        if existing:
            if existing.state == 'READY':
                return payment_options(existing)
            raise InventoryError('Payment setup or verification is pending. Check order status; do not make a second payment.')
        attempt = GatewayPayment.objects.create(try_order=order, purpose=purpose, revision=revision, amount_paise=amount, receipt_reference='SS-' + uuid.uuid4().hex)
    # Persist the intent before contacting the provider. A timeout is uncertain,
    # never permission to issue a second charge/order automatically.
    try:
        response = gateway_request('POST', 'orders', {'amount': amount, 'currency': 'INR',
            'receipt': attempt.receipt_reference, 'partial_payment': False,
            'notes': {'local_payment_id': str(attempt.pk)}})
        if not re.fullmatch(r'order_[A-Za-z0-9]+', str(response.get('id', ''))) or response.get('amount') != amount or response.get('currency') != 'INR':
            raise InventoryError('Payment setup needs reconciliation. No additional payment was started.')
        with transaction.atomic():
            lock_order(order_id)
            attempt.refresh_from_db()
            if attempt.gateway_order_id and attempt.gateway_order_id != response['id']:
                raise InventoryError('Provider order mismatch. Contact support.')
            if attempt.state == 'CAPTURED':
                raise InventoryError('Payment is already captured. Refresh your order.')
            attempt.gateway_order_id = response['id']
            attempt.state = 'READY'
            attempt.save(update_fields=['gateway_order_id', 'state'])
    except InventoryError:
        GatewayPayment.objects.filter(pk=attempt.pk).exclude(state__in=['CAPTURED','READY']).update(state='REVIEW')
        raise
    return payment_options(attempt)


def verified_entity(payment_id):
    if not isinstance(payment_id, str) or not re.fullmatch(r'pay_[A-Za-z0-9]+', payment_id):
        raise InventoryError('Invalid payment identifier.')
    return gateway_request('GET', 'payments/' + payment_id)


@transaction.atomic
def apply_capture(attempt_id, entity):
    attempt = GatewayPayment.objects.select_related('try_order').get(pk=attempt_id)
    order = lock_order(attempt.try_order.order_id)
    attempt.refresh_from_db()
    if not isinstance(entity, dict) or entity.get('amount_refunded', 0) != 0 or entity.get('order_id') != attempt.gateway_order_id or entity.get('amount') != attempt.amount_paise or entity.get('currency') != 'INR' or entity.get('status') != 'captured' or not re.fullmatch(r'pay_[A-Za-z0-9]+', str(entity.get('id', ''))):
        raise InventoryError('Payment is not captured for the expected order, amount and currency.')
    if attempt.state == 'CAPTURED':
        if attempt.payment_id != entity['id']:
            raise InventoryError('A different payment was already recorded. Contact support.')
        return order
    if attempt.purpose == 'trial':
        if order.status != 'AWAITING_TRIAL_PAYMENT' or order.try_fee * 100 != attempt.amount_paise:
            raise InventoryError('Trial payment requires reconciliation.')
        order.trial_fee_paid = True
        order.payment_status = 'PARTIAL_TRIAL_FEE'
        order.try_payment_status, order.try_payment_mode, order.status = 'paid', 'razorpay', 'TRY_REQUESTED'
        order.save()
        order_changed(order, 'trial_payment_captured')
    else:
        final = FinalOrder.objects.get(try_order=order)
        if final.bill_revision != attempt.revision or not approved(final) or final.final_payable * 100 != attempt.amount_paise or final.payment_mode != 'razorpay':
            raise InventoryError('Payment does not match the approved bill. Contact support.')
        complete_payment(order, final, 'razorpay')
    attempt.payment_id, attempt.state, attempt.captured_at = entity['id'], 'CAPTURED', timezone.now()
    attempt.save(update_fields=['payment_id', 'state', 'captured_at'])
    return order


def verify_checkout(account, data):
    gateway_order_id = data.get('razorpay_order_id')
    attempt = GatewayPayment.objects.select_related('try_order').filter(gateway_order_id=gateway_order_id).first() if isinstance(gateway_order_id, str) else None
    if not attempt or attempt.try_order.mobileno != account.pk:
        raise InventoryError('Payment not found.')
    payment_id, signature = data.get('razorpay_payment_id'), data.get('razorpay_signature')
    if not isinstance(payment_id, str) or not isinstance(signature, str) or not settings.RAZORPAY_KEY_SECRET:
        raise InventoryError('Invalid payment verification.')
    expected = hmac.new(settings.RAZORPAY_KEY_SECRET.encode(), (attempt.gateway_order_id + '|' + payment_id).encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, signature):
        raise InventoryError('Invalid payment signature.')
    entity = verified_entity(payment_id)
    if entity.get('id') != payment_id:
        raise InventoryError('Payment identifier mismatch.')
    return apply_capture(attempt.pk, entity)


def verify_webhook(raw, signature):
    secret = settings.RAZORPAY_WEBHOOK_SECRET
    if not secret or not isinstance(signature, str):
        return False
    expected = hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


def reconcile_payment(account, order_id, purpose, revision=0):
    if not isinstance(order_id, str) or purpose not in ('trial', 'final') or type(revision) is not int:
        raise InventoryError('Invalid payment details.')
    attempt = GatewayPayment.objects.select_related('try_order').filter(try_order__order_id=order_id,
        try_order__mobileno=account.pk, purpose=purpose, revision=revision if purpose == 'final' else 0).first()
    if not attempt or not attempt.gateway_order_id:
        raise InventoryError('No verifiable payment exists yet. Contact support if a payment setup is under review.')
    if attempt.state == 'CAPTURED':
        return attempt.try_order
    result = gateway_request('GET', 'orders/' + attempt.gateway_order_id + '/payments')
    for entity in result.get('items', []):
        if entity.get('status') == 'captured':
            return apply_capture(attempt.pk, entity)
    raise InventoryError('No captured payment found yet. Your order is still pending; no extra charge was made.')


def recover_payment(account, attempt_id, provider_order_id):
    """Admin-only caller: bind a lost setup response to its verified original order."""
    if type(attempt_id) is not int or not isinstance(provider_order_id, str) or not re.fullmatch(r'order_[A-Za-z0-9]+', provider_order_id):
        raise InventoryError('Select a payment and enter its Razorpay order ID.')
    attempt = GatewayPayment.objects.select_related('try_order').filter(pk=attempt_id).first()
    if not attempt:
        raise InventoryError('Payment not found.')
    entity = gateway_request('GET', 'orders/' + provider_order_id)
    notes = entity.get('notes')
    if entity.get('id') != provider_order_id or entity.get('amount') != attempt.amount_paise or entity.get('currency') != 'INR' or not isinstance(notes, dict) or str(notes.get('local_payment_id')) != str(attempt.pk) or (attempt.receipt_reference and entity.get('receipt') != attempt.receipt_reference):
        raise InventoryError('The provider order does not match this payment. Nothing was changed.')
    with transaction.atomic():
        order = lock_order(attempt.try_order.order_id)
        attempt.refresh_from_db()
        if attempt.gateway_order_id and attempt.gateway_order_id != provider_order_id:
            raise InventoryError('This attempt is already linked to a different provider order.')
        if attempt.state == 'CAPTURED':
            return {'order_id': order.order_id, 'state': 'CAPTURED'}
        if order.status == 'CANCELLED':
            raise InventoryError('A cancelled order requires manual financial reconciliation.')
        attempt.gateway_order_id = provider_order_id
        attempt.state = 'READY'
        attempt.recovered_by = str(account.pk)
        attempt.recovered_at = timezone.now()
        attempt.save(update_fields=['gateway_order_id','state','recovered_by','recovered_at'])
        order_changed(order, 'payment_recovered')
    # Never mark paid based on the admin-supplied ID or order status alone.
    return reconcile_attempt(attempt)


def reconcile_attempt(attempt):
    if not attempt.gateway_order_id:
        raise InventoryError('Find the original Razorpay order using the receipt/reference in the provider dashboard, then recover that order. Do not create another payment.')
    if attempt.state == 'CAPTURED':
        return {'order_id':attempt.try_order.order_id, 'state':'CAPTURED'}
    result = gateway_request('GET', 'orders/' + attempt.gateway_order_id + '/payments')
    for entity in result.get('items', []):
        if entity.get('status') == 'captured':
            apply_capture(attempt.pk, entity)
            return {'order_id':attempt.try_order.order_id, 'state':'CAPTURED'}
    return {'order_id':attempt.try_order.order_id, 'state':attempt.state,
        'message':'No captured payment found. Customer can continue the same payment; stock remains reserved because this provider order can still be paid.'}
