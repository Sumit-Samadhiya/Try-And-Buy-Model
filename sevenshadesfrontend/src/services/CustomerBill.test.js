import { render, screen, fireEvent, act } from '@testing-library/react';
import CustomerBill from './CustomerBill';
import { postData } from './FetchDjangoApiServices';

jest.mock('./FetchDjangoApiServices', () => ({ postData: jest.fn(), serverURL: 'http://localhost:8000' }));
jest.mock('./useOrderEvents', () => () => {});

const final = {
  bill_revision: 2,
  approved_revision: 0,
  payment_status: 'pending',
  payment_mode: 'cash',
  selected_items_count: 1,
  items_total: 500,
  wallet_credit: 0,
  final_payable: 500,
  finalorderitem_set: [{ id: 1, product_name: 'Shirt', size: 'M', color: 'Blue', qty: 1, line_total: 500 }],
};

const detail = () => ({
  try_order: { status: 'SELECTION_SUBMITTED' },
  final_order: { ...final },
  customer_approved: false,
  online_available: false,
});

test('customer approves the displayed bill revision and cash remains awaiting rider collection', async () => {
  const data = detail();
  postData.mockImplementation(async (endpoint, payload) => {
    if (endpoint === 'customer_approve_bill') {
      data.customer_approved = true;
      data.final_order.payment_mode = 'cash';
      data.try_order.status = 'SELECTION_SUBMITTED';
      return { status: true, data: data.final_order };
    }
    return { status: true, data };
  });

  render(<CustomerBill orderId="T1" />);
  const approveButton = await screen.findByRole('button', { name: /Approve Selection & Pay ₹500 Cash to Rider/ });
  await act(async () => {
    fireEvent.click(approveButton);
  });

  expect(postData).toHaveBeenCalledWith('customer_approve_bill', {
    order_id: 'T1',
    bill_revision: 2,
    payment_mode: 'cash',
  });
  expect(await screen.findByText(/Total Cash Payable: ₹500/)).toBeInTheDocument();
  expect(screen.getByText(/Cash on Delivery \(COD\)/)).toBeInTheDocument();
  expect(postData.mock.calls.some(([endpoint]) => endpoint === 'final_payment_update')).toBe(false);
});

test('rejected stale approval displays message and receipt uses authorized endpoint', async () => {
  const data = detail();
  data.receipt_number = 'R1';
  postData.mockImplementation(async (endpoint) =>
    endpoint === 'customer_approve_bill'
      ? { status: false, message: 'Bill changed; refresh.' }
      : { status: true, data }
  );

  render(<CustomerBill orderId="T1" />);
  const approveButton = await screen.findByRole('button', { name: /Approve Selection & Pay ₹500 Cash to Rider/ });
  await act(async () => {
    fireEvent.click(approveButton);
  });

  await screen.findByText('Bill changed; refresh.');
  expect(screen.getByRole('link', { name: 'Download Payment Receipt' })).toHaveAttribute(
    'href',
    'http://localhost:8000/api/receipt_download?order_id=T1'
  );
});
