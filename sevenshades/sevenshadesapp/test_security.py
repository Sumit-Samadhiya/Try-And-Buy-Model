from importlib import import_module

from django.contrib.auth.hashers import check_password
from django.core.cache import cache
from django.test import override_settings, TestCase, TransactionTestCase
from rest_framework.test import APIClient

from .models import (SignUp, AdminLogin, DeliveryRider, UserAddress, TryOrder,
                     TryOrderItem, FinalOrder, DeliveryAssignment, MainCategory)


PASSWORD = 'Valid-test-secret-472!'


class AccountSecurityTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.alice = SignUp.objects.create(mobileno='9000000001', emailid='alice@example.test', password=PASSWORD)
        cls.bob = SignUp.objects.create(mobileno='9000000002', emailid='bob@example.test', password=PASSWORD)
        cls.admin = AdminLogin.objects.create(emailid='admin@example.test', mobileno='9000000003', password=PASSWORD)
        cls.rider = DeliveryRider.objects.create(rider_id='R1', phone='9000000004', password=PASSWORD)
        cls.other_rider = DeliveryRider.objects.create(rider_id='R2', phone='9000000005', password=PASSWORD)
        cls.order = TryOrder.objects.create(order_id='T1', mobileno=cls.alice.pk, status='TRIAL_COMPLETED')
        cls.other_order = TryOrder.objects.create(order_id='T2', mobileno=cls.bob.pk)
        cls.item = TryOrderItem.objects.create(try_order=cls.order, product_name='Test', qty=1, unit_price=500, line_total=500)
        cls.assignment = DeliveryAssignment.objects.create(assignment_id='A1', try_order=cls.order, rider=cls.rider)
        DeliveryAssignment.objects.create(assignment_id='A2', try_order=cls.other_order, rider=cls.other_rider)
        cls.address = UserAddress.objects.create(mobileno=cls.alice, address='Home', city='City', postcode='110001', country='India')

    def setUp(self):
        cache.clear()
        self.client = APIClient(enforce_csrf_checks=True)

    def post(self, endpoint, data):
        token = self.client.get('/api/auth_csrf').json()['csrfToken']
        return self.client.post('/api/' + endpoint, data, format='json', HTTP_X_CSRFTOKEN=token)

    def login(self, role='customer', account=None):
        account = account or {'customer': self.alice, 'admin': self.admin, 'rider': self.rider}[role]
        endpoint, field, value = {
            'customer': ('check_costumer_login', 'mobileno', getattr(account, 'mobileno', '')),
            'admin': ('check_admin_login', 'emailid', getattr(account, 'emailid', '')),
            'rider': ('delivery_rider_login', 'phone', getattr(account, 'phone', '')),
        }[role]
        response = self.post(endpoint, {field: value, 'password': PASSWORD})
        self.assertEqual(response.status_code, 200, response.content)
        return response

    def test_anonymous_management_and_account_access_denied(self):
        for endpoint in ('delivery_rider_list', 'admin_order_lifecycle_list', 'delivery_assignments_list', 'get_order_analytics'):
            self.assertEqual(self.client.get('/api/' + endpoint).status_code, 401)
        for endpoint in ('editmaincategory_data', 'productdetails_submit', 'fetch_user_address', 'try_order_create', 'final_payment_update'):
            self.assertEqual(self.post(endpoint, {}).status_code, 401)

    def test_public_catalog_still_works(self):
        self.assertEqual(self.client.get('/api/user_maincategory_list').status_code, 200)
        self.assertEqual(self.post('user_products_maincategory', {'maincategoryid': 1}).status_code, 200)

    def test_passwords_hashed_and_never_returned_for_all_roles(self):
        for role, account in [('customer', self.alice), ('admin', self.admin), ('rider', self.rider)]:
            self.assertNotEqual(account.password, PASSWORD)
            self.assertTrue(check_password(PASSWORD, account.password))
            response = self.login(role, account)
            self.assertNotIn('password', response.content.decode())
            self.assertNotIn('password', self.client.get('/api/auth_session').content.decode())
        self.login('admin')
        self.assertNotIn('password', self.client.get('/api/delivery_rider_list').content.decode())
        self.assertNotIn('password', self.client.get('/api/delivery_assignments_list').content.decode())

    def test_csrf_required_even_for_login(self):
        response = self.client.post('/api/check_costumer_login', {'mobileno': self.alice.pk, 'password': PASSWORD}, format='json')
        self.assertEqual(response.status_code, 403)
        self.login()
        self.assertEqual(self.client.post('/api/address_delete', {}, format='json').status_code, 403)

    def test_foreign_origin_rejected(self):
        token = self.client.get('/api/auth_csrf').json()['csrfToken']
        response = self.client.post('/api/check_costumer_login', {'mobileno': self.alice.pk, 'password': PASSWORD}, format='json', HTTP_X_CSRFTOKEN=token, HTTP_ORIGIN='https://untrusted.example')
        self.assertEqual(response.status_code, 403)

    def test_customer_cannot_impersonate_or_manage_catalog(self):
        self.login()
        for endpoint, key in [('fetch_user_address', 'mobile'), ('address_submit', 'mobileno'), ('address_update', 'mobile'), ('address_delete', 'mobile'), ('user_order_lifecycle_list', 'mobileno'), ('try_order_create', 'mobileno'), ('submit_product_review', 'user_mobile')]:
            self.assertEqual(self.post(endpoint, {key: self.bob.pk}).status_code, 403, endpoint)
        self.assertEqual(self.post('editmaincategory_data', {}).status_code, 403)
        response = self.post('fetch_user_address', {})
        self.assertEqual(response.json()['data'][0]['id'], self.address.pk)
        self.assertNotIn('password', response.content.decode())
        orders = self.post('user_order_lifecycle_list', {}).json()['data']
        self.assertEqual([row['try_order']['order_id'] for row in orders], ['T1'])

    def test_customer_cannot_select_or_mark_payment(self):
        self.login()
        for endpoint in ('delivery_selection_update', 'submit_final_selection', 'final_payment_update'):
            self.assertEqual(self.post(endpoint, {'order_id': 'T1', 'payment_status': 'paid'}).status_code, 403)

    def test_rider_access_limited_to_assigned_orders(self):
        self.login('rider')
        self.assertEqual(self.post('delivery_rider_tasks', {'phone': self.other_rider.phone}).status_code, 403)
        self.assertEqual(self.post('delivery_assignment_update_status', {'assignment_id': 'A2', 'status': 'Delivered'}).status_code, 404)
        self.assertEqual(self.post('submit_final_selection', {'order_id': 'T2', 'selected_items': []}).status_code, 404)
        response = self.post('delivery_rider_tasks', {})
        self.assertEqual([row['assignment_id'] for row in response.json()['data']], ['A1'])
        self.assertEqual(self.client.get('/api/admin_order_lifecycle_list').status_code, 403)

    def test_admin_management_still_works(self):
        self.login('admin')
        category = MainCategory.objects.create(maincategoryname='Before', icon='test.png')
        self.assertTrue(self.post('editmaincategory_data', {'id': category.id, 'maincategoryname': 'After'}).json()['status'])
        category.refresh_from_db()
        self.assertEqual(category.maincategoryname, 'After')

    def test_logout_invalidates_server_session(self):
        self.login()
        old_cookie = self.client.cookies['sessionid'].value
        self.assertTrue(self.post('auth_logout', {}).json()['status'])
        self.client.cookies['sessionid'] = old_cookie
        self.assertEqual(self.client.get('/api/auth_session').status_code, 401)

    def test_password_change_and_rider_deactivation_revoke_session(self):
        self.login()
        self.alice.password = 'New-test-secret-824!'
        self.alice.save()
        self.assertEqual(self.client.get('/api/auth_session').status_code, 401)
        self.login('rider')
        self.rider.status = 'Inactive'
        self.rider.save()
        self.assertEqual(self.post('delivery_rider_tasks', {}).status_code, 401)

    def test_switching_account_replaces_identity(self):
        self.login()
        self.login(account=self.bob)
        self.assertEqual(self.client.get('/api/auth_session').json()['data']['mobileno'], self.bob.pk)
        self.assertEqual(self.post('fetch_user_address', {'mobile': self.alice.pk}).status_code, 403)

    @override_settings(DEBUG=True, OTP_TEST_MODE=True)
    def test_signup_validates_and_hashes_password_without_signing_in(self):
        data = {'mobileno': '9000000009', 'emailid': 'new@example.test', 'fname': 'New', 'lname': 'User', 'password': '123'}
        self.assertEqual(self.post('signup_submit', data).status_code, 400)
        data['password'] = data['confirm_password'] = PASSWORD
        challenge = self.post('otp_request', {'mobileno': data['mobileno'], 'purpose': 'signup'}).json()['data']['challenge_id']
        data.update(challenge_id=challenge, otp='123456')
        self.assertEqual(self.post('signup_submit', data).status_code, 201)
        self.assertTrue(check_password(PASSWORD, SignUp.objects.get(pk=data['mobileno']).password))
        self.assertEqual(self.client.get('/api/auth_session').status_code, 401)

    def test_wrong_password_is_401_and_attempts_are_limited(self):
        for _ in range(10):
            self.assertEqual(self.post('check_costumer_login', {'mobileno': self.alice.pk, 'password': 'wrong'}).status_code, 401)
        self.assertEqual(self.post('check_costumer_login', {'mobileno': self.alice.pk, 'password': 'wrong'}).status_code, 429)

    def test_legacy_password_migration_preserves_credentials(self):
        SignUp.objects.filter(pk=self.alice.pk).update(password=PASSWORD)
        from django.apps import apps
        from django.db import connection
        migration = import_module('sevenshadesapp.migrations.0023_hash_account_passwords')
        from types import SimpleNamespace
        migration.hash_existing_passwords(apps, SimpleNamespace(connection=connection))
        self.alice.refresh_from_db()
        self.assertTrue(check_password(PASSWORD, self.alice.password))

    def test_online_paid_flag_rejected_cash_recording_restricted(self):
        self.login('rider')
        response = self.post('submit_final_selection', {'order_id': 'T1', 'selected_items': [{'try_order_item_id': self.item.pk, 'qty': 1}]})
        self.assertTrue(response.json()['status'], response.content)
        self.assertEqual(self.post('final_payment_update', {'order_id': 'T1', 'payment_mode': 'upi', 'payment_status': 'paid'}).status_code, 409)
        self.assertEqual(FinalOrder.objects.get(try_order=self.order).payment_status, 'pending')
        self.assertEqual(self.post('final_payment_update', {'order_id': 'T1', 'bill_revision': 1, 'payment_mode': 'cash', 'payment_status': 'paid'}).status_code, 409)
        self.login('customer')
        self.assertTrue(self.post('customer_approve_bill', {'order_id': 'T1', 'bill_revision': 1, 'payment_mode': 'cash'}).json()['status'])
        self.login('rider')
        self.assertTrue(self.post('final_payment_update', {'order_id': 'T1', 'bill_revision': 1, 'payment_mode': 'cash', 'payment_status': 'paid'}).json()['status'])
        for endpoint, data in [('submit_final_selection', {'selected_items': []}), ('delivery_selection_update', {'selected_item_ids': []})]:
            response = self.post(endpoint, {'order_id': 'T1', **data})
            self.assertFalse(response.json()['status'])
        self.assertEqual(FinalOrder.objects.get(try_order=self.order).items_total, 500)

    def test_oversized_quantity_and_duplicate_selection_rejected(self):
        self.login('rider')
        for items in [[{'try_order_item_id': self.item.pk, 'qty': 1000}], [{'try_order_item_id': self.item.pk, 'qty': 1}] * 2]:
            self.assertEqual(self.post('submit_final_selection', {'order_id': 'T1', 'selected_items': items}).status_code, 409)

    def test_api_suffix_cannot_bypass_routing(self):
        self.assertEqual(self.client.get('/api/delivery_rider_list_extra').status_code, 404)


