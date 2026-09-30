// Música, efectos y voces del juego. Todo está generado con ElevenLabs y vive en web/audio/:
//   music/<id>.mp3  pistas en bucle (con fundido cruzado al dar la vuelta)
//   sfx/<id>.mp3    efectos cortos
//   voice/<clave>.mp3  una línea de diálogo (la clave sale del personaje y del texto: storydata.voiceKey)
// El navegador no deja sonar nada hasta el primer clic o tecla: lo que se pida antes espera a ese momento.
import { VOICES } from './audio/voice/index.js';
import { voiceKey } from './storydata.js';

const LS = 'paximon.audio';
const pref = { music: true, sfx: true };
try { Object.assign(pref, JSON.parse(localStorage.getItem(LS)) || {}); } catch { /* nada */ }
const save = () => { try { localStorage.setItem(LS, JSON.stringify(pref)); } catch { /* nada */ } };

const VOL = { music: 0.3, sfx: 0.5, voice: 1 };
// volumen propio de cada pista o efecto y efectos que se cortan (algunos salieron largos)
const MUSIC_VOL = { espera: 0.8, vitoria: 0.9, creditos: 0.9, emocion: 0.85, estacion: 0.7, algoritmo: 0.9 };
const SFX_VOL = { select: 0.35, hit: 0.7, crit: 0.8, phones: 0.6, tick: 0.6, cheer: 0.7, crowd: 0.6, typing: 0.5 };
const SFX_MAX = { page: 2600, drawer: 1600, fax: 2600, train_arrive: 3200 };
const FADE = 900, XFADE = 1400;

let unlocked = false;
const onUnlock = [];
function unlock() {
  if (unlocked) return;
  unlocked = true;
  window.removeEventListener('pointerdown', unlock, true);
  window.removeEventListener('keydown', unlock, true);
  while (onUnlock.length) { try { onUnlock.shift()(); } catch { /* nada */ } }
}
window.addEventListener('pointerdown', unlock, true);
window.addEventListener('keydown', unlock, true);

// sube o baja el volumen de un <audio> poco a poco
function ramp(el, to, ms, then) {
  clearInterval(el._ramp);
  const from = el.volume, t0 = performance.now();
  if (ms <= 0) { el.volume = to; then?.(); return; }
  el._ramp = setInterval(() => {
    const k = Math.min(1, (performance.now() - t0) / ms);
    el.volume = Math.max(0, Math.min(1, from + (to - from) * k));
    if (k >= 1) { clearInterval(el._ramp); then?.(); }
  }, 40);
}

// ---------- música ----------
const M = { id: null, els: [], duck: 1, loop: true };
const musicLevel = (id) => VOL.music * (MUSIC_VOL[id] ?? 1) * M.duck;
function musicEl(id) {
  const el = new Audio(`audio/music/${id}.mp3`);
  el.preload = 'auto';
  el.volume = 0;
  // bucle con fundido cruzado: poco antes de acabar arranca otra copia desde el principio
  el.addEventListener('timeupdate', () => {
    if (!M.loop || M.id !== id || el._leaving || !el.duration || el.currentTime < el.duration - XFADE / 1000) return;
    el._leaving = true;
    const next = musicEl(id);
    M.els.push(next);
    next.play().then(() => ramp(next, musicLevel(id), XFADE)).catch(() => {});
    ramp(el, 0, XFADE, () => { el.pause(); M.els = M.els.filter(e => e !== el); });
  });
  el.addEventListener('ended', () => { if (!M.loop && M.id === id) M.id = null; });
  return el;
}
function stopMusicEls(ms = FADE) {
  for (const el of M.els) { el._leaving = true; ramp(el, 0, ms, () => el.pause()); }
  M.els = [];
}
export const Music = {
  get current() { return M.id; },
  // play('vila') · play('vitoria', {loop: false}) · play(null) para parar
  play(id, { loop = true, fade = FADE } = {}) {
    if (!id) return this.stop(fade);
    if (M.id === id && M.els.length) return;
    M.id = id; M.loop = loop;
    stopMusicEls(fade);
    if (!pref.music) return;
    const start = () => {
      if (M.id !== id || !pref.music || M.els.length) return;
      const el = musicEl(id);
      M.els.push(el);
      el.play().then(() => ramp(el, musicLevel(id), fade)).catch(() => { M.els = M.els.filter(e => e !== el); if (!unlocked) onUnlock.push(start); });
    };
    if (unlocked) start(); else onUnlock.push(start);
  },
  stop(fade = FADE) { M.id = null; stopMusicEls(fade); },
  // baja la música mientras alguien habla
  duck(on) {
    M.duck = on ? 0.35 : 1;
    for (const el of M.els) if (!el._leaving) ramp(el, musicLevel(M.id), 300);
  },
};

