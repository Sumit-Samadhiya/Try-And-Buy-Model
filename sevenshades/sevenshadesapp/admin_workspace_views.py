from datetime import date, datetime, time, timedelta
from functools import wraps
from django.db import transaction
from django.db.models import Q, F
from django.http import JsonResponse
from django.utils import timezone
from rest_framework.decorators import api_view
from .models import TryOrder, FinalOrder, SignUp, DeliveryRider, ProductDetails, SupportTicket
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
    final=FinalOrder.objects.filter(try_order__in=orders,payment_status='paid')
    collected=sum(final.values_list('final_payable',flat=True))+sum(orders.filter(trial_fee_paid=True).values_list('try_fee',flat=True))
    return JsonResponse({'status':True,'data':{'orders':orders.count(),'collected':collected,'completed':orders.filter(status__in=['DELIVERED','NO_PURCHASE']).count(),
      'unassigned':orders.filter(status='TRY_REQUESTED').count(),'awaiting_approval':orders.filter(status='AWAITING_SELECTION_APPROVAL').count(),
      'active_riders':DeliveryRider.objects.filter(status='Active').count(),'low_stock':ProductDetails.objects.filter(qty__lte=3).count(),
      'open_tickets':SupportTicket.objects.filter(status__in=['Open','In Progress']).count(),'statuses':counts,
      'recent':list(orders.order_by('-created_at','-pk').values('order_id','mobileno','status','created_at')[:6])}})

def ticket_data(ticket):
    return {'id':ticket.pk,'reference':f'TKT-{ticket.pk:06d}','customer':customer_data(ticket.customer),'subject':ticket.subject,
        'message':ticket.message,'status':ticket.status,'priority':ticket.priority,'response':ticket.response,'version':ticket.version,
        'created_at':ticket.created_at.isoformat(),'updated_at':ticket.updated_at.isoformat()}

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
    return JsonResponse({'status':True,'data':[ticket_data(row) for row in SupportTicket.objects.filter(customer=request.account).select_related('customer').order_by('-created_at')]})

@api_view(['GET'])
@query_errors
def AdminTickets(request):
    rows=filters(request,SupportTicket.objects.select_related('customer'))
    for field,allowed in [('status',TICKET_STATUSES),('priority',PRIORITIES)]:
        value=request.GET.get(field,'')
        if value and value not in allowed: raise ValueError(field)
        if value: rows=rows.filter(**{field:value})
    query=request.GET.get('q','').strip()
    if len(query)>120: raise ValueError('search')
    if query:
        rows=rows.filter(Q(subject__icontains=query)|Q(customer__fname__icontains=query)|Q(customer__lname__icontains=query)|Q(customer__mobileno__icontains=query)|Q(customer__emailid__icontains=query))
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
    ticket=SupportTicket.objects.select_for_update().select_related('customer').filter(pk=data['id']).first()
    if not ticket: return failure('Ticket not found.',404)
    if ticket.version!=data['version']: return failure('This ticket changed. Refresh before saving.',409)
    ticket.status,ticket.priority,ticket.response=data['status'],data['priority'],data.get('response','').strip()
    ticket.version+=1
    ticket.updated_by=str(request.account.pk)
    ticket.save()
    return JsonResponse({'status':True,'data':ticket_data(ticket)})
