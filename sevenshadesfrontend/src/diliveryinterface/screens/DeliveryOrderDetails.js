import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchDeliveryTasksFromApi, getDeliveryLogin, getDeliveryTaskById, updateAssignmentStatusApi, updateDeliveryTask } from '../data/deliverySessionStore';
import DeliveryShell from '../components/DeliveryShell';
import { postData } from '../../services/FetchDjangoApiServices';

const STATUS_MAP = {
  'TRY_REQUESTED': 'Try Requested',
  'ASSIGNED': 'Assigned',
  'OUT_FOR_TRIAL': 'Out for Trial',
  'TRIAL_IN_PROGRESS': 'Trial in Progress',
  'SELECTION_SUBMITTED': 'Selection Submitted',
  'DELIVERED': 'Delivered',
  'CANCELLED': 'Cancelled'
};

export default function DeliveryOrderDetails() {
  const navigate = useNavigate();
  const { taskId } = useParams();

  const [task, setTask] = useState(null);
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [customerApproved, setCustomerApproved] = useState(false);
  const [paymentMode, setPaymentMode] = useState('upi');
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [liveSyncStatus, setLiveSyncStatus] = useState('idle');
  const [startTime, setStartTime] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!task) return;
    const socket = new WebSocket(`ws://${window.location.host}/ws/order/${task.id}/`);
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'ORDER_STATUS_UPDATED') {
        console.log('Order updated:', data.data);
        // Optionally update task state here
      }
    };
    return () => socket.close();
  }, [task]);

  useEffect(() => {
    const active = getDeliveryLogin();
    if (!active?.phone) {
      navigate('/delivery/login');
      return;
    }

    const loadTask = async () => {
      setLoading(true);
      await fetchDeliveryTasksFromApi(active?.phone);
      const currentTask = getDeliveryTaskById(taskId);
      if (!currentTask) {
        navigate('/delivery/dashboard');
        setLoading(false);
        return;
      }

      setTask(currentTask);
      setSelectedItemIds(currentTask.items.map((item) => item.id));
      setLoading(false);
    };

    loadTask();
  }, [taskId, navigate]);

  useEffect(() => {
    if (!startTime) return;
    const timer = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  const selectedItemTotal = useMemo(() => {
    if (!task) return 0;
    return task.items
      .filter((item) => selectedItemIds.includes(item.id))
      .reduce((sum, item) => sum + item.price, 0) + task.feeAmount;
  }, [task, selectedItemIds]);

  const toggleItem = (itemId) => {
    setSelectedItemIds((prev) => (prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]));
  };

  const markLiveSync = () => {
    setLiveSyncStatus('syncing');
    setTimeout(() => {
      setLiveSyncStatus('synced');
    }, 800);
  };

  const handleCompleteFlow = async () => {
    if (!task) return;
    if (!customerApproved) {
      alert('Please click Customer Approved before final completion.');
      return;
    }

    const selectionResult = await postData('submit_final_selection', {
      order_id: task.id,
      selected_items: selectedItemIds.map(id => ({ try_order_item_id: id, qty: 1 })),
    });

    if (!selectionResult?.status) {
      alert(selectionResult?.message || 'Unable to sync delivery selection.');
      return;
    }

    const paymentResult = await postData('final_payment_update', {
      order_id: task.id,
      payment_mode: paymentMode,
      payment_status: paymentStatus,
    });

    if (!paymentResult?.status) {
      alert(paymentResult?.message || 'Unable to update payment status.');
      return;
    }

    await updateAssignmentStatusApi(task.assignmentId, paymentStatus === 'paid' ? 'completed' : 'trial_in_progress');

    updateDeliveryTask(task.id, {
      status: paymentStatus === 'paid' ? 'completed' : 'trial_in_progress',
      selectedItemIds,
      selectedItems: task.items.filter((item) => selectedItemIds.includes(item.id)),
      totalCollected: selectedItemTotal,
      paymentMode,
      paymentStatus,
      liveSyncStatus: 'synced',
    });

    alert('Delivery flow completed and synced to backend.');
    navigate('/delivery/dashboard');
  };

  const [trialSecondsLeft, setTrialSecondsLeft] = useState(900); // 15 mins = 900 seconds
  const [timerRunning, setTimerRunning] = useState(false);
  const [tagChecks, setTagChecks] = useState({});

  useEffect(() => {
    let timer;
    if (timerRunning && trialSecondsLeft > 0) {
      timer = setInterval(() => {
        setTrialSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (trialSecondsLeft === 0) {
      setTimerRunning(false);
    }
    return () => clearInterval(timer);
  }, [timerRunning, trialSecondsLeft]);

  const toggleTagCheck = (itemId) => {
    setTagChecks((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const formatCountdown = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (loading || !task) {
    return (
      <DeliveryShell title="Order Details" subtitle="Loading..." activePage="dashboard">
        <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress /></Stack>
      </DeliveryShell>
    );
  }

  return (
    <DeliveryShell
      title={`Order Details • ${task.id}`}
      subtitle="Step by step delivery trial workflow"
      activePage="dashboard"
    >
      <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid #e5e7eb' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip size="small" label={`Route #${task.routeOrder}`} color="info" />
            <Chip
              size="small"
              label={task.delivery_mode === 'emergency_sos' ? '⚡ Emergency SOS (90-120 Min)' : '🚚 Standard Try & Buy'}
              color={task.delivery_mode === 'emergency_sos' ? 'error' : 'default'}
              sx={{ fontWeight: 800 }}
            />
          </Stack>
          <Button variant="outlined" onClick={() => navigate('/delivery/dashboard')}>Back</Button>
        </Stack>

        <Typography sx={{ mt: 1.5, fontWeight: 800, fontSize: 18 }}>{task.customerName}</Typography>
        <Typography variant="body2" sx={{ color: '#6b7280' }}>Phone: {task.customerPhone}</Typography>
        <Typography variant="body2" sx={{ color: '#374151', fontWeight: 600 }}>Address: {task.address}</Typography>
        <Typography variant="body2" sx={{ color: '#6b7280' }}>Slot: {task.slot}</Typography>
        <Typography variant="body2" sx={{ color: '#6b7280', fontWeight: 700 }}>Status: {STATUS_MAP[task.status] || task.status}</Typography>

        <Divider sx={{ my: 2 }} />

        {/* 15-MINUTE LIVE COUNTDOWN TIMER WIDGET */}
        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, bgcolor: trialSecondsLeft === 0 ? '#fef2f2' : '#f0fdf4', border: trialSecondsLeft === 0 ? '2px solid #ef4444' : '2px solid #22c55e', mb: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: trialSecondsLeft === 0 ? '#991b1b' : '#15803d' }}>
                ⏱️ 15-Minute Doorstep Trial Timer
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 900, color: trialSecondsLeft === 0 ? '#dc2626' : '#166534', fontFamily: 'monospace', my: 0.5 }}>
                {formatCountdown(trialSecondsLeft)}
              </Typography>
              <Typography variant="caption" sx={{ color: trialSecondsLeft === 0 ? '#b91c1c' : '#16a34a', fontWeight: 600 }}>
                {trialSecondsLeft === 0 ? '⚠️ 15-Minute Cap Reached! Please guide customer to conclude trial.' : 'Hard cap timer for doorstep trial & fitting check.'}
              </Typography>
            </Box>

            <Stack spacing={1}>
              {!timerRunning ? (
                <Button size="small" variant="contained" color="success" onClick={() => setTimerRunning(true)} sx={{ fontWeight: 800 }}>
                  Start 15m Timer
                </Button>
              ) : (
                <Button size="small" variant="contained" color="warning" onClick={() => setTimerRunning(false)} sx={{ fontWeight: 800 }}>
                  Pause Timer
                </Button>
              )}
              <Button size="small" variant="outlined" onClick={() => { setTimerRunning(false); setTrialSecondsLeft(900); }}>
                Reset Timer
              </Button>
            </Stack>
          </Stack>

          <LinearProgress
            variant="determinate"
            value={((900 - trialSecondsLeft) / 900) * 100}
            color={trialSecondsLeft < 180 ? 'error' : 'success'}
            sx={{ mt: 1.5, height: 8, borderRadius: 4 }}
          />
        </Paper>

        <Typography sx={{ fontWeight: 800, color: '#111827' }}>Step 1: Doorstep Arrival</Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 1, mb: 2 }}>
          <Button
            variant="contained"
            onClick={async () => {
              setStartTime(Date.now());
              setTimerRunning(true);
              await updateAssignmentStatusApi(task.assignmentId, 'on_the_way');
              updateDeliveryTask(task.id, { status: 'on_the_way' });
            }}
          >
            Arrived at Doorstep
          </Button>
          <Button variant="outlined" onClick={() => alert(`Calling ${task.customerName} (${task.customerPhone})`)}>Call Customer</Button>
        </Stack>

        <Typography sx={{ fontWeight: 800, color: '#111827' }}>Step 2: Trial & Security Tag Inspection</Typography>
        <Typography variant="body2" sx={{ color: '#6b7280', mb: 1 }}>
          Check tamper-proof barcode security tags before accepting return items.
        </Typography>

        <Stack spacing={1} sx={{ mb: 2 }}>
          {task.items.map((item) => (
            <Paper key={item.id} elevation={0} sx={{ p: 1.5, borderRadius: 2, border: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <FormControlLabel
                  control={<Checkbox checked={selectedItemIds.includes(item.id)} onChange={() => toggleItem(item.id)} />}
                  label={<Typography variant="body2" sx={{ fontWeight: 700 }}>{item.name} (₹{item.price})</Typography>}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={!!tagChecks[item.id]}
                      onChange={() => toggleTagCheck(item.id)}
                      color="success"
                      size="small"
                    />
                  }
                  label={<Typography variant="caption" sx={{ fontWeight: 700, color: tagChecks[item.id] ? '#16a34a' : '#64748b' }}>Barcode Tag Intact</Typography>}
                />
              </Stack>
            </Paper>
          ))}
        </Stack>

        <Typography sx={{ fontWeight: 800, mt: 2, color: '#111827' }}>Step 3: Final Approval & Collection</Typography>
        <Typography variant="body2" sx={{ color: '#6b7280' }}>
          Selected Items for Purchase: {task.items.filter((item) => selectedItemIds.includes(item.id)).map((item) => item.name).join(', ') || 'None (Zero Purchase)'}
        </Typography>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 1, color: '#111827' }}>Total Payable Amount: ₹{selectedItemTotal}</Typography>

        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <Button size="small" variant={paymentMode === 'upi' ? 'contained' : 'outlined'} onClick={() => setPaymentMode('upi')}>UPI</Button>
          <Button size="small" variant={paymentMode === 'cash' ? 'contained' : 'outlined'} onClick={() => setPaymentMode('cash')}>Cash</Button>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <Button size="small" color={paymentStatus === 'paid' ? 'success' : 'inherit'} variant={paymentStatus === 'paid' ? 'contained' : 'outlined'} onClick={() => setPaymentStatus('paid')}>Paid</Button>
          <Button size="small" color={paymentStatus === 'pending' ? 'warning' : 'inherit'} variant={paymentStatus === 'pending' ? 'contained' : 'outlined'} onClick={() => setPaymentStatus('pending')}>Pending</Button>
        </Stack>

        <Button sx={{ mt: 2 }} color="success" variant="outlined" fullWidth onClick={() => { setCustomerApproved(true); markLiveSync(); }}>
          Mark Customer Approved
        </Button>

        <Chip
          sx={{ mt: 2 }}
          size="small"
          label={liveSyncStatus === 'synced' ? 'Live Sync: User cart updated' : liveSyncStatus === 'syncing' ? 'Live Sync: Updating...' : 'Live Sync: Ready'}
          color={liveSyncStatus === 'synced' ? 'success' : 'default'}
        />

        <Button sx={{ mt: 2 }} fullWidth variant="contained" color="success" onClick={handleCompleteFlow}>
          Complete Doorstep Flow
        </Button>
      </Paper>
    </DeliveryShell>
  );
}
