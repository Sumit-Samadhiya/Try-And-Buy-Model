import { useState } from 'react';
import { Button, Typography } from '@mui/material';
import { postData } from './FetchDjangoApiServices';
export default function LocationButton({ addressId, rider = false }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const share = () => {
    if (!navigator.geolocation) { setMessage('Location is unavailable in this browser. Manual assignment remains available.'); return; }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(async position => {
      const result = await postData(rider ? 'rider_location' : 'address_location', { address_id: addressId, latitude: position.coords.latitude, longitude: position.coords.longitude });
      setMessage(result.message); setBusy(false);
    }, () => { setMessage('Location permission was not available. You can continue without sharing.'); setBusy(false); }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 });
  };
  return <><Button disabled={busy || (!rider && !addressId)} onClick={share}>{rider ? 'Share Current Rider Location' : 'I Am at This Address — Save Current Location'}</Button>{message && <Typography role="status">{message}</Typography>}</>;
}
