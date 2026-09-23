export const deliveryBoyProfile = {
  name: 'Rohit Verma',
  phone: '9990011223',
  zone: 'Indore - Vijay Nagar',
  shift: '10:00 AM - 08:00 PM',
  rating: 4.7,
};

export const dashboardStats = [
  { key: 'assigned', label: 'Assigned Trials', value: 8 },
  { key: 'completed', label: 'Completed Today', value: 5 },
  { key: 'pendingFee', label: 'Pending Fee Collection', value: 3 },
  { key: 'earnings', label: 'Today Earnings', value: 'Rs 540' },
];

export const trialTasks = [
  {
    id: 'TRL-1001',
    routeOrder: 1,
    routeDistanceKm: 1.2,
    customerName: 'Aditi Sharma',
    customerPhone: '9887766554',
    address: '95, Scheme 54, Vijay Nagar, Indore',
    slot: 'Today, 11:00 AM - 12:00 PM',
    trialType: 'First Try',
    feeAmount: 0,
    items: [
      { id: 'I-11', name: 'Women Linen Top', price: 899 },
      { id: 'I-12', name: 'Floral Skirt', price: 1099 },
    ],
    status: 'assigned',
  },
  {
    id: 'TRL-1002',
    routeOrder: 2,
    routeDistanceKm: 2.4,
    customerName: 'Saurabh Jain',
    customerPhone: '9821114455',
    address: '22, Palasia, Indore',
    slot: 'Today, 12:30 PM - 01:30 PM',
    trialType: 'Repeat Try',
    feeAmount: 49,
    items: [
      { id: 'I-21', name: 'Men Overshirt', price: 1199 },
      { id: 'I-22', name: 'Slim Fit Denim', price: 1499 },
      { id: 'I-23', name: 'Polo Tee', price: 699 },
    ],
    status: 'on_the_way',
  },
  {
    id: 'TRL-1003',
    routeOrder: 3,
    routeDistanceKm: 3.1,
    customerName: 'Nisha Gupta',
    customerPhone: '9893390012',
    address: 'Bapat Square, Indore',
    slot: 'Today, 03:00 PM - 04:00 PM',
    trialType: 'Repeat Try',
    feeAmount: 49,
    items: [
      { id: 'I-31', name: 'Black Dress', price: 1699 },
      { id: 'I-32', name: 'Layered Shrug', price: 899 },
    ],
    status: 'trial_in_progress',
  },
  {
    id: 'TRL-1004',
    routeOrder: 4,
    routeDistanceKm: 4.8,
    customerName: 'Ritvik Singh',
    customerPhone: '9877700112',
    address: 'Tilak Nagar, Indore',
    slot: 'Today, 05:00 PM - 06:00 PM',
    trialType: 'First Try',
    feeAmount: 0,
    items: [
      { id: 'I-41', name: 'Casual Shirt', price: 999 },
      { id: 'I-42', name: 'Cargo Trouser', price: 1299 },
    ],
    status: 'completed',
  },
];

export const helpCenterTickets = [
  {
    id: 'SUP-908',
    title: 'Customer asked to reschedule slot',
    status: 'Open',
  },
  {
    id: 'SUP-912',
    title: 'Need support for payment mismatch',
    status: 'Resolved',
  },
];
