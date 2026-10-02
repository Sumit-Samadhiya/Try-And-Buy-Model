import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DeliveryHome from './DeliveryHome';
import { fetchDeliveryTasksFromApi, getDeliveryLogin } from '../data/deliverySessionStore';

jest.mock('../data/deliverySessionStore', () => ({ fetchDeliveryTasksFromApi: jest.fn(), getDeliveryLogin: jest.fn() }));
jest.mock('../../services/useOrderEvents', () => () => {});
jest.mock('../../services/LocationButton', () => () => null);
jest.mock('../components/DeliveryShell', () => ({ children }) => <div>{children}</div>);
jest.mock('../components/DeliveryTaskCard', () => ({ task }) => <div>{task.id}</div>);

test('failed task loading shows a retry instead of claiming there are no tasks, then recovers', async () => {
  getDeliveryLogin.mockReturnValue({ phone: '9000000000', name: 'Test Rider' });
  fetchDeliveryTasksFromApi.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([]);
  render(<MemoryRouter><DeliveryHome /></MemoryRouter>);
  expect(await screen.findByRole('alert')).toHaveTextContent('Delivery tasks could not be refreshed');
  expect(screen.queryByText('No tasks available.')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Retry', exact: true }));
  expect(await screen.findByText('No tasks available.')).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('failed refresh hides stale task actions until a successful retry', async () => {
  getDeliveryLogin.mockReturnValue({ phone: '9000000000' });
  fetchDeliveryTasksFromApi.mockResolvedValueOnce([{ id: 'Task Eight', status: 'assigned' }]).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([{ id: 'Task Eight', status: 'assigned' }]);
  render(<MemoryRouter><DeliveryHome /></MemoryRouter>);
  await screen.findByText('Task Eight');
  fireEvent.click(screen.getByRole('button', { name: 'Refresh', exact: true }));
  await screen.findByRole('alert');
  expect(screen.queryByText('Task Eight')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Retry', exact: true }));
  expect(await screen.findByText('Task Eight')).toBeInTheDocument();
});
