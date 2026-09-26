"""Inventory transitions. All writers lock the order before reading its items."""
from django.db import transaction
from django.db.models import F
from django.db.models import Q
from django.utils import timezone
from .models import TryOrder, TryOrderItem, TrialReturn, ProductDetails, DeliveryAssignment, FinalOrderItem, FinalOrder
from .security import owns_order


class InventoryError(ValueError):
    pass


def lock_order(order_id):
    if not isinstance(order_id, str) or not order_id:
        raise InventoryError('Order not found.')
    TryOrder.objects.filter(order_id=order_id).update(status=F('status'))
    order = TryOrder.objects.select_for_update().filter(order_id=order_id).first()
    if not order:
        raise InventoryError('Order not found.')
    return order


def release_item(item):
    if not item.stock_reserved or not item.product_details_id:
        raise InventoryError('This item needs stock reconciliation; no stock was released.')
    ProductDetails.objects.filter(pk=item.product_details_id).update(qty=F('qty') + item.qty)
    item.stock_reserved = False
    item.status = 'RETURNED'
    item.save(update_fields=['stock_reserved', 'status'])


def cancellation_blocker(order):
    from .models import GatewayPayment
    if order.status not in ('TRY_REQUESTED', 'ASSIGNED', 'AWAITING_TRIAL_PAYMENT') or order.dispatched_at:
        return 'Only trials that have not been dispatched can be cancelled.'
    if DeliveryAssignment.objects.filter(try_order=order).exclude(status='Assigned').exists() or FinalOrder.objects.filter(try_order=order).exists():
        return 'This trial has already progressed. Contact support.'
    if order.trial_fee_paid:
        return 'A collected trial fee needs support review before cancellation.'
    if GatewayPayment.objects.filter(try_order=order).exists():
        return 'An online payment may still complete. Ask support to reconcile it before cancelling.'
    return ''


def finish_cancellation(order, reason):
    for item in TryOrderItem.objects.filter(try_order=order):
        if item.stock_reserved:
            release_item(item)
    order.status = 'CANCELLED'
    order.cancelled_at = timezone.now()
    order.cancellation_reason = reason
    order.save(update_fields=['status', 'cancelled_at', 'cancellation_reason', 'updated_at'])
    assignments = DeliveryAssignment.objects.filter(try_order=order)
    batch_ids = list(assignments.exclude(batch=None).values_list('batch_id', flat=True))
    assignments.update(status='Cancelled')
    from .models import DeliveryBatch
    for batch_id in batch_ids:
        if not DeliveryAssignment.objects.filter(batch_id=batch_id).exclude(status__in=['Delivered','Cancelled']).exists():
            DeliveryBatch.objects.filter(pk=batch_id).update(status='Completed')
    from .order_events import order_changed
    order_changed(order, 'cancelled')
    return order


@transaction.atomic
def cancel_trial(role, account, order_id):
    order = lock_order(order_id)
    if not owns_order(role, account, order) or role not in ('customer', 'admin'):
        raise InventoryError('Order not found.')
    if order.status == 'CANCELLED':
        return order
    blocker = cancellation_blocker(order)
    if blocker:
        raise InventoryError(blocker)
    return finish_cancellation(order, 'customer' if role == 'customer' else 'admin')


@transaction.atomic
def expire_trial(order_id):
    order = lock_order(order_id)
    from .delivery_schedule import reservation_deadline
    if order.status not in ('AWAITING_TRIAL_PAYMENT', 'TRY_REQUESTED', 'ASSIGNED'):
        return False
    deadline = order.reservation_expires_at
    if not deadline and order.status != 'AWAITING_TRIAL_PAYMENT':
        deadline = reservation_deadline(order)
    if not deadline or deadline > timezone.now() or cancellation_blocker(order):
        return False
    finish_cancellation(order, 'payment_timeout' if order.status == 'AWAITING_TRIAL_PAYMENT' else 'delivery_window_expired')
    return True


def expire_pending_trials(mobile=None, limit=100):
    from django.db import OperationalError
    rows = TryOrder.objects.filter(status__in=['AWAITING_TRIAL_PAYMENT', 'TRY_REQUESTED', 'ASSIGNED'], gatewaypayment__isnull=True, trial_fee_paid=False, dispatched_at__isnull=True).filter(
        Q(reservation_expires_at__lte=timezone.now()) |
        Q(reservation_expires_at__isnull=True, scheduled_date__lte=timezone.localdate())
    )
    if mobile is not None:
        rows = rows.filter(mobileno=mobile)
    expired = 0
    for order_id in list(rows.order_by('reservation_expires_at').values_list('order_id', flat=True)[:limit]):
        try:
            expired += int(expire_trial(order_id))
        except (InventoryError, OperationalError):
            continue  # Never release a reservation that cannot be safely reconciled.
    return expired


