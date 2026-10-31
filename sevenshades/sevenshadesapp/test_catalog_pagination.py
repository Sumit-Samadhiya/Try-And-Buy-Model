from django.test import TestCase
from rest_framework.test import APIRequestFactory
from .models import MainCategory, MySubCategory, Brands, Product
from .userinterface import User_Product_List

class CatalogPaginationTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.category = MainCategory.objects.create(maincategoryname='Test')
        cls.sub = MySubCategory.objects.create(maincategoryid=cls.category, subcategoryname='Test')
        cls.brand = Brands.objects.create(brandname='Test')
        for i in range(25):
            Product.objects.create(maincategoryid=cls.category, subcategoryid=cls.sub, brandid=cls.brand, productname=f'Item {i}', description='Test')
    def fetch(self, query):
        import json
        response = User_Product_List(APIRequestFactory().get('/api/user_product_list', query))
        return response, json.loads(response.content)
    def test_pages_have_no_duplicates_and_stop(self):
        ids = []
        for page, count, next_page in [(1,12,2),(2,12,3),(3,1,None)]:
            response, data = self.fetch({'page':page})
            self.assertEqual(len(data['data']), count)
            self.assertEqual(data['next_page'], next_page)
            self.assertIn('catalog;dur=', response['Server-Timing'])
            ids.extend(item['id'] for item in data['data'])
        self.assertEqual(len(set(ids)), 25)
    def test_validation_filters_and_legacy(self):
        self.assertEqual(self.fetch({'page':0})[0].status_code,400)
        self.assertEqual(self.fetch({'page':1,'page_size':100})[0].status_code,400)
        self.assertEqual(self.fetch({'page':1,'brandid':99999})[1]['data'],[])
        self.assertEqual(len(self.fetch({})[1]['data']),25)
