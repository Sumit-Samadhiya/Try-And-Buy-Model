from django.core.management.base import BaseCommand
from sevenshadesapp.models import DeliveryZone, ExcludedArea


class Command(BaseCommand):
    help = 'Seed real serviceable DeliveryZone configuration for Jhansi trial operations'

    def handle(self, *args, **options):
        # 1. Clear previous non-serviceable zones and excluded areas
        DeliveryZone.objects.all().delete()
        ExcludedArea.objects.all().delete()

        # 2. Jhansi Pincodes: 284001, 284002, 284003, 284128
        jhansi_zones = [
            ('Jhansi - Sadar & City Central', '284001'),
            ('Jhansi - Sipri Bazar & Civil Lines', '284002'),
            ('Jhansi - BKD & Medical College Hub', '284003'),
            ('Jhansi - Babina Cantt & Greater Hub', '284128'),
            ('General Delivery Zone', '284001,284002,284003,284128'),
        ]

        for name, postcodes in jhansi_zones:
            DeliveryZone.objects.create(zone_name=name, postcodes=postcodes)

        self.stdout.write(self.style.SUCCESS(
            'Previous pincodes removed. Serviceable Jhansi pincodes (284001, 284002, 284003, 284128) configured successfully.'
        ))


