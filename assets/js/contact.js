/* Contact page: fills in the details from config.js, so they only need changing in one place. */
import { LUMA_CONTACT } from './config.js';
import { $, icon, escapeLuma, contact, social } from './core.js';

const greeting = 'Hello LumaDesign, I have a question about lighting for my space.';

if (contact.whatsappDigits) {
  $('#waLink').href = contact.whatsappHref(greeting);
  $('#waNumber').textContent = contact.phoneDisplay || '+' + contact.whatsappDigits;
} else {
  $('#waCard').hidden = true;
}

if (contact.telHref) {
  $('#callLink').href = contact.telHref;
  $('#phoneNumber').textContent = contact.phoneDisplay;
} else {
  $('#callCard').hidden = true;
}

// Social links appear greyed with "Coming soon" until their link is added in config.js.
$('#socialRow').innerHTML = social.map(s => s.url
  ? '<a class="social-btn" href="' + escapeLuma(s.url) + '" target="_blank" rel="noopener">' + icon(s.id) + s.label + '</a>'
  : '<span class="social-btn" aria-disabled="true">' + icon(s.id) + s.label + ' <small>Coming soon</small></span>'
).join('');

const details = [
  LUMA_CONTACT.email && '<li>' + icon('mail') + '<a href="mailto:' + escapeLuma(LUMA_CONTACT.email) + '">' + escapeLuma(LUMA_CONTACT.email) + '</a></li>',
  LUMA_CONTACT.city && '<li>' + icon('pin') + escapeLuma(LUMA_CONTACT.city) + '</li>',
  LUMA_CONTACT.hours && '<li>' + icon('clock') + escapeLuma(LUMA_CONTACT.hours) + '</li>'
].filter(Boolean);
$('#contactDetails').innerHTML = details.join('');
$('#contactDetails').hidden = !details.length;
