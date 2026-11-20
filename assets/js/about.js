/* About page: shared header and dialogs come from core.js; the photo strip gets matching backdrops. */
import { $$, applyTone } from './core.js';

$$('[data-tone]').forEach(link => {
  const [key, index] = link.dataset.tone.split(':');
  applyTone(link, key, +index);
});
