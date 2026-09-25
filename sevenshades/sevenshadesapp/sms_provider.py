"""SMS transport; never expose provider responses, credentials or OTPs in errors."""
import secrets
import logging
import re
import requests
from django.conf import settings

logger = logging.getLogger(__name__)
# Only our own descriptions are exposed; provider payloads may contain private data.
PROVIDER_ERRORS = {
    '408': 'The configured SMS route is invalid.',
    '409': 'This account is not authorized for the configured SMS route.',
    '411': 'The SMS provider rejected the mobile number.',
    '412': 'The Fast2SMS API key is invalid.',
    '413': 'The Fast2SMS API key is disabled.',
    '414': 'The server IP is blocked in the Fast2SMS Dev API settings.',
    '415': 'The Fast2SMS account is disabled.',
    '416': 'The Fast2SMS wallet has insufficient balance.',
    '990': 'Fast2SMS rejected this API version; the integration needs updating.',
    '995': 'Fast2SMS blocked repeated SMS requests to this number. Please wait.',
    '996': 'Complete Fast2SMS account KYC before using the OTP SMS API.',
    '997': 'Fast2SMS requires a numeric OTP value.',
    '998': 'Fast2SMS rejected this route for the requested SMS.',
    '999': 'Fast2SMS requires a single wallet recharge of at least INR 100 before API use.',
}


class SmsError(Exception):
    pass


def test_mode():
    return settings.DEBUG and settings.OTP_TEST_MODE and not settings.FAST2SMS_API_KEY


def available():
    return bool(settings.FAST2SMS_API_KEY) or test_mode()


def new_code():
    return '123456' if test_mode() else f'{secrets.randbelow(1000000):06d}'


def send_sms(phone, code):
    phone, code = str(phone).strip(), str(code)
    if not re.fullmatch(r'[6-9][0-9]{9}', phone):
        raise SmsError('Enter a 10-digit Indian mobile number without +91 or country code.')
    if test_mode():
        return
    api_key = settings.FAST2SMS_API_KEY.strip()
    if not api_key:
        raise SmsError('SMS delivery is not configured. Please contact support.')
    def redact(value):
        text = str(value)
        for private in (api_key, phone, code):
            if private:
                text = text.replace(private, '[REDACTED]')
        return text[:4000]
    try:
        response = requests.post('https://www.fast2sms.com/dev/bulkV2',
            headers={'authorization': api_key, 'Content-Type': 'application/json'},
            json={'route': 'otp', 'variables_values': str(code), 'numbers': str(phone)}, timeout=(5, 15))
    except requests.RequestException as exc:
        logger.warning('Fast2SMS network failure: %s', type(exc).__name__)
        raise SmsError('Unable to reach Fast2SMS. Please try again later.') from None
    if settings.DEBUG:
        logger.warning('Fast2SMS HTTP %s response: %s', response.status_code, redact(response.text))
    try:
        result = response.json()
    except ValueError:
        logger.warning('Fast2SMS returned non-JSON: HTTP %s', response.status_code)
        raise SmsError(f'Fast2SMS returned an invalid response (HTTP {response.status_code}).') from None
    if not response.ok or not isinstance(result, dict) or result.get('return') is not True:
        raw_code = result.get('status_code') if isinstance(result, dict) else None
        provider_code = str(raw_code) if type(raw_code) in (int, str) else ''
        provider_code = provider_code if provider_code.isascii() and provider_code.isdigit() and len(provider_code) <= 4 else 'unknown'
        logger.warning('Fast2SMS rejected SMS: HTTP %s, provider code %s', response.status_code, provider_code)
        if settings.DEBUG:
            actual = result.get('message') if isinstance(result, dict) else None
            reason = redact(actual) if isinstance(actual, (str, list)) and actual else PROVIDER_ERRORS.get(provider_code, 'SMS provider rejected the request.')
            raise SmsError(f'{reason} (Fast2SMS code: {provider_code}, HTTP {response.status_code})')
        raise SmsError('SMS provider could not send the OTP. Please contact support or try later.')
