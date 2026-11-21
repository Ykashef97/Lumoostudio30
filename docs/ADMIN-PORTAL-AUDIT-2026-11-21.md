# LumaDesign admin portal audit: can the owners run the whole website?

*21 November 2026. Audit only: nothing was changed.*

*Status 21 Nov (later): the four P0 bugs in section 5 are fixed on branch `add-3d-visual` (not yet live). Replaced or deleted photos now stay available until no recent published version uses them; editing pop-ups ask before discarding changes; the status label refreshes after photo edits.*

**How this was checked:**
- Every portal page and every public page script was read.
- The database rules were read.
- Earlier live tests of the portal and website were used as well.

**What the codes mean:**
- **P0 to P3** are priorities. P0 is "fix first".
- **S / M / L** are rough effort sizes: small (hours), medium (a day or two), large (several days).

Developers: the file references are in the appendix.

---

## 1. Executive summary

**The portal already covers the content that changes most often:**
- Products (designs)
- Rooms (Shop by space)
- Collections
- The homepage
- About us and Contact us
- Photos
- Prices
- The Room Studio switch
- Consultation requests

**Changes are safe to make:**
- You edit drafts.
- **Preview** shows them on the real pages; only you see the preview.
- **Publish** puts them live within seconds. No developer and no redeploy are needed.
- **Restore** brings back any of the last 15 published versions.

**The part that still needs a developer is the site's "frame":**
- The menu and the footer
- Google and WhatsApp/Facebook share texts (SEO)
- The Shop by space overview banner
- The wording inside forms, pop-ups and the lamp designer
- Product types (categories)
- The lamp options: sizes, finishes and cords
- New 3D shapes
- Colours, logo and fonts
- The Privacy and "page not found" pages

**Overall:** about **70% of what a visitor sees can be changed in the portal today**. Everyday content is covered; site structure and wording are not.

**Coverage by area:**

| Area | Coverage | Notes |
| --- | --- | --- |
| Products, rooms, collections | ●●●●○ | Complete except product types and options |
| Homepage | ●●●●○ | Text, photos, order, show/hide; no new sections |
| About, Contact | ●●●●○ | Nearly everything; About banner buttons fixed |
| Photos (media library) | ●●●●○ | Good; one serious bug (see section 5) |
| Requests | ●●●○○ | Cannot delete a request or edit a note |
| Settings and prices | ●●●○○ | Prices and switches only |
| Menu, footer, SEO, branding | ○○○○○ | Code only |
| Wording in forms and pop-ups | ○○○○○ | Code only |

**Top 5 actions:**
1. **(P0) Fix photo replace and delete.**
   - **Replace:** replacing a photo deletes the old file at once, so the live website shows a broken image until you publish again.
   - **Delete:** deleting a photo that is no longer in your drafts but still on the live site breaks it too.
2. **(P0) Stop pop-up editors losing typed text.** Editing a design, room, collection or photo in a pop-up and then closing it throws away the changes without asking.
3. **(P1) Add a "Site settings" page:**
   - business name, tagline and footer texts
   - menu labels
   - © line
   - Google/WhatsApp share text and image for each page
4. **(P1) Let the owners delete or archive a request.** This is needed to honour "please delete my data", as promised in the privacy policy.
5. **(P1) Make the Shop by space overview banner and the About banner buttons editable, and add a link picker.** The picker would let a button point to any page, room, design or web address.

---

## 2. What the admin can do today

### Dashboard
- **Request counts:** by status and for the last 7 days.
- **Latest:** the latest requests and recent uploads.
- **Most liked:** the most-hearted designs.
- **Website status:** published or "changes not published yet", plus Google Sheet sync.
- **Activity:** the last 12 changes made in the portal.
- Read-only. Each count opens the matching list.

### Consultation requests
- **Search** by name, phone, email, reference or design.
- **Filter** by status and dates, and **sort** newest or oldest first. Pages of 25.
- **Open a request** to see:
  - the contact details
  - the chosen design and custom setup
  - the room design (picture and list of lights)
  - the customer's notes
  - the full history
- **Act on it:** change the status (saved at once), add private notes, open WhatsApp or call, copy the details.
- **Export to Excel** (CSV): Arabic is kept, and the file is protected against spreadsheet tricks.
- **Cannot:** delete a request, edit or delete a note, or change the customer's details.

