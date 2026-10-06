import React, { useState, useEffect, useCallback, useMemo } from 'react';
import DoordrapeLoader from '../../userinterface/components/DoordrapeLoader';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Chip,
  FormControl,
  InputLabel,
  Paper,
  Tooltip,
  InputAdornment,
  LinearProgress,
  Autocomplete,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormHelperText,
  Badge,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SearchIcon from '@mui/icons-material/Search';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import StorefrontIcon from '@mui/icons-material/Storefront';
import CategoryIcon from '@mui/icons-material/Category';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import Swal from 'sweetalert2';
import { getData, postData } from '../../services/FetchDjangoApiServices';

const PREFIXES = ['SAVE', 'FESTIVE', 'DOOR', 'STYLE', 'LUXURY', 'SUMMER', 'WINTER', 'FLASH', 'VIP', 'WELCOME'];

const generateRandomCouponCode = () => {
  const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
  const discount = [10, 15, 20, 25, 30, 40, 50, 100, 200, 500][Math.floor(Math.random() * 10)];
  const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}${discount}-${randomSuffix}`;
};

const formatDateForInput = (dateObj) => {
  if (!dateObj) return '';
  const d = new Date(dateObj);
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
};

export default function CouponManager() {
  const [coupons, setCoupons] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, expired: 0, total_redemptions: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [scopeFilter, setScopeFilter] = useState('all');

  // Dependencies for Scope Picker
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [products, setProducts] = useState([]);

  // Modal Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedCode, setCopiedCode] = useState('');

  const [formData, setFormData] = useState({
    id: null,
    code: '',
    description: '',
    discount_type: 'percentage',
    discount_value: '',
    max_discount: '',
    min_order_amount: '',
    scope: 'all',
    target_ids: [],
    total_usage_limit: '',
    per_user_limit: 1,
    start_date: '',
    end_date: '',
    is_active: true,
  });

  const [formErrors, setFormErrors] = useState({});

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
    if (scopeFilter && scopeFilter !== 'all') params.append('scope', scopeFilter);

    const res = await getData(`admin_coupon_list?${params.toString()}`);
    if (res && res.status) {
      setCoupons(res.data || []);
      if (res.stats) setStats(res.stats);
    } else {
      setCoupons([]);
    }
    setLoading(false);
  }, [search, statusFilter, scopeFilter]);

  const fetchDependencies = useCallback(async () => {
    const res = await getData('admin_coupon_dependencies');
    if (res && res.status) {
      setCategories(res.categories || []);
      setSubcategories(res.subcategories || []);
      setProducts(res.products || []);
    }
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  useEffect(() => {
    fetchDependencies();
  }, [fetchDependencies]);

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 2000);
  };

  const handleOpenAdd = () => {
    const now = new Date();
    const future = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days later
    setFormData({
      id: null,
      code: generateRandomCouponCode(),
      description: 'Flat discount on eligible products',
      discount_type: 'percentage',
      discount_value: '20',
      max_discount: '500',
      min_order_amount: '999',
      scope: 'all',
      target_ids: [],
      total_usage_limit: '100',
      per_user_limit: 1,
      start_date: formatDateForInput(now),
      end_date: formatDateForInput(future),
      is_active: true,
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleOpenEdit = (c) => {
    setFormData({
      id: c.id,
      code: c.code || '',
      description: c.description || '',
      discount_type: c.discount_type || 'percentage',
      discount_value: String(c.discount_value || ''),
      max_discount: c.max_discount !== null ? String(c.max_discount) : '',
      min_order_amount: c.min_order_amount !== null ? String(c.min_order_amount) : '',
      scope: c.scope || 'all',
      target_ids: (c.target_ids || []).map(String),
      total_usage_limit: c.total_usage_limit !== null ? String(c.total_usage_limit) : '',
      per_user_limit: c.per_user_limit || 1,
      start_date: c.start_date ? formatDateForInput(c.start_date) : '',
      end_date: c.end_date ? formatDateForInput(c.end_date) : '',
      is_active: c.is_active !== false,
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleApplyPresetDays = (days) => {
    const start = formData.start_date ? new Date(formData.start_date) : new Date();
    const future = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
    setFormData((prev) => ({
      ...prev,
      end_date: formatDateForInput(future),
    }));
  };

  const handleToggleStatus = async (coupon) => {
    const res = await postData('admin_coupon_toggle', { id: coupon.id });
    if (res && res.status) {
      setCoupons((prev) =>
        prev.map((c) => (c.id === coupon.id ? { ...c, is_active: res.is_active } : c))
      );
      setStats((prev) => ({
        ...prev,
        active: res.is_active ? prev.active + 1 : Math.max(0, prev.active - 1),
      }));
    } else {
      Swal.fire('Error', res?.message || 'Failed to toggle status.', 'error');
    }
  };

  const handleDelete = async (coupon) => {
    const confirm = await Swal.fire({
      title: `Delete Coupon "${coupon.code}"?`,
      text: 'This action cannot be undone. Users will no longer be able to use this promo.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, delete it',
    });

    if (confirm.isConfirmed) {
      const res = await postData('admin_coupon_delete', { id: coupon.id });
      if (res && res.status) {
        Swal.fire('Deleted', res.message, 'success');
        fetchCoupons();
      } else {
        Swal.fire('Error', res?.message || 'Could not delete coupon.', 'error');
      }
    }
  };

  const validateForm = () => {
    const errors = {};
    const codeClean = formData.code.trim().toUpperCase();
    if (!codeClean) {
      errors.code = 'Coupon code is required.';
    } else if (!/^[A-Z0-9_-]{3,30}$/.test(codeClean)) {
      errors.code = '3–30 characters, alphanumeric, hyphens or underscores only.';
    }

    const val = parseFloat(formData.discount_value);
    if (isNaN(val) || val <= 0) {
      errors.discount_value = 'Enter a discount value greater than 0.';
    } else if (formData.discount_type === 'percentage' && val > 100) {
      errors.discount_value = 'Percentage cannot exceed 100%.';
    }

    if (formData.scope !== 'all' && (!formData.target_ids || formData.target_ids.length === 0)) {
      errors.target_ids = `Select at least one ${formData.scope}.`;
    }

    if (!formData.start_date) errors.start_date = 'Start date is required.';
    if (!formData.end_date) errors.end_date = 'Expiry date is required.';
    if (formData.start_date && formData.end_date) {
      if (new Date(formData.end_date) <= new Date(formData.start_date)) {
        errors.end_date = 'Expiry date must be strictly after start date.';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    const payload = {
      ...formData,
      code: formData.code.trim().toUpperCase(),
      discount_value: parseFloat(formData.discount_value),
      max_discount: formData.max_discount ? parseFloat(formData.max_discount) : null,
      min_order_amount: formData.min_order_amount ? parseFloat(formData.min_order_amount) : 0,
      total_usage_limit: formData.total_usage_limit ? parseInt(formData.total_usage_limit, 10) : null,
      per_user_limit: parseInt(formData.per_user_limit || 1, 10),
      target_ids: formData.scope === 'all' ? [] : formData.target_ids,
    };

    const res = await postData('admin_coupon_save', payload);
    setSaving(false);

    if (res && res.status) {
      setDialogOpen(false);
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: res.message,
        timer: 1800,
        showConfirmButton: false,
      });
      fetchCoupons();
    } else {
      Swal.fire('Error', res?.message || 'Failed to save coupon.', 'error');
    }
  };

  // Scope Target Autocomplete Options
  const targetOptions = useMemo(() => {
    if (formData.scope === 'category') {
      return categories.map((c) => ({ id: String(c.id), label: c.name }));
    }
    if (formData.scope === 'subcategory') {
      return subcategories.map((s) => ({
        id: String(s.id),
        label: `${s.name} (${categories.find((c) => String(c.id) === String(s.category_id))?.name || 'Category'})`,
      }));
    }
    if (formData.scope === 'product') {
      return products.map((p) => ({
        id: String(p.id),
        label: `${p.name} · ${p.category_name || ''}`,
      }));
    }
    return [];
  }, [formData.scope, categories, subcategories, products]);

  return (
    <Box sx={{ pb: 6 }}>
      {/* Header Bar */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h5" fontWeight={900} sx={{ color: '#0f172a', letterSpacing: -0.5 }}>
            Coupon & Discount Rules
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            Configure website-wide, category-specific, subcategory, or individual product discounts with redemption limits.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5}>
          <Tooltip title="Refresh Coupons List">
            <IconButton
              onClick={fetchCoupons}
              sx={{
                bgcolor: '#fff',
                border: '1px solid #e2e8f0',
                '&:hover': { bgcolor: '#f1f5f9' },
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenAdd}
            sx={{
              bgcolor: '#064e3b',
              color: '#fff',
              px: 2.5,
              py: 1,
              borderRadius: 2.5,
              fontWeight: 800,
              boxShadow: '0 4px 14px rgba(6, 78, 59, 0.25)',
              '&:hover': { bgcolor: '#047857' },
            }}
          >
            Create Coupon
          </Button>
        </Stack>
      </Stack>

      {/* KPI Stats Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none', bgcolor: '#ffffff' }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                    Total Coupons
                  </Typography>
                  <Typography variant="h4" fontWeight={900} sx={{ color: '#0f172a', mt: 0.5 }}>
                    {stats.total}
                  </Typography>
                </Box>
                <Box sx={{ width: 46, height: 46, borderRadius: 2.5, bgcolor: 'rgba(6, 78, 59, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ConfirmationNumberIcon sx={{ color: '#064e3b' }} />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none', bgcolor: '#ffffff' }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="caption" sx={{ color: '#059669', fontWeight: 700, textTransform: 'uppercase' }}>
                    Active Promos
                  </Typography>
                  <Typography variant="h4" fontWeight={900} sx={{ color: '#059669', mt: 0.5 }}>
                    {stats.active}
                  </Typography>
                </Box>
                <Box sx={{ width: 46, height: 46, borderRadius: 2.5, bgcolor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <EventAvailableIcon sx={{ color: '#16a34a' }} />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none', bgcolor: '#ffffff' }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="caption" sx={{ color: '#dc2626', fontWeight: 700, textTransform: 'uppercase' }}>
                    Expired Promos
                  </Typography>
                  <Typography variant="h4" fontWeight={900} sx={{ color: '#dc2626', mt: 0.5 }}>
                    {stats.expired}
                  </Typography>
                </Box>
                <Box sx={{ width: 46, height: 46, borderRadius: 2.5, bgcolor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <EventBusyIcon sx={{ color: '#dc2626' }} />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none', bgcolor: '#ffffff' }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="caption" sx={{ color: '#7c3aed', fontWeight: 700, textTransform: 'uppercase' }}>
                    Total Redemptions
                  </Typography>
                  <Typography variant="h4" fontWeight={900} sx={{ color: '#7c3aed', mt: 0.5 }}>
                    {stats.total_redemptions}
                  </Typography>
                </Box>
                <Box sx={{ width: 46, height: 46, borderRadius: 2.5, bgcolor: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <LocalOfferIcon sx={{ color: '#9333ea' }} />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter and Search Bar */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by coupon code or note…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#94a3b8' }} />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">All Statuses</MenuItem>
                <MenuItem value="active">Active Only</MenuItem>
                <MenuItem value="expired">Expired Only</MenuItem>
                <MenuItem value="inactive">Inactive Only</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Applicability Scope</InputLabel>
              <Select
                value={scopeFilter}
                label="Applicability Scope"
                onChange={(e) => setScopeFilter(e.target.value)}
              >
                <MenuItem value="all">All Scopes</MenuItem>
                <MenuItem value="all_products">Entire Store (All)</MenuItem>
                <MenuItem value="category">Categories</MenuItem>
                <MenuItem value="subcategory">Subcategories</MenuItem>
                <MenuItem value="product">Products</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="outlined"
              size="small"
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setScopeFilter('all');
              }}
              sx={{ borderColor: '#cbd5e1', color: '#475569', height: 40 }}
            >
              Reset Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Coupons Table */}
      <Paper sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none', overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ p: 6, display: 'flex', justifyContent: 'center' }}>
            <DoordrapeLoader message="Loading promotional coupons..." />
          </Box>
        ) : coupons.length === 0 ? (
          <Box sx={{ p: 8, textAlign: 'center' }}>
            <ConfirmationNumberIcon sx={{ fontSize: 54, color: '#cbd5e1', mb: 1 }} />
            <Typography variant="h6" fontWeight={700} sx={{ color: '#475569' }}>
              No coupons found
            </Typography>
            <Typography variant="body2" sx={{ color: '#94a3b8', mb: 2 }}>
              {search || statusFilter !== 'all' || scopeFilter !== 'all'
                ? 'Try adjusting your search filters or status selection.'
                : 'Click "Create Coupon" to launch your first promotional discount.'}
            </Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAdd} sx={{ bgcolor: '#064e3b' }}>
              Create First Coupon
            </Button>
          </Box>
        ) : (
          <TableContainer>
            <Table sx={{ minWidth: 950 }}>
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Coupon Code</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Discount Value</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Scope & Target</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Usage & Limits</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Min Order</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Validity</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {coupons.map((c) => {
                  const usagePercent = c.total_usage_limit ? Math.min(100, Math.round((c.used_count / c.total_usage_limit) * 100)) : null;
                  const isCurrentActive = c.is_active && !c.is_expired && !c.is_upcoming;

                  return (
                    <TableRow key={c.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      {/* Code */}
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Chip
                            label={c.code}
                            size="small"
                            onClick={() => handleCopyCode(c.code)}
                            onDelete={() => handleCopyCode(c.code)}
                            deleteIcon={copiedCode === c.code ? <CheckCircleOutlineIcon sx={{ color: '#10b981 !important' }} /> : <ContentCopyIcon sx={{ fontSize: '14px !important' }} />}
                            sx={{
                              bgcolor: 'rgba(6, 78, 59, 0.08)',
                              color: '#064e3b',
                              fontWeight: 900,
                              fontFamily: 'monospace',
                              letterSpacing: 0.8,
                              fontSize: 13,
                              px: 0.5,
                              cursor: 'pointer',
                              '&:hover': { bgcolor: 'rgba(6, 78, 59, 0.16)' },
                            }}
                          />
                        </Stack>
                        {c.description && (
                          <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.4 }}>
                            {c.description}
                          </Typography>
                        )}
                      </TableCell>

                      {/* Discount Value */}
                      <TableCell>
                        <Typography fontWeight={800} sx={{ color: '#0f172a' }}>
                          {c.discount_type === 'percentage' ? `${c.discount_value}% OFF` : `₹${c.discount_value} FLAT`}
                        </Typography>
                        {c.discount_type === 'percentage' && c.max_discount && (
                          <Typography variant="caption" sx={{ color: '#059669', fontWeight: 600 }}>
                            Capped up to ₹{c.max_discount}
                          </Typography>
                        )}
                      </TableCell>

                      {/* Scope & Target */}
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Chip
                            size="small"
                            icon={
                              c.scope === 'all' ? (
                                <StorefrontIcon sx={{ fontSize: '14px !important' }} />
                              ) : c.scope === 'product' ? (
                                <ShoppingBagIcon sx={{ fontSize: '14px !important' }} />
                              ) : (
                                <CategoryIcon sx={{ fontSize: '14px !important' }} />
                              )
                            }
                            label={
                              c.scope === 'all'
                                ? 'Entire Store'
                                : c.scope === 'category'
                                ? `Category (${c.target_ids.length})`
                                : c.scope === 'subcategory'
                                ? `Subcategory (${c.target_ids.length})`
                                : `Product (${c.target_ids.length})`
                            }
                            sx={{
                              width: 'fit-content',
                              fontWeight: 700,
                              bgcolor: '#f1f5f9',
                              color: '#334155',
                            }}
                          />
                          {c.scope !== 'all' && c.target_names && (
                            <Tooltip title={c.target_names.join(', ')}>
                              <Typography
                                variant="caption"
                                sx={{
                                  color: '#64748b',
                                  maxWidth: 180,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  display: 'block',
                                }}
                              >
                                {c.target_names.slice(0, 2).join(', ')}
                                {c.target_names.length > 2 ? ` +${c.target_names.length - 2} more` : ''}
                              </Typography>
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>

                      {/* Usage */}
                      <TableCell sx={{ minWidth: 140 }}>
                        <Typography variant="body2" fontWeight={700}>
                          {c.used_count} {c.total_usage_limit ? `/ ${c.total_usage_limit}` : 'used'}
                        </Typography>
                        {usagePercent !== null && (
                          <Box sx={{ width: '100%', mt: 0.5 }}>
                            <LinearProgress
                              variant="determinate"
                              value={usagePercent}
                              sx={{
                                height: 5,
                                borderRadius: 3,
                                bgcolor: '#e2e8f0',
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: usagePercent >= 90 ? '#ef4444' : usagePercent >= 50 ? '#f59e0b' : '#10b981',
                                },
                              }}
                            />
                          </Box>
                        )}
                        <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                          Limit: {c.per_user_limit}x per customer
                        </Typography>
                      </TableCell>

                      {/* Min Order */}
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {c.min_order_amount > 0 ? `₹${c.min_order_amount}` : 'None'}
                        </Typography>
                      </TableCell>

                      {/* Validity */}
                      <TableCell>
                        {c.is_expired ? (
                          <Chip label="Expired" size="small" sx={{ bgcolor: '#fee2e2', color: '#b91c1c', fontWeight: 800 }} />
                        ) : c.is_upcoming ? (
                          <Chip label="Upcoming" size="small" sx={{ bgcolor: '#fef3c7', color: '#b45309', fontWeight: 800 }} />
                        ) : isCurrentActive ? (
                          <Chip label="Active Now" size="small" sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 800 }} />
                        ) : (
                          <Chip label="Disabled" size="small" sx={{ bgcolor: '#f1f5f9', color: '#64748b', fontWeight: 800 }} />
                        )}
                        <Typography variant="caption" sx={{ display: 'block', color: '#94a3b8', mt: 0.4 }}>
                          {c.end_date ? new Date(c.end_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No Expiry'}
                        </Typography>
                      </TableCell>

                      {/* Active Toggle Switch */}
                      <TableCell>
                        <Switch
                          checked={c.is_active}
                          onChange={() => handleToggleStatus(c)}
                          color="success"
                          size="small"
                        />
                      </TableCell>

                      {/* Actions */}
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Tooltip title="Edit Coupon">
                            <IconButton size="small" onClick={() => handleOpenEdit(c)} sx={{ color: '#0284c7' }}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Coupon">
                            <IconButton size="small" onClick={() => handleDelete(c)} sx={{ color: '#ef4444' }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Modal Dialog: Create / Edit Coupon */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3.5, p: 1 } }}
      >
        <DialogTitle sx={{ px: 3, pt: 2.5, pb: 1 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="h6" fontWeight={900} sx={{ color: '#0f172a' }}>
                {formData.id ? `Edit Coupon: ${formData.code}` : 'Generate & Configure New Coupon'}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                Set discount values, targeting scope, usage caps, and validity period.
              </Typography>
            </Box>
            <Chip
              label={formData.is_active ? 'Active' : 'Inactive'}
              color={formData.is_active ? 'success' : 'default'}
              size="small"
              sx={{ fontWeight: 800 }}
            />
          </Stack>
        </DialogTitle>

        <DialogContent dividers sx={{ px: 3, py: 2.5 }}>
          {/* Real-time Coupon Ticket Preview */}
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              mb: 3,
              borderRadius: 3,
              background: 'linear-gradient(135deg, #022c22 0%, #064e3b 60%, #0f172a 100%)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <Stack direction={{ xs: 'column', sm: 'row' }} alignItems="center" justifyContent="space-between" spacing={2}>
              <Box>
                <Typography variant="caption" sx={{ color: '#6ee7b7', fontWeight: 800, letterSpacing: 1.2 }}>
                  PREVIEW · TRY & BUY REWARD VOUCHER
                </Typography>
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mt: 0.5 }}>
                  <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: 1.5, fontFamily: 'monospace', color: '#fff' }}>
                    {formData.code || 'COUPONCODE'}
                  </Typography>
                  <Chip
                    size="small"
                    label={formData.discount_type === 'percentage' ? `${formData.discount_value || '0'}% OFF` : `₹${formData.discount_value || '0'} FLAT`}
                    sx={{ bgcolor: '#10b981', color: '#fff', fontWeight: 900 }}
                  />
                </Stack>
                <Typography variant="body2" sx={{ color: '#cbd5e1', mt: 0.5 }}>
                  {formData.description || 'Applies at cart checkout'}
                  {formData.discount_type === 'percentage' && formData.max_discount ? ` · Up to ₹${formData.max_discount}` : ''}
                  {formData.min_order_amount ? ` · Min Order ₹${formData.min_order_amount}` : ''}
                </Typography>
              </Box>

              <Box sx={{ textAlign: { xs: 'left', sm: 'right' }, width: { xs: '100%', sm: 'auto' } }}>
                <Chip
                  size="small"
                  label={
                    formData.scope === 'all'
                      ? 'Entire Store'
                      : formData.scope === 'category'
                      ? `Specific Categories (${formData.target_ids.length})`
                      : formData.scope === 'subcategory'
                      ? `Specific Subcategories (${formData.target_ids.length})`
                      : `Selected Products (${formData.target_ids.length})`
                  }
                  sx={{ bgcolor: 'rgba(255, 255, 255, 0.15)', color: '#fff', fontWeight: 700 }}
                />
                <Typography variant="caption" sx={{ display: 'block', color: '#94a3b8', mt: 0.8 }}>
                  Valid until: {formData.end_date ? new Date(formData.end_date).toLocaleDateString() : 'N/A'}
                </Typography>
              </Box>
            </Stack>
          </Paper>

          <form onSubmit={handleSave}>
            <Grid container spacing={2.5}>
              {/* 1. Coupon Basics */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#064e3b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  1. Coupon Basics
                </Typography>
              </Grid>

              <Grid item xs={12} sm={7}>
                <TextField
                  fullWidth
                  label="Coupon Code"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') })
                  }
                  placeholder="e.g. FESTIVE20"
                  error={!!formErrors.code}
                  helperText={formErrors.code || 'Auto-uppercase alphanumeric code without spaces'}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Button
                          size="small"
                          startIcon={<AutoAwesomeIcon sx={{ fontSize: 16 }} />}
                          onClick={() => setFormData((prev) => ({ ...prev, code: generateRandomCouponCode() }))}
                          sx={{ textTransform: 'none', fontWeight: 700, color: '#059669' }}
                        >
                          Random Code
                        </Button>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={5}>
                <FormControl fullWidth>
                  <InputLabel>Discount Type</InputLabel>
                  <Select
                    value={formData.discount_type}
                    label="Discount Type"
                    onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                  >
                    <MenuItem value="percentage">Percentage (%)</MenuItem>
                    <MenuItem value="flat">Flat Amount (₹)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description / Marketing Note"
                  placeholder="e.g. Flat 20% off on Red Shirts & Men's Collection"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label={formData.discount_type === 'percentage' ? 'Discount Percentage (%)' : 'Discount Amount (₹)'}
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                  error={!!formErrors.discount_value}
                  helperText={formErrors.discount_value || (formData.discount_type === 'percentage' ? 'e.g. 20 for 20%' : 'e.g. 200 for ₹200')}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        {formData.discount_type === 'percentage' ? '%' : '₹'}
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Max Discount Cap (₹)"
                  value={formData.max_discount}
                  onChange={(e) => setFormData({ ...formData, max_discount: e.target.value })}
                  disabled={formData.discount_type !== 'percentage'}
                  placeholder="e.g. 500 (No cap if blank)"
                  helperText={
                    formData.discount_type === 'percentage'
                      ? 'Maximum discount limit in ₹ (e.g. Up to ₹500)'
                      : 'Not applicable for flat discount'
                  }
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                  }}
                />
              </Grid>

              {/* 2. Applicability / Scope Selection */}
              <Grid item xs={12} sx={{ mt: 1 }}>
                <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#064e3b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  2. Applicability / Scope (Target Selection)
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: '#f8fafc' }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', display: 'block', mb: 1 }}>
                    APPLY COUPON ON:
                  </Typography>
                  <RadioGroup
                    row
                    value={formData.scope}
                    onChange={(e) => setFormData({ ...formData, scope: e.target.value, target_ids: [] })}
                  >
                    <FormControlLabel
                      value="all"
                      control={<Radio color="success" />}
                      label={<Typography variant="body2" fontWeight={700}>Entire Store (All Products)</Typography>}
                    />
                    <FormControlLabel
                      value="category"
                      control={<Radio color="success" />}
                      label={<Typography variant="body2" fontWeight={700}>Specific Categories</Typography>}
                    />
                    <FormControlLabel
                      value="subcategory"
                      control={<Radio color="success" />}
                      label={<Typography variant="body2" fontWeight={700}>Specific Subcategories</Typography>}
                    />
                    <FormControlLabel
                      value="product"
                      control={<Radio color="success" />}
                      label={<Typography variant="body2" fontWeight={700}>Specific Products</Typography>}
                    />
                  </RadioGroup>

                  {formData.scope !== 'all' && (
                    <Box sx={{ mt: 2 }}>
                      <Autocomplete
                        multiple
                        options={targetOptions}
                        getOptionLabel={(opt) => opt.label}
                        value={targetOptions.filter((opt) => formData.target_ids.includes(opt.id))}
                        onChange={(event, selected) => {
                          setFormData({
                            ...formData,
                            target_ids: selected.map((s) => s.id),
                          });
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label={`Select ${formData.scope === 'category' ? 'Categories' : formData.scope === 'subcategory' ? 'Subcategories' : 'Products'}`}
                            placeholder="Type to search…"
                            error={!!formErrors.target_ids}
                            helperText={formErrors.target_ids || 'Discount will only apply to eligible items in the cart matching these targets.'}
                          />
                        )}
                        renderTags={(tagValue, getTagProps) =>
                          tagValue.map((option, index) => (
                            <Chip
                              label={option.label}
                              {...getTagProps({ index })}
                              size="small"
                              sx={{ bgcolor: 'rgba(6, 78, 59, 0.1)', color: '#064e3b', fontWeight: 700 }}
                            />
                          ))
                        }
                      />
                    </Box>
                  )}
                </Paper>
              </Grid>

              {/* 3. Usage Limits & Conditions */}
              <Grid item xs={12} sx={{ mt: 1 }}>
                <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#064e3b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  3. Usage Limits & Conditions
                </Typography>
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Minimum Order Amount (₹)"
                  value={formData.min_order_amount}
                  onChange={(e) => setFormData({ ...formData, min_order_amount: e.target.value })}
                  placeholder="e.g. 999"
                  helperText="Optional (0 or blank for no minimum)"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Total Usage Limit"
                  value={formData.total_usage_limit}
                  onChange={(e) => setFormData({ ...formData, total_usage_limit: e.target.value })}
                  placeholder="e.g. 200"
                  helperText="Total times coupon can be redeemed"
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Per User Limit"
                  value={formData.per_user_limit}
                  onChange={(e) => setFormData({ ...formData, per_user_limit: e.target.value })}
                  placeholder="1"
                  helperText="Redemptions allowed per customer (default 1)"
                />
              </Grid>

              {/* 4. Validity Period & Status */}
              <Grid item xs={12} sx={{ mt: 1 }}>
                <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#064e3b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  4. Validity Period & Status
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="datetime-local"
                  label="Start Date & Time"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  error={!!formErrors.start_date}
                  helperText={formErrors.start_date}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="datetime-local"
                  label="Expiry Date & Time"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  error={!!formErrors.end_date}
                  helperText={formErrors.end_date}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>
                    Quick Presets:
                  </Typography>
                  <Chip label="+7 Days" size="small" onClick={() => handleApplyPresetDays(7)} sx={{ cursor: 'pointer' }} />
                  <Chip label="+14 Days" size="small" onClick={() => handleApplyPresetDays(14)} sx={{ cursor: 'pointer' }} />
                  <Chip label="+30 Days" size="small" onClick={() => handleApplyPresetDays(30)} sx={{ cursor: 'pointer' }} />
                  <Chip label="+60 Days" size="small" onClick={() => handleApplyPresetDays(60)} sx={{ cursor: 'pointer' }} />
                </Stack>
              </Grid>

              <Grid item xs={12}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mt: 1 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        color="success"
                      />
                    }
                    label={<Typography fontWeight={700}>Enable Coupon Immediately (Active Status)</Typography>}
                  />
                </Stack>
              </Grid>
            </Grid>
          </form>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: '#64748b', fontWeight: 700 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={saving}
            onClick={handleSave}
            sx={{
              bgcolor: '#064e3b',
              color: '#fff',
              fontWeight: 800,
              px: 3,
              '&:hover': { bgcolor: '#047857' },
            }}
          >
            {saving ? 'Saving...' : formData.id ? 'Update Coupon' : 'Create Coupon'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
