import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import CustomerAuth from './CustomerAuth';
import RootReducer from '../../storage/RootReducer';
import { postData } from '../../services/FetchDjangoApiServices';

jest.mock('../../services/FetchDjangoApiServices', () => ({
  getData: jest.fn(),
  prepareSession: jest.fn(() => Promise.resolve()),
  postData: jest.fn(),
  clearCachedAccounts: jest.fn()
}));

jest.mock('../../services/analytics', () => ({
  trackAuthEvent: jest.fn(),
  trackEvent: jest.fn()
}));

jest.mock('sweetalert2', () => ({
  fire: jest.fn(() => Promise.resolve({ isConfirmed: true }))
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

  fill(/Mobile number/, '123');
  fill(/^Password/, 'test');
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Sign in', exact: true }));
  });
  expect(await screen.findByText(/10-digit mobile/)).toBeInTheDocument();
  expect(postData).not.toHaveBeenCalled();
});

test('password login signs in successfully with valid credentials', async () => {
  postData.mockResolvedValueOnce({
    status: true,
    data: [{ mobileno: '9876543210', fname: 'Customer' }],
    token: 'jwt-auth-token-123'
  });

  show();
  await screen.findByText('Welcome back.');

  fill(/Mobile number/, '9876543210');
  fill(/^Password/, 'MyValidPassword123');

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Sign in', exact: true }));
  });

  expect(postData).toHaveBeenCalledWith('check_costumer_login', {
    mobileno: '9876543210',
    password: 'MyValidPassword123'
  });
  expect(await screen.findByText('Signed in home')).toBeInTheDocument();
  expect(localStorage.getItem('sevenshades_token')).toBe('jwt-auth-token-123');
});

test('shows friendly error when login credentials fail', async () => {
  postData.mockResolvedValueOnce({
    status: false,
    message: 'Invalid credentials'
  });

  show();
  await screen.findByText('Welcome back.');

  fill(/Mobile number/, '9998887776');
  fill(/^Password/, 'WrongPassword123');

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Sign in', exact: true }));
  });

  expect(postData).toHaveBeenCalledWith('check_costumer_login', {
    mobileno: '9998887776',
    password: 'WrongPassword123'
  });
  expect(await screen.findByText(/Incorrect mobile number or password/i)).toBeInTheDocument();
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

test('signup succeeds without optional email address', async () => {
  postData
    .mockResolvedValueOnce({
      status: true,
      success: true,
      message: 'OTP sent to your WhatsApp successfully.',
      phone: '9000000092'
    })
    .mockResolvedValueOnce({
      status: true,
      success: true,
      token: 'jwt-new-user-token-2',
      created: true,
      user: { mobileno: '9000000092', fname: 'NoEmail' }
    });

  show('signup');
  fill(/First name/, 'NoEmail');
  fill(/Last name/, 'User');
  fill(/Mobile number/, '9000000092');
  // Email address is intentionally left empty
  fill(/^Password/, 'Strong-pass!429');
  fill(/Confirm password/, 'Strong-pass!429');

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /Get OTP on WhatsApp/i }));
  });

  expect(postData).toHaveBeenCalledWith('auth/send-whatsapp-otp', {
    phone: '9000000092',
    purpose: 'signup'
  });

  fill(/WhatsApp OTP/, '112233');

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /Verify & create account/i }));
  });

  expect(postData).toHaveBeenCalledWith('auth/verify-whatsapp-otp', {
    phone: '9000000092',
    otp: '112233',
    purpose: 'signup',
    fname: 'NoEmail',
    lname: 'User',
    password: 'Strong-pass!429',
    confirm_password: 'Strong-pass!429'
  });
  expect(await screen.findByText('Signed in home')).toBeInTheDocument();
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

  show('signup');
  fill(/First name/, 'John');
  fill(/Last name/, 'Doe');
  fill(/Mobile number/, '9876543210');
  fill(/^Password/, 'StrongPassword123');
  fill(/Confirm password/, 'StrongPassword123');

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /Get OTP on WhatsApp/i }));
  });

  expect(await screen.findByText(/Too many attempts/i)).toBeInTheDocument();
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
  expect((await screen.findAllByText(/No account was found with this mobile number/i)).length).toBeGreaterThan(0);
  expect(screen.queryByLabelText(/WhatsApp OTP/)).not.toBeInTheDocument();
});
