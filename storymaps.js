// Mapas del modo historia: el interior de las casas de departamento (una oficina por casa), la
// mazmorra de errores 404 de Programación, el archivo del Kit Digital, el tren de Albacete y el
// centro de datos de O Algoritmo. También lo que cambia en el pueblo, Cambados y la estación
// según el capítulo (storyDecorate). Solo datos, igual que townmap.js; el contexto trae
// { depts, quests, story } y story es el estado de la historia del jugador ({ ch, flags, … }).
import { HOUSES, SIZES, builder } from './townmap.js';
import { COWORKERS, LOOKS, CAST, chapterIndex } from './storydata.js';

// ---------- estado de la historia ----------
const chIs = (st, id) => st?.ch === id;
const past = (st, id) => chapterIndex(st?.ch) > chapterIndex(id);
const flag = (st, f) => !!st?.flags?.[f];
const started = (st) => !!st?.ch;

// vecinos del reparto con su aspecto, su voz y su nombre
function person(id, cast, x, y, dir, extra = {}) {
  const l = LOOKS[cast] || LOOKS.compa;
  return { id, name: CAST[cast]?.name || cast, cast, x, y, dir, look: l.look, shirt: l.shirt, extras: l.extras, lines: ['…'], story: true, ...extra };
}
// un Paximón suelto por el mapa (jefes, bots): se dibuja con su sprite
function paxNpc(id, pax, name, x, y, extra = {}) {
  return { id, name, pax, x, y, dir: 'down', lines: ['…'], story: true, ...extra };
}
const pickLook = (i) => [
  [{ skin: 1, hair: 2, style: 'corto' }, ['glasses']], [{ skin: 0, hair: 5, style: 'largo' }, []], [{ skin: 2, hair: 4, style: 'rizos' }, []],
  [{ skin: 3, hair: 0, style: 'mono' }, ['glasses']], [{ skin: 0, hair: 1, style: 'corto' }, ['mustache']], [{ skin: 1, hair: 3, style: 'mono' }, []],
][i % 6];
function coworker(dept, color, i, x, y, dir = 'up') {
  const [look, extras] = pickLook(i + dept.length);
  const lines = COWORKERS[dept] || ['Hoy hay mucho lío.'];
  return { id: `compa_${dept}_${i}`, name: 'Compañero', x, y, dir, look, shirt: color, extras, lines: [lines[i % lines.length]] };
}

// ---------- casas de departamento ----------
const INSIDE = { casita: [12, 9], casa: [14, 10], mansion: [16, 11], pazo: [18, 12] };
const DESK = { telemarketing: 'phone', gcc: 'phone', desarrollo_comercial: 'phone', contabilidad: 'calc', administracion: 'calc', edicion: 'papers', gerencia: 'boss' };
// rótulo de la pancarta: los nombres largos no caben (13 letras como mucho)
const BANNER = { desarrollo_comercial: 'COMERCIAL', administracion: 'ADMIN.' };
const short = (dept, name) => BANNER[dept] || String(name || '').toUpperCase().slice(0, 13);

export function houseExit(dept) {
  const hs = HOUSES.find(h => h.dept === dept);
  if (!hs) return { map: 'vila', x: 21, y: 18, dir: 'down' };
  const sz = SIZES[hs.type];
  return { map: 'vila', x: hs.x + sz.door, y: hs.y + sz.h, dir: 'down' };
}
export function houseEntry(dept) {
  const hs = HOUSES.find(h => h.dept === dept);
  const [Wm, Hm] = INSIDE[hs?.type || 'casa'];
  return { map: 'house_' + dept, x: Math.floor(Wm / 2), y: Hm - 2, dir: 'up' };
}

