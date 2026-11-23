// @ts-nocheck
// «Lola and the Perfect Picture» — oq-qora chiziqli 2D multfilm (Canvas2D).
// Vaqt "b" (beat) bilan: b = sahna raqami + sahna ichidagi ulush. Sahnalar: videos/lola-film.json.
// Oddiy JS sintaksisi (lokal sinov uchun ham ishlatiladi).

const W = 1080, H = 1920;
let ctx = null;
let FONT = 'sans-serif';
let INK = '#17171b', PAPER = '#fbfaf6';
const DAY_INK = '#17171b', DAY_PAPER = '#fbfaf6', NIGHT_INK = '#eef0f6', NIGHT_PAPER = '#171a22';
const RED = '#e5484d', ORANGE = '#f08c2e', WARM = '#f5c542';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, p) => a + (b - a) * p;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const eio = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
const eout = (p) => 1 - Math.pow(1 - p, 3);
const back = (p) => { const c1 = 1.7, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
function rnd(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
function ink(w = 6) { ctx.lineWidth = w; ctx.strokeStyle = INK; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; }
function fs(fill = PAPER, w = 6) { ctx.fillStyle = fill; ctx.fill(); ink(w); ctx.stroke(); }
function st(w = 6) { ink(w); ctx.stroke(); }
function circ(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); }
function ell(x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); }
function line(x1, y1, x2, y2, w = 6) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); st(w); }
function limb(pts, w = 20) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.strokeStyle = INK; ctx.lineWidth = w + 11; ctx.stroke(); ctx.strokeStyle = PAPER; ctx.lineWidth = w; ctx.stroke();
}
function heart(x, y, s) { ctx.beginPath(); ctx.moveTo(x, y + s * 0.35); ctx.bezierCurveTo(x - s * 1.1, y - s * 0.35, x - s * 0.45, y - s * 1.05, x, y - s * 0.45); ctx.bezierCurveTo(x + s * 0.45, y - s * 1.05, x + s * 1.1, y - s * 0.35, x, y + s * 0.35); ctx.closePath(); }
const P2 = (o, len, ang, side) => [o[0] + side * Math.sin(ang) * len, o[1] + Math.cos(ang) * len];

// ================= LOLA =================
// o: x,y,s, flip(1/-1), turn(-1..1), pose 'stand'|'walk'|'kneel'|'sit', kneelT(0..1), ph (yurish fazasi),
// bob, lean, headTilt, eyes, mouth, talk(0..1), blink, lx,ly (qarash), armL/armR {a,e}, phone 'L'|'R'|null,
// flash, glassesOn, mud, heelsInHand, bag, sway, ghost (aks uchun)
function drawLola(o) {
  ctx.save(); ctx.translate(o.x, o.y); ctx.scale(o.s * (o.flip || 1), o.s); ctx.rotate(o.lean || 0);
  const pose = o.pose || 'stand';
  const kT = pose === 'kneel' ? 1 : (o.kneelT || 0);
  let hipY = pose === 'sit' ? -40 : lerp(-430, -235, kT);
  hipY += o.bob || 0;
  const up = hipY + 430;
  const sy = -700 + up, wy = -560 + up;
  // soya
  if (pose !== 'sit') { ctx.save(); ctx.globalAlpha = 0.1; ctx.fillStyle = INK; ell(0, 6, 140, 16); ctx.fill(); ctx.restore(); }
  // --- dumcha (orqada)
  const hc = [0, -818 + up];
  ctx.save(); ctx.translate(0, sy - 30); ctx.rotate(o.headTilt || 0); ctx.translate(0, -(sy - 30));
  ponytail(hc, o.sway || 0);
  ctx.restore();
  // --- oyoqlar
  legs(pose, hipY, kT, o);
  // --- yubka
  const hw = pose === 'sit' ? 155 : lerp(135, 185, kT);
  const hy = pose === 'sit' ? 44 : lerp(-235, -12, kT);
  const sw = (o.skirtSway || 0);
  ctx.beginPath(); ctx.moveTo(-40, wy);
  ctx.quadraticCurveTo(-hw * 0.75, wy + (hy - wy) * 0.45, -hw + sw, hy);
  const n = 7;
  for (let i = 0; i < n; i++) { const x0 = -hw + sw + (2 * hw) * (i / n), x1 = -hw + sw + (2 * hw) * ((i + 1) / n); ctx.quadraticCurveTo((x0 + x1) / 2, hy + 16, x1, hy); }
  ctx.quadraticCurveTo(hw * 0.75, wy + (hy - wy) * 0.45, 40, wy); ctx.closePath(); fs(PAPER, 6);
  if (pose === 'sit') for (const sd of [-1, 1]) { ctx.beginPath(); ctx.arc(sd * 62, hy - 26, 40, Math.PI * 1.05, Math.PI * 1.95); st(3); }
  for (const fx of [-0.45, 0, 0.45]) { ctx.beginPath(); ctx.moveTo(fx * 30, wy + 20); ctx.quadraticCurveTo(fx * hw * 0.8 + sw * 0.5, (wy + hy) / 2, fx * hw * 0.95 + sw, hy - 6); st(3); }
  // --- loy (yubkada)
  if (o.mud > 0) mudBlobs(-hw, wy + 40, hw, hy - 8, o.mud, 1);
  // --- ko'ylak tepasi
  ctx.beginPath(); ctx.moveTo(-40, wy); ctx.lineTo(-52, sy + 4);
  ctx.quadraticCurveTo(-30, sy - 6, -14, sy + 6); ctx.quadraticCurveTo(0, sy + 26, 14, sy + 6); ctx.quadraticCurveTo(30, sy - 6, 52, sy + 4);
  ctx.lineTo(40, wy); ctx.closePath(); fs(PAPER, 6);
  line(-40, wy - 6, 40, wy - 6, 4);
  if (o.mud > 0.3) mudBlobs(-36, sy + 30, 36, wy - 10, (o.mud - 0.3) * 0.6, 50);
  // yenglar (puf)
  for (const sd of [-1, 1]) {
    ell(sd * 64, sy + 12, 34, 30); fs(PAPER, 6);
    for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(sd * 64 + k * 12, sy - 10); ctx.quadraticCurveTo(sd * 64 + k * 14, sy + 10, sd * 64 + k * 10, sy + 34); st(2.5); }
  }
  // bo'yin
  line(-13, sy + 2, -13, sy - 36, 5); line(13, sy + 2, 13, sy - 36, 5);
  // --- bosh
  ctx.save(); ctx.translate(0, sy - 30); ctx.rotate(o.headTilt || 0); ctx.translate(0, -(sy - 30));
  head(hc, o);
  ctx.restore();
  // --- qo'llar
  const shL = [-60, sy + 18], shR = [60, sy + 18];
  const handL = arm(shL, -1, o.armL || { a: 0.25, e: 0.15 });
  const handR = arm(shR, 1, o.armR || { a: 0.25, e: 0.15 });
  if (o.bag) { const el = handL.el; line(el[0], el[1], el[0] - 4, el[1] + 52, 3); heart(el[0] - 4, el[1] + 80, 30); fs(PAPER, 5); }
  if (o.heelsInHand) { const h = handL.h; for (let k = 0; k < 2; k++) { ctx.save(); ctx.translate(h[0] - 8 + k * 16, h[1] + 30); ctx.rotate(0.2 - k * 0.4 + Math.sin(o.t * 3 + k) * 0.08); shoe(0, 0, 1, true); ctx.restore(); } }
  if (o.phone) { const h = o.phone === 'L' ? handL.h : handR.h; phone(h[0], h[1] - 18, o.phoneRot || 0, o.flash || 0); }
  if (o.orangeInHand) { const h = handR.h; orange(h[0], h[1] - 14, 15); }
  ctx.restore();
  const T = (q) => [o.x + o.s * (o.flip || 1) * q[0], o.y + o.s * q[1]];
  return { handL: T(handL.h), handR: T(handR.h) };
}

