import LocationButton from '../../services/LocationButton';
import DoordrapeLoader from '../../userinterface/components/DoordrapeLoader';
import useOrderEvents from '../../services/useOrderEvents';
import { useEffect, useMemo, useRef, useState } from 'react';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import DeliveryTaskCard from '../components/DeliveryTaskCard';
import StatCard from '../components/StatCard';
import { fetchDeliveryTasksFromApi, getDeliveryLogin, getDeliveryTasks, updateAssignmentStatusApi, updateDeliveryTask } from '../data/deliverySessionStore';
import { useNavigate } from 'react-router-dom';
import DeliveryShell from '../components/DeliveryShell';

export default function DeliveryHome() {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [tasks, setTasks] = useState([]);
  const [loginData, setLoginData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const inFlight = useRef(false);

  const loadTasks = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    try {
      const active = getDeliveryLogin();
      const next = await fetchDeliveryTasksFromApi(active?.phone);
      setTasks(next);
      setLoadError('');
    } catch {
      setLoadError('Delivery tasks could not be refreshed. Retry before updating an order.');
    } finally {
      setLoading(false);
      inFlight.current = false;
    }
  };

  useOrderEvents(loadTasks);
  useEffect(() => {
    const active = getDeliveryLogin();
    if (!active?.phone) {
      navigate('/delivery/login');
      return;
    }
    setLoginData(active);
    loadTasks();
  }, [navigate]);

  const stats = useMemo(() => {
    const assigned = tasks.filter((item) => item.status === 'assigned').length;
    const completed = tasks.filter((item) => item.status === 'completed').length;
    const pendingFee = tasks.filter((item) => item.feeAmount > 0 && item.status !== 'completed').length;
    return [
      { key: 'assigned', label: 'Assigned Trials', value: assigned },
      { key: 'completed', label: 'Completed Trials', value: completed },
      { key: 'pendingFee', label: 'Pending Fee Collection', value: pendingFee },
      { key: 'orders', label: 'Total Orders', value: tasks.length },
    ];
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    if (tab === 0) return tasks;
    if (tab === 1) return tasks.filter((item) => item.status !== 'completed');
    return tasks.filter((item) => item.status === 'completed');
  }, [tasks, tab]);

  const handleStatusChange = (taskId, nextStatus) => {
    const updateStatus = async () => {
      if (loadError || loading) return;
      const currentTask = tasks.find((item) => item.id === taskId);
      if (!currentTask?.assignmentId) return;

      const ok = await updateAssignmentStatusApi(currentTask.assignmentId, nextStatus);
      if (!ok) {
        alert('Unable to update assignment status.');
        return;
      }

      updateDeliveryTask(taskId, { status: nextStatus });
      setTasks(getDeliveryTasks());
    };

    updateStatus();
  };

  const handleOpenDetails = (taskId) => {
    navigate(`/delivery/order/${taskId}`);
  };

  return (
    <DeliveryShell
      title="Delivery Dashboard"
      subtitle={`${loginData?.name || 'Delivery Rider'} • ${loginData?.zone || 'Assigned Zone'} • ${loginData?.phone || ''}`}
      activePage="dashboard"
    >
      <LocationButton rider />
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: 3.5,
          bgcolor: 'rgba(30, 41, 59, 0.75)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          mb: 3,
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center" useFlexGap flexWrap="wrap">
          <Avatar
            sx={{
              width: 58,
              height: 58,
              bgcolor: 'rgba(16, 185, 129, 0.2)',
              border: '2px solid #10b981',
              color: '#34d399',
            }}
          >
            <LocalShippingRoundedIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 140, overflowWrap: 'anywhere' }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#f8fafc' }}>
              {loginData?.name || 'Partner Rider'}
            </Typography>
            <Typography variant="body2" sx={{ color: '#94a3b8' }}>
              Active Zone: {loginData?.zone || 'Central Hub'}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ maxWidth: '100%' }}>
            <Chip
              label={loginData?.status || 'Active'}
              sx={{ bgcolor: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontWeight: 700 }}
            />
            <Chip
              label={loginData?.bike_number || 'Partner Vehicle'}
              sx={{ bgcolor: 'rgba(255, 255, 255, 0.08)', color: '#cbd5e1', maxWidth: '100%' }}
            />
          </Stack>
        </Stack>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {stats.map((item) => (
          <Grid item xs={6} md={3} key={item.key}>
            <StatCard label={item.label} value={loadError || loading ? '—' : item.value} />
          </Grid>
        ))}
      </Grid>

      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: 3.5,
          bgcolor: 'rgba(30, 41, 59, 0.75)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ gap: 1, flexWrap: 'wrap' }}>
          <Typography sx={{ fontWeight: 800, color: '#ffffff', fontSize: '1.05rem' }}>
            Assigned Orders (Live Route Sequence)
          </Typography>
          <Stack direction="row" spacing={1}>
            <Chip
              size="small"
              label="Route optimized"
              sx={{ bgcolor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontWeight: 700 }}
            />
            <Button
              size="small"
              variant="outlined"
              sx={{ color: '#cbd5e1', borderColor: 'rgba(255, 255, 255, 0.2)' }}
              onClick={loadTasks}
              disabled={loading}
            >
              Refresh
            </Button>
          </Stack>
        </Stack>

        <Tabs
          value={tab}
          onChange={(_, value) => setTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            mt: 1.5,
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            '& .MuiTab-root': { color: '#94a3b8', fontWeight: 700, textTransform: 'none', fontSize: '0.95rem', '&.Mui-selected': { color: '#34d399' } },
            '& .MuiTabs-indicator': { bgcolor: '#10b981', height: 3 },
          }}
        >
          <Tab label="All Tasks" />
          <Tab label="In Progress" />
          <Tab label="Completed" />
        </Tabs>

        <Stack spacing={1.5} sx={{ mt: 2 }}>
          {loading ? (
            <DoordrapeLoader variant="delivery" text="Syncing assigned delivery tasks…" role="status" size="small" />
          ) : loadError ? (
            <Alert severity="error" action={<Button color="inherit" onClick={loadTasks}>Retry</Button>}>{loadError}</Alert>
          ) : filteredTasks.length === 0 ? (
            <Typography variant="body2" sx={{ color: '#6b7280' }}>No tasks available.</Typography>
          ) : (
            filteredTasks.map((task) => (
              <DeliveryTaskCard
                key={task.id}
                task={task}
                onStatusChange={handleStatusChange}
                onOpenDetails={handleOpenDetails}
              />
            ))
          )}
        </Stack>
      </Paper>
    </DeliveryShell>
  );
}
