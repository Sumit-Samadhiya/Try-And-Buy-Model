from rest_framework import serializers
from datetime import timedelta
from django.utils import timezone
from django.contrib.auth.hashers import make_password
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError


class AccountSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, max_length=128, trim_whitespace=False)

    def validate_password(self, value):
        try:
            validate_password(value)
        except ValidationError as exc:
            raise serializers.ValidationError(exc.messages)
        return make_password(value)

from sevenshadesapp.models import MainCategory,MySubCategory,Brands,Product,ProductDetails,AdminLogin,Banner,SignUp,UserAddress,WalletAccount,TryOrder,TryOrderItem,FinalOrder,FinalOrderItem,DeliveryRider,DeliveryAssignment,DeliveryBatch,ReturnedItem,TamperProofTag,ProductReview

class ProductReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductReview
        fields = '__all__'
        extra_kwargs = {'user_mobile': {'write_only': True}}

class  MainCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model=MainCategory
        fields = '__all__'




class  MySubCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model=MySubCategory
        fields = '__all__'

class  MySubCategoryGetSerializer(serializers.ModelSerializer):
    maincategoryid=MainCategorySerializer(many=False)
    class Meta:
        model=MySubCategory
        fields = '__all__'



class  BrandsSerializer(serializers.ModelSerializer):
    class Meta:
        model=Brands
        fields = '__all__'



class  ProductGetSerializer(serializers.ModelSerializer):
    maincategoryid= MainCategorySerializer(many=False)
    subcategoryid=MySubCategorySerializer(many=False)
    brandid= BrandsSerializer(many=False)
    is_available = serializers.SerializerMethodField()
    variants_count = serializers.SerializerMethodField()
    avg_rating = serializers.SerializerMethodField()
    total_reviews = serializers.SerializerMethodField()
    min_price = serializers.SerializerMethodField()
    min_offerprice = serializers.SerializerMethodField()
    
    class Meta:
        model=Product
        fields = '__all__'

    def get_is_available(self, obj):
        return obj.productdetails_set.filter(qty__gt=0).exists()

    def get_variants_count(self, obj):
        return obj.productdetails_set.count()

    def get_avg_rating(self, obj):
        from django.db.models import Avg
        val = ProductReview.objects.filter(product_details__productid=obj).aggregate(Avg('rating'))['rating__avg']
        return round(val, 1) if val is not None else 0.0

    def get_total_reviews(self, obj):
        return ProductReview.objects.filter(product_details__productid=obj).count()

    def _best_available_variant(self, obj):
        variants = list(obj.productdetails_set.filter(qty__gt=0).only('price', 'offerprice'))
        if not variants:
            return None
        return min(variants, key=lambda row: row.offerprice if 0 < row.offerprice <= row.price else row.price)

    def get_min_price(self, obj):
        variant = self._best_available_variant(obj)
        return variant.price if variant else 0

    def get_min_offerprice(self, obj):
        variant = self._best_available_variant(obj)
        return variant.offerprice if variant and 0 < variant.offerprice <= variant.price else 0



class  ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model=Product
        fields = '__all__'


class  ProductDetailsGetSerializer(serializers.ModelSerializer):
    maincategoryid= MainCategorySerializer(many=False)
    subcategoryid=MySubCategorySerializer(many=False)
    brandid= BrandsSerializer(many=False)
    productid=ProductSerializer(many=False)
    class Meta:
        model=ProductDetails
        fields = '__all__'


class  ProductDetailsSerializer(serializers.ModelSerializer):
    class Meta:
        model=ProductDetails
        fields = '__all__'


class  AdminLoginSerializer(AccountSerializer):
    class Meta:
        model=AdminLogin
        fields = '__all__'


class  BannerSerializer(serializers.ModelSerializer):
    class Meta:
        model=Banner
        fields = '__all__'

