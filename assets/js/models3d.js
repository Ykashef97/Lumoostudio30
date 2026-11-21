/* 3D models for every design in the collection.
   Each design maps to a builder plus settings (RECIPES at the bottom). Builders draw
   at a nominal width of about 1 unit; the stage scales the result to the chosen size.
   Parts go into four groups so they can be pulled apart ("explode"):
     mount = what fixes it to the wall or ceiling, link = arm, stem or cords,
     body  = shade, frame or glass,                light = bulbs and glowing panels.
   Coordinates: ceiling and hanging lights start at y = 0 (the ceiling) and hang down;
   wall lights start at z = 0 (the wall) and come out towards +z. */
import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);
const TAU = Math.PI * 2;
const v = (x, y, z) => new THREE.Vector3(x, y, z);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _e = new THREE.Euler();

// Repeatable "random" numbers, so a design always looks the same.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- Drawing helpers ---------- */

function add(parent, geo, mat, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

// A straight rod between two points.
function rod(parent, mat, a, b, r = 0.012, seg = 10) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, dir.length(), seg, 1), mat);
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(UP, dir.normalize());
  parent.add(mesh);
  return mesh;
}

// A smooth tube through a list of points (arms, curls, sculptural strips).
function tube(parent, mat, pts, r = 0.014, closed = false, steps) {
  const curve = new THREE.CatmullRomCurve3(pts, closed, 'catmullrom', 0.5);
  return add(parent, new THREE.TubeGeometry(curve, steps || Math.max(32, pts.length * 24), r, 10, closed), mat);
}

// A turned shape from [radius, height] pairs (domes, bells, balusters).
function lathe(parent, mat, profile, seg = 64) {
  return add(parent, new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0001), y)), seg), mat);
}

// A flat horizontal ring.
function hoop(parent, mat, R, r, y = 0, seg = 96) {
  const mesh = add(parent, new THREE.TorusGeometry(R, r, 10, seg), mat, 0, y, 0);
  mesh.rotation.x = Math.PI / 2;
  return mesh;
}

// Many copies of one shape, drawn in a single call (crystals, globes, bulbs).
// Each item: { p:[x,y,z], r:[x,y,z] (rotation), q:Quaternion, s:number|[x,y,z] }
function instances(parent, geo, mat, list) {
  const mesh = new THREE.InstancedMesh(geo, mat, list.length);
  list.forEach((item, i) => {
    _p.set(item.p[0], item.p[1], item.p[2]);
    if (item.q) _q.copy(item.q); else _q.setFromEuler(_e.set(...(item.r || [0, 0, 0])));
    const s = item.s === undefined ? 1 : item.s;
    if (typeof s === 'number') _s.set(s, s, s); else _s.set(s[0], s[1], s[2]);
    mesh.setMatrixAt(i, _m.compose(_p, _q, _s));
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingBox();
  mesh.computeBoundingSphere();
  parent.add(mesh);
  return mesh;
}

// Rotation that points an object's local Y axis along `dir`.
const aim = dir => new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());

// Pleats: pushes the outline in and out around a shade.
function pleat(geo, count, depth) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const k = 1 + depth * Math.abs(Math.sin(Math.atan2(z, x) * count));
    pos.setX(i, x * k);
    pos.setZ(i, z * k);
  }
  geo.computeVertexNormals();
  return geo;
}

/* ---------- Bulbs and fixings ---------- */

const BULB_SHAPE = { round: [1, 1, 1], edison: [0.85, 1.3, 0.85], candle: [0.55, 1.5, 0.55], tiny: [1, 1, 1] };

function bulbs(k, points, kind = 'round', r = 0.045) {
  if (!points.length) return null;
  const geo = new THREE.SphereGeometry(r, 18, 14);
  return instances(k.parts.light, geo, k.mat.bulb, points.map(p => ({ p: [p.x, p.y, p.z], s: BULB_SHAPE[kind] })));
}

function candles(k, points, h = 0.11) {
  instances(k.parts.body, new THREE.CylinderGeometry(0.022, 0.022, h, 16), k.mat.white,
    points.map(p => ({ p: [p.x, p.y + h / 2, p.z] })));
  instances(k.parts.body, new THREE.CylinderGeometry(0.04, 0.03, 0.025, 16), k.mat.metal,
    points.map(p => ({ p: [p.x, p.y, p.z] })));
  bulbs(k, points.map(p => v(p.x, p.y + h + 0.035, p.z)), 'candle', 0.035);
}

function sockets(k, points, dir = UP) {
  instances(k.parts.link, new THREE.CylinderGeometry(0.022, 0.026, 0.06, 14), k.mat.socket,
    points.map(p => ({ p: [p.x, p.y, p.z], q: aim(dir) })));
}

// Ceiling plate; returns its depth.
function canopy(k, r = 0.11, h = 0.05) {
  add(k.parts.mount, new THREE.CylinderGeometry(r * 0.9, r, h, 40), k.mat.metal, 0, -h / 2, 0);
  return h;
}

// Cords straight up from each point to the ceiling.
function cordsUp(k, points, r = 0.008) {
  points.forEach(p => rod(k.parts.link, k.mat.cord, v(p.x, -0.02, p.z), p, r, 8));
}

function wallPlate(k, shape = 'round') {
  let mesh;
  if (shape === 'rect') mesh = add(k.parts.mount, new THREE.BoxGeometry(0.12, 0.3, 0.035), k.mat.metal, 0, 0, 0.0175);
  else {
    mesh = add(k.parts.mount, new THREE.CylinderGeometry(0.095, 0.095, 0.035, 40), k.mat.metal, 0, 0, 0.0175);
    mesh.rotation.x = Math.PI / 2;
    if (shape === 'oval') mesh.scale.set(1, 1, 1.7);
  }
  return mesh;
}

// Hanging lights: canopy at the ceiling and the body's top at -DROP.
const DROP = 0.7;

/* =====================================================================
   BUILDERS
   ===================================================================== */

