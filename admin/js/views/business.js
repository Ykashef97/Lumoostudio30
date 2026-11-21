/* Business dashboard: how many people ask for our lights, what they ask about, and what needs a
   reply. Every figure comes from what the website really records (consultation requests, their
   status history, and hearts). Sales, costs and visits are not recorded yet, and the page says so. */
import { rpc } from '../api.js';
import { esc, icon, loading, empty, timeAgo, statusBadge, requestLabel, STATUS_LABEL } from '../ui.js';
import { columnChart, hBars, stackedBar } from '../charts.js';
import { CATEGORY } from './designs.js';

const PERIODS = [
  ['7d', 'Last 7 days', 'the 7 days before'],
  ['30d', 'Last 30 days', 'the 30 days before'],
  ['month', 'This month', 'the same days last month'],
  ['lastmonth', 'Last month', 'the month before'],
  ['90d', 'Last 90 days', 'the 90 days before'],
  ['12m', 'Last 12 months', 'the 12 months before'],
  ['all', 'All time', '']
];
const PERIOD_KEY = 'lumaBizPeriod';
const STATUSES = ['new', 'contacted', 'meeting_scheduled', 'in_progress', 'completed', 'cancelled'];
// Where on the website the customer pressed the button that opened the request form.
export const SOURCE = {
  details: "From a design's details", shortlist: 'From the shortlist', like: 'After hearting a design',
  designer: 'From the 3D lamp designer', selection: 'From Your selection (quote)', quote: 'A "Request a quote" button', 'room-studio': 'From Room Studio', notice: 'From the notice bar',
  contact: 'From the Contact page', 'about-hero': 'From the About page', 'about-cta': 'From the About page',
  'home-about': 'From the About section', 'space-hero': 'From a Shop by space page', 'space-cta': 'From a Shop by space page',
  page: 'General booking button', general: 'General booking button', '': 'General booking button'
};
const TZ = 'Africa/Cairo';
const dateFmt = opts => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, ...opts });
const dayLabel = dateFmt({ day: 'numeric', month: 'short' });
const monthLabel = dateFmt({ month: 'short', year: 'numeric' });
const longDay = dateFmt({ weekday: 'short', day: 'numeric', month: 'short' });
const isoDay = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }); // YYYY-MM-DD

// A link to Requests and quotes showing exactly the requests behind a figure.
function requestsLink(filters, p) {
  const q = new URLSearchParams();
  if (p && p.key !== 'all') {
    q.set('from', isoDay.format(new Date(p.from)));
    q.set('to', isoDay.format(new Date(new Date(p.to) - 1)));
  }
  Object.entries(filters).forEach(([k, v]) => v && q.set(k, v));
  if (![...q.keys()].length) q.set('status', '');
  return '#/requests?' + q.toString();
}
// A figure card: a link when it leads somewhere, with an arrow so that is visible.
const stat = (href, cls, inner) => href
  ? `<a class="stat${cls}" href="${esc(href)}">${icon('chevron-right')}${inner}</a>`
  : `<div class="stat${cls}">${inner}</div>`;

const readPeriod = () => { try { return localStorage.getItem(PERIOD_KEY) || '30d'; } catch (e) { return '30d'; } };
const savePeriod = v => { try { localStorage.setItem(PERIOD_KEY, v); } catch (e) { /* private mode */ } };
const pct = (a, b) => (b ? Math.round((a / b) * 100) + '%' : '—');
const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;

