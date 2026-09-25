import { validateFields } from './validation';
import axios from 'axios';

const serverURL = process.env.REACT_APP_API_URL || `${window.location.protocol}//${window.location.hostname}:8000`;
const api = axios.create({ baseURL: `${serverURL}/api/`, withCredentials: true, timeout: 20000 });

export const clearCachedAccounts = () => {
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

const getData = async url => {
  try { return (await api.get(url)).data; }
  catch (error) { return apiError(error); }
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
    const csrfToken = await csrf();
    return (await api.post(url, body, { headers: { 'X-CSRFToken': csrfToken } })).data;
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

