// Viloyatlar bellashuvi — interactive 3D map.
// Two levels: COUNTRY (whole Uzbekistan, a small symbolic town + count per region) and CITY (tap a region: it opens as its own
// big city with streets and one plot per resident; the city grows with the number of residents, so it never runs out of room).
// Touch: 1 finger = move, 2 fingers = zoom + rotate. Mouse: left = move, right = rotate, wheel = zoom. Deep link: #nick
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { tierOf, makeTier, makeTree, makeHouse, makeCar } from "./tiers.js";
import { initUI, openGet, openShop, shopFrame } from "./ui.js";

const NAMES = { QQR: "Qoraqalpog‘iston", NAV: "Navoiy", BUX: "Buxoro", XOR: "Xorazm", SAM: "Samarqand", JIZ: "Jizzax", SIR: "Sirdaryo", TOV: "Toshkent viloyati", TSH: "Toshkent shahri", NAM: "Namangan", AND: "Andijon", FAR: "Farg‘ona", QAS: "Qashqadaryo", SUR: "Surxondaryo" };
const COL = { QQR: "#E3C78F", NAV: "#EFB27A", BUX: "#E59A6E", XOR: "#7FC37A", SAM: "#6DB4D8", JIZ: "#C7D46E", SIR: "#9AD07C", TOV: "#63B07A", TSH: "#F2C14E", NAM: "#86C9A8", AND: "#7DC860", FAR: "#B9A6E0", QAS: "#E8B24F", SUR: "#D98C8C" };
const TOP = 1.32; // top surface of the extruded land

const [MAP, DATA] = await Promise.all([fetch("data/map.json").then((r) => r.json()), fetch("data/houses.json?v=" + Date.now()).then((r) => r.json())]);
const IG = DATA.instagram || "negachi.uz", INSTAGRAM = "https://www.instagram.com/" + IG + "/", POST = DATA.post || INSTAGRAM;
initUI({ NAMES, IG, INSTAGRAM, POST });
const HOUSES = DATA.houses.slice();
// ?demo=300 — preview with fake residents (to see how crowded cities look); never shown without the parameter
const DEMO = Number(new URLSearchParams(location.search).get("demo") || 0);
if (DEMO) { const ids = ["TSH", "TSH", "TSH", "SAM", "SAM", "FAR", "AND", "AND", "NAM", "TOV", "QAS", "SUR", "BUX", "XOR", "NAV", "JIZ", "SIR", "QQR"]; for (let i = 0; i < DEMO; i++) HOUSES.push({ nick: "demo_" + (i + 1), region: ids[(i * 7 + (i % 5)) % ids.length], kind: "house", tier: ["villa", "hovli", "hovli", "rangli", "rangli", "rangli"][i % 23] || "oddiy", demo: true }); }

// ---------------------------------------------------------------- renderer / scene
const canvas = document.getElementById("c");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene(); scene.background = new THREE.Color("#CFE2EE"); scene.fog = new THREE.Fog("#CFE2EE", 380, 900);
const hemi = new THREE.HemisphereLight("#EAF4FF", "#7A6A55", 0.95); scene.add(hemi);
const sun = new THREE.DirectionalLight("#FFF1DC", 2.5); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); sun.shadow.radius = 3; sun.shadow.bias = -0.0004;
scene.add(sun, sun.target);
const setSun = (cx, cz, half) => { sun.position.set(cx - 30, 60, cz + 30); sun.target.position.set(cx, 0, cz); Object.assign(sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 1, far: 240 }); sun.shadow.camera.updateProjectionMatrix(); };
const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshStandardMaterial({ color: "#E6DCC9", roughness: 0.95 }));

// ---------------------------------------------------------------- night mode: dark sky + stars, moonlight, glowing windows, lamps and headlights
let night = false;
const stars = (() => { const n = 1400, p = new Float32Array(n * 3); let sd = 11; const r = () => ((sd = (sd * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < n; i++) { const th = r() * Math.PI * 2, ph = r() * Math.PI * 0.42, R = 1500; p[i * 3] = Math.cos(th) * Math.sin(ph) * R; p[i * 3 + 1] = Math.cos(ph) * R * 0.6 + 120; p[i * 3 + 2] = Math.sin(th) * Math.sin(ph) * R; }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3));
  const m = new THREE.Points(g, new THREE.PointsMaterial({ color: "#FFFFFF", size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0.85, fog: false })); m.visible = false; scene.add(m); return m; })();
const WINDOW = new Set(["2b3b4e", "1f2a36"]), LAMP = new Set(["fff3c4", "fff6c8"]);
function applyNight(root = scene) {
  root.traverse((o) => { if (o.userData && o.userData.nightOnly) o.visible = night; const m = o.material; if (!m || !m.color || !m.isMeshStandardMaterial) return;
    const hex = m.color.getHexString();
    if (WINDOW.has(hex)) { m.emissive.set(night ? "#FFC56B" : "#000000"); m.emissiveIntensity = night ? 1.15 : 0; }
    else if (LAMP.has(hex)) { m.emissive.set("#FFD978"); m.emissiveIntensity = night ? 3.2 : 0.9; }
    else if (hex === "4cb8e8" || hex === "3fb6e8") { m.emissiveIntensity = night ? 0.9 : 0.3; } });
}
function setNight(on) {
  night = on;
  scene.background.set(on ? "#0B1430" : "#CFE2EE"); scene.fog.color.set(on ? "#0B1430" : "#CFE2EE");
  ground.material.color.set(on ? "#3A3F4E" : "#E6DCC9");
  hemi.color.set(on ? "#5B6FA8" : "#EAF4FF"); hemi.groundColor.set(on ? "#1A1A2A" : "#7A6A55"); hemi.intensity = on ? 0.55 : 0.95;
  sun.color.set(on ? "#9DB4FF" : "#FFF1DC"); sun.intensity = on ? 0.75 : 2.5;
  renderer.toneMappingExposure = on ? 1.25 : 1.05; stars.visible = on;
  applyNight(); document.body.classList.toggle("night", on);
  try { localStorage.setItem("vb_night", on ? "1" : "0"); } catch {}
}
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