function legs(pose, hipY, kT, o) {
  const ph = o.ph || 0;
  if (pose === 'sit') {
    for (const sd of [-1, 1]) { limb([[sd * 56, 30], [sd * 60, 178]], 22); shoe(sd * 62, 190, sd, false, o.barefoot); }
    return;
  }
  for (const sd of [-1, 1]) {
    const swing = pose === 'walk' ? 0.32 * Math.sin(ph + (sd > 0 ? Math.PI : 0)) : 0;
    const kb = pose === 'walk' ? Math.max(0, 0.55 * Math.sin(ph + (sd > 0 ? Math.PI : 0) + 1.3)) : 0;
    const hip = [sd * 24, hipY];
    if (kT > 0.01) {
      // tiz cho'kish: son qisqaradi, tizza yerga
      const knee = [lerp(sd * 30, sd * 46, kT), lerp(-215, -16, kT)];
      const ank = [lerp(sd * 32, sd * 60, kT), lerp(-12, -4, kT)];
      if (kT < 0.95) limb([hip, knee, ank], 22); else limb([hip, knee], 22);
      if (kT < 0.6) shoe(ank[0], ank[1], sd, false, o.barefoot);
      continue;
    }
    const knee = [hip[0] + Math.sin(swing) * 215 + sd * 4, hip[1] + Math.cos(swing) * 215];
    const sa = swing - kb;
    const ank = [knee[0] + Math.sin(sa) * 205, knee[1] + Math.cos(sa) * 205];
    limb([hip, knee, ank], 22);
    shoe(ank[0], ank[1] + 6, o.flip || 1, false, o.barefoot);
  }
}
function shoe(x, y, dir, loose, bare) {
  ctx.save(); ctx.translate(x, y);
  if (bare) { ell(dir * 6, 0, 20, 10); fs(PAPER, 5); ctx.restore(); return; }
  ctx.beginPath(); ctx.moveTo(-16, -14); ctx.quadraticCurveTo(dir * 30, -16, dir * 30, 2); ctx.lineTo(-18, 4); ctx.closePath(); fs(PAPER, 5);
  ctx.beginPath(); ctx.rect(-dir * 18 - 7, 2, 12, 14); fs(INK, 3);
  ctx.restore();
}
function ponytail(hc, sw) {
  const [cx, cy] = hc;
  ctx.beginPath();
  ctx.moveTo(cx + 4, cy - 92);
  ctx.bezierCurveTo(cx + 70, cy - 150, cx + 140, cy - 110, cx + 120, cy - 30);
  ctx.bezierCurveTo(cx + 105 + sw * 0.3, cy + 40, cx + 150 + sw * 0.6, cy + 90, cx + 115 + sw, cy + 170);
  ctx.bezierCurveTo(cx + 95 + sw, cy + 215, cx + 70 + sw * 0.8, cy + 190, cx + 82 + sw * 0.6, cy + 140);
  ctx.bezierCurveTo(cx + 95 + sw * 0.4, cy + 80, cx + 60, cy + 20, cx + 70, cy - 40);
  ctx.bezierCurveTo(cx + 78, cy - 80, cx + 40, cy - 96, cx + 4, cy - 92);
  ctx.closePath(); fs(PAPER, 6);
  for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(cx + 85 + k * 8, cy - 70 + k * 10); ctx.bezierCurveTo(cx + 110 + k * 6, cy, cx + 95 + sw * 0.5 + k * 6, cy + 80, cx + 100 + sw * 0.8 + k * 4, cy + 140 - k * 20); st(2.5); }
}
function head(hc, o) {
  const [cx, cy] = hc; const tn = (o.turn || 0) * 12;
  // yuz
  ctx.beginPath(); ctx.moveTo(cx, cy - 76);
  ctx.bezierCurveTo(cx + 40, cy - 76, cx + 62, cy - 40, cx + 60, cy);
  ctx.bezierCurveTo(cx + 58, cy + 42, cx + 28, cy + 70, cx + tn * 0.3, cy + 78);
  ctx.bezierCurveTo(cx - 28, cy + 70, cx - 58, cy + 42, cx - 60, cy);
  ctx.bezierCurveTo(cx - 62, cy - 40, cx - 40, cy - 76, cx, cy - 76); fs(PAPER, 6);
  // soch (old qism)
  ctx.beginPath(); ctx.moveTo(cx - 66, cy + 26);
  ctx.bezierCurveTo(cx - 74, cy - 70, cx - 34, cy - 100, cx, cy - 100);
  ctx.bezierCurveTo(cx + 34, cy - 100, cx + 74, cy - 70, cx + 66, cy + 26);
  ctx.bezierCurveTo(cx + 58, cy - 20, cx + 52, cy - 44, cx + 30 + tn, cy - 54);
  ctx.bezierCurveTo(cx + 6 + tn, cy - 40, cx - 30 + tn, cy - 34, cx - 52, cy - 6);
  ctx.bezierCurveTo(cx - 58, cy + 4, cx - 62, cy + 14, cx - 66, cy + 26); ctx.closePath(); fs(PAPER, 6);
  for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(cx - 20 + k * 22, cy - 94); ctx.quadraticCurveTo(cx - 10 + k * 20 + tn, cy - 70, cx - 34 + k * 18 + tn, cy - 46); st(2.5); }
  // yon jingalaklar
  for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sd * 64, cy + 10); ctx.bezierCurveTo(cx + sd * 78, cy + 40, cx + sd * 62, cy + 60, cx + sd * 74, cy + 86); st(4); }
  // bant
  const by = cy - 104;
  for (const sd of [-1, 1]) { ell(cx + sd * 34, by - 6, 34, 20, sd * -0.35); fs(PAPER, 5); ctx.beginPath(); ctx.moveTo(cx + sd * 12, by - 4); ctx.quadraticCurveTo(cx + sd * 30, by - 8, cx + sd * 50, by - 14); st(2.5); }
  circ(cx, by - 2, 11); fs(PAPER, 5);
  // ko'zoynak (boshda)
  if (!o.glassesOn) { for (const sd of [-1, 1]) { circ(cx + sd * 26, cy - 72, 17); fs(INK, 4); } line(cx - 9, cy - 72, cx + 9, cy - 72, 4); }
  // yuz ifodasi
  face(cx + tn, cy, o);
  if (o.glassesOn) {
    for (const sd of [-1, 1]) { circ(cx + tn + sd * 26, cy - 4, 21); fs(INK, 4); ctx.beginPath(); ctx.moveTo(cx + tn + sd * 26 - 10, cy - 12); ctx.lineTo(cx + tn + sd * 26 - 2, cy - 18); ctx.strokeStyle = PAPER; ctx.lineWidth = 3; ctx.stroke(); }
    line(cx + tn - 6, cy - 6, cx + tn + 6, cy - 6, 4);
  }
}
function face(cx, cy, o) {
  const eyes = o.eyes || 'open', bl = o.blink || 0, lx = (o.lx || 0) * 6, ly = (o.ly || 0) * 4;
  for (const sd of [-1, 1]) {
    const ex = cx + sd * 25, ey = cy - 4;
    const st8 = eyes === 'wink' && sd > 0 ? 'happy' : eyes === 'wink' ? 'open' : eyes;
    if (st8 === 'happy' || bl > 0.6) {
      ctx.beginPath(); ctx.arc(ex, ey + 8, 14, Math.PI * 1.15, Math.PI * 1.85); st(5);
    } else {
      const lower = st8 === 'down' ? 6 : 0, big = st8 === 'surprise' ? 1.25 : 1;
      ctx.save(); ctx.beginPath(); ctx.moveTo(ex - 17, ey + lower * 0.5); ctx.quadraticCurveTo(ex, ey - 15 * big + lower, ex + 17, ey - 2 + lower * 0.5);
      ctx.quadraticCurveTo(ex, ey + 12, ex - 17, ey + lower * 0.5); ctx.closePath(); ctx.fillStyle = PAPER; ctx.fill(); ctx.clip();
      circ(ex + lx, ey + 1 + ly + lower * 0.6, 8.5 * big); ctx.fillStyle = INK; ctx.fill();
      circ(ex + lx + 3, ey - 2 + ly + lower * 0.6, 2.6); ctx.fillStyle = PAPER; ctx.fill(); ctx.restore();
      ctx.beginPath(); ctx.moveTo(ex - 17, ey + lower * 0.5); ctx.quadraticCurveTo(ex, ey - 15 * big + lower, ex + 17, ey - 2 + lower * 0.5); st(5);
      ctx.beginPath(); ctx.moveTo(ex - 13, ey + 4); ctx.quadraticCurveTo(ex, ey + 11, ex + 13, ey + 3); st(2);
    }
    // kipriklar
    for (let k = 0; k < 3; k++) { const ox = ex + sd * (12 + k * 4), oy = ey - 6 + k * 3; line(ox, oy, ox + sd * 8, oy - 7 + k * 2, 2.5); }
    // qosh
    const bt = st8 === 'sad' ? sd * 0.25 : st8 === 'surprise' ? 0 : st8 === 'down' ? sd * 0.15 : -sd * 0.05;
    const byy = ey - 26 - (st8 === 'surprise' ? 7 : 0);
    ctx.save(); ctx.translate(ex, byy); ctx.rotate(bt); ctx.beginPath(); ctx.moveTo(-14, 3); ctx.quadraticCurveTo(0, -5, 15, 2); st(3.5); ctx.restore();
  }
  // burun
  ctx.beginPath(); ctx.moveTo(cx - 1, cy + 10); ctx.quadraticCurveTo(cx + 7, cy + 22, cx, cy + 25); st(3);
  // og'iz
  const my = cy + 44, m = o.mouth || 'smile';
  if (o.talk > 0.05) { ell(cx, my, 13, 4 + 9 * o.talk); fs(INK, 3); }
  else if (m === 'smile') { ctx.beginPath(); ctx.moveTo(cx - 15, my - 3); ctx.quadraticCurveTo(cx, my + 9, cx + 15, my - 3); st(4); }
  else if (m === 'grin') { ctx.beginPath(); ctx.moveTo(cx - 18, my - 5); ctx.quadraticCurveTo(cx, my + 16, cx + 18, my - 5); ctx.closePath(); fs(PAPER, 4); line(cx - 14, my - 1, cx + 14, my - 1, 2); }
  else if (m === 'kiss') { ell(cx + 2, my, 7, 6); fs(PAPER, 4); }
  else if (m === 'o') { ell(cx, my, 8, 10); fs(INK, 3); }
  else if (m === 'sad') { ctx.beginPath(); ctx.moveTo(cx - 13, my + 4); ctx.quadraticCurveTo(cx, my - 5, cx + 13, my + 4); st(4); }
  else { line(cx - 11, my, cx + 11, my + 1, 4); }
  if (eyes === 'happy' || eyes === 'wink' || o.blush) for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) line(cx + sd * 42 + k * 6 - 6, cy + 22, cx + sd * 42 + k * 6 - 10, cy + 30, 2);
}
function arm(sh, sd, A) {
  const el = P2(sh, 132, A.a, sd);
  const h = P2(el, 122, A.a - A.e, sd);
  limb([sh, el, h], 22); circ(h[0], h[1], 13); fs(PAPER, 5);
  return { el, h };
}
function phone(x, y, rot, flash) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.beginPath(); ctx.roundRect(-19, -34, 38, 68, 8); fs(INK, 4);
  circ(-8, -24, 4); ctx.fillStyle = PAPER; ctx.fill();
  if (flash > 0) { ctx.globalAlpha = flash; ctx.fillStyle = '#ffffff'; for (let r = 0; r < 3; r++) { circ(-8, -24, 30 + r * 40 * flash); ctx.globalAlpha = flash * (0.6 - r * 0.18); ctx.fill(); } }
  ctx.restore();
}
function orange(x, y, r) { circ(x, y, r); fs(ORANGE, 4); ctx.beginPath(); ctx.ellipse(x + 4, y - r, 7, 3.5, -0.5, 0, 7); fs(PAPER, 3); }
function mudBlobs(x0, y0, x1, y1, amt, seed) {
  const N = Math.floor(amt * 14);
  for (let i = 0; i < N; i++) {
    const x = lerp(x0 * 0.85, x1 * 0.85, rnd(seed + i * 3)), y = lerp(y0, y1, rnd(seed + i * 3 + 1)), r = 8 + rnd(seed + i * 3 + 2) * 16;
    ctx.beginPath();
    for (let k = 0; k <= 8; k++) { const a = k / 8 * Math.PI * 2, rr = r * (0.7 + 0.5 * rnd(seed + i * 11 + k)); ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.8); }
    ctx.closePath(); ctx.fillStyle = INK; ctx.globalAlpha = 0.85; ctx.fill(); ctx.globalAlpha = 1;
    if (i % 3 === 0) line(x, y + r * 0.6, x + 2, y + r * 0.6 + 14, 3);
  }
}

