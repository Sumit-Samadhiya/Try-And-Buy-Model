"""Validate local dependency versions and native imports without changing data."""
import importlib.metadata as metadata
from pathlib import Path
import django, channels, daphne, rest_framework, corsheaders, PIL.Image, pymysql, requests

requirements = Path(__file__).resolve().parent.parent / 'sevenshades' / 'requirements.txt'
for requirement in requirements.read_text().splitlines():
    requirement = requirement.strip()
    if not requirement or requirement.startswith('#'):
        continue
    name, version = requirement.split('==')
    assert metadata.version(name) == version, f'{name} needs version {version}'
