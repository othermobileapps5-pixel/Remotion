// Our cast as lit flat sprites in the 3D world. Each frame every character asks for a drawing (a key + a draw call);
// the pool keeps one canvas per distinct drawing, so soldiers marching in step share canvases (7 head shapes x 4
// outfits). Characters are yaw-only billboards shaded by cardShade() (scene tint, bright floor, side gradient toward
// the sun, painted crescent in the drawing); standing ones get a soft multiply contact blob. Effects are unlit cards.
// Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, townsfolk, KID, INK, fxShadow, fxContact, fxPuff, Outfit, Expr, FrontOpts, SideOpts } from "./toon";
import { FPS, SHOTS, V3, smooth, clamp01, ground, letterX, letterBase, LETTER_H, CABIN, LINES, H_LAND, PLY_X, PLY_Z, LOOKOUT, easeOut } from "./story";
import type { Light } from "./lights";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";

// ---------------- canvas pool ----------------
type Entry = { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; w: number; h: number };
export type Req = { key: string; w: number; h: number; k: number; draw: (p: Pen) => void; tex?: THREE.CanvasTexture };
const makeEntry = (w: number, h: number): Entry => {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { cv, tex, w, h };
};
export class Pool {
  private live = new Map<string, Entry>();
  private free: Entry[] = [];
  private reqs: Req[] = [];
  req(key: string, w: number, h: number, k: number, draw: (p: Pen) => void) {
    const r: Req = { key: `${w}x${h}|${key}`, w, h, k, draw };
    this.reqs.push(r);
    return r;
  }
  flush() {
    const want = new Map<string, Req[]>();
    for (const r of this.reqs) { const l = want.get(r.key); if (l) l.push(r); else want.set(r.key, [r]); }
    for (const [key, e] of this.live) if (!want.has(key)) { this.live.delete(key); this.free.push(e); }
    for (const [key, rs] of want) {
      let e = this.live.get(key);
      if (!e) {
        const r = rs[0], i = this.free.findIndex((x) => x.w === r.w && x.h === r.h);
        e = i >= 0 ? this.free.splice(i, 1)[0] : makeEntry(r.w, r.h);
        const g = e.cv.getContext("2d")!;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, e.w, e.h); g.setTransform(r.k, 0, 0, r.k, 0, 0);
        r.draw(new Pen(g));
        e.tex.needsUpdate = true;
        this.live.set(key, e);
      }
      for (const r of rs) r.tex = e.tex;
    }
    this.reqs = [];
  }
}

// ---------------- sprite meshes ----------------
const blank = (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();
export const SU = 0.00216; // metres per design unit: 1000 units = 2.16 m
export const SU_SWING = 2.3 / 1830; // swing canvas: rope of 1830 units = 2.3 m
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const CARD = new THREE.PlaneGeometry(1, 1);
/** world roots that hold actors (to find the scene's sun when world.ts does not pass it) */
const ROOTS = new Set<THREE.Object3D>();

/** lit flat character: cardShade() material, receives shadows (dims to the bright floor only), casts its silhouette
 *  when world.ts says so (golden). Drawn after the contact blobs (renderOrder 1). */
export class Actor {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; dmat: THREE.MeshDepthMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D, geo: THREE.BufferGeometry = BODY) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    // rim width is in output pixels: tell the card shader the render height (1920 = 1080 x 1920 frame)
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.castShadow = false; this.mesh.receiveShadow = true; this.mesh.visible = false;
    this.mesh.rotation.order = "YXZ"; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
    ROOTS.add(parent);
  }
  bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }
}
/** unlit effect card: hard cut-out (ink drawings), soft see-through (dust, mist) or a multiply ground blob */
export class Fx {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.soft = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.blob = blobMaterial(blank);
    this.mesh = new THREE.Mesh(CARD, this.mat);
    this.mesh.visible = false; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  use(soft: boolean) { this.mesh.material = soft ? this.soft : this.mat; }
  bind() {
    const t = this.r?.tex;
    if (!t) return;
    if (this.r!.key.includes("|blob|")) {
      // no mipmaps: at grazing views the mip chain averages the blob with its white surround and it fades out
      if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      this.blob.map = t; this.mesh.material = this.blob; this.mesh.renderOrder = 0.5;
    }
    else { this.mat.map = t; this.soft.map = t; this.mesh.renderOrder = 0; }
  }
}

