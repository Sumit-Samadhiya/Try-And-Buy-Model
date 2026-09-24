import { logout } from '../../services/FetchDjangoApiServices';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import MenuIcon from '@mui/icons-material/Menu';
import { useState } from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useNavigate } from 'react-router-dom';
import { clearDeliveryLogin, getDeliveryLogin } from '../data/deliverySessionStore';

export default function DeliveryShell({ title, subtitle, activePage, children }) {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const loginData = getDeliveryLogin();
  const [menuOpen, setMenuOpen] = useState(false);

  const goTo = (path) => {
    navigate(path);
    setMenuOpen(false);
  };

  const handleLogout = async () => {
    const result = await logout();
    if (!result.status) { alert(result.message); return; }
    clearDeliveryLogin();
    navigate('/delivery/login');
    setMenuOpen(false);
  };

  const navMenu = (
    <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid #e5e7eb', height: '100%' }}>
      <Typography sx={{ fontWeight: 800, color: '#111827' }}>Delivery Panel</Typography>
      <Typography variant="body2" sx={{ color: '#6b7280', mt: 0.5 }}>
        {loginData?.phone || 'Not logged in'}
      </Typography>

      <Stack spacing={1} sx={{ mt: 2 }}>
        <Button
          variant={activePage === 'dashboard' ? 'contained' : 'outlined'}
          sx={activePage === 'dashboard' ? { bgcolor: '#111827' } : undefined}
          onClick={() => goTo('/delivery/dashboard')}
        >
          Dashboard
        </Button>
        <Button
          variant={activePage === 'help' ? 'contained' : 'outlined'}
          sx={activePage === 'help' ? { bgcolor: '#111827' } : undefined}
          onClick={() => goTo('/delivery/help-center')}
        >
          Help Center
        </Button>
      </Stack>

      <Button fullWidth variant="text" color="error" sx={{ mt: 2 }} onClick={handleLogout}>
        Logout
      </Button>
    </Paper>
  );

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)', py: 3 }}>
      <Container maxWidth="lg">
        {isMobile && (
          <Paper elevation={0} sx={{ mb: 2, p: 1.5, borderRadius: 3, border: '1px solid #e5e7eb' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <IconButton onClick={() => setMenuOpen(true)}>
                <MenuIcon />
              </IconButton>
              <Typography sx={{ fontWeight: 800, color: '#111827' }}>Delivery Menu</Typography>
              <Chip size="small" label="Live" color="success" />
            </Stack>
          </Paper>
        )}

        <Drawer anchor="left" open={menuOpen} onClose={() => setMenuOpen(false)}>
          <Box sx={{ width: 280, p: 1.5 }}>
            {navMenu}
          </Box>
        </Drawer>

        <Grid container spacing={2}>
          <Grid item xs={12} md={3} sx={{ display: { xs: 'none', md: 'block' } }}>
            <Box sx={{ position: 'sticky', top: 20 }}>
              {navMenu}
            </Box>
          </Grid>

          <Grid item xs={12} md={9}>
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid #e5e7eb', mb: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#111827' }}>{title}</Typography>
                  {subtitle ? <Typography variant="body2" sx={{ color: '#6b7280' }}>{subtitle}</Typography> : null}
                </Box>
                <Chip size="small" label="Live Data" color="success" />
              </Stack>
            </Paper>

            {children}
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
