from datetime import date, datetime, time, timedelta
from functools import wraps
from django.db import transaction
from django.db.models import Q, F, Sum
from django.http import JsonResponse
from django.utils import timezone
from rest_framework.decorators import api_view
from .models import TryOrder, FinalOrder, SignUp, DeliveryRider, ProductDetails, SupportTicket, DeliveryZone, ExcludedArea

from .security import failure

STATUSES = {value for value, label in TryOrder._meta.get_field('status').choices}
TICKET_STATUSES = ('Open','In Progress','Resolved','Closed')
PRIORITIES = ('Low','Normal','High','Urgent')

def query_errors(view):
    @wraps(view)
    def run(request):
        try: return view(request)
        except (ValueError, TypeError, OverflowError): return failure('Check filter dates, page and selected values.',400)
    return run

def filters(request, rows, date_field='created_at'):
    start, end = request.GET.get('from',''), request.GET.get('to','')
    start = date.fromisoformat(start) if start else None
    end = date.fromisoformat(end) if end else None
    if start and end and start > end: raise ValueError('dates')
    if start: rows = rows.filter(**{date_field+'__gte':timezone.make_aware(datetime.combine(start,time.min))})
    if end: rows = rows.filter(**{date_field+'__lt':timezone.make_aware(datetime.combine(end+timedelta(days=1),time.min))})
    return rows

def page(request, rows):
    number = int(request.GET.get('page','1'))
    size = int(request.GET.get('page_size','20'))
    if number < 1 or size not in (10,20,50): raise ValueError('page')
    return list(rows[(number-1)*size:number*size]), number, size

def customer_data(customer, mobile=''):
    return {'name': (customer.fname+' '+customer.lname).strip() if customer else 'Customer',
        'mobile': str(customer.pk) if customer else mobile, 'email':customer.emailid if customer else ''}

@api_view(['GET'])
@query_errors
def SalesReport(request):
    orders = filters(request,TryOrder.objects.all())
    status, mode, payment = (request.GET.get(key,'') for key in ('status','mode','payment'))
    if status and status not in STATUSES: raise ValueError('status')
    if mode and mode not in ('cash','razorpay','free','no_charge'): raise ValueError('mode')
    if payment and payment not in ('paid','pending'): raise ValueError('payment')
    if status: orders = orders.filter(status=status)
    query = request.GET.get('q','').strip()
    if len(query)>120: raise ValueError('search')
    if query:
        mobiles = SignUp.objects.filter(Q(fname__icontains=query)|Q(lname__icontains=query)|Q(emailid__icontains=query)).values('mobileno')
        orders = orders.filter(Q(order_id__icontains=query)|Q(mobileno__icontains=query)|Q(city__icontains=query)|Q(mobileno__in=mobiles))
    finals = {row.try_order_id:row for row in FinalOrder.objects.filter(try_order__in=orders)}
    customers = {str(row.pk):row for row in SignUp.objects.filter(pk__in=orders.values('mobileno'))}
    rows=[]
    for order in orders.order_by('-created_at','-pk'):
        final=finals.get(order.pk)
        state=final.payment_status if final else 'pending'
        method=(final.payment_mode if final and final.payment_mode else order.try_payment_mode)
        if mode and method != mode: continue
        if payment and state != payment: continue
        trial=order.try_fee if order.trial_fee_paid else 0
        collected=final.final_payable if final and state=='paid' else 0
        rows.append({'order_id':order.order_id,'created_at':order.created_at.isoformat(),'customer':customer_data(customers.get(order.mobileno),order.mobileno),
            'city':order.city,'status':order.status,'payment_status':state,'payment_mode':method,'items_total':final.items_total if final else 0,
            'trial_collected':trial,'fee_adjusted':final.wallet_credit if final else 0,'final_collected':collected,'collected':trial+collected,
            'balance': final.final_payable if final and state!='paid' else 0,'selected_count':final.selected_items_count if final else 0})
    counts={}
    for row in rows: counts[row['status']]=counts.get(row['status'],0)+1
    summary={'orders':len(rows),'completed':sum(row['status'] in ('DELIVERED','NO_PURCHASE') for row in rows),
        'collected':sum(row['collected'] for row in rows),'trial_collected':sum(row['trial_collected'] for row in rows),
        'final_collected':sum(row['final_collected'] for row in rows),'outstanding':sum(row['balance'] for row in rows),'statuses':counts}
    selected, number, size=page(request,rows)
    return JsonResponse({'status':True,'data':selected,'total':len(rows),'page':number,'page_size':size,'summary':summary})

