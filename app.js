import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';
import { drawSprite } from './sprites.js';
import { playMinigame, MINIGAME_NAMES } from './minigames.js';
import { initFx, playMoveFx } from './fx.js';
import { Voice, pickLine } from './voice.js';
import { Town } from './town.js';
import { ARENA_EXIT, TOWN_NAME, MAP_NAMES, DIO_LOOK } from './townmap.js';
import { avatarCanvas, SKINS, HAIRS, HAIR_NAMES, STYLES, DIRS, normLook } from './avatar.js';
import { APP_NAME, logoDataUrl } from './ipmsg.js';
import { paintStage, stageFor, STAGES, LAYOUT } from './stages.js';
import { itemCanvas, coinDataUrl, fmtCoins } from './items.js';
import { dioBadge } from './worldart.js';
import { playAlbarino, playCataRound } from './albarino.js';
import { fighter, resolveLocal, aiPick } from './localbattle.js';
import {
  DIO_NAME, DIO_LOSES, DIO_WINS, MARICARMEN_DOOR, MARICARMEN_HOME, DIO_HOUSE_DOOR, SHOP_THANKS, CASETA_HELLO,
} from './dialogs.js';
import { Music, sfx, say as sayVoice, stopVoice, hasVoice, AudioPrefs, musicForMap, preloadSfx } from './audio.js';
import { FOES, STORY_MOVES, BATTLES, OUTFITS, CARRUSEL, MEMORIA, WEBGEO, castOf } from './storydata.js';
import { STORY_PARTS } from './storyparts.js';
import { Story } from './story.js';
import { RULES, gralla } from './storybattle.js';
import { playCarrusel, playMemoria, playWebGeo } from './storygames.js';
import { houseEntry } from './storymaps.js';

// worker: los latidos del websocket van en un Web Worker para que no se congelen con la pestaña en
// segundo plano (si no, el servidor corta la conexión y el jugador desaparece del pueblo un rato)
const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { db: { schema: 'paximon' }, realtime: { worker: true } });

// ---------- estado ----------
const S = {
  player: null, parts: {}, chars: [], charById: {}, moves: {}, universal: [], types: {}, typeList: [], chart: {},
  depts: [], deptById: {}, items: [], itemById: {},
  match: null, me: null, channel: null, lobby: null, lobbyReady: false,
  seen: new Set(), queue: [], busy: false, lastLogId: 0, pickedChar: null, sending: false,
  inGame: false, pendingKey: null, duelOpp: 0, lowHpSaid: {},
  // pueblo, presencia e invitaciones
  town: null, zone: null, pres: {}, presTimer: null, presSent: [], presLast: null, online: new Map(), remotePos: new Map(),
  lobbyGen: 0, relobbyTimer: null, posTimer: null,
  returnTo: 'town', outInvite: null, inInvite: null, chatScope: null, chatFilter: '', chatUsers: new Set(), board: null,
  // sesiones (elegir usuario), combates contra vecinos y la feria
  hbTimer: null, watch: null, local: null, drunk: 0, drunkTimer: null,
};
const LS_PLAYER = 'paximon.player', LS_MATCH = 'paximon.match', LS_POS = 'paximon.townpos', LS_NOTES_SEEN = 'paximon.notes.seen', LS_OFFICE = 'paximon.office';
const TAB_ID = Math.random().toString(36).slice(2, 10);
const $ = (s) => document.querySelector(s);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const other = () => (S.me === 'p1' ? 'p2' : 'p1');

// ---------- emotes ----------
const EMOTES = [
  { id: 'laugh', face: 'face_laugh',  text: 'JAJAJA' },
  { id: 'shout', face: 'face_shout',  text: 'MANDA CARALLO' },
  { id: 'cry',   face: 'face_cry',    text: 'BUAAA' },
  { id: 'cool',  face: 'face_cool',   text: 'TRANQUI' },
  { id: 'sleep', face: 'face_sleepy', text: 'Zzz…' },
  { id: 'boa',   face: 'face_happy',  text: '¡BOA!' },
  { id: 'hmm',   face: 'face_grumpy', text: 'HMM…' },
  { id: 'gg',    face: 'face_smirk',  text: 'GG' },
];
const emoteById = (id) => EMOTES.find(e => e.id === id);
function emoteSprite(char, faceId) {
  const sp = char?.sprite || { size: 64, palette: {}, layers: [{ part: 'body_star' }, { part: 'face_smirk' }] };
  let swapped = false;
  const layers = sp.layers.map(l => (S.parts[l.part]?.kind === 'face' ? (swapped = true, { ...l, part: faceId }) : l));
  if (!swapped) layers.push({ part: faceId });
  return { ...sp, layers };
}
const defaultChar = () => S.chars.find(c => c.slug === 'paxi') || S.chars[0];
function charOfSide(side) {
  const st = S.match?.state?.[side];
  return (st && S.charById[st.char_id]) || defaultChar();
}
const charBySlug = (slug) => S.chars.find(c => c.slug === slug) || defaultChar();

function show(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === 'screen-' + name));
  if (name !== 'town') S.town?.stop();
}
function isActive(name) { return $('#screen-' + name).classList.contains('active'); }
let toastTimer;
function toast(msg, error = false) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false; t.classList.toggle('error', error);
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), 3500);
}
async function rpc(fn, args) {
  const { data, error } = await sb.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data;
}
function typeBadge(t, id) {
  const ty = S.types[t];
  return `<span class="badge"${id ? ` id="${id}"` : ''} style="background:${ty?.color || '#9e9e9e'}">${esc(ty?.name || 'Sin tipo')}</span>`;
}
const deptColor = (id) => S.deptById[id]?.color || '#9E9E9E';
function deptBadge(id) {
  const d = S.deptById[id];
  if (!d) return '<span class="dept muted">sin departamento</span>';
  return `<span class="dept" style="--c:${d.color}">${esc(d.name)}</span>`;
}
const effOf = (moveType, foeType) => (moveType ? (S.chart[`${moveType}>${foeType}`] ?? 1) : 1);
function effTag(mv, foeType) {
  if (!mv.power) return '';
  const e = effOf(mv.type, foeType);
  if (e > 1) return '<span class="eff up">▲ eficaz</span>';
  if (e < 1) return '<span class="eff down">▼ poco eficaz</span>';
  return '';
}

// ---------- modales ----------
const modalOpen = () => !!document.querySelector('.modal-bg');
function openModal(html, { closable = true, cls = '', onClose } = {}) {
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal ${cls}" role="dialog" aria-modal="true">${closable ? '<button class="modal-x" type="button" aria-label="Cerrar">✕</button>' : ''}${html}</div>`;
  // en el móvil, el toque con el que pasabas el diálogo no debe elegir nada en la ventana que se abre
  const t0 = performance.now();
  const guard = (e) => { if (performance.now() - t0 < 350) { e.stopPropagation(); e.preventDefault(); } };
  bg.addEventListener('pointerdown', guard, true);
  bg.addEventListener('click', guard, true);
  document.body.appendChild(bg);
  let closed = false;
  const close = (silent = false) => {
    if (closed) return; closed = true;
    bg.remove();
    document.removeEventListener('keydown', onKey);
    if (!silent) onClose?.();
  };
  const onKey = (e) => { if (e.key === 'Escape' && closable) close(); };
  if (closable) {
    bg.querySelector('.modal-x').addEventListener('click', () => close());
    bg.addEventListener('pointerdown', (e) => { if (e.target === bg) close(); });
    document.addEventListener('keydown', onKey);
  }
  document.activeElement?.blur?.();
  return { el: bg.querySelector('.modal'), close };
}

// ---------- datos estáticos ----------
async function loadStatic() {
  const [parts, chars, moves, types, chart, depts, items] = await Promise.all([
    sb.from('sprite_parts').select('*'),
    sb.from('characters').select('*').eq('enabled', true).order('created_at'),
    sb.from('moves').select('*'),
    sb.from('types').select('*').order('sort'),
    sb.from('type_chart').select('*'),
    sb.from('departments').select('*').order('sort'),
    sb.from('items').select('*').order('sort'),
  ]);
  for (const r of [parts, chars, moves, types, chart, depts, items]) if (r.error) throw new Error(r.error.message);
  S.items = items.data;
  S.itemById = Object.fromEntries(items.data.map(i => [i.id, i]));
  S.parts = Object.fromEntries(parts.data.map(p => [p.id, p]));
  S.chars = chars.data;
  S.charById = Object.fromEntries(chars.data.map(c => [c.id, c]));
  S.moves = Object.fromEntries(moves.data.map(m => [m.id, m]));
  S.universal = moves.data.filter(m => m.universal);
  S.typeList = types.data;
  S.types = Object.fromEntries(types.data.map(t => [t.id, t]));
  S.chart = Object.fromEntries(chart.data.map(r => [`${r.attacker}>${r.defender}`, Number(r.multiplier)]));
  S.depts = depts.data;
  S.deptById = Object.fromEntries(depts.data.map(d => [d.id, d]));
  registerStoryContent();
  const paxi = defaultChar();
  if (paxi) drawSprite($('#brand-sprite'), paxi.sprite, S.parts);
}
// piezas, movimientos y Paximóns rivales del modo historia (viven en el cliente, no en la BBDD)
function registerStoryContent() {
  Object.assign(S.parts, STORY_PARTS);
  for (const [id, m] of Object.entries(STORY_MOVES)) S.moves[id] = m;
  for (const [key, f] of Object.entries(FOES)) {
    const id = 'st-' + key;
    S.charById[id] = { id, slug: key, name: f.name, type: f.type, stats: f.stats, moves: f.moves, sprite: { size: 64, ...f.sprite }, lines: f.lines, description: f.title || '', story: true };
  }
}
// sprite de un Paximón para ponerlo suelto en el mapa (jefes y bots de la historia)
const paxCanvasCache = new Map();
function paxCanvas(key) {
  let cv = paxCanvasCache.get(key);
  if (!cv) {
    const c = S.charById['st-' + key] || S.chars.find(x => x.slug === key);
    if (!c) return null;
    cv = drawSprite(document.createElement('canvas'), c.sprite, S.parts);
    paxCanvasCache.set(key, cv);
  }
  return cv;
}

// ---------- jugador ----------
function savePlayer(p) {
  const prevQuests = JSON.stringify(S.player?.quests || {});
  const samePlayer = S.player?.id === p.id;
  // la historia manda la de esta sesión (lo que devuelve el servidor puede ir por detrás del último guardado)
  if (samePlayer && S.player?.story) p.story = S.player.story;
  S.player = p;
  try { localStorage.setItem(LS_PLAYER, JSON.stringify({ secret: p.secret, id: p.id })); } catch { /* nada */ }
  $('#me-nick').textContent = p.nickname;
  $('#me-record').textContent = `${p.wins}V ${p.losses}D`;
  $('#me-dept').innerHTML = p.department ? deptBadge(p.department) : '';
  avatarCanvas(p.look, deptColor(p.department), 'down', 0, $('#me-avatar'));
  renderCoins();
  $('#me-info').hidden = false;
  $('#chat').hidden = false;
  p.story ||= {};
  S.town?.setMe(meAvatar());
  $('#btn-diary').hidden = false;
  if (S.town && (!samePlayer || prevQuests !== JSON.stringify(p.quests || {}))) S.town.setCtx({ quests: p.quests || {}, story: p.story });
  if (S.town) setTownHud();
  if (S.lobby) trackPresence({ nickname: p.nickname, dept: p.department, look: p.look });
}
const meAvatar = () => ({ id: S.player.id, nickname: S.player.nickname, look: S.player.look, color: deptColor(S.player.department) });
function renderCoins() {
  if (!S.player) return;
  $('#me-coins').textContent = fmtCoins(S.player.coins);
  const n = Object.values(S.player.inventory || {}).reduce((a, b) => a + Number(b || 0), 0);
  $('#me-bag-n').textContent = String(n);
  $('#me-bag-n').hidden = !n;
}
const savedSession = () => { try { return JSON.parse(localStorage.getItem(LS_PLAYER)) || {}; } catch { return {}; } };

// ---------- elegir usuario (antes de entrar y en mitad de la sesión) ----------
// Sin contraseña: se elige de la lista. Los que ya están conectados (según la presencia en tiempo
// real y el latido en la base de datos) salen bloqueados. El navegador que tiene el secret de un
// usuario puede volver a entrar con él aunque su latido siga vivo (p. ej. al recargar).
let usersCache = [];
// sb.channel(nombre) devuelve el canal que ya exista con ese nombre aunque se esté cerrando, y ese
// no vuelve a suscribirse: antes de abrir uno hay que esperar a que se quite el anterior.
async function dropChannel(ch) {
  if (!ch) return;
  try { await sb.removeChannel(ch); } catch { /* nada */ }
}
async function freshChannel(name, opts) {
  for (const c of sb.getChannels()) if (c.topic === 'realtime:' + name) await dropChannel(c);
  return sb.channel(name, opts);
}
let watchP = null;
function watchPresence() {
  watchP ||= (async () => {
    const ch = await freshChannel('lobby', { config: { presence: { key: 'watch-' + TAB_ID } } });
    S.watch = ch.on('presence', { event: 'sync' }, () => { if (isActive('users')) renderUsers(); }).subscribe();
  })();
  return watchP;
}
async function stopWatch() {
  const p = watchP; watchP = null;
  if (p) await p.catch(() => {});
  const ch = S.watch; S.watch = null;
  await dropChannel(ch);
}
function presentIds() {
  const ids = new Set();
  if (S.watch) for (const key of Object.keys(S.watch.presenceState())) if (!key.startsWith('watch-')) ids.add(key);
  return ids;
}
async function showUserPicker(msg) {
  show('users');
  $('#me-info').hidden = true; $('#chat').hidden = true;
  if (msg) toast(msg, true);
  watchPresence();
  $('#users-search').value = '';
  $('#users-list').innerHTML = '<p class="muted blink">Cargando usuarios…</p>';
  const { data, error } = await sb.from('players_public').select('id, nickname, wins, losses, department, look, coins, online, last_seen').order('last_seen', { ascending: false });
  if (error) return toast(error.message, true);
  usersCache = data || [];
  renderUsers();
}
function renderUsers() {
  const q = $('#users-search').value.trim().toLowerCase();
  const present = presentIds(), saved = savedSession();
  const ul = $('#users-list'); ul.innerHTML = '';
  const list = usersCache.filter(p => !q || p.nickname.toLowerCase().includes(q))
    .sort((a, b) => (b.id === saved.id) - (a.id === saved.id));
  for (const p of list) {
    const busy = present.has(p.id) || (p.online && p.id !== saved.id);
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'ucard' + (busy ? ' busy' : '') + (p.id === saved.id ? ' mine' : '');
    b.disabled = busy;
    b.title = busy ? `${p.nickname} ya está conectado ahora mismo` : `Entrar como ${p.nickname}`;
    b.innerHTML = `<canvas></canvas><span class="un">${esc(p.nickname)}</span>${deptBadge(p.department)}
      <span class="muted small">${p.wins}V ${p.losses}D · <img class="coin" src="${coinDataUrl()}" alt="">${fmtCoins(p.coins)}</span>
      ${busy ? '<span class="ustate on">● conectado</span>' : p.id === saved.id ? '<span class="ustate">este navegador</span>' : ''}`;
    avatarCanvas(p.look, deptColor(p.department), 'down', 0, b.querySelector('canvas'));
    b.addEventListener('click', () => loginAs(p));
    ul.appendChild(b);
  }
  if (!list.length) ul.innerHTML = `<p class="muted">${usersCache.length ? 'Nadie con ese nombre.' : 'Todavía no hay nadie: ¡crea el primer usuario!'}</p>`;
}
$('#users-search').addEventListener('input', renderUsers);
$('#btn-new-user').addEventListener('click', renderLogin);
$('#btn-login-back').addEventListener('click', () => showUserPicker());
async function loginAs(p) {
  if (presentIds().has(p.id)) return toast(`${p.nickname} ya está conectado ahora mismo`, true);
  const saved = savedSession();
  try {
    const pl = await withOfficeCode((code) => rpc('login_as', { p_player: p.id, p_secret: saved.id === p.id ? saved.secret : null, p_code: code }));
    await startSession(pl);
  } catch (e) { toast(e.message, true); showUserPicker(); }
}
// Código de oficina: el servidor lo pide para darse de alta o entrar con un usuario desde otro
// dispositivo. Se pregunta la primera vez y el navegador lo recuerda.
async function withOfficeCode(call) {
  let code = null;
  try { code = localStorage.getItem(LS_OFFICE); } catch { /* nada */ }
  for (let tries = 0; ; tries++) {
    try {
      const res = await call(code);
      if (code) try { localStorage.setItem(LS_OFFICE, code); } catch { /* nada */ }
      return res;
    } catch (e) {
      if (!/código de oficina/i.test(e.message) || tries >= 4) throw e;
      try { localStorage.removeItem(LS_OFFICE); } catch { /* nada */ }
      code = await askOfficeCode(!!code);
      if (!code) throw new Error('Sin el código de oficina no se puede entrar.');
    }
  }
}
function askOfficeCode(wrong = false) {
  return new Promise((resolve) => {
    const m = openModal(`<h2>Código de oficina</h2>
      <p class="muted small">${wrong ? '<b>Ese no es.</b> ' : ''}Paximón es para la gente de Páxinas Galegas. Escribe el código de la oficina: solo se pide una vez en cada móvil u ordenador.</p>
      <form class="office-form"><input name="code" maxlength="40" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="código" required>
      <div class="modal-actions"><button class="btn primary" type="submit">Entrar</button></div></form>`, { onClose: () => resolve(null) });
    const form = m.el.querySelector('form'), input = form.querySelector('input');
    setTimeout(() => input.focus(), 50);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = input.value.trim();
      if (!v) return;
      m.close(true);
      resolve(v);
    });
  });
}
async function startSession(pl) {
  savePlayer(pl);
  startHeartbeat();
  joinLobby();
  if (!S.player.department) await profileModal(true);
  const mid = localStorage.getItem(LS_MATCH);
  if (mid) {
    const { data } = await sb.from('matches').select('*').eq('id', mid).single();
    if (data && ['waiting', 'picking', 'active'].includes(data.status) && (data.p1 === S.player.id || data.p2 === S.player.id)) {
      S.returnTo = 'arena';
      await openMatch(data);
      return;
    }
    localStorage.removeItem(LS_MATCH);
  }
  await enterTown();
  toast(`¡Benvido a ${TOWN_NAME}, ${pl.nickname}!`);
}
function startHeartbeat() {
  clearInterval(S.hbTimer);
  S.hbTimer = setInterval(async () => {
    if (!S.player?.secret) return;
    ensureLobby();
    try {
      const r = await rpc('heartbeat', { p_secret: S.player.secret });
      if (r && Number(r.coins) !== Number(S.player.coins)) { S.player.coins = r.coins; renderCoins(); }
    } catch (e) {
      if (/sesión no válida/.test(e.message)) { await endSession(false); showUserPicker('Alguien ha entrado con tu usuario desde otro sitio.'); }
    }
  }, 25000);
}
async function endSession(doLogout = true) {
  clearInterval(S.hbTimer); S.hbTimer = null;
  const pl = S.player;
  if (doLogout && pl?.secret) { try { await rpc('logout', { p_secret: pl.secret }); } catch { /* nada */ } }
  cancelOutInvite();
  S.inInvite?.done?.();
  clearMatch();
  S.local = null;
  await dropChannel(leaveLobby());   // al salir del canal la presencia se va sola (sin gastar un untrack)
  if (S.town) { S.town.stop(); for (const id of S.town.remoteIds()) S.town.remove(id); }
  setDrunk(0);
  Music.stop(); stopVoice();
  S.player = null; S.online = new Map(); S.remotePos = new Map(); S.zone = null; S.pres = {};
  $('#me-info').hidden = true; $('#chat').hidden = true;
}
$('#btn-switch').addEventListener('click', async () => {
  if (!S.player || modalOpen()) return;
  if (S.local || (S.match && S.match.status !== 'waiting')) return toast('Termina el combate antes de cambiar de usuario', true);
  if (!confirm(`¿Salir de ${S.player.nickname} y elegir otro usuario?`)) return;
  if (S.match) { try { await rpc('leave_match', { p_secret: S.player.secret, p_match: S.match.id }); } catch { /* nada */ } }
  await endSession(true);
  showUserPicker();
});
// al cerrar o recargar la pestaña se libera el usuario (para que otro pueda entrar con él)
window.addEventListener('pagehide', () => {
  if (!S.player?.secret || S.demo) return;
  try {
    fetch(`${SUPABASE_URL}/rest/v1/rpc/logout`, {
      method: 'POST', keepalive: true,
      headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json', 'Content-Profile': 'paximon' },
      body: JSON.stringify({ p_secret: S.player.secret }),
    });
  } catch { /* nada */ }
});

