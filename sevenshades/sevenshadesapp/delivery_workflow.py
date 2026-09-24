"""Assignment, forward-only delivery progress and real batch membership."""
import uuid
from collections import defaultdict
from django.db import transaction
from django.db.models import F
from django.utils import timezone
from .models import DeliveryRider, DeliveryAssignment, DeliveryBatch, TryOrder, TryOrderItem, FinalOrder, DeliveryZone

from .inventory_workflow import lock_order, InventoryError
from .security import owns_order
from .order_events import order_changed
from .settlement import approved
from .receipts import issue_receipt

STATUSES = ('Assigned', 'On Route', 'Trial In Progress', 'Trial Completed', 'Delivered')


def active_rider(rider_id):
    if not isinstance(rider_id, str):
        raise InventoryError('Choose an active rider.')
    DeliveryRider.objects.filter(rider_id=rider_id).update(status=F('status'))
    rider = DeliveryRider.objects.select_for_update().filter(rider_id=rider_id, status='Active').first()
    if not rider:
        raise InventoryError('Choose an active rider.')
    return rider


def attach(order, rider, batch=None):
    if order.status not in ('TRY_REQUESTED', 'ASSIGNED') or FinalOrder.objects.filter(try_order=order).exists():
        raise InventoryError('Only pending orders can be assigned.')
    assignment = DeliveryAssignment.objects.filter(try_order=order).first()
    if assignment:
        if assignment.rider_id == rider.pk and (batch is None or assignment.batch_id == batch.pk):
            return assignment
        raise InventoryError('This order is already assigned. Reassignment requires a separate handover.')
    assignment = DeliveryAssignment.objects.create(assignment_id='ASG-' + uuid.uuid4().hex[:20].upper(),
        try_order=order, rider=rider, batch=batch, status='Assigned')
    order.assigned_rider = rider
    order.status = 'ASSIGNED'
    order.save(update_fields=['assigned_rider', 'status', 'updated_at'])
    order_changed(order, 'assigned')
    return assignment


@transaction.atomic
def assign_order(order_id, rider_id, status='Assigned'):
    if status != 'Assigned':
        raise InventoryError('A new assignment must start as Assigned.')
    rider = active_rider(rider_id)
    order = lock_order(order_id)
    return attach(order, rider)


@transaction.atomic
def reassign_order(order_id, new_rider_id):
    new_rider = active_rider(new_rider_id)
    order = lock_order(order_id)
    if order.status in ('DELIVERED', 'NO_PURCHASE', 'CANCELLED'):
        raise InventoryError('Completed or cancelled orders cannot be reassigned.')
    assignment = DeliveryAssignment.objects.select_for_update().filter(try_order=order).first()
    if not assignment:
        return attach(order, new_rider)
    if assignment.status == 'Delivered':
        raise InventoryError('Delivered orders cannot be reassigned.')
    assignment.rider = new_rider
    assignment.batch = None
    assignment.save(update_fields=['rider', 'batch', 'updated_at'])
    order.assigned_rider = new_rider
    order.save(update_fields=['assigned_rider', 'updated_at'])
    order_changed(order, 'reassigned')
    return assignment


