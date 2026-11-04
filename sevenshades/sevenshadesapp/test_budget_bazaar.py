from django.test import TestCase
from rest_framework.test import APIClient
from sevenshadesapp.models import BudgetDeal, AdminLogin, MainCategory, MySubCategory, Brands, Product, ProductDetails


class BudgetBazaarTests(TestCase):
    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=True)
        self.token = self.client.get('/api/auth_csrf').json()['csrfToken']

        # Setup Category & Subcategory
        self.category = MainCategory.objects.create(maincategoryname='Men', icon='static/men.png')
        self.subcategory = MySubCategory.objects.create(
            maincategoryid=self.category,
            subcategoryname='Oversized T-Shirts',
            icon='static/oversized.png'
        )

        # Setup Brand & Products
        self.brand = Brands.objects.create(brandname='SevenShades Basics', icon='static/brand.png')
        self.prod_under = Product.objects.create(
            maincategoryid=self.category,
            subcategoryid=self.subcategory,
            brandid=self.brand,
            productname='Affordable Tee',
            description='Affordable tee under 400',
            icon='static/tee1.png'
        )
        ProductDetails.objects.create(
            maincategoryid=self.category,
            subcategoryid=self.subcategory,
            brandid=self.brand,
            productid=self.prod_under,
            productsubname='Affordable Tee - Black',
            qty=10,
            price=600,
            offerprice=399,
            color='Black',
            size='L'
        )

        self.prod_over = Product.objects.create(
            maincategoryid=self.category,
            subcategoryid=self.subcategory,
            brandid=self.brand,
            productname='Premium Tee',
            description='Costly tee',
            icon='static/tee2.png'
        )
        ProductDetails.objects.create(
            maincategoryid=self.category,
            subcategoryid=self.subcategory,
            brandid=self.brand,
            productid=self.prod_over,
            productsubname='Premium Tee - White',
            qty=10,
            price=800,
            offerprice=799,
            color='White',
            size='M'
        )

        # Create a sample BudgetDeal (Under 499)
        self.deal = BudgetDeal.objects.create(
            title='Oversized T-Shirts',
            price_tag='Under ₹499',
            max_price=499,
            maincategoryid=self.category,
            subcategoryid=self.subcategory,
            tier_color='blue',
            order_index=1,
            is_active=True
        )

        # Setup Admin User and session
        self.admin = AdminLogin.objects.create(
            emailid='admin@example.com',
            password='Password123!',
            adminname='Admin Tester'
        )

    def login_admin(self):
        login_res = self.client.post('/api/check_admin_login', {
            'emailid': 'admin@example.com',
            'password': 'Password123!'
        }, format='json', HTTP_X_CSRFTOKEN=self.token)
        self.assertEqual(login_res.status_code, 200)
        # Update token with rotated CSRF token post-login
        self.token = self.client.cookies['csrftoken'].value

    def test_user_budget_bazaar_list_is_public(self):
        response = self.client.get('/api/user_budget_bazaar_list')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['status'])
        self.assertEqual(len(data['data']), 1)
        self.assertEqual(data['data'][0]['title'], 'Oversized T-Shirts')
        self.assertEqual(data['data'][0]['price_tag'], 'Under ₹499')

    def test_admin_endpoints_require_admin_login(self):
        # Unauthenticated request to admin endpoints should be rejected
        response = self.client.get('/api/admin_budget_bazaar_list')
        self.assertIn(response.status_code, [401, 403])

    def test_admin_can_list_and_save_deals(self):
        self.login_admin()

        # List deals as admin
        list_res = self.client.get('/api/admin_budget_bazaar_list')
        self.assertEqual(list_res.status_code, 200)
        self.assertTrue(list_res.json()['status'])

        # Save new deal
        save_res = self.client.post('/api/admin_budget_bazaar_save', {
            'title': 'Baggy Jeans Special',
            'price_tag': 'Under ₹899',
            'max_price': 899,
            'maincategoryid': self.category.id,
            'subcategoryid': self.subcategory.id,
            'tier_color': 'purple',
            'order_index': 2,
            'is_active': 'true'
        }, format='multipart', HTTP_X_CSRFTOKEN=self.token)

        self.assertEqual(save_res.status_code, 200)
        self.assertTrue(save_res.json()['status'])
        self.assertTrue(BudgetDeal.objects.filter(title='Baggy Jeans Special').exists())

        # Update rotated CSRF token
        if 'csrftoken' in self.client.cookies:
            self.token = self.client.cookies['csrftoken'].value

        # Delete deal
        new_deal = BudgetDeal.objects.get(title='Baggy Jeans Special')
        del_res = self.client.post('/api/admin_budget_bazaar_delete', {
            'id': new_deal.id
        }, format='json', HTTP_X_CSRFTOKEN=self.token)

        self.assertEqual(del_res.status_code, 200)
        self.assertFalse(BudgetDeal.objects.filter(id=new_deal.id).exists())
    def test_user_budget_bazaar_products_filtering(self):
        # Deal max_price is 499: prod_under (399) should be included, prod_over (799) excluded
        res = self.client.get(f'/api/user_budget_bazaar_products?deal_id={self.deal.id}')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data['status'])
        p_ids = [item['id'] for item in data['data']]
        self.assertIn(self.prod_under.id, p_ids)
        self.assertNotIn(self.prod_over.id, p_ids)

        # Exclude prod_under manually
        self.deal.excluded_product_ids = [self.prod_under.id]
        self.deal.save()
        res_excluded = self.client.get(f'/api/user_budget_bazaar_products?deal_id={self.deal.id}')
        self.assertEqual(len(res_excluded.json()['data']), 0)

        # Explicitly include prod_over even though it's above budget
        self.deal.excluded_product_ids = []
        self.deal.included_product_ids = [self.prod_over.id]
        self.deal.save()
        res_included = self.client.get(f'/api/user_budget_bazaar_products?deal_id={self.deal.id}')
        p_ids_inc = [item['id'] for item in res_included.json()['data']]
        self.assertIn(self.prod_under.id, p_ids_inc)
        self.assertIn(self.prod_over.id, p_ids_inc)

    def test_admin_budget_bazaar_products_controls(self):
        self.login_admin()

        # 1. Get products for deal
        get_res = self.client.get(f'/api/admin_budget_bazaar_products?deal_id={self.deal.id}')
        self.assertEqual(get_res.status_code, 200)
        get_data = get_res.json()
        self.assertTrue(get_data['status'])
        self.assertIn('products', get_data)

        # Verify prod_under default_visible is True (399 <= 499)
        under_item = next(p for p in get_data['products'] if p['id'] == self.prod_under.id)
        self.assertTrue(under_item['default_visible'])
        self.assertTrue(under_item['is_visible'])

        # Verify prod_over default_visible is False (799 > 499)
        over_item = next(p for p in get_data['products'] if p['id'] == self.prod_over.id)
        self.assertFalse(over_item['default_visible'])
        self.assertFalse(over_item['is_visible'])

        # 2. Save product visibility (exclude prod_under, include prod_over)
        if 'csrftoken' in self.client.cookies:
            self.token = self.client.cookies['csrftoken'].value

        save_res = self.client.post('/api/admin_budget_bazaar_products_save', {
            'deal_id': self.deal.id,
            'selection_mode': 'auto',
            'included_product_ids': [self.prod_over.id],
            'excluded_product_ids': [self.prod_under.id],
        }, format='json', HTTP_X_CSRFTOKEN=self.token)
        self.assertEqual(save_res.status_code, 200)
        self.assertTrue(save_res.json()['status'])

        self.deal.refresh_from_db()
        self.assertEqual(self.deal.included_product_ids, [self.prod_over.id])
        self.assertEqual(self.deal.excluded_product_ids, [self.prod_under.id])
