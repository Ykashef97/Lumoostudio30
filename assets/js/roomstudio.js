/* Room Studio: place our 3D lamps in a photo of the customer's own room.
   Loaded on demand by home.js. Everything runs in the visitor's browser; nothing is uploaded
   unless they choose to send their design with a consultation request.

   How it works
   - Normal photo: the customer drags two lines (where the ceiling and the floor meet the back
     wall) and confirms the ceiling and camera heights. From that we rebuild the camera and a
     simple box room behind the photo. The photo is projected back onto the box, so the first
     view is exactly the photo, and lamps can be placed on the ceiling and walls in perspective.
     The view can turn a little (not 360°: a normal photo only shows part of the room).
   - 360° photo (2:1 equirectangular): shown all the way round; the customer sizes a box room
     to match the walls.
   - Light: each lamp adds a warm or cool pool of light to the room's surfaces; an "evening"
     control dims the room. It is a believable preview, not a physical light calculation. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeMaterials, applyFinish, buildLampModel, disposeGroup } from './lamp3d.js';
import { CATEGORY, CATEGORY_ORDER, styleCatalog, fixtureImage, fixtureModel, fixtureFinish, cordFor, refCode, parsePick, FINISH } from './catalog.js';
import { $, $$, icon, escapeLuma, toast, openConsultation } from './core.js';
import { LUMA_ROOM } from './config.js';

const MAX_LAMPS = 8;
const SIZES = [19, 33, 42];
const KELVINS = [[2700, 'Warm'], [3000, 'Soft white'], [4000, 'Neutral']];
/* How a white wall looks under each light colour (sRGB). Slightly further apart than the true colours,
   so the choice reads on a phone screen; 4000 K looks close to white, as the eye adapts to it. */
const LIGHT_TINT = { 2700: '#ffb46b', 3000: '#ffcb8e', 4000: '#ffeedd' };
const LENSES = { normal: 26, wide: 14 };      // 35 mm-equivalent focal lengths of phone cameras
const SAMPLE = {
  src: 'assets/img/hero/living.webp',
  calib: { ceil: [[0.36, 0.03], [0.98, 0.03]], floor: [[0.36, 0.745], [0.98, 0.735]], ceilH: 3.0, camH: 1.15, lens: 'normal' }
};
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));

/* =====================================================================
   SMALL HELPERS
   ===================================================================== */

// Colour of a light source at a colour temperature (approximation, good from 1,000 to 10,000 K).
// Values are display (sRGB) colours, converted to the renderer's linear colour space.
function kelvinColor(k) {
  if (LIGHT_TINT[k]) return new THREE.Color(LIGHT_TINT[k]);
  const t = k / 100;
  let r, g, b;
  if (t <= 66) { r = 255; g = 99.47 * Math.log(t) - 161.12; b = t <= 19 ? 0 : 138.52 * Math.log(t - 10) - 305.04; }
  else { r = 329.7 * Math.pow(t - 60, -0.1332); g = 288.12 * Math.pow(t - 60, -0.0755); b = 255; }
  return new THREE.Color().setRGB(clamp(r, 0, 255) / 255, clamp(g, 0, 255) / 255, clamp(b, 0, 255) / 255, THREE.SRGBColorSpace);
}

// 35 mm-equivalent focal length from a JPEG's EXIF data (tag 0xA405), or null.
function exifFocal35(buffer) {
  try {
    const view = new DataView(buffer);
    if (view.getUint16(0) !== 0xFFD8) return null;
    let offset = 2;
    while (offset < view.byteLength - 4) {
      const marker = view.getUint16(offset), size = view.getUint16(offset + 2);
      if (marker === 0xFFE1 && view.getUint32(offset + 4) === 0x45786966) {
        const tiff = offset + 10, little = view.getUint16(tiff) === 0x4949;
        const u16 = o => view.getUint16(o, little), u32 = o => view.getUint32(o, little);
        const findTag = (ifd, tag) => {
          const count = u16(ifd);
          for (let i = 0; i < count; i++) {
            const entry = ifd + 2 + i * 12;
            if (u16(entry) === tag) return entry;
          }
          return null;
        };
        const ifd0 = tiff + u32(tiff + 4);
        const exifPtr = findTag(ifd0, 0x8769);
        if (!exifPtr) return null;
        const exifIfd = tiff + u32(exifPtr + 8);
        const f35 = findTag(exifIfd, 0xA405);
        return f35 ? u16(f35 + 8) || null : null;
      }
      if ((marker & 0xFF00) !== 0xFF00) break;
      offset += 2 + size;
    }
  } catch (e) { /* no usable EXIF */ }
  return null;
}

// Loads a picture file (or URL) into a canvas no larger than `max` pixels on its longest side.
async function loadPicture(source, max) {
  let bitmap;
  if (typeof source === 'string') {
    const blob = await (await fetch(source)).blob();
    bitmap = await createImageBitmap(blob);
  } else {
    bitmap = await createImageBitmap(source, { imageOrientation: 'from-image' });
  }
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close && bitmap.close();
  return canvas;
}

const canvasBlob = (canvas, type = 'image/jpeg', quality = 0.88) =>
  new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Could not save the picture.'))), type, quality));

