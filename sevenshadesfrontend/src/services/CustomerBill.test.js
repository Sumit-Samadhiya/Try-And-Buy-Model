import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import CustomerBill from './CustomerBill';
import { postData } from './FetchDjangoApiServices';
import { payWithRazorpay } from './razorpayCheckout';
jest.mock('./FetchDjangoApiServices', () => ({ postData: jest.fn(), serverURL: 'http://localhost:8000' }));
jest.mock('./useOrderEvents', () => () => {});
jest.mock('./razorpayCheckout', () => ({ payWithRazorpay: jest.fn() }));
const final = { bill_revision: 2, approved_revision: 0, payment_status: 'pending', payment_mode: '', selected_items_count: 1,
  items_total: 500, wallet_credit: 49, final_payable: 451,
  finalorderitem_set: [{ id: 1, product_name: 'Shirt', size: 'M', color: 'Blue', qty: 1, line_total: 500 }] };
const detail = () => ({ try_order: { status: 'SELECTION_SUBMITTED' }, final_order: { ...final }, customer_approved: false, online_available: false });

test('customer approves the displayed bill revision and cash remains awaiting rider collection', async () => {
  const data = detail();
  postData.mockImplementation(async (endpoint, payload) => {
    if (endpoint === 'customer_approve_bill') { data.customer_approved = true; data.final_order.payment_mode = payload.payment_mode || ''; data.try_order.status = 'SELECTION_SUBMITTED'; return { status: true, data: data.final_order }; }
    return { status: true, data };
  });
  render(<CustomerBill orderId="T1" />);
  const selection = await screen.findByRole('button', { name: 'Approve Selection' });
  expect(screen.queryByText('Balance: ₹451')).not.toBeInTheDocument();
  await act(async () => { fireEvent.click(selection); });
  expect(postData).toHaveBeenCalledWith('customer_approve_bill', { order_id: 'T1', bill_revision: 2, payment_mode: null });
  expect(await screen.findByText('Balance: ₹451')).toBeInTheDocument();
  const actionButton = await screen.findByRole('button', { name: 'Pay Cash to Rider' });
  await act(async () => { fireEvent.click(actionButton); });
  await screen.findByText(/Selection Submitted/);
  expect(postData).toHaveBeenCalledWith('customer_approve_bill', { order_id: 'T1', bill_revision: 2, payment_mode: 'cash' });
  expect(postData.mock.calls.some(([endpoint]) => endpoint === 'final_payment_update')).toBe(false);
  expect(screen.getByRole('button', { name: 'Pay Online / UPI' })).toBeDisabled();
});

test('online approval starts Razorpay only after server approval', async () => {
  const data = detail(); data.customer_approved = true; data.online_available = true;
  postData.mockImplementation(async endpoint => ({ status: true, data: endpoint === 'customer_approve_bill' ? { ...final, payment_mode: 'razorpay' } : data }));
  payWithRazorpay.mockResolvedValue({ order_id: 'T1' });
  render(<CustomerBill orderId="T1" />);
  const actionButton = await screen.findByRole('button', { name: 'Pay Online / UPI' });
  await act(async () => { fireEvent.click(actionButton); });
  await waitFor(() => expect(payWithRazorpay).toHaveBeenCalledWith('T1', 'final', 2));
});

test('rejected stale approval never opens payment and receipt uses authorized endpoint', async () => {
  const data = detail(); data.customer_approved = true; data.online_available = true; data.receipt_number = 'R1';
  postData.mockImplementation(async endpoint => endpoint === 'customer_approve_bill' ? { status: false, message: 'Bill changed; refresh.' } : { status: true, data });
  render(<CustomerBill orderId="T1" />);
  const actionButton = await screen.findByRole('button', { name: 'Pay Online / UPI' });
  await act(async () => { fireEvent.click(actionButton); });
  await screen.findByText('Bill changed; refresh.');
  expect(payWithRazorpay).not.toHaveBeenCalled();
  expect(screen.getByRole('link', { name: 'Download Payment Receipt' })).toHaveAttribute('href', 'http://localhost:8000/api/receipt_download?order_id=T1');
});
