from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from .models import AdminLogin, SignUp, TryOrder, FinalOrder, SupportTicket, DeliveryRider

PASSWORD='Reports-test-872!'
class AdminWorkspaceTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin=AdminLogin.objects.create(emailid='reports@example.test',mobileno='9000000081',password=PASSWORD)
        cls.customer=SignUp.objects.create(mobileno='9000000082',emailid='customer@example.test',fname='Report',lname='Customer',password=PASSWORD)
        cls.other=SignUp.objects.create(mobileno='9000000083',emailid='other@example.test',password=PASSWORD)
        cls.rider=DeliveryRider.objects.create(rider_id='RDR-TKTTEST',name='Support Rider',phone='9000000085',password=PASSWORD,status='Active')
        cls.order=TryOrder.objects.create(order_id='REPORT1',mobileno=cls.customer.pk,status='DELIVERED',try_fee=49,trial_fee_paid=True,try_payment_mode='razorpay')
        FinalOrder.objects.create(try_order=cls.order,order_id='FREPORT1',items_total=500,wallet_credit=49,final_payable=451,payment_status='paid',payment_mode='cash')
        pending=TryOrder.objects.create(order_id='REPORT2',mobileno=cls.other.pk,status='SELECTION_SUBMITTED')
        FinalOrder.objects.create(try_order=pending,order_id='FREPORT2',items_total=300,final_payable=300,payment_status='pending',payment_mode='cash')
    def post(self,client,endpoint,data):
        token=client.get('/api/auth_csrf').json()['csrfToken']
        return client.post('/api/'+endpoint,data,format='json',HTTP_X_CSRFTOKEN=token)
    def login(self,role='admin',account=None):
        client=APIClient(enforce_csrf_checks=True)
        if role=='admin':
            account=account or self.admin
            endpoint,body='check_admin_login',{'emailid':account.emailid}
        elif role=='rider':
            account=account or self.rider
            endpoint,body='delivery_rider_login',{'phone':account.phone}
        else:
            account=account or self.customer
            endpoint,body='check_costumer_login',{'mobileno':account.pk}
        self.assertEqual(self.post(client,endpoint,dict(body,password=PASSWORD)).status_code,200)
        return client
    def test_sales_totals_filters_and_pagination(self):
        client=self.login()
        data=client.get('/api/admin_sales_report').json()
        self.assertEqual(data['summary']['collected'],500)
        self.assertEqual(data['summary']['outstanding'],300)
        data=client.get('/api/admin_sales_report',{'payment':'paid','q':'Report','page_size':10}).json()
        self.assertEqual(data['total'],1)
        self.assertEqual(data['data'][0]['customer']['email'],'customer@example.test')
        self.assertEqual(client.get('/api/admin_sales_report',{'page':2,'page_size':10}).json()['data'],[])
        self.assertEqual(client.get('/api/admin_sales_report',{'from':'2099-01-01'}).json()['total'],0)
    def test_bad_filters_and_access(self):
        client=self.login()
        for query in ({'from':'bad'},{'from':'2026-02-01','to':'2026-01-01'},{'page':0},{'mode':'fake'},{'page_size':999}):
            self.assertEqual(client.get('/api/admin_sales_report',query).status_code,400)
        customer=self.login('customer')
        for endpoint in ('admin_sales_report','admin_quick_dashboard','admin_tickets'):
            self.assertEqual(customer.get('/api/'+endpoint).status_code,403)
            self.assertEqual(APIClient().get('/api/'+endpoint).status_code,401)
    def test_customer_ticket_visible_to_admin_and_update_returns_to_owner(self):
        customer=self.login('customer')
        result=self.post(customer,'create_ticket',{'subject':'Delivery timing','message':'Please help confirm the delivery time.','status':'Resolved','customer':self.other.pk})
        self.assertEqual(result.status_code,201)
        ticket=result.json()['data']
        self.assertEqual(ticket['customer']['mobile'],self.customer.pk)
        self.assertEqual(ticket['status'],'Open')
        other=self.login('customer',self.other)
        self.assertEqual(other.get('/api/customer_tickets').json()['data'],[])
        admin=self.login()
        rows=admin.get('/api/admin_tickets',{'q':'customer@example.test','status':'Open'}).json()
        self.assertEqual(rows['total'],1)
        payload={'id':ticket['id'],'version':1,'status':'Resolved','priority':'High','response':'Your delivery time is being confirmed.'}
        self.assertEqual(self.post(customer,'admin_ticket_update',payload).status_code,403)
        self.assertEqual(self.post(admin,'admin_ticket_update',payload).status_code,200)
        self.assertEqual(self.post(admin,'admin_ticket_update',payload).status_code,409)
        self.assertEqual(customer.get('/api/customer_tickets').json()['data'][0]['status'],'Resolved')
        self.assertEqual(admin.get('/api/admin_tickets',{'priority':'Urgent'}).json()['total'],0)
    def test_ticket_validation_and_csrf(self):
        customer=self.login('customer')
        self.assertEqual(self.post(customer,'create_ticket',{'subject':'x','message':'short'}).status_code,400)
        self.assertEqual(customer.post('/api/create_ticket',{'subject':'Hello','message':'A real question here.'},format='json').status_code,403)
    def test_dashboard_counts_and_date_scope(self):
        admin=self.login()
        result=admin.get('/api/admin_quick_dashboard').json()['data']
        self.assertEqual((result['orders'],result['completed'],result['collected']),(2,1,500))
        self.assertEqual(admin.get('/api/admin_quick_dashboard',{'from':'2099-01-01'}).json()['data']['orders'],0)
    def test_rider_ticket_lifecycle(self):
        rider=self.login('rider')
        result=self.post(rider,'rider_create_ticket',{'subject':'Route Blockage','message':'Main road is blocked for VIP movement.'})
        self.assertEqual(result.status_code,201)
        ticket=result.json()['data']
        self.assertEqual(ticket['rider']['phone'],self.rider.phone)
        self.assertEqual(ticket['source'],'Rider')
        self.assertEqual(len(rider.get('/api/rider_tickets').json()['data']),1)
        admin=self.login('admin')
        admin_view=admin.get('/api/admin_tickets',{'source':'Rider'}).json()
        self.assertEqual(admin_view['total'],1)
        update_res=self.post(admin,'admin_ticket_update',{'id':ticket['id'],'version':1,'status':'In Progress','priority':'High','response':'Take alternate bypass lane.'})
        self.assertEqual(update_res.status_code,200)
        rider_tickets=rider.get('/api/rider_tickets').json()['data']
        self.assertEqual(rider_tickets[0]['status'],'In Progress')
        self.assertEqual(rider_tickets[0]['response'],'Take alternate bypass lane.')
