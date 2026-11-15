// Butun joy bitta three.js sahnasida: osmon, Li tog'i qiyaligi (chaparral butalari), pastda 1920-yillar shahri,
// HOLLYWOODLAND yozuvi (telefon ustunlariga qoqilgan yupqa taxtalar + 4 000 lampochka), qorovul kulbasi, narvon,
// 1978-yilgi po'lat yozuv (beton poydevor), sayyohlar maydonchasi va qahramonlar.
// update(id, f, camera) har kadrni faqat (id, f) dan quradi.
import * as THREE from "three";
import { Batch, boxGeo, V, lam, prop, Kit, Ray, setSight } from "./build";
import { ctex, rep, beam, beamHD, stoneHD, cloudHD } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage, LADDER_X } from "./cast";
import {
  FPS, SHOTS, camAt, ShotDef, ground, CITY_Y, LETTER_H, LETTER_W, OLD_TEXT, letterX, letterBase, CABIN, LOOKOUT,
  H_WOBBLE, H_FALL, H_LAND, LAND_GONE0, SWAP0, SWAP_STEP, smooth, easeIn, clamp01,
} from "./story";

// ---------------- harflar: 5 x 7 katak ----------------
const FONT: Record<string, string[]> = {
  H: ["X...X", "X...X", "X...X", "XXXXX", "X...X", "X...X", "X...X"],
  O: [".XXX.", "X...X", "X...X", "X...X", "X...X", "X...X", ".XXX."],
  L: ["X....", "X....", "X....", "X....", "X....", "X....", "XXXXX"],
  Y: ["X...X", "X...X", ".X.X.", "..X..", "..X..", "..X..", "..X.."],
  W: ["X...X", "X...X", "X...X", "X.X.X", "X.X.X", "XX.XX", "X...X"],
  D: ["XXXX.", "X...X", "X...X", "X...X", "X...X", "X...X", "XXXX."],
  A: [".XXX.", "X...X", "X...X", "XXXXX", "X...X", "X...X", "X...X"],
  N: ["X...X", "XX..X", "X.X.X", "X..XX", "X...X", "X...X", "X...X"],
};
const CW = LETTER_W / 5, CH = LETTER_H / 7;
const cells = (ch: string) => {
  const out: [number, number][] = [];
  FONT[ch].forEach((row, r) => [...row].forEach((c, k) => { if (c === "X") out.push([k, 6 - r]); }));
  return out; // [ustun, qator pastdan]
};

// ---------------- bo'yalgan teksturalar ----------------
const panelTex = (key: string, base: string, dirt: number) => ctex(key, 256, 256, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  g.fillStyle = "rgba(120,110,95,0.10)"; for (let x = 0; x < 256; x += 64) g.fillRect(x, 0, 3, 256); // taxta choklari
  g.fillStyle = "rgba(90,80,70,0.35)"; for (let x = 6; x < 256; x += 64) for (let y = 10; y < 256; y += 40) g.fillRect(x, y, 3, 3); // mixlar
  for (let i = 0; i < 40 * dirt; i++) { // zang va kir dog'lari
    g.fillStyle = `rgba(${120 + r() * 40},${85 + r() * 30},${60 + r() * 20},${0.12 + r() * 0.25})`;
    const x = r() * 256, y = r() * 256; g.beginPath(); g.ellipse(x, y, 4 + r() * 18, 6 + r() * 30, 0, 0, 7); g.fill();
  }
});
const hillTex = () => ctex("chaparral", 512, 512, (g, r) => {
  g.fillStyle = "#c4ab72"; g.fillRect(0, 0, 512, 512);
  const cols = ["#b39b62", "#d2bc86", "#9d9a5c", "#a7a066", "#cdb27a"];
  for (let i = 0; i < 900; i++) {
    g.fillStyle = cols[Math.floor(r() * cols.length)];
    const x = r() * 512, y = r() * 512, s = 3 + r() * 9;
    for (const ox of [-512, 0, 512]) for (const oy of [-512, 0, 512]) { g.beginPath(); g.ellipse(x + ox, y + oy, s, s * 0.7, r(), 0, 7); g.fill(); }
  }
});
const cityTex = () => ctex("cityGround", 256, 256, (g) => {
  g.fillStyle = "#cfc3a8"; g.fillRect(0, 0, 256, 256);
  g.fillStyle = "#8e877c"; g.fillRect(0, 0, 256, 34); g.fillRect(0, 0, 34, 256); // ko'chalar
});
const windowsTex = (key: string, wall: string) => ctex(key, 128, 128, (g) => {
  g.fillStyle = wall; g.fillRect(0, 0, 128, 128);
  g.fillStyle = "rgba(40,45,70,0.75)";
  for (let y = 14; y < 128; y += 32) for (let x = 12; x < 128; x += 30) g.fillRect(x, y, 14, 16);
});
const discTex = () => ctex("sunDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const haloTex = () => ctex("sunHalo", 256, 256, (g) => {
  const im = g.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const u = Math.hypot(x - 127.5, y - 127.5) / 128;
    const a = (0.55 * Math.exp(-((u / 0.25) ** 2)) + 0.35 * Math.exp(-((u / 0.6) ** 2))) * (1 - Math.min(1, Math.max(0, (u - 0.8) / 0.2)));
    const i = (y * 256 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * Math.min(1, a));
  }
  g.putImageData(im, 0, 0);
});