// ---------------- placements ----------------
export type Place = {
  key: string; draw: (p: Pen) => void; x: number; y: number; z: number;
  scale?: number; mirror?: boolean; yaw?: number; geo?: "body" | "swing"; roll?: number; size?: [number, number, number];
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean };
/** sun = world direction TOWARD the sun (optional: when absent the scene's shadow-casting light is used) */
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun?: THREE.Vector3 };

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
const FOLK = [0, 1, 2, 3, 4, 5].map((v) => townsfolk(v));
const SKINS_LOCAL = ["#ffe2c2", "#f5c9a0", "#ecd0b6", "#c99067"];
const vOf = (i: number) => (i * 7 + (i >> 2)) % 4;
/** head-shape seed: 7 shapes, so marching soldiers in step still share canvases */
const seedOf = (i: number) => ((i * 5 + 3) % 7) + 1;
/** drawing resolution by distance: [canvas w, h, scale from the 600 x 1000 design]; sized for the 1440 x 2560 final */
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];

// ---------------- light ----------------
const SUN = new THREE.Vector3(0.5, 0.75, -0.4).normalize();
const tmp = new THREE.Vector3();
let LNAME: Light = "day";
const sunOf = (root: THREE.Object3D) => {
  let s: THREE.DirectionalLight | null = null;
  root.traverse((o) => { if (!s && o instanceof THREE.DirectionalLight && o.castShadow) s = o; });
  return s as THREE.DirectionalLight | null;
};
/** the sun of the world that is calling: the attached root whose sun target sits on this camera's view axis */
const findSun = (cam: CamInfo, out: THREE.Vector3) => {
  if (cam.sun) return out.copy(cam.sun).normalize();
  let best: THREE.DirectionalLight | null = null, err = Infinity;
  for (const r of ROOTS) {
    if (!r.parent) continue;
    const s = sunOf(r);
    if (!s) continue;
    const d = tmp.copy(s.target.position).sub(cam.pos), e = Math.abs(d.dot(cam.right)) / (d.length() || 1);
    if (e < err) { err = e; best = s; }
  }
  return best ? out.copy(best.position).sub(best.target.position).normalize() : out;
};
/** canvas angle the sun comes FROM on an upright card facing the camera, in 45-degree steps (small texture cache) */
const light2D = (cam: CamInfo, mirror: boolean) => {
  const sx = SUN.dot(cam.right) * (mirror ? -1 : 1), sy = -SUN.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};

/** front / side view and mirroring for someone at (x, z) walking along (dx, dz); fs = foreshortening of the walk */
const viewOf = (cam: CamInfo, x: number, z: number, dx: number, dz: number) => {
  const tx = cam.pos.x - x, tz = cam.pos.z - z, tl = Math.hypot(tx, tz) || 1;
  const c = (tx * dx + tz * dz) / tl;
  return { side: c < 0.57, mirror: dx * cam.right.x + dz * cam.right.z < 0, fs: Math.round(Math.sqrt(Math.max(0, 1 - c * c)) * 20) / 20 };
};

// ---------------- life: blinks and reaction timing ----------------
/** reference expression and action changes land 0-3 f before the word onset */
const LEAD = 2 / FPS;
/** eyelid 0 open .. 1 shut. Reference: gaps 0.5-2.3 s, 4-frame blink half / shut / shut / half, plus a blink across
 *  every expression swap (the shut frames hide the swap) */
const LID = [0.5, 1, 1, 0.5];
const SWAPS: Record<number, number[]> = {};
const lidAt = (t: number, i: number, swaps: number[] = []) => {
  const f = Math.round(t * FPS);
  for (const ts of swaps) { const k = f - Math.round((ts - LEAD) * FPS) + 1; if (k >= 0 && k < 4) return LID[k]; }
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(15 + 54 * hh(i * 31 + n, 13)); // next blink 0.5-2.3 s later
  }
  return 0;
};
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));

type Who = { i: number; o: Outfit; okey: string };
/** one character drawing in the 600 x 1000 design space, sized by distance, lit from the scene's sun */
const person = (cam: CamInfo, who: Who, x: number, y: number, z: number, view: { side: boolean; mirror: boolean }, fo: FrontOpts, so: SideOpts, scale = 1): Place & { tierKey: string } => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2, z)) / scale;
  const [w, h, k] = tier(d);
  const mirror = view.side && view.mirror, light = light2D(cam, mirror), seed = seedOf(who.i);
  const f2: FrontOpts = { ...fo, light, seed }, s2: SideOpts = { ...so, light, seed };
  const key = view.side ? `S|${who.okey}|${fkey(s2)}` : `F|${who.okey}|${fkey(f2)}`;
  return {
    key, x, y, z, scale, mirror, tierKey: `${w}`,
    draw: (p) => (view.side ? bodySide(p, who.o, s2) : bodyFront(p, who.o, f2)),
    size: [w, h, k],
  };
};

