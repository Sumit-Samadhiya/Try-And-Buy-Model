import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, ButtonGroup, Chip, Dialog, DialogContent, DialogTitle, Grid, LinearProgress, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { getData, postData } from '../../services/FetchDjangoApiServices';
import { validateFields } from '../../services/validation';
import imageUrl from '../../services/imageUrl';

const idOf = value => String(value?.id ?? value ?? '');
const blank = {maincategoryid:'',subcategoryid:'',brandid:'',productid:'',productname:'',productsubname:'',description:'',qty:'0',price:'',offerprice:'0',color:'',size:'',offertype:'None'};
const endpoints = variant => variant ? {list:'productdetails_list',create:'productdetails_submit',edit:'editproductdetails_data',image:'editproductdetails_icon',remove:'deleteproductdetails',route:'productdetails',listRoute:'displayproductdetails'} : {list:'product_list',create:'product_submit',edit:'editproduct_data',image:'editproduct_icon',remove:'deleteproductdata',route:'product',listRoute:'displayallproduct'};

function ProductForm({variant, row, parentProduct, catalog, onSaved, onCancel}) {
  const api = endpoints(variant);
  const initial = () => {
    if (row) {
      return { ...blank, ...row, ...Object.fromEntries(['maincategoryid','subcategoryid','brandid','productid'].map(key => [key, idOf(row[key])])) };
    }
    if (parentProduct) {
      return {
        ...blank,
        maincategoryid: idOf(parentProduct.maincategoryid),
        subcategoryid: idOf(parentProduct.subcategoryid),
        brandid: idOf(parentProduct.brandid),
        productid: idOf(parentProduct.id),
      };
    }
    return { ...blank };
  };

  const [values, setValues] = useState(initial), [files, setFiles] = useState([]), [errors, setErrors] = useState({}), [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [fileKey, setFileKey] = useState(0);
  const previews = useMemo(() => files.map(file => URL.createObjectURL(file)), [files]);
  useEffect(() => () => previews.forEach(url => URL.revokeObjectURL(url)), [previews]);

  const subs = (catalog.subcategories || []).filter(item => idOf(item.maincategoryid) === values.maincategoryid);
  const products = (catalog.products || []).filter(item => idOf(item.maincategoryid) === values.maincategoryid && idOf(item.subcategoryid) === values.subcategoryid);

  const update = (key, value) => {
    setErrors(previous => ({ ...previous, [key]: '' }));
    setValues(previous => {
      const next = { ...previous, [key]: value };
      if (key === 'maincategoryid') { next.subcategoryid = ''; if (variant) { next.productid = ''; next.brandid = ''; } }
      if (key === 'subcategoryid' && variant) { next.productid = ''; next.brandid = ''; }
      if (key === 'productid') next.brandid = idOf((catalog.products || []).find(item => idOf(item.id) === value)?.brandid);
      return next;
    });
  };

  const select = (key, label, items, name, disabled = false) => (
    <Grid item xs={12} sm={6}>
      <TextField select fullWidth label={label} value={values[key]} disabled={busy || disabled} error={!!errors[key]} helperText={errors[key]} onChange={event => update(key, event.target.value)}>
        <MenuItem value="">Choose {label.toLowerCase()}</MenuItem>
        {(items || []).map(item => <MenuItem key={item.id} value={String(item.id)}>{item[name]}</MenuItem>)}
      </TextField>
    </Grid>
  );

  const field = (key, label, max = 70, numeric = false) => (
    <Grid item xs={12} sm={key === 'description' ? 12 : 6}>
      <TextField fullWidth label={label} value={values[key]} disabled={busy} error={!!errors[key]} helperText={errors[key] || (key === 'offerprice' ? '0 means no offer' : key === 'qty' ? 'Available stock, excluding items already reserved for orders' : '')} type={numeric ? 'number' : 'text'} inputProps={numeric ? { min: key === 'price' ? 1 : 0, step: 1 } : { maxLength: max }} multiline={key === 'description'} onChange={event => update(key, event.target.value)} />
    </Grid>
  );

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    const keys = ['maincategoryid', 'subcategoryid', 'brandid', 'description', ...(variant ? ['productid', 'productsubname', 'qty', 'price', 'offerprice', 'size', 'color', 'offertype'] : ['productname'])];
    const payload = Object.fromEntries(keys.map(key => [key, typeof values[key] === 'string' ? values[key].trim() : values[key]]));
    if (row) { payload.id = row.id; if (variant) payload.expected_qty = row.qty; }
    let body = payload;
    if (!row) {
      body = new FormData();
      Object.entries(payload).forEach(([key, value]) => body.append(key, value));
      files.forEach(file => body.append('icon', file));
    }
    const endpoint = row ? api.edit : api.create;
    const validation = validateFields(endpoint, body);
    setErrors(validation);
    setMessage('');
    if (Object.keys(validation).length) return;
    setBusy(true);
    const result = await postData(endpoint, body);
    setBusy(false);
    if (result.status) {
      onSaved(result.message);
      if (!row) { setValues({ ...blank }); setFiles([]); setFileKey(key => key + 1); }
    } else {
      setMessage(result.message || 'Could not save. Please retry.');
      setErrors(Object.fromEntries(Object.entries(result.errors || {}).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])));
    }
  };

  const saveImages = async () => {
    if (busy) return;
    const body = new FormData();
    body.append('id', row.id);
    files.forEach(file => body.append('icon', file));
    const validation = validateFields(api.image, body);
    setErrors(validation);
    if (Object.keys(validation).length) return;
    setBusy(true);
    const result = await postData(api.image, body);
    setBusy(false);
    if (result.status) onSaved(result.message);
    else setMessage(result.message || 'Could not update images.');
  };

  return (
    <Box component="form" onSubmit={submit}>
      <Stack spacing={2}>
        {message && <Alert severity="error">{message}</Alert>}
        <Grid container spacing={2}>
          {select('maincategoryid', 'Category', catalog.categories, 'maincategoryname', !!parentProduct)}
          {select('subcategoryid', 'Subcategory', subs, 'subcategoryname', !values.maincategoryid || !!parentProduct)}
          {variant && select('productid', 'Product', products, 'productname', !values.subcategoryid || !!parentProduct)}
          {select('brandid', 'Brand', catalog.brands, 'brandname', variant || !!parentProduct)}
          {field(variant ? 'productsubname' : 'productname', variant ? 'Variant name' : 'Product name')}
          {field('description', 'Description', 150)}
          {variant && (
            <>
              {field('qty', 'Quantity', 70, true)}
              {field('price', 'Regular price', 70, true)}
              {field('offerprice', 'Offer price', 70, true)}
              {field('size', 'Size')}
              {field('color', 'Colour')}
              {field('offertype', 'Offer type')}
            </>
          )}
        </Grid>
        <Typography variant="body2">{row ? 'Replace images (optional)' : 'Product images'} · {variant ? '1–10 images' : '1 image'}, up to 5 MB each</Typography>
        <input key={fileKey} aria-label="Product images" type="file" accept=".jpg,.jpeg,.png,.webp,.avif,.gif" multiple={variant} disabled={busy} onChange={event => { setFiles(Array.from(event.target.files || [])); setErrors(previous => ({ ...previous, icon: '' })); }} />
        {errors.icon && <Alert severity="error">{errors.icon}</Alert>}
        <Stack direction="row" gap={1} flexWrap="wrap">
          {(files.length ? previews : (row?.icon || '').split(',').filter(Boolean).map(imageUrl)).map((url, index) => (
            <Box component="img" key={url + index} src={url} alt={'Product image ' + (index + 1)} sx={{ width: 80, height: 90, objectFit: 'cover', borderRadius: 1 }} />
          ))}
        </Stack>
        <Stack direction="row" gap={1} flexWrap="wrap">
          <Button type="submit" variant="contained" disabled={busy}>{busy ? 'Saving…' : row ? 'Save details' : 'Create ' + (variant ? 'variant' : 'product')}</Button>
          {row && <Button disabled={busy || !files.length} onClick={saveImages}>Replace images</Button>}
          <Button disabled={busy} onClick={() => { setValues(initial()); setFiles([]); setErrors({}); setMessage(''); setFileKey(key => key + 1); }}>Reset</Button>
          {onCancel && <Button disabled={busy} onClick={onCancel}>Close</Button>}
        </Stack>
      </Stack>
    </Box>
  );
}

