import Chip from '@mui/material/Chip';

const statusColorMap = {
  assigned: 'default',
  on_the_way: 'info',
  trial_in_progress: 'warning',
  completed: 'success',
};

const statusLabelMap = {
  assigned: 'Assigned',
  on_the_way: 'On The Way',
  trial_in_progress: 'Trial In Progress',
  completed: 'Completed',
};

export default function StatusPill({ status }) {
  return (
    <Chip
      label={statusLabelMap[status] || 'Assigned'}
      color={statusColorMap[status] || 'default'}
      size="small"
      variant="filled"
    />
  );
}
