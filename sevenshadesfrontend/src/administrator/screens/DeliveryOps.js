import DeliveryOrderDetails from '../../diliveryinterface/screens/DeliveryOrderDetails';
import RiderSuggestions from './RiderSuggestions';
import useOrderEvents from '../../services/useOrderEvents';
import DeliveryBatches from './DeliveryBatches';
import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { getData, postData } from '../../services/FetchDjangoApiServices';

export default function DeliveryOps() {
  const [settlementOrder, setSettlementOrder] = useState(null);
  const [tabValue, setTabValue] = useState(0);

  const [riders, setRiders] = useState([]);
  const [orders, setOrders] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);

  const [riderForm, setRiderForm] = useState({
    name: '',
    phone: '',
    password: '',
    bikeNumber: '',
    zone: '',
    status: 'Active',
  });

  const [assignOrderId, setAssignOrderId] = useState('');
  const [assignRiderId, setAssignRiderId] = useState('');
  const [assignmentStatus, setAssignmentStatus] = useState('Assigned');

  const [filterRider, setFilterRider] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterDate, setFilterDate] = useState('');

  const loadAll = async () => {
    setLoading(true);
    const [riderResult, orderResult, assignmentResult] = await Promise.all([
      getData('delivery_rider_list'),
      getData('admin_order_lifecycle_list'),
      getData('delivery_assignments_list'),
    ]);

    setRiders(riderResult?.status ? riderResult.data || [] : []);
    const allTryOrders = (orderResult?.status ? orderResult.data || [] : []).map((row) => row.try_order).filter(Boolean);
    setOrders(allTryOrders);
    setAssignments(assignmentResult?.status ? assignmentResult.data || [] : []);
    setLoading(false);
  };

  useOrderEvents(loadAll);
  useEffect(() => {
    loadAll();
  }, []);

  const assignedOrderIds = useMemo(() => new Set(assignments.map((row) => row?.try_order?.order_id)), [assignments]);
  const unassignedOrders = useMemo(() => orders.filter((row) => row.status === 'TRY_REQUESTED' && !assignedOrderIds.has(row.order_id)), [orders, assignedOrderIds]);

  const handleCreateRider = async () => {
    if (!riderForm.name || !riderForm.phone || !riderForm.password || !riderForm.bikeNumber || !riderForm.zone) {
      alert('Please fill all rider registration fields.');
      return;
    }

    const result = await postData('delivery_rider_create', {
      name: riderForm.name,
      phone: riderForm.phone,
      password: riderForm.password,
      bike_number: riderForm.bikeNumber,
      zone: riderForm.zone,
      status: riderForm.status,
    });

    if (!result?.status) {
      alert(result?.message || 'Unable to create rider.');
      return;
    }

    setRiderForm({
      name: '',
      phone: '',
      password: '',
      bikeNumber: '',
      zone: '',
      status: 'Active',
    });
    loadAll();
  };

  const handleAssignOrder = async () => {
    if (!assignOrderId || !assignRiderId) {
      alert('Please select order and rider first.');
      return;
    }

    const result = await postData('delivery_assign_order', {
      order_id: assignOrderId,
      rider_id: assignRiderId,
      status: assignmentStatus,
    });

    if (!result?.status) {
      alert(result?.message || 'Unable to assign order.');
      return;
    }

    setAssignOrderId('');
    setAssignRiderId('');
    setAssignmentStatus('Assigned');
    loadAll();
  };

  const updateAssignmentStatus = async (assignmentId, nextStatus) => {
    const result = await postData('delivery_assignment_update_status', {
      assignment_id: assignmentId,
      status: nextStatus,
    });

    if (!result?.status) {
      alert(result?.message || 'Unable to update assignment status.');
      return;
    }

    if (nextStatus === 'Trial Completed') {
      const row = assignments.find(item => item.assignment_id === assignmentId);
      setSettlementOrder(row?.try_order?.order_id);
    }
    loadAll();
  };

  const filteredAssignments = useMemo(() => {
    return assignments.filter((row) => {
      const riderMatch = filterRider === 'ALL' || row?.rider?.rider_id === filterRider;
      const statusMatch = filterStatus === 'ALL' || row?.status === filterStatus;
      const dateMatch =
        !filterDate ||
        new Date(row?.assigned_at).toISOString().slice(0, 10) === filterDate;
      return riderMatch && statusMatch && dateMatch;
    });
  }, [assignments, filterRider, filterStatus, filterDate]);

  return (
    <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid #e5e7eb' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#111827' }}>
            Delivery Ops
          </Typography>
          <Typography variant="body2" sx={{ color: '#6b7280' }}>
            Fully dynamic rider registration, order assignment, and status tracking.
          </Typography>
        </Box>
        <Button size="small" variant="outlined" onClick={loadAll}>Refresh</Button>
      </Stack>

      <Dialog open={!!settlementOrder} onClose={() => setSettlementOrder(null)} maxWidth="md" fullWidth><DialogTitle>Customer Selection & Settlement <Button onClick={() => setSettlementOrder(null)}>Close</Button></DialogTitle><DialogContent>{settlementOrder && <DeliveryOrderDetails key={settlementOrder} orderId={settlementOrder} embedded />}</DialogContent></Dialog>
      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} variant="scrollable" scrollButtons="auto">
        <Tab label="Rider Registration" />
        <Tab label="Order Assignment" />
        <Tab label="Latest Status" />
      </Tabs>

      {loading ? (
        <Stack alignItems="center" sx={{ py: 6 }}>
          <CircularProgress />
        </Stack>
      ) : null}

      {tabValue === 0 && !loading && (
        <Box sx={{ mt: 2 }}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid #e5e7eb' }}>
            <Typography sx={{ fontWeight: 700, mb: 1.5 }}>Create Delivery Rider Account</Typography>
            <Grid container spacing={1.5}>
              <Grid item xs={12} md={6}>
                <TextField label="Rider Name" fullWidth size="small" value={riderForm.name} onChange={(e) => setRiderForm({ ...riderForm, name: e.target.value })} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField label="Login Mobile Number" fullWidth size="small" value={riderForm.phone} onChange={(e) => setRiderForm({ ...riderForm, phone: e.target.value })} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField label="Password" fullWidth size="small" value={riderForm.password} onChange={(e) => setRiderForm({ ...riderForm, password: e.target.value })} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField label="Bike Number" fullWidth size="small" value={riderForm.bikeNumber} onChange={(e) => setRiderForm({ ...riderForm, bikeNumber: e.target.value })} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField label="Zone" fullWidth size="small" value={riderForm.zone} onChange={(e) => setRiderForm({ ...riderForm, zone: e.target.value })} />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select label="Status" value={riderForm.status} onChange={(e) => setRiderForm({ ...riderForm, status: e.target.value })}>
                    <MenuItem value="Active">Active</MenuItem>
                    <MenuItem value="Inactive">Inactive</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Button sx={{ mt: 2 }} variant="contained" onClick={handleCreateRider}>
              Create Rider Login
            </Button>
          </Paper>

          <Paper elevation={0} sx={{ p: 2, mt: 2, borderRadius: 2, border: '1px solid #e5e7eb' }}>
            <Typography sx={{ fontWeight: 700, mb: 1.5 }}>Registered Riders</Typography>
            <Stack spacing={1}>
              {riders.length === 0 ? (
                <Typography variant="body2" sx={{ color: '#6b7280' }}>No riders found.</Typography>
              ) : riders.map((rider) => (
                <Paper key={rider.rider_id} elevation={0} sx={{ p: 1.5, border: '1px solid #e5e7eb', borderRadius: 1.5 }}>
                  <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1}>
                    <Box>
                      <Typography sx={{ fontWeight: 700 }}>{rider.name}</Typography>
                      <Typography variant="body2" sx={{ color: '#6b7280' }}>
                        Rider ID: {rider.rider_id} • Login: {rider.phone}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#6b7280' }}>
                        Bike: {rider.bike_number} • Zone: {rider.zone}
                      </Typography>
                    </Box>
                    <Chip size="small" label={rider.status} color={rider.status === 'Active' ? 'success' : 'default'} />
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Paper>
        </Box>
      )}

      {tabValue === 1 && !loading && (
        <Box sx={{ mt: 2 }}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid #e5e7eb' }}>
            <Typography sx={{ fontWeight: 700, mb: 1.5 }}>Assign Order To Rider</Typography>
            <RiderSuggestions orderId={assignOrderId} onSelect={setAssignRiderId} />
            <Grid container spacing={1.5}>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Select Order</InputLabel>
                  <Select label="Select Order" value={assignOrderId} onChange={(e) => setAssignOrderId(e.target.value)}>
                    {unassignedOrders.map((order) => (
                      <MenuItem key={order.order_id} value={order.order_id}>
                        {order.order_id} • {order.mobileno}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Select Rider</InputLabel>
                  <Select label="Select Rider" value={assignRiderId} onChange={(e) => setAssignRiderId(e.target.value)}>
                    {riders.filter((rider) => rider.status === 'Active').map((rider) => (
                      <MenuItem key={rider.rider_id} value={rider.rider_id}>
                        {rider.name} • {rider.zone}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select label="Status" value={assignmentStatus} onChange={(e) => setAssignmentStatus(e.target.value)}>
                    <MenuItem value="Assigned">Assigned</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <Button sx={{ mt: 2 }} variant="contained" onClick={handleAssignOrder}>
              Assign Order
            </Button>
          </Paper>

          <Paper elevation={0} sx={{ p: 2, mt: 2, borderRadius: 2, border: '1px solid #e5e7eb' }}>
            <DeliveryBatches riders={riders} onAssigned={loadAll} />
            <Typography sx={{ fontWeight: 700, mb: 1.5 }}>Current Assignments</Typography>
            <Stack spacing={1}>
              {assignments.length === 0 ? (
                <Typography variant="body2" sx={{ color: '#6b7280' }}>
                  No assignments yet.
                </Typography>
              ) : (
                assignments.map((row) => (
                  <Paper key={row.assignment_id} elevation={0} sx={{ p: 1.5, border: '1px solid #e5e7eb', borderRadius: 1.5 }}>
                    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1}>
                      <Box>
                        <Typography sx={{ fontWeight: 700 }}>{row?.try_order?.order_id} • {row?.try_order?.mobileno}</Typography>
                        <Typography variant="body2" sx={{ color: '#6b7280' }}>
                          Rider: {row?.rider?.name} ({row?.rider?.phone}) • Bike: {row?.rider?.bike_number}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#6b7280' }}>
                          Assigned: {new Date(row.assigned_at).toLocaleString()}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <Button size="small" variant="outlined" disabled={row.status !== 'Assigned'} onClick={() => updateAssignmentStatus(row.assignment_id, 'On Route')}>On Route</Button>
                        <Button size="small" variant="outlined" disabled={row.status !== 'On Route'} onClick={() => updateAssignmentStatus(row.assignment_id, 'Trial In Progress')}>Trial</Button>
                        <Button size="small" variant="outlined" color="success" disabled={row.status !== 'Trial In Progress'} onClick={() => updateAssignmentStatus(row.assignment_id, 'Trial Completed')}>Trial Completed</Button>
                        <Button size="small" disabled={!['Trial Completed', 'Delivered'].includes(row.status)} onClick={() => setSettlementOrder(row.try_order.order_id)}>Selection & Bill</Button>
                        <Button size="small" onClick={() => setSettlementOrder(row.try_order.order_id)}>Open Trial / Selection & Bill</Button>
                      <Chip size="small" label={row.status} color={row.status === 'Delivered' ? 'success' : row.status === 'On Route' ? 'warning' : 'info'} />
                      </Stack>
                    </Stack>
                  </Paper>
                ))
              )}
            </Stack>
          </Paper>
        </Box>
      )}

      {tabValue === 2 && !loading && (
        <Box sx={{ mt: 2 }}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid #e5e7eb' }}>
            <Typography sx={{ fontWeight: 700, mb: 1.5 }}>Assignment Filters</Typography>
            <Grid container spacing={1.5}>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Rider</InputLabel>
                  <Select label="Rider" value={filterRider} onChange={(e) => setFilterRider(e.target.value)}>
                    <MenuItem value="ALL">All Riders</MenuItem>
                    {riders.map((rider) => (
                      <MenuItem key={rider.rider_id} value={rider.rider_id}>{rider.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select label="Status" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                    <MenuItem value="ALL">All Status</MenuItem>
                    <MenuItem value="Assigned">Assigned</MenuItem>
                    <MenuItem value="On Route">On Route</MenuItem>
                    <MenuItem value="Trial In Progress">Trial In Progress</MenuItem>
                    <MenuItem value="Trial Completed">Trial Completed</MenuItem>
                    <MenuItem value="Delivered">Delivered</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth size="small" type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />
            <Typography sx={{ fontWeight: 700, mb: 1 }}>Latest Status</Typography>
            <Stack spacing={1}>
              {filteredAssignments.length === 0 ? (
                <Typography variant="body2" sx={{ color: '#6b7280' }}>
                  No history for applied filters.
                </Typography>
              ) : (
                filteredAssignments.map((row) => (
                  <Paper key={row.assignment_id} elevation={0} sx={{ p: 1.5, border: '1px solid #e5e7eb', borderRadius: 1.5 }}>
                    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1}>
                      <Box>
                        <Typography sx={{ fontWeight: 700 }}>{row?.try_order?.order_id} • {row?.try_order?.mobileno}</Typography>
                        <Typography variant="body2" sx={{ color: '#6b7280' }}>
                          Rider: {row?.rider?.name} • Zone: {row?.rider?.zone}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#6b7280' }}>
                          Assigned: {new Date(row.assigned_at).toLocaleString()}
                          {row.updated_at ? ` • Updated: ${new Date(row.updated_at).toLocaleString()}` : ''}
                        </Typography>
                      </Box>
                      <Chip size="small" label={row.status} color={row.status === 'Delivered' ? 'success' : row.status === 'On Route' ? 'warning' : 'info'} />
                    </Stack>
                  </Paper>
                ))
              )}
            </Stack>
          </Paper>
        </Box>
      )}
    </Paper>
  );
}
