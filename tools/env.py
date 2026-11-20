"""Reads the local .env file (never committed) that holds the Supabase keys."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = ROOT / '.env'


def load_env(required=()):
    values = {}
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text(encoding='utf-8').splitlines():
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            key, value = line.split('=', 1)
            values[key.strip()] = value.strip().strip('"').strip("'")
    missing = [key for key in required if not values.get(key)]
    if missing:
        raise SystemExit(
            '\nThese settings are empty in the .env file: ' + ', '.join(missing) +
            '\nOpen .env in Notepad, paste the values from your Supabase project, save, and run this again.'
            '\nSee docs/ADMIN-SETUP.md, step 3.\n')
    # Accept the URL with or without the API path Supabase sometimes shows after it.
    url = values.get('SUPABASE_URL', '').strip().rstrip('/')
    for suffix in ('/rest/v1', '/auth/v1', '/storage/v1'):
        if url.endswith(suffix):
            url = url[:-len(suffix)]
    values['SUPABASE_URL'] = url
    return values


def key_headers(key):
    """Headers for a Supabase key. New-style keys (sb_...) go only in 'apikey'; older JWT keys also as a bearer token."""
    headers = {'apikey': key}
    if not key.startswith('sb_'):
        headers['Authorization'] = 'Bearer ' + key
    return headers
