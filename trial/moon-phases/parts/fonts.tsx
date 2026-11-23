// The faces Night Diagram names but does not ship, loaded from the project's own files (media/fonts/).
// Hanken Grotesk and JetBrains Mono are the latin files of @fontsource/hanken-grotesk 5.3.0 and
// @fontsource/jetbrains-mono 5.3.0; Noto Sans SC is subset to the film's characters from
// @expo-google-fonts/noto-sans-sc 0.4.4. All three: SIL Open Font License 1.1 (media/fonts/OFL-*.txt).
// After changing any words in the film, subset Noto Sans SC again, or check reports characters drawn in a fallback.
import sc400 from '../media/fonts/noto-sans-sc-400.woff2';
import sc500 from '../media/fonts/noto-sans-sc-500.woff2';
import sc600 from '../media/fonts/noto-sans-sc-600.woff2';
import sc700 from '../media/fonts/noto-sans-sc-700.woff2';
import sc800 from '../media/fonts/noto-sans-sc-800.woff2';
import hk400 from '../media/fonts/hanken-grotesk-400.woff2';
import hk500 from '../media/fonts/hanken-grotesk-500.woff2';
import hk600 from '../media/fonts/hanken-grotesk-600.woff2';
import hk700 from '../media/fonts/hanken-grotesk-700.woff2';
import hk800 from '../media/fonts/hanken-grotesk-800.woff2';
import mono400 from '../media/fonts/jetbrains-mono-400.woff2';

const face = (family: string, weight: number, url: string) =>
  `@font-face { font-family: '${family}'; font-weight: ${weight}; font-style: normal; src: url(${url}) format('woff2'); }`;

const css = [
  ...([[400, sc400], [500, sc500], [600, sc600], [700, sc700], [800, sc800]] as const).map(([w, u]) => face('Noto Sans SC', w, u)),
  ...([[400, hk400], [500, hk500], [600, hk600], [700, hk700], [800, hk800]] as const).map(([w, u]) => face('Hanken Grotesk', w, u)),
  face('JetBrains Mono', 400, mono400),
].join('\n');

export function Fonts() {
  return <style>{css}</style>;
}
