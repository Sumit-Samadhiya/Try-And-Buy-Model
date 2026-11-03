import { CancelTrialButton } from './TrialInventoryControls';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, Divider, Paper, Stack, Typography } from '@mui/material';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import QrCode2RoundedIcon from '@mui/icons-material/QrCode2Rounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import { postData, serverURL } from './FetchDjangoApiServices';
import useOrderEvents from './useOrderEvents';

export default function CustomerBill({ orderId }) {
  const [data, setData] = useState(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [copiedUpi, setCopiedUpi] = useState(false);

  const load = useCallback(async () => {
    const result = await postData('settlement_detail', { order_id: orderId });
    if (result.status) { setData(result.data); setLoadError(''); }
    else { setData(null); setLoadError(result.message || 'Unable to load your bill. Please retry.'); }
    setLoading(false);
  }, [orderId]);

  useEffect(() => { load(); }, [load]);
  useOrderEvents(load, !!orderId, orderId);

  const approve = async (mode = paymentMode) => {
    setBusy(true); setMessage('');
    try {
      const result = await postData('customer_approve_bill', {
        order_id: orderId,
        bill_revision: data.final_order.bill_revision,
        payment_mode: mode || 'cash'
      });
      if (!result.status) throw new Error(result.message);
      setMessage(result.data.final_payable > 0 ? (mode === 'upi' ? 'Approved! Scan the dynamic UPI QR code below to complete payment.' : 'Approved. Pay the exact balance in cash to your assigned rider.') : 'Approval recorded.');
    } catch (error) { setMessage(error.message); }
    await load(); setBusy(false);
  };

  const final = data?.final_order;

  return (
    <Box sx={{ width: '100%', maxWidth: 640, mx: 'auto', py: { xs: 2, sm: 3 } }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 3.5 },
          borderRadius: '20px',
          border: '1px solid #e2e8f0',
          background: '#ffffff',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.05)',
        }}
      >
        {message && <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>{message}</Alert>}

        {/* Invoice Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1.5, mb: 2.5 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <ReceiptLongOutlinedIcon sx={{ color: '#064e3b', fontSize: 24 }} />
              <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800, color: '#064e3b' }}>
                Trial Settlement Bill
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
              {orderId}
            </Typography>
          </Box>

          {data && (
            <Box sx={{ textAlign: 'right' }}>
              <Chip
                label={`Status: ${data.try_order.status.replaceAll('_', ' ')}`}
                size="small"
                sx={{
                  fontWeight: 700,
                  fontSize: '12px',
                  bgcolor: data.try_order.status === 'DELIVERED' ? '#dcfce7' : '#f1f5f9',
                  color: data.try_order.status === 'DELIVERED' ? '#15803d' : '#334155',
                  border: '1px solid',
                  borderColor: data.try_order.status === 'DELIVERED' ? '#86efac' : '#e2e8f0',
                }}
              />
              <Typography sx={{ display: 'none' }}>Status: {data.try_order.status.replaceAll('_', ' ')}</Typography>
            </Box>
          )}
        </Box>

        {data?.can_cancel && (
          <Box sx={{ mb: 2 }}>
            <CancelTrialButton orderId={orderId} onCancelled={load} />
          </Box>
        )}

        {loading ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography role="status" sx={{ color: '#64748b', fontWeight: 600 }}>
              Loading your bill…
            </Typography>
          </Box>
        ) : loadError ? (
          <Alert severity="error" sx={{ borderRadius: 2 }} action={<Button color="inherit" size="small" onClick={load}>Retry</Button>}>
            {loadError}
          </Alert>
        ) : data?.try_order.status === 'CANCELLED' ? (
          <Alert severity="info" sx={{ borderRadius: 2 }}>Trial cancelled. Reserved stock has been released.</Alert>
        ) : !final ? (
          <Box sx={{ py: 4, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: 3, border: '1px dashed #cbd5e1' }}>
            <LocalShippingOutlinedIcon sx={{ fontSize: 36, color: '#94a3b8', mb: 1 }} />
            <Typography sx={{ color: '#64748b', fontSize: 14 }}>
              Your itemized bill will appear here after the doorstep trial.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={2.5}>
            {/* Bill Revision Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, borderBottom: '1px solid #f1f5f9' }}>
              <Typography variant="h6" sx={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                {data.customer_approved ? 'Your Bill (Cash on Delivery)' : 'Approve your selected items'} · version {final.bill_revision}
              </Typography>
              {data.customer_approved && (
                <Chip
                  icon={<CheckCircleOutlineRoundedIcon sx={{ fontSize: '16px !important' }} />}
                  label="Approved"
                  size="small"
                  color="success"
                  variant="outlined"
                  sx={{ fontWeight: 700 }}
                />
              )}
            </Box>

            {/* Selected Items List */}
            <Stack spacing={1.5}>
              <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700, color: '#64748b' }}>
                Selected Items ({final.finalorderitem_set?.length || 0})
              </Typography>
              {final.finalorderitem_set.map(item => (
                <Paper
                  key={item.id}
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: '12px',
                    borderColor: '#e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    bgcolor: '#ffffff',
                    transition: 'all 0.15s ease',
                    '&:hover': { borderColor: '#cbd5e1', bgcolor: '#f8fafc' },
                  }}
                >
                  <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>
                      {item.product_name} · {item.size} · {item.color} · Qty {item.qty}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      Size: {item.size} | Color: {item.color} | Quantity: {item.qty}
                    </Typography>
                  </Box>
                  <Typography sx={{ fontWeight: 800, fontSize: '16px', color: '#064e3b' }}>
                    ₹{item.line_total}
                  </Typography>
                </Paper>
              ))}
            </Stack>

            {!final.selected_items_count && (
              <Alert severity="warning" sx={{ borderRadius: 2 }}>
                <Typography sx={{ color: '#b45309', fontWeight: 600, fontSize: 13 }}>
                  No items retained. All trial clothes will be returned to the rider.
                </Typography>
              </Alert>
            )}

            {/* Financial Summary Breakdown Card */}
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                bgcolor: '#f8fafc',
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
              }}
            >
              <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700, color: '#64748b', display: 'block', mb: 1.5 }}>
                Payment Summary
              </Typography>
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#334155' }}>
                  <Typography>Items Total: ₹{final.items_total}</Typography>
                  <Typography sx={{ fontWeight: 600 }}>₹{final.items_total}</Typography>
                </Box>

                {final.wallet_credit > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#047857' }}>
                    <Typography>Prepaid Trial Fee Credit: ₹{final.wallet_credit}</Typography>
                    <Typography sx={{ fontWeight: 600 }}>-₹{final.wallet_credit}</Typography>
                  </Box>
                )}

                <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  {final.selected_items_count > 0 ? (
                    <Typography sx={{ color: '#047857', fontWeight: 600 }}>Doorstep Delivery Charge: FREE (Waived on purchase)</Typography>
                  ) : (
                    <Typography sx={{ color: '#b45309', fontWeight: 600 }}>Doorstep Delivery Charge (COD): ₹{final.final_payable}</Typography>
                  )}
                  <Typography sx={{ fontWeight: 600, color: final.selected_items_count > 0 ? '#047857' : '#b45309' }}>
                    {final.selected_items_count > 0 ? 'FREE' : `₹${final.final_payable}`}
                  </Typography>
                </Box>

                <Divider sx={{ my: 1 }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6" sx={{ mt: 1, fontWeight: 800, color: '#0f172a' }}>
                    Total Cash Payable: ₹{final.final_payable}
                  </Typography>
                  <Chip
                    label="Cash / UPI at Doorstep"
                    size="small"
                    sx={{ bgcolor: '#d1fae5', color: '#065f46', fontWeight: 700, fontSize: 11 }}
                  />
                </Box>
              </Stack>
            </Paper>

            {/* Dynamic Doorstep UPI QR / Cash Selection */}
            {final.final_payable > 0 && (
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  bgcolor: '#ffffff',
                }}
              >
                <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 800, color: '#475569', display: 'block', mb: 1.5 }}>
                  Doorstep Settlement Method
                </Typography>
                <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
                  <Button
                    fullWidth
                    size="small"
                    variant={paymentMode === 'upi' ? 'contained' : 'outlined'}
                    onClick={() => setPaymentMode('upi')}
                    startIcon={<QrCode2RoundedIcon />}
                    sx={{
                      py: 1,
                      borderRadius: 2,
                      fontWeight: 700,
                      textTransform: 'none',
                      bgcolor: paymentMode === 'upi' ? '#064e3b' : undefined,
                      borderColor: '#064e3b',
                      color: paymentMode === 'upi' ? '#ffffff' : '#064e3b',
                      '&:hover': { bgcolor: paymentMode === 'upi' ? '#043629' : '#f0fdf4' }
                    }}
                  >
                    ⚡ Instant UPI QR
                  </Button>
                  <Button
                    fullWidth
                    size="small"
                    variant={paymentMode === 'cash' ? 'contained' : 'outlined'}
                    onClick={() => setPaymentMode('cash')}
                    sx={{
                      py: 1,
                      borderRadius: 2,
                      fontWeight: 700,
                      textTransform: 'none',
                      bgcolor: paymentMode === 'cash' ? '#064e3b' : undefined,
                      borderColor: '#064e3b',
                      color: paymentMode === 'cash' ? '#ffffff' : '#064e3b',
                      '&:hover': { bgcolor: paymentMode === 'cash' ? '#043629' : '#f0fdf4' }
                    }}
                  >
                    💵 Cash to Rider
                  </Button>
                </Stack>

                {paymentMode === 'upi' ? (
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#f8fafc', borderRadius: 2.5, border: '1px dashed #cbd5e1' }}>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a', mb: 1 }}>
                      Scan & Pay ₹{final.final_payable}
                    </Typography>
                    <Box sx={{ display: 'inline-block', p: 1.5, bgcolor: '#ffffff', borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
                      <img
                        src={data?.payment_qr?.qr_image_url || `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(`upi://pay?pa=doordrape@upi&pn=DoorDrape&am=${Number(final.final_payable).toFixed(2)}&tr=${orderId}&tn=DoorDrape%20Order%20${orderId}&cu=INR`)}&color=064e3b&margin=1`}
                        alt="Doorstep UPI QR Code"
                        style={{ width: 180, height: 180, display: 'block' }}
                      />
                    </Box>
                    <Stack direction="row" spacing={0.8} justifyContent="center" alignItems="center" sx={{ mt: 1.5 }}>
                      <Chip label="GPay" size="small" sx={{ fontWeight: 700, fontSize: 11, height: 22 }} />
                      <Chip label="PhonePe" size="small" sx={{ fontWeight: 700, fontSize: 11, height: 22 }} />
                      <Chip label="Paytm" size="small" sx={{ fontWeight: 700, fontSize: 11, height: 22 }} />
                      <Chip label="BHIM" size="small" sx={{ fontWeight: 700, fontSize: 11, height: 22 }} />
                    </Stack>
                    <Box sx={{ mt: 1.5 }}>
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => {
                          const vpa = data?.payment_qr?.vpa || 'doordrape@upi';
                          navigator.clipboard?.writeText(vpa);
                          setCopiedUpi(true);
                          setTimeout(() => setCopiedUpi(false), 2000);
                        }}
                        startIcon={<ContentCopyRoundedIcon sx={{ fontSize: '14px !important' }} />}
                        sx={{ fontSize: 12, fontWeight: 700, color: '#064e3b', textTransform: 'none' }}
                      >
                        {copiedUpi ? '✅ UPI ID Copied!' : `UPI ID: ${data?.payment_qr?.vpa || 'doordrape@upi'}`}
                      </Button>
                    </Box>
                    <Button
                      fullWidth
                      variant="outlined"
                      component="a"
                      href={data?.payment_qr?.upi_uri || `upi://pay?pa=doordrape@upi&pn=DoorDrape&am=${Number(final.final_payable).toFixed(2)}&tr=${orderId}&tn=DoorDrape%20Order%20${orderId}&cu=INR`}
                      sx={{
                        mt: 1.5,
                        borderColor: '#064e3b',
                        color: '#064e3b',
                        fontWeight: 700,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontSize: 13,
                        '&:hover': { bgcolor: '#f0fdf4' }
                      }}
                    >
                      📱 Tap to Pay in UPI App
                    </Button>
                  </Box>
                ) : (
                  <Box sx={{ p: 2, bgcolor: '#fefce8', borderRadius: 2.5, border: '1px solid #fef08a' }}>
                    <Typography variant="body2" sx={{ color: '#854d0e', fontWeight: 600 }}>
                      💵 Please keep exact cash of <strong>₹{final.final_payable}</strong> ready to hand over to your delivery rider upon receiving your finalized clothes.
                    </Typography>
                  </Box>
                )}
              </Paper>
            )}

            <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '12px', lineHeight: 1.5 }}>
              Finalized purchases are non-refundable. Please verify your selection before confirming.
            </Typography>

            {/* Approval & Payment Actions */}
            {!data.customer_approved ? (
              <Button
                disabled={busy}
                variant="contained"
                size="large"
                fullWidth
                sx={{
                  bgcolor: '#064e3b',
                  py: 1.5,
                  fontSize: '15px',
                  fontWeight: 800,
                  borderRadius: '12px',
                  textTransform: 'none',
                  boxShadow: '0 4px 14px rgba(6, 78, 59, 0.25)',
                  '&:hover': { bgcolor: '#043629' },
                }}
                onClick={() => approve(paymentMode)}
              >
                {final.final_payable > 0 ? `Approve Selection & Pay ₹${final.final_payable} ${paymentMode === 'upi' ? '(UPI QR / Cash)' : 'Cash to Rider'}` : 'Approve Selection — No Balance Due'}
              </Button>
            ) : final.payment_status === 'paid' ? (
              <Alert severity="success" sx={{ borderRadius: 2 }}>
                {final.final_payable ? `${paymentMode === 'upi' ? 'UPI payment' : 'Cash collection'} recorded by rider.` : 'No balance due.'}{' '}
                {['DELIVERED', 'NO_PURCHASE'].includes(data.try_order.status) ? 'Order completed.' : 'Delivery confirmation will follow.'}
              </Alert>
            ) : (
              <Stack spacing={1}>
                <Alert severity="success" sx={{ borderRadius: 2 }}>
                  Selection Submitted. Payment Mode: <strong>{paymentMode === 'upi' ? 'Dynamic UPI QR' : 'Cash on Delivery (COD)'}</strong>.
                </Alert>
                <Alert severity="warning" sx={{ borderRadius: 2 }}>
                  {paymentMode === 'upi' ? (
                    <span>Scan the dynamic UPI QR code above to pay <strong>₹{final.final_payable}</strong> to DoorDrape.</span>
                  ) : (
                    <span>Please pay <strong>₹{final.final_payable} in cash</strong> directly to your assigned rider at the doorstep.</span>
                  )}
                </Alert>
              </Stack>
            )}

            {/* Official Invoice / Receipt Download */}
            {data.receipt_number && (
              <Button
                variant="outlined"
                fullWidth
                startIcon={<DownloadRoundedIcon />}
                sx={{
                  borderColor: '#064e3b',
                  color: '#064e3b',
                  py: 1.2,
                  fontWeight: 800,
                  borderRadius: '12px',
                  textTransform: 'none',
                  '&:hover': { bgcolor: '#f0fdf4', borderColor: '#043629' },
                }}
                aria-label="Download Payment Receipt"
                component="a"
                href={serverURL + '/api/receipt_download?order_id=' + encodeURIComponent(orderId)}
              >
                📄 Download Payment Receipt
              </Button>
            )}
          </Stack>
        )}
      </Paper>
    </Box>
  );
}