const camera = new THREE.PerspectiveCamera(36, 1, 0.5, 3000);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.08; controls.screenSpacePanning = false; controls.zoomToCursor = true;
controls.maxPolarAngle = Math.PI * 0.44;
controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE }; // 1 finger moves the map, 2 fingers zoom + turn
controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
controls.panSpeed = 1.1; controls.rotateSpeed = 0.7;

// ---------------------------------------------------------------- helpers
const inside = (pt, ring) => { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, yi] = ring[i], [xj, yj] = ring[j]; if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c; } return c; };
const edgeDist = (p, ring) => { let d = 1e9; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [ax, az] = ring[j], [bx, bz] = ring[i]; const vx = bx - ax, vz = bz - az, l = vx * vx + vz * vz || 1; const t = Math.max(0, Math.min(1, ((p[0] - ax) * vx + (p[1] - az) * vz) / l)); d = Math.min(d, Math.hypot(p[0] - ax - t * vx, p[1] - az - t * vz)); } return d; };
const area = (ring) => { let a = 0; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) a += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1]; return Math.abs(a / 2); };
let seed = 5; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const shadowAll = (o) => { o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; };
const extrude = (ring, color, depth = 1.1) => {
  const geo = new THREE.ExtrudeGeometry(new THREE.Shape(ring.map(([x, z]) => new THREE.Vector2(x, -z))), { depth, bevelEnabled: true, bevelThickness: 0.22, bevelSize: 0.14, bevelSegments: 3, curveSegments: 1 });
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85, emissive: new THREE.Color(color), emissiveIntensity: 0 });
  const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; return m;
};
const matC = {}; const M = (c, r = 0.8) => (matC[c + r] ??= new THREE.MeshStandardMaterial({ color: c, roughness: r }));

function makePalace() {
  const g = new THREE.Group(), white = M("#F7F4EE", 0.55), stone = M("#DCD3C3", 0.8), glass = M("#2B3B4E", 0.15);
  const gold = new THREE.MeshStandardMaterial({ color: "#F5C542", roughness: 0.25, metalness: 0.8 });
  const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); g.add(o); return o; };
  add(new RoundedBoxGeometry(6.4, 0.35, 4.2, 2, 0.06), stone, 0, 0.175, 0); add(new RoundedBoxGeometry(5.8, 0.3, 3.7, 2, 0.06), stone, 0, 0.5, 0);
  add(new RoundedBoxGeometry(5.2, 1.7, 2.6, 2, 0.06), white, 0, 1.5, -0.35);
  for (const s of [-1, 1]) add(new RoundedBoxGeometry(1.1, 2.1, 2.9, 2, 0.06), white, s * 2.4, 1.7, -0.3);
  for (let i = 0; i < 8; i++) { const x = -2 + i * (4 / 7); if (Math.abs(x) > 0.9) add(new THREE.BoxGeometry(0.32, 0.6, 0.04), glass, x, 1.55, 0.96); }
  for (let i = 0; i < 6; i++) add(new THREE.CylinderGeometry(0.11, 0.13, 1.6, 16), white, -1 + i * 0.4, 1.45, 1.35);
  add(new RoundedBoxGeometry(2.6, 0.18, 0.75, 2, 0.04), white, 0, 2.32, 1.15);
  const pd = add(new THREE.CylinderGeometry(0.0001, 1, 1, 3), white, 0, 2.62, 1.15); pd.scale.set(1.45, 0.42, 0.42); pd.rotation.x = Math.PI / 2; pd.rotation.z = Math.PI;
  add(new THREE.CylinderGeometry(0.95, 1, 0.7, 32), white, 0, 2.7, -0.35);
  add(new THREE.SphereGeometry(0.98, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: "#2C6FD1", roughness: 0.3, metalness: 0.2 }), 0, 3.05, -0.35);
  add(new THREE.CylinderGeometry(1, 1, 0.08, 32), gold, 0, 3.07, -0.35); add(new THREE.SphereGeometry(0.12, 16, 10), gold, 0, 4.06, -0.35);
  for (const s of [-1, 1]) { add(new THREE.CylinderGeometry(0.45, 0.5, 0.12, 24), M("#7FC37A", 0.9), s * 2.1, 0.71, 1.55); add(new THREE.SphereGeometry(0.28, 16, 12), M("#3E9B4F", 0.9), s * 2.1, 0.95, 1.55); }
  return shadowAll(g);
}

// ---------------------------------------------------------------- COUNTRY level
const country = new THREE.Group(); scene.add(country);
const R = {}; const pickables = [];
for (const r of MAP) {
  const grp = new THREE.Group(); const mats = [];
  for (const poly of r.polys) { const m = extrude(poly[0], COL[r.id]); m.userData.region = r.id; grp.add(m); mats.push(m.material); pickables.push(m); }
  country.add(grp);
  const ring = r.polys.reduce((a, p) => (p[0].length > a.length ? p[0] : a), []);
  const box = new THREE.Box3().setFromObject(grp), c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
  let best = [c.x, c.z], bd = -1; // label/town anchor: interior point far from the edge, near the centre
  for (let i = 0; i < 500; i++) { const p = [box.min.x + rnd() * size.x, box.min.z + rnd() * size.z]; if (!inside(p, ring)) continue; const s = edgeDist(p, ring) - 0.25 * Math.hypot(p[0] - c.x, p[1] - c.z); if (s > bd) { bd = s; best = p; } }
  R[r.id] = { id: r.id, mats, ring, box, size, anchor: new THREE.Vector3(best[0], TOP, best[1]), roomR: Math.max(0.8, bd), houses: [] };
}
HOUSES.forEach((h) => R[h.region] && R[h.region].houses.push(h));
const COUNT = Object.fromEntries(Object.keys(NAMES).map((id) => [id, R[id] ? R[id].houses.length : 0]));
const RANK = Object.keys(NAMES).filter((id) => R[id]).sort((a, b) => COUNT[b] - COUNT[a] || NAMES[a].localeCompare(NAMES[b]));
document.getElementById("total").textContent = HOUSES.length;
const rankOf = (id) => Object.values(COUNT).filter((n) => n > COUNT[id]).length + 1;

