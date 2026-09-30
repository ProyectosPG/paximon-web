// Arte de los sitios de fuera de Vila Paxina (cafetería de Diego y Sabrina, estación de tren,
// Feria do Albariño en Cambados) y de la misión de la casa de Maricarmen. Mismo sistema que
// townart.js: todo pintado por código a 16 px por casilla, también renderizable en Node.
import {
  Pix, T, hash, rng, OUT, GRASS, PATH, WOOD, GRANITE, PLASTER, GLASS, DOOR, SLATE,
  paintGround as paintBaseGround, paintObject as paintBaseObject, groundShadow, trapezoidRoof,
  stoneBlocks, windowAt, doorAt, chimney, casa,
} from './townart.js';
import { mix, shade, avatarGrid } from './avatar.js';
// oficinas (sede, mansión, 404, centro de datos, tren, guarida del Algoritmo)
import { OFFICE_TILES, OFFICE_PAINTERS, officeWallDeco } from './officeart.js';

// ---------- letras de 3x5 para carteles ----------
const GLYPHS = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'], B: ['##.', '#.#', '##.', '#.#', '##.'], C: ['.##', '#..', '#..', '#..', '.##'],
  D: ['##.', '#.#', '#.#', '#.#', '##.'], E: ['###', '#..', '##.', '#..', '###'], F: ['###', '#..', '##.', '#..', '#..'],
  G: ['.##', '#..', '#.#', '#.#', '.##'], H: ['#.#', '#.#', '###', '#.#', '#.#'], I: ['###', '.#.', '.#.', '.#.', '###'],
  J: ['..#', '..#', '..#', '#.#', '.#.'], K: ['#.#', '#.#', '##.', '#.#', '#.#'], L: ['#..', '#..', '#..', '#..', '###'],
  M: ['#.#', '###', '###', '#.#', '#.#'], N: ['##.', '#.#', '#.#', '#.#', '#.#'], Ñ: ['###', '...', '##.', '#.#', '#.#'],
  O: ['.#.', '#.#', '#.#', '#.#', '.#.'], P: ['##.', '#.#', '##.', '#..', '#..'], Q: ['.#.', '#.#', '#.#', '##.', '.##'],
  R: ['##.', '#.#', '##.', '#.#', '#.#'], S: ['.##', '#..', '.#.', '..#', '##.'], T: ['###', '.#.', '.#.', '.#.', '.#.'],
  U: ['#.#', '#.#', '#.#', '#.#', '###'], V: ['#.#', '#.#', '#.#', '#.#', '.#.'], W: ['#.#', '#.#', '###', '###', '#.#'],
  X: ['#.#', '#.#', '.#.', '#.#', '#.#'], Y: ['#.#', '#.#', '.#.', '.#.', '.#.'], Z: ['###', '..#', '.#.', '#..', '###'],
  0: ['###', '#.#', '#.#', '#.#', '###'], 1: ['.#.', '##.', '.#.', '.#.', '###'], 2: ['##.', '..#', '.#.', '#..', '###'],
  3: ['##.', '..#', '.#.', '..#', '##.'], 4: ['#.#', '#.#', '###', '..#', '..#'], 5: ['###', '#..', '##.', '..#', '##.'],
  6: ['.##', '#..', '###', '#.#', '###'], 7: ['###', '..#', '.#.', '.#.', '.#.'], 8: ['###', '#.#', '###', '#.#', '###'],
  9: ['###', '#.#', '###', '..#', '##.'], '.': ['...', '...', '...', '...', '.#.'], ',': ['...', '...', '...', '.#.', '#..'],
  ':': ['...', '.#.', '...', '.#.', '...'], '-': ['...', '...', '###', '...', '...'], '+': ['...', '.#.', '###', '.#.', '...'],
  '&': ['.#.', '#.#', '.#.', '#.#', '.##'], '!': ['.#.', '.#.', '.#.', '...', '.#.'], '?': ['##.', '..#', '.#.', '...', '.#.'],
  '/': ['..#', '..#', '.#.', '#..', '#..'], "'": ['.#.', '.#.', '...', '...', '...'], '·': ['...', '...', '.#.', '...', '...'],
  '→': ['.#.', '..#', '###', '..#', '.#.'], '←': ['.#.', '#..', '###', '#..', '.#.'], '↑': ['.#.', '###', '.#.', '.#.', '.#.'],
  '♥': ['...', '#.#', '###', '###', '.#.'], '%': ['#.#', '..#', '.#.', '#..', '#.#'],
};
const upper = (s) => String(s).toUpperCase().replace(/[ÁÀÄ]/g, 'A').replace(/[ÉÈË]/g, 'E').replace(/[ÍÌÏ]/g, 'I')
  .replace(/[ÓÒÖ]/g, 'O').replace(/[ÚÙÜ]/g, 'U');
export function textW(s) { let w = 0; for (const ch of upper(s)) w += ch === ' ' ? 2 : 4; return Math.max(0, w - 1); }
export function text(p, x, y, s, c, shadowC = null) {
  for (const ch of upper(s)) {
    const g = GLYPHS[ch];
    if (g) for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (g[j][i] === '#') {
      if (shadowC) p.px(x + i + 1, y + j + 1, shadowC);
      p.px(x + i, y + j, c);
    }
    x += ch === ' ' ? 2 : 4;
  }
}
const textC = (p, cx, y, s, c, sh) => text(p, Math.round(cx - textW(s) / 2), y, s, c, sh);

export function flipPix(src) {
  const p = new Pix(src.w, src.h);
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) p.d[y * src.w + x] = src.d[y * src.w + (src.w - 1 - x)];
  return p;
}
function stampRows(p, x, y, rows, pal) {
  rows.forEach((row, j) => [...row].forEach((ch, i) => { if (pal[ch]) p.px(x + i, y + j, pal[ch]); }));
}

