import logging
from django.http.response import JsonResponse
from rest_framework.decorators import api_view
from django.db import OperationalError, IntegrityError, DatabaseError
from sevenshadesapp.models import ReturnedItem, TamperProofTag, FinalOrderItem
from sevenshadesapp.serializer import ReturnedItemSerializer, TamperProofTagSerializer
from .models import TryOrderItem, TrialReturn, FinalOrderItem
from .inventory_workflow import InventoryError, collect_return, review_return, cancel_trial
from .security import failure

logger = logging.getLogger(__name__)

@api_view(['POST'])
def ScanTamperProofTag(request):
    try:
        tag_id = request.data.get('tag_id')
        tag = TamperProofTag.objects.filter(tag_id=tag_id).first()
        if not tag or not tag.is_valid:
            return JsonResponse({'status': False, 'message': 'Invalid tag'}, safe=False)
        
        return JsonResponse({'status': True, 'message': 'Tag valid', 'data': TamperProofTagSerializer(tag).data}, safe=False)
    except Exception as e:
        logger.exception('ScanTamperProofTag error: %s', e)
        return JsonResponse({'status': False, 'message': 'Unable to scan tag'}, safe=False)


def return_data(result):
    item = result.item
    return {'id': result.pk, 'item_id': item.pk, 'order_id': item.try_order.order_id,
        'product_name': item.product_name, 'size': item.size, 'color': item.color,
        'condition': result.condition, 'status': result.status, 'tag_intact': result.tag_intact,
        'tag_verified': result.tag_verified, 'scanned_tag': result.scanned_tag,
        'steam_pressed_at': result.steam_pressed_at.isoformat() if result.steam_pressed_at else None}


def item_data(item):
    selected = FinalOrderItem.objects.filter(try_order_item=item).exists()
    result = TrialReturn.objects.filter(item=item).first()
    return {'id': item.pk, 'order_id': item.try_order.order_id, 'product_name': item.product_name,
        'size': item.size, 'color': item.color, 'security_tag': item.security_tag,
        'selected': selected, 'stock_reserved': item.stock_reserved,
        'return_status': result.status if result else None}


def mutation(callback):
    try:
        return JsonResponse({'status': True, 'data': callback()})
    except InventoryError as error:
        return failure(str(error), 409)
    except OperationalError:
        logger.exception('OperationalError in inventory mutation')
        return failure('Inventory is busy. Refresh and retry.', 503)
    except IntegrityError:
        logger.exception('IntegrityError in inventory mutation')
        return failure('This inventory operation could not be completed. Refresh and retry.', 409)
    except Exception as error:
        logger.exception('Unexpected error in inventory mutation: %s', error)
        return failure('An unexpected error occurred while processing inventory.', 500)


@api_view(['POST'])
def ProcessReturn(request):
    if request.data.get('final_order_item_id') is not None:
        return failure('Finalized purchases are non-refundable. Items can be declined during the home trial.', 409)
    return mutation(lambda: return_data(collect_return(
        request.account_role, request.account,
        request.data.get('try_order_item_id'), request.data.get('condition'),
        request.data.get('tag_intact'), request.data.get('scanned_tag')
    )))



@api_view(['POST'])
def UpdateHygieneStatus(request):
    return mutation(lambda: return_data(review_return(request.account, request.data.get('return_id'), request.data.get('action'))))


@api_view(['POST'])
def CancelTrial(request):
    return mutation(lambda: {'order_id': cancel_trial(request.account_role, request.account, request.data.get('order_id')).order_id})


@api_view(['GET'])
def InventoryReturns(request):
    returns = TrialReturn.objects.select_related('item__try_order').order_by('-created_at')
    items = TryOrderItem.objects.select_related('try_order').filter(stock_reserved=True, trial_return__isnull=True)
    return JsonResponse({'status': True, 'data': {'returns': [return_data(row) for row in returns], 'items': [item_data(item) for item in items]}})


@api_view(['POST'])
def TrialReturnItems(request):
    items = TryOrderItem.objects.select_related('try_order').filter(try_order__order_id=request.data.get('order_id'))
    return JsonResponse({'status': True, 'data': [item_data(item) for item in items]})
