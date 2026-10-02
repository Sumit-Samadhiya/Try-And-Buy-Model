import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CustomerBill from './CustomerBill';
import DeliveryOrderDetails from '../diliveryinterface/screens/DeliveryOrderDetails';
import { postData } from './FetchDjangoApiServices';

jest.mock('./FetchDjangoApiServices', () => ({ postData: jest.fn(), serverURL: 'http://localhost:8000' }));
jest.mock('./useOrderEvents', () => () => {});
jest.mock('../diliveryinterface/components/DeliveryShell', () => ({ children }) => <div>{children}</div>);

test('rider bill passes to customer approval, cash collection, returns and receipt', async () => {
  const data = {
    try_order: { order_id: 'COD1', status: 'TRIAL_COMPLETED', tryorderitem_set: [
      { id: 1, product_name: 'Shirt', size: 'M', color: 'Blue', qty: 1, line_total: 500, stock_reserved: true },
      { id: 2, product_name: 'Jeans', size: 'L', color: 'Black', qty: 1, line_total: 700, stock_reserved: true },
    ] },
    assignment_id: 'A1', assignment_status: 'Trial Completed', server_time: new Date().toISOString(),
    customer_approved: false, final_order: null,
  };
  const copy = value => JSON.parse(JSON.stringify(value));
  postData.mockImplementation(async (endpoint, payload) => {
    if (endpoint === 'settlement_detail') return { status: true, data: copy(data) };
    if (endpoint === 'submit_final_selection') {
      expect(payload.selected_items).toEqual([{ try_order_item_id: 1, qty: 1 }]);
      data.try_order.status = 'AWAITING_SELECTION_APPROVAL';
      data.final_order = { bill_revision: 1, selected_items_count: 1, items_total: 500, wallet_credit: 0,
        final_payable: 500, payment_status: 'pending', payment_mode: '',
        finalorderitem_set: [{ id: 1, try_order_item: 1, product_name: 'Shirt', size: 'M', color: 'Blue', qty: 1, line_total: 500 }] };
    } else if (endpoint === 'customer_approve_bill') {
      expect(payload.payment_mode).toBe('cash');
      expect(payload.bill_revision).toBe(1);
      data.customer_approved = true;
      data.final_order.payment_mode = 'cash';
      data.try_order.status = 'SELECTION_SUBMITTED';
    } else if (endpoint === 'final_payment_update') {
      expect(data.customer_approved).toBe(true);
      data.final_order.payment_status = 'paid';
      data.try_order.tryorderitem_set[0].status = 'PURCHASED';
      data.try_order.tryorderitem_set[0].stock_reserved = false;
    } else if (endpoint === 'process_return') {
      expect(data.customer_approved).toBe(true);
      expect(payload.try_order_item_id).toBe(2);
      data.try_order.tryorderitem_set[1].status = 'RETURNED';
    } else if (endpoint === 'delivery_assignment_update_status') {
      expect(data.final_order.payment_status).toBe('paid');
      expect(data.try_order.tryorderitem_set[1].status).toBe('RETURNED');
      data.assignment_status = 'Delivered'; data.try_order.status = 'DELIVERED'; data.receipt_number = 'R1';
    } else throw new Error(`Unexpected endpoint: ${endpoint}`);
    return { status: true, data: copy(data.final_order) };
  });
  const rider = () => render(<MemoryRouter><DeliveryOrderDetails orderId="COD1" /></MemoryRouter>);
  let panel = rider();
  fireEvent.click(await screen.findByRole('checkbox', { name: /Jeans/ }));
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Send Selection for Customer Approval' })); });
  expect(screen.getByRole('button', { name: /Confirm ₹500 Cash/ })).toBeDisabled();
  expect(postData.mock.calls.some(([endpoint]) => endpoint === 'process_return')).toBe(false);
  panel.unmount();
  panel = render(<CustomerBill orderId="COD1" />);
  const approve = await screen.findByRole('button', { name: /Approve Selection & Pay ₹500/ });
  expect(screen.getByText('Items Total: ₹500')).toBeInTheDocument();
  await act(async () => { fireEvent.click(approve); });
  expect(screen.queryByRole('link', { name: 'Download Payment Receipt' })).not.toBeInTheDocument();
  panel.unmount();
  panel = rider();
  const cash = await screen.findByRole('button', { name: /Confirm ₹500 Cash/ });
  await act(async () => { fireEvent.click(cash); });
  expect(screen.getByRole('button', { name: /Confirm Delivery/ })).toBeDisabled();
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Confirm Jeans L Black collected — Good/ })); });
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Confirm Delivery/ })); });
  panel.unmount();
  render(<CustomerBill orderId="COD1" />);
  expect(await screen.findByRole('link', { name: 'Download Payment Receipt' })).toHaveAttribute('href', 'http://localhost:8000/api/receipt_download?order_id=COD1');
  expect(screen.getByText(/Order completed/)).toBeInTheDocument();
});