const B = {

  /* ---------- Wall lights ---------- */

  cylinderUpDown(k) {
    wallPlate(k, 'round');
    rod(k.parts.link, k.mat.metal, v(0, 0, 0.03), v(0, 0, 0.13), 0.025);
    add(k.parts.body, new THREE.CylinderGeometry(0.17, 0.17, 0.82, 48), k.mat.metal, 0, 0, 0.3);
    [0.412, -0.412].forEach(y => {
      const disc = add(k.parts.light, new THREE.CircleGeometry(0.15, 40), k.mat.led, 0, y, 0.3);
      disc.rotation.x = y > 0 ? -Math.PI / 2 : Math.PI / 2;
      const beam = add(k.parts.light, new THREE.CylinderGeometry(0.15, 0.42, 0.8, 40, 1, true), k.mat.beam, 0, y + Math.sign(y) * 0.4, 0.3);
      if (y > 0) beam.rotation.x = Math.PI;
    });
  },

  shadeArm(k, p) {
    wallPlate(k, 'oval');
    tube(k.parts.link, k.mat.metal, [v(0, -0.02, 0.03), v(0, -0.02, 0.22), v(0, 0.0, 0.36), v(0, 0.1, 0.42), v(0, 0.2, 0.43)], 0.016);
    add(k.parts.link, new THREE.CylinderGeometry(0.03, 0.03, 0.1, 16), k.mat.metal, 0, 0.24, 0.43);
    const geo = new THREE.CylinderGeometry(0.2, 0.33, 0.42, p.pleated ? 144 : 64, 1, true);
    add(k.parts.body, p.pleated ? pleat(geo, 30, 0.05) : geo, k.mat.fabric, 0, 0.42, 0.43);
    hoop(k.parts.body, k.mat.metal, 0.2, 0.006, 0.63).position.z = 0.43;
    hoop(k.parts.body, k.mat.metal, 0.33, 0.006, 0.21).position.z = 0.43;
    bulbs(k, [v(0, 0.36, 0.43)], 'round', 0.06);
  },

  coneArm(k) {
    wallPlate(k, 'round');
    rod(k.parts.link, k.mat.metal, v(0, 0, 0.03), v(0, 0, 0.1), 0.02);
    rod(k.parts.link, k.mat.metal, v(0, -0.02, 0.1), v(0, 0.42, 0.42), 0.012);
    // Cone tilted forward, away from the wall.
    const shade = new THREE.Group();
    shade.position.set(0, 0.42, 0.46);
    shade.rotation.x = -0.35;
    add(shade, new THREE.CylinderGeometry(0.05, 0.22, 0.34, 56, 1, true), k.mat.metalDouble, 0, -0.17, 0);
    add(shade, new THREE.CylinderGeometry(0.05, 0.05, 0.05, 20), k.mat.metal, 0, 0.0, 0);
    k.parts.body.add(shade);
    // Glowing opening and bulb, in a copy of the shade's position so they explode separately.
    const glow = shade.clone(false);
    add(glow, new THREE.CircleGeometry(0.2, 40), k.mat.led, 0, -0.32, 0).rotation.x = Math.PI / 2;
    k.parts.light.add(glow);
  },

  glassBell(k) {
    wallPlate(k, 'round');
    tube(k.parts.link, k.mat.metal, [v(0, -0.06, 0.03), v(0, 0.14, 0.08), v(0, 0.3, 0.26), v(0, 0.28, 0.42), v(0, 0.16, 0.46)], 0.016);
    add(k.parts.link, new THREE.CylinderGeometry(0.05, 0.06, 0.07, 24), k.mat.metal, 0, 0.12, 0.46);
    const bell = lathe(k.parts.body, k.mat.glass, [[0.055, 0], [0.08, -0.04], [0.13, -0.13], [0.18, -0.25], [0.22, -0.34]]);
    bell.position.set(0, 0.09, 0.46);
    bulbs(k, [v(0, -0.06, 0.46)], 'edison', 0.06);
  },

  lantern(k) {
    wallPlate(k, 'rect');
    tube(k.parts.link, k.mat.metal, [v(0, 0.2, 0.03), v(0, 0.3, 0.2), v(0, 0.3, 0.36), v(0, 0.24, 0.42)], 0.016);
    const g = k.parts.body, cx = 0, cz = 0.42, w = 0.13;
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => rod(g, k.mat.metal, v(cx + a * w, -0.3, cz + b * w), v(cx + a * w, 0.12, cz + b * w), 0.012));
    add(g, new THREE.BoxGeometry(w * 2.1, 0.035, w * 2.1), k.mat.metal, cx, -0.31, cz);
    const roof = add(g, new THREE.ConeGeometry(w * 1.65, 0.16, 4), k.mat.metal, cx, 0.2, cz);
    roof.rotation.y = Math.PI / 4;
    add(g, new THREE.BoxGeometry(w * 1.95, 0.42, w * 1.95), k.mat.glass, cx, -0.09, cz);
    add(g, new THREE.SphereGeometry(0.025, 12, 10), k.mat.metal, cx, 0.3, cz);
    candles(k, [v(cx, -0.29, cz)], 0.1);
  },

  glassTube(k) {
    wallPlate(k, 'round');
    rod(k.parts.link, k.mat.metal, v(0, 0, 0.03), v(0, 0, 0.16), 0.022);
    add(k.parts.link, new THREE.SphereGeometry(0.04, 20, 14), k.mat.metal, 0, 0, 0.18);
    add(k.parts.body, new THREE.CylinderGeometry(0.07, 0.07, 0.92, 32, 1, true), k.mat.glass, 0, 0, 0.18);
    [0.47, -0.47].forEach(y => add(k.parts.body, new THREE.CylinderGeometry(0.075, 0.075, 0.05, 32), k.mat.metal, 0, y, 0.18));
    add(k.parts.light, new THREE.CylinderGeometry(0.018, 0.018, 0.84, 12), k.mat.led, 0, 0, 0.18);
  },

  texturedGlass(k) {
    wallPlate(k, 'round');
    tube(k.parts.link, k.mat.metal, [v(0, 0, 0.03), v(0, 0, 0.18), v(0, 0.08, 0.26), v(0, 0.2, 0.28)], 0.016);
    add(k.parts.body, new THREE.CylinderGeometry(0.06, 0.06, 0.06, 24), k.mat.metal, 0, 0.22, 0.28);
    add(k.parts.body, new THREE.CylinderGeometry(0.2, 0.2, 0.46, 18, 6), k.mat.glassTextured, 0, -0.04, 0.28);
    bulbs(k, [v(0, -0.02, 0.28)], 'edison', 0.065);
  },

  doubleGlobe(k) {
    wallPlate(k, 'rect');
    rod(k.parts.link, k.mat.metal, v(0, 0, 0.03), v(0, 0, 0.17), 0.022);
    rod(k.parts.link, k.mat.metal, v(0, -0.3, 0.17), v(0, 0.3, 0.17), 0.016);
    [0.5, -0.5].forEach(y => add(k.parts.body, new THREE.SphereGeometry(0.21, 40, 28), k.mat.opal, 0, y, 0.17));
    sockets(k, [v(0, 0.3, 0.17), v(0, -0.3, 0.17)]);
  },

  /* ---------- Ceiling lights ---------- */

  flushDisc(k, p) {
    const h = p.h || 0.12;
    add(k.parts.mount, new THREE.CylinderGeometry(0.22, 0.22, 0.02, 40), k.mat.metal, 0, -0.01, 0);
    add(k.parts.body, new THREE.CylinderGeometry(0.5, 0.5, h, 72, 1, true), k.mat.metalDouble, 0, -h / 2 - 0.01, 0);
    add(k.parts.body, new THREE.CylinderGeometry(0.5, 0.5, 0.01, 72), k.mat.metal, 0, -0.015, 0);
    if (p.rim) hoop(k.parts.body, k.mat.metal, 0.5, 0.012, -h - 0.01);
    const disc = add(k.parts.light, new THREE.CircleGeometry(0.48, 72), k.mat.led, 0, -h - 0.004, 0);
    disc.rotation.x = Math.PI / 2;
  },

  squarePanel(k) {
    add(k.parts.mount, new THREE.BoxGeometry(0.4, 0.02, 0.4), k.mat.metal, 0, -0.01, 0);
    const g = k.parts.body, t = 0.035, h = 0.09;
    [[0, 0.5], [0, -0.5]].forEach(([x, z]) => add(g, new THREE.BoxGeometry(1.0, h, t), k.mat.metal, x, -h / 2 - 0.02, z));
    [[0.5, 0], [-0.5, 0]].forEach(([x, z]) => add(g, new THREE.BoxGeometry(t, h, 1.0), k.mat.metal, x, -h / 2 - 0.02, z));
    add(g, new THREE.BoxGeometry(1.0, 0.01, 1.0), k.mat.metal, 0, -0.025, 0);
    add(k.parts.light, new THREE.BoxGeometry(0.96, 0.012, 0.96), k.mat.led, 0, -h - 0.012, 0);
  },

  drumSemi(k) {
    const top = canopy(k, 0.13);
    rod(k.parts.link, k.mat.metal, v(0, -top, 0), v(0, -0.22, 0), 0.016);
    const g = k.parts.body;
    add(g, new THREE.CylinderGeometry(0.5, 0.5, 0.36, 72, 1, true), k.mat.fabric, 0, -0.4, 0);
    hoop(g, k.mat.metal, 0.5, 0.008, -0.22);
    hoop(g, k.mat.metal, 0.5, 0.008, -0.58);
    const diffuser = add(k.parts.light, new THREE.CircleGeometry(0.48, 64), k.mat.opal, 0, -0.56, 0);
    diffuser.rotation.x = Math.PI / 2;
    add(g, new THREE.SphereGeometry(0.03, 16, 12), k.mat.metal, 0, -0.6, 0);
    bulbs(k, [v(-0.1, -0.36, 0), v(0.1, -0.36, 0)], 'round', 0.05);
  },

  crystalSemi(k, p) {
    const top = canopy(k, 0.18, 0.04);
    const ringY = p.flush ? -0.06 : -0.18;
    if (!p.flush) rod(k.parts.link, k.mat.metal, v(0, -top, 0), v(0, ringY, 0), 0.02);
    hoop(k.parts.body, k.mat.metal, 0.46, 0.014, ringY);
    add(k.parts.body, new THREE.CylinderGeometry(0.44, 0.44, 0.012, 64), k.mat.metal, 0, ringY + 0.004, 0);
    const drops = [];
    [[0.44, 34, 3], [0.34, 26, 4], [0.22, 18, 5], [0.1, 8, 6]].forEach(([r, n, len]) => {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + r;
        for (let j = 0; j < len; j++) drops.push({ p: [Math.cos(a) * r, ringY - 0.05 - j * (p.flush ? 0.055 : 0.065), Math.sin(a) * r], r: [0, a, 0], s: [1, 2.2, 1] });
      }
    });
    instances(k.parts.body, new THREE.OctahedronGeometry(0.022), k.mat.crystal, drops);
    bulbs(k, [v(0.12, ringY - 0.06, 0), v(-0.06, ringY - 0.06, 0.1), v(-0.06, ringY - 0.06, -0.1)], 'round', 0.045);
  },

  cage(k, p) {
    const top = canopy(k, 0.12);
    const g = k.parts.body;
    if (p.shape === 'cube') {
      rod(k.parts.link, k.mat.metal, v(0, -top, 0), v(0, -0.16, 0), 0.014);
      const s = 0.38, y0 = -0.16, y1 = -0.92, c = [[-s, -s], [s, -s], [s, s], [-s, s]];
      c.forEach(([x, z], i) => {
        const [nx, nz] = c[(i + 1) % 4];
        rod(g, k.mat.metal, v(x, y0, z), v(x, y1, z), 0.012);
        rod(g, k.mat.metal, v(x, y0, z), v(nx, y0, nz), 0.012);
        rod(g, k.mat.metal, v(x, y1, z), v(nx, y1, nz), 0.012);
      });
      rod(g, k.mat.metal, v(-s, y0, -s), v(s, y0, s), 0.008);
      rod(g, k.mat.metal, v(s, y0, -s), v(-s, y0, s), 0.008);
      const pts = [v(0.12, -0.5, 0.08), v(-0.14, -0.58, 0.05), v(0.02, -0.46, -0.15)];
      pts.forEach(pt => rod(k.parts.link, k.mat.cord, v(0, y0, 0), pt, 0.006));
      sockets(k, pts.map(pt => v(pt.x, pt.y - 0.02, pt.z)));
      bulbs(k, pts.map(pt => v(pt.x, pt.y - 0.1, pt.z)), 'edison', 0.055);
    } else {
      rod(k.parts.link, k.mat.metal, v(0, -top, 0), v(0, -0.1, 0), 0.016);
      add(g, new THREE.CylinderGeometry(0.42, 0.42, 0.02, 64), k.mat.metal, 0, -0.1, 0);
      hoop(g, k.mat.metal, 0.42, 0.012, -0.62);
      hoop(g, k.mat.metal, 0.42, 0.008, -0.36);
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * TAU;
        rod(g, k.mat.metal, v(Math.cos(a) * 0.42, -0.1, Math.sin(a) * 0.42), v(Math.cos(a) * 0.42, -0.62, Math.sin(a) * 0.42), 0.008);
      }
      const pts = [0, 1, 2].map(i => { const a = i * TAU / 3; return v(Math.cos(a) * 0.17, -0.22, Math.sin(a) * 0.17); });
      sockets(k, pts);
      bulbs(k, pts.map(pt => v(pt.x, pt.y - 0.13, pt.z)), 'edison', 0.06);
    }
  },

  sputnik(k, p) {
    const hang = k.mount === 'pendant';
    const top = canopy(k, 0.12);
    const hubY = hang ? -DROP - 0.1 : -(p.stem || 0.3);
    if (hang) cordsUp(k, [v(0, hubY + 0.06, 0)], 0.01);
    else rod(k.parts.link, k.mat.metal, v(0, -top, 0), v(0, hubY, 0), 0.018);
    add(k.parts.body, new THREE.SphereGeometry(0.075, 28, 20), k.mat.metal, 0, hubY, 0);
    const n = p.arms || 8, len = p.len || 0.42, ends = [];
    for (let i = 0; i < n; i++) {
      // Spread the arms evenly over a sphere, skipping the part pointing into the ceiling.
      const y = 0.65 - (i + 0.5) / n * 1.55;
      const r = Math.sqrt(Math.max(0, 1 - y * y)), a = i * 2.39996;
      const dir = v(Math.cos(a) * r, y, Math.sin(a) * r).normalize();
      const end = v(0, hubY, 0).addScaledVector(dir, len);
      rod(k.parts.body, k.mat.metal, v(0, hubY, 0), end, 0.011);
      ends.push({ end, dir });
    }
    sockets(k, ends.map(e => e.end), UP);
    instances(k.parts.light, new THREE.SphereGeometry(0.045, 16, 12), k.mat.bulb,
      ends.map(e => ({ p: e.end.clone().addScaledVector(e.dir, 0.07).toArray(), q: aim(e.dir), s: BULB_SHAPE.edison })));
  },

  ring(k, p) {
    const hang = k.mount === 'pendant';
    canopy(k, 0.12, 0.04);
    const R = 0.5, y = hang ? -DROP : -0.22;
    const anchors = [0, 1, 2].map(i => { const a = i * TAU / 3 + 0.4; return v(Math.cos(a) * R, y + 0.02, Math.sin(a) * R); });
    if (hang) anchors.forEach(pt => rod(k.parts.link, k.mat.cord, v(0, -0.03, 0), pt, 0.006));
    else anchors.forEach(pt => rod(k.parts.link, k.mat.metal, v(pt.x * 0.25, -0.03, pt.z * 0.25), pt, 0.008));
    hoop(k.parts.body, k.mat.metal, R, 0.045, y);
    hoop(k.parts.light, k.mat.led, R, 0.032, y - 0.03);
  },

  loops(k, p) {
    const n = p.count || 2;
    const top = canopy(k, 0.14, 0.04);
    const y = -0.32;
    rod(k.parts.link, k.mat.metal, v(0, -top, 0), v(0, y + 0.1, 0), 0.014);
    for (let i = 0; i < n; i++) {
      const R = 0.46 - i * 0.05;
      const group = new THREE.Group();
      group.position.y = y;
      group.rotation.set(Math.PI / 2 + (i % 2 ? -0.42 : 0.42), (i * Math.PI) / n, 0);
      add(group, new THREE.TorusGeometry(R, 0.03, 10, 96), k.mat.metal);
      k.parts.body.add(group);
      const glow = group.clone(false);
      add(glow, new THREE.TorusGeometry(R, 0.022, 8, 96), k.mat.led, 0, 0, 0.022);
      k.parts.light.add(glow);
    }
  },

  domeWoven(k, p) {
    const hang = k.mount === 'pendant';
    const top = canopy(k, 0.12);
    const y0 = hang ? -DROP : -0.18;
    if (hang) cordsUp(k, [v(0, y0, 0)], 0.01);
    else rod(k.parts.link, k.mat.metal, v(0, -top, 0), v(0, y0, 0), 0.016);
    let profile;
    if (p.shape === 'round') profile = Array.from({ length: 13 }, (_, i) => { const t = 0.12 + (i / 12) * 0.76; return [0.5 * Math.sin(t * Math.PI), y0 - 0.5 + 0.5 * Math.cos(t * Math.PI)]; });
    else if (p.shape === 'drum') profile = [[0.34, y0], [0.43, y0 - 0.05], [0.49, y0 - 0.13], [0.5, y0 - 0.2], [0.47, y0 - 0.28], [0.43, y0 - 0.33]];
    else if (p.shape === 'wide') profile = Array.from({ length: 11 }, (_, i) => { const t = i / 10; return [0.06 + 0.46 * Math.sin(t * Math.PI / 2), y0 - 0.3 * (1 - Math.cos(t * Math.PI / 2))]; });
    else profile = Array.from({ length: 11 }, (_, i) => { const t = i / 10; return [0.06 + 0.44 * Math.sin(t * Math.PI / 2), y0 - 0.46 * (1 - Math.cos(t * Math.PI / 2))]; });
    lathe(k.parts.body, k.mat.rattan, profile, 72);
    if (p.shape === 'drum') {
      // Squat woven drum: woven top, brass band round the open bottom.
      lathe(k.parts.body, k.mat.rattan, [[0.05, y0 + 0.001], [0.34, y0]], 72);
      hoop(k.parts.body, k.mat.metal, profile.at(-1)[0], 0.016, profile.at(-1)[1]);
    } else hoop(k.parts.body, k.mat.rattanSolid, profile.at(-1)[0], 0.012, profile.at(-1)[1]);
    sockets(k, [v(0, y0 - 0.04, 0)]);
    bulbs(k, [v(0, y0 - 0.16, 0)], 'round', 0.07);
  },

  tieredDrum(k) {
    const top = canopy(k, 0.13);
    rod(k.parts.link, k.mat.metal, v(0, -top, 0), v(0, -0.1, 0), 0.016);
    const g = k.parts.body;
    // A wide white drum with a narrower one hanging out below it, both lit from inside.
    [[0.5, 0.26, -0.1], [0.37, 0.2, -0.3]].forEach(([r, h, yTop]) => {
      add(g, new THREE.CylinderGeometry(r, r, h, 72, 1, true), k.mat.fabric, 0, yTop - h / 2, 0);
      hoop(g, k.mat.metal, r, 0.006, yTop);
      hoop(g, k.mat.metal, r, 0.006, yTop - h);
    });
    const lid = add(g, new THREE.RingGeometry(0.02, 0.5, 72), k.mat.fabric, 0, -0.1, 0);
    lid.rotation.x = Math.PI / 2;
    const under = add(k.parts.light, new THREE.RingGeometry(0.37, 0.5, 72), k.mat.opal, 0, -0.359, 0);
    under.rotation.x = Math.PI / 2;
    const diffuser = add(k.parts.light, new THREE.CircleGeometry(0.36, 64), k.mat.opal, 0, -0.49, 0);
    diffuser.rotation.x = Math.PI / 2;
    add(g, new THREE.SphereGeometry(0.025, 16, 12), k.mat.metal, 0, -0.515, 0);
    bulbs(k, [v(-0.1, -0.3, 0), v(0.1, -0.3, 0)], 'round', 0.055);
  },

  globe(k, p) {
    const top = canopy(k, 0.12);
    const neckY = p.flush ? -top : -0.16;
    if (!p.flush) rod(k.parts.link, k.mat.metal, v(0, -top, 0), v(0, neckY, 0), 0.016);
    add(k.parts.link, new THREE.CylinderGeometry(0.09, 0.11, 0.07, 32), k.mat.metal, 0, neckY - 0.035, 0);
    const r = 0.4, cy = neckY - 0.06 - r + 0.04;
    add(k.parts.body, new THREE.SphereGeometry(r, 56, 40), p.glass === 'opal' ? k.mat.opal : k.mat.glass, 0, cy, 0);
    if (p.glass !== 'opal') bulbs(k, [v(0, cy, 0)], 'edison', 0.075);
    else bulbs(k, [v(0, cy, 0)], 'round', 0.05);
  },

  linearBar(k) {
    const y = -0.34;
    [-0.42, 0.42].forEach(x => {
      add(k.parts.mount, new THREE.CylinderGeometry(0.035, 0.035, 0.02, 20), k.mat.metal, x, -0.01, 0);
      rod(k.parts.link, k.mat.cord, v(x, -0.02, 0), v(x, y + 0.03, 0), 0.005);
    });
    add(k.parts.body, new THREE.BoxGeometry(1.1, 0.05, 0.075), k.mat.metal, 0, y, 0);
    add(k.parts.light, new THREE.BoxGeometry(1.08, 0.01, 0.06), k.mat.led, 0, y - 0.03, 0);
  },

  faceted(k) {
    canopy(k, 0.14, 0.04);
    const shade = add(k.parts.body, new THREE.IcosahedronGeometry(0.47, 0), k.mat.metalFlat, 0, -0.2, 0);
    shade.scale.set(1, 0.42, 1);
    const glow = add(k.parts.light, new THREE.CircleGeometry(0.3, 6), k.mat.led, 0, -0.4, 0);
    glow.rotation.x = Math.PI / 2;
  },

  multiGlobe(k, p) {
    const hang = k.mount === 'pendant';
    const top = canopy(k, 0.12);
    const hubY = hang ? -DROP - 0.08 : -0.22;
    if (hang) cordsUp(k, [v(0, hubY + 0.05, 0)], 0.01);
    else rod(k.parts.link, k.mat.metal, v(0, -top, 0), v(0, hubY, 0), 0.016);
    add(k.parts.body, new THREE.SphereGeometry(0.06, 24, 18), k.mat.metal, 0, hubY, 0);
    const n = p.arms || 6, R = hang ? 0.36 : 0.38, globes = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU, up = hang ? (i % 2 ? 0.16 : -0.12) : 0.05;
      const end = v(Math.cos(a) * R, hubY + up, Math.sin(a) * R);
      tube(k.parts.body, k.mat.metal, [v(0, hubY, 0), v(Math.cos(a) * R * 0.5, hubY + up * 0.2, Math.sin(a) * R * 0.5), end], 0.011, false, 24);
      globes.push(end.clone().add(v(0, 0.1, 0)));
    }
    sockets(k, globes.map(g => v(g.x, g.y - 0.08, g.z)));
    instances(k.parts.body, new THREE.SphereGeometry(0.1, 32, 24), k.mat.opal, globes.map(g => ({ p: g.toArray() })));
  },

  surfaceCylinder(k) {
    add(k.parts.mount, new THREE.CylinderGeometry(0.27, 0.27, 0.02, 48), k.mat.metal, 0, -0.01, 0);
    add(k.parts.body, new THREE.CylinderGeometry(0.25, 0.25, 0.6, 56), k.mat.metal, 0, -0.32, 0);
    const disc = add(k.parts.light, new THREE.CircleGeometry(0.2, 40), k.mat.led, 0, -0.621, 0);
    disc.rotation.x = Math.PI / 2;
    add(k.parts.light, new THREE.CylinderGeometry(0.2, 0.55, 0.9, 40, 1, true), k.mat.beam, 0, -1.07, 0);
  },

  ribbedGlass(k) {
    const top = canopy(k, 0.12);
    add(k.parts.link, new THREE.CylinderGeometry(0.08, 0.1, 0.07, 32), k.mat.metal, 0, -top - 0.035, 0);
    const profile = Array.from({ length: 12 }, (_, i) => { const t = i / 11; return [0.08 + 0.4 * Math.sin(t * Math.PI * 0.62), -0.1 - t * 0.48]; });
    const geo = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 144);
    add(k.parts.body, pleat(geo, 22, 0.035), k.mat.amber);
    bulbs(k, [v(0, -0.32, 0)], 'edison', 0.07);
  },

  dishes(k, p) {
    const hang = k.mount === 'pendant';
    const top = canopy(k, 0.12);
    const hubY = hang ? -DROP : -0.18;
    if (hang) cordsUp(k, [v(0, hubY, 0)], 0.01);
    else rod(k.parts.link, k.mat.metal, v(0, -top, 0), v(0, hubY, 0), 0.016);
    const random = rng(p.flat ? 17 : 5);
    const n = p.flat ? 9 : (p.count || 4);
    const dish = new THREE.LatheGeometry([[0.001, 0], [0.12, -0.01], [0.17, -0.035], [0.18, -0.05]].map(([r, y]) => new THREE.Vector2(r, y)), 40);
    const disc = new THREE.CylinderGeometry(0.15, 0.15, 0.018, 40);
    const items = [], glows = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + random() * 0.4;
      const R = p.flat ? 0.18 + random() * 0.3 : 0.32;
      const y = hubY - (p.flat ? 0.05 + random() * 0.55 : 0.06 + (i % 2) * 0.1);
      const end = v(Math.cos(a) * R, y, Math.sin(a) * R);
      rod(k.parts.link, k.mat.metal, v(0, hubY, 0), end, 0.007);
      items.push({ p: [end.x, end.y, end.z], r: p.flat ? [0, 0, 0] : [Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35] });
      glows.push({ p: [end.x, end.y - (p.flat ? 0.012 : 0.04), end.z], r: [Math.PI / 2, 0, 0] });
    }
    if (p.flat) rod(k.parts.link, k.mat.metal, v(0, hubY, 0), v(0, hubY - 0.62, 0), 0.012);
    instances(k.parts.body, p.flat ? disc : dish, p.flat ? k.mat.metal : k.mat.metalDouble, items);
    instances(k.parts.light, new THREE.CircleGeometry(p.flat ? 0.14 : 0.13, 32), k.mat.led, glows);
  },

  spots(k) {
    add(k.parts.mount, new THREE.BoxGeometry(0.9, 0.04, 0.16), k.mat.metal, 0, -0.02, 0);
    [-0.32, 0, 0.32].forEach((x, i) => {
      const tilt = [0.55, -0.3, 0.7][i], turn = [0.4, 2.2, -1.8][i];
      rod(k.parts.link, k.mat.metal, v(x, -0.04, 0), v(x, -0.14, 0), 0.012);
      const head = new THREE.Group();
      head.position.set(x, -0.16, 0);
      head.rotation.set(tilt, turn, 0, 'YXZ');
      add(head, new THREE.CylinderGeometry(0.075, 0.075, 0.2, 32), k.mat.metal, 0, -0.08, 0);
      k.parts.body.add(head);
      const glowHead = head.clone(false);
      const disc = add(glowHead, new THREE.CircleGeometry(0.06, 28), k.mat.led, 0, -0.181, 0);
      disc.rotation.x = Math.PI / 2;
      const beam = add(glowHead, new THREE.CylinderGeometry(0.06, 0.24, 0.6, 28, 1, true), k.mat.beam, 0, -0.48, 0);
      beam.name = 'beam';
      k.parts.light.add(glowHead);
    });
  },

  /* ---------- Chandeliers ---------- */

  crystalChandelier(k) {
    canopy(k, 0.14);
    const top = -DROP + 0.1;
    cordsUp(k, [v(0, top, 0)], 0.012);
    const g = k.parts.body;
    lathe(g, k.mat.metal, [[0.02, top], [0.06, top - 0.05], [0.035, top - 0.12], [0.07, top - 0.3], [0.04, top - 0.42], [0.09, top - 0.5], [0.02, top - 0.62]], 40);
    hoop(g, k.mat.metal, 0.3, 0.012, top - 0.04);
    hoop(g, k.mat.metal, 0.46, 0.014, top - 0.38);
    const cups = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU, R = 0.46;
      tube(g, k.mat.metal, [v(0, top - 0.42, 0), v(Math.cos(a) * R * 0.6, top - 0.46, Math.sin(a) * R * 0.6), v(Math.cos(a) * R, top - 0.4, Math.sin(a) * R)], 0.012, false, 20);
      cups.push(v(Math.cos(a) * R, top - 0.38, Math.sin(a) * R));
    }
    candles(k, cups, 0.12);
    // Strands of crystal from the top ring down to the centre, then a lower skirt.
    const drops = [];
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU;
      for (let j = 0; j < 7; j++) {
        const t = j / 6, r = 0.3 - t * 0.2;
        drops.push({ p: [Math.cos(a) * r, top - 0.07 - t * 0.28, Math.sin(a) * r], r: [0, a, 0], s: [1, 1.9, 1] });
      }
    }
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * TAU;
      for (let j = 0; j < 5; j++) {
        const t = j / 4, r = 0.44 - t * 0.3;
        drops.push({ p: [Math.cos(a) * r, top - 0.46 - t * 0.3, Math.sin(a) * r], r: [0, a, 0], s: [1, 2.1, 1] });
      }
    }
    instances(g, new THREE.OctahedronGeometry(0.02), k.mat.crystal, drops);
    add(g, new THREE.OctahedronGeometry(0.06), k.mat.crystal, 0, top - 0.82, 0).scale.set(1, 1.5, 1);
  },

  spiralRings(k) {
    canopy(k, 0.16, 0.04);
    const rings = [[0.5, -DROP + 0.12, 0.1, 0], [0.42, -DROP, -0.14, 1.2], [0.34, -DROP - 0.12, 0.12, 2.4], [0.26, -DROP - 0.24, -0.1, 3.6]];
    rings.forEach(([R, y, tilt, turn]) => {
      const group = new THREE.Group();
      group.position.set(0, y, 0);
      group.rotation.set(Math.PI / 2 + tilt, 0, turn, 'YXZ');
      add(group, new THREE.TorusGeometry(R, 0.028, 10, 120), k.mat.metal);
      k.parts.body.add(group);
      const glow = group.clone(false);
      add(glow, new THREE.TorusGeometry(R, 0.02, 8, 120), k.mat.led, 0, 0, 0.02);
      k.parts.light.add(glow);
      const anchor = v(Math.cos(turn) * R, y, Math.sin(turn) * R);
      rod(k.parts.link, k.mat.cord, v(anchor.x * 0.3, -0.03, anchor.z * 0.3), anchor, 0.004);
    });
  },

  classicArms(k, p) {
    canopy(k, 0.12);
    const n = p.arms || 6, s = p.small ? 0.8 : 1, top = -DROP + 0.12;
    cordsUp(k, [v(0, top, 0)], 0.01);
    const g = k.parts.body;
    lathe(g, k.mat.metal, [[0.02, top], [0.05, top - 0.06], [0.03, top - 0.14], [0.08 * s, top - 0.28], [0.1 * s, top - 0.36], [0.04, top - 0.44], [0.06, top - 0.5], [0.015, top - 0.58]], 40);
    const cups = [], R = 0.44 * s, armY = top - 0.36;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU, c = Math.cos(a), sn = Math.sin(a);
      tube(g, k.mat.metal, [v(c * 0.08, armY, sn * 0.08), v(c * R * 0.45, armY - 0.1, sn * R * 0.45), v(c * R * 0.85, armY - 0.08, sn * R * 0.85), v(c * R, armY + 0.02, sn * R)], 0.013, false, 28);
      cups.push(v(c * R, armY + 0.04, sn * R));
    }
    candles(k, cups, 0.12 * s);
    if (p.crystals) {
      const drops = [];
      for (let i = 0; i < n * 2; i++) {
        const a = (i / (n * 2)) * TAU, r = R * 0.62;
        for (let j = 0; j < 3; j++) drops.push({ p: [Math.cos(a) * r, armY - 0.14 - j * 0.05, Math.sin(a) * r], s: [1, 2, 1] });
      }
      instances(g, new THREE.OctahedronGeometry(0.02), k.mat.crystal, drops);
    }
  },

  linearGlass(k) {
    const y = -DROP + 0.05;
    add(k.parts.mount, new THREE.BoxGeometry(0.95, 0.03, 0.08), k.mat.metal, 0, -0.015, 0);
    [-0.4, 0.4].forEach(x => rod(k.parts.link, k.mat.metal, v(x, -0.03, 0), v(x, y, 0), 0.008));
    const g = k.parts.body;
    add(g, new THREE.BoxGeometry(1.2, 0.035, 0.05), k.mat.metal, 0, y, 0);
    // Five upright clear glass tubes with brass rims, each on a brass cup with a bulb inside.
    const xs = [-0.48, -0.24, 0, 0.24, 0.48], h = 0.24, r = 0.065, base = y + 0.06;
    instances(g, new THREE.CylinderGeometry(0.045, 0.03, 0.045, 20), k.mat.metal, xs.map(x => ({ p: [x, y + 0.04, 0] })));
    instances(g, new THREE.CylinderGeometry(r, r, h, 32, 1, true), k.mat.clearGlass, xs.map(x => ({ p: [x, base + h / 2, 0] })));
    instances(g, new THREE.TorusGeometry(r, 0.007, 8, 40), k.mat.metal,
      xs.flatMap(x => [{ p: [x, base, 0], r: [Math.PI / 2, 0, 0] }, { p: [x, base + h, 0], r: [Math.PI / 2, 0, 0] }]));
    sockets(k, xs.map(x => v(x, base + 0.03, 0)));
    bulbs(k, xs.map(x => v(x, base + 0.11, 0)), 'edison', 0.042);
  },

  drumCandles(k) {
    canopy(k, 0.1);
    const top = -DROP + 0.12, g = k.parts.body, R = 0.5, h = 0.32;
    rod(k.parts.link, k.mat.metal, v(0, -0.04, 0), v(0, top, 0), 0.014);
    // Crystal drum: a faint glowing sleeve behind dense crystal strands.
    add(g, new THREE.CylinderGeometry(R - 0.012, R - 0.012, h, 72, 1, true), k.mat.veil, 0, top - h / 2, 0);
    hoop(g, k.mat.metal, R, 0.01, top);
    hoop(g, k.mat.metal, R, 0.01, top - h);
    const strands = [];
    for (let i = 0; i < 150; i++) { const a = (i / 150) * TAU; strands.push({ p: [Math.cos(a) * R, top - h / 2, Math.sin(a) * R] }); }
    instances(g, new THREE.CylinderGeometry(0.009, 0.009, h, 6), k.mat.crystal, strands);
    for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + 0.4; rod(g, k.mat.metal, v(0, top, 0), v(Math.cos(a) * R, top, Math.sin(a) * R), 0.006); }
    rod(g, k.mat.metal, v(0, top, 0), v(0, top - h - 0.03, 0), 0.015);
    // Six curved candle arms inside, dipping just below the drum.
    const cups = [], yArm = top - h + 0.02;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU, c = Math.cos(a), sn = Math.sin(a);
      const end = v(c * 0.32, yArm + 0.04, sn * 0.32);
      tube(g, k.mat.metal, [v(0, yArm - 0.03, 0), v(c * 0.17, yArm - 0.06, sn * 0.17), v(c * 0.29, yArm - 0.02, sn * 0.29), end], 0.01, false, 24);
      cups.push(end);
    }
    candles(k, cups, 0.1);
    add(g, new THREE.SphereGeometry(0.03, 14, 10), k.mat.metal, 0, top - h - 0.06, 0);
  },

  tieredRods(k, p) {
    canopy(k, 0.12);
    const top = -DROP + 0.12;
    cordsUp(k, [v(0, top, 0)], 0.012);
    const g = k.parts.body;
    // [radius, top of the tier, height]: panels have three tiers, crystal rods four, like the photos.
    const tiers = p.panels
      ? [[0.48, top - 0.02, 0.22], [0.38, top - 0.27, 0.2], [0.27, top - 0.5, 0.18]]
      : [[0.5, top - 0.02, 0.22], [0.42, top - 0.21, 0.2], [0.33, top - 0.38, 0.18], [0.23, top - 0.53, 0.17]];
    const last = tiers.at(-1);
    rod(g, k.mat.metal, v(0, top, 0), v(0, last[1] - last[2] - 0.03, 0), 0.014);
    const items = [], glowPts = [];
    tiers.forEach(([R, y, h], t) => {
      hoop(g, k.mat.metal, R, 0.012, y);
      rod(g, k.mat.metal, v(0, y, 0), v(R, y, 0), 0.006);
      rod(g, k.mat.metal, v(0, y, 0), v(-R, y, 0), 0.006);
      if (p.panels) {
        const sides = 8 - t * 2 + 2;
        for (let i = 0; i < sides; i++) {
          const a = (i / sides) * TAU;
          items.push({ p: [Math.cos(a) * R * 0.94, y - h / 2, Math.sin(a) * R * 0.94], r: [0, -a + Math.PI / 2, 0] });
        }
      } else {
        // Dense crystal rods of slightly uneven length in front of a faint glowing sleeve.
        add(g, new THREE.CylinderGeometry(R - 0.015, R - 0.015, h * 0.96, 64, 1, true), k.mat.veil, 0, y - h * 0.48, 0);
        const n = Math.round(R * 300);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * TAU, len = h * (0.92 + ((i * 7) % 5) * 0.025);
          items.push({ p: [Math.cos(a) * R, y - len / 2, Math.sin(a) * R], s: [1, len, 1] });
        }
      }
      glowPts.push(v(0.1, y - h / 2, 0), v(-0.1, y - h / 2, 0));
    });
    if (p.panels) instances(g, new THREE.BoxGeometry(0.2, 0.2, 0.012), k.mat.opal, items.map((it, i) => ({ ...it, s: [i < 10 ? 1.2 : i < 18 ? 1 : 0.8, 1, 1] })));
    else instances(g, new THREE.CylinderGeometry(0.01, 0.01, 1, 6), k.mat.crystal, items);
    bulbs(k, glowPts, 'round', 0.04);
  },

  cascadeGlobes(k, p) {
    const mode = p.mode || 'cascade';
    const random = rng(mode === 'cluster' ? 11 : mode === 'canopy' ? 23 : 7);
    add(k.parts.mount, new THREE.CylinderGeometry(0.48, 0.5, 0.035, 64), k.mat.metal, 0, -0.018, 0);
    if (mode === 'cluster') {
      // Large clear glass bubbles on thin brass rods of different lengths, packed into a loose rounded cluster.
      const globes = [];
      for (let tries = 0; globes.length < 20 && tries < 6000; tries++) {
        const r = 0.085 + random() * 0.075;
        const u = random() * 2 - 1, a = random() * TAU, d = Math.cbrt(random()), sq = Math.sqrt(1 - u * u);
        const c = v(Math.cos(a) * sq * d * 0.36, -0.66 + u * d * 0.26, Math.sin(a) * sq * d * 0.36);
        if (globes.every(gl => gl.c.distanceTo(c) > gl.r + r + 0.012)) globes.push({ c, r });
      }
      instances(k.parts.link, new THREE.CylinderGeometry(0.003, 0.003, 1, 4), k.mat.metal, globes.map(({ c, r }) => {
        const len = -0.035 - (c.y + r);
        return { p: [c.x, -0.035 - len / 2, c.z], s: [1, len, 1] };
      }));
      instances(k.parts.body, new THREE.CylinderGeometry(0.018, 0.024, 0.035, 14), k.mat.metal, globes.map(({ c, r }) => ({ p: [c.x, c.y + r + 0.008, c.z] })));
      instances(k.parts.body, new THREE.SphereGeometry(1, 32, 24), k.mat.clearGlass, globes.map(({ c, r }) => ({ p: [c.x, c.y, c.z], s: r })));
      bulbs(k, globes.map(gl => gl.c), 'round', 0.028);
      return;
    }
    const canopyMode = mode === 'canopy';
    const n = canopyMode ? 160 : 15, R = canopyMode ? 0.47 : 0.44, pts = [];
    for (let i = 0; i < n; i++) {
      // Sunflower spread across the plate, then the drop length.
      const t = Math.sqrt((i + 0.5) / n), r = t * R, a = i * 2.39996;
      // Canopy (H-19): wires longest in the middle, so the many small bulbs form a full rounded cascade.
      const drop = canopyMode ? Math.max(0.12, 0.18 + 0.74 * Math.pow(1 - t * t, 0.7) + (random() - 0.5) * 0.2) : 0.35 + random() * 0.75;
      pts.push(v(Math.cos(a) * r, -drop, Math.sin(a) * r));
    }
    instances(k.parts.link, new THREE.CylinderGeometry(canopyMode ? 0.0025 : 0.003, canopyMode ? 0.0025 : 0.003, 1, 4), k.mat.cord,
      pts.map(pt => ({ p: [pt.x, (pt.y - 0.035) / 2, pt.z], s: [1, -pt.y - 0.035, 1] })));
    if (canopyMode) {
      bulbs(k, pts, 'tiny', 0.02);
    } else {
      instances(k.parts.body, new THREE.SphereGeometry(0.085, 28, 20), k.mat.amber, pts.map(pt => ({ p: [pt.x, pt.y - 0.08, pt.z] })));
      bulbs(k, pts.map(pt => v(pt.x, pt.y - 0.08, pt.z)), 'round', 0.03);
    }
  },

  wagonWheel(k, p) {
    canopy(k, 0.12);
    const y = -DROP - 0.05, R = 0.5, g = k.parts.body;
    const anchors = [0, 1, 2].map(i => { const a = i * TAU / 3; return v(Math.cos(a) * R * 0.9, y, Math.sin(a) * R * 0.9); });
    anchors.forEach(a => rod(k.parts.link, k.mat.metal, v(0, -0.05, 0), a, 0.006));
    hoop(g, k.mat.metal, R, 0.028, y);
    const pts = [];
    if (p.style === 'industrial') {
      hoop(g, k.mat.metal, R * 0.55, 0.018, y);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + 0.26, c = Math.cos(a), s = Math.sin(a);
        rod(g, k.mat.metal, v(c * R * 0.55, y, s * R * 0.55), v(c * R, y, s * R), 0.016);
        const up = i % 2 === 0;
        const end = v(c * R * 0.78, y + (up ? 0.16 : -0.14), s * R * 0.78);
        rod(g, k.mat.metal, v(c * R * 0.78, y, s * R * 0.78), end, 0.014);
        pts.push({ end, up });
      }
      sockets(k, pts.map(q => q.end), UP);
      bulbs(k, pts.map(q => v(q.end.x, q.end.y + (q.up ? 0.09 : -0.09), q.end.z)), 'edison', 0.055);
    } else {
      hoop(g, k.mat.metal, 0.08, 0.025, y);
      for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU; rod(g, k.mat.metal, v(Math.cos(a) * 0.08, y, Math.sin(a) * 0.08), v(Math.cos(a) * R, y, Math.sin(a) * R), 0.012); }
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + 0.2;
        pts.push(v(Math.cos(a) * R, y - 0.12, Math.sin(a) * R));
      }
      pts.forEach(q => rod(k.parts.link, k.mat.cord, v(q.x, y, q.z), v(q.x, q.y + 0.03, q.z), 0.005));
      sockets(k, pts);
      bulbs(k, pts.map(q => v(q.x, q.y - 0.09, q.z)), 'edison', 0.05);
    }
  },

  branches(k) {
    canopy(k, 0.1);
    const c = v(0, -DROP - 0.1, 0), random = rng(31), g = k.parts.body;
    rod(k.parts.link, k.mat.metal, v(0, -0.04, 0), v(0, c.y + 0.03, 0), 0.012);
    add(g, new THREE.SphereGeometry(0.035, 16, 12), k.mat.metal, c.x, c.y, c.z);
    // Fourteen brass branches bursting out in every direction, each with glowing leaves along it and at its tip.
    const leaves = [], n = 14;
    for (let i = 0; i < n; i++) {
      const yy = 0.55 - ((i + 0.5) / n) * 1.2, a = i * 2.39996, rr = Math.sqrt(1 - yy * yy);
      const dir = v(Math.cos(a) * rr, yy * 0.8, Math.sin(a) * rr).normalize();
      const side = v(-dir.z, 0, dir.x).normalize();
      const len = 0.5 + random() * 0.14;
      const p1 = c.clone().addScaledVector(dir, len * 0.35);
      const p2 = c.clone().addScaledVector(dir, len * 0.7).addScaledVector(side, (random() - 0.5) * 0.08);
      const p3 = c.clone().addScaledVector(dir, len).addScaledVector(side, (random() - 0.5) * 0.1);
      tube(g, k.mat.metal, [c.clone(), p1, p2, p3], 0.007, false, 20);
      [p1, p2, p3].forEach((pt, j) => {
        const count = j + 1;
        for (let m = 0; m < count; m++) {
          const ld = dir.clone().addScaledVector(side, (m - (count - 1) / 2) * 1.1 + (random() - 0.5) * 0.4).add(v(0, 0.3 + random() * 0.3, 0)).normalize();
          leaves.push({ p: [pt.x + ld.x * 0.07, pt.y + ld.y * 0.07, pt.z + ld.z * 0.07], q: aim(ld), s: [0.5, 1, 0.2] });
        }
      });
    }
    instances(k.parts.light, new THREE.SphereGeometry(0.075, 16, 12), k.mat.opal, leaves);
  },

  beadBasket(k) {
    canopy(k, 0.1);
    const top = -DROP + 0.2, g = k.parts.body;
    cordsUp(k, [v(0, top + 0.06, 0)], 0.01);
    // Crown on top of a basket of wooden bead strands: out from the crown to a wide brass band, then in to a point.
    add(k.parts.link, new THREE.CylinderGeometry(0.05, 0.08, 0.06, 24), k.mat.metal, 0, top + 0.03, 0);
    const yBand = top - 0.5, bottom = top - 0.86;
    hoop(g, k.mat.metal, 0.17, 0.012, top);
    hoop(g, k.mat.metal, 0.47, 0.016, yBand);
    const meridian = new THREE.CatmullRomCurve3([
      v(0.17, top, 0), v(0.3, top - 0.15, 0), v(0.42, top - 0.33, 0), v(0.47, yBand, 0),
      v(0.37, yBand - 0.14, 0), v(0.2, yBand - 0.27, 0), v(0.035, bottom, 0)
    ]);
    const along = meridian.getSpacedPoints(34), strands = 30, beads = [];
    for (let i = 0; i < strands; i++) {
      const a = (i / strands) * TAU, ca = Math.cos(a), sa = Math.sin(a);
      along.forEach(pt => beads.push({ p: [ca * pt.x, pt.y, sa * pt.x], s: 1 }));
      // A short swag of beads under the band, to the next strand.
      const b = ((i + 1) / strands) * TAU;
      for (let j = 1; j < 6; j++) {
        const t = j / 6, ang = a + (b - a) * t, dip = Math.sin(t * Math.PI) * 0.06;
        beads.push({ p: [Math.cos(ang) * 0.465, yBand - 0.02 - dip, Math.sin(ang) * 0.465], s: 1 });
      }
    }
    instances(g, new THREE.IcosahedronGeometry(0.016, 1), k.mat.wood, beads);
    add(g, new THREE.SphereGeometry(0.035, 16, 12), k.mat.wood, 0, bottom - 0.03, 0);
    rod(g, k.mat.metal, v(0, top, 0), v(0, yBand + 0.02, 0), 0.012);
    const cups = [];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      rod(g, k.mat.metal, v(0, yBand + 0.02, 0), v(Math.cos(a) * 0.22, yBand + 0.05, Math.sin(a) * 0.22), 0.009);
      cups.push(v(Math.cos(a) * 0.22, yBand + 0.05, Math.sin(a) * 0.22));
    }
    candles(k, cups, 0.09);
  },

  flowing(k) {
    canopy(k, 0.14, 0.04);
    const y = -DROP - 0.05;
    const pts = Array.from({ length: 72 }, (_, i) => {
      const t = (i / 72) * TAU;
      return v(0.42 * Math.sin(t) + 0.16 * Math.sin(2 * t), y - 0.12 * Math.sin(3 * t), 0.42 * Math.cos(t) - 0.16 * Math.cos(2 * t));
    });
    tube(k.parts.body, k.mat.metal, pts, 0.032, true, 360);
    tube(k.parts.light, k.mat.led, pts.map(pt => v(pt.x, pt.y - 0.022, pt.z)), 0.022, true, 360);
    [0, 24, 48].forEach(i => rod(k.parts.link, k.mat.cord, v(pts[i].x * 0.2, -0.03, pts[i].z * 0.2), pts[i], 0.004));
  }
};

