import { useEffect, useState } from 'react';
import { Alert, Button, Paper, Stack, Typography } from '@mui/material';
import { getData } from '../../services/FetchDjangoApiServices';
import { TrialReturnCollection, CancelTrialButton } from '../../services/TrialInventoryControls';

export default function InventoryReturns() {
  const [data, setData] = useState({ items: [], returns: [] });
  const [message, setMessage] = useState('');
  const load = async () => {
    const result = await getData('inventory_returns');
    setData(result.status ? result.data : { items: [], returns: [] });
    if (!result.status) setMessage(result.message);
  };
  useEffect(() => { load(); }, []);
  return <Stack spacing={2}><Typography variant="h5">Returns & stock</Typography>
    <Typography>Good-condition trial returns restore stock when collection is recorded. Damaged items stay unavailable.</Typography>
    <Button onClick={load}>Refresh inventory</Button>
    {message && <Alert severity="info">{message}</Alert>}
    {data.returns.map(row => <Paper key={row.id} sx={{ p: 2 }}>
      <Typography>{row.order_id} — {row.product_name} · {row.size} · {row.color}</Typography>
      <Typography>{row.condition} · {row.status} · Tag {row.tag_verified ? 'barcode verified' : 'not verified'}</Typography>
      <Typography>{row.status === 'Approved' ? 'Stock restored' : row.status === 'Rejected' ? 'Unavailable for sale' : 'Legacy return: stock reconciliation required'}</Typography>
    </Paper>)}
    {!data.returns.length && <Typography>No trial returns recorded.</Typography>}
    <Typography variant="h6">Outstanding trial stock</Typography>
    {[...new Set(data.items.map(item => item.order_id))].map(orderId => <Paper key={orderId} sx={{ p: 2 }}>
      <Typography>{orderId}</Typography><CancelTrialButton orderId={orderId} onCancelled={load} />
      <TrialReturnCollection orderId={orderId} onCollected={load} />
    </Paper>)}
  </Stack>;
}