### Homepage
- **Top banner:**
  - Small heading and headline (with gold *italics*).
  - Main button: its text, and where it opens, from a list of 7 places.
  - Second button: its text only (it always opens the quote).
  - A live preview of the banner.
- **Slides:** photo, room label, line of text and ALT text. Add, remove and reorder.
- **Notice bar:** on or off, message and link text. The link always opens the consultation form.
- **The 8 homepage sections:**
  - Show or hide each one, and move it up or down.
  - Edit its headings and introduction.
  - Edit its lists: shortcut cards (icon from 15), "How it works" steps, promises, featured designs.
- **Cannot:** add a new section, duplicate one (for example a second featured strip), or delete one.

### Shop by space (rooms)
- **Add, edit, delete, reorder, show or hide rooms.**
- **For each room:**
  - name, page title, introduction
  - web address
  - icon (8 choices)
  - banner photo, phone photo and focal point
  - which designs appear, and in what order
- **Safety:** a room set to Show needs a banner photo and at least one design.
- **Cannot:** edit the overview page (the banner "Lighting for every room" and the three cards at the bottom). The focal point applies only to the banner photo, not the phone photo.

### Collections
- **Add, edit, delete, reorder, show or hide.**
- **For each collection:** name, short code, description, cover photo, and its designs in order.
- A design can be in several collections.

### Designs (products)
- **Add, edit, hide and delete.**
- **For each design:**
  - name and reference (W-02 style, numbered automatically)
  - type
  - description
  - price, size, material, lead time
  - product photo (required)
  - 3D shape
  - order
- **List tools:** search, filter by type, see hearts per design.
- **Cannot:**
  - Create a new type, such as "floor lamp".
  - Choose a 3D shape that no other design of that type uses yet.
  - Set which sizes, finishes or cords a design is offered in.

### About us
- **Banner:** small heading, title, text and photo.
- **Blocks:** add, hide, reorder and remove blocks of 7 kinds:
  - story with photo
  - text
  - comparison
  - steps
  - values
  - photo strip of designs
  - closing message with buttons
- **Cannot:** change the two banner buttons ("Explore the collection", "Book a consultation").

### Contact us
- **Contact details:** phone, WhatsApp, email, city, hours, Instagram, TikTok and any other links.
- **Page content:**
  - banner
  - the four cards (title, text, button, and the WhatsApp greeting)
  - the "What happens next" steps
- **Checks on save:**
  - Egyptian mobile format
  - email format
  - links must start with https://
- **Used everywhere:** these details also feed the footer and every WhatsApp button.

### Media library
- **Upload:** many photos at once, by drag and drop. JPG, PNG, WebP or SVG up to 15 MB.
  - They are resized automatically to three sizes.
  - SVG files are cleaned so they cannot run code.
- **Organise:** folders and search, plus "in use / not used" filters.
- **Edit each photo:** name, ALT text, description, folder, focal point.
- **Replace** a photo everywhere at once. See the bug in section 5.
- **Delete:** a photo that is still used cannot be deleted; the portal lists where it is used.
- **Choose from anywhere:** every photo slot in the portal opens the library to choose or upload.

### Settings
- **Password:** change it (12+ characters, letters and numbers).
- **Lamp designer prices:**
  - per size, cord and bulbs, with the currency
  - a switch to show prices on the website
- **Other switches and links:**
  - the optional booking link
  - Room Studio on/off and its starting light
- **Google Sheet copy:** addresses, **Sync now**, **Rebuild** and a log.
- **Published versions:** the last 15, each with **Restore**.

### Publish, preview and restore
- **Preview:** opens Home, Shop by space, About or Contact with your drafts, which only you see.
- **Publish:**
  - Makes every draft live at once, with an optional note.
  - It refuses to run while the current page has unsaved changes.
- **"Changes not published yet":** the top bar shows when there is something to publish.
- **Leaving with unsaved changes:**
  - Going to another page or logging out asks first.
  - Closing the browser tab warns.

---

## 3. What is missing

**Site frame:**
- Menu labels and links.
- Footer texts and links.
- The © line.
- The brand name in the header.
- The logo and the browser-tab icon.

**Search engines and sharing:**
- Page titles and descriptions for Google.
- The text and picture shown when a link is shared on WhatsApp or Facebook.
- The list of pages given to Google (sitemap).

**Pages:**
- The Shop by space overview banner and its three cards.
- The Privacy page.
- The "page not found" page.

