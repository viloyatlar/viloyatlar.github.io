// Viloyatlar bellashuvi — interactive 3D map. Free orbit/zoom, tap a region, search a nick, deep link: #nick
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { TIERS, tierOf, makeTier, ROOFS, WALLS } from "./tiers.js";

const NAMES = { QQR: "Qoraqalpog‘iston", NAV: "Navoiy", BUX: "Buxoro", XOR: "Xorazm", SAM: "Samarqand", JIZ: "Jizzax", SIR: "Sirdaryo", TOV: "Toshkent viloyati", TSH: "Toshkent shahri", NAM: "Namangan", AND: "Andijon", FAR: "Farg‘ona", QAS: "Qashqadaryo", SUR: "Surxondaryo" };
const COL = { QQR: "#E3C78F", NAV: "#EFB27A", BUX: "#E59A6E", XOR: "#7FC37A", SAM: "#6DB4D8", JIZ: "#C7D46E", SIR: "#9AD07C", TOV: "#63B07A", TSH: "#F2C14E", NAM: "#86C9A8", AND: "#7DC860", FAR: "#B9A6E0", QAS: "#E8B24F", SUR: "#D98C8C" };
const TOP = 1.32; // region top surface height

const [MAP, DATA] = await Promise.all([fetch("data/map.json").then((r) => r.json()), fetch("data/houses.json?v=" + Date.now()).then((r) => r.json())]);
const HOUSES = DATA.houses.slice();
const IG = DATA.instagram || "negachi.uz", INSTAGRAM = "https://www.instagram.com/" + IG + "/", POST = DATA.post || INSTAGRAM;
// ?demo=300 — preview with fake residents (to see how crowded regions look); never shown without the parameter
const DEMO = Number(new URLSearchParams(location.search).get("demo") || 0);
if (DEMO) { const ids = ["TSH", "TSH", "TSH", "SAM", "SAM", "FAR", "AND", "NAM", "TOV", "QAS", "SUR", "BUX", "XOR", "NAV", "JIZ", "SIR", "QQR"]; for (let i = 0; i < DEMO; i++) HOUSES.push({ nick: "demo_" + (i + 1), region: ids[(i * 7 + (i % 5)) % ids.length], kind: "house", tier: ["villa", "hovli", "hovli", "rangli", "rangli", "rangli"][i % 23] || "oddiy", demo: true }); }

// ---------------------------------------------------------------- renderer / scene
const canvas = document.getElementById("c");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene(); scene.background = new THREE.Color("#CFE2EE"); scene.fog = new THREE.Fog("#CFE2EE", 380, 900);
scene.add(new THREE.HemisphereLight("#EAF4FF", "#7A6A55", 0.95));
const sun = new THREE.DirectionalLight("#FFF1DC", 2.5); sun.position.set(-30, 60, 30); sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096); sun.shadow.radius = 3; sun.shadow.bias = -0.0004;
Object.assign(sun.shadow.camera, { left: -80, right: 80, top: 70, bottom: -70, near: 1, far: 220 }); scene.add(sun);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.MeshStandardMaterial({ color: "#E6DCC9", roughness: 0.95 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

const camera = new THREE.PerspectiveCamera(36, 1, 0.5, 2000);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.08; controls.screenSpacePanning = false;
controls.minDistance = 6; controls.maxDistance = 520; controls.maxPolarAngle = Math.PI * 0.44;
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

// ---------------------------------------------------------------- regions
const inside = (pt, ring) => { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, yi] = ring[i], [xj, yj] = ring[j]; if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c; } return c; };
const edgeDist = (p, ring) => { let d = 1e9; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [ax, az] = ring[j], [bx, bz] = ring[i]; const vx = bx - ax, vz = bz - az, l = vx * vx + vz * vz || 1; const t = Math.max(0, Math.min(1, ((p[0] - ax) * vx + (p[1] - az) * vz) / l)); d = Math.min(d, Math.hypot(p[0] - ax - t * vx, p[1] - az - t * vz)); } return d; };
let seed = 5; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const R = {}; const pickables = [];
for (const r of MAP) {
  const grp = new THREE.Group(); const mats = [];
  for (const poly of r.polys) {
    const geo = new THREE.ExtrudeGeometry(new THREE.Shape(poly[0].map(([x, z]) => new THREE.Vector2(x, -z))), { depth: 1.1, bevelEnabled: true, bevelThickness: 0.22, bevelSize: 0.14, bevelSegments: 3, curveSegments: 1 });
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({ color: COL[r.id], roughness: 0.85, emissive: new THREE.Color(COL[r.id]), emissiveIntensity: 0 });
    const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; m.userData.region = r.id; grp.add(m); mats.push(mat); pickables.push(m);
  }
  scene.add(grp);
  const ring = r.polys.reduce((a, p) => (p[0].length > a.length ? p[0] : a), []);
  const box = new THREE.Box3().setFromObject(grp), c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
  // label anchor: interior point far from the edge, near the centre
  let best = [c.x, c.z], bd = -1;
  for (let i = 0; i < 500; i++) { const p = [box.min.x + rnd() * size.x, box.min.z + rnd() * size.z]; if (!inside(p, ring)) continue; const s = edgeDist(p, ring) - 0.25 * Math.hypot(p[0] - c.x, p[1] - c.z); if (s > bd) { bd = s; best = p; } }
  R[r.id] = { id: r.id, grp, mats, ring, box, size, anchor: new THREE.Vector3(best[0], TOP, best[1]), houses: [] };
}
HOUSES.forEach((h) => R[h.region] && R[h.region].houses.push(h));

