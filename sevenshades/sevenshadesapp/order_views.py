from django.http.response import JsonResponse
from django.db import transaction
from .security import failure
from .inventory_workflow import lock_order
from rest_framework.decorators import api_view
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import uuid

from sevenshadesapp.models import SignUp, ProductDetails, WalletAccount, TryOrder, TryOrderItem, FinalOrder, FinalOrderItem, ProductReview, DeliveryRider, ExcludedArea, DeliveryZone
from sevenshadesapp.serializer import TryOrderWithItemsSerializer, FinalOrderWithItemsSerializer, WalletAccountSerializer, ProductReviewSerializer


def _get_user(mobile):
    if not mobile:
        return None
    return SignUp.objects.filter(mobileno=mobile).first()


def _get_wallet(mobile):
    wallet, _ = WalletAccount.objects.get_or_create(mobileno=mobile)
    return wallet

def _emit_order_update(order_id, data):
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f'order_{order_id}',
        {
            'type': 'order_status_updated',
            'data': data
        }
    )


@api_view(['POST'])
def TryOrderCreate(request):
    from django.db import OperationalError
    from .checkout import create_trial, CheckoutError
    try:
        from .inventory_workflow import expire_pending_trials
        expire_pending_trials()
        order = create_trial(request.account, request.data)
        return JsonResponse({'status': True, 'message': 'Try order created successfully',
            'data': TryOrderWithItemsSerializer(order).data})
    except CheckoutError as error:
        return failure(str(error), 409)
    except OperationalError:
        return failure('Checkout is busy. Please retry after checking your orders.', 503)


@api_view(['POST'])
def DeliverySelectionUpdate(request):
    from .settlement import generate_bill
    from .settlement_views import mutation
    ids = request.data.get('selected_item_ids', [])
    if not isinstance(ids, list):
        return failure('Invalid selection.', 400)
    return mutation(lambda: FinalOrderWithItemsSerializer(generate_bill(request.account_role, request.account,
        request.data.get('order_id'), [{'try_order_item_id': item_id, 'qty': 1} for item_id in ids])).data)


@api_view(['POST'])
def FinalPaymentUpdate(request):
    from .settlement import confirm_cash
    from .settlement_views import mutation
    if request.data.get('payment_mode') != 'cash' or request.data.get('payment_status') != 'paid':
        return failure('Only confirmed cash collection is manual. Online payments require verified capture.', 409)
    return mutation(lambda: FinalOrderWithItemsSerializer(confirm_cash(request.account_role, request.account,
        request.data.get('order_id'), request.data.get('bill_revision'))).data)


@api_view(['POST'])
def UserOrderLifecycleList(request):
    try:
        mobile = request.account.mobileno
        user = _get_user(mobile)
        if not user:
            return JsonResponse({'message': 'User not found', 'status': False, 'data': []}, safe=False)

        from .inventory_workflow import expire_pending_trials, cancellation_blocker
        expire_pending_trials(user.mobileno)
        try_orders = (
            TryOrder.objects.filter(mobileno=user.mobileno)
            .select_related('finalorder')
            .prefetch_related('tryorderitem_set', 'finalorder__finalorderitem_set')
            .order_by('-id')
        )
        rows = []
        for order in try_orders:
            try_payload = TryOrderWithItemsSerializer(order).data
            final_order = getattr(order, 'finalorder', None)
            final_payload = FinalOrderWithItemsSerializer(final_order).data if final_order else None
            rows.append(
                {
                    'try_order': try_payload,
                    'can_cancel': not cancellation_blocker(order),
                    'final_order': final_payload,
                }
            )

        wallet = _get_wallet(user.mobileno)
        return JsonResponse(
            {
                'status': True,
                'data': rows,
                'wallet': WalletAccountSerializer(wallet).data,
                'intro_offer_available': not try_orders.exclude(status='CANCELLED', dispatched_at__isnull=True).exists(),
            },
            safe=False,
        )
    except Exception as e:
        print('UserOrderLifecycleList error:', e)
        return JsonResponse({'status': False, 'data': []}, safe=False)