**Buttons and links:**
- The About banner buttons.
- The homepage's second banner button: it always opens the quote.
- The notice-bar link: it always opens the consultation form.
- Linking a button to a room, a design or any web address (only 7 fixed places today).

**Catalogue structure:**
- Product types (wall, ceiling, chandelier).
- Lamp options: sizes 19/33/42 cm, finishes (ivory, black, brass) and cords (white, black).
- The bulb text "Warm white LED bulbs included".
- Which options each design offers.

**3D:**
- New 3D shapes.
- A preview of each shape when choosing it.

**Wording:**
- Every label, message and button inside:
  - the consultation and quote forms
  - the lamp designer
  - Room Studio
  - the selection and shortlist
  - pop-up messages
- The WhatsApp quote message.
- The meeting time slots ("Morning…").

**Homepage:**
- Adding a new section, or a second copy of a section (for example two featured strips).

**Requests:**
- Delete or archive a request.
- Edit or delete a private note.
- A record of quote requests: these go only to WhatsApp today.

**Tools:**
- **Ordering:** drag-and-drop reordering (today it is up/down arrows).
- **Bulk actions:** for example moving 20 photos to a folder at once, or hiding several designs at once.
- **Pages of results:** in Designs and the Media library.
- **History:**
  - a full activity history (today only the last 12)
  - previewing an old version before restoring it
  - versions older than the last 15

**Look and feel:**
- Colours and fonts. This is deliberately kept in code so the design and readability stay consistent; see section 6.

**People:**
- A second login with fewer rights, for example for staff who only handle requests.
- Two-step login.
- A "forgot password" email.

---

## 4. Parts of the website that still need a code change

| What | Why it needs code today | Effort to make it editable |
| --- | --- | --- |
| Menu and footer | Written into each of the 5 pages separately | M: one shared header/footer filled from a new "Site settings" page |
| Page titles, descriptions, share image | Written into each page. WhatsApp and Facebook read the page without running its scripts, so these must be in the page file itself | M: editable in the portal, plus an automatic job that rewrites the page files after Publish |
| Contact page description for Google | Contains the phone number typed in by hand | Part of the item above |
| Shop by space overview banner and cards | Written into the page | S |
| About banner buttons, notice-bar link, second home button | Fixed in the page or script | S, with a link picker |
| Product types | A database rule allows only the three types, and the scripts list them | L: types become a list in the database |
| Sizes, finishes, cords, bulb text | Spread over 4 script files and the designer page | M–L |
| 3D shapes | Each shape is a small program; a new one is real development work | Stays with a developer. Choosing among all existing shapes can be opened up (S) |
| Form, pop-up and designer wording | Written in the scripts | M: a "Website wording" page |
| Privacy page | Static text | S to make editable, but it is a legal text: changes should be checked |
| "Page not found" page | Standalone page | Small value; leave in code |
| Colours, fonts, logo | Design system in the stylesheet | Logo upload S. Colours are better left in code |
| New settings | Each new setting must be added to the publishing step in the database | Developer task by nature |

---

## 5. Usability and security issues

### Bugs to fix first (P0) — fixed 21 Nov

1. **Replacing a photo breaks it on the live site until the next Publish.**
   - The portal deletes the old file straight away.
   - The live website keeps showing the old file until you publish, so visitors see a broken image in the meantime.
   - The confirmation message says the new photo appears "after you publish", which is true, but the old one disappears immediately.
2. **Deleting a photo that the live site still uses breaks it.**
   - The "still in use" check looks only at your drafts.
   - Example: you remove a slide, save without publishing, then delete its photo. The live homepage now shows a broken slide.
3. **The pop-up editors lose typed text without warning.**
   - In the Add/Edit pop-ups for designs, rooms and collections, typing does not count as an unsaved change. Clicking outside the pop-up, pressing Esc or Cancel closes it and the text is gone.
   - The photo details pop-up has the same problem.
4. **The "Changes not published yet" label does not update** after editing or replacing a photo. It catches up on the next page change.

### Smaller usability points

- **Confirmations:**
  - Removing a slide, card, step, promise or link happens without a question. You can still undo by leaving without saving.
  - Request status changes save at once without asking. You can change the status back, and the history keeps both changes.
