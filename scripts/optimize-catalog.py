"""Build deduplicated, content-versioned WebP storefront assets; retain originals."""
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageOps

root = Path(__file__).resolve().parents[1]
destination = root / 'sevenshadesfrontend/public/catalog'
destination.mkdir(parents=True, exist_ok=True)
manifest = {}
original_bytes = 0
for source in sorted((root / 'sevenshades/static').rglob('*')):
    if source.suffix.lower() not in {'.png', '.jpg', '.jpeg', '.webp'}:
        continue
    digest = hashlib.sha256(source.read_bytes()).hexdigest()[:16]
    variants = {}
    with Image.open(source) as opened:
        image = ImageOps.exif_transpose(opened).convert('RGBA' if 'A' in opened.getbands() or 'transparency' in opened.info else 'RGB')
        for width in (480, 960, 1600):
            name = f'{digest}-{width}.webp'
            target = destination / name
            if not target.exists():
                resized = image.copy()
                resized.thumbnail((width, width), Image.Resampling.LANCZOS)
                resized.save(target, 'WEBP', quality=78, method=6)
            variants[str(width)] = f'/catalog/{name}'
    manifest['static/' + source.relative_to(root / 'sevenshades/static').as_posix()] = variants
    original_bytes += source.stat().st_size
(root / 'sevenshadesfrontend/src/services/catalogImages.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'source_images': len(manifest), 'original_bytes': original_bytes, 'optimized_all_sizes_bytes': sum(p.stat().st_size for p in destination.glob('*.webp'))}))
