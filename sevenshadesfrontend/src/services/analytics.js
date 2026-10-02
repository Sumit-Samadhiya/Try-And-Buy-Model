import { postData } from './FetchDjangoApiServices';

const SESSION_KEY = 'doordrape_session_id';

/**
 * Get or create a persistent anonymous session identifier for tracking journeys.
 */
export function getSessionId() {
    try {
        if (typeof window === 'undefined') return '';
        let sid = sessionStorage.getItem(SESSION_KEY);
        if (!sid) {
            sid = 'dd_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
            sessionStorage.setItem(SESSION_KEY, sid);
        }
        return sid;
    } catch (e) {
        return 'sess_fallback';
    }
}

/**
 * Check if the user has consented to analytics/performance tracking.
 * Treats users as consented unless explicitly declined in cookie preferences.
 */
export function hasAnalyticsConsent() {
    try {
        if (typeof window === 'undefined') return false;
        const consent = localStorage.getItem('doordrape_cookie_consent') || localStorage.getItem('sevenshades_cookie_consent');
        return consent !== 'declined';
    } catch (e) {
        return false;
    }
}

function getStoredUserMobile() {
    try {
        if (typeof window === 'undefined') return '';
        const userStr = localStorage.getItem('sevenshades_user');
        if (userStr) {
            const parsed = JSON.parse(userStr);
            return String(parsed.mobileno || parsed.phone || parsed.mobile || '');
        }
    } catch (e) {}
    return '';
}

// Queue for batching events efficiently
let eventBuffer = [];
let flushTimeout = null;

function flushEvents() {
    if (eventBuffer.length === 0) return;
    const batch = eventBuffer.splice(0, 50);

    try {
        const promise = postData('analytics_track', { events: batch });
        if (promise && typeof promise.catch === 'function') {
            promise.catch(() => {});
        }
    } catch (e) {
        // Silent failure - analytics must never disturb user experience
    }
}

function scheduleFlush() {
    if (flushTimeout) clearTimeout(flushTimeout);
    flushTimeout = setTimeout(flushEvents, 300);
}

// Handle window unload / visibilitychange to flush pending events
if (typeof window !== 'undefined') {
    window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') flushEvents();
    });
    window.addEventListener('pagehide', flushEvents);
}

/**
 * Track a Page View event
 */
export function trackPageView(pagePath, title = '', properties = {}) {
    if (!hasAnalyticsConsent()) return;

    const path = pagePath || (typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/');
    const pageTitle = title || (typeof document !== 'undefined' ? document.title : '');

    // External gtag dispatch if configured
    try {
        if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('event', 'page_view', {
                page_path: path,
                page_title: pageTitle,
                ...properties,
            });
        }
    } catch (e) {}

    // First-party tracking
    eventBuffer.push({
        event_type: 'PAGE_VIEW',
        event_name: 'page_view',
        page_path: path,
        page_title: pageTitle,
        session_id: getSessionId(),
        user_mobile: getStoredUserMobile(),
        properties: {
            referrer: typeof document !== 'undefined' ? document.referrer : '',
            screen_width: typeof window !== 'undefined' ? window.innerWidth : 0,
            screen_height: typeof window !== 'undefined' ? window.innerHeight : 0,
            ...properties,
        },
    });

    scheduleFlush();
}

/**
 * Track a User Interaction Event
 */
export function trackUserEvent(eventName, properties = {}) {
    if (!hasAnalyticsConsent() || !eventName) return;

    const path = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '';

    // External gtag dispatch if configured
    try {
        if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('event', eventName, properties);
        }
    } catch (e) {}

    // First-party tracking
    eventBuffer.push({
        event_type: 'USER_EVENT',
        event_name: eventName,
        page_path: path,
        page_title: typeof document !== 'undefined' ? document.title : '',
        session_id: getSessionId(),
        user_mobile: getStoredUserMobile(),
        properties: {
            ...properties,
        },
    });

    scheduleFlush();
}

// Convenience trackers for core e-commerce interactions
export const trackProductView = (product) => {
    if (!product) return;
    trackUserEvent('view_item', {
        product_id: product.productid || product.id,
        product_name: product.productname || product.productsubname,
        price: product.offerprice || product.price,
        category: product.categoryname || product.maincategoryname,
    });
};

export const trackAddToCart = (item) => {
    if (!item) return;
    trackUserEvent('add_to_cart', {
        product_id: item.productid || item.product_details_id || item.id,
        product_name: item.productname || item.productsubname,
        size: item.size,
        color: item.color,
        price: item.offerprice || item.price,
    });
};

export const trackRemoveFromCart = (item) => {
    if (!item) return;
    trackUserEvent('remove_from_cart', {
        product_id: item.productid || item.product_details_id || item.id,
        product_name: item.productname || item.productsubname,
    });
};

export const trackSearch = (query, resultCount = 0) => {
    if (!query) return;
    trackUserEvent('search', {
        query: String(query).trim(),
        result_count: resultCount,
    });
};

export const trackCheckoutStep = (stepName, details = {}) => {
    trackUserEvent('checkout_step', {
        step: stepName,
        ...details,
    });
};

export const trackOrderPlaced = (orderId, amount = 0, count = 0) => {
    trackUserEvent('order_placed', {
        order_id: orderId,
        amount: Number(amount) || 0,
        items_count: Number(count) || 0,
    });
};

export const trackAuthEvent = (action, mobile = '') => {
    trackUserEvent(action, {
        mobile: mobile || getStoredUserMobile(),
    });
};

const analytics = {
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
};

export default analytics;
