// Avatares del pueblo: personajes de 16x22 píxeles vistos desde arriba, al estilo de los
// entrenadores de Pokémon. Se componen por capas (cuerpo, cabeza y pelo) dibujadas a mano
// con roles de color, igual que los sprites de los Paximóns:
//   O contorno · S piel, B mejillas · H pelo, h pelo oscuro, i brillo del pelo
//   C camiseta (color del departamento), c sombra, L luz · P pantalón · F zapatos

export const SKINS = ['#FFDDB8', '#F2BE8C', '#C98D5B', '#8A583A'];
export const HAIRS = ['#3A281E', '#6E4124', '#A8672F', '#E8BC55', '#23232B', '#B8432A', '#BDBDC9', '#7E57C2'];
export const HAIR_NAMES = ['Castaño oscuro', 'Castaño', 'Avellana', 'Rubio', 'Negro', 'Pelirrojo', 'Canoso', 'Morado'];
export const STYLES = [
  { id: 'corto', name: 'Corto' },
  { id: 'largo', name: 'Largo' },
  { id: 'mono', name: 'Moño' },
  { id: 'rizos', name: 'Rizos' },
];
export const DIRS = ['down', 'up', 'left', 'right'];
export const AW = 16, AH = 22;

// ---------- capas ----------
const HEAD_Y = 2, BODY_Y = 13;

const HEAD = {
  down: [
    '.....OOOOOO.....',
    '...OOSSSSSSOO...',
    '..OSSSSSSSSSSO..',
    '.OSSSSSSSSSSSSO.',
    '.OSSSSSSSSSSSSO.',
    '.OSSSSSSSSSSSSO.',
    '.OSSSSSSSSSSSSO.',
    '.OSSSOSSSSOSSSO.',
    '.OSSSOSSSSOSSSO.',
    '..OSBSSSSSSBSO..',
    '...OOSSSSSSOO...',
  ],
  up: [
    '.....OOOOOO.....',
    '...OOSSSSSSOO...',
    '..OSSSSSSSSSSO..',
    '.OSSSSSSSSSSSSO.',
    '.OSSSSSSSSSSSSO.',
    '.OSSSSSSSSSSSSO.',
    '.OSSSSSSSSSSSSO.',
    '.OSSSSSSSSSSSSO.',
    '.OSSSSSSSSSSSSO.',
    '..OSSSSSSSSSSO..',
    '...OOSSSSSSOO...',
  ],
  left: [
    '......OOOOO.....',
    '....OOSSSSSOO...',
    '...OSSSSSSSSSO..',
    '..OSSSSSSSSSSSO.',
    '..OSSSSSSSSSSSO.',
    '.OSSSSSSSSSSSSO.',
    '.OSSSSSSSSSSSSO.',
    '.OSSOSSSSSSSSSO.',
    'OSSSOSSSSSSSSO..',
    '.OSBSSSSSSSSSO..',
    '..OOSSSSSSOOO...',
  ],
};

