import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CouponManager from './CouponManager';
import { getData, postData } from '../../services/FetchDjangoApiServices';

jest.mock('../../services/FetchDjangoApiServices', () => ({
  getData: jest.fn(),
  postData: jest.fn(),
}));

jest.mock('sweetalert2', () => ({
  fire: jest.fn().mockResolvedValue({ isConfirmed: true }),
}));

const mockCoupons = [
  {
    id: 1,
    code: 'DIWALI50',
    description: '50% off on Kurtas',
    discount_type: 'percentage',
    discount_value: 50,
    max_discount: 500,
    min_order_amount: 999,
    scope: 'category',
    target_ids: ['10'],
    target_names: ['Ethnic Wear'],
    total_usage_limit: 200,
    used_count: 45,
    per_user_limit: 1,
    start_date: '2026-10-01T00:00:00Z',
    end_date: '2026-10-25T23:59:59Z',
    is_active: true,
    is_expired: false,
    is_upcoming: false,
  },
  {
    id: 2,
    code: 'FLAT200',
    description: 'Flat Rs 200 off on all products',
    discount_type: 'flat',
    discount_value: 200,
    max_discount: null,
    min_order_amount: 0,
    scope: 'all',
    target_ids: [],
    target_names: ['All Products'],
    total_usage_limit: null,
    used_count: 12,
    per_user_limit: 2,
    start_date: '2026-10-01T00:00:00Z',
    end_date: '2026-11-01T23:59:59Z',
    is_active: true,
    is_expired: false,
    is_upcoming: false,
  },
];

const mockDependencies = {
  status: true,
  categories: [{ id: 10, name: 'Ethnic Wear' }, { id: 20, name: 'Footwear' }],
  subcategories: [{ id: 101, name: 'Kurtas', category_id: 10 }],
  products: [{ id: 501, name: 'Silk Kurta', category_id: 10, subcategory_id: 101 }],
};

describe('CouponManager Admin Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getData.mockImplementation(async (endpoint) => {
      if (endpoint.startsWith('admin_coupon_list')) {
        return {
          status: true,
          data: mockCoupons,
          stats: { total: 2, active: 2, expired: 0, total_redemptions: 57 },
        };
      }
      if (endpoint === 'admin_coupon_dependencies') {
        return mockDependencies;
      }
      return { status: true, data: [] };
    });
    postData.mockResolvedValue({ status: true, message: 'Operation successful' });
  });

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <CouponManager />
      </MemoryRouter>
    );

  test('renders header, stats, and coupon listings in table', async () => {
    renderComponent();

    // Verify Title
    expect(screen.getByText('Coupon & Discount Rules')).toBeInTheDocument();

    // Verify Stats
    await waitFor(() => {
      expect(screen.getByText('DIWALI50')).toBeInTheDocument();
      expect(screen.getByText('FLAT200')).toBeInTheDocument();
    });

    // Check discount values rendered
    expect(screen.getByText('50% OFF')).toBeInTheDocument();
    expect(screen.getByText('₹200 FLAT')).toBeInTheDocument();
    expect(screen.getByText('Capped up to ₹500')).toBeInTheDocument();

    // Check scope chips
    expect(screen.getByText('Category (1)')).toBeInTheDocument();
    expect(screen.getByText('Entire Store')).toBeInTheDocument();

    // Check usage
    expect(screen.getByText('45 / 200')).toBeInTheDocument();
    expect(screen.getByText('12 used')).toBeInTheDocument();
  });

  test('opens create coupon dialog with form fields and random code generator', async () => {
    renderComponent();

    const createBtn = screen.getByRole('button', { name: /Create Coupon/i });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(screen.getByText('Generate & Configure New Coupon')).toBeInTheDocument();
    });

    // Verify fields
    expect(screen.getByLabelText(/Coupon Code/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description \/ Marketing Note/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Random Code/i })).toBeInTheDocument();
    expect(screen.getByText('Entire Store (All Products)')).toBeInTheDocument();
    expect(screen.getByText('Specific Categories')).toBeInTheDocument();

    // Click random code generator
    const randomBtn = screen.getByRole('button', { name: /Random Code/i });
    fireEvent.click(randomBtn);
    const codeInput = screen.getByLabelText(/Coupon Code/i);
    expect(codeInput.value).toBeTruthy();
  });

  test('submits new coupon successfully and invokes admin_coupon_save API', async () => {
    renderComponent();

    fireEvent.click(screen.getByRole('button', { name: /Create Coupon/i }));

    await waitFor(() => {
      expect(screen.getByText('Generate & Configure New Coupon')).toBeInTheDocument();
    });

    const codeInput = screen.getByLabelText(/Coupon Code/i);
    fireEvent.change(codeInput, { target: { value: 'SUMMER30' } });

    const valInput = screen.getByLabelText(/Discount Percentage \(%\)/i);
    fireEvent.change(valInput, { target: { value: '30' } });

    const submitBtn = screen.getByRole('button', { name: /Create Coupon/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(postData).toHaveBeenCalledWith(
        'admin_coupon_save',
        expect.objectContaining({
          code: 'SUMMER30',
          discount_type: 'percentage',
          discount_value: 30,
          scope: 'all',
        })
      );
    });
  });

  test('toggles coupon active status via admin_coupon_toggle API', async () => {
    postData.mockResolvedValueOnce({
      status: true,
      message: 'Status updated',
      is_active: false,
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('DIWALI50')).toBeInTheDocument();
    });

    const switches = screen.getAllByRole('checkbox');
    fireEvent.click(switches[0]);

    await waitFor(() => {
      expect(postData).toHaveBeenCalledWith('admin_coupon_toggle', { id: 1 });
    });
  });
});
