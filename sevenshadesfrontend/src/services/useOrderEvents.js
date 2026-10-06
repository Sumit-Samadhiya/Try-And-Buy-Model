import { useEffect, useRef } from 'react';
import { serverURL } from './FetchDjangoApiServices';

export default function useOrderEvents(onEvent, enabled = true, orderId = null) {
  const callback = useRef(onEvent);
  callback.current = onEvent;

  useEffect(() => {
    if (!enabled) return;
    let socket, retry, pingTimer, stopped = false, delay = 1000;

    const connect = () => {
      if (stopped || typeof WebSocket === 'undefined') return;
      socket = new WebSocket(
        serverURL.replace(/^http/, 'ws') +
          (orderId ? '/ws/order/' + encodeURIComponent(orderId) + '/' : '/ws/orders/')
      );

      socket.onopen = () => {
        delay = 1000;
        // Keep-alive ping every 25 seconds to prevent reverse proxy/Render idle disconnection
        clearInterval(pingTimer);
        pingTimer = setInterval(() => {
          if (socket?.readyState === WebSocket.OPEN) {
            try {
              socket.send(JSON.stringify({ type: 'ping' }));
            } catch (_) {}
          }
        }, 25000);
      };

      socket.onmessage = event => {
        try {
          const payload = JSON.parse(event.data);
          if (payload?.data) {
            callback.current(payload.data);
          }
        } catch {
          /* Ignore non-JSON ping/pong or malformed event */
        }
      };

      socket.onclose = event => {
        clearInterval(pingTimer);
        if (!stopped && event.code !== 4403) {
          retry = setTimeout(connect, delay);
          delay = Math.min(delay * 2, 30000);
        }
      };

      socket.onerror = () => {
        /* Socket error handled gracefully by onclose reconnection */
      };
    };

    connect();

    return () => {
      stopped = true;
      clearTimeout(retry);
      clearInterval(pingTimer);
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
    };
  }, [enabled, orderId]);
}
