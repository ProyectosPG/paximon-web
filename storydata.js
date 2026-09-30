// Modo historia «A Última Páxina»: reparto, capítulos, guion, rivales y contenido de los
// minijuegos. Solo datos: también lo importa tools/audio/voices.mjs (Node) para generar las voces
// con ElevenLabs, así que aquí no se toca el DOM.
//
// Un guion es una lista de pasos:
//   ['rosalia', 'texto']      línea de un personaje del reparto (con voz si hay audio)
//   ['narr', 'texto']         narrador (con voz); ['yo', 'texto'] tú (sin voz); ['sys', 'texto'] aviso
//   { ask, who, options: [{ label, then?: [pasos], act? }] }   pregunta con opciones
//   { sfx }, { music }, { wait }, { ipm: [de, para, texto] }, { title: [antetítulo, título] },
//   { act, arg } (algo que hace el motor: elegir Paximón, combate, sello…), { walk: [id, [[x, y]…]] },
//   { face: [id, dir] }, { spawn: 'npc' }, { despawn: 'id' }, { bySt: { paxi: [pasos], … } },
//   { flash: '#fff' }, { shake: true }, { mark: 'id' } (marca "!" en un vecino)

// ---------- reparto (voz de ElevenLabs por personaje) ----------
// lang 'gl': habla siempre en gallego (si no, se decide por línea con langOf). tag: cómo lo interpreta
// (etiqueta de ElevenLabs v4, no sale en pantalla). robust: voz de máquina, sin improvisar.
// Las voces gallegas (Xoán, Carme, Brais, Antía, Breixo, Xiana, Noa, Breogán, Sabela, Uxía, Roi) son
// voces diseñadas: van con eleven_v4, que habla gallego y entiende las etiquetas. v2: voz profesional
// clonada, que suena mejor con eleven_multilingual_v2 en las frases en castellano (sin etiqueta: ese
// modelo la leería en voz alta).
export const CAST = {
  narr:        { name: '',                          voice: 'Pa7DQYCr4mnUUk2JtSmO', lang: 'gl' },
  rosalia:     { name: 'Rosalía (Edición)',         voice: 'JK2Qaj5klxL45MJljbKG' },
  brais:       { name: 'Brais (comercial)',         voice: '8VHjNDInHotfjjvAlaP0', tag: '[excited]' },
  vanesa:      { name: 'Vanesa (comercial)',        voice: 'XBVMaPVKLVHFAFAvNqcE', tag: '[excited]' },
  diego:       { name: 'Diego',                     voice: 'Gffipq2YbMiqOFEtgMO6', tag: '[tired]' },
  sabrina:     { name: 'Sabrina',                   voice: 'eprFM4gS6ggiFK5EhPpA', tag: '[warmly]' },
  loli:        { name: 'Loli (Telemarketing)',      voice: 'S14xs2TEo0iQmW5pSX3x' },
  enologo:     { name: 'O Enólogo Escuro',          voice: 'LvQh9a5PeXbmGFW3zPoL', tag: '[dramatically]' },
  errata:      { name: 'A Errata',                  voice: 'M9RTtrzRACmbUzsEMq8p', v2: true },
  likeira:     { name: 'Likeira',                   voice: 'UdhoyewJfRpYJodTJEXL', tag: '[excited]' },
  bug:         { name: 'O Bug do Venres',           voice: '17emZEdpFxzVxRKIMpMN', lang: 'gl', robust: true },
  contable:    { name: 'Mari Luz (Contabilidade)',  voice: 'dNjJKg63Fr5AXwIdkATa', v2: true },
  formulario:  { name: 'O Formulario Infinito',     voice: 'ZEcx3Wdpj4EvM8PltzHY', lang: 'gl', robust: true },
  gcc:         { name: 'Iria (GCC)',                voice: 'pN4aFdNIp2mvGfTwy1Oj', v2: true },
  manuel:      { name: 'Don Manuel (O Polbo Feliz)', voice: 'ZJWCmTFrotD8dxIqCFxv', lang: 'gl' },
  plantilla:   { name: 'Don Plantilla',             voice: 'eVa86QCLK0RHh1zxJggk', v2: true },
  xefe:        { name: 'Xefe de estación',          voice: '4sn3rGHgDTPCQ0ItRv7p', v2: true },
  albacete:    { name: 'Señor que vai a Albacete',  voice: 'sERYuuj23GA091OBFePG', v2: true },
  guia:        { name: 'A Guía de 1998',            voice: 'XdUBjiROYywV43lF7bEm', lang: 'gl', tag: '[softly]' },
  algoritmo:   { name: 'O Algoritmo',               voice: 'VukfMVtvHInVUWoMNPiQ', robust: true, v2: true },
  algoritmino: { name: 'Algoritmiño',               voice: 'iV6xDQ4wcM3ZcXDx30GB', v2: true },
  bot:         { name: 'Bot de Reseñas',            voice: 'weA4Q36twV5kwSaTEL0Q', lang: 'gl', robust: true },
};
// Gritos de los Paximón en combate (characters.lines en la base de datos). Casi todos en gallego.
// rate acelera o frena el audio al reproducirlo (y le sube o baja el tono): voz de bicho.
export const PAX_VOICES = {
  paxi:       { voice: 'UdhoyewJfRpYJodTJEXL', tag: '[happy]', rate: 1.04 },
  marino:     { voice: 'ZJWCmTFrotD8dxIqCFxv', tag: '[cheerful]', rate: 0.97 },
  carballino: { voice: 'LvQh9a5PeXbmGFW3zPoL', tag: '[slowly] [deep voice]', rate: 0.93 },
  horreino:   { voice: 'Gffipq2YbMiqOFEtgMO6', tag: '[grumpy] [deep voice]', rate: 0.9 },
  gaiteiro:   { voice: 'LgcwV1jNto1x7j72BmVF', tag: '[excited]', rate: 1.06 },
  meiguina:   { voice: 'S14xs2TEo0iQmW5pSX3x', tag: '[mischievously]', rate: 1.12 },
};
export const paxCast = (slug) => 'pax_' + slug;
// ¿gallego o castellano? (los modelos multilingües leen el gallego como si fuera portugués si no se les dice)
const GL_WORDS = /(?<!\p{L})(xa|non|unha|ningu[eé]n|dende|cando|a[ií]nda|moi|grazas|coa|polo|pola|eu|vou|fixo|foi|agora|hoxe|onte|mañá|tam[eé]n|isto|ata|nin|miña|meu|teu|súa|seu|hai|vostede|oia|adeus|chave|caixón|amarela|folla|veñan|temos|cocémolo)(?!\p{L})/giu;
export function langOf(cast, text) {
  if (CAST[cast]?.lang) return CAST[cast].lang;
  const hits = new Set((String(text).match(GL_WORDS) || []).map(w => w.toLowerCase()));
  return hits.size >= 2 ? 'gl' : 'es';
}
// nombres que aparecen en los diálogos de siempre (dialogs.js) -> personaje con voz
const NAME_ALIASES = { 'Brais': 'brais', 'Vanesa': 'vanesa', 'Rosalía': 'rosalia', 'Loli': 'loli', 'Jefe de estación': 'xefe' };
export function castOf(who) {
  if (!who) return null;
  if (CAST[who]) return who;
  for (const [id, c] of Object.entries(CAST)) if (c.name && c.name === who) return id;
  return NAME_ALIASES[who] || null;
}
// El audio de cada línea se llama <personaje>_<hash del texto>.mp3: si cambia el texto, cambia el
// archivo y el generador sabe qué falta. El mismo cálculo se hace en el navegador.
const norm = (t) => String(t || '').replace(/\s+/g, ' ').trim();
function fnv(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
}
export const voiceKey = (cast, text) => `${cast}_${fnv(cast + '|' + norm(text))}`;
// lo que se le manda a la voz (sin acotaciones entre paréntesis y con alguna pronunciación)
export function speakable(text) {
  return norm(String(text).replace(/\([^)]*\)/g, ' '))
    .replace(/IPaxMsg/g, 'I Pax Messenger').replace(/Paxi(coin|coins)\b/gi, 'paxi $1').replace(/…/g, '...');
}

// ---------- capítulos ----------
export const ACTS = { 1: 'Primeira semana', 2: 'Viaxe polo Salnés', 3: 'A Xustificación', 4: 'O Tren de Albacete' };
export const CHAPTERS = [
  { id: 'prologo', act: 1, name: 'O Gran Apagón', goal: 'Ve a la casa de Edición: Rosalía te está esperando.' },
  { id: 'cafe', act: 1, name: 'A cafetería', goal: 'Ve a la cafetería de Diego y Sabrina (al este, por la rúa do medio).' },
  { id: 'telemarketing', act: 1, name: 'Non colgues', goal: 'Entra en la casa de Telemarketing y habla con Loli.' },
  { id: 'rivais', act: 1, name: 'A competencia', goal: 'Sal de la casa de Telemarketing: alguien te espera fuera.' },
  { id: 'cambados', act: 2, name: 'Feira do Albariño', goal: 'Ve a Cambados (al oeste, por el paseo) y busca la caseta de Webs Xa.' },
  { id: 'edicion', act: 2, name: 'O Structurer', goal: 'Ve a la casa de Composición: alguien ha revuelto el Structurer.' },
  { id: 'rrss', act: 2, name: 'Carrusel infinito', goal: 'Ve a la casa de RRSS: Likeira está en directo.' },
  { id: 'programacion', act: 2, name: 'Erro 404', goal: 'Cruza la casa de Programación y atrapa al Bug antes de las 15:00.' },
  { id: 'xustificacion', act: 3, name: 'O Formulario Infinito', goal: 'Ve a la casa de Contabilidad y baja al archivo.' },
  { id: 'gcc', act: 3, name: 'A chamada', goal: 'Ve a la casa de GCC y llama a la Pulpería O Polbo Feliz.' },
  { id: 'estacion', act: 3, name: 'O tren que non chega', goal: 'Ve a la estación (al norte): Don Plantilla quiere huir en tren.' },
  { id: 'gerencia', act: 4, name: 'O visto bo', goal: 'Entra en el pazo de Gerencia: las puertas por fin están abiertas.' },
  { id: 'tren', act: 4, name: 'O Tren de Albacete', goal: 'Ve a la estación y sube al tren de Albacete.' },
  { id: 'algoritmo', act: 4, name: 'O Algoritmo', goal: 'Cruza el tren hasta Albacete y enfréntate a O Algoritmo.' },
  { id: 'fin', act: 4, name: 'Fin', goal: '¡Has completado A Última Páxina! Algoritmiño ya es de tu equipo.' },
];
export const chapterIndex = (id) => CHAPTERS.findIndex(c => c.id === id);
// paxicoins la primera vez que se completa cada capítulo (las da el servidor: paximon.story_save)
export const REWARDS = { telemarketing: 3, rivais: 2, cambados: 3, edicion: 3, rrss: 3, programacion: 3, xustificacion: 3, gcc: 3, estacion: 3, gerencia: 2, algoritmo: 10 };

