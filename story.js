// Motor del modo historia «A Última Páxina»: estado y guardado, escenas (diálogos con voz, música,
// efectos, vecinos que se mueven), disparadores (entrar en un mapa, hablar con alguien, tocar un
// objeto, pisar una casilla), el diario del IPaxMsg y el equipo de hasta tres Paximóns.
// No sabe pintar combates: los pide a la app con api.battle(id).
import {
  CAST, CHAPTERS, SCRIPTS, BATTLES, FOES, STARTERS, SELOS, OUTFITS, ACTS, IPM_START, PAXINAS_TOTAL, TEAM_MAX, START_LEVEL,
  NON_COLGUES, STRUCTURER, ENTREVISTA, CATALOGO, chapterIndex,
} from './storydata.js';
import { SPAWNS, houseEntry } from './storymaps.js';
import { Music, sfx, say, hasVoice, stopVoice, musicForMap } from './audio.js';
import { playNonColgues, playStructurer, playEntrevista, showCatalogo } from './storygames.js';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pad2 = (n) => String(n).padStart(2, '0');
const nowHM = () => { const d = new Date(); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
class Abort extends Error {}

let api = null;          // lo que la app le presta al motor (ver init)
let busy = false;        // hay una escena en marcha
let saveTimer = null;

// ---------- estado ----------
const st = () => api.S.player?.story || {};
const chapter = () => CHAPTERS.find(c => c.id === st().ch) || null;
const started = () => !!st().ch;
const flag = (f) => !!st().flags?.[f];
function patch(fn) {
  const s = structuredClone(st());
  s.flags ||= {}; s.team ||= []; s.box ||= []; s.selos ||= []; s.done ||= []; s.outfits ||= []; s.log ||= [];
  fn(s);
  api.S.player.story = s;
  scheduleSave();
  api.onStory?.();
  return s;
}
function scheduleSave(now = false) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, now ? 0 : 600);
}
async function save() {
  if (!api.S.player?.secret || api.S.demo) return;
  const before = Number(api.S.player.coins || 0);
  try {
    const pl = await api.rpc('story_save', { p_secret: api.S.player.secret, p_story: st() });
    const gained = Math.round((Number(pl.coins) - before) * 100) / 100;
    api.S.player.coins = pl.coins; api.S.player.inventory = pl.inventory;
    api.renderCoins?.();
    if (gained > 0) { sfx('coins'); api.toast(`+${String(gained).replace('.', ',')} paxicoins por el capítulo`); }
  } catch (e) { console.warn('story_save', e); }
}

// ---------- equipo ----------
const lvMult = (lv) => ({ hp: 1 + 0.01 * (lv - START_LEVEL), st: 1 + 0.02 * (lv - START_LEVEL) });
export function charFor(slug) {
  if (FOES[slug]) return api.S.charById['st-' + slug];
  return api.S.chars.find(c => c.slug === slug);
}
export function maxHp(m) { const c = charFor(m.slug); return c ? Math.round(c.stats.hp * lvMult(m.lv).hp) : 100; }
// luchador de combate a partir de un miembro del equipo o de un rival [id, nivel]
export function scaledFighter(c, lv, hp = null) {
  const k = lvMult(lv);
  const max = Math.round(c.stats.hp * k.hp);
  return {
    char_id: c.id, slug: c.slug, name: c.name, type: c.type, lv, hp: hp == null ? max : Math.max(0, Math.min(max, hp)), max_hp: max,
    atk: Math.round(c.stats.atk * k.st), def: Math.round(c.stats.def * k.st), spd: Math.round(c.stats.spd * k.st),
    atk_stage: 0, def_stage: 0, chakra: 4, max_chakra: c.stats.chakra ?? 10, guard: false,
  };
}
export const team = () => (st().team || []).map(m => ({ ...m, max: maxHp(m) }));
const teamLevel = () => Math.max(START_LEVEL, ...(st().team || []).map(m => m.lv || START_LEVEL));
function healTeam() { patch(s => { for (const m of s.team) m.hp = maxHp(m); }); }
function addMember(slug) {
  const lv = teamLevel();
  patch(s => {
    const m = { slug, lv, hp: null };
    m.hp = maxHp(m);
    if (s.team.length < TEAM_MAX) s.team.push(m); else s.box.push(m);
  });
}

