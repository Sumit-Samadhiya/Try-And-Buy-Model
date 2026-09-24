import uuid
from django.conf import settings
from django.utils import timezone
from django.utils.html import escape
from .models import OrderReceipt


def issue_receipt(order, final):
    if not final.selected_items_count or final.payment_status != 'paid':
        return None
    snapshot = {'order_id': order.order_id, 'bill_revision': final.bill_revision,
        'customer_mobile': order.mobileno, 'address': order.address_text, 'city': order.city, 'postcode': order.postcode,
        'seller_name': settings.RECEIPT_SELLER_NAME, 'seller_address': settings.RECEIPT_SELLER_ADDRESS,
        'currency': 'INR', 'items_total': final.items_total, 'trial_fee_adjusted': final.wallet_credit,
        'amount_collected': final.final_payable, 'payment_mode': final.payment_mode,
        'paid_at': final.paid_at.isoformat() if final.paid_at else None,
        'items': list(final.finalorderitem_set.values('product_name', 'brand_name', 'size', 'color', 'qty', 'unit_price', 'line_total'))}
    receipt, _ = OrderReceipt.objects.get_or_create(final_order=final, defaults={
        'number': 'SS-' + timezone.now().strftime('%Y%m%d') + '-' + uuid.uuid4().hex[:12].upper(), 'snapshot': snapshot})
    return receipt


def receipt_html(receipt):
    data = receipt.snapshot
    rows = ''.join('<tr>' + ''.join('<td>' + str(escape(item[field])) + '</td>' for field in
        ('product_name', 'size', 'color', 'qty', 'unit_price', 'line_total')) + '</tr>' for item in data['items'])
    return f'''<!doctype html><html><head><meta charset="utf-8"><title>Payment receipt {escape(receipt.number)}</title>
<style>body{{font:16px Arial;margin:40px;color:#172033}}table{{width:100%;border-collapse:collapse}}td,th{{padding:12px;border-bottom:1px solid #ddd;text-align:left}}h1{{font-size:26px}}.note{{color:#555}}</style></head><body>
<h1>{escape(data['seller_name'])} — Payment receipt</h1><p>{escape(data['seller_address'])}</p>
<p>Receipt: {escape(receipt.number)}<br>Order: {escape(data['order_id'])}<br>Issued: {escape(receipt.created_at.isoformat())}</p>
<p>Customer: {escape(data['customer_mobile'])}<br>{escape(data['address'])}, {escape(data['city'])} — {escape(data['postcode'])}</p>
<table><thead><tr><th>Item</th><th>Size</th><th>Color</th><th>Qty</th><th>Unit INR</th><th>Total INR</th></tr></thead><tbody>{rows}</tbody></table>
<p>Items total: INR {data['items_total']}<br>Verified trial fee adjusted: INR {data['trial_fee_adjusted']}<br><strong>Final amount collected: INR {data['amount_collected']}</strong><br>Payment: {escape(data['payment_mode'])}</p>
<p>Finalized purchases are non-refundable. Selection is offered during the home trial.</p>
<p class="note">This is a payment receipt, not a tax invoice. No GST amount is represented. Use your browser's Print / Save as PDF to keep a PDF copy.</p></body></html>'''
