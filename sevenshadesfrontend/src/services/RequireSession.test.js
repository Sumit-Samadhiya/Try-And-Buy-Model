import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RequireSession from './RequireSession';
import RootReducer from '../storage/RootReducer';
import { getData } from './FetchDjangoApiServices';

jest.mock('./FetchDjangoApiServices', () => ({ getData: jest.fn(), clearCachedAccounts: jest.fn() }));

function renderGuard(role = 'admin') {
  return render(<Provider store={createStore(RootReducer)}><MemoryRouter initialEntries={['/private']}>
    <Routes><Route path="/private" element={<RequireSession role={role}><p>Protected content</p></RequireSession>} />
      <Route path="/adminlogin" element={<p>Sign in as admin</p>} />
    </Routes></MemoryRouter></Provider>);
}

test('stored admin data cannot bypass server authentication', async () => {
  localStorage.setItem('ADMIN', JSON.stringify({ id: 1 }));
  getData.mockResolvedValue({ status: false });
  renderGuard();
  expect(await screen.findByText('Sign in as admin')).toBeInTheDocument();
  expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
});

test('customer session cannot open admin screens', async () => {
  getData.mockResolvedValue({ status: true, role: 'customer', data: { mobileno: '1' } });
  renderGuard();
  expect(await screen.findByText('Sign in as admin')).toBeInTheDocument();
});

test('verified admin session opens protected screen', async () => {
  getData.mockResolvedValue({ status: true, role: 'admin', data: { id: 1 } });
  renderGuard();
  expect(await screen.findByText('Protected content')).toBeInTheDocument();
});

test('switching customers replaces the previous identity', () => {
  let state = RootReducer(undefined, { type: 'ADD_USER', payLoad: ['A', { mobileno: 'A' }] });
  state = RootReducer(state, { type: 'ADD_USER', payLoad: ['B', { mobileno: 'B' }] });
  expect(Object.values(state.user)).toEqual([{ mobileno: 'B' }]);
});
