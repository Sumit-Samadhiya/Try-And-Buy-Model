from django.http.response import JsonResponse
from rest_framework.decorators import api_view
from django.utils import timezone
import requests
from django.db import transaction, OperationalError
from .delivery_workflow import assign_order, advance_assignment, generate_batches
from .inventory_workflow import InventoryError
from .inventory_workflow import lock_order
from django.contrib.auth.hashers import make_password
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from .security import authenticate_account, failure
from sevenshadesapp.models import DeliveryRider, DeliveryAssignment, TryOrder, DeliveryBatch
from sevenshadesapp.serializer import DeliveryRiderSerializer, DeliveryAssignmentWithRefSerializer, DeliveryBatchSerializer


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
        rider_count = DeliveryRider.objects.count() + 1
        rider = DeliveryRider.objects.create(
            rider_id=f'RDR-{rider_count:04d}',
            name=request.data.get('name', ''),
            phone=phone,
            password=make_password(password),
            bike_number=request.data.get('bike_number', ''),
            zone=request.data.get('zone', ''),
            status=request.data.get('status', 'Active'),
        )
        return JsonResponse({'status': True, 'message': 'Rider created', 'data': DeliveryRiderSerializer(rider).data}, safe=False)
    except Exception as e:
        print('DeliveryRiderCreate error:', e)
        return JsonResponse({'status': False, 'message': 'Unable to create rider'}, safe=False)


@api_view(['GET'])
def DeliveryRiderList(request):
    try:
        riders = DeliveryRider.objects.all().order_by('-id')
        return JsonResponse({'status': True, 'data': DeliveryRiderSerializer(riders, many=True).data}, safe=False)
    except Exception as e:
        print('DeliveryRiderList error:', e)
        return JsonResponse({'status': False, 'data': []}, safe=False)


@api_view(['POST'])
def DeliveryRiderLogin(request):
    phone, password = request.data.get('phone'), request.data.get('password')
    if not phone or not password or not isinstance(password, str):
        return failure('Phone and password are required.', 400)
    rider, error = authenticate_account(request, 'rider', phone, password)
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
    except Exception as e:
        print('DeliveryAssignmentsList error:', e)
        return JsonResponse({'status': False, 'data': []}, safe=False)


@api_view(['POST'])
def DeliveryAssignmentUpdateStatus(request):
    return delivery_mutation(lambda: DeliveryAssignmentWithRefSerializer(advance_assignment(
        request.account_role, request.account, request.data.get('assignment_id'), request.data.get('status'))).data)


@api_view(['POST'])
def StartTrialTimer(request):
    try:
        assignment_id = request.data.get('assignment_id')
        assignment = DeliveryAssignment.objects.filter(assignment_id=assignment_id).first()
        if not assignment:
            return JsonResponse({'status': False, 'message': 'Assignment not found'}, safe=False)

        assignment.trial_start_time = timezone.now()
        assignment.status = 'Trial Started'
        assignment.save()

        return JsonResponse({
            'status': True,
            'message': 'Trial timer started',
            'start_time': assignment.trial_start_time
        }, safe=False)
    except Exception as e:
        print('StartTrialTimer error:', e)
        return JsonResponse({'status': False, 'message': 'Unable to start trial timer'}, safe=False)


@api_view(['POST'])
def EndTrialTimer(request):
    try:
        assignment_id = request.data.get('assignment_id')
        assignment = DeliveryAssignment.objects.filter(assignment_id=assignment_id).first()
        if not assignment:
            return JsonResponse({'status': False, 'message': 'Assignment not found'}, safe=False)

        assignment.trial_end_time = timezone.now()
        assignment.status = 'Trial Ended'
        assignment.save()

        duration = (assignment.trial_end_time - assignment.trial_start_time).total_seconds() / 60 if assignment.trial_start_time else 0

        return JsonResponse({
            'status': True,
            'message': 'Trial timer ended',
            'end_time': assignment.trial_end_time,
            'duration_minutes': round(duration, 2)
        }, safe=False)
    except Exception as e:
        print('EndTrialTimer error:', e)
        return JsonResponse({'status': False, 'message': 'Unable to end trial timer'}, safe=False)