// symbolic town per region: up to 7 little houses (+ a palace if someone has one); the real city opens on tap
for (const reg of Object.values(R)) {
  const n = reg.houses.length; if (!n) continue;
  const g = new THREE.Group(), shown = Math.min(7, n), rad = Math.min(reg.roomR * 0.75, 0.9 + Math.sqrt(shown) * 0.9);
  const hasPalace = reg.houses.some((h) => h.kind === "palace");
  if (hasPalace) { const p = makePalace(); p.scale.setScalar(Math.min(0.6, reg.roomR * 0.16)); g.add(p); }
  for (let i = 0; i < shown - (hasPalace ? 1 : 0); i++) {
    const a = i * 2.39996 + 0.5, d = (hasPalace ? 0.55 : 0.25) * rad + rad * 0.5 * Math.sqrt(i / Math.max(1, shown));
    const h = shadowAll(makeHouse()); h.scale.setScalar(Math.min(1.1, 0.35 + reg.roomR * 0.12)); h.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); h.rotation.y = rnd() * 0.8 - 0.4; g.add(h);
  }
  g.position.copy(reg.anchor); country.add(g);
}

// ---------------------------------------------------------------- CITY level (built on demand, cached)
// Residents fill the blocks nearest the centre; around them: parks, spare plots for newcomers, a full street grid.
// Traffic and pedestrians grow with the population (few homes -> a couple of cars and walkers; many -> busy streets).
const LOT = 4.4, ROAD = 2.0, BW = 3 * LOT, BD = 2 * LOT, PX = BW + ROAD, PZ = BD + ROAD; // block = 3 x 2 plots
const cities = {}; let city = null; // current city
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function makePerson(shirt) {
  const g = new THREE.Group();
  const legs = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.22, 4, 8), M(["#2F3B4C", "#3B5A8C", "#4A3B32"][Math.floor(rnd() * 3)], 0.8)); legs.position.y = 0.24; g.add(legs);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.2, 4, 8), M(shirt, 0.8)); body.position.y = 0.52; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), M(["#E8B48A", "#D19A6C", "#B97E55"][Math.floor(rnd() * 3)], 0.7)); head.position.y = 0.8; g.add(head);
  return shadowAll(g);
}
function makePark(g, cx, cz) {
  const grass = M("#8FD06E", 0.95), path = M("#E9DCC4", 0.9), stone = M("#CFC6B6", 0.8);
  const base = new THREE.Mesh(new RoundedBoxGeometry(BW, 0.18, BD, 2, 0.06), grass); base.position.set(cx, TOP + 0.09, cz); base.receiveShadow = true; g.add(base);
  for (const [w, d] of [[BW - 0.4, 0.9], [0.9, BD - 0.4]]) { const p = new THREE.Mesh(new THREE.BoxGeometry(w, 0.03, d), path); p.position.set(cx, TOP + 0.19, cz); p.receiveShadow = true; g.add(p); }
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.35, 0.35, 32), stone); ring.position.set(cx, TOP + 0.35, cz); g.add(ring);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(1.08, 1.08, 0.05, 32), new THREE.MeshStandardMaterial({ color: "#4CB8E8", roughness: 0.1, emissive: "#1D8FD0", emissiveIntensity: 0.25 })); water.position.set(cx, TOP + 0.5, cz); g.add(water);
  const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.14, 0.9, 12), new THREE.MeshStandardMaterial({ color: "#BFE9FF", transparent: true, opacity: 0.75, roughness: 0.1 })); jet.position.set(cx, TOP + 0.95, cz); g.add(jet);
  for (const [dx, dz, r] of [[-2.2, -1.6, 0], [2.2, -1.6, 0], [-2.2, 1.6, Math.PI], [2.2, 1.6, Math.PI]]) {
    const bench = new THREE.Group(); const wood = M("#A0714A", 0.7);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.07, 0.3), wood); seat.position.y = 0.28; bench.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.25, 0.05), wood); back.position.set(0, 0.45, -0.13); bench.add(back);
    for (const x of [-0.42, 0.42]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.28), M("#3A3F48", 0.5)); leg.position.set(x, 0.14, 0); bench.add(leg); }
    bench.position.set(cx + dx, TOP + 0.18, cz + dz); bench.rotation.y = r; g.add(shadowAll(bench));
  }
  const flowers = ["#F05D8B", "#FFD23F", "#FF7A45", "#B07CFF", "#FFFFFF"];
  for (let i = 0; i < 18; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), M(flowers[i % 5], 0.6)); const a = (i / 18) * Math.PI * 2; f.position.set(cx + Math.cos(a) * 1.75, TOP + 0.24, cz + Math.sin(a) * 1.75); g.add(f); }
  for (const [dx, dz] of [[-5.2, -3.2], [-5.2, 3.2], [5.2, -3.2], [5.2, 3.2], [-3.6, -3.4], [3.6, 3.4], [-5.6, 0], [5.6, 0], [0, -3.6], [0, 3.6]]) {
    const t = shadowAll(makeTree(1.3 + rnd() * 0.7)); t.position.set(cx + dx + (rnd() - 0.5) * 0.4, TOP + 0.18, cz + dz + (rnd() - 0.5) * 0.3); g.add(t);
  }
  return jet;
}
function buildCity(id) {
  if (cities[id]) return cities[id];
  const reg = R[id], g = new THREE.Group(), spots = {}, list = reg.houses.slice();
  const order = { villa: 3, hovli: 2, rangli: 1, oddiy: 0 };
  list.sort((a, b) => (b.kind === "palace") - (a.kind === "palace") || (order[b.tier] || 0) - (order[a.tier] || 0) || (a.qism || 0) - (b.qism || 0));
  const palaces = list.filter((h) => h.kind === "palace").length, plots = list.length - palaces;
  const resBlocks = Math.max(1, Math.ceil(plots / 6) + palaces);
  const total = Math.max(14, Math.round(resBlocks * 1.8) + 8); // residential + parks + spare blocks
  const A0 = area(reg.ring), span0 = Math.max(reg.size.x, reg.size.z);
  const S = Math.max(Math.sqrt((total * PX * PZ * 2.4) / A0), 95 / span0); // the city grows with its population
  const ring = reg.ring.map(([x, z]) => [(x - reg.anchor.x) * S, (z - reg.anchor.z) * S]);
  const land = extrude(ring, COL[id], 1.1); land.userData.city = true; g.add(land);
  let xs = Infinity, xe = -Infinity, zs = Infinity, ze = -Infinity; ring.forEach(([x, z]) => { xs = Math.min(xs, x); xe = Math.max(xe, x); zs = Math.min(zs, z); ze = Math.max(ze, z); });
  const blocks = [];
  for (let bx = Math.floor(xs / PX); bx * PX < xe; bx++) for (let bz = Math.floor(zs / PZ); bz * PZ < ze; bz++) {
    const cx = bx * PX, cz = bz * PZ, hw = PX / 2, hd = PZ / 2;
    if ([[cx - hw, cz - hd], [cx + hw, cz - hd], [cx - hw, cz + hd], [cx + hw, cz + hd]].every((p) => inside(p, ring))) blocks.push([cx, cz]);
  }
  blocks.sort((a, b) => Math.hypot(a[0], a[1] * 1.3) - Math.hypot(b[0], b[1] * 1.3));
  const used = blocks.slice(0, total);
  const asphalt = M("#8E949B", 0.9), walk = M("#E8E1D3", 0.9), grass = M("#9CD37E", 0.95), line = M("#F4F1E8", 0.6);
  for (const [cx, cz] of used) {
    const road = new THREE.Mesh(new THREE.BoxGeometry(PX + 0.02, 0.06, PZ + 0.02), asphalt); road.position.set(cx, TOP + 0.03, cz); road.receiveShadow = true; g.add(road);
    for (let i = -2; i <= 2; i++) { const d = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.065, 0.12), line); d.position.set(cx + i * 2.6, TOP + 0.035, cz + PZ / 2); g.add(d); }
    for (let i = -1; i <= 1; i++) { const d = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.065, 0.9), line); d.position.set(cx + PX / 2, TOP + 0.035, cz + i * 2.8); g.add(d); }
  }
  // roles: centre blocks are homes; around them every 3rd block is a park, the rest are spare plots
  const role = used.map((_, i) => (i < resBlocks ? "home" : (i - resBlocks) % 3 === 1 ? "park" : "spare"));
  const jets = [];
  used.forEach(([cx, cz], i) => {
    if (role[i] === "park") { jets.push(makePark(g, cx, cz)); return; }
    const slab = new THREE.Mesh(new RoundedBoxGeometry(BW, 0.16, BD, 2, 0.06), walk); slab.position.set(cx, TOP + 0.08, cz); slab.receiveShadow = true; g.add(slab);
    for (const [dx, dz] of [[-BW / 2 + 0.25, -BD / 2 + 0.25], [BW / 2 - 0.25, BD / 2 - 0.25]]) {
      const lp = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.3, 6), M("#3A3F48", 0.5)); lp.position.set(cx + dx, TOP + 0.8, cz + dz); g.add(lp);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshStandardMaterial({ color: "#FFF3C4", emissive: "#FFD978", emissiveIntensity: 0.9 })); bulb.position.set(cx + dx, TOP + 1.48, cz + dz); g.add(bulb); const pool = new THREE.Mesh(new THREE.CircleGeometry(1.6, 24), new THREE.MeshBasicMaterial({ color: "#FF9A2E", transparent: true, opacity: 0.26, depthWrite: false, blending: THREE.AdditiveBlending })); pool.rotation.x = -Math.PI / 2; pool.position.set(cx + dx, TOP + 0.2, cz + dz); pool.userData.nightOnly = true; pool.visible = night; g.add(pool);
    }
  });
  // homes: palaces take a whole block, everyone else one plot
  let bi = 0; const queue = [];
  for (const h of list) if (h.kind === "palace") {
    const [cx, cz] = used[bi++]; const p = makePalace(); p.scale.setScalar(1.45); p.position.set(cx, TOP + 0.16, cz); p.userData.nick = h.nick; g.add(p);
    if (h.gift === "car") { const car = shadowAll(makeCar(h.carColor || "#E3262F", true)); car.scale.setScalar(2.2); car.position.set(cx + 4.6, TOP + 0.16, cz + 3.4); car.rotation.y = -0.4; g.add(car); }
    if (h.sign) { const cv = document.createElement("canvas"); cv.width = 512; cv.height = 96; const x = cv.getContext("2d"); x.fillStyle = "#14213D"; x.fillRect(0, 0, 512, 96); x.strokeStyle = "#F5C542"; x.lineWidth = 8; x.strokeRect(4, 4, 504, 88); x.fillStyle = "#F5C542"; x.font = "900 60px Inter, Arial"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(h.sign, 256, 52); const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; const pl = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.64), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.5, emissive: "#FFFFFF", emissiveMap: tx, emissiveIntensity: 0.7 })); pl.position.set(cx, TOP + 0.16 + 3.75 * 1.45 * 0.8, cz + 2.2); g.add(pl); }
    spots[h.nick.toLowerCase()] = { h, pos: new THREE.Vector3(cx, TOP, cz), height: 6.6 };
  }
  used.forEach(([cx, cz], i) => { if (i < bi || role[i] === "park") return; for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) queue.push([cx + (c - 1) * LOT, cz + (r - 0.5) * LOT, role[i]]); });
  // tall buildings take the back row of a block, low ones the front row, so nothing hides behind a tower
  const TALL = new Set(["minora", "burj", "pisa", "tajmahal", "masjid", "qasr", "uy2", "eyfel", "piramida", "teleminora", "egiz"]), usedQ = new Set();
  const lotFor = (h) => { const back = TALL.has(h.tier); let k = queue.findIndex((q, i) => !usedQ.has(i) && (((i % 6) < 3) === back)); if (k < 0) k = queue.findIndex((q, i) => !usedQ.has(i)); usedQ.add(k); return queue[k]; };
  let qi = 0;
  for (const h of list) {
    if (h.kind === "palace") continue;
    qi++; const [x, z] = lotFor(h); const t = tierOf(h.tier); const s = Math.min(2.0, (LOT - 0.5) / t.plot);
    const o = shadowAll(makeTier(h.tier || "oddiy", { roof: h.roof, wall: h.wall, car: h.car, floors: h.floors, kind2: h.kind2, flags: h.flags })); o.scale.setScalar(s); o.position.set(x, TOP + 0.16, z); o.rotation.y = 0; o.userData.nick = h.nick; g.add(o);
    if (h.gift === "car") { const car = shadowAll(makeCar(h.carColor || "#E3262F", true)); car.scale.setScalar(1.5); car.position.set(x + LOT * 0.32, TOP + 0.2, z + LOT * 0.36); car.rotation.y = 0.15; g.add(car); }
    const hb = new THREE.Box3().setFromObject(o);
    const lawn = new THREE.Mesh(new THREE.BoxGeometry(LOT - 0.3, 0.04, LOT - 0.3), grass); lawn.position.set(x, TOP + 0.17, z); lawn.receiveShadow = true; g.add(lawn);
    spots[h.nick.toLowerCase()] = { h, pos: new THREE.Vector3(x, TOP + 0.16, z), height: Math.max(1.2, hb.max.y - TOP - 0.16) };
  }
  const free = queue.filter((q, i) => !usedQ.has(i)).map(([x, z]) => [x, z]);
  for (qi = 0; qi < queue.length; qi++) { if (usedQ.has(qi)) continue; // spare plots: grass, a green "free plot" sign here and there, some trees
    const [x, z] = queue[qi]; const lawn = new THREE.Mesh(new THREE.BoxGeometry(LOT - 0.3, 0.04, LOT - 0.3), grass); lawn.position.set(x, TOP + 0.17, z); lawn.receiveShadow = true; g.add(lawn);
    if (rnd() < 0.45) { const tr = shadowAll(makeTree(1.3 + rnd() * 0.6)); tr.position.set(x + (rnd() - 0.5) * 1.6, TOP + 0.18, z + (rnd() - 0.5) * 1.6); g.add(tr); }
    else if (rnd() < 0.5) { const peg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6, 0.05), M("#7A5230")); peg.position.set(x, TOP + 0.48, z + 1.2); g.add(peg); const sign = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.35, 0.04), M("#22C55E", 0.6)); sign.position.set(x, TOP + 0.85, z + 1.2); g.add(sign); }
  }
  // countryside trees outside the street grid
  for (let i = 0; i < 260; i++) { const p = [xs + rnd() * (xe - xs), zs + rnd() * (ze - zs)]; if (!inside(p, ring) || edgeDist(p, ring) < 2) continue; if (used.some(([cx, cz]) => Math.abs(p[0] - cx) < PX / 2 + 1 && Math.abs(p[1] - cz) < PZ / 2 + 1)) continue; const tr = shadowAll(makeTree(1.4 + rnd())); tr.position.set(p[0], TOP, p[1]); g.add(tr); }

  // traffic: each car circles one block on its near lane (neighbouring blocks share roads -> two-way streets)
  const N = list.length;
  const rect = (cx, cz, hx, hz, d) => { const P = 4 * (hx + hz); let u = ((d % P) + P) % P; if (u < 2 * hx) return [cx - hx + u, cz + hz, 0]; u -= 2 * hx; if (u < 2 * hz) return [cx + hx, cz + hz - u, Math.PI / 2]; u -= 2 * hz; if (u < 2 * hx) return [cx + hx - u, cz - hz, Math.PI]; u -= 2 * hx; return [cx - hx, cz - hz + u, -Math.PI / 2]; };
  const movers = [];
  const pickBlock = () => used[Math.floor(Math.pow(rnd(), 1.6) * used.length)]; // busier near the centre
  const carCols = ["#2F6FD6", "#E3262F", "#F5F5F5", "#1F2937", "#F59E0B", "#10B981", "#9CA3AF"];
  const nCars = clamp(2 + Math.round(N * 0.7), 2, 50), nPeople = clamp(2 + Math.round(N * 1.0), 3, 70);
  for (let i = 0; i < nCars; i++) {
    const car = shadowAll(makeCar(carCols[i % carCols.length], rnd() < 0.15)); car.scale.setScalar(1.45); g.add(car);
    const [cx, cz] = pickBlock(); movers.push({ o: car, cx, cz, hx: BW / 2 + ROAD * 0.27, hz: BD / 2 + ROAD * 0.27, v: 3.2 + rnd() * 2.2, d0: rnd() * 100, dir: 1, kind: "car" });
  }
  const shirts = ["#EF4444", "#3B82F6", "#22C55E", "#F59E0B", "#A855F7", "#EC4899", "#14B8A6", "#FFFFFF"];
  for (let i = 0; i < nPeople; i++) {
    const p = makePerson(shirts[i % shirts.length]); g.add(p);
    const [cx, cz] = pickBlock(); const inPark = role[used.findIndex((b) => b[0] === cx && b[1] === cz)] === "park";
    movers.push({ o: p, cx, cz, hx: inPark ? 2.4 : BW / 2 - 0.3, hz: inPark ? 2.0 : BD / 2 - 0.3, v: 0.55 + rnd() * 0.45, d0: rnd() * 60, dir: rnd() < 0.5 ? 1 : -1, kind: "walk", ph: rnd() * 6 });
  }
  const anim = (t) => {
    for (const m of movers) {
      const [x, z, a] = rect(m.cx, m.cz, m.hx, m.hz, m.d0 + m.dir * m.v * t);
      m.o.position.set(x, TOP + (m.kind === "car" ? 0.06 : 0.17 + Math.abs(Math.sin(t * 7 + m.ph)) * 0.05), z);
      m.o.rotation.y = a + (m.dir < 0 ? Math.PI : 0); // model front = +x
    }
    for (const j of jets) j.scale.y = 1 + 0.12 * Math.sin(t * 6);
  };

  let ux = Infinity, uX = -Infinity, uz = Infinity, uZ = -Infinity; used.forEach(([cx, cz]) => { ux = Math.min(ux, cx - PX / 2); uX = Math.max(uX, cx + PX / 2); uz = Math.min(uz, cz - PZ / 2); uZ = Math.max(uZ, cz + PZ / 2); });
  if (!used.length) { ux = -20; uX = 20; uz = -20; uZ = 20; }
  // the opening shot frames the homes (+ a little of the neighbourhood); the camera may roam over the whole city
  let hx0 = Infinity, hX = -Infinity, hz0 = Infinity, hZ = -Infinity; used.slice(0, Math.max(resBlocks, 4)).forEach(([cx, cz]) => { hx0 = Math.min(hx0, cx - PX / 2); hX = Math.max(hX, cx + PX / 2); hz0 = Math.min(hz0, cz - PZ / 2); hZ = Math.max(hZ, cz + PZ / 2); });
  const c = { id, g, spots, anim, free, bounds: { x0: Math.min(xs, ux), x1: Math.max(xe, uX), z0: Math.min(zs, uz), z1: Math.max(ze, uZ) }, focus: { x0: hx0 - PX * 0.6, x1: hX + PX * 0.6, z0: hz0 - PZ * 0.6, z1: hZ + PZ * 0.6 } };
  g.visible = false; scene.add(g); cities[id] = c; return c;
}

