from django.test import TestCase
from rest_framework.test import APIClient
from .models import (SignUp, UserAddress, MainCategory, MySubCategory, Brands, Product,
    ProductDetails, DeliveryZone, ExcludedArea, TryOrder, TryOrderItem, FinalOrderItem, AdminLogin)
from .checkout import create_trial, CheckoutError


class CheckoutTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = SignUp.objects.create(mobileno='9000000011', emailid='checkout@example.test', password='Checkout-test-472!')
        cls.other = SignUp.objects.create(mobileno='9000000012', emailid='other@example.test', password='Checkout-test-472!')
        cls.address = UserAddress.objects.create(mobileno=cls.user, address='Home', city='Delhi', country='India', postcode='110001')
        cls.foreign = UserAddress.objects.create(mobileno=cls.other, address='Other home', city='Delhi', country='India', postcode='110001')
        DeliveryZone.objects.create(zone_name='Test', postcodes='110001, 110002')
        category = MainCategory.objects.create(maincategoryname='Clothing')
        sub = MySubCategory.objects.create(maincategoryid=category, subcategoryname='Shirts')
        brand = Brands.objects.create(brandname='Real Brand')
        product = Product.objects.create(maincategoryid=category, subcategoryid=sub, brandid=brand, productname='Real Shirt')
        common = dict(maincategoryid=category, subcategoryid=sub, brandid=brand, productid=product, price=500, offerprice=450, color='Blue')
        cls.variant = ProductDetails.objects.create(**common, size='medium', qty=1)
        cls.empty = ProductDetails.objects.create(**common, size='XL', qty=0)

    def payload(self, **overrides):
        data = {'address_id': self.address.pk, 'items': [{'product_details_id': self.variant.pk, 'size': 'M', 'qty': 1, 'unit_price': 1, 'product_name': 'Fake'}]}
        data.update(overrides)
        return data

    def test_authoritative_price_address_and_variant_are_reserved(self):
        order = create_trial(self.user, self.payload(address={'address': 'Spoofed'}))
        item = order.tryorderitem_set.get()
        self.assertEqual((order.address_text, order.reference_value, item.product_name, item.brand_name), ('Home', 450, 'Real Shirt', 'Real Brand'))
        self.assertEqual((item.size, item.color, item.qty, item.stock_reserved), ('medium', 'Blue', 1, True))
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.qty, 0)

    def test_invalid_size_quantity_and_duplicate_rejected_without_stock_change(self):
        valid = self.payload()['items'][0]
        for items in [[dict(valid, size='XL')], [dict(valid, size='')], [dict(valid, qty=2)], [dict(valid, qty=True)], [dict(valid, qty=0)], [valid, valid], {}, [], [None]]:
            with self.subTest(items=items), self.assertRaises(CheckoutError):
                create_trial(self.user, self.payload(items=items))
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.qty, 1)
        self.assertFalse(TryOrder.objects.exists())

    def test_second_out_of_stock_item_rolls_back_first_reservation(self):
        items = self.payload()['items'] + [{'product_details_id': self.empty.pk, 'size': 'XL', 'qty': 1}]
        with self.assertRaises(CheckoutError):
            create_trial(self.user, self.payload(items=items))
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.qty, 1)
        self.assertFalse(TryOrderItem.objects.exists())

    def test_last_unit_cannot_be_sold_to_second_customer(self):
        create_trial(self.user, self.payload())
        with self.assertRaises(CheckoutError):
            create_trial(self.other, self.payload(address_id=self.foreign.pk))
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.qty, 0)
        self.assertEqual(TryOrder.objects.count(), 1)

    def test_saved_address_ownership_and_exact_postcode_required(self):
        with self.assertRaises(CheckoutError):
            create_trial(self.user, self.payload(address_id=self.foreign.pk))
        for postcode in ['', '11000', '0110001', '110003']:
            self.address.postcode = postcode
            self.address.save()
            with self.subTest(postcode=postcode), self.assertRaises(CheckoutError):
                create_trial(self.user, self.payload())
        self.address.postcode = '110001'
        self.address.save()
        ExcludedArea.objects.create(area_name='Restricted', postcode='110001')
        with self.assertRaises(CheckoutError):
            create_trial(self.user, self.payload())

    def test_pending_payment_and_duplicate_submission_remain_active(self):
        order = create_trial(self.user, self.payload())
        for status in ['TRY_REQUESTED', 'Final Payment Pending']:
            order.status = status
            order.save()
            with self.assertRaisesRegex(CheckoutError, 'active order'):
                create_trial(self.user, self.payload())
        self.assertEqual(TryOrder.objects.count(), 1)

    def test_paid_trial_and_bad_mode_do_not_reserve_stock(self):
        for mode in ['emergency_sos', 'free-for-me']:
            with self.assertRaises(CheckoutError):
                create_trial(self.user, self.payload(delivery_mode=mode))
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.qty, 1)

    def test_invalid_offer_falls_back_and_invalid_base_price_rejected(self):
        for offer in [-100, 600]:
            self.variant.offerprice = offer
            self.variant.save()
            order = create_trial(self.user, self.payload())
            self.assertEqual(order.reference_value, 500)
            order.delete()
            self.variant.qty = 1
            self.variant.save()
        self.variant.price = 0
        self.variant.save()
        with self.assertRaises(CheckoutError):
            create_trial(self.user, self.payload())

    def test_authenticated_checkout_and_final_selection_preserve_snapshot(self):
        client = APIClient(enforce_csrf_checks=True)
        def post(endpoint, data):
            token = client.get('/api/auth_csrf').json()['csrfToken']
            return client.post('/api/' + endpoint, data, format='json', HTTP_X_CSRFTOKEN=token)
        self.assertTrue(post('check_costumer_login', {'mobileno': self.user.pk, 'password': 'Checkout-test-472!'}).json()['status'])
        response = post('try_order_create', self.payload())
        self.assertEqual(response.status_code, 200, response.content)
        order = TryOrder.objects.get()
        item = order.tryorderitem_set.get()
        order.status = 'TRIAL_COMPLETED'
        order.save()
        AdminLogin.objects.create(emailid='checkout-admin@example.test', mobileno='9000000099', password='Checkout-test-472!')
        post('check_admin_login', {'emailid': 'checkout-admin@example.test', 'password': 'Checkout-test-472!'})
        for endpoint, body in [('submit_final_selection', {'selected_items': [{'try_order_item_id': item.pk, 'qty': 1}]}), ('delivery_selection_update', {'selected_item_ids': [item.pk]})]:
            response = post(endpoint, dict(body, order_id=order.order_id))
            self.assertTrue(response.json()['status'], response.content)
            final_item = FinalOrderItem.objects.get()
            self.assertEqual((final_item.size, final_item.color), ('medium', 'Blue'))

        post('check_costumer_login', {'mobileno': self.user.pk, 'password': 'Checkout-test-472!'})
        self.assertTrue(post('customer_approve_bill', {'order_id': order.order_id, 'bill_revision': 1, 'payment_mode': 'cash'}).json()['status'])
        post('check_admin_login', {'emailid': 'checkout-admin@example.test', 'password': 'Checkout-test-472!'})
        response = post('final_payment_update', {'order_id': order.order_id, 'bill_revision': 1, 'payment_mode': 'cash', 'payment_status': 'paid'})
        self.assertTrue(response.json()['status'], response.content)
        item.refresh_from_db()
        self.variant.refresh_from_db()
        self.assertEqual((item.status, item.stock_reserved, self.variant.qty), ('PURCHASED', False, 0))


from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from django.db import close_old_connections, OperationalError
from django.test import TransactionTestCase


class CheckoutConcurrencyTests(TransactionTestCase):
    def setUp(self):
        CheckoutTests.setUpTestData.__func__(type(self))

    def test_two_simultaneous_customers_cannot_reserve_the_last_unit(self):
        barrier = Barrier(2)
        def checkout(mobile, address_id):
            close_old_connections()
            try:
                user = SignUp.objects.get(pk=mobile)
                barrier.wait(timeout=10)
                create_trial(user, {'address_id': address_id, 'items': [{'product_details_id': self.variant.pk, 'size': 'M', 'qty': 1}]})
                return 'created'
            except (CheckoutError, OperationalError):
                return 'rejected'
            finally:
                close_old_connections()
        with ThreadPoolExecutor(max_workers=2) as workers:
            first = workers.submit(checkout, self.user.pk, self.address.pk)
            second = workers.submit(checkout, self.other.pk, self.foreign.pk)
            results = [first.result(timeout=20), second.result(timeout=20)]
        self.assertEqual(sorted(results), ['created', 'rejected'])
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.qty, 0)
        self.assertEqual(TryOrder.objects.count(), 1)
