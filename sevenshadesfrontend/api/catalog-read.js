// Public catalog only. Never forward credentials, cookies or arbitrary origins.
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ status: false });
  const resource = req.query.resource;
  if (typeof resource !== 'string') return res.status(400).json({ status: false });
  const [name, search = ''] = resource.split('?');
  const allowed = new Set(['user_banner_list', 'user_maincategory_list', 'user_subcategory_list', 'user_product_list', 'user_productsdetails_by_id']);
  const params = new URLSearchParams(search);
  if (!allowed.has(name) || [...params].some(([k, v]) => !['page', 'page_size', 'maincategoryid', 'subcategoryid', 'brandid', 'productid'].includes(k) || !/^[1-9][0-9]{0,5}$/.test(v)) ||
      (params.has('page_size') && Number(params.get('page_size')) > 48)) {
    return res.status(400).json({ status: false });
  }
  if (name === 'user_product_list' && (!params.has('page') || !params.has('page_size'))) return res.status(400).json({ status: false });
  if (name === 'user_productsdetails_by_id' && (!params.has('productid') || [...params.keys()].length !== 1)) return res.status(400).json({ status: false });
  if (!['user_product_list', 'user_productsdetails_by_id'].includes(name) && search) return res.status(400).json({ status: false });
  try {
    const origin = new URL(process.env.CATALOG_ORIGIN || process.env.REACT_APP_API_URL || 'https://doordrape-backend.onrender.com');
    if (origin.protocol !== 'https:') throw new Error('HTTPS origin required');
    const response = await fetch(`${origin.origin}/api/${name}${search ? `?${params}` : ''}`, {
      headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(20000), redirect: 'error',
    });
    if (!response.ok) throw new Error('Origin unavailable');
    const data = await response.json();
    if (data.status !== true) throw new Error('Catalog unavailable');
    res.setHeader('Vercel-CDN-Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    return res.status(200).json(data);
  } catch (_) {
    return res.status(503).json({ status: false, message: 'Catalog temporarily unavailable.' });
  }
};
