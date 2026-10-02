"""Validate local dependency versions and native imports without changing data."""
import importlib.metadata as metadata
from pathlib import Path
from packaging.requirements import Requirement
import django, channels, daphne, rest_framework, corsheaders, PIL.Image, pymysql, requests
import jwt
assert callable(jwt.encode) and callable(jwt.decode), 'PyJWT installation is incomplete'

requirements = Path(__file__).resolve().parent.parent / 'sevenshades' / 'requirements.txt'
for requirement in requirements.read_text().splitlines():
    requirement = requirement.strip()
    if not requirement or requirement.startswith('#'):
        continue
    parsed = Requirement(requirement)
    if parsed.marker and not parsed.marker.evaluate():
        continue
    installed = metadata.version(parsed.name)
    if installed not in parsed.specifier:
        raise SystemExit(f'{parsed.name} {installed} does not satisfy {parsed.specifier}')
print('Dependency versions and native imports verified.')