function buildHouse(dept, ctx = {}) {
  const st = ctx.story || {};
  const hs = HOUSES.find(h => h.dept === dept) || { dept, type: 'casa', x: 10, y: 10 };
  const d = (ctx.depts || []).find(x => x.id === dept) || { id: dept, name: dept, color: '#9E9E9E' };
  const [Wm, Hm] = INSIDE[hs.type];
  const b = builder(Wm, Hm, dept === 'gerencia' ? 'parquet' : 'carpet');
  const { fill, add } = b;
  const dx = Math.floor(Wm / 2);
  fill(0, 0, Wm, 3, 'wall_in');
  fill(dx, Hm - 1, 1, 1, 'mat');
  const npcs = [];
  // pared del fondo: pancarta del departamento, ventanas y reloj
  add({ kind: 'wall_deco', variant: 'banner', x: dx - 2, y: 2, w: 4, solid: false, lift: 14, color: d.color, short: short(dept, d.name) });
  add({ kind: 'wall_deco', variant: 'window', x: 1, y: 2, w: 2, solid: false, lift: 12 });
  add({ kind: 'wall_deco', variant: 'window', x: Wm - 3, y: 2, w: 2, solid: false, lift: 12 });
  add({ kind: 'wall_deco', variant: 'clock', x: Math.min(dx + 3, Wm - 4), y: 2, solid: false, lift: 20 });
  add({ kind: 'plant', x: 0, y: Hm - 2 }); add({ kind: 'plant', x: Wm - 1, y: Hm - 2 });
  add({ kind: 'dept_board', x: dx + 2, y: Hm - 2, color: d.color, interact: 'dept_board', label: 'CADRO', labelNear: 2, data: { dept } });
  // mesas en filas a los lados del pasillo central
  const variant = DESK[dept] || 'pc';
  const rows = hs.type === 'casita' ? [4, 6] : hs.type === 'casa' ? [4, 6] : [4, 6, 8];
  const xs = hs.type === 'casita' ? [1, 8] : hs.type === 'casa' ? [1, 3, 9, 11] : [1, 3, 10, 12];
  const deskAt = [];
  if (dept !== 'gerencia') {
    for (const y of rows) for (const x of xs) { add({ kind: 'desk', x, y, w: 2, variant }); deskAt.push([x, y]); }
    add({ kind: 'cabinet', x: Wm - 1, y: 3 }); add({ kind: 'cooler', x: 0, y: 3 });
    if (hs.type !== 'casita') add({ kind: 'printer', x: Wm - 1, y: Hm - 4 });
    // compañeros trabajando (de pie delante de su mesa)
    const n = hs.type === 'casita' ? 1 : 2;
    for (let i = 0; i < n; i++) { const [x, y] = deskAt[(i * 3 + 1) % deskAt.length]; npcs.push(coworker(dept, d.color, i, x + (i % 2), y + 1)); }
  }
  const warps = [{ x: dx, y: Hm - 1, to: houseExit(dept) }];
  const map = { id: 'house_' + dept, name: `Casa de ${d.name}`, W: Wm, H: Hm, ground: b.ground, objects: b.objects, npcs, spawn: { x: dx, y: Hm - 2, dir: 'up' }, bg: '#1A1420', indoor: true, warps, dept };
  (HOUSE_EXTRAS[dept] || (() => {}))(map, { st, add, fill, dx, Wm, Hm, d, npcs });
  return map;
}

