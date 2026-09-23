from django.http.response import JsonResponse
from django.db import transaction
from rest_framework.decorators import api_view
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

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
    try:
        # Address Validation
        postcode = request.data.get('address', {}).get('postcode')
        if ExcludedArea.objects.filter(postcode=postcode).exists():
            return JsonResponse({'message': 'Delivery not supported in this area', 'status': False}, safe=False)
        
        if not DeliveryZone.objects.filter(postcodes__contains=postcode).exists():
            return JsonResponse({'message': 'Delivery not supported in this area', 'status': False}, safe=False)

        mobile = request.data.get('mobileno')
        address = request.data.get('address', {})
        items = request.data.get('items', [])
        delivery_mode = request.data.get('delivery_mode', 'standard')
        delivery_slot = request.data.get('delivery_slot', '10 AM - 2 PM')
        try_payment_mode = request.data.get('try_payment_mode', 'free')
        try_payment_status = request.data.get('try_payment_status', 'paid')

        user = _get_user(mobile)
        if not user:
            return JsonResponse({'message': 'User not found', 'status': False}, safe=False)

        address_type = address.get('address_type', 'Residential')
        if address_type == 'Hostel/Commercial':
            return JsonResponse({
                'message': 'Try & Buy service is restricted at Hostel & Restricted Commercial locations. Please select Standard Prepaid Delivery.',
                'status': False
            }, safe=False)

        if not items or len(items) > 4 or (delivery_mode == 'emergency_sos' and len(items) > 4):
            return JsonResponse({'message': 'Try Cart should have 1 to 4 items (max 4 for SOS)', 'status': False}, safe=False)

        # Ek banda ko ek hi active order hona chaiye
        active_order = TryOrder.objects.filter(
            mobileno=user.mobileno
        ).exclude(status__in=['Completed', 'Completed - No Purchase', 'Cancelled']).exists()
        
        if active_order:
            return JsonResponse({'message': 'You already have an active order. Please complete it before placing a new one.', 'status': False}, safe=False)

        existing_count = TryOrder.objects.filter(mobileno=user.mobileno).count()
        is_first_order = existing_count == 0

        # SOS = ₹99 (No free first order per PDF rules), Standard = ₹49 (Free if 1st order)
        if delivery_mode == 'emergency_sos':
            try_fee = 99
        else:
            try_fee = 0 if is_first_order else 49

        normalized_items = []
        total_try_items = 0
        reference_value = 0

        for item in items:
            qty = int(item.get('qty', 1) or 1)
            qty = 1 if qty > 0 else 0
            if qty == 0:
                continue

            unit_price = int(item.get('unit_price', item.get('price', 0)) or 0)
            product_name = item.get('product_name', item.get('name', ''))
            brand_name = item.get('brand_name', item.get('brand', 'SevenShades'))
            product_details_id = item.get('product_details_id')
            size = item.get('size')
            
            # without size add hue hum product ko add nhi ker sakte
            if not size:
                return JsonResponse({'message': f'Please select a size for {product_name}', 'status': False}, safe=False)

            normalized_items.append({
                'qty': qty,
                'unit_price': unit_price,
                'line_total': unit_price * qty,
                'product_name': product_name,
                'brand_name': brand_name,
                'product_details_id': product_details_id,
            })

            total_try_items += qty
            reference_value += unit_price * qty

        if total_try_items == 0 or total_try_items > 4:
            return JsonResponse({'message': 'Try Cart should have 1 to 4 valid items', 'status': False}, safe=False)

        with transaction.atomic():
            order_row_id = TryOrder.objects.count() + 1
            order_id = f'TRL-{order_row_id:06d}'

            try_order = TryOrder.objects.create(
                order_id=order_id,
                mobileno=user.mobileno,
                address_text=address.get('address', ''),
                city=address.get('city', ''),
                country=address.get('country', ''),
                postcode=address.get('postcode', ''),
                address_type=address_type,
                delivery_mode=delivery_mode,
                delivery_slot=delivery_slot,
                total_try_items=total_try_items,
                reference_value=reference_value,
                try_fee=try_fee,
                is_first_order=is_first_order,
                try_payment_mode=try_payment_mode,
                try_payment_status=try_payment_status,
                status='Try Requested',
            )

            for item in normalized_items:
                product_details = None
                if item['product_details_id']:
                    product_details = ProductDetails.objects.filter(id=item['product_details_id']).first()

                TryOrderItem.objects.create(
                    try_order=try_order,
                    product_details=product_details,
                    product_name=item['product_name'],
                    brand_name=item['brand_name'],
                    qty=item['qty'],
                    unit_price=item['unit_price'],
                    line_total=item['line_total'],
                )

            wallet = _get_wallet(user.mobileno)
            payload = TryOrderWithItemsSerializer(try_order).data
            return JsonResponse(
                {
                    'status': True,
                    'message': 'Try order created successfully',
                    'data': payload,
                    'wallet': WalletAccountSerializer(wallet).data,
                },
                safe=False,
            )

    except Exception as e:
        print('TryOrderCreate error:', e)
        return JsonResponse({'message': 'Fail to create try order', 'status': False}, safe=False)


