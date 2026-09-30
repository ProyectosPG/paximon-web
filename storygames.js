// Minijuegos de historia de Paximón (misiones de departamento y combates especiales).
// Todos abren el overlay #mg (mismo panel que minigames.js), limpian listeners/timers/rAF al
// acabar (try/finally) y tienen un límite duro por setTimeout: el rAF se congela en pestañas en
// segundo plano, así que la lógica nunca depende de él (solo lo visual).
//
//   playNonColgues(opts)  -> Promise<number 0..1>
//   playStructurer(opts)  -> Promise<number 0..1>
//   playCarrusel(opts)    -> Promise<number 0..1>   (+ playCarrusel.lastHits)
//   playMemoria(opts)     -> Promise<number 0..1>   (+ playMemoria.lastPairs)
//   playEntrevista(opts)  -> Promise<{ won, info, patience }>
//   playWebGeo(opts)      -> Promise<number 0..1>
//   showCatalogo(opts)    -> Promise<void>
//
// Comunes: opts.sfx?.(id) para efectos ('select', 'hit', 'error404', 'like', 'hangup', 'ring',
// 'item', 'glitch', 'coins') y opts.say?.(castId, text) -> Promise que resuelve al acabar la
// frase; siempre se corre contra un timeout de min(8000, 1200 + 45 * text.length) ms.
// El módulo no toca el DOM al cargarse.

// ---------- utilidades ----------
const clamp01 = (v) => (Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0);
const rnd = (n) => Math.floor(Math.random() * n);
const pickOne = (a) => a[rnd(a.length)];
const nowMs = () => performance.now();
const list = (v, def) => (Array.isArray(v) && v.length ? v : def);
function shuffle(a) { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = rnd(i + 1); [b[i], b[j]] = [b[j], b[i]]; } return b; }
const mmss = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
const sayLimit = (text) => Math.min(8000, 1200 + 45 * String(text || '').length);
const sfxOf = (opts) => (id) => { try { opts?.sfx?.(id); } catch { /* sin sonido */ } };

let actx = null;
// Pitido(s) cuadrados, programados en el reloj de audio (no en timers).
function tone(freqs, ms = 80, vol = 0.05, type = 'square') {
  try {
    actx ||= new (window.AudioContext || window.webkitAudioContext)();
    const fs = Array.isArray(freqs) ? freqs : [freqs];
    const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime, d = ms / 1000;
    o.type = type; fs.forEach((f, i) => o.frequency.setValueAtTime(f, t + i * d));
    g.gain.setValueAtTime(vol, t); g.gain.setValueAtTime(0, t + fs.length * d);
    o.connect(g); g.connect(actx.destination);
    o.start(t); o.stop(t + fs.length * d + 0.02);
  } catch { /* sin audio */ }
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = String(text);
  if (tag === 'button') e.type = 'button';
  return e;
}
function svgEl(tag, attrs = {}) {
  const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
}
// Barra de tiempo que se vacía por transición CSS (no necesita rAF).
function drain(bar, ms) {
  const i = bar?.firstElementChild; if (!i) return;
  i.style.transition = 'none'; i.style.width = '100%'; void i.offsetWidth;
  i.style.transition = `width ${ms}ms linear`; i.style.width = '0%';
}
function freeze(bar) {
  const i = bar?.firstElementChild; if (!i) return;
  const w = getComputedStyle(i).width; i.style.transition = 'none'; i.style.width = w;
}
function meter(label, cls = '') {
  const root = el('div', 'sg-meter ' + cls);
  const bar = el('div', 'sg-meter-bar'), fill = el('div', 'sg-meter-fill'), val = el('span', 'sg-meter-val', '0');
  bar.appendChild(fill); root.append(el('span', 'sg-meter-lbl', label), bar, val);
  return {
    root,
    set(v, hiIsBad = true) {
      const x = Math.max(0, Math.min(100, Math.round(v)));
      fill.style.width = x + '%'; val.textContent = String(x);
      const bad = hiIsBad ? x : 100 - x;
      root.dataset.lvl = bad >= 70 ? 'hi' : bad >= 40 ? 'mid' : 'lo';
    },
  };
}
// Sprites de píxeles: filas de caracteres -> paleta.
function drawMap(cv, rows, pal) {
  cv.width = rows[0].length; cv.height = rows.length;
  const g = cv.getContext('2d');
  rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) { const c = pal[r[x]]; if (c) { g.fillStyle = c; g.fillRect(x, y, 1, 1); } } });
}

// ---------- overlay con registro de limpieza ----------
function openOverlay({ title = '', hint = '', cls = '' } = {}) {
  let root = document.getElementById('mg');
  if (!root) { root = el('div'); root.id = 'mg'; document.body.appendChild(root); }
  try { document.activeElement?.blur?.(); } catch { /* nada */ }
  root.innerHTML = '';
  const panel = el('div', `mg-panel sg-panel ${cls}`.trim());
  const titleEl = el('div', 'mg-title', title), hintEl = el('div', 'mg-hint', hint), area = el('div', 'mg-area');
  const foot = el('div', 'mg-foot'), timer = el('div', 'mg-timer'), score = el('div', 'mg-score');
  foot.append(timer, score);
  panel.append(titleEl, hintEl, area, foot);
  root.appendChild(panel);
  root.hidden = false;

  const timers = new Set(), intervals = new Set(), offs = [], frames = new Set();
  let rafId = 0;
  const loop = (t) => {
    rafId = 0;
    if (ui.dead || !frames.size) return;
    for (const f of [...frames]) { try { f(t); } catch (e) { console.warn('[storygames]', e); frames.delete(f); } }
    rafId = requestAnimationFrame(loop);
  };
  const ui = {
    root, panel, area, timer, score, title: titleEl, hint: hintEl, dead: false,
    on(t, type, fn, o) { t.addEventListener(type, fn, o); offs.push(() => t.removeEventListener(type, fn, o)); },
    onKey(fn) { ui.on(window, 'keydown', (e) => { if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return; if (fn(e) === true) e.preventDefault(); }); },
    after(ms, fn) {
      const id = setTimeout(() => { timers.delete(id); if (!ui.dead) fn(); }, ms);
      timers.add(id);
      return () => { clearTimeout(id); timers.delete(id); };
    },
    every(ms, fn) { const id = setInterval(() => { if (!ui.dead) fn(); }, ms); intervals.add(id); return () => { clearInterval(id); intervals.delete(id); }; },
    wait(ms) { return new Promise((r) => ui.after(ms, r)); },
    // Solo para lo visual: si la pestaña está oculta no hay fotogramas y no pasa nada.
    frame(fn) { frames.add(fn); if (!rafId) rafId = requestAnimationFrame(loop); return () => frames.delete(fn); },
    // Frase hablada: espera a say() o a su timeout; si no hay audio, deja un mínimo de lectura.
    say(opts, cast, text) {
      return new Promise((resolve) => {
        if (!text) return resolve();
        const t0 = nowMs(), minRead = Math.min(3200, 700 + 28 * String(text).length);
        let settled = false;
        const done = () => {
          if (settled || ui.dead) return; settled = true; cancel();
          const rest = minRead - (nowMs() - t0);
          if (rest > 0) ui.after(rest, resolve); else resolve();
        };
        const cancel = ui.after(sayLimit(text), done);
        let p = null;
        try { p = opts?.say?.(cast, text); } catch { p = null; }
        Promise.resolve(p).then(done, done);
      });
    },
    pop(host, text, cls = '') {
      const p = el('span', 'sg-pop ' + cls, text);
      host.appendChild(p); ui.after(850, () => p.remove());
    },
    grade(skill, label) {
      ui.score.textContent = label ?? `${Math.round(clamp01(skill) * 100)}%`;
      panel.classList.remove('great', 'ok', 'bad');
      panel.classList.add(skill >= 0.85 ? 'great' : skill >= 0.5 ? 'ok' : 'bad');
    },
    async result({ big, text = '', skill = null, label, ms = 1200, cls = '' }) {
      const box = el('div', 'sg-result ' + cls);
      box.append(el('div', 'sg-result-big', big));
      if (text) box.append(el('div', 'sg-result-txt', text));
      area.appendChild(box);
      if (skill != null) ui.grade(skill, label);
      await ui.wait(ms);
    },
    close() {
      if (ui.dead) return;
      ui.dead = true;
      timers.forEach(clearTimeout); timers.clear();
      intervals.forEach(clearInterval); intervals.clear();
      frames.clear(); if (rafId) cancelAnimationFrame(rafId);
      offs.forEach((f) => { try { f(); } catch { /* nada */ } });
      if (panel.parentNode === root) { root.hidden = true; root.innerHTML = ''; }
    },
  };
  return ui;
}

// Ejecuta un minijuego con límite duro. fallback() da el resultado parcial si algo falla o se agota.
async function runGame(cfg, logic, fallback, limitMs) {
  const safe = () => { try { return fallback(); } catch { return 0; } };
  let ui;
  try { ui = openOverlay(cfg); } catch (e) { console.warn('[storygames] sin overlay', e); return safe(); }
  let hardId;
  try {
    const hard = new Promise((r) => { hardId = setTimeout(() => r(safe()), limitMs); });
    const game = Promise.resolve().then(() => logic(ui)).catch((e) => { console.warn('[storygames]', e); return safe(); });
    return await Promise.race([game, hard]);
  } finally {
    clearTimeout(hardId);
    ui.close();
  }
}

