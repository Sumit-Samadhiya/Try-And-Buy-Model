import { CancelTrialButton } from './TrialInventoryControls';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Paper, Stack, Typography } from '@mui/material';
import { postData, serverURL } from './FetchDjangoApiServices';
import useOrderEvents from './useOrderEvents';
import { payWithRazorpay } from './razorpayCheckout';

export default function CustomerBill({ orderId }) {
  const [data, setData] = useState(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const result = await postData('settlement_detail', { order_id: orderId });
    if (result.status) setData(result.data); else { setData(null); setMessage(result.message); }
  }, [orderId]);
  useEffect(() => { load(); }, [load]);
  useOrderEvents(load, !!orderId, orderId);
  const approve = async mode => {
    setBusy(true); setMessage('');
    try {
      const result = await postData('customer_approve_bill', { order_id: orderId, bill_revision: data.final_order.bill_revision, payment_mode: mode });
      if (!result.status) throw new Error(result.message);
      if (mode === 'razorpay' && result.data.payment_status !== 'paid') await payWithRazorpay(orderId, 'final', result.data.bill_revision);
      setMessage(mode === 'cash' && result.data.final_payable > 0 ? 'Approved. Pay the exact balance to your assigned rider.' : 'Approval/payment recorded.');
    } catch (error) { setMessage(error.message); }
    await load(); setBusy(false);
  };
  const payTrial = async () => {
    setBusy(true);
    try { await payWithRazorpay(orderId, 'trial'); setMessage('Trial fee verified. Your order is ready for assignment.'); }
    catch (error) { setMessage(error.message); }
    await load(); setBusy(false);
  };
  const checkPayment = async () => {
    setBusy(true);
    const result = await postData('payment_reconcile', { order_id: orderId, purpose: data.try_order.status === 'AWAITING_TRIAL_PAYMENT' ? 'trial' : 'final', bill_revision: data.final_order?.bill_revision || 0 });
    setMessage(result.status ? 'Payment verified.' : result.message);
    await load(); setBusy(false);
  };
  const final = data?.final_order;
  return <Stack spacing={2} sx={{ py: 2 }}>
    {message && <Alert severity="info">{message}</Alert>}
    <Typography variant="h6">{orderId}</Typography>
    {data && <Typography>Status: {data.try_order.status.replaceAll('_', ' ')}</Typography>}
    {data?.try_order.status === 'AWAITING_TRIAL_PAYMENT' && <Button disabled={busy || !data.online_available} onClick={payTrial}>Pay trial fee ₹{data.try_order.try_fee}</Button>}
    {(data?.try_order.status === 'AWAITING_TRIAL_PAYMENT' || (final?.payment_mode === 'razorpay' && final.payment_status !== 'paid')) && <Button disabled={busy} onClick={checkPayment}>Check Existing Payment Status</Button>}
    {data?.can_cancel && <CancelTrialButton orderId={orderId} onCancelled={load}/>}
    {data?.try_order.status === 'AWAITING_TRIAL_PAYMENT' && data.try_order.reservation_expires_at && <Typography>Unpaid reservation deadline: {new Date(data.try_order.reservation_expires_at).toLocaleString()}. Payments already started require support verification before stock can be released.</Typography>}
    {data?.try_order.status === 'CANCELLED' ? <Alert severity="info">Trial cancelled. Reserved stock has been released.</Alert> : !final ? <Typography>Your itemized bill will appear here after the doorstep trial.</Typography> : <>
      <Typography variant="h6">{data.customer_approved ? 'Your bill' : 'Approve your selected items'} · version {final.bill_revision}</Typography>
      {final.finalorderitem_set.map(item => <Paper key={item.id} variant="outlined" sx={{ p: 1.5 }}>
        <Typography>{item.product_name} · {item.size} · {item.color} · Qty {item.qty}</Typography><Typography>₹{item.line_total}</Typography>
      </Paper>)}
      {!final.selected_items_count && <Typography>No items retained. All trial items will be collected.</Typography>}
      {data.customer_approved && <>
      <Typography>Items: ₹{final.items_total}</Typography>
      <Typography>Verified upfront fee adjustment: −₹{final.wallet_credit}</Typography>
      <Typography variant="h6">Balance: ₹{final.final_payable}</Typography></>}
      <Typography>Finalized purchases are non-refundable. Please check the selected items before approving.</Typography>
      {!data.customer_approved ? <Button disabled={busy} variant="contained" onClick={() => approve(null)}>Approve Selection</Button> : final.payment_status === 'paid' ? <Alert severity="success">{final.final_payable ? 'Payment verified / cash collection recorded.' : 'No balance due.'} {['DELIVERED', 'NO_PURCHASE'].includes(data.try_order.status) ? 'Order completed.' : 'Delivery confirmation will follow.'}</Alert> : <>
        {data.customer_approved && <Alert severity="success">Selection Submitted. Payment is {final.payment_mode === 'cash' ? 'due to the rider in cash' : final.payment_mode === 'razorpay' ? 'awaiting verification' : 'ready — choose a payment method below'}.</Alert>}
        <Button disabled={busy || (data.customer_approved && final.payment_mode === 'cash')} variant="contained" onClick={() => approve('cash')}>{final.final_payable ? 'Pay Cash to Rider' : 'Approve Selection — No Balance Due'}</Button>
        {final.final_payable > 0 && <Button disabled={busy || !data.online_available} variant="outlined" onClick={() => approve('razorpay')}>{data.customer_approved && final.payment_mode === 'razorpay' ? 'Continue Secure Payment' : 'Pay Online / UPI'}</Button>}
        {!data.online_available && <Typography>Online payments are awaiting gateway setup. Cash is available for the final purchase.</Typography>}
      </>}
      {data.receipt_number && <Button component="a" href={serverURL + '/api/receipt_download?order_id=' + encodeURIComponent(orderId)}>Download Payment Receipt</Button>}
    </>}
  </Stack>;
}