// lo propio de cada casa
const HOUSE_EXTRAS = {
  edicion(map, { st, add, dx, npcs }) {
    add({ kind: 'bookshelf', x: 6, y: 3, w: 2, variant: 'guides' });
    add({ kind: 'coffee_machine', x: 9, y: 3, variant: 'broken', interact: 'coffee_broken', label: 'CAFETEIRA', labelNear: 2 });
    npcs.push(person('rosalia', 'rosalia', dx, 4, 'down', { mark: !started(st) || chIs(st, 'prologo'), lines: ['¡Mira quién está aquí! La persona que salvó Galicia. Y todavía sin usuario en el ordenador.', 'La guía de 1998 vuelve a estar en su cajón. Entera. Con sus Páxinas de Ouro.'] }));
  },
  telemarketing(map, { st, add, dx, npcs }) {
    add({ kind: 'wall_deco', variant: 'ranking', x: 3, y: 2, w: 2, solid: false, lift: 12 });
    npcs.push(person('loli', 'loli', dx, 4, 'down', { mark: chIs(st, 'telemarketing'), lines: ['Páxinas Galegas, buenos días, le atiende Loli…', '¡Ah, eres tú! Ya no suena la música de espera. Bueno, a veces me la pongo yo. Me relaja.'] }));
  },
  composicion(map, { st, add, dx, npcs }) {
    // la pantalla grande del Structurer ocupa el sitio de la ventana de la izquierda
    map.objects = map.objects.filter(o => !(o.variant === 'window' && o.x === 1));
    add({ kind: 'wall_deco', variant: 'screen', x: 1, y: 2, w: 4, solid: false, lift: 4, state: flag(st, 'structurer') || past(st, 'edicion') ? 'ok' : 'mess', interact: 'structurer', label: 'STRUCTURER', labelNear: 3 });
    if (chIs(st, 'edicion')) npcs.push(person('rosalia', 'rosalia', dx - 1, 4, 'down', { mark: true }));
  },
  rrss(map, { st, add, dx, npcs }) {
    add({ kind: 'wall_deco', variant: 'neon', x: 3, y: 2, w: 2, solid: false, lift: 12 });
    add({ kind: 'ringlight', x: dx - 2, y: 3 }); add({ kind: 'tripod_phone', x: dx + 1, y: 3 });
    npcs.push(person('likeira', 'likeira', dx, 4, 'down', { mark: chIs(st, 'rrss'), lines: ['¡Holaaa! ¿Salgo bien con esta luz? Dime que sí.', 'Hoy toca carrusel: «Diez pulperías que tienes que conocer». Nueve son la misma.'] }));
  },
  gcc(map, { st, add, dx, npcs }) {
    add({ kind: 'desk', x: dx - 1, y: 3, w: 2, variant: 'redphone', interact: 'gcc_phone', label: 'TELÉFONO', labelNear: 2 });
    npcs.push(person('gcc', 'gcc', dx + 1, 3, 'down', { mark: chIs(st, 'gcc'), lines: ['Si el cliente se queda callado, tú no. Primera norma de GCC.', 'Don Manuel nos manda recuerdos. Y una bandeja de pulpo.'] }));
  },
  contabilidad(map, { st, fill, Wm, npcs }) {
    fill(Wm - 2, 3, 1, 1, 'stairs');
    map.warps.push({ x: Wm - 2, y: 3, to: { map: 'arquivo', x: 10, y: 12, dir: 'up' } });
    npcs.push(person('contable', 'contable', 5, 5, 'down', { mark: chIs(st, 'xustificacion'), lines: ['El Kit Digital no se justifica solo. Si lo hiciera, sería el Kit Mágico.', '¿Tienes el justificante? ¿Y la copia del justificante?'] }));
  },
  gerencia(map, { st, add, fill, dx, Wm, Hm, npcs }) {
    fill(dx - 1, 3, 2, Hm - 3, 'carpet_red');
    add({ kind: 'wall_deco', variant: 'portrait', x: 4, y: 2, solid: false, lift: 14 });
    add({ kind: 'wall_deco', variant: 'portrait', x: Wm - 5, y: 2, solid: false, lift: 14 });
    add({ kind: 'lectern', x: dx, y: 4, variant: past(st, 'gerencia') || flag(st, 'webgeo') ? 'glow' : '', interact: 'lectern', label: 'A GUÍA DE 1998', labelNear: 3 });
    add({ kind: 'table_big', x: 1, y: 6, w: 4, h: 2 }); add({ kind: 'table_big', x: Wm - 5, y: 6, w: 4, h: 2 });
    add({ kind: 'sofa', x: 1, y: Hm - 3, w: 2 }); add({ kind: 'sofa', x: Wm - 3, y: Hm - 3, w: 2 });
    add({ kind: 'bookshelf', x: 4, y: 3, w: 2 }); add({ kind: 'bookshelf', x: Wm - 6, y: 3, w: 2, variant: 'guides' });
    if (chIs(st, 'gerencia')) npcs.push(person('rosalia', 'rosalia', dx + 2, 5, 'left'));
    npcs.push({ id: 'compa_gerencia', name: 'Secretaría de Gerencia', x: dx - 3, y: 5, dir: 'down', look: { skin: 0, hair: 6, style: 'mono' }, shirt: '#C9A04A', extras: ['glasses'], lines: COWORKERS.gerencia });
  },
};

