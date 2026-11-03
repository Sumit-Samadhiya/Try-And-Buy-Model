from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from .models import SignUp, AdminLogin, DeliveryRider, DeliveryBatch, TryOrder
from .delivery_workflow import attach
from .routing_service import haversine_km, parse_slot_time_range, get_road_route, optimize_batch_tsp


class RoutingServiceUnitTests(TestCase):
    def test_haversine_distance(self):
        # Sadar Bazar to Baragaon (~14 km straight line)
        dist = haversine_km(25.4484, 78.5786, 25.5184, 78.6821)
        self.assertGreater(dist, 10.0)
        self.assertLess(dist, 20.0)
        # Identical point is 0
        self.assertEqual(haversine_km(25.4484, 78.5786, 25.4484, 78.5786), 0.0)
        # None points handled safely
        self.assertEqual(haversine_km(None, 78.5786, 25.4484, None), 0.0)

    def test_parse_slot_time_range(self):
        s1, e1 = parse_slot_time_range('10:00 AM - 02:00 PM')
        self.assertIsNotNone(s1)
        self.assertIsNotNone(e1)
        self.assertGreater(e1, s1)

        s2, e2 = parse_slot_time_range('4:00 PM - 5:00 PM')
        self.assertIsNotNone(s2)
        self.assertIsNotNone(e2)
        self.assertEqual((e2 - s2).total_seconds() / 3600.0, 1.0)

        s3, e3 = parse_slot_time_range('Evening')
        self.assertIsNotNone(s3)
        self.assertIsNotNone(e3)

        s_bad, e_bad = parse_slot_time_range('Invalid Slot')
        self.assertIsNone(s_bad)
        self.assertIsNone(e_bad)

    def test_get_road_route_live_or_fallback(self):
        route = get_road_route(25.4484, 78.5786, 25.5184, 78.6821)
        self.assertIsNotNone(route)
        self.assertGreater(route['distance_km'], 5.0)
        self.assertGreater(route['duration_minutes'], 5)
        self.assertIn('mins', route['eta_display'])
        self.assertGreaterEqual(len(route['route_polyline']), 2)
        self.assertIn('routing_engine', route)

    def test_optimize_batch_tsp_three_bags(self):
        stops = [
            {'order_id': 'BAG_1', 'latitude': 25.5184, 'longitude': 78.6821, 'address': 'Baragaon', 'delivery_slot': '04:00 PM - 05:00 PM'},
            {'order_id': 'BAG_2', 'latitude': 25.4300, 'longitude': 78.5500, 'address': 'Sipri Bazar', 'delivery_slot': '04:00 PM - 05:00 PM'},
            {'order_id': 'BAG_3', 'latitude': 25.4550, 'longitude': 78.5800, 'address': 'Medical College', 'delivery_slot': '04:00 PM - 05:00 PM'}
        ]
        res = optimize_batch_tsp(25.4484, 78.5786, stops)
        self.assertEqual(len(res['order_sequence']), 3)
        self.assertGreater(res['total_distance_km'], 0)
        self.assertGreater(res['estimated_duration_minutes'], 45)  # 3 * 15m trials = at least 45 mins total
        self.assertEqual(res['total_trial_minutes'], 45)
        self.assertEqual(len(res['waypoints']), 3)
        for wp in res['waypoints']:
            self.assertIn('trial_window', wp)
            self.assertIn('15m Trial', wp['trial_window'])
            self.assertIn('fits_booked_slot', wp)
            self.assertIn('estimated_arrival_time', wp)


class RouteETAEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = SignUp.objects.create(fname='Simran', mobileno='9888877771', password='hashed_pw_test')
        self.rider = DeliveryRider.objects.create(
            name='Rohit', phone='9888877772', rider_id='RIDER_TEST_1',
            status='Active', latitude=25.4484, longitude=78.5786
        )
        self.order = TryOrder.objects.create(
            order_id='ORD_ROUTE_TEST_1',
            mobileno=self.user,
            latitude=25.5184,
            longitude=78.6821,
            address_text='Baragaon Gate',
            city='Jhansi',
            postcode='284121',
            delivery_slot='04:00 PM - 05:00 PM'
        )

    def test_route_eta_with_coordinates(self):
        res = self.client.post('/api/route_eta', {
            'start_lat': 25.4484,
            'start_lng': 78.5786,
            'dest_lat': 25.5184,
            'dest_lng': 78.6821
        }, format='json')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data['status'])
        self.assertGreater(data['data']['distance_km'], 0)
        self.assertGreater(data['data']['duration_minutes'], 0)
        self.assertGreaterEqual(len(data['data']['route_polyline']), 2)

    def test_route_eta_with_rider_and_order_ids(self):
        res = self.client.post('/api/route_eta', {
            'rider_id': self.rider.rider_id,
            'order_id': self.order.order_id
        }, format='json')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data['status'])
        self.assertGreater(data['data']['distance_km'], 0)
        self.assertIn('route_polyline', data['data'])

    def test_route_eta_missing_coordinates(self):
        res = self.client.post('/api/route_eta', {}, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertFalse(res.json()['status'])

