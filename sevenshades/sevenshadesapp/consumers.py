import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

class OrderConsumer(AsyncWebsocketConsumer):
    @database_sync_to_async
    def authorized(self):
        from .security import session_actor, owns_order
        from .models import TryOrder
        from django.contrib.sessions.backends.db import SessionStore
        role, account = session_actor(SessionStore(session_key=self.scope['session'].session_key))
        order = TryOrder.objects.filter(order_id=self.order_id).first()
        return bool(account and order and owns_order(role, account, order))

    async def connect(self):
        self.order_id = self.scope['url_route']['kwargs']['order_id']
        self.room_group_name = f'order_{self.order_id}'
        if not await self.authorized():
            await self.close(code=4403)
            return

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data=None, bytes_data=None):
        if not text_data:
            return
        try:
            payload = json.loads(text_data)
            msg_type = payload.get('type')
            if msg_type in ('RIDER_LOCATION_UPDATE', 'rider_location_update'):
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'rider_location_updated',
                        'data': payload.get('data', {})
                    }
                )
        except Exception:
            pass

    async def rider_location_updated(self, event):
        await self.send(text_data=json.dumps({
            'type': 'RIDER_LOCATION_UPDATED',
            'data': event['data']
        }))

    async def order_status_updated(self, event):
        if not await self.authorized():
            await self.close(code=4403)
            return
        await self.send(text_data=json.dumps({
            'type': 'ORDER_STATUS_UPDATED',
            'data': event['data']
        }))


class AccountOrdersConsumer(OrderConsumer):
    @database_sync_to_async
    def actor_group(self):
        from django.contrib.sessions.backends.db import SessionStore
        from .security import session_actor
        role, account = session_actor(SessionStore(session_key=self.scope['session'].session_key))
        if not account:
            return None
        return 'account_admin' if role == 'admin' else f'account_{role}_{account.pk}'

    async def authorized(self):
        return await self.actor_group() == self.room_group_name

    async def connect(self):
        self.room_group_name = await self.actor_group()
        if not self.room_group_name:
            await self.close(code=4403)
            return
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if self.room_group_name:
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
