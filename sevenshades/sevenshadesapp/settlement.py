"""Versioned bills: only the customer may approve; the rider may collect cash."""
from django.db import transaction
from django.utils import timezone
from sevenshadesapp.models import FinalOrder, FinalOrderItem, TryOrderItem, DeliveryAssignment, GatewayPayment
from sevenshadesapp.inventory_workflow import lock_order, InventoryError
from sevenshadesapp.security import owns_order
from sevenshadesapp.order_events import order_changed


def approved(final):
    return bool(final.approved_at and final.approved_by == final.try_order.mobileno and final.approved_revision == final.bill_revision)


@transaction.atomic
def generate_bill(role, account, order_id, selected):
    order = lock_order(order_id)
    if role not in ('admin', 'rider') or not owns_order(role, account, order):
        raise InventoryError('Order not found.')
    if order.status not in ('TRIAL_COMPLETED', 'AWAITING_SELECTION_APPROVAL', 'SELECTION_SUBMITTED', 'PAYMENT_PENDING'):
        raise InventoryError('Mark the trial completed before sending the selection.')
    if not isinstance(selected, list) or len(selected) > 4:
        raise InventoryError('Invalid selected items.')
    current = FinalOrder.objects.filter(try_order=order).first()
    if current and current.payment_status == 'paid':
        raise InventoryError('A paid bill cannot be changed.')
    items, seen = [], set()
    for entry in selected:
        if not isinstance(entry, dict) or type(entry.get('try_order_item_id')) is not int or type(entry.get('qty')) is not int:
            raise InventoryError('Invalid selected item or quantity.')
        item = TryOrderItem.objects.filter(pk=entry['try_order_item_id'], try_order=order).first()
        if not item or item.pk in seen or entry['qty'] != item.qty or hasattr(item, 'trial_return'):
            raise InventoryError('Invalid selected item or quantity; returned items cannot be purchased.')
        seen.add(item.pk)
        items.append(item)
    if current:
        before = set(current.finalorderitem_set.values_list('try_order_item_id', flat=True))
        if before == seen:
            return current  # Repeated Generate Bill preserves revision and approval.
        current.bill_revision += 1
        current.approved_revision, current.approved_by, current.approved_at = 0, '', None
    else:
        current = FinalOrder(try_order=order, order_id='FIN-' + order.order_id)
    current.items_total = sum(item.line_total for item in items)
    if items:
        # Items purchased: delivery charge is waived (effectively free)
        current.wallet_credit = 0
        current.final_payable = current.items_total
    else:
        # Zero items purchased: delivery charge is collected in cash at doorstep
        current.wallet_credit = 0
        current.final_payable = order.try_fee
    current.selected_items_count = len(items)
    current.payment_status, current.payment_mode, current.status = 'pending', '', 'awaiting_customer_approval'
    current.save()
    current.finalorderitem_set.all().delete()
    for item in items:
        FinalOrderItem.objects.create(final_order=current, try_order_item=item, product_name=item.product_name,
            brand_name=item.brand_name, size=item.size, color=item.color, qty=item.qty, unit_price=item.unit_price, line_total=item.line_total)
    order.status = 'AWAITING_SELECTION_APPROVAL'
    order.save(update_fields=['status', 'updated_at'])
    order_changed(order, 'bill_generated')
    return current


@transaction.atomic
def approve_bill(account, order_id, revision, mode):
    order = lock_order(order_id)
    if order.mobileno != account.pk:
        raise InventoryError('Order not found.')
    final = FinalOrder.objects.filter(try_order=order).first()
    if not final or type(revision) is not int or revision != final.bill_revision:
        raise InventoryError('The bill has changed. Refresh and review the latest bill.')
    if final.payment_status == 'paid':
        return final
    if order.status not in ('AWAITING_SELECTION_APPROVAL', 'SELECTION_SUBMITTED', 'PAYMENT_PENDING') or mode not in (None, 'cash'):
        raise InventoryError('This bill cannot be approved with those payment details.')
    if mode is None and approved(final):
        return final
    final.approved_revision, final.approved_by, final.approved_at = revision, account.pk, timezone.now()
    final.payment_mode = mode or ''
    final.status = 'approved_awaiting_payment'
    final.save()
    if final.final_payable == 0:
        complete_payment(order, final, 'no_charge')
    else:
        order.status = 'SELECTION_SUBMITTED'
        order.save(update_fields=['status', 'updated_at'])
    order_changed(order, 'bill_approved')
    return final


def complete_payment(order, final, mode):
    final.payment_status = 'paid'
    final.paid_at = timezone.now()
    final.payment_mode = mode
    final.status = 'completed' if final.selected_items_count else 'no_purchase'
    final.save()
    ids = final.finalorderitem_set.values_list('try_order_item_id', flat=True)
    TryOrderItem.objects.filter(try_order=order, pk__in=ids).update(status='PURCHASED', stock_reserved=False)
    order.status = 'SELECTION_SUBMITTED'
    order.payment_status = 'COMPLETED'
    order.save(update_fields=['status', 'payment_status', 'updated_at'])
    order_changed(order, 'payment_captured')


@transaction.atomic
def confirm_cash(role, account, order_id, revision):
    order = lock_order(order_id)
    if role not in ('admin', 'rider') or not owns_order(role, account, order):
        raise InventoryError('Order not found.')
    final = FinalOrder.objects.filter(try_order=order).first()
    if not final or type(revision) is not int or revision != final.bill_revision or not approved(final):
        raise InventoryError('Customer approval of the current bill is required before collection.')
    if final.payment_status == 'paid':
        return final
    if final.payment_mode != 'cash' or GatewayPayment.objects.filter(try_order=order, purpose='final', revision=revision).exists():
        raise InventoryError('This bill requires verified online payment; it cannot be marked paid manually.')
    final.cash_collected_by = f'{role}:{account.pk}'
    complete_payment(order, final, 'cash')
    return final
