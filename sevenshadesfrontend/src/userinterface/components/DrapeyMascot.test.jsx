import { render, screen, fireEvent, act } from '@testing-library/react';
import DrapeyMascot, { guidePosition } from './DrapeyMascot';

jest.mock('./DrapeyAvatar', () => ({ mood }) => <span data-testid="avatar" data-mood={mood} />);
beforeEach(() => {
  jest.useFakeTimers();
  window.matchMedia = jest.fn().mockReturnValue({ matches:false, addEventListener:jest.fn(), removeEventListener:jest.fn() });
  if (typeof window.speechSynthesis === 'undefined') {
    window.speechSynthesis = {
      speak: jest.fn(),
      cancel: jest.fn(),
      getVoices: jest.fn().mockReturnValue([])
    };
  }
  if (typeof window.SpeechSynthesisUtterance === 'undefined') {
    window.SpeechSynthesisUtterance = function(text) { this.text = text; };
  }
  window.HTMLMediaElement.prototype.play = jest.fn().mockResolvedValue();
  window.HTMLMediaElement.prototype.pause = jest.fn();
  if (typeof window.AudioContext === 'undefined') {
    window.AudioContext = function() {
      return {
        currentTime: 0,
        state: 'running',
        resume: jest.fn().mockResolvedValue(),
        createOscillator: () => ({
          type: 'sine',
          frequency: { setValueAtTime: jest.fn(), exponentialRampToValueAtTime: jest.fn() },
          connect: jest.fn(),
          start: jest.fn(),
          stop: jest.fn()
        }),
        createGain: () => ({
          gain: { setValueAtTime: jest.fn(), exponentialRampToValueAtTime: jest.fn() },
          connect: jest.fn()
        }),
        destination: {}
      };
    };
  }
  if (typeof window.PointerEvent === 'undefined') {
    window.PointerEvent = class PointerEvent extends window.MouseEvent {
      constructor(type, params = {}) {
        super(type, params);
        this.pointerId = params.pointerId ?? 1;
        this.pointerType = params.pointerType ?? 'mouse';
      }
    };
  }
});
afterEach(() => jest.useRealTimers());

test('shows thinking dots, types the message, then gets out of the way', () => {
  const { container } = render(<DrapeyMascot />);
  expect(container.querySelector('.drapey--thinking')).toBeTruthy();
  act(() => jest.advanceTimersByTime(750));
  expect(container.querySelector('.drapey--typing')).toBeTruthy();
  act(() => jest.advanceTimersByTime(4000));
  expect(container.querySelector('.drapey--speaking')).toBeTruthy();
  act(() => jest.advanceTimersByTime(7000));
  expect(container.querySelector('.drapey--quiet')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name:'Talk to Drapey' }));
  expect(container.querySelector('.drapey--thinking')).toBeTruthy();
});

test('Escape dismisses speech and no unwanted icon controls appear', () => {
  const { container } = render(<DrapeyMascot />);
  fireEvent.keyDown(window, { key:'Escape' });
  expect(container.querySelector('.drapey--quiet')).toBeTruthy();
  expect(screen.getAllByRole('button')).toHaveLength(1);
});

test('reduced motion shows complete text without typing or animation', () => {
  window.matchMedia.mockReturnValue({ matches:true, addEventListener:jest.fn(), removeEventListener:jest.fn() });
  const { container } = render(<DrapeyMascot />);
  expect(container.querySelector('.drapey--still')).toBeTruthy();
  expect(container.querySelector('.drapey-speech').textContent).toContain('Hey!');
});

test('scroll uses the visible section message', () => {
  const section = document.createElement('section');
  section.dataset.drapeyMessage = 'Explore the Budget Bazaar picks!';
  section.getBoundingClientRect = () => ({ top:100 });
  document.body.appendChild(section);
  render(<DrapeyMascot />);
  fireEvent.scroll(window);
  act(() => jest.advanceTimersByTime(50));
  expect(screen.getByText('Explore the Budget Bazaar picks!', { selector:'.sr-only' })).toBeInTheDocument();
  section.remove();
});

test('curved travel changes both coordinates within one long section', () => {
  const a = guidePosition(0, 1200, 800);
  const b = guidePosition(260, 1200, 800);
  expect(a.x).not.toBe(b.x);
  expect(a.y).not.toBe(b.y);
});

test('both bubble orientations occur and mobile coordinates stay in bounds', () => {
  const placements = Array.from({ length:30 }, (_, i) => guidePosition(i * 100, 390, 844));
  expect(placements.some(p => p.below)).toBe(true);
  expect(placements.some(p => !p.below)).toBe(true);
  placements.forEach(p => {
    expect(p.x).toBeGreaterThanOrEqual(12);
    expect(p.x + 54).toBeLessThanOrEqual(378);
    expect(p.y + 54).toBeLessThanOrEqual(744);
    expect(p.x + p.offset).toBeGreaterThanOrEqual(12);
    expect(p.x + p.offset + 230).toBeLessThanOrEqual(378);
  });
});


test('action feedback survives scrolling and route changes, then resumes guidance', () => {
  const { rerender } = render(<DrapeyMascot routeKey="/login" greetingMessage="Sign in here" />);
  act(() => window.dispatchEvent(new CustomEvent('drapey-feedback', { detail: { message:'Check your mobile number', tone:'error' } })));
  fireEvent.scroll(window);
  act(() => jest.advanceTimersByTime(50));
  expect(screen.getByText('Check your mobile number', { selector:'.sr-only' })).toBeInTheDocument();
  rerender(<DrapeyMascot routeKey="/home" greetingMessage="Welcome home" />);
  act(() => jest.advanceTimersByTime(50));
  expect(screen.getByText('Check your mobile number', { selector:'.sr-only' })).toBeInTheDocument();
  act(() => jest.advanceTimersByTime(14500));
  fireEvent.scroll(window);
  act(() => jest.advanceTimersByTime(50));
  expect(screen.getByText('Welcome home', { selector:'.sr-only' })).toBeInTheDocument();
});

