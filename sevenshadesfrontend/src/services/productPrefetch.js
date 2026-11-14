import { useEffect, useRef } from 'react';
import { prefetchCatalog } from './FetchDjangoApiServices';
import { queryClient } from './queryClient';
import { responsiveImage } from './imageUrl';
const inFlight = new Set();
let active = 0;
const canPrefetch = () => !navigator.connection?.saveData && !/2g/.test(navigator.connection?.effectiveType || '');
export async function prefetchProduct(item) {
  const id = Number(item?.id);
  if (!Number.isSafeInteger(id) || id <= 0 || !canPrefetch() || inFlight.has(id) || active >= 2) return;
  inFlight.add(id); active += 1;
  try {
    // Route code and public variant data are shared with the eventual navigation.
    await Promise.all([import('../userinterface/screens/ProductDetailsPage'), prefetchCatalog('user_productsdetails_by_id', { productid: id })]);
    const result = queryClient.getQueryData(['catalog', 'user_productsdetails_by_id', { productid: id }]);
    const photo = result?.data?.[0]?.icon;
    if (photo) { const image = new Image(); const props = responsiveImage(photo, '(max-width: 600px) 100vw, 50vw');
      image.decoding = 'async'; image.sizes = props.sizes || ''; if (props.srcSet) image.srcset = props.srcSet; image.src = props.src; }
  } catch (_) { /* Prediction is optional, never block a click. */ }
  finally { active -= 1; inFlight.delete(id); }
}
// On touch screens, warm only three cards per mounted grid after they dwell in view.
export function useProductPrefetch(items) {
  const root = useRef(null);
  useEffect(() => {
    if (!root.current || !canPrefetch() || !window.matchMedia('(pointer: coarse)').matches || typeof IntersectionObserver === 'undefined') return;
    let budget = 3;
    const timers = new Map();
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      clearTimeout(timers.get(entry.target)); timers.delete(entry.target);
      if (!entry.isIntersecting || budget <= 0) return;
      timers.set(entry.target, setTimeout(() => {
        timers.delete(entry.target); observer.unobserve(entry.target);
        if (budget-- > 0) prefetchProduct(items.find(item => String(item.id) === entry.target.dataset.prefetchProduct));
      }, 400));
    }), { threshold: .65 });
    root.current.querySelectorAll('[data-prefetch-product]').forEach(card => observer.observe(card));
    return () => { observer.disconnect(); timers.forEach(clearTimeout); };
  }, [items]);
  return root;
}
