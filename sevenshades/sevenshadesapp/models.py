from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models
from django.contrib.auth.hashers import make_password, identify_hasher, is_password_usable


class PasswordAccount(models.Model):
    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        if not is_password_usable(self.password):
            return super().save(*args, **kwargs)
        try:
            identify_hasher(self.password)
        except ValueError:
            self.password = make_password(self.password or None)
        super().save(*args, **kwargs)


# Create your models here.
class MainCategory(models.Model):
    maincategoryname=models.CharField(max_length=70,blank=False,default='')
    icon=models.ImageField(upload_to='static/')



class MySubCategory(models.Model):
    maincategoryid=models.ForeignKey(MainCategory,on_delete=models.PROTECT,default=1)
    subcategoryname=models.CharField(max_length=70,blank=False,default='')
    icon=models.ImageField(upload_to='static/')




class Brands(models.Model):
    brandname=models.CharField(max_length=70,blank=False,default='')
    icon=models.ImageField(upload_to='static/')


class Product(models.Model):
    maincategoryid=models.ForeignKey(MainCategory,on_delete=models.PROTECT,default=1)
    subcategoryid=models.ForeignKey(MySubCategory,on_delete=models.PROTECT,default=1)
    brandid=models.ForeignKey(Brands,on_delete=models.PROTECT,default=1)
    productname=models.CharField(max_length=70,blank=False,default='')
    description=models.CharField(max_length=150,blank=False,default='')
    icon=models.ImageField(upload_to='static/')


class ProductDetails(models.Model):
    maincategoryid=models.ForeignKey(MainCategory,on_delete=models.PROTECT,default=1)
    subcategoryid=models.ForeignKey(MySubCategory,on_delete=models.PROTECT,default=1)
    brandid=models.ForeignKey(Brands,on_delete=models.PROTECT,default=1)
    productid=models.ForeignKey(Product,on_delete=models.PROTECT,default=1)
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

    class Meta:
        constraints = [
            models.CheckConstraint(check=models.Q(qty__gte=0), name='product_details_qty_non_negative'),
            models.CheckConstraint(check=models.Q(price__gte=0), name='product_details_price_non_negative'),
            models.CheckConstraint(check=models.Q(offerprice__gte=0), name='product_details_offerprice_non_negative'),
            models.UniqueConstraint(fields=['productid', 'color', 'size'], name='unique_product_color_size'),
        ]


class ProductReview(models.Model):
    product_details = models.ForeignKey(ProductDetails, on_delete=models.CASCADE)
    user_mobile = models.CharField(max_length=15)
    user_name = models.CharField(max_length=70, default='Customer')
    rating = models.IntegerField(default=5)
    review_text = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['product_details', 'user_mobile'], name='unique_customer_product_review'),
            models.CheckConstraint(check=models.Q(rating__gte=1, rating__lte=5), name='product_review_rating_1_to_5'),
        ]



class AdminLogin(PasswordAccount):
    emailid=models.CharField(max_length=70,blank=False,default='',unique=True)
    mobileno=models.CharField(max_length=70,blank=False,default='',unique=True)
    adminname=models.CharField(max_length=70,blank=False,default='')
    password=models.CharField(max_length=128,blank=False,default='')
    picture=models.CharField(max_length=70,blank=False,default='')


class Banner(models.Model):
    bannerdescription=models.CharField(max_length=70,blank=False,default='')
    icon=models.TextField(default='')

class SignUp(PasswordAccount):
    mobileno=models.CharField(max_length=15,blank=False,primary_key=True,default='')
    fname=models.CharField(max_length=70,blank=False,default='')
    lname=models.CharField(max_length=70,blank=False,default='')
    emailid=models.CharField(max_length=70,blank=True,null=True,default=None,unique=True)
    password=models.CharField(max_length=128,blank=False,default='')