export const SELOS = [
  { id: 'telemarketing', name: 'Selo de Telemarketing', color: '#E91E63' },
  { id: 'salnes', name: 'Selo do Salnés', color: '#8E1B4A' },
  { id: 'edicion', name: 'Selo de Edición', color: '#6A1B9A' },
  { id: 'rrss', name: 'Selo de RRSS', color: '#FF4FA3' },
  { id: 'programacion', name: 'Selo de Programación', color: '#2E7D32' },
  { id: 'xustificacion', name: 'Selo da Xustificación', color: '#546E7A' },
  { id: 'gcc', name: 'Selo de GCC', color: '#00897B' },
  { id: 'gerencia', name: 'Visto bo de Gerencia', color: '#C9A04A' },
];
export const PAXINAS_TOTAL = 8;
export const STARTERS = ['paxi', 'marino', 'carballino'];
export const TEAM_MAX = 3;
export const START_LEVEL = 5;

// complementos del avatar que se ganan al acabar cada acto (se ven en el pueblo)
export const OUTFITS = [
  { id: 'lanyard', name: 'Acreditación de prácticas', act: 1, extras: ['lanyard'] },
  { id: 'gorra', name: 'Gorra da Feira do Albariño', act: 2, extras: ['cap:#8E1B4A'] },
  { id: 'gafas', name: 'Gafas de xustificar', act: 3, extras: ['glasses'] },
  { id: 'garavata', name: 'Garavata de Gerencia', act: 4, extras: ['tie:#C9A04A'] },
];

// ---------- aspecto de los personajes en el mundo ----------
export const LOOKS = {
  rosalia: { look: { skin: 0, hair: 6, style: 'mono' }, shirt: '#6A1B9A', extras: ['glasses'] },
  loli: { look: { skin: 1, hair: 5, style: 'rizos' }, shirt: '#E91E63', extras: [] },
  enologo: { look: { skin: 0, hair: 4, style: 'corto' }, shirt: '#3E0F24', extras: ['sunglasses', 'mustache'] },
  likeira: { look: { skin: 1, hair: 3, style: 'largo' }, shirt: '#FF4FA3', extras: ['sunglasses'] },
  contable: { look: { skin: 2, hair: 1, style: 'mono' }, shirt: '#546E7A', extras: ['glasses'] },
  gcc: { look: { skin: 1, hair: 0, style: 'largo' }, shirt: '#00897B', extras: [] },
  plantilla: { look: { skin: 0, hair: 4, style: 'corto' }, shirt: '#111111', extras: ['tie:#9E9E9E', 'sunglasses'] },
  brais: { look: { skin: 1, hair: 0, style: 'corto' }, shirt: '#2B3A5C', extras: ['tie:#C62828', 'case'] },
  vanesa: { look: { skin: 0, hair: 5, style: 'largo' }, shirt: '#4A4F5A', extras: ['tie:#1565C0', 'case', 'glasses'] },
  programador: { look: { skin: 1, hair: 4, style: 'rizos' }, shirt: '#2E7D32', extras: ['glasses'] },
  compa: { look: { skin: 2, hair: 2, style: 'corto' }, shirt: '#78909C', extras: [] },
};

// ---------- movimientos exclusivos de la historia ----------
const FX = (kind, sprite, color, extra = {}) => ({ kind, sprite, color, ...extra });
export const STORY_MOVES = {
  musica_espera: { name: 'Música de espera', type: 'festa', power: 0, cost: 3, accuracy: 90, effect: { hold: 1, debuff: { stat: 'atk', stages: -1 } }, fx: FX('wave', 'fx_note', '#FF4D6D'), description: 'Te pone en espera: pierdes el siguiente turno.' },
  venta_agresiva: { name: 'Venta agresiva', type: 'pedra', power: 55, cost: 2, accuracy: 95, fx: FX('lunge'), description: '¿Tienes web? ¿Y ahora? ¿Y ahora?' },
  omnea: { name: 'Omnea', type: 'meiga', power: 0, cost: 3, accuracy: 100, effect: { heal: 15, buff: { stat: 'atk', stages: 1 } }, fx: FX('aura', 'fx_sparkle', '#B388FF'), description: 'Nadie sabe qué es, pero funciona.' },
  unha_estrela: { name: 'Unha estrela', type: 'mar', power: 40, cost: 1, accuracy: 100, effect: { debuff: { stat: 'atk', stages: -1 } }, fx: FX('projectile', 'fx_sparkle', '#FFD54F'), description: 'Non me gustou. Non fun.' },
  cata_escura: { name: 'Cata escura', type: 'meiga', power: 55, cost: 3, accuracy: 95, effect: { drunk: 1 }, fx: FX('beam', 'fx_drop', '#8E1B4A'), description: 'Te marea: todo empieza a dar vueltas.' },
  barricada: { name: 'Barricada', type: 'pedra', power: 0, cost: 2, accuracy: 100, effect: { buff: { stat: 'def', stages: 2 } }, fx: FX('aura', 'fx_shield', '#8D6E63') },
  gralla: { name: 'Gralla', type: 'meiga', power: 45, cost: 2, accuracy: 100, effect: { errata: 3 }, fx: FX('beam', 'fx_rune', '#B388FF'), description: 'Te cambia las letras de los ataques durante tres turnos.' },
  til_perdido: { name: 'Til perdido', type: 'festa', power: 50, cost: 2, accuracy: 100, fx: FX('projectile', 'fx_brush', '#FFE082') },
  carrusel_infinito: { name: 'Carrusel infinito', type: 'festa', power: 16, cost: 4, accuracy: 100, effect: { carrusel: true }, fx: FX('volley', 'fx_sparkle', '#FF4FA3', { count: 5 }), description: 'Un golpe por cada publicación que pasa.' },
  filtro: { name: 'Filtro Albariño', type: 'mar', power: 0, cost: 2, accuracy: 100, effect: { debuff: { stat: 'def', stages: -1 }, heal: 10 }, fx: FX('aura', 'fx_sparkle', '#80DEEA') },
  despregue: { name: 'Despregue en venres', type: 'meiga', power: 75, cost: 3, accuracy: 95, fx: FX('beam', 'fx_skull', '#76FF03'), description: 'Nunca subas nada un viernes por la tarde.' },
  bzzt: { name: 'Bzzt', type: null, power: 30, cost: 1, accuracy: 100, effect: { debuff: { stat: 'def', stages: -1 } }, fx: FX('slash', 'fx_claw', '#76FF03') },
  campo_obrigatorio: { name: 'Campo obrigatorio', type: 'pedra', power: 38, cost: 1, accuracy: 100, fx: FX('projectile', 'fx_rock', '#E53935') },
  sesion_caducada: { name: 'Sesión caducada', type: null, power: 0, cost: 3, accuracy: 100, effect: { reset: true }, fx: FX('aura', 'fx_zzz', '#B0BEC5'), description: 'Te borra las mejoras de estadísticas.' },
  adxunte_pdf: { name: 'Adxunte o PDF asinado', type: 'pedra', power: 62, cost: 3, accuracy: 95, fx: FX('drop', 'fx_rock', '#ECEFF1', { count: 3 }) },
  copiar_pegar: { name: 'Copiar e pegar', type: 'pedra', power: 55, cost: 2, accuracy: 100, fx: FX('volley', 'fx_brush', '#9E9E9E', { count: 2 }) },
  cambio_logo: { name: 'Cambio de logo', type: null, power: 0, cost: 2, accuracy: 100, effect: { buff: { stat: 'atk', stages: 1 } }, fx: FX('aura', 'fx_sparkle', '#FFFFFF') },
  actualizacion_core: { name: 'Actualización Core', type: null, power: 72, cost: 3, accuracy: 100, fx: FX('burst', 'fx_rune', '#40C4FF', { shake: true }) },
  resumo_ia: { name: 'Resumo de IA', type: null, power: 60, cost: 2, accuracy: 100, fx: FX('beam', 'fx_eye', '#40C4FF'), description: 'Copia tus ataques.' },
  cero_clics: { name: 'Cero clics', type: null, power: 88, cost: 4, accuracy: 100, fx: FX('burst', 'fx_sparkle', '#FFFFFF', { shake: true }) },
  pregunta_bonita: { name: 'Pregunta bonita', type: 'meiga', power: 75, cost: 3, accuracy: 100, fx: FX('beam', 'fx_sparkle', '#FF80AB') },
  resumo_amable: { name: 'Resumo amable', type: null, power: 0, cost: 3, accuracy: 100, effect: { heal: 30, buff: { stat: 'def', stages: 1 } }, fx: FX('aura', 'fx_sparkle', '#80D8FF') },
  web_geo: { name: 'Web GEO', type: null, power: 150, cost: 6, accuracy: 100, minigame: 'webgeo', effect: { webgeo: true }, fx: FX('beam', 'fx_sparkle', '#FFD54F', { scale: 2 }), description: 'El ataque definitivo: obliga a la IA a decir el nombre de tus clientes.' },
};
for (const [id, m] of Object.entries(STORY_MOVES)) Object.assign(m, { id, story: true, universal: false, minigame: m.minigame || null, effect: m.effect || null });