// ---------- logos y banderas ----------
// Logo de D.I.O Express (la llave roja con la casa), en grande y en pequeño
export const DIO_RED = '#C9433A', DIO_DARK = '#2B2B2B';
const DIO_KEY = [
  '.....RRRRR.....',
  '...RRRRRRRRR...',
  '..RRRRRRWRRRRR.',
  '.RRRRRRWWWRRRRR',
  '.RRRRRWWWWWRRRR',
  'RRRRRWWWWWWWRRR',
  'RRRRWWWWWWWWWRR',
  'RRRRRRWWWWWRRRR',
  'RRRRRRWWWWWRRRR',
  'RRRRRRWWWWWRRRR',
  '.RRRRRWWWWWRRR.',
  '.RRRRRRRRRRRRR.',
  '..RRRRRRRRRRR..',
  '...RRRRRRRRR...',
  '.....RRRRR.....',
  '......RRR......',
  '......RRRRR....',
  '......RRRRR....',
  '......RRR......',
  '......RRRRRR...',
  '......RRRRRR...',
  '......RRR......',
];
const DIO_KEY_S = [
  '...RRRRR...',
  '.RRRRWRRRR.',
  '.RRRWWWRRR.',
  'RRRWWWWWRRR',
  'RRWWWWWWWRR',
  'RRRRWWWRRRR',
  'RRRRWWWRRRR',
  '.RRRRRRRRR.',
  '..RRRRRRR..',
  '....RRR....',
  '....RRRR...',
  '....RRRR...',
  '....RRR....',
  '....RRRRR..',
  '....RRRRR..',
  '....RRR....',
];
export function dioLogo(p, x, y, small = false) {
  stampRows(p, x, y, small ? DIO_KEY_S : DIO_KEY, { R: DIO_RED, W: '#FFFFFF' });
}
// logo completo (llave + D.I.O / EXPRESS) en un Pix, para la ficha del personaje y el combate
export function dioBadge() {
  const p = new Pix(46, 24);
  dioLogo(p, 31, 1);
  text(p, 12, 8, 'D.I.O', DIO_DARK);
  text(p, 2, 16, 'EXPRESS', DIO_RED);
  return p;
}
// bandera de Venezuela: amarillo, azul con el arco de ocho estrellas y rojo
export function vzFlag(p, x, y, w = 18, h = 12, wave = 0) {
  const band = h / 3;
  for (let i = 0; i < w; i++) {
    const dy = wave ? Math.round(Math.sin((i / w) * Math.PI * 2 + wave) * 1) : 0;
    for (let j = 0; j < h; j++) {
      const c = j < band ? '#FFCC00' : j < band * 2 ? '#00247D' : '#CF142B';
      p.px(x + i, y + j + dy, (i === 0 && wave) ? shade(c, -0.2) : c);
    }
    // estrellas: un arco en la franja azul
    const cx = w / 2, rx = w * 0.3, ry = band * 0.9;
    for (let s = 0; s < 8; s++) {
      const a = Math.PI * (1.12 + (s / 7) * 0.76);
      const sx = Math.round(x + cx + Math.cos(a) * rx - 0.5), sy = Math.round(y + band * 1.85 + Math.sin(a) * ry);
      if (sx === x + i) p.px(sx, sy + dy, '#FFFFFF');
    }
  }
}

// ---------- casillas nuevas ----------
const ASPHALT = { base: '#6E7078', dark: '#5E6068', light: '#858790', line: '#F1EFE6', curb: '#B9B4A8' };
const BALLAST = { base: '#8E857A', light: '#A99F92', dark: '#6C645A' };
const SLEEPER = { base: '#6E4B33', dark: '#4E3322', light: '#8A6445' };
const RAIL = { top: '#E2E6EA', mid: '#9AA2AB', dark: '#4E545C' };
const CONCRETE = { base: '#CBC7BE', light: '#DEDAD2', dark: '#AFAAA0', seam: '#9E998E' };
const FLOOR = { a: '#F0E4C8', b: '#C4834F', ad: '#DCCDAB', bd: '#A96C3E' };
const WALL = { base: '#F2D9A0', light: '#F8E7BE', dark: '#DDBF80', wood: '#8B5A2B', woodL: '#A8723F', woodD: '#5E3B1C', top: '#6B4A2E' };