// ---------- editor de personaje (alta y perfil) ----------
function lookEditor(root, { dept = null, look = {}, outfits = [] } = {}) {
  const st = { dept, look: normLook(look) };
  root.innerHTML = `<div class="le">
      <div class="le-preview"><canvas></canvas><span class="muted">así te verán</span></div>
      <div class="le-fields">
        <div class="le-label">Departamento</div><div class="le-depts"></div>
        <div class="le-label">Piel</div><div class="le-sw" data-k="skin"></div>
        <div class="le-label">Pelo</div><div class="le-sw" data-k="hair"></div>
        <div class="le-label">Peinado</div><div class="le-styles"></div>
        ${outfits.length ? '<div class="le-label">Complemento (modo historia)</div><div class="le-outfits"></div>' : ''}
      </div>
    </div>`;
  // complementos ganados en la historia
  const outBox = root.querySelector('.le-outfits');
  if (outBox) {
    for (const o of [{ id: '', name: 'Ninguno' }, ...OUTFITS.filter(x => outfits.includes(x.id))]) {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.v = o.id; b.textContent = o.name;
      b.addEventListener('click', () => { if (o.id) st.look.outfit = o.id; else delete st.look.outfit; paint(); });
      outBox.appendChild(b);
    }
  }
  const cv = root.querySelector('.le-preview canvas');
  const paint = () => {
    root.querySelectorAll('.le-depts button').forEach(b => b.classList.toggle('on', b.dataset.id === st.dept));
    root.querySelectorAll('.le-sw button').forEach(b => b.classList.toggle('on', Number(b.dataset.v) === st.look[b.parentElement.dataset.k]));
    root.querySelectorAll('.le-styles button').forEach(b => b.classList.toggle('on', b.dataset.v === st.look.style));
    root.querySelectorAll('.le-outfits button').forEach(b => b.classList.toggle('on', b.dataset.v === (st.look.outfit || '')));
    root.querySelectorAll('.le-styles canvas').forEach(c => avatarCanvas({ ...st.look, style: c.dataset.v }, deptColor(st.dept), 'down', 0, c));
  };
  const depts = root.querySelector('.le-depts');
  for (const d of S.depts) {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.id = d.id;
    b.innerHTML = `<i style="background:${d.color}"></i>${esc(d.name)}`;
    b.addEventListener('click', () => { st.dept = d.id; paint(); });
    depts.appendChild(b);
  }
  for (const [k, list, names] of [['skin', SKINS, null], ['hair', HAIRS, HAIR_NAMES]]) {
    const box = root.querySelector(`.le-sw[data-k="${k}"]`);
    list.forEach((c, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.v = i; b.style.background = c;
      b.title = names ? names[i] : `Tono ${i + 1}`;
      b.addEventListener('click', () => { st.look[k] = i; paint(); });
      box.appendChild(b);
    });
  }
  const styles = root.querySelector('.le-styles');
  for (const s of STYLES) {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.v = s.id;
    b.innerHTML = `<canvas data-v="${s.id}"></canvas><span>${s.name}</span>`;
    b.addEventListener('click', () => { st.look.style = s.id; paint(); });
    styles.appendChild(b);
  }
  let tick = 0;
  const seq = ['down', 'left', 'up', 'right'];
  const timer = setInterval(() => {
    if (!root.isConnected) return clearInterval(timer);
    tick++;
    const dir = seq[Math.floor(tick / 8) % 4];
    avatarCanvas(st.look, deptColor(st.dept), dir, [1, 0, 2, 0][tick % 4], cv);
  }, 170);
  paint();
  avatarCanvas(st.look, deptColor(st.dept), 'down', 0, cv);
  return { get: () => ({ dept: st.dept, look: { ...st.look } }) };
}

let loginEditor = null;
function renderLogin() {
  loginEditor = lookEditor($('#login-look'), { look: { skin: Math.floor(Math.random() * 3), hair: Math.floor(Math.random() * 6), style: STYLES[Math.floor(Math.random() * 4)].id } });
  show('login');
}
$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const v = loginEditor?.get();
  if (!v?.dept) return toast('Elige tu departamento', true);
  try {
    const pl = await withOfficeCode((code) => rpc('register_player', { p_nickname: $('#login-nick').value.trim(), p_department: v.dept, p_look: v.look, p_code: code }));
    $('#login-nick').value = '';
    await startSession(pl);
  } catch (err) { toast(err.message, true); }
});

// perfil: obligatorio para las cuentas anteriores al pueblo, opcional desde la cabecera
function profileModal(forced = false) {
  return new Promise((resolve) => {
    const m = openModal(`<h2>${forced ? '¡Ya hay pueblo!' : 'Tu personaje'}</h2>
      <p class="muted small">${forced ? 'Paximón ahora tiene un pueblo con una casa por departamento. Elige el tuyo y cómo quieres que se vea tu personaje.' : 'Cambia tu departamento o tu aspecto.'}</p>
      <div class="le-host"></div>
      <div class="modal-actions"><button class="btn primary" type="button">Guardar</button></div>`,
    { closable: !forced, cls: 'wide', onClose: () => resolve(false) });
    const ed = lookEditor(m.el.querySelector('.le-host'), { dept: S.player.department, look: S.player.look, outfits: S.player.story?.outfits || [] });
    m.el.querySelector('.modal-actions .btn').addEventListener('click', async () => {
      const v = ed.get();
      if (!v.dept) return toast('Elige tu departamento', true);
      try {
        savePlayer(await rpc('update_profile', { p_secret: S.player.secret, p_department: v.dept, p_look: v.look }));
        m.close(true); resolve(true);
      } catch (e) { toast(e.message, true); }
    });
  });
}
$('#btn-profile').addEventListener('click', () => { if (!modalOpen()) profileModal(false); });

// ---------- voz ----------
// 🔊 voces y efectos (las de ElevenLabs y la voz del navegador de los Paximóns) · 🎵 música
function renderVoiceBtn() {
  const b = $('#btn-voice'); if (b) { b.textContent = AudioPrefs.sfx ? '🔊' : '🔇'; b.title = AudioPrefs.sfx ? 'Silenciar voces y efectos' : 'Activar voces y efectos'; }
  const m = $('#btn-music'); if (m) { m.classList.toggle('off', !AudioPrefs.music); m.title = AudioPrefs.music ? 'Quitar la música' : 'Poner la música'; }
}
$('#btn-voice')?.addEventListener('click', () => {
  const on = !AudioPrefs.sfx;
  AudioPrefs.setSfx(on);
  if (Voice.enabled !== on) Voice.toggle();
  renderVoiceBtn();
});
$('#btn-music')?.addEventListener('click', () => { AudioPrefs.setMusic(!AudioPrefs.music); renderVoiceBtn(); });
$('#btn-diary')?.addEventListener('click', () => { if (S.player && !S.match) Story.diary(); });
if (Voice.enabled !== AudioPrefs.sfx) Voice.toggle();
renderVoiceBtn();

// ---------- fichas de personaje ----------
function charCard(c, { selectable = false } = {}) {
  const el = document.createElement('div');
  el.className = 'pcard' + (selectable ? ' selectable' : '');
  el.dataset.id = c.id;
  el.style.setProperty('--tc', S.types[c.type]?.color || '#9E9E9E');
  const st = c.stats;
  const bar = (v, max, cls) => `<div class="bar"><i class="${cls}" style="width:${Math.round((v / max) * 100)}%"></i></div>`;
  const cha = st.chakra ?? 10;
  const chip = (id) => { const mv = S.moves[id]; return `<span class="chip" style="--tc:${S.types[mv?.type]?.color || '#6E6780'}">${esc(mv?.name || id)}<i>${'◆'.repeat(mv?.cost || 0) || '·'}</i></span>`; };
  el.innerHTML = `<div class="pc-art"><canvas></canvas></div>
    <div class="pc-body">
      <div class="pc-head"><span class="n">${esc(c.name)}</span>${typeBadge(c.type)}</div>
      <div class="desc">${esc(c.description || '')}</div>
      <div class="stats">
        <span>PV</span>${bar(st.hp, 260, 'hp')}<span>${st.hp}</span>
        <span>ATQ</span>${bar(st.atk, 50, 'atk')}<span>${st.atk}</span>
        <span>DEF</span>${bar(st.def, 50, 'def')}<span>${st.def}</span>
        <span>VEL</span>${bar(st.spd, 50, 'spd')}<span>${st.spd}</span>
        <span>CHK</span>${bar(cha, 14, 'k')}<span>${cha}</span>
      </div>
      <div class="mv">${c.moves.map(chip).join('')}</div>
    </div>`;
  drawSprite(el.querySelector('canvas'), c.sprite, S.parts);
  return el;
}
function renderRoster(container, selectable, onPick) {
  container.innerHTML = '';
  for (const c of S.chars) {
    const el = charCard(c, { selectable });
    if (onPick) el.addEventListener('click', () => onPick(c, el));
    container.appendChild(el);
  }
}

// ---------- ayuda ----------
function renderHelp() {
  const beats = {};
  for (const [k, v] of Object.entries(S.chart)) if (v > 1) { const [a, d] = k.split('>'); beats[a] = d; }
  const order = [];
  let cur = S.typeList[0]?.id;
  while (cur && !order.includes(cur)) { order.push(cur); cur = beats[cur]; }
  const wheel = [...order, order[0]].map((t, i) => `${i ? '<span class="arrow">▶</span>' : ''}${typeBadge(t)}`).join('');
  $('#help').innerHTML = `
    <p><b>Turnos alternos.</b> Empieza el Paximón más rápido. Gana quien deje al otro a 0 PV.</p>
    <p><b>Tipos.</b> Cada tipo pega fuerte a uno (x1.5) y flojo a otro (x0.67). Un movimiento del mismo tipo que tu Paximón hace x1.25.</p>
    <div class="wheel">${wheel}</div>
    <p><b class="k">Chakra ◆.</b> Empiezas con 4 y recuperas 2 al recibir el turno. Los golpes fuertes cuestan más. <b>Concentrar</b> da chakra con una ruleta. <b>Gardarse</b> reduce a la mitad el siguiente golpe que recibas y da +1.</p>
    <p><b>Minijuegos.</b> Cada movimiento tiene el suyo: puntería, barra de tiempo, secuencia, carga, ritmo, memoria… Cuanto mejor lo hagas, más pega. Los golpes de coste 6 son una <b>guerra de clics</b> contra el rival, y en los de coste 3 el rival puede <b>esquivar</b> si reacciona a tiempo.</p>
    <p><b>Estrategia.</b> Pega con tu tipo fuerte, guárdate cuando el rival tenga chakra para un golpe grande y aprovecha sus turnos de Concentrar para subir stats o curarte.</p>`;
}

// ---------- presencia (quién está conectado y dónde) ----------
// Realtime cierra el canal a quien manda más de 5 actualizaciones de Presence en 30 s
// (ClientPresenceRateLimitReached): el jugador desaparecía para los demás y dejaba de verlos a ellos.
// Por eso la presencia solo lleva lo que cambia poco (quién eres, zona y mapa) y con tope de envíos,
// y la posición viaja por Broadcast: `step` al andar y `pos` al pararse, al cambiar de zona o de mapa
// y cuando llega alguien nuevo. Si el servidor cierra el canal, se vuelve a abrir solo.
const PRES_MAX = 4, PRES_WINDOW = 30000;
async function joinLobby() {
  const gen = ++S.lobbyGen;
  clearTimeout(S.relobbyTimer);
  S.lobbyReady = false; S.lobbyJoining = true;
  const old = S.lobby; S.lobby = null;
  await stopWatch();
  await dropChannel(old);
  const ch = await freshChannel('lobby', { config: { presence: { key: S.player?.id } } });
  if (gen !== S.lobbyGen || !S.player) return dropChannel(ch);
  S.lobbyJoining = false;
  S.pres = { ...S.pres, nickname: S.player.nickname, dept: S.player.department, look: S.player.look, zone: S.zone, tab: TAB_ID };
  S.lobby = ch
    .on('presence', { event: 'sync' }, onPresence)
    // alguien acaba de llegar (no una simple actualización): que sepa dónde estamos
    .on('presence', { event: 'join' }, ({ key, currentPresences }) => { if (key !== S.player?.id && !currentPresences?.length) announcePos(300 + Math.random() * 900); })
    .on('presence', { event: 'leave' }, ({ key, currentPresences }) => { if (!currentPresences?.length) S.remotePos.delete(key); })
    .on('broadcast', { event: 'lobby' }, () => { if (isActive('arena')) refreshRooms(); })
    .on('broadcast', { event: 'chat' }, ({ payload }) => { if (!S.match || S.local) onChat(payload); })
    .on('broadcast', { event: 'emote' }, ({ payload }) => { if (!S.match || S.local) onEmote(payload); })
    .on('broadcast', { event: 'step' }, ({ payload }) => onRemoteSteps(payload))
    .on('broadcast', { event: 'pos' }, ({ payload }) => onRemotePos(payload))
    .on('broadcast', { event: 'invite' }, ({ payload }) => onInvite(payload))
    .on('broadcast', { event: 'invite_reply' }, ({ payload }) => onInviteReply(payload))
    .on('broadcast', { event: 'invite_cancel' }, ({ payload }) => onInviteCancel(payload))
    .on('broadcast', { event: 'notes' }, () => { refreshBoardCount(); S.board?.reload(); })
    .subscribe((status, err) => {
      if (gen !== S.lobbyGen) return;
      if (status === 'SUBSCRIBED') {
        // también al reconectar: el servidor ha perdido nuestra presencia, hay que mandarla de nuevo
        S.lobbyReady = true; S.presLast = null;
        trackPresence(); announcePos(100);
        return;
      }
      S.lobbyReady = false;
      console.warn('[paximon] canal lobby:', status, err || '');
      // CHANNEL_ERROR y TIMED_OUT los reintenta la propia librería; CLOSED es definitivo (p. ej. si el
      // servidor nos echa por pasarnos del límite de presencia) y hay que abrir un canal nuevo
      if (status === 'CLOSED') relobby(gen);
    });
}
function relobby(gen, wait = 2000 + Math.random() * 2000) {
  clearTimeout(S.relobbyTimer);
  S.relobbyTimer = setTimeout(() => { if (gen === S.lobbyGen && S.player) joinLobby(); }, wait);
}
// por si acaso: al volver a la pestaña o recuperar la red, comprobar que seguimos en el canal
function ensureLobby() {
  if (!S.player || S.lobbyJoining) return;
  if (!S.lobby || S.lobby.state === 'closed') joinLobby();
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) ensureLobby(); });
window.addEventListener('online', ensureLobby);
function leaveLobby() {
  S.lobbyGen++;
  clearTimeout(S.relobbyTimer); clearTimeout(S.presTimer); clearTimeout(S.posTimer);
  S.presTimer = null; S.presLast = null; S.lobbyJoining = false;
  const ch = S.lobby; S.lobby = null; S.lobbyReady = false;
  return ch;
}
// Presencia con tope: como mucho PRES_MAX envíos por ventana de PRES_WINDOW, agrupando los cambios
// seguidos en uno y solo si cambia algo que ven los demás (no la casilla en la que estás)
function trackPresence(patch = {}) {
  Object.assign(S.pres, patch);
  if (!S.lobby || !S.lobbyReady || S.presTimer) return;
  const now = Date.now();
  S.presSent = S.presSent.filter(t => now - t < PRES_WINDOW);
  const wait = S.presSent.length < PRES_MAX ? 300 : S.presSent[0] + PRES_WINDOW - now + 500;
  S.presTimer = setTimeout(sendPresence, wait);
}
function sendPresence() {
  S.presTimer = null;
  if (!S.lobby || !S.lobbyReady) return;
  const { nickname, dept, look, zone, map, tab } = S.pres;
  const key = JSON.stringify({ nickname, dept, look, zone, map, tab });
  if (key === S.presLast) return;
  const now = Date.now();
  S.presSent = S.presSent.filter(t => now - t < PRES_WINDOW);
  if (S.presSent.length >= PRES_MAX) return trackPresence();
  S.presSent.push(now); S.presLast = key;
  const ch = S.lobby;
  ch.track({ ...S.pres }).then((r) => {
    if (r !== 'ok' && ch === S.lobby && S.presLast === key) { S.presLast = null; trackPresence(); }
  }, () => { if (ch === S.lobby && S.presLast === key) S.presLast = null; });
}
function setZone(zone, extra = {}) {
  S.zone = zone;
  trackPresence({ zone, ...extra });
  announcePos(50);
}
// dónde estoy, por Broadcast (no cuenta para el límite de presencia)
function announcePos(delay = 0) {
  clearTimeout(S.posTimer);
  S.posTimer = setTimeout(() => {
    if (!S.lobby || !S.lobbyReady || !S.player || !S.zone) return;
    const p = S.pres;
    S.lobby.send({ type: 'broadcast', event: 'pos', payload: { id: S.player.id, z: S.zone, m: p.map || 'vila', x: p.x, y: p.y, d: p.dir } });
  }, delay);
}
function onRemotePos(p) {
  if (!p?.id || !S.player || p.id === S.player.id) return;
  const pos = { at: Date.now() };
  if (typeof p.z === 'string') pos.zone = p.z;
  if (typeof p.m === 'string') pos.map = p.m;
  if (Number.isInteger(p.x) && Number.isInteger(p.y)) { pos.x = p.x; pos.y = p.y; }
  if (typeof p.d === 'string') pos.dir = p.d;
  S.remotePos.set(p.id, { ...S.remotePos.get(p.id), ...pos });
  const m = S.online.get(p.id);
  if (!m) return;   // aún no ha llegado su presencia: se junta en onPresence
  const moved = m.zone !== pos.zone || (m.map || 'vila') !== (pos.map || 'vila');
  Object.assign(m, pos);
  syncTownPlayers();
  if (moved && isActive('arena')) renderOnline();
}
function onRemoteSteps(p) {
  if (!p?.id || !S.player || p.id === S.player.id || !Array.isArray(p.s) || !p.s.length) return;
  const last = p.s[p.s.length - 1], map = p.m || 'vila';
  if (!Array.isArray(last) || !Number.isInteger(last[0]) || !Number.isInteger(last[1])) return;
  const pos = { zone: 'town', map, x: last[0], y: last[1], dir: last[2], at: Date.now() };
  S.remotePos.set(p.id, { ...S.remotePos.get(p.id), ...pos });
  // primero los pasos (si ya lo vemos, anda hasta ahí); si no lo veíamos, aparece en la última casilla
  if (S.zone === 'town' && map === S.town?.mapId) S.town.steps(p.id, p.s, p.r);
  const m = S.online.get(p.id);
  if (!m) return;
  const moved = m.zone !== 'town' || (m.map || 'vila') !== map;
  Object.assign(m, pos);
  if (moved) { syncTownPlayers(); if (isActive('arena')) renderOnline(); }
}
function onPresence() {
  if (!S.lobby) return;
  const online = new Map();
  for (const [id, metas] of Object.entries(S.lobby.presenceState())) {
    const m = metas[metas.length - 1];
    // la presencia puede ir por detrás: lo último que llegó por Broadcast manda
    if (m) online.set(id, { ...m, ...S.remotePos.get(id) });
  }
  S.online = online;
  $('#town-online').textContent = String(online.size);
  if (isActive('arena')) renderOnline();
  syncTownPlayers();
}
function syncTownPlayers() {
  if (!S.town || !S.player) return;
  const seen = new Set();
  for (const [id, m] of S.online) {
    if (id === S.player.id || m.zone !== 'town' || (m.map || 'vila') !== S.town.mapId) continue;
    seen.add(id);
    S.town.upsert(id, { nickname: m.nickname, color: deptColor(m.dept), look: m.look, x: m.x, y: m.y, dir: m.dir });
  }
  for (const id of S.town.remoteIds()) if (!seen.has(id)) S.town.remove(id);
}

