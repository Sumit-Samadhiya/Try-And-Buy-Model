import { useEffect, useState } from 'react';
import { Button, Stack, Typography } from '@mui/material';
import { postData } from '../../services/FetchDjangoApiServices';
export default function RiderSuggestions({ orderId, onSelect }) {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    let active = true;
    setRows([]);
    if (orderId) postData('rider_suggestions', { order_id: orderId }).then(result => { if (active) setRows(result.status ? result.data : []); });
    return () => { active = false; };
  }, [orderId]);
  if (!orderId) return null;
  return <Stack spacing={1} sx={{ mb: 2 }}><Typography>Nearby active riders — select after reviewing current workload</Typography>
    {rows.slice(0, 5).map(row => <Button key={row.rider_id} variant="outlined" onClick={() => onSelect(row.rider_id)}>
      {row.name} · {row.distance_km !== null ? row.distance_km + ' km approx. (straight-line)' : row.zone_match ? 'Matching zone; GPS unavailable' : 'GPS unavailable'} · {row.active_orders} active orders
    </Button>)}
    <Typography variant="caption">Distance is shown only when the delivery address has a saved location and the rider shared a location in the last 30 minutes. This is not route distance.</Typography>
  </Stack>;
}
