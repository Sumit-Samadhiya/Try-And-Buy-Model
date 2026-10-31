import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import ProductPage from './ProductPage';
import { catalogData } from '../../services/FetchDjangoApiServices';
jest.mock('../../services/FetchDjangoApiServices', () => ({ catalogData: jest.fn() }));
jest.mock('../components/Header', () => () => null);
jest.mock('../components/Footer', () => () => null);
jest.mock('../components/ProductByCategory', () => ({ data }) => <div>{data.map(item => <p key={item.id}>{item.productname}</p>)}</div>);
function Address() { return <output>{useLocation().search}</output>; }
beforeEach(() => catalogData.mockReset());

test('direct collection URL loads its category without navigation state', async () => {
  catalogData.mockResolvedValue({ status: true, data: [{ id: 42, productname: 'Blue shirt' }] });
  render(<MemoryRouter initialEntries={['/productpage?view=MainCategoryComponent&id=31&title=Men']}><ProductPage /></MemoryRouter>);
  expect(await screen.findByText('Blue shirt')).toBeInTheDocument();
  expect(catalogData).toHaveBeenCalledWith('user_product_list?page=1&page_size=12&maincategoryid=31');
});

test('bare catalog link browses all collections', async () => {
  catalogData.mockImplementation(async endpoint => endpoint === 'user_maincategory_list' ? { status: true, data: [{ id: 31 }] } : { status: true, data: [{ id: 42, productname: 'Blue shirt' }] });
  render(<MemoryRouter initialEntries={['/productpage']}><ProductPage /></MemoryRouter>);
  expect(await screen.findByText('Blue shirt')).toBeInTheDocument();
});

test('legacy navigation creates a shareable URL and errors are visible', async () => {
  catalogData.mockResolvedValue({ status: false, message: 'Catalog unavailable' });
  render(<MemoryRouter initialEntries={[{ pathname: '/productpage', state: { pageView: 'MainCategoryComponent', products: { id: 31 } } }]}><ProductPage /><Address /></MemoryRouter>);
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('view=MainCategoryComponent'));
  expect(await screen.findByRole('alert')).toHaveTextContent('Catalog unavailable');
  expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
});

test('loads the next batch only when requested and keeps existing products', async () => {
 catalogData.mockResolvedValueOnce({status:true,data:[{id:1,productname:'First shirt'}],next_page:2}).mockResolvedValueOnce({status:true,data:[{id:2,productname:'Second shirt'}],next_page:null});
 render(<MemoryRouter initialEntries={['/productpage']}><ProductPage /></MemoryRouter>);
 expect(await screen.findByText('First shirt')).toBeInTheDocument();
 expect(catalogData).toHaveBeenCalledTimes(1);
 fireEvent.click(screen.getByRole('button',{name:'Load more products'}));
 expect(await screen.findByText('Second shirt')).toBeInTheDocument();
 expect(screen.getByText('First shirt')).toBeInTheDocument();
 expect(screen.queryByRole('button',{name:'Load more products'})).not.toBeInTheDocument();
 expect(catalogData).toHaveBeenLastCalledWith('user_product_list?page=2&page_size=12');
});