// pasos en el pueblo: se agrupan y se mandan como mucho cada 180 ms
let stepBuf = [], stepRun = false, stepTimer = null;
function queueStep(x, y, dir, run) {
  stepBuf.push([x, y, dir]); stepRun = run;
  if (!stepTimer) stepTimer = setTimeout(flushSteps, 180);
}
function flushSteps() {
  stepTimer = null;
  if (!stepBuf.length || !S.lobby || !S.lobbyReady || !S.player) { stepBuf = []; return; }
  S.lobby.send({ type: 'broadcast', event: 'step', payload: { id: S.player.id, s: stepBuf, r: stepRun, m: S.town?.mapId || 'vila' } });
  stepBuf = [];
}
function savePos(pos) { try { localStorage.setItem(LS_POS, JSON.stringify(pos)); } catch { /* nada */ } }
function loadPos() { try { return JSON.parse(localStorage.getItem(LS_POS)); } catch { return null; } }

// ---------- pueblo ----------
function ensureTown() {
  if (S.town) return S.town;
  S.town = new Town({
    wrap: $('#town-wrap'),
    dialog: $('#town-dialog'),
    depts: S.depts,
    quests: S.player?.quests || {},
    story: S.player?.story || {},
    typeColors: S.typeList.map(t => t.color),
    // en una escena de la historia no se anda, pero los diálogos sí avanzan
    isBlocked: () => modalOpen() || !isActive('town') || S.inGame || (S.cutscene && !S.town?.dialog && !S.town?.scripted),
    onPortal,
    onPlayer: (id) => playerCard(id),
    onInteract,
    onAction: onTownAction,
    onMap: onMapChange,
    onLine: onDialogLine,
    onTalk: (npc) => (S.player ? Story.onTalk(npc) : false),
    onTrap: (t) => Story.onTrap(t),
    npcImage: (pax) => paxCanvas(pax),
    ledRows: (o) => (o.interact === 'departures' ? ledRows() : []),
    onStep: (x, y, dir, run) => { queueStep(x, y, dir, run); S.pres.x = x; S.pres.y = y; S.pres.dir = dir; },
    // al pararse: la posición va por Broadcast; la presencia no se toca (tiene límite de envíos)
    onIdle: () => { const pos = S.town.getPos(); savePos(pos); Object.assign(S.pres, pos); announcePos(); },
  });
  S.town.setMe(meAvatar());
  S.town.setDrunk(S.drunk);
  refreshBoardCount();
  return S.town;
}
async function enterTown(spawn) {
  clearMatch();
  S.local = null;
  show('town');
  dockChat(false);
  setChatScope('Chat general');
  const t = ensureTown();
  t.start(spawn || loadPos());
  const pos = t.getPos();
  setTownHud();
  setZone('town', pos);
  syncTownPlayers();
  Music.play(musicForMap(t.mapId));
  if (!S.cutscene) setTimeout(() => { if (isActive('town') && S.player) Story.onMapEnter(t.mapId); }, 700);
}
function setTownHud() {
  const id = S.town?.mapId || 'vila';
  $('#town-name').textContent = S.town?.map?.name || TOWN_NAME;
  $('#town-drunk').textContent = S.drunk ? ' · ' + '🍷'.repeat(S.drunk) : '';
  const goal = S.player ? Story.objective() : '';
  const g = $('#town-goal');
  if (g) { g.textContent = goal ? '📌 ' + goal : ''; g.hidden = !goal; }
  document.body.dataset.map = id;
}
// al pasar a otro mapa (salidas del pueblo, puertas de las casas y de la cafetería…)
function onMapChange(mapId, pos) {
  stepBuf = []; clearTimeout(stepTimer); stepTimer = null;
  savePos(pos);
  setTownHud();
  trackPresence({ map: mapId, x: pos.x, y: pos.y, dir: pos.dir });
  announcePos();
  syncTownPlayers();
  refreshBoardCount();
  Music.play(musicForMap(mapId));
  if (S.player) Story.onMapEnter(mapId);
}
// cada línea de diálogo: si tiene voz grabada, suena (y la música baja mientras habla)
function onDialogLine(e) {
  if (!e) return stopVoice();
  const cast = e.cast || castOf(e.who);
  if (cast && hasVoice(cast, e.text)) sayVoice(cast, e.text);
  else stopVoice();
}
// la historia cambió algo del mundo (capítulo, un jefe derrotado…): rehacer el mapa actual
function refreshWorld() {
  if (!S.town) return;
  S.town.setCtx({ story: S.player?.story || {} });
  syncTownPlayers();
  setTownHud();
}
function onPortal(p) {
  switch (p.kind) {
    case 'arena': return enterArena();
    case 'house':
      // cada casa de departamento tiene su oficina por dentro (Programación es una mazmorra)
      if (!Story.canEnterHouse(p.dept)) return;
      sfx('door');
      return S.town.startWarp(p.dept === 'programacion' ? { map: 'programacion', x: 11, y: 12, dir: 'up' } : houseEntry(p.dept));
    case 'maricarmen': {
      const q = S.player?.quests?.maricarmen?.result;
      return S.town.showDialog(null, q === 'lost' ? DIO_HOUSE_DOOR : q === 'won' ? MARICARMEN_HOME : MARICARMEN_DOOR);
    }
    case 'door': return S.town.showDialog(null, p.lines);
  }
}
function onInteract(o) {
  if (S.player && Story.onInteract(o)) return;
  switch (o.interact) {
    case 'board': return boardModal();
    case 'departures': return departuresModal();
    case 'caseta': return casetaTalk(o.data);
    case 'dept_board': return houseModal(o.data?.dept);
  }
}
function onTownAction(action, npc) {
  switch (action) {
    case 'shop': return shopModal();
    case 'dio_battle': return startDioBattle();
    case 'albarino': return playWine(npc?.caseta);
  }
}

// ficha de otro jugador (clic en el pueblo o hablarle de frente)
async function playerCard(id) {
  const m = S.online.get(id);
  if (!m || modalOpen()) return;
  const { data } = await sb.from('players_public').select('wins, losses').eq('id', id).maybeSingle();
  const busy = m.zone === 'battle';
  const mo = openModal(`<div class="who-card">
      <canvas class="av-big"></canvas>
      <div><h2>${esc(m.nickname)}</h2>${deptBadge(m.dept)}
      <p class="muted small">${data ? `${data.wins}V ${data.losses}D` : ''} · ${zoneText(m.zone, m.map)}</p></div>
    </div>
    <div class="modal-actions"><button class="btn primary" type="button" ${busy ? 'disabled' : ''}>⚔ Retar a un combate</button></div>`);
  avatarCanvas(m.look, deptColor(m.dept), 'down', 0, mo.el.querySelector('canvas'));
  mo.el.querySelector('.modal-actions .btn').addEventListener('click', () => { mo.close(); challenge(id); });
}
const zoneText = (z, map) => (z === 'town' && map && map !== 'vila' ? `en ${MAP_NAMES[map] || 'el pueblo'}`
  : ({ town: 'en el pueblo', arena: 'en la Arena', battle: 'en combate' }[z] || 'conectado'));

// casa de un departamento: miembros, balance y puesto
async function deptTable() {
  const { data } = await sb.from('players_public').select('department, wins, losses').not('department', 'is', null);
  const agg = Object.fromEntries(S.depts.map(d => [d.id, { id: d.id, members: 0, wins: 0, losses: 0 }]));
  for (const p of data || []) { const a = agg[p.department]; if (a) { a.members++; a.wins += p.wins; a.losses += p.losses; } }
  return Object.values(agg).sort((a, b) => b.wins - a.wins || a.losses - b.losses || b.members - a.members);
}
async function houseModal(deptId) {
  const d = S.deptById[deptId];
  if (!d || modalOpen()) return;
  const [{ data: members }, table] = await Promise.all([
    sb.from('players_public').select('id, nickname, wins, losses, look').eq('department', deptId).order('wins', { ascending: false }).order('losses'),
    deptTable(),
  ]);
  const me = table.find(t => t.id === deptId);
  const rank = table.indexOf(me) + 1;
  const mine = S.player.department === deptId;
  const mo = openModal(`<div class="house-head" style="--c:${d.color}">
      <h2>Casa de ${esc(d.name)}</h2>${mine ? '<span class="tag">Tu casa</span>' : ''}
    </div>
    <p class="muted small">${me.members
      ? `${me.members} ${me.members === 1 ? 'miembro' : 'miembros'} · ${me.wins}V ${me.losses}D entre todos · puesto ${rank}º de ${table.filter(t => t.members).length} en el ranking de departamentos`
      : 'Sin vecinos todavía: ¿quién será el primero?'}</p>
    <ul class="list members"></ul>
    <p class="muted small">¡A defender el honor del departamento en la Arena!</p>`, { cls: 'wide' });
  const ul = mo.el.querySelector('.members');
  if (!members?.length) ul.innerHTML = '<li class="muted">Todavía no vive nadie aquí</li>';
  for (const p of members || []) {
    const on = S.online.get(p.id);
    const li = document.createElement('li');
    li.innerHTML = `<span class="who"><canvas class="av"></canvas><span class="dot ${on ? 'on' : ''}"></span>${esc(p.nickname)}${p.id === S.player.id ? ' <span class="muted">(tú)</span>' : ''}</span><span class="muted">${p.wins}V ${p.losses}D</span>`;
    avatarCanvas(p.look, d.color, 'down', 0, li.querySelector('canvas'));
    if (on && p.id !== S.player.id && on.zone !== 'battle') {
      const b = document.createElement('button'); b.className = 'btn small'; b.textContent = 'Retar';
      b.addEventListener('click', () => { mo.close(); challenge(p.id); });
      li.appendChild(b);
    }
    ul.appendChild(li);
  }
}

// ---------- tablón de anuncios (notas persistentes, en una ventana IPaxMsg) ----------
const EVERYONE = 'Todo o pobo';
const pad2 = (n) => String(n).padStart(2, '0');
function stamp(iso, withDate = true) {
  const d = new Date(iso || Date.now());
  const hm = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  return withDate && d.toDateString() !== new Date().toDateString() ? `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)} ${hm}` : hm;
}
const ipmWindowHead = (title, closeBtn = false) => `
  <div class="ipm-titlebar"><img class="ipm-ico" src="${logoDataUrl()}" alt=""><span class="ipm-title">${esc(title)}</span>
    <span class="ipm-winbtns" aria-hidden="${!closeBtn}"><i>—</i><i>☐</i>${closeBtn ? '<button type="button" class="ipm-x" aria-label="Cerrar">✕</button>' : '<i>✕</i>'}</span></div>
  <div class="ipm-menu" aria-hidden="true"><span>File</span><span>Settings</span><span>Window</span><span>Print</span><span>Help</span></div>`;

async function refreshBoardCount() {
  if (!S.town) return;
  const seen = Number(localStorage.getItem(LS_NOTES_SEEN) || 0);
  const [all, fresh] = await Promise.all([
    sb.from('notes').select('id', { count: 'exact', head: true }),
    sb.from('notes').select('id', { count: 'exact', head: true }).gt('id', seen),
  ]);
  const n = fresh.count || 0;
  S.town.setLabel('board', n ? `TABLÓN · ${n} ${n === 1 ? 'nueva' : 'nuevas'}` : `TABLÓN · ${all.count || 0}`);
}

function boardModal() {
  if (modalOpen()) return;
  const seenBefore = Number(localStorage.getItem(LS_NOTES_SEEN) || 0);
  const deptOpts = S.depts.map(d => `<option value="${d.id}">${esc(d.name)}</option>`).join('');
  const mo = openModal(`${ipmWindowHead(`${APP_NAME} LogViewer — Tablón de ${TOWN_NAME}`, true)}
    <div class="ipm-tabs"><span class="ipm-tab">Tablón <b>×</b></span><span class="ipm-plus">+</span></div>
    <div class="ipm-toolbar">
      <div class="ipm-tools" aria-hidden="true"><span class="ico">⤓</span><span class="ico">−</span><span class="ico">🗎</span></div>
      <select class="f-user" title="Filtrar por autor"><option value="">All Users</option></select>
      <div class="ipm-tools" aria-hidden="true"><span class="ico">✎</span></div>
      <select class="f-period" title="Filtrar por fecha"><option value="">Entire period</option><option value="1">Today</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option></select>
      <div class="ipm-tools" aria-hidden="true"><span class="ico">⭐</span><span class="ico">📋</span><span class="ico">📷</span><span class="ico">📎</span><span class="ico">✉</span></div>
      <select class="f-to" title="Filtrar por destino"><option value=""></option><option value="*">${EVERYONE}</option><option value="mine">Para mi departamento</option>${deptOpts}</select>
    </div>
    <div class="ipm-log"></div>
    <form class="ipm-compose">
      <div class="row1">Para: <select class="to"><option value="">${EVERYONE}</option>${deptOpts}</select><span class="cnt">0/500</span></div>
      <div class="row2"><textarea maxlength="500" placeholder="Escribe una nota para el tablón… (Ctrl+Enter para colgarla)"></textarea><button class="ipm-btn" type="submit">Send</button></div>
    </form>
    <div class="ipm-status"><span class="st"></span><span>Las notas se quedan colgadas hasta que su autor las quite</span></div>`,
  { cls: 'ipm-modal ipm', onClose: () => { S.board = null; } });
  const el = mo.el, log = el.querySelector('.ipm-log');
  el.querySelector('.ipm-x').addEventListener('click', () => mo.close());
  const fUser = el.querySelector('.f-user'), fPeriod = el.querySelector('.f-period'), fTo = el.querySelector('.f-to');
  let notes = [];

  const render = () => {
    const user = fUser.value, days = Number(fPeriod.value || 0), to = fTo.value;
    const since = days ? new Date(new Date().setHours(0, 0, 0, 0) - (days - 1) * 86400000) : null;
    const list = notes.filter(n => (!user || n.author_nick === user)
      && (!since || new Date(n.created_at) >= since)
      && (!to || (to === '*' ? !n.to_dept : to === 'mine' ? n.to_dept === S.player.department : n.to_dept === to)));
    log.innerHTML = list.length ? '' : `<div class="ipm-empty">${notes.length ? 'No hay notas con esos filtros.' : '¡El tablón está vacío! Cuelga la primera nota.'}</div>`;
    // el encargo del modo historia queda clavado arriba del tablón
    if (S.player?.story?.ch && S.player.story.ch !== 'fin') {
      const pin = document.createElement('div');
      pin.className = 'ipm-entry pinned';
      pin.innerHTML = `<div class="ipm-head"><span class="t">📌</span><span class="arr">⇦</span><span class="nm">Rosalía (Edición)</span><span class="arr">⇨</span><span class="nm">${esc(S.player.nickname)}</span><span class="ipm-new">ENCARGO</span></div><div class="ipm-text"></div>`;
      pin.querySelector('.ipm-text').textContent = Story.objective();
      log.prepend(pin);
    }
    for (const n of list) {
      const mine = n.author === S.player.id, forMe = n.to_dept && n.to_dept === S.player.department;
      const d = document.createElement('div');
      d.className = 'ipm-entry' + (mine ? ' mine' : '') + (forMe ? ' forme' : '');
      const toName = n.to_dept ? (S.deptById[n.to_dept]?.name || n.to_dept) : EVERYONE;
      d.innerHTML = `<div class="ipm-head"><span class="t">${stamp(n.created_at)}</span>${n.id > seenBefore && !mine ? '<span class="ipm-new">NUEVA</span>' : ''}
        <span class="arr">⇦</span><span class="nm dp" style="--c:${deptColor(n.author_dept)}">${esc(n.author_nick)}</span>
        <span class="arr">⇨</span><span class="nm${n.to_dept ? ' dp' : ''}" style="--c:${deptColor(n.to_dept)}">${esc(toName)}</span>
        ${mine ? '<button type="button" class="ipm-del">Quitar</button>' : ''}</div><div class="ipm-text"></div>`;
      d.querySelector('.ipm-text').textContent = n.text;
      d.querySelector('.ipm-del')?.addEventListener('click', async () => {
        if (!confirm('¿Quitar esta nota del tablón?')) return;
        try { await rpc('delete_note', { p_secret: S.player.secret, p_id: n.id }); await reload(); } catch (e) { toast(e.message, true); }
      });
      log.appendChild(d);
    }
    log.scrollTop = log.scrollHeight;
    el.querySelector('.st').textContent = `${list.length} de ${notes.length} ${notes.length === 1 ? 'nota' : 'notas'}`;
  };
  let timer = null;
  const reload = () => new Promise((resolve) => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const { data, error } = await sb.from('notes').select('*').order('created_at', { ascending: false }).limit(300);
      if (error) { toast(error.message, true); return resolve(); }
      notes = data.reverse();
      const authors = [...new Set(notes.map(n => n.author_nick))].sort((a, b) => a.localeCompare(b));
      const cur = fUser.value;
      fUser.innerHTML = '<option value="">All Users</option>' + authors.map(a => `<option>${esc(a)}</option>`).join('');
      fUser.value = authors.includes(cur) ? cur : '';
      render();
      const maxId = notes.reduce((m, n) => Math.max(m, n.id), 0);
      if (maxId > Number(localStorage.getItem(LS_NOTES_SEEN) || 0)) localStorage.setItem(LS_NOTES_SEEN, String(maxId));
      refreshBoardCount();
      resolve();
    }, 120);
  });
  for (const f of [fUser, fPeriod, fTo]) f.addEventListener('change', render);

  const form = el.querySelector('.ipm-compose'), ta = form.querySelector('textarea'), cnt = form.querySelector('.cnt');
  ta.addEventListener('input', () => { cnt.textContent = `${ta.value.length}/500`; });
  ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); form.requestSubmit(); } });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = ta.value.trim();
    if (!text) return ta.focus();
    const btn = form.querySelector('button'); btn.disabled = true;
    try {
      await rpc('post_note', { p_secret: S.player.secret, p_text: text, p_to_dept: form.querySelector('.to').value || null });
      ta.value = ''; cnt.textContent = '0/500';
      await reload();
    } catch (err) { toast(err.message, true); }
    btn.disabled = false;
  });
  S.board = { reload };
  reload();
}

