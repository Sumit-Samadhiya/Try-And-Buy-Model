/**
 * Lightweight privacy-aware analytics service for SevenShades.
 * Respects cookie consent choices and safely handles missing tracking IDs.
 */

export function hasAnalyticsConsent() {
    try {
        return typeof window !== 'undefined' && localStorage.getItem('sevenshades_cookie_consent') === 'accepted';
    } catch (e) {
        return false;
    }
}

export function trackPageView(pagePath, title = '') {
    if (!hasAnalyticsConsent()) return;

    try {
        if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('event', 'page_view', {
                page_path: pagePath,
                page_title: title || document.title,
            });
        }
    } catch (err) {
        // Silent failure in case ad-blockers or network interruptions occur
    }
}

export function trackEvent(eventName, eventParams = {}) {
    if (!hasAnalyticsConsent()) return;

    try {
        if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('event', eventName, eventParams);
        }
    } catch (err) {
        // Silent failure
    }
}

export default {
    hasAnalyticsConsent,
    trackPageView,
    trackEvent,
};
