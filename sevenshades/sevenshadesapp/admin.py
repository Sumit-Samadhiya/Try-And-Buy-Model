from django.contrib import admin
from sevenshadesapp.models import (
    WalletAccount, TryOrder, TryOrderItem, FinalOrder, FinalOrderItem,
    DeliveryRider, DeliveryAssignment, DeliveryBatch, DeliveryZone,
    ExcludedArea, SupportTicket, Product, ProductDetails, MainCategory,
    MySubCategory, Brands, Banner, ProductReview
)


@admin.register(TryOrder)
class TryOrderAdmin(admin.ModelAdmin):
    list_display = ('order_id', 'mobileno', 'status', 'try_payment_status', 'delivery_mode', 'scheduled_date', 'delivery_slot', 'created_at')
    list_filter = ('status', 'try_payment_status', 'delivery_mode', 'scheduled_date')
    search_fields = ('order_id', 'mobileno', 'postcode')
    readonly_fields = (
        'order_id', 'mobileno', 'address_text', 'city', 'country', 'postcode',
        'address_type', 'delivery_mode', 'delivery_slot', 'scheduled_date',
        'total_try_items', 'reference_value', 'try_fee', 'is_first_order',
        'try_payment_mode', 'try_payment_status', 'trial_fee_paid', 'trial_type',
        'payment_status', 'assigned_rider', 'status', 'created_at', 'updated_at'
    )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser


@admin.register(TryOrderItem)
class TryOrderItemAdmin(admin.ModelAdmin):
    list_display = ('id', 'try_order', 'product_name', 'size', 'color', 'qty', 'unit_price', 'status')
    list_filter = ('status',)
    search_fields = ('product_name', 'try_order__order_id')
    readonly_fields = (
        'try_order', 'product_details', 'product_name', 'brand_name',
        'color', 'size', 'qty', 'unit_price', 'line_total', 'status', 'stock_reserved'
    )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(FinalOrder)
class FinalOrderAdmin(admin.ModelAdmin):
    list_display = ('order_id', 'try_order', 'status', 'final_payable', 'payment_status', 'payment_mode', 'created_at')
    list_filter = ('status', 'payment_status', 'payment_mode')
    search_fields = ('order_id', 'try_order__order_id')
    readonly_fields = (
        'order_id', 'try_order', 'selected_items_count', 'items_total',
        'wallet_credit', 'final_payable', 'payment_mode', 'payment_status',
        'status', 'paid_at', 'cash_collected_by', 'bill_revision',
        'approved_revision', 'approved_by', 'approved_at', 'created_at', 'updated_at'
    )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser


@admin.register(FinalOrderItem)
class FinalOrderItemAdmin(admin.ModelAdmin):
    list_display = ('id', 'final_order', 'product_name', 'size', 'qty', 'unit_price', 'line_total')
    search_fields = ('product_name', 'final_order__order_id')
    readonly_fields = (
        'final_order', 'try_order_item', 'product_name', 'brand_name',
        'color', 'size', 'qty', 'unit_price', 'line_total'
    )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(DeliveryAssignment)
class DeliveryAssignmentAdmin(admin.ModelAdmin):
    list_display = ('assignment_id', 'try_order', 'rider', 'status', 'assigned_at')
    list_filter = ('status',)
    search_fields = ('assignment_id', 'try_order__order_id', 'rider__name')
    readonly_fields = (
        'assignment_id', 'try_order', 'rider', 'status',
        'assigned_at', 'trial_start_time', 'trial_end_time', 'batch'
    )

    def has_add_permission(self, request):
        return False


@admin.register(DeliveryRider)
class DeliveryRiderAdmin(admin.ModelAdmin):
    list_display = ('rider_id', 'name', 'phone', 'bike_number', 'zone', 'status')
    list_filter = ('status', 'zone')
    search_fields = ('rider_id', 'name', 'phone')
    readonly_fields = ('rider_id',)


@admin.register(DeliveryBatch)
class DeliveryBatchAdmin(admin.ModelAdmin):
    list_display = ('batch_id', 'rider', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('batch_id', 'rider__name')
    readonly_fields = ('batch_id', 'created_at')


@admin.register(DeliveryZone)
class DeliveryZoneAdmin(admin.ModelAdmin):
    list_display = ('id', 'zone_name', 'postcodes')
    search_fields = ('zone_name', 'postcodes')


@admin.register(ExcludedArea)
class ExcludedAreaAdmin(admin.ModelAdmin):
    list_display = ('id', 'area_name', 'postcode')
    search_fields = ('area_name', 'postcode')


@admin.register(SupportTicket)
class SupportTicketAdmin(admin.ModelAdmin):
    list_display = ('id', 'customer', 'rider', 'subject', 'status', 'priority', 'created_at')
    list_filter = ('status', 'priority')
    search_fields = ('subject', 'message', 'customer__mobileno', 'rider__phone')
    readonly_fields = ('created_at', 'updated_at', 'customer', 'rider')


admin.site.register(WalletAccount)
admin.site.register(Product)
admin.site.register(ProductDetails)
admin.site.register(MainCategory)
admin.site.register(MySubCategory)
admin.site.register(Brands)
admin.site.register(Banner)
admin.site.register(ProductReview)
