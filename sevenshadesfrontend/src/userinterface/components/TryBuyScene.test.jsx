jest.mock('./TrialRoom3D', () => () => <div data-testid="webgl-room" />);
import { render, screen, fireEvent, act } from '@testing-library/react';
import TryBuyScene from './TryBuyScene';
beforeEach(() => { jest.useFakeTimers(); window.matchMedia = jest.fn(() => ({ matches:false, addEventListener:jest.fn(), removeEventListener:jest.fn() })); });
afterEach(() => jest.useRealTimers());
jest.mock('./DrapeyAvatar', () => () => <span data-testid="scene-drapey" />);
test('Drapey automatically explains the journey without visible step controls', () => {
 const { container } = render(<TryBuyScene />);
 expect(screen.getByTestId('scene-drapey')).toBeInTheDocument();
 expect(screen.queryByRole('button')).not.toBeInTheDocument();
 expect(container.querySelector('.tb-host-bubble')).toHaveTextContent('Medium and Large');
 act(() => jest.advanceTimersByTime(12000));
 expect(container.querySelector('.tb-host-bubble')).toHaveTextContent('35-minute timer');
 act(() => jest.advanceTimersByTime(12000));
 expect(container.querySelector('.tb-host-bubble')).toHaveTextContent('15 minutes');
});
test('reduced motion preserves all information without automatic movement', () => {
 window.matchMedia.mockReturnValue({ matches:true, addEventListener:jest.fn(), removeEventListener:jest.fn() });
 const { container } = render(<TryBuyScene />);
 act(() => jest.advanceTimersByTime(20000));
 expect(container.querySelector('.tb-host-bubble')).toHaveTextContent('Medium and Large');
 expect(screen.getByText('Pay for What Fits. Hand Back the Rest.')).toBeInTheDocument();
});
