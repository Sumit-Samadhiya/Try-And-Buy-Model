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
from .models import UserAddress, TryOrder, DeliveryRider, DeliveryZone, ExcludedArea, DeliveryAssignment
from .security import failure, owns_order

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
    if request.data.get('order_id') and not DeliveryAssignment.objects.filter(try_order__order_id=request.data['order_id'], rider=rider).exists():
        return failure('This order is not assigned to you.', 403)
    rider.latitude, rider.longitude = point
    rider.location_updated_at = timezone.now()
    rider.save(update_fields=['latitude', 'longitude', 'location_updated_at'])

    # Real-time relay to active order channel group if order_id is present
    order_id = request.data.get('order_id')
    heading = request.data.get('heading', 0)
    if order_id:
        try:
            from asgiref.sync import async_to_sync
            from channels.layers import get_channel_layer
            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    f'order_{order_id}',
                    {
                        'type': 'rider_location_updated',
                        'data': {
                            'order_id': order_id,
                            'lat': point[0],
                            'lng': point[1],
                            'heading': heading,
                            'rider_name': rider.name,
                            'bike_number': rider.bike_number,
                            'phone': rider.phone,
                            'updated_at': rider.location_updated_at.isoformat()
                        }
                    }
                )
        except Exception as exc:
            logger.warning('Failed to broadcast rider location over channels: %s', exc)

    return JsonResponse({'status': True, 'message': 'Rider location updated.', 'data': {'lat': point[0], 'lng': point[1]}})


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
    rider_points = {}
    for rider in DeliveryRider.objects.filter(status='Active'):
        fresh = rider.location_updated_at and rider.location_updated_at >= timezone.now() - timedelta(minutes=5)
        distance = distance_km(order.latitude, order.longitude, rider.latitude, rider.longitude) if fresh and all(value is not None for value in (order.latitude, order.longitude, rider.latitude, rider.longitude)) else None
        if distance is not None:
            rider_points[rider.rider_id] = (rider.latitude, rider.longitude)
        zone_match = rider.zone.casefold() in zone_names | {order.city.casefold(), order.postcode.casefold()}
        workload = rider.deliveryassignment_set.exclude(status='Delivered').exclude(try_order__status='CANCELLED').count()
        road_distance_km = None
        road_eta_mins = None
        road_eta_display = None
        if distance is not None:
            road_distance_km = round(distance * 1.30, 2)
            road_eta_mins = max(1, int(round((road_distance_km / 25.0) * 60.0 * 1.25 + 3.0)))
            road_eta_display = f"~{road_eta_mins} mins ({road_distance_km} km approximate)"

        values.append({
            'rider_id': rider.rider_id,
            'name': rider.name,
            'zone': rider.zone,
            'distance_km': round(distance, 2) if distance is not None else None,
            'road_distance_km': road_distance_km,
            'road_eta_minutes': road_eta_mins,
            'road_eta_display': road_eta_display,
            'is_fallback': True,
            'zone_match': zone_match,
            'active_orders': workload
        })
    values.sort(key=lambda row: (row['distance_km'] is None, row['distance_km'] if row['distance_km'] is not None else 0, not row['zone_match'], row['active_orders'], row['name']))
    # One matrix call for a bounded shortlist, rather than one request per rider.
    shortlist = [row for row in values if row['rider_id'] in rider_points][:5]
    if shortlist:
        points = [rider_points[row['rider_id']] for row in shortlist] + [(order.latitude, order.longitude)]
        path = ';'.join(f'{float(lon):.6f},{float(lat):.6f}' for lat, lon in points)
        sources = ';'.join(str(i) for i in range(len(shortlist)))
        try:
            url = f'https://router.project-osrm.org/table/v1/driving/{path}?sources={sources}&destinations={len(shortlist)}&annotations=duration,distance'
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'DoorDrape/1.0'}), timeout=2) as response:
                matrix = json.loads(response.read(100000))
            if matrix.get('code') == 'Ok':
                for i, row in enumerate(shortlist):
                    seconds, metres = matrix['durations'][i][0], matrix['distances'][i][0]
                    if seconds is None or metres is None or not isfinite(seconds + metres) or min(seconds, metres) < 0:
                        continue
                    minutes = max(1, int(round(seconds * 1.25 / 60 + 3)))
                    row.update(road_distance_km=round(metres / 1000, 2), road_eta_minutes=minutes,
                               road_eta_display=f'~{minutes} mins ({metres / 1000:.1f} km, no live traffic)', is_fallback=False)
        except (OSError, ValueError, KeyError, IndexError, TypeError):
            pass
        values.sort(key=lambda row: (row['road_eta_minutes'] is None, row['is_fallback'], row['road_eta_minutes'] or 0, row['active_orders']))
    return JsonResponse({'status': True, 'data': values})