/** ground shadow under a standing / sitting card (review rounds 2-4), multiply, blue-violet: a TIGHT contact pool right under
 *  the feet (~.5 on screen at the core) so nobody floats, plus by day (cards cast no real shadow) a lighter soft tail
 *  stretched AWAY from the sun, length ~1.6 m / tan(sun elevation), capped. Golden: world.ts casts real card shadows. */
const CONTACT: Record<Light, [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33], night: [0.3, 0.3, 0.42] };
const TAIL: [number, number, number] = [0.42, 0.44, 0.62];
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
const blob = (out: Stage, x: number, y: number, z: number, sc = 1, k = 1) => {
  const hl = Math.hypot(SUN.x, SUN.z) || 1, ox = -SUN.x / hl, oz = -SUN.z / hl, rot = Math.atan2(-ox, -oz);
  if (LNAME === "day") {
    const el = Math.asin(Math.min(0.99, Math.max(0.1, SUN.y)));
    const len = Math.min(2.4, Math.max(0.5, 1.6 / Math.tan(el))) * sc, h = len + 0.55 * sc, c = 0.3 * h; // feet at v = .2 of the card
    const tc = hexOf(TAIL, k);
    out.fx.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: x + ox * c, y: y + 0.018, z: z + oz * c,
      w: 0.72 * sc, h, flat: true, rot });
  }
  const cc = hexOf(CONTACT[LNAME], k);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x: x + ox * 0.03 * sc, y: y + 0.022, z: z + oz * 0.03 * sc,
    w: 0.52 * sc, h: 0.4 * sc, flat: true, rot });
};

// ---------------- Hollywood: kim qaysi kadrda ----------------
export type Stage = { places: Place[]; fx: FxPlace[] };

/** qorovul: ish kiyimi, kepka */
const KEEPER: Outfit = { jacket: "#4f6c94", pants: "#5a4632", boots: INK, hat: "cap", cap: "#7a5636", moustache: "#5a3b24", build: "stout" };
/** 1978 yulduzlari: yorqin kostyumlar, soch turmagi */
const STARS: Outfit[] = ["#c0353a", "#e8b84a", "#2f2f3a", "#6a3fa0", "#2c8a6a", "#e86e9a", "#3f6fb5", "#f0f0f0", "#b5653f"].map((c, i) => ({
  jacket: c, pants: i % 3 === 2 ? "#e9e2d0" : "#24242e", boots: INK, hat: "hair", hair: ["#2a1c14", "#d9a441", "#5a3b24", "#111111"][i % 4], skin: SKINS_LOCAL[i % 4],
}));
const TOURIST: Outfit[] = [0, 1, 2, 3, 4, 5, 6].map((i) => ({
  jacket: ["#f08a2c", "#3fa0c9", "#e2453c", "#5d9a3a", "#f3d35a", "#7b5ac9", "#2f5f6a"][i], pants: ["#3b5b9a", "#3b3f52", "#d9cdb0"][i % 3], boots: "#f4f1ea",
  hat: i % 3 === 0 ? "cap" : "hair", cap: "#e2453c", hair: ["#2a1c14", "#8a5a2a", "#111111"][i % 3], skin: SKINS_LOCAL[(i + 1) % 4], build: i === 4 ? "kid" : undefined,
}));

const at = (x: number, z: number) => ground(x, z);

/** 1923: xaridorlar yozuv ostida (kadr 2) */
const buyers = (cam: CamInfo, t: number, out: Stage) => {
  for (let i = 0; i < 7; i++) {
    const x = letterX(4) - 6 + i * 2.1 + (hh(i) - 0.5) * 0.6, z = 9 + (i % 3) * 1.4, y = at(x, z);
    const who: Who = { i: i + 300, o: FOLK[i % 6], okey: `f${i % 6}` };
    const wave = i % 3 === 1 ? q(Math.sin(t * 8 + i), 30) : undefined;
    const fo: FrontOpts = { mode: "stand", expr: (["smile", "grin", "smile_closed"] as Expr[])[i % 3], wave, blink: lidAt(t, i + 300) };
    out.places.push(person(cam, who, x, y, z, { side: false, mirror: false }, fo, {}));
    blob(out, x, y, z);
  }
};

