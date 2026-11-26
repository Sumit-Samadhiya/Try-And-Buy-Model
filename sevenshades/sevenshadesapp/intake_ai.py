"""Gemini Vision & Studio photo helper with deterministic fallback for Shopkeeper Quick Intake."""
import base64
import io
import json
import logging
import os
import re
from typing import Dict

import requests
from django.conf import settings
from PIL import Image, ImageEnhance, ImageOps

logger = logging.getLogger(__name__)


def _fallback_metadata(category_name='', subcategory_name='', color='', unique_code=''):
    clean_color = (color or '').strip()
    clean_sub = (subcategory_name or '').strip()
    clean_cat = (category_name or '').strip()
    base = clean_sub or clean_cat or 'Fashion Garment'
    prefix = f"{clean_color} {base}".strip() if clean_color else base
    title = f"{prefix} ({unique_code})" if unique_code else prefix
    title = title[:70].strip()

    cat_phrase = clean_sub.lower() if clean_sub else (clean_cat.lower() if clean_cat else 'garment')
    color_phrase = f"{clean_color.lower()} " if clean_color else ''
    desc = f"Partner store {color_phrase}{cat_phrase}. Try at home for 15 minutes before you buy."
    return {
        'product_name': title or 'Partner Garment',
        'description': desc[:150],
        'color': clean_color[:70] or 'Assorted',
        'ai_source': 'fallback',
    }


def _extract_json_block(raw_text):
    text = (raw_text or '').strip()
    if text.startswith('```'):
        text = re.sub(r'^```(?:json)?\s*|\s*```$', '', text, flags=re.IGNORECASE | re.DOTALL).strip()
    start = text.find('{')
    end = text.rfind('}')
    if start != -1 and end > start:
        text = text[start:end + 1]
    return json.loads(text)


def analyze_garment_image(
    image_bytes,
    mime_type='image/jpeg',
    category_name='',
    subcategory_name='',
    brand_name='',
    unique_code='',
    color_hint='',
) -> Dict[str, str]:
    """Generate concise product_name, description, and color from an image.

    Falls back deterministically when GEMINI_API_KEY is absent or the API fails.
    """
    fallback = _fallback_metadata(
        category_name=category_name,
        subcategory_name=subcategory_name,
        color=color_hint,
        unique_code=unique_code,
    )
    api_key = (getattr(settings, 'GEMINI_API_KEY', '') or os.environ.get('GEMINI_API_KEY', '')).strip()
    if not api_key or not image_bytes:
        return fallback

    configured_model = (getattr(settings, 'GEMINI_MODEL', '') or os.environ.get('GEMINI_MODEL', 'gemini-flash-latest')).strip()
    candidates = []
    for name in [configured_model, 'gemini-flash-latest', 'gemini-2.5-flash-lite', 'gemini-3-flash-preview']:
        if name and name not in candidates:
            candidates.append(name)

    prompt = (
        "You are merchandising clothing for an Indian doorstep try-and-buy fashion store.\n"
        "Inspect this garment photo and return ONLY valid JSON with keys: "
        "\"product_name\", \"description\", \"color\".\n"
        "Rules:\n"
        "- product_name: catchy e-commerce title, max 65 characters, no SKU/price.\n"
        "- description: concise fabric/fit/occasion summary, max 140 characters.\n"
        "- color: primary visible color in 1-2 words (e.g. Olive Green, Navy Blue).\n"
        f"Context hints: Category={category_name or 'Unknown'}, "
        f"Subcategory={subcategory_name or 'Unknown'}, Brand={brand_name or 'Store'}."
    )

    payload = {
        'contents': [{
            'parts': [
                {'text': prompt},
                {
                    'inlineData': {
                        'mimeType': mime_type or 'image/jpeg',
                        'data': base64.b64encode(image_bytes).decode('ascii'),
                    }
                },
            ]
        }],
        'generationConfig': {
            'temperature': 0.2,
            'maxOutputTokens': 220,
            'responseMimeType': 'application/json',
        },
    }

    for model_name in candidates:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
        try:
            resp = requests.post(url, json=payload, timeout=12)
            if resp.status_code != 200:
                logger.warning('Gemini model %s returned HTTP %s', model_name, resp.status_code)
                continue
            body = resp.json()
            text = body['candidates'][0]['content']['parts'][0]['text']
            parsed = _extract_json_block(text)
            name = str(parsed.get('product_name') or '').strip()[:70]
            desc = str(parsed.get('description') or '').strip()[:150]
            color = str(parsed.get('color') or color_hint or '').strip()[:70]
            if name and desc:
                return {
                    'product_name': name,
                    'description': desc,
                    'color': color or fallback['color'],
                    'ai_source': 'gemini',
                }
        except Exception as exc:
            logger.warning('Gemini intake analyze failed for %s: %s', model_name, exc)

    return fallback