// pelo: {y, rows} por peinado y dirección (se pinta encima de la cabeza)
const HAIR = {
  corto: {
    down: { y: 2, rows: [
      '.....OOOOOO.....',
      '...OOHHHHHHOO...',
      '..OHHHHHHHHHHO..',
      '.OHHiiHHHHHHHHO.',
      '.OHiHHHHHHHHHHO.',
      '.OHHhHHhHHhHHHO.',
      '.OHh........hHO.',
      '.Oh..........hO.',
    ] },
    up: { y: 2, rows: [
      '.....OOOOOO.....',
      '...OOHHHHHHOO...',
      '..OHHHHHHHHHHO..',
      '.OHHiiHHHHHHHHO.',
      '.OHiHHHHHHHHHHO.',
      '.OHHHHHHHHHHHHO.',
      '.OHHHHHHHHHHHHO.',
      '.OhHHHHHHHHHHhO.',
      '.OhhHHHHHHHHhhO.',
      '..OhhhhhhhhhhO..',
    ] },
    left: { y: 2, rows: [
      '......OOOOO.....',
      '....OOHHHHHOO...',
      '...OHHHHHHHHHO..',
      '..OHHiiHHHHHHHO.',
      '..OHiHHHHHHHHHO.',
      '.OHHhHHHHHHHHHO.',
      '.OhH...HHHHHHHO.',
      '.......OsHHHHhO.',
      '........OHHhhO..',
      '.........OhhhO..',
    ] },
  },
  largo: {
    down: { y: 2, rows: [
      '.....OOOOOO.....',
      '...OOHHHHHHOO...',
      '..OHHHHHHHHHHO..',
      '.OHHiiHHHHHHHHO.',
      '.OHiHHHHHHHHHHO.',
      '.OHHhHHhHHhHHHO.',
      '.OHh........hHO.',
      '.OHh........hHO.',
      '.OHh........hHO.',
      '.OHh........hHO.',
      '.OHH........HHO.',
      '.OhHO......OHhO.',
      '..OO........OO..',
    ] },
    up: { y: 2, rows: [
      '.....OOOOOO.....',
      '...OOHHHHHHOO...',
      '..OHHHHHHHHHHO..',
      '.OHHiiHHHHHHHHO.',
      '.OHiHHHHHHHHHHO.',
      '.OHHHHHHHHHHHHO.',
      '.OHHHHHHHHHHHHO.',
      '.OHHHHHHHHHHHHO.',
      '.OhHHHHHHHHHHhO.',
      '.OhHHHHHHHHHHhO.',
      '.OhhHHHHHHHHhhO.',
      '.OhhhHHHHHHhhhO.',
      '..OOhhhhhhhhOO..',
      '....OOOOOOOO....',
    ] },
    left: { y: 2, rows: [
      '......OOOOO.....',
      '....OOHHHHHOO...',
      '...OHHHHHHHHHO..',
      '..OHHiiHHHHHHHO.',
      '..OHiHHHHHHHHHO.',
      '.OHHhHHHHHHHHHO.',
      '.OhH...HHHHHHHO.',
      '.......OsHHHHhO.',
      '........OHHHHhO.',
      '........OHHHHhO.',
      '........OHHHhhO.',
      '........OhHhhO..',
      '.........OhhO...',
      '..........OO....',
    ] },
  },
  mono: {
    down: { y: 0, rows: [
      '......OOOO......',
      '.....OHiHHO.....',
      '....OOHHhHOO....',
      '...OHHHHHHHHO...',
      '..OHHHHHHHHHHO..',
      '.OHHiiHHHHHHHHO.',
      '.OHiHHHHHHHHHHO.',
      '.OHHHHHHHHHHHHO.',
      '.OHh........hHO.',
      '.Oh..........hO.',
    ] },
    up: { y: 0, rows: [
      '......OOOO......',
      '.....OHiHHO.....',
      '....OOHHhHOO....',
      '...OHHHHHHHHO...',
      '..OHHHHHHHHHHO..',
      '.OHHiiHHHHHHHHO.',
      '.OHiHHHHHHHHHHO.',
      '.OHHHHHHHHHHHHO.',
      '.OHHHHHHHHHHHHO.',
      '.OhHHHHHHHHHHhO.',
      '.OhhHHHHHHHHhhO.',
      '..OhhhhhhhhhhO..',
    ] },
    left: { y: 0, rows: [
      '.........OOOO...',
      '........OHiHHO..',
      '......OOOHHhhO..',
      '....OOHHHHHHOO..',
      '...OHHHHHHHHHO..',
      '..OHHiiHHHHHHHO.',
      '..OHiHHHHHHHHHO.',
      '.OHHHHHHHHHHHHO.',
      '.Oh....HHHHHHHO.',
      '.......OsHHHHhO.',
      '........OHHhhO..',
      '.........OhhhO..',
    ] },
  },
  rizos: {
    down: { y: 0, rows: [
      '....OO.OO.OO....',
      '...OHHOHHOHHO...',
      '..OHHHHHHHHHHO..',
      '.OHHiHHHHiHHHHO.',
      'OHHiHHHHHHHHiHHO',
      'OHHHHHHhHHHHHHHO',
      'OHHhHHHHHHHhHHHO',
      'OHHHhHhHHhHhHHHO',
      'OHHh........hHHO',
      '.OHh........hHO.',
      '.OH..........HO.',
    ] },
    up: { y: 0, rows: [
      '....OO.OO.OO....',
      '...OHHOHHOHHO...',
      '..OHHHHHHHHHHO..',
      '.OHHiHHHHiHHHHO.',
      'OHHiHHHHHHHHiHHO',
      'OHHHHHHhHHHHHHHO',
      'OHHhHHHHHHHhHHHO',
      'OHHHHHhHHHHHHhHO',
      'OHHHhHHHHHhHHHHO',
      '.OHhHHHHHHHHhHO.',
      '.OhhHHhHHhHHhhO.',
      '..OhhhhhhhhhhO..',
    ] },
    left: { y: 0, rows: [
      '.....OO.OO.OO...',
      '....OHHOHHOHHO..',
      '...OHHHHHHHHHHO.',
      '..OHHiHHHHiHHHHO',
      '..OHiHHHHHHHHiHO',
      '.OHHHHhHHHHHHHHO',
      '.OHHhHHHHHHhHHHO',
      '.OHhHHHHHHHHHhHO',
      '.OhH...HHHHHHhHO',
      '.......OsHHHHHHO',
      '........OHHhHHO.',
      '.........OhhhO..',
    ] },
  },
};

