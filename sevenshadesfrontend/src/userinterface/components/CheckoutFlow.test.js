import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RootReducer from '../../storage/RootReducer';
import MyBag from './MyBag';
import UserAddressForm from './UserAddressForm';
import ProductDetailsComponent from './ProductDetailsComponent';
import { postData } from '../../services/FetchDjangoApiServices';

jest.mock('../../services/FetchDjangoApiServices', () => ({ postData: jest.fn(), serverURL: 'http://localhost:8000' }));
jest.mock('./Header', () => () => null);
jest.mock('./Footer', () => () => null);
jest.mock('react-slick', () => {
  const React = require('react');
  return React.forwardRef(({ children }, ref) => <div>{children}</div>);
});

const variant = { id: 7, size: 'medium', color: 'Blue', qty: 1, price: 500, offerprice: 450, productid: { productname: 'Shirt' }, brandid: { brandname: 'Brand' }, icon: '' };
function store() {
  const result = createStore(RootReducer);
  result.dispatch({ type: 'ADD_USER', payLoad: ['1', { mobileno: '1', fname: 'Test' }] });
  return result;
}

test('bag preserves size and saved address in checkout and prevents double submission', async () => {
  const state = store();
  postData.mockImplementation(async (endpoint) => {
    if (endpoint === 'fetch_user_address') return { status: true, data: [{ id: 12, address: 'Saved Home', city: 'Delhi', country: 'India', postcode: '110001', address_type: 'Residential' }] };
    if (endpoint === 'try_order_create') return new Promise(() => {});
    return { status: true, data: [] };
  });
  render(<Provider store={state}><MemoryRouter initialEntries={['/bag']}><Routes>
    <Route path="/bag" element={<MyBag data={[{ ...variant, selectedSize: 'medium' }]} setPageRefresh={() => {}} />} />
    <Route path="/displaycheckout" element={<UserAddressForm />} />
  </Routes></MemoryRouter></Provider>);
  fireEvent.click(screen.getByRole('button', { name: /Proceed To Address/i }));
  await screen.findAllByText('Saved Home');
  expect(screen.getByText(/Once your purchase is finalized, returns and refunds are not available/)).toBeInTheDocument();
  const button = screen.getByRole('button', { name: /Book Home Trial|Place Free Trial Order/i });
  fireEvent.click(button);
  fireEvent.click(button);
  await waitFor(() => expect(postData.mock.calls.filter(([endpoint]) => endpoint === 'try_order_create')).toHaveLength(1));
  const payload = postData.mock.calls.find(([endpoint]) => endpoint === 'try_order_create')[1];
  expect(payload.address_id).toBe(12);
  expect(payload.items[0]).toMatchObject({ product_details_id: 7, size: 'medium', qty: 1 });
  expect(payload.try_payment_status).toBeUndefined();
  expect(button).toBeDisabled();
});

test('choosing another catalog variant changes the ID and size added to the bag', async () => {
  const state = store();
  postData.mockResolvedValue({ status: false });
  render(<Provider store={state}><MemoryRouter><ProductDetailsComponent productList={[variant, { ...variant, id: 8, size: 'XL', color: 'Black' }]} setPageRefresh={() => {}} /></MemoryRouter></Provider>);
  fireEvent.mouseDown(screen.getByRole('combobox'));
  fireEvent.click(await screen.findByRole('option', { name: 'XL / Black' }));
  fireEvent.click(screen.getByRole('button', { name: 'Add to Try Bag' }));
  expect(state.getState().product[8]).toMatchObject({ id: 8, selectedSize: 'XL', qty: 1 });
  expect(state.getState().product[7]).toBeUndefined();
  expect(screen.getByRole('button', { name: '+' })).toBeDisabled();
});

test('out of stock variant cannot be added', () => {
  postData.mockResolvedValue({ status: false });
  render(<Provider store={store()}><MemoryRouter><ProductDetailsComponent productList={[{ ...variant, qty: 0 }]} setPageRefresh={() => {}} /></MemoryRouter></Provider>);
  expect(screen.getByRole('button', { name: 'Add to Try Bag' })).toBeDisabled();
});