/* =====================================================================
   THE 3D SHAPES. One per original design, in the order they were first added
   ("sconces:0" is the first wall light). Each design in the admin portal picks one
   of these as its "3D model", so new designs reuse an existing shape.
   ===================================================================== */

export const RECIPES = {
  sconces: [
    ['cylinderUpDown'], ['shadeArm', { pleated: true }], ['coneArm'], ['glassBell'], ['shadeArm', { pleated: false }],
    ['lantern'], ['glassTube'], ['texturedGlass'], ['doubleGlobe']
  ],
  ceiling: [
    ['flushDisc', { h: 0.14, rim: true }], ['squarePanel'], ['flushDisc', { h: 0.06 }], ['drumSemi'], ['crystalSemi', {}],
    ['cage', { shape: 'cyl' }], ['sputnik', { arms: 8, stem: 0.3, len: 0.42 }], ['ring', {}], ['loops', { count: 2 }], ['domeWoven', { shape: 'dome' }],
    ['tieredDrum'], ['domeWoven', { shape: 'drum' }], ['globe', { glass: 'clear' }], ['cage', { shape: 'cube' }], ['globe', { glass: 'opal', flush: true }],
    ['linearBar'], ['faceted'], ['multiGlobe', { arms: 6 }], ['surfaceCylinder'], ['ribbedGlass'],
    ['dishes', { count: 4 }], ['domeWoven', { shape: 'wide' }], ['spots'], ['crystalSemi', { flush: true }], ['loops', { count: 3 }]
  ],
  chandeliers: [
    ['crystalChandelier'], ['spiralRings'], ['classicArms', { arms: 6, crystals: true }], ['linearGlass'], ['drumCandles'],
    ['tieredRods', {}], ['cascadeGlobes', { mode: 'cascade' }], ['multiGlobe', { arms: 10 }], ['sputnik', { arms: 18, len: 0.5 }], ['wagonWheel', { style: 'wagon' }],
    ['classicArms', { arms: 5, crystals: false, small: true }], ['wagonWheel', { style: 'industrial' }], ['beadBasket'], ['tieredRods', { panels: true }], ['branches'],
    ['ring', {}], ['cascadeGlobes', { mode: 'cluster' }], ['dishes', { flat: true }], ['cascadeGlobes', { mode: 'canopy' }], ['flowing']
  ]
};

export function buildBody(kit, key, index) {
  const recipe = RECIPES[key] && RECIPES[key][index];
  if (!recipe) throw new Error('No 3D recipe for ' + key + ':' + index);
  const [name, params = {}] = recipe;
  B[name](kit, params);
  return name;
}