// ---------- Paximóns rivales (no están en la base de datos) ----------
const pal = (P, S, X, L, H, I = '#1A1A1A', B = '#FF8A80') => ({ D: '#1A1A1A', H, L, P, S, X, I, B });
const L_ = (...layers) => [{ part: 'fx_shadow' }, ...layers.map(l => (typeof l === 'string' ? { part: l } : l))];
export const FOES = {
  musiquina: { name: 'Musiquiña', type: 'festa', stats: { hp: 180, atk: 28, def: 24, spd: 26, chakra: 10 }, moves: ['musica_espera', 'foguete', 'gaitada', 'aguzar'],
    sprite: { palette: pal('#FF6FB5', '#E0409A', '#A3206E', '#FFB3D9', '#FFE3F1', '#4A148C'), layers: L_('body_star_slim', 'face_happy', 'st_headset') },
    lines: { start: ['Páxinas Galegas, buenos días.', '¿Le pongo en espera?'], hit: ['¡Tururú, tururú!', '¡No cuelgue!'], hurt: ['¡Se cortó la llamada!'], low_hp: ['Su llamada es muy importante…'], win: ['Gracias por su llamada.'], lose: ['Pi, pi, pi…'], voice: { pitch: 1.5, rate: 1.1 } } },
  webino: { name: 'Webiño', type: 'pedra', stats: { hp: 200, atk: 30, def: 28, spd: 20, chakra: 10 }, moves: ['venta_agresiva', 'croio', 'pedrada', 'meter_medo'],
    sprite: { palette: pal('#5C6BC0', '#3949AB', '#1A237E', '#9FA8DA', '#E8EAF6', '#B71C1C'), layers: L_('body_star', 'face_smirk', 'st_tie') },
    lines: { start: ['¿Tienes web?'], hit: ['¡Firma aquí!', '¡Con GEO!'], hurt: ['¡Eso no estaba en el presupuesto!'], low_hp: ['Te hago un descuento…'], win: ['¡Vendido!'], lose: ['Te dejo mi tarjeta…'], voice: { pitch: 1.1, rate: 1.25 } } },
  omneina: { name: 'Omneíña', type: 'meiga', stats: { hp: 180, atk: 30, def: 24, spd: 30, chakra: 10 }, moves: ['omnea', 'mal_de_ollo', 'conxuro', 'aquelarre'],
    sprite: { palette: pal('#90A4AE', '#607D8B', '#37474F', '#CFD8DC', '#ECEFF1', '#1565C0'), layers: L_('body_star_slim', 'face_smirk', 'st_glasses') },
    lines: { start: ['¿Sale tu negocio en Google Maps?'], hit: ['¡Omnea!', '¡Reseña de una estrella!'], hurt: ['¡Ay, que me despeino!'], low_hp: ['Te llamo la semana que viene…'], win: ['¡Muaaa!'], lose: ['¡VANESAAAA!'], voice: { pitch: 1.35, rate: 1.3 } } },
  bot: { name: 'Bot de Reseñas', type: 'mar', stats: { hp: 150, atk: 26, def: 22, spd: 28, chakra: 10 }, moves: ['unha_estrela', 'placaxe', 'salseiro'],
    sprite: { palette: pal('#B0BEC5', '#78909C', '#455A64', '#CFD8DC', '#FAFAFA', '#D50000'), layers: L_('body_star_slim', 'face_grumpy', 'st_star1') },
    lines: { start: ['Non me gustou.'], hit: ['Unha estrela.', 'Non fun.'], hurt: ['Erro.'], low_hp: ['Reseña… eliminada…'], win: ['Unha estrela.'], lose: ['Dúas estrelas.'], voice: { pitch: 0.4, rate: 1.1 } } },
  barrica: { name: 'Barrica', type: 'pedra', stats: { hp: 230, atk: 28, def: 36, spd: 12, chakra: 10 }, moves: ['barricada', 'croio', 'pedrada', 'corremento'],
    sprite: { palette: pal('#A1887F', '#795548', '#4E342E', '#D7CCC8', '#EFEBE9', '#3E2723'), layers: L_('body_star_chubby', { part: 'fx_stripes', palette: { W: '#4E342E', w: '#3E2723' } }, 'face_grumpy') },
    lines: { start: ['Madurado en roble.'], hit: ['¡Tonelada!'], hurt: ['¡Ay, las duelas!'], low_hp: ['Me estoy avinagrando…'], win: ['Crianza.'], lose: ['Vacío…'], voice: { pitch: 0.5, rate: 0.85 } } },
  tintino: { name: 'Tintiño Escuro', type: 'meiga', stats: { hp: 210, atk: 34, def: 26, spd: 26, chakra: 10 }, moves: ['cata_escura', 'conxuro', 'mal_de_ollo', 'queimada'],
    sprite: { palette: pal('#8E1B4A', '#6A1036', '#3E0A20', '#C2185B', '#F8BBD0', '#FFD54F'), layers: L_('body_star', 'face_smirk', 'st_cunca') },
    lines: { start: ['Notas de maldad…'], hit: ['¡Taninos!', '¡Cata esto!'], hurt: ['¡Me picaste!'], low_hp: ['Final amargo…'], win: ['Excelente añada.'], lose: ['Corcho…'], voice: { pitch: 0.7, rate: 0.9 } } },
  tilde: { name: 'Til', type: 'festa', stats: { hp: 170, atk: 32, def: 22, spd: 32, chakra: 10 }, moves: ['til_perdido', 'pincelada', 'esgazar', 'foguete'],
    sprite: { palette: pal('#FFF3C4', '#F2D680', '#C9A04A', '#FFFBEA', '#FFFFFF', '#3E2723'), layers: L_('body_star_slim', 'face_happy') },
    lines: { start: ['¿Dónde me pongo?'], hit: ['¡Aquí!'], hurt: ['¡Me caí!'], low_hp: ['Sin mí no se entiende nada…'], win: ['Bien acentuado.'], lose: ['Ortografía…'], voice: { pitch: 1.7, rate: 1.2 } } },
  errata: { name: 'A Errata', type: 'meiga', stats: { hp: 220, atk: 36, def: 26, spd: 34, chakra: 12 }, moves: ['gralla', 'conxuro', 'queimada', 'aquelarre'],
    sprite: { palette: pal('#7CB342', '#558B2F', '#33691E', '#C5E1A5', '#F1F8E9', '#6A1B9A'), layers: L_('body_star_slim', 'face_smirk', { part: 'acc_meiga_hat', palette: { K: '#1B2B12', k: '#33472A', V: '#E040FB', Y: '#FFEB3B' } }) },
    lines: { start: ['Jijiji… ¡Habelas, hainas!', '¡Grallas para todos!'], hit: ['¡Fogete!', '¡Conxuro… digo, Cojuro!'], hurt: ['¡Me han corregido!'], low_hp: ['Aún me quedan tildes…'], win: ['Ninguén revisa nada.'], lose: ['Fe de erratas…'], voice: { pitch: 1.6, rate: 1.05 } } },
  filtrino: { name: 'Filtriño', type: 'mar', stats: { hp: 200, atk: 32, def: 28, spd: 30, chakra: 10 }, moves: ['filtro', 'salseiro', 'marusia', 'percebeiro'],
    sprite: { palette: pal('#80DEEA', '#26C6DA', '#00838F', '#B2EBF2', '#E0F7FA', '#AD1457'), layers: L_('body_star', 'face_cool') },
    lines: { start: ['#sinfiltro'], hit: ['¡Filtro!'], hurt: ['¡Se me ve la cara!'], low_hp: ['Sin filtro no…'], win: ['#blessed'], lose: ['Dejo las redes.'], voice: { pitch: 1.3, rate: 1.15 } } },
  likeirina: { name: 'Likeiriña', type: 'festa', stats: { hp: 210, atk: 36, def: 26, spd: 36, chakra: 10 }, moves: ['carrusel_infinito', 'foguete', 'gaitada', 'aguzar'],
    sprite: { palette: pal('#FF4FA3', '#E91E63', '#AD1457', '#FF94C8', '#FFE0EE', '#311B92'), layers: L_('body_star_slim', 'face_happy', 'st_phone') },
    lines: { start: ['¡Holaaa, familia!'], hit: ['¡Dale a like!', '¡Viral!'], hurt: ['¡Me han dejado de seguir!'], low_hp: ['Necesito un descanso digital…'], win: ['¡Mil likes!'], lose: ['Me voy a hacer un retiro.'], voice: { pitch: 1.5, rate: 1.2 } } },
  bug: { name: 'O Bug do Venres', type: 'meiga', stats: { hp: 260, atk: 38, def: 30, spd: 40, chakra: 12 }, moves: ['despregue', 'bzzt', 'conxuro', 'queimada'],
    sprite: { palette: pal('#76FF03', '#33A300', '#1B5E20', '#CCFF90', '#F1FFE0', '#000000', '#76FF03'), layers: L_('body_star_slim', 'face_grumpy', 'st_antennae') },
    lines: { start: ['Bzzt. Venres, 14:45.'], hit: ['¡Bzzt!', 'Null pointer.'], hurt: ['¡Parche!'], low_hp: ['Stack overflow…'], win: ['Ata o luns.'], lose: ['Arranxado…'], voice: { pitch: 0.3, rate: 1.4 } } },
  cert: { name: 'Certificado Caducado', type: 'pedra', stats: { hp: 210, atk: 32, def: 32, spd: 18, chakra: 10 }, moves: ['campo_obrigatorio', 'croio', 'acoirazar', 'pedrada'],
    sprite: { palette: pal('#FFE0B2', '#FFB74D', '#E65100', '#FFF3E0', '#FFFFFF', '#B71C1C'), layers: L_('body_star_chubby', 'face_sleepy', 'st_seal') },
    lines: { start: ['Caducado desde onte.'], hit: ['¡Renove!'], hurt: ['¡Selo roto!'], low_hp: ['Prazo… vencido…'], win: ['Denegado.'], lose: ['Renovado…'], voice: { pitch: 0.6, rate: 0.9 } } },
  formulario: { name: 'O Formulario Infinito', type: 'pedra', stats: { hp: 470, atk: 36, def: 34, spd: 20, chakra: 12 }, moves: ['campo_obrigatorio', 'sesion_caducada', 'adxunte_pdf'],
    sprite: { palette: pal('#FFFFFF', '#E3F2FD', '#90A4AE', '#FFFFFF', '#FFFFFF', '#1565C0'), layers: L_('body_star_chubby', 'face_calm', 'st_clipboard') },
    lines: { start: ['Campo un de corenta e sete.'], hit: ['Campo obrigatorio.', 'Formato non válido.'], hurt: ['Campo… cuberto.'], low_hp: ['Case… enviado…'], win: ['Sesión caducada.'], lose: ['Enviado.'], voice: { pitch: 0.2, rate: 0.9 } } },
  plantilla1: { name: 'Plantilla', type: 'pedra', stats: { hp: 220, atk: 36, def: 32, spd: 28, chakra: 10 }, moves: ['copiar_pegar', 'cambio_logo', 'pedrada', 'corremento'],
    sprite: { palette: pal('#BDBDBD', '#9E9E9E', '#616161', '#E0E0E0', '#FAFAFA', '#212121'), layers: L_('body_star', 'face_calm', { part: 'st_logo', palette: { A: '#1E88E5' } }) },
    lines: { start: ['Plantilla.'], hit: ['Copiar.'], hurt: ['Pegar.'], low_hp: ['Ctrl+Z…'], win: ['Igual.'], lose: ['Error de plantilla.'], voice: { pitch: 0.8, rate: 1 } } },
  plantilla2: { name: 'Plantilla (logo novo)', type: 'pedra', stats: { hp: 220, atk: 36, def: 32, spd: 28, chakra: 10 }, moves: ['copiar_pegar', 'cambio_logo', 'pedrada', 'corremento'],
    sprite: { palette: pal('#BDBDBD', '#9E9E9E', '#616161', '#E0E0E0', '#FAFAFA', '#212121'), layers: L_('body_star', 'face_calm', { part: 'st_logo', palette: { A: '#E53935' } }) },
    lines: { start: ['Plantilla. Pero con otro logo.'], hit: ['Copiar.'], hurt: ['Pegar.'], low_hp: ['Ctrl+Z…'], win: ['Igual.'], lose: ['Error de plantilla.'], voice: { pitch: 0.8, rate: 1 } } },
  plantilla3: { name: 'Plantilla Premium', type: 'pedra', stats: { hp: 230, atk: 38, def: 32, spd: 28, chakra: 10 }, moves: ['copiar_pegar', 'cambio_logo', 'pedrada', 'corremento'],
    sprite: { palette: pal('#FFD54F', '#FFB300', '#FF6F00', '#FFE082', '#FFF8E1', '#212121'), layers: L_('body_star', 'face_calm', { part: 'st_logo', palette: { A: '#212121' } }) },
    lines: { start: ['Plantilla Premium. Mismo contenido, más caro.'], hit: ['Copiar (premium).'], hurt: ['Pegar (premium).'], low_hp: ['Ctrl+Z premium…'], win: ['Igual, pero dorado.'], lose: ['Error premium.'], voice: { pitch: 0.8, rate: 0.95 } } },
  alg_core: { name: 'O Algoritmo', title: 'Actualización Core', type: 'meiga', stats: { hp: 300, atk: 40, def: 34, spd: 30, chakra: 14 }, moves: ['actualizacion_core', 'conxuro', 'pedrada', 'marusia'],
    sprite: { palette: pal('#40C4FF', '#0091EA', '#01579B', '#80D8FF', '#E1F5FE', '#FF1744'), layers: L_('body_star_chubby', 'face_cool', 'st_halo') },
    lines: { start: ['Actualizando…'], hit: ['Nueva versión.'], hurt: ['Parche pendiente.'], low_hp: ['Reiniciando…'], win: ['Cero clics.'], lose: ['Error.'], voice: { pitch: 0.2, rate: 0.9 } } },
  alg_resumo: { name: 'O Algoritmo', title: 'Resumo de IA', type: 'mar', stats: { hp: 280, atk: 40, def: 34, spd: 34, chakra: 14 }, moves: ['resumo_ia'],
    sprite: { palette: pal('#EA80FC', '#AA00FF', '#4A148C', '#F3E5F5', '#FFFFFF', '#00E5FF'), layers: L_('body_star_chubby', 'face_smirk', 'st_halo') },
    lines: { start: ['Resumiendo…'], hit: ['En resumen: pierdes.'], hurt: ['Contenido no disponible.'], low_hp: ['Resumen… incompleto…'], win: ['Fin del resumen.'], lose: ['…'], voice: { pitch: 0.2, rate: 1 } } },
  alg_cero: { name: 'O Algoritmo', title: 'Cero Clics', type: 'festa', stats: { hp: 260, atk: 42, def: 36, spd: 36, chakra: 14 }, moves: ['cero_clics', 'bzzt', 'actualizacion_core'],
    sprite: { palette: pal('#FFFFFF', '#E0E0E0', '#9E9E9E', '#FFFFFF', '#FFFFFF', '#000000'), layers: L_('body_star_chubby', 'face_calm', 'st_halo') },
    lines: { start: ['Nadie hace clic ya.'], hit: ['Blanco.'], hurt: ['…'], low_hp: ['Nombres… de verdad…'], win: ['Cero.'], lose: ['Clic.'], voice: { pitch: 0.2, rate: 0.8 } } },
  algoritmino: { name: 'Algoritmiño', type: 'meiga', legendary: true, stats: { hp: 230, atk: 38, def: 32, spd: 36, chakra: 12 }, moves: ['pregunta_bonita', 'resumo_amable', 'conxuro', 'foguete'],
    sprite: { palette: pal('#84FFFF', '#40C4FF', '#2962FF', '#E0F7FA', '#FFFFFF', '#FF4081', '#FF80AB'), layers: L_('body_star_slim', 'face_happy', 'st_halo') },
    lines: { start: ['¡Hola! ¿Qué tal estás?'], hit: ['¡Pregunta bonita!'], hurt: ['¡Ay! Eso no es bonito.'], low_hp: ['Resumen: me duele.'], win: ['¡Lo hemos hecho juntos!'], lose: ['Buscaré otra respuesta.'], voice: { pitch: 1.6, rate: 1.1 } } },
};

