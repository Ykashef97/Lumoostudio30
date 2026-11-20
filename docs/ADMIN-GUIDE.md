# LumaDesign admin portal: how to use it

The admin portal is where you change the website and handle consultation requests, without touching any code.

- **Address:** `https://ykashef97.github.io/Lumoostudio30/admin/` (on your computer while testing: `http://localhost:8123/admin/`)
- **Username:** `admin` (or the email `admin@yourwebsite.com`)
- **Password:** the one shown once in the `create-admin` window. It is not saved anywhere else.

First-time setup is in [ADMIN-SETUP.md](ADMIN-SETUP.md). The Google Sheet copy of requests is in [CONSULTATION-REQUESTS-SETUP.md](CONSULTATION-REQUESTS-SETUP.md).

## The one rule: save, preview, publish

Changes to pages, rooms, collections, designs, contact details and prices are **drafts** until you publish.

1. **Save draft** keeps your change in the portal. Visitors do not see it yet.
2. **Preview** opens the real page showing your drafts, with a green bar at the top. Only you see it.
3. **Publish** (top right) makes every saved draft live at once. The bar next to it says "Unpublished changes" when there is something to publish.

Request statuses, private notes and settings for the Google Sheet are saved immediately; they are not part of publishing.

Changed something by mistake after publishing? **Settings → Published versions → Restore** puts an earlier version back on the website straight away.

Visitors may see the old version for up to 5 minutes after you publish, because their browser keeps a copy. A new visitor sees the new version at once.

## Sections

### Dashboard
Counts of requests by status, the latest requests, recent uploads, the most-liked designs (hearts), the last Google Sheet copy and recent changes in the portal.

### Consultation requests
- Search by name, phone or reference. Filter by status and date. Sort newest or oldest first.
- Click a row to open it: contact details, the design and custom setup, the customer's notes, history and your **private notes** (customers never see these).
- Change the **status**: New → Contacted → Meeting scheduled → In progress → Completed (or Cancelled). Every change is recorded in the history.
- **WhatsApp** opens a chat with the customer. **Copy** copies their details.
- **Export CSV** downloads the requests matching your filters. It opens correctly in Excel, Arabic included.

### Homepage
- **Top banner:** headline (put `*stars*` around words for gold italics), buttons and the slides. Each slide has a photo, a room label, the line under the headline and an ALT text (a short description for blind visitors).
- **Notice bar:** the thin line at the very top of every page.
- **Sections:** turn each one on or off with **Show**, move it up or down, and edit its text. `{designCount}` is replaced by the live number of designs.
- **Featured designs:** off at first. Add designs to it and turn it on to show a hand-picked strip.

### Shop by space
Each room has its own page (`space.html?room=…`). Add, edit, reorder, show or hide rooms. Each room needs a banner photo and at least one design before it can be shown. Optional: a taller **phone photo**, and a **focal point** (the part of the photo kept in view on narrow screens). Kitchen is ready as a hidden room; give it a photo and designs, set it to Show, and publish.

### Collections
The filters above the product grid ("Wall lights", "Ceiling lights", "Chandeliers"). Add your own, for example "New arrivals". A design can be in several collections.

### Designs
Every product: name, reference (W-02 style, shown to customers), type, description, price, size, material, lead time, photo, **3D model** (the shape used in the lamp designer; a new design reuses the closest existing shape), order and Show/Hide. Leave the price empty to show "On request".

Hide a design rather than deleting it if it may come back. Deleting removes it from every collection and room.

### About us and Contact us
- **About us:** the banner and a list of blocks (story with photo, text, comparison, steps, values, photo strip of designs, closing call to action). Add, reorder, hide or remove blocks.
- **Contact us:** phone, WhatsApp number, email, city, opening hours, Instagram, TikTok and other links, plus the Contact page text. Anything left empty is hidden on the website. These details are also used in the footer of every page and in all WhatsApp buttons.

### Media library
- Drag photos onto the page, or click **Upload**. JPG, PNG, WebP and SVG are accepted, up to 15 MB each. Photos are resized and converted automatically (a full, a medium and a small version).
- Click a photo to edit its title, **ALT text**, description, folder and focal point, to **replace** the file (every place that uses it updates), or to delete it.
- A photo that is still used somewhere cannot be deleted; the portal lists where it is used.
- Use folders and the search box to keep things tidy. The photos that came with the website are in the library too.

### Settings
- **Change password:** enter the current password, then the new one twice (at least 12 characters, letters and numbers). Keep it in a password manager: with `admin@yourwebsite.com` there is no "forgot password" email.
- **Lamp designer prices and booking:** the estimate in the 3D designer, and an optional online booking link shown after a request is sent.
- **Google Sheet copy of requests:** the two addresses, **Sync now**, **Rebuild the Sheet**, and a log of each copy.
- **Published versions:** restore an earlier version of the website.

## Safety

- Sign out (bottom of the sidebar) on shared computers.
- After 5 wrong passwords the login waits 60 seconds; Supabase also limits attempts.
- The website's code contains no passwords or secret keys. The secret key is only in your `.env` file and in the Google script's private settings.
- Forgot the password? On the computer with the `.env` file, run `create-admin.bat --reset` in a terminal (or ask your developer). It shows a new password once.
