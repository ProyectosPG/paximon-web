// Minijuegos de Paximón. Cada uno devuelve una habilidad de 0 a 1 que el servidor
// convierte en daño, precisión, curación, chakra o niveles de stats.
//   playMinigame(kind, opts) -> Promise<number>
//   kinds: mash | timing | sequence | charge | rhythm | dodge | aim | roulette | simon

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const clamp01 = (v) => Math.max(0, Math.min(1, v));

let audioCtx = null;
function beep(freq = 660, ms = 90, vol = 0.08) {
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'square'; o.frequency.value = freq; g.gain.value = vol;
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + ms / 1000);
  } catch { /* sin audio */ }
}

// ---------- overlay ----------
function overlay(title, hint) {
  let root = document.getElementById('mg');
  if (!root) { root = document.createElement('div'); root.id = 'mg'; document.body.appendChild(root); }
  root.innerHTML = `<div class="mg-panel">
    <div class="mg-title">${title}</div>
    <div class="mg-hint">${hint}</div>
    <div class="mg-area"></div>
    <div class="mg-foot"><div class="mg-timer"></div><div class="mg-score"></div></div>
  </div>`;
  root.hidden = false;
  return {
    root, area: root.querySelector('.mg-area'), timer: root.querySelector('.mg-timer'),
    score: root.querySelector('.mg-score'), hint: root.querySelector('.mg-hint'),
    close() { root.hidden = true; root.innerHTML = ''; },
  };
}
function countdown(ui, ms, onEnd) {
  const t0 = performance.now();
  const id = setInterval(() => {
    const left = Math.max(0, ms - (performance.now() - t0));
    ui.timer.textContent = (left / 1000).toFixed(1) + ' s';
    if (left <= 0) { clearInterval(id); onEnd?.(); }
  }, 50);
  return () => clearInterval(id);
}
function onAction(ui, fn, { keys = [' ', 'Enter'], pointer = true } = {}) {
  const kd = (e) => { if (e.repeat) return; if (keys.includes(e.key) || keys.includes(e.code)) { e.preventDefault(); fn(e); } };
  const pd = (e) => { e.preventDefault(); fn(e); };
  window.addEventListener('keydown', kd);
  if (pointer) ui.area.addEventListener('pointerdown', pd);
  return () => { window.removeEventListener('keydown', kd); ui.area.removeEventListener('pointerdown', pd); };
}
function finish(ui, skill, label) {
  ui.score.textContent = label ?? `${Math.round(skill * 100)}%`;
  ui.root.querySelector('.mg-panel').classList.add(skill >= 0.85 ? 'great' : skill >= 0.5 ? 'ok' : 'bad');
  return sleep(650).then(() => { ui.close(); return clamp01(skill); });
}

// ---------- 1. guerra de clics (duelo) ----------
function mash(opts) {
  return new Promise((resolve) => {
    const duel = !!opts.duel;
    const ui = overlay(`⚔ ${opts.title}`, duel ? 'Machaca el botón o la barra espaciadora. ¡El rival también!' : 'Machaca el botón o la barra espaciadora.');
    ui.area.innerHTML = `<div class="mg-rope"><div class="mg-rope-line"></div><div class="mg-knot"></div></div>
      <button class="mg-big" type="button">¡DÁLLE!</button><div class="mg-counts"></div>`;
    const knot = ui.area.querySelector('.mg-knot'), counts = ui.area.querySelector('.mg-counts');
    let mine = 0, done = false;
    const render = () => {
      const theirs = duel ? (opts.duel.getOpponent?.() || 0) : 0;
      const diff = duel ? mine - theirs : mine - 15;
      knot.style.left = (50 + Math.max(-44, Math.min(44, diff * 2.2))) + '%';
      counts.textContent = duel ? `tú ${mine} · rival ${theirs}` : `${mine} golpes`;
    };
    const off = onAction(ui, () => { if (done) return; mine++; beep(520 + (mine % 5) * 40, 30, 0.04); render(); opts.duel?.onCount?.(mine); });
    const iv = setInterval(render, 120);
    countdown(ui, 5000, async () => {
      done = true; off(); clearInterval(iv);
      const skill = clamp01(mine / 30);
      resolve(await finish(ui, skill, `${mine} golpes`));
    });
  });
}

