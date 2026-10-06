import BrandLogo from '../../userinterface/components/BrandLogo';
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
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 3.5,
        bgcolor: 'rgba(30, 41, 59, 0.75)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        color: '#ffffff',
        height: '100%',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
      }}
    >
      <div style={{ fontSize: 24, marginBottom: 16 }}><BrandLogo light size={30} /></div>
      <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 1 }}>
        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#10b981', boxShadow: '0 0 10px #10b981' }} />
        <Typography sx={{ fontWeight: 800, color: '#f8fafc', fontSize: '1.1rem' }}>Rider Operations</Typography>
      </Stack>
      <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.5, fontWeight: 500 }}>
        {loginData?.phone || 'Not logged in'}
      </Typography>

      <Stack spacing={1.2} sx={{ mt: 2.5 }}>
        <Button
          fullWidth
          variant={activePage === 'dashboard' ? 'contained' : 'outlined'}
          sx={{
            py: 1.1,
            borderRadius: 2.5,
            fontWeight: 700,
            textTransform: 'none',
            bgcolor: activePage === 'dashboard' ? '#10b981' : 'transparent',
            color: activePage === 'dashboard' ? '#ffffff' : '#94a3b8',
            borderColor: activePage === 'dashboard' ? '#10b981' : 'rgba(255, 255, 255, 0.15)',
            '&:hover': {
              bgcolor: activePage === 'dashboard' ? '#059669' : 'rgba(255, 255, 255, 0.08)',
              color: '#ffffff',
            },
          }}
          onClick={() => goTo('/delivery/dashboard')}
        >
          Active Tasks
        </Button>
        <Button
          fullWidth
          variant={activePage === 'help' ? 'contained' : 'outlined'}
          sx={{
            py: 1.1,
            borderRadius: 2.5,
            fontWeight: 700,
            textTransform: 'none',
            bgcolor: activePage === 'help' ? '#10b981' : 'transparent',
            color: activePage === 'help' ? '#ffffff' : '#94a3b8',
            borderColor: activePage === 'help' ? '#10b981' : 'rgba(255, 255, 255, 0.15)',
            '&:hover': {
              bgcolor: activePage === 'help' ? '#059669' : 'rgba(255, 255, 255, 0.08)',
              color: '#ffffff',
            },
          }}
          onClick={() => goTo('/delivery/help-center')}
        >
          SOS & Help Center
        </Button>
      </Stack>

      <Button
        fullWidth
        variant="text"
        sx={{
          mt: 3,
          color: '#f87171',
          fontWeight: 700,
          textTransform: 'none',
          '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.1)' },
        }}
        onClick={handleLogout}
      >
        Sign Out Shift
      </Button>
    </Paper>
  );

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at 15% 15%, #0f172a 0%, #020617 95%)',
        py: 3,
        color: '#f8fafc',
      }}
    >
      <Container maxWidth="lg">
        {isMobile && (
          <Paper
            elevation={0}
            sx={{
              mb: 2,
              p: 1.5,
              borderRadius: 3,
              bgcolor: 'rgba(30, 41, 59, 0.85)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <IconButton aria-label="Open delivery menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)} sx={{ color: '#ffffff' }}>
                <MenuIcon />
              </IconButton>
              <Typography sx={{ fontWeight: 800, color: '#f8fafc' }}>Delivery Panel</Typography>
              <Chip
                size="small"
                label="Rider app"
                sx={{ bgcolor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontWeight: 700, border: '1px solid rgba(16, 185, 129, 0.3)' }}
              />
            </Stack>
          </Paper>
        )}

        <Drawer
          anchor="left"
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          PaperProps={{ sx: { bgcolor: '#0b1120', borderRight: '1px solid rgba(255, 255, 255, 0.1)' } }}
        >
          <Box sx={{ width: 280, p: 2, bgcolor: '#0b1120', minHeight: '100%' }}>
            {navMenu}
          </Box>
        </Drawer>

        <Grid container spacing={2.5}>
          <Grid item xs={12} md={3} sx={{ display: { xs: 'none', md: 'block' } }}>
            <Box sx={{ position: 'sticky', top: 20 }}>
              {navMenu}
            </Box>
          </Grid>

          <Grid item xs={12} md={9} sx={{ minWidth: 0 }}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 3.5,
                bgcolor: 'rgba(30, 41, 59, 0.75)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                mb: 2.5,
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
              }}
            >
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: '#ffffff' }}>{title}</Typography>
                  {subtitle ? <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.3 }}>{subtitle}</Typography> : null}
                </Box>
                <Chip
                  size="small"
                  label="Order workspace"
                  sx={{
                    bgcolor: 'rgba(16, 185, 129, 0.15)',
                    color: '#34d399',
                    fontWeight: 700,
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                  }}
                />
              </Stack>
            </Paper>

            {children}
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
