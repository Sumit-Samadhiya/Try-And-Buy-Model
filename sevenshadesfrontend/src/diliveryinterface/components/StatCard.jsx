import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

export default function StatCard({ label, value }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.2,
        borderRadius: 3.5,
        bgcolor: 'rgba(30, 41, 59, 0.75)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 20px -4px rgba(0, 0, 0, 0.4)',
      }}
    >
      <Typography variant="body2" sx={{ color: '#94a3b8', fontWeight: 600, fontSize: 13 }}>
        {label}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 900, color: '#f8fafc', mt: 0.8 }}>
        {value}
      </Typography>
    </Paper>
  );
}
