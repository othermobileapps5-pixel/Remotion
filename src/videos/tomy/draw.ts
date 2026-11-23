// @ts-nocheck
// Tomy the Robot — 2D multfilm, Canvas2D. Hamma narsa "b" (beat) vaqtidan:
// b = sahna raqami + sahna ichidagi ulush (0..1). Sahnalar ro'yxati: videos/tomy-robot.json.
// Bu fayl oddiy JS sintaksisida (lokal sinov uchun ham ishlatiladi).

const W = 1080, H = 1920, GROUND = 1450, OUT = '#1d2b3a';
let ctx = null;
let FONT = 'sans-serif';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, p) => a + (b - a) * p;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const eio = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
const eout = (p) => 1 - Math.pow(1 - p, 3);
const back = (p) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
const elastic = (p) => (p === 0 ? 0 : p === 1 ? 1 : Math.pow(2, -10 * p) * Math.sin((p * 10 - 0.75) * (2 * Math.PI) / 3) + 1);
function hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
function mix(a, b, p) { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], p)).toString(16).padStart(2, '0')).join(''); }
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function fillStroke(f, lw = 8, s = OUT) { ctx.fillStyle = f; ctx.fill(); if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = s; ctx.lineJoin = 'round'; ctx.stroke(); } }
function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); }
function rnd(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
function star(x, y, r, rot) { ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = rot + i * Math.PI / 4, r2 = i % 2 ? r * 0.38 : r; ctx.lineTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2); } ctx.closePath(); }
function heart(x, y, s) { ctx.beginPath(); ctx.moveTo(x, y + s * 0.35); ctx.bezierCurveTo(x - s * 1.1, y - s * 0.35, x - s * 0.45, y - s * 1.05, x, y - s * 0.45); ctx.bezierCurveTo(x + s * 0.45, y - s * 1.05, x + s * 1.1, y - s * 0.35, x, y + s * 0.35); ctx.closePath(); }

const TOMY_S = 1.32, FLOWER_X = 1740, FLOWER_S = 1.3;

