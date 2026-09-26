import { validateFields } from './validation';
import axios from 'axios';

const serverURL = process.env.REACT_APP_API_URL || `${window.location.protocol}//${window.location.hostname}:8000`;
const api = axios.create({ baseURL: `${serverURL}/api/`, withCredentials: true, timeout: 20000 });

export const clearCachedAccounts = (keepToken = false) => {
  if (!keepToken) localStorage.removeItem('sevenshades_token');
  ['sevenshades_user', 'ADMIN', 'delivery_boy_auth_v1', 'delivery_tasks_live_v1'].forEach(key => localStorage.removeItem(key));
};

const apiError = error => {
  if (error.response?.status === 401) {
    clearCachedAccounts();
    window.dispatchEvent(new Event('session-cleared'));
  }
  const responseData = typeof error.response?.data === 'object' && error.response?.data !== null
    ? error.response.data
    : {};
  let safeMessage = responseData.message;
  if (
    !safeMessage ||
    typeof safeMessage !== 'string' ||
    /Traceback|OperationalError|IntegrityError|DatabaseError|sqlite3|pymysql/i.test(safeMessage)
  ) {
    safeMessage = error.response?.status === 500
      ? 'An unexpected server error occurred. Please try again later.'
      : (responseData.message && typeof responseData.message === 'string' ? responseData.message : 'Unable to connect. Please try again.');
  }
  return {
    status: false,
    data: [],
    ...responseData,
    httpStatus: error.response?.status,
    message: safeMessage,
  };
};

const loginEndpoints = new Set(['check_costumer_login', 'check_admin_login', 'delivery_rider_login', 'auth/firebase-login']);
const tokenHeaders = url => {
  const token = localStorage.getItem('sevenshades_token');
  return token && !loginEndpoints.has(url.replace(/\/$/, '')) ? { Authorization: `Bearer ${token}` } : {};
};

const getData = async url => {
  try { return (await api.get(url, { headers: tokenHeaders(url) })).data; }
  catch (error) { return apiError(error); }
};

// Only public catalog reads may be retried, never checkout or payment mutations.
export const catalogData = async (url, body) => {
  if (!url.startsWith('user_')) throw new Error('Catalog endpoint required');
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = body === undefined ? await getData(url) : await postData(url, body);
    if (result.status || (result.httpStatus && result.httpStatus < 500) || attempt === 1) return result;
    await new Promise(resolve => setTimeout(resolve, 750));
  }
};

let csrfRequest;
const csrf = () => {
  if (!csrfRequest) csrfRequest = api.get('auth_csrf').then(response => response.data.csrfToken).finally(() => { csrfRequest = null; });
  return csrfRequest;
};

const postData = async (url, body) => {
  const errors = validateFields(url, body);
  if (Object.keys(errors).length) return { status: false, errors, message: Object.values(errors).join(' '), httpStatus: 400 };
  try {
    const headers = tokenHeaders(url);
    if (!headers.Authorization) headers['X-CSRFToken'] = await csrf();
    const result = (await api.post(url, body, { headers })).data;
    if (result.status && loginEndpoints.has(url.replace(/\/$/, ''))) localStorage.removeItem('sevenshades_token');
    return result;
  } catch (error) { return apiError(error); }
};

export const logout = async () => {
  const result = await postData('auth_logout', {});
  if (result.status) {
    clearCachedAccounts();
    window.dispatchEvent(new Event('session-cleared'));
  }
  return result;
};

export { serverURL, postData, getData };
