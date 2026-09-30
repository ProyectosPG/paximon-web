// Arte de las oficinas y sitios raros de la aventura (sede de Páxinas Galegas, mansión, zona 404,
// centro de datos, tren y la guarida de O Algoritmo). Mismo sistema que townart.js y worldart.js:
// todo pintado por código a 16 px por casilla y renderizable en Node
// (tools/town/officeart-preview.mjs). worldart.js junta estas casillas y objetos con los suyos.
import { Pix, T, hash, rng, OUT, WOOD, star } from './townart.js';
import { mix, shade } from './avatar.js';
// ojo: importación circular con worldart.js; text/textW solo se usan al pintar, nunca al cargar
import { text, textW } from './worldart.js';

// ---------- paletas ----------
const METAL = { base: '#9EA5AE', light: '#C6CCD3', top: '#DDE2E7', dark: '#747C86', deep: '#555C66' };
const PLAST = { base: '#E6E3DA', light: '#F7F6F1', dark: '#C2BDB1', deep: '#99938A' };
const DESK = { top: '#DDB77F', light: '#F0D2A0', front: '#B4834C', dark: '#8A5E33', deep: '#6B4526' };
const MAHOG = { top: '#7E452A', light: '#A0603C', front: '#5E301C', dark: '#46220F', deep: '#331708' };
const SCR = { base: '#4F97D0', light: '#8ACBF0', dark: '#2F6FA8', glare: '#DDF4FF' };
const DARK = { base: '#3A3A46', light: '#585866', dark: '#26262E' };
const CHAIR = { base: '#44506C', light: '#62729A', dark: '#2F384E' };
const LEATHER = { base: '#35303C', light: '#524A5C', dark: '#1F1B25', hi: '#7A7088' };   // sillón negro del jefe
const PAPER = { base: '#F7F5EF', shade: '#DCD7CB', line: '#A8A398' };
const GUIDE = { base: '#F4C400', light: '#FFE066', dark: '#C99700', band: '#2B2B2B' };
const CORK = { base: '#C9955B', light: '#DDB07A', dark: '#B07E47' };
const GOLD = { base: '#D9A83A', light: '#F2D27A', dark: '#9C7420' };
const BINDERS = ['#C62828', '#1565C0', '#2E7D32', '#F9A825', '#6A1B9A', '#37474F', '#EF6C00', '#00838F'];
const DATA = ['#4C8DFF', '#FF5A4E', '#FFC928', '#3CC46A'];   // los cuatro colores del Algoritmo

// ---------- utilidades ----------
function box(p, x, y, w, h, c, lt = shade(c, 0.2), dk = shade(c, -0.22)) {
  p.rect(x, y, w, h, c);
  p.hline(x, x + w - 1, y, lt); p.vline(x, y, y + h - 1, lt);
  p.hline(x, x + w - 1, y + h - 1, dk); p.vline(x + w - 1, y + 1, y + h - 1, dk);
}
function line(p, x0, y0, x1, y1, c) {
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    p.px(x0, y0, c);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}
// copia otro Pix encima (respeta el desplazamiento del destino)
function stamp(dst, src, x0, y0) {
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) { const c = src.d[y * src.w + x]; if (c) dst.px(x0 + x, y0 + y, c); }
}
// halo de luz: solo en píxeles vacíos (se pinta después del contorno)
function glow(p, cx, cy, rx, ry, c) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1 && !p.get(x, y)) p.px(x, y, c);
    }
}
function sparkle(p, x, y, c = '#FFF3B0', core = '#FFFFFF', r = 2) {
  for (let i = 1; i <= r; i++) { p.px(x - i, y, c); p.px(x + i, y, c); p.px(x, y - i, c); p.px(x, y + i, c); }
  p.px(x, y, core);
}
// texto de 3x5 ampliado (k = 2: letras de 6x10)
function bigText(p, x, y, s, c, k = 2) {
  const t = new Pix(textW(s) + 1, 5);
  text(t, 0, 0, s, c);
  for (let j = 0; j < t.h; j++) for (let i = 0; i < t.w; i++) { const v = t.d[j * t.w + i]; if (v) p.rect(x + i * k, y + j * k, k, k, v); }
}
function stampRowsPal(p, x, y, rows, pal) {
  rows.forEach((row, j) => [...row].forEach((ch, i) => { if (pal[ch]) p.px(x + i, y + j, pal[ch]); }));
}
const lum = (c) => { const n = parseInt(c.slice(1, 7), 16); return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };

// ---------- casillas ----------
const CARPET = { base: '#76839A', light: '#8491A7', mid: '#7C89A0', dark: '#6C798F', fleck: '#949FB2' };
const RED = { base: '#A5303A', light: '#B8434C', dark: '#8E2731', edge: '#621820', gold: '#E2B53E' };
const PARQ = ['#B7773F', '#C4854A', '#AD6F3A', '#BE7F45'].map(c => ({ c, l: shade(c, 0.16), d: shade(c, -0.18) }));
const PARQ_GAP = '#6E4221';
const NEON = { m: '#FF3EA5', c: '#3EE6FF', base: '#15111D', scan: '#1A1524', grid: '#2C2342', hi: '#221B31', dim: '#4A2446' };
const RAISED = { base: '#A4AAB2', light: '#C6CBD1', dark: '#858C95', seam: '#5F656E', hole: '#666C75', inner: '#979EA7' };
const RUBBER = { base: '#3B3E46', stud: '#4B4E57', studD: '#2E3037', strip: '#666B76', stripL: '#7C818C', stripD: '#555A64', edge: '#23252B' };
const STEP = { base: '#AEA79B', light: '#D2CCC1', dark: '#7F786D', wall: '#6E675C', wallL: '#8E877B', void: '#110D17' };

export const OFFICE_TILES = {
  // moqueta de oficina: rizo con una trama de puntitos muy suave
  carpet(p, X, Y) {
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const gx = X + x, gy = Y + y, a = gx % 4, b = gy % 4;
      let c = a === 0 && b === 0 ? CARPET.light : a === 2 && b === 2 ? CARPET.dark : (a === 1 && b === 3) || (a === 3 && b === 1) ? CARPET.mid : CARPET.base;
      if (hash(gx, gy, 17) % 47 === 0) c = CARPET.fleck;
      p.px(gx, gy, c);
    }
  },
  // alfombra roja con ribete dorado donde acaba
  carpet_red(p, X, Y, h, n) {
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const gx = X + x, gy = Y + y;
      let c = (gx + gy * 2) % 6 === 0 ? RED.dark : RED.base;
      if (hash(gx, gy, 23) % 43 === 0) c = RED.light;
      p.px(gx, gy, c);
    }
    const e = (t) => t !== 'carpet_red', u = e(n.u), d = e(n.d), l = e(n.l), r = e(n.r);
    const x0 = X + (l ? 2 : 0), x1 = X + 15 - (r ? 2 : 0), y0 = Y + (u ? 2 : 0), y1 = Y + 15 - (d ? 2 : 0);
    if (u) p.hline(x0, x1, Y + 2, RED.gold);
    if (d) p.hline(x0, x1, Y + 13, RED.gold);
    if (l) p.vline(X + 2, y0, y1, RED.gold);
    if (r) p.vline(X + 13, y0, y1, RED.gold);
    if (u) { p.hline(X, X + 15, Y, RED.edge); p.hline(x0, x1, Y + 1, RED.dark); }
    if (d) { p.hline(X, X + 15, Y + 15, RED.edge); p.hline(x0, x1, Y + 14, RED.dark); }
    if (l) { p.vline(X, Y, Y + 15, RED.edge); p.vline(X + 1, y0, y1, RED.dark); }
    if (r) { p.vline(X + 15, Y, Y + 15, RED.edge); p.vline(X + 14, y0, y1, RED.dark); }
  },
  // parqué en espiga (tablillas de 8x4 que alternan), para la mansión
  parquet(p, X, Y) {
    const U = 4;
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const gx = X + x, gy = Y + y, ux = Math.floor(gx / U), uy = Math.floor(gy / U), lx = gx % U, ly = gy % U;
      const k = (((ux - uy) % 4) + 4) % 4;
      let pal, across, along;
      if (k < 2) { pal = PARQ[hash(ux - k, uy, 31) % 4]; across = ly; along = k * U + lx; }
      else { pal = PARQ[hash(ux, k === 3 ? uy : uy - 1, 37) % 4]; across = lx; along = (k === 3 ? 0 : U) + ly; }
      let c = pal.c;
      if (across === U - 1 || along === 2 * U - 1) c = PARQ_GAP;
      else if (across === 0) c = pal.l;
      else if (along === 2 * U - 2 || hash(gx, gy, 3) % 19 === 0) c = pal.d;
      p.px(gx, gy, c);
    }
  },
  // suelo de la zona 404: oscuro, con el error en neón que parpadea
  tile404(p, X, Y, h, n, frame = 0) {
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      let c = y % 2 ? NEON.scan : NEON.base;
      if (x === 15 || y === 15) c = NEON.grid; else if (x === 0 || y === 0) c = NEON.hi;
      p.px(X + x, Y + y, c);
    }
    const tx = X + 3, ty = Y + 5, off = frame ? -1 : 1;
    if (frame && h % 4 === 0) text(p, tx, ty, '404', NEON.dim);
    else {
      text(p, tx + off, ty, '404', frame ? NEON.m : NEON.c);
      text(p, tx, ty, '404', frame ? NEON.c : NEON.m);
      // una franja del texto desplazada (glitch)
      if ((h >> 3) % 3 === frame) { const gy = ty + 1 + ((h >> 5) % 3); for (let x = 14; x >= 1; x--) { const c = p.get(X + x - 2, gy); if (c === NEON.m || c === NEON.c) p.px(X + x, gy, c); } }
    }
    const r = rng(h + frame * 977);
    for (let k = 0; k < 2; k++) {
      if (r() < 0.45) continue;
      const gy = Y + 1 + Math.floor(r() * 14), gx = X + 1 + Math.floor(r() * 9), len = 2 + Math.floor(r() * 4);
      if (gy >= ty && gy < ty + 5) continue;
      p.hline(gx, gx + len, gy, r() < 0.5 ? NEON.m : NEON.c);
    }
  },
  // suelo técnico del centro de datos: placas con rejilla de ventilación
  server_floor(p, X, Y) {
    p.rect(X, Y, T, T, RAISED.base);
    p.hline(X, X + 15, Y, RAISED.light); p.vline(X, Y, Y + 15, RAISED.light);
    p.hline(X + 1, X + 14, Y + 14, RAISED.dark); p.vline(X + 14, Y + 1, Y + 14, RAISED.dark);
    p.hline(X, X + 15, Y + 15, RAISED.seam); p.vline(X + 15, Y, Y + 15, RAISED.seam);
    if (hash(X >> 4, Y >> 4, 41) % 5 < 2) {
      p.rect(X + 3, Y + 3, 10, 10, RAISED.inner);
      p.hline(X + 3, X + 12, Y + 3, RAISED.dark); p.vline(X + 3, Y + 3, Y + 12, RAISED.dark);
      for (let y = Y + 5; y < Y + 12; y += 2) for (let x = X + 5; x < X + 12; x += 2) { p.px(x, y, RAISED.seam); p.px(x + 1, y + 1, RAISED.light); }
    } else {
      for (const [x, y] of [[2, 2], [13, 2], [2, 13], [13, 13]]) { p.px(X + x, Y + y, RAISED.hole); p.px(X + x - 1, Y + y - 1, RAISED.light); }
    }
  },
  // pasillo del tren: goma oscura con tacos y una franja central más clara
  train_floor(p, X, Y, h, n) {
    const tf = (t) => t === 'train_floor', u = tf(n.u), d = tf(n.d);
    const [s0, s1] = !u && !d ? [5, 10] : !u ? [11, 15] : !d ? [0, 4] : [0, 15];
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const gx = X + x, gy = Y + y;
      let c;
      if (y >= s0 && y <= s1) c = (gx + gy) % 4 === 0 ? RUBBER.stripD : RUBBER.strip;
      else c = gx % 4 === 1 && gy % 4 === 1 ? RUBBER.stud : gx % 4 === 2 && gy % 4 === 2 ? RUBBER.studD : RUBBER.base;
      p.px(gx, gy, c);
    }
    if (!u) p.hline(X, X + 15, Y + s0, RUBBER.stripL);
    if (!d) p.hline(X, X + 15, Y + s1, RUBBER.stripD);
    if (!u) p.hline(X, X + 15, Y, RUBBER.edge);
    if (!d) p.hline(X, X + 15, Y + 15, RUBBER.edge);
  },
  // escaleras que bajan hacia arriba (norte) y se pierden en la oscuridad; en tramos largos
  // la penumbra sigue seguida: abajo del todo 0, entre casillas 0.42, arriba del todo negro
  stairs(p, X, Y, h, n) {
    const st = (t) => t === 'stairs', far = st(n.d), open = !st(n.u);
    const d0 = far ? 0.42 : 0, d1 = open ? 1 : 0.42;
    for (let y = 0; y < T; y++) {
      let depth = d0 + (d1 - d0) * (1 - (y + 0.5) / 16);
      if (open && y < 2) depth = 1;
      const k = y % 4;
      const c = mix(k === 0 ? STEP.light : k === 3 ? STEP.dark : STEP.base, STEP.void, Math.min(1, depth));
      p.hline(X, X + 15, Y + y, c);
      const wc = mix(STEP.wall, STEP.void, Math.min(1, depth + 0.1)), wl = mix(STEP.wallL, STEP.void, Math.min(1, depth));
      if (!st(n.l)) { p.px(X, Y + y, wl); p.px(X + 1, Y + y, wc); p.px(X + 2, Y + y, mix(wc, STEP.void, 0.3)); }
      if (!st(n.r)) { p.px(X + 15, Y + y, mix(wc, STEP.void, 0.35)); p.px(X + 14, Y + y, wc); p.px(X + 13, Y + y, mix(wc, STEP.void, 0.3)); }
    }
    if (!st(n.d)) p.hline(X, X + 15, Y + 15, STEP.light);
  },
};
// ninguna de estas casillas bloquea el paso
export const OFFICE_SOLID = new Set();

