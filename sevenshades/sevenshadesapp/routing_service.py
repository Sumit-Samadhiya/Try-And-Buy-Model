import json
import logging
import math
import urllib.request
from datetime import datetime, timedelta, time
from django.core.cache import cache
from django.utils import timezone

logger = logging.getLogger(__name__)

# Average scooter speed in Indian city traffic (km/h) for fallback estimations
SCOOTER_AVG_SPEED_KMH = 25.0
# Indian city road detour factor over straight aerial lines (approx 1.25x - 1.35x)
ROAD_DETOUR_FACTOR = 1.30
# City traffic congestion multiplier on baseline open-road driving durations
TRAFFIC_MULTIPLIER = 1.25
# DoorDrape standard doorstep trial duration in minutes
DOORDRAPE_TRIAL_DURATION_MINS = 15
# Parking / gate entry buffer in minutes
GATE_ENTRY_BUFFER_MINS = 3

NAMED_SLOTS = {
    'morning': ('10:00 AM', '02:00 PM'),
    'afternoon': ('02:00 PM', '05:00 PM'),
    'evening': ('05:00 PM', '08:00 PM'),
    'night': ('08:00 PM', '10:00 PM'),
}


def haversine_km(lat1, lon1, lat2, lon2):
    """
    Computes straight-line great circle distance between two points in kilometers.
    Safe against invalid or None coordinates.
    """
    try:
        if None in (lat1, lon1, lat2, lon2):
            return 0.0
        lat1, lon1, lat2, lon2 = map(float, (lat1, lon1, lat2, lon2))
        r = 6371.0  # Earth radius in km
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat / 2.0) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2
        a = min(1.0, max(0.0, a))
        return round(r * 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a)), 2)
    except Exception:
        return 0.0


def parse_slot_time_range(slot_text, base_date=None):
    """
    Parses trial slot strings into (start_datetime, end_datetime) aware with current timezone:
    Supports:
      - '10:00 AM - 02:00 PM'
      - '4:00 PM - 5:00 PM'
      - '4 PM - 5 PM'
      - '16:00 - 17:00'
      - 'Morning', 'Evening', 'Night'
    """
    if not slot_text or not isinstance(slot_text, str):
        return None, None
    raw = slot_text.strip()
    date_ref = base_date or timezone.localdate()

    if raw.lower() in NAMED_SLOTS:
        s_str, e_str = NAMED_SLOTS[raw.lower()]
    elif '-' in raw:
        parts = [p.strip() for p in raw.split('-', 1)]
        s_str, e_str = parts[0], parts[1]
    else:
        return None, None

    def parse_time_str(val):
        cleaned = val.upper().replace('.', '')
        # Handle formats like "4 PM" or "04:00 PM" or "16:00"
        for fmt in ('%I:%M %p', '%I %p', '%H:%M', '%H'):
            try:
                t = datetime.strptime(cleaned, fmt).time()
                dt = datetime.combine(date_ref, t)
                if timezone.is_naive(dt):
                    return timezone.make_aware(dt, timezone.get_current_timezone())
                return dt
            except ValueError:
                continue
        return None

    s_dt = parse_time_str(s_str)
    e_dt = parse_time_str(e_str)
    if s_dt and e_dt and e_dt <= s_dt:
        e_dt += timedelta(days=1)
    return s_dt, e_dt


