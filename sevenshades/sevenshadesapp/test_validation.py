from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils.datastructures import MultiValueDict
from .request_validation import validate_request
from .models import MainCategory, MySubCategory

class InputValidationTests(TestCase):
    def test_prices_quantities_and_rating_ranges(self):
        for payload in ({'price': 0}, {'qty': -1}, {'qty': True}, {'rating': 6}, {'price': 100, 'offerprice': 101}):
            self.assertTrue(validate_request('validation_probe', payload, {}))

    def test_text_types_mobile_pin_and_email(self):
        for payload in ({'password': '        '}, {'mobileno': ['9000000000']}, {'emailid': 'bad@'}, {'postcode': '012345'}, {'city': '   '}, {'address': 'a' * 251}):
            self.assertTrue(validate_request('validation_probe', payload, {}))

    def test_mismatched_category_is_rejected(self):
        first = MainCategory.objects.create(maincategoryname='One')
        second = MainCategory.objects.create(maincategoryname='Two')
        sub = MySubCategory.objects.create(maincategoryid=first, subcategoryname='Sub')
        errors = validate_request('product_submit', {'maincategoryid': second.pk, 'subcategoryid': sub.pk}, {})
        self.assertIn('subcategoryid', errors)

    def test_fake_image_rejected(self):
        image = SimpleUploadedFile('fake.png', b'not an image', content_type='image/png')
        self.assertIn('icon', validate_request('banner_submit', {}, MultiValueDict({'icon': [image]})))

    def test_unexpected_fields_rejected_by_schema(self):
        """Verifies that unknown or unpermitted fields are strictly rejected, preventing mass assignment."""
        payload = {'mobileno': '9000000001', 'password': 'Password-123!', 'injected_admin_flag': True}
        errors = validate_request('check_costumer_login', payload, {})
        self.assertIn('injected_admin_flag', errors)
        self.assertIn('Unexpected field', errors['injected_admin_flag'][0])

    def test_null_bytes_and_control_characters_rejected(self):
        """Verifies that strings containing null bytes or illegal control characters are rejected, not sanitized."""
        for field, bad_val in (('address', '123 Main St\x00'), ('fname', 'John\x00Doe'), ('order_id', 'ORD-1\x002')):
            errors = validate_request('validation_probe', {field: bad_val}, {})
            self.assertIn(field, errors)

    def test_invalid_enum_choices_rejected(self):
        """Verifies that values outside the allowed enum set are rejected."""
        for endpoint, payload in (
            ('final_payment_update', {'order_id': 'ORD-1', 'payment_mode': 'crypto'}),
            ('address_submit', {'address': 'A', 'city': 'B', 'country': 'C', 'postcode': '110001', 'address_type': 'Mars Colony'}),
            ('delivery_assignment_update_status', {'assignment_id': 'A1', 'status': 'Teleported'}),
        ):
            errors = validate_request(endpoint, payload, {})
            self.assertTrue(any('Invalid choice' in msg for err_list in errors.values() for msg in err_list), errors)

    def test_nested_list_schema_validation(self):
        """Verifies that nested list items (such as order items) are strictly validated."""
        bad_items = [
            {'items': 'not_a_list'},
            {'items': [{'product_details_id': 'invalid_id', 'qty': 1, 'size': 'M'}]},
            {'items': [{'product_details_id': 1, 'qty': 0, 'size': 'M'}]},
            {'items': [{'product_details_id': 1, 'qty': 9999, 'size': 'M'}]},
            {'items': [{'product_details_id': 1, 'qty': True, 'size': 'M'}]},
        ]
        for payload in bad_items:
            errors = validate_request('try_order_create', payload, {})
            self.assertTrue(any('items' in k for k in errors.keys()), payload)

    def test_checkout_schedule_fields_match_api_contract(self):
        payload = {
            'mobileno': '9000000001',
            'address_id': 1,
            'delivery_mode': 'standard',
            'delivery_slot': '10:00 AM - 02:00 PM',
            'delivery_date': '2026-09-26',
            'items': [{'product_details_id': 1, 'qty': 1, 'size': 'M'}],
        }

        self.assertEqual(validate_request('try_order_create', payload, {}), {})

        payload['try_payment_mode'] = 'cash'
        errors = validate_request('try_order_create', payload, {})
        self.assertIn('try_payment_mode', errors)

    def test_checkout_rejects_invalid_delivery_date(self):
        payload = {
            'delivery_date': '26/09/2026',
            'items': [{'product_details_id': 1, 'qty': 1, 'size': 'M'}],
        }
        self.assertIn('delivery_date', validate_request('try_order_create', payload, {}))

    def test_admin_order_limit_matches_view_contract(self):
        self.assertEqual(validate_request('admin_order_lifecycle_list', {'limit': '20'}, {}), {})
        self.assertIn('limit', validate_request('admin_order_lifecycle_list', {'limit': '501'}, {}))

    def test_slug_ids_format_rejected_when_containing_malicious_characters(self):
        """Verifies that IDs cannot contain XSS vectors, SQL fragments, or invalid characters."""
        for bad_id in ('<script>alert(1)</script>', 'ORD 123', 'ORD;DROP TABLE', 'ORD/../', ''):
            errors = validate_request('cancel_trial', {'order_id': bad_id}, {})
            self.assertIn('order_id', errors)
