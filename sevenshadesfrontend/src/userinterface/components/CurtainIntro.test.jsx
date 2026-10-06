import { act, fireEvent, render, screen } from '@testing-library/react';
import CurtainIntro from './CurtainIntro';

beforeEach(() => {
  jest.useFakeTimers();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

test('reveals content once ready and removes the modal', () => {
  const { rerender } = render(<CurtainIntro />);
  expect(screen.getByRole('dialog')).toBeVisible();
  rerender(<CurtainIntro ready />);
  act(() => jest.advanceTimersByTime(700));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('slow requests cannot leave customers behind a permanent curtain', () => {
  render(<CurtainIntro />);
  act(() => jest.advanceTimersByTime(6000));
  act(() => jest.advanceTimersByTime(700));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('customers can skip the intro', () => {
  render(<CurtainIntro />);
  fireEvent.click(screen.getByRole('button', { name: /skip intro/i }));
  act(() => jest.advanceTimersByTime(700));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
