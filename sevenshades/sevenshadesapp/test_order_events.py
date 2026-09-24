from asgiref.sync import async_to_sync, sync_to_async
from channels.testing import WebsocketCommunicator
from django.contrib.sessions.backends.db import SessionStore
from django.test import TransactionTestCase
from .models import SignUp, AdminLogin, TryOrder
from .security import fingerprint
from .order_events import order_changed


class AccountEventTests(TransactionTestCase):
    def test_order_events_reach_customer_and_admin_but_not_other_customers(self):
        from sevenshades.asgi import application
        own = SignUp.objects.create(mobileno='8000000041', emailid='event-own@example.test', password='Event-test-472!')
        other = SignUp.objects.create(mobileno='8000000042', emailid='event-other@example.test', password='Event-test-472!')
        admin = AdminLogin.objects.create(emailid='event-admin@example.test', mobileno='8000000043', password='Event-test-472!')
        order = TryOrder.objects.create(order_id='EVENT-ORDER', mobileno=own.pk)
        sessions = []
        for role, account in [('customer', own), ('customer', other), ('admin', admin)]:
            session = SessionStore()
            session['account_role'], session['account_id'], session['account_fingerprint'] = role, str(account.pk), fingerprint(account)
            session.save()
            sessions.append(session)
        async def scenario():
            sockets = [WebsocketCommunicator(application, '/ws/orders/', headers=[(b'origin', b'http://127.0.0.1:3000'), (b'cookie', ('sessionid=' + session.session_key).encode())]) for session in sessions]
            for socket in sockets:
                self.assertTrue((await socket.connect())[0])
            await sync_to_async(order_changed)(order, 'bill_generated')
            self.assertEqual((await sockets[0].receive_json_from())['data']['order_id'], order.order_id)
            self.assertEqual((await sockets[2].receive_json_from())['data']['reason'], 'bill_generated')
            self.assertTrue(await sockets[1].receive_nothing(timeout=0.1))
            await sync_to_async(sessions[0].delete)()
            await sync_to_async(order_changed)(order, 'payment_captured')
            self.assertEqual((await sockets[0].receive_output())['code'], 4403)
            await sockets[2].receive_json_from()
            for socket in sockets:
                await socket.disconnect()
        async_to_sync(scenario)()
