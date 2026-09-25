import logging
from django.http.response import JsonResponse
from rest_framework.decorators import api_view
from django.db import models
from sevenshadesapp.models import TryOrder, FinalOrder

logger = logging.getLogger(__name__)

@api_view(['GET'])
def GetOrderAnalytics(request):
    try:
        total_orders = TryOrder.objects.count()
        completed_orders = TryOrder.objects.filter(status__in=['DELIVERED', 'NO_PURCHASE']).count()
        final_collections = FinalOrder.objects.filter(payment_status='paid').aggregate(models.Sum('final_payable'))['final_payable__sum'] or 0
        trial_collections = TryOrder.objects.filter(trial_fee_paid=True).aggregate(models.Sum('try_fee'))['try_fee__sum'] or 0
        total_revenue = final_collections + trial_collections
        
        return JsonResponse({
            'status': True,
            'data': {
                'total_orders': total_orders,
                'completed_orders': completed_orders,
                'total_revenue': total_revenue
            }
        }, safe=False)
    except Exception as e:
        logger.exception('GetOrderAnalytics error: %s', e)
        return JsonResponse({'status': False, 'message': 'Unable to fetch analytics'}, safe=False)
