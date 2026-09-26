from datetime import date, datetime, time, timedelta
from functools import wraps
import re
from django.db import transaction
from django.db.models import Q, F, Sum, Case, When, Value, CharField
from django.db.models.functions import Coalesce
from django.http import JsonResponse
from django.utils import timezone
from rest_framework.decorators import api_view
from .models import TryOrder, FinalOrder, SignUp, DeliveryRider, ProductDetails, SupportTicket, DeliveryZone, ExcludedArea, BudgetDeal, MainCategory, MySubCategory

from .security import failure

STATUSES = {value for value, label in TryOrder._meta.get_field('status').choices}
TICKET_STATUSES = ('Open','In Progress','Resolved','Closed')
PRIORITIES = ('Low','Normal','High','Urgent')
PINCODE = re.compile(r'^[1-9][0-9]{5}$')

def clean_pincodes(raw):
    """Validate a comma-separated pincode list and return it normalised.

    Raises ValueError naming the first invalid entry. Indian PINs are six
    digits and never start with zero.
    """
    codes = [code.strip() for code in raw.split(',') if code.strip()]
    if not codes:
        raise ValueError('Enter at least one 6-digit pincode.')
    for code in codes:
        if not PINCODE.match(code):
            raise ValueError(f'"{code}" is not a valid 6-digit pincode.')
    return ','.join(dict.fromkeys(codes))

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

def bounded_limit(request, default=50, maximum=200):
    value = int(request.GET.get('limit', default))
    if value < 1:
        raise ValueError('limit')
    return min(value, maximum)

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
    # Resolve payment state/mode in the database so mode and payment filters discard
    # rows before they are fetched. FinalOrder is a reverse one-to-one, so the outer
    # join cannot fan out. Mirrors the per-row fallbacks used when building rows below.
    orders = orders.annotate(
        resolved_state=Coalesce('finalorder__payment_status', Value('pending')),
        resolved_mode=Case(
            When(Q(finalorder__payment_mode__isnull=False) & ~Q(finalorder__payment_mode=''),
                 then=F('finalorder__payment_mode')),
            default=F('try_payment_mode'), output_field=CharField()))
    if mode: orders = orders.filter(resolved_mode=mode)
    if payment: orders = orders.filter(resolved_state=payment)
    finals = {row.try_order_id:row for row in FinalOrder.objects.filter(try_order__in=orders.values('pk'))}
    customers = {str(row.pk):row for row in SignUp.objects.filter(pk__in=orders.values('mobileno'))}
    rows=[]
    for order in orders.order_by('-created_at','-pk'):
        final=finals.get(order.pk)
        state=final.payment_status if final else 'pending'
        method=(final.payment_mode if final and final.payment_mode else order.try_payment_mode)
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
@query_errors
def CustomerTickets(request):
    limit = bounded_limit(request)
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
@query_errors
def RiderTickets(request):
    limit = bounded_limit(request)
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
    try:
        postcodes = clean_pincodes(postcodes)
    except ValueError as exc:
        return failure(str(exc), 400)

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
    if not PINCODE.match(postcode):
        return failure(f'"{postcode}" is not a valid 6-digit pincode.', 400)

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


@api_view(['GET'])
def ServiceablePincodesSummary(request):
    zones = DeliveryZone.objects.all().order_by('zone_name')
    pincode_map = {}
    for z in zones:
        codes = [c.strip() for c in z.postcodes.split(',') if c.strip()]
        for code in codes:
            if code not in pincode_map:
                pincode_map[code] = []
            pincode_map[code].append({'id': z.pk, 'zone_name': z.zone_name})

    pincodes_list = [
        {'pincode': pin, 'zones': z_list, 'zone_count': len(z_list)}
        for pin, z_list in sorted(pincode_map.items())
    ]

    excluded = [
        {'id': e.pk, 'area_name': e.area_name, 'postcode': e.postcode}
        for e in ExcludedArea.objects.all().order_by('area_name')
    ]

    zones_data = [
        {
            'id': z.pk,
            'zone_name': z.zone_name,
            'postcodes': z.postcodes,
            'postcodes_count': len([c for c in z.postcodes.split(',') if c.strip()])
        }
        for z in zones
    ]

    return JsonResponse({
        'status': True,
        'data': {
            'pincodes': pincodes_list,
            'zones': zones_data,
            'excluded_areas': excluded,
            'total_serviceable_pincodes': len(pincodes_list)
        }
    })


@api_view(['POST'])
@transaction.atomic
def AddPincode(request):
    pincode = str(request.data.get('pincode') or '').strip()
    zone_name = str(request.data.get('zone_name') or '').strip() or 'Jhansi Metropolitan Area'

    if not PINCODE.match(pincode):
        return failure(f'"{pincode}" is not a valid 6-digit Indian pincode.', 400)

    # 1. Update or create the target zone
    zone = DeliveryZone.objects.filter(zone_name__iexact=zone_name).first()
    if zone:
        current_codes = [c.strip() for c in zone.postcodes.split(',') if c.strip()]
        if pincode not in current_codes:
            current_codes.append(pincode)
            zone.postcodes = ','.join(current_codes)
            zone.save(update_fields=['postcodes'])
    else:
        zone = DeliveryZone.objects.create(zone_name=zone_name, postcodes=pincode)

    # 2. Also ensure General Delivery Zone contains it if general zone exists
    gen_zone = DeliveryZone.objects.filter(zone_name__iexact='General Delivery Zone').first()
    if gen_zone and gen_zone.pk != zone.pk:
        gen_codes = [c.strip() for c in gen_zone.postcodes.split(',') if c.strip()]
        if pincode not in gen_codes:
            gen_codes.append(pincode)
            gen_zone.postcodes = ','.join(gen_codes)
            gen_zone.save(update_fields=['postcodes'])

    return JsonResponse({
        'status': True,
        'message': f'Pincode {pincode} added to {zone.zone_name}.',
        'data': {'pincode': pincode, 'zone_name': zone.zone_name}
    })