@api_view(['GET'])
@query_errors
def QuickDashboard(request):
    orders=filters(request,TryOrder.objects.all())
    counts={}
    for state in orders.values_list('status',flat=True): counts[state]=counts.get(state,0)+1
    final_collected = FinalOrder.objects.filter(try_order__in=orders, payment_status='paid').aggregate(total=Sum('final_payable'))['total'] or 0
    trial_collected = orders.filter(trial_fee_paid=True).aggregate(total=Sum('try_fee'))['total'] or 0
    collected = final_collected + trial_collected
    return JsonResponse({'status':True,'data':{'orders':orders.count(),'collected':collected,'completed':orders.filter(status__in=['DELIVERED','NO_PURCHASE']).count(),
      'unassigned':orders.filter(status='TRY_REQUESTED').count(),'awaiting_approval':orders.filter(status='AWAITING_SELECTION_APPROVAL').count(),
      'active_riders':DeliveryRider.objects.filter(status='Active').count(),'low_stock':ProductDetails.objects.filter(qty__lte=3).count(),
      'open_tickets':SupportTicket.objects.filter(status__in=['Open','In Progress']).count(),'statuses':counts,
      'recent':list(orders.order_by('-created_at','-pk').values('order_id','mobileno','status','created_at')[:6])}})

def ticket_data(ticket):
    customer = customer_data(ticket.customer) if ticket.customer else None
    rider = {
        'rider_id': ticket.rider.rider_id,
        'name': ticket.rider.name,
        'phone': ticket.rider.phone,
        'bike_number': ticket.rider.bike_number,
        'zone': ticket.rider.zone,
    } if ticket.rider else None
    return {'id': ticket.pk, 'reference': f'TKT-{ticket.pk:06d}', 'customer': customer, 'rider': rider,
        'source': 'Rider' if rider else 'Customer', 'subject': ticket.subject,
        'message': ticket.message, 'status': ticket.status, 'priority': ticket.priority, 'response': ticket.response, 'version': ticket.version,
        'created_at': ticket.created_at.isoformat(), 'updated_at': ticket.updated_at.isoformat()}

@api_view(['POST'])
def CreateTicket(request):
    subject,message=request.data.get('subject'),request.data.get('message')
    if not isinstance(subject,str) or not 3<=len(subject.strip())<=120 or not isinstance(message,str) or not 10<=len(message.strip())<=2000:
        return failure('Subject must be 3–120 characters and message 10–2000 characters.',400)
    if SupportTicket.objects.filter(customer=request.account,created_at__gte=timezone.now()-timedelta(minutes=1)).count()>=3:
        return failure('Please wait before raising another ticket.',429)
    ticket=SupportTicket.objects.create(customer=request.account,subject=subject.strip(),message=message.strip())
    return JsonResponse({'status':True,'data':ticket_data(ticket)},status=201)

@api_view(['GET'])
def CustomerTickets(request):
    limit = min(int(request.GET.get('limit', 50)), 200)
    tickets = SupportTicket.objects.filter(customer=request.account).select_related('customer').order_by('-created_at')[:limit]
    return JsonResponse({'status':True,'data':[ticket_data(row) for row in tickets]})

@api_view(['POST'])
def RiderCreateTicket(request):
    subject, message = request.data.get('subject'), request.data.get('message')
    if not isinstance(subject, str) or not 3 <= len(subject.strip()) <= 120 or not isinstance(message, str) or not 10 <= len(message.strip()) <= 2000:
        return failure('Subject must be 3–120 characters and message 10–2000 characters.', 400)
    if SupportTicket.objects.filter(rider=request.account, created_at__gte=timezone.now() - timedelta(minutes=1)).count() >= 3:
        return failure('Please wait before raising another ticket.', 429)
    ticket = SupportTicket.objects.create(rider=request.account, subject=subject.strip(), message=message.strip())
    return JsonResponse({'status': True, 'data': ticket_data(ticket)}, status=201)

@api_view(['GET'])
def RiderTickets(request):
    limit = min(int(request.GET.get('limit', 50)), 200)
    tickets = SupportTicket.objects.filter(rider=request.account).select_related('rider').order_by('-created_at')[:limit]
    return JsonResponse({'status': True, 'data': [ticket_data(row) for row in tickets]})

@api_view(['GET'])
@query_errors
def AdminTickets(request):
    rows=filters(request,SupportTicket.objects.select_related('customer', 'rider'))
    for field,allowed in [('status',TICKET_STATUSES),('priority',PRIORITIES)]:
        value=request.GET.get(field,'')
        if value and value not in allowed: raise ValueError(field)
        if value: rows=rows.filter(**{field:value})
    source = request.GET.get('source', '').strip()
    if source == 'Customer':
        rows = rows.filter(customer__isnull=False)
    elif source == 'Rider':
        rows = rows.filter(rider__isnull=False)
    query=request.GET.get('q','').strip()
    if len(query)>120: raise ValueError('search')
    if query:
        rows=rows.filter(
            Q(subject__icontains=query)|
            Q(customer__fname__icontains=query)|
            Q(customer__lname__icontains=query)|
            Q(customer__mobileno__icontains=query)|
            Q(customer__emailid__icontains=query)|
            Q(rider__name__icontains=query)|
            Q(rider__phone__icontains=query)|
            Q(rider__rider_id__icontains=query)
        )
    total=rows.count()
    selected,number,size=page(request,rows.order_by('-created_at','-pk'))
    return JsonResponse({'status':True,'data':[ticket_data(row) for row in selected],'total':total,'page':number,'page_size':size})

