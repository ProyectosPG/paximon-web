// Escenarios de combate pintados por código en píxeles (uno por tipo), con las dos
// plataformas donde se plantan los Paximóns, al estilo de los combates de Pokémon.
// Se pintan a la resolución nativa que pida el campo (ancho/escala), así que el escalado
// siempre es entero. También se pueden renderizar en Node (tools/town/stages.mjs).
import { Pix, rng, hash } from './townart.js';
import { mix, shade } from './avatar.js';

// posición de las plataformas (en fracción del escenario): rival arriba a la derecha, tú abajo a la izquierda
export const LAYOUT = {
  foe: { cx: 0.70, cy: 0.52, rx: 0.17, ry: 0.06 },
  me:  { cx: 0.26, cy: 0.88, rx: 0.22, ry: 0.075 },
};

// ---------- utilidades ----------
const BAYER = [[0, 0.5], [0.75, 0.25]];
function vgrad(p, y0, y1, stops) {       // degradado vertical en bandas con tramado ordenado
  const n = stops.length - 1;
  for (let y = y0; y < y1; y++) {
    const t = ((y - y0) / Math.max(1, y1 - y0 - 1)) * n;
    const i = Math.min(n - 1, Math.floor(t)), f = t - i;
    for (let x = 0; x < p.w; x++) p.px(x, y, f > BAYER[y & 1][x & 1] + 0.125 ? stops[i + 1] : stops[i]);
  }
}
const ramp = (a, b, n) => Array.from({ length: n }, (_, i) => mix(a, b, i / (n - 1)));
function ridge(p, top, color, y1 = p.h) { for (let x = 0; x < p.w; x++) for (let y = Math.max(0, Math.round(top(x))); y < y1; y++) p.px(x, y, color); }
const waves = (base, parts) => (x) => base + parts.reduce((s, [a, f, ph]) => s + a * Math.sin(x * f + ph), 0);
function blob(p, cx, cy, r, c, light, dark) {
  p.ellipse(cx, cy, r, r * 0.9, c);
  if (dark) p.ellipse(cx + r * 0.25, cy + r * 0.3, r * 0.75, r * 0.55, dark);
  if (light) p.ellipse(cx - r * 0.3, cy - r * 0.35, r * 0.45, r * 0.35, light);
}
function sparkle(p, x, y, c) { p.px(x, y, c); p.px(x - 1, y, c); p.px(x + 1, y, c); p.px(x, y - 1, c); p.px(x, y + 1, c); }
export function platform(p, cx, cy, rx, ry, pal) {
  p.ellipse(cx, cy + 3, rx, ry, pal.side);
  p.ellipse(cx, cy + 3, rx * 0.97, ry * 0.9, shade(pal.side, -0.15));
  p.ellipse(cx, cy, rx, ry, pal.edge);
  p.ellipse(cx, cy - 0.5, rx - 1.5, ry - 1.2, pal.top);
  p.ellipse(cx - rx * 0.1, cy - ry * 0.25, rx * 0.72, ry * 0.55, pal.light);
  if (pal.tuft) for (let i = 0; i < 14; i++) {
    const a = Math.PI * (0.08 + (i / 13) * 0.84), x = Math.round(cx + Math.cos(a) * rx), y = Math.round(cy + Math.sin(a) * ry);
    p.px(x, y - 1, pal.tuft); p.px(x + 1, y - 2, pal.tuft);
  }
}

