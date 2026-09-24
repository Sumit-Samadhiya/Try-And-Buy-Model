import useOrderEvents from '../../services/useOrderEvents';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MaterialTable from '@material-table/core';
import { Alert, Button, Chip, Stack } from '@mui/material';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import { getData } from '../../services/FetchDjangoApiServices';
import TitleComponent from '../components/admin/TitleComponent';
import { useStyles } from './CategoryCss';

const STATUS_MAP = {
  'TRY_REQUESTED': 'Try Requested',
  'ASSIGNED': 'Assigned',
  'OUT_FOR_TRIAL': 'Out for Trial',
  'TRIAL_IN_PROGRESS': 'Trial in Progress',
  'SELECTION_SUBMITTED': 'Selection Submitted',
  'DELIVERED': 'Delivered',
  'CANCELLED': 'Cancelled'
};

export default function DisplayAllOrders() {
  const classes = useStyles();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const requestIdRef = useRef(0);

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
          // Retain cached rows on failure rather than wiping to an empty list
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

  // Consolidate live updates and polling into useOrderEvents (which manages 15-second polling fallback)
  useOrderEvents(fetchOrders);

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
        tryStatus: STATUS_MAP[tryOrder.status] || tryOrder.status || 'Try Requested',
        tryItemsCount: tryOrder.total_try_items || 0,
        tryFee: tryOrder.try_fee || 0,
        address: `${tryOrder.address_text || ''}, ${tryOrder.city || ''}, ${tryOrder.country || ''} ${tryOrder.postcode || ''}`,
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

  return (
    <div className={classes.display_root}>
      <div className={classes.display_box}>
        {error && (
          <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error} Showing cached data.
          </Alert>
        )}
        <MaterialTable
          title={
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ width: '100%', pr: 2 }}>
              <TitleComponent title="Order List" listicon="" />
              <Button
                size="small"
                variant="outlined"
                startIcon={<RefreshRoundedIcon />}
                onClick={fetchOrders}
                disabled={loading}
              >
                Refresh
              </Button>
            </Stack>
          }
          isLoading={loading}
          columns={[
            { title: 'Sr', field: 'srno' },
            { title: 'Try Order ID', field: 'tryOrderId' },
            { title: 'Customer Mobile', field: 'mobile' },
            {
              title: 'Try Status',
              render: (rowData) => <Chip size="small" color="info" label={rowData.tryStatus} />,
            },
            { title: 'Try Items', field: 'tryItemsCount' },
            { title: 'Try Fee', render: (rowData) => `Rs ${rowData.tryFee}` },
            { title: 'Try Items Detail', field: 'tryItemsSummary' },
            { title: 'Address', field: 'address' },
            {
              title: 'Final Status',
              render: (rowData) => (
                <Chip
                  size="small"
                  color={rowData.finalStatus === 'completed' ? 'success' : rowData.finalStatus === 'payment_pending' ? 'warning' : 'default'}
                  label={rowData.finalStatus}
                />
              ),
            },
            { title: 'Final Items', field: 'finalItemsSummary' },
            { title: 'Final Payable', render: (rowData) => `Rs ${rowData.finalPayable}` },
            { title: 'Wallet Credit', render: (rowData) => `Rs ${rowData.walletCredit}` },
            { title: 'Payment', field: 'payment' },
            { title: 'Created At', field: 'createdAt' },
          ]}
          data={tableData}
          options={{
            search: true,
            paging: true,
            pageSize: 10,
            sorting: true,
            headerStyle: { fontWeight: 700 },
          }}
        />
      </div>
    </div>
  );
}