// ---------- holatlar ----------
function tomyState(b, gt, I) {
  const w = (a, z) => seg(b, a, z);
  const st = { s: TOMY_S, sq: 0.015 * Math.sin(gt * 4), tilt: 0, blink: 0, look: 0, lookY: 0, eyes: 'open', mouth: 'smile', mouthOpen: 0,
    screen: 1, armL: 0.25 + 0.05 * Math.sin(gt * 2), armR: 0.25 + 0.05 * Math.sin(gt * 2 + 1), hatch: 0, glow: 1, cheek: 0 };
  // blink: har ~3 sekundda
  const bp = (gt + 0.7) % 3.1; if (bp < 0.14) st.blink = 1 - Math.abs(bp - 0.07) / 0.07;
  let x = 540 + 460 * eio(w(2.1, 2.9)) + 300 * eio(w(3.0, 3.35));
  let y = GROUND;
  // 0: uxlab yotibdi
  if (b < 1) { st.screen = 0; st.glow = 0; st.sq = 0.02 * Math.sin(gt * 2.5); }
  else if (b < 1.15) { const p = w(1, 1.15); st.screen = (Math.sin(gt * 90) > 0 ? 1 : 0.25) * (0.4 + 0.6 * p); st.glow = st.screen; }
  // 1: sakrash va qo'l silkitish
  if (b > 1.12 && b < 1.18) st.sq = 0.12 * Math.sin(Math.PI * w(1.12, 1.18));
  if (b > 1.18 && b < 1.36) { const q = Math.sin(Math.PI * w(1.18, 1.36)); y -= 150 * q; st.sq = -0.06 * q; st.armL = st.armR = lerp(0.25, 2.6, q); }
  if (b >= 1.36 && b < 1.5) { const p = w(1.36, 1.5); st.sq = 0.14 * Math.exp(-p * 5) * Math.cos(p * 14); }
  if (b > 1.4 && b < 2.05) { const p = Math.min(w(1.4, 1.5), 1 - w(1.92, 2.05)); st.armR = lerp(st.armR, 2.5 + 0.35 * Math.sin(gt * 13), p); st.eyes = 'happy'; st.cheek = p; }
  // 2-3: yurish
  const roll = (a, z, amp) => { if (b > a && b < z) { const p = w(a, z); st.tilt = amp * Math.sin(Math.PI * p); st.sq = 0.02 * Math.sin(gt * 30); return Math.sin(Math.PI * p); } return 0; };
  const r1 = roll(2.1, 2.9, 0.1) + roll(3.0, 3.35, 0.07);
  if (r1 > 0) st.armL = st.armR = lerp(0.25, -0.35, r1);
  // 3: qushga va bulutga qo'l silkitish
  if (b > 3.3 && b < 3.62) { const p = Math.min(w(3.3, 3.38), 1 - w(3.55, 3.62)); st.armR = lerp(st.armR, 2.5 + 0.35 * Math.sin(gt * 13), p); st.look = 0.8 * p; st.lookY = -p; st.eyes = 'happy'; st.cheek = p; }
  if (b > 3.6 && b < 3.98) { const p = Math.min(w(3.6, 3.68), 1 - w(3.9, 3.98)); st.armL = lerp(st.armL, 2.5 + 0.35 * Math.sin(gt * 13 + 1), p); st.look = -0.8 * p; st.lookY = -p; st.eyes = 'happy'; st.cheek = p; }
  // 4: issiq, gulni ko'radi
  if (b > 4 && b < 4.6) { st.eyes = 'squint'; st.mouth = 'flat'; st.armL = 0.1; st.armR = 0.1; }
  if (b > 4.6 && b < 4.8) { st.mouth = 'o'; st.sq = -0.05 * Math.sin(Math.PI * w(4.6, 4.8)); st.look = 0.8; }
  if (b > 4.8 && b < 7) { st.eyes = 'sad'; st.mouth = 'sad'; st.look = 0.7; st.armL = st.armR = 0.1; st.tilt = 0.05 * Math.sin(Math.PI * w(4.8, 7)); }
  // 7: ishonch bilan — boshini ko'rsatadi
  if (b > 7 && b < 8) { const p = Math.min(w(7, 7.12), 1 - w(7.88, 8)); st.armR = lerp(st.armR, 2.25 + 0.1 * Math.sin(gt * 6), p); st.armL = lerp(st.armL, -0.2, p); st.tilt = -0.06 * p; st.eyes = 'happy'; st.mouth = 'grin'; st.cheek = p; }
  // 8-10: boshidagi qopqoq
  st.hatch = w(8.0, 8.07) * (1 - w(10.85, 10.95));
  if (b > 8.07 && b < 10.85) st.lookY = -1;
  if ((b > 8.1 && b < 8.25) || (b > 9.05 && b < 9.2)) st.mouth = 'o';
  if ((b > 8.25 && b < 8.7) || (b > 9.2 && b < 9.72)) { st.eyes = 'squint'; st.mouth = 'flat'; }
  if (b > 8.68 && b < 8.92) { const p = Math.sin(Math.PI * w(8.68, 8.92)); st.armL = lerp(0.25, 2.9, p); st.tilt = -0.08 * p; }
  if (b > 9.72 && b < 9.96) { const p = Math.sin(Math.PI * w(9.72, 9.96)); st.armR = lerp(0.25, 2.9, p); st.tilt = 0.08 * p; }
  if (b > 10.0 && b < 10.6) { st.eyes = 'happy'; st.mouth = 'grin'; st.cheek = 1; st.glow = 1 + 1.5 * Math.max(0, Math.sin(gt * 20)); }
  if (b > 10.02 && b < 10.18) { const q = Math.sin(Math.PI * w(10.02, 10.18)); st.sq = -0.08 * q; y -= 60 * q; }
  // suv idishini ushlab turish (10.5 — 15.2)
  if (b > 10.5 && b < 15.25) { const p = w(10.5, 10.75) * (1 - w(15.0, 15.2)); st.armR = lerp(st.armR, 1.55, p); if (b > 10.75) st.look = 0.6; }
  if (b > 11 && b < 12.7) { st.eyes = 'happy'; st.cheek = 1; st.mouth = 'smile'; }
  if (b > 12.2 && b < 12.7) { st.eyes = 'open'; st.mouth = 'o'; }
  if (b > 12.7) { st.eyes = 'happy'; st.mouth = 'grin'; st.cheek = 1; st.look = 0.5; }
  if (b > 15.2 && b < 16) { const p = Math.min(w(15.2, 15.3), 1 - w(15.9, 16)); st.armR = lerp(st.armR, 2.5 + 0.35 * Math.sin(gt * 13), p); }
  // 16: raqs
  if (b > 16.05) { const d = gt - I.danceT0, a = Math.min(1, Math.max(0, d) / 0.4); x -= 70 * eio(w(16.05, 16.2)); x += a * 35 * Math.sin(d * Math.PI * 2);
    y -= a * 40 * Math.abs(Math.sin(d * Math.PI * 2)); st.tilt = a * 0.12 * Math.sin(d * Math.PI * 2); st.sq = a * 0.05 * Math.cos(d * Math.PI * 4);
    st.armL = lerp(st.armL, 2.5 + 0.4 * Math.sin(d * Math.PI * 4), a); st.armR = lerp(st.armR, 2.5 + 0.4 * Math.sin(d * Math.PI * 4 + Math.PI), a); st.look = 0; }
  if (I.talk === 'tomy') { st.mouthOpen = Math.abs(Math.sin(gt * 19)); }
  if (b < 1) st.mouthOpen = 0;
  st.x = x; st.y = y; st.wheel = x / 40;
  return st;
}

function flowerState(b, gt, I) {
  const f = { wilt: 1, grow: 1, happy: 0, sway: 0, talk: 0 };
  f.wilt = 1 - elastic(seg(b, 12.25, 12.75));
  f.grow = 1 + 0.35 * back(seg(b, 12.7, 12.9));
  f.happy = seg(b, 12.72, 12.78);
  f.sway = 0.04 * Math.sin(gt * 2);
  if (b > 6 && b < 7) f.sway += 0.06 * Math.sin(Math.PI * seg(b, 6, 7));
  if (b > 14 && b < 15) f.sway -= 0.12 * Math.sin(Math.PI * seg(b, 14, 15));
  if (b > 16.05) { const d = gt - I.danceT0; f.sway += 0.18 * Math.sin(d * Math.PI * 2 + Math.PI) * Math.min(1, Math.max(0, d) / 0.4); }
  if (I.talk === 'flower') f.talk = Math.abs(Math.sin(gt * 17));
  return f;
}

