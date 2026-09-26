"""Strict schema validation for all routed API inputs.

Validates input types, lengths, and formats against explicit schemas and rejects
any mismatched, malformed, or unexpected fields (no silent sanitization or escaping).
"""
import re
from datetime import date
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from PIL import Image, UnidentifiedImageError

# Strict format regexes
RE_MOBILE = re.compile(r'^[6-9]\d{9}$')
RE_PIN = re.compile(r'^[1-9]\d{5}$')
RE_OTP = re.compile(r'^\d{6}$')
RE_SLUG_ID = re.compile(r'^[A-Za-z0-9_-]{1,40}$')
RE_RIDER_ID = re.compile(r'^[A-Za-z0-9_-]{1,30}$')
RE_BIKE_NUMBER = re.compile(r'^[A-Za-z0-9 -]{1,40}$')
RE_CONTROL_CHARS = re.compile(r'[\x00-\x08\x0b\x0c\x0e-\x1f]')

# Explicit schemas for routed endpoints: allowed fields, required fields, and choice sets
ENDPOINT_SCHEMAS = {
    'signup_submit': {
        'required': ['mobileno', 'fname', 'lname', 'emailid', 'password', 'confirm_password', 'otp', 'challenge_id'],
        'allowed': {'mobileno', 'fname', 'lname', 'emailid', 'password', 'confirm_password', 'otp', 'challenge_id'}
    },
    'check_costumer_login': {
        'required': ['mobileno', 'password'],
        'allowed': {'mobileno', 'password'}
    },
    'check_admin_login': {
        'required': ['emailid', 'password'],
        'allowed': {'emailid', 'password'}
    },
    'delivery_rider_login': {
        'required': ['password'],
        'allowed': {'phone', 'rider_id', 'username', 'password'}
    },
    'otp_request': {
        'required': ['mobileno', 'purpose'],
        'allowed': {'mobileno', 'purpose'}
    },
    'otp_login': {
        'required': ['mobileno', 'otp', 'challenge_id'],
        'allowed': {'mobileno', 'otp', 'challenge_id'}
    },
    'reset_password': {
        'required': ['mobileno', 'otp', 'challenge_id', 'password', 'confirm_password'],
        'allowed': {'mobileno', 'otp', 'challenge_id', 'password', 'confirm_password'}
    },
    'auth/send-otp': {
        'required': ['phone'],
        'allowed': {'phone'}
    },
    'auth/verify-otp': {
        'required': ['phone', 'otp'],
        'allowed': {'phone', 'otp'}
    },
    'fetch_user_address': {
        'required': [],
        'allowed': {'mobile', 'mobileno'}
    },
    'address_submit': {
        'required': ['address', 'city', 'country', 'postcode', 'address_type'],
        'allowed': {'address', 'city', 'country', 'postcode', 'address_type', 'state', 'landmark', 'alt_phone', 'mobileno'}
    },
    'address_update': {
        'required': ['address', 'city', 'country', 'postcode', 'address_type'],
        'allowed': {'id', 'address', 'city', 'country', 'postcode', 'address_type', 'state', 'landmark', 'alt_phone', 'mobile', 'mobileno'}
    },
    'address_delete': {
        'required': ['id'],
        'allowed': {'id', 'mobile', 'mobileno'}
    },
    'address_location': {
        'required': [],
        'allowed': {'address_id', 'latitude', 'longitude', 'mobileno'}
    },
    'try_order_create': {
        'required': ['items'],
        'allowed': {
            'address_id', 'address', 'delivery_mode', 'delivery_slot',
            'delivery_date', 'scheduled_date', 'items', 'notes', 'mobileno'
        }
    },
    'delivery_selection_update': {
        'required': ['order_id'],
        'allowed': {'order_id', 'selected_item_ids'}
    },
    'submit_final_selection': {
        'required': ['order_id'],
        'allowed': {'order_id', 'selected_items'}
    },
    'final_payment_update': {
        'required': ['order_id', 'payment_mode'],
        'allowed': {'order_id', 'payment_mode', 'payment_status', 'bill_revision'}
    },
    'customer_approve_bill': {
        'required': ['order_id', 'bill_revision'],
        'allowed': {'order_id', 'bill_revision', 'payment_mode', 'mobileno'}
    },
    'user_order_lifecycle_list': {
        'required': [],
        'allowed': {'mobileno'}
    },
    'admin_order_lifecycle_list': {
        'required': [],
        'allowed': {'filter', 'status', 'limit'}
    },
    'cancel_trial': {
        'required': ['order_id'],
        'allowed': {'order_id'}
    },
    'delivery_rider_create': {
        'required': ['name', 'phone', 'password', 'bike_number', 'zone'],
        'allowed': {'name', 'phone', 'password', 'bike_number', 'zone', 'status'}
    },
    'delivery_rider_update': {
        'required': [],
        'allowed': {'id', 'phone', 'name', 'bike_number', 'zone', 'status'}
    },
    'delivery_assign_order': {
        'required': ['order_id', 'rider_id'],
        'allowed': {'order_id', 'rider_id', 'status'}
    },
    'delivery_order_reassign': {
        'required': ['order_id', 'rider_id'],
        'allowed': {'order_id', 'rider_id'}
    },
    'delivery_assignment_update_status': {
        'required': ['assignment_id', 'status'],
        'allowed': {'assignment_id', 'status'}
    },
    'delivery_rider_tasks': {
        'required': [],
        'allowed': {'phone', 'rider_id'}
    },
    'generate_delivery_batch': {
        'required': [],
        'allowed': {'rider_id', 'max_orders'}
    },
    'optimize_route': {
        'required': ['batch_id'],
        'allowed': {'batch_id', 'start_lat', 'start_lng'}
    },
    'rider_location': {
        'required': ['latitude', 'longitude'],
        'allowed': {'latitude', 'longitude', 'assignment_id'}
    },
    'rider_suggestions': {
        'required': [],
        'allowed': {'order_id', 'address_id', 'lat', 'lng'}
    },
    'scan_tamper_proof_tag': {
        'required': ['tag_id'],
        'allowed': {'tag_id', 'action'}
    },
    'update_hygiene_status': {
        'required': [],
        'allowed': {'item_id', 'return_id', 'action', 'hygiene_status'}
    },
    'process_return': {
        'required': [],
        'allowed': {'try_order_item_id', 'final_order_item_id', 'return_id', 'condition', 'tag_intact', 'scanned_tag', 'status'}
    },
    'trial_return_items': {
        'required': ['order_id'],
        'allowed': {'order_id', 'item_ids'}
    },
    'submit_product_review': {
        'required': ['rating'],
        'allowed': {'product_id', 'product_details_id', 'rating', 'review_text', 'user_mobile'}
    },
    'fetch_product_reviews': {
        'required': [],
        'allowed': {'product_id', 'product_details_id'}
    },
    'create_ticket': {
        'required': ['subject', 'message'],
        'allowed': {'subject', 'message', 'mobileno', 'order_id', 'customer', 'status', 'priority'}
    },
    'customer_tickets': {
        'required': [],
        'allowed': {'mobileno'}
    },
    'rider_create_ticket': {
        'required': ['subject', 'message'],
        'allowed': {'subject', 'message', 'phone', 'order_id'}
    },
    'rider_tickets': {
        'required': [],
        'allowed': {'phone'}
    },
    'admin_ticket_update': {
        'required': ['status'],
        'allowed': {'id', 'ticket_id', 'version', 'status', 'priority', 'response', 'resolution'}
    },
    'settlement_detail': {
        'required': ['order_id'],
        'allowed': {'order_id'}
    },
    'receipt_download': {
        'required': ['order_id'],
        'allowed': {'order_id'}
    },
    'generate_invoice': {
        'required': [],
        'allowed': {'order_id'}
    },
    'payment_create': {
        'required': ['order_id'],
        'allowed': {'order_id', 'purpose', 'amount', 'currency', 'mobileno'}
    },
    'payment_verify': {
        'required': ['order_id'],
        'allowed': {'order_id', 'payment_id', 'signature', 'mobileno'}
    },
    'payment_reconcile': {
        'required': ['order_id'],
        'allowed': {'order_id', 'payment_id', 'mobileno'}
    },
    'maincategory_submit': {
        'required': ['maincategoryname'],
        'allowed': {'maincategoryname'}
    },
    'editmaincategory_data': {
        'required': ['id', 'maincategoryname'],
        'allowed': {'id', 'maincategoryname'}
    },
    'editmaincategory_icon': {
        'required': ['id'],
        'allowed': {'id'}
    },
    'deletemaincategorydata': {
        'required': ['id'],
        'allowed': {'id'}
    },
    'mysubcategory_submit': {
        'required': ['maincategoryid', 'subcategoryname'],
        'allowed': {'maincategoryid', 'subcategoryname'}
    },
    'editmysubcategory_data': {
        'required': ['id', 'maincategoryid', 'subcategoryname'],
        'allowed': {'id', 'maincategoryid', 'subcategoryname'}
    },
    'editmysubcategory_icon': {
        'required': ['id'],
        'allowed': {'id'}
    },
    'deletemysubcategorydata': {
        'required': ['id'],
        'allowed': {'id'}
    },
    'brand_submit': {
        'required': ['brandname'],
        'allowed': {'brandname'}
    },
    'editbrand_data': {
        'required': ['id', 'brandname'],
        'allowed': {'id', 'brandname'}
    },
    'editbrand_icon': {
        'required': ['id'],
        'allowed': {'id'}
    },
    'deletebranddata': {
        'required': ['id'],
        'allowed': {'id'}
    },
    'product_submit': {
        'required': ['maincategoryid', 'subcategoryid', 'brandid', 'productname', 'description'],
        'allowed': {'maincategoryid', 'subcategoryid', 'brandid', 'productname', 'description'}
    },
    'editproduct_data': {
        'required': ['id', 'maincategoryid', 'subcategoryid', 'brandid', 'productname', 'description'],
        'allowed': {'id', 'maincategoryid', 'subcategoryid', 'brandid', 'productname', 'description'}
    },
    'editproduct_icon': {
        'required': ['id'],
        'allowed': {'id'}
    },
    'deleteproductdata': {
        'required': ['id'],
        'allowed': {'id'}
    },
    'productdetails_submit': {
        'required': ['maincategoryid', 'subcategoryid', 'brandid', 'productid', 'productsubname', 'description', 'qty', 'price', 'offerprice', 'color', 'size', 'offertype'],
        'allowed': {'maincategoryid', 'subcategoryid', 'brandid', 'productid', 'productsubname', 'description', 'qty', 'price', 'offerprice', 'color', 'size', 'offertype'}
    },
    'editproductdetails_data': {
        'required': ['id', 'maincategoryid', 'subcategoryid', 'brandid', 'productid', 'productsubname', 'description', 'qty', 'price', 'offerprice', 'color', 'size', 'offertype'],
        'allowed': {'id', 'maincategoryid', 'subcategoryid', 'brandid', 'productid', 'productsubname', 'description', 'qty', 'price', 'offerprice', 'color', 'size', 'offertype', 'expected_qty'}
    },
    'editproductdetails_icon': {
        'required': ['id'],
        'allowed': {'id'}
    },
    'deleteproductdetails': {
        'required': ['id'],
        'allowed': {'id'}
    },
    'banner_submit': {
        'required': [],
        'allowed': {'bannerdescription'}
    },
    'user_products_maincategory': {
        'required': ['maincategoryid'],
        'allowed': {'maincategoryid'}
    },
    'user_productsdetails_by_id': {
        'required': ['productid'],
        'allowed': {'productid'}
    },
    'product_mysubcategory_list_by_maincategoryid': {
        'required': ['maincategoryid'],
        'allowed': {'maincategoryid'}
    },
    'productdetail_product_list_by_subcategoryid': {
        'required': ['subcategoryid'],
        'allowed': {'subcategoryid'}
    },
    'productdetail_brand_list_by_productid': {
        'required': ['productid'],
        'allowed': {'productid'}
    },
    'user_mysubcategory_list_by_maincategoryid': {
        'required': ['maincategoryid'],
        'allowed': {'maincategoryid'}
    },
    'save_delivery_zone': {
        'required': ['zone_name'],
        'allowed': {'zone_name', 'postcodes', 'pincodes', 'is_active', 'id'}
    },
    'delete_delivery_zone': {
        'required': [],
        'allowed': {'zone_id', 'id'}
    },
    'save_excluded_area': {
        'required': [],
        'allowed': {'area_name', 'name', 'postcode', 'pincode', 'reason', 'id'}
    },
    'delete_excluded_area': {
        'required': [],
        'allowed': {'area_id', 'id'}
    },
}

