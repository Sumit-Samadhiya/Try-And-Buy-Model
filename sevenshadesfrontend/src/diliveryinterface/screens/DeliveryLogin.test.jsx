import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DeliveryLogin from './DeliveryLogin';
import { postData } from '../../services/FetchDjangoApiServices';

jest.mock('../../services/FetchDjangoApiServices', () => ({
  postData: jest.fn(),
  clearCachedAccounts: jest.fn(),
}));

describe('DeliveryLogin Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders login cockpit and forgot password trigger', () => {
    render(
      <MemoryRouter>
        <DeliveryLogin />
      </MemoryRouter>
    );

    expect(screen.getByText('Rider Partner Cockpit')).toBeInTheDocument();
    expect(screen.getByLabelText(/Rider ID or Mobile Number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Forgot \/ Reset Password\?/i })).toBeInTheDocument();
  });

  test('opens forgot password modal and sends OTP for registered rider', async () => {
    postData.mockResolvedValueOnce({ status: true, success: true, message: 'OTP sent to WhatsApp' });

    render(
      <MemoryRouter>
        <DeliveryLogin />
      </MemoryRouter>
    );

    // Open forgot password dialog
    fireEvent.click(screen.getByRole('button', { name: /Forgot \/ Reset Password\?/i }));
    expect(await screen.findByText('🔑 Rider Password Reset')).toBeInTheDocument();

    // Enter phone and submit
    fireEvent.change(screen.getByLabelText(/Registered Mobile Number/i), {
      target: { value: '9876543210' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Send Verification Code/i }));

    await waitFor(() => {
      expect(postData).toHaveBeenCalledWith('auth/send-whatsapp-otp', {
        phone: '9876543210',
        purpose: 'rider_reset',
      });
    });

    // Step 2 should display OTP and new password fields
    expect(await screen.findByLabelText(/6-Digit OTP Code/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^New Password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Confirm New Password$/i)).toBeInTheDocument();
  });

  test('completes self-service password reset with valid OTP and matching passwords', async () => {
    postData
      .mockResolvedValueOnce({ status: true, success: true, message: 'OTP sent' })
      .mockResolvedValueOnce({ status: true, success: true, message: 'Rider password reset successfully' });

    render(
      <MemoryRouter>
        <DeliveryLogin />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Forgot \/ Reset Password\?/i }));
    fireEvent.change(screen.getByLabelText(/Registered Mobile Number/i), {
      target: { value: '9876543210' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Send Verification Code/i }));

    const otpInput = await screen.findByLabelText(/6-Digit OTP Code/i);
    fireEvent.change(otpInput, { target: { value: '123456' } });
    fireEvent.change(screen.getByLabelText(/^New Password$/i), { target: { value: 'NewSecurePass123!' } });
    fireEvent.change(screen.getByLabelText(/^Confirm New Password$/i), { target: { value: 'NewSecurePass123!' } });

    fireEvent.click(screen.getByRole('button', { name: /Reset Password & Finish/i }));

    await waitFor(() => {
      expect(screen.getByText(/Password reset successfully!/i)).toBeInTheDocument();
    });
  });
});
