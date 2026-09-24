from math import radians, sin, cos, sqrt, atan2, isfinite
from datetime import timedelta
from django.http import JsonResponse
from django.utils import timezone
from rest_framework.decorators import api_view
from .models import UserAddress, TryOrder, DeliveryRider, DeliveryZone
from .security import failure


def coordinates(data):
    try:
        if type(data.get('latitude')) not in (float, int) or type(data.get('longitude')) not in (float, int):
            return None
        lat, lon = float(data['latitude']), float(data['longitude'])
        if not isfinite(lat) or not isfinite(lon) or not -90 <= lat <= 90 or not -180 <= lon <= 180:
            return None
        return round(lat, 7), round(lon, 7)
    except (ValueError, TypeError):
        return None


@api_view(['POST'])
def AddressLocation(request):
    point = coordinates(request.data)
    if type(request.data.get('address_id')) is not int or not point:
        return failure('A saved address and valid location are required.', 400)
    address = UserAddress.objects.filter(pk=request.data['address_id'], mobileno=request.account).first()
    if not address:
        return failure('Address not found.', 404)
    address.latitude, address.longitude = point
    address.save(update_fields=['latitude', 'longitude'])
    return JsonResponse({'status': True, 'message': 'Delivery location saved.'})


@api_view(['POST'])
def RiderLocation(request):
    point = coordinates(request.data)
    if not point:
        return failure('A valid location is required.', 400)
    rider = request.account
    rider.latitude, rider.longitude = point
    rider.location_updated_at = timezone.now()
    rider.save(update_fields=['latitude', 'longitude', 'location_updated_at'])
    return JsonResponse({'status': True, 'message': 'Rider location updated.'})


def distance_km(a, b, c, d):
    lat1, lon1, lat2, lon2 = map(radians, map(float, (a, b, c, d)))
    value = sin((lat2-lat1)/2)**2 + cos(lat1)*cos(lat2)*sin((lon2-lon1)/2)**2
    value = min(1, max(0, value))
    return 6371 * 2 * atan2(sqrt(value), sqrt(1-value))


@api_view(['POST'])
def RiderSuggestions(request):
    order = TryOrder.objects.filter(order_id=request.data.get('order_id')).first()
    if not order:
        return failure('Order not found.', 404)
    zone_names = {zone.zone_name.casefold() for zone in DeliveryZone.objects.all() if order.postcode in [code.strip() for code in zone.postcodes.split(',')]}
    values = []
    for rider in DeliveryRider.objects.filter(status='Active'):
        fresh = rider.location_updated_at and rider.location_updated_at >= timezone.now() - timedelta(minutes=30)
        distance = distance_km(order.latitude, order.longitude, rider.latitude, rider.longitude) if fresh and all(value is not None for value in (order.latitude, order.longitude, rider.latitude, rider.longitude)) else None
        zone_match = rider.zone.casefold() in zone_names | {order.city.casefold(), order.postcode.casefold()}
        workload = rider.deliveryassignment_set.exclude(status='Delivered').exclude(try_order__status='CANCELLED').count()
        values.append({'rider_id': rider.rider_id, 'name': rider.name, 'zone': rider.zone, 'distance_km': round(distance, 2) if distance is not None else None, 'zone_match': zone_match, 'active_orders': workload})
    values.sort(key=lambda row: (row['distance_km'] is None, row['distance_km'] if row['distance_km'] is not None else 0, not row['zone_match'], row['active_orders'], row['name']))
    return JsonResponse({'status': True, 'data': values})
