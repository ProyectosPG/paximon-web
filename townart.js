// Arte del pueblo pintado por código a resolución nativa (16 px por casilla). Todo sale de
// primitivas sobre una matriz de colores (Pix), así que también se puede renderizar en Node
// para revisar (tools/town/preview.mjs). Estilo: contorno oscuro, sombreado en bandas y
// arquitectura gallega (granito, tella, lousa, galerías, hórreo y cruceiro).
import { mix, shade } from './avatar.js';
import { LOGO, LOGO_PALETTE } from './ipmsg.js';

export const T = 16;
const OUT = '#2B2230';

// ---------- lienzo de píxeles ----------
export class Pix {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Array(w * h).fill(null); this.ox = 0; this.oy = 0; }
  px(x, y, c) {
    x = Math.floor(x + this.ox); y = Math.floor(y + this.oy);
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c;
  }
  get(x, y) {
    x = Math.floor(x + this.ox); y = Math.floor(y + this.oy);
    return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.d[y * this.w + x] : null;
  }
  rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c); }
  hline(x0, x1, y, c) { for (let x = x0; x <= x1; x++) this.px(x, y, c); }
  vline(x, y0, y1, c) { for (let y = y0; y <= y1; y++) this.px(x, y, c); }
  ellipse(cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry) - 1; y <= Math.ceil(cy + ry) + 1; y++)
      for (let x = Math.floor(cx - rx) - 1; x <= Math.ceil(cx + rx) + 1; x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.px(x, y, c);
      }
  }
  // contorno de 1 px alrededor de lo pintado (coordenadas absolutas)
  outline(c = OUT) {
    const { w, h, d } = this, add = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (d[y * w + x]) continue;
      if ((x > 0 && d[y * w + x - 1]) || (x < w - 1 && d[y * w + x + 1]) || (y > 0 && d[(y - 1) * w + x]) || (y < h - 1 && d[(y + 1) * w + x])) add.push(y * w + x);
    }
    for (const i of add) d[i] = c;
  }
  toCanvas() {
    const cv = document.createElement('canvas');
    cv.width = this.w; cv.height = this.h;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(this.w, this.h);
    for (let i = 0; i < this.d.length; i++) {
      const c = this.d[i]; if (!c) continue;
      const [r, g, b, a] = rgba(c);
      img.data[i * 4] = r; img.data[i * 4 + 1] = g; img.data[i * 4 + 2] = b; img.data[i * 4 + 3] = a;
    }
    ctx.putImageData(img, 0, 0);
    return cv;
  }
}
const rgbaCache = new Map();
function rgba(c) {
  let v = rgbaCache.get(c);
  if (!v) {
    const n = parseInt(c.slice(1, 7), 16);
    v = [(n >> 16) & 255, (n >> 8) & 255, n & 255, c.length > 7 ? parseInt(c.slice(7, 9), 16) : 255];
    rgbaCache.set(c, v);
  }
  return v;
}

