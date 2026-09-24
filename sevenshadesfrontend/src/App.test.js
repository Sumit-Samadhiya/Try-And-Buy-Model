import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import App from './App';
import RootReducer from './storage/RootReducer';
import { getData } from './services/FetchDjangoApiServices';

jest.mock('./services/FetchDjangoApiServices', () => ({
  getData: jest.fn().mockResolvedValue({ status: false, data: [] }),
  postData: jest.fn().mockResolvedValue({ status: false, data: [] }),
  clearCachedAccounts: jest.fn(), logout: jest.fn(), serverURL: 'http://localhost:8000',
}));

test('direct admin navigation requires a verified server session', async () => {
  getData.mockResolvedValue({ status: false, data: [] });
  window.history.replaceState({}, '', '/admindashboard');
  localStorage.setItem('ADMIN', JSON.stringify({ id: 1, adminname: 'Forged' }));
  render(<Provider store={createStore(RootReducer)}><App /></Provider>);
  expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  expect(screen.queryByText('Forged')).not.toBeInTheDocument();
});
