from django.http.response import JsonResponse
from rest_framework.decorators import api_view
from django.db import models
from sevenshadesapp.models import TryOrder, FinalOrder, DeliveryAssignment

@api_view(['GET'])
def GetOrderAnalytics(request):
    try:
        total_orders = TryOrder.objects.count()
        completed_orders = FinalOrder.objects.filter(status='completed').count()
        total_revenue = FinalOrder.objects.filter(status='completed').aggregate(models.Sum('final_payable'))['final_payable__sum'] or 0
        
        return JsonResponse({
            'status': True,
            'data': {
                'total_orders': total_orders,
                'completed_orders': completed_orders,
                'total_revenue': total_revenue
            }
        }, safe=False)
    except Exception as e:
        print('GetOrderAnalytics error:', e)
        return JsonResponse({'status': False, 'message': 'Unable to fetch analytics'}, safe=False)