// ---------- 2. barra de tiempo ----------
function timing(opts) {
  return new Promise((resolve) => {
    const ui = overlay(`⏱ ${opts.title}`, 'Para el cursor en la zona verde. En el centro dorado, crítico.');
    ui.area.innerHTML = `<div class="mg-bar"><div class="mg-zone ok"></div><div class="mg-zone great"></div><div class="mg-cursor"></div></div>`;
    const cursor = ui.area.querySelector('.mg-cursor');
    const period = opts.cost >= 6 ? 900 : 1200;
    const t0 = performance.now(); let raf, done = false, pos = 0;
    const tick = () => { pos = 0.5 + 0.5 * Math.sin(((performance.now() - t0) / period) * Math.PI * 2); cursor.style.left = (pos * 100) + '%'; if (!done) raf = requestAnimationFrame(tick); };
    tick();
    const stop = async () => {
      if (done) return; done = true; off(); cancelAnimationFrame(raf); clear();
      const d = Math.abs(pos - 0.5);
      const skill = clamp01(1 - d / 0.25);
      beep(skill >= 0.92 ? 1100 : skill >= 0.6 ? 800 : 300, 120);
      resolve(await finish(ui, skill, skill >= 0.92 ? '¡CRÍTICO!' : skill >= 0.6 ? '¡Bien!' : 'Meh…'));
    };
    const off = onAction(ui, stop);
    const clear = countdown(ui, 5000, stop);
  });
}

// ---------- 3. secuencia de flechas ----------
function sequence(opts) {
  return new Promise((resolve) => {
    const ARROWS = [['ArrowLeft', '←', 'a'], ['ArrowUp', '↑', 'w'], ['ArrowRight', '→', 'd'], ['ArrowDown', '↓', 's']];
    const n = opts.cost >= 6 ? 6 : 5;
    const seq = Array.from({ length: n }, () => ARROWS[Math.floor(Math.random() * 4)]);
    const ui = overlay(`✨ ${opts.title}`, 'Teclea las flechas en orden (flechas o WASD). Un fallo corta el conjuro.');
    ui.area.innerHTML = `<div class="mg-seq">${seq.map(a => `<span>${a[1]}</span>`).join('')}</div>
      <div class="mg-pad">${ARROWS.map(a => `<button type="button" data-k="${a[0]}">${a[1]}</button>`).join('')}</div>`;
    const cells = [...ui.area.querySelectorAll('.mg-seq span')];
    let i = 0, done = false;
    const press = async (key) => {
      if (done) return;
      const want = seq[i];
      if (key === want[0] || key.toLowerCase() === want[2]) { cells[i].classList.add('hit'); i++; beep(600 + i * 60, 60); }
      else { cells[i].classList.add('miss'); beep(200, 200); return end(); }
      if (i >= n) return end();
    };
    const end = async () => { if (done) return; done = true; window.removeEventListener('keydown', kd); clear(); resolve(await finish(ui, i / n, `${i}/${n}`)); };
    const kd = (e) => { if (['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown', 'a', 'w', 'd', 's', 'A', 'W', 'D', 'S'].includes(e.key)) { e.preventDefault(); press(e.key); } };
    window.addEventListener('keydown', kd);
    ui.area.querySelectorAll('.mg-pad button').forEach(b => b.addEventListener('pointerdown', (e) => { e.preventDefault(); press(b.dataset.k); }));
    const clear = countdown(ui, 4500, end);
  });
}

