from django.shortcuts import render
from django.http.response import JsonResponse
from rest_framework.parsers import JSONParser
from rest_framework import status
from django.shortcuts import render
from sevenshadesapp.models import MainCategory,MySubCategory,Brands,Product,Banner,ProductDetails
from sevenshadesapp.serializer import MainCategorySerializer,MySubCategorySerializer,MySubCategoryGetSerializer,BrandsSerializer,ProductGetSerializer,BannerSerializer,ProductDetailsGetSerializer
from rest_framework.decorators import api_view


@api_view(['GET','POST','DELETE'])
def User_MainCategory_List(request):
     try:
          if request.method=='GET':
            #    maincategory_list=MainCategory.get()
               maincategory_list=MainCategory.objects.all()
               maincategory_serializer_list=MainCategorySerializer(maincategory_list,many=True)
               return JsonResponse({"data":maincategory_serializer_list.data, "status":True})
          else:
               return JsonResponse({"data":[],"status":False},safe=False)
     except Exception as e :
          print('Error in Listing data',e)
          return JsonResponse({"data":[],"status":False},safe=False)
               
@api_view(['GET','POST','DELETE'])
def user_mysubcategory_list_by_maincategoryid(request):
     try:
          if request.method=='POST':
            #    maincategory_list=MainCategory.get()
               maincategoryid=request.data['maincategoryid']
               mysubcategory_list=MySubCategory.objects.all().filter(maincategoryid=maincategoryid)
               mysubcategory_serializer_list=MySubCategoryGetSerializer(mysubcategory_list,many=True)
            #    print(mysubcategory_serializer_list.data)
               print("hey")
               return JsonResponse({"data":mysubcategory_serializer_list.data, "status":True})
          else:
               return JsonResponse({"data":[],"status":False},safe=False)
     except Exception as e :
          print('Error in Listing data',e)
          return JsonResponse({"data":[],"status":False},safe=False)
     


@api_view(['GET','POST'])
def Brands_List(request):
     try:
          if request.method=='POST':
               sid=request.data.get('subcategoryid')
               mid=request.data.get('maincategoryid')
               if sid and mid:
                   product_list=Product.objects.all().filter(subcategoryid_id=sid, maincategoryid_id=mid)
                   product_serializer_list=ProductGetSerializer(product_list,many=True)
                   finalresult=fetchData('brandid',product_serializer_list.data)
                   return JsonResponse({"data":finalresult, "status":True})
               else:
                   brand_list=Brands.objects.all()
                   brand_serializer_list=BrandsSerializer(brand_list,many=True)
                   return JsonResponse({"data":brand_serializer_list.data, "status":True})
          elif request.method=='GET':
               brand_list=Brands.objects.all()
               brand_serializer_list=BrandsSerializer(brand_list,many=True)
               return JsonResponse({"data":brand_serializer_list.data, "status":True})
          else:
               return JsonResponse({"data":[],"status":False},safe=False)
     except Exception as e :
          print('Error in Listing data',e)
          return JsonResponse({"data":[],"status":False},safe=False)
     
def fetchData(field,data):
     data=list(data)
     result={}
     for row in data:
          mydata=dict(row)
          print(dict(mydata[field]))
          record=(dict(mydata[field]))
          result[record['id']]=record
     finalresult=list(result.values())
     return(finalresult)


   
@api_view(['GET','POST','DELETE'])
def Banner_List(request):
     try:
          if request.method=='GET':
               banner_list=Banner.objects.all()
               banner_serializer_list=BannerSerializer(banner_list,many=True)
               if not banner_serializer_list.data:
                    return JsonResponse({"data":[],"status":False,"message":"No banners found"},safe=False)
               return JsonResponse({"data":banner_serializer_list.data, "status":True})
          else:
               return JsonResponse({"data":[],"status":False},safe=False)
     except Exception as e :
          print('Error in Listing data',e)
          return JsonResponse({"data":[],"status":False},safe=False)
     

@api_view(['GET','POST','DELETE'])
def Subcategory_List(request):
     try:
          if request.method=='GET':
         
               mysubcategory_list=MySubCategory.objects.all()
               mysubcategory_serializer_list=MySubCategorySerializer(mysubcategory_list,many=True)
               return JsonResponse({"data":mysubcategory_serializer_list.data, "status":True})
          else:
               return JsonResponse({"data":[],"status":False},safe=False)
     except Exception as e :
          print('Error in Listing data',e)
          return JsonResponse({"data":[],"status":False},safe=False)
     
@api_view(['GET','POST','DELETE'])
def Category_List(request):
     try:
          if request.method=='GET':
         
               maincategory_list=MainCategory.objects.all()
               maincategory_serializer_list=MainCategorySerializer(maincategory_list,many=True)
               return JsonResponse({"data":maincategory_serializer_list.data, "status":True})
          else:
               return JsonResponse({"data":[],"status":False},safe=False)
     except Exception as e :
          print('Error in Listing data',e)
          return JsonResponse({"data":[],"status":False},safe=False)
     