@api_view(['POST'])
@transaction.atomic
def RemovePincode(request):
    pincode = str(request.data.get('pincode') or '').strip()
    if not pincode:
        return failure('Pincode is required.', 400)

    zones = DeliveryZone.objects.all()
    updated_count = 0
    for zone in zones:
        codes = [c.strip() for c in zone.postcodes.split(',') if c.strip()]
        if pincode in codes:
            new_codes = [c for c in codes if c != pincode]
            if new_codes:
                zone.postcodes = ','.join(new_codes)
                zone.save(update_fields=['postcodes'])
            else:
                zone.delete()
            updated_count += 1

    return JsonResponse({
        'status': True,
        'message': f'Pincode {pincode} removed successfully.'
    })



@api_view(['GET'])
def Admin_Budget_Bazaar_List(request):
    try:
        deals = BudgetDeal.objects.all().select_related('maincategoryid', 'subcategoryid').order_by('order_index', 'id')
        data = []
        for d in deals:
            icon_url = str(d.icon) if d.icon else (str(d.subcategoryid.icon) if d.subcategoryid and d.subcategoryid.icon else '')
            data.append({
                'id': d.id,
                'title': d.title,
                'price_tag': d.price_tag,
                'max_price': d.max_price,
                'maincategoryid': d.maincategoryid_id,
                'maincategoryname': d.maincategoryid.maincategoryname if d.maincategoryid else '',
                'subcategoryid': d.subcategoryid_id,
                'subcategoryname': d.subcategoryid.subcategoryname if d.subcategoryid else '',
                'icon': icon_url,
                'tier_color': d.tier_color,
                'order_index': d.order_index,
                'is_active': d.is_active,
            })
        return JsonResponse({'status': True, 'data': data})
    except Exception as e:
        logger.exception('Admin_Budget_Bazaar_List error: %s', e)
        return failure('Unable to fetch budget deals.', 500)


@api_view(['POST'])
@transaction.atomic
def Admin_Budget_Bazaar_Save(request):
    try:
        deal_id = request.data.get('id')
        title = (request.data.get('title') or '').strip()
        price_tag = (request.data.get('price_tag') or '').strip()
        max_price = request.data.get('max_price')
        maincategoryid = request.data.get('maincategoryid')
        subcategoryid = request.data.get('subcategoryid')
        tier_color = (request.data.get('tier_color') or 'blue').strip()
        order_index = int(request.data.get('order_index') or 0)
        is_active = str(request.data.get('is_active', 'true')).lower() in ('true', '1')

        if not title:
            return failure('Title is required.', 400)
        if not price_tag:
            return failure('Price tag is required (e.g. Under ₹499).', 400)

        max_price_val = None
        if max_price not in (None, '', 'null'):
            try:
                max_price_val = int(max_price)
            except (ValueError, TypeError):
                max_price_val = None

        main_cat = MainCategory.objects.filter(id=maincategoryid).first() if maincategoryid else None
        sub_cat = MySubCategory.objects.filter(id=subcategoryid).first() if subcategoryid else None

        if sub_cat and not main_cat:
            main_cat = sub_cat.maincategoryid

        if deal_id:
            deal = BudgetDeal.objects.filter(id=deal_id).first()
            if not deal:
                return failure('Deal not found.', 404)
            deal.title = title
            deal.price_tag = price_tag
            deal.max_price = max_price_val
            deal.maincategoryid = main_cat
            deal.subcategoryid = sub_cat
            deal.tier_color = tier_color
            deal.order_index = order_index
            deal.is_active = is_active
            if 'icon' in request.FILES:
                deal.icon = request.FILES['icon']
            deal.save()
            msg = 'Budget deal updated successfully.'
        else:
            deal = BudgetDeal.objects.create(
                title=title,
                price_tag=price_tag,
                max_price=max_price_val,
                maincategoryid=main_cat,
                subcategoryid=sub_cat,
                tier_color=tier_color,
                order_index=order_index,
                is_active=is_active,
                icon=request.FILES.get('icon')
            )
            msg = 'Budget deal created successfully.'

        return JsonResponse({'status': True, 'message': msg, 'data': {'id': deal.id}})
    except Exception as e:
        logger.exception('Admin_Budget_Bazaar_Save error: %s', e)
        return failure('Failed to save budget deal.', 500)


@api_view(['POST'])
@transaction.atomic
def Admin_Budget_Bazaar_Delete(request):
    try:
        deal_id = request.data.get('id')
        if not deal_id:
            return failure('Deal ID is required.', 400)
        deal = BudgetDeal.objects.filter(id=deal_id).first()
        if not deal:
            return failure('Deal not found.', 404)
        deal.delete()
        return JsonResponse({'status': True, 'message': 'Budget deal deleted successfully.'})
    except Exception as e:
        logger.exception('Admin_Budget_Bazaar_Delete error: %s', e)
        return failure('Failed to delete budget deal.', 500)