export default function CatalogWorkspace({variant = false, list = false}) {
  const [catalog, setCatalog] = useState(null);
  const [activeTab, setActiveTab] = useState(variant ? 'variants' : 'products');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(true);
  const [selected, setSelected] = useState(null);
  const [selectedIsVariant, setSelectedIsVariant] = useState(variant);
  const [creatingVariantFor, setCreatingVariantFor] = useState(null);
  const [creatingNew, setCreatingNew] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deletingIsVariant, setDeletingIsVariant] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [filters, setFilters] = useState({q: '', category: '', brand: '', stock: ''});
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);

  const load = async () => {
    setBusy(true);
    setError('');
    const results = await Promise.all([
      getData('maincategory_list'),
      getData('mysubcategory_list'),
      getData('brand_list'),
      getData('product_list'),
      getData('productdetails_list')
    ]);
    setBusy(false);

    const failed = results.find(result => !result || !result.status || !Array.isArray(result.data));
    if (failed) {
      setError(failed?.message || 'Unable to load catalog. Please retry.');
      return;
    }

    setCatalog({
      categories: results[0].data,
      subcategories: results[1].data,
      brands: results[2].data,
      products: results[3].data,
      variants: results[4].data,
    });
  };

  useEffect(() => {
    load();
  }, [variant]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setActiveTab(variant ? 'variants' : 'products');
  }, [variant]);

  const change = (key, value) => {
    setFilters({ ...filters, [key]: value });
    setPage(0);
  };

  const isVariantsTab = activeTab === 'variants';
  const rawRows = catalog ? (isVariantsTab ? catalog.variants : catalog.products) : [];

  const filtered = rawRows.filter(row => {
    if (filters.category && idOf(row.maincategoryid) !== filters.category) return false;
    if (filters.brand && idOf(row.brandid) !== filters.brand) return false;
    if (isVariantsTab && filters.stock) {
      if (filters.stock === 'out' && row.qty !== 0) return false;
      if (filters.stock === 'low' && !(row.qty > 0 && row.qty <= 3)) return false;
    }
    const searchString = [
      row.id,
      row.productname,
      row.productsubname,
      row.productid?.productname,
      row.maincategoryid?.maincategoryname,
      row.subcategoryid?.subcategoryname,
      row.brandid?.brandname,
      row.size,
      row.color
    ].join(' ').toLowerCase();
    return searchString.includes(filters.q.trim().toLowerCase());
  });

  const safePage = Math.min(page, Math.max(0, Math.ceil(filtered.length / size) - 1));

  const saved = message => {
    setSuccess(message || 'Saved successfully.');
    setSelected(null);
    setCreatingVariantFor(null);
    setCreatingNew(null);
    load();
  };

  const remove = async () => {
    if (removing || !deleting) return;
    setRemoving(true);
    const targetApi = endpoints(deletingIsVariant);
    const result = await postData(targetApi.remove, { id: deleting.id });
    setRemoving(false);
    setDeleting(null);
    if (result && result.status) {
      saved(result.message);
    } else {
      setError(result?.message || 'Could not delete this item.');
    }
  };

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} justifyContent="space-between" alignItems={{ sm: 'center' }}>
        <div>
          <Typography variant="h4" fontWeight={800}>
            {list ? 'Products & Variants' : (variant ? 'Add product variant' : 'Add product')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Unified catalog management for products, colors, sizes, and stock
          </Typography>
        </div>
        <Stack direction="row" gap={1} flexWrap="wrap">
          {list && <Button variant="outlined" disabled={busy} onClick={load}>Refresh</Button>}
          {list && (
            <>
              <Button variant="outlined" onClick={() => setCreatingNew('product')}>
                + Add Product
              </Button>
              <Button variant="contained" onClick={() => setCreatingNew('variant')}>
                + Add Variant
              </Button>
            </>
          )}
          {!list && (
            <Button component={Link} to="/admindashboard/displayallproduct">
              View All Products
            </Button>
          )}
        </Stack>
      </Stack>

      {busy && <LinearProgress />}
      {error && <Alert severity="error" action={<Button onClick={load}>Retry</Button>}>{error}</Alert>}
      {success && <Alert onClose={() => setSuccess('')}>{success}</Alert>}

      {catalog && !list && (
        <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
          <ProductForm variant={variant} catalog={catalog} onSaved={saved} />
        </Paper>
      )}

      {catalog && list && (
        <>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} justifyContent="space-between" alignItems={{ sm: 'center' }} sx={{ mb: 2 }}>
              <ButtonGroup size="small">
                <Button
                  variant={activeTab === 'products' ? 'contained' : 'outlined'}
                  onClick={() => { setActiveTab('products'); setPage(0); }}
                  sx={{ fontWeight: 700 }}
                >
                  📦 Products ({catalog.products.length})
                </Button>
                <Button
                  variant={activeTab === 'variants' ? 'contained' : 'outlined'}
                  onClick={() => { setActiveTab('variants'); setPage(0); }}
                  sx={{ fontWeight: 700 }}
                >
                  🎨 All Variants & Stock ({catalog.variants.length})
                </Button>
              </ButtonGroup>
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} gap={2}>
              <TextField label="Search products" size="small" value={filters.q} onChange={e => change('q', e.target.value)} />
              <TextField select size="small" label="Category" sx={{ minWidth: 150 }} value={filters.category} onChange={e => change('category', e.target.value)}>
                <MenuItem value="">All</MenuItem>
                {catalog.categories.map(item => <MenuItem key={item.id} value={String(item.id)}>{item.maincategoryname}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Brand" sx={{ minWidth: 150 }} value={filters.brand} onChange={e => change('brand', e.target.value)}>
                <MenuItem value="">All</MenuItem>
                {catalog.brands.map(item => <MenuItem key={item.id} value={String(item.id)}>{item.brandname}</MenuItem>)}
              </TextField>
              {isVariantsTab && (
                <TextField select size="small" label="Stock" sx={{ minWidth: 150 }} value={filters.stock} onChange={e => change('stock', e.target.value)}>
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="low">Low (1–3)</MenuItem>
                  <MenuItem value="out">Out of stock</MenuItem>
                </TextField>
              )}
              <Button onClick={() => { setFilters({ q: '', category: '', brand: '', stock: '' }); setPage(0); }}>Reset filters</Button>
            </Stack>
          </Paper>

          <Paper variant="outlined">
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    {isVariantsTab
                      ? ['Product / Variant', 'Category / brand', 'Size / colour', 'Available', 'Price / offer', 'Actions'].map(text => <TableCell key={text}>{text}</TableCell>)
                      : ['Product', 'Category / brand', 'Variants & Sizes', 'Actions'].map(text => <TableCell key={text}>{text}</TableCell>)
                    }
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.slice(safePage * size, (safePage + 1) * size).map(row => {
                    if (isVariantsTab) {
                      return (
                        <TableRow key={row.id}>
                          <TableCell>
                            <Stack direction="row" gap={2}>
                              <Box component="img" src={imageUrl(row.icon)} alt="" sx={{ width: 48, height: 60, objectFit: 'cover', borderRadius: 1 }} />
                              <Box>
                                <Typography fontWeight={700}>{row.productsubname || row.productname}</Typography>
                                <Typography variant="caption">#{row.id} {row.productid?.productname}</Typography>
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            {row.maincategoryid?.maincategoryname} / {row.subcategoryid?.subcategoryname}
                            <Typography variant="caption" display="block">{row.brandid?.brandname}</Typography>
                          </TableCell>
                          <TableCell>{row.size} / {row.color}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={`${row.qty} pcs`}
                              color={row.qty === 0 ? 'error' : row.qty <= 3 ? 'warning' : 'default'}
                            />
                          </TableCell>
                          <TableCell>₹{row.price} / {row.offerprice ? '₹' + row.offerprice : 'No offer'}</TableCell>
                          <TableCell>
                            <Button onClick={() => { setSelected(row); setSelectedIsVariant(true); setSuccess(''); }}>Edit</Button>
                            <Button color="error" onClick={() => { setDeleting(row); setDeletingIsVariant(true); }}>Delete</Button>
                          </TableCell>
                        </TableRow>
                      );
                    }

                    // MASTER PRODUCTS TAB: Shows product + attached variants + +Add Variant button
                    const prodVariants = (catalog.variants || []).filter(v => idOf(v.productid?.id || v.productid) === idOf(row.id));
                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <Stack direction="row" gap={2}>
                            <Box component="img" src={imageUrl(row.icon)} alt="" sx={{ width: 48, height: 60, objectFit: 'cover', borderRadius: 1 }} />
                            <Box>
                              <Typography fontWeight={700}>{row.productname}</Typography>
                              <Typography variant="caption">#{row.id} {row.description}</Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          {row.maincategoryid?.maincategoryname} / {row.subcategoryid?.subcategoryname}
                          <Typography variant="caption" display="block">{row.brandid?.brandname}</Typography>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" gap={0.5} flexWrap="wrap" alignItems="center">
                            {prodVariants.map(v => (
                              <Chip
                                key={v.id}
                                size="small"
                                label={`${v.color} ${v.size} (${v.qty})`}
                                onClick={() => { setSelected(v); setSelectedIsVariant(true); }}
                                sx={{ cursor: 'pointer', fontSize: '11px' }}
                              />
                            ))}
                            {!prodVariants.length && (
                              <Typography variant="caption" color="text.secondary">
                                No variants yet
                              </Typography>
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" gap={0.5}>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => setCreatingVariantFor(row)}
                              sx={{ fontWeight: 700 }}
                            >
                              + Variant
                            </Button>
                            <Button size="small" onClick={() => { setSelected(row); setSelectedIsVariant(false); setSuccess(''); }}>
                              Edit
                            </Button>
                            <Button size="small" color="error" onClick={() => { setDeleting(row); setDeletingIsVariant(false); }}>
                              Delete
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!filtered.length && (
                    <TableRow>
                      <TableCell colSpan={isVariantsTab ? 6 : 4}>No products match these filters.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={filtered.length}
              page={safePage}
              rowsPerPage={size}
              rowsPerPageOptions={[10, 20, 50]}
              onPageChange={(_, value) => setPage(value)}
              onRowsPerPageChange={e => { setSize(Number(e.target.value)); setPage(0); }}
            />
          </Paper>
        </>
      )}

      {/* CREATE NEW PRODUCT MODAL */}
      <Dialog open={creatingNew === 'product'} maxWidth="md" fullWidth onClose={() => setCreatingNew(null)}>
        <DialogTitle>Add New Product</DialogTitle>
        <DialogContent>
          {catalog && (
            <Box sx={{ pt: 1 }}>
              <ProductForm variant={false} catalog={catalog} onSaved={saved} onCancel={() => setCreatingNew(null)} />
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* CREATE NEW VARIANT MODAL */}
      <Dialog open={creatingNew === 'variant'} maxWidth="md" fullWidth onClose={() => setCreatingNew(null)}>
        <DialogTitle>Add New Product Variant</DialogTitle>
        <DialogContent>
          {catalog && (
            <Box sx={{ pt: 1 }}>
              <ProductForm variant={true} catalog={catalog} onSaved={saved} onCancel={() => setCreatingNew(null)} />
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* ADD VARIANT FOR SPECIFIC PRODUCT MODAL */}
      <Dialog open={!!creatingVariantFor} maxWidth="md" fullWidth onClose={() => setCreatingVariantFor(null)}>
        <DialogTitle>Add Variant for: {creatingVariantFor?.productname}</DialogTitle>
        <DialogContent>
          {catalog && creatingVariantFor && (
            <Box sx={{ pt: 1 }}>
              <ProductForm
                variant={true}
                parentProduct={creatingVariantFor}
                catalog={catalog}
                onSaved={saved}
                onCancel={() => setCreatingVariantFor(null)}
              />
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* EDIT MODAL */}
      <Dialog open={!!selected} maxWidth="md" fullWidth onClose={() => setSelected(null)}>
        <DialogTitle>Edit {selectedIsVariant ? 'Variant' : 'Product'}</DialogTitle>
        <DialogContent>
          {selected && catalog && (
            <Box sx={{ pt: 1 }}>
              <ProductForm
                key={selected.id}
                variant={selectedIsVariant}
                row={selected}
                catalog={catalog}
                onSaved={saved}
                onCancel={() => setSelected(null)}
              />
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* DELETE MODAL */}
      <Dialog open={!!deleting} onClose={() => !removing && setDeleting(null)}>
        <DialogTitle>Delete this {deletingIsVariant ? 'variant' : 'product'}?</DialogTitle>
        <DialogContent>
          <Typography mb={2}>This cannot be undone. Products with variants and variants used in orders cannot be deleted.</Typography>
          <Button color="error" disabled={removing} onClick={remove}>Confirm delete</Button>
          <Button disabled={removing} onClick={() => setDeleting(null)}>Cancel</Button>
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