- **Reordering** uses up/down arrows; long lists would benefit from drag and drop.
- **Long lists:** Designs and Media show everything on one page. Fine for 54 designs and 60 photos; slower past a few hundred.
- **Deleted designs:** a deleted design stays listed (invisibly) in the homepage "featured" and About "photo strip" lists. It is skipped safely, but the list does not tell you.
- **Folders:** renaming uses a plain browser box, and folders cannot be reordered.
- **Activity history** shows only the last 12 changes and not who made them. Today there is only one admin, so "who" does not matter yet.
- **Phones and tablets:**
  - The layout adapts: a drawer menu below 900 px, single columns and bottom sheets below 640 px.
  - It was tested at 320 to 1440 px.
  - Long editing sessions are still easier on a computer.

### Security

**In place:**
- Only the signed-in admin can change anything; visitors cannot read or change the database tables.
- Sign-up is switched off.
- Requests from the website pass strict checks and limits.
- Uploaded room pictures are private.
- Passwords are never stored in the code.

**To improve:**

| Gap | Priority | Notes |
| --- | --- | --- |
| No two-step login | P1-8, already on the roadmap | — |
| Login lockout can be bypassed | — | The "5 tries then wait 60 s" rule lives in the browser. The database's own server limit still applies |
| No automatic sign-out after inactivity | — | Matters on shared computers |
| Only one all-powerful account | P3 | A second, limited role would let staff handle requests without being able to change the website |
| No "forgot password" email | — | The address `admin@yourwebsite.com` cannot receive mail; reset is done on the project computer |

---

## 6. Recommended improvements

**Guard-rails that keep the design safe.** These are why owners can edit freely today without breaking the layout; keep them for every new feature:
- Length limits on every text.
- Required photos.
- A fixed set of icons.
- Ready-made block types instead of free HTML.
- Checks before saving.

| # | Improvement | Effort | Risk to the design |
| --- | --- | --- | --- |
| 1 | Fix the four P0 bugs. For photos: keep old files until they leave the live version and clean them up after Publish; check the live version before deleting | S–M | None |
| 2 | **Site settings** page: business name, tagline, footer note, © line, menu labels, shown on all pages from one place | M | Low (length limits) |
| 3 | **SEO and sharing** per page and per room: title, description, share image; plus an automatic sitemap | M | None |
| 4 | **Link picker** for every button: page, section, room, design, or web address | S | Low |
| 5 | Editable Shop by space overview, About banner buttons, notice-bar link | S | Low |
| 6 | **Requests:** delete (with confirmation) or archive; edit/delete notes; record quote requests | S–M | None |
| 7 | **Keep the offline copy fresh:** the backup copy of the content built into the site goes stale after each Publish; refresh it automatically | S | None |
| 8 | **Product types** as a list in the portal (name, wall/ceiling/hanging, order) | L | Medium (the 3D and Room Studio code depends on the type) |
| 9 | **Lamp options** in the portal: sizes, finishes (with colour swatch), cords, bulb text, tied to prices; per design, which options apply | L | Medium |
| 10 | **3D shape picker** listing all existing shapes with a small preview | S–M | None |
| 11 | **Website wording** page for forms, pop-ups and the designer (with defaults and length limits) | M | Low |
| 12 | Homepage: add a second copy of a section (featured strip, text block) | M | Low |
| 13 | **Media:** pages of results, bulk move/delete, "delete all unused" | M | None |
| 14 | **History:** activity page with filters; preview an old version before restoring; tidy versions older than a year | M | None |
| 15 | **Security:** two-step login, server-side lockout, sign-out after 30–60 minutes idle | M | None |
| 16 | **Roles:** an "editor" or "requests only" login | M | None |
| 17 | **Schedule a publish** (for example a sale banner at midnight) | M | None |
| 18 | **Logo upload.** Keep colours and fonts in code, because free colour choice easily makes text unreadable | S | Low |

---

## 7. Roadmap

| Priority | Items | Why |
| --- | --- | --- |
| **P0: before launch** | 1 (photo replace/delete, pop-up text loss, status label): **done 21 Nov** | Prevents broken images on the live site and lost work |
| **P1: first weeks after launch** | 2, 3, 4, 5, 6, 7 | Lets the owners run the whole visible frame, Google and WhatsApp sharing, and data deletion without a developer |
| **P2: when the catalogue grows** | 8, 9, 10, 11, 12, 13, 14 | Product types and options, wording, bigger libraries |
| **P3: later** | 15, 16, 17, 18, plus Arabic | Security hardening, staff accounts, scheduling, logo |

