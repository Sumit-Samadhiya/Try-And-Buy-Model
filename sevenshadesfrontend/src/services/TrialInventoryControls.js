import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Checkbox, FormControlLabel, Paper, Stack, TextField, Typography } from '@mui/material';
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
  const [scannedTags, setScannedTags] = useState({});
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
    const payload = {
      try_order_item_id: id,
      condition,
      tag_intact: tags[id] === true,
      ...(scannedTags[id] ? { scanned_tag: scannedTags[id] } : {})
    };
    const result = await postData('process_return', payload);
    setMessage(result.status ? 'Collection recorded. Warehouse receipt and hygiene review are pending.' : result.message);
    await load(); setBusy(false);
    if (result.status) onCollected?.();
  };

  const collectAll = async () => {
    const pending = items.filter(item => !item.selected && !item.return_status && item.stock_reserved);
    if (!pending.length) return;
    setBusy(true);
    for (const item of pending) {
      await postData('process_return', {
        try_order_item_id: item.id,
        condition: 'Good',
        tag_intact: tags[item.id] === true,
        ...(scannedTags[item.id] ? { scanned_tag: scannedTags[item.id] } : {})
      });
    }
    setMessage('All unselected return items confirmed and collected.');
    await load();
    setBusy(false);
    onCollected?.();
  };

  const pendingItems = items.filter(item => !item.selected && !item.return_status && item.stock_reserved);

  return <Paper sx={{ p: 2, my: 2 }}>
    <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
      <div>
        <Typography variant="h6">Trial returns handover</Typography>
        <Typography variant="body2" color="text.secondary">Confirm physical collection of unselected trial items from customer.</Typography>
      </div>
      {pendingItems.length > 1 && (
        <Button variant="contained" color="primary" disabled={busy} onClick={collectAll}>
          Collect All {pendingItems.length} Returns
        </Button>
      )}
    </Stack>
    <Button onClick={load} disabled={busy} sx={{ mt: 1 }}>Refresh returned items</Button>
    {message && <Alert severity="info" sx={{ my: 1.5 }}>{message}</Alert>}
    {items.map(item => <Stack key={item.id} spacing={1} sx={{ my: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography>{item.product_name} · {item.size} · {item.color}</Typography>
      </Stack>
      {item.return_status ? <Typography>{item.return_status}</Typography> : item.selected ? <Typography>Selected for purchase</Typography> : item.stock_reserved ? <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
        <TextField
          size="small"
          placeholder="Scan / Enter Barcode"
          value={scannedTags[item.id] || ''}
          onChange={event => setScannedTags(prev => ({ ...prev, [item.id]: event.target.value }))}
          sx={{ width: 180, display: 'none' }}
        />
        <Button disabled={busy} variant="contained" onClick={() => collect(item.id, 'Good')}>
          Collected — good condition
        </Button>
        <Button disabled={busy} variant="outlined" color="error" onClick={() => collect(item.id, 'Damaged')}>
          Collected — damaged
        </Button>
      </Stack> : <Typography>No active reservation</Typography>}
    </Stack>)}
  </Paper>;
}
