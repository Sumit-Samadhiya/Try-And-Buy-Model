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

export async function reverseGeocode(latitude, longitude) {
  const result = {
    latitude,
    longitude,
    city: '',
    state: '',
    postcode: '',
    street: '',
    country: 'India',
    formattedAddress: '',
  };

  // Primary: BigDataCloud Client API (Free, fast client-side reverse geocoding)
  try {
    const bdcRes = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
    );
    if (bdcRes.ok) {
      const bdc = await bdcRes.json();
      result.city = bdc.city || bdc.locality || bdc.principalSubdivision || '';
      result.state = bdc.principalSubdivision || '';
      result.postcode = (bdc.postcode || '').replace(/\D/g, '').slice(0, 6);
      result.country = bdc.countryName || 'India';

      const localityParts = [bdc.locality, bdc.city].filter(Boolean);
      result.street = Array.from(new Set(localityParts)).join(', ');
    }
  } catch (err) {
    console.warn('BigDataCloud reverse geocode warning:', err);
  }

  // Secondary Fallback / Enrichment: OpenStreetMap Nominatim (if postcode or street missing)
  if (!result.postcode || !result.street) {
    try {
      const nomRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
        { headers: { 'User-Agent': 'DoorDrapeApp/1.0 (customer-location)' } }
      );
      if (nomRes.ok) {
        const nom = await nomRes.json();
        const addr = nom?.address || {};
        if (!result.postcode && addr.postcode) {
          result.postcode = String(addr.postcode).replace(/\D/g, '').slice(0, 6);
        }
        if (!result.city) {
          result.city = addr.city || addr.town || addr.village || addr.state_district || '';
        }
        if (!result.state && addr.state) {
          result.state = addr.state;
        }

        const streetParts = [
          addr.house_number,
          addr.building,
          addr.road,
          addr.neighbourhood,
          addr.suburb,
        ].filter(Boolean);

        if (streetParts.length > 0) {
          result.street = streetParts.join(', ');
        }
      }
    } catch (err) {
      console.warn('Nominatim reverse geocode fallback warning:', err);
    }
  }

  const fullParts = [result.street, result.city, result.state, result.postcode].filter(Boolean);
  result.formattedAddress = fullParts.join(', ');

  return result;
}

export async function detectAndReverseGeocode() {
  const coords = await detectUserCoordinates();
  return { ...await reverseGeocode(coords.latitude, coords.longitude), ...coords };
}
