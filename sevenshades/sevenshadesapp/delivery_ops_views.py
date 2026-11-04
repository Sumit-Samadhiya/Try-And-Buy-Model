from django.http.response import JsonResponse
from rest_framework.decorators import api_view
from django.db import OperationalError, transaction
import logging
import uuid
import re
from sevenshadesapp.delivery_workflow import assign_order, advance_assignment, generate_batches, reassign_order
from sevenshadesapp.inventory_workflow import InventoryError
from django.contrib.auth.hashers import make_password, check_password
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from sevenshadesapp.security import authenticate_account, failure
from sevenshadesapp.models import DeliveryRider, DeliveryAssignment, DeliveryBatch, WhatsAppOtp
from sevenshadesapp.serializer import DeliveryRiderSerializer, DeliveryAssignmentWithRefSerializer, DeliveryBatchSerializer
from django.utils import timezone
from datetime import timedelta
from django.conf import settings

logger = logging.getLogger(__name__)


@api_view(['POST'])
def DeliveryRiderCreate(request):
    try:
        phone = request.data.get('phone')
        if DeliveryRider.objects.filter(phone=phone).exists():
            return JsonResponse({'status': False, 'message': 'Rider phone already exists'}, safe=False)

        password = request.data.get('password', '')
        try:
            validate_password(password)
        except ValidationError as exc:
            return failure(' '.join(exc.messages), 400)

        while True:
            candidate_id = f'RDR-{uuid.uuid4().hex[:8].upper()}'
            if not DeliveryRider.objects.filter(rider_id=candidate_id).exists():
                break

        rider = DeliveryRider.objects.create(
            rider_id=candidate_id,
            name=request.data.get('name', ''),
            phone=phone,
            password=make_password(password),
            bike_number=request.data.get('bike_number', ''),
            zone=request.data.get('zone', ''),
            status=request.data.get('status', 'Active'),
        )
        return JsonResponse({'status': True, 'message': 'Rider created', 'data': DeliveryRiderSerializer(rider).data}, safe=False)
    except Exception:
        logger.exception('DeliveryRiderCreate failed')
        return JsonResponse({'status': False, 'message': 'Unable to create rider'}, safe=False)


@api_view(['POST'])
def DeliveryRiderUpdate(request):
    try:
        rider_id = request.data.get('rider_id') or request.data.get('id')
        rider = DeliveryRider.objects.filter(rider_id=rider_id).first() if rider_id else None
        if not rider and request.data.get('id'):
            rider = DeliveryRider.objects.filter(id=request.data.get('id')).first()
        if not rider:
            return JsonResponse({'status': False, 'message': 'Rider not found'}, status=404)

        if 'status' in request.data:
            new_status = request.data.get('status')
            if new_status in ('Active', 'Inactive'):
                rider.status = new_status
        if 'zone' in request.data and request.data.get('zone'):
            rider.zone = str(request.data.get('zone')).strip()
        if 'bike_number' in request.data and request.data.get('bike_number'):
            rider.bike_number = str(request.data.get('bike_number')).strip()
        if 'name' in request.data and request.data.get('name'):
            rider.name = str(request.data.get('name')).strip()

        # Update phone number with format and uniqueness checks
        if 'phone' in request.data and request.data.get('phone'):
            new_phone = str(request.data.get('phone')).strip()
            if not re.fullmatch(r'[6-9][0-9]{9}', new_phone):
                return failure('Enter a valid 10-digit Indian mobile number.', 400)
            if DeliveryRider.objects.filter(phone=new_phone).exclude(pk=rider.pk).exists():
                return JsonResponse({'status': False, 'message': 'Rider phone already exists.'}, status=400)
            rider.phone = new_phone

        # Reset / Update rider password if supplied
        new_password = request.data.get('password')
        if new_password:
            if not isinstance(new_password, str) or len(new_password) < 8 or new_password.isdigit():
                return failure('Password must be at least 8 characters and not numeric-only.', 400)
            try:
                validate_password(new_password)
            except ValidationError as exc:
                return failure(' '.join(exc.messages), 400)
            rider.password = make_password(new_password)

        rider.save()
        return JsonResponse({
            'status': True,
            'message': 'Rider updated successfully',
            'data': DeliveryRiderSerializer(rider).data
        })
    except Exception:
        logger.exception('DeliveryRiderUpdate failed')
        return JsonResponse({'status': False, 'message': 'Unable to update rider'}, status=400)