def _pillow_studio_polish(image_bytes):
    """Zero-cost local enhancement: auto-contrast, brightness/color balance, crisp sharpen, 4:5 studio card."""
    img = Image.open(io.BytesIO(image_bytes))
    img = ImageOps.exif_transpose(img).convert('RGB')
    img = ImageOps.autocontrast(img, cutoff=1)
    img = ImageEnhance.Brightness(img).enhance(1.06)
    img = ImageEnhance.Color(img).enhance(1.08)
    img = ImageEnhance.Sharpness(img).enhance(1.22)

    canvas_w, canvas_h = 960, 1200
    pad = 44
    resample = getattr(Image, 'Resampling', Image).LANCZOS
    img.thumbnail((canvas_w - pad * 2, canvas_h - pad * 2), resample)
    canvas = Image.new('RGB', (canvas_w, canvas_h), (247, 248, 245))
    x = (canvas_w - img.width) // 2
    y = (canvas_h - img.height) // 2
    canvas.paste(img, (x, y))

    out = io.BytesIO()
    canvas.save(out, format='JPEG', quality=88, optimize=True)
    return out.getvalue()


def create_studio_product_photo(image_bytes, mime_type='image/jpeg', category_name='', subcategory_name=''):
    """Turn a raw shop photo into an e-commerce studio photo via Gemini Image AI, with Pillow fallback."""
    api_key = (getattr(settings, 'GEMINI_API_KEY', '') or os.environ.get('GEMINI_API_KEY', '')).strip()
    if api_key and image_bytes:
        garment = subcategory_name or category_name or 'clothing garment'
        prompt = (
            f"Create a clean e-commerce catalog product photo of this exact {garment}. "
            "CRITICAL: Keep the garment's exact fabric, color, pattern, print, buttons, collar, and fit 100% identical. "
            "Remove any messy shop background, hands, plastic bags, or price tags, and present the garment neatly centered "
            "on a clean soft warm-ivory studio background with natural softbox lighting and subtle drop shadow."
        )
        payload = {
            'contents': [{
                'parts': [
                    {'text': prompt},
                    {
                        'inlineData': {
                            'mimeType': mime_type or 'image/jpeg',
                            'data': base64.b64encode(image_bytes).decode('ascii'),
                        }
                    },
                ]
            }],
            'generationConfig': {
                'responseModalities': ['IMAGE', 'TEXT'],
            },
        }
        saw_quota_limit = False
        for model_name in ['gemini-2.5-flash-image', 'gemini-3.1-flash-image', 'gemini-3.1-flash-lite-image']:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
            try:
                resp = requests.post(url, json=payload, timeout=25)
                if resp.status_code == 429:
                    saw_quota_limit = True
                    logger.warning('Gemini image model %s returned HTTP 429 quota limit', model_name)
                    continue
                if resp.status_code != 200:
                    logger.warning('Gemini image model %s returned HTTP %s', model_name, resp.status_code)
                    continue
                parts = resp.json()['candidates'][0]['content']['parts']
                for part in parts:
                    inline = part.get('inlineData') or part.get('inline_data')
                    if inline and inline.get('data'):
                        raw = base64.b64decode(inline['data'])
                        return {
                            'image_bytes': raw,
                            'mime_type': inline.get('mimeType') or 'image/png',
                            'studio_mode': 'gemini_image',
                            'notice': 'Studio e-commerce photo generated with Gemini Image AI.',
                        }
            except Exception as exc:
                logger.warning('Gemini image studio failed for %s: %s', model_name, exc)

        polished = _pillow_studio_polish(image_bytes)
        notice = (
            'Gemini image-gen requires a billed AI Studio plan (429 quota); applied free Studio Light & 4:5 e-commerce framing instead.'
            if saw_quota_limit
            else 'Gemini image endpoint unavailable; applied free Studio Light & 4:5 e-commerce framing.'
        )
        return {
            'image_bytes': polished,
            'mime_type': 'image/jpeg',
            'studio_mode': 'studio_polish',
            'notice': notice,
        }

    return {
        'image_bytes': _pillow_studio_polish(image_bytes),
        'mime_type': 'image/jpeg',
        'studio_mode': 'studio_polish',
        'notice': 'Applied free Studio Light & 4:5 e-commerce framing.',
    }