// azar determinista
export function hash(x, y, s = 0) {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- paletas ----------
const GRASS = { base: '#7EC46A', dark: '#5FA653', light: '#A3DF83' };
const PATH = { base: '#E6CF97', dark: '#CDAF72', light: '#F4E4B8', edge: '#C29F5E', shadow: '#D6BA7E' };
const COBBLE = { base: '#D3CDC1', light: '#E8E4DB', shade: '#B3AC9F', mortar: '#948D80' };
const SAND = { base: '#F1DEA3', dark: '#DCC486', light: '#FBEFC8' };
const WATER = { base: '#4A9FE0', dark: '#3A88CA', light: '#7FC6F5', foam: '#E4F5FF', foam2: '#B7E1FA' };
const WOOD = { base: '#B27A45', dark: '#7A4E27', light: '#CC955C', gap: '#5E3B1C' };
const GRANITE = { base: '#BDB6A9', light: '#D8D2C7', dark: '#958E81', mortar: '#7B7469' };
const PLASTER = { base: '#F4EFE3', shade: '#DDD3C0', dark: '#C9BDA6' };
const GLASS = { base: '#86CDF2', dark: '#5AA3D6', light: '#DDF4FF' };
const DOOR = { base: '#8B5A2B', dark: '#633F1D', light: '#A9723B' };
const SLATE = '#5E6879';

const soft = (t) => t === 'grass' || t === 'flowers';

// ---------- suelo ----------
function grass(p, X, Y, h) {
  p.rect(X, Y, T, T, GRASS.base);
  const r = rng(h);
  const n = r() < 0.3 ? 0 : 1 + Math.floor(r() * 2.2);
  for (let k = 0; k < n; k++) {
    const x = X + 1 + Math.floor(r() * 12), y = Y + 2 + Math.floor(r() * 12);
    p.px(x, y, GRASS.dark); p.px(x + 2, y, GRASS.dark); p.px(x + 1, y + 1, GRASS.dark);
    p.px(x, y - 1, GRASS.light); p.px(x + 2, y - 1, GRASS.light);
  }
}
const FLOWER_COLORS = [['#FFFFFF', '#FFD54F'], ['#EF5350', '#FFE082'], ['#FFD54F', '#FF8F00'], ['#7DA3EA', '#FFFFFF'], ['#F48FB1', '#FFF59D']];
function flowers(p, X, Y, h) {
  grass(p, X, Y, h >>> 3);
  const r = rng(h);
  for (const [fx, fy] of [[2 + Math.floor(r() * 3), 2 + Math.floor(r() * 3)], [9 + Math.floor(r() * 3), 8 + Math.floor(r() * 3)], [3 + Math.floor(r() * 3), 10 + Math.floor(r() * 2)]]) {
    const [pet, mid] = FLOWER_COLORS[Math.floor(r() * FLOWER_COLORS.length)];
    const x = X + fx, y = Y + fy;
    p.px(x + 1, y + 3, GRASS.dark);
    p.px(x + 1, y, pet); p.px(x, y + 1, pet); p.px(x + 2, y + 1, pet); p.px(x + 1, y + 2, pet);
    p.px(x + 1, y + 1, mid);
  }
}
function path(p, X, Y, h, n) {
  p.rect(X, Y, T, T, PATH.base);
  const r = rng(h);
  for (let k = 0; k < 4; k++) {
    const x = X + 2 + Math.floor(r() * 12), y = Y + 2 + Math.floor(r() * 12);
    p.px(x, y, PATH.dark); if (r() < 0.5) p.px(x + 1, y, PATH.dark); p.px(x, y - 1, PATH.light);
  }
  const u = soft(n.u), d = soft(n.d), l = soft(n.l), rr = soft(n.r);
  if (u) { p.hline(X, X + 15, Y, PATH.edge); p.hline(X, X + 15, Y + 1, PATH.shadow); }
  if (d) p.hline(X, X + 15, Y + 15, PATH.edge);
  if (l) { p.vline(X, Y, Y + 15, PATH.edge); p.vline(X + 1, Y + (u ? 1 : 0), Y + 15, PATH.shadow); }
  if (rr) p.vline(X + 15, Y, Y + 15, PATH.edge);
  const corner = (cx, cy, dx, dy) => { p.px(cx, cy, GRASS.base); p.px(cx + dx, cy, PATH.edge); p.px(cx, cy + dy, PATH.edge); };
  if (u && l) corner(X, Y, 1, 1);
  if (u && rr) corner(X + 15, Y, -1, 1);
  if (d && l) corner(X, Y + 15, 1, -1);
  if (d && rr) corner(X + 15, Y + 15, -1, -1);
}
function cobble(p, X, Y, h, n) {
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const gx = X + x, gy = Y + y;
    const row = Math.floor(gy / 8), off = (row % 2) * 4;
    const lx = (gx + off) % 8, ly = gy % 8;
    let c = COBBLE.base;
    if (lx === 7 || ly === 7) c = COBBLE.mortar;
    else if (lx === 0 || ly === 0) c = COBBLE.light;
    else if (lx === 6 || ly === 6) c = COBBLE.shade;
    else if (hash(gx, gy, 7) % 23 === 0) c = COBBLE.shade;
    p.px(gx, gy, c);
  }
  const curb = (t) => t !== 'plaza';
  if (curb(n.u)) { p.hline(X, X + 15, Y, COBBLE.mortar); p.hline(X, X + 15, Y + 1, GRANITE.light); }
  if (curb(n.d)) { p.hline(X, X + 15, Y + 15, COBBLE.mortar); p.hline(X, X + 15, Y + 14, GRANITE.dark); }
  if (curb(n.l)) { p.vline(X, Y, Y + 15, COBBLE.mortar); p.vline(X + 1, Y, Y + 15, GRANITE.light); }
  if (curb(n.r)) { p.vline(X + 15, Y, Y + 15, COBBLE.mortar); p.vline(X + 14, Y, Y + 15, GRANITE.dark); }
}
function sand(p, X, Y, h, n) {
  p.rect(X, Y, T, T, SAND.base);
  const r = rng(h);
  for (let k = 0; k < 6; k++) p.px(X + Math.floor(r() * 16), Y + Math.floor(r() * 16), r() < 0.6 ? SAND.dark : SAND.light);
  if (soft(n.u) || n.u === 'path') {
    const top = soft(n.u) ? GRASS.base : PATH.base, edge = soft(n.u) ? GRASS.dark : PATH.edge;
    for (let i = 0; i < T; i++) {
      const depth = [2, 3, 3, 2][(X + i) % 4];
      p.vline(X + i, Y, Y + depth - 1, top);
      p.px(X + i, Y + depth, edge);
    }
  }
}
function water(p, X, Y, h, n, frame) {
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const gx = X + x, gy = Y + y;
    let c = WATER.base;
    const band = gy % 8;
    const shift = (Math.floor(gy / 8) % 2) * 6 + frame * 3;
    const k = (gx + shift) % 12;
    if (band === 3 && k < 4) c = WATER.light;
    else if (band === 4 && k >= 1 && k < 3) c = WATER.dark;
    else if (band === 7 && (gx * 7 + gy + frame * 5) % 29 === 0) c = WATER.light;
    p.px(gx, gy, c);
  }
  const shore = (t) => t && t !== 'water' && t !== 'wood';
  if (shore(n.u)) {
    for (let i = 0; i < T; i++) {
      const w = ((X + i + frame * 2) % 6) < 3 ? 1 : 2;
      p.vline(X + i, Y, Y + w - 1, WATER.foam);
      p.px(X + i, Y + w, WATER.foam2);
    }
  }
  if (shore(n.l)) p.vline(X, Y, Y + 15, WATER.foam2);
  if (shore(n.r)) p.vline(X + 15, Y, Y + 15, WATER.foam2);
}
function pier(p, X, Y, h, n) {
  for (let y = 0; y < T; y++) {
    const gy = Y + y, k = gy % 5;
    const c = k === 4 ? WOOD.gap : k === 0 ? WOOD.light : WOOD.base;
    p.hline(X, X + 15, gy, c);
    const seam = X + ((Math.floor(gy / 5) % 2) ? 5 : 11);
    if (k !== 4) p.px(seam, gy, WOOD.dark);
  }
  if (n.l !== 'wood') { p.vline(X, Y, Y + 15, WOOD.gap); p.vline(X + 1, Y, Y + 15, WOOD.dark); }
  if (n.r !== 'wood') { p.vline(X + 15, Y, Y + 15, WOOD.gap); p.vline(X + 14, Y, Y + 15, WOOD.dark); }
  if (n.d !== 'wood') { p.hline(X, X + 15, Y + 15, WOOD.gap); p.hline(X, X + 15, Y + 14, WOOD.dark); }
}

