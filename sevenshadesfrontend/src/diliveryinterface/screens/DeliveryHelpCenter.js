import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { helpCenterTickets } from '../data/mockDeliveryData';
import DeliveryShell from '../components/DeliveryShell';

export default function DeliveryHelpCenter() {
  return (
    <DeliveryShell
      title="Delivery Help Center"
      subtitle="Resolve route, payment and customer support issues"
      activePage="help"
    >
      <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid #e5e7eb' }}>
        <Stack spacing={1.5}>
          {helpCenterTickets.map((ticket) => (
            <Paper key={ticket.id} elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid #e5e7eb' }}>
              <Stack direction="row" justifyContent="space-between">
                <Typography sx={{ fontWeight: 700 }}>{ticket.id}</Typography>
                <Chip size="small" label={ticket.status} color={ticket.status === 'Resolved' ? 'success' : 'warning'} />
              </Stack>
              <Typography variant="body2" sx={{ mt: 0.8, color: '#6b7280' }}>
                {ticket.title}
              </Typography>
            </Paper>
          ))}
        </Stack>
      </Paper>
    </DeliveryShell>
  );
}
