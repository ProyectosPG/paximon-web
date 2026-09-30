// «A Cata do Albariño»: el minijuego de las casetas de la Feria de Cambados. Tres pruebas:
//   1. Enche a cunca: mantén pulsado para servir y suelta en la raya (si te pasas, se derrama).
//   2. Onde está o albariño?: sigue la cunca buena mientras las mueven (trile).
//   3. ¡Saúde!: brinda justo cuando las cuncas se juntan.
// Cuanto más hayas bebido (drunk 0-5), más tiembla todo. Devuelve {score 0..1, parts, rating}.

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const clamp01 = (v) => Math.max(0, Math.min(1, v));
let audio = null;
function beep(freq = 660, ms = 90, vol = 0.07, type = 'square') {
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = type; o.frequency.value = freq; g.gain.value = vol;
    o.connect(g); g.connect(audio.destination);
    o.start(); o.stop(audio.currentTime + ms / 1000);
  } catch { /* sin audio */ }
}
function onPress(el, down, up) {
  const kd = (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); down(); } };
  const ku = (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); up?.(); } };
  const pd = (e) => { e.preventDefault(); down(); };
  const pu = () => up?.();
  window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
  el.addEventListener('pointerdown', pd); window.addEventListener('pointerup', pu);
  return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); el.removeEventListener('pointerdown', pd); window.removeEventListener('pointerup', pu); };
}

