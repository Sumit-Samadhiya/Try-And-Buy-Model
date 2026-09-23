from django.db import models

# Create your models here.
class MainCategory(models.Model):
    maincategoryname=models.CharField(max_length=70,blank=False,default='')
    icon=models.ImageField(upload_to='static/')



class MySubCategory(models.Model):
    maincategoryid=models.ForeignKey(MainCategory,on_delete=models.CASCADE,default=1)
    subcategoryname=models.CharField(max_length=70,blank=False,default='')
    icon=models.ImageField(upload_to='static/')




class Brands(models.Model):
    brandname=models.CharField(max_length=70,blank=False,default='')
    icon=models.ImageField(upload_to='static/')


class Product(models.Model):
    maincategoryid=models.ForeignKey(MainCategory,on_delete=models.CASCADE,default=1)
    subcategoryid=models.ForeignKey(MySubCategory,on_delete=models.CASCADE,default=1)
    brandid=models.ForeignKey(Brands,on_delete=models.CASCADE,default=1)
    productname=models.CharField(max_length=70,blank=False,default='')
    description=models.CharField(max_length=150,blank=False,default='')
    icon=models.ImageField(upload_to='static/')


class ProductDetails(models.Model):
    maincategoryid=models.ForeignKey(MainCategory,on_delete=models.CASCADE,default=1)
    subcategoryid=models.ForeignKey(MySubCategory,on_delete=models.CASCADE,default=1)
    brandid=models.ForeignKey(Brands,on_delete=models.CASCADE,default=1)
    productid=models.ForeignKey(Product,on_delete=models.CASCADE,default=1)
    productsubname=models.CharField(max_length=70,blank=False,default='')
    description=models.CharField(max_length=150,blank=False,default='')
    qty=models.IntegerField(blank=False,default='')
    price=models.IntegerField(blank=False,default='')
    color=models.CharField(max_length=70,blank=False,default='')
    size=models.CharField(max_length=70,blank=False,default='')
    offerprice=models.IntegerField(blank=False,default='') 
    offertype=models.CharField(max_length=70,blank=False,default='')
    icon=models.TextField(default='')
    avg_rating = models.FloatField(default=0.0)
    total_reviews = models.IntegerField(default=0)


class ProductReview(models.Model):
    product_details = models.ForeignKey(ProductDetails, on_delete=models.CASCADE)
    user_mobile = models.CharField(max_length=15)
    user_name = models.CharField(max_length=70, default='Customer')
    rating = models.IntegerField(default=5)
    review_text = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)


class AdminLogin(models.Model):
    emailid=models.CharField(max_length=70,blank=False,default='',unique=True)
    mobileno=models.CharField(max_length=70,blank=False,default='',unique=True)
    adminname=models.CharField(max_length=70,blank=False,default='')
    password=models.CharField(max_length=70,blank=False,default='')
    picture=models.CharField(max_length=70,blank=False,default='')


class Banner(models.Model):
    bannerdescription=models.CharField(max_length=70,blank=False,default='')
    icon=models.TextField(default='')

class SignUp(models.Model):
    mobileno=models.CharField(max_length=15,blank=False,primary_key=True,default='')
    fname=models.CharField(max_length=70,blank=False,default='')
    lname=models.CharField(max_length=70,blank=False,default='')
    emailid=models.CharField(max_length=70,blank=False,default='',unique=True)
    password=models.CharField(max_length=70,blank=False,default='')

class UserAddress(models.Model):
    mobileno=models.ForeignKey(SignUp,on_delete=models.CASCADE)
    country=models.CharField(max_length=70,blank=False,default='')
    address=models.CharField(max_length=70,blank=False,default='')
    city=models.CharField(max_length=70,blank=False,default='')
    postcode=models.CharField(max_length=70,blank=False,default='')
    address_type=models.CharField(max_length=30,blank=False,default='Residential')


class WalletAccount(models.Model):
    mobileno = models.CharField(max_length=15, unique=True)
    balance = models.IntegerField(blank=False, default=0)
    updated_at = models.DateTimeField(auto_now=True)