test('feedback wakes a sleeping mascot and listeners are removed on unmount', () => {
  const { unmount } = render(<DrapeyMascot />);
  act(() => jest.advanceTimersByTime(31000));
  expect(screen.getByTestId('avatar')).toHaveAttribute('data-mood', 'sleeping');
  act(() => window.dispatchEvent(new CustomEvent('drapey-feedback', { detail: { message:'Address saved', tone:'success' } })));
  expect(screen.getByTestId('avatar')).toHaveAttribute('data-mood', 'thinking');
  const remove = jest.spyOn(window, 'removeEventListener');
  unmount();
  expect(remove).toHaveBeenCalledWith('drapey-feedback', expect.any(Function));
  remove.mockRestore();
});


test('add_to_cart triggers yahoo animation and stars', () => {
  const { container } = render(<DrapeyMascot />);
  act(() => {
    window.dispatchEvent(
      new CustomEvent('drapey-feedback', {
        detail: { message: 'YAAHOOO! Added to bag!', tone: 'add_to_cart' }
      })
    );
  });
  expect(container.querySelector('.drapey-action--yahoo')).toBeTruthy();
  expect(container.querySelector('.drapey-yahoo-stars')).toBeTruthy();
  expect(screen.getByTestId('avatar')).toHaveAttribute('data-mood', 'yahoo');
});

test('order_success triggers victory celebration dance', () => {
  const { container } = render(<DrapeyMascot />);
  act(() => {
    window.dispatchEvent(
      new CustomEvent('drapey-feedback', {
        detail: { message: 'Order confirmed!', tone: 'order_success' }
      })
    );
  });
  expect(container.querySelector('.drapey-action--order_success')).toBeTruthy();
  expect(container.querySelector('.drapey-order-particles')).toBeTruthy();
  expect(screen.getByTestId('avatar')).toHaveAttribute('data-mood', 'celebrating');
});

test('rapid 3 taps triggers angry bomb explosion easter egg and recovers', () => {
  const { container } = render(<DrapeyMascot />);
  const button = screen.getByRole('button', { name: 'Talk to Drapey' });

  // 1st click
  fireEvent.click(button);
  expect(container.querySelector('.drapey-mode--angry')).toBeFalsy();

  // 2nd quick click
  fireEvent.click(button);
  expect(screen.getByText(/2 baar chhu diya/i, { selector: '.sr-only' })).toBeInTheDocument();

  // 3rd quick click within 1.2s -> TRIGGERS BOMB RAGE
  fireEvent.click(button);
  expect(container.querySelector('.drapey-mode--angry')).toBeTruthy();
  expect(screen.getByTestId('avatar')).toHaveAttribute('data-mood', 'angry');
  expect(screen.getByText(/3 BAAR KYUN DABAYA/i, { selector: '.sr-only' })).toBeInTheDocument();

  // Advances to explosion phase
  act(() => jest.advanceTimersByTime(1450));
  expect(container.querySelector('.drapey-mode--exploding')).toBeTruthy();
  expect(container.querySelector('.drapey-bomb-explosion')).toBeTruthy();

  // Advances to soot/ash phase
  act(() => jest.advanceTimersByTime(1050));
  expect(container.querySelector('.drapey-mode--soot')).toBeTruthy();
  expect(screen.getByTestId('avatar')).toHaveAttribute('data-mood', 'soot');

  // Advances back to normal
  act(() => jest.advanceTimersByTime(2900));
  expect(container.querySelector('.drapey-mode--angry')).toBeFalsy();
  expect(container.querySelector('.drapey-mode--exploding')).toBeFalsy();
  expect(container.querySelector('.drapey-mode--soot')).toBeFalsy();
});

test('dragging drapey updates position and avoids triggering click easter egg', () => {
  const { container } = render(<DrapeyMascot />);
  const button = screen.getByRole('button', { name: 'Talk to Drapey' });
  const aside = container.querySelector('.drapey');

  const initialTransform = aside.style.transform;

  // Pointer down & move wrapped in act
  act(() => {
    fireEvent.pointerDown(button, { button: 0, clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(button, { clientX: 220, clientY: 280, pointerId: 1 });
  });
  expect(container.querySelector('.drapey--dragging')).toBeTruthy();

  // Pointer up
  act(() => {
    fireEvent.pointerUp(button, { clientX: 220, clientY: 280, pointerId: 1 });
  });
  expect(container.querySelector('.drapey--dragging')).toBeFalsy();

  // Transform should have changed to new dragged coordinates
  expect(aside.style.transform).not.toBe(initialTransform);

  // Subsequent click does NOT trigger angry mode
  act(() => {
    fireEvent.click(button);
  });
  expect(container.querySelector('.drapey-mode--angry')).toBeFalsy();
});

test('mascot maintains exactly 1 accessible button role without any audio controls', () => {
  const { container } = render(<DrapeyMascot />);
  expect(container.querySelector('.drapey-sound-toggle')).toBeFalsy();
  expect(screen.getAllByRole('button')).toHaveLength(1);
});