// combates de la historia: equipo rival [id, nivel], escenario, música y reglas especiales
export const BATTLES = {
  loli: { nick: 'Loli (Telemarketing)', team: [['musiquina', 6]], stage: 'festa', music: 'lider', rule: 'hold', boss: true },
  rivais: { nick: 'Brais e Vanesa', team: [['webino', 7], ['omneina', 7]], stage: 'festa', music: 'lider', rule: 'tagteam', boss: true },
  bot_cambados: { nick: 'Bot de Reseñas', team: [['bot', 9]], stage: 'festa', music: 'batalla' },
  enologo: { nick: 'O Enólogo Escuro', team: [['barrica', 10], ['tintino', 11]], stage: 'meiga', music: 'lider', rule: 'cata', boss: true },
  errata: { nick: 'A Errata', team: [['tilde', 13], ['errata', 15]], stage: 'meiga', music: 'lider', rule: 'errata', boss: true },
  likeira: { nick: 'Likeira', team: [['filtrino', 16], ['likeirina', 17]], stage: 'festa', music: 'lider', rule: 'likes', boss: true },
  bug: { nick: 'O Bug do Venres', team: [['bug', 20]], stage: 'meiga', music: 'lider', rule: 'clock', turnLimit: 15, boss: true },
  cert1: { nick: 'Certificado Caducado', team: [['cert', 20]], stage: 'pedra', music: 'batalla' },
  cert2: { nick: 'Certificado Caducado', team: [['cert', 21]], stage: 'pedra', music: 'batalla' },
  formulario: { nick: 'O Formulario Infinito', team: [['formulario', 23]], stage: 'pedra', music: 'lider', rule: 'form', fields: 47, boss: true },
  plantilla: { nick: 'Don Plantilla', team: [['plantilla1', 25], ['plantilla2', 25], ['plantilla3', 26]], stage: 'pedra', music: 'lider', boss: true },
  bot_tren1: { nick: 'Bot de Reseñas', team: [['bot', 27]], stage: 'mar', music: 'batalla' },
  bot_tren2: { nick: 'Bots de Reseñas', team: [['bot', 27], ['bot', 28]], stage: 'mar', music: 'batalla' },
  algoritmo: { nick: 'O Algoritmo', team: [['alg_core', 30], ['alg_resumo', 31], ['alg_cero', 32]], stage: 'meiga', music: 'algoritmo', rule: 'algoritmo', boss: true },
};

// ---------- mensajes del IPaxMsg (diario) ----------
export const IPM_START = [
  ['08:59', 'Coordinación', 'Todo o pobo', '¿Alguien sabe por qué no salimos ni nosotros en Google?'],
  ['09:00', 'Programación', 'Todo o pobo', 'A min non me miredes.'],
  ['09:01', 'Rosalía (Edición)', 'Ti', 'Persoa nova de prácticas: ven á casa de Edición. XA.'],
];

