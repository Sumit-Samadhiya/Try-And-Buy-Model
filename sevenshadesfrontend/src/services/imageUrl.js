import { serverURL } from './FetchDjangoApiServices';

// Django ImageField (MainCategory, Brands, Product, MySubCategory) serializes as 'static/filename.jpg'.
// ProductDetails.icon (TextField) previously stored just 'filename.jpg' (old data) and now stores
// 'static/filename.jpg' (new data after fix). All files are physically in MEDIA_ROOT/static/ and
// served at /media/static/<filename> via secure_media_serve.
export default function imageUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return undefined;

  // Already a full absolute URL or blob/data URI — return as-is
  if (/^(https?:\/\/|blob:|data:image\/)/i.test(raw)) return raw;

  // Handle comma-separated multi-image values (ProductDetails) — use first image only
  const first = raw.split(',')[0].trim();
  if (!first) return undefined;

  // Strip any leading slash and normalise backslashes
  const relative = first.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!relative) return undefined;

  const base = serverURL.replace(/\/+$/, '');

  // Paths already starting with 'media/' — just prefix with base URL
  if (/^media\//.test(relative)) {
    return `${base}/${relative}`;
  }

  // Paths starting with 'static/' — these are Django ImageField paths stored in MEDIA_ROOT.
  // They must be served through /media/ (NOT the /static/ URL for compiled frontend assets).
  if (/^static\//.test(relative)) {
    return `${base}/media/${relative}`;
  }

  // Legacy ProductDetails paths: bare filenames like 'image.jpg' — they live in MEDIA_ROOT/static/
  return `${base}/media/static/${relative}`;
}
