import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CancelTrialButton, TrialReturnCollection } from './TrialInventoryControls';
import InventoryReturns from '../administrator/screens/InventoryReturns';
import { getData, postData } from './FetchDjangoApiServices';

jest.mock('./FetchDjangoApiServices', () => ({ getData: jest.fn(), postData: jest.fn() }));

test('cancellation uses the order ID and cannot repeat after success', async () => {
  postData.mockResolvedValue({ status: true });
  render(<CancelTrialButton orderId="T1" />);
  fireEvent.click(screen.getByRole('button', { name: 'Cancel before dispatch' }));
  await screen.findByText('Trial cancelled; reserved stock released. An unused introductory offer is retained.');
  expect(postData).toHaveBeenCalledWith('cancel_trial', { order_id: 'T1' });
  expect(screen.getByRole('button', { name: 'Cancel before dispatch' })).toBeDisabled();
});

test('rider collection sends a trial item and leaves warehouse review pending', async () => {
  let collected = false;
  postData.mockImplementation(async endpoint => {
    if (endpoint === 'process_return') { collected = true; return { status: true }; }
    return { status: true, data: [{ id: 4, product_name: 'Shirt', size: 'M', stock_reserved: true, selected: false, return_status: collected ? 'Collected' : null }] };
  });
  render(<TrialReturnCollection orderId="T1" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Collected — good condition' }));
  await screen.findByText('Collected');
  expect(postData).toHaveBeenCalledWith('process_return', { try_order_item_id: 4, condition: 'Good', tag_intact: false });
  expect(screen.queryByRole('button', { name: /Approve hygiene/ })).not.toBeInTheDocument();
});

test('warehouse approval appears only after receipt and is disabled for damaged items', async () => {
  let status = 'Collected';
  getData.mockImplementation(async () => ({ status: true, data: { items: [], returns: [{ id: 3, order_id: 'T1', product_name: 'Shirt', condition: 'Damaged', status }] } }));
  postData.mockImplementation(async () => { status = 'Received'; return { status: true }; });
  render(<InventoryReturns />);
  const receive = await screen.findByRole('button', { name: 'Confirm warehouse receipt' });
  expect(screen.queryByRole('button', { name: /Approve hygiene/ })).not.toBeInTheDocument();
  fireEvent.click(receive);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Approve hygiene & release stock' })).toBeDisabled());
  expect(postData).toHaveBeenCalledWith('update_hygiene_status', { return_id: 3, action: 'receive' });
});
