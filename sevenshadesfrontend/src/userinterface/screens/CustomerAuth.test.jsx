import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import CustomerAuth from './CustomerAuth';
import RootReducer from '../../storage/RootReducer';
import { postData } from '../../services/FetchDjangoApiServices';

jest.mock('../../services/FetchDjangoApiServices', () => ({
  getData: jest.fn(),
  postData: jest.fn(),
  clearCachedAccounts: jest.fn()
}));

jest.mock('../../services/analytics', () => ({
  trackAuthEvent: jest.fn(),
  trackEvent: jest.fn()
}));

let currentView = null;

function show(kind = 'login') {
  if (currentView) {
    try { currentView.unmount(); } catch (_) {}
    currentView = null;
  }
  currentView = render(
    <Provider store={createStore(RootReducer)}>
      <MemoryRouter initialEntries={['/auth']}>
        <Routes>
          <Route path="/auth" element={<CustomerAuth kind={kind} />} />
          <Route path="/home" element={<div>Signed in home</div>} />
          <Route path="/signindisplay" element={<div>Sign in after verification</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
  return currentView;
}

function fill(label, value) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

beforeEach(() => {
  jest.clearAllMocks();
  postData.mockReset();
  if (typeof localStorage !== 'undefined') {
    localStorage.clear();
  }
});

afterEach(() => {
  if (currentView) {
    try { currentView.unmount(); } catch (_) {}
    currentView = null;
  }
  cleanup();
});

test('invalid login fields show inline errors without a request', async () => {
  show();
  await screen.findByText('Welcome back.');

  // Switch to Password tab
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Password' }));
  });

  fill(/Mobile number/, '123');
  fill(/^Password/, 'test');
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Sign in', exact: true }));
  });
  expect(await screen.findByText(/10-digit mobile/)).toBeInTheDocument();
  expect(postData).not.toHaveBeenCalled();
});

test('WhatsApp OTP login requests OTP and logs in successfully', async () => {
  postData
    .mockResolvedValueOnce({
      status: true,
      success: true,
      message: 'OTP sent to your WhatsApp successfully.',
      phone: '9876543210',
      cooldown: 60,
      expiresIn: 300
    })
    .mockResolvedValueOnce({
      status: true,
      success: true,
      token: 'jwt-whatsapp-token-abc',
      user: { mobileno: '9876543210', fname: 'Customer' },
      data: [{ mobileno: '9876543210', fname: 'Customer' }]
    });

  show();
  await screen.findByText('Welcome back.');

  fill(/Mobile number/, '9876543210');

  // Click Get OTP on WhatsApp
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /Get OTP on WhatsApp/i }));
  });

  expect(postData).toHaveBeenCalledWith('auth/send-whatsapp-otp', {
    phone: '9876543210',
    purpose: 'login'
  });
  expect(await screen.findByText(/OTP sent to your WhatsApp/i)).toBeInTheDocument();

  // Enter 6-digit WhatsApp OTP
  fill(/WhatsApp OTP/, '654321');

  // Submit verification
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /Verify & sign in/i }));
  });

  expect(postData).toHaveBeenCalledWith('auth/verify-whatsapp-otp', {
    phone: '9876543210',
    otp: '654321',
    purpose: 'login'
  });
  expect(await screen.findByText('Signed in home')).toBeInTheDocument();
  expect(localStorage.getItem('sevenshades_token')).toBe('jwt-whatsapp-token-abc');
});

test('signup rejects mismatched confirmation before requesting WhatsApp OTP', async () => {
  show('signup');
  await screen.findByText(/Create your account/);
  fill(/First name/, 'New');
  fill(/Last name/, 'User');
  fill(/Mobile number/, '9000000091');
  fill(/Email address/, 'new@example.test');
  fill(/^Password/, 'Strong-example!429');
  fill(/Confirm password/, 'different');

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /Get OTP on WhatsApp/i }));
  });

  expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument();
  expect(postData).not.toHaveBeenCalled();
});