// ---------------------------------------------------------------- buildings
const matCache = {}; const M = (c, r = 0.7, extra = {}) => (matCache[c + r] ??= new THREE.MeshStandardMaterial({ color: c, roughness: r, ...extra }));
function makeHouse(roof = "#C0452E") {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(1, 0.8, 0.9, 2, 0.05), M("#F4EEE4", 0.8)); body.position.y = 0.4; g.add(body);
  const rg = new THREE.CylinderGeometry(0.0001, 0.86, 0.6, 4, 1); rg.rotateY(Math.PI / 4);
  const rf = new THREE.Mesh(rg, M(roof, 0.6)); rf.position.y = 1.1; rf.scale.set(1.1, 1, 1); g.add(rf);
  for (const x of [-0.22, 0.22]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.02), M("#2B3B4E", 0.2)); w.position.set(x, 0.45, 0.46); g.add(w); }
  const d = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.36, 0.02), M("#6B4226")); d.position.set(0, 0.18, 0.46); g.add(d);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}
function makePalace() {
  const g = new THREE.Group(), white = M("#F7F4EE", 0.55), stone = M("#DCD3C3", 0.8), glass = M("#2B3B4E", 0.15);
  const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
  add(new RoundedBoxGeometry(6.4, 0.35, 4.2, 2, 0.06), stone, 0, 0.175, 0); add(new RoundedBoxGeometry(5.8, 0.3, 3.7, 2, 0.06), stone, 0, 0.5, 0);
  add(new RoundedBoxGeometry(5.2, 1.7, 2.6, 2, 0.06), white, 0, 1.5, -0.35);
  for (const s of [-1, 1]) add(new RoundedBoxGeometry(1.1, 2.1, 2.9, 2, 0.06), white, s * 2.4, 1.7, -0.3);
  for (let i = 0; i < 8; i++) { const x = -2 + i * (4 / 7); if (Math.abs(x) > 0.9) add(new THREE.BoxGeometry(0.32, 0.6, 0.04), glass, x, 1.55, 0.96); }
  for (let i = 0; i < 6; i++) add(new THREE.CylinderGeometry(0.11, 0.13, 1.6, 16), white, -1 + i * 0.4, 1.45, 1.35);
  add(new RoundedBoxGeometry(2.6, 0.18, 0.75, 2, 0.04), white, 0, 2.32, 1.15);
  const pd = add(new THREE.CylinderGeometry(0.0001, 1, 1, 3), white, 0, 2.62, 1.15); pd.scale.set(1.45, 0.42, 0.42); pd.rotation.x = Math.PI / 2; pd.rotation.z = Math.PI;
  add(new THREE.CylinderGeometry(0.95, 1, 0.7, 32), white, 0, 2.7, -0.35);
  add(new THREE.SphereGeometry(0.98, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), M("#2C6FD1", 0.3, { metalness: 0.2 }), 0, 3.05, -0.35);
  add(new THREE.CylinderGeometry(1, 1, 0.08, 32), M("#F5C542", 0.25, { metalness: 0.8 }), 0, 3.07, -0.35);
  add(new THREE.SphereGeometry(0.12, 16, 10), M("#F5C542", 0.25, { metalness: 0.8 }), 0, 4.06, -0.35);
  for (const s of [-1, 1]) { add(new THREE.CylinderGeometry(0.45, 0.5, 0.12, 24), M("#7FC37A", 0.9), s * 2.1, 0.71, 1.55); add(new THREE.SphereGeometry(0.28, 16, 12), M("#3E9B4F", 0.9), s * 2.1, 0.95, 1.55); }
  return g;
}
// apartment block for crowded regions: one floor = 2 residents
function makeBlock(floors) {
  const g = new THREE.Group(), h = 0.42;
  const body = new THREE.Mesh(new RoundedBoxGeometry(1.6, floors * h, 1.2, 2, 0.05), M("#F1ECE2", 0.8)); body.position.y = (floors * h) / 2; g.add(body);
  for (let f = 0; f < floors; f++) for (const x of [-0.45, 0, 0.45]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.2, 0.02), M("#2B3B4E", 0.2)); w.position.set(x, f * h + 0.22, 0.61); g.add(w); }
  const roof = new THREE.Mesh(new RoundedBoxGeometry(1.7, 0.12, 1.3, 2, 0.04), M("#C0452E", 0.6)); roof.position.y = floors * h + 0.06; g.add(roof);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

