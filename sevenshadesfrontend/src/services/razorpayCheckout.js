import { postData } from './FetchDjangoApiServices';
let sdk;
function loadCheckout() {
  if (window.Razorpay) return Promise.resolve();
  if (!sdk) sdk = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = resolve;
    script.onerror = () => { script.remove(); sdk = null; reject(new Error('Unable to load secure payment checkout. Your order remains pending.')); };
    document.head.appendChild(script);
  });
  return sdk;
}
export async function payWithRazorpay(orderId, purpose, billRevision = 0) {
  await loadCheckout();
  const created = await postData('payment_create', { order_id: orderId, purpose, bill_revision: billRevision });
  if (!created.status) throw new Error(created.message);
  return new Promise((resolve, reject) => {
    let finished = false;
    const checkout = new window.Razorpay({ ...created.data,
      description: purpose === 'trial' ? 'Home trial fee' : 'Approved home trial purchase',
      handler: async response => {
        finished = true;
        const verified = await postData('payment_verify', response);
        if (verified.status) resolve(verified.data);
        else reject(new Error(verified.message + ' Check order status before retrying payment.'));
      },
      modal: { ondismiss: () => { if (!finished) reject(new Error('Payment window closed. Check your order before retrying.')); } },
    });
    checkout.open();
  });
}
