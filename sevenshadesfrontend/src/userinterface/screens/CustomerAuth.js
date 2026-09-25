import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Alert, Box, Button, IconButton, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import ArrowBack from '@mui/icons-material/ArrowBack';
import { getData, postData, clearCachedAccounts } from '../../services/FetchDjangoApiServices';
import { validateFields } from '../../services/validation';
import './CustomerAuth.css';

export default function CustomerAuth({ kind = 'login' }) {
  const navigate = useNavigate(), location = useLocation(), dispatch = useDispatch();
  const [method, setMethod] = useState('password');
  const [form, setForm] = useState({ mobileno:'', fname:'', lname:'', emailid:'', password:'', confirm_password:'', otp:'' });
  const [errors, setErrors] = useState({}), [message, setMessage] = useState('');
  const [config, setConfig] = useState(null), [challenge, setChallenge] = useState(null);
  const [busy, setBusy] = useState(false), [showPassword, setShowPassword] = useState(false), [now, setNow] = useState(Date.now());
  const pending = useRef(false);
  const signup = kind === 'signup', reset = kind === 'reset';
  const usesOtp = signup || reset || method === 'otp';
  const purpose = signup ? 'signup' : reset ? 'reset' : 'login';
  const cooldown = Math.max(0, Math.ceil(((challenge?.resendAt || 0) - now) / 1000));
  const expired = challenge && now >= challenge.expiresAt;
  useEffect(() => { getData('otp_config').then(result => setConfig(result.status ? result.data : { available:false })); const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const change = field => event => { setForm(old => ({ ...old, [field]: event.target.value })); setErrors(old => ({ ...old, [field]: '' })); setMessage(''); };
  const setResult = result => { setMessage(result.message || 'Please check your details.'); setErrors(Object.fromEntries(Object.entries(result.errors || {}).map(([key,value]) => [key, Array.isArray(value) ? value.join(' ') : value]))); };
  const field = (name, label, options = {}) => <TextField fullWidth required name={name} label={label} value={form[name]} onChange={change(name)} error={!!errors[name]} helperText={errors[name] || options.helperText} disabled={busy || (name === 'mobileno' && !!challenge)} {...options} />;
  const passwordField = (name, label) => field(name, label, { type:showPassword ? 'text' : 'password', autoComplete:kind === 'login' ? 'current-password' : 'new-password', inputProps:{ maxLength:128 }, InputProps:{ endAdornment:<InputAdornment position="end"><IconButton aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(value => !value)} edge="end">{showPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment> } });
  const run = async callback => { if (pending.current) return; pending.current = true; setBusy(true); setMessage(''); try { await callback(); } finally { setBusy(false); pending.current = false; } };
  const requestOtp = () => run(async () => {
    const check = signup ? validateFields('signup_submit', { ...form, otp:'123456', challenge_id:'pending' }) : reset ? validateFields('reset_password', { mobileno:form.mobileno, password:form.password, confirm_password:form.confirm_password, otp:'123456', challenge_id:'pending' }) : validateFields('otp_request', { mobileno:form.mobileno, purpose });
    if (Object.keys(check).length) { setErrors(check); return; }
    const result = await postData(purpose === 'login' ? 'auth/send-otp/' : 'otp_request', purpose === 'login' ? { phone:form.mobileno } : { mobileno:form.mobileno, purpose });
    if (!result.status) { setResult(result); return; }
    const timestamp = Date.now();
    setChallenge({ id:result.data.challenge_id || 'mobile-login', resendAt:timestamp+result.data.resend_after*1000, expiresAt:timestamp+result.data.expires_in*1000 });
    setForm(old => ({ ...old, otp:'' })); setErrors({}); setMessage(result.message);
  });
  const submit = event => {
    event.preventDefault();
    if (usesOtp && !challenge) { requestOtp(); return; }
    run(async () => {
      const endpoint = signup ? 'signup_submit' : reset ? 'reset_password' : usesOtp ? 'otp_login' : 'check_costumer_login';
      const body = signup ? { ...form, challenge_id:challenge?.id } : reset ? { mobileno:form.mobileno, password:form.password, confirm_password:form.confirm_password, otp:form.otp, challenge_id:challenge?.id } : usesOtp ? { mobileno:form.mobileno, otp:form.otp, challenge_id:challenge.id } : { mobileno:form.mobileno, password:form.password };
      const check = validateFields(endpoint, body);
      if (Object.keys(check).length) { setErrors(check); return; }
      const result = await postData(endpoint === 'otp_login' ? 'auth/verify-otp/' : endpoint, endpoint === 'otp_login' ? { phone:form.mobileno, otp:form.otp } : body);
      if (!result.status) { setResult(result); return; }
      if (signup || reset) {
        if (reset) { clearCachedAccounts(); dispatch({ type:'CLEAR_USER' }); }
        navigate('/signindisplay', { replace:true, state:{ ...location.state, authMessage:result.message } }); return;
      }
      const user = result.data[0]; clearCachedAccounts(); dispatch({ type:'ADD_USER', payLoad:[user.mobileno,user] });
      const destination = location.state?.redirectTo;
      navigate(typeof destination === 'string' && destination.startsWith('/') && !destination.startsWith('//') ? destination : '/home', { replace:true, state:location.state?.checkoutState });
    });
  };
  return <main className="customer-auth">
    <aside className="auth-story"><Link to="/home" className="auth-wordmark">SevenShades<span>TRY IT. LOVE IT. KEEP IT.</span></Link><div><p className="auth-eyebrow">YOUR STYLE. YOUR SPACE.</p><h1>Find your fit.<br /><em>At home.</em></h1><p>Try your favourites at your doorstep.<br />Keep only what feels right.</p><div className="auth-steps"><span>01 / Choose</span><span>02 / Try</span><span>03 / Keep</span></div></div><p className="auth-footnote">A little more choice. A lot more you.</p></aside>
    <section className="auth-form-side"><Box className="auth-card">
      <Button component={Link} to="/home" startIcon={<ArrowBack />} sx={{ color:'#666', alignSelf:'flex-start', mb:3 }}>Back to shopping</Button>
      <Typography variant="overline" sx={{ display:'block', color:'#8b6a3c', letterSpacing:2 }}>YOUR SEVENSHADES ACCOUNT</Typography>
      <Typography component="h1" variant="h4" sx={{ fontWeight:800, mt:1 }}>{signup ? 'Make yourself at home.' : reset ? 'A fresh start.' : 'Welcome back.'}</Typography>
      <Typography sx={{ color:'#727272', mt:1, mb:3 }}>{signup ? 'Create your account and verify your mobile number.' : reset ? 'Verify your mobile to set a new password.' : 'Your next favourite outfit is waiting.'}</Typography>
      {!signup && !reset && <div className="auth-methods"><Button onClick={() => {setMethod('password');setChallenge(null);setErrors({});}} aria-pressed={method === 'password'}>Password</Button><Button onClick={() => {setMethod('otp');setChallenge(null);setErrors({});}} aria-pressed={method === 'otp'}>Login with OTP</Button></div>}
      <Stack component="form" noValidate onSubmit={submit} spacing={2}>
        {location.state?.authMessage && kind === 'login' && <Alert severity="success">{location.state.authMessage}</Alert>}
        {message && <Alert severity="info" role="status">{message}</Alert>}
        {usesOtp && config?.test_mode && <Alert severity="info">Development mode: use OTP <strong>123456</strong>. No SMS is sent.</Alert>}
        {usesOtp && config && !config.available && <Alert severity="warning">OTP delivery is not configured yet.</Alert>}
        {signup && <div className="auth-name-row">{field('fname','First name',{ autoComplete:'given-name', inputProps:{maxLength:70} })}{field('lname','Last name',{autoComplete:'family-name', inputProps:{maxLength:70}})}</div>}
        {field('mobileno','Mobile number',{ type:'tel', autoComplete:'tel-national', inputProps:{ inputMode:'numeric', maxLength:10 }, InputProps:{startAdornment:<InputAdornment position="start">+91</InputAdornment>} })}
        {signup && field('emailid','Email address',{type:'email',autoComplete:'email',inputProps:{maxLength:70}})}
        {(signup || reset || !usesOtp) && passwordField('password',reset ? 'New password' : 'Password')}
        {(signup || reset) && <><Typography variant="caption" color="text.secondary">Use 8–128 characters. Avoid common or numeric-only passwords.</Typography>{passwordField('confirm_password','Confirm password')}</>}
        {challenge && <>{field('otp','6-digit OTP',{autoComplete:'one-time-code',inputProps:{inputMode:'numeric',maxLength:6}})}<Typography variant="caption" color={expired ? 'error' : 'text.secondary'}>{expired ? 'OTP expired. Request a new code.' : 'OTP expires in ' + Math.max(0,Math.ceil((challenge.expiresAt-now)/1000)) + ' seconds.'}</Typography><Stack direction="row" justifyContent="space-between"><Button disabled={busy || cooldown>0} onClick={requestOtp}>{cooldown ? 'Resend in '+cooldown+'s' : 'Resend OTP'}</Button><Button disabled={busy} onClick={() => {setChallenge(null);setForm(old=>({...old,otp:''}));}}>Change mobile</Button></Stack></>}
        {!signup && !reset && !usesOtp && <Link className="auth-forgot" to="/forgotpassword" state={location.state}>Forgot password?</Link>}
        <Button type="submit" variant="contained" size="large" disabled={busy || (usesOtp && (!config?.available || expired))} sx={{ bgcolor:'#242424', borderRadius:2, py:1.5, boxShadow:'none', '&:hover':{bgcolor:'#414141'} }}>{busy ? 'Please wait…' : usesOtp && !challenge ? 'Get OTP' : signup ? 'Verify & create account' : reset ? 'Verify & reset password' : usesOtp ? 'Verify & sign in' : 'Sign in'}</Button>
      </Stack>
      <Typography sx={{ mt:3, textAlign:'center', color:'#666' }}>{signup || reset ? 'Already have an account? ' : 'New to SevenShades? '}<Link className="auth-link" to={signup || reset ? '/signindisplay' : '/signupdisplay'} state={location.state}>{signup || reset ? 'Sign in' : 'Create an account'}</Link></Typography>
    </Box></section>
  </main>;
}
