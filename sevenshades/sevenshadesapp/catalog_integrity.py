"""Delete only unused catalog parents; preserve order-linked inventory."""
from django.db import transaction, OperationalError, IntegrityError
from django.db.models.deletion import ProtectedError
from django.http import JsonResponse
from .security import failure


def delete_unused(model, identifier, label):
    if type(identifier) not in (int, str) or not str(identifier).isdigit() or not 0 < int(identifier) <= 2147483647:
        return failure('Choose a valid catalog record.', 400)
    try:
        with transaction.atomic():
            record = model.objects.select_for_update().filter(pk=identifier).first()
            if record is None:
                return failure(label + ' not found.', 404)
            record.delete()
        return JsonResponse({'status': True, 'message': label + ' deleted.'})
    except ProtectedError:
        return failure(label + ' is used by other catalog records. Remove unused child records first. Order-linked variants must be kept.', 409)
    except (OperationalError, IntegrityError):
        return failure('The catalog changed or is busy. Refresh and try again.', 409)