// ---------------- yordamchilar ----------------
const rnd = (seed: number) => { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
const cyl = (a: THREE.Vector3, b: THREE.Vector3, r: number) => {
  const g = new THREE.CylinderGeometry(r, r, a.distanceTo(b), 8);
  return g.applyMatrix4(new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5),
    new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize()), V(1, 1, 1)));
};
/** yer to'ri: x0..x1, z0..z1, qadam step; dy — biroz pastga (yaqin to'r ustida tursin) */
const terrain = (x0: number, x1: number, z0: number, z1: number, step: number, dy: number, uvTile: number) => {
  const nx = Math.round((x1 - x0) / step), nz = Math.round((z1 - z0) / step);
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const x = x0 + i * step, z = z0 + j * step;
    pos.push(x, ground(x, z) + dy, z); uv.push(x / uvTile, z / uvTile);
  }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
};

/** butun film kamera nurlari: butalar va uylar kamera oldini to'smasin */
const sightLines = (): Ray[] => {
  const out: Ray[] = [];
  for (const s of SHOTS) for (let f = s.a; f < s.b; f += 3) {
    const c = camAt(s.id, f), o = V(...c.pos), look = V(...c.look);
    const fw = look.clone().sub(o), len = fw.length();
    fw.normalize();
    const rt = fw.clone().cross(V(0, 1, 0)).normalize(), up = rt.clone().cross(fw);
    const ty = Math.tan((c.fov * Math.PI) / 360), tx = ty * (9 / 16);
    for (const [sx, sy] of [[0, 0], [-0.6, 0], [0.6, 0], [0, 0.6], [0, -0.4]])
      out.push({ o, d: fw.clone().addScaledVector(rt, sx * tx).addScaledVector(up, sy * ty), len, core: sx === 0 && sy === 0 });
  }
  return out;
};

