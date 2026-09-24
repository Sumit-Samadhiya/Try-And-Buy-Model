"""Session authentication and fail-closed authorization for the custom account models."""
import json
from functools import wraps

from django.contrib.auth.hashers import check_password, make_password
from django.core.cache import cache
from django.http import JsonResponse
from django.middleware.csrf import CsrfViewMiddleware, rotate_token
from django.utils.crypto import constant_time_compare, salted_hmac

from .models import AdminLogin, SignUp, DeliveryRider, DeliveryAssignment, TryOrder, TamperProofTag, FinalOrderItem


ACCOUNTS = {'customer': SignUp, 'admin': AdminLogin, 'rider': DeliveryRider}
PUBLIC = {'otp_config', 'otp_request', 'otp_login', 'reset_password', 'signup_submit', 'check_costumer_login', 'check_admin_login', 'delivery_rider_login',
          'auth_csrf', 'auth_session', 'auth_logout', 'fetch_product_reviews', 'payment_capabilities'}
CUSTOMER_FIELDS = {'customer_tickets': 'mobileno', 'create_ticket': 'mobileno',
    'fetch_user_address': 'mobile', 'address_submit': 'mobileno',
    'address_update': 'mobile', 'address_delete': 'mobile',
    'try_order_create': 'mobileno', 'user_order_lifecycle_list': 'mobileno',
    'submit_product_review': 'user_mobile',
    'address_location': 'mobileno', 'customer_approve_bill': 'mobileno', 'payment_create': 'mobileno', 'payment_verify': 'mobileno', 'payment_reconcile': 'mobileno',
}
ORDER_OPERATIONS = {'delivery_selection_update', 'submit_final_selection', 'final_payment_update', 'trial_return_items'}
RIDER_OPERATIONS = {'delivery_assignment_update_status', 'delivery_rider_tasks',
                    'scan_tamper_proof_tag', 'process_return'}


def failure(message, status=403):
    return JsonResponse({'status': False, 'message': message, 'data': []}, status=status)


def fingerprint(account):
    return salted_hmac('sevenshades.account-session', account.password).hexdigest()


def session_actor(session):
    role = session.get('account_role')
    model = ACCOUNTS.get(role)
    if not model:
        return None, None
    account = model.objects.filter(pk=session.get('account_id')).first()
    if not account or (role == 'rider' and account.status != 'Active'):
        return None, None
    if not constant_time_compare(session.get('account_fingerprint', ''), fingerprint(account)):
        return None, None
    return role, account


def establish_session(request, role, account):
    request.session.flush()
    request.session['account_role'] = role
    request.session['account_id'] = str(account.pk)
    request.session['account_fingerprint'] = fingerprint(account)
    request.session.set_expiry(8 * 60 * 60)
    rotate_token(request)


def authenticate_account(request, role, identifier, password):
    # Limit repeated guesses without storing the submitted credentials in cache/logs.
    key = 'login:' + salted_hmac('login-limit', f'{role}:{identifier}:{request.META.get("REMOTE_ADDR", "")}').hexdigest()
    cache.add(key, 0, timeout=300)
    if cache.incr(key) > 10:
        return None, failure('Too many login attempts. Please try again later.', 429)
    field = {'customer': 'mobileno', 'admin': 'emailid', 'rider': 'phone'}[role]
    account = ACCOUNTS[role].objects.filter(**{field: identifier}).first()
    if not account:
        make_password(password)  # Keep missing-account checks comparable to password checks.
        return None, failure('Invalid credentials', 401)
    if not check_password(password, account.password) or (role == 'rider' and account.status != 'Active'):
        return None, failure('Invalid credentials', 401)
    cache.delete(key)
    establish_session(request, role, account)
    return account, None


def owns_order(role, account, order):
    if role == 'admin':
        return True
    if role == 'customer':
        return order.mobileno == account.mobileno
    return role == 'rider' and DeliveryAssignment.objects.filter(try_order=order, rider=account).exists()


class JsonCsrfCheck(CsrfViewMiddleware):
    def _reject(self, request, reason):
        return failure('Security token expired or missing. Refresh and try again.', 403)


def protect_api(view, endpoint, public_catalog=False):
    """Every routed API is admin-only unless explicitly granted narrower access here."""
    @wraps(view)
    def guarded(request, *args, **kwargs):
        role, account = session_actor(request.session)
        request.account_role, request.account = role, account
        public = endpoint in PUBLIC or public_catalog
        if not public and not account:
            return failure('Please sign in.', 401)
        allowed = {'admin'}
        if endpoint == 'rider_location':
            allowed = {'rider'}
        elif endpoint in {'settlement_detail', 'receipt_download'}:
            allowed = {'customer', 'rider', 'admin'}
        elif endpoint == 'cancel_trial':
            allowed = {'customer', 'admin'}
        elif endpoint in CUSTOMER_FIELDS:
            allowed = {'customer'}
        elif endpoint in ORDER_OPERATIONS or endpoint in RIDER_OPERATIONS:
            allowed = {'admin', 'rider'}
        if not public and role not in allowed:
            return failure('You do not have access to this action.')

        if request.method not in ('GET', 'HEAD', 'OPTIONS'):
            csrf = JsonCsrfCheck(lambda req: None)
            csrf.process_request(request)
            rejected = csrf.process_view(request, lambda req: None, (), {})
            if rejected:
                return rejected

        # Parse only after authorization, so anonymous uploads never reach file handling.
        try:
            if request.content_type == 'application/json' and len(request.body) > 1048576:
                return failure('Request is too large.', 413)
            data = json.loads(request.body or b'{}') if request.content_type == 'application/json' else request.POST
            if not hasattr(data, 'get'):
                return failure('Expected an object.', 400)
        except (ValueError, UnicodeError):
            return failure('Invalid request body.', 400)

        if endpoint in CUSTOMER_FIELDS:
            supplied = data.get(CUSTOMER_FIELDS[endpoint])
            if supplied is not None and str(supplied) != str(account.pk):
                return failure('You can only access your own account.')
        from .request_validation import validate_request
        errors = validate_request(endpoint, data, request.FILES)
        if errors:
            return JsonResponse({'status': False, 'message': ' '.join(messages[0] for messages in errors.values()), 'errors': errors}, status=400)
        if endpoint == 'delivery_rider_tasks' and role == 'rider':
            if data.get('phone') not in (None, account.phone):
                return failure('You can only access your own tasks.')
        if endpoint in ORDER_OPERATIONS:
            order = TryOrder.objects.filter(order_id=data.get('order_id')).first()
            if not order or not owns_order(role, account, order):
                return failure('Order not found.', 404)
        if endpoint == 'delivery_assignment_update_status' and role == 'rider':
            if not DeliveryAssignment.objects.filter(assignment_id=data.get('assignment_id'), rider=account).exists():
                return failure('Assignment not found.', 404)
        if endpoint == 'scan_tamper_proof_tag' and role == 'rider':
            tag = TamperProofTag.objects.filter(tag_id=data.get('tag_id')).select_related('final_order_item__final_order__try_order').first()
            item = tag.final_order_item if tag else None
            if not item or not owns_order(role, account, item.final_order.try_order):
                return failure('Item not found.', 404)
        return view(request, *args, **kwargs)
    return guarded