// ---------------------------------------------------------------- labels (HTML, projected every frame)
const layer = document.getElementById("labels");
const regionTags = {};
for (const id of Object.keys(R)) {
  const el = document.createElement("div"); el.className = "tag" + (COUNT[id] ? "" : " zero");
  el.innerHTML = `<i></i>${NAMES[id]} · <b>${COUNT[id]}</b>`; el.onclick = () => enterCity(id); layer.appendChild(el); regionTags[id] = el;
}
const nickTags = {}; // created per city
const v = new THREE.Vector3();
function project(p, el, show) {
  if (!show) { el.style.display = "none"; return; }
  v.copy(p).project(camera);
  if (v.z > 1 || v.x < -1.2 || v.x > 1.2 || v.y < -1.2 || v.y > 1.2) { el.style.display = "none"; return; }
  el.style.display = ""; el.style.left = ((v.x + 1) / 2) * innerWidth + "px"; el.style.top = ((1 - v.y) / 2) * innerHeight + "px";
}
function declutter(order, tags, keep) {
  const kept = [];
  for (const k of order) {
    const el = tags[k]; if (!el || el.style.display === "none") continue;
    const w = el.offsetWidth, h = el.offsetHeight, cx = Math.max(w / 2 + 6, Math.min(innerWidth - w / 2 - 6, parseFloat(el.style.left))); el.style.left = cx + "px";
    const x = cx - w / 2, y = parseFloat(el.style.top) - h;
    if (k !== keep && kept.some((r) => x < r.x + r.w + 4 && x + w + 4 > r.x && y < r.y + r.h + 2 && y + h + 2 > r.y)) { el.style.display = "none"; continue; }
    kept.push({ x, y, w, h });
  }
}
let me = null;
function updateLabels() {
  const dist = camera.position.distanceTo(controls.target);
  for (const id of RANK) project(R[id].anchor.clone().setY(TOP + 3), regionTags[id], !city && dist > 25 && (COUNT[id] > 0 || dist < homeDist * 0.85));
  if (!city) { declutter(RANK, regionTags); return; }
  const near = Object.entries(city.spots).map(([k, s]) => [k, s, s.pos.distanceTo(camera.position)]).sort((a, b) => a[2] - b[2]);
  near.forEach(([k, s, d], i) => { const el = nickTags[k]; if (!el) return; el.classList.toggle("me", k === me); project(s.pos.clone().setY(s.pos.y + s.height + 0.3), el, k === me || (d < 140 && i < 45)); });
  const order = near.map(([k]) => k); if (me) order.unshift(me); declutter(order, nickTags, me);
}

