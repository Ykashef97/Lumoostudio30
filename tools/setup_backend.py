"""Sets up (or updates) the LumaDesign database in Supabase. Run it with setup-backend.bat.

What it does, every time it runs:
  1. Applies supabase/schema.sql: tables, access rules, API functions, the image bucket.
  2. Imports today's content from supabase/seed.json (designs, rooms, collections, page text, photos),
     but only what is not there yet. It never overwrites changes made in the admin portal.
  3. Publishes the first version of the site if none exists.
  4. Writes assets/js/backend.js (the public project address and public key) and
     assets/js/site-defaults.js (a copy of the published site, used if the database cannot be reached).

  python tools/setup_backend.py                 full setup (needs the .env file filled in)
  python tools/setup_backend.py --defaults-only only rewrite site-defaults.js from seed.json (no database)
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from env import ROOT, load_env  # noqa: E402

SCHEMA = ROOT / 'supabase' / 'schema.sql'
SEED = ROOT / 'supabase' / 'seed.json'
BACKEND_JS = ROOT / 'assets' / 'js' / 'backend.js'
DEFAULTS_JS = ROOT / 'assets' / 'js' / 'site-defaults.js'


def write_backend_js(url, anon_key, admin_email):
    BACKEND_JS.write_text(
        '// Written by tools/setup_backend.py. These values are public by design: every table is\n'
        '// protected by database access rules, so they only allow what a visitor is allowed to do.\n'
        f"export const SUPABASE_URL = '{url}';\n"
        f"export const SUPABASE_ANON_KEY = '{anon_key}';\n"
        '// The admin portal lets "admin" stand for this login email.\n'
        f"export const ADMIN_LOGIN_EMAIL = '{admin_email}';\n",
        encoding='utf-8', newline='\n')


def write_defaults_js(site):
    DEFAULTS_JS.write_text(
        '// Written by tools/setup_backend.py: a copy of the published site, used only if the database\n'
        '// cannot be reached. Do not edit by hand; change content in the admin portal instead.\n'
        'export const SITE_DEFAULTS = ' + json.dumps(site, ensure_ascii=False, separators=(',', ':')) + ';\n',
        encoding='utf-8', newline='\n')


def site_from_seed(seed):
    """Same shape as the database's build_site(), made from seed.json (used before the database exists)."""
    designs = sorted([d for d in seed['designs'] if d['status'] == 'published'], key=lambda d: (d['position'], d['name']))
    live = {d['id'] for d in designs}
    spaces = sorted([s for s in seed['spaces'] if s['status'] == 'published'], key=lambda s: (s['position'], s['name']))
    collections = sorted([c for c in seed['collections'] if c['status'] == 'published'], key=lambda c: (c['position'], c['name']))
    content = {k: v for k, v in seed['content'].items() if k != 'settings'}
    text = json.dumps(content)
    refs = {d['image_id'] for d in designs} | {c['cover_id'] for c in collections} | {s['image_id'] for s in spaces}
    refs |= {m['id'] for m in seed['media'] if m['id'] in text}
    media = {m['id']: {'source': m['source'], 'path': m['path'], 'medium': m['medium_path'], 'thumb': m['thumb_path'],
                       'alt': m['alt'], 'title': m['title'], 'width': m['width'], 'height': m['height'],
                       'focal': [0.5, 0.5], 'tone': m['tone']} for m in seed['media'] if m['id'] in refs}
    return {
        'version': 1,
        'content': content,
        'settings': {'pricing': seed['content']['settings']['pricing'], 'calendarUrl': seed['content']['settings']['calendarUrl']},
        'designs': [{'id': d['id'], 'slug': d['slug'], 'ref': d['ref'], 'name': d['name'], 'category': d['category'],
                     'description': d['description'], 'model': d['model'], 'image': d['image_id'], 'specs': d.get('specs') or {}} for d in designs],
        'collections': [{'id': c['id'], 'slug': c['slug'], 'name': c['name'], 'description': c['description'], 'cover': c['cover_id'],
                         'designs': [x for x in c['designs'] if x in live]} for c in collections],
        'spaces': [{'id': s['id'], 'slug': s['slug'], 'name': s['name'], 'title': s['title'], 'label': s['label'], 'intro': s['intro'],
                    'icon': s['icon'], 'image': s['image_id'], 'mobileImage': None, 'focal': [0.5, 0.5],
                    'designs': [x for x in s['designs'] if x in live]} for s in spaces],
        'media': media,
    }


