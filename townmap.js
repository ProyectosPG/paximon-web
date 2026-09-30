// Mapas del mundo de Paximón. Todo es datos: suelo por casillas, objetos (árboles, edificios,
// mobiliario), vecinos y carteles. Cada mapa se construye con un contexto ({depts, quests}) para
// que la misión de Maricarmen cambie el pueblo. Para crecer basta con añadir cosas aquí.
// Coordenadas en casillas de 16 px; un objeto ocupa de (x, y) a (x + w - 1, y + h - 1).
// Salidas: `warps` son casillas que al pisarlas te llevan a otro mapa; las puertas llevan
// `portal: {kind: 'warp', to}`.
import {
  BRAIS, BRAIS_CHATTER, BRAIS_CHASE, VANE, VANE_CHATTER, VANE_CHASE, SALES_REPLIES,
  SABRINA, DIEGO, SABRINA_CHATTER, DIEGO_CHATTER, CAFE_REGULAR,
  DIO_NAME, DIO_INTRO, DIO_CHATTER, DIO_OWNER, DIO_OWNER_CHATTER, MARICARMEN_THANKS, MARICARMEN_CAMBADOS,
  STATION, TRAIN_REACT, TAQUILLA, VENDING, DRUNKS, DRUNK_CHATTER, CASETAS,
} from './dialogs.js';
import { buildStoryMap, storyDecorate } from './storymaps.js';

export const TOWN_NAME = 'Vila Paxina';
export const W = 44, H = 36;

// Tamaño de cada tipo de casa y columna de la puerta (dentro de la huella)
export const SIZES = {
  casita:  { w: 4, h: 4, door: 2 },
  casa:    { w: 5, h: 4, door: 2 },
  mansion: { w: 7, h: 5, door: 3 },
  pazo:    { w: 8, h: 5, door: 4 },
};

// Una casa por departamento (id de paximon.departments)
export const HOUSES = [
  { dept: 'desarrollo_comercial', type: 'casa',    x: 4,  y: 5 },
  { dept: 'marketing',            type: 'casa',    x: 10, y: 5 },
  { dept: 'rrss',                 type: 'casa',    x: 29, y: 5 },
  { dept: 'telemarketing',        type: 'casa',    x: 35, y: 5 },
  { dept: 'edicion',              type: 'mansion', x: 3,  y: 17 },
  { dept: 'contabilidad',         type: 'casita',  x: 11, y: 18 },
  { dept: 'coordinacion',         type: 'casa',    x: 28, y: 18 },
  { dept: 'composicion',          type: 'mansion', x: 34, y: 17 },
  { dept: 'gerencia',             type: 'pazo',    x: 3,  y: 24 },
  { dept: 'administracion',       type: 'casa',    x: 12, y: 25 },
  { dept: 'gcc',                  type: 'casa',    x: 26, y: 25 },
  { dept: 'programacion',         type: 'casa',    x: 32, y: 25 },
];

export const ARENA = { x: 17, y: 3, w: 10, h: 6, doors: [4, 5] };
export const SPAWN = { x: 21, y: 18, dir: 'down' };
export const ARENA_EXIT = { map: 'vila', x: 21, y: 9, dir: 'down' };
export const MAP_NAMES = { vila: 'Vila Paxina', cafe: 'la Cafetería', cafe_in: 'la Cafetería', estacion: 'la Estación', cambados: 'Cambados',
  programacion: 'Programación', arquivo: 'el archivo', tren: 'el tren de Albacete', datos: 'Albacete' };