TEXT_LIMITS = {
    'fname': 70, 'lname': 70, 'name': 120, 'adminname': 70,
    'maincategoryname': 70, 'subcategoryname': 70, 'brandname': 70,
    'productname': 70, 'productsubname': 70, 'description': 150,
    'color': 70, 'size': 70, 'offertype': 70, 'bannerdescription': 70,
    'address': 70, 'city': 70, 'country': 70, 'state': 70, 'landmark': 70,
    'zone': 70, 'zone_name': 70, 'bike_number': 40, 'order_id': 40,
    'assignment_id': 40, 'rider_id': 30, 'tag_id': 40, 'batch_id': 40,
    'subject': 150, 'message': 2000, 'review_text': 2000, 'notes': 500,
    'resolution': 2000, 'response': 2000, 'reason': 255, 'filter': 40,
    'area_name': 70, 'postcodes': 500, 'priority': 40, 'customer': 70, 'source': 40,
    'delivery_slot': 70,
}

ENUM_CHOICES = {
    'purpose': {'login', 'signup', 'reset', 'trial', 'order'},
    'address_type': {'Residential', 'Gated Society', 'Hostel/Commercial'},
    'delivery_mode': {'standard', 'express', 'emergency_sos'},
    'payment_mode': {'cash', 'upi', 'card'},
    'payment_status': {'paid', 'pending', 'failed', 'refunded'},
    'status': {
        'Active', 'Inactive', 'Assigned', 'On Route', 'Arrived',
        'Trial Started', 'Trial In Progress', 'Trial Completed', 'Delivered',
        'Completed', 'Cancelled', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED',
        'Open', 'In Progress', 'Resolved', 'Closed',
        'Received', 'Approved', 'Rejected'
    },
    'priority': {'Low', 'Normal', 'High', 'Urgent', 'low', 'normal', 'high', 'urgent'},
    'condition': {'Good', 'Damaged', 'Missing', 'Defective'},
    'action': {'receive', 'steam_press', 'approve', 'reject', 'scan', 'verify', 'wash', 'iron', 'quarantine'},
    'hygiene_status': {'pending', 'passed', 'failed', 'sanitized'},
}