function gravel(p, X, Y, h) {
  p.rect(X, Y, T, T, BALLAST.base);
  const r = rng(h);
  for (let k = 0; k < 26; k++) { const x = X + Math.floor(r() * 16), y = Y + Math.floor(r() * 16); p.px(x, y, r() < 0.5 ? BALLAST.light : BALLAST.dark); }
}
const TILES = {
  asphalt(p, X, Y, h, n) {
    p.rect(X, Y, T, T, ASPHALT.base);
    const r = rng(h);
    for (let k = 0; k < 10; k++) p.px(X + Math.floor(r() * 16), Y + Math.floor(r() * 16), r() < 0.5 ? ASPHALT.dark : ASPHALT.light);
    if (n.u !== 'asphalt') { p.hline(X, X + 15, Y, ASPHALT.curb); p.hline(X, X + 15, Y + 1, shade(ASPHALT.curb, -0.2)); }
    if (n.d !== 'asphalt') { p.hline(X, X + 15, Y + 15, ASPHALT.curb); p.hline(X, X + 15, Y + 14, shade(ASPHALT.curb, -0.3)); }
    if (n.d === 'asphalt' && n.u !== 'asphalt' && (X / T) % 2 === 0) p.rect(X + 3, Y + 15, 10, 1, ASPHALT.line);
    if (n.u === 'asphalt' && n.d !== 'asphalt' && (X / T) % 2 === 0) p.rect(X + 3, Y, 10, 1, ASPHALT.line);
  },
  ballast(p, X, Y, h) { gravel(p, X, Y, h); },
  rail_t(p, X, Y, h) {
    gravel(p, X, Y, h);
    for (let x = X + 1; x < X + 16; x += 8) { p.rect(x, Y + 6, 4, 10, SLEEPER.base); p.vline(x, Y + 6, Y + 15, SLEEPER.light); p.vline(x + 3, Y + 6, Y + 15, SLEEPER.dark); }
    p.hline(X, X + 15, Y + 9, RAIL.top); p.hline(X, X + 15, Y + 10, RAIL.mid); p.hline(X, X + 15, Y + 11, RAIL.dark);
  },
  rail_b(p, X, Y, h) {
    gravel(p, X, Y, h + 1);
    for (let x = X + 1; x < X + 16; x += 8) { p.rect(x, Y, 4, 10, SLEEPER.base); p.vline(x, Y, Y + 9, SLEEPER.light); p.vline(x + 3, Y, Y + 9, SLEEPER.dark); p.hline(x, x + 3, Y + 9, SLEEPER.dark); }
    p.hline(X, X + 15, Y + 4, RAIL.top); p.hline(X, X + 15, Y + 5, RAIL.mid); p.hline(X, X + 15, Y + 6, RAIL.dark);
  },
  platform(p, X, Y, h, n) {
    p.rect(X, Y, T, T, CONCRETE.base);
    for (let i = 0; i < 16; i++) { p.px(X + i, Y + 7, CONCRETE.seam); p.px(X + i, Y + 15, CONCRETE.seam); }
    p.vline(X + 15, Y, Y + 15, CONCRETE.seam); p.vline(X + 7, Y + 8, Y + 14, CONCRETE.seam);
    p.hline(X, X + 14, Y, CONCRETE.light);
    if (hash(X, Y, 3) % 5 === 0) p.px(X + 4 + (h % 7), Y + 3 + (h % 3), CONCRETE.dark);
    if (n.u === 'rail_b' || n.u === 'ballast') {
      p.hline(X, X + 15, Y, '#4A4640'); p.hline(X, X + 15, Y + 1, '#F4F2EC'); p.hline(X, X + 15, Y + 2, '#E8E5DD');
      p.rect(X, Y + 4, 16, 3, '#F2C12E'); for (let i = 1; i < 16; i += 3) p.px(X + i, Y + 5, '#D9A514');
    }
  },
  floor(p, X, Y) {
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const gx = X + x, gy = Y + y, a = (Math.floor(gx / 8) + Math.floor(gy / 8)) % 2 === 0;
      let c = a ? FLOOR.a : FLOOR.b;
      if (gx % 8 === 7 || gy % 8 === 7) c = a ? FLOOR.ad : FLOOR.bd;
      p.px(gx, gy, c);
    }
  },
  mat(p, X, Y) {
    TILES.floor(p, X, Y);
    p.rect(X + 1, Y + 3, 14, 11, '#9C2F2F'); p.rect(X + 2, Y + 4, 12, 9, '#B83C3C');
    for (let i = X + 3; i < X + 13; i += 2) p.vline(i, Y + 5, Y + 11, '#A53434');
  },
  wall_in(p, X, Y, h, n) {
    p.rect(X, Y, T, T, WALL.base);
    for (let y = 0; y < T; y++) if ((X + y * 3) % 11 === 0) p.px(X + (y * 5) % 16, Y + y, WALL.light);
    if (n.u !== 'wall_in') { p.rect(X, Y, T, 4, WALL.top); p.hline(X, X + 15, Y + 4, WALL.dark); p.hline(X, X + 15, Y + 3, shade(WALL.top, 0.2)); }
    if (n.d !== 'wall_in') {
      p.rect(X, Y + 6, T, 10, WALL.wood); p.hline(X, X + 15, Y + 6, WALL.woodL); p.hline(X, X + 15, Y + 5, WALL.dark);
      for (let x = X + 3; x < X + 16; x += 5) p.vline(x, Y + 8, Y + 13, WALL.woodD);
      p.hline(X, X + 15, Y + 14, WALL.woodD); p.hline(X, X + 15, Y + 15, '#3E2612');
    }
  },
  void(p, X, Y) { p.rect(X, Y, T, T, '#1A1420'); },
  granite(p, X, Y, h) {
    // losas grandes de granito (rúas de Cambados)
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const gx = X + x, gy = Y + y, row = Math.floor(gy / 12), off = (row % 2) * 9;
      const lx = (gx + off) % 18, ly = gy % 12;
      let c = GRANITE.base;
      if (lx === 17 || ly === 11) c = GRANITE.mortar;
      else if (lx === 0 || ly === 0) c = GRANITE.light;
      else if (hash(gx, gy, 5) % 17 === 0) c = GRANITE.dark;
      else if (hash(gx >> 1, gy >> 1, 9) % 29 === 0) c = '#C9C2B5';
      p.px(gx, gy, c);
    }
  },
  vines(p, X, Y, h) {
    // viña en emparrado: tierra, postes de granito y racimos
    p.rect(X, Y, T, T, '#7A5A3A');
    const r = rng(h);
    for (let k = 0; k < 8; k++) p.px(X + Math.floor(r() * 16), Y + Math.floor(r() * 16), '#8E6B47');
    p.rect(X + 1, Y + 1, 14, 11, '#3F8A3A');
    for (let k = 0; k < 18; k++) { const x = X + 1 + Math.floor(r() * 14), y = Y + 1 + Math.floor(r() * 10); p.px(x, y, r() < 0.5 ? '#5DAA4E' : '#2F6B2C'); }
    const gx = X + 3 + Math.floor(r() * 8), gy = Y + 7;
    for (const [dx, dy] of [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [1, 2]]) p.px(gx + dx, gy + dy, dy === 0 && dx === 0 ? '#E7F2A0' : '#B8CF5A');
    p.rect(X + 7, Y + 12, 2, 4, GRANITE.light); p.px(X + 8, Y + 15, GRANITE.dark);
  },
};
export const SOLID_TILES = new Set(['water', 'wall_in', 'rail_t', 'rail_b', 'ballast', 'void', 'vines']);
// las casillas de officeart.js se juntan al pintar (importación circular: no tocarlas al cargar)
let ALL_TILES = null;
export function paintGround(map, frame = 0) { return paintBaseGround(map, frame, ALL_TILES ||= { ...OFFICE_TILES, ...TILES }); }

