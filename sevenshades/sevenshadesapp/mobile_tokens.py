"""Customer-only JWTs, bound to the current password fingerprint and revocable."""
import time
import uuid
from datetime import datetime, timezone as dt_timezone
import jwt
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
from django.utils.crypto import constant_time_compare
from .models import RevokedToken, SignUp


def issue_token(account):
    from .security import fingerprint
    now = int(time.time())
    claims = {'sub': str(account.pk), 'role': 'customer', 'fp': fingerprint(account),
              'iat': now, 'exp': now + 3600, 'jti': uuid.uuid4().hex,
              'iss': 'sevenshades', 'aud': 'sevenshades-customer'}
    return jwt.encode(claims, settings.SECRET_KEY, algorithm='HS256')


def is_revoked(jti):
    """Cache is the fast path; the table is the durable answer."""
    if cache.get('revoked_jwt_' + jti):
        return True
    if RevokedToken.objects.filter(jti=jti).exists():
        # Warm the cache so repeated calls skip the query until expiry.
        cache.set('revoked_jwt_' + jti, True, timeout=3600)
        return True
    return False


def bearer_actor(request):
    from .security import fingerprint
    header = request.META.get('HTTP_AUTHORIZATION', '')
    if not header.startswith('Bearer '):
        return None, None
    try:
        claims = jwt.decode(header[7:], settings.SECRET_KEY, algorithms=['HS256'],
            issuer='sevenshades', audience='sevenshades-customer',
            options={'require': ['sub', 'role', 'fp', 'iat', 'exp', 'jti']})
        if claims['role'] != 'customer' or is_revoked(claims['jti']):
            return None, None
        account = SignUp.objects.filter(pk=claims['sub']).first()
        if not account or not constant_time_compare(claims['fp'], fingerprint(account)):
            return None, None
        request.customer_token_claims = claims
        return 'customer', account
    except (jwt.PyJWTError, TypeError, KeyError):
        return None, None


def revoke_token(request):
    claims = getattr(request, 'customer_token_claims', None)
    if not claims:
        return
    expires_at = datetime.fromtimestamp(claims['exp'], tz=dt_timezone.utc)
    RevokedToken.objects.get_or_create(jti=claims['jti'], defaults={'expires_at': expires_at})
    cache.set('revoked_jwt_' + claims['jti'], True, timeout=max(1, claims['exp'] - int(time.time())))
    # Opportunistic prune; revoked rows are worthless once the token has expired.
    RevokedToken.objects.filter(expires_at__lt=timezone.now()).delete()