// ---------------------------------------------------------------- layout: fixed spots first, then a grid inside the region, nearest to the anchor
const SPOTS = {}; // nick -> {pos, region, obj}
for (const reg of Object.values(R)) {
  const list = reg.houses; if (!list.length) continue;
  const used = [];
  const RANKT = { villa: 3, hovli: 2, rangli: 1, oddiy: 0 };
  const radius = (h, scale) => (h.kind === "palace" ? 5 : (tierOf(h.tier).plot * scale) / 2);
  const place = (h, p, scale) => {
    const obj = h.kind === "palace" ? makePalace() : makeTier(h.tier || "oddiy", { roof: h.roof, wall: h.wall, car: h.car });
    obj.scale.setScalar(h.kind === "palace" ? 1.25 : scale); obj.position.set(p[0], TOP, p[1]); obj.rotation.y = (rnd() - 0.5) * 0.7;
    obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); scene.add(obj);
    used.push({ p, r: radius(h, scale) });
    const ht = h.kind === "palace" ? 6.2 : { villa: 1.9, hovli: 1.6, rangli: 1.5, oddiy: 1.5 }[h.tier || "oddiy"] * scale;
    SPOTS[h.nick.toLowerCase()] = { h, pos: new THREE.Vector3(p[0], TOP, p[1]), height: ht, region: reg.id };
  };
  const auto = list.filter((h) => !(h.at && inside(h.at, reg.ring))).sort((a, b) => (RANKT[b.tier] || 0) - (RANKT[a.tier] || 0));
  const area = reg.size.x * reg.size.z;
  // spacing shrinks as the region fills up; beyond capacity plain houses move into apartment blocks (decorated tiers always keep their plot)
  const load = auto.reduce((n, h) => n + Math.pow(tierOf(h.tier).plot / 1.2, 2), 0);
  const step = Math.max(1.4, Math.min(3.2, Math.sqrt(area / Math.max(1, load * 6))));
  const scale = Math.max(0.7, Math.min(1.6, step * 0.55));
  list.filter((h) => h.at && inside(h.at, reg.ring)).forEach((h) => place(h, h.at, 1.6));
  const cand = [];
  for (let x = reg.box.min.x; x <= reg.box.max.x; x += step * 0.5) for (let z = reg.box.min.z; z <= reg.box.max.z; z += step * 0.45) {
    const p = [x + (rnd() - 0.5) * step * 0.15, z + (rnd() - 0.5) * step * 0.15];
    if (inside(p, reg.ring) && edgeDist(p, reg.ring) > step * 0.45) cand.push(p);
  }
  cand.sort((a, b) => Math.hypot(a[0] - reg.anchor.x, a[1] - reg.anchor.z) - Math.hypot(b[0] - reg.anchor.x, b[1] - reg.anchor.z));
  const free = (p, r) => edgeDist(p, reg.ring) > r * 0.8 && used.every((u) => Math.hypot(u.p[0] - p[0], u.p[1] - p[1]) > Math.max(step * 0.8, (r + u.r) * 0.95));
  // last resort: golden-angle spiral from the region anchor (works even in tiny regions like Toshkent shahri)
  const spiral = (r) => { for (let i = 0; i < 900; i++) { const a = i * 2.39996, d = 0.35 * Math.sqrt(i), p = [reg.anchor.x + Math.cos(a) * d, reg.anchor.z + Math.sin(a) * d]; if (inside(p, reg.ring) && used.every((u) => Math.hypot(u.p[0] - p[0], u.p[1] - p[1]) > (r + u.r) * 0.85)) return p; } return null; };
  const leftover = [];
  for (const h of auto) {
    const r = radius(h, scale), p = cand.find((c) => free(c, r)); if (p) { place(h, p, scale); continue; }
    if ((h.tier || "oddiy") !== "oddiy") { // a decorated home never goes into a block: shrink it until it fits
      let k = 0.75, q = null; while (k > 0.3 && !(q = cand.find((c) => free(c, r * k)))) k -= 0.1;
      const sk = scale * Math.max(0.35, k); place(h, q || spiral(radius(h, sk)) || [reg.anchor.x, reg.anchor.z], sk); continue;
    }
    leftover.push(h);
  }
  if (leftover.length) { // crowded: blocks of 20 residents, each resident gets a spot label on its block
    for (let b = 0; b * 20 < leftover.length; b++) {
      const group = leftover.slice(b * 20, b * 20 + 20), p = cand.find((c) => free(c, 1)) || spiral(0.9) || [reg.anchor.x, reg.anchor.z];
      used.push({ p, r: 1 });
      const blk = makeBlock(Math.ceil(group.length / 2)); blk.position.set(p[0], TOP, p[1]); scene.add(blk);
      group.forEach((h, k) => (SPOTS[h.nick.toLowerCase()] = { h, pos: new THREE.Vector3(p[0], TOP + Math.floor(k / 2) * 0.42, p[1]), height: 0.6, region: reg.id }));
    }
  }
}