// ---------- cafetería de Diego y Sabrina ----------
function shopWindow(p, x, y, w, h) {
  p.rect(x - 2, y - 2, w + 4, h + 4, '#4A2C18');
  p.rect(x, y, w, h, '#FFE7A8');
  for (let j = 0; j < h; j++) p.hline(x, x + w - 1, y + j, mix('#FFF4D1', '#F2B866', j / h));
  // interior: barra, tazas y un ventilador de techo
  p.rect(x, y + h - 6, w, 6, '#8B5A2B'); p.hline(x, x + w - 1, y + h - 6, '#C68D52');
  for (let i = x + 3; i < x + w - 3; i += 7) { p.rect(i, y + h - 9, 3, 3, '#FFFFFF'); p.px(i + 3, y + h - 8, '#FFFFFF'); }
  p.hline(x + w / 2 - 5, x + w / 2 + 5, y + 3, '#6B4A2E'); p.vline(x + w / 2, y, y + 3, '#6B4A2E');
  p.px(x + 2, y + 2, '#FFFFFF'); p.px(x + 3, y + 2, '#FFFFFF'); p.px(x + 2, y + 3, '#FFFFFF');
  p.vline(x + Math.floor(w / 2) - 1, y, y + h - 7, '#4A2C18');
}
function awning(p, x, y, w, c1, c2, h = 7) {
  for (let i = 0; i < w; i++) {
    const c = Math.floor(i / 4) % 2 ? c2 : c1;
    for (let j = 0; j < h; j++) p.px(x + i, y + j, j === 0 ? shade(c, -0.25) : j < 2 ? shade(c, 0.12) : c);
    const sc = Math.floor(i / 4) % 2 ? 1 : 0;
    p.px(x + i, y + h, i % 4 === 0 || i % 4 === 3 ? null : c);
    if (sc) p.px(x + i, y + h + 1, (i % 4 === 1 || i % 4 === 2) ? c : null);
  }
  p.hline(x, x + w - 1, y - 1, OUT);
}
function cafe(w, h, { door = 3 } = {}) {
  const W = w * T, H = h * T, top = 10;
  const p = new Pix(W, H + top); p.oy = top;
  const roofH = 28;
  chimney(p, W - 24, -8, 7, 16);
  stoneBlocks(p, 3, roofH - 1, W - 6, H - roofH + 1, 31);
  p.vline(3, roofH - 1, H - 1, OUT); p.vline(W - 4, roofH - 1, H - 1, OUT); p.hline(3, W - 4, H - 1, OUT);
  trapezoidRoof(p, 0, 0, W, roofH, '#B5533A');
  // letrero
  const bw = 70, bx = Math.round(W / 2 - bw / 2), by = roofH + 1;
  p.rect(bx - 1, by - 1, bw + 2, 16, OUT); p.rect(bx, by, bw, 14, '#3E2A1E'); p.hline(bx, bx + bw - 1, by, '#5C4030');
  textC(p, W / 2, by + 2, 'CAFETERÍA', '#FFE9C2');
  textC(p, W / 2, by + 8, 'DIEGO & SABRINA', '#FFC94A');
  vzFlag(p, bx - 12, by + 2, 9, 6); vzFlag(p, bx + bw + 3, by + 2, 9, 6);
  // escaparates con toldo y la puerta
  const dx = door * T;
  shopWindow(p, 9, H - 24, 30, 18); shopWindow(p, W - 39, H - 24, 30, 18);
  awning(p, 6, H - 32, 36, '#7A3E1D', '#F3E3C3'); awning(p, W - 42, H - 32, 36, '#7A3E1D', '#F3E3C3');
  doorAt(p, dx + 2, H - 22, 12, 21, { color: '#6D3B1F' });
  p.rect(dx + 4, H - 20, 8, 7, GLASS.base); p.px(dx + 5, H - 19, GLASS.light);
  // pizarra en la acera
  p.rect(dx + 17, H - 12, 9, 11, '#3E2A1E'); p.rect(dx + 18, H - 11, 7, 7, '#2F3A33');
  p.hline(dx + 19, dx + 23, H - 9, '#E8E8E0'); p.hline(dx + 19, dx + 22, H - 7, '#E8E8E0');
  p.oy = 0; p.outline(OUT);
  return { pix: p, top };
}
function vflagPole() {
  const p = new Pix(28, 52), top = 36; p.oy = top;
  p.rect(1, 12, 6, 4, GRANITE.base); p.hline(1, 6, 12, GRANITE.light);
  p.rect(3, -34, 2, 47, '#8C8F96'); p.vline(3, -34, 12, '#B5B9C0'); p.rect(2, -36, 4, 2, '#E0B43A');
  vzFlag(p, 5, -33, 20, 13, 1.2);
  p.oy = 0; p.outline(OUT);
  return { pix: p, top };
}
function terrace(v = 0) {
  const p = new Pix(16, 34), top = 18; p.oy = top;
  const c = ['#C62828', '#1565C0', '#F9A825'][v % 3];
  // sillas, mesa y sombrilla
  for (const x of [0, 12]) { p.rect(x, 6, 4, 6, '#9C6B3E'); p.rect(x, 2, 4, 2, '#B98552'); p.vline(x, 12, 15, '#5E3B1C'); p.vline(x + 3, 12, 15, '#5E3B1C'); }
  p.ellipse(8, 8, 5.5, 2.4, '#ECECEC'); p.hline(4, 12, 10, '#BDBDBD'); p.rect(7, 10, 2, 5, '#6F737A');
  p.px(6, 7, '#FFFFFF'); p.px(10, 7, '#6D3B1F');
  p.vline(8, -12, 8, '#6F737A');
  for (let j = 0; j < 8; j++) {
    const hw = 2 + j * 1.1;
    for (let i = Math.floor(8 - hw); i <= Math.ceil(8 + hw); i++) p.px(i, -18 + j, j === 7 ? shade(c, -0.3) : (Math.floor((i + 16) / 3) % 2 ? c : '#FFFFFF'));
  }
  p.oy = 0; p.outline(OUT);
  return { pix: p, top };
}
function car(v = '#4F83C2') {
  const p = new Pix(32, 22), top = 6; p.oy = top;
  const dk = shade(v, -0.3), lt = shade(v, 0.25);
  p.rect(1, 5, 30, 9, v); p.hline(1, 30, 5, lt); p.hline(1, 30, 13, dk);
  p.rect(6, -3, 18, 8, v); p.hline(7, 23, -4, lt);
  p.rect(8, -2, 6, 6, GLASS.base); p.rect(16, -2, 6, 6, GLASS.base); p.px(9, -1, GLASS.light); p.px(17, -1, GLASS.light);
  p.rect(0, 9, 2, 3, '#FFE082'); p.rect(30, 9, 2, 3, '#E53935');
  p.hline(3, 28, 10, dk); p.px(13, 8, dk); p.px(21, 8, dk);
  for (const x of [7, 24]) { p.ellipse(x, 14, 3.4, 3.4, '#222228'); p.ellipse(x, 14, 1.4, 1.4, '#9EA3AA'); }
  p.oy = 0; p.outline(OUT);
  groundShadow(p, 16, 21, 14, 1.2);
  return { pix: p, top };
}
// furgoneta de D.I.O Express (mirando a la izquierda) con el logo
function van() {
  const p = new Pix(64, 38), top = 6; p.oy = top;
  // caja
  p.rect(18, 0, 45, 24, '#F7F7F4'); p.hline(18, 62, 0, '#FFFFFF'); p.hline(18, 62, 23, '#D8D8D2');
  p.rect(18, 19, 45, 3, DIO_RED);
  // cabina
  for (let y = 4; y < 24; y++) { const x0 = y < 12 ? 12 - (y - 4) * 0.6 : 7; p.hline(Math.round(x0), 18, y, '#F2F2EE'); }
  for (let y = 6; y < 13; y++) p.hline(Math.round(12 - (y - 4) * 0.6) + 1, 16, y, GLASS.base);
  p.px(12, 7, GLASS.light); p.px(13, 7, GLASS.light);
  p.rect(5, 22, 58, 4, '#3A3A42'); p.rect(4, 17, 4, 3, '#FFE082');
  p.rect(7, 19, 12, 3, DIO_RED);
  dioLogo(p, 22, 2, true);
  text(p, 36, 4, 'D.I.O', DIO_DARK);
  text(p, 34, 11, 'EXPRESS', DIO_RED);
  for (const x of [14, 52]) { p.ellipse(x, 26, 4.2, 4.2, '#1E1E24'); p.ellipse(x, 26, 1.8, 1.8, '#A7ACB3'); }
  p.oy = 0; p.outline(OUT);
  groundShadow(p, 34, 37, 30, 1.2);
  return { pix: p, top };
}
// cartel de la casa cuando se la queda el de DIO Express
function dioHouse(o) {
  const base = casa(o.w, o.h, o.color, { door: o.door, seed: o.seed, small: o.type === 'casita' });
  const p = base.pix, W = o.w * T;
  p.oy = base.top;
  const bx = 5, by = 31;
  p.rect(bx, by, 25, 25, '#FFFFFF'); p.hline(bx, bx + 24, by, '#E0E0E0');
  p.hline(bx - 1, bx + 25, by - 1, OUT); p.vline(bx - 1, by - 1, by + 25, OUT); p.vline(bx + 25, by - 1, by + 25, OUT); p.hline(bx - 1, bx + 25, by + 25, OUT);
  dioLogo(p, bx + 5, by + 2, true);
  p.rect(bx + 1, by + 19, 23, 5, DIO_RED); text(p, bx + 2, by + 19, 'D.I.O', '#FFFFFF');
  // precinto en la puerta
  const dx = o.door * T + 2;
  for (let i = 0; i < 14; i++) { p.px(dx - 1 + i, o.h * T - 17 + Math.round(i * 0.55), '#FFD600'); p.px(dx - 1 + i, o.h * T - 9 - Math.round(i * 0.55), '#FFD600'); }
  p.oy = 0;
  void W;
  return base;
}

