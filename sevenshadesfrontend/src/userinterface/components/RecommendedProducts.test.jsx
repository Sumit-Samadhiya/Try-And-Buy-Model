import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RecommendedProducts from './RecommendedProducts';
import { catalogData, postData, getData } from '../../services/FetchDjangoApiServices';

jest.mock('../../services/FetchDjangoApiServices', () => ({
    catalogData: jest.fn(),
    postData: jest.fn(),
    getData: jest.fn(),
    serverURL: 'http://localhost:8000',
}));

const mockMenCatalog = [
    {
        id: 10,
        listing_id: '10_blue',
        productname: 'Current Blue Shirt',
        subcategoryid: { id: 101, subcategoryname: 'Shirts' },
        categoryname: 'Men',
        min_price: 999,
        min_offerprice: 499,
        icon: 'shirt1.jpg',
    },
    {
        id: 11,
        listing_id: '11_black',
        productname: 'Slim Fit Black Jeans',
        subcategoryid: { id: 102, subcategoryname: 'Jeans' },
        categoryname: 'Men',
        min_price: 1499,
        min_offerprice: 899,
        icon: 'jeans1.jpg',
    },
    {
        id: 12,
        listing_id: '12_green',
        productname: 'Casual Polo T-Shirt',
        subcategoryid: { id: 103, subcategoryname: 'T-Shirts' },
        categoryname: 'Men',
        min_price: 799,
        min_offerprice: 399,
        icon: 'tshirt1.jpg',
    },
    {
        id: 13,
        listing_id: '13_tan',
        productname: 'Bomber Winter Jacket',
        subcategoryid: { id: 104, subcategoryname: 'Jackets' },
        categoryname: 'Men',
        min_price: 2499,
        min_offerprice: 1499,
        icon: 'jacket1.jpg',
    },
    {
        id: 14,
        listing_id: '14_grey',
        productname: 'Formal Cotton Trousers',
        subcategoryid: { id: 105, subcategoryname: 'Trousers' },
        categoryname: 'Men',
        min_price: 1299,
        min_offerprice: 699,
        icon: 'trouser1.jpg',
    },
];

describe('RecommendedProducts Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('fetches main category products and excludes currently viewed product', async () => {
        catalogData.mockResolvedValue({ status: true, data: mockMenCatalog });

        render(
            <MemoryRouter>
                <RecommendedProducts
                    currentProductId={10}
                    mainCategoryId={1}
                    mainCategoryName="Men"
                />
            </MemoryRouter>
        );

        // Section heading appears
        expect(await screen.findByRole('heading', { name: /Recommended For You/i })).toBeInTheDocument();

        // Currently viewed product (id: 10, "Current Blue Shirt") must NOT be in the recommendations
        expect(screen.queryByText('Current Blue Shirt')).not.toBeInTheDocument();

        // Other products across diverse subcategories (Jeans, T-Shirts, Jackets, Trousers) should be present
        expect(screen.getByText('Slim Fit Black Jeans')).toBeInTheDocument();
        expect(screen.getByText('Casual Polo T-Shirt')).toBeInTheDocument();
        expect(screen.getByText('Bomber Winter Jacket')).toBeInTheDocument();
        expect(screen.getByText('Formal Cotton Trousers')).toBeInTheDocument();

        // Subcategory pills should show diversity
        expect(screen.getByText('Jeans')).toBeInTheDocument();
        expect(screen.getByText('T-Shirts')).toBeInTheDocument();
        expect(screen.getByText('Jackets')).toBeInTheDocument();
    });

    test('dynamically handles Women category recommendations when viewing a Women product', async () => {
        const mockWomenCatalog = [
            {
                id: 20,
                productname: 'Current Floral Kurti',
                subcategoryid: { id: 201, subcategoryname: 'Kurtis' },
                categoryname: 'Women',
                min_price: 999,
                min_offerprice: 599,
                icon: 'kurti1.jpg',
            },
            {
                id: 21,
                productname: 'Silk Festive Saree',
                subcategoryid: { id: 202, subcategoryname: 'Sarees' },
                categoryname: 'Women',
                min_price: 2999,
                min_offerprice: 1499,
                icon: 'saree1.jpg',
            },
            {
                id: 22,
                productname: 'Party Maxi Dress',
                subcategoryid: { id: 203, subcategoryname: 'Dresses' },
                categoryname: 'Women',
                min_price: 1899,
                min_offerprice: 999,
                icon: 'dress1.jpg',
            },
        ];

        catalogData.mockResolvedValue({ status: true, data: mockWomenCatalog });

        render(
            <MemoryRouter>
                <RecommendedProducts
                    currentProductId={20}
                    mainCategoryId={2}
                    mainCategoryName="Women"
                />
            </MemoryRouter>
        );

        expect(await screen.findByRole('heading', { name: /Recommended For You/i })).toBeInTheDocument();
        expect(screen.getByText(/WOMEN'S COLLECTION/i)).toBeInTheDocument();

        // Current product excluded
        expect(screen.queryByText('Current Floral Kurti')).not.toBeInTheDocument();

        // Other subcategories recommended
        expect(screen.getByText('Silk Festive Saree')).toBeInTheDocument();
        expect(screen.getByText('Party Maxi Dress')).toBeInTheDocument();
        expect(screen.getByText('Sarees')).toBeInTheDocument();
        expect(screen.getByText('Dresses')).toBeInTheDocument();
    });

    test('clicking shuffle picks reshuffles the recommendations without crashing', async () => {
        catalogData.mockResolvedValue({ status: true, data: mockMenCatalog });

        render(
            <MemoryRouter>
                <RecommendedProducts
                    currentProductId={10}
                    mainCategoryId={1}
                    mainCategoryName="Men"
                />
            </MemoryRouter>
        );

        const shuffleBtn = await screen.findByRole('button', { name: /Shuffle recommended styles/i });
        expect(shuffleBtn).toBeInTheDocument();

        fireEvent.click(shuffleBtn);

        // Still excludes product 10 and displays products
        expect(screen.queryByText('Current Blue Shirt')).not.toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /Recommended For You/i })).toBeInTheDocument();
    });

    test('clicking a recommended product triggers onProductClick callback', async () => {
        catalogData.mockResolvedValue({ status: true, data: mockMenCatalog });
        const onProductClick = jest.fn();

        render(
            <MemoryRouter>
                <RecommendedProducts
                    currentProductId={10}
                    mainCategoryId={1}
                    mainCategoryName="Men"
                    onProductClick={onProductClick}
                />
            </MemoryRouter>
        );

        const card = await screen.findByText('Slim Fit Black Jeans');
        fireEvent.click(card);

        expect(onProductClick).toHaveBeenCalledWith(
            expect.objectContaining({ id: 11, productname: 'Slim Fit Black Jeans' })
        );
    });
});
