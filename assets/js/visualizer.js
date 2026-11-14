'use strict';

/* Room visualiser: places a fixture photo on a room photo, entirely in the browser.
   Nothing is uploaded. Depends on window.Luma from app.js. */
(function () {
  const Luma = window.Luma;
  if (!Luma) return;

  const $ = selector => document.querySelector(selector);
  const SAMPLE_ROOM = 'assets/img/hero/living.webp';

  const canvas = $('#visualCanvas'), ctx = canvas.getContext('2d');
  const categorySelect = $('#visualCategory'), fixtureSelect = $('#visualFixture');
  const scaleInput = $('#visualScale'), glowInput = $('#visualGlow');
  const status = $('#visualStatus'), download = $('#downloadVisualization'), fileInput = $('#fileInput');

  let roomBitmap = null, roomObjectUrl = '', fixtureCutout = null, fixtureKey = '';
  let point = { x: .5, y: .3 };
  const cutoutCache = new Map();

  // Removes the plain studio backdrop from a fixture photo by comparing each pixel with the photo's edges.
  function makeFixtureCutout(image, key) {
    if (cutoutCache.has(key)) return cutoutCache.get(key);
    const scale = Math.min(1, 480 / Math.max(image.naturalWidth, image.naturalHeight));
    const w = Math.max(1, Math.round(image.naturalWidth * scale)), h = Math.max(1, Math.round(image.naturalHeight * scale));
    const c = document.createElement('canvas'), cx = c.getContext('2d', { willReadFrequently: true });
    c.width = w; c.height = h;
    cx.drawImage(image, 0, 0, w, h);
    const data = cx.getImageData(0, 0, w, h), p = data.data;
    const threshold = key.startsWith('chandeliers') ? 30 : 32, low = threshold * threshold, high = 76 * 76;
    for (let y = 0; y < h; y++) {
      const left = (y * w) * 4, right = (y * w + w - 1) * 4;
      for (let x = 0; x < w; x++) {
        const q = (y * w + x) * 4, top = x * 4, bottom = ((h - 1) * w + x) * 4;
        const br = (p[top] + p[bottom] + p[left] + p[right]) / 4;
        const bg = (p[top + 1] + p[bottom + 1] + p[left + 1] + p[right + 1]) / 4;
        const bb = (p[top + 2] + p[bottom + 2] + p[left + 2] + p[right + 2]) / 4;
        const dr = p[q] - br, dg = p[q + 1] - bg, db = p[q + 2] - bb, d2 = dr * dr + dg * dg + db * db;
        if (d2 < low) p[q + 3] = 0;
        else if (d2 < high) p[q + 3] = Math.round((Math.sqrt(d2) - threshold) / (76 - threshold) * 255);
      }
    }
    cx.putImageData(data, 0, 0);
    cutoutCache.set(key, c);
    return c;
  }

  function draw() {
    scaleInput.previousElementSibling.querySelector('output').value = scaleInput.value + '%';
    glowInput.previousElementSibling.querySelector('output').value = glowInput.value + '%';
    if (!roomBitmap) return;

    const fit = Math.min(1920 / roomBitmap.naturalWidth, 1);
    canvas.width = Math.round(roomBitmap.naturalWidth * fit);
    canvas.height = Math.round(roomBitmap.naturalHeight * fit);
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(roomBitmap, 0, 0, w, h);

    const x = point.x * w, y = point.y * h;
    const size = Math.min(w, h) * (+scaleInput.value / 100), intensity = +glowInput.value / 100;

    if (intensity > 0) {
      const glow = ctx.createRadialGradient(x, y, 1, x, y, size * (1.5 + intensity * 2));
      glow.addColorStop(0, 'rgba(255,205,127,' + (intensity * .42) + ')');
      glow.addColorStop(.35, 'rgba(255,190,105,' + (intensity * .22) + ')');
      glow.addColorStop(1, 'rgba(255,180,85,0)');
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    if (fixtureCutout) {
      const ratio = fixtureCutout.width / fixtureCutout.height;
      const iw = ratio >= 1 ? size : size * ratio, ih = ratio >= 1 ? size / ratio : size;
      const ix = Math.max(0, Math.min(w - iw, x - iw / 2)), iy = Math.max(0, Math.min(h - ih, y - ih / 2));
      ctx.save();
      ctx.globalAlpha = .94;
      ctx.shadowColor = 'rgba(30,20,10,.35)';
      ctx.shadowBlur = Math.max(8, size * .08);
      ctx.drawImage(fixtureCutout, ix, iy, iw, ih);
      ctx.restore();
    }
  }

  function loadFixture(key, index) {
    const id = key + ':' + index;
    if (fixtureKey === id && fixtureCutout) return;
    fixtureKey = id;
    const img = new Image();
    img.onload = () => { if (fixtureKey === id) { fixtureCutout = makeFixtureCutout(img, id); draw(); } };
    img.src = Luma.fixtureImage(key, index, true);
  }

  function populateFixtures(selectedIndex) {
    const key = categorySelect.value;
    fixtureSelect.innerHTML = Luma.catalog[key].items.map((name, i) => '<option value="' + i + '">' + Luma.escape(name) + '</option>').join('');
    if (selectedIndex != null) fixtureSelect.value = String(selectedIndex);
    loadFixture(key, +fixtureSelect.value);
  }

  function setRoom(image, message) {
    roomBitmap = image;
    canvas.hidden = false;
    $('#visualStage').classList.add('has-room');
    $('#visualEmpty').hidden = true;
    $('#visualHint').hidden = false;
    download.disabled = false;
    status.textContent = message;
    draw();
  }

  function loadSampleRoom() {
    status.textContent = 'Loading the sample room…';
    const img = new Image();
    img.onload = () => {
      point = { x: .52, y: .22 };
      setRoom(img, 'Sample room loaded. Click the photo to move the light, then try your own room.');
    };
    img.onerror = () => { status.textContent = 'The sample room could not load. Check your connection and try again.'; };
    img.src = SAMPLE_ROOM;
  }

  // Used by app.js: the lamp designer and the details dialog keep this tool in step.
  window.setVisualFixture = function (key, index) {
    categorySelect.value = key;
    populateFixtures(index);
  };
  window.syncVisualChoice = function () {
    const b = window.lumaBuild;
    window.setVisualFixture(b.fixtureCategory, b.fixtureIndex);
  };

  categorySelect.addEventListener('change', () => populateFixtures());
  fixtureSelect.addEventListener('change', () => loadFixture(categorySelect.value, +fixtureSelect.value));
  scaleInput.addEventListener('input', draw);
  glowInput.addEventListener('input', draw);

  fileInput.addEventListener('change', e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { status.textContent = 'Please choose a JPG, PNG or WEBP photo.'; return; }
    if (file.size > 20 * 1024 * 1024) { status.textContent = 'Please choose a photo smaller than 20 MB.'; return; }
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      if (roomObjectUrl) URL.revokeObjectURL(roomObjectUrl);
      roomObjectUrl = url;
      point = { x: .5, y: .3 };
      setRoom(img, 'Photo loaded. Click where you want the light to go.');
    };
    img.onerror = () => { URL.revokeObjectURL(url); status.textContent = 'This photo could not be opened. Try a JPG, PNG or WEBP file.'; };
    img.src = url;
  });

  document.querySelectorAll('[data-pick-room]').forEach(button => button.addEventListener('click', () => fileInput.click()));
  document.querySelectorAll('[data-sample-room]').forEach(button => button.addEventListener('click', loadSampleRoom));

  canvas.addEventListener('click', e => {
    if (!roomBitmap) return;
    const r = canvas.getBoundingClientRect();
    point = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
    draw();
    status.textContent = 'Light moved. Download the image when you are happy with it.';
  });

  download.addEventListener('click', () => {
    if (!roomBitmap) return;
    canvas.toBlob(blob => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'lumadesign-room-preview.png';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      Luma.toast('Room preview downloaded');
    }, 'image/png');
  });

  $('#addVisualToCart').addEventListener('click', () => {
    Luma.addToSelection(Luma.fixtureCartItem(categorySelect.value, +fixtureSelect.value));
  });

  window.syncVisualChoice();
  draw();
})();