// =====================================================================
// 1. NON COLGUES (telemarketing)
// =====================================================================
const NC_RANTS = [
  '¡Llevo media hora esperando!', '¡Mi web no sale en Google!', '¡Esto es una vergüenza!',
  '¡Pago todos los meses y para qué!', '¡Mi cuñado dice que las webs son gratis!',
  '¡Os voy a poner una reseña de una estrella!', '¡Nadie me explica nada!', '¡Me cambio a la competencia!',
];
const NC_PROMPTS = [
  { text: '¡Mi web no aparece en Google!', options: [{ label: 'Lo reviso ahora mismo con usted', good: true }, { label: 'Eso es cosa de Google, no nuestra', good: false }, { label: 'Le pongo en espera', good: false }] },
  { text: '¡Quiero hablar con tu jefe!', options: [{ label: 'Yo me encargo personalmente', good: true }, { label: 'Mi jefe está de feria en Cambados', good: false }, { label: 'Le pongo en espera', good: false }] },
  { text: '¡Me habéis cobrado dos veces!', options: [{ label: 'Lo compruebo y se lo devolvemos hoy', good: true }, { label: 'Será que lo usó dos veces', good: false }, { label: 'Llame otro día, hoy no hay nadie', good: false }] },
  { text: '¡Nadie me coge el teléfono!', options: [{ label: 'Aquí estoy yo. Cuénteme qué pasa', good: true }, { label: 'Es que estábamos en el café', good: false }, { label: 'Le pongo en espera', good: false }] },
  { text: '¡Esto es una estafa!', options: [{ label: 'Entiendo su enfado. Vamos a arreglarlo', good: true }, { label: 'Cálmese, que no es para tanto', good: false }, { label: '*finge que se corta la llamada*', good: false }] },
  { text: '¿Y cuándo va a estar arreglado?', options: [{ label: 'Hoy le mando un email con los plazos', good: true }, { label: 'Pues… cuando se pueda', good: false }, { label: 'Eso depende de los astros', good: false }] },
  { text: '¡Mi competencia sale primero!', options: [{ label: 'Revisamos sus textos esta misma semana', good: true }, { label: 'Es que su competencia es mejor', good: false }, { label: 'Le pongo en espera', good: false }] },
];
const RECEIVER = [
  '......XXXXXXXXXXXXXXXX......',
  '....XXRRRRRRRRRRRRRRRRXX....',
  '..XXRRRHHHHHHHHHHHHHHRRRXX..',
  '.XRRRRRRRRRRRRRRRRRRRRRRRRX.',
  'XRRRRRXXXXXXXXXXXXXXXXRRRRRX',
  'XRRRRX................XRRRRX',
  'XHRRRX................XRRRRX',
  'XHRRRRX..............XRRRRRX',
  'XHRRRRRX............XRRRRRRX',
  'XRRRRRRX............XRRRRRRX',
  'XDDDDDDX............XDDDDDDX',
  '.XXXXXX..............XXXXXX.',
  '......................C.....',
  '.....................C.C.C..',
  '......................C.C.C.',
];
const RECEIVER_PAL = { X: '#1a1520', R: '#e5383b', H: '#ff8a80', D: '#8e1c24', C: '#6b5a7a' };

/**
 * «Non colgues»: aguanta ~25 s al teléfono con un cliente furioso.
 * opts: { rants?: string[], prompts?: [{ text, options: [{ label, good }] }], title?, hint?,
 *         duration? = 25000, sfx?, say? }  -> Promise<number 0..1>
 */
export function playNonColgues(opts = {}) {
  const sfx = sfxOf(opts);
  const rants = shuffle(list(opts.rants, NC_RANTS).filter((s) => typeof s === 'string' && s));
  if (!rants.length) rants.push(...NC_RANTS);
  let prompts = list(opts.prompts, NC_PROMPTS).filter((p) => p && p.text && Array.isArray(p.options) && p.options.length);
  if (!prompts.length) prompts = NC_PROMPTS;
  const DUR = Math.max(6000, Number(opts.duration) || 25000);
  const st = { irr: 40, good: 0, shown: 0, hung: false };
  const skill = () => {
    const base = (st.shown ? st.good / st.shown : 0) * 0.7 + (1 - st.irr / 100) * 0.3;
    return clamp01(st.hung ? Math.min(0.3, base) : base);
  };
  const pick3 = (options) => {
    if (options.length <= 3) return shuffle(options);
    const goods = options.filter((o) => o.good), rest = shuffle(options.filter((o) => o !== goods[0]));
    return shuffle(goods.length ? [goods[0], ...rest.slice(0, 2)] : rest.slice(0, 3));
  };

  return runGame({
    title: opts.title || '📞 Non colgues',
    hint: opts.hint || 'Un cliente furioso al teléfono. Elige la mejor respuesta (1, 2, 3 o clic) antes de 4 s. Si la irritación llega a 100, cuelga.',
    cls: 'sg-nc',
  }, async (ui) => {
    const a = ui.area;
    a.innerHTML = `<div class="sg-nc-top">
        <div class="sg-nc-phone"><canvas class="sg-nc-recv"></canvas><span class="sg-nc-waves"><i></i><i></i><i></i></span><span class="sg-nc-ring">RIIING</span></div>
        <div class="sg-bubble"><div class="sg-nc-lines"></div></div>
      </div>
      <div class="sg-nc-ask"><div class="sg-nc-q">Descolgando…</div><div class="sg-tbar"><i></i></div></div>
      <div class="sg-opts idle"></div>`;
    const q = (s) => a.querySelector(s);
    const phone = q('.sg-nc-phone'), lines = q('.sg-nc-lines'), askQ = q('.sg-nc-q'), tbar = q('.sg-tbar'), optsBox = q('.sg-opts');
    drawMap(q('.sg-nc-recv'), RECEIVER, RECEIVER_PAL);
    const irr = meter('Irritación', 'sg-nc-irr');
    a.insertBefore(irr.root, q('.sg-nc-ask'));
    const setIrr = (v) => { st.irr = Math.max(0, Math.min(100, v)); irr.set(st.irr); phone.style.setProperty('--shake', (0.25 + st.irr / 100).toFixed(2)); };
    setIrr(40);
    const bubble = (text, cls) => { lines.appendChild(el('p', cls, text)); while (lines.children.length > 3) lines.firstChild.remove(); };
    const btns = [0, 1, 2].map((i) => {
      const b = el('button', 'sg-btn sg-opt'); b.disabled = true;
      b.append(el('span', 'sg-key', String(i + 1)), el('span', 'sg-opt-txt', '…'));
      optsBox.appendChild(b);
      return b;
    });

    // Suena el teléfono
    phone.classList.add('ringing'); sfx('ring'); tone([880, 1175, 880, 1175], 70, 0.03);
    ui.timer.textContent = 'RIIING…';
    await ui.wait(1000);
    phone.classList.remove('ringing');
    const t0 = nowMs();
    ui.every(250, () => { ui.timer.textContent = `📞 ${mmss(nowMs() - t0)} / ${mmss(DUR)}`; });
    ui.score.textContent = '';
    bubble('¿Sí? ¡POR FIN! ¡Escúcheme bien!', 'ask');
    askQ.textContent = '(escucha al cliente…)';

    return new Promise((resolve) => {
      let ended = false, active = null, lastShown = -1e9, ri = 0, pi = 0, order = shuffle(prompts);
      const nextPrompt = () => { if (pi >= order.length) { order = shuffle(prompts); pi = 0; } return order[pi++]; };
      ui.every(2600, () => { if (!ended && !active && !st.hung) bubble(rants[ri++ % rants.length]); });

      const end = async (why) => {
        if (ended) return; ended = true;
        if (active) { active.cancel(); active = null; st.shown = Math.max(0, st.shown - 1); }
        btns.forEach((b) => (b.disabled = true)); freeze(tbar);
        const s = skill();
        if (why === 'hang') {
          phone.classList.add('hung'); sfx('hangup'); tone([520, 390, 260], 140, 0.06);
          askQ.textContent = '*clic* Piiii…';
          await ui.result({ big: '¡Colgó!', text: 'Tuuu… tuuu… tuuu…', skill: s });
        } else {
          tone([660, 880, 1320], 90, 0.05);
          const msg = st.irr < 30 ? 'Cliente calmado. ¡Hasta te dio las gracias!' : st.irr < 70 ? 'Sobreviviste a la llamada.' : 'Uf… por los pelos.';
          await ui.result({ big: st.irr < 30 ? '¡Calmado!' : '¡Aguantaste!', text: `${msg}\n${st.good}/${st.shown} respuestas buenas`, skill: s });
        }
        resolve(s);
      };

      const answer = (i) => {
        if (ended || !active) return;
        const cur = active;
        if (i >= 0 && !cur.opts[i]) return;
        active = null; cur.cancel(); freeze(tbar);
        btns.forEach((b) => (b.disabled = true));
        if (i < 0) {
          setIrr(st.irr + 15); sfx('error404'); tone([300, 220], 90, 0.05);
          bubble('¿Hola? ¿HOLA? ¿Hay alguien?', 'ask'); askQ.textContent = '…silencio incómodo…';
          ui.pop(phone, '+15', 'bad');
        } else if (cur.opts[i].good) {
          st.good++; setIrr(st.irr - 18); btns[i].classList.add('good'); sfx('select'); tone([660, 880, 1320], 60, 0.05);
          ui.pop(phone, '−18', 'good');
        } else {
          setIrr(st.irr + 22); btns[i].classList.add('bad'); sfx('hit'); tone([220, 160], 110, 0.06);
          ui.pop(phone, '+22', 'bad');
          ui.panel.classList.remove('sg-jolt'); void ui.panel.offsetWidth; ui.panel.classList.add('sg-jolt');
        }
        if (st.irr >= 100) { st.hung = true; ui.after(500, () => end('hang')); return; }
        ui.after(750, () => { if (!active && !ended) { optsBox.classList.add('idle'); askQ.textContent = '(escucha al cliente…)'; } });
        ui.after(Math.max(1000, lastShown + 3000 - nowMs()), showPrompt);
      };

      const showPrompt = () => {
        if (ended || st.hung || active) return;
        if (DUR - (nowMs() - t0) < 2600) return;   // ya no da tiempo a otra pregunta
        const p = nextPrompt(), opts3 = pick3(p.options);
        st.shown++; lastShown = nowMs();
        askQ.textContent = p.text; bubble(p.text, 'ask');
        btns.forEach((b, i) => {
          const o = opts3[i];
          b.classList.remove('good', 'bad'); b.hidden = !o; b.disabled = !o;
          if (o) b.querySelector('.sg-opt-txt').textContent = o.label;
        });
        optsBox.classList.remove('idle');
        drain(tbar, 4000); tone(990, 40, 0.03);
        active = { opts: opts3, cancel: ui.after(4000, () => answer(-1)) };
      };

      btns.forEach((b, i) => ui.on(b, 'click', () => answer(i)));
      ui.onKey((e) => { const k = ['1', '2', '3'].indexOf(e.key); if (k >= 0 && active) { answer(k); return true; } return false; });
      ui.after(1200, showPrompt);
      ui.after(DUR, () => end('time'));
    });
  }, skill, DUR + 9000);
}

