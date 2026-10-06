from datetime import timedelta
from django.test import TestCase, Client
from django.utils import timezone
from .models import Coupon, CouponUsage, MainCategory, MySubCategory, Brands, Product, AdminLogin
from .coupon_service import validate_and_calculate_coupon, record_coupon_usage


class CouponLogicTests(TestCase):
    def setUp(self):
        self.now = timezone.now()
        # Create categories and products for testing scope
        self.cat1 = MainCategory.objects.create(maincategoryname="Men's Fashion")
        self.cat2 = MainCategory.objects.create(maincategoryname="Electronics")

        self.sub1 = MySubCategory.objects.create(maincategoryid=self.cat1, subcategoryname="Shirts")
        self.sub2 = MySubCategory.objects.create(maincategoryid=self.cat2, subcategoryname="Gadgets")

        self.brand = Brands.objects.create(brandname="Doordrape")

        self.prod1 = Product.objects.create(
            maincategoryid=self.cat1,
            subcategoryid=self.sub1,
            brandid=self.brand,
            productname="Slim Fit Shirt",
            description="Cotton shirt"
        )
        self.prod2 = Product.objects.create(
            maincategoryid=self.cat2,
            subcategoryid=self.sub2,
            brandid=self.brand,
            productname="Smart Watch",
            description="Fitness tracker"
        )

        self.cart_items = [
            {
                'product_id': self.prod1.id,
                'category_id': self.cat1.id,
                'subcategory_id': self.sub1.id,
                'price': 1000,
                'qty': 2,  # Subtotal 2000
            },
            {
                'product_id': self.prod2.id,
                'category_id': self.cat2.id,
                'subcategory_id': self.sub2.id,
                'price': 3000,
                'qty': 1,  # Subtotal 3000
            }
        ]
        # Cart total = 5000

    def test_all_scope_percentage_with_cap(self):
        # 20% off on all, max cap 500
        coupon = Coupon.objects.create(
            code="ALL20",
            discount_type="percentage",
            discount_value=20,
            max_discount=500,
            scope="all",
            start_date=self.now - timedelta(days=1),
            end_date=self.now + timedelta(days=5),
            is_active=True
        )
        valid, res = validate_and_calculate_coupon("ALL20", self.cart_items)
        self.assertTrue(valid)
        self.assertEqual(res['eligible_subtotal'], 5000)
        # 20% of 5000 is 1000, capped at 500
        self.assertEqual(res['discount'], 500)
        self.assertEqual(res['final_total'], 4500)

    def test_category_scope_discount(self):
        # 10% off on Men's Fashion (Cat 1) only
        coupon = Coupon.objects.create(
            code="MEN10",
            discount_type="percentage",
            discount_value=10,
            scope="category",
            target_ids=[str(self.cat1.id)],
            start_date=self.now - timedelta(days=1),
            end_date=self.now + timedelta(days=5),
            is_active=True
        )
        valid, res = validate_and_calculate_coupon("MEN10", self.cart_items)
        self.assertTrue(valid)
        # Eligible subtotal is only Prod1 = 2000
        self.assertEqual(res['eligible_subtotal'], 2000)
        self.assertEqual(res['cart_total'], 5000)
        # 10% of 2000 = 200
        self.assertEqual(res['discount'], 200)
        self.assertEqual(res['final_total'], 4800)

    def test_subcategory_scope_discount(self):
        # Flat 300 off on Gadgets (Sub 2)
        coupon = Coupon.objects.create(
            code="GADGET300",
            discount_type="flat",
            discount_value=300,
            scope="subcategory",
            target_ids=[str(self.sub2.id)],
            start_date=self.now - timedelta(days=1),
            end_date=self.now + timedelta(days=5),
            is_active=True
        )
        valid, res = validate_and_calculate_coupon("GADGET300", self.cart_items)
        self.assertTrue(valid)
        self.assertEqual(res['eligible_subtotal'], 3000)
        self.assertEqual(res['discount'], 300)
        self.assertEqual(res['final_total'], 4700)

    def test_product_scope_discount(self):
        # Flat 150 off on Slim Fit Shirt (Prod 1)
        coupon = Coupon.objects.create(
            code="SHIRT150",
            discount_type="flat",
            discount_value=150,
            scope="product",
            target_ids=[str(self.prod1.id)],
            start_date=self.now - timedelta(days=1),
            end_date=self.now + timedelta(days=5),
            is_active=True
        )
        valid, res = validate_and_calculate_coupon("SHIRT150", self.cart_items)
        self.assertTrue(valid)
        self.assertEqual(res['eligible_subtotal'], 2000)
        self.assertEqual(res['discount'], 150)
        self.assertEqual(res['final_total'], 4850)

    def test_inapplicable_scope_rejection(self):
        # Coupon for a nonexistent category ID
        coupon = Coupon.objects.create(
            code="OTHERCAT",
            discount_type="percentage",
            discount_value=15,
            scope="category",
            target_ids=["9999"],
            start_date=self.now - timedelta(days=1),
            end_date=self.now + timedelta(days=5),
            is_active=True
        )
        valid, msg = validate_and_calculate_coupon("OTHERCAT", self.cart_items)
        self.assertFalse(valid)
        self.assertIn("No eligible items", msg)

    def test_expired_and_inactive_coupons(self):
        # Inactive
        Coupon.objects.create(
            code="INACTIVE",
            discount_type="flat",
            discount_value=100,
            scope="all",
            start_date=self.now - timedelta(days=5),
            end_date=self.now + timedelta(days=5),
            is_active=False
        )
        valid, msg = validate_and_calculate_coupon("INACTIVE", self.cart_items)
        self.assertFalse(valid)
        self.assertIn("inactive", msg)

        # Expired
        Coupon.objects.create(
            code="EXPIRED",
            discount_type="flat",
            discount_value=100,
            scope="all",
            start_date=self.now - timedelta(days=10),
            end_date=self.now - timedelta(days=1),
            is_active=True
        )
        valid, msg = validate_and_calculate_coupon("EXPIRED", self.cart_items)
        self.assertFalse(valid)
        self.assertIn("expired", msg)

    def test_min_order_amount_rule(self):
        coupon = Coupon.objects.create(
            code="MINORDER",
            discount_type="flat",
            discount_value=200,
            min_order_amount=3000,
            scope="category",
            target_ids=[str(self.cat1.id)],  # Eligible subtotal is 2000, less than 3000
            start_date=self.now - timedelta(days=1),
            end_date=self.now + timedelta(days=5),
            is_active=True
        )
        valid, msg = validate_and_calculate_coupon("MINORDER", self.cart_items)
        self.assertFalse(valid)
        self.assertIn("Minimum order amount", msg)

    def test_usage_limits_enforcement(self):
        coupon = Coupon.objects.create(
            code="LIMIT10",
            discount_type="flat",
            discount_value=50,
            total_usage_limit=1,
            per_user_limit=1,
            scope="all",
            start_date=self.now - timedelta(days=1),
            end_date=self.now + timedelta(days=5),
            is_active=True
        )

        # User 1 uses it
        usage = record_coupon_usage("LIMIT10", "9876543210", "ORD001", 50)
        self.assertIsNotNone(usage)
        self.assertEqual(Coupon.objects.get(code="LIMIT10").used_count, 1)

        # User 1 tries again -> rejected by per_user_limit or total_usage_limit
        valid, msg = validate_and_calculate_coupon("LIMIT10", self.cart_items, user_identifier="9876543210")
        self.assertFalse(valid)
        self.assertTrue("limit" in msg.lower())


class CouponApiTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.admin = AdminLogin.objects.create(
            emailid="admin@doordrape.com",
            mobileno="9999999999",
            adminname="Super Admin",
            password="adminpassword123"
        )
        self.cat = MainCategory.objects.create(maincategoryname="Ethnic Wear")
        self.sub = MySubCategory.objects.create(maincategoryid=self.cat, subcategoryname="Kurtas")
        self.brand = Brands.objects.create(brandname="Doordrape")
        self.prod = Product.objects.create(
            maincategoryid=self.cat,
            subcategoryid=self.sub,
            brandid=self.brand,
            productname="Silk Kurta",
            description="Festive wear"
        )

    def _login_admin(self):
        from .security import establish_session
        session = self.client.session
        request = type('Req', (), {'session': session, 'META': {}})()
        establish_session(request, 'admin', self.admin)
        session.save()
        self.client.cookies['sessionid'] = session.session_key

    def test_admin_coupon_lifecycle_api(self):
        self._login_admin()
        now = timezone.now()

        # 1. Create Coupon
        create_payload = {
            'code': 'DIWALI50',
            'description': '50% off on all Kurtas',
            'discount_type': 'percentage',
            'discount_value': 50,
            'max_discount': 500,
            'min_order_amount': 999,
            'scope': 'category',
            'target_ids': [self.cat.id],
            'total_usage_limit': 200,
            'per_user_limit': 1,
            'start_date': now.isoformat(),
            'end_date': (now + timedelta(days=15)).isoformat(),
            'is_active': True,
        }
        res = self.client.post('/api/admin_coupon_save', create_payload, content_type='application/json')
        self.assertEqual(res.status_code, 200)
        c_id = res.json().get('coupon_id')
        self.assertTrue(c_id)

        # 2. List Coupons
        res = self.client.get('/api/admin_coupon_list?search=DIWALI')
        self.assertEqual(res.status_code, 200)
        data = res.json().get('data', [])
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['code'], 'DIWALI50')
        self.assertEqual(data[0]['target_names'], ['Ethnic Wear'])

        # 3. Toggle Status
        res = self.client.post('/api/admin_coupon_toggle', {'id': c_id}, content_type='application/json')
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.json().get('is_active'))

        # 4. Public Validate Coupon (should fail because toggled inactive)
        cart = [{'product_id': self.prod.id, 'category_id': self.cat.id, 'price': 1500, 'qty': 1}]
        val_res = self.client.post('/api/validate_coupon', {'code': 'DIWALI50', 'items': cart}, content_type='application/json')
        self.assertEqual(val_res.status_code, 400)
        self.assertIn('inactive', val_res.json().get('message', '').lower())

        # 5. Toggle active again
        self.client.post('/api/admin_coupon_toggle', {'id': c_id, 'is_active': True}, content_type='application/json')
        val_res = self.client.post('/api/validate_coupon', {'code': 'DIWALI50', 'items': cart}, content_type='application/json')
        self.assertEqual(val_res.status_code, 200)
        self.assertEqual(val_res.json().get('discount'), 500)  # 50% of 1500 is 750, capped at 500

        # 6. Delete Coupon
        del_res = self.client.post('/api/admin_coupon_delete', {'id': c_id}, content_type='application/json')
        self.assertEqual(del_res.status_code, 200)
        self.assertFalse(Coupon.objects.filter(id=c_id).exists())