// ---------- paxicoins, tienda y mochila ----------
const coinImg = () => `<img class="coin" src="${coinDataUrl()}" alt="paxicoins">`;
function itemEffects(it) {
  const e = [];
  if (it.heal_pct) e.push(`<span class="fx-hp">+${it.heal_pct} % PV</span>`);
  if (it.chakra) e.push(`<span class="fx-ck">+${it.chakra} ◆</span>`);
  return e.join(' ');
}
// La cafetería de Diego y Sabrina: pizarra con los consumibles y banderas de Venezuela
function shopModal() {
  if (modalOpen() || !S.player) return;
  const items = S.items.filter(i => i.shop === 'cafeteria');
  const mo = openModal(`<div class="shop">
      <div class="shop-flag"><i></i><i></i><i></i></div>
      <div class="shop-top"><canvas class="shop-av"></canvas><div><h2>Cafetería Diego &amp; Sabrina</h2>
        <p class="muted small">Todo se paga en paxicoins. Los consumibles se toman en mitad de un combate: uno por turno y sin gastar el turno.</p></div><canvas class="shop-av"></canvas></div>
      <div class="shop-list"></div>
      <div class="shop-foot"><span>Tienes ${coinImg()} <b class="shop-coins"></b> paxicoins</span><span class="muted small">Se ganan 2 por cada combate ganado</span></div>
    </div>`, { cls: 'wide shop-modal' });
  const staff = mo.el.querySelectorAll('.shop-av');
  for (const [cv, id] of [[staff[0], 'diego'], [staff[1], 'sabrina']]) { const n = S.town?.npcById(id); if (n) avatarCanvas(n.look, n.shirt, 'down', 0, cv, n.extras); else cv.remove(); }
  const list = mo.el.querySelector('.shop-list'), coinsEl = mo.el.querySelector('.shop-coins');
  const paint = () => {
    coinsEl.textContent = fmtCoins(S.player.coins);
    list.querySelectorAll('.shop-row').forEach(r => {
      const it = S.itemById[r.dataset.id], q = Number(r.querySelector('.qty b').textContent);
      r.querySelector('.have').textContent = `tienes ${S.player.inventory?.[it.id] || 0}`;
      r.querySelector('.buy').disabled = Number(S.player.coins) < it.price * q;
      r.querySelector('.buy span').textContent = fmtCoins(it.price * q);
    });
  };
  for (const it of items) {
    const row = document.createElement('div');
    row.className = 'shop-row'; row.dataset.id = it.id;
    row.innerHTML = `<div class="ico"></div><div class="info"><b>${esc(it.name)}</b><span class="small muted">${esc(it.description || '')}</span>
      <span class="small">${itemEffects(it)} · <span class="have muted"></span></span></div>
      <div class="price">${coinImg()}${fmtCoins(it.price)}</div>
      <div class="qty"><button type="button" data-d="-1">−</button><b>1</b><button type="button" data-d="1">+</button></div>
      <button class="btn primary small buy" type="button">Comprar · <span></span></button>`;
    row.querySelector('.ico').appendChild(itemCanvas(it.id));
    row.querySelectorAll('.qty button').forEach(b => b.addEventListener('click', () => {
      const el = row.querySelector('.qty b'); el.textContent = String(Math.max(1, Math.min(10, Number(el.textContent) + Number(b.dataset.d)))); paint();
    }));
    row.querySelector('.buy').addEventListener('click', async (ev) => {
      const btn = ev.currentTarget; btn.disabled = true;
      const qty = Number(row.querySelector('.qty b').textContent);
      try {
        savePlayer(await rpc('buy_item', { p_secret: S.player.secret, p_item: it.id, p_qty: qty }));
        const [who, line] = SHOP_THANKS[Math.floor(Math.random() * SHOP_THANKS.length)];
        toast(`${who}: ${line}`);
        const n = S.town?.npcById(who.toLowerCase()); if (n) S.town.npcSay(n, line);
      } catch (e) { toast(e.message, true); }
      paint();
    });
    list.appendChild(row);
  }
  paint();
}
// Mochila: lo que llevas. En combate devuelve el objeto elegido para usarlo.
function bagModal({ battle = false } = {}) {
  return new Promise((resolve) => {
    if (modalOpen() || !S.player) return resolve(null);
    const inv = Object.entries(S.player.inventory || {}).filter(([, n]) => n > 0);
    const mo = openModal(`<h2>🎒 Mochila</h2>
      <p class="muted small">${coinImg()} ${fmtCoins(S.player.coins)} paxicoins${battle ? ' · Elige qué tomar (no gasta el turno, uno por turno).' : ' · Los consumibles se usan en combate, desde el botón Mochila.'}</p>
      <div class="bag-list"></div>`, { cls: 'bag-modal', onClose: () => resolve(null) });
    const box = mo.el.querySelector('.bag-list');
    if (!inv.length) box.innerHTML = '<p class="muted">Está vacía. Pásate por la cafetería de Diego y Sabrina (al este del pueblo, por la rúa do medio).</p>';
    for (const [id, n] of inv) {
      const it = S.itemById[id]; if (!it) continue;
      const row = document.createElement('div'); row.className = 'bag-row';
      row.innerHTML = `<div class="ico"></div><div class="info"><b>${esc(it.name)}</b> <span class="muted">x${n}</span><span class="small">${itemEffects(it)}</span></div>`;
      row.querySelector('.ico').appendChild(itemCanvas(id));
      if (battle) {
        const b = document.createElement('button'); b.className = 'btn primary small'; b.type = 'button'; b.textContent = 'Tomar';
        b.addEventListener('click', () => { mo.close(true); resolve(id); });
        row.appendChild(b);
      }
      box.appendChild(row);
    }
  });
}
$('#btn-bag').addEventListener('click', () => { if (!S.match || S.match.status !== 'active') bagModal(); });

// ---------- estación: panel de salidas (todos los trenes con retraso, y el de Albacete «próximamente») ----------
const BOOT = Date.now();
const hhmm = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
function trainRows(now = Date.now()) {
  const grow = Math.floor((now - BOOT) / 60000);   // los retrasos crecen mientras miras
  const at = (min) => hhmm(new Date(Math.floor(now / 60000) * 60000 + min * 60000));
  const delay = (m) => (m >= 60 ? `${Math.floor(m / 60)} H ${pad2(m % 60)} MIN` : `${m} MIN`);
  return [
    { hora: '--:--', dest: 'ALBACETE', tren: 'MD', via: '1', obs: 'LLEGADA PRÓXIMAMENTE', albacete: true },
    { hora: at(-180), dest: 'LUGO', tren: 'REGIONAL', via: '2', obs: 'RETRASADO DESDE AYER' },
    { hora: at(-95), dest: 'MADRID-CHAMARTÍN', tren: 'ALVIA', via: '2', obs: `RETRASO ${delay(118 + grow * 2)}` },
    { hora: at(-40), dest: 'SANTIAGO DE COMPOSTELA', tren: 'REGIONAL', via: '1', obs: `RETRASO ${delay(43 + grow)}` },
    { hora: at(-22), dest: 'VIGO-GUIXAR', tren: 'MD', via: '2', obs: `RETRASO ${delay(27 + grow)}` },
    { hora: at(-8), dest: 'A CORUÑA', tren: 'ALVIA', via: '1', obs: `RETRASO ${delay(72 + grow * 3)}` },
    { hora: at(6), dest: 'PONTEVEDRA', tren: 'REGIONAL', via: '2', obs: `RETRASO ${delay(19 + grow)}` },
    { hora: at(25), dest: 'OURENSE', tren: 'MD', via: '1', obs: `RETRASO ${delay(35 + grow * 2)}` },
  ];
}
function ledRows() {
  const r = trainRows();
  return [
    { text: 'PRÓXIMAMENTE: TREN CON DESTINO ALBACETE · VÍA 1 · LLEGADA INMINENTE', color: '#7CFC8A' },
    { text: r.slice(1).map(t => `${t.hora} ${t.dest} ${t.obs}`).join('   ·   '), color: '#FFB300' },
  ];
}
function departuresModal() {
  if (modalOpen()) return;
  const mo = openModal(`<div class="dep">
      <div class="dep-head"><span>SALIDAS · DEPARTURES</span><span class="dep-clock"></span></div>
      <div class="dep-grid"></div>
      <div class="dep-ticker"><span>INFORMAMOS: EL TREN CON DESTINO ALBACETE EFECTUARÁ SU LLEGADA PRÓXIMAMENTE POR VÍA 1. TODOS LOS DEMÁS TRENES CIRCULAN CON RETRASO POR CAUSAS AJENAS A ESTA EMPRESA. ROGAMOS DISCULPEN LAS MOLESTIAS. · NO SE ADMITEN RECLAMACIONES EN PAXICOINS. ·</span></div>
    </div>`, { cls: 'dep-modal', onClose: () => clearInterval(timer) });
  const grid = mo.el.querySelector('.dep-grid'), clock = mo.el.querySelector('.dep-clock');
  const paint = () => {
    const now = new Date();
    clock.textContent = `${hhmm(now)}:${pad2(now.getSeconds())}`;
    grid.innerHTML = '<div class="dep-row th"><span>HORA</span><span>DESTINO</span><span>TREN</span><span>VÍA</span><span>OBSERVACIONES</span></div>'
      + trainRows(now.getTime()).map(t => `<div class="dep-row${t.albacete ? ' alb' : ''}"><span>${t.hora}</span><span>${esc(t.dest)}</span><span>${t.tren}</span><span>${t.via}</span><span class="obs">${esc(t.obs)}</span></div>`).join('');
  };
  paint();
  const timer = setInterval(() => { if (!mo.el.isConnected) return clearInterval(timer); paint(); }, 1000);
}

// ---------- Cambados: casetas, cata de albariño y lo que pasa después ----------
function casetaTalk(d) {
  if (!d || S.inGame) return;
  const hello = CASETA_HELLO[(d.idx + (S.drunk || 0)) % CASETA_HELLO.length];
  S.town.showDialog(d.name, [hello, { ask: '¿Unha cunquiña de albariño? (Minijuego: A Cata do Albariño)', options: [
    { label: '¡Veña, unha!', action: 'albarino' },
    { label: 'Agora non', lines: ['Ti mesmo. Aquí estaremos ata que se acabe o viño. Ou sexa, nunca.'] },
  ] }], { npc: { id: 'caseta', caseta: d } });
}
async function playWine(d) {
  if (!d || S.inGame) return;
  S.inGame = true;
  let r = { score: 0, rating: '' };
  try { r = await playAlbarino({ caseta: d.name, drunk: S.drunk }); } finally { S.inGame = false; }
  setDrunk(S.drunk + 1);
  const comment = r.score >= 0.85 ? '¡Moi ben! Ti sabes de viño. A próxima invito eu. Bueno, invita a casa, que é o mesmo.'
    : r.score >= 0.5 ? 'Nada mal, nada mal. ¡Saúde!' : 'Home… a próxima vai mellor. Ou peor. ¡Saúde igual!';
  const lines = [r.rating, comment];
  if (S.drunk === 3) lines.push('Oe, ti xa vas un pouco contento, ¿non? Camiña con coidado.');
  if (S.drunk >= 5) lines.push('…', 'Ei, ¿estás ben? Tes mala cara…');
  S.town.showDialog(d.name, lines, { onEnd: () => { if (S.drunk >= 5) passOut(); } });
}
// nivel de «alegría» (0-5): el mundo se balancea y a veces das un paso de lado. Baja solo con el tiempo.
function setDrunk(level) {
  S.drunk = Math.max(0, Math.min(5, level));
  S.town?.setDrunk(S.drunk);
  clearInterval(S.drunkTimer);
  if (S.drunk) S.drunkTimer = setInterval(() => { setDrunk(S.drunk - 1); }, 45000);
  if (S.town) setTownHud();
}
function passOut() {
  toast('Todo se volve negro…');
  S.town.startWarp({ map: 'vila', x: 19, y: 18, dir: 'down' });
  setTimeout(() => {
    setDrunk(1);
    S.town.showDialog(null, ['Espertas nun banco da praza de Vila Paxina.', 'Non lembras moi ben como chegaches. Levas unha cunca no peto.', 'Mellor tomar un café con leite na cafetería…']);
  }, 900);
}

// ---------- arena (salas, conectados y ranking) ----------
async function enterArena() {
  clearMatch();
  show('arena');
  Music.play('vila');
  dockChat(false);
  setChatScope('Chat general');
  setZone('arena');
  renderHelp();
  renderRoster($('#roster-lobby'), false);
  renderOnline();
  await Promise.all([refreshRooms(), refreshRanking()]);
}
function clearMatch() {
  localStorage.removeItem(LS_MATCH);
  S.match = null; S.pendingKey = null; S.outInvite = null;
  if (S.channel) { sb.removeChannel(S.channel); S.channel = null; }
}
const backHome = () => (S.returnTo === 'town' ? enterTown(ARENA_EXIT) : enterArena());
// retirar el reto que mandaste (al cancelar tu sala o al aceptar otro)
function cancelOutInvite() {
  const inv = S.outInvite;
  if (inv) S.lobby?.send({ type: 'broadcast', event: 'invite_cancel', payload: { to_id: inv.to, from: S.player.nickname, match_id: inv.match_id } });
  S.outInvite = null;
}
async function refreshRooms() {
  const { data, error } = await sb.from('matches').select('id, code, p1, p1_nick, created_at')
    .eq('status', 'waiting').order('created_at', { ascending: false }).limit(20);
  if (error) return toast(error.message, true);
  const ul = $('#rooms'); ul.innerHTML = '';
  const rooms = data.filter(m => m.p1 !== S.player.id);
  if (!rooms.length) ul.innerHTML = '<li class="muted">Ninguna todavía</li>';
  for (const m of rooms) {
    const li = document.createElement('li');
    li.innerHTML = `<span>${esc(m.p1_nick)} <span class="muted">${esc(m.code)}</span></span>`;
    const b = document.createElement('button'); b.className = 'btn small'; b.textContent = 'Entrar';
    b.addEventListener('click', () => { S.returnTo = 'arena'; joinByCode(m.code); });
    li.appendChild(b); ul.appendChild(li);
  }
}
async function refreshRanking() {
  const [{ data }, table] = await Promise.all([
    sb.from('players_public').select('nickname, wins, losses, department').order('wins', { ascending: false }).order('losses').limit(10),
    deptTable(),
  ]);
  $('#ranking').innerHTML = (data || []).map(p => `<li><span>${esc(p.nickname)} <i class="dot-dept" style="background:${deptColor(p.department)}"></i></span><span class="muted">${p.wins}V ${p.losses}D</span></li>`).join('')
    || '<li class="muted">Sin partidas aún</li>';
  $('#dept-ranking').innerHTML = table.filter(t => t.members).map(t => `<li><span>${deptBadge(t.id)}</span><span class="muted">${t.wins}V ${t.losses}D · ${t.members}👤</span></li>`).join('')
    || '<li class="muted">Nadie se ha apuntado todavía</li>';
}
function renderOnline() {
  const ul = $('#online'); if (!ul) return;
  ul.innerHTML = '';
  const list = [...S.online.entries()].sort(([a], [b]) => (a === S.player.id ? -1 : b === S.player.id ? 1 : 0));
  if (!list.length) ul.innerHTML = '<li class="muted">Nadie</li>';
  for (const [id, m] of list) {
    const li = document.createElement('li');
    const mine = id === S.player.id;
    li.innerHTML = `<span class="who"><canvas class="av"></canvas><span>${esc(m.nickname)}${mine ? ' <span class="muted">(tú)</span>' : ''}<br>${deptBadge(m.dept)} <span class="muted small">${zoneText(m.zone, m.map)}</span></span></span>`;
    avatarCanvas(m.look, deptColor(m.dept), 'down', 0, li.querySelector('canvas'));
    if (!mine) {
      const b = document.createElement('button'); b.className = 'btn small primary'; b.textContent = '⚔ Retar';
      b.disabled = m.zone === 'battle';
      b.title = m.zone === 'battle' ? 'Está en combate' : `Mandar un reto a ${m.nickname}`;
      b.addEventListener('click', () => challenge(id));
      li.appendChild(b);
    }
    ul.appendChild(li);
  }
}
$('#btn-exit-arena').addEventListener('click', () => enterTown(ARENA_EXIT));
$('#btn-create').addEventListener('click', async () => {
  S.returnTo = 'arena';
  try { await openMatch(await rpc('create_match', { p_secret: S.player.secret })); } catch (e) { toast(e.message, true); }
});
$('#join-form').addEventListener('submit', (e) => { e.preventDefault(); S.returnTo = 'arena'; joinByCode($('#join-code').value); });
async function joinByCode(code) {
  if (!code || code.trim().length < 4) return toast('Escribe el código de 4 letras', true);
  try { await openMatch(await rpc('join_match', { p_secret: S.player.secret, p_code: code })); } catch (e) { toast(e.message, true); }
}
$('#btn-cancel-room').addEventListener('click', async () => {
  cancelOutInvite();
  try { await rpc('leave_match', { p_secret: S.player.secret, p_match: S.match.id }); } catch { /* nada */ }
  await backHome();
});
$('#btn-back-arena').addEventListener('click', enterArena);
$('#btn-back-town').addEventListener('click', () => {
  if (S.afterResult) { const f = S.afterResult; S.afterResult = null; S.local = null; S.match = null; return f(); }
  enterTown(ARENA_EXIT);
});