// ---------- Programación: mazmorra de errores 404 ----------
// x = error 404 (te devuelve a la entrada) · S = rack de servidores · . = suelo · B = el Bug
const PROG = [
  'SSx...x...B...x...x.SS',
  '..x.x.x.xxxxxx.x.x.x..',
  '..x.x...x....x..x.x...',
  'x...xxx.x.xx.x.xx...xx',
  '..x.....x..x......x...',
  '.xxxxxx.xx.xxxxxx.x.xx',
  '......x....x.....x....',
  'SS.xx.x.xx.x.xxx.xxx.S',
  '.....x..x......x......',
  '.xxx...xx.x..xx..xxx..',
  '......................',
];
function buildProgramacion(ctx = {}) {
  const st = ctx.story || {};
  const Wm = 22, Hm = 14;
  const b = builder(Wm, Hm, 'server_floor');
  b.fill(0, 0, Wm, 3, 'wall_in');
  const traps = [], npcs = [];
  let boss = null;
  PROG.forEach((row, j) => [...row].forEach((c, i) => {
    const x = i, y = 3 + j;
    if (c === 'x') { b.fill(x, y, 1, 1, 'tile404'); traps.push({ x, y, kind: '404' }); }
    if (c === 'S') b.add({ kind: 'server_rack', x, y });
    if (c === 'B') boss = [x, y];
  }));
  b.fill(11, Hm - 1, 1, 1, 'mat');
  b.add({ kind: 'wall_deco', variant: 'poster404', x: 3, y: 2, w: 2, solid: false, lift: 12 });
  b.add({ kind: 'wall_deco', variant: 'screen', x: 9, y: 2, w: 4, solid: false, lift: 4, state: 'mess' });
  b.add({ kind: 'wall_deco', variant: 'poster404', x: 17, y: 2, w: 2, solid: false, lift: 12 });
  npcs.push({ id: 'prog1', name: 'Programador', x: 2, y: Hm - 1, dir: 'up', ...LOOKS.programador, lines: ['A min non me miredes.', 'Iso non estaba aí onte. Ou si. Non sei.'] });
  npcs.push({ id: 'prog2', name: 'Programadora', x: Wm - 3, y: Hm - 1, dir: 'up', look: { skin: 0, hair: 7, style: 'largo' }, shirt: '#2E7D32', extras: [], lines: ['Funciona na miña máquina.', 'Os 404 non se pisan. Iso sábeo todo o mundo. Bueno, agora ti tamén.'] });
  if (chIs(st, 'programacion') && !flag(st, 'bug') && boss) npcs.push(paxNpc('bug', 'bug', 'O Bug do Venres', boss[0], boss[1], { mark: true, big: true }));
  const exit = houseExit('programacion');
  return {
    id: 'programacion', name: 'Programación · Erro 404', W: Wm, H: Hm, ground: b.ground, objects: b.objects, npcs, traps,
    spawn: { x: 11, y: Hm - 2, dir: 'up' }, bg: '#0B0F14', indoor: true,
    warps: [{ x: 11, y: Hm - 1, to: exit }],
  };
}

