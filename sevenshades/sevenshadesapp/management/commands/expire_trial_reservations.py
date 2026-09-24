from django.core.management.base import BaseCommand
from sevenshadesapp.inventory_workflow import expire_pending_trials

class Command(BaseCommand):
    help = 'Release expired unpaid trial reservations only when no gateway attempt exists.'
    def handle(self, *args, **options):
        self.stdout.write(str(expire_pending_trials(limit=5000)) + ' trial reservations expired.')
