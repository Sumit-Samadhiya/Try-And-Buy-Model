/**
 * Zero-Cost Reverse Geocoding Service for DoorDrape
 * Uses BigDataCloud Free Client API + OpenStreetMap Nominatim fallback
 * Zero API keys or subscriptions required.
 */

export async function detectUserCoordinates() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        let msg = 'Unable to retrieve location.';
        if (error.code === 1) msg = 'Location access was denied. Please allow location access in your browser settings.';
        else if (error.code === 2) msg = 'Position unavailable. Check your device GPS connection.';
        else if (error.code === 3) msg = 'Location request timed out. Please retry.';
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
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
  const addressDetails = await reverseGeocode(coords.latitude, coords.longitude);
  return {
    ...coords,
    ...addressDetails,
  };
}
