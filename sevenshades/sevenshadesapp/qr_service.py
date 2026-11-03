"""
Dynamic QR Code Generator Service for DoorDrape (powered by qrserver API).
Generates:
1. Dynamic UPI Payment QR codes for doorstep settlements with exact amounts and order references.
2. Security & Tamper-Proof Tag QR codes for trial garment tracking and rider instant scans.
"""
import urllib.parse
from django.conf import settings

QR_SERVER_BASE_URL = "https://api.qrserver.com/v1/create-qr-code/"


def get_upi_vpa():
    return getattr(settings, 'DOORDRAPE_UPI_VPA', 'doordrape@upi')


def get_upi_payee_name():
    return getattr(settings, 'DOORDRAPE_UPI_NAME', getattr(settings, 'RECEIPT_SELLER_NAME', 'DoorDrape'))


def build_upi_intent_uri(vpa=None, payee_name=None, amount=0, order_id="", note=None):
    """
    Builds a standard Indian NPCI UPI Intent URI.
    Format: upi://pay?pa={vpa}&pn={payee_name}&am={amount}&tr={order_id}&tn={note}&cu=INR
    """
    pa = vpa or get_upi_vpa()
    pn = payee_name or get_upi_payee_name()
    order_clean = str(order_id or '').strip()
    tn = note or (f"DoorDrape Order {order_clean}".strip() if order_clean else "DoorDrape Trial Payment")
    
    # Format amount with 2 decimal places if > 0
    num_amt = float(amount or 0)
    formatted_amount = f"{num_amt:.2f}" if num_amt > 0 else "0.00"
    
    params = {
        'pa': pa,
        'pn': pn,
        'am': formatted_amount,
        'tr': order_clean,
        'tn': tn,
        'cu': 'INR'
    }
    query_string = urllib.parse.urlencode(params)
    return f"upi://pay?{query_string}"


def generate_qr_image_url(data_payload, size="250x250", color="064e3b", bgcolor="ffffff", margin=1):
    """
    Generates a high-resolution QR image URL from qrserver public API (api.qrserver.com).
    """
    encoded_data = urllib.parse.quote(str(data_payload), safe='')
    return f"{QR_SERVER_BASE_URL}?size={size}&data={encoded_data}&color={color}&bgcolor={bgcolor}&margin={margin}"


def generate_payment_qr(order_id, amount, note=None, size="260x260"):
    """
    Generates full payment QR data package for doorstep settlement.
    """
    vpa = get_upi_vpa()
    name = get_upi_payee_name()
    upi_uri = build_upi_intent_uri(vpa=vpa, payee_name=name, amount=amount, order_id=order_id, note=note)
    qr_url = generate_qr_image_url(upi_uri, size=size, color="064e3b", margin=1)
    
    return {
        'vpa': vpa,
        'payee_name': name,
        'amount': float(amount or 0),
        'order_id': str(order_id or '').strip(),
        'upi_uri': upi_uri,
        'qr_image_url': qr_url
    }


def generate_tag_qr(tag_code, order_id="", product_name="", size="220x220"):
    """
    Generates a security tag QR code for garment tags.
    """
    tag_clean = str(tag_code or '').strip()
    qr_url = generate_qr_image_url(tag_clean, size=size, color="0f172a", margin=1)
    
    return {
        'tag_code': tag_clean,
        'order_id': str(order_id or '').strip(),
        'product_name': str(product_name or '').strip(),
        'qr_image_url': qr_url
    }

