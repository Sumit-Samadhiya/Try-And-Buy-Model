import { useEffect, useState } from 'react';
import { Alert, Button, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { getData, postData } from '../../services/FetchDjangoApiServices';

export default function DeliveryBatches({ riders, onAssigned }) {
  const [riderId, setRiderId] = useState('');
  const [batches, setBatches] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
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
  return <Paper sx={{ p: 2, my: 2 }}><Stack spacing={2}>
    <Typography variant="h6">Delivery batches</Typography>
    <Typography>Assign pending standard orders to one rider, grouped by postcode, delivery slot and order date.</Typography>
    <TextField select label="Batch rider" value={riderId} onChange={event => setRiderId(event.target.value)}>
      {riders.filter(rider => rider.status === 'Active').map(rider => <MenuItem key={rider.rider_id} value={rider.rider_id}>{rider.name}</MenuItem>)}
    </TextField>
    <Button disabled={busy || !riderId} onClick={generate}>Assign pending orders in batches</Button>
    <Button disabled={busy} onClick={load}>Refresh batches</Button>
    {message && <Alert severity="info">{message}</Alert>}
    {batches.map(batch => <Paper key={batch.batch_id} variant="outlined" sx={{ p: 1 }}>
      <Typography>{batch.batch_id} · {batch.rider_name} · {batch.status}</Typography>
      <Typography>{batch.order_ids.join(', ') || 'No orders'}</Typography>
    </Paper>)}
  </Stack></Paper>;
}