// ---------- escenarios ----------
function fraga(p, W, H, f, r) {
  const hz = Math.round(H * 0.5);
  vgrad(p, 0, hz, ramp('#8FD3F2', '#E6F7E4', 6));
  // rayos de sol entre los árboles
  for (const [x0, w] of [[W * 0.22, 7], [W * 0.6, 9]])
    for (let y = 0; y < hz - 12; y++) for (let x = Math.round(x0 + y * 0.45); x < x0 + y * 0.45 + w; x++) if ((x + 2 * y) % 4 === 0) p.px(x, y, '#F7FCEF');
  ridge(p, waves(hz - 18, [[4, 0.05, 1], [2, 0.13, 2]]), '#9CC7AE', hz);
  ridge(p, waves(hz - 10, [[3, 0.08, 3], [2, 0.2, 1]]), '#6FAE84', hz);
  for (let x = -4; x < W + 8; x += 7 + Math.floor(r() * 5)) blob(p, x, hz - 6 - r() * 5, 6 + r() * 4, '#3E8A52', '#5AA868', '#2F6B3F');
  vgrad(p, hz, H, ramp('#86CC6E', '#5E9F4C', 5));
  for (let i = 0; i < W * 0.9; i++) { const x = Math.floor(r() * W), y = hz + 2 + Math.floor(r() * (H - hz - 2)); p.px(x, y, '#A7DD8B'); p.px(x + 1, y + 1, '#4E8F42'); }
  // carballos grandes enmarcando
  for (const [cx, s] of [[-6, 1], [W + 4, 1.1]]) {
    p.rect(cx - 4, Math.round(H * 0.1), 9, H, '#5D4030'); p.vline(cx + 4, Math.round(H * 0.1), H, '#3F2B20');
    blob(p, cx, H * 0.12, 26 * s, '#2F6B3F', '#4E8F57', '#23532F'); blob(p, cx + 12, H * 0.28, 16 * s, '#347646', '#58A064', '#23532F');
  }
  for (const x of [W * 0.06, W * 0.94]) for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k - 3) * 0.35; for (let t = 0; t < 12; t++) p.px(x + Math.cos(a) * t, H - 2 + Math.sin(a) * t * 0.8, k % 2 ? '#3F8F46' : '#56A85A'); }
  return { top: '#8FD17A', light: '#A9E08F', side: '#7A5536', edge: '#4F8F45', tuft: '#3E7F3A' };
}
function mar(p, W, H, f, r) {
  const hz = Math.round(H * 0.44), shore = Math.round(H * 0.62);
  vgrad(p, 0, hz, ramp('#4FA8EC', '#D2F0FF', 6));
  for (const [cx, cy, s] of [[W * 0.2, H * 0.14, 1], [W * 0.52, H * 0.08, 0.8], [W * 0.38, H * 0.25, 0.6]]) {
    for (const [dx, dy, rr] of [[-10, 2, 6], [-3, -2, 8], [6, 0, 7], [13, 3, 5]]) p.ellipse(cx + dx * s, cy + dy * s, rr * s, rr * 0.7 * s, '#FFFFFF');
    p.hline(Math.round(cx - 14 * s), Math.round(cx + 17 * s), Math.round(cy + 5 * s), '#D5E9F5');
  }
  // acantilado con el faro
  ridge(p, (x) => (x < W * 0.74 ? H : H * 0.3 + Math.max(0, (W * 0.82 - x)) * 1.4 + Math.sin(x * 0.4) * 1.5), '#6B6259', shore);
  ridge(p, (x) => (x < W * 0.78 ? H : H * 0.34 + Math.max(0, (W * 0.84 - x)) * 1.4 + Math.sin(x * 0.6)), '#857A6E', shore);
  const lx = Math.round(W * 0.88), ly = Math.round(H * 0.3);
  p.rect(lx - 3, ly - 18, 7, 18, '#F4F1EA'); p.vline(lx + 3, ly - 18, ly - 1, '#CFC8BA'); p.rect(lx - 3, ly - 12, 7, 2, '#D84A3A');
  p.rect(lx - 4, ly - 22, 9, 4, '#3A3A48'); p.rect(lx - 2, ly - 21, 5, 2, f ? '#FFF59D' : '#FFD54F'); p.rect(lx - 3, ly - 24, 7, 2, '#D84A3A');
  if (f) { for (let i = 1; i < 16; i++) { p.px(lx - 4 - i * 2, ly - 20 + (i >> 2), '#FFF9C4'); } }
  // mar con oleaje
  vgrad(p, hz, shore, ['#236FB8', '#2E86D2', '#3C9BE2', '#52B0EC']);
  for (let y = hz + 2; y < shore - 1; y += 3) for (let x = ((y * 7 + f * 5) % 11); x < W; x += 11) { p.hline(x, x + 3, y, '#8FD0F7'); }
  vgrad(p, shore, H, ['#D4BF86', '#EEDCA6', '#F4E3B0', '#EAD49C']);
  for (let x = 0; x < W; x++) { const y = shore + Math.round(Math.sin(x * 0.25 + f * 2) * 1.2); p.px(x, y - 1, '#CBEBFA'); p.px(x, y, '#FFFFFF'); p.px(x, y + 1, '#E3F4FC'); }
  for (let i = 0; i < W * 0.8; i++) p.px(Math.floor(r() * W), shore + 3 + Math.floor(r() * (H - shore - 3)), r() < 0.5 ? '#D2BD84' : '#FFF3CF');
  for (const [x, y, s] of [[W * 0.05, H * 0.8, 9], [W * 0.12, H * 0.9, 6], [W * 0.96, H * 0.95, 8]]) blob(p, x, y, s, '#7E766C', '#A59C90', '#5A534B');
  return { top: '#F6E6B4', light: '#FFF4D2', side: '#C9AE72', edge: '#B89B5E', tuft: null };
}
function pedra(p, W, H, f, r) {
  const hz = Math.round(H * 0.5);
  vgrad(p, 0, hz, ramp('#F2B36B', '#FFF1CC', 6));
  p.ellipse(W * 0.3, hz - 10, 14, 14, '#FFE9B0'); p.ellipse(W * 0.3, hz - 10, 11, 11, '#FFF6D8');
  ridge(p, waves(hz - 16, [[5, 0.03, 2], [2, 0.11, 1]]), '#C4A88D', hz);
  ridge(p, waves(hz - 8, [[3, 0.06, 0], [2, 0.17, 2]]), '#9D9A6E', hz);
  // hórreo y cruceiro a lo lejos
  const hx = Math.round(W * 0.12), hy = hz - 4;
  for (const dx of [2, 10, 18]) p.rect(hx + dx, hy - 5, 2, 5, '#8A8174');
  p.rect(hx, hy - 7, 22, 2, '#B9B1A4'); p.rect(hx + 1, hy - 15, 20, 8, '#A57A4E');
  for (let x = hx + 2; x < hx + 20; x += 2) p.vline(x, hy - 14, hy - 9, '#6E4E30');
  for (let j = 0; j < 4; j++) p.hline(hx - 1 + j, hx + 22 - j, hy - 16 - j, j % 2 ? '#B35A33' : '#C8643A');
  p.rect(hx + 1, hy - 23, 1, 4, '#D8D2C7'); p.rect(hx, hy - 22, 3, 1, '#D8D2C7');
  const cx = Math.round(W * 0.47);
  p.rect(cx - 3, hz - 3, 7, 3, '#9C958A'); p.rect(cx - 1, hz - 18, 2, 15, '#B3AC9F'); p.rect(cx - 4, hz - 15, 8, 2, '#B3AC9F');
  vgrad(p, hz, H, ramp('#C8B98C', '#9E9068', 5));
  // muro de pedra
  for (let x = -3; x < W; x += 6 + Math.floor(r() * 3)) blob(p, x, hz + 1, 3 + r() * 1.5, '#A8A194', '#C9C3B8', '#7E786D');
  for (let i = 0; i < W * 0.7; i++) p.px(Math.floor(r() * W), hz + 5 + Math.floor(r() * (H - hz - 5)), r() < 0.5 ? '#B3A57A' : '#D8CCA2');
  for (const [x, y, s] of [[W * 0.04, H * 0.72, 12], [W * 0.97, H * 0.66, 10], [W * 0.9, H * 0.93, 7]]) blob(p, x, y, s, '#B3ADA2', '#D6D1C8', '#857E73');
  return { top: '#CFC8BC', light: '#E6E1D8', side: '#8E877B', edge: '#736C61', tuft: '#8E9A5E' };
}
function meiga(p, W, H, f, r) {
  const hz = Math.round(H * 0.52);
  vgrad(p, 0, hz, ['#0E0A24', '#1A1238', '#2A1C4F', '#3B2766']);
  for (let i = 0; i < W * 0.35; i++) { const x = Math.floor(r() * W), y = Math.floor(r() * (hz - 8)); p.px(x, y, r() < 0.3 ? '#FFF8D6' : '#9C8FD0'); }
  for (let i = 0; i < 4; i++) sparkle(p, Math.floor(r() * W), Math.floor(r() * hz * 0.6), '#FFF8D6');
  const mx = Math.round(W * 0.2), my = Math.round(H * 0.2);
  p.ellipse(mx, my, 17, 17, '#2E2358'); p.ellipse(mx, my, 13, 13, '#F4EFC8');
  for (const [dx, dy, rr] of [[-4, -3, 3], [4, 2, 2.4], [-1, 5, 1.8], [5, -5, 1.4]]) p.ellipse(mx + dx, my + dy, rr, rr, '#DDD5A6');
  ridge(p, waves(hz - 12, [[4, 0.04, 1], [2, 0.14, 0]]), '#1E1638', hz);
  // cruceiro na encrucillada
  const cx = Math.round(W * 0.5);
  p.rect(cx - 5, hz - 4, 11, 4, '#16102C'); p.rect(cx - 1, hz - 26, 3, 22, '#16102C'); p.rect(cx - 6, hz - 22, 13, 3, '#16102C');
  // carballos retorcidos en silueta
  for (const [x, dir] of [[W * 0.03, 1], [W * 0.97, -1]]) {
    p.rect(Math.round(x) - 3, Math.round(H * 0.15), 7, H, '#0B0818');
    for (let k = 0; k < 4; k++) for (let t = 0; t < 22; t++) p.px(x + dir * t, H * (0.2 + k * 0.1) - t * (0.4 + k * 0.15), '#0B0818');
    blob(p, x + dir * 8, H * 0.12, 16, '#120C26', null, null);
  }
  vgrad(p, hz, H, ['#2B2146', '#33284F', '#3B2E5C']);
  // néboa
  for (const [y, a] of [[hz - 2, 0.6], [hz + 6, 0.45], [H * 0.8, 0.35]])
    for (let x = 0; x < W; x++) for (let k = 0; k < 3; k++) if (((x + k * 3) % 4) && Math.sin(x * 0.08 + k + y) > -a) p.px(x, Math.round(y + k), mix('#6B4E9E', '#3B2E5C', k / 3));
  // luces da Santa Compaña
  for (const [x, y] of [[W * 0.36, hz - 1], [W * 0.4, hz - 2], [W * 0.44, hz - 1], [W * 0.84, H * 0.7]]) { p.ellipse(x, y, 2.4, 2.4, f ? '#3E6C8A' : '#2F5470'); p.px(x, y, '#D6FBFF'); p.px(x, y - 1, '#9EF0FF'); }
  return { top: '#4A3C6E', light: '#5C4B86', side: '#231A3D', edge: '#8A63D2', tuft: '#6B8F5A' };
}
function festa(p, W, H, f, r) {
  const hz = Math.round(H * 0.5);
  vgrad(p, 0, hz, ['#140F33', '#241A4A', '#43275E', '#6E3565']);
  for (let i = 0; i < W * 0.2; i++) p.px(Math.floor(r() * W), Math.floor(r() * hz * 0.7), '#8C80C8');
  // foguetes
  for (const [x, y, c, s] of [[W * 0.18, H * 0.16, '#FF4D6D', 12], [W * 0.55, H * 0.1, '#FFD54F', 10], [W * 0.85, H * 0.2, '#4FC3F7', 9]]) {
    const n = 12, rr = f ? s : s * 0.85;
    for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2; for (let t = rr * 0.35; t < rr; t += 1.5) p.px(x + Math.cos(a) * t, y + Math.sin(a) * t, t > rr * 0.75 ? '#FFFFFF' : c); }
  }
  // palco da música
  const px0 = Math.round(W * 0.34), pw = 44, py = hz;
  p.rect(px0, py - 6, pw, 6, '#3A2340'); p.rect(px0 + 2, py - 20, pw - 4, 14, '#FFB74D');
  for (let x = px0 + 2; x < px0 + pw - 2; x += 8) p.rect(x, py - 20, 2, 14, '#3A2340');
  for (let j = 0; j < 8; j++) p.hline(px0 - 3 + j * 3, px0 + pw + 2 - j * 3, py - 21 - j, j % 2 ? '#5A2E4F' : '#6B3A5E');
  p.rect(px0 + pw / 2 - 1, py - 32, 2, 4, '#FFD54F');
  // cordeles de farolillos
  const bulbs = ['#FF4D6D', '#FFD54F', '#4FC3F7', '#7CE87C', '#FF9E40'];
  for (const [y0, sag] of [[H * 0.06, 10], [H * 0.3, 7]]) {
    for (let x = 0; x < W; x++) {
      const y = y0 + sag * Math.sin(((x % 70) / 70) * Math.PI);
      p.px(x, y, '#2B2230');
      if (x % 9 === 4) { const c = bulbs[(Math.floor(x / 9) + f) % bulbs.length]; p.rect(x - 1, Math.round(y) + 1, 3, 3, c); p.px(x - 1, Math.round(y) + 1, '#FFFFFF'); }
    }
  }
  vgrad(p, hz, H, ['#6A4A4E', '#5A3E43', '#4A3237']);
  for (let y = hz + 2; y < H; y += 4) for (let x = (y % 8) ? 0 : 3; x < W; x += 7) p.hline(x, x + 1, y, '#4A3237');
  const conf = ['#FF4D6D', '#FFD54F', '#4FC3F7', '#7CE87C'];
  for (let i = 0; i < W * 0.5; i++) p.px(Math.floor(r() * W), hz + 2 + Math.floor(r() * (H - hz - 2)), conf[i % 4]);
  return { top: '#8A6A60', light: '#A8857A', side: '#3E2A2E', edge: '#FFB74D', tuft: null };
}

export const STAGES = {
  festa: { name: 'Verbena da praza', paint: festa, animated: true },
  meiga: { name: 'Encrucillada á medianoite', paint: meiga, animated: true },
  fraga: { name: 'Fragas do Eume', paint: fraga, animated: false },
  pedra: { name: 'Eira do hórreo', paint: pedra, animated: false },
  mar:   { name: 'Costa da Morte', paint: mar, animated: true },
};
export const STAGE_KEYS = Object.keys(STAGES);
export function stageFor(matchId) {
  let h = 0; for (const ch of String(matchId)) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return STAGE_KEYS[Math.abs(h) % STAGE_KEYS.length];
}

// Pinta un escenario completo (fondo + plataformas) de W x H píxeles nativos
export function paintStage(key, W, H, frame = 0) {
  const st = STAGES[key] || STAGES.fraga;
  const p = new Pix(W, H);
  const plat = st.paint(p, W, H, frame, rng(hash(W, H, key.length)));
  for (const k of ['foe', 'me']) {
    const L = LAYOUT[k];
    platform(p, W * L.cx, H * L.cy, W * L.rx, H * L.ry * (k === 'me' ? 1 : 1), plat);
  }
  return p;
}
