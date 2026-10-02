import { render, screen, fireEvent } from '@testing-library/react';
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

test('rider collection sends a trial item directly without barcode scanning', async () => {
  let collected = false;
  postData.mockImplementation(async endpoint => {
    if (endpoint === 'process_return') { collected = true; return { status: true }; }
    return { status: true, data: [{ id: 4, product_name: 'Shirt', size: 'M', security_tag: 'TAG-4', stock_reserved: true, selected: false, return_status: collected ? 'Collected' : null }] };
  });
  render(<TrialReturnCollection orderId="T1" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Collected — good condition' }));
  await screen.findByText('Collected');
  expect(postData).toHaveBeenCalledWith('process_return', { try_order_item_id: 4, condition: 'Good', tag_intact: true });
  expect(screen.queryByRole('button', { name: /Approve hygiene/ })).not.toBeInTheDocument();
});

test('return history shows stock outcomes without warehouse controls', async () => {
  getData.mockResolvedValue({ status: true, data: { items: [], returns: [
    { id: 3, order_id: 'T1', product_name: 'Shirt', condition: 'Damaged', status: 'Rejected' },
    { id: 4, order_id: 'T2', product_name: 'Jeans', condition: 'Good', status: 'Approved' },
    { id: 5, order_id: 'T3', product_name: 'Tee', condition: 'Good', status: 'Collected' },
  ] } });
  render(<InventoryReturns />);
  await screen.findByText('Unavailable for sale');
  expect(screen.getByText('Stock restored')).toBeInTheDocument();
  expect(screen.getByText('Legacy return: stock reconciliation required')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /warehouse|hygiene|steam/i })).not.toBeInTheDocument();
});
