# LumaDesign Business Dashboard: proposal

*Draft for the first meeting with the owner, 21 November 2026. This is a planning document.*

**Already built (21 November 2026):** a first **Business dashboard** in the portal that uses only the inquiry data the website already records (inquiries, replies, statuses, designs asked about, hearts). It shows sales, expenses, profit and visits as "not recorded yet". Everything else in this proposal is not built.

**Companion document:** the meeting questionnaire, [OWNER-DISCOVERY-QUESTIONNAIRE.md](OWNER-DISCOVERY-QUESTIONNAIRE.md).

**How to read the labels:**

| Label | Meaning |
| --- | --- |
| **MVP** | Essential, first version |
| **Phase 2** | Important, next |
| **Advanced** | Optional, later |
| `[Existing data]` | Works with what the website already records |
| `[New tracking]` | The website must start counting something |
| `[Manual entry]` | Someone types it in (orders, expenses, costs) |
| `[Integration]` | Comes from another service |
| `[Owner to confirm]` | Depends on how the business actually works |

**Figures:** this document contains **no business figures**. Example screens show "—" where a number would go. Every number in the system will come from records the business enters or the website measures.

---

## 1. Executive summary

**What the owner gets.** One portal, the one already used to manage the website, with a new **Business** section. It answers:
- How much are we selling?
- What does it cost us?
- What do we really earn?
- Which lamps make money?
- Is the business growing?

**Honest starting point.** Today the website takes **consultation requests** and sends **quotes to WhatsApp**. It does **not** take orders or payments online. So:
- The website can already show **interest**: requests, the designs people ask about, hearts.
- It cannot know **sales, costs or profit**. Those happen in conversations, the workshop and the bank.
- The dashboard therefore needs a simple way to **record each real sale and each expense**, whatever the channel: WhatsApp, phone, showroom, Instagram or the website.

**The proposal:**
1. **Sales & orders:** record confirmed orders and payments. A website request becomes an order with one click, and only when the customer actually buys.
2. **Product costs:** record what each lamp and each component costs. The system then works out the cost and profit of every order, including custom lamps. Old orders keep their original cost even when prices change.
3. **Expenses:** record rent, salaries, materials, marketing and so on, with receipts.
4. **Overview:** a single screen with sales, profit, money received, open requests and alerts, for any period.
5. **Website analytics:** privacy-friendly counts of visits and interest, with no cookies and no personal data.
6. **Reports:** sales, profit and loss, expenses and product profitability, exported to Excel (CSV) or PDF.

**Cost to run: $0 per month.**
- Everything uses services the website already uses on free plans: GitHub Pages and the Supabase free plan.
- No payment gateway, no paid analytics, no paid email service.
- The only cost is development time.

**What we need from the owner first:** answers to the essential questions in the questionnaire. The most important are:
- how sales happen
- when a sale counts as revenue
- VAT
- whether lamps are made in-house or bought
- whether accounting software is already used

---

## 2. Proposed admin portal structure

**Today the sidebar has two groups:**
- **Website:** Homepage, Shop by space, Collections, Designs, About us, Contact us, Media library.
- **Admin:** Settings.
- Dashboard and Consultation requests sit above both groups.

**Proposed sidebar:**

