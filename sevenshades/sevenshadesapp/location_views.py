import re
import urllib.request
import json
import logging
from math import radians, sin, cos, sqrt, atan2, isfinite
from datetime import timedelta
from django.core.cache import cache
from django.http import JsonResponse
from django.utils import timezone
from rest_framework.decorators import api_view
from .models import UserAddress, TryOrder, DeliveryRider, DeliveryZone, ExcludedArea
from .security import failure

logger = logging.getLogger(__name__)


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


@api_view(['GET', 'POST'])
def PincodeLookup(request):
    """
    Public API integration with India Postal PIN Code API (https://api.postalpincode.in)
    Automates address entry, auto-populates City/District/State, suggests localities,
    and performs instant doorstep trial serviceability checks against DoorDrape's DeliveryZones.
    """
    pin = request.query_params.get('pincode') if hasattr(request, 'query_params') else None
    if not pin and hasattr(request, 'data'):
        pin = request.data.get('pincode') or request.data.get('postcode')
    if not pin and hasattr(request, 'GET'):
        pin = request.GET.get('pincode') or request.GET.get('postcode')
    pin = str(pin or '').strip()

    if not re.fullmatch(r'[1-9][0-9]{5}', pin):
        return JsonResponse({
            'status': False,
            'message': 'Please enter a valid 6-digit Indian PIN code.'
        }, status=400)

    # 1. DoorDrape DeliveryZone and ExcludedArea serviceability evaluation
    all_zones = DeliveryZone.objects.all()
    matching_zones = []
    for zone in all_zones:
        codes = [c.strip() for c in (zone.postcodes or '').split(',') if c.strip()]
        if pin in codes:
            matching_zones.append(zone.zone_name)

    is_excluded = ExcludedArea.objects.filter(postcode=pin).exists()
    is_serviceable = bool(matching_zones) and not is_excluded
    primary_zone = matching_zones[0] if matching_zones else None

    # 2. Check cached postal details
    cache_key = f"doordrape_pin_{pin}"
    postal_data = cache.get(cache_key)

    if not postal_data:
        try:
            req = urllib.request.Request(
                f"https://api.postalpincode.in/pincode/{pin}",
                headers={'User-Agent': 'DoorDrape/1.0'}
            )
            with urllib.request.urlopen(req, timeout=4) as response:
                payload = json.loads(response.read().decode('utf-8'))
                if payload and isinstance(payload, list) and payload[0].get('Status') == 'Success':
                    offices = payload[0].get('PostOffice', [])
                    if offices:
                        first = offices[0]
                        district = first.get('District') or ''
                        state = first.get('State') or ''
                        block = first.get('Block') or ''
                        city = district if district and district.lower() != 'na' else (block or state)
                        areas = sorted({po.get('Name') for po in offices if po.get('Name')})
                        postal_data = {
                            'district': district,
                            'state': state,
                            'city': city,
                            'country': 'India',
                            'areas': areas[:15],
                        }
                        # Cache for 7 days
                        cache.set(cache_key, postal_data, 7 * 24 * 60 * 60)
        except Exception as e:
            logger.warning(f"Postal PIN Code lookup failed for {pin}: {e}")

    if not postal_data:
        postal_data = {
            'district': '',
            'state': '',
            'city': '',
            'country': 'India',
            'areas': []
        }

    if is_serviceable:
        service_message = f"Doorstep trial available in {primary_zone}! (Standard & SOS 90-Min)"
    elif is_excluded:
        service_message = f"PIN {pin} is currently marked as an excluded delivery zone."
    else:
        service_message = f"DoorDrape trial service is not yet available in PIN {pin}."

    return JsonResponse({
        'status': True,
        'pincode': pin,
        'district': postal_data.get('district', ''),
        'state': postal_data.get('state', ''),
        'city': postal_data.get('city', ''),
        'country': postal_data.get('country', 'India'),
        'areas': postal_data.get('areas', []),
        'serviceable': is_serviceable,
        'zone_name': primary_zone,
        'matching_zones': matching_zones,
        'is_excluded': is_excluded,
        'message': service_message
    })

