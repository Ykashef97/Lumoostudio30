/* 3D stage for the lamp designer.
   Loaded on demand by home.js when the designer is about to come into view, so
   visitors who never reach it do not download the 3D engine. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MOUNT, makeMaterials, applyFinish as finishMaterials, buildLampModel } from './lamp3d.js';

const CM = 0.1;                       // 1 scene unit = 10 cm
const FOV = 30;
const BACKDROP = 0xe9e5da;            // matches --sand in styles.css
// Starting angle for each kind of light, in degrees: around (azimuth) and from the top (polar).
const VIEWS = { wall: [38, 80], ceiling: [28, 104], pendant: [30, 90] };
// How far each group of parts moves when exploded (in model units, before sizing).
const EXPLODE = {
  wall: { mount: [0, 0, 0], link: [0, 0, 0.16], body: [0, 0, 0.4], light: [0, 0, 0.68] },
  hang: { mount: [0, 0, 0], link: [0, -0.16, 0], body: [0, -0.4, 0], light: [0, -0.72, 0] }
};

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const ease = t => 1 - Math.pow(1 - t, 3);
const deg = d => (d * Math.PI) / 180;

export function createStage(host, { onUserInteract } = {}) {
  /* ---------- Renderer, scene, camera ---------- */
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BACKDROP);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  pmrem.dispose();

  scene.add(new THREE.HemisphereLight(0xfff4e5, 0x8a7f70, 1.1));
  const key = new THREE.DirectionalLight(0xffe6c0, 2.2);
  key.position.set(4, 6, 5);
  const fill = new THREE.DirectionalLight(0xdfe8ff, 0.6);
  fill.position.set(-5, 2, -3);
  scene.add(key, fill);

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 300);
  camera.position.set(6, 2, 10);

  // One-sided wall and ceiling: seen from the room, they disappear when you look from behind.
  // Sized to the model in frame(), so their edges show as the view turns.
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0xd9cfbe, roughness: 0.95 }));
  wall.position.z = -0.003;
  const ceiling = new THREE.Mesh(new THREE.CircleGeometry(1, 72), new THREE.MeshStandardMaterial({ color: 0xf3eee6, roughness: 0.95 }));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = 0.003;
  scene.add(wall, ceiling);

  const glow = new THREE.PointLight(0xffcf8a, 0, 0, 2);
  scene.add(glow);

  const mat = makeMaterials();
  const root = new THREE.Group();     // carries the chosen size
  scene.add(root);

  /* ---------- Controls: 360° turn, tilt, zoom ---------- */
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.rotateSpeed = 0.9;
  controls.zoomSpeed = 0.9;
  controls.minPolarAngle = 0.06;
  controls.maxPolarAngle = Math.PI - 0.06;
  controls.autoRotate = !reducedMotion();
  controls.autoRotateSpeed = 1.6;
  // Scroll-to-zoom only after the visitor presses on the model, so scrolling the page past it still scrolls.
  controls.enableZoom = false;
  host.addEventListener('pointerdown', () => { controls.enableZoom = true; }, { capture: true });
  host.addEventListener('pointerleave', () => { controls.enableZoom = false; });

  let interacted = false;
  function userInteracted() {
    if (controls.autoRotate) setAutoRotate(false);
    if (!interacted) { interacted = true; if (onUserInteract) onUserInteract(); }
  }
  controls.addEventListener('start', userInteracted);

  /* ---------- Model state ---------- */
  const state = { key: null, index: -1, mount: null, size: 42, scaleNow: 4.2, scaleTarget: 4.2, explodeNow: 0, explodeTarget: 0, swap: 1, distance: 12 };
  let model = null, parts = null;
  let tween = null;

  function disposeModel() {
    if (!model) return;
    model.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    root.remove(model);
    model = null;
  }

  function buildModel(b) {
    disposeModel();
    // The 3D shape chosen for the design in the admin portal, e.g. "sconces:3" (shared with the Room Studio).
    const built = buildLampModel(mat, b.fixtureCategory, b.fixtureModel || b.fixtureCategory + ':' + b.fixtureIndex);
    model = built.group;
    parts = built.parts;
    const mount = built.mount;
    root.add(model);
    state.key = b.fixtureCategory;
    state.index = b.fixtureIndex;
    state.model = b.fixtureModel;
    state.mount = mount;
    wall.visible = mount === 'wall';
    ceiling.visible = mount !== 'wall';
    state.swap = reducedMotion() ? 1 : 0;
  }

  function applyExplode(t) {
    if (!parts) return;
    const offsets = EXPLODE[state.mount === 'wall' ? 'wall' : 'hang'];
    Object.entries(parts).forEach(([name, group]) => group.position.set(...offsets[name].map(n => n * t)));
  }

  function applyFinish(name) { finishMaterials(mat, name); }

  // Box around the parts that matter for framing (cords and light beams excluded).
  function frameBox() {
    root.updateMatrixWorld(true);
    const box = new THREE.Box3();
    [parts.mount, parts.body, parts.light].forEach(g => g.traverse(o => {
      if (o.isMesh && o.material !== mat.beam) box.expandByObject(o);
    }));
    return box;
  }

  // Frame the model at its largest size, so smaller sizes visibly look smaller.
  // Exploded parts are included, so pulling them apart keeps everything in view.
  function frame(resetAngles) {
    const keepScale = root.scale.x, keepExplode = state.explodeNow;
    applyExplode(state.explodeTarget);
    root.scale.setScalar(state.scaleTarget);
    const box = frameBox();
    const center = box.getCenter(new THREE.Vector3());
    const radius = box.getBoundingSphere(new THREE.Sphere()).radius * (42 / state.size);
    root.scale.setScalar(keepScale);
    applyExplode(keepExplode);

    const distance = Math.max(2.5, (radius / Math.sin(deg(FOV / 2))) * 1.4);

    // Wall panel or ceiling disc in proportion to the largest size of this design.
    const full = box.getSize(new THREE.Vector3()).multiplyScalar(42 / state.size);
    wall.scale.set(Math.max(full.x * 3.2, 5), Math.max(full.y * 2.4, 6), 1);
    wall.position.set(0, center.y, -0.003);
    const reach = Math.max(full.x, full.z);
    ceiling.scale.setScalar(Math.max(reach * 1.25, 3));
    state.distance = distance;
    controls.minDistance = distance * 0.3;
    controls.maxDistance = distance * 2.2;

    const offset = camera.position.clone().sub(controls.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    if (resetAngles) {
      const [az, pol] = VIEWS[state.mount];
      spherical.theta = deg(az);
      spherical.phi = deg(pol);
    }
    spherical.radius = distance;
    moveCamera(center, spherical);

    // A warm light where the bulbs are, so shades glow and the wall or ceiling catches it.
    const lightBox = new THREE.Box3();
    root.scale.setScalar(state.scaleTarget);
    root.updateMatrixWorld(true);
    parts.light.traverse(o => { if (o.isMesh && o.material !== mat.beam) lightBox.expandByObject(o); });
    root.scale.setScalar(keepScale);
    const lightCenter = lightBox.isEmpty() ? center : lightBox.getCenter(new THREE.Vector3());
    glow.position.copy(lightCenter);
    glow.intensity = 3.2 * Math.pow(state.size / 42, 2);
  }

  function moveCamera(target, spherical, duration = 0.6) {
    const toPos = new THREE.Vector3().setFromSpherical(spherical).add(target);
    if (reducedMotion() || duration === 0) {
      tween = null;
      controls.target.copy(target);
      camera.position.copy(toPos);
      controls.update();
      return;
    }
    tween = { t: 0, duration, fromTarget: controls.target.clone(), toTarget: target.clone(), fromPos: camera.position.clone(), toPos };
  }

  /* ---------- Public controls ---------- */
  function setAutoRotate(on) {
    controls.autoRotate = Boolean(on);
    host.dispatchEvent(new CustomEvent('autorotatechange', { detail: controls.autoRotate }));
  }

  function orbitBy(dTheta, dPhi, zoomFactor = 1) {
    userInteracted();
    const offset = camera.position.clone().sub(controls.target);
    const s = new THREE.Spherical().setFromVector3(offset);
    s.theta += dTheta;
    s.phi = THREE.MathUtils.clamp(s.phi + dPhi, controls.minPolarAngle, controls.maxPolarAngle);
    s.radius = THREE.MathUtils.clamp(s.radius * zoomFactor, controls.minDistance, controls.maxDistance);
    moveCamera(controls.target.clone(), s, 0.35);
  }

  host.addEventListener('keydown', e => {
    const actions = {
      ArrowLeft: () => orbitBy(deg(-20), 0), ArrowRight: () => orbitBy(deg(20), 0),
      ArrowUp: () => orbitBy(0, deg(-12)), ArrowDown: () => orbitBy(0, deg(12)),
      '+': () => orbitBy(0, 0, 0.8), '=': () => orbitBy(0, 0, 0.8), '-': () => orbitBy(0, 0, 1.25),
      Home: () => api.reset(), '0': () => api.reset()
    };
    if (actions[e.key]) { e.preventDefault(); actions[e.key](); }
  });

  /* ---------- Animation loop (runs only while visible) ---------- */
  let running = false, last = 0, onScreen = true;

  function tick(dt) {
    if (tween) {
      tween.t = Math.min(1, tween.t + dt / tween.duration);
      const k = ease(tween.t);
      controls.target.lerpVectors(tween.fromTarget, tween.toTarget, k);
      camera.position.lerpVectors(tween.fromPos, tween.toPos, k);
      if (tween.t >= 1) tween = null;
    }
    const rate = reducedMotion() ? 1 : Math.min(1, dt * 9);
    state.scaleNow += (state.scaleTarget - state.scaleNow) * rate;
    state.explodeNow += (state.explodeTarget - state.explodeNow) * rate;
    state.swap = Math.min(1, state.swap + dt / 0.35);
    root.scale.setScalar(state.scaleNow);
    applyExplode(state.explodeNow);
    if (model) model.scale.setScalar(0.92 + 0.08 * ease(state.swap));
    controls.update(dt);
    renderer.render(scene, camera);
  }

  function loop(now) {
    if (!running) return;
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    if (host.clientWidth) tick(dt);
  }

  function setRunning(on) {
    if (on === running) return;
    running = on;
    if (on) { last = performance.now(); requestAnimationFrame(loop); }
  }
  const syncRunning = () => setRunning(onScreen && !document.hidden);
  document.addEventListener('visibilitychange', syncRunning);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => { onScreen = entries[0].isIntersecting; syncRunning(); }).observe(host);
  }

  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    const size = renderer.getSize(new THREE.Vector2());
    if (size.x === w && size.y === h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(host);
  resize();

  /* ---------- What home.js uses ---------- */
  const api = {
    // b: { fixtureCategory, fixtureIndex, fixtureModel, shade (cm), style (finish), cord, explode }
    update(b) {
      const designChanged = b.fixtureCategory !== state.key || b.fixtureIndex !== state.index || b.fixtureModel !== state.model;
      const mountChanged = MOUNT[b.fixtureCategory] !== state.mount;
      const sizeChanged = b.shade !== state.size;
      const explodeChanged = (b.explode ? 1 : 0) !== state.explodeTarget;
      if (designChanged) buildModel(b);
      applyFinish(b.style);
      finishMaterials(mat, b.style, b.cord);
      state.size = b.shade;
      state.scaleTarget = b.shade * CM;
      state.explodeTarget = b.explode ? 1 : 0;
      if (designChanged) { state.scaleNow = state.scaleTarget; root.scale.setScalar(state.scaleNow); }
      if (designChanged || sizeChanged || explodeChanged) frame(mountChanged);
      host.setAttribute('aria-label', '3D view of the ' + (b.fixtureName || 'lamp') + '. Drag to turn it all the way round. Arrow keys turn, plus and minus zoom.');
    },
    reset() {
      const [az, pol] = VIEWS[state.mount || 'pendant'];
      const s = new THREE.Spherical(state.distance, deg(pol), deg(az));
      const box = (root.scale.setScalar(state.scaleTarget), frameBox());
      moveCamera(box.getCenter(new THREE.Vector3()), s);
    },
    zoom(direction) { orbitBy(0, 0, direction > 0 ? 0.8 : 1.25); },
    rotate(direction) { orbitBy(deg(45) * direction, 0); },
    setAutoRotate,
    get autoRotate() { return controls.autoRotate; },
    // For testing: draw frames on demand (a hidden browser tab pauses animation), put the camera
    // at an exact angle, and count what is drawn.
    renderFrames(count = 30) { resize(); for (let i = 0; i < count; i++) tick(1 / 30); },
    snapshot() { resize(); tick(1 / 30); return renderer.domElement.toDataURL('image/jpeg', 0.85); },
    setView(azimuthDeg, polarDeg) {
      const s = new THREE.Spherical(state.distance, deg(polarDeg), deg(azimuthDeg));
      moveCamera(controls.target.clone(), s, 0);
    },
    get view() {
      const s = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
      return { azimuth: Math.round(THREE.MathUtils.radToDeg(s.theta)), polar: Math.round(THREE.MathUtils.radToDeg(s.phi)), distance: +s.radius.toFixed(2) };
    },
    stats() {
      let meshes = 0, triangles = 0;
      model.traverse(o => {
        if (!o.isMesh) return;
        meshes++;
        const g = o.geometry, n = g.index ? g.index.count / 3 : g.attributes.position.count / 3;
        triangles += n * (o.isInstancedMesh ? o.count : 1);
      });
      root.scale.setScalar(state.scaleTarget);
      const size = frameBox().getSize(new THREE.Vector3());
      root.scale.setScalar(state.scaleNow);
      return { meshes, triangles: Math.round(triangles), widthCm: Math.round(Math.max(size.x, size.z) / CM), heightCm: Math.round(size.y / CM), mount: state.mount };
    }
  };

  syncRunning();
  return api;
}
