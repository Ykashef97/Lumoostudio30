/* 3D size preview for the lamp designer.
   Loaded on demand by app.js the first time someone opens the "3D size preview" tab,
   so visitors who never use it do not download the 3D engine. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const host = document.querySelector('#threeMount');
const status = document.querySelector('#threeMessage');
const BACKDROP = 0xe9e5da;

try {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BACKDROP);
  scene.fog = new THREE.Fog(BACKDROP, 9, 17);

  const width = host.clientWidth || 600, height = host.clientHeight || 480;
  const camera = new THREE.PerspectiveCamera(33, width / height, .1, 100);
  camera.position.set(4.4, 3.8, 7.2);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  host.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1.5, 0);
  controls.enableDamping = true;
  controls.minDistance = 4;
  controls.maxDistance = 11;
  controls.maxPolarAngle = Math.PI * .83;

  scene.add(new THREE.HemisphereLight(0xfff4df, 0x746958, 2.1));
  const key = new THREE.DirectionalLight(0xffe2a8, 3);
  key.position.set(3, 6, 4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xdce5ff, 1.1);
  fill.position.set(-4, 2, -2);
  scene.add(fill);

  const floor = new THREE.Mesh(new THREE.CircleGeometry(4, 64), new THREE.MeshStandardMaterial({ color: 0xe8e2d6, roughness: .86 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -.05;
  scene.add(floor);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.25, 64), new THREE.MeshBasicMaterial({ color: 0x8d8679, transparent: true, opacity: .12 }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -.035;
  scene.add(shadow);

  const lamp = new THREE.Group();
  scene.add(lamp);
  let canopyGroup, cordGroup, shadeGroup, bulbGroup, glow;

  const mat = (color, rough = .65, metal = 0) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, side: THREE.DoubleSide });
  const cylinder = (r1, r2, h, material, segments = 48) => new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, segments, 1, false), material);

  function rebuild(b) {
    lamp.clear();
    const metal = mat(0x4b4b46, .35, .78);
    const cordMat = mat(b.cord === 'white' ? 0xe9e5da : 0x242420, .88);
    const shadeMat = mat(({ white: 0xf0ede3, black: 0x292926, brass: 0xb58a4d })[b.style] || 0xf0ede3, .82, b.style === 'brass' ? .52 : .04);

    canopyGroup = new THREE.Group();
    canopyGroup.add(cylinder(.18, .21, .12, metal));
    canopyGroup.position.y = 3.03;
    lamp.add(canopyGroup);

    cordGroup = new THREE.Group();
    const cord = cylinder(.018, .018, 1.15, cordMat, 16);
    cord.position.y = .57;
    cordGroup.add(cord);
    const socket = cylinder(.1, .095, .23, metal);
    socket.position.y = -.05;
    cordGroup.add(socket);
    cordGroup.position.y = 2.34;
    lamp.add(cordGroup);

    // The shade outline follows the chosen design's general shape.
    shadeGroup = new THREE.Group();
    const radius = { 19: .39, 33: .62, 42: .78 }[b.shade], height = { 19: .43, 33: .60, 42: .72 }[b.shade];
    const design = (b.fixtureName || '').toLowerCase();
    const round = /globe|sphere|bubble|orb/.test(design);
    let geometry;
    if (round) geometry = new THREE.SphereGeometry(radius * .82, 48, 32);
    else if (/ring|loop|sputnik|starburst/.test(design)) { geometry = new THREE.TorusGeometry(radius * .72, .09, 12, 64); geometry.rotateX(Math.PI / 2); }
    else if (/linear|bar/.test(design)) geometry = new THREE.BoxGeometry(radius * 2, .16, Math.max(.2, radius * .34));
    else geometry = new THREE.CylinderGeometry(radius * .52, radius, height, 64, 1, true);
    const body = new THREE.Mesh(geometry, shadeMat);
    body.position.y = round ? height * .55 : height / 2;
    shadeGroup.add(body);
    const topRing = new THREE.Mesh(new THREE.TorusGeometry(radius * .52, .018, 8, 64), metal);
    topRing.rotation.x = Math.PI / 2;
    topRing.position.y = height;
    shadeGroup.add(topRing);
    const bottomRing = new THREE.Mesh(new THREE.TorusGeometry(radius, .022, 8, 64), metal);
    bottomRing.rotation.x = Math.PI / 2;
    bottomRing.position.y = .018;
    shadeGroup.add(bottomRing);
    shadeGroup.position.y = 1.1;
    lamp.add(shadeGroup);

    bulbGroup = new THREE.Group();
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(.13, 24, 18), new THREE.MeshStandardMaterial({ color: 0xffe7a6, emissive: 0xffb833, emissiveIntensity: 1.7, roughness: .28 }));
    bulb.position.y = .36;
    bulbGroup.add(bulb);
    const neck = cylinder(.055, .05, .11, metal, 24);
    neck.position.y = .2;
    bulbGroup.add(neck);
    bulbGroup.position.y = 1.1;
    lamp.add(bulbGroup);

    glow = new THREE.PointLight(0xffd278, 9, 3.2, 2);
    glow.position.set(0, 1.39, 0);
    lamp.add(glow);

    const apart = !!b.explode;
    canopyGroup.position.y = apart ? 3.45 : 3.03;
    cordGroup.position.y = apart ? 2.58 : 2.34;
    shadeGroup.position.y = apart ? 1.08 : 1.1;
    bulbGroup.position.y = apart ? .52 : 1.1;
    glow.position.y = apart ? .81 : 1.39;
  }

  window.updateLuma3D = b => { rebuild(b); status.hidden = true; };
  window.resetLumaView = () => { camera.position.set(4.4, 3.8, 7.2); controls.target.set(0, 1.5, 0); controls.update(); };

  new ResizeObserver(() => {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return; // tab is hidden
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }).observe(host);

  (function loop() {
    requestAnimationFrame(loop);
    if (!host.clientWidth) return; // skip drawing while the Photo tab is showing
    controls.update();
    renderer.render(scene, camera);
  })();

  window.updateLuma3D(window.lumaBuild || { shade: 42, style: 'white', cord: 'white', explode: false });
} catch (error) {
  console.error(error);
  status.hidden = false;
  status.textContent = 'The 3D preview is not available in this browser. The photo preview still works.';
}