// ---------- retos directos ----------
async function challenge(id) {
  const target = S.online.get(id);
  if (!target) return toast('Ese jugador ya no está conectado', true);
  if (target.zone === 'battle') return toast(`${target.nickname} está en pleno combate`, true);
  if (S.match) return toast('Ya estás en una sala', true);
  S.returnTo = S.zone === 'town' ? 'town' : 'arena';
  try {
    const m = await rpc('create_match', { p_secret: S.player.secret });
    await openMatch(m);
    S.outInvite = { to: id, nick: target.nickname, match_id: m.id };
    setRoomInvite(`Has retado a ${target.nickname}. Esperando su respuesta…`);
    await S.lobby?.send({ type: 'broadcast', event: 'invite', payload: {
      to_id: id, from_id: S.player.id, from: S.player.nickname, dept: S.player.department, look: S.player.look, code: m.code, match_id: m.id,
    } });
  } catch (e) { toast(e.message, true); }
}
function setRoomInvite(text) { const el = $('#room-invite'); el.textContent = text || ''; el.hidden = !text; }
function inviteReply(p, answer) {
  S.lobby?.send({ type: 'broadcast', event: 'invite_reply', payload: { to_id: p.from_id, from_id: S.player.id, from: S.player.nickname, match_id: p.match_id, answer } });
}
function onInvite(p) {
  if (!p || !S.player || p.to_id !== S.player.id || typeof p.code !== 'string') return;
  if ((S.match && S.match.status !== 'waiting') || S.inInvite) return inviteReply(p, 'busy');
  const secs = 30;
  const mo = openModal(`<div class="invite-head">⚔ ¡TE RETAN!</div>
    <div class="who-card"><canvas class="av-big"></canvas>
      <div><h2>${esc(p.from)}</h2>${deptBadge(p.dept)}<p class="muted small">te reta a un combate Paximón en la Arena</p></div>
    </div>
    <div class="invite-timer"><i></i></div>
    <div class="modal-actions">
      <button class="btn" type="button" data-a="no">Ahora no</button>
      <button class="btn primary" type="button" data-a="yes">¡Acepto!</button>
    </div>`, { closable: false, cls: 'invite' });
  avatarCanvas(p.look, deptColor(p.dept), 'down', 0, mo.el.querySelector('canvas'));
  const bar = mo.el.querySelector('.invite-timer i');
  bar.style.animationDuration = secs + 's';
  const title = document.title;
  let flip = false;
  const flash = setInterval(() => { flip = !flip; document.title = flip ? '⚔ ¡Te retan!' : title; }, 900);
  chime();
  const done = () => { clearInterval(flash); clearTimeout(timer); document.title = title; mo.close(true); S.inInvite = null; };
  const timer = setTimeout(() => { inviteReply(p, 'timeout'); done(); toast(`Se acabó el tiempo para el reto de ${p.from}`); }, secs * 1000);
  S.inInvite = { ...p, done };
  mo.el.querySelector('[data-a="no"]').addEventListener('click', () => { inviteReply(p, 'no'); done(); });
  mo.el.querySelector('[data-a="yes"]').addEventListener('click', async () => {
    done();
    cancelOutInvite();
    if (S.match) { try { await rpc('leave_match', { p_secret: S.player.secret, p_match: S.match.id }); } catch { /* nada */ } clearMatch(); }
    S.returnTo = S.zone === 'town' ? 'town' : 'arena';
    await joinByCode(p.code);
  });
}
function onInviteReply(p) {
  if (!p || p.to_id !== S.player?.id || !S.outInvite || S.outInvite.match_id !== p.match_id) return;
  const why = { no: 'ha rechazado el reto', busy: 'está ocupado ahora mismo', timeout: 'no ha contestado' }[p.answer] || 'no puede ahora';
  setRoomInvite(`${p.from} ${why}. Puedes esperar a otro rival con el código o cancelar la sala.`);
  toast(`${p.from} ${why}`);
  S.outInvite = null;
}
function onInviteCancel(p) {
  if (!p || p.to_id !== S.player?.id || !S.inInvite || S.inInvite.match_id !== p.match_id) return;
  S.inInvite.done();
  toast(`${p.from} ha retirado el reto`);
}
let audioCtx = null;
function chime() {
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    [660, 880, 1320].forEach((f, i) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = 'square'; o.frequency.value = f; g.gain.value = 0.05;
      o.connect(g); g.connect(audioCtx.destination);
      const t0 = audioCtx.currentTime + i * 0.12;
      o.start(t0); o.stop(t0 + 0.1);
    });
  } catch { /* sin audio */ }
}

// ---------- partida ----------
async function openMatch(m) {
  S.match = m; S.me = m.p1 === S.player.id ? 'p1' : 'p2';
  localStorage.setItem(LS_MATCH, m.id);
  S.seen = new Set(); S.queue = []; S.lastLogId = 0; S.pickedChar = null; S.sending = false; S.pendingKey = null; S.lowHpSaid = {};
  $('#log').innerHTML = '';
  setRoomInvite('');
  await subscribeMatch(m.id);
  setChatScope('Chat de la partida');
  const { data: logs } = await sb.from('match_log').select('*').eq('match_id', m.id).order('id');
  for (const row of logs || []) {
    S.seen.add(row.id); S.lastLogId = row.id;
    appendLog(row.event);
  }
  await route(m);
}
async function subscribeMatch(id) {
  const old = S.channel; S.channel = null;
  dropChannel(old);
  const ch = await freshChannel('match:' + id);   // si se vuelve a la misma sala, espera a soltar la anterior
  if (S.match?.id !== id) return dropChannel(ch);
  S.channel = ch
    .on('broadcast', { event: 'log' }, ({ payload }) => enqueue({ kind: 'log', row: payload.log }))
    .on('broadcast', { event: 'match' }, ({ payload }) => enqueue({ kind: 'match', match: payload.match }))
    .on('broadcast', { event: 'chat' }, ({ payload }) => onChat(payload))
    .on('broadcast', { event: 'emote' }, ({ payload }) => onEmote(payload))
    .on('broadcast', { event: 'mash' }, ({ payload }) => { if (payload?.from_id !== S.player.id) S.duelOpp = Number(payload?.count) || 0; })
    .subscribe((status) => {
      // si el servidor cierra el canal en plena partida, se abre otro y se recupera lo perdido
      if (status === 'CLOSED' && S.channel === ch && S.match?.id === id) setTimeout(() => { if (S.channel === ch) subscribeMatch(id).then(resync); }, 2000);
    });
}
function enqueue(item) { S.queue.push(item); if (!S.busy) drain(); }
async function drain() {
  S.busy = true;
  while (S.queue.length) {
    const it = S.queue.shift();
    try {
      if (it.kind === 'log') {
        if (!it.row || S.seen.has(it.row.id)) continue;
        S.seen.add(it.row.id); S.lastLogId = Math.max(S.lastLogId, it.row.id);
        await playEvent(it.row.event);
      } else if (it.kind === 'match') {
        if (!S.match || it.match.id !== S.match.id) continue;
        S.match = it.match;
        await route(it.match);
      }
    } catch (e) { console.error(e); }
  }
  S.busy = false;
}
async function resync() {
  if (!S.match) return;
  const { data } = await sb.from('matches').select('*').eq('id', S.match.id).single();
  if (!data || data.updated_at === S.match.updated_at) return;
  const { data: logs } = await sb.from('match_log').select('*').eq('match_id', S.match.id).gt('id', S.lastLogId).order('id');
  for (const row of logs || []) enqueue({ kind: 'log', row });
  enqueue({ kind: 'match', match: data });
}
async function route(m) {
  switch (m.status) {
    case 'waiting': $('#room-code').textContent = m.code; show('room'); setZone('arena'); break;
    case 'picking': S.outInvite = null; setZone('battle'); showPick(m); break;
    case 'active': S.outInvite = null; setZone('battle'); showBattle(m); break;
    case 'finished': await showResult(m); break;
    case 'abandoned': toast('La sala se cerró'); await backHome(); break;
  }
}
const foeNick = (m) => m[other() + '_nick'] || 'rival';

// ---------- elegir Paximón ----------
function showPick(m) {
  if (!isActive('pick')) {
    show('pick');
    $('#pick-waiting').hidden = true;
    $('#pick-vs').textContent = `vs ${foeNick(m)}`;
    renderRoster($('#roster-pick'), true, async (c, el) => {
      if (S.pickedChar) return;
      S.pickedChar = c.id;
      markPicked(el);
      try {
        await rpc('pick_character', { p_secret: S.player.secret, p_match: m.id, p_character: c.id });
      } catch (e) {
        S.pickedChar = null; toast(e.message, true);
        $('#pick-waiting').hidden = true;
        $('#roster-pick').querySelectorAll('.pcard').forEach(x => { x.classList.remove('selected'); x.classList.add('selectable'); });
      }
    });
  }
  const mine = m[S.me + '_char'];
  if (mine && !S.pickedChar) {
    S.pickedChar = mine;
    const el = $('#roster-pick').querySelector(`.pcard[data-id="${mine}"]`);
    if (el) markPicked(el);
  }
}
function markPicked(el) {
  $('#roster-pick').querySelectorAll('.pcard').forEach(x => x.classList.remove('selected', 'selectable'));
  el.classList.add('selected');
  $('#pick-waiting').hidden = false;
}

// ---------- combate ----------
// Escenario pintado en píxeles (según la partida), plataformas, paneles al estilo Pokémon
// y una caja de texto que narra lo que pasa. Los sprites se escalan siempre en enteros.
const BATTLE = { stage: null, scale: 4, timer: null, resize: null };
function showBattle(m) {
  if (!isActive('battle')) { show('battle'); initBattle(m); dockChat(true); if (!S.local) Music.play('batalla'); }
  renderState(m);
  if (m.pending) handlePending(m);
}
function costPips(cost) {
  if (!cost) return '<span class="mv-cost free">GRATIS</span>';
  return `<span class="mv-cost">${'◆'.repeat(cost)}</span>`;
}
function moveButton(mv, foeType, universal = false) {
  const b = document.createElement('button');
  b.className = 'move' + (universal ? ' universal' : '');
  b.dataset.move = mv.id; b.dataset.cost = mv.cost ?? 0;
  if (mv.type) b.style.setProperty('--tc', S.types[mv.type]?.color || '#9E9E9E');
  const meta = [];
  if (mv.type) meta.push(esc(S.types[mv.type]?.name || mv.type).toUpperCase());
  if (mv.power) meta.push(`POT ${mv.power}`);
  if (mv.accuracy < 100) meta.push(`PRE ${mv.accuracy}%`);
  if (mv.minigame) meta.push(`🎮 ${esc(MINIGAME_NAMES[mv.minigame] || mv.minigame)}`);
  b.innerHTML = `${effTag(mv, foeType)}<div class="mv-top"><span class="mv-name">${esc(mv.name)}</span>${costPips(mv.cost)}</div>
    ${meta.length ? `<span class="mv-meta">${meta.join(' · ')}</span>` : ''}`;
  b.title = [mv.description, mv.cost ? `Cuesta ${mv.cost} de chakra.` : 'No cuesta chakra.'].filter(Boolean).join(' ');
  b.addEventListener('click', () => useMove(mv.id));
  return b;
}
// pinta un lado del campo (sprite y panel). En la historia hay equipos: se vuelve a llamar al cambiar
function drawSide(ui, f) {
  const cv = $('#' + ui + '-sprite');
  cv.className = '';
  drawSprite(cv, S.charById[f.char_id]?.sprite || { layers: [] }, S.parts, { flip: ui === 'foe' });
  $('#' + ui + '-name').textContent = f.lv ? `${f.name} Nv.${f.lv}` : f.name;
  $('#' + ui + '-type').outerHTML = typeBadge(f.type, ui + '-type');
  $('#' + ui + '-hud').style.setProperty('--tc', S.types[f.type]?.color || '#9E9E9E');
  const t = $('#' + ui + '-trail'); t.style.transition = 'none'; t.style.width = Math.max(0, Math.round((f.hp / f.max_hp) * 100)) + '%'; void t.offsetWidth; t.style.transition = '';
}
// los botones de tus movimientos (se rehacen al cambiar de Paximón)
function buildMoves(m) {
  const me = m.state[S.me], foe = m.state[other()];
  const box = $('#moves'); box.innerHTML = '';
  const ids = [...(S.charById[me.char_id]?.moves || [])];
  // la Web GEO se aprende en el acto IV y solo vale en la historia
  if (S.local?.kind === 'story' && S.player?.story?.flags?.webgeo) ids.push('web_geo');
  for (const id of ids) { const mv = S.moves[id]; if (mv) box.appendChild(moveButton(mv, foe.type)); }
}
function initBattle(m) {
  const me = m.state[S.me], foe = m.state[other()];
  drawSide('me', me); drawSide('foe', foe);
  $('#me-owner').textContent = `${S.player.nickname} · tú`;
  $('#foe-owner').textContent = foeNick(m);
  buildMoves(m);
  const acts = $('#actions'); acts.innerHTML = '';
  for (const mv of S.universal) acts.appendChild(moveButton(mv, foe.type, true));
  const bag = document.createElement('button');
  bag.className = 'move universal bag'; bag.id = 'btn-battle-bag';
  bag.innerHTML = '<div class="mv-top"><span class="mv-name">🎒 Mochila</span><span class="mv-cost free">NO GASTA TURNO</span></div><span class="mv-meta"></span>';
  bag.title = 'Tomar un consumible de la cafetería (uno por turno, sin gastar el turno)';
  bag.addEventListener('click', useItemFromBag);
  acts.appendChild(bag);
  storyButtons(m);
  $('#field').classList.remove('drunk', 'whiteout');
  $('#field').style.removeProperty('--white');
  $('#story-hud').innerHTML = '';
  renderEmoteTray($('#battle-emotes'));
  renderEmoteTray($('#chat-emotes'));
  initFx({ field: $('#field'), parts: S.parts, drawSprite });
  BATTLE.stage = new URLSearchParams(location.search).get('stage') || stageFor(m.id);
  $('#stage-name').textContent = STAGES[BATTLE.stage]?.name || '';
  layoutField();
  for (const side of ['me', 'foe']) { const s = $('#' + side + '-slot'); s.classList.remove('enter'); void s.offsetWidth; s.classList.add('enter'); }
  if (!BATTLE.resize) {
    let t; BATTLE.resize = () => { clearTimeout(t); t = setTimeout(() => { if (isActive('battle')) layoutField(); }, 150); };
    window.addEventListener('resize', BATTLE.resize);
  }
}
// pinta el escenario a la resolución nativa del campo y coloca los sprites sobre sus plataformas
function layoutField() {
  const field = $('#field'), w = field.clientWidth, h = field.clientHeight;
  const s = w >= 820 ? 4 : w >= 560 ? 3 : 2;
  const W = Math.ceil(w / s), H = Math.ceil(h / s);
  BATTLE.scale = s;
  const key = BATTLE.stage, anim = STAGES[key]?.animated;
  const frames = [paintStage(key, W, H, 0), anim ? paintStage(key, W, H, 1) : null];
  ['#stage-a', '#stage-b'].forEach((sel, i) => {
    const cv = $(sel), pix = frames[i];
    cv.hidden = i === 1;
    if (!pix) return;
    cv.width = W; cv.height = H; cv.style.width = W * s + 'px'; cv.style.height = H * s + 'px';
    cv.getContext('2d').drawImage(pix.toCanvas(), 0, 0);
  });
  clearInterval(BATTLE.timer);
  if (anim) BATTLE.timer = setInterval(() => { if (!isActive('battle')) return; const a = $('#stage-a'), b = $('#stage-b'); a.hidden = !a.hidden; b.hidden = !b.hidden; }, 700);
  for (const [side, sc] of [['foe', s - 1], ['me', s]]) {
    const L = LAYOUT[side], slot = $('#' + side + '-slot');
    slot.style.width = slot.style.height = 64 * sc + 'px';
    slot.style.left = Math.round(W * L.cx * s - 32 * sc) + 'px';
    slot.style.top = Math.round(H * L.cy * s - 61 * sc) + 'px';
  }
}
function renderState(m) {
  const me = m.state[S.me], foe = m.state[other()];
  setHp('me', me.hp, me.max_hp); setHp('foe', foe.hp, foe.max_hp);
  setChakra('me', me); setChakra('foe', foe);
  $('#me-stages').innerHTML = stagesHtml(me); $('#foe-stages').innerHTML = stagesHtml(foe);
  const myTurn = m.status === 'active' && m.current_player === S.me && !m.pending && (!m.local || S.turnReady);
  let info = m.status !== 'active' ? 'Combate terminado.' : myTurn ? `¿Qué hará ${me.name}?` : `${foeNick(m)} está pensando…`;
  if (m.pending) info = m.pending.kind === 'duel' ? '⚔ ¡Guerra de clics!' : (m.pending.attacker === S.me ? `${foeNick(m)} intenta esquivar…` : '¡Esquiva!');
  battleSay(info, { prompt: myTurn, instant: true });
  document.querySelectorAll('#moves .move, #actions .move').forEach(b => {
    const cost = Number(b.dataset.cost || 0);
    const noChakra = cost > (me.chakra ?? 0);
    b.classList.toggle('nochakra', noChakra);
    b.disabled = !myTurn || S.sending || S.inGame || noChakra;
  });
  renderStoryState(m, myTurn);
  const bag = $('#btn-battle-bag');
  if (bag) {
    const n = S.demo ? S.items.length : Object.values(S.player?.inventory || {}).reduce((a, b) => a + Number(b || 0), 0);
    const used = me.item_turn === m.turn;
    bag.disabled = !myTurn || S.sending || S.inGame || !n || used;
    bag.querySelector('.mv-meta').textContent = used ? 'Ya tomaste algo este turno' : n ? `${n} ${n === 1 ? 'objeto' : 'objetos'}` : 'Vacía · cómpralos en la cafetería';
  }
}
// tomar un consumible: en combates online lo resuelve el servidor (use_item); contra vecinos, aquí
async function useItemFromBag() {
  if (S.sending || S.inGame || !S.match || S.match.pending) return;
  const m = S.match, me = m.state[S.me];
  if (m.current_player !== S.me || !localReady() || me.item_turn === m.turn) return;
  let id = null;
  if (S.demo) {
    id = await new Promise((resolve) => {
      const mo = openModal(`<h2>🎒 Mochila (demo)</h2><div class="bag-list"></div>`, { cls: 'bag-modal', onClose: () => resolve(null) });
      for (const it of S.items) {
        const row = document.createElement('div'); row.className = 'bag-row';
        row.innerHTML = `<div class="ico"></div><div class="info"><b>${esc(it.name)}</b><span class="small">${itemEffects(it)}</span></div><button class="btn primary small" type="button">Tomar</button>`;
        row.querySelector('.ico').appendChild(itemCanvas(it.id));
        row.querySelector('button').addEventListener('click', () => { mo.close(true); resolve(it.id); });
        mo.el.querySelector('.bag-list').appendChild(row);
      }
    });
  } else id = await bagModal({ battle: true });
  if (!id) return;
  const it = S.itemById[id];
  S.sending = true; lockMoves();
  try {
    if (S.local) {
      if (!S.demo) savePlayer((await rpc('use_item', { p_secret: S.player.secret, p_match: null, p_item: id })).player);
      const heal = Math.max(0, Math.min(me.max_hp - me.hp, Math.floor(me.max_hp * it.heal_pct / 100)));
      const gain = Math.max(0, Math.min(me.max_chakra - me.chakra, it.chakra));
      me.hp += heal; me.chakra += gain; me.item_turn = m.turn;
      S.sending = false;
      await playEvent({ type: 'item', actor: S.me, item: id, item_name: it.name, heal, chakra: gain, hp: me.hp, chakra_now: me.chakra });
    } else {
      const r = await rpc('use_item', { p_secret: S.player.secret, p_match: m.id, p_item: id });
      savePlayer(r.player);
      setTimeout(resync, 3000);
    }
  } catch (e) { toast(e.message, true); }
  S.sending = false;
  renderState(S.match);
}
// caja de texto del combate (con efecto de máquina de escribir para lo que va pasando)
let sayTimer = null;
function battleSay(text, { prompt = false, instant = false } = {}) {
  const el = $('#turn-info'), box = el.parentElement;
  clearInterval(sayTimer);
  box.classList.toggle('prompt', prompt);
  if (instant) { el.textContent = text; return; }
  let n = 0; el.textContent = '';
  sayTimer = setInterval(() => { n += 2; el.textContent = text.slice(0, n); if (n >= text.length) clearInterval(sayTimer); }, 18);
}
function setHp(side, hp, max) {
  const pct = Math.max(0, Math.round((hp / max) * 100));
  const el = $('#' + side + '-hp');
  el.style.width = pct + '%';
  el.className = 'hp' + (pct <= 25 ? ' low' : pct <= 50 ? ' mid' : '');
  $('#' + side + '-trail').style.width = pct + '%';
  $('#' + side + '-hptext').textContent = `${hp} / ${max}`;
}
function setChakra(side, f) {
  const max = f.max_chakra || 10, ck = Math.max(0, Math.min(max, f.chakra ?? 0));
  const el = $('#' + side + '-ck');
  el.innerHTML = '◆'.repeat(ck) + `<i>${'◇'.repeat(max - ck)}</i>`;
  el.title = `Chakra: ${ck} de ${max}`;
}
function stagesHtml(f) {
  const s = [];
  const st = (v, n) => v && s.push(`<span class="${v < 0 ? 'down' : ''}">${n} ${v > 0 ? '▲'.repeat(v) : '▼'.repeat(-v)}</span>`);
  st(f.atk_stage, 'ATQ'); st(f.def_stage, 'DEF');
  if (f.guard) s.push('<span>🛡 GUARDIA</span>');
  return s.join('');
}
function lockMoves() { document.querySelectorAll('#moves .move, #actions .move').forEach(b => (b.disabled = true)); }