// ---------- estación ----------
function station(w, h, { door = 7 } = {}) {
  const W = w * T, H = h * T, top = 28;
  const p = new Pix(W, H + top); p.oy = top;
  const roofH = 24, WALLC = { base: '#EFE0BE', shade: '#D9C79F', dark: '#C4B083' }, BRICK = '#A5472F', BRICKL = '#C2603F';
  p.rect(3, roofH - 1, W - 6, H - roofH + 1, WALLC.base);
  p.hline(3, W - 4, roofH, WALLC.dark); p.hline(3, W - 4, roofH + 1, WALLC.shade);
  // zócalo de granito y pilastras de ladrillo
  stoneBlocks(p, 3, H - 6, W - 6, 6, 12);
  for (let x = 3; x < W - 6; x += 30) {
    p.rect(x, roofH, 6, H - roofH - 6, BRICK);
    for (let y = roofH + 2; y < H - 6; y += 4) p.hline(x, x + 5, y, BRICKL);
  }
  p.rect(W - 9, roofH, 6, H - roofH - 6, BRICK);
  trapezoidRoof(p, 0, 0, W, roofH, SLATE, { inset: 3, course: 4 });
  // frontón con el reloj
  const cx = Math.round(W / 2);
  for (let j = 0; j < 22; j++) { const hw = 6 + j * 1.6; p.hline(Math.round(cx - hw), Math.round(cx + hw), -24 + j, j < 2 ? BRICK : WALLC.base); p.px(Math.round(cx - hw), -24 + j, BRICK); p.px(Math.round(cx + hw), -24 + j, BRICK); }
  p.hline(cx - 42, cx + 42, -2, BRICK); p.hline(cx - 42, cx + 42, -1, BRICKL);
  p.ellipse(cx, -11, 7.5, 7.5, OUT); p.ellipse(cx, -11, 6.5, 6.5, '#FFFFFF');
  p.vline(cx, -16, -11, OUT); p.hline(cx, cx + 4, -11, OUT); p.px(cx, -11, '#C62828');
  for (const [dx, dy] of [[0, -6], [6, 0], [0, 6], [-6, 0]]) p.px(cx + dx, -11 + dy, '#555');
  // letrero azul
  const label = 'ESTACIÓN DE VILA PAXINA', bw = textW(label) + 10;
  p.rect(cx - bw / 2 - 1, roofH + 3, bw + 2, 11, OUT); p.rect(cx - bw / 2, roofH + 4, bw, 9, '#123C7A');
  textC(p, cx, roofH + 6, label, '#FFFFFF');
  // ventanas en arco
  const winXs = [];
  for (let x = 16; x < W - 20; x += 30) if (Math.abs(x + 6 - cx) > 16) winXs.push(x);
  for (const x of winXs) {
    p.rect(x - 2, roofH + 18, 16, H - roofH - 26, BRICK);
    p.rect(x, roofH + 20, 12, H - roofH - 30, GLASS.dark); p.rect(x + 1, roofH + 21, 10, H - roofH - 33, GLASS.base);
    for (let i = 0; i < 12; i++) { const a = Math.round(3 * (1 - Math.sqrt(Math.max(0, 1 - ((i + 0.5 - 6) / 6) ** 2)))); for (let j = 0; j < a; j++) p.px(x + i, roofH + 20 + j, BRICK); }
    p.vline(x + 6, roofH + 21, H - 11, '#FDFDFD'); p.hline(x, x + 11, roofH + 30, '#FDFDFD');
    p.px(x + 2, roofH + 23, GLASS.light); p.px(x + 3, roofH + 23, GLASS.light);
  }
  // puerta principal (taquilla)
  const dx = door * T - 4;
  doorAt(p, dx, H - 26, 24, 25, { arch: true, color: '#2E5E3E' });
  p.rect(dx + 2, H - 22, 20, 7, GLASS.base); p.vline(dx + 12, H - 22, H - 2, '#1F4029');
  p.oy = 0; p.outline(OUT);
  return { pix: p, top };
}
// panel de salidas: el motor escribe encima el texto que pasa (led)
function departures() {
  const p = new Pix(64, 46), top = 30; p.oy = top;
  for (const x of [8, 53]) { p.rect(x, -4, 3, 20, '#4A4E57'); p.vline(x, -4, 15, '#6B707B'); }
  p.rect(0, -30, 64, 30, '#2A2D34'); p.hline(0, 63, -30, '#4A4E57');
  p.rect(2, -28, 60, 7, '#123C7A'); text(p, 4, -27, 'SALIDAS', '#FFFFFF'); text(p, 38, -27, 'VÍA', '#FFD54F');
  p.rect(2, -20, 60, 18, '#0B0B0D');
  p.oy = 0; p.outline(OUT);
  return { pix: p, top, led: { x: 3, y: 10, w: 58, h: 16 } };
}
function stationClock() {
  const p = new Pix(16, 44), top = 28; p.oy = top;
  p.rect(7, -12, 2, 27, '#3A3A48'); p.rect(5, 13, 6, 3, '#3A3A48');
  p.ellipse(8, -19, 7, 7, '#3A3A48'); p.ellipse(8, -19, 5.6, 5.6, '#FFFFFF');
  p.vline(8, -23, -19, OUT); p.hline(8, 11, -19, OUT);
  p.oy = 0; p.outline(OUT);
  return { pix: p, top };
}
function vending() {
  const p = new Pix(16, 30), top = 14; p.oy = top;
  p.rect(1, -13, 14, 28, '#C62828'); p.vline(1, -13, 14, '#E57373'); p.vline(14, -13, 14, '#8E1B1B');
  p.rect(3, -10, 7, 14, '#1D2833');
  for (let y = -9; y < 3; y += 4) for (let x = 4; x < 9; x += 2) p.px(x, y, ['#FFD54F', '#64B5F6', '#81C784'][(x + y + 30) % 3]);
  p.rect(11, -9, 2, 5, '#B0BEC5'); p.rect(4, 7, 8, 3, '#222');
  p.rect(2, -3, 12, 4, '#FFFFFF'); text(p, 3, -3, 'OFF', '#C62828');
  p.oy = 0; p.outline(OUT);
  return { pix: p, top };
}
// tren de pasajeros (se mueve por las vías; dir 1 = hacia la derecha)
export function paintTrain(dir = 1, cars = 3) {
  const CW = 60, H = 30, p = new Pix(CW * cars + 8, H + 2);
  const BODY = '#F2F2EE', STRIPE = '#7B2D8E', STRIPE2 = '#C62828', WIN = '#34495E';
  for (let k = 0; k < cars; k++) {
    const x0 = k * CW + 2;
    p.rect(x0, 3, CW - 2, 22, BODY); p.hline(x0, x0 + CW - 3, 3, '#FFFFFF'); p.rect(x0, 1, CW - 2, 3, '#9AA2AB');
    p.rect(x0, 19, CW - 2, 3, STRIPE); p.hline(x0, x0 + CW - 3, 22, STRIPE2);
    for (let wx = x0 + 6; wx < x0 + CW - 8; wx += 9) { p.rect(wx, 7, 6, 7, WIN); p.px(wx + 1, 8, '#8FB3D9'); p.px(wx + 2, 8, '#8FB3D9'); }
    p.rect(x0 + CW / 2 - 3, 6, 6, 15, STRIPE2); p.rect(x0 + CW / 2 - 2, 8, 4, 5, WIN);
    p.rect(x0, 25, CW - 2, 3, '#3A3F47');
    for (const wx of [x0 + 9, x0 + 16, x0 + CW - 18, x0 + CW - 11]) { p.ellipse(wx, 28, 2.6, 2.6, '#1E1E24'); p.px(wx, 28, '#9AA2AB'); }
    if (k) p.rect(x0 - 2, 10, 2, 12, '#3A3F47');
  }
  // morro redondeado con el parabrisas
  const nx = CW * cars;
  for (let y = 3; y < 28; y++) { const ext = Math.round(Math.sqrt(Math.max(0, 1 - ((y - 16) / 13) ** 2)) * 7); p.hline(nx, nx + ext, y, y >= 19 && y < 22 ? STRIPE : y >= 25 ? '#3A3F47' : BODY); }
  p.rect(nx, 6, 5, 8, WIN); p.px(nx + 1, 7, '#8FB3D9');
  p.rect(nx + 3, 16, 3, 2, '#FFF59D');
  p.rect(CW + 20, -1, 10, 2, '#555A63'); p.vline(CW + 22, 0, 1, '#555A63');
  p.outline(OUT);
  return dir > 0 ? p : flipPix(p);
}

