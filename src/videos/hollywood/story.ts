// "Bir yarim yillik reklama" — Hollywood yozuvi. Vaqt jadvali: ssenariy qatorlari (LINES, sekund) -> kadrlar (SHOTS),
// kamera (CAMS: silliq smootherstep siljishlar, har to'xtashda sekin yaqinlashish, katta o'zgarishlar — kesish),
// linza xiraligi (DOF), zarbalar (KICKS). LINES hozircha taxminiy: Sardor ovozi yasalgach, uning vaqtlariga almashtiriladi.
import type { Light } from "./lights";

export const FPS = 30;
export const D0 = 0; // build.ts uylar uchun: shahar balandligi alohida beriladi
export type V3 = [number, number, number];

// ---------------- ssenariy qatorlari (boshlanish vaqti, sekund) ----------------
// 1 hook, 2 1923, 3 lampochkalar, 4 qorovul, 5 pul tugadi, 6 shamol/H, 7 yaxshiyamki, 8 afsuski LAND, 9 ustunlar,
// 10 faner, 11 yelkan, 12 1978 yulduzlar, 13 po'lat, 14 yakun
export const LINES = [0, 6.35, 14.06, 19.34, 26.55, 30.11, 33.82, 37.38, 40.52, 45.87, 52.22, 57.21, 65.7, 68.84];
export const END = 75.8;
export const TOTAL = Math.round(END * FPS);
const F = (s: number) => Math.round(s * FPS);
const LF = LINES.map(F);

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeIn = (u: number) => clamp01(u) ** 2;
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 3;

// ---------------- joy: tog' qiyaligi, yozuv, shahar ----------------
/** yer balandligi: janubga (+z) qiyalik, z ~ -40 da cho'qqi, pastda shahar tekisligi (y = CITY_Y) */
export const CITY_Y = -255;
export const ground = (x: number, z: number) => {
  const bumps = 3.2 * Math.sin(x / 37 + 0.6) + 1.8 * Math.sin(x / 17 + z / 23) + 1.2 * Math.sin(z / 11 - x / 29);
  const slope = -0.5 * z;                                   // oldingi qiyalik ~27°
  const ridge = 22 - 0.004 * (z + 45) ** 2;                 // cho'qqi z = -45 atrofida
  const front = Math.min(slope, ridge + 4);
  const y = z < -45 ? ridge + bumps * 0.6 : front + bumps;
  return Math.max(CITY_Y, y);
};
/** yozuv: old yuzasi z = 0 da, janubga qaragan; harf balandligi 13.7 m (45 fut) */
export const LETTER_H = 13.7;
export const OLD_TEXT = "HOLLYWOODLAND";
export const NEW_TEXT = "HOLLYWOOD";
export const LETTER_W = 9.0, LETTER_GAP = 1.1;
export const letterX = (i: number, n = OLD_TEXT.length) => (i - (n - 1) / 2) * (LETTER_W + LETTER_GAP);
/** yangi (1978) yozuv eski HOLLYWOOD harflari o'rnida turadi */
export const newLetterX = (i: number) => letterX(i);
/** harf asosining balandligi (o'z markazidagi yer) */
export const letterBase = (i: number) => ground(letterX(i), 0.6) - 0.6;
/** qorovul kulbasi: birinchi "L" (2-harf) ortida */
export const CABIN: V3 = [letterX(2), 0, -9];
CABIN[1] = ground(CABIN[0], CABIN[2]);

// ---------------- voqealar (sekund) ----------------
export const H_WOBBLE = LINES[5] + 0.6;   // shamol kuchayadi
export const H_FALL = LINES[5] + 2.1;     // "va H qulab tushdi"
export const H_LAND = H_FALL + 0.9;       // H yerga tegadi
export const LAND_GONE0 = LINES[7] + 1.2; // "faqat Land ni olib tashladi"
export const SWAP0 = LINES[11] + 2.5;     // 1978: harflar birma-bir yangilanadi
export const SWAP_STEP = 0.55;

