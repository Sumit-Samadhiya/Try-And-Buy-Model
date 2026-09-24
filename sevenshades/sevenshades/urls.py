from sevenshadesapp import payment_recovery_views
from sevenshadesapp import admin_workspace_views
from sevenshadesapp import otp_views
from sevenshadesapp import location_views
from sevenshadesapp import settlement_views
"""
URL configuration for sevenshades project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from sevenshadesapp import maincategory_views,mysubcategory_views,brands_views,product_views,productdetails_views,admin_login_view,userinterface,banner_views,signup_views,order_views,delivery_ops_views,inventory_views,admin_analytics_views

from django.urls import include,re_path
from sevenshadesapp import auth_views
from sevenshadesapp.security import protect_api


urlpatterns = [
    path('api/admin_payment_recovery', payment_recovery_views.RecoveryQueue),
    path('api/admin_expire_reservations', payment_recovery_views.ExpireReservations),
    path('api/admin_recover_payment', payment_recovery_views.RecoverPayment),
    path('api/admin_check_payment', payment_recovery_views.CheckPayment),
    path('api/admin_quick_dashboard', admin_workspace_views.QuickDashboard),
    path('api/admin_sales_report', admin_workspace_views.SalesReport),
    path('api/admin_tickets', admin_workspace_views.AdminTickets),
    path('api/admin_ticket_update', admin_workspace_views.UpdateTicket),
    path('api/customer_tickets', admin_workspace_views.CustomerTickets),
    path('api/create_ticket', admin_workspace_views.CreateTicket),
    path('api/otp_config', otp_views.OtpConfig),
    path('api/otp_request', otp_views.RequestOtp),
    path('api/otp_login', otp_views.OtpLogin),
    path('api/reset_password', otp_views.ResetPassword),
    path('api/address_location', location_views.AddressLocation),
    path('api/rider_location', location_views.RiderLocation),
    path('api/rider_suggestions', location_views.RiderSuggestions),
    path('payments/razorpay/webhook', settlement_views.RazorpayWebhook),
    path('api/settlement_detail', settlement_views.SettlementDetail),
    path('api/customer_approve_bill', settlement_views.CustomerApproveBill),
    path('api/payment_capabilities', settlement_views.PaymentCapabilities),
    path('api/payment_create', settlement_views.PaymentCreate),
    path('api/payment_reconcile', settlement_views.PaymentReconcile),
    path('api/payment_verify', settlement_views.PaymentVerify),
    path('api/receipt_download', settlement_views.ReceiptDownload),
    path('admin/', admin.site.urls),
    path('api/auth_csrf', auth_views.CsrfToken),
    path('api/auth_session', auth_views.CurrentSession),
    path('api/auth_logout', auth_views.Logout),
    path('api/maincategory_submit', maincategory_views.MainCategory_Submit),
    path('api/maincategory_list', maincategory_views.MainCategory_List),
    path('api/editmaincategory_icon', maincategory_views.EditCategory_Icon),
    path('api/editmaincategory_data', maincategory_views.EditCategory_Data),
    path('api/deletemaincategorydata', maincategory_views.DeleteCategory_Data),
    path('api/mysubcategory_submit', mysubcategory_views.MySubCategory_Submit),
    path('api/mysubcategory_list', mysubcategory_views.MySubCategory_List),
    path('api/editmysubcategory_icon', mysubcategory_views.EditMySubCategory_Icon),
    path('api/editmysubcategory_data', mysubcategory_views.EditMySubCategory_Data),
    path('api/deletemysubcategorydata', mysubcategory_views.DeleteMySubCategory_Data),
    path('api/brand_submit', brands_views.Brands_Submit),
    path('api/brand_list', brands_views.Brands_List),
    path('api/editbrand_icon', brands_views.EditBrands_Icon),
    path('api/editbrand_data', brands_views.EditBrands_Data),
    path('api/deletebranddata', brands_views.DeleteBrands_Data),
    path('api/product_submit', product_views.Product_Submit),
    path('api/product_list', product_views.Product_List),
    path('api/editproduct_icon', product_views.EditProduct_Icon),
    path('api/editproduct_data', product_views.EditProduct_Data),
    path('api/deleteproductdata', product_views.DeleteProduct_Data),
    path('api/product_mysubcategory_list_by_maincategoryid', product_views.mysubcategory_list_by_maincategoryid),
    path('api/productdetails_submit', productdetails_views.ProductDetails_Submit),
    path('api/productdetails_list', productdetails_views.ProductDetails_List),
    path('api/editproductdetails_icon', productdetails_views.EditProductDetails_Icon),
    path('api/editproductdetails_data', productdetails_views.EditProductDetails_Data),
    path('api/deleteproductdetails', productdetails_views.DeleteProductDetails_Data),
    path('api/productdetail_product_list_by_subcategoryid', productdetails_views.Productdetail_product_list_by_subcategoryid),
    path('api/productdetail_brand_list_by_productid', productdetails_views.Productdetail_brand_list_by_productid),
    path('api/check_admin_login', admin_login_view.CheckAdminLogin),
    path('api/user_main_category_list', userinterface.User_MainCategory_List),
    path('api/user_mysubcategory_list_by_maincategoryid', userinterface.user_mysubcategory_list_by_maincategoryid),
    path('api/user_brand_list', userinterface.Brands_List),
    path('api/user_banner_list', userinterface.Banner_List),
    path('api/user_subcategory_list', userinterface.Subcategory_List),
    path('api/user_category_list', userinterface.Category_List),
    path('api/user_maincategory_list', userinterface.MainCategory_List),
    path('api/user_products_maincategory', userinterface.User_Products_Maincategory),
    path('api/user_productsdetails_by_id', userinterface.User_ProductsDetails_By_Id),
    path('api/submit_product_review', order_views.SubmitProductReview),
    path('api/fetch_product_reviews', order_views.FetchProductReviews),
    path('api/banner_submit', banner_views.Banner_Submit),
    path('api/signup_submit', otp_views.OtpSignup),
    path('api/check_costumer_login', signup_views.CheckCostumerLogin),
    path('api/fetch_user_address', signup_views.FetchUserAddress),
    path('api/address_submit', signup_views.Address_Submit),
    path('api/address_update', signup_views.Address_Update),
    path('api/address_delete', signup_views.Address_Delete),
    path('api/try_order_create', order_views.TryOrderCreate),
    path('api/delivery_selection_update', order_views.DeliverySelectionUpdate),
    path('api/submit_final_selection', order_views.SubmitFinalSelection),
    path('api/final_payment_update', order_views.FinalPaymentUpdate),
    path('api/user_order_lifecycle_list', order_views.UserOrderLifecycleList),
    path('api/admin_order_lifecycle_list', order_views.AdminOrderLifecycleList),
    path('api/delivery_rider_create', delivery_ops_views.DeliveryRiderCreate),
    path('api/delivery_rider_list', delivery_ops_views.DeliveryRiderList),
    path('api/delivery_rider_login', delivery_ops_views.DeliveryRiderLogin),
    path('api/delivery_assign_order', delivery_ops_views.DeliveryAssignOrder),
    path('api/delivery_assignments_list', delivery_ops_views.DeliveryAssignmentsList),
    path('api/delivery_assignment_update_status', delivery_ops_views.DeliveryAssignmentUpdateStatus),
    path('api/delivery_rider_tasks', delivery_ops_views.DeliveryRiderTasks),
    path('api/delivery_batch_list', delivery_ops_views.DeliveryBatchList),
    path('api/generate_delivery_batch', delivery_ops_views.GenerateDeliveryBatch),
    path('api/optimize_route', delivery_ops_views.OptimizeRoute),
    path('api/scan_tamper_proof_tag', inventory_views.ScanTamperProofTag),
    path('api/update_hygiene_status', inventory_views.UpdateHygieneStatus),
    path('api/process_return', inventory_views.ProcessReturn),
    path('api/cancel_trial', inventory_views.CancelTrial),
    path('api/inventory_returns', inventory_views.InventoryReturns),
    path('api/trial_return_items', inventory_views.TrialReturnItems),
    path('api/get_order_analytics', admin_analytics_views.GetOrderAnalytics),
]

# Unclassified API routes are admin-only by default.
for route in urlpatterns:
    pattern = str(route.pattern)
    if pattern.startswith('api/'):
        endpoint = pattern.removeprefix('api/')
        route.callback = protect_api(route.callback, endpoint, route.callback.__module__ == userinterface.__name__)
