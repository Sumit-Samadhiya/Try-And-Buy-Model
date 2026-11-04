import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LiveRiderTrackingMap from './LiveRiderTrackingMap';
import { postData } from '../../services/FetchDjangoApiServices';

jest.mock('../../services/FetchDjangoApiServices', () => ({
  postData: jest.fn(),
}));

jest.mock('../../services/useOrderEvents', () => () => {});

jest.mock('leaflet', () => ({
  map: jest.fn(() => ({
    setView: jest.fn(),
    fitBounds: jest.fn(),
    remove: jest.fn(),
    invalidateSize: jest.fn(),
  })),
  control: { zoom: jest.fn(() => ({ addTo: jest.fn() })) },
  tileLayer: jest.fn(() => ({ addTo: jest.fn() })),
  marker: jest.fn(() => ({
    addTo: jest.fn().mockReturnThis(),
    bindPopup: jest.fn().mockReturnThis(),
    setLatLng: jest.fn().mockReturnThis(),
    setIcon: jest.fn().mockReturnThis(),
  })),
  polyline: jest.fn(() => ({
    addTo: jest.fn().mockReturnThis(),
    setLatLngs: jest.fn().mockReturnThis(),
    setStyle: jest.fn().mockReturnThis(),
  })),
  divIcon: jest.fn(() => ({})),
  latLngBounds: jest.fn(() => ({})),
}));

describe('LiveRiderTrackingMap', () => {
  const mockOrderData = {
    try_order: {
      order_id: 'TRL-LIVE-001',
      address_text: 'Flat 402, Green Valley Apartments',
      city: 'Delhi',
      postcode: '110001',
      delivery_slot: '04:00 PM - 05:00 PM',
      latitude: 28.6139,
      longitude: 77.209,
    },
    customer_location: {
      latitude: 28.6139,
      longitude: 77.209,
      address_text: 'Flat 402, Green Valley Apartments',
      city: 'Delhi',
      postcode: '110001',
    },
    rider_info: {
      name: 'Ramesh Kumar',
      phone: '9876543210',
      bike_number: 'DL-01-AB-1234',
      latitude: 28.625,
      longitude: 77.215,
      updated_at: new Date().toISOString(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders rider info, phone call action, and estimated distance', async () => {
    postData.mockResolvedValueOnce({
      status: true,
      data: mockOrderData,
    });

    render(<LiveRiderTrackingMap orderId="TRL-LIVE-001" open={true} embedded={true} />);

    expect(await screen.findByText(/Live Doorstep Delivery Tracking/i)).toBeInTheDocument();
    expect(await screen.findByText(/Ramesh Kumar/i)).toBeInTheDocument();
    expect(screen.getByText(/DL-01-AB-1234/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Call/i })).toHaveAttribute('href', 'tel:9876543210');
    expect(screen.getByText(/km straight-line distance/i)).toBeInTheDocument();
    expect(screen.getByText(/Slot: 04:00 PM - 05:00 PM/i)).toBeInTheDocument();
  });

  test('renders road ETA display and OSRM engine when provided', async () => {
    const dataWithRoadRoute = {
      ...mockOrderData,
      rider_info: {
        ...mockOrderData.rider_info,
        eta_display: '~14 mins (3.4 km road route)',
        routing_engine: 'OSRM Turn-by-Turn Road Route',
        route_polyline: [[28.625, 77.215], [28.618, 77.212], [28.6139, 77.209]],
      },
    };

    postData.mockResolvedValueOnce({
      status: true,
      data: dataWithRoadRoute,
    });

    render(<LiveRiderTrackingMap orderId="TRL-LIVE-001" open={true} embedded={true} />);

    expect(await screen.findByText(/~14 mins \(3.4 km road route\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Slot: 04:00 PM - 05:00 PM • 15m Doorstep Trial/i)).toBeInTheDocument();
  });

  test('calls onClose when close button is clicked in dialog mode', async () => {
    postData.mockResolvedValueOnce({
      status: true,
      data: mockOrderData,
    });

    const handleClose = jest.fn();
    render(<LiveRiderTrackingMap orderId="TRL-LIVE-001" open={true} onClose={handleClose} />);

    const closeBtn = await screen.findByTestId('CloseRoundedIcon');
    fireEvent.click(closeBtn.closest('button'));

    expect(handleClose).toHaveBeenCalled();
  });
});
