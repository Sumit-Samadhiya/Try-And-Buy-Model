import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import RouteRoundedIcon from '@mui/icons-material/RouteRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import TwoWheelerRoundedIcon from '@mui/icons-material/TwoWheelerRounded';
import { getData, postData } from '../../services/FetchDjangoApiServices';

export default function DeliveryBatches({ riders, onAssigned }) {
  const [riderId, setRiderId] = useState('');
  const [batches, setBatches] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [routeInfo, setRouteInfo] = useState({});
  const [optimizingBatch, setOptimizingBatch] = useState(null);

  const load = async () => {
    const result = await getData('delivery_batch_list');
    setBatches(result.status ? result.data : []);
    if (!result.status) setMessage(result.message);
  };

  useEffect(() => { load(); }, []);

  const generate = async () => {
    setBusy(true);
    const result = await postData('generate_delivery_batch', { rider_id: riderId });
    setMessage(result.status ? (result.data.length ? 'Pending orders assigned in batches.' : 'No eligible unassigned standard orders.') : result.message);
    await load(); setBusy(false);
    if (result.status) onAssigned?.();
  };

  const handleOptimizeRoute = async (batchId) => {
    try {
      setOptimizingBatch(batchId);
      setRouteInfo(prev => ({ ...prev, [batchId]: null }));
      const res = await postData('optimize_route', { batch_id: batchId });
      if (res && res.status) {
        setRouteInfo(prev => ({ ...prev, [batchId]: res }));
      } else {
        setMessage(res?.message || 'Unable to optimize batch route.');
      }
    } catch (err) {
      setMessage('Network error optimizing batch route.');
    } finally {
      setOptimizingBatch(null);
    }
  };

  return <Paper sx={{ p: 2, my: 2 }}><Stack spacing={2}>
    <Typography variant="h6">Delivery batches</Typography>
    <Typography>Assign up to 3 trial bags to an available rider, grouped by postcode, booked slot and date. Plan the route below to review appointment feasibility.</Typography>
    <TextField select label="Batch rider" value={riderId} onChange={event => setRiderId(event.target.value)}>
      {riders.filter(rider => rider.status === 'Active').map(rider => <MenuItem key={rider.rider_id} value={rider.rider_id}>{rider.name}</MenuItem>)}
    </TextField>
    <Button disabled={busy || !riderId} onClick={generate}>Assign next trial batch</Button>
    <Button disabled={busy} onClick={load}>Refresh batches</Button>
    {message && <Alert severity="info">{message}</Alert>}
    {batches.map(batch => {
      const route = routeInfo[batch.batch_id];
      const isOptimizing = optimizingBatch === batch.batch_id;

      return (
        <Paper key={batch.batch_id} variant="outlined" sx={{ p: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" spacing={1}>
            <Box>
              <Typography sx={{ fontWeight: 700 }}>
                {batch.batch_id} · {batch.rider_name || 'Unassigned Rider'} · {batch.status}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {batch.order_ids.join(', ') || 'No orders'}
              </Typography>
            </Box>
            <Button
              size="small"
              variant="outlined"
              startIcon={isOptimizing ? <CircularProgress size={16} /> : <RouteRoundedIcon fontSize="small" />}
              disabled={optimizingBatch !== null || !batch.order_ids?.length}
              onClick={() => handleOptimizeRoute(batch.batch_id)}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              {isOptimizing ? 'Planning stops...' : 'Plan trial route'}
            </Button>
          </Stack>

          {/* TSP Route & 15m Trial Slot Schedule */}
          {route && (
            <Box sx={{ mt: 1.5, p: 1.5, bgcolor: '#f8fafc', borderRadius: 1.5, border: '1px solid #e2e8f0' }}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 1 }}>
                <Chip
                  size="small"
                  label={route.is_fallback ? 'Approximate route' : 'Road-based route'}
                  color="primary"
                  variant="outlined"
                />
                <Chip
                  size="small"
                  icon={<TwoWheelerRoundedIcon fontSize="small" />}
                  label={`${route.is_fallback ? "Approx." : "Road"}: ${route.total_distance_km} km`}
                />
                <Chip
                  size="small"
                  icon={<AccessTimeRoundedIcon fontSize="small" />}
                  label={`Total: ~${route.estimated_duration_minutes} mins (trials, waiting + return)`}
                />
              </Stack>

              <Alert severity={route.is_fallback || !route.fits_all_slots ? 'warning' : 'info'} sx={{ mb: 1.5 }}>
                {route.is_fallback ? 'Road routing is unavailable. These are approximate distances; confirm the route before dispatch. ' : 'Driving estimates do not include live traffic. '}
                {!route.fits_all_slots && 'Some appointments need review before dispatch. '}
                {route.route_saved ? 'Stop sequence saved for the rider. Refresh rider tasks to see it.' : 'Preview only: resolve warnings before a stop sequence can be saved.'}
              </Alert>
              {!!route.skipped_orders?.length && <Alert severity="warning" sx={{ mb: 1 }}>Missing location: {route.skipped_orders.map(item => item.order_id).join(', ')}. These orders are excluded from the route.</Alert>}
              <Typography variant="body2" sx={{ mb: 1 }}>Waiting: {route.waiting_minutes || 0} min · Return to start: {route.return_minutes || 0} min</Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', display: 'block', mb: 0.5 }}>
                Optimized Stop Sequence & 15-Minute Trial Timeline:
              </Typography>
              <Stack spacing={0.8}>
                {route.waypoints?.map(wp => (
                  <Paper
                    key={wp.order_id}
                    variant="outlined"
                    sx={{
                      p: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 1
                    }}
                  >
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        Stop #{wp.stop_number}: {wp.order_id}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {wp.address} • {wp.leg_distance_km} km ({wp.driving_duration_minutes}m drive)
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
                      <Chip
                        size="small"
                        label={`ETA: ${wp.estimated_arrival_time || wp.estimated_arrival_minutes + 'm'}`}
                      />
                      <Chip
                        size="small"
                        label={wp.trial_window || '15m Trial'}
                        color="success"
                        variant="outlined"
                      />
                      <Chip
                        size="small"
                        label={wp.slot_status || 'On Time'}
                        color={wp.fits_booked_slot === true ? 'success' : 'warning'}
                      />
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </Box>
          )}
        </Paper>
      );
    })}
  </Stack></Paper>;
}