// ---------- IPaxMsg: avisos y diario ----------
function ipm(from, to, text, time = nowHM()) {
  patch(s => { s.log.push({ t: time, from, to, text }); if (s.log.length > 60) s.log.splice(0, s.log.length - 60); });
  sfx('ipmsg');
  const box = document.createElement('div');
  box.className = 'ipm-pop ipm';
  box.innerHTML = `<div class="ipm-titlebar"><img class="ipm-ico" alt="" src="${api.logoUrl}"><span class="ipm-title">Mensaje recibido</span><span class="ipm-winbtns"><i>✕</i></span></div>
    <div class="ipm-head"><span class="tm">${esc(time)}</span> ⇦ <span class="nm">${esc(from)}</span> ⇨ <span class="nm">${esc(to === 'Ti' ? (api.S.player?.nickname || 'Ti') : to)}</span></div>
    <div class="ipm-text">${esc(text)}</div>`;
  (document.getElementById('ipm-pops') || document.body).appendChild(box);
  const close = () => { box.classList.add('out'); setTimeout(() => box.remove(), 400); };
  box.addEventListener('click', () => { close(); diary(); });
  setTimeout(close, 7000);
}
function titleCard(kicker, name, ms = 3200) {
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = 'story-title';
    el.innerHTML = `<div class="k">${esc(kicker)}</div><div class="n">${esc(name)}</div><div class="p">A ÚLTIMA PÁXINA</div>`;
    document.body.appendChild(el);
    Music.play('historia');
    setTimeout(() => { el.classList.add('out'); setTimeout(() => { el.remove(); resolve(); }, 600); }, ms);
  });
}
function badge(kind, text, sub = '') {
  const el = document.createElement('div');
  el.className = 'story-badge ' + kind;
  el.innerHTML = `<div class="ico"></div><div><b>${esc(text)}</b>${sub ? `<span>${esc(sub)}</span>` : ''}</div>`;
  document.body.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 500); }, 2600);
  return sleep(2200);
}

export function objective() {
  if (!started()) return 'Modo historia: ve a la casa de Edición, Rosalía te espera.';
  return chapter()?.goal || '';
}

