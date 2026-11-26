import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { getData, postData, serverURL } from '../../services/FetchDjangoApiServices';
import imageUrl from '../../services/imageUrl';

const QUICK_SIZES = ['Free Size', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
const STORAGE_KEY = 'doordrape_quick_intake_defaults';

const idOf = value => String(value?.id ?? value ?? '');

const escapeHtml = text =>
  String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

export default function ShopkeeperIntakePanel({ catalog, onCatalogChanged }) {
  const [shopkeepers, setShopkeepers] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Remember last shopkeeper & taxonomy selections for rapid multi-piece field capture.
  const savedDefaults = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
      return {};
    }
  }, []);

  const [shopkeeperId, setShopkeeperId] = useState(savedDefaults.shopkeeperId || '');
  const [maincategoryid, setMaincategoryid] = useState(savedDefaults.maincategoryid || '');
  const [subcategoryid, setSubcategoryid] = useState(savedDefaults.subcategoryid || '');
  const [brandid, setBrandid] = useState(savedDefaults.brandid || '');
  const [costPrice, setCostPrice] = useState('');
  const [markupAmount, setMarkupAmount] = useState('150');
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('');
  const [sizeRows, setSizeRows] = useState([{ size: 'M', qty: '1' }, { size: 'L', qty: '1' }]);
  const [customSize, setCustomSize] = useState('');
  const [files, setFiles] = useState([]);
  const [fileKey, setFileKey] = useState(0);
  const [polishingIndex, setPolishingIndex] = useState(null);

  // Staging filters, bulk selection & dialogs
  const [filterShopkeeper, setFilterShopkeeper] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [selectedIds, setSelectedIds] = useState([]);
  const [shopDialogOpen, setShopDialogOpen] = useState(false);
  const [newShop, setNewShop] = useState({ shop_name: '', owner_name: '', phone: '', address: '', default_markup: '150' });
  const [editingItem, setEditingItem] = useState(null);
  const [editSizes, setEditSizes] = useState([]);

  const previews = useMemo(() => files.map(f => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach(u => URL.revokeObjectURL(u)), [previews]);

  const subs = useMemo(
    () => (catalog?.subcategories || []).filter(s => idOf(s.maincategoryid) === String(maincategoryid)),
    [catalog, maincategoryid]
  );

  const selectedShop = useMemo(
    () => shopkeepers.find(s => String(s.id) === String(shopkeeperId)) || null,
    [shopkeepers, shopkeeperId]
  );

  const loadIntake = async () => {
    setLoading(true);
    setError('');
    const [shopRes, listRes] = await Promise.all([getData('shopkeeper_list'), getData('intake_list')]);
    setLoading(false);
    if (!shopRes?.status) {
      setError(shopRes?.message || 'Unable to load shopkeepers.');
      return;
    }
    if (!listRes?.status) {
      setError(listRes?.message || 'Unable to load staging items.');
      return;
    }
    const loadedShops = shopRes.data || [];
    setShopkeepers(loadedShops);
    setItems(listRes.data || []);
    if (!shopkeeperId && loadedShops.length === 1) {
      setShopkeeperId(String(loadedShops[0].id));
      setMarkupAmount(String(loadedShops[0].default_markup ?? 150));
    }
  };

  useEffect(() => {
    loadIntake();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ shopkeeperId, maincategoryid, subcategoryid, brandid })
      );
    } catch {
      // Ignore storage quota issues.
    }
  }, [shopkeeperId, maincategoryid, subcategoryid, brandid]);

  // Default brand to first available if unset so field entry is faster.
  useEffect(() => {
    if (!brandid && catalog?.brands?.length) {
      setBrandid(String(catalog.brands[0].id));
    }
  }, [catalog, brandid]);

  const handleShopkeeperChange = value => {
    setShopkeeperId(value);
    const match = shopkeepers.find(s => String(s.id) === String(value));
    if (match) setMarkupAmount(String(match.default_markup ?? 150));
  };

  const toggleSize = label => {
    setSizeRows(prev => {
      const exists = prev.some(r => r.size.toLowerCase() === label.toLowerCase());
      if (exists) return prev.filter(r => r.size.toLowerCase() !== label.toLowerCase());
      return [...prev, { size: label, qty: '1' }];
    });
  };

  const addCustomSize = () => {
    const clean = customSize.trim();
    if (!clean) return;
    if (!sizeRows.some(r => r.size.toLowerCase() === clean.toLowerCase())) {
      setSizeRows(prev => [...prev, { size: clean, qty: '1' }]);
    }
    setCustomSize('');
  };

  const appendFiles = fileList => {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;
    setFiles(prev => [...prev, ...incoming].slice(0, 10));
    setFileKey(k => k + 1);
  };

  const removeFileAt = idx => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const makeStudioPhoto = async idx => {
    const target = files[idx];
    if (!target || busy || polishingIndex !== null) return;
    setPolishingIndex(idx);
    setError('');
    setSuccess('');
    const body = new FormData();
    body.append('icon', target);
    if (maincategoryid) body.append('maincategoryid', maincategoryid);
    if (subcategoryid) body.append('subcategoryid', subcategoryid);
    const res = await postData('intake_studio_photo', body);
    setPolishingIndex(null);
    if (res?.status && res.data?.data_url) {
      const blob = await (await fetch(res.data.data_url)).blob();
      const ext = res.data.mime_type === 'image/png' ? 'png' : 'jpg';
      const baseName = target.name.replace(/\.[^.]+$/, '') || 'studio';
      const enhancedFile = new File([blob], `${baseName}_studio.${ext}`, { type: res.data.mime_type || 'image/jpeg' });
      setFiles(prev => prev.map((f, i) => (i === idx ? enhancedFile : f)));
      setSuccess(res.data.notice || 'Studio photo ready.');
    } else {
      setError(res?.message || 'Could not enhance photo.');
    }
  };

  const runAiPreview = async () => {
    if (!files.length) {
      setError('First select or capture a garment photo.');
      return;
    }
    setAnalyzing(true);
    setError('');
    const body = new FormData();
    body.append('icon', files[0]);
    if (maincategoryid) body.append('maincategoryid', maincategoryid);
    if (subcategoryid) body.append('subcategoryid', subcategoryid);
    if (brandid) body.append('brandid', brandid);
    if (color.trim()) body.append('color', color.trim());

    const res = await postData('intake_analyze', body);
    setAnalyzing(false);
    if (res?.status && res.data) {
      setProductName(res.data.product_name || '');
      setDescription(res.data.description || '');
      setColor(res.data.color || '');
      setSuccess(
        res.data.ai_source === 'gemini'
          ? 'Gemini Vision auto-filled product name, description & color.'
          : 'Auto-filled fallback details (edit if needed).'
      );
    } else {
      setError(res?.message || 'Unable to analyze photo.');
    }
  };

  const handleSaveToStaging = async event => {
    event.preventDefault();
    if (busy) return;
    setError('');
    setSuccess('');

    if (!shopkeeperId) {
      setError('Select or add a shopkeeper first.');
      return;
    }
    if (!maincategoryid || !subcategoryid || !brandid) {
      setError('Select Category, Subcategory, and Brand.');
      return;
    }
    if (!files.length) {
      setError('Capture or upload at least one garment photo.');
      return;
    }
    if (!costPrice || Number(costPrice) < 1) {
      setError('Enter the shopkeeper original rate (₹).');
      return;
    }
    if (!sizeRows.length) {
      setError('Select at least one size.');
      return;
    }

    const body = new FormData();
    body.append('shopkeeper_id', shopkeeperId);
    body.append('maincategoryid', maincategoryid);
    body.append('subcategoryid', subcategoryid);
    body.append('brandid', brandid);
    body.append('cost_price', String(Math.round(Number(costPrice))));
    body.append('markup_amount', String(Math.max(0, Math.round(Number(markupAmount || 0)))));
    body.append(
      'sizes_json',
      JSON.stringify(sizeRows.map(r => ({ size: r.size, qty: Math.max(0, parseInt(r.qty || '0', 10) || 0) })))
    );
    if (productName.trim()) body.append('product_name', productName.trim());
    if (description.trim()) body.append('description', description.trim());
    if (color.trim()) body.append('color', color.trim());
    files.forEach(file => body.append('icon', file));

    setBusy(true);
    const res = await postData('intake_submit', body);
    setBusy(false);
    if (res?.status) {
      setSuccess(res.message || 'Saved to staging sheet.');
      setCostPrice('');
      setProductName('');
      setDescription('');
      setColor('');
      setFiles([]);
      setFileKey(k => k + 1);
      loadIntake();
    } else {
      setError(res?.message || 'Could not save to staging.');
    }
  };

  const handleCreateShopkeeper = async event => {
    event.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    const res = await postData('shopkeeper_save', {
      ...newShop,
      default_markup: Number(newShop.default_markup || 150),
    });
    setBusy(false);
    if (res?.status && res.data) {
      setShopkeepers(prev => [...prev, res.data]);
      setShopkeeperId(String(res.data.id));
      setMarkupAmount(String(res.data.default_markup ?? 150));
      setShopDialogOpen(false);
      setNewShop({ shop_name: '', owner_name: '', phone: '', address: '', default_markup: '150' });
      setSuccess(`Added ${res.data.shop_code} — ${res.data.shop_name}`);
    } else {
      setError(res?.message || 'Could not save shopkeeper.');
    }
  };

  const publishIds = async ids => {
    if (!ids.length || busy) return;
    setBusy(true);
    setError('');
    setSuccess('');
    const res = await postData('intake_publish', { ids });
    setBusy(false);
    if (res?.status) {
      setSuccess(res.message || 'Uploaded to website.');
      setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
      await loadIntake();
      if (onCatalogChanged) onCatalogChanged();
    } else {
      setError(res?.message || 'Publish failed.');
    }
  };

  const handleDeleteDraft = async item => {
    if (busy) return;
    setBusy(true);
    const res = await postData('intake_delete', { id: item.id });
    setBusy(false);
    if (res?.status) {
      setSuccess(res.message || 'Draft removed.');
      setSelectedIds(prev => prev.filter(id => id !== item.id));
      loadIntake();
    } else {
      setError(res?.message || 'Unable to delete draft.');
    }
  };

  const saveEditDraft = async () => {
    if (!editingItem || busy) return;
    setBusy(true);
    const res = await postData('intake_update', {
      id: editingItem.id,
      product_name: editingItem.product_name,
      description: editingItem.description,
      color: editingItem.color,
      cost_price: Number(editingItem.cost_price),
      markup_amount: Number(editingItem.markup_amount),
      sizes_json: editSizes.map(r => ({ size: r.size, qty: Math.max(0, parseInt(r.qty || '0', 10) || 0) })),
    });
    setBusy(false);
    if (res?.status) {
      setSuccess(res.message || 'Draft updated.');
      setEditingItem(null);
      loadIntake();
    } else {
      setError(res?.message || 'Could not update draft.');
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter(row => {
      if (filterShopkeeper && String(row.shopkeeper_id) !== String(filterShopkeeper)) return false;
      if (filterStatus !== 'ALL' && row.status !== filterStatus) return false;
      return true;
    });
  }, [items, filterShopkeeper, filterStatus]);

  const draftItems = useMemo(() => filteredItems.filter(i => i.status === 'DRAFT'), [filteredItems]);
  const allDraftsSelected = draftItems.length > 0 && draftItems.every(i => selectedIds.includes(i.id));

  const toggleSelectAll = () => {
    if (allDraftsSelected) setSelectedIds([]);
    else setSelectedIds(draftItems.map(i => i.id));
  };

  const toggleSelectOne = id => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const exportCsv = async () => {
    setError('');
    const params = new URLSearchParams();
    if (filterShopkeeper) params.set('shopkeeper_id', filterShopkeeper);
    if (filterStatus !== 'ALL') params.set('status', filterStatus);
    const token = localStorage.getItem('sevenshades_token');
    try {
      const res = await axios.get(`${serverURL}/api/intake_export_csv?${params.toString()}`, {
        withCredentials: true,
        responseType: 'blob',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const blobUrl = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `shopkeeper_${filterShopkeeper || 'all'}_rate_sheet.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      setError('Could not export CSV.');
    }
  };

  const exportPhotoSheet = async () => {
    setError('');
    const params = new URLSearchParams();
    if (filterShopkeeper) params.set('shopkeeper_id', filterShopkeeper);
    if (filterStatus !== 'ALL') params.set('status', filterStatus);
    const res = await getData(`intake_export_sheet?${params.toString()}`);
    if (!res?.status || !res.data) {
      setError(res?.message || 'Could not generate photo sheet.');
      return;
    }
    const { shopkeeper: s, items: rows, total_items, total_pieces } = res.data;
    const win = window.open('', '_blank', 'width=1024,height=780');
    if (!win) {
      setError('Please allow pop-ups to open the printable Photo Sheet.');
      return;
    }
    const headerTitle = s ? `${escapeHtml(s.shop_code)} — ${escapeHtml(s.shop_name)}` : 'All Partner Shopkeepers';
    const bodyRows = rows
      .map(
        r => `
        <tr>
          <td><img src="${escapeHtml(imageUrl(r.photo_list?.[0] || ''))}" alt="" style="width:68px;height:82px;object-fit:cover;border-radius:8px;border:1px solid #cbd5e1;" /></td>
          <td><strong>${escapeHtml(r.unique_code)}</strong><br/><small>${escapeHtml(r.shop_code)}</small></td>
          <td><strong>${escapeHtml(r.product_name)}</strong><br/><small>${escapeHtml(r.color)} · ${escapeHtml(r.maincategoryname)} / ${escapeHtml(r.subcategoryname)}</small></td>
          <td>${(r.sizes_json || []).map(sz => `${escapeHtml(sz.size)}: ${escapeHtml(sz.qty)}`).join(', ')}</td>
          <td style="font-size:16px;font-weight:700;color:#064e3b;">₹${escapeHtml(r.cost_price)}</td>
          <td>${escapeHtml(r.status)}</td>
        </tr>`
      )
      .join('');

    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Shopkeeper Photo Rate Sheet</title>
      <style>
        body{font-family:system-ui,-apple-system,sans-serif;padding:24px;color:#0f172a}
        h1{margin:0 0 6px;font-size:22px} p{margin:0 0 16px;color:#475569}
        table{width:100%;border-collapse:collapse}
        th,td{border:1px solid #e2e8f0;padding:10px;text-align:left;vertical-align:middle}
        th{background:#f1f5f9;font-size:13px}
        .bar{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
        @media print{.noprint{display:none}}
      </style></head><body>
      <div class="bar">
        <div><h1>DoorDrape — Shopkeeper Rate &amp; Photo Sheet</h1>
        <p>${headerTitle} · Items: ${total_items} · Total Pieces: ${total_pieces} (Original Shopkeeper Rates Only)</p></div>
        <button class="noprint" onclick="window.print()" style="padding:10px 18px;background:#064e3b;color:#fff;border:0;border-radius:8px;font-weight:700;cursor:pointer">Print / Save PDF</button>
      </div>
      <table><thead><tr><th>Photo</th><th>Unique Code</th><th>Item</th><th>Sizes &amp; Qty</th><th>Original Rate</th><th>Status</th></tr></thead>
      <tbody>${bodyRows || '<tr><td colspan="6">No items found.</td></tr>'}</tbody></table></body></html>`);
    win.document.close();
  };

  const liveWebsitePrice =
    costPrice && Number(costPrice) > 0
      ? Math.round(Number(costPrice)) + Math.max(0, Math.round(Number(markupAmount || 0)))
      : null;

  return (
    <Stack spacing={3}>
      {loading && <LinearProgress />}
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess('')}>{success}</Alert>}

      {/* QUICK CAPTURE CARD */}
      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
        <Box component="form" onSubmit={handleSaveToStaging}>
          <Stack spacing={2.5}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1}>
              <div>
                <Typography variant="h6" fontWeight={800}>
                  Quick Shopkeeper Capture (Staging Only)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Snap garment photo &amp; shopkeeper rate. AI fills name &amp; description automatically; items stay in staging until you click Upload to Website.
                </Typography>
              </div>
              <Button variant="outlined" size="small" onClick={() => setShopDialogOpen(true)}>
                + Add Shopkeeper
              </Button>
            </Stack>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Shopkeeper"
                  value={shopkeeperId}
                  onChange={e => handleShopkeeperChange(e.target.value)}
                >
                  <MenuItem value="">Choose shopkeeper</MenuItem>
                  {shopkeepers.map(s => (
                    <MenuItem key={s.id} value={String(s.id)}>
                      {s.shop_code} — {s.shop_name} (+₹{s.default_markup})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={6} sm={3}>
                <TextField
                  fullWidth
                  type="number"
                  label="Shopkeeper Rate (₹)"
                  value={costPrice}
                  inputProps={{ min: 1, step: 1 }}
                  onChange={e => setCostPrice(e.target.value)}
                />
              </Grid>

              <Grid item xs={6} sm={3}>
                <TextField
                  fullWidth
                  type="number"
                  label="Website Markup (₹)"
                  value={markupAmount}
                  inputProps={{ min: 0, step: 1 }}
                  onChange={e => setMarkupAmount(e.target.value)}
                  helperText={liveWebsitePrice ? `Website Price: ₹${liveWebsitePrice}` : 'Default +₹150'}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  select
                  fullWidth
                  label="Category"
                  value={maincategoryid}
                  onChange={e => {
                    setMaincategoryid(e.target.value);
                    setSubcategoryid('');
                  }}
                >
                  <MenuItem value="">Choose category</MenuItem>
                  {(catalog?.categories || []).map(c => (
                    <MenuItem key={c.id} value={String(c.id)}>{c.maincategoryname}</MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  select
                  fullWidth
                  label="Subcategory"
                  value={subcategoryid}
                  disabled={!maincategoryid}
                  onChange={e => setSubcategoryid(e.target.value)}
                >
                  <MenuItem value="">Choose subcategory</MenuItem>
                  {subs.map(s => (
                    <MenuItem key={s.id} value={String(s.id)}>{s.subcategoryname}</MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  select
                  fullWidth
                  label="Brand"
                  value={brandid}
                  onChange={e => setBrandid(e.target.value)}
                >
                  <MenuItem value="">Choose brand</MenuItem>
                  {(catalog?.brands || []).map(b => (
                    <MenuItem key={b.id} value={String(b.id)}>{b.brandname}</MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>

            {/* Photo capture + Gallery + Delete + AI Auto-name / Studio */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#f8fafc' }}>
              <Stack spacing={1.5}>
                <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} alignItems={{ sm: 'center' }} justifyContent="space-between">
                  <div>
                    <Typography variant="subtitle2" fontWeight={700}>Garment Photo(s) ({files.length}/10)</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Use Take Photo for camera, Choose from Gallery for saved photos, tap ✕ to delete, or 🪄 Studio to polish
                    </Typography>
                  </div>
                  <Stack direction="row" gap={1} flexWrap="wrap">
                    <Button variant="outlined" component="label" disabled={busy || files.length >= 10}>
                      📷 Take Photo
                      <input
                        key={`cam-${fileKey}`}
                        hidden
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={e => appendFiles(e.target.files)}
                      />
                    </Button>
                    <Button variant="outlined" component="label" disabled={busy || files.length >= 10}>
                      🖼️ Choose from Gallery
                      <input
                        key={`gal-${fileKey}`}
                        hidden
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,.avif"
                        multiple
                        onChange={e => appendFiles(e.target.files)}
                      />
                    </Button>
                    <Button
                      variant="outlined"
                      color="secondary"
                      disabled={busy || analyzing || !files.length}
                      onClick={runAiPreview}
                    >
                      {analyzing ? 'Analyzing…' : '✨ Auto-Name from Photo'}
                    </Button>
                  </Stack>
                </Stack>

                {previews.length > 0 && (
                  <Stack direction="row" gap={1.5} flexWrap="wrap">
                    {previews.map((url, idx) => (
                      <Box key={url + idx} sx={{ position: 'relative', width: 92 }}>
                        <Box
                          component="img"
                          src={url}
                          alt={`Capture ${idx + 1}`}
                          sx={{ width: 92, height: 112, objectFit: 'cover', borderRadius: 1.5, border: '1px solid #cbd5e1', display: 'block' }}
                        />
                        <IconButton
                          size="small"
                          aria-label={`Remove photo ${idx + 1}`}
                          onClick={() => removeFileAt(idx)}
                          disabled={busy || polishingIndex !== null}
                          sx={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            bgcolor: 'rgba(15, 23, 42, 0.8)',
                            color: '#fff',
                            width: 24,
                            height: 24,
                            fontSize: 13,
                            '&:hover': { bgcolor: '#dc2626' },
                          }}
                        >
                          ✕
                        </IconButton>
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => makeStudioPhoto(idx)}
                          disabled={busy || polishingIndex !== null}
                          sx={{ mt: 0.5, width: '100%', fontSize: 11, py: 0.25, px: 0.5 }}
                        >
                          {polishingIndex === idx ? 'Polishing…' : '🪄 Studio'}
                        </Button>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Stack>
            </Paper>

            {/* Size Chips + Qty */}
            <Box>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>
                Available Sizes &amp; Qty
              </Typography>
              <Stack direction="row" gap={1} flexWrap="wrap" mb={1.5}>
                {QUICK_SIZES.map(sz => {
                  const active = sizeRows.some(r => r.size.toLowerCase() === sz.toLowerCase());
                  return (
                    <Chip
                      key={sz}
                      label={sz}
                      color={active ? 'primary' : 'default'}
                      variant={active ? 'filled' : 'outlined'}
                      onClick={() => toggleSize(sz)}
                      sx={{ fontWeight: 700 }}
                    />
                  );
                })}
              </Stack>
              <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
                {sizeRows.map(r => (
                  <Stack key={r.size} direction="row" alignItems="center" gap={0.5} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, px: 1, py: 0.5 }}>
                    <Typography variant="body2" fontWeight={700}>{r.size}</Typography>
                    <TextField
                      size="small"
                      type="number"
                      value={r.qty}
                      inputProps={{ min: 0, step: 1, 'aria-label': `Qty ${r.size}` }}
                      onChange={e => setSizeRows(prev => prev.map(x => x.size === r.size ? { ...x, qty: e.target.value } : x))}
                      sx={{ width: 72 }}
                    />
                    <IconButton size="small" onClick={() => toggleSize(r.size)} aria-label={`Remove ${r.size}`}>✕</IconButton>
                  </Stack>
                ))}
                <TextField
                  size="small"
                  label="Custom size"
                  value={customSize}
                  onChange={e => setCustomSize(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomSize(); } }}
                  sx={{ width: 130 }}
                />
                <Button size="small" variant="outlined" onClick={addCustomSize} disabled={!customSize.trim()}>+ Size</Button>
              </Stack>
            </Box>

            {/* Optional Auto-Filled Overrides */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  label="Product Name (Auto if blank)"
                  value={productName}
                  inputProps={{ maxLength: 70 }}
                  onChange={e => setProductName(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Color (Auto if blank)"
                  value={color}
                  inputProps={{ maxLength: 70 }}
                  onChange={e => setColor(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={5}>
                <TextField
                  fullWidth
                  size="small"
                  label="Description (Auto if blank)"
                  value={description}
                  inputProps={{ maxLength: 150 }}
                  onChange={e => setDescription(e.target.value)}
                />
              </Grid>
            </Grid>

            <Stack direction="row" gap={1.5} alignItems="center" flexWrap="wrap">
              <Button type="submit" variant="contained" disabled={busy}>
                {busy ? 'Saving…' : '💾 Save to Staging'}
              </Button>
              {selectedShop && liveWebsitePrice && (
                <Chip
                  color="success"
                  variant="outlined"
                  label={`${selectedShop.shop_code}: Shop ₹${costPrice} → Website ₹${liveWebsitePrice}`}
                />
              )}
            </Stack>
          </Stack>
        </Box>
      </Paper>

      {/* STAGING PREVIEW & EXPORT TABLE */}
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2} alignItems={{ md: 'center' }}>
            <div>
              <Typography variant="h6" fontWeight={800}>
                Staging Preview Sheet ({filteredItems.length})
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Export sheets share ONLY Original Shopkeeper Rate. Website upload adds +₹150 (or custom markup).
              </Typography>
            </div>
            <Stack direction="row" gap={1} flexWrap="wrap">
              <Button variant="outlined" size="small" onClick={exportCsv} disabled={!filteredItems.length}>
                📥 Export CSV (Shopkeeper Rate)
              </Button>
              <Button variant="outlined" size="small" onClick={exportPhotoSheet} disabled={!filteredItems.length}>
                🖼️ Photo Sheet (Print / PDF)
              </Button>
              <Button
                variant="contained"
                size="small"
                disabled={busy || !selectedIds.length}
                onClick={() => publishIds(selectedIds)}
              >
                Upload Selected ({selectedIds.length})
              </Button>
              <Button
                variant="contained"
                color="success"
                size="small"
                disabled={busy || !draftItems.length}
                onClick={() => publishIds(draftItems.map(i => i.id))}
              >
                ⚡ Upload All Drafts ({draftItems.length})
              </Button>
            </Stack>
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
            <TextField
              select
              size="small"
              label="Filter Shopkeeper"
              value={filterShopkeeper}
              onChange={e => setFilterShopkeeper(e.target.value)}
              sx={{ minWidth: 220 }}
            >
              <MenuItem value="">All shopkeepers</MenuItem>
              {shopkeepers.map(s => (
                <MenuItem key={s.id} value={String(s.id)}>{s.shop_code} — {s.shop_name}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Status"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="ALL">All</MenuItem>
              <MenuItem value="DRAFT">Draft Only</MenuItem>
              <MenuItem value="PUBLISHED">Published Only</MenuItem>
            </TextField>
          </Stack>

          <Divider />

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox checked={allDraftsSelected} onChange={toggleSelectAll} disabled={!draftItems.length} />
                  </TableCell>
                  <TableCell>Item &amp; Unique Code</TableCell>
                  <TableCell>Shopkeeper</TableCell>
                  <TableCell>Sizes &amp; Qty</TableCell>
                  <TableCell>Shop Rate</TableCell>
                  <TableCell>Website Price</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredItems.map(row => {
                  const isDraft = row.status === 'DRAFT';
                  return (
                    <TableRow key={row.id}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedIds.includes(row.id)}
                          disabled={!isDraft}
                          onChange={() => toggleSelectOne(row.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" gap={1.5} alignItems="center">
                          <Box
                            component="img"
                            src={imageUrl(row.photo_list?.[0] || '')}
                            alt=""
                            sx={{ width: 48, height: 60, objectFit: 'cover', borderRadius: 1 }}
                          />
                          <Box>
                            <Typography fontWeight={800} variant="body2">{row.unique_code}</Typography>
                            <Typography fontWeight={700} variant="body2">{row.product_name}</Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                              {row.color} · {row.maincategoryname} / {row.subcategoryname} ({row.ai_source})
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>{row.shop_code}</Typography>
                        <Typography variant="caption" color="text.secondary">{row.shop_name}</Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" gap={0.5} flexWrap="wrap">
                          {(row.sizes_json || []).map(s => (
                            <Chip key={s.size} size="small" label={`${s.size}: ${s.qty}`} />
                          ))}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight={800} color="primary.main">₹{row.cost_price}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight={700}>₹{row.website_price}</Typography>
                        <Typography variant="caption" color="text.secondary">+₹{row.markup_amount}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={row.status}
                          color={isDraft ? 'warning' : 'success'}
                        />
                      </TableCell>
                      <TableCell>
                        {isDraft ? (
                          <Stack direction="row" gap={0.5} flexWrap="wrap">
                            <Button size="small" variant="contained" disabled={busy} onClick={() => publishIds([row.id])}>
                              Upload to Website
                            </Button>
                            <Button
                              size="small"
                              onClick={() => {
                                setEditingItem({ ...row });
                                setEditSizes((row.sizes_json || []).map(s => ({ ...s, qty: String(s.qty) })));
                              }}
                            >
                              Edit
                            </Button>
                            <Button size="small" color="error" onClick={() => handleDeleteDraft(row)}>
                              Delete
                            </Button>
                          </Stack>
                        ) : (
                          <Typography variant="caption" color="success.main" fontWeight={700}>
                            Live (#{row.published_product_id})
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!filteredItems.length && (
                  <TableRow>
                    <TableCell colSpan={8}>No staging items yet. Capture a garment above to start.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      </Paper>

      {/* ADD SHOPKEEPER DIALOG */}
      <Dialog open={shopDialogOpen} onClose={() => !busy && setShopDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Partner Shopkeeper</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleCreateShopkeeper} sx={{ pt: 1 }}>
            <Stack spacing={2}>
              <TextField
                required
                label="Shop Name"
                value={newShop.shop_name}
                onChange={e => setNewShop(p => ({ ...p, shop_name: e.target.value }))}
              />
              <TextField
                label="Owner Name"
                value={newShop.owner_name}
                onChange={e => setNewShop(p => ({ ...p, owner_name: e.target.value }))}
              />
              <TextField
                label="Phone"
                value={newShop.phone}
                onChange={e => setNewShop(p => ({ ...p, phone: e.target.value }))}
              />
              <TextField
                label="Address"
                value={newShop.address}
                onChange={e => setNewShop(p => ({ ...p, address: e.target.value }))}
              />
              <TextField
                type="number"
                label="Default Website Markup (₹)"
                value={newShop.default_markup}
                inputProps={{ min: 0, step: 1 }}
                onChange={e => setNewShop(p => ({ ...p, default_markup: e.target.value }))}
              />
              <Stack direction="row" gap={1} justifyContent="flex-end">
                <Button onClick={() => setShopDialogOpen(false)} disabled={busy}>Cancel</Button>
                <Button type="submit" variant="contained" disabled={busy || !newShop.shop_name.trim()}>
                  Save Shopkeeper
                </Button>
              </Stack>
            </Stack>
          </Box>
        </DialogContent>
      </Dialog>

      {/* EDIT DRAFT DIALOG */}
      <Dialog open={!!editingItem} onClose={() => !busy && setEditingItem(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Draft {editingItem?.unique_code}</DialogTitle>
        <DialogContent>
          {editingItem && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                label="Product Name"
                value={editingItem.product_name}
                inputProps={{ maxLength: 70 }}
                onChange={e => setEditingItem(p => ({ ...p, product_name: e.target.value }))}
              />
              <TextField
                label="Description"
                multiline
                value={editingItem.description}
                inputProps={{ maxLength: 150 }}
                onChange={e => setEditingItem(p => ({ ...p, description: e.target.value }))}
              />
              <TextField
                label="Color"
                value={editingItem.color}
                inputProps={{ maxLength: 70 }}
                onChange={e => setEditingItem(p => ({ ...p, color: e.target.value }))}
              />
              <Stack direction="row" gap={2}>
                <TextField
                  type="number"
                  label="Shopkeeper Rate (₹)"
                  value={editingItem.cost_price}
                  onChange={e => setEditingItem(p => ({ ...p, cost_price: e.target.value }))}
                />
                <TextField
                  type="number"
                  label="Markup (₹)"
                  value={editingItem.markup_amount}
                  onChange={e => setEditingItem(p => ({ ...p, markup_amount: e.target.value }))}
                />
              </Stack>
              <Typography variant="subtitle2" fontWeight={700}>Sizes &amp; Qty</Typography>
              <Stack direction="row" gap={1} flexWrap="wrap">
                {editSizes.map(s => (
                  <Stack key={s.size} direction="row" alignItems="center" gap={0.5}>
                    <Chip size="small" label={s.size} />
                    <TextField
                      size="small"
                      type="number"
                      value={s.qty}
                      onChange={e => setEditSizes(prev => prev.map(x => x.size === s.size ? { ...x, qty: e.target.value } : x))}
                      sx={{ width: 70 }}
                    />
                  </Stack>
                ))}
              </Stack>
              <Stack direction="row" gap={1} justifyContent="flex-end">
                <Button onClick={() => setEditingItem(null)} disabled={busy}>Cancel</Button>
                <Button variant="contained" onClick={saveEditDraft} disabled={busy}>Save Changes</Button>
              </Stack>
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
