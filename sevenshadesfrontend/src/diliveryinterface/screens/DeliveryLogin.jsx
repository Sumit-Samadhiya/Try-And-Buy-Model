import { BrandMark } from '../../userinterface/components/BrandLogo';
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
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
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
import DoordrapeLoader from '../../userinterface/components/DoordrapeLoader';

export default function DeliveryLogin() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const navigate = useNavigate();

  // Rider Self-Service Forgot Password States
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [showForgotPass, setShowForgotPass] = useState(false);

  const handleSendForgotOtp = async () => {
    setForgotError('');
    setForgotSuccess('');
    const cleanPhone = forgotPhone.trim();
    if (!cleanPhone || !/^[6-9][0-9]{9}$/.test(cleanPhone)) {
      setForgotError('Enter a valid 10-digit registered Indian mobile number.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await postData('auth/send-whatsapp-otp', {
        phone: cleanPhone,
        purpose: 'rider_reset'
      });
      setForgotLoading(false);
      if (res?.status || res?.success) {
        setForgotStep(2);
        setForgotSuccess(res?.message || 'Verification code sent to your registered phone.');
      } else {
        setForgotError(res?.message || 'Unable to send OTP. Please contact Store Dispatch Admin.');
      }
    } catch {
      setForgotLoading(false);
      setForgotError('Network error. Unable to reach verification server.');
    }
  };

  const handleResetRiderPassword = async () => {
    setForgotError('');
    setForgotSuccess('');
    const cleanPhone = forgotPhone.trim();
    const cleanOtp = forgotOtp.trim();

    if (!cleanOtp || cleanOtp.length !== 6) {
      setForgotError('Enter the 6-digit OTP verification code.');
      return;
    }
    if (!forgotNewPassword || forgotNewPassword.length < 8 || /^[0-9]+$/.test(forgotNewPassword)) {
      setForgotError('Password must be at least 8 characters and not numeric-only.');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('New password and confirm password do not match.');
      return;
    }

    setForgotLoading(true);
    try {
      // First try WhatsApp verification
      let res = await postData('auth/verify-whatsapp-otp', {
        phone: cleanPhone,
        otp: cleanOtp,
        password: forgotNewPassword,
        confirm_password: forgotConfirmPassword,
        purpose: 'rider_reset'
      });

      // If needed, fallback to dedicated rider reset endpoint
      if (!res?.status && !res?.success) {
        res = await postData('delivery_rider_reset_password', {
          phone: cleanPhone,
          otp: cleanOtp,
          password: forgotNewPassword,
          confirm_password: forgotConfirmPassword
        });
      }

      setForgotLoading(false);
      if (res?.status || res?.success) {
        setForgotOpen(false);
        setIdentifier(cleanPhone);
        setPassword(forgotNewPassword);
        setSuccessMsg('Password reset successfully! You can now start your shift with your new password.');
        setErrorMsg('');
      } else {
        setForgotError(res?.message || 'Verification failed. Please check OTP and retry.');
      }
    } catch {
      setForgotLoading(false);
      setForgotError('Network error. Unable to complete password reset.');
    }
  };

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

      clearCachedAccounts(true);
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
        background: 'radial-gradient(circle at 50% 20%, #064e3b 0%, #022c22 55%, #011a14 100%)',
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
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, rgba(0, 0, 0, 0) 70%)',
          pointerEvents: 'none'
        }}
      />

      <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button
            component={Link}
            to="/home"
            startIcon={<ArrowBackRoundedIcon />}
            sx={{ color: '#a7f3d0', textTransform: 'none', '&:hover': { color: '#ffffff' } }}
          >
            Customer Store
          </Button>
          <Chip
            icon={<TwoWheelerRoundedIcon sx={{ color: '#10b981 !important' }} />}
            label="Delivery Partner App"
            sx={{
              bgcolor: 'rgba(16, 185, 129, 0.18)',
              color: '#34d399',
              fontWeight: 700,
              border: '1px solid rgba(16, 185, 129, 0.35)'
            }}
          />
        </Box>

        <Card
          sx={{
            bgcolor: 'rgba(2, 44, 34, 0.92)',
            backdropFilter: 'blur(16px)',
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
              variant="delivery"
              dark
              text="Authenticating delivery partner credentials…"
              role="status"
            />
          )}
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
                <BrandMark size={40} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 900, color: '#ffffff', letterSpacing: '-0.5px' }}>
                Doordrape
              </Typography>
              <Typography variant="subtitle1" sx={{ color: '#10b981', fontWeight: 700 }}>
                Rider Partner Cockpit
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                Sign in with your assigned Rider ID or registered mobile to start today's delivery shift.
              </Typography>
            </Stack>

            {successMsg && (
              <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setSuccessMsg('')}>
                {successMsg}
              </Alert>
            )}

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

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: -1 }}>
                  <Button
                    type="button"
                    size="small"
                    onClick={() => {
                      setForgotOpen(true);
                      setForgotStep(1);
                      setForgotPhone(identifier.replace(/\D/g, '').slice(-10) || '');
                      setForgotError('');
                      setForgotSuccess('');
                      setForgotOtp('');
                      setForgotNewPassword('');
                      setForgotConfirmPassword('');
                    }}
                    sx={{
                      color: '#34d399',
                      textTransform: 'none',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      '&:hover': { color: '#6ee7b7' },
                    }}
                  >
                    Forgot / Reset Password?
                  </Button>
                </Box>

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
                  Direct Handover
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

      {/* Rider Self-Service Forgot Password Dialog */}
      <Dialog
        open={forgotOpen}
        onClose={() => !forgotLoading && setForgotOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'rgba(2, 44, 34, 0.98)',
            backdropFilter: 'blur(20px)',
            borderRadius: 3.5,
            border: '1px solid rgba(52, 211, 153, 0.3)',
            color: '#ffffff',
            p: 1
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#34d399', pb: 1 }}>
          🔑 Rider Password Reset
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#94a3b8', mb: 2 }}>
            {forgotStep === 1
              ? 'Enter your 10-digit mobile number registered with DoorDrape Dispatch.'
              : `Enter the 6-digit OTP sent to +91 ${forgotPhone} and choose a new password.`}
          </Typography>

          {forgotSuccess && (
            <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
              {forgotSuccess}
            </Alert>
          )}

          {forgotError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setForgotError('')}>
              {forgotError}
            </Alert>
          )}

          {forgotStep === 1 ? (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                fullWidth
                label="Registered Mobile Number"
                placeholder="e.g. 9876543210"
                value={forgotPhone}
                onChange={(e) => setForgotPhone(e.target.value)}
                disabled={forgotLoading}
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
                    borderRadius: 2,
                    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.15)' },
                    '&:hover fieldset': { borderColor: '#10b981' },
                    '&.Mui-focused fieldset': { borderColor: '#10b981' },
                  },
                  '& .MuiInputLabel-root': { color: '#94a3b8' },
                  '& .MuiInputLabel-root.Mui-focused': { color: '#10b981' },
                }}
              />
            </Stack>
          ) : (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                fullWidth
                label="6-Digit OTP Code"
                placeholder="123456"
                value={forgotOtp}
                onChange={(e) => setForgotOtp(e.target.value)}
                disabled={forgotLoading}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'rgba(15, 23, 42, 0.6)',
                    color: '#ffffff',
                    borderRadius: 2,
                    letterSpacing: '4px',
                    fontWeight: 700,
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
                label="New Password"
                type={showForgotPass ? 'text' : 'password'}
                placeholder="Min 8 characters"
                value={forgotNewPassword}
                onChange={(e) => setForgotNewPassword(e.target.value)}
                disabled={forgotLoading}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowForgotPass(!showForgotPass)} sx={{ color: '#94a3b8' }}>
                        {showForgotPass ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'rgba(15, 23, 42, 0.6)',
                    color: '#ffffff',
                    borderRadius: 2,
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
                label="Confirm New Password"
                type={showForgotPass ? 'text' : 'password'}
                placeholder="Repeat new password"
                value={forgotConfirmPassword}
                onChange={(e) => setForgotConfirmPassword(e.target.value)}
                disabled={forgotLoading}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'rgba(15, 23, 42, 0.6)',
                    color: '#ffffff',
                    borderRadius: 2,
                    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.15)' },
                    '&:hover fieldset': { borderColor: '#10b981' },
                    '&.Mui-focused fieldset': { borderColor: '#10b981' },
                  },
                  '& .MuiInputLabel-root': { color: '#94a3b8' },
                  '& .MuiInputLabel-root.Mui-focused': { color: '#10b981' },
                }}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          {forgotStep === 2 && (
            <Button
              size="small"
              onClick={() => { setForgotStep(1); setForgotError(''); }}
              disabled={forgotLoading}
              sx={{ color: '#94a3b8', textTransform: 'none' }}
            >
              Change Mobile
            </Button>
          )}
          <Button
            size="small"
            onClick={() => setForgotOpen(false)}
            disabled={forgotLoading}
            sx={{ color: '#94a3b8', textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={forgotStep === 1 ? handleSendForgotOtp : handleResetRiderPassword}
            disabled={forgotLoading}
            sx={{
              bgcolor: '#10b981',
              color: '#ffffff',
              fontWeight: 700,
              textTransform: 'none',
              px: 2.5,
              '&:hover': { bgcolor: '#059669' },
            }}
          >
            {forgotLoading
              ? 'Please wait…'
              : forgotStep === 1
              ? 'Send Verification Code'
              : 'Reset Password & Finish'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
