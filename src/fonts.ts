import { loadFont } from '@remotion/google-fonts/Montserrat';

// Lotin, kengaytirilgan lotin (o', g') va kirill — o'zbek va rus matnlari uchun
export const { fontFamily } = loadFont('normal', {
  weights: ['500', '700', '800'],
  subsets: ['latin', 'latin-ext', 'cyrillic'],
});