// ---------------- kadrlar ----------------
export type Era = "now" | "1923" | "1940" | "1944" | "1949" | "1978";
export type ShotDef = { id: number; a: number; b: number; light: Light; era: Era; wind?: number; sunAz?: number; sunEl?: number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: LF[1], light: "golden", era: "now" },
  { id: 2, a: LF[1], b: LF[2], light: "day", era: "1923" },
  { id: 3, a: LF[2], b: LF[3], light: "night", era: "1923" },
  { id: 4, a: LF[3], b: LF[4], light: "golden", era: "1923", sunAz: -40, sunEl: 14 },
  { id: 5, a: LF[4], b: LF[5], light: "day", era: "1940" },
  { id: 6, a: LF[5], b: LF[6], light: "day", era: "1944", wind: 1 },
  { id: 7, a: LF[6], b: LF[7], light: "day", era: "1944" },
  { id: 8, a: LF[7], b: LF[8], light: "day", era: "1949" },
  { id: 9, a: LF[8], b: LF[9], light: "day", era: "1949", sunAz: 150 },
  { id: 10, a: LF[9], b: LF[10], light: "day", era: "1949", wind: 1 },
  { id: 11, a: LF[10], b: LF[11], light: "day", era: "1949", wind: 0.8 },
  { id: 12, a: LF[11], b: LF[12], light: "day", era: "1978" },
  { id: 13, a: LF[12], b: LF[13], light: "day", era: "now" },
  { id: 14, a: LF[13], b: TOTAL, light: "golden", era: "now" },
];
/** joy/vaqt almashganda qisqa crossfade (kadrlar soni) */
export const XFADE: Record<number, number> = { 3: 8, 4: 8, 5: 8, 12: 10, 14: 10 };
/** hook tugaganda oq chaqnash */
export const FLASH_AT = LF[1];

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  const s = shotAt(f), n = XFADE[s.id];
  if (n && f < s.a + n && s.id > 1) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - s.a + 0.5) / n }];
  return [{ id: s.id, alpha: 1 }];
};

// ---------------- kamera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mixCam = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mixCam(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
/** har to'xtash sekin yaqinlashadi (kadr ~0.25 %/kadr): kamera nishonga k marta yaqinlashadi */
const creep = (f: number, f0: number, rate = 0.0025) => Math.exp(-rate * Math.max(0, f - f0));
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
const ON = (x: number, z: number, dy = 0): V3 => [x, ground(x, z) + dy, z];
const LX = (i: number) => letterX(i);
const LB = (i: number) => letterBase(i);
const mid = LETTER_H / 2;