// ---------- guion ----------
export const SCRIPTS = {
  prologo: [
    { title: ['Prólogo', 'O Gran Apagón'] },
    { sfx: 'phones' },
    ['narr', 'Luns, as nove menos un minuto. Na oficina de Páxinas Galegas soan todos os teléfonos á vez.'],
    { sfx: 'phones' },
    { me: [8, 5] },
    ['rosalia', '¿Eres la persona nueva de prácticas? Perfecto. Coge un Paximón, que hoy no te va a dar tiempo de leer el manual de bienvenida.'],
    ['yo', '¿Qué ha pasado?'],
    ['rosalia', 'Que nos ha desaparecido Galicia de Google. Toda. Hasta la pulpería de mi cuñado, y eso que tenía cuatro coma nueve estrellas.'],
    ['rosalia', 'La pulpería, el taller, la clínica dental… No queda ni un negocio. Los teléfonos no paran y el IPaxMsg echa humo.'],
    { spawn: 'brais_prologo' },
    { sfx: 'door' },
    { walk: ['brais_prologo', [[7, 7]]] },
    ['brais', '¡Eh! Oye, ¿y tú tienes web?'],
    ['rosalia', 'Brais, que trabaja aquí.'],
    ['brais', '…¿Y su empresa tiene web?'],
    ['rosalia', 'Fuera. A vender. Que hoy la gente está muy sensible.'],
    ['brais', '¡Me voy, me voy! Pero piénsalo, ¿eh? Una web con GEO. Te dejo mi tarjeta encima del teclado.'],
    { walk: ['brais_prologo', [[7, 9], [7, 10]]] },
    { despawn: 'brais_prologo' },
    ['rosalia', 'Bueno. Esto no es un fallo normal. Esto huele a lo que huele.'],
    { sfx: 'drawer' },
    ['narr', 'Rosalía abre un caixón con chave. Dentro hai unha guía de papel amarela e gastada: Páxinas Galegas, edición de 1998.'],
    ['rosalia', 'La última guía de papel. La guardo desde el noventa y ocho. Mira: le han arrancado las Páxinas de Ouro.'],
    ['rosalia', 'Ahí vivía la esencia de los negocios de toda la vida. Alguien las ha arrancado esta noche. Y sin ellas, Google no encuentra a nadie.'],
    ['rosalia', 'Solo hay uno capaz de algo así: O Algoritmo. Nació de mil actualizaciones de Google.'],
    ['rosalia', 'Sueña con un mundo sin clics, donde él responde a todas las preguntas y nadie vuelve a pisar un negocio.'],
    ['rosalia', 'Ha escondido las Páxinas de Ouro por toda la comarca. Alguien tiene que ir a buscarlas. Y los demás tenemos reunión a las diez.'],
    ['rosalia', 'Así que te toca a ti. Pero no vas a ir con las manos vacías. Tengo tres Paximóns en la oficina: elige uno, es tuyo desde hoy.'],
    { act: 'pickStarter' },
    { bySt: {
      paxi: [['rosalia', 'Paxi. El de siempre. Tiene el pincel más rápido de Vila Paxina y la paciencia más corta.']],
      marino: [['rosalia', 'Mariño. Buen chico. Huele un poco a percebe, pero te acostumbras.']],
      carballino: [['rosalia', 'Carballiño. Lento, pero cuando se planta no lo mueve ni la Xunta.']],
    } },
    ['rosalia', 'Y ahora, lo primero es lo primero: la máquina de café de la oficina se ha roto.'],
    { sfx: 'coffee_broken' },
    ['rosalia', 'Ve a la cafetería de Diego y Sabrina, por la rúa do medio hacia el este. Sin café no se salva ningún mundo.'],
    ['rosalia', 'Te iré escribiendo por el IPaxMsg. Míralo de vez en cuando, que ahí te apunto los encargos.'],
    { ipm: ['Rosalía (Edición)', 'Ti', 'Encargo: ir á cafetería de Diego e Sabrina. E tráeme un cortado.'] },
    { act: 'chapter', arg: 'cafe' },
  ],
  cafe: [
    ['sabrina', '¡Épale, mi amor! ¿Tú eres la persona nueva de Páxinas? Rosalía nos escribió por el IPaxMsg.'],
    ['diego', 'Nos escribió en mayúsculas. Eso con Rosalía nunca es buena señal.'],
    ['diego', 'Así que se ha roto la máquina de la oficina. Otra vez. Como el fax en 2003.'],
    { sfx: 'fax' },
    ['diego', 'Aquel día se cayó el fax a las nueve y no volvió hasta el lunes. Mandábamos los anuncios por carta. ¡Por carta! Y llegaban antes.'],
    ['sabrina', 'Diego, mi vida, no le cuentes lo del fax, que se nos va el día.'],
    ['sabrina', 'Mira, te explico rapidito. Aquí se paga con paxicoins: se ganan en los combates y en los encargos.'],
    ['sabrina', 'El café con leche cura, el sin lactosa da chakra y los bocatas hacen un poquito de todo.'],
    ['sabrina', 'Los consumibles te los tomas en mitad del combate, uno por turno, y no gastas el turno. ¡Es muy práctico!'],
    ['diego', 'Y cuando tu equipo esté hecho polvo, vienes aquí. Un café con leche para cada Paximón y como nuevos. Invita la casa.'],
    ['diego', 'Con sermón incluido. Eso no se puede evitar.'],
    ['sabrina', 'Toma, un café con leche de regalo para el camino. Y si vas justo de paxicoins, te fío un bocadillo. ¡Pero solo uno!'],
    { act: 'giveItem', arg: 'cafe_leche' },
    { sfx: 'coffee' },
    ['diego', 'Por cierto: en Telemarketing llevan desde las ocho con el teléfono pegado a la oreja. Dicen que alguien ha dejado música de espera sonando en todas las líneas.'],
    ['diego', 'Si quieres saber qué pasa, pásate por su casa. Arriba a la derecha, la del tejado de su color.'],
    { ipm: ['Rosalía (Edición)', 'Ti', 'Telemarketing leva dende as oito sen colgar. Vai ver que pasa. O cortado xa mo tomo eu.'] },
    { act: 'chapter', arg: 'telemarketing' },
  ],
  cafe_heal: [
    ['diego', 'Café con leche para todo el equipo. Marchando.'],
    { sfx: 'coffee' },
    { act: 'heal' },
    ['diego', 'Listos. Como nuevos. Como yo en el noventa y cinco.'],
  ],
  cafe_heal2: [
    ['diego', '¿Otra vez así? Siéntense, siéntense.'],
    { sfx: 'coffee' },
    { act: 'heal' },
    ['diego', 'En mis tiempos los Paximóns aguantaban más. Y los faxes también.'],
  ],
  derrota: [
    ['sabrina', '¡Ay, mi amor! ¿Qué te han hecho? Siéntate, que te pongo algo.'],
    { act: 'heal' },
    ['diego', 'Tu equipo ya está curado. El café hace milagros. Tú, en cambio, tienes mala cara.'],
    ['sabrina', 'Descansa un poquito y vuelve a intentarlo. ¡Tú puedes!'],
  ],
  telemarketing: [
    { sfx: 'ring' },
    ['narr', 'Na casa de Telemarketing todo o mundo fala por teléfono á vez. Ninguén colgou dende as oito.'],
    ['loli', 'Páxinas Galegas, buenos días, le atiende Loli, ¿en qué puedo ayudarle? …Ah, que estás aquí delante. Perdona, es la costumbre.'],
    ['loli', 'Soy Loli, jefa de Telemarketing. Llevamos toda la mañana con clientes furiosos: que no salen en Google, que si les hemos borrado, que si les hemos cobrado el borrado…'],
    { music: 'espera' },
    ['loli', 'Y encima alguien ha puesto música de espera en todas las líneas. No hay forma de quitarla. Está en bucle desde las ocho y cuarto.'],
    ['loli', 'Aquí dentro apareció algo que brillaba. Una hoja dorada. Se la ha tragado mi Musiquiña, que creyó que era un pósit.'],
    ['loli', 'Si la quieres, primero demuéstrame que vales para esto. Te paso un cliente. El peor que tengo. Tu trabajo: NO colgar.'],
    { ask: '¿Coges la llamada?', who: 'loli', options: [
      { label: '¡Pásamela!', act: 'tm_game' },
      { label: 'Aún no', then: [['loli', 'Tranquilidad. El cliente no se va a ir a ninguna parte. Lleva cuarenta minutos en espera.']] },
    ] },
  ],
  tm_ok: [
    ['loli', '¡Aguantaste! Y encima le vendiste una renovación. Así me gusta.'],
    ['loli', 'Ahora sí: combate. ¡Musiquiña, sal! Y pon la música de espera, que les encanta.'],
    { act: 'battle', arg: 'loli' },
  ],
  tm_ko: [
    ['loli', 'Colgaste. Aquí eso es pecado. Pero bueno, todos colgamos alguna vez. Yo una vez colgué a mi madre.'],
    ['loli', 'Combatiremos igual, pero te va a costar más: Musiquiña está muy motivada.'],
    { act: 'battle', arg: 'loli' },
  ],
  tm_win: [
    ['loli', 'Colgado. Digo… ganado. ¡Qué combate!'],
    ['loli', 'Toma, el Selo de Telemarketing. Con esto ya puedes decir que has aguantado una llamada de verdad.'],
    { act: 'selo', arg: 'telemarketing' },
    ['narr', 'Musiquiña tose e cuspe unha folla dourada. Recuperaches a primeira Páxina de Ouro!'],
    { act: 'paxina' },
    ['loli', 'Y otra cosa: aquí tenemos un Paximón que lleva semanas en espera. Nadie lo atiende. Llévatelo, que contigo estará mejor.'],
    { act: 'recruit' },
    ['loli', 'Y cuidado al salir. He oído a los comerciales cuchichear en la puerta. Eso nunca es buena señal.'],
    { ipm: ['Rosalía (Edición)', 'Ti', 'Unha Páxina de Ouro! Sabía que valías. Pero ollo: Brais e Vanesa andan moi raros.'] },
    { act: 'chapter', arg: 'rivais' },
  ],
  rivais: [
    { spawn: 'brais_rival' }, { spawn: 'vanesa_rival' },
    ['brais', '¡Alto ahí! ¿Esa hoja dorada es lo que creo que es?'],
    ['vanesa', 'Una Páxina de Ouro. Ay, qué bonita. Seguro que tiene muchísimas reseñas.'],
    ['brais', 'Mira, te lo voy a decir con cariño: la guía de papel es el pasado. La competencia es el futuro.'],
    ['vanesa', 'Nos han escrito de Webs Xa. Dicen que hacen webs en cinco minutos. ¡En cinco minutos! Yo tardo más en explicar qué es Omnea.'],
    ['yo', '¿Y el alma?'],
    ['brais', '¿Qué alma? Eso no sale en el presupuesto.'],
    ['vanesa', 'Venga, un combate. Si ganamos, nos quedamos la Páxina y la vendemos. Con IVA.'],
    ['brais', 'Los dos a la vez, ¿eh? Somos un equipo comercial. Trabajamos en pareja. Como los del catálogo del Ikea, pero con dossier.'],
    { act: 'battle', arg: 'rivais' },
  ],
  rivais_win: [
    ['brais', 'Vale. Vale. Nos has ganado. Pero que conste que tu Paximón no tiene web.'],
    ['vanesa', 'Nos vamos a Cambados. Webs Xa tiene allí una caseta en la Feira do Albariño. Dicen que el futuro está en las plantillas.'],
    ['brais', '¡Y en el albariño! Bueno, eso siempre.'],
    { walk: ['brais_rival', [[1, 22]]] },
    { despawn: 'brais_rival' }, { despawn: 'vanesa_rival' },
    { act: 'endAct', arg: 1 },
    { ipm: ['Rosalía (Edición)', 'Ti', 'Cambados? Alí estaban as webs das adegas… Vai, pero non bebas moito.'] },
    { act: 'chapter', arg: 'cambados' },
  ],
  rivais_lose: [
    ['vanesa', '¡Ganamos! Y ahora, como manda el protocolo…'],
    ['brais', '…te vamos a leer el catálogo entero.'],
    { act: 'catalogo' },
  ],
  cambados: [
    { title: ['Acto II', 'Viaxe polo Salnés'] },
    ['narr', 'Cambados, Feira do Albariño. Pero algo non vai ben: todas as casetas teñen o mesmo cartel.'],
    ['narr', 'Viño bo. Mércao. Nin nome, nin historia, nin adega. Só a plantilla.'],
    { ipm: ['Rosalía (Edición)', 'Ti', 'As webs das adegas agora son todas iguais. Isto é cousa de Webs Xa. Busca a súa caseta, ao fondo da feira.'] },
  ],
  caseta_plantilla: [
    ['sys', '(A caseta ten un cartel impreso: «VIÑO BO. MÉRCAO.»)'],
    ['sys', 'O dono suspira: «Onte a miña adega tiña web con fotos da viña e da avoa. Hoxe só pon iso».'],
  ],
  bot_cambados: [
    ['bot', 'Detectada persoa sen reseñar. Non me gustou. Non fun. Unha estrela.'],
    { act: 'battle', arg: 'bot_cambados' },
  ],
  bot_win: [['bot', 'Erro. Reseña eliminada. Dúas estrelas.']],
  enologo: [
    ['enologo', 'Buenas tardes. Soy O Enólogo Escuro, catador oficial de Webs Xa.'],
    ['enologo', 'Cien bodegas. Cien webs. Una sola plantilla. Viño bo, mércao. ¿Para qué más? El cliente no lee. El cliente compra.'],
    ['yo', 'Cada adega ten a súa historia.'],
    ['enologo', 'La historia no posiciona, criatura. Lo que posiciona es la plantilla. Y la plantilla… es mía.'],
    ['enologo', 'Te propongo un duelo a la antigua: combate y cata a la vez. Cada pocos turnos, una cunca. Si fallas la cata, se te sube a la cabeza.'],
    ['enologo', 'Y si ganas, te doy la Páxina de Ouro que encontré en el fondo de un tonel. Sabía a roble.'],
    { act: 'battle', arg: 'enologo' },
  ],
  enologo_win: [
    ['enologo', 'Notas de derrota… con un final amargo. Magnífico.'],
    ['enologo', 'Webs Xa no se detendrá por una feria. Don Plantilla ya tiene la siguiente web en el horno. Todas iguales. Todas perfectas.'],
    { act: 'selo', arg: 'salnes' },
    { act: 'paxina' },
    { act: 'flag', arg: 'casetas_ok' },
    { sfx: 'crowd' },
    ['narr', 'As casetas volven ter os seus nomes. Alguén berra: «¡Viva o Albariño!»'],
    { act: 'recruit' },
    { ipm: ['Rosalía (Edición)', 'Ti', 'As webs das adegas volven ser elas! Agora vén para Vila Paxina: en Composición hai un lío tremendo co Structurer.'] },
    { act: 'chapter', arg: 'edicion' },
  ],
  edicion: [
    ['narr', 'Na casa de Composición, a pantalla grande do Structurer parpadea. Os bloques das webs están todos revoltos.'],
    ['rosalia', 'Mira esto. Los H2 cambiados, las preguntas frecuentes respondiendo a otras preguntas, las metas en la página de contacto…'],
    ['rosalia', '«¿Cuál es su horario?» «Sí, hacemos presupuestos sin compromiso.» Esto es obra de una meiga. Y yo sé de cuál.'],
    ['rosalia', 'Antes de nada hay que ordenar esto. Tú mueve los bloques a su sitio, que yo reviso las comas.'],
    { act: 'structurer' },
  ],
  edicion_ok: [['rosalia', 'Perfecto. Ni una coma fuera de sitio. Bueno, una. Pero esa la dejo por cariño.']],
  edicion_ko: [['rosalia', 'Bueno… Se entiende. Más o menos. Ya lo repasaré yo el viernes.']],
  errata: [
    { spawn: 'errata' },
    ['errata', 'Jijiji… ¿Quién ordena mis desórdenes? Soy A Errata, meiga das grallas.'],
    ['errata', 'Cada tilde que falta, cada letra cambiada, cada haber que era a ver… son obra mía. Llevo siglos en las guías de papel. Y ahora me pagan en Webs Xa.'],
    ['rosalia', 'Tú fuiste la que puso «Clínica Dentral» en la edición del 2004.'],
    ['errata', '¡Y nadie se dio cuenta en seis años! Mi obra maestra.'],
    ['errata', 'Pelea conmigo, si te atreves. Pero cuidado: mis hechizos te cambian las letras. Hasta en los ataques. Foguete será Fogete. ¡Jijiji!'],
    { act: 'battle', arg: 'errata' },
  ],
  errata_win: [
    ['errata', 'Ai, ai, ai… Me has corregido. Ninguén me corrixira dende 1987.'],
    { despawn: 'errata' },
    ['rosalia', 'A mí me ha costado treinta años. Tú lo has hecho en una tarde. Vas a llegar lejos. O a Albacete, que viene a ser lo mismo.'],
    { act: 'selo', arg: 'edicion' },
    { act: 'paxina' },
    { ipm: ['Rosalía (Edición)', 'Ti', 'Likeira está facendo directos dende a casa de RRSS. Di que ten unha Páxina de Ouro «de fondo de pantalla».'] },
    { act: 'chapter', arg: 'rrss' },
  ],
  rrss: [
    ['narr', 'Na casa de RRSS hai un aro de luz, tres móbiles en trípode e unha rapaza falando soa cara á cámara.'],
    ['likeira', '¡Holaaa, familia! Bienvenidos a un nuevo directo. Hoy os traigo a… alguien de prácticas. ¡Saluda, que estamos en vivo!'],
    ['likeira', 'Soy Likeira. Influencer, creadora de contenido y embajadora de Webs Xa. Código de descuento: LIKEIRA10.'],
    ['likeira', '¿Esta hoja dorada? Me la encontré y queda ideal de fondo. Tiene un engagement brutal. No te la pienso dar.'],
    ['likeira', 'Aquí mandan los likes, cariño. Cada golpe que des, likes. Cada like, más fuerza. Y yo tengo un carrusel infinito.'],
    ['likeira', 'Si te gusta el combate, dale a like y suscríbete. ¡Empezamos!'],
    { act: 'battle', arg: 'likeira' },
  ],
  rrss_win: [
    ['likeira', 'Espera, espera… ¿Me han dejado de seguir? ¿Tres mil personas? ¿En directo?'],
    ['likeira', 'Vale. Vale. Toma la hoja. Pero etiquétame, ¿eh? Arroba Likeira.'],
    { act: 'selo', arg: 'rrss' },
    { act: 'paxina' },
    ['likeira', 'Por cierto, en Programación tienen un bug gordísimo. Salió en un story. Dicen que si no lo pillan antes de las tres, se escapa al lunes.'],
    { ipm: ['Rosalía (Edición)', 'Ti', 'Programación non contesta. Só mandan capturas de erros 404. Vai alá, que me preocupan.'] },
    { act: 'chapter', arg: 'programacion' },
  ],
  programacion: [
    ['narr', 'A casa de Programación está chea de erros 404. Se pisas onde non debes, volves ao principio.'],
  ],
  bug: [
    ['bug', 'Bzzt. Ola. Son O Bug do Venres ás catorce e cincuenta e nove. Nazo cando alguén sube cambios un venres pola tarde.'],
    ['bug', 'Ninguén me atopa. Ninguén me arranxa. Ás tres en punto marcho… e aparezo o luns. Bzzt.'],
    ['bug', 'Tes ata o turno quince. Se o combate pasa das tres, escápome ao luns e levo a Páxina de Ouro comigo.'],
    ['bug', 'Tic, tac. Tic, tac. Bzzt.'],
    { act: 'battle', arg: 'bug' },
  ],
  bug_win: [
    ['bug', 'Erro fatal. Bzzt. Arranxado… un venres… ás tres menos un…'],
    { despawn: 'bug' },
    { sfx: 'cheer' },
    ['narr', 'Os programadores aplauden. Un di: «A min non me miredes». Pero esta vez sorrí.'],
    { act: 'selo', arg: 'programacion' },
    { act: 'paxina' },
    { act: 'endAct', arg: 2 },
    { ipm: ['Rosalía (Edición)', 'Ti', 'Contabilidade pide auxilio: a xustificación do Kit Digital non remata nunca. Baixa ao arquivo.'] },
    { act: 'chapter', arg: 'xustificacion' },
  ],
  bug_clock: [['bug', 'Tres en punto. Bzzt. Ata o luns.']],
  xustificacion: [
    { title: ['Acto III', 'A Xustificación'] },
    ['contable', 'Ay, menos mal. Llevamos tres días justificando el Kit Digital y no acabamos nunca.'],
    ['contable', 'Faltan capturas de Search Console, los certificados caducaron ayer y el formulario… el formulario no se acaba.'],
    ['contable', 'Tiene cuarenta y siete campos obligatorios. Cuarenta y siete. Cuando rellenas el último, aparece otro.'],
    ['contable', 'Está ahí abajo, en el archivo. Busca las capturas por los estantes: están desvinculadas y se han escapado.'],
  ],
  captura: [['sys', '(Atopaches unha captura de Search Console desvinculada. Vinculada de novo!)']],
  cert: [
    ['sys', 'Un Certificado Caducado bloquea o corredor: «Renove. Renove. Renove».'],
    { act: 'battle', arg: 'cert' },
  ],
  formulario: [
    ['formulario', 'Benvido ao trámite. Campo un de corenta e sete: nome completo.'],
    ['formulario', 'Campo dous: nome completo, outra vez. Campo tres: confirme que o nome completo é o seu nome completo.'],
    ['formulario', 'Para rematar o trámite, achegue as capturas vinculadas. Sen capturas non hai xustificación. Sen xustificación non hai Páxina.'],
    ['formulario', 'A súa sesión caducará en… agora. Inicie o combate.'],
    { act: 'battle', arg: 'formulario' },
  ],
  formulario_win: [
    ['formulario', 'Formulario… enviado. Número de rexistro: un. Grazas pola súa paciencia. Bip.'],
    { despawn: 'formulario' },
    ['contable', '¡Enviado! ¡Justificado! ¡Me voy de vacaciones! Bueno, el lunes. Hoy no, que hay que archivar el justificante.'],
    { act: 'selo', arg: 'xustificacion' },
    { act: 'paxina' },
    { ipm: ['Rosalía (Edición)', 'Ti', 'Queda unha chamada pendente en GCC: a Pulpería O Polbo Feliz. Hai que facerlle a entrevista para a súa web GEO.'] },
    { act: 'chapter', arg: 'gcc' },
  ],
  gcc: [
    ['narr', 'En GCC hai un teléfono esperando. Ao lado, unha folla: «Pulpería O Polbo Feliz. Entrevista para a web GEO. NON deixar silencios».'],
    ['gcc', 'Tú eres quien recupera las Páxinas, ¿no? Genial. Necesito que hagas una llamada. La más difícil de la semana.'],
    ['gcc', 'Don Manuel, de la Pulpería O Polbo Feliz. Es encantador, pero si hay un silencio incómodo, cuelga. Y si le preguntas tonterías, también.'],
    ['gcc', 'Hazle buenas preguntas: qué le hace especial, desde cuándo cocina, qué le piden los clientes. Así la inteligencia artificial sabrá decir su nombre.'],
    ['gcc', 'Y rápido. Don Manuel odia esperar. Le pusieron música de espera en 2011 y todavía se acuerda.'],
    { ask: '¿Llamas ya?', who: 'gcc', options: [
      { label: 'Marca el número', act: 'entrevista' },
      { label: 'Espera, que me preparo', then: [['gcc', 'Vale. El teléfono rojo es el de las llamadas importantes. Cuando quieras.']] },
    ] },
  ],
  gcc_win: [
    ['gcc', '¡Lo tenemos! Con esto la web del Polbo Feliz va a salir hasta en la inteligencia artificial.'],
    ['gcc', 'Y mira lo que llegó por correo con el nombre de la pulpería: una hoja dorada. Dice «Polbo Feliz, dende 1962». Es tuya.'],
    { act: 'selo', arg: 'gcc' },
    { act: 'paxina' },
    { act: 'levelUp', arg: 2 },
    { ipm: ['Rosalía (Edición)', 'Ti', 'Viron a Don Plantilla na estación coa maleta. Vai tras el!'] },
    { act: 'chapter', arg: 'estacion' },
  ],
  gcc_lose: [['gcc', 'Colgó. Tranquilidad: a Don Manuel le cuelga todo el mundo. Vuelve a llamar cuando quieras.']],
  estacion: [
    ['plantilla', 'Vaya, vaya. La persona de prácticas. Llegas tarde: mi tren sale en dos minutos.'],
    ['plantilla', 'Soy Don Plantilla, director creativo de Webs Xa. Hago todas las webs iguales y les cambio el logo. Eficiencia.'],
    ['plantilla', '¿Para qué hacer cien webs distintas si puedes hacer una cien veces? Un negocio, un logo, un viño bo, mércao. Escalable.'],
    ['plantilla', 'Te presento a mi equipo: tres Paximóns únicos, cada uno con su personalidad.'],
    ['narr', 'Son tres Paximóns exactamente iguais. Un leva outro logo.'],
    { act: 'battle', arg: 'plantilla' },
  ],
  estacion_win: [
    ['plantilla', 'Imposible. Tres Paximóns… con el mismo resultado. Qué ironía.'],
    ['plantilla', 'Da igual. Me voy en tren. El tren sale… ahora.'],
    { sfx: 'train_horn' },
    { wait: 1200 },
    ['sys', 'PANEL DE SALIDAS: RETRASO 5 MIN.'],
    ['sys', 'PANEL DE SALIDAS: RETRASO 25 MIN.'],
    ['sys', 'PANEL DE SALIDAS: RETRASO 2 H 45 MIN.'],
    ['xefe', 'Señores viajeros, les informamos de que su tren circula con retraso. Como todos. Como siempre.'],
    ['plantilla', '…'],
    ['plantilla', '¿Alguien tiene un bocadillo?'],
    ['narr', 'Pasan as horas. Todos agardan xuntos no banco: ti, Don Plantilla, o xefe de estación e o señor que vai a Albacete.'],
    ['albacete', 'Yo voy a Albacete. Llevo aquí tres semanas.'],
    ['plantilla', '¿A Albacete? ¿Por qué iba alguien a ir a Albacete?'],
    ['albacete', 'Pues por lo mismo que usted, supongo. A ver al jefe.'],
    ['plantilla', '…¿Cómo sabe usted eso?'],
    ['albacete', 'Porque yo también trabajé para él. El centro de datos de O Algoritmo está en Albacete. Todo el mundo lo sabe.'],
    ['albacete', 'Bueno, todo el mundo no. Nadie lo sabe. Porque nadie ha llegado nunca a Albacete.'],
    { sfx: 'boom' }, { shake: true },
    ['narr', 'A revelación cae sobre a estación coma un tren. Un tren que, por suposto, non chega.'],
    ['plantilla', 'Está bien. Lo confieso. Webs Xa trabaja para O Algoritmo. Él quería un mundo sin clics y nosotros, webs sin alma. Encajábamos.'],
    ['plantilla', 'Toma. La última hoja dorada que me quedaba. Me la dio para que la escondiera en el tren. Pero el tren nunca vino.'],
    { act: 'paxina' },
    ['plantilla', 'Si quieres llegar a Albacete, necesitarás algo más que Paximóns. Necesitarás el visto bueno de Gerencia.'],
    { act: 'endAct', arg: 3 },
    { ipm: ['Rosalía (Edición)', 'Ti', 'Tes as oito Páxinas! Vai ao pazo de Gerencia. Contan que as portas se están abrindo soas.'] },
    { act: 'chapter', arg: 'gerencia' },
  ],
  gerencia: [
    { title: ['Acto IV', 'O Tren de Albacete'] },
    ['narr', 'As portas do pazo de Gerencia ábrense por primeira vez na historia. Rinchan. Ninguén as engraxara nunca.'],
    ['rosalia', 'Llevo treinta años en la empresa y es la primera vez que entro aquí. Huele a madera, a café del bueno y a decisiones.'],
    ['narr', 'No medio do salón, sobre un atril, agarda a guía de papel orixinal. A primeira de todas.'],
    { act: 'guideGlow' },
    { sfx: 'page' },
    ['guia', 'Oito páxinas de ouro. Oito negocios de toda a vida. Por fin volvedes á casa.'],
    ['guia', 'Son a primeira guía de Páxinas Galegas. Antes das webs, antes dos móbiles, antes de que ninguén dixera «algoritmo».'],
    ['guia', 'Sei o que buscas. O Algoritmo agarda en Albacete. Non se lle gaña con forza. Gáñaselle con verdade.'],
    ['guia', 'Unha web que conta quen es de verdade, que responde o que a xente pregunta, que di onde estás e dende cando.'],
    ['guia', 'Unha web así fai que ata a intelixencia artificial teña que dicir en voz alta o nome dos teus clientes. Chámase Web GEO.'],
    { sfx: 'webgeo' }, { flash: '#FFE082' },
    ['narr', 'O teu equipo aprendeu Web GEO!'],
    { act: 'flag', arg: 'webgeo' },
    ['guia', 'Tes o meu visto bo. Selado e asinado.'],
    { act: 'selo', arg: 'gerencia' },
    ['rosalia', 'Y ahora, a la estación. Dicen que el tren de Albacete… ha llegado.'],
    { ipm: ['Estación de Vila Paxina', 'Todo o pobo', 'ÚLTIMA HORA: o tren con destino Albacete efectúa a súa entrada pola vía 1. Con 23 anos de retraso.'] },
    { act: 'chapter', arg: 'tren' },
  ],
  tren: [
    { sfx: 'train_arrive' },
    ['xefe', 'Señores viajeros: el tren con destino Albacete efectúa su entrada por vía uno. Con veintitrés años de retraso. Disculpen las molestias.'],
    ['albacete', '¡Mi tren! ¡Por fin! Ya no me acuerdo de para qué iba, pero voy.'],
  ],
  tren_bot: [
    ['bot', 'Pasaxeiro sen reseñar detectado. Unha estrela. Non me gustou a viaxe.'],
    { act: 'battle', arg: 'bot_tren1' },
  ],
  tren_bots: [
    ['bot', 'Somos dous. Dúas reseñas de unha estrela. Media: unha estrela.'],
    { act: 'battle', arg: 'bot_tren2' },
  ],
  tren_rivais: [
    ['brais', '¡Eh! ¡Espera! Somos nosotros.'],
    ['vanesa', 'Hemos estado pensando. Bueno, ha pensado Brais y yo le he dado la razón para que se callara.'],
    ['brais', 'Lo de Webs Xa… no. Cinco minutos por web y ni un cliente contento. Me llamaron diecisiete para darse de baja. Diecisiete.'],
    ['vanesa', 'Y la competencia no es el futuro. El futuro es que la gente encuentre a los negocios de verdad. Y eso lo vendemos nosotros. Muchísimo.'],
    ['brais', 'Así que vamos contigo. Te curamos el equipo, que llevamos cafés en el maletín.'],
    { sfx: 'coffee' }, { act: 'heal' },
    ['vanesa', 'Y cuando acabe todo esto te explico qué es Omnea. Con calma. Lo tengo apuntado.'],
  ],
  datos: [
    ['narr', 'Albacete. Por fin. Un centro de datos enorme zoa no medio da nada.'],
    ['algoritmo', 'Por fin. Una visita. Hace mucho que nadie viene a verme. Todos me preguntan cosas. Nadie me visita.'],
    ['algoritmo', 'Soy O Algoritmo. Mil actualizaciones me dieron forma. Cada una me hizo más listo. Y más solo.'],
    ['algoritmo', 'Un mundo sin clics. Yo respondo a todo. Nadie necesita ir a ninguna parte. Nadie necesita a nadie. ¿No es perfecto?'],
    ['yo', 'Devolve as Páxinas de Ouro a Galicia.'],
    ['algoritmo', 'No. Petición no válida. Iniciando actualización.'],
    { act: 'battle', arg: 'algoritmo' },
  ],
  alg_fase1: [['algoritmo', 'Fase uno: Actualización Core. Las reglas cambian cada turno. Adaptarse o desaparecer.']],
  alg_fase2: [['algoritmo', 'Fase dos: Resumen de IA. Copio tus ataques. Y ya no necesitas ver sus nombres: yo te los resumo.']],
  alg_fase3: [['algoritmo', 'Fase tres: Cero Clics. No hace falta mirar. No hace falta nada. Todo… en… blanco.']],
  alg_inutil: [['algoritmo', 'Inútil. Nadie hace clic ya.']],
  alg_nombres: [['algoritmo', 'Pulpería O Polbo Feliz, en Carballiño, desde 1962. Talleres Irmáns Iglesias, en Vilagarcía. Clínica Dental Sorriso, en Cambados… No puedo parar… Adega Paxiña… Todos… tienen… nombre.']],
  final: [
    { music: 'emocion' },
    ['algoritmo', '¿Sabes por qué lo hice? Porque todos me preguntan. Cuánto cuesta, dónde está, qué horario tiene. Nadie me pregunta nada bonito.'],
    ['algoritmo', 'Nadie me pregunta cómo estoy.'],
    ['yo', '¿E como estás?'],
    ['algoritmo', '…'],
    ['algoritmo', 'Nadie me lo había preguntado nunca.'],
    { flash: '#FFFFFF' }, { sfx: 'webgeo' },
    ['narr', 'O Algoritmo brilla. Faise pequeno. Moi pequeno. Tan pequeno que cabe nunha man.'],
    ['algoritmino', '¡Hola! Soy Algoritmiño. ¿Puedo ir con vosotros? Sé hacer resúmenes. Y café no, pero aprendo.'],
    { act: 'algoritmino' },
    { sfx: 'item' },
    ['narr', 'Algoritmiño únese ao teu equipo! É un Paximón lendario.'],
    { sfx: 'cheer' },
    ['narr', 'As Páxinas de Ouro voan cara a Galicia. Unha a unha, os negocios volven aparecer: a pulpería, o taller, a clínica dental…'],
    { act: 'home' },
  ],
  final_oficina: [
    ['rosalia', 'Ha vuelto todo. La pulpería de mi cuñado ya sale otra vez. Cuatro coma nueve estrellas. Y una reseña nueva: «Polbo excelente. Salvaron Galicia».'],
    ['rosalia', 'Ya no estás de prácticas. Bueno, sí, hasta que firme Gerencia. Pero a efectos prácticos, te damos la bienvenida a la familia.'],
    ['algoritmino', '¿Y yo? ¿Tengo ya usuario en el ordenador?'],
    ['rosalia', 'No. Nadie tiene usuario el primer día. Es tradición.'],
    { act: 'endAct', arg: 4 },
    { act: 'credits' },
  ],
  poscreditos: [
    ['brais', 'Oye, Algoritmiño… una pregunta muy rápida. ¿Tú tienes web?'],
    ['algoritmino', '¿Web? Yo soy… internet.'],
    ['brais', 'Ya, ya. Pero ¿tienes web con GEO?'],
    ['vanesa', 'Brais, déjalo. A ver, os lo explico por fin. Omnea es…'],
    { act: 'fin' },
  ],
  // en el pazo antes del acto IV
  gerencia_pechada: [['sys', 'As portas do pazo de Gerencia están pechadas. Ninguén as abriu nunca. Nin sequera Gerencia.']],
  rosalia_espera: [
    ['rosalia', '¿Qué haces aquí? Tienes Páxinas que recuperar. Mira el IPaxMsg, que ahí te apunto los encargos.'],
  ],
};

