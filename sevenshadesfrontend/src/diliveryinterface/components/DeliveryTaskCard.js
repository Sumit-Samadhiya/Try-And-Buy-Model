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
    <Paper
      elevation={0}
      sx={{
        p: 2.2,
        borderRadius: 3.5,
        bgcolor: 'rgba(30, 41, 59, 0.85)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 25px -5px rgba(0, 0, 0, 0.5)',
        color: '#f8fafc',
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography sx={{ fontWeight: 800, color: '#38bdf8', fontSize: '1rem' }}>{task.id}</Typography>
        <StatusPill status={task.status} />
      </Stack>

      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
        <Chip
          size="small"
          label={`Route #${task.routeOrder}`}
          sx={{ bgcolor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontWeight: 700 }}
        />
        <Chip
          size="small"
          label={`${task.routeDistanceKm} km`}
          sx={{ bgcolor: 'rgba(255, 255, 255, 0.08)', color: '#cbd5e1' }}
        />
      </Stack>

      <Typography sx={{ mt: 1.2, fontWeight: 700, color: '#ffffff', fontSize: '1.05rem' }}>{task.customerName}</Typography>
      <Typography variant="body2" sx={{ color: '#94a3b8' }}>{task.customerPhone}</Typography>
      <Typography variant="body2" sx={{ mt: 0.8, color: '#cbd5e1' }}>📍 {task.address}</Typography>
      <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.8 }}>⏱️ Slot: {task.slot}</Typography>
      <Typography variant="body2" sx={{ color: '#34d399', fontWeight: 600 }}>{task.trialType} • Fee: Rs {task.feeAmount}</Typography>
      <Typography variant="body2" sx={{ mt: 0.8, fontWeight: 700, color: '#94a3b8' }}>Garments</Typography>
      <Typography variant="body2" sx={{ color: '#cbd5e1' }}>{task.items.map((item) => item.name).join(', ')}</Typography>

      <Stack direction="row" spacing={1} sx={{ mt: 2.2, flexWrap: 'wrap', rowGap: 1 }}>
        <Button
          size="small"
          variant="outlined"
          sx={{ color: '#cbd5e1', borderColor: 'rgba(255, 255, 255, 0.2)' }}
          onClick={handleCall}
        >
          Call
        </Button>
        <Button
          size="small"
          variant="outlined"
          sx={{ color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)' }}
          onClick={() => onOpenDetails(task.id)}
        >
          View Details
        </Button>
        {task.status === 'assigned' && (
          <Button
            size="small"
            variant="contained"
            sx={{ bgcolor: '#0284c7', '&:hover': { bgcolor: '#0369a1' } }}
            onClick={() => onStatusChange(task.id, 'on_the_way')}
          >
            Start Route
          </Button>
        )}
        {task.status === 'on_the_way' && (
          <Button
            size="small"
            variant="contained"
            color="warning"
            onClick={() => onStatusChange(task.id, 'trial_in_progress')}
          >
            Arrived & Start 15m Trial
          </Button>
        )}
        {task.status === 'trial_in_progress' && (
          <Button
            size="small"
            variant="contained"
            sx={{ bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } }}
            onClick={() => onStatusChange(task.id, 'completed')}
          >
            Mark Complete
          </Button>
        )}
      </Stack>
    </Paper>
  );
}
