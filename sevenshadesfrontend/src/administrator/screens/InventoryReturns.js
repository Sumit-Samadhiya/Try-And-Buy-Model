import { useEffect, useState } from 'react';
import { Alert, Button, Paper, Stack, Typography } from '@mui/material';
import { getData, postData } from '../../services/FetchDjangoApiServices';
import { TrialReturnCollection, CancelTrialButton } from '../../services/TrialInventoryControls';

export default function InventoryReturns() {
  const [data, setData] = useState({ items: [], returns: [] });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const load = async () => {
    const result = await getData('inventory_returns');
    setData(result.status ? result.data : { items: [], returns: [] });
    if (!result.status) setMessage(result.message);
  };
  useEffect(() => { load(); }, []);
  const review = async (id, action) => {
    setBusy(true);
    const result = await postData('update_hygiene_status', { return_id: id, action });
    setMessage(result.status ? 'Return updated.' : result.message);
    await load(); setBusy(false);
  };
  return <Stack spacing={2}><Typography variant="h5">Returns & stock</Typography>
    <Typography>Confirm physical warehouse receipt before hygiene review. Only approved, undamaged items return to available stock.</Typography>
    <Button onClick={load} disabled={busy}>Refresh inventory</Button>
    {message && <Alert severity="info">{message}</Alert>}
    {data.returns.map(row => <Paper key={row.id} sx={{ p: 2 }}>
      <Typography>{row.order_id} — {row.product_name} · {row.size} · {row.color}</Typography>
      <Typography>{row.condition} · {row.status} · Tag {row.tag_verified ? 'barcode verified' : 'not verified'}</Typography>
      {row.status === 'Collected' && <Button disabled={busy} onClick={() => review(row.id, 'receive')}>Confirm warehouse receipt</Button>}
      {row.status === 'Received' && <Stack direction="row" spacing={1}>
        {!row.steam_pressed_at && <Button disabled={busy || row.condition !== 'Good' || !row.tag_verified} onClick={() => review(row.id, 'steam_press')}>Confirm Steam-Press Complete</Button>}
        <Button disabled={busy || row.condition !== 'Good' || !row.tag_verified || !row.steam_pressed_at} onClick={() => review(row.id, 'approve')}>Approve hygiene & release stock</Button>
        <Button disabled={busy} color="warning" onClick={() => review(row.id, 'reject')}>Reject — keep unavailable</Button>
      </Stack>}
    </Paper>)}
    {!data.returns.length && <Typography>No trial returns recorded.</Typography>}
    <Typography variant="h6">Outstanding trial stock</Typography>
    {[...new Set(data.items.map(item => item.order_id))].map(orderId => <Paper key={orderId} sx={{ p: 2 }}>
      <Typography>{orderId}</Typography><CancelTrialButton orderId={orderId} onCancelled={load} />
      <TrialReturnCollection orderId={orderId} />
    </Paper>)}
  </Stack>;
}
