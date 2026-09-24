import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import TwoWheelerRoundedIcon from '@mui/icons-material/TwoWheelerRounded';
import PhoneAndroidRoundedIcon from '@mui/icons-material/PhoneAndroidRounded';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import SpeedRoundedIcon from '@mui/icons-material/SpeedRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import SupportAgentRoundedIcon from '@mui/icons-material/SupportAgentRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { useNavigate, Link } from 'react-router-dom';
import { setDeliveryLogin } from '../data/deliverySessionStore';
import { postData, clearCachedAccounts } from '../../services/FetchDjangoApiServices';

export default function DeliveryLogin() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    const cleanId = identifier.trim();
    if (!cleanId) {
      setErrorMsg('Please enter your Rider ID (e.g. RDR-...) or 10-digit mobile number.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your partner password.');
      return;
    }

    setLoading(true);
    try {
      const result = await postData('delivery_rider_login', {
        phone: cleanId,
        rider_id: cleanId,
        password: password
      });

      if (!result?.status) {
        setErrorMsg(result?.message || 'Invalid Rider credentials or inactive account.');
        setLoading(false);
        return;
      }

      clearCachedAccounts();
      window.dispatchEvent(new Event('session-cleared'));
      setDeliveryLogin(result.data);
      navigate('/delivery/dashboard');
    } catch (err) {
      setErrorMsg('Network error. Unable to reach delivery dispatch server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at 10% 20%, #0f172a 0%, #020617 90%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 6,
        px: 2,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background ambient glow */}
      <Box
        sx={{
          position: 'absolute',
          top: '-15%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, rgba(0, 0, 0, 0) 70%)',
          pointerEvents: 'none'
        }}
      />

      <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button
            component={Link}
            to="/home"
            startIcon={<ArrowBackRoundedIcon />}
            sx={{ color: '#94a3b8', textTransform: 'none', '&:hover': { color: '#ffffff' } }}
          >
            Customer Store
          </Button>
          <Chip
            icon={<TwoWheelerRoundedIcon sx={{ color: '#10b981 !important' }} />}
            label="Delivery Partner App"
            sx={{
              bgcolor: 'rgba(16, 185, 129, 0.12)',
              color: '#34d399',
              fontWeight: 700,
              border: '1px solid rgba(16, 185, 129, 0.25)'
            }}
          />
        </Box>

        <Card
          sx={{
            bgcolor: 'rgba(30, 41, 59, 0.85)',
            backdropFilter: 'blur(16px)',
            borderRadius: 4,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)'
          }}
        >
          <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
            {/* Header / Brand */}
            <Stack spacing={1} sx={{ textAlign: 'center', mb: 4 }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  mx: 'auto',
                  borderRadius: 3,
                  bgcolor: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.5)'
                }}
              >
                <TwoWheelerRoundedIcon sx={{ fontSize: 36, color: '#ffffff' }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 900, color: '#ffffff', letterSpacing: '-0.5px' }}>
                SevenShades
              </Typography>
              <Typography variant="subtitle1" sx={{ color: '#10b981', fontWeight: 700 }}>
                Rider Partner Cockpit
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                Sign in with your assigned Rider ID or registered mobile to start today's delivery shift.
              </Typography>
            </Stack>

            {errorMsg && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setErrorMsg('')}>
                {errorMsg}
              </Alert>
            )}

            {/* Login Form */}
            <Box component="form" onSubmit={handleLogin}>
              <Stack spacing={2.5}>
                <TextField
                  fullWidth
                  label="Rider ID or Mobile Number"
                  placeholder="e.g. RDR-xxxxxxxx or 9876543210"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  disabled={loading}
                  autoComplete="username"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PhoneAndroidRoundedIcon sx={{ color: '#64748b' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'rgba(15, 23, 42, 0.6)',
                      color: '#ffffff',
                      borderRadius: 2.5,
                      '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.15)' },
                      '&:hover fieldset': { borderColor: '#10b981' },
                      '&.Mui-focused fieldset': { borderColor: '#10b981' },
                    },
                    '& .MuiInputLabel-root': { color: '#94a3b8' },
                    '& .MuiInputLabel-root.Mui-focused': { color: '#10b981' },
                  }}
                />

                <TextField
                  fullWidth
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter partner password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlinedIcon sx={{ color: '#64748b' }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          sx={{ color: '#64748b' }}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'rgba(15, 23, 42, 0.6)',
                      color: '#ffffff',
                      borderRadius: 2.5,
                      '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.15)' },
                      '&:hover fieldset': { borderColor: '#10b981' },
                      '&.Mui-focused fieldset': { borderColor: '#10b981' },
                    },
                    '& .MuiInputLabel-root': { color: '#94a3b8' },
                    '& .MuiInputLabel-root.Mui-focused': { color: '#10b981' },
                  }}
                />

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  size="large"
                  disabled={loading}
                  sx={{
                    py: 1.6,
                    borderRadius: 2.5,
                    bgcolor: '#10b981',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '1rem',
                    textTransform: 'none',
                    boxShadow: '0 10px 20px -5px rgba(16, 185, 129, 0.4)',
                    '&:hover': { bgcolor: '#059669' },
                    '&:disabled': { bgcolor: 'rgba(16, 185, 129, 0.3)' }
                  }}
                >
                  {loading ? <CircularProgress size={24} sx={{ color: '#ffffff' }} /> : 'Start Rider Shift'}
                </Button>
              </Stack>
            </Box>

            <Divider sx={{ my: 3.5, borderColor: 'rgba(255, 255, 255, 0.1)' }} />

            {/* Rider Features info strip */}
            <Stack direction="row" spacing={2} justifyContent="space-around">
              <Box sx={{ textAlign: 'center' }}>
                <SpeedRoundedIcon sx={{ color: '#38bdf8', fontSize: 24 }} />
                <Typography variant="caption" display="block" sx={{ color: '#94a3b8', mt: 0.5 }}>
                  15-Min Trial Cap
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <SecurityRoundedIcon sx={{ color: '#34d399', fontSize: 24 }} />
                <Typography variant="caption" display="block" sx={{ color: '#94a3b8', mt: 0.5 }}>
                  Verified Barcode
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <SupportAgentRoundedIcon sx={{ color: '#f59e0b', fontSize: 24 }} />
                <Typography variant="caption" display="block" sx={{ color: '#94a3b8', mt: 0.5 }}>
                  SOS Dispatch SLA
                </Typography>
              </Box>
            </Stack>

            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                New rider onboarding or password reset? Contact Store Dispatch Admin via{' '}
                <Link to="/adminlogin" style={{ color: '#10b981', textDecoration: 'none', fontWeight: 600 }}>
                  Admin Portal
                </Link>
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
