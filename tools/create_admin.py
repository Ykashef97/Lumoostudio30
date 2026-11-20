"""Creates the one LumaDesign admin account in Supabase. Run it with create-admin.bat.

  python tools/create_admin.py           create the account (does nothing if it already exists)
  python tools/create_admin.py --reset   give the existing account a new generated password

The generated password is printed once, in this window only. It is not saved anywhere.
Passwords are stored by Supabase as bcrypt hashes; the plain password never leaves this computer
except to create the account and to check that signing in works.
"""
import base64
import json
import secrets
import string
import sys
import urllib.error
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from env import key_headers, load_env  # noqa: E402

USERNAME = 'admin'


def request(method, url, headers, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={**headers, 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            return res.status, json.loads(res.read() or b'null')
    except urllib.error.HTTPError as error:
        try:
            return error.code, json.loads(error.read() or b'null')
        except ValueError:
            return error.code, None


def generate_password(length=20):
    """Random password with upper and lower case letters, digits and symbols (from Python's secrets module)."""
    symbols = '!@#$%^&*-_=+?'
    alphabet = string.ascii_letters + string.digits + symbols
    while True:
        password = ''.join(secrets.choice(alphabet) for _ in range(length))
        if (any(c.islower() for c in password) and any(c.isupper() for c in password)
                and any(c.isdigit() for c in password) and any(c in symbols for c in password)):
            return password


def find_user(base, admin_headers, email):
    page = 1
    while True:
        status, body = request('GET', f'{base}/auth/v1/admin/users?page={page}&per_page=100', admin_headers)
        if status != 200:
            raise SystemExit(f'Could not list accounts (HTTP {status}): {body}\nCheck SUPABASE_SERVICE_ROLE_KEY in .env.')
        users = body.get('users', []) if isinstance(body, dict) else []
        for user in users:
            if (user.get('email') or '').lower() == email.lower():
                return user
        if len(users) < 100:
            return None
        page += 1


def jwt_claims(token):
    payload = token.split('.')[1]
    return json.loads(base64.urlsafe_b64decode(payload + '=' * (-len(payload) % 4)))


def check_sign_in(base, anon_headers, email, password):
    status, body = request('POST', f'{base}/auth/v1/token?grant_type=password', anon_headers, {'email': email, 'password': password})
    return status, body


def main():
    env = load_env(['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'])
    base, email = env['SUPABASE_URL'], env.get('ADMIN_EMAIL') or 'admin@yourwebsite.com'
    admin_headers = key_headers(env['SUPABASE_SERVICE_ROLE_KEY'])
    anon_headers = key_headers(env['SUPABASE_ANON_KEY'])
    reset = '--reset' in sys.argv
    attributes = {'email_confirm': True, 'app_metadata': {'role': 'admin'}, 'user_metadata': {'username': USERNAME}}

    user = find_user(base, admin_headers, email)
    if user and not reset:
        # Make sure it is still an admin; the password is left unchanged.
        request('PUT', f"{base}/auth/v1/admin/users/{user['id']}", admin_headers, attributes)
        print(f'\nThe admin account ({email}) already exists. Nothing was changed, and no new password was made.')
        print('Forgot the password? Run:  create-admin.bat --reset\n')
        return

    password = generate_password()
    if user:
        status, body = request('PUT', f"{base}/auth/v1/admin/users/{user['id']}", admin_headers, {**attributes, 'password': password})
        action = 'given a new password'
    else:
        status, body = request('POST', f'{base}/auth/v1/admin/users', admin_headers, {**attributes, 'email': email, 'password': password})
        action = 'created'
    if status not in (200, 201):
        raise SystemExit(f'Supabase refused the request (HTTP {status}): {body}')

    # Check that the new password works, and that a wrong one is refused.
    status, body = check_sign_in(base, anon_headers, email, password)
    if status != 200 or not body.get('access_token'):
        raise SystemExit(f'The account was {action}, but signing in failed (HTTP {status}): {body}')
    role = jwt_claims(body['access_token']).get('app_metadata', {}).get('role')
    wrong_status, _ = check_sign_in(base, anon_headers, email, password + 'x')
    if role != 'admin':
        raise SystemExit('Signed in, but the account is not marked as admin. Run this again.')
    if wrong_status == 200:
        raise SystemExit('Warning: a wrong password was accepted. Do not use this account; contact your developer.')

    line = '=' * 60
    print(f'\n{line}\n  LumaDesign admin account {action}\n{line}')
    print(f'  Portal:    https://ykashef97.github.io/Lumoostudio30/admin/')
    print(f'  Username:  {USERNAME}   (or {email})')
    print(f'  Password:  {password}')
    print(line)
    print('  Checked: this password signs in, and a wrong password is refused.')
    print('  Copy the password into a password manager now. It is shown only once and')
    print('  is not saved anywhere. Change it after your first login: Settings > Password.')
    print(f'{line}\n')


if __name__ == '__main__':
    main()