// ---------- Cambados: Feria do Albariño ----------
const CASETA_COLORS = ['#C62828', '#1565C0', '#2E7D32', '#F9A825', '#6A1B9A', '#EF6C00', '#00838F', '#AD1457'];
const SELLERS = [
  [{ skin: 1, hair: 6, style: 'corto' }, '#2E7D32', ['mustache', 'apron']],
  [{ skin: 0, hair: 3, style: 'mono' }, '#6A1B9A', ['apron']],
  [{ skin: 2, hair: 0, style: 'rizos' }, '#1565C0', ['apron']],
  [{ skin: 1, hair: 5, style: 'largo' }, '#C62828', ['apron']],
  [{ skin: 0, hair: 1, style: 'corto' }, '#EF6C00', ['glasses', 'apron']],
  [{ skin: 3, hair: 4, style: 'corto' }, '#00838F', ['apron']],
];
function bottle(p, x, y) {
  p.rect(x, y + 3, 3, 6, '#2E6B34'); p.rect(x + 1, y, 1, 3, '#2E6B34'); p.px(x + 1, y - 1, '#E0B43A');
  p.rect(x, y + 5, 3, 2, '#F5F0E0'); p.px(x, y + 3, '#5FA066');
}
function cunca(p, x, y) {
  p.hline(x, x + 4, y, '#FFFFFF'); p.hline(x, x + 4, y + 1, '#E8EEF5'); p.hline(x + 1, x + 3, y + 2, '#C9D6E6');
  p.px(x, y + 1, '#2F6DB5'); p.px(x + 4, y + 1, '#2F6DB5'); p.hline(x + 1, x + 3, y, '#F2E9A5');
}
function caseta(o) {
  const v = o.variant || 0, col = CASETA_COLORS[v % CASETA_COLORS.length];
  const W = 48, H = 48, top = 20;
  const p = new Pix(W, H + top); p.oy = top;
  // postes y fondo de tablas
  for (const x of [0, 45]) { p.rect(x, -12, 3, 60, WOOD.base); p.vline(x, -12, 47, WOOD.light); p.vline(x + 2, -12, 47, WOOD.dark); }
  p.rect(3, -4, 42, 38, '#C99A62');
  for (let x = 3; x < 45; x += 6) p.vline(x, -4, 33, '#A87C4A');
  for (const sy of [4, 15]) {
    p.rect(3, sy, 42, 2, '#7A4E27'); p.hline(3, 44, sy + 2, '#5E3B1C');
    for (let x = 5; x < 43; x += 5) bottle(p, x, sy - 9);
  }
  // quien atiende, detrás del mostrador
  const [look, shirt, extras] = SELLERS[(o.seed || v) % SELLERS.length];
  const g = avatarGrid(look, shirt, 'down', 0, extras);
  for (let y = 0; y < 17; y++) for (let x = 0; x < 16; x++) if (g[y][x]) p.px(16 + x, 13 + y, g[y][x]);
  // mostrador
  p.rect(1, 30, 46, 3, '#E0B98A'); p.hline(1, 46, 30, '#F2D2A8'); p.hline(1, 46, 32, '#9C6B3E');
  p.rect(2, 33, 44, 15, '#9C6B3E');
  for (let x = 4; x < 46; x += 5) p.vline(x, 34, 46, '#7A4E27');
  p.rect(6, 36, 36, 9, '#FFFFFF'); p.rect(7, 37, 34, 7, '#2F6DB5');
  textC(p, 24, 38, 'ALBARIÑO', '#FFFFFF');
  cunca(p, 4, 27); cunca(p, 38, 27); bottle(p, 33, 21);
  // toldo a rayas y nombre de la bodega
  for (let y = -12; y < -3; y++) for (let x = -1; x < 49; x++) {
    const c = Math.floor((x + 1) / 6) % 2 ? '#FFFFFF' : col;
    p.px(x, y, y === -12 ? shade(c, -0.3) : y > -6 ? shade(c, -0.12) : c);
  }
  for (let x = -1; x < 49; x++) if ((x + 1) % 6 !== 0 && (x + 1) % 6 !== 5) p.px(x, -3, Math.floor((x + 1) / 6) % 2 ? '#FFFFFF' : shade(col, -0.12));
  const name = o.short || 'ADEGA';
  const bw = Math.min(46, textW(name) + 6);
  p.rect(24 - bw / 2, -20, bw, 8, '#3E2A1E'); p.hline(24 - bw / 2, 24 + bw / 2 - 1, -20, '#5C4030');
  textC(p, 24, -19, name, '#FFE9C2');
  p.oy = 0; p.outline(OUT);
  return { pix: p, top };
}
function barrel(v = 0) {
  const p = new Pix(16, 24), top = 8; p.oy = top;
  for (let y = -4; y < 15; y++) {
    const bulge = Math.round(Math.sin(((y + 4) / 18) * Math.PI) * 1.5);
    for (let x = 2 - bulge; x <= 13 + bulge; x++) p.px(x, y, (x % 3 === 0) ? '#6E4526' : x < 6 ? '#A8723F' : '#8A5A33');
  }
  for (const y of [-2, 5, 12]) p.hline(1, 14, y, '#3A3A40');
  p.ellipse(8, -5, 6, 2.2, '#B98552'); p.ellipse(8, -5, 4.5, 1.2, '#9C6B3E');
  if (v !== 1) { cunca(p, 3, -8); cunca(p, 9, -7); }
  if (v === 1) bottle(p, 7, -14);
  p.oy = 0; p.outline(OUT);
  groundShadow(p, 8, 23, 6, 1);
  return { pix: p, top };
}
function crates() {
  const p = new Pix(16, 22), top = 6; p.oy = top;
  for (const [x, y] of [[1, 5], [1, -4]]) {
    p.rect(x, y, 14, 9, '#C99A62'); p.hline(x, x + 13, y, '#E0B98A'); p.hline(x, x + 13, y + 8, '#8A5A33');
    for (let i = x + 2; i < x + 13; i += 3) { p.px(i, y + 2, '#2E6B34'); p.px(i, y + 3, '#2E6B34'); }
  }
  p.oy = 0; p.outline(OUT);
  return { pix: p, top };
}
// banderines por encima de la calle (se pintan por encima de la gente)
function garland(w) {
  const W = w * T, p = new Pix(W, 18);
  const COLS = ['#1E6FD9', '#FFFFFF', '#F9C80E', '#2E9E48', '#E53935'];
  const span = 48;
  let k = 0;
  for (let x = 0; x < W; x++) {
    const t = (x % span) / span, y = 2 + Math.round(Math.sin(t * Math.PI) * 5);
    p.px(x, y, '#3A3A48');
    if (x % 7 === 3) {
      const c = COLS[k++ % COLS.length];
      for (let j = 1; j <= 5; j++) for (let i = -2 + Math.floor(j / 2); i <= 2 - Math.floor(j / 2); i++) p.px(x + i, y + j, j === 1 ? shade(c, -0.15) : c);
    }
  }
  return { pix: p, top: 0 };
}
function archPost() {
  const p = new Pix(16, 58), top = 42; p.oy = top;
  stoneBlocks(p, 3, -40, 10, 56, 44);
  p.vline(3, -40, 15, OUT); p.vline(12, -40, 15, OUT);
  p.rect(1, -42, 14, 3, GRANITE.light); p.rect(2, 12, 12, 4, GRANITE.dark);
  // parra enredada
  for (let y = -34; y < 10; y += 3) { p.px(3 + ((y / 3) % 2 ? 1 : 0), y, '#3F8A3A'); p.px(12 - ((y / 3) % 2 ? 1 : 0), y + 1, '#5DAA4E'); }
  p.oy = 0; p.outline(OUT);
  return { pix: p, top };
}
function archBanner(w) {
  const W = w * T, p = new Pix(W, 26);
  p.rect(0, 4, W, 20, '#FFF5DC'); p.hline(0, W - 1, 4, '#FFFFFF'); p.hline(0, W - 1, 23, '#E3D2A8');
  p.rect(0, 1, W, 3, '#3F8A3A');
  for (let x = 0; x < W; x += 5) { p.px(x, 0, '#5DAA4E'); p.px(x + 2, 4, '#2F6B2C'); }
  textC(p, W / 2, 7, 'FESTA DO ALBARIÑO', '#2E7D32', '#C9E4B0');
  textC(p, W / 2, 15, 'CAMBADOS', '#8E1B4A');
  for (const gx of [6, W - 12]) for (const [dx, dy] of [[0, 0], [2, 0], [4, 0], [1, 2], [3, 2], [2, 4]]) p.rect(gx + dx, 9 + dy, 2, 2, '#B8CF5A');
  p.outline(OUT);
  return { pix: p, top: 0 };
}