/** lampochkalar quchog'i (qorovul ko'ylagida) */
const bulbsFx = (p: Pen) => {
  for (const [x, y] of [[60, 70], [110, 60], [85, 100], [135, 95], [40, 110]] as const) {
    p.ell(x, y, 22, 26, "#fff3b0", 6);
    p.ell(x - 6, y - 8, 6, 8, "#ffffff", 0);
    p.poly([[x - 9, y + 22], [x + 9, y + 22], [x + 8, y + 36], [x - 8, y + 36]], "#b8b2a6", 5);
  }
};
/** qorovul narvonda (kadr 4): pog'onama-pog'ona ko'tariladi */
export const LADDER_X = () => letterX(2) + 1.5;
const keeperLadder = (cam: CamInfo, t: number, out: Stage) => {
  const u = clamp01((t - LINES[3] - 0.8) / 5.2), steps = Math.floor(u * 14) / 14 + smooth((u * 14) % 1) / 14;
  const x = LADDER_X(), z = 1.15, y = letterBase(2) + 0.2 + steps * 9.5;
  const fo: FrontOpts = { mode: "stand", expr: steps > 0.9 ? "grin" : "neutral", blink: lidAt(t, 501), facing: -1 };
  out.places.push(person(cam, { i: 501, o: KEEPER, okey: "keeper" }, x, y, z, { side: false, mirror: false }, fo, {}));
  out.fx.push({ key: "bulbs", cw: 180, ch: 160, draw: bulbsFx, x: x + 0.05, y: y + 1.05, z: z + 0.12, w: 0.55, h: 0.48 });
};
/** pul tugadi: qorovul kulbadan ketadi (kadr 5) */
const keeperLeaves = (cam: CamInfo, t: number, out: Stage) => {
  const u = t - LINES[4] - 0.4, x = CABIN[0] + 1.5 - 1.1 * Math.max(0, u), z = CABIN[2] + 4.2 + 0.25 * Math.max(0, u), y = at(x, z);
  const phase = q(((Math.max(0, u) * 0.9) % 1 + 1) % 1, 120);
  const view = viewOf(cam, x, z, -1, 0.2);
  const fo: FrontOpts = { mode: "stroll", phase, expr: "nervous", blink: lidAt(t, 502) };
  const so: SideOpts = { mode: "march", phase, expr: "nervous", stomp: 0.5, stride: 0.6 * view.fs };
  out.places.push(person(cam, { i: 502, o: KEEPER, okey: "keeper" }, x, y, z, view, fo, so));
  blob(out, x, y, z);
};

/** shamol chiziqlari */
const windFx = (p: Pen, k: number) => {
  for (let i = 0; i < 3; i++) {
    const y = 40 + i * 50, a = 30 + 60 * k;
    const pts: [number, number][] = [];
    for (let s = 0; s <= 12; s++) { const x = 20 + s * 30; pts.push([x, y + 10 * Math.sin(s * 0.7 + i + k * 6)]); }
    p.stroke(pts.slice(0, Math.max(2, Math.round(3 + 10 * k))), 7, `rgba(255,255,255,${(0.55 + 0.4 * (1 - k)).toFixed(2)})`);
    void a;
  }
};
const wind = (cam: CamInfo, t: number, out: Stage, centre: V3, spread: number, power: number) => {
  for (let i = 0; i < 9; i++) {
    const age = ((t * 0.9 + hh(i, 21)) % 1), k = q(age, 20);
    const x = centre[0] + spread * (hh(i, 22) - 0.5) * 2 - 14 * age * power, y = centre[1] + spread * 0.6 * (hh(i, 23) - 0.2), z = centre[2] + spread * (hh(i, 24) - 0.5);
    out.fx.push({ key: `wind${k}`, cw: 400, ch: 200, draw: (p) => windFx(p, k), x, y, z, w: 5 * power, h: 2.5 * power, soft: true });
  }
};

