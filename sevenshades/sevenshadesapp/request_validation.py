"""Shared input checks before routed API handlers, including legacy direct writers."""
import re
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from PIL import Image, UnidentifiedImageError

TEXT_LIMITS = {'fname':70,'lname':70,'name':120,'adminname':70,'maincategoryname':70,'subcategoryname':70,'brandname':70,'productname':70,'productsubname':70,'description':150,'color':70,'size':70,'offertype':70,'bannerdescription':70,'address':70,'city':70,'country':70,'zone':70,'bike_number':40,'order_id':40,'assignment_id':40,'rider_id':30,'tag_id':40,'review_text':2000}
REQUIRED = {
 'signup_submit':['mobileno','fname','lname','emailid','password','confirm_password','otp','challenge_id'],
 'check_costumer_login':['mobileno','password'], 'check_admin_login':['emailid','password'], 'delivery_rider_login':['phone','password'],
 'otp_request':['mobileno','purpose'], 'otp_login':['mobileno','otp','challenge_id'], 'reset_password':['mobileno','otp','challenge_id','password','confirm_password'],
 'address_submit':['address','city','country','postcode','address_type'], 'address_update':['address','city','country','postcode','address_type'],
 'delivery_rider_create':['name','phone','password','bike_number','zone'],
 'maincategory_submit':['maincategoryname'], 'editmaincategory_data':['id','maincategoryname'],
 'mysubcategory_submit':['maincategoryid','subcategoryname'], 'editmysubcategory_data':['id','maincategoryid','subcategoryname'],
 'brand_submit':['brandname'], 'editbrand_data':['id','brandname'],
 'product_submit':['maincategoryid','subcategoryid','brandid','productname','description'],
 'editproduct_data':['id','maincategoryid','subcategoryid','brandid','productname','description'],
 'productdetails_submit':['maincategoryid','subcategoryid','brandid','productid','productsubname','description','qty','price','offerprice','color','size','offertype'],
 'editproductdetails_data':['id','maincategoryid','subcategoryid','brandid','productid','productsubname','description','qty','price','offerprice','color','size','offertype'],
}


def validate_request(endpoint, data, files):
    errors = {}
    for field in REQUIRED.get(endpoint, []):
        if data.get(field) is None or data.get(field) == '' or isinstance(data.get(field), str) and not data[field].strip():
            errors[field] = ['This field is required.']
    for key, value in data.items():
        if key in TEXT_LIMITS:
            # Checkout's nested address is independently validated using its saved ID.
            if key == 'address' and endpoint == 'try_order_create':
                continue
            if not isinstance(value, str) or len(value) > TEXT_LIMITS[key] or '\x00' in value or (not value.strip() and key not in ('review_text','bannerdescription')):
                errors[key] = [f'Enter valid text up to {TEXT_LIMITS[key]} characters.']
        if key in ('mobileno','mobile','phone','user_mobile') and (not isinstance(value,str) or not re.fullmatch(r'[6-9][0-9]{9}',value)):
            errors[key] = ['Enter a 10-digit Indian mobile number starting with 6–9.']
        if key == 'emailid':
            try:
                if not isinstance(value,str) or len(value)>70: raise ValidationError('email')
                validate_email(value)
            except ValidationError:
                errors[key] = ['Enter a valid email address (up to 70 characters).']
        if key in ('password','confirm_password') and (not isinstance(value,str) or not value.strip() or len(value)>128):
            errors[key] = ['Enter a password up to 128 characters.']
        if key == 'postcode' and (not isinstance(value,str) or not re.fullmatch(r'[1-9][0-9]{5}',value)):
            errors[key] = ['Enter a valid 6-digit PIN code.']
        if key == 'address_type' and value not in ('Residential','Gated Society','Hostel/Commercial'):
            errors[key] = ['Choose a valid address type.']
        if key in ('qty','price','offerprice','rating','id','maincategoryid','subcategoryid','brandid','productid','product_details_id','try_order_item_id','return_id','address_id','bill_revision'):
            minimum = 0 if key in ('qty','offerprice','bill_revision') else 1
            maximum = 5 if key == 'rating' else 2147483647
            if type(value) is bool or not isinstance(value,(int,str)) or not re.fullmatch(r'[0-9]+',str(value)) or not minimum <= int(value) <= maximum:
                errors[key] = [f'Enter a whole number between {minimum} and {maximum}.']
    if 'price' in data and 'offerprice' in data and not ({'price','offerprice'} & errors.keys()):
        if int(data['offerprice']) > int(data['price']):
            errors['offerprice'] = ['Offer price cannot exceed the regular price.']
    if endpoint == 'delivery_rider_create' and data.get('status','Active') not in ('Active','Inactive'):
        errors['status'] = ['Choose Active or Inactive.']
    if endpoint in ('signup_submit','reset_password') and 'confirm_password' in data and data.get('password') != data.get('confirm_password'):
        errors['confirm_password'] = ['Passwords do not match.']
    # Check referenced catalog hierarchy before legacy writers can save inconsistent rows.
    from .models import MainCategory, MySubCategory, Brands, Product, ProductDetails
    if endpoint.endswith('_submit') or endpoint.startswith('edit'):
        refs = {'maincategoryid': MainCategory, 'subcategoryid': MySubCategory, 'brandid': Brands, 'productid': Product}
        found = {}
        for field, model in refs.items():
            if field in data and field not in errors:
                found[field] = model.objects.filter(pk=data[field]).first()
                if not found[field]: errors[field] = ['This selection no longer exists.']
        sub = found.get('subcategoryid')
        if sub and 'maincategoryid' in found and str(sub.maincategoryid_id) != str(data['maincategoryid']):
            errors['subcategoryid'] = ['Choose a subcategory belonging to this category.']
        product = found.get('productid')
        if product:
            for field in ('maincategoryid','subcategoryid','brandid'):
                if field in data and str(getattr(product, field+'_id')) != str(data[field]): errors[field] = ['Must match the selected product.']
    image_creates = {'maincategory_submit','mysubcategory_submit','brand_submit','product_submit','productdetails_submit','banner_submit'}
    if endpoint in image_creates or endpoint.endswith('_icon'):
        if not files.get('icon'):
            errors['icon'] = ['Choose an image to upload.']
    if sum(len(files.getlist(key)) for key in files) > 10:
        errors['icon'] = ['Upload at most 10 images at a time.']
    for field in files:
        for upload in files.getlist(field):
            if upload.size > 5 * 1024 * 1024:
                errors[field] = ['Each image must be 5 MB or smaller.']; continue
            try:
                image = Image.open(upload)
                if image.format not in ('JPEG','PNG','WEBP','AVIF','GIF') or image.width * image.height > 25000000:
                    raise ValueError('image')
                image.verify()
            except (ValueError, OSError, Image.DecompressionBombError):
                errors[field] = ['Upload a valid JPG, PNG, WebP, AVIF or GIF image up to 25 megapixels.']
            finally:
                upload.seek(0)
    return errors