// ---------------------------------------------------------------- labels (HTML, projected every frame)
const layer = document.getElementById("labels");
const COUNT = Object.fromEntries(Object.keys(NAMES).map((id) => [id, R[id] ? R[id].houses.length : 0]));
const RANK = Object.keys(NAMES).filter((id) => R[id]).sort((a, b) => COUNT[b] - COUNT[a] || NAMES[a].localeCompare(NAMES[b]));
const regionTags = {};
for (const id of Object.keys(R)) {
  const el = document.createElement("div"); el.className = "tag" + (COUNT[id] ? "" : " zero");
  el.innerHTML = `<i></i>${NAMES[id]} · <b>${COUNT[id]}</b>`; el.onclick = () => selectRegion(id); layer.appendChild(el); regionTags[id] = el;
}
const nickTags = {};
for (const [k, s] of Object.entries(SPOTS)) {
  const el = document.createElement("div"); el.className = "nick" + (s.h.kind === "palace" ? " vip" : ""); el.textContent = "@" + s.h.nick + (s.h.kind === "palace" ? " 👑" : "");
  el.onclick = () => focusNick(k); layer.appendChild(el); nickTags[k] = el;
}
document.getElementById("total").textContent = HOUSES.length;

const v = new THREE.Vector3();
function project(p, el, show) {
  if (!show) { el.style.display = "none"; return; }
  v.copy(p).project(camera);
  if (v.z > 1 || v.x < -1.2 || v.x > 1.2 || v.y < -1.2 || v.y > 1.2) { el.style.display = "none"; return; }
  el.style.display = ""; el.style.left = ((v.x + 1) / 2) * innerWidth + "px"; el.style.top = ((1 - v.y) / 2) * innerHeight + "px";
}
let me = null, selected = null;
function updateLabels() {
  const dist = camera.position.distanceTo(controls.target);
  for (const id of RANK) {
    const small = ["TSH", "SIR", "AND", "NAM"].includes(id);
    const home = fitHome.last || 300; const show = selected ? id === selected && dist > 30 : dist > 60 && (COUNT[id] > 0 || (dist < home * 0.8 && (!small || dist < home * 0.45)));
    project(R[id].anchor.clone().setY(TOP + 3), regionTags[id], show);
  }
  // declutter: bigger regions win, overlapping smaller tags hide
  const kept = [];
  for (const id of RANK) {
    const el = regionTags[id]; if (el.style.display === "none") continue;
    const w = el.offsetWidth, h = el.offsetHeight, cx = Math.max(w / 2 + 6, Math.min(innerWidth - w / 2 - 6, parseFloat(el.style.left))); el.style.left = cx + "px"; const x = cx - w / 2, y = parseFloat(el.style.top) - h;
    if (kept.some((k) => x < k.x + k.w + 4 && x + w + 4 > k.x && y < k.y + k.h + 2 && y + h + 2 > k.y)) { el.style.display = "none"; continue; }
    kept.push({ x, y, w, h });
  }
  // nick labels only when zoomed in; at most 40 nearest to the camera
  const near = Object.entries(SPOTS).map(([k, s]) => [k, s, s.pos.distanceTo(camera.position)]).sort((a, b) => a[2] - b[2]);
  near.forEach(([k, s, d], i) => { const el = nickTags[k]; el.classList.toggle("me", k === me); project(s.pos.clone().setY(s.pos.y + s.height), el, k === me || (dist < 90 && d < 120 && i < 40)); });
  // declutter nick labels (the searched one always stays)
  const keptN = [];
  for (const [k] of near) {
    const el = nickTags[k]; if (el.style.display === "none") continue;
    const w = el.offsetWidth, h = el.offsetHeight, x = parseFloat(el.style.left) - w / 2, y = parseFloat(el.style.top) - h;
    if (k !== me && keptN.some((r) => x < r.x + r.w + 3 && x + w + 3 > r.x && y < r.y + r.h + 2 && y + h + 2 > r.y)) { el.style.display = "none"; continue; }
    keptN.push({ x, y, w, h });
  }
}

