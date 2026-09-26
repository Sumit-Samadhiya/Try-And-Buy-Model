"""Delivery deadlines in the business timezone, shared by checkout and recovery."""
from datetime import datetime, time, timedelta
from django.utils import timezone

SLOT_ENDS = {'10:00 AM - 02:00 PM': 14, '02:00 PM - 06:00 PM': 18, '06:00 PM - 09:00 PM': 21}

def slot_end(day, slot):
    return timezone.make_aware(datetime.combine(day, time(SLOT_ENDS[slot])), timezone.get_current_timezone())

def reservation_deadline(order):
    if order.delivery_mode == 'emergency_sos':
        return order.created_at + timedelta(hours=3)
    if order.scheduled_date and order.delivery_slot in SLOT_ENDS:
        return slot_end(order.scheduled_date, order.delivery_slot) + timedelta(hours=1)
    return None  # Unknown legacy schedules require manual review.
