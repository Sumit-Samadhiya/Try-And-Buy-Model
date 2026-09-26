"""Firebase Admin initialization and verified phone identity."""
import json
import logging
import os
from pathlib import Path
from threading import Lock
import firebase_admin
from firebase_admin import credentials, auth
from django.conf import settings

logger = logging.getLogger(__name__)
_lock = Lock()


def get_firebase_app():
    with _lock:
        try:
            return firebase_admin.get_app('sevenshades-phone')
        except ValueError:
            pass
        raw = os.environ.get('FIREBASE_SERVICE_ACCOUNT_JSON', '').strip()
        path = Path(os.environ.get('FIREBASE_CREDENTIALS_PATH') or
                    Path(settings.BASE_DIR) / 'ry-and-buy-auth-firebase-adminsdk.json')
        if not path.is_absolute():
            path = Path(settings.BASE_DIR) / path
        cert = credentials.Certificate(json.loads(raw) if raw else str(path))
        project_id = os.environ.get('FIREBASE_PROJECT_ID', 'ry-and-buy-auth')
        if cert.project_id != project_id:
            raise ValueError('Firebase service account project mismatch.')
        return firebase_admin.initialize_app(cert, {'projectId': project_id}, name='sevenshades-phone')


def verify_firebase_id_token(id_token):
    try:
        app = get_firebase_app()
    except Exception:
        logger.error('Firebase Admin credentials could not be initialized.')
        return None, 'unavailable'
    try:
        return auth.verify_id_token(id_token, app=app, check_revoked=True), None
    except (auth.InvalidIdTokenError, auth.ExpiredIdTokenError,
            auth.RevokedIdTokenError, auth.UserDisabledError, ValueError):
        return None, 'invalid'
    except Exception:
        logger.warning('Firebase verification service unavailable.')
        return None, 'unavailable'
