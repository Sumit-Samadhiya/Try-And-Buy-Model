// Store collection identity in the URL so copied links work in a fresh session.
export function collectionUrl(state = {}) {
  const p = state.products || {};
  const query = new URLSearchParams();
  if (state.pageView) query.set('view', state.pageView);
  if (p.id) query.set('id', p.id);
  if (p.maincategoryid) query.set('category', p.maincategoryid);
  const title = state.dealTitle || p.subcategoryname || p.maincategoryname || p.brandname;
  if (title) query.set('title', title);
  if (Number(state.maxPrice) > 0) query.set('maxPrice', state.maxPrice);
  return '/productpage' + (query.size ? '?' + query.toString() : '');
}

export function collectionFromSearch(search) {
  const query = new URLSearchParams(search);
  if (!query.has('view')) return null;
  return {
    pageView: query.get('view'),
    products: { id: Number(query.get('id')) || undefined, maincategoryid: Number(query.get('category')) || undefined },
    dealTitle: query.get('title') || undefined,
    maxPrice: Number(query.get('maxPrice')) || undefined,
  };
}
