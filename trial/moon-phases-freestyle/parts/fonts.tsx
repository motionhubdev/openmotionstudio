// The film's one face, Noto Sans SC (SIL Open Font License 1.1, media/fonts/OFL-noto-sans-sc.txt), loaded from the
// project's files: weights 500, 700 and 900 from @expo-google-fonts/noto-sans-sc 0.4.4, subset to the characters the
// film writes. After changing any words, subset it again, or check reports characters drawn in a fallback face.
import w500 from '../media/fonts/noto-sans-sc-500.woff2';
import w700 from '../media/fonts/noto-sans-sc-700.woff2';
import w900 from '../media/fonts/noto-sans-sc-900.woff2';

export const sans = "'Noto Sans SC', sans-serif";

const css = ([[500, w500], [700, w700], [900, w900]] as const)
  .map(([weight, url]) => `@font-face { font-family: 'Noto Sans SC'; font-weight: ${weight}; font-style: normal; src: url(${url}) format('woff2'); }`)
  .join('\n');

export function Fonts() {
  return <style>{css}</style>;
}
