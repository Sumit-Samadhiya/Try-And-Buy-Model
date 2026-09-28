import analytics, {
    getSessionId,
    hasAnalyticsConsent,
    trackPageView,
    trackUserEvent,
    trackProductView,
    trackAddToCart,
    trackRemoveFromCart,
    trackSearch,
    trackCheckoutStep,
    trackOrderPlaced,
    trackAuthEvent,
} from './analytics';
import { postData } from './FetchDjangoApiServices';

jest.mock('./FetchDjangoApiServices', () => ({
    postData: jest.fn().mockResolvedValue({ status: true, count: 1 }),
}));

describe('Analytics & UserEvent Tracking Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        sessionStorage.clear();
        localStorage.clear();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('getSessionId generates and retains a unique session ID', () => {
        const id1 = getSessionId();
        expect(id1).toMatch(/^dd_[a-z0-9]+_[a-z0-9]+$/);
        const id2 = getSessionId();
        expect(id2).toBe(id1);
    });

    test('hasAnalyticsConsent respects explicit user decline', () => {
        expect(hasAnalyticsConsent()).toBe(true);
        localStorage.setItem('doordrape_cookie_consent', 'declined');
        expect(hasAnalyticsConsent()).toBe(false);
        localStorage.setItem('doordrape_cookie_consent', 'accepted');
        expect(hasAnalyticsConsent()).toBe(true);
    });

    test('trackPageView dispatches batched page_view to backend', async () => {
        trackPageView('/productpage?category=mens', 'Men Fashion - Doordrape');
        jest.runAllTimers();

        expect(postData).toHaveBeenCalledTimes(1);
        const [endpoint, payload] = postData.mock.calls[0];
        expect(endpoint).toBe('analytics_track');
        expect(payload.events).toHaveLength(1);
        expect(payload.events[0]).toMatchObject({
            event_type: 'PAGE_VIEW',
            event_name: 'page_view',
            page_path: '/productpage?category=mens',
            page_title: 'Men Fashion - Doordrape',
        });
    });

    test('trackUserEvent tracks custom interactions with payload', async () => {
        trackUserEvent('button_click', { button_name: 'explore_now' });
        jest.runAllTimers();

        expect(postData).toHaveBeenCalledTimes(1);
        const [, payload] = postData.mock.calls[0];
        expect(payload.events[0]).toMatchObject({
            event_type: 'USER_EVENT',
            event_name: 'button_click',
            properties: { button_name: 'explore_now' },
        });
    });

    test('trackProductView, trackAddToCart, trackRemoveFromCart format e-commerce events', () => {
        const product = {
            id: 101,
            productname: 'Silk Kurti',
            price: 1499,
            offerprice: 999,
            categoryname: 'Ethnic',
            size: 'M',
            color: 'Navy Blue',
        };

        trackProductView(product);
        trackAddToCart(product);
        trackRemoveFromCart(product);
        jest.runAllTimers();

        expect(postData).toHaveBeenCalledTimes(1);
        const [, payload] = postData.mock.calls[0];
        expect(payload.events).toHaveLength(3);
        expect(payload.events[0].event_name).toBe('view_item');
        expect(payload.events[1].event_name).toBe('add_to_cart');
        expect(payload.events[2].event_name).toBe('remove_from_cart');
    });

    test('trackSearch, trackCheckoutStep, trackOrderPlaced, trackAuthEvent log expected details', () => {
        trackSearch('Cotton Kurta', 5);
        trackCheckoutStep('select_slot', { slot: '10 AM - 2 PM' });
        trackOrderPlaced('TRL-12345', 120, 3);
        trackAuthEvent('login_success', '9876543210');
        jest.runAllTimers();

        expect(postData).toHaveBeenCalledTimes(1);
        const [, payload] = postData.mock.calls[0];
        expect(payload.events).toHaveLength(4);
        expect(payload.events[0]).toMatchObject({
            event_name: 'search',
            properties: { query: 'Cotton Kurta', result_count: 5 },
        });
        expect(payload.events[1]).toMatchObject({
            event_name: 'checkout_step',
            properties: { step: 'select_slot', slot: '10 AM - 2 PM' },
        });
        expect(payload.events[2]).toMatchObject({
            event_name: 'order_placed',
            properties: { order_id: 'TRL-12345', amount: 120, items_count: 3 },
        });
        expect(payload.events[3]).toMatchObject({
            event_name: 'login_success',
            properties: { mobile: '9876543210' },
        });
    });
});
