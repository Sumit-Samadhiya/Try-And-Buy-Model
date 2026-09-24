import { render, screen, fireEvent, act } from '@testing-library/react';
import DeliveryOps from './DeliveryOps';
import { getData, postData } from '../../services/FetchDjangoApiServices';
jest.mock('../../services/FetchDjangoApiServices', () => ({ getData: jest.fn(), postData: jest.fn() }));
jest.mock('../../services/useOrderEvents', () => () => {});
jest.mock('./RiderSuggestions', () => () => null);
jest.mock('./DeliveryBatches', () => () => null);
jest.mock('../../diliveryinterface/screens/DeliveryOrderDetails', () => ({ orderId }) => <div>Selection panel for {orderId}</div>);
test('completing a trial in Delivery Ops opens its customer selection panel', async () => {
  const assignment = { assignment_id: 'A1', status: 'Trial In Progress', assigned_at: '2026-09-24', try_order: { order_id: 'T1', mobileno: '9000000000' }, rider: {} };
  getData.mockImplementation(async endpoint => ({ status: true, data: endpoint === 'delivery_assignments_list' ? [assignment] : [] }));
  postData.mockResolvedValue({ status: true });
  render(<DeliveryOps />);
  await screen.findByText('No riders found.');
  await act(async () => { fireEvent.click(screen.getByRole('tab', { name: 'Order Assignment' })); });
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Trial Completed', exact: true })); });
  expect(postData).toHaveBeenCalledWith('delivery_assignment_update_status', { assignment_id: 'A1', status: 'Trial Completed' });
  expect(await screen.findByText('Selection panel for T1')).toBeInTheDocument();
});