const CAMS: Record<number, Key[]> = {
  // 1 hook: oltin soat, bugungi yozuv; pastdan-o'ngdan keng -> o'rtacha
  1: [
    { f: 0, s: (f) => dolly([62, LB(5) + 2, 120], [LX(4), LB(4) + mid + 1, 0], creep(f, 0, 0.0016), { fov: 38, roll: -0.07 }) },
    { f: 95, dur: 60, s: (f) => dolly([24, LB(3) + 6, 48], [LX(3), LB(3) + mid, 0], creep(f, 95, 0.002), { fov: 36, roll: -0.075 }) },
  ],
  // 2 1923: shahar tomondan havodan yaqinlashish, keyin xaridorlar ustidan yozuvga
  2: [
    { f: LF[1], s: (f) => dolly([-40, 70, 330], [0, LB(6) + mid, 0], creep(f, LF[1], 0.0022), { fov: 42 }) },
    { f: LF[1] + 120, dur: 70, s: (f) => dolly([-14, LB(6) - 6, 46], [LX(5), LB(5) + mid + 1, 0], creep(f, LF[1] + 120, 0.002), { fov: 40, roll: 0.07 }) },
  ],
  // 3 tun: lampochkalar navbat bilan; keng, sekin yaqinlashish
  3: [{ f: LF[2], s: (f) => dolly([0, LB(6) + 8, 175], [0, LB(6) + mid, 0], creep(f, LF[2], 0.0028), { fov: 44 }) }],
  // 4 qorovul: "L" ga narvon, kulba; o'rtacha reja
  4: [
    { f: LF[3], s: (f) => dolly([LX(2) + 9, LB(2) + 2.5, 15], [LX(2) + 1, LB(2) + 6.5, 0.5], creep(f, LF[3]), { fov: 40, roll: 0.075 }) },
    { f: LF[3] + 105, dur: 34, s: (f) => dolly([LX(2) + 5, LB(2) + 9.5, 9], [LX(2) + 1.2, LB(2) + 11.5, 0.4], creep(f, LF[3] + 105, 0.003), { fov: 38, roll: 0.07 }) },
  ],
  // 5 pul tugadi: qorovul ketadi, kulba eshigi; yuqoridan
  5: [{ f: LF[4], s: (f) => dolly([LX(2) - 16, LB(2) + 13, -18], [CABIN[0] + 2, CABIN[1] + 1.2, CABIN[2] + 5], creep(f, LF[4], 0.003), { fov: 42, roll: -0.07 }) }],
  // 6 shamol: H yaqindan pastdan, qulaganda zarba
  6: [
    { f: LF[5], s: (f) => dolly([LX(0) + 14, LB(0) + 1.2, 22], [LX(0), LB(0) + mid + 1, 0], creep(f, LF[5], 0.003), { fov: 40, roll: 0.075 }) },
    { f: F(H_FALL) - 6, dur: 20, s: () => ({ pos: [LX(0) + 20, LB(0) + 3, 30], look: [LX(0) + 1, LB(0) + 3, 5], fov: 42, roll: 0.06 }) },
  ],
  // 7 yaxshiyamki: keng, H siz yozuv
  7: [{ f: LF[6], s: (f) => dolly([-30, LB(4) + 10, 150], [LX(2), LB(3) + mid, 0], creep(f, LF[6], 0.002), { fov: 42, roll: -0.06 }) }],
  // 8 afsuski: LAND yiqiladi; LAND tomondan
  8: [{ f: LF[7], s: (f) => dolly([LX(10) + 30, LB(10) + 8, 120], [LX(8), LB(8) + mid, 0], creep(f, LF[7], 0.002), { fov: 42, roll: 0.06 }) }],
  // 9 ustunlar: harf orqasidan, telefon ustunlari va yupqa taxtalar
  9: [
    { f: LF[8], s: (f) => dolly([LX(4) - 7, LB(4) + 2.5, -11], [LX(4) + 1, LB(4) + 7, -0.6], creep(f, LF[8], 0.003), { fov: 42, roll: -0.075 }) },
    { f: LF[8] + 90, dur: 30, s: (f) => dolly([LX(4) - 3, LB(4) + 1.2, -4.5], [LX(4) + 0.5, LB(4) + 4, -0.5], creep(f, LF[8] + 90, 0.004), { fov: 40, roll: -0.07 }) },
  ],
  // 10 faner: tepalikdagi yo'lakda odam katta faner bilan, shamol sudraydi
  10: [{ f: LF[9], s: (f) => {
    const x = PLY_X(f / FPS);
    return dolly([x + 2.5, ground(x, PLY_Z) + 1.6, PLY_Z + 7.5], [x - 0.5, ground(x, PLY_Z) + 1.2, PLY_Z], creep(f, LF[9], 0.002), { fov: 40, roll: 0.07 });
  } }],
  // 11 yelkan: pastdan keng, harflar shamolda egiladi
  11: [{ f: LF[10], s: (f) => dolly([LX(6) + 8, LB(6) - 10, 60], [LX(6), LB(6) + mid + 2, 0], creep(f, LF[10], 0.0025), { fov: 46, roll: -0.08 }) }],
  // 12 1978: yulduzlar harflar oldida, harflar birma-bir yangilanadi
  12: [
    { f: LF[11], s: (f) => dolly([LX(4) + 4, LB(4) + 3, 60], [LX(4), LB(4) + 5, 2], creep(f, LF[11], 0.002), { fov: 46 }) },
    { f: LF[11] + 75, dur: 40, s: (f) => dolly([LX(4) + 10, LB(4) + 14, 95], [LX(4), LB(4) + mid, 0], creep(f, LF[11] + 75, 0.0018), { fov: 44, roll: 0.05 }) },
  ],
  // 13 po'lat: yangi harf asosi (beton) yaqindan, yuqoriga ko'tarilish
  13: [
    { f: LF[12], s: () => ({ pos: [LX(2) + 6, LB(2) + 0.8, 7], look: [LX(2) + 1, LB(2) + 0.6, 0], fov: 40, roll: 0.07 }) },
    { f: LF[12] + 10, dur: 70, s: (f) => dolly([LX(2) + 9, LB(2) + 3, 12], [LX(2) + 1, LB(2) + mid + 2, 0], creep(f, LF[12] + 10, 0.002), { fov: 42, roll: 0.06 }) },
  ],
  // 14 yakun: oltin soat, kuzatuv maydonchasidagi sayyohlar ortidan, kran bilan uzoqlashish
  14: [
    { f: LF[13], s: (f) => dolly([LOOKOUT[0] + 2, LOOKOUT[1] + 2.2, LOOKOUT[2] + 7], [LX(4), LB(4) + mid, 0], 1 / creep(f, LF[13], 0.0009), { fov: 30 }) },
    { f: LF[13] + 120, dur: 80, s: (f) => dolly([LOOKOUT[0] + 6, LOOKOUT[1] + 14, LOOKOUT[2] + 30], [LX(4), LB(4) + mid, 0], 1 / creep(f, LF[13] + 120, 0.0006), { fov: 34 }) },
  ],
};
/** sayyohlar kuzatuv maydonchasi: yozuvdan janubi-sharqda, pastroq tepalik */
export const LOOKOUT: V3 = [70, 0, 300];
LOOKOUT[1] = ground(LOOKOUT[0], LOOKOUT[2]) + 6;
/** faner sahnasi: tog' yo'lagi, odam shamolda o'ngdan chapga suriladi */
export const PLY_Z = 30;
export const PLY_X = (t: number) => { const u = t - LINES[9]; return 40 - 9 * easeIn((u - 1.4) / 3.0) - 2.4 * Math.max(0, u - 4.4); };

