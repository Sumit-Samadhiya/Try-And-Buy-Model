from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('sevenshadesapp', '0038_productreview_unique_customer_product_review_and_more')]
    operations = [migrations.AlterField(model_name='signup', name='emailid',
        field=models.CharField(max_length=70, blank=True, null=True, default=None, unique=True))]
