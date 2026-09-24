from rest_framework import serializers
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
    
    class Meta:
        model=Product
        fields = '__all__'


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

    class Meta:
        model = DeliveryAssignment
        fields = '__all__'

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


# class  SearchSerializer(serializers.ModelSerializer):
#     class Meta:
#         model=Search
#         fields = '__all__'