// cuerpo: [quieto, paso 1, paso 2] por dirección
const BODY_FRONT = [
  [
    '....OCCCCCCO....',
    '..OCCCCCCCCCCO..',
    '.OCOCLCCCCCCOCO.',
    '.OCOCCCCCCCcOCO.',
    '.OSOPPPPPPPPOSO.',
    '..OOPPPPPPPpOO..',
    '...OPPPOOPPpO...',
    '...OFFFOOFFFO...',
    '....OOO..OOO....',
  ],
  [
    '....OCCCCCCO....',
    '..OCCCCCCCCCCO..',
    '.OSOCLCCCCCCOCO.',
    '.OOOCCCCCCCcOCO.',
    '...OPPPPPPPPOSO.',
    '..OOPPPPPPPpOO..',
    '...OPPPOOFFFO...',
    '...OFFFO.OOO....',
    '....OOO.........',
  ],
  [
    '....OCCCCCCO....',
    '..OCCCCCCCCCCO..',
    '.OCOCLCCCCCCOSO.',
    '.OCOCCCCCCCcOOO.',
    '.OSOPPPPPPPPO...',
    '..OOPPPPPPPpOO..',
    '...OFFFOOPPpO...',
    '....OOO.OFFFO...',
    '.........OOO....',
  ],
];
const BODY = {
  down: BODY_FRONT,
  up: BODY_FRONT,
  left: [
    [
      '.....OCCCCO.....',
      '....OCCCCCCO....',
      '....OCLCCCCO....',
      '....OCcCCCCO....',
      '....OSOPPPPO....',
      '....OPPPPPpO....',
      '.....OPPPpO.....',
      '....OFFFFFO.....',
      '....OOOOOO......',
    ],
    [
      '.....OCCCCO.....',
      '....OCCCCCCO....',
      '....OCLCCCCO....',
      '...OCcCCCCCO....',
      '...OSOPPPPPO....',
      '....OPPPPPpO....',
      '...OPPO.OPpO....',
      '..OFFFO..OFFO...',
      '..OOOO...OOO....',
    ],
    [
      '.....OCCCCO.....',
      '....OCCCCCCO....',
      '....OCLCCCCO....',
      '....OCCCcCCO....',
      '....OPPPSOPO....',
      '....OPPPPPpO....',
      '...OPPO.OPpO....',
      '..OFFFO..OFFO...',
      '..OOOO...OOO....',
    ],
  ],
};