// Pinta el suelo entero del mapa (frame alterna el oleaje)
// extra: pintores de casillas nuevas {tipo: (p, X, Y, h, n, frame, x, y)} (worldart.js)
export function paintGround(map, frame = 0, extra = {}) {
  const { W, H, ground } = map;
  const p = new Pix(W * T, H * T);
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? null : ground[y][x]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = ground[y][x], X = x * T, Y = y * T, h = hash(x, y);
    const n = { u: at(x, y - 1), d: at(x, y + 1), l: at(x - 1, y), r: at(x + 1, y) };
    if (extra[t]) { extra[t](p, X, Y, h, n, frame, x, y); continue; }
    switch (t) {
      case 'flowers': flowers(p, X, Y, h); break;
      case 'path': path(p, X, Y, h, n); break;
      case 'plaza': cobble(p, X, Y, h, n); break;
      case 'sand': sand(p, X, Y, h, n); break;
      case 'water': water(p, X, Y, h, n, frame); break;
      case 'wood': pier(p, X, Y, h, n); break;
      default: grass(p, X, Y, h);
    }
  }
  return p;
}

// ---------- vegetación ----------
function groundShadow(p, cx, cy, rx, ry) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1 && !p.get(x, y)) p.px(x, y, '#1B301E44');
    }
}
function oak(seed) {
  const p = new Pix(16, 26), r = rng(seed), ph = r() * 6;
  const C = ['#2F7040', '#43924F', '#5DB062', '#86CF79'];
  for (let y = 0; y < 20; y++) for (let x = 0; x < 16; x++) {
    const dx = (x + 0.5 - 8) / 7.3, dy = (y + 0.5 - 9.6) / 8.9;
    const a = Math.atan2(dy, dx), d = Math.hypot(dx, dy) * (1 + 0.075 * Math.sin(a * 6 + ph));
    if (d > 1) continue;
    const l = -dx * 0.55 - dy * 0.85 + (r() - 0.5) * 0.3;
    p.px(x, y, l > 0.62 ? C[3] : l > 0.18 ? C[2] : l < -0.42 ? C[0] : C[1]);
  }
  for (let k = 0; k < 5; k++) { const x = 3 + Math.floor(r() * 10), y = 4 + Math.floor(r() * 11); if (p.get(x, y) === C[2] || p.get(x, y) === C[1]) { p.px(x, y, C[0]); p.px(x + 1, y + 1, C[0]); } }
  p.rect(6, 18, 4, 6, '#8A5A3A'); p.vline(9, 18, 23, '#664026'); p.vline(6, 19, 23, '#A8744C');
  p.px(5, 23, '#8A5A3A'); p.px(10, 23, '#664026'); p.hline(6, 9, 18, '#3C2A1C');
  p.outline('#1E3A26');
  groundShadow(p, 8, 24.6, 6, 1.5);
  return p;
}
function pine(seed) {
  const p = new Pix(16, 26), r = rng(seed);
  const C = ['#245C3A', '#337A4A', '#4C9A5E', '#6DBA74'];
  const tiers = [[1, 8, 4], [5, 13, 6], [9, 18, 7.4]];
  for (const [top, base, hw] of tiers) {
    for (let y = top; y <= base; y++) {
      const w = ((y - top) / (base - top)) * hw + 0.6;
      for (let x = Math.floor(8 - w); x <= Math.ceil(8 + w) - 1; x++) {
        const rel = (x + 0.5 - 8) / w;
        let c = rel < -0.35 ? C[2] : rel > 0.4 ? C[0] : C[1];
        if (y === base || (y === base - 1 && (x % 2))) c = C[0];
        if (rel < -0.55 && y < base - 1 && r() < 0.6) c = C[3];
        p.px(x, y, c);
      }
    }
  }
  p.rect(7, 19, 2, 5, '#7A4E2E'); p.px(8, 19, '#5A3820');
  p.outline('#1A3A28');
  groundShadow(p, 8, 24.6, 5, 1.4);
  return p;
}
function bush(kind = 'blue') {
  const p = new Pix(16, 16);
  p.ellipse(8, 9, 7, 6.2, '#4E9A4E');
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (!p.get(x, y)) continue;
    const l = -(x - 8) * 0.08 - (y - 9) * 0.16;
    if (l > 0.55) p.px(x, y, '#72BD68'); else if (l < -0.55) p.px(x, y, '#387A3C');
  }
  const [f1, f2] = kind === 'pink' ? ['#E98AB8', '#F8C3DC'] : kind === 'white' ? ['#E8E8F0', '#FFFFFF'] : ['#6F97E6', '#AFC8F7'];
  for (const [x, y] of [[4, 6], [9, 5], [6, 10], [11, 9]]) {
    p.rect(x, y, 3, 3, f1); p.px(x, y, f2); p.px(x + 1, y, f2); p.px(x, y + 1, f2);
  }
  p.outline('#1F3F24');
  return p;
}

