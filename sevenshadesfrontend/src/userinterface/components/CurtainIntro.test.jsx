import { act, fireEvent, render, screen } from '@testing-library/react';
import CurtainIntro from './CurtainIntro';

beforeEach(() => {
  sessionStorage.clear();
  jest.useFakeTimers();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

test('reveals content once ready and removes the modal', () => {
  const { rerender } = render(<CurtainIntro />);
  expect(screen.getByRole('dialog')).toBeVisible();
  rerender(<CurtainIntro ready />);
  act(() => jest.advanceTimersByTime(1799));
  expect(screen.getByRole('dialog')).toBeVisible();
  act(() => jest.advanceTimersByTime(1));
  act(() => jest.advanceTimersByTime(950));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('slow requests cannot leave customers behind a permanent curtain', () => {
  render(<CurtainIntro />);
  act(() => jest.advanceTimersByTime(6000));
  act(() => jest.advanceTimersByTime(950));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('customers can skip the intro', () => {
  render(<CurtainIntro />);
  fireEvent.click(screen.getByRole('button', { name: /skip intro/i }));
  act(() => jest.advanceTimersByTime(950));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});


test('does not replay after navigation or refresh within the tab session', () => {
  const { unmount } = render(<CurtainIntro />);
  fireEvent.click(screen.getByRole('button', { name: /skip intro/i }));
  act(() => jest.advanceTimersByTime(950));
  expect(sessionStorage.getItem('doordrape-intro-seen')).toBe('1');
  unmount();
  render(<CurtainIntro />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('a fresh tab session can show the intro again', () => {
  sessionStorage.setItem('doordrape-intro-seen', '1');
  const { unmount } = render(<CurtainIntro />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  unmount();
  sessionStorage.clear();
  render(<CurtainIntro />);
  expect(screen.getByRole('dialog')).toBeVisible();
});
