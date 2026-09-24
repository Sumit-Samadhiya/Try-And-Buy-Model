from django.core.management.base import BaseCommand
from sevenshadesapp.models import DeliveryZone


class Command(BaseCommand):
    help = 'Seed initial DeliveryZone data so checkout works'

    def handle(self, *args, **options):
        # A broad catchall zone with common Indian 6-digit pin codes.
        # In production, replace these with actual serviceable postcodes.
        sample_postcodes = (
            '110001,110002,110003,110004,110005,'   # Delhi
            '400001,400002,400003,400004,400005,'   # Mumbai
            '500001,500002,500003,500004,500005,'   # Hyderabad
            '600001,600002,600003,600004,600005,'   # Chennai
            '700001,700002,700003,700004,700005,'   # Kolkata
            '560001,560002,560003,560004,560005,'   # Bengaluru
            '411001,411002,411003,411004,411005,'   # Pune
            '302001,302002,302003,302004,302005,'   # Jaipur
            '380001,380002,380003,380004,380005,'   # Ahmedabad
            '226001,226002,226003,226004,226005'    # Lucknow
        )

        zone, created = DeliveryZone.objects.get_or_create(
            zone_name='General Delivery Zone',
            defaults={'postcodes': sample_postcodes}
        )

        if created:
            self.stdout.write(self.style.SUCCESS('DeliveryZone "General Delivery Zone" created successfully.'))
        else:
            self.stdout.write(self.style.WARNING('DeliveryZone "General Delivery Zone" already exists — skipping.'))
