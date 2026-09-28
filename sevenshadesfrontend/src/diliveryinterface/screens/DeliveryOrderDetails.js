import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Checkbox, FormControlLabel, Paper, Stack, Typography } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import DeliveryShell from '../components/DeliveryShell';
import { postData, serverURL } from '../../services/FetchDjangoApiServices';
import useOrderEvents from '../../services/useOrderEvents';
import { remainingTrialSeconds } from '../../services/trialTimer';

export default function DeliveryOrderDetails({ orderId, embedded = false }) {
  const params = useParams();
  const taskId = orderId || params.taskId;
  const Shell = embedded ? EmbeddedShell : DeliveryShell;
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const dirty = useRef(false);
  const offset = useRef(0);
  const load = useCallback(async () => {
    const result = await postData('settlement_detail', { order_id: taskId });
    if (!result.status) { setMessage(result.message); return; }
    const value = result.data;
    offset.current = Date.parse(value.server_time) - Date.now();
    setData(value);
    if (!dirty.current) setSelected(value.final_order ? value.final_order.finalorderitem_set.map(item => item.try_order_item) : value.try_order.tryorderitem_set.filter(item => item.status !== 'RETURNED').map(item => item.id));
  }, [taskId]);
  useEffect(() => { dirty.current = false; setData(null); load(); }, [load]);
  useOrderEvents(load, !!taskId, taskId);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const action = async (endpoint, payload) => {
    setBusy(true); setMessage('');
    const result = await postData(endpoint, payload);
    if (!result.status) setMessage(result.message); else { dirty.current = false; setMessage('Saved and synced.'); }
    await load(); setBusy(false);
  };
  const generateBill = async () => {
    setBusy(true); setMessage('');
    const result = await postData('submit_final_selection', {
      order_id: taskId,
      selected_items: selected.map(id => ({ try_order_item_id: id, qty: 1 }))
    });
    if (!result.status) {
      setMessage(result.message);
      setBusy(false);
      return;
    }
    const unselected = (data?.try_order?.tryorderitem_set || []).filter(item => !selected.includes(item.id) && item.status !== 'RETURNED');
    for (const item of unselected) {
      await postData('process_return', {
        try_order_item_id: item.id,
        condition: 'Good',
        tag_intact: true
      });
    }
    dirty.current = false;
    setMessage('Dynamic bill generated. Awaiting customer in-app approval.');
    await load();
    setBusy(false);
  };
  const final = data?.final_order;
  const remaining = remainingTrialSeconds(data?.trial_ends_at, now + offset.current);
  const stage = data?.assignment_status;
  const billItems = new Set(final?.finalorderitem_set.map(item => item.try_order_item) || []);
  const collected = data?.try_order.tryorderitem_set.every(item => billItems.has(item.id) || item.status === 'RETURNED' || !item.stock_reserved);
  const advance = status => action('delivery_assignment_update_status', { assignment_id: data.assignment_id, status });
  return <Shell title={'Doorstep order · ' + taskId} subtitle="Trial, customer approval and settlement" activePage="dashboard">
    <Stack spacing={2}>
      {!embedded && <Button onClick={() => navigate('/delivery/dashboard')}>Back to tasks</Button>}
      {message && <Alert severity="info">{message}</Alert>}
      {!data ? <Typography>Loading order…</Typography> : <>
        <Paper sx={{ p: 2 }}><Typography variant="h6">{data.try_order.order_id}</Typography>
          <Typography>{data.try_order.address_text}, {data.try_order.city} — {data.try_order.postcode}</Typography>
          <Typography>Customer: {data.try_order.mobileno} · Slot: {data.try_order.delivery_slot}</Typography>
          <Typography>Status: {data.try_order.status.replaceAll('_', ' ')}</Typography>
        </Paper>
        {stage === 'Assigned' && <Button disabled={busy} variant="contained" onClick={() => advance('On Route')}>Start Route</Button>}
        {stage === 'On Route' && <Button disabled={busy} variant="contained" onClick={() => advance('Trial In Progress')}>Arrived at Doorstep — Start 15-Minute Trial</Button>}
        <Paper sx={{ p: 2 }}><Typography variant="h6">Home trial timer</Typography>
          <Typography variant="h4">{data.trial_completed_at ? 'Trial completed' : remaining === null ? 'Not started' : Math.floor(remaining / 60) + ':' + String(remaining % 60).padStart(2, '0')}</Typography>
          {remaining === 0 && <Typography>Trial time elapsed. Confirm the customer selection; no automatic purchase is made.</Typography>}
          <Typography>The timer continues across refreshes.</Typography>
        </Paper>
        {stage === 'Trial In Progress' && <Button disabled={busy} variant="contained" onClick={() => advance('Trial Completed')}>Trial Completed — Open Customer Selection</Button>}
        {['Trial Completed', 'Delivered'].includes(stage) && <>
        <Typography variant="h6">Step 4: Doorstep Selection by Customer</Typography>
        <Typography variant="body2" color="text.secondary">Mark retained items as Purchased and handed-back items as Returned.</Typography>
        {data.try_order.tryorderitem_set.map(item => {
          const isSelected = selected.includes(item.id);
          const disabled = busy || stage !== 'Trial Completed' || item.status === 'RETURNED' || final?.payment_status === 'paid';
          return (
            <Paper key={item.id} sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              <Box>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isSelected}
                      disabled={disabled}
                      onChange={() => {
                        dirty.current = true;
                        setSelected(ids => isSelected ? ids.filter(id => id !== item.id) : [...ids, item.id]);
                      }}
                    />
                  }
                  label={
                    <Typography fontWeight={700}>
                      {item.product_name} · {item.size} · {item.color} · ₹{item.line_total}
                    </Typography>
                  }
                />
              </Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Button
                  size="small"
                  variant={isSelected ? 'contained' : 'outlined'}
                  color="success"
                  disabled={disabled}
                  onClick={() => {
                    dirty.current = true;
                    if (!isSelected) setSelected(ids => [...ids, item.id]);
                  }}
                >
                  ✓ Purchased
                </Button>
                <Button
                  size="small"
                  variant={!isSelected ? 'contained' : 'outlined'}
                  color="warning"
                  disabled={disabled}
                  onClick={() => {
                    dirty.current = true;
                    if (isSelected) setSelected(ids => ids.filter(id => id !== item.id));
                  }}
                >
                  ↺ Returned
                </Button>
              </Stack>
            </Paper>
          );
        })}
        <Button
          variant="contained"
          size="large"
          disabled={busy || stage !== 'Trial Completed' || final?.payment_status === 'paid'}
          onClick={generateBill}
          aria-label="Send Selection for Customer Approval"
          sx={{ py: 1.5, fontWeight: 700 }}
        >
          Generate Bill & Send for Customer Approval
        </Button>
        </>}
        {final && <Paper sx={{ p: 2 }}><Stack spacing={1}>
          <Typography variant="h6">{data.customer_approved ? 'Approved Bill' : 'Selection Awaiting Customer Approval'} · version {final.bill_revision}</Typography>
          {data.customer_approved && <Typography>Items Total: ₹{final.items_total} − Upfront Trial Fee: ₹{final.wallet_credit} = <strong>Final Cash Payable: ₹{final.final_payable}</strong></Typography>}
          <Alert severity={data.customer_approved ? 'success' : 'warning'}>
            {data.customer_approved ? 'Customer approved this bill in their app. Collect payment below.' : 'Waiting for customer in-app approval on their phone...'}
          </Alert>
          <Typography>Payment Mode: <strong>Cash on Delivery (COD Only)</strong> · Status: {final.payment_status}</Typography>
          {final.payment_status !== 'paid' && (
            <Button
              variant="contained"
              size="large"
              color="primary"
              disabled={busy || !data.customer_approved}
              onClick={() => action('final_payment_update', { order_id: taskId, bill_revision: final.bill_revision, payment_mode: 'cash', payment_status: 'paid' })}
              sx={{ py: 1.2, fontWeight: 700 }}
            >
              Confirm ₹{final.final_payable} Cash Physically Received
            </Button>
          )}
        </Stack></Paper>}
        {stage !== 'Delivered' && (
          <Button
            variant="contained"
            color="success"
            size="large"
            disabled={busy || !data.customer_approved || final?.payment_status !== 'paid' || stage !== 'Trial Completed'}
            onClick={() => advance('Delivered')}
            sx={{ py: 1.5, fontWeight: 700 }}
          >
            Confirm Delivery (Mark as DELIVERED)
          </Button>
        )}
        {data.receipt_number && (
          <Button
            variant="outlined"
            component="a"
            href={serverURL + '/api/receipt_download?order_id=' + encodeURIComponent(taskId)}
          >
            📄 Download Tax Invoice / Receipt
          </Button>
        )}
        <Button disabled={busy} onClick={load}>Refresh verified status</Button>
      </>}
    </Stack>
  </Shell>;
}

function EmbeddedShell({ children }) { return <div>{children}</div>; }