/* ---------- Saved rooms, kept in this browser (IndexedDB) ---------- */
const DB_NAME = 'lumaRooms', STORE = 'rooms';
function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function dbDo(mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode), store = tx.objectStore(STORE);
    const req = fn(store);
    tx.oncomplete = () => { db.close(); resolve(req && req.result); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
export const savedRooms = () => dbDo('readonly', s => s.getAll()).catch(() => []);

/* =====================================================================
   THE ROOM SHADER: the photo projected onto the room's walls, plus lamp light
   ===================================================================== */

const roomVertex = `
varying vec3 vWorld;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const roomFragment = `
uniform sampler2D uPhoto;
uniform mat4 uPhotoVP;
uniform int uMode;
uniform vec3 uCam;
uniform float uYaw;
uniform vec3 uNormal;
uniform float uEvening;
uniform vec3 uAmbient;
uniform int uCount;
uniform vec3 uLampPos[${MAX_LAMPS}];
uniform vec3 uLampColor[${MAX_LAMPS}];
uniform float uLampPower[${MAX_LAMPS}];
uniform float uLampKind[${MAX_LAMPS}];
uniform vec3 uMountPos[${MAX_LAMPS}];
uniform float uMountR[${MAX_LAMPS}];
varying vec3 vWorld;

vec3 photoColour() {
  vec3 col = vec3(0.0);
  if (uMode == 0) {
    vec4 c = uPhotoVP * vec4(vWorld, 1.0);
    vec2 uv = c.xy / c.w * 0.5 + 0.5;
    bool inside = c.w > 0.0 && uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0;
    col = texture2D(uPhoto, clamp(uv, 0.002, 0.998)).rgb;
    if (!inside) {
      float g = dot(col, vec3(0.3, 0.59, 0.11));
      col = mix(col, vec3(g), 0.5) * 0.5;   // outside the photo: a muted extension of its edge
    }
  } else {
    vec3 d = normalize(vWorld - uCam);
    float cs = cos(uYaw), sn = sin(uYaw);
    d = vec3(cs * d.x - sn * d.z, d.y, sn * d.x + cs * d.z);
    float u = 0.5 + atan(d.x, -d.z) / 6.2831853;
    float v = acos(clamp(d.y, -1.0, 1.0)) / 3.1415927;
    col = texture2D(uPhoto, vec2(u, 1.0 - v)).rgb;
  }
  return col;
}

void main() {
  vec3 albedo = photoColour();
  // Daylight, dimmed in the evening and tinted by the lamps' colour as their light fills the room.
  vec3 light = vec3(1.0 - uEvening * 0.8) * uAmbient;
  for (int i = 0; i < ${MAX_LAMPS}; i++) {
    if (i >= uCount) break;
    vec3 L = uLampPos[i] - vWorld;
    float d = max(length(L), 0.05);
    vec3 l = L / d;
    float ndl = max(dot(uNormal, l), 0.0);
    // Hanging and ceiling lights send most light down; wall lights wash up and down the wall.
    float dirW = uLampKind[i] > 0.5 ? 0.25 + 0.75 * max(l.y, 0.0) : 0.45 + 0.55 * abs(l.y);
    float fall = 1.0 / (1.0 + d * d * 0.35);
    light += uLampColor[i] * uLampPower[i] * ndl * fall * dirW * (0.6 + uEvening * 1.4);
    // A soft contact shadow where the fitting touches the ceiling or wall.
    float m = length(vWorld - uMountPos[i]);
    light *= 1.0 - 0.18 * (1.0 - smoothstep(0.0, uMountR[i], m));
  }
  gl_FragColor = vec4(albedo * light, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

// A flat four-corner surface (corners in order around the edge).
function quad(a, b, c, d) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([...a.toArray(), ...b.toArray(), ...c.toArray(), ...d.toArray()], 3));
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  geo.computeBoundingSphere();
  return geo;
}

/* =====================================================================
   THE STUDIO
   ===================================================================== */

let studio = null;      // one per page
let pending = null;     // a design chosen elsewhere ("Try it in your room") before a room is loaded

// Called from home.js. action: { file } | { sample: true } | { saved: id } | { arm: {key,index,size?,finish?,cord?} }
export async function roomStudio(action) {
  if (!studio) studio = createStudio($('#roomStudio'));
  if (action.arm) {
    if (studio.hasRoom()) studio.arm(action.arm); else { pending = action.arm; studio.showStart(); toast('Choose a room photo first, then tap where the light should go'); }
    return;
  }
  if (action.file) await studio.loadFile(action.file);
  else if (action.sample) await studio.loadSample();
  else if (action.saved) await studio.openSaved(action.saved);
}

function createStudio(root) {
  const start = $('#rsStart', root), work = $('#rsWork', root);
  work.innerHTML = workMarkup();
  const host = $('#rsCanvas', work), guides = $('#rsGuides', work), stageBox = $('#rsStage', work);

  /* ---------- Renderer and scene ---------- */
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  host.appendChild(renderer.domElement);
  const maxTexture = renderer.capabilities.maxTextureSize || 4096;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const neutralEnv = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = neutralEnv;
  const hemi = new THREE.HemisphereLight(0xfff6ea, 0x6d6457, 0.9);
  scene.add(hemi);

  const camera = new THREE.PerspectiveCamera(60, 1, 0.02, 200);
  camera.rotation.order = 'YXZ';
  const photoCam = new THREE.PerspectiveCamera(60, 1, 0.02, 200);   // the camera that took the photo
  photoCam.rotation.order = 'YXZ';

  const shared = {
    uPhoto: { value: null }, uPhotoVP: { value: new THREE.Matrix4() }, uMode: { value: 0 }, uCam: { value: new THREE.Vector3() },
    uYaw: { value: 0 }, uEvening: { value: 0.35 }, uAmbient: { value: new THREE.Color(1, 1, 1) }, uCount: { value: 0 },
    uLampPos: { value: Array.from({ length: MAX_LAMPS }, () => new THREE.Vector3()) },
    uLampColor: { value: Array.from({ length: MAX_LAMPS }, () => new THREE.Color()) },
    uLampPower: { value: new Array(MAX_LAMPS).fill(0) },
    uLampKind: { value: new Array(MAX_LAMPS).fill(1) },
    uMountPos: { value: Array.from({ length: MAX_LAMPS }, () => new THREE.Vector3(0, -99, 0)) },
    uMountR: { value: new Array(MAX_LAMPS).fill(0.1) }
  };
  const roomGroup = new THREE.Group(), lampGroup = new THREE.Group(), lineGroup = new THREE.Group();
  scene.add(roomGroup, lampGroup, lineGroup);
  let surfaces = [];      // [{mesh, kind:'floor'|'ceiling'|'wall', plane, normal, bounds}]
  let photoTexture = null, envTexture = null;

  /* ---------- State ---------- */
  const room = {
    mode: 'photo', image: null, imageBlob: null, focal35: null, name: '',
    calib: { ceil: [[0.03, 0.2], [0.97, 0.2]], floor: [[0.03, 0.8], [0.97, 0.8]], ceilH: 2.8, camH: 1.5, lens: 'normal', pitch: 0 },
    pano: { width: 4, length: 5, yaw: 0, ceilH: 2.8, camH: 1.5 },
    box: null,               // solved room: { P1, P2, u, n, depth, H }
    evening: 0.35, calibrating: true, savedId: null
  };
  let lamps = [];            // [{ id, ref, key, index, name, mount, size, finish, cord, pos:{x,y,z}, normal:{x,z}, rot, drop, kelvin, brightness, obj }]
  let selected = null, armed = null;
  let selTab = 'style';    // open tab of the selected light's settings (style, place, light)
  const view = { yaw: 0, pitch: 0, zoom: 1 };
  const history = [], future = [];

  /* =====================================================================
     ROOM GEOMETRY
     ===================================================================== */

  function lensFocal() {
    if (room.calib.lens === 'custom' && room.calib.focal) return room.calib.focal;
    return room.focal35 && room.calib.lens === 'auto' ? room.focal35 : LENSES[room.calib.lens] || LENSES.normal;
  }

  // One photo cannot tell how far away the back wall is: that depends on the lens. When the
  // customer tells us the distance, find the lens (35 mm-equivalent focal length) that gives it.
  function fitDistance(target) {
    const keep = { lens: room.calib.lens, focal: room.calib.focal };
    let lo = 8, hi = 90, best = null;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      room.calib.lens = 'custom'; room.calib.focal = mid;
      const s = solvePhotoRoom();
      if (!s) { hi = mid; continue; }
      const d = s.depth - 1.5;
      best = mid;
      if (d > target) hi = mid; else lo = mid;
    }
    if (!best) { room.calib.lens = keep.lens; room.calib.focal = keep.focal; return false; }
    room.calib.focal = Math.round(best * 10) / 10;
    return true;
  }

  // Sets up a camera for the photo with pitch `pitch` (radians, up is positive).
  function setPhotoCamera(cam, pitch) {
    const w = room.image.width, h = room.image.height;
    const diagFov = 2 * Math.atan(43.27 / (2 * lensFocal()));
    const fPx = Math.hypot(w, h) / 2 / Math.tan(diagFov / 2);
    cam.fov = THREE.MathUtils.radToDeg(2 * Math.atan(h / 2 / fPx));
    cam.aspect = w / h;
    cam.zoom = 1;
    cam.position.set(0, room.calib.camH, 0);
    cam.rotation.set(pitch, 0, 0);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld(true);
  }

  const _ray = new THREE.Raycaster(), _ndc = new THREE.Vector2(), _v = new THREE.Vector3();
  function rayFrom(cam, [u, v]) {
    _ndc.set(u * 2 - 1, 1 - v * 2);
    _ray.setFromCamera(_ndc, cam);
    return _ray.ray.clone();
  }

  // Finds the camera tilt that makes the ceiling line sit at the given ceiling height on the
  // wall defined by the floor line. Returns the solved room, or null if the lines do not fit.
  function solvePhotoRoom() {
    const c = room.calib, H = c.ceilH, cam = photoCam;
    const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const tryPitch = pitch => {
      setPhotoCamera(cam, pitch);
      const P = c.floor.map(pt => rayFrom(cam, pt).intersectPlane(floorPlane, new THREE.Vector3()));
      if (P.some(p => !p) || P[0].distanceTo(P[1]) < 0.3) return null;
      const u = new THREE.Vector3().subVectors(P[1], P[0]).setY(0).normalize();
      let n = new THREE.Vector3(-u.z, 0, u.x);
      if (n.dot(new THREE.Vector3().subVectors(cam.position, P[0]).setY(0)) < 0) n.negate();
      const wall = new THREE.Plane().setFromNormalAndCoplanarPoint(n, P[0]);
      const heights = c.ceil.map(pt => { const hit = rayFrom(cam, pt).intersectPlane(wall, new THREE.Vector3()); return hit ? hit.y : null; });
      if (heights.some(y => y === null)) return null;
      const err = heights.reduce((a, y) => a + (y - H) ** 2, 0);
      return { err, P1: P[0], P2: P[1], u, n, pitch };
    };
    let best = null;
    for (let p = -0.75; p <= 0.75; p += 0.01) { const r = tryPitch(p); if (r && (!best || r.err < best.err)) best = r; }
    if (!best) return null;
    let lo = best.pitch - 0.01, hi = best.pitch + 0.01;
    for (let i = 0; i < 24; i++) {
      const a = lo + (hi - lo) * 0.382, b = lo + (hi - lo) * 0.618;
      const ra = tryPitch(a), rb = tryPitch(b);
      if (ra && (!rb || ra.err < rb.err)) hi = b; else lo = a;
    }
    best = tryPitch((lo + hi) / 2) || best;
    setPhotoCamera(cam, best.pitch);
    const camXZ = new THREE.Vector3(0, 0, 0);
    const distToWall = new THREE.Vector3().subVectors(camXZ, best.P1).setY(0).dot(best.n);
    if (distToWall < 0.5) return null;
    const box = { ...best, H, depth: distToWall + 1.5, fit: Math.sqrt(best.err / 2) };
    box.seen = box.P1.distanceTo(box.P2);
    extendPastEdges(box);
    return box;
  }

  // A dot on the edge of the photo is not a corner: the wall carries on past the picture. Move
  // that end of the room outwards until its side wall is out of view, so the box does not cut
  // through the visible ceiling and lights can go anywhere the customer can see.
  function extendPastEdges(b) {
    const c = room.calib, edge = 0.04;
    const atEdge = i => [c.floor[i], c.ceil[i]].some(([u]) => u <= edge || u >= 1 - edge);
    const visible = P => {
      for (let t = 0; t <= b.depth; t += 0.25) for (const y of [0, b.H / 2, b.H]) {
        const q = P.clone().addScaledVector(b.n, t).setY(y).project(photoCam);
        if (q.z < 1 && Math.abs(q.x) <= 1.02 && Math.abs(q.y) <= 1.02) return true;
      }
      return false;
    };
    b.open = [false, false];
    [[0, 'P1', -1], [1, 'P2', 1]].forEach(([i, key, dir]) => {
      if (!atEdge(i)) return;
      b.open[i] = true;
      for (let s = 0; s < 25 && visible(b[key]); s += 0.25) b[key].addScaledVector(b.u, dir * 0.25);
    });
  }

  function panoBox() {
    const p = room.pano, w = p.width, l = p.length;
    const P1 = new THREE.Vector3(-w / 2, 0, -l / 2), P2 = new THREE.Vector3(w / 2, 0, -l / 2);
    return { P1, P2, u: new THREE.Vector3(1, 0, 0), n: new THREE.Vector3(0, 0, 1), H: p.ceilH, depth: l, fit: 0 };
  }

  function buildRoom() {
    roomGroup.children.slice().forEach(m => { m.geometry.dispose(); m.material.dispose(); roomGroup.remove(m); });
    lineGroup.children.slice().forEach(m => { m.geometry.dispose(); lineGroup.remove(m); });
    surfaces = [];
    const b = room.box; if (!b) return;
    const { P1, P2, u, n, H, depth } = b;
    const up = new THREE.Vector3(0, H, 0), far = n.clone().multiplyScalar(depth);
    const pt = (base, ...adds) => adds.reduce((p, a) => p.add(a), base.clone());
    const F1 = P1.clone(), F2 = P2.clone(), F3 = pt(P2, far), F4 = pt(P1, far);
    const C1 = pt(P1, up), C2 = pt(P2, up), C3 = pt(P2, far, up), C4 = pt(P1, far, up);
    const defs = [
      ['floor', quad(F1, F2, F3, F4), new THREE.Vector3(0, 1, 0)],
      ['ceiling', quad(C1, C4, C3, C2), new THREE.Vector3(0, -1, 0)],
      ['wall', quad(F1, C1, C2, F2), n.clone()],
      ['wall', quad(F2, C2, C3, F3), u.clone().negate()],
      ['wall', quad(F1, F4, C4, C1), u.clone()],
      ['wall', quad(F4, F3, C3, C4), n.clone().negate()]
    ];
    defs.forEach(([kind, geo, normal], i) => {
      const material = new THREE.ShaderMaterial({ uniforms: { ...shared, uNormal: { value: normal } }, vertexShader: roomVertex, fragmentShader: roomFragment, side: THREE.DoubleSide, toneMapped: false });
      const mesh = new THREE.Mesh(geo, material);
      mesh.userData.surface = i;
      roomGroup.add(mesh);
      const anyPoint = new THREE.Vector3().fromBufferAttribute(geo.attributes.position, 0);
      surfaces.push({ mesh, kind, normal, plane: new THREE.Plane().setFromNormalAndCoplanarPoint(normal, anyPoint), index: i });
    });
    // Room outline, shown while setting up (and with "Room lines").
    const edges = [[F1, F2], [F2, F3], [F3, F4], [F4, F1], [C1, C2], [C2, C3], [C3, C4], [C4, C1], [F1, C1], [F2, C2], [F3, C3], [F4, C4]];
    const geo = new THREE.BufferGeometry().setFromPoints(edges.flat());
    lineGroup.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xe8c27a, transparent: true, opacity: 0.85, depthTest: false })));
    lineGroup.visible = room.calibrating || ui.lines;
  }

  function solveAndBuild() {
    if (room.mode === 'photo') {
      const solved = solvePhotoRoom();
      if (!solved) { setFitMessage('These lines do not make a room. Keep the gold line above the blue one, both on the same wall.', true); return false; }
      room.box = solved;
      room.calib.pitch = solved.pitch;
      shared.uMode.value = 0;
      shared.uPhotoVP.value.multiplyMatrices(photoCam.projectionMatrix, photoCam.matrixWorldInverse);
      shared.uCam.value.copy(photoCam.position);
      const fitCm = Math.round(solved.fit * 100);
      const dist = solved.depth - 1.5;
      const depthInput = $('#rsDepth', work);
      if (depthInput && document.activeElement !== depthInput) depthInput.value = dist.toFixed(1);
      const sizes = solved.open.some(Boolean)
        ? `Back wall about ${dist.toFixed(1)} m away.`
        : `Back wall about ${solved.seen.toFixed(1)} m wide and ${dist.toFixed(1)} m away.`;
      setFitMessage(fitCm <= 15 ? `${sizes} If that looks right, continue.` :
        `${sizes} The lines fit within about ${fitCm} cm: adjust the ceiling height or the lines until the outline matches your walls.`, fitCm > 30);
    } else {
      room.box = panoBox();
      shared.uMode.value = 1;
      shared.uYaw.value = THREE.MathUtils.degToRad(room.pano.yaw);
      shared.uCam.value.set(0, room.pano.camH, 0);
      setFitMessage('Turn and size the gold box until its edges sit on your walls, floor and ceiling.');
    }
    buildRoom();
    lamps.forEach(placeObject);
    updateLights();
    // The solved camera tilt changes with the lines, so the view camera must follow it.
    if (room.mode === 'photo') applyView(); else requestRender();
    return true;
  }

  /* =====================================================================
     VIEW (look around within the photo, or all the way round a 360° photo)
     ===================================================================== */

  function applyView() {
    if (!room.image) return;
    if (room.mode === 'photo') {
      // The view starts exactly as the photo and may turn a little either way.
      setPhotoCamera(camera, room.calib.pitch);
      camera.aspect = host.clientWidth / Math.max(1, host.clientHeight);
      const yawLimit = THREE.MathUtils.degToRad(14) / view.zoom, pitchLimit = THREE.MathUtils.degToRad(9) / view.zoom;
      view.yaw = clamp(view.yaw, -yawLimit, yawLimit);
      view.pitch = clamp(view.pitch, -pitchLimit, pitchLimit);
      camera.rotation.set(room.calib.pitch + view.pitch, view.yaw, 0);
      camera.zoom = view.zoom;
    } else {
      camera.position.set(0, room.pano.camH, 0);
      camera.fov = 75;
      camera.aspect = host.clientWidth / Math.max(1, host.clientHeight);
      view.pitch = clamp(view.pitch, -1.35, 1.35);
      camera.rotation.set(view.pitch, view.yaw, 0);
      camera.zoom = view.zoom;
    }
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    drawGuides();
    requestRender();
  }

  /* =====================================================================
     LAMPS
     ===================================================================== */

  const glowTexture = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'), grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,255,255,0.9)'); grad.addColorStop(0.25, 'rgba(255,255,255,0.35)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();

  function designInfo(arm) {
    const key = arm.key, index = arm.index;
    return { ref: refCode(key, index), key, index, name: styleCatalog[key].items[index], mount: CATEGORY[key].mount, model: fixtureModel(key, index) };
  }

  function makeLampObject(lamp) {
    const mat = makeMaterials();
    const built = buildLampModel(mat, lamp.key, lamp.model);
    const holder = new THREE.Group();          // position and orientation on the surface
    const sized = new THREE.Group();           // real size
    sized.add(built.group);
    holder.add(sized);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    holder.add(glow);
    const point = new THREE.PointLight(0xffffff, 0, 3.5, 2);
    holder.add(point);
    holder.traverse(o => { o.userData.lampId = lamp.id; });
    lamp.obj = { holder, sized, model: built.group, parts: built.parts, mat, glow, point, extension: null, lightCenter: new THREE.Vector3(), mountR: 0.1 };
    lampGroup.add(holder);
    styleLamp(lamp);
    placeObject(lamp);
  }

  function disposeLamp(lamp) {
    if (!lamp.obj) return;
    lampGroup.remove(lamp.obj.holder);
    disposeGroup(lamp.obj.holder);
    Object.values(lamp.obj.mat).forEach(m => m.dispose && m.dispose());
    lamp.obj.glow.material.dispose();
    lamp.obj = null;
  }

  // Finish, cord, light colour and brightness.
  function styleLamp(lamp) {
    const o = lamp.obj; if (!o) return;
    applyFinish(o.mat, lamp.finish, lamp.cord);
    const col = kelvinColor(lamp.kelvin);
    const strength = lamp.brightness * (0.55 + room.evening * 0.9);
    ['bulb', 'led', 'opal', 'fabric', 'rattan', 'veil'].forEach(k => { if (o.mat[k] && o.mat[k].emissive) o.mat[k].emissive.copy(col); });
    o.mat.bulb.emissiveIntensity = 2.4 * strength;
    o.mat.led.emissiveIntensity = 1.7 * strength;
    o.mat.opal.emissiveIntensity = 0.9 * strength;
    o.mat.fabric.emissiveIntensity = 0.32 * strength;
    o.mat.rattan.emissiveIntensity = 0.35 * strength;
    o.mat.veil.emissiveIntensity = 0.5 * strength;
    o.glow.material.color.copy(col);
    o.glow.material.opacity = clamp(0.15 + room.evening * 0.6, 0, 0.8) * lamp.brightness;
    o.point.color.copy(col);
    o.point.intensity = 2.2 * strength;
  }

  // Size, drop (extra cord for hanging lights), and position on its surface.
  function placeObject(lamp) {
    const o = lamp.obj; if (!o || !room.box) return;
    const s = lamp.size / 100;
    o.sized.scale.setScalar(s);
    // Hanging lights: lower the whole fitting below its ceiling plate and add a cord.
    const dropUnits = lamp.mount === 'pendant' ? lamp.drop / s : 0;
    ['link', 'body', 'light'].forEach(k => { o.parts[k].position.y = -dropUnits; });
    if (o.extension) { o.model.remove(o.extension); o.extension.geometry.dispose(); o.extension = null; }
    if (dropUnits > 0.01) {
      const geo = new THREE.CylinderGeometry(0.008 / Math.max(s, 0.2) * 0.42, 0.008 / Math.max(s, 0.2) * 0.42, dropUnits, 8);
      o.extension = new THREE.Mesh(geo, o.mat.cord);
      o.extension.position.y = -dropUnits / 2 - 0.03;
      o.model.add(o.extension);
    }
    const h = o.holder;
    h.position.set(lamp.pos.x, lamp.pos.y, lamp.pos.z);
    if (lamp.mount === 'wall') {
      h.rotation.set(0, Math.atan2(lamp.normal.x, lamp.normal.z), 0);
      h.position.x += lamp.normal.x * 0.003; h.position.z += lamp.normal.z * 0.003;
    } else {
      h.position.y = room.box.H - 0.002;
      h.rotation.set(0, THREE.MathUtils.degToRad(lamp.rot), 0);
    }
    h.updateMatrixWorld(true);
    // Where the light comes from (centre of the bulbs and glowing parts).
    const box = new THREE.Box3();
    o.parts.light.traverse(m => { if (m.isMesh && m.material !== o.mat.beam) box.expandByObject(m); });
    if (box.isEmpty()) o.parts.body.traverse(m => { if (m.isMesh) box.expandByObject(m); });
    box.getCenter(o.lightCenter);
    const local = h.worldToLocal(o.lightCenter.clone());
    o.glow.position.copy(local);
    o.point.position.copy(local);
    o.glow.scale.setScalar(s * 1.5);
    o.mountR = s * 0.6;
  }

  function updateLights() {
    const n = Math.min(lamps.length, MAX_LAMPS);
    shared.uCount.value = n;
    const mix = new THREE.Color(0, 0, 0); let total = 0;
    for (let i = 0; i < n; i++) {
      const l = lamps[i], o = l.obj; if (!o) continue;
      // Evens out brightness between colours (warm light should not look much dimmer), so mainly the tint changes.
      const col = kelvinColor(l.kelvin), lum = col.r * 0.2126 + col.g * 0.7152 + col.b * 0.0722;
      col.multiplyScalar(1 / Math.sqrt(Math.max(lum, 0.05)));
      const power = l.brightness * (0.5 + l.size / 84);
      shared.uLampPos.value[i].copy(o.lightCenter);
      shared.uLampColor.value[i].copy(col);
      shared.uLampPower.value[i] = power;
      mix.add(col.clone().multiplyScalar(power)); total += power;
      shared.uLampKind.value[i] = l.mount === 'wall' ? 0 : 1;
      shared.uMountPos.value[i].set(l.pos.x, l.mount === 'wall' ? l.pos.y : room.box.H, l.pos.z);
      shared.uMountR.value[i] = o.mountR;
    }
    shared.uEvening.value = room.evening;
    // The more the lamps light the room (evening, brightness), the more their colour shows everywhere.
    const amount = total ? (0.12 + room.evening * 0.6) * Math.min(1, total / 0.7) : 0;
    shared.uAmbient.value.setRGB(1, 1, 1).lerp(total ? mix.multiplyScalar(1 / total) : new THREE.Color(1, 1, 1), amount);
    hemi.intensity = 0.9 * (1 - room.evening * 0.7);
    scene.environmentIntensity = 0.8 * (1 - room.evening * 0.6);
    lamps.forEach(styleLamp);
    requestRender();
  }

  // Bottom height and gaps, for the readout.
  function lampMeasure(lamp) {
    const o = lamp.obj; if (!o) return null;
    const box = new THREE.Box3();
    o.sized.traverse(m => { if (m.isMesh && m.material !== o.mat.beam && !m.userData.cord) box.expandByObject(m); });
    return { bottom: box.min.y, top: box.max.y, centre: box.getCenter(new THREE.Vector3()).y };
  }

  function overlaps(lamp) {
    return lamps.filter(other => other !== lamp && other.mount !== 'wall' && lamp.mount !== 'wall' &&
      Math.hypot(other.pos.x - lamp.pos.x, other.pos.z - lamp.pos.z) < (other.size + lamp.size) / 200 * 0.9);
  }

  /* ---------- Placing and moving ---------- */

  function hitSurface(clientX, clientY) {
    const r = host.getBoundingClientRect();
    _ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    camera.updateMatrixWorld();
    _ray.setFromCamera(_ndc, camera);
    const hits = _ray.intersectObjects(roomGroup.children, false);
    if (!hits.length) return null;
    const hit = hits[0], surface = surfaces[hit.object.userData.surface];
    return { point: hit.point, surface };
  }

  function hitLamp(clientX, clientY) {
    const r = host.getBoundingClientRect();
    _ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    camera.updateMatrixWorld();
    _ray.setFromCamera(_ndc, camera);
    const hits = _ray.intersectObjects(lampGroup.children, true).filter(h => !(h.object.isSprite));
    return hits.length ? lamps.find(l => l.id === hits[0].object.userData.lampId) || null : null;
  }

  // Where a lamp of this type would go for a tap on `hit`; null if it cannot go there.
  function positionFor(mount, hit) {
    const b = room.box, p = hit.point;
    const inside = (x, z) => {
      const rel = new THREE.Vector3(x, 0, z).sub(b.P1);
      const along = clamp(rel.dot(b.u), 0.1, b.P1.distanceTo(b.P2) - 0.1);
      const out = clamp(rel.dot(b.n), 0.1, b.depth - 0.1);
      const q = b.P1.clone().addScaledVector(b.u, along).addScaledVector(b.n, out);
      return { x: q.x, z: q.z };
    };
    if (mount === 'wall') {
      if (hit.surface.kind !== 'wall') return null;
      const n = hit.surface.normal;
      return { pos: { x: p.x, y: clamp(p.y, 0.5, b.H - 0.35), z: p.z }, normal: { x: n.x, z: n.z } };
    }
    // A ceiling light tapped onto a wall hangs just in front of that wall, above the tapped spot
    // (not where the ray would meet the ceiling, which can be far out of view).
    const off = hit.surface.kind === 'wall' ? hit.surface.normal : { x: 0, z: 0 };
    let xz = inside(p.x + off.x * 0.3, p.z + off.z * 0.3);
    // In a photo, the ceiling right above a spot close to the camera is out of the picture:
    // slide the light back towards the far wall until its fixing point is in view.
    if (room.mode === 'photo') {
      camera.updateMatrixWorld();
      for (let i = 0; i < 100; i++) {
        _v.set(xz.x, b.H, xz.z).project(camera);
        if (_v.z < 1 && _v.y <= 0.92) break;
        xz = inside(xz.x - b.n.x * 0.1, xz.z - b.n.z * 0.1);
      }
    }
    return { pos: { x: xz.x, y: b.H, z: xz.z }, normal: { x: 0, z: 1 } };
  }

  // Returns true when the light was placed (a refused tap keeps the light chosen, so the next tap can place it).
  function addLamp(arm, hit) {
    if (lamps.length >= MAX_LAMPS) { toast('Up to ' + MAX_LAMPS + ' lights in one room'); return true; }
    const info = designInfo(arm);
    const at = positionFor(info.mount, hit);
    if (!at) { toast('Tap a wall for a wall light'); return false; }
    const finish = arm.finish || fixtureFinish(info.key, info.index);
    const lamp = {
      id: uid(), ...info, size: arm.size || 42, finish, cord: arm.cord || cordFor(finish),
      pos: at.pos, normal: at.normal, rot: 0, drop: info.mount === 'pendant' ? 0.35 : 0, kelvin: 2700, brightness: 0.8
    };
    makeLampObject(lamp);
    lamps.push(lamp);
    commit();
    select(lamp);
    updateLights();
    toast(info.name + ' added. Drag it to move it.');
    return true;
  }

  function moveLamp(lamp, clientX, clientY) {
    const hit = hitSurface(clientX, clientY); if (!hit) return;
    if (lamp.mount === 'wall' && hit.surface.kind !== 'wall') return;
    const at = positionFor(lamp.mount, hit); if (!at) return;
    lamp.pos = at.pos; lamp.normal = at.normal;
    placeObject(lamp);
    updateLights();
    renderSelected();
  }

  /* ---------- Undo and redo ---------- */
  const snapshotState = () => JSON.stringify({ lamps: lamps.map(({ obj, ...rest }) => rest), evening: room.evening });
  function commit() {
    history.push(snapshotState());
    if (history.length > 60) history.shift();
    future.length = 0;
    syncHistoryButtons();
    renderLampList();
  }
  function restore(json) {
    const data = JSON.parse(json);
    lamps.forEach(disposeLamp);
    lamps = data.lamps.map(l => ({ ...l }));
    lamps.forEach(makeLampObject);
    room.evening = data.evening;
    $('#rsEvening', work).value = Math.round(room.evening * 100);
    if (selected) selected = lamps.find(l => l.id === selected.id) || null;
    updateLights();
    renderSelected();
    renderLampList();
  }
  function undo() { if (history.length < 2) return; future.push(history.pop()); restore(history.at(-1)); syncHistoryButtons(); }
  function redo() { if (!future.length) return; const s = future.pop(); history.push(s); restore(s); syncHistoryButtons(); }
  function syncHistoryButtons() {
    $('#rsUndo', work).disabled = history.length < 2;
    $('#rsRedo', work).disabled = !future.length;
  }

  /* =====================================================================
     RENDERING
     ===================================================================== */

  let needsRender = false, rafId = 0;
  function requestRender() {
    needsRender = true;
    if (!rafId) rafId = requestAnimationFrame(frame);
  }
  function frame() {
    rafId = 0;
    if (!needsRender) return;
    needsRender = false;
    renderer.render(scene, camera);
  }
  function renderNow() { resize(); renderer.render(scene, camera); }

  // The view keeps the photo's shape; a 360° photo fills the area.
  function resize() {
    if (!room.image) return;
    const box = stageBox.getBoundingClientRect();
    // The photo stays in view while the settings scroll (styles.css: .rs-stage is sticky), so it must
    // fit the window: under the header on wide screens, about half the screen on phones and tablets.
    const full = root.classList.contains('is-full');
    const header = full ? 0 : parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header')) || 64;
    const maxH = window.innerWidth < 960
      ? Math.max(200, Math.min(window.innerHeight * (full ? 0.56 : 0.5), 520))
      : Math.max(320, Math.min(window.innerHeight - header - 40, 820));
    let w = box.width, h;
    if (room.mode === 'photo') {
      const aspect = room.image.width / room.image.height;
      h = w / aspect;
      if (h > maxH) { h = maxH; w = h * aspect; }
    } else {
      h = Math.min(maxH, w * (window.innerWidth < 640 ? 1.1 : 0.62));
    }
    host.style.width = Math.round(w) + 'px';
    host.style.height = Math.round(h) + 'px';
    stageBox.style.height = Math.round(h) + 'px';
    root.style.setProperty('--rs-stage-h', Math.round(h) + 'px');
    renderer.setSize(Math.round(w), Math.round(h), false);
    guides.setAttribute('viewBox', `0 0 ${Math.round(w)} ${Math.round(h)}`);
    guides.style.width = Math.round(w) + 'px';
    guides.style.height = Math.round(h) + 'px';
    applyView();
  }
  new ResizeObserver(() => resize()).observe(stageBox);
  let resizeTimer = 0;     // the height limit depends on the window height too
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { resize(); requestRender(); }, 150); });

  /* =====================================================================
     CALIBRATION GUIDES (photo mode)
     ===================================================================== */

  const ui = { lines: false };
  function drawGuides() {
    // (SVG elements have no .hidden property, so the attribute is set directly.)
    if (room.mode !== 'photo' || !room.calibrating || !room.image) { guides.innerHTML = ''; guides.setAttribute('hidden', ''); return; }
    guides.removeAttribute('hidden');
    const w = host.clientWidth, h = host.clientHeight;
    // Guides are drawn in photo coordinates; during set-up the view is exactly the photo.
    const P = pt => [pt[0] * w, pt[1] * h];
    const line = (pts, cls, label) => {
      const [a, b] = pts.map(P);
      return `<g class="rs-guide ${cls}"><line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>
        <text x="${(a[0] + b[0]) / 2}" y="${(a[1] + b[1]) / 2 + (cls === 'is-ceil' ? 22 : -12)}">${label}</text></g>`;
    };
    const handles = (pts, cls, name) => pts.map((p, i) => {
      const [x, y] = P(p);
      return `<g class="rs-handle ${cls}" data-handle="${name}:${i}" tabindex="0" role="slider" aria-label="${name === 'ceil' ? 'Ceiling line' : 'Floor line'} ${i ? 'right' : 'left'} end">
        <circle class="rs-hit" cx="${x}" cy="${y}" r="24"/><circle cx="${x}" cy="${y}" r="10"/></g>`;
    }).join('');
    guides.innerHTML = line(room.calib.ceil, 'is-ceil', 'Ceiling meets the wall') + line(room.calib.floor, 'is-floor', 'Floor meets the wall') +
      handles(room.calib.ceil, 'is-ceil', 'ceil') + handles(room.calib.floor, 'is-floor', 'floor');
  }

  let dragHandle = null;
  guides.addEventListener('pointerdown', e => {
    const h = e.target.closest('[data-handle]');
    if (!h) return;
    e.preventDefault();
    const [name, i] = h.dataset.handle.split(':');
    dragHandle = { name, i: +i };
    try { guides.setPointerCapture(e.pointerId); } catch (err) { /* pointer already gone */ }
  });
  guides.addEventListener('pointermove', e => {
    if (!dragHandle) return;
    const r = host.getBoundingClientRect();
    const u = clamp((e.clientX - r.left) / r.width, 0, 1), v = clamp((e.clientY - r.top) / r.height, 0, 1);
    room.calib[dragHandle.name][dragHandle.i] = [u, v];
    // Keep each line level-ish in the middle: moving one end moves it, not the whole line.
    solveAndBuild();
    drawGuides();
  });
  const endHandle = () => { dragHandle = null; };
  guides.addEventListener('pointerup', endHandle);
  guides.addEventListener('pointercancel', endHandle);
  guides.addEventListener('keydown', e => {
    const h = e.target.closest('[data-handle]'); if (!h) return;
    const [name, i] = h.dataset.handle.split(':');
    const step = e.shiftKey ? 0.02 : 0.005, p = room.calib[name][+i];
    const moves = { ArrowUp: [0, -step], ArrowDown: [0, step], ArrowLeft: [-step, 0], ArrowRight: [step, 0] };
    if (!moves[e.key]) return;
    e.preventDefault();
    room.calib[name][+i] = [clamp(p[0] + moves[e.key][0], 0, 1), clamp(p[1] + moves[e.key][1], 0, 1)];
    solveAndBuild(); drawGuides();
    const again = $(`[data-handle="${name}:${i}"]`, guides); if (again) again.focus();
  });

  /* =====================================================================
     POINTER: place, select, drag lamps; look around; pinch and wheel zoom
     ===================================================================== */

  const pointers = new Map();
  let gesture = null;   // { type: 'lamp'|'look'|'pinch', ... }
  host.addEventListener('pointerdown', e => {
    if (!room.box) return;
    host.focus({ preventScroll: true });
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { host.setPointerCapture(e.pointerId); } catch (err) { /* pointer already gone */ }
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      gesture = { type: 'pinch', dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: view.zoom };
      return;
    }
    if (room.calibrating && room.mode === 'photo') return;
    const lamp = hitLamp(e.clientX, e.clientY);
    if (lamp && !armed) {
      select(lamp);
      gesture = { type: 'lamp', lamp, moved: false, x: e.clientX, y: e.clientY };
      return;
    }
    gesture = { type: 'look', x: e.clientX, y: e.clientY, yaw: view.yaw, pitch: view.pitch, moved: false };
  });
  host.addEventListener('pointermove', e => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!gesture) return;
    if (gesture.type === 'pinch' && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      view.zoom = clamp(gesture.zoom * Math.hypot(a.x - b.x, a.y - b.y) / gesture.dist, 1, 2.6);
      applyView();
    } else if (gesture.type === 'lamp') {
      if (Math.hypot(e.clientX - gesture.x, e.clientY - gesture.y) > 4) gesture.moved = true;
      if (gesture.moved) moveLamp(gesture.lamp, e.clientX, e.clientY);
    } else if (gesture.type === 'look') {
      const dx = e.clientX - gesture.x, dy = e.clientY - gesture.y;
      if (Math.hypot(dx, dy) > 5) gesture.moved = true;
      const k = (room.mode === 'pano' ? 0.005 : 0.0025) / view.zoom;
      view.yaw = gesture.yaw + dx * k;
      view.pitch = gesture.pitch + dy * k;
      applyView();
    }
  });
  const endPointer = e => {
    pointers.delete(e.pointerId);
    if (!gesture) return;
    if (gesture.type === 'lamp' && gesture.moved) commit();
    if (gesture.type === 'look' && !gesture.moved && armed) {
      const hit = hitSurface(e.clientX, e.clientY);
      if (hit && addLamp(armed, hit)) disarm();
    } else if (gesture.type === 'look' && !gesture.moved && !armed) {
      select(null);
    }
    if (!pointers.size) gesture = null;
  };
  host.addEventListener('pointerup', endPointer);
  host.addEventListener('pointercancel', endPointer);
  let wheelReady = false;
  host.addEventListener('pointerdown', () => { wheelReady = true; }, { capture: true });
  host.addEventListener('pointerleave', () => { wheelReady = false; });
  host.addEventListener('wheel', e => {
    if (!wheelReady || !room.box) return;
    e.preventDefault();
    view.zoom = clamp(view.zoom * (e.deltaY < 0 ? 1.08 : 0.93), 1, 2.6);
    applyView();
  }, { passive: false });
  host.addEventListener('keydown', e => {
    if (!room.box) return;
    const step = e.shiftKey ? 0.25 : 0.05;
    if (selected && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      e.preventDefault();
      const b = room.box, l = selected;
      if (l.mount === 'wall') {
        const along = new THREE.Vector3(-l.normal.z, 0, l.normal.x);
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { const k = e.key === 'ArrowLeft' ? -step : step; l.pos.x += along.x * k; l.pos.z += along.z * k; }
        else l.pos.y = clamp(l.pos.y + (e.key === 'ArrowUp' ? step : -step), 0.5, b.H - 0.35);
      } else {
        const dir = e.key === 'ArrowLeft' ? b.u.clone().negate() : e.key === 'ArrowRight' ? b.u.clone() : e.key === 'ArrowUp' ? b.n.clone().negate() : b.n.clone();
        l.pos.x += dir.x * step; l.pos.z += dir.z * step;
      }
      placeObject(l); updateLights(); renderSelected(); commit();
    } else if (selected && (e.key === 'Delete' || e.key === 'Backspace')) { e.preventDefault(); removeLamp(selected); }
    else if (e.key === '+' || e.key === '=') { view.zoom = clamp(view.zoom * 1.15, 1, 2.6); applyView(); }
    else if (e.key === '-') { view.zoom = clamp(view.zoom / 1.15, 1, 2.6); applyView(); }
    else if (e.key === 'Escape') { disarm(); select(null); }
  });

  /* =====================================================================
     PANEL
     ===================================================================== */

  function setFitMessage(text, warn = false) {
    const el = $('#rsFit', work);
    el.textContent = text;
    el.classList.toggle('is-warning', warn);
  }

  function showStep(name) {
    $$('[data-rs-step]', work).forEach(s => { s.hidden = s.dataset.rsStep !== name; });
    work.dataset.step = name;
  }

  function enterSetup() {
    room.calibrating = true;
    disarm(); select(null);
    view.yaw = 0; view.pitch = 0; view.zoom = 1;
    const photo = room.mode === 'photo';
    $('#rsSetupPhoto', work).hidden = !photo;
    $('#rsSetupPano', work).hidden = photo;
    $('#rsCeil', work).value = (photo ? room.calib.ceilH : room.pano.ceilH).toFixed(2);
    $('#rsCamH', work).value = (photo ? room.calib.camH : room.pano.camH).toFixed(2);
    $('#rsLens option[value="auto"]', work).hidden = !room.focal35;
    $('#rsLens', work).value = room.calib.lens;
    showStep('setup');
    lineGroup.visible = true;
    solveAndBuild();
    applyView();
    setHint(photo ? 'Drag the dots so the lines sit where the ceiling and the floor meet the back wall.' : 'Drag to look around. Size the gold box to your room.');
  }

  function finishSetup() {
    if (!room.box) { toast('The room outline does not fit yet. Adjust the lines first.'); return; }
    room.calibrating = false;
    lineGroup.visible = ui.lines;
    drawGuides();
    showStep('design');
    renderLibrary();
    renderLampList();
    if (!history.length) commit();
    if (pending) { arm(pending); pending = null; }
    else setHint(lamps.length ? 'Tap a light to change it, or drag it to move it.' : 'Choose a light, then tap the ceiling or a wall where it should go.');
    requestRender();
  }

  // Hints fade after a few seconds so they never cover the room for long (the panel repeats the steps).
  let hintTimer = 0;
  function setHint(text) {
    const el = $('#rsHint', work);
    el.textContent = text; el.hidden = !text;
    el.classList.remove('is-faded');
    clearTimeout(hintTimer);
    if (text) hintTimer = setTimeout(() => el.classList.add('is-faded'), 7000);
  }

  // Library of published designs.
  const lib = { type: 'all', query: '' };
  function renderLibrary() {
    const q = lib.query.trim().toLowerCase();
    const items = CATEGORY_ORDER.filter(k => lib.type === 'all' || lib.type === k).flatMap(key =>
      styleCatalog[key].items.map((name, index) => ({ key, index, name })))
      .filter(x => !q || (x.name + ' ' + refCode(x.key, x.index)).toLowerCase().includes(q));
    $('#rsLibrary', work).innerHTML = items.length ? items.map(x =>
      `<button class="rs-design" type="button" data-arm="${x.key}:${x.index}" aria-pressed="${armed && armed.key === x.key && armed.index === x.index}">
        <img src="${escapeLuma(fixtureImage(x.key, x.index, true))}" alt="" loading="lazy" width="64" height="64">
        <span><b>${escapeLuma(x.name)}</b><small>${CATEGORY[x.key].singular} · ${escapeLuma(refCode(x.key, x.index))}</small></span></button>`).join('')
      : '<p class="fine">No designs match your search.</p>';
  }

  function arm(spec) {
    if (!styleCatalog[spec.key]) return;
    armed = { ...spec };
    work.classList.add('is-armed');
    const info = designInfo(spec);
    setHint(info.mount === 'wall' ? `Tap a wall where the ${info.name} should go.` : `Tap the ceiling where the ${info.name} should hang.`);
    renderLibrary();
    select(null);
  }
  function disarm() {
    armed = null;
    work.classList.remove('is-armed');
    if (!room.calibrating) setHint(lamps.length ? 'Tap a light to change it, or drag it to move it.' : 'Choose a light, then tap where it should go.');
    if ($('#rsLibrary', work)) renderLibrary();
  }

  function select(lamp) {
    const changed = lamp !== selected;
    selected = lamp;
    lamps.forEach(l => { if (l.obj) l.obj.holder.userData.selected = l === lamp; });
    renderSelected();
    renderLampList();
    if (lamp && changed) $('#rsSelected', work).scrollIntoView({ block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' });
  }

  function renderSelected() {
    const box = $('#rsSelected', work);
    if (!selected) { box.hidden = true; return; }
    box.hidden = false;
    const l = selected, m = lampMeasure(l), H = room.box.H;
    const cm = v => Math.round(v * 100);
    let readout = '';
    if (m && l.mount !== 'wall') readout = `Lowest point ${(m.bottom).toFixed(2)} m above the floor · ${cm(H - m.bottom)} cm below the ceiling`;
    else if (m) readout = `Centre ${(m.centre).toFixed(2)} m above the floor`;
    const clash = overlaps(l);
    const tabs = [['style', 'Style'], ...(l.mount !== 'wall' ? [['place', 'Position']] : []), ['light', 'Light']];
    if (!tabs.some(([k]) => k === selTab)) selTab = 'style';
    const pane = {
      style: `<div class="rs-field"><span>Size</span><div class="rs-seg">${SIZES.map(s => `<button type="button" data-rs-size="${s}" aria-pressed="${l.size === s}">${s} cm</button>`).join('')}</div></div>
      <div class="rs-field"><span>Finish</span><div class="rs-seg">${Object.keys(FINISH).map(f => `<button type="button" data-rs-finish="${f}" aria-pressed="${l.finish === f}">${FINISH[f].replace(/^\w/, c => c.toUpperCase())}</button>`).join('')}</div></div>
      ${l.mount !== 'ceiling' ? `<div class="rs-field"><span>Cord</span><div class="rs-seg">${['white', 'black'].map(c => `<button type="button" data-rs-cord="${c}" aria-pressed="${l.cord === c}">${c[0].toUpperCase() + c.slice(1)}</button>`).join('')}</div></div>` : ''}`,
      place: `${l.mount === 'pendant' ? `<label class="rs-field"><span>Hang lower <output>${cm(l.drop)} cm</output></span><input type="range" min="0" max="150" step="5" value="${cm(l.drop)}" data-rs-drop></label>` : ''}
      ${l.mount !== 'wall' ? `<label class="rs-field"><span>Turn <output>${Math.round(l.rot)}°</output></span><input type="range" min="0" max="355" step="5" value="${Math.round(l.rot)}" data-rs-rot></label>` : ''}
        <p class="rs-help">Drag the light in the photo to move it; arrow keys move it too.</p>`,
      light: `<div class="rs-field"><span>Light colour</span><div class="rs-seg">${KELVINS.map(([k, label]) => `<button type="button" data-rs-kelvin="${k}" aria-pressed="${l.kelvin === k}"><span class="rs-kelvin-name"><i class="rs-swatch" style="--swatch:${LIGHT_TINT[k]}" aria-hidden="true"></i>${label}</span><small>${k} K</small></button>`).join('')}</div></div>
      <label class="rs-field"><span>Brightness <output>${Math.round(l.brightness * 100)}%</output></span><input type="range" min="10" max="100" step="5" value="${Math.round(l.brightness * 100)}" data-rs-bright></label>`
    };
    box.innerHTML = `
      <div class="rs-sel-head"><div><b>${escapeLuma(l.name)}</b><small>${CATEGORY[l.key].singular} · ${escapeLuma(l.ref)}</small></div>
        <button class="icon-btn" type="button" data-rs="deselect" aria-label="Close">${icon('close')}</button></div>
      <p class="rs-readout">${readout}</p>
      ${clash.length ? `<p class="rs-warning">${icon('close')}Touches ${escapeLuma(clash[0].name)}. Move one of them a little.</p>` : ''}
      <div class="rs-tabs" role="tablist" aria-label="Light settings">${tabs.map(([k, label]) => `<button type="button" role="tab" id="rsTab-${k}" data-rs-tab="${k}" aria-controls="rsPane" aria-selected="${k === selTab}" tabindex="${k === selTab ? 0 : -1}">${label}</button>`).join('')}</div>
      <div class="rs-pane" id="rsPane" role="tabpanel" aria-labelledby="rsTab-${selTab}">${pane[selTab]}</div>
      <div class="rs-sel-actions">
        <button class="btn btn--outline btn--sm" type="button" data-rs="duplicate">Duplicate</button>
        <button class="btn btn--outline btn--sm" type="button" data-rs="remove">${icon('close')}Remove</button>
      </div>`;
  }

  function renderLampList() {
    const list = $('#rsLamps', work); if (!list) return;
    $('#rsCount', work).textContent = lamps.length ? `(${lamps.length})` : '';
    list.innerHTML = lamps.length ? lamps.map(l => `<li><button type="button" data-rs-pick="${l.id}" aria-pressed="${selected === l}">
        <img src="${escapeLuma(fixtureImage(l.key, l.index, true))}" alt="" width="40" height="40"><span><b>${escapeLuma(l.name)}</b><small>${l.size} cm · ${FINISH[l.finish]}</small></span></button></li>`).join('')
      : '<li class="fine">No lights yet.</li>';
    $('#rsSend', work).disabled = !lamps.length;
  }

  function removeLamp(lamp) {
    disposeLamp(lamp);
    lamps = lamps.filter(l => l !== lamp);
    if (selected === lamp) selected = null;
    commit(); updateLights(); renderSelected();
    toast('Light removed');
  }

  work.addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.arm) { const [key, index] = t.dataset.arm.split(':'); if (armed && armed.key === key && armed.index === +index) disarm(); else arm({ key, index: +index }); return; }
    if (t.dataset.rsPick) { select(lamps.find(l => l.id === t.dataset.rsPick)); return; }
    if (t.dataset.rsTab) { selTab = t.dataset.rsTab; renderSelected(); $('#rsTab-' + selTab, work).focus(); return; }
    if (t.dataset.rsFilter) { lib.type = t.dataset.rsFilter; $$('[data-rs-filter]', work).forEach(b => b.setAttribute('aria-pressed', String(b === t))); renderLibrary(); return; }
    const l = selected;
    if (l && t.dataset.rsSize) { l.size = +t.dataset.rsSize; placeObject(l); updateLights(); renderSelected(); commit(); return; }
    if (l && t.dataset.rsFinish) { l.finish = t.dataset.rsFinish; styleLamp(l); requestRender(); renderSelected(); renderLampList(); commit(); return; }
    if (l && t.dataset.rsCord) { l.cord = t.dataset.rsCord; styleLamp(l); requestRender(); renderSelected(); commit(); return; }
    if (l && t.dataset.rsKelvin) { l.kelvin = +t.dataset.rsKelvin; updateLights(); renderSelected(); commit(); return; }
    const action = t.dataset.rs;
    if (action === 'deselect') select(null);
    else if (action === 'remove' && l) removeLamp(l);
    else if (action === 'duplicate' && l) {
      if (lamps.length >= MAX_LAMPS) { toast('Up to ' + MAX_LAMPS + ' lights in one room'); return; }
      const copy = { ...l, id: uid(), obj: null, pos: { ...l.pos }, normal: { ...l.normal } };
      const b = room.box, shift = (l.size / 100) * 1.3;
      if (l.mount === 'wall') { const along = new THREE.Vector3(-l.normal.z, 0, l.normal.x); copy.pos.x += along.x * shift; copy.pos.z += along.z * shift; }
      else { copy.pos.x += b.u.x * shift; copy.pos.z += b.u.z * shift; }
      makeLampObject(copy); lamps.push(copy); commit(); select(copy); updateLights();
    }
  });
  work.addEventListener('keydown', e => {
    const t = e.target;
    if (!t.matches('[role="tab"]') || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    const all = $$('[role="tab"]', t.parentElement), i = all.indexOf(t);
    const next = e.key === 'Home' ? all[0] : e.key === 'End' ? all[all.length - 1] : all[(i + (e.key === 'ArrowRight' ? 1 : -1) + all.length) % all.length];
    e.preventDefault(); next.click();
  });
  work.addEventListener('input', e => {
    const t = e.target, l = selected;
    if (t.id === 'rsEvening') { room.evening = t.value / 100; updateLights(); return; }
    if (t.id === 'rsSearch') { lib.query = t.value; renderLibrary(); return; }
    if (!l) return;
    if (t.matches('[data-rs-drop]')) { l.drop = t.value / 100; placeObject(l); updateLights(); t.previousElementSibling.querySelector('output').textContent = t.value + ' cm'; $('.rs-readout', work).textContent = (() => { const m = lampMeasure(l); return `Lowest point ${m.bottom.toFixed(2)} m above the floor · ${Math.round((room.box.H - m.bottom) * 100)} cm below the ceiling`; })(); }
    if (t.matches('[data-rs-rot]')) { l.rot = +t.value; placeObject(l); requestRender(); t.previousElementSibling.querySelector('output').textContent = t.value + '°'; }
    if (t.matches('[data-rs-bright]')) { l.brightness = t.value / 100; updateLights(); t.previousElementSibling.querySelector('output').textContent = t.value + '%'; }
  });
  work.addEventListener('change', e => {
    const t = e.target;
    if (t.matches('[data-rs-drop], [data-rs-rot], [data-rs-bright], #rsEvening')) commit();
    if (t.id === 'rsCeil' || t.id === 'rsCamH') {
      const v = parseFloat(t.value);
      if (!(v > 0)) return;
      const target = room.mode === 'photo' ? room.calib : room.pano;
      if (t.id === 'rsCeil') target.ceilH = clamp(v, 2, 6); else target.camH = clamp(v, 0.5, 2.2);
      solveAndBuild(); applyView();
    }
    if (t.id === 'rsLens') { room.calib.lens = t.value; solveAndBuild(); applyView(); }
    if (t.id === 'rsDepth') {
      const target = parseFloat(t.value);
      if (!(target >= 1.5 && target <= 20)) return;
      if (fitDistance(target)) { $('#rsLens', work).value = 'custom'; solveAndBuild(); applyView(); }
      else toast('That distance does not fit these lines. Check the lines first.');
    }
  });
  ['rsPanoW', 'rsPanoL', 'rsPanoYaw'].forEach(id => $('#' + id, work).addEventListener('input', e => {
    const key = { rsPanoW: 'width', rsPanoL: 'length', rsPanoYaw: 'yaw' }[id];
    room.pano[key] = +e.target.value;
    e.target.previousElementSibling.querySelector('output').textContent = key === 'yaw' ? e.target.value + '°' : (+e.target.value).toFixed(1) + ' m';
    solveAndBuild();
  }));

  $('#rsDone', work).addEventListener('click', finishSetup);
  $('#rsEditRoom', work).addEventListener('click', enterSetup);
  $('#rsUndo', work).addEventListener('click', undo);
  $('#rsRedo', work).addEventListener('click', redo);
  $('#rsZoomIn', work).addEventListener('click', () => { view.zoom = clamp(view.zoom * 1.2, 1, 2.6); applyView(); });
  $('#rsZoomOut', work).addEventListener('click', () => { view.zoom = clamp(view.zoom / 1.2, 1, 2.6); applyView(); });
  $('#rsLines', work).addEventListener('click', e => {
    ui.lines = !ui.lines; lineGroup.visible = ui.lines || room.calibrating;
    e.currentTarget.setAttribute('aria-pressed', String(ui.lines)); requestRender();
  });
  $('#rsFull', work).addEventListener('click', () => {
    root.classList.toggle('is-full');
    document.body.classList.toggle('modal-open', root.classList.contains('is-full'));
    $('#rsFull', work).setAttribute('aria-pressed', String(root.classList.contains('is-full')));
    setTimeout(resize, 50);
  });
  $('#rsNewPhoto', work).addEventListener('click', () => { if (lamps.length && !confirm('Start again with a new photo? Lights not saved will be lost.')) return; showStart(); });
  $('#rsSave', work).addEventListener('click', saveRoom);
  $('#rsSend', work).addEventListener('click', sendRoom);
  $('#rsReset', work).addEventListener('click', () => { view.yaw = 0; view.pitch = 0; view.zoom = 1; applyView(); });

  /* =====================================================================
     LOADING, SAVING, SENDING
     ===================================================================== */

  function showStart() {
    work.hidden = true;
    start.hidden = false;
    root.classList.remove('is-full');
    document.body.classList.remove('modal-open');
  }

  async function loadImage(canvas, opts) {
    lamps.forEach(disposeLamp); lamps = []; selected = null; armed = null; history.length = 0; future.length = 0;
    room.image = canvas;
    room.mode = opts.mode;
    room.name = opts.name || 'My room';
    room.savedId = opts.savedId || null;
    if (opts.calib) Object.assign(room.calib, JSON.parse(JSON.stringify(opts.calib)));
    if (opts.pano) Object.assign(room.pano, opts.pano);
    room.evening = opts.evening ?? LUMA_ROOM.evening;
    $('#rsEvening', work).value = Math.round(room.evening * 100);
    if (photoTexture) photoTexture.dispose();
    photoTexture = new THREE.CanvasTexture(canvas);
    photoTexture.colorSpace = THREE.SRGBColorSpace;
    photoTexture.minFilter = THREE.LinearMipmapLinearFilter;
    photoTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    shared.uPhoto.value = photoTexture;
    // Reflections on metal and glass take the colours of the room.
    if (envTexture) envTexture.dispose();
    const envSource = new THREE.CanvasTexture(canvas);
    envSource.mapping = THREE.EquirectangularReflectionMapping;
    envSource.colorSpace = THREE.SRGBColorSpace;
    envTexture = pmrem.fromEquirectangular(envSource).texture;
    envSource.dispose();
    scene.environment = envTexture;
    start.hidden = true;
    work.hidden = false;
    $('#rsPanoW', work).value = room.pano.width; $('#rsPanoL', work).value = room.pano.length; $('#rsPanoYaw', work).value = room.pano.yaw;
    resize();
    if (opts.lamps && opts.lamps.length) {
      // A saved room: rebuild the room first, then its lights, and go straight to designing.
      room.calibrating = false;
      solveAndBuild();
      lamps = opts.lamps.map(l => ({ ...l, obj: null }));
      lamps.forEach(makeLampObject);
      lineGroup.visible = false;
      showStep('design'); renderLibrary(); commit(); updateLights(); applyView();
      setHint('Your saved room. Tap a light to change it.');
    } else {
      enterSetup();
    }
    root.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
  }

  async function loadFile(file) {
    if (!file || !/^image\//.test(file.type || 'image/')) { toast('Please choose a photo (JPG, PNG or WebP).'); return; }
    if (file.size > 30 * 1024 * 1024) { toast('Please choose a photo smaller than 30 MB.'); return; }
    setBusy(true);
    try {
      const buffer = await file.slice(0, 256 * 1024).arrayBuffer();
      room.focal35 = exifFocal35(buffer);
      const probe = await createImageBitmap(file);
      const isPano = Math.abs(probe.width / probe.height - 2) < 0.06 && probe.width >= 2000;
      probe.close && probe.close();
      const canvas = await loadPicture(file, isPano ? Math.min(4096, maxTexture) : Math.min(3072, maxTexture));
      room.calib = { ceil: [[0.03, 0.2], [0.97, 0.2]], floor: [[0.03, 0.8], [0.97, 0.8]], ceilH: 2.8, camH: 1.5, lens: room.focal35 ? 'auto' : 'normal', pitch: 0 };
      room.pano = { width: 4, length: 5, yaw: 0, ceilH: 2.8, camH: 1.5 };
      await loadImage(canvas, { mode: isPano ? 'pano' : 'photo', name: file.name.replace(/\.[^.]+$/, '') });
      if (isPano) toast('This looks like a 360° photo: you can look all the way round.');
    } catch (error) {
      console.error(error);
      toast('This photo could not be opened. Try a JPG or PNG (on iPhone, choose "Most compatible" photos).');
    } finally { setBusy(false); }
  }

  async function loadSample() {
    setBusy(true);
    try {
      room.focal35 = null;
      const canvas = await loadPicture(SAMPLE.src, 1600);
      await loadImage(canvas, { mode: 'photo', name: 'Sample room', calib: SAMPLE.calib });
    } catch (e) { toast('The sample room could not load. Check your connection.'); }
    finally { setBusy(false); }
  }

  function setBusy(on) { root.classList.toggle('is-busy', on); }

  function lampsSummary() {
    return lamps.map(l => `${l.name} (${l.ref}) · ${l.size} cm · ${FINISH[l.finish]}` +
      (l.mount !== 'ceiling' ? ` · ${l.cord} cord` : '') + (l.mount === 'pendant' ? ` · hangs ${Math.round(l.drop * 100)} cm lower` : '') + ` · ${l.kelvin} K`);
  }

  // A picture of the design as it looks now, at most `max` pixels wide.
  async function snapshot(max = 1280) {
    const keepSel = selected; select(null);
    const wasLines = lineGroup.visible; lineGroup.visible = false;
    renderNow();
    const src = renderer.domElement;
    const scale = Math.min(1, max / src.width);
    const c = document.createElement('canvas');
    c.width = Math.round(src.width * scale); c.height = Math.round(src.height * scale);
    c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
    lineGroup.visible = wasLines;
    if (keepSel) select(keepSel);
    requestRender();
    return c;
  }

  async function saveRoom() {
    try {
      const imageBlob = await canvasBlob(room.image, 'image/jpeg', 0.9);
      const thumb = (await snapshot(360)).toDataURL('image/jpeg', 0.7);
      const id = room.savedId || uid();
      const record = {
        id, name: room.name, savedAt: Date.now(), mode: room.mode, imageBlob, thumb,
        calib: room.calib, pano: room.pano, evening: room.evening, lamps: lamps.map(({ obj, ...rest }) => rest)
      };
      await dbDo('readwrite', s => s.put(record));
      room.savedId = id;
      toast('Saved on this device. Open it again from "Open a saved room".');
      document.dispatchEvent(new CustomEvent('luma-rooms-changed'));
    } catch (error) {
      console.error(error);
      toast('Could not save on this device (private browsing may block it).');
    }
  }

  async function openSaved(id) {
    const record = await dbDo('readonly', s => s.get(id)).catch(() => null);
    if (!record) { toast('That saved room was not found.'); return; }
    setBusy(true);
    try {
      const canvas = await loadPicture(record.imageBlob, record.mode === 'pano' ? Math.min(4096, maxTexture) : Math.min(3072, maxTexture));
      room.focal35 = null;
      await loadImage(canvas, { mode: record.mode, name: record.name, savedId: record.id, calib: record.calib, pano: record.pano, evening: record.evening, lamps: record.lamps });
    } finally { setBusy(false); }
  }

  async function sendRoom() {
    if (!lamps.length) return;
    const pic = await snapshot(1280);
    // The form opens straight away; the JPEG is prepared in the background and awaited on sending.
    const blob = canvasBlob(pic, 'image/jpeg', 0.82);
    blob.catch(() => {});
    const first = lamps[0];
    openConsultation({
      key: first.key, index: first.index, source: 'room-studio',
      setup: `Room design with ${lamps.length} light${lamps.length === 1 ? '' : 's'}`,
      room: {
        preview: pic.toDataURL('image/jpeg', 0.6),
        blob,
        lines: lampsSummary(),
        lamps: lamps.map(l => ({ ref: l.ref, name: l.name, size: l.size, finish: l.finish, cord: l.mount === 'ceiling' ? null : l.cord, drop: Math.round(l.drop * 100), kelvin: l.kelvin, brightness: Math.round(l.brightness * 100) }))
      }
    });
  }

  function hasRoom() { return Boolean(room.box) && !work.hidden; }

  // Test hooks (a hidden browser tab pauses drawing): draw now, take a picture, read state.
  window.lumaRoom = {
    renderNow, snapshot: async () => (await snapshot(900)).toDataURL('image/jpeg', 0.8),
    get state() { return { mode: room.mode, box: room.box && { H: room.box.H, depth: +room.box.depth.toFixed(2), width: +room.box.P1.distanceTo(room.box.P2).toFixed(2), pitchDeg: +THREE.MathUtils.radToDeg(room.calib.pitch).toFixed(1), fitCm: Math.round((room.box.fit || 0) * 100) }, lamps: lamps.map(l => ({ ref: l.ref, mount: l.mount, pos: l.pos, size: l.size, measure: lampMeasure(l) })), view: { ...view } }; },
    tapAt: (u, v) => { const r = host.getBoundingClientRect(); const x = r.left + u * r.width, y = r.top + v * r.height; host.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: y, pointerId: 9, bubbles: true })); host.dispatchEvent(new PointerEvent('pointerup', { clientX: x, clientY: y, pointerId: 9, bubbles: true })); },
    arm: spec => arm(spec), finishSetup, enterSetup, undo, redo, select: i => select(lamps[i] || null),
    setCalib: c => { Object.assign(room.calib, c); solveAndBuild(); drawGuides(); return $('#rsFit', work).textContent; },
    get calib() { return JSON.parse(JSON.stringify(room.calib)); },
    debug: () => ({
      lampObjects: lampGroup.children.length, inScene: lampGroup.parent === scene,
      camera: camera.position.toArray().map(v => +v.toFixed(2)), fov: +camera.fov.toFixed(1), aspect: +camera.aspect.toFixed(3),
      lamps: lamps.map(l => { const p = l.obj.holder.getWorldPosition(new THREE.Vector3()); const ndc = p.clone().project(camera); return { world: p.toArray().map(v => +v.toFixed(2)), ndc: ndc.toArray().map(v => +v.toFixed(2)), scale: l.obj.sized.scale.x, meshes: (() => { let n = 0; l.obj.holder.traverse(o => { if (o.isMesh) n++; }); return n; })(), visible: l.obj.holder.visible }; }),
      uCount: shared.uCount.value, evening: shared.uEvening.value, power: shared.uLampPower.value.slice(0, lamps.length)
    }),
    debugRender: (showRoom = true) => {
      roomGroup.visible = showRoom; renderNow();
      const info = { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, image: renderer.domElement.toDataURL('image/jpeg', 0.8) };
      roomGroup.visible = true; renderNow();
      return info;
    }
  };

  return { loadFile, loadSample, openSaved, arm, hasRoom, showStart };
}

