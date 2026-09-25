import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Checkbox, FormControlLabel, Paper, Stack, Typography } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import DeliveryShell from '../components/DeliveryShell';
import { postData, serverURL } from '../../services/FetchDjangoApiServices';
import { TrialReturnCollection } from '../../services/TrialInventoryControls';
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
        <Typography variant="h6">Selection by Customer</Typography>
        {data.try_order.tryorderitem_set.map(item => <Paper key={item.id} sx={{ p: 1 }}>
          <FormControlLabel control={<Checkbox checked={selected.includes(item.id)} disabled={busy || stage !== 'Trial Completed' || item.status === 'RETURNED' || final?.payment_status === 'paid'} onChange={() => { dirty.current = true; setSelected(ids => ids.includes(item.id) ? ids.filter(id => id !== item.id) : [...ids, item.id]); }} />}
            label={item.product_name + ' · ' + item.size + ' · ' + item.color + ' · ₹' + item.line_total} />
          <Typography>{item.status === 'RETURNED' ? 'Collection recorded' : selected.includes(item.id) ? 'Selected for purchase' : 'To be returned'}</Typography>
        </Paper>)}
        <Button variant="contained" disabled={busy || stage !== 'Trial Completed' || final?.payment_status === 'paid'} onClick={() => action('submit_final_selection', { order_id: taskId, selected_items: selected.map(id => ({ try_order_item_id: id, qty: 1 })) })}>Send Selection for Customer Approval</Button>
        </>}
        {final && <Paper sx={{ p: 2 }}><Stack spacing={1}>
          <Typography variant="h6">{data.customer_approved ? 'Approved bill' : 'Selection awaiting approval'} · version {final.bill_revision}</Typography>
          {data.customer_approved && <Typography>Items ₹{final.items_total} − verified trial fee ₹{final.wallet_credit} = ₹{final.final_payable}</Typography>}
          <Alert severity={data.customer_approved ? 'success' : 'warning'}>{data.customer_approved ? 'Customer approved this bill in their app.' : 'Waiting for customer in-app approval. Rider cannot approve on their behalf.'}</Alert>
          <Typography>Payment Mode: Cash on Delivery (COD) · Status: {final.payment_status}</Typography>
          {final.payment_status !== 'paid' && <Button variant="contained" disabled={busy || !data.customer_approved} onClick={() => action('final_payment_update', { order_id: taskId, bill_revision: final.bill_revision, payment_mode: 'cash', payment_status: 'paid' })}>Confirm ₹{final.final_payable} Cash Physically Received</Button>}
        </Stack></Paper>}
        {final && <TrialReturnCollection key={final.bill_revision} orderId={taskId} onCollected={load} />}
        {stage !== 'Delivered' && <Button variant="contained" color="success" disabled={busy || !data.customer_approved || final?.payment_status !== 'paid' || !collected || stage !== 'Trial Completed'} onClick={() => advance('Delivered')}>Confirm Delivery</Button>}
        {data.receipt_number && <Button component="a" href={serverURL + '/api/receipt_download?order_id=' + encodeURIComponent(taskId)}>Download Payment Receipt</Button>}
        <Button disabled={busy} onClick={load}>Refresh verified status</Button>
      </>}
    </Stack>
  </Shell>;
}

function EmbeddedShell({ children }) { return <div>{children}</div>; }
