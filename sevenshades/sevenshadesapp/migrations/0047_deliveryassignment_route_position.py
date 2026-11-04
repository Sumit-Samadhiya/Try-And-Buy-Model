from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [('sevenshadesapp', '0046_whatsappotp')]
    operations = [migrations.AddField(model_name='deliveryassignment', name='route_position', field=models.PositiveSmallIntegerField(null=True, blank=True))]