def get_road_route(start_lat, start_lng, dest_lat, dest_lng, timeout=3.5):
    """
    Fetches real road turn-by-turn driving route, distance (km), and scooter ETA from OSRM.
    Includes Indian city traffic multiplier and parking/gate entry buffer.
    Falls back gracefully to road-adjusted Haversine formula if OSRM is unreachable.
    """
    try:
        start_lat = float(start_lat)
        start_lng = float(start_lng)
        dest_lat = float(dest_lat)
        dest_lng = float(dest_lng)
    except (ValueError, TypeError):
        return None

    if not (-90 <= start_lat <= 90 and -180 <= start_lng <= 180 and -90 <= dest_lat <= 90 and -180 <= dest_lng <= 180):
        return None

    # Check cache (10 minutes TTL)
    cache_key = f"osrm_route_{round(start_lat, 4)}_{round(start_lng, 4)}_{round(dest_lat, 4)}_{round(dest_lng, 4)}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    # Attempt Tier 1: Geoapify Scooter Routing API if key is configured
    from django.conf import settings
    geo_key = getattr(settings, 'GEOAPIFY_API_KEY', '').strip()
    if geo_key:
        geo_url = (
            f"https://api.geoapify.com/v1/routing"
            f"?waypoints={start_lat:.6f},{start_lng:.6f}|{dest_lat:.6f},{dest_lng:.6f}"
            f"&mode=scooter&apiKey={geo_key}"
        )
        try:
            req = urllib.request.Request(geo_url, headers={'User-Agent': 'DoorDrape-Routing/1.0', 'Accept': 'application/json'})
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                gdata = json.loads(resp.read().decode('utf-8'))
            if gdata.get('features'):
                feat = gdata['features'][0]
                props = feat.get('properties', {})
                geom = feat.get('geometry', {})
                raw_meters = float(props.get('distance', 0.0))
                raw_seconds = float(props.get('time', 0.0))
                dist_km = round(raw_meters / 1000.0, 2)
                scooter_duration_mins = max(1, int(round((raw_seconds * TRAFFIC_MULTIPLIER) / 60.0 + GATE_ENTRY_BUFFER_MINS)))

                coords_raw = geom.get('coordinates', [])
                polyline = []
                if geom.get('type') == 'MultiLineString':
                    for part in coords_raw:
                        for pt in part:
                            if len(pt) >= 2:
                                polyline.append([round(pt[1], 6), round(pt[0], 6)])
                elif geom.get('type') == 'LineString':
                    for pt in coords_raw:
                        if len(pt) >= 2:
                            polyline.append([round(pt[1], 6), round(pt[0], 6)])

                if not polyline:
                    polyline = [[start_lat, start_lng], [dest_lat, dest_lng]]

                now = timezone.now()
                arrival_time = now + timedelta(minutes=scooter_duration_mins)

                result = {
                    'distance_km': dist_km,
                    'duration_minutes': scooter_duration_mins,
                    'eta_display': f"~{scooter_duration_mins} mins ({dist_km} km)",
                    'estimated_arrival_iso': arrival_time.isoformat(),
                    'estimated_arrival_formatted': arrival_time.strftime('%I:%M %p').lstrip('0'),
                    'route_polyline': polyline,
                    'routing_engine': 'Geoapify Scooter Routing API',
                    'is_fallback': False
                }
                cache.set(cache_key, result, 600)
                return result
        except Exception as exc:
            logger.warning('Geoapify routing failed, falling back to OSRM: %s', exc)

    # Attempt Tier 2: OSRM turn-by-turn routing
    osrm_url = (
        f"http://router.project-osrm.org/route/v1/driving/"
        f"{start_lng:.6f},{start_lat:.6f};{dest_lng:.6f},{dest_lat:.6f}"
        f"?overview=full&geometries=geojson"
    )

    try:
        req = urllib.request.Request(osrm_url, headers={'User-Agent': 'DoorDrape-Routing/1.0'})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode('utf-8'))

        if data.get('code') == 'Ok' and data.get('routes'):
            route = data['routes'][0]
            raw_meters = float(route.get('distance', 0.0))
            raw_seconds = float(route.get('duration', 0.0))

            dist_km = round(raw_meters / 1000.0, 2)
            scooter_duration_mins = max(1, int(round((raw_seconds * TRAFFIC_MULTIPLIER) / 60.0 + GATE_ENTRY_BUFFER_MINS)))

            # Invert GeoJSON [lng, lat] coordinates to Leaflet [lat, lng]
            raw_coords = route.get('geometry', {}).get('coordinates', [])
            polyline = [[round(pt[1], 6), round(pt[0], 6)] for pt in raw_coords if len(pt) >= 2]
            if not polyline:
                polyline = [[start_lat, start_lng], [dest_lat, dest_lng]]

            now = timezone.now()
            arrival_time = now + timedelta(minutes=scooter_duration_mins)

            result = {
                'distance_km': dist_km,
                'duration_minutes': scooter_duration_mins,
                'eta_display': f"~{scooter_duration_mins} mins ({dist_km} km)",
                'estimated_arrival_iso': arrival_time.isoformat(),
                'estimated_arrival_formatted': arrival_time.strftime('%I:%M %p').lstrip('0'),
                'route_polyline': polyline,
                'routing_engine': 'OSRM Turn-by-Turn Road Route',
                'is_fallback': False
            }
            cache.set(cache_key, result, 600)
            return result
    except Exception as exc:
        logger.warning('OSRM route lookup failed, switching to scooter estimation fallback: %s', exc)

    # Fallback to Road-Adjusted Haversine Model
    hav_km = haversine_km(start_lat, start_lng, dest_lat, dest_lng)
    est_road_km = round(hav_km * ROAD_DETOUR_FACTOR, 2)
    est_travel_mins = (est_road_km / SCOOTER_AVG_SPEED_KMH) * 60.0
    scooter_duration_mins = max(1, int(round(est_travel_mins * TRAFFIC_MULTIPLIER + GATE_ENTRY_BUFFER_MINS)))

    now = timezone.now()
    arrival_time = now + timedelta(minutes=scooter_duration_mins)
    polyline = [[start_lat, start_lng], [dest_lat, dest_lng]]

    fallback_result = {
        'distance_km': est_road_km,
        'duration_minutes': scooter_duration_mins,
        'eta_display': f"~{scooter_duration_mins} mins ({est_road_km} km est.)",
        'estimated_arrival_iso': arrival_time.isoformat(),
        'estimated_arrival_formatted': arrival_time.strftime('%I:%M %p').lstrip('0'),
        'route_polyline': polyline,
        'routing_engine': 'Scooter Road Estimator (Fallback)',
        'is_fallback': True
    }
    return fallback_result


