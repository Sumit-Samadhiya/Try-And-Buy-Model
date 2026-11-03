import { startRiderLocationTracking } from './riderLocationTracker';
import { postData } from './FetchDjangoApiServices';

jest.mock('./FetchDjangoApiServices', () => ({
  postData: jest.fn(),
}));

describe('riderLocationTracker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('throttles position updates to prevent flooding', () => {
    let watchCallback;
    const mockWatch = jest.fn((cb) => {
      watchCallback = cb;
      return 101;
    });
    const mockClear = jest.fn();

    global.navigator.geolocation = {
      watchPosition: mockWatch,
      clearWatch: mockClear,
    };

    postData.mockResolvedValue({ status: true });
    const onLocationSent = jest.fn();

    const tracker = startRiderLocationTracking('ORDER-123', {
      intervalMs: 3000,
      onLocationSent,
    });

    expect(mockWatch).toHaveBeenCalled();

    // Trigger position 1
    watchCallback({
      coords: { latitude: 28.61, longitude: 77.21, heading: 45, speed: 5, accuracy: 5 },
    });

    expect(postData).toHaveBeenCalledTimes(1);
    expect(postData).toHaveBeenCalledWith('rider_location', {
      latitude: 28.61,
      longitude: 77.21,
      heading: 45,
      order_id: 'ORDER-123',
    });

    // Trigger position 2 immediately (within 3000ms throttle interval)
    watchCallback({
      coords: { latitude: 28.6105, longitude: 77.2105, heading: 50, speed: 6, accuracy: 5 },
    });

    // Should still be 1 call because throttled
    expect(postData).toHaveBeenCalledTimes(1);

    tracker.stop();
    expect(mockClear).toHaveBeenCalledWith(101);
  });
});
