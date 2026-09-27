from datetime import datetime, timedelta
from unittest.mock import patch
from django.test import TestCase
from django.utils import timezone
from . import test_checkout as fixtures
from .checkout import create_trial, CheckoutError
from .inventory_workflow import expire_trial, expire_pending_trials
from .models import GatewayPayment

class DeliveryDeadlineTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        fixtures.CheckoutTests.setUpTestData.__func__(cls)

    def payload(self, **changes):
        data = {'address_id': self.address.pk, 'items': [{'product_details_id': self.variant.pk, 'size': 'M', 'qty': 1}]}
        data.update(changes)
        return data

    def test_elapsed_slot_rejected_without_reserving_stock(self):
        now = timezone.make_aware(datetime(2026, 9, 26, 14))
        with patch('django.utils.timezone.now', return_value=now):
            with self.assertRaisesRegex(CheckoutError, 'slot has ended'):
                create_trial(self.user, self.payload(delivery_date='2026-09-26', delivery_slot='10:00 AM - 02:00 PM'))
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.qty, 1)

    def test_future_booking_keeps_stock_until_deadline_then_releases_once(self):
        order = create_trial(self.user, self.payload(delivery_date=(timezone.localdate() + timedelta(days=1)).isoformat()))
        self.assertFalse(expire_trial(order.order_id))
        with patch('django.utils.timezone.now', return_value=order.reservation_expires_at + timedelta(seconds=1)):
            self.assertEqual(expire_pending_trials(), 1)
            self.assertEqual(expire_pending_trials(), 0)
        self.variant.refresh_from_db()
        order.refresh_from_db()
        self.assertEqual(self.variant.qty, 1)
        self.assertEqual(order.cancellation_reason, 'delivery_window_expired')

    def test_dispatched_or_payment_uncertain_booking_is_never_auto_released(self):
        order = create_trial(self.user, self.payload())
        order.dispatched_at = timezone.now()
        order.save()
        with patch('django.utils.timezone.now', return_value=order.reservation_expires_at + timedelta(seconds=1)):
            self.assertFalse(expire_trial(order.order_id))
            order.dispatched_at = None
            order.save()
            GatewayPayment.objects.create(try_order=order, purpose='trial', revision=0, amount_paise=4900, receipt_reference='test-deadline')
            self.assertFalse(expire_trial(order.order_id))
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.qty, 0)

    def test_legacy_deadline_is_derived_without_expiring_future_booking(self):
        order = create_trial(self.user, self.payload(delivery_date=(timezone.localdate() + timedelta(days=1)).isoformat()))
        deadline = order.reservation_expires_at
        order.reservation_expires_at = None
        order.save()
        self.assertEqual(expire_pending_trials(), 0)
        with patch('django.utils.timezone.now', return_value=deadline + timedelta(seconds=1)):
            self.assertEqual(expire_pending_trials(), 1)