function duration(hours) {
  if (hours === null || hours === undefined) return '—';
  if (hours < 1) return Math.max(1, Math.round(hours * 60)) + ' min';
  if (hours < 48) return (Math.round(hours * 10) / 10) + ' h';
  return (Math.round(hours / 2.4) / 10) + ' days';
}
function age(since) {
  const h = (Date.now() - new Date(since)) / 3600000;
  return h < 24 ? plural(Math.max(1, Math.round(h)), 'hour') : plural(Math.round(h / 24), 'day');
}
function bucketLabel(start, bucket) {
  const d = new Date(start);
  return bucket === 'month' ? monthLabel.format(d) : bucket === 'week' ? 'Week of ' + dayLabel.format(d) : dayLabel.format(d);
}
function categoryLabel(key) {
  if (CATEGORY[key]) return CATEGORY[key][0] + 's';
  const known = Object.values(CATEGORY).find(([label]) => label.toLowerCase() === String(key).toLowerCase());
  return known ? known[0] + 's' : key;
}
// Adds counts that share a label (several page buttons have the same plain name).
function merge(rows, label) {
  const out = new Map();
  rows.forEach(r => { const l = label(r.key); out.set(l, (out.get(l) || 0) + r.count); });
  return [...out].map(([l, count]) => ({ label: l, count })).sort((a, b) => b.count - a.count);
}

function changeText(cur, prev, compareWith) {
  if (prev === null || prev === undefined) return 'Since the first inquiry';
  if (prev === 0) return cur ? 'None in ' + compareWith : 'None in ' + compareWith + ' either';
  if (cur === prev) return `Same as ${compareWith} (${prev})`;
  // Plain counts rather than percentages: with a few requests a percentage swings wildly.
  return `${cur > prev ? 'Up' : 'Down'} from ${prev} in ${compareWith}`;
}

export async function render(root) {
  let period = readPeriod();
  if (!PERIODS.some(p => p[0] === period)) period = '30d';
  root.innerHTML = `
    <div class="biz-bar">
      <p class="hint">Figures from consultation requests sent through the website. Times are Cairo time.</p>
      <label class="biz-period"><span>Period</span><span class="select-pill"><select id="bizPeriod">${PERIODS.map(([k, l]) => `<option value="${k}"${k === period ? ' selected' : ''}>${l}</option>`).join('')}</select>${icon('chevron-right')}</span></label>
    </div>
    <div id="bizBody" class="biz-body">${loading()}</div>`;
  const body = root.querySelector('#bizBody');
  root.querySelector('#bizPeriod').addEventListener('change', e => { savePeriod(e.target.value); draw(e.target.value); });

  let seq = 0;
  async function draw(key) {
    const mine = ++seq;
    body.setAttribute('aria-busy', 'true');
    try {
      const d = await rpc('business_dashboard', { p_period: key });
      if (!root.isConnected || mine !== seq) return;
      body.innerHTML = page(d);
      body.querySelectorAll('[data-href]').forEach(row => row.addEventListener('click', () => { location.hash = row.dataset.href; }));
    } catch (error) {
      if (!root.isConnected || mine !== seq) return;
      body.innerHTML = `<p class="notice notice--warn">${icon('shield')}<span>${esc(error.message)}</span></p>`;
    } finally {
      body.removeAttribute('aria-busy');
    }
  }
  await draw(period);
}

