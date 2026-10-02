import { render, screen, fireEvent, act } from '@testing-library/react';
import AdminAnalyticsTracking from './AdminAnalyticsTracking';
import { getData } from '../../services/FetchDjangoApiServices';

jest.mock('../../services/FetchDjangoApiServices', () => ({
    getData: jest.fn(),
}));

const mockAnalyticsData = {
    status: true,
    data: {
        total_records: 46,
        page_views: 30,
        user_events: 16,
        unique_sessions: 12,
        unique_users: 8,
        top_pages: [
            { page_path: '/home', views: 18 },
            { page_path: '/productdetailspage', views: 12 },
        ],
        top_events: [
            { event_name: 'view_item', count: 9 },
            { event_name: 'add_to_cart', count: 6 },
        ],
        recent_events: [
            {
                id: 1,
                created_at: '2026-09-28T14:00:00Z',
                event_type: 'PAGE_VIEW',
                event_name: 'page_view',
                page_path: '/home',
                user_mobile: '9876543210',
                session_id: 'dd_123',
                properties: { screen_width: 1440 },
            },
            {
                id: 2,
                created_at: '2026-09-28T14:05:00Z',
                event_type: 'USER_EVENT',
                event_name: 'add_to_cart',
                page_path: '/productdetailspage',
                user_mobile: '9876543210',
                session_id: 'dd_123',
                properties: { product_name: 'Silk Kurti', price: 999 },
            },
        ],
    },
};

describe('AdminAnalyticsTracking Screen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('renders stat cards, top pages, top events, and live audit log table', async () => {
        getData.mockResolvedValue(mockAnalyticsData);

        render(<AdminAnalyticsTracking />);

        expect(await screen.findByText('Analytics & Real-Time Tracking')).toBeInTheDocument();
        expect(await screen.findByText('30')).toBeInTheDocument(); // Page views
        expect(screen.getByText('16')).toBeInTheDocument(); // User events
        expect(screen.getByText('12')).toBeInTheDocument(); // Sessions
        expect(screen.getByText('8')).toBeInTheDocument();  // Users

        // Check top pages
        expect(screen.getAllByText('/home')[0]).toBeInTheDocument();
        expect(screen.getByText('18 visits')).toBeInTheDocument();

        // Check top events
        expect(screen.getByText('view_item')).toBeInTheDocument();
        expect(screen.getByText('9 times')).toBeInTheDocument();

        // Check recent event rows
        expect(screen.getByText('Silk Kurti', { exact: false })).toBeInTheDocument();
        expect(screen.getAllByText('9876543210')[0]).toBeInTheDocument();
    });

    test('filters search query triggers refreshed api call', async () => {
        getData.mockResolvedValue(mockAnalyticsData);

        render(<AdminAnalyticsTracking />);
        await screen.findByText('Analytics & Real-Time Tracking');

        const searchInput = screen.getByLabelText('Search path, event, or mobile');
        await act(async () => {
            fireEvent.change(searchInput, { target: { value: 'Silk' } });
        });

        const refreshBtn = screen.getByRole('button', { name: 'Refresh Telemetry' });
        await act(async () => {
            fireEvent.click(refreshBtn);
        });

        expect(getData).toHaveBeenLastCalledWith(expect.stringContaining('q=Silk'));
    });
});