| Group | Items | Who sees it |
| --- | --- | --- |
| **Business** (new, first) | **Overview** (new home page for the owner) · **Inquiries** (today's Consultation requests, the start of the sales pipeline) · **Sales & orders** · **Customers** · **Products & costs** · **Expenses** · **Website analytics** · **Reports** | Owner; others according to their role (section 11) |
| **Website** | Homepage · Shop by space · Collections · Designs · **Lamp options** (new: sizes, finishes, cords and their prices; see section 6) · About us · Contact us · Media library | Owner and anyone allowed to edit the website |
| **Admin** | Settings (with a new **Business settings** tab) · **Users & roles** (new) | Owner |

**How the two halves stay separate:**
- **Website management keeps "save draft → preview → publish".** Business records never go through Publish and never appear on the public website. They are saved immediately, like request statuses today.
- Business data lives in **its own tables** with **stricter access rules** than the website content.
- **The same login, database and portal** are reused. No second app, no second password, no duplicate backend.

**Why move "Consultation requests" into Business as "Inquiries"?**
- A request is the first step of a sale.
- Placing it next to Sales & orders makes the path visible: inquiry → quote → order → delivered → paid.
- A **Convert to order** button copies the customer and design into a new order.
- The page itself stays as it is today.

**The current Dashboard** (request counts, recent uploads, website status) becomes part of the new **Overview**. Its website items move into a small "Website status" panel.

---

## 3. Proposed Business Dashboard layout (Overview)

```
┌ Business overview ────────────── [ This month ▾ ] [ compare: previous period ☑ ] ┐
│                                                                                    │
│  Net sales      Gross profit       Net profit     Money received  Orders delivered │
│  —  ▲—%         —  (cost known     —  ▲—%         —  ▲—%          —  ▲—%           │
│                    for —% of items)                                                │
│                                                                                    │
│  Open inquiries: —     Waiting > 2 days: —     Unpaid balances: —                  │
├────────────────────────────────────────────┬───────────────────────────────────────┤
│  Sales and profit by month (12 months)     │  Sales pipeline this period           │
│  [column chart: sales, line: gross profit] │  Inquiries → Quoted → Confirmed →     │
│                                            │  Delivered (counts and %)             │
├────────────────────────────────────────────┼───────────────────────────────────────┤
│  Where the money goes (expenses)           │  Top lamps                            │
│  [bar chart by category]                   │  by sales  |  by profit  (top 5)      │
├────────────────────────────────────────────┴───────────────────────────────────────┤
│  Needs attention: 3 orders past delivery date · 2 items without a cost ·           │
│  last backup 9 days ago · 4 inquiries waiting > 2 days                             │
└────────────────────────────────────────────────────────────────────────────────────┘
```

*The example alert counts above illustrate the format only.*

**Design principles:**
- **Five numbers, two charts, two lists, one alert box.** Anything else goes in the detailed pages.
- **Every card is clickable:** card → report → the single order or expense behind the number.
- **Each card is labelled with what it means**, for example "Net sales: delivered orders after discounts and refunds, without VAT".
- **Unknowns are shown, not guessed:**
  - If some delivered items have no recorded cost, the profit card says so and shows the share of items whose cost is known.
  - If there are no expenses for a month, net profit says "expenses not entered".
- **Phones:** cards stack two per row, charts become full width, tables show key columns only. The owner can check the numbers on a phone; data entry is easier on a computer.
- **Look:** the existing portal style (colours, cards, buttons, dialogs), so it feels like one product.

**Date filter on every Business page:**
- Today
- Yesterday
- Last 7 days
- Last 30 days
- This month
- Last month
- This quarter
- This year
- Custom range

The previous-period comparison can be switched on or off. All dates use Cairo time.

---

## 4. Recommended KPIs and exact formulas

**Revenue vs money received.** These are different things, and the dashboard always keeps them apart:
- **Sales** say what customers agreed to buy.
- **Revenue** is what was delivered.
- **Money received** is what reached the bank or the cash box.
- **Profit** needs costs.

| KPI | Formula | Data | Phase |
| --- | --- | --- | --- |
| **Booked sales** | Sum of order totals (after discounts, excluding VAT) for orders **confirmed** in the period | `[Manual entry]` | MVP |
| **Net sales revenue** | Σ delivered orders' item totals − order discounts − refunds, excluding VAT and delivery fees charged. Counted on the delivery date `[Owner to confirm: delivery date or confirmation date]` | `[Manual entry]` | MVP |
| **Money received (cash in)** | Σ payments received − Σ refunds paid, by payment date | `[Manual entry]` | MVP |
| **Unpaid balances** | Σ (order total − payments) for confirmed orders not fully paid | `[Manual entry]` | MVP |
| **Cost of goods sold (COGS)** | Σ cost snapshot of the items in delivered orders (section 6) | `[Manual entry]` | MVP |
| **Gross profit** | Net sales revenue − COGS | calculated | MVP |
| **Gross profit margin** | Gross profit ÷ net sales revenue × 100 | calculated | MVP |
| **Cost coverage** | Delivered items with a known cost ÷ all delivered items × 100. If below 100%, gross profit is marked **incomplete** | calculated | MVP |
| **Operating expenses** | Σ expenses dated in the period, excluding categories marked "product cost" (to avoid counting materials twice) | `[Manual entry]` | MVP |
| **Net profit (before tax)** | Gross profit − operating expenses | calculated | MVP |
| **Net profit margin** | Net profit ÷ net sales revenue × 100 | calculated | MVP |
| **Simple cash flow** | Money received − expenses **paid** in the period | calculated | Phase 2 |
| **Orders: total, delivered, open, cancelled, returned** | Count of orders by status in the period | `[Manual entry]` | MVP |
| **Average order value (AOV)** | Net sales revenue ÷ number of delivered orders | calculated | MVP |
| **Sales growth** | (This period − previous equal period) ÷ previous period × 100. Shown only when the previous period has data | calculated | MVP |
| **Discounts given** | Σ line and order discounts | `[Manual entry]` | Phase 2 |
| **Refunds** | Σ refunds and their count; refund rate = refunded orders ÷ delivered orders | `[Manual entry]` | Phase 2 |
| **Inquiries** | Count of website consultation requests | `[Existing data]` | MVP |
| **Inquiry → order conversion** | Orders created from an inquiry ÷ inquiries in the period | `[Existing data]` + `[Manual entry]` | MVP |
| **Average time to first contact** | Average of (first "Contacted" status − request time) | `[Existing data]` | Phase 2 |
| **New customers** | Customers whose first order is in the period | `[Manual entry]` | Phase 2 |
| **Returning customers / repeat rate** | Customers with 2+ orders ÷ customers with 1+ order | `[Manual entry]` | Phase 2 |
| **Average spend per customer** | Net sales revenue ÷ customers who bought in the period | calculated | Phase 2 |
| **Customer acquisition cost (CAC)** | Marketing expenses in the period ÷ new customers in the period | `[Manual entry]` | Advanced |
| **Customer lifetime value (LTV)** | Average gross profit per customer over all their orders. Shown only after 12+ months of history | calculated | Advanced |
| **Website visits** | Page views per day (and per page) | `[New tracking]` | MVP |
| **Website conversion** | Inquiries ÷ visits (or ÷ unique visitors if an external tool is added) | `[New tracking]` | MVP |
| **Quote requests** | Count of "Send quote by WhatsApp" clicks | `[New tracking]` | MVP |

**Main dashboard vs detailed reports:**
- **Main dashboard:** net sales, gross profit with cost coverage, net profit, money received, orders delivered, open inquiries, unpaid balances, alerts.
- **Detailed reports:** everything else.

---

## 5. Financial management module (Expenses)

**What the owner can do** (all **MVP** unless marked):
- **Add an expense:**
  - date
  - category
  - who was paid (supplier or person)
  - amount in EGP
  - payment method
  - paid or not yet paid (with due date)
  - notes
  - receipt (photo or PDF)
- **Edit, categorise and filter** by date, category, supplier and paid status.
- **Recurring expenses** (rent, salaries, software): a monthly template the owner confirms each month. Amounts can vary, so nothing is booked automatically. *(Phase 2)*
- **Compare months:** each category this month vs last month and vs the same month last year. *(Phase 2)*
- **Export** the filtered list to CSV (Excel) and print as PDF.

**Starting categories** (editable in Business settings):

| Category | Group |
| --- | --- |
| Manufacturing, Purchasing (finished lamps), Raw materials, Components, Packaging | Product cost |
| Shipping & delivery | Product cost or operating `[Owner to confirm]` |
| Marketing & advertising | Operating |
| Salaries & wages | Operating |
| Rent & utilities | Operating |
| Website, hosting & software | Operating |
| Payment fees | Operating |
| Maintenance & repairs | Operating |
| Other | Operating |

**Avoiding double counting:**
- If lamp costs are recorded per product (section 6), material purchases are already counted in COGS when a lamp is sold.
- Those purchase expenses are marked "product cost": they appear in cash flow and expense reports but are **not subtracted again** in net profit.
- Which approach fits depends on how the business buys and makes lamps `[Owner to confirm]`.

**Manual entry or import?**
- **MVP:** manual entry. It is short: date, category, amount and receipt photo from a phone.
- **Phase 2:** CSV import from an existing spreadsheet or bank statement.
- **If the business already uses accounting software:** do **not** duplicate the ledger. Either import monthly totals per category, or record only what the dashboard needs. `[Owner to confirm]`

**Receipts:**
- Stored in a **private** storage area: only the owner and finance users can open them, through links valid for one hour.
- Photos are shrunk in the browser before upload to save free storage.
- PDF files are limited in size.

---

## 6. Product costing and profitability

### How the price of a custom lamp works today

The 3D lamp designer already prices a custom lamp from parts:

> Estimate = shade price for the chosen size (19, 33 or 42 cm) + cord price (not for ceiling lights) + bulbs price

These selling prices are set in **Settings → Lamp designer prices**. They are not yet shown on the website: the owner switches them on when real prices are entered. Finishes (ivory, black, brass) do not change the price today.

**Costs are not recorded anywhere yet.**

### Proposal: one component list for price and cost

A new **Lamp options** page (Website group) holds every option with its **selling price** and, visible to the owner only, its **cost**:

| Part | Selling price (website) | Cost (owner only) | Notes |
| --- | --- | --- | --- |
| Shade/body per size | ✓ | ✓ | Per design if designs differ `[Owner to confirm]` |
| Finish | optional surcharge | ✓ | Brass may cost more than ivory |
| Cord | ✓ | ✓ | |
| Bulbs | ✓ | ✓ | |
| Canopy, fittings, hardware | — | ✓ | Included in the price |
| Assembly labour | — | ✓ | Per lamp or per hour `[Owner to confirm]` |
| Packaging | — | ✓ | |

**Cost of one lamp** = design base cost for the size (or the shade/body cost) + finish + cord + bulbs + fittings + labour + packaging.

**Delivery:**
- Recorded per order, not per lamp, because one van can carry several lamps.
- It goes into the order's delivery cost, and into COGS or operating expenses `[Owner to confirm]`.

**Expected profit of a lamp** = selling price − cost of the lamp.
- Shown in the order form as soon as the options are chosen.
- Shown in Products & costs as a margin per design and size. *(Phase 2: a warning when a price gives a margin below a chosen minimum.)*

**Lamps bought ready-made** (if any): cost = supplier price + import/transport per unit + packaging `[Owner to confirm]`.

### Keeping old profit correct when costs change

- **Every cost has an effective date.** Changing the cost of brass from one date onwards keeps the old value in the history.
- **Each order line freezes its cost** when the order is confirmed: the total, plus the breakdown of parts with their costs on that date.
- Later cost changes affect **new orders only**. Last year's profit stays as it was.
- If a frozen cost was wrong, the owner records a **correction** with a reason. It shows in the history and in the month it was made, and is never overwritten silently.

### Profitability reports *(Phase 2)*

All of these come from order lines, with the cost snapshot behind each:
- profit and margin per design, per size, per finish, per category and per collection
- best sellers by units and by profit
- designs with no sales in the period
- performance over time

`[Manual entry]`

---

## 7. Orders and sales analytics

### What exists today

| Question | Answer from the code |
| --- | --- |
| Online checkout or payment gateway? | **No** |
| Orders stored? | **No** |
| Quotes stored? | **No.** "Request a quote" builds a WhatsApp message with the customer's selection (designs, sizes, finishes, quantities) and opens WhatsApp. Nothing is saved |
| Consultation requests stored? | **Yes**, with name, phone, email, preferred contact and time, notes, design of interest, custom setup, room design, source page, and status (New → Contacted → Meeting scheduled → In progress → Completed / Cancelled) with full history |
| Other channels (phone, showroom, Instagram, Facebook, TikTok)? | Unknown `[Owner to confirm]` |

**Conclusion:** sales happen **outside** the website. The system must let the owner record sales from **any** channel, and must never treat an inquiry as a sale.

### Orders *(MVP)*

**What an order records:**
- **Customer:** new or existing. Matched by phone so the same person is not created twice.
- **Channel:** website inquiry, WhatsApp, phone, showroom, Instagram, Facebook, other. The list is editable `[Owner to confirm]`.
- **Link to the original inquiry**, if any.
- **Order lines:**
  - design (picked from the catalogue) or a free-text item
  - options: size, finish, cord
  - quantity, unit price, line discount
  - cost snapshot (section 6)
- **Totals:** order discount, delivery fee charged, VAT if the business is registered `[Owner to confirm]`, total.
- **Dates:** confirmed, promised delivery, delivered.
- **Status:** Quote → Confirmed → In production → Ready → Delivered, or Cancelled / Returned.
- **Payments:**
  - deposit and balance: date, amount, method (cash, bank transfer, mobile wallet, card…) `[Owner to confirm]`
  - reference, fee if any
- **Refunds:** amount, date, reason.
- **Notes and history:** who changed what and when.

**Rules:**
- An inquiry never counts as a sale.
- An order counts in **booked sales** when Confirmed and in **revenue** when Delivered (configurable).
- Cancelled orders count only in the cancellations report.

### Sales reports *(MVP basics; the rest Phase 2)*

- orders by date and by status
- revenue by product, category and collection
- revenue by channel
- average order value
- discounts, refunds and cancellations (with reasons)
- sales over time, with the previous period
- open orders past their promised date

### The quote gap *(MVP)*

Today the owner cannot see how many quotes were requested. The new website counters (section 8) count every "Send quote" click and what was in it, without personal data. The owner can then see how many quotes led to orders. This closes item P1-4 of the earlier site audit.

---

## 8. Website analytics

### Measurable today, without any change `[Existing data]`

- inquiries per day, week and month
- which page they came from
- which designs people ask about
- how many requests included a custom lamp or a room design
- request status funnel
- time to first contact
- hearts per design

### Needs new tracking, the recommended way

The privacy policy promises "no advertising cookies, tracking pixels or visitor analytics". We keep the spirit of that promise.

**Recommendation (MVP): first-party, cookieless daily counters.**

**How it works:**
- The website adds one to a counter in our own database for an event, the same way the "heart" count already works.
- No cookie, no visitor ID, no IP address stored, no third party.
- Counters are kept **per day and per event**, so the database stays tiny.

**Events to count:**
- page views per page
- design opened
- lamp designer used
- Room Studio opened, room design sent
- design added to selection
- quote sent to WhatsApp
- WhatsApp or call button clicked
- consultation form opened and sent

**Extra breakdowns:** coarse **device type** (phone, tablet, computer) and **where visitors came from** (search engine, Instagram, Facebook, WhatsApp, direct). Both are derived on the spot and stored only as counts.

**Limits:**
- Without cookies we count **visits (page views), not unique people**.
- "Unique visitors" and countries need an external tool.

**Optional, still free:**
- **Cloudflare Web Analytics** is cookieless and adds unique visitors, countries and more detail on traffic sources. Check its current terms before choosing.
- **Google Analytics 4** is free but uses cookies, which in practice needs a cookie consent banner. Not recommended for this site.

**Not applicable:**
- "Add to cart" and "checkout conversion": there is no cart checkout.
- The closest equivalents are "added to selection" and "quote sent", which the counters provide.

**Conversion funnel (MVP):** page views → design opened → designer used / added to selection → quote sent or inquiry sent → order (from Sales) → delivered.

**Privacy:** the privacy policy must be updated before any tracking starts, to explain the anonymous counts.

**Google Search Console** *(Phase 2, free)*: search terms and Google clicks. The owner verifies the site once. The portal shows a link, or a monthly import, since its data is not needed in real time.

---

## 9. Reporting and export

| Report | Contents | When it is useful | Phase |
| --- | --- | --- | --- |
| **Sales** | Orders, revenue, AOV, by day, channel, product | Daily / weekly | MVP |
| **Orders** | Open, late, delivered, cancelled, returned | Daily / weekly | MVP |
| **Inquiries** | New inquiries, waiting time, conversion to orders | Daily / weekly | MVP |
| **Expenses** | By category and supplier; month vs month | Monthly | MVP (list), Phase 2 (comparisons) |
| **Profit & loss** | Net sales − COGS = gross profit − operating expenses = net profit; with cost coverage | Monthly, quarterly, yearly | Phase 2 |
| **Product profitability** | Units, revenue, cost, profit, margin per design, size, finish, category, collection | Monthly | Phase 2 |
| **Customers** | New vs returning, top customers, repeat rate | Monthly / yearly | Phase 2 |
| **Website** | Visits, top pages and designs, quotes, funnel, devices, sources | Weekly / monthly | MVP (basic), Phase 2 (funnel) |
| **Year summary** | All of the above by month | Yearly | Phase 2 |

**Export:**
- **CSV**, which opens in Excel with Arabic names kept. Uses the same method as today's request export. *(MVP)*
- **PDF** through the browser's Print → Save as PDF, with a clean print layout. No extra software. *(Phase 2)*
- A real **.xlsx** file with several sheets, through a free library. *(Advanced)*

**Every report** has the same date filter and comparison as the dashboard.

**Scheduled summaries** *(Advanced, free)*: the Google Apps Script already written for the Sheet copy of requests could also email the owner a short monthly summary, within Google's free email quota.

---

## 10. Integrations and data sources

| Source | What it gives | Automatic or manual | Recommendation |
| --- | --- | --- | --- |
| **Website database (Supabase)** | Inquiries, designs, collections, prices, hearts; and in future orders, payments, costs, expenses, counters | Automatic for website data; manual entry for business records | **The single source of truth.** Everything lives here |
| **First-party counters** | Visits and interest events | Automatic | MVP |
| **Google Sheet copy of requests** | A spreadsheet copy of inquiries (script written, not deployed) | Automatic | Optional, as now. The Sheet is a copy, never the source |
| **Cloudflare Web Analytics** | Unique visitors, countries, sources | Automatic | Optional, free |
| **Google Search Console** | Google searches and clicks | Automatic (view in Google) | Phase 2, free |
| **Google Analytics 4** | Detailed traffic | Automatic | Not recommended (needs cookie consent) |
| **Advertising platforms** (Meta, Google Ads) | Spend and results | Manual (spend entered as a marketing expense) | Advanced, only if the business advertises `[Owner to confirm]` |
| **Payment gateway** | — | — | None exists, so not applicable. Payments are recorded by hand |
| **Accounting software / spreadsheets** | Expenses, invoices | CSV import | Phase 2, if used `[Owner to confirm]` |
| **Inventory system** | Stock | — | Advanced, only if stock is tracked `[Owner to confirm]` |

**Principle:** no integration unless it saves real work and is free. Business records are typed into the portal once; reports are produced from there.

---

## 11. Security and permissions

**Today:**
- One admin login.
- Every table is protected so only that login can read or change data.
- Visitors can only send requests and hearts.
- Sign-up is disabled.

**Proposed roles:**

| Permission | Owner | Manager `[Owner to confirm]` | Staff |
| --- | --- | --- | --- |
| Edit the website and publish | ✓ | ✓ | — |
| Inquiries (view, status, notes, convert) | ✓ | ✓ | ✓ |
| Orders: create and update status | ✓ | ✓ | ✓ (without costs or profit) |
| Payments and refunds | ✓ | ✓ | — |
| See costs, profit, P&L | ✓ | view only | — |
| Change product and component costs | ✓ | — | — |
| Add and edit expenses | ✓ | ✓ | — |
| Close a month, correct closed records | ✓ | — | — |
| Reports and exports | ✓ | ✓ (no profit for staff) | — |
| Users and roles | ✓ | — | — |

**Protection measures:**
- **Enforced by the database,** not only hidden in the portal. A staff login cannot read costs even with technical tricks.
- **Two-step login** (an authenticator app on the phone) for the owner and anyone who can see finances, required **before** real financial data is entered. It is included free in the login service already used.
- **Each person has their own login** (no shared password), so the history shows who did what.
- **Financial audit log:** every create, change or delete of an order, payment, expense or cost is recorded with who, when, and the old and new values. Nobody can edit the log.

**Protecting history:**
- **Closing a month** locks its orders, payments and expenses.
- Changes after that are made as dated **corrections** (with a reason), never by editing the past.
- Orders and expenses are **cancelled or voided, not deleted**.

**Backups ($0):**
- The free database plan does not back up automatically.
- The existing **backup** tool will also save the new business tables and receipts.
- Proposed routine: **back up every Friday** and copy the folder to the owner's own private cloud folder.
- The Overview shows "last backup: N days ago".
- Backups contain customer and financial data. They are never uploaded to GitHub.

**Receipts** are private files, opened through short-lived links, with size and type limits.

---

## 12. Existing capabilities and missing functionality

| Area | Available now | Needs new tracking | Needs manual entry | Needs integration | Needs owner confirmation |
| --- | --- | --- | --- | --- | --- |
| Inquiries | ✓ requests, statuses, history, design, room designs, source page, CSV export | — | — | — | Who handles them |
| Quotes | Sent to WhatsApp only | ✓ count and contents | — | — | — |
| Orders and sales | — | — | ✓ | — | Channels, statuses, revenue rule, VAT |
| Payments | — | — | ✓ | (no gateway) | Methods, deposits |
| Customers | Names and phones in inquiries | — | ✓ (from orders) | — | Is there an existing customer list? |
| Product prices | ✓ designer prices per size, cord, bulbs; price text per design | — | — | — | Real prices to enter |
| Product costs | — | — | ✓ | — | Make or buy; cost structure |
| Expenses | — | — | ✓ | Optional CSV import | Categories, accounting software |
| Inventory | — | — | ✓ (Advanced) | Optional | Is stock kept? |
| Website traffic | — | ✓ counters | — | Optional free Cloudflare | — |
| Search performance | — | — | — | Search Console (free) | Owner's Google account |
| Marketing results | — | ✓ traffic source counts | ✓ ad spend | — | Is advertising used? |
| Permissions | One admin | — | — | — | Who else uses the portal |
| Reports and export | CSV of requests | — | — | — | Which reports matter |

---

## 13. First-meeting discovery questionnaire

The full questionnaire, with **essential** and **optional** questions and why each one matters, is in [OWNER-DISCOVERY-QUESTIONNAIRE.md](OWNER-DISCOVERY-QUESTIONNAIRE.md).

**The six answers that shape the design most:**
1. **Sales channels:** where sales really happen.
2. **When a sale counts:** confirmed, delivered or paid.
3. **VAT:** is the business VAT-registered?
4. **Make or buy:** lamps made in a workshop, bought, or both.
5. **Existing tools:** accounting software or spreadsheets.
6. **Users:** who will use the dashboard.

---

## 14. Implementation phases

### Phase 0: discovery *(before development)*

- First meeting with the questionnaire.
- Agree the definitions in section 4: revenue rule, VAT, product vs operating costs.
- Collect real cost information and the list of expense categories.

### Phase 1: essential business dashboard *(MVP)*

| Feature | Data |
| --- | --- |
| Business group in the sidebar, Overview with the 5 key numbers, date filter and comparison | — |
| Roles (owner / manager / staff) and two-step login | — |
| Inquiries page (existing) with **Convert to order** | `[Existing data]` |
| Customers (created from orders and inquiries) | `[Manual entry]` |
| Orders with lines, statuses, payments, refunds | `[Manual entry]` |
| Component and design costs with dates; cost snapshot on orders; gross profit with coverage | `[Manual entry]` |
| Expenses with categories and receipts; net profit | `[Manual entry]` |
| Anonymous website counters (visits, designs, quotes, inquiries) and privacy policy update | `[New tracking]` |
| CSV export of orders, expenses, inquiries | — |
| Financial audit log, backup extension and reminder | — |

### Phase 2: advanced analytics

| Feature | Data |
| --- | --- |
| Product, category and collection profitability | — |
| Customer analytics (new vs returning, repeat rate, top customers) | — |
| Trends and period comparisons on every report; P&L report; PDF print layouts | — |
| Recurring expense templates; CSV import of expenses | `[Owner to confirm]` |
| Month closing | — |
| **Lamp options** page driving both website prices and costs | — |
| Website funnel; Search Console link; optional free Cloudflare analytics | — |

### Phase 3: business intelligence *(Advanced)*

| Feature | Data |
| --- | --- |
| Marketing spend by channel, CAC, return on marketing | `[Owner to confirm]` |
| Customer lifetime value (after 12 months of data) | — |
| Inventory: stock per component, movements, low-stock alerts | `[Owner to confirm]` |
| Alerts (late orders, low margin, unpaid balances) | — |
| Monthly email summary through the existing free Google script | — |
| .xlsx export; accounting software import | — |

---

## 15. Development complexity and running costs

### Complexity

These are **rough ranges for one developer**, to be refined after the meeting. They are not a quote.

| Phase | Effort | Main work |
| --- | --- | --- |
| Phase 1 | About 3–4 weeks | New database tables and access rules, roles and two-step login, 6 new portal pages, costing logic, counters, privacy text, testing |
| Phase 2 | About 2–3 weeks | Reports, charts, comparisons, imports, Lamp options page, month closing |
| Phase 3 | About 2–4 weeks | Depends on inventory and marketing needs |

**Complexity drivers:**
- whether stock is tracked
- how many people use the portal
- how detailed product costing must be (per part vs one cost per lamp)
- whether VAT applies

### Running costs: $0 per month

| Need | Free solution | Free limit to watch |
| --- | --- | --- |
| Website hosting | GitHub Pages (as today) | — |
| Database, logins, two-step login, private receipts | Supabase free plan (as today) | **500 MB database.** Business records are small: thousands of orders and expenses take only a few MB. **1 GB file storage**, shared with website photos; receipts are shrunk before upload |
| Keeping the free database awake | Existing daily GitHub job | — |
| Backups | Existing backup tool + owner's own cloud folder | Manual, weekly |
| Charts | A free chart library (or simple drawn charts) | — |
| Website analytics | Own anonymous counters; optional free Cloudflare Web Analytics | Counters are stored per day, so they stay small |
| Reports | CSV and browser PDF | — |
| Email summaries (Advanced) | Existing Google Apps Script | Google's free daily email quota |
| Payments | None (no online payment) | — |

**Not needed (deliberately left out):**
- a paid database plan
- paid analytics
- paid email service
- payment gateway
- separate dashboard software

**When paying would become worth discussing (the owner decides then):**
- the database nearing 500 MB, or storage nearing 1 GB (the portal can show both)
- wanting automatic daily backups instead of the weekly manual routine
- deciding to sell online with card payments

*Free-plan limits and terms change over time; check the current terms before each phase.*

---

## Appendix A: technical design notes (for the developer)

### Integration with the existing portal

**Sidebar and routing:**
- `admin/index.html`: add a `<p class="side-group">Business</p>` block above "Website", and move the Requests link into it as "Inquiries".
- `admin/js/main.js`: add routes to `ROUTES` that lazy-load `admin/js/views/business/{overview,orders,customers,costs,expenses,analytics,reports}.js`.
- Use the existing `route()` / `routeSeq` / `.page` pattern.
- Landing route by role.

**Reuse:**
- `api.js`: `sb`, `q`, `rpc`, `invalidate`.
- `ui.js`:
  - `dialog({ guard: true })`
  - `confirmDialog`, `toast`, `fail`
  - `bind`/`fillForm`
  - `setDirty`
- `widgets.js`: lists and the design picker.
- The CSV export function in `views/requests.js`, moved to a shared helper.
- The private-bucket pattern from `room-designs`.
- `backup_database.py`.

**Business data stays outside Publish:**
- Never referenced by `build_site()`.
- No `site_content` area.
- Saved immediately.

**Charts:** pinned Chart.js from jsDelivr, loaded only on Business pages, or small SVG helpers.

**Print:** a `@media print` stylesheet for reports.

### Data model sketch (no migrations written)

**Sales:**

| Table | Columns |
| --- | --- |
| `customers` | id, name, phone (normalised, unique), email, city, source/channel, notes, created_at |
| `orders` | id, number, customer_id, channel, inquiry_id → `consultation_requests.id`, status, confirmed_at, promised_at, delivered_at, cancelled_at, subtotal, discount, delivery_fee, vat_rate, vat_amount, total, notes, created_by, voided |
| `order_items` | id, order_id, design_id (nullable), ref/name/category/collection snapshots, options jsonb (size, finish, cord), qty, unit_price, line_discount, unit_cost, cost_breakdown jsonb, cost_known bool |
| `payments` | id, order_id, kind (payment/refund), paid_at, amount, method, fee, reference, created_by |

**Costs:**

| Table | Columns |
| --- | --- |
| `cost_items` | id, kind (shade/body, finish, cord, bulb, fitting, labour, packaging, design-base), key (size/finish/cord/design_id), name, active |
| `cost_prices` | id, cost_item_id, amount, effective_from, note, created_by. History: newest `effective_from ≤ date` wins |

**Expenses:**

| Table | Columns |
| --- | --- |
| `expense_categories` | id, name, group (product_cost / operating), position, active |
| `expenses` | id, spent_at, category_id, payee, amount, method, paid, due_at, recurring_id, receipt_path, notes, created_by, voided |
| `expense_templates` (Phase 2) | — |

**Control and analytics:**

| Table | Columns |
| --- | --- |
| `finance_periods` | month, closed_at, closed_by (locks edits through RLS) |
| `finance_audit` | at, actor, table, row_id, action, old jsonb, new jsonb. Written by triggers; append-only |
| `site_events_daily` | day, event, key (page/design ref/source/device), count. Written by a rate-limited security-definer RPC like `record_like`, granted to anon |

### Access rules

**Roles:**
- `app_metadata.role` takes the values `owner`, `manager` or `staff`.
- The existing `admin` value maps to `owner` for compatibility.
- Helpers: `is_staff()`, `can_finance()`, `is_owner()`.

**Table policies:**
- **Website content tables:** `is_admin()` is replaced by "owner or manager".
- **`orders` and `order_items`:** readable by staff, but cost columns are exposed only through security-definer RPCs or a view gated by `can_finance()`.
- **Finance tables** (`cost_*`, `expenses`, `payments`, `finance_*`): `can_finance()` only.
- **Writes** are blocked for dates in a closed period.

**Other rules:**
- **Bucket `receipts`:** private, read and write for `can_finance()`, size and type limits.
- **Two-step login:** Supabase Auth TOTP. Policies require `aal2` (`auth.jwt()->>'aal' = 'aal2'`) for finance tables.

### Calculations

- **Location:** KPIs are calculated in SQL functions (for example `business_overview(from, to, compare)`), so every page and export uses the same definitions.
- **Timezone:** Africa/Cairo.
- **Money:** stored as `numeric(12,2)` EGP.
- **Missing costs:** a line with `cost_known = false` is excluded from COGS and counted in the coverage %.