@api_view(['POST'])
def DeliveryRiderResetPassword(request):
    """Allow registered rider to self-reset password with phone and OTP verification."""
    try:
        phone = str(request.data.get('phone') or '').strip()
        otp = str(request.data.get('otp') or '').strip()
        password = request.data.get('password')
        confirm_password = request.data.get('confirm_password')

        if not phone or not re.fullmatch(r'[6-9][0-9]{9}', phone):
            return failure('Enter a valid 10-digit Indian mobile number.', 400)
        if not otp:
            return failure('Verification OTP is required.', 400)
        if not password or not confirm_password:
            return failure('Password and confirm password are required.', 400)
        if password != confirm_password:
            return failure('Passwords do not match.', 400)
        if len(password) < 8 or password.isdigit():
            return failure('Password must be at least 8 characters and not numeric-only.', 400)

        rider = DeliveryRider.objects.filter(phone=phone).first()
        if not rider:
            return JsonResponse({'status': False, 'message': 'No registered rider found with this mobile number.'}, status=404)

        now = timezone.now()
        otp_valid = False
        otp_rec = WhatsAppOtp.objects.filter(phone=phone, is_consumed=False, expires_at__gte=now).order_by('-created_at').first()
        if otp_rec and check_password(otp, otp_rec.otp_hash):
            otp_valid = True
            otp_rec.is_consumed = True
            otp_rec.save(update_fields=['is_consumed'])
        elif (settings.DEBUG or getattr(settings, 'OTP_TEST_MODE', False)) and otp == '123456':
            otp_valid = True

        if not otp_valid:
            return failure('Invalid or expired OTP. Please request a new verification code.', 401)

        try:
            validate_password(password)
        except ValidationError as exc:
            return failure(' '.join(exc.messages), 400)

        rider.password = make_password(password)
        rider.save()

        return JsonResponse({
            'status': True,
            'message': 'Rider password reset successfully. Please log in with your new password.',
            'data': DeliveryRiderSerializer(rider).data
        })
    except Exception:
        logger.exception('DeliveryRiderResetPassword failed')
        return JsonResponse({'status': False, 'message': 'Unable to reset rider password.'}, status=400)


@api_view(['POST'])
def DeliveryOrderReassign(request):
    try:
        order_id = request.data.get('order_id')
        new_rider_id = request.data.get('rider_id')
        if not order_id or not new_rider_id:
            return failure('Order ID and new Rider ID are required.', 400)
        assignment = reassign_order(order_id, new_rider_id)
        return JsonResponse({'status': True, 'message': 'Order reassigned successfully', 'data': DeliveryAssignmentWithRefSerializer(assignment).data})
    except InventoryError as exc:
        return failure(str(exc), 400)
    except Exception:
        logger.exception('DeliveryOrderReassign failed')
        return JsonResponse({'status': False, 'message': 'Unable to reassign order'}, status=400)


@api_view(['GET'])
def DeliveryRiderList(request):
    try:
        riders = DeliveryRider.objects.all().order_by('-id')
        return JsonResponse({'status': True, 'data': DeliveryRiderSerializer(riders, many=True).data}, safe=False)
    except Exception:
        logger.exception('DeliveryRiderList failed')
        return JsonResponse({'status': False, 'data': [], 'message': 'Failed to fetch riders'}, status=500, safe=False)


@api_view(['POST'])
def DeliveryRiderLogin(request):
    identifier = request.data.get('phone') or request.data.get('rider_id') or request.data.get('username')
    password = request.data.get('password')
    if not identifier or not password or not isinstance(password, str):
        return failure('Rider ID/Phone and password are required.', 400)
    rider, error = authenticate_account(request, 'rider', identifier, password)
    if error is not None:
        return error
    return JsonResponse({'status': True, 'data': DeliveryRiderSerializer(rider).data})


def delivery_mutation(callback):
    try:
        return JsonResponse({'status': True, 'data': callback()})
    except InventoryError as error:
        return failure(str(error), 409)
    except OperationalError:
        return failure('Delivery operations are busy. Refresh and retry.', 503)