@api_view(['POST'])
def DeleteOldOrders(request):
    try:
        # Delete orders that are 'Completed' (old status)
        TryOrder.objects.filter(status='Completed').delete()
        return JsonResponse({'status': True, 'message': 'Old orders deleted'})
    except Exception as e:
        return JsonResponse({'status': False, 'message': str(e)}, status=400)


@api_view(['GET'])
def AdminOrderLifecycleList(request):
    try:
        status_filter = request.GET.get('status', '')
        limit = min(int(request.GET.get('limit', 100)), 500)
        try_orders = (
            TryOrder.objects.select_related('finalorder')
            .prefetch_related('tryorderitem_set', 'finalorder__finalorderitem_set')
            .all()
            .order_by('-id')
        )
        rows = []
        for order in try_orders:
            final_order = getattr(order, 'finalorder', None)
            final_status = final_order.status if final_order else 'pending_selection'
            if status_filter and final_status != status_filter and order.status != status_filter:
                continue

            rows.append(
                {
                    'try_order': TryOrderWithItemsSerializer(order).data,
                    'final_order': FinalOrderWithItemsSerializer(final_order).data if final_order else None,
                }
            )
            if len(rows) >= limit:
                break

        return JsonResponse({'status': True, 'data': rows}, safe=False)
    except Exception as e:
        print('AdminOrderLifecycleList error:', e)
        return JsonResponse({'status': False, 'data': []}, status=500, safe=False)


@api_view(['POST'])
def AssignRider(request):
    try:
        order_id = request.data.get('order_id')
        rider_id = request.data.get('rider_id')
        
        try_order = TryOrder.objects.get(order_id=order_id)
        rider = DeliveryRider.objects.get(rider_id=rider_id)
        
        try_order.assigned_rider = rider
        try_order.status = 'ASSIGNED'
        try_order.save()
        
        _emit_order_update(order_id, {'status': 'ASSIGNED'})
        
        return JsonResponse({'status': True, 'message': 'Rider assigned successfully'})
    except Exception as e:
        return JsonResponse({'status': False, 'message': str(e)}, status=400)

@api_view(['PATCH'])
def UpdateRiderStatus(request, order_id):
    try:
        status = request.data.get('status')
        try_order = TryOrder.objects.get(order_id=order_id)
        
        if status in ['OUT_FOR_TRIAL', 'TRIAL_IN_PROGRESS']:
            try_order.status = status
            try_order.save()
            
            _emit_order_update(order_id, {'status': status})
            
            return JsonResponse({'status': True, 'message': 'Status updated'})
        return JsonResponse({'status': False, 'message': 'Invalid status'}, status=400)
    except Exception as e:
        return JsonResponse({'status': False, 'message': str(e)}, status=400)

@api_view(['POST'])
def DoorstepSelection(request, order_id):
    try:
        items = request.data.get('items', []) # List of {id, status: 'PURCHASED' | 'RETURNED'}
        
        with transaction.atomic():
            try_order = TryOrder.objects.get(order_id=order_id)
            
            subtotal = 0
            for item_data in items:
                item = TryOrderItem.objects.get(id=item_data['id'], try_order=try_order)
                item.status = item_data['status']
                item.save()
                if item.status == 'PURCHASED':
                    subtotal += item.line_total
            
            # Adjust trial fee
            trial_fee_adjustment = try_order.try_fee if subtotal > 0 else 0
            final_payable = subtotal - trial_fee_adjustment
            
            try_order.final_bill = {
                'subtotal': subtotal,
                'trial_fee_adjustment': trial_fee_adjustment,
                'final_payable': final_payable
            }
            try_order.status = 'SELECTION_SUBMITTED'
            try_order.save()
            
            _emit_order_update(order_id, {'status': 'SELECTION_SUBMITTED', 'bill': try_order.final_bill})
            
            return JsonResponse({'status': True, 'message': 'Selection submitted', 'bill': try_order.final_bill})
    except Exception as e:
        return JsonResponse({'status': False, 'message': str(e)}, status=400)

@api_view(['POST'])
def CustomerApprovePay(request, order_id):
    # Legacy placeholder: never accept a client-declared online payment.
    return failure('Online payments require verified gateway confirmation.', 409)