async function useMove(id) {
  if (S.sending || S.inGame || !S.match || S.match.pending) return;
  if (S.local && !localReady()) return;
  const mv = S.moves[id]; if (!mv) return;
  lockMoves();
  let skill = null;
  if (S.debugSkill != null && S.local && mv.minigame) skill = S.debugSkill;   // solo para probar (?debug)
  else if (mv.minigame && mv.minigame !== 'mash_duel') {
    S.inGame = true;
    try {
      if (mv.minigame === 'webgeo') { sfx('webgeo'); skill = await playWebGeo({ ...WEBGEO, sfx }); }
      else skill = await playMinigame(mv.minigame, { title: mv.name, cost: mv.cost });
    } finally { S.inGame = false; }
  }
  if (S.local) return localTurn('p1', mv, skill);
  S.sending = true;
  try {
    await rpc('submit_move', { p_secret: S.player.secret, p_match: S.match.id, p_move: id, p_skill: skill });
    setTimeout(resync, 4000); // salvaguarda si el broadcast no llega
  } catch (e) {
    toast(e.message, true);
    S.sending = false; renderState(S.match);
    return;
  }
  S.sending = false;
}

// acción pendiente: duelo de clics (los dos) o esquiva (solo el defensor)
async function handlePending(m) {
  const p = m.pending, key = p.started_at;
  if (S.pendingKey === key) return;
  S.pendingKey = key;
  lockMoves();
  const deadline = new Date(p.deadline).getTime();
  setTimeout(async () => {
    if (S.match?.pending?.started_at === key) {
      try { await rpc('submit_pending', { p_secret: S.player.secret, p_match: S.match.id, p_skill: 0 }); } catch { /* ya resuelto */ }
    }
  }, Math.max(1200, deadline - Date.now() + 800));
  const isAttacker = p.attacker === S.me;
  try {
    if (p.kind === 'duel') {
      S.duelOpp = 0; S.inGame = true;
      let lastSent = 0;
      const skill = await playMinigame('mash_duel', {
        title: p.move_name || 'Duelo', cost: 6,
        duel: {
          onCount: (n) => { const now = Date.now(); if (now - lastSent > 150) { lastSent = now; S.channel?.send({ type: 'broadcast', event: 'mash', payload: { from_id: S.player.id, count: n } }); } },
          getOpponent: () => S.duelOpp,
        },
      });
      S.inGame = false;
      await rpc('submit_pending', { p_secret: S.player.secret, p_match: m.id, p_skill: skill });
    } else if (!isAttacker) {
      S.inGame = true;
      const skill = await playMinigame('dodge', { title: `${p.move_name || 'Ataque'} de ${foeNick(m)}` });
      S.inGame = false;
      await rpc('submit_pending', { p_secret: S.player.secret, p_match: m.id, p_skill: skill });
    }
  } catch (e) { S.inGame = false; console.warn(e); }
}
$('#btn-forfeit').addEventListener('click', async () => {
  if (!S.match || !confirm('¿Seguro que te rindes?')) return;
  if (S.local) return finishLocal(false, true);
  try { await rpc('leave_match', { p_secret: S.player.secret, p_match: S.match.id }); } catch (e) { toast(e.message, true); }
});

// ---------- frases y voz ----------
function speak(side, key, { force = false } = {}) {
  const char = charOfSide(side);
  const text = pickLine(char, key);
  if (!text) return;
  const canvas = $('#' + (side === S.me ? 'me' : 'foe') + '-sprite');
  if (isActive('battle') && canvas) {
    const slot = canvas.parentElement;
    slot.querySelectorAll('.emote.talk').forEach(x => x.remove());
    const d = document.createElement('div');
    d.className = 'emote talk ' + (side === S.me ? 'right' : 'left');
    d.textContent = text;
    slot.appendChild(d);
    setTimeout(() => d.classList.add('out'), 2300);
    setTimeout(() => d.remove(), 2800);
  }
  Voice.say(text, { slug: char?.slug, force });
}

// ---------- eventos del combate ----------
function name(side) { return S.match?.state?.[side]?.name || (side === S.me ? 'Tú' : 'Rival'); }
function appendLog(ev, cls) {
  const line = describe(ev);
  if (!line) return;
  const div = document.createElement('div');
  div.className = cls || (ev.actor ? (ev.actor === S.me ? 'me' : 'foe') : '');
  if (ev.type === 'ko' || ev.type === 'leave') div.classList.add('big');
  div.textContent = line;
  const log = $('#log'); log.appendChild(div); log.scrollTop = log.scrollHeight;
  if (isActive('battle')) battleSay(line);
}
const statName = (s) => (s === 'atk' ? 'ataque' : 'defensa');
function describe(ev) {
  const a = name(ev.actor), t = name(ev.target);
  switch (ev.type) {
    case 'start': return `¡Empieza el combate! ${name(ev.first)} mueve primero.`;
    case 'miss': return `${a} usa ${ev.move_name}… ¡y falla!`;
    case 'hit': {
      let s = `${a} usa ${ev.move_name}: ${ev.damage} de daño.`;
      if (ev.crit) s += ' ¡Golpe crítico!';
      if (Number(ev.effectiveness) > 1) s += ' ¡Es muy eficaz!';
      else if (Number(ev.effectiveness) < 1) s += ' No es muy eficaz…';
      if (Number(ev.skill) >= 0.9) s += ' ¡Minijuego perfecto!';
      if (ev.dodged) s += ' ¡Esquiva parcial!';
      if (ev.guarded) s += ' La guardia lo reduce a la mitad.';
      return s;
    }
    case 'heal': return `${a} usa ${ev.move_name} y recupera ${ev.amount} PV.`;
    case 'buff': return `${a} usa ${ev.move_name}: su ${statName(ev.stat)} ${ev.stages > 0 ? 'sube ' + ev.stages : 'no puede subir más'}.`;
    case 'debuff': return `${a} usa ${ev.move_name}: ${ev.stat === 'atk' ? 'el' : 'la'} ${statName(ev.stat)} de ${t} ${ev.stages < 0 ? 'baja ' + (-ev.stages) : 'no puede bajar más'}.`;
    case 'chakra': return ev.move === 'concentrar'
      ? `${a} se concentra y recupera ${ev.amount} de chakra.`
      : `${a} recupera ${ev.amount} de chakra.`;
    case 'guard': return `${a} se pone en guardia.`;
    case 'item': {
      const gains = [ev.heal ? `+${ev.heal} PV` : '', ev.chakra ? `+${ev.chakra} de chakra` : ''].filter(Boolean).join(' y ');
      return `${a} se toma un ${ev.item_name}${gains ? ': ' + gains : ' (no le hacía falta)'}.`;
    }
    case 'ko': return ev.more ? `¡${name(ev.loser)} cae debilitado!` : `¡${name(ev.loser)} cae debilitado! Gana ${name(ev.winner)}.${ev.coins && ev.winner === S.me ? ` +${ev.coins} paxicoins.` : ''}`;
    case 'info': return ev.text;
    case 'switch': return ev.actor === S.me ? `¡Adelante, ${ev.name}!` : foeNick(S.match) === ev.name ? `¡${ev.name} sale en persona!` : `${foeNick(S.match)} saca a ${ev.name}.`;
    case 'hold': return `${name(ev.target)} queda en espera… 🎵`;
    case 'errata': return `¡A Errata le cambia las letras a ${name(ev.target)}!`;
    case 'drunk': return `${name(ev.target)} se marea un poco…`;
    case 'reset': return `Sesión caducada: ${name(ev.target)} pierde sus mejoras.`;
    case 'leave': return `${a} se rinde. Gana ${name(ev.winner)}.${ev.coins && ev.winner === S.me ? ` +${ev.coins} paxicoins.` : ''}`;
    default: return '';
  }
}
function fx(canvas, text, color) {
  const slot = canvas.parentElement;
  const d = document.createElement('div'); d.className = 'fx show'; d.textContent = text; if (color) d.style.color = color;
  slot.appendChild(d); setTimeout(() => d.remove(), 950);
}
function anim(canvas, cls, ms) {
  canvas.classList.add(cls);
  return sleep(ms).then(() => canvas.classList.remove(cls));
}
async function attackAnim(ev, atk, def, actorMe) {
  const mfx = S.moves[ev.move]?.fx;
  if (mfx && mfx.kind !== 'lunge') {
    if (['projectile', 'volley', 'slash', 'beam'].includes(mfx.kind)) anim(atk, actorMe ? 'lunge-right' : 'lunge-left', 350);
    await playMoveFx(mfx, atk, def);
  } else {
    await anim(atk, actorMe ? 'lunge-right' : 'lunge-left', 350);
  }
}
async function playEvent(ev) {
  if (!isActive('battle')) { appendLog(ev); return; }
  const actorMe = ev.actor === S.me;
  const atk = actorMe ? $('#me-sprite') : $('#foe-sprite');
  const def = actorMe ? $('#foe-sprite') : $('#me-sprite');
  const defSide = actorMe ? other() : S.me;
  const defUi = actorMe ? 'foe' : 'me';
  const atkUi = actorMe ? 'me' : 'foe';
  appendLog(ev);
  switch (ev.type) {
    case 'start':
      speak(ev.first === S.me ? S.me : other(), 'start');
      await sleep(1300);
      speak(ev.first === S.me ? other() : S.me, 'start');
      await sleep(600);
      break;
    case 'hit': {
      await attackAnim(ev, atk, def, actorMe);
      sfx(ev.crit ? 'crit' : 'hit');
      if (ev.dodged) { fx(def, '¡ESQUIVA!', '#64b5f6'); await anim(def, 'dodge-slide', 350); }
      if (ev.guarded) await anim(def, 'shield', 300);
      fx(def, `-${ev.damage}`, ev.crit ? '#ffd23f' : Number(ev.effectiveness) > 1 ? '#ff5252' : undefined);
      await anim(def, 'hurt', 400);
      const max = S.match.state[defSide].max_hp;
      setHp(defUi, ev.target_hp, max);
      if (Number(ev.effectiveness) > 1) fx(def, '¡MUY EFICAZ!', '#ff5252');
      else if (Number(ev.effectiveness) < 1) fx(def, 'poco eficaz', '#a79fb8');
      if (ev.target_hp > 0) {
        if (ev.target_hp <= max * 0.3 && !S.lowHpSaid[defSide]) { S.lowHpSaid[defSide] = true; speak(defSide, 'low_hp'); }
        else if ((ev.crit || Number(ev.effectiveness) > 1 || Number(ev.skill) >= 0.9) && Math.random() < 0.6) speak(ev.actor, 'hit');
        else if (ev.damage >= max * 0.12 && Math.random() < 0.5) speak(defSide, 'hurt');
      }
      await sleep(500);
      break;
    }
    case 'miss':
      await attackAnim(ev, atk, def, actorMe);
      sfx('miss');
      fx(def, '¡falla!', '#a79fb8');
      await anim(def, 'dodge-slide', 350);
      await sleep(400);
      break;
    case 'heal':
      await playMoveFx(S.moves[ev.move]?.fx, atk, def) || await anim(atk, 'glow', 600);
      sfx('heal');
      fx(atk, `+${ev.amount}`, '#4cbb3a');
      setHp(atkUi, ev.hp, S.match.state[ev.actor].max_hp);
      await sleep(400);
      break;
    case 'buff':
      await playMoveFx(S.moves[ev.move]?.fx, atk, def) || await anim(atk, 'glow', 600);
      sfx('buff');
      fx(atk, `${ev.stat.toUpperCase()} ▲`, '#ffd23f');
      await sleep(300);
      break;
    case 'debuff':
      await playMoveFx(S.moves[ev.move]?.fx, atk, def) || await anim(atk, actorMe ? 'lunge-right' : 'lunge-left', 350);
      sfx('debuff');
      fx(def, `${ev.stat.toUpperCase()} ▼`, '#7986cb');
      await sleep(400);
      break;
    case 'chakra':
      await playMoveFx(S.moves[ev.move]?.fx, atk, def) || await anim(atk, 'glow', 600);
      sfx('chakra');
      fx(atk, `+${ev.amount} ◆`, '#b388ff');
      await sleep(300);
      break;
    case 'guard':
      await playMoveFx(S.moves[ev.move]?.fx, atk, def) || await anim(atk, 'shield', 600);
      sfx('guard');
      fx(atk, '🛡', '#64b5f6');
      await sleep(300);
      break;
    case 'item': {
      // el consumible sube flotando sobre el Paximón
      sfx('coffee');
      const ico = itemCanvas(ev.item); ico.className = 'item-float';
      atk.parentElement.appendChild(ico); setTimeout(() => ico.remove(), 1300);
      await anim(atk, 'glow', 600);
      const st = S.match.state[ev.actor];
      if (ev.heal) { fx(atk, `+${ev.heal}`, '#4cbb3a'); setHp(atkUi, ev.hp, st.max_hp); }
      if (ev.chakra) { setTimeout(() => fx(atk, `+${ev.chakra} ◆`, '#b388ff'), 300); setChakra(atkUi, { chakra: ev.chakra_now, max_chakra: st.max_chakra }); }
      await sleep(500);
      break;
    }
    case 'ko': {
      const loser = ev.loser === S.me ? $('#me-sprite') : $('#foe-sprite');
      loser.classList.add('faint');
      sfx('faint');
      if (!ev.more) { speak(ev.winner, 'win', { force: true }); await sleep(1200); }
      speak(ev.loser, 'lose');
      await sleep(900);
      break;
    }
    // modo historia: avisos, cambios de Paximón y estados especiales
    case 'info':
      if (ev.sfx) sfx(ev.sfx);
      await sleep(Math.min(3200, 900 + String(ev.text || '').length * 22));
      break;
    case 'switch': {
      const ui = ev.actor === S.me ? 'me' : 'foe', f = S.match.state[ev.actor];
      drawSide(ui, f);
      setHp(ui, f.hp, f.max_hp); setChakra(ui, f);
      if (ui === 'me') buildMoves(S.match);
      const slot = $('#' + ui + '-slot'); slot.classList.remove('enter'); void slot.offsetWidth; slot.classList.add('enter');
      sfx('warp');
      await sleep(700);
      speak(ev.actor, 'start');
      await sleep(700);
      break;
    }
    case 'hold':
      sfx('ring');
      await playMoveFx(S.moves[ev.move]?.fx, atk, def);
      fx(def, '🎵 EN ESPERA', '#FF4D6D');
      await sleep(500);
      break;
    case 'errata':
      sfx('glitch'); fx(def, '¡GRALLA!', '#B388FF'); await sleep(500); break;
    case 'drunk':
      sfx('clink'); fx(def, '🍷', '#C2185B'); await sleep(400); break;
    case 'reset':
      sfx('debuff'); fx(def, 'SESIÓN CADUCADA', '#B0BEC5'); await sleep(500); break;
    case 'leave':
      speak(ev.winner, 'win');
      await sleep(800);
      break;
    default:
      await sleep(200);
  }
}