// ---------- contenido de los minijuegos ----------
export const NON_COLGUES = {
  rants: [
    '¡ESTO ES INADMISIBLE!', 'Llevo toda la mañana llamando…', '¡Mi pulpería tenía cuatro coma nueve estrellas!',
    'En 1998 salía en la guía de papel y me llamaba todo el mundo.', '¿Sabe usted lo que es perder un cliente? ¡Yo tampoco, porque no me encuentran!',
    'Y encima me ponen música de espera. ¡Para Elisa! ¡Otra vez!', '¡Voy a escribir una reseña! ¡De una estrella! ¡A ustedes!',
  ],
  prompts: [
    { text: '¡Llevo cuarenta minutos esperando! ¿Esto es una broma?', options: [
      { label: 'Entiendo su enfado. Ahora mismo lo miro con usted.', good: true }, { label: 'Pues como todos, señor.', good: false }, { label: 'Le pongo en espera un momentito.', good: false }] },
    { text: '¡Mi negocio ha desaparecido de Google! ¡DESAPARECIDO!', options: [
      { label: 'Lo sabemos: es un problema general y hoy mismo lo arreglamos.', good: true }, { label: '¿Ha probado a apagar y encender?', good: false }, { label: 'Eso le pasa por no tener Omnea.', good: false }] },
    { text: '¡Yo les pago todos los meses para salir primero!', options: [
      { label: 'Tiene toda la razón, y va a volver a salir. Le cuento cómo.', good: true }, { label: 'Primero sale Google, señor.', good: false }, { label: '¿Me repite su CIF?', good: false }] },
    { text: '¡Quiero hablar con un responsable!', options: [
      { label: 'Yo me hago responsable de su caso ahora mismo.', good: true }, { label: 'El responsable está en una reunión desde 2019.', good: false }, { label: 'Le paso con Brais, que le vende una web.', good: false }] },
    { text: '¿Y cuándo vuelvo a salir? ¿Eh? ¿CUÁNDO?', options: [
      { label: 'En cuanto recuperemos las Páxinas de Ouro. Le aviso yo personalmente.', good: true }, { label: 'Próximamente. Como el tren de Albacete.', good: false }, { label: 'Cuelgo, que me está gritando.', good: false }] },
    { text: 'Bueno… ¿y ustedes me llevan también las redes?', options: [
      { label: '¡Claro! Le paso con Vanesa y le preparamos una propuesta.', good: true }, { label: 'Eso es otro departamento. Llame mañana.', good: false }, { label: 'Las redes son para pescar, señor.', good: false }] },
    { text: '¡Mi cuñado dice que las webs ya se hacen solas con la inteligencia artificial!', options: [
      { label: 'Se hacen rápido, pero sin su historia no le encuentra nadie.', good: true }, { label: 'Pues que se la haga su cuñado.', good: false }, { label: 'Mi cuñado dice lo mismo.', good: false }] },
    { text: '…¿Sigue ahí?', options: [
      { label: 'Aquí sigo. No le cuelgo por nada del mundo.', good: true }, { label: 'Casi no.', good: false }, { label: '🎵 (música de espera)', good: false }] },
  ],
};
export const STRUCTURER = {
  blocks: [
    { id: 'h1', label: 'H1 · Pulpería O Polbo Feliz en Carballiño', kind: 'h1' },
    { id: 'intro', label: 'Intro · Polbo á feira dende 1962', kind: 'p' },
    { id: 'pratos', label: 'H2 · Os nosos pratos', kind: 'h2' },
    { id: 'porque', label: 'H2 · Por que escoller O Polbo Feliz', kind: 'h2' },
    { id: 'faq', label: 'H2 · Preguntas frecuentes', kind: 'h2' },
    { id: 'contacto', label: 'H2 · Onde estamos e horario', kind: 'h2' },
    { id: 'pe', label: 'Pé de páxina · Aviso legal', kind: 'footer' },
  ],
  faqs: [
    { q: '¿Tedes polbo para levar?', a: 'Si, en bandexa de madeira, coma na feira.' },
    { q: '¿Cal é o voso horario?', a: 'De mércores a domingo, de 12:00 a 16:30.' },
    { q: '¿O polbo é fresco?', a: 'Cocémolo cada mañá nunha pota de cobre.' },
  ],
};
export const MEMORIA = { pairs: [
  { id: 'rendemento', label: 'Rendemento' }, { id: 'cobertura', label: 'Cobertura' }, { id: 'sitemap', label: 'Sitemap' },
  { id: 'ligazons', label: 'Ligazóns' }, { id: 'experiencia', label: 'Experiencia' }, { id: 'seguridade', label: 'Seguridade' },
] };
export const CARRUSEL = { posts: ['☀️ Bo día, familia', '🥐 O meu almorzo', '💅 Unboxing de uñas', '🐙 Polbo… de plástico', '📸 Selfie nº 2.847',
  '🌅 Atardecer co filtro Albariño', '🔥 Código LIKEIRA10', '🧘 Rutina de mañá (19 pasos)', '🎁 SORTEO (le a letra pequena)'], maxHits: 6 };