@api_view(['POST'])
def DeliverySelectionUpdate(request):
    try:
        order_id = request.data.get('order_id')
        selected_item_ids = request.data.get('selected_item_ids', [])
        selected_id_set = set()
        for item_id in selected_item_ids:
            try:
                selected_id_set.add(int(item_id))
            except Exception:
                pass
        suggested_payment_mode = request.data.get('suggested_payment_mode', 'upi')

        try_order = TryOrder.objects.filter(order_id=order_id).first()
        if not try_order:
            return JsonResponse({'message': 'Try order not found', 'status': False}, safe=False)

        try_items = list(TryOrderItem.objects.filter(try_order=try_order))
        selected_items = [item for item in try_items if item.id in selected_id_set]

        items_total = sum(item.line_total for item in selected_items)
        wallet_credit = try_order.try_fee if len(selected_items) > 0 else 0
        final_payable = max(items_total - wallet_credit, 0)

        with transaction.atomic():
            final_order, _ = FinalOrder.objects.get_or_create(
                try_order=try_order,
                defaults={
                    'order_id': f'FIN-{try_order.order_id}',
                },
            )

            final_order.selected_items_count = len(selected_items)
            final_order.items_total = items_total
            final_order.wallet_credit = wallet_credit
            final_order.final_payable = final_payable
            final_order.payment_mode = suggested_payment_mode
            final_order.payment_status = 'pending'
            final_order.status = 'ready_for_payment' if len(selected_items) > 0 else 'no_purchase'
            final_order.save()

            FinalOrderItem.objects.filter(final_order=final_order).delete()
            for item in selected_items:
                FinalOrderItem.objects.create(
                    final_order=final_order,
                    try_order_item=item,
                    product_name=item.product_name,
                    brand_name=item.brand_name,
                    qty=item.qty,
                    unit_price=item.unit_price,
                    line_total=item.line_total,
                )

            try_order.status = 'Trial Completed' if len(selected_items) > 0 else 'Trial Completed - No Purchase'
            try_order.save()

            payload = FinalOrderWithItemsSerializer(final_order).data
            return JsonResponse(
                {
                    'status': True,
                    'message': 'Delivery selection updated',
                    'data': payload,
                },
                safe=False,
            )

    except Exception as e:
        print('DeliverySelectionUpdate error:', e)
        return JsonResponse({'message': 'Fail to update delivery selection', 'status': False}, safe=False)