// ---------------------------------------------------------------- camera flights
const HOME = { pos: new THREE.Vector3(0, 245, 262), target: new THREE.Vector3(0, 0, 6) };
let fly = null;
function flyTo(pos, target, dur = 1.3) { fly = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos, t1: target, start: performance.now(), dur: dur * 1000 }; }
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const FREE = { w: innerWidth, h: innerHeight };
function applyOffset() {
  const W = innerWidth, H = innerHeight, desk = W >= 900, sw = desk ? 398 : 0, sh = desk ? 0 : Math.min(sheet.offsetHeight, H * 0.52), top = desk ? 0 : 110;
  camera.aspect = W / H; camera.setViewOffset(W, H, -sw / 2, (sh - top) / 2, W, H); camera.updateProjectionMatrix();
  FREE.w = W - sw; FREE.h = H - sh - top;
}
function fitHome() {
  applyOffset();
  const vt = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), fit = Math.max(72 / (vt * FREE.w / FREE.h), 52 / vt) * 1.08; // map ~140 x 100 units
  const dir = new THREE.Vector3(0, 0.68, 0.73).normalize(); return { pos: HOME.target.clone().add(dir.multiplyScalar(fit)), target: HOME.target.clone() };
}

// ---------------------------------------------------------------- UI: sheet
const body = document.getElementById("sheetBody"), sheet = document.getElementById("sheet");
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const setSheetH = () => { document.documentElement.style.setProperty("--sheet-h", (innerWidth >= 900 ? 0 : sheet.offsetHeight) + "px"); if (typeof applyOffset === "function" && camera) applyOffset(); };
let boardAll = false;
function showBoard() {
  selected = null; highlight(null);
  const mx = Math.max(1, ...RANK.map((id) => COUNT[id]));
  const shown = boardAll ? RANK : RANK.slice(0, 5);
  const rows = shown.map((id, i) => `<div class="row${COUNT[id] ? "" : " zero"}" data-r="${id}"><div class="n${i === 0 && COUNT[id] ? " first" : ""}">${i + 1}</div><div class="name">${NAMES[id]}</div><div class="bar"><div style="width:${(COUNT[id] / mx) * 100}%"></div></div><div class="v">${COUNT[id]}</div></div>`).join("");
  body.innerHTML = `<h2>🏆 Peshqadamlar</h2><div class="sub">Viloyatni bosing — qo‘shnilaringizni ko‘ring</div>${rows}<button class="more" id="more">${boardAll ? "Qisqartirish ▲" : "Barcha 14 viloyat ▼"}</button>
    <div class="btns"><button class="btn ghost shop">✨ Uyingizni bezang</button><button class="btn primary get">＋ Uy olish</button></div>`;
  body.querySelectorAll(".row").forEach((r) => (r.onclick = () => selectRegion(r.dataset.r)));
  document.getElementById("more").onclick = () => { boardAll = !boardAll; showBoard(); };
  body.querySelector(".get").onclick = () => openGet(null);
  body.querySelector(".shop").onclick = () => openShop("villa");
  setSheetH();
}
function selectRegion(id, keepMe = false) {
  selected = id; if (!keepMe) me = null; highlight(id);
  const reg = R[id], list = reg.houses.slice().sort((a, b) => (b.nick.toLowerCase() === me) - (a.nick.toLowerCase() === me) || (b.kind === "palace") - (a.kind === "palace"));
  const people = list.map((h) => `<button class="person" data-n="${esc(h.nick.toLowerCase())}"><div class="av">${esc(h.nick[0].toUpperCase())}</div><div class="who"><b>@${esc(h.nick)}</b><small>${esc(h.place || NAMES[id])}${h.qism ? " · " + h.qism + "-qism" : ""}</small></div>${h.note ? `<span class="pill">${esc(h.note)}</span>` : ""}</button>`).join("");
  const rank = Object.values(COUNT).filter((n) => n > list.length).length + 1;
  body.innerHTML = `<h2>${NAMES[id]}</h2><div class="sub">${list.length} uy · ${list.length ? rank + "-o‘rin" : "hali uy yo‘q"}</div>
    ${list.length ? `<div class="people">${people}</div>` : `<div class="empty">Bu viloyatda hali hech kim yo‘q. Birinchi bo‘ling — Instagram’da izohga “${NAMES[id]}” deb yozing!</div>`}
    <div class="btns"><button class="btn ghost" id="back">← Barcha viloyatlar</button><button class="btn primary get">＋ Uy olish</button></div>`;
  body.querySelectorAll(".person").forEach((b) => (b.onclick = () => focusNick(b.dataset.n)));
  body.querySelector(".get").onclick = () => openGet(id);
  document.getElementById("back").onclick = () => { showBoard(); const h = fitHome(); flyTo(h.pos, h.target); history.replaceState(null, "", location.pathname); };
  setSheetH();
  if (!keepMe) { const span = Math.max(reg.size.x, reg.size.z, 14); const t = reg.anchor.clone().setY(0); flyTo(t.clone().add(new THREE.Vector3(0, span * 1.5 + 22, span * 1.35 + 20)), t); }
}
function focusNick(k) {
  const s = SPOTS[k]; if (!s) return;
  me = k; selectRegion(s.region, true);
  const t = s.pos.clone().setY(TOP + 1); flyTo(t.clone().add(new THREE.Vector3(-5, 9 + s.height * 1.7, 16 + s.height * 2.6)), t, 1.6);
  history.replaceState(null, "", "#" + encodeURIComponent(s.h.nick));
}
function highlight(id) { for (const r of Object.values(R)) r.mats.forEach((m) => (m.emissiveIntensity = id && r.id === id ? 0.22 : 0)); }