// zarbalar: rasm har kadr belgisini almashtiradi, 7 kadrda so'nadi
const KICKS: [number, number][] = [[H_LAND, 1.6], [LAND_GONE0 + 0.5, 0.5], [LAND_GONE0 + 1.1, 0.5]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(f / FPS);
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};

// ---------------- linza xiraligi ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 0 },
  { f: LF[1] + 120, dur: 70, cInf: 7 },
  { f: LF[2], cInf: 0 },
  { f: LF[3], cInf: 12 },
  { f: LF[4], cInf: 6 },
  { f: LF[5], cInf: 10 },
  { f: LF[6], cInf: 0 },
  { f: LF[8], cInf: 12 },
  { f: LF[9], cInf: 14, focus: (f) => { const x = PLY_X(f / FPS); return [x, ground(x, PLY_Z) + 1.5, PLY_Z]; } },
  { f: LF[10], cInf: 0 },
  { f: LF[11], cInf: 10, focus: () => [LX(4), LB(4) + 1.6, 4] },
  { f: LF[11] + 75, dur: 40, cInf: 0 },
  { f: LF[12], cInf: 12 },
  { f: LF[13], cInf: 8, focus: () => [LOOKOUT[0], LOOKOUT[1] + 1.5, LOOKOUT[2] - 2] },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
export { ON };
