import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const origin = 'https://doordrape.com';
import pages from './seoPages.json';

export function routeMetadata(pathname, search = '') {
  const path = pathname === '/home' ? '/' : pathname;
  const params = new URLSearchParams(search);
  const page = pages[path];
  // Filter URLs remain usable but do not compete with the catalog landing page.
  const indexable = Boolean(page) && !(path === '/productpage' && params.size);
  return {
    title: page?.[0] || 'DoorDrape',
    description: page?.[1] || 'Your DoorDrape account and shopping experience.',
    canonical: origin + path,
    robots: indexable ? 'index, follow, max-image-preview:large' : 'noindex, follow',
  };
}

export default function RouteSeo() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    const meta = routeMetadata(pathname, search);
    document.title = meta.title;
    const set = (selector, attribute, value) => {
      document.querySelector(selector)?.setAttribute(attribute, value);
    };
    set('meta[name="description"]', 'content', meta.description);
    set('meta[name="robots"]', 'content', meta.robots);
    set('meta[name="googlebot"]', 'content', meta.robots);
    set('link[rel="canonical"]', 'href', meta.canonical);
    set('meta[property="og:url"]', 'content', meta.canonical);
    for (const field of ['title', 'description']) {
      set(`meta[property="og:${field}"]`, 'content', meta[field]);
      set(`meta[name="twitter:${field}"]`, 'content', meta[field]);
    }
  }, [pathname, search]);
  return null;
}
