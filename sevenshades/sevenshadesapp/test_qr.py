from django.test import TestCase
from rest_framework.test import APIClient
from sevenshadesapp.models import SignUp, TryOrder, FinalOrder, TryOrderItem, ProductDetails, Product, MainCategory, MySubCategory, Brands
from sevenshadesapp.qr_service import build_upi_intent_uri, generate_qr_image_url, generate_payment_qr, generate_tag_qr


class QrServiceTests(TestCase):
    def test_build_upi_intent_uri(self):
        uri = build_upi_intent_uri(vpa='test@upi', payee_name='DoorDrape', amount=1499, order_id='TRL-101', note='Test Note')
        self.assertTrue(uri.startswith('upi://pay?'))
        self.assertIn('pa=test%40upi', uri)
        self.assertIn('pn=DoorDrape', uri)
        self.assertIn('am=1499.00', uri)
        self.assertIn('tr=TRL-101', uri)
        self.assertIn('cu=INR', uri)

    def test_generate_qr_image_url(self):
        url = generate_qr_image_url('HELLO-DOORDRAPE', size='200x200', color='064e3b')
        self.assertTrue(url.startswith('https://api.qrserver.com/v1/create-qr-code/'))
        self.assertIn('size=200x200', url)
        self.assertIn('color=064e3b', url)
        self.assertIn('data=HELLO-DOORDRAPE', url)

    def test_generate_payment_qr(self):
        result = generate_payment_qr('ORD-999', 499.50)
        self.assertEqual(result['order_id'], 'ORD-999')
        self.assertEqual(result['amount'], 499.50)
        self.assertTrue(result['upi_uri'].startswith('upi://pay?'))
        self.assertTrue(result['qr_image_url'].startswith('https://api.qrserver.com/'))

    def test_generate_tag_qr(self):
        result = generate_tag_qr('TAG-TRY-ABC123', order_id='ORD-1', product_name='Red Dress')
        self.assertEqual(result['tag_code'], 'TAG-TRY-ABC123')
        self.assertIn('TAG-TRY-ABC123', result['qr_image_url'])


class QrApiEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = SignUp.objects.create(mobileno='9876543210', fname='John', lname='Doe', emailid='john@example.com', password='secretpassword')
        self.order = TryOrder.objects.create(order_id='TRL-TEST-QR-1', mobileno='9876543210', postcode='110001', try_fee=49)

    def test_generate_qr_payment_endpoint(self):
        response = self.client.get('/api/generate_qr?type=payment&order_id=TRL-TEST-QR-1&amount=999')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['status'])
        self.assertEqual(data['data']['order_id'], 'TRL-TEST-QR-1')
        self.assertEqual(data['data']['amount'], 999.0)
        self.assertTrue(data['data']['qr_image_url'].startswith('https://api.qrserver.com/'))

    def test_generate_qr_tag_endpoint(self):
        response = self.client.post('/api/generate_qr', {'type': 'tag', 'tag_code': 'TAG-SEC-999', 'order_id': 'TRL-TEST-QR-1'}, format='json')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['status'])
        self.assertEqual(data['data']['tag_code'], 'TAG-SEC-999')
        self.assertTrue(data['data']['qr_image_url'].startswith('https://api.qrserver.com/'))

    def test_generate_qr_custom_endpoint(self):
        response = self.client.get('/api/generate_qr?type=custom&payload=https://doordrape.com')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['status'])
        self.assertIn('https%3A%2F%2Fdoordrape.com', data['data']['qr_image_url'])

    def test_generate_qr_invalid_type(self):
        response = self.client.get('/api/generate_qr?type=unknown')
        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.json()['status'])
