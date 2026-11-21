# LumaDesign website: professional audit

*21 November 2026. Audited code: branch `refactor`, commit `f7b2fef` (the live site runs the same code apart from the docs-only last commit). No code was changed during the audit.*

*A separate audit of what the admin portal can and cannot manage, with its own roadmap, is in [ADMIN-PORTAL-AUDIT-2026-11-21.md](ADMIN-PORTAL-AUDIT-2026-11-21.md).*

**How this audit was done**

- Read the full codebase: 4 public pages, 13 public scripts, the admin portal (16 modules), the database schema (596 lines), setup tools and the Google Apps Script.
- Ran read-only checks against the live Supabase project with the public key and the database connection: access rules, sign-up setting, functions anyone can call, indexes, sizes, response times.
- Tested in a Chromium browser pane: the live site (`ykashef97.github.io`) for performance, a local copy of the same code for layout, accessibility and journeys. The admin portal was tested signed in, in this session and the previous one.
- All test data (2 requests, 1 room, 2 photos, 1 heart count) was deleted afterwards; the live content is identical to the original published version.

**What could not be tested** (ratings that depend on these are marked *provisional*):

| Not tested | Why |
| --- | --- |
| Lighthouse / Core Web Vitals scores | No Node.js on this machine; the PageSpeed Insights API had used up its free daily quota; the PageSpeed website did not finish in the browser pane. Recommend running pagespeed.web.dev yourself (2 minutes) |
| Real phones and tablets, Safari, Firefox | Only one Chromium browser with emulated sizes is available here |
| Screen readers | Not available here |
| Slow 3G network | Only "database unreachable" was simulated, not throttled speed |
| Google Sheets copy | Not set up in a Google account yet |
| WhatsApp messages arriving, changing the admin password, an expired admin session | Would need your phone, your password, or would sign you out |
| 360° room visualization | Not built. Its planning was stopped at your request (see Phase 2) |

> **Update, 21 November 2026 — launch fixes applied (not yet committed):** P0-1 (prices hidden until switched on in Settings), P0-2 (privacy policy page, linked in every footer and under the form), P0-3 and P1-1 (no sideways scroll from 320 px up), P1-2 (admin Requests fits phones), P1-3 (CSV formula protection), P1-5 (module preloading; the fallback content only loads when needed) and P1-6 (local backup tool, `backup-database.bat`). Two admin bugs found while re-testing were also fixed: switching portal pages very quickly could leave the previous page on screen, and leaving the Requests page mid-load logged an error. **Current ratings are in section 2b**; sections 1–2 and the findings describe the site as audited, before these fixes.

---

## 1. Executive summary

LumaDesign is a **well-made, honest small-business website with an unusually capable admin portal for its size**. The visual identity is warm and consistent, the customer journeys work end to end, consultation requests reach a secure database, and the owners can change almost everything without a developer. Security fundamentals are sound: every table is locked, sign-ups are off, no secret is in the code.

It is **not yet a premium e-commerce-grade platform**, and three things stop it from being launch-ready today:

1. **The lamp designer shows prices that are not real** (sample figures). Customers will see "Estimated total EGP 1,948".
2. **There is no privacy policy**, while the site collects names, phone numbers and emails.
3. **Every page scrolls sideways on 360 px phones**, one of the most common Android widths.

Beyond that, the "See your space" feature is a simple 2D photo overlay, not the immersive 360° experience you want. The 3D designer offers 3 options (size, finish, cord), not a component system. First visits wait for a chain of scripts and a database call before the text appears. Quote requests are not recorded anywhere except WhatsApp.

**Verdict: suitable for a limited (soft) launch once the three P0 items are fixed.** Not yet production-ready for paid advertising or high traffic.

---

## 2. Overall ratings

| Category | Rating | Status |
| --- | --- | --- |
| UI/UX Design | **7.0** /10 | Tested |
| Visual Identity & Branding | **7.0** /10 | Tested |
| User Experience | **6.5** /10 | Tested |
| Responsive Design | **7.0** /10 | Tested (emulated sizes only) |
| Mobile Experience | **6.5** /10 | Tested (emulated, no real device) |
| Frontend Code Quality | **6.5** /10 | Code reviewed |
| Frontend Performance | **6.0** /10 | *Provisional*: no Lighthouse run |
| Backend Architecture | **7.0** /10 | Tested |
| Database Architecture | **7.0** /10 | Inspected |
| API Design | **6.5** /10 | Tested |
| Security | **7.0** /10 | Tested (non-destructive) |
| Website Performance | **6.0** /10 | *Provisional* |
| Accessibility | **6.5** /10 | *Provisional*: automated checks only, no screen reader |
| 3D Customization Experience | **6.5** /10 | Tested |
| 360° Room Visualization | **2.0** /10 | Not built; score reflects the 2D tool that exists |
| Admin Portal | **7.5** /10 | Tested signed in |
| **Overall Website Quality** | **6.5** /10 | |
| **Production Readiness** | **5.5** /10 | |

### Why each score

**UI/UX Design: 7.0.** *Good:* one coherent system (Fraunces headings, Inter body, espresso/sand/gold tokens, one primary button per view), generous spacing, a strong dark hero, consistent cards and dialogs, SVG icons throughout. *Reducing it:* the homepage carries every feature in one very long page (hero, cards, spaces, collection, how it works, designer, room preview, about, shortlist), so nothing feels like a destination. Products have no pages of their own, only a pop-up. *To reach 9:* product detail pages, a shorter homepage that leads into dedicated Designer and Room pages, real project photography and stories.

**Visual Identity & Branding: 7.0.** *Good:* restrained palette, gold used only on dark areas, warm room photography, a consistent wordmark. *Reducing it:* product photos are plain studio cut-outs with differing backgrounds and scale, which reads as "catalogue" rather than "atelier". There are no people, no craft or workshop imagery, no installed projects, and no logo beyond the wordmark and an icon. *To reach 9:* a photographed brand story (materials, hands, installed rooms), consistent product photography, a refined logo mark.

