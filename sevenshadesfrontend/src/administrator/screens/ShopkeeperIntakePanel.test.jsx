import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ShopkeeperIntakePanel from './ShopkeeperIntakePanel';
import { getData, postData } from '../../services/FetchDjangoApiServices';

jest.mock('../../services/FetchDjangoApiServices', () => ({
  getData: jest.fn(),
  postData: jest.fn(),
  serverURL: 'http://localhost:8000',
}));

const catalog = {
  categories: [{ id: 1, maincategoryname: 'Men' }],
  subcategories: [{ id: 2, maincategoryid: 1, subcategoryname: 'Shirts' }],
  brands: [{ id: 3, brandname: 'Partner Store' }],
};

const shop = { id: 10, shop_code: 'SH01', shop_name: 'Gupta Menswear', default_markup: 150 };
const draftItem = {
  id: 101,
  unique_code: 'SH01-001',
  shopkeeper_id: 10,
  shop_code: 'SH01',
  shop_name: 'Gupta Menswear',
  maincategoryid: 1,
  maincategoryname: 'Men',
  subcategoryid: 2,
  subcategoryname: 'Shirts',
  brandid: 3,
  brandname: 'Partner Store',
  product_name: 'Emerald Casual Shirt',
  description: 'Breathable cotton shirt',
  color: 'Emerald',
  cost_price: 500,
  markup_amount: 150,
  website_price: 650,
  sizes_json: [{ size: 'M', qty: 2 }],
  photo_list: ['static/shirt.jpg'],
  ai_source: 'gemini',
  status: 'DRAFT',
};

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  getData.mockImplementation(async url => {
    if (url === 'shopkeeper_list') return { status: true, data: [shop] };
    if (url === 'intake_list') return { status: true, data: [draftItem] };
    if (url.startsWith('intake_export_sheet')) {
      return { status: true, data: { shopkeeper: shop, items: [draftItem], total_items: 1, total_pieces: 2 } };
    }
    return { status: true, data: [] };
  });
  postData.mockResolvedValue({ status: true, message: 'Uploaded 1 item to website.', published_count: 1 });
  URL.createObjectURL = jest.fn(() => 'blob:preview');
  URL.revokeObjectURL = jest.fn();
});

test('supports separate camera and gallery inputs plus immediate photo removal', async () => {
  render(
    <MemoryRouter>
      <ShopkeeperIntakePanel catalog={catalog} />
    </MemoryRouter>
  );

  await screen.findByText('SH01-001');
  const camBtn = screen.getByText('📷 Take Photo');
  const galBtn = screen.getByText('🖼️ Choose from Gallery');
  const camInput = camBtn.querySelector('input');
  const galInput = galBtn.querySelector('input');
  expect(camInput).toHaveAttribute('capture', 'environment');
  expect(galInput).not.toHaveAttribute('capture');

  fireEvent.change(galInput, { target: { files: [new File(['img'], 'shirt1.jpg', { type: 'image/jpeg' })] } });
  expect(await screen.findByAltText('Capture 1')).toBeInTheDocument();

  fireEvent.click(screen.getByLabelText('Remove photo 1'));
  expect(screen.queryByAltText('Capture 1')).not.toBeInTheDocument();
});

test('shows shopkeeper rate, +150 website price, and supports one-by-one and bulk publish', async () => {
  const onCatalogChanged = jest.fn();
  render(
    <MemoryRouter>
      <ShopkeeperIntakePanel catalog={catalog} onCatalogChanged={onCatalogChanged} />
    </MemoryRouter>
  );

  await screen.findByText('SH01-001');
  expect(screen.getByText('Emerald Casual Shirt')).toBeInTheDocument();
  expect(screen.getByText('₹500')).toBeInTheDocument();
  expect(screen.getByText('₹650')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Upload to Website' }));
  await waitFor(() => {
    expect(postData).toHaveBeenCalledWith('intake_publish', { ids: [101] });
    expect(onCatalogChanged).toHaveBeenCalled();
  });
});