// complementos de los vecinos (no los eligen los jugadores): se pintan encima, por dirección,
// como [fila, patrón]. 'right' es 'left' en espejo. Roles propios: W blanco, T/t corbata,
// Q/q gorra y visera, Y logo, M/m maletín, G gafas, U bigote, A/a delantal, N nariz, R chapa.
const EXTRAS = {
  tie: {
    down: [[13, '......WTTW......'], [14, '.......TT.......'], [15, '.......TT.......'], [16, '.......tt.......']],
    left: [[13, '......W.........'], [14, '......T.........'], [15, '......T.........'], [16, '......t.........']],
  },
  case: {
    down: [[18, 'OMMMO...........'], [19, 'OMmMO...........'], [20, '.OOO............']],
    up: [[18, '...........OMMMO'], [19, '...........OMmMO'], [20, '............OOO.']],
    left: [[18, '....OMMMO.......'], [19, '....OMmMO.......'], [20, '.....OOO........']],
  },
  glasses: {
    down: [[8, '....GGG..GGG....'], [9, '....G.GGGG.G....'], [10, '....G.G..G.G....']],
    left: [[8, '...GGG..........'], [9, '...G.GGGGGG.....'], [10, '...G.G..........']],
  },
  sunglasses: {
    down: [[9, '...GGGGGGGGGG...'], [10, '....GGG..GGG....']],
    left: [[9, '.GGGGGGGGGG.....'], [10, '..GGGG..........']],
  },
  mustache: {
    down: [[11, '......UUUU......']],
    left: [[11, '.UUU............']],
  },
  nose: {
    down: [[10, '.......NN.......']],
    left: [[10, 'NN..............']],
  },
  apron: {
    down: [[15, '.....AAAAAA.....'], [16, '.....AAAAAA.....'], [17, '....AaAAAAaA....'], [18, '....AAAAAAAA....']],
    left: [[15, '.....AA.........'], [16, '.....AA.........'], [17, '.....AAA........'], [18, '.....AAA........']],
  },
  cap: {
    down: [[2, '.....OOOOOO.....'], [3, '...OOQQQQQQOO...'], [4, '..OQQQQYYQQQQO..'], [5, '.OQQQQYYYYQQQQO.'], [6, '.OqqqqqqqqqqqqO.'], [7, '..OOOOOOOOOOOO..']],
    up: [[2, '.....OOOOOO.....'], [3, '...OOQQQQQQOO...'], [4, '..OQQQQQQQQQQO..'], [5, '.OQQQQQQQQQQQQO.'], [6, '.OQQQQQQQQQQQQO.'], [7, '..OOOOOOOOOOOO..']],
    left: [[2, '......OOOOO.....'], [3, '....OOQQQQQOO...'], [4, '...OQQYYQQQQQO..'], [5, '.OOQQYYYYQQQQQO.'], [6, 'OqqqqqqQQQQQQQO.'], [7, '.OOOOOOOOOOOOOO.']],
  },
  badge: {
    down: [[15, '.........RR.....'], [16, '.........RR.....']],
    left: [[15, '.......R........']],
  },
  // acreditación de prácticas (modo historia): cinta naranja y tarjeta
  lanyard: {
    down: [[13, '.....Z....Z.....'], [14, '......Z..Z......'], [15, '.......ZZ.......'], [16, '......WWWW......'], [17, '......WzzW......']],
    up: [[13, '.....Z....Z.....']],
    left: [[13, '.....Z..........'], [14, '.....Z..........'], [15, '....WW..........'], [16, '....Wz..........']],
  },
};
// complementos que se ganan en el modo historia (look.outfit); todos los ven en el pueblo
export const OUTFIT_EXTRAS = { lanyard: ['lanyard'], gorra: ['cap:#8E1B4A'], gafas: ['glasses'], garavata: ['tie:#C9A04A'] };
const EXTRA_COLORS = {
  W: '#FFFFFF', T: '#C62828', t: '#7F1A1A', Q: '#1E1E24', q: '#0E0E12', Y: '#D2412F', M: '#6B4226', m: '#4A2C18',
  G: '#1B1B22', U: null, A: '#FAFAF6', a: '#DAD6CC', N: '#E0463C', R: '#D2412F', Z: '#FF7A00', z: '#2B3A8C',
};
// 'tie' o 'tie:#1565C0' (color del rol principal del complemento)
const MAIN_ROLE = { tie: 'T', case: 'M', glasses: 'G', sunglasses: 'G', cap: 'Q', apron: 'A', badge: 'R', nose: 'N', mustache: 'U' };
function parseExtras(extras) {
  return (extras || []).map(e => { const [id, color] = String(e).split(':'); return { id, color }; }).filter(e => EXTRAS[e.id] || e.id === 'bald' || e.id === 'flush');
}

