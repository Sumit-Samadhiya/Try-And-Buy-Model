import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
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
import DoordrapeLoader from '../../userinterface/components/DoordrapeLoader';
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
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 3.5 },
          borderRadius: 4,
          bgcolor: 'rgba(30, 41, 59, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(12px)',
          color: '#f8fafc',
          position: 'relative',
        }}
      >
        {/* Header Actions */}
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} sx={{ mb: 3 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#f8fafc' }}>
              Rider Support Tickets
            </Typography>
            <Typography variant="body2" sx={{ color: '#94a3b8' }}>
              Logged in as {rider?.name || 'Rider'} ({rider?.phone || 'Active Session'})
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadTickets}
              disabled={loading}
              sx={{ color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)', textTransform: 'none', fontWeight: 600 }}
            >
              Refresh
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<AddCircleOutlineIcon />}
              onClick={() => setOpenModal(true)}
              sx={{
                bgcolor: '#059669',
                '&:hover': { bgcolor: '#047857' },
                fontWeight: 700,
                textTransform: 'none',
                boxShadow: '0 4px 14px rgba(5, 150, 105, 0.35)',
              }}
            >
              Raise Ticket
            </Button>
          </Stack>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2, bgcolor: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2, bgcolor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {/* Operational escalation guidance */}
        <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 2.5 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <SupportAgentIcon sx={{ color: '#f87171' }} />
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#fca5a5' }}>
                Urgent dispatch or safety issue
              </Typography>
              <Typography variant="caption" sx={{ color: '#f87171' }}>
                Move to a safe location and raise an Urgent ticket here. Use local emergency services when immediate assistance is required.
              </Typography>
            </Box>
          </Stack>
        </Paper>

        {/* Tickets List */}
        {loading ? (
          <Box sx={{ py: 6 }}>
            <DoordrapeLoader variant="delivery" dark text="Fetching support tickets from Hub Ops…" size="small" />
          </Box>
        ) : tickets.length === 0 ? (
          <Paper elevation={0} sx={{ p: 4, textAlign: 'center', bgcolor: 'rgba(15, 23, 42, 0.6)', border: '1px dashed rgba(255, 255, 255, 0.15)', borderRadius: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#f8fafc' }}>
              No Active Tickets
            </Typography>
            <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.5, mb: 2 }}>
              Have an issue during your delivery run? Raise a ticket and Hub Ops will assist you.
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setOpenModal(true)}
              sx={{ color: '#34d399', borderColor: 'rgba(52, 211, 153, 0.4)', textTransform: 'none', fontWeight: 600 }}
            >
              Raise Your First Ticket
            </Button>
          </Paper>
        ) : (
          <Stack spacing={2}>
            {tickets.map((ticket) => (
              <Paper
                key={ticket.id}
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 2.5,
                  bgcolor: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  transition: 'border-color 0.2s',
                  '&:hover': { borderColor: 'rgba(56, 189, 248, 0.3)' },
                }}
              >
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1}>
                  <Box>
                    <Typography sx={{ fontWeight: 700, color: '#f8fafc' }}>
                      {ticket.reference || `TKT-${ticket.id}`} • {ticket.subject}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      Created: {new Date(ticket.created_at).toLocaleString()}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip size="small" label={ticket.priority || 'Normal'} variant="outlined" sx={{ color: '#94a3b8', borderColor: 'rgba(255, 255, 255, 0.15)' }} />
                    <Chip size="small" label={ticket.status} color={getStatusColor(ticket.status)} />
                  </Stack>
                </Stack>

                <Typography variant="body2" sx={{ mt: 1.5, color: '#cbd5e1', whiteSpace: 'pre-wrap' }}>
                  {ticket.message}
                </Typography>

                {ticket.response && (
                  <Box sx={{ mt: 1.5, p: 1.5, bgcolor: 'rgba(6, 78, 59, 0.35)', border: '1px solid rgba(16, 185, 129, 0.35)', borderRadius: 2 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#34d399' }}>
                      Hub Operations Response:
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#a7f3d0', mt: 0.5 }}>
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
      <Dialog
        open={openModal}
        onClose={() => !submitting && setOpenModal(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#0f172a',
            color: '#f8fafc',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 3.5,
            position: 'relative',
          },
        }}
      >
        {submitting && <DoordrapeLoader overlay variant="delivery" dark text="Submitting ticket to Hub Ops…" />}
        <DialogTitle sx={{ fontWeight: 800, color: '#f8fafc', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          Raise Support Ticket
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ color: '#94a3b8' }}>Issue Topic</InputLabel>
              <Select
                label="Issue Topic"
                value={subjectPreset}
                onChange={(e) => setSubjectPreset(e.target.value)}
                sx={{
                  color: '#f8fafc',
                  '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(56, 189, 248, 0.5)' },
                }}
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
                sx={{
                  input: { color: '#f8fafc' },
                  label: { color: '#94a3b8' },
                  '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                }}
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
              FormHelperTextProps={{ sx: { color: '#64748b' } }}
              sx={{
                textarea: { color: '#f8fafc' },
                label: { color: '#94a3b8' },
                '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.2)' },
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <Button onClick={() => setOpenModal(false)} disabled={submitting} sx={{ color: '#94a3b8', textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateTicket}
            disabled={submitting}
            sx={{
              bgcolor: '#059669',
              '&:hover': { bgcolor: '#047857' },
              fontWeight: 700,
              textTransform: 'none',
              px: 3,
            }}
          >
            {submitting ? 'Submitting...' : 'Submit Ticket'}
          </Button>
        </DialogActions>
      </Dialog>
    </DeliveryShell>
  );
}
