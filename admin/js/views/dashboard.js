/* Dashboard: a live overview from the database. */
import { rpc, img } from '../api.js';
import { esc, icon, loading, empty, timeAgo, statusBadge, requestLabel } from '../ui.js';

const ACTION = { insert: 'Added', update: 'Updated', delete: 'Deleted', publish: 'Published the website', status: 'Changed status' };
const ENTITY = { media: 'image', media_folders: 'folder', designs: 'design', collections: 'collection', spaces: 'room', site_content: 'page', admin_settings: 'setting', consultation_requests: 'request', site: '' };

export async function render(root) {
  root.innerHTML = loading();
  const d = await rpc('admin_dashboard');
  const r = d.requests;
  const site = d.site || {};
  root.innerHTML = `
    ${site.unpublished ? `<p class="notice notice--warn">${icon('sparkle')}<span>You have changes that are not live yet. Use <b>Preview</b> to check them and <b>Publish</b> to put them on the website.</span></p>` : ''}
    <div class="stats">
      <a class="stat" href="#/requests"><b>${r.total}</b><span>Requests and quotes</span></a>
      <a class="stat" href="#/requests?status=new"><b>${r.new}</b><span>New, not yet handled</span></a>
      <a class="stat" href="#/requests?status=pending"><b>${r.pending}</b><span>In progress</span></a>
      <a class="stat" href="#/requests?status=completed"><b>${r.completed}</b><span>Completed</span></a>
      <a class="stat" href="#/designs"><b>${d.likes}</b><span>Hearts on designs</span></a>
      <a class="stat" href="#/media"><b>${d.media}</b><span>Images in the library</span></a>
      <a class="stat" href="#/designs"><b>${d.designs}</b><span>Live designs</span></a>
      <a class="stat" href="#/spaces"><b>${d.spaces}</b><span>Live rooms</span></a>
    </div>
    <div class="dash-grid">
      <div class="stack" style="gap:20px">
        <div class="card">
          <div class="card-head"><div><h2>Latest requests</h2><p>${r.last7days} in the last 7 days</p></div><a class="btn btn--outline btn--sm" href="#/requests">All requests</a></div>
          ${d.latestRequests.length ? `<div class="table-wrap"><table class="table"><tbody>${d.latestRequests.map(x => `
            <tr class="clickable" data-href="#/requests?id=${encodeURIComponent(x.id)}"><td><span class="cell-main">${esc(x.name)}</span><span class="cell-sub">${esc(requestLabel(x))}</span></td>
            <td>${statusBadge(x.status)}</td><td class="muted hide-sm">${timeAgo(x.created_at)}</td></tr>`).join('')}</tbody></table></div>`
            : empty('No requests yet. They appear here as soon as a customer sends a consultation or quote request.', 'calendar')}
        </div>
        <div class="card">
          <div class="card-head"><h2>Recently added images</h2><a class="btn btn--outline btn--sm" href="#/media">Media library</a></div>
          <div class="card-body">${d.recentMedia.length ? `<div class="media-grid">${d.recentMedia.map(m => `<a class="media-card" href="#/media"><span class="ph"><img src="${esc(img(m))}" alt="" loading="lazy"></span><span class="meta"><b>${esc(m.title || 'Untitled')}</b><small>${timeAgo(m.created_at)}</small></span></a>`).join('')}</div>` : empty('No images yet.')}</div>
        </div>
      </div>
      <div class="stack" style="gap:20px">
        <div class="card">
          <div class="card-head"><h2>Website</h2></div>
          <div class="card-body"><dl class="kv">
            <dt>Status</dt><dd>${site.unpublished ? 'Changes waiting to be published' : 'Up to date'}</dd>
            <dt>Last published</dt><dd>${site.lastPublishedAt ? timeAgo(site.lastPublishedAt) : 'Never'}</dd>
            <dt>Collections</dt><dd>${d.collections} live</dd>
            <dt>Google Sheet</dt><dd>${d.lastSync ? (d.lastSync.ok === false ? 'Last sync failed ' + timeAgo(d.lastSync.started_at) : 'Synced ' + timeAgo(d.lastSync.finished_at || d.lastSync.started_at)) : 'Not connected yet'}</dd>
          </dl>
          ${d.recentSections.length ? `<p class="hint">Recently edited: ${d.recentSections.map(s => esc(s.area) + ' (' + timeAgo(s.updated_at) + ')').join(', ')}</p>` : ''}</div>
        </div>
        ${d.topLiked.length ? `<div class="card"><div class="card-head"><h2>Most saved designs</h2></div><ul class="list">${d.topLiked.map(x => `<li class="list-item"><span style="flex:1">${esc(x.name)} <span class="muted">${esc(x.ref)}</span></span><b>${x.count}</b></li>`).join('')}</ul></div>` : ''}
        <div class="card">
          <div class="card-head"><h2>Recent activity</h2></div>
          ${d.recentActivity.length ? `<ul class="list">${d.recentActivity.map(a => `<li class="list-item"><span style="flex:1">${esc(ACTION[a.action] || a.action)} ${esc(ENTITY[a.entity] ?? a.entity)}${a.label ? ': <b>' + esc(a.label) + '</b>' : ''}</span><time>${timeAgo(a.at)}</time></li>`).join('')}</ul>` : empty('Nothing yet. Changes you make in the portal are listed here.', 'clock')}
        </div>
      </div>
    </div>`;
  root.querySelectorAll('[data-href]').forEach(row => row.addEventListener('click', () => { location.hash = row.dataset.href; }));
}
