// Uy darajalari (tiers): oddiy (bepul) | rangli | hovli | villa. All models sit on y=0, front faces +z, ~1 unit = small house width.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export const TIERS = [
  { id: "oddiy", name: "Oddiy uy", price: "Bepul", items: ["Shinam uy", "Xaritada nikingiz", "Videoda viloyatingiz hisobiga +1"], plot: 1.2 },
  { id: "rangli", name: "Rangli uy", price: "Tez orada", items: ["Tom va devor rangini tanlaysiz", "Daraxt va gulzor", "Saytda alohida belgi"], plot: 1.9 },
  { id: "hovli", name: "Hovli", price: "Tez orada", items: ["Katta uy + devor va darvoza", "Hovlida mashina", "So‘ri, daraxtlar"], plot: 3.0 },
  { id: "villa", name: "Villa", price: "Tez orada", items: ["2 qavatli zamonaviy villa", "Hovuz va sport mashina", "Kechki chiroqlar", "Videoda alohida ko‘rsatiladi"], plot: 3.8 },
];
// special one-off homes requested in comments (not sold in the shop)
export const SPECIAL = [
  { id: "uy2", name: "Ikki qavatli uy", price: "", items: [], plot: 1.7 },
  { id: "oquy", name: "Oq uy", price: "", items: [], plot: 2.6 },
  { id: "minora", name: "Ko‘p qavatli uy", price: "", items: [], plot: 1.7 },
  { id: "zavod", name: "Zavod", price: "", items: [], plot: 2.6 },
  { id: "masjid", name: "Masjid", price: "", items: [], plot: 2.4 },
  { id: "muzey", name: "Muzey", price: "", items: [], plot: 2.5 },
  { id: "qasr", name: "Qasr", price: "", items: [], plot: 2.6 },
  { id: "burj", name: "Burj Xalifa", price: "", items: [], plot: 2.0 },
  { id: "tajmahal", name: "Toj Mahal", price: "", items: [], plot: 2.7 },
  { id: "pisa", name: "Piza minorasi", price: "", items: [], plot: 1.6 },
  { id: "piramida", name: "Piramida", price: "", items: [], plot: 2.7 },
  { id: "eyfel", name: "Eyfel minorasi", price: "", items: [], plot: 2.2 },
];
export const tierOf = (id) => TIERS.find((t) => t.id === id) || SPECIAL.find((t) => t.id === id) || TIERS[0];

const cache = {};
const M = (c, r = 0.7, extra = {}) => (cache[c + r + JSON.stringify(extra)] ??= new THREE.MeshStandardMaterial({ color: c, roughness: r, ...extra }));
function mesh(g, geo, m, x, y, z) { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; g.add(o); return o; }
const box = (w, h, d, r = 0.04) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2.1, h / 2.1, d / 2.1));

