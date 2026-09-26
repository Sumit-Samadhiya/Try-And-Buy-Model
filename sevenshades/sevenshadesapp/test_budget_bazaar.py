from django.test import TestCase
from rest_framework.test import APIClient
from sevenshadesapp.models import BudgetDeal, AdminLogin, MainCategory, MySubCategory


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

        # Create a sample BudgetDeal
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
