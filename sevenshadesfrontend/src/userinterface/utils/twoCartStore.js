export const getOrderHistoryKey = (mobile) => (mobile ? `trial_order_history_${mobile}` : '');

export const getMainCartKey = (mobile) => (mobile ? `main_cart_${mobile}` : '');

export const readOrderHistory = (mobile) => {
  const key = getOrderHistoryKey(mobile);
  if (!key) return [];
  return JSON.parse(localStorage.getItem(key) || '[]');
};

export const writeOrderHistory = (mobile, orders) => {
  const key = getOrderHistoryKey(mobile);
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(orders));
};

export const getOrderById = (mobile, orderId) => {
  const orders = readOrderHistory(mobile);
  return orders.find((item) => item.id === orderId) || null;
};

export const updateOrderById = (mobile, orderId, updates) => {
  const orders = readOrderHistory(mobile);
  const next = orders.map((item) => (item.id === orderId ? { ...item, ...updates } : item));
  writeOrderHistory(mobile, next);
  return next.find((item) => item.id === orderId) || null;
};

export const saveMainCart = (mobile, cartPayload) => {
  const key = getMainCartKey(mobile);
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(cartPayload));
};

export const readMainCart = (mobile) => {
  const key = getMainCartKey(mobile);
  if (!key) return null;
  return JSON.parse(localStorage.getItem(key) || 'null');
};

export const clearMainCart = (mobile) => {
  const key = getMainCartKey(mobile);
  if (!key) return;
  localStorage.removeItem(key);
};
