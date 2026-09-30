// Consumibles y paxicoins: dibujos en píxeles (16x16) y formato de las cantidades.
// Los datos de cada objeto (precio, curación, chakra) vienen de paximon.items.
import { Pix } from './townart.js';

const OUT = '#2B2230';

function cup(p, coffee, band = null) {
  p.ellipse(8, 13.5, 7, 1.8, '#E6E6EE'); p.hline(2, 13, 15, '#BDBDC9');
  p.rect(3, 6, 9, 7, '#FFFFFF'); p.vline(10, 7, 12, '#E2E2EA'); p.vline(11, 6, 12, '#CFCFDA'); p.hline(4, 10, 12, '#E6E6EE');
  p.px(12, 7, '#FFFFFF'); p.px(13, 8, '#FFFFFF'); p.px(13, 9, '#FFFFFF'); p.px(12, 10, '#FFFFFF');
  p.hline(3, 11, 6, coffee); p.hline(4, 9, 6, '#F3E2C7'); p.px(6, 6, '#FFFFFF');
  if (band) { p.hline(3, 11, 9, band); p.hline(3, 11, 10, band); p.px(5, 9, '#FFFFFF'); }
  for (const [x, y] of [[5, 3], [6, 2], [8, 4], [9, 3], [9, 1]]) p.px(x, y, '#E9E4F2');
}
function bocata(p, len) {
  const x0 = Math.round(8 - len / 2), x1 = x0 + len - 1;
  for (let x = x0; x <= x1; x++) {
    const edge = x === x0 || x === x1;
    p.vline(x, edge ? 6 : 5, edge ? 9 : 7, '#E0A95B');
    p.vline(x, edge ? 11 : 10, edge ? 11 : 12, '#C98A3E');
  }
  for (let x = x0 + 1; x < x1; x++) { p.px(x, 8, x % 3 ? '#E86A5A' : '#B8453A'); p.px(x, 9, x % 2 ? '#FFD54F' : '#F2B233'); }
  for (let x = x0 + 2; x < x1 - 1; x += 3) { p.px(x, 5, '#F5CC8A'); p.px(x + 1, 6, '#C98A3E'); }
  p.px(x1, 9, '#FFD54F'); p.px(x0, 8, '#E86A5A');
}
const PAINT = {
  cafe_leche: (p) => cup(p, '#B07A4A'),
  cafe_sin_lactosa: (p) => cup(p, '#A8733F', '#43A047'),
  bocata_mediano: (p) => bocata(p, 14),
  bocata_pequeno: (p) => bocata(p, 9),
};

const cache = new Map();
export function itemPix(id) {
  const p = new Pix(16, 16);
  (PAINT[id] || ((q) => { q.rect(4, 4, 8, 8, '#9E9E9E'); }))(p);
  p.outline(OUT);
  return p;
}
// canvas de 16x16 (el CSS lo escala en pixelado)
export function itemCanvas(id) {
  let src = cache.get(id);
  if (!src) { src = itemPix(id).toCanvas(); cache.set(id, src); }
  const cv = document.createElement('canvas');
  cv.width = 16; cv.height = 16; cv.className = 'item-ico';
  cv.getContext('2d').drawImage(src, 0, 0);
  return cv;
}

// paxicoin: moneda dorada con la estrella de Páxinas Galegas
export function coinPix() {
  const p = new Pix(12, 12);
  p.ellipse(6, 6, 5.6, 5.6, '#E0A21C'); p.ellipse(6, 6, 4.6, 4.6, '#FFC83D'); p.ellipse(5.4, 5.2, 3, 3, '#FFD86B');
  const star = [[6, 2], [5, 4], [6, 4], [7, 4], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [5, 6], [6, 6], [7, 6], [4, 7], [5, 7], [7, 7], [8, 7], [4, 8], [8, 8]];
  for (const [x, y] of star) p.px(x, y, '#FF8F00');
  p.outline(OUT);
  return p;
}
let coinUrl = null;
export function coinDataUrl() {
  if (!coinUrl) coinUrl = coinPix().toCanvas().toDataURL();
  return coinUrl;
}
// 5 -> "5", 1.5 -> "1,50", 3.25 -> "3,25"
export function fmtCoins(n) {
  const v = Math.round(Number(n || 0) * 100) / 100;
  return Number.isInteger(v) ? String(v) : v.toFixed(2).replace('.', ',');
}
