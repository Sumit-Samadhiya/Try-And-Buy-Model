import { render, screen, fireEvent, act } from '@testing-library/react';
import DrapeyMascot from './DrapeyMascot';

beforeEach(() => {
  sessionStorage.clear();
  jest.useFakeTimers();
  window.matchMedia = jest.fn().mockReturnValue({ matches:false, addEventListener:jest.fn(), removeEventListener:jest.fn() });
});
afterEach(() => { jest.useRealTimers(); });

test('reacts to taps, sleeps after inactivity and wakes on interaction', () => {
  const { container } = render(<DrapeyMascot />);
  fireEvent.click(screen.getByRole('button', { name:/Say hello/ }));
  expect(screen.getByText(/Pick your favourites/)).toBeInTheDocument();
  expect(container.querySelector('.drapey--happy')).toBeInTheDocument();
  act(() => jest.advanceTimersByTime(30000));
  expect(container.querySelector('.drapey--sleeping')).toBeInTheDocument();
  fireEvent.keyDown(window, { key:'Tab' });
  expect(container.querySelector('.drapey--idle')).toBeInTheDocument();
});

test('supports pause and remembers dismissal across remounts', () => {
  const { container, unmount } = render(<DrapeyMascot />);
  fireEvent.click(screen.getByRole('button', { name:'Pause mascot animation' }));
  expect(container.querySelector('.drapey--still')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name:'Hide Drapey for this session' }));
  unmount();
  render(<DrapeyMascot />);
  expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
});

test('reduced motion keeps reactions still while tips remain usable', () => {
  window.matchMedia.mockReturnValue({ matches:true, addEventListener:jest.fn(), removeEventListener:jest.fn() });
  const { container } = render(<DrapeyMascot />);
  fireEvent.click(screen.getByRole('button', { name:/Next style tip/ }));
  expect(container.querySelector('.drapey--still')).toBeInTheDocument();
  expect(container.querySelector('.drapey--happy')).not.toBeInTheDocument();
});
