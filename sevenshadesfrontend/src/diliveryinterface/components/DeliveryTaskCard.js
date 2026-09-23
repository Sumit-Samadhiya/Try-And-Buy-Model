import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import StatusPill from './StatusPill';

export default function DeliveryTaskCard({ task, onStatusChange, onOpenDetails }) {
  const handleCall = () => {
    alert(`Calling ${task.customerName} (${task.customerPhone})`);
  };

  return (
    <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid #e5e7eb' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography sx={{ fontWeight: 800, color: '#111827' }}>{task.id}</Typography>
        <StatusPill status={task.status} />
      </Stack>

      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
        <Chip size="small" label={`Route #${task.routeOrder}`} />
        <Chip size="small" label={`${task.routeDistanceKm} km`} variant="outlined" />
      </Stack>

      <Typography sx={{ mt: 1, fontWeight: 700 }}>{task.customerName}</Typography>
      <Typography variant="body2" sx={{ color: '#6b7280' }}>{task.customerPhone}</Typography>
      <Typography variant="body2" sx={{ mt: 0.8 }}>{task.address}</Typography>
      <Typography variant="body2" sx={{ color: '#6b7280', mt: 0.8 }}>Slot: {task.slot}</Typography>
      <Typography variant="body2" sx={{ color: '#6b7280' }}>{task.trialType} • Fee: Rs {task.feeAmount}</Typography>
      <Typography variant="body2" sx={{ mt: 0.8, fontWeight: 700 }}>Items</Typography>
      <Typography variant="body2" sx={{ color: '#6b7280' }}>{task.items.map((item) => item.name).join(', ')}</Typography>

      <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', rowGap: 1 }}>
        <Button size="small" variant="outlined" onClick={handleCall}>Call</Button>
        <Button size="small" variant="outlined" onClick={() => onOpenDetails(task.id)}>View Details</Button>
        {task.status === 'assigned' && (
          <Button size="small" variant="contained" onClick={() => onStatusChange(task.id, 'on_the_way')}>
            Start Route
          </Button>
        )}
        {task.status === 'on_the_way' && (
          <Button size="small" variant="contained" color="warning" onClick={() => onStatusChange(task.id, 'trial_in_progress')}>
            Start Trial
          </Button>
        )}
        {task.status === 'trial_in_progress' && (
          <Button size="small" variant="contained" color="success" onClick={() => onStatusChange(task.id, 'completed')}>
            Mark Complete
          </Button>
        )}
      </Stack>
    </Paper>
  );
}