// ---------- efectos ----------
const sfxCache = new Map();
export function sfx(id, { volume = 1 } = {}) {
  if (!pref.sfx || !id || !unlocked) return;
  try {
    let base = sfxCache.get(id);
    if (!base) { base = new Audio(`audio/sfx/${id}.mp3`); base.preload = 'auto'; sfxCache.set(id, base); }
    const el = base.cloneNode();
    el.volume = Math.min(1, VOL.sfx * (SFX_VOL[id] ?? 1) * volume);
    el.play().catch(() => {});
    if (SFX_MAX[id]) setTimeout(() => ramp(el, 0, 400, () => el.pause()), SFX_MAX[id]);
  } catch { /* sin audio */ }
}
// precarga (para que el primer golpe del combate no llegue tarde)
export function preloadSfx(ids) {
  for (const id of ids) if (!sfxCache.has(id)) { const a = new Audio(`audio/sfx/${id}.mp3`); a.preload = 'auto'; sfxCache.set(id, a); }
}

// ---------- voces ----------
let voiceEl = null, voiceDone = null;
export const hasVoice = (cast, text) => !!cast && VOICES.has(voiceKey(cast, text));
export function stopVoice() {
  if (voiceEl) { voiceEl.pause(); voiceEl = null; }
  if (voiceDone) { const d = voiceDone; voiceDone = null; d(false); }
  Music.duck(false);
}
// Dice una línea con la voz de su personaje. Devuelve una promesa que se cumple al acabar
// (true) o enseguida si no hay audio o el sonido está quitado (false).
export function say(cast, text) {
  stopVoice();
  if (!pref.sfx || !unlocked || !hasVoice(cast, text)) return Promise.resolve(false);
  return new Promise((resolve) => {
    const el = new Audio(`audio/voice/${voiceKey(cast, text)}.mp3`);
    el.volume = VOL.voice;
    voiceEl = el; voiceDone = resolve;
    // salvaguarda: una línea nunca bloquea más de lo que dura (y si se pasa, se calla: que no se
    // pise con la siguiente)
    let guard = setTimeout(() => end(true), 20000);
    const end = (ok) => { clearTimeout(guard); if (voiceEl !== el) return; el.pause(); voiceEl = null; voiceDone = null; Music.duck(false); resolve(ok); };
    el.addEventListener('loadedmetadata', () => {
      if (!Number.isFinite(el.duration)) return;
      clearTimeout(guard); guard = setTimeout(() => end(true), el.duration * 1000 + 1500);
    });
    el.addEventListener('ended', () => end(true));
    el.addEventListener('error', () => end(false));
    Music.duck(true);
    el.play().catch(() => end(false));
  });
}

// Gritos de los Paximón en combate: van por su propio canal (no cortan los diálogos) y no se pisan
// entre ellos salvo con force. rate > 1 los hace más agudos y rápidos (voz de bicho).
let cryEl = null;
export function cry(cast, text, { force = false, rate = 1 } = {}) {
  if (!pref.sfx || !unlocked || !hasVoice(cast, text)) return false;
  if (cryEl && !cryEl.ended && !cryEl.paused && !force) return false;
  if (cryEl) cryEl.pause();
  const el = cryEl = new Audio(`audio/voice/${voiceKey(cast, text)}.mp3`);
  el.volume = VOL.voice * 0.9;
  el.preservesPitch = false;
  el.playbackRate = Math.max(0.7, Math.min(1.4, rate));
  el.play().catch(() => {});
  return true;
}
export function stopCry() { if (cryEl) { cryEl.pause(); cryEl = null; } }

// ---------- preferencias ----------
export const AudioPrefs = {
  get music() { return pref.music; },
  get sfx() { return pref.sfx; },
  setMusic(on) {
    pref.music = !!on; save();
    if (!pref.music) { const id = M.id; stopMusicEls(300); M.id = id; }
    else if (M.id) { const id = M.id; M.id = null; Music.play(id, { loop: M.loop }); }
  },
  setSfx(on) { pref.sfx = !!on; save(); if (!on) { stopVoice(); stopCry(); } },
};

// música de cada mapa del mundo
export function musicForMap(mapId = 'vila') {
  if (mapId === 'cafe' || mapId === 'cafe_in') return 'cafe';
  if (mapId === 'estacion') return 'estacion';
  if (mapId === 'cambados') return 'cambados';
  if (mapId === 'programacion' || mapId === 'arquivo' || mapId === 'datos') return 'mazmorra';
  if (mapId === 'tren') return 'tren';
  if (mapId.startsWith('house_')) return 'oficina';
  return 'vila';
}
