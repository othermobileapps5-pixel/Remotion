// Video ssenariysi: videos/<nom>.json fayli shu ko'rinishda bo'ladi.
// Hamma vaqtlar SEKUNDDA. Fayl yo'llari public/ papkasiga nisbatan (masalan "rasmlar/1.jpg") yoki to'liq https:// havola.

export type Theme = {
  bg: string; // fon rangi
  accent: string; // asosiy rang (chiziqlar, ajratilgan so'zlar)
  text: string; // matn rangi
};

// Har qanday sahnaga qo'shish mumkin: hikoya ovozi (Gemini yoki Azure, scripts/ovoz.mjs)
export type Voice = {
  ovoz?: string; // shu sahnada o'qiladigan matn (\n — qisqa pauza)
  ovozchi?: 'madina' | 'sardor' | string; // Azure: madina/sardor; Gemini: Charon, Kore...
  ovozTezligi?: string; // Azure: masalan "-10%" (sekinroq) yoki "+10%"
  ovozUslubi?: string; // Gemini: o'qish uslubi
  ovozFayl?: string; // skript yozadi: yasalgan mp3
  ovozKalit?: string; // skript yozadi: matn o'zgarganini bilish uchun
};

export type TitleScene = Voice & {
  type: 'title';
  text: string;
  subtitle?: string;
  duration: number;
};

export type TextScene = Voice & {
  type: 'text';
  text: string; // \n bilan qatorlarga bo'linadi
  duration: number;
};

export type ImageScene = Voice & {
  type: 'image';
  src: string;
  caption?: string;
  duration: number;
  zoom?: 'in' | 'out'; // sekin yaqinlashish yoki uzoqlashish (standart: in)
};

export type VideoScene = Voice & {
  type: 'video';
  src?: string; // tayyor klip; bo'lmasa va prompt bo'lsa — fal.ai yasaydi (scripts/fal.mjs)
  prompt?: string; // AI klip uchun tavsif (ingliz tilida yaxshiroq)
  image?: string; // AI klip shu rasmdan boshlansin (rasmdan video — arzonroq va aniqroq)
  model?: string; // fal.ai model ID (bo'lmasa standart Kling) yoki "runway/gen4_turbo", "runway/gen4.5"
  provider?: 'fal' | 'runway'; // qaysi xizmat (standart: fal)
  caption?: string;
  duration: number;
  muted?: boolean; // klip ovozini o'chirish (standart: o'chiq)
};

// Koddan yasalgan animatsion sahna: src/videos/registry.tsx dagi komponent nomi
export type CustomScene = Voice & {
  type: 'custom';
  name: string; // masalan "apollo13/hook"
  duration: number;
};

export type Scene = TitleScene | TextScene | ImageScene | VideoScene | CustomScene;

export type VideoProps = {
  title: string;
  theme?: Partial<Theme>;
  voiceover?: string; // hikoya qiluvchi ovoz (mp3)
  ovozchi?: 'madina' | 'sardor' | string; // barcha sahnalar ovozi (standart: madina)
  ovozTezligi?: string; // barcha sahnalar uchun, masalan "-5%"
  ovozXizmat?: 'azure' | 'gemini'; // ovoz xizmati (standart: azure)
  geminiTtsModel?: string; // standart: gemini-3.8-flash-lite-tts (arzon)
  ovozUslubi?: string; // Gemini: butun video uchun o'qish uslubi
  ovozgaMoslash?: boolean; // sahna uzunligini aniq ovozga moslash
  ovozPad?: number; // ovozdan keyingi pauza, sek (standart 0.8)
  ovozBalandligi?: number; // 0..1, standart 1
  music?: string; // fon musiqasi
  musicVolume?: number; // 0..1, standart 0.15
  transition?: number; // sahnalar orasidagi o'tish, sekund (standart 0.5; 0 — o'tishsiz)
  falModel?: string; // barcha AI kliplar uchun model
  provider?: 'fal' | 'runway'; // barcha AI kliplar uchun xizmat (standart: fal)
  scenes: Scene[];
};

export const DEFAULT_THEME: Theme = { bg: '#0B1220', accent: '#22C55E', text: '#FFFFFF' };
export const FPS = 30;
