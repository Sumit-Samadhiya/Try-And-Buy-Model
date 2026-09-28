from django.db import migrations
from django.db.models import F

def purge_test_order(apps, schema_editor):
    TryOrder = apps.get_model('sevenshadesapp', 'TryOrder')
    ProductDetails = apps.get_model('sevenshadesapp', 'ProductDetails')
    for order in TryOrder.objects.filter(order_id__icontains='B8A58EAE81CE4A5CB74B'):
        for item in order.tryorderitem_set.all():
            if item.stock_reserved and item.product_details_id:
                ProductDetails.objects.filter(pk=item.product_details_id).update(qty=F('qty') + item.qty)
        order.delete()

class Migration(migrations.Migration):
    dependencies = [
        ('sevenshadesapp', '0041_budgetdeal'),
    ]

    operations = [
        migrations.RunPython(purge_test_order, reverse_code=migrations.RunPython.noop),
    ]
