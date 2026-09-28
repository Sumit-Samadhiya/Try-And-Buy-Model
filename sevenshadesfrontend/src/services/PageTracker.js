import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from './analytics';

/**
 * Route-aware page view tracking component.
 * Automatically tracks page visits on every React Router location transition.
 */
export default function PageTracker() {
    const location = useLocation();

    useEffect(() => {
        const fullPath = location.pathname + (location.search || '');
        trackPageView(fullPath, document.title);
    }, [location.pathname, location.search]);

    return null;
}
