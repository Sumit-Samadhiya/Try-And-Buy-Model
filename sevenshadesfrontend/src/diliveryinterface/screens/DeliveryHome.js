import { useEffect, useMemo, useState } from 'react';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
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

  const loadTasks = async () => {
    setLoading(true);
    const active = getDeliveryLogin();
    const next = await fetchDeliveryTasksFromApi(active?.phone);
    setTasks(next);
    setLoading(false);
  };

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
      { key: 'completed', label: 'Completed Today', value: completed },
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
      <Paper elevation={0} sx={{ p: 2.5, borderRadius: 4, border: '1px solid #e5e7eb', mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar sx={{ width: 58, height: 58, bgcolor: '#111827' }}>
            <LocalShippingRoundedIcon />
          </Avatar>
          <Stack direction="row" spacing={1}>
            <Chip label={loginData?.status || 'Active'} color="success" />
            <Chip label={loginData?.bike_number || 'Bike'} variant="outlined" />
          </Stack>
        </Stack>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {stats.map((item) => (
          <Grid item xs={6} md={3} key={item.key}>
            <StatCard label={item.label} value={item.value} />
          </Grid>
        ))}
      </Grid>

      <Paper elevation={0} sx={{ p: 2, borderRadius: 4, border: '1px solid #e5e7eb' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ gap: 1, flexWrap: 'wrap' }}>
          <Typography sx={{ fontWeight: 800, color: '#111827' }}>Assigned Orders (Route Sorted)</Typography>
          <Stack direction="row" spacing={1}>
            <Chip size="small" label="Route optimized" color="info" />
            <Button size="small" variant="outlined" onClick={loadTasks}>Refresh</Button>
          </Stack>
        </Stack>

        <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" scrollButtons="auto" sx={{ mt: 1 }}>
          <Tab label="All" />
          <Tab label="Active" />
          <Tab label="Completed" />
        </Tabs>

        <Stack spacing={1.5} sx={{ mt: 2 }}>
          {loading ? (
            <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={24} /></Stack>
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
