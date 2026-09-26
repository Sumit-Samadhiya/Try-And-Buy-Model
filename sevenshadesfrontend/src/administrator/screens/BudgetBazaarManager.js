import React, { useState, useEffect, useCallback } from 'react';
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
  CircularProgress,
  Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
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
      max_price: deal.max_price !== null ? String(deal.max_price) : '',
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

  // Filter subcategories by selected maincategory
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
            Configure and curate value deals shown on the homepage 3-tier grid (prices, categories, images & color accents).
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
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
            <CircularProgress size={36} />
          </Box>
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
                <TableCell sx={{ fontWeight: 700 }}>Accent</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Live on Store</TableCell>
                <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {deals.map((deal) => {
                const accent = TIER_COLORS.find(c => c.value === deal.tier_color) || TIER_COLORS[0];
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
                        {deal.max_price ? `₹${deal.max_price}` : 'Auto / None'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} color="#1e293b">
                        {deal.subcategoryname || 'Any'}
                      </Typography>
                      {deal.maincategoryname && (
                        <Typography variant="caption" color="#64748b">
                          in {deal.maincategoryname}
                        </Typography>
                      )}
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

      {/* Add / Edit Dialog */}
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
          <DialogContent dividers>
            <Grid container spacing={3}>
              {/* Left Column: Form Fields */}
              <Grid item xs={12} md={7}>
                <Stack spacing={2.5}>
                  <TextField
                    fullWidth
                    label="Deal Title"
                    required
                    placeholder="e.g. Oversized T-Shirts, Casual Tops"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                  />

                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Price Tag Display"
                        required
                        placeholder="e.g. Under ₹499"
                        value={formData.price_tag}
                        onChange={e => setFormData({ ...formData, price_tag: e.target.value })}
                        helperText="Visible on the pill badge"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Max Price Filter (₹)"
                        type="number"
                        placeholder="e.g. 499"
                        value={formData.max_price}
                        onChange={e => setFormData({ ...formData, max_price: e.target.value })}
                        helperText="Filters catalog on click"
                      />
                    </Grid>
                  </Grid>

                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <FormControl fullWidth>
                        <InputLabel>Main Category</InputLabel>
                        <Select
                          label="Main Category"
                          value={formData.maincategoryid}
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
                    <Grid item xs={6}>
                      <FormControl fullWidth>
                        <InputLabel>Sub Category</InputLabel>
                        <Select
                          label="Sub Category"
                          value={formData.subcategoryid}
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
                    <Grid item xs={6}>
                      <FormControl fullWidth>
                        <InputLabel>Accent Color</InputLabel>
                        <Select
                          label="Accent Color"
                          value={formData.tier_color}
                          onChange={e => setFormData({ ...formData, tier_color: e.target.value })}
                        >
                          {TIER_COLORS.map(c => (
                            <MenuItem key={c.value} value={c.value}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: c.text }} />
                                {c.label}
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={6}>
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
    </Box>
  );
}
