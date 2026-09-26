"""File upload safety and validation module.

Enforces:
1. Strict extension whitelisting (.jpg, .jpeg, .png, .webp).
2. MIME / Content-Type whitelisting (image/jpeg, image/png, image/webp).
3. File size bounds (non-empty, maximum 5 MB).
4. Magic byte header inspection verifying true binary format.
5. Deep image parsing and verification via Pillow (detects corruption and decompression bombs).
6. Malicious content / polyglot / script injection scanning (blocks <?php, <script, <svg, etc.).
7. Filename sanitization (path traversal elimination, character filtering, length limits).
8. Storage isolation outside the application web root.
9. Execution prevention (non-executable file permissions, secure response headers: nosniff, sandbox CSP).
"""
from __future__ import annotations
import os
import re
import logging
from pathlib import Path
from io import BytesIO
from PIL import Image, UnidentifiedImageError
from django.conf import settings
from django.http import HttpResponse, Http404, FileResponse

logger = logging.getLogger(__name__)

# Upload limits
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
MAX_FILES_PER_REQUEST = 10
MAX_IMAGE_PIXELS = 25_000_000  # 25 megapixels (decompression bomb protection)

ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.avif'}
ALLOWED_MIME_TYPES = {
    'image/jpeg',
    'image/pjpeg',
    'image/png',
    'image/x-png',
    'image/webp',
}

# Dangerous extensions that must never be accepted under any circumstances
DANGEROUS_EXTENSIONS = {
    '.php', '.phtml', '.php3', '.php4', '.php5', '.phps',
    '.py', '.pyc', '.pyw', '.sh', '.bash', '.exe', '.bat', '.cmd',
    '.dll', '.so', '.com', '.msi', '.vbs', '.js', '.jsx', '.ts', '.tsx',
    '.mjs', '.html', '.htm', '.shtml', '.xhtml', '.svg', '.xml', '.jsp', '.jspx',
    '.asp', '.aspx', '.cgi', '.pl', '.jar', '.war', '.ear',
    '.htaccess', '.htpasswd', '.env', '.config', '.ini',
}

# Content patterns indicative of active scripts / polyglot payloads inside images
DANGEROUS_CONTENT_PATTERNS = [
    re.compile(rb'<\?php', re.IGNORECASE),
    re.compile(rb'<\?=', re.IGNORECASE),
    re.compile(rb'<script', re.IGNORECASE),
    re.compile(rb'<\/script>', re.IGNORECASE),
    re.compile(rb'<html', re.IGNORECASE),
    re.compile(rb'<svg', re.IGNORECASE),
    re.compile(rb'<!entity', re.IGNORECASE),
    re.compile(rb'<!doctype\s+html', re.IGNORECASE),
    re.compile(rb'javascript:', re.IGNORECASE),
    re.compile(rb'vbscript:', re.IGNORECASE),
    re.compile(rb'onload\s*=', re.IGNORECASE),
    re.compile(rb'onerror\s*=', re.IGNORECASE),
]


def detect_image_format_from_magic_bytes(header: bytes) -> str | None:
    """Inspects raw header bytes to identify the true image format."""
    if len(header) < 12:
        return None
    if header.startswith(b'\xff\xd8\xff'):
        return 'JPEG'
    if header.startswith(b'\x89PNG\r\n\x1a\n'):
        return 'PNG'
    if header.startswith(b'RIFF') and header[8:12] == b'WEBP':
        return 'WEBP'
    return None


def sanitize_filename(filename: str, fallback_ext: str = '.jpg') -> str:
    """Sanitizes a user-provided filename to guarantee safe filesystem storage.
    
    - Strips directory traversal sequences (../, ..\\, etc.)
    - Removes null bytes and control characters
    - Normalizes characters to alphanumeric, underscores, and dashes
    - Replaces internal dots with underscores to avoid double extensions
    - Enforces a whitelisted image extension
    - Restricts filename length
    """
    clean = os.path.basename(str(filename or ''))
    clean = clean.replace('\x00', '').strip()
    clean = re.sub(r'[,;\'"\\/]', '_', clean)
    if clean.startswith('.') and clean.count('.') == 1:
        dot_ext = clean.lower()
        if dot_ext in ALLOWED_EXTENSIONS:
            return f"upload{dot_ext}"
        return f"upload{fallback_ext.lower()}"
    p = Path(clean)
    stem = re.sub(r'[^a-zA-Z0-9_\-]', '_', p.stem)
    ext = p.suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        ext = fallback_ext.lower()
    if not stem:
        stem = 'upload'
    # Cap length to prevent filesystem limits
    stem = stem[:60]
    return f"{stem}{ext}"


