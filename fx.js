// Animaciones de ataque por movimiento. Cada movimiento trae en la BBDD un `fx`:
//   {kind: projectile|volley|wave|drop|burst|aura|slash|beam|lunge, sprite, count, spin, arc, scale, shake, color}
// Los sprites son piezas de tipo 'effect' del banco de sprites, pintadas con el mismo compositor.

let F = { field: null, parts: {}, drawSprite: null };
const SCALE = 3;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const rnd = (a, b) => a + Math.random() * (b - a);

export function initFx(cfg) { F = { ...F, ...cfg }; }

function center(el) {
  const f = F.field.getBoundingClientRect(), r = el.getBoundingClientRect();
  return { x: r.left - f.left + r.width / 2, y: r.top - f.top + r.height / 2 };
}
function spriteEl(partId, scale = 1) {
  const part = F.parts[partId];
  const el = document.createElement('canvas');
  el.className = 'fxs';
  if (!part) { el.width = 8; el.height = 8; return el; }
  const size = Math.max(part.width, part.height);
  F.drawSprite(el, { size, palette: {}, layers: [{ part: partId, x: 0, y: 0 }] }, F.parts);
  el.style.width = (size * SCALE * scale) + 'px';
  el.style.height = (size * SCALE * scale) + 'px';
  F.field.appendChild(el);
  return el;
}
function place(el, x, y) { const w = el.offsetWidth, h = el.offsetHeight; el.style.left = (x - w / 2) + 'px'; el.style.top = (y - h / 2) + 'px'; }
// Nunca esperar más que la duración prevista: en pestañas en segundo plano las animaciones se congelan
async function run(el, frames, opts) {
  try {
    const a = el.animate(frames, { fill: 'forwards', ...opts });
    await Promise.race([a.finished, sleep((opts.duration || 500) + 250)]);
  } catch { /* cancelado */ }
}
function shake(strength = 8) {
  F.field.animate([
    { transform: 'translate(0,0)' }, { transform: `translate(${-strength}px, ${strength / 2}px)` }, { transform: `translate(${strength}px, ${-strength / 2}px)` },
    { transform: `translate(${-strength / 2}px, 0)` }, { transform: 'translate(0,0)' },
  ], { duration: 420, iterations: 1 });
}
async function impact(x, y, scale = 1) {
  const el = spriteEl('fx_impact', scale); place(el, x, y);
  await run(el, [{ transform: 'scale(.4)', opacity: 1 }, { transform: 'scale(1.3)', opacity: 1, offset: .5 }, { transform: 'scale(1.6)', opacity: 0 }], { duration: 320 });
  el.remove();
}
function glow(el, color) { if (color) el.style.filter = `drop-shadow(0 0 8px ${color})`; }

