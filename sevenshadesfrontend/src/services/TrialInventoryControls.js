import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Checkbox, FormControlLabel, Paper, Stack, Typography } from '@mui/material';
import { postData } from './FetchDjangoApiServices';

export function CancelTrialButton({ orderId, onCancelled }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [cancelled, setCancelled] = useState(false);
  const cancel = async () => {
    if (busy || cancelled) return;
    setBusy(true);
    const result = await postData('cancel_trial', { order_id: orderId });
    setBusy(false);
    setMessage(result.status ? 'Trial cancelled; reserved stock released. An unused introductory offer is retained.' : result.message);
    if (result.status) { setCancelled(true); onCancelled?.(); }
  };
  return <Stack spacing={1}><Button disabled={busy || cancelled} color="warning" onClick={cancel}>Cancel before dispatch</Button>{message && <Typography role="status">{message}</Typography>}</Stack>;
}

export function TrialReturnCollection({ orderId, onCollected }) {
  const [tags, setTags] = useState({});
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const result = await postData('trial_return_items', { order_id: orderId });
    setItems(result.status ? result.data : []);
    if (!result.status) setMessage(result.message);
  }, [orderId]);
  useEffect(() => { load(); }, [load]);
  const collect = async (id, condition) => {
    setBusy(true);
    const result = await postData('process_return', { try_order_item_id: id, condition, tag_intact: tags[id] === true });
    setMessage(result.status ? 'Collection recorded. Warehouse receipt and hygiene review are pending.' : result.message);
    await load(); setBusy(false);
    if (result.status) onCollected?.();
  };
  return <Paper sx={{ p: 2, my: 2 }}><Typography variant="h6">Trial returns</Typography>
    <Typography>Save the customer selection, inspect security tags, then record physical collection. A missing/broken tag keeps the item unavailable for restocking.</Typography>
    <Button onClick={load} disabled={busy}>Refresh returned items</Button>
    {message && <Alert severity="info">{message}</Alert>}
    {items.map(item => <Stack key={item.id} spacing={1} sx={{ my: 2 }}>
      <Typography>{item.product_name} · {item.size} · {item.color}</Typography>
      {item.return_status ? <Typography>{item.return_status}</Typography> : item.selected ? <Typography>Selected for purchase</Typography> : item.stock_reserved ? <Stack direction="row" spacing={1}>
        <FormControlLabel control={<Checkbox checked={tags[item.id] === true} onChange={event => setTags(values => ({ ...values, [item.id]: event.target.checked }))} />} label="Security tag inspected and intact" />
        <Button disabled={busy} onClick={() => collect(item.id, 'Good')}>Collected — good condition</Button>
        <Button disabled={busy} onClick={() => collect(item.id, 'Damaged')}>Collected — damaged</Button>
      </Stack> : <Typography>No active reservation</Typography>}
    </Stack>)}
  </Paper>;
}
