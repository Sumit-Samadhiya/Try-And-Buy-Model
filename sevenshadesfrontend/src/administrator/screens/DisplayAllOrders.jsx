import useOrderEvents from '../../services/useOrderEvents';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MaterialTable from '@material-table/core';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import TableChartRoundedIcon from '@mui/icons-material/TableChartRounded';
import ViewAgendaRoundedIcon from '@mui/icons-material/ViewAgendaRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import ShoppingBagRoundedIcon from '@mui/icons-material/ShoppingBagRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import { getData } from '../../services/FetchDjangoApiServices';
import TitleComponent from '../components/admin/TitleComponent';
import { useStyles } from './CategoryCss';
import DoordrapeLoader from '../../userinterface/components/DoordrapeLoader';

const STATUS_MAP = {
  'TRY_REQUESTED': 'Try Requested',
  'ASSIGNED': 'Assigned',
  'OUT_FOR_TRIAL': 'Out for Trial',
  'TRIAL_IN_PROGRESS': 'Trial in Progress',
  'SELECTION_SUBMITTED': 'Selection Submitted',
  'DELIVERED': 'Delivered',
  'CANCELLED': 'Cancelled',
};

const STATUS_COLORS = {
  'Try Requested': { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' },
  'Assigned': { bg: '#fef3c7', text: '#b45309', border: '#fde68a' },
  'Out for Trial': { bg: '#fef9c3', text: '#a16207', border: '#fef08a' },
  'Trial in Progress': { bg: '#ede9fe', text: '#6d28d9', border: '#ddd6fe' },
  'Selection Submitted': { bg: '#fce7f3', text: '#be185d', border: '#fbcfe8' },
  'Delivered': { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' },
  'Cancelled': { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca' },
};

export default function DisplayAllOrders() {
  const classes = useStyles();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState(isMobile ? 'cards' : 'table');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const requestIdRef = useRef(0);

  // Sync default view mode when breakpoint changes initially
  useEffect(() => {
    setViewMode(isMobile ? 'cards' : 'table');
  }, [isMobile]);

  const fetchOrders = useCallback(async () => {
    const currentRequestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const result = await getData('admin_order_lifecycle_list');
      if (currentRequestId === requestIdRef.current) {
        if (result?.status) {
          setRows(result.data || []);
          setError(null);
        } else {
          setError(result?.message || 'Failed to load order lifecycle data.');
        }
      }
    } catch (err) {
      if (currentRequestId === requestIdRef.current) {
        setError('Network error while refreshing orders.');
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useOrderEvents((event) => {
    if (['order_created', 'order_status_updated', 'trial_payment_captured', 'final_payment_updated'].includes(event?.reason)) {
      fetchOrders();
    }
  });

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const tableData = useMemo(() => {
    return rows.map((row, index) => {
      const tryOrder = row?.try_order || {};
      const finalOrder = row?.final_order || null;
      const tryItems = tryOrder?.tryorderitem_set || [];
      const finalItems = finalOrder?.finalorderitem_set || [];

      return {
        srno: index + 1,
        tryOrderId: tryOrder.order_id || '-',
        mobile: tryOrder.mobileno || '-',
        rawStatus: tryOrder.status,
        tryStatus: STATUS_MAP[tryOrder.status] || tryOrder.status || 'Try Requested',
        tryItemsCount: tryOrder.total_try_items || 0,
        tryFee: tryOrder.try_fee || 0,
        address: `${tryOrder.address_text || ''}, ${tryOrder.city || ''}, ${tryOrder.country || ''} ${tryOrder.postcode || ''}`.trim().replace(/^,\s*|,\s*$/g, ''),
        tryItemsSummary: tryItems.map((item) => `${item.product_name} x${item.qty}`).join(', '),
        finalStatus: finalOrder?.status || 'pending_selection',
        finalPayable: finalOrder?.final_payable || 0,
        walletCredit: finalOrder?.wallet_credit || 0,
        payment: finalOrder ? `${(finalOrder.payment_mode || '').toUpperCase()} / ${(finalOrder.payment_status || '').toUpperCase()}` : 'N/A',
        finalItemsSummary: finalItems.map((item) => `${item.product_name} x${item.qty}`).join(', '),
        createdAt: tryOrder.created_at ? new Date(tryOrder.created_at).toLocaleString() : '-',
      };
    });
  }, [rows]);

  const filteredData = useMemo(() => {
    return tableData.filter((item) => {
      const matchesSearch =
        !searchTerm ||
        item.tryOrderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.mobile.includes(searchTerm) ||
        item.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.tryItemsSummary.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === 'ALL' ||
        item.tryStatus.toLowerCase() === statusFilter.toLowerCase() ||
        item.rawStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [tableData, searchTerm, statusFilter]);

  return (
    <div className={classes.display_root}>
      <div className={classes.display_box}>
        {error && (
          <Alert severity="warning" sx={{ m: 2 }} onClose={() => setError(null)}>
            {error} Showing cached data.
          </Alert>
        )}

        {/* Dashboard Header Bar */}
        <Box
          sx={{
            p: { xs: 2, sm: 2.5 },
            borderBottom: '1px solid #e2e8f0',
            bgcolor: '#ffffff',
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 2,
          }}
        >
          <Box>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <TitleComponent title="Store Orders & Lifecycle" />
              <Chip
                size="small"
                label={`${rows.length} Total`}
                sx={{ fontWeight: 800, bgcolor: '#ecfdf5', color: '#047857' }}
              />
            </Stack>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              Real-time DoorDrape Try-at-Home dispatch and doorstep payment monitoring
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center" sx={{ width: { xs: '100%', sm: 'auto' }, justifyContent: 'flex-end' }}>
            {/* View Mode Toggle */}
            <Stack direction="row" sx={{ bgcolor: '#f1f5f9', p: 0.5, borderRadius: 2 }}>
              <Tooltip title="Card View (Mobile Optimized)">
                <IconButton
                  size="small"
                  onClick={() => setViewMode('cards')}
                  sx={{
                    bgcolor: viewMode === 'cards' ? '#ffffff' : 'transparent',
                    color: viewMode === 'cards' ? '#064e3b' : '#64748b',
                    boxShadow: viewMode === 'cards' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    borderRadius: 1.5,
                  }}
                >
                  <ViewAgendaRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Table View (Comprehensive)">
                <IconButton
                  size="small"
                  onClick={() => setViewMode('table')}
                  sx={{
                    bgcolor: viewMode === 'table' ? '#ffffff' : 'transparent',
                    color: viewMode === 'table' ? '#064e3b' : '#64748b',
                    boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    borderRadius: 1.5,
                  }}
                >
                  <TableChartRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>

            <Button
              size="small"
              variant="outlined"
              startIcon={<RefreshRoundedIcon />}
              onClick={fetchOrders}
              disabled={loading}
              sx={{
                borderColor: '#cbd5e1',
                color: '#064e3b',
                fontWeight: 700,
                borderRadius: 2,
                '&:hover': { borderColor: '#064e3b', bgcolor: 'rgba(6, 78, 59, 0.04)' },
              }}
            >
              Refresh
            </Button>
          </Stack>
        </Box>

        {loading && rows.length === 0 ? (
          <Box sx={{ p: 4 }}>
            <DoordrapeLoader variant="admin" text="Synchronizing store orders & doorstep lifecycle…" size="medium" />
          </Box>
        ) : viewMode === 'cards' ? (
          /* Mobile / Compact Card View */
          <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
            {/* Filter & Search Bar */}
            <Grid container spacing={1.5} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search by Order ID, mobile, item..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchRoundedIcon fontSize="small" sx={{ color: '#94a3b8' }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={8}>
                <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 0.5 }}>
                  {['ALL', 'TRY_REQUESTED', 'ASSIGNED', 'OUT_FOR_TRIAL', 'DELIVERED', 'CANCELLED'].map((statusKey) => {
                    const isSelected = statusFilter === statusKey;
                    const label = statusKey === 'ALL' ? 'All Orders' : STATUS_MAP[statusKey] || statusKey;
                    return (
                      <Chip
                        key={statusKey}
                        label={label}
                        size="small"
                        clickable
                        onClick={() => setStatusFilter(statusKey)}
                        sx={{
                          fontWeight: 700,
                          fontSize: 12,
                          bgcolor: isSelected ? '#064e3b' : '#f1f5f9',
                          color: isSelected ? '#ffffff' : '#475569',
                          '&:hover': {
                            bgcolor: isSelected ? '#047857' : '#e2e8f0',
                          },
                        }}
                      />
                    );
                  })}
                </Box>
              </Grid>
            </Grid>

            {filteredData.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: 3, border: '1px dashed #cbd5e1' }}>
                <Typography sx={{ color: '#64748b', fontWeight: 600 }}>
                  No orders found matching your search.
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {filteredData.map((order) => {
                  const statusStyle = STATUS_COLORS[order.tryStatus] || {
                    bg: '#f1f5f9',
                    text: '#475569',
                    border: '#e2e8f0',
                  };

                  return (
                    <Grid item xs={12} md={6} key={order.tryOrderId}>
                      <Card
                        elevation={0}
                        sx={{
                          border: '1px solid #e2e8f0',
                          borderRadius: 3,
                          transition: 'all 0.2s ease-in-out',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                          '&:hover': {
                            boxShadow: '0 6px 16px rgba(0,0,0,0.06)',
                            borderColor: '#cbd5e1',
                          },
                        }}
                      >
                        <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                          {/* Card Header: Order ID + Status Chips */}
                          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
                            <Box>
                              <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>
                                #{order.tryOrderId}
                              </Typography>
                              <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: '#64748b', mt: 0.3 }}>
                                <AccessTimeRoundedIcon sx={{ fontSize: 13 }} />
                                <Typography variant="caption">{order.createdAt}</Typography>
                              </Stack>
                            </Box>
                            <Stack direction="row" spacing={0.8} alignItems="center">
                              <Chip
                                size="small"
                                label={order.tryStatus}
                                sx={{
                                  fontWeight: 800,
                                  fontSize: 11,
                                  bgcolor: statusStyle.bg,
                                  color: statusStyle.text,
                                  border: `1px solid ${statusStyle.border}`,
                                }}
                              />
                              <Chip
                                size="small"
                                label={order.finalStatus}
                                sx={{
                                  fontWeight: 700,
                                  fontSize: 10,
                                  textTransform: 'uppercase',
                                  bgcolor: order.finalStatus === 'completed' ? '#dcfce7' : order.finalStatus === 'payment_pending' ? '#fef3c7' : '#f1f5f9',
                                  color: order.finalStatus === 'completed' ? '#15803d' : order.finalStatus === 'payment_pending' ? '#b45309' : '#64748b',
                                }}
                              />
                            </Stack>
                          </Stack>

                          <Divider sx={{ my: 1.5 }} />

                          {/* Customer & Location */}
                          <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                            <Grid item xs={12} sm={6}>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <PhoneRoundedIcon sx={{ fontSize: 16, color: '#064e3b' }} />
                                <Typography
                                  component="a"
                                  href={`tel:${order.mobile}`}
                                  sx={{
                                    fontWeight: 700,
                                    color: '#0f172a',
                                    fontSize: 13,
                                    textDecoration: 'none',
                                    '&:hover': { textDecoration: 'underline' },
                                  }}
                                >
                                  {order.mobile}
                                </Typography>
                              </Stack>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <Stack direction="row" alignItems="flex-start" spacing={1}>
                                <LocationOnRoundedIcon sx={{ fontSize: 16, color: '#d97706', mt: 0.2 }} />
                                <Typography variant="caption" sx={{ color: '#475569', lineHeight: 1.3 }}>
                                  {order.address || 'Address not provided'}
                                </Typography>
                              </Stack>
                            </Grid>
                          </Grid>

                          {/* Try Bag Items */}
                          <Box sx={{ bgcolor: '#f8fafc', p: 1.5, borderRadius: 2, mb: 1.5 }}>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                              <ShoppingBagRoundedIcon sx={{ fontSize: 15, color: '#064e3b' }} />
                              <Typography variant="caption" sx={{ fontWeight: 800, color: '#1e293b' }}>
                                Try Bag ({order.tryItemsCount} items):
                              </Typography>
                            </Stack>
                            <Typography variant="body2" sx={{ fontSize: 12.5, color: '#334155' }}>
                              {order.tryItemsSummary || 'No item details'}
                            </Typography>
                          </Box>

                          {/* Financials Summary */}
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: 1,
                              pt: 1,
                              borderTop: '1px solid #f1f5f9',
                            }}
                          >
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              <Box>
                                <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontSize: 10 }}>
                                  TRY FEE
                                </Typography>
                                <Typography sx={{ fontWeight: 800, fontSize: 13, color: '#064e3b' }}>
                                  ₹{order.tryFee}
                                </Typography>
                              </Box>
                              <Box>
                                <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontSize: 10 }}>
                                  FINAL PAYABLE
                                </Typography>
                                <Typography sx={{ fontWeight: 800, fontSize: 13, color: '#0f172a' }}>
                                  ₹{order.finalPayable}
                                </Typography>
                              </Box>
                            </Stack>

                            <Box sx={{ textAlign: 'right' }}>
                              <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontSize: 10 }}>
                                PAYMENT MODE / STATUS
                              </Typography>
                              <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569' }}>
                                {order.payment}
                              </Typography>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </Box>
        ) : (
          /* Table View with responsive horizontal scroll */
          <Box sx={{ width: '100%', overflowX: 'auto' }}>
            <MaterialTable
              title=""
              isLoading={loading}
              columns={[
                { title: 'Sr', field: 'srno', width: 60 },
                {
                  title: 'Try Order ID',
                  field: 'tryOrderId',
                  render: (rowData) => (
                    <Typography sx={{ fontWeight: 800, color: '#0f172a', fontSize: '0.85rem' }}>
                      #{rowData.tryOrderId}
                    </Typography>
                  ),
                },
                {
                  title: 'Customer Mobile',
                  field: 'mobile',
                  render: (rowData) => (
                    <Typography
                      component="a"
                      href={`tel:${rowData.mobile}`}
                      sx={{ fontWeight: 700, color: '#064e3b', textDecoration: 'none', fontSize: '0.85rem' }}
                    >
                      {rowData.mobile}
                    </Typography>
                  ),
                },
                {
                  title: 'Try Status',
                  render: (rowData) => {
                    const statusStyle = STATUS_COLORS[rowData.tryStatus] || {
                      bg: '#f1f5f9',
                      text: '#475569',
                      border: '#e2e8f0',
                    };
                    return (
                      <Chip
                        size="small"
                        label={rowData.tryStatus}
                        sx={{
                          fontWeight: 800,
                          fontSize: 11,
                          bgcolor: statusStyle.bg,
                          color: statusStyle.text,
                          border: `1px solid ${statusStyle.border}`,
                        }}
                      />
                    );
                  },
                },
                { title: 'Try Items', field: 'tryItemsCount', width: 90 },
                {
                  title: 'Try Fee',
                  render: (rowData) => (
                    <Typography sx={{ fontWeight: 700, color: '#064e3b', fontSize: '0.85rem' }}>
                      ₹{rowData.tryFee}
                    </Typography>
                  ),
                },
                {
                  title: 'Try Items Detail',
                  field: 'tryItemsSummary',
                  render: (rowData) => (
                    <Typography sx={{ fontSize: '0.8rem', maxWidth: 220, color: '#475569' }}>
                      {rowData.tryItemsSummary || '-'}
                    </Typography>
                  ),
                },
                {
                  title: 'Address',
                  field: 'address',
                  render: (rowData) => (
                    <Typography sx={{ fontSize: '0.8rem', maxWidth: 200, color: '#64748b' }}>
                      {rowData.address || '-'}
                    </Typography>
                  ),
                },
                {
                  title: 'Final Status',
                  render: (rowData) => (
                    <Chip
                      size="small"
                      color={
                        rowData.finalStatus === 'completed'
                          ? 'success'
                          : rowData.finalStatus === 'payment_pending'
                          ? 'warning'
                          : 'default'
                      }
                      label={rowData.finalStatus}
                      sx={{ fontWeight: 700, fontSize: 11 }}
                    />
                  ),
                },
                {
                  title: 'Final Items',
                  field: 'finalItemsSummary',
                  render: (rowData) => (
                    <Typography sx={{ fontSize: '0.8rem', maxWidth: 180, color: '#475569' }}>
                      {rowData.finalItemsSummary || '-'}
                    </Typography>
                  ),
                },
                {
                  title: 'Final Payable',
                  render: (rowData) => (
                    <Typography sx={{ fontWeight: 700, fontSize: '0.85rem' }}>
                      ₹{rowData.finalPayable}
                    </Typography>
                  ),
                },
                {
                  title: 'Wallet Credit',
                  render: (rowData) => `₹${rowData.walletCredit}`,
                },
                { title: 'Payment', field: 'payment' },
                { title: 'Created At', field: 'createdAt' },
              ]}
              data={tableData}
              options={{
                search: true,
                paging: true,
                pageSize: 10,
                pageSizeOptions: [10, 25, 50],
                sorting: true,
                headerStyle: {
                  backgroundColor: '#f8fafc',
                  color: '#1e293b',
                  fontWeight: 800,
                  fontSize: 12.5,
                  whiteSpace: 'nowrap',
                  borderBottom: '2px solid #e2e8f0',
                },
                rowStyle: {
                  borderBottom: '1px solid #f1f5f9',
                },
              }}
            />
          </Box>
        )}
      </div>
    </div>
  );
}
