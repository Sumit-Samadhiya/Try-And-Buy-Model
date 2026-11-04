import json
import logging
import math
import urllib.request
from datetime import datetime, timedelta, time, date
from itertools import permutations
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
        return fresh_arrival(cached)

    # Attempt Tier 1: Geoapify Scooter Routing API if key is configured
    from django.conf import settings
    geo_key = getattr(settings, 'GEOAPIFY_API_KEY', '').strip()
    if geo_key:
        geo_url = (
            f"https://api.geoapify.com/v1/routing"
            f"?waypoints={start_lat:.6f},{start_lng:.6f}|{dest_lat:.6f},{dest_lng:.6f}"
            f"&mode=drive&apiKey={geo_key}"
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
                    'routing_engine': 'Geoapify driving estimate',
                    'is_fallback': False
                }
                cache.set(cache_key, result, 600)
                return fresh_arrival(result)
        except Exception as exc:
            logger.warning('Geoapify routing unavailable (%s)', type(exc).__name__)

    # Attempt Tier 2: OSRM turn-by-turn routing
    osrm_url = (
        f"https://router.project-osrm.org/route/v1/driving/"
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
                'routing_engine': 'OSRM driving estimate',
                'is_fallback': False
            }
            cache.set(cache_key, result, 600)
            return fresh_arrival(result)
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
    cache.set(cache_key, fallback_result, 30)
    return fresh_arrival(fallback_result)


def fresh_arrival(route):
    result = dict(route)
    arrival = timezone.localtime(timezone.now() + timedelta(minutes=result['duration_minutes']))
    result.update(estimated_arrival_iso=arrival.isoformat(), estimated_arrival_formatted=arrival.strftime('%I:%M %p').lstrip('0'), live_traffic=False)
    return result


def optimize_batch_tsp(start_lat, start_lng, stops, start_time=None, timeout=3):
    """Enumerate up to six 3-bag loops, preferring feasible appointment windows."""
    try:
        origin = (float(start_lat), float(start_lng))
        if not all(math.isfinite(v) for v in origin) or abs(origin[0]) > 90 or abs(origin[1]) > 180:
            return None
    except (TypeError, ValueError):
        return None
    # Existing larger batches must be split explicitly, never silently dropped.
    if len(stops) > 3:
        return None
    now = start_time or timezone.now()
    valid, skipped = [], []
    for stop in stops:
        try:
            lat, lon = float(stop['latitude']), float(stop['longitude'])
            if not math.isfinite(lat + lon) or abs(lat) > 90 or abs(lon) > 180:
                raise ValueError()
            valid.append({**stop, 'latitude': lat, 'longitude': lon})
        except (KeyError, TypeError, ValueError):
            skipped.append({'order_id': stop.get('order_id'), 'reason': 'missing_or_invalid_coordinates'})
    points = [origin] + [(s['latitude'], s['longitude']) for s in valid]
    coords = ';'.join(f'{lon:.6f},{lat:.6f}' for lat, lon in points)
    n = len(points)
    durations = distances = None
    fallback = True
    if valid:
        try:
            req = urllib.request.Request(f'https://router.project-osrm.org/table/v1/driving/{coords}?annotations=duration,distance', headers={'User-Agent': 'DoorDrape/1.0'})
            with urllib.request.urlopen(req, timeout=timeout) as response:
                data = json.loads(response.read(500000))
            durations, distances = data['durations'], data['distances']
            if data.get('code') != 'Ok' or any(len(m) != n or any(len(row) != n for row in m) for m in (durations, distances)):
                raise ValueError('Invalid matrix')
            # Null means unreachable, not zero travel time.
            if any(v is None or not math.isfinite(v) or v < 0 for m in (durations, distances) for row in m for v in row):
                raise ValueError('Incomplete road matrix')
            fallback = False
        except (OSError, KeyError, ValueError, TypeError):
            distances = [[haversine_km(*a, *b) * ROAD_DETOUR_FACTOR * 1000 for b in points] for a in points]
            durations = [[d / 1000 / SCOOTER_AVG_SPEED_KMH * 3600 for d in row] for row in distances]
    else:
        distances = durations = [[0]]

    def timeline(sequence):
        cursor, previous, driving, waiting, distance = now, 0, 0, 0, 0
        waypoints, late, unknown = [], 0, 0
        for number, index in enumerate(sequence, 1):
            stop = valid[index - 1]
            minutes = math.ceil(durations[previous][index] * TRAFFIC_MULTIPLIER / 60) + GATE_ENTRY_BUFFER_MINS
            distance += distances[previous][index]
            driving += minutes
            arrival = cursor + timedelta(minutes=minutes)
            scheduled = stop.get('scheduled_date') or timezone.localdate(now)
            try:
                if isinstance(scheduled, str): scheduled = date.fromisoformat(scheduled)
                slot_start, slot_end = parse_slot_time_range(stop.get('delivery_slot'), scheduled)
            except (ValueError, TypeError):
                slot_start = slot_end = None
            trial_start = max(arrival, slot_start) if slot_start else arrival
            trial_end = trial_start + timedelta(minutes=15)
            wait = math.ceil((trial_start - arrival).total_seconds() / 60)
            waiting += wait
            fits = trial_end <= slot_end if slot_end else None
            late += int(fits is False)
            unknown += int(fits is None)
            local_start, local_end = timezone.localtime(trial_start), timezone.localtime(trial_end)
            waypoints.append({**stop, 'stop_number': number, 'leg_distance_km': round(distances[previous][index] / 1000, 2),
                'driving_duration_minutes': minutes, 'waiting_minutes': wait,
                'estimated_arrival_minutes': math.ceil((arrival - now).total_seconds() / 60),
                'estimated_arrival_iso': arrival.isoformat(), 'estimated_arrival_time': timezone.localtime(arrival).strftime('%d %b, %I:%M %p'),
                'trial_start_iso': trial_start.isoformat(), 'trial_end_iso': trial_end.isoformat(),
                'trial_window': f"{local_start.strftime('%d %b, %I:%M %p')} - {local_end.strftime('%I:%M %p')} (15m Trial)",
                'fits_booked_slot': fits, 'slot_status': 'Slot unknown' if fits is None else 'Reschedule needed' if not fits else 'Wait for slot' if wait else 'Within slot'})
            cursor, previous = trial_end, index
        # Complete loop back to the actual starting point.
        back = math.ceil(durations[previous][0] * TRAFFIC_MULTIPLIER / 60) if sequence else 0
        driving += back
        distance += distances[previous][0]
        elapsed = math.ceil((cursor - now).total_seconds() / 60) + back
        return (late, unknown, distance, elapsed), waypoints, driving, waiting, back

    candidates = [timeline(seq) for seq in permutations(range(1, n))]
    score, waypoints, driving, waiting, back = min(candidates, key=lambda row: row[0])
    return {'order_sequence': [wp['order_id'] for wp in waypoints], 'waypoints': waypoints,
        'total_distance_km': round(score[2] / 1000, 2), 'estimated_duration_minutes': score[3],
        'driving_duration_minutes': driving, 'waiting_minutes': waiting, 'return_minutes': back,
        'total_trial_minutes': 15 * len(valid), 'stops_count': len(valid), 'route_polyline': [],
        'routing_engine': 'Approximate distance estimate' if fallback else 'OSRM road matrix',
        'is_fallback': fallback, 'live_traffic': False, 'roundtrip': True,
        'fits_all_slots': score[0] == 0 and score[1] == 0 and not skipped,
        'skipped_orders': skipped}
