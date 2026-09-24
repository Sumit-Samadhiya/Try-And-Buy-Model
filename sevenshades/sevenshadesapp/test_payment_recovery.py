from datetime import timedelta
from unittest.mock import patch
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient
from . import test_checkout as fixtures
from .models import AdminLogin, DeliveryRider, TryOrder, GatewayPayment, FinalOrder
from .checkout import create_trial, CheckoutError
from .inventory_workflow import cancel_trial, expire_pending_trials, InventoryError
from .delivery_workflow import assign_order, advance_assignment
from .payments import recover_payment, create_payment

@override_settings(RAZORPAY_KEY_ID='test-key', RAZORPAY_KEY_SECRET='test-secret')
class PaymentRecoveryTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        fixtures.CheckoutTests.setUpTestData.__func__(cls)
        cls.admin=AdminLogin.objects.create(emailid='recover@example.test',mobileno='9000000061',password='Checkout-test-472!')
        cls.rider=DeliveryRider.objects.create(rider_id='RECOVER',phone='9000000062',password='Checkout-test-472!')
    def place(self,paid=False):
        return create_trial(self.user,{'address_id':self.address.pk,'delivery_mode':'emergency_sos' if paid else 'standard','items':[{'product_details_id':self.variant.pk,'size':'M','qty':1}]})
    def stock(self):
        self.variant.refresh_from_db();return self.variant.qty
    def age(self,order):
        order.reservation_expires_at=timezone.now()-timedelta(seconds=1)
        order.save(update_fields=['reservation_expires_at'])
    def attempt(self,order):
        return GatewayPayment.objects.create(try_order=order,purpose='trial',amount_paise=9900,state='REVIEW',receipt_reference='SS-test')
    def provider(self,attempt,**changes):
        data={'id':'order_Recovered','amount':9900,'currency':'INR','receipt':'SS-test','notes':{'local_payment_id':str(attempt.pk)}}
        data.update(changes);return data
    def test_cancel_assigned_before_dispatch_releases_once_and_retains_offer(self):
        order=self.place();assignment=assign_order(order.order_id,self.rider.rider_id)
        cancel_trial('customer',self.user,order.order_id);cancel_trial('customer',self.user,order.order_id)
        assignment.refresh_from_db();self.assertEqual(assignment.status,'Cancelled');self.assertEqual(self.stock(),1)
        retry=self.place();self.assertTrue(retry.is_first_order);self.assertEqual(retry.try_fee,0)
    def test_dispatch_blocks_cancellation_and_consumes_offer(self):
        order=self.place();assignment=assign_order(order.order_id,self.rider.rider_id)
        advance_assignment('rider',self.rider,assignment.assignment_id,'On Route')
        order.refresh_from_db();self.assertIsNotNone(order.dispatched_at)
        with self.assertRaises(InventoryError):cancel_trial('customer',self.user,order.order_id)
        self.assertEqual(self.stock(),0)
        # Even a legacy/manual cancellation after dispatch cannot restore eligibility.
        order.status='CANCELLED';order.save(update_fields=['status'])
        self.variant.qty=1;self.variant.save(update_fields=['qty'])
        retry=self.place();self.assertFalse(retry.is_first_order);self.assertEqual(retry.try_fee,49)
    def test_expired_never_attempted_payment_releases_and_allows_retry(self):
        order=self.place(True);self.age(order)
        self.assertEqual(expire_pending_trials(),1);self.assertEqual(expire_pending_trials(),0)
        order.refresh_from_db();self.assertEqual((order.status,order.cancellation_reason),('CANCELLED','payment_timeout'));self.assertEqual(self.stock(),1)
        self.assertEqual(self.place().try_fee,0)
    def test_unknown_payment_never_expires_or_cancels(self):
        order=self.place(True);self.age(order);self.attempt(order)
        self.assertEqual(expire_pending_trials(),0)
        with self.assertRaises(InventoryError):cancel_trial('customer',self.user,order.order_id)
        self.assertEqual(self.stock(),0)
    def test_unexpired_or_collected_fee_does_not_expire(self):
        order=self.place(True);self.assertEqual(expire_pending_trials(),0)
        self.age(order);order.trial_fee_paid=True;order.save(update_fields=['trial_fee_paid'])
        self.assertEqual(expire_pending_trials(),0);self.assertEqual(self.stock(),0)
    def test_recovered_order_resumes_same_payment_and_records_admin(self):
        order=self.place(True);attempt=self.attempt(order)
        with patch('sevenshadesapp.payments.gateway_request',side_effect=[self.provider(attempt),{'items':[]}]):
            result=recover_payment(self.admin,attempt.pk,'order_Recovered')
        self.assertEqual(result['state'],'READY');attempt.refresh_from_db();self.assertEqual(attempt.recovered_by,str(self.admin.pk))
        with patch('sevenshadesapp.payments.gateway_request') as request:
            resumed=create_payment(self.user,order.order_id,'trial')
            request.assert_not_called()
        self.assertEqual(resumed['order_id'],'order_Recovered');self.assertEqual(GatewayPayment.objects.count(),1)
    def test_recovery_checks_identity_and_captured_amount(self):
        order=self.place(True);attempt=self.attempt(order)
        for wrong in ({'amount':1},{'notes':{'local_payment_id':'wrong'}},{'receipt':'wrong'}):
            with patch('sevenshadesapp.payments.gateway_request',return_value=self.provider(attempt,**wrong)),self.assertRaises(InventoryError):
                recover_payment(self.admin,attempt.pk,'order_Recovered')
        attempt.refresh_from_db();self.assertIsNone(attempt.gateway_order_id)
        captured={'id':'pay_Recovered','order_id':'order_Recovered','amount':9900,'currency':'INR','status':'captured','amount_refunded':0}
        with patch('sevenshadesapp.payments.gateway_request',side_effect=[self.provider(attempt),{'items':[captured]}]):
            result=recover_payment(self.admin,attempt.pk,'order_Recovered')
        self.assertEqual(result['state'],'CAPTURED');order.refresh_from_db();self.assertTrue(order.trial_fee_paid);self.assertEqual(order.status,'TRY_REQUESTED')
        self.assertEqual(self.stock(),0)
    def test_setup_failure_persists_reference_without_creating_second_attempt(self):
        order=self.place(True)
        with patch('sevenshadesapp.payments.gateway_request',side_effect=InventoryError('timeout')),self.assertRaises(InventoryError):
            create_payment(self.user,order.order_id,'trial')
        attempt=GatewayPayment.objects.get();self.assertTrue(attempt.receipt_reference);self.assertEqual(attempt.state,'REVIEW')
        with patch('sevenshadesapp.payments.gateway_request') as request,self.assertRaises(InventoryError):
            create_payment(self.user,order.order_id,'trial')
        request.assert_not_called();self.assertEqual(GatewayPayment.objects.count(),1)
    def test_recovery_endpoints_require_admin_and_csrf(self):
        client=APIClient(enforce_csrf_checks=True)
        self.assertEqual(client.get('/api/admin_payment_recovery').status_code,401)
        def post(endpoint,data):
            token=client.get('/api/auth_csrf').json()['csrfToken']
            return client.post('/api/'+endpoint,data,format='json',HTTP_X_CSRFTOKEN=token)
        post('check_costumer_login',{'mobileno':self.user.pk,'password':'Checkout-test-472!'})
        self.assertEqual(client.get('/api/admin_payment_recovery').status_code,403)
        self.assertEqual(post('admin_recover_payment',{'attempt_id':1,'gateway_order_id':'order_fake'}).status_code,403)
        post('check_admin_login',{'emailid':self.admin.emailid,'password':'Checkout-test-472!'})
        self.assertEqual(client.get('/api/admin_payment_recovery').status_code,200)
        self.assertEqual(client.post('/api/admin_expire_reservations',{},format='json').status_code,403)