// ---------- fon ----------
function hotOf(b) { return seg(b, 4.0, 4.4) * (1 - seg(b, 12.2, 12.8)); }
function sky(b, gt) {
  const day = seg(b, 1.0, 1.6), hot = hotOf(b);
  const top = mix(mix('#ffadc8', '#59bdfc', day), '#ffb84d', hot);
  const bot = mix(mix('#ffe6b5', '#d9f4ff', day), '#fff0bf', hot);
  const g = ctx.createLinearGradient(0, 0, 0, GROUND); g.addColorStop(0, top); g.addColorStop(1, bot);
  ctx.fillStyle = g; ctx.fillRect(-500, -500, W + 1000, GROUND + 600);
  const sy = lerp(1250, 330, eout(seg(b, 0.85, 1.5))), sr = lerp(105, 150, hot), sx = 850;
  ctx.save(); ctx.translate(sx, sy); ctx.rotate(gt * 0.4);
  ctx.fillStyle = mix('#ffe066', '#ff8c1a', hot); ctx.globalAlpha = 0.55;
  for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.beginPath(); ctx.moveTo(-18, sr + 18); ctx.lineTo(0, sr + 60 + hot * 35 + 8 * Math.sin(gt * 6 + i)); ctx.lineTo(18, sr + 18); ctx.fill(); }
  ctx.restore(); ctx.globalAlpha = 1;
  circle(sx, sy, sr); fillStroke(mix('#ffe066', '#ffa21a', hot), 7);
  ctx.strokeStyle = OUT; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(sx - 38, sy - 10, 14, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  ctx.beginPath(); ctx.arc(sx + 38, sy - 10, 14, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  ctx.beginPath(); ctx.arc(sx, sy + 20, 26, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  if (hot > 0.3) { ctx.globalAlpha = hot; ctx.fillStyle = '#7fd3ff'; ctx.beginPath(); const dx = sx + sr * 0.75, dy = sy - sr * 0.2 + ((gt * 60) % 40); ctx.moveTo(dx, dy - 26); ctx.quadraticCurveTo(dx + 16, dy, dx, dy + 10); ctx.quadraticCurveTo(dx - 16, dy, dx, dy - 26); ctx.fill(); ctx.globalAlpha = 1; }
}
function cloud(x, y, s, face) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.beginPath();
  ctx.arc(-70, 10, 50, 0, 7); ctx.arc(-10, -20, 70, 0, 7); ctx.arc(60, 5, 55, 0, 7); ctx.arc(0, 30, 55, 0, 7);
  ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fill();
  if (face > 0) { ctx.globalAlpha = face; ctx.strokeStyle = OUT; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(-25, 5, 10, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); ctx.beginPath(); ctx.arc(25, 5, 10, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 22, 14, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
  ctx.restore();
}
function bird(x, y, s, flap) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.beginPath(); ctx.ellipse(0, 0, 38, 26, 0, 0, 7); fillStroke('#ff7b54', 6);
  const f = Math.sin(flap) * 30;
  ctx.beginPath(); ctx.moveTo(-5, -5); ctx.quadraticCurveTo(-25, -30 - f, -45, -10 - f); ctx.quadraticCurveTo(-20, 5, -5, 5); fillStroke('#ffb38a', 5);
  ctx.beginPath(); ctx.moveTo(34, -4); ctx.lineTo(54, 2); ctx.lineTo(34, 8); fillStroke('#ffd166', 4);
  circle(18, -8, 5); ctx.fillStyle = OUT; ctx.fill();
  ctx.restore();
}
function background(b, gt, cx) {
  sky(b, gt);
  const wave = seg(b, 3.6, 3.7) * (1 - seg(b, 4.0, 4.1));
  for (let i = 0; i < 5; i++) { const x = ((i * 430 + gt * 25 - cx * 0.15) % (W + 700) + W + 700) % (W + 700) - 350; cloud(x, 180 + rnd(i) * 420, 0.7 + rnd(i + 9) * 0.6, x > 0 && x < 500 ? wave : 0); }
  const hot = hotOf(b);
  ctx.fillStyle = mix('#8fd694', '#b9c96b', hot);
  ctx.beginPath(); ctx.moveTo(-100, GROUND);
  for (let x = -100; x <= W + 100; x += 20) { const wx = x + cx * 0.3; ctx.lineTo(x, GROUND - 170 - 70 * Math.sin(wx / 260) - 40 * Math.sin(wx / 97)); }
  ctx.lineTo(W + 100, GROUND + 50); ctx.lineTo(-100, GROUND + 50); ctx.fill();
  ctx.fillStyle = mix('#5cc46b', '#9db34f', hot);
  ctx.beginPath(); ctx.moveTo(-100, GROUND);
  for (let x = -100; x <= W + 100; x += 20) { const wx = x + cx * 0.6; ctx.lineTo(x, GROUND - 70 - 45 * Math.sin(wx / 190 + 1) - 20 * Math.sin(wx / 71)); }
  ctx.lineTo(W + 100, GROUND + 50); ctx.lineTo(-100, GROUND + 50); ctx.fill();
  const g = ctx.createLinearGradient(0, GROUND, 0, H); g.addColorStop(0, mix('#4cb85c', '#8fa843', hot)); g.addColorStop(1, mix('#2f8f45', '#6d8434', hot));
  ctx.fillStyle = g; ctx.fillRect(-500, GROUND, W + 1000, H + 400);
  ctx.strokeStyle = OUT; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-500, GROUND); ctx.lineTo(W + 500, GROUND); ctx.stroke();
  for (let i = 0; i < 40; i++) { const wx = i * 140 + rnd(i) * 80; const x = wx - cx; if (x < -120 || x > W + 120) continue; const y = GROUND + 30 + rnd(i + 3) * 380;
    if (i % 3 === 0) { ctx.fillStyle = '#d7dce3'; ctx.beginPath(); ctx.ellipse(x, y, 22, 12, 0, 0, 7); ctx.fill(); }
    else { ctx.strokeStyle = mix('#2c7a3b', '#5c6d27', hot); ctx.lineWidth = 6; ctx.lineCap = 'round';
      for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(x + k * 10, y); ctx.quadraticCurveTo(x + k * 16, y - 20, x + k * 24, y - 34); ctx.stroke(); } }
    if (i % 5 === 1) { const c = ['#ffd166', '#ff8fab', '#ffffff', '#a0c4ff'][i % 4]; for (let p = 0; p < 5; p++) { circle(x + 30 + Math.cos(p * 1.256) * 9, y - 40 + Math.sin(p * 1.256) * 9, 7); ctx.fillStyle = c; ctx.fill(); } circle(x + 30, y - 40, 5); ctx.fillStyle = '#f4a261'; ctx.fill(); }
  }
}

