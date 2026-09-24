import { serverURL } from './FetchDjangoApiServices';

// ImageFields return /static/name; multi-image fields store just the filename.
export default function imageUrl(value) {
  const raw = String(value || '').trim();
  if (/^(blob:|data:image\/)/i.test(raw)) return raw;
  const image = raw.split(',')[0].trim().replace(/\\/g, '/');
  if (!image) return undefined;
  if (/^(https?:\/\/|blob:|data:image\/)/i.test(image)) return image;
  const relative = image.replace(/^\/+/, '');
  const imagePath = /^(static|media)\//.test(relative) ? relative : 'static/' + relative;
  return serverURL.replace(/\/+$/, '') + '/' + imagePath;
}
