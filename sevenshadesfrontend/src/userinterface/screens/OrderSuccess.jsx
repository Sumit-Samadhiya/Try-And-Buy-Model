import { useEffect, useState } from 'react';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import NavigationRoundedIcon from '@mui/icons-material/NavigationRounded';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useLocation, useNavigate } from 'react-router-dom';
import LiveRiderTrackingMap from '../components/LiveRiderTrackingMap';
import { drapeyFeedback } from '../../services/drapeyFeedback';

export default function OrderSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const payload = location.state || {};
  const [trackingOpen, setTrackingOpen] = useState(false);

  const billingAmount = payload.billingAmount || 0;
  const paymentMode = (payload.paymentMode || 'N/A').toUpperCase();
  const totalItems = payload.totalTryItems || 0;

  useEffect(() => {
    if (payload.orderId) {
      drapeyFeedback('BOOM! 🎊 Order Placed! Party time! Humare rider bhaiya ready ho rahe hain aapke doorstep par aane ke liye! 🛵💨', 'order_success');
    }
  }, [payload.orderId]);

  if (!payload.orderId) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: '1px solid #e5e7eb', textAlign: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>No confirmed order to display</Typography>
          <Typography sx={{ mt: 1, color: '#6b7280' }}>Open your order history to view an existing trial, or return to the catalog.</Typography>
          <Button variant="contained" sx={{ mt: 3 }} onClick={() => navigate('/profile')}>View Order History</Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: '1px solid #e5e7eb', textAlign: 'center' }}>
        <CheckCircleRoundedIcon sx={{ fontSize: 72, color: '#16a34a' }} />
        <Typography variant="h4" sx={{ mt: 1, fontWeight: 800, color: '#111827' }}>
          Order Placed Successfully
        </Typography>
        <Typography variant="body1" sx={{ mt: 1, color: '#6b7280' }}>
          Aapka trial request confirm ho gaya hai. Delivery timing confirm karne ke liye jaldi call aayega.
        </Typography>

        <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 2 }}>
          <Chip label={`Try Items: ${totalItems}`} />
          <Chip label={`Billing: Rs ${billingAmount}`} color="success" />
          <Chip label={`Mode: ${paymentMode}`} variant="outlined" />
        </Stack>

        <Typography sx={{ mt: 2, color: '#4b5563' }}>Your assigned rider will record your selection after the trial.</Typography>

        <Stack spacing={1.5} sx={{ mt: 4 }}>
          <Button
            variant="outlined"
            fullWidth
            startIcon={<NavigationRoundedIcon />}
            sx={{
              py: 1.4,
              fontWeight: 700,
              borderColor: '#0284c7',
              color: '#0284c7',
              borderRadius: 2,
              '&:hover': { borderColor: '#0369a1', bgcolor: 'rgba(2, 132, 199, 0.08)' }
            }}
            onClick={() => setTrackingOpen(true)}
          >
            🗺️ Track Live Rider (Free Radar)
          </Button>

          <Button
            variant="contained"
            fullWidth
            sx={{ py: 1.4, fontWeight: 700, bgcolor: '#111827', borderRadius: 2 }}
            onClick={() => navigate('/home')}
          >
            Continue Shopping
          </Button>
        </Stack>
      </Paper>

      {trackingOpen && (
        <LiveRiderTrackingMap
          orderId={payload.orderId}
          open={trackingOpen}
          onClose={() => setTrackingOpen(false)}
        />
      )}
    </Container>
  );
}