@transaction.atomic
def collect_return(role, account, item_id, condition, tag_intact=None, scanned_tag=None):
    if type(item_id) is not int or condition not in ('Good', 'Damaged') or (tag_intact is not None and type(tag_intact) is not bool):
        raise InventoryError('Select a trial item and its condition.')
    item = TryOrderItem.objects.select_related('try_order').filter(pk=item_id).first()
    if not item:
        raise InventoryError('Item not found.')
    order = lock_order(item.try_order.order_id)
    if role not in ('admin', 'rider') or not owns_order(role, account, order):
        raise InventoryError('Item not found.')
    item.refresh_from_db()
    existing = TrialReturn.objects.filter(item=item).first()
    if existing:
        return existing
    if order.status == 'CANCELLED' or not item.stock_reserved or item.status == 'PURCHASED':
        raise InventoryError('This item has no active trial reservation. Finalized purchases are non-refundable.')
    final = FinalOrder.objects.filter(try_order=order).first()
    if not final:
        raise InventoryError('Save the customer selection before recording returned items.')
    from .settlement import approved
    if not approved(final):
        raise InventoryError('Customer approval of the current selection is required before collecting returns.')
    if FinalOrderItem.objects.filter(try_order_item=item).exists():
        raise InventoryError('This item is selected for purchase. Update the selection first.')

    # Barcode / Security Tag Verification
    tag_verified = False
    clean_scanned = (str(scanned_tag).strip().upper() if scanned_tag else '')
    expected_tag = (item.security_tag or '').strip().upper()

    if not expected_tag:
        raise InventoryError('This item has no security barcode. Ask an admin to reconcile it before collection.')
    if not clean_scanned:
        raise InventoryError('Scan the item security barcode before recording collection.')
    if clean_scanned != expected_tag:
        raise InventoryError(f'Scanned barcode "{clean_scanned}" does not match dispatched item security tag "{expected_tag}".')
    tag_verified = True
    tag_intact = True

    result = TrialReturn.objects.create(
        item=item,
        condition=condition,
        tag_intact=bool(tag_intact),
        tag_verified=tag_verified,
        scanned_tag=clean_scanned,
        recorded_by=f'{role}:{account.pk}'
    )
    item.status = 'RETURNED'
    item.save(update_fields=['status'])
    from .order_events import order_changed
    order_changed(order, 'return_collected')
    return result



@transaction.atomic
def review_return(account, return_id, action):
    if type(return_id) is not int or action not in ('receive', 'steam_press', 'approve', 'reject'):
        raise InventoryError('Invalid return action.')
    result = TrialReturn.objects.select_related('item__try_order').filter(pk=return_id).first()
    if not result:
        raise InventoryError('Return not found.')
    lock_order(result.item.try_order.order_id)
    result.refresh_from_db()
    if action == 'steam_press':
        if result.status != 'Received' or result.condition != 'Good' or not result.tag_intact or not result.tag_verified:
            raise InventoryError('Only received, undamaged items with verified tags can enter steam-press.')
        if not result.steam_pressed_at:
            result.steam_pressed_at, result.steam_pressed_by = timezone.now(), str(account.pk)
            result.save(update_fields=['steam_pressed_at', 'steam_pressed_by'])
        return result
    target = {'receive': 'Received', 'approve': 'Approved', 'reject': 'Rejected'}[action]
    if result.status == target:
        return result
    if action == 'receive':
        if result.status != 'Collected':
            raise InventoryError('This return cannot be received again.')
        result.received_at, result.received_by = timezone.now(), str(account.pk)
    else:
        if result.status != 'Received':
            raise InventoryError('Confirm warehouse receipt before hygiene review.')
        if action == 'approve':
            if result.condition != 'Good' or not result.tag_intact or not result.tag_verified or not result.steam_pressed_at:
                raise InventoryError('Restocking requires a verified tag, good condition and recorded steam-press completion.')
            item = TryOrderItem.objects.get(pk=result.item_id)
            if FinalOrderItem.objects.filter(try_order_item=item).exists():
                raise InventoryError('A selected purchase cannot be restocked.')
            release_item(item)
        result.reviewed_at, result.reviewed_by = timezone.now(), str(account.pk)
    result.status = target
    result.save()
    return result
