import imageUrl, { responsiveImage } from './imageUrl';
import images from './catalogImages.json';
jest.mock('./FetchDjangoApiServices', () => ({ serverURL: 'https://backend.example.com' }));

test('known catalog images use generated files while unknown uploads retain backend URLs', () => {
  const name = Object.keys(images)[0];
  expect(imageUrl(`/media/${name}`)).toBe(images[name]['960']);
  expect(imageUrl('future-upload.jpg')).toMatch(/\/media\/static\/future-upload.jpg$/);
  expect(imageUrl('https://example.com/photo.jpg')).toBe('https://example.com/photo.jpg');
});

test('responsive images offer fixed sizes and a local fallback without an error loop', () => {
  const name = Object.keys(images)[0];
  const props = responsiveImage(name, '100vw', true);
  expect(props.srcSet).toContain('1600w');
  const target = { dataset: {}, removeAttribute: jest.fn() };
  props.onError({ currentTarget: target });
  expect(target.src).toBe(images[name]['960']);
  props.onError({ currentTarget: target });
  expect(target.removeAttribute).toHaveBeenCalledTimes(1);
});
