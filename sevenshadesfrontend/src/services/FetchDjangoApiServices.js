import { queryClient } from './queryClient';
import { validateFields } from './validation';
import axios from 'axios';

const serverURL = process.env.REACT_APP_API_URL || `${window.location.protocol}//${window.location.hostname}:8000`;
const api = axios.create({ baseURL: `${serverURL}/api/`, withCredentials: true, timeout: 20000 });

export const clearCachedAccounts = (keepToken = false) => {
  clearCsrfToken();
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

const loginEndpoints = new Set(['check_costumer_login', 'check_admin_login', 'delivery_rider_login', 'auth/firebase-login', 'auth/verify-whatsapp-otp']);
const tokenHeaders = url => {
  const token = localStorage.getItem('sevenshades_token');
  return token && !loginEndpoints.has(url.replace(/\/$/, '')) ? { Authorization: `Bearer ${token}` } : {};
};

const getData = async url => {
  try { return (await api.get(url, { headers: tokenHeaders(url) })).data; }
  catch (error) { return apiError(error); }
};

// Only public catalog reads may be retried, never checkout or payment mutations.
export const clearCatalogCache = () => queryClient.removeQueries({ queryKey: ['catalog'] });
const fetchCatalog = async (url, body) => {
  const base = url.split('?')[0];
  if (!new Set(['user_product_list', 'user_banner_list', 'user_subcategory_list', 'user_maincategory_list', 'user_products_maincategory', 'user_budget_bazaar_list', 'user_budget_bazaar_products', 'user_search_products', 'user_productsdetails_by_id']).has(base)) throw new Error('Catalog endpoint required');
  let edgeUrl = url;
  if (base === 'user_productsdetails_by_id' && body?.productid && !url.includes('?')) {
    edgeUrl = `${url}?productid=${encodeURIComponent(body.productid)}`;
  }
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let result;
    if ((body === undefined || (base === 'user_productsdetails_by_id' && body?.productid)) &&
        ['doordrape.com', 'www.doordrape.com', 'try-and-buy-model.vercel.app'].includes(window.location.hostname) &&
        ['user_banner_list', 'user_maincategory_list', 'user_subcategory_list', 'user_product_list', 'user_productsdetails_by_id'].includes(base)) {
      try {
        result = (await axios.get(`/api/catalog-read?resource=${encodeURIComponent(edgeUrl)}`, { timeout: 22000, withCredentials: false })).data;
      } catch (_) { /* Direct origin remains available if the edge route is unavailable. */ }
    }
    if (!result?.status) result = body === undefined ? await getData(url) : await postData(url, body);
    if (result.status || (result.httpStatus && result.httpStatus < 500) || attempt === 1) return result;
    await new Promise(resolve => setTimeout(resolve, 750));
  }
};

// Shared query keys let hover prefetch and navigation reuse the same request.
const catalogOptions = (url, body) => ({
  queryKey: ['catalog', url, body ?? null],
  queryFn: async () => {
    const result = await fetchCatalog(url, body);
    if (!result?.status) throw Object.assign(new Error(result?.message || 'Unable to load catalog'), { result });
    return result;
  },
});
export const catalogData = (url, body) => queryClient.fetchQuery(catalogOptions(url, body))
  .catch(error => { if (error.message === 'Catalog endpoint required') throw error; return error.result || { status: false, data: [], message: error.message }; });
export const prefetchCatalog = (url, body) => {
  if (navigator.connection?.saveData || /2g/.test(navigator.connection?.effectiveType || '')) return Promise.resolve();
  return queryClient.prefetchQuery(catalogOptions(url, body));
};
export const prefetchCategory = (id, subcategory = false) => prefetchCatalog(
  `user_product_list?page=1&page_size=12&${subcategory ? 'subcategoryid' : 'maincategoryid'}=${encodeURIComponent(id)}`
);
let warmRequest;
export const warmBackend = () => {
  if (!warmRequest) warmRequest = axios.get(`${serverURL.replace(/\/+$/, '')}/health/`,
    { timeout: 60000, withCredentials: false }).catch(() => undefined);
  return warmRequest;
};

let csrfRequest;
let csrfToken;
let csrfGeneration = 0;
export const clearCsrfToken = () => {
  csrfGeneration += 1;
  csrfToken = undefined;
  csrfRequest = undefined;
};
// Memory only: reuse within this session, discard after auth rotation or rejection.
export const prepareSession = () => {
  if (csrfToken) return Promise.resolve(csrfToken);
  if (!csrfRequest) {
    const generation = csrfGeneration;
    csrfRequest = api.get('auth_csrf').then(response => {
      const token = response.data.csrfToken;
      if (generation === csrfGeneration) csrfToken = token;
      return token;
    }).finally(() => { if (generation === csrfGeneration) csrfRequest = undefined; });
  }
  return csrfRequest;
};

const postData = async (url, body) => {
  const errors = validateFields(url, body);
  if (Object.keys(errors).length) return { status: false, errors, message: Object.values(errors).join(' '), httpStatus: 400 };
  try {
    const headers = tokenHeaders(url);
    if (!headers.Authorization) headers['X-CSRFToken'] = await prepareSession();
    const result = (await api.post(url, body, { headers })).data;
    if (result.status && (loginEndpoints.has(url.replace(/\/$/, '')) || ['otp_login', 'signup_submit', 'auth/verify-otp', 'auth_logout'].includes(url.replace(/\/$/, '')))) clearCsrfToken();
    if (result.status && loginEndpoints.has(url.replace(/\/$/, ''))) localStorage.removeItem('sevenshades_token');
    return result;
  } catch (error) {
    if (error.response?.status === 403) clearCsrfToken();
    return apiError(error);
  }
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