**User Experience: 6.5.** *Good:* every path ends in contact; forms validate clearly and focus the first error; the shortlist offer is non-blocking and stops after two ignores; dialogs trap focus and close with Escape. *Reducing it:* the 3D designer and room preview sit far down the homepage. There are no shareable product URLs. Quotes leave the site for WhatsApp with no record. "Price: On request" appears on every product, and the room tool cannot place more than one light. *To reach 9:* see the conversion section and roadmap items UX-1 to UX-8.

**Responsive Design: 7.0.** *Good:* no horizontal overflow at 375–1920 px on any public page; the 3D stage stays visible while options scroll on phones; dialogs fit. *Reducing it:* a confirmed sideways scroll on every page at 360 px, and on the admin Requests page at 360 and 390 px. *To reach 9:* fix those, test real devices, tune hero crops per breakpoint.

**Mobile Experience: 6.5.** *Good:* the mobile menu works and closes with Escape; touch targets are mostly 44 px; forms use phone keyboards. *Reducing it:* the 360 px overflow; the hero headline sits over the lamp in the bedroom photo; long scrolling; the room tool expects clicks. *To reach 9:* bottom navigation or a sticky "Book a consultation" bar, shorter pages, touch-first room tool, real-device testing.

**Frontend Code Quality: 6.5.** *Good:* plain ES modules with a clear split (content, catalog, core, page scripts, lazy 3D); hook pattern between pages; careful escaping; no framework weight. *Reducing it:* `core.js` is about 1,000 lines doing nine jobs; the header and footer are copied into 4 HTML files; all UI is built from HTML strings, so safety depends on remembering to escape everywhere; no automated tests, no linting, no types; legacy files (`fixture-tones.js`, `update_images.py` flow) duplicate the Media Library. *To reach 9:* split core.js, generate the shared header/footer, add a small test suite and lint in CI.

**Frontend Performance: 6.0 (provisional).** *Good:* small first view (about 250 KB transferred, measured on the live site); WebP images with 480/800 px variants; the 3D engine loads only when needed; the render loop pauses off-screen; cumulative layout shift measured at 0; repeat visits load from a 5-minute content cache (DOMContentLoaded 103 ms). *Reducing it:* 10 JavaScript modules load as a chain about 5 levels deep. The database call only starts after the chain finishes, and page text stays invisible until then (measured on a cold visit: the call started at 4.2 s and took 0.7 s; the pane was hidden, which may inflate this). The 52 KB fallback content file downloads on every first visit even when unused. Nothing is minified. *To reach 9:* see PERF-1 to PERF-5.

**Backend Architecture: 7.0.** *Good:* a single backend (Supabase) for data, login and files. Row-level security on every table, verified. All logic lives in security-definer SQL functions with fixed `search_path`. Publishing works through versioned snapshots with restore. The activity log is written by triggers. *Reducing it:* the free plan has no backups and pauses after a quiet week (mitigated by the daily job). Collection and room saves delete and re-insert links in separate calls, so a failure midway loses the list. There is no server-side code for things SQL can't do, such as images or e-mail. The Sheet copy is unproven. *To reach 9:* transactional save functions, scheduled backups, an Edge Function layer when needed, monitoring.

