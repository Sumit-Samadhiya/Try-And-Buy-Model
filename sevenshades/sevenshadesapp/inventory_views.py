from django.http.response import JsonResponse
from rest_framework.decorators import api_view
from sevenshadesapp.models import ReturnedItem, TamperProofTag, FinalOrderItem
from sevenshadesapp.serializer import ReturnedItemSerializer, TamperProofTagSerializer

@api_view(['POST'])
def ScanTamperProofTag(request):
    try:
        tag_id = request.data.get('tag_id')
        tag = TamperProofTag.objects.filter(tag_id=tag_id).first()
        if not tag:
            return JsonResponse({'status': False, 'message': 'Invalid tag'}, safe=False)
        
        return JsonResponse({'status': True, 'message': 'Tag valid', 'data': TamperProofTagSerializer(tag).data}, safe=False)
    except Exception as e:
        print('ScanTamperProofTag error:', e)
        return JsonResponse({'status': False, 'message': 'Unable to scan tag'}, safe=False)

@api_view(['POST'])
def UpdateHygieneStatus(request):
    try:
        returned_item_id = request.data.get('returned_item_id')
        status = request.data.get('status')
        returned_item = ReturnedItem.objects.filter(id=returned_item_id).first()
        if not returned_item:
            return JsonResponse({'status': False, 'message': 'Returned item not found'}, safe=False)
        
        returned_item.hygiene_status = status
        returned_item.save()
        return JsonResponse({'status': True, 'message': 'Hygiene status updated', 'data': ReturnedItemSerializer(returned_item).data}, safe=False)
    except Exception as e:
        print('UpdateHygieneStatus error:', e)
        return JsonResponse({'status': False, 'message': 'Unable to update hygiene status'}, safe=False)

@api_view(['POST'])
def ProcessReturn(request):
    try:
        final_order_item_id = request.data.get('final_order_item_id')
        condition = request.data.get('condition')
        
        final_order_item = FinalOrderItem.objects.filter(id=final_order_item_id).first()
        if not final_order_item:
            return JsonResponse({'status': False, 'message': 'Item not found'}, safe=False)
        
        returned_item = ReturnedItem.objects.create(
            final_order_item=final_order_item,
            condition=condition,
            hygiene_status='Pending'
        )
        
        return JsonResponse({'status': True, 'message': 'Return processed', 'data': ReturnedItemSerializer(returned_item).data}, safe=False)
    except Exception as e:
        print('ProcessReturn error:', e)
        return JsonResponse({'status': False, 'message': 'Unable to process return'}, safe=False)
