import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useLocation, useNavigate } from 'react-router-dom';

export default function OrderSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const payload = location.state || {};

  const billingAmount = payload.billingAmount || 0;
  const paymentMode = (payload.paymentMode || 'N/A').toUpperCase();
  const totalItems = payload.totalTryItems || 0;
  const orderId = payload.orderId;

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

        {orderId ? (
          <Button
            variant="outlined"
            fullWidth
            sx={{ mt: 2, py: 1.2, fontWeight: 700 }}
            onClick={() => navigate('/trial-selection', { state: { orderId } })}
          >
            Simulate Delivery Selection (Create Main Cart)
          </Button>
        ) : null}

        <Button
          variant="contained"
          fullWidth
          sx={{ mt: 4, py: 1.4, fontWeight: 700, bgcolor: '#111827' }}
          onClick={() => navigate('/home')}
        >
          Continue Shopping
        </Button>
      </Paper>
    </Container>
  );
}
