import json
from django.apps import AppConfig
from django.db.backends.signals import connection_created


def _register_sqlite_functions(sender, connection, **kwargs):
    if connection.vendor == 'sqlite':
        def _json_valid(val):
            if val is None:
                return 0
            try:
                json.loads(val)
                return 1
            except Exception:
                return 0
        try:
            connection.connection.create_function('JSON_VALID', 1, _json_valid)
        except Exception:
            pass


class SevenshadesappConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'sevenshadesapp'

    def ready(self):
        connection_created.connect(_register_sqlite_functions)