class UserAddress(models.Model):
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True, validators=[MinValueValidator(-90), MaxValueValidator(90)])
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True, validators=[MinValueValidator(-180), MaxValueValidator(180)])
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
    dispatched_at = models.DateTimeField(null=True, blank=True)
    reservation_expires_at = models.DateTimeField(null=True, blank=True, db_index=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancellation_reason = models.CharField(max_length=30, blank=True, default="")
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True, validators=[MinValueValidator(-90), MaxValueValidator(90)])
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True, validators=[MinValueValidator(-180), MaxValueValidator(180)])
    order_id = models.CharField(max_length=40, unique=True)
    mobileno = models.CharField(max_length=15)
    address_text = models.CharField(max_length=250, blank=False, default='')
    city = models.CharField(max_length=70, blank=False, default='')
    country = models.CharField(max_length=70, blank=False, default='')
    postcode = models.CharField(max_length=20, blank=False, default='')
    address_type = models.CharField(max_length=30, blank=False, default='Residential')
    delivery_mode = models.CharField(max_length=30, blank=False, default='standard')
    delivery_slot = models.CharField(max_length=50, blank=False, default='10 AM - 2 PM')
    scheduled_date = models.DateField(null=True, blank=True)
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
        ('TRIAL_COMPLETED', 'Trial Completed'),
        ('AWAITING_SELECTION_APPROVAL', 'Awaiting Selection Approval'),
        ('SELECTION_SUBMITTED', 'Selection Submitted'),
        ('DELIVERED', 'Delivered'),
        ('AWAITING_TRIAL_PAYMENT', 'Awaiting Trial Fee'),
        ('PAYMENT_PENDING', 'Payment Pending'),
        ('NO_PURCHASE', 'Trial Completed - No Purchase'),
        ('CANCELLED', 'Cancelled')
    ], default='TRY_REQUESTED')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class TryOrderItem(models.Model):
    stock_reserved = models.BooleanField(default=False)
    try_order = models.ForeignKey(TryOrder, on_delete=models.CASCADE)
    product_details = models.ForeignKey(ProductDetails, on_delete=models.PROTECT, null=True, blank=True)
    product_name = models.CharField(max_length=120, blank=False, default='')
    brand_name = models.CharField(max_length=120, blank=False, default='')
    size = models.CharField(max_length=70, blank=True, default='')
    color = models.CharField(max_length=70, blank=True, default='')
    qty = models.IntegerField(blank=False, default=1)
    unit_price = models.IntegerField(blank=False, default=0)
    line_total = models.IntegerField(blank=False, default=0)
    status = models.CharField(max_length=20, choices=[('TRY_REQUESTED', 'Try Requested'), ('PURCHASED', 'Purchased'), ('RETURNED', 'Returned')], default='TRY_REQUESTED')
    security_tag = models.CharField(max_length=40, blank=True, default='')



class FinalOrder(models.Model):
    paid_at = models.DateTimeField(null=True, blank=True)
    cash_collected_by = models.CharField(max_length=100, blank=True, default='')
    bill_revision = models.PositiveIntegerField(default=1)
    approved_revision = models.PositiveIntegerField(default=0)
    approved_by = models.CharField(max_length=15, blank=True, default='')
    approved_at = models.DateTimeField(null=True, blank=True)

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
    size = models.CharField(max_length=70, blank=True, default='')
    color = models.CharField(max_length=70, blank=True, default='')
    qty = models.IntegerField(blank=False, default=1)
    unit_price = models.IntegerField(blank=False, default=0)
    line_total = models.IntegerField(blank=False, default=0)


class DeliveryRider(PasswordAccount):
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True, validators=[MinValueValidator(-90), MaxValueValidator(90)])
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True, validators=[MinValueValidator(-180), MaxValueValidator(180)])
    location_updated_at = models.DateTimeField(null=True, blank=True)
    rider_id = models.CharField(max_length=30, unique=True)
    name = models.CharField(max_length=120, blank=False, default='')
    phone = models.CharField(max_length=15, unique=True)
    password = models.CharField(max_length=128, blank=False, default='')
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
    class Meta:
        constraints = [models.UniqueConstraint(fields=['try_order'], name='one_assignment_per_trial')]
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


class TrialReturn(models.Model):
    tag_intact = models.BooleanField(default=False)
    tag_verified = models.BooleanField(default=False)
    scanned_tag = models.CharField(max_length=40, blank=True, default='')
    steam_pressed_at = models.DateTimeField(null=True, blank=True)
    steam_pressed_by = models.CharField(max_length=100, blank=True, default='')
    item = models.OneToOneField(TryOrderItem, on_delete=models.PROTECT, related_name='trial_return')
    condition = models.CharField(max_length=20, choices=[('Good', 'Good'), ('Damaged', 'Damaged')])
    status = models.CharField(max_length=20, default='Collected', choices=[('Collected', 'Collected'), ('Received', 'Received'), ('Approved', 'Approved'), ('Rejected', 'Rejected')])
    recorded_by = models.CharField(max_length=100)
    received_by = models.CharField(max_length=100, blank=True, default='')
    reviewed_by = models.CharField(max_length=100, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    received_at = models.DateTimeField(null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)


class GatewayPayment(models.Model):
    receipt_reference = models.CharField(max_length=40, blank=True, default="")
    recovered_by = models.CharField(max_length=70, blank=True, default="")
    recovered_at = models.DateTimeField(null=True, blank=True)
    try_order = models.ForeignKey(TryOrder, on_delete=models.PROTECT)
    purpose = models.CharField(max_length=10, choices=[('trial', 'Trial fee'), ('final', 'Final purchase')])
    revision = models.PositiveIntegerField(default=0)
    amount_paise = models.PositiveIntegerField()
    gateway_order_id = models.CharField(max_length=100, unique=True, null=True, blank=True)
    payment_id = models.CharField(max_length=100, unique=True, null=True, blank=True)
    state = models.CharField(max_length=20, default='CREATING')
    created_at = models.DateTimeField(auto_now_add=True)
    captured_at = models.DateTimeField(null=True, blank=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=['try_order', 'purpose', 'revision'], name='one_payment_per_bill_revision')]