class SocketSecurityTests(TransactionTestCase):
    def test_order_socket_checks_ownership_origin_and_revocation(self):
        from asgiref.sync import async_to_sync, sync_to_async
        from channels.testing import WebsocketCommunicator
        from channels.layers import get_channel_layer
        from django.contrib.sessions.models import Session
        from sevenshades.asgi import application

        cache.clear()
        user = SignUp.objects.create(mobileno='8000000001', emailid='socket@example.test', password=PASSWORD)
        TryOrder.objects.create(order_id='socket-own', mobileno=user.pk)
        TryOrder.objects.create(order_id='socket-other', mobileno='other')
        client = APIClient(enforce_csrf_checks=True)
        token = client.get('/api/auth_csrf').json()['csrfToken']
        response = client.post('/api/check_costumer_login', {'mobileno': user.pk, 'password': PASSWORD}, format='json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 200)
        session_key = client.cookies['sessionid'].value
        headers = [(b'origin', b'http://127.0.0.1:3000'), (b'cookie', ('sessionid=' + session_key).encode())]

        async def exercise():
            for order, request_headers in [
                ('socket-own', [(b'origin', b'http://127.0.0.1:3000')]),
                ('socket-other', headers),
                ('socket-own', [(b'origin', b'https://untrusted.example'), headers[1]]),
            ]:
                socket = WebsocketCommunicator(application, f'/ws/order/{order}/', headers=request_headers)
                connected, _ = await socket.connect()
                self.assertFalse(connected)
                await socket.disconnect()
            socket = WebsocketCommunicator(application, '/ws/order/socket-own/', headers=headers)
            connected, _ = await socket.connect()
            self.assertTrue(connected)
            await sync_to_async(lambda: Session.objects.filter(session_key=session_key).delete())()
            await get_channel_layer().group_send('order_socket-own', {'type': 'order_status_updated', 'data': {'status': 'test'}})
            event = await socket.receive_output()
            self.assertEqual(event['type'], 'websocket.close')
            await socket.disconnect()

        async_to_sync(exercise)()