class TryOrder(models.Model):
    order_id = models.CharField(max_length=40, unique=True)
    mobileno = models.CharField(max_length=15)
    address_text = models.CharField(max_length=250, blank=False, default='')
    city = models.CharField(max_length=70, blank=False, default='')
    country = models.CharField(max_length=70, blank=False, default='')
    postcode = models.CharField(max_length=20, blank=False, default='')
    address_type = models.CharField(max_length=30, blank=False, default='Residential')
    delivery_mode = models.CharField(max_length=30, blank=False, default='standard')
    delivery_slot = models.CharField(max_length=50, blank=False, default='10 AM - 2 PM')
    total_try_items = models.IntegerField(blank=False, default=0)
    reference_value = models.IntegerField(blank=False, default=0)
    try_fee = models.IntegerField(blank=False, default=0)
    is_first_order = models.BooleanField(default=False)
    try_payment_mode = models.CharField(max_length=20, blank=False, default='free')
    try_payment_status = models.CharField(max_length=20, blank=False, default='paid')
    
    # New fields
    trial_fee_paid = models.BooleanField(default=False)
    trial_type = models.CharField(max_length=20, choices=[('STANDARD', 'Standard'), ('SOS', 'SOS')], default='STANDARD')
    payment_status = models.CharField(max_length=20, choices=[('PENDING', 'Pending'), ('PARTIAL_TRIAL_FEE', 'Partial Trial Fee'), ('COMPLETED', 'Completed')], default='PENDING')
    final_bill = models.TextField(null=True, blank=True)
    assigned_rider = models.ForeignKey('DeliveryRider', on_delete=models.SET_NULL, null=True, blank=True)
    
    status = models.CharField(max_length=60, choices=[
        ('TRY_REQUESTED', 'Try Requested'),
        ('ASSIGNED', 'Assigned'),
        ('OUT_FOR_TRIAL', 'Out for Trial'),
        ('TRIAL_IN_PROGRESS', 'Trial in Progress'),
        ('SELECTION_SUBMITTED', 'Selection Submitted'),
        ('DELIVERED', 'Delivered'),
        ('CANCELLED', 'Cancelled')
    ], default='TRY_REQUESTED')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class TryOrderItem(models.Model):
    try_order = models.ForeignKey(TryOrder, on_delete=models.CASCADE)
    product_details = models.ForeignKey(ProductDetails, on_delete=models.SET_NULL, null=True, blank=True)
    product_name = models.CharField(max_length=120, blank=False, default='')
    brand_name = models.CharField(max_length=120, blank=False, default='')
    qty = models.IntegerField(blank=False, default=1)
    unit_price = models.IntegerField(blank=False, default=0)
    line_total = models.IntegerField(blank=False, default=0)
    status = models.CharField(max_length=20, choices=[('TRY_REQUESTED', 'Try Requested'), ('PURCHASED', 'Purchased'), ('RETURNED', 'Returned')], default='TRY_REQUESTED')


class FinalOrder(models.Model):
    try_order = models.OneToOneField(TryOrder, on_delete=models.CASCADE)
    order_id = models.CharField(max_length=40, unique=True)
    selected_items_count = models.IntegerField(blank=False, default=0)
    items_total = models.IntegerField(blank=False, default=0)
    wallet_credit = models.IntegerField(blank=False, default=0)
    final_payable = models.IntegerField(blank=False, default=0)
    payment_mode = models.CharField(max_length=20, blank=False, default='upi')
    payment_status = models.CharField(max_length=20, blank=False, default='pending')
    status = models.CharField(max_length=60, blank=False, default='ready_for_payment')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class FinalOrderItem(models.Model):
    final_order = models.ForeignKey(FinalOrder, on_delete=models.CASCADE)
    try_order_item = models.ForeignKey(TryOrderItem, on_delete=models.SET_NULL, null=True, blank=True)
    product_name = models.CharField(max_length=120, blank=False, default='')
    brand_name = models.CharField(max_length=120, blank=False, default='')
    qty = models.IntegerField(blank=False, default=1)
    unit_price = models.IntegerField(blank=False, default=0)
    line_total = models.IntegerField(blank=False, default=0)


class DeliveryRider(models.Model):
    rider_id = models.CharField(max_length=30, unique=True)
    name = models.CharField(max_length=120, blank=False, default='')
    phone = models.CharField(max_length=15, unique=True)
    password = models.CharField(max_length=120, blank=False, default='')
    bike_number = models.CharField(max_length=40, blank=False, default='')
    zone = models.CharField(max_length=70, blank=False, default='')
    status = models.CharField(max_length=20, blank=False, default='Active')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class DeliveryBatch(models.Model):
    batch_id = models.CharField(max_length=40, unique=True)
    rider = models.ForeignKey(DeliveryRider, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=30, default='Pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class DeliveryAssignment(models.Model):
    assignment_id = models.CharField(max_length=40, unique=True)
    try_order = models.ForeignKey(TryOrder, on_delete=models.CASCADE)
    rider = models.ForeignKey(DeliveryRider, on_delete=models.CASCADE)
    batch = models.ForeignKey(DeliveryBatch, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=30, blank=False, default='Assigned')
    trial_start_time = models.DateTimeField(null=True, blank=True)
    trial_end_time = models.DateTimeField(null=True, blank=True)
    assigned_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class ReturnedItem(models.Model):
    final_order_item = models.ForeignKey(FinalOrderItem, on_delete=models.CASCADE)
    hygiene_status = models.CharField(max_length=30, default='Pending')
    condition = models.CharField(max_length=30, default='Good')
    processed_at = models.DateTimeField(auto_now_add=True)

class TamperProofTag(models.Model):
    tag_id = models.CharField(max_length=40, unique=True)
    final_order_item = models.ForeignKey(FinalOrderItem, on_delete=models.CASCADE)
    is_valid = models.BooleanField(default=True)

class DeliveryZone(models.Model):
    zone_name = models.CharField(max_length=70, unique=True)
    postcodes = models.TextField(help_text="Comma-separated postcodes")

class ExcludedArea(models.Model):
    area_name = models.CharField(max_length=70, unique=True)
    postcode = models.CharField(max_length=20)

# class Search(models.Model):
    
#     name=models.CharField(max_length=70,blank=False,default='')
    