@api_view(['POST'])
def DeliveryAssignOrder(request):
    return delivery_mutation(lambda: DeliveryAssignmentWithRefSerializer(assign_order(
        request.data.get('order_id'), request.data.get('rider_id'), request.data.get('status', 'Assigned'))).data)


@api_view(['GET'])
def DeliveryAssignmentsList(request):
    try:
        assignments = DeliveryAssignment.objects.select_related('rider', 'try_order').all().order_by('-id')
        return JsonResponse({'status': True, 'data': DeliveryAssignmentWithRefSerializer(assignments, many=True).data}, safe=False)
    except Exception:
        logger.exception('DeliveryAssignmentsList failed')
        return JsonResponse({'status': False, 'data': [], 'message': 'Failed to fetch assignments'}, status=500, safe=False)


@api_view(['POST'])
def DeliveryAssignmentUpdateStatus(request):
    return delivery_mutation(lambda: DeliveryAssignmentWithRefSerializer(advance_assignment(
        request.account_role, request.account, request.data.get('assignment_id'), request.data.get('status'))).data)


@api_view(['POST'])
def DeliveryRiderTasks(request):
    try:
        phone = request.account.phone if request.account_role == 'rider' else request.data.get('phone')
        rider = DeliveryRider.objects.filter(phone=phone, status='Active').first()
        if not rider:
            return JsonResponse({'status': False, 'message': 'Rider not found', 'data': []}, status=404, safe=False)

        assignments = DeliveryAssignment.objects.select_related('rider', 'try_order').filter(rider=rider).order_by('-id')
        return JsonResponse({'status': True, 'data': DeliveryAssignmentWithRefSerializer(assignments, many=True).data}, safe=False)
    except Exception:
        logger.exception('DeliveryRiderTasks failed')
        return JsonResponse({'status': False, 'data': [], 'message': 'Failed to fetch rider tasks'}, status=500, safe=False)


@api_view(['POST'])
def GenerateDeliveryBatch(request):
    rider_id = request.data.get('rider_id')
    max_orders = request.data.get('max_orders')
    try:
        max_orders = int(max_orders) if max_orders else None
    except (ValueError, TypeError):
        max_orders = None
    return delivery_mutation(lambda: DeliveryBatchSerializer(generate_batches(rider_id, max_orders=max_orders), many=True).data)


@api_view(['GET'])
def DeliveryBatchList(request):
    rows = DeliveryBatch.objects.select_related('rider').order_by('-created_at')
    return JsonResponse({'status': True, 'data': [dict(DeliveryBatchSerializer(row).data,
        rider_name=row.rider.name if row.rider else '',
        order_ids=list(row.deliveryassignment_set.values_list('try_order__order_id', flat=True))) for row in rows]})


import math


def _haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0  # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


