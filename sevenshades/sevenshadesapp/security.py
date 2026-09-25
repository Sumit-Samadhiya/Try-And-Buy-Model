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
PUBLIC = {'auth/send-otp', 'auth/verify-otp', 'otp_config', 'otp_request', 'otp_login', 'reset_password', 'signup_submit', 'check_costumer_login', 'check_admin_login', 'delivery_rider_login',
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
                    'scan_tamper_proof_tag', 'process_return', 'rider_tickets', 'rider_create_ticket',
                    'optimize_route'}



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
    from .rate_limiter import check_account_backoff, record_auth_failure, reset_account_backoff, rate_limit_response
    is_blocked, retry_after = check_account_backoff(identifier)
    if is_blocked:
        return None, rate_limit_response(
            f'Too many login attempts. Please try again in {retry_after} second{"s" if retry_after != 1 else ""}.',
            retry_after=retry_after
        )
    if role == 'rider':
        from django.db.models import Q
        account = ACCOUNTS['rider'].objects.filter(Q(phone=identifier) | Q(rider_id=identifier)).first()
    else:
        field = {'customer': 'mobileno', 'admin': 'emailid'}[role]
        account = ACCOUNTS[role].objects.filter(**{field: identifier}).first()
    if not account:
        make_password(password)  # Keep missing-account checks comparable to password checks.
        record_auth_failure(identifier)
        return None, failure('Invalid credentials', 401)
    if not check_password(password, account.password) or (role == 'rider' and account.status != 'Active'):
        record_auth_failure(identifier)
        return None, failure('Invalid credentials', 401)
    reset_account_backoff(identifier)
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
        bearer = request.META.get('HTTP_AUTHORIZATION', '').startswith('Bearer ')
        if bearer:
            from .mobile_tokens import bearer_actor
            role, account = bearer_actor(request)
            if not account:
                return failure('Invalid or expired authentication token.', 401)
        request.account_role, request.account = role, account
        public = endpoint in PUBLIC or public_catalog
        if not public and not account:
            return failure('Please sign in.', 401)
        allowed = {'admin'}
        if endpoint == 'rider_location':
            allowed = {'rider'}
        elif endpoint in {'settlement_detail', 'receipt_download', 'generate_invoice'}:
            allowed = {'customer', 'rider', 'admin'}

        elif endpoint == 'cancel_trial':
            allowed = {'customer', 'admin'}
        elif endpoint in CUSTOMER_FIELDS:
            allowed = {'customer'}
        elif endpoint in ORDER_OPERATIONS or endpoint in RIDER_OPERATIONS:
            allowed = {'admin', 'rider'}
        if not public and role not in allowed:
            return failure('You do not have access to this action.')

        from .rate_limiter import (
            get_endpoint_category, check_ip_rate_limit, check_user_rate_limit,
            check_account_backoff, record_auth_failure, reset_account_backoff,
            extract_auth_identifier, rate_limit_response
        )
        category = get_endpoint_category(endpoint, bool(account), public_catalog)

        # IP-level rate limiting (stricter on auth, moderate on public)
        ip_allowed, ip_retry_after = check_ip_rate_limit(request, category)
        if not ip_allowed:
            return rate_limit_response(
                f'Too many requests. Please try again in {ip_retry_after} second{"s" if ip_retry_after != 1 else ""}.',
                retry_after=ip_retry_after
            )

        # User-level rate limiting for authenticated user actions (looser limits)
        if category == 'AUTHENTICATED':
            user_allowed, user_retry_after = check_user_rate_limit(role, account.pk)
            if not user_allowed:
                return rate_limit_response(
                    f'Request rate limit exceeded. Please wait {user_retry_after} second{"s" if user_retry_after != 1 else ""}.',
                    retry_after=user_retry_after
                )

        if request.method not in ('GET', 'HEAD', 'OPTIONS') and not (bearer and account):
            csrf = JsonCsrfCheck(lambda req: None)
            csrf.process_request(request)
            rejected = csrf.process_view(request, lambda req: None, (), {})
            if rejected:
                return rejected

        # Parse only after authorization, so anonymous uploads never reach file handling.
        try:
            if request.content_type == 'application/json' and len(request.body) > 1048576:
                return failure('Request is too large.', 413)
            if request.content_type == 'application/json':
                data = json.loads(request.body or b'{}')
            elif request.method == 'GET':
                data = request.GET
            else:
                data = request.POST
            if not hasattr(data, 'get'):
                return failure('Expected an object.', 400)
        except (ValueError, UnicodeError):
            return failure('Invalid request body.', 400)

        # Account-level exponential backoff check for auth routes
        auth_identifier = None
        if category == 'AUTH':
            auth_identifier = extract_auth_identifier(data)
            if auth_identifier:
                is_blocked, acc_retry_after = check_account_backoff(auth_identifier)
                if is_blocked:
                    return rate_limit_response(
                        f'Too many attempts for this account. Please wait {acc_retry_after} second{"s" if acc_retry_after != 1 else ""}.',
                        retry_after=acc_retry_after
                    )

        if endpoint in CUSTOMER_FIELDS:
            supplied = data.get(CUSTOMER_FIELDS[endpoint])
            if supplied is not None and str(supplied) != str(account.pk):
                return failure('You can only access your own account.')
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

        from .request_validation import validate_request
        errors = validate_request(endpoint, data, request.FILES)
        if errors:
            return JsonResponse({'status': False, 'message': ' '.join(messages[0] for messages in errors.values()), 'errors': errors}, status=400)

        response = view(request, *args, **kwargs)

        # Update auth backoff state based on response
        if category == 'AUTH' and auth_identifier and hasattr(response, 'status_code'):
            if 200 <= response.status_code < 300:
                reset_account_backoff(auth_identifier)
            elif response.status_code in (400, 401) and endpoint in {'reset_password', 'otp_login', 'signup_submit', 'auth/verify-otp'}:
                record_auth_failure(auth_identifier)

        return response
    return guarded