@api_view(['POST'])
def DeliveryRiderTasks(request):
    try:
        phone = request.account.phone if request.account_role == 'rider' else request.data.get('phone')
        rider = DeliveryRider.objects.filter(phone=phone, status='Active').first()
        if not rider:
            return JsonResponse({'status': False, 'message': 'Rider not found', 'data': []}, safe=False)

        assignments = DeliveryAssignment.objects.select_related('rider', 'try_order').filter(rider=rider).order_by('-id')
        return JsonResponse({'status': True, 'data': DeliveryAssignmentWithRefSerializer(assignments, many=True).data}, safe=False)
    except Exception as e:
        print('DeliveryRiderTasks error:', e)
        return JsonResponse({'status': False, 'data': []}, safe=False)


@api_view(['POST'])
def AssignSOSOrder(request):
    try:
        order_id = request.data.get('order_id')
        try_order = TryOrder.objects.filter(order_id=order_id, delivery_mode='emergency_sos').first()
        if not try_order:
            return JsonResponse({'status': False, 'message': 'Invalid SOS order'}, safe=False)

        # Basic logic: Find an active rider in the same city/zone
        # In a real scenario, this would use geospatial data
        rider = DeliveryRider.objects.filter(zone=try_order.city, status='Active').first()
        if not rider:
            # Fallback: any active rider
            rider = DeliveryRider.objects.filter(status='Active').first()

        if not rider:
            return JsonResponse({'status': False, 'message': 'No active riders available for SOS'}, safe=False)

        assignment_count = DeliveryAssignment.objects.count() + 1
        assignment = DeliveryAssignment.objects.create(
            assignment_id=f'ASG-SOS-{assignment_count:06d}',
            try_order=try_order,
            rider=rider,
            status='Assigned (SOS)',
        )

        try_order.status = 'SOS Dispatching'
        try_order.save()

        return JsonResponse({
            'status': True,
            'message': 'SOS Order assigned automatically',
            'data': DeliveryAssignmentWithRefSerializer(assignment).data
        }, safe=False)
    except Exception as e:
        print('AssignSOSOrder error:', e)
        return JsonResponse({'status': False, 'message': 'Unable to assign SOS order'}, safe=False)


@api_view(['POST'])
def GenerateDeliveryBatch(request):
    return delivery_mutation(lambda: DeliveryBatchSerializer(generate_batches(request.data.get('rider_id')), many=True).data)


@api_view(['GET'])
def DeliveryBatchList(request):
    rows = DeliveryBatch.objects.select_related('rider').order_by('-created_at')
    return JsonResponse({'status': True, 'data': [dict(DeliveryBatchSerializer(row).data,
        rider_name=row.rider.name if row.rider else '',
        order_ids=list(row.deliveryassignment_set.values_list('try_order__order_id', flat=True))) for row in rows]})


@api_view(['POST'])
def OptimizeRoute(request):
    try:
        batch_id = request.data.get('batch_id')
        batch = DeliveryBatch.objects.filter(batch_id=batch_id).first()
        if not batch:
            return JsonResponse({'status': False, 'message': 'Batch not found'}, safe=False)

        assignments = DeliveryAssignment.objects.filter(batch=batch)
        
        # 1. Get coordinates for each order (simplified: assume we have a way to get them)
        # For now, we'll just return the order IDs in the batch as a placeholder for the route
        order_ids = [a.try_order.order_id for a in assignments]
        
        # 2. Call OSRM API (placeholder for actual implementation)
        # In a real scenario, we would geocode addresses and call OSRM
        
        return JsonResponse({
            'status': True,
            'message': 'Route optimized (placeholder)',
            'order_sequence': order_ids
        }, safe=False)
    except Exception as e:
        print('OptimizeRoute error:', e)
        return JsonResponse({'status': False, 'message': 'Unable to optimize route'}, safe=False)
