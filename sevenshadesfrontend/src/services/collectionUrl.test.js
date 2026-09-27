import { collectionUrl, collectionFromSearch } from './collectionUrl';
import { indiaDate, slotAvailable } from './deliverySchedule';

test('a copied deal URL retains category, subcategory and price filter', () => {
  const url = collectionUrl({ pageView: 'BudgetBazaarComponent', products: { id: 12, maincategoryid: 31 }, maxPrice: 499, dealTitle: 'Shirts & tops' });
  expect(collectionFromSearch(url.split('?')[1])).toEqual({ pageView: 'BudgetBazaarComponent', products: { id: 12, maincategoryid: 31 }, maxPrice: 499, dealTitle: 'Shirts & tops' });
  expect(collectionFromSearch('')).toBeNull();
});

test('delivery dates and expired slots use India time even across UTC midnight', () => {
  expect(indiaDate(new Date('2026-09-25T20:00:00Z'))).toBe('2026-09-26');
  expect(slotAvailable('2026-09-26', '10:00 AM - 02:00 PM', Date.parse('2026-09-26T08:30:00Z'))).toBe(false);
  expect(slotAvailable('2026-09-27', '10:00 AM - 02:00 PM', Date.parse('2026-09-26T08:30:00Z'))).toBe(true);
});