@api_view(['POST'])
def OptimizeRoute(request):
    try:
        batch_id = request.data.get('batch_id')
        batch = DeliveryBatch.objects.filter(batch_id=batch_id).first()
        if not batch:
            return JsonResponse({'status': False, 'message': 'Batch not found'}, status=404, safe=False)

        # Authorization check: only admin or the rider assigned to this batch can view/optimize it
        if request.account_role == 'rider' and batch.rider != request.account:
            return failure('You do not have permission to view or optimize another rider’s batch route.', 403)

        assignments = list(DeliveryAssignment.objects.select_related('try_order', 'rider').filter(batch=batch).exclude(status__in=['Delivered', 'Cancelled']))

        if not assignments:
            return JsonResponse({
                'status': True,
                'message': 'No orders in this batch to optimize',
                'batch_id': batch.batch_id,
                'order_sequence': [],
                'total_distance_km': 0.0,
                'estimated_duration_minutes': 0,
                'waypoints': []
            }, safe=False)

        if len(assignments) > 3:
            return failure('Split this batch into at most 3 trial bags before planning its route.', 400)
        # Route estimates require measured coordinates. Never fabricate a hub or stop.
        rider = batch.rider
        req_lat = request.data.get('start_lat')
        req_lng = request.data.get('start_lng')
        base_lat = base_lng = None
        if req_lat is not None and req_lng is not None:
            try:
                base_lat, base_lng = float(req_lat), float(req_lng)
            except (ValueError, TypeError):
                return failure('Enter valid route starting coordinates.', 400)
        elif rider and rider.latitude is not None and rider.longitude is not None:
            if not rider.location_updated_at or rider.location_updated_at < timezone.now() - timedelta(minutes=5):
                return failure('Rider location is outdated. Ask the rider to refresh it before planning.', 409)
            try:
                base_lat, base_lng = float(rider.latitude), float(rider.longitude)
            except (ValueError, TypeError):
                pass
        if base_lat is None or base_lng is None or not (-90 <= base_lat <= 90 and -180 <= base_lng <= 180):
            return failure('Update the rider location before optimizing this route.', 409)

        # Prepare unvisited stops
        unvisited = []
        skipped_orders = []
        for a in assignments:
            order = a.try_order
            order_lat = None
            order_lng = None
            if order.latitude is not None and order.longitude is not None:
                try:
                    order_lat = float(order.latitude)
                    order_lng = float(order.longitude)
                except (ValueError, TypeError):
                    pass
            if order_lat is None or order_lng is None:
                skipped_orders.append({'order_id': order.order_id, 'reason': 'missing_verified_coordinates'})
                continue
            if not (-90 <= order_lat <= 90 and -180 <= order_lng <= 180):
                skipped_orders.append({'order_id': order.order_id, 'reason': 'invalid_coordinates'})
                continue

            unvisited.append({
                'order_id': order.order_id,
                'assignment_id': a.assignment_id,
                'address': f"{order.address_text}, {order.city} {order.postcode}".strip(),
                'delivery_slot': order.delivery_slot,
                'scheduled_date': order.scheduled_date or timezone.localdate(order.created_at),
                'latitude': order_lat,
                'longitude': order_lng,
            })

        from .routing_service import optimize_batch_tsp
        opt_res = optimize_batch_tsp(base_lat, base_lng, unvisited)
        if not opt_res:
            return JsonResponse({'status': False, 'message': 'Unable to optimize route'}, status=500, safe=False)

        all_skipped = skipped_orders + opt_res.get('skipped_orders', [])
        saved = False
        # Save only complete, feasible road plans while assignments are still pending.
        if not all_skipped and opt_res.get('fits_all_slots') and not opt_res.get('is_fallback'):
            with transaction.atomic():
                current = list(DeliveryAssignment.objects.select_for_update().filter(batch=batch).exclude(status__in=['Delivered', 'Cancelled']))
                before = {(a.pk, a.rider_id, a.status) for a in assignments}
                after = {(a.pk, a.rider_id, a.status) for a in current}
                if before != after:
                    return failure('Assignments changed while planning. Refresh and try again.', 409)
                if all(a.status == 'Assigned' for a in current):
                    ranks = {order_id: i for i, order_id in enumerate(opt_res['order_sequence'], 1)}
                    for assignment in current:
                        assignment.route_position = ranks[assignment.try_order.order_id]
                    DeliveryAssignment.objects.bulk_update(current, ['route_position'])
                    saved = True

        return JsonResponse({
            'status': True,
            'message': f"Route optimized via {opt_res.get('routing_engine', 'turn-by-turn routing')}.",
            'batch_id': batch.batch_id,
            'order_sequence': opt_res['order_sequence'],
            'waypoints': opt_res['waypoints'],
            'total_distance_km': opt_res['total_distance_km'],
            'estimated_duration_minutes': opt_res['estimated_duration_minutes'],
            'driving_duration_minutes': opt_res.get('driving_duration_minutes', 0),
            'total_trial_minutes': opt_res.get('total_trial_minutes', 0),
            'stops_count': opt_res.get('stops_count', len(opt_res['order_sequence'])),
            'route_polyline': opt_res.get('route_polyline', []),
            'routing_engine': opt_res.get('routing_engine'),
            'is_fallback': opt_res.get('is_fallback', True),
            'waiting_minutes': opt_res.get('waiting_minutes', 0),
            'return_minutes': opt_res.get('return_minutes', 0),
            'fits_all_slots': opt_res.get('fits_all_slots', False) and not all_skipped,
            'route_saved': saved,
            'skipped_orders': all_skipped
        }, safe=False)
    except Exception:
        logger.exception('OptimizeRoute failed')
        return JsonResponse({'status': False, 'message': 'Unable to optimize route'}, status=500, safe=False)
