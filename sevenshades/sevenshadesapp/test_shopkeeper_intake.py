import io
import json
import shutil
import tempfile
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from PIL import Image

from sevenshadesapp.models import (
    AdminLogin,
    Brands,
    MainCategory,
    MySubCategory,
    Product,
    ProductDetails,
    Shopkeeper,
    ShopkeeperIntakeItem,
)


def _fake_jpeg(name='garment.jpg'):
    buf = io.BytesIO()
    Image.new('RGB', (120, 160), color=(34, 92, 65)).save(buf, format='JPEG')
    buf.seek(0)
    return SimpleUploadedFile(name, buf.read(), content_type='image/jpeg')


TEMP_MEDIA = tempfile.mkdtemp()


@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class ShopkeeperIntakeWorkflowTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(TEMP_MEDIA, ignore_errors=True)
    def setUp(self):
        self.admin = AdminLogin.objects.create(
            emailid='admin@doordrape.test',
            mobileno='9876543210',
            adminname='Founder Admin',
            password='StrongPassword123!',
            picture='admin.png',
        )
        self.cat = MainCategory.objects.create(maincategoryname='Men', icon='static/men.jpg')
        self.sub = MySubCategory.objects.create(maincategoryid=self.cat, subcategoryname='Shirts', icon='static/shirt.jpg')
        self.brand = Brands.objects.create(brandname='Partner Store', icon='static/brand.jpg')

        # Authenticate admin session using the standard login endpoint
        res = self.client.post(
            '/api/check_admin_login',
            data=json.dumps({'emailid': 'admin@doordrape.test', 'password': 'StrongPassword123!'}),
            content_type='application/json',
        )
        self.assertEqual(res.status_code, 200)

    def test_unauthenticated_client_cannot_access_intake_endpoints(self):
        anon = self.client.__class__()
        self.assertEqual(anon.get('/api/shopkeeper_list').status_code, 401)
        self.assertEqual(anon.get('/api/intake_list').status_code, 401)
        self.assertEqual(anon.get('/api/intake_export_csv').status_code, 401)

    @patch('sevenshadesapp.shopkeeper_intake_views.analyze_garment_image')
    def test_draft_isolation_markup_and_single_plus_bulk_publish(self, mock_ai):
        mock_ai.side_effect = [
            {
                'product_name': 'Emerald Cotton Casual Shirt',
                'description': 'Breathable emerald cotton shirt for daily wear.',
                'color': 'Emerald Green',
                'ai_source': 'gemini',
            },
            {
                'product_name': 'Ivory Linen Relaxed Shirt',
                'description': 'Lightweight ivory linen shirt for summer.',
                'color': 'Ivory',
                'ai_source': 'gemini',
            },
        ]

        # 1. Create Shopkeeper
        shop_res = self.client.post(
            '/api/shopkeeper_save',
            data=json.dumps({
                'shop_name': 'Gupta Menswear',
                'owner_name': 'Rajesh Gupta',
                'phone': '9811122233',
                'default_markup': 150,
            }),
            content_type='application/json',
        )
        self.assertEqual(shop_res.status_code, 200)
        shop_data = shop_res.json()['data']
        self.assertEqual(shop_data['shop_code'], 'SH01')

        # 2. Submit two items in Quick Intake (omitting product_name & description -> AI fills them)
        sizes = json.dumps([{'size': 'M', 'qty': 2}, {'size': 'L', 'qty': 3}])
        r1 = self.client.post('/api/intake_submit', {
            'shopkeeper_id': shop_data['id'],
            'maincategoryid': self.cat.id,
            'subcategoryid': self.sub.id,
            'brandid': self.brand.id,
            'cost_price': 500,
            'sizes_json': sizes,
            'icon': _fake_jpeg('item1.jpg'),
        })
        self.assertEqual(r1.status_code, 200)
        item1 = r1.json()['data']
        self.assertEqual(item1['unique_code'], 'SH01-001')
        self.assertEqual(item1['cost_price'], 500)
        self.assertEqual(item1['website_price'], 650)
        self.assertEqual(item1['status'], 'DRAFT')
        self.assertEqual(item1['product_name'], 'Emerald Cotton Casual Shirt')

        r2 = self.client.post('/api/intake_submit', {
            'shopkeeper_id': shop_data['id'],
            'maincategoryid': self.cat.id,
            'subcategoryid': self.sub.id,
            'brandid': self.brand.id,
            'cost_price': 720,
            'sizes_json': json.dumps([{'size': 'XL', 'qty': 1}]),
            'icon': _fake_jpeg('item2.jpg'),
        })
        self.assertEqual(r2.status_code, 200)
        item2 = r2.json()['data']
        self.assertEqual(item2['unique_code'], 'SH01-002')
        self.assertEqual(item2['website_price'], 870)

        # 3. Verify customer website does NOT see DRAFT items yet
        self.assertEqual(Product.objects.count(), 0)
        pub_list = self.client.get('/api/user_product_list').json()
        self.assertEqual(len(pub_list['data']), 0)

        # 4. Update draft item1 price & name before publishing
        upd = self.client.post(
            '/api/intake_update',
            data=json.dumps({'id': item1['id'], 'cost_price': 550}),
            content_type='application/json',
        )
        self.assertEqual(upd.status_code, 200)
        self.assertEqual(upd.json()['data']['website_price'], 700)

        # 5. Export Shopkeeper CSV & Photo Sheet -> MUST contain original rate only (550, 720), NEVER website_price (700, 870)
        csv_res = self.client.get(f"/api/intake_export_csv?shopkeeper_id={shop_data['id']}")
        self.assertEqual(csv_res.status_code, 200)
        csv_text = csv_res.content.decode('utf-8')
        self.assertIn('SH01-001', csv_text)
        self.assertIn(',550,', csv_text)
        self.assertIn(',720,', csv_text)
        self.assertNotIn(',700,', csv_text)
        self.assertNotIn('870', csv_text)

        sheet_res = self.client.get(f"/api/intake_export_sheet?shopkeeper_id={shop_data['id']}").json()
        self.assertTrue(sheet_res['status'])
        for row in sheet_res['data']['items']:
            self.assertNotIn('website_price', row)
            self.assertNotIn('markup_amount', row)

        # 6. Publish item1 one-by-one
        p1 = self.client.post(
            '/api/intake_publish',
            data=json.dumps({'id': item1['id']}),
            content_type='application/json',
        )
        self.assertEqual(p1.status_code, 200)
        self.assertEqual(p1.json()['published_count'], 1)
        self.assertEqual(Product.objects.count(), 1)
        self.assertEqual(ProductDetails.objects.filter(sku__startswith='SH01-001-').count(), 2)
        self.assertEqual(ProductDetails.objects.filter(sku='SH01-001-M').first().price, 700)

        # 7. Publish remaining item2 in bulk list
        p2 = self.client.post(
            '/api/intake_publish',
            data=json.dumps({'ids': [item1['id'], item2['id']]}),
            content_type='application/json',
        )
        self.assertEqual(p2.status_code, 200)
        self.assertEqual(p2.json()['published_count'], 1)  # Only item2 was still DRAFT
        self.assertEqual(Product.objects.count(), 2)
        self.assertEqual(ProductDetails.objects.get(sku='SH01-002-XL').price, 870)
        self.assertEqual(ShopkeeperIntakeItem.objects.filter(status='PUBLISHED').count(), 2)