// ---------- mesas de oficina ----------
function monitor(p, x, y, w, h, kind = 'win') {
  p.rect(x, y, w, h, DARK.base);
  p.hline(x, x + w - 1, y, DARK.light); p.vline(x, y, y + h - 1, DARK.light);
  p.vline(x + w - 1, y + 1, y + h - 1, DARK.dark); p.hline(x, x + w - 1, y + h - 1, DARK.dark);
  const sx = x + 1, sy = y + 1, sw = w - 2, sh = h - 3;
  p.rect(sx, sy, sw, sh, SCR.base); p.hline(sx, sx + sw - 1, sy + sh - 1, SCR.dark);
  if (kind === 'win') {
    p.rect(sx + 2, sy + 1, sw - 4, sh - 2, '#FFFFFF'); p.hline(sx + 2, sx + sw - 3, sy + 1, SCR.dark);
    for (let yy = sy + 3, k = 0; yy < sy + sh - 1; yy += 2, k++) p.hline(sx + 3, sx + 3 + Math.max(1, (sw - 7) - ((k * 3) % 4)), yy, '#9AA6B4');
  } else if (kind === 'chart') {
    p.rect(sx + 1, sy + 1, sw - 2, sh - 2, '#FFFFFF');
    const bars = [3, 5, 4, 7, 6, 8];
    for (let i = 0; i < bars.length && sx + 3 + i * 3 < sx + sw - 2; i++) p.rect(sx + 3 + i * 3, sy + sh - 2 - bars[i], 2, bars[i], i === bars.length - 1 ? '#3CC46A' : SCR.base);
  }
  p.px(sx, sy, SCR.glare); p.px(sx + 1, sy, SCR.glare); p.px(sx, sy + 1, SCR.glare);
  p.px(x + w - 3, y + h - 2, '#6BE38A');
  const cx = x + Math.floor(w / 2);
  p.rect(cx - 1, y + h, 2, 2, DARK.dark); p.hline(cx - 3, cx + 2, y + h + 2, DARK.base);
}
function keyboard(p, x, y, w) {
  p.rect(x, y, w, 3, PLAST.base); p.hline(x, x + w - 1, y, PLAST.light); p.hline(x, x + w - 1, y + 2, PLAST.dark);
  for (let i = x + 1; i < x + w - 1; i += 2) p.px(i, y + 1, PLAST.deep);
}
function mug(p, x, y, c = '#FFFFFF') {
  p.rect(x, y, 3, 4, c); p.vline(x + 2, y + 1, y + 3, shade(c, -0.15)); p.px(x + 3, y + 1, c); p.px(x + 3, y + 2, c);
  p.hline(x, x + 1, y, '#6D3B1F');
}
function paperPile(p, x, y, w, n, seed = 1, folders = true) {
  // y = fila de abajo; crece hacia arriba
  const r = rng(seed);
  let yy = y;
  for (let k = 0; k < n; k++) {
    const dx = Math.floor(r() * 3) - 1, fol = folders && r() < 0.3;
    const c = fol ? ['#E8C878', '#D9534F', '#5C8BD6', '#7CB86B'][Math.floor(r() * 4)] : PAPER.base;
    p.hline(x + dx, x + w - 1 + dx, yy, c); p.hline(x + dx, x + w - 1 + dx, yy - 1, fol ? shade(c, 0.2) : PAPER.shade);
    yy -= 2;
  }
  p.rect(x, yy - 1, w, 3, PAPER.base); p.hline(x, x + w - 1, yy - 1, '#FFFFFF');
  p.hline(x + 1, x + w - 3, yy, PAPER.line);
  return yy - 1;
}
// guía amarilla de Páxinas Galegas tumbada (x, y = esquina de arriba a la izquierda)
function guideFlat(p, x, y, w, h = 6) {
  p.rect(x, y, w, h - 2, GUIDE.base); p.hline(x, x + w - 1, y, GUIDE.light); p.vline(x, y, y + h - 3, GUIDE.light);
  p.hline(x + 1, x + w - 2, y + 2, GUIDE.band); p.px(x + w - 3, y + 1, '#FFFFFF');
  p.hline(x, x + w - 1, y + h - 2, PAPER.base); p.hline(x, x + w - 1, y + h - 1, PAPER.shade);
  for (let i = x + 1; i < x + w - 1; i += 3) p.px(i, y + h - 1, PAPER.line);
}
function deskBody(p, W, D, drawers = true) {
  p.rect(0, -5, W, 7, D.top); p.hline(0, W - 1, -5, D.light); p.hline(0, W - 1, 1, shade(D.top, -0.08));
  p.rect(0, 2, W, 9, D.front); p.hline(0, W - 1, 2, D.dark); p.hline(0, W - 1, 10, D.dark);
  for (let x = 12; x < W - 5; x += 6) p.vline(x, 4, 9, shade(D.front, -0.08));
  if (drawers) {
    p.rect(1, 2, 9, 14, D.front); p.vline(1, 3, 15, shade(D.front, 0.14)); p.vline(9, 3, 15, D.dark);
    for (const y of [2, 7, 12]) p.hline(1, 9, y, D.dark);
    for (const y of [4, 9, 14]) p.hline(4, 6, y, D.light);
  } else { p.rect(1, 2, 3, 14, D.front); p.vline(1, 3, 15, shade(D.front, 0.14)); p.vline(3, 3, 15, D.dark); }
  p.rect(27, 2, 4, 14, D.front); p.vline(27, 3, 15, shade(D.front, 0.14)); p.vline(30, 3, 15, D.dark);
}
// silla de oficina vista por detrás; yb = fila del suelo
function chairBack(p, cx, yb = 15, boss = false) {
  const C = boss ? LEATHER : CHAIR, w = boss ? 14 : 10, x = cx - w / 2, y0 = yb - (boss ? 15 : 11), y1 = yb - 4;
  p.rect(x, y0 + 1, w, y1 - y0, C.base); p.hline(x + 1, x + w - 2, y0, C.light);
  p.hline(x, x + w - 1, y0 + 1, C.light); p.vline(x, y0 + 1, y1, C.light);
  p.vline(x + w - 1, y0 + 1, y1, C.dark); p.hline(x, x + w - 1, y1, C.dark);
  if (boss) { for (let yy = y0 + 3; yy < y1 - 1; yy += 3) for (let xx = x + 2 + ((yy - y0) % 2) * 2; xx < x + w - 2; xx += 4) p.px(xx, yy, C.dark); p.px(x + 2, y0 + 1, C.hi); }
  else p.hline(x + 2, x + w - 3, y0 + 3, shade(C.base, -0.12));
  p.rect(cx - 1, y1 + 1, 2, 2, DARK.base);
  p.hline(cx - 5, cx + 4, yb - 1, DARK.base);
  for (const wx of [cx - 5, cx - 1, cx + 3]) p.rect(wx, yb, 2, 1, DARK.dark);
}
function desk(o = {}) {
  const v = o.variant || 'pc', boss = v === 'boss', D = boss ? MAHOG : DESK;
  const W = 32, top = 20, p = new Pix(W, T + top); p.oy = top;
  deskBody(p, W, D);
  let after = null;
  switch (v) {
    case 'phone': { // teléfono de mesa con cable rizado y cascos
      monitor(p, 12, -16, 13, 11); keyboard(p, 13, -2, 11);
      box(p, 3, -4, 8, 5, DARK.base, DARK.light, DARK.dark);
      p.rect(4, -3, 3, 1, '#9FC7A8'); for (const [bx, by] of [[8, -3], [9, -2], [8, -1], [9, -3], [8, -2], [9, -1]]) p.px(bx, by, (bx + by) % 2 ? PLAST.base : PLAST.dark);
      p.rect(3, -7, 8, 2, DARK.base); p.rect(2, -8, 3, 3, DARK.base); p.rect(9, -8, 3, 3, DARK.base);
      p.hline(3, 10, -7, DARK.light); p.px(2, -8, DARK.light); p.px(9, -8, DARK.light);
      for (let y = -5; y <= 7; y++) p.px(y % 2 ? 0 : 1, y, y % 2 ? DARK.light : DARK.dark);
      p.px(1, 8, DARK.dark); p.px(2, 8, DARK.light);
      // cascos con micro, de pie sobre la mesa
      const HS = '#4A4A58';
      p.hline(27, 29, -12, HS); p.px(26, -11, HS); p.px(30, -11, HS); p.hline(27, 29, -11, '#6A6A7A');
      p.rect(25, -10, 3, 5, DARK.dark); p.rect(29, -10, 3, 5, DARK.dark);
      p.vline(25, -9, -7, '#E53935'); p.vline(31, -9, -7, '#E53935');
      p.px(26, -10, DARK.light); p.px(30, -10, DARK.light);
      line(p, 27, -6, 29, -4, HS); p.rect(29, -4, 2, 2, DARK.dark);
      break;
    }
    case 'papers': { // montañas de papel y la guía amarilla
      paperPile(p, 2, 0, 8, 6, 3);
      guideFlat(p, 11, -3, 11, 6); guideFlat(p, 12, -8, 9, 6);
      paperPile(p, 23, 0, 7, 4, 8);
      p.rect(26, -12, 3, 4, '#FFF59D'); p.hline(26, 28, -12, '#FFF9C4');
      break;
    }
    case 'boss': { // monitor grande, placa con el nombre y bolígrafos
      monitor(p, 6, -19, 20, 14, 'chart'); keyboard(p, 10, -2, 12);
      p.rect(1, -2, 8, 3, GOLD.base); p.hline(1, 8, -2, GOLD.light); p.hline(2, 7, -1, '#3A2A20'); p.hline(1, 8, 0, GOLD.dark);
      p.rect(25, -5, 4, 5, '#2E2E36'); p.hline(25, 28, -5, DARK.light);
      p.vline(25, -8, -6, '#E53935'); p.vline(27, -9, -6, '#1E88E5'); p.vline(28, -7, -6, GOLD.light);
      break;
    }
    case 'calc': { // calculadora con su tira de papel y el pincho de los tickets
      monitor(p, 16, -16, 14, 11); keyboard(p, 17, -2, 12);
      box(p, 2, -4, 9, 5, '#6F737A', '#8E939A', '#4E5258');
      p.rect(3, -3, 7, 1, '#B8D8A0');
      for (let bx = 3; bx < 10; bx += 2) p.px(bx, -1, bx === 9 ? '#EF6C00' : '#E8E8E0');
      p.rect(4, -12, 3, 8, PAPER.base); p.vline(6, -12, -5, PAPER.shade);
      for (let yy = -11; yy < -5; yy += 2) p.hline(4, 5, yy, PAPER.line);
      p.hline(3, 5, -13, PAPER.base); p.px(3, -12, PAPER.shade);
      p.vline(13, -10, 0, '#8E939A'); p.hline(11, 15, 1, '#4E5258');
      p.rect(11, -8, 5, 2, PAPER.base); p.rect(11, -5, 5, 2, '#FFF3C4'); p.rect(12, -3, 4, 2, PAPER.base);
      p.px(13, -8, '#8E939A'); p.px(13, -5, '#8E939A');
      break;
    }
    case 'redphone': { // el teléfono rojo: viejo, enorme y muy importante
      const R = { base: '#D32F2F', light: '#FF6F60', dark: '#9A1B1B', top: '#E8483E' };
      for (let y = -8; y <= 1; y++) {
        const g = Math.floor((y + 8) / 3), x0 = 9 - g, x1 = 22 + g;
        p.hline(x0, x1, y, y < -5 ? R.top : y === 1 ? R.dark : R.base);
        p.px(x0, y, R.light); p.px(x1, y, R.dark);
      }
      p.hline(9, 22, -8, R.light);
      p.ellipse(15.5, -2, 3.6, 3.2, '#F4F0E6');
      for (let a = 0; a < 8; a++) { const t = -Math.PI * 0.9 + a * Math.PI * 0.23; p.px(Math.round(15 + Math.cos(t) * 2.4), Math.round(-2.5 + Math.sin(t) * 2.2), '#5A4A40'); }
      p.px(15, -3, R.base); p.px(16, -2, R.base);
      p.rect(10, -9, 2, 2, R.dark); p.rect(20, -9, 2, 2, R.dark);
      p.rect(11, -11, 10, 2, R.base); p.hline(11, 20, -11, R.light);
      p.rect(6, -13, 6, 4, R.base); p.rect(20, -13, 6, 4, R.base);
      p.hline(6, 11, -13, R.light); p.hline(20, 25, -13, R.light); p.hline(6, 11, -10, R.dark); p.hline(20, 25, -10, R.dark);
      for (let x = 24; x <= 29; x++) p.px(x, x % 2 ? 0 : -1, x % 2 ? R.dark : R.base);
      for (let y = 1; y <= 8; y++) p.px(y % 2 ? 29 : 30, y, y % 2 ? R.base : R.dark);
      after = (q) => { glow(q, 16, -4, 15, 11, '#FF6B5A30'); sparkle(q, 4, -13, '#FFE9A0'); sparkle(q, 28, -11, '#FFE9A0', '#FFFFFF', 1); sparkle(q, 27, -4, '#FFE9A0', '#FFFFFF', 1); };
      break;
    }
    default: { // ordenador normal
      monitor(p, 9, -16, 14, 11); keyboard(p, 10, -2, 12);
      p.rect(24, -1, 2, 2, PLAST.light); p.px(25, 0, PLAST.dark);
      mug(p, 26, -5);
      p.rect(2, -3, 6, 3, PAPER.base); p.hline(3, 6, -2, PAPER.line); p.hline(2, 7, 0, PAPER.shade);
      p.rect(21, -15, 2, 2, '#FFF59D');
    }
  }
  chairBack(p, 18, 15, boss);
  p.oy = 0; p.outline(OUT);
  if (after) { p.oy = top; after(p); p.oy = 0; }
  return { pix: p, top };
}
// ordenador viejo con monitor de tubo y letras verdes
function pcBig() {
  const W = 32, top = 22, p = new Pix(W, T + top); p.oy = top;
  const B = { base: '#D9D1B8', light: '#ECE6D2', dark: '#B5AC90', deep: '#8E866C' };
  deskBody(p, W, DESK);
  box(p, 3, -7, 26, 6, B.base, B.light, B.dark);
  p.hline(19, 26, -5, B.deep); p.hline(19, 26, -4, B.light); p.px(5, -4, '#6BE38A'); p.px(7, -4, '#E0B43A');
  box(p, 6, -22, 20, 15, B.base, B.light, B.dark);
  p.rect(8, -20, 16, 10, '#16301A'); p.hline(8, 23, -20, '#0C1E0F'); p.vline(8, -20, -11, '#0C1E0F');
  p.px(8, -20, B.base); p.px(23, -20, B.base); p.px(8, -11, B.base); p.px(23, -11, B.base);
  text(p, 10, -19, 'RUN', '#5CFF7A');
  p.hline(10, 18, -13, '#3FC45E'); p.rect(20, -14, 2, 2, '#5CFF7A');
  p.hline(9, 22, -9, B.dark); p.px(22, -9, '#6BE38A');
  keyboard(p, 8, -1, 16); p.hline(8, 23, -1, B.light);
  p.oy = 0; p.outline(OUT);
  return { pix: p, top };
}

