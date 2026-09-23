import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

export default function StatCard({ label, value }) {
  return (
    <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid #e5e7eb' }}>
      <Typography variant="body2" sx={{ color: '#6b7280' }}>
        {label}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 800, color: '#111827', mt: 0.5 }}>
        {value}
      </Typography>
    </Paper>
  );
}
