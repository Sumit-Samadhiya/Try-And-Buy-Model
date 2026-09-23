import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.urls import path
from sevenshadesapp.consumers import OrderConsumer

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sevenshades.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter([
            path("ws/order/<str:order_id>/", OrderConsumer.as_asgi()),
        ])
    ),
})