@api_view(['POST'])
@transaction.atomic
def UpdateTicket(request):
    data=request.data
    if type(data.get('id')) is not int or type(data.get('version')) is not int or data.get('status') not in TICKET_STATUSES or data.get('priority') not in PRIORITIES or not isinstance(data.get('response',''),str) or len(data.get('response',''))>2000:
        return failure('Check ticket status, priority and response (up to 2000 characters).',400)
    SupportTicket.objects.filter(pk=data['id']).update(version=F('version'))
    ticket=SupportTicket.objects.select_for_update().select_related('customer', 'rider').filter(pk=data['id']).first()
    if not ticket: return failure('Ticket not found.',404)
    if ticket.version!=data['version']: return failure('This ticket changed. Refresh before saving.',409)
    ticket.status,ticket.priority,ticket.response=data['status'],data['priority'],data.get('response','').strip()
    ticket.version+=1
    ticket.updated_by=str(request.account.pk)
    ticket.save()
    return JsonResponse({'status':True,'data':ticket_data(ticket)})


@api_view(['GET'])
def ListDeliveryZones(request):
    zones = DeliveryZone.objects.all().order_by('zone_name')
    data = []
    for z in zones:
        codes = [c.strip() for c in z.postcodes.split(',') if c.strip()]
        data.append({
            'id': z.pk,
            'zone_name': z.zone_name,
            'postcodes': z.postcodes,
            'postcodes_count': len(codes)
        })
    return JsonResponse({'status': True, 'data': data})


@api_view(['POST'])
@transaction.atomic
def SaveDeliveryZone(request):
    data = request.data
    zone_id = data.get('id')
    name = (data.get('zone_name') or '').strip()
    postcodes = (data.get('postcodes') or '').strip()
    if not name or not postcodes:
        return failure('Zone name and postcodes are required.', 400)
    
    if zone_id:
        zone = DeliveryZone.objects.filter(pk=zone_id).first()
        if not zone:
            return failure('Zone not found.', 404)
        if DeliveryZone.objects.filter(zone_name__iexact=name).exclude(pk=zone_id).exists():
            return failure('Another zone with this name already exists.', 409)
        zone.zone_name = name
        zone.postcodes = postcodes
        zone.save()
    else:
        if DeliveryZone.objects.filter(zone_name__iexact=name).exists():
            return failure('A zone with this name already exists.', 409)
        zone = DeliveryZone.objects.create(zone_name=name, postcodes=postcodes)

    return JsonResponse({
        'status': True,
        'message': 'Zone saved successfully',
        'data': {
            'id': zone.pk,
            'zone_name': zone.zone_name,
            'postcodes': zone.postcodes
        }
    })


@api_view(['POST'])
def DeleteDeliveryZone(request):
    zone_id = request.data.get('id')
    zone = DeliveryZone.objects.filter(pk=zone_id).first()
    if not zone:
        return failure('Zone not found.', 404)
    zone.delete()
    return JsonResponse({'status': True, 'message': 'Zone deleted successfully'})


@api_view(['GET'])
def ListExcludedAreas(request):
    areas = ExcludedArea.objects.all().order_by('area_name')
    return JsonResponse({'status': True, 'data': [
        {'id': a.pk, 'area_name': a.area_name, 'postcode': a.postcode} for a in areas
    ]})


@api_view(['POST'])
@transaction.atomic
def SaveExcludedArea(request):
    data = request.data
    area_id = data.get('id')
    name = (data.get('area_name') or '').strip()
    postcode = (data.get('postcode') or '').strip()
    if not name or not postcode:
        return failure('Area name and postcode are required.', 400)

    if area_id:
        area = ExcludedArea.objects.filter(pk=area_id).first()
        if not area:
            return failure('Excluded area not found.', 404)
        if ExcludedArea.objects.filter(area_name__iexact=name).exclude(pk=area_id).exists():
            return failure('Another excluded area with this name already exists.', 409)
        area.area_name = name
        area.postcode = postcode
        area.save()
    else:
        if ExcludedArea.objects.filter(area_name__iexact=name).exists():
            return failure('An excluded area with this name already exists.', 409)
        area = ExcludedArea.objects.create(area_name=name, postcode=postcode)

    return JsonResponse({
        'status': True,
        'message': 'Excluded area saved successfully',
        'data': {'id': area.pk, 'area_name': area.area_name, 'postcode': area.postcode}
    })


@api_view(['POST'])
def DeleteExcludedArea(request):
    area_id = request.data.get('id')
    area = ExcludedArea.objects.filter(pk=area_id).first()
    if not area:
        return failure('Excluded area not found.', 404)
    area.delete()
    return JsonResponse({'status': True, 'message': 'Excluded area deleted successfully'})

