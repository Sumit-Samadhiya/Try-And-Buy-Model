from django.http import JsonResponse
from django.db.models import Q
from rest_framework.decorators import api_view
from .models import GatewayPayment, TryOrder
from .security import failure
from .inventory_workflow import expire_pending_trials, cancellation_blocker
from .payments import recover_payment, reconcile_attempt
from .settlement_views import mutation

@api_view(['GET'])
def RecoveryQueue(request):
    try:
        page=int(request.GET.get('page',1))
        if page<1: raise ValueError()
    except (ValueError,TypeError): return failure('Invalid page.',400)
    search=request.GET.get('q','').strip()
    rows=TryOrder.objects.filter(Q(status='AWAITING_TRIAL_PAYMENT')|Q(gatewaypayment__state__in=['CREATING','REVIEW','READY'])).distinct()
    if search: rows=rows.filter(Q(order_id__icontains=search)|Q(mobileno__icontains=search))
    total=rows.count()
    data=[]
    for order in rows.order_by('created_at')[((page-1)*20):(page*20)]:
        data.append({'order_id':order.order_id,'mobile':order.mobileno,'status':order.status,
            'expires_at':order.reservation_expires_at,'can_cancel':not cancellation_blocker(order),
            'cancellation_blocker':cancellation_blocker(order),'try_fee':order.try_fee,
            'attempts':list(GatewayPayment.objects.filter(try_order=order).exclude(state='CAPTURED').values('id','purpose','state','amount_paise','receipt_reference','gateway_order_id','created_at','recovered_by','recovered_at'))})
    return JsonResponse({'status':True,'data':data,'total':total})

@api_view(['POST'])
def ExpireReservations(request):
    return mutation(lambda:{'expired':expire_pending_trials()})

@api_view(['POST'])
def RecoverPayment(request):
    return mutation(lambda:recover_payment(request.account,request.data.get('attempt_id'),request.data.get('gateway_order_id')))

@api_view(['POST'])
def CheckPayment(request):
    if type(request.data.get('attempt_id')) is not int: return failure('Select a payment.',400)
    attempt=GatewayPayment.objects.select_related('try_order').filter(pk=request.data['attempt_id']).first()
    if not attempt: return failure('Payment not found.',404)
    return mutation(lambda:reconcile_attempt(attempt))
