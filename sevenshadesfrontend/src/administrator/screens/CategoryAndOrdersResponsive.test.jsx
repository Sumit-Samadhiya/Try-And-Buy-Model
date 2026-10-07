import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Category from './Category';
import DisplayAllCategory from './DisplayAllCategory';
import MySubCategory from './MySubCategory';
import DisplayAllSubCategory from './DisplayAllSubCategory';
import DisplayAllOrders from './DisplayAllOrders';
import { getData, postData } from '../../services/FetchDjangoApiServices';

jest.mock('../../services/FetchDjangoApiServices', () => ({
  getData: jest.fn(),
  postData: jest.fn(),
  serverURL: 'http://localhost:8000',
}));

jest.mock('../../services/useOrderEvents', () => () => {});
jest.mock('sweetalert2', () => ({
  fire: jest.fn(),
}));

describe('Admin Forms & Responsive Tables', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Category form renders fields, validates empty submit, and resets cleanly', async () => {
    render(
      <MemoryRouter>
        <Category />
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/Main Category Name/i)).toBeInTheDocument();
    const submitBtn = screen.getByRole('button', { name: /Submit Category/i });
    const resetBtn = screen.getByRole('button', { name: /Reset/i });

    // Validate empty submit
    await act(async () => {
      fireEvent.click(submitBtn);
    });
    expect(screen.getByText(/This field is required/i)).toBeInTheDocument();

    // Type input
    fireEvent.change(screen.getByLabelText(/Main Category Name/i), {
      target: { value: 'Designer Kurtis' },
    });
    expect(screen.getByDisplayValue('Designer Kurtis')).toBeInTheDocument();

    // Reset button clears input
    await act(async () => {
      fireEvent.click(resetBtn);
    });
    expect(screen.getByLabelText(/Main Category Name/i)).toHaveValue('');
  });

  test('Subcategory form renders category selection, validates inputs, and has proper button semantics', async () => {
    getData.mockResolvedValue({
      status: true,
      data: [{ id: 1, maincategoryname: "Men's Ethnic" }],
    });

    render(
      <MemoryRouter>
        <MySubCategory />
      </MemoryRouter>
    );

    // Verify parent category input exists
    expect(screen.getByLabelText(/Parent Main Category/i)).toBeInTheDocument();

    // Submit and Reset buttons must be real buttons (not labels)
    const submitBtn = screen.getByRole('button', { name: /Submit Subcategory/i });
    const resetBtn = screen.getByRole('button', { name: /Reset/i });
    expect(submitBtn.tagName.toLowerCase()).toBe('button');
    expect(resetBtn.tagName.toLowerCase()).toBe('button');

    // Validate empty submit
    await act(async () => {
      fireEvent.click(submitBtn);
    });
    expect(screen.getByText(/Please select a parent category/i)).toBeInTheDocument();

    // Type input
    fireEvent.change(screen.getByLabelText(/Subcategory Name/i), {
      target: { value: 'Kurta Pajama Sets' },
    });
    expect(screen.getByDisplayValue('Kurta Pajama Sets')).toBeInTheDocument();

    // Reset
    await act(async () => {
      fireEvent.click(resetBtn);
    });
    expect(screen.getByLabelText(/Subcategory Name/i)).toHaveValue('');
  });

  test('DisplayAllOrders renders orders, supports card view and table view toggling, and search', async () => {
    const mockOrders = [
      {
        try_order: {
          order_id: 'TRY-1001',
          mobileno: '9876543210',
          status: 'TRY_REQUESTED',
          total_try_items: 3,
          try_fee: 99,
          address_text: '123 Fashion Street',
          city: 'Mumbai',
          country: 'India',
          postcode: '400001',
          created_at: '2026-10-06T10:00:00Z',
          tryorderitem_set: [{ product_name: 'Silk Saree', qty: 1 }],
        },
        final_order: {
          status: 'completed',
          final_payable: 1499,
          wallet_credit: 99,
          payment_mode: 'UPI',
          payment_status: 'PAID',
          finalorderitem_set: [{ product_name: 'Silk Saree', qty: 1 }],
        },
      },
    ];

    getData.mockResolvedValue({ status: true, data: mockOrders });

    render(
      <MemoryRouter>
        <DisplayAllOrders />
      </MemoryRouter>
    );

    // Initial table view or total chips
    expect(await screen.findByText('1 Total')).toBeInTheDocument();

    // Switch to Card View (Mobile Optimized)
    const cardToggleBtn = screen.getByLabelText(/Card View/i);
    await act(async () => {
      fireEvent.click(cardToggleBtn);
    });

    // In card view, Order ID and mobile are visible
    expect(await screen.findByText(/#TRY-1001/i)).toBeInTheDocument();
    expect(screen.getByText('9876543210')).toBeInTheDocument();
    expect(screen.getAllByText('Try Requested').length).toBeGreaterThan(0);

    // Search filter in card view
    const searchInput = screen.getByPlaceholderText(/Search by Order ID/i);
    fireEvent.change(searchInput, { target: { value: 'NONEXISTENT' } });
    expect(screen.getByText(/No orders found matching your search/i)).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'TRY-1001' } });
    expect(screen.getByText(/#TRY-1001/i)).toBeInTheDocument();

    // Toggle back to Table View
    const tableToggleBtn = screen.getByLabelText(/Table View/i);
    await act(async () => {
      fireEvent.click(tableToggleBtn);
    });
    expect(screen.getAllByRole('table').length).toBeGreaterThan(0);
  });

  test('DisplayAllCategory renders table and navigation to Add New Category', async () => {
    getData.mockResolvedValue({
      status: true,
      data: [{ id: 10, maincategoryname: 'Luxury Couture', icon: 'couture.png' }],
    });

    render(
      <MemoryRouter>
        <DisplayAllCategory />
      </MemoryRouter>
    );

    expect(await screen.findByText('Luxury Couture')).toBeInTheDocument();
    expect(screen.getByText(/Add New Category/i)).toBeInTheDocument();
    expect(screen.getByText('#10')).toBeInTheDocument();
  });

  test('DisplayAllSubCategory renders table with parent category badge and navigation button', async () => {
    getData.mockImplementation(async (endpoint) => {
      if (endpoint === 'mysubcategory_list') {
        return {
          status: true,
          data: [
            {
              id: 25,
              subcategoryname: 'Embroidered Sherwanis',
              maincategoryid: { id: 10, maincategoryname: 'Luxury Couture' },
              icon: 'sherwani.png',
            },
          ],
        };
      }
      return { status: true, data: [] };
    });

    render(
      <MemoryRouter>
        <DisplayAllSubCategory />
      </MemoryRouter>
    );

    expect(await screen.findByText('Embroidered Sherwanis')).toBeInTheDocument();
    expect(screen.getByText('Luxury Couture')).toBeInTheDocument();
    expect(screen.getByText(/Add New Subcategory/i)).toBeInTheDocument();
    expect(screen.getByText('#25')).toBeInTheDocument();
  });
});
