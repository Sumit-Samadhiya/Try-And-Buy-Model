import os
import json
import logging
from pathlib import Path
import firebase_admin
from firebase_admin import credentials, auth as fb_auth
from django.conf import settings

logger = logging.getLogger(__name__)

_app = None

def get_firebase_app():
    global _app
    if _app is not None:
        return _app

    if firebase_admin._apps:
        _app = firebase_admin.get_app()
        return _app

    # Option 1: FIREBASE_SERVICE_ACCOUNT_JSON environment variable (e.g. for Render cloud deployment)
    cred_json = os.environ.get('FIREBASE_SERVICE_ACCOUNT_JSON', '').strip()
    if cred_json:
        try:
            cert_dict = json.loads(cred_json)
            cred = credentials.Certificate(cert_dict)
            _app = firebase_admin.initialize_app(cred)
            logger.info("Firebase Admin initialized from FIREBASE_SERVICE_ACCOUNT_JSON env.")
            return _app
        except Exception as e:
            logger.error(f"Failed to initialize Firebase Admin from FIREBASE_SERVICE_ACCOUNT_JSON: {e}")

    # Option 2: JSON file path
    file_path = os.environ.get('FIREBASE_CREDENTIALS_PATH')
    if not file_path:
        default_file = Path(settings.BASE_DIR) / 'ry-and-buy-auth-firebase-adminsdk.json'
        if default_file.exists():
            file_path = str(default_file)
        else:
            matches = list(Path(settings.BASE_DIR).glob('*adminsdk*.json'))
            if matches:
                file_path = str(matches[0])

    if file_path and os.path.exists(file_path):
        try:
            cred = credentials.Certificate(file_path)
            _app = firebase_admin.initialize_app(cred)
            logger.info(f"Firebase Admin initialized from {file_path}")
            return _app
        except Exception as e:
            logger.error(f"Failed to initialize Firebase Admin from {file_path}: {e}")

    logger.warning("No Firebase Admin credentials found.")
    return None


def verify_firebase_id_token(id_token: str):
    app = get_firebase_app()
    if not app:
        return None, "Firebase Admin SDK is not configured."
    try:
        decoded_token = fb_auth.verify_id_token(id_token, app=app)
        return decoded_token, None
    except Exception as exc:
        logger.warning(f"Firebase token verification failed: {exc}")
        return None, str(exc)
