import { fetchDeliveryTasksFromApi, getDeliveryTasks } from './deliverySessionStore';
import { postData } from '../../services/FetchDjangoApiServices';

jest.mock('../../services/FetchDjangoApiServices', () => ({ postData: jest.fn(), getData: jest.fn() }));

test('rider sees the booked date and slot without a fabricated distance', async () => {
  postData.mockResolvedValue({ status: true, data: [{ assignment_id: 1, status: 'Assigned', try_order: {
    order_id: 'T1', scheduled_date: '2026-10-03', delivery_slot: '02:00 PM - 06:00 PM', tryorderitem_set: [],
  } }] });
  const [task] = await fetchDeliveryTasksFromApi('9876543210');
  expect(task.slot).toBe('2026-10-03 · 02:00 PM - 06:00 PM');
  expect(task.routeDistanceKm).toBeNull();
});

test('a failed refresh preserves cached tasks and reports failure instead of an empty shift', async () => {
  postData.mockResolvedValue({ status: true, data: [{ assignment_id: 8, status: 'Assigned', try_order: { order_id: 'T8', tryorderitem_set: [] } }] });
  const previous = await fetchDeliveryTasksFromApi('9876543210');
  postData.mockResolvedValue({ status: false, data: [] });
  await expect(fetchDeliveryTasksFromApi('9876543210')).rejects.toThrow('Unable to refresh');
  expect(getDeliveryTasks()).toEqual(previous);
  postData.mockResolvedValue({ status: true, data: [] });
  expect(await fetchDeliveryTasksFromApi('9876543210')).toEqual([]);
  expect(getDeliveryTasks()).toEqual([]);
});
