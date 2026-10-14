import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MobileSearchOverlay from './MobileSearchOverlay';
import * as apiService from '../../services/FetchDjangoApiServices';

jest.mock('../../services/FetchDjangoApiServices', () => ({
    serverURL: 'http://localhost:8000',
    getData: jest.fn(),
    postData: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}));

describe('MobileSearchOverlay Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
        apiService.getData.mockImplementation((endpoint) => {
            if (endpoint === 'user_subcategory_list') {
                return Promise.resolve({
                    status: true,
                    data: [{ id: 101, subcategoryname: 'Casual Shirts', icon: 'shirt.png' }]
                });
            }
            if (endpoint === 'user_maincategory_list') {
                return Promise.resolve({
                    status: true,
                    data: [{ id: 1, maincategoryname: 'Men', icon: 'men.png' }]
                });
            }
            if (endpoint === 'user_product_list') {
                return Promise.resolve({
                    status: true,
                    data: [{
                        id: 201,
                        productname: 'Slim Fit Cotton Shirt',
                        icon: 'cotton_shirt.png',
                        min_price: 999,
                        min_offerprice: 699,
                        brandname: 'Raymond'
                    }]
                });
            }
            if (endpoint === 'user_brand_list') {
                return Promise.resolve({
                    status: true,
                    data: [{ id: 501, brandname: 'Raymond', icon: 'raymond.png' }]
                });
            }
            return Promise.resolve({ status: true, data: [] });
        });
    });

    test('renders search input and popular suggestion chips when open', async () => {
        render(
            <MemoryRouter>
                <MobileSearchOverlay open={true} onClose={jest.fn()} />
            </MemoryRouter>
        );

        expect(screen.getByPlaceholderText(/Search styles, brands, categories/i)).toBeInTheDocument();
        expect(screen.getByText('Popular on DoorDrape')).toBeInTheDocument();
        expect(screen.getByText('Kurtis')).toBeInTheDocument();
        expect(screen.getByText('Shirts')).toBeInTheDocument();
    });

    test('calls onClose when close icon button is clicked', () => {
        const handleClose = jest.fn();
        render(
            <MemoryRouter>
                <MobileSearchOverlay open={true} onClose={handleClose} />
            </MemoryRouter>
        );

        const closeBtn = screen.getByTestId('mobile-search-close');
        fireEvent.click(closeBtn);
        expect(handleClose).toHaveBeenCalledTimes(1);
    });

    test('debounces search input and displays matching results', async () => {
        jest.useFakeTimers();

        render(
            <MemoryRouter>
                <MobileSearchOverlay open={true} onClose={jest.fn()} />
            </MemoryRouter>
        );

        // Wait for prefetch items to resolve
        await act(async () => {
            await Promise.resolve();
        });

        const input = screen.getByTestId('mobile-search-input');

        // Type 'Cotton'
        fireEvent.change(input, { target: { value: 'Cotton' } });

        // Immediately before debounce time: results not filtered yet
        expect(screen.queryByText('Slim Fit Cotton Shirt')).not.toBeInTheDocument();

        // Advance timers by 400ms for debounce
        act(() => {
            jest.advanceTimersByTime(400);
        });

        // Debounced search now displays match
        expect(screen.getByText('Slim Fit Cotton Shirt')).toBeInTheDocument();
        expect(screen.getByText('₹699')).toBeInTheDocument();

        jest.useRealTimers();
    });

    test('tapping popular search chip sets query and filters after debounce', async () => {
        jest.useFakeTimers();

        render(
            <MemoryRouter>
                <MobileSearchOverlay open={true} onClose={jest.fn()} />
            </MemoryRouter>
        );

        await act(async () => {
            await Promise.resolve();
        });

        const shirtChip = screen.getByText('Shirts');
        fireEvent.click(shirtChip);

        const input = screen.getByTestId('mobile-search-input');
        expect(input.value).toBe('Shirts');

        act(() => {
            jest.advanceTimersByTime(400);
        });

        expect(screen.getByText('Casual Shirts')).toBeInTheDocument();

        jest.useRealTimers();
    });

    test('clicking product match navigates to product details and closes overlay', async () => {
        jest.useFakeTimers();
        const handleClose = jest.fn();

        render(
            <MemoryRouter>
                <MobileSearchOverlay open={true} onClose={handleClose} />
            </MemoryRouter>
        );

        await act(async () => {
            await Promise.resolve();
        });

        const input = screen.getByTestId('mobile-search-input');
        fireEvent.change(input, { target: { value: 'Cotton' } });

        act(() => {
            jest.advanceTimersByTime(400);
        });

        const item = screen.getByText('Slim Fit Cotton Shirt');
        fireEvent.click(item);

        expect(handleClose).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('/productdetailspage', expect.objectContaining({
            state: expect.objectContaining({ productid: 201 })
        }));

        jest.useRealTimers();
    });

    test('clicking search submit navigates to productpage with search term', async () => {
        const handleClose = jest.fn();

        render(
            <MemoryRouter>
                <MobileSearchOverlay open={true} onClose={handleClose} />
            </MemoryRouter>
        );

        const input = screen.getByTestId('mobile-search-input');
        fireEvent.change(input, { target: { value: 'Designer Kurti' } });

        const submitBtn = screen.getByTestId('mobile-search-submit');
        fireEvent.click(submitBtn);

        expect(handleClose).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith(
            '/productpage?search=Designer%20Kurti',
            expect.objectContaining({
                state: expect.objectContaining({
                    pageView: 'SearchComponent',
                    searchQuery: 'Designer Kurti'
                })
            })
        );
    });
});