// ---------- muebles y aparatos ----------
function cabinet() {
  const p = new Pix(16, 26), top = 10; p.oy = top;
  p.rect(2, -10, 12, 3, METAL.light); p.hline(2, 13, -10, METAL.top);
  p.rect(2, -7, 12, 23, METAL.base); p.vline(2, -7, 15, shade(METAL.base, 0.12)); p.vline(13, -7, 15, METAL.dark);
  for (let k = 0; k < 3; k++) {
    const y = -6 + k * 7;
    p.hline(3, 12, y, METAL.light); p.hline(3, 12, y + 5, METAL.dark); p.hline(2, 13, y + 6, METAL.deep);
    p.rect(6, y + 1, 4, 2, '#F4F1E6'); p.hline(6, 9, y + 2, '#C9C3B3');
    p.hline(6, 9, y + 4, METAL.deep); p.hline(6, 9, y + 3, METAL.top);
  }
  p.oy = 0; p.outline(OUT);
  return { pix: p, top };
}
function cooler() {
  const p = new Pix(16, 30), top = 14; p.oy = top;
  const B = { base: '#6CC0F0', light: '#BDE8FF', dark: '#3E93CF', deep: '#2C74B0' };
  // garrafa bocabajo
  p.rect(4, -13, 8, 8, B.base); p.px(4, -13, null); p.px(11, -13, null);
  p.hline(5, 10, -13, B.light); p.vline(5, -12, -7, B.light); p.vline(11, -12, -6, B.dark); p.vline(10, -11, -7, B.dark);
  p.hline(4, 11, -10, B.dark); p.hline(5, 10, -9, B.light);
  p.rect(6, -5, 4, 2, B.deep);
  // cuerpo con los grifos
  p.rect(3, -3, 10, 19, PLAST.light); p.hline(3, 12, -3, '#FFFFFF'); p.hline(3, 12, -1, PLAST.base);
  p.vline(12, -2, 15, PLAST.dark); p.vline(3, -2, 15, '#FFFFFF'); p.hline(3, 12, 15, PLAST.deep);
  p.rect(5, 0, 6, 5, PLAST.dark); p.rect(5, 0, 6, 1, PLAST.deep);
  p.rect(5, 1, 2, 2, '#2F7FD8'); p.rect(9, 1, 2, 2, '#D9433A');
  p.hline(5, 10, 4, DARK.base); p.hline(5, 10, 5, '#9AA2AB');
  p.hline(4, 11, 8, PLAST.dark); p.vline(10, 10, 12, PLAST.dark);
  // vasitos
  p.rect(13, -1, 2, 7, '#E8E8E8'); p.vline(14, -1, 5, '#C7C7C7'); p.hline(13, 14, 6, '#FFFFFF');
  p.oy = 0; p.outline(OUT);
  return { pix: p, top };
}
function printer() {
  const p = new Pix(16, 26), top = 10; p.oy = top;
  box(p, 2, 4, 12, 11, '#5E6470', '#788090', '#454A54');
  p.vline(8, 5, 13, '#454A54'); p.px(6, 9, '#9AA2AB'); p.px(10, 9, '#9AA2AB');
  p.rect(3, 15, 2, 1, DARK.dark); p.rect(11, 15, 2, 1, DARK.dark);
  // fotocopiadora
  p.rect(1, -9, 14, 3, PLAST.dark); p.hline(1, 14, -9, '#D7D3C8'); p.hline(2, 13, -7, PLAST.deep);
  box(p, 1, -6, 14, 10, PLAST.base, PLAST.light, PLAST.dark);
  p.rect(10, -5, 4, 2, DARK.base); p.px(11, -5, '#6BE38A'); p.px(13, -5, '#FFB300');
  p.hline(3, 9, -3, DARK.base);
  p.rect(3, -2, 7, 5, PAPER.base); p.hline(4, 8, -1, PAPER.line); p.hline(4, 7, 1, PAPER.line); p.hline(3, 9, 2, PAPER.shade);
  p.hline(2, 13, 3, PLAST.deep);
  p.oy = 0; p.outline(OUT);
  return { pix: p, top };
}
function coffeeMachine(o = {}) {
  const broken = o.variant === 'broken';
  const top = broken ? 26 : 17, p = new Pix(16, T + top); p.oy = top;
  // armarito
  p.rect(1, 0, 14, 3, WOOD.light); p.hline(1, 14, 0, '#E3AE76');
  box(p, 1, 3, 14, 12, WOOD.base, WOOD.light, WOOD.dark);
  p.vline(8, 4, 13, WOOD.dark); p.px(6, 8, '#E0B43A'); p.px(10, 8, '#E0B43A');
  p.rect(2, 15, 2, 1, WOOD.gap); p.rect(12, 15, 2, 1, WOOD.gap);
  // cafetera
  p.rect(4, -17, 8, 3, '#9FD4F0'); p.hline(4, 11, -17, '#D4EEFB'); p.vline(11, -16, -15, '#6AAFD8');
  box(p, 3, -14, 10, 14, '#3A3A46', '#565664', '#26262E');
  p.rect(4, -12, 8, 3, '#1E1E26'); p.rect(5, -11, 3, 1, broken ? '#E53935' : '#6BE38A');
  p.px(9, -11, '#E0B43A'); p.px(10, -11, broken ? '#555' : '#E53935');
  p.rect(5, -8, 6, 6, '#1B1B22'); p.rect(7, -8, 2, 2, '#9AA2AB');
  p.hline(4, 11, -2, '#6F737A');
  if (!broken) { p.rect(6, -5, 4, 3, '#FFFFFF'); p.hline(6, 9, -5, '#6D3B1F'); p.vline(9, -4, -3, '#D8D8D8'); }
  else {
    p.px(7, -6, '#6D3B1F'); p.px(8, -4, '#6D3B1F'); p.hline(5, 10, -3, '#6D3B1F');
    p.rect(0, 2, 16, 13, '#D32F2F'); p.hline(0, 15, 2, '#EF5350'); p.hline(0, 15, 14, '#9A1B1B');
    text(p, 1, 3, 'AVAR', '#FFFFFF'); text(p, 1, 9, 'IADA', '#FFFFFF');
  }
  p.oy = 0; p.outline(OUT);
  if (broken) {
    // humo (con su propio contorno gris) y una chispa
    const s = new Pix(16, 13);
    for (const [x, y, r] of [[7, 10, 2.4], [10, 5.5, 2], [6, 1.8, 1.5]]) { s.ellipse(x, y, r, r, '#CFCAD4'); s.px(Math.round(x - r / 2), Math.round(y - r / 2), '#F4F2F6'); s.px(Math.round(x - r / 2) + 1, Math.round(y - r / 2), '#F4F2F6'); }
    s.outline('#8C8694');
    p.oy = top; stamp(p, s, 0, -28);
    sparkle(p, 13, -9, '#FFD54F', '#FFFFFF', 1); p.oy = 0;
  }
  return { pix: p, top };
}
function bookshelf(o = {}) {
  const W = (o.w || 2) * T, top = 16, p = new Pix(W, T + top); p.oy = top;
  const guides = o.variant === 'guides', r = rng((o.seed || 1) * 97 + (guides ? 5 : 0));
  p.rect(0, -16, W, 32, WOOD.base);
  p.hline(0, W - 1, -16, WOOD.light); p.rect(0, -15, W, 2, '#C08850');
  p.vline(0, -14, 15, WOOD.light); p.vline(W - 1, -14, 15, WOOD.dark);
  const comps = [[-13, -5], [-2, 6]];
  for (const [k, [y0, y1]] of comps.entries()) {
    p.rect(2, y0, W - 4, y1 - y0 + 1, '#4A2C18'); p.hline(2, W - 3, y0, '#3A2210');
    // en la balda de abajo, unas guías tumbadas al final
    const flat = guides && k === 1 && W >= 24 ? 9 : 0;
    let x = 3;
    while (x < W - 4 - flat) {
      const bw = guides ? 4 : 3, hgt = y1 - y0 - (guides ? (r() < 0.3 ? 1 : 0) : Math.floor(r() * 2)), yt = y1 - hgt + 1;
      if (x + bw > W - 3 - flat) break;
      if (guides) {
        const c = r() < 0.5 ? GUIDE.base : '#EDBB00';
        p.rect(x, yt, bw, hgt, c); p.vline(x, yt, y1, GUIDE.light); p.vline(x + bw - 1, yt, y1, GUIDE.dark);
        p.hline(x, x + bw - 1, yt + 1, GUIDE.band); p.hline(x, x + bw - 1, y1 - 1, GUIDE.band);
        p.px(x + 1, yt + 3, '#FFFFFF'); p.px(x + 2, yt + 3, '#FFFFFF'); p.px(x + 1, yt + 5, GUIDE.dark); p.px(x + 2, yt + 5, GUIDE.dark);
      } else {
        const c = BINDERS[Math.floor(r() * BINDERS.length)];
        p.rect(x, yt, bw, hgt, c); p.vline(x, yt, y1, shade(c, 0.25)); p.vline(x + bw - 1, yt, y1, shade(c, -0.25));
        p.px(x + 1, yt + 2, '#FFFFFF'); p.px(x + 1, yt + 3, '#FFFFFF'); p.px(x + 1, y1 - 1, shade(c, -0.45));
      }
      x += bw + (r() < 0.12 ? 1 : 0);
    }
    if (flat) for (let j = 0; j < 3; j++) {
      const fx = W - 3 - flat + (j % 2), fy = y1 - 2 - j * 3;
      p.rect(fx, fy, flat - 1, 2, GUIDE.base); p.hline(fx, fx + flat - 2, fy, GUIDE.light); p.hline(fx, fx + flat - 2, fy + 2, PAPER.shade);
      p.px(fx + 2, fy + 1, GUIDE.band); p.px(fx + 3, fy + 1, GUIDE.band);
    }
    p.rect(1, y1 + 1, W - 2, 2, WOOD.light); p.hline(1, W - 2, y1 + 2, WOOD.dark);
  }
  // puertas de abajo
  p.rect(2, 9, W - 4, 5, WOOD.base); p.vline(Math.floor(W / 2), 9, 13, WOOD.dark);
  p.hline(2, W - 3, 13, WOOD.dark); p.px(Math.floor(W / 2) - 2, 11, '#E0B43A'); p.px(Math.floor(W / 2) + 1, 11, '#E0B43A');
  p.hline(0, W - 1, 14, WOOD.dark); p.hline(0, W - 1, 15, WOOD.gap);
  p.oy = 0; p.outline(OUT);
  return { pix: p, top };
}
function serverRack(o = {}) {
  const p = new Pix(16, 34), top = 18; p.oy = top;
  const r = rng((o.seed || 3) * 131);
  p.rect(1, -18, 14, 3, '#4A4A58'); p.hline(1, 14, -18, '#62627A');
  p.rect(1, -15, 14, 31, '#202028');
  p.vline(1, -15, 15, '#3A3A48'); p.vline(2, -15, 15, '#2E2E3A'); p.vline(13, -15, 15, '#2E2E3A'); p.vline(14, -15, 15, '#15151B');
  for (let y = -14; y < 12; y += 4) {
    p.rect(3, y, 10, 3, '#2F2F3C'); p.hline(3, 12, y, '#43435A');
    for (let x = 4; x < 9; x += 2) if (r() < 0.8) p.px(x, y + 1, ['#3CE06A', '#3CE06A', '#FFB300', '#4C8DFF', '#FF4D4D'][Math.floor(r() * 5)]);
    p.px(10, y + 1, '#15151B'); p.px(11, y + 1, '#15151B');
  }
  p.rect(1, 13, 14, 3, '#15151B'); p.px(2, 15, '#3A3A48'); p.px(13, 15, '#3A3A48');
  p.oy = 0; p.outline(OUT);
  return { pix: p, top };
}
function paperStack(o = {}) {
  const v = Math.max(0, Math.min(2, Number(o.variant) || 0));
  const n = [3, 7, 12][v], top = [0, 6, 16][v], p = new Pix(16, T + top); p.oy = top;
  const topY = paperPile(p, 2, 14, 12, n, (o.seed || 1) * 7 + v);
  if (v === 2) { p.rect(4, topY - 3, 8, 3, '#E8C878'); p.hline(4, 11, topY - 3, '#F2DA9C'); p.hline(4, 11, topY - 1, '#C9A55A'); }
  p.oy = 0; p.outline(OUT);
  return { pix: p, top };
}
function tripodLegs(p, cx, y0) {
  line(p, cx, y0, cx - 6, 15, DARK.base); line(p, cx, y0, cx + 5, 15, DARK.base); p.vline(cx, y0, 13, DARK.light);
}
function ringlight() {
  const p = new Pix(16, 34), top = 18; p.oy = top;
  tripodLegs(p, 8, 4);
  p.rect(7, -4, 2, 9, DARK.base); p.vline(7, -4, 4, DARK.light);
  const cy = -11;
  for (let y = cy - 8; y <= cy + 8; y++) for (let x = 0; x < 16; x++) {
    const dx = x + 0.5 - 8, dy = y + 0.5 - cy, d = Math.hypot(dx, dy);
    if (d > 7.3 || d < 4.4) continue;
    const l = -dx - dy;
    p.px(x, y, l > 4 ? '#FFFFFF' : l < -4 ? '#E3D3A0' : '#FFF4D0');
  }
  p.rect(7, -12, 2, 4, DARK.dark); p.px(7, -12, SCR.light);
  p.vline(8, -7, -5, DARK.base);
  p.oy = 0; p.outline(OUT);
  p.oy = top;
  for (let y = cy - 10; y <= cy + 10; y++) for (let x = -1; x < 17; x++) {
    const d = Math.hypot(x + 0.5 - 8, y + 0.5 - cy);
    if (!p.get(x, y) && ((d > 7.3 && d < 9.6) || (d < 4.2 && d > 2.8))) p.px(x, y, '#FFF3C04A');
  }
  p.oy = 0;
  return { pix: p, top };
}
function tripodPhone() {
  const p = new Pix(16, 28), top = 12; p.oy = top;
  tripodLegs(p, 8, 4);
  p.rect(7, 0, 2, 5, DARK.base); p.rect(5, -1, 6, 2, DARK.dark);
  box(p, 4, -12, 8, 12, '#202028', '#3A3A46', '#15151B');
  p.rect(5, -11, 6, 9, '#8ACBF0'); p.rect(5, -6, 6, 4, '#C9A06A'); p.hline(5, 10, -6, '#A87E4E');
  p.rect(7, -8, 2, 3, '#F2C6A0'); p.px(7, -9, '#5A3A22'); p.px(8, -9, '#5A3A22');
  p.rect(5, -11, 2, 2, '#FF2D2D'); p.px(5, -11, '#FF9A9A');
  p.hline(7, 8, -1, '#565664');
  p.oy = 0; p.outline(OUT);
  p.oy = top; glow(p, 5.5, -10, 3.5, 3, '#FF3B3B40'); p.oy = 0;
  return { pix: p, top };
}
function lectern(o = {}) {
  const shine = o.variant === 'glow';
  const top = shine ? 14 : 10, p = new Pix(16, T + top); p.oy = top;
  box(p, 3, 13, 10, 3, WOOD.dark, WOOD.base, WOOD.gap);
  p.rect(6, 0, 4, 13, WOOD.base); p.vline(6, 0, 12, WOOD.light); p.vline(9, 0, 12, WOOD.dark);
  for (const y of [3, 9]) p.hline(5, 10, y, WOOD.light);
  p.rect(1, -5, 14, 5, WOOD.base); p.hline(1, 14, -5, WOOD.light); p.hline(1, 14, -1, WOOD.dark); p.hline(2, 13, 0, WOOD.gap);
  // libro viejo abierto
  const PG = '#EFD48A', PGL = '#F8E6B0', PGD = '#C9A95E';
  p.hline(1, 14, -3, '#7A2E1E'); p.hline(2, 13, -2, '#5A1E12');
  p.rect(2, -9, 6, 6, PG); p.rect(8, -9, 6, 6, PG);
  p.hline(3, 6, -9, PGL); p.hline(9, 12, -9, PGL); p.px(2, -9, null); p.px(13, -9, null);
  p.vline(7, -9, -4, PGD); p.vline(8, -9, -4, PGL);
  for (const y of [-7, -5]) { p.hline(3, 6, y, '#B89A55'); p.hline(9, 12, y, '#B89A55'); }
  p.oy = 0; p.outline(OUT);
  if (shine) {
    p.oy = top;
    glow(p, 8, -7, 10, 7, '#FFD54F40'); glow(p, 8, -8, 7, 5, '#FFE9A040');
    sparkle(p, 2, -12, '#FFE9A0'); sparkle(p, 13, -13, '#FFE9A0', '#FFFFFF', 1); sparkle(p, 9, -14, '#FFF6C0', '#FFFFFF', 1);
    p.oy = 0;
  }
  return { pix: p, top };
}
function tableBig(o = {}) {
  const W = Math.max(3, o.w || 4) * T, H = Math.max(2, o.h || 2) * T, top = 12, p = new Pix(W, H + top); p.oy = top;
  const n = Math.max(1, Math.floor((W - 4) / 20)), xs = Array.from({ length: n }, (_, k) => Math.round(W * (k + 0.5) / n));
  const tb = H - 11;   // última fila del tablero
  // sillas del fondo
  for (const cx of xs) {
    p.rect(cx - 5, -10, 10, 12, CHAIR.base); p.hline(cx - 4, cx + 3, -10, CHAIR.light); p.vline(cx - 5, -9, 1, CHAIR.light);
    p.vline(cx + 4, -9, 1, CHAIR.dark); p.hline(cx - 3, cx + 2, -7, shade(CHAIR.base, -0.12));
  }
  // mesa de madera oscura
  p.rect(1, 0, W - 2, tb + 1, MAHOG.top); p.hline(1, W - 2, 0, MAHOG.light); p.vline(1, 0, tb, MAHOG.light);
  for (let x = 6; x < W - 6; x += 14) { line(p, x, tb - 2, x + 5, 3, '#8A4E30'); line(p, x + 1, tb - 2, x + 6, 3, '#8A4E30'); }
  p.hline(1, W - 2, tb + 1, MAHOG.light); p.rect(1, tb + 2, W - 2, 4, MAHOG.front); p.hline(1, W - 2, tb + 5, MAHOG.dark);
  for (const x of [3, W - 7]) { p.rect(x, tb + 6, 4, H - tb - 6, MAHOG.front); p.vline(x, tb + 6, H - 1, MAHOG.light); p.vline(x + 3, tb + 6, H - 1, MAHOG.dark); }
  // cosas encima
  for (const [k, cx] of xs.entries()) {
    p.rect(cx - 3, 2, 6, 4, PAPER.base); p.hline(cx - 2, cx + 1, 3, PAPER.line); p.hline(cx - 3, cx + 2, 5, PAPER.shade);
    if (k % 2) { p.rect(cx - 4, tb - 7, 8, 4, '#B8BEC6'); p.hline(cx - 4, cx + 3, tb - 7, '#E3E7EC'); p.rect(cx - 3, tb - 6, 6, 2, SCR.base); }
    else { p.rect(cx - 3, tb - 6, 5, 4, PAPER.base); p.hline(cx - 2, cx + 1, tb - 5, PAPER.line); p.px(cx + 3, tb - 5, '#1E88E5'); p.px(cx + 3, tb - 4, '#1E88E5'); }
    p.rect(cx + 5, 4, 2, 3, '#CFE8F5'); p.px(cx + 5, 4, '#FFFFFF');
  }
  const mx = Math.round(W / 2);
  p.rect(mx - 3, Math.round(tb / 2) - 1, 6, 3, '#2E2E36'); p.hline(mx - 2, mx + 1, Math.round(tb / 2) - 2, '#2E2E36'); p.px(mx, Math.round(tb / 2), '#6BE38A');
  // sillas de delante, de espaldas
  for (const cx of xs) chairBack(p, cx, H - 1);
  p.oy = 0; p.outline(OUT);
  return { pix: p, top };
}
// sofá de cuero capitoné, mirando hacia abajo
function sofa() {
  const W = 32, top = 10, p = new Pix(W, T + top); p.oy = top;
  const L = { base: '#6E3A22', light: '#8E5232', dark: '#52291A', deep: '#3A1C10', hi: '#C08058' };
  // respaldo con botones
  p.rect(3, -9, 26, 11, L.base); p.hline(4, 27, -10, L.base); p.hline(4, 27, -10, L.light); p.hline(3, 28, -9, L.light);
  p.hline(3, 28, 1, L.dark);
  for (const [y, x0] of [[-6, 6], [-2, 9]]) for (let x = x0; x < 27; x += 6) { p.px(x, y, L.deep); p.px(x, y - 1, L.hi); }
  p.px(5, -9, L.hi); p.px(6, -9, L.hi); p.px(5, -8, L.hi);
  // asientos
  for (const x of [5, 16]) {
    p.rect(x, 0, 11, 6, L.light); p.hline(x, x + 10, 0, L.hi); p.vline(x, 1, 5, L.hi);
    p.vline(x + 10, 1, 5, L.base); p.hline(x, x + 10, 5, L.base); p.px(x + 2, 1, '#E0A884');
  }
  p.rect(5, 6, 22, 7, L.dark); p.hline(5, 26, 6, L.base); p.hline(5, 26, 12, L.deep);
  for (let x = 7; x < 26; x += 4) p.px(x, 9, L.deep);
  // brazos enrollados
  for (const x of [0, 26]) {
    p.rect(x, -3, 6, 16, L.base); p.ellipse(x + 3, -3, 3, 2.2, L.light);
    p.hline(x + 1, x + 4, -5, L.hi); p.px(x + 1, -4, L.hi);
    p.vline(x, -2, 12, x ? L.base : L.light); p.vline(x + 5, -2, 12, L.dark); p.hline(x, x + 5, 12, L.deep);
    p.hline(x + 1, x + 4, -1, L.dark);
  }
  for (const x of [1, 29]) p.rect(x, 13, 2, 3, WOOD.gap);
  p.oy = 0; p.outline(OUT);
  return { pix: p, top };
}
function seatTrain() {
  const W = 32, top = 12, p = new Pix(W, T + top); p.oy = top;
  const S = { base: '#2F5FA8', light: '#4A7DC8', dark: '#234A86', deep: '#183566', dot: '#E0B43A' };
  for (const x0 of [1, 17]) {
    p.rect(x0, -9, 14, 12, S.base); p.vline(x0, -9, 2, S.light); p.vline(x0 + 13, -9, 2, S.dark);
    for (let y = -6; y <= 1; y += 3) for (let x = x0 + 2 + ((y + 6) / 3 % 2) * 2; x < x0 + 13; x += 4) p.px(x, y, (x + y) % 3 ? S.light : S.dot);
    p.rect(x0 + 2, -12, 10, 5, '#F2F2EE'); p.hline(x0 + 2, x0 + 11, -8, '#D6D6CE'); p.hline(x0 + 3, x0 + 10, -12, '#FFFFFF');
    p.rect(x0, 3, 14, 6, S.light); p.hline(x0, x0 + 13, 3, shade(S.light, 0.2)); p.vline(x0 + 13, 4, 8, S.base);
    p.rect(x0, 9, 14, 3, S.dark); p.hline(x0, x0 + 13, 11, S.deep);
    p.rect(x0 + 6, 12, 2, 4, '#8E959E'); p.hline(x0 + 3, x0 + 10, 15, '#6F757E');
  }
  p.rect(14, -1, 5, 3, '#5E646E'); p.hline(14, 18, -1, '#7E858F');
  p.rect(0, -1, 2, 3, '#5E646E'); p.rect(30, -1, 2, 3, '#5E646E');
  p.oy = 0; p.outline(OUT);
  return { pix: p, top };
}
// núcleo de datos de O Algoritmo: orbe de datos flotando sobre un pedestal, con cables por el suelo
function core(o = {}) {
  const W = 3 * T, H = 3 * T, top = 22, p = new Pix(W, H + top); p.oy = top;   // siempre 3x3
  const cx = W / 2, oyc = 3, R = 15, ry = H - 16;
  // cables
  const cable = (x0, x1, y, ph, amp) => {
    for (let x = x0; x <= x1; x++) { const yy = y + Math.round(Math.sin(x / 4 + ph) * amp); p.px(x, yy, '#3C3C4A'); p.px(x, yy + 1, '#1C1C24'); }
  };
  cable(0, cx - 12, ry + 6, 0, 1.2); cable(cx + 11, W - 1, ry + 6, 2, 1.2);
  cable(2, cx - 14, ry + 10, 1, 1); cable(cx + 13, W - 3, ry + 10, 3, 1);
  for (const [x, y, c] of [[cx - 13, ry + 6, DATA[0]], [cx + 12, ry + 6, DATA[1]], [cx - 15, ry + 10, DATA[3]], [cx + 14, ry + 10, DATA[2]]]) p.rect(x, y + Math.round(Math.sin(x / 4) * 0.8) - 1, 2, 3, c);
  // pedestal
  p.ellipse(cx, ry + 6, 17, 5, '#1F2234');
  p.rect(cx - 17, ry - 2, 34, 8, '#2C3046');
  for (let x = Math.floor(cx - 16); x < cx + 16; x++) p.px(x, ry + 3, DATA[Math.floor((x - cx + 16) / 8) % 4]);
  p.ellipse(cx, ry - 2, 17, 5, '#454C6C'); p.ellipse(cx, ry - 2, 15, 4, '#39405C');
  p.ellipse(cx, ry - 2, 10, 2.6, '#9FD8FF'); p.ellipse(cx, ry - 2, 7, 1.6, '#E6F6FF');
  // orbe de datos: mosaico de bits de colores sobre una esfera azul noche
  for (let y = oyc - R; y <= oyc + R; y++) for (let x = Math.floor(cx - R); x <= Math.ceil(cx + R); x++) {
    const nx = (x + 0.5 - cx) / R, ny = (y + 0.5 - oyc) / R, d2 = nx * nx + ny * ny;
    if (d2 > 1) continue;
    const nz = Math.sqrt(1 - d2), l = Math.max(0, -nx * 0.45 - ny * 0.55 + nz * 0.7);
    const cell = hash(Math.floor(x / 2), Math.floor(y / 2), 71);
    let c = mix('#101838', '#2E4A9A', Math.min(1, l));
    if (cell % 5 < 2) c = mix(DATA[cell % 4], '#101838', Math.max(0, 0.75 - l * 0.8));
    if ((y - oyc + R) % 6 === 0 && cell % 3 === 0) c = mix('#BFE6FF', c, 0.4);
    if (d2 > 0.86) c = mix(c, '#0A0F24', 0.45);
    p.px(x, y, c);
  }
  p.ellipse(cx - 5, oyc - 6, 3.4, 2.2, '#DDF0FF'); p.ellipse(cx - 6, oyc - 7, 1.6, 1, '#FFFFFF');
  p.oy = 0; p.outline(OUT); p.oy = top;
  // haz de luz, anillo de datos, halos y bits sueltos (sin contorno)
  for (let y = oyc + R + 2; y < ry - 3; y++) for (let x = Math.round(cx) - 3; x < Math.round(cx) + 3; x++) if (!p.get(x, y)) p.px(x, y, (x + y) % 3 ? '#9FD8FF66' : '#E6F6FF99');
  // anillo de datos en órbita: trazos de colores, por detrás del orbe y por delante
  const ring = (front) => {
    for (let a = 0; a < 360; a += 1) {
      const seg = Math.floor(a / 30);
      if (a % 30 >= 22) continue;
      const t = a * Math.PI / 180;
      if ((Math.sin(t) >= 0) !== front) continue;
      for (const [rx, rr, c] of [[21, 4.4, DATA[seg % 4]], [22, 5, front ? shade(DATA[seg % 4], 0.35) : DATA[seg % 4]]]) {
        const x = Math.floor(cx + Math.cos(t) * rx), y = Math.round(oyc + 5 + Math.sin(t) * rr);
        if (!front && p.get(x, y)) continue;
        p.px(x, y, c);
      }
    }
  };
  ring(false); ring(true);
  glow(p, cx, oyc, R + 5, R + 5, '#6FA8FF26'); glow(p, cx, ry + 2, 24, 7, '#4C8DFF30');
  const r = rng(29);
  for (let k = 0; k < 10; k++) {
    const t = r() * Math.PI * 2, d = R + 3 + r() * 6, x = Math.round(cx + Math.cos(t) * d), y = Math.round(oyc + Math.sin(t) * d);
    if (!p.get(x, y)) p.px(x, y, DATA[k % 4]);
  }
  sparkle(p, Math.round(cx) + 12, oyc - 13, '#DDF0FF'); sparkle(p, Math.round(cx) - 15, oyc + 12, '#DDF0FF', '#FFFFFF', 1);
  p.oy = 0;
  return { pix: p, top };
}
// captura impresa de una gráfica de analítica, tirada en el suelo (se puede coger)
function captura() {
  const p = new Pix(16, 20), top = 4; p.oy = top;
  p.rect(1, 5, 14, 9, PAPER.base); p.hline(1, 14, 13, PAPER.shade); p.vline(14, 5, 13, PAPER.shade);
  p.hline(2, 13, 6, '#2E7DD7'); p.px(12, 6, '#FFFFFF');
  p.vline(3, 8, 12, PAPER.line); p.hline(3, 13, 12, PAPER.line);
  for (const [x, hh] of [[5, 1], [7, 2], [9, 2], [11, 3]]) p.vline(x, 12 - hh, 11, '#9CC4FF');
  for (const [x0, y0, x1, y1] of [[4, 11, 6, 10], [6, 10, 8, 10], [8, 10, 10, 9], [10, 9, 13, 7]]) line(p, x0, y0, x1, y1, '#E53935');
  p.px(13, 7, '#3CC46A');
  p.oy = 0; p.outline(OUT);
  p.oy = top; sparkle(p, 13, 2, '#FFF59D'); sparkle(p, 3, 3, '#FFF59D', '#FFFFFF', 1); p.oy = 0;
  return { pix: p, top };
}
// tablón de corcho del departamento, en un caballete (marco del color del departamento)
function deptBoard(o = {}) {
  const col = o.color || WOOD.base, p = new Pix(16, 24), top = 8; p.oy = top;
  line(p, 4, 5, 2, 15, WOOD.dark); line(p, 11, 5, 13, 15, WOOD.dark); p.hline(3, 12, 11, WOOD.dark);
  box(p, 0, -8, 16, 14, col);
  p.rect(2, -6, 12, 10, CORK.base); p.hline(2, 13, -6, CORK.dark); p.vline(2, -6, 3, CORK.dark);
  for (let k = 0; k < 10; k++) p.px(3 + (k * 5) % 11, -5 + (k * 3) % 9, k % 2 ? CORK.light : CORK.dark);
  const note = (x, y, w, h, c) => { p.rect(x, y, w, h, c); p.hline(x, x + w - 1, y + h - 1, shade(c, -0.15)); for (let yy = y + 2; yy < y + h - 1; yy += 2) p.hline(x + 1, x + w - 2, yy, '#9E9A92'); p.px(x + Math.floor(w / 2), y, '#E53935'); };
  note(3, -5, 4, 5, '#FFFFFF'); note(8, -5, 5, 4, '#FFF59D'); note(6, -1, 5, 4, '#F8BBD0');
  p.oy = 0; p.outline(OUT);
  return { pix: p, top };
}