type Letter = { g: THREE.Group; i: number };

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 60, 1100);
  private sunDisc: THREE.Sprite; private sunHalo: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<"day" | "golden" | "night", THREE.Texture[]>;
  private clouds: THREE.Mesh[] = [];
  private old: Letter[] = []; private oldDirty: Letter[] = []; private fresh: Letter[] = [];
  private bulbs: THREE.InstancedMesh; private bulbLetter: number[] = [];
  private ladder = new THREE.Group(); private lookout = new THREE.Group();
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  private col = new THREE.Color();

  constructor(kit: Kit = {}) {
    const R = this.root;
    // ---- osmon (5 rang bosqichi balandlik bo'yicha), quyosh, bulutlar ----
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el));
          c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el));
          c = mix(c, c4, smoothstep(e.z, e.w, el));
          gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(2400, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK);
    R.add(this.sky);
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false }));
    this.sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: new THREE.Color(1, 1, 1), fog: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending }));
    this.sunDisc.renderOrder = -0.5; this.sunHalo.renderOrder = 5;
    for (const m of [this.sunDisc, this.sunHalo]) { m.frustumCulled = false; m.layers.set(NOINK); R.add(m); }
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    R.add(this.hemi, this.sun, this.sun.target);
    this.cloudMaps = {
      day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)),
      night: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.night.cloud)),
    };
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + 0.3, d = 1500 + (i % 3) * 140;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      const w = 320 + (i % 4) * 70;
      m.position.set(Math.cos(a) * d, 260 + (i % 4) * 80, Math.sin(a) * d); m.scale.set(w, w / 2, 1);
      m.layers.set(NOINK);
      this.clouds.push(m); R.add(m);
    }

    // ---- tog' va shahar ----
    setSight(sightLines());
    const hill = lam("hill", () => ({ map: rep(hillTex(), 1, 1) }));
    const hillFar = lam("hillFar", () => ({ map: rep(hillTex(), 1, 1), color: "#e8dcc0" }));
    const near = new THREE.Mesh(terrain(-130, 130, -80, 110, 2, 0, 14), hill);
    const far = new THREE.Mesh(terrain(-900, 900, -500, 1600, 12, -0.6, 40), hillFar);
    for (const m of [near, far]) { m.receiveShadow = true; m.castShadow = m === near; R.add(m); }
    const b = new Batch(), r = rnd(7);
    // shahar: past tekislikda 1920-yillar binolari (past, och rangli), ko'chalar, palmalar
    const cityG = new THREE.PlaneGeometry(2400, 1400).rotateX(-Math.PI / 2).translate(0, CITY_Y + 0.05, 1250);
    b.add(cityG, lam("cityGround", () => ({ map: rep(cityTex(), 60, 35) })));
    const walls = ["#ecdab2", "#d8a95f", "#e2c49a", "#c47a5c", "#efe4cc", "#cc9a6c"].map((c, k) => lam("bld" + k, () => ({ map: windowsTex("bldTex" + k, c) })));
    const roofs = [lam("flatRoof", () => ({ color: "#b9a68a" })), lam("tileRoof", () => ({ color: "#c46a4e" }))];
    for (let x = -1100; x < 1100; x += 40) for (let z = 560; z < 1900; z += 40) {
      if (ground(x, z) > CITY_Y + 0.5) continue;
      for (let k = 0; k < 2; k++) {
        if (r() < 0.25) continue;
        const w = 9 + r() * 12, d = 9 + r() * 12, h = (z < 800 ? 4 : 5) + r() * (z > 1200 && Math.abs(x) < 300 ? 26 : 10);
        const cx = x + 6 + k * 16 + r() * 4, cz = z + 6 + r() * 18;
        const mat = walls[Math.floor(r() * walls.length)];
        b.add(boxGeo(V(cx, CITY_Y, cz), V(cx + w, CITY_Y + h, cz + d), 8), mat);
        b.add(boxGeo(V(cx - 0.2, CITY_Y + h, cz - 0.2), V(cx + w + 0.2, CITY_Y + h + 0.4, cz + d + 0.2)), roofs[h < 8 ? 1 : 0]);
      }
    }
    // palmalar ko'chalar bo'ylab (baland ingichka daraxtlar)
    for (let i = 0; i < 140; i++) {
      const x = -700 + r() * 1400, z = 540 + r() * 420;
      if (ground(x, z) > CITY_Y + 0.5) continue;
      prop(b, kit, "tree", x, CITY_Y, z, 14 + r() * 6, r() * 6);
    }
    // qiyalikdagi butalar (yozuv atrofini bo'sh qoldiramiz)
    for (let i = 0; i < 420; i++) {
      const x = -125 + r() * 250, z = -70 + r() * 175;
      if (Math.abs(z - 0) < 9 && Math.abs(x) < 70) continue;
      if (Math.abs(x - CABIN[0]) < 6 && Math.abs(z - CABIN[2]) < 7) continue;
      prop(b, kit, r() < 0.8 ? "plant_bush" : "tree_cone", x, ground(x, z) - 0.2, z, 1.0 + r() * 2.2, r() * 6);
    }
    for (let i = 0; i < 500; i++) {
      const x = -600 + r() * 1200, z = -300 + r() * 820;
      if (Math.abs(x) < 130 && z > -80 && z < 110) continue;
      prop(b, kit, "plant_bush", x, ground(x, z) - 0.3, z, 2 + r() * 3, r() * 6);
    }
    // qorovul kulbasi
    const plank = lam("cabinWood", () => ({ map: rep(beam(), 1, 1), color: "#c9a77c" }));
    const roofM = lam("cabinRoof", () => ({ color: "#6e5a4a" }));
    const [cx, cy, cz] = CABIN;
    b.add(boxGeo(V(cx - 1.8, cy - 0.6, cz - 1.5), V(cx + 1.8, cy + 2.5, cz + 1.5), 1.2), plank);
    const roofG = new THREE.BoxGeometry(4.2, 0.15, 2.0);
    for (const s of [-1, 1]) b.add(roofG, roofM, new THREE.Matrix4().compose(V(cx, cy + 3.0, cz + s * 0.85), new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), s * 0.5), V(1, 1, 1)));
    b.add(boxGeo(V(cx - 0.45, cy - 0.1, cz + 1.5), V(cx + 0.45, cy + 1.9, cz + 1.56)), lam("door", () => ({ color: "#7a4f33" })));
    b.add(boxGeo(V(cx + 0.8, cy + 1.0, cz + 1.5), V(cx + 1.4, cy + 1.6, cz + 1.56)), lam("win", () => ({ color: "#33406b" })));
    // sayyohlar maydonchasi
    const stone = lam("lookoutStone", () => ({ map: stoneHD("lookoutHD") }));
    const [lx, ly, lz] = LOOKOUT;
    const lo = new Batch();
    lo.add(boxGeo(V(lx - 9, ly - 8, lz - 3.5), V(lx + 9, ly, lz + 6), 2), stone);
    for (let x = lx - 8.6; x <= lx + 8.6; x += 1.2) lo.add(boxGeo(V(x - 0.06, ly, lz - 3.3), V(x + 0.06, ly + 1.0, lz - 3.18)), lam("rail", () => ({ color: "#3d414c" })));
    lo.add(boxGeo(V(lx - 8.7, ly + 0.95, lz - 3.32), V(lx + 8.7, ly + 1.05, lz - 3.16)), lam("rail", () => ({ color: "#3d414c" })));
    lo.build(this.lookout);
    R.add(this.lookout);
    b.build(R);

    // ---- eski yozuv HOLLYWOODLAND: yupqa taxtalar + telefon ustunlari ----
    const wood = lam("pole", () => ({ map: rep(beamHD(), 1, 1), color: "#8a6a4a" }));
    const pClean = lam("panelOld", () => ({ map: panelTex("panelOldTex", "#f3efe4", 0.3) }));
    const pDirty = lam("panelDirty", () => ({ map: panelTex("panelDirtyTex", "#d9d0bf", 2.2) }));
    const bulbPos: THREE.Vector3[] = [];
    const buildOld = (i: number, dirty: boolean): Letter => {
      const ch = OLD_TEXT[i], g = new THREE.Group(), lb = new Batch(), cs = cells(ch);
      const set = new Set(cs.map(([c, rr]) => `${c},${rr}`));
      for (const [c, rr] of cs) {
        const x0 = -LETTER_W / 2 + c * CW, y0 = rr * CH;
        lb.add(boxGeo(V(x0, y0, 0), V(x0 + CW, y0 + CH, 0.1), 1.6), dirty ? pDirty : pClean);
      }
      // orqa: har ustun uchun telefon ustuni, ko'ndalang reykalar, qiyalikka tirgaklar
      for (let c = 0; c < 5; c++) {
        const rows = cs.filter(([cc]) => cc === c).map(([, rr]) => rr);
        if (!rows.length) continue;
        const x = -LETTER_W / 2 + (c + 0.5) * CW, top = (Math.max(...rows) + 1) * CH;
        lb.add(cyl(V(x, -3, -0.35), V(x, top + 0.4, -0.35), 0.17), wood);
        lb.add(cyl(V(x, top * 0.62, -0.4), V(x, -2.5, -6.5), 0.12), wood);
      }
      for (const rr of [1, 3, 5]) lb.add(boxGeo(V(-LETTER_W / 2, rr * CH + 0.5, -0.2), V(LETTER_W / 2, rr * CH + 0.68, -0.05)), wood);
      lb.build(g);
      if (!dirty) {
        // lampochkalar: to'ldirilgan kataklarning tashqi qirralari bo'ylab, har 0.6 m
        const base = V(letterX(i), letterBase(i), 0);
        for (const [c, rr] of cs) {
          const x0 = -LETTER_W / 2 + c * CW, y0 = rr * CH;
          const edges: [number, number, number, number, boolean][] = [
            [x0, y0, x0 + CW, y0, !set.has(`${c},${rr - 1}`)], [x0, y0 + CH, x0 + CW, y0 + CH, !set.has(`${c},${rr + 1}`)],
            [x0, y0, x0, y0 + CH, !set.has(`${c - 1},${rr}`)], [x0 + CW, y0, x0 + CW, y0 + CH, !set.has(`${c + 1},${rr}`)],
          ];
          for (const [ax, ay, bx, by, out] of edges) {
            if (!out) continue;
            const n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / 0.6));
            for (let k = 0; k < n; k++) {
              const u = (k + 0.5) / n;
              bulbPos.push(V(base.x + ax + (bx - ax) * u, base.y + ay + (by - ay) * u, 0.18));
              this.bulbLetter.push(i);
            }
          }
        }
      }
      g.position.set(letterX(i), letterBase(i), 0);
      g.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
      R.add(g);
      return { g, i };
    };
    for (let i = 0; i < OLD_TEXT.length; i++) { this.old.push(buildOld(i, false)); this.oldDirty.push(buildOld(i, true)); }
    const bulbG = new THREE.SphereGeometry(0.11, 8, 6);
    this.bulbs = new THREE.InstancedMesh(bulbG, new THREE.MeshBasicMaterial({ color: 0xffffff }), bulbPos.length);
    bulbPos.forEach((p, k) => this.bulbs.setMatrixAt(k, this.m4.makeTranslation(p.x, p.y, p.z)));
    this.bulbs.layers.set(NOINK); this.bulbs.frustumCulled = false;
    for (let k = 0; k < bulbPos.length; k++) this.bulbs.setColorAt(k, this.col.setRGB(0.3, 0.3, 0.3));
    R.add(this.bulbs);

    // ---- yangi (1978) yozuv: po'lat taxtalar, po'lat ustunlar, beton poydevor ----
    const steel = twoTone(new THREE.MeshPhongMaterial({ color: "#8a8f99", specular: "#b0b0b0", shininess: 40 }), 0.15);
    const pNew = lam("panelNew", () => ({ map: panelTex("panelNewTex", "#fbfaf4", 0), color: "#ffffff" }));
    const conc = lam("concrete", () => ({ map: stoneHD("concreteHD", ["#d9d6cf", "#d1cec6", "#e0ddd6", "#cbc8c0"], "#b9b5ac") }));
    for (let i = 0; i < 9; i++) {
      const ch = OLD_TEXT[i], g = new THREE.Group(), lb = new Batch(), cs = cells(ch);
      for (const [c, rr] of cs) {
        const x0 = -LETTER_W / 2 + c * CW, y0 = rr * CH;
        lb.add(boxGeo(V(x0, y0, 0), V(x0 + CW, y0 + CH, 0.22), 1.6), pNew);
      }
      for (let c = 0; c < 5; c++) {
        const rows = cs.filter(([cc]) => cc === c).map(([, rr]) => rr);
        if (!rows.length) continue;
        const x = -LETTER_W / 2 + (c + 0.5) * CW, top = (Math.max(...rows) + 1) * CH;
        lb.add(boxGeo(V(x - 0.18, -2.5, -0.7), V(x + 0.18, top, -0.34)), steel);
        lb.add(boxGeo(V(x - 0.7, -3.0, -1.4), V(x + 0.7, 0.35, 0.4), 1.5), conc);
      }
      for (const rr of [1, 3, 5]) lb.add(boxGeo(V(-LETTER_W / 2, rr * CH + 0.4, -0.34), V(LETTER_W / 2, rr * CH + 0.62, -0.1)), steel);
      lb.build(g);
      g.position.set(letterX(i), letterBase(i), 0);
      g.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
      R.add(g);
      this.fresh.push({ g, i });
    }

    // ---- narvon (qorovul, 1923) ----
    const lw = lam("ladder", () => ({ color: "#9a7650" })), x = LADDER_X(), y0 = letterBase(2);
    const lad = new Batch();
    for (const s of [-0.28, 0.28]) lad.add(cyl(V(x + s, y0 - 0.3, 1.5), V(x + s, y0 + 11.2, 0.25), 0.05), lw);
    for (let k = 0; k < 28; k++) {
      const u = (k + 0.5) / 28;
      lad.add(cyl(V(x - 0.28, y0 - 0.3 + 11.5 * u, 1.5 - 1.25 * u), V(x + 0.28, y0 - 0.3 + 11.5 * u, 1.5 - 1.25 * u), 0.035), lw);
    }
    lad.build(this.ladder);
    R.add(this.ladder);
  }

  /** kameraga nisbatan quyosh, kadr davomida muzlatilgan */
  private shotSun(id: number, s: ShotDef, L: LightPreset) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) {
      const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1;
      fx += x / n; fz += z / n;
    }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(s.sunAz ?? L.az), el = THREE.MathUtils.degToRad(s.sunEl ?? L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }
  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  /** yozuv holati: davr va vaqtga qarab qaysi harflar, qanday burchakda */
  private poseSign(s: ShotDef, t: number) {
    const era = s.era, oldOn = era === "1923" || era === "1940" || era === "1944" || era === "1949" || era === "1978";
    const wind = s.wind ?? 0;
    for (let i = 0; i < this.old.length; i++) {
      const L = this.old[i], D = this.oldDirty[i];
      const dirty = era === "1944" || era === "1949" || era === "1978";
      let show = oldOn, rx = 0, rz = 0, sy = 1;
      if (wind) rx = 0.025 * wind * Math.sin(t * 5.2 + i * 0.9) + 0.02 * wind;
      if (era === "1944" && i === 0) {
        if (s.id === 6) {
          rx += 0.06 * smooth((t - H_WOBBLE) / 0.8) * Math.sin(t * 9);
          rx += 2.04 * easeIn((t - H_FALL) / (H_LAND - H_FALL));
          if (t > H_LAND) rx = 2.04 + 0.05 * Math.exp(-(t - H_LAND) * 6) * Math.sin((t - H_LAND) * 40);
        } else rx = 2.04;
      }
      if (i >= 9) {
        if (era === "1949" && s.id === 8) {
          const u = clamp01((t - LAND_GONE0 - (i - 9) * 0.35) / 0.7);
          rx = -1.7 * easeIn(u); sy = 1 - 0.4 * u;
          if (u >= 1) show = false;
        } else if (era === "1949" || era === "1978") show = false;
      }
      if (era === "1978") {
        const swap = SWAP0 + i * SWAP_STEP;
        rz = 0.05 * Math.sin(i * 2.3); // eski, qiyshaygan
        if (t >= swap) show = false;
      }
      for (const [obj, vis] of [[L.g, show && !dirty], [D.g, show && dirty]] as const) {
        obj.visible = vis;
        obj.rotation.set(rx, 0, rz); obj.scale.set(1, sy, 1);
      }
    }
    for (let i = 0; i < this.fresh.length; i++) {
      const g = this.fresh[i].g;
      let show = era === "now", sc = 1;
      if (era === "1978") {
        const swap = SWAP0 + i * SWAP_STEP, u = clamp01((t - swap) / 0.35);
        show = t >= swap; sc = 0.6 + 0.4 * smooth(u) + 0.08 * Math.sin(u * Math.PI);
      }
      g.visible = show; g.scale.set(1, sc, 1);
    }
    // lampochkalar: 1923 tunda navbat bilan HOLLY / WOOD / LAND / hammasi; kunduzi va keyin — o'chiq
    const bulbsOn = era === "1923" || era === "1940";
    this.bulbs.visible = bulbsOn;
    if (bulbsOn) {
      const night = s.light === "night", stg = Math.floor((t * 1.25) % 4);
      for (let k = 0; k < this.bulbLetter.length; k++) {
        const li = this.bulbLetter[k], grp = li < 5 ? 0 : li < 9 ? 1 : 2;
        const on = night && (stg === 3 || stg === grp);
        const broken = era === "1940" && (k * 7919) % 5 === 0;
        if (on) this.col.setRGB(5.0, 3.7, 1.7); else if (broken) this.col.setRGB(0.12, 0.12, 0.12); else this.col.setRGB(0.55, 0.52, 0.45);
        this.bulbs.setColorAt(k, this.col);
      }
      if (this.bulbs.instanceColor) this.bulbs.instanceColor.needsUpdate = true;
    }
    this.ladder.visible = era === "1923" && s.id === 4;
    this.lookout.visible = era === "now";
  }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light];
    // ---- kamera ----
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.2; cam.far = 4000; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    // ---- yorug'lik ----
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    let Rr = THREE.MathUtils.clamp(dist * 1.1 + 8, 14, 140);
    if (s.light === "golden") Rr = Math.max(Rr, 30);
    this.sun.position.copy(focus).addScaledVector(sunDir, 300); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 700; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    // ---- osmon, tuman, quyosh, bulutlar ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar;
    scene.fog = this.fog; scene.background = null;
    const showSun = s.light === "golden";
    this.sunDisc.visible = this.sunHalo.visible = showSun;
    if (showSun) {
      this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 2000);
      this.sunDisc.scale.setScalar(2 * 2000 * Math.tan(THREE.MathUtils.degToRad(1.7)));
      this.sunHalo.position.copy(this.sunDisc.position); this.sunHalo.scale.setScalar(2 * 2000 * Math.tan(THREE.MathUtils.degToRad(24)));
      (this.sunHalo.material as THREE.SpriteMaterial).color.set(L.sunDisc).multiplyScalar(1.3);
    }
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i], mat = m.material as THREE.MeshBasicMaterial;
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      mat.map = this.cloudMaps[s.light][i % 4];
    }
    // ---- yozuv ----
    this.poseSign(s, t);
    // ---- qahramonlar va effektlar ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, t, { pos: cam.position, right });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    const tint = s.light === "golden" ? "#ffcf9e" : "#ffffff";
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5))) continue;
      const a = this.actor(ai++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      if (a.mat.emissiveMap) a.mat.emissive.set(tint);
      a.mesh.castShadow = L.actorShadow;
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0;
    const fused: Fx[] = [];
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const ef = this.fx(fi++);
      ef.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      ef.use(!!p.soft);
      ef.mesh.visible = true;
      ef.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) ef.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else { ef.mesh.quaternion.copy(cam.quaternion); ef.mesh.rotateZ(p.rot ?? 0); }
      ef.mesh.scale.set(p.w, p.h, 1);
      fused.push(ef);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const ef of fused) ef.bind();
    return focus;
  }
}
