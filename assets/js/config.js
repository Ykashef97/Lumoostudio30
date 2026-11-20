/* =====================================================================
   LUMADESIGN SETTINGS
   This is the only file you need to edit for contact details, prices and
   where consultation requests are sent. Change only the text between the
   quote marks, keep every comma and bracket, then save.
   ===================================================================== */

// How customers reach you. Leave a value empty ('') to hide it on the site.
export const LUMA_CONTACT = {
  phone: '01093244530',      // shown on the site and used by the Call button
  whatsapp: '201093244530',  // digits only, country code first (Egypt = 20), no "+"
  email: '',                 // e.g. 'hello@lumadesign.com'
  instagram: '',             // full link, e.g. 'https://www.instagram.com/yourname'
  tiktok: '',                // full link, e.g. 'https://www.tiktok.com/@yourname'
  city: '',                  // e.g. 'Cairo, Egypt'
  hours: ''                  // e.g. 'Sat–Thu, 10:00–18:00'
};

// Estimate shown in the lamp designer.
export const LUMA_PRICING = {
  currency: 'EGP',
  shade: { 19: 799, 33: 1299, 42: 1599 }, // by width in cm
  cord: 750,                               // not added for ceiling lights, which need no cord
  bulbs: 399
};

// Where consultation requests are sent.
// endpoint:    the Google Sheet web-app link (see docs/CONSULTATION-REQUESTS-SETUP.md).
//              While it is empty, requests are handed to WhatsApp instead.
// calendarUrl: optional booking-calendar link (Google Calendar booking page, Cal.com, Calendly).
//              When set, the confirmation also offers "Pick a time now".
export const LUMA_REQUESTS = {
  endpoint: '',
  calendarUrl: ''
};

// Optional details per design, shown in the details dialog.
// Key is "<category>:<position starting at 0>", for example:
//   'sconces:0': { price: 'EGP 1,450', size: '12 × 25 cm', material: 'Powder-coated steel', leadTime: '2–3 weeks' }
export const styleSpecs = {};