const KINDS = {
  async projectile(fx, from, to) {
    const el = spriteEl(fx.sprite, fx.scale || 1); glow(el, fx.color);
    place(el, from.x, from.y);
    const dx = to.x - from.x, dy = to.y - from.y;
    const flip = dx < 0 ? -1 : 1;
    const frames = fx.arc
      ? [{ transform: `translate(0,0) scaleX(${flip})` }, { transform: `translate(${dx / 2}px, ${dy / 2 - 90}px) scaleX(${flip}) rotate(${fx.spin ? 360 : 0}deg)`, offset: .5 }, { transform: `translate(${dx}px, ${dy}px) scaleX(${flip}) rotate(${fx.spin ? 720 : 0}deg)` }]
      : [{ transform: `translate(0,0) scaleX(${flip})` }, { transform: `translate(${dx}px, ${dy}px) scaleX(${flip}) rotate(${fx.spin ? 720 : 0}deg)` }];
    await run(el, frames, { duration: fx.arc ? 600 : 420, easing: fx.arc ? 'ease-in-out' : 'ease-in' });
    el.remove();
    await impact(to.x, to.y, fx.scale || 1);
  },
  async volley(fx, from, to) {
    const n = fx.count || 3, tasks = [];
    for (let i = 0; i < n; i++) {
      tasks.push((async () => {
        await sleep(i * 130);
        const el = spriteEl(fx.sprite, fx.scale || 1); glow(el, fx.color);
        const ox = rnd(-18, 18), oy = rnd(-24, 24);
        place(el, from.x + ox, from.y + oy);
        await run(el, [{ transform: 'translate(0,0)' }, { transform: `translate(${to.x - from.x}px, ${to.y - from.y}px) rotate(${rnd(-180, 180)}deg)` }], { duration: 380, easing: 'ease-in' });
        el.remove(); await impact(to.x + ox * 0.6, to.y + oy * 0.6, 0.7);
      })());
    }
    await Promise.all(tasks);
  },
  async wave(fx, from, to) {
    const el = spriteEl(fx.sprite, fx.scale || 1);
    const dir = to.x > from.x ? 1 : -1;
    place(el, from.x + dir * 40, from.y + 30);
    el.style.transform = `scaleX(${dir})`;
    await run(el, [
      { transform: `translate(0, 0) scaleX(${dir}) scaleY(.6)`, opacity: .2 },
      { transform: `translate(${(to.x - from.x) * 0.5}px, -10px) scaleX(${dir}) scaleY(1.1)`, opacity: 1, offset: .5 },
      { transform: `translate(${to.x - from.x}px, 0) scaleX(${dir}) scaleY(.9)`, opacity: 1 },
    ], { duration: 750, easing: 'ease-in-out' });
    if (fx.shake) shake(10);
    await impact(to.x, to.y, 1.3);
    await run(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 250 });
    el.remove();
  },
  async drop(fx, from, to) {
    const n = fx.count || 3, tasks = [];
    for (let i = 0; i < n; i++) {
      tasks.push((async () => {
        await sleep(i * 150);
        const el = spriteEl(fx.sprite, fx.scale || 1);
        const ox = n === 1 ? 0 : rnd(-40, 40);
        place(el, to.x + ox, -60);
        await run(el, [{ transform: 'translate(0,0) rotate(0)' }, { transform: `translate(0, ${to.y + 60}px) rotate(${fx.spin ? 180 : n === 1 ? 20 : 90}deg)` }], { duration: 520, easing: 'ease-in' });
        if (fx.shake) shake(6);
        el.remove(); await impact(to.x + ox, to.y + 10, 0.9);
      })());
    }
    await Promise.all(tasks);
  },
  async burst(fx, from, to) {
    const n = fx.count || 8, tasks = [];
    if (fx.shake) shake(8);
    for (let i = 0; i < n; i++) {
      tasks.push((async () => {
        await sleep(i * 40);
        const el = spriteEl(fx.sprite, fx.scale || 0.8); glow(el, fx.color);
        place(el, to.x, to.y);
        const a = rnd(0, Math.PI * 2), d = rnd(50, 120);
        await run(el, [{ transform: 'translate(0,0) scale(.5)', opacity: 1 }, { transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d}px) scale(1.1) rotate(${rnd(-90, 90)}deg)`, opacity: 0 }], { duration: 650, easing: 'ease-out' });
        el.remove();
      })());
    }
    await Promise.all(tasks);
  },
  async aura(fx, from) {
    const n = fx.count || 4, tasks = [];
    for (let i = 0; i < n; i++) {
      tasks.push((async () => {
        await sleep(i * 120);
        const el = spriteEl(fx.sprite, fx.scale || 1); glow(el, fx.color || '#fff');
        const a = (i / n) * Math.PI * 2 + rnd(-0.4, 0.4), r = rnd(50, 80);
        place(el, from.x + Math.cos(a) * r, from.y + Math.sin(a) * r * 0.7);
        await run(el, [{ transform: 'translateY(10px) scale(.6)', opacity: 0 }, { transform: 'translateY(-10px) scale(1)', opacity: 1, offset: .4 }, { transform: 'translateY(-40px) scale(.9)', opacity: 0 }], { duration: 900, easing: 'ease-out' });
        el.remove();
      })());
    }
    await Promise.all(tasks);
  },
  async slash(fx, from, to) {
    const el = spriteEl(fx.sprite, fx.scale || 1.4); glow(el, fx.color);
    place(el, to.x, to.y);
    await run(el, [{ transform: 'scale(.5) rotate(-20deg)', opacity: 0 }, { transform: 'scale(1.2) rotate(0)', opacity: 1, offset: .35 }, { transform: 'scale(1.3) rotate(5deg)', opacity: 0 }], { duration: 520 });
    el.remove();
  },
  async beam(fx, from, to) {
    const line = document.createElement('div'); line.className = 'fx-beam';
    const dx = to.x - from.x, dy = to.y - from.y, len = Math.hypot(dx, dy), ang = Math.atan2(dy, dx) * 180 / Math.PI;
    line.style.width = len + 'px'; line.style.left = from.x + 'px'; line.style.top = from.y + 'px';
    line.style.transform = `rotate(${ang}deg)`; line.style.background = fx.color || '#fff'; line.style.boxShadow = `0 0 12px ${fx.color || '#fff'}`;
    F.field.appendChild(line);
    const el = spriteEl(fx.sprite, fx.scale || 1.2); glow(el, fx.color); place(el, to.x, to.y - 30);
    await Promise.all([
      run(line, [{ opacity: 0, transform: `rotate(${ang}deg) scaleX(0)` }, { opacity: 1, transform: `rotate(${ang}deg) scaleX(1)`, offset: .3 }, { opacity: 0, transform: `rotate(${ang}deg) scaleX(1)` }], { duration: 600 }),
      run(el, [{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1.1)', opacity: 1, offset: .4 }, { transform: 'scale(1)', opacity: 0 }], { duration: 700 }),
    ]);
    line.remove(); el.remove();
  },
};

// Reproduce la animación de un movimiento. from/to: elementos (canvas) del atacante y del objetivo.
export async function playMoveFx(fx, fromEl, toEl) {
  if (!fx || !F.field || !KINDS[fx.kind]) return false;
  const from = center(fromEl), to = center(toEl);
  try { await KINDS[fx.kind](fx, from, to); } catch (e) { console.warn('fx', e); }
  return true;
}
