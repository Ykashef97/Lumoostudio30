/* Builds one 3D lamp (materials, finish, cord and the design's shape). Shared by the lamp
   designer (builder3d.js) and the Room Studio (roomstudio.js), so both show the same models.
   Model units: about 1 unit = the lamp's width. Ceiling and hanging lights start at y = 0
   (the ceiling) and hang down; wall lights start at z = 0 (the wall) and come out along +z. */
import * as THREE from 'three';
import { buildBody } from './models3d.js';

export const MOUNT = { sconces: 'wall', ceiling: 'ceiling', chandeliers: 'pendant' };
export const FINISHES = {
  white: { color: 0xeee8da, metalness: 0.12, roughness: 0.45 },
  black: { color: 0x222220, metalness: 0.35, roughness: 0.48 },
  brass: { color: 0xc99f60, metalness: 1, roughness: 0.3 }
};
export const CORDS = { white: 0xe9e5da, black: 0x242420 };

// Rows of bright crystal beads on warm gaps, for crystal drums (reads on light and dark backgrounds).
let crystal = null;
function crystalTexture() {
  if (crystal) return crystal;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#8a6a3c';
  ctx.fillRect(0, 0, 128, 128);
  for (let x = 0; x < 128; x += 8) {
    for (let y = 0; y < 128; y += 10) {
      const grad = ctx.createRadialGradient(x + 4, y + 5, 0, x + 4, y + 5, 5);
      grad.addColorStop(0, '#fffaf0');
      grad.addColorStop(0.5, '#f1d6a2');
      grad.addColorStop(1, '#8a6a3c');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, 8, 10);
    }
  }
  crystal = new THREE.CanvasTexture(canvas);
  crystal.colorSpace = THREE.SRGBColorSpace;
  crystal.wrapS = crystal.wrapT = THREE.RepeatWrapping;
  crystal.repeat.set(8, 2);
  return crystal;
}

let lattice = null;
function latticeTexture() {
  if (lattice) return lattice;
  const size = 128, canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 15;
  for (let i = -size; i <= size * 2; i += 42) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + size, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i, size); ctx.lineTo(i + size, 0); ctx.stroke();
  }
  lattice = new THREE.CanvasTexture(canvas);
  lattice.wrapS = lattice.wrapT = THREE.RepeatWrapping;
  lattice.repeat.set(12, 5);
  return lattice;
}

export function makeMaterials() {
  const metal = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.5, roughness: 0.4 });
  const metalDouble = metal.clone();
  metalDouble.side = THREE.DoubleSide;
  const metalFlat = metal.clone();
  metalFlat.flatShading = true;
  const glass = { color: 0xffffff, metalness: 0, roughness: 0.05, transparent: true, opacity: 0.2, envMapIntensity: 1.8, side: THREE.DoubleSide, depthWrite: false };
  return {
    metal, metalDouble, metalFlat,
    socket: new THREE.MeshStandardMaterial({ color: 0x2c2a27, metalness: 0.6, roughness: 0.4 }),
    white: new THREE.MeshStandardMaterial({ color: 0xf4f0e8, roughness: 0.55 }),
    fabric: new THREE.MeshStandardMaterial({ color: 0xf1e9da, roughness: 0.95, side: THREE.DoubleSide, emissive: 0xffc98a, emissiveIntensity: 0.32 }),
    opal: new THREE.MeshStandardMaterial({ color: 0xfff8ee, roughness: 0.35, emissive: 0xffe2b5, emissiveIntensity: 0.95 }),
    glass: new THREE.MeshPhysicalMaterial(glass),
    glassTextured: new THREE.MeshPhysicalMaterial({ ...glass, roughness: 0.3, opacity: 0.38, flatShading: true }),
    amber: new THREE.MeshPhysicalMaterial({ ...glass, color: 0xe9a75a, opacity: 0.45, roughness: 0.15 }),
    bubble: new THREE.MeshPhysicalMaterial({ ...glass, color: 0xf6efe2, opacity: 0.42, roughness: 0.04, envMapIntensity: 2.6 }),
    // Clear glass that still shows its outline (glass tubes, large bubbles).
    clearGlass: new THREE.MeshPhysicalMaterial({ ...glass, color: 0xfbf6ec, opacity: 0.3, roughness: 0.03, envMapIntensity: 2.8 }),
    // Glowing beaded sleeve behind crystal rods, so a crystal drum reads as one shimmering band.
    veil: new THREE.MeshStandardMaterial({ map: crystalTexture(), emissiveMap: crystalTexture(), color: 0xffffff, emissive: 0xffd6a0, emissiveIntensity: 0.55, transparent: true, opacity: 0.85, roughness: 0.3, metalness: 0.1, side: THREE.DoubleSide, depthWrite: false }),
    wood: new THREE.MeshStandardMaterial({ color: 0xb08350, roughness: 0.6, emissive: 0x3a1e05, emissiveIntensity: 0.15 }),
    crystal: new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0.2, roughness: 0.02, transparent: true, opacity: 0.6, envMapIntensity: 3, flatShading: true }),
    rattan: new THREE.MeshStandardMaterial({ color: 0xc89b5f, roughness: 0.9, alphaMap: latticeTexture(), alphaTest: 0.5, side: THREE.DoubleSide, emissive: 0x6b3d0e, emissiveIntensity: 0.35 }),
    rattanSolid: new THREE.MeshStandardMaterial({ color: 0xb4874f, roughness: 0.85 }),
    bulb: new THREE.MeshStandardMaterial({ color: 0xfff3d6, emissive: 0xffc56e, emissiveIntensity: 2.6, roughness: 0.3 }),
    led: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff0d6, emissiveIntensity: 1.8, roughness: 0.5, side: THREE.DoubleSide }),
    cord: new THREE.MeshStandardMaterial({ color: CORDS.white, roughness: 0.85 }),
    beam: new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
  };
}

// All metal materials take the chosen finish; cords take the chosen cord colour.
export function applyFinish(mat, finish, cord) {
  const f = FINISHES[finish] || FINISHES.white;
  [mat.metal, mat.metalDouble, mat.metalFlat].forEach(m => { m.color.setHex(f.color); m.metalness = f.metalness; m.roughness = f.roughness; });
  if (cord !== undefined) mat.cord.color.setHex(CORDS[cord] || CORDS.white);
}

// The lamp's shape in four groups (mount, link, body, light) inside one group.
// key: the design's category ('sconces' | 'ceiling' | 'chandeliers'); model: its 3D shape, e.g. 'sconces:3'.
export function buildLampModel(mat, key, model) {
  const group = new THREE.Group();
  const parts = { mount: new THREE.Group(), link: new THREE.Group(), body: new THREE.Group(), light: new THREE.Group() };
  Object.values(parts).forEach(g => group.add(g));
  const mount = MOUNT[key];
  const [shapeKey, shapeIndex] = String(model).split(':');
  buildBody({ parts, mat, mount }, shapeKey, +shapeIndex);
  if (mount === 'wall') {
    // Plug-in cord running down the wall from the back plate.
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.1, 0.03), new THREE.Vector3(0.01, -0.45, 0.04),
      new THREE.Vector3(0.05, -0.9, 0.035), new THREE.Vector3(0.09, -1.35, 0.03)
    ]);
    const cordMesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.011, 8), mat.cord);
    cordMesh.userData.cord = true;
    parts.link.add(cordMesh);
  }
  return { group, parts, mount };
}

export function disposeGroup(group) {
  group.traverse(o => { if (o.geometry) o.geometry.dispose(); });
}