// ---------- 4. cargar y soltar ----------
function charge(opts) {
  return new Promise((resolve) => {
    const ui = overlay(`💪 ${opts.title}`, 'Mantén pulsado para cargar y suelta cerca del máximo. Si te pasas, explota.');
    ui.area.innerHTML = `<div class="mg-bar vertical"><div class="mg-fill"></div><div class="mg-line"></div></div><button class="mg-big" type="button">MANTÉN</button>`;
    const fill = ui.area.querySelector('.mg-fill');
    let holding = false, level = 0, done = false, tStart = 0, raf;
    const tick = () => {
      if (holding) {
        const t = performance.now() - tStart;
        level = t <= 1600 ? t / 1600 : 1 + (t - 1600) / 400;
        fill.style.height = Math.min(100, level * 80) + '%';
        fill.classList.toggle('danger', level > 0.92);
        if (level > 1.25) return end(0, '¡BOOM!');
      }
      if (!done) raf = requestAnimationFrame(tick);
    };
    tick();
    const start = (e) => { if (done || holding) return; if (e.type === 'keydown' && ![' ', 'Enter'].includes(e.key)) return; if (e.type === 'keydown' && e.repeat) return; e.preventDefault(); holding = true; tStart = performance.now(); };
    const release = (e) => { if (!holding || done) return; if (e.type === 'keyup' && ![' ', 'Enter'].includes(e.key)) return; holding = false; end(level > 1 ? 0 : level, level > 1 ? '¡BOOM!' : level >= 0.9 ? '¡Perfecto!' : `${Math.round(level * 100)}%`); };
    const end = async (skill, label) => { if (done) return; done = true; cancelAnimationFrame(raf); clear(); cleanup(); beep(skill > 0 ? 700 + skill * 400 : 150, 160); resolve(await finish(ui, skill, label)); };
    const cleanup = () => { window.removeEventListener('keydown', start); window.removeEventListener('keyup', release); ui.area.removeEventListener('pointerdown', start); window.removeEventListener('pointerup', release); };
    window.addEventListener('keydown', start); window.addEventListener('keyup', release);
    ui.area.addEventListener('pointerdown', start); window.addEventListener('pointerup', release);
    const clear = countdown(ui, 5000, () => end(holding ? Math.min(level, 1) : 0.3, holding ? undefined : 'Tarde…'));
  });
}

// ---------- 5. ritmo de gaita ----------
function rhythm(opts) {
  return new Promise(async (resolve) => {
    const ui = overlay(`🎵 ${opts.title}`, 'Escucha los cuatro golpes y repítelos con el mismo ritmo.');
    ui.area.innerHTML = `<div class="mg-beats">${'<span></span>'.repeat(4)}</div><div class="mg-msg">Escucha…</div>`;
    const beats = [...ui.area.querySelectorAll('.mg-beats span')], msg = ui.area.querySelector('.mg-msg');
    const BEAT = 500;
    for (let i = 0; i < 4; i++) { beats[i].classList.add('on'); beep(440 + i * 60, 110); await sleep(BEAT); }
    beats.forEach(b => b.classList.remove('on'));
    msg.textContent = '¡Agora ti!';
    const start = performance.now() + BEAT;
    const expected = [0, 1, 2, 3].map(i => start + i * BEAT);
    const scores = []; let done = false;
    const off = onAction(ui, () => {
      if (done) return;
      const now = performance.now(), k = scores.length;
      const dt = Math.abs(now - expected[k]);
      const s = clamp01(1 - dt / 220);
      scores.push(s); beats[k].classList.add(s > 0.6 ? 'on' : 'off'); beep(s > 0.6 ? 880 : 300, 80);
      if (scores.length >= 4) end();
    });
    const end = async () => {
      if (done) return; done = true; off(); clear();
      while (scores.length < 4) scores.push(0);
      const skill = scores.reduce((a, b) => a + b, 0) / 4;
      resolve(await finish(ui, skill, skill >= 0.85 ? '¡Qué compás!' : undefined));
    };
    const clear = countdown(ui, BEAT * 5 + 400, end);
  });
}