@api_view(['POST'])
def FinalPaymentUpdate(request):
    try:
        order_id = request.data.get('order_id')
        payment_mode = request.data.get('payment_mode', 'upi')
        payment_status = request.data.get('payment_status', 'paid')

        try_order = TryOrder.objects.filter(order_id=order_id).first()
        if not try_order:
            return JsonResponse({'message': 'Try order not found', 'status': False}, safe=False)

        final_order = FinalOrder.objects.filter(try_order=try_order).first()
        if not final_order:
            return JsonResponse({'message': 'Final order not found', 'status': False}, safe=False)

        with transaction.atomic():
            previous_payment_status = final_order.payment_status
            final_order.payment_mode = payment_mode
            final_order.payment_status = payment_status
            if final_order.selected_items_count == 0:
                final_order.status = 'no_purchase'
            else:
                final_order.status = 'completed' if payment_status == 'paid' else 'payment_pending'
            final_order.save()

            try_order.status = 'Completed' if final_order.status == 'completed' else 'Completed - No Purchase' if final_order.status == 'no_purchase' else 'Final Payment Pending'
            try_order.save()

            wallet = _get_wallet(try_order.mobileno)

            return JsonResponse(
                {
                    'status': True,
                    'message': 'Final payment updated',
                    'data': FinalOrderWithItemsSerializer(final_order).data,
                    'wallet': WalletAccountSerializer(wallet).data,
                },
                safe=False,
            )

    except Exception as e:
        print('FinalPaymentUpdate error:', e)
        return JsonResponse({'message': 'Fail to update final payment', 'status': False}, safe=False)