// ================= KARIM BOBO =================
// o: x,y,s,flip, pose 'stand'|'walk'|'fallen', ph, rot, smile, cane(true), bag 0..1 (1 = yirtilgan/yo'q), armR {a,e}, talk
function drawKarim(o) {
  ctx.save(); ctx.translate(o.x, o.y); ctx.scale(o.s * (o.flip || 1), o.s); ctx.rotate(o.rot || 0);
  const pose = o.pose || 'stand';
  if (pose !== 'fallen') { ctx.save(); ctx.globalAlpha = 0.1; ctx.fillStyle = INK; ell(0, 6, 110, 14); ctx.fill(); ctx.restore(); }
  let hip = pose === 'fallen' ? -60 : -250, sh = pose === 'fallen' ? -290 : -470, hy = pose === 'fallen' ? -30 : -210;
  hip += o.dy || 0; sh += o.dy || 0; hy += o.dy || 0;
  // oyoqlar
  if (pose === 'fallen') {
    ctx.beginPath(); ctx.ellipse(0, -40, 120, 30, 0, 0, 7); fs(PAPER, 5);
    for (const sd of [-1, 1]) { limb([[sd * 26, -50], [sd * 52, -10], [sd * 66, 22]], 28); ctx.beginPath(); ctx.ellipse(sd * 70, 36, 18, 26, sd * 0.3, 0, 7); fs(INK, 3); }
  } else {
    for (const sd of [-1, 1]) {
      const sw = pose === 'walk' ? 0.22 * Math.sin((o.ph || 0) + (sd > 0 ? Math.PI : 0)) : 0;
      const knee = [sd * 22 + Math.sin(sw) * 120, hip + 120], ank = [sd * 22 + Math.sin(sw) * 230, -14];
      limb([[sd * 22, hip], knee, ank], 26); ctx.beginPath(); ctx.ellipse(ank[0] + 14, ank[1] + 4, 26, 12, 0, 0, 7); fs(INK, 3);
    }
  }
  // palto
  ctx.save(); ctx.translate(0, hip); ctx.rotate(pose === 'fallen' ? -0.2 : 0.1); ctx.translate(0, -hip);
  ctx.beginPath(); ctx.moveTo(-55, sh); ctx.lineTo(-78, hy); ctx.quadraticCurveTo(0, hy + 14, 78, hy); ctx.lineTo(55, sh); ctx.quadraticCurveTo(0, sh - 18, -55, sh); ctx.closePath(); fs(PAPER, 6);
  line(0, sh + 10, 4, hy + 4, 3); for (let k = 0; k < 3; k++) { circ(10, sh + 60 + k * 55, 5); fs(INK, 2); }
  ctx.beginPath(); ctx.moveTo(-24, sh - 6); ctx.lineTo(0, sh + 60); ctx.lineTo(24, sh - 6); st(4);
  // qo'llar
  const shL = [-56, sh + 16], shR = [56, sh + 16];
  const aL = o.armL || (pose === 'fallen' ? { a: 0.9, e: -0.4 } : { a: 0.15, e: 0.3 });
  const aR = o.armR || (pose === 'fallen' ? { a: 0.6, e: 0.2 } : { a: 0.25, e: 0.35 });
  const elL = P2(shL, 120, aL.a, -1), hL = P2(elL, 110, aL.a - aL.e, -1);
  const elR = P2(shR, 120, aR.a, 1), hR = P2(elR, 110, aR.a - aR.e, 1);
  limb([shL, elL, hL], 24); circ(hL[0], hL[1], 13); fs(PAPER, 5);
  limb([shR, elR, hR], 24); circ(hR[0], hR[1], 13); fs(PAPER, 5);
  if (o.cane) { line(hR[0], hR[1], hR[0] + 6, -10 - (pose === 'fallen' ? 0 : 0), 7); ctx.beginPath(); ctx.arc(hR[0] - 12, hR[1], 16, Math.PI, 0); st(7); }
  if ((o.bag || 0) < 0.5 && pose !== 'fallen') {
    ctx.beginPath(); ctx.rect(hL[0] - 40, hL[1] - 10, 72, 96); fs(PAPER, 5);
    for (let k = 0; k < 3; k++) orange(hL[0] - 24 + k * 22, hL[1] - 16 + (k % 2) * 6, 14);
    ctx.beginPath(); ctx.moveTo(hL[0] - 40, hL[1] + 4); ctx.lineTo(hL[0] + 32, hL[1] + 4); st(3);
  }
  // bosh
  const hx = 0, hyy = sh - 70;
  circ(hx - 50, hyy + 6, 12); fs(PAPER, 4); circ(hx + 50, hyy + 6, 12); fs(PAPER, 4);
  circ(hx, hyy, 52); fs(PAPER, 6);
  // kepka
  ctx.beginPath(); ctx.moveTo(hx - 56, hyy - 14); ctx.quadraticCurveTo(hx - 50, hyy - 64, hx + 6, hyy - 62); ctx.quadraticCurveTo(hx + 56, hyy - 58, hx + 58, hyy - 18); ctx.closePath(); fs(PAPER, 6);
  ctx.beginPath(); ctx.moveTo(hx + 18, hyy - 18); ctx.quadraticCurveTo(hx + 70, hyy - 22, hx + 84, hyy - 8); ctx.quadraticCurveTo(hx + 50, hyy - 6, hx + 18, hyy - 10); fs(PAPER, 5);
  // ko'zoynak, ko'z
  for (const sd of [-1, 1]) { circ(hx + sd * 19, hyy + 2, 15); st(4); circ(hx + sd * 19 + 2, hyy + 4, 4); ctx.fillStyle = INK; ctx.fill(); ctx.beginPath(); ctx.moveTo(hx + sd * 10, hyy - 20); ctx.quadraticCurveTo(hx + sd * 20, hyy - 28, hx + sd * 32, hyy - 20); st(5); }
  line(hx - 4, hyy + 2, hx + 4, hyy + 2, 3);
  // mo'ylov
  ctx.beginPath(); ctx.moveTo(hx - 30, hyy + 30);
  for (let k = 0; k < 6; k++) ctx.quadraticCurveTo(hx - 30 + k * 10 + 5, hyy + 40, hx - 30 + (k + 1) * 10, hyy + 30);
  ctx.quadraticCurveTo(hx, hyy + 14, hx - 30, hyy + 30); fs(PAPER, 4);
  if (o.talk > 0.05) { ell(hx, hyy + 44, 9, 3 + 5 * o.talk); fs(INK, 2); }
  else if (o.smile) { ctx.beginPath(); ctx.arc(hx, hyy + 38, 9, 0.15 * Math.PI, 0.85 * Math.PI); st(3); }
  else { ctx.beginPath(); ctx.arc(hx, hyy + 50, 8, 1.2 * Math.PI, 1.8 * Math.PI); st(3); }
  line(hx - 40, hyy + 16, hx - 34, hyy + 24, 2); line(hx + 40, hyy + 16, hx + 34, hyy + 24, 2);
  ctx.restore();
  ctx.restore();
}