// ---------- Contabilidad: el archivo del Kit Digital ----------
function shelves(add, y, gaps, Wm) {
  for (let x = 0; x < Wm; x += 2) if (!gaps.some(g => g === x || g === x + 1)) add({ kind: 'bookshelf', x, y, w: 2, variant: (x / 2 + y) % 3 ? '' : 'guides' });
}
export const CAPTURAS = [{ id: 'c1', x: 1, y: 11 }, { id: 'c2', x: 18, y: 7 }, { id: 'c3', x: 1, y: 5 }];
function buildArquivo(ctx = {}) {
  const st = ctx.story || {};
  const Wm = 20, Hm = 14;
  const b = builder(Wm, Hm, 'floor');
  const { add, fill } = b;
  fill(0, 0, Wm, 3, 'wall_in');
  add({ kind: 'wall_deco', variant: 'whiteboard', x: 2, y: 2, w: 3, solid: false, lift: 12 });
  add({ kind: 'wall_deco', variant: 'clock', x: 15, y: 2, solid: false, lift: 20 });
  // estanterías con huecos; los certificados caducados tapan dos de ellos
  shelves(add, 4, [10, 11], Wm);
  shelves(add, 6, [2, 3, 16, 17], Wm);
  shelves(add, 8, [10, 11], Wm);
  shelves(add, 10, [4, 5, 14, 15], Wm);
  add({ kind: 'paper_stack', x: 11, y: 4, variant: 2 });
  add({ kind: 'paper_stack', x: 11, y: 8, variant: 1 });
  for (const [x, y, v] of [[3, 3, 0], [16, 3, 1], [7, 12, 2], [13, 12, 0], [0, 12, 1], [19, 12, 2]]) add({ kind: 'paper_stack', x, y, variant: v });
  fill(10, Hm - 1, 1, 1, 'stairs');
  const npcs = [];
  const got = st.flags?.capturas || [];
  for (const c of CAPTURAS) if (!got.includes(c.id)) add({ kind: 'captura', x: c.x, y: c.y, interact: 'captura', data: { id: c.id }, solid: true });
  if (chIs(st, 'xustificacion')) {
    if (!flag(st, 'cert1')) npcs.push(paxNpc('cert1', 'cert', 'Certificado Caducado', 10, 8));
    if (!flag(st, 'cert2')) npcs.push(paxNpc('cert2', 'cert', 'Certificado Caducado', 10, 4));
    if (!flag(st, 'formulario')) npcs.push(paxNpc('formulario', 'formulario', 'O Formulario Infinito', 10, 3, { mark: true, big: true }));
  }
  const cont = HOUSES.find(h => h.dept === 'contabilidad');
  const [cw] = INSIDE[cont?.type || 'casita'];
  return {
    id: 'arquivo', name: 'O Arquivo do Kit Digital', W: Wm, H: Hm, ground: b.ground, objects: b.objects, npcs,
    spawn: { x: 10, y: Hm - 2, dir: 'up' }, bg: '#1A1420', indoor: true,
    warps: [{ x: 10, y: Hm - 1, to: { map: 'house_contabilidad', x: cw - 2, y: 4, dir: 'down' } }],
  };
}

