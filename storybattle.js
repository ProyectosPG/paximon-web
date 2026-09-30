// Reglas especiales de los combates del modo historia. La app (combate local por equipos) llama a
// estos ganchos; B son las herramientas que presta la app (texto, voz, sonido, minijuegos…):
//   start(B, m, L)                     al empezar
//   beforeTurn(B, m, L, who)           antes de que alguien elija; { skip: true } pierde el turno
//   move(B, m, L, who, mv)             ajusta el movimiento: { mv, opts } (opts van a resolveLocal)
//   after(B, m, L, who, mv, events)    después de resolverlo
//   switched(B, m, L, side)            ha entrado otro Paximón de ese lado
//   ai(B, m, L, list)                  movimiento del rival (o null para la IA normal)
//   labels(B, m, L)                    'errata' | 'hidden' | null: cómo se ven tus botones
//   actions(B, m, L)                   botones extra: [{ id, label, meta, run }]
//   end(B, m, L)                       al acabar (limpiar el campo)
// L es el estado del combate local (S.local): equipos, índice de cada lado y lo que guarde la regla.
import { SCRIPTS } from './storydata.js';

const line = (id) => SCRIPTS[id]?.[0];

// tipos al azar (Actualización Core)
function shuffledChart(types) {
  const c = {};
  for (const a of types) for (const d of types) {
    const r = Math.random();
    c[`${a}>${d}`] = r < 0.3 ? 1.5 : r < 0.55 ? 0.67 : 1;
  }
  return c;
}

