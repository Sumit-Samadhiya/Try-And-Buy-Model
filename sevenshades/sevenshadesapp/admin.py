from django.contrib import admin
from sevenshadesapp.models import WalletAccount, TryOrder, TryOrderItem, FinalOrder, FinalOrderItem, DeliveryRider, DeliveryAssignment

# Register your models here.
admin.site.register(WalletAccount)
admin.site.register(TryOrder)
admin.site.register(TryOrderItem)
admin.site.register(FinalOrder)
admin.site.register(FinalOrderItem)
admin.site.register(DeliveryRider)
admin.site.register(DeliveryAssignment)
