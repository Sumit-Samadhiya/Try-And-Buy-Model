import uuid
from django.conf import settings
from django.utils import timezone
from django.utils.html import escape
from .models import OrderReceipt


def issue_receipt(order, final):
    if final.payment_status != 'paid' or (not final.selected_items_count and final.final_payable <= 0):
        return None
    snapshot = {'order_id': order.order_id, 'bill_revision': final.bill_revision,
        'customer_mobile': order.mobileno, 'address': order.address_text, 'city': order.city, 'postcode': order.postcode,
        'seller_name': settings.RECEIPT_SELLER_NAME, 'seller_address': settings.RECEIPT_SELLER_ADDRESS,
        'currency': 'INR', 'items_total': final.items_total, 'trial_fee_adjusted': final.wallet_credit,
        'amount_collected': final.final_payable, 'payment_mode': final.payment_mode,
        'delivery_or_trial_fee': final.final_payable if not final.selected_items_count else 0,
        'paid_at': final.paid_at.isoformat() if final.paid_at else None,
        'items': list(final.finalorderitem_set.values('product_name', 'brand_name', 'size', 'color', 'qty', 'unit_price', 'line_total'))}
    receipt, _ = OrderReceipt.objects.get_or_create(final_order=final, defaults={
        'number': 'SS-' + timezone.now().strftime('%Y%m%d') + '-' + uuid.uuid4().hex[:12].upper(), 'snapshot': snapshot})
    return receipt


