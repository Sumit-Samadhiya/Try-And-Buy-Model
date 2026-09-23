import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Container,
  FormControlLabel,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { postData } from '../../services/FetchDjangoApiServices';

export default function TrialSelectionDisplay() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector((state) => state.user);
  const userData = Object.values(user)[0] || {};

  const orderId = location.state?.orderId;
  const [loading, setLoading] = useState(true);
  const [trialOrder, setTrialOrder] = useState(null);
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [paymentMode, setPaymentMode] = useState('upi');

  useEffect(() => {
    const fetchOrder = async () => {
      if (!userData?.mobileno || !orderId) {
        setLoading(false);
        return;
      }

      const result = await postData('user_order_lifecycle_list', { mobileno: userData.mobileno });
      if (result?.status) {
        const row = (result.data || []).find((item) => item?.try_order?.order_id === orderId);
        const order = row?.try_order || null;
        setTrialOrder(order);
        setSelectedItemIds((order?.tryorderitem_set || []).map((item) => item.id));
      }
      setLoading(false);
    };

    fetchOrder();
  }, [userData?.mobileno, orderId]);

  const selectedItems = useMemo(() => {
    return (trialOrder?.tryorderitem_set || []).filter((item) => selectedItemIds.includes(item.id));
  }, [trialOrder?.tryorderitem_set, selectedItemIds]);

  const itemsTotal = useMemo(() => {
    return selectedItems.reduce((sum, item) => sum + (item.line_total || 0), 0);
  }, [selectedItems]);

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

  if (!trialOrder) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Trial Order Not Found</Typography>
          <Typography variant="body2" sx={{ mt: 1, color: '#6b7280' }}>
            Pehle Try Order place karein, phir trial selection step complete karein.
          </Typography>
          <Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate('/mybagdisplay')}>
            Back To Try Cart
          </Button>
        </Paper>
      </Container>
    );
  }

  const handleToggle = (itemId) => {
    setSelectedItemIds((prev) => (prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]));
  };

  const handleCreateMainCart = async () => {
    const result = await postData('delivery_selection_update', {
      order_id: trialOrder.order_id,
      selected_item_ids: selectedItemIds,
      suggested_payment_mode: paymentMode,
    });

    if (result?.status) {
      navigate('/maincart', { state: { orderId: trialOrder.order_id } });
    } else {
      alert(result?.message || 'Unable to update delivery selection.');
    }
  };

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ py: 6, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 5 }}>
      <Paper sx={{ p: 3, borderRadius: 4, border: '1px solid #e5e7eb' }}>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>Delivery Selection Step</Typography>
        <Typography variant="body2" sx={{ mt: 1, color: '#6b7280' }}>
          Delivery partner trial ke baad customer approved items yahan sync hote hain.
        </Typography>

        <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', rowGap: 1 }}>
          <Chip label={`Try Order: ${trialOrder.order_id}`} />
          <Chip label={`Try Items: ${(trialOrder.tryorderitem_set || []).length}`} />
          <Chip label={`Try Fee: Rs ${trialOrder.try_fee || 0}`} color="warning" />
        </Stack>

        <Box sx={{ mt: 3 }}>
          <Typography sx={{ fontWeight: 700, mb: 1 }}>Customer Final Selection</Typography>
          <Stack spacing={1}>
            {(trialOrder.tryorderitem_set || []).map((item) => (
              <FormControlLabel
                key={item.id}
                control={<Checkbox checked={selectedItemIds.includes(item.id)} onChange={() => handleToggle(item.id)} />}
                label={`${item.product_name} (${item.brand_name}) - Rs ${item.line_total}`}
              />
            ))}
          </Stack>
        </Box>

        <Box sx={{ mt: 3 }}>
          <Typography sx={{ fontWeight: 700, mb: 1 }}>Preferred Payment Mode</Typography>
          <Stack direction="row" spacing={1}>
            <Button variant={paymentMode === 'upi' ? 'contained' : 'outlined'} onClick={() => setPaymentMode('upi')}>UPI</Button>
            <Button variant={paymentMode === 'card' ? 'contained' : 'outlined'} onClick={() => setPaymentMode('card')}>Card</Button>
            <Button variant={paymentMode === 'cash' ? 'contained' : 'outlined'} onClick={() => setPaymentMode('cash')}>Cash</Button>
          </Stack>
        </Box>

        <Paper sx={{ mt: 3, p: 2, borderRadius: 3, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <Stack spacing={0.6}>
            <Typography variant="body2">Selected Items Total: <strong>Rs {itemsTotal}</strong></Typography>
            <Typography variant="body2">Wallet Credit (Try Fee Refund): <strong>Rs {selectedItems.length > 0 ? trialOrder.try_fee || 0 : 0}</strong></Typography>
            <Typography variant="body2">Final Payable In Main Cart: <strong>Rs {Math.max(itemsTotal - (selectedItems.length > 0 ? trialOrder.try_fee || 0 : 0), 0)}</strong></Typography>
          </Stack>
        </Paper>

        <Button fullWidth sx={{ mt: 3, py: 1.4, fontWeight: 700 }} variant="contained" onClick={handleCreateMainCart}>
          Confirm Selection And Create Main Cart
        </Button>
      </Paper>
    </Container>
  );
}