function page(d) {
  const p = d.period, k = d.kpis;
  const [, periodName, compareWith] = PERIODS.find(x => x[0] === p.key) || PERIODS[1];
  const hasData = k.inquiries > 0;
  const closed = k.completed + k.cancelled;
  const oldWait = k.oldestWaiting && Date.now() - new Date(k.oldestWaiting) > 2 * 86400000;
  const a = d.attention;

  const kpis = `<div class="stats kpis">
    ${stat(requestsLink({}, p), '', `<span>New inquiries</span><b>${k.inquiries}</b><small>${esc(changeText(k.inquiries, k.prevInquiries, compareWith))}${k.quotes ? ` · ${plural(k.quotes, 'quote request')}` : ''}</small>`)}
    ${stat('#/requests?status=new', oldWait ? ' stat--warn' : '', `<span>Waiting for a reply</span><b>${k.waiting}</b>
      <small>${k.waiting ? 'Oldest sent ' + esc(age(k.oldestWaiting)) + ' ago' : 'Every request has had a reply'}</small>`)}
    ${stat('', '', `<span>Average first reply</span><b>${duration(k.avgReplyHours)}</b>
      <small>${k.replied ? `Time until the status was first changed, over ${plural(k.replied, 'reply', 'replies')}` : 'No replies yet in this period'}</small>`)}
    ${stat(k.completed ? requestsLink({ status: 'completed' }, p) : '', '', `<span>Completed share</span><b>${pct(k.completed, closed)}</b>
      <small>${closed ? `${k.completed} completed, ${k.cancelled} cancelled (of the closed requests)` : 'No requests completed or cancelled yet in this period'}</small>`)}
    ${stat('', '', `<span>With a custom lamp or room</span><b>${pct(k.custom, k.inquiries)}</b>
      <small>${hasData ? `${k.custom} of ${k.inquiries} included a custom setup${k.rooms ? `, ${k.rooms} a Room Studio design` : ''}` : 'No inquiries in this period'}</small>`)}
  </div>`;

  const series = d.series.map(s => ({ label: bucketLabel(s.start, p.bucket), tip: bucketLabel(s.start, p.bucket), count: s.count, prev: s.prev }));
  const overTime = card('Inquiries over time', `${periodName}, by ${p.bucket}`, hasData
    ? columnChart(series, { summary: `${k.inquiries} inquiries in ${periodName.toLowerCase()}, by ${p.bucket}.`, prevLabel: compareWith ? 'Previous period' : '' })
    : empty('No inquiries in this period.', 'calendar'), true);

  const parts = STATUSES.map(s => ({ key: s, label: STATUS_LABEL[s], count: d.statuses[s] || 0, href: requestsLink({ status: s }, p) }));
  const stand = card('Where inquiries stand', `Status today of the inquiries from ${p.key === 'all' ? 'all time' : periodName.toLowerCase()}`, hasData
    ? stackedBar(parts, { summary: parts.map(x => `${x.label} ${x.count}`).join(', ') })
    : empty('No inquiries in this period.', 'calendar'), true);

  const designs = card('Most requested designs', periodName, hasData && d.topDesigns.length
    ? hBars(d.topDesigns.map(x => ({ label: x.name || x.ref, note: x.ref, count: x.count, href: x.name ? requestsLink({ q: x.name }, p) : '' })))
      + (d.general ? `<p class="hint">${plural(d.general, 'request')} without a particular design.</p>` : '')
    : empty(hasData ? 'No request in this period named a design.' : 'No inquiries in this period.', 'lamp'), true);

  const categories = card('Interest by type', periodName, hasData && d.categories.length
    ? hBars(merge(d.categories, categoryLabel))
    : empty(hasData ? 'No request in this period named a design.' : 'No inquiries in this period.', 'layers'), true);

  const liked = card('Most hearted designs', 'All time (hearts have no date)', d.topLiked.length
    ? hBars(d.topLiked.map(x => ({ label: x.name, note: x.ref, count: x.count, href: '#/designs' })))
    : empty('No hearts yet. Visitors add them with the heart button on a design.', 'heart'), true);

  const latest = `<div class="card">
    <div class="card-head"><div><h2>Latest inquiries</h2><p>The newest requests, whatever the period</p></div><a class="btn btn--outline btn--sm" href="#/requests">All requests</a></div>
    ${d.latest.length ? `<div class="table-wrap"><table class="table"><tbody>${d.latest.map(x => `
      <tr class="clickable" data-href="#/requests?id=${encodeURIComponent(x.id)}"><td><span class="cell-main">${esc(x.name)}</span><span class="cell-sub">${esc(requestLabel(x))} · prefers ${esc(x.contact_by === 'Phone call' ? 'a call' : x.contact_by)}</span></td>
      <td>${statusBadge(x.status)}</td><td class="muted hide-sm">${timeAgo(x.created_at)}</td></tr>`).join('')}</tbody></table></div>`
      : empty('No requests yet. They appear here as soon as a customer sends a consultation or quote request.', 'calendar')}
  </div>`;

  const items = [
    ...a.waitingLong.map(x => [`#/requests?id=${encodeURIComponent(x.id)}`, 'clock', `<b>${esc(x.name)}</b> is waiting for a first reply`, 'Sent ' + age(x.created_at) + ' ago']),
    ...a.stale.map(x => [`#/requests?id=${encodeURIComponent(x.id)}`, 'reset', `<b>${esc(x.name)}</b>: ${esc(STATUS_LABEL[x.status])}, no change since`, timeAgo(x.status_changed_at)]),
    ...a.meetingsSoon.map(x => [`#/requests?id=${encodeURIComponent(x.id)}`, 'calendar', `<b>${esc(x.name)}</b>: meeting scheduled`,
      "Customer's preferred date " + longDay.format(new Date(x.preferred_date + 'T12:00:00Z')) + (x.preferred_time ? ', ' + x.preferred_time : '')]),
    ...(d.site.unpublished ? [['#/dashboard', 'sparkle', 'Website changes are waiting to be published', 'Use Preview, then Publish']] : [])
  ];
  const more = (a.waitingLongCount > a.waitingLong.length ? a.waitingLongCount - a.waitingLong.length : 0)
    + (a.staleCount > a.stale.length ? a.staleCount - a.stale.length : 0);
  const attention = `<div class="card">
    <div class="card-head"><div><h2>Needs attention</h2><p>New for 2+ days, unchanged for 7+ days, meetings in the next 3 days</p></div></div>
    ${items.length ? `<ul class="list">${items.map(([href, ic, text, sub]) => `<li><a class="list-item attn" href="${href}">${icon(ic)}<span><span>${text}</span><small>${esc(sub)}</small></span></a></li>`).join('')}</ul>
      ${more ? `<p class="hint card-foot">And ${more} more in <a href="#/requests">Requests and quotes</a>.</p>` : ''}`
      : empty('Nothing needs attention right now.', 'check')}
  </div>`;

  const sources = card('How inquiries started', periodName, hasData
    ? hBars(merge(d.sources, key => SOURCE[key] || 'Other buttons'))
      + `<h3 class="sub-head">How they want to be contacted</h3>`
      + hBars(d.contactBy.map(x => ({ label: x.key === 'Phone call' ? 'Phone call' : x.key, count: x.count })))
    : empty('No inquiries in this period.', 'chat'), true);

  const missing = `<div class="card card--dashed">
    <div class="card-head"><div><h2>Not recorded yet</h2><p>These need information the website does not collect today</p></div></div>
    <div class="card-body">
      <ul class="missing">
        <li>${icon('bag')}<span><b>Sales and revenue.</b> Orders are agreed on WhatsApp, by phone or in person, so the website never sees them.</span></li>
        <li>${icon('sliders')}<span><b>Expenses and profit.</b> Costs and expenses are not entered anywhere yet.</span></li>
        <li>${icon('search')}<span><b>Website visits.</b> The website does not count visitors (the privacy page promises no visitor tracking).</span></li>
      </ul>
      <p class="hint">How these could be added, free of charge, is described in the business dashboard proposal (docs/BUSINESS-DASHBOARD-PROPOSAL.md).</p>
    </div>
  </div>`;

  return `${kpis}
    <div class="dash-grid">${overTime}${stand}</div>
    <div class="biz-three">${designs}${categories}${liked}</div>
    <div class="dash-grid">${latest}${attention}</div>
    <div class="dash-grid">${sources}${missing}</div>`;
}

function card(title, sub, inner) {
  return `<div class="card"><div class="card-head"><div><h2>${esc(title)}</h2>${sub ? `<p>${esc(sub)}</p>` : ''}</div></div><div class="card-body">${inner}</div></div>`;
}