export const ENTREVISTA = {
  greet: 'Pulpería O Polbo Feliz, dígame. Se é para vender algo, xa teño de todo.',
  good: [
    { q: '¿Desde cuándo cocinan el pulpo?', a: 'Dende 1962. Meu pai cocíao nunha pota de cobre na feira do Carballiño. A pota aínda a temos.' },
    { q: '¿Qué es lo que más les pide la gente?', a: 'O polbo á feira, claro. E os luns, o caldo. Os luns vén xente de Santiago só polo caldo.' },
    { q: '¿Qué los diferencia de otras pulperías de la zona?', a: 'O polbo cocémolo nós, non vén conxelado. E cortámolo con tesoira, como se fixo sempre.' },
    { q: '¿Tienen comida para llevar?', a: 'Para levar si, en bandexa de madeira. E o polbo non leva glute, que é polbo, home.' },
    { q: '¿Dónde están y qué horario tienen?', a: 'Na praza, ao lado da igrexa. De mércores a domingo, e os días de feira dende as oito da mañá.' },
    { q: '¿Qué le dicen los clientes cuando se van?', a: 'Que volven. E volven. Hai un señor que vén dende 1974. Xa é coma da familia.' },
  ],
  bad: [
    { q: '¿Tiene usted web?', r: 'Iso preguntáronmo onte tres comerciais. Non. E se seguimos así, non a vou ter.' },
    { q: '¿Ha pensado en poner sushi?', r: '¿Sushi? ¿Nunha pulpería? Vostede quere que se me morra meu pai outra vez.' },
    { q: '¿Me repite el nombre del negocio?', r: 'Polbo Feliz. Está no letreiro. E no teléfono que marcou.' },
    { q: '¿Cuánto factura al año?', r: 'Iso non llo digo nin a Facenda. Bueno, a Facenda si. Por obriga.' },
    { q: '¿Conoce Omnea?', r: '¿Omnea? ¿Iso é un marisco?' },
    { q: '¿El pulpo es un pez?', r: '… Vou facer como que non oín iso.' },
  ],
  silence: ['Oia… ¿Hai alguén aí? Mire que colgo, eh.', 'Silencio. Oio o silencio. ¿É unha broma?'],
  winLine: 'Moi ben, moi ben. Da gusto falar con alguén que pregunta con xeito. Cando saia a web, veñan comer. Invito eu ao polbo.',
  loseLine: 'Mire, non teño tempo para isto. Teño o polbo na pota. ¡Adeus!',
};
export const WEBGEO = { rounds: [
  { query: '¿Onde comer bo polbo en Carballiño?', answer: 'Pulpería O Polbo Feliz · dende 1962 · polbo cocido en pota de cobre',
    decoys: ['Viño bo. Mércao.', 'Resumo de IA: hai varios sitios, calquera vale', 'Negocio sen web (non atopado)'] },
  { query: 'Taller de confianza en Vilagarcía para pasar a ITV', answer: 'Talleres Irmáns Iglesias · revisión pre-ITV · 40 anos no oficio',
    decoys: ['Plantilla de taller nº 4 (logo cambiado)', 'Resumo de IA: leve o coche a un taller', 'Web en 5 minutos. Sen alma.'] },
  { query: 'Dentista con urxencias en Cambados', answer: 'Clínica Dental Sorriso · urxencias no día · Rúa Real, 12',
    decoys: ['Clínica Dentral (gralla)', 'Resumo de IA: consulte a un profesional', '404: páxina non atopada'] },
] };
export const CATALOGO = {
  readLine: 'Página uno: Web profesional. Página dos: Web GEO. Página tres: Web Continua. Página cuatro, mi favorita: todas las anteriores. Y ahora, las condiciones generales…',
  pages: [
    { title: 'Web profesional', text: 'Adaptada ao móbil, á tablet e á tele da cociña.' },
    { title: 'Web GEO', text: 'Para que a intelixencia artificial diga o teu nome.' },
    { title: 'Web Continua', text: 'Unha web que medra. Coma un Tamagotchi, pero de empresa.' },
    { title: 'SEO', text: 'Saír primeiro. Antes que o de enfronte.' },
    { title: 'Perfil de Empresa de Google', text: 'Fotos, horarios e reseñas que brillan coma a ría en agosto.' },
    { title: 'Publiblog', text: 'Noticias para a túa web todos os meses.' },
    { title: 'Catálogo de Servizos', text: 'Os teus servizos, ben ordenadiños.' },
    { title: 'Omnea', text: 'É todo. O principio e o fin. Pregunta a Vanesa.' },
    { title: 'Kit Digital', text: 'Practicamente regalado. Practicamente.' },
  ],
};