export const RULES = {
  // Telemarketing: la música de espera ya la maneja el motor (efecto hold); aquí solo la ambientación
  hold: {
    async start(B) { await B.info('📞 Loli pone el manos libres. De fondo suena «Para Elisa» en bucle.', 'ring'); },
  },

  // Brais y Vanesa a la vez: el que no está en el campo también «ayuda»
  tagteam: {
    async after(B, m, L, who) {
      if (who !== 'p2' || m.status !== 'active') return;
      const partner = L.teams.p2.find(f => f !== m.state.p2 && f.hp > 0);
      if (!partner || Math.random() > 0.35) return;
      const me = m.state.p2;
      if (me.atk_stage >= 3) return;
      me.atk_stage += 1;
      const quip = partner.slug === 'omneina' ? '¡Y con Omnea, más!' : '¡Venta cruzada!';
      await B.info(`${partner.name} grita desde la banda: «${quip}» (+1 ATQ a ${me.name})`, 'buff');
    },
  },

  // Cambados: cada tres turnos tuyos, una cata; si la fallas, se te sube a la cabeza
  cata: {
    async beforeTurn(B, m, L, who) {
      if (who !== 'p1') return;
      L.cataTurn = (L.cataTurn || 0) + 1;
      if (L.cataTurn % 3 !== 2) return;
      await B.info('🍷 ¡Hora de la cata! El Enólogo Escuro te sirve una cunca.', 'clink');
      const score = await B.cata(L.drunk || 0);
      const me = m.state.p1;
      if (score >= 0.6) {
        const heal = Math.round(me.max_hp * 0.15);
        me.hp = Math.min(me.max_hp, me.hp + heal);
        if (me.atk_stage < 3) me.atk_stage += 1;
        await B.info(`¡Cata perfecta! ${me.name} recupera ${heal} PV y sube el ataque.`, 'heal');
      } else if (score < 0.35) {
        L.drunk = Math.min(4, (L.drunk || 0) + 1);
        B.setDrunk(L.drunk);
        const foe = m.state.p2, heal = foe.hp > 0 ? Math.round(foe.max_hp * 0.1) : 0;
        foe.hp = Math.min(foe.max_hp, foe.hp + heal);
        await B.info(`¡Cata desastrosa! Te mareas un poco (precisión −${8 * L.drunk} %)${heal ? ` y el rival se ríe y recupera ${heal} PV` : ''}.`, 'debuff');
      } else await B.info('Una cata normalita. «Notas de… normal», dice el Enólogo.', 'clink');
      B.render();
    },
    move(B, m, L, who, mv) {
      // mareado fallas más (Cata escura sube el mareo desde el motor: fighter.drunk)
      const drunk = Math.max(L.drunk || 0, m.state.p1.drunk || 0);
      if (who === 'p1' && drunk && mv.power > 0) return { mv: { ...mv, accuracy: Math.max(40, (mv.accuracy ?? 100) - 8 * drunk) } };
      return null;
    },
    end(B) { B.setDrunk(0); },
  },

  // Edición: las grallas (el motor cuenta los turnos con fighter.errata; aquí nada más)
  errata: {},

  // RRSS: los golpes dan likes y cada 100 likes, +1 de ataque; el carrusel infinito pega una vez por publicación
  likes: {
    start(B, m, L) { L.likes = { p1: 0, p2: 0 }; L.likeLv = { p1: 0, p2: 0 }; B.hud(this.hud(L)); },
    hud(L) { return `<span class="likes">❤ ${L.likes.p1}</span><span class="likes foe">❤ ${L.likes.p2}</span>`; },
    async move(B, m, L, who, mv) {
      if (!mv.effect?.carrusel) return null;
      if (who === 'p2') {
        const score = await B.carrusel();
        const hits = B.carruselHits() || Math.max(1, Math.round((1 - score) * 5) + 1);
        return { mv, opts: { extraMult: hits, hits } };
      }
      return { mv, opts: { extraMult: 3, hits: 3 } };
    },
    async after(B, m, L, who, mv, events) {
      for (const ev of events) if (ev.type === 'hit' && ev.actor === who) {
        const gain = Math.round(ev.damage * 2 + (Number(ev.skill) >= 0.9 ? 30 : 0));
        L.likes[who] += gain;
        B.sfx('like');
      }
      for (const side of ['p1', 'p2']) {
        while (L.likes[side] >= (L.likeLv[side] + 1) * 100) {
          L.likeLv[side]++;
          const f = m.state[side];
          if (f.atk_stage < 3) { f.atk_stage++; await B.info(`¡${f.name} se ha hecho viral! ${L.likes[side]} likes: +1 ATQ.`, 'buff'); }
        }
      }
      B.hud(this.hud(L));
    },
  },

  // Programación: si el combate pasa de las 15:00, el Bug se escapa al lunes
  clock: {
    start(B, m, L) { L.clock = 0; B.hud(this.hud(L)); },
    hud(L) { const min = 45 + L.clock; return `<span class="clock ${min >= 57 ? 'late' : ''}">🕒 ${min >= 60 ? '15:00' : `14:${String(min).padStart(2, '0')}`}</span>`; },
    async beforeTurn(B, m, L, who) {
      if (who !== 'p1') return;
      L.clock++;
      B.sfx('tick');
      B.hud(this.hud(L));
      if (L.clock > (L.cfg.turnLimit || 15)) { await B.info('🕒 Son las 15:00. O Bug do Venres estírase… e desaparece ata o luns.', 'glitch'); B.escape(); return { skip: true }; }
      if (L.clock === (L.cfg.turnLimit || 15) - 2) await B.info('🕒 ¡Faltan dos minutos para las tres!', 'tick');
    },
  },

  // Contabilidad: 47 campos obligatorios. Los golpes solo cubren un campo; las capturas, muchos
  form: {
    async start(B, m, L) {
      const n = (B.story().flags?.capturas || []).length;
      B.hud(this.hud(m));
      if (n) {
        const f = m.state.p2, fill = n * 3;
        f.hp = Math.max(1, f.hp - fill * 10);
        await B.info(`📎 Traes ${n} ${n === 1 ? 'captura vinculada' : 'capturas vinculadas'}: ${fill} campos cubiertos de golpe.`, 'paper');
        B.render(); B.hud(this.hud(m));
      }
    },
    hud(m) { const left = Math.ceil(m.state.p2.hp / 10); return `<span class="fields">📋 ${left} campos</span>`; },
    move(B, m, L, who, mv) {
      if (who === 'p1' && mv.power > 0) return { mv, opts: { fixedDamage: 10, note: 'Campo obligatorio: solo cubres un campo.' } };
      return null;
    },
    after(B, m) { B.hud(this.hud(m)); },
    actions(B, m, L) {
      return [{ id: 'pegar', label: '📎 Pegar capturas', meta: 'Memoria · gasta el turno', run: async () => {
        const score = await B.memoria();
        const pairs = B.memoriaPairs() ?? Math.round(score * 6);
        const dmg = pairs * 30;
        await B.hitFoe(dmg, pairs ? `Pegas ${pairs} ${pairs === 1 ? 'captura' : 'capturas'}: ${pairs * 3} campos cubiertos.` : 'No pegas ninguna captura. El formulario bosteza.');
        B.hud(this.hud(m));
      } }];
    },
  },

  // O Algoritmo: tres fases (cada Paximón de su equipo es una)
  algoritmo: {
    phase(L) { return L.idx.p2; },
    async start(B, m, L) { await B.voice(line('alg_fase1')); },
    async beforeTurn(B, m, L, who) {
      const ph = this.phase(L);
      if (ph === 0 && who === 'p1') {
        L.chart = shuffledChart(B.types());
        B.sfx('modem');
        await B.info('🔄 Actualización Core: las eficacias de los tipos han cambiado.', null);
      }
      if (ph === 2 && who === 'p1') {
        L.white = Math.min(0.78, (L.white || 0) + 0.13);
        B.whiteout(L.white);
      }
    },
    move(B, m, L, who, mv) {
      const ph = this.phase(L);
      if (ph === 0) return { mv, opts: { chart: L.chart } };
      if (ph === 2 && who === 'p1' && mv.power > 0 && mv.id !== 'web_geo') return { mv, opts: { immune: true, note: 'Cero clics: nadie ve tu ataque. Solo la Web GEO puede llegar hasta él.' } };
      return null;
    },
    async after(B, m, L, who, mv) {
      const ph = this.phase(L);
      if (who === 'p1' && mv.power > 0 && !mv.universal) L.lastMove = mv.id;
      if (who === 'p1' && ph === 2 && mv.power > 0 && mv.id !== 'web_geo' && !L.saidUseless) { L.saidUseless = true; await B.voice(line('alg_inutil')); }
      if (who === 'p1' && mv.id === 'web_geo' && ph === 2) { B.whiteout(0); await B.voice(line('alg_nombres')); }
    },
    async switched(B, m, L, side) {
      if (side !== 'p2') return;
      const ph = this.phase(L);
      B.sfx('boom'); B.shake();
      if (ph === 1) await B.voice(line('alg_fase2'));
      if (ph === 2) { B.sfx('whiteout'); await B.voice(line('alg_fase3')); }
    },
    ai(B, m, L) {
      if (this.phase(L) === 1) return B.move(L.lastMove) || B.move('resumo_ia');
      return null;
    },
    labels(B, m, L) { return this.phase(L) === 1 ? 'hidden' : null; },
    end(B) { B.whiteout(0); },
  },
};

// cambia letras de un nombre (A Errata): «Foguete» -> «Fogete», «Conxuro» -> «Cojuro»
export function gralla(name) {
  const s = [...name];
  if (s.length < 4) return name;
  const i = 1 + Math.floor(Math.random() * (s.length - 2));
  const r = Math.random();
  if (r < 0.4) s.splice(i, 1);
  else if (r < 0.75) [s[i], s[i + 1]] = [s[i + 1] || s[i], s[i]];
  else s[i] = 'aeiourlnx'[Math.floor(Math.random() * 9)];
  return s.join('');
}