export function makeHouse({ roof = "#C0452E", wall = "#F4EEE4", door = "#6B4226" } = {}) {
  const g = new THREE.Group();
  mesh(g, box(1, 0.8, 0.9, 0.05), M(wall, 0.8), 0, 0.4, 0);
  const rg = new THREE.CylinderGeometry(0.0001, 0.86, 0.6, 4, 1); rg.rotateY(Math.PI / 4);
  mesh(g, rg, M(roof, 0.6), 0, 1.1, 0).scale.set(1.1, 1, 1);
  for (const x of [-0.22, 0.22]) mesh(g, new THREE.BoxGeometry(0.22, 0.24, 0.02), M("#2B3B4E", 0.2), x, 0.45, 0.46);
  mesh(g, new THREE.BoxGeometry(0.2, 0.36, 0.02), M(door), 0, 0.18, 0.46);
  return g;
}
export function makeTree(s = 1, leaf = "#3E9B4F") {
  const g = new THREE.Group();
  mesh(g, new THREE.CylinderGeometry(0.05 * s, 0.07 * s, 0.5 * s, 8), M("#7A5230", 0.9), 0, 0.25 * s, 0);
  mesh(g, new THREE.SphereGeometry(0.3 * s, 14, 10), M(leaf, 0.9), 0, 0.68 * s, 0);
  mesh(g, new THREE.SphereGeometry(0.22 * s, 14, 10), M(leaf, 0.9), 0.14 * s, 0.86 * s, 0.05 * s);
  return g;
}
export function makeCar(color = "#2F6FD6", sport = false) {
  const g = new THREE.Group(), L = sport ? 0.95 : 0.85, H = sport ? 0.16 : 0.2;
  mesh(g, box(L, H, 0.42, 0.06), M(color, 0.3, { metalness: 0.4 }), 0, 0.09 + H / 2, 0);
  mesh(g, box(L * (sport ? 0.45 : 0.55), sport ? 0.13 : 0.17, 0.38, 0.06), M("#1E2733", 0.15, { metalness: 0.3 }), sport ? -0.05 : -0.04, 0.09 + H + (sport ? 0.06 : 0.08), 0);
  for (const x of [-L * 0.32, L * 0.32]) for (const z of [-0.2, 0.2]) { const w = mesh(g, new THREE.CylinderGeometry(0.09, 0.09, 0.07, 14), M("#15171C", 0.8), x, 0.09, z); w.rotation.x = Math.PI / 2; }
  for (const z of [-0.13, 0.13]) mesh(g, new THREE.BoxGeometry(0.02, 0.05, 0.07), M("#FFF6C8", 0.3, { emissive: "#FFE9A0", emissiveIntensity: 0.6 }), L / 2, 0.09 + H * 0.6, z);
  return g;
}
function makeSori() { // traditional platform with a red carpet and a low table
  const g = new THREE.Group(), wood = M("#9A6B3F", 0.8);
  mesh(g, box(0.9, 0.08, 0.7, 0.02), wood, 0, 0.3, 0);
  for (const x of [-0.4, 0.4]) for (const z of [-0.3, 0.3]) mesh(g, new THREE.BoxGeometry(0.06, 0.3, 0.06), wood, x, 0.15, z);
  for (const x of [-0.42, 0.42]) mesh(g, new THREE.BoxGeometry(0.04, 0.25, 0.72), wood, x, 0.45, 0);
  mesh(g, new THREE.BoxGeometry(0.8, 0.012, 0.6), M("#B3262D", 0.9), 0, 0.345, 0);
  mesh(g, new THREE.CylinderGeometry(0.16, 0.16, 0.04, 20), wood, 0, 0.42, 0);
  return g;
}
function makeFence(w, d, gate = 0.7, color = "#E9DFCF") {
  const g = new THREE.Group(), h = 0.32, t = 0.07, m = M(color, 0.85);
  mesh(g, new THREE.BoxGeometry(w, h, t), m, 0, h / 2, -d / 2);
  for (const s of [-1, 1]) mesh(g, new THREE.BoxGeometry(t, h, d), m, (s * w) / 2, h / 2, 0);
  const side = (w - gate) / 2; for (const s of [-1, 1]) mesh(g, new THREE.BoxGeometry(side, h, t), m, s * (gate / 2 + side / 2), h / 2, d / 2);
  for (const s of [-1, 1]) mesh(g, box(0.12, 0.5, 0.12, 0.02), M("#C9B79C", 0.8), s * (gate / 2 + 0.03), 0.25, d / 2);
  mesh(g, new THREE.BoxGeometry(gate - 0.04, 0.3, 0.04), M("#5B4636", 0.6, { metalness: 0.3 }), 0, 0.18, d / 2 + 0.02); // gate
  return g;
}
function plotBase(w, d, grass = "#8FCB72") {
  const g = new THREE.Group();
  mesh(g, box(w, 0.08, d, 0.04), M(grass, 0.95), 0, 0.04, 0);
  return g;
}
function lamp(h = 0.6) {
  const g = new THREE.Group();
  mesh(g, new THREE.CylinderGeometry(0.02, 0.025, h, 8), M("#2A2E35", 0.5, { metalness: 0.5 }), 0, h / 2, 0);
  mesh(g, new THREE.SphereGeometry(0.06, 12, 8), M("#FFF3C4", 0.3, { emissive: "#FFD978", emissiveIntensity: 1.4 }), 0, h + 0.03, 0);
  return g;
}