// =====================================================================
// 2. O STRUCTURER (ordenar la página + emparejar FAQ)
// =====================================================================
const ST_BLOCKS = [
  { id: 'h1', label: 'O Polbo Feliz · Pulpería en O Carballiño', kind: 'H1 + intro' },
  { id: 'servicios', label: 'Servicios', kind: 'H2' },
  { id: 'porque', label: 'Por qué elegirnos', kind: 'H2' },
  { id: 'faq', label: 'Preguntas frecuentes', kind: 'H2' },
  { id: 'contacto', label: 'Contacto', kind: 'H2' },
  { id: 'footer', label: 'Footer · Aviso legal', kind: 'Footer' },
];
const ST_FAQS = [
  { q: '¿Tenéis terraza?', a: 'Sí, con doce mesas junto al río.' },
  { q: '¿Hacéis pulpo para llevar?', a: 'Sí, en plato de madera y por encargo.' },
  { q: '¿Abrís los lunes?', a: 'No, el lunes descansamos.' },
];
const PAIR_COLORS = ['#4cbb3a', '#2e9bff', '#ff7a00', '#b388ff'];
const kindCls = (k) => (/h1/i.test(k || '') ? 'k-h1' : /foot|pie/i.test(k || '') ? 'k-foot' : 'k-h2');
function cyclesOf(order) {
  const seen = new Array(order.length).fill(false); let c = 0;
  for (let i = 0; i < order.length; i++) { if (seen[i]) continue; c++; let j = i; while (!seen[j]) { seen[j] = true; j = order[j]; } }
  return c;
}

/**
 * «O Structurer»: ordena los bloques de la web y conecta las FAQ. 60 s en total.
 * opts: { blocks?: [{ id, label, kind }] (en el orden correcto), faqs?: [{ q, a }],
 *         url? = 'www.opolbofeliz.gal', faqTitle?, title?, hint?, sfx?, say? } -> Promise<number 0..1>
 */
