import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  CircularProgress,
  Chip,
  Container,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { postData } from '../../services/FetchDjangoApiServices';

export default function MainCartDisplay() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector((state) => state.user);
  const userData = Object.values(user)[0] || {};
  const orderId = location.state?.orderId;

  const [loading, setLoading] = useState(true);
  const [mainCart, setMainCart] = useState(null);
  const [paymentMode, setPaymentMode] = useState('upi');
  const [paymentStatus, setPaymentStatus] = useState('pending');

  useEffect(() => {
    const fetchMainCart = async () => {
      if (!userData?.mobileno || !orderId) {
        setLoading(false);
        return;
      }

      const result = await postData('user_order_lifecycle_list', { mobileno: userData.mobileno });
      if (result?.status) {
        const row = (result.data || []).find((item) => item?.try_order?.order_id === orderId);
        const finalOrder = row?.final_order || null;
        setMainCart(finalOrder);
        if (finalOrder?.payment_mode) {
          setPaymentMode(finalOrder.payment_mode);
        }
      }
      setLoading(false);
    };

    fetchMainCart();
  }, [userData?.mobileno, orderId]);

  const hasPurchase = useMemo(() => (mainCart?.selected_items_count || 0) > 0, [mainCart?.selected_items_count]);

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ py: 6, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!userData?.mobileno) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Login Required</Typography>
          <Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate('/signindisplay')}>
            Go To Login
          </Button>
        </Paper>
      </Container>
    );
  }

  if (!mainCart) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Main Cart Empty</Typography>
          <Typography variant="body2" sx={{ mt: 1, color: '#6b7280' }}>
            Trial completion ke baad selected items yahan show honge.
          </Typography>
          <Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate('/mybagdisplay')}>
            Back To Try Cart
          </Button>
        </Paper>
      </Container>
    );
  }

  const handleCompletePayment = () => {
    const completePayment = async () => {
      const result = await postData('final_payment_update', {
        order_id: orderId,
        payment_mode: paymentMode,
        payment_status: hasPurchase ? paymentStatus : 'paid',
      });

      if (result?.status) {
        navigate('/profile');
      } else {
        alert(result?.message || 'Unable to complete payment.');
      }
    };

    completePayment();
  };

  return (
    <Container maxWidth="md" sx={{ py: 5 }}>
      <Paper sx={{ p: 3, borderRadius: 4, border: '1px solid #e5e7eb' }}>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>Main Cart</Typography>
        <Typography variant="body2" sx={{ mt: 1, color: '#6b7280' }}>
          Sirf wahi items show ho rahe hain jo customer ne trial ke baad approve kiye.
        </Typography>

        <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', rowGap: 1 }}>
          <Chip label={`Order: ${mainCart.order_id}`} />
          <Chip label={`Selected: ${mainCart.selected_items_count || 0}`} />
          <Chip label={`Try Fee: Rs ${mainCart.wallet_credit || 0}`} />
        </Stack>

        <Box sx={{ mt: 3 }}>
          {(mainCart.finalorderitem_set || []).length === 0 ? (
            <Paper sx={{ p: 2, borderRadius: 3, bgcolor: '#fff7ed', border: '1px solid #fed7aa' }}>
              <Typography variant="body2" sx={{ color: '#9a3412' }}>
                Customer ne koi item approve nahi kiya. Is order me purchase complete nahi hoga.
              </Typography>
            </Paper>
          ) : (
            <Stack spacing={1.2}>
              {mainCart.finalorderitem_set.map((item) => (
                <Paper key={item.id} sx={{ p: 1.5, borderRadius: 2, border: '1px solid #e5e7eb' }}>
                  <Stack direction="row" justifyContent="space-between">
                    <Box>
                      <Typography sx={{ fontWeight: 700 }}>{item.product_name}</Typography>
                      <Typography variant="body2" sx={{ color: '#6b7280' }}>{item.brand_name}</Typography>
                    </Box>
                    <Typography sx={{ fontWeight: 700 }}>Rs {item.line_total}</Typography>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </Box>

        <Paper sx={{ mt: 3, p: 2, borderRadius: 3, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <Stack spacing={0.8}>
            <Typography variant="body2">Items Total: <strong>Rs {mainCart.items_total || 0}</strong></Typography>
            <Typography variant="body2">Wallet Credit: <strong>Rs {mainCart.wallet_credit || 0}</strong></Typography>
            <Divider />
            <Typography variant="body1" sx={{ fontWeight: 800 }}>Final Payable: Rs {mainCart.final_payable || 0}</Typography>
          </Stack>
        </Paper>

        {hasPurchase && (
          <Box sx={{ mt: 3 }}>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>Payment Mode</Typography>
            <Stack direction="row" spacing={1}>
              <Button variant={paymentMode === 'upi' ? 'contained' : 'outlined'} onClick={() => setPaymentMode('upi')}>UPI</Button>
              <Button variant={paymentMode === 'card' ? 'contained' : 'outlined'} onClick={() => setPaymentMode('card')}>Card</Button>
              <Button variant={paymentMode === 'cash' ? 'contained' : 'outlined'} onClick={() => setPaymentMode('cash')}>Cash</Button>
            </Stack>

            <Typography sx={{ fontWeight: 700, mt: 2, mb: 1 }}>Payment Status</Typography>
            <Stack direction="row" spacing={1}>
              <Button variant={paymentStatus === 'paid' ? 'contained' : 'outlined'} color="success" onClick={() => setPaymentStatus('paid')}>Paid</Button>
              <Button variant={paymentStatus === 'pending' ? 'contained' : 'outlined'} color="warning" onClick={() => setPaymentStatus('pending')}>Pending</Button>
            </Stack>
          </Box>
        )}

        <Button
          fullWidth
          sx={{ mt: 3, py: 1.4, fontWeight: 700 }}
          variant="contained"
          color="success"
          onClick={handleCompletePayment}
        >
          {hasPurchase ? 'Complete Payment And Finish Order' : 'Close Trial Without Purchase'}
        </Button>
      </Paper>
    </Container>
  );
}
