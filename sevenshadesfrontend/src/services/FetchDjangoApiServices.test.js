import axios from 'axios';
import { postData, logout, catalogData, clearCatalogCache } from './FetchDjangoApiServices';

jest.mock('axios', () => ({ create: jest.fn(options => ({ defaults: options, get: jest.fn(), post: jest.fn() })) }));
const api = axios.create.mock.results[0].value;

test('catalog retry recovers a transient error without permitting mutation retries', async () => {
  api.get.mockRejectedValueOnce({ response: { status: 503 } }).mockResolvedValueOnce({ data: { status: true, data: [{ id: 1 }] } });
  expect((await catalogData('user_maincategory_list')).status).toBe(true);
  expect(api.get).toHaveBeenCalledTimes(2);
  await expect(catalogData('try_order_create', {})).rejects.toThrow('Catalog endpoint required');
});

beforeEach(() => { clearCatalogCache(); localStorage.clear(); api.get.mockReset(); api.post.mockReset(); });

test('catalog shares concurrent requests, caches success briefly, and refreshes expired data', async () => {
  const now = jest.spyOn(Date, 'now').mockReturnValue(1000);
  api.get.mockResolvedValue({ data: { status: true, data: [] } });
  await Promise.all([catalogData('user_banner_list'), catalogData('user_banner_list')]);
  await catalogData('user_banner_list');
  expect(api.get).toHaveBeenCalledTimes(1);
  now.mockReturnValue(62000);
  await catalogData('user_banner_list');
  expect(api.get).toHaveBeenCalledTimes(2);
  now.mockRestore();
});

test('catalog failures are never cached', async () => {
  api.get.mockResolvedValue({ data: { status: false, httpStatus: 400 } });
  await catalogData('user_banner_list');
  await catalogData('user_banner_list');
  expect(api.get).toHaveBeenCalledTimes(2);
});

test('mutations send a server-issued CSRF token using credentialed transport', async () => {
  api.get.mockResolvedValue({ data: { csrfToken: 'server-token' } });
  api.post.mockResolvedValue({ data: { status: true } });
  await postData('fetch_user_address', {});
  expect(api.defaults.withCredentials).toBe(true);
  expect(api.post).toHaveBeenCalledWith('fetch_user_address', {}, { headers: { 'X-CSRFToken': 'server-token' } });
});

test('unauthorized response clears cached accounts and returns a usable error', async () => {
  localStorage.setItem('sevenshades_user', '{}');
  api.get.mockResolvedValue({ data: { csrfToken: 'token' } });
  api.post.mockRejectedValue({ response: { status: 401, data: { message: 'Please sign in.' } } });
  const result = await postData('fetch_user_address', {});
  expect(result.status).toBe(false);
  expect(result.httpStatus).toBe(401);
  expect(localStorage.getItem('sevenshades_user')).toBeNull();
});

test('logout revokes the server session and removes cached tasks', async () => {
  localStorage.setItem('delivery_tasks_live_v1', '[{}]');
  api.get.mockResolvedValue({ data: { csrfToken: 'token' } });
  api.post.mockResolvedValue({ data: { status: true } });
  await logout();
  expect(api.post.mock.calls[0][0]).toBe('auth_logout');
  expect(localStorage.getItem('delivery_tasks_live_v1')).toBeNull();
});

test('stored application JWT is used and removed after logout', async () => {
  localStorage.setItem('sevenshades_token', 'app-jwt');
  api.post.mockResolvedValue({data:{status:true}});
  await logout();
  expect(api.post).toHaveBeenCalledWith('auth_logout', {}, {headers:{Authorization:'Bearer app-jwt'}});
  expect(api.get).not.toHaveBeenCalled();
  expect(localStorage.getItem('sevenshades_token')).toBeNull();
});
