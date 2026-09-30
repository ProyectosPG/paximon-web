// Combates contra vecinos (y el modo demo): se juegan en el navegador con las mismas reglas que
// paximon.resolve_turn en el servidor (daño, tipos, STAB, críticos, guardia, niveles, chakra).

export const stageMult = (s) => (s >= 0 ? (2 + s) / 2 : 2 / (2 - s));

export function fighter(c, chakra = 4) {
  return {
    char_id: c.id, slug: c.slug, name: c.name, type: c.type, hp: c.stats.hp, max_hp: c.stats.hp,
    atk: c.stats.atk, def: c.stats.def, spd: c.stats.spd, atk_stage: 0, def_stage: 0,
    chakra, max_chakra: c.stats.chakra ?? 10, guard: false,
  };
}

// Resuelve un movimiento. a = habilidad del atacante (0..1), d = la del defensor, kind = 'duel' | 'dodge' | null.
// Modifica match.state y devuelve los eventos (mismo formato que match_log.event).
// Modo historia: extraMult (p. ej. golpes del carrusel), hits (cuántos), immune (no hace daño),
// fixedDamage (daño fijo) y los efectos hold, errata, drunk, reset y webgeo de los movimientos.
export function resolveLocal(match, who, mv, { a = 0.5, d = 0, kind = null, chart = {}, charType = null, extraMult = 1, hits = 0, immune = false, fixedDamage = null } = {}) {
  const other = who === 'p1' ? 'p2' : 'p1';
  const me = match.state[who], foe = match.state[other];
  const events = [];
  a = Math.max(0, Math.min(1, a ?? 0.5)); d = Math.max(0, Math.min(1, d ?? 0));
  let mult = 1, forceCrit = false, extra = 0, dodged = false;
  switch (mv.minigame) {
    case 'mash_duel': mult = (0.7 + 0.6 * a) * (1 - 0.3 * d); break;
    case 'timing': mult = 0.8 + 0.4 * a; forceCrit = a >= 0.92; break;
    case 'sequence': case 'rhythm': mult = 0.7 + 0.6 * a; break;
    case 'charge': mult = a <= 0 ? 0.5 : 0.6 + 0.7 * a; break;
    case 'aim': mult = 0.8 + 0.4 * a; forceCrit = a >= 0.9; break;
    case 'simon': extra = a >= 0.66 ? 1 : a < 0.34 ? -1 : 0; break;
    case 'webgeo': mult = 0.6 + 0.8 * a; forceCrit = a >= 0.99; break;
    default: mult = 1;
  }
  mult *= extraMult;
  if (kind === 'dodge' && d >= 1) { dodged = true; mult *= 0.67; }
  const base = { actor: who, move: mv.id, move_name: mv.name };
  if (Math.random() * 100 >= (mv.accuracy ?? 100)) {
    events.push({ type: 'miss', ...base });
  } else {
    const eff = mv.effect || {};
    if (mv.power > 0) {
      const e = mv.type ? (chart[`${mv.type}>${foe.type}`] ?? 1) : 1;
      const stab = mv.type && mv.type === (charType || me.type) ? 1.25 : 1;
      const crit = forceCrit || Math.random() < 0.0625 ? 1.5 : 1;
      const rnd = 0.85 + Math.random() * 0.15;
      const atk = me.atk * stageMult(me.atk_stage), def = foe.def * stageMult(foe.def_stage);
      let dmg = Math.max(1, Math.floor((Math.floor(mv.power * atk / def * 0.5) + 2) * e * stab * crit * rnd * mult));
      if (fixedDamage != null) dmg = fixedDamage;
      if (immune) dmg = 0;
      let guarded = false;
      if (foe.guard && dmg > 0) { dmg = Math.max(1, Math.ceil(dmg / 2)); guarded = true; foe.guard = false; }
      foe.hp = Math.max(0, foe.hp - dmg);
      events.push({ type: 'hit', ...base, damage: dmg, effectiveness: immune ? 1 : e, crit: crit > 1 && !immune, guarded, dodged, skill: Math.round(a * 100) / 100, target_hp: foe.hp, hits: hits || undefined });
    }
    if (eff.hold && foe.hp > 0) { foe.hold = eff.hold; events.push({ type: 'hold', ...base, target: other }); }
    if (eff.errata && foe.hp > 0) { foe.errata = eff.errata; events.push({ type: 'errata', ...base, target: other }); }
    if (eff.drunk && foe.hp > 0) { foe.drunk = Math.min(4, (foe.drunk || 0) + eff.drunk); events.push({ type: 'drunk', ...base, target: other }); }
    if (eff.reset && (foe.atk_stage > 0 || foe.def_stage > 0)) { foe.atk_stage = Math.min(0, foe.atk_stage); foe.def_stage = Math.min(0, foe.def_stage); events.push({ type: 'reset', ...base, target: other }); }
    if (eff.heal) {
      const heal = Math.floor(me.max_hp * eff.heal / 100 * (mv.minigame === 'timing' ? 0.7 + 0.6 * a : 1));
      me.hp = Math.min(me.max_hp, me.hp + heal);
      events.push({ type: 'heal', ...base, amount: heal, hp: me.hp });
    }
    if (eff.buff) {
      const st = eff.buff.stat, stages = Math.max(1, (eff.buff.stages || 1) + extra), cur = me[st + '_stage'];
      me[st + '_stage'] = Math.max(-3, Math.min(3, cur + stages));
      events.push({ type: 'buff', ...base, target: who, stat: st, stages: me[st + '_stage'] - cur });
    }
    if (eff.debuff) {
      const st = eff.debuff.stat, stages = Math.min(-1, (eff.debuff.stages || -1) - extra), cur = foe[st + '_stage'];
      foe[st + '_stage'] = Math.max(-3, Math.min(3, cur + stages));
      events.push({ type: 'debuff', ...base, target: other, stat: st, stages: foe[st + '_stage'] - cur });
    }
    if (eff.chakra) {
      let gain = eff.chakra;
      if (mv.minigame === 'roulette') gain = 2 + Math.round(a * 4);
      gain = Math.max(0, Math.min(me.max_chakra - me.chakra, gain));
      me.chakra += gain;
      events.push({ type: 'chakra', ...base, amount: gain, chakra: me.chakra });
    }
    if (eff.guard) { me.guard = true; events.push({ type: 'guard', ...base }); }
  }
  if (foe.hp <= 0) {
    match.status = 'finished'; match.winner = who;
    events.push({ type: 'ko', actor: who, winner: who, loser: other });
  } else {
    foe.chakra = Math.min(foe.max_chakra, foe.chakra + 2);
    match.current_player = other;
  }
  match.turn = (match.turn || 1) + 1;
  return events;
}

