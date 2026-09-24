from django.core.management.base import BaseCommand
from sevenshadesapp.models import DeliveryZone, ExcludedArea


class Command(BaseCommand):
    help = 'Seed real pilot DeliveryZone and ExcludedArea configuration for Indore & Bhopal trial operations'

    def handle(self, *args, **options):
        # 1. Primary Pilot Area: Indore Urban Hub
        indore_postcodes = '452001,452002,452003,452005,452009,452010,452011,452016,452018'
        zone1, c1 = DeliveryZone.objects.update_or_create(
            zone_name='Indore - Central & Vijay Nagar Pilot',
            defaults={'postcodes': indore_postcodes}
        )

        # 2. Secondary Pilot Area: Bhopal Urban Hub
        bhopal_postcodes = '462001,462011,462016,462023,462026,462030'
        zone2, c2 = DeliveryZone.objects.update_or_create(
            zone_name='Bhopal - MP Nagar & Arera Pilot',
            defaults={'postcodes': bhopal_postcodes}
        )

        # 3. National Test & Metro Hub (Preserves test compatibility for 110001)
        metro_postcodes = '110001,110002,110003,400001,560001'
        zone3, c3 = DeliveryZone.objects.update_or_create(
            zone_name='National Metro Pilot Hub',
            defaults={'postcodes': metro_postcodes}
        )

        # Also maintain/update the General Delivery Zone with pilot postcodes included
        combined = f"{indore_postcodes},{bhopal_postcodes},{metro_postcodes}"
        DeliveryZone.objects.update_or_create(
            zone_name='General Delivery Zone',
            defaults={'postcodes': combined}
        )

        # 4. Excluded Restricted / Non-Serviceable Pilot Sectors
        excluded_specs = [
            ('Mhow Army Cantonment Sector', '453441'),
            ('Bhopal BHEL Heavy Industrial Prohibited Zone', '462022'),
            ('Indore Super Corridor High-Security Zone', '452020'),
        ]

        for name, pcode in excluded_specs:
            ExcludedArea.objects.update_or_create(
                area_name=name,
                defaults={'postcode': pcode}
            )

        self.stdout.write(self.style.SUCCESS(
            'Pilot delivery zones (Indore, Bhopal, Metro) and excluded areas seeded successfully.'
        ))