// ---------- el tren de Albacete (tres vagones) ----------
function buildTren(ctx = {}) {
  const st = ctx.story || {};
  const Wm = 40, Hm = 7;
  const b = builder(Wm, Hm, 'train_floor');
  const { add, fill } = b;
  fill(0, 0, Wm, 2, 'wall_in'); fill(0, Hm - 1, Wm, 1, 'wall_in');
  // separaciones entre vagones (con la puerta en el pasillo)
  for (const x of [13, 26]) { fill(x, 2, 1, 1, 'wall_in'); fill(x, 5, 1, 1, 'wall_in'); }
  for (let x = 1; x < Wm - 2; x += 3) if (x !== 13 && x !== 26 && x + 1 !== 13 && x + 1 !== 26) add({ kind: 'wall_deco', variant: 'train_window', x, y: 1, w: 2, solid: false, lift: 4 });
  for (let x = 1; x < Wm - 1; x += 3) {
    if ([12, 13, 25, 26].some(v => v === x || v === x + 1)) continue;
    add({ kind: 'seat_train', x, y: 2, w: 2 }); add({ kind: 'seat_train', x, y: 5, w: 2 });
  }
  const npcs = [], traps = [];
  if (!flag(st, 'bot_tren1')) { npcs.push(paxNpc('bot_t1', 'bot', 'Bot de Reseñas', 9, 3)); add({ kind: 'crates', x: 9, y: 4 }); }
  // Brais y Vanesa esperan en el segundo vagón (después de la escena se adelantan)
  if (!flag(st, 'tren_rivais')) {
    for (const y of [3, 4]) traps.push({ x: 17, y, kind: 'story', id: 'tren_rivais' });
    npcs.push(person('brais_tren', 'brais', 20, 3, 'left'), person('vanesa_tren', 'vanesa', 20, 4, 'left'));
  }
  if (!flag(st, 'bot_tren2')) { npcs.push(paxNpc('bot_t2', 'bot', 'Bots de Reseñas', 31, 3), paxNpc('bot_t3', 'bot', 'Bots de Reseñas', 31, 4)); }
  npcs.push({ id: 'albacete_tren', name: 'Señor que vai a Albacete', cast: 'albacete', x: 4, y: 4, dir: 'right', look: { skin: 1, hair: 2, style: 'corto' }, shirt: '#9E9D24', extras: ['glasses', 'case'],
    lines: ['¡Por fin en el tren! Veintitrés años esperando. Ya no tengo el bocadillo, pero tengo ilusión.'] });
  return {
    id: 'tren', name: 'Tren con destino Albacete', W: Wm, H: Hm, ground: b.ground, objects: b.objects, npcs, traps,
    spawn: { x: 1, y: 3, dir: 'right' }, bg: '#0E1320', indoor: true,
    warps: [
      { x: 0, y: 3, to: { map: 'estacion', x: 10, y: 8, dir: 'down' } }, { x: 0, y: 4, to: { map: 'estacion', x: 10, y: 8, dir: 'down' } },
      { x: Wm - 1, y: 3, to: { map: 'datos', x: 10, y: 11, dir: 'up' } }, { x: Wm - 1, y: 4, to: { map: 'datos', x: 10, y: 11, dir: 'up' } },
    ],
  };
}

// ---------- Albacete: el centro de datos de O Algoritmo ----------
function buildDatos(ctx = {}) {
  const st = ctx.story || {};
  const Wm = 20, Hm = 13;
  const b = builder(Wm, Hm, 'server_floor');
  const { add, fill } = b;
  fill(0, 0, Wm, 3, 'wall_in');
  add({ kind: 'wall_deco', variant: 'screen', x: 2, y: 2, w: 4, solid: false, lift: 4, state: 'mess' });
  add({ kind: 'wall_deco', variant: 'screen', x: 14, y: 2, w: 4, solid: false, lift: 4, state: 'mess' });
  for (const x of [1, 3, 16, 18]) for (const y of [5, 7, 9]) add({ kind: 'server_rack', x, y });
  add({ kind: 'core', x: 8, y: 3, w: 3, h: 3, interact: 'core', label: 'O ALGORITMO', labelNear: 4 });
  fill(10, Hm - 1, 1, 1, 'mat');
  const traps = [];
  if (!past(st, 'algoritmo') && !flag(st, 'algoritmo')) for (let x = 6; x <= 13; x++) traps.push({ x, y: 8, kind: 'story', id: 'datos' });
  const npcs = [];
  if (past(st, 'algoritmo') || flag(st, 'algoritmo')) npcs.push(paxNpc('algoritmino', 'algoritmino', 'Algoritmiño', 9, 7, { cast: 'algoritmino', lines: ['¿Sabes? Ahora la gente me pregunta cosas bonitas. Ayer uno me preguntó cómo estaba. ¡Dos veces!'] }));
  return {
    id: 'datos', name: 'Albacete · Centro de Datos', W: Wm, H: Hm, ground: b.ground, objects: b.objects, npcs, traps,
    spawn: { x: 10, y: Hm - 2, dir: 'up' }, bg: '#05070C', indoor: true,
    warps: [{ x: 10, y: Hm - 1, to: { map: 'tren', x: 38, y: 3, dir: 'left' } }],
  };
}