**After P1:** about **90%** of what visitors see would be in the owners' hands.

**What stays with a developer on purpose:**
- the page layout and visual design
- new kinds of pages or blocks
- new 3D shapes
- legal texts

---

## 8. Main website editing table

| Website Section | Currently Editable? | What Can Be Managed? | What's Missing? | Recommended Improvement |
| --- | --- | --- | --- | --- |
| Homepage | Partial (most) | Banner text, main button, slides, notice bar, 8 sections (show/hide, order, text, cards, steps, promises, featured designs) | New or duplicated sections; second button and notice link targets; any-link targets | Link picker (P1); repeatable sections (P2) |
| Navigation and header | No | — | Menu labels and links, brand name, logo | Site settings page (P1); logo upload (P3) |
| Footer | Partial | Phone, WhatsApp and social links (from Contact) | Tagline, "Good to know" note, links, © line | Site settings page (P1) |
| Products / Designs | Yes | Add/edit/hide/delete, name, reference, type, description, price, size, material, lead time, photo, 3D shape, order | Options per design; choosing an unused 3D shape | Lamp options (P2); shape picker (P2) |
| Categories (types) | No | Which types appear (from published designs) | Add, rename or reorder types | Types as a list (P2) |
| Collections | Yes | Add/edit/delete/reorder/show/hide, description, cover, designs in order | — | — |
| Shop by Space (rooms) | Yes | Add/edit/delete/reorder/show/hide, texts, web address, icon, photos, focal point, designs | Focal point for the phone photo | Small fix (P2) |
| Shop by Space overview page | No | Room tiles (from the rooms) | Banner, intro, buttons, three cards | Make editable (P1) |
| Lamp designer options | No | — | Sizes, finishes, cords, bulb text, labels | Lamp options page (P2); wording page (P2) |
| 3D models | Partial | Choose a shape already used by another design of that type | All shapes, preview, new shapes | Shape picker (P2); new shapes stay with a developer |
| Prices | Yes | Per size, cord, bulbs, currency, show/hide on site; per-design price text | Prices per finish or per design option | With lamp options (P2) |
| Room Studio | Partial | On/off, starting light | Sample room photo, texts, limits | Wording page (P2); sample photo choice (P2) |
| About Us | Yes (nearly all) | Banner, 7 kinds of blocks (add/hide/reorder/remove) | Banner buttons | Link picker (P1) |
| Contact Us and business info | Yes | Phone, WhatsApp, email, city, hours, links, banner, cards, steps | Business name, address for Google, footer texts | Site settings (P1) |
| Social links | Yes | Instagram, TikTok, any other links | Icons for other networks | Small icon set extension (P2) |
| Consultation requests | Partial | View, search, filter, status, notes, WhatsApp/call, export, room designs | Delete/archive, edit notes | Delete/archive (P1) |
| Quotes | No | — (go to WhatsApp only) | Record of quote requests | Record quotes (P1) |
| Favourites / saved designs | Not applicable | Hearts count per design (read-only) | — (kept on the visitor's device, by design; no accounts) | None needed |
| SEO and social sharing | No (rooms: partial) | Room pages use the room's title and introduction | Titles, descriptions, share image, sitemap | SEO page (P1) |
| Media library | Yes | Upload, folders, search, names, ALT text, focal point, replace, delete with usage check | Bulk actions, pages; the replace/delete bug | P0 fix; bulk tools (P2) |
| Branding and global settings | No | — | Logo, brand name, colours, fonts | Site settings (P1); logo (P3); colours stay in code |
| Privacy and 404 pages | No | — | Editing the policy text | Leave in code; developer updates on request |
| Website wording (forms, pop-ups, messages) | No | — | All labels, messages, time slots, WhatsApp texts | Wording page (P2) |
| Publish, preview, restore | Yes | Drafts, preview of 4 pages, publish with note, restore last 15 | Preview of one design or version; schedule; older versions | History tools (P2); scheduling (P3) |
| Users and security | Partial | Change password, sign out | Two-step login, staff roles, idle sign-out, reset email | Security items (P3; two-step login is P1-8) |

---

## Appendix A. Technical architecture (for a developer)

**Shared backend**
- Admin and website use the same Supabase project.
- Portal edits write draft tables (`designs`, `collections`, `spaces`, `site_content`, `media`).
- `publish_site()` stores `build_site()` in `site_snapshots`, and the site reads the newest row via `public_site()`.
- No build or redeploy.

**Caching**
- The site trusts a `localStorage` copy (`lumaSite`) for 5 minutes and waits at most 2.5 s for the live call (`assets/js/content.js:14, 66-76`).
- Returning visitors can see changes up to 5 minutes late.
- `assets/js/site-defaults.js` (offline fallback) and the static HTML fallback are only refreshed by `tools/setup_backend.py`.

**Dynamic vs hardcoded**
- **Dynamic:**
  - `site_content` areas home/about/contact/settings
  - the tables above
- **Hardcoded:**
  - header, footer and meta, duplicated in `index.html`, `space.html`, `about.html`, `contact.html` and `privacy.html`
  - `space.html:82-91, 140-166`
  - `about.html:88-91`
  - dialogs in `assets/js/core.js:133-304`
  - designer markup `index.html:290-344`
  - Room Studio text `assets/js/roomstudio.js`
- **Categories:**
  - check constraint `supabase/schema.sql:74`
  - `CATEGORY` in `assets/js/catalog.js:8-18`
  - mounts in `assets/js/lamp3d.js:8`
- **Sizes** are defined in `index.html:309-311`, `roomstudio.js` `SIZES`, `home.js:246` and `builder3d.js`.
- **Finishes and cords:** `lamp3d.js:9-14`, `catalog.js:90`.
- **3D shapes:** `models3d.js` `RECIPES`.
- **Admin model list:** `admin/js/views/designs.js:55-59`, which lists only models in use.

**Publishing whitelist**
- `build_site()` copies only `pricing`, `calendarUrl` and `roomStudio` from settings (`schema.sql:314-317`).
- New settings keys need a schema change.

**Media**
- Bucket `media` (public read, admin write, 10 MB, jpeg/png/webp/svg) plus table `media` with 3 sizes.
- Foreign keys `on delete restrict` protect designs, covers and rooms.
- JSON references are checked by `media_usage()` against drafts only (`schema.sql:395-404`).

**API coverage**
- RLS policy `admin_all` on every table.
- Anon can only call `public_site`, `submit_consultation`, `record_like` and `room_upload_allowed`, and insert into `room-designs/incoming/`.
- Admin RPCs: `preview_site`, `publish_site`, `republish_snapshot`, `site_status`, `admin_dashboard`, `media_usage`, `set_request_status`, `add_request_note`.
- No RPC or policy is needed to add delete/archive for requests: the admin already has delete rights through RLS, so only the UI is missing.

**P0 bug locations**
- **Replace:** `admin/js/upload.js:108-116` (`replaceFile` calls `removeFiles` on the old paths immediately).
- **Delete check:** `admin/js/views/media.js:155-159` together with `media_usage` (drafts only).
- **Unsaved flag:**
  - Dialog inputs are not bound through `bind()` (`admin/js/ui.js:138-146`), so they never call `setDirty(true)`.
  - `onClose: () => setDirty(false)` in `designs.js:87`, `spaces.js:77` and `collections.js:62`.
  - Backdrop click closes (`ui.js:70-72`).
- **Status label:** media saves do not dispatch `content-saved` (`admin/js/views/media.js`); compare `designs.js:120`.

**Fix applied for photos (21 Nov):** `trashFiles()` and `cleanTrash()` in `admin/js/upload.js`, table `media_trash` and function `media_trash_due()` in `supabase/schema.sql`. The steps were:
1. Upload replacements to new paths (already the case).
2. Keep the old paths in a `media_trash` list.
3. After `publish_site`, delete trash files no longer referenced by the latest snapshot.
4. Deleting a photo also moves its files to the trash, so the live version keeps working. Files stay while any of the 15 most recent versions (the ones Settings can restore) mentions them. Dialogs use `dialog({ guard: true })` in `admin/js/ui.js`.

**Reusable for the roadmap**
- New `site_content` areas (`layout`, `seo`, `texts`) published by `build_site`.
- Rendering through `core.js`.
- The editors `bind()`, list widgets, `imageSlot` and design picker (`admin/js/widgets.js`).
- `media_usage` for any new image fields.

**Static meta for sharing**
- WhatsApp and Facebook do not run JavaScript.
- A GitHub Action could be triggered after publish (by `repository_dispatch` or on a schedule). It would read `public_site()`, rewrite the `<head>` of the five pages and `sitemap.xml`, and commit them.
- This needs a GitHub token stored as a secret, not in the portal.