@api_view(['GET', 'POST'])
def RouteETA(request):
    """
    Returns real turn-by-turn road route, scooter driving ETA, and polyline coordinates.
    Accepts:
      - start_lat, start_lng (or rider_id)
      - dest_lat, dest_lng (or order_id)
    """
    data = request.data if request.method == 'POST' else request.GET
    start_lat = data.get('start_lat')
    start_lng = data.get('start_lng')
    dest_lat = data.get('dest_lat')
    dest_lng = data.get('dest_lng')

    order_id = data.get('order_id')
    rider_id = data.get('rider_id')
    if order_id or rider_id:
        role, account = getattr(request, 'account_role', None), getattr(request, 'account', None)
        if not account:
            return failure('Please sign in to view delivery locations.', 401)
        if order_id:
            selected_order = TryOrder.objects.filter(order_id=order_id).first()
            if not selected_order or not owns_order(role, account, selected_order):
                return failure('Order not found or access denied.', 403)
            if rider_id and role != 'admin' and not DeliveryAssignment.objects.filter(try_order=selected_order, rider__rider_id=rider_id).exists():
                return failure('Rider is not assigned to this order.', 403)
        elif role != 'admin' and not (role == 'rider' and str(account.rider_id) == str(rider_id)):
            return failure('You cannot view this rider location.', 403)
    if order_id and (dest_lat is None or dest_lng is None):
        order = TryOrder.objects.filter(order_id=order_id).first()
        if order and order.latitude is not None and order.longitude is not None:
            dest_lat = order.latitude
            dest_lng = order.longitude

    rider_id = data.get('rider_id')
    if rider_id and (start_lat is None or start_lng is None):
        rider = DeliveryRider.objects.filter(rider_id=rider_id).first()
        if rider and (not rider.location_updated_at or rider.location_updated_at < timezone.now() - timedelta(minutes=5)):
            return failure('Rider location is outdated. Ask the rider to refresh it.', 409)
        if rider and rider.latitude is not None and rider.longitude is not None:
            start_lat = rider.latitude
            start_lng = rider.longitude

    if None in (start_lat, start_lng, dest_lat, dest_lng):
        return JsonResponse({'status': False, 'message': 'Valid start and destination coordinates are required.'}, status=400)

    try:
        from .routing_service import get_road_route
        route_res = get_road_route(float(start_lat), float(start_lng), float(dest_lat), float(dest_lng))
        if not route_res:
            return JsonResponse({'status': False, 'message': 'Unable to calculate road route.'}, status=400)

        return JsonResponse({
            'status': True,
            'data': route_res
        })
    except Exception as exc:
        logger.warning('RouteETA calculation failed: %s', exc)
        return JsonResponse({'status': False, 'message': 'Route calculation error'}, status=500)



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
                        lat, lon = None, None
                        try:
                            nom_url = f"https://nominatim.openstreetmap.org/search?postalcode={pin}&country=India&format=json"
                            nom_req = urllib.request.Request(nom_url, headers={'User-Agent': 'DoorDrapeApp/1.0'})
                            with urllib.request.urlopen(nom_req, timeout=3) as nom_resp:
                                nom_data = json.loads(nom_resp.read().decode('utf-8'))
                                if nom_data and len(nom_data) > 0:
                                    lat = float(nom_data[0]['lat'])
                                    lon = float(nom_data[0]['lon'])
                        except Exception as e:
                            logger.debug(f"Pincode coords lookup warning: {e}")

                        postal_data = {
                            'district': district,
                            'state': state,
                            'city': city,
                            'country': 'India',
                            'areas': areas[:15],
                            'latitude': lat,
                            'longitude': lon,
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
            'areas': [],
            'latitude': None,
            'longitude': None,
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
        'latitude': postal_data.get('latitude'),
        'longitude': postal_data.get('longitude'),
        'serviceable': is_serviceable,
        'zone_name': primary_zone,
        'matching_zones': matching_zones,
        'is_excluded': is_excluded,
        'message': service_message
    })