export function diary() {
  if (api.modalOpen()) return;
  sfx('diary');
  const s = st(), ch = chapter();
  const mo = api.openModal(`<div class="ipm diary">
      <div class="ipm-titlebar"><img class="ipm-ico" alt="" src="${api.logoUrl}"><span class="ipm-title">IPaxMsg · Diario de encargos — A Última Páxina</span></div>
      <div class="diary-body">
        <section class="diary-goal"><b>${ch ? `Acto ${ch.act} · ${esc(ACTS[ch.act])}` : 'Modo historia'}</b>
          <span class="chap">${ch ? esc(ch.name) : 'Sin empezar'}</span><p>📌 ${esc(objective())}</p></section>
        <section><h3>Selos · ${(s.selos || []).length}/${SELOS.length}</h3><div class="selos">${SELOS.map(x => `<span class="selo ${(s.selos || []).includes(x.id) ? 'on' : ''}" style="--c:${x.color}" title="${esc(x.name)}">${(s.selos || []).includes(x.id) ? '★' : '·'}</span>`).join('')}</div>
          <p class="muted small">Páxinas de Ouro: <b>${s.paxinas || 0}/${PAXINAS_TOTAL}</b></p></section>
        <section><h3>Equipo</h3><div class="diary-team"></div>
          <p class="muted small">En la cafetería de Diego y Sabrina te curan el equipo gratis y puedes cambiarlo.</p></section>
        <section><h3>Mensajes</h3><div class="ipm-log diary-log">${(s.log || []).slice().reverse().map(m => `<div class="ipm-entry"><div class="ipm-head"><span class="tm">${esc(m.t)}</span> ⇦ <span class="nm">${esc(m.from)}</span> ⇨ <span class="nm">${esc(m.to === 'Ti' ? (api.S.player?.nickname || 'Ti') : m.to)}</span></div><div class="ipm-text">${esc(m.text)}</div></div>`).join('') || '<p class="ipm-empty">Todavía no hay mensajes.</p>'}</div></section>
        ${started() ? '<p class="diary-reset"><button class="btn small danger" type="button">Empezar la historia de nuevo</button></p>' : ''}
      </div></div>`, { cls: 'wide diary-modal' });
  const box = mo.el.querySelector('.diary-team');
  for (const m of team()) box.appendChild(memberRow(m));
  if (!team().length) box.innerHTML = '<p class="muted small">Todavía no tienes Paximón. Rosalía tiene tres en la oficina.</p>';
  mo.el.querySelector('.diary-reset .btn')?.addEventListener('click', () => {
    if (!confirm('¿Seguro? Se borra tu progreso de la historia (las paxicoins que ganaste te las quedas).')) return;
    api.S.player.story = { introShown: true };
    scheduleSave(true); api.onStory?.();
    mo.close();
    api.toast('Historia reiniciada. Rosalía te espera en la casa de Edición.');
  });
}
function memberRow(m) {
  const c = charFor(m.slug);
  const row = document.createElement('div');
  row.className = 'member';
  const pct = Math.round(100 * (m.hp ?? m.max) / m.max);
  row.innerHTML = `<canvas width="64" height="64"></canvas><div><b>${esc(c?.name || m.slug)}</b> <span class="muted">Nv.${m.lv}</span>
    <div class="hpbar mini"><div class="hp ${pct <= 25 ? 'low' : pct <= 50 ? 'mid' : ''}" style="width:${pct}%"></div></div><span class="small muted">${m.hp ?? m.max} / ${m.max} PV</span></div>`;
  if (c) api.drawSprite(row.querySelector('canvas'), { size: 64, ...c.sprite }, api.S.parts);
  return row;
}

// elegir un Paximón (inicial, nuevo miembro o cambio en la cafetería)
function pickModal(title, text, slugs) {
  return new Promise((resolve) => {
    const mo = api.openModal(`<h2>${esc(title)}</h2><p class="muted small">${esc(text)}</p><div class="roster pick-story"></div>`, { cls: 'wide', closable: false });
    const box = mo.el.querySelector('.roster');
    for (const slug of slugs) {
      const c = charFor(slug); if (!c) continue;
      const card = api.charCard(c, { selectable: true });
      card.addEventListener('click', () => { sfx('select'); mo.close(true); resolve(slug); });
      box.appendChild(card);
    }
  });
}
// organizar el equipo en la cafetería: tres en el equipo, el resto en reserva
export function teamModal() {
  if (api.modalOpen()) return;
  const s = st();
  const mo = api.openModal(`<h2>🎒 Tu equipo</h2><p class="muted small">Toca un Paximón del equipo y luego uno de la reserva para cambiarlos. El primero sale a combatir.</p>
    <h3>Equipo</h3><div class="team-slots"></div><h3>Reserva</h3><div class="team-box"></div>`, { cls: 'wide' });
  let sel = null;
  const paint = () => {
    const cur = st();
    for (const [key, sel2] of [['team', '.team-slots'], ['box', '.team-box']]) {
      const wrap = mo.el.querySelector(sel2); wrap.innerHTML = '';
      (cur[key] || []).forEach((m, i) => {
        const r = memberRow({ ...m, max: maxHp(m) });
        r.classList.toggle('on', sel && sel.key === key && sel.i === i);
        r.addEventListener('click', () => {
          sfx('select');
          if (!sel || sel.key === key) { sel = sel && sel.key === key && sel.i === i ? null : { key, i }; if (sel && key === 'team' && sel.i > 0) { patch(x => { const [a] = x.team.splice(i, 1); x.team.unshift(a); }); sel = null; } return paint(); }
          patch(x => { const a = x[sel.key][sel.i], b = x[key][i]; x[sel.key][sel.i] = b; x[key][i] = a; });
          sel = null; paint();
        });
        wrap.appendChild(r);
      });
      if (!(cur[key] || []).length) wrap.innerHTML = '<p class="muted small">Vacía.</p>';
    }
  };
  paint();
  void s;
}