// ================= oddiy odamlar =================
function person(x, y, s, ph, opt = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s * (opt.flip || 1), s); ctx.globalAlpha = opt.alpha ?? 1;
  for (const sd of [-1, 1]) { const sw = opt.walk ? 0.3 * Math.sin(ph + (sd > 0 ? Math.PI : 0)) : 0; line(sd * 18, -300, sd * 18 + Math.sin(sw) * 290, -8, 7); }
  ctx.beginPath(); ctx.moveTo(-46, -560); ctx.lineTo(-62, -280); ctx.lineTo(62, -280); ctx.lineTo(46, -560); ctx.closePath(); fs(PAPER, 6);
  if (opt.dress) { ctx.beginPath(); ctx.moveTo(-40, -420); ctx.lineTo(-100, -230); ctx.lineTo(100, -230); ctx.lineTo(40, -420); ctx.closePath(); fs(PAPER, 6); }
  circ(0, -620, 52); fs(PAPER, 6);
  if (opt.bun) { circ(0, -680, 24); fs(PAPER, 5); }
  if (opt.whisper) { limb([[40, -540], [70, -460], [36, -600]], 14); circ(36, -604, 10); fs(PAPER, 4); ell(14, -598, 6, 4); fs(INK, 2); }
  // ko'zlar (yon qarash)
  const lk = opt.look || 0; circ(-16 + lk * 10, -628, 4.5); ctx.fillStyle = INK; ctx.fill(); circ(16 + lk * 10, -628, 4.5); ctx.fill();
  if (opt.umbrella) {
    line(50, -520, 50, -880, 5);
    ctx.beginPath(); ctx.moveTo(-170, -820);
    ctx.quadraticCurveTo(50, -1060, 270, -820);
    for (let k = 0; k < 4; k++) { const a = 270 - k * 110, b2 = a - 110; ctx.quadraticCurveTo((a + b2) / 2, -860, b2, -820); }
    ctx.closePath(); fs(PAPER, 6);
    for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(50, -950); ctx.lineTo(-170 + k * 110, -822); st(3); }
  }
  ctx.restore();
}

