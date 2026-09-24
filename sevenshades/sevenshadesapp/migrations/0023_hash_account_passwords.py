from django.db import migrations, models
from django.contrib.auth.hashers import identify_hasher, make_password


def hash_existing_passwords(apps, schema_editor):
    for name in ('SignUp', 'AdminLogin', 'DeliveryRider'):
        model = apps.get_model('sevenshadesapp', name)
        for account in model.objects.using(schema_editor.connection.alias).all().iterator():
            try:
                identify_hasher(account.password)
            except ValueError:
                account.password = make_password(account.password or None)
                account.save(using=schema_editor.connection.alias, update_fields=['password'])


class Migration(migrations.Migration):
    dependencies = [('sevenshadesapp', '0022_tryorder_assigned_rider_tryorder_final_bill_and_more')]
    operations = [
        migrations.AlterField(model_name=name, name='password', field=models.CharField(max_length=128, default=''))
        for name in ('signup', 'adminlogin', 'deliveryrider')
    ] + [migrations.RunPython(hash_existing_passwords, migrations.RunPython.noop)]