// ---------------------------------------------------------------- camera: flights, framing around the sheet, pan limits
let fly = null;
function flyTo(pos, target, dur = 1.3) { fly = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos, t1: target, start: performance.now(), dur: dur * 1000 }; }
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const sheet = document.getElementById("sheet"), body = document.getElementById("sheetBody");
const FREE = { w: innerWidth, h: innerHeight };
function applyOffset() {
  const W = innerWidth, H = innerHeight, desk = W >= 900, sw = desk ? 398 : 0, sh = desk ? 0 : Math.min(sheet.offsetHeight, H * 0.6), top = desk ? 0 : 110;
  camera.aspect = W / H; camera.setViewOffset(W, H, -sw / 2, (sh - top) / 2, W, H); camera.updateProjectionMatrix();
  FREE.w = W - sw; FREE.h = H - sh - top;
}
const DIR = new THREE.Vector3(0, 0.68, 0.73).normalize();
function frame(cx, cz, w, d, k = 1.08) { // camera that fits a w x d area in the free part of the screen
  applyOffset();
  const vt = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), dist = Math.max(w / 2 / (vt * FREE.w / FREE.h), d / 2 / vt) * k;
  const t = new THREE.Vector3(cx, 0, cz); return { pos: t.clone().add(DIR.clone().multiplyScalar(dist)), target: t, dist };
}
let homeDist = 300;
const fitHome = () => { const f = frame(0, 4, 150, 96); homeDist = f.dist; return f; };
let LIMIT = { x0: -75, x1: 75, z0: -50, z1: 50 };
const setLimits = (b) => { LIMIT = b; controls.maxDistance = Math.max(b.x1 - b.x0, b.z1 - b.z0) * 2.4; controls.minDistance = city ? 5 : 8; };