// ---------- construcción: piezas ----------
function trapezoidRoof(p, x, y, w, h, col, { inset = 3, course = 5 } = {}) {
  const base = col, dark = shade(col, -0.25), darker = shade(col, -0.45), light = shade(col, 0.2), lighter = shade(col, 0.38);
  for (let j = 0; j < h; j++) {
    const ins = Math.round((1 - j / (h - 1)) * inset);
    const x0 = x + ins, x1 = x + w - 1 - ins;
    for (let i = x0; i <= x1; i++) {
      let c = base;
      if (j === 0 || i === x0 || i === x1 || j === h - 1) c = OUT;
      else if (j <= 2) c = j === 1 ? lighter : light;
      else if (j >= h - 3) c = j === h - 2 ? darker : dark;
      else {
        const row = j - 3, k = row % course, cr = Math.floor(row / course);
        const lx = (i - x + (cr % 2) * 4) % 8;
        if (k === course - 1) c = darker;
        else if (k === 0) c = light;
        if (lx === 7 && k >= 1 && k < course - 1) c = dark;
        else if (lx === 0 && k >= 1 && k < course - 2) c = light;
      }
      p.px(i, y + j, c);
    }
  }
}
function stoneBlocks(p, x, y, w, h, seed, pal = GRANITE) {
  const r = rng(seed);
  let yy = y, row = 0;
  while (yy < y + h) {
    const bh = Math.min(5 + (row % 2), y + h - yy);
    let xx = x - (row % 2 ? 4 : 0);
    while (xx < x + w) {
      const bw = 7 + Math.floor(r() * 6);
      for (let j = 0; j < bh; j++) for (let i = 0; i < bw; i++) {
        const px = xx + i, py = yy + j;
        if (px < x || px >= x + w) continue;
        let c = pal.base;
        if (i === bw - 1 || j === bh - 1) c = pal.mortar;
        else if (i === 0 || j === 0) c = pal.light;
        else if (j === bh - 2) c = pal.dark;
        else if (r() < 0.05) c = pal.dark;
        p.px(px, py, c);
      }
      xx += bw;
    }
    yy += bh; row++;
  }
}
function plasterWall(p, x, y, w, h) {
  p.rect(x, y, w, h, PLASTER.base);
  p.hline(x, x + w - 1, y, PLASTER.dark); p.hline(x, x + w - 1, y + 1, PLASTER.shade); p.hline(x, x + w - 1, y + 2, PLASTER.shade);
  stoneBlocks(p, x, y + h - 4, w, 4, 11);
  // esquinas de granito (cadeiras)
  for (let yy = y + 3, k = 0; yy < y + h - 4; yy += 5, k++) {
    const bw = k % 2 ? 4 : 6;
    stoneBlocks(p, x, yy, bw, Math.min(5, y + h - 4 - yy), 20 + k);
    stoneBlocks(p, x + w - bw, yy, bw, Math.min(5, y + h - 4 - yy), 40 + k);
  }
  p.vline(x, y, y + h - 1, OUT); p.vline(x + w - 1, y, y + h - 1, OUT);
  p.hline(x, x + w - 1, y + h - 1, OUT);
}
function windowAt(p, x, y, w = 12, h = 12, { frame = '#FDFDFD', box = null } = {}) {
  p.rect(x - 2, y - 2, w + 4, h + 3, GRANITE.base);
  p.hline(x - 2, x + w + 1, y - 2, GRANITE.light); p.vline(x - 2, y - 2, y + h, GRANITE.light);
  p.vline(x + w + 1, y - 2, y + h, GRANITE.dark);
  p.rect(x, y, w, h, frame);
  p.rect(x + 1, y + 1, w - 2, h - 2, GLASS.base);
  p.rect(x + 1, y + h - 4, w - 2, 3, GLASS.dark);
  const mx = x + Math.floor(w / 2), my = y + Math.floor(h / 2) - 1;
  p.vline(mx, y, y + h - 1, frame); p.hline(x, x + w - 1, my, frame);
  p.px(x + 2, y + 2, GLASS.light); p.px(x + 3, y + 2, GLASS.light); p.px(x + 2, y + 3, GLASS.light);
  p.px(mx + 2, y + 2, GLASS.light);
  p.rect(x - 3, y + h + 1, w + 6, 2, GRANITE.light); p.hline(x - 3, x + w + 2, y + h + 2, GRANITE.dark);
  if (box) {
    p.rect(x - 1, y + h + 3, w + 2, 3, DOOR.base); p.hline(x - 1, x + w, y + h + 5, DOOR.dark);
    for (let i = 0; i < w; i += 2) { p.px(x + i, y + h + 2, box[(i / 2) % 2 ? 1 : 0]); p.px(x + i + 1, y + h + 2, '#4E9A4E'); }
  }
  p.hline(x - 3, x + w + 2, y - 3, OUT);
}
function doorAt(p, x, y, w, h, { color = DOOR.base, arch = false } = {}) {
  const dk = shade(color, -0.3), lt = shade(color, 0.18);
  p.rect(x - 3, y - 3, w + 6, h + 3, GRANITE.base);
  p.hline(x - 3, x + w + 2, y - 3, GRANITE.light); p.vline(x - 3, y - 3, y + h - 1, GRANITE.light);
  p.vline(x + w + 2, y - 3, y + h - 1, GRANITE.dark);
  p.rect(x, y, w, h, color);
  for (let i = x + 2; i < x + w - 1; i += 3) p.vline(i, y + 1, y + h - 1, dk);
  p.vline(x + 1, y, y + h - 1, lt);
  p.hline(x, x + w - 1, y + Math.floor(h / 2), dk);
  p.px(x + w - 3, y + Math.floor(h / 2) + 2, '#FFD54F'); p.px(x + w - 3, y + Math.floor(h / 2) + 3, '#C79A1E');
  if (arch) {
    for (let i = 0; i < w; i++) {
      const dx = (i + 0.5 - w / 2) / (w / 2), top = Math.round(3 * (1 - Math.sqrt(Math.max(0, 1 - dx * dx))) + 0.2);
      for (let j = 0; j < top; j++) p.px(x + i, y + j, GRANITE.base);
      p.px(x + i, y + top, OUT);
    }
  } else p.hline(x, x + w - 1, y, OUT);
  p.vline(x - 1, y, y + h - 1, OUT); p.vline(x + w, y, y + h - 1, OUT);
  p.rect(x - 2, y + h - 1, w + 4, 1, GRANITE.light);
}
function chimney(p, x, y, w, h) {
  stoneBlocks(p, x, y + 2, w, h - 2, 99);
  p.rect(x - 1, y, w + 2, 2, GRANITE.dark); p.hline(x - 1, x + w, y, OUT);
  p.vline(x - 1, y, y + h - 1, OUT); p.vline(x + w, y, y + h - 1, OUT);
}
function galeria(p, x, y, w, h) {
  const WH = '#FBFBF8', WS = '#D9D9D2';
  p.rect(x, y, w, h, WH);
  for (let px = x + 2; px + 4 <= x + w - 2; px += 5)
    for (let py = y + 2; py + 5 <= y + h - 6; py += 6) {
      p.rect(px, py, 4, 5, GLASS.base); p.px(px, py, GLASS.light); p.px(px + 1, py, GLASS.light); p.px(px, py + 1, GLASS.light);
      p.hline(px, px + 3, py + 4, GLASS.dark);
    }
  p.rect(x, y + h - 5, w, 5, WH); p.hline(x, x + w - 1, y + h - 5, WS); p.hline(x, x + w - 1, y + h - 1, WS);
  for (let px = x + 3; px < x + w - 2; px += 5) p.vline(px, y + h - 4, y + h - 2, WS);
  p.hline(x - 1, x + w, y - 1, OUT); p.hline(x - 1, x + w, y + h, OUT);
  p.vline(x - 1, y - 1, y + h, OUT); p.vline(x + w, y - 1, y + h, OUT);
  p.hline(x, x + w - 1, y + h + 1, PLASTER.dark);
}
function star(p, cx, cy, R, fill, edge) {
  const pts = [];
  for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? R * 0.45 : R; pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
  const inside = (x, y) => { let c = false; for (let i = 0, j = 9; i < 10; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
  const pix = [];
  for (let y = Math.floor(cy - R) - 1; y <= Math.ceil(cy + R) + 1; y++) for (let x = Math.floor(cx - R) - 1; x <= Math.ceil(cx + R) + 1; x++) if (inside(x + 0.5, y + 0.5)) pix.push([x, y]);
  const set = new Set(pix.map(([x, y]) => x + ',' + y));
  for (const [x, y] of pix) {
    const border = !set.has((x - 1) + ',' + y) || !set.has((x + 1) + ',' + y) || !set.has(x + ',' + (y - 1)) || !set.has(x + ',' + (y + 1));
    p.px(x, y, border ? edge : (x < cx && y < cy + 1 ? shade(fill, 0.35) : fill));
  }
}

// ---------- edificios ----------
// Cada pintor devuelve {pix, top}: top = píxeles que sobresalen por encima de la huella.
function casa(w, h, col, { door = 2, seed = 1, small = false } = {}) {
  const W = w * T, H = h * T, top = 8;
  const p = new Pix(W, H + top); p.oy = top;
  const roofH = small ? 27 : 30;
  chimney(p, W - 22, -7, 7, 16);
  plasterWall(p, 3, roofH - 1, W - 6, H - roofH + 1);
  trapezoidRoof(p, 0, 0, W, roofH, col);
  const dx = door * T + 2;
  doorAt(p, dx, H - 21, 12, 20);
  const box = seed % 2 ? ['#6F97E6', '#AFC8F7'] : ['#E98AB8', '#F8C3DC'];
  if (small) windowAt(p, 10, roofH + 8, 12, 11, { box });
  else {
    windowAt(p, 10, roofH + 8, 12, 11, { box });
    windowAt(p, W - 22, roofH + 8, 12, 11, { box });
  }
  return { pix: p, top };
}
function mansion(w, h, col, { door = 3 } = {}) {
  const W = w * T, H = h * T, top = 9;
  const p = new Pix(W, H + top); p.oy = top;
  const roofH = 30;
  chimney(p, 12, -8, 7, 17); chimney(p, W - 19, -8, 7, 17);
  plasterWall(p, 3, roofH - 1, W - 6, H - roofH + 1);
  trapezoidRoof(p, 0, 0, W, roofH, col, { inset: 4 });
  galeria(p, 22, roofH + 3, W - 44, 20);
  const dx = door * T;
  doorAt(p, dx, H - 23, 16, 22, { arch: true, color: shade(col, -0.35) });
  windowAt(p, 12, H - 26, 12, 11, { box: ['#6F97E6', '#AFC8F7'] });
  windowAt(p, W - 24, H - 26, 12, 11, { box: ['#E98AB8', '#F8C3DC'] });
  return { pix: p, top };
}
function pazo(w, h, col, { door = 4 } = {}) {
  const W = w * T, H = h * T, top = 26;
  const p = new Pix(W, H + top); p.oy = top;
  const TW = 36, roofH = 26;
  // cuerpo principal
  chimney(p, W - 30, -8, 7, 16);
  stoneBlocks(p, TW - 2, roofH - 1, W - TW - 1, H - roofH + 1, 5);
  p.vline(W - 3, roofH - 1, H - 1, OUT); p.hline(TW - 2, W - 3, H - 1, OUT);
  trapezoidRoof(p, TW - 6, 0, W - TW + 6, roofH, SLATE, { inset: 3, course: 4 });
  // remates de las esquinas
  for (const x of [TW - 4, W - 6]) { p.rect(x, -4, 3, 5, GRANITE.light); p.px(x + 1, -6, GRANITE.light); p.px(x + 1, -5, GRANITE.base); }
  // escudo sobre la puerta
  const dx = door * T, sx = dx + 2, sy = roofH + 5;
  p.rect(sx - 1, sy - 1, 14, 16, GRANITE.dark);
  p.rect(sx, sy, 12, 11, '#E3B341'); p.rect(sx + 1, sy + 1, 10, 9, col);
  p.rect(sx + 3, sy + 11, 6, 2, '#E3B341'); p.rect(sx + 5, sy + 13, 2, 1, '#E3B341');
  p.rect(sx + 3, sy + 3, 6, 2, shade(col, 0.45)); p.rect(sx + 5, sy + 2, 2, 6, shade(col, 0.45));
  p.hline(sx - 1, sx + 12, sy - 2, OUT);
  doorAt(p, dx, H - 25, 16, 24, { arch: true, color: '#5A3A22' });
  // ventanas con balcón de hierro
  for (const x of [TW + 14, W - 26]) {
    windowAt(p, x, roofH + 6, 11, 12);
    p.rect(x - 3, roofH + 18, 17, 1, '#2C2C34');
    for (let i = x - 3; i <= x + 13; i += 2) p.vline(i, roofH + 19, roofH + 22, '#2C2C34');
    p.hline(x - 3, x + 13, roofH + 23, '#2C2C34');
    windowAt(p, x, H - 23, 11, 11);
  }
  // torre
  stoneBlocks(p, 0, -6, TW, H + 6, 9);
  p.vline(0, -6, H - 1, OUT); p.vline(TW - 1, -6, H - 1, OUT); p.hline(0, TW - 1, H - 1, OUT);
  for (let yy = -4; yy < H - 4; yy += 6) { p.rect(0, yy, 4, 3, GRANITE.light); p.rect(TW - 4, yy, 4, 3, GRANITE.light); }
  const tr = new Pix(TW + 6, 18);
  for (let j = 0; j < 18; j++) {
    const hw = 3 + (j / 17) * (TW / 2);
    for (let i = Math.floor(TW / 2 + 3 - hw); i <= Math.ceil(TW / 2 + 3 + hw) - 1; i++) {
      const edge = j === 17 || i === Math.floor(TW / 2 + 3 - hw) || i === Math.ceil(TW / 2 + 3 + hw) - 1;
      tr.px(i, j, edge ? OUT : j % 4 === 3 ? shade(SLATE, -0.3) : (i < TW / 2 + 3 ? shade(SLATE, 0.2) : SLATE));
    }
  }
  for (let j = 0; j < tr.h; j++) for (let i = 0; i < tr.w; i++) { const c = tr.d[j * tr.w + i]; if (c) p.px(i - 3, j - 24, c); }
  // mástil y bandera del departamento
  p.vline(TW / 2, -top, -20, '#3A3A44');
  p.rect(TW / 2 + 1, -top, 8, 5, col); p.hline(TW / 2 + 1, TW / 2 + 8, -top + 5, shade(col, -0.35));
  windowAt(p, 12, 4, 11, 12); windowAt(p, 12, H - 30, 11, 12);
  return { pix: p, top };
}
function arena(w, h, typeColors = []) {
  const W = w * T, H = h * T, top = 26;
  const p = new Pix(W, H + top); p.oy = top;
  const ORANGE = '#FF7A00', ORANGE_D = '#C95A00', ORANGE_L = '#FFA43D', CREAM = '#FFE9C2';
  // cúpula
  const cx = W / 2, domeBase = 34;
  for (let y = -18; y < domeBase; y++) for (let x = 6; x < W - 6; x++) {
    const dx = (x + 0.5 - cx) / (W / 2 - 8), dy = (y + 0.5 - domeBase) / (domeBase + 18);
    const d = dx * dx + dy * dy;
    if (d > 1) continue;
    const rib = Math.abs(((Math.atan2(dy, dx) + Math.PI) / Math.PI * 9) % 1 - 0.5) > 0.46;
    let c = d > 0.9 ? ORANGE_D : dx < -0.2 && dy < -0.45 ? ORANGE_L : ORANGE;
    if (rib && d < 0.93) c = ORANGE_D;
    p.px(x, y, c);
  }
  // mástiles y banderines
  for (const fx of [14, W - 15]) {
    p.vline(fx, -top, 20, '#3A3A44');
    p.rect(fx + 1, -top + 1, 9, 6, '#FFC107'); p.hline(fx + 1, fx + 9, -top + 7, '#E08E00');
    p.px(fx + 9, -top + 1, null); p.px(fx + 9, -top + 6, null);
  }
  star(p, cx, 8, 15, '#FFC107', '#2B2230');
  // fachada de granito
  stoneBlocks(p, 4, domeBase, W - 8, H - domeBase, 77);
  p.rect(2, domeBase, W - 4, 6, CREAM); p.hline(2, W - 3, domeBase, OUT); p.hline(2, W - 3, domeBase + 6, OUT);
  for (let x = 6; x < W - 6; x += 6) p.rect(x, domeBase + 2, 2, 2, (x / 6) % 2 ? '#FFD54F' : '#FF7043');
  // pilastras y estandartes de los tipos
  const cols = [10, 38, W - 42, W - 14];
  for (const x of cols) {
    p.rect(x - 3, domeBase + 7, 7, H - domeBase - 7, GRANITE.light);
    p.vline(x - 3, domeBase + 7, H - 1, OUT); p.vline(x + 3, domeBase + 7, H - 1, OUT);
    p.vline(x + 2, domeBase + 7, H - 1, GRANITE.dark);
    p.rect(x - 4, domeBase + 7, 9, 3, GRANITE.base); p.hline(x - 4, x + 4, domeBase + 10, OUT);
  }
  const banners = [[17, 0], [27, 1], [W - 35, 3], [W - 25, 4], [W / 2 - 4, 2]];
  banners.slice(0, 4).forEach(([bx, k]) => {
    const c = typeColors[k] || ['#FF5252', '#8E44FF', '#4CBB3A', '#A1887F', '#2E9BFF'][k];
    p.rect(bx, domeBase + 10, 8, 20, c);
    p.vline(bx + 7, domeBase + 10, domeBase + 29, shade(c, -0.3)); p.vline(bx, domeBase + 10, domeBase + 29, shade(c, 0.25));
    p.px(bx + 3, domeBase + 30, c); p.px(bx + 4, domeBase + 30, c); p.px(bx + 2, domeBase + 29, c); p.px(bx + 5, domeBase + 29, c);
    p.rect(bx + 2, domeBase + 16, 4, 4, '#FFFFFF');
    p.hline(bx - 1, bx + 8, domeBase + 9, '#3A3A44');
  });
  // gran portalón
  const gx = 4 * T, gw = 2 * T;   // puerta en las columnas 4-5 de la huella
  for (let x = gx - 4; x < gx + gw + 4; x++) for (let y = domeBase + 12; y < H; y++) {
    const dx = (x + 0.5 - (gx + gw / 2)) / (gw / 2 + 4), dy = (y + 0.5 - (domeBase + 30)) / 18;
    if (y < domeBase + 30 && dx * dx + dy * dy > 1) continue;
    p.px(x, y, (x - gx) % 4 === 0 || y % 5 === 0 ? GRANITE.dark : GRANITE.light);
  }
  for (let x = gx; x < gx + gw; x++) for (let y = domeBase + 16; y < H; y++) {
    const dx = (x + 0.5 - (gx + gw / 2)) / (gw / 2), dy = (y + 0.5 - (domeBase + 30)) / 14;
    if (y < domeBase + 30 && dx * dx + dy * dy > 1) continue;
    const edge = y < domeBase + 30 && dx * dx + dy * dy > 0.82;
    p.px(x, y, edge ? OUT : mix('#2A2233', '#5B4A6E', Math.max(0, (y - domeBase - 16) / 60)));
  }
  p.rect(gx - 6, H - 3, gw + 12, 3, GRANITE.light); p.hline(gx - 6, gx + gw + 5, H - 3, OUT);
  for (const tx of [gx - 9, gx + gw + 7]) { p.rect(tx, domeBase + 22, 3, 6, '#3A3A44'); p.rect(tx, domeBase + 19, 3, 3, '#FFB300'); p.px(tx + 1, domeBase + 18, '#FFE082'); }
  p.vline(4, domeBase, H - 1, OUT); p.vline(W - 5, domeBase, H - 1, OUT); p.hline(4, W - 5, H - 1, OUT);
  p.oy = 0; p.outline(OUT);
  return { pix: p, top };
}

// ---------- mobiliario ----------
function fountain() {
  const p = new Pix(32, 40), top = 8; p.oy = top;
  p.ellipse(16, 23, 15, 8, GRANITE.base);
  p.ellipse(16, 22, 15, 7, GRANITE.light);
  p.ellipse(16, 22, 12, 5, '#5FB0E6');
  p.ellipse(15, 21, 8, 2.6, '#8DD0F6');
  p.rect(14, 2, 4, 20, GRANITE.base); p.vline(14, 2, 21, GRANITE.light); p.vline(17, 2, 21, GRANITE.dark);
  p.ellipse(16, 3, 7, 2.6, GRANITE.light); p.ellipse(16, 3.3, 5, 1.6, '#6DB8EA');
  p.ellipse(16, -4, 2.2, 2.4, GRANITE.light); p.rect(15, -2, 2, 3, GRANITE.base);
  for (const x of [9, 23]) for (let y = 4; y < 20; y += 2) p.px(x + (y > 12 ? (x < 16 ? -1 : 1) : 0), y, '#BFE8FF');
  p.oy = 0; p.outline(OUT);
  groundShadow(p, 16, 38, 13, 2);
  return { pix: p, top };
}
function cruceiro() {
  const p = new Pix(16, 46), top = 30; p.oy = top;
  p.rect(1, 9, 14, 6, GRANITE.base); p.hline(1, 14, 9, GRANITE.light); p.hline(1, 14, 14, GRANITE.dark);
  p.rect(3, 4, 10, 5, GRANITE.base); p.hline(3, 12, 4, GRANITE.light); p.hline(3, 12, 8, GRANITE.dark);
  p.rect(6, -18, 4, 22, GRANITE.base); p.vline(6, -18, 3, GRANITE.light); p.vline(9, -18, 3, GRANITE.dark);
  p.rect(5, -20, 6, 3, GRANITE.light);
  p.rect(6, -30, 4, 11, GRANITE.light); p.rect(2, -27, 12, 3, GRANITE.light);
  p.hline(2, 13, -25, GRANITE.dark); p.vline(9, -30, -20, GRANITE.base);
  p.rect(7, -26, 2, 4, '#9B8F80');
  p.oy = 0; p.outline(OUT);
  return { pix: p, top };
}
function horreo() {
  const p = new Pix(48, 48), top = 16; p.oy = top;
  for (const x of [4, 21, 39]) {
    p.rect(x, 18, 5, 13, GRANITE.base); p.vline(x, 18, 30, GRANITE.light); p.vline(x + 4, 18, 30, GRANITE.dark);
    p.rect(x - 3, 15, 11, 3, GRANITE.light); p.hline(x - 3, x + 7, 17, GRANITE.dark);
  }
  p.rect(2, 0, 44, 15, '#B98A52');
  for (let x = 4; x < 45; x++) if (x % 3 === 0) p.vline(x, 2, 12, '#5D4127');
  p.rect(2, 0, 44, 2, GRANITE.base); p.rect(2, 13, 44, 2, GRANITE.base);
  p.rect(2, 0, 3, 15, GRANITE.light); p.rect(43, 0, 3, 15, GRANITE.dark);
  trapezoidRoof(p, 0, -10, 48, 11, '#C8643A', { inset: 1, course: 3 });
  p.rect(4, -16, 2, 7, GRANITE.light); p.rect(2, -14, 6, 2, GRANITE.light);
  p.rect(42, -15, 2, 6, GRANITE.light); p.rect(41, -17, 4, 3, GRANITE.light);
  p.oy = 0; p.outline(OUT);
  groundShadow(p, 24, 47, 20, 1.6);
  return { pix: p, top };
}
function lamp() {
  const p = new Pix(16, 36), top = 20; p.oy = top;
  p.rect(5, 12, 6, 4, '#3A3A48'); p.rect(7, -8, 2, 20, '#3A3A48'); p.px(7, -8, '#565668');
  p.rect(4, -17, 8, 9, '#3A3A48'); p.rect(5, -15, 6, 6, '#FFE38A'); p.px(5, -15, '#FFF7D6'); p.px(6, -15, '#FFF7D6');
  p.rect(3, -18, 10, 2, '#3A3A48'); p.rect(7, -20, 2, 2, '#3A3A48');
  p.oy = 0; p.outline(OUT);
  return { pix: p, top };
}
function bench() {
  const p = new Pix(32, 16);
  p.rect(2, 3, 28, 3, WOOD.base); p.hline(2, 29, 3, WOOD.light);
  p.rect(2, 8, 28, 3, WOOD.base); p.hline(2, 29, 8, WOOD.light); p.hline(2, 29, 10, WOOD.dark);
  for (const x of [4, 26]) { p.rect(x, 6, 2, 2, '#3A3A48'); p.rect(x, 11, 2, 4, '#3A3A48'); }
  p.outline(OUT);
  return { pix: p, top: 0 };
}
function fence() {
  const p = new Pix(16, 16);
  p.rect(0, 5, 16, 2, WOOD.light); p.rect(0, 10, 16, 2, WOOD.base);
  p.rect(6, 2, 4, 13, WOOD.base); p.vline(6, 2, 14, WOOD.light); p.vline(9, 2, 14, WOOD.dark);
  p.outline(OUT);
  return { pix: p, top: 0 };
}
function sign() {
  const p = new Pix(16, 16);
  p.rect(7, 9, 2, 6, WOOD.dark);
  p.rect(1, 1, 14, 9, WOOD.base); p.hline(1, 14, 1, WOOD.light); p.hline(1, 14, 9, WOOD.dark);
  for (const y of [4, 6]) p.hline(4, 11, y, WOOD.gap);
  p.outline(OUT);
  return { pix: p, top: 0 };
}
function rock() {
  const p = new Pix(16, 16);
  p.ellipse(8, 10, 6.5, 4.5, GRANITE.base); p.ellipse(7, 9, 4, 2.5, GRANITE.light); p.hline(3, 13, 13, GRANITE.dark);
  p.outline(OUT);
  return { pix: p, top: 0 };
}
function boat(color = '#1E88E5') {
  const p = new Pix(32, 26), top = 10; p.oy = top;
  for (let y = 7; y < 14; y++) {
    const ins = Math.max(0, Math.round((y - 7) * 0.9)) + (y === 7 ? 0 : 1);
    p.hline(2 + ins, 29 - ins, y, y < 9 ? color : y < 10 ? '#FFFFFF' : '#6B4A2E');
  }
  p.px(1, 6, '#6B4A2E'); p.px(30, 6, '#6B4A2E');
  p.vline(15, -10, 7, WOOD.dark);
  for (let y = -9; y < 5; y++) { const w = Math.round((y + 9) * 0.7); p.hline(16, 16 + Math.max(1, w), y, y % 4 === 0 ? '#E8DFC8' : '#F7F1E1'); }
  p.oy = 0; p.outline(OUT);
  return { pix: p, top };
}

// Tablón de anuncios del pueblo, con el logo de IP Messenger y notas clavadas
function board() {
  const p = new Pix(48, 48), top = 32; p.oy = top;
  // postes
  for (const x of [5, 39]) { p.rect(x, -2, 4, 16, WOOD.base); p.vline(x, -2, 13, WOOD.light); p.vline(x + 3, -2, 13, WOOD.dark); }
  // marco y corcho
  p.rect(1, -28, 46, 28, WOOD.dark);
  p.rect(2, -27, 44, 26, WOOD.base); p.hline(2, 45, -27, WOOD.light);
  p.rect(3, -26, 42, 24, '#C9955B');
  for (let k = 0; k < 40; k++) p.px(28 + (k * 7) % 16, -25 + (k * 5) % 22, k % 3 ? '#B07E47' : '#DDB07A');
  // logo
  LOGO.forEach((row, y) => [...row].forEach((ch, x) => p.px(3 + x, -26 + y, LOGO_PALETTE[ch])));
  // notas clavadas
  const note = (x, y, w, h, c) => {
    p.rect(x, y, w, h, c); p.hline(x, x + w - 1, y + h - 1, shade(c, -0.18));
    for (let yy = y + 3; yy < y + h - 1; yy += 2) p.hline(x + 1, x + w - 3, yy, '#9E9A92');
    p.px(x + Math.floor(w / 2), y, '#E53935'); p.px(x + Math.floor(w / 2), y + 1, '#8E1B1B');
  };
  note(29, -24, 8, 10, '#FFFFFF'); note(37, -22, 7, 8, '#FFF59D'); note(30, -13, 13, 9, '#F8BBD0');
  // tejadillo
  trapezoidRoof(p, 0, -32, 48, 6, '#C8643A', { inset: 2, course: 3 });
  p.oy = 0; p.outline(OUT);
  groundShadow(p, 24, 47, 20, 1.3);
  return { pix: p, top };
}

const PAINTERS = { oak, pine, bush, fountain, cruceiro, horreo, lamp, bench, fence, sign, rock, boat, board };

// Sprite de un objeto del mapa. Los edificios reciben el color del departamento.
export function paintObject(o, ctx = {}) {
  switch (o.kind) {
    case 'tree': { const pix = (o.variant === 'pine' ? pine : oak)(o.seed || 1); return { pix, top: pix.h - T }; }
    case 'bush': { const pix = bush(o.variant); return { pix, top: 0 }; }
    case 'building':
      if (o.type === 'arena') return arena(o.w, o.h, ctx.typeColors);
      if (o.type === 'pazo') return pazo(o.w, o.h, o.color, { door: o.door });
      if (o.type === 'mansion') return mansion(o.w, o.h, o.color, { door: o.door });
      return casa(o.w, o.h, o.color, { door: o.door, seed: o.seed, small: o.type === 'casita' });
    default: {
      const f = PAINTERS[o.kind];
      if (!f) return null;
      return f(o.variant);
    }
  }
}

// piezas reutilizadas por worldart.js (cafetería, estación, Cambados…)
export { OUT, GRASS, PATH, COBBLE, SAND, WATER, WOOD, GRANITE, PLASTER, GLASS, DOOR, SLATE,
  grass, path, cobble, sand, groundShadow, oak, pine, trapezoidRoof, stoneBlocks, plasterWall,
  windowAt, doorAt, chimney, galeria, star, casa, mansion, pazo, bench, lamp, sign, rock, fence };
