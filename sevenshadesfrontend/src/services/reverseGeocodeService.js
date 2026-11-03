import { postData } from './FetchDjangoApiServices';

/** Device location only: never substitute an ISP gateway for a doorstep. */
export async function detectUserCoordinates() {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    throw new Error('Device location is unavailable. Please select your entrance on the map or enter your address manually.');
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(position => {
      const { latitude, longitude, accuracy } = position.coords;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
          Math.abs(latitude) > 90 || Math.abs(longitude) > 180 ||
          !Number.isFinite(accuracy) || accuracy < 0 || accuracy > 100) {
        reject(new Error('Device location is too approximate for delivery. Enable precise location on your phone, retry near a window, or select your entrance on the map.'));
        return;
      }
      // Browsers do not reveal whether GPS, Wi-Fi or another source was used.
      resolve({ latitude, longitude, accuracy, source: 'device_location', isIpFallback: false });
    }, error => {
      reject(new Error(error.code === 1
        ? 'Location permission denied. Allow precise location in browser settings, or enter your address manually.'
        : 'Could not get a fresh device location. Retry with phone location enabled, or select your entrance on the map.'));
    }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
  });
}


let unavailableUntil = 0;
export async function lookupAddress(body) {
  if (Date.now() < unavailableUntil) return { status: false, results: [] };
  let timer;
  try {
    const result = await Promise.race([
      postData('geocoding', body),
      new Promise(resolve => { timer = setTimeout(() => resolve({ status: false, results: [] }), 5000); }),
    ]);
    if (!result?.status) unavailableUntil = Date.now() + 30000;
    return result || { status: false, results: [] };
  } catch (_) {
    unavailableUntil = Date.now() + 30000;
    return { status: false, results: [] };
  } finally { clearTimeout(timer); }
}

export async function reverseGeocode(latitude, longitude) {
  const response = await lookupAddress({ mode: 'reverse', latitude, longitude });
  return {
    city: '', state: '', country: '', postcode: '', street: '', formattedAddress: '',
    ...(response.results?.[0] || {}),
    // A geocoder may snap to a nearby street: never replace the customer's pin.
    latitude, longitude,
    available: Boolean(response.status && response.results?.length),
  };
}

export async function detectAndReverseGeocode() {
  // Address enrichment happens after the map opens; do not delay device feedback.
  return detectUserCoordinates();
}