// ---------------------------------------------------------------- modes
const crumb = document.getElementById("crumb");
function enterCity(id, then) {
  if (city && city.id === id) { then && then(); return; }
  const c = buildCity(id); applyNight(c.g);
  if (city) city.g.visible = false;
  city = c; country.visible = false; c.g.visible = true;
  for (const el of Object.values(nickTags)) el.remove(); for (const k in nickTags) delete nickTags[k];
  for (const [k, s] of Object.entries(c.spots)) {
    const el = document.createElement("div"); el.className = "nick" + (s.h.kind === "palace" ? " vip" : s.h.tier && s.h.tier !== "oddiy" ? " deco" : "");
    el.textContent = "@" + s.h.nick + (s.h.kind === "palace" ? " 👑" : ""); el.onclick = () => focusNick(k); layer.appendChild(el); nickTags[k] = el;
  }
  const f = c.focus, b = c.bounds; setSun((f.x0 + f.x1) / 2, (f.z0 + f.z1) / 2, Math.max(f.x1 - f.x0, f.z1 - f.z0) * 0.8 + 20);
  setLimits(b); scene.fog.near = 500; scene.fog.far = 1600;
  crumb.hidden = false; crumb.querySelector("b").textContent = NAMES[id];
  showCity(id);
  const fr = frame((f.x0 + f.x1) / 2, (f.z0 + f.z1) / 2, Math.max(f.x1 - f.x0, 30), Math.max(f.z1 - f.z0, 22), 1.15);
  camera.position.copy(fr.pos).add(DIR.clone().multiplyScalar(fr.dist * 0.6)); controls.target.copy(fr.target); flyTo(fr.pos, fr.target, 1.1);
  if (then) setTimeout(then, 650);
}
function exitCity() {
  if (city) city.g.visible = false; city = null; me = null; country.visible = true;
  for (const el of Object.values(nickTags)) el.style.display = "none";
  setSun(0, 0, 80); setLimits({ x0: -75, x1: 75, z0: -50, z1: 50 }); scene.fog.near = 380; scene.fog.far = 900;
  crumb.hidden = true; showBoard(false);
  const h = fitHome(); flyTo(h.pos, h.target); history.replaceState(null, "", location.pathname + location.search);
}
function focusNick(k) {
  const s = (city && city.spots[k]) || null;
  if (!s) { const h = HOUSES.find((x) => x.nick.toLowerCase() === k); if (h) enterCity(h.region, () => focusNick(k)); return; }
  me = k; showCity(city.id, false);
  const t = s.pos.clone().setY(TOP + 1); flyTo(t.clone().add(new THREE.Vector3(-4, 8 + s.height * 1.6, 13 + s.height * 2.4)), t, 1.4);
  history.replaceState(null, "", location.pathname + location.search + "#" + encodeURIComponent(s.h.nick));
}