// ---------------------------------------------------------------- "Uy olish": follow -> comment your region -> house appears in the next episode
const getEl = document.getElementById("get");
const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
function openGet(regionId) {
  const reg = regionId || store.get("vb_region") || "";
  const opts = Object.keys(NAMES).sort((a, b) => NAMES[a].localeCompare(NAMES[b])).map((id) => `<option value="${id}"${id === reg ? " selected" : ""}>${NAMES[id]}</option>`).join("");
  const done1 = store.get("vb_follow") === "1";
  getEl.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="gt">
    <button class="x" aria-label="Yopish">✕</button>
    <div class="mh"><div class="mi">🏠</div><h3 id="gt">Bepul uy oling</h3><p>3 qadam — keyingi qismda uyingizni quraman!</p></div>
    <ol class="steps">
      <li class="${done1 ? "ok" : ""}"><b>Obuna bo‘ling</b><span>Instagram’da @${esc(IG)}</span>
        <a class="btn ig" id="g1" href="${INSTAGRAM}" target="_blank" rel="noopener">Obuna bo‘lish</a></li>
      <li><b>Izohga viloyatingizni yozing</b><span>Oxirgi videoga — masalan, “Samarqand 🏠”</span>
        <div class="pick"><select id="greg"><option value="">Viloyatni tanlang…</option>${opts}</select></div>
        <a class="btn ig" id="g2" href="${POST}" target="_blank" rel="noopener">Nusxalash va izoh yozish</a><small id="gcopy" hidden>Nusxalandi — izohga joylang ✓</small></li>
      <li><b>Uyingiz quriladi</b><span>Keyingi qismda videoda ko‘rsatiladi va shu xaritaga qo‘shiladi. Nikingizni qidiruvda tekshirib turing!</span><a href="#" class="tolink" id="g3">✨ Chiroyliroq uy: hovli, mashina, villa →</a></li>
    </ol></div>`;
  getEl.hidden = false;
  const close = () => (getEl.hidden = true);
  getEl.querySelector(".x").onclick = close; getEl.onclick = (e) => { if (e.target === getEl) close(); };
  getEl.querySelector("#g3").onclick = (e) => { e.preventDefault(); close(); openShop("hovli"); };
  getEl.querySelector("#g1").onclick = () => { store.set("vb_follow", "1"); getEl.querySelector(".steps li").classList.add("ok"); };
  getEl.querySelector("#g2").onclick = () => {
    const id = getEl.querySelector("#greg").value; if (id) store.set("vb_region", id);
    const text = (id ? NAMES[id].replace(" shahri", "").replace(" viloyati", " viloyati") : "Viloyatim") + " 🏠";
    try { navigator.clipboard.writeText(text).then(() => (getEl.querySelector("#gcopy").hidden = false)).catch(() => {}); } catch {}
  };
}
addEventListener("keydown", (e) => { if (e.key === "Escape") getEl.hidden = true; });

// ---------------------------------------------------------------- "Uyingizni bezang": live 3D preview of every tier
const shopEl = document.getElementById("shop"); let shop = null;
function shopScene() {
  const cv = shopEl.querySelector("canvas"), r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
  r.setPixelRatio(Math.min(devicePixelRatio, 2)); r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.toneMapping = THREE.ACESFilmicToneMapping; r.outputColorSpace = THREE.SRGBColorSpace;
  const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight("#F2FAFF", "#6B5E4E", 1.05));
  const l = new THREE.DirectionalLight("#FFF1DC", 2.4); l.position.set(-4, 8, 5); l.castShadow = true; l.shadow.mapSize.set(1024, 1024); Object.assign(l.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4 }); sc.add(l);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 3.0, 0.3, 64), new THREE.MeshStandardMaterial({ color: "#E3C78F", roughness: 0.9 })); disc.position.y = -0.15; disc.receiveShadow = true; sc.add(disc);
  const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  return { r, sc, cam, obj: null, t0: performance.now() };
}
function setShopModel(tier, opts) {
  if (shop.obj) shop.sc.remove(shop.obj);
  const o = makeTier(tier, opts); o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  const k = 3.6 / Math.max(1.6, tierOf(tier).plot); o.scale.setScalar(Math.min(1.8, k)); shop.sc.add(o); shop.obj = o;
}
function openShop(tierId = "villa") {
  let cur = tierId, roof = ROOFS[1], wall = WALLS[2];
  shopEl.innerHTML = `<div class="modal shopm" role="dialog" aria-modal="true" aria-labelledby="st">
    <button class="x" aria-label="Yopish">✕</button>
    <h3 id="st">✨ Uyingizni bezang</h3>
    <div class="stage"><canvas></canvas><span class="soon">Tez orada</span></div>
    <div class="tabs">${TIERS.map((t) => `<button data-t="${t.id}">${t.name}</button>`).join("")}</div>
    <div class="tinfo"></div>
    <a class="btn ig" href="${INSTAGRAM}" target="_blank" rel="noopener">Birinchilardan bo‘lish uchun obuna bo‘ling</a>
    <p class="fine">Viloyatlar bellashuvida har bir uy 1 ball — bezak reytingga ta’sir qilmaydi.</p></div>`;
  shopEl.hidden = false;
  shop = shopScene();
  const info = shopEl.querySelector(".tinfo");
  const render = () => {
    const t = tierOf(cur);
    shopEl.querySelectorAll(".tabs button").forEach((b) => b.classList.toggle("on", b.dataset.t === cur));
    info.innerHTML = `<div class="tp"><b>${t.name}</b><span>${t.price}</span></div><ul>${t.items.map((i) => `<li>${i}</li>`).join("")}</ul>` +
      (cur === "rangli" ? `<div class="sw"><small>Tom:</small>${ROOFS.map((c) => `<button data-roof="${c}" style="background:${c}" class="${c === roof ? "on" : ""}"></button>`).join("")}</div><div class="sw"><small>Devor:</small>${WALLS.map((c) => `<button data-wall="${c}" style="background:${c}" class="${c === wall ? "on" : ""}"></button>`).join("")}</div>` : "");
    info.querySelectorAll("[data-roof]").forEach((b) => (b.onclick = () => { roof = b.dataset.roof; render(); }));
    info.querySelectorAll("[data-wall]").forEach((b) => (b.onclick = () => { wall = b.dataset.wall; render(); }));
    setShopModel(cur, cur === "rangli" ? { roof, wall } : {});
  };
  shopEl.querySelectorAll(".tabs button").forEach((b) => (b.onclick = () => { cur = b.dataset.t; render(); }));
  const close = () => { shopEl.hidden = true; shop.r.dispose(); shop = null; };
  shopEl.querySelector(".x").onclick = close; shopEl.onclick = (e) => { if (e.target === shopEl) close(); };
  render();
}
function shopFrame() {
  if (!shop) return;
  const cv = shop.r.domElement, w = cv.clientWidth, h = cv.clientHeight;
  if (cv.width !== Math.floor(w * shop.r.getPixelRatio())) { shop.r.setSize(w, h, false); shop.cam.aspect = w / h; shop.cam.updateProjectionMatrix(); }
  const a = 0.35 + 0.75 * Math.sin(((performance.now() - shop.t0) / 1000) * 0.45); // swing around the front, never the back
  shop.cam.position.set(Math.sin(a) * 8.6, 5.0, Math.cos(a) * 8.6); shop.cam.lookAt(0, 0.6, 0);
  shop.r.render(shop.sc, shop.cam);
}
addEventListener("keydown", (e) => { if (e.key === "Escape" && shop) shopEl.querySelector(".x").click(); });

// ---------------------------------------------------------------- search
const q = document.getElementById("q"), sugg = document.getElementById("sugg");
const norm = (s) => s.toLowerCase().replace(/^@/, "").trim();
q.oninput = () => {
  const t = norm(q.value); if (!t) { sugg.hidden = true; return; }
  const hits = HOUSES.filter((h) => h.nick.toLowerCase().includes(t) || NAMES[h.region].toLowerCase().includes(t) || (h.place || "").toLowerCase().includes(t)).slice(0, 6);
  sugg.innerHTML = hits.length ? hits.map((h) => `<button data-n="${esc(h.nick.toLowerCase())}">@${esc(h.nick)} <small>${esc(h.place || NAMES[h.region])}</small></button>`).join("") : `<div class="none">Topilmadi. <a href="#" id="getFromSearch">Uy olish →</a></div>`;
  sugg.hidden = false; const gs = document.getElementById("getFromSearch"); if (gs) gs.onclick = (e) => { e.preventDefault(); sugg.hidden = true; openGet(null); };
  sugg.querySelectorAll("button").forEach((b) => (b.onclick = () => { focusNick(b.dataset.n); sugg.hidden = true; q.value = ""; q.blur(); }));
};
q.onkeydown = (e) => { if (e.key === "Enter") { const b = sugg.querySelector("button"); if (b) b.click(); } if (e.key === "Escape") { sugg.hidden = true; q.blur(); } };
document.addEventListener("pointerdown", (e) => { if (!e.target.closest(".search")) sugg.hidden = true; });

// ---------------------------------------------------------------- tap a region on the map (ignore drags)
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(); let down = null;
canvas.addEventListener("pointerdown", (e) => (down = [e.clientX, e.clientY, performance.now()]));
canvas.addEventListener("pointerup", (e) => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6 || performance.now() - down[2] > 400) return;
  ptr.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ptr, camera);
  const hit = ray.intersectObjects(pickables, false)[0]; if (hit) selectRegion(hit.object.userData.region);
});
document.getElementById("home").onclick = () => { showBoard(); me = null; const h = fitHome(); flyTo(h.pos, h.target); history.replaceState(null, "", location.pathname); };

// ---------------------------------------------------------------- loop
function resize() { renderer.setSize(innerWidth, innerHeight, false); setSheetH(); applyOffset(); }
addEventListener("resize", resize); resize();
const h0 = fitHome(); fitHome.last = h0.pos.distanceTo(h0.target); camera.position.copy(h0.pos).multiplyScalar(1.5); controls.target.copy(h0.target); flyTo(h0.pos, h0.target, 1.8);
showBoard();
const deep = decodeURIComponent(location.hash.slice(1)).toLowerCase().replace(/^@/, "");
if (deep && SPOTS[deep]) setTimeout(() => focusNick(deep), 900);
renderer.setAnimationLoop(() => {
  if (fly) {
    const k = Math.min(1, (performance.now() - fly.start) / fly.dur), e = ease(k);
    camera.position.lerpVectors(fly.p0, fly.p1, e); controls.target.lerpVectors(fly.t0, fly.t1, e); if (k >= 1) fly = null;
  }
  controls.update(); renderer.render(scene, camera); updateLabels(); shopFrame();
});
controls.addEventListener("start", () => (fly = null));
{ const ld = document.getElementById("loading"); ld.classList.add("done"); setTimeout(() => ld.remove(), 500); }