// ---------- resultado ----------
async function showResult(m) {
  if (isActive('battle')) await sleep(600);
  const won = m.winner === S.me;
  const local = S.local, quest = local?.quest;
  $('#result-title').textContent = won ? '¡VICTORIA!' : 'DERROTA';
  $('#result-text').textContent = quest === 'maricarmen'
    ? (won ? `Has ganado al de DIO Express. ¡La casa de Maricarmen está a salvo!` : `El de DIO Express te ha ganado. La casa de Maricarmen es suya…`)
    : won ? `Has ganado a ${foeNick(m)}.` : `${foeNick(m)} te ha ganado. ¡Revancha!`;
  $('#result-coins').hidden = true;
  // tu Paximón celebrando o llorando (la misma cara que los emotes)
  const mine = charOfSide(S.me);
  drawSprite($('#result-sprite'), emoteSprite(mine, won ? 'face_laugh' : 'face_cry'), S.parts);
  $('#screen-result .card').classList.toggle('won', won);
  $('#screen-result .card').classList.toggle('lost', !won);
  if (!local) Music.play(won ? 'vitoria' : null, { loop: false });
  $('#btn-back-arena').hidden = !!local;
  $('#btn-back-town').textContent = local ? 'Volver al pueblo' : 'Al pueblo';
  show('result');
  dockChat(false);
  setZone(local ? 'town' : 'arena');
  localStorage.removeItem(LS_MATCH);
  if (S.demo) { S.afterResult = () => location.reload(); return; }
  const before = local ? S.coinsBefore : Number(S.player.coins || 0);
  if (!local) { try { savePlayer(await rpc('login_player', { p_secret: S.player.secret })); } catch { /* nada */ } }
  const gained = Math.round((Number(S.player.coins || 0) - (before ?? 0)) * 100) / 100;
  if (gained > 0) { const c = $('#result-coins'); c.innerHTML = `${coinImg()} +${fmtCoins(gained)} paxicoins`; c.hidden = false; }
}

// ---------- chat y emotes ----------
const chatTarget = () => (S.match && S.channel) || S.lobby;
let lastEmoteAt = 0, lastChatAt = 0;

function setChatScope(label) {
  if (S.chatScope === label) return;
  S.chatScope = label;
  $('#chat-scope').textContent = label === 'Chat de la partida' ? 'Partida' : 'All';
  chatLine({ sys: `— ${label} —` });
  renderEmoteTray($('#chat-emotes'));
}
function dockChat(docked) {
  const c = $('#chat');
  if (docked) {
    $('#chat-dock').appendChild(c);
    c.classList.add('docked'); c.classList.remove('collapsed');
    const u = $('#chat-unread'); u.hidden = true; u.textContent = '0';
  } else if (c.classList.contains('docked')) {
    document.body.appendChild(c);
    c.classList.remove('docked'); c.classList.add('collapsed');
  }
}
// Cada mensaje es una entrada del LogViewer: "hora ⇦ remitente ⇨ destinatario" y el texto debajo
function chatLine(msg) {
  const box = $('#chat-msgs');
  const d = document.createElement('div');
  if (msg.sys) { d.className = 'ipm-sys'; d.textContent = msg.sys; }
  else {
    const to = msg.to || (S.match ? (msg.mine ? foeNick(S.match) : S.player.nickname) : EVERYONE);
    const dept = msg.mine ? S.player.department : S.online.get(msg.from_id)?.dept;
    d.className = 'ipm-entry' + (msg.mine ? ' mine' : '');
    d.dataset.from = msg.from;
    d.innerHTML = `<div class="ipm-head"><span class="t">${stamp(msg.ts, false)}</span><span class="arr">⇦</span>
      <span class="nm dp" style="--c:${deptColor(dept)}">${esc(msg.from)}</span><span class="arr">⇨</span><span class="nm">${esc(to)}</span></div>
      <div class="ipm-text"></div>`;
    const body = d.querySelector('.ipm-text');
    if (msg.emote) {
      const e = emoteById(msg.emote);
      const c = document.createElement('canvas');
      drawSprite(c, emoteSprite(charBySlug(msg.char), e?.face || 'face_smirk'), S.parts);
      body.append(c, e?.text || msg.emote);
    } else {
      body.textContent = msg.text;
      d.title = 'Doble clic para citar';
      d.addEventListener('dblclick', () => quoteInChat(msg.text));
    }
    if (!S.chatUsers.has(msg.from)) {
      S.chatUsers.add(msg.from);
      const o = document.createElement('option'); o.textContent = msg.from; $('#chat-filter').appendChild(o);
    }
    if (S.chatFilter && S.chatFilter !== msg.from) d.hidden = true;
  }
  box.appendChild(d);
  while (box.children.length > 150) box.firstChild.remove();
  box.scrollTop = box.scrollHeight;
  if (!msg.sys && !msg.mine && $('#chat').classList.contains('collapsed')) {
    const u = $('#chat-unread'); u.hidden = false; u.textContent = String(Number(u.textContent || 0) + 1);
    sfx('ipmsg');
  }
}
// responder citando, al estilo IPMsg: tu respuesta arriba y el original con ">" debajo
function quoteInChat(text) {
  const input = $('#chat-input');
  const quote = String(text).split('\n').map(l => '>' + l).join('\n');
  input.value = (`\n\n${quote}`).slice(0, 300);
  $('#chat').classList.remove('collapsed');
  input.focus(); input.setSelectionRange(0, 0);
}
$('#chat-filter').addEventListener('change', (e) => {
  S.chatFilter = e.target.value;
  document.querySelectorAll('#chat-msgs .ipm-entry').forEach(d => { d.hidden = !!S.chatFilter && d.dataset.from !== S.chatFilter; });
  const box = $('#chat-msgs'); box.scrollTop = box.scrollHeight;
});
function townBubbleEmote(id, emoteId, char) {
  const e = emoteById(emoteId); if (!e || !S.town || S.zone !== 'town') return;
  const c = document.createElement('canvas');
  drawSprite(c, emoteSprite(char, e.face), S.parts);
  S.town.emote(id, c, e.text);
}
function onChat(p) {
  if (!p || p.from_id === S.player?.id || typeof p.text !== 'string') return;
  chatLine({ from: p.from, from_id: p.from_id, text: p.text.slice(0, 300), ts: Date.now() });
  if (!S.match && S.zone === 'town' && sameMap(p.from_id)) S.town?.say(p.from_id, p.text.slice(0, 300));
}
// ¿está ese jugador en el mismo mapa que yo? (para los bocadillos del pueblo)
function sameMap(id) { const m = S.online.get(id); return m?.zone === 'town' && (m.map || 'vila') === (S.town?.mapId || 'vila'); }
function onEmote(p) {
  if (!p || p.from_id === S.player?.id || !emoteById(p.emote)) return;
  chatLine({ from: p.from, from_id: p.from_id, emote: p.emote, char: p.char, ts: Date.now() });
  if (isActive('battle') && !S.local) showBubble('foe', p.emote, charOfSide(other()));
  else if (sameMap(p.from_id)) townBubbleEmote(p.from_id, p.emote, charBySlug(p.char));
}
function showBubble(side, emoteId, char) {
  const e = emoteById(emoteId); if (!e) return;
  const canvas = $('#' + side + '-sprite'); const slot = canvas.parentElement;
  slot.querySelectorAll('.emote').forEach(x => x.remove());
  const d = document.createElement('div');
  d.className = 'emote ' + (side === 'me' ? 'right' : 'left');
  const c = document.createElement('canvas');
  drawSprite(c, emoteSprite(char, e.face), S.parts, { flip: side === 'foe' });
  d.appendChild(c);
  const t = document.createElement('span'); t.textContent = e.text; d.appendChild(t);
  slot.appendChild(d);
  setTimeout(() => d.classList.add('out'), 2300);
  setTimeout(() => d.remove(), 2800);
}
function renderEmoteTray(container) {
  if (!container) return;
  container.innerHTML = '';
  const char = S.match ? charOfSide(S.me) : defaultChar();
  for (const e of EMOTES) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'emote-btn'; b.title = e.text;
    const c = document.createElement('canvas');
    drawSprite(c, emoteSprite(char, e.face), S.parts);
    b.appendChild(c);
    const t = document.createElement('span'); t.textContent = e.text; b.appendChild(t);
    b.addEventListener('click', () => sendEmote(e.id));
    container.appendChild(b);
  }
}
async function sendEmote(id) {
  const now = Date.now();
  if (now - lastEmoteAt < 2000) return toast('Espera un poco entre emotes');
  lastEmoteAt = now;
  const char = S.match ? charOfSide(S.me) : defaultChar();
  const payload = { from: S.player.nickname, from_id: S.player.id, emote: id, char: char?.slug };
  chatLine({ ...payload, mine: true, ts: now });
  if (isActive('battle')) showBubble('me', id, char);
  else if (isActive('town')) townBubbleEmote(S.player.id, id, char);
  const target = chatTarget();
  if (target) await target.send({ type: 'broadcast', event: 'emote', payload });
}
async function sendChat(text) {
  text = text.replace(/^\s*\n|\s+$/g, '').slice(0, 300);
  if (!text) return;
  const now = Date.now();
  if (now - lastChatAt < 600) return;
  lastChatAt = now;
  const payload = { from: S.player.nickname, from_id: S.player.id, text, ts: now };
  chatLine({ ...payload, mine: true });
  if (isActive('town')) S.town?.say(S.player.id, text);
  const target = chatTarget();
  if (target) await target.send({ type: 'broadcast', event: 'chat', payload });
}
$('#chat-toggle').addEventListener('click', () => {
  const c = $('#chat'); c.classList.toggle('collapsed');
  if (!c.classList.contains('collapsed')) { const u = $('#chat-unread'); u.hidden = true; u.textContent = '0'; $('#chat-input').focus(); }
});
$('#chat-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = $('#chat-input');
  sendChat(input.value); input.value = '';
  if (isActive('town')) input.blur();   // devolver el teclado al pueblo
});
$('#chat-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); $('#chat-form').requestSubmit(); }
});

// ---------- combates contra vecinos (el de DIO Express) y modo demo ----------
// Se juegan en el navegador (localbattle.js) con las mismas reglas que el servidor.
// Demo: ?demo=battle&a=paxi&b=gaiteiro · ?demo=pick · ?demo=result&won=1 · ?demo=dio (duelo sin misión)
const DIO_CHAR = {
  id: 'npc-dio', slug: 'ferrollo', name: 'Ferrollo', type: 'pedra',
  description: 'El Paximón de D.I.O Express. Cambia cerraduras, precinta puertas y no se va ni con agua caliente.',
  stats: { hp: 230, atk: 34, def: 34, spd: 22, chakra: 10 },
  moves: ['croio', 'pedrada', 'corremento', 'meter_medo'],
  sprite: { size: 64, palette: { D: '#111111', H: '#B9B9C2', L: '#7C7C88', P: '#4E4E58', S: '#393941', X: '#26262C', I: '#D2412F', B: '#FF8A80' },
    layers: [{ part: 'fx_shadow' }, { part: 'body_star_chubby' }, { part: 'face_grumpy' },
      { part: 'acc_sailor_cap', palette: { W: '#C9433A', w: '#9E2F27', N: '#FFFFFF', Y: '#FFFFFF', V: '#1A1A1A' } },
      { part: 'acc_dio_key' }] },
  lines: {
    voice: { pitch: 0.6, rate: 0.95 },
    start: ['¡D.I.O Express! ¡Desalojo en 24 horas!', 'Esta casa ya tiene dueño. Yo.'],
    hit: ['¡Fuera de aquí!', '¡Esto es un desalojo!', '¡Cambio de cerradura!'],
    hurt: ['¡Ay! ¡Que tengo un papel firmado!', '¡Eso no estaba en la servilleta!'],
    low_hp: ['Esto no estaba en el presupuesto…'],
    win: ['¡La casa es mía!'],
    lose: ['Me voy… pero volveré con más servilletas.'],
  },
};
// la llave del logo de D.I.O Express como accesorio del Paximón (pieza que no está en la BBDD)
function dioKeyPart() {
  const rows = ['.....RRRRR.....', '...RRRRRRRRR...', '..RRRRRRWRRRRR.', '.RRRRRRWWWRRRRR', '.RRRRRWWWWWRRRR', 'RRRRRWWWWWWWRRR',
    'RRRRWWWWWWWWWRR', 'RRRRRRWWWWWRRRR', 'RRRRRRWWWWWRRRR', 'RRRRRRWWWWWRRRR', '.RRRRRWWWWWRRR.', '.RRRRRRRRRRRRR.', '..RRRRRRRRRRR..',
    '...RRRRRRRRR...', '.....RRRRR.....', '......RRR......', '......RRRRR....', '......RRRRR....', '......RRR......', '......RRRRRR...',
    '......RRRRRR...', '......RRR......'];
  const h = rows.length + 2, w = rows[0].length + 2;
  const g = Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => (rows[y - 1]?.[x - 1] && rows[y - 1][x - 1] !== '.' ? rows[y - 1][x - 1] : '.')));
  const out = g.map((row, y) => row.map((c, x) => (c !== '.' ? c : [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy]?.[x + dx] && g[y + dy][x + dx] !== '.') ? 'O' : '.')));
  return { id: 'acc_dio_key', kind: 'accessory', width: w, height: h, offset_x: 46, offset_y: 26, pixels: out.map(r => r.join('')), palette: { R: '#C9433A', W: '#FFFFFF', O: '#1A1A1A' } };
}
function registerNpcChars() {
  if (!S.parts.acc_dio_key) S.parts.acc_dio_key = dioKeyPart();
  S.charById[DIO_CHAR.id] = DIO_CHAR;
}