class OrderReceipt(models.Model):
    final_order = models.OneToOneField(FinalOrder, on_delete=models.PROTECT)
    number = models.CharField(max_length=40, unique=True)
    snapshot = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)


class OtpChallenge(models.Model):
    challenge_id = models.CharField(max_length=36, unique=True)
    mobile = models.CharField(max_length=10, db_index=True)
    purpose = models.CharField(max_length=10)
    session_hash = models.CharField(max_length=64)
    ip_hash = models.CharField(max_length=64, db_index=True)
    code_hash = models.CharField(max_length=64)
    attempts = models.PositiveSmallIntegerField(default=0)
    consumed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()


class RevokedToken(models.Model):
    """Revoked customer JWTs.

    The cache alone is not durable: under the default LocMemCache a restart
    would drop every revocation and silently make logged-out tokens valid
    again until they expired. Rows are prunable once expires_at has passed.
    """
    jti = models.CharField(max_length=32, unique=True)
    expires_at = models.DateTimeField(db_index=True)
    revoked_at = models.DateTimeField(auto_now_add=True)


class SupportTicket(models.Model):
    customer = models.ForeignKey(SignUp, on_delete=models.PROTECT, null=True, blank=True)
    rider = models.ForeignKey(DeliveryRider, on_delete=models.PROTECT, null=True, blank=True)
    subject = models.CharField(max_length=120)
    message = models.TextField()
    status = models.CharField(max_length=20, default='Open')
    priority = models.CharField(max_length=10, default='Normal')
    response = models.TextField(blank=True, default='')
    version = models.PositiveIntegerField(default=1)
    updated_by = models.CharField(max_length=70, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


from django.db.models.signals import post_delete, pre_save
from django.dispatch import receiver
import os


@receiver(post_delete, sender=Product)
def cleanup_product_image_on_delete(sender, instance, **kwargs):
    if instance.icon and hasattr(instance.icon, 'path') and os.path.isfile(instance.icon.path):
        try:
            os.remove(instance.icon.path)
        except OSError:
            pass


@receiver(pre_save, sender=Product)
def cleanup_product_image_on_update(sender, instance, **kwargs):
    if not instance.pk:
        return
    try:
        old_instance = Product.objects.get(pk=instance.pk)
        if old_instance.icon and old_instance.icon != instance.icon:
            if hasattr(old_instance.icon, 'path') and os.path.isfile(old_instance.icon.path):
                os.remove(old_instance.icon.path)
    except (Product.DoesNotExist, OSError):
        pass


@receiver(post_delete, sender=MainCategory)
def cleanup_category_image_on_delete(sender, instance, **kwargs):
    if instance.icon and hasattr(instance.icon, 'path') and os.path.isfile(instance.icon.path):
        try:
            os.remove(instance.icon.path)
        except OSError:
            pass


@receiver(post_delete, sender=Brands)
def cleanup_brand_image_on_delete(sender, instance, **kwargs):
    if instance.icon and hasattr(instance.icon, 'path') and os.path.isfile(instance.icon.path):
        try:
            os.remove(instance.icon.path)
        except OSError:
            pass


class BudgetDeal(models.Model):
    title = models.CharField(max_length=100)
    price_tag = models.CharField(max_length=50)
    max_price = models.IntegerField(null=True, blank=True)
    maincategoryid = models.ForeignKey(MainCategory, on_delete=models.SET_NULL, null=True, blank=True)
    subcategoryid = models.ForeignKey(MySubCategory, on_delete=models.SET_NULL, null=True, blank=True)
    icon = models.ImageField(upload_to='static/', null=True, blank=True)
    tier_color = models.CharField(max_length=20, default='blue')
    order_index = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} ({self.price_tag})"
