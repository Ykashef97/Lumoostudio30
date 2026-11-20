# Consultation requests: set up the shared Google Sheet

*Written 20 November 2026 for the owners. About 10 minutes, once. No coding needed.*

When a customer books a consultation on the website, the request becomes a new row in a Google Sheet that both partners can open. You can also get an email for each request.

Until this is set up, the website still works: it hands each request to WhatsApp with all the details written, and the customer presses send. Nothing is stored in that case.

## What you need

- A Google account (Gmail). Use the one you want to own the requests, for example a shared business account.
- The file `tools/consultation-requests.gs` from this project, opened in Notepad.

## Steps

### 1. Create the sheet

1. Go to [sheets.new](https://sheets.new). A new, empty Google Sheet opens.
2. Name it, for example `LumaDesign requests`, at the top left.

### 2. Add the script

1. In the sheet's menu, click **Extensions**, then **Apps Script**. A new tab opens with a code editor.
2. Delete everything in the editor.
3. Open `tools/consultation-requests.gs` in Notepad, select all of it (Ctrl+A), copy (Ctrl+C), and paste it into the editor (Ctrl+V).
4. Optional, for email alerts: near the top, change `const NOTIFY_EMAILS = '';` to your addresses, for example `const NOTIFY_EMAILS = 'you@example.com, partner@example.com';`.
5. Click the **Save** icon (the disk), or press Ctrl+S.

### 3. Deploy it as a web app

1. Click **Deploy** (top right), then **New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Fill in:
   - **Description:** `Website requests`
   - **Execute as:** `Me`
   - **Who has access:** `Anyone`
4. Click **Deploy**.
5. Google asks you to authorise. Click **Authorize access**, choose your account, then **Advanced** and **Go to … (unsafe)**, then **Allow**. "Unsafe" only means Google has not reviewed this small script; it is your own script, running in your own account.
6. Copy the **Web app URL**. It starts with `https://script.google.com/macros/s/` and ends with `/exec`.

"Anyone" is needed so the website can send requests without the customer logging in to Google. People with the link can only add a request; they cannot read the sheet.

### 4. Connect the website

1. Open `assets/js/config.js` in Notepad.
2. Find `LUMA_REQUESTS` and paste the link between the quote marks:

   ```js
   export const LUMA_REQUESTS = {
     endpoint: 'https://script.google.com/macros/s/XXXXXXXX/exec',
     calendarUrl: ''
   };
   ```

3. Save, check with `preview.bat`, then publish (see `WEBSITE-GUIDE.md`, section 8).

### 5. Test it (2 minutes)

1. Paste the web-app link into your browser. You should see `{"ok":true,"service":"LumaDesign consultation requests"}`.
2. On the website, tap the heart on any design, then **Discuss this design**. Fill in your own name and phone, and send.
3. You should see **Request received** with a reference such as `LD-4M1OGAFG`.
4. In the sheet, a **Requests** tab appears with your row. Its **Status** column has a dropdown: New, Contacted, Meeting agreed, Done, Not a fit.

If the website shows **We could not send that**, check that the link in `config.js` ends with `/exec` and that "Who has access" is **Anyone**.

## Share it with your partner

In the sheet, click **Share** and add your partner's email as an **Editor**. Both of you then see every request as it arrives and can update its status.

## Changing the script later

After editing the script, click **Deploy**, then **Manage deployments**, the pencil icon, **Version: New version**, and **Deploy**. The web-app link stays the same, so `config.js` does not change.

## Adding a booking calendar later

If you start using a booking page (for example a Google Calendar appointment schedule, Cal.com or Calendly), paste its link into `calendarUrl` in `config.js`. After a customer sends a request, the confirmation then also offers **Pick a time now**. The website never shows times as available unless they come from a real calendar like this.

## What each column means

| Column | What it holds |
| --- | --- |
| Received | Date and time the request arrived |
| Status | Your progress: New, Contacted, Meeting agreed, Done, Not a fit |
| Request ID | The reference the customer sees, for example LD-4M1OGAFG |
| Name, Phone, Email | How to reach the customer (email is optional) |
| Contact by | WhatsApp or phone call, as the customer chose |
| Preferred day, Preferred time | The customer's preference, if they gave one |
| Design, Ref, Category, Photo | The design they want to discuss, with a link to its photo |
| Custom setup | Size, finish and cord, if they shaped it in the lamp designer |
| Notes | Anything they wrote, such as room size or ceiling height |
| Started from | Where they pressed the button: like, details, shortlist, designer, contact, and so on |
| Page | The page they were on |
