"""Publish invalidations only after the business transaction has committed."""
import logging
from functools import partial
from django.db import transaction
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync


def order_changed(order, reason):
    payload = {'order_id': order.order_id, 'status': order.status, 'reason': reason}
    groups = [f'order_{order.order_id}', f'account_customer_{order.mobileno}', 'account_admin']
    if order.assigned_rider_id:
        groups.append(f'account_rider_{order.assigned_rider_id}')
    transaction.on_commit(partial(publish, groups, payload))


def publish(groups, payload):
    try:
        layer = get_channel_layer()
        for group in groups:
            async_to_sync(layer.group_send)(group, {'type': 'order_status_updated', 'data': payload})
    except Exception:
        logging.getLogger(__name__).exception('Order notification failed; clients can refresh authoritative state.')