// ---------- escenas ----------
const whoName = (cast) => (cast === 'yo' ? (api.S.player?.nickname || 'Tú') : cast === 'narr' || cast === 'sys' ? '' : CAST[cast]?.name || cast);
function dialog(entries) {
  return new Promise((resolve) => {
    const town = api.town();
    if (!town) return resolve();
    town.showDialog(null, entries, { onEnd: resolve });
  });
}
function ask(step) {
  return new Promise((resolve) => {
    const town = api.town();
    let picked = null;
    const options = step.options.map((o, i) => ({ label: o.label, action: () => { picked = i; } }));
    town.showDialog(null, [{ who: whoName(step.who), cast: step.who, ask: step.ask, options }], { onEnd: () => setTimeout(() => resolve(picked), 0) });
  });
}
async function run(steps, ctx = {}) {
  let batch = [];
  const flush = async () => { if (batch.length) { const b = batch; batch = []; await dialog(b); } };
  for (const s of steps || []) {
    if (Array.isArray(s)) {
      const [cast, text] = s;
      batch.push({ who: whoName(cast), text, cast: CAST[cast] ? cast : null, narr: cast === 'narr' || cast === 'sys' });
      continue;
    }
    await flush();
    if (s.ask) {
      const i = await ask(s);
      const o = s.options[i ?? s.options.length - 1];
      if (o?.then) await run(o.then, ctx);
      if (o?.act) await act(o.act, o.arg, ctx);
    }
    else if (s.act) await act(s.act, s.arg, ctx);
    else if (s.sfx) sfx(s.sfx);
    else if ('music' in s) Music.play(s.music);
    else if (s.wait) await sleep(s.wait);
    else if (s.ipm) ipm(...s.ipm);
    else if (s.title) await titleCard(...s.title);
    else if (s.walk) await api.town()?.walkNpc(s.walk[0], s.walk[1]);
    else if (s.face) api.town()?.faceNpc(...s.face);
    else if (s.spawn) { const t = api.town(); if (t && SPAWNS[s.spawn]) t.addNpc(SPAWNS[s.spawn](t.getPos())); }
    else if (s.despawn) api.town()?.removeNpc(s.despawn);
    else if (s.bySt) await run(s.bySt[st().starter] || [], ctx);
    else if (s.flash) api.town()?.flash(s.flash);
    else if (s.shake) api.town()?.shake();
    else if (s.me) await api.town()?.walkMe(...s.me);
  }
  await flush();
}
// una escena completa (bloquea el movimiento; al acabar vuelve la música del mapa)
export async function play(id, ctx = {}) {
  if (busy || !SCRIPTS[id]) return;
  busy = true; api.S.cutscene = true;
  try { await run(SCRIPTS[id], ctx); }
  catch (e) { if (!(e instanceof Abort)) console.error(e); }
  finally {
    busy = false; api.S.cutscene = false;
    stopVoice();
    if (api.isTownActive()) Music.play(musicForMap(api.town()?.mapId));
  }
}
export const isBusy = () => busy;

