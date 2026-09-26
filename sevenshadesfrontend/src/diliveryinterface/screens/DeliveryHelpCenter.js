import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import DeliveryShell from '../components/DeliveryShell';
import { getData, postData } from '../../services/FetchDjangoApiServices';
import { getDeliveryLogin } from '../data/deliverySessionStore';

const QUICK_SUBJECTS = [
  'Route Blockage / Traffic Delay',
  'Customer Unreachable at Doorstep',
  'Payment / Cash Amount Mismatch',
  'Damaged Tamper Tag / Missing Garment',
  'Scanner / App Sync Issue',
  'Vehicle Breakdown / SOS Help',
  'Other Issue',
];

export default function DeliveryHelpCenter() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openModal, setOpenModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [subjectPreset, setSubjectPreset] = useState(QUICK_SUBJECTS[0]);
  const [customSubject, setCustomSubject] = useState('');
  const [message, setMessage] = useState('');

  const rider = getDeliveryLogin();

  const loadTickets = async () => {
    setLoading(true);
    setError('');
    const res = await getData('rider_tickets');
    if (res && res.status) {
      setTickets(res.data || []);
    } else {
      setError(res?.message || 'Could not load support tickets.');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleCreateTicket = async () => {
    const finalSubject = subjectPreset === 'Other Issue' ? customSubject.trim() : subjectPreset;
    if (!finalSubject || finalSubject.length < 3) {
      alert('Please enter a valid ticket subject.');
      return;
    }
    if (!message.trim() || message.trim().length < 10) {
      alert('Please provide a message explaining your issue in at least 10 characters.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');
    const res = await postData('rider_create_ticket', {
      subject: finalSubject,
      message: message.trim(),
    });

    setSubmitting(false);
    if (res && res.status) {
      setSuccess('Support ticket created successfully. Operations team has been notified.');
      setOpenModal(false);
      setMessage('');
      setCustomSubject('');
      loadTickets();
    } else {
      alert(res?.message || 'Unable to submit ticket.');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Resolved':
      case 'Closed':
        return 'success';
      case 'In Progress':
        return 'warning';
      default:
        return 'info';
    }
  };

  return (
    <DeliveryShell
      title="Delivery Help Center"
      subtitle="Report route, payment or customer support issues directly to Hub Ops"
      activePage="help"
    >
      <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid #e5e7eb' }}>
        {/* Header Actions */}
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} sx={{ mb: 3 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#111827' }}>
              Rider Support Tickets
            </Typography>
            <Typography variant="body2" sx={{ color: '#6b7280' }}>
              Logged in as {rider?.name || 'Rider'} ({rider?.phone || 'Active Session'})
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadTickets}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<AddCircleOutlineIcon />}
              onClick={() => setOpenModal(true)}
              sx={{ bgcolor: '#111827', '&:hover': { bgcolor: '#1f2937' } }}
            >
              Raise Ticket
            </Button>
          </Stack>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {/* Operational escalation guidance */}
        <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 2 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <SupportAgentIcon sx={{ color: '#dc2626' }} />
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#991b1b' }}>
                Urgent dispatch or safety issue
              </Typography>
              <Typography variant="caption" sx={{ color: '#b91c1c' }}>
                Move to a safe location and raise an Urgent ticket here. Use local emergency services when immediate assistance is required.
              </Typography>
            </Box>
          </Stack>
        </Paper>

        {/* Tickets List */}
        {loading ? (
          <Stack alignItems="center" sx={{ py: 6 }}>
            <CircularProgress size={32} />
            <Typography variant="body2" sx={{ mt: 1.5, color: '#6b7280' }}>Loading tickets...</Typography>
          </Stack>
        ) : tickets.length === 0 ? (
          <Paper elevation={0} sx={{ p: 4, textAlign: 'center', bgcolor: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#374151' }}>
              No Active Tickets
            </Typography>
            <Typography variant="body2" sx={{ color: '#6b7280', mt: 0.5, mb: 2 }}>
              Have an issue during your delivery run? Raise a ticket and Hub Ops will assist you.
            </Typography>
            <Button variant="outlined" size="small" onClick={() => setOpenModal(true)}>
              Raise Your First Ticket
            </Button>
          </Paper>
        ) : (
          <Stack spacing={2}>
            {tickets.map((ticket) => (
              <Paper key={ticket.id} elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid #e5e7eb' }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1}>
                  <Box>
                    <Typography sx={{ fontWeight: 700, color: '#111827' }}>
                      {ticket.reference || `TKT-${ticket.id}`} • {ticket.subject}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#6b7280' }}>
                      Created: {new Date(ticket.created_at).toLocaleString()}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip size="small" label={ticket.priority || 'Normal'} variant="outlined" />
                    <Chip size="small" label={ticket.status} color={getStatusColor(ticket.status)} />
                  </Stack>
                </Stack>

                <Typography variant="body2" sx={{ mt: 1.5, color: '#374151', whiteSpace: 'pre-wrap' }}>
                  {ticket.message}
                </Typography>

                {ticket.response && (
                  <Box sx={{ mt: 1.5, p: 1.5, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 1.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#166534' }}>
                      Hub Operations Response:
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#15803d', mt: 0.5 }}>
                      {ticket.response}
                    </Typography>
                  </Box>
                )}
              </Paper>
            ))}
          </Stack>
        )}
      </Paper>

      {/* New Ticket Modal */}
      <Dialog open={openModal} onClose={() => !submitting && setOpenModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Raise Support Ticket</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Issue Topic</InputLabel>
              <Select
                label="Issue Topic"
                value={subjectPreset}
                onChange={(e) => setSubjectPreset(e.target.value)}
              >
                {QUICK_SUBJECTS.map((item) => (
                  <MenuItem key={item} value={item}>
                    {item}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {subjectPreset === 'Other Issue' && (
              <TextField
                label="Custom Subject"
                fullWidth
                size="small"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                placeholder="Briefly state your issue"
              />
            )}

            <TextField
              label="Details / Message"
              fullWidth
              multiline
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe what happened, customer address or order number if applicable..."
              helperText="Minimum 10 characters"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenModal(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateTicket}
            disabled={submitting}
            sx={{ bgcolor: '#111827', '&:hover': { bgcolor: '#1f2937' } }}
          >
            {submitting ? 'Submitting...' : 'Submit Ticket'}
          </Button>
        </DialogActions>
      </Dialog>
    </DeliveryShell>
  );
}
