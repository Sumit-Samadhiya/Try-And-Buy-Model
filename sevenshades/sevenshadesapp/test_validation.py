from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils.datastructures import MultiValueDict
from .request_validation import validate_request
from .models import MainCategory, MySubCategory

class InputValidationTests(TestCase):
    def test_prices_quantities_and_rating_ranges(self):
        for payload in ({'price':0},{'qty':-1},{'qty':True},{'rating':6},{'price':100,'offerprice':101}):
            self.assertTrue(validate_request('validation_probe',payload,{}))

    def test_text_types_mobile_pin_and_email(self):
        for payload in ({'password':'        '},{'mobileno':['9000000000']},{'emailid':'bad@'},{'postcode':'012345'},{'city':'   '},{'address':'a'*251}):
            self.assertTrue(validate_request('validation_probe',payload,{}))

    def test_mismatched_category_is_rejected(self):
        first=MainCategory.objects.create(maincategoryname='One')
        second=MainCategory.objects.create(maincategoryname='Two')
        sub=MySubCategory.objects.create(maincategoryid=first,subcategoryname='Sub')
        errors=validate_request('product_submit',{'maincategoryid':second.pk,'subcategoryid':sub.pk}, {})
        self.assertIn('subcategoryid',errors)

    def test_fake_image_rejected(self):
        image=SimpleUploadedFile('fake.png',b'not an image',content_type='image/png')
        self.assertIn('icon',validate_request('banner_submit',{},MultiValueDict({'icon':[image]})))