// ---------- acciones del guion ----------
const WIN_SCRIPT = { loli: 'tm_win', rivais: 'rivais_win', bot_cambados: 'bot_win', enologo: 'enologo_win', errata: 'errata_win', likeira: 'rrss_win', bug: 'bug_win', formulario: 'formulario_win', plantilla: 'estacion_win', algoritmo: 'final' };
const LOSE_SCRIPT = { rivais: 'rivais_lose' };
const WIN_FLAG = { bot_cambados: 'bot_cambados', enologo: 'enologo', bug: 'bug', cert1: 'cert1', cert2: 'cert2', formulario: 'formulario', plantilla: 'plantilla', bot_tren1: 'bot_tren1', bot_tren2: 'bot_tren2', algoritmo: 'algoritmo' };
async function act(name, arg, ctx) {
  switch (name) {
    case 'pickStarter': {
      const slug = await pickModal('Elige tu primer Paximón', 'Es tuyo desde hoy. Los otros dos se quedan en la oficina (de momento).', STARTERS);
      patch(s => { s.starter = slug; });
      addMember(slug);
      sfx('item');
      await badge('item', `¡${charFor(slug)?.name} se une a tu equipo!`);
      return;
    }
    case 'chapter': {
      const prev = st().ch;
      patch(s => { if (prev && !s.done.includes(prev)) s.done.push(prev); s.ch = arg; });
      scheduleSave(true);
      api.refreshWorld();
      return;
    }
    case 'giveItem': {
      try { const pl = await api.rpc('story_gift', { p_secret: api.S.player.secret, p_item: arg }); api.savePlayer({ ...pl, story: st() }); sfx('item'); api.toast('Sabrina te da un café con leche 🎒'); } catch (e) { console.warn(e); }
      return;
    }
    case 'heal': healTeam(); sfx('heal'); return;
    case 'selo': {
      patch(s => { if (!s.selos.includes(arg)) s.selos.push(arg); });
      sfx('stamp');
      await badge('selo', SELOS.find(x => x.id === arg)?.name || 'Selo', '¡Selo conseguido!');
      return;
    }
    case 'paxina': {
      const n = Math.min(PAXINAS_TOTAL, (st().paxinas || 0) + 1);
      patch(s => { s.paxinas = n; });
      sfx('page');
      await badge('paxina', `Páxina de Ouro ${n}/${PAXINAS_TOTAL}`, 'La guía de 1998 está un poco más entera.');
      return;
    }
    case 'recruit': {
      const have = new Set([...(st().team || []), ...(st().box || [])].map(m => m.slug));
      const options = api.S.chars.map(c => c.slug).filter(s => !have.has(s));
      if (!options.length) return;
      const slug = await pickModal('Un Paximón nuevo', 'Elige quién se une a tu equipo.', options);
      addMember(slug);
      sfx('item');
      await badge('item', `¡${charFor(slug)?.name} se une a tu equipo!`);
      return;
    }
    case 'flag': patch(s => { s.flags[arg] = true; }); api.refreshWorld(); return;
    case 'levelUp': patch(s => { for (const m of s.team) { m.lv += arg; m.hp = maxHp(m); } }); await badge('item', `¡Tu equipo sube ${arg} niveles!`); return;
    case 'battle': {
      const id = arg === 'cert' ? ctx.npc?.id || 'cert1' : arg;
      const r = await api.battle(id);
      if (r === 'won') {
        if (WIN_FLAG[id]) patch(s => { s.flags[WIN_FLAG[id]] = true; });
        patch(s => { for (const m of s.team) { m.lv += BATTLES[id]?.boss ? 2 : 1; } });
        api.refreshWorld();
        if (WIN_SCRIPT[id]) await run(SCRIPTS[WIN_SCRIPT[id]], ctx);
        return;
      }
      if (LOSE_SCRIPT[id]) await run(SCRIPTS[LOSE_SCRIPT[id]], ctx);
      else if (r === 'escaped') await run(SCRIPTS.bug_clock, ctx);
      await whiteout();
      throw new Abort();
    }
    case 'tm_game': {
      Music.play('espera');
      api.S.inGame = true;
      let score = 0;
      try { score = await playNonColgues({ ...NON_COLGUES, sfx }); } finally { api.S.inGame = false; }
      patch(s => { s.flags.tm_score = Math.round(score * 100); });
      Music.play('oficina');
      await run(SCRIPTS[score >= 0.5 ? 'tm_ok' : 'tm_ko'], ctx);
      return;
    }
    case 'structurer': {
      api.S.inGame = true;
      let score = 0;
      try { score = await playStructurer({ ...STRUCTURER, sfx }); } finally { api.S.inGame = false; }
      patch(s => { s.flags.structurer = true; });
      api.refreshWorld();
      await run(SCRIPTS[score >= 0.6 ? 'edicion_ok' : 'edicion_ko'], ctx);
      await run(SCRIPTS.errata, ctx);
      return;
    }
    case 'entrevista': {
      sfx('dial');
      await sleep(1600);
      api.S.inGame = true;
      let r = { won: false };
      try {
        r = await playEntrevista({ ...ENTREVISTA, sfx, say: (cast, text) => say(cast, text), avatar: api.avatarFor('manuel') });
      } finally { api.S.inGame = false; }
      await run(SCRIPTS[r.won ? 'gcc_win' : 'gcc_lose'], ctx);
      return;
    }
    case 'catalogo': {
      api.S.inGame = true;
      try { await showCatalogo({ ...CATALOGO, sfx, say: (cast, text) => say(cast, text) }); } finally { api.S.inGame = false; }
      return;
    }
    case 'endAct': {
      const o = OUTFITS.find(x => x.act === arg);
      patch(s => { if (o && !s.outfits.includes(o.id)) s.outfits.push(o.id); });
      Music.play('vitoria', { loop: false });
      await titleCard(`Fin do Acto ${['', 'I', 'II', 'III', 'IV'][arg]}`, ACTS[arg], 3000);
      if (o) { sfx('item'); await badge('item', `Complemento nuevo: ${o.name}`, 'Póntelo desde tu perfil (pulsa en tu personaje, arriba).'); }
      return;
    }
    case 'guideGlow': patch(s => { s.flags.webgeo_pending = true; }); api.refreshWorld(); return;
    case 'algoritmino': addMember('algoritmino'); return;
    case 'home': {
      await api.warp(houseEntry('edicion'));
      await sleep(900);
      await run(SCRIPTS.final_oficina, ctx);
      return;
    }
    case 'credits': await credits(); await run(SCRIPTS.poscreditos, ctx); return;
    case 'fin': {
      patch(s => { if (!s.done.includes('algoritmo')) s.done.push('algoritmo'); s.ch = 'fin'; });
      scheduleSave(true);
      api.refreshWorld();
      await titleCard('Fin', 'Grazas por xogar', 3500);
      return;
    }
    default: console.warn('acción desconocida', name);
  }
}
// perder: te despiertas en la cafetería con el equipo curado
async function whiteout() {
  await api.warp({ map: 'cafe_in', x: 6, y: 7, dir: 'up' });
  await sleep(700);
  await run(SCRIPTS.derrota);
}
// créditos finales con la canción
function credits() {
  return new Promise((resolve) => {
    Music.play('creditos', { loop: false });
    const el = document.createElement('div');
    el.className = 'story-credits';
    const cast = Object.entries(CAST).filter(([id]) => id !== 'narr').map(([, c]) => `<li>${esc(c.name)}</li>`).join('');
    el.innerHTML = `<div class="roll">
      <h1>A ÚLTIMA PÁXINA</h1><p>Un modo historia de Paximón</p>
      <h2>Reparto</h2><ul>${cast}<li>…e ti, de prácticas</li></ul>
      <h2>Paximóns</h2><ul><li>Paxi · Mariño · Carballiño</li><li>Meiguiña · Horreiño · Gaiteiro</li><li>e Algoritmiño, lendario</li></ul>
      <h2>Voces, música e efectos</h2><ul><li>Xerados con ElevenLabs</li></ul>
      <h2>Agradecementos</h2><ul><li>A todo o equipo de Páxinas Galegas</li><li>Á cafetería de Diego e Sabrina</li><li>Ao tren de Albacete, por chegar</li></ul>
      <h2 class="last">Ningún negocio foi resumido durante a produción deste xogo.</h2></div>
      <button class="btn small skip" type="button">Saltar ▸</button>`;
    document.body.appendChild(el);
    const done = () => { if (!el.isConnected) return; el.classList.add('out'); setTimeout(() => { el.remove(); resolve(); }, 600); };
    el.querySelector('.skip').addEventListener('click', done);
    setTimeout(done, 60000);
  });
}

