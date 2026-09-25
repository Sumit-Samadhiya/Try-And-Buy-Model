import json
from datetime import timedelta
from django.http import JsonResponse, HttpResponse
from django.db import OperationalError, IntegrityError
from django.utils import timezone
from rest_framework.decorators import api_view
from sevenshadesapp.models import TryOrder, FinalOrder, DeliveryAssignment, GatewayPayment, OrderReceipt
from sevenshadesapp.serializer import TryOrderWithItemsSerializer, FinalOrderWithItemsSerializer
from sevenshadesapp.security import failure, owns_order
from sevenshadesapp.inventory_workflow import InventoryError
from sevenshadesapp.settlement import approve_bill, approved
from sevenshadesapp.payments import gateway_configured, create_payment, verify_checkout, verify_webhook, verified_entity, apply_capture, reconcile_payment
from sevenshadesapp.receipts import receipt_html


def mutation(callback):
    try:
        return JsonResponse({'status': True, 'data': callback()})
    except InventoryError as error:
        return failure(str(error), 409)
    except (OperationalError, IntegrityError):
        return failure('This operation needs a refresh. Please check order status before retrying.', 409)


@api_view(['POST'])
def SettlementDetail(request):
    if not isinstance(request.data.get('order_id'), str):
        return failure('Invalid order identifier.', 400)
    from sevenshadesapp.inventory_workflow import expire_pending_trials, cancellation_blocker
    if request.account_role == 'customer': expire_pending_trials(request.account.pk)
    order = TryOrder.objects.filter(order_id=request.data.get('order_id')).first()
    if not order or not owns_order(request.account_role, request.account, order):
        return failure('Order not found.', 404)
    final = FinalOrder.objects.filter(try_order=order).first()
    assignment = DeliveryAssignment.objects.filter(try_order=order).first()
    receipt = OrderReceipt.objects.filter(final_order=final).first() if final else None
    start = assignment.trial_start_time if assignment else None
    return JsonResponse({'status': True, 'data': {
        'try_order': TryOrderWithItemsSerializer(order).data,
        'final_order': FinalOrderWithItemsSerializer(final).data if final else None,
        'customer_approved': approved(final) if final else False,
        'can_cancel': not cancellation_blocker(order),
        'cancellation_blocker': cancellation_blocker(order),
        'assignment_id': assignment.assignment_id if assignment else None,
        'assignment_status': assignment.status if assignment else None,
        'trial_started_at': start.isoformat() if start else None,
        'trial_completed_at': assignment.trial_end_time.isoformat() if assignment and assignment.trial_end_time else None,
        'trial_ends_at': (start + timedelta(minutes=15)).isoformat() if start else None,
        'server_time': timezone.now().isoformat(), 'online_available': False,
        'receipt_number': receipt.number if receipt else None,
    }})


@api_view(['POST'])
def CustomerApproveBill(request):
    return mutation(lambda: FinalOrderWithItemsSerializer(approve_bill(request.account, request.data.get('order_id'),
        request.data.get('bill_revision'), request.data.get('payment_mode'))).data)


@api_view(['GET'])
def PaymentCapabilities(request):
    return JsonResponse({'status': True, 'data': {'cod_only': True, 'razorpay': False, 'tax_invoice': False}})


@api_view(['POST'])
def PaymentCreate(request):
    return mutation(lambda: create_payment(request.account, request.data.get('order_id'), request.data.get('purpose'), request.data.get('bill_revision', 0)))


@api_view(['POST'])
def PaymentVerify(request):
    return mutation(lambda: {'order_id': verify_checkout(request.account, request.data).order_id})


@api_view(['POST'])
def PaymentReconcile(request):
    return mutation(lambda: {'order_id': reconcile_payment(request.account, request.data.get('order_id'), request.data.get('purpose'), request.data.get('bill_revision', 0)).order_id})


@api_view(['POST'])
def RazorpayWebhook(request):
    raw = request.body
    if len(raw) > 262144 or not verify_webhook(raw, request.headers.get('X-Razorpay-Signature')):
        return failure('Invalid webhook signature.', 403)
    try:
        event = json.loads(raw)
        if event.get('event') != 'payment.captured':
            return JsonResponse({'status': True})
        entity = event['payload']['payment']['entity']
        attempt = GatewayPayment.objects.filter(gateway_order_id=entity.get('order_id')).first()
        if not attempt:
            return failure('Payment not found; reconciliation required.', 409)
        verified = verified_entity(entity.get('id'))
        if verified.get('id') != entity.get('id'):
            return failure('Payment mismatch.', 409)
        apply_capture(attempt.pk, verified)
        return JsonResponse({'status': True})
    except InventoryError as error:
        return failure(str(error), 409)
    except (ValueError, KeyError, TypeError, AttributeError):
        return failure('Invalid webhook payload.', 400)
    except (OperationalError, IntegrityError):
        return failure('Retry webhook delivery.', 503)


@api_view(['GET'])
def ReceiptDownload(request):
    receipt = OrderReceipt.objects.select_related('final_order__try_order').filter(final_order__try_order__order_id=request.GET.get('order_id')).first()
    if not receipt or not owns_order(request.account_role, request.account, receipt.final_order.try_order):
        return failure('Receipt not found.', 404)
    response = HttpResponse(receipt_html(receipt), content_type='text/html; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="{receipt.number}.html"'
    response['Cache-Control'] = 'private, no-store'
    response['X-Content-Type-Options'] = 'nosniff'
    return response