// ================= joylar =================
function paper(tint) { ctx.fillStyle = tint || PAPER; ctx.fillRect(-400, -400, W + 800, H + 800); }
function ground(y) { line(-400, y, W + 400, y, 6); line(-400, y + 90, W + 400, y + 90, 3); }
function building(x, y, w, h, seed) {
  ctx.beginPath(); ctx.rect(x, y, w, h); fs(PAPER, 5);
  const cols = Math.max(2, Math.floor(w / 90)), rows = Math.floor(h / 140);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const wx = x + 25 + c * ((w - 50) / cols), wy = y + 30 + r * 140; ctx.beginPath(); ctx.rect(wx, wy, (w - 50) / cols - 22, 80); st(3); if (rnd(seed + r * 7 + c) > 0.7) line(wx + 8, wy + 10, wx + 30, wy + 40, 2); }
}
function lamp(x, y) { line(x, y, x, y - 560, 7); ctx.beginPath(); ctx.moveTo(x, y - 560); ctx.quadraticCurveTo(x + 10, y - 610, x + 70, y - 600); st(6); ctx.beginPath(); ctx.moveTo(x + 46, y - 600); ctx.lineTo(x + 94, y - 600); ctx.lineTo(x + 84, y - 570); ctx.lineTo(x + 56, y - 570); ctx.closePath(); fs(PAPER, 5); }
function shopFront(win) {
  ctx.beginPath(); ctx.rect(win[0] - 40, 420, win[2] - win[0] + 80, 1100); fs(PAPER, 6);
  // soyabon chiziqli
  ctx.beginPath(); ctx.moveTo(win[0] - 60, 560); ctx.lineTo(win[2] + 60, 560); ctx.lineTo(win[2] + 60, 640);
  for (let k = 0; k < 8; k++) { const a = win[2] + 60 - k * ((win[2] - win[0] + 120) / 8), b2 = a - (win[2] - win[0] + 120) / 8; ctx.quadraticCurveTo((a + b2) / 2, 680, b2, 640); }
  ctx.closePath(); fs(PAPER, 6);
  for (let k = 1; k < 8; k += 2) { const x = win[0] - 60 + k * ((win[2] - win[0] + 120) / 8); ctx.beginPath(); ctx.rect(x, 560, (win[2] - win[0] + 120) / 8, 80); ctx.fillStyle = INK; ctx.globalAlpha = 0.85; ctx.fill(); ctx.globalAlpha = 1; }
  ctx.beginPath(); ctx.rect(win[0], win[1], win[2] - win[0], win[3] - win[1]); fs(PAPER, 10);
}
function glare(win) { ctx.save(); ctx.beginPath(); ctx.rect(win[0], win[1], win[2] - win[0], win[3] - win[1]); ctx.clip(); for (let k = 0; k < 3; k++) line(win[0] + 60 + k * 50, win[3] - 40, win[0] + 260 + k * 50, win[1] + 120, 3); ctx.restore(); }
function rain(gt, amt) {
  if (amt <= 0) return;
  ctx.save(); ctx.globalAlpha = 0.55 * amt; ink(3);
  for (let i = 0; i < 90; i++) { const x = (rnd(i) * (W + 300) + gt * 260) % (W + 300) - 150, y = (rnd(i + 50) * H + gt * 1500 + i * 37) % (H + 200) - 100; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 18, y + 60); ctx.stroke(); }
  ctx.restore();
}
function puddle(x, y, rx, t) {
  ell(x, y, rx, rx * 0.17); ctx.fillStyle = INK; ctx.globalAlpha = 0.12; ctx.fill(); ctx.globalAlpha = 1; st(5);
  for (let k = 0; k < 3; k++) { const p = (t * 0.7 + k / 3) % 1; ell(x - rx * 0.4 + k * rx * 0.4, y, 10 + p * 60, (10 + p * 60) * 0.25); ctx.globalAlpha = 1 - p; st(2); ctx.globalAlpha = 1; }
}
function frameWall(x, y, w, h, gt) {
  for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
    const fx = x + c * (w / 3), fy = y + r * (h / 2); ctx.beginPath(); ctx.rect(fx + 10, fy + 10, w / 3 - 20, h / 2 - 20); fs(PAPER, 5);
    // kichik selfi
    const cx = fx + w / 6, cy = fy + h / 4; circ(cx, cy - 6, 22); st(3); ctx.beginPath(); ctx.arc(cx, cy - 2, 9, 0.2 * Math.PI, 0.8 * Math.PI); st(2.5); circ(cx, cy - 34, 7); st(2.5);
  }
}

// ================= holatlar va kadr =================
const SET = ['A', 'A', 'B', 'C', 'D', 'D', 'D', 'D', 'D', 'E', 'F', 'F'];
function blinkAt(gt) { const p = (gt + 0.9) % 3.4; return p < 0.14 ? 1 - Math.abs(p - 0.07) / 0.07 : 0; }

