"""Optional address assistance. Provider failure must never gate checkout."""
import hashlib
import json
import math
import os
import urllib.error
import urllib.parse
import urllib.request

from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse
from django.utils.crypto import salted_hmac
from rest_framework.decorators import api_view


def unavailable():
    return {'status': False, 'available': False, 'results': [],
            'message': 'Address suggestions are unavailable. You can still enter your address manually.'}


def lookup(mode, params):
    key = getattr(settings, 'GEOAPIFY_API_KEY', os.environ.get('GEOAPIFY_API_KEY', '')).strip()
    if not key:
        return unavailable()
    # HMAC avoids retaining raw address searches in cache keys; short-lived results only.
    namespace = hashlib.sha256(key.encode()).hexdigest()[:12]
    identity = salted_hmac('geocoding', json.dumps([mode, params], sort_keys=True)).hexdigest()
    cache_key = f'geo:{namespace}:{identity}'
    breaker_key = f'geo:{namespace}:cooldown'
    cached = cache.get(cache_key)
    if cached is not None:
        return cached
    if cache.get(breaker_key):
        return unavailable()
    # Best-effort shared-cache concurrency limit; use Redis for multi-worker deployments.
    if not cache.add(f'geo:{namespace}:request-slot', True, 1):
        return unavailable()
    query = urllib.parse.urlencode({**params, 'apiKey': key, 'format': 'json', 'lang': 'en'})
    request = urllib.request.Request(
        f'https://api.geoapify.com/v1/geocode/{mode}?{query}',
        headers={'Accept': 'application/json', 'User-Agent': 'DoorDrape/1.0'})
    try:
        with urllib.request.urlopen(request, timeout=3) as response:
            payload = json.loads(response.read(256000))
        results = []
        for row in payload.get('results', [])[:5]:
            lat, lon = row.get('lat'), row.get('lon')
            if (type(lat) not in (int, float) or type(lon) not in (int, float)
                    or not math.isfinite(lat) or not math.isfinite(lon)
                    or abs(lat) > 90 or abs(lon) > 180):
                continue
            results.append({
                'latitude': lat, 'longitude': lon,
                'city': row.get('city') or row.get('town') or row.get('village') or '',
                'state': row.get('state', ''), 'country': row.get('country', ''),
                'postcode': row.get('postcode', ''),
                'street': ', '.join(filter(None, [row.get('street'), row.get('suburb')])),
                'formattedAddress': row.get('formatted', ''),
            })
        result = {'status': True, 'available': True, 'results': results, 'provider': 'geoapify'}
        cache.set(cache_key, result, 300)
        return result
    except urllib.error.HTTPError as exc:
        cache.set(breaker_key, True, 300 if exc.code in (401, 402, 403, 429) else 30)
    except (OSError, ValueError, TypeError, AttributeError):
        cache.set(breaker_key, True, 30)
    return unavailable()


@api_view(['POST'])
def Geocoding(request):
    """POST avoids putting customer searches/coordinates in access-log URLs."""
    mode = request.data.get('mode')
    if mode == 'autocomplete':
        text = request.data.get('text')
        if not isinstance(text, str) or not 3 <= len(text.strip()) <= 180:
            return JsonResponse({'status': False, 'message': 'Enter 3–180 characters.'}, status=400)
        params = {'text': text.strip(), 'filter': 'countrycode:in', 'limit': 5}
    elif mode == 'reverse':
        lat, lon = request.data.get('latitude'), request.data.get('longitude')
        if (type(lat) not in (int, float) or type(lon) not in (int, float)
                or not math.isfinite(lat) or not math.isfinite(lon)
                or abs(lat) > 90 or abs(lon) > 180):
            return JsonResponse({'status': False, 'message': 'Invalid coordinates.'}, status=400)
        params = {'lat': lat, 'lon': lon, 'limit': 1}
    else:
        return JsonResponse({'status': False, 'message': 'Invalid lookup mode.'}, status=400)
    response = JsonResponse(lookup(mode, params))
    response['Cache-Control'] = 'private, no-store'
    return response
