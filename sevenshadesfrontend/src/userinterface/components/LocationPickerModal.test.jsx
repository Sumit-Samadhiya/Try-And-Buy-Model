import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LocationPickerModal from './LocationPickerModal';

jest.mock('../../services/reverseGeocodeService', () => ({
  reverseGeocode: jest.fn().mockResolvedValue({
    city: 'Jhansi',
    state: 'Uttar Pradesh',
    postcode: '284121',
    street: 'Baragaon Road',
    formattedAddress: 'Baragaon Road, Jhansi, Uttar Pradesh, 284121',
  }),
}));

jest.mock('leaflet', () => ({
  map: jest.fn(() => ({
    setView: jest.fn(),
    remove: jest.fn(),
    invalidateSize: jest.fn(),
    on: jest.fn(),
  })),
  control: { zoom: jest.fn(() => ({ addTo: jest.fn() })) },
  tileLayer: jest.fn(() => ({ addTo: jest.fn() })),
  marker: jest.fn(() => ({
    addTo: jest.fn().mockReturnThis(),
    setLatLng: jest.fn().mockReturnThis(),
    on: jest.fn(),
  })),
  divIcon: jest.fn(() => ({})),
}));

describe('LocationPickerModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders quick jump Jhansi hubs and confirms location', async () => {
    const onConfirmLocation = jest.fn();
    const onClose = jest.fn();

    render(
      <LocationPickerModal
        open={true}
        onClose={onClose}
        initialLat={25.5184}
        initialLng={78.6821}
        initialCity="Jhansi"
        onConfirmLocation={onConfirmLocation}
      />
    );

    expect(screen.getByText(/Pinpoint Exact Delivery Location/i)).toBeInTheDocument();
    expect(screen.getByText(/Baragaon \(284121\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Sipri Bazar \(284002\)/i)).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /Confirm & Use This Location/i });
    fireEvent.click(confirmBtn);

    expect(onConfirmLocation).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