// empieza el duelo por la casa de Maricarmen: elegir Paximón y a pelear
function startDioBattle({ quest = 'maricarmen' } = {}) {
  if (S.match || S.local) return;
  registerNpcChars();
  S.local = { kind: 'npc', quest, foe: DIO_CHAR, foeNick: DIO_NAME, stage: 'pedra' };
  S.returnTo = 'town';
  show('pick');
  $('#pick-waiting').hidden = true;
  const vs = $('#pick-vs'); vs.innerHTML = `vs ${esc(DIO_NAME)} `;
  const badge = dioBadge().toCanvas(); badge.className = 'dio-badge'; vs.appendChild(badge);
  S.pickedChar = null;
  renderRoster($('#roster-pick'), true, (c, el) => {
    if (S.pickedChar) return;
    S.pickedChar = c.id; markPicked(el);
    $('#pick-waiting').textContent = `${DIO_NAME} saca a ${DIO_CHAR.name}…`;
    setTimeout(() => startLocalBattle(c), 900);
  });
}
function startLocalBattle(myChar, fighters = null) {
  const L = S.local, foeChar = L.foe;
  S.me = 'p1';
  S.seen = new Set(); S.queue = []; S.lowHpSaid = {}; S.sending = false; S.inGame = false; S.turnReady = false;
  $('#log').innerHTML = '';
  const p1 = fighters?.p1 || fighter(myChar), p2 = fighters?.p2 || fighter(foeChar);
  const first = p1.spd >= p2.spd ? 'p1' : 'p2';
  S.match = { id: 'local-' + Date.now(), status: 'active', p1_nick: S.player.nickname, p2_nick: L.foeNick, state: { p1, p2 }, current_player: first, pending: null, turn: 1, local: true };
  S.coinsBefore = Number(S.player.coins || 0);
  setZone('battle');
  Music.play(L.music || 'batalla');
  showBattle(S.match);
  if (L.stage) { BATTLE.stage = L.stage; $('#stage-name').textContent = STAGES[L.stage]?.name || ''; layoutField(); }
  playEvent({ type: 'start', first }).then(async () => {
    if (L.rule?.start) await L.rule.start(BT, S.match, L);
    renderState(S.match);
    await sleep(first === 'p2' ? 600 : 0);
    beginTurn(first);
  });
}
// en combates locales el motor ya apunta de quién es el turno al calcular la jugada anterior, pero
// el jugador solo puede actuar cuando beginTurn le da paso (turnReady)
const localReady = () => !S.local || (S.turnReady && S.match?.current_player === S.me);
// empieza el turno de alguien: reglas especiales, «en espera» y, si es el rival, su jugada
async function beginTurn(who) {
  const m = S.match, L = S.local;
  if (!m || m.status !== 'active' || !L) return;
  const f = m.state[who];
  // mientras hablan la regla o la música de espera nadie puede actuar (si no, se cuela un golpe a
  // mitad de la cata o te saltas la espera)
  S.turnReady = false;
  m.current_player = null; renderState(m);
  if (L.rule?.beforeTurn) {
    const r = await L.rule.beforeTurn(BT, m, L, who);
    if (m.status === 'finished') return finishLocal(m.winner === 'p1');
    if (r?.skip) return passTurn(who);
  }
  if (f.hold) {
    f.hold--;
    const back = Music.current;
    Music.play('espera');
    await playEvent({ type: 'info', text: `${f.name} sigue en espera… 🎵 Su llamada es muy importante para nosotros.` });
    await sleep(1400);
    if (back) Music.play(back);
    return passTurn(who);
  }
  m.current_player = who;
  if (who === 'p2') { await sleep(500); return aiTurn(); }
  S.turnReady = true;
  renderState(m);
}
// el turno pasa al otro sin hacer nada (en espera, reglas…)
function passTurn(who) {
  const m = S.match, next = who === 'p1' ? 'p2' : 'p1';
  const o = m.state[next];
  o.chakra = Math.min(o.max_chakra, o.chakra + 2);
  m.current_player = next; m.turn = (m.turn || 1) + 1;
  renderState(m);
  return beginTurn(next);
}
async function localTurn(who, mv, skill) {
  const m = S.match; if (!m || m.status !== 'active') return;
  const L = S.local, R = L?.rule || {};
  const me = m.state[who];
  S.turnReady = false;
  me.guard = false;
  me.chakra = Math.max(0, me.chakra - (mv.cost || 0));
  m.current_player = null; renderState(m);
  let opts = {};
  if (R.move) { const r = await R.move(BT, m, L, who, mv); if (r) { mv = r.mv || mv; opts = r.opts || {}; } }
  let a = skill ?? 0.6, d = 0, kind = null;
  if (mv.power > 0 && mv.cost >= 3 && !opts.immune && opts.fixedDamage == null && !opts.hits) {
    if (mv.minigame === 'mash_duel') {
      kind = 'duel';
      // guerra de clics contra el vecino: su ritmo es simulado
      const rate = 3.8 + Math.random() * 1.6, t0 = performance.now();
      S.inGame = true;
      const mine = await playMinigame('mash_duel', { title: mv.name, cost: 6, duel: { onCount: () => {}, getOpponent: () => Math.floor(((performance.now() - t0) / 1000) * rate) } });
      S.inGame = false;
      const theirs = Math.min(1, (rate * 5) / 30);
      if (who === 'p1') { a = mine; d = theirs; } else { a = theirs; d = mine; }
    } else if (mv.minigame !== 'webgeo') {
      kind = 'dodge';
      if (who === 'p2') { S.inGame = true; d = await playMinigame('dodge', { title: `${mv.name} de ${foeNick(m)}` }); S.inGame = false; }
      else d = Math.random() < 0.25 ? 1 : 0;
    }
  }
  if (S.debugPower && who === 'p1') opts.extraMult = (opts.extraMult || 1) * S.debugPower;   // solo para probar (?debug)
  const events = resolveLocal(m, who, mv, { a, d, kind, chart: opts.chart || S.chart, charType: S.charById[me.char_id]?.type, ...opts });
  if (opts.note && events.some(e => e.type === 'hit')) events.splice(events.findIndex(e => e.type === 'hit') + 1, 0, { type: 'info', text: opts.note });
  markKo(events);
  for (const ev of events) await playEvent(ev);
  if (who === 'p1' && me.errata) me.errata--;
  if (R.after) await R.after(BT, m, L, who, mv, events);
  await afterAction();
}
// después de cualquier acción: ¿alguien cayó?, ¿sale otro del equipo?, ¿quién sigue?
async function afterAction() {
  const m = S.match;
  renderState(m);
  if (m.status === 'finished' && S.local?.teams && !S.local.escaped) await nextFighter();
  if (m.status === 'finished') { await sleep(500); return finishLocal(m.winner === 'p1'); }
  if (m.current_player) { await sleep(m.current_player === 'p2' ? 700 : 0); return beginTurn(m.current_player); }
}
// en combates por equipos el KO no acaba el combate si quedan compañeros
function markKo(events) {
  const L = S.local;
  if (!L?.teams) return;
  for (const ev of events) if (ev.type === 'ko' && L.teams[ev.loser].some(f => f.hp > 0)) ev.more = true;
}
async function nextFighter() {
  const m = S.match, L = S.local;
  const loser = m.winner === 'p1' ? 'p2' : 'p1';
  const alive = L.teams[loser].filter(f => f.hp > 0);
  if (!alive.length) return false;
  const next = loser === 'p1' && alive.length > 1 ? (await chooseFighter('¡Tu Paximón no puede seguir! ¿Quién sale ahora?', alive, false)) || alive[0] : alive[0];
  L.idx[loser] = L.teams[loser].indexOf(next);
  next.guard = false;
  m.state[loser] = next; m.status = 'active'; m.winner = null;
  S.lowHpSaid[loser] = false;
  await playEvent({ type: 'switch', actor: loser, name: next.name });
  if (L.rule?.switched) await L.rule.switched(BT, m, L, loser);
  m.current_player = loser;   // el que entra mueve primero
  renderState(m);
  return true;
}
// elegir Paximón del equipo (al caer uno o para cambiar gastando el turno)
function chooseFighter(title, list, closable = true) {
  return new Promise((resolve) => {
    const mo = openModal(`<h2>${esc(title)}</h2><div class="swap-list"></div>`, { cls: 'swap-modal', closable, onClose: () => resolve(null) });
    const box = mo.el.querySelector('.swap-list');
    for (const f of list) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'swap-row';
      const pct = Math.round(100 * f.hp / f.max_hp);
      b.innerHTML = `<canvas></canvas><span><b>${esc(f.name)}</b> Nv.${f.lv}<span class="hpbar mini"><span class="hp ${pct <= 25 ? 'low' : pct <= 50 ? 'mid' : ''}" style="width:${pct}%"></span></span><span class="small muted">${f.hp}/${f.max_hp} PV</span></span>`;
      drawSprite(b.querySelector('canvas'), S.charById[f.char_id]?.sprite || { layers: [] }, S.parts);
      b.addEventListener('click', () => { sfx('select'); mo.close(true); resolve(f); });
      box.appendChild(b);
    }
  });
}
// cambiar de Paximón en tu turno (gasta el turno)
async function switchFighter() {
  const m = S.match, L = S.local;
  if (!L?.teams || !localReady() || S.sending || S.inGame) return;
  const bench = L.teams.p1.filter(f => f.hp > 0 && f !== m.state.p1);
  if (!bench.length) return;
  const f = await chooseFighter('¿A quién sacas?', bench);
  if (!f || !localReady()) return;
  S.sending = true; S.turnReady = false; lockMoves();
  m.state.p1.guard = false;
  L.idx.p1 = L.teams.p1.indexOf(f);
  m.state.p1 = f;
  await playEvent({ type: 'switch', actor: 'p1', name: f.name });
  S.sending = false;
  passTurn('p1');
}
async function aiTurn() {
  const m = S.match; if (!m || m.status !== 'active') return;
  const L = S.local;
  const me = m.state.p2, foe = m.state.p1;
  const list = [...(S.charById[me.char_id]?.moves || []).map(id => S.moves[id]), ...S.universal].filter(Boolean);
  const mv = (L?.rule?.ai && L.rule.ai(BT, m, L, list)) || aiPick(me, foe, list, L?.chart || S.chart);
  await localTurn('p2', mv, 0.35 + Math.random() * 0.55);
}
async function finishLocal(won, leave = false) {
  const L = S.local, m = S.match;
  if (!L || !m || L.finished) return;
  L.finished = true;
  m.status = 'finished'; m.winner = won ? 'p1' : 'p2';
  if (leave) await playEvent({ type: 'leave', actor: 'p1', winner: 'p2' });
  if (L.rule?.end) L.rule.end(BT, m, L);
  Music.play(won ? 'vitoria' : null, { loop: false });
  if (L.kind === 'demo') { await showResult(m); return; }
  if (L.kind === 'story') {
    // la vida de tu equipo se queda como acabó (en la cafetería te curan)
    Story.patch(s => { for (const f of L.teams.p1) { const mem = s.team.find(x => x.slug === f.slug); if (mem) mem.hp = f.hp; } });
    const res = won ? 'won' : L.escaped ? 'escaped' : 'lost';
    S.afterResult = () => { enterTown(L.back); setTimeout(() => L.resolve(res), 400); };
    await showResult(m);
    return;
  }
  if (L.quest) {
    try { savePlayer(await rpc('quest_result', { p_secret: S.player.secret, p_quest: L.quest, p_won: won })); }
    catch (e) { toast(e.message, true); }
  }
  S.afterResult = () => {
    enterTown({ map: 'vila', x: 38, y: 16, dir: 'up' });
    setTimeout(() => S.town?.showDialog(DIO_NAME, won ? DIO_LOSES : DIO_WINS), 450);
  };
  await showResult(m);
}

// ---------- combates del modo historia ----------
// Equipos de hasta tres Paximóns con nivel, la vida que traigan y las reglas de cada jefe
// (storybattle.js). Devuelve una promesa con 'won', 'lost' o 'escaped' cuando vuelves al pueblo.
function startStoryBattle(id) {
  return new Promise((resolve) => {
    const cfg = BATTLES[id];
    const team = Story.team().filter(mm => (mm.hp ?? mm.max) > 0);
    if (!cfg || !team.length) return resolve('lost');
    const p1 = team.map(mm => ({ ...Story.scaledFighter(Story.charFor(mm.slug), mm.lv, mm.hp ?? mm.max), slug: mm.slug }));
    const p2 = cfg.team.map(([k, lv]) => ({ ...Story.scaledFighter(S.charById['st-' + k], lv), slug: k }));
    S.local = { kind: 'story', id, cfg, rule: RULES[cfg.rule] || {}, teams: { p1, p2 }, idx: { p1: 0, p2: 0 }, foe: null, foeNick: cfg.nick, stage: cfg.stage, music: cfg.music, back: S.town?.getPos(), resolve };
    S.returnTo = 'town';
    stopVoice();
    startLocalBattle(null, { p1: p1[0], p2: p2[0] });
  });
}
// herramientas que usan las reglas especiales de los jefes
const castName = (cast) => ({ algoritmo: 'O Algoritmo', manuel: 'Don Manuel' }[cast] || cast);
const BT = {
  info: (text, sfxId = null) => playEvent({ type: 'info', text, sfx: sfxId }),
  async voice(ln) {
    if (!ln) return;
    const [cast, text] = ln;
    appendLog({ type: 'info', text: `${castName(cast)}: «${text}»` });
    const ok = await sayVoice(cast, text);
    if (!ok) await sleep(Math.min(4500, 1200 + text.length * 30));
  },
  sfx: (id) => sfx(id),
  cata: async (drunk) => { S.inGame = true; try { return await playCataRound({ drunk, caseta: 'O Enólogo Escuro' }); } finally { S.inGame = false; } },
  carrusel: async () => { S.inGame = true; try { return await playCarrusel({ ...CARRUSEL, sfx }); } finally { S.inGame = false; } },
  carruselHits: () => playCarrusel.lastHits,
  memoria: async () => { S.inGame = true; try { return await playMemoria({ ...MEMORIA, sfx }); } finally { S.inGame = false; } },
  memoriaPairs: () => playMemoria.lastPairs,
  setDrunk: (lv) => { const f = $('#field'); f.classList.toggle('drunk', lv > 0); f.style.setProperty('--sway', String(lv)); },
  hud: (html) => { $('#story-hud').innerHTML = html; },
  render: () => renderState(S.match),
  escape: () => { S.local.escaped = true; S.match.status = 'finished'; S.match.winner = 'p2'; },
  types: () => S.typeList.map(t => t.id),
  move: (id) => (id ? S.moves[id] : null),
  whiteout: (v) => { const f = $('#field'); f.classList.toggle('whiteout', v > 0); f.style.setProperty('--white', String(v)); },
  shake: () => { const f = $('#field'); f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake'); },
  story: () => S.player?.story || {},
  // daño directo al rival (acciones especiales como pegar capturas)
  async hitFoe(dmg, text) {
    const m = S.match, foe = m.state.p2;
    foe.hp = Math.max(0, foe.hp - dmg);
    const evs = [{ type: 'hit', actor: 'p1', move: null, move_name: 'Pegar capturas', damage: dmg, effectiveness: 1, target_hp: foe.hp }, { type: 'info', text }];
    if (foe.hp <= 0) { m.status = 'finished'; m.winner = 'p1'; evs.push({ type: 'ko', actor: 'p1', winner: 'p1', loser: 'p2' }); }
    markKo(evs);
    for (const ev of evs) await playEvent(ev);
  },
};
// botones propios de la historia: cambiar de Paximón y las acciones de algunos jefes
function storyButtons(m) {
  document.querySelectorAll('#actions .story-act').forEach(b => b.remove());
  const L = S.local;
  if (L?.kind !== 'story') return;
  const acts = $('#actions');
  const sw = document.createElement('button');
  sw.className = 'move universal story-act'; sw.id = 'btn-switch-fighter';
  sw.innerHTML = '<div class="mv-top"><span class="mv-name">🔁 Cambiar</span><span class="mv-cost free">GASTA EL TURNO</span></div><span class="mv-meta"></span>';
  sw.addEventListener('click', switchFighter);
  acts.appendChild(sw);
  for (const a of L.rule?.actions?.(BT, m, L) || []) {
    const b = document.createElement('button');
    b.className = 'move universal story-act rule-act';
    b.innerHTML = `<div class="mv-top"><span class="mv-name">${esc(a.label)}</span></div><span class="mv-meta">${esc(a.meta || '')}</span>`;
    b.addEventListener('click', async () => {
      const mm = S.match;
      if (S.sending || S.inGame || !localReady()) return;
      S.sending = true; S.turnReady = false; lockMoves();
      mm.state.p1.guard = false;
      try { await a.run(); } finally { S.sending = false; }
      if (mm.status === 'active') { mm.current_player = 'p2'; mm.state.p2.chakra = Math.min(mm.state.p2.max_chakra, mm.state.p2.chakra + 2); mm.turn++; }
      await afterAction();
    });
    acts.appendChild(b);
  }
}
// lo que cambia en cada turno: equipo, botones con erratas o resumidos por la IA
function renderStoryState(m, myTurn) {
  const L = S.local;
  for (const [side, ui] of [['p1', 'me'], ['p2', 'foe']]) {
    const dots = $('#' + ui + '-team');
    if (!dots) continue;
    dots.innerHTML = L?.teams ? L.teams[side].map(f => `<i class="${f.hp <= 0 ? 'ko' : f === m.state[side] ? 'on' : ''}"></i>`).join('') : '';
  }
  if (L?.kind !== 'story') return;
  const sw = $('#btn-switch-fighter');
  if (sw) {
    const bench = L.teams.p1.filter(f => f.hp > 0 && f !== m.state.p1).length;
    sw.disabled = !myTurn || S.sending || S.inGame || !bench;
    sw.querySelector('.mv-meta').textContent = bench ? `${bench} en el banquillo` : 'No hay nadie más';
  }
  document.querySelectorAll('#actions .rule-act').forEach(b => { b.disabled = !myTurn || S.sending || S.inGame; });
  // grallas de A Errata y resúmenes de O Algoritmo en los nombres de tus movimientos
  const mode = m.state.p1.errata ? 'errata' : L.rule?.labels?.(BT, m, L);
  const box = $('#moves');
  if (box.dataset.mode !== (mode || '')) {
    box.dataset.mode = mode || '';
    const btns = [...box.querySelectorAll('.move')];
    for (const b of btns) {
      const mv = S.moves[b.dataset.move], n = b.querySelector('.mv-name');
      if (!mv || !n) continue;
      n.textContent = mode === 'errata' ? gralla(mv.name) : mode === 'hidden' ? 'Resumido por IA' : mv.name;
    }
    if (mode === 'errata') btns.sort(() => Math.random() - 0.5).forEach(b => box.appendChild(b));
  }
}

// modo demo: combate local para revisar diseño, sprites y animaciones sin tocar la base de datos
function demoBattle(params) {
  const pickC = (slug, fb) => S.chars.find(c => c.slug === slug) || S.chars[fb % S.chars.length];
  S.demo = true;
  S.player = { id: 'demo', nickname: 'Tú', secret: null, department: null, look: {}, coins: 5, inventory: {}, quests: {} };
  registerNpcChars();
  const vsDio = params.get('demo') === 'dio' || params.get('b') === 'ferrollo';
  const foe = vsDio ? DIO_CHAR : pickC(params.get('b'), 5);
  S.local = { kind: 'demo', foe, foeNick: vsDio ? DIO_NAME : 'Rival', stage: params.get('stage') || (vsDio ? 'pedra' : null) };
  startLocalBattle(pickC(params.get('a'), 0));
}

// ---------- arranque ----------
(async function main() {
  try { await loadStatic(); } catch (e) { toast('Error cargando datos: ' + e.message, true); return; }
  $('#town-name').textContent = TOWN_NAME;
  document.querySelectorAll('img.ipm-ico').forEach(i => { i.src = logoDataUrl(); });
  $('#me-coin-ico').src = coinDataUrl();
  const params = new URLSearchParams(location.search);
  Story.init({
    S, rpc, toast, openModal, modalOpen, savePlayer, renderCoins, charCard, drawSprite, logoUrl: logoDataUrl(),
    town: () => S.town, isTownActive: () => isActive('town'), battle: startStoryBattle, refreshWorld, onStory: () => setTownHud(),
    // ir a otro sitio en mitad de una escena (con fundido si ya estás en el pueblo)
    warp: (pos) => new Promise((resolve) => {
      if (isActive('town') && S.town) { S.town.startWarp(pos); setTimeout(resolve, 650); }
      else { enterTown(pos); setTimeout(resolve, 300); }
    }),
    avatarFor: () => avatarCanvas({ skin: 1, hair: 6, style: 'corto' }, '#795548', 'down', 0, null, ['mustache']),
  });
  preloadSfx(['hit', 'crit', 'miss', 'faint', 'buff', 'debuff', 'heal', 'chakra', 'guard', 'select', 'ipmsg', 'door']);
  if (params.has('debug')) window.PX = { S, rpc, enterTown, startDioBattle, setDrunk, Story, startStoryBattle, Music, useMove };   // solo para probar desde la consola
  if (params.get('demo') === 'battle' || params.get('demo') === 'dio') return demoBattle(params);
  if (params.get('demo') === 'pick') {
    show('pick'); $('#pick-vs').textContent = 'vs Rival';
    return renderRoster($('#roster-pick'), true, (c, el) => markPicked(el));
  }
  if (params.get('demo') === 'result') { demoBattle(params); return showResult({ ...S.match, winner: params.get('won') === '0' ? 'p2' : 'p1' }); }
  // antes de entrar siempre se elige con qué usuario (o se crea uno nuevo)
  await showUserPicker();
})();
