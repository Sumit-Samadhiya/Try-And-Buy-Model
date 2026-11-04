from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock
import json
from django.test import SimpleTestCase, override_settings
from django.core.cache import cache
from django.utils import timezone
from .routing_service import optimize_batch_tsp, get_road_route

@override_settings(TIME_ZONE='Asia/Kolkata', USE_TZ=True, GEOAPIFY_API_KEY='')
class RoutePlanningTests(SimpleTestCase):
    def setUp(self):
        cache.clear()
        self.start = timezone.make_aware(datetime(2026, 11, 4, 15, 0))
        self.stop = {'order_id':'A', 'latitude':25.5, 'longitude':78.6, 'delivery_slot':'4:00 PM - 5:00 PM', 'scheduled_date':'2026-11-04'}

    @patch('sevenshadesapp.routing_service.urllib.request.urlopen', side_effect=TimeoutError)
    def test_waits_until_booked_slot_and_counts_trial_and_return(self, fetch):
        result = optimize_batch_tsp(25.49, 78.59, [self.stop], self.start)
        wp = result['waypoints'][0]
        self.assertGreater(wp['waiting_minutes'], 0)
        self.assertEqual(datetime.fromisoformat(wp['trial_start_iso']).hour, 16)
        self.assertTrue(wp['fits_booked_slot'])
        self.assertTrue(result['is_fallback'])
        self.assertGreater(result['return_minutes'], 0)
        self.assertEqual(result['estimated_duration_minutes'], result['driving_duration_minutes'] + result['waiting_minutes'] + 15)

    @patch('sevenshadesapp.routing_service.urllib.request.urlopen', side_effect=TimeoutError)
    def test_trial_must_finish_inside_window(self, fetch):
        result = optimize_batch_tsp(25.49, 78.59, [self.stop], self.start + timedelta(hours=1, minutes=50))
        self.assertFalse(result['fits_all_slots'])
        self.assertFalse(result['waypoints'][0]['fits_booked_slot'])

    @patch('sevenshadesapp.routing_service.urllib.request.urlopen')
    def test_road_matrix_uses_shortest_feasible_loop(self, fetch):
        response = MagicMock()
        response.read.return_value = json.dumps({'code':'Ok', 'durations':[[0,60,120],[120,0,60],[60,120,0]], 'distances':[[0,100,500],[500,0,100],[100,500,0]]}).encode()
        fetch.return_value.__enter__.return_value = response
        other = {**self.stop, 'order_id':'B', 'latitude':25.51}
        result = optimize_batch_tsp(25.49,78.59,[self.stop,other], self.start)
        self.assertEqual(result['order_sequence'], ['A','B'])
        self.assertEqual(result['total_distance_km'], .3)
        self.assertEqual(result['total_trial_minutes'], 30)
        self.assertFalse(result['is_fallback'])

    @patch('sevenshadesapp.routing_service.urllib.request.urlopen', side_effect=TimeoutError)
    def test_cached_route_recalculates_arrival(self, fetch):
        with patch('sevenshadesapp.routing_service.timezone.now', return_value=self.start):
            first = get_road_route(25.4,78.5,25.5,78.6)
        with patch('sevenshadesapp.routing_service.timezone.now', return_value=self.start+timedelta(minutes=2)):
            second = get_road_route(25.4,78.5,25.5,78.6)
        self.assertEqual(datetime.fromisoformat(second['estimated_arrival_iso'])-datetime.fromisoformat(first['estimated_arrival_iso']),timedelta(minutes=2))

    def test_capacity_and_invalid_start_rejected(self):
        self.assertIsNone(optimize_batch_tsp(25.4,78.5,[self.stop]*4))
        self.assertIsNone(optimize_batch_tsp(float('nan'),78.5,[self.stop]))

class RoutePrivacyTests(SimpleTestCase):
    def test_anonymous_cannot_resolve_order_or_rider_ids(self):
        from rest_framework.test import APIRequestFactory
        from .location_views import RouteETA
        request = APIRequestFactory().post('/api/route_eta', {'order_id':'someone-else'}, format='json')
        request.account = None
        request.account_role = None
        self.assertEqual(RouteETA(request).status_code, 401)

    @patch('sevenshadesapp.location_views.TryOrder.objects.filter')
    @patch('sevenshadesapp.location_views.owns_order', return_value=False)
    def test_unrelated_customer_cannot_resolve_order(self, owns, orders):
        from rest_framework.test import APIRequestFactory
        from .location_views import RouteETA
        orders.return_value.first.return_value = object()
        request = APIRequestFactory().post('/api/route_eta', {'order_id':'someone-else'}, format='json')
        request.account = object()
        request.account_role = 'customer'
        self.assertEqual(RouteETA(request).status_code, 403)

class BatchCapacityTests(SimpleTestCase):
    @patch('sevenshadesapp.delivery_workflow.DeliveryAssignment.objects.filter')
    @patch('sevenshadesapp.delivery_workflow.active_rider')
    def test_full_rider_cannot_receive_more_bags(self, rider, assignments):
        from .delivery_workflow import generate_batches
        from .inventory_workflow import InventoryError
        assignments.return_value.exclude.return_value.exclude.return_value.count.return_value = 3
        with self.assertRaises(InventoryError):
            generate_batches.__wrapped__('rider', max_orders=99)
