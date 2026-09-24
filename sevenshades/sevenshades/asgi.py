import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import OriginValidator
from django.conf import settings
from django.urls import path
from sevenshadesapp.consumers import OrderConsumer, AccountOrdersConsumer

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sevenshades.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": OriginValidator(AuthMiddlewareStack(
        URLRouter([
            path("ws/orders/", AccountOrdersConsumer.as_asgi()),
            path("ws/order/<str:order_id>/", OrderConsumer.as_asgi()),
        ])
    ), settings.CORS_ALLOWED_ORIGINS),
})