@api_view(['GET','POST','DELETE'])
def MainCategory_List(request):
     try:
          if request.method=='GET':
         
               maincategory_list=MainCategory.objects.all()
               maincategory_serializer_list=MainCategorySerializer(maincategory_list,many=True)
               return JsonResponse({"data":maincategory_serializer_list.data, "status":True})
          else:
               return JsonResponse({"data":[],"status":False},safe=False)
     except Exception as e :
          print('Error in Listing data',e)
          return JsonResponse({"data":[],"status":False},safe=False)
     

def serialize_flipkart_color_listings(products_qs):
     from sevenshadesapp.serializer import MainCategorySerializer, MySubCategorySerializer, BrandsSerializer
     listings = []
     products = products_qs.select_related('maincategoryid', 'subcategoryid', 'brandid').prefetch_related('productdetails_set')
     for prod in products:
          variants = list(prod.productdetails_set.all())
          cat_data = MainCategorySerializer(prod.maincategoryid).data if prod.maincategoryid else None
          sub_data = MySubCategorySerializer(prod.subcategoryid).data if prod.subcategoryid else None
          brand_data = BrandsSerializer(prod.brandid).data if prod.brandid else None

          if not variants:
               listings.append({
                    'id': prod.id,
                    'listing_id': f"{prod.id}_default",
                    'productname': prod.productname,
                    'display_title': prod.productname,
                    'color': '',
                    'description': prod.description,
                    'icon': str(prod.icon),
                    'min_price': 0,
                    'min_offerprice': 0,
                    'available_sizes': [],
                    'all_sizes': [],
                    'is_available': False,
                    'variants_count': 0,
                    'avg_rating': 0.0,
                    'total_reviews': 0,
                    'maincategoryid': cat_data,
                    'subcategoryid': sub_data,
                    'brandid': brand_data,
               })
               continue

          colors_map = {}
          for var in variants:
               c = var.color.strip() if var.color else 'Default'
               if c not in colors_map:
                    colors_map[c] = []
               colors_map[c].append(var)

          for color_name, color_variants in colors_map.items():
               first_icon = ''
               for v in color_variants:
                    if v.icon:
                         first_icon = v.icon.split(',')[0].strip()
                         break
               if not first_icon:
                    first_icon = str(prod.icon)

               prices = [v.price for v in color_variants if v.price > 0]
               offerprices = [v.offerprice for v in color_variants if 0 < v.offerprice <= v.price]

               min_p = min(prices) if prices else 0
               min_op = min(offerprices) if offerprices else 0

               in_stock_sizes = [v.size for v in color_variants if v.qty > 0 and v.size]
               all_sizes = [{'size': v.size, 'in_stock': v.qty > 0} for v in color_variants if v.size]
               is_avail = any(v.qty > 0 for v in color_variants)

               reviewed = [v for v in color_variants if v.total_reviews > 0]
               avg_r = round(sum(v.avg_rating for v in reviewed) / len(reviewed), 1) if reviewed else 0.0
               tot_rev = sum(v.total_reviews for v in color_variants)

               display_title = f"{prod.productname} ({color_name})" if color_name and color_name != 'Default' else prod.productname

               listings.append({
                    'id': prod.id,
                    'listing_id': f"{prod.id}_{color_name}",
                    'productname': prod.productname,
                    'display_title': display_title,
                    'color': color_name if color_name != 'Default' else '',
                    'description': prod.description,
                    'icon': first_icon,
                    'min_price': min_p,
                    'min_offerprice': min_op,
                    'available_sizes': in_stock_sizes,
                    'all_sizes': all_sizes,
                    'is_available': is_avail,
                    'variants_count': len(color_variants),
                    'avg_rating': avg_r,
                    'total_reviews': tot_rev,
                    'maincategoryid': cat_data,
                    'subcategoryid': sub_data,
                    'brandid': brand_data,
               })

     return listings

@api_view(['GET','POST','DELETE'])
def User_Products_Maincategory(request):
     try:
          if request.method=='POST':
               maincategoryid=request.data['maincategoryid']
               product_list=Product.objects.filter(maincategoryid=maincategoryid)
               data = serialize_flipkart_color_listings(product_list)
               return JsonResponse({"data": data, "status": True})
          else:
               return JsonResponse({"data":[],"status":False},safe=False)
     except Exception as e :
          print('Error in Listing data',e)
          return JsonResponse({"data":[],"status":False},safe=False)

     

@api_view(['GET','POST','DELETE'])
def User_ProductsDetails_By_Id(request):
     try:
          if request.method=='POST':
            
               productid=request.data['productid']
               productdetails_list=ProductDetails.objects.all().filter(productid_id=productid)
               productdetails_serializer_list=ProductDetailsGetSerializer(productdetails_list,many=True)
               print(productdetails_serializer_list.data)
               
              
               return JsonResponse({"data":productdetails_serializer_list.data, "status":True})
          else:
               return JsonResponse({"data":[],"status":False},safe=False)
     except Exception as e :
          print('Error in Listing data',e)
          return JsonResponse({"data":[],"status":False},safe=False)


@api_view(['GET'])
def User_Product_List(request):
     try:
          product_list = Product.objects.all()
          data = serialize_flipkart_color_listings(product_list)
          return JsonResponse({"data": data, "status": True})
     except Exception as e:
          print('Error in User_Product_List:', e)
          return JsonResponse({"data": [], "status": False}, safe=False)