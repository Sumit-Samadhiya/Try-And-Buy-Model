import { detectUserCoordinates, reverseGeocode, detectAndReverseGeocode } from './reverseGeocodeService';
import { postData } from './FetchDjangoApiServices';

jest.mock('./FetchDjangoApiServices', () => ({
  postData: jest.fn(),
}));

describe('reverseGeocodeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('reverseGeocode resolves address details from geocoding service', async () => {
    postData.mockResolvedValueOnce({
      status: true,
      results: [
        {
          city: 'New Delhi',
          state: 'Delhi',
          postcode: '110001',
          country: 'India',
          street: 'Connaught Place',
          formattedAddress: 'Connaught Place, New Delhi, Delhi 110001',
        },
      ],
    });

    const result = await reverseGeocode(28.6315, 77.2167);
    expect(result.city).toBe('New Delhi');
    expect(result.postcode).toBe('110001');
    expect(result.country).toBe('India');
    expect(result.street).toContain('Connaught Place');
    expect(result.available).toBe(true);
    expect(postData).toHaveBeenCalledWith('geocoding', {
      mode: 'reverse',
      latitude: 28.6315,
      longitude: 77.2167,
    });
  });

  test('reverseGeocode handles unavailable service gracefully', async () => {
    postData.mockResolvedValueOnce({
      status: false,
      results: [],
    });

    const result = await reverseGeocode(28.5494, 77.2001);
    expect(result.city).toBe('');
    expect(result.postcode).toBe('');
    expect(result.latitude).toBe(28.5494);
    expect(result.longitude).toBe(77.2001);
    expect(result.available).toBe(false);
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
    expect(coords.source).toBe('device_location');
  });

  test('detectUserCoordinates rejects when accuracy is too low', async () => {
    const mockGeolocation = {
      getCurrentPosition: jest.fn().mockImplementation((success) =>
        success({
          coords: {
            latitude: 28.6139,
            longitude: 77.209,
            accuracy: 500, // too approximate (> 100m)
          },
        })
      ),
    };
    global.navigator.geolocation = mockGeolocation;

    await expect(detectUserCoordinates()).rejects.toThrow(/too approximate/i);
  });

  test('detectUserCoordinates rejects on permission denied error', async () => {
    const mockGeolocation = {
      getCurrentPosition: jest.fn().mockImplementation((_, error) =>
        error({ code: 1, message: 'User denied Geolocation' })
      ),
    };
    global.navigator.geolocation = mockGeolocation;

    await expect(detectUserCoordinates()).rejects.toThrow(/permission denied/i);
  });
});