export const ROOFS = ["#C0452E", "#2F6FD6", "#2E9E5B", "#7C4DCC", "#E08A1E"];
export const WALLS = ["#F4EEE4", "#FFE9C7", "#E3F1FF", "#F9E1EA", "#E7F6E1"];

export function makeTier(tier = "oddiy", o = {}) {
  const g = new THREE.Group();
  if (tier === "rangli") {
    g.add(plotBase(1.9, 1.7));
    const h = makeHouse({ roof: o.roof || ROOFS[1], wall: o.wall || WALLS[2] }); h.position.set(-0.15, 0.08, -0.1); g.add(h);
    const t = makeTree(1); t.position.set(0.62, 0.08, -0.35); g.add(t);
    const bed = ["#F05D8B", "#FFD23F", "#FF7A45", "#B07CFF"];
    for (let i = 0; i < 7; i++) mesh(g, new THREE.SphereGeometry(0.055, 10, 8), M(bed[i % 4], 0.6), -0.55 + i * 0.13, 0.13, 0.62);
    mesh(g, new THREE.BoxGeometry(0.22, 0.012, 0.5), M("#D8CDB8", 0.9), -0.15, 0.085, 0.6);
  } else if (tier === "hovli" && !o.flags) {
    g.add(plotBase(3, 2.6));
    g.add(makeFence(2.9, 2.5));
    const h = makeHouse({ roof: o.roof || "#B7412A", wall: o.wall || "#FFF2DD" }); h.scale.setScalar(1.25); h.position.set(-0.55, 0.08, -0.55); g.add(h);
    const c = makeCar(o.car || "#2F6FD6"); c.position.set(0.85, 0.08, 0.55); c.rotation.y = -Math.PI / 2 + 0.15; g.add(c);
    const s = makeSori(); s.position.set(0.85, 0.08, -0.6); g.add(s);
    for (const [x, z] of [[-1.15, 0.75], [0.2, -0.95]]) { const t = makeTree(1.05); t.position.set(x, 0.08, z); g.add(t); }
    mesh(g, new THREE.BoxGeometry(0.62, 0.012, 1.1), M("#D8CDB8", 0.9), 0, 0.085, 0.7);
  } else if (tier === "villa") {
    g.add(plotBase(3.8, 3.2, "#7CC56A"));
    const white = M("#F6F4EF", 0.5), dark = M("#1F2A36", 0.12, { metalness: 0.35 }), wood = M("#A0714A", 0.7);
    mesh(g, box(2.0, 0.7, 1.2, 0.04), white, -0.45, 0.43, -0.75);
    mesh(g, box(1.5, 0.62, 1.25, 0.04), white, -0.2, 1.09, -0.85);
    mesh(g, box(2.1, 0.06, 1.3, 0.02), wood, -0.45, 0.8, -0.73);
    mesh(g, box(1.6, 0.06, 1.35, 0.02), wood, -0.2, 1.42, -0.83);
    mesh(g, new THREE.BoxGeometry(1.5, 0.5, 0.02), dark, -0.5, 0.4, -0.14);
    mesh(g, new THREE.BoxGeometry(1.1, 0.42, 0.02), dark, -0.25, 1.08, -0.21);
    mesh(g, new THREE.BoxGeometry(1.2, 0.02, 0.12), M("#C9D3DC", 0.2, { metalness: 0.6 }), -0.25, 0.86, -0.16); // balcony glass rail
    // pool with deck
    mesh(g, box(1.7, 0.06, 1.05, 0.02), M("#D9C8AE", 0.8), 0.95, 0.11, 0.75);
    mesh(g, new THREE.BoxGeometry(1.35, 0.03, 0.75), M("#3FB6E8", 0.05, { metalness: 0.1, emissive: "#1D8FD0", emissiveIntensity: 0.35 }), 0.95, 0.15, 0.75);
    for (const x of [0.45, 0.8]) mesh(g, box(0.18, 0.05, 0.42, 0.02), M("#FFFFFF", 0.6), x - 1.05, 0.13, 1.15); // sun loungers
    const c = makeCar(o.car || "#E3262F", true); c.position.set(-1.2, 0.08, 0.35); c.rotation.y = -0.35; g.add(c);
    for (const [x, z] of [[1.75, -1.35], [-1.75, -1.4], [1.75, 0.0]]) { const t = makeTree(1.15, "#2F8F48"); t.position.set(x, 0.08, z); g.add(t); }
    for (const [x, z] of [[-0.3, 1.45], [0.3, 1.45], [-1.75, 1.45], [1.75, 1.45]]) { const l = lamp(); l.position.set(x, 0.08, z); g.add(l); }
    for (let i = 0; i < 9; i++) mesh(g, box(0.36, 0.22, 0.2, 0.06), M("#3E8E4A", 0.95), -1.75 + i * 0.44, 0.19, -1.5); // hedge
  } else if (tier === "uy2") { // two-storey family house with a balcony
    g.add(plotBase(1.7, 1.6));
    const wall = M(o.wall || "#F3E6D3", 0.8), roofM = M(o.roof || "#3F6FB5", 0.6), glass = M("#2B3B4E", 0.2);
    mesh(g, box(1.1, 1.2, 0.95, 0.05), wall, 0, 0.68, -0.1);
    const rg = new THREE.CylinderGeometry(0.0001, 0.92, 0.55, 4, 1); rg.rotateY(Math.PI / 4);
    mesh(g, rg, roofM, 0, 1.55, -0.1).scale.set(1.15, 1, 1.05);
    for (const y of [0.45, 0.98]) for (const x of [-0.27, 0.27]) mesh(g, new THREE.BoxGeometry(0.24, 0.26, 0.02), glass, x, y, 0.38);
    mesh(g, new THREE.BoxGeometry(0.22, 0.38, 0.02), M("#6B4226"), 0, 0.27, 0.381);
    mesh(g, box(0.9, 0.05, 0.28, 0.02), M("#D9CDB8", 0.8), 0, 0.82, 0.5); // balcony
    mesh(g, new THREE.BoxGeometry(0.9, 0.14, 0.02), M("#FFFFFF", 0.5), 0, 0.91, 0.64);
    const t = makeTree(0.9); t.position.set(0.66, 0.08, 0.45); g.add(t);
  } else if (tier === "oquy") { // "Oq uy": white mansion with a columned portico
    g.add(plotBase(2.6, 2.1, "#88C96E"));
    const white = M("#FBFAF6", 0.45), roofM = M("#C8CDD3", 0.5), glass = M("#2B3B4E", 0.2);
    mesh(g, box(2.0, 0.9, 1.0, 0.04), white, 0, 0.53, -0.35);
    mesh(g, box(2.1, 0.12, 1.1, 0.03), roofM, 0, 1.04, -0.35);
    for (const x of [-0.75, -0.45, 0.45, 0.75]) for (const y of [0.35, 0.72]) mesh(g, new THREE.BoxGeometry(0.16, 0.22, 0.02), glass, x, y, 0.16);
    mesh(g, box(0.9, 0.08, 0.5, 0.02), white, 0, 0.12, 0.38); // steps
    for (let i = 0; i < 4; i++) mesh(g, new THREE.CylinderGeometry(0.05, 0.06, 0.82, 12), white, -0.3 + i * 0.2, 0.55, 0.42);
    const ped = mesh(g, new THREE.CylinderGeometry(0.0001, 1, 1, 3), white, 0, 1.12, 0.38); ped.scale.set(0.62, 0.22, 0.25); ped.rotation.x = Math.PI / 2; ped.rotation.z = Math.PI;
    mesh(g, box(0.95, 0.07, 0.4, 0.02), white, 0, 0.98, 0.38);
    mesh(g, new THREE.BoxGeometry(0.2, 0.36, 0.02), M("#3A2A1E"), 0, 0.3, 0.16);
    for (const x of [-1.05, 1.05]) { const t = makeTree(0.9); t.position.set(x, 0.08, 0.55); g.add(t); }
    mesh(g, new THREE.CylinderGeometry(0.28, 0.32, 0.08, 24), M("#7FC37A", 0.9), 0, 0.12, 0.85); // round lawn
    mesh(g, new THREE.CylinderGeometry(0.012, 0.012, 0.7, 6), M("#9CA3AF", 0.4), 0, 0.45, 0.85); // flag pole
    mesh(g, new THREE.BoxGeometry(0.22, 0.13, 0.01), M("#22C55E", 0.6), 0.11, 0.73, 0.85);
  } else if (tier === "minora") { // apartment tower, floors from the comment (o.floors)
    const n = Math.max(3, Math.min(12, o.floors || 5)), fh = 0.3;
    g.add(plotBase(1.7, 1.6, "#9AD07C"));
    const wall = M(o.wall || ["#F1E6D2", "#E3ECF5", "#F5E1D8"][n % 3], 0.75), glass = M("#2B3B4E", 0.2);
    mesh(g, box(1.25, n * fh, 1.05, 0.04), wall, 0, 0.08 + (n * fh) / 2, -0.1);
    for (let f = 0; f < n; f++) for (const x of [-0.38, 0, 0.38]) mesh(g, new THREE.BoxGeometry(0.22, 0.16, 0.02), glass, x, 0.08 + f * fh + 0.17, 0.43);
    for (let f = 1; f < n; f += 2) mesh(g, box(1.0, 0.03, 0.14, 0.01), M("#FFFFFF", 0.5), 0, 0.08 + f * fh + 0.04, 0.5); // balconies
    mesh(g, box(1.32, 0.1, 1.12, 0.03), M("#9CA3AF", 0.6), 0, 0.08 + n * fh + 0.05, -0.1);
    mesh(g, new THREE.BoxGeometry(0.3, 0.3, 0.04), M("#6B4226"), 0, 0.23, 0.44);
  } else if (tier === "zavod") { // factory: sawtooth hall + striped chimney; o.kind2 = "pul" (gold coins) | "mashina" (cars outside)
    g.add(plotBase(2.6, 2.0, "#B8C4B0"));
    const hall = M("#D6D3CC", 0.8), roof = M("#7A8B99", 0.6);
    mesh(g, box(1.9, 0.75, 1.15, 0.03), hall, -0.2, 0.46, -0.2);
    for (let i = 0; i < 3; i++) { const r = new THREE.CylinderGeometry(0.0001, 0.42, 1.15, 3, 1); r.rotateX(Math.PI / 2); const m = mesh(g, r, roof, -0.8 + i * 0.6, 0.98, -0.2); m.rotation.z = Math.PI / 2; m.scale.set(1, 0.7, 1); }
    for (let i = 0; i < 5; i++) mesh(g, new THREE.CylinderGeometry(0.12, 0.13, 0.4, 16), M(i % 2 ? "#FFFFFF" : "#C0392B", 0.6), 0.95, 0.3 + i * 0.4, -0.55);
    mesh(g, new THREE.BoxGeometry(0.5, 0.42, 0.02), M("#4B5563", 0.5), -0.2, 0.3, 0.38);
    if (o.kind2 === "pul") { const gold = M("#F5C542", 0.25); for (let i = 0; i < 6; i++) { const c = mesh(g, new THREE.CylinderGeometry(0.14, 0.14, 0.05, 20), gold, 0.75 + (i % 3) * 0.12, 0.11 + Math.floor(i / 3) * 0.06, 0.6 + (i % 2) * 0.1); c.material = gold; } mesh(g, box(0.7, 0.28, 0.04, 0.02), M("#16A34A", 0.5), -0.2, 0.95, 0.4); }
    if (o.kind2 === "mashina") for (let i = 0; i < 3; i++) { const c = makeCar(["#E3262F", "#2F6FD6", "#F5F5F5"][i]); c.scale.setScalar(0.55); c.position.set(-0.9 + i * 0.6, 0.08, 0.72); g.add(c); }
  } else if (tier === "masjid") { // mosque: cube, turquoise dome on a drum, two minarets
    g.add(plotBase(2.4, 2.4, "#C9D9B8"));
    const sand = M("#E9DCC0", 0.75), tq = M("#2BB3B1", 0.35), gold = M("#F5C542", 0.25);
    mesh(g, box(1.4, 0.8, 1.3, 0.03), sand, 0, 0.48, -0.1);
    mesh(g, new THREE.CylinderGeometry(0.5, 0.52, 0.3, 24), sand, 0, 1.03, -0.1);
    const d = mesh(g, new THREE.SphereGeometry(0.52, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), tq, 0, 1.18, -0.1); d.scale.set(1, 1.25, 1);
    mesh(g, new THREE.CylinderGeometry(0.02, 0.03, 0.3, 8), gold, 0, 1.9, -0.1);
    for (const x of [-0.95, 0.95]) { mesh(g, new THREE.CylinderGeometry(0.11, 0.13, 2.1, 16), sand, x, 1.13, 0.45); mesh(g, new THREE.CylinderGeometry(0.17, 0.17, 0.06, 16), sand, x, 1.75, 0.45); const c = mesh(g, new THREE.SphereGeometry(0.12, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), tq, x, 2.18, 0.45); c.scale.set(1, 1.5, 1); }
    mesh(g, new THREE.BoxGeometry(0.4, 0.55, 0.04), M("#2B6E8F", 0.4), 0, 0.36, 0.56); // arched portal
    const ar = mesh(g, new THREE.CylinderGeometry(0.2, 0.2, 0.04, 16, 1, false, 0, Math.PI), M("#2B6E8F", 0.4), 0, 0.63, 0.56); ar.rotation.x = Math.PI / 2; ar.rotation.y = Math.PI / 2;
  } else if (tier === "muzey") { // museum with blue tile frieze and colonnade
    g.add(plotBase(2.5, 2.1, "#A8D48E"));
    const st = M("#F0E6D2", 0.6), tile = M("#2C6FD1", 0.4);
    mesh(g, box(2.1, 0.9, 1.1, 0.03), st, 0, 0.53, -0.3);
    mesh(g, box(2.2, 0.16, 1.2, 0.02), tile, 0, 1.05, -0.3);
    for (let i = 0; i < 6; i++) mesh(g, new THREE.CylinderGeometry(0.06, 0.07, 0.86, 12), st, -0.75 + i * 0.3, 0.52, 0.32);
    mesh(g, box(1.9, 0.1, 0.45, 0.02), st, 0, 1.0, 0.25);
    mesh(g, box(1.2, 0.08, 0.5, 0.02), st, 0, 0.12, 0.42);
    mesh(g, new THREE.BoxGeometry(0.8, 0.16, 0.02), M("#F5C542", 0.4), 0, 0.88, 0.49);
  } else if (tier === "qasr") { // castle: walls, four towers with cones, central keep
    g.add(plotBase(2.6, 2.4, "#9CC27E"));
    const stone = M("#BDB5A6", 0.85), roofM = M("#7C3AED", 0.5);
    for (const [x, z, w, d] of [[0, -0.95, 2.0, 0.18], [0, 0.95, 2.0, 0.18], [-0.95, 0, 0.18, 2.0], [0.95, 0, 0.18, 2.0]]) mesh(g, box(w, 0.6, d, 0.02), stone, x, 0.38, z);
    for (const [x, z] of [[-0.95, -0.95], [0.95, -0.95], [-0.95, 0.95], [0.95, 0.95]]) { mesh(g, new THREE.CylinderGeometry(0.26, 0.28, 1.0, 16), stone, x, 0.58, z); mesh(g, new THREE.ConeGeometry(0.32, 0.5, 16), roofM, x, 1.33, z); }
    mesh(g, box(0.8, 1.4, 0.8, 0.03), stone, 0, 0.78, -0.1); mesh(g, new THREE.ConeGeometry(0.6, 0.7, 4), roofM, 0, 1.83, -0.1).rotation.y = Math.PI / 4;
    mesh(g, new THREE.BoxGeometry(0.4, 0.45, 0.04), M("#5B4636", 0.6), 0, 0.3, 1.05);
  } else if (tier === "burj") { // Burj Khalifa-style tapered glass tower
    g.add(plotBase(2.0, 2.0, "#D9D2C4"));
    const glass = new THREE.MeshStandardMaterial({ color: "#D6E8F5", roughness: 0.12, metalness: 0.25, emissive: "#5F8DB3", emissiveIntensity: 0.12 });
    let y = 0.08; const tiers = [[0.42, 1.2], [0.36, 1.0], [0.3, 0.9], [0.24, 0.8], [0.18, 0.7], [0.12, 0.6], [0.07, 0.5]];
    for (const [r, h] of tiers) { mesh(g, new THREE.CylinderGeometry(r * 0.92, r, h, 6), glass, 0, y + h / 2, 0); y += h; }
    mesh(g, new THREE.CylinderGeometry(0.01, 0.03, 0.9, 6), M("#D1D5DB", 0.3), 0, y + 0.45, 0);
  } else if (tier === "tajmahal") { // white marble mausoleum with onion dome and four minarets
    g.add(plotBase(2.7, 2.7, "#8FCB72"));
    const w = M("#FAF8F2", 0.35);
    mesh(g, box(2.2, 0.16, 2.2, 0.03), w, 0, 0.16, 0);
    mesh(g, box(1.2, 0.9, 1.2, 0.04), w, 0, 0.69, 0);
    mesh(g, new THREE.CylinderGeometry(0.42, 0.44, 0.3, 24), w, 0, 1.29, 0);
    const d = mesh(g, new THREE.SphereGeometry(0.5, 28, 18), w, 0, 1.7, 0); d.scale.set(1, 1.15, 1);
    mesh(g, new THREE.ConeGeometry(0.06, 0.4, 10), M("#F5C542", 0.3), 0, 2.45, 0);
    for (const [x, z] of [[-0.95, -0.95], [0.95, -0.95], [-0.95, 0.95], [0.95, 0.95]]) { mesh(g, new THREE.CylinderGeometry(0.07, 0.09, 1.6, 12), w, x, 0.96, z); mesh(g, new THREE.SphereGeometry(0.1, 12, 8), w, x, 1.82, z); }
    mesh(g, new THREE.BoxGeometry(0.45, 0.6, 0.04), M("#D8D2C4", 0.4), 0, 0.6, 0.61);
    mesh(g, new THREE.BoxGeometry(0.3, 0.02, 1.0), M("#5BB5E0", 0.1), 0, 0.09, 1.2); // reflecting pool
  } else if (tier === "pisa") { // leaning tower
    g.add(plotBase(1.6, 1.6, "#8FCB72"));
    const w = M("#F4EFE4", 0.45), t = new THREE.Group(); t.rotation.z = 0.09; t.position.y = 0.08; g.add(t);
    for (let i = 0; i < 7; i++) { mesh(t, new THREE.CylinderGeometry(0.34, 0.34, 0.34, 20), w, 0, 0.17 + i * 0.34, 0); mesh(t, new THREE.CylinderGeometry(0.4, 0.4, 0.04, 20), w, 0, 0.34 + i * 0.34, 0); }
    mesh(t, new THREE.CylinderGeometry(0.22, 0.26, 0.3, 16), w, 0, 2.53, 0);
  } else if (tier === "piramida") { // one great pyramid, or three (o.kind2 === "3") like Giza
    g.add(plotBase(2.7, 2.7, "#E8D3A2"));
    const sand = M("#D9B26A", 0.85), cap = M("#F5C542", 0.25);
    const pyr = (s, x, z) => { const p = mesh(g, new THREE.ConeGeometry(s * 0.72, s, 4), sand, x, 0.08 + s / 2, z); p.rotation.y = Math.PI / 4; const c = mesh(g, new THREE.ConeGeometry(s * 0.1, s * 0.14, 4), cap, x, 0.08 + s * 0.93, z); c.rotation.y = Math.PI / 4; };
    if (o.kind2 === "3") { pyr(1.5, -0.35, -0.35); pyr(1.05, 0.75, 0.25); pyr(0.7, -0.75, 0.8); } else pyr(1.9, 0, 0);
    for (const [x, z] of [[1.05, -0.95], [-1.1, 1.05]]) { const t = makeTree(0.7, "#4F9A3A"); t.position.set(x, 0.08, z); g.add(t); }
  } else if (tier === "eyfel") { // Eiffel tower: four splayed legs, two decks, spire
    g.add(plotBase(2.2, 2.2, "#9BD07A"));
    const iron = M("#6E5A46", 0.55);
    const leg = (sx, sz) => { const l = mesh(g, new THREE.BoxGeometry(0.1, 1.5, 0.1), iron, sx * 0.55, 0.8, sz * 0.55); l.rotation.z = sx * 0.36; l.rotation.x = -sz * 0.36; };
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) leg(sx, sz);
    mesh(g, box(0.95, 0.07, 0.95, 0.02), iron, 0, 1.4, 0);
    const mid = mesh(g, new THREE.CylinderGeometry(0.16, 0.36, 1.2, 4), iron, 0, 2.0, 0); mid.rotation.y = Math.PI / 4;
    mesh(g, box(0.5, 0.06, 0.5, 0.02), iron, 0, 2.6, 0);
    const top = mesh(g, new THREE.CylinderGeometry(0.03, 0.15, 1.1, 4), iron, 0, 3.15, 0); top.rotation.y = Math.PI / 4;
    mesh(g, new THREE.CylinderGeometry(0.01, 0.02, 0.35, 6), M("#D1D5DB", 0.3), 0, 3.85, 0);
    for (let i = 0; i < 4; i++) { const a = mesh(g, new THREE.TorusGeometry(0.42, 0.03, 6, 16, Math.PI), iron, 0, 0.12, 0); a.rotation.y = (i * Math.PI) / 2; a.position.set(Math.sin((i * Math.PI) / 2) * 0.62, 0.42, Math.cos((i * Math.PI) / 2) * 0.62); }
  } else if (tier === "hovli" && o.flags) {
    const h = makeTier("hovli", { ...o, flags: false }); g.add(h);
    const flag = (cols, x) => { mesh(g, new THREE.CylinderGeometry(0.02, 0.02, 1.4, 8), M("#D1D5DB", 0.3), x, 0.78, 1.0); cols.forEach((c, i) => mesh(g, new THREE.BoxGeometry(0.5, 0.1, 0.01), M(c, 0.6), x + 0.26, 1.38 - i * 0.1, 1.0)); };
    flag(["#1EB5E8", "#FFFFFF", "#1EB53A"], -1.2); flag(["#0099B5", "#FFFFFF", "#43B02A"], 1.0);
  } else {
    const h = makeHouse(o); g.add(h);
  }
  return g;
}