def optimize_batch_tsp(start_lat, start_lng, stops, start_time=None, timeout=4.5):
    """
    Optimizes a delivery batch route for up to 3 trial bags (or more) starting from rider/hub location.
    Uses OSRM Trip API (TSP solver) with automated fallback to 2-Opt / Nearest-Neighbor heuristic.
    Calculates per-stop arrival times incorporating the mandatory 15-minute doorstep trial slot.
    Validates whether each stop arrival satisfies the customer's booked delivery slot.
    """
    try:
        start_lat = float(start_lat)
        start_lng = float(start_lng)
    except (ValueError, TypeError):
        return None

    if not stops:
        return {
            'order_sequence': [],
            'waypoints': [],
            'total_distance_km': 0.0,
            'estimated_duration_minutes': 0,
            'driving_duration_minutes': 0,
            'total_trial_minutes': 0,
            'stops_count': 0,
            'route_polyline': [],
            'routing_engine': 'Empty',
            'skipped_orders': [],
            'is_fallback': False
        }

    now = start_time or timezone.now()

    # Filter stops with valid coordinates
    valid_stops = []
    skipped_orders = []
    for s in stops:
        try:
            slat = float(s.get('latitude'))
            slng = float(s.get('longitude'))
            if -90 <= slat <= 90 and -180 <= slng <= 180:
                valid_stops.append({
                    'order_id': s.get('order_id'),
                    'assignment_id': s.get('assignment_id'),
                    'address': s.get('address') or '',
                    'delivery_slot': s.get('delivery_slot') or '',
                    'latitude': slat,
                    'longitude': slng,
                })
            else:
                skipped_orders.append({'order_id': s.get('order_id'), 'reason': 'out_of_bounds_coordinates'})
        except (ValueError, TypeError):
            skipped_orders.append({'order_id': s.get('order_id'), 'reason': 'missing_or_invalid_coordinates'})

    if not valid_stops:
        return {
            'order_sequence': [],
            'waypoints': [],
            'total_distance_km': 0.0,
            'estimated_duration_minutes': 0,
            'driving_duration_minutes': 0,
            'total_trial_minutes': 0,
            'stops_count': 0,
            'route_polyline': [],
            'routing_engine': 'No Valid Stops',
            'skipped_orders': skipped_orders,
            'is_fallback': False
        }

    # Attempt OSRM Trip API (Traveling Salesperson Route Optimization)
    coords_list = [f"{start_lng:.6f},{start_lat:.6f}"]
    for s in valid_stops:
        coords_list.append(f"{s['longitude']:.6f},{s['latitude']:.6f}")

    osrm_trip_url = (
        f"http://router.project-osrm.org/trip/v1/driving/{';'.join(coords_list)}"
        f"?source=first&roundtrip=false&overview=full&geometries=geojson"
    )

    try:
        req = urllib.request.Request(osrm_trip_url, headers={'User-Agent': 'DoorDrape-TSP/1.0'})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode('utf-8'))

        if data.get('code') == 'Ok' and data.get('trips') and data.get('waypoints'):
            trip = data['trips'][0]
            osrm_waypoints = data['waypoints']
            legs = trip.get('legs', [])

            # Map input stops to their visited sequence rank
            ordered_indices = []
            for idx, stop in enumerate(valid_stops):
                wp = osrm_waypoints[idx + 1]
                visit_rank = wp.get('waypoint_index', idx + 1)
                ordered_indices.append((visit_rank, stop))

            ordered_indices.sort(key=lambda item: item[0])
            sorted_stops = [item[1] for item in ordered_indices]

            # Invert GeoJSON coordinates for Leaflet
            raw_trip_coords = trip.get('geometry', {}).get('coordinates', [])
            full_polyline = [[round(pt[1], 6), round(pt[0], 6)] for pt in raw_trip_coords if len(pt) >= 2]

            # Build timeline with 15-minute trial slots
            curr_cursor = now
            waypoints = []
            order_sequence = []
            cumulative_driving_mins = 0
            total_trial_mins = 0

            for stop_num, stop in enumerate(sorted_stops, start=1):
                leg_idx = stop_num - 1
                leg = legs[leg_idx] if leg_idx < len(legs) else {}
                leg_distance_km = round(float(leg.get('distance', 0.0)) / 1000.0, 2)
                raw_leg_secs = float(leg.get('duration', 0.0))
                leg_driving_mins = max(1, int(round((raw_leg_secs * TRAFFIC_MULTIPLIER) / 60.0 + GATE_ENTRY_BUFFER_MINS)))
                cumulative_driving_mins += leg_driving_mins

                arrival_dt = curr_cursor + timedelta(minutes=leg_driving_mins)
                trial_start_dt = arrival_dt
                trial_end_dt = trial_start_dt + timedelta(minutes=DOORDRAPE_TRIAL_DURATION_MINS)
                total_trial_mins += DOORDRAPE_TRIAL_DURATION_MINS
                curr_cursor = trial_end_dt

                # Slot verification
                slot_start, slot_end = parse_slot_time_range(stop['delivery_slot'], timezone.localdate(now))
                fits_slot = True
                slot_status = 'On Time'
                if slot_end:
                    if arrival_dt > slot_end + timedelta(minutes=15):
                        fits_slot = False
                        slot_status = 'Delayed'
                    elif slot_start and arrival_dt < slot_start:
                        slot_status = 'Early / Scheduled Ahead'
                    else:
                        slot_status = 'On Time'

                order_sequence.append(stop['order_id'])
                waypoints.append({
                    'stop_number': stop_num,
                    'order_id': stop['order_id'],
                    'assignment_id': stop.get('assignment_id'),
                    'address': stop['address'],
                    'delivery_slot': stop['delivery_slot'],
                    'latitude': stop['latitude'],
                    'longitude': stop['longitude'],
                    'leg_distance_km': leg_distance_km,
                    'driving_duration_minutes': leg_driving_mins,
                    'estimated_arrival_minutes': int(round((arrival_dt - now).total_seconds() / 60.0)),
                    'estimated_arrival_iso': arrival_dt.isoformat(),
                    'estimated_arrival_time': arrival_dt.strftime('%I:%M %p').lstrip('0'),
                    'trial_window': f"{trial_start_dt.strftime('%I:%M %p').lstrip('0')} - {trial_end_dt.strftime('%I:%M %p').lstrip('0')} (15m Trial)",
                    'fits_booked_slot': fits_slot,
                    'slot_status': slot_status
                })

            total_trip_dist = round(float(trip.get('distance', 0.0)) / 1000.0, 2)
            total_elapsed_mins = int(round((curr_cursor - now).total_seconds() / 60.0))

            return {
                'order_sequence': order_sequence,
                'waypoints': waypoints,
                'total_distance_km': total_trip_dist,
                'estimated_duration_minutes': total_elapsed_mins,
                'driving_duration_minutes': cumulative_driving_mins,
                'total_trial_minutes': total_trial_mins,
                'stops_count': len(order_sequence),
                'route_polyline': full_polyline,
                'routing_engine': 'OSRM Traveling Salesperson Loop',
                'skipped_orders': skipped_orders,
                'is_fallback': False
            }
    except Exception as exc:
        logger.warning('OSRM Trip TSP failed, switching to Nearest-Neighbor fallback: %s', exc)

    # Nearest-Neighbor TSP Heuristic Fallback
    unvisited = list(valid_stops)
    curr_lat, curr_lng = start_lat, start_lng
    curr_cursor = now
    waypoints = []
    order_sequence = []
    total_dist = 0.0
    cumulative_driving_mins = 0
    total_trial_mins = 0
    fallback_polyline = [[start_lat, start_lng]]

    stop_num = 1
    while unvisited:
        best_idx = 0
        best_dist = float('inf')
        for idx, s in enumerate(unvisited):
            dist = haversine_km(curr_lat, curr_lng, s['latitude'], s['longitude'])
            if dist < best_dist:
                best_dist = dist
                best_idx = idx

        chosen = unvisited.pop(best_idx)
        leg_road_dist = round(best_dist * ROAD_DETOUR_FACTOR, 2)
        total_dist += leg_road_dist

        leg_driving_mins = max(1, int(round((leg_road_dist / SCOOTER_AVG_SPEED_KMH) * 60.0 * TRAFFIC_MULTIPLIER + GATE_ENTRY_BUFFER_MINS)))
        cumulative_driving_mins += leg_driving_mins

        arrival_dt = curr_cursor + timedelta(minutes=leg_driving_mins)
        trial_start_dt = arrival_dt
        trial_end_dt = trial_start_dt + timedelta(minutes=DOORDRAPE_TRIAL_DURATION_MINS)
        total_trial_mins += DOORDRAPE_TRIAL_DURATION_MINS
        curr_cursor = trial_end_dt

        slot_start, slot_end = parse_slot_time_range(chosen['delivery_slot'], timezone.localdate(now))
        fits_slot = True
        slot_status = 'On Time'
        if slot_end:
            if arrival_dt > slot_end + timedelta(minutes=15):
                fits_slot = False
                slot_status = 'Delayed'
            elif slot_start and arrival_dt < slot_start:
                slot_status = 'Early / Scheduled Ahead'
            else:
                slot_status = 'On Time'

        order_sequence.append(chosen['order_id'])
        waypoints.append({
            'stop_number': stop_num,
            'order_id': chosen['order_id'],
            'assignment_id': chosen.get('assignment_id'),
            'address': chosen['address'],
            'delivery_slot': chosen['delivery_slot'],
            'latitude': chosen['latitude'],
            'longitude': chosen['longitude'],
            'leg_distance_km': leg_road_dist,
            'driving_duration_minutes': leg_driving_mins,
            'estimated_arrival_minutes': int(round((arrival_dt - now).total_seconds() / 60.0)),
            'estimated_arrival_iso': arrival_dt.isoformat(),
            'estimated_arrival_time': arrival_dt.strftime('%I:%M %p').lstrip('0'),
            'trial_window': f"{trial_start_dt.strftime('%I:%M %p').lstrip('0')} - {trial_end_dt.strftime('%I:%M %p').lstrip('0')} (15m Trial)",
            'fits_booked_slot': fits_slot,
            'slot_status': slot_status
        })

        fallback_polyline.append([chosen['latitude'], chosen['longitude']])
        curr_lat, curr_lng = chosen['latitude'], chosen['longitude']
        stop_num += 1

    total_elapsed_mins = int(round((curr_cursor - now).total_seconds() / 60.0))

    return {
        'order_sequence': order_sequence,
        'waypoints': waypoints,
        'total_distance_km': round(total_dist, 2),
        'estimated_duration_minutes': total_elapsed_mins,
        'driving_duration_minutes': cumulative_driving_mins,
        'total_trial_minutes': total_trial_mins,
        'stops_count': len(order_sequence),
        'route_polyline': fallback_polyline,
        'routing_engine': 'Nearest-Neighbor Heuristic (Fallback)',
        'skipped_orders': skipped_orders,
        'is_fallback': True
    }
