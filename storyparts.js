// Accesorios de los Paximóns rivales del modo historia (no están en paximon.sprite_parts: se pintan
// aquí con primitivas sobre una rejilla de 64x64 en coordenadas absolutas y contorno automático).
// Roles de color propios (no usan D H L P S X I B, que son del cuerpo); O es el contorno.

function grid() { return Array.from({ length: 64 }, () => Array(64).fill('.')); }
function part(id, draw, palette) {
  const g = grid();
  const px = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < 64 && y < 64) g[y][x] = c; };
  const rect = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(x + i, y + j, c); };
  const ell = (cx, cy, rx, ry, c) => { for (let y = Math.floor(cy - ry) - 1; y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx) - 1; x <= cx + rx + 1; x++) { const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry; if (dx * dx + dy * dy <= 1) px(x, y, c); } };
  const line = (x0, y0, x1, y1, c, t = 1) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1; for (let i = 0; i <= n; i++) rect(x0 + (x1 - x0) * i / n - (t >> 1), y0 + (y1 - y0) * i / n - (t >> 1), t, t, c); };
  draw({ px, rect, ell, line });
  // contorno de 1 px alrededor de lo pintado
  const out = g.map((row, y) => row.map((c, x) => (c !== '.' ? c : [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy]?.[x + dx] && g[y + dy][x + dx] !== '.') ? 'O' : '.')));
  return { id, kind: 'accessory', width: 64, height: 64, offset_x: 0, offset_y: 0, pixels: out.map(r => r.join('')), palette: { O: '#1A1A1A', ...palette } };
}

export const STORY_PARTS = Object.fromEntries([
  // auriculares de teleoperadora con micro (Musiquiña)
  part('st_headset', ({ px, rect, ell, line }) => {
    for (let a = Math.PI; a <= 2 * Math.PI; a += 0.01) { px(32 + Math.cos(a) * 20, 33 + Math.sin(a) * 17, 'K'); px(32 + Math.cos(a) * 20, 34 + Math.sin(a) * 17, 'K'); }
    for (const x of [9, 50]) { rect(x, 29, 6, 11, 'K'); rect(x + 1, 30, 4, 9, 'k'); rect(x + (x < 32 ? 4 : 0), 31, 2, 7, 'R'); }
    line(12, 40, 21, 46, 'K', 2); ell(23, 46, 2.2, 2.2, 'R');
  }, { K: '#37474F', k: '#607D8B', R: '#FF4D6D' }),
  // corbata roja de comercial (Webiño)
  part('st_tie', ({ rect, px }) => {
    for (let i = 0; i < 4; i++) { rect(26 + i, 45 + i, 1, 1, 'W'); rect(37 - i, 45 + i, 1, 1, 'W'); }
    rect(30, 47, 4, 3, 'R'); rect(31, 47, 2, 1, 'r');
    for (let y = 50; y < 59; y++) { const w = y < 56 ? 2 + ((y - 50) >> 1) : 2 + (58 - y); rect(32 - w, y, w * 2, 1, (y % 3 ? 'R' : 'r')); }
    px(32, 59, 'R');
  }, { W: '#FFFFFF', R: '#C62828', r: '#8E1B1B' }),
  // gafas de pasta (Omneíña)
  part('st_glasses', ({ rect }) => {
    for (const x0 of [20, 35]) { rect(x0, 31, 10, 1, 'K'); rect(x0, 38, 10, 1, 'K'); rect(x0, 31, 1, 8, 'K'); rect(x0 + 9, 31, 1, 8, 'K'); rect(x0 + 1, 32, 2, 1, 'w'); }
    rect(30, 33, 5, 1, 'K');
    rect(15, 33, 5, 1, 'K'); rect(45, 33, 5, 1, 'K');
  }, { K: '#1565C0', w: '#E3F2FD' }),
  // una estrella solitaria (Bot de Reseñas)
  part('st_star1', ({ px }) => {
    const cx = 51, cy = 13;
    for (let y = -7; y <= 7; y++) for (let x = -7; x <= 7; x++) {
      const a = Math.atan2(y, x), r = Math.hypot(x, y), k = Math.cos(5 * (a + Math.PI / 2));
      if (r <= 3.5 + 3.5 * Math.max(0, k)) px(cx + x, cy + y, r < 2.5 ? 'y' : 'Y');
    }
  }, { Y: '#FFC107', y: '#FFF59D' }),
  // cunca de albariño (Tintiño Escuro)
  part('st_cunca', ({ rect, ell }) => {
    ell(52, 43, 8, 6, 'W'); rect(44, 36, 17, 7, '.');
    ell(52, 38, 8, 2, 'Y'); rect(45, 41, 15, 1, 'V');
  }, { W: '#FFFFFF', Y: '#F2E27A', V: '#2F6DB5' }),
  // móvil con un corazón en la pantalla (Likeiriña)
  part('st_phone', ({ rect, px }) => {
    rect(47, 28, 10, 17, 'K'); rect(48, 30, 8, 12, 'C');
    for (const [x, y] of [[50, 33], [51, 33], [53, 33], [54, 33], [49, 34], [50, 34], [51, 34], [52, 34], [53, 34], [54, 34], [55, 34], [50, 35], [51, 35], [52, 35], [53, 35], [54, 35], [51, 36], [52, 36], [53, 36], [52, 37]]) px(x, y, 'R');
    rect(51, 43, 2, 1, 'k');
  }, { K: '#212121', k: '#9E9E9E', C: '#B3E5FC', R: '#FF4081' }),
  // antenas de bicho (O Bug do Venres)
  part('st_antennae', ({ line, ell }) => {
    line(27, 14, 21, 3, 'K', 2); line(37, 14, 43, 3, 'K', 2);
    ell(20, 3, 2.6, 2.6, 'G'); ell(44, 3, 2.6, 2.6, 'G');
  }, { K: '#212121', G: '#76FF03' }),
  // sello de lacre caducado (Certificado Caducado)
  part('st_seal', ({ ell, rect }) => {
    rect(47, 50, 3, 8, 'r'); rect(52, 50, 3, 8, 'r');
    ell(51, 47, 6, 6, 'R'); ell(51, 47, 3.5, 3.5, 'r');
  }, { R: '#C62828', r: '#8E1B1B' }),
  // portapapeles con el formulario (O Formulario Infinito)
  part('st_clipboard', ({ rect }) => {
    rect(4, 33, 16, 22, 'M'); rect(6, 36, 12, 17, 'W');
    for (let y = 38; y < 52; y += 3) rect(7, y, 10, 1, 'k');
    rect(8, 31, 8, 4, 'K'); rect(10, 30, 4, 2, 'K');
  }, { M: '#8D6E63', W: '#FFFFFF', k: '#90A4AE', K: '#546E7A' }),
  // el logo cambiable de las plantillas (el color A lo pone cada Paximón)
  part('st_logo', ({ rect }) => {
    rect(27, 16, 11, 9, 'W'); rect(28, 17, 9, 7, 'A'); rect(30, 19, 5, 3, 'W');
  }, { W: '#FFFFFF', A: '#1E88E5' }),
  // halo de datos (O Algoritmo y Algoritmiño)
  part('st_halo', ({ px }) => {
    for (let a = 0; a < Math.PI * 2; a += 0.05) { const x = 32 + Math.cos(a) * 12, y = 13 + Math.sin(a) * 3.2; px(x, y, Math.floor(a * 6) % 3 ? 'C' : 'c'); }
  }, { C: '#40C4FF', c: '#FFFFFF' }),
].map(p => [p.id, p]));
