// Uy darajalari (tiers): oddiy (bepul) | rangli | hovli | villa. All models sit on y=0, front faces +z, ~1 unit = small house width.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export const TIERS = [
  { id: "oddiy", name: "Oddiy uy", price: "Bepul", items: ["Shinam uy", "Xaritada nikingiz", "Videoda viloyatingiz hisobiga +1"], plot: 1.2 },
  { id: "rangli", name: "Rangli uy", price: "Tez orada", items: ["Tom va devor rangini tanlaysiz", "Daraxt va gulzor", "Saytda alohida belgi"], plot: 1.9 },
  { id: "hovli", name: "Hovli", price: "Tez orada", items: ["Katta uy + devor va darvoza", "Hovlida mashina", "So‘ri, daraxtlar"], plot: 3.0 },
  { id: "villa", name: "Villa", price: "Tez orada", items: ["2 qavatli zamonaviy villa", "Hovuz va sport mashina", "Kechki chiroqlar", "Videoda alohida ko‘rsatiladi"], plot: 3.8 },
];
export const tierOf = (id) => TIERS.find((t) => t.id === id) || TIERS[0];

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
  } else if (tier === "hovli") {
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
  } else {
    const h = makeHouse(o); g.add(h);
  }
  return g;
}