// ---------- 6. esquiva del defensor ----------
function dodge(opts) {
  return new Promise((resolve) => {
    const ui = overlay(`🛡 ${opts.title}`, 'Cuando aparezca ¡AGORA!, pulsa lo más rápido que puedas. Si te adelantas, fallas.');
    ui.area.innerHTML = `<div class="mg-dodge">Prepárate…</div>`;
    const box = ui.area.querySelector('.mg-dodge');
    let armed = false, done = false, tGo = 0;
    const wait = 800 + Math.random() * 1400;
    const timer = setTimeout(() => { armed = true; tGo = performance.now(); box.textContent = '¡AGORA!'; box.classList.add('go'); beep(990, 150, 0.1); setTimeout(() => { if (!done) end(0, 'Tarde…'); }, 450); }, wait);
    const off = onAction(ui, () => {
      if (done) return;
      if (!armed) return end(0, '¡Demasiado pronto!');
      const rt = performance.now() - tGo;
      end(rt <= 450 ? 1 : 0, rt <= 450 ? `¡Esquiva! ${Math.round(rt)} ms` : 'Tarde…');
    });
    const end = async (skill, label) => { if (done) return; done = true; clearTimeout(timer); off(); resolve(await finish(ui, skill, label)); };
    ui.timer.textContent = '';
  });
}

// ---------- 7. puntería ----------
function aim(opts) {
  return new Promise((resolve) => {
    const ui = overlay(`🎯 ${opts.title}`, 'Haz clic en el blanco en movimiento. Cuanto más al centro, mejor.');
    ui.area.innerHTML = `<div class="mg-target"><i></i></div>`;
    const target = ui.area.querySelector('.mg-target');
    const W = ui.area.clientWidth || 360, H = ui.area.clientHeight || 200, R = 26;
    let x = Math.random() * (W - 2 * R) + R, y = Math.random() * (H - 2 * R) + R;
    const speed = 170 + (opts.cost || 1) * 20;
    let ang = Math.random() * Math.PI * 2, vx = Math.cos(ang) * speed, vy = Math.sin(ang) * speed;
    let last = performance.now(), raf, done = false;
    const tick = () => {
      const now = performance.now(), dt = (now - last) / 1000; last = now;
      x += vx * dt; y += vy * dt;
      if (x < R || x > W - R) { vx = -vx; x = Math.max(R, Math.min(W - R, x)); }
      if (y < R || y > H - R) { vy = -vy; y = Math.max(R, Math.min(H - R, y)); }
      target.style.transform = `translate(${x - R}px, ${y - R}px)`;
      if (!done) raf = requestAnimationFrame(tick);
    };
    tick();
    const shoot = async (e) => {
      if (done) return;
      const rect = ui.area.getBoundingClientRect();
      const px = e.clientX - rect.left, py = e.clientY - rect.top;
      const d = Math.hypot(px - x, py - y);
      end(d > R ? 0.1 : clamp01(1 - d / R), d > R ? 'Aire…' : d < R * 0.3 ? '¡Diana!' : '¡Le diste!');
    };
    const end = async (skill, label) => { if (done) return; done = true; cancelAnimationFrame(raf); clear(); ui.area.removeEventListener('pointerdown', shoot); beep(skill > 0.5 ? 900 : 250, 100); resolve(await finish(ui, skill, label)); };
    ui.area.addEventListener('pointerdown', shoot);
    const clear = countdown(ui, 3500, () => end(0.15, 'Se escapó…'));
  });
}

