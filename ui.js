// "Uy olish" (follow -> comment -> house) and "Uyingizni bezang" (tier preview) windows.
import * as THREE from "three";
import { TIERS, tierOf, makeTier, ROOFS, WALLS } from "./tiers.js";

let NAMES, IG, INSTAGRAM, POST;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export function initUI(cfg) { ({ NAMES, IG, INSTAGRAM, POST } = cfg); }

const getEl = document.getElementById("get");
const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
export function openGet(regionId) {
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
export function openShop(tierId = "villa") {
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
export function shopFrame() {
  if (!shop) return;
  const cv = shop.r.domElement, w = cv.clientWidth, h = cv.clientHeight;
  if (cv.width !== Math.floor(w * shop.r.getPixelRatio())) { shop.r.setSize(w, h, false); shop.cam.aspect = w / h; shop.cam.updateProjectionMatrix(); }
  const a = 0.35 + 0.75 * Math.sin(((performance.now() - shop.t0) / 1000) * 0.45); // swing around the front, never the back
  shop.cam.position.set(Math.sin(a) * 8.6, 5.0, Math.cos(a) * 8.6); shop.cam.lookAt(0, 0.6, 0);
  shop.r.render(shop.sc, shop.cam);
}
addEventListener("keydown", (e) => { if (e.key === "Escape" && shop) shopEl.querySelector(".x").click(); });
