import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  Grid,
  IconButton,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import SupportAgentRoundedIcon from '@mui/icons-material/SupportAgentRounded';
import { postData } from '../../services/FetchDjangoApiServices';

export default function ProfilePage() {
  const user = useSelector((state) => state.user);
  const userData = Object.values(user)[0] || {};
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [tabValue, setTabValue] = useState(0);

  const [addressList, setAddressList] = useState([]);
  const [addressForm, setAddressForm] = useState({ country: 'India', address: '', city: '', postcode: '' });
  const [editingAddress, setEditingAddress] = useState(null);

  const [reviewForm, setReviewForm] = useState({ product: '', rating: '', review: '' });
  const [helpForm, setHelpForm] = useState({ subject: '', message: '' });

  const reviewKey = userData?.mobileno ? `trial_reviews_${userData.mobileno}` : '';
  const helpKey = userData?.mobileno ? `help_tickets_${userData.mobileno}` : '';

  const [orderHistory, setOrderHistory] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [tickets, setTickets] = useState([]);

  const [walletBalance, setWalletBalance] = useState(0);

  const fetchUserAddress = async () => {
    if (!userData?.mobileno) return;
    const result = await postData('fetch_user_address', { mobile: userData.mobileno });
    if (result && result.status) {
      setAddressList(result.data || []);
    } else {
      setAddressList([]);
    }
  };

  useEffect(() => {
    fetchUserAddress();
  }, [userData?.mobileno]);

  useEffect(() => {
    if (!userData?.mobileno) return;
    const fetchOrderLifecycle = async () => {
      const result = await postData('user_order_lifecycle_list', { mobileno: userData.mobileno });
      if (result?.status) {
        setOrderHistory(result.data || []);
        if (result.wallet) {
          setWalletBalance(result.wallet.balance || 0);
        }
      } else {
        setOrderHistory([]);
      }
    };

    fetchOrderLifecycle();
    const interval = setInterval(fetchOrderLifecycle, 10000); // Poll every 10 seconds

    setReviews(JSON.parse(localStorage.getItem(reviewKey) || '[]'));
    setTickets(JSON.parse(localStorage.getItem(helpKey) || '[]'));

    return () => clearInterval(interval);
  }, [userData?.mobileno, reviewKey, helpKey]);

  const stats = useMemo(() => {
    return {
      orders: orderHistory.length,
      addresses: addressList.length,
      reviews: reviews.length,
      tickets: tickets.length,
    };
  }, [orderHistory.length, addressList.length, reviews.length, tickets.length]);

  const renderOrderLifecycleStep = (status) => {
    const steps = ['Try Requested', 'Rider Out for Trial', 'Trial in Progress', 'Trial Completed', 'Selection Submitted', 'Completed'];
    let activeIndex = 0;
    if (status?.includes('Out') || status?.includes('Assigned')) activeIndex = 1;
    if (status?.includes('Progress') || status?.includes('Active')) activeIndex = 2;
    if (status?.includes('Trial Completed')) activeIndex = 3;
    if (status?.includes('selection_submitted') || status?.includes('ready_for_payment')) activeIndex = 4;
    if (status?.includes('Completed') || status?.includes('paid')) activeIndex = 5;

    return (
      <Box sx={{ mt: 1.5, mb: 1 }}>
        <Grid container spacing={1}>
          {steps.map((step, idx) => (
            <Grid item xs={2.4} key={step}>
              <Box
                sx={{
                  height: 6,
                  borderRadius: 3,
                  bgcolor: idx <= activeIndex ? '#16a34a' : '#e2e8f0',
                  mb: 0.5,
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  fontSize: 10,
                  fontWeight: idx <= activeIndex ? 800 : 500,
                  color: idx <= activeIndex ? '#15803d' : '#94a3b8',
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
    if (!addressForm.address || !addressForm.city || !addressForm.postcode || !addressForm.country) {
      alert('Please fill all address fields.');
      return;
    }

    let result;
    if (editingAddress) {
      result = await postData('address_update', {
        mobile: userData.mobileno,
        old_address: editingAddress.address,
        old_city: editingAddress.city,
        old_postcode: editingAddress.postcode,
        old_country: editingAddress.country,
        address: addressForm.address,
        city: addressForm.city,
        postcode: addressForm.postcode,
        country: addressForm.country,
      });
    } else {
      const formData = new FormData();
      formData.append('country', addressForm.country);
      formData.append('address', addressForm.address);
      formData.append('city', addressForm.city);
      formData.append('postcode', addressForm.postcode);
      formData.append('mobileno', userData.mobileno);
      result = await postData('address_submit', formData);
    }

    if (result && result.status) {
      alert(result.message || 'Address saved');
      setAddressForm({ country: 'India', address: '', city: '', postcode: '' });
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

  const handleReviewAdd = () => {
    if (!reviewForm.product || !reviewForm.rating || !reviewForm.review) {
      alert('Please fill product, rating and review.');
      return;
    }

    const next = [
      {
        id: `RVW-${Date.now()}`,
        ...reviewForm,
        createdAt: new Date().toISOString(),
      },
      ...reviews,
    ];
    setReviews(next);
    localStorage.setItem(reviewKey, JSON.stringify(next));
    setReviewForm({ product: '', rating: '', review: '' });
  };

  const handleTicketCreate = () => {
    if (!helpForm.subject || !helpForm.message) {
      alert('Please enter subject and message.');
      return;
    }

    const next = [
      {
        id: `TKT-${Date.now()}`,
        ...helpForm,
        status: 'Open',
        createdAt: new Date().toISOString(),
      },
      ...tickets,
    ];
    setTickets(next);
    localStorage.setItem(helpKey, JSON.stringify(next));
    setHelpForm({ subject: '', message: '' });
  };

  const handleLogout = () => {
    dispatch({ type: 'CLEAR_USER' });
    navigate('/home');
  };

  if (!userData?.mobileno) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Paper sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>Profile</Typography>
          <Typography sx={{ mt: 1, color: '#6b7280' }}>Please login to manage your profile details.</Typography>
          <Button variant="contained" sx={{ mt: 3, bgcolor: '#111827' }} onClick={() => navigate('/signindisplay')}>
            Login Now
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #e5e7eb', mb: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar sx={{ width: 56, height: 56, bgcolor: '#111827' }}>
                <PersonOutlineIcon />
              </Avatar>
              <Box>
                <Typography sx={{ fontWeight: 800 }}>{userData.fname} {userData.lname}</Typography>
                <Typography variant="body2" sx={{ color: '#6b7280' }}>{userData.mobileno}</Typography>
                <Typography variant="body2" sx={{ color: '#6b7280' }}>{userData.emailid}</Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', rowGap: 1 }}>
              <Chip label={`Orders ${stats.orders}`} />
              <Chip label={`Addresses ${stats.addresses}`} />
              <Chip label={`Reviews ${stats.reviews}`} />
              <Chip label={`Help ${stats.tickets}`} />
            </Stack>

            <Button fullWidth variant="outlined" sx={{ mt: 2 }} onClick={handleLogout}>
              Logout
            </Button>
          </Paper>

          {/* WALLET ACCOUNT CARD */}
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, bgcolor: '#111827', color: '#ffffff' }}>
            <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 1, color: '#9ca3af', fontWeight: 800 }}>
              💳 SevenShades Wallet
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 900, my: 1, color: '#4ade80' }}>
              ₹{walletBalance}
            </Typography>
            <Typography variant="caption" sx={{ color: '#d1d5db', display: 'block' }}>
              Trial Fee returns & cashbacks will be credited to this wallet.
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, borderRadius: 3, border: '1px solid #e5e7eb' }}>
            <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} variant="scrollable" scrollButtons="auto">
              <Tab label="Orders" />
              <Tab label="Addresses" />
              <Tab label="Reviews" />
              <Tab label="Help Center" />
              <Tab label="Account" />
            </Tabs>

            <Box sx={{ mt: 2 }}>
              {tabValue === 0 && (
                <Stack spacing={1.5}>
                  {orderHistory.length === 0 ? (
                    <Typography variant="body2" sx={{ color: '#6b7280' }}>No orders found yet.</Typography>
                  ) : (
                    orderHistory.map((row) => (
                      <Paper key={row?.try_order?.order_id} sx={{ p: 2, borderRadius: 2, border: '1px solid #e5e7eb' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography sx={{ fontWeight: 800 }}>{row?.try_order?.order_id}</Typography>
                            <Typography variant="caption" sx={{ color: '#6b7280' }}>
                              {new Date(row?.try_order?.created_at).toLocaleString()} • {row?.try_order?.delivery_mode === 'emergency_sos' ? '⚡ SOS 90-120 Min' : '🚚 Standard Slot'}
                            </Typography>
                          </Box>
                          <Chip label={row?.try_order?.status || 'Try Requested'} color={row?.try_order?.status?.includes('Completed') ? 'success' : 'info'} size="small" sx={{ fontWeight: 700 }} />
                        </Stack>

                        {/* VISUAL ORDER LIFECYCLE PROGRESS */}
                        {renderOrderLifecycleStep(row?.try_order?.status)}

                        <Typography variant="body2" sx={{ mt: 1, color: '#374151' }}>
                          Try Fee: <b>₹{row?.try_order?.try_fee || 0}</b> • Items: <b>{row?.try_order?.total_try_items || 0}</b>
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.5, color: '#4b5563' }}>
                          Final Purchase: {row?.final_order ? `${row.final_order.status} • Final Payable ₹${row.final_order.final_payable}` : 'Pending delivery doorstep selection'}
                        </Typography>
                      </Paper>
                    ))
                  )}
                </Stack>
              )}

              {tabValue === 1 && (
                <Stack spacing={2}>
                  {addressList.map((item, index) => (
                    <Paper key={`${item.address}-${item.postcode}-${index}`} sx={{ p: 2, borderRadius: 2, border: '1px solid #e5e7eb' }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography sx={{ fontWeight: 700 }}>{item.address}</Typography>
                          <Typography variant="body2" sx={{ color: '#6b7280' }}>{item.city}, {item.country} - {item.postcode}</Typography>
                        </Box>
                        <Stack direction="row" spacing={1}>
                          <IconButton
                            size="small"
                            onClick={() => {
                              setEditingAddress(item);
                              setAddressForm({ country: item.country, address: item.address, city: item.city, postcode: item.postcode });
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

                  <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid #e5e7eb' }}>
                    <Typography sx={{ fontWeight: 700, mb: 1 }}>{editingAddress ? 'Edit Address' : 'Add Address'}</Typography>
                    <Grid container spacing={1.5}>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth size="small" label="Country" value={addressForm.country} onChange={(e) => setAddressForm({ ...addressForm, country: e.target.value })} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth size="small" label="City" value={addressForm.city} onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })} />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField fullWidth size="small" label="Address" value={addressForm.address} onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })} />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField fullWidth size="small" label="Postcode" value={addressForm.postcode} onChange={(e) => setAddressForm({ ...addressForm, postcode: e.target.value })} />
                      </Grid>
                    </Grid>
                    <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
                      <Button variant="contained" onClick={handleAddressSave}>Save</Button>
                      {editingAddress && (
                        <Button variant="outlined" onClick={() => {
                          setEditingAddress(null);
                          setAddressForm({ country: 'India', address: '', city: '', postcode: '' });
                        }}>
                          Cancel
                        </Button>
                      )}
                    </Stack>
                  </Paper>
                </Stack>
              )}

              {tabValue === 2 && (
                <Stack spacing={2}>
                  <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid #e5e7eb' }}>
                    <Typography sx={{ fontWeight: 700, mb: 1 }}>Write A Review</Typography>
                    <Grid container spacing={1.5}>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth size="small" label="Product Name" value={reviewForm.product} onChange={(e) => setReviewForm({ ...reviewForm, product: e.target.value })} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField fullWidth size="small" label="Rating (1-5)" value={reviewForm.rating} onChange={(e) => setReviewForm({ ...reviewForm, rating: e.target.value })} />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField fullWidth size="small" multiline minRows={3} label="Review" value={reviewForm.review} onChange={(e) => setReviewForm({ ...reviewForm, review: e.target.value })} />
                      </Grid>
                    </Grid>
                    <Button variant="contained" sx={{ mt: 2 }} onClick={handleReviewAdd}>Submit Review</Button>
                  </Paper>

                  {reviews.map((review) => (
                    <Paper key={review.id} sx={{ p: 2, borderRadius: 2, border: '1px solid #e5e7eb' }}>
                      <Typography sx={{ fontWeight: 700 }}>{review.product}</Typography>
                      <Typography variant="body2" sx={{ color: '#6b7280' }}>Rating: {review.rating}/5</Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>{review.review}</Typography>
                    </Paper>
                  ))}
                </Stack>
              )}

              {tabValue === 3 && (
                <Stack spacing={2}>
                  <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid #e5e7eb' }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <SupportAgentRoundedIcon />
                      <Typography sx={{ fontWeight: 700 }}>Create Help Ticket</Typography>
                    </Stack>
                    <TextField fullWidth size="small" label="Subject" value={helpForm.subject} onChange={(e) => setHelpForm({ ...helpForm, subject: e.target.value })} />
                    <TextField fullWidth size="small" multiline minRows={3} sx={{ mt: 1.5 }} label="Message" value={helpForm.message} onChange={(e) => setHelpForm({ ...helpForm, message: e.target.value })} />
                    <Button variant="contained" sx={{ mt: 2 }} onClick={handleTicketCreate}>Submit Ticket</Button>
                  </Paper>

                  {tickets.map((ticket) => (
                    <Paper key={ticket.id} sx={{ p: 2, borderRadius: 2, border: '1px solid #e5e7eb' }}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography sx={{ fontWeight: 700 }}>{ticket.subject}</Typography>
                        <Chip size="small" label={ticket.status} />
                      </Stack>
                      <Typography variant="body2" sx={{ mt: 1 }}>{ticket.message}</Typography>
                    </Paper>
                  ))}
                </Stack>
              )}

              {tabValue === 4 && (
                <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid #e5e7eb' }}>
                  <Typography sx={{ fontWeight: 700 }}>Account Information</Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>Name: {userData.fname} {userData.lname}</Typography>
                  <Typography variant="body2">Mobile: {userData.mobileno}</Typography>
                  <Typography variant="body2">Email: {userData.emailid}</Typography>
                </Paper>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}