// ---------- personajes ----------
const SUIT = '#2B3A5C';
const NPCS = [
  { id: 'maruxa', name: 'Maruxa', x: 19, y: 12, dir: 'down', look: { skin: 0, hair: 6, style: 'mono' }, shirt: '#37474F', lines: [
    '¡Boas! Esa de ahí arriba es la Arena Paximón.',
    'Dentro puedes crear salas y retar directamente a cualquier compañero que esté conectado.',
    'Y si ves a alguien paseando por el pueblo, háblale: también puedes retarle desde aquí.',
    'Ah, y si ganas combates te dan paxicoins. Por la rúa do medio, hacia el este, está la cafetería de Diego y Sabrina: ¡allí se gastan de maravilla!',
  ] },
  { id: 'xan', name: 'Xan', x: 8, y: 13, dir: 'left', look: { skin: 2, hair: 1, style: 'rizos' }, shirt: '#6D8B3A', lines: [
    'Cada departamento tiene su casa en Vila Paxina.',
    'La tuya es la del tejado de tu color, el mismo que tu camiseta.',
    'Por el camino que sube al lado de la Arena se llega a la estación. Yo no cogería el tren. Nunca llega.',
    'Este hórreo era de mi abuela. Ni se te ocurra tocar el maíz.',
  ] },
  { id: 'ruth', name: 'Ruth', x: 24, y: 31, dir: 'down', look: { skin: 1, hair: 3, style: 'largo' }, shirt: '#FF7043', lines: [
    'Dicen que en la ría vive un Paximón de tipo mar que nadie ha visto nunca…',
    'Si sigues el paseo hacia el oeste llegas a Cambados. ¡Es la Feria do Albariño! Mi tío siempre vuelve cantando.',
  ] },
  // los comerciales pasean por las calles vendiendo webs a todo el que se cruzan
  { id: 'brais', name: 'Brais (comercial)', x: 10, y: 22, dir: 'right', look: { skin: 1, hair: 0, style: 'corto' }, shirt: SUIT,
    extras: ['tie:#C62828', 'case'], lines: BRAIS, chatter: BRAIS_CHATTER, chase: BRAIS_CHASE, sells: true,
    wander: { area: [2, 9, 41, 30], tiles: ['path', 'plaza'] } },
  { id: 'vane', name: 'Vanesa (comercial)', x: 30, y: 10, dir: 'left', look: { skin: 0, hair: 5, style: 'largo' }, shirt: '#4A4F5A',
    extras: ['tie:#1565C0', 'case', 'glasses'], lines: VANE, chatter: VANE_CHATTER, chase: VANE_CHASE, sells: true,
    wander: { area: [2, 9, 41, 30], tiles: ['path', 'plaza'] } },
];
export { SALES_REPLIES };

export const SIGNS = [
  { x: 19, y: 20, lines: [
    'VILA PAXINA',
    'Muévete con las flechas o WASD. Mantén Shift para correr.',
    'Espacio o E para hablar e interactuar. También puedes hacer clic donde quieras ir.',
  ] },
];

// El de DIO Express: su aspecto (camiseta negra, gorra roja con el logo, gafas de sol)
export const DIO_LOOK = { look: { skin: 1, hair: 4, style: 'corto' }, shirt: '#1E1E24', extras: ['bald', 'cap:#C9433A', 'sunglasses', 'badge'] };
const MARICARMEN_LOOK = { look: { skin: 0, hair: 6, style: 'rizos' }, shirt: '#8E24AA', extras: ['glasses'] };

// ---------- utilidades para construir mapas ----------
export function builder(Wm, Hm, base = 'grass') {
  const ground = Array.from({ length: Hm }, () => Array(Wm).fill(base));
  const fill = (x, y, w, h, t) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (ground[y + j]?.[x + i] !== undefined) ground[y + j][x + i] = t; };
  const objects = [];
  const add = (o) => { objects.push({ w: 1, h: 1, solid: true, ...o }); };
  let seed = 1;
  const tree = (x, y, variant) => add({ kind: 'tree', x, y, variant: variant || ((x * 7 + y * 13) % 5 === 0 ? 'pine' : 'oak'), seed: seed++ });
  return { ground, fill, objects, add, tree };
}
const quest = (ctx, id) => ctx?.quests?.[id]?.result || null;

