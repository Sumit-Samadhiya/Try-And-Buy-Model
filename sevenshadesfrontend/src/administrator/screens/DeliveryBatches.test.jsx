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

test('optimizes batch route and displays 15-minute trial slot schedule', async () => {
  const row = { batch_id: 'BAT-123', rider_name: 'Rider One', status: 'Pending', order_ids: ['ORD-1', 'ORD-2'] };
  getData.mockResolvedValueOnce({ status: true, data: [row] });
  postData.mockResolvedValueOnce({
    status: true,
    routing_engine: 'OSRM Traveling Salesperson Loop',
    total_distance_km: 14.5,
    estimated_duration_minutes: 58,
    waypoints: [
      {
        stop_number: 1,
        order_id: 'ORD-1',
        address: 'Baragaon, Jhansi',
        leg_distance_km: 6.2,
        driving_duration_minutes: 14,
        estimated_arrival_time: '4:14 PM',
        trial_window: '4:14 PM - 4:29 PM (15m Trial)',
        fits_booked_slot: true,
        slot_status: 'On Time',
      },
      {
        stop_number: 2,
        order_id: 'ORD-2',
        address: 'Sipri Bazar, Jhansi',
        leg_distance_km: 8.3,
        driving_duration_minutes: 19,
        estimated_arrival_time: '4:48 PM',
        trial_window: '4:48 PM - 5:03 PM (15m Trial)',
        fits_booked_slot: true,
        slot_status: 'On Time',
      },
    ],
  });

  render(<DeliveryBatches riders={[]} />);
  const optButton = await screen.findByRole('button', { name: /Optimize 3-Bag Route/i });
  fireEvent.click(optButton);

  expect(await screen.findByText(/OSRM Traveling Salesperson Loop/i)).toBeInTheDocument();
  expect(screen.getByText(/Road: 14.5 km/i)).toBeInTheDocument();
  expect(screen.getByText(/Stop #1: ORD-1/i)).toBeInTheDocument();
  expect(screen.getByText(/4:14 PM - 4:29 PM \(15m Trial\)/i)).toBeInTheDocument();
  expect(screen.getByText(/Stop #2: ORD-2/i)).toBeInTheDocument();
});
