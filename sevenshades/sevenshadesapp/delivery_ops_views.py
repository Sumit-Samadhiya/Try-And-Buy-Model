from django.http.response import JsonResponse
from rest_framework.decorators import api_view
from django.db import OperationalError
import logging
import uuid
from sevenshadesapp.delivery_workflow import assign_order, advance_assignment, generate_batches, reassign_order
from sevenshadesapp.inventory_workflow import InventoryError
from django.contrib.auth.hashers import make_password
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from sevenshadesapp.security import authenticate_account, failure
from sevenshadesapp.models import DeliveryRider, DeliveryAssignment, DeliveryBatch
from sevenshadesapp.serializer import DeliveryRiderSerializer, DeliveryAssignmentWithRefSerializer, DeliveryBatchSerializer

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
        rider_id = request.data.get('rider_id')
        rider = DeliveryRider.objects.filter(rider_id=rider_id).first()
        if not rider:
            return JsonResponse({'status': False, 'message': 'Rider not found'}, status=404)
        if 'status' in request.data:
            new_status = request.data.get('status')
            if new_status in ('Active', 'Inactive'):
                rider.status = new_status
        if 'zone' in request.data and request.data.get('zone'):
            rider.zone = request.data.get('zone')
        if 'bike_number' in request.data and request.data.get('bike_number'):
            rider.bike_number = request.data.get('bike_number')
        if 'name' in request.data and request.data.get('name'):
            rider.name = request.data.get('name')
        rider.save()
        return JsonResponse({'status': True, 'message': 'Rider updated successfully', 'data': DeliveryRiderSerializer(rider).data})
    except Exception:
        logger.exception('DeliveryRiderUpdate failed')
        return JsonResponse({'status': False, 'message': 'Unable to update rider'}, status=400)


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
    return delivery_mutation(lambda: DeliveryBatchSerializer(generate_batches(request.data.get('rider_id')), many=True).data)


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
                'slot': order.delivery_slot,
                'lat': order_lat,
                'lng': order_lng,
            })

        # Nearest-Neighbor TSP heuristic
        curr_lat, curr_lng = base_lat, base_lng
        order_sequence = []
        waypoints = []
        total_distance = 0.0
        total_time_mins = 0.0
        stop_num = 1

        while unvisited:
            best_idx = 0
            best_dist = float('inf')
            for idx, stop in enumerate(unvisited):
                dist = _haversine_km(curr_lat, curr_lng, stop['lat'], stop['lng'])
                if dist < best_dist:
                    best_dist = dist
                    best_idx = idx

            chosen = unvisited.pop(best_idx)
            leg_distance = round(best_dist, 2)
            total_distance += leg_distance
            # Travel time assuming avg 25 km/h + 15 min doorstep trial window
            leg_travel_mins = (leg_distance / 25.0) * 60.0
            arrival_mins = total_time_mins + leg_travel_mins
            total_time_mins = arrival_mins + 15.0

            order_sequence.append(chosen['order_id'])
            waypoints.append({
                'stop_number': stop_num,
                'order_id': chosen['order_id'],
                'assignment_id': chosen['assignment_id'],
                'address': chosen['address'],
                'delivery_slot': chosen['slot'],
                'latitude': chosen['lat'],
                'longitude': chosen['lng'],
                'leg_distance_km': leg_distance,
                'estimated_arrival_minutes': int(round(arrival_mins))
            })
            curr_lat, curr_lng = chosen['lat'], chosen['lng']
            stop_num += 1

        return JsonResponse({
            'status': True,
            'message': 'Route estimated from verified rider and delivery coordinates.',
            'batch_id': batch.batch_id,
            'order_sequence': order_sequence,
            'waypoints': waypoints,
            'total_distance_km': round(total_distance, 2),
            'estimated_duration_minutes': int(round(total_time_mins)),
            'stops_count': len(order_sequence),
            'skipped_orders': skipped_orders
        }, safe=False)
    except Exception:
        logger.exception('OptimizeRoute failed')
        return JsonResponse({'status': False, 'message': 'Unable to optimize route'}, status=500, safe=False)
