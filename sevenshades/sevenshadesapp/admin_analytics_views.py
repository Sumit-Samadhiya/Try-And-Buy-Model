import json
import logging
from datetime import datetime, time, timedelta
from django.http.response import JsonResponse
from django.utils import timezone
from rest_framework.decorators import api_view
from django.db import models
from django.db.models import Count
from sevenshadesapp.models import TryOrder, FinalOrder, AnalyticsEvent

logger = logging.getLogger(__name__)

def _get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')

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


@api_view(['POST'])
def TrackAnalyticsEvent(request):
    """
    Ingest page view and user interaction tracking events from frontend.
    Accepts either a single event dictionary or a list of events { "events": [...] }.
    """
    try:
        import ast

        payload = getattr(request, 'data', {})
        events_data = []
        if isinstance(payload, dict):
            raw_events = payload.get('events')
            if hasattr(payload, 'getlist'):
                qd_list = payload.getlist('events')
                if len(qd_list) > 1 or (len(qd_list) == 1 and not isinstance(raw_events, list)):
                    raw_events = qd_list

            if isinstance(raw_events, list):
                events_data = raw_events
            elif raw_events:
                events_data = [raw_events]
            elif any(k in payload for k in ('event_name', 'page_path', 'event_type')):
                events_data = [payload]
        elif isinstance(payload, list):
            events_data = payload

        # Normalize string items (e.g. from QueryDict) into dicts
        parsed_events = []
        for item in events_data:
            if isinstance(item, str):
                try:
                    item = json.loads(item)
                except Exception:
                    try:
                        item = ast.literal_eval(item)
                    except Exception:
                        continue
            if isinstance(item, dict):
                parsed_events.append(item)

        if not parsed_events:
            return JsonResponse({'status': False, 'message': 'No event payload provided'}, status=400)

        ip = _get_client_ip(request)
        ua = (request.META.get('HTTP_USER_AGENT') or '')[:500]
        actor_role = getattr(request, 'account_role', None) or 'anonymous'
        actor = getattr(request, 'account', None)
        default_mobile = ''
        if actor:
            default_mobile = str(getattr(actor, 'mobileno', None) or getattr(actor, 'phone', None) or getattr(actor, 'emailid', ''))

        instances = []
        for raw in parsed_events[:50]:  # Limit batch size to 50
            if not isinstance(raw, dict):
                continue
            event_name = str(raw.get('event_name') or 'custom_event').strip()[:100]
            if not event_name:
                continue

            event_type = raw.get('event_type') or ('PAGE_VIEW' if event_name == 'page_view' else 'USER_EVENT')
            if event_type not in ('PAGE_VIEW', 'USER_EVENT'):
                event_type = 'USER_EVENT'

            page_path = str(raw.get('page_path') or '')[:255]
            page_title = str(raw.get('page_title') or '')[:255]
            session_id = str(raw.get('session_id') or '')[:100]
            user_mobile = str(raw.get('user_mobile') or default_mobile)[:20]
            user_role = str(raw.get('user_role') or actor_role)[:20]
            props = raw.get('properties')
            if not isinstance(props, dict):
                props = {}

            instances.append(AnalyticsEvent(
                event_type=event_type,
                event_name=event_name,
                page_path=page_path,
                page_title=page_title,
                user_mobile=user_mobile,
                user_role=user_role,
                session_id=session_id,
                properties=props,
                ip_address=ip if ip and len(ip) <= 45 else None,
                user_agent=ua
            ))

        if instances:
            AnalyticsEvent.objects.bulk_create(instances)

        return JsonResponse({'status': True, 'count': len(instances)})
    except Exception as e:
        logger.exception('TrackAnalyticsEvent error: %s', e)
        return JsonResponse({'status': False, 'message': 'Tracking failed silently'}, status=200)


@api_view(['GET'])
def GetAnalyticsDashboard(request):
    """
    Returns aggregated metrics, top pages, top events, and recent activity log for Admin.
    """
    try:
        qs = AnalyticsEvent.objects.all()

        # Date range filtering
        from_date_str = request.GET.get('from', '')
        to_date_str = request.GET.get('to', '')
        if from_date_str:
            try:
                from_d = datetime.fromisoformat(from_date_str)
                qs = qs.filter(created_at__gte=timezone.make_aware(datetime.combine(from_d.date(), time.min)))
            except Exception:
                pass
        if to_date_str:
            try:
                to_d = datetime.fromisoformat(to_date_str)
                qs = qs.filter(created_at__lte=timezone.make_aware(datetime.combine(to_d.date(), time.max)))
            except Exception:
                pass

        event_type_filter = request.GET.get('event_type', '').strip()
        if event_type_filter in ('PAGE_VIEW', 'USER_EVENT'):
            qs = qs.filter(event_type=event_type_filter)

        search_q = request.GET.get('q', '').strip()
        if search_q:
            qs = qs.filter(
                models.Q(page_path__icontains=search_q) |
                models.Q(event_name__icontains=search_q) |
                models.Q(user_mobile__icontains=search_q)
            )

        total_records = qs.count()
        page_views_count = qs.filter(event_type='PAGE_VIEW').count()
        user_events_count = qs.filter(event_type='USER_EVENT').count()
        unique_sessions_count = qs.values('session_id').exclude(session_id='').distinct().count()
        unique_users_count = qs.values('user_mobile').exclude(user_mobile='').distinct().count()

        # Top 10 Pages
        top_pages = list(
            qs.filter(event_type='PAGE_VIEW')
            .exclude(page_path='')
            .values('page_path')
            .annotate(views=Count('id'))
            .order_by('-views')[:10]
        )

        # Top 10 Events
        top_events = list(
            qs.filter(event_type='USER_EVENT')
            .values('event_name')
            .annotate(count=Count('id'))
            .order_by('-count')[:10]
        )

        # Recent 50 Events Log
        recent_events = []
        for row in qs.order_by('-created_at')[:50]:
            recent_events.append({
                'id': row.id,
                'created_at': row.created_at.isoformat(),
                'event_type': row.event_type,
                'event_name': row.event_name,
                'page_path': row.page_path,
                'page_title': row.page_title,
                'user_mobile': row.user_mobile,
                'user_role': row.user_role,
                'session_id': row.session_id,
                'properties': row.properties,
                'ip_address': row.ip_address or '',
            })

        return JsonResponse({
            'status': True,
            'data': {
                'total_records': total_records,
                'page_views': page_views_count,
                'user_events': user_events_count,
                'unique_sessions': unique_sessions_count,
                'unique_users': unique_users_count,
                'top_pages': top_pages,
                'top_events': top_events,
                'recent_events': recent_events
            }
        })
    except Exception as e:
        logger.exception('GetAnalyticsDashboard error: %s', e)
        return JsonResponse({'status': False, 'message': 'Unable to fetch analytics data'}, status=500)

