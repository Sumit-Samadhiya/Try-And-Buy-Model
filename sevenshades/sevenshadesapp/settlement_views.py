import json
import logging
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
from sevenshadesapp.qr_service import generate_payment_qr, generate_tag_qr, generate_qr_image_url

logger = logging.getLogger(__name__)


def mutation(callback):
    try:
        return JsonResponse({'status': True, 'data': callback()})
    except InventoryError as error:
        return failure(str(error), 409)
    except (OperationalError, IntegrityError) as exc:
        logger.exception('Database error in settlement mutation: %s', exc)
        return failure('This operation needs a refresh. Please check order status before retrying.', 409)
    except Exception as exc:
        logger.exception('Unexpected error in settlement mutation: %s', exc)
        return failure('An unexpected error occurred while processing settlement.', 500)


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
    payment_qr = generate_payment_qr(order.order_id, final.final_payable) if (final and final.final_payable > 0) else None
    rider_info = None
    if assignment and assignment.rider:
        r = assignment.rider
        rider_info = {
            'rider_id': r.pk,
            'name': r.name,
            'phone': r.phone,
            'bike_number': r.bike_number,
            'latitude': float(r.latitude) if r.latitude is not None else None,
            'longitude': float(r.longitude) if r.longitude is not None else None,
            'updated_at': r.location_updated_at.isoformat() if r.location_updated_at else None,
        }
    customer_location = {
        'latitude': float(order.latitude) if order.latitude is not None else None,
        'longitude': float(order.longitude) if order.longitude is not None else None,
        'address_text': order.address_text,
        'city': order.city,
        'postcode': order.postcode,
    }
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
        'payment_qr': payment_qr,
        'rider_info': rider_info,
        'customer_location': customer_location,
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


@api_view(['GET', 'POST'])
def GenerateQrCode(request):
    """
    Public API integration with qrserver (api.qrserver.com).
    Generates dynamic QR codes for:
    - UPI Payment ('payment' or 'upi'): with exact amount, payee VPA, and order reference.
    - Garment Tag ('tag'): with security tag code for instant rider verification.
    - Custom ('custom'): arbitrary URL / payload.
    """
    data = request.data if request.method == 'POST' else request.query_params
    qr_type = str(data.get('type') or 'upi').lower().strip()
    size = str(data.get('size') or '260x260').strip()

    if qr_type in ('upi', 'payment'):
        order_id = str(data.get('order_id') or '').strip()
        amount = data.get('amount')

        if order_id and amount is None:
            order = TryOrder.objects.filter(order_id=order_id).first()
            if order:
                final = FinalOrder.objects.filter(try_order=order).first()
                amount = final.final_payable if final else order.try_fee

        try:
            amt_val = float(amount or 0)
        except (ValueError, TypeError):
            amt_val = 0.0

        qr_info = generate_payment_qr(order_id=order_id, amount=amt_val, size=size)
        return JsonResponse({'status': True, 'data': qr_info})

    elif qr_type == 'tag':
        tag_code = str(data.get('tag_code') or data.get('tag_id') or '').strip()
        item_id = data.get('item_id')
        product_name = str(data.get('product_name') or '').strip()
        order_id = str(data.get('order_id') or '').strip()

        if item_id and not tag_code:
            from .models import TryOrderItem
            item = TryOrderItem.objects.filter(pk=item_id).first()
            if item:
                tag_code = item.security_tag
                product_name = item.product_name
                order_id = item.try_order.order_id

        if not tag_code:
            return failure('Tag code or item_id is required for tag QR generation.', 400)

        qr_info = generate_tag_qr(tag_code=tag_code, order_id=order_id, product_name=product_name, size=size)
        return JsonResponse({'status': True, 'data': qr_info})

    elif qr_type == 'custom':
        payload = str(data.get('payload') or data.get('data') or '').strip()
        if not payload:
            return failure('Payload or data is required for custom QR generation.', 400)
        color = str(data.get('color') or '064e3b').strip()
        qr_url = generate_qr_image_url(payload, size=size, color=color)
        return JsonResponse({'status': True, 'data': {'payload': payload, 'qr_image_url': qr_url}})

    return failure(f"Unsupported QR type '{qr_type}'. Use 'payment', 'tag', or 'custom'.", 400)