// ---------- Vila Paxina ----------
function buildVila(ctx = {}) {
  const deptById = Object.fromEntries((ctx.depts || []).map(d => [d.id, d]));
  const { ground, fill, objects, add, tree } = builder(W, H);
  const mq = quest(ctx, 'maricarmen');

  // ría, playa y calles
  fill(0, 31, W, 2, 'sand');
  fill(0, 33, W, 3, 'water');
  fill(2, 9, 40, 2, 'path');     // rúa de arriba
  fill(2, 22, 40, 1, 'path');    // rúa do medio
  fill(2, 29, 40, 2, 'path');    // paseo marítimo
  fill(21, 9, 2, 22, 'path');    // eje central
  fill(16, 11, 12, 10, 'plaza'); // praza
  fill(21, 31, 2, 5, 'wood');    // peirao
  // salidas: a la estación (norte), a la cafetería (este) y a Cambados (oeste, por el paseo)
  fill(15, 0, 2, 9, 'path');
  fill(42, 22, 2, 1, 'path');
  fill(0, 29, 2, 2, 'path');
  for (const [x, y, w, h] of [[4, 3, 3, 1], [30, 3, 3, 1], [9, 15, 3, 1], [34, 14, 3, 1], [17, 26, 3, 2], [23, 26, 3, 2], [3, 11, 2, 1]]) fill(x, y, w, h, 'flowers');

  // bosque alrededor (con huecos para las salidas)
  const gap = new Set(['15,0', '16,0', '15,1', '16,1', '42,22', '43,22', '0,29', '1,29', '0,30', '1,30']);
  const t = (x, y) => { if (!gap.has(x + ',' + y)) tree(x, y); };
  for (let y = 0; y <= 30; y++) for (const x of [0, 1, 42, 43]) t(x, y);
  for (let x = 2; x < 42; x++) for (const y of [0, 1]) t(x, y);
  for (const [x, y] of [[2, 2], [3, 2], [27, 2], [28, 2], [40, 2], [41, 2], [9, 4], [34, 3],
    [13, 12], [14, 15], [2, 15], [15, 18], [40, 12], [28, 15], [41, 18], [18, 24], [25, 24], [41, 27], [11, 13]]) t(x, y);

  // edificios
  add({ kind: 'building', type: 'arena', x: ARENA.x, y: ARENA.y, w: ARENA.w, h: ARENA.h, doors: ARENA.doors, label: 'ARENA PAXIMÓN', color: '#FF7A00', portal: { kind: 'arena' } });
  HOUSES.forEach((hs, i) => {
    const d = deptById[hs.dept];
    if (!d) return;
    const sz = SIZES[hs.type];
    add({ kind: 'building', type: hs.type, x: hs.x, y: hs.y, w: sz.w, h: sz.h, door: sz.door, doors: [sz.door], dept: d.id, label: d.name, color: d.color, seed: i + 1, portal: { kind: 'house', dept: d.id } });
  });
  // la casa de Maricarmen (misión secundaria): si pierdes el duelo pasa a ser de D.I.O Express
  add({ kind: 'building', type: 'casita', x: 36, y: 12, w: 4, h: 4, door: 2, doors: [2], seed: 7,
    label: mq === 'lost' ? 'CASA DE EL DE DIO EXPRESS' : mq === 'won' ? 'CASA DE MARICARMEN ♥' : 'CASA DE MARICARMEN',
    color: mq === 'lost' ? '#2B2B2B' : '#EC407A', owner: mq === 'lost' ? 'dio' : null, portal: { kind: 'maricarmen' } });
  if (mq !== 'won') add({ kind: 'van', x: 32, y: 12, w: 4, h: 2 });

  // plaza y mobiliario
  add({ kind: 'fountain', x: 21, y: 15, w: 2, h: 2 });
  for (const [x, y] of [[16, 11], [27, 11], [16, 20], [27, 20], [27, 8], [19, 28], [24, 28], [37, 27]]) add({ kind: 'lamp', x, y });
  for (const [x, y] of [[18, 17], [24, 17], [29, 12]]) add({ kind: 'bench', x, y, w: 2 });
  add({ kind: 'cruceiro', x: 41, y: 14 });
  add({ kind: 'horreo', x: 4, y: 12, w: 3, h: 2 });
  add({ kind: 'horreo', x: 38, y: 24, w: 3, h: 2 });
  for (const [x, y, v] of [[9, 8, 'blue'], [15, 8, 'pink'], [28, 8, 'blue'], [34, 8, 'pink'], [10, 21, 'pink'], [15, 21, 'blue'], [33, 21, 'blue'], [41, 21, 'pink'], [11, 28, 'blue'], [37, 28, 'pink'], [2, 11, 'white'], [41, 11, 'white']]) add({ kind: 'bush', x, y, variant: v });
  for (const [x, y] of [[4, 32], [38, 31], [39, 32], [12, 32]]) add({ kind: 'rock', x, y });
  add({ kind: 'boat', x: 16, y: 33, w: 2, variant: '#1E88E5', solid: false });
  add({ kind: 'boat', x: 27, y: 34, w: 2, variant: '#E53935', solid: false });
  for (const s of SIGNS) add({ kind: 'sign', x: s.x, y: s.y, read: s.lines });
  add({ kind: 'signpost', variant: 'up', x: 14, y: 3, read: ['↑ ESTACIÓN DE VILA PAXINA', 'Todos los trenes circulan con normalidad*.', '*Consulte los retrasos en el panel de la estación.'] });
  add({ kind: 'signpost', variant: 'right', x: 41, y: 23, read: ['→ CAFETERÍA DIEGO & SABRINA', 'Cafés, bocatas y cariño venezolano. Se aceptan paxicoins.'] });
  add({ kind: 'signpost', variant: 'left', x: 2, y: 28, read: ['← CAMBADOS · FESTA DO ALBARIÑO', 'Bebe con moderación. (Allí nadie lo hace.)'] });
  // tablón de anuncios (notas persistentes de la gente)
  add({ kind: 'board', x: 24, y: 20, w: 3, interact: 'board', label: 'TABLÓN', color: '#FF0000' });

  const npcs = [...NPCS];
  if (!mq) npcs.push({ id: 'dio', name: DIO_NAME, x: 37, y: 16, dir: 'up', ...DIO_LOOK, lines: DIO_INTRO, chatter: DIO_CHATTER, chatterEvery: [1800, 3200], chatterAlways: true, bang: true });
  if (mq === 'lost') npcs.push({ id: 'dio', name: DIO_NAME, x: 39, y: 16, dir: 'down', ...DIO_LOOK, lines: DIO_OWNER, chatter: DIO_OWNER_CHATTER });
  if (mq === 'won') npcs.push({ id: 'maricarmen', name: 'Maricarmen', x: 39, y: 16, dir: 'down', ...MARICARMEN_LOOK, lines: MARICARMEN_THANKS });

  return {
    id: 'vila', name: TOWN_NAME, W, H, ground, objects, npcs, spawn: SPAWN, bg: '#2E5E36',
    warps: [
      { x: 15, y: 0, to: { map: 'estacion', x: 15, y: 18, dir: 'up' } },
      { x: 16, y: 0, to: { map: 'estacion', x: 16, y: 18, dir: 'up' } },
      { x: 43, y: 22, to: { map: 'cafe', x: 1, y: 9, dir: 'right' } },
      { x: 0, y: 29, to: { map: 'cambados', x: 44, y: 17, dir: 'left' } },
      { x: 0, y: 30, to: { map: 'cambados', x: 44, y: 18, dir: 'left' } },
    ],
  };
}
// compatibilidad (herramientas antiguas)
export function buildTown(depts = [], quests = {}) { return buildVila({ depts, quests }); }

