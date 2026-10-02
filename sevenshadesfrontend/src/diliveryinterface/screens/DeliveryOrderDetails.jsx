import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Checkbox, FormControlLabel, Paper, Stack, Typography } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import DeliveryShell from '../components/DeliveryShell';
import DoordrapeLoader from '../../userinterface/components/DoordrapeLoader';
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
  const [loadError, setLoadError] = useState('');
  const [now, setNow] = useState(Date.now());
  const dirty = useRef(false);
  const offset = useRef(0);
  const load = useCallback(async () => {
    const result = await postData('settlement_detail', { order_id: taskId });
    if (!result.status) { setLoadError(result.message || 'Unable to load the order. Please retry.'); return; }
    setLoadError('');
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
    dirty.current = false;
    setMessage('Dynamic bill generated. Awaiting customer in-app approval.');
    await load();
    setBusy(false);
  };
  const final = data?.final_order;
  const purchasedIds = new Set(final?.finalorderitem_set.map(item => item.try_order_item) || []);
  const pendingReturns = final ? (data?.try_order?.tryorderitem_set || []).filter(
    item => !purchasedIds.has(item.id) && item.status !== 'RETURNED' && item.stock_reserved
  ) : [];
  const remaining = remainingTrialSeconds(data?.trial_ends_at, now + offset.current);
  const stage = data?.assignment_status;
  const advance = status => action('delivery_assignment_update_status', { assignment_id: data.assignment_id, status });
  return (
    <Shell title={'Doorstep order · ' + taskId} subtitle="Trial, customer approval and settlement" activePage="dashboard">
      <Box sx={{ position: 'relative' }}>
        {busy && <DoordrapeLoader overlay variant="delivery" dark text="Processing doorstep action…" />}
        <Stack spacing={2.5}>
          {!embedded && (
            <Button
              onClick={() => navigate('/delivery/dashboard')}
              sx={{ alignSelf: 'flex-start', color: '#38bdf8', fontWeight: 600, textTransform: 'none' }}
            >
              ← Back to tasks
            </Button>
          )}
          {message && <Alert severity="info" sx={{ bgcolor: 'rgba(14, 165, 233, 0.15)', color: '#38bdf8', border: '1px solid rgba(14, 165, 233, 0.3)' }}>{message}</Alert>}
          {loadError && <Alert severity="error" action={<Button color="inherit" onClick={load}>Retry</Button>}>{loadError}</Alert>}
          {!data && loadError ? null : !data ? (
            <DoordrapeLoader variant="delivery" dark text="Loading doorstep order…" role="status" />
          ) : (
            <>
              {/* Order Info Header Card */}
              <Paper sx={{ p: 2.5, borderRadius: 3, bgcolor: 'rgba(30, 41, 59, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#f8fafc', backdropFilter: 'blur(12px)' }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1} sx={{ mb: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#f8fafc', letterSpacing: 0.5 }}>
                    {data.try_order.order_id}
                  </Typography>
                  <Typography variant="body2" sx={{ bgcolor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', px: 1.5, py: 0.5, borderRadius: 2, fontWeight: 700, width: 'fit-content' }}>
                    Status: {data.try_order.status.replaceAll('_', ' ')}
                  </Typography>
                </Stack>
                <Typography sx={{ color: '#94a3b8', fontSize: '0.95rem', mt: 0.5 }}>
                  {data.try_order.address_text}, {data.try_order.city} — {data.try_order.postcode}
                </Typography>
                <Typography sx={{ color: '#64748b', fontSize: '0.85rem', mt: 0.5 }}>
                  Customer: {data.try_order.mobileno} · Slot: {data.try_order.delivery_slot}
                </Typography>
              </Paper>

              {stage === 'Assigned' && (
                <Button
                  disabled={busy}
                  variant="contained"
                  onClick={() => advance('On Route')}
                  sx={{ py: 1.5, fontWeight: 800, bgcolor: '#0284c7', '&:hover': { bgcolor: '#0369a1' }, borderRadius: 2.5 }}
                >
                  Start Route
                </Button>
              )}
              {stage === 'On Route' && (
                <Button
                  disabled={busy}
                  variant="contained"
                  onClick={() => advance('Trial In Progress')}
                  sx={{ py: 1.5, fontWeight: 800, bgcolor: '#059669', '&:hover': { bgcolor: '#047857' }, borderRadius: 2.5 }}
                >
                  Arrived at Doorstep — Start 15-Minute Trial
                </Button>
              )}

              {/* Home Trial Countdown Timer */}
              <Paper sx={{ p: 2.5, borderRadius: 3, bgcolor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(6, 182, 212, 0.3)', color: '#f8fafc', backdropFilter: 'blur(12px)' }}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#38bdf8', mb: 1 }}>Home trial timer</Typography>
                <Typography variant="h4" sx={{ fontWeight: 900, fontFamily: 'monospace', letterSpacing: 2, color: remaining === 0 ? '#f87171' : '#34d399' }}>
                  {data.trial_completed_at ? 'Trial completed' : remaining === null ? 'Not started' : Math.floor(remaining / 60) + ':' + String(remaining % 60).padStart(2, '0')}
                </Typography>
                {remaining === 0 && (
                  <Typography sx={{ color: '#fbbf24', mt: 1, fontWeight: 600 }}>
                    Trial time elapsed. Confirm the customer selection; no automatic purchase is made.
                  </Typography>
                )}
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.5 }}>
                  The timer continues across refreshes.
                </Typography>
              </Paper>

              {stage === 'Trial In Progress' && (
                <Button
                  disabled={busy}
                  variant="contained"
                  onClick={() => advance('Trial Completed')}
                  sx={{ py: 1.5, fontWeight: 800, bgcolor: '#059669', '&:hover': { bgcolor: '#047857' }, borderRadius: 2.5 }}
                >
                  Trial Completed — Open Customer Selection
                </Button>
              )}

              {['Trial Completed', 'Delivered'].includes(stage) && (
                <>
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#f8fafc' }}>
                      Step 4: Doorstep Selection by Customer
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                      Mark retained items as Purchased and handed-back items as Returned.
                    </Typography>
                  </Box>

                  {data.try_order.tryorderitem_set.map((item) => {
                    const isSelected = selected.includes(item.id);
                    const disabled = busy || stage !== 'Trial Completed' || item.status === 'RETURNED' || final?.payment_status === 'paid';
                    return (
                      <Paper
                        key={item.id}
                        sx={{
                          p: 2,
                          borderRadius: 2.5,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 1.5,
                          bgcolor: isSelected ? 'rgba(6, 78, 59, 0.4)' : 'rgba(30, 41, 59, 0.7)',
                          border: isSelected ? '1px solid rgba(52, 211, 153, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                          color: '#f8fafc',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <Box>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={isSelected}
                                disabled={disabled}
                                onChange={() => {
                                  dirty.current = true;
                                  setSelected((ids) => isSelected ? ids.filter((id) => id !== item.id) : [...ids, item.id]);
                                }}
                                sx={{ color: '#64748b', '&.Mui-checked': { color: '#34d399' } }}
                              />
                            }
                            label={
                              <Typography fontWeight={700} sx={{ color: '#f8fafc' }}>
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
                              if (!isSelected) setSelected((ids) => [...ids, item.id]);
                            }}
                            sx={{ fontWeight: 700 }}
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
                              if (isSelected) setSelected((ids) => ids.filter((id) => id !== item.id));
                            }}
                            sx={{ fontWeight: 700 }}
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
                    sx={{
                      py: 1.5,
                      fontWeight: 800,
                      borderRadius: 2.5,
                      bgcolor: '#059669',
                      '&:hover': { bgcolor: '#047857' },
                      boxShadow: '0 4px 14px rgba(5, 150, 105, 0.4)',
                    }}
                  >
                    Generate Bill & Send for Customer Approval
                  </Button>
                </>
              )}

              {final && (
                <Paper sx={{ p: 2.5, borderRadius: 3, bgcolor: 'rgba(30, 41, 59, 0.85)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#f8fafc' }}>
                  <Stack spacing={1.5}>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#f8fafc' }}>
                      {data.customer_approved ? 'Approved Bill' : 'Selection Awaiting Customer Approval'} · version {final.bill_revision}
                    </Typography>
                    {data.customer_approved && (
                      <Typography sx={{ color: '#e2e8f0' }}>
                        Items Total: ₹{final.items_total} − Upfront Trial Fee: ₹{final.wallet_credit} ={' '}
                        <strong style={{ color: '#34d399' }}>Final Cash Payable: ₹{final.final_payable}</strong>
                      </Typography>
                    )}
                    <Alert severity={data.customer_approved ? 'success' : 'warning'}>
                      {data.customer_approved
                        ? 'Customer approved this bill in their app. Collect payment below.'
                        : 'Waiting for customer in-app approval on their phone...'}
                    </Alert>
                    <Typography sx={{ color: '#94a3b8' }}>
                      Payment Mode: <strong style={{ color: '#f8fafc' }}>Cash on Delivery (COD Only)</strong> · Status: {final.payment_status}
                    </Typography>
                    {final.payment_status !== 'paid' && (
                      <Button
                        variant="contained"
                        size="large"
                        color="primary"
                        disabled={busy || !data.customer_approved}
                        onClick={() =>
                          action('final_payment_update', {
                            order_id: taskId,
                            bill_revision: final.bill_revision,
                            payment_mode: 'cash',
                            payment_status: 'paid',
                          })
                        }
                        sx={{ py: 1.4, fontWeight: 800, borderRadius: 2.5, bgcolor: '#0284c7', '&:hover': { bgcolor: '#0369a1' } }}
                      >
                        Confirm ₹{final.final_payable} Cash Physically Received
                      </Button>
                    )}
                  </Stack>
                </Paper>
              )}

              {final && pendingReturns.length > 0 && (
                <Paper sx={{ p: 2.5 }}>
                  <Typography variant="h6">Collect unpurchased items</Typography>
                  <Typography>After customer approval, confirm each item physically received from the customer.</Typography>
                  {pendingReturns.map(item => (
                    <Stack key={item.id} spacing={1} sx={{ mt: 2 }}>
                      <Typography>{item.product_name} · {item.size} · {item.color}</Typography>
                      {['Good', 'Damaged'].map(condition => (
                        <Button key={condition} disabled={busy || !!loadError || !data.customer_approved || dirty.current}
                          onClick={() => action('process_return', { try_order_item_id: item.id, condition })}>
                          Confirm {item.product_name} {item.size} {item.color} collected — {condition}
                        </Button>
                      ))}
                    </Stack>
                  ))}
                </Paper>
              )}

              {stage !== 'Delivered' && (
                <Button
                  variant="contained"
                  color="success"
                  size="large"
                  disabled={busy || !!loadError || pendingReturns.length > 0 || !data.customer_approved || final?.payment_status !== 'paid' || stage !== 'Trial Completed'}
                  onClick={() => advance('Delivered')}
                  sx={{ py: 1.5, fontWeight: 800, borderRadius: 2.5 }}
                >
                  Confirm Delivery (Mark as DELIVERED)
                </Button>
              )}

              {data.receipt_number && (
                <Button
                  variant="outlined"
                  component="a"
                  href={serverURL + '/api/receipt_download?order_id=' + encodeURIComponent(taskId)}
                  sx={{ color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)' }}
                >
                  📄 Download Payment Receipt
                </Button>
              )}

              <Button disabled={busy} onClick={load} sx={{ color: '#94a3b8', textTransform: 'none' }}>
                Refresh verified status
              </Button>
            </>
          )}
        </Stack>
      </Box>
    </Shell>
  );
}

function EmbeddedShell({ children }) { return <div>{children}</div>; }
