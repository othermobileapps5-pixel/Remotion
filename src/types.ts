// Video ssenariysi: videos/<nom>.json fayli shu ko'rinishda bo'ladi.
// Hamma vaqtlar SEKUNDDA. Fayl yo'llari public/ papkasiga nisbatan (masalan "rasmlar/1.jpg") yoki to'liq https:// havola.

export type Theme = {
  bg: string; // fon rangi
  accent: string; // asosiy rang (chiziqlar, ajratilgan so'zlar)
  text: string; // matn rangi
};

export type TitleScene = {
  type: 'title';
  text: string;
  subtitle?: string;
  duration: number;
};

export type TextScene = {
  type: 'text';
  text: string; // \n bilan qatorlarga bo'linadi
  duration: number;
};

export type ImageScene = {
  type: 'image';
  src: string;
  caption?: string;
  duration: number;
  zoom?: 'in' | 'out'; // sekin yaqinlashish yoki uzoqlashish (standart: in)
};

export type VideoScene = {
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

export type Scene = TitleScene | TextScene | ImageScene | VideoScene;

export type VideoProps = {
  title: string;
  theme?: Partial<Theme>;
  voiceover?: string; // hikoya qiluvchi ovoz (mp3)
  music?: string; // fon musiqasi
  musicVolume?: number; // 0..1, standart 0.15
  transition?: number; // sahnalar orasidagi o'tish, sekund (standart 0.5; 0 — o'tishsiz)
  falModel?: string; // barcha AI kliplar uchun model
  provider?: 'fal' | 'runway'; // barcha AI kliplar uchun xizmat (standart: fal)
  scenes: Scene[];
};

export const DEFAULT_THEME: Theme = { bg: '#0B1220', accent: '#22C55E', text: '#FFFFFF' };
export const FPS = 30;