// ---------- carretera y cafetería de Diego y Sabrina ----------
function buildCafe() {
  const Wm = 28, Hm = 16;
  const { ground, fill, objects, add, tree } = builder(Wm, Hm);
  fill(0, 9, 26, 2, 'asphalt');
  fill(7, 8, 14, 1, 'plaza');
  fill(18, 6, 4, 2, 'asphalt');
  fill(2, 12, 10, 2, 'vines'); fill(14, 12, 10, 2, 'vines');
  fill(3, 6, 3, 1, 'flowers'); fill(22, 12, 2, 1, 'flowers');
  for (let x = 0; x < Wm; x++) { tree(x, 0); if (x < 8 || x > 21) tree(x, 1); tree(x, 15); }
  for (let y = 2; y < 15; y++) { if (y !== 9 && y !== 10) tree(0, y); tree(26, y); tree(27, y); }
  for (const [x, y] of [[1, 2], [2, 3], [24, 3], [23, 2], [7, 3], [21, 3], [1, 13], [25, 13], [12, 14], [13, 14]]) tree(x, y);
  add({ kind: 'building', type: 'cafe', x: 10, y: 3, w: 7, h: 5, door: 3, doors: [3], label: 'CAFETERÍA DIEGO & SABRINA', color: '#FFCC00',
    portal: { kind: 'warp', to: { map: 'cafe_in', x: 6, y: 9, dir: 'up' } } });
  add({ kind: 'vflag', x: 17, y: 7 });
  for (const [x, v] of [[8, 0], [11, 1], [15, 2], [19, 0]]) add({ kind: 'terrace', x, y: 8, variant: v });
  add({ kind: 'car', x: 19, y: 6, w: 2, variant: '#E0A33A' });
  add({ kind: 'signpost', variant: 'right', x: 3, y: 8, read: ['→ CAFETERÍA DIEGO & SABRINA', 'Abierto todos los días. Bueno, casi todos.'] });
  add({ kind: 'signpost', variant: 'right', x: 24, y: 8, read: ['→ VILAGARCÍA', 'Carretera cortada por obras desde 2019. Disculpen las molestias.'] });
  add({ kind: 'lamp', x: 7, y: 7 });
  add({ kind: 'bush', x: 5, y: 7, variant: 'pink' }); add({ kind: 'bush', x: 22, y: 7, variant: 'blue' });
  const npcs = [
    { id: 'paco', name: 'Paco', x: 21, y: 8, dir: 'left', look: { skin: 2, hair: 6, style: 'corto' }, shirt: '#795548', extras: ['mustache'], lines: [
      'Diego e Sabrina levan aquí toda a vida. Os mellores cafés con leite da comarca.',
      'Din que se xubilan… levan dicíndoo dende 2015.',
    ] },
  ];
  return {
    id: 'cafe', name: 'Estrada da Cafetería', W: Wm, H: Hm, ground, objects, npcs, spawn: { x: 1, y: 9, dir: 'right' }, bg: '#2E5E36',
    warps: [
      { x: 0, y: 9, to: { map: 'vila', x: 42, y: 22, dir: 'left' } },
      { x: 0, y: 10, to: { map: 'vila', x: 42, y: 22, dir: 'left' } },
    ],
  };
}
function buildCafeIn() {
  const Wm = 12, Hm = 11;
  const { ground, fill, objects, add } = builder(Wm, Hm, 'floor');
  fill(0, 0, Wm, 3, 'wall_in');
  fill(6, 10, 1, 1, 'mat');
  add({ kind: 'counter', x: 0, y: 4, w: 10, counter: true });
  add({ kind: 'plant', x: 10, y: 4 }); add({ kind: 'plant', x: 11, y: 4 });
  add({ kind: 'wall_deco', variant: 'bunting', x: 0, y: 0, w: 12, solid: false, lift: 1 });
  add({ kind: 'wall_deco', variant: 'vflag', x: 0, y: 2, w: 2, solid: false, lift: 12 });
  add({ kind: 'wall_deco', variant: 'shelf', x: 2, y: 2, w: 2, solid: false, lift: 12 });
  add({ kind: 'wall_deco', variant: 'menu', x: 4, y: 2, w: 4, solid: false, lift: 10, read: ['MENÚ', 'Café con leche: 1,5 · Café con leche sin lactosa: 1,5', 'Bocadillo de bacon y queso: mediano 1,75 · pequeño 1,25', '(Precios en paxicoins. No se fía.)'] });
  add({ kind: 'wall_deco', variant: 'vflag', x: 8, y: 2, w: 2, solid: false, lift: 12 });
  add({ kind: 'wall_deco', variant: 'photo', x: 10, y: 2, solid: false, lift: 18 });
  add({ kind: 'wall_deco', variant: 'clock', x: 11, y: 2, solid: false, lift: 20 });
  add({ kind: 'table_in', x: 1, y: 7, w: 2 }); add({ kind: 'table_in', x: 9, y: 7, w: 2 });
  add({ kind: 'plant', x: 0, y: 9 }); add({ kind: 'plant', x: 11, y: 9 });
  const npcs = [
    { id: 'diego', name: 'Diego', x: 3, y: 3, dir: 'down', look: { skin: 2, hair: 6, style: 'corto' }, shirt: '#F2F2F2', extras: ['glasses', 'mustache', 'apron'],
      lines: DIEGO, chatter: DIEGO_CHATTER },
    { id: 'sabrina', name: 'Sabrina', x: 6, y: 3, dir: 'down', look: { skin: 1, hair: 6, style: 'mono' }, shirt: '#FFCC00', extras: ['apron'],
      lines: SABRINA, chatter: SABRINA_CHATTER },
    { id: 'habitual', name: 'Cliente habitual', x: 5, y: 7, dir: 'left', look: { skin: 3, hair: 4, style: 'corto' }, shirt: '#5C6BC0', lines: CAFE_REGULAR },
  ];
  return {
    id: 'cafe_in', name: 'Cafetería Diego & Sabrina', W: Wm, H: Hm, ground, objects, npcs, spawn: { x: 6, y: 9, dir: 'up' }, bg: '#1A1420', indoor: true,
    warps: [{ x: 6, y: 10, to: { map: 'cafe', x: 13, y: 8, dir: 'down' } }],
  };
}