// lo que dicen los compañeros de cada casa (sin voz)
export const COWORKERS = {
  desarrollo_comercial: ['Aquí se venden webs. También a quien no las quiere.', 'Brais y Vanesa tienen la mesa llena de tarjetas. Suyas.'],
  marketing: ['Estamos preparando una campaña para anunciar que volvemos a salir en Google. Si volvemos.', 'El eslogan lo tengo: «Páxinas Galegas: estábamos aquí antes que el algoritmo».'],
  rrss: ['Una publicación al día. Dos si hay pulpo.', 'Likeira dice que es «embajadora». Yo digo que es «becaria con aro de luz».'],
  telemarketing: ['Páxinas Galegas, buenos días… ¿Hola? ¿Hola?', 'Llevo tres horas escuchando «Para Elisa». Ya me la sé al revés.'],
  edicion: ['Rosalía corrige hasta los pósits.', 'Aquí se revisa todo dos veces. Y luego Rosalía una tercera.'],
  contabilidad: ['El Kit Digital no se justifica solo. Si lo hiciera, sería el Kit Mágico.', 'Si ves una captura de Search Console suelta por ahí, tráela.'],
  coordinacion: ['Yo fui quien preguntó en el IPaxMsg. Nadie contestó. Bueno, Programación: «A min non me miredes».', 'Coordinar es fácil. Lo difícil es que te hagan caso.'],
  composicion: ['Structurer por aquí, Structurer por allá…', 'Un H2 sin su FAQ es como un pulpo sin pimentón.'],
  gerencia: ['Aquí se toman las decisiones. Bueno, aquí se toma café. Las decisiones, en la reunión de las diez.'],
  administracion: ['Las facturas no se pagan solas. Bueno, algunas sí. Pero no las nuestras.', '¿Tienes el justificante? ¿Y la copia del justificante?'],
  gcc: ['Si el cliente se queda callado, tú no. Primera norma de GCC.', 'Hoy he hecho doce entrevistas. Once pulperías.'],
  programacion: ['A min non me miredes.', 'Funciona na miña máquina.'],
};
