import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import Header from './Header';
import * as apiService from '../../services/FetchDjangoApiServices';
import UseMediaQuery from '@mui/material/useMediaQuery';

jest.mock('../../services/FetchDjangoApiServices', () => ({
    serverURL: 'http://localhost:8000',
    getData: jest.fn(),
    postData: jest.fn(),
}));

jest.mock('@mui/material/useMediaQuery');

const initialReducer = (state = { product: {}, user: {} }, action) => state;

const renderWithProviders = (component, storeState = { product: {}, user: {} }) => {
    const store = createStore(initialReducer, storeState);
    return render(
        <Provider store={store}>
            <MemoryRouter>
                {component}
            </MemoryRouter>
        </Provider>
    );
};

describe('Header Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        apiService.getData.mockResolvedValue({
            status: true,
            data: [
                { id: 1, maincategoryname: 'Men' },
                { id: 2, maincategoryname: 'Women' }
            ]
        });
        apiService.postData.mockResolvedValue({ status: true, data: [] });
    });

    test('mobile view displays mobile search icon button', async () => {
        // Mock mobile media query (md_matches = true)
        UseMediaQuery.mockImplementation(() => true);

        await act(async () => {
            renderWithProviders(<Header />);
        });

        const mobileSearchBtn = screen.getByTestId('mobile-search-toggle');
        expect(mobileSearchBtn).toBeInTheDocument();
        expect(screen.getByText('Search')).toBeInTheDocument();
    });

    test('clicking mobile search icon button opens the search overlay', async () => {
        UseMediaQuery.mockImplementation(() => true);

        await act(async () => {
            renderWithProviders(<Header />);
        });

        const mobileSearchBtn = screen.getByTestId('mobile-search-toggle');
        fireEvent.click(mobileSearchBtn);

        // MobileSearchOverlay input is now visible
        expect(screen.getByPlaceholderText(/Search styles, brands, categories/i)).toBeInTheDocument();
        expect(screen.getByTestId('mobile-search-close')).toBeInTheDocument();
    });

    test('desktop view displays SearchBarComponent without mobile toggle', async () => {
        // Desktop media query (md_matches = false)
        UseMediaQuery.mockImplementation(() => false);

        await act(async () => {
            renderWithProviders(<Header />);
        });

        expect(screen.queryByTestId('mobile-search-toggle')).not.toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Search styles, categories, brands/i)).toBeInTheDocument();
    });
});
