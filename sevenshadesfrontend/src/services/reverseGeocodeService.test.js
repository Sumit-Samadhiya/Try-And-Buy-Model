import { detectUserCoordinates, reverseGeocode, detectAndReverseGeocode } from './reverseGeocodeService';

describe('reverseGeocodeService', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('reverseGeocode resolves locality, city and postcode from BigDataCloud', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        city: 'New Delhi',
        principalSubdivision: 'Delhi',
        postcode: '110001',
        countryName: 'India',
        locality: 'Connaught Place',
      }),
    });

    const result = await reverseGeocode(28.6315, 77.2167);
    expect(result.city).toBe('New Delhi');
    expect(result.postcode).toBe('110001');
    expect(result.country).toBe('India');
    expect(result.street).toContain('Connaught Place');
  });

  test('reverseGeocode falls back to OpenStreetMap Nominatim when postcode is empty in BigDataCloud', async () => {
    // BigDataCloud returns empty postcode
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        city: 'South Delhi',
        principalSubdivision: 'Delhi',
        postcode: '',
        countryName: 'India',
        locality: 'Hauz Khas',
      }),
    });

    // Nominatim fallback returns accurate postal code & road
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        address: {
          road: 'Aurobindo Marg',
          suburb: 'Hauz Khas',
          city: 'New Delhi',
          postcode: '110016',
          state: 'Delhi',
        },
      }),
    });

    const result = await reverseGeocode(28.5494, 77.2001);
    expect(result.postcode).toBe('110016');
    expect(result.street).toContain('Aurobindo Marg');
  });

  test('detectUserCoordinates extracts navigator.geolocation coords when available', async () => {
    const mockGeolocation = {
      getCurrentPosition: jest.fn().mockImplementation((success) =>
        success({
          coords: {
            latitude: 28.6139,
            longitude: 77.209,
            accuracy: 10,
          },
        })
      ),
    };
    global.navigator.geolocation = mockGeolocation;

    const coords = await detectUserCoordinates();
    expect(coords.latitude).toBe(28.6139);
    expect(coords.longitude).toBe(77.209);
    expect(coords.accuracy).toBe(10);
    expect(coords.source).toBe('device_gps');
  });

  test('detectUserCoordinates falls back to IP geolocation when browser GPS times out', async () => {
    // Browser geolocation times out (error code 3)
    const mockGeolocation = {
      getCurrentPosition: jest.fn().mockImplementation((_, error) =>
        error({ code: 3, message: 'Location request timed out.' })
      ),
    };
    global.navigator.geolocation = mockGeolocation;

    // IP geolocation fetch mock
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        latitude: 26.45,
        longitude: 80.32,
        city: 'Kanpur',
        principalSubdivision: 'Uttar Pradesh',
        countryName: 'India',
        locality: 'Kanpur',
        postcode: '208001',
      }),
    });

    const coords = await detectUserCoordinates();
    expect(coords.latitude).toBe(26.45);
    expect(coords.longitude).toBe(80.32);
    expect(coords.source).toBe('ip_geolocation');
  });
});