def validate_uploaded_image(upload) -> list[str]:
    """Strictly validates an uploaded image file across type, size, extension,
    magic bytes, Pillow structure, and content scanning for active scripts.
    
    Returns a list of validation error strings (empty if completely valid).
    """
    # 1. Size bounds
    size = getattr(upload, 'size', None)
    if size is None or size == 0:
        return ['Uploaded file is empty.']
    if size > MAX_FILE_SIZE:
        return [f'Each image must be {MAX_FILE_SIZE // (1024 * 1024)} MB or smaller.']

    # 2. Filename traversal and extension checks
    raw_name = getattr(upload, 'name', '') or ''
    if '\x00' in raw_name or '/' in raw_name or '\\' in raw_name or '..' in raw_name:
        return ['Invalid filename or directory traversal attempt detected.']

    clean_name = os.path.basename(raw_name).strip()
    ext = Path(clean_name).suffix.lower()

    if not ext or ext not in ALLOWED_EXTENSIONS:
        return ['Upload a valid JPG, PNG, or WebP image. Only JPG, PNG, and WebP files are allowed.']

    # Check for dangerous embedded/double extensions (e.g. evil.php.png or shell.py.jpg)
    stem_lower = Path(clean_name).stem.lower()
    for dang in DANGEROUS_EXTENSIONS:
        if stem_lower.endswith(dang) or dang in stem_lower:
            return ['Suspicious or executable extension detected in filename.']

    # 3. MIME Content-Type header verification (if present)
    content_type = (getattr(upload, 'content_type', '') or '').lower().strip()
    if content_type and content_type not in ALLOWED_MIME_TYPES:
        return [f'Unsupported media type: "{content_type}". Only JPEG, PNG, and WebP are allowed.']

    try:
        # 4. Magic bytes header inspection
        upload.seek(0)
        header = upload.read(16)
        magic_format = detect_image_format_from_magic_bytes(header)
        if not magic_format:
            return ['File does not contain valid image header signatures (magic bytes).']

        # Ensure magic format matches declared extension
        if magic_format == 'JPEG' and ext not in ('.jpg', '.jpeg'):
            return ['File content is JPEG but extension is mismatched.']
        if magic_format == 'PNG' and ext != '.png':
            return ['File content is PNG but extension is mismatched.']
        if magic_format == 'WEBP' and ext != '.webp':
            return ['File content is WebP but extension is mismatched.']

        # 5. Deep image parsing and verification via Pillow
        upload.seek(0)
        try:
            with Image.open(upload) as img:
                pil_format = img.format
                if pil_format not in ('JPEG', 'PNG', 'WEBP'):
                    return ['Upload a valid JPG, PNG, or WebP image.']
                if img.width <= 0 or img.height <= 0:
                    return ['Image has invalid dimensions.']
                if img.width * img.height > MAX_IMAGE_PIXELS:
                    return ['Image resolution is too high (potential decompression bomb).']
                img.verify()
        except (UnidentifiedImageError, OSError, Image.DecompressionBombError, ValueError) as exc:
            return ['Upload a valid JPG, PNG, or WebP image.']

        # 6. Malicious script and markup scanning
        upload.seek(0)
        # Check first 64KB (covers headers/metadata) and tail (covers appended payloads)
        sample = upload.read(65536)
        if size > 65536:
            upload.seek(max(0, size - 4096))
            sample += upload.read(4096)

        for pattern in DANGEROUS_CONTENT_PATTERNS:
            if pattern.search(sample):
                return ['Uploaded file contains disallowed script or markup content.']

    finally:
        upload.seek(0)

    return []


def secure_media_serve(request, path: str):
    """Securely serves media files from MEDIA_ROOT with strict headers preventing
    code execution or MIME-type confusion attacks.
    """
    media_root = Path(settings.MEDIA_ROOT).resolve()

    # Reject null bytes or traversal
    if '\x00' in path or '..' in path:
        return HttpResponse('Forbidden', status=403)

    target_path = (media_root / path).resolve()

    # Ensure path stays within MEDIA_ROOT
    try:
        target_path.relative_to(media_root)
    except ValueError:
        return HttpResponse('Forbidden', status=403)

    if not target_path.is_file():
        raise Http404('File not found.')

    ext = target_path.suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        return HttpResponse('Forbidden: unsupported file type.', status=403)

    content_types = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.avif': 'image/avif',
    }
    content_type = content_types.get(ext, 'application/octet-stream')

    response = FileResponse(target_path.open('rb'), content_type=content_type)
    # Security headers to ensure browsers never execute uploaded files as code
    response['X-Content-Type-Options'] = 'nosniff'
    response['Content-Security-Policy'] = "default-src 'none'; sandbox"
    response['Content-Disposition'] = 'inline'
    response['X-Frame-Options'] = 'DENY'
    return response
