import React, { useState, useEffect, useCallback, useMemo } from 'react';
import DoordrapeLoader from '../../userinterface/components/DoordrapeLoader';
import {
  Box,
  Button,
  Card,
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
  Tabs,
  Tab,
  Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import SearchIcon from '@mui/icons-material/Search';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import Swal from 'sweetalert2';
import { getData, postData } from '../../services/FetchDjangoApiServices';
import imageUrl from '../../services/imageUrl';

const TIER_COLORS = [
  { value: 'blue', label: 'Sapphire Blue', bg: '#eff6ff', text: '#2563eb' },
  { value: 'purple', label: 'Royal Purple', bg: '#faf5ff', text: '#9333ea' },
  { value: 'orange', label: 'Sunset Orange', bg: '#fff7ed', text: '#ea580c' },
  { value: 'green', label: 'Emerald Green', bg: '#f0fdf4', text: '#16a34a' }
];

export default function BudgetBazaarManager() {
  const [deals, setDeals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Product Selection / Visibility Dialog State
  const [productsModalOpen, setProductsModalOpen] = useState(false);
  const [selectedDealForProducts, setSelectedDealForProducts] = useState(null);
  const [dealProductsLoading, setDealProductsLoading] = useState(false);
  const [dealProducts, setDealProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [productFilterTab, setProductFilterTab] = useState('all'); // 'all', 'visible', 'hidden', 'eligible'
  const [savingProducts, setSavingProducts] = useState(false);

  const [formData, setFormData] = useState({
    id: null,
    title: '',
    price_tag: '',
    max_price: '',
    maincategoryid: '',
    subcategoryid: '',
    tier_color: 'blue',
    order_index: 0,
    is_active: true,
    iconFile: null,
    iconPreview: ''
  });

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    const res = await getData('admin_budget_bazaar_list');
    if (res && res.status) {
      setDeals(res.data || []);
    }
    setLoading(false);
  }, []);

  const fetchDependencies = useCallback(async () => {
    const [catRes, subRes] = await Promise.all([
      getData('user_maincategory_list'),
      getData('user_subcategory_list')
    ]);
    if (catRes && catRes.status) setCategories(catRes.data || []);
    if (subRes && subRes.status) setSubcategories(subRes.data || []);
  }, []);

  useEffect(() => {
    fetchDeals();
    fetchDependencies();
  }, [fetchDeals, fetchDependencies]);

  const handleOpenAdd = () => {
    setFormData({
      id: null,
      title: '',
      price_tag: 'Under ₹499',
      max_price: '499',
      maincategoryid: categories[0]?.id || '',
      subcategoryid: '',
      tier_color: 'blue',
      order_index: deals.length + 1,
      is_active: true,
      iconFile: null,
      iconPreview: ''
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (deal) => {
    setFormData({
      id: deal.id,
      title: deal.title || '',
      price_tag: deal.price_tag || '',
      max_price: deal.max_price !== null && deal.max_price !== undefined ? String(deal.max_price) : '',
      maincategoryid: deal.maincategoryid || '',
      subcategoryid: deal.subcategoryid || '',
      tier_color: deal.tier_color || 'blue',
      order_index: deal.order_index || 0,
      is_active: deal.is_active !== false,
      iconFile: null,
      iconPreview: deal.icon ? imageUrl(deal.icon) : ''
    });
    setDialogOpen(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        iconFile: file,
        iconPreview: URL.createObjectURL(file)
      }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      Swal.fire('Error', 'Please enter a deal title.', 'error');
      return;
    }
    if (!formData.price_tag.trim()) {
      Swal.fire('Error', 'Please enter a price tag (e.g. Under ₹499).', 'error');
      return;
    }

    setSaving(true);
    const body = new FormData();
    if (formData.id) body.append('id', formData.id);
    body.append('title', formData.title.trim());
    body.append('price_tag', formData.price_tag.trim());
    if (formData.max_price) body.append('max_price', formData.max_price);
    if (formData.maincategoryid) body.append('maincategoryid', formData.maincategoryid);
    if (formData.subcategoryid) body.append('subcategoryid', formData.subcategoryid);
    body.append('tier_color', formData.tier_color);
    body.append('order_index', formData.order_index);
    body.append('is_active', formData.is_active ? 'true' : 'false');
    if (formData.iconFile) {
      body.append('icon', formData.iconFile);
    }

    const res = await postData('admin_budget_bazaar_save', body);
    setSaving(false);

    if (res && res.status) {
      Swal.fire('Success', res.message, 'success');
      setDialogOpen(false);
      fetchDeals();
    } else {
      Swal.fire('Error', res?.message || 'Failed to save deal.', 'error');
    }
  };

  const handleDelete = async (deal) => {
    const confirm = await Swal.fire({
      title: 'Delete Deal?',
      text: `Are you sure you want to remove "${deal.title}" from Budget Bazaar?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it'
    });

    if (confirm.isConfirmed) {
      const res = await postData('admin_budget_bazaar_delete', { id: deal.id });
      if (res && res.status) {
        Swal.fire('Deleted!', res.message, 'success');
        fetchDeals();
      } else {
        Swal.fire('Error', res?.message || 'Failed to delete deal.', 'error');
      }
    }
  };

  const handleToggleActive = async (deal) => {
    const body = new FormData();
    body.append('id', deal.id);
    body.append('title', deal.title);
    body.append('price_tag', deal.price_tag);
    if (deal.max_price) body.append('max_price', deal.max_price);
    if (deal.maincategoryid) body.append('maincategoryid', deal.maincategoryid);
    if (deal.subcategoryid) body.append('subcategoryid', deal.subcategoryid);
    body.append('tier_color', deal.tier_color);
    body.append('order_index', deal.order_index);
    body.append('is_active', !deal.is_active ? 'true' : 'false');

    const res = await postData('admin_budget_bazaar_save', body);
    if (res && res.status) {
      setDeals(prev => prev.map(d => d.id === deal.id ? { ...d, is_active: !d.is_active } : d));
    }
  };

  // --- Product Visibility Management Handlers ---
  const handleOpenProductsModal = async (deal) => {
    setSelectedDealForProducts(deal);
    setProductsModalOpen(true);
    setDealProductsLoading(true);
    setProductSearch('');
    setProductFilterTab('all');

    const res = await getData(`admin_budget_bazaar_products?deal_id=${deal.id}&scope=all`);
    if (res && res.status) {
      setDealProducts(res.products || []);
    } else {
      Swal.fire('Error', res?.message || 'Failed to load deal products', 'error');
      setProductsModalOpen(false);
    }
    setDealProductsLoading(false);
  };

  const handleToggleProduct = (productId) => {
    setDealProducts(prev => prev.map(p => {
      if (p.id === productId) {
        return { ...p, is_visible: !p.is_visible };
      }
      return p;
    }));
  };

  const handleResetToPriceDefault = () => {
    setDealProducts(prev => prev.map(p => ({
      ...p,
      is_visible: p.default_visible
    })));
    Swal.fire({
      icon: 'info',
      title: 'Reset to Price Default',
      text: selectedDealForProducts?.max_price 
        ? `Reset to show all items ≤ ₹${selectedDealForProducts.max_price} (e.g. ₹399 for under ₹400).`
        : 'Reset to show all products by default.',
      timer: 1800,
      showConfirmButton: false
    });
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = new Set(displayedDealProducts.map(p => p.id));
    setDealProducts(prev => prev.map(p => filteredIds.has(p.id) ? { ...p, is_visible: true } : p));
  };

  const handleDeselectAllFiltered = () => {
    const filteredIds = new Set(displayedDealProducts.map(p => p.id));
    setDealProducts(prev => prev.map(p => filteredIds.has(p.id) ? { ...p, is_visible: false } : p));
  };

  const handleSaveProducts = async () => {
    if (!selectedDealForProducts) return;
    setSavingProducts(true);

    const excluded_product_ids = [];
    const included_product_ids = [];

    dealProducts.forEach(p => {
      if (p.default_visible && !p.is_visible) {
        excluded_product_ids.push(p.id);
      } else if (!p.default_visible && p.is_visible) {
        included_product_ids.push(p.id);
      }
    });

    const res = await postData('admin_budget_bazaar_products_save', {
      deal_id: selectedDealForProducts.id,
      selection_mode: 'auto',
      included_product_ids,
      excluded_product_ids
    });

    setSavingProducts(false);
    if (res && res.status) {
      Swal.fire('Success', res.message, 'success');
      setProductsModalOpen(false);
      fetchDeals();
    } else {
      Swal.fire('Error', res?.message || 'Failed to save deal products', 'error');
    }
  };

  const displayedDealProducts = useMemo(() => {
    let list = dealProducts;
    if (productSearch.trim()) {
      const q = productSearch.toLowerCase();
      list = list.filter(p => 
        (p.productname && p.productname.toLowerCase().includes(q)) ||
        (p.brandname && p.brandname.toLowerCase().includes(q)) ||
        (p.subcategoryname && p.subcategoryname.toLowerCase().includes(q)) ||
        (p.maincategoryname && p.maincategoryname.toLowerCase().includes(q))
      );
    }
    if (productFilterTab === 'visible') {
      list = list.filter(p => p.is_visible);
    } else if (productFilterTab === 'hidden') {
      list = list.filter(p => !p.is_visible);
    } else if (productFilterTab === 'eligible') {
      list = list.filter(p => p.default_visible);
    }
    return list;
  }, [dealProducts, productSearch, productFilterTab]);

  const visibleCount = useMemo(() => dealProducts.filter(p => p.is_visible).length, [dealProducts]);
  const eligibleCount = useMemo(() => dealProducts.filter(p => p.default_visible).length, [dealProducts]);
  const hiddenCount = useMemo(() => dealProducts.filter(p => !p.is_visible).length, [dealProducts]);

  // Filter subcategories by selected maincategory in Add/Edit modal
  const filteredSubcategories = subcategories.filter(sub => {
    if (!formData.maincategoryid) return true;
    return Number(sub.maincategoryid) === Number(formData.maincategoryid);
  });

  return (
    <Box sx={{ p: { xs: 1, md: 3 } }}>
      {/* Top Header Card */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, bgcolor: '#ffffff', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <LocalOfferIcon sx={{ color: '#2563eb', fontSize: 28 }} />
            <Typography variant="h5" fontWeight={800} color="#0f172a">
              Budget Bazaar Manager
            </Typography>
          </Stack>
          <Typography variant="body2" color="#64748b" sx={{ mt: 0.5 }}>
            Configure and curate value deals shown on storefront (default price thresholds, product inclusions & exclusions).
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchDeals}
            disabled={loading}
            sx={{ borderRadius: 2 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenAdd}
            sx={{ borderRadius: 2, bgcolor: '#22372f', '&:hover': { bgcolor: '#162520' } }}
          >
            Add New Deal
          </Button>
        </Stack>
      </Paper>

      {/* Deals Table */}
      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0' }}>
        {loading ? (
          <DoordrapeLoader variant="admin" text="Loading Budget Bazaar catalog deals…" role="status" />
        ) : deals.length === 0 ? (
          <Box sx={{ textAlign: 'center', p: 6, color: '#64748b' }}>
            <Typography variant="h6" fontWeight={600}>No Budget Bazaar Deals Configured</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>Click &quot;Add New Deal&quot; to create your first budget showcase.</Typography>
          </Box>
        ) : (
          <Table>
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, width: 60 }}>Order</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Preview & Title</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Price Tag</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Max Price</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Linked Category</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Live Products</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Accent</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Live</TableCell>
                <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {deals.map((deal) => {
                const accent = TIER_COLORS.find(c => c.value === deal.tier_color) || TIER_COLORS[0];
                const activeCount = deal.active_product_count !== undefined ? deal.active_product_count : (deal.product_count || 0);

                return (
                  <TableRow key={deal.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell>
                      <Chip size="small" label={`#${deal.order_index}`} sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }} />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Box
                          sx={{
                            width: 52,
                            height: 52,
                            borderRadius: 2,
                            overflow: 'hidden',
                            bgcolor: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          {deal.icon ? (
                            <img
                              src={imageUrl(deal.icon)}
                              alt={deal.title}
                              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                              onError={(e) => {
                                const sub = subcategories.find(s => Number(s.id) === Number(deal.subcategoryid));
                                const subIcon = sub?.icon || deal.subcategory_icon || deal.maincategory_icon;
                                if (subIcon && e.currentTarget.src !== imageUrl(subIcon)) {
                                  e.currentTarget.src = imageUrl(subIcon);
                                } else {
                                  e.currentTarget.src = '/images/product-placeholder.svg';
                                }
                              }}
                            />
                          ) : (
                            <LocalOfferIcon sx={{ color: '#94a3b8' }} />
                          )}
                        </Box>
                        <Box>
                          <Typography fontWeight={700} color="#0f172a">
                            {deal.title}
                          </Typography>
                          <Typography variant="caption" color="#64748b">
                            ID: {deal.id}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={deal.price_tag}
                        sx={{
                          bgcolor: accent.bg,
                          color: accent.text,
                          fontWeight: 700,
                          fontSize: 13
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight={600} color="#334155">
                        {deal.max_price ? `≤ ₹${deal.max_price}` : 'All (No Cap)'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} color="#1e293b">
                        {deal.subcategoryname || 'Any Subcategory'}
                      </Typography>
                      {deal.maincategoryname && (
                        <Typography variant="caption" color="#64748b">
                          in {deal.maincategoryname}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          size="small"
                          label={`${activeCount} products`}
                          color={activeCount > 0 ? "success" : "warning"}
                          variant={activeCount > 0 ? "filled" : "outlined"}
                          sx={{ fontWeight: 700, fontSize: 12 }}
                        />
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<Inventory2OutlinedIcon />}
                          onClick={() => handleOpenProductsModal(deal)}
                          sx={{ textTransform: 'none', borderRadius: 2, fontSize: 12, px: 1.5, py: 0.3 }}
                        >
                          Manage Products
                        </Button>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={accent.label}
                        sx={{ bgcolor: accent.bg, color: accent.text, fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title={deal.is_active ? 'Visible on storefront' : 'Hidden from storefront'}>
                        <Switch
                          checked={deal.is_active}
                          onChange={() => handleToggleActive(deal)}
                          color="primary"
                        />
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right' }}>
                      <IconButton onClick={() => handleOpenEdit(deal)} color="primary" size="small">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton onClick={() => handleDelete(deal)} color="error" size="small">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      {/* Add / Edit Deal Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => !saving && setDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#0f172a' }}>
          {formData.id ? 'Edit Budget Bazaar Deal' : 'Add New Budget Bazaar Deal'}
        </DialogTitle>
        <Box component="form" onSubmit={handleSave}>
          <DialogContent dividers sx={{ p: 3 }}>
            <Grid container spacing={3}>
              {/* Left Column: Form Fields */}
              <Grid item xs={12} md={7}>
                <Stack spacing={2.5}>
                  <TextField
                    fullWidth
                    label="Deal Title"
                    placeholder="e.g. Oversized T-Shirts"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    required
                  />

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Price Tag Label"
                        placeholder="e.g. Under ₹499"
                        value={formData.price_tag}
                        onChange={e => setFormData({ ...formData, price_tag: e.target.value })}
                        required
                        helperText="Visible badge on homepage"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Max Price Filter (₹)"
                        placeholder="e.g. 400 or 499"
                        type="number"
                        value={formData.max_price}
                        onChange={e => setFormData({ ...formData, max_price: e.target.value })}
                        helperText="Products ≤ this price show by default (blank = all)"
                      />
                    </Grid>
                  </Grid>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Main Category</InputLabel>
                        <Select
                          value={formData.maincategoryid}
                          label="Main Category"
                          onChange={e => setFormData({ ...formData, maincategoryid: e.target.value, subcategoryid: '' })}
                        >
                          <MenuItem value="">Any Category</MenuItem>
                          {categories.map(c => (
                            <MenuItem key={c.id} value={c.id}>
                              {c.maincategoryname}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Sub Category</InputLabel>
                        <Select
                          value={formData.subcategoryid}
                          label="Sub Category"
                          onChange={e => setFormData({ ...formData, subcategoryid: e.target.value })}
                        >
                          <MenuItem value="">Any Subcategory</MenuItem>
                          {filteredSubcategories.map(s => (
                            <MenuItem key={s.id} value={s.id}>
                              {s.subcategoryname}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Accent Color</InputLabel>
                        <Select
                          value={formData.tier_color}
                          label="Accent Color"
                          onChange={e => setFormData({ ...formData, tier_color: e.target.value })}
                        >
                          {TIER_COLORS.map(c => (
                            <MenuItem key={c.value} value={c.value}>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: c.text }} />
                                <span>{c.label}</span>
                              </Stack>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Display Order"
                        type="number"
                        value={formData.order_index}
                        onChange={e => setFormData({ ...formData, order_index: parseInt(e.target.value, 10) || 0 })}
                        helperText="Lower numbers appear first"
                      />
                    </Grid>
                  </Grid>

                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Switch
                      checked={formData.is_active}
                      onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                    <Typography fontWeight={600}>
                      {formData.is_active ? 'Deal is Active on Storefront' : 'Deal is Hidden (Draft)'}
                    </Typography>
                  </Stack>
                </Stack>
              </Grid>

              {/* Right Column: Image & Live Preview */}
              <Grid item xs={12} md={5}>
                <Card variant="outlined" sx={{ p: 2, borderRadius: 3, bgcolor: '#f8fafc', textAlign: 'center' }}>
                  <Typography variant="overline" color="#64748b" fontWeight={700}>
                    LIVE PREVIEW
                  </Typography>

                  {/* Card mockup */}
                  <Box
                    sx={{
                      maxWidth: 180,
                      mx: 'auto',
                      my: 2,
                      p: 2,
                      bgcolor: '#ffffff',
                      borderRadius: 3,
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                    }}
                  >
                    <Box
                      sx={{
                        width: 100,
                        height: 100,
                        mx: 'auto',
                        mb: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden'
                      }}
                    >
                      {formData.iconPreview ? (
                        <img
                          src={formData.iconPreview}
                          alt="preview"
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      ) : (
                        <LocalOfferIcon sx={{ fontSize: 48, color: '#cbd5e1' }} />
                      )}
                    </Box>

                    <Chip
                      size="small"
                      label={formData.price_tag || 'From ₹199'}
                      sx={{
                        bgcolor: TIER_COLORS.find(c => c.value === formData.tier_color)?.bg || '#eff6ff',
                        color: TIER_COLORS.find(c => c.value === formData.tier_color)?.text || '#2563eb',
                        fontWeight: 700,
                        fontSize: 12,
                        mb: 1
                      }}
                    />

                    <Typography variant="body2" fontWeight={700} color="#0f172a" noWrap>
                      {formData.title || 'Deal Title'}
                    </Typography>
                  </Box>

                  <Button
                    variant="outlined"
                    component="label"
                    size="small"
                    sx={{ borderRadius: 2 }}
                  >
                    Upload Custom Icon
                    <input type="file" accept="image/*" hidden onChange={handleFileChange} />
                  </Button>
                  <Typography variant="caption" display="block" color="#64748b" sx={{ mt: 1 }}>
                    If empty, the linked subcategory icon is used automatically.
                  </Typography>
                </Card>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button disabled={saving} onClick={() => setDialogOpen(false)} sx={{ borderRadius: 2 }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={saving}
              sx={{ borderRadius: 2, bgcolor: '#22372f', '&:hover': { bgcolor: '#162520' }, px: 3 }}
            >
              {saving ? 'Saving...' : formData.id ? 'Update Deal' : 'Create Deal'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Manage Products Modal (Product Inclusions / Exclusions) */}
      <Dialog
        open={productsModalOpen}
        onClose={() => !savingProducts && setProductsModalOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1, minHeight: '80vh' } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#0f172a', pb: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
            <Box>
              <Typography variant="h6" fontWeight={800}>
                Manage Products: {selectedDealForProducts?.title}
              </Typography>
              <Typography variant="body2" color="#64748b">
                Tag: {selectedDealForProducts?.price_tag} | Price Rule:{' '}
                {selectedDealForProducts?.max_price ? `≤ ₹${selectedDealForProducts.max_price}` : 'All Catalog Items'}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Chip
                label={`${visibleCount} Visible in Deal`}
                color="success"
                sx={{ fontWeight: 700 }}
              />
              <Chip
                label={`${hiddenCount} Excluded`}
                color="default"
                sx={{ fontWeight: 700 }}
              />
            </Stack>
          </Stack>
        </DialogTitle>

        <DialogContent dividers sx={{ p: { xs: 1.5, md: 3 } }}>
          <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2 }}>
            {selectedDealForProducts?.max_price ? (
              <span>
                <strong>Default Price Rule:</strong> All products with effective selling price ≤ ₹
                {selectedDealForProducts.max_price} (e.g. items at ₹399 for under ₹400) are{' '}
                <strong>visible by default</strong>. Products above this price are hidden by default. Use the switches below to customize which products are shown or hidden.
              </span>
            ) : (
              <span>
                <strong>Default Price Rule:</strong> By default, all products in this category/catalog are{' '}
                <strong>visible</strong>. You can turn off any product below to hide it from this deal.
              </span>
            )}
          </Alert>

          {/* Search, Filter & Quick Actions */}
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            justifyContent="space-between"
            alignItems={{ xs: 'stretch', md: 'center' }}
            sx={{ mb: 2.5 }}
          >
            <TextField
              size="small"
              placeholder="Search products by name, brand, subcategory..."
              value={productSearch}
              onChange={e => setProductSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: '#94a3b8' }} />
                  </InputAdornment>
                )
              }}
              sx={{ minWidth: 320 }}
            />

            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<RestartAltIcon />}
                onClick={handleResetToPriceDefault}
                sx={{ borderRadius: 2, textTransform: 'none' }}
              >
                Reset to Price Default
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<CheckCircleOutlineIcon />}
                onClick={handleSelectAllFiltered}
                sx={{ borderRadius: 2, textTransform: 'none' }}
              >
                Select Filtered
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="secondary"
                startIcon={<HighlightOffIcon />}
                onClick={handleDeselectAllFiltered}
                sx={{ borderRadius: 2, textTransform: 'none' }}
              >
                Deselect Filtered
              </Button>
            </Stack>
          </Stack>

          {/* Filter Tabs */}
          <Tabs
            value={productFilterTab}
            onChange={(e, val) => setProductFilterTab(val)}
            sx={{ mb: 2, borderBottom: '1px solid #e2e8f0' }}
          >
            <Tab label={`All Products (${dealProducts.length})`} value="all" sx={{ textTransform: 'none', fontWeight: 600 }} />
            <Tab label={`Visible in Deal (${visibleCount})`} value="visible" sx={{ textTransform: 'none', fontWeight: 600 }} />
            <Tab label={`Hidden / Excluded (${hiddenCount})`} value="hidden" sx={{ textTransform: 'none', fontWeight: 600 }} />
            <Tab label={`Eligible by Price (${eligibleCount})`} value="eligible" sx={{ textTransform: 'none', fontWeight: 600 }} />
          </Tabs>

          {/* Product Items Table */}
          {dealProductsLoading ? (
            <DoordrapeLoader variant="admin" text="Loading products for deal..." role="status" />
          ) : displayedDealProducts.length === 0 ? (
            <Box sx={{ textAlign: 'center', p: 4, color: '#64748b' }}>
              <Typography variant="body1">No products match your search or filter.</Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, maxHeight: 420 }}>
              <Table stickyHeader size="small">
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, width: 80 }}>Image</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Product Title & Brand</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Effective Price</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Price Match</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>Show in Deal?</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayedDealProducts.map((p) => {
                    const maxP = selectedDealForProducts?.max_price;
                    const isPriceEligible = !maxP || p.effective_price <= maxP;

                    return (
                      <TableRow key={p.id} hover sx={{ bgcolor: p.is_visible ? 'inherit' : 'rgba(241, 245, 249, 0.4)' }}>
                        <TableCell>
                          <Box sx={{ width: 44, height: 44, borderRadius: 1.5, overflow: 'hidden', bgcolor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <img
                              src={imageUrl(p.icon)}
                              alt={p.productname}
                              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                              onError={e => { e.currentTarget.src = '/images/product-placeholder.svg'; }}
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={700} color="#0f172a">
                            {p.productname}
                          </Typography>
                          <Typography variant="caption" color="#64748b">
                            {p.brandname || 'SevenShades'} (ID: {p.id})
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" display="block" color="#334155" fontWeight={600}>
                            {p.subcategoryname || 'General'}
                          </Typography>
                          <Typography variant="caption" color="#94a3b8">
                            {p.maincategoryname}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="baseline">
                            <Typography variant="body2" fontWeight={800} color="#0f172a">
                              ₹{p.effective_price}
                            </Typography>
                            {p.min_offerprice > 0 && p.min_offerprice < p.min_price && (
                              <Typography variant="caption" sx={{ textDecoration: 'line-through', color: '#94a3b8' }}>
                                ₹{p.min_price}
                              </Typography>
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          {isPriceEligible ? (
                            <Chip
                              size="small"
                              label={`≤ ₹${maxP || p.effective_price} (Eligible)`}
                              color="success"
                              variant="outlined"
                              sx={{ fontWeight: 700, fontSize: 11 }}
                            />
                          ) : (
                            <Chip
                              size="small"
                              label={`₹${p.effective_price} (> ₹${maxP})`}
                              color="warning"
                              variant="outlined"
                              sx={{ fontWeight: 600, fontSize: 11 }}
                            />
                          )}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'right' }}>
                          <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                            <Typography variant="caption" fontWeight={700} color={p.is_visible ? '#16a34a' : '#94a3b8'}>
                              {p.is_visible ? 'Visible' : 'Hidden'}
                            </Typography>
                            <Switch
                              checked={p.is_visible}
                              onChange={() => handleToggleProduct(p.id)}
                              color="success"
                              size="small"
                            />
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2.5, justifyContent: 'space-between' }}>
          <Typography variant="body2" color="#64748b">
            Showing {displayedDealProducts.length} of {dealProducts.length} catalog items ({visibleCount} active in this deal)
          </Typography>
          <Stack direction="row" spacing={1.5}>
            <Button
              disabled={savingProducts}
              onClick={() => setProductsModalOpen(false)}
              sx={{ borderRadius: 2 }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              disabled={savingProducts || dealProductsLoading}
              onClick={handleSaveProducts}
              sx={{ borderRadius: 2, bgcolor: '#22372f', '&:hover': { bgcolor: '#162520' }, px: 3 }}
            >
              {savingProducts ? 'Saving Selection...' : 'Save Product Selection'}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