function drawCunca(ctx, cx, cy, level, spill, wob) {
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(wob);
  // cuerpo de la cunca (cuenco blanco con la raya azul)
  ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#2B2230'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-46, -20); ctx.quadraticCurveTo(-44, 34, 0, 36); ctx.quadraticCurveTo(44, 34, 46, -20); ctx.closePath(); ctx.fill();
  // vino
  if (level > 0) {
    const top = 34 - Math.min(1, level) * 54;
    ctx.save(); ctx.clip();
    ctx.fillStyle = '#F2E27A'; ctx.fillRect(-50, top, 100, 80);
    ctx.fillStyle = '#FFF4B0'; ctx.fillRect(-50, top, 100, 3);
    ctx.restore();
  }
  ctx.beginPath(); ctx.moveTo(-46, -20); ctx.quadraticCurveTo(-44, 34, 0, 36); ctx.quadraticCurveTo(44, 34, 46, -20); ctx.stroke();
  ctx.strokeStyle = '#2F6DB5'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-45, -12); ctx.quadraticCurveTo(0, -6, 45, -12); ctx.stroke();
  ctx.strokeStyle = '#2B2230'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, -20, 46, 6, 0, 0, Math.PI * 2); ctx.stroke();
  // raya objetivo (80-90 %)
  const y1 = 34 - 0.9 * 54, y0 = 34 - 0.78 * 54;
  ctx.fillStyle = 'rgba(76,187,58,.35)'; ctx.fillRect(-52, y1, 104, y0 - y1);
  ctx.strokeStyle = '#4CBB3A'; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(-54, y1); ctx.lineTo(54, y1); ctx.stroke(); ctx.setLineDash([]);
  if (spill) { ctx.fillStyle = '#F2E27A'; for (const x of [-52, 50]) { ctx.fillRect(x, -18, 4, 40); } ctx.beginPath(); ctx.ellipse(0, 42, 70, 6, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

// 1. Enche a cunca
function pour(ui, drunk) {
  return new Promise((resolve) => {
    ui.title.textContent = (ui.single ? '' : '1/3 · ') + 'Enche a cunca';
    ui.hint.textContent = 'Mantén pulsado (ratón o espacio) para servir el albariño y suelta en la franja verde. ¡Si te pasas, se derrama!';
    ui.area.innerHTML = '<canvas class="alb-cv" width="320" height="200"></canvas><div class="mg-msg">Mantén pulsado…</div>';
    const cv = ui.area.querySelector('canvas'), ctx = cv.getContext('2d'), msg = ui.area.querySelector('.mg-msg');
    let level = 0, holding = false, done = false, spill = false, t0 = 0, raf;
    const draw = (now) => {
      ctx.clearRect(0, 0, 320, 200);
      const wob = Math.sin(now / 260) * 0.02 * drunk;
      // botella
      ctx.save(); ctx.translate(160 + Math.sin(now / 300) * 3 * drunk, 34); ctx.rotate(holding ? 2.1 : 1.6);
      ctx.fillStyle = '#2E6B34'; ctx.fillRect(-12, -40, 24, 56); ctx.fillRect(-5, -58, 10, 20);
      ctx.fillStyle = '#F5F0E0'; ctx.fillRect(-12, -24, 24, 18); ctx.fillStyle = '#2F6DB5'; ctx.fillRect(-12, -18, 24, 4);
      ctx.fillStyle = '#E0B43A'; ctx.fillRect(-5, -62, 10, 5);
      ctx.restore();
      if (holding && !done) { ctx.fillStyle = '#F2E27A'; ctx.fillRect(152 + Math.sin(now / 90) * 2 * drunk, 58, 5, 150 - 58 - Math.min(1, level) * 54 + 6); }
      drawCunca(ctx, 160, 150, level, spill, wob);
      if (!done) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    const tick = setInterval(() => {
      if (!holding || done) return;
      const t = (performance.now() - t0) / 1000;
      level += (0.006 + t * 0.012 + Math.random() * 0.004 * drunk) * (1 + drunk * 0.15);
      if (level > 1.02) { spill = true; stop(); }
    }, 30);
    const stop = () => {
      if (done) return; done = true; holding = false; off(); clearInterval(tick); clearTimeout(limit);
      const s = spill ? 0 : clamp01(1 - Math.abs(level - 0.84) / 0.3);
      msg.textContent = spill ? '¡Derramaches! Mira a mesa…' : s >= 0.85 ? '¡Cheíña, perfecta!' : level < 0.6 ? 'Iso é unha cunca ou un chupito?' : 'Non está mal.';
      beep(spill ? 160 : 500 + s * 500, 160);
      setTimeout(() => { cancelAnimationFrame(raf); resolve(s); }, 1100);
    };
    const off = onPress(ui.area, () => { if (done || holding) return; holding = true; t0 = performance.now(); msg.textContent = 'Glu, glu, glu…'; }, () => { if (holding) stop(); });
    const limit = setTimeout(() => { if (!done) { spill = level > 1; stop(); } }, 9000);
  });
}

// 2. Onde está o albariño? (trile de cuncas)
async function shell(ui, drunk) {
  ui.title.textContent = (ui.single ? '' : '2/3 · ') + 'Onde está o albariño?';
  ui.hint.textContent = 'Fíjate en la cunca de albariño. Las taparán y las moverán: después, elige la buena.';
  ui.area.innerHTML = '<div class="alb-cups"></div><div class="mg-msg">Mira ben…</div>';
  const box = ui.area.querySelector('.alb-cups'), msg = ui.area.querySelector('.mg-msg');
  const kinds = ['albarino', 'auga', 'tinto'];
  const cups = kinds.map((k) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'alb-cup ' + k; b.innerHTML = '<i></i><span class="lid"></span>'; box.appendChild(b); return { el: b, kind: k }; });
  const slots = [0, 1, 2];
  const place = () => cups.forEach((c, i) => { c.el.style.left = `calc(${slots[i] * 33.3 + 16.6}% - 34px)`; });
  place();
  await sleep(1500);
  cups.forEach(c => c.el.classList.add('covered'));
  await sleep(500);
  const swaps = 5 + drunk * 2, dur = Math.max(170, 420 - drunk * 45);
  cups.forEach(c => (c.el.style.transitionDuration = dur + 'ms'));
  for (let i = 0; i < swaps; i++) {
    const a = Math.floor(Math.random() * 3), b = (a + 1 + Math.floor(Math.random() * 2)) % 3;
    [slots[a], slots[b]] = [slots[b], slots[a]];
    place(); beep(300 + i * 20, 40, 0.04);
    await sleep(dur + 40);
  }
  msg.textContent = '¿Cal é a do albariño?';
  return new Promise((resolve) => {
    cups.forEach((c) => c.el.addEventListener('click', () => {
      cups.forEach(x => x.el.classList.remove('covered'));
      const ok = c.kind === 'albarino';
      c.el.classList.add(ok ? 'win' : 'lose');
      msg.textContent = ok ? '¡Esa é! Tes bo nariz.' : c.kind === 'tinto' ? '¿Tinto? ¡Na feria do albariño! Que vergonza…' : 'Auga. Auga do grifo. Moi triste.';
      beep(ok ? 880 : 180, 200);
      setTimeout(() => resolve(ok ? 1 : 0), 1300);
    }, { once: true }));
  });
}

// 3. ¡Saúde! (brindis en el momento justo)
function toast(ui, drunk) {
  return new Promise((resolve) => {
    ui.title.textContent = (ui.single ? '' : '3/3 · ') + '¡Saúde!';
    ui.hint.textContent = 'Pulsa justo cuando las dos cuncas se junten en el centro.';
    ui.area.innerHTML = '<div class="alb-toast"><span class="l">🥣</span><span class="r">🥣</span></div><div class="mg-msg"></div>';
    const l = ui.area.querySelector('.l'), r = ui.area.querySelector('.r'), msg = ui.area.querySelector('.mg-msg');
    const t0 = performance.now(), period = 1500 - drunk * 90;
    let done = false, raf, gap = 1;
    const tick = (now) => {
      const ph = ((now - t0) / period) * Math.PI * 2;
      gap = Math.abs(Math.sin(ph)) + (drunk ? Math.sin(now / 97) * 0.04 * drunk : 0);
      l.style.transform = `translateX(${-gap * 120}px) rotate(${-gap * 20}deg)`;
      r.style.transform = `translateX(${gap * 120}px) rotate(${gap * 20}deg) scaleX(-1)`;
      if (!done) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const off = onPress(ui.area, () => {
      if (done) return; done = true; off(); clearTimeout(limit); cancelAnimationFrame(raf);
      const s = clamp01(1 - gap / 0.35);
      msg.textContent = s >= 0.8 ? '¡CLINC! ¡SAÚDE!' : s > 0.3 ? 'Clinc… más ou menos.' : '¡Brindaches co aire!';
      beep(s >= 0.8 ? 1320 : 400, 220, 0.06, 'triangle');
      setTimeout(() => resolve(s), 1000);
    });
    const limit = setTimeout(() => { if (!done) { done = true; off(); cancelAnimationFrame(raf); resolve(0); } }, 8000);
  });
}

function openCata(caseta, drunk) {
  let root = document.getElementById('mg');
  if (!root) { root = document.createElement('div'); root.id = 'mg'; document.body.appendChild(root); }
  root.innerHTML = `<div class="mg-panel alb">
    <div class="alb-head">🍷 A Cata do Albariño · <b></b></div>
    <div class="mg-title"></div><div class="mg-hint"></div><div class="mg-area"></div>
    <div class="mg-foot"><div class="mg-timer"></div><div class="mg-score"></div></div></div>`;
  root.hidden = false;
  root.querySelector('.alb-head b').textContent = caseta;
  const ui = { area: root.querySelector('.mg-area'), title: root.querySelector('.mg-title'), hint: root.querySelector('.mg-hint'), score: root.querySelector('.mg-score') };
  const panel = root.querySelector('.mg-panel');
  panel.style.setProperty('--sway', String(drunk));
  return { root, ui, panel };
}

export async function playAlbarino({ caseta = 'Adega', drunk = 0 } = {}) {
  const { root, ui, panel } = openCata(caseta, drunk);
  const parts = [];
  try {
    parts.push(await pour(ui, drunk)); ui.score.textContent = `${Math.round(parts[0] * 100)} %`;
    parts.push(await shell(ui, drunk)); ui.score.textContent = `${Math.round((parts[0] + parts[1]) / 2 * 100)} %`;
    parts.push(await toast(ui, drunk));
  } catch (e) { console.warn(e); }
  while (parts.length < 3) parts.push(0);
  const score = parts.reduce((a, b) => a + b, 0) / 3;
  const rating = score >= 0.85 ? '¡Sumiller de honra! O albariño está orgulloso de ti.'
    : score >= 0.6 ? 'Catador afeccionado. Nada mal.'
      : score >= 0.35 ? 'Bebes con entusiasmo, iso si.'
        : 'Isto era auga? Non sabes nin onde tes a boca.';
  ui.title.textContent = 'Resultado da cata';
  ui.hint.textContent = '';
  ui.area.innerHTML = `<div class="alb-result"><div class="big">${Math.round(score * 100)} %</div><div>${rating}</div></div>`;
  panel.classList.add(score >= 0.85 ? 'great' : score >= 0.5 ? 'ok' : 'bad');
  await sleep(2200);
  root.hidden = true; root.innerHTML = '';
  return { score, parts, rating };
}

// Una sola prueba de la cata (para usarla dentro de un combate). kind: 'pour' | 'shell' | 'toast'
// o null (al azar). Mismo overlay; enseña la nota ~900 ms, cierra y devuelve la puntuación 0..1.
// Límite duro de 25 s por si nadie elige cunca en el trile (o la pestaña está en segundo plano).
const CATA_ROUNDS = { pour, shell, toast };
export async function playCataRound({ drunk = 0, kind = null, caseta = 'Cata' } = {}) {
  const game = CATA_ROUNDS[kind] || CATA_ROUNDS[['pour', 'shell', 'toast'][Math.floor(Math.random() * 3)]];
  let root = null, hard = 0, score = 0;
  try {
    const cata = openCata(caseta, drunk);
    root = cata.root;
    cata.ui.single = true;
    const limit = new Promise((r) => { hard = setTimeout(() => r(0), 25000); });
    score = clamp01(Number(await Promise.race([game(cata.ui, drunk), limit])) || 0);
    cata.ui.score.textContent = `${Math.round(score * 100)} %`;
    cata.panel.classList.add(score >= 0.85 ? 'great' : score >= 0.5 ? 'ok' : 'bad');
    await sleep(900);
  } catch (e) {
    console.warn(e);
  } finally {
    clearTimeout(hard);
    if (root) { root.hidden = true; root.innerHTML = ''; }
  }
  return score;
}
