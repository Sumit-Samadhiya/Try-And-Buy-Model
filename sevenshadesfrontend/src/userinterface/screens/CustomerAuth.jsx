import BrandLogo from '../../userinterface/components/BrandLogo';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Alert, Box, Button, IconButton, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import ArrowBack from '@mui/icons-material/ArrowBack';
import WhatsApp from '@mui/icons-material/WhatsApp';
import { postData, clearCachedAccounts } from '../../services/FetchDjangoApiServices';
import { validateFields } from '../../services/validation';
import { trackAuthEvent } from '../../services/analytics';
import DoordrapeLoader from '../../userinterface/components/DoordrapeLoader';
import './CustomerAuth.css';

export default function CustomerAuth({ kind = 'login' }) {
  const navigate = useNavigate(), location = useLocation(), dispatch = useDispatch();
  const signup = kind === 'signup', reset = kind === 'reset';
  const [method, setMethod] = useState('whatsapp');
  const [form, setForm] = useState({ mobileno:'', fname:'', lname:'', emailid:'', password:'', confirm_password:'', otp:'' });
  const [errors, setErrors] = useState({}), [message, setMessage] = useState('');
  const [severity, setSeverity] = useState('error');
  const [challenge, setChallenge] = useState(null);
  const [busy, setBusy] = useState(false), [showPassword, setShowPassword] = useState(false), [now, setNow] = useState(Date.now());
  const pending = useRef(false);
  const isWhatsApp = signup || reset || method === 'whatsapp';
  const cooldown = Math.max(0, Math.ceil(((challenge?.resendAt || 0) - now) / 1000));
  const expired = challenge && now >= challenge.expiresAt;

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const change = field => event => {
    setForm(old => ({ ...old, [field]: event.target.value }));
    setErrors(old => ({ ...old, [field]: '' }));
    setMessage('');
  };

  const setResult = result => {
    setSeverity('error');
    setMessage(result.message || 'Please check your details.');
    setErrors(Object.fromEntries(Object.entries(result.errors || {}).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.join(' ') : value
    ])));
  };

  const field = (name, label, options = {}) => (
    <TextField
      fullWidth
      required
      name={name}
      label={label}
      value={form[name]}
      onChange={change(name)}
      error={!!errors[name]}
      helperText={errors[name] || options.helperText}
      disabled={busy || (name === 'mobileno' && !!challenge)}
      {...options}
    />
  );

  const passwordField = (name, label) => field(name, label, {
    type: showPassword ? 'text' : 'password',
    autoComplete: kind === 'login' ? 'current-password' : 'new-password',
    inputProps: { maxLength: 128 },
    InputProps: {
      endAdornment: (
        <InputAdornment position="end">
          <IconButton
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            onClick={() => setShowPassword(value => !value)}
            edge="end"
          >
            {showPassword ? <VisibilityOff /> : <Visibility />}
          </IconButton>
        </InputAdornment>
      )
    }
  });

  const run = async callback => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setMessage('');
    try {
      await callback();
    } finally {
      setBusy(false);
      pending.current = false;
    }
  };

  // WhatsApp OTP Request
  const requestWhatsAppOtp = () => run(async () => {
    const rawNumber = form.mobileno.trim();
    if (!/^[6-9]\d{9}$/.test(rawNumber)) {
      setErrors({ mobileno: 'Enter a valid 10-digit mobile number' });
      return;
    }

    if (signup) {
      const errs = {};
      if (!form.fname.trim()) errs.fname = 'First name is required.';
      if (!form.emailid.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.emailid)) {
        errs.emailid = 'Enter a valid email address.';
      }
      if (!form.password) {
        errs.password = 'Password is required.';
      } else if (form.password.length < 8) {
        errs.password = 'Password must be at least 8 characters.';
      }
      if (form.password !== form.confirm_password) {
        errs.confirm_password = 'Passwords do not match.';
      }
      if (Object.keys(errs).length) {
        setErrors(errs);
        return;
      }
    } else if (reset) {
      const errs = {};
      if (!form.password) {
        errs.password = 'New password is required.';
      } else if (form.password.length < 8) {
        errs.password = 'Password must be at least 8 characters.';
      }
      if (form.password !== form.confirm_password) {
        errs.confirm_password = 'Passwords do not match.';
      }
      if (Object.keys(errs).length) {
        setErrors(errs);
        return;
      }
    }

    try {
      const purpose = signup ? 'signup' : reset ? 'reset' : 'login';
      const res = await postData('auth/send-whatsapp-otp', { phone: rawNumber, purpose });
      if (!res || (!res.status && !res.success)) {
        setResult(res || { message: 'Failed to send WhatsApp verification code.' });
        return;
      }
      const timestamp = Date.now();
      const cooldownSec = res.cooldown || 60;
      const expiresSec = res.expiresIn || 300;
      setChallenge({
        id: 'whatsapp-auth',
        resendAt: timestamp + (cooldownSec * 1000),
        expiresAt: timestamp + (expiresSec * 1000),
        phone: rawNumber
      });
      setForm(old => ({ ...old, otp: '' }));
      setErrors({});
      setSeverity('success');
      setMessage(res.message || `Verification code sent to WhatsApp (+91 ${rawNumber}). Valid for 5 minutes.`);
    } catch (err) {
      console.error('WhatsApp OTP send error:', err);
      setSeverity('error');
      setMessage(err?.message || 'Service temporarily unavailable, please try again in a few moments.');
    }
  });

  // WhatsApp OTP Verification
  const verifyWhatsAppOtp = () => run(async () => {
    const rawNumber = form.mobileno.trim();
    const rawOtp = form.otp.trim();
    if (!/^[0-9]{6}$/.test(rawOtp)) {
      setErrors({ otp: 'Please enter 6-digit WhatsApp OTP' });
      return;
    }

    try {
      const purpose = signup ? 'signup' : reset ? 'reset' : 'login';
      const payload = {
        phone: rawNumber,
        otp: rawOtp,
        purpose,
        ...(signup ? {
          fname: form.fname,
          lname: form.lname,
          emailid: form.emailid,
          password: form.password,
          confirm_password: form.confirm_password
        } : {}),
        ...(reset ? {
          password: form.password,
          confirm_password: form.confirm_password
        } : {})
      };

      const res = await postData('auth/verify-whatsapp-otp', payload);
      if (!res || (!res.status && !res.success)) {
        setResult(res || { message: 'Verification failed. Please try again.' });
        return;
      }

      clearCachedAccounts();
      if (res.token) {
        localStorage.setItem('sevenshades_token', res.token);
      }
      const user = res.user || (res.data && res.data[0]);
      if (user) {
        dispatch({ type: 'ADD_USER', payLoad: [user.mobileno, user] });
        trackAuthEvent(signup ? 'signup_success' : 'login_success', user.mobileno);
      }

      const destination = location.state?.redirectTo;
      navigate(
        typeof destination === 'string' && destination.startsWith('/') && !destination.startsWith('//')
          ? destination
          : '/home',
        { replace: true, state: location.state?.checkoutState }
      );
    } catch (err) {
      console.error('WhatsApp OTP verify error:', err);
      setMessage(err?.message || 'Verification failed. Please try again.');
    }
  });

  const submit = event => {
    event.preventDefault();

    if (isWhatsApp) {
      if (!challenge) {
        requestWhatsAppOtp();
      } else {
        verifyWhatsAppOtp();
      }
      return;
    }

    // Password login flow (only available on login page when method === 'password')
    run(async () => {
      const body = { mobileno: form.mobileno, password: form.password };
      const check = validateFields('check_costumer_login', body);
      if (Object.keys(check).length) {
        setErrors(check);
        return;
      }

      const result = await postData('check_costumer_login', body);
      if (!result.status) {
        setResult(result);
        return;
      }

      const user = result.data[0];
      clearCachedAccounts();
      if (result.token) {
        localStorage.setItem('sevenshades_token', result.token);
      }
      dispatch({ type: 'ADD_USER', payLoad: [user.mobileno, user] });
      trackAuthEvent('login_success', user.mobileno);

      const destination = location.state?.redirectTo;
      navigate(
        typeof destination === 'string' && destination.startsWith('/') && !destination.startsWith('//')
          ? destination
          : '/home',
        { replace: true, state: location.state?.checkoutState }
      );
    });
  };

  return (
    <main className="customer-auth">
      <aside className="auth-story">
        <Link to="/home" className="auth-wordmark">
          <BrandLogo light size={36} /><span>TRY IT. LOVE IT. KEEP IT.</span>
        </Link>
        <div>
          <p className="auth-eyebrow">YOUR STYLE. YOUR SPACE.</p>
          <h1>Find your fit.<br /><em>At home.</em></h1>
          <p>Try your favourites at your doorstep.<br />Keep only what feels right.</p>
          <div className="auth-steps">
            <span>01 / Choose</span>
            <span>02 / Try</span>
            <span>03 / Keep</span>
          </div>
        </div>
        <p className="auth-footnote">A little more choice. A lot more you.</p>
      </aside>

      <section className="auth-form-side">
        <Box className="auth-card" sx={{ position: 'relative', overflow: 'hidden' }}>
          {busy && (
            <DoordrapeLoader
              overlay
              variant="session"
              text={
                challenge
                  ? 'Verifying WhatsApp code…'
                  : isWhatsApp && !challenge
                  ? 'Sending WhatsApp verification code…'
                  : 'Signing into your account…'
              }
              role="status"
            />
          )}

          <Button component={Link} to="/home" startIcon={<ArrowBack />} sx={{ color: '#666', alignSelf: 'flex-start', mb: 3 }}>
            Back to shopping
          </Button>

          <Typography variant="overline" sx={{ display: 'block', color: '#059669', letterSpacing: 2, fontWeight: 700 }}>
            YOUR DOORDRAPE ACCOUNT
          </Typography>
          <Typography component="h1" variant="h4" sx={{ fontWeight: 800, mt: 1 }}>
            {signup ? 'Make yourself at home.' : reset ? 'A fresh start.' : 'Welcome back.'}
          </Typography>
          <Typography sx={{ color: '#727272', mt: 1, mb: 3 }}>
            {signup
              ? 'Create your account with instant WhatsApp verification.'
              : reset
              ? 'Verify your WhatsApp to set a new password.'
              : 'Sign in with your WhatsApp number or account password.'}
          </Typography>

          {!signup && !reset && (
            <div className="auth-methods">
              <Button
                onClick={() => {
                  setMethod('whatsapp');
                  setChallenge(null);
                  setErrors({});
                  setMessage('');
                }}
                aria-pressed={method === 'whatsapp'}
                startIcon={<WhatsApp sx={{ fontSize: '18px !important', color: method === 'whatsapp' ? '#25d366' : 'inherit' }} />}
              >
                WhatsApp OTP
              </Button>
              <Button
                onClick={() => {
                  setMethod('password');
                  setChallenge(null);
                  setErrors({});
                  setMessage('');
                }}
                aria-pressed={method === 'password'}
              >
                Password
              </Button>
            </div>
          )}

          <Stack component="form" noValidate onSubmit={submit} spacing={2}>
            {location.state?.authMessage && kind === 'login' && (
              <Alert severity="success">{location.state.authMessage}</Alert>
            )}
            {message && <Alert severity={severity} role="status">{message}</Alert>}

            {signup && (
              <div className="auth-name-row">
                {field('fname', 'First name', { autoComplete: 'given-name', inputProps: { maxLength: 70 } })}
                {field('lname', 'Last name', { autoComplete: 'family-name', inputProps: { maxLength: 70 } })}
              </div>
            )}

            {field('mobileno', 'Mobile number', {
              type: 'tel',
              autoComplete: 'tel-national',
              inputProps: { inputMode: 'numeric', maxLength: 10 },
              InputProps: { startAdornment: <InputAdornment position="start">+91</InputAdornment> }
            })}

            {signup && field('emailid', 'Email address', { type: 'email', autoComplete: 'email', inputProps: { maxLength: 70 } })}

            {(signup || reset || method === 'password') && (
              passwordField('password', reset ? 'New password' : 'Password')
            )}

            {(signup || reset) && (
              <>
                <Typography variant="caption" color="text.secondary">
                  Use 8–128 characters. Avoid common or numeric-only passwords.
                </Typography>
                {passwordField('confirm_password', 'Confirm password')}
              </>
            )}

            {challenge && (
              <>
                {field('otp', '6-digit WhatsApp OTP', {
                  autoComplete: 'one-time-code',
                  inputProps: { inputMode: 'numeric', maxLength: 6 }
                })}
                <Typography variant="caption" color={expired ? 'error' : 'text.secondary'}>
                  {expired
                    ? 'OTP expired. Request a new code.'
                    : `OTP expires in ${Math.max(0, Math.ceil((challenge.expiresAt - now) / 1000))} seconds.`}
                </Typography>
                <Stack direction="row" justifyContent="space-between">
                  <Button
                    disabled={busy || cooldown > 0}
                    onClick={requestWhatsAppOtp}
                  >
                    {cooldown ? `Resend in ${cooldown}s` : 'Resend WhatsApp OTP'}
                  </Button>
                  <Button
                    disabled={busy}
                    onClick={() => {
                      setChallenge(null);
                      setForm(old => ({ ...old, otp: '' }));
                    }}
                  >
                    Change mobile
                  </Button>
                </Stack>
              </>
            )}

            {isWhatsApp && !challenge && (
              <Typography variant="caption" sx={{ color: '#047857', display: 'block', textAlign: 'center' }}>
                ⚡ Instant verification via WhatsApp • ₹0 cost • No waiting for SMS
              </Typography>
            )}

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={busy || (expired && !!challenge)}
              startIcon={isWhatsApp && !challenge ? <WhatsApp /> : null}
              sx={{
                bgcolor: isWhatsApp ? '#25d366' : '#064e3b',
                color: '#ffffff',
                borderRadius: 2.5,
                py: 1.5,
                fontWeight: 700,
                boxShadow: isWhatsApp
                  ? '0 4px 14px rgba(37, 211, 102, 0.35)'
                  : '0 4px 14px rgba(6, 78, 59, 0.3)',
                '&:hover': { bgcolor: isWhatsApp ? '#1da851' : '#043629' }
              }}
            >
              {busy
                ? 'Please wait…'
                : isWhatsApp && !challenge
                ? 'Get OTP on WhatsApp'
                : signup
                ? 'Verify & create account'
                : reset
                ? 'Verify & reset password'
                : isWhatsApp
                ? 'Verify & sign in'
                : 'Sign in'}
            </Button>
          </Stack>

          {!signup && !reset && <Link className="auth-link" to="/forgotpassword">Forgot password?</Link>}
          <Typography sx={{ mt: 3, textAlign: 'center', color: '#666' }}>
            {signup || reset ? 'Already have an account? ' : 'New to Doordrape? '}
            <Link className="auth-link" to={signup || reset ? '/signindisplay' : '/signupdisplay'} state={location.state}>
              {signup || reset ? 'Sign in' : 'Create an account'}
            </Link>
          </Typography>
        </Box>
      </section>
    </main>
  );
}