// ---------------------------------------------------------------- sheet (collapsed bar by default; tap to open)
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
let open = false, boardAll = false;
const setSheetH = () => { document.documentElement.style.setProperty("--sheet-h", (innerWidth >= 900 ? 0 : sheet.offsetHeight) + "px"); applyOffset(); };
function setOpen(o) { open = o; sheet.classList.toggle("open", o); setSheetH(); }
function head(title, sub) {
  return `<button class="shead" id="shead" aria-expanded="${open}"><span class="st">${title}</span><span class="ss">${sub}</span><span class="chev">${open ? "▾" : "▴"}</span></button>`;
}
function wire() {
  document.getElementById("shead").onclick = () => { setOpen(!open); (city ? showCity(city.id, open) : showBoard(open)); };
  body.querySelectorAll(".get").forEach((b) => (b.onclick = () => openGet(city ? city.id : null)));
  body.querySelectorAll(".shop").forEach((b) => (b.onclick = () => openShop("villa")));
  setSheetH();
}
function showBoard(o = open) {
  open = o; sheet.classList.toggle("open", o);
  const leader = RANK[0], mx = Math.max(1, ...RANK.map((id) => COUNT[id]));
  const rows = (boardAll ? RANK : RANK.slice(0, 5)).map((id, i) => `<div class="row${COUNT[id] ? "" : " zero"}" data-r="${id}"><div class="n${i === 0 && COUNT[id] ? " first" : ""}">${rankOf(id)}</div><div class="name">${NAMES[id]}</div><div class="bar"><div style="width:${(COUNT[id] / mx) * 100}%"></div></div><div class="v">${COUNT[id]}</div></div>`).join("");
  body.innerHTML = head("🏆 Peshqadamlar", COUNT[leader] ? `1. ${NAMES[leader]} · ${COUNT[leader]}` : "") +
    `<div class="sbody">${o ? `<div class="sub">Viloyatni bosing — uning shahriga kirasiz</div>${rows}<button class="more" id="more">${boardAll ? "Qisqartirish ▲" : "Barcha 14 viloyat ▼"}</button>
      <div class="btns"><button class="btn ghost shop">✨ Uyingizni bezang</button><button class="btn primary get">＋ Uy olish</button></div>` : ""}</div>` +
    (o ? "" : `<button class="btn primary get mini">＋ Uy olish</button>`);
  body.querySelectorAll(".row").forEach((r) => (r.onclick = () => enterCity(r.dataset.r)));
  const more = document.getElementById("more"); if (more) more.onclick = () => { boardAll = !boardAll; showBoard(true); };
  wire();
}
function showCity(id, o = false) {
  open = o; sheet.classList.toggle("open", o);
  const list = R[id].houses.slice().sort((a, b) => (b.nick.toLowerCase() === me) - (a.nick.toLowerCase() === me) || (b.kind === "palace") - (a.kind === "palace"));
  const people = list.slice(0, 200).map((h) => `<button class="person" data-n="${esc(h.nick.toLowerCase())}"><div class="av">${esc(h.nick[0].toUpperCase())}</div><div class="who"><b>@${esc(h.nick)}</b><small>${esc(h.place || NAMES[id])}${h.qism ? " · " + h.qism + "-qism" : ""}</small></div>${h.note ? `<span class="pill">${esc(h.note)}</span>` : h.tier && h.tier !== "oddiy" ? `<span class="pill deco">${esc(tierOf(h.tier).name)}</span>` : ""}</button>`).join("");
  const sub = `${list.length} uy · ${list.length ? rankOf(id) + "-o‘rin" : "hali bo‘sh"}`;
  body.innerHTML = head(NAMES[id], me ? "@" + esc(city.spots[me]?.h.nick || "") : sub) +
    `<div class="sbody">${o ? (list.length ? `<div class="sub">${sub}</div><div class="people">${people}</div>` : `<div class="empty">Bu shaharda hali hech kim yo‘q. Birinchi bo‘ling — Instagram’da izohga “${NAMES[id]}” deb yozing!</div>`) +
      `<div class="btns"><button class="btn ghost shop">✨ Bezash</button><button class="btn primary get">＋ Uy olish</button></div>` : ""}</div>` +
    (o ? "" : `<button class="btn primary get mini">＋ Uy olish</button>`);
  body.querySelectorAll(".person").forEach((b) => (b.onclick = () => { focusNick(b.dataset.n); setOpen(false); showCity(id, false); }));
  wire();
}

