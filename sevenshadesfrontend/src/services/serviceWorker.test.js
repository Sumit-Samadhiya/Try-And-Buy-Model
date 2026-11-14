const fs = require('fs');
const vm = require('vm');
const path = require('path');
const source = fs.readFileSync(path.join(__dirname, '../../public/sw.js'), 'utf8');
function accepts(url, method = 'GET', mode = 'cors') {
  const handlers = {};
  const cached = { ok: true };
  const context = { URL, self: { location: { origin: 'https://doordrape.com' }, addEventListener: (name, fn) => { handlers[name] = fn; } }, caches: { open: async () => ({ match: async () => cached }) } };
  vm.runInNewContext(source, context);
  const respondWith = jest.fn();
  handlers.fetch({ request: { url, method, mode }, respondWith });
  return respondWith.mock.calls.length > 0;
}
test('caches versioned same-origin assets', () => {
  expect(accepts('https://doordrape.com/assets/index-Abcd1234.js')).toBe(true);
});
test.each([
  ['https://doordrape.com/api/orders', 'GET', 'cors'],
  ['https://doordrape.com/signindisplay', 'GET', 'navigate'],
  ['https://doordrape.com/assets/index-Abcd1234.js', 'POST', 'cors'],
  ['https://other.example/assets/index-Abcd1234.js', 'GET', 'cors'],
  ['https://doordrape.com/catalog/product.webp', 'GET', 'cors'],
])('never intercepts private, mutable or third-party resources %s', (url, method, mode) => {
  expect(accepts(url, method, mode)).toBe(false);
});
