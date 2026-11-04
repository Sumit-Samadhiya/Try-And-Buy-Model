import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BudgetBazaarManager from './BudgetBazaarManager';
import { getData, postData } from '../../services/FetchDjangoApiServices';

jest.mock('../../services/FetchDjangoApiServices', () => ({
  getData: jest.fn(),
  postData: jest.fn(),
  serverURL: 'http://127.0.0.1:8000',
}));

jest.mock('sweetalert2', () => ({
  fire: jest.fn().mockResolvedValue({ isConfirmed: true }),
}));

const mockDeals = [
  {
    id: 1,
    title: 'Oversized T-Shirts',
    price_tag: 'Under ₹400',
    max_price: 400,
    maincategoryid: 5,
    maincategoryname: 'Men',
    subcategoryid: 10,
    subcategoryname: 'Oversized Tees',
    tier_color: 'blue',
    order_index: 1,
    is_active: true,
    active_product_count: 2,
    selection_mode: 'auto',
    included_product_ids: [],
    excluded_product_ids: []
  }
];

const mockProducts = [
  {
    id: 101,
    productname: 'Urban Oversized Tee',
    brandname: 'SevenShades',
    maincategoryname: 'Men',
    subcategoryname: 'Oversized Tees',
    icon: 'tee.png',
    min_price: 599,
    min_offerprice: 399,
    effective_price: 399,
    default_visible: true,
    is_visible: true
  },
  {
    id: 102,
    productname: 'Premium Streetwear Tee',
    brandname: 'SevenShades',
    maincategoryname: 'Men',
    subcategoryname: 'Oversized Tees',
    icon: 'premium.png',
    min_price: 899,
    min_offerprice: 799,
    effective_price: 799,
    default_visible: false,
    is_visible: false
  }
];

describe('BudgetBazaarManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getData.mockImplementation((endpoint) => {
      if (endpoint === 'admin_budget_bazaar_list') {
        return Promise.resolve({ status: true, data: mockDeals });
      }
      if (endpoint === 'user_maincategory_list') {
        return Promise.resolve({ status: true, data: [{ id: 5, maincategoryname: 'Men' }] });
      }
      if (endpoint === 'user_subcategory_list') {
        return Promise.resolve({ status: true, data: [{ id: 10, subcategoryname: 'Oversized Tees', maincategoryid: 5 }] });
      }
      if (endpoint.startsWith('admin_budget_bazaar_products')) {
        return Promise.resolve({
          status: true,
          deal: mockDeals[0],
          products: mockProducts,
          total_products: 2,
          visible_count: 1
        });
      }
      return Promise.resolve({ status: true, data: [] });
    });
    postData.mockResolvedValue({ status: true, message: 'Saved successfully' });
  });

  test('renders deals list with Manage Products button and active count', async () => {
    render(
      <MemoryRouter>
        <BudgetBazaarManager />
      </MemoryRouter>
    );

    expect(await screen.findByText('Budget Bazaar Manager')).toBeInTheDocument();
    expect(await screen.findByText('Oversized T-Shirts')).toBeInTheDocument();
    expect(screen.getByText('2 products')).toBeInTheDocument();
    expect(screen.getByText('Manage Products')).toBeInTheDocument();
  });

  test('opens product management modal and toggles product visibility', async () => {
    render(
      <MemoryRouter>
        <BudgetBazaarManager />
      </MemoryRouter>
    );

    const manageBtn = await screen.findByText('Manage Products');
    fireEvent.click(manageBtn);

    expect(await screen.findByText('Manage Products: Oversized T-Shirts')).toBeInTheDocument();
    expect(await screen.findByText('Urban Oversized Tee')).toBeInTheDocument();
    expect(screen.getByText('Premium Streetwear Tee')).toBeInTheDocument();

    // Verify price match chips
    expect(screen.getByText('≤ ₹400 (Eligible)')).toBeInTheDocument();
    expect(screen.getByText('₹799 (> ₹400)')).toBeInTheDocument();

    // Click Save Product Selection
    const saveBtn = screen.getByText('Save Product Selection');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(postData).toHaveBeenCalledWith('admin_budget_bazaar_products_save', expect.objectContaining({
        deal_id: 1,
        selection_mode: 'auto'
      }));
    });
  });
});