def receipt_html(receipt):
    data = receipt.snapshot
    rows = ''.join(f'''<tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 12px 14px; font-weight: 600; color: #0f172a;">{escape(item['product_name'])}</td>
        <td style="padding: 12px 14px; text-align: center;"><span style="background: #f1f5f9; padding: 3px 8px; border-radius: 6px; font-size: 13px; font-weight: 700; color: #334155;">{escape(str(item['size']))}</span></td>
        <td style="padding: 12px 14px; text-align: center; color: #475569;">{escape(str(item['color']))}</td>
        <td style="padding: 12px 14px; text-align: center; font-weight: 700; color: #0f172a;">{escape(str(item['qty']))}</td>
        <td style="padding: 12px 14px; text-align: right; color: #475569;">₹{escape(str(item['unit_price']))}</td>
        <td style="padding: 12px 14px; text-align: right; font-weight: 700; color: #064e3b;">₹{escape(str(item['line_total']))}</td>
    </tr>''' for item in data['items'])

    formatted_date = receipt.created_at.strftime('%d %b %Y, %I:%M %p') if hasattr(receipt.created_at, 'strftime') else str(receipt.created_at)

    return f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Payment Receipt — {escape(receipt.number)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after {{ box-sizing: border-box; }}
    body {{
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #f8fafc;
      color: #0f172a;
      margin: 0;
      padding: 32px 16px;
      line-height: 1.5;
    }}
    .invoice-wrapper {{
      max-width: 820px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 20px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04);
      overflow: hidden;
    }}
    .invoice-header {{
      background: linear-gradient(135deg, #091e17 0%, #064e3b 60%, #022c22 100%);
      color: #ffffff;
      padding: 36px 36px 32px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 20px;
    }}
    .brand-mark {{
      display: flex;
      align-items: center;
      gap: 12px;
    }}
    .brand-title {{
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin: 0;
      color: #ffffff;
    }}
    .brand-title span {{ color: #34d399; }}
    .brand-tagline {{
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1.2px;
      color: #a7f3d0;
      text-transform: uppercase;
      margin-top: 2px;
    }}
    .receipt-badge {{
      background: rgba(16, 185, 129, 0.2);
      border: 1px solid rgba(52, 211, 153, 0.4);
      color: #a7f3d0;
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.5px;
      display: inline-block;
    }}
    .meta-grid {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      padding: 28px 36px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
    }}
    @media (max-width: 600px) {{
      .meta-grid {{ grid-template-columns: 1fr; padding: 20px; }}
      .invoice-header {{ padding: 24px 20px; }}
      .invoice-body {{ padding: 20px !important; }}
    }}
    .meta-box h4 {{
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #64748b;
      margin: 0 0 8px;
    }}
    .meta-box p {{
      margin: 0;
      font-size: 14px;
      color: #334155;
      line-height: 1.5;
    }}
    .invoice-body {{
      padding: 32px 36px;
    }}
    table {{
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0 24px;
    }}
    th {{
      background: #f1f5f9;
      color: #475569;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      padding: 12px 14px;
      border-bottom: 2px solid #e2e8f0;
    }}
    .summary-card {{
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 20px 24px;
      margin-top: 16px;
      margin-left: auto;
      max-width: 380px;
    }}
    .summary-row {{
      display: flex;
      justify-content: space-between;
      font-size: 14px;
      padding: 6px 0;
      color: #475569;
    }}
    .summary-total {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 16px;
      font-weight: 800;
      color: #064e3b;
      border-top: 2px solid #cbd5e1;
      margin-top: 10px;
      padding-top: 12px;
    }}
    .badge-paid {{
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #d1fae5;
      color: #065f46;
      border: 1px solid #6ee7b7;
      padding: 4px 12px;
      border-radius: 8px;
      font-weight: 800;
      font-size: 13px;
    }}
    .print-bar {{
      max-width: 820px;
      margin: 0 auto 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }}
    .btn-print {{
      background: #0f172a;
      color: #ffffff;
      border: none;
      padding: 10px 22px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }}
    .btn-print:hover {{
      background: #1e293b;
      transform: translateY(-1px);
    }}
    .digital-seal {{
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: 1px dashed #059669;
      background: #f0fdf4;
      padding: 8px 16px;
      border-radius: 10px;
      margin-top: 20px;
      color: #065f46;
      font-size: 12px;
      font-weight: 700;
    }}
    @media print {{
      body {{ background: #ffffff; padding: 0; }}
      .no-print {{ display: none !important; }}
      .invoice-wrapper {{ box-shadow: none; border: none; }}
    }}
  </style>
</head>
<body>

  <div class="print-bar no-print">
    <a href="https://try-and-buy-model.vercel.app/" style="text-decoration: none; color: #059669; font-weight: 700; font-size: 14px;">&larr; Return to Storefront</a>
    <button class="btn-print" onclick="window.print()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
      Print / Save as PDF
    </button>
  </div>

  <div class="invoice-wrapper">
    <!-- Header Banner -->
    <div class="invoice-header">
      <div>
        <div class="brand-mark">
          <svg width="34" height="34" viewBox="0 0 120 140" fill="none" stroke="#34d399" stroke-width="6" stroke-linecap="round"><path d="M20 126V58a40 40 0 0 1 80 0v68M12 126h96"/></svg>
          <div>
            <h1 class="brand-title">Door<span>Drape</span></h1>
            <div class="brand-tagline">TRY &amp; BUY FASHION AT YOUR DOORSTEP</div>
          </div>
        </div>
        <p style="margin: 14px 0 0; color: #d1fae5; font-size: 13px;">{escape(data['seller_name'])} — {escape(data['seller_address'])}</p>
      </div>

      <div style="text-align: right;">
        <span class="receipt-badge">OFFICIAL PAYMENT RECEIPT</span>
        <div style="margin-top: 10px; font-size: 18px; font-weight: 800; color: #ffffff;">{escape(receipt.number)}</div>
        <div style="font-size: 12px; color: #a7f3d0; margin-top: 4px;">Issued: {escape(formatted_date)}</div>
      </div>
    </div>

    <!-- Metadata Grid -->
    <div class="meta-grid">
      <div class="meta-box">
        <h4>Billed To (Customer Details)</h4>
        <p><strong>Mobile:</strong> {escape(data['customer_mobile'])}</p>
        <p style="margin-top: 4px;"><strong>Address:</strong> {escape(data['address'])}, {escape(data['city'])} — {escape(data['postcode'])}</p>
      </div>
      <div class="meta-box" style="text-align: right;">
        <h4>Order &amp; Payment Details</h4>
        <p><strong>Order ID:</strong> {escape(data['order_id'])}</p>
        <p style="margin-top: 4px;"><strong>Payment Mode:</strong> {escape(str(data['payment_mode']).upper())}</p>
        <p style="margin-top: 6px;"><span class="badge-paid">✓ PAID &amp; COLLECTED</span></p>
      </div>
    </div>

    <!-- Invoice Table -->
    <div class="invoice-body">
      <table>
        <thead>
          <tr>
            <th style="text-align: left;">Item Description</th>
            <th style="text-align: center;">Size</th>
            <th style="text-align: center;">Color</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Unit INR</th>
            <th style="text-align: right;">Total INR</th>
          </tr>
        </thead>
        <tbody>
          {rows}
        </tbody>
      </table>

      <!-- Summary Box -->
      <div class="summary-card">
        <div class="summary-row">
          <span>Items total:</span>
          <span>INR {data['items_total']}</span>
        </div>
        <div class="summary-row">
          <span>Delivery / trial fee:</span>
          <span style="color: {'#059669' if data.get('delivery_or_trial_fee', 0) == 0 else '#475569'};">INR {data.get('delivery_or_trial_fee', 0)}</span>
          <span style="display:none">Delivery / trial fee: INR {data.get('delivery_or_trial_fee', 0)}</span>
        </div>
        <div class="summary-row">
          <span>Verified trial fee adjusted:</span>
          <span>INR {data['trial_fee_adjusted']}</span>
        </div>
        <div class="summary-total">
          <span>Final amount collected:</span>
          <span style="font-size: 18px;">INR {data['amount_collected']}</span>
        </div>
        <div style="font-size: 11px; color: #64748b; margin-top: 6px; text-align: right;">
          Payment: {escape(str(data['payment_mode']).upper())}
        </div>
      </div>

      <!-- Verified Stamp & Terms -->
      <div class="digital-seal">
        <span>🛡️</span>
        <span>VERIFIED DOORSTEP TRIAL SETTLEMENT · TRANSACTION COMPLETE</span>
      </div>

      <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.6;">
        <p style="margin: 0 0 6px;"><strong>Customer Policy Notice:</strong> Finalized purchases are non-refundable. Selection is offered during the home trial.</p>
        <p style="margin: 0;" class="note">This is a payment receipt, not a tax invoice. No GST amount is represented. Use your browser's Print / Save as PDF to keep a PDF copy.</p>
      </div>
    </div>
  </div>

</body>
</html>'''

