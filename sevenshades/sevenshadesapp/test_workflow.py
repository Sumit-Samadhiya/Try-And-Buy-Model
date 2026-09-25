import hashlib
import hmac
import json
from unittest.mock import patch
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient
from sevenshadesapp.models import (AdminLogin, DeliveryRider, ProductDetails, TryOrder, FinalOrder, GatewayPayment, OrderReceipt, TrialReturn)
import sevenshadesapp.test_checkout

PASSWORD = 'Checkout-test-472!'


class DoorstepWorkflowTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        sevenshadesapp.test_checkout.CheckoutTests.setUpTestData.__func__(cls)
        cls.admin = AdminLogin.objects.create(emailid='flow-admin@example.test', mobileno='9000000051', password=PASSWORD)
        cls.rider = DeliveryRider.objects.create(rider_id='FLOW', phone='9000000052', password=PASSWORD, name='Nearest', zone='Delhi')
        cls.far = DeliveryRider.objects.create(rider_id='FAR', phone='9000000053', password=PASSWORD, name='Far', zone='Delhi')
        cls.empty.qty = 1
        cls.empty.save()
        common = {field: getattr(cls.variant, field) for field in ('maincategoryid', 'subcategoryid', 'brandid', 'productid', 'price', 'offerprice', 'color')}
        cls.variants = [cls.variant, cls.empty, ProductDetails.objects.create(**common, size='S', qty=1), ProductDetails.objects.create(**common, size='L', qty=1)]

    def setUp(self):
        from django.core.cache import cache
        cache.clear()
        self.customer = self.login('customer')
        self.admin_client = self.login('admin')
        self.rider_client = self.login('rider')
        self.other_client = self.login('customer', self.other)

    def tearDown(self):
        from django.core.cache import cache
        cache.clear()

    def post(self, client, endpoint, data):
        token = client.get('/api/auth_csrf').json()['csrfToken']
        return client.post('/api/' + endpoint, data, format='json', HTTP_X_CSRFTOKEN=token)

    def login(self, role, account=None):
        client = APIClient(enforce_csrf_checks=True)
        account = account or {'customer': self.user, 'admin': self.admin, 'rider': self.rider}[role]
        endpoint, data = {'customer': ('check_costumer_login', {'mobileno': getattr(account, 'mobileno', '')}),
            'admin': ('check_admin_login', {'emailid': getattr(account, 'emailid', '')}),
            'rider': ('delivery_rider_login', {'phone': getattr(account, 'phone', '')})}[role]
        self.assertTrue(self.post(client, endpoint, dict(data, password=PASSWORD)).json()['status'])
        return client

    def place(self, mode='standard'):
        response = self.post(self.customer, 'try_order_create', {'address_id': self.address.pk, 'delivery_mode': mode,
            'items': [{'product_details_id': item.pk, 'size': item.size, 'qty': 1} for item in self.variants]})
        self.assertTrue(response.json()['status'], response.content)
        self.order_id = response.json()['data']['order_id']
        return TryOrder.objects.get(order_id=self.order_id)

    def doorstep(self):
        response = self.post(self.admin_client, 'delivery_assign_order', {'order_id': self.order_id, 'rider_id': self.rider.rider_id})
        self.assertTrue(response.json()['status'], response.content)
        self.assignment_id = response.json()['data']['assignment_id']
        for status in ('On Route', 'Trial In Progress'):
            self.assertTrue(self.post(self.rider_client, 'delivery_assignment_update_status', {'assignment_id': self.assignment_id, 'status': status}).json()['status'])
        self.items = list(TryOrder.objects.get(order_id=self.order_id).tryorderitem_set.order_by('pk'))

    def bill(self, count=2):
        self.assertTrue(self.post(self.rider_client, 'delivery_assignment_update_status', {'assignment_id': self.assignment_id, 'status': 'Trial Completed'}).json()['status'])
        response = self.post(self.rider_client, 'submit_final_selection', {'order_id': self.order_id,
            'selected_items': [{'try_order_item_id': item.pk, 'qty': 1} for item in self.items[:count]]})
        self.assertTrue(response.json()['status'], response.content)
        return response.json()['data']

    def approve(self, revision=1, mode='cash'):
        response = self.post(self.customer, 'customer_approve_bill', {'order_id': self.order_id, 'bill_revision': revision, 'payment_mode': mode})
        self.assertTrue(response.json()['status'], response.content)
        return response.json()['data']

    def collect(self, start=2):
        returns = []
        for item in self.items[start:]:
            response = self.post(self.rider_client, 'process_return', {'try_order_item_id': item.pk, 'condition': 'Good', 'tag_intact': True})
            self.assertTrue(response.json()['status'], response.content)
            returns.append(response.json()['data']['id'])
        return returns

    def test_four_items_two_purchases_cash_to_receipt_and_restocks(self):
        with self.captureOnCommitCallbacks(execute=True), patch('sevenshadesapp.order_events.publish') as events:
            order = self.place()
        self.assertTrue(any('account_admin' in call.args[0] for call in events.call_args_list))
        self.doorstep()
        detail = self.post(self.customer, 'settlement_detail', {'order_id': self.order_id}).json()['data']
        deadline = detail['trial_ends_at']
        self.assertEqual(self.post(self.rider_client, 'submit_final_selection', {'order_id': self.order_id, 'selected_items': []}).status_code, 409)
        self.post(self.rider_client, 'delivery_assignment_update_status', {'assignment_id': self.assignment_id, 'status': 'Trial In Progress'})
        self.assertEqual(self.post(self.customer, 'settlement_detail', {'order_id': self.order_id}).json()['data']['trial_ends_at'], deadline)
        bill = self.bill()
        self.assertEqual((bill['items_total'], bill['wallet_credit'], bill['final_payable']), (900, 0, 900))
        cash = {'order_id': self.order_id, 'bill_revision': 1, 'payment_mode': 'cash', 'payment_status': 'paid'}
        self.assertEqual(self.post(self.rider_client, 'final_payment_update', cash).status_code, 409)
        self.assertEqual(self.post(self.rider_client, 'customer_approve_bill', {'order_id': self.order_id, 'bill_revision': 1, 'payment_mode': 'cash'}).status_code, 403)
        self.assertEqual(self.post(self.other_client, 'customer_approve_bill', {'order_id': self.order_id, 'bill_revision': 1, 'payment_mode': 'cash'}).status_code, 409)
        self.assertEqual(TryOrder.objects.get(order_id=self.order_id).status, 'AWAITING_SELECTION_APPROVAL')
        self.approve(mode=None)
        approved_order = TryOrder.objects.get(order_id=self.order_id)
        self.assertEqual(approved_order.status, 'SELECTION_SUBMITTED')
        self.assertEqual(FinalOrder.objects.get(try_order=approved_order).payment_status, 'pending')
        self.assertEqual(self.post(self.rider_client, 'final_payment_update', cash).status_code, 409)
        self.approve()
        self.assertTrue(self.post(self.rider_client, 'final_payment_update', cash).json()['status'])
        self.assertTrue(self.post(self.rider_client, 'final_payment_update', cash).json()['status'])
        self.assertEqual(self.admin_client.get('/api/get_order_analytics').json()['data']['completed_orders'], 0)
        self.assertEqual(self.customer.get('/api/receipt_download', {'order_id': self.order_id}).status_code, 404)
        returns = self.collect()
        complete = {'assignment_id': self.assignment_id, 'status': 'Delivered'}
        self.assertTrue(self.post(self.rider_client, 'delivery_assignment_update_status', complete).json()['status'])
        self.assertTrue(self.post(self.rider_client, 'delivery_assignment_update_status', complete).json()['status'])
        self.assertEqual(OrderReceipt.objects.count(), 1)
        receipt = self.customer.get('/api/receipt_download', {'order_id': self.order_id})
        self.assertEqual(receipt.status_code, 200)
        self.assertIn('not a tax invoice', receipt.content.decode())
        self.assertIn('900', receipt.content.decode())
        inv_res = self.customer.get(f'/api/generate_invoice/{self.order_id}')
        self.assertEqual(inv_res.status_code, 200)
        self.assertTrue(inv_res.json()['status'])
        self.assertIn('receipt_url', inv_res.json())
        self.assertEqual(self.other_client.get('/api/receipt_download', {'order_id': self.order_id}).status_code, 404)

        for return_id in returns:
            self.assertTrue(self.post(self.admin_client, 'update_hygiene_status', {'return_id': return_id, 'action': 'receive'}).json()['status'])
            self.assertEqual(self.post(self.admin_client, 'update_hygiene_status', {'return_id': return_id, 'action': 'approve'}).status_code, 409)
            for action in ('steam_press', 'approve', 'approve'):
                self.assertTrue(self.post(self.admin_client, 'update_hygiene_status', {'return_id': return_id, 'action': action}).json()['status'])
        self.assertEqual(list(ProductDetails.objects.filter(pk__in=[item.pk for item in self.variants]).order_by('pk').values_list('qty', flat=True)), [0, 0, 1, 1])
        order.refresh_from_db()
        self.assertEqual(order.status, 'DELIVERED')
        self.assertEqual(order.payment_status, 'COMPLETED')
        self.assertEqual(self.admin_client.get('/api/get_order_analytics').json()['data'], {'total_orders': 1, 'completed_orders': 1, 'total_revenue': 900})
        self.assertEqual(self.post(self.admin_client, 'admin_order_lifecycle_list', {}).status_code, 405)
        self.assertEqual(self.admin_client.get('/api/admin_order_lifecycle_list').json()['data'][0]['try_order']['status'], 'DELIVERED')

    def test_bill_change_revokes_old_approval_and_same_bill_is_idempotent(self):
        self.place(); self.doorstep()
        self.bill(); self.approve()
        self.assertEqual(self.bill()['approved_revision'], 1)
        changed = self.bill(1)
        self.assertEqual((changed['bill_revision'], changed['approved_revision']), (2, 0))
        for client, endpoint, extra in [(self.customer, 'customer_approve_bill', {'payment_mode': 'cash'}), (self.rider_client, 'final_payment_update', {'payment_mode': 'cash', 'payment_status': 'paid'})]:
            self.assertEqual(self.post(client, endpoint, dict(extra, order_id=self.order_id, bill_revision=1)).status_code, 409)
        self.approve(2)
        self.assertTrue(self.post(self.rider_client, 'final_payment_update', {'order_id': self.order_id, 'bill_revision': 2, 'payment_mode': 'cash', 'payment_status': 'paid'}).json()['status'])

    def test_no_purchase_requires_customer_approval_and_collection(self):
        self.place(); self.doorstep(); self.bill(0)
        final = self.approve()
        self.assertEqual((final['final_payable'], final['payment_status']), (0, 'paid'))
        complete = {'assignment_id': self.assignment_id, 'status': 'Delivered'}
        self.assertEqual(self.post(self.rider_client, 'delivery_assignment_update_status', complete).status_code, 409)
        self.collect(0)
        self.assertTrue(self.post(self.rider_client, 'delivery_assignment_update_status', complete).json()['status'])
        self.assertEqual(TryOrder.objects.get(order_id=self.order_id).status, 'NO_PURCHASE')
        self.assertFalse(OrderReceipt.objects.exists())

    def test_missing_tag_cannot_be_steam_pressed_or_restocked(self):
        self.place(); self.doorstep(); self.bill(0)
        response = self.post(self.rider_client, 'process_return', {'try_order_item_id': self.items[0].pk, 'condition': 'Good', 'tag_intact': False})
        return_id = response.json()['data']['id']
        self.post(self.admin_client, 'update_hygiene_status', {'return_id': return_id, 'action': 'receive'})
        for action in ('steam_press', 'approve'):
            self.assertEqual(self.post(self.admin_client, 'update_hygiene_status', {'return_id': return_id, 'action': action}).status_code, 409)

    def test_nearest_rider_uses_fresh_locations_and_address_ownership(self):
        point = {'address_id': self.address.pk, 'latitude': 28.61, 'longitude': 77.20}
        self.assertEqual(self.post(self.other_client, 'address_location', point).status_code, 404)
        self.assertTrue(self.post(self.customer, 'address_location', point).json()['status'])
        self.assertEqual(self.post(self.customer, 'rider_location', point).status_code, 403)
        self.assertTrue(self.post(self.rider_client, 'rider_location', {'latitude': 28.611, 'longitude': 77.201}).json()['status'])
        self.far.latitude, self.far.longitude, self.far.location_updated_at = 29.0, 78.0, timezone.now()
        self.far.save()
        self.place()
        rows = self.post(self.admin_client, 'rider_suggestions', {'order_id': self.order_id}).json()['data']
        self.assertEqual(rows[0]['rider_id'], self.rider.rider_id)
        self.assertLess(rows[0]['distance_km'], rows[1]['distance_km'])
        DeliveryRider.objects.filter(pk=self.rider.pk).update(location_updated_at=timezone.now() - timezone.timedelta(hours=1))
        rows = self.post(self.admin_client, 'rider_suggestions', {'order_id': self.order_id}).json()['data']
        self.assertIsNone(next(row for row in rows if row['rider_id'] == self.rider.rider_id)['distance_km'])

    def test_emergency_sos_cash_on_delivery_workflow_and_zero_purchase_cod_fee(self):
        # 1. Emergency SOS trial order places directly with ₹0 prepaid (COD mode)
        order = self.place('emergency_sos')
        self.assertEqual(order.status, 'TRY_REQUESTED')
        self.assertEqual(order.try_fee, 99)
        self.assertEqual(order.try_payment_mode, 'cash')
        self.assertEqual(order.try_payment_status, 'cod')

        # 2. Assignment to rider succeeds immediately without waiting for prepaid payment
        self.doorstep()

        # 3. Customer selects 1 item to purchase; urgent delivery fee is waived (effectively free)
        bill = self.bill(count=1)
        self.assertEqual(bill['items_total'], 450)
        self.assertEqual(bill['final_payable'], 450)
        self.assertEqual(bill['payment_mode'], '')

        # 4. Customer approves COD payment
        self.approve(mode='cash')
        approved_final = FinalOrder.objects.get(try_order=order)
        self.assertEqual(approved_final.payment_mode, 'cash')
        self.assertEqual(approved_final.payment_status, 'pending')

        # 5. Rider physically collects ₹450 cash at doorstep
        cash = {'order_id': self.order_id, 'bill_revision': bill['bill_revision'], 'payment_mode': 'cash', 'payment_status': 'paid'}
        self.assertTrue(self.post(self.rider_client, 'final_payment_update', cash).json()['status'])
        approved_final.refresh_from_db()
        self.assertEqual(approved_final.payment_status, 'paid')

        # 6. Delivery completed and receipt available
        complete = {'assignment_id': self.assignment_id, 'status': 'Delivered'}
        self.collect(start=1)
        self.assertTrue(self.post(self.rider_client, 'delivery_assignment_update_status', complete).json()['status'])
        self.assertEqual(OrderReceipt.objects.count(), 1)
        receipt = self.customer.get('/api/receipt_download', {'order_id': self.order_id})
        self.assertEqual(receipt.status_code, 200)
        self.assertIn('450', receipt.content.decode())

    @override_settings(RAZORPAY_KEY_ID='rzp_test_example', RAZORPAY_KEY_SECRET='test-secret')
    @patch('sevenshadesapp.payments.gateway_request')
    def test_uncertain_gateway_creation_does_not_create_second_payment(self, gateway):
        from sevenshadesapp.inventory_workflow import InventoryError
        order = self.place('emergency_sos')
        order.status = 'AWAITING_TRIAL_PAYMENT'
        order.save()
        gateway.side_effect = InventoryError('Gateway timeout')
        payload = {'order_id': self.order_id, 'purpose': 'trial'}
        self.assertEqual(self.post(self.customer, 'payment_create', payload).status_code, 409)
        self.assertEqual(self.post(self.customer, 'payment_create', payload).status_code, 409)
        self.assertEqual(gateway.call_count, 1)
        self.assertEqual(GatewayPayment.objects.get().state, 'REVIEW')
