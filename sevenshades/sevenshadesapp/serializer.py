from rest_framework import  serializers
from sevenshadesapp.models import MainCategory,MySubCategory,Brands,Product,ProductDetails,AdminLogin,Banner,SignUp,UserAddress,WalletAccount,TryOrder,TryOrderItem,FinalOrder,FinalOrderItem,DeliveryRider,DeliveryAssignment,DeliveryBatch,ReturnedItem,TamperProofTag,ProductReview

class ProductReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductReview
        fields = '__all__'

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


class  AdminLoginSerializer(serializers.ModelSerializer):
    class Meta:
        model=AdminLogin
        fields = '__all__'


class  BannerSerializer(serializers.ModelSerializer):
    class Meta:
        model=Banner
        fields = '__all__'

class  SignUpSerializer(serializers.ModelSerializer):
    class Meta:
        model=SignUp
        fields = '__all__'

class UserAddressGetSerializer(serializers.ModelSerializer):
    id=SignUpSerializer(many=False)
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


class DeliveryRiderSerializer(serializers.ModelSerializer):
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




