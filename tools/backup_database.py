"""Backs up the LumaDesign database to this computer.

Run it with backup-database.bat. It writes a folder backups/<date-time>/ containing:
  - one JSON file per table (requests, notes, history, designs, rooms, collections, page content,
    published versions, media records, settings, activity log, heart counts, sync log),
  - the photos uploaded in the admin portal (photos that came with the website are already in
    the project folder),
  - README.txt saying what is inside.

The backups folder is never committed to Git: it holds customers' personal details.
Keep it private. Restoring a backup is a developer task (the JSON files map 1:1 to the tables).
"""
import json
import sys
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from env import load_env  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
TABLES = [
    'consultation_requests', 'request_notes', 'request_events',
    'designs', 'collections', 'collection_designs', 'spaces', 'space_designs',
    'site_content', 'site_snapshots', 'media', 'media_folders',
    'admin_settings', 'admin_activity', 'design_likes', 'sync_runs',
]


def main():
    env = load_env(['SUPABASE_URL', 'SUPABASE_DB_URL'])
    try:
        import psycopg
    except ImportError:
        raise SystemExit('The database library is missing. Run backup-database.bat instead of this file.')

    stamp = datetime.now().strftime('%Y-%m-%d_%H%M')
    folder = ROOT / 'backups' / stamp
    (folder / 'uploads').mkdir(parents=True, exist_ok=True)
    print('Connecting to the database...', flush=True)
    try:
        conn = psycopg.connect(env['SUPABASE_DB_URL'], connect_timeout=20, sslmode='require')
    except psycopg.OperationalError as error:
        raise SystemExit('\nCould not connect to the database:\n  ' + str(error).strip() +
                         '\nIf the project is paused, open supabase.com and press Restore project, then try again.\n')

    counts = {}
    with conn:
        for table in TABLES:
            rows = conn.execute(f'select coalesce(json_agg(t), \'[]\'::json) from public.{table} t').fetchone()[0]
            (folder / f'{table}.json').write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding='utf-8')
            counts[table] = len(rows)
            print(f'  {table:<24} {len(rows)} rows', flush=True)
        uploads = conn.execute("select path, medium_path, thumb_path from public.media where source = 'storage'").fetchall()
    conn.close()

    saved = failed = 0
    base = env['SUPABASE_URL'] + '/storage/v1/object/public/media/'
    for paths in uploads:
        for path in filter(None, paths):
            target = folder / 'uploads' / path
            target.parent.mkdir(parents=True, exist_ok=True)
            try:
                url = base + '/'.join(urllib.parse.quote(part) for part in path.split('/'))
                with urllib.request.urlopen(url, timeout=60) as response:
                    target.write_bytes(response.read())
                saved += 1
            except Exception as error:  # keep going; report at the end
                failed += 1
                print('  could not download', path, '-', error)
    print(f'  uploaded photos           {saved} files' + (f' ({failed} failed)' if failed else ''))

    (folder / 'README.txt').write_text(
        f'LumaDesign database backup, {datetime.now():%d %B %Y %H:%M}.\n\n'
        'Each .json file is one database table. The uploads folder holds the photos uploaded in the\n'
        'admin portal. This folder contains customers\' personal details: keep it private and do not\n'
        'share it or put it in Git. Restoring is a developer task.\n\n'
        + ''.join(f'{t}: {n} rows\n' for t, n in counts.items()) + f'uploaded photo files: {saved}\n',
        encoding='utf-8')
    print(f'\nDone. Backup saved in backups\\{stamp}\n'
          'Keep this folder private: it contains customers\' names and phone numbers.\n'
          'Tip: copy it to a USB stick or a private cloud folder from time to time.\n')


if __name__ == '__main__':
    main()
