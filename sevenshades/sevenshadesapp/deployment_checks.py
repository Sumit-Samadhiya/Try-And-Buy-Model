from django.conf import settings
from django.core.checks import Warning, register, Tags

@register(Tags.security, deploy=True)
def production_dependencies(app_configs, **kwargs):
    issues = []
    if not settings.REDIS_URL:
        issues.append(Warning('Configure REDIS_URL for shared rate limits and order events.', id='sevenshades.W001'))
    if settings.DATABASES['default']['ENGINE'].endswith('sqlite3'):
        issues.append(Warning('Production uses SQLite; configure a durable production database.', id='sevenshades.W002'))
    if settings.MEDIA_ROOT == settings.BASE_DIR:
        issues.append(Warning('Set DJANGO_MEDIA_ROOT to persistent storage and copy existing static catalog images before switching.', id='sevenshades.W003'))
    return issues
