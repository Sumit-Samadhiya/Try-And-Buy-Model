import { render, screen, fireEvent } from '@testing-library/react';
import DeliveryTaskCard from './DeliveryTaskCard';

test('rider can call customer and opens billing instead of completing an active trial', () => {
  const onOpenDetails = jest.fn();
  const onStatusChange = jest.fn();
  render(<DeliveryTaskCard task={{ id: 'T1', status: 'trial_in_progress', customerPhone: '9876543210', items: [] }} onOpenDetails={onOpenDetails} onStatusChange={onStatusChange} />);
  expect(screen.getByRole('link', { name: 'Call' })).toHaveAttribute('href', 'tel:9876543210');
  expect(screen.getByText('Distance unavailable')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Select Items & Generate Bill' }));
  expect(onOpenDetails).toHaveBeenCalledWith('T1');
  expect(onStatusChange).not.toHaveBeenCalled();
});
