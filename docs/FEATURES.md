# LumaDesign: what the website can do

*Reference list of features, as of 21 November 2026. For how to use them, see [ADMIN-GUIDE.md](ADMIN-GUIDE.md) (admin) and [WEBSITE-GUIDE.md](WEBSITE-GUIDE.md) (the website and the visitor journey).*

The website has two sides:

- **The public website**, for customers: `https://ykashef97.github.io/Lumoostudio30/`
- **The admin portal**, for the owners: `https://ykashef97.github.io/Lumoostudio30/admin/`

---

## Part 1. The admin (owners, in the portal)

### Signing in and security

- Sign in with the username **admin** (or `admin@yourwebsite.com`) and the password.
- After 5 wrong passwords, sign-in waits 60 seconds. Supabase also limits attempts.
- Change the password in **Settings**. Log out from the sidebar.
- A forgotten password is reset on the owner's computer with `create-admin.bat --reset`. There is no reset by email.

### Business dashboard

- The first page after signing in. Pick a period (7 days to all time); figures are compared with the period before.
- Cards: new inquiries, requests waiting for a reply (with the oldest), average time to first reply, share completed vs cancelled, and share with a custom lamp or Room Studio design.
- Charts: inquiries over time, where requests stand, most requested designs and types, most hearted designs, which button customers used, and WhatsApp or call preference.
- A **Needs attention** list: requests waiting 2+ days, requests unchanged for 7+ days, meetings in the next 3 days, unpublished changes.
- Figures marked with a small arrow open the matching list of requests (for example, all new inquiries in the chosen period).
- Sales, expenses, profit and visits are shown as **not recorded yet**: the website does not collect them.

### Website overview (formerly Dashboard)

- Counts of consultation requests: new, in progress and completed.
- The latest requests, the most-liked designs (hearts), recent uploads and recent changes in the portal.
- Whether the website has unpublished changes, and when the Google Sheet was last updated (if used).

### Consultation requests

- See every request: name, phone, email, how they want to be contacted, preferred day and time, their notes, the design they asked about, and the size, finish and cord they chose in the lamp designer.
- Search by name, phone or reference. Filter by status or date. Sort newest or oldest first. Pages of 25.
- Change the status: **New → Contacted → Meeting scheduled → In progress → Completed** (or **Cancelled**). Every change is recorded in the request's history.
- Add **private notes**. Customers never see them.
- Open WhatsApp, call the customer, or copy their details with one click.
- **Export** the requests to a file that opens in Excel, Arabic included.
- A badge in the menu shows how many requests are new.

### Website content

Every content change is a **draft** until it is published:

- **Save draft** keeps the change in the portal.
- **Preview** opens the real website showing the drafts, with a bar at the top. Only the admin sees it.
- **Publish** makes all saved drafts live at once.
- **Restore** (in Settings) puts an earlier published version back if something goes wrong.

| Section | What the admin can change |
| --- | --- |
| **Homepage** | The headline and buttons. The slideshow: photos, room labels, the line under the headline, and descriptions for blind visitors. The notice bar at the top of every page. Show, hide or reorder each section and edit its text. The shortcut cards, the "How it works" steps and the promises. A strip of featured designs (off until designs are chosen) |
| **Shop by space** | Add, edit, delete, reorder, show or hide rooms. For each room: name, page title, introduction, icon, web address, a banner photo, an optional phone photo, the focal point (the part of the photo kept in view on phones), and which designs appear and in what order. Kitchen is prepared but hidden |
| **Collections** | The filters above the product grid. Add your own (for example "New arrivals"), with a description, a cover photo and its designs in order. A design can be in several collections |
| **Designs** | Add, edit, hide or delete products. For each: name, reference (W-02 style), type (wall, ceiling, chandelier), description, price, size, material, lead time, photo, 3D shape used in the lamp designer, and order. See how many hearts each design has |
| **About us** | The banner (text and photo). Blocks that can be added, reordered, hidden or removed: story with photo, text, comparison, steps, values, photo strip of designs, closing message with buttons |
| **Contact us** | Phone, WhatsApp number, email, city, opening hours, Instagram, TikTok and any other links. The Contact page text and banner photo. These details also update the footer and every WhatsApp button on the site |
| **Settings** | Lamp designer prices (per size, cord, bulbs) and a switch to show them on the website (off until real prices are entered). An optional online booking link. The optional Google Sheet copy of requests. Published versions with Restore |

### Media library (photos)

- Upload one or many photos, or drag and drop them. JPG, PNG, WebP and SVG, up to 15 MB each.
- Photos are resized and converted automatically to three sizes for fast loading.
- SVG files are cleaned of anything that could run code.
- Folders and search. Edit the title, description and ALT text (description for blind visitors).
- Set a focal point for each photo.
- **Replace** a photo: every place that uses it shows the new one.
- A photo cannot be deleted while it is still used; the portal lists where it is used.
- The photos that came with the website are in the library too.

### What the admin cannot do (needs a developer)

- Change the page layout or the visual design.
- Add new kinds of pages or sections, or new 3D shapes.
- Take online orders or payments.
- Quote requests arrive on WhatsApp, not in the portal.

---

## Part 2. The customer (visitors to the website)

No account is needed. It works on phones, tablets and computers.