INTEGER_LIMITS = {
    'price': (1, 2147483647),
    'offerprice': (0, 2147483647),
    'qty': (0, 100000),
    'expected_qty': (0, 100000),
    'rating': (1, 5),
    'bill_revision': (0, 1000),
    'max_orders': (1, 100),
    'limit': (1, 500),
    'id': (1, 2147483647),
    'maincategoryid': (1, 2147483647),
    'subcategoryid': (1, 2147483647),
    'brandid': (1, 2147483647),
    'productid': (1, 2147483647),
    'product_details_id': (1, 2147483647),
    'product_id': (1, 2147483647),
    'try_order_item_id': (1, 2147483647),
    'final_order_item_id': (1, 2147483647),
    'return_id': (1, 2147483647),
    'item_id': (1, 2147483647),
    'address_id': (1, 2147483647),
    'ticket_id': (1, 2147483647),
    'area_id': (1, 2147483647),
    'zone_id': (1, 2147483647),
    'version': (0, 1000000),
}

FLOAT_LIMITS = {
    'latitude': (-90.0, 90.0),
    'lat': (-90.0, 90.0),
    'longitude': (-180.0, 180.0),
    'lng': (-180.0, 180.0),
    'start_lat': (-90.0, 90.0),
    'start_lng': (-180.0, 180.0),
}