// ---------- Tomy ----------
function drawTomy(o, gt) {
  ctx.save(); ctx.translate(o.x, o.y);
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); const lift = GROUND - o.y; ctx.ellipse(0, GROUND - o.y, 150 * o.s * (1 - lift / 600), 22 * o.s, 0, 0, 7); ctx.fill();
  ctx.scale(o.s, o.s); ctx.rotate(o.tilt); ctx.scale(1 + o.sq, 1 - o.sq);
  rr(-115, -62, 230, 62, 31); fillStroke('#2d3748');
  for (const wx of [-62, 0, 62]) { circle(wx, -31, 19); fillStroke('#a0aec0', 5);
    ctx.save(); ctx.translate(wx, -31); ctx.rotate(o.wheel); ctx.strokeStyle = OUT; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(12, 0); ctx.moveTo(0, -12); ctx.lineTo(0, 12); ctx.stroke(); ctx.restore(); }
  const arm = (side, a) => { const sx = side * 112, sy = -205, dx = side * Math.sin(a), dy = Math.cos(a), ex = sx + dx * 112, ey = sy + dy * 112;
    ctx.lineCap = 'round'; ctx.strokeStyle = OUT; ctx.lineWidth = 36; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.strokeStyle = '#f6ad55'; ctx.lineWidth = 21; ctx.stroke();
    circle(ex, ey, 27); fillStroke('#f6ad55', 7); circle(ex - side * 6, ey - 6, 8); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fill(); };
  arm(-1, o.armL); arm(1, o.armR);
  rr(-122, -255, 244, 200, 52); fillStroke('#3fc7c0');
  rr(-100, -238, 60, 120, 30); ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fill();
  circle(0, -152, 46); fillStroke('#fff4d6', 7);
  const hb = 1 + 0.1 * Math.max(0, Math.sin(gt * 7));
  ctx.save(); ctx.translate(0, -148); ctx.scale(hb, hb); heart(0, 0, 28); ctx.fillStyle = '#ff4d6d'; ctx.shadowColor = '#ff4d6d'; ctx.shadowBlur = 20 * o.screen; ctx.fill(); ctx.restore();
  rr(-32, -282, 64, 34, 10); fillStroke('#94a3b8', 6);
  for (const s of [-1, 1]) { circle(s * 152, -376, 30); fillStroke('#f6ad55', 7); }
  ctx.strokeStyle = OUT; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(92, -478); ctx.quadraticCurveTo(110, -520, 104, -560); ctx.stroke();
  const gl = clamp(o.glow, 0, 2.5);
  ctx.save(); ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 30 * gl; circle(104, -574, 20); fillStroke(gl > 1.2 ? '#fff3a3' : mix('#9b5a5a', '#ff5a5f', clamp(gl)), 7); ctx.restore();
  ctx.save(); ctx.translate(-62, -480); ctx.rotate(-o.hatch * 2.0); rr(0, -16, 124, 22, 10); fillStroke('#f6ad55', 7); ctx.restore();
  if (o.hatch > 0.05) { rr(-55, -486, 110, 14, 7); ctx.fillStyle = '#0f1e33'; ctx.fill(); }
  rr(-152, -482, 304, 212, 62); fillStroke('#3fc7c0');
  rr(-130, -470, 70, 40, 20); ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fill();
  rr(-120, -457, 240, 164, 42); fillStroke('#0f1e33', 6);
  ctx.save(); rr(-120, -457, 240, 164, 42); ctx.clip();
  const on = o.screen, ec = '#5ef2ff';
  if (on < 0.05) {
    ctx.strokeStyle = 'rgba(94,242,255,.28)'; ctx.lineWidth = 8; ctx.lineCap = 'round';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * 52, -392, 18, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
  } else {
    ctx.globalAlpha = on; ctx.shadowColor = ec; ctx.shadowBlur = 22; ctx.fillStyle = ec; ctx.strokeStyle = ec; ctx.lineCap = 'round';
    const lx = o.look * 16, ly = o.lookY * 14;
    for (const s of [-1, 1]) { const ex = s * 52 + lx, ey = -388 + ly;
      if (o.eyes === 'happy') { ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(ex, ey + 12, 22, 1.1 * Math.PI, 1.9 * Math.PI); ctx.stroke(); }
      else if (o.eyes === 'squint') { ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(ex - 20, ey); ctx.lineTo(ex + 20, ey); ctx.stroke();
        ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(ex - 22, ey - 34 + (s < 0 ? 8 : -4)); ctx.lineTo(ex + 22, ey - 34 + (s < 0 ? -4 : 8)); ctx.stroke(); }
      else { const h = Math.max(7, 70 * (1 - o.blink)); rr(ex - 23, ey - h / 2, 46, h, 23); ctx.fill();
        if (h > 30) { ctx.save(); ctx.shadowBlur = 0; ctx.fillStyle = '#e8fdff'; circle(ex + 8, ey - 14, 8); ctx.fill(); ctx.restore(); }
        if (o.eyes === 'sad') { ctx.save(); ctx.shadowBlur = 0; ctx.fillStyle = '#0f1e33'; ctx.beginPath(); ctx.moveTo(ex - 30, ey - 40); ctx.lineTo(ex + 30, ey - 40); ctx.lineTo(s < 0 ? ex - 30 : ex + 30, ey - 12); ctx.closePath(); ctx.fill(); ctx.restore(); } }
    }
    const mx = lx * 0.6, my = -330; ctx.lineWidth = 10;
    if (o.mouthOpen > 0.05) { ctx.beginPath(); ctx.ellipse(mx, my, 24, 6 + 16 * o.mouthOpen, 0, 0, 7); ctx.fill(); }
    else if (o.mouth === 'smile') { ctx.beginPath(); ctx.arc(mx, my - 18, 26, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke(); }
    else if (o.mouth === 'grin') { ctx.beginPath(); ctx.moveTo(mx - 34, my - 10); ctx.quadraticCurveTo(mx, my + 40, mx + 34, my - 10); ctx.closePath(); ctx.fill(); }
    else if (o.mouth === 'sad') { ctx.beginPath(); ctx.arc(mx, my + 18, 24, 1.2 * Math.PI, 1.8 * Math.PI); ctx.stroke(); }
    else if (o.mouth === 'o') { ctx.lineWidth = 9; circle(mx, my, 15); ctx.stroke(); }
    else if (o.mouth === 'flat') { ctx.beginPath(); ctx.moveTo(mx - 20, my); ctx.lineTo(mx + 20, my + 4); ctx.stroke(); }
    if (o.cheek > 0) { ctx.shadowBlur = 0; ctx.globalAlpha = on * 0.55 * o.cheek; ctx.fillStyle = '#ff7aa2'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * 88 + lx, -340, 16, 9, 0, 0, 7); ctx.fill(); } }
  }
  ctx.restore();
  ctx.save(); ctx.globalAlpha = 0.12; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(40, -457); ctx.lineTo(90, -457); ctx.lineTo(10, -293); ctx.lineTo(-40, -293); ctx.closePath(); ctx.fill(); ctx.restore();
  ctx.restore();
}
function tomyLocalToScreen(o, lx, ly) { return [o.x + o.s * lx, o.y + o.s * ly]; }
function handPos(o, side) { const a = side < 0 ? o.armL : o.armR; const lx = side * 112 + side * Math.sin(a) * 112, ly = -205 + Math.cos(a) * 112; return tomyLocalToScreen(o, lx * (1 + o.sq), ly * (1 - o.sq)); }

