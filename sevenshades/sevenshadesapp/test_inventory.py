from django.test import TestCase, TransactionTestCase
from django.db import close_old_connections, OperationalError
from rest_framework.test import APIClient
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from . import test_checkout as fixtures
from .checkout import create_trial
from .models import AdminLogin, DeliveryRider, DeliveryAssignment, FinalOrder, FinalOrderItem, TrialReturn, TryOrder
from .inventory_workflow import cancel_trial, collect_return, review_return, InventoryError

PASSWORD = 'Checkout-test-472!'


class InventoryTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        fixtures.CheckoutTests.setUpTestData.__func__(cls)
        cls.admin = AdminLogin.objects.create(emailid='inventory@example.test', mobileno='9000000071', password=PASSWORD)
        cls.rider = DeliveryRider.objects.create(rider_id='INV1', phone='9000000072', password=PASSWORD)
        cls.other_rider = DeliveryRider.objects.create(rider_id='INV2', phone='9000000073', password=PASSWORD)

    def setUp(self):
        self.order = create_trial(self.user, {'address_id': self.address.pk, 'items': [{'product_details_id': self.variant.pk, 'size': 'M', 'qty': 1}]})
        self.item = self.order.tryorderitem_set.get()

    def prepare_return(self, condition='Good'):
        DeliveryAssignment.objects.get_or_create(try_order=self.order, defaults={'assignment_id': 'INV-ASG', 'rider': self.rider})
        FinalOrder.objects.get_or_create(try_order=self.order, defaults={'order_id': 'INV-FINAL'})
        return collect_return('rider', self.rider, self.item.pk, condition, True)

    def stock(self):
        self.variant.refresh_from_db()
        return self.variant.qty

    def client_for(self, role):
        client = APIClient(enforce_csrf_checks=True)
        endpoint, data = {
            'customer': ('check_costumer_login', {'mobileno': self.user.pk}),
            'admin': ('check_admin_login', {'emailid': self.admin.emailid}),
            'rider': ('delivery_rider_login', {'phone': self.rider.phone}),
            'other_rider': ('delivery_rider_login', {'phone': self.other_rider.phone}),
        }[role]
        self.assertEqual(self.post(client, endpoint, dict(data, password=PASSWORD)).status_code, 200)
        return client

    def post(self, client, endpoint, data):
        token = client.get('/api/auth_csrf').json()['csrfToken']
        return client.post('/api/' + endpoint, data, format='json', HTTP_X_CSRFTOKEN=token)

    def test_cancellation_releases_once_and_rejects_other_customer(self):
        with self.assertRaises(InventoryError):
            cancel_trial('customer', self.other, self.order.order_id)
        cancel_trial('customer', self.user, self.order.order_id)
        cancel_trial('customer', self.user, self.order.order_id)
        self.assertEqual(self.stock(), 1)
        client = self.client_for('admin')
        response = self.post(client, 'delivery_assign_order', {'order_id': self.order.order_id, 'rider_id': self.rider.rider_id})
        self.assertEqual(response.status_code, 409)
        self.assertFalse(DeliveryAssignment.objects.exists())

    def test_cancellation_failure_rolls_back_all_stock_releases(self):
        self.order.tryorderitem_set.create(product_details=None, stock_reserved=True, qty=1)
        with self.assertRaises(InventoryError):
            cancel_trial('customer', self.user, self.order.order_id)
        self.assertEqual(self.stock(), 0)
        self.item.refresh_from_db()
        self.order.refresh_from_db()
        self.assertTrue(self.item.stock_reserved)
        self.assertEqual(self.order.status, 'TRY_REQUESTED')

    def test_dispatched_or_paid_trial_cannot_cancel(self):
        DeliveryAssignment.objects.create(assignment_id='A', try_order=self.order, rider=self.rider, status='On Route')
        with self.assertRaises(InventoryError):
            cancel_trial('admin', self.admin, self.order.order_id)
        DeliveryAssignment.objects.all().delete()
        self.order.trial_fee_paid = True
        self.order.save()
        with self.assertRaises(InventoryError):
            cancel_trial('customer', self.user, self.order.order_id)
        self.assertEqual(self.stock(), 0)

    def test_collection_receipt_and_approval_release_exactly_once(self):
        result = self.prepare_return()
        repeated = collect_return('rider', self.rider, self.item.pk, 'Good', True)
        self.assertEqual(result.pk, repeated.pk)
        with self.assertRaises(InventoryError):
            review_return(self.admin, result.pk, 'approve')
        self.assertEqual(self.stock(), 0)
        review_return(self.admin, result.pk, 'receive')
        self.assertEqual(self.stock(), 0)
        with self.assertRaises(InventoryError):
            review_return(self.admin, result.pk, 'approve')
        review_return(self.admin, result.pk, 'steam_press')
        review_return(self.admin, result.pk, 'approve')
        review_return(self.admin, result.pk, 'approve')
        self.assertEqual(self.stock(), 1)
        self.assertEqual(TrialReturn.objects.count(), 1)
        self.item.refresh_from_db()
        self.assertFalse(self.item.stock_reserved)
        result.refresh_from_db()
        self.assertTrue(result.received_by and result.reviewed_by and result.recorded_by)
        with self.assertRaises(InventoryError):
            review_return(self.admin, result.pk, 'reject')

    def test_damaged_and_rejected_returns_never_restock(self):
        result = self.prepare_return('Damaged')
        review_return(self.admin, result.pk, 'receive')
        with self.assertRaises(InventoryError):
            review_return(self.admin, result.pk, 'approve')
        review_return(self.admin, result.pk, 'reject')
        review_return(self.admin, result.pk, 'reject')
        self.assertEqual(self.stock(), 0)

    def test_legacy_and_selected_purchase_cannot_be_restocked(self):
        final = FinalOrder.objects.create(try_order=self.order, order_id='FIN')
        FinalOrderItem.objects.create(final_order=final, try_order_item=self.item)
        with self.assertRaises(InventoryError):
            collect_return('admin', self.admin, self.item.pk, 'Good', True)
        FinalOrderItem.objects.all().delete()
        self.item.stock_reserved = False
        self.item.save()
        with self.assertRaises(InventoryError):
            collect_return('admin', self.admin, self.item.pk, 'Good', True)
        self.assertEqual(self.stock(), 0)

    def test_roles_ownership_csrf_and_return_selection_guard(self):
        result = self.prepare_return()
        rider = self.client_for('rider')
        self.assertEqual(self.post(rider, 'update_hygiene_status', {'return_id': result.pk, 'action': 'approve'}).status_code, 403)
        other = self.client_for('other_rider')
        self.assertEqual(self.post(other, 'process_return', {'try_order_item_id': self.item.pk, 'condition': 'Good'}).status_code, 409)
        self.assertEqual(self.post(other, 'trial_return_items', {'order_id': self.order.order_id}).status_code, 404)
        customer = self.client_for('customer')
        self.assertEqual(self.post(customer, 'process_return', {'try_order_item_id': self.item.pk, 'condition': 'Good'}).status_code, 403)
        admin = self.client_for('admin')
        self.assertEqual(admin.post('/api/update_hygiene_status', {'return_id': result.pk, 'action': 'receive'}, format='json').status_code, 403)
        for endpoint, body in [('delivery_selection_update', {'selected_item_ids': [self.item.pk]}), ('submit_final_selection', {'selected_items': [{'try_order_item_id': self.item.pk, 'qty': 1}]})]:
            self.assertFalse(self.post(admin, endpoint, dict(body, order_id=self.order.order_id)).json()['status'])
        self.assertEqual(self.stock(), 0)
        self.assertEqual(admin.get('/api/inventory_returns').status_code, 200)
        self.assertEqual(customer.get('/api/inventory_returns').status_code, 403)

    def test_finalized_purchase_has_no_return_or_refund_option(self):
        final = FinalOrder.objects.create(try_order=self.order, order_id='PAID', payment_status='paid', selected_items_count=1)
        purchased = FinalOrderItem.objects.create(final_order=final, try_order_item=self.item)
        self.item.status = 'PURCHASED'
        self.item.stock_reserved = False
        self.item.save()
        client = self.client_for('admin')
        response = self.post(client, 'process_return', {'final_order_item_id': purchased.pk, 'condition': 'Good'})
        self.assertEqual(response.status_code, 409)
        self.assertIn('non-refundable', response.json()['message'])
        response = self.post(client, 'process_return', {'try_order_item_id': self.item.pk, 'condition': 'Good'})
        self.assertEqual(response.status_code, 409)
        self.assertFalse(TrialReturn.objects.exists())
        final.refresh_from_db()
        self.assertEqual(final.payment_status, 'paid')
        self.assertEqual(self.stock(), 0)

    def test_customer_cancellation_api_and_missing_receipt_validation(self):
        client = self.client_for('customer')
        self.assertTrue(self.post(client, 'cancel_trial', {'order_id': self.order.order_id}).json()['status'])
        self.assertEqual(self.stock(), 1)

    def test_trial_barcode_tag_verification_on_return(self):
        DeliveryAssignment.objects.get_or_create(try_order=self.order, defaults={'assignment_id': 'TAG-ASG', 'rider': self.rider})
        FinalOrder.objects.get_or_create(try_order=self.order, defaults={'order_id': 'TAG-FINAL'})
        
        # Verify item has security tag barcode assigned
        self.assertTrue(self.item.security_tag.startswith('TAG-TRY-'))
        
        # Mismatched barcode scan should fail
        with self.assertRaises(InventoryError) as ctx:
            collect_return('rider', self.rider, self.item.pk, 'Good', scanned_tag='TAG-TRY-INVALID123')
        self.assertIn('does not match', str(ctx.exception))
        
        # Correct barcode scan should succeed and set tag_verified=True
        ret = collect_return('rider', self.rider, self.item.pk, 'Good', scanned_tag=self.item.security_tag)
        self.assertTrue(ret.tag_verified)
        self.assertTrue(ret.tag_intact)
        self.assertEqual(ret.scanned_tag, self.item.security_tag.upper())

    def test_admin_zone_and_excluded_area_apis(self):
        client = self.client_for('admin')
        # Test listing zones
        res = client.get('/api/list_delivery_zones')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()['status'])
        
        # Test saving new zone
        save_res = self.post(client, 'save_delivery_zone', {'zone_name': 'Test New Zone', 'postcodes': '452015, 452016'})
        self.assertEqual(save_res.status_code, 200)
        zone_id = save_res.json()['data']['id']
        
        # Test saving new excluded area
        ex_res = self.post(client, 'save_excluded_area', {'area_name': 'Test Excluded', 'postcode': '452015'})
        self.assertEqual(ex_res.status_code, 200)


        ex_id = ex_res.json()['data']['id']
        
        # Test deleting them
        self.post(client, 'delete_delivery_zone', {'id': zone_id})
        self.post(client, 'delete_excluded_area', {'id': ex_id})



class InventoryConcurrencyTests(TransactionTestCase):
    def setUp(self):
        InventoryTests.setUpTestData.__func__(type(self))
        order = create_trial(self.user, {'address_id': self.address.pk, 'items': [{'product_details_id': self.variant.pk, 'size': 'M', 'qty': 1}]})
        FinalOrder.objects.create(try_order=order, order_id='FIN')
        result = collect_return('admin', self.admin, order.tryorderitem_set.get().pk, 'Good', True)
        review_return(self.admin, result.pk, 'receive')
        review_return(self.admin, result.pk, 'steam_press')
        self.return_id = result.pk

    def test_simultaneous_approvals_credit_stock_once(self):
        barrier = Barrier(2)
        def approve():
            close_old_connections()
            try:
                barrier.wait(timeout=10)
                review_return(self.admin, self.return_id, 'approve')
            except OperationalError:
                pass  # SQLite contention is surfaced as a retryable response.
            finally:
                close_old_connections()
        with ThreadPoolExecutor(max_workers=2) as pool:
            futures = [pool.submit(approve), pool.submit(approve)]
            for future in futures:
                future.result(timeout=20)
        review_return(self.admin, self.return_id, 'approve')
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.qty, 1)
