import { validateFields } from '../../services/validation';
import LocationButton from '../../services/LocationButton';
import { payWithRazorpay } from '../../services/razorpayCheckout';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CssBaseline from '@mui/material/CssBaseline';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useState, useEffect, useRef } from 'react';
import { postData } from '../../services/FetchDjangoApiServices';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';

const defaultTheme = createTheme();

export default function UserAddressForm() {
  const user = useSelector((state) => state.user);
  const userData = Object.values(user)[0] || {};
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const trialDetails = location.state || {};

  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [country, setCountry] = useState('India');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postcode, setPostCode] = useState('');
  const [addressType, setAddressType] = useState('Residential');
  const [fname, setFName] = useState(userData?.fname || '');
  const [lname, setLName] = useState(userData?.lname || '');
  const [mobileno, setMobileNo] = useState(userData?.mobileno || '');
  const [formError, setFormError] = useState({});
  const [addressList, setAddressList] = useState([]);
  const [selectedAddressIndex, setSelectedAddressIndex] = useState(-1);
  const [deliveryMode, setDeliveryMode] = useState('standard');
  const [deliverySlot, setDeliverySlot] = useState('10:00 AM - 02:00 PM (North Zone)');
  const [billingPaymentMode, setBillingPaymentMode] = useState('upi');
  const [editingAddress, setEditingAddress] = useState(null);

  const billingItems = trialDetails.billingItems || [];
  const isFirstOrder = trialDetails.isFirstOrder !== false;
  const selectedAddress = selectedAddressIndex >= 0 ? addressList[selectedAddressIndex] : null;

  // Calculate billing amount based on Delivery Mode & First Order status
  const currentTryFee = deliveryMode === 'emergency_sos' ? 99 : (isFirstOrder ? 0 : 49);
  const billingAmount = currentTryFee;

  const handleError = (errormessage, label) => {
    setFormError((prev) => ({ ...prev, [label]: errormessage }));
  };

  const fetchUserAddress = async () => {
    if (!userData?.mobileno) return;
    const result = await postData('fetch_user_address', { mobile: userData.mobileno });
    if (result && result.status) {
      setAddressList(result.data || []);
      setSelectedAddressIndex(0);
    } else {
      setAddressList([]);
      setSelectedAddressIndex(-1);
    }
  };

  useEffect(() => {
    fetchUserAddress();
  }, [userData?.mobileno]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    let err = false;
    if (!fname) { handleError('Required', 'fname'); err = true; }
    if (!lname) { handleError('Required', 'lname'); err = true; }
    if (!mobileno) { handleError('Required', 'mobileno'); err = true; }
    if (!country) { handleError('Required', 'country'); err = true; }
    if (!address) { handleError('Required', 'address'); err = true; }
    if (!city) { handleError('Required', 'city'); err = true; }
    if (!postcode) { handleError('Required', 'postcode'); err = true; }

    const validation = validateFields(editingAddress ? 'address_update' : 'address_submit', { address, city, country, postcode, address_type: addressType, mobileno });
    Object.entries(validation).forEach(([field, message]) => handleError(message, field));
    if (err || Object.keys(validation).length) return;

    let result;
    if (editingAddress) {
      result = await postData('address_update', {
        mobile: mobileno,
        old_address: editingAddress.address,
        old_city: editingAddress.city,
        old_postcode: editingAddress.postcode,
        old_country: editingAddress.country,
        address,
        city,
        postcode,
        country,
        address_type: addressType,
      });
    } else {
      const formData = new FormData();
      formData.append('country', country);
      formData.append('address', address);
      formData.append('city', city);
      formData.append('postcode', postcode);
      formData.append('mobileno', mobileno);
      formData.append('address_type', addressType);
      result = await postData('address_submit', formData);
    }

    if (result && result.status) {
      alert(result.message || (editingAddress ? 'Address updated' : 'Address saved'));
      setAddress('');
      setCity('');
      setPostCode('');
      setAddressType('Residential');
      setEditingAddress(null);
      fetchUserAddress();
    } else {
      alert(result?.message || (editingAddress ? 'Unable to update address' : 'Unable to save address'));
    }
  };

  const handleStartEdit = (event, addressItem) => {
    event.stopPropagation();
    setEditingAddress(addressItem);
    setAddress(addressItem.address || '');
    setCity(addressItem.city || '');
    setPostCode(addressItem.postcode || '');
    setCountry(addressItem.country || 'India');
    setAddressType(addressItem.address_type || 'Residential');
  };

  const handleDeleteAddress = async (event, addressItem) => {
    event.stopPropagation();
    const confirmDelete = window.confirm('Delete this address?');
    if (!confirmDelete) return;

    const result = await postData('address_delete', {
      mobile: mobileno,
      old_address: addressItem.address,
      old_city: addressItem.city,
      old_postcode: addressItem.postcode,
      old_country: addressItem.country,
    });

    if (result && result.status) {
      alert(result.message || 'Address deleted');
      fetchUserAddress();
      if (editingAddress && editingAddress.address === addressItem.address && editingAddress.postcode === addressItem.postcode) {
        setEditingAddress(null);
        setAddress('');
        setCity('');
        setPostCode('');
        setCountry('India');
        setAddressType('Residential');
      }
    } else {
      alert(result?.message || 'Unable to delete address');
    }
  };

  const handlePlaceOrder = () => {
    if (submittingRef.current) return;
    if (!billingItems.length || billingItems.some(item => !item.size)) {
      alert("Please return to your bag and select a size for each product.");
      return;
    }
    const selectedAddress = selectedAddressIndex >= 0 ? addressList[selectedAddressIndex] : null;

    if (!selectedAddress) {
      alert('Please select a saved address or add a new address first.');
      return;
    }

    if (selectedAddress.address_type === 'Hostel/Commercial') {
      alert('⚠️ Try & Buy Service is restricted at Hostel & Restricted Commercial locations (trial room access constraint). Please select a Residential or Gated Society address.');
      return;
    }

    const createTryOrder = async () => {
      submittingRef.current = true;
      setSubmitting(true);
      try {
      const payload = {
        mobileno: userData?.mobileno,
        address_id: selectedAddress.id,
        address: {
          address: selectedAddress.address,
          city: selectedAddress.city,
          country: selectedAddress.country,
          postcode: selectedAddress.postcode,
          address_type: selectedAddress.address_type || 'Residential',
        },
        delivery_mode: deliveryMode,
        delivery_slot: deliverySlot,
        try_payment_mode: billingAmount > 0 ? billingPaymentMode : 'free',
        items: billingItems.map((item) => ({
          product_details_id: item.id,
          size: item.size,
          product_name: item.name,
          brand_name: item.brand,
          qty: item.qty,
          unit_price: item.qty > 0 ? Math.floor((item.price || 0) / item.qty) : item.price || 0,
        })),
      };

      const result = await postData('try_order_create', payload);
      if (result?.status && result?.data?.order_id) {
        if (result.data.status === 'AWAITING_TRIAL_PAYMENT') {
          try { await payWithRazorpay(result.data.order_id, 'trial'); }
          catch (error) {
            alert(error.message);
            navigate('/maincart?order=' + encodeURIComponent(result.data.order_id));
            return;
          }
        }
        billingItems.forEach((item) => {
          dispatch({ type: 'DELETE_PRODUCT', payLoad: [item.id] });
        });

        navigate('/ordersuccess', {
          state: {
            billingAmount: result.data.try_fee,
            paymentMode: result.data.try_payment_mode,
            totalTryItems: result.data.total_try_items,
            orderId: result.data.order_id,
            deliveryMode: result.data.delivery_mode,
            deliverySlot: result.data.delivery_slot,
          },
        });
      } else {
        alert(result?.message || 'Unable to place try order right now.');
      }
      } catch (error) {
        alert('Unable to confirm the order. Please check your orders before retrying.');
      } finally {
        submittingRef.current = false;
        setSubmitting(false);
      }
    };

    createTryOrder();
  };

  return (
    <ThemeProvider theme={defaultTheme}>
      <Container component="main" maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        <CssBaseline />
        {selectedAddress && <LocationButton addressId={selectedAddress.id} />}
        <Typography sx={{ my: 2 }}>Try items at home before deciding. Once your purchase is finalized, returns and refunds are not available.</Typography>
        <Box sx={{ mb: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar sx={{ bgcolor: '#111827', width: 52, height: 52 }}>
              <LocalShippingOutlinedIcon />
            </Avatar>
            <Box>
              <Typography component="h1" variant="h4" sx={{ fontWeight: 800, color: '#111827' }}>
                Hyperlocal Try & Buy Checkout
              </Typography>
              <Typography variant="body2" sx={{ color: '#6b7280' }}>
                Delivery Address, Mode (Standard vs SOS 90-Min), aur Slot select karke order place karein.
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 4, border: '1px solid #e5e7eb', bgcolor: '#ffffff' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#111827' }}>
                    Saved Addresses
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#6b7280' }}>
                    Select saved address or add a new one.
                  </Typography>
                </Box>
                <Chip label={`${addressList.length} saved`} size="small" sx={{ bgcolor: '#eef2ff', color: '#3730a3', fontWeight: 700 }} />
              </Stack>

              {addressList.length === 0 ? (
                <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px dashed #cbd5e1', bgcolor: '#f8fafc' }}>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    No saved address found. Add a new address below to continue.
                  </Typography>
                </Paper>
              ) : (
                <Stack spacing={2}>
                  {addressList.map((item, index) => {
                    const isHostel = item.address_type === 'Hostel/Commercial';
                    return (
                      <Paper
                        key={`${item.address}-${item.postcode}-${index}`}
                        elevation={0}
                        onClick={() => setSelectedAddressIndex(index)}
                        sx={{
                          p: 2,
                          borderRadius: 3,
                          border: selectedAddressIndex === index ? (isHostel ? '2px solid #ef4444' : '2px solid #111827') : '1px solid #e5e7eb',
                          bgcolor: selectedAddressIndex === index ? (isHostel ? '#fef2f2' : '#f8fafc') : '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" spacing={2}>
                          <Stack direction="row" spacing={1.5} alignItems="flex-start">
                            <LocationOnOutlinedIcon sx={{ color: selectedAddressIndex === index ? (isHostel ? '#ef4444' : '#111827') : '#94a3b8', mt: 0.2 }} />
                            <Box>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Typography variant="body1" sx={{ fontWeight: 800, color: '#111827' }}>
                                  {userData?.fname} {userData?.lname}
                                </Typography>
                                <Chip
                                  label={item.address_type || 'Residential'}
                                  size="small"
                                  sx={{
                                    height: 20,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    bgcolor: isHostel ? '#fee2e2' : '#f1f5f9',
                                    color: isHostel ? '#991b1b' : '#334155',
                                  }}
                                />
                              </Stack>
                              <Typography variant="body2" sx={{ color: '#374151', mt: 0.5 }}>
                                {item.address}
                              </Typography>
                              <Typography variant="body2" sx={{ color: '#6b7280' }}>
                                {item.city}, {item.country} - {item.postcode}
                              </Typography>
                              {isHostel && (
                                <Typography variant="caption" sx={{ color: '#dc2626', fontWeight: 700, display: 'block', mt: 0.5 }}>
                                  ⚠️ Restricted Location for Try & Buy
                                </Typography>
                              )}
                              <Stack direction="row" spacing={0.5} sx={{ mt: 1 }}>
                                <IconButton
                                  size="small"
                                  onClick={(event) => handleStartEdit(event, item)}
                                  sx={{ border: '1px solid #dbe2ea' }}
                                >
                                  <EditRoundedIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={(event) => handleDeleteAddress(event, item)}
                                  sx={{ border: '1px solid #f5d0d0', color: '#b91c1c' }}
                                >
                                  <DeleteOutlineRoundedIcon fontSize="small" />
                                </IconButton>
                              </Stack>
                            </Box>
                          </Stack>
                          {selectedAddressIndex === index && <CheckCircleRoundedIcon sx={{ color: isHostel ? '#ef4444' : '#16a34a' }} />}
                        </Stack>
                      </Paper>
                    );
                  })}
                </Stack>
              )}

              <Divider sx={{ my: 3 }} />

              <Box component="form" noValidate onSubmit={handleSubmit}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#111827', mb: 0.5 }}>
                  {editingAddress ? 'Edit Address' : 'Add New Address'}
                </Typography>
                <Typography variant="body2" sx={{ color: '#6b7280', mb: 2 }}>
                  Address details fill karein aur Category select karein.
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="First Name" value={fname} onChange={(e) => setFName(e.target.value)} error={!!formError.fname} helperText={formError.fname} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Last Name" value={lname} onChange={(e) => setLName(e.target.value)} error={!!formError.lname} helperText={formError.lname} />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField fullWidth label="Mobile Number" value={mobileno} onChange={(e) => setMobileNo(e.target.value)} error={!!formError.mobileno} helperText={formError.mobileno} />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" sx={{ fontWeight: 700, mb: 1, color: '#374151' }}>
                      Address Type (Location Safety Category)
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      {['Residential', 'Gated Society', 'Hostel/Commercial'].map((type) => (
                        <Button
                          key={type}
                          size="small"
                          variant={addressType === type ? 'contained' : 'outlined'}
                          onClick={() => setAddressType(type)}
                          sx={{
                            fontWeight: 700,
                            borderRadius: 2,
                            textTransform: 'none',
                            bgcolor: addressType === type ? (type === 'Hostel/Commercial' ? '#dc2626' : '#111827') : undefined,
                          }}
                        >
                          {type}
                        </Button>
                      ))}
                    </Stack>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField fullWidth label="Country" value={country} onChange={(e) => setCountry(e.target.value)} error={!!formError.country} helperText={formError.country} />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField fullWidth label="Full Address" value={address} onChange={(e) => setAddress(e.target.value)} error={!!formError.address} helperText={formError.address} multiline minRows={3} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="City" value={city} onChange={(e) => setCity(e.target.value)} error={!!formError.city} helperText={formError.city} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Postcode" value={postcode} onChange={(e) => setPostCode(e.target.value)} error={!!formError.postcode} helperText={formError.postcode} />
                  </Grid>
                </Grid>

                <Button type="submit" fullWidth variant="outlined" sx={{ mt: 3, borderColor: '#111827', color: '#111827', py: 1.4, fontWeight: 700 }}>
                  {editingAddress ? 'Update Address' : 'Save New Address'}
                </Button>
                {editingAddress && (
                  <Button
                    type="button"
                    fullWidth
                    variant="text"
                    sx={{ mt: 1, py: 1.2, fontWeight: 700 }}
                    onClick={() => {
                      setEditingAddress(null);
                      setAddress('');
                      setCity('');
                      setPostCode('');
                      setCountry('India');
                      setAddressType('Residential');
                    }}
                  >
                    Cancel Edit
                  </Button>
                )}
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={5}>
            <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 4, border: '1px solid #e5e7eb', bgcolor: '#ffffff', position: { md: 'sticky' }, top: 24 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#111827', mb: 1 }}>
                Select Delivery Mode
              </Typography>

              <Stack spacing={1.5} sx={{ mb: 3 }}>
                <Paper
                  elevation={0}
                  onClick={() => setDeliveryMode('standard')}
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    border: deliveryMode === 'standard' ? '2px solid #111827' : '1px solid #e5e7eb',
                    bgcolor: deliveryMode === 'standard' ? '#f8fafc' : '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 800, color: '#111827' }}>
                        🚚 Standard Try & Buy
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#6b7280' }}>
                        Same-Day Batched Slot • ₹49 Upfront {isFirstOrder && '(FREE 1st Order)'}
                      </Typography>
                    </Box>
                    <Chip label={isFirstOrder ? 'FREE' : '₹49'} color="primary" size="small" sx={{ fontWeight: 800 }} />
                  </Stack>

                  {deliveryMode === 'standard' && (
                    <Box sx={{ mt: 1.5 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#374151' }}>
                        Route Slot:
                      </Typography>
                      <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                        {['10:00 AM - 02:00 PM (North Zone)', '04:00 PM - 08:00 PM (South Zone)'].map((slot) => (
                          <Button
                            key={slot}
                            size="small"
                            variant={deliverySlot === slot ? 'contained' : 'outlined'}
                            onClick={(e) => { e.stopPropagation(); setDeliverySlot(slot); }}
                            sx={{ fontSize: 11, fontWeight: 700, py: 0.5, bgcolor: deliverySlot === slot ? '#111827' : undefined }}
                          >
                            {slot}
                          </Button>
                        ))}
                      </Stack>
                    </Box>
                  )}
                </Paper>

                <Paper
                  elevation={0}
                  onClick={() => setDeliveryMode('emergency_sos')}
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    border: deliveryMode === 'emergency_sos' ? '2px solid #dc2626' : '1px solid #e5e7eb',
                    bgcolor: deliveryMode === 'emergency_sos' ? '#fef2f2' : '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body1" sx={{ fontWeight: 800, color: '#dc2626' }}>
                          ⚡ Emergency SOS (Instant Fit)
                        </Typography>
                        <Chip label="90-120 Min" size="small" color="error" sx={{ height: 20, fontSize: 10, fontWeight: 800 }} />
                      </Stack>
                      <Typography variant="caption" sx={{ color: '#991b1b' }}>
                        Point-to-Point Priority Fleet • ₹99 Upfront (Strictly no discount)
                      </Typography>
                    </Box>
                    <Chip label="₹99" color="error" size="small" sx={{ fontWeight: 800 }} />
                  </Stack>
                </Paper>
              </Stack>

              <Divider sx={{ my: 2 }} />

              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#111827' }}>
                  Order Summary
                </Typography>
                <Chip
                  label={deliveryMode === 'emergency_sos' ? 'SOS Mode: ₹99' : (isFirstOrder ? 'First Order: Free' : 'Standard: ₹49')}
                  size="small"
                  sx={{ bgcolor: deliveryMode === 'emergency_sos' ? '#fee2e2' : '#ecfdf5', color: deliveryMode === 'emergency_sos' ? '#991b1b' : '#047857', fontWeight: 700 }}
                />
              </Stack>

              <Stack spacing={1.2} sx={{ mb: 2 }}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" sx={{ color: '#6b7280' }}>Try Items</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{trialDetails.totalTryItems || 0}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" sx={{ color: '#6b7280' }}>Reference Value</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>₹{trialDetails.referenceValue || 0}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" sx={{ color: '#6b7280' }}>Delivery & Trial Fee</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: '#111827' }}>₹{billingAmount}</Typography>
                </Stack>
              </Stack>

              {billingAmount > 0 && (
                <Box sx={{ mt: 2, mb: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, mb: 1.2, color: '#111827' }}>
                    Choose Upfront Payment Mode
                  </Typography>
                  <Stack direction="row" spacing={1.2}>
                    <Button
                      fullWidth
                      variant={billingPaymentMode === 'upi' ? 'contained' : 'outlined'}
                      onClick={() => setBillingPaymentMode('upi')}
                      sx={{ py: 1.2, fontWeight: 700, bgcolor: billingPaymentMode === 'upi' ? '#111827' : undefined }}
                    >
                      UPI
                    </Button>
                    <Button
                      fullWidth
                      variant={billingPaymentMode === 'cod' ? 'contained' : 'outlined'}
                      onClick={() => setBillingPaymentMode('cod')}
                      sx={{ py: 1.2, fontWeight: 700, bgcolor: billingPaymentMode === 'cod' ? '#111827' : undefined }}
                    >
                      COD
                    </Button>
                  </Stack>
                </Box>
              )}

              <Paper elevation={0} sx={{ p: 2, borderRadius: 3, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#111827', mb: 0.75 }}>
                  Selected Delivery Address
                </Typography>
                {selectedAddress ? (
                  <>
                    <Typography variant="body2" sx={{ color: '#374151' }}>{selectedAddress.address}</Typography>
                    <Typography variant="body2" sx={{ color: '#6b7280' }}>{selectedAddress.city}, {selectedAddress.country} - {selectedAddress.postcode}</Typography>
                    <Chip label={selectedAddress.address_type || 'Residential'} size="small" sx={{ mt: 0.5, height: 20, fontSize: 10 }} />
                  </>
                ) : (
                  <Typography variant="body2" sx={{ color: '#6b7280' }}>
                    Please select a saved address or add a new one.
                  </Typography>
                )}
              </Paper>

              <Button
                type="button"
                fullWidth
                variant="contained"
                color={deliveryMode === 'emergency_sos' ? 'error' : 'success'}
                sx={{ py: 1.5, fontWeight: 800, fontSize: 15 }}
                onClick={handlePlaceOrder}
                disabled={submitting || !billingItems.length}
              >
                {billingAmount > 0 ? `Pay ₹${billingAmount} & Confirm Order` : 'Place Free Trial Order'}
              </Button>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </ThemeProvider>
  );
}
