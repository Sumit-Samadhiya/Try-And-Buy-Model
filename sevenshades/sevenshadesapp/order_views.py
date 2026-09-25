from django.http.response import JsonResponse
from .security import failure
from rest_framework.decorators import api_view
import logging

from sevenshadesapp.models import SignUp, ProductDetails, WalletAccount, TryOrder, FinalOrderItem, ProductReview
from sevenshadesapp.serializer import TryOrderWithItemsSerializer, FinalOrderWithItemsSerializer, WalletAccountSerializer, ProductReviewSerializer

logger = logging.getLogger(__name__)


def _get_user(mobile):
    if not mobile:
        return None
    return SignUp.objects.filter(mobileno=mobile).first()


def _get_wallet(mobile):
    wallet, _ = WalletAccount.objects.get_or_create(mobileno=mobile)
    return wallet


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
    except Exception:
        logger.exception('UserOrderLifecycleList failed')
        return JsonResponse({'status': False, 'data': []}, safe=False)


@api_view(['GET'])
def AdminOrderLifecycleList(request):
    from django.db.models import Q
    try:
        status_filter = request.GET.get('status', '')
        limit = min(int(request.GET.get('limit', 100)), 500)
        try_orders = (
            TryOrder.objects.select_related('finalorder')
            .prefetch_related('tryorderitem_set', 'finalorder__finalorderitem_set')
            .order_by('-id')
        )
        if status_filter:
            # Match either the trial status or the final-order status. An order with
            # no FinalOrder yet is reported as 'pending_selection'.
            condition = Q(status=status_filter) | Q(finalorder__status=status_filter)
            if status_filter == 'pending_selection':
                condition |= Q(finalorder__isnull=True)
            try_orders = try_orders.filter(condition)

        rows = [
            {
                'try_order': TryOrderWithItemsSerializer(order).data,
                'final_order': FinalOrderWithItemsSerializer(order.finalorder).data
                if getattr(order, 'finalorder', None) else None,
            }
            for order in try_orders[:limit]
        ]
        return JsonResponse({'status': True, 'data': rows}, safe=False)
    except Exception:
        logger.exception('AdminOrderLifecycleList failed')
        return JsonResponse({'status': False, 'data': []}, status=500, safe=False)


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
    except Exception:
        logger.exception('GenerateInvoice failed')
        return JsonResponse({'status': False, 'message': 'Unable to generate the receipt.'}, status=500)



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
    except Exception:
        logger.exception('FetchProductReviews failed')
        return JsonResponse({'status': False, 'data': []}, safe=False)