// ---------- gul ----------
function drawFlower(x, y, f, s = FLOWER_S) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s * f.grow, s * f.grow); ctx.rotate(f.sway);
  const w = f.wilt, hx = lerp(0, 80, w), hy = lerp(-300, -165, w);
  ctx.lineCap = 'round'; ctx.strokeStyle = OUT; ctx.lineWidth = 20; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(lerp(-10, 10, w), lerp(-160, -210, w), hx, hy); ctx.stroke();
  ctx.strokeStyle = mix('#43aa5a', '#8a8a3c', w); ctx.lineWidth = 11; ctx.stroke();
  for (const s2 of [-1, 1]) { ctx.save(); ctx.translate(s2 * 4, -90 - s2 * 25); ctx.rotate(s2 * lerp(-0.6, 0.3, w) + (s2 < 0 ? Math.PI : 0));
    ctx.beginPath(); ctx.ellipse(38, 0, 40, 17, 0, 0, 7); fillStroke(mix('#5cc46b', '#9a9a46', w), 6); ctx.restore(); }
  ctx.translate(hx, hy); ctx.rotate(lerp(0, 1.9, w));
  const pc = mix('#ff6fa8', '#a8875f', w);
  for (let i = 0; i < 8; i++) { ctx.save(); ctx.rotate(i * Math.PI / 4 + 0.2); ctx.beginPath(); ctx.ellipse(0, -50, 24, 36 * (1 - 0.25 * w), 0, 0, 7); fillStroke(pc, 6); ctx.restore(); }
  circle(0, 0, 36); fillStroke(mix('#ffd166', '#a68a64', w), 6);
  ctx.strokeStyle = OUT; ctx.fillStyle = OUT; ctx.lineWidth = 5;
  if (f.happy > 0.5) { for (const s2 of [-1, 1]) { ctx.beginPath(); ctx.arc(s2 * 12, -4, 7, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
    if (f.talk > 0.05) { ctx.beginPath(); ctx.ellipse(0, 12, 8, 3 + 7 * f.talk, 0, 0, 7); ctx.fill(); }
    else { ctx.beginPath(); ctx.arc(0, 6, 11, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
    ctx.globalAlpha = 0.6; ctx.fillStyle = '#ff7aa2'; for (const s2 of [-1, 1]) { circle(s2 * 22, 8, 6); ctx.fill(); } ctx.globalAlpha = 1; }
  else { for (const s2 of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s2 * 18, -6); ctx.lineTo(s2 * 6, -2); ctx.stroke(); }
    if (f.talk > 0.05) { ctx.beginPath(); ctx.ellipse(0, 16, 6, 2 + 5 * f.talk, 0, 0, 7); ctx.fill(); }
    else { ctx.beginPath(); ctx.arc(0, 18, 8, 1.15 * Math.PI, 1.85 * Math.PI); ctx.stroke(); } }
  ctx.restore();
  ctx.fillStyle = '#7a4f2d'; ctx.beginPath(); ctx.ellipse(x, y + 4, 70, 18, 0, Math.PI, 0); ctx.fill();
}
function flowerHead(x, y, f, s = FLOWER_S) { const w = f.wilt; const k = s * f.grow; const hx = lerp(0, 80, w), hy = lerp(-300, -165, w);
  const c = Math.cos(f.sway), sn = Math.sin(f.sway); return [x + k * (hx * c - hy * sn), y + k * (hx * sn + hy * c)]; }

// ---------- buyumlar ----------
function umbrella(x, y, rot, open) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.strokeStyle = OUT; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, 110); ctx.arc(-18, 110, 18, 0, Math.PI); ctx.stroke();
  const r = lerp(25, 120, open), hgt = lerp(80, 70, open);
  ctx.beginPath(); ctx.moveTo(-r, 0); ctx.quadraticCurveTo(-r * 0.9, -hgt * 1.1, 0, -hgt); ctx.quadraticCurveTo(r * 0.9, -hgt * 1.1, r, 0);
  for (let i = 0; i < 4; i++) { const a = r - i * r / 2, bb = a - r / 2; ctx.quadraticCurveTo((a + bb) / 2, -24, bb, 0); } ctx.closePath(); fillStroke('#ff4d4d', 7);
  ctx.save(); ctx.clip(); ctx.fillStyle = '#fff'; for (let i = 0; i < 2; i++) ctx.fillRect(-r / 2 + i * r / 1.3 - r * 0.6 + r * 0.35, -hgt - 10, r / 4, hgt + 10); ctx.restore();
  ctx.restore(); }