// IA sencilla: pega fuerte cuando puede, se cura con poca vida, se guarda si el rival va cargado
export function aiPick(me, foe, moves, chart = {}) {
  const usable = moves.filter(m => m && (m.cost || 0) <= me.chakra);
  const score = (m) => {
    let s = Math.random() * 12;
    const e = m.effect || {};
    if (m.power) {
      const eff = m.type ? (chart[`${m.type}>${foe.type}`] ?? 1) : 1;
      s += (m.power * eff * (m.type === me.type ? 1.25 : 1)) / 3;
      if (foe.hp < foe.max_hp * 0.25) s += 20;
    }
    if (e.heal) s += me.hp < me.max_hp * 0.4 ? 45 : -25;
    if (e.buff) s += me[e.buff.stat + '_stage'] < 2 ? 10 : -30;
    if (e.debuff) s += foe[e.debuff.stat + '_stage'] > -2 ? 8 : -30;
    if (m.id === 'concentrar') s += me.chakra < 3 ? 38 : me.chakra < 6 ? 6 : -30;
    if (e.guard) s += foe.chakra >= 6 ? 20 : -12;
    // movimientos de los rivales de la historia
    if (e.hold) s += foe.hold ? -40 : 22;
    if (e.errata) s += foe.errata ? -10 : 12;
    if (e.reset) s += foe.atk_stage > 0 || foe.def_stage > 0 ? 30 : -35;
    if (e.carrusel) s += 14;
    return s;
  };
  return usable.sort((x, y) => score(y) - score(x))[0] || moves.find(m => m?.id === 'concentrar');
}
