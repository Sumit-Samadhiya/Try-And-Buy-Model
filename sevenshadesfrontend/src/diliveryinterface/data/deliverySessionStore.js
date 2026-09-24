import { getData, postData } from '../../services/FetchDjangoApiServices';

const DELIVERY_TASKS_KEY = 'delivery_tasks_live_v1';
const DELIVERY_AUTH_KEY = 'delivery_boy_auth_v1';

const parseJson = (value, fallback) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const mapAssignmentStatus = (status) => {
  if (!status) return 'assigned';
  const normalized = status.toLowerCase();
  if (normalized === 'assigned') return 'assigned';
  if (normalized === 'on route') return 'on_the_way';
  if (normalized === 'trial in progress') return 'trial_in_progress';
  if (normalized === 'trial completed') return 'trial_completed';
  if (normalized === 'delivered') return 'completed';
  return 'assigned';
};

const mapTaskStatusToAssignment = (status) => {
  if (status === 'assigned') return 'Assigned';
  if (status === 'on_the_way') return 'On Route';
  if (status === 'trial_in_progress') return 'Trial In Progress';
  if (status === 'trial_completed') return 'Trial Completed';
  if (status === 'completed') return 'Delivered';
  return 'Assigned';
};

const mapAssignmentToTask = (assignment, index) => {
  const tryOrder = assignment?.try_order || {};
  const tryItems = tryOrder?.tryorderitem_set || [];

  return {
    id: tryOrder.order_id,
    assignmentId: assignment.assignment_id,
    routeOrder: index + 1,
    routeDistanceKm: Number((1.6 + index * 0.6).toFixed(1)),
    customerName: tryOrder.mobileno ? `Customer ${tryOrder.mobileno}` : 'Customer',
    customerPhone: tryOrder.mobileno || 'N/A',
    address: `${tryOrder.address_text || ''}, ${tryOrder.city || ''}, ${tryOrder.country || ''} - ${tryOrder.postcode || ''}`,
    slot: 'Today',
    trialType: 'Home Trial',
    feeAmount: tryOrder.try_fee || 0,
    status: mapAssignmentStatus(assignment.status),
    items: tryItems.map((item) => ({
      id: item.id,
      name: item.product_name,
      status: item.status,
      size: item.size,
      color: item.color,
      price: item.line_total,
    })),
    api: {
      assignment,
      tryOrder,
      finalOrder: null,
    },
  };
};

export const getDeliveryTasks = () => {
  const tasks = parseJson(localStorage.getItem(DELIVERY_TASKS_KEY), []);
  return [...tasks].sort((a, b) => (a.routeOrder || 0) - (b.routeOrder || 0));
};

export const setDeliveryTasks = (tasks) => {
  localStorage.setItem(DELIVERY_TASKS_KEY, JSON.stringify(tasks));
};

export const updateDeliveryTask = (taskId, updates) => {
  const tasks = getDeliveryTasks();
  const next = tasks.map((task) => (task.id === taskId ? { ...task, ...updates } : task));
  setDeliveryTasks(next);
  return next.find((task) => task.id === taskId) || null;
};

export const getDeliveryTaskById = (taskId) => {
  return getDeliveryTasks().find((task) => task.id === taskId) || null;
};

export const updateAssignmentStatusApi = async (assignmentId, taskStatus) => {
  const status = mapTaskStatusToAssignment(taskStatus);
  const result = await postData('delivery_assignment_update_status', {
    assignment_id: assignmentId,
    status,
  });
  return !!result?.status;
};

export const fetchDeliveryTasksFromApi = async (phone) => {
  const result = phone
    ? await postData('delivery_rider_tasks', { phone })
    : await getData('delivery_assignments_list');

  if (result?.status) {
    const rows = result.data || [];
    const mapped = rows.map((assignment, index) => mapAssignmentToTask(assignment, index));
    setDeliveryTasks(mapped);
    return mapped;
  }

  setDeliveryTasks([]);
  return [];
};

export const setDeliveryLogin = (riderData) => {
  localStorage.setItem(
    DELIVERY_AUTH_KEY,
    JSON.stringify({
      ...riderData,
      loggedInAt: new Date().toISOString(),
    }),
  );
};

export const getDeliveryLogin = () => {
  return parseJson(localStorage.getItem(DELIVERY_AUTH_KEY), null);
};

export const clearDeliveryLogin = () => {
  localStorage.removeItem(DELIVERY_AUTH_KEY);
  localStorage.removeItem(DELIVERY_TASKS_KEY);
};