// ---------- estación de tren ----------
function buildEstacion() {
  const Wm = 32, Hm = 20;
  const { ground, fill, objects, add, tree } = builder(Wm, Hm);
  fill(0, 2, Wm, 1, 'ballast'); fill(0, 3, Wm, 1, 'rail_t'); fill(0, 4, Wm, 1, 'rail_b');
  fill(0, 5, Wm, 1, 'ballast'); fill(0, 6, Wm, 1, 'rail_t'); fill(0, 7, Wm, 1, 'rail_b');
  fill(2, 8, 28, 3, 'platform');
  fill(5, 11, 3, 6, 'path'); fill(23, 11, 3, 6, 'path');
  fill(4, 16, 24, 2, 'plaza');
  fill(15, 18, 2, 2, 'path');
  fill(9, 18, 3, 1, 'flowers'); fill(20, 18, 3, 1, 'flowers');
  for (let x = 0; x < Wm; x++) tree(x, 0);
  for (let x = 0; x < Wm; x += 2) add({ kind: 'bush', x, y: 1, variant: x % 4 ? 'white' : 'blue' });
  for (let y = 8; y < Hm; y++) { tree(0, y); tree(1, y); tree(30, y); tree(31, y); }
  for (let x = 2; x < 30; x++) if (x < 14 || x > 17) tree(x, 19);
  for (const [x, y] of [[2, 11], [3, 13], [2, 15], [28, 11], [27, 14], [3, 17], [28, 17]]) tree(x, y);
  add({ kind: 'building', type: 'station', x: 8, y: 11, w: 15, h: 5, door: 7, doors: [7], label: 'ESTACIÓN', color: '#123C7A',
    portal: { kind: 'door', lines: TAQUILLA } });
  add({ kind: 'departures', x: 19, y: 9, w: 4, interact: 'departures', label: 'PANEL DE SALIDAS', color: '#FFB300', labelNear: 5 });
  for (const x of [8, 24]) add({ kind: 'bench', x, y: 10, w: 2 });
  add({ kind: 'station_clock', x: 11, y: 9 });
  add({ kind: 'vending', x: 28, y: 9, read: VENDING });
  for (const [x, y] of [[4, 9], [27, 10], [5, 17], [26, 17]]) add({ kind: 'lamp', x, y });
  add({ kind: 'signpost', variant: 'up', x: 13, y: 18, read: ['↑ ANDENES · VÍAS 1 Y 2', 'Por favor, no crucen las vías. Aunque el tren no vaya a venir.'] });
  const npcs = [
    { id: 'jefe', name: 'Jefe de estación', x: 6, y: 9, dir: 'down', look: { skin: 1, hair: 6, style: 'corto' }, shirt: '#1F3A6B', extras: ['cap:#C62828', 'mustache'], lines: STATION.jefe, onTrain: TRAIN_REACT },
    { id: 'viajero', name: 'Viajero', x: 10, y: 9, dir: 'up', look: { skin: 0, hair: 0, style: 'corto' }, shirt: '#6D4C41', extras: ['case'], lines: STATION.viajero, onTrain: TRAIN_REACT },
    { id: 'estudiante', name: 'Estudiante', x: 23, y: 9, dir: 'up', look: { skin: 2, hair: 7, style: 'largo' }, shirt: '#26A69A', lines: STATION.estudiante, onTrain: TRAIN_REACT },
    { id: 'albacete', name: 'Señor que va a Albacete', x: 26, y: 8, dir: 'up', look: { skin: 1, hair: 2, style: 'corto' }, shirt: '#9E9D24', extras: ['glasses', 'case'], lines: STATION.albacete, onTrain: TRAIN_REACT },
  ];
  return {
    id: 'estacion', name: 'Estación de Vila Paxina', W: Wm, H: Hm, ground, objects, npcs, spawn: { x: 15, y: 18, dir: 'up' }, bg: '#2E5E36',
    // trenes que pasan sin parar (fila de la vía, cada cuánto y velocidad en px/s)
    trains: [{ row: 7, dir: 1, every: 40000, first: 7000, speed: 190 }, { row: 4, dir: -1, every: 65000, first: 26000, speed: 150 }],
    warps: [
      { x: 15, y: 19, to: { map: 'vila', x: 15, y: 1, dir: 'down' } },
      { x: 16, y: 19, to: { map: 'vila', x: 16, y: 1, dir: 'down' } },
    ],
  };
}