// ---------- lo que cambia en los mapas de siempre ----------
export function storyDecorate(map, ctx = {}) {
  const st = ctx.story || {};
  if (!started(st)) return map;
  if (map.id === 'vila') {
    // en la escena de los rivales, los comerciales dejan de pasear (salen en la escena)
    if (chIs(st, 'rivais')) map.npcs = map.npcs.filter(n => n.id !== 'brais' && n.id !== 'vane');
  }
  if (map.id === 'cafe_in') {
    for (const n of map.npcs) if (n.id === 'sabrina' || n.id === 'diego') { n.cast = n.id; n.mark = chIs(st, 'cafe') && n.id === 'sabrina'; }
  }
  if (map.id === 'cambados' && chIs(st, 'cambados')) {
    const plantilla = !flag(st, 'casetas_ok');
    if (plantilla) for (const o of map.objects) if (o.kind === 'caseta') { o.short = 'VIÑO BO.'; o.data = { ...o.data, plantilla: true }; }
    map.objects.push({ kind: 'caseta', x: 2, y: 9, w: 3, h: 3, variant: 7, seed: 5, short: 'WEBS XA', label: 'WEBS XA · CATA', color: '#111111', labelNear: 5, interact: 'webs_xa', solid: true });
    if (!flag(st, 'enologo')) map.npcs.push(person('enologo', 'enologo', 3, 12, 'down', { mark: flag(st, 'bot_cambados') }));
    if (!flag(st, 'bot_cambados')) {
      map.npcs.push(paxNpc('bot_c', 'bot', 'Bot de Reseñas', 7, 11, { mark: true }));
      map.traps = [...(map.traps || [])];
      for (let y = 8; y <= 20; y++) map.traps.push({ x: 6, y, kind: 'story', id: 'bot_cambados' });
    }
  }
  if (map.id === 'estacion') {
    const jefe = map.npcs.find(n => n.id === 'jefe'); if (jefe) jefe.cast = 'xefe';
    if (chIs(st, 'estacion') && !flag(st, 'plantilla')) map.npcs.push(person('plantilla', 'plantilla', 16, 9, 'down', { mark: true, extras: [...LOOKS.plantilla.extras, 'case'] }));
    if (chIs(st, 'tren') || chIs(st, 'algoritmo')) {
      // el tren de Albacete, por fin parado en la vía 1
      map.trains = [];
      map.objects.push({ kind: 'train_parked', x: 4, y: 6, w: 24, h: 2, doors: [7, 13], label: 'ALBACETE', color: '#7CFC8A', labelNear: 6,
        portal: { kind: 'warp', to: { map: 'tren', x: 1, y: 3, dir: 'right' } } });
    }
  }
  return map;
}

export const STORY_MAPS = { programacion: buildProgramacion, arquivo: buildArquivo, tren: buildTren, datos: buildDatos };
export function buildStoryMap(id, ctx) {
  if (id.startsWith('house_')) return buildHouse(id.slice(6), ctx);
  return STORY_MAPS[id]?.(ctx) || null;
}

// escenas: vecinos que aparecen y desaparecen durante un guion
export const SPAWNS = {
  brais_prologo: () => person('brais_prologo', 'brais', 7, 9, 'up'),
  brais_rival: (pos) => person('brais_rival', 'brais', pos.x - 1, pos.y + 2, 'up'),
  vanesa_rival: (pos) => person('vanesa_rival', 'vanesa', pos.x + 1, pos.y + 2, 'up'),
  errata: () => paxNpc('errata', 'errata', 'A Errata', 8, 5, { big: true }),
};
