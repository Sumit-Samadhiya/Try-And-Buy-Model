import json
import tempfile
from io import BytesIO
from pathlib import Path
from PIL import Image
from django.test import SimpleTestCase, TestCase, RequestFactory, override_settings
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIRequestFactory
from .models import MainCategory, MySubCategory, Brands, Product
from .upload_security import optimize_uploaded_image, generate_thumbnail, secure_media_serve
from .userinterface import User_Products_Maincategory


class ImagePerformanceTests(SimpleTestCase):
    def test_optimizer_keeps_format_and_transparency_after_resize(self):
        for fmt in ('PNG', 'WEBP', 'JPEG'):
            with self.subTest(fmt=fmt):
                source = BytesIO()
                Image.new('RGB' if fmt == 'JPEG' else 'RGBA', (2000, 1000)).save(source, fmt)
                result = Image.open(BytesIO(optimize_uploaded_image(source, 400)))
                self.assertEqual(result.format, fmt)
                self.assertEqual(result.size, (400, 200))
                if fmt != 'JPEG':
                    self.assertEqual(result.getpixel((0, 0))[3], 0)

    def test_thumbnail_is_bounded_and_served_with_correct_mime(self):
        with tempfile.TemporaryDirectory() as directory, override_settings(MEDIA_ROOT=directory):
            source = Path(directory) / 'photo.png'
            Image.new('RGBA', (1000, 2000)).save(source)
            request = RequestFactory().get('/media/photo.png?thumbnail=1')
            response = secure_media_serve(request, 'photo.png')
            self.assertEqual(response['Content-Type'], 'image/webp')
            self.assertEqual(Image.open(BytesIO(response.content)).size, (250, 500))
            self.assertIn('max-age=3600', response['Cache-Control'])


class CatalogLimitTests(TestCase):
    def test_limit_is_applied_in_sql_and_full_catalog_remains_available(self):
        category = MainCategory.objects.create(maincategoryname='Men')
        sub = MySubCategory.objects.create(maincategoryid=category, subcategoryname='Shirts')
        brand = Brands.objects.create(brandname='Test')
        for index in range(8):
            Product.objects.create(maincategoryid=category, subcategoryid=sub, brandid=brand, productname=f'Product {index}')
        factory = APIRequestFactory()
        with CaptureQueriesContext(connection) as queries:
            response = User_Products_Maincategory(factory.post('/', {'maincategoryid': category.pk, 'limit': 6}, format='json'))
        self.assertEqual(len(json.loads(response.content)['data']), 6)
        self.assertTrue(any('LIMIT 6' in query['sql'] for query in queries))
        response = User_Products_Maincategory(factory.post('/', {'maincategoryid': category.pk}, format='json'))
        self.assertEqual(len(json.loads(response.content)['data']), 8)
