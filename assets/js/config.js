/* Contact details, designer prices and the booking link.
   These are edited in the admin portal (Contact Us and Settings), not here. This file only
   turns the published content into the values the page scripts use. */
import { SITE, pageContent } from './content.js';

const c = pageContent('contact');
const settings = SITE.settings || {};
const pricing = settings.pricing || {};

export const LUMA_CONTACT = {
  phone: c.phone || '',
  whatsapp: c.whatsapp || '',
  email: c.email || '',
  instagram: c.instagram || '',
  tiktok: c.tiktok || '',
  city: c.city || '',
  hours: c.hours || '',
  social: Array.isArray(c.social) ? c.social.filter(s => s && s.label && /^https:\/\//.test(s.url || '')) : []
};

export const LUMA_PRICING = {
  // Prices are shown only after the owners switch them on in Settings, so sample figures never appear.
  show: pricing.show === true,
  currency: pricing.currency || 'EGP',
  shade: { 19: 0, 33: 0, 42: 0, ...(pricing.shade || {}) },
  cord: Number(pricing.cord) || 0,
  bulbs: Number(pricing.bulbs) || 0
};

// Room Studio (3D lights in the customer's room photo): on unless switched off in Settings.
const roomSettings = settings.roomStudio || {};
export const LUMA_ROOM = {
  enabled: roomSettings.enabled !== false,
  evening: Number.isFinite(Number(roomSettings.evening)) && roomSettings.evening !== '' ? Number(roomSettings.evening) : 0.35
};

export const LUMA_REQUESTS = {
  calendarUrl: settings.calendarUrl || ''
};