def seed_database(conn, seed):
    added = {}
    with conn.cursor() as cur:
        def insert(table, rows, columns):
            new_ids = set()
            for row in rows:
                cols = ', '.join(columns)
                marks = ', '.join(['%s'] * len(columns))
                values = [json.dumps(row[c]) if isinstance(row.get(c), (dict, list)) and c != 'tone' else row.get(c) for c in columns]
                cur.execute(f'insert into public.{table} ({cols}) values ({marks}) on conflict do nothing returning id', values)
                if cur.fetchone():
                    new_ids.add(row['id'])
            added[table] = len(new_ids)
            return new_ids

        insert('media_folders', seed['folders'], ['id', 'name', 'position'])
        insert('media', seed['media'], ['id', 'folder_id', 'source', 'path', 'medium_path', 'thumb_path', 'mime', 'width', 'height', 'title', 'alt', 'tone'])
        insert('designs', seed['designs'], ['id', 'slug', 'ref', 'name', 'category', 'description', 'model', 'image_id', 'status', 'position', 'specs'])
        new_collections = insert('collections', seed['collections'], ['id', 'slug', 'name', 'description', 'cover_id', 'status', 'position'])
        new_spaces = insert('spaces', seed['spaces'], ['id', 'slug', 'name', 'title', 'label', 'intro', 'icon', 'image_id', 'status', 'position'])
        # Links only for collections and rooms created just now, so later edits in the portal are never undone.
        for c in seed['collections']:
            if c['id'] in new_collections:
                for pos, design in enumerate(c['designs']):
                    cur.execute('insert into public.collection_designs (collection_id, design_id, position) values (%s, %s, %s) on conflict do nothing', (c['id'], design, pos))
        for s in seed['spaces']:
            if s['id'] in new_spaces:
                for pos, design in enumerate(s['designs']):
                    cur.execute('insert into public.space_designs (space_id, design_id, position) values (%s, %s, %s) on conflict do nothing', (s['id'], design, pos))
        content_added = 0
        for area, data in seed['content'].items():
            cur.execute('insert into public.site_content (area, data) values (%s, %s) on conflict do nothing returning area', (area, json.dumps(data, ensure_ascii=False)))
            content_added += bool(cur.fetchone())
        added['site_content'] = content_added
        cur.execute("insert into public.admin_settings (key, value) values ('sheet', %s) on conflict do nothing",
                    (json.dumps({'webAppUrl': '', 'sheetUrl': ''}),))
        cur.execute('select count(*) from public.site_snapshots')
        if cur.fetchone()[0] == 0:
            cur.execute("insert into public.site_snapshots (data, note) select public.build_site(), 'Initial import'")
            added['first published version'] = 1
        cur.execute('select public.public_site()')
        site = cur.fetchone()[0]
    return added, site


def main():
    seed = json.loads(SEED.read_text(encoding='utf-8'))
    if '--defaults-only' in sys.argv:
        write_defaults_js(site_from_seed(seed))
        print('Wrote', DEFAULTS_JS.relative_to(ROOT))
        return

    env = load_env(['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_DB_URL'])
    try:
        import psycopg
    except ImportError:
        raise SystemExit('The database library is missing. Run setup-backend.bat instead of this file.')

    warnings = []
    print('Connecting to the database...', flush=True)
    try:
        conn = psycopg.connect(env['SUPABASE_DB_URL'], connect_timeout=20, sslmode='require')
    except psycopg.OperationalError as error:
        raise SystemExit('\nCould not connect to the database:\n  ' + str(error).strip() +
                         '\nCheck SUPABASE_DB_URL in .env: use the "Session pooler" connection string with your database password filled in.\n')
    conn.add_notice_handler(lambda notice: warnings.append(notice.message_primary))
    with conn:
        print('Applying the database structure...', flush=True)
        conn.execute(SCHEMA.read_text(encoding='utf-8'))
        print('Importing content...', flush=True)
        added, site = seed_database(conn, seed)
    conn.close()

    write_backend_js(env['SUPABASE_URL'], env['SUPABASE_ANON_KEY'], env.get('ADMIN_EMAIL') or 'admin@yourwebsite.com')
    write_defaults_js({k: v for k, v in site.items() if k not in ('publishedAt', 'snapshot')})

    print('\nDone. Added this run (0 means it was already there):')
    for table, count in added.items():
        print(f'  {table:<26} {count}')
    print('\nWrote assets/js/backend.js and assets/js/site-defaults.js.')
    if any('STORAGE_POLICIES_NEED_DASHBOARD' in w for w in warnings):
        print('\nNOTE: the image bucket was created, but its upload rules need to be added once in the Supabase')
        print('dashboard. See docs/ADMIN-SETUP.md, "If uploads are refused".')
    print('\nNext: double-click create-admin.bat to create the admin account.\n')


if __name__ == '__main__':
    main()
