import { CancelTrialButton } from './TrialInventoryControls';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Paper, Stack, Typography } from '@mui/material';
import { postData, serverURL } from './FetchDjangoApiServices';
import useOrderEvents from './useOrderEvents';

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

  const approve = async (mode = 'cash') => {
    setBusy(true); setMessage('');
    try {
      const result = await postData('customer_approve_bill', {
        order_id: orderId,
        bill_revision: data.final_order.bill_revision,
        payment_mode: mode || 'cash'
      });
      if (!result.status) throw new Error(result.message);
      setMessage(result.data.final_payable > 0 ? 'Approved. Pay the exact balance in cash to your assigned rider.' : 'Approval recorded.');
    } catch (error) { setMessage(error.message); }
    await load(); setBusy(false);
  };

  const final = data?.final_order;

  return (
    <Stack spacing={2} sx={{ py: 2 }}>
      {message && <Alert severity="info">{message}</Alert>}
      <Typography variant="h6">{orderId}</Typography>
      {data && <Typography>Status: {data.try_order.status.replaceAll('_', ' ')}</Typography>}
      {data?.can_cancel && <CancelTrialButton orderId={orderId} onCancelled={load} />}
      {data?.try_order.status === 'CANCELLED' ? (
        <Alert severity="info">Trial cancelled. Reserved stock has been released.</Alert>
      ) : !final ? (
        <Typography>Your itemized bill will appear here after the doorstep trial.</Typography>
      ) : (
        <>
          <Typography variant="h6">
            {data.customer_approved ? 'Your Bill (Cash on Delivery)' : 'Approve your selected items'} · version {final.bill_revision}
          </Typography>
          {final.finalorderitem_set.map(item => (
            <Paper key={item.id} variant="outlined" sx={{ p: 1.5 }}>
              <Typography>{item.product_name} · {item.size} · {item.color} · Qty {item.qty}</Typography>
              <Typography>₹{item.line_total}</Typography>
            </Paper>
          ))}
          {!final.selected_items_count && (
            <Typography sx={{ color: '#b45309' }}>
              No items retained. All trial clothes will be returned to the rider.
            </Typography>
          )}
          {data.customer_approved && (
            <Paper sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
              <Typography>Items Total: ₹{final.items_total}</Typography>
              {final.selected_items_count > 0 ? (
                <Typography sx={{ color: '#047857' }}>Doorstep Delivery Charge: FREE (Waived on purchase)</Typography>
              ) : (
                <Typography sx={{ color: '#b45309' }}>Doorstep Delivery Charge (COD): ₹{final.final_payable}</Typography>
              )}
              <Typography variant="h6" sx={{ mt: 1, fontWeight: 800 }}>
                Total Cash Payable: ₹{final.final_payable}
              </Typography>
            </Paper>
          )}
          <Typography variant="body2" sx={{ color: '#6b7280' }}>
            Finalized purchases are non-refundable. Please verify your selection before confirming.
          </Typography>
          {!data.customer_approved ? (
            <Button
              disabled={busy}
              variant="contained"
              sx={{ bgcolor: '#111827', py: 1.2, fontWeight: 700 }}
              onClick={() => approve('cash')}
            >
              {final.final_payable > 0 ? `Approve Selection & Pay ₹${final.final_payable} Cash to Rider` : 'Approve Selection — No Balance Due'}
            </Button>
          ) : final.payment_status === 'paid' ? (
            <Alert severity="success">
              {final.final_payable ? 'Cash collection recorded by rider.' : 'No balance due.'}{' '}
              {['DELIVERED', 'NO_PURCHASE'].includes(data.try_order.status) ? 'Order completed.' : 'Delivery confirmation will follow.'}
            </Alert>
          ) : (
            <Stack spacing={1}>
              <Alert severity="success">
                Selection Submitted. Payment Mode: <strong>Cash on Delivery (COD)</strong>.
              </Alert>
              <Alert severity="warning">
                Please pay <strong>₹{final.final_payable} in cash</strong> directly to your assigned rider at the doorstep.
              </Alert>
            </Stack>
          )}
          {data.receipt_number && (
            <Button component="a" href={serverURL + '/api/receipt_download?order_id=' + encodeURIComponent(orderId)}>
              Download Payment Receipt
            </Button>
          )}
        </>
      )}
    </Stack>
  );
}
