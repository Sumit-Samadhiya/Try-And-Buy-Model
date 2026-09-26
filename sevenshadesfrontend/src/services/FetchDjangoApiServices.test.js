import axios from 'axios';
import { postData, logout } from './FetchDjangoApiServices';

jest.mock('axios', () => ({ create: jest.fn(options => ({ defaults: options, get: jest.fn(), post: jest.fn() })) }));
const api = axios.create.mock.results[0].value;

beforeEach(() => { localStorage.clear(); api.get.mockReset(); api.post.mockReset(); });

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