// ---------------------------------------------------------------- search
const q = document.getElementById("q"), sugg = document.getElementById("sugg");
const norm = (s) => s.toLowerCase().replace(/^@/, "").trim();
q.oninput = () => {
  const t = norm(q.value); if (!t) { sugg.hidden = true; return; }
  const hits = HOUSES.filter((h) => h.nick.toLowerCase().includes(t) || NAMES[h.region].toLowerCase().includes(t) || (h.place || "").toLowerCase().includes(t)).slice(0, 6);
  sugg.innerHTML = hits.length ? hits.map((h) => `<button data-n="${esc(h.nick.toLowerCase())}">@${esc(h.nick)} <small>${esc(h.place || NAMES[h.region])}</small></button>`).join("") : `<div class="none">Topilmadi. <a href="#" id="getFromSearch">Uy olish →</a></div>`;
  sugg.hidden = false;
  const gs = document.getElementById("getFromSearch"); if (gs) gs.onclick = (e) => { e.preventDefault(); sugg.hidden = true; openGet(null); };
  sugg.querySelectorAll("button").forEach((b) => (b.onclick = () => { focusNick(b.dataset.n); sugg.hidden = true; q.value = ""; q.blur(); }));
};
q.onkeydown = (e) => { if (e.key === "Enter") { const b = sugg.querySelector("button"); if (b) b.click(); } if (e.key === "Escape") { sugg.hidden = true; q.blur(); } };
document.addEventListener("pointerdown", (e) => { if (!e.target.closest(".search")) sugg.hidden = true; });

// ---------------------------------------------------------------- taps on the 3D scene (ignore drags)
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(); let down = null;
canvas.addEventListener("pointerdown", (e) => (down = [e.clientX, e.clientY, performance.now()]));
canvas.addEventListener("pointerup", (e) => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 8 || performance.now() - down[2] > 450) return;
  ptr.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ptr, camera);
  if (!city) { const hit = ray.intersectObjects(pickables, false)[0]; if (hit) enterCity(hit.object.userData.region); return; }
  for (const hit of ray.intersectObjects(city.g.children, true)) { let o = hit.object; while (o && !o.userData.nick && o.parent) o = o.parent; if (o && o.userData.nick) { focusNick(o.userData.nick.toLowerCase()); return; } }
});
document.getElementById("home").onclick = () => exitCity();
document.getElementById("nightBtn").onclick = () => setNight(!night);
{ let pref = null; try { pref = localStorage.getItem("vb_night"); } catch {} const qn = new URLSearchParams(location.search).get("night"); if (qn === "1" || (qn === null && pref === "1")) setNight(true); }
crumb.querySelector("button").onclick = () => exitCity();

// ---------------------------------------------------------------- loop
function resize() { renderer.setSize(innerWidth, innerHeight, false); setSheetH(); }
addEventListener("resize", resize);
setSun(0, 0, 80); showBoard(false); resize();
const h0 = fitHome(); camera.position.copy(h0.pos).multiplyScalar(1.5); controls.target.copy(h0.target); flyTo(h0.pos, h0.target, 1.8); setLimits(LIMIT);
const deep = decodeURIComponent(location.hash.slice(1)).toLowerCase().replace(/^@/, "");
if (deep && HOUSES.some((h) => h.nick.toLowerCase() === deep)) setTimeout(() => focusNick(deep), 700);
const pan = new THREE.Vector3();
renderer.setAnimationLoop(() => {
  if (fly) { const k = Math.min(1, (performance.now() - fly.start) / fly.dur), e = ease(k); camera.position.lerpVectors(fly.p0, fly.p1, e); controls.target.lerpVectors(fly.t0, fly.t1, e); if (k >= 1) fly = null; }
  controls.update();
  // keep the map on screen: clamp the look-at point to the current area
  const t = controls.target, cx = Math.max(LIMIT.x0, Math.min(LIMIT.x1, t.x)), cz = Math.max(LIMIT.z0, Math.min(LIMIT.z1, t.z));
  if (cx !== t.x || cz !== t.z) { pan.set(cx - t.x, 0, cz - t.z); t.add(pan); camera.position.add(pan); }
  if (city && city.anim) city.anim(performance.now() / 1000);
  renderer.render(scene, camera); updateLabels(); shopFrame();
});
controls.addEventListener("start", () => (fly = null));
{ const ld = document.getElementById("loading"); ld.classList.add("done"); setTimeout(() => ld.remove(), 500); }

// ---------------------------------------------------------------- ?rec=1 : deterministic recorder (films reels from the real site, frame by frame)
if (new URLSearchParams(location.search).has("rec")) {
  document.body.classList.add("rec"); renderer.setAnimationLoop(null);
  const RW = 1080, RH = 1920; renderer.setPixelRatio(1); renderer.setSize(RW, RH, false); canvas.style.width = RW + "px"; canvas.style.height = RH + "px";
  let villa = null, villaAt = 0;
  const cam = (c) => { camera.clearViewOffset(); camera.aspect = RW / RH; camera.updateProjectionMatrix(); camera.position.set(c[0], c[1], c[2]); camera.lookAt(c[3], c[4], c[5]); };
  window.REC = {
    country() { if (city) exitCity(); fly = null; scene.fog.near = 380; scene.fog.far = 900; return { anchors: Object.fromEntries(Object.entries(R).map(([k, r]) => [k, [r.anchor.x, r.anchor.z]])) }; },
    city(id) { enterCity(id); fly = null; const c = city; return { focus: c.focus, free: c.free.slice(0, 12), spots: Object.fromEntries(Object.entries(c.spots).map(([k, s]) => [k, [s.pos.x, s.pos.y, s.pos.z, s.height]])) }; },
    villa(id, x, z, at) { const c = buildCity(id); if (villa) villa.parent.remove(villa); villa = shadowAll(makeTier("villa")); villa.scale.setScalar(1.05); villa.position.set(x, TOP + 0.16, z); c.g.add(villa); villaAt = at; },
    night(on) { setNight(!!on); },
    noVilla() { if (villa) villa.parent.remove(villa); villa = null; },
    frame(t, c, pts = []) {
      cam(c); if (city && city.anim) city.anim(t);
      if (villa) { const k = Math.max(0, Math.min(1, (t - villaAt) / 0.9)), e = 1 - Math.pow(1 - k, 3) * Math.cos(k * 5) * (1 - k); villa.visible = k > 0; villa.scale.set(1.05, 1.05 * Math.max(0.001, e), 1.05); }
      renderer.render(scene, camera);
      const img = canvas.toDataURL("image/jpeg", 0.92);
      const proj = pts.map((p) => { const v = new THREE.Vector3(p[0], p[1], p[2]).project(camera); return [((v.x + 1) / 2) * RW, ((1 - v.y) / 2) * RH, v.z < 1]; });
      return { img, proj };
    },
  };
  window.REC_READY = true;
}