@api_view(['POST'])
def UserOrderLifecycleList(request):
    try:
        mobile = request.data.get('mobileno')
        user = _get_user(mobile)
        if not user:
            return JsonResponse({'message': 'User not found', 'status': False, 'data': []}, safe=False)

        try_orders = TryOrder.objects.filter(mobileno=user.mobileno).order_by('-id')
        rows = []
        for order in try_orders:
            try_payload = TryOrderWithItemsSerializer(order).data
            final_order = FinalOrder.objects.filter(try_order=order).first()
            final_payload = FinalOrderWithItemsSerializer(final_order).data if final_order else None
            rows.append(
                {
                    'try_order': try_payload,
                    'final_order': final_payload,
                }
            )

        wallet = _get_wallet(user.mobileno)
        return JsonResponse(
            {
                'status': True,
                'data': rows,
                'wallet': WalletAccountSerializer(wallet).data,
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
        try_orders = TryOrder.objects.all().order_by('-id')
        rows = []
        for order in try_orders:
            final_order = FinalOrder.objects.filter(try_order=order).first()
            final_status = final_order.status if final_order else 'pending_selection'
            if status_filter and final_status != status_filter and order.status != status_filter:
                continue

            rows.append(
                {
                    'try_order': TryOrderWithItemsSerializer(order).data,
                    'final_order': FinalOrderWithItemsSerializer(final_order).data if final_order else None,
                }
            )

        return JsonResponse({'status': True, 'data': rows}, safe=False)
    except Exception as e:
        print('AdminOrderLifecycleList error:', e)
        return JsonResponse({'status': False, 'data': []}, safe=False)


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
    try:
        payment_status = request.data.get('payment_status')
        
        with transaction.atomic():
            try_order = TryOrder.objects.get(order_id=order_id)
            
            if payment_status == 'PAID':
                try_order.payment_status = 'COMPLETED'
                try_order.status = 'DELIVERED'
                try_order.save()
                
                _emit_order_update(order_id, {'status': 'DELIVERED', 'payment_status': 'COMPLETED'})
                
                return JsonResponse({'status': True, 'message': 'Payment successful'})
            else:
                return JsonResponse({'status': False, 'message': 'Payment failed'}, status=400)
    except Exception as e:
        return JsonResponse({'status': False, 'message': str(e)}, status=400)

@api_view(['GET'])
def GenerateInvoice(request, order_id):
    try:
        # Logic to generate PDF
        # ...
        return JsonResponse({'status': True, 'invoice_url': '...'})
    except Exception as e:
        return JsonResponse({'status': False, 'message': str(e)}, status=400)

@api_view(['POST'])
def SubmitFinalSelection(request):
    try:
        order_id = request.data.get('order_id')
        selected_items = request.data.get('selected_items', []) # List of {try_order_item_id, qty}
        
        with transaction.atomic():
            try_order = TryOrder.objects.get(order_id=order_id)
            
            # Create or get FinalOrder
            final_order, created = FinalOrder.objects.get_or_create(try_order=try_order, defaults={
                'order_id': f"FIN-{order_id}",
                'status': 'selection_submitted'
            })
            
            # Clear existing items if any
            FinalOrderItem.objects.filter(final_order=final_order).delete()
            
            items_total = 0
            for item_data in selected_items:
                try_item = TryOrderItem.objects.get(id=item_data['try_order_item_id'], try_order=try_order)
                
                # Create FinalOrderItem
                FinalOrderItem.objects.create(
                    final_order=final_order,
                    try_order_item=try_item,
                    product_name=try_item.product_name,
                    brand_name=try_item.brand_name,
                    qty=item_data['qty'],
                    unit_price=try_item.unit_price,
                    line_total=try_item.unit_price * item_data['qty']
                )
                items_total += (try_item.unit_price * item_data['qty'])
            
            # Apply wallet credit
            wallet = _get_wallet(try_order.mobileno)
            wallet_credit = min(items_total, wallet.balance)
            
            final_order.items_total = items_total
            final_order.wallet_credit = wallet_credit
            final_order.final_payable = items_total - wallet_credit
            final_order.selected_items_count = len(selected_items)
            final_order.status = 'selection_submitted'
            final_order.save()
            
            return JsonResponse({'status': True, 'message': 'Final selection submitted successfully', 'final_order_id': final_order.order_id}, status=200)
            
    except Exception as e:
        return JsonResponse({'status': False, 'message': str(e)}, status=400)

@api_view(['POST'])
def SubmitProductReview(request):
    try:
        product_details_id = request.data.get('product_details_id')
        user_mobile = request.data.get('user_mobile', '')
        user_name = request.data.get('user_name', 'Customer')
        rating = int(request.data.get('rating', 5))
        review_text = request.data.get('review_text', '')
        
        product_details = ProductDetails.objects.filter(id=product_details_id).first()
        if not product_details:
            return JsonResponse({'status': False, 'message': 'Product not found'}, safe=False)
        
        # Jo product ka hmne order successful nhi hua uska review nhi likh sakte.
        has_purchased = FinalOrderItem.objects.filter(
            final_order__try_order__mobileno=user_mobile,
            final_order__status='completed',
            product_name=product_details.productid.productname # Matching by name as a proxy, or better by product_details
        ).exists()
        
        if not has_purchased:
            return JsonResponse({'status': False, 'message': 'You can only review products you have successfully purchased.'}, safe=False)
            
        review = ProductReview.objects.create(
            product_details=product_details,
            user_mobile=user_mobile,
            user_name=user_name,
            rating=rating,
            review_text=review_text,
        )
        
        all_reviews = ProductReview.objects.filter(product_details=product_details)
        total_count = all_reviews.count()
        avg_r = sum(r.rating for r in all_reviews) / total_count if total_count > 0 else 0.0
        
        product_details.avg_rating = round(avg_r, 1)
        product_details.total_reviews = total_count
        product_details.save()
        
        return JsonResponse({
            'status': True,
            'message': 'Review submitted successfully',
            'data': ProductReviewSerializer(review).data,
            'avg_rating': product_details.avg_rating,
            'total_reviews': product_details.total_reviews,
        }, safe=False)
    except Exception as e:
        print('SubmitProductReview error:', e)
        return JsonResponse({'status': False, 'message': 'Unable to submit review'}, safe=False)


@api_view(['POST', 'GET'])
def FetchProductReviews(request):
    try:
        product_details_id = request.data.get('product_details_id') or request.GET.get('product_details_id')
        reviews = ProductReview.objects.filter(product_details_id=product_details_id).order_by('-id')
        return JsonResponse({'status': True, 'data': ProductReviewSerializer(reviews, many=True).data}, safe=False)
    except Exception as e:
        print('FetchProductReviews error:', e)
        return JsonResponse({'status': False, 'data': []}, safe=False)