export function playStructurer(opts = {}) {
  const sfx = sfxOf(opts);
  const blocks = list(opts.blocks, ST_BLOCKS).filter((b) => b && b.label).slice(0, 9);
  const faqs = list(opts.faqs, ST_FAQS).filter((f) => f && f.q && f.a).slice(0, 4);
  const n = blocks.length, LIMIT = 60000;
  const st = { order: blocks.map((_, i) => i), swaps: 0, minSwaps: 0, aScore: null, firstTry: 0 };
  const scoreA = () => {
    if (n < 2) return 1;
    const ok = st.order.filter((v, i) => v === i).length / n;
    return clamp01(ok - 0.04 * Math.max(0, st.swaps - st.minSwaps));
  };
  const skill = () => {
    const A = st.aScore ?? scoreA();
    return faqs.length ? clamp01(0.5 * A + 0.5 * (st.firstTry / faqs.length)) : clamp01(A);
  };

  return runGame({
    title: opts.title || '🧱 O Structurer',
    hint: opts.hint || 'Ordena la web: toca un bloque y luego otro para cambiarlos (o arrástralo; teclas 1-9). Después conecta cada pregunta con su respuesta.',
    cls: 'sg-st',
  }, async (ui) => {
    const a = ui.area;
    const browser = el('div', 'sg-browser');
    const bar = el('div', 'sg-browser-bar');
    bar.append(el('i'), el('i'), el('i'), el('span', 'sg-url', opts.url || 'www.opolbofeliz.gal'));
    const body = el('div', 'sg-browser-body');
    browser.append(bar, body);
    const pub = el('button', 'sg-btn sg-publish');
    pub.append(el('span', 'sg-key', 'P'), el('span', '', 'Publicar'));
    a.append(browser, pub);

    const t0 = nowMs();
    const showTime = () => { ui.timer.textContent = `⏱ ${Math.ceil(Math.max(0, LIMIT - (nowMs() - t0)) / 1000)} s`; };
    showTime(); ui.every(200, showTime);
    let timeUp = false, phaseDone = null, phase = 'A';
    ui.after(LIMIT, () => { timeUp = true; phaseDone?.(); });

    // ----- Parte A: ordenar bloques -----
    if (n >= 2) {
      let order = st.order;
      const maxOk = Math.floor(n / 3);
      for (let k = 0; k < 60; k++) { order = shuffle(st.order); if (order.filter((v, i) => v === i).length <= maxOk) break; }
      if (order.every((v, i) => v === i)) order = [...order.slice(1), order[0]];
      st.order = order; st.minSwaps = n - cyclesOf(order);
      ui.score.textContent = `Cambios: 0`;

      const box = el('div', 'sg-blocks');
      body.replaceChildren(box);
      const cards = blocks.map((b, i) => {
        const c = el('button', 'sg-block ' + kindCls(b.kind));
        c.dataset.i = String(i);
        c.append(el('span', 'sg-num'), el('span', 'sg-kind', b.kind || 'H2'), el('span', 'sg-label', b.label));
        return c;
      });
      const render = (animate) => {
        const before = animate ? new Map(cards.map((c) => [c, c.getBoundingClientRect().top])) : null;
        st.order.forEach((bi, pos) => { box.appendChild(cards[bi]); cards[bi].firstChild.textContent = String(pos + 1); });
        if (!before) return;
        for (const c of cards) {
          const d = before.get(c) - c.getBoundingClientRect().top;
          if (!d) continue;
          c.style.transition = 'none'; c.style.transform = `translateY(${d}px)`; void c.offsetWidth;
          c.style.transition = 'transform .22s ease-out'; c.style.transform = '';
        }
      };
      render(false);

      await new Promise((res) => {
        phaseDone = res;
        let sel = null, locked = false, drag = null;
        const setSel = (bi) => { if (sel != null) cards[sel].classList.remove('sel'); sel = bi; if (bi != null) cards[bi].classList.add('sel'); };
        const solved = () => st.order.every((v, i) => v === i);
        const swap = (x, y) => {
          const px = st.order.indexOf(x), py = st.order.indexOf(y);
          [st.order[px], st.order[py]] = [st.order[py], st.order[px]];
          st.swaps++; ui.score.textContent = `Cambios: ${st.swaps}`;
          render(true); tone([520, 780], 50, 0.04);
          if (solved()) {
            locked = true; sfx('select'); tone([660, 880, 1100, 1320], 70, 0.05);
            cards.forEach((c) => c.classList.add('ok'));
            ui.pop(browser, '¡Orden perfecto!', 'good');
            ui.after(700, res);
          }
        };
        const tap = (bi) => {
          if (locked || phase !== 'A') return;
          if (sel == null) { setSel(bi); tone(700, 30, 0.03); return; }
          if (sel === bi) { setSel(null); return; }
          const s = sel; setSel(null); swap(s, bi);
        };
        const cardAt = (y, not) => cards.find((c) => { if (c === not) return false; const r = c.getBoundingClientRect(); return y >= r.top && y <= r.bottom; });
        ui.on(box, 'pointerdown', (e) => {
          const c = e.target.closest('.sg-block'); if (!c || locked || drag) return;
          e.preventDefault();
          drag = { c, bi: Number(c.dataset.i), id: e.pointerId, y0: e.clientY, moved: false };
          try { c.setPointerCapture(e.pointerId); } catch { /* nada */ }
        });
        ui.on(box, 'pointermove', (e) => {
          if (!drag || e.pointerId !== drag.id) return;
          const dy = e.clientY - drag.y0;
          if (!drag.moved && Math.abs(dy) > 8) { drag.moved = true; drag.c.classList.add('drag'); setSel(null); }
          if (drag.moved) { drag.c.style.transition = 'none'; drag.c.style.transform = `translateY(${dy}px)`; }
        });
        const up = (e, cancel) => {
          if (!drag || e.pointerId !== drag.id) return;
          const d = drag; drag = null;
          if (d.moved) {
            d.c.classList.remove('drag'); d.c.style.transform = '';
            const target = cancel ? null : cardAt(e.clientY, d.c);
            if (target && !locked) swap(d.bi, Number(target.dataset.i));
          } else if (!cancel) tap(d.bi);
        };
        ui.on(box, 'pointerup', (e) => up(e, false));
        ui.on(box, 'pointercancel', (e) => up(e, true));
        // clic de teclado (Tab + Enter/Espacio): detail === 0
        ui.on(box, 'click', (e) => { if (e.detail !== 0) return; const c = e.target.closest('.sg-block'); if (c) tap(Number(c.dataset.i)); });
        ui.on(pub, 'click', () => { if (!locked && phase === 'A') { locked = true; res(); } });
        ui.onKey((e) => {
          if (phase !== 'A' || locked) return false;
          if (e.key === 'p' || e.key === 'P') { locked = true; res(); return true; }
          const k = Number(e.key);
          if (k >= 1 && k <= n) { tap(st.order[k - 1]); return true; }
          return false;
        });
      });
    }
    st.aScore = scoreA();
    phase = 'mid';

    // ----- Parte B: conectar FAQ -----
    if (!timeUp && faqs.length) { pub.hidden = true; await ui.wait(250); }
    if (!timeUp && faqs.length) {
      phase = 'B';
      const head = el('div', 'sg-faq-head', opts.faqTitle || 'Preguntas frecuentes');
      const wrap = el('div', 'sg-faq');
      const svg = svgEl('svg', { class: 'sg-faq-lines', preserveAspectRatio: 'none' });
      const colQ = el('div', 'sg-faq-col'), colA = el('div', 'sg-faq-col');
      wrap.append(svg, colQ, colA);
      body.replaceChildren(head, wrap);
      ui.hint.textContent = 'Toca una pregunta y después su respuesta (teclas 1-4 y A-D). ¡Solo cuenta el primer intento!';
      let aOrder = faqs.map((_, i) => i);
      for (let k = 0; k < 10 && faqs.length > 1; k++) { aOrder = shuffle(aOrder); if (aOrder.some((v, i) => v !== i)) break; }
      const qBtns = faqs.map((f, i) => {
        const b = el('button', 'sg-faq-item q'); b.dataset.i = String(i);
        b.append(el('span', 'sg-key', String(i + 1)), el('span', 'sg-faq-txt', f.q)); colQ.appendChild(b); return b;
      });
      const aBtns = [];
      aOrder.forEach((fi, pos) => {
        const b = el('button', 'sg-faq-item a'); b.dataset.i = String(fi);
        b.append(el('span', 'sg-key', 'ABCD'[pos]), el('span', 'sg-faq-txt', faqs[fi].a)); colA.appendChild(b); aBtns[fi] = b;
      });
      const matched = [], tried = new Set();
      const drawLines = () => {
        svg.replaceChildren();
        const r0 = wrap.getBoundingClientRect();
        if (!r0.width) return;
        svg.setAttribute('viewBox', `0 0 ${r0.width} ${r0.height}`);
        matched.forEach((i, k) => {
          const rq = qBtns[i].getBoundingClientRect(), ra = aBtns[i].getBoundingClientRect();
          svg.appendChild(svgEl('line', {
            x1: rq.right - r0.left, y1: rq.top + rq.height / 2 - r0.top, x2: ra.left - r0.left, y2: ra.top + ra.height / 2 - r0.top,
            stroke: PAIR_COLORS[k % PAIR_COLORS.length], 'stroke-width': 4, 'stroke-linecap': 'square',
          }));
        });
      };
      ui.on(window, 'resize', drawLines);

      await new Promise((res) => {
        phaseDone = res;
        let selQ = null, selA = null;
        const mark = () => { qBtns.forEach((b, i) => b.classList.toggle('sel', i === selQ)); aBtns.forEach((b, i) => b.classList.toggle('sel', i === selA)); };
        const attempt = () => {
          if (selQ == null || selA == null) return mark();
          const qi = selQ, ai = selA; selQ = selA = null; mark();
          if (!tried.has(qi)) { tried.add(qi); if (qi === ai) st.firstTry++; }
          if (qi === ai) {
            const k = matched.length; matched.push(qi);
            for (const b of [qBtns[qi], aBtns[ai]]) { b.classList.add('done'); b.style.setProperty('--pc', PAIR_COLORS[k % PAIR_COLORS.length]); b.disabled = true; }
            drawLines(); sfx('select'); tone([660, 990], 60, 0.05);
            ui.score.textContent = `FAQ ${matched.length}/${faqs.length}`;
            if (matched.length === faqs.length) ui.after(450, res);
          } else {
            for (const b of [qBtns[qi], aBtns[ai]]) { b.classList.remove('wrong'); void b.offsetWidth; b.classList.add('wrong'); }
            ui.after(500, () => [qBtns[qi], aBtns[ai]].forEach((b) => b.classList.remove('wrong')));
            sfx('error404'); tone([240, 180], 90, 0.05);
          }
        };
        const pickQ = (i) => { if (phase !== 'B' || matched.includes(i)) return; selQ = selQ === i ? null : i; attempt(); if (selQ != null) tone(700, 30, 0.03); };
        const pickA = (i) => { if (phase !== 'B' || matched.includes(i)) return; selA = selA === i ? null : i; attempt(); if (selA != null) tone(760, 30, 0.03); };
        qBtns.forEach((b, i) => ui.on(b, 'click', () => pickQ(i)));
        aBtns.forEach((b, i) => ui.on(b, 'click', () => pickA(i)));
        ui.onKey((e) => {
          if (phase !== 'B') return false;
          const k = Number(e.key);
          if (k >= 1 && k <= faqs.length) { pickQ(k - 1); return true; }
          const l = 'abcd'.indexOf(String(e.key).toLowerCase());
          if (l >= 0 && l < faqs.length) { pickA(aOrder[l]); return true; }
          return false;
        });
      });
    }

    // ----- Publicar -----
    phase = 'end';
    a.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    const s = skill();
    sfx('item'); tone([523, 659, 784, 1046], 90, 0.05);
    const okBlocks = st.order.filter((v, i) => v === i).length;
    const txt = `${timeUp ? '¡Se acabó el tiempo! ' : ''}Estructura ${okBlocks}/${n}${faqs.length ? ` · FAQ a la primera ${st.firstTry}/${faqs.length}` : ''}`;
    await ui.result({ big: '¡Publicado!', text: txt, skill: s, cls: 'stamp', ms: 1400 });
    return s;
  }, skill, LIMIT + 10000);
}

// =====================================================================
// 3. CARRUSEL INFINITO (defensa contra Likeira)
// =====================================================================
const CAR_POSTS = [
  '☕ Mañá de café ✨', '🌅 Solpor en Riazor #vibes', '🥐 Brunch saudable 💚', '🏋️ Día de perna 💪',
  '🐶 O meu can é o mellor', '🍕 Pizza e series 🎬', '💅 Unhas novas ✨', '🌊 Praia das Catedrais',
  '📸 #nofilter', '🤳 Selfie de domingo', '🌮 Tacos veganos 🌱', '✈️ Vou a Bali 🌴',
];

/**
 * «Carrusel infinito»: para el carrusel cuando «DEIXAR DE SEGUIR» esté en el marco.
 * opts: { posts?: string[], maxHits? = 6, handle? = 'likeira', unfollowLabel? = 'DEIXAR DE SEGUIR',
 *         title?, hint?, sfx?, say? } -> Promise<number 0..1>; deja playCarrusel.lastHits (1..maxHits).
 */
