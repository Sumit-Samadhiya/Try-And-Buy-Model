"""Configurable sliding-window rate limiting with exponential backoff for authentication."""
import os
import time
from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse
from django.utils.crypto import salted_hmac


AUTH_ENDPOINTS = {
    'check_costumer_login',
    'check_admin_login',
    'delivery_rider_login',
    'signup_submit',
    'reset_password',
    'otp_request',
    'otp_login',
    'auth/send-otp',
    'auth/verify-otp',
}

PUBLIC_ENDPOINTS = {
    'otp_config',
    'auth_csrf',
    'auth_session',
    'auth_logout',
    'payment_capabilities',
    'fetch_product_reviews',
    'user_main_category_list',
    'user_maincategory_list',
    'user_category_list',
    'user_mysubcategory_list_by_maincategoryid',
    'user_subcategory_list',
    'user_brand_list',
    'user_banner_list',
    'user_product_list',
    'user_products_maincategory',
    'user_productsdetails_by_id',
}


def get_endpoint_category(endpoint, has_account, public_catalog=False):
    if endpoint in AUTH_ENDPOINTS:
        return 'AUTH'
    if endpoint in PUBLIC_ENDPOINTS or public_catalog:
        return 'PUBLIC'
    if has_account:
        return 'AUTHENTICATED'
    return 'PUBLIC'

DEFAULT_RATE_LIMITS = {
    'AUTH': {
        'IP_MAX_REQUESTS': 100,
        'IP_WINDOW': 60,
        'ACCOUNT_MAX_ATTEMPTS': 10,
        'ACCOUNT_WINDOW': 900,
        'BACKOFF_BASE': 2.0,
        'BACKOFF_FACTOR': 2.0,
        'BACKOFF_MAX': 300,
    },
    'PUBLIC': {
        'MAX_REQUESTS': 120,
        'WINDOW': 60,
    },
    'AUTHENTICATED': {
        'MAX_REQUESTS': 300,
        'WINDOW': 60,
    },
}


def get_rate_limit_config():
    configured = getattr(settings, 'RATE_LIMITS', {})
    config = {}
    for section, defaults in DEFAULT_RATE_LIMITS.items():
        config[section] = dict(defaults)
        if section in configured:
            config[section].update(configured[section])
    return config


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR', '')
    return ip or '127.0.0.1'


def normalize_identifier(identifier):
    if not identifier:
        return ''
    identifier = str(identifier).strip()
    return identifier.lower() if '@' in identifier else identifier


def extract_auth_identifier(data):
    if not hasattr(data, 'get'):
        return None
    for field in ('mobileno', 'phone', 'emailid', 'email', 'rider_id', 'username'):
        val = data.get(field)
        if val is not None and isinstance(val, (str, int)):
            s = str(val).strip()
            if s:
                return normalize_identifier(s)
    return None


def rate_limit_response(message, retry_after, status=429):
    response = JsonResponse({
        'status': False,
        'message': message,
        'retry_after': int(retry_after),
        'data': []
    }, status=status)
    response['Retry-After'] = str(int(retry_after))
    return response


def check_sliding_window(key, max_requests, window_seconds):
    """
    True sliding-window counter using timestamps stored in cache.
    Returns (allowed: bool, retry_after: int).
    """
    now = time.time()
    cutoff = now - window_seconds
    timestamps = cache.get(key) or []
    # Filter timestamps within current sliding window
    timestamps = [t for t in timestamps if t > cutoff]

    if len(timestamps) >= max_requests:
        earliest = timestamps[0]
        retry_after = max(1, int(earliest + window_seconds - now + 0.999))
        return False, retry_after

    timestamps.append(now)
    cache.set(key, timestamps, timeout=int(window_seconds))
    return True, 0


def check_ip_rate_limit(request, category):
    """Checks IP-level sliding window rate limit for given category ('AUTH', 'PUBLIC', 'AUTHENTICATED')."""
    config = get_rate_limit_config().get(category, {})
    if category == 'AUTH':
        max_requests = config.get('IP_MAX_REQUESTS', 30)
        window = config.get('IP_WINDOW', 60)
    else:
        max_requests = config.get('MAX_REQUESTS', 120)
        window = config.get('WINDOW', 60)

    ip = get_client_ip(request)
    ip_hash = salted_hmac('rate-limit-ip', f'{category}:{ip}').hexdigest()
    key = f'rl:ip:{category}:{ip_hash}'
    return check_sliding_window(key, max_requests, window)


def check_user_rate_limit(role, account_id):
    """Checks per-user sliding window rate limit for authenticated user actions."""
    config = get_rate_limit_config().get('AUTHENTICATED', {})
    max_requests = config.get('MAX_REQUESTS', 300)
    window = config.get('WINDOW', 60)

    key = f'rl:user:{role}:{account_id}'
    return check_sliding_window(key, max_requests, window)


def get_auth_account_key(identifier):
    norm = normalize_identifier(identifier)
    return 'rl:auth_acc:' + salted_hmac('rate-limit-auth-acc', norm).hexdigest()


def check_account_backoff(identifier):
    """
    Checks if account is currently in exponential backoff cooldown.
    Returns (is_blocked: bool, retry_after: int).
    """
    if not identifier:
        return False, 0
    key = get_auth_account_key(identifier)
    state = cache.get(key)
    if not state:
        return False, 0

    now = time.time()
    cooldown_until = state.get('cooldown_until', 0)
    if now < cooldown_until:
        retry_after = max(1, int(cooldown_until - now + 0.999))
        return True, retry_after

    return False, 0


def record_auth_failure(identifier):
    """
    Records a failed authentication attempt for the account and applies
    exponential backoff cooldown once threshold is reached.
    Returns (cooldown_active: bool, delay_seconds: int).
    """
    if not identifier:
        return False, 0

    config = get_rate_limit_config().get('AUTH', {})
    max_attempts = config.get('ACCOUNT_MAX_ATTEMPTS', 10)
    window = config.get('ACCOUNT_WINDOW', 900)
    base = config.get('BACKOFF_BASE', 2.0)
    factor = config.get('BACKOFF_FACTOR', 2.0)
    max_delay = config.get('BACKOFF_MAX', 300)

    key = get_auth_account_key(identifier)
    state = cache.get(key) or {'attempts': 0, 'cooldown_until': 0}
    now = time.time()

    state['attempts'] += 1
    state['last_attempt'] = now

    if state['attempts'] >= max_attempts:
        level = state['attempts'] - max_attempts + 1
        delay = min(base * (factor ** (level - 1)), max_delay)
        state['cooldown_until'] = now + delay
        state['current_delay'] = delay
        cache.set(key, state, timeout=int(window))
        return True, int(delay)

    cache.set(key, state, timeout=int(window))
    return False, 0


def reset_account_backoff(identifier):
    """Clears backoff state upon successful authentication."""
    if not identifier:
        return
    key = get_auth_account_key(identifier)
    cache.delete(key)
