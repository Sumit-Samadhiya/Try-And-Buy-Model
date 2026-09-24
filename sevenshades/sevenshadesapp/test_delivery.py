from django.utils import timezone
from django.test import TestCase, TransactionTestCase
from django.db import close_old_connections, OperationalError, IntegrityError, transaction
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from rest_framework.test import APIClient
from .models import SignUp, AdminLogin, DeliveryRider, DeliveryAssignment, DeliveryBatch, TryOrder, FinalOrder, TryOrderItem
from .delivery_workflow import assign_order, advance_assignment, generate_batches
from .inventory_workflow import InventoryError


class DeliveryTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = AdminLogin.objects.create(emailid='delivery@example.test', mobileno='9000000061', password='Delivery-test-472!')
        cls.rider = DeliveryRider.objects.create(rider_id='D1', phone='9000000062', password='Delivery-test-472!')
        cls.other = DeliveryRider.objects.create(rider_id='D2', phone='9000000063', password='Delivery-test-472!')

    def order(self, key='DORDER', **kwargs):
        return TryOrder.objects.create(order_id=key, mobileno='9000000064', postcode='110001', delivery_slot='Morning', **kwargs)

    def test_assignment_updates_order_and_is_idempotent(self):
        order = self.order()
        first = assign_order(order.order_id, self.rider.rider_id)
        self.assertEqual(assign_order(order.order_id, self.rider.rider_id).pk, first.pk)
        order.refresh_from_db()
        self.assertEqual((order.status, order.assigned_rider_id), ('ASSIGNED', self.rider.pk))
        with self.assertRaises(InventoryError):
            assign_order(order.order_id, self.other.rider_id)
        with self.assertRaises(IntegrityError), transaction.atomic():
            DeliveryAssignment.objects.create(assignment_id='DUP', try_order=order, rider=self.other)

    def test_terminal_inactive_and_skipped_initial_status_rejected(self):
        for status in ('CANCELLED', 'DELIVERED', 'NO_PURCHASE', 'PAYMENT_PENDING'):
            order = self.order(status, status=status)
            with self.assertRaises(InventoryError):
                assign_order(order.order_id, self.rider.rider_id)
        order = self.order()
        with self.assertRaises(InventoryError):
            assign_order(order.order_id, self.rider.rider_id, 'Delivered')
        self.rider.status = 'Inactive'
        self.rider.save()
        with self.assertRaises(InventoryError):
            assign_order(order.order_id, self.rider.rider_id)
        self.assertFalse(DeliveryAssignment.objects.exists())

    def test_forward_only_statuses_ownership_and_verified_completion(self):
        order = self.order()
        assignment = assign_order(order.order_id, self.rider.rider_id)
        for status in ('Delivered', 'Trial In Progress', 'invented'):
            with self.assertRaises(InventoryError):
                advance_assignment('rider', self.rider, assignment.assignment_id, status)
        with self.assertRaises(InventoryError):
            advance_assignment('rider', self.other, assignment.assignment_id, 'On Route')
        advance_assignment('rider', self.rider, assignment.assignment_id, 'On Route')
        order.refresh_from_db()
        self.assertEqual(order.status, 'OUT_FOR_TRIAL')
        advance_assignment('rider', self.rider, assignment.assignment_id, 'Trial In Progress')
        assignment.refresh_from_db()
        started = assignment.trial_start_time
        advance_assignment('rider', self.rider, assignment.assignment_id, 'Trial In Progress')
        assignment.refresh_from_db()
        self.assertEqual(started, assignment.trial_start_time)
        advance_assignment('rider', self.rider, assignment.assignment_id, 'Trial Completed')
        assignment.refresh_from_db()
        ended = assignment.trial_end_time
        advance_assignment('rider', self.rider, assignment.assignment_id, 'Trial Completed')
        assignment.refresh_from_db()
        self.assertEqual(ended, assignment.trial_end_time)
        order.refresh_from_db()
        self.assertEqual(order.status, 'TRIAL_COMPLETED')
        final = FinalOrder.objects.create(try_order=order, order_id='DFIN', selected_items_count=1)
        with self.assertRaises(InventoryError):
            advance_assignment('rider', self.rider, assignment.assignment_id, 'Delivered')
        final.approved_revision = 1
        final.approved_by = order.mobileno
        final.approved_at = timezone.now()
        final.payment_status = 'paid'
        final.save()
        advance_assignment('rider', self.rider, assignment.assignment_id, 'Delivered')
        order.refresh_from_db()
        self.assertEqual(order.status, 'DELIVERED')
        with self.assertRaises(InventoryError):
            advance_assignment('admin', self.admin, assignment.assignment_id, 'On Route')

    def test_unpurchased_items_require_collection_before_completion(self):
        order = self.order()
        assignment = assign_order(order.order_id, self.rider.rider_id)
        advance_assignment('admin', self.admin, assignment.assignment_id, 'On Route')
        advance_assignment('admin', self.admin, assignment.assignment_id, 'Trial In Progress')
        advance_assignment('admin', self.admin, assignment.assignment_id, 'Trial Completed')
        FinalOrder.objects.create(try_order=order, order_id='NONE', selected_items_count=0, payment_status='paid', approved_revision=1, approved_by=order.mobileno, approved_at=timezone.now())
        TryOrderItem.objects.create(try_order=order, stock_reserved=True)
        with self.assertRaisesRegex(InventoryError, 'collection'):
            advance_assignment('admin', self.admin, assignment.assignment_id, 'Delivered')

    def test_batches_create_memberships_group_slots_and_replay_without_empty_batches(self):
        first = self.order('B1')
        second = self.order('B2')
        second.delivery_slot = 'Evening'
        second.save()
        self.order('SOS', delivery_mode='emergency_sos')
        self.order('CANCEL', status='CANCELLED')
        batches = generate_batches(self.rider.rider_id)
        self.assertEqual(len(batches), 2)
        self.assertEqual(DeliveryAssignment.objects.count(), 2)
        self.assertEqual(generate_batches(self.rider.rider_id), [])
        self.assertEqual(DeliveryBatch.objects.count(), 2)
        assignment = first.deliveryassignment_set.get()
        self.assertEqual(assignment.batch.rider_id, self.rider.pk)
        advance_assignment('admin', self.admin, assignment.assignment_id, 'On Route')
        advance_assignment('admin', self.admin, assignment.assignment_id, 'Trial In Progress')
        advance_assignment('admin', self.admin, assignment.assignment_id, 'Trial Completed')
        FinalOrder.objects.create(try_order=first, order_id='NO-PURCHASE', payment_status='paid', approved_revision=1, approved_by=first.mobileno, approved_at=timezone.now())
        advance_assignment('admin', self.admin, assignment.assignment_id, 'Delivered')
        assignment.batch.refresh_from_db()
        first.refresh_from_db()
        self.assertEqual((assignment.batch.status, first.status), ('Completed', 'NO_PURCHASE'))

    def test_batch_api_is_admin_only_and_csrf_protected(self):
        client = APIClient(enforce_csrf_checks=True)
        self.assertEqual(client.get('/api/delivery_batch_list').status_code, 401)
        token = client.get('/api/auth_csrf').json()['csrfToken']
        client.post('/api/delivery_rider_login', {'phone': self.rider.phone, 'password': 'Delivery-test-472!'}, format='json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(client.get('/api/delivery_batch_list').status_code, 403)
        token = client.get('/api/auth_csrf').json()['csrfToken']
        client.post('/api/check_admin_login', {'emailid': self.admin.emailid, 'password': 'Delivery-test-472!'}, format='json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(client.post('/api/generate_delivery_batch', {'rider_id': 'D1'}, format='json').status_code, 403)
        self.order()
        token = client.get('/api/auth_csrf').json()['csrfToken']
        response = client.post('/api/generate_delivery_batch', {'rider_id': 'D1'}, format='json', HTTP_X_CSRFTOKEN=token)
        self.assertTrue(response.json()['status'])
        data = client.get('/api/delivery_batch_list').json()['data']
        self.assertEqual(data[0]['order_ids'], ['DORDER'])


class DeliveryConcurrencyTests(TransactionTestCase):
    def setUp(self):
        DeliveryTests.setUpTestData.__func__(type(self))
        TryOrder.objects.create(order_id='RACE', mobileno='1', postcode='110001')

    def test_simultaneous_batch_generation_has_one_assignment(self):
        barrier = Barrier(2)
        def generate():
            close_old_connections()
            try:
                barrier.wait(timeout=10)
                generate_batches(self.rider.rider_id)
            except OperationalError:
                pass
            finally:
                close_old_connections()
        with ThreadPoolExecutor(max_workers=2) as pool:
            futures = [pool.submit(generate), pool.submit(generate)]
            for future in futures:
                future.result(timeout=20)
        generate_batches(self.rider.rider_id)
        self.assertEqual(DeliveryAssignment.objects.count(), 1)
        self.assertEqual(DeliveryBatch.objects.count(), 1)