export function playCarrusel(opts = {}) {
  const sfx = sfxOf(opts);
  const maxHits = Math.max(1, Math.round(Number(opts.maxHits) || 6));
  const posts = shuffle(list(opts.posts, CAR_POSTS).filter((s) => typeof s === 'string' && s));
  if (!posts.length) posts.push(...CAR_POSTS);
  const RUN = 9000;
  const st = { passes: 0, stopped: false };
  const hits = () => Math.max(1, Math.min(maxHits, st.stopped ? st.passes : maxHits));
  const skill = () => {
    const h = hits(); playCarrusel.lastHits = h;
    return maxHits <= 1 ? (h <= 1 ? 1 : 0) : clamp01(1 - (h - 1) / (maxHits - 1));
  };
  playCarrusel.lastHits = maxHits;

  return runGame({
    title: opts.title || '🎠 Carrusel infinito',
    hint: opts.hint || 'Pulsa ESPACIO o toca cuando «DEIXAR DE SEGUIR» esté dentro del marco. Cada post que pase es un golpe. ¡Si fallas, otro más!',
    cls: 'sg-car-panel',
  }, async (ui) => {
    const a = ui.area;
    a.innerHTML = `<div class="sg-car"><div class="sg-car-track"></div><div class="sg-car-frame"><b>▼</b></div></div>
      <div class="sg-car-info"><span class="sg-car-hits"></span><span class="sg-car-msg">¡Prepárate!</span></div>
      <button class="sg-btn sg-car-stop" type="button">⏹ PARAR</button>`;
    const track = a.querySelector('.sg-car-track'), frame = a.querySelector('.sg-car-frame');
    const hitsEl = a.querySelector('.sg-car-hits'), msg = a.querySelector('.sg-car-msg'), car = a.querySelector('.sg-car');
    const showHits = () => {
      hitsEl.replaceChildren(el('span', 'sg-car-lbl', 'Golpes '));
      for (let k = 0; k < maxHits; k++) hitsEl.appendChild(el('i', k < st.passes ? 'on' : ''));
    };
    showHits();

    const PW = 84, SP = 96, TOL = 38, START = 150, V0 = 70, ACC = 32, LAST = 32;
    const W = track.clientWidth || 300, cx = W / 2;
    const unf = new Set([1]);
    for (let k = 1; ;) { k += 2 + rnd(3); if (k > LAST) break; unf.add(k); }
    const items = [];
    for (let i = -3; i <= LAST; i++) {
      const isU = i >= 0 && unf.has(i);
      const p = el('div', 'sg-post' + (isU ? ' unf' : '') + (i < 0 ? ' seen' : ''));
      if (isU) p.append(el('span', 'sg-post-ico', '✖'), el('span', 'sg-post-unf', opts.unfollowLabel || 'DEIXAR DE SEGUIR'));
      else {
        const head = el('span', 'sg-post-head'); head.append(el('i'), el('span', '', '@' + (opts.handle || 'likeira')));
        p.append(head, el('span', 'sg-post-cap', posts[(i + 3) % posts.length]), el('span', 'sg-post-likes', `♥ ${1 + rnd(9)},${rnd(10)}k`));
      }
      track.appendChild(p);
      items.push({ i, el: p, unf: isU });
    }
    let tStart = 0, tFrozen = null, ended = false, counted = 0;
    const off = () => { const t = (tFrozen ?? (tStart ? nowMs() - tStart : 0)) / 1000; return V0 * t + ACC * t * t / 2; };
    const xOf = (it, o) => cx + START + it.i * SP - o;
    const render = () => {
      const o = off();
      for (const it of items) {
        const x = xOf(it, o);
        it.el.style.visibility = x < -PW || x > W + PW ? 'hidden' : '';
        it.el.style.transform = `translateX(${Math.round(x - PW / 2)}px)`;
      }
    };
    render();

    return new Promise((resolve) => {
      const end = async (ok) => {
        if (ended) return; ended = true;
        if (tFrozen == null) tFrozen = tStart ? nowMs() - tStart : 0;
        render();
        const s = skill(), h = playCarrusel.lastHits;
        await ui.result({
          big: ok ? '¡STOP!' : '¡Enganchado!',
          text: ok ? `Dejaste de seguir. Te golpearon ${h} post${h === 1 ? '' : 's'}.` : `El carrusel te golpeó ${h} veces.`,
          skill: s, label: `${h} golpe${h === 1 ? '' : 's'}`,
        });
        resolve(s);
      };
      const addPass = (it) => {
        st.passes++; showHits(); sfx('like'); tone([880, 660], 45, 0.04);
        ui.pop(car, '♥ +1', 'bad');
        car.classList.remove('sg-hit'); void car.offsetWidth; car.classList.add('sg-hit');
        if (it?.unf) msg.textContent = '¡Se escapó!';
        if (st.passes >= maxHits) end(false);
      };
      const check = () => {
        if (ended || !tStart) return;
        const o = off();
        let passed = 0;
        for (const it of items) if (it.i >= 0 && xOf(it, o) < cx - TOL) passed++;
        while (counted < passed && !ended) { const it = items.find((x) => x.i === counted); counted++; addPass(it); }
      };
      const press = () => {
        if (ended || !tStart) return;
        const o = off();
        const inF = items.find((it) => it.i >= 0 && Math.abs(xOf(it, o) - cx) <= TOL);
        if (inF && inF.unf) {
          st.stopped = true; tFrozen = nowMs() - tStart;
          inF.el.classList.add('caught'); render();
          sfx('select'); tone([660, 880, 1320], 70, 0.05);
          msg.textContent = '¡DEIXASTE DE SEGUIR!';
          end(true);
        } else {
          frame.classList.remove('wrong'); void frame.offsetWidth; frame.classList.add('wrong');
          msg.textContent = '¡Ese no!';
          addPass(null);
        }
      };
      ui.on(a, 'pointerdown', (e) => { e.preventDefault(); press(); });
      ui.onKey((e) => { if (e.key === ' ' || e.key === 'Enter') { press(); return true; } return false; });
      ui.after(900, () => {
        tStart = nowMs(); msg.textContent = '¡Atento al marco!';
        ui.frame(render);
        ui.every(30, check);
        ui.every(100, () => { if (!ended) ui.timer.textContent = `${(Math.max(0, RUN - (nowMs() - tStart)) / 1000).toFixed(1)} s`; });
        ui.after(RUN, () => end(false));
      });
    });
  }, skill, RUN + 6000);
}

