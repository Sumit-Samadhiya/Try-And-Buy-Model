import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DeliveryBatches from './DeliveryBatches';
import { getData, postData } from '../../services/FetchDjangoApiServices';

jest.mock('../../services/FetchDjangoApiServices', () => ({ getData: jest.fn(), postData: jest.fn() }));

test('batch generation requires an active rider and displays real order membership', async () => {
  let generated = false;
  const row = { batch_id: 'B1', rider_name: 'Rider One', status: 'Pending', order_ids: ['T1', 'T2'] };
  getData.mockImplementation(async () => ({ status: true, data: generated ? [row] : [] }));
  postData.mockImplementation(async () => { generated = true; return { status: true, data: [row] }; });
  const onAssigned = jest.fn();
  render(<DeliveryBatches riders={[{ rider_id: 'R1', name: 'Rider One', status: 'Active' }, { rider_id: 'R2', name: 'Inactive Rider', status: 'Inactive' }]} onAssigned={onAssigned} />);
  const button = screen.getByRole('button', { name: 'Assign pending orders in batches' });
  expect(button).toBeDisabled();
  fireEvent.mouseDown(screen.getByRole('combobox'));
  expect(screen.queryByRole('option', { name: 'Inactive Rider' })).not.toBeInTheDocument();
  fireEvent.click(await screen.findByRole('option', { name: 'Rider One' }));
  fireEvent.click(button);
  await screen.findByText('T1, T2');
  expect(postData).toHaveBeenCalledWith('generate_delivery_batch', { rider_id: 'R1' });
  await waitFor(() => expect(onAssigned).toHaveBeenCalledTimes(1));
});
