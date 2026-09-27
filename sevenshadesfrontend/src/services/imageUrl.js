import { serverURL } from './FetchDjangoApiServices';
import catalogImages from './catalogImages.json';

const cloudName = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
const optimized = (source, width, useCloud = false) => {
  const key = source.replace(/^\/?media\//, '').replace(/^\/+/, '');
  const variants = catalogImages[key.startsWith('static/') ? key : `static/${key}`];
  if (!variants) return undefined;
  const local = variants[String(width)];
  if (!useCloud || !cloudName || window.location.hostname !== 'try-and-buy-model.vercel.app') return local;
  return `https://res.cloudinary.com/${cloudName}/image/fetch/f_auto,q_auto/https://try-and-buy-model.vercel.app${local}`;
};

export const responsiveImage = (value, sizes = '(max-width: 600px) 50vw, 25vw', hero = false) => {
  const first = String(value || '').split(',')[0].trim();
  const widths = hero ? [480, 960, 1600] : [480, 960];
  const sources = widths.map(width => optimized(first, width, true));
  if (sources.some(source => !source)) return { src: imageUrl(value) };
  return {
    src: sources[hero ? 1 : 0],
    srcSet: sources.map((source, i) => `${source} ${widths[i]}w`).join(', '),
    sizes,
    onError: event => {
      const target = event.currentTarget;
      if (target.dataset.fallback) return;
      target.dataset.fallback = 'true';
      target.removeAttribute('srcset');
      const key = first.replace(/^\/?media\//, '').replace(/^\/+/, '');
      target.src = catalogImages[key.startsWith('static/') ? key : `static/${key}`]?.[hero ? '960' : '480'] || imageUrl(value);
    },
  };
};

// Django ImageField (MainCategory, Brands, Product, MySubCategory) serializes as 'static/filename.jpg'.
// ProductDetails.icon (TextField) previously stored just 'filename.jpg' (old data) and now stores
// 'static/filename.jpg' (new data after fix). All files are physically in MEDIA_ROOT/static/ and
// served at /media/static/<filename> via secure_media_serve.
export default function imageUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return undefined;

  // Already a full absolute URL or blob/data URI — return as-is
  if (/^(https?:\/\/|blob:|data:image\/)/i.test(raw)) return raw;

  const thumbnail = optimized(raw.split(',')[0].trim(), 960);
  if (thumbnail) return thumbnail;

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