function duck(x, y, rot, sc) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc);
  ctx.beginPath(); ctx.ellipse(0, 20, 70, 44, 0, 0, 7); fillStroke('#ffd60a', 7);
  circle(-28, -34, 36); fillStroke('#ffd60a', 7);
  ctx.beginPath(); ctx.moveTo(-60, -34); ctx.quadraticCurveTo(-92, -36, -96, -24); ctx.quadraticCurveTo(-80, -16, -58, -22); fillStroke('#ff8c1a', 6);
  circle(-38, -44, 7); ctx.fillStyle = OUT; ctx.fill();
  ctx.beginPath(); ctx.ellipse(18, 14, 30, 16, -0.3, 0, 7); fillStroke('#ffc300', 6);
  ctx.restore(); }
function wateringCan(x, y, rot, sc = 1) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc);
  ctx.beginPath(); ctx.moveTo(40, 10); ctx.lineTo(118, -46); ctx.lineTo(126, -36); ctx.lineTo(48, 30); ctx.closePath(); fillStroke('#4dabf7', 7);
  rr(112, -56, 26, 22, 6); fillStroke('#4dabf7', 6);
  ctx.strokeStyle = OUT; ctx.lineWidth = 20; ctx.beginPath(); ctx.arc(-20, -34, 46, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
  ctx.strokeStyle = '#339af0'; ctx.lineWidth = 9; ctx.stroke();
  rr(-60, -30, 105, 90, 20); fillStroke('#4dabf7', 7);
  rr(-46, -16, 22, 58, 11); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fill();
  ctx.restore(); }
const SPOUT = [126, -46];
function canTip(x, y, rot, sc = 1) { const c = Math.cos(rot), s = Math.sin(rot); return [x + sc * (SPOUT[0] * c - SPOUT[1] * s), y + sc * (SPOUT[0] * s + SPOUT[1] * c)]; }
function sparkles(cx, cy, p, n = 10, R = 160, col = '#fff3a3') { if (p <= 0 || p >= 1) return;
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + rnd(i) * 0.5, r = R * eout(p) * (0.6 + 0.5 * rnd(i + 5)); ctx.save(); ctx.globalAlpha = 1 - p; star(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 22 * (1 - p * 0.5), p * 3); ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 15; ctx.fill(); ctx.restore(); } }

function bouncyText(str, x, y, size, gt, t0, colors, out = 0) {
  ctx.save(); ctx.font = `700 ${size}px ${FONT}`; ctx.textBaseline = 'alphabetic';
  const chars = [...str]; const ws = chars.map((c) => ctx.measureText(c).width); const total = ws.reduce((a, b) => a + b, 0); let px = x - total / 2;
  chars.forEach((c, i) => { const p = back(seg(gt, t0 + i * 0.07, t0 + i * 0.07 + 0.4)); if (p > 0) { const yy = y - (1 - p) * 300 - out * 900 + Math.sin(gt * 5 + i) * 8;
    ctx.save(); ctx.translate(px + ws[i] / 2, yy); ctx.scale(p, p); ctx.rotate(Math.sin(gt * 4 + i) * 0.06);
    ctx.lineWidth = size * 0.16; ctx.strokeStyle = OUT; ctx.lineJoin = 'round'; ctx.strokeText(c, -ws[i] / 2, 0);
    ctx.fillStyle = colors[i % colors.length]; ctx.fillText(c, -ws[i] / 2, 0); ctx.restore(); }
    px += ws[i]; });
  ctx.restore();
}

