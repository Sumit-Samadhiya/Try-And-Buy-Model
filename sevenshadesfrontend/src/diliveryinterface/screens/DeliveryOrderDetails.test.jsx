import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DeliveryOrderDetails from './DeliveryOrderDetails';
import { postData } from '../../services/FetchDjangoApiServices';
jest.mock('../../services/FetchDjangoApiServices', () => ({ postData: jest.fn(), serverURL: 'http://localhost:8000' }));
jest.mock('../../services/useOrderEvents', () => () => {});
jest.mock('../components/DeliveryShell', () => ({ children }) => <div>{children}</div>);
const makeData = () => ({
  try_order: { order_id: 'T1', status: 'SELECTION_SUBMITTED', tryorderitem_set: [{ id: 1, product_name: 'Shirt', size: 'M', color: 'Blue', line_total: 500, stock_reserved: true, status: 'TRY_REQUESTED' }] },
  assignment_id: 'A1', assignment_status: 'Trial Completed', server_time: new Date().toISOString(), trial_ends_at: new Date(Date.now() + 600000).toISOString(),
  customer_approved: false, final_order: { bill_revision: 3, selected_items_count: 1, items_total: 500, wallet_credit: 0, final_payable: 500, payment_mode: 'cash', payment_status: 'pending', finalorderitem_set: [{ try_order_item: 1 }] }
});
function show() { render(<MemoryRouter initialEntries={['/delivery/order/T1']}><Routes><Route path="/delivery/order/:taskId" element={<DeliveryOrderDetails />} /></Routes></MemoryRouter>); }

test('failed order load offers retry and stops the loading message', async () => {
  postData.mockResolvedValueOnce({ status: false, message: 'Order unavailable' })
    .mockResolvedValue({ status: true, data: makeData() });
  show();
  expect(await screen.findByText('Order unavailable')).toBeInTheDocument();
  expect(screen.queryByText('Loading doorstep order…')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByRole('button', { name: 'Confirm ₹500 Cash Physically Received' })).toBeInTheDocument();
  expect(screen.queryByText('Order unavailable')).not.toBeInTheDocument();
});

test('rider cannot approve for customer and can collect only after server approval', async () => {
  const data = makeData();
  postData.mockImplementation(async endpoint => ({ status: true, data: endpoint === 'trial_return_items' ? [] : data }));
  show();
  const cash = await screen.findByRole('button', { name: 'Confirm ₹500 Cash Physically Received' });
  expect(cash).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'Customer Approved' })).not.toBeInTheDocument();
  data.customer_approved = true;
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Refresh verified status' })); });
  await waitFor(() => expect(cash).not.toBeDisabled());
  await act(async () => { fireEvent.click(cash); });
  await waitFor(() => expect(postData).toHaveBeenCalledWith('final_payment_update', { order_id: 'T1', bill_revision: 3, payment_mode: 'cash', payment_status: 'paid' }));
});

test('generate bill sends item IDs and does not mark the customer approved', async () => {
  const data = makeData(); data.final_order = null; data.try_order.status = 'TRIAL_COMPLETED';
  postData.mockResolvedValue({ status: true, data });
  show();
  const actionButton = await screen.findByRole('button', { name: 'Send Selection for Customer Approval' });
  fireEvent.click(screen.getByRole('checkbox'));
  await act(async () => { fireEvent.click(actionButton); });
  await waitFor(() => expect(postData).toHaveBeenCalledWith('submit_final_selection', { order_id: 'T1', selected_items: [] }));
  expect(postData.mock.calls.some(([endpoint]) => endpoint === 'customer_approve_bill')).toBe(false);
  expect(postData.mock.calls.some(([endpoint]) => endpoint === 'process_return')).toBe(false);
});

test('returns require approval and successful physical collection before delivery', async () => {
  const data = makeData();
  data.final_order.finalorderitem_set = [];
  data.final_order.payment_status = 'paid';
  let fail = true;
  postData.mockImplementation(async endpoint => {
    if (endpoint === 'process_return') {
      if (fail) return { status: false, message: 'Collection not saved' };
      data.try_order.tryorderitem_set[0].status = 'RETURNED';
    }
    return { status: true, data };
  });
  show();
  const collect = await screen.findByRole('button', { name: /Confirm Shirt M Blue collected — Good/ });
  expect(collect).toBeDisabled();
  const delivery = screen.getByRole('button', { name: /Confirm Delivery/ });
  expect(delivery).toBeDisabled();
  data.customer_approved = true;
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Refresh verified status' })); });
  await act(async () => { fireEvent.click(collect); });
  expect(await screen.findByText('Collection not saved')).toBeInTheDocument();
  expect(delivery).toBeDisabled();
  fail = false;
  await act(async () => { fireEvent.click(collect); });
  expect(postData).toHaveBeenCalledWith('process_return', { try_order_item_id: 1, condition: 'Good' });
  expect(delivery).toBeEnabled();
});

test('selection opens only after trial completed is saved', async () => {
  const data = makeData(); data.final_order = null; data.assignment_status = 'Trial In Progress'; data.try_order.status = 'TRIAL_IN_PROGRESS';
  postData.mockImplementation(async endpoint => {
    if (endpoint === 'delivery_assignment_update_status') { data.assignment_status = 'Trial Completed'; data.try_order.status = 'TRIAL_COMPLETED'; }
    return { status: true, data };
  });
  show();
  const complete = await screen.findByRole('button', { name: 'Trial Completed — Open Customer Selection' });
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  await act(async () => { fireEvent.click(complete); });
  expect(postData).toHaveBeenCalledWith('delivery_assignment_update_status', { assignment_id: 'A1', status: 'Trial Completed' });
  expect(await screen.findByRole('checkbox')).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Send Selection for Customer Approval' })).toBeEnabled();
});