// ---------- interior de la cafetería ----------
function counter(w) {
  const W = w * T, top = 16, p = new Pix(W, 16 + top); p.oy = top;
  p.rect(0, 2, W, 14, '#7B4A2A'); for (let x = 2; x < W; x += 6) p.vline(x, 4, 13, '#5E3B1C');
  p.hline(0, W - 1, 14, '#4A2C18'); p.hline(0, W - 1, 15, '#3A2210');
  p.rect(0, -3, W, 5, '#E8E4DC'); p.hline(0, W - 1, -3, '#FFFFFF'); p.hline(0, W - 1, 1, '#BDB7AC');
  // cafetera
  p.rect(6, -15, 22, 12, '#B8BEC6'); p.hline(6, 27, -15, '#E3E7EC'); p.rect(6, -6, 22, 3, '#8E959E');
  for (const x of [9, 17, 23]) { p.rect(x, -8, 3, 3, '#222'); p.px(x + 1, -4, '#6D3B1F'); }
  p.px(26, -13, '#E53935'); p.rect(9, -18, 4, 3, '#FFFFFF'); p.rect(15, -18, 4, 3, '#FFFFFF');
  // tazas, servilletero y bote
  for (let x = 34; x < 50; x += 5) { p.rect(x, -6, 3, 3, '#FFFFFF'); p.px(x + 3, -5, '#FFFFFF'); }
  p.rect(56, -8, 6, 5, '#C0C0C0'); p.rect(57, -10, 4, 2, '#FFFFFF');
  p.rect(68, -9, 6, 6, '#CFE8F5'); p.hline(68, 73, -9, '#8FB3D9'); p.px(70, -6, '#E0B43A'); p.px(71, -5, '#E0B43A');
  // vitrina con bocadillos
  const vx = W - 50;
  p.rect(vx, -14, 34, 11, '#DCEFF8'); p.hline(vx, vx + 33, -14, '#FFFFFF'); p.rect(vx, -4, 34, 1, '#9AA2AB');
  for (let k = 0; k < 3; k++) {
    const bx = vx + 3 + k * 10;
    p.rect(bx, -9, 8, 3, '#D9A55B'); p.hline(bx, bx + 7, -9, '#EEC07A'); p.hline(bx + 1, bx + 6, -7, '#E57373'); p.px(bx + 2, -8, '#FFD54F'); p.px(bx + 5, -8, '#FFD54F');
  }
  // banderita de mesa
  p.vline(W - 10, -16, -3, '#6F737A'); vzFlag(p, W - 9, -16, 7, 5);
  p.oy = 0; p.outline(OUT);
  return { pix: p, top };
}
function wallDeco(v, w = 1, o = {}) {
  const W = Math.max(1, w) * T;
  switch (v) {
    case 'vflag': { // bandera grande colgada en la pared
      const p = new Pix(W, 26);
      p.hline(0, W - 1, 1, '#5E3B1C'); p.px(0, 0, '#5E3B1C'); p.px(W - 1, 0, '#5E3B1C');
      vzFlag(p, 2, 3, W - 4, 20);
      p.outline(OUT);
      return { pix: p, top: 0 };
    }
    case 'bunting': { // guirnalda de banderitas de Venezuela
      const p = new Pix(W, 12);
      for (let x = 0; x < W; x++) { const y = 1 + Math.round(Math.sin(((x % 32) / 32) * Math.PI) * 2); p.px(x, y, '#3A3A48'); if (x % 8 === 2) vzFlag(p, x, y + 1, 5, 6); }
      return { pix: p, top: 0 };
    }
    case 'menu': {
      const p = new Pix(W, 34);
      p.rect(0, 0, W, 34, '#6B4A2E'); p.rect(2, 2, W - 4, 30, '#2F3A33');
      textC(p, W / 2, 4, 'MENÚ', '#FFE082');
      const rows = [['C. LECHE', '1,5'], ['SIN LACT.', '1,5'], ['BOCATA M', '1,75'], ['BOCATA P', '1,25']];
      rows.forEach(([a, b], i) => { text(p, 4, 11 + i * 5, a, '#F2F2EA'); text(p, W - 4 - textW(b), 11 + i * 5, b, '#FFE082'); });
      p.outline(OUT);
      return { pix: p, top: 0 };
    }
    case 'shelf': {
      const p = new Pix(W, 24);
      for (const y of [8, 20]) { p.rect(0, y, W, 2, '#7A4E27'); p.hline(0, W - 1, y + 2, '#5E3B1C'); }
      for (let x = 2; x < W - 2; x += 5) {
        if ((x / 5) % 3 === 0) { p.rect(x, 3, 4, 5, '#8B5A2B'); p.hline(x, x + 3, 5, '#E0B43A'); }
        else bottle(p, x, -1);
        p.rect(x, 15, 3, 5, ['#FFFFFF', '#FFCC00', '#CF142B'][(x / 5) % 3 | 0]); p.px(x + 3, 16, '#FFFFFF');
      }
      return { pix: p, top: 0 };
    }
    case 'clock': {
      const p = new Pix(16, 16);
      p.ellipse(8, 8, 6.5, 6.5, '#6B4A2E'); p.ellipse(8, 8, 5.2, 5.2, '#FFFFFF');
      p.vline(8, 4, 8, OUT); p.hline(8, 11, 8, OUT);
      return { pix: p, top: 0 };
    }
    case 'photo': { // foto enmarcada del Ávila, la montaña de Caracas
      const p = new Pix(20, 16);
      p.rect(0, 0, 20, 16, '#C9A04A'); p.rect(2, 2, 16, 12, '#8FD0F0');
      for (let x = 2; x < 18; x++) { const hgt = Math.round(5 - Math.abs(x - 9) * 0.6 + Math.sin(x) * 0.8); for (let y = 14 - hgt; y < 14; y++) p.px(x, y, y < 14 - hgt + 1 ? '#5DAA4E' : '#3F8A3A'); }
      p.hline(2, 17, 13, '#2F6B2C');
      p.outline(OUT);
      return { pix: p, top: 0 };
    }
    default: return officeWallDeco(v, w, o);   // pizarras, ventanas, pendones… (officeart.js)
  }
}
function tableIn() {
  const p = new Pix(32, 26), top = 10; p.oy = top;
  for (const x of [1, 25]) { p.rect(x, 0, 6, 8, '#9C6B3E'); p.rect(x, -6, 6, 3, '#B98552'); p.vline(x, 8, 15, '#5E3B1C'); p.vline(x + 5, 8, 15, '#5E3B1C'); }
  p.ellipse(16, 4, 9, 3.6, '#F4F1EA'); p.hline(8, 24, 7, '#CFC9BC'); p.rect(15, 7, 2, 8, '#6F737A'); p.hline(12, 20, 15, '#6F737A');
  p.rect(12, 1, 3, 3, '#FFFFFF'); p.px(15, 2, '#FFFFFF'); p.px(13, 1, '#8B5A2B');
  p.rect(18, 2, 5, 2, '#D9A55B');
  p.oy = 0; p.outline(OUT);
  return { pix: p, top };
}
function plant() {
  const p = new Pix(16, 26), top = 10; p.oy = top;
  p.rect(4, 7, 8, 8, '#B5533A'); p.hline(3, 12, 7, '#C8643A'); p.hline(4, 11, 14, '#8E3B26');
  for (const [x, y, rx] of [[8, 0, 5], [5, -4, 3.5], [11, -5, 3.5], [8, -8, 3]]) p.ellipse(x, y, rx, rx * 0.9, '#3F8A3A');
  for (const [x, y] of [[6, -5], [10, -6], [8, -1], [5, 1]]) p.px(x, y, '#6BBE5E');
  p.oy = 0; p.outline(OUT);
  return { pix: p, top };
}
// poste con flecha (dirección: left | right | up)
function signpost(dir = 'right') {
  const p = new Pix(16, 28), top = 12; p.oy = top;
  p.rect(7, -6, 2, 21, WOOD.dark);
  const board = (y, d) => {
    p.rect(2, y, 12, 6, WOOD.base); p.hline(2, 13, y, WOOD.light); p.hline(2, 13, y + 5, WOOD.dark);
    if (d === 'right') { p.px(14, y + 1, WOOD.base); p.px(15, y + 2, WOOD.base); p.px(15, y + 3, WOOD.base); p.px(14, y + 4, WOOD.base); }
    if (d === 'left') { p.px(1, y + 1, WOOD.base); p.px(0, y + 2, WOOD.base); p.px(0, y + 3, WOOD.base); p.px(1, y + 4, WOOD.base); }
    const glyph = d === 'left' ? '←' : d === 'up' ? '↑' : '→';
    text(p, 6, y, glyph, '#FFF3D6');
  };
  board(-10, dir); board(-2, dir === 'up' ? 'up' : dir);
  p.oy = 0; p.outline(OUT);
  return { pix: p, top };
}