// ---------- Cambados: Festa do Albariño ----------
const DRUNK_LOOKS = [
  [{ skin: 1, hair: 0, style: 'corto' }, '#C62828'], [{ skin: 0, hair: 3, style: 'largo' }, '#F06292'], [{ skin: 2, hair: 6, style: 'corto' }, '#546E7A'],
  [{ skin: 1, hair: 5, style: 'rizos' }, '#FFB300'], [{ skin: 3, hair: 4, style: 'corto' }, '#43A047'], [{ skin: 0, hair: 1, style: 'mono' }, '#7E57C2'],
  [{ skin: 1, hair: 2, style: 'corto' }, '#29B6F6'], [{ skin: 2, hair: 0, style: 'largo' }, '#EF6C00'], [{ skin: 0, hair: 6, style: 'corto' }, '#8D6E63'],
  [{ skin: 1, hair: 7, style: 'rizos' }, '#EC407A'],
];
function buildCambados(ctx = {}) {
  const Wm = 46, Hm = 24;
  const { ground, fill, objects, add, tree } = builder(Wm, Hm);
  fill(10, 1, 35, 3, 'vines');
  fill(1, 8, 44, 5, 'granite');
  fill(40, 13, 4, 4, 'granite');
  fill(0, 17, Wm, 2, 'path');
  fill(0, 19, Wm, 2, 'sand');
  fill(0, 21, Wm, 3, 'water');
  fill(12, 15, 3, 1, 'flowers'); fill(27, 16, 3, 1, 'flowers');
  for (let x = 0; x < Wm; x++) tree(x, 0);
  for (let y = 1; y < 8; y++) tree(0, y);
  for (let y = 1; y < 17; y++) tree(45, y);
  tree(9, 2); tree(9, 3); tree(44, 4); tree(0, 13); tree(0, 14); tree(0, 15);
  add({ kind: 'building', type: 'pazo', x: 1, y: 3, w: 8, h: 5, door: 4, doors: [4], label: 'PAZO DE FEFIÑÁNS', color: '#8E1B4A',
    portal: { kind: 'door', lines: ['O Pazo de Fefiñáns está pechado.', 'Un cartel di: «Estamos na caseta. Volvemos… algún día».'] } });
  CASETAS.forEach((c, i) => add({ kind: 'caseta', x: 11 + i * 4, y: 5, w: 3, h: 3, variant: i, seed: i, short: c.short,
    label: c.name, color: '#8E1B4A', labelNear: 4, interact: 'caseta', data: { idx: i, name: c.name } }));
  for (let i = 0; i < 7; i++) add(i % 2 ? { kind: 'barrel', x: 14 + i * 4, y: 7, variant: 1 } : { kind: 'crates', x: 14 + i * 4, y: 7 });
  for (let x = 9; x < 11; x++) add({ kind: 'crates', x, y: 7 });
  add({ kind: 'barrel', x: 42, y: 7 }); add({ kind: 'barrel', x: 43, y: 7, variant: 1 }); add({ kind: 'crates', x: 44, y: 7 });
  // mesas de toneles, bancos y el paseo
  for (const [x, y] of [[11, 14], [16, 13], [20, 14], [25, 13], [29, 14], [34, 13], [37, 15]]) add({ kind: 'barrel', x, y });
  for (const [x, y] of [[13, 13], [31, 15]]) add({ kind: 'crates', x, y });
  for (const [x, y] of [[17, 15], [23, 15], [33, 15]]) add({ kind: 'bench', x, y, w: 2 });
  for (const [x, y] of [[8, 16], [20, 16], [32, 16], [4, 16]]) add({ kind: 'lamp', x, y });
  for (const [x, y] of [[9, 15], [26, 15], [38, 14], [3, 13], [6, 14]]) tree(x, y);
  for (const [x, y] of [[5, 19], [30, 20], [41, 19]]) add({ kind: 'rock', x, y });
  add({ kind: 'boat', x: 12, y: 21, w: 2, variant: '#2E7D32', solid: false });
  add({ kind: 'boat', x: 34, y: 22, w: 2, variant: '#F9A825', solid: false });
  // arco de entrada y banderines por encima de la rúa
  add({ kind: 'arch_post', x: 39, y: 15 }); add({ kind: 'arch_post', x: 44, y: 15 });
  add({ kind: 'arch_banner', x: 39, y: 15, w: 6, solid: false, overhead: true, lift: 30 });
  add({ kind: 'garland', x: 10, y: 9, w: 35, solid: false, overhead: true, lift: 8 });
  add({ kind: 'garland', x: 10, y: 12, w: 35, solid: false, overhead: true, lift: 8 });
  add({ kind: 'signpost', variant: 'right', x: 38, y: 18, read: ['→ VILA PAXINA', 'Por el paseo marítimo. Recto. Si ves dos caminos, coge el del medio.'] });

  const npcs = DRUNKS.map(([name, lines], i) => {
    const [look, shirt] = DRUNK_LOOKS[i % DRUNK_LOOKS.length];
    const spots = [[12, 9], [18, 10], [22, 12], [27, 9], [31, 11], [36, 10], [41, 12], [15, 11], [25, 11], [38, 9]];
    const [x, y] = spots[i];
    return { id: 'borracho' + i, name, x, y, dir: 'down', look, shirt, extras: ['flush', 'nose'], lines, chatter: DRUNK_CHATTER, drunk: true,
      wander: { area: [9, 8, 44, 16], tiles: ['granite', 'grass', 'flowers'] } };
  });
  if (quest(ctx, 'maricarmen') === 'lost') npcs.push({ id: 'maricarmen', name: 'Maricarmen', x: 21, y: 13, dir: 'down', ...MARICARMEN_LOOK, extras: ['glasses', 'flush'], lines: MARICARMEN_CAMBADOS, chatter: ['¡Saúde!', 'Mi casiña…', '¡Otra, Suso!'] });
  return {
    id: 'cambados', name: 'Cambados · Festa do Albariño', W: Wm, H: Hm, ground, objects, npcs, spawn: { x: 44, y: 17, dir: 'left' }, bg: '#2E5E36',
    warps: [
      { x: 45, y: 17, to: { map: 'vila', x: 1, y: 29, dir: 'right' } },
      { x: 45, y: 18, to: { map: 'vila', x: 1, y: 30, dir: 'right' } },
    ],
  };
}

export const MAPS = { vila: buildVila, cafe: buildCafe, cafe_in: buildCafeIn, estacion: buildEstacion, cambados: buildCambados };
// los mapas del modo historia (casas por dentro, mazmorras, tren…) están en storymaps.js
export function buildMap(id, ctx = {}) {
  const map = buildStoryMap(id, ctx) || (MAPS[id] || MAPS.vila)(ctx);
  return storyDecorate(map, ctx);
}
