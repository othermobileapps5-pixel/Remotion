// Mavzuga qarab fon musiqasi: avval kutubxonadan (public/musiqa/kutubxona.json), mosi bo'lmasa Pixabay'dan qidirib.
//   node scripts/musiqa-tanla.mjs videos/<nom>.json
// Ssenariyda "music" yoki "musiqa" (Lyria) bo'lsa — tegmaydi. "musiqa_qidiruv": "inglizcha so'zlar" bo'lsa — shu bilan,
// bo'lmasa sarlavha/youtube nomi/rasmUslub dan. Natija: "music" va "musicVolume" ssenariyga yoziladi.
// "musiqaYoq": true — musiqasiz video.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const file = process.argv[2];
const d = JSON.parse(fs.readFileSync(file, 'utf8'));
if (d.music || d.musiqa || d.musiqaYoq) { console.log('Musiqa allaqachon belgilangan — tegmayman.'); process.exit(0); }
// tayyor videoli ssenariylar (Imzo, Qirqish, klip sahnalari) — o'z ovozi bor, musiqa qo'shilmaydi (agar so'ralmasa)
if (!d.musiqa_qidiruv && (d.scenes || []).some((x) => x.type === 'custom' || x.type === 'video')) { console.log("Video/maxsus sahnali ssenariy — musiqa qo'shmayman."); process.exit(0); }

// video uzunligi (soniya): sahnalar − o'tishlar
const sahnalar = d.scenes || [];
const uzunlik = Math.max(10, Math.round(sahnalar.reduce((s, x) => s + Number(x.duration || 0), 0) - Math.max(0, sahnalar.length - 1) * Number(d.transition ?? 0.5)));

const TOXTA = new Set('the a an of and or in on at to for with from by is are was were how why what who when this that your you my our it its into about vs video story history facts top best new'.split(' '));
const sozlar = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/[\s-]+/).filter((w) => w.length > 2 && !TOXTA.has(w));
const qidiruv = (d.musiqa_qidiruv || '').trim();
const mavzu = new Set([...sozlar(qidiruv), ...sozlar(d.title), ...sozlar(d.youtube?.nom), ...sozlar(d.rasmUslub)]);

const JSONF = 'public/musiqa/kutubxona.json';
const kutubxona = fs.existsSync(JSONF) ? JSON.parse(fs.readFileSync(JSONF, 'utf8')) : [];
// ishlatilgan treklar — bir xil trek ketma-ket videolarda takrorlanmasin
const ishlatilgan = new Set(fs.readdirSync('videos').filter((f) => f.endsWith('.json') && `videos/${f}` !== file).map((f) => { try { return JSON.parse(fs.readFileSync(`videos/${f}`, 'utf8')).music; } catch { return null; } }).filter(Boolean));

function ball(t) {
  const teg = new Set(t.teglar.flatMap((x) => sozlar(x)));
  let b = 0;
  for (const w of mavzu) if (teg.has(w)) b += sozlar(qidiruv).includes(w) ? 3 : 1;
  if (t.soniya && t.soniya < uzunlik) b -= 100; // qisqa trek video o'rtasida tugaydi
  if (ishlatilgan.has(t.fayl)) b -= 2;
  return b;
}

let tanlov = kutubxona.map((t) => ({ t, b: ball(t) })).sort((a, b) => b.b - a.b)[0];
const yetarli = tanlov && tanlov.b >= (qidiruv ? 3 : 2);
console.log(`Video ${uzunlik} s · mavzu: ${[...mavzu].slice(0, 10).join(', ')}`);
if (tanlov) console.log(`Kutubxonadagi eng mosi: ${tanlov.t.fayl} (ball ${tanlov.b})`);

if (!yetarli) {
  const q = qidiruv || [...mavzu].slice(0, 3).join(' ') || 'cinematic ambient';
  console.log(`Kutubxonada mos trek yo'q → Pixabay: "${q}" (≥ ${uzunlik} s)`);
  try {
    fs.rmSync('/tmp/mt', { recursive: true, force: true });
    execFileSync('python3', ['-I', 'scripts/pixabay_musiqa.py', q, '1', String(uzunlik), '/tmp/mt'], { stdio: 'inherit' });
    const r = JSON.parse(fs.readFileSync('/tmp/mt/natija.json', 'utf8'))[0];
    const y = JSON.parse(execFileSync('node', ['scripts/kutubxona.mjs', 'qosh', r.fayl, r.nom, [q, ...(r.teglar || [])].join(','), 'pixabay'], { encoding: 'utf8' }).trim().split('\n').pop());
    tanlov = { t: y, b: 99 };
  } catch (e) {
    console.log(`Pixabay'dan olinmadi (${e.message.split('\n')[0]})`);
    if (!tanlov || tanlov.b < 1) { console.log('Mavzuga mos trek yo\'q — musiqasiz qoladi.'); process.exit(0); }
    console.log('Kutubxonadagi eng yaqinini ishlataman.');
  }
}

const ovozBor = sahnalar.some((x) => x.ovoz || x.ovozFayl);
d.music = tanlov.t.fayl;
d.musicVolume = d.musicVolume ?? (ovozBor ? 0.14 : 0.32);
fs.writeFileSync(file, JSON.stringify(d, null, 2) + '\n');
console.log(`✓ Musiqa: ${d.music} (balandlik ${d.musicVolume})`);
