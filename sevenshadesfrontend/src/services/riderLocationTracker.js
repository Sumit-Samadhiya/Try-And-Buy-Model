/**
 * Rider Live GPS Location Tracker
 * Continuously monitors rider device GPS and pushes throttled updates (every 3-4s)
 * to DoorDrape backend (/api/rider_location), which relays them to customers over Django Channels WebSockets.
 */

import { postData } from './FetchDjangoApiServices';

export function startRiderLocationTracking(orderId, options = {}) {
  const {
    intervalMs = 4000,
    onLocationSent = () => {},
    onError = () => {},
  } = options;

  if (typeof window === 'undefined' || !navigator.geolocation) {
    onError(new Error('Geolocation is not supported on this device.'));
    return { stop: () => {} };
  }

  let lastSentTime = 0;
  let isSending = false;

  const handlePosition = async (pos) => {
    const now = Date.now();
    // Throttle updates to protect mobile battery and server bandwidth
    if (now - lastSentTime < intervalMs || isSending) {
      return;
    }

    const { latitude, longitude, heading, speed, accuracy } = pos.coords;
    isSending = true;
    lastSentTime = now;

    try {
      const payload = {
        latitude,
        longitude,
        heading: typeof heading === 'number' && !isNaN(heading) ? heading : 0,
      };

      if (orderId) {
        payload.order_id = String(orderId);
      }

      const res = await postData('rider_location', payload);
      if (res && res.status) {
        onLocationSent({
          latitude,
          longitude,
          heading: payload.heading,
          speed,
          accuracy,
          timestamp: now,
          orderId,
        });
      }
    } catch (err) {
      console.warn('Failed to stream rider location:', err);
    } finally {
      isSending = false;
    }
  };

  const handleError = (err) => {
    console.error('Rider GPS watch error:', err);
    onError(err);
  };

  const watchId = navigator.geolocation.watchPosition(handlePosition, handleError, {
    enableHighAccuracy: true,
    maximumAge: 2000,
    timeout: 5000,
  });

  return {
    stop: () => {
      try {
        navigator.geolocation.clearWatch(watchId);
      } catch (e) {
        /* ignore */
      }
    },
  };
}