function drawWorld(b, gt, I) {
  const k = Math.min(11, Math.floor(b)), set = SET[k], w = (a, z) => seg(b, a, z);
  const night = set === 'F';
  INK = night ? NIGHT_INK : DAY_INK; PAPER = night ? NIGHT_PAPER : DAY_PAPER;
  const talkL = I.talk === 'lola' ? Math.abs(Math.sin(gt * 18)) : 0, talkK = I.talk === 'karim' ? Math.abs(Math.sin(gt * 16)) : 0;
  const bl = blinkAt(gt);
  // kamera
  let z = 1, fx = 540, fy = 960;
  if (set === 'A') { z = 1.28 + 0.05 * w(0, 2); fy = 1150; }
  if (set === 'B') { z = 1.25 + 0.06 * w(2, 3); fy = 1120; }
  if (set === 'C') { z = 1.22; fy = 1200; }
  if (set === 'D') { const p5 = eio(w(5, 5.4)); z = 1.18 + 0.17 * p5 - 0.08 * eio(w(8, 8.6)); fx = lerp(560, 650, p5); fy = lerp(1170, 1280, p5); }
  if (set === 'E') { z = 1.2 + 0.1 * eio(w(9, 10)); fy = 1160; }
  if (set === 'F') { z = 1.55 + 0.05 * w(10, 12); fx = 520; fy = 1200; }
  let overlay = null;
  ctx.save(); ctx.translate(540, 960); ctx.scale(z, z); ctx.translate(-fx, -fy);

  if (set === 'A') {
    paper(); ground(1560);
    building(-60, 260, 520, 1300, 3); lamp(110, 1560);
    const win = [560, 700, 1040, 1520]; shopFront(win);
    // Lola holati
    const L = { x: 330, y: 1590, s: 1, flip: 1, turn: 0.5, eyes: 'open', mouth: 'smile', blink: bl, bag: true, t: gt, sway: 8 * Math.sin(gt * 2), lx: 0.6 };
    const pw = w(0, 0.36);
    if (pw < 1) { L.pose = 'walk'; L.x = lerp(-150, 330, eout(pw)); L.ph = gt * 8; L.bob = -10 * Math.abs(Math.sin(gt * 8)); L.skirtSway = 10 * Math.sin(gt * 8); L.armL = { a: 0.3 + 0.2 * Math.sin(gt * 8), e: 0.2 }; L.armR = { a: 0.3 - 0.2 * Math.sin(gt * 8), e: 0.2 }; }
    if (b > 0.4 && b < 0.66) { const p = Math.sin(Math.PI * w(0.4, 0.66)); L.armR = { a: lerp(0.3, 2.65, p), e: lerp(0.2, 2.0, p) }; L.headTilt = 0.12 * p; L.eyes = 'happy'; }
    if (b >= 0.66 && b < 1) { L.armR = { a: 0.55, e: -1.1 }; L.armL = { a: 0.9, e: 2.2 }; L.phone = 'L'; L.headTilt = 0.06 * Math.sin(gt * 2); L.eyes = bl > 0.5 ? 'happy' : 'open'; }
    if (b >= 1) {
      L.phone = null; L.talk = talkL;
      const kiss = w(1.0, 0.35 + 1);
      if (b < 1.45) { const p = Math.sin(Math.PI * w(1.0, 1.45)); L.armR = { a: lerp(0.5, 1.1, p), e: lerp(0.2, 2.5, p) }; L.mouth = 'kiss'; if (b > 1.3) L.armR = { a: 2.0, e: 0.3 }; }
      else L.armR = { a: 0.55, e: -1.1 };
      if (b > 1.35 && b < 1.6) L.eyes = 'wink';
      if (b > 1.55) { L.armL = { a: lerp(0.9, 2.3, eio(w(1.55, 1.7))), e: lerp(2.2, 0.25, eio(w(1.55, 1.7))) }; L.phone = 'L'; L.phoneRot = 0.2; L.mouth = 'kiss'; L.flash = Math.max(0, 1 - Math.abs(b - 1.82) / 0.05); L.eyes = b > 1.78 && b < 1.86 ? 'happy' : 'open'; }
      if (b > 1.25 && b < 1.6) { const hp = w(1.3, 1.6); ctx.save(); ctx.globalAlpha = 1 - hp; heart(470 + hp * 220, 820 - hp * 160, 26 + hp * 10); ctx.fillStyle = RED; ctx.fill(); ctx.restore(); }
    }
    // aks (oynada)
    ctx.save(); ctx.beginPath(); ctx.rect(win[0], win[1], win[2] - win[0], win[3] - win[1]); ctx.clip(); ctx.globalAlpha = 0.33;
    drawLola({ ...L, x: 820, flip: -1, flash: 0 });
    ctx.restore(); glare(win);
    drawLola(L);
  }

  if (set === 'B') {
    paper(); line(-400, 1450, W + 400, 1450, 6);
    frameWall(90, 420, 560, 420, gt);
    // kiyim ilgich
    line(80, 1450, 80, 900, 6); line(80, 900, 420, 900, 6); line(420, 900, 420, 1450, 6);
    for (let i = 0; i < 4; i++) { const x = 130 + i * 80; ctx.beginPath(); ctx.moveTo(x, 900); ctx.quadraticCurveTo(x + 10, 880, x, 870); st(3); ctx.beginPath(); ctx.moveTo(x - 30, 940); ctx.lineTo(x, 905); ctx.lineTo(x + 30, 940); ctx.lineTo(x + 40, 1180); ctx.lineTo(x - 40, 1180); ctx.closePath(); fs(PAPER, 4); }
    // halqa chiroq
    const rl = [880, 900]; line(rl[0], 1450, rl[0], rl[1] + 110, 5); line(rl[0], 1450, rl[0] - 70, 1460, 5); line(rl[0], 1450, rl[0] + 70, 1460, 5);
    ctx.save(); ctx.globalAlpha = 0.25 + 0.15 * Math.sin(gt * 3); circ(rl[0], rl[1], 140); ctx.fillStyle = WARM; ctx.fill(); ctx.restore();
    circ(rl[0], rl[1], 100); st(16); circ(rl[0], rl[1], 100); ctx.strokeStyle = PAPER; ctx.lineWidth = 6; ctx.stroke();
    ctx.beginPath(); ctx.roundRect(rl[0] - 20, rl[1] - 34, 40, 68, 8); fs(INK, 4);
    // kiyim uyumlari
    for (const [x, y, s] of [[160, 1470, 1.1], [980, 1480, 0.9], [380, 1500, 0.7]]) { ctx.beginPath(); ctx.moveTo(x - 140 * s, y); ctx.quadraticCurveTo(x - 90 * s, y - 120 * s, x, y - 90 * s); ctx.quadraticCurveTo(x + 80 * s, y - 140 * s, x + 140 * s, y); ctx.closePath(); fs(PAPER, 5); for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x - 100 * s + k * 50 * s, y - 10); ctx.quadraticCurveTo(x - 80 * s + k * 50 * s, y - 70 * s, x - 40 * s + k * 50 * s, y - 30); st(3); } }
    const L = { x: 560, y: 1500, s: 1, flip: 1, turn: 0, eyes: 'open', mouth: 'smile', blink: bl, t: gt, sway: 6 * Math.sin(gt * 2), lx: 0.5, bag: false };
    // kiyim tanlash
    const p1 = w(2.1, 2.35), p2 = w(2.42, 2.62);
    let dressX = null;
    if (b < 2.62) { L.armR = { a: 1.2, e: 0.9 }; dressX = 'R'; }
    if (b > 2.35 && b < 2.62) { const tp = w(2.35, 2.5); ctx.save(); ctx.translate(lerp(700, -100, tp), lerp(1050, 700, tp) + 400 * tp * tp); ctx.rotate(-tp * 5); hangerDress(0, 0, 0.9, true); ctx.restore(); }
    if (b >= 2.62) { L.armR = { a: 1.0, e: 2.3 }; L.armL = { a: 0.55, e: -1.1 }; L.mouth = 'kiss'; L.turn = 0.4; L.lx = 1; }
    if (b > 2.8) { L.mouth = 'grin'; L.eyes = 'happy'; L.armR = { a: 2.4, e: 0.4 }; }
    const pose = drawLola(L);
    if (dressX && b < 2.35) hangerDress(pose.handR[0] + 10, pose.handR[1] - 30, 0.9, true);
    if (dressX && b >= 2.48 && b < 2.62) hangerDress(pose.handR[0] + 10, pose.handR[1] - 30, 0.9, false);
    // telefon galereyasi
    const gp = w(2.12, 2.24) * (1 - w(2.6, 2.7));
    if (gp > 0) {
      ctx.save(); ctx.translate(300, 620); ctx.scale(back(gp), back(gp)); ctx.rotate(-0.06);
      ctx.beginPath(); ctx.roundRect(-150, -260, 300, 520, 34); fs(PAPER, 8);
      ctx.save(); ctx.beginPath(); ctx.rect(-130, -220, 260, 400); ctx.clip();
      const off = (gt * 260) % 64;
      for (let r = -1; r < 8; r++) for (let c = 0; c < 4; c++) { const x = -126 + c * 64, y = -220 + r * 64 - off; ctx.beginPath(); ctx.rect(x, y, 58, 58); st(2); circ(x + 29, y + 26, 10); st(2); }
      ctx.restore();
      ctx.font = `700 46px ${FONT}`; ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.fillText('12,000', 0, 236);
      ctx.restore();
    }
  }

  if (set === 'C') {
    paper(); const cx = gt * 300;
    for (let i = -1; i < 6; i++) { const bw = 300 + rnd(i + 20) * 120, x = ((i * 380 - cx * 0.6) % 2280 + 2280) % 2280 - 400; building(x, 300 + rnd(i) * 200, bw, 1300, i); }
    ground(1600);
    for (let i = 0; i < 4; i++) lamp(((i * 520 - cx) % 2080 + 2080) % 2080 - 300, 1600);
    for (let i = 0; i < 3; i++) { const x = ((i * 600 - cx * 1.3) % 1800 + 1800) % 1800 - 300; person(x, 1640, 0.95, gt * 7 + i, { walk: true, alpha: 0.3, flip: -1, dress: i === 1, bun: i === 1 }); }
    const ph = gt * 8;
    const L = { x: 540, y: 1660, s: 1.12, flip: 1, turn: 0.2, pose: 'walk', ph, bob: -12 * Math.abs(Math.sin(ph)), skirtSway: 12 * Math.sin(ph), glassesOn: true, eyes: 'open', mouth: talkL > 0 ? 'smile' : 'smile', blink: 0, t: gt, sway: 14 * Math.sin(ph * 0.5), bag: true, headTilt: 0.05 * Math.sin(ph * 0.5) };
    L.armR = { a: 2.05, e: 0.35 }; L.phone = 'R'; L.phoneRot = -0.4;
    L.armL = { a: 0.35 + 0.15 * Math.sin(ph), e: 0.3 };
    L.mouth = (Math.floor(gt * 1.3) % 2) ? 'kiss' : 'grin';
    drawLola(L);
  }

  if (set === 'D') {
    paper('#f1f2f0');
    building(-80, 240, 460, 1300, 11); building(420, 380, 360, 1160, 12); building(800, 260, 420, 1280, 13);
    ground(1560); lamp(980, 1560);
    puddle(700, 1585, 210, gt);
    const ra = 1 - 0.6 * w(8.2, 9);
    // soyabonli o'tkinchilar
    if (b > 4.45 && b < 6) { const p = w(4.45, 5.3); person(lerp(-250, 1300, p), 1520, 0.72, gt * 7, { walk: true, umbrella: true, alpha: 0.7 }); }
    if (b > 4.6 && b < 6) { const p = w(4.6, 5.6); person(lerp(1300, -250, p), 1500, 0.66, gt * 7 + 2, { walk: true, umbrella: true, alpha: 0.6, flip: -1, dress: true }); }
    // Karim
    const K = { x: 760, y: 1580, s: 1.25, flip: -1, pose: 'stand', cane: true, smile: false, bag: 0, talk: talkK };
    const kw = w(4.0, 4.3);
    if (b < 4.3) { K.pose = 'walk'; K.x = lerp(1180, 780, kw); K.ph = gt * 6; }
    let fallen = false;
    if (b >= 4.3 && b < 4.42) { const p = w(4.3, 4.42); K.x = 780; K.rot = lerp(0, 0.9, eio(p)); K.y = 1580 + 10 * p; K.cane = p < 0.3; }
    if (b >= 4.42) fallen = true;
    if (b >= 8.0) { const r = eio(w(8.0, 8.45)); fallen = r < 0.5; if (!fallen) { K.pose = 'stand'; K.dy = 260 * (1 - r) ; K.cane = true; K.bag = 1; K.smile = true; } }
    if (fallen) { K.pose = 'fallen'; K.x = 780; K.y = 1590 + (b < 4.5 ? -20 * Math.sin(Math.PI * w(4.42, 4.5)) : 0); K.cane = false; K.bag = 1; }
    if (fallen && b > 5) { K.armR = { a: lerp(0.6, 2.0, w(5.5, 5.8)), e: 0.2 }; }
    if (b > 7.6 && fallen) K.armR = { a: 2.2, e: 0.1 };
    if (b > 8.5) { K.armL = { a: 1.5, e: 1.1 }; K.smile = true; }
    // tayoq yerda
    if (b > 4.36 && !(b >= 8.2)) { ctx.save(); const p = w(4.36, 4.5); ctx.translate(lerp(840, 980, p), lerp(1380, 1570, p)); ctx.rotate(lerp(0.3, 1.5, p)); line(0, -120, 0, 120, 7); ctx.restore(); }
    // apelsinlar
    for (let i = 0; i < 6; i++) {
      const t0 = 4.4 + i * 0.03, p = w(t0, t0 + 0.32);
      if (b < t0) continue;
      let x = lerp(820, 560 + i * 45 + rnd(i) * 30, eout(p)), y = 1560 - Math.abs(Math.sin(p * Math.PI * 3)) * 60 * (1 - p) + 20 * (i % 2);
      if (b > 7.05 && i < 3) { const g = w(7.05 + i * 0.12, 7.2 + i * 0.12); if (g >= 1) continue; }
      orange(x, y, 15);
    }
    // Lola
    const L = { x: 230, y: 1450, s: 0.62, flip: 1, turn: 0.3, eyes: 'down', mouth: 'smile', blink: bl, t: gt, sway: 6 * Math.sin(gt * 2), bag: true, armR: { a: 1.0, e: 2.3 }, phone: 'R', lx: 0.3, ly: 0.8 };
    if (b > 4.6 && b < 5) { const p = eio(w(4.6, 5)); L.pose = 'walk'; L.ph = gt * 7; L.x = lerp(230, 420, p); L.y = lerp(1450, 1590, p); L.s = lerp(0.62, 1, p); L.bob = -8 * Math.abs(Math.sin(gt * 7)); L.armR = { a: lerp(1.0, 0.4, p), e: lerp(2.3, 0.2, p) }; if (p > 0.5) { L.eyes = 'surprise'; L.ly = 0; L.lx = 1; L.mouth = 'o'; } }
    if (b >= 5) { L.x = 420; L.y = 1590; L.s = 1; L.armR = { a: 0.35, e: -0.15 }; L.armL = { a: 0.35, e: -0.15 }; L.eyes = 'down'; L.ly = 1; L.lx = 0; L.mouth = 'flat'; L.headTilt = 0.1; L.phone = 'R'; L.phoneRot = 1.2; }
    if (b > 5.55 && b < 6) { L.eyes = 'sad'; L.lx = 1; L.ly = 0.3; L.headTilt = -0.05; L.turn = 0.6; }
    if (b >= 6) {
      const kp = eio(w(6.1, 6.38)); L.kneelT = kp; L.x = lerp(420, 560, kp); L.eyes = 'open'; L.lx = 1; L.ly = 0.5; L.turn = 0.6; L.mouth = 'flat'; L.headTilt = 0;
      L.phone = b < 6.3 ? 'R' : null; L.armR = { a: lerp(0.35, 1.0, kp), e: lerp(-0.15, 0.4, kp) }; L.armL = { a: 0.5, e: 0.4 };
      L.mud = 0.75 * eout(w(6.33, 6.5));
      if (b > 6.6) { L.mouth = 'smile'; }
    }
    if (b >= 7) {
      L.kneelT = 1; L.x = 560; L.mud = 0.75; L.talk = talkL; L.eyes = 'open'; L.lx = 1;
      const g = (b - 7) % 1;
      if (b < 7.5) { const p = Math.sin(Math.PI * ((b - 7) / 0.5 * 2 % 1)); L.armR = { a: lerp(0.8, 1.5, p), e: lerp(0.5, 0.0, p) }; L.orangeInHand = p > 0.5; }
      else L.armR = { a: lerp(1.3, 1.55, w(7.5, 7.8)), e: 0.05 };
    }
    if (b >= 8) {
      const r = eio(w(8.0, 8.45)); L.kneelT = 1 - r; L.mud = 0.8; L.talk = 0; L.eyes = b > 8.5 ? 'happy' : 'open'; L.mouth = 'smile';
      L.armR = { a: lerp(1.55, 1.2, r), e: lerp(0.05, 0.7, r) };
    }
    if (b > 6.3) { const p = w(6.3, 6.42); ctx.save(); ctx.translate(lerp(520, 470, p), lerp(1350, 1572, eout(p))); ctx.rotate(lerp(0, 1.57, p)); phone(0, 0, 0, 0); ctx.restore(); }
    drawKarim(K);
    drawLola(L);
    // loy sachrashi
    if (b > 6.32 && b < 6.6) { const p = w(6.32, 6.6); for (let i = 0; i < 16; i++) { const a = -Math.PI * rnd(i + 3), r = 220 * eout(p) * (0.4 + rnd(i)); circ(600 + Math.cos(a) * r, 1570 + Math.sin(a) * r * 0.8 + 300 * p * p, 9 * (1 - p) + 3); ctx.fillStyle = INK; ctx.fill(); } }
    rain(gt, ra);
  }

  if (set === 'E') {
    paper();
    // eshik arkasi
    ctx.beginPath(); ctx.moveTo(300, 1540); ctx.lineTo(300, 760); ctx.quadraticCurveTo(540, 520, 780, 760); ctx.lineTo(780, 1540); fs(PAPER, 10);
    ctx.save(); ctx.globalAlpha = 0.18; ctx.beginPath(); ctx.moveTo(310, 1540); ctx.lineTo(310, 770); ctx.quadraticCurveTo(540, 540, 770, 770); ctx.lineTo(770, 1540); ctx.closePath(); ctx.fillStyle = WARM; ctx.fill(); ctx.restore();
    ground(1540);
    // chiroqlar ipi
    ctx.beginPath(); ctx.moveTo(-40, 360); for (let i = 0; i <= 6; i++) ctx.quadraticCurveTo(i * 190 + 55, 460, i * 190 + 150, 360); st(3);
    for (let i = 0; i < 18; i++) { const x = -20 + i * 64, y = 380 + 40 * Math.sin((i % 3) / 3 * Math.PI); circ(x, y + 18, 12); ctx.fillStyle = (Math.floor(gt * 3) + i) % 3 ? WARM : PAPER; ctx.fill(); st(3); }
    // mehmonlar
    const gx = [[120, 0, true, true], [290, 1, false, false], [820, 2, true, false], [990, 3, false, true]];
    gx.forEach(([x, i, dress, bun]) => { const lk = x < 540 ? 1 : -1; person(x, 1560 + 10 * Math.sin(gt * 2 + i), 0.86, 0, { dress, bun, whisper: (Math.floor(gt * 1.2 + i) % 2) === 0, look: lk, flip: x < 540 ? 1 : -1 }); });
    const L = { x: 540, y: 1580, s: 1.02, flip: 1, turn: 0, eyes: 'down', mouth: 'flat', blink: bl, t: gt, sway: 4 * Math.sin(gt * 2), mud: 0.8, heelsInHand: true, barefoot: true, ly: 1, headTilt: 0.12, armR: { a: 0.45, e: 1.7 }, armL: { a: 0.3, e: 0.1 } };
    const ew = w(9, 9.3); if (ew < 1) { L.pose = 'walk'; L.ph = gt * 6; L.y = lerp(1640, 1580, ew); L.bob = -6 * Math.abs(Math.sin(gt * 6)); }
    if (b > 9.6) { L.eyes = 'sad'; L.lx = -0.6; }
    drawLola(L);
  }

  if (set === 'F') {
    paper();
    // yulduzlar
    for (let i = 0; i < 40; i++) { const x = rnd(i) * W, y = rnd(i + 9) * 700 + 120, tw = 0.5 + 0.5 * Math.sin(gt * 3 + i); ctx.globalAlpha = 0.3 + 0.5 * tw; circ(x, y, 2 + rnd(i + 4) * 2); ctx.fillStyle = INK; ctx.fill(); ctx.globalAlpha = 1; }
    // oyna (orqada) va aks
    const win = [700, 820, 1020, 1300]; ctx.beginPath(); ctx.rect(win[0], win[1], win[2] - win[0], win[3] - win[1]); fs(PAPER, 8);
    // zinapoyalar
    for (let i = 0; i < 4; i++) { const y = 1450 + i * 120; line(-400, y, W + 400, y, 5); line(-400, y + 30, W + 400, y + 30, 2); }
    const L = { x: 470, y: 1450, s: 1, flip: 1, pose: 'sit', turn: 0, eyes: 'down', mouth: 'smile', blink: bl, t: gt, sway: 5 * Math.sin(gt * 1.5), mud: 0.8, barefoot: true, ly: 1, headTilt: 0.12, armR: { a: 0.35, e: 1.95 }, armL: { a: 0.35, e: 1.95 }, phone: 'R', phoneRot: 0.1 };
    const buzz = b < 10.25 ? Math.sin(gt * 60) * 5 * (1 - w(10.05, 10.25)) : 0;
    L.phoneRot = 0.1 + buzz * 0.02;
    if (b > 10.2) { L.eyes = 'surprise'; L.mouth = 'o'; }
    if (b > 10.7) { L.eyes = 'happy'; L.mouth = 'smile'; L.blush = true; }
    if (b > 11.2) { const p = eio(w(11.2, 11.5)); L.headTilt = lerp(0.12, -0.08, p); L.turn = 0.6 * p; L.ly = lerp(1, -0.3, p); L.lx = p; L.eyes = p > 0.5 ? 'open' : 'happy'; L.armR = { a: lerp(0.35, 0.3, p), e: lerp(1.95, 1.0, p) }; L.mouth = 'grin'; }
    ctx.save(); ctx.beginPath(); ctx.rect(win[0], win[1], win[2] - win[0], win[3] - win[1]); ctx.clip(); ctx.globalAlpha = 0.3 + 0.3 * w(11.3, 11.6); drawLola({ ...L, x: 860, y: 1400, s: 0.8, flip: -1, eyes: b > 11.4 ? 'happy' : L.eyes, mouth: 'grin', phone: null }); ctx.restore();
    const pp = drawLola(L);
    overlay = () => {
    // telefon ekrani (katta pufak)
    const bp = w(10.15, 10.3) * (1 - w(11.15, 11.3));
    if (bp > 0) {
      const s = back(bp);
      ctx.save(); ctx.translate(540, 330); ctx.scale(s * 0.68, s * 0.68);
      ctx.beginPath(); ctx.moveTo(-60, 320); ctx.lineTo(-30, 420); ctx.lineTo(20, 330); fs(PAPER, 6);
      ctx.beginPath(); ctx.roundRect(-300, -330, 600, 680, 40); fs(PAPER, 8);
      // kichik rasm: Lola chol bilan
      const sv = INK; ctx.save(); ctx.beginPath(); ctx.rect(-260, -290, 520, 440); ctx.clip();
      ctx.translate(0, 120); ctx.scale(0.32, 0.32); ctx.translate(-660, -1590);
      drawKarim({ x: 780, y: 1590, s: 1, flip: -1, pose: 'fallen', bag: 1, armR: { a: 2.2, e: 0.1 } });
      drawLola({ x: 560, y: 1590, s: 1, flip: 1, pose: 'kneel', turn: 0.6, lx: 1, mud: 0.75, armR: { a: 1.55, e: 0.05 }, armL: { a: 0.5, e: 0.4 }, eyes: 'open', mouth: 'smile', t: gt });
      ctx.restore();
      ctx.beginPath(); ctx.rect(-260, -290, 520, 440); st(4);
      // ko'rishlar soni
      const n = Math.floor(1000000 * eout(w(10.3, 10.95)));
      ctx.font = `700 64px ${FONT}`; ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.fillText(n.toLocaleString('en-US'), 30, 245);
      heart(-200, 225, 34); ctx.fillStyle = RED; ctx.fill();
      ctx.font = `600 34px ${FONT}`; ctx.globalAlpha = 0.7; ctx.fillText('views', 0, 300); ctx.globalAlpha = 1;
      ctx.restore();
    }
    // yuraklar
    if (b > 10.35) { const t0 = I.bt(10.35); for (let i = 0; i < 14; i++) { const p = ((gt - t0) * 0.45 + i / 14) % 1; const x = 540 + Math.sin(p * 6 + i) * 80 + (rnd(i) - 0.5) * 300, y = 1500 - p * 1300; ctx.save(); ctx.globalAlpha = Math.sin(Math.PI * p) * clamp((gt - t0) * 2); heart(x, y, 22 + rnd(i + 2) * 18); ctx.fillStyle = RED; ctx.fill(); ctx.restore(); } }
  }
    };
  ctx.restore();
  if (overlay) overlay();
}
function hangerDress(x, y, s, dots) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.beginPath(); ctx.moveTo(0, -60); ctx.quadraticCurveTo(12, -80, 0, -90); st(4);
  line(-50, -40, 0, -60, 4); line(0, -60, 50, -40, 4);
  ctx.beginPath(); ctx.moveTo(-40, -40); ctx.lineTo(-30, 30); ctx.lineTo(-90, 200); ctx.lineTo(90, 200); ctx.lineTo(30, 30); ctx.lineTo(40, -40); ctx.closePath(); fs(PAPER, 5);
  if (dots) for (let i = 0; i < 10; i++) { circ(-60 + rnd(i) * 120, 40 + rnd(i + 5) * 150, 7); ctx.fillStyle = INK; ctx.fill(); }
  else for (let k = 0; k < 4; k++) line(-70 + k * 46, 200, -24 + k * 16, 30, 6);
  ctx.restore();
}

