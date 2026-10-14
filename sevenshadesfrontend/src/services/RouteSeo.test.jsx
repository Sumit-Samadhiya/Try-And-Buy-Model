import { routeMetadata } from './RouteSeo';

test('home aliases share one canonical and catalog owns a distinct title', () => {
  expect(routeMetadata('/home')).toEqual(routeMetadata('/'));
  expect(routeMetadata('/productpage').canonical).toBe('https://doordrape.com/productpage');
  expect(routeMetadata('/productpage').title).not.toBe(routeMetadata('/').title);
});

test.each(['/profile', '/mybagdisplay', '/adminlogin', '/delivery/dashboard', '/unknown', '/productdetailspage'])(
  '%s does not enter the search index', path => {
    expect(routeMetadata(path).robots).toBe('noindex, follow');
  },
);

test('filtered catalog URLs do not compete with the unfiltered catalog', () => {
  expect(routeMetadata('/productpage', '?view=MainCategoryComponent&id=1').robots).toBe('noindex, follow');
  expect(routeMetadata('/productpage').robots).toContain('index, follow');
});