### Browse

- **The collection:** filter by collection, search by name or reference, open any design to see its photo, description, reference and price ("On request" until a price is added).
- **Shop by space:** pick a room (bedroom, living room, dining, office, outdoor) and see the designs suggested for it, each room on its own page.
- **Featured designs**, when the owners turn them on.

### Shortlist

- Tap the heart to save designs. The shortlist stays on their device for the next visit.
- Liking a design offers, without interrupting, to discuss it with us.
- A **Saved designs** section on the homepage lists their hearts and saved lamp designs, with a **Discuss** button and **Request a quote for these**.

### Design your own lamp (3D)

- Start from any design, then choose the size (19, 33 or 42 cm), the finish (soft ivory, matte black, warm brass) and the cord (white or black; not needed for ceiling lights).
- Turn the 3D model all the way round, tilt it, zoom in and out, and see the parts pulled apart.
- Switch to the real product photo.
- See an estimated price, confirmed later in the quote (only once the owners switch prices on; until then "Price: On request").
- Save the design to the shortlist, add it to the selection, request a quote, or book a consultation about it.

### Room Studio: our lights in their own room

- **Start:** upload a normal photo of their room (or use the sample room). A 360° photo also works and can be explored all the way round.
- **Match the room:** drag two lines to where the ceiling and the floor meet the back wall, and confirm the ceiling height. The website rebuilds the room's perspective from the photo and says how far away the back wall seems. If they know the real distance (roughly the room's length), they type it in and the lights are sized to match. Works with straight-on and corner views; furniture hiding the floor line is fine (they place the line where the floor meets the wall behind it).
- **Place lights:** choose any of our designs and tap the ceiling or a wall. Chandeliers and pendants hang from the ceiling, ceiling lights sit on it, wall lights attach to walls, all at their real size.
- **Adjust each light:** move it by dragging, change size, finish, cord colour, how low it hangs, its angle, warm or cool light and brightness. Duplicate or remove it; undo and redo.
- **See the effect:** an evening control dims the room, and each light adds a soft pool of light on the walls and ceiling.
- **Measurements:** shows how high the bottom of a hanging light is above the floor and below the ceiling.
- **Save on their device**, reopen later, or **send the design** to LumaDesign with a consultation request (a picture of the design and the list of lights).
- **What it is not:** a normal photo only shows part of the room, so the view can turn only a little, not 360°. It is a believable preview, not an exact light calculation. Furniture in the photo does not hide the lights.
- **Fallback:** browsers that cannot show 3D get the simple 2D photo preview.
- Up to 8 lights per room.

### Selection and quote

- Collect designs and custom lamps in a selection (the bag icon), with quantities.
- **Request a quote:** opens WhatsApp with the message already written. Email also appears once the owners add an email address. The message can also be copied.

### Book a consultation

- A short form: name, phone (Egyptian mobile or international), optional email, WhatsApp or phone call, an optional preferred day and time, and notes.
- The design they liked, and their custom size, finish and cord, are attached automatically.
- They see **Request received** with a reference such as `LD-4M1OGAFG`. The meeting is confirmed once the owners agree a time with them; the website never shows a meeting as booked.
- Their name and phone are remembered on their device for next time.
- If the database cannot be reached, the request is written into a WhatsApp message for them to send instead.

### Privacy

- A privacy policy page (`privacy.html`) explains what is collected, where it is kept and how to ask for it to be deleted. Linked in every footer and under the consultation form.

### Contact

- Contact page with WhatsApp and call buttons, the consultation form, and social links once added.
- Phone and WhatsApp in the footer of every page.

### What the customer cannot do

- Create an account.
- Order or pay online.
- Choose a confirmed meeting time online (an optional booking calendar link can be added in Settings).
- Walk around their room in 3D from a normal photo (only a slight turn is possible; a 360° photo allows looking all the way round).

---

## Planned (not built yet)

**Sales, costs and profit in the Business dashboard.** The first Business dashboard (inquiries only) is built. Still proposed: recording orders, payments, product costs and expenses, with sales, profit and anonymous website figures, all on free plans only ($0 a month). The proposal is in [BUSINESS-DASHBOARD-PROPOSAL.md](BUSINESS-DASHBOARD-PROPOSAL.md), and the questions for the first meeting are in [OWNER-DISCOVERY-QUESTIONNAIRE.md](OWNER-DISCOVERY-QUESTIONNAIRE.md). Nothing more is built until the owner approves it.

---

## Behind the scenes

**Backups:** `backup-database.bat` saves the requests, content, settings and uploaded photos into a private `backups` folder on the owner's computer (the free database plan keeps no backups).


| Part | What it is | Cost |
| --- | --- | --- |
| Website hosting | GitHub Pages | Free |
| Database, admin login, uploaded photos | Supabase (free plan: 500 MB database, 1 GB photo storage) | Free; the Pro plan is about $25 a month if ever needed |
| Keep-awake job | A daily GitHub job that stops Supabase pausing the database after a quiet week | Free |
| Google Sheet copy of requests | Optional, not set up | Free |
| 3D engine and fonts | Three.js and Google Fonts, loaded from the internet | Free |

If the database is ever unreachable, the website still opens with its built-in content, and consultation requests fall back to WhatsApp.
