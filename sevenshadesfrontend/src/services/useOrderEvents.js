import { useEffect, useRef } from 'react';
import { serverURL } from './FetchDjangoApiServices';

export default function useOrderEvents(onEvent, enabled = true, orderId = null) {
  const callback = useRef(onEvent);
  callback.current = onEvent;
  useEffect(() => {
    if (!enabled) return;
    let socket, retry, stopped = false, delay = 1000;
    const connect = () => {
      if (stopped || typeof WebSocket === 'undefined') return;
      socket = new WebSocket(serverURL.replace(/^http/, 'ws') + (orderId ? '/ws/order/' + encodeURIComponent(orderId) + '/' : '/ws/orders/'));
      socket.onopen = () => { delay = 1000; callback.current({ reason: 'reconnected' }); };
      socket.onmessage = event => {
        try { const payload = JSON.parse(event.data); callback.current(payload.data || {}); } catch { /* Ignore malformed event; polling reconciles state. */ }
      };
      socket.onclose = event => {
        if (!stopped && event.code !== 4403) { retry = setTimeout(connect, delay); delay = Math.min(delay * 2, 15000); }
      };
    };
    connect();
    const poll = setInterval(() => callback.current({ reason: 'refresh' }), 15000);
    return () => { stopped = true; clearTimeout(retry); clearInterval(poll); socket?.close(); };
  }, [enabled, orderId]);
}
