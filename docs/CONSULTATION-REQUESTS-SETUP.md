# Consultation requests: the Google Sheet copy

Consultation requests from the website are saved in the database and managed in the admin portal, under **Requests**. There you change their status, add private notes, message the customer on WhatsApp and export to Excel.

If you or your partner also want them in a Google Sheet, follow these steps. The Sheet is a **copy**:

- A new request adds a row within 5 minutes.
- When you change a status in the portal, the Status column in the Sheet follows.
- Anything typed into the Sheet stays in the Sheet. It never changes the portal.
- Rows are never duplicated, even if the copy runs twice.

It takes about 10 minutes. You only do it once.

## What you need

- The Google account that should own the Sheet.
- Your Supabase **secret key**: Supabase → your project → **Project Settings → API Keys** → the secret key (it starts with `sb_secret_`). This key gives full access to your database, so paste it only into the script settings below, never into the website, an email or a chat.

## Steps

### 1. Create the Sheet and add the script

1. Go to [sheets.new](https://sheets.new) and name the sheet, for example "LumaDesign requests".
2. Click **Extensions → Apps Script**.
3. Delete everything in the editor. Open `tools/consultation-requests.gs` from this project in Notepad, copy all of it and paste it into the editor.
4. Click the disk icon to save.

### 2. Add your two private settings

1. In the Apps Script editor, click the gear icon (**Project Settings**) on the left.
2. Scroll to **Script properties** and click **Add script property** twice:

   | Property | Value |
   | --- | --- |
   | `SUPABASE_URL` | Your project address, for example `https://abcdefgh.supabase.co` (the same as in the `.env` file) |
   | `SUPABASE_SECRET_KEY` | The secret key from Supabase |

3. Click **Save script properties**.

### 3. Start the automatic copy

1. Go back to the editor (the `<>` icon).
2. In the function list at the top, choose **setup** and click **Run**.
3. Google asks for permission. Choose your account, click **Advanced → Go to … (unsafe)** and **Allow**. The warning appears because you wrote the script yourself; it only works with this Sheet and your database.
4. A **Requests** tab appears with its headings and any requests you already have. From now on it updates every 5 minutes.

### 4. Connect the buttons in the admin portal (optional)

This lets you press **Sync now** and **Rebuild the Sheet** in the portal instead of waiting 5 minutes.

1. In the Apps Script editor click **Deploy → New deployment**.
2. Click the gear next to "Select type" and choose **Web app**.
3. Set **Execute as: Me** and **Who has access: Anyone**. ("Anyone" can only reach the buttons; the script checks that the person pressing them is signed in to the portal as the admin.)
4. Click **Deploy** and copy the **Web app URL** (it ends in `/exec`).
5. In the portal go to **Settings → Google Sheet copy of requests**. Paste the web app address and the Sheet's own address, then click **Save addresses**.
6. Click **Sync now**. The table under it shows each copy, with how many rows were added or updated.

## Share it with your partner

In the Sheet click **Share** and add their email. Give them **Viewer** if they only need to read it. Changing statuses happens in the portal.

## If something goes wrong

| What you see | What to do |
| --- | --- |
| "Add SUPABASE_URL and SUPABASE_SECRET_KEY…" | Step 2: check both property names are spelled exactly as shown |
| "Database answered 401" | The secret key is wrong or was rotated. Copy it again from Supabase |
| "Only the signed-in admin can do this" in the portal | Sign out of the portal and sign in again, then retry |
| "Could not reach the Google script" in the portal | Check the web app address ends in `/exec` and the deployment is for "Anyone" |
| Rows were deleted from the Sheet by mistake | In the portal click **Rebuild the Sheet**. It rewrites the Requests tab from the database |

## Changing the script later

Paste the new version into the editor and save. If you use the portal buttons, also click **Deploy → Manage deployments → edit (pencil) → Version: New version → Deploy**, so the web app uses the new code. The address stays the same.

## Email alerts (optional)

At the top of the script, put your address between the quotes in `NOTIFY_EMAILS`, for example `const NOTIFY_EMAILS = 'you@example.com';`, then save. Each new request then also arrives by email.

## What each column means

| Column | Meaning |
| --- | --- |
| Received | When the request was sent |
| Status | Follows the portal: New, Contacted, Meeting scheduled, In progress, Completed or Cancelled |
| Request ID | The `LD-…` reference the customer saw |
| Name, Phone, Email | How to reach them |
| Contact by | WhatsApp or phone call, as they chose |
| Preferred day, Preferred time | Their preference. The meeting is only booked once you agree a time with them |
| Design, Ref, Category, Photo | The design they asked about, if any |
| Custom setup | Size, finish and cord they chose in the lamp designer |
| Notes | What they wrote |
| Started from | Where on the site they opened the form |
| Page | The page address |
