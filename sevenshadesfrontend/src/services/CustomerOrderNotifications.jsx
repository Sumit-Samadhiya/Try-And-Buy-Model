import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Dialog, DialogContent, DialogTitle, Button } from '@mui/material';
import { postData } from './FetchDjangoApiServices';
import useOrderEvents from './useOrderEvents';
import CustomerBill from './CustomerBill';

export default function CustomerOrderNotifications() {
  const mobile = Object.values(useSelector(state => state.user))[0]?.mobileno;
  const [orderId, setOrderId] = useState(null);
  const seen = useRef(new Set());
  const check = useCallback(async () => {
    if (!mobile) return;
    const result = await postData('user_order_lifecycle_list', { mobileno: mobile });
    if (!result.status) return;
    const row = result.data.find(row => row.final_order && row.final_order.payment_status !== 'paid' && row.final_order.approved_revision !== row.final_order.bill_revision && !seen.current.has(row.try_order.order_id + ':' + row.final_order.bill_revision));
    if (row) { seen.current.add(row.try_order.order_id + ':' + row.final_order.bill_revision); setOrderId(row.try_order.order_id); }
  }, [mobile]);
  useEffect(() => { seen.current.clear(); setOrderId(null); check(); }, [check]);
  useOrderEvents(check, !!mobile);
  return <Dialog open={!!orderId && !!mobile} onClose={() => setOrderId(null)} maxWidth="sm" fullWidth>
    <DialogTitle>Please approve your doorstep selection</DialogTitle><DialogContent>{orderId && <CustomerBill orderId={orderId} />}<Button onClick={() => setOrderId(null)}>Close — review later in Orders</Button></DialogContent>
  </Dialog>;
}