/* =====================================================================
   PANEL MARKUP
   ===================================================================== */

function workMarkup() {
  const filters = [['all', 'All'], ...CATEGORY_ORDER.map(k => [k, CATEGORY[k].plural])];
  return `
  <div class="rs-layout">
    <div class="rs-stage" id="rsStage">
      <div class="rs-canvas" id="rsCanvas" tabindex="0" role="application" aria-label="Your room. Drag to look around. Tap a light to select it, drag it to move it; arrow keys move the selected light."></div>
      <svg class="rs-guides" id="rsGuides" hidden></svg>
      <div class="rs-tools" role="group" aria-label="View">
        <button class="stage-btn" type="button" id="rsUndo" aria-label="Undo" disabled>${icon('reset')}</button>
        <button class="stage-btn rs-redo" type="button" id="rsRedo" aria-label="Redo" disabled>${icon('reset')}</button>
        <button class="stage-btn" type="button" id="rsLines" aria-pressed="false" aria-label="Show the room outline">${icon('grid')}</button>
        <button class="stage-btn" type="button" id="rsFull" aria-pressed="false" aria-label="Large view">${icon('image')}</button>
      </div>
      <div class="rs-zoom" role="group" aria-label="Zoom">
        <button class="stage-btn" type="button" id="rsZoomOut" aria-label="Zoom out">${icon('minus')}</button>
        <button class="stage-btn" type="button" id="rsReset" aria-label="Back to the photo view">${icon('rotate')}</button>
        <button class="stage-btn" type="button" id="rsZoomIn" aria-label="Zoom in">${icon('plus')}</button>
      </div>
      <p class="rs-hint" id="rsHint" role="status"></p>
    </div>

    <div class="rs-panel">
      <div data-rs-step="setup">
        <h3 class="rs-title"><span class="step-badge">1</span>Match your room</h3>
        <div id="rsSetupPhoto">
          <p class="rs-help">Drag the four dots: the <b class="rs-key is-ceil">gold line</b> to where the ceiling meets the back wall, the <b class="rs-key is-floor">light line</b> to where the floor meets it. Put a dot on a corner if you can see it; if the wall carries on past the photo, put the dot on the edge of the photo.</p>
          <div class="rs-row">
            <label class="rs-field"><span>Camera lens</span>
              <select id="rsLens"><option value="auto">From the photo</option><option value="normal">Normal (1×)</option><option value="wide">Wide (0.5×)</option><option value="custom" hidden>Set by distance</option></select></label>
            <label class="rs-field"><span>Back wall is about (m)</span><input type="number" id="rsDepth" min="1.5" max="20" step="0.1" inputmode="decimal"></label>
          </div>
          <p class="rs-help">The distance is a guess from the photo. If you know it roughly (say, the length of the room), type it in: lights then appear at the right size everywhere in the room.</p>
        </div>
        <div id="rsSetupPano" hidden>
          <p class="rs-help">Your 360° photo. Drag to look around, then size the gold box until its edges sit on your walls.</p>
          <label class="rs-field"><span>Room width <output>4.0 m</output></span><input type="range" id="rsPanoW" min="2" max="12" step="0.1" value="4"></label>
          <label class="rs-field"><span>Room length <output>5.0 m</output></span><input type="range" id="rsPanoL" min="2" max="15" step="0.1" value="5"></label>
          <label class="rs-field"><span>Turn the box <output>0°</output></span><input type="range" id="rsPanoYaw" min="-180" max="180" step="1" value="0"></label>
        </div>
        <div class="rs-row">
          <label class="rs-field"><span>Ceiling height (m)</span><input type="number" id="rsCeil" min="2" max="6" step="0.05" value="2.80" inputmode="decimal"></label>
          <label class="rs-field"><span>Camera height (m)</span><input type="number" id="rsCamH" min="0.5" max="2.2" step="0.05" value="1.50" inputmode="decimal"></label>
        </div>
        <p class="rs-fit" id="rsFit" role="status"></p>
        <button class="btn btn--primary btn--block" type="button" id="rsDone">Continue: add lights</button>
      </div>

      <div data-rs-step="design" hidden>
        <div id="rsSelected" class="rs-selected" hidden></div>
        <label class="rs-field"><span>Evening light <output class="rs-note">whole room</output></span><input type="range" id="rsEvening" min="0" max="100" step="5" value="35"></label>
        <h3 class="rs-title"><span class="step-badge">2</span>Add lights</h3>
        <div class="rs-filters" role="group" aria-label="Type">${filters.map(([k, l], i) => `<button class="chip" type="button" data-rs-filter="${k}" aria-pressed="${i === 0}">${l}</button>`).join('')}</div>
        <label class="search-field rs-search"><span class="visually-hidden">Search designs</span>${icon('search')}<input id="rsSearch" type="search" placeholder="Search designs" autocomplete="off"></label>
        <div class="rs-library" id="rsLibrary"></div>
        <h3 class="rs-title">Your lights <span id="rsCount"></span></h3>
        <ul class="rs-lamps" id="rsLamps"></ul>
        <div class="rs-actions">
          <button class="btn btn--primary btn--block" type="button" id="rsSend" disabled>${icon('calendar')}Send my design to LumaDesign</button>
          <button class="btn btn--outline" type="button" id="rsSave">${icon('heart')}Save on this device</button>
          <button class="btn btn--outline" type="button" id="rsEditRoom">Adjust the room</button>
          <button class="text-link text-link--btn" type="button" id="rsNewPhoto">Use a different photo</button>
        </div>
        <p class="fine">A preview of how the lights could look. Sizes are close to real; final details are confirmed in your consultation.</p>
      </div>
    </div>
  </div>`;
}
