// The mark of the service a model is reached through: its own icon on its brand colour, found by its name or its
// address, or its initials where the Studio has no icon for it.
import anthropic from './provider-icons/anthropic.svg';
import deepseek from './provider-icons/deepseek.svg';
import gemini from './provider-icons/googlegemini.svg';
import lmstudio from './provider-icons/lmstudio.svg';
import minimax from './provider-icons/minimax.svg';
import ollama from './provider-icons/ollama.svg';
import openrouter from './provider-icons/openrouter.svg';

const MARKS: { match: RegExp; icon: string; colour: string }[] = [
  { match: /anthropic/i, icon: anthropic, colour: '#191919' },
  { match: /deepseek/i, icon: deepseek, colour: '#5786FE' },
  { match: /gemini|generativelanguage\.googleapis/i, icon: gemini, colour: '#8E75B2' },
  { match: /minimax/i, icon: minimax, colour: '#E73562' },
  { match: /ollama|:11434/i, icon: ollama, colour: '#000000' },
  { match: /openrouter/i, icon: openrouter, colour: '#94A3B8' },
  { match: /lm ?studio|:1234/i, icon: lmstudio, colour: '#000000' },
];

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export function ProviderLogo({ name, baseUrl }: { name: string; baseUrl?: string }) {
  const mark = MARKS.find((m) => m.match.test(name) || (baseUrl !== undefined && m.match.test(baseUrl)));
  return mark ? (
    <span className="provider-logo" style={{ background: mark.colour }} aria-hidden="true">
      <span style={{ maskImage: `url(${mark.icon})`, WebkitMaskImage: `url(${mark.icon})` }} />
    </span>
  ) : (
    <span className="provider-logo initials" aria-hidden="true">
      {initials(name)}
    </span>
  );
}