def validate_try_order_item(item):
    if not isinstance(item, dict):
        return 'Each order item must be an object.'
    p_id = item.get('product_details_id')
    if type(p_id) is bool or not isinstance(p_id, (int, str)) or not re.fullmatch(r'[0-9]+', str(p_id)) or int(p_id) < 1:
        return 'Invalid product_details_id in order items (must be positive integer).'
    qty = item.get('qty')
    if type(qty) is bool or not isinstance(qty, (int, str)) or not re.fullmatch(r'[0-9]+', str(qty)) or not (1 <= int(qty) <= 100):
        return 'Invalid qty in order items.'
    size = item.get('size')
    if size is not None and (not isinstance(size, str) or len(size) > 70 or '\x00' in size):
        return 'Invalid size in order items.'
    return None


def validate_final_selection_item(item):
    if not isinstance(item, dict):
        return 'Each selected item must be an object.'
    t_id = item.get('try_order_item_id')
    if type(t_id) is bool or not isinstance(t_id, (int, str)) or not re.fullmatch(r'[0-9]+', str(t_id)) or int(t_id) < 1:
        return 'Invalid try_order_item_id in selected items (must be positive integer).'
    qty = item.get('qty')
    if type(qty) is bool or not isinstance(qty, (int, str)) or not re.fullmatch(r'[0-9]+', str(qty)) or not (0 <= int(qty) <= 100000):
        return 'Invalid qty in selected items.'
    return None


