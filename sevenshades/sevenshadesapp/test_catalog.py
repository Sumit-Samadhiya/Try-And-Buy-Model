import tempfile
from io import BytesIO
from PIL import Image
from django.test import TestCase, override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from .models import AdminLogin, MainCategory, MySubCategory, Brands, Product, ProductDetails, TryOrder, TryOrderItem

class CatalogTests(TestCase):
    def setUp(self):
        self.media=tempfile.TemporaryDirectory()
        self.addCleanup(self.media.cleanup)
        self.settings_override=override_settings(MEDIA_ROOT=self.media.name)
        self.settings_override.enable()
        self.addCleanup(self.settings_override.disable)
        self.admin=AdminLogin.objects.create(emailid='catalog@example.test',mobileno='9000000055',password='Catalog-test-872!')
        self.client=APIClient(enforce_csrf_checks=True)
        self.post('check_admin_login',{'emailid':self.admin.emailid,'password':'Catalog-test-872!'})
        self.category=MainCategory.objects.create(maincategoryname='Clothing')
        self.sub=MySubCategory.objects.create(maincategoryid=self.category,subcategoryname='Shirts')
        self.brand=Brands.objects.create(brandname='Test')
        self.product=Product.objects.create(maincategoryid=self.category,subcategoryid=self.sub,brandid=self.brand,productname='Shirt',description='Cotton')
        self.data={'maincategoryid':self.category.pk,'subcategoryid':self.sub.pk,'brandid':self.brand.pk,'productid':self.product.pk,'productsubname':'Blue M','description':'Cotton','qty':4,'price':500,'offerprice':0,'offertype':'None','size':'M','color':'Blue'}
    def post(self,endpoint,data,format='json'):
        token=self.client.get('/api/auth_csrf').json()['csrfToken']
        return self.client.post('/api/'+endpoint,data,format=format,HTTP_X_CSRFTOKEN=token)
    def image(self):
        content=BytesIO();Image.new('RGB',(2,2),'blue').save(content,format='PNG')
        return SimpleUploadedFile('shirt,blue.png',content.getvalue(),content_type='image/png')
    def variant(self):
        return ProductDetails.objects.create(**{key+'_id' if key in ('maincategoryid','subcategoryid','brandid','productid') else key:value for key,value in self.data.items()})
    def test_multipart_create_and_replace_multiple_images(self):
        result=self.post('productdetails_submit',dict(self.data,icon=[self.image(),self.image()]),'multipart')
        self.assertEqual(result.status_code,200,result.content)
        variant=ProductDetails.objects.get()
        self.assertEqual(len(variant.icon.split(',')),2)
        self.assertNotEqual(*variant.icon.split(','))
        self.assertEqual(self.post('editproductdetails_icon',{'id':variant.pk,'icon':[self.image(),self.image()]},'multipart').status_code,200)
        variant.refresh_from_db();self.assertEqual(len(variant.icon.split(',')),2)
    def test_product_crud_and_method_validation(self):
        data={key:self.data[key] for key in ('maincategoryid','subcategoryid','brandid','description')}
        result=self.post('product_submit',dict(data,productname='New shirt',icon=self.image()),'multipart')
        self.assertTrue(result.json()['status'],result.content)
        product=Product.objects.get(productname='New shirt')
        self.assertTrue(self.post('editproduct_data',dict(data,id=product.pk,productname='Updated')).json()['status'])
        self.assertEqual(self.client.get('/api/product_submit').status_code,400)  # Shared required-field guard rejects the empty GET before the view.
        self.assertTrue(self.post('deleteproductdata',{'id':product.pk}).json()['status'])
        self.assertEqual(self.post('deleteproductdata',{'id':product.pk}).status_code,404)
    def test_stale_stock_cannot_overwrite_checkout(self):
        variant=self.variant();ProductDetails.objects.filter(pk=variant.pk).update(qty=3)
        result=self.post('editproductdetails_data',dict(self.data,id=variant.pk,expected_qty=4))
        self.assertEqual(result.status_code,409)
        variant.refresh_from_db();self.assertEqual(variant.qty,3)
        result=self.post('editproductdetails_data',dict(self.data,id=variant.pk,expected_qty=3,qty=0))
        self.assertTrue(result.json()['status'],result.content)
        variant.refresh_from_db();self.assertEqual(variant.qty,0)
    def test_parent_and_order_linked_variants_protected(self):
        variant=self.variant()
        self.assertEqual(self.post('deleteproductdata',{'id':self.product.pk}).status_code,409)
        order=TryOrder.objects.create(order_id='CATALOG1',mobileno='9000000056')
        TryOrderItem.objects.create(try_order=order,product_details=variant,qty=1)
        self.assertEqual(self.post('deleteproductdetails',{'id':variant.pk}).status_code,409)
        self.assertEqual(self.post('editproductdetails_data',dict(self.data,id=variant.pk,expected_qty=4,size='XL')).status_code,409)
        self.assertTrue(ProductDetails.objects.filter(pk=variant.pk).exists())
    def test_parent_hierarchy_cannot_break_variants(self):
        self.variant();brand=Brands.objects.create(brandname='Other')
        result=self.post('editproduct_data',{'id':self.product.pk,'maincategoryid':self.category.pk,'subcategoryid':self.sub.pk,'brandid':brand.pk,'productname':'Shirt','description':'Cotton'})
        self.assertEqual(result.status_code,409)
    def test_invalid_create_does_not_write_files(self):
        from pathlib import Path
        result=self.post('productdetails_submit',dict(self.data,price=0,icon=self.image()),'multipart')
        self.assertEqual(result.status_code,400)
        self.assertFalse(ProductDetails.objects.exists())
        self.assertEqual(list(Path(self.media.name).rglob('*')),[])

    def test_all_parent_deletes_preserve_order_and_stock(self):
        from .models import TrialReturn
        variant=self.variant()
        order=TryOrder.objects.create(order_id='PROTECTED',mobileno='9000000056')
        item=TryOrderItem.objects.create(try_order=order,product_details=variant,qty=1,stock_reserved=True)
        returned=TrialReturn.objects.create(item=item,condition='Good',tag_intact=True)
        for endpoint,record in [('deletemaincategorydata',self.category),('deletemysubcategorydata',self.sub),('deletebranddata',self.brand)]:
            with self.subTest(endpoint=endpoint):
                result=self.post(endpoint,{'id':record.pk})
                self.assertEqual(result.status_code,409,result.content)
                self.assertIn('used',result.json()['message'])
                item.refresh_from_db();variant.refresh_from_db();returned.refresh_from_db()
                self.assertEqual(item.product_details_id,variant.pk)
                self.assertEqual(variant.qty,4)
                self.assertTrue(item.stock_reserved)
    def test_model_and_bulk_deletes_cannot_bypass_protection(self):
        from django.db.models.deletion import ProtectedError
        variant=self.variant()
        order=TryOrder.objects.create(order_id='ORMPROTECT',mobileno='9000000056')
        TryOrderItem.objects.create(try_order=order,product_details=variant,qty=1)
        for record in (self.category,self.sub,self.brand,self.product,variant):
            with self.subTest(model=type(record).__name__):
                with self.assertRaises(ProtectedError):
                    type(record).objects.filter(pk=record.pk).delete()
    def test_unused_parents_can_be_deleted(self):
        category=MainCategory.objects.create(maincategoryname='Unused')
        sub=MySubCategory.objects.create(maincategoryid=category,subcategoryname='Unused')
        brand=Brands.objects.create(brandname='Unused')
        self.assertEqual(self.post('deletemaincategorydata',{'id':category.pk}).status_code,409)
        for endpoint,record in [('deletemysubcategorydata',sub),('deletemaincategorydata',category),('deletebranddata',brand)]:
            self.assertTrue(self.post(endpoint,{'id':record.pk}).json()['status'])
            self.assertEqual(self.post(endpoint,{'id':record.pk}).status_code,404)
    def setup_purchased_review(self):
        from .models import SignUp, FinalOrder, FinalOrderItem
        variant=self.variant()
        user=SignUp.objects.create(mobileno='9000000056',emailid='review@example.test',fname='Buyer',password='Catalog-test-872!')
        order=TryOrder.objects.create(order_id='REVIEW',mobileno=user.pk,status='DELIVERED')
        item=TryOrderItem.objects.create(try_order=order,product_details=variant,qty=1,status='PURCHASED')
        final=FinalOrder.objects.create(try_order=order,order_id='FINREVIEW',status='completed',payment_status='paid')
        FinalOrderItem.objects.create(final_order=final,try_order_item=item)
        self.post('check_costumer_login',{'mobileno':user.pk,'password':'Catalog-test-872!'})
        return variant
    def test_review_does_not_overwrite_stock_or_catalog(self):
        from unittest.mock import patch
        from .models import ProductReview
        variant=self.setup_purchased_review()
        create=ProductReview.objects.create
        def interleaved_write(**kwargs):
            # Deterministically reproduce a stale-instance write: another writer's
            # fields change after the review reads the variant, before ratings save.
            ProductDetails.objects.filter(pk=variant.pk).update(qty=2,price=700,icon='new.png')
            return create(**kwargs)
        with patch.object(ProductReview.objects,'create',side_effect=interleaved_write):
            result=self.post('submit_product_review',{'product_details_id':variant.pk,'rating':3,'review_text':'Good'})
        self.assertTrue(result.json()['status'],result.content)
        variant.refresh_from_db()
        self.assertEqual((variant.qty,variant.price,variant.icon),(2,700,'new.png'))
        self.assertEqual((variant.avg_rating,variant.total_reviews),(3,1))
        self.assertTrue(self.post('submit_product_review',{'product_details_id':variant.pk,'rating':5}).json()['status'])
        variant.refresh_from_db();self.assertEqual((variant.avg_rating,variant.total_reviews),(4,2))
    def test_failed_rating_write_rolls_back_review(self):
        from unittest.mock import patch
        from django.db import OperationalError
        from django.db.models.query import QuerySet
        from .models import ProductReview
        variant=self.setup_purchased_review()
        original=QuerySet.update
        def fail_rating(queryset,**kwargs):
            if 'total_reviews' in kwargs: raise OperationalError('simulated busy database')
            return original(queryset,**kwargs)
        with patch.object(QuerySet,'update',fail_rating):
            result=self.post('submit_product_review',{'product_details_id':variant.pk,'rating':4})
        self.assertEqual(result.status_code,409)
        self.assertFalse(ProductReview.objects.exists())
        variant.refresh_from_db();self.assertEqual((variant.qty,variant.total_reviews),(4,0))
