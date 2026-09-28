import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { getData, clearCachedAccounts } from './FetchDjangoApiServices';
import DoordrapeLoader from '../userinterface/components/DoordrapeLoader';

let activeVerifiedSession = { role: null, timestamp: 0, data: null };

export const resetVerifiedSession = () => {
  activeVerifiedSession = { role: null, timestamp: 0, data: null };
};

export default function RequireSession({ role, children }) {
  const isCached = activeVerifiedSession.role === role && (Date.now() - activeVerifiedSession.timestamp < 300000);
  const [status, setStatus] = useState(isCached ? 'allowed' : 'loading');
  const location = useLocation();
  const dispatch = useDispatch();

  useEffect(() => {
    let active = true;

    // If already verified in memory for this role, we can stay allowed and skip blocking loader
    if (activeVerifiedSession.role === role && (Date.now() - activeVerifiedSession.timestamp < 300000)) {
      setStatus('allowed');
      return () => { active = false; };
    }

    setStatus('loading');
    getData('auth_session').then(result => {
      if (!active) return;
      if (result.status && result.role === role) {
        activeVerifiedSession = { role, timestamp: Date.now(), data: result.data };
        clearCachedAccounts(true);
        if (role === 'customer') dispatch({ type: 'ADD_USER', payLoad: [result.data.mobileno, result.data] });
        // Riders read this back to look up their own tasks, so keep only the
        // fields those screens need rather than mirroring the whole account.
        if (role === 'rider') localStorage.setItem('delivery_boy_auth_v1', JSON.stringify({
          rider_id: result.data.rider_id, name: result.data.name,
          phone: result.data.phone, zone: result.data.zone,
        }));
        setStatus('allowed');
      } else {
        activeVerifiedSession = { role: null, timestamp: 0, data: null };
        setStatus('denied');
      }
    }).catch(() => {
      if (!active) return;
      // Do not boot out if previously allowed; only deny if explicitly rejected
      if (activeVerifiedSession.role !== role) {
        setStatus('denied');
      }
    });

    const expire = () => {
      activeVerifiedSession = { role: null, timestamp: 0, data: null };
      setStatus('denied');
    };
    window.addEventListener('session-cleared', expire);
    return () => { active = false; window.removeEventListener('session-cleared', expire); };
  }, [role, dispatch]);

  if (status === 'loading') return <DoordrapeLoader fullPage variant={role === 'admin' ? 'admin' : role === 'rider' ? 'delivery' : 'session'} text="Checking your session…" role="status" />;
  if (status === 'denied') {
    const to = role === 'admin' ? '/adminlogin' : role === 'rider' ? '/delivery/login' : '/signindisplay';
    return <Navigate to={to} replace state={{ redirectTo: location.pathname, checkoutState: location.state }} />;
  }
  return children;
}