export const OFFICE_PAINTERS = {
  desk: (o) => desk(o), pc_big: () => pcBig(), cabinet: () => cabinet(), cooler: () => cooler(), printer: () => printer(),
  coffee_machine: (o) => coffeeMachine(o), bookshelf: (o) => bookshelf(o), server_rack: (o) => serverRack(o),
  paper_stack: (o) => paperStack(o), ringlight: () => ringlight(), tripod_phone: () => tripodPhone(), lectern: (o) => lectern(o),
  table_big: (o) => tableBig(o), sofa: () => sofa(), seat_train: () => seatTrain(), core: (o) => core(o),
  captura: () => captura(), dept_board: (o) => deptBoard(o),
};

// ---------- decoración de pared ----------
function whiteboard(W) {
  const bw = Math.max(14, W - 2), x0 = Math.floor((W - bw) / 2), h = 22, p = new Pix(W, h + 2);
  p.rect(x0, 0, bw, h, METAL.light); p.hline(x0, x0 + bw - 1, 0, METAL.top); p.vline(x0 + bw - 1, 0, h - 1, METAL.dark);
  p.rect(x0 + 1, 1, bw - 2, h - 3, '#FAFAF6'); p.hline(x0 + 1, x0 + bw - 2, h - 3, '#E6E6DE');
  for (let k = 0; k < 4; k++) p.px(x0 + bw - 4 - k, 2 + k, '#FFFFFF');
  const r = rng(11), chartW = bw >= 30 ? 12 : 0;
  for (let y = 3; y < h - 5; y += 3) {
    const len = 4 + Math.floor(r() * (bw - chartW - 10));
    for (let x = x0 + 3; x < x0 + 3 + len; x++) if ((x * 7 + y) % 9) p.px(x, y + ((x >> 1) % 2), y === 3 ? '#C62828' : '#2E5BD6');
  }
  if (chartW) {
    const bx = x0 + bw - chartW - 2, by = h - 5;
    p.vline(bx, 3, by, '#3A3A48'); p.hline(bx, bx + chartW - 1, by, '#3A3A48');
    [[2, 3, '#3CC46A'], [5, 6, '#4C8DFF'], [8, 10, '#EF6C00']].forEach(([dx, hh, c]) => p.rect(bx + dx, by - hh, 2, hh, c));
    line(p, bx + 2, by - 5, bx + 9, by - 12, '#C62828'); p.px(bx + 8, by - 12, '#C62828'); p.px(bx + 9, by - 11, '#C62828');
  }
  p.rect(x0 + 3, h - 1, bw - 6, 2, METAL.base); p.hline(x0 + 3, x0 + bw - 4, h - 1, METAL.light);
  p.hline(x0 + 5, x0 + 7, h - 2, '#C62828'); p.hline(x0 + 9, x0 + 11, h - 2, '#2E5BD6');
  p.outline(OUT);
  return { pix: p, top: 0 };
}
// pendón del departamento: color y siglas (o.color, o.short)
function deptBanner(W, o) {
  const col = o.color || '#1E88E5', label = String(o.short || '').toUpperCase().trim();
  const narrow = W < 32, cw = narrow ? W - 2 : Math.min(W - 8, Math.max(24, textW(label) + 6)), cx = Math.floor(W / 2), x0 = cx - Math.floor(cw / 2), h = 32;
  const p = new Pix(W, h + 1), ink = lum(col) > 0.62 ? '#2B2230' : '#FFFFFF';
  // barra y cuerda
  const ex = narrow ? 1 : 2;
  p.hline(x0 - ex, x0 + cw - 1 + ex, 2, '#6B4A2E'); p.hline(x0 - ex, x0 + cw - 1 + ex, 3, '#4A2C18');
  p.rect(x0 - ex - (narrow ? 0 : 1), 1, narrow ? 1 : 2, 3, GOLD.base); p.rect(x0 + cw - 1 + ex, 1, narrow ? 1 : 2, 3, GOLD.base);
  line(p, x0, 1, cx, 0, '#6B4A2E'); line(p, x0 + cw - 1, 1, cx, 0, '#6B4A2E');
  // tela con cola de golondrina
  const tail = 5;
  for (let y = 4; y < h; y++) for (let i = 0; i < cw; i++) {
    const cut = y - (h - tail), mid = Math.abs(i + 0.5 - cw / 2);
    if (cut >= 0 && mid < cut * (cw / 2) / tail) continue;
    let c = col;
    if (y === 4) c = shade(col, -0.35); else if (i === 0) c = shade(col, 0.25); else if (i === cw - 1) c = shade(col, -0.25);
    else if (i === 2 || i === cw - 3) c = shade(col, 0.45);
    p.px(x0 + i, y, c);
  }
  star(p, cx, 10, cw >= 20 ? 5 : 4, '#FFFFFF', lum(col) > 0.62 ? '#2B2230' : shade(col, 0.55));
  if (label) {
    // si no cabe: en estrecho, en dos líneas; si aún no, se recorta
    const room = cw - (narrow ? 1 : 4), sh = ink === '#FFFFFF' ? shade(col, -0.4) : null;
    let lines = [label];
    if (narrow && textW(label) > room) lines = [label.slice(0, Math.ceil(label.length / 2)), label.slice(Math.ceil(label.length / 2))];
    lines = lines.map(s => { while (s.length > 1 && textW(s) > room) s = s.slice(0, -1); return s; });
    lines.forEach((s, k) => {
      const tx = cx - Math.floor(textW(s) / 2), ty = lines.length > 1 ? 15 + k * 6 : 18;
      if (narrow) p.rect(tx - 1, ty - 1, textW(s) + 2, 7, col);
      text(p, tx, ty, s, ink, sh);
    });
  }
  p.outline(OUT);
  return { pix: p, top: 0 };
}
function officeWindow(W) {
  const ww = Math.max(14, W - 4), x0 = Math.floor((W - ww) / 2), h = 22, p = new Pix(W, h + 3);
  p.rect(x0, 0, ww, h, '#FDFDFD');
  const gx0 = x0 + 2, gx1 = x0 + ww - 3, gy0 = 2, gy1 = h - 3;
  for (let y = gy0; y <= gy1; y++) p.hline(gx0, gx1, y, mix('#6FB8EC', '#CDEBFF', (y - gy0) / (gy1 - gy0)));
  const r = rng(W * 3 + 1);
  for (let k = 0; k < Math.max(1, Math.floor(ww / 18)); k++) {
    const cx = gx0 + 3 + Math.floor(r() * (ww - 10)), cy = gy0 + 3 + Math.floor(r() * 5);
    p.ellipse(cx, cy, 3.2, 1.6, '#FFFFFF'); p.ellipse(cx + 2.5, cy - 1, 2.2, 1.4, '#FFFFFF'); p.hline(cx - 2, cx + 3, cy + 1, '#DCEFFB');
  }
  for (let x = gx0; x <= gx1; x++) { const hh = 3 + Math.round(Math.sin(x * 0.35) * 1.4 + Math.sin(x * 0.9) * 0.6); for (let y = gy1 - hh + 1; y <= gy1; y++) p.px(x, y, y === gy1 - hh + 1 ? '#8CCB7A' : '#6FB064'); }
  const mx = x0 + Math.floor(ww / 2);
  p.vline(mx, 0, h - 1, '#FDFDFD'); p.vline(mx + 1, 2, h - 3, '#D9D9D2'); p.hline(x0, x0 + ww - 1, 9, '#FDFDFD'); p.hline(gx0, gx1, 10, '#D9D9D2');
  p.hline(gx0, gx1, gy0, '#D9D9D2'); p.vline(gx0, gy0, gy1, '#D9D9D2');
  p.px(gx0 + 2, gy0 + 2, '#FFFFFF'); p.px(gx0 + 3, gy0 + 2, '#FFFFFF'); p.px(gx0 + 2, gy0 + 3, '#FFFFFF');
  p.rect(x0 - 1, h - 1, ww + 2, 3, '#E8E4DA'); p.hline(x0 - 1, x0 + ww, h - 1, '#FFFFFF'); p.hline(x0 - 1, x0 + ww, h + 1, '#BDB7AC');
  p.outline(OUT);
  return { pix: p, top: 0 };
}
// pantallón con la maqueta de una web: ordenada (o.variant2/o.state 'ok') o hecha un desastre
function bigScreen(W, o) {
  const ok = o.variant2 === 'ok' || o.state === 'ok';
  const sw = Math.max(20, W - 2), x0 = Math.floor((W - sw) / 2), h = 28, p = new Pix(W, h + 1);
  p.rect(x0, 0, sw, h, '#1E1E24'); p.hline(x0, x0 + sw - 1, 0, '#34343E'); p.hline(x0, x0 + sw - 1, h - 1, '#121216');
  const sx = x0 + 2, sy = 2, ww = sw - 4, wh = h - 6;
  p.rect(sx, sy, ww, wh, '#F4F6F9');
  const blk = (x, y, w, hh, c) => {
    const X0 = Math.max(sx, sx + x), Y0 = Math.max(sy, sy + y), X1 = Math.min(sx + ww - 1, sx + x + w - 1), Y1 = Math.min(sy + wh - 1, sy + y + hh - 1);
    for (let yy = Y0; yy <= Y1; yy++) for (let xx = X0; xx <= X1; xx++) p.px(xx, yy, c);
  };
  const cols = Math.max(2, Math.floor((ww - 2) / 9)), cw = Math.floor((ww - 2 - (cols - 1) * 2) / cols);
  if (ok) {
    blk(0, 0, ww, 3, '#1E4E8C'); blk(1, 1, 3, 1, '#FFC928');
    for (let k = 0; k < 3; k++) blk(ww - 4 - k * 4, 1, 3, 1, '#CFE3F7');
    blk(1, 4, ww - 2, 7, '#CFE3F7'); blk(3, 6, Math.floor(ww / 2), 1, '#1E4E8C'); blk(3, 8, Math.floor(ww / 3), 1, '#7C9CC4'); blk(ww - 8, 8, 5, 2, '#EF6C00');
    for (let k = 0; k < cols; k++) { const bx = 1 + k * (cw + 2); blk(bx, 12, cw, 6, '#E3E8EF'); blk(bx, 12, cw, 3, '#9CC4E8'); blk(bx + 1, 16, cw - 2, 1, '#9AA6B4'); }
    blk(0, wh - 3, ww, 3, '#3A4A5E');
    for (const [dx, dy] of [[0, 1], [1, 2], [2, 1], [3, 0]]) p.px(sx + ww - 6 + dx, sy + wh - 8 + dy, '#2FA84F');
  } else {
    const r = rng(404);
    blk(3, 2, ww, 3, '#1E4E8C'); blk(-2, 5, Math.floor(ww * 0.7), 8, '#CFE3F7'); blk(2, 7, Math.floor(ww / 2), 1, '#1E4E8C');
    blk(Math.floor(ww / 2) + 2, 1, 5, 2, '#EF6C00');
    for (let k = 0; k < cols + 1; k++) {
      const bx = Math.floor(r() * (ww - cw)), by = 9 + Math.floor(r() * (wh - 14));
      blk(bx, by, cw, 6, k % 2 ? '#E3E8EF' : '#F2C6E0'); blk(bx, by, cw, 2, k % 2 ? '#9CC4E8' : '#FF7FB8');
    }
    blk(ww - 7, wh - 5, 9, 3, '#3A4A5E');
    const xs = [[3, 11], [ww - 6, 4], [Math.floor(ww / 2), wh - 7]];
    for (const [ex, ey] of xs) for (let i = 0; i < 3; i++) { p.px(sx + ex + i, sy + ey + i, '#E53935'); p.px(sx + ex + 2 - i, sy + ey + i, '#E53935'); }
    const tx = sx + ww - 12, ty = sy + 11;
    for (let j = 0; j < 5; j++) p.hline(tx + 2 - Math.floor(j / 2), tx + 2 + Math.floor(j / 2), ty + j, '#FFC928');
    p.vline(tx + 2, ty + 1, ty + 2, '#2B2230'); p.px(tx + 2, ty + 4, '#2B2230');
  }
  p.hline(sx, sx + ww - 1, sy, '#FFFFFF');
  p.px(x0 + sw - 4, h - 2, ok ? '#6BE38A' : '#FF4D4D');
  p.outline(OUT);
  return { pix: p, top: 0 };
}
// retrato al óleo de un señor mayor con bigote
const BUST = [   // versión pequeña, a mano (10x14)
  '..........', '...ssss...', '..sbssSs..', '.hssssSSh.', '.hsesseSh.', '.msssSsSm.', '..mmmmmm..',
  '...sMMs...', '..cwwwwc..', '.ccwttwcc.', 'cccwttwccc', 'ccccttcccc', 'cccccccccc', 'cccccccccc',
];
const BUST_PAL = { h: '#D8D8D8', s: '#E2B08C', S: '#C9936E', b: '#F4CFAE', e: '#2B2230', m: '#F2F2F2', M: '#CFCFCF', c: '#26222C', w: '#EDE8DC', t: '#8E1B1B' };
function portrait(W) {
  const big = W >= 26;
  if (!big) {
    const fw = 14, fh = 18, x0 = Math.floor((W - fw) / 2), p = new Pix(W, fh + 1);
    p.rect(x0, 0, fw, fh, GOLD.base); p.hline(x0, x0 + fw - 1, 0, GOLD.light); p.vline(x0, 0, fh - 1, GOLD.light);
    p.hline(x0, x0 + fw - 1, fh - 1, GOLD.dark); p.vline(x0 + fw - 1, 0, fh - 1, GOLD.dark);
    p.rect(x0 + 1, 1, fw - 2, fh - 2, GOLD.dark);
    for (let y = 0; y < 14; y++) p.hline(x0 + 2, x0 + 11, 2 + y, mix('#5A4030', '#2A1C14', y / 14));
    stampRowsPal(p, x0 + 2, 2, BUST, BUST_PAL);
    p.outline(OUT);
    return { pix: p, top: 0 };
  }
  const fw = 22, fh = 26, x0 = Math.floor((W - fw) / 2);
  const p = new Pix(W, fh + 1);
  p.rect(x0, 0, fw, fh, GOLD.base); p.hline(x0, x0 + fw - 1, 0, GOLD.light); p.vline(x0, 0, fh - 1, GOLD.light);
  p.hline(x0, x0 + fw - 1, fh - 1, GOLD.dark); p.vline(x0 + fw - 1, 0, fh - 1, GOLD.dark);
  for (const [cx, cy] of [[x0 + 1, 1], [x0 + fw - 2, 1], [x0 + 1, fh - 2], [x0 + fw - 2, fh - 2]]) p.px(cx, cy, '#FFF0B0');
  const ix = x0 + 3, iy = 3, iw = fw - 6, ih = fh - 6;
  p.rect(ix - 1, iy - 1, iw + 2, ih + 2, GOLD.dark);
  for (let y = 0; y < ih; y++) p.hline(ix, ix + iw - 1, iy + y, mix('#5A4030', '#2A1C14', y / ih));
  const cx = ix + iw / 2, s = iw / 16;
  const P = (x, y) => [Math.round(ix + x * s), Math.round(iy + y * s)];
  // hombros y traje
  for (let y = 13; y < ih / s; y++) { const hw = 3 + (y - 13) * 1.4; const [a] = P(8 - hw, y), [b, yy] = P(8 + hw, y); p.hline(Math.max(ix, a), Math.min(ix + iw - 1, b), yy, '#26222C'); }
  const [cxp] = P(8, 0);
  for (let y = 14; y < ih / s; y++) { const [, yy] = P(0, y); const k = Math.round((y - 14) * 0.7 * s); p.hline(cxp - k - 1, cxp + k, yy, '#EDE8DC'); }
  for (let y = 15; y < ih / s; y++) { const [, yy] = P(0, y); p.px(cxp - 1, yy, '#8E1B1B'); p.px(cxp, yy, '#8E1B1B'); }
  // cabeza
  const [hx, hy] = P(8, 7.5);
  p.ellipse(hx, hy, 4.4 * s, 5.4 * s, '#E2B08C');
  p.ellipse(hx + 1.6 * s, hy + 0.6 * s, 2.4 * s, 4.4 * s, '#C9936E'); p.ellipse(hx - 0.6 * s, hy - 0.6 * s, 3.2 * s, 4.4 * s, '#E2B08C');
  p.ellipse(hx - 1.4 * s, hy - 3.6 * s, 1.6 * s, 0.9 * s, '#F4CFAE');
  // pelo blanco a los lados, cejas, ojos, nariz y el bigotazo
  for (const sx of [-1, 1]) { const [ex, ey] = P(8 + sx * 4.2, 6.5); p.ellipse(ex, ey, 1.2 * s, 2 * s, '#D8D8D8'); }
  const [e1x, e1y] = P(6.3, 7), [e2x] = P(9.7, 7);
  p.hline(e1x - 1, e1x + 1, e1y - 1, '#E8E8E8'); p.hline(e2x - 1, e2x + 1, e1y - 1, '#E8E8E8');
  p.px(e1x, e1y, '#2B2230'); p.px(e2x, e1y, '#2B2230');
  const [nx, ny] = P(8, 9); p.px(nx, ny, '#B37A58'); p.px(nx, ny - 1, '#C9936E');
  const [mx0, my] = P(4.6, 10.4), [mx1] = P(11.4, 10.4);
  p.hline(mx0 + 1, mx1 - 1, my, '#F2F2F2'); p.hline(mx0 + 1, mx1 - 1, my + 1, '#D6D6D6');
  p.px(mx0, my - 1, '#F2F2F2'); p.px(mx1, my - 1, '#F2F2F2'); p.px(mx0, my, '#F2F2F2'); p.px(mx1, my, '#F2F2F2');
  p.px(cx - 0.5, my + 1, '#F2F2F2');
  p.px(ix + 1, iy + 1, '#7A5A44'); p.px(ix + 2, iy + 1, '#7A5A44');
  p.rect(Math.round(cx) - 3, fh - 3, 6, 2, GOLD.light); p.hline(Math.round(cx) - 2, Math.round(cx) + 1, fh - 2, GOLD.dark);
  p.outline(OUT);
  return { pix: p, top: 0 };
}
// letrero de neón rosa "LIKE ♥"
function neonSign(W) {
  const s = 'LIKE ♥', fits2 = W >= textW(s) * 2 + 6, only = W < textW(s) + 7;
  const k = fits2 || only ? 2 : 1, str = only ? '♥' : s, tw = textW(str) * k, th = 5 * k;
  const pw = Math.min(W, tw + 6), ph = th + 6, x0 = Math.floor((W - pw) / 2), p = new Pix(W, ph + 1);
  const PANEL = '#2A1F33', PINK = '#FF4FB0', CORE = '#FFD1EC', HEART = '#FF2E63';
  p.rect(x0, 0, pw, ph, PANEL); p.hline(x0, x0 + pw - 1, 0, '#3E3048'); p.vline(x0, 0, ph - 1, '#3E3048');
  for (const [sx, sy] of [[x0 + 1, 1], [x0 + pw - 2, 1], [x0 + 1, ph - 2], [x0 + pw - 2, ph - 2]]) p.px(sx, sy, '#8C8098');
  const m = new Pix(tw + 2, th + 2), tx = Math.floor((pw - tw) / 2);
  bigText(m, 1, 1, str, PINK, k);
  if (!only) { const hx = 1 + (textW('LIKE ') + 1) * k; for (let y = 0; y < m.h; y++) for (let x = hx; x < m.w; x++) if (m.d[y * m.w + x]) m.d[y * m.w + x] = HEART; }
  const on = (x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h && m.d[y * m.w + x];
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const X = x0 + tx - 1 + x, Y = 3 - 1 + y, c = m.d[y * m.w + x];
    if (c) { const hi = k === 2 ? (x - 1) % 2 === 0 && (y - 1) % 2 === 0 : !on(x, y - 1); p.px(X, Y, hi ? (c === HEART ? '#FFB3C4' : CORE) : c); continue; }
    let near = 0;
    for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) { const cc = on(x + i, y + j); if (cc) near = Math.max(near, Math.abs(i) <= 1 && Math.abs(j) <= 1 ? 2 : 1); }
    if (near) p.px(X, Y, mix(PANEL, PINK, near === 2 ? 0.42 : 0.18));
  }
  p.outline(OUT);
  return { pix: p, top: 0 };
}
function rankingBoard(W) {
  const bw = Math.max(14, W < 48 ? W : W - 2), x0 = Math.floor((W - bw) / 2), h = 26, p = new Pix(W, h + 1);
  box(p, x0, 0, bw, h, '#C3C9D0', METAL.top, METAL.dark);
  p.rect(x0 + 1, 1, bw - 2, h - 2, '#1E2A44');
  const title = textW('RANKING') <= bw - 4 ? 'RANKING' : 'TOP';
  text(p, x0 + Math.floor((bw - textW(title)) / 2), 3, title, '#FFD54F', '#0E1626');
  const n = Math.max(2, Math.min(6, Math.floor((bw - 6) / 5))), base = h - 4, span = bw - 6;
  const cols = ['#FFC928', '#C0C8D0', '#D9884A', '#4C8DFF', '#3CC46A', '#FF5A4E'];
  for (let k = 0; k < n; k++) {
    const bx = x0 + 3 + Math.round(k * span / n), bwk = Math.max(2, Math.round(span / n) - 2), hh = Math.round((base - 14) * (1 - k / (n + 0.5)));
    p.rect(bx, base - hh, bwk, hh, cols[k]); p.vline(bx, base - hh, base - 1, shade(cols[k], 0.3)); p.hline(bx, bx + bwk - 1, base - hh, shade(cols[k], 0.4));
  }
  const cx = x0 + 3 + Math.floor((Math.round(span / n) - 2) / 2);
  const hy = base - (base - 14) - 3;
  p.hline(cx - 2, cx + 2, hy + 1, '#FFD54F'); p.px(cx - 2, hy, '#FFD54F'); p.px(cx, hy, '#FFD54F'); p.px(cx + 2, hy, '#FFD54F');
  p.hline(x0 + 2, x0 + bw - 3, base, '#E8E8E0');
  p.outline(OUT);
  return { pix: p, top: 0 };
}
function poster404(W) {
  const big = W >= 28, pw = big ? 26 : Math.max(14, W - 2), ph = big ? 30 : 22, x0 = Math.floor((W - pw) / 2), p = new Pix(W, ph + 1);
  p.rect(x0, 0, pw, ph, '#F4EFE0'); p.rect(x0 + 1, 1, pw - 2, ph - 2, '#1B1426');
  for (let y = 2; y < ph - 2; y += 2) p.hline(x0 + 1, x0 + pw - 2, y, '#211930');
  if (big) { bigText(p, x0 + 3, 5, '404', '#3EE6FF'); bigText(p, x0 + 2, 5, '404', '#FF3EA5'); }
  else { text(p, x0 + Math.floor((pw - 11) / 2) + 1, 4, '404', '#3EE6FF'); text(p, x0 + Math.floor((pw - 11) / 2), 4, '404', '#FF3EA5'); }
  const fy = big ? 19 : 12, fx = x0 + Math.floor(pw / 2);
  p.px(fx - 3, fy, '#F4EFE0'); p.px(fx + 2, fy, '#F4EFE0');
  p.hline(fx - 2, fx + 1, fy + 3, '#F4EFE0'); p.px(fx - 3, fy + 4, '#F4EFE0'); p.px(fx + 2, fy + 4, '#F4EFE0');
  if (big) { const t = 'ERROR'; text(p, x0 + Math.floor((pw - textW(t)) / 2), ph - 6, t, '#FF3EA5'); }
  p.outline(OUT);
  for (const tx of [x0 - 1, x0 + pw - 4]) { p.rect(tx, -1, 5, 3, '#F2EBC8CC'); }
  return { pix: p, top: 0 };
}
function trainWindow(W) {
  const ww = Math.max(14, W - 4), x0 = Math.floor((W - ww) / 2), h = 20, p = new Pix(W, h + 2);
  p.rect(x0, 0, ww, h, '#6E7580'); p.hline(x0, x0 + ww - 1, 0, '#8E959F'); p.hline(x0, x0 + ww - 1, h - 1, '#4E545C');
  for (const [cx, cy] of [[x0, 0], [x0 + ww - 1, 0], [x0, h - 1], [x0 + ww - 1, h - 1]]) p.px(cx, cy, null);
  const gx0 = x0 + 2, gx1 = x0 + ww - 3, gy0 = 2, gy1 = h - 4;
  for (let y = gy0; y <= gy1; y++) {
    const t = (y - gy0) / (gy1 - gy0);
    for (let x = gx0; x <= gx1; x++) {
      let c = t < 0.4 ? mix('#A9D8F2', '#DDF1FB', t / 0.4) : t < 0.6 ? '#9CCB84' : '#5E9E4E';
      const streak = hash(Math.floor(x / 7), y, 13) % 5;
      if (t >= 0.4 && t < 0.6 && streak === 0) c = '#7FB36E';
      if (t >= 0.6 && streak < 2) c = streak ? '#6FAF5E' : '#4E8A42';
      p.px(x, y, c);
    }
  }
  const px = gx0 + Math.floor(ww * 0.62);
  for (let y = gy0 + 2; y <= gy1; y++) { p.px(px, y, mix(p.get(px, y) || '#888888', '#6E6E6E', 0.5)); p.px(px + 1, y, mix(p.get(px + 1, y) || '#888888', '#6E6E6E', 0.3)); }
  p.hline(gx0, gx1, gy0, '#4E545C'); p.vline(gx0, gy0, gy1, '#4E545C');
  for (let k = 0; k < 4; k++) p.px(gx0 + 2 + k, gy0 + 4 - k, '#FFFFFF');
  p.rect(x0 - 1, h - 3, ww + 2, 3, '#9AA0A8'); p.hline(x0 - 1, x0 + ww, h - 3, '#C3C8CE'); p.hline(x0 - 1, x0 + ww, h - 1, '#6E757F');
  p.outline(OUT);
  return { pix: p, top: 0 };
}

// Decoración colgada en la pared de la oficina (se pinta con lift, no bloquea)
export function officeWallDeco(v, w = 1, o = {}) {
  const W = Math.max(1, w || 1) * T;
  switch (v) {
    case 'whiteboard': return whiteboard(W);
    case 'banner': return deptBanner(W, o);
    case 'window': return officeWindow(W);
    case 'screen': return bigScreen(W, o);
    case 'portrait': return portrait(W);
    case 'neon': return neonSign(W);
    case 'ranking': return rankingBoard(W);
    case 'poster404': return poster404(W);
    case 'train_window': return trainWindow(W);
    default: return null;
  }
}