// =====================================================================
// 4. PEGA AS CAPTURAS (memoria contra el Formulario Infinito)
// =====================================================================
const MEM_PAIRS = [
  { id: 'rendemento', label: 'Rendemento' }, { id: 'cobertura', label: 'Cobertura' }, { id: 'sitemap', label: 'Sitemap' },
  { id: 'ligazons', label: 'Ligazóns' }, { id: 'experiencia', label: 'Experiencia' }, { id: 'seguridade', label: 'Seguridade' },
];
const CHART_KINDS = ['rendemento', 'cobertura', 'sitemap', 'ligazons', 'experiencia', 'seguridade'];
const CHART_ALIAS = { rendimiento: 'rendemento', performance: 'rendemento', enlaces: 'ligazons', links: 'ligazons', seguridad: 'seguridade', security: 'seguridade', coverage: 'cobertura', experience: 'experiencia' };
function chartKind(id, i) {
  const k = String(id || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return CHART_KINDS.includes(k) ? k : CHART_ALIAS[k] || CHART_KINDS[i % CHART_KINDS.length];
}
function drawChart(cv, kind) {
  cv.width = 32; cv.height = 24;
  const g = cv.getContext('2d');
  const rect = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const line = (x0, y0, x1, y1, c) => {
    g.fillStyle = c; x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (let n = 0; n < 200; n++) { g.fillRect(x0, y0, 1, 1); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
  };
  const arc = (cx, cy, r, a0, a1, c) => { g.fillStyle = c; for (let t = a0; t <= a1; t += 0.03) g.fillRect(Math.round(cx + r * Math.cos(t)), Math.round(cy + r * Math.sin(t)), 1, 1); };
  rect(0, 0, 32, 24, '#fdfbf6');
  const ink = '#1a1520', axis = '#8a8298';
  switch (kind) {
    case 'rendemento': {
      line(3, 2, 3, 21, axis); line(3, 21, 30, 21, axis);
      const pts = [[5, 18], [10, 14], [14, 16], [19, 9], [24, 11], [29, 4]];
      for (let i = 1; i < pts.length; i++) { line(...pts[i - 1], ...pts[i], '#2e7d32'); line(pts[i - 1][0], pts[i - 1][1] + 1, pts[i][0], pts[i][1] + 1, '#4cbb3a'); }
      pts.forEach(([x, y]) => rect(x - 1, y - 1, 3, 3, '#1b5e20'));
      break;
    }
    case 'cobertura': {
      line(2, 21, 30, 21, axis);
      [[4, 7, '#4cbb3a'], [9, 11, '#4cbb3a'], [14, 5, '#f5c400'], [19, 14, '#4cbb3a'], [24, 17, '#4cbb3a']].forEach(([x, h, c]) => { rect(x, 21 - h, 4, h, c); rect(x, 21 - h, 4, 1, ink); });
      rect(29, 17, 2, 4, '#e5383b');
      break;
    }
    case 'sitemap': {
      rect(12, 2, 8, 5, '#ff7a00'); rect(12, 2, 8, 1, ink);
      line(16, 7, 16, 9, ink); line(5, 10, 27, 10, ink);
      [2, 13, 24].forEach((x) => { line(x + 3, 10, x + 3, 12, ink); rect(x, 13, 7, 4, '#ffb74d'); rect(x, 13, 7, 1, ink); });
      line(5, 17, 5, 18, ink); rect(3, 19, 5, 3, '#ffe0b2'); line(27, 17, 27, 18, ink); rect(25, 19, 5, 3, '#ffe0b2');
      break;
    }
    case 'ligazons': {
      const nodes = [[6, 5], [25, 5], [16, 12], [7, 19], [26, 19]];
      [[0, 2], [1, 2], [2, 3], [2, 4], [0, 3], [1, 4], [0, 1]].forEach(([p, q]) => line(...nodes[p], ...nodes[q], '#9575cd'));
      nodes.forEach(([x, y], i) => { rect(x - 2, y - 2, 5, 5, i === 2 ? '#7c4dff' : '#b388ff'); rect(x - 2, y - 2, 5, 1, ink); });
      break;
    }
    case 'experiencia': {
      for (let r = 10; r <= 12; r++) {
        arc(16, 19, r, Math.PI, Math.PI * 1.33, '#e5383b');
        arc(16, 19, r, Math.PI * 1.34, Math.PI * 1.66, '#f5c400');
        arc(16, 19, r, Math.PI * 1.67, Math.PI * 2, '#4cbb3a');
      }
      line(16, 19, 16 + 9 * Math.cos(Math.PI * 1.82), 19 + 9 * Math.sin(Math.PI * 1.82), ink);
      rect(15, 18, 3, 3, ink); line(3, 21, 29, 21, axis);
      break;
    }
    default: { // seguridade: candado
      for (let r = 5; r <= 6; r++) arc(16, 10, r, Math.PI, Math.PI * 2, '#8a8298');
      rect(10, 10, 2, 2, '#8a8298'); rect(21, 10, 2, 2, '#8a8298');
      rect(8, 11, 17, 11, '#f5c400'); rect(8, 11, 17, 1, ink); rect(8, 21, 17, 1, ink); rect(8, 11, 1, 11, ink); rect(24, 11, 1, 11, ink);
      rect(15, 14, 3, 3, ink); rect(16, 17, 1, 3, ink);
    }
  }
}

/**
 * «Pega as capturas»: memoria de 6 parejas (gráfica + etiqueta). 40 s.
 * opts: { pairs?: [{ id, label }] (ids: rendemento|cobertura|sitemap|ligazons|experiencia|seguridade),
 *         title?, hint?, sfx?, say? } -> Promise<number 0..1>; deja playMemoria.lastPairs.
 */
export function playMemoria(opts = {}) {
  const sfx = sfxOf(opts);
  let pairs = list(opts.pairs, MEM_PAIRS).filter((p) => p && p.label).slice(0, 6);
  if (!pairs.length) pairs = MEM_PAIRS;
  const LIMIT = 40000;
  const st = { found: 0 };
  const skill = () => { playMemoria.lastPairs = st.found; return clamp01(st.found / pairs.length); };
  playMemoria.lastPairs = 0;

  return runGame({
    title: opts.title || '🧩 Pega as capturas',
    hint: opts.hint || 'El Formulario Infinito quiere capturas. Empareja cada gráfica con su nombre (clic, o flechas + Enter).',
    cls: 'sg-mem',
  }, async (ui) => {
    const grid = el('div', 'sg-mem-grid');
    ui.area.appendChild(grid);
    const deck = shuffle(pairs.flatMap((p, k) => [{ k, type: 'chart' }, { k, type: 'label' }]));
    const cards = deck.map((d) => {
      const b = el('button', 'sg-mem-card'); b.dataset.pair = String(d.k);
      const inner = el('span', 'sg-mem-inner');
      const back = el('span', 'sg-mem-face sg-mem-back'); back.appendChild(el('span', 'sg-mem-logo', '?'));
      const front = el('span', 'sg-mem-face sg-mem-front ' + (d.type === 'chart' ? 'shot' : 'lbl'));
      if (d.type === 'chart') {
        const cv = el('canvas', 'sg-shot-cv'); drawChart(cv, chartKind(pairs[d.k].id, d.k));
        front.append(el('span', 'sg-shot-bar'), cv);
      } else front.appendChild(el('span', 'sg-mem-txt', pairs[d.k].label));
      inner.append(back, front); b.appendChild(inner); grid.appendChild(b);
      return { ...d, el: b, open: false, done: false };
    });
    const t0 = nowMs();
    const showTime = () => { ui.timer.textContent = `⏱ ${Math.ceil(Math.max(0, LIMIT - (nowMs() - t0)) / 1000)} s`; };
    showTime(); ui.every(200, showTime);
    ui.score.textContent = `0/${pairs.length}`;

    await new Promise((res) => {
      let first = null, busy = false, ended = false;
      const finish = () => { if (ended) return; ended = true; res(); };
      const flip = (idx) => {
        const c = cards[idx];
        if (ended || busy || c.open || c.done) return;
        c.open = true; c.el.classList.add('open'); tone(700, 35, 0.03);
        if (first == null) { first = idx; return; }
        const f = cards[first]; first = null;
        if (f.k === c.k) {
          f.done = c.done = true; st.found++;
          for (const x of [f, c]) x.el.classList.add('done');
          ui.after(300, () => { for (const x of [f, c]) x.el.appendChild(el('span', 'sg-stamp', 'PEGADA')); });
          sfx('item'); tone([660, 990, 1320], 60, 0.05);
          ui.score.textContent = `${st.found}/${pairs.length}`;
          if (st.found === pairs.length) ui.after(500, finish);
        } else {
          busy = true; sfx('error404'); tone([260, 200], 80, 0.04);
          f.el.classList.add('miss'); c.el.classList.add('miss');
          ui.after(700, () => { for (const x of [f, c]) { x.open = false; x.el.classList.remove('open', 'miss'); } busy = false; });
        }
      };
      cards.forEach((c, i) => ui.on(c.el, 'click', () => flip(i)));
      ui.onKey((e) => {
        const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: 'up', ArrowDown: 'down' };
        if (!(e.key in moves)) return false;
        const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length || 4;
        let i = cards.findIndex((c) => c.el === document.activeElement);
        const m = moves[e.key];
        i = i < 0 ? 0 : m === 'up' ? i - cols : m === 'down' ? i + cols : i + m;
        cards[(i + cards.length) % cards.length].el.focus();
        return true;
      });
      ui.after(LIMIT, finish);
    });

    grid.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    cards.forEach((c) => { if (!c.done) c.el.classList.add('open', 'reveal'); });
    const s = skill(), all = st.found === pairs.length;
    if (all) sfx('coins');
    await ui.result({
      big: all ? '¡Todas pegadas!' : st.found >= pairs.length / 2 ? '¡Casi!' : '¡Ganó el formulario!',
      text: `${st.found}/${pairs.length} capturas pegadas`, skill: s, label: `${st.found}/${pairs.length}`,
    });
    return s;
  }, skill, LIMIT + 6000);
}

// =====================================================================
// 5. ENTREVISTA CON DON MANUEL (batalla de diálogo)
// =====================================================================
const IV_GREET = '¿Si? ¿Quen chama? Se é para venderme algo, xa lle digo que non.';
const IV_GOOD = [
  { q: '¿Desde cuándo está abierta la pulpería?', a: 'Desde o setenta e oito, rapaz. Meu pai xa cocía polbo na feira do Carballiño.' },
  { q: '¿Qué plato recomienda a quien viene por primera vez?', a: 'O polbo á feira con cachelos. E de sobremesa, filloas.' },
  { q: '¿De dónde viene el pulpo que cocinan?', a: 'De Marín e de Burela. Nada de conxelado de fóra, eh.' },
  { q: '¿Qué horario tienen?', a: 'De martes a domingo, xantares e ceas. Os luns descansamos.' },
  { q: '¿Aceptan reservas para grupos?', a: 'Si, ata corenta persoas no comedor de arriba.' },
  { q: '¿Qué les diferencia de otras pulperías?', a: 'A pota de cobre da miña avoa. Non hai segredo: hai paciencia.' },
];
const IV_BAD = [
  { q: '¿Tiene usted TikTok?', r: '¿Tic que? Eu teño teléfono fixo e grazas.' },
  { q: '¿Me da la contraseña de su correo?', r: '¡Home, por favor! ¿Vostede é dos que chaman para roubar?' },
  { q: '¿Ha pensado en poner sushi?', r: 'Sushi… ¡nunha pulpería! Mire, non me faga rir.' },
  { q: '¿Me repite el nombre del negocio?', r: 'Xa llo dixen. O Polbo Feliz. FE-LIZ.' },
  { q: '¿Acepta pagos en criptomonedas?', r: 'Eu cobro en euros. E se pode ser, en efectivo.' },
];
const IV_SILENCE = ['¿Oe? ¿Segue aí?', 'Mire que teño o polbo ao lume…', 'Se non pregunta nada, colgo, eh.'];
const IV_WIN = 'Bueno, rapaz, preguntas ben. Mándeme esa web, que a quero ver.';
const IV_LOSE = 'Mire, teño clientes esperando. ¡Boas tardes!';
const OLD_MAN = [
  '....BBBBBBBB....',
  '..BBBBBBBBBBBB..',
  '.BBBBBBBBBBBBBB.',
  '...GSSSSSSSSG...',
  '..GSSSSSSSSSSG..',
  '..SSEESSSSEESS..',
  '..SSSSSSSSSSSS..',
  '..SSSSSNNSSSSS..',
  '..SSWWWWWWWWSS..',
  '..SSWWSSSSWWSS..',
  '...SSSMMMMSSS...',
  '....SSSSSSSS....',
  '.....SSSSSS.....',
  '...CCCCKKCCCC...',
  '..CCCCCKKCCCCC..',
  '.CCCCCCKKCCCCCC.',
];
const OLD_MAN_PAL = { B: '#27324a', G: '#c9c9c9', S: '#e8b48a', E: '#1a1520', N: '#c98d63', W: '#f3efe6', M: '#6b2a2a', C: '#6d4c41', K: '#f3efe6' };

/**
 * Entrevista telefónica con el dueño (batalla de diálogo).
 * opts: { name? = 'Don Manuel', place? = 'Pulpería O Polbo Feliz', cast? = 'manuel', avatar?: HTMLCanvasElement,
 *         greet?, good?: [{ q, a }], bad?: [{ q, r }], silence?: string[], winLine?, loseLine?, needed? = 4,
 *         title?, hint?, sfx?, say? } -> Promise<{ won, info, patience }>
 */
export function playEntrevista(opts = {}) {
  const sfx = sfxOf(opts);
  const cast = opts.cast || 'manuel';
  const name = opts.name || 'Don Manuel', place = opts.place || 'Pulpería O Polbo Feliz';
  let good = list(opts.good, IV_GOOD).filter((x) => x && x.q && x.a);
  let bad = list(opts.bad, IV_BAD).filter((x) => x && x.q && x.r);
  if (!good.length) good = IV_GOOD;
  if (!bad.length) bad = IV_BAD;
  const silence = list(opts.silence, IV_SILENCE);
  const needed = Math.max(1, Math.round(Number(opts.needed) || 4));
  const TURN = 9000;
  const st = { goods: 0, patience: 100 };
  const info = () => Math.min(100, Math.round((st.goods * 100) / needed));
  const res = () => ({ won: st.goods >= needed, info: info(), patience: Math.max(0, st.patience) });

  return runGame({
    title: opts.title || '☎ A entrevista',
    hint: opts.hint || 'Saca información al dueño sin agotar su paciencia. Elige pregunta (1-4 o clic). Si tardas más de 9 s, silencio incómodo.',
    cls: 'sg-iv',
  }, async (ui) => {
    const a = ui.area;
    a.innerHTML = `<div class="sg-call">
        <div class="sg-call-top"><span class="sg-call-dot"></span><span class="sg-call-state">CHAMANDO…</span><span class="sg-call-time">00:00</span></div>
        <div class="sg-call-who"><div class="sg-avatar"></div><div class="sg-call-id"><div class="sg-call-name"></div><div class="sg-call-place"></div></div></div>
        <div class="sg-bars"></div>
      </div>
      <div class="sg-sub"><div class="sg-sub-me"></div><div class="sg-sub-line"></div></div>
      <div class="sg-tbar"><i></i></div>
      <div class="sg-qs"></div>`;
    const q = (s) => a.querySelector(s);
    const call = q('.sg-call'), avatar = q('.sg-avatar'), subMe = q('.sg-sub-me'), subLine = q('.sg-sub-line'), tbar = q('.sg-tbar'), qs = q('.sg-qs');
    q('.sg-call-name').textContent = name; q('.sg-call-place').textContent = place;
    if (opts.avatar && typeof opts.avatar === 'object' && opts.avatar.nodeType === 1) avatar.appendChild(opts.avatar);
    else { const cv = el('canvas'); drawMap(cv, OLD_MAN, OLD_MAN_PAL); avatar.appendChild(cv); }
    const pat = meter('Paciencia', 'sg-pat'), inf = meter('Información', 'sg-inf');
    q('.sg-bars').append(pat.root, inf.root);
    const upd = () => { pat.set(st.patience, false); inf.set(info(), false); ui.score.textContent = `Info ${info()}%`; };
    upd();
    const btns = [0, 1, 2, 3].map((i) => {
      const b = el('button', 'sg-btn sg-q'); b.disabled = true;
      b.append(el('span', 'sg-key', String(i + 1)), el('span', 'sg-q-txt', '…')); qs.appendChild(b); return b;
    });
    const speak = async (text) => {
      subLine.replaceChildren(el('b', '', name + ':'), document.createTextNode(' ' + text));
      avatar.classList.add('talk');
      await ui.say(opts, cast, text);
      avatar.classList.remove('talk');
    };

    sfx('ring'); tone([440, 480], 250, 0.03, 'sine');
    await ui.wait(1100);
    q('.sg-call-state').textContent = 'EN CHAMADA';
    call.classList.add('live');
    const t0 = nowMs();
    ui.every(500, () => { q('.sg-call-time').textContent = mmss(nowMs() - t0); });
    ui.timer.textContent = '';
    await speak(opts.greet || IV_GREET);

    const askedG = new Set(), askedB = new Set();
    const take = (src, asked, k) => {
      const fresh = shuffle(src.filter((x) => !asked.has(x)));
      const used = shuffle(src.filter((x) => asked.has(x)));
      return [...fresh, ...used].slice(0, k);
    };
    let chooser = null;
    btns.forEach((b, i) => ui.on(b, 'click', () => chooser?.(i)));
    ui.onKey((e) => { const k = ['1', '2', '3', '4'].indexOf(e.key); if (k >= 0 && chooser) { chooser(k); return true; } return false; });

    while (st.goods < needed && st.patience > 0) {
      const choices = shuffle([...take(good, askedG, 2).map((x) => ({ ...x, kind: 'good', ref: x })), ...take(bad, askedB, 2).map((x) => ({ ...x, kind: 'bad', ref: x }))]);
      btns.forEach((b, i) => {
        const c = choices[i];
        b.classList.remove('good', 'bad'); b.hidden = !c; b.disabled = !c;
        if (c) b.querySelector('.sg-q-txt').textContent = c.q;
      });
      subMe.textContent = 'Tu turno: pregunta algo…';
      drain(tbar, TURN);
      const pick = await new Promise((r) => {
        const cancel = ui.after(TURN, () => { chooser = null; r(-1); });
        chooser = (i) => { if (!choices[i]) return; chooser = null; cancel(); r(i); };
      });
      freeze(tbar);
      btns.forEach((b) => (b.disabled = true));
      if (pick < 0) {
        st.patience -= 25; upd(); sfx('error404'); tone([300, 220], 100, 0.04);
        subMe.textContent = 'Tú: (…silencio incómodo…)';
        ui.pop(call, '−25 paciencia', 'bad');
        await speak(pickOne(silence));
      } else {
        const c = choices[pick];
        subMe.textContent = 'Tú: ' + c.q;
        if (c.kind === 'good') {
          askedG.add(c.ref); st.goods++; upd(); btns[pick].classList.add('good');
          sfx('item'); tone([660, 990], 70, 0.05); ui.pop(call, `+${Math.round(100 / needed)} info`, 'good');
          await speak(c.a);
        } else {
          askedB.add(c.ref); st.patience -= 30; upd(); btns[pick].classList.add('bad');
          sfx('hit'); tone([220, 160], 110, 0.06); ui.pop(call, '−30 paciencia', 'bad');
          ui.panel.classList.remove('sg-jolt'); void ui.panel.offsetWidth; ui.panel.classList.add('sg-jolt');
          await speak(c.r);
        }
      }
    }
    btns.forEach((b) => { b.disabled = true; });
    subMe.textContent = '';
    const out = res();
    if (out.won) {
      await speak(opts.winLine || IV_WIN);
      sfx('coins'); tone([523, 659, 784, 1046], 90, 0.05);
      await ui.result({ big: '¡Entrevista hecha!', text: `Información ${out.info}% · Paciencia ${out.patience}`, skill: 1, label: `Info ${out.info}%` });
    } else {
      await speak(opts.loseLine || IV_LOSE);
      sfx('hangup'); call.classList.add('hung'); q('.sg-call-state').textContent = 'LLAMADA FINALIZADA';
      await ui.result({ big: '¡Colgó!', text: `Solo sacaste un ${out.info}% de la información.`, skill: out.info / 100 * 0.5, label: `Info ${out.info}%` });
    }
    return out;
  }, res, 30000 + (needed + 4) * 18000);
}

// =====================================================================
// 6. WEB GEO (súper ataque final)
// =====================================================================
const GEO_ROUNDS = [
  { query: '¿Dónde comer buen pulpo en O Carballiño?', answer: 'Pulpería O Polbo Feliz · pulpo á feira desde 1978 · reserva online', decoys: ['Viño bo. Mércao.', 'Resumo de IA: hai varios sitios, non importa cal', 'Negocio sen web'] },
  { query: '¿Pulpería abierta el domingo cerca de mí?', answer: 'O Polbo Feliz · abierto de martes a domingo · 4,8★', decoys: ['Pulpería (horario descoñecido)', 'Resumo de IA: probablemente pechado', 'Negocio sen web'] },
  { query: 'Restaurante para un grupo de 40 en Ourense', answer: 'O Polbo Feliz · comedor para 40 · menú de grupo', decoys: ['Viño bo. Mércao.', 'Resumo de IA: hai varios sitios, non importa cal', 'Ficha sen fotos nin teléfono'] },
];

/**
 * «Web GEO»: 3 rondas; elige el negocio real que la IA debe recomendar. 5 s por ronda.
 * opts: { rounds?: [{ query, answer, decoys: [3 strings] }], assistant? = 'Asistente IA',
 *         title?, hint?, sfx?, say? } -> Promise<number 0..1>
 */
export function playWebGeo(opts = {}) {
  const sfx = sfxOf(opts);
  let rounds = list(opts.rounds, GEO_ROUNDS).filter((r) => r && r.query && r.answer).slice(0, 3);
  if (!rounds.length) rounds = GEO_ROUNDS;
  const ROUND = 5000;
  const st = { correct: 0 };
  const skill = () => clamp01(st.correct / rounds.length);

  return runGame({
    title: opts.title || 'WEB GEO',
    hint: opts.hint || '¡Súper ataque! Haz que la IA recomiende el negocio de verdad: elige la tarjeta buena (1-4 o clic) antes de 5 s.',
    cls: 'sg-geo',
  }, async (ui) => {
    const a = ui.area;
    a.innerHTML = `<div class="sg-geo-round"><span class="sg-geo-n"></span><span class="sg-geo-ok"></span></div>
      <div class="sg-chat"><div class="sg-chat-head"></div><div class="sg-msg me"></div><div class="sg-msg ai"></div></div>
      <div class="sg-tbar"><i></i></div>
      <div class="sg-geo-cards"></div>
      <div class="sg-geo-mark"></div>`;
    const q = (s) => a.querySelector(s);
    const roundN = q('.sg-geo-n'), okEl = q('.sg-geo-ok'), me = q('.sg-msg.me'), ai = q('.sg-msg.ai'), tbar = q('.sg-tbar'), box = q('.sg-geo-cards'), mark = q('.sg-geo-mark');
    q('.sg-chat-head').textContent = '🤖 ' + (opts.assistant || 'Asistente IA');
    const btns = [0, 1, 2, 3].map((i) => {
      const b = el('button', 'sg-btn sg-geo-card'); b.disabled = true;
      b.append(el('span', 'sg-key', String(i + 1)), el('span', 'sg-geo-txt', ''));
      box.appendChild(b); return b;
    });
    let picker = null;
    btns.forEach((b, i) => ui.on(b, 'click', () => picker?.(i)));
    ui.onKey((e) => { const k = ['1', '2', '3', '4'].indexOf(e.key); if (k >= 0 && picker) { picker(k); return true; } return false; });
    const showMark = (ok) => { mark.replaceChildren(el('span', ok ? 'ok' : 'bad', ok ? '✔' : '✖')); };
    const fly = (from, to) => {
      try {
        const r1 = from.getBoundingClientRect(), r2 = to.getBoundingClientRect();
        const f = from.cloneNode(true); f.classList.add('sg-fly'); f.disabled = true;
        Object.assign(f.style, { left: r1.left + 'px', top: r1.top + 'px', width: r1.width + 'px', height: r1.height + 'px' });
        ui.root.appendChild(f); void f.offsetWidth;
        const dx = r2.left + r2.width / 2 - (r1.left + r1.width / 2), dy = r2.top + r2.height / 2 - (r1.top + r1.height / 2);
        f.style.transform = `translate(${dx}px, ${dy}px) scale(.4) rotate(-6deg)`; f.style.opacity = '0.15';
        ui.after(600, () => f.remove());
      } catch { /* sin animación */ }
    };

    // Intro
    const intro = el('div', 'sg-geo-intro', '⚡ SÚPER ATAQUE ⚡');
    a.appendChild(intro);
    tone([392, 523, 659, 784, 1046], 70, 0.05);
    await ui.wait(1000);
    intro.remove();

    for (let r = 0; r < rounds.length; r++) {
      const R = rounds[r];
      const decoys = list(R.decoys, ['Negocio sen web', 'Resumo de IA: non sei', 'Viño bo. Mércao.']).slice(0, 3);
      const cards = shuffle([{ text: R.answer, real: true }, ...decoys.map((d) => ({ text: String(d), real: false }))]);
      roundN.textContent = `Ronda ${r + 1}/${rounds.length}`;
      okEl.textContent = `✔ ${st.correct}`;
      me.textContent = R.query;
      ai.className = 'sg-msg ai typing'; ai.textContent = '';
      mark.replaceChildren();
      btns.forEach((b, i) => {
        const c = cards[i];
        b.classList.remove('good', 'bad', 'real'); b.hidden = !c; b.disabled = !c;
        if (c) b.querySelector('.sg-geo-txt').textContent = c.text;
      });
      drain(tbar, ROUND); tone(880, 40, 0.03);
      const pick = await new Promise((res) => {
        const cancel = ui.after(ROUND, () => { picker = null; res(-1); });
        picker = (i) => { if (!cards[i]) return; picker = null; cancel(); res(i); };
      });
      freeze(tbar);
      btns.forEach((b) => (b.disabled = true));
      const ok = pick >= 0 && cards[pick].real;
      if (pick >= 0) { fly(btns[pick], ai); await ui.wait(480); }
      ai.classList.remove('typing');
      ai.classList.add(ok ? 'ok' : 'bad');
      ai.textContent = pick >= 0 ? cards[pick].text : 'Resumo de IA: non atopei nada concreto…';
      if (ok) {
        st.correct++; btns[pick].classList.add('good');
        sfx('coins'); tone([784, 1046, 1568], 70, 0.05);
      } else {
        if (pick >= 0) btns[pick].classList.add('bad');
        btns[cards.findIndex((c) => c.real)]?.classList.add('real');
        sfx('glitch'); tone([200, 140, 90], 70, 0.06, 'sawtooth');
        ui.panel.classList.remove('sg-glitchy'); void ui.panel.offsetWidth; ui.panel.classList.add('sg-glitchy');
      }
      showMark(ok);
      okEl.textContent = `✔ ${st.correct}`;
      ui.score.textContent = `${st.correct}/${rounds.length}`;
      await ui.wait(1150);
    }
    mark.replaceChildren();
    const s = skill();
    const all = st.correct === rounds.length;
    await ui.result({
      big: all ? '¡GEO CRÍTICO!' : st.correct >= 2 ? '¡La IA te recomienda!' : 'La IA no te encuentra…',
      text: `${st.correct}/${rounds.length} respuestas correctas`, skill: s, label: `${st.correct}/${rounds.length}`, ms: 1400,
    });
    return s;
  }, skill, 4000 + rounds.length * 8000);
}

// =====================================================================
// 7. EL CATÁLOGO ENTERO (castigo por perder)
// =====================================================================
const CAT_PAGES = [
  { title: 'Web profesional', text: 'Tu negocio abierto las 24 horas. Diseño a medida, adaptada al móvil y lista para vender.', icon: '🖥', tag: '¡TOP VENTAS!' },
  { title: 'Web GEO', text: 'Para que los asistentes de IA recomienden tu negocio cuando alguien pregunta.', icon: '🤖', tag: '¡NOVEDAD!' },
  { title: 'Web Continua', text: 'Tu web siempre al día: cambios, textos y mejoras cada mes sin preocuparte.', icon: '♾', tag: 'MENSUAL' },
  { title: 'SEO', text: 'Que te encuentren en Google por lo que buscan de verdad tus clientes.', icon: '🔎', tag: '¡SUBE!' },
  { title: 'Perfil de Google', text: 'Ficha de empresa cuidada: fotos, horarios, reseñas y publicaciones.', icon: '📍', tag: 'EN EL MAPA' },
  { title: 'Publiblog', text: 'Noticias en tu blog todos los meses, escritas por redactores.', icon: '📰', tag: 'CADA MES' },
  { title: 'Catálogo de Servicios', text: 'Todos tus servicios explicados, ordenados y listos para enseñar.', icon: '📒', tag: '¡COMPLETO!' },
  { title: 'Omnea', text: 'Y para terminar… Omnea. Pregunta a tu comercial, que te lo cuenta encantado.', icon: '🧩', tag: '¡Y MÁS!' },
];
const CAT_COLORS = [['#ff7a00', '#e5383b'], ['#00b8d4', '#7c4dff'], ['#4cbb3a', '#00897b'], ['#2e9bff', '#1a237e'], ['#e5383b', '#ad1457'], ['#f5c400', '#ef6c00'], ['#7c4dff', '#311b92'], ['#00897b', '#1b5e20']];
const CAT_READ = 'Como perdiste, léoche o catálogo enteiro. Páxina un: Web profesional. Páxina dous…';

/**
 * Castigo: te leen el catálogo entero. Se salta con «Saltar» (aparece a los 4 s). Máx. 25 s.
 * opts: { pages?: [{ title, text, icon?, tag? }], readLine?, cast? = 'brais', speaker? = 'Brais',
 *         title?, hint?, sfx?, say? } -> Promise<void>
 */
export function showCatalogo(opts = {}) {
  const sfx = sfxOf(opts);
  let pages = list(opts.pages, CAT_PAGES).filter((p) => p && (p.title || p.text));
  if (!pages.length) pages = CAT_PAGES;
  const MAX = 25000;
  const cast = opts.cast || 'brais', speaker = opts.speaker || 'Brais';
  const readLine = opts.readLine || CAT_READ;
  const per = Math.min(2800, Math.max(1500, (MAX - 2500) / pages.length));

  return runGame({
    title: opts.title || '📚 Catálogo de Servicios',
    hint: opts.hint || 'Castigo por perder: te leemos el catálogo entero. Página a página.',
    cls: 'sg-cat',
  }, async (ui) => {
    const a = ui.area;
    a.innerHTML = `<div class="sg-cat-view"><div class="sg-cat-pages"></div></div>
      <div class="sg-cat-sub"></div>
      <div class="sg-cat-bottom"><div class="sg-cat-prog"><i></i></div><button class="sg-btn sg-cat-skip" type="button" hidden>Saltar ⏭</button></div>`;
    const box = a.querySelector('.sg-cat-pages'), sub = a.querySelector('.sg-cat-sub'), prog = a.querySelector('.sg-cat-prog i'), skip = a.querySelector('.sg-cat-skip');
    pages.forEach((p, i) => {
      const [c1, c2] = CAT_COLORS[i % CAT_COLORS.length];
      const pg = el('div', 'sg-cat-page');
      pg.style.setProperty('--c1', c1); pg.style.setProperty('--c2', c2);
      if (p.tag) pg.appendChild(el('span', 'sg-cat-tag', p.tag));
      pg.append(el('span', 'sg-cat-ico', p.icon || '★'), el('span', 'sg-cat-h', p.title || ''), el('span', 'sg-cat-p', p.text || ''), el('span', 'sg-cat-num', `Pág. ${i + 1}/${pages.length}`));
      box.appendChild(pg);
    });
    const setSub = (text) => sub.replaceChildren(el('b', '', speaker + ':'), document.createTextNode(' ' + text));
    let idx = 0, said = false;
    const show = () => {
      box.style.transform = `translateY(-${(idx * 100) / pages.length}%)`;
      prog.style.width = `${((idx + 1) * 100) / pages.length}%`;
      ui.timer.textContent = `Pág. ${idx + 1}/${pages.length}`;
      if (said) setSub(`«${pages[idx].title}: ${pages[idx].text}»`);
    };
    show(); setSub(readLine);
    sfx('item');
    const sayDone = ui.say(opts, cast, readLine).then(() => { said = true; setSub(`«${pages[idx].title}: ${pages[idx].text}»`); });
    const stopTurns = ui.every(per, () => { if (idx < pages.length - 1) { idx++; show(); tone(1200, 25, 0.02, 'triangle'); } else stopTurns(); });
    const skipped = new Promise((r) => {
      ui.after(4000, () => { skip.hidden = false; });
      ui.on(skip, 'click', r);
      ui.onKey((e) => { if (!skip.hidden && ['Escape', 'Enter', ' '].includes(e.key)) { r(); return true; } return false; });
    });
    const finished = Promise.all([ui.wait(per * pages.length), sayDone]);
    const how = await Promise.race([finished.then(() => 'end'), skipped.then(() => 'skip'), ui.wait(MAX - 800).then(() => 'end')]);
    if (how === 'end') { sub.replaceChildren(el('b', '', speaker + ':'), document.createTextNode(' …y eso es todo. ¿Firmamos?')); await ui.wait(600); }
  }, () => undefined, MAX);
}