test('signup sends registration details with WhatsApp OTP verification', async () => {
  postData
    .mockResolvedValueOnce({
      status: true,
      success: true,
      message: 'OTP sent to your WhatsApp successfully.',
      phone: '9000000091'
    })
    .mockResolvedValueOnce({
      status: true,
      success: true,
      token: 'jwt-new-user-token',
      created: true,
      user: { mobileno: '9000000091', fname: 'New' }
    });

  show('signup');
  fill(/First name/, 'New');
  fill(/Last name/, 'User');
  fill(/Mobile number/, '9000000091');
  fill(/Email address/, 'new@example.test');
  fill(/^Password/, 'Strong-pass!429');
  fill(/Confirm password/, 'Strong-pass!429');

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /Get OTP on WhatsApp/i }));
  });

  expect(postData).toHaveBeenCalledWith('auth/send-whatsapp-otp', {
    phone: '9000000091',
    purpose: 'signup'
  });

  fill(/WhatsApp OTP/, '112233');

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /Verify & create account/i }));
  });

  expect(postData).toHaveBeenCalledWith('auth/verify-whatsapp-otp', {
    phone: '9000000091',
    otp: '112233',
    purpose: 'signup',
    fname: 'New',
    lname: 'User',
    emailid: 'new@example.test',
    password: 'Strong-pass!429',
    confirm_password: 'Strong-pass!429'
  });
  expect(await screen.findByText('Signed in home')).toBeInTheDocument();
  expect(localStorage.getItem('sevenshades_token')).toBe('jwt-new-user-token');
});

test('reset sends new password with WhatsApp OTP verification', async () => {
  postData
    .mockResolvedValueOnce({
      status: true,
      success: true,
      message: 'OTP sent to your WhatsApp successfully.',
      phone: '9000000091'
    })
    .mockResolvedValueOnce({
      status: true,
      success: true,
      token: 'jwt-reset-token',
      user: { mobileno: '9000000091' }
    });

  show('reset');
  fill(/Mobile number/, '9000000091');
  fill(/New password/, 'Fresh-password!429');
  fill(/Confirm password/, 'Fresh-password!429');

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /Get OTP on WhatsApp/i }));
  });

  expect(postData).toHaveBeenCalledWith('auth/send-whatsapp-otp', {
    phone: '9000000091',
    purpose: 'reset'
  });

  fill(/WhatsApp OTP/, '998877');

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /Verify & reset password/i }));
  });

  expect(postData).toHaveBeenCalledWith('auth/verify-whatsapp-otp', {
    phone: '9000000091',
    otp: '998877',
    purpose: 'reset',
    password: 'Fresh-password!429',
    confirm_password: 'Fresh-password!429'
  });
  expect(await screen.findByText('Signed in home')).toBeInTheDocument();
  expect(localStorage.getItem('sevenshades_token')).toBe('jwt-reset-token');
});

test('WhatsApp OTP displays error message when service is offline or rate limited', async () => {
  postData.mockResolvedValueOnce({
    status: false,
    success: false,
    message: 'Too many OTP requests. Please wait 15 minutes before requesting again.'
  });

  show();
  fill(/Mobile number/, '9876543210');

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /Get OTP on WhatsApp/i }));
  });

  expect(await screen.findByText(/Too many OTP requests/i)).toBeInTheDocument();
});

test('shows error when unregistered mobile tries to sign in', async () => {
  postData.mockResolvedValueOnce({
    status: false,
    success: false,
    message: 'No account found with this mobile number. Please sign up first.',
    errors: { mobileno: 'No account found with this mobile number. Please sign up first.' }
  });

  show();
  fill(/Mobile number/, '9998887776');

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /Get OTP on WhatsApp/i }));
  });

  expect(postData).toHaveBeenCalledWith('auth/send-whatsapp-otp', {
    phone: '9998887776',
    purpose: 'login'
  });
  expect((await screen.findAllByText(/No account found with this mobile number/i)).length).toBeGreaterThan(0);
  expect(screen.queryByLabelText(/WhatsApp OTP/)).not.toBeInTheDocument();
});

test('shows error when unregistered mobile tries to reset password', async () => {
  postData.mockResolvedValueOnce({
    status: false,
    success: false,
    message: 'No account found with this mobile number. Please sign up first.',
    errors: { mobileno: 'No account found with this mobile number. Please sign up first.' }
  });

  show('reset');
  fill(/Mobile number/, '9998887776');
  fill(/New password/, 'SecretPass123!');
  fill(/Confirm password/, 'SecretPass123!');

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /Get OTP on WhatsApp/i }));
  });

  expect(postData).toHaveBeenCalledWith('auth/send-whatsapp-otp', {
    phone: '9998887776',
    purpose: 'reset'
  });
  expect((await screen.findAllByText(/No account found with this mobile number/i)).length).toBeGreaterThan(0);
  expect(screen.queryByLabelText(/WhatsApp OTP/)).not.toBeInTheDocument();
});