// ---------- color ----------
function hexRgb(h) { const n = parseInt(h.slice(1, 7), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function rgbHex(r, g, b) { return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
export function mix(a, b, k) {
  const A = hexRgb(a), B = hexRgb(b);
  return rgbHex(A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, A[2] + (B[2] - A[2]) * k);
}
export const shade = (c, k) => (k < 0 ? mix(c, '#1D1428', -k) : mix(c, '#FFFFFF', k));

export function normLook(look) {
  const l = look || {};
  return {
    skin: Math.max(0, Math.min(SKINS.length - 1, Number(l.skin) || 0)),
    hair: Math.max(0, Math.min(HAIRS.length - 1, Number(l.hair) || 0)),
    style: STYLES.some(s => s.id === l.style) ? l.style : 'corto',
    ...(OUTFIT_EXTRAS[l.outfit] ? { outfit: l.outfit } : {}),
  };
}

function palette(look, shirt) {
  const skin = SKINS[look.skin], hair = HAIRS[look.hair];
  shirt = shirt || '#9E9E9E';
  return {
    O: '#2A1F2D', S: skin, s: shade(skin, -0.18), B: mix(skin, '#FF6B6B', 0.35),
    H: hair, h: shade(hair, -0.32), i: shade(hair, 0.3),
    C: shirt, c: shade(shirt, -0.28), L: shade(shirt, 0.3),
    P: '#3F4D80', p: '#2D375E', F: '#4A3228',
  };
}

function stamp(grid, rows, y0, pal, flip) {
  for (let j = 0; j < rows.length; j++) {
    const y = y0 + j;
    if (y < 0 || y >= AH) continue;
    const row = rows[j];
    for (let i = 0; i < AW; i++) {
      const ch = row[flip ? AW - 1 - i : i];
      if (!ch || ch === '.') continue;
      const c = pal[ch];
      if (c) grid[y][i] = c;
    }
  }
}

// Devuelve la matriz AH x AW de colores de un fotograma (dir: down|up|left|right, frame: 0 quieto, 1-2 pasos)
// extras: complementos de los vecinos, p. ej. ['tie', 'case', 'glasses', 'cap:#222222', 'bald', 'flush']
export function avatarGrid(look, shirt, dir = 'down', frame = 0, extras = []) {
  look = normLook(look);
  const ex = parseExtras([...(extras || []), ...(OUTFIT_EXTRAS[look.outfit] || [])]);
  const has = (id) => ex.some(e => e.id === id);
  const pal = palette(look, shirt);
  if (has('flush')) pal.B = '#F2605A';
  const flip = dir === 'right';
  const d = flip ? 'left' : dir;
  const grid = Array.from({ length: AH }, () => Array(AW).fill(null));
  stamp(grid, BODY[d][frame] || BODY[d][0], BODY_Y, pal, flip);
  stamp(grid, HEAD[d], HEAD_Y, pal, flip);
  if (!has('bald')) {
    const hair = HAIR[look.style][d];
    stamp(grid, hair.rows, hair.y, pal, flip);
  }
  for (const e of ex) {
    const pat = EXTRAS[e.id]?.[d];
    if (!pat) continue;
    const epal = { ...pal, ...EXTRA_COLORS, U: shade(pal.H, -0.1) };
    if (e.color) epal[MAIN_ROLE[e.id]] = e.color;
    if (e.id === 'tie' && e.color) epal.t = shade(e.color, -0.35);
    if (e.id === 'cap' && e.color) epal.q = shade(e.color, -0.4);
    for (const [y, row] of pat) stamp(grid, [row], y, epal, flip);
  }
  return grid;
}

// ---------- canvas (solo navegador) ----------
function gridToCanvas(grids, cols) {
  const rows = Math.ceil(grids.length / cols);
  const cv = document.createElement('canvas');
  cv.width = AW * cols; cv.height = AH * rows;
  const ctx = cv.getContext('2d');
  grids.forEach((g, k) => {
    const ox = (k % cols) * AW, oy = Math.floor(k / cols) * AH;
    for (let y = 0; y < AH; y++) for (let x = 0; x < AW; x++) {
      if (!g[y][x]) continue;
      ctx.fillStyle = g[y][x]; ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  });
  return cv;
}

// Hoja de sprites: columnas = fotogramas (quieto, paso 1, paso 2); filas = down, up, left, right
const sheetCache = new Map();
export function avatarSheet(look, shirt, extras = []) {
  const l = normLook(look);
  const key = `${l.skin}.${l.hair}.${l.style}.${l.outfit || ''}.${shirt}.${(extras || []).join(',')}`;
  let cv = sheetCache.get(key);
  if (!cv) {
    const grids = [];
    for (const d of DIRS) for (let f = 0; f < 3; f++) grids.push(avatarGrid(l, shirt, d, f, extras));
    cv = gridToCanvas(grids, 3);
    sheetCache.set(key, cv);
  }
  return cv;
}

// Un solo fotograma en un canvas (para listas y vistas previas; el CSS lo escala en pixelado)
export function avatarCanvas(look, shirt, dir = 'down', frame = 0, canvas = null, extras = []) {
  const cv = canvas || document.createElement('canvas');
  cv.width = AW; cv.height = AH;
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, AW, AH);
  ctx.drawImage(avatarSheet(look, shirt, extras), frame * AW, DIRS.indexOf(dir) * AH, AW, AH, 0, 0, AW, AH);
  return cv;
}
