/**
 * Zero-Cost Reverse Geocoding Service for DoorDrape
 * Multi-Tier Fail-Safe Architecture:
 * 1. Device Hardware GPS (for mobile phones with GPS enabled)
 * 2. Standard Wi-Fi / Cell tower triangulation
 * 3. Automatic IP-based Geolocation Fallback (with isIpFallback flag)
 * 4. OpenStreetMap Nominatim enrichment for PIN code & street precision
 * 100% Free, Zero API Keys, Zero Timeouts.
 */

export async function detectUserCoordinates() {
  // Tier 1: Try real device GPS first (high accuracy)
  if (typeof window !== 'undefined' && navigator.geolocation) {
    try {
      const coords = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) =>
            resolve({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              source: 'device_gps',
              isIpFallback: false,
            }),
          (err) => reject(err),
          {
            enableHighAccuracy: true,
            timeout: 6000,
            maximumAge: 60000,
          }
        );
      });
      return coords;
    } catch (highErr) {
      // Tier 2: Standard Wi-Fi / Cell positioning fallback
      try {
        const coords = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (pos) =>
              resolve({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
                source: 'browser_standard',
                isIpFallback: false,
              }),
            (err) => reject(err),
            {
              enableHighAccuracy: false,
              timeout: 4000,
              maximumAge: 300000,
            }
          );
        });
        return coords;
      } catch (stdErr) {
        console.warn('Browser GPS unavailable on this device, using IP fallback:', stdErr?.message);
      }
    }
  }

  // Tier 3: IP-Based Geolocation via BigDataCloud Client API
  // Note: On desktop / broadband Wi-Fi, this detects the ISP's regional routing gateway (e.g. Kanpur for UP)
  try {
    const bdcRes = await fetch(
      'https://api.bigdatacloud.net/data/reverse-geocode-client?localityLanguage=en'
    );
    if (bdcRes.ok) {
      const bdc = await bdcRes.json();
      if (bdc && (bdc.latitude || bdc.longitude)) {
        return {
          latitude: Number(bdc.latitude),
          longitude: Number(bdc.longitude),
          accuracy: 5000,
          source: 'ip_geolocation',
          isIpFallback: true,
          ipData: bdc,
        };
      }
    }
  } catch (ipErr) {
    console.warn('IP geolocation fallback note:', ipErr);
  }

  throw new Error('Unable to detect location automatically. Please enter your PIN code manually.');
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

  let addressDetails;
  if (coords.ipData) {
    const ip = coords.ipData;
    addressDetails = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      city: ip.city || ip.locality || ip.principalSubdivision || '',
      state: ip.principalSubdivision || '',
      postcode: (ip.postcode || '').replace(/\D/g, '').slice(0, 6),
      country: ip.countryName || 'India',
      street: ip.locality || ip.city || '',
      formattedAddress: [ip.locality, ip.city, ip.principalSubdivision].filter(Boolean).join(', '),
    };

    if (!addressDetails.postcode && coords.latitude && coords.longitude) {
      try {
        const nomRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`,
          { headers: { 'User-Agent': 'DoorDrapeApp/1.0 (customer-location)' } }
        );
        if (nomRes.ok) {
          const nom = await nomRes.json();
          const addr = nom?.address || {};
          if (addr.postcode) {
            addressDetails.postcode = String(addr.postcode).replace(/\D/g, '').slice(0, 6);
          }
          if (!addressDetails.city) {
            addressDetails.city = addr.city || addr.town || addr.village || '';
          }
          if (addr.road || addr.suburb) {
            addressDetails.street = [addr.road, addr.suburb].filter(Boolean).join(', ');
          }
        }
      } catch (_) {}
    }
  } else {
    addressDetails = await reverseGeocode(coords.latitude, coords.longitude);
  }

  return {
    ...coords,
    ...addressDetails,
    isIpFallback: coords.isIpFallback,
  };
}
