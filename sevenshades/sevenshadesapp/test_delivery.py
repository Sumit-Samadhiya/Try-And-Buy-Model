from django.utils import timezone
from django.test import TestCase, TransactionTestCase
from django.db import close_old_connections, connections, OperationalError, IntegrityError, transaction
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from unittest.mock import patch
from rest_framework.test import APIClient
from .models import SignUp, AdminLogin, DeliveryRider, DeliveryAssignment, DeliveryBatch, TryOrder, FinalOrder, TryOrderItem
from .delivery_workflow import assign_order, advance_assignment, generate_batches, reassign_order
from .inventory_workflow import InventoryError


class DeliveryTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = AdminLogin.objects.create(emailid='delivery@example.test', mobileno='9000000061', password='Delivery-test-472!')
        cls.rider = DeliveryRider.objects.create(rider_id='D1', phone='9000000062', password='Delivery-test-472!')
        cls.other = DeliveryRider.objects.create(rider_id='D2', phone='9000000063', password='Delivery-test-472!')

    def order(self, key='DORDER', **kwargs):
        defaults = {'mobileno': '9000000064', 'postcode': '110001', 'delivery_slot': 'Morning'}
        defaults.update(kwargs)
        return TryOrder.objects.create(order_id=key, **defaults)

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

    def test_reassignment_closes_empty_old_batch(self):
        order = self.order()
        batch = DeliveryBatch.objects.create(batch_id='OLD-BATCH', rider=self.rider, status='Pending')
        assignment = assign_order(order.order_id, self.rider.rider_id)
        assignment.batch = batch
        assignment.save(update_fields=['batch'])
        reassign_order(order.order_id, self.other.rider_id)
        batch.refresh_from_db()
        assignment.refresh_from_db()
        self.assertEqual(batch.status, 'Completed')
        self.assertIsNone(assignment.batch_id)
        self.assertEqual(assignment.rider_id, self.other.pk)

    def test_reassign_same_rider_preserves_batch(self):
        order = self.order()
        batch = DeliveryBatch.objects.create(batch_id='KEEP-BATCH', rider=self.rider, status='Pending')
        assignment = assign_order(order.order_id, self.rider.rider_id)
        assignment.batch = batch
        assignment.save(update_fields=['batch'])
        reassign_order(order.order_id, self.rider.rider_id)
        assignment.refresh_from_db()
        batch.refresh_from_db()
        self.assertEqual(assignment.batch_id, batch.pk)
        self.assertEqual(batch.status, 'Pending')

    def test_reassignment_notifies_both_riders_and_revokes_old_access(self):
        order = self.order()
        assignment = assign_order(order.order_id, self.rider.rider_id)
        with self.captureOnCommitCallbacks(execute=True), patch('sevenshadesapp.order_events.publish') as publish:
            reassign_order(order.order_id, self.other.rider_id)
            publish.assert_not_called()
        groups, payload = publish.call_args.args
        self.assertIn(f'account_rider_{self.rider.pk}', groups)
        self.assertIn(f'account_rider_{self.other.pk}', groups)
        self.assertEqual(payload['reason'], 'reassigned')
        with self.assertRaises(InventoryError):
            advance_assignment('rider', self.rider, assignment.assignment_id, 'On Route')
        advance_assignment('rider', self.other, assignment.assignment_id, 'On Route')

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

    def test_scheduled_delivery_date_and_slot_batching(self):
        import datetime
        from .serializer import DeliveryAssignmentWithRefSerializer
        today = timezone.localdate()
        tomorrow = today + datetime.timedelta(days=1)
        self.order('ORD_TODAY', delivery_slot='10:00 AM - 02:00 PM', scheduled_date=today)
        self.order('ORD_TOMORROW', delivery_slot='10:00 AM - 02:00 PM', scheduled_date=tomorrow)
        batches = generate_batches(self.rider.rider_id)
        # Separate batches created for different scheduled dates
        self.assertEqual(len(batches), 2)

    def test_trial_timer_overdue_and_sos_sla(self):
        from .serializer import DeliveryAssignmentWithRefSerializer
        import datetime
        order = self.order('ORD_SLA', trial_type='SOS', delivery_mode='emergency_sos')
        assignment = assign_order(order.order_id, self.rider.rider_id)
        assignment.trial_start_time = timezone.now() - datetime.timedelta(minutes=20)
        assignment.trial_end_time = timezone.now()
        assignment.save()
        serializer = DeliveryAssignmentWithRefSerializer(assignment)
        self.assertTrue(serializer.data['is_sos'])
        self.assertTrue(serializer.data['trial_overdue'])
        self.assertGreater(serializer.data['trial_overdue_minutes'], 4.0)

    def test_rider_zone_eligibility(self):
        from .models import DeliveryZone
        zone = DeliveryZone.objects.create(zone_name='Indore West', postcodes='452002, 452003')
        
        # Create a rider specifically bound to Indore West
        zoned_rider = DeliveryRider.objects.create(rider_id='R_IND', phone='9000000099', password='Pass!', zone='Indore West')
        
        # 2 orders matching Indore West in same group, 1 order in different postcode (452010)
        self.order('IND_1', postcode='452002', delivery_slot='Evening')
        self.order('IND_2', postcode='452002', delivery_slot='Evening')
        other = self.order('IND_OTHER', postcode='452010', delivery_slot='Evening')
        
        batches = generate_batches(zoned_rider.rider_id)
        # Should only batch the 2 matching Indore West orders
        self.assertEqual(len(batches), 1)
        self.assertEqual(batches[0].deliveryassignment_set.count(), 2)
        other.refresh_from_db()
        self.assertIsNone(other.assigned_rider)

    def test_batch_capacity_capped_at_five_orders(self):
        # 7 orders in identical group
        for i in range(7):
            self.order(f'CAP_{i}', postcode='110001', delivery_slot='Night')
        cap_batches = generate_batches(self.rider.rider_id)
        # 7 orders must be split across batches of at most 5 orders: 5 + 2 = 2 batches
        self.assertEqual(len(cap_batches), 2)
        counts = sorted([b.deliveryassignment_set.count() for b in cap_batches])
        self.assertEqual(counts, [2, 5])


    def test_optimize_route_haversine_sequencing(self):
        client = APIClient(enforce_csrf_checks=False)
        token = client.get('/api/auth_csrf').json()['csrfToken']
        client.post('/api/delivery_rider_login', {'phone': self.rider.phone, 'password': 'Delivery-test-472!'}, format='json', HTTP_X_CSRFTOKEN=token)
        order1 = self.order('OPT_1', latitude=22.7196, longitude=75.8577)
        order2 = self.order('OPT_2', latitude=22.7533, longitude=75.8937)
        batch = DeliveryBatch.objects.create(batch_id='BAT-OPT-1', rider=self.rider, status='Pending')
        from .delivery_workflow import attach
        attach(order1, self.rider, batch)
        attach(order2, self.rider, batch)

        response = client.post('/api/optimize_route', {'batch_id': batch.batch_id, 'start_lat': 28.60, 'start_lng': 77.20}, format='json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['status'])
        self.assertEqual(len(data['order_sequence']), 2)
        self.assertGreater(data['total_distance_km'], 0.0)
        self.assertGreater(data['estimated_duration_minutes'], 0)
        self.assertEqual(len(data['waypoints']), 2)
        self.assertIn('OPT_1', data['order_sequence'])

        # Unauthorized rider cannot view or optimize another rider's batch route
        other_client = APIClient(enforce_csrf_checks=False)
        token2 = other_client.get('/api/auth_csrf').json()['csrfToken']
        other_client.post('/api/delivery_rider_login', {'phone': self.other.phone, 'password': 'Delivery-test-472!'}, format='json', HTTP_X_CSRFTOKEN=token2)
        unauth_response = other_client.post('/api/optimize_route', {'batch_id': batch.batch_id}, format='json', HTTP_X_CSRFTOKEN=token2)
        self.assertEqual(unauth_response.status_code, 403)
        self.assertFalse(unauth_response.json()['status'])

    def test_pincode_lookup_invalid_format(self):
        client = APIClient()
        response = client.get('/api/pincode_lookup?pincode=123')
        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.json()['status'])

        response_post = client.post('/api/pincode_lookup', {'pincode': 'ABCDEF'}, format='json')
        self.assertEqual(response_post.status_code, 400)
        self.assertFalse(response_post.json()['status'])

    def test_pincode_lookup_serviceable_and_excluded(self):
        from .models import DeliveryZone, ExcludedArea
        DeliveryZone.objects.create(zone_name='Central Hub', postcodes='110001, 110002')
        client = APIClient()
        
        # Test 110001 (serviceable)
        response = client.get('/api/pincode_lookup?pincode=110001')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['status'])
        self.assertTrue(data['serviceable'])
        self.assertEqual(data['zone_name'], 'Central Hub')

        # Test non-serviceable pincode
        response_unserv = client.get('/api/pincode_lookup?pincode=560001')
        self.assertEqual(response_unserv.status_code, 200)
        data_unserv = response_unserv.json()
        self.assertTrue(data_unserv['status'])
        self.assertFalse(data_unserv['serviceable'])

        # Now exclude 110001
        ExcludedArea.objects.create(area_name='Red Zone', postcode='110001')
        response_excl = client.get('/api/pincode_lookup?pincode=110001')
        self.assertEqual(response_excl.status_code, 200)
        data_excl = response_excl.json()
        self.assertTrue(data_excl['status'])
        self.assertFalse(data_excl['serviceable'])
        self.assertTrue(data_excl['is_excluded'])





    def test_admin_update_rider_details_and_reset_password(self):
        client = APIClient(enforce_csrf_checks=False)
        client.post('/api/check_admin_login', {'emailid': self.admin.emailid, 'password': 'Delivery-test-472!'}, format='json')

        update_payload = {
            'rider_id': self.rider.rider_id,
            'name': 'Updated Rider Name',
            'phone': '9876543210',
            'bike_number': 'DL01AB9999',
            'zone': 'South Delhi',
            'status': 'Active',
            'password': 'BrandNewRiderPass123!',
            'confirm_password': 'BrandNewRiderPass123!'
        }
        res = client.post('/api/delivery_rider_update', update_payload, format='json')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data['status'])
        self.assertEqual(data['data']['name'], 'Updated Rider Name')
        self.assertEqual(data['data']['phone'], '9876543210')

        # Verify DB updated
        self.rider.refresh_from_db()
        self.assertEqual(self.rider.name, 'Updated Rider Name')
        self.assertEqual(self.rider.phone, '9876543210')
        self.assertEqual(self.rider.bike_number, 'DL01AB9999')
        self.assertEqual(self.rider.zone, 'South Delhi')

        # Verify old password no longer works for login
        old_login = client.post('/api/delivery_rider_login', {'phone': '9876543210', 'password': 'Delivery-test-472!'}, format='json')
        self.assertEqual(old_login.status_code, 401)

        # Verify new password works
        new_login = client.post('/api/delivery_rider_login', {'phone': '9876543210', 'password': 'BrandNewRiderPass123!'}, format='json')
        self.assertEqual(new_login.status_code, 200)
        self.assertTrue(new_login.json()['status'])

    def test_admin_update_rider_invalid_password_rejected(self):
        client = APIClient(enforce_csrf_checks=False)
        client.post('/api/check_admin_login', {'emailid': self.admin.emailid, 'password': 'Delivery-test-472!'}, format='json')

        res = client.post('/api/delivery_rider_update', {
            'rider_id': self.rider.rider_id,
            'password': 'short'
        }, format='json')
        self.assertEqual(res.status_code, 400)

    def test_admin_update_rider_duplicate_phone_rejected(self):
        client = APIClient(enforce_csrf_checks=False)
        client.post('/api/check_admin_login', {'emailid': self.admin.emailid, 'password': 'Delivery-test-472!'}, format='json')

        res = client.post('/api/delivery_rider_update', {
            'rider_id': self.rider.rider_id,
            'phone': self.other.phone
        }, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('already exists', res.json()['message'])

    def test_rider_self_service_reset_password_with_otp(self):
        client = APIClient(enforce_csrf_checks=False)
        res = client.post('/api/delivery_rider_reset_password', {
            'phone': self.other.phone,
            'otp': '123456',
            'password': 'NewSelfResetPass789!',
            'confirm_password': 'NewSelfResetPass789!'
        }, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()['status'])

        # Verify login with new password
        login_res = client.post('/api/delivery_rider_login', {
            'phone': self.other.phone,
            'password': 'NewSelfResetPass789!'
        }, format='json')
        self.assertEqual(login_res.status_code, 200)
        self.assertTrue(login_res.json()['status'])

    def test_rider_self_service_reset_password_invalid_otp(self):
        client = APIClient(enforce_csrf_checks=False)
        res = client.post('/api/delivery_rider_reset_password', {
            'phone': self.other.phone,
            'otp': '999999',
            'password': 'NewSelfResetPass789!',
            'confirm_password': 'NewSelfResetPass789!'
        }, format='json')
        self.assertEqual(res.status_code, 401)


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
                # Workers must close healthy persistent connections before exiting.
                connections.close_all()
        with ThreadPoolExecutor(max_workers=2) as pool:
            futures = [pool.submit(generate), pool.submit(generate)]
            for future in futures:
                future.result(timeout=20)
        generate_batches(self.rider.rider_id)
        self.assertEqual(DeliveryAssignment.objects.count(), 1)
        self.assertEqual(DeliveryBatch.objects.count(), 1)