class  SignUpSerializer(AccountSerializer):
    emailid = serializers.EmailField(max_length=70)

    def validate_emailid(self, value):
        value = value.strip().lower()
        existing = SignUp.objects.filter(emailid__iexact=value)
        if self.instance: existing = existing.exclude(pk=self.instance.pk)
        if existing.exists(): raise serializers.ValidationError('An account with this email already exists.')
        return value

    class Meta:
        model=SignUp
        fields = '__all__'

class SignUpSafeSerializer(serializers.ModelSerializer):
    """SignUp serializer that excludes the password field."""
    class Meta:
        model=SignUp
        fields = ['mobileno', 'fname', 'lname', 'emailid']

class UserAddressGetSerializer(serializers.ModelSerializer):
    mobileno=SignUpSafeSerializer(many=False)
    class Meta:
        model = UserAddress
        fields = '__all__'

class  UserAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model=UserAddress
        fields = '__all__'


class WalletAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = WalletAccount
        fields = '__all__'


class TryOrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = TryOrderItem
        fields = '__all__'


class TryOrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = TryOrder
        fields = '__all__'


class FinalOrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinalOrderItem
        fields = '__all__'


class FinalOrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinalOrder
        fields = '__all__'


class TryOrderWithItemsSerializer(serializers.ModelSerializer):
    tryorderitem_set = TryOrderItemSerializer(many=True)

    class Meta:
        model = TryOrder
        fields = '__all__'


class FinalOrderWithItemsSerializer(serializers.ModelSerializer):
    finalorderitem_set = FinalOrderItemSerializer(many=True)

    class Meta:
        model = FinalOrder
        fields = '__all__'


class DeliveryRiderSerializer(AccountSerializer):
    class Meta:
        model = DeliveryRider
        fields = '__all__'


class DeliveryAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryAssignment
        fields = '__all__'


class DeliveryAssignmentWithRefSerializer(serializers.ModelSerializer):
    rider = DeliveryRiderSerializer(many=False)
    try_order = TryOrderWithItemsSerializer(many=False)
    trial_duration_seconds = serializers.SerializerMethodField()
    trial_overdue = serializers.SerializerMethodField()
    trial_overdue_minutes = serializers.SerializerMethodField()
    is_sos = serializers.SerializerMethodField()
    sos_deadline = serializers.SerializerMethodField()
    sos_overdue = serializers.SerializerMethodField()
    sos_remaining_minutes = serializers.SerializerMethodField()

    class Meta:
        model = DeliveryAssignment
        fields = '__all__'

    def get_trial_duration_seconds(self, obj):
        if not obj.trial_start_time:
            return 0
        end = obj.trial_end_time or timezone.now()
        return max(0, int((end - obj.trial_start_time).total_seconds()))

    def get_trial_overdue(self, obj):
        return self.get_trial_duration_seconds(obj) > 900

    def get_trial_overdue_minutes(self, obj):
        duration = self.get_trial_duration_seconds(obj)
        return max(0.0, round((duration - 900) / 60, 1))

    def get_is_sos(self, obj):
        return bool(obj.try_order and (obj.try_order.trial_type == 'SOS' or obj.try_order.delivery_mode == 'emergency_sos'))

    def get_sos_deadline(self, obj):
        if not self.get_is_sos(obj) or not obj.try_order:
            return None
        return (obj.try_order.created_at + timedelta(minutes=120)).isoformat()

    def get_sos_overdue(self, obj):
        if not self.get_is_sos(obj) or not obj.try_order:
            return False
        if obj.status in ('Delivered', 'Trial Completed'):
            return False
        return timezone.now() > obj.try_order.created_at + timedelta(minutes=120)

    def get_sos_remaining_minutes(self, obj):
        if not self.get_is_sos(obj) or not obj.try_order:
            return None
        elapsed = (timezone.now() - obj.try_order.created_at).total_seconds()
        return max(0, int((7200 - elapsed) / 60))

class DeliveryBatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryBatch
        fields = '__all__'

class ReturnedItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReturnedItem
        fields = '__all__'

class TamperProofTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = TamperProofTag
        fields = '__all__'