@api_view(['GET', 'POST'])
def GenerateInvoice(request, order_id=None):
    from .models import OrderReceipt
    from .security import owns_order
    try:
        oid = order_id or request.GET.get('order_id') or request.data.get('order_id')
        if not oid:
            return failure('Order ID is required.', 400)
        order = TryOrder.objects.filter(order_id=oid).first()
        if not order:
            return failure('Order not found.', 404)
        if not owns_order(request.account_role, request.account, order):
            return failure('You do not have access to this order receipt.', 403)
        receipt = OrderReceipt.objects.select_related('final_order').filter(final_order__try_order=order).first()
        if not receipt:
            return failure('Payment receipt is generated upon successful delivery and final payment settlement.', 404)
        return JsonResponse({
            'status': True,
            'receipt_number': receipt.number,
            'receipt_url': f'/api/receipt_download?order_id={order.order_id}',
            'is_tax_invoice': False,
            'message': 'Official payment receipt generated. Download via receipt_url.'
        })
    except Exception as e:
        return JsonResponse({'status': False, 'message': str(e)}, status=500)



@api_view(['POST'])
def SubmitFinalSelection(request):
    from .settlement import generate_bill
    from .settlement_views import mutation
    return mutation(lambda: FinalOrderWithItemsSerializer(generate_bill(request.account_role, request.account,
        request.data.get('order_id'), request.data.get('selected_items'))).data)


@api_view(['POST'])
def SubmitProductReview(request):
    from django.db import transaction, OperationalError
    from django.db.models import F, Avg, Count
    try:
        with transaction.atomic():
            product_details_id = request.data.get('product_details_id')
            # Acquire SQLite's write lock before reading; the row lock serializes
            # review aggregates and inventory writers on row-locking databases.
            ProductDetails.objects.filter(pk=product_details_id).update(avg_rating=F('avg_rating'))
            product_details = ProductDetails.objects.select_for_update().filter(pk=product_details_id).first()
            if not product_details:
                return failure('Product not found.', 404)
            user_mobile = request.account.mobileno
            rating = int(request.data.get('rating', 5))
            if not 1 <= rating <= 5:
                return failure('Rating must be between 1 and 5.', 400)
            has_purchased = FinalOrderItem.objects.filter(
                final_order__try_order__mobileno=user_mobile,
                final_order__status='completed',
                try_order_item__product_details=product_details,
            ).exists()
            if not has_purchased:
                return failure('You can only review products you have successfully purchased.', 403)
            review = ProductReview.objects.filter(
                product_details=product_details, user_mobile=user_mobile
            ).first()
            user_name = f'{request.account.fname} {request.account.lname}'.strip() or 'Customer'
            review_text = request.data.get('review_text', '')
            if review:
                review.rating = rating
                review.review_text = review_text
                review.user_name = user_name
                review.save(update_fields=['rating', 'review_text', 'user_name'])
            else:
                review = ProductReview.objects.create(
                    product_details=product_details, user_mobile=user_mobile,
                    user_name=user_name,
                    rating=rating, review_text=review_text,
                )
            totals = ProductReview.objects.filter(product_details=product_details).aggregate(average=Avg('rating'), count=Count('pk'))
            average = round(totals['average'] or 0, 1)
            # Never save a full variant instance here: ratings must not write stock,
            # pricing, images or any other catalog fields read before this review.
            ProductDetails.objects.filter(pk=product_details.pk).update(avg_rating=average, total_reviews=totals['count'])
        return JsonResponse({'status': True, 'message': 'Review submitted successfully',
            'data': ProductReviewSerializer(review).data, 'avg_rating': average, 'total_reviews': totals['count']})
    except OperationalError:
        return failure('The product is busy. Please try submitting your review again.', 409)


@api_view(['POST', 'GET'])
def FetchProductReviews(request):
    try:
        product_details_id = request.data.get('product_details_id') or request.GET.get('product_details_id')
        reviews = ProductReview.objects.filter(product_details_id=product_details_id).order_by('-id')
        return JsonResponse({'status': True, 'data': ProductReviewSerializer(reviews, many=True).data}, safe=False)
    except Exception as e:
        print('FetchProductReviews error:', e)
        return JsonResponse({'status': False, 'data': []}, safe=False)
