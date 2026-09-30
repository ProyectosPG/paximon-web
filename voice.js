// Frases y voz de los Paximón en combate. Las frases vienen de characters.lines; el audio de cada
// una está generado con ElevenLabs (tools/audio/voices.mjs, voces en storydata.PAX_VOICES). Si una
// frase no tiene audio (se añadió después), sale solo el bocadillo.
import { cry, stopCry } from './audio.js';
import { PAX_VOICES, paxCast } from './storydata.js';

const LS_KEY = 'paximon.voice';
let enabled = true;
try { enabled = localStorage.getItem(LS_KEY) !== '0'; } catch { /* nada */ }

export const Voice = {
  get enabled() { return enabled; },
  toggle() { enabled = !enabled; try { localStorage.setItem(LS_KEY, enabled ? '1' : '0'); } catch { /* nada */ } if (!enabled) this.stop(); return enabled; },
  stop() { stopCry(); },
  // slug: el Paximón que habla
  say(text, { slug, force = false } = {}) {
    if (!enabled || !text || !slug) return;
    cry(paxCast(slug), text, { force, rate: PAX_VOICES[slug]?.rate ?? 1 });
  },
};

// Elige una frase al azar de character.lines[key]
export function pickLine(char, key) {
  const list = char?.lines?.[key];
  if (!Array.isArray(list) || !list.length) return null;
  return list[Math.floor(Math.random() * list.length)];
}
