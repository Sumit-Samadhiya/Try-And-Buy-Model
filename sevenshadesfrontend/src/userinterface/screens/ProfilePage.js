import useOrderEvents from '../../services/useOrderEvents';
import { CancelTrialButton } from '../../services/TrialInventoryControls';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import SupportAgentRoundedIcon from '@mui/icons-material/SupportAgentRounded';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import CloseIcon from '@mui/icons-material/Close';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import DeleteSweepOutlinedIcon from '@mui/icons-material/DeleteSweepOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { getData, postData, logout } from '../../services/FetchDjangoApiServices';

// Web Audio API synthesizer for crisp real-time notification chime
const playChimeSound = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // High note 1: 587.33 Hz (D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.22);

    // High note 2: 880 Hz (A5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.1);
    gain2.gain.setValueAtTime(0.16, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.42);
  } catch {
    // Audio context may be blocked prior to user interaction
  }
};

// Helper for relative time display
const getRelativeTime = (isoString) => {
  try {
    const delta = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (delta < 60) return 'Just now';
    if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
    if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
    return new Date(isoString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
};

export default function ProfilePage() {
  const user = useSelector((state) => state.user);
  const userData = Object.values(user)[0] || {};
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [tabValue, setTabValue] = useState(0);

  const [addressList, setAddressList] = useState([]);
  const [addressForm, setAddressForm] = useState({ country: 'India', address: '', city: '', postcode: '', address_type: 'Residential' });
  const [editingAddress, setEditingAddress] = useState(null);

  const [reviewForm, setReviewForm] = useState({ product_details_id: '', product: '', rating: '', review: '' });
  const [helpForm, setHelpForm] = useState({ subject: '', message: '' });

  const reviewKey = userData?.mobileno ? `trial_reviews_${userData.mobileno}` : '';
  const notifKey = userData?.mobileno ? `doordrape_notifications_${userData.mobileno}` : '';
  const notifSettingsKey = userData?.mobileno ? `doordrape_notif_settings_${userData.mobileno}` : '';

  const [ticketBusy, setTicketBusy] = useState(false);
  const [ticketMessage, setTicketMessage] = useState('');

  const [orderHistory, setOrderHistory] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);

  // Real-time Notification State
  const [notifications, setNotifications] = useState([]);
  const [notifFilter, setNotifFilter] = useState('all');
  const [notifSettings, setNotifSettings] = useState({
    sound: true,
    browser: false,
    toast: true,
  });
  const [browserPermission, setBrowserPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );
  const [toastAlert, setToastAlert] = useState({
    open: false,
    title: '',
    message: '',
    orderId: '',
    actionUrl: '',
    actionLabel: '',
  });

  const seenStatusMap = useRef(new Map());
  const initialLoadDone = useRef(false);

  // Filter out purged order
  const filterDeleted = (list) => (list || []).filter((item) => !item?.try_order?.order_id?.includes('B8A58EAE81CE4A5CB74B'));

  // Load saved notifications & settings
  useEffect(() => {
    if (!userData?.mobileno) return;
    try {
      const savedNotifs = JSON.parse(localStorage.getItem(notifKey) || '[]');
      if (Array.isArray(savedNotifs)) setNotifications(savedNotifs);
    } catch {
      setNotifications([]);
    }

    try {
      const savedSettings = JSON.parse(localStorage.getItem(notifSettingsKey) || '{}');
      setNotifSettings((prev) => ({
        ...prev,
        ...savedSettings,
        browser: typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
          ? (savedSettings.browser !== false)
          : false,
      }));
    } catch {
      // ignore
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      setBrowserPermission(Notification.permission);
    }
  }, [notifKey, notifSettingsKey, userData?.mobileno]);

  // Persist notifications
  const saveNotifications = useCallback((newNotifs) => {
    setNotifications(newNotifs);
    if (notifKey) {
      localStorage.setItem(notifKey, JSON.stringify(newNotifs));
    }
  }, [notifKey]);

  // Persist settings
  const updateNotifSetting = (key, value) => {
    const updated = { ...notifSettings, [key]: value };
    setNotifSettings(updated);
    if (notifSettingsKey) {
      localStorage.setItem(notifSettingsKey, JSON.stringify(updated));
    }
  };

  // Browser notification trigger
  const triggerBrowserAlert = useCallback((title, body) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`Doordrape: ${title}`, {
          body,
          icon: '/favicon.ico',
        });
      } catch {
        // ignore
      }
    }
  }, []);

  // Request browser permission
  const requestBrowserPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setBrowserPermission(perm);
        if (perm === 'granted') {
          updateNotifSetting('browser', true);
          triggerBrowserAlert('Real-Time Alerts Enabled', 'You will now receive doorstep trial and delivery updates.');
        } else {
          updateNotifSetting('browser', false);
        }
      } catch {
        // ignore
      }
    }
  };

  // Add a real-time notification
  const addNotification = useCallback((item) => {
    const notifItem = {
      id: `NOTIF-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      isRead: false,
      ...item,
    };

    setNotifications((prev) => {
      // Avoid duplicate consecutive identical notifications
      const exists = prev.find((n) => n.orderId === item.orderId && n.status === item.status && n.title === item.title);
      if (exists) return prev;
      const next = [notifItem, ...prev].slice(0, 50); // keep up to 50
      if (notifKey) localStorage.setItem(notifKey, JSON.stringify(next));
      return next;
    });

    // Sound chime
    if (notifSettings.sound) {
      playChimeSound();
    }

    // Browser desktop notification
    if (notifSettings.browser && browserPermission === 'granted') {
      triggerBrowserAlert(item.title, item.message);
    }

    // In-app Toast Banner
    if (notifSettings.toast) {
      setToastAlert({
        open: true,
        title: item.title,
        message: item.message,
        orderId: item.orderId || '',
        actionUrl: item.actionUrl || (item.orderId ? `/maincart?order=${encodeURIComponent(item.orderId)}` : ''),
        actionLabel: item.actionLabel || 'View Order',
      });
    }
  }, [browserPermission, notifKey, notifSettings.browser, notifSettings.sound, notifSettings.toast, triggerBrowserAlert]);

  // Test notification action for user to experience real-time alert immediately
  const handleTestAlert = () => {
    addNotification({
      orderId: 'DEMO-TRY-BUY',
      status: 'OUT_FOR_TRIAL',
      category: 'delivery',
      title: '🛵 Rider Out For Trial (Demo Alert)',
      message: 'Your Doordrape delivery partner is en route with your selected items. Real-time tracking is live!',
      actionLabel: 'Track Delivery',
      actionUrl: '/profile',
    });
  };

  // Map order status to customer-friendly notification text
  const parseOrderStatusEvent = useCallback((orderId, status, reason = '') => {
    switch (status) {
      case 'TRY_REQUESTED':
        return {
          title: '📦 Try & Buy Order Booked',
          message: `Order #${orderId} booked successfully. Slot allocated; preparing trial collection.`,
          category: 'order',
          actionLabel: 'View Order',
        };
      case 'ASSIGNED':
        return {
          title: '🛵 Delivery Partner Assigned',
          message: `Rider assigned for Order #${orderId}. Preparing trial kit for doorstep dispatch.`,
          category: 'delivery',
          actionLabel: 'View Status',
        };
      case 'OUT_FOR_TRIAL':
        return {
          title: '⚡ Rider Out for Doorstep Trial',
          message: `Order #${orderId} is out for delivery! Rider is on the way to your address.`,
          category: 'delivery',
          actionLabel: 'Track Order',
        };
      case 'TRIAL_IN_PROGRESS':
        return {
          title: '⏱️ 15-Minute Trial Started',
          message: `Rider has arrived at your doorstep. Your 15-minute trial countdown is now active!`,
          category: 'trial',
          actionLabel: 'View Trial',
        };
      case 'AWAITING_SELECTION_APPROVAL':
        return {
          title: '🧾 Digital Bill Ready for Approval',
          message: `Doorstep selection submitted for Order #${orderId}. Please approve your bill to finalize delivery.`,
          category: 'bill',
          actionLabel: 'Approve Bill',
        };
      case 'DELIVERED':
        return {
          title: '✅ Delivered & Payment Received',
          message: `Order #${orderId} completed successfully! Cash physically received (COD). Tax invoice is ready.`,
          category: 'order',
          actionLabel: 'Download Invoice',
        };
      case 'CANCELLED':
        return {
          title: '❌ Order Cancelled',
          message: `Order #${orderId} has been cancelled. Reserved items have been released.`,
          category: 'order',
          actionLabel: 'View Details',
        };
      default:
        if (reason === 'bill_generated') {
          return {
            title: '🧾 Doorstep Bill Generated',
            message: `Bill generated for Order #${orderId}. Please review selected items for payment approval.`,
            category: 'bill',
            actionLabel: 'Approve Bill',
          };
        }
        return null;
    }
  }, []);

  // Inspect order list changes and trigger real-time notifications on transitions
  const syncOrderTransitions = useCallback((orders) => {
    if (!Array.isArray(orders)) return;

    orders.forEach((row) => {
      const orderId = row?.try_order?.order_id;
      const status = row?.try_order?.status;
      if (!orderId || !status) return;

      const previousStatus = seenStatusMap.current.get(orderId);
      seenStatusMap.current.set(orderId, status);

      // Only notify if status changed after initial load
      if (initialLoadDone.current && previousStatus && previousStatus !== status) {
        const notif = parseOrderStatusEvent(orderId, status);
        if (notif) {
          addNotification({
            orderId,
            status,
            ...notif,
            actionUrl: `/maincart?order=${encodeURIComponent(orderId)}`,
          });
        }
      }
    });

    // If notifications are completely empty on first load, seed with recent history
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      setNotifications((current) => {
        if (current.length > 0) return current;
        const initial = [];
        orders.slice(0, 3).forEach((row) => {
          const orderId = row?.try_order?.order_id;
          const status = row?.try_order?.status;
          if (orderId && status) {
            const parsed = parseOrderStatusEvent(orderId, status);
            if (parsed) {
              initial.push({
                id: `INIT-${orderId}-${status}`,
                orderId,
                status,
                ...parsed,
                timestamp: row?.try_order?.created_at || new Date().toISOString(),
                isRead: true,
                actionUrl: `/maincart?order=${encodeURIComponent(orderId)}`,
              });
            }
          }
        });
        if (initial.length > 0 && notifKey) {
          localStorage.setItem(notifKey, JSON.stringify(initial));
        }
        return initial.length > 0 ? initial : current;
      });
    }
  }, [addNotification, notifKey, parseOrderStatusEvent]);

  // Hook into live order events (WebSocket with polling fallback)
  useOrderEvents(async (event) => {
    if (!userData?.mobileno) return;
    const result = await postData('user_order_lifecycle_list', { mobileno: userData.mobileno });
    if (result && result.status) {
      const cleanOrders = filterDeleted(result.data);
      setOrderHistory(cleanOrders);
      syncOrderTransitions(cleanOrders);
      if (result.wallet) setWalletBalance(result.wallet.balance || 0);
    }

    // Direct event handling if incoming event has order details
    if (event && event.order_id && event.status) {
      const notif = parseOrderStatusEvent(event.order_id, event.status, event.reason);
      if (notif) {
        addNotification({
          orderId: event.order_id,
          status: event.status,
          ...notif,
          actionUrl: `/maincart?order=${encodeURIComponent(event.order_id)}`,
        });
      }
    }
  }, !!userData?.mobileno);

  const fetchUserAddress = useCallback(async () => {
    if (!userData?.mobileno) return;
    const result = await postData('fetch_user_address', { mobile: userData.mobileno });
    if (result && result.status) {
      setAddressList(result.data || []);
    } else {
      setAddressList([]);
    }
  }, [userData?.mobileno]);

  useEffect(() => {
    fetchUserAddress();
  }, [fetchUserAddress]);

  useEffect(() => {
    if (!userData?.mobileno) return;
    const fetchOrderLifecycle = async () => {
      const support = await getData('customer_tickets');
      if (support && support.status) setTickets(support.data || []);
      const result = await postData('user_order_lifecycle_list', { mobileno: userData.mobileno });
      if (result?.status) {
        const cleanOrders = filterDeleted(result.data);
        setOrderHistory(cleanOrders);
        syncOrderTransitions(cleanOrders);
        if (result.wallet) {
          setWalletBalance(result.wallet.balance || 0);
        }
      } else {
        setOrderHistory([]);
      }
    };

    fetchOrderLifecycle();
    const interval = setInterval(fetchOrderLifecycle, 10000); // 10-second polling fallback

    try {
      const storedReviews = JSON.parse(localStorage.getItem(reviewKey) || '[]');
      setReviews(Array.isArray(storedReviews) ? storedReviews : []);
    } catch {
      setReviews([]);
      localStorage.removeItem(reviewKey);
    }

    return () => clearInterval(interval);
  }, [userData?.mobileno, reviewKey, syncOrderTransitions]);

  const unreadNotifsCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  const stats = useMemo(() => {
    return {
      orders: orderHistory.length,
      notifications: notifications.length,
      unreadNotifs: unreadNotifsCount,
      addresses: addressList.length,
      reviews: reviews.length,
      tickets: tickets.length,
    };
  }, [orderHistory.length, notifications.length, unreadNotifsCount, addressList.length, reviews.length, tickets.length]);

  const filteredNotifications = useMemo(() => {
    if (notifFilter === 'unread') return notifications.filter((n) => !n.isRead);
    if (notifFilter === 'order') return notifications.filter((n) => n.category === 'order' || n.category === 'trial');
    if (notifFilter === 'delivery') return notifications.filter((n) => n.category === 'delivery');
    if (notifFilter === 'bill') return notifications.filter((n) => n.category === 'bill');
    return notifications;
  }, [notifications, notifFilter]);

  const markAllAsRead = () => {
    const updated = notifications.map((n) => ({ ...n, isRead: true }));
    saveNotifications(updated);
  };

  const clearAllNotifications = () => {
    if (window.confirm('Clear all notifications history?')) {
      saveNotifications([]);
    }
  };

  const markSingleAsRead = (id) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n));
    saveNotifications(updated);
  };

  const deleteSingleNotification = (id) => {
    const updated = notifications.filter((n) => n.id !== id);
    saveNotifications(updated);
  };

  const purchasedVariants = useMemo(() => {
    const items = [];
    const seen = new Set();
    orderHistory.forEach((order) => {
      if (order.final_order && order.final_order.status === 'completed' && Array.isArray(order.final_order.final_order_items)) {
        order.final_order.final_order_items.forEach((fi) => {
          const pd = fi.try_order_item?.product_details;
          const pdId = pd?.id || fi.try_order_item?.product_details_id;
          const name = fi.try_order_item?.product_name || `Product #${pdId}`;
          const size = fi.try_order_item?.size ? ` (${fi.try_order_item.size})` : '';
          if (pdId && !seen.has(pdId)) {
            seen.add(pdId);
            items.push({ id: pdId, name: `${name}${size}` });
          }
        });
      }
    });
    return items;
  }, [orderHistory]);

  const renderOrderLifecycleStep = (status) => {
    const steps = ['Try Requested', 'Rider Out for Trial', 'Trial in Progress', 'Trial Completed', 'Selection Submitted', 'Completed'];
    const activeIndex = {
      TRY_REQUESTED: 0,
      ASSIGNED: 1,
      OUT_FOR_TRIAL: 1,
      TRIAL_IN_PROGRESS: 2,
      TRIAL_COMPLETED: 3,
      AWAITING_SELECTION_APPROVAL: 3,
      SELECTION_SUBMITTED: 4,
      PAYMENT_PENDING: 4,
      DELIVERED: 5,
      NO_PURCHASE: 5,
      CANCELLED: -1,
    }[status] ?? 0;

    return (
      <Box sx={{ mt: 1.5, mb: 1 }}>
        <Grid container spacing={1}>
          {steps.map((step, idx) => (
            <Grid item xs={2} key={step}>
              <Box
                sx={{
                  height: 6,
                  borderRadius: 3,
                  bgcolor: idx <= activeIndex ? '#10b981' : '#e2e8f0',
                  mb: 0.5,
                  transition: 'background-color 0.3s ease',
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  fontSize: 10,
                  fontWeight: idx <= activeIndex ? 800 : 500,
                  color: idx <= activeIndex ? '#065f46' : '#94a3b8',
                  display: 'block',
                  textAlign: 'center',
                }}
              >
                {step}
              </Typography>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  };

  const handleAddressSave = async () => {
    if (!addressForm.address || !addressForm.city || !addressForm.postcode || !addressForm.country || !addressForm.address_type) {
      alert('Please fill all address fields.');
      return;
    }

    let result;
    if (editingAddress) {
      result = await postData('address_update', {
        id: editingAddress.id,
        address_id: editingAddress.id,
        mobile: userData.mobileno,
        old_address: editingAddress.address,
        old_city: editingAddress.city,
        old_postcode: editingAddress.postcode,
        old_country: editingAddress.country,
        address: addressForm.address,
        city: addressForm.city,
        postcode: addressForm.postcode,
        country: addressForm.country,
        address_type: addressForm.address_type || 'Residential',
      });
    } else {
      const formData = new FormData();
      formData.append('country', addressForm.country);
      formData.append('address', addressForm.address);
      formData.append('city', addressForm.city);
      formData.append('postcode', addressForm.postcode);
      formData.append('address_type', addressForm.address_type || 'Residential');
      formData.append('mobileno', userData.mobileno);
      result = await postData('address_submit', formData);
    }

    if (result && result.status) {
      alert(result.message || 'Address saved successfully');
      setAddressForm({ country: 'India', address: '', city: '', postcode: '', address_type: 'Residential' });
      setEditingAddress(null);
      fetchUserAddress();
    } else {
      alert(result?.message || 'Unable to save address');
    }
  };

  const handleAddressDelete = async (item) => {
    const ok = window.confirm('Delete this address?');
    if (!ok) return;

    const result = await postData('address_delete', {
      id: item.id,
      address_id: item.id,
      mobile: userData.mobileno,
      old_address: item.address,
      old_city: item.city,
      old_postcode: item.postcode,
      old_country: item.country,
    });

    if (result && result.status) {
      fetchUserAddress();
    } else {
      alert(result?.message || 'Unable to delete address');
    }
  };

  const handleReviewAdd = async () => {
    const targetVariantId = reviewForm.product_details_id;
    if (!targetVariantId || !reviewForm.rating || !reviewForm.review) {
      alert('Please select a purchased product, rating (1-5) and review text.');
      return;
    }

    const result = await postData('submit_product_review', {
      product_details_id: Number(targetVariantId),
      rating: Number(reviewForm.rating),
      review_text: reviewForm.review,
    });

    if (result && result.status) {
      alert(result.message || 'Review submitted successfully');
      const selectedItem = purchasedVariants.find((p) => p.id === Number(targetVariantId));
      const savedReview = {
        id: `RVW-${Date.now()}`,
        product_details_id: Number(targetVariantId),
        product: selectedItem?.name || reviewForm.product || `Product #${targetVariantId}`,
        rating: reviewForm.rating,
        review: reviewForm.review,
        createdAt: new Date().toISOString(),
      };
      const next = [savedReview, ...reviews.filter((review) => Number(review.product_details_id) !== Number(targetVariantId))];
      setReviews(next);
      localStorage.setItem(reviewKey, JSON.stringify(next));
      setReviewForm({ product_details_id: '', product: '', rating: '', review: '' });
    } else {
      alert(result?.message || 'Unable to submit review. (Reviews are available for purchased and finalized orders)');
    }
  };

  const handleTicketCreate = async () => {
    if (ticketBusy) return;
    if (helpForm.subject.trim().length < 3 || helpForm.subject.length > 120 || helpForm.message.trim().length < 10 || helpForm.message.length > 2000) {
      setTicketMessage('Subject: 3–120 characters. Message: 10–2000 characters.');
      return;
    }
    setTicketBusy(true);
    setTicketMessage('');
    const result = await postData('create_ticket', helpForm);
    setTicketBusy(false);
    if (!result.status) {
      setTicketMessage(result.message);
      return;
    }
    setTickets((old) => [result.data, ...old]);
    setHelpForm({ subject: '', message: '' });
    setTicketMessage('Ticket raised successfully.');
  };

  const handleLogout = async () => {
    const result = await logout();
    if (!result.status) {
      alert(result.message);
      return;
    }
    dispatch({ type: 'CLEAR_USER' });
    navigate('/home');
  };

  if (!userData?.mobileno) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 3, textAlign: 'center', border: '1px solid #e2e8f0' }}>
          <Avatar sx={{ width: 64, height: 64, mx: 'auto', mb: 2, bgcolor: '#064e3b' }}>
            <PersonOutlineIcon sx={{ fontSize: 36, color: '#fff' }} />
          </Avatar>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a' }}>
            Customer Profile
          </Typography>
          <Typography sx={{ mt: 1, color: '#64748b' }}>
            Please login to access your Try & Buy orders, real-time alerts, and profile preferences.
          </Typography>
          <Button
            variant="contained"
            sx={{
              mt: 3,
              px: 4,
              py: 1.2,
              bgcolor: '#064e3b',
              fontWeight: 700,
              borderRadius: 2,
              '&:hover': { bgcolor: '#043629' },
            }}
            onClick={() => navigate('/signindisplay')}
          >
            Login to Doordrape
          </Button>
        </Paper>
      </Container>
    );
  }

  const userInitials = `${userData.fname?.charAt(0) || ''}${userData.lname?.charAt(0) || ''}`.toUpperCase() || 'DD';

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* REAL-TIME IN-APP TOAST SNACKBAR */}
      <Snackbar
        open={toastAlert.open}
        autoHideDuration={6000}
        onClose={() => setToastAlert((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setToastAlert((prev) => ({ ...prev, open: false }))}
          sx={{
            bgcolor: '#064e3b',
            color: '#fff',
            borderRadius: 2,
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            alignItems: 'center',
            '& .MuiAlert-icon': { color: '#34d399' },
          }}
          action={
            <Stack direction="row" spacing={1} alignItems="center">
              {toastAlert.actionUrl && (
                <Button
                  size="small"
                  sx={{
                    color: '#34d399',
                    fontWeight: 700,
                    textTransform: 'none',
                    bgcolor: 'rgba(255,255,255,0.1)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
                  }}
                  onClick={() => {
                    setToastAlert((prev) => ({ ...prev, open: false }));
                    navigate(toastAlert.actionUrl);
                  }}
                >
                  {toastAlert.actionLabel || 'View'}
                </Button>
              )}
              <IconButton size="small" color="inherit" onClick={() => setToastAlert((prev) => ({ ...prev, open: false }))}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
          }
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            {toastAlert.title}
          </Typography>
          <Typography variant="caption" sx={{ color: '#d1fae5', display: 'block' }}>
            {toastAlert.message}
          </Typography>
        </Alert>
      </Snackbar>

      <Grid container spacing={3}>
        {/* LEFT COLUMN: HERO PROFILE, STATS, WALLET & NOTIFICATION SHORTCUTS */}
        <Grid item xs={12} md={4}>
          {/* PROFILE SUMMARY HERO CARD */}
          <Paper
            elevation={2}
            sx={{
              p: 3,
              borderRadius: 3,
              border: '1px solid #e2e8f0',
              mb: 2.5,
              background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 6,
                background: 'linear-gradient(90deg, #10b981 0%, #064e3b 100%)',
              }}
            />

            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar
                sx={{
                  width: 62,
                  height: 62,
                  bgcolor: '#064e3b',
                  fontSize: 22,
                  fontWeight: 900,
                  boxShadow: '0 4px 12px rgba(6, 78, 59, 0.25)',
                  border: '2px solid #10b981',
                }}
              >
                {userInitials}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.2, noWrap: true }}>
                    {userData.fname} {userData.lname}
                  </Typography>
                </Stack>
                <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5, fontWeight: 500 }}>
                  📱 +91 {userData.mobileno}
                </Typography>
                <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', noWrap: true }}>
                  ✉️ {userData.emailid || 'No email attached'}
                </Typography>
              </Box>
            </Stack>

            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Chip
                label="✨ Try & Buy Elite Member"
                size="small"
                sx={{
                  bgcolor: 'rgba(16, 185, 129, 0.12)',
                  color: '#065f46',
                  fontWeight: 700,
                  fontSize: 11,
                  borderRadius: 1.5,
                }}
              />
              <Tooltip title="Real-time WebSocket & polling sync active">
                <Chip
                  icon={<FiberManualRecordIcon sx={{ fontSize: '10px !important', color: '#10b981 !important' }} />}
                  label="Live Sync"
                  size="small"
                  variant="outlined"
                  sx={{ borderColor: '#a7f3d0', color: '#065f46', fontWeight: 600, fontSize: 10, height: 22 }}
                />
              </Tooltip>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* QUICK STATS CHIPS GRID */}
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.2,
                    borderRadius: 2,
                    textAlign: 'center',
                    bgcolor: '#fff',
                    cursor: 'pointer',
                    '&:hover': { borderColor: '#10b981' },
                  }}
                  onClick={() => setTabValue(0)}
                >
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
                    {stats.orders}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                    📦 Orders
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.2,
                    borderRadius: 2,
                    textAlign: 'center',
                    bgcolor: stats.unreadNotifs > 0 ? '#ecfdf5' : '#fff',
                    borderColor: stats.unreadNotifs > 0 ? '#10b981' : '#e2e8f0',
                    cursor: 'pointer',
                    '&:hover': { borderColor: '#10b981' },
                  }}
                  onClick={() => setTabValue(1)}
                >
                  <Typography variant="h6" sx={{ fontWeight: 800, color: stats.unreadNotifs > 0 ? '#065f46' : '#0f172a', lineHeight: 1 }}>
                    {stats.unreadNotifs > 0 ? `${stats.unreadNotifs} New` : stats.notifications}
                  </Typography>
                  <Typography variant="caption" sx={{ color: stats.unreadNotifs > 0 ? '#059669' : '#64748b', fontWeight: 600 }}>
                    🔔 Alerts
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.2,
                    borderRadius: 2,
                    textAlign: 'center',
                    bgcolor: '#fff',
                    cursor: 'pointer',
                    '&:hover': { borderColor: '#10b981' },
                  }}
                  onClick={() => setTabValue(2)}
                >
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
                    {stats.addresses}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                    📍 Addresses
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.2,
                    borderRadius: 2,
                    textAlign: 'center',
                    bgcolor: '#fff',
                    cursor: 'pointer',
                    '&:hover': { borderColor: '#10b981' },
                  }}
                  onClick={() => setTabValue(3)}
                >
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
                    {stats.reviews}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                    ⭐ Reviews
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            <Button
              fullWidth
              variant="outlined"
              color="inherit"
              sx={{
                mt: 2,
                borderRadius: 2,
                fontWeight: 700,
                textTransform: 'none',
                borderColor: '#cbd5e1',
                color: '#475569',
                '&:hover': { borderColor: '#94a3b8', bgcolor: '#f1f5f9' },
              }}
              onClick={handleLogout}
            >
              Sign Out
            </Button>
          </Paper>

          {/* LUXURY DOORDRAPE WALLET CARD */}
          <Paper
            elevation={3}
            sx={{
              p: 2.8,
              borderRadius: 3,
              background: 'linear-gradient(135deg, #064e3b 0%, #065f46 45%, #0f172a 100%)',
              color: '#ffffff',
              boxShadow: '0 10px 25px rgba(6, 78, 59, 0.25)',
              mb: 2.5,
              position: 'relative',
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 1.2, color: '#a7f3d0', fontWeight: 800 }}>
                💳 Doordrape Wallet
              </Typography>
              <AccountBalanceWalletOutlinedIcon sx={{ color: '#34d399' }} />
            </Stack>

            <Typography variant="h3" sx={{ fontWeight: 900, my: 1, color: '#34d399', letterSpacing: -0.5 }}>
              ₹{walletBalance}
            </Typography>

            <Typography variant="caption" sx={{ color: '#e2e8f0', display: 'block', lineHeight: 1.4 }}>
              Trial fee returns & cashback credits are stored here for instant 1-click checkout.
            </Typography>

            <Divider sx={{ my: 1.8, borderColor: 'rgba(255,255,255,0.15)' }} />

            <Stack direction="row" spacing={1} alignItems="center">
              <ShieldOutlinedIcon sx={{ fontSize: 18, color: '#34d399' }} />
              <Typography variant="caption" sx={{ color: '#d1fae5', fontWeight: 600 }}>
                100% Cash on Delivery (COD) Trial Guaranteed
              </Typography>
            </Stack>
          </Paper>

          {/* REAL-TIME NOTIFICATION PREFERENCES QUICK WIDGET */}
          <Paper
            elevation={1}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: '1px solid #e2e8f0',
              bgcolor: '#fff',
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <NotificationsActiveIcon sx={{ color: '#059669', fontSize: 20 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                  Real-Time Notification Alerts
                </Typography>
              </Stack>
              <Chip
                label={unreadNotifsCount > 0 ? `${unreadNotifsCount} unread` : 'All caught up'}
                size="small"
                color={unreadNotifsCount > 0 ? 'error' : 'default'}
                sx={{ height: 20, fontSize: 10, fontWeight: 700 }}
              />
            </Stack>

            <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 1.5 }}>
              Get instant updates on rider dispatch, 15-min trial countdown, and digital billing approvals.
            </Typography>

            <Stack spacing={1}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  {notifSettings.sound ? <VolumeUpIcon fontSize="small" sx={{ color: '#059669' }} /> : <VolumeOffIcon fontSize="small" sx={{ color: '#94a3b8' }} />}
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>
                    Sound Chime
                  </Typography>
                </Stack>
                <Switch
                  size="small"
                  checked={notifSettings.sound}
                  onChange={(e) => updateNotifSetting('sound', e.target.checked)}
                  color="success"
                />
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <NotificationsActiveIcon fontSize="small" sx={{ color: notifSettings.browser ? '#059669' : '#94a3b8' }} />
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>
                    Browser Desktop Alerts
                  </Typography>
                </Stack>
                {browserPermission === 'granted' ? (
                  <Switch
                    size="small"
                    checked={notifSettings.browser}
                    onChange={(e) => updateNotifSetting('browser', e.target.checked)}
                    color="success"
                  />
                ) : (
                  <Button
                    size="small"
                    variant="text"
                    sx={{ fontSize: 11, fontWeight: 700, color: '#059669', p: 0 }}
                    onClick={requestBrowserPermission}
                  >
                    Enable
                  </Button>
                )}
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155', ml: 3.5 }}>
                  In-App Popups (Toast)
                </Typography>
                <Switch
                  size="small"
                  checked={notifSettings.toast}
                  onChange={(e) => updateNotifSetting('toast', e.target.checked)}
                  color="success"
                />
              </Box>
            </Stack>

            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Button
                fullWidth
                size="small"
                variant="outlined"
                sx={{
                  borderRadius: 2,
                  fontWeight: 700,
                  fontSize: 11,
                  textTransform: 'none',
                  borderColor: '#059669',
                  color: '#059669',
                  '&:hover': { bgcolor: '#ecfdf5', borderColor: '#047857' },
                }}
                onClick={handleTestAlert}
              >
                🔔 Test Real-Time Alert
              </Button>
              <Button
                size="small"
                variant="contained"
                sx={{
                  borderRadius: 2,
                  fontWeight: 700,
                  fontSize: 11,
                  textTransform: 'none',
                  bgcolor: '#064e3b',
                  '&:hover': { bgcolor: '#043629' },
                }}
                onClick={() => setTabValue(1)}
              >
                View
              </Button>
            </Stack>
          </Paper>
        </Grid>

        {/* RIGHT COLUMN: MAIN TABS (ORDERS, NOTIFICATIONS, ADDRESSES, REVIEWS, HELP, ACCOUNT) */}
        <Grid item xs={12} md={8}>
          <Paper elevation={1} sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, border: '1px solid #e2e8f0' }}>
            {/* NAVIGATION TABS WITH LIVE NOTIFICATION BADGE */}
            <Tabs
              value={tabValue}
              onChange={(_, v) => setTabValue(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                borderBottom: '1px solid #e2e8f0',
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: 14,
                  minHeight: 48,
                  color: '#64748b',
                  '&.Mui-selected': {
                    color: '#064e3b',
                  },
                },
                '& .MuiTabs-indicator': {
                  bgcolor: '#10b981',
                  height: 3,
                  borderRadius: 1.5,
                },
              }}
            >
              <Tab label={`📦 Orders (${stats.orders})`} />
              <Tab
                label={
                  <Badge
                    badgeContent={unreadNotifsCount}
                    color="error"
                    sx={{
                      '& .MuiBadge-badge': {
                        right: -10,
                        top: 2,
                        bgcolor: '#ef4444',
                        fontWeight: 800,
                        fontSize: 10,
                      },
                    }}
                  >
                    🔔 Live Notifications
                  </Badge>
                }
              />
              <Tab label={`📍 Addresses (${stats.addresses})`} />
              <Tab label={`⭐ Reviews (${stats.reviews})`} />
              <Tab label={`🎧 Help Center (${stats.tickets})`} />
              <Tab label="⚙️ Account" />
            </Tabs>

            <Box sx={{ mt: 3 }}>
              {/* TAB 0: ORDERS */}
              {tabValue === 0 && (
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                      Try & Buy Order History
                    </Typography>
                    <Tooltip title="Sync orders now">
                      <IconButton
                        size="small"
                        onClick={async () => {
                          const result = await postData('user_order_lifecycle_list', { mobileno: userData.mobileno });
                          if (result && result.status) {
                            const cleanOrders = filterDeleted(result.data);
                            setOrderHistory(cleanOrders);
                            syncOrderTransitions(cleanOrders);
                          }
                        }}
                      >
                        <RefreshIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  {orderHistory.length === 0 ? (
                    <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2, bgcolor: '#f8fafc', border: '1px dashed #cbd5e1' }}>
                      <ShoppingBagOutlinedIcon sx={{ fontSize: 48, color: '#94a3b8', mb: 1 }} />
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#334155' }}>
                        No Try & Buy Orders Placed Yet
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                        Select up to 4 styles from the catalog and experience doorstep trial before buying.
                      </Typography>
                      <Button
                        variant="contained"
                        sx={{ mt: 2, bgcolor: '#064e3b', fontWeight: 700, borderRadius: 2 }}
                        onClick={() => navigate('/home')}
                      >
                        Explore Catalog
                      </Button>
                    </Paper>
                  ) : (
                    orderHistory.map((row) => (
                      <Paper
                        key={row?.try_order?.order_id}
                        elevation={0}
                        sx={{
                          p: 2.5,
                          borderRadius: 2.5,
                          border: '1px solid #e2e8f0',
                          transition: 'all 0.2s ease',
                          '&:hover': { borderColor: '#10b981', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' },
                        }}
                      >
                        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1}>
                          <Box>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography sx={{ fontWeight: 800, color: '#0f172a', fontSize: 16 }}>
                                {row?.try_order?.order_id}
                              </Typography>
                              <Chip
                                label="COD Only"
                                size="small"
                                sx={{ height: 20, fontSize: 10, fontWeight: 700, bgcolor: '#fef3c7', color: '#92400e' }}
                              />
                            </Stack>
                            <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.3 }}>
                              {new Date(row?.try_order?.created_at).toLocaleString()} •{' '}
                              {row?.try_order?.delivery_mode === 'emergency_sos' ? '⚡ SOS 90-120 Min' : '🚚 Standard Slot'}
                            </Typography>
                          </Box>
                          <Chip
                            label={row?.try_order?.status || 'Try Requested'}
                            color={row?.try_order?.status?.includes('Completed') || row?.try_order?.status === 'DELIVERED' ? 'success' : 'info'}
                            size="small"
                            sx={{ fontWeight: 700 }}
                          />
                        </Stack>

                        {/* VISUAL ORDER LIFECYCLE PROGRESS */}
                        {renderOrderLifecycleStep(row?.try_order?.status)}

                        <Box sx={{ mt: 1.5, p: 1.5, bgcolor: '#f8fafc', borderRadius: 2 }}>
                          <Grid container spacing={1}>
                            <Grid item xs={6} sm={3}>
                              <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                                Try Fee
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                                ₹{row?.try_order?.try_fee || 0}
                              </Typography>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                              <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                                Trial Items
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                                {row?.try_order?.total_try_items || 0} Selected
                              </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                                Final Purchase Status
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: '#065f46' }}>
                                {row?.final_order
                                  ? row.final_order.approved_revision === row.final_order.bill_revision
                                    ? `${row.final_order.status?.toUpperCase()} • Final Payable ₹${row.final_order.final_payable} (COD)`
                                    : 'Awaiting your doorstep selection approval'
                                  : 'Pending delivery doorstep selection'}
                              </Typography>
                            </Grid>
                          </Grid>
                        </Box>

                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 2 }} alignItems="center">
                          {row?.can_cancel && <CancelTrialButton orderId={row.try_order.order_id} />}
                          <Button
                            variant="contained"
                            size="small"
                            sx={{
                              bgcolor: '#064e3b',
                              fontWeight: 700,
                              borderRadius: 2,
                              textTransform: 'none',
                              '&:hover': { bgcolor: '#043629' },
                            }}
                            onClick={() => navigate('/maincart?order=' + encodeURIComponent(row.try_order.order_id))}
                          >
                            View Bill / Payment / Receipt
                          </Button>
                        </Stack>
                      </Paper>
                    ))
                  )}
                </Stack>
              )}

              {/* TAB 1: REAL-TIME NOTIFICATIONS */}
              {tabValue === 1 && (
                <Stack spacing={2.5}>
                  {/* NOTIFICATION CONTROLS & HEADER */}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 1.5 }}>
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <NotificationsActiveIcon sx={{ color: '#059669' }} />
                        <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                          Live Order Updates & Alerts
                        </Typography>
                      </Stack>
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                        Real-time doorstep trial milestones, rider dispatch alerts, and digital bill approvals.
                      </Typography>
                    </Box>

                    <Stack direction="row" spacing={1}>
                      {unreadNotifsCount > 0 && (
                        <Button
                          size="small"
                          startIcon={<DoneAllIcon />}
                          variant="outlined"
                          sx={{ textTransform: 'none', fontWeight: 700, fontSize: 12, borderRadius: 2 }}
                          onClick={markAllAsRead}
                        >
                          Mark all read
                        </Button>
                      )}
                      {notifications.length > 0 && (
                        <Button
                          size="small"
                          startIcon={<DeleteSweepOutlinedIcon />}
                          variant="text"
                          color="inherit"
                          sx={{ textTransform: 'none', fontWeight: 600, fontSize: 12, color: '#64748b' }}
                          onClick={clearAllNotifications}
                        >
                          Clear
                        </Button>
                      )}
                    </Stack>
                  </Box>

                  {/* NOTIFICATION PREFERENCES BANNER */}
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: 2.5,
                      bgcolor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} sm={8}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                          Notification Preferences
                        </Typography>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1, sm: 3 }} sx={{ mt: 1 }}>
                          <FormControlLabel
                            control={
                              <Switch
                                size="small"
                                checked={notifSettings.sound}
                                onChange={(e) => updateNotifSetting('sound', e.target.checked)}
                                color="success"
                              />
                            }
                            label={<Typography variant="caption" sx={{ fontWeight: 700 }}>Chime Sound 🔔</Typography>}
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                size="small"
                                checked={notifSettings.browser}
                                onChange={(e) => {
                                  if (e.target.checked && browserPermission !== 'granted') {
                                    requestBrowserPermission();
                                  } else {
                                    updateNotifSetting('browser', e.target.checked);
                                  }
                                }}
                                color="success"
                              />
                            }
                            label={
                              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                Browser Push 🖥️ {browserPermission !== 'granted' && '(Click to grant)'}
                              </Typography>
                            }
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                size="small"
                                checked={notifSettings.toast}
                                onChange={(e) => updateNotifSetting('toast', e.target.checked)}
                                color="success"
                              />
                            }
                            label={<Typography variant="caption" sx={{ fontWeight: 700 }}>In-App Toast 💬</Typography>}
                          />
                        </Stack>
                      </Grid>

                      <Grid item xs={12} sm={4} sx={{ textAlign: { sm: 'right' } }}>
                        <Button
                          size="small"
                          variant="contained"
                          sx={{
                            bgcolor: '#064e3b',
                            fontWeight: 700,
                            borderRadius: 2,
                            textTransform: 'none',
                            fontSize: 12,
                            '&:hover': { bgcolor: '#043629' },
                          }}
                          onClick={handleTestAlert}
                        >
                          🔔 Send Test Alert
                        </Button>
                      </Grid>
                    </Grid>
                  </Paper>

                  {/* FILTER CHIPS */}
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
                    {[
                      { key: 'all', label: `All (${notifications.length})` },
                      { key: 'unread', label: `Unread (${unreadNotifsCount})` },
                      { key: 'delivery', label: 'Rider & Delivery' },
                      { key: 'bill', label: 'Billing & Approvals' },
                      { key: 'order', label: 'Order Milestones' },
                    ].map((f) => (
                      <Chip
                        key={f.key}
                        label={f.label}
                        size="small"
                        clickable
                        onClick={() => setNotifFilter(f.key)}
                        sx={{
                          fontWeight: 700,
                          fontSize: 12,
                          bgcolor: notifFilter === f.key ? '#064e3b' : '#f1f5f9',
                          color: notifFilter === f.key ? '#ffffff' : '#475569',
                          '&:hover': { bgcolor: notifFilter === f.key ? '#043629' : '#e2e8f0' },
                        }}
                      />
                    ))}
                  </Stack>

                  {/* NOTIFICATION ITEMS FEED */}
                  {filteredNotifications.length === 0 ? (
                    <Paper
                      elevation={0}
                      sx={{
                        p: 5,
                        textAlign: 'center',
                        borderRadius: 3,
                        bgcolor: '#f8fafc',
                        border: '1px dashed #cbd5e1',
                      }}
                    >
                      <NotificationsNoneIcon sx={{ fontSize: 52, color: '#94a3b8', mb: 1 }} />
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#334155' }}>
                        No Notifications In This View
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5, maxWidth: 440, mx: 'auto' }}>
                        Real-time alerts will automatically appear here as riders dispatch, doorstep trials begin, and bills are generated.
                      </Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        sx={{ mt: 2, borderRadius: 2, fontWeight: 700, textTransform: 'none', color: '#064e3b', borderColor: '#064e3b' }}
                        onClick={handleTestAlert}
                      >
                        Try Demo Notification
                      </Button>
                    </Paper>
                  ) : (
                    <Stack spacing={1.5}>
                      {filteredNotifications.map((notif) => {
                        const isUnread = !notif.isRead;
                        let IconComponent = ShoppingBagOutlinedIcon;
                        let iconColor = '#059669';
                        let iconBg = '#ecfdf5';

                        if (notif.category === 'delivery') {
                          IconComponent = LocalShippingOutlinedIcon;
                          iconColor = '#0284c7';
                          iconBg = '#f0f9ff';
                        } else if (notif.category === 'trial') {
                          IconComponent = AccessTimeOutlinedIcon;
                          iconColor = '#d97706';
                          iconBg = '#fffbeb';
                        } else if (notif.category === 'bill') {
                          IconComponent = ReceiptLongOutlinedIcon;
                          iconColor = '#7c3aed';
                          iconBg = '#f5f3ff';
                        } else if (notif.status === 'DELIVERED') {
                          IconComponent = CheckCircleOutlineIcon;
                          iconColor = '#10b981';
                          iconBg = '#ecfdf5';
                        }

                        return (
                          <Paper
                            key={notif.id}
                            elevation={0}
                            sx={{
                              p: 2,
                              borderRadius: 2.5,
                              border: isUnread ? '1.5px solid #10b981' : '1px solid #e2e8f0',
                              bgcolor: isUnread ? '#f0fdf4' : '#ffffff',
                              transition: 'all 0.2s ease',
                              '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.05)' },
                            }}
                          >
                            <Stack direction="row" spacing={2} alignItems="flex-start">
                              <Avatar sx={{ bgcolor: iconBg, color: iconColor, width: 44, height: 44 }}>
                                <IconComponent />
                              </Avatar>

                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                  <Box>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                                        {notif.title}
                                      </Typography>
                                      {isUnread && (
                                        <Chip
                                          label="NEW"
                                          size="small"
                                          sx={{ height: 18, fontSize: 9, fontWeight: 900, bgcolor: '#10b981', color: '#fff' }}
                                        />
                                      )}
                                    </Stack>
                                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                                      {getRelativeTime(notif.timestamp)} • {new Date(notif.timestamp).toLocaleTimeString()}
                                    </Typography>
                                  </Box>

                                  <Stack direction="row" spacing={0.5}>
                                    {isUnread && (
                                      <Tooltip title="Mark as read">
                                        <IconButton size="small" onClick={() => markSingleAsRead(notif.id)}>
                                          <DoneAllIcon fontSize="small" sx={{ color: '#059669' }} />
                                        </IconButton>
                                      </Tooltip>
                                    )}
                                    <Tooltip title="Dismiss">
                                      <IconButton size="small" onClick={() => deleteSingleNotification(notif.id)}>
                                        <CloseIcon fontSize="small" sx={{ color: '#94a3b8' }} />
                                      </IconButton>
                                    </Tooltip>
                                  </Stack>
                                </Stack>

                                <Typography variant="body2" sx={{ mt: 1, color: '#334155', lineHeight: 1.5 }}>
                                  {notif.message}
                                </Typography>

                                {notif.orderId && (
                                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5 }}>
                                    <Chip
                                      label={`Order #${notif.orderId}`}
                                      size="small"
                                      variant="outlined"
                                      sx={{ fontWeight: 700, fontSize: 11, borderColor: '#cbd5e1' }}
                                    />
                                    {notif.actionUrl && (
                                      <Button
                                        size="small"
                                        variant="contained"
                                        sx={{
                                          bgcolor: '#064e3b',
                                          fontWeight: 700,
                                          fontSize: 11,
                                          borderRadius: 1.5,
                                          textTransform: 'none',
                                          py: 0.4,
                                          px: 1.5,
                                          '&:hover': { bgcolor: '#043629' },
                                        }}
                                        onClick={() => {
                                          markSingleAsRead(notif.id);
                                          navigate(notif.actionUrl);
                                        }}
                                      >
                                        {notif.actionLabel || 'View Order / Bill'}
                                      </Button>
                                    )}
                                  </Stack>
                                )}
                              </Box>
                            </Stack>
                          </Paper>
                        );
                      })}
                    </Stack>
                  )}
                </Stack>
              )}

              {/* TAB 2: ADDRESSES */}
              {tabValue === 2 && (
                <Stack spacing={2}>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                    Saved Delivery Addresses
                  </Typography>

                  {addressList.map((item, index) => (
                    <Paper
                      key={`${item.address}-${item.postcode}-${index}`}
                      elevation={0}
                      sx={{ p: 2, borderRadius: 2, border: '1px solid #e2e8f0' }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography sx={{ fontWeight: 700, color: '#0f172a' }}>{item.address}</Typography>
                            <Chip label={item.address_type || 'Residential'} size="small" sx={{ height: 20, fontSize: 10, fontWeight: 700 }} />
                          </Stack>
                          <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                            {item.city}, {item.country} - {item.postcode}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1}>
                          <IconButton
                            size="small"
                            onClick={() => {
                              setEditingAddress(item);
                              setAddressForm({
                                country: item.country || 'India',
                                address: item.address,
                                city: item.city,
                                postcode: item.postcode,
                                address_type: item.address_type || 'Residential',
                              });
                            }}
                          >
                            <EditRoundedIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleAddressDelete(item)}>
                            <DeleteOutlineRoundedIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Stack>
                    </Paper>
                  ))}

                  <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2.5, border: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
                    <Typography sx={{ fontWeight: 800, mb: 1.5, color: '#0f172a' }}>
                      {editingAddress ? 'Edit Delivery Address' : 'Add New Address'}
                    </Typography>
                    <Grid container spacing={1.5}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Country"
                          value={addressForm.country}
                          onChange={(e) => setAddressForm({ ...addressForm, country: e.target.value })}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          size="small"
                          label="City"
                          value={addressForm.city}
                          onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Street Address / Flat / Floor"
                          value={addressForm.address}
                          onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Postal Code (PIN)"
                          value={addressForm.postcode}
                          onChange={(e) => setAddressForm({ ...addressForm, postcode: e.target.value })}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#374151', display: 'block', mb: 0.5 }}>
                          Address Type
                        </Typography>
                        <Stack direction="row" spacing={1}>
                          {['Residential', 'Gated Society', 'Hostel/Commercial'].map((type) => (
                            <Button
                              key={type}
                              size="small"
                              variant={addressForm.address_type === type ? 'contained' : 'outlined'}
                              onClick={() => setAddressForm({ ...addressForm, address_type: type })}
                              sx={{
                                fontWeight: 700,
                                borderRadius: 2,
                                textTransform: 'none',
                                bgcolor: addressForm.address_type === type ? (type === 'Hostel/Commercial' ? '#dc2626' : '#064e3b') : undefined,
                              }}
                            >
                              {type}
                            </Button>
                          ))}
                        </Stack>
                      </Grid>
                    </Grid>
                    <Stack direction="row" spacing={1.5} sx={{ mt: 2.5 }}>
                      <Button
                        variant="contained"
                        sx={{ bgcolor: '#064e3b', fontWeight: 700, borderRadius: 2, '&:hover': { bgcolor: '#043629' } }}
                        onClick={handleAddressSave}
                      >
                        Save Address
                      </Button>
                      {editingAddress && (
                        <Button
                          variant="outlined"
                          sx={{ borderRadius: 2, fontWeight: 700 }}
                          onClick={() => {
                            setEditingAddress(null);
                            setAddressForm({ country: 'India', address: '', city: '', postcode: '', address_type: 'Residential' });
                          }}
                        >
                          Cancel
                        </Button>
                      )}
                    </Stack>
                  </Paper>
                </Stack>
              )}

              {/* TAB 3: REVIEWS */}
              {tabValue === 3 && (
                <Stack spacing={2}>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                    Purchased Item Reviews
                  </Typography>

                  <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2.5, border: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
                    <Typography sx={{ fontWeight: 800, mb: 1.5, color: '#0f172a' }}>
                      Write A Product Review
                    </Typography>
                    {purchasedVariants.length > 0 ? (
                      <Grid container spacing={1.5}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            select
                            fullWidth
                            size="small"
                            label="Select Purchased Product"
                            SelectProps={{ native: true }}
                            value={reviewForm.product_details_id}
                            onChange={(e) => {
                              const found = purchasedVariants.find((p) => String(p.id) === e.target.value);
                              setReviewForm({ ...reviewForm, product_details_id: e.target.value, product: found?.name || '' });
                            }}
                          >
                            <option value="">-- Choose item --</option>
                            {purchasedVariants.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </TextField>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Rating (1-5 Stars)"
                            type="number"
                            inputProps={{ min: 1, max: 5 }}
                            value={reviewForm.rating}
                            onChange={(e) => setReviewForm({ ...reviewForm, rating: e.target.value })}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            size="small"
                            multiline
                            minRows={3}
                            label="Your Feedback / Fitting Experience"
                            value={reviewForm.review}
                            onChange={(e) => setReviewForm({ ...reviewForm, review: e.target.value })}
                          />
                        </Grid>
                      </Grid>
                    ) : (
                      <Typography variant="body2" sx={{ color: '#64748b', my: 1 }}>
                        Product reviews become available once you finalize and purchase items during a doorstep trial.
                      </Typography>
                    )}
                    {purchasedVariants.length > 0 && (
                      <Button
                        variant="contained"
                        sx={{ mt: 2, bgcolor: '#064e3b', fontWeight: 700, borderRadius: 2, '&:hover': { bgcolor: '#043629' } }}
                        onClick={handleReviewAdd}
                      >
                        Submit Review
                      </Button>
                    )}
                  </Paper>

                  {reviews.map((review) => (
                    <Paper key={review.id} elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid #e2e8f0' }}>
                      <Typography sx={{ fontWeight: 800, color: '#0f172a' }}>{review.product}</Typography>
                      <Typography variant="body2" sx={{ color: '#d97706', fontWeight: 700, mt: 0.3 }}>
                        ★ {review.rating}/5 Stars
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1, color: '#334155' }}>
                        {review.review}
                      </Typography>
                    </Paper>
                  ))}
                </Stack>
              )}

              {/* TAB 4: HELP CENTER */}
              {tabValue === 4 && (
                <Stack spacing={2}>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                    Customer Support & Help Center
                  </Typography>

                  <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2.5, border: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                      <SupportAgentRoundedIcon sx={{ color: '#064e3b' }} />
                      <Typography sx={{ fontWeight: 800, color: '#0f172a' }}>Create Support Ticket</Typography>
                    </Stack>
                    <TextField
                      fullWidth
                      size="small"
                      label="Subject"
                      value={helpForm.subject}
                      onChange={(e) => setHelpForm({ ...helpForm, subject: e.target.value })}
                    />
                    <TextField
                      fullWidth
                      size="small"
                      multiline
                      minRows={3}
                      sx={{ mt: 1.5 }}
                      label="Message / Issue Description"
                      value={helpForm.message}
                      onChange={(e) => setHelpForm({ ...helpForm, message: e.target.value })}
                    />
                    <Typography role="status" sx={{ mt: 1, color: ticketMessage.includes('success') ? '#059669' : '#dc2626', fontWeight: 600 }}>
                      {ticketMessage}
                    </Typography>
                    <Button
                      disabled={ticketBusy}
                      variant="contained"
                      sx={{ mt: 2, bgcolor: '#064e3b', fontWeight: 700, borderRadius: 2, '&:hover': { bgcolor: '#043629' } }}
                      onClick={handleTicketCreate}
                    >
                      {ticketBusy ? 'Submitting…' : 'Submit Ticket'}
                    </Button>
                  </Paper>

                  {tickets.map((ticket) => (
                    <Paper key={ticket.id} elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid #e2e8f0' }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography sx={{ fontWeight: 800, color: '#0f172a' }}>{ticket.subject}</Typography>
                        <Chip
                          size="small"
                          label={ticket.status}
                          color={ticket.status === 'open' ? 'warning' : 'success'}
                          sx={{ fontWeight: 700 }}
                        />
                      </Stack>
                      <Typography variant="body2" sx={{ mt: 1, color: '#475569' }}>
                        {ticket.message}
                      </Typography>
                      {ticket.response && (
                        <Box sx={{ mt: 1.5, p: 1.5, bgcolor: '#f0fdf4', borderRadius: 1.5, borderLeft: '4px solid #10b981' }}>
                          <Typography variant="caption" sx={{ fontWeight: 800, color: '#065f46', display: 'block' }}>
                            Support Team Response:
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#064e3b', whiteSpace: 'pre-wrap', mt: 0.3 }}>
                            {ticket.response}
                          </Typography>
                        </Box>
                      )}
                    </Paper>
                  ))}
                </Stack>
              )}

              {/* TAB 5: ACCOUNT */}
              {tabValue === 5 && (
                <Paper elevation={0} sx={{ p: 3, borderRadius: 2.5, border: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', mb: 2 }}>
                    Account Details & Verification
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, display: 'block' }}>
                        Full Name
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 700, color: '#0f172a' }}>
                        {userData.fname} {userData.lname}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, display: 'block' }}>
                        Registered Mobile Number
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 700, color: '#0f172a' }}>
                        +91 {userData.mobileno} (Verified ✓)
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, display: 'block' }}>
                        Email Address
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 700, color: '#0f172a' }}>
                        {userData.emailid || 'Not provided'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, display: 'block' }}>
                        Doorstep Try & Buy Policy
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 700, color: '#059669' }}>
                        100% Cash On Delivery (COD) Only
                      </Typography>
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 3 }} />

                  <Button
                    variant="outlined"
                    color="error"
                    sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none' }}
                    onClick={handleLogout}
                  >
                    Logout from Doordrape
                  </Button>
                </Paper>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}
