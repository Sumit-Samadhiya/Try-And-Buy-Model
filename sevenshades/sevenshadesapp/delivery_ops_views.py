from django.http.response import JsonResponse
from rest_framework.decorators import api_view
from django.utils import timezone
import requests
from sevenshadesapp.models import DeliveryRider, DeliveryAssignment, TryOrder, DeliveryBatch
from sevenshadesapp.serializer import DeliveryRiderSerializer, DeliveryAssignmentWithRefSerializer, DeliveryBatchSerializer


@api_view(['POST'])
def DeliveryRiderCreate(request):
    try:
        phone = request.data.get('phone')
        if DeliveryRider.objects.filter(phone=phone).exists():
            return JsonResponse({'status': False, 'message': 'Rider phone already exists'}, safe=False)

        rider_count = DeliveryRider.objects.count() + 1
        rider = DeliveryRider.objects.create(
            rider_id=f'RDR-{rider_count:04d}',
            name=request.data.get('name', ''),
            phone=phone,
            password=request.data.get('password', ''),
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
    try:
        phone = request.data.get('phone')
        password = request.data.get('password')
        rider = DeliveryRider.objects.filter(phone=phone, password=password, status='Active').first()
        if not rider:
            return JsonResponse({'status': False, 'message': 'Invalid rider credentials'}, safe=False)

        return JsonResponse({'status': True, 'data': DeliveryRiderSerializer(rider).data, 'message': 'Login success'}, safe=False)
    except Exception as e:
        print('DeliveryRiderLogin error:', e)
        return JsonResponse({'status': False, 'message': 'Unable to login'}, safe=False)


@api_view(['POST'])
def DeliveryAssignOrder(request):
    try:
        order_id = request.data.get('order_id')
        rider_id = request.data.get('rider_id')
        status = request.data.get('status', 'Assigned')

        try_order = TryOrder.objects.filter(order_id=order_id).first()
        rider = DeliveryRider.objects.filter(rider_id=rider_id).first()

        if not try_order or not rider:
            return JsonResponse({'status': False, 'message': 'Invalid order or rider'}, safe=False)

        assignment = DeliveryAssignment.objects.filter(try_order=try_order).first()
        if assignment:
            assignment.rider = rider
            assignment.status = status
            assignment.save()
        else:
            assignment_count = DeliveryAssignment.objects.count() + 1
            assignment = DeliveryAssignment.objects.create(
                assignment_id=f'ASG-{assignment_count:06d}',
                try_order=try_order,
                rider=rider,
                status=status,
            )

        return JsonResponse({'status': True, 'message': 'Order assigned successfully', 'data': DeliveryAssignmentWithRefSerializer(assignment).data}, safe=False)
    except Exception as e:
        print('DeliveryAssignOrder error:', e)
        return JsonResponse({'status': False, 'message': 'Unable to assign order'}, safe=False)


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
    try:
        assignment_id = request.data.get('assignment_id')
        status = request.data.get('status')
        assignment = DeliveryAssignment.objects.filter(assignment_id=assignment_id).first()
        if not assignment:
            return JsonResponse({'status': False, 'message': 'Assignment not found'}, safe=False)

        assignment.status = status
        assignment.save()
        return JsonResponse({'status': True, 'message': 'Status updated', 'data': DeliveryAssignmentWithRefSerializer(assignment).data}, safe=False)
    except Exception as e:
        print('DeliveryAssignmentUpdateStatus error:', e)
        return JsonResponse({'status': False, 'message': 'Unable to update status'}, safe=False)


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
        phone = request.data.get('phone')
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
    try:
        # 1. Find pending standard orders
        pending_orders = TryOrder.objects.filter(delivery_mode='standard', status='Try Requested')
        
        if not pending_orders.exists():
            return JsonResponse({'status': False, 'message': 'No pending standard orders to batch'}, safe=False)

        # 2. Group by postcode (simple batching)
        batches = {}
        for order in pending_orders:
            postcode = order.postcode
            if postcode not in batches:
                batches[postcode] = []
            batches[postcode].append(order)

        # 3. Create batches
        created_batches = []
        for postcode, orders in batches.items():
            batch_count = DeliveryBatch.objects.count() + 1
            batch = DeliveryBatch.objects.create(
                batch_id=f'BAT-{postcode}-{batch_count:04d}',
                status='Pending'
            )
            
            # 4. Assign orders to batch
            for order in orders:
                assignment = DeliveryAssignment.objects.filter(try_order=order).first()
                if assignment:
                    assignment.batch = batch
                    assignment.save()
            
            created_batches.append(DeliveryBatchSerializer(batch).data)

        return JsonResponse({'status': True, 'message': 'Batches generated', 'data': created_batches}, safe=False)
    except Exception as e:
        print('GenerateDeliveryBatch error:', e)
        return JsonResponse({'status': False, 'message': 'Unable to generate batches'}, safe=False)


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
