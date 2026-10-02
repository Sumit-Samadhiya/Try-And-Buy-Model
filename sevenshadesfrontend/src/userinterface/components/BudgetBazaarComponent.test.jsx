import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BudgetBazaarComponent from './BudgetBazaarComponent';
import { getData } from '../../services/FetchDjangoApiServices';
jest.mock('../../services/FetchDjangoApiServices', () => ({ getData: jest.fn(), serverURL: 'https://backend.example' }));

test('missing custom deal image falls back to its category and then a stable placeholder', async () => {
    getData.mockResolvedValue({ status: true, data: [{ id: 1, title: 'Deal', icon: 'lost.jpg', subcategoryid: 12 }] });
    render(<MemoryRouter><BudgetBazaarComponent subcategories={[{ id: 12, icon: 'category.jpg' }]} /></MemoryRouter>);
    const image = await screen.findByAltText('Deal');
    expect(image.src).toContain('lost.jpg');
    fireEvent.error(image);
    expect(image.src).toContain('category.jpg');
    fireEvent.error(image);
    expect(image.src).toContain('/images/product-placeholder.svg');
    fireEvent.error(image);
    expect(image.src).toContain('/images/product-placeholder.svg');
});