def validate_request(endpoint, data, files):
    errors = {}

    schema = ENDPOINT_SCHEMAS.get(endpoint)

    # 1. Reject unexpected / unpermitted fields against strict endpoint schema
    if schema:
        unexpected = set(data.keys()) - schema['allowed']
        for key in unexpected:
            errors[key] = [f'Unexpected field "{key}" is not permitted by schema.']

        # 2. Check required fields for the endpoint
        for field in schema.get('required', []):
            val = data.get(field)
            if val is None or val == '' or (isinstance(val, str) and not val.strip()):
                errors[field] = ['This field is required.']

    # 3. Strict Type, Length, and Format Validation for all fields present
    for key, value in data.items():
        if key in errors:
            continue

        if endpoint in ('auth/send-otp', 'auth/verify-otp') and key == 'phone' and isinstance(value, str):
            value = value.strip()

        # Checkout's nested address dictionary is handled separately
        if key == 'address' and endpoint == 'try_order_create' and isinstance(value, dict):
            continue

        # Text fields
        if key in TEXT_LIMITS:
            max_len = TEXT_LIMITS[key]
            if not isinstance(value, str):
                errors[key] = [f'Must be a text string up to {max_len} characters.']
            elif len(value) > max_len:
                errors[key] = [f'Exceeds maximum length of {max_len} characters.']
            elif '\x00' in value or RE_CONTROL_CHARS.search(value):
                errors[key] = ['Null bytes and invalid control characters are not permitted.']
            elif not value.strip() and key not in ('review_text', 'bannerdescription', 'notes', 'resolution', 'landmark', 'reason'):
                errors[key] = [f'Enter valid text up to {max_len} characters.']

        # Mobile and Phone numbers
        if key in ('mobileno', 'mobile', 'phone', 'user_mobile', 'alt_phone'):
            if not isinstance(value, str) or not RE_MOBILE.fullmatch(value):
                errors[key] = ['Enter a 10-digit Indian mobile number starting with 6–9.']

        # Email addresses
        if key in ('emailid', 'email'):
            if not isinstance(value, str) or len(value) > 70:
                errors[key] = ['Enter a valid email address (up to 70 characters).']
            else:
                try:
                    validate_email(value)
                except ValidationError:
                    errors[key] = ['Enter a valid email address (up to 70 characters).']

        # PIN / Post codes
        if key in ('postcode', 'pincode'):
            if not isinstance(value, str) or not RE_PIN.fullmatch(value):
                errors[key] = ['Enter a valid 6-digit PIN code.']

        # Delivery dates must use the browser/API ISO date format.
        if key in ('delivery_date', 'scheduled_date'):
            if not isinstance(value, str):
                errors[key] = ['Enter a valid delivery date in YYYY-MM-DD format.']
            else:
                try:
                    date.fromisoformat(value)
                except ValueError:
                    errors[key] = ['Enter a valid delivery date in YYYY-MM-DD format.']

        # Passwords
        if key in ('password', 'confirm_password'):
            if not isinstance(value, str) or not value.strip() or len(value) > 128:
                errors[key] = ['Enter a password up to 128 characters.']
            elif '\x00' in value:
                errors[key] = ['Null bytes are not permitted in passwords.']

        # OTP codes
        if key == 'otp':
            if not isinstance(value, str) or not RE_OTP.fullmatch(value):
                errors[key] = ['Enter the 6-digit OTP code.']

        # Challenge ID
        if key == 'challenge_id':
            if not isinstance(value, str) or not re.fullmatch(r'^[A-Za-z0-9_-]{16,64}$', value):
                errors[key] = ['Invalid challenge ID format.']

        # Slug-style IDs
        if key in ('order_id', 'assignment_id', 'tag_id', 'batch_id'):
            if not isinstance(value, str) or not RE_SLUG_ID.fullmatch(value):
                errors[key] = [f'Invalid {key} format (alphanumeric up to 40 characters).']

        if key == 'rider_id':
            if not isinstance(value, str) or not RE_RIDER_ID.fullmatch(value):
                errors[key] = ['Invalid rider_id format (alphanumeric up to 30 characters).']

        if key == 'bike_number':
            if not isinstance(value, str) or not RE_BIKE_NUMBER.fullmatch(value):
                errors[key] = ['Invalid bike_number format (up to 40 alphanumeric characters).']

        # Enum / Choice fields
        if key in ENUM_CHOICES:
            valid_choices = ENUM_CHOICES[key]
            if value is not None and value not in valid_choices:
                errors[key] = [f'Invalid choice "{value}". Allowed choices: {", ".join(sorted(valid_choices))}.']

        # Integers and IDs
        if key in INTEGER_LIMITS:
            min_val, max_val = INTEGER_LIMITS[key]
            if type(value) is bool or not isinstance(value, (int, str)) or not re.fullmatch(r'[0-9]+', str(value)) or not (min_val <= int(value) <= max_val):
                errors[key] = [f'Enter a whole number between {min_val} and {max_val}.']

        # Floats and coordinates
        if key in FLOAT_LIMITS:
            min_val, max_val = FLOAT_LIMITS[key]
            if type(value) is bool:
                errors[key] = [f'Must be a valid decimal number between {min_val} and {max_val}.']
            else:
                try:
                    num = float(value)
                    if not (min_val <= num <= max_val):
                        errors[key] = [f'Must be a valid decimal number between {min_val} and {max_val}.']
                except (ValueError, TypeError):
                    errors[key] = [f'Must be a valid decimal number between {min_val} and {max_val}.']

        # Boolean flags
        if key in ('tag_intact', 'is_active', 'trial_fee_paid'):
            if type(value) is not bool and value not in ('true', 'false', 'True', 'False', 1, 0, '1', '0'):
                errors[key] = ['Must be a boolean (true/false).']

        # Nested List fields
        if key == 'items' and endpoint == 'try_order_create':
            if not isinstance(value, list) or len(value) == 0 or len(value) > 50:
                errors[key] = ['Items must be a non-empty list up to 50 items.']
            else:
                for idx, itm in enumerate(value):
                    err = validate_try_order_item(itm)
                    if err:
                        errors[f'items[{idx}]'] = [err]
                        break

        if key == 'selected_items' and endpoint == 'submit_final_selection':
            if not isinstance(value, list) or len(value) > 50:
                errors[key] = ['Selected items must be a list up to 50 items.']
            else:
                for idx, itm in enumerate(value):
                    err = validate_final_selection_item(itm)
                    if err:
                        errors[f'selected_items[{idx}]'] = [err]
                        break

        if key == 'selected_item_ids' and endpoint == 'delivery_selection_update':
            if not isinstance(value, list) or len(value) > 50:
                errors[key] = ['Selected item IDs must be a list up to 50 items.']
            else:
                for idx, itm_id in enumerate(value):
                    if type(itm_id) is bool or not isinstance(itm_id, (int, str)) or not re.fullmatch(r'[0-9]+', str(itm_id)):
                        errors[f'selected_item_ids[{idx}]'] = ['Each selected item ID must be a positive integer.']
                        break

        if key == 'pincodes' and endpoint == 'save_delivery_zone':
            if not isinstance(value, list) or len(value) == 0 or len(value) > 500:
                errors[key] = ['Pincodes must be a non-empty list of 6-digit postal codes.']
            else:
                for idx, pin in enumerate(value):
                    if not isinstance(pin, str) or not RE_PIN.fullmatch(pin):
                        errors[f'pincodes[{idx}]'] = ['Each pincode must be a 6-digit Indian PIN code.']
                        break

    # 4. Cross-Field Validations
    if 'price' in data and 'offerprice' in data and not ({'price', 'offerprice'} & errors.keys()):
        if int(data['offerprice']) > int(data['price']):
            errors['offerprice'] = ['Offer price cannot exceed the regular price.']

    if endpoint in ('signup_submit', 'reset_password') and 'confirm_password' in data and data.get('password') != data.get('confirm_password'):
        errors['confirm_password'] = ['Passwords do not match.']

    if endpoint == 'submit_product_review' and not data.get('product_id') and not data.get('product_details_id'):
        errors['product_details_id'] = ['product_details_id or product_id is required.']

    # 5. Catalog Relational Hierarchy Consistency
    from .models import MainCategory, MySubCategory, Brands, Product
    if endpoint.endswith('_submit') or endpoint.startswith('edit'):
        refs = {'maincategoryid': MainCategory, 'subcategoryid': MySubCategory, 'brandid': Brands, 'productid': Product}
        found = {}
        for field, model in refs.items():
            if field in data and field not in errors:
                found[field] = model.objects.filter(pk=data[field]).first()
                if not found[field]:
                    errors[field] = ['This selection no longer exists.']
        sub = found.get('subcategoryid')
        if sub and 'maincategoryid' in found and str(sub.maincategoryid_id) != str(data['maincategoryid']):
            errors['subcategoryid'] = ['Choose a subcategory belonging to this category.']
        product = found.get('productid')
        if product:
            for field in ('maincategoryid', 'subcategoryid', 'brandid'):
                if field in data and str(getattr(product, field + '_id')) != str(data[field]):
                    errors[field] = ['Must match the selected product.']

    # 6. File & Image Upload Validations
    image_creates = {'maincategory_submit', 'mysubcategory_submit', 'brand_submit', 'product_submit', 'productdetails_submit', 'banner_submit'}
    if endpoint in image_creates or endpoint.endswith('_icon'):
        if not files.get('icon'):
            errors['icon'] = ['Choose an image to upload.']

    if sum(len(files.getlist(key)) for key in files) > 10:
        errors['icon'] = ['Upload at most 10 images at a time.']

    from .upload_security import validate_uploaded_image
    for field in files:
        for upload in files.getlist(field):
            file_errors = validate_uploaded_image(upload)
            if file_errors:
                errors[field] = file_errors
                break
        if field in errors:
            break

    return errors
