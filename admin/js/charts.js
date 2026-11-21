/* Small charts for the Business dashboard, drawn with plain HTML and one SVG line, so text stays
   readable at every screen width. No chart library; colours come from admin.css. */
import { esc, icon } from './ui.js';

const num = n => Number(n || 0).toLocaleString('en-GB');

// The top of the scale: an even number, so the middle line is a whole number too.
function scaleTop(max) {
  for (const step of [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000]) if (step * 2 >= max) return step * 2;
  return Math.ceil(max / 2000) * 2000;
}

/* Columns for this period, with the previous period as a dashed line.
   points: [{ label, tip, count, prev }] (prev is null when there is no comparison). */
export function columnChart(points, { summary = '', prevLabel = 'Previous period' } = {}) {
  const showPrev = points.some(p => p.prev !== null && p.prev !== undefined);
  const top = scaleTop(Math.max(1, ...points.map(p => Math.max(p.count, showPrev ? p.prev || 0 : 0))));
  const n = points.length;
  const pct = v => (v / top) * 100;
  const cols = points.map(p => `<span class="col" title="${esc(p.tip + ': ' + num(p.count) + (showPrev ? ' (previous: ' + num(p.prev) + ')' : ''))}">`
    + `<i style="height:${pct(p.count).toFixed(2)}%"></i></span>`).join('');
  const line = showPrev && n > 1
    ? `<svg class="colchart-prev" viewBox="0 0 ${n} 100" preserveAspectRatio="none" aria-hidden="true"><polyline points="${
      points.map((p, i) => `${i + 0.5},${(100 - pct(p.prev || 0)).toFixed(2)}`).join(' ')}" vector-effect="non-scaling-stroke"/></svg>` : '';
  const ticks = n > 2 ? [0, Math.floor((n - 1) / 2), n - 1] : points.map((_, i) => i);
  const xLabels = ticks.map((i, k) => `<span class="${k === 0 ? 'x-first' : k === ticks.length - 1 ? 'x-last' : 'x-mid'}">${esc(points[i].label)}</span>`).join('');
  return `<figure class="colchart" role="img" aria-label="${esc(summary)}">
    <div class="colchart-plot">
      <span class="grid-line" style="bottom:100%"><b>${num(top)}</b></span>
      <span class="grid-line" style="bottom:50%"><b>${num(top / 2)}</b></span>
      <span class="grid-line grid-line--base" style="bottom:0"><b>0</b></span>
      <div class="colchart-bars" style="--gap:${n > 40 ? 1 : 2}px">${cols}</div>${line}
    </div>
    <div class="colchart-x">${xLabels}</div>
    <figcaption class="chart-legend"><span><i class="key key--bar"></i>This period</span>${showPrev ? `<span><i class="key key--line"></i>${esc(prevLabel)}</span>` : ''}</figcaption>
  </figure>`;
}

/* Horizontal bars, one row each: name (and a small note), the count, and a bar to compare.
   items: [{ label, note?, count, href? }]. Bars are scaled to the largest count in the list. */
export function hBars(items, { scale } = {}) {
  const max = Math.max(1, scale || 0, ...items.map(i => i.count));
  return `<ul class="hbars">${items.map(i => {
    const inner = `<span class="hbar-text"><span class="hbar-label">${esc(i.label)}${i.note ? ` <small>${esc(i.note)}</small>` : ''}</span><b>${num(i.count)}${i.href ? icon('chevron-right') : ''}</b></span>`
      + `<span class="hbar-track"><i style="width:${Math.max(1.5, (i.count / max) * 100).toFixed(2)}%"></i></span>`;
    return `<li>${i.href ? `<a class="hbar" href="${esc(i.href)}">${inner}</a>` : `<div class="hbar">${inner}</div>`}</li>`;
  }).join('')}</ul>`;
}

/* One bar split into parts, with a legend that names every part and its count.
   parts: [{ key, label, count, href? }]; each part is coloured by the class seg--<key>.
   A part with an href (and a count) becomes a link in the legend. */
export function stackedBar(parts, { summary = '' } = {}) {
  const shown = parts.filter(p => p.count > 0);
  const total = shown.reduce((s, p) => s + p.count, 0);
  return `<figure class="stackbar" role="img" aria-label="${esc(summary)}">
    <div class="stackbar-bar">${shown.map(p => `<span class="seg seg--${esc(p.key)}" style="flex-grow:${p.count}" title="${esc(p.label + ': ' + num(p.count) + ' (' + Math.round(p.count / total * 100) + '%)')}"></span>`).join('')}</div>
    <figcaption class="chart-legend chart-legend--wrap">${parts.map(p => {
      const inner = `<i class="key seg--${esc(p.key)}"></i>${esc(p.label)} <b>${num(p.count)}</b>`;
      return p.href && p.count ? `<a class="legend-link" href="${esc(p.href)}">${inner}${icon('chevron-right')}</a>` : `<span>${inner}</span>`;
    }).join('')}</figcaption>
  </figure>`;
}
