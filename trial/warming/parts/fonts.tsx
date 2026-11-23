// The faces Stage Light names but does not ship, cut by `oms font` to the film's characters (SIL OFL 1.1, licences beside them).
// Rerun `oms font` for each family when the words change.
import noto_sans_sc_500 from '../media/fonts/noto-sans-sc-500.ttf';
import noto_sans_sc_600 from '../media/fonts/noto-sans-sc-600.ttf';
import noto_sans_sc_700 from '../media/fonts/noto-sans-sc-700.ttf';
import noto_sans_sc_800 from '../media/fonts/noto-sans-sc-800.ttf';
import hanken_grotesk_500 from '../media/fonts/hanken-grotesk-500.ttf';
import hanken_grotesk_600 from '../media/fonts/hanken-grotesk-600.ttf';
import big_shoulders_display_700 from '../media/fonts/big-shoulders-display-700.ttf';
import big_shoulders_display_800 from '../media/fonts/big-shoulders-display-800.ttf';

export function Fonts() {
  return (
    <style>{`
      @font-face { font-family: 'Noto Sans SC'; font-weight: 500; src: url(${noto_sans_sc_500}); }
      @font-face { font-family: 'Noto Sans SC'; font-weight: 600; src: url(${noto_sans_sc_600}); }
      @font-face { font-family: 'Noto Sans SC'; font-weight: 700; src: url(${noto_sans_sc_700}); }
      @font-face { font-family: 'Noto Sans SC'; font-weight: 800; src: url(${noto_sans_sc_800}); }
      @font-face { font-family: 'Hanken Grotesk'; font-weight: 500; src: url(${hanken_grotesk_500}); }
      @font-face { font-family: 'Hanken Grotesk'; font-weight: 600; src: url(${hanken_grotesk_600}); }
      @font-face { font-family: 'Big Shoulders Display'; font-weight: 700; src: url(${big_shoulders_display_700}); }
      @font-face { font-family: 'Big Shoulders Display'; font-weight: 800; src: url(${big_shoulders_display_800}); }
    `}</style>
  );
}