// ---------- disparadores ----------
// al entrar en un mapa
export function onMapEnter(mapId) {
  if (busy) return;
  const ch = st().ch, f = st().flags || {};
  const once = (key, id) => { if (!f[key]) { patch(s => { s.flags[key] = true; }); play(id); return true; } return false; };
  if (!started()) {
    if (mapId === 'house_edicion') return play('prologo');
    if (!st().introShown) showIntro();
    return;
  }
  if (ch === 'cafe' && mapId === 'cafe_in') return play('cafe');
  if (ch === 'rivais' && mapId === 'vila') return play('rivais');
  if (ch === 'cambados' && mapId === 'cambados') return once('cambados_intro', 'cambados');
  if (ch === 'programacion' && mapId === 'programacion') return once('prog_intro', 'programacion');
  if (ch === 'xustificacion' && mapId === 'house_contabilidad') return once('xust_intro', 'xustificacion');
  if (ch === 'gerencia' && mapId === 'house_gerencia') return play('gerencia');
  if (ch === 'tren' && mapId === 'estacion') return once('tren_llega', 'tren');
  if (ch === 'tren' && mapId === 'tren') { patch(s => { s.ch = 'algoritmo'; if (!s.done.includes('tren')) s.done.push('tren'); }); api.refreshWorld(); }
}
async function showIntro() {
  patch(s => { s.introShown = true; });
  for (const [t, from, to, text] of IPM_START) { ipm(from, to, text, t); await sleep(2600); }
}
// hablar con un vecino: true si la historia se encarga
export function onTalk(npc) {
  if (busy) return true;
  const ch = st().ch, id = npc.id;
  const go = (script, ctx) => { play(script, { npc, ...ctx }); return true; };
  if (id === 'rosalia') {
    if (!started() || ch === 'prologo') return go('prologo');
    if (ch === 'edicion' && !flag('structurer')) return go('edicion');
    if (ch === 'fin') return false;
    return go('rosalia_espera');
  }
  if (id === 'sabrina' || id === 'diego') {
    if (ch === 'cafe') return go('cafe');
    if (!started()) return false;
    cafeMenu(npc);
    return true;
  }
  if (id === 'loli' && ch === 'telemarketing') return go('telemarketing');
  if (id === 'bot_c' && ch === 'cambados') return go('bot_cambados');
  if (id === 'enologo' && ch === 'cambados') {
    if (!flag('bot_cambados')) { api.town().showDialog(CAST.enologo.name, ['Primero te valorará mi Bot de Reseñas. Está ahí mismo, en la plaza.']); return true; }
    return go('enologo');
  }
  if (id === 'likeira' && ch === 'rrss') return go('rrss');
  if (id === 'bug' && ch === 'programacion') return go('bug');
  if (id === 'contable' && ch === 'xustificacion') return go('xustificacion');
  if ((id === 'cert1' || id === 'cert2') && ch === 'xustificacion') return go('cert');
  if (id === 'formulario' && ch === 'xustificacion') return go('formulario');
  if (id === 'gcc' && ch === 'gcc') return go('gcc');
  if (id === 'plantilla' && ch === 'estacion') return go('estacion');
  if (id === 'jefe' && ch === 'tren') return go('tren');
  if (id === 'bot_t1') return go('tren_bot');
  if (id === 'bot_t2' || id === 'bot_t3') return go('tren_bots');
  return false;
}
function cafeMenu(npc) {
  const town = api.town();
  const alt = (st().flags.heals || 0) % 2 ? 'cafe_heal2' : 'cafe_heal';
  town.showDialog(npc.name, [{ ask: npc.id === 'sabrina' ? '¡Hola, mi amor! ¿Qué te pongo?' : '¿Qué va a ser?', cast: npc.id, options: [
    { label: 'Cura a mi equipo', action: () => { patch(s => { s.flags.heals = (s.flags.heals || 0) + 1; }); play(alt); } },
    { label: 'Organizar el equipo', action: () => teamModal() },
    { label: 'Ver la carta', action: 'shop' },
    { label: 'Nada, gracias', lines: ['Aquí estamos. Como siempre.'] },
  ] }], { npc, cast: npc.id });
}
// tocar un objeto con historia
export function onInteract(o) {
  if (busy) return true;
  const ch = st().ch, town = api.town();
  switch (o.interact) {
    case 'coffee_broken': sfx('coffee_broken'); town.showDialog(null, ['La cafetera hace un ruido triste y suelta vapor.', 'Alguien ha pegado un pósit: «AVARIADA. Ir á cafetería. Asinado: Rosalía».']); return true;
    case 'structurer':
      if (ch === 'edicion' && !flag('structurer')) { play('edicion'); return true; }
      town.showDialog(null, [flag('structurer') || chapterIndex(ch) > chapterIndex('edicion') ? 'El Structurer está en orden. Los H2 en su sitio, las FAQ respondiendo a lo que preguntan.' : 'La pantalla del Structurer. Muestra la web de una pulpería.']); return true;
    case 'gcc_phone':
      if (ch === 'gcc') { play('gcc'); return true; }
      town.showDialog(null, ['El teléfono rojo de las llamadas importantes. Ahora mismo no hay nadie al otro lado.']); return true;
    case 'lectern':
      if (ch === 'gerencia') { play('gerencia'); return true; }
      town.showDialog(null, [chapterIndex(ch) >= chapterIndex('tren') ? 'La guía de 1998 brilla, entera otra vez. Huele a papel y a café.' : 'Un atril vacío.']); return true;
    case 'captura': {
      const id = o.data?.id;
      if ((st().flags.capturas || []).includes(id)) return true;
      patch(s => { s.flags.capturas = [...(s.flags.capturas || []), id]; });
      sfx('paper');
      town.showDialog(null, [`(Atopaches unha captura de Search Console desvinculada. Levas ${(st().flags.capturas || []).length} de 3.)`, 'Cada captura vinculada cubre campos do formulario antes de empezar.']);
      api.refreshWorld();
      return true;
    }
    case 'core':
      if (ch === 'algoritmo' && !flag('algoritmo')) { play('datos'); return true; }
      town.showDialog(null, ['El núcleo zumba bajito. Parece… contento.']); return true;
    case 'webs_xa': town.showDialog(null, ['WEBS XA · «Tu web en 5 minutos. Sin alma».', 'Hay un cartel más pequeño: «Cata de plantillas. Todas saben igual».']); return true;
    case 'caseta':
      if (o.data?.plantilla) { play('caseta_plantilla'); return true; }
      return false;
  }
  return false;
}
// pisar una casilla especial
export function onTrap(t) {
  const town = api.town();
  if (t.kind === '404') {
    sfx('error404'); setTimeout(() => sfx('glitch'), 200);
    town.say(town.me.id, 'Erro 404: páxina non atopada');
    town.shake(300);
    setTimeout(() => { sfx('warp'); town.startWarp({ map: 'programacion', x: 11, y: 12, dir: 'up' }); }, 450);
    return;
  }
  if (t.kind === 'story' && !busy) {
    const ch = st().ch;
    if (t.id === 'bot_cambados' && ch === 'cambados' && !flag('bot_cambados')) play('bot_cambados');
    if (t.id === 'tren_rivais' && !flag('tren_rivais')) { patch(s => { s.flags.tren_rivais = true; }); play('tren_rivais'); }
    if (t.id === 'datos' && !flag('algoritmo') && !flag('datos_intro')) { patch(s => { s.flags.datos_intro = true; }); play('datos'); }
  }
}
// ¿se puede entrar en la casa? (el pazo de Gerencia no se abre hasta el acto IV)
export function canEnterHouse(dept) {
  if (dept !== 'gerencia') return true;
  if (chapterIndex(st().ch) >= chapterIndex('gerencia')) return true;
  if (!busy) play('gerencia_pechada');
  return false;
}
export function markerFor(mapId) { void mapId; return null; }

export function init(a) { api = a; }
export const Story = { init, play, isBusy, objective, diary, teamModal, onMapEnter, onTalk, onInteract, onTrap, canEnterHouse, team, charFor, scaledFighter, maxHp, get state() { return st(); }, patch };
