/* Turns a media record into an image address. Shared by the website and the admin portal.
   Photos that ship with the website ('site') are served from GitHub Pages; photos uploaded in the
   admin portal ('storage') are served from the Supabase media bucket. */
import { SUPABASE_URL } from './backend.js';

// size: 'full', 'medium' or 'thumb'. siteBase: prefix for website photos ('../' from the admin portal).
export function mediaUrl(media, size = 'full', siteBase = '') {
  if (!media) return '';
  const medium = media.medium || media.medium_path;
  const thumb = media.thumb || media.thumb_path;
  const path = size === 'thumb' ? (thumb || medium || media.path) : size === 'medium' ? (medium || media.path) : media.path;
  if (!path) return '';
  if (media.source === 'storage') {
    return SUPABASE_URL + '/storage/v1/object/public/media/' + path.split('/').map(encodeURIComponent).join('/');
  }
  return siteBase + path;
}

// "50% 30%" from a focal point [x, y] (0–1), for CSS object-position.
export function focalPosition(focal) {
  const [x, y] = Array.isArray(focal) ? focal : [0.5, 0.5];
  return Math.round((x ?? 0.5) * 100) + '% ' + Math.round((y ?? 0.5) * 100) + '%';
}