**Database Architecture: 7.0.** *Good:* normalised tables, foreign keys (photo deletes blocked while in use), check constraints (reference format, statuses), unique slugs and refs, indexes on request dates and status. Total size is 12 MB. *Reducing it:* there are no tables for lamp components, saved configurations, quotes, room designs or favourites (favourites live only in the visitor's browser), and some foreign keys have no index (fine at this size). *To reach 9:* model components and configurations, record quotes, add indexes as data grows.

**API Design: 6.5.** *Good:* a small public surface. Visitors can call only `public_site`, `submit_consultation` and `record_like` (plus two harmless helpers), all verified. Submissions are re-validated in SQL and rate-limited (3 per phone per 10 min, 30 per minute overall). *Reducing it:* `record_like` has no rate limit, so heart counts can be inflated by anyone. There is no CAPTCHA or bot check on submissions. Errors are mixed: some JSON `{ok:false}`, some raised exceptions. There is no versioning. *To reach 9:* bot protection, per-IP throttling (Edge Function), consistent error shape.

**Security: 7.0.** See section 9. No critical vulnerability found. The main gaps:
- Third-party scripts load without integrity checks and with no Content-Security-Policy.
- The admin session is stored in browser storage.
- Customer-typed text can inject formulas into the CSV export.
- There is no bot protection.
- There is no privacy policy.

**Website Performance: 6.0 (provisional).** Same evidence as Frontend Performance. Supabase content calls took 260–720 ms (5 samples, gzip on). Static files from GitHub Pages took 55–75 ms each.

**Accessibility: 6.5 (provisional).**
- *Good:* `lang="en"`, one `h1` per page with no skipped heading levels, a skip link, alt text on every image, labelled form fields, focus trapping in dialogs, a pause button on the slideshow, and `prefers-reduced-motion` respected.
- *Reducing it:* the room preview can only be positioned with a mouse or finger (not keyboard-operable, WCAG 2.1.1).
- The admin input focus ring is faint (18 % opacity).
- Nothing was tested with a screen reader.
- *To reach 9:* keyboard positioning, a manual screen-reader pass, and stronger focus rings.

**3D Customization: 6.5.** *Good:* 54 procedural 3D shapes, full 360° turning, zoom, an exploded view, finishes and sizes shown live, ceiling lights correctly have no cord, a live price estimate, and it works on touch. *Reducing it:* the shapes are simplified stand-ins, not the real products. Customisation is 3 options; there are no components (shade, arm, base, canopy, bulb). Shapes can't be added without a developer, and a designed lamp is not saved server-side or shareable. *To reach 9:* a real component library in the database, glTF models of real products, shareable configuration links.

**360° Room Visualization: 2.0.** The feature you described is not built. What exists is a 2D tool: upload a photo or use the sample, pick one design, click to place it, adjust size and glow, and download. It works (tested), but it is flat, takes one lamp at a time, is not saved, and has no 360°, perspective or surface awareness.

**Admin Portal: 7.5.**
- *Good:* covers requests, content, rooms, collections, designs, media, About, Contact and settings.
- Draft, Preview, Publish and Restore all work; uploads resize to WebP, SVGs are cleaned, and photos in use cannot be deleted.
- Tested end to end with your login.
- *Reducing it:* the Requests page overflows on phones.
- Rename and remove still use the browser's own pop-ups (`prompt`/`confirm`).
- Only one admin account, with no roles and no two-step login.
- No undo after a delete.
- Editing is form-based, not visual on-page editing, and there is no crop tool (focal point only).
- *To reach 9:* fix mobile Requests, roles and two-step login, crop tool, visual inline editing.

---

## 2b. Ratings after the launch fixes (21 November 2026)

Re-tested after the fixes: all six public pages at 12 widths (320–1920 px) with no sideways scrolling, all ten admin pages at 320, 360, 390 and 1440 px with no overflow or errors, the price switch, the privacy page and links, the safe CSV export (with a test request, then deleted), fast page switching in the portal, the offline fallback, and one real backup run. Performance was **not** re-measured with Lighthouse, because Google's tool was still unavailable.

| Category | Audit | Now | What changed |
| --- | --- | --- | --- |
| UI/UX Design | 7.0 | 7.0 | — |
| Visual Identity & Branding | 7.0 | 7.0 | — |
| User Experience | 6.5 | 6.5 | Sample prices no longer shown, but real prices and proof (projects, reviews) are still missing |
| Responsive Design | 7.0 | **8.0** | No sideways scrolling from 320 to 1920 px; admin portal fits phones (BUG-1, BUG-2, BUG-3 fixed) |
| Mobile Experience | 6.5 | **7.0** | Small phones fixed; pages are still long and no real device has been tested |
| Frontend Code Quality | 6.5 | 6.5 | Two bug fixes only; FE-1 to FE-4 still open |
| Frontend Performance | 6.0 | **6.5** *(provisional)* | Scripts preloaded together (PERF-1, partly); fallback content loads only when needed (PERF-2). Not re-measured |
| Backend Architecture | 7.0 | **7.5** | Backups now possible (`backup-database.bat`), though run by hand |
| Database Architecture | 7.0 | 7.0 | — |
| API Design | 6.5 | 6.5 | — (bot protection still open) |
| Security | 7.0 | **7.5** | Privacy policy added (SEC-1); CSV formula injection fixed (SEC-3). SEC-2, SEC-4, SEC-5 still open |
| Website Performance | 6.0 | **6.5** *(provisional)* | Same as Frontend Performance |
| Accessibility | 6.5 | 6.5 | — |
| 3D Customization Experience | 6.5 | 6.5 | — |
| 360° Room Visualization | 2.0 | 2.0 | Not built |
| Admin Portal | 7.5 | **8.0** | Requests page usable on phones; fast page switching and mid-load errors fixed |
| **Overall Website Quality** | 6.5 | **7.0** | |
| **Production Readiness** | 5.5 | **6.5** | All three launch blockers fixed in the code |

**Updated verdict: ready for a limited launch** as soon as the owners:
1. Approve the privacy policy text.
2. Enter real prices in Settings and switch them on (or leave them hidden).
3. Merge and push, including `main` for the keep-awake job.

**To reach about 8 overall:** P1-4 (record quotes in the portal), P1-7 (bot protection), P1-8 (two-step login), P1-9 (integrity checks and CSP), real prices, and a projects or reviews block.

**To reach 9:** P2-1 (product pages), P1-10 (360° room designer), P2-4 (lamp components and saved designs), and professional brand photography.

---

## 3. Top 10 most important problems

| # | Problem | Priority |
| --- | --- | --- |
| 1 | Lamp designer shows **sample prices** as real estimates (`LUMA_PRICING` from settings: 799/1,299/1,599, cord 750, bulbs 399) | P0 |
| 2 | **No privacy policy** or consent text, while collecting names, phones and emails (Egypt Personal Data Protection Law 151/2020 applies) | P0 |
| 3 | **Sideways scrolling on every page at 360 px** (header 4–6 px too wide; homepage designer 5 px too wide) | P0 |
| 4 | **Quote requests are not recorded**; they exist only if the customer presses send in WhatsApp, so leads cannot be tracked | P1 |
| 5 | **First visit delay**: 5-level module chain, then the database call, while the page text stays invisible | P1 |
| 6 | **No backups** of requests and content on the free plan; the project pauses if the daily job ever stops | P1 |
| 7 | **No bot protection**: forms can be spammed up to 30/min and heart counts inflated without limit | P1 |
| 8 | **Admin Requests page overflows on phones**, the page owners will use most on the go | P1 |
| 9 | **The 360° room experience does not exist**; "See your space" is a basic 2D overlay | P1 (feature) |
| 10 | **No product pages or shareable links**, no structured data, so products can't be shared, indexed or advertised individually | P2 |

---

## 4. UI/UX findings

### Visual design

| ID | Finding | Fix |
| --- | --- | --- |
| UI-1 | Typography and tokens are consistent across all four pages and the portal (checked in CSS: one stylesheet, tokens in `:root`) | Keep |
| UI-2 | Product photos have different backgrounds, crops and scale (chandeliers are wider, so they are shown uncropped while others are cropped). The grid looks uneven | Re-shoot or re-process on one backdrop at one scale; one aspect ratio for all |
| UI-3 | No human, craft or installed-room imagery; the brand feels like a catalogue | Add 6–10 photos of real installs and workshop details; use them in About and on the homepage |
| UI-4 | Hero on phones: the headline sits over the pendant lamp in the bedroom photo (seen at 360 px) | Use the Media focal point or a dedicated phone crop for slide 1 |
| UI-5 | The homepage stacks 9 sections, so the designer and room tool feel buried | Shorten: hero → spaces → featured → designer teaser → consultation CTA; give Designer and Room tool their own pages |
| UI-6 | "Price: On request" on every product weakens trust when the designer shows exact prices | Show "From EGP …" per design once real prices exist |
| UI-7 | Quick cards fade in as you scroll; on a fast scroll they appear late | Shorter reveal or none for above-the-fold cards |

### User experience

| ID | Problem | Fix |
| --- | --- | --- |
| UX-1 | A product exists only as a pop-up: no URL, can't be shared on WhatsApp, can't be bookmarked | Add product pages (`design.html?ref=C-10`) with photos, specs, 3D and actions |
| UX-2 | "Request a quote" leaves the site and nothing is recorded | Save the quote to the database (like consultations), then offer WhatsApp; show it in the portal |
| UX-3 | Designer is the strongest feature but sits 6 sections down | Link it from the hero; give it its own page |
| UX-4 | Room tool places one light, can't save, keyboard-unusable | Replace with the planned room designer (multiple lights, save, keyboard) |
| UX-5 | Two "save" concepts: heart (shortlist) and bag (selection) confuse first-time visitors | Explain once (tooltip on first use) or merge into one "My selection" with a quote button |
| UX-6 | No reassurance near forms: no response time, no location, no opening hours (all empty) | Fill Contact details; add "We reply within X hours" |
| UX-7 | No social proof (reviews, projects, partners) | Add a "Recent projects" block in the portal (About supports new blocks) |
| UX-8 | Date picker shows the visitor's browser format (mm/dd/yyyy in this test) | Acceptable; optionally show the chosen date in words below |

### Customer conversion

What works:
- Every page has a consultation path.
- Liking a design offers a conversation without blocking.
- The form remembers the visitor's contact details.
- The confirmation gives a reference number.

What holds conversion back, in order of likely impact:
1. **No real prices**, or price ranges.
2. **No proof**: no reviews and no real projects.
3. **No product pages to share or advertise.**
4. **Quotes vanish into WhatsApp**: no follow-up list.
5. **The designer is buried** and its result can't be shared ("send my lamp to my partner").
6. **No urgency or offer framing** beyond the notice bar.

Recommended calls to action:
- A sticky "Book a free consultation" bar on phones after the first scroll.
- "Send me this design" (WhatsApp or e-mail with a link) in the designer.
- "Get the price" on product pages, which records a quote request.

---

## 5. Responsive design findings

Tested every public page at all 11 requested sizes (1920×1080, 1600×900, 1440×900, 1366×768, 1024×1366, 834×1194, 768×1024, 430×932, 390×844, 375×812, 360×800). All 10 admin pages were tested at 360, 390, 768 and 1024. Each check covers sideways overflow, elements past the edge, touch targets under 44 px, and text under 12 px. Phone sizes were also checked by screenshot.

| ID | Page / component | Size | Problem | Why it matters | Fix | Priority |
| --- | --- | --- | --- | --- | --- | --- |
| R-1 | Header, all pages | 360 px | `.header-tools` ends at 364 px; the page scrolls sideways | The whole page wobbles left and right while scrolling; looks broken on common Android phones | Reduce the gap in `.header-tools` below 380 px, or hide the search icon there (search is in the menu) | P0 |
| R-2 | Homepage designer | 360 px | `.builder-stage` and `.builder-panel` end at 365 px | Same sideways scroll; the 3D buttons sit at the cut edge | Remove fixed widths or min-widths in the stage toolbar; let the segmented control shrink | P1 |
| R-3 | Admin, Consultation requests | 360 and 390 px | The filter card is 414 px wide; the page scrolls sideways | The owners' most-used page is awkward on phones | Let the toolbar wrap (`flex-wrap`, full-width selects below 480 px) | P1 |
| R-4 | Hero slide dots | All | 24×44 px targets | Meets WCAG 2.2 AA (24 px minimum) but not the site's own 44 px rule | Enlarge the hit area with padding | P3 |
| R-5 | Breadcrumb "Home" | All | 36×44 px | Same as above | Padding | P3 |
| R-6 | Hero image | Phones | Headline over the lamp (bedroom slide) | Weaker first impression | Phone crop or focal point per slide | P2 |

**No problems found** at tablet sizes (768, 834, 1024), at desktop sizes (1366–1920), in dialogs on phones (they scroll inside the screen), in the mobile menu, or in the other 9 admin pages.

The phone experience is a well-adapted desktop layout rather than one designed for phones first. The main gaps are page length, no thumb-reach actions, and a click-based room tool.

---

## 6. Frontend engineering findings

### Code quality

| ID | Finding | Evidence | Recommendation | Priority |
| --- | --- | --- | --- | --- |
| FE-1 | `core.js` is about 1,000 lines with 9 responsibilities (markup injection, dialogs, header, shortlist, product grid, details, cart and quote, consultation, footer) | `assets/js/core.js` | Split into `dialogs.js`, `shortlist.js`, `cart.js`, `consult.js`, `layout.js` | P2 |
| FE-2 | Header and footer copied in 4 HTML files (documented gotcha) | `index.html`, `space.html`, `about.html`, `contact.html` | Inject them from one template in core.js, or generate the pages with a small Python step | P2 |
| FE-3 | All UI built from HTML strings; safety relies on `escapeLuma` or `esc` at every call site. No missed escape found, but nothing enforces it | e.g. `home.js` `renderSections`, admin views | Small `html` tagged-template helper that escapes by default | P2 |
| FE-4 | No automated tests, no lint, no type checking | repo | Add Playwright smoke tests (can run in GitHub Actions) and ESLint | P2 |
| FE-5 | Legacy duplicate photo path: `fixture-tones.js` (no longer loaded) and the `update-images.bat` flow vs the Media Library | `assets/js/fixture-tones.js`, `tools/update_images.py` | Retire the legacy flow after owners switch to the Media Library | P3 |
| FE-6 | `window.Luma` and `window.lumaStage` debug hooks are public | `core.js`, `home.js` | Harmless; keep for testing or hide behind `?debug` | P3 |
| FE-7 | Designs are addressed as (category, position) inside pages, and by reference in links and storage. This is correct but subtle | `catalog.js` | Document it (done in CLAUDE.md); move to refs internally when refactoring | P3 |

**State, errors and loading:** content load failures fall back silently to the saved copy or built-in content (tested, works). Forms show inline errors, a loading label ("Sending…") and a WhatsApp fallback. Empty states exist for search, selection and the room tool. Visitors get no notice when the site runs on fallback content; that is acceptable.

### Rendering and performance

- **Good:** three.js is loaded only near the designer. The render loop stops off-screen and in background tabs. Geometry is disposed on model swap. Images are lazy below the fold. CLS was 0.
- **PERF-1 (P1):** the module chain is `index.html → home.js → config.js → content.js → backend.js / site-defaults.js`, plus the `catalog`, `media`, `core`, `requests` and `visualizer` scripts, about 5 round-trips deep. Only then does `content.js` call the database. Text marked `data-cms` stays invisible until all that completes, with a 5 s safety net. *Fix:* add `<link rel="modulepreload">` for all modules in each page head. Start the `public_site` request from an inline script in the head, before modules load. Fade in only areas whose content actually changed.
- **PERF-2 (P2):** `site-defaults.js` (52 KB raw) is imported statically on every visit. *Fix:* load it dynamically only when the live and saved content both fail.
- **PERF-3 (P2):** no minification or bundling (no build step by design). *Fix:* optional one-command minify step (Python `rjsmin`) in the Pages publish, or accept.
- **PERF-4 (P3):** the Google Fonts CSS blocks rendering. *Fix:* self-host the two fonts with `font-display: swap` and preload.
- **PERF-5 (P3):** no `Cache-Control` control on GitHub Pages (fixed 10 minutes). Acceptable; a CDN (Cloudflare) would allow long caching with versioned file names.

### Functionality: tested and working

| Tested | Result |
| --- | --- |
| Collection filters (All 54, Ceiling 25), search by name ("rattan") and by reference ("C-10"), no-result message | Pass |
| Heart: pressed state, badge, shortlist section, consultation offer, removal | Pass |
| Product details dialog, Escape closes, add to selection twice gives quantity 2, quote message text and WhatsApp link, email button hidden while no email | Pass |
| Consultation form: empty and invalid inputs (name, phone, email, past date) all caught; focus moves to the first error | Pass |
| Real submission reaches the database with the design attached (previous session); test deleted | Pass |
| Designer: size, finish, price; ceiling hides the cord and removes its price; Save design adds it to the shortlist | Pass |
| Room tool: sample room, click to move, own photo upload, GIF refused, 21 MB refused | Pass |
| Mobile menu open and Escape | Pass |
| Old-style links (`?design=sconces:2`) open the right design | Pass |
| Site works with the database unreachable (built-in content) | Pass |

**No fake or placeholder interactions found.** One feature is incomplete: the Google Sheets copy (written, not deployed).

---

## 7. Backend engineering findings

### API (Supabase RPC functions)

| Endpoint | Who can call | Checked |
| --- | --- | --- |
| `public_site()` | Anyone | 200, 56 KB, gzip, 260–720 ms |
| `submit_consultation(p)` | Anyone | Re-validates every field, honeypot, 3 per phone per 10 min, 30 per minute overall |
| `record_like(ref, delta)` | Anyone | **No rate limit** (BE-3) |
| `preview_site`, `publish_site`, `republish_snapshot`, `site_status`, `admin_dashboard`, `media_usage`, `set_request_status`, `add_request_note` | Admin only | Public key gets 401 (verified) |
| `build_site` | Nobody directly | 401 (verified) |
| `sheet_sync_pending`, `sheet_mark_synced` | Secret key only | 401 with the public key, 200 with the secret key (verified) |
| Direct table reads | Admin only | All 12 tables return 401 to the public key (verified) |
| Sign-up | Disabled | 422 "Signups not allowed" (verified) |
| Storage upload | Admin only | Public upload refused (verified) |

| ID | Finding | Priority |
| --- | --- | --- |
| BE-1 | Room and collection saves delete all design links, then insert new ones, in two separate calls. A network failure between them leaves the room with no designs | P2 |
| BE-2 | No backups on the free plan; requests are the only data that can't be recreated | P1 |
| BE-3 | `record_like` and `submit_consultation` have no bot protection; likes can be inflated without limit; the global 30/min cap means a spammer could also block real customers for that minute | P1 |
| BE-4 | Error responses are inconsistent (`{ok:false, error}` from submit; raised exceptions elsewhere) | P3 |
| BE-5 | `site_status()` rebuilds the whole site JSON on every portal page change to compare drafts. Fine now; slows as content grows | P3 |
| BE-6 | No server-side functions (Edge Functions) yet. AI, e-mail notifications and bot checks will need them | P2 (when needed) |

### Database

- **Good:** 16 tables, all with row-level security; foreign keys everywhere; check constraints; unique refs and slugs; triggers for `updated_at` and the activity log; 12 MB total; 54 designs, 59 media, 3 snapshots.
- **Missing for your stated goals:** lamp **components** (shade, arm, base, canopy, bulb), **saved configurations**, **quote requests**, **room designs**, and **server-side favourites** or customer accounts.
- Foreign keys on `designs.image_id`, `space_designs.design_id` and `collection_designs.design_id` have no index (P3; matters only at thousands of rows).

### Integrations

| Integration | State |
| --- | --- |
| Supabase (DB, login, storage) | Working, verified |
| GitHub Pages hosting | Working |
| GitHub Actions keep-awake job | Committed on `main` and `refactor`; runs once `main` is pushed (`20f6529` not pushed at audit time) |
| Google Sheets copy | Written (`tools/consultation-requests.gs`), not deployed, **untested**; includes retry-free scheduled sync with logging |
| WhatsApp | Link-based (`wa.me`); no API; delivery untested |
| AI image processing | None |
| jsDelivr (three.js, supabase-js), Google Fonts | External runtime dependencies with no integrity checks (SEC-2) |

### Data flows traced

| Flow | Path | Status |
| --- | --- | --- |
| Consultation | Form → validation → RPC `submit_consultation` → table + history → portal list → status and notes → (Sheet copy) | Verified end to end (Sheet part untested) |
| Content publishing | Portal edit → draft tables → `publish_site` → snapshot → `public_site` → 5-min browser cache → page render | Verified (test room appeared live, then removed) |
| Image upload | Browser resize to 3 WebP sizes → storage → `media` row → used in a room → shown on the public site | Verified; one bug found and fixed during testing (old files were not deleted on replace) |
| Favourites | Heart → browser storage → anonymous counter in DB | Works; favourites never reach the owners except as totals |
| Lamp customization | Options → in-page state → 3D and price → shortlist label or cart key text | Works; **configuration is not stored anywhere** except as text in requests |
| Quote | Selection → WhatsApp message | **Not recorded** (UX-2) |

---

## 8. Software architecture findings

**Shape:** a static site on GitHub Pages plus Supabase (backend-as-a-service), no build step, and a separate admin single-page app in the same repository. Content is published as immutable snapshots.

**Is it suitable for a growing commercial website?** Yes, for the next stage: a few thousand visitors a month, one or two editors, consultations and quotes. It is cheap (free), secure by design, and easy to change. It is **not** suitable as-is for online ordering, customer accounts, many editors or heavy SEO. For those you would add a build step, product pages, Edge Functions and a paid Supabase plan. A rewrite is not justified.

| ID | Weakness | Recommendation | Priority |
| --- | --- | --- | --- |
| AR-1 | Two homes for images: repo photos (`source: 'site'`) and storage uploads | Migrate repo photos into storage once; keep one path | P3 |
| AR-2 | No staging environment; Preview covers content, but code changes go straight to the live branch | Use a second Pages branch or repo as staging | P2 |
| AR-3 | Deployment is a manual push from one machine; the setup tools need `.env` on that machine | Document a second machine setup; consider GitHub Actions for checks | P2 |
| AR-4 | Single admin account, password reset only from the machine with `.env` | Add a second real admin e-mail; enable two-step login | P1 |
| AR-5 | Free-tier dependence (pausing, no backups, limits) | Weekly backup export (GitHub Action with `pg_dump`) or Pro plan at launch of ads | P1 |
| AR-6 | 3D models are code, not data; new shapes need a developer | Move to glTF files in the Media Library when real product models exist | P2 |
| AR-7 | Header/footer duplication, large core.js (FE-1, FE-2) | Refactor gradually | P2 |

---

## 9. Security findings

No critical vulnerability was found. Tests were non-destructive and read-only, apart from test data that was created and then deleted.

| ID | Severity | Finding | Evidence | Fix |
| --- | --- | --- | --- | --- |
| SEC-1 | **High (legal)** | No privacy policy or notice for collected personal data (name, phone, e-mail, notes) | No privacy page; form note only | Privacy page + one line with a link under each form |
| SEC-2 | **Medium** | Scripts from jsDelivr (three.js, **supabase-js on the admin page**) load without Subresource Integrity, and there is no Content-Security-Policy. A compromised CDN file could read the admin session | `admin/index.html`, `index.html` import maps | Pin with `integrity` hashes or self-host supabase-js and three.js; add a CSP `<meta>` |
| SEC-3 | **Medium** | CSV export does not neutralise formulas. A customer who types a name starting with `=` can make Excel run a formula when you open the export | `admin/js/views/requests.js`, `exportCsv` (only the phone is prefixed) | Prefix cells starting with `= + - @` with `'` (the Google script already does this) |
| SEC-4 | **Medium** | No bot protection on the consultation form; heart counts can be inflated | `submit_consultation`, `record_like` | Cloudflare Turnstile (free) verified in an Edge Function; throttle likes |
| SEC-5 | **Medium** | One admin account, password only; reset requires the `.env` machine; no two-step login | Supabase Auth | Enable TOTP two-step login for the admin; add a recoverable admin e-mail |
| SEC-6 | **Low** | Admin session token kept in browser storage (Supabase default); any XSS would expose it | `sb-…-auth-token` | Mitigated by SEC-2 and FE-3 |
| SEC-7 | **Low** | Login lockout (5 tries / 60 s) is in the browser and can be bypassed; Supabase's server limit still applies | `admin/js/main.js` | Acceptable; two-step login removes the risk |
| SEC-8 | **Low** | `robots.txt` lives under `/Lumoostudio30/`, where search engines do not read it; the admin page relies on its `noindex` meta (present) | GitHub project site | No action needed; the portal is protected by login anyway |
| SEC-9 | **Info** | Uploaded SVGs are cleaned of scripts, event handlers and external links (tested with a malicious SVG); uploads limited to JPG/PNG/WebP/SVG, 15 MB | `admin/js/upload.js` | Keep |
| SEC-10 | **Info** | No secrets in the repository or its history (checked); `.env` and `.venv` ignored; the public key is public by design | `git log -S`, `.gitignore` | Keep |
| SEC-11 | **Info** | SQL injection: not applicable. All database access goes through PostgREST parameters and SQL functions with typed arguments; no string-built SQL | `schema.sql` | Keep |

Sensitive data held: customer names, phones, e-mails and notes, readable only by the admin role (verified 401 for the public key).

---

## 10. Performance findings

**Measured** (live site, this machine's connection, Chromium):

| Measurement | Result |
| --- | --- |
| HTML first byte (TTFB) | 290 ms |
| Static files (CSS, JS, images) from GitHub Pages | 55–75 ms each |
| `public_site` database call | 260–720 ms (5 samples), gzip |
| First visit, cold: DOMContentLoaded | 4.2 s *(browser pane was hidden; may inflate)* |
| First visit: database call started at | 4.17 s (after the whole module chain) |
| Repeat visit: DOMContentLoaded / load | 103 ms / 269 ms |
| First view transferred (no 3D) | about 250 KB, 18 requests |
| Cumulative layout shift | 0 |
| Largest images | room photos 73–130 KB (1600 px WebP); fixtures about 20–60 KB |

**Not measured:** LCP and INP (paint timing is not recorded while the pane is hidden), Lighthouse scores, 3D engine download size on mobile, real-phone frame rates.

**Recommendations, in order:**
1. **Modulepreload and an early content fetch** (PERF-1). Likely the biggest win on first visits.
2. **Load the fallback content only when needed** (PERF-2).
3. **Show static text immediately** and fade in only areas whose content differs from the HTML.
4. **Self-host fonts** with preload (PERF-4).
5. **3D on phones:** cap pixel ratio at 1.5 (already done below 700 px); consider `powerPreference: 'low-power'` on phones.
6. **Run PageSpeed Insights** on the live link and keep a baseline.

---

## 11. QA and bug report

### Confirmed bugs

| ID | Bug | Where | Steps | Priority |
| --- | --- | --- | --- | --- |
| BUG-1 | Page scrolls sideways at 360 px | All public pages | Open any page at 360×800 | P0 |
| BUG-2 | Designer overflows by 5 px at 360 px | Homepage `#studio` | Same | P1 |
| BUG-3 | Requests page scrolls sideways on phones | Admin `#/requests` at 360/390 px | Open on a phone-width screen | P1 |
| BUG-4 | CSV export allows formula injection | Admin export | Request named `=1+1`, export, open in Excel | P1 |
| BUG-5 (**fixed during testing**) | Replacing or deleting a photo left old files in storage | Media Library | Fixed: storage read rule added to `supabase/schema.sql` and applied | Done |
| BUG-6 (**fixed during testing**) | Portal sometimes showed the login screen right after sign-in | Admin start-up | Fixed in `admin/js/main.js` | Done |

*Note: BUG-5 and BUG-6 were fixed in the previous step, before this audit started, and are included in the audited commit.*

### Potential risks (not observed failing)

- **Non-atomic room and collection saves (BE-1)** could lose design lists on a network drop.
- **The database pauses** if the keep-awake job stops: GitHub disables scheduled jobs after 60 days without commits.
- **The Google Sheets script** may behave differently in a real Google account (untested).
- **WebGL** may fail on very old phones; there is a photo fallback (code present, not tested on such a device).

### Edge cases tested

- Empty and invalid forms: caught.
- Wrong file types and files over 20 MB in the room tool: refused.
- Database unreachable: site still works, requests fall back to WhatsApp.
- Unauthorized API access: refused.
- A malicious SVG upload: cleaned.
- Rapid heart toggles: consistent.
- Old links: work.

**Not tested:** slow network, expired admin session, real touch devices, screen readers.

---

## 12. Improvement roadmap

Complexity: S = hours, M = 1–3 days, L = a week or more.

### P0: critical (before any public promotion)

*Status 21 Nov: P0-1 done (prices hidden until the owners switch them on), P0-2 done (privacy page; the Room Studio and quote paragraphs are approved, owners to approve the rest of the text), P0-3 done. P0-4 waits for the owners' push.*

| ID | Category | Affected | Problem | Solution | Impact | Complexity | Depends on |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P0-1 | Business | Designer, Settings | Sample prices shown as real | Enter real prices in Settings, or hide the estimate until set | Trust, legal | S (owners) | Owners' prices |
| P0-2 | Legal / security | All forms | No privacy policy | Privacy page + notice under forms | Legal compliance, trust | S | Owner approval of text |
| P0-3 | Responsive | Header, all pages | Sideways scroll at 360 px (BUG-1) | Tighten header tools below 380 px | Mobile quality | S | — |
| P0-4 | Release | GitHub | Last commits and the `main` keep-awake job not pushed | `git push origin refactor main`; check the Action runs | Database stays up | S (owner) | — |

### P1: high priority

*Status 21 Nov: P1-1, P1-2, P1-3 and P1-6 done; P1-5 partly done (module preloading and lazy fallback; content still waits for the database call on first visits). P1-4 done 21 Nov on branch `fix-bugs` (quotes saved like consultations, kind 'quote'; not live until merged). P1-7, P1-8 and P1-9 open. P1-10: Phase 1 "Room Studio" built (photo-based placement with perspective, 360° photo support, lighting preview, save and send); AI 360° expansion not started.*

| ID | Category | Affected | Problem | Solution | Impact | Complexity | Depends on |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P1-1 | Responsive | Designer | 5 px overflow at 360 px (BUG-2) | Remove fixed widths in the stage toolbar | Mobile quality | S | — |
| P1-2 | Admin / responsive | Requests page | Phone overflow (BUG-3) | Wrapping toolbar | Owners on phones | S | — |
| P1-3 | Security | CSV export | Formula injection (BUG-4) | Neutralise leading `= + - @` | Safety | S | — |
| P1-4 | Conversion | Quote flow | Quotes not recorded | Store quotes in the DB (new table + RPC), list in portal, then WhatsApp | Lead tracking | M | — |
| P1-5 | Performance | All pages | Module chain + late content call | modulepreload, early fetch, lazy fallback | First-visit speed | S–M | — |
| P1-6 | Reliability | Database | No backups | Weekly backup Action (`pg_dump` to a private place) or Pro plan | Data safety | S–M | DB URL as a GitHub secret |
| P1-7 | Security | Forms, likes | No bot protection | Cloudflare Turnstile + Edge Function, like throttling | Spam resistance | M | Edge Functions (P2-6) |
| P1-8 | Security | Admin | Single password-only account | Two-step login (TOTP) + a real recovery e-mail | Account safety | S–M | — |
| P1-9 | Security | Admin and public | No SRI or CSP | Integrity hashes or self-hosting + CSP meta | Supply-chain safety | S | — |
| P1-10 | Feature | See your space | 360° room designer missing | Build the planned room designer (360° photos, multiple lamps, surface placement, lighting, save); AI conversion optional later | Differentiation, engagement | L | Decisions pending (normal photos, replace/keep, saving) |

### P2: medium priority

| ID | Category | Affected | Problem | Solution | Impact | Complexity |
| --- | --- | --- | --- | --- | --- | --- |
| P2-1 | UX / SEO | Products | No product pages | `design.html?ref=…` with share, 3D, quote; add to sitemap | Sharing, SEO, ads | M |
| P2-2 | SEO | All pages | No structured data; static sitemap | JSON-LD (Organization, LocalBusiness, Product); sitemap generated on publish | Search visibility | S–M |
| P2-3 | Trust | Homepage, About | No social proof | Projects and testimonials blocks (About block types exist) | Conversion | S (content) |
| P2-4 | 3D | Designer | No component system, no saved configs | Components table, configuration table, shareable links | Customisation depth | L |
| P2-5 | Backend | Rooms, collections | Non-atomic saves (BE-1) | One SQL function per save | Data integrity | S |
| P2-6 | Backend | — | No Edge Functions layer | Add when bot protection, AI or e-mail alerts are built | Enables P1-7, P1-10 AI | M |
| P2-7 | Code | core.js, HTML | Monolith and duplicated header/footer | Split modules; single header/footer source | Maintainability | M |
| P2-8 | Quality | Repo | No tests | Playwright smoke tests in GitHub Actions | Regression safety | M |
| P2-9 | UX | Homepage | Too long; designer buried | Restructure; dedicated Designer page | Engagement | M |
| P2-10 | Visual | Products | Inconsistent product photography | Consistent backdrops and scale | Premium feel | M (photography) |
| P2-11 | Admin | Media, About | Native `prompt`/`confirm` pop-ups | Portal-styled dialogs | Polish, consistency | S |
| P2-12 | Accessibility | Room tool | Mouse-only positioning | Arrow-key positioning (or included in P1-10) | WCAG 2.1.1 | S |
| P2-13 | Architecture | Releases | No staging | Staging branch or repo | Safer releases | S |
| P2-14 | Visual | Hero | Phone crop over the lamp | Per-slide phone crop | First impression | S |

### P3: low priority

| ID | Item | Complexity |
| --- | --- | --- |
| P3-1 | Larger hit areas for hero dots and breadcrumb (R-4, R-5) | S |
| P3-2 | Self-host fonts, preload (PERF-4) | S |
| P3-3 | Retire legacy `update-images` / `fixture-tones.js` flow (FE-5) | S |
| P3-4 | Move repo photos into storage (AR-1) | S |
| P3-5 | Indexes on remaining foreign keys | S |
| P3-6 | Consistent API error shape (BE-4) | S |
| P3-7 | Stronger admin input focus ring | S |
| P3-8 | Hide debug globals behind `?debug` | S |

### What can be done independently

- **Can be done in parallel, any order:** P0-1 to P0-4, P1-1, P1-2, P1-3, P1-5, P1-6, P1-8, P1-9, P2-2, P2-3, P2-5, P2-11, P2-12, P2-14 and all P3 items.
- **P1-7 bot protection** and **AI room conversion** need the Edge Functions layer (P2-6).
- **P2-4 components** should come before **P1-10's "customize components in the room"** part. A first version of P1-10 can use today's size, finish and cord options.
- **P2-1 product pages** go better with **P2-2 structured data** and **P1-4 recorded quotes**.

---

## 12b. Competitive and industry evaluation

**What makes the site competitive today:**
- Few local lighting sellers offer a 360° 3D designer, a room preview and a consultation workflow together.
- Owner-editable content with versioned publishing.
- A fast, free and secure stack.

**Where it falls behind premium brands** (premium lighting and furniture brands, room-planner tools like the Coohom-style experiences you referenced):
- **Product presentation:** no product pages, inconsistent photography, real 3D models of the actual products missing.
- **Trust:** no prices, reviews, projects, warranty, delivery or returns information, physical address or showroom, or privacy policy.
- **Visualization:** no AR ("view in my room" on phones) and no 360° or perspective-correct room view.
- **Follow-up:** no e-mail confirmations, no quote tracking, no saved or shareable designs.

**Missing features, in order of value:** recorded quotes; product pages; real prices or ranges; installed-project gallery; shareable saved designs; room designer with multiple lamps; AR on phones (glTF + `<model-viewer>`-style viewing); bilingual Arabic and English.

**What would make it feel premium:** professional brand photography (installs, materials, people); a slower, editorial homepage; dedicated Designer and Room pages; consistent product imagery; a recognisable logo mark; e-mail confirmations designed in the brand.

**Biggest impact on trust and conversion:**
1. Real prices.
2. Proof: projects and reviews.
3. A privacy page and full contact details.
4. Recorded quotes with fast replies.
5. Shareable designs.

---

## 13. Final verdict

*Status after the launch fixes: P0-1 to P0-3 are done in the code; P0-4 (push) and the owners' approvals remain. See section 2b.*

**Suitable for a limited launch, after P0-1 to P0-4.**

- It is **more than "internal testing"**: every customer journey works, requests reach a secure database, owners can manage content, and no critical security issue exists.
- It is **not "production-ready"**: no real prices, no privacy policy, no backups, no bot protection, a visible mobile bug at 360 px, and the flagship room experience is still a basic 2D tool.
- **Path to production-ready:** P0 items, then P1-1 to P1-9 (mostly small), then decide on P1-10 (360° room designer) and P2-1 (product pages). Those two would move the site from "good local website" towards "premium brand experience".
