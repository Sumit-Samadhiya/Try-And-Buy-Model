import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import Link from '@mui/material/Link';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useState } from 'react';
import { postData, clearCachedAccounts } from '../../services/FetchDjangoApiServices';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import DoordrapeLoader from '../../userinterface/components/DoordrapeLoader';

function Copyright(props) {
  return (
    <Typography variant="body2" sx={{ color: '#94a3b8' }} align="center" {...props}>
      {'Copyright © '}
      <Link color="inherit" href="https://doordrape.com/">
        doordrape.com
      </Link>{' '}
      {new Date().getFullYear()}
      {'. All rights reserved.'}
    </Typography>
  );
}

const adminTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#10b981' },
    background: { default: '#020617', paper: '#0f172a' },
  },
  typography: { fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
});

export default function AdminLogin() {
  const [emailid, setEmailId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await postData('check_admin_login', { emailid, password });
      if (result?.status) {
        clearCachedAccounts(true);
        navigate('/admindashboard');
      } else {
        setError(result?.message || 'Unable to sign in');
      }
    } catch {
      setError('Connection error. Please verify network and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeProvider theme={adminTheme}>
      <Box
        sx={{
          minHeight: '100vh',
          background: 'radial-gradient(circle at 50% 20%, #064e3b 0%, #022c22 50%, #011a14 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: 6,
          px: 2,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Ambient background glow ring */}
        <Box
          sx={{
            position: 'absolute',
            top: '-10%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 700,
            height: 700,
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, rgba(0, 0, 0, 0) 70%)',
            pointerEvents: 'none',
          }}
        />

        <Container component="main" maxWidth="xs" sx={{ position: 'relative', zIndex: 1 }}>
          <CssBaseline />

          {/* Top navigation */}
          <Box sx={{ mb: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button
              component={RouterLink}
              to="/home"
              startIcon={<ArrowBackRoundedIcon />}
              sx={{ color: '#a7f3d0', textTransform: 'none', '&:hover': { color: '#ffffff' } }}
            >
              Customer Store
            </Button>
            <Chip
              icon={<SecurityRoundedIcon sx={{ color: '#10b981 !important' }} />}
              label="Secured Portal"
              size="small"
              sx={{
                bgcolor: 'rgba(16, 185, 129, 0.18)',
                color: '#34d399',
                fontWeight: 700,
                border: '1px solid rgba(16, 185, 129, 0.35)',
              }}
            />
          </Box>

          <Card
            sx={{
              bgcolor: 'rgba(2, 44, 34, 0.92)',
              backdropFilter: 'blur(20px)',
              borderRadius: 4,
              border: '1px solid rgba(52, 211, 153, 0.25)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 30px rgba(5, 150, 105, 0.2)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {loading && (
              <DoordrapeLoader
                overlay
                variant="admin"
                dark
                text="Authenticating administrator access…"
                role="status"
              />
            )}

            <CardContent sx={{ p: { xs: 3, sm: 4.5 } }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
                <Avatar
                  sx={{
                    m: 1,
                    bgcolor: 'transparent',
                    border: '2px solid rgba(16, 185, 129, 0.4)',
                    background: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)',
                    width: 54,
                    height: 54,
                    boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3)',
                  }}
                >
                  <AdminPanelSettingsRoundedIcon sx={{ fontSize: 30, color: '#ffffff' }} />
                </Avatar>
                <Typography component="h1" variant="h5" sx={{ fontWeight: 800, color: '#f8fafc', mt: 1 }}>
                  Sign in
                </Typography>
                <Typography variant="body2" sx={{ color: '#a7f3d0', mt: 0.5, textAlign: 'center' }}>
                  Doordrape Store Administration
                </Typography>
              </Box>

              {error && (
                <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
                  {error}
                </Alert>
              )}

              <Box component="form" noValidate onSubmit={handleSubmit}>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="email"
                  label="Email Address"
                  name="email"
                  autoComplete="email"
                  autoFocus
                  disabled={loading}
                  onChange={(e) => setEmailId(e.target.value)}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'rgba(1, 26, 20, 0.65)',
                      borderRadius: 2.5,
                      '& fieldset': { borderColor: 'rgba(52, 211, 153, 0.25)' },
                      '&:hover fieldset': { borderColor: '#10b981' },
                    },
                    '& .MuiInputLabel-root': { color: '#a7f3d0' },
                  }}
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="password"
                  label="Password"
                  type="password"
                  id="password"
                  autoComplete="current-password"
                  disabled={loading}
                  onChange={(e) => setPassword(e.target.value)}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'rgba(1, 26, 20, 0.65)',
                      borderRadius: 2.5,
                      '& fieldset': { borderColor: 'rgba(52, 211, 153, 0.25)' },
                      '&:hover fieldset': { borderColor: '#10b981' },
                    },
                    '& .MuiInputLabel-root': { color: '#a7f3d0' },
                  }}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={loading}
                  sx={{
                    mt: 3,
                    mb: 1.5,
                    py: 1.5,
                    borderRadius: 2.5,
                    bgcolor: '#10b981',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '1rem',
                    textTransform: 'none',
                    boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.45)',
                    '&:hover': { bgcolor: '#059669' },
                  }}
                  onClick={handleSubmit}
                >
                  {loading ? <CircularProgress size={24} sx={{ color: '#ffffff' }} /> : 'Sign In'}
                </Button>
              </Box>
            </CardContent>
          </Card>

          <Copyright sx={{ mt: 4, mb: 2 }} />
        </Container>
      </Box>
    </ThemeProvider>
  );
}