// I: { b, gt, talk: 'lola'|'karim'|null, bt(beat)->sek, total, font }
export function drawFilm(context, I) {
  ctx = context; FONT = I.font || FONT;
  const b = I.b, gt = I.gt, k = Math.min(11, Math.floor(b));
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H);
  // joy almashganda: yangi sahifa o'ngdan suriladi
  const t0 = I.bt(k), dt = gt - t0;
  const changed = k > 0 && SET[k] !== SET[k - 1];
  if (changed && dt < 0.45) {
    const p = eio(clamp(dt / 0.45));
    drawWorld(k - 0.0001, t0, I);
    ctx.save(); ctx.beginPath(); ctx.rect(W * (1 - p), 0, W * p + 2, H); ctx.clip(); ctx.translate(W * (1 - p) * 0.15, 0);
    drawWorld(b, gt, I); ctx.restore();
    ctx.fillStyle = '#17171b'; ctx.fillRect(W * (1 - p) - 6, 0, 12, H);
  } else drawWorld(b, gt, I);
  // boshi/oxiri: diafragma
  const tEnd = I.total;
  const iris = gt < 0.45 ? eout(seg(gt, 0, 0.45)) : gt > tEnd - 0.9 ? 1 - eio(seg(gt, tEnd - 0.9, tEnd)) : 1;
  if (iris < 1) { ctx.save(); ctx.fillStyle = '#0d0e12'; ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(540, 1000, Math.max(0, iris * 1400), 0, Math.PI * 2, true); ctx.fill('evenodd'); ctx.restore(); }
}