// ---------- 8. ruleta de chakra ----------
function roulette(opts) {
  return new Promise((resolve) => {
    const VALUES = [2, 3, 4, 5, 6];
    const ui = overlay(`◆ ${opts.title}`, 'Para la ruleta. Cuanto más alto, más chakra.');
    ui.area.innerHTML = `<canvas class="mg-wheel" width="200" height="200"></canvas><div class="mg-msg">Pulsa para parar</div>`;
    const cv = ui.area.querySelector('canvas'), ctx = cv.getContext('2d');
    const colors = ['#5e35b1', '#7c4dff', '#9575cd', '#b388ff', '#651fff'];
    let angle = 0, vel = 0.32, stopping = false, done = false, raf;
    const draw = () => {
      ctx.clearRect(0, 0, 200, 200);
      const seg = (Math.PI * 2) / VALUES.length;
      VALUES.forEach((v, i) => {
        ctx.beginPath(); ctx.moveTo(100, 100); ctx.arc(100, 100, 92, angle + i * seg, angle + (i + 1) * seg); ctx.closePath();
        ctx.fillStyle = colors[i]; ctx.fill(); ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 3; ctx.stroke();
        const a = angle + (i + 0.5) * seg; ctx.fillStyle = '#fff'; ctx.font = 'bold 22px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(v), 100 + Math.cos(a) * 60, 100 + Math.sin(a) * 60);
      });
      ctx.beginPath(); ctx.moveTo(100, 2); ctx.lineTo(88, 24); ctx.lineTo(112, 24); ctx.closePath(); ctx.fillStyle = '#ffc107'; ctx.fill(); ctx.strokeStyle = '#1a1a1a'; ctx.stroke();
    };
    const tick = () => {
      angle += vel; if (stopping) vel *= 0.965;
      draw();
      if (stopping && vel < 0.004) return end();
      if (!done) raf = requestAnimationFrame(tick);
    };
    tick();
    const off = onAction(ui, () => { if (!stopping) { stopping = true; vel = Math.max(vel, 0.25); } });
    const end = async () => {
      if (done) return; done = true; off(); cancelAnimationFrame(raf); clear();
      const seg = (Math.PI * 2) / VALUES.length;
      const pointer = (-Math.PI / 2 - angle) % (Math.PI * 2);
      const idx = Math.floor((((pointer % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / seg);
      const v = VALUES[idx]; beep(500 + v * 80, 200);
      resolve(await finish(ui, (v - 2) / 4, `+${v} chakra`));
    };
    const clear = countdown(ui, 6000, () => { stopping = true; });
  });
}

// ---------- 9. pulso de meiga (Simon) ----------
function simon(opts) {
  return new Promise(async (resolve) => {
    const SYM = ['★', '●', '▲', '■'], COL = ['#ffc107', '#2e9bff', '#4cbb3a', '#ff4d6d'];
    const n = 5;
    const seq = Array.from({ length: n }, () => Math.floor(Math.random() * 4));
    const ui = overlay(`🔮 ${opts.title}`, 'Memoriza los símbolos y repítelos en orden.');
    ui.area.innerHTML = `<div class="mg-show"></div><div class="mg-pad simon">${SYM.map((s, i) => `<button type="button" data-i="${i}" style="color:${COL[i]}">${s}</button>`).join('')}</div><div class="mg-msg">Mira…</div>`;
    const show = ui.area.querySelector('.mg-show'), msg = ui.area.querySelector('.mg-msg');
    const pad = [...ui.area.querySelectorAll('.mg-pad button')];
    pad.forEach(b => (b.disabled = true));
    for (const s of seq) { show.textContent = SYM[s]; show.style.color = COL[s]; beep(400 + s * 120, 120); await sleep(520); show.textContent = ''; await sleep(120); }
    msg.textContent = '¡Repite!'; pad.forEach(b => (b.disabled = false));
    let i = 0, done = false;
    const press = (k) => {
      if (done) return;
      if (k === seq[i]) { i++; beep(400 + k * 120, 90); if (i >= n) end(); }
      else { beep(180, 250); end(); }
    };
    pad.forEach(b => b.addEventListener('pointerdown', (e) => { e.preventDefault(); press(Number(b.dataset.i)); }));
    const kd = (e) => { const k = ['1', '2', '3', '4'].indexOf(e.key); if (k >= 0) press(k); };
    window.addEventListener('keydown', kd);
    const end = async () => { if (done) return; done = true; window.removeEventListener('keydown', kd); clear(); resolve(await finish(ui, i / n, `${i}/${n}`)); };
    const clear = countdown(ui, 6000, end);
  });
}

const GAMES = { mash, mash_duel: mash, timing, sequence, charge, rhythm, dodge, aim, roulette, simon };

export function playMinigame(kind, opts = {}) {
  const game = GAMES[kind];
  if (!game) return Promise.resolve(null);
  return game({ title: opts.title || '', cost: opts.cost || 0, duel: opts.duel });
}
export const MINIGAME_NAMES = {
  mash_duel: 'Guerra de clics', timing: 'Barra de tiempo', sequence: 'Secuencia', charge: 'Cargar y soltar',
  rhythm: 'Ritmo', aim: 'Puntería', roulette: 'Ruleta', simon: 'Memoria', dodge: 'Esquiva',
};