// ---------- kadr ----------
// I: { b, gt (global sekund), talk: 'tomy'|'flower'|null, bt: (beat)=>global sekund, font }
export function drawFilm(context, I) {
  ctx = context; FONT = I.font || FONT;
  const b = I.b, gt = I.gt;
  I.danceT0 = I.bt(16.05);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H);
  const o = tomyState(b, gt, I); const f = flowerState(b, gt, I);
  const cx = Math.max(0, (540 + 460 * eio(seg(b, 2.1, 2.9)) + 300 * eio(seg(b, 3.0, 3.35))) - 380);
  const zIn = eio(seg(b, 7.0, 7.3)) * (1 - eio(seg(b, 10.7, 11.0)));
  const zEnd = eio(seg(b, 16.0, 16.25));
  const z = 1 + 0.14 * zIn - 0.1 * zEnd, fx = lerp(540, 470, zIn), fy = lerp(960, 900, zIn) + 60 * zEnd;
  ctx.save(); ctx.translate(540, 960); ctx.scale(z, z); ctx.translate(-fx, -fy);
  background(b, gt, cx);
  // qush (3-sahna)
  if (b > 3.05 && b < 4.05) { const p = seg(b, 3.05, 4.05); bird(lerp(1250, -200, p), 640 + Math.sin(p * 9) * 40, 2.0, gt * 18); }
  // kamalak
  if (b > 16.0) { const p = eio(seg(b, 16.0, 16.2)); const cols = ['#ff595e', '#ff924c', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93'];
    ctx.save(); ctx.globalAlpha = 0.85; ctx.lineCap = 'butt';
    cols.forEach((c, i) => { ctx.beginPath(); ctx.strokeStyle = c; ctx.lineWidth = 34; ctx.arc(560, GROUND + 40, 720 - i * 34, Math.PI, Math.PI + Math.PI * p); ctx.stroke(); }); ctx.restore(); }
  const sx = o.x - cx, ox = { ...o, x: sx };
  const flx = FLOWER_X - cx;
  drawFlower(flx, GROUND, f);
  const L = (lx, ly) => tomyLocalToScreen(ox, lx, ly);
  // soyabon (8)
  if (b > 8.04 && b < 9.0) { let [ux, uy] = L(0, lerp(-430, -760, back(seg(b, 8.07, 8.22)))); let rot = 0.15 * Math.sin(gt * 6);
    const tp = seg(b, 8.75, 9.0); ux -= tp * 900; uy -= tp * 500 - tp * tp * 200; rot -= tp * 6;
    umbrella(ux, uy, rot, eout(seg(b, 8.18, 8.3))); }
  // o'rdak (9)
  if (b > 9.0 && b < 10.0) { let [dx, dy] = L(0, lerp(-430, -700, back(seg(b, 9.02, 9.15)))); const sc = 1 + 0.25 * Math.sin(Math.PI * seg(b, 9.18, 9.28)); let rot = 0.1 * Math.sin(gt * 7);
    const tp = seg(b, 9.78, 10.0); dx += tp * 700; dy -= tp * 700 - tp * tp * 250; rot += tp * 7; duck(dx, dy, rot, sc); }
  // suv idishi (10+)
  let canPos = null;
  if (b > 10.0) { let [ax, ay] = L(0, lerp(-430, -720, back(seg(b, 10.02, 10.16)))); ay += 10 * Math.sin(gt * 5); let rot = -0.1 + 0.08 * Math.sin(gt * 4);
    const hp = handPos(ox, 1); const g = eio(seg(b, 10.5, 10.75));
    ax = lerp(ax, hp[0] + 10, g); ay = lerp(ay, hp[1] - 10, g) - Math.sin(Math.PI * g) * 80; rot = lerp(rot, 0, g);
    if (b > 11.0) rot = 0.55 * eio(seg(b, 11.0, 11.12)) * (1 - eio(seg(b, 11.88, 12.0)));
    if (b > 15.0) { const d = eio(seg(b, 15.0, 15.2)); ax = lerp(ax, 130, d); ay = lerp(ay, GROUND - 30, d) - Math.sin(Math.PI * d) * 160; rot = lerp(rot, 0, d); }
    canPos = [ax, ay, rot];
    if (b < 10.75) wateringCan(ax, ay, rot, 0.95);
  }
  drawTomy(ox, gt);
  if (canPos && b >= 10.75) wateringCan(canPos[0], canPos[1], canPos[2], 0.95);
  // suv tomchilari (11)
  if (b > 11.08 && b < 12.0 && canPos) { const sp = canTip(canPos[0], canPos[1], canPos[2], 0.95); const fh = flowerHead(flx, GROUND, f);
    const t0 = I.bt(11.08), t1 = I.bt(11.85);
    for (let i = 0; i < 400; i++) { const tb = t0 + i * 0.026; if (tb > t1) break; const age = gt - tb; if (age < 0 || age > 0.75) continue;
      const vx = (fh[0] - sp[0]) / 0.6 + (rnd(i) - 0.5) * 90, vy = -160 + (rnd(i + 7) - 0.5) * 80; const g = (fh[1] - sp[1] - vy * 0.6) / 0.36;
      const px = sp[0] + vx * age, py = sp[1] + vy * age + g * age * age;
      ctx.fillStyle = '#74c0fc'; ctx.strokeStyle = '#1c7ed6'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(px, py, 9, 13, Math.atan2(vy + 2 * g * age, vx) - Math.PI / 2, 0, 7); ctx.fill(); ctx.stroke(); } }
  // zzz
  if (b < 1) { for (let i = 0; i < 3; i++) { const p = ((gt * 0.6 + i / 3) % 1); const [zx, zy] = L(150, -560); ctx.save(); ctx.globalAlpha = Math.sin(Math.PI * p) * (1 - seg(b, 0.9, 1)); ctx.font = `700 ${50 + p * 40}px ${FONT}`; ctx.fillStyle = '#fff'; ctx.strokeStyle = OUT; ctx.lineWidth = 8; const X = zx + p * 70 + Math.sin(p * 8) * 15, Y = zy - p * 230; ctx.strokeText('z', X, Y); ctx.fillText('z', X, Y); ctx.restore(); } }
  // ! belgisi
  if (b > 4.58 && b < 4.9) { const p = back(seg(b, 4.58, 4.66)) * (1 - seg(b, 4.84, 4.9)); const [ex, ey] = L(-40, -640); ctx.save(); ctx.translate(ex, ey); ctx.scale(p, p); ctx.font = `700 150px ${FONT}`; ctx.textAlign = 'center'; ctx.lineWidth = 16; ctx.strokeStyle = OUT; ctx.strokeText('!', 0, 0); ctx.fillStyle = '#ffd60a'; ctx.fillText('!', 0, 0); ctx.restore(); }
  // ? belgisi (soyabon, o'rdak)
  for (const [a, z2] of [[8.28, 8.66], [9.24, 9.7]]) { if (b > a && b < z2) { const p = back(seg(b, a, a + 0.05)) * (1 - seg(b, z2 - 0.04, z2)); const [ex, ey] = L(-210, -560); ctx.save(); ctx.translate(ex, ey); ctx.rotate(-0.15); ctx.scale(p, p); ctx.font = `700 120px ${FONT}`; ctx.textAlign = 'center'; ctx.lineWidth = 14; ctx.strokeStyle = OUT; ctx.strokeText('?', 0, 0); ctx.fillStyle = '#a0c4ff'; ctx.fillText('?', 0, 0); ctx.restore(); } }
  // uchqunlar
  { const [hx, hy] = L(0, -380); sparkles(hx, hy, (gt - I.bt(1.08)) / 0.9, 10, 260, '#9ff6ff'); }
  if (canPos) sparkles(canPos[0], canPos[1], (gt - I.bt(10.03)) / 0.9, 12, 200);
  { const fh = flowerHead(flx, GROUND, f); sparkles(fh[0], fh[1], (gt - I.bt(12.68)) / 0.9, 14, 260, '#ffd6e8'); sparkles(fh[0], fh[1], (gt - I.bt(12.75)) / 0.9, 10, 180); }
  // yuraklar
  if (b > 13) { const t0 = I.bt(13); for (let i = 0; i < 10; i++) { const p = ((gt - t0) * 0.35 + i * 0.1) % 1; const hx = lerp(sx, flx, rnd(i)) + Math.sin(p * 7 + i) * 40, hy = GROUND - 250 - p * 900;
    ctx.save(); ctx.globalAlpha = Math.sin(Math.PI * p) * 0.9 * clamp((gt - t0) * 2); heart(hx, hy, 30 + rnd(i + 3) * 20); fillStroke(['#ff4d6d', '#ff85a1', '#ffb3c6'][i % 3], 5); ctx.restore(); } }
  ctx.restore();
  // ---------- ustki yozuvlar ----------
  if (b < 1.05) { const t0 = I.bt(0.04); const out = eio(seg(b, 0.82, 0.97));
    bouncyText('TOMY', 540, 430, 230, gt, t0, ['#3fc7c0', '#ffd60a', '#ff6fa8', '#f6ad55'], out);
    bouncyText('the Robot', 540, 560, 90, gt, t0 + 0.5, ['#ffffff'], out); }
  if (b > 16.4) { const t0 = I.bt(16.4);
    bouncyText('Be kind', 540, 330, 170, gt, t0, ['#ff6fa8', '#ffd60a', '#3fc7c0', '#ffffff', '#f6ad55', '#a0c4ff', '#ff6fa8']);
    bouncyText('every day!', 540, 500, 150, gt, t0 + 0.4, ['#ffffff', '#ffd60a', '#3fc7c0', '#ff6fa8']); }
  // diafragma: boshida ochiladi, oxirida yopiladi
  const tEnd = I.total;
  const iris = gt < 0.5 ? eout(seg(gt, 0, 0.5)) : gt > tEnd - 0.8 ? 1 - eio(seg(gt, tEnd - 0.8, tEnd)) : 1;
  if (iris < 1) { ctx.save(); ctx.fillStyle = '#0b1220'; ctx.beginPath(); ctx.rect(0, 0, W, H); const c = gt < 1 ? [540, 1100] : [sx, o.y - 300]; ctx.arc(c[0], c[1], Math.max(0, iris * 1400), 0, Math.PI * 2, true); ctx.fill('evenodd'); ctx.restore(); }
}
