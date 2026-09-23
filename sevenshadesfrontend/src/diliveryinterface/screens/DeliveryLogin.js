import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useNavigate } from 'react-router-dom';
import { getDeliveryLogin, setDeliveryLogin } from '../data/deliverySessionStore';
import { postData } from '../../services/FetchDjangoApiServices';

export default function DeliveryLogin() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const active = getDeliveryLogin();
    if (active?.phone) {
      navigate('/delivery/dashboard');
    }
  }, [navigate]);

  const handleLogin = async () => {
    if (!phone || phone.length < 10) {
      alert('Please enter valid phone number');
      return;
    }
    if (!password) {
      alert('Please enter password');
      return;
    }

    const result = await postData('delivery_rider_login', { phone, password });
    if (!result?.status) {
      alert(result?.message || 'Login failed');
      return;
    }

    setDeliveryLogin(result.data || { phone });
    navigate('/delivery/dashboard');
  };

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)', display: 'flex', alignItems: 'center' }}>
      <Container maxWidth="sm">
        <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: '1px solid #e5e7eb' }}>
          <Stack spacing={2}>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#111827' }}>
              Delivery Boy Login
            </Typography>
            <Typography variant="body2" sx={{ color: '#6b7280' }}>
              Login via rider credentials and manage assigned trial orders.
            </Typography>
            <TextField label="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} fullWidth />
            <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} fullWidth />
            <Button variant="contained" sx={{ bgcolor: '#111827' }} onClick={handleLogin}>
              Continue
            </Button>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