/** faner (kadr 10) */
const plyFx = (p: Pen) => {
  p.poly([[20, 20], [380, 30], [372, 270], [26, 262]], "#d9b37a", 10);
  p.g.strokeStyle = "rgba(120,80,40,0.45)"; p.g.lineWidth = 3;
  for (let i = 0; i < 9; i++) { p.g.beginPath(); p.g.moveTo(30, 45 + i * 25); p.g.bezierCurveTo(140, 35 + i * 25, 260, 60 + i * 25, 366, 48 + i * 25); p.g.stroke(); }
};
const plywood = (cam: CamInfo, t: number, out: Stage) => {
  const x = PLY_X(t), z = PLY_Z, y = at(x, z), u = t - LINES[9];
  const drag = smooth((u - 1.4) / 1.2), tilt = -14 * drag + 3 * Math.sin(t * 9) * drag;
  const expr: Expr = drag > 0.3 ? "shock" : "neutral";
  const fo: FrontOpts = { mode: drag > 0.3 ? "fall" : "stand", expr, tilt, blink: lidAt(t, 600) };
  out.places.push(person(cam, { i: 600, o: FOLK[2], okey: "f2" }, x, y + 0.04 * drag, z, { side: false, mirror: false }, fo, {}));
  out.fx.push({ key: "ply", cw: 400, ch: 290, draw: plyFx, x: x - 0.15, y: y + 1.15, z: z + 0.25, w: 1.75, h: 1.25, rot: (-tilt * Math.PI) / 180 * 0.6 });
  blob(out, x, y, z);
  if (drag > 0.05) wind(cam, t, out, [x + 3, y + 1.2, z], 3.5, 0.45);
};

/** 1978: yulduzlar harflar oldida (kadr 12) */
const stars = (cam: CamInfo, t: number, out: Stage) => {
  for (let i = 0; i < 9; i++) {
    const x = letterX(i) + (hh(i, 31) - 0.5) * 1.5, z = 4.2 + (hh(i, 32) - 0.5) * 1.2, y = at(x, z);
    const wave = i % 2 === 0 ? q(Math.sin(t * 7 + i), 30) : undefined;
    const fo: FrontOpts = { mode: "stand", expr: (["grin", "laugh", "smile", "grin"] as Expr[])[i % 4], wave, blink: lidAt(t, 700 + i) };
    out.places.push(person(cam, { i: 700 + i, o: STARS[i], okey: `star${i}` }, x, y, z, { side: false, mirror: false }, fo, {}));
    blob(out, x, y, z);
  }
};

/** yakun: kuzatuv maydonchasida sayyohlar (kadr 14) */
const tourists = (cam: CamInfo, t: number, out: Stage) => {
  for (let i = 0; i < 7; i++) {
    const x = LOOKOUT[0] - 5 + i * 1.6 + (hh(i, 41) - 0.5) * 0.4, z = LOOKOUT[2] - 1.5 + (i % 2) * 0.9, y = LOOKOUT[1];
    const fo: FrontOpts = { mode: "stand", expr: (["grin", "smile", "laugh", "smile_closed"] as Expr[])[i % 4], wave: i === 3 ? q(Math.sin(t * 6), 30) : undefined, blink: lidAt(t, 800 + i) };
    out.places.push(person(cam, { i: 800 + i, o: TOURIST[i], okey: `tour${i}` }, x, y, z, { side: false, mirror: false }, fo, {}, TOURIST[i].build === "kid" ? 0.72 : 1));
    blob(out, x, y, z, TOURIST[i].build === "kid" ? 0.72 : 1);
  }
};

/** H qulaganda chang (kadr 6) */
const dust = (t: number, out: Stage) => {
  const u = (t - H_LAND) / 1.1;
  if (u < 0 || u >= 1) return;
  for (let i = 0; i < 6; i++) {
    const x = letterX(0) + (i - 2.5) * 1.6, z = 6 + (i % 2) * 2, y = at(x, z) + 0.6 + 1.5 * easeOut(u);
    out.fx.push({ key: `puff${q(u, 20)}`, cw: 256, ch: 256, draw: (p) => fxPuff(p, q(u, 20)), x, y, z, w: 3.4 * (0.6 + u), h: 3.4 * (0.6 + u), soft: true });
  }
};

/** shot `id`, vaqt t: kimlar va qaysi effektlar */
export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1];
  LNAME = s.light;
  findSun(cam, SUN);
  if (id === 2) buyers(cam, t, out);
  if (id === 4) keeperLadder(cam, t, out);
  if (id === 5) keeperLeaves(cam, t, out);
  if (id === 6) { wind(cam, t, out, [letterX(0) + 4, letterBase(0) + 7, 4], 9, 1); dust(t, out); }
  if (id === 10) plywood(cam, t, out);
  if (id === 11) wind(cam, t, out, [letterX(6), letterBase(6) + 8, 6], 16, 1.2);
  if (id === 12) stars(cam, t, out);
  if (id === 14) tourists(cam, t, out);
  return out;
};
void KID; void bodySide; void bodyFront; void fxShadow; void fxContact; void LETTER_H;
