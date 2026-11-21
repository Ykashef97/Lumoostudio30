# Admin portal: one-time setup

*Written 20 November 2026 for the owners. About 15 minutes. No coding needed.*

The admin portal stores the website's content, images and consultation requests in **Supabase**, a hosted database with secure logins and image storage. The free plan is enough for LumaDesign. You do these steps once; after that everything is managed in the portal at `https://ykashef97.github.io/Lumoostudio30/admin/`.

You will need: about 15 minutes, internet, Python (already on this computer), and an email address for the Supabase account.

## Step 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) and click **Start your project**. Sign up with GitHub or an email.
2. Click **New project**.
3. Fill in:
   - **Name:** `lumadesign`
   - **Database password:** click **Generate a password**, then **copy it into your password manager**. You need it in step 3.
   - **Region:** `Central EU (Frankfurt)`, the nearest to Egypt.
   - **Plan:** Free.
4. Click **Create new project** and wait about two minutes until it says the project is ready.

## Step 2. Turn off public sign-ups

Only you should be able to have an account.

1. In the left menu, open **Authentication**, then **Sign In / Providers**.
2. Turn off **Allow new users to sign up**, and click **Save**.

## Step 3. Copy four values into the `.env` file

1. In the project folder, open the file `.env` with Notepad. It has empty lines like `SUPABASE_URL=`.
2. Paste each value straight after its `=` sign, with no spaces or quote marks:

   | Line in `.env` | Where to find it in Supabase |
   | --- | --- |
   | `SUPABASE_URL` | **Project Settings → Data API → Project URL** (looks like `https://abcd1234.supabase.co`) |
   | `SUPABASE_ANON_KEY` | **Project Settings → API Keys**: the **anon** key (or the **publishable** key) |
   | `SUPABASE_SERVICE_ROLE_KEY` | Same page: the **service_role** key (or a **secret** key). Click **Reveal** to copy it |
   | `SUPABASE_DB_URL` | Click **Connect** at the top of the dashboard → **Session pooler** → copy the URI. Replace `[YOUR-PASSWORD]` with the database password from step 1 |

3. Save the file.

**Keep `.env` private.** The service_role key and the database password give full control of the database. The file is excluded from GitHub automatically; never email it or paste it anywhere public.

## Step 4. Build the database

Double-click **`setup-backend.bat`** in the project folder.

The first time, it spends a minute preparing a small private Python environment, then it:

- creates the tables, access rules and image storage;
- imports today's website content: 54 designs, 3 collections, 6 rooms (Kitchen hidden until it has a photo), the page text and the 59 existing photos;
- publishes the first version of the site.

It ends with a list of what was added and **Next: double-click create-admin.bat**. It is safe to run again later: it never overwrites changes made in the portal.

## Step 5. Create the admin account

Double-click **`create-admin.bat`**. It:

1. creates the account `admin` (email `admin@yourwebsite.com`) with a randomly generated password;
2. checks that the password signs in and that a wrong password is refused;
3. **shows the password once, in that window only.** Copy it into your password manager straight away. It is not saved anywhere.

Running it again does not create a second account and does not change the password.

**Forgot the password?** Because `admin@yourwebsite.com` cannot receive email, reset it from this computer: open a terminal in the project folder and run `create-admin.bat --reset`. It shows a new password once.

## Step 6. Publish and sign in

1. Publish the project as usual (commit, push, and merge into the `main` branch). The files `assets/js/backend.js` and `assets/js/site-defaults.js` now contain your project's public address and should be included.
2. Open `https://ykashef97.github.io/Lumoostudio30/admin/` and sign in with `admin` and the password.
3. Go to **Settings → Change password** and choose your own password.

How to use the portal day to day: [ADMIN-GUIDE.md](ADMIN-GUIDE.md).

## If something goes wrong

| Message | What to do |
| --- | --- |
| "These settings are empty in the .env file" | Step 3: a value is missing. Check there is nothing after the value, such as a space |
| "Could not connect to the database" | Use the **Session pooler** string (not "Direct connection") and make sure `[YOUR-PASSWORD]` is replaced, including the square brackets |
| "Could not list accounts" or HTTP 401 | The service_role key is wrong or incomplete. Copy it again with the **Copy** button |
| "the image bucket was created, but its upload rules need to be added" | See below |

### If uploads are refused

Rarely, Supabase does not let the setup script add the upload rules for images. Then, in Supabase, open **SQL Editor → New query**, paste the following, and click **Run**:

```sql
create policy "media admin select" on storage.objects for select to authenticated using (bucket_id = 'media' and public.is_admin());
create policy "media admin insert" on storage.objects for insert to authenticated with check (bucket_id = 'media' and public.is_admin());
create policy "media admin update" on storage.objects for update to authenticated using (bucket_id = 'media' and public.is_admin());
create policy "media admin delete" on storage.objects for delete to authenticated using (bucket_id = 'media' and public.is_admin());
```

## What the free plan includes

500 MB of database, 1 GB of image storage and 5 GB of downloads a month: plenty for this site. Existing photos keep being served from GitHub Pages; only photos you upload in the portal use Supabase storage. A free project pauses after a week with no activity at all; any visit to the website or the portal keeps it awake, and a paused project can be resumed from the Supabase dashboard.
