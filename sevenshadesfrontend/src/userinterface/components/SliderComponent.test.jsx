import { act, fireEvent, render, screen } from '@testing-library/react';
import SliderComponent from './SliderComponent';
jest.mock('../../services/imageUrl', () => ({ responsiveImage: image => ({ src: image }) }));
const data = [{ image: '/men.webp', bannerdescription: 'Men|Everyday|Try at home' }, { image: '/women.webp', bannerdescription: 'Women|Your edit|Pay for keeps' }];
beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());
test('only the current slide exists and navigation calls the matching action', () => {
  const onBannerClick = jest.fn();
  render(<SliderComponent data={data} onBannerClick={onBannerClick} />);
  expect(document.querySelectorAll('.home-banner img')).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Next collection' }));
  fireEvent.click(screen.getByRole('button', { name: /Shop Women/ }));
  expect(onBannerClick).toHaveBeenCalledWith(data[1], 1);
  expect(screen.queryByRole('button', { name: /Shop Men/ })).not.toBeInTheDocument();
});
test('rotation is opt-in and stops when keyboard focus enters', () => {
  render(<SliderComponent data={data} />);
  act(() => jest.advanceTimersByTime(6000));
  expect(screen.getByRole('button', { name: /Shop Men/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Play slideshow' }));
  act(() => jest.advanceTimersByTime(5000));
  expect(screen.getByRole('button', { name: /Shop Women/ })).toBeInTheDocument();
  fireEvent.focus(screen.getByRole('button', { name: 'Next collection' }));
  expect(screen.getByRole('button', { name: 'Play slideshow' })).toBeInTheDocument();
  act(() => jest.advanceTimersByTime(5000));
  expect(screen.getByRole('button', { name: /Shop Women/ })).toBeInTheDocument();
});
