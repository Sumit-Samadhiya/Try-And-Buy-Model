import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import CustomerAuth from './CustomerAuth';
import RootReducer from '../../storage/RootReducer';
import { postData } from '../../services/FetchDjangoApiServices';
import { signInWithPhoneNumber, signOut, RecaptchaVerifier } from 'firebase/auth';

jest.mock('../../services/FetchDjangoApiServices', () => ({
  getData: jest.fn(),
  postData: jest.fn(),
  clearCachedAccounts: jest.fn()
}));

jest.mock('firebase/auth', () => {
  return {
    getAuth: jest.fn(() => ({})),
    signOut: jest.fn().mockResolvedValue(),
    RecaptchaVerifier: jest.fn().mockImplementation(() => ({
      clear: jest.fn()
    })),
    signInWithPhoneNumber: jest.fn()
  };
});

function show(kind = 'login') {
  render(
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
}

function fill(label, value) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

beforeEach(() => {
  jest.clearAllMocks();
  postData.mockReset();
  signOut.mockResolvedValue();
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

test('OTP login uses pure Firebase signInWithPhoneNumber without backend send-otp call', async () => {
  const mockConfirm = jest.fn().mockResolvedValue({
    user: {
      getIdToken: jest.fn().mockResolvedValue('fake-firebase-id-token')
    }
  });

  signInWithPhoneNumber.mockResolvedValue({
    confirm: mockConfirm
  });

  postData.mockResolvedValue({
    status: true,
    user: { mobileno: '9000000091', fname: 'Test' },
    token: 'jwt-token-123'
  });

  show();
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Login with OTP' }));
  });

  fill(/Mobile number/, '9000000091');

  // Click Get OTP
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Get OTP' }));
  });

  // 1. signInWithPhoneNumber was called with +919000000091
  expect(signInWithPhoneNumber).toHaveBeenCalled();
  const phoneArg = signInWithPhoneNumber.mock.calls[0][1];
  expect(phoneArg).toBe('+919000000091');

  // 2. NO backend fetch call to auth/send-otp/
  expect(postData).not.toHaveBeenCalledWith('auth/send-otp/', expect.anything());

  // Enter 6-digit OTP
  fill(/6-digit OTP/, '123456');

  // Click verify
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Verify & sign in' }));
  });

  // 3. confirm was called with the OTP
  expect(mockConfirm).toHaveBeenCalledWith('123456');

  // 4. Token was sent to Django backend auth/firebase-login/
  expect(postData).toHaveBeenCalledWith('auth/firebase-login/', { id_token: 'fake-firebase-id-token' });
  expect(await screen.findByText('Signed in home')).toBeInTheDocument();
});

test('signup rejects mismatched confirmation before requesting OTP', async () => {
  show('signup');
  await screen.findByText(/Create your account/);
  fill(/First name/, 'New');
  fill(/Last name/, 'User');
  fill(/Mobile number/, '9000000091');
  fill(/Email address/, 'new@example.test');
  fill(/^Password/, 'Strong-example!');
  fill(/Confirm password/, 'different');
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Get OTP' }));
  });
  expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument();
  expect(signInWithPhoneNumber).not.toHaveBeenCalled();
});

test('reset sends the new password with the Firebase proof', async () => {
  signInWithPhoneNumber.mockResolvedValue({ confirm: jest.fn().mockResolvedValue({
    user: { getIdToken: jest.fn().mockResolvedValue('reset-proof') }
  }) });
  postData.mockResolvedValue({ status:true, token:'new-token', user:{mobileno:'9000000091'} });
  show('reset');
  fill(/Mobile number/, '9000000091');
  fill(/New password/, 'Fresh-password!429');
  fill(/Confirm password/, 'Fresh-password!429');
  await act(async () => fireEvent.click(screen.getByRole('button', {name:'Get OTP'})));
  fill(/6-digit OTP/, '123456');
  await act(async () => fireEvent.click(screen.getByRole('button', {name:'Verify & reset password'})));
  expect(postData).toHaveBeenCalledWith('auth/firebase-login/', {
    id_token:'reset-proof', purpose:'reset', password:'Fresh-password!429', confirm_password:'Fresh-password!429'
  });
  expect(await screen.findByText('Signed in home')).toBeInTheDocument();
  expect(localStorage.getItem('sevenshades_token')).toBe('new-token');
});
