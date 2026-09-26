import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { getData, clearCachedAccounts } from './FetchDjangoApiServices';

export default function RequireSession({ role, children }) {
  const [status, setStatus] = useState('loading');
  const location = useLocation();
  const dispatch = useDispatch();
  useEffect(() => {
    let active = true;
    setStatus('loading');
    getData('auth_session').then(result => {
      if (!active) return;
      if (result.status && result.role === role) {
        clearCachedAccounts(true);
        if (role === 'customer') dispatch({ type: 'ADD_USER', payLoad: [result.data.mobileno, result.data] });
        // Riders read this back to look up their own tasks, so keep only the
        // fields those screens need rather than mirroring the whole account.
        if (role === 'rider') localStorage.setItem('delivery_boy_auth_v1', JSON.stringify({
          rider_id: result.data.rider_id, name: result.data.name,
          phone: result.data.phone, zone: result.data.zone,
        }));
        setStatus('allowed');
      } else setStatus('denied');
    });
    const expire = () => setStatus('denied');
    window.addEventListener('session-cleared', expire);
    return () => { active = false; window.removeEventListener('session-cleared', expire); };
  }, [role, location.pathname, dispatch]);
  if (status === 'loading') return <p style={{ padding: 24 }}>Checking your session…</p>;
  if (status === 'denied') {
    const to = role === 'admin' ? '/adminlogin' : role === 'rider' ? '/delivery/login' : '/signindisplay';
    return <Navigate to={to} replace state={{ redirectTo: location.pathname, checkoutState: location.state }} />;
  }
  return children;
}