@transaction.atomic
def advance_assignment(role, account, assignment_id, status):
    if status not in STATUSES:
        raise InventoryError('Invalid delivery status.')
    assignment = DeliveryAssignment.objects.select_related('try_order').filter(assignment_id=assignment_id).first()
    if not assignment:
        raise InventoryError('Assignment not found.')
    order = lock_order(assignment.try_order.order_id)
    assignment.refresh_from_db()
    if role not in ('admin', 'rider') or not owns_order(role, account, order):
        raise InventoryError('Assignment not found.')
    if order.status == 'CANCELLED':
        raise InventoryError('Cancelled orders cannot progress.')
    if assignment.status == status:
        return assignment
    if assignment.status not in STATUSES or STATUSES.index(status) != STATUSES.index(assignment.status) + 1:
        raise InventoryError('Advance one delivery step at a time; completed steps cannot be reversed.')
    final = FinalOrder.objects.filter(try_order=order).first()
    if status == 'Delivered':
        if not final or not approved(final) or final.payment_status != 'paid':
            raise InventoryError('Save the final selection and collect payment before completing delivery.')
        if TryOrderItem.objects.filter(try_order=order, stock_reserved=True, trial_return__isnull=True).exclude(finalorderitem__final_order=final).exists():
            raise InventoryError('Record collection of unpurchased trial items before completing delivery.')
        assignment.trial_end_time = assignment.trial_end_time or timezone.now()
        order.status = 'DELIVERED' if final.selected_items_count else 'NO_PURCHASE'
    elif status == 'Trial Completed':
        assignment.trial_end_time = assignment.trial_end_time or timezone.now()
        if not final:
            order.status = 'TRIAL_COMPLETED'
        if assignment.trial_start_time and (assignment.trial_end_time - assignment.trial_start_time).total_seconds() > 900:
            order_changed(order, 'trial_overdue')
    elif status == 'Trial In Progress':
        if final:
            raise InventoryError('Selection already exists. Finish the current order instead of restarting the trial.')
        assignment.trial_start_time = assignment.trial_start_time or timezone.now()
        order.status = 'TRIAL_IN_PROGRESS'
    else:
        if final:
            raise InventoryError('An order with a final selection cannot be dispatched again.')
        order.status = 'OUT_FOR_TRIAL'
        order.dispatched_at = order.dispatched_at or timezone.now()
    assignment.status = status
    assignment.save()
    order.save(update_fields=['status', 'dispatched_at', 'updated_at'])
    if status == 'Delivered':
        issue_receipt(order, final)
    order_changed(order, 'delivery_status')
    if assignment.batch_id:
        batch = DeliveryBatch.objects.select_for_update().get(pk=assignment.batch_id)
        batch.status = 'Completed' if not DeliveryAssignment.objects.filter(batch=batch).exclude(status__in=['Delivered','Cancelled']).exists() else 'In Progress'
        batch.save(update_fields=['status'])
    return assignment


@transaction.atomic
def generate_batches(rider_id):
    rider = active_rider(rider_id)
    MAX_BATCH_ORDERS = 5

    # Check rider zone restriction if specified
    allowed_postcodes = None
    rider_zone_name = (rider.zone or '').strip()
    if rider_zone_name and rider_zone_name.lower() != 'all':
        zone = DeliveryZone.objects.filter(zone_name__iexact=rider_zone_name).first()
        if zone and zone.postcodes:
            allowed_postcodes = {p.strip() for p in zone.postcodes.split(',') if p.strip()}

    # Lock candidates in consistent order; recheck after waiting for another writer.
    candidates = list(TryOrder.objects.filter(delivery_mode='standard', status='TRY_REQUESTED', deliveryassignment__isnull=True).order_by('pk').values_list('order_id', flat=True))
    groups = defaultdict(list)
    for order_id in candidates:
        order = lock_order(order_id)
        if order.status != 'TRY_REQUESTED' or DeliveryAssignment.objects.filter(try_order=order).exists():
            continue
        if FinalOrder.objects.filter(try_order=order).exists():
            continue

        # Zone eligibility constraint
        if allowed_postcodes is not None:
            postcode = (order.postcode or '').strip()
            city = (order.city or '').strip().lower()
            if postcode not in allowed_postcodes and city != rider_zone_name.lower():
                continue
        elif rider_zone_name and rider_zone_name.lower() != 'all':
            city = (order.city or '').strip().lower()
            if city != rider_zone_name.lower():
                continue

        scheduled = order.scheduled_date or timezone.localdate(order.created_at)
        groups[(order.postcode, order.delivery_slot, scheduled)].append(order)

    result = []
    for orders in groups.values():
        # Enforce rider capacity: partition orders into batches of at most MAX_BATCH_ORDERS
        for i in range(0, len(orders), MAX_BATCH_ORDERS):
            chunk = orders[i:i + MAX_BATCH_ORDERS]
            batch = DeliveryBatch.objects.create(batch_id='BAT-' + uuid.uuid4().hex[:20].upper(), rider=rider, status='Pending')
            for order in chunk:
                attach(order, rider, batch)
            result.append(batch)
    return result