const PAINTERS = {
  vflag: () => vflagPole(), terrace: (o) => terrace(o.variant), car: (o) => car(o.variant), van: () => van(),
  departures: () => departures(), station_clock: () => stationClock(), vending: () => vending(),
  caseta: (o) => caseta(o), barrel: (o) => barrel(o.variant), crates: () => crates(),
  garland: (o) => garland(o.w), arch_post: () => archPost(), arch_banner: (o) => archBanner(o.w),
  counter: (o) => counter(o.w), wall_deco: (o) => wallDeco(o.variant, o.w, o), table_in: () => tableIn(), plant: () => plant(),
  signpost: (o) => signpost(o.variant),
  // el tren de Albacete, por fin parado en la estación (modo historia)
  train_parked: (o) => ({ pix: paintTrain(1, Math.max(1, Math.floor((o.w * T - 8) / 60))), top: 0 }),
};

// Sprite de cualquier objeto del mapa (los de siempre los pinta townart.js; los de oficina, officeart.js)
export function paintObject(o, ctx = {}) {
  if (o.kind === 'building') {
    if (o.type === 'cafe') return cafe(o.w, o.h, { door: o.door });
    if (o.type === 'station') return station(o.w, o.h, { door: o.door });
    if (o.owner === 'dio') return dioHouse(o);
  }
  const f = PAINTERS[o.kind] || OFFICE_PAINTERS[o.kind];
  if (f) return f(o);
  return paintBaseObject(o, ctx);
}
