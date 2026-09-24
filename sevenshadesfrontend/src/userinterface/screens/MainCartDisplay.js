import { Container, Button, Typography } from '@mui/material';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import CustomerBill from '../../services/CustomerBill';
export default function MainCartDisplay() {
  const location = useLocation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const orderId = params.get('order') || location.state?.orderId;
  return <Container maxWidth="sm" sx={{ py: 4 }}>
    {orderId ? <CustomerBill orderId={orderId} /> : <Typography>Select an order to view its bill.</Typography>}
    <Button onClick={() => navigate('/profile')}>Back to Orders</Button>
  </Container>;
}
