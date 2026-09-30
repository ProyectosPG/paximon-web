// Motor del mundo: mapas por casillas, movimiento al estilo Pokémon (casilla a casilla,
// girar sin moverse con un toque), cámara que sigue al jugador, puertas y salidas a otros
// mapas con fundido, vecinos que pasean o te persiguen, diálogos con opciones, clic para ir
// a un sitio y el resto de jugadores moviéndose en tiempo real.
// No sabe nada de Supabase: la app le pasa las posiciones y recibe callbacks.
import { T } from './townart.js';
import { paintGround, paintObject, paintTrain, SOLID_TILES } from './worldart.js';
import { buildMap, SALES_REPLIES } from './townmap.js';
import { avatarSheet, DIRS, AW, AH } from './avatar.js';

const STEP_MS = 210, RUN_MS = 120, NPC_MS = 300, NPC_RUN_MS = 190;
const VEC = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
const SIDE = { up: ['left', 'right'], down: ['left', 'right'], left: ['up', 'down'], right: ['up', 'down'] };
const KEYS = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
const ACTION = new Set(['Space', 'Enter', 'NumpadEnter', 'KeyE', 'KeyZ']);
const FONT = '"Press Start 2P", monospace';
const k = (x, y) => x + ',' + y;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const dirTowards = (from, to) => (Math.abs(to.x - from.x) > Math.abs(to.y - from.y) ? (to.x > from.x ? 'right' : 'left') : (to.y > from.y ? 'down' : 'up'));

export class Town {
  // opts: {wrap, dialog, depts, quests, story, typeColors, onPortal(p), onPlayer(id), onInteract(o), onAction(action, npc),
  //        onMap(mapId, pos), onStep(x,y,dir,run), onIdle(x,y,dir), ledRows(o), onTrain(), isBlocked(),
  //        onLine(entry|null) (empieza/acaba una línea de diálogo: voces), onTalk(npc) -> true si la historia se encarga,
  //        onTrap(trap) (pisar una casilla trampa, p. ej. un error 404), npcImage(pax) -> canvas de un Paximón}
  constructor(opts) {
    this.opts = opts;
    this.wrap = opts.wrap;
    this.ctx = { depts: opts.depts || [], quests: opts.quests || {}, story: opts.story || {} };
    this.groundCache = new Map();
    this.spriteCache = new Map();
    this.remotes = new Map();
    this.bubbles = new Map();
    this.held = [];
    this.path = [];
    this.pending = null;
    this.run = false;
    this.active = false;
    this.dialog = null;
    this.fade = null;
    this.drunk = 0; this.nextHip = 0;
    this.me = { id: null, x: 0, y: 0, px: 0, py: 0, dir: 'down', moving: false, t: 0, turnUntil: 0, sheet: null };
    this.lastMoveAt = 0; this.idleSent = true;
    this.cv = document.createElement('canvas');
    this.cv.className = 'town-canvas';
    this.cv.setAttribute('aria-label', 'Pueblo: muévete con las flechas');
    this.wrap.prepend(this.cv);
    this.ctx2 = this.cv.getContext('2d');
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onBlur = () => { this.held = []; this.run = false; };
    this.onPointer = this.onPointer.bind(this);
    this.onHover = this.onHover.bind(this);
    this.onResize = () => this.resize();
    this.frame = this.frame.bind(this);
    const box = this.opts.dialog;
    if (box) {
      if (!box.querySelector('.opts')) { const o = document.createElement('div'); o.className = 'opts'; box.appendChild(o); }
      box.addEventListener('pointerdown', (e) => { if (e.target.closest('.opt')) return; e.preventDefault(); this.advanceDialog(false); });
    }
    const sh = document.createElement('canvas'); sh.width = 12; sh.height = 4;
    const sc = sh.getContext('2d'); sc.fillStyle = 'rgba(20,30,20,.28)';
    sc.beginPath(); sc.ellipse(6, 2, 6, 2, 0, 0, Math.PI * 2); sc.fill();
    this.shadow = sh;
    this.load(opts.map || 'vila');
  }

  // ---------- mapas ----------
  paint(o) {
    const key = [o.kind, o.type, o.variant, o.variant2, o.state, o.seed, o.color, o.w, o.h, o.door, o.owner, o.short].join('|');
    let s = this.spriteCache.get(key);
    if (!s) {
      const r = paintObject(o, { typeColors: this.opts.typeColors });
      if (!r) return null;
      s = { cv: r.pix.toCanvas(), led: r.led || null };
      this.spriteCache.set(key, s);
    }
    return s;
  }
  load(id, pos = null) {
    const map = buildMap(id, this.ctx);
    const sameMap = this.mapId === map.id;
    this.map = map; this.mapId = map.id;
    const { W, H, ground, objects, npcs } = map;
    let g = this.groundCache.get(map.id);
    if (!g) { g = [paintGround(map, 0).toCanvas(), paintGround(map, 1).toCanvas()]; this.groundCache.set(map.id, g); }
    this.ground = g;
    this.W = W; this.H = H;
    this.solid = ground.map(row => row.map(t => SOLID_TILES.has(t)));
    this.portals = new Map(); this.reads = new Map(); this.things = new Map(); this.counters = new Set();
    this.sprites = []; this.overhead = []; this.buildings = []; this.labeled = [];
    this.warps = new Map((map.warps || []).map(w => [k(w.x, w.y), w.to]));
    const each = (o, fn) => { for (let j = 0; j < o.h; j++) for (let i = 0; i < o.w; i++) fn(o.x + i, o.y + j); };
    for (const o of objects) {
      const s = this.paint(o);
      if (!s) continue;
      const spr = { o, cv: s.cv, led: s.led, x: o.x * T + (o.dx || 0), y: (o.y + o.h) * T - s.cv.height - (o.lift || 0), base: (o.y + o.h) * T };
      (o.overhead ? this.overhead : this.sprites).push(spr);
      if (o.solid) each(o, (x, y) => { if (this.solid[y]) this.solid[y][x] = true; });
      if (o.portal) for (const dc of o.doors) this.portals.set(k(o.x + dc, o.y + o.h - 1), { ...o.portal, label: o.label, x: o.x + dc, y: o.y + o.h - 1 });
      if (o.kind === 'building') this.buildings.push(spr);
      if (o.read) each(o, (x, y) => this.reads.set(k(x, y), o));
      if (o.interact) each(o, (x, y) => this.things.set(k(x, y), spr));
      if (o.counter) each(o, (x, y) => this.counters.add(k(x, y)));
      if (o.label) this.labeled.push(spr);
    }
    this.sprites.sort((a, b) => a.base - b.base || a.x - b.x);
    const now = performance.now();
    this.npcs = npcs.map(n => this.makeNpc(n, now));
    this.trains = (map.trains || []).map(tr => ({ ...tr, active: false, next: now + (tr.first ?? tr.every), x: 0, cv: null }));
    this.traps = new Map((map.traps || []).map(t => [k(t.x, t.y), t]));
    // al rehacer el mismo mapa (cambia la historia o una misión) los demás jugadores se quedan
    if (!sameMap) this.remotes.clear();
    this.bubbles.clear();
    this.place(pos);
  }
  makeNpc(n, now = performance.now()) {
    return {
      ...n, px: n.x * T, py: n.y * T, baseDir: n.dir, moving: false, t: 0, route: [], busy: false, chaseUntil: 0,
      sheet: n.pax ? null : avatarSheet(n.look, n.shirt, n.extras), img: n.pax ? this.opts.npcImage?.(n.pax) || null : null,
      next: now + rand(800, 3500), chatNext: now + rand(2500, 9000),
    };
  }
  // ---------- guion (escenas de la historia) ----------
  addNpc(def) {
    this.removeNpc(def.id);
    const n = this.makeNpc(def);
    n.next = Infinity;   // quieto hasta que el guion lo mueva
    this.npcs.push(n);
    return n;
  }
  removeNpc(id) { this.npcs = this.npcs.filter(n => n.id !== id); this.bubbles.delete('npc:' + id); }
  setNpcMark(id, on) { const n = this.npcById(id); if (n) n.mark = !!on; }
  // lleva a un vecino por una lista de casillas (en línea recta entre ellas); se cumple al llegar
  walkNpc(id, points, ms = NPC_MS) {
    const n = this.npcById(id);
    if (!n) return Promise.resolve();
    n.busy = true; n.route = [];
    const steps = [];
    let x = n.x, y = n.y;
    for (const [tx, ty] of points) {
      while (x !== tx) { const d = tx > x ? 'right' : 'left'; steps.push(d); x += VEC[d][0]; }
      while (y !== ty) { const d = ty > y ? 'down' : 'up'; steps.push(d); y += VEC[d][1]; }
    }
    return new Promise((resolve) => {
      const t0 = performance.now();
      const tick = () => {
        if (!this.npcs.includes(n) || performance.now() - t0 > 20000) return resolve();
        if (n.moving) return setTimeout(tick, 30);
        const d = steps.shift();
        if (!d) { n.busy = false; n.next = Infinity; return resolve(); }
        n.dir = d;
        const [dx, dy] = VEC[d];
        // en escena el vecino pasa aunque haya alguien (salvo tú, que te apartas)
        if (this.meAt(n.x + dx, n.y + dy)) { steps.unshift(d); return setTimeout(tick, 120); }
        Object.assign(n, { moving: true, t: 0, fx: n.x, fy: n.y, tx: n.x + dx, ty: n.y + dy, dur: ms, odd: !n.odd });
        setTimeout(tick, 30);
      };
      tick();
    });
  }
  faceNpc(id, dir) { const n = this.npcById(id); if (n) { n.dir = dir === 'me' ? dirTowards(n, this.me) : dir; n.baseDir = n.dir; } }
  faceMe(dir) { if (VEC[dir]) this.me.dir = dir; }
  // tu personaje anda solo (escenas): se cumple al llegar o si no hay camino
  walkMe(x, y) {
    return new Promise((resolve) => {
      if (this.me.x === x && this.me.y === y && !this.me.moving) return resolve();
      const done = () => { clearTimeout(t); this.scripted = false; resolve(); };
      const t = setTimeout(done, 12000);
      this.scripted = true;
      this.walkTo([[x, y]], done);
      if (!this.path.length && !this.pending) done();
    });
  }
  // sacudir o dar un destello a la pantalla (golpes de efecto en las escenas)
  shake(ms = 450) { this.cv.classList.remove('shake'); void this.cv.offsetWidth; this.cv.classList.add('shake'); setTimeout(() => this.cv.classList.remove('shake'), ms); }
  flash(color = '#FFFFFF', ms = 700) {
    const f = document.createElement('div');
    f.className = 'town-flash'; f.style.background = color;
    this.wrap.appendChild(f);
    setTimeout(() => f.remove(), ms);
  }
  place(pos) {
    const p = pos && Number.isInteger(pos.x) && this.walkable(pos.x, pos.y) ? pos : this.map.spawn;
    Object.assign(this.me, { x: p.x, y: p.y, px: p.x * T, py: p.y * T, dir: (pos && pos.dir) || p.dir || 'down', moving: false, t: 0 });
    this.path = []; this.pending = null; this.held = [];
    this.lastMoveAt = 0; this.idleSent = true;
  }
  // cambia el contexto (p. ej. el resultado de una misión) y rehace el mapa actual sin mover al jugador
  setCtx(ctx) {
    Object.assign(this.ctx, ctx);
    const pos = this.getPos();
    this.load(this.mapId, pos);
  }

  setMe({ id, nickname, look, color }) {
    this.me.id = id; this.me.nick = nickname;
    this.me.sheet = avatarSheet(look, color);
  }
  getPos() { return { map: this.mapId, x: this.me.x, y: this.me.y, dir: this.me.dir }; }
  inBounds(x, y) { return x >= 0 && y >= 0 && x < this.W && y < this.H; }
  npcAt(x, y) { return this.npcs.find(n => (n.x === x && n.y === y) || (n.moving && n.tx === x && n.ty === y)); }
  npcById(id) { return this.npcs.find(n => n.id === id); }
  walkable(x, y) { return this.inBounds(x, y) && !this.solid[y][x] && !this.portals.has(k(x, y)) && !this.npcAt(x, y); }
  // Los vecinos que se mueven (comerciales, borrachos, alguien persiguiéndote) no pueden encerrarte:
  // si te chocas con uno quieto, os cruzáis. Los que están en su puesto (tiendas, estación…) no.
  movableNpc(n) { return !n.busy && this.dialog?.npc !== n && !!(n.wander || n.drunk || n.chaseUntil > performance.now()); }
  passable(x, y) {
    if (!this.inBounds(x, y) || this.solid[y][x] || this.portals.has(k(x, y))) return false;
    const n = this.npcAt(x, y);
    return !n || this.movableNpc(n);
  }
  remoteAt(x, y) {
    for (const r of this.remotes.values()) if ((r.x === x && r.y === y) || (r.moving && r.tx === x && r.ty === y)) return r;
    return null;
  }

  // ---------- ciclo de vida ----------
  start(pos) {
    if (pos?.map && pos.map !== this.mapId) this.load(pos.map, pos);
    else this.place(pos);
    if (this.active) return;
    this.active = true;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    window.addEventListener('resize', this.onResize);
    this.cv.addEventListener('pointerdown', this.onPointer);
    this.cv.addEventListener('pointermove', this.onHover);
    this.resize();
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }
  stop() {
    if (!this.active) return;
    this.active = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    window.removeEventListener('resize', this.onResize);
    this.cv.removeEventListener('pointerdown', this.onPointer);
    this.cv.removeEventListener('pointermove', this.onHover);
    this.closeDialog(true);
    this.held = [];
  }
  resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(280, this.wrap.clientWidth);
    const top = this.wrap.getBoundingClientRect().top;
    const h = Math.round(Math.max(300, Math.min(700, window.innerHeight - Math.max(0, top) - 56)));
    this.cv.style.width = w + 'px'; this.cv.style.height = h + 'px';
    this.cv.width = Math.round(w * dpr); this.cv.height = Math.round(h * dpr);
    this.dpr = dpr;
    this.S = Math.max(2, Math.round((w < 700 ? 2 : 3) * dpr));
  }
  blocked() { return !!this.fade || !!this.opts.isBlocked?.(); }

  // ---------- entrada ----------
  onKeyDown(e) {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    if (this.blocked()) return;
    const dir = KEYS[e.code];
    if (dir) {
      e.preventDefault();
      if (this.dialog) { if (!e.repeat) this.moveChoice(dir === 'up' || dir === 'left' ? -1 : 1); return; }
      this.path = []; this.pending = null;
      if (!this.held.includes(dir)) {
        this.held.push(dir);
        if (!this.me.moving && this.me.dir !== dir) { this.me.dir = dir; this.me.turnUntil = performance.now() + 110; }
      }
    } else if (ACTION.has(e.code)) {
      e.preventDefault();
      if (!e.repeat) this.action();
    } else if (e.key === 'Shift') this.run = true;
  }
  onKeyUp(e) {
    const dir = KEYS[e.code];
    if (dir) this.held = this.held.filter(d => d !== dir);
    if (e.key === 'Shift') this.run = false;
  }
  toWorld(e) {
    const r = this.cv.getBoundingClientRect();
    const sx = this.cv.width / r.width, sy = this.cv.height / r.height;
    return { wx: this.camX + ((e.clientX - r.left) * sx) / this.S, wy: this.camY + ((e.clientY - r.top) * sy) / this.S };
  }
  hitRemote(wx, wy) {
    for (const r of this.remotes.values()) if (wx >= r.px && wx < r.px + AW && wy >= r.py + T - AH && wy < r.py + T) return r;
    return null;
  }
  hitNpc(wx, wy) {
    let best = null;
    for (const n of this.npcs) if (wx >= n.px && wx < n.px + AW && wy >= n.py + T - AH && wy < n.py + T && (!best || n.py > best.py)) best = n;
    return best;
  }
  hitBuilding(wx, wy) {
    return this.buildings.find(b => wx >= b.x && wx < b.x + b.cv.width && wy >= b.y && wy < b.base);
  }
  hitThing(wx, wy) {
    for (const s of new Set(this.things.values())) if (wx >= s.x && wx < s.x + s.cv.width && wy >= s.y && wy < s.base) return s;
    return null;
  }
  // cambia el letrero de un objeto interactivo (p. ej. el número de notas del tablón)
  setLabel(kind, text) {
    for (const s of this.labeled) if (s.o.interact === kind) s.o.label = text;
  }
  onHover(e) {
    const { wx, wy } = this.toWorld(e);
    const tx = Math.floor(wx / T), ty = Math.floor(wy / T);
    const hot = this.hitRemote(wx, wy) || this.hitNpc(wx, wy) || this.reads.get(k(tx, ty)) || this.hitThing(wx, wy) || this.hitBuilding(wx, wy)?.o.portal;
    this.cv.style.cursor = hot ? 'pointer' : 'default';
  }
  onPointer(e) {
    if (this.blocked()) return;
    e.preventDefault();
    document.activeElement?.blur?.();
    if (this.dialog) return this.advanceDialog(false);
    const { wx, wy } = this.toWorld(e);
    const tx = Math.floor(wx / T), ty = Math.floor(wy / T);
    const r = this.hitRemote(wx, wy);
    if (r) return this.opts.onPlayer?.(r.id);
    const npc = this.hitNpc(wx, wy);
    if (npc) return this.walkToTalk(npc);
    const sign = this.reads.get(k(tx, ty));
    if (sign) return this.walkNextToObject(sign, () => this.readSign(sign));
    const thing = this.hitThing(wx, wy);
    if (thing) return this.walkNextToObject(thing.o, () => this.opts.onInteract?.(thing.o));
    const b = this.hitBuilding(wx, wy);
    if (b?.o.portal) {
      const dc = b.o.doors[Math.min(b.o.doors.length - 1, Math.max(0, Math.floor(wx / T) - b.o.x - b.o.doors[0]))];
      const dx = b.o.x + dc, dy = b.o.y + b.o.h;
      return this.walkTo([[dx, dy]], () => this.tryStep('up'));
    }
    if (this.walkable(tx, ty)) this.walkTo([[tx, ty]]);
  }

  // ---------- movimiento ----------
  // ir hasta un vecino (también a través de un mostrador) y hablarle
  walkToTalk(npc, tries = 0) {
    const goals = [];
    for (const [dx, dy] of Object.values(VEC)) {
      if (this.walkable(npc.x + dx, npc.y + dy)) goals.push([npc.x + dx, npc.y + dy]);
      if (this.counters.has(k(npc.x + dx, npc.y + dy)) && this.walkable(npc.x + 2 * dx, npc.y + 2 * dy)) goals.push([npc.x + 2 * dx, npc.y + 2 * dy]);
    }
    this.walkTo(goals, () => {
      const dx = npc.x - this.me.x, dy = npc.y - this.me.y, dist = Math.abs(dx) + Math.abs(dy);
      const across = dist === 2 && (dx === 0 || dy === 0) && this.counters.has(k(this.me.x + Math.sign(dx), this.me.y + Math.sign(dy)));
      if (dist === 1 || across) { this.me.dir = dirTowards(this.me, npc); this.talk(npc); }
      else if (tries < 3) this.walkToTalk(npc, tries + 1);
    });
  }
  // ir al lado de un objeto de varias casillas y mirarlo
  walkNextToObject(o, then) {
    const inside = (x, y) => x >= o.x && x < o.x + o.w && y >= o.y && y < o.y + o.h;
    const goals = [];
    for (let j = -1; j <= o.h; j++) for (let i = -1; i <= o.w; i++) {
      const x = o.x + i, y = o.y + j;
      if (inside(x, y) || !this.walkable(x, y)) continue;
      if (Object.values(VEC).some(([dx, dy]) => inside(x + dx, y + dy))) goals.push([x, y]);
    }
    goals.sort((a, b) => (b[1] > o.y) - (a[1] > o.y));   // mejor de frente (por debajo)
    this.walkTo(goals, () => {
      const d = Object.keys(VEC).find(dd => inside(this.me.x + VEC[dd][0], this.me.y + VEC[dd][1]));
      if (d) this.me.dir = d;
      then?.();
    });
  }
  walkTo(goals, then = null) {
    const sx = this.me.moving ? this.me.tx : this.me.x, sy = this.me.moving ? this.me.ty : this.me.y;
    const want = new Set(goals.map(([x, y]) => k(x, y)));
    if (!want.size) return;
    if (want.has(k(sx, sy))) { this.path = []; this.pending = then; if (!this.me.moving) this.finishPath(); return; }
    const dirs = this.bfs(sx, sy, want, (x, y) => this.passable(x, y));
    if (!dirs) return;
    this.path = dirs; this.pending = then; this.held = [];
  }
  // want: conjunto de casillas destino o una función (x, y) => bool
  bfs(sx, sy, want, ok, limit = 4000) {
    const goal = typeof want === 'function' ? want : (x, y, nk) => want.has(nk);
    const prev = new Map([[k(sx, sy), null]]);
    const q = [[sx, sy]];
    let found = null, n = 0;
    while (q.length && !found && n++ < limit) {
      const [x, y] = q.shift();
      for (const [d, [dx, dy]] of Object.entries(VEC)) {
        const nx = x + dx, ny = y + dy, nk = k(nx, ny);
        if (prev.has(nk) || !ok(nx, ny)) continue;
        prev.set(nk, [k(x, y), d]);
        if (goal(nx, ny, nk)) { found = nk; break; }
        q.push([nx, ny]);
      }
    }
    if (!found) return null;
    const dirs = [];
    for (let cur = found; prev.get(cur); cur = prev.get(cur)[0]) dirs.unshift(prev.get(cur)[1]);
    return dirs;
  }
  finishPath() { const a = this.pending; this.pending = null; a?.(); }
  enterPortal(p) {
    if (p.kind === 'warp') return this.startWarp(p.to);
    this.opts.onPortal?.(p);
  }
  tryStep(dir) {
    const me = this.me;
    // con unas cuncas de más, a veces el pie va por libre
    if (this.drunk >= 2 && Math.random() < 0.07 * this.drunk) { dir = pick(SIDE[dir]); this.path = []; this.pending = null; }
    me.dir = dir;
    const [dx, dy] = VEC[dir], nx = me.x + dx, ny = me.y + dy;
    const portal = this.portals.get(k(nx, ny));
    if (portal) {
      if (dir === 'up') { this.held = []; this.path = []; this.pending = null; this.enterPortal(portal); }
      return false;
    }
    const dur = this.run ? RUN_MS : STEP_MS;
    if (!this.walkable(nx, ny)) {
      const npc = this.npcAt(nx, ny);
      if (npc && !npc.moving && this.passable(nx, ny)) this.swapWith(npc, dir, dur);
      else { this.path = []; this.pending = null; return false; }
    }
    Object.assign(me, { moving: true, t: 0, fx: me.x, fy: me.y, tx: nx, ty: ny, dur, odd: !me.odd });
    return true;
  }
  // el vecino pasa a tu casilla mientras tú pasas a la suya
  swapWith(n, dir, dur) {
    const me = this.me;
    Object.assign(n, { moving: true, t: 0, fx: n.x, fy: n.y, tx: me.x, ty: me.y, dur, odd: !n.odd, dir: OPP[dir], route: [], loose: false });
    n.next = performance.now() + dur + rand(1200, 2500);
    this.npcSay(n, pick(['¡Uy, perdón!', 'Pasa, pasa', 'Con permiso…', '¡Ay, disculpa!']), 1600);
  }
  startWarp(to) {
    if (this.fade || !to) return;
    this.held = []; this.path = []; this.pending = null;
    this.fade = { t0: performance.now(), dur: 560, to, done: false };
  }
  action() {
    if (this.dialog) return this.advanceDialog(true);
    if (this.me.moving) return;
    const [dx, dy] = VEC[this.me.dir], fx = this.me.x + dx, fy = this.me.y + dy;
    const npc = this.npcAt(fx, fy);
    if (npc) return this.talk(npc);
    const r = this.remoteAt(fx, fy);
    if (r) return this.opts.onPlayer?.(r.id);
    if (this.counters.has(k(fx, fy))) { const behind = this.npcAt(fx + dx, fy + dy); if (behind) return this.talk(behind); }
    const sign = this.reads.get(k(fx, fy));
    if (sign) return this.readSign(sign);
    const thing = this.things.get(k(fx, fy));
    if (thing) return this.opts.onInteract?.(thing.o);
    const portal = this.portals.get(k(fx, fy));
    if (portal) this.enterPortal(portal);
  }

  // ---------- diálogos ----------
  talk(npc) {
    npc.dir = OPP[this.me.dir];
    this.bubbles.delete('npc:' + npc.id);
    if (this.opts.onTalk?.(npc)) return;   // la historia tiene algo que decir
    npc.busy = true; npc.route = []; npc.loose = false; npc.chaseUntil = 0;
    this.showDialog(npc.name, npc.lines, { npc, cast: npc.cast, onEnd: () => { npc.busy = false; npc.next = performance.now() + 2500; if (!npc.wander) setTimeout(() => { if (!npc.busy) npc.dir = npc.baseDir; }, 1500); } });
  }
  readSign(sign) { this.showDialog(null, sign.read); }
  // lines: textos, {who, text, cast?} o {ask, options:[{label, lines?, action?}]} (action puede ser una función)
  // cast: personaje que dice los textos sueltos (para ponerle su voz)
  showDialog(who, lines, { onEnd, npc, cast = null } = {}) {
    const box = this.opts.dialog; if (!box || !lines?.length) return;
    this.held = []; this.path = [];
    if (this.dialog) this.closeDialog(true);
    this.dialog = { who, lines, i: 0, onEnd, npc, sel: 0, after: null, cast };
    box.hidden = false;
    this.typeLine();
  }
  entry() {
    const d = this.dialog, e = d.lines[d.i];
    if (typeof e === 'string') return { who: d.who, text: e, cast: d.cast };
    if (e.ask) return { who: e.who ?? d.who, text: e.ask, options: e.options, cast: e.cast ?? (e.who == null ? d.cast : null) };
    return { who: e.who ?? d.who, text: e.text, cast: e.cast ?? (e.who == null ? d.cast : null) };
  }
  typeLine() {
    const d = this.dialog, box = this.opts.dialog, txt = box.querySelector('.txt'), whoEl = box.querySelector('.who');
    const e = this.entry();
    whoEl.textContent = e.who || ''; whoEl.hidden = !e.who;
    box.querySelector('.opts').innerHTML = '';
    box.classList.remove('asking');
    clearInterval(d.timer);
    d.typing = true; d.sel = 0; let n = 0;
    txt.textContent = '';
    this.opts.onLine?.(e);
    d.timer = setInterval(() => {
      n += 2; txt.textContent = e.text.slice(0, n);
      if (n >= e.text.length) { clearInterval(d.timer); d.typing = false; this.showChoices(); }
    }, 26);
  }
  showChoices() {
    const d = this.dialog, e = this.entry(), box = this.opts.dialog, wrap = box.querySelector('.opts');
    if (!e.options) return;
    box.classList.add('asking');
    wrap.innerHTML = '';
    e.options.forEach((o, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'opt' + (i === d.sel ? ' on' : ''); b.textContent = o.label;
      b.addEventListener('pointerdown', (ev) => { ev.preventDefault(); ev.stopPropagation(); this.choose(i); });
      wrap.appendChild(b);
    });
  }
  moveChoice(delta) {
    const d = this.dialog; if (!d || d.typing) return;
    const e = this.entry(); if (!e.options) return;
    d.sel = (d.sel + delta + e.options.length) % e.options.length;
    this.opts.dialog.querySelectorAll('.opts .opt').forEach((b, i) => b.classList.toggle('on', i === d.sel));
  }
  choose(i) {
    const d = this.dialog; if (!d) return;
    const opt = this.entry().options?.[i]; if (!opt) return;
    if (opt.action) d.after = opt.action;
    if (opt.lines?.length) { d.lines = opt.lines; d.i = 0; this.typeLine(); }
    else this.closeDialog();
  }
  advanceDialog(fromKey) {
    const d = this.dialog; if (!d) return;
    if (d.typing) { clearInterval(d.timer); d.typing = false; this.opts.dialog.querySelector('.txt').textContent = this.entry().text; this.showChoices(); return; }
    if (this.entry().options) { if (fromKey) this.choose(d.sel); return; }
    d.i++;
    if (d.i >= d.lines.length) return this.closeDialog();
    this.typeLine();
  }
  closeDialog(silent = false) {
    const d = this.dialog; if (!d) return;
    clearInterval(d.timer);
    this.dialog = null;
    this.opts.onLine?.(null);
    if (this.opts.dialog) { this.opts.dialog.hidden = true; this.opts.dialog.classList.remove('asking'); this.opts.dialog.querySelector('.opts').innerHTML = ''; }
    if (silent) { if (d.npc) d.npc.busy = false; return; }
    d.onEnd?.();
    if (d.after) this.runAction(d.after, d.npc);
  }
  runAction(action, npc) {
    if (typeof action === 'function') return action(npc);
    if (action === 'chase' && npc) { npc.chaseUntil = performance.now() + 22000; npc.chatNext = performance.now() + 1500; return; }
    this.opts.onAction?.(action, npc);
  }
  get talking() { return !!this.dialog; }

  // ---------- vecinos ----------
  npcSay(n, text, ms = 3600) { if (n && text) this.bubbles.set('npc:' + n.id, { text: String(text).slice(0, 120), until: performance.now() + ms }); }
  sayAs(id, text) { this.npcSay(this.npcById(id), text); }
  meAt(x, y) { const m = this.me; return (m.x === x && m.y === y) || (m.moving && m.tx === x && m.ty === y); }
  npcFree(n, x, y, loose = false) {
    if (!this.inBounds(x, y) || this.solid[y][x] || this.portals.has(k(x, y)) || this.warps.has(k(x, y))) return false;
    if (this.meAt(x, y)) return false;
    for (const o of this.npcs) if (o !== n && ((o.x === x && o.y === y) || (o.moving && o.tx === x && o.ty === y))) return false;
    return loose || this.npcZone(n, x, y);
  }
  // casillas por las que pasea normalmente (su zona y su tipo de suelo)
  npcZone(n, x, y) {
    const a = n.wander?.area;
    if (a && (x < a[0] || y < a[1] || x > a[2] || y > a[3])) return false;
    if (n.wander?.tiles && !n.wander.tiles.includes(this.map.ground[y][x])) return false;
    return true;
  }
  npcStep(n, dir, ms) {
    const [dx, dy] = VEC[dir];
    n.dir = dir;
    // loose: persiguiéndote, yendo a venderle algo a alguien o volviendo a su zona puede pisar cualquier suelo
    if (!this.npcFree(n, n.x + dx, n.y + dy, n.loose || n.chaseUntil > performance.now())) return false;
    Object.assign(n, { moving: true, t: 0, fx: n.x, fy: n.y, tx: n.x + dx, ty: n.y + dy, dur: ms, odd: !n.odd });
    return true;
  }
  npcThink(n, now) {
    // fuera de su zona (tras perseguirte, venderle algo a alguien o cruzarse contigo): de vuelta al
    // camino más cercano. Si no, se quedaba plantado para siempre y podía dejarte encerrado.
    if (n.wander && !this.npcZone(n, n.x, n.y)) {
      const route = this.bfs(n.x, n.y, (x, y) => this.npcFree(n, x, y), (x, y) => this.npcFree(n, x, y, true), 2500);
      if (route?.length) { n.route = route; n.loose = true; }
      else n.next = now + rand(800, 1600);
      return;
    }
    if (n.drunk) {
      // borrachos: pasitos sueltos en cualquier dirección y paradas largas
      if (Math.random() < 0.65) { const d = pick(DIRS); if (!this.npcStep(n, d, NPC_MS * 1.3)) n.dir = d; }
      n.next = now + rand(500, 2200);
      return;
    }
    if (!n.wander) {
      if (!n.bang && Math.random() < 0.25) { n.dir = pick(DIRS); setTimeout(() => { if (!n.busy) n.dir = n.baseDir; }, 1400); }
      n.next = now + rand(3000, 8000);
      return;
    }
    // los comerciales a veces van a venderle algo a otro vecino
    if (n.sells && Math.random() < 0.3) {
      const others = this.npcs.filter(o => o !== n && !o.busy && !o.sells && !o.bang);
      const target = others.length ? pick(others) : null;
      if (target) {
        const goals = new Set(Object.values(VEC).map(([dx, dy]) => k(target.x + dx, target.y + dy)));
        const route = this.bfs(n.x, n.y, goals, (x, y) => this.npcFree(n, x, y, true), 2500);
        if (route && route.length <= 40) { n.route = route; n.visit = target; n.loose = true; return; }
      }
    }
    const a = n.wander.area || [0, 0, this.W - 1, this.H - 1];
    for (let tries = 0; tries < 25; tries++) {
      const x = Math.floor(rand(a[0], a[2] + 1)), y = Math.floor(rand(a[1], a[3] + 1));
      if (Math.abs(x - n.x) + Math.abs(y - n.y) > 16 || !this.npcFree(n, x, y)) continue;
      const route = this.bfs(n.x, n.y, new Set([k(x, y)]), (xx, yy) => this.npcFree(n, xx, yy), 2500);
      if (route?.length) { n.route = route; return; }
    }
    n.next = now + rand(1500, 4000);
  }
  arrive(n, now) {
    n.next = now + rand(2500, 6500);
    const t = n.visit; n.visit = null;
    if (!t || Math.abs(t.x - n.x) + Math.abs(t.y - n.y) !== 1 || t.busy) return;
    n.dir = dirTowards(n, t); t.dir = dirTowards(t, n);
    this.npcSay(n, pick(n.chatter || ['¿Tienes web?']));
    const replies = SALES_REPLIES[t.id] || SALES_REPLIES.default;
    setTimeout(() => { this.npcSay(t, pick(replies), 3000); setTimeout(() => { if (!t.busy) t.dir = t.baseDir; }, 3200); }, 1500);
    n.next = now + 4200;
  }
  updateNpc(n, now, dt) {
    if (n.moving) { if (!this.stepEntity(n, dt)) return; if (!n.route.length && n.visit) this.arrive(n, now); }
    if (n.busy || this.dialog?.npc === n) return;
    if (n.chaseUntil > now) {
      if (now < n.next) return;
      n.next = now + 120;
      const me = this.me, dist = Math.abs(n.x - me.x) + Math.abs(n.y - me.y);
      if (dist === 1) { n.dir = dirTowards(n, me); }
      else {
        const goals = new Set(Object.values(VEC).map(([dx, dy]) => k(me.x + dx, me.y + dy)));
        const route = this.bfs(n.x, n.y, goals, (x, y) => this.npcFree(n, x, y, true), 3000);
        if (route?.length) this.npcStep(n, route[0], NPC_RUN_MS);
      }
      if (now >= n.chatNext && n.chase) { this.npcSay(n, pick(n.chase), 2600); n.chatNext = now + rand(2600, 4200); }
      return;
    }
    if (n.route.length) {
      if (now < n.next) return;
      if (this.npcStep(n, n.route[0], NPC_MS)) { n.route.shift(); n.stuck = 0; if (!n.route.length) { n.loose = false; if (!n.visit) n.next = now + NPC_MS + rand(2000, 6000); } }
      else if (++n.stuck > 6) { n.route = []; n.visit = null; n.stuck = 0; n.loose = false; n.next = now + 800; }
      else n.next = now + 350;
      return;
    }
    if (now >= n.next) this.npcThink(n, now);
  }
  chatter(n, now) {
    if (!n.chatter || n.busy || n.chaseUntil > now || now < n.chatNext) return;
    const near = Math.abs(n.x - this.me.x) + Math.abs(n.y - this.me.y) <= 11;
    if (near || n.chatterAlways) this.npcSay(n, pick(n.chatter), 3000);
    const [a, b] = n.chatterEvery || [7000, 15000];
    n.chatNext = now + rand(a, b);
  }
  setDrunk(level) {
    this.drunk = Math.max(0, Math.min(5, level));
    if (!this.drunk) { this.cv.style.transform = ''; this.cv.style.filter = ''; }
  }

  // ---------- otros jugadores ----------
  remoteIds() { return [...this.remotes.keys()]; }
  upsert(id, m) {
    let r = this.remotes.get(id);
    const x = Number.isInteger(m.x) ? m.x : this.map.spawn.x, y = Number.isInteger(m.y) ? m.y : this.map.spawn.y;
    if (!r) {
      r = { id, x, y, px: x * T, py: y * T, dir: m.dir || 'down', moving: false, t: 0, queue: [] };
      this.remotes.set(id, r);
    } else if (!r.moving && !r.queue.length && (r.x !== x || r.y !== y)) {
      Object.assign(r, { x, y, px: x * T, py: y * T });
    }
    if (!r.moving && !r.queue.length && m.dir) r.dir = m.dir;
    r.nick = m.nickname; r.color = m.color;
    const lk = JSON.stringify(m.look || {}) + m.color;
    if (r.lookKey !== lk) { r.lookKey = lk; r.sheet = avatarSheet(m.look, m.color); }
  }
  remove(id) { this.remotes.delete(id); this.bubbles.delete(id); }
  steps(id, list, run) {
    const r = this.remotes.get(id);
    if (!r || !Array.isArray(list)) return;
    for (const s of list) if (Array.isArray(s) && Number.isInteger(s[0]) && Number.isInteger(s[1])) r.queue.push({ x: s[0], y: s[1], dir: VEC[s[2]] ? s[2] : r.dir, run: !!run });
    if (r.queue.length > 10) {
      const jump = r.queue[r.queue.length - 3];
      Object.assign(r, { x: jump.x, y: jump.y, px: jump.x * T, py: jump.y * T, moving: false });
      r.queue = r.queue.slice(-2);
    }
  }
  say(id, text) { this.bubbles.set(id, { text: String(text).slice(0, 120), until: performance.now() + 5000 }); }
  emote(id, canvas, text) { this.bubbles.set(id, { img: canvas, text, until: performance.now() + 3000 }); }

  // ---------- bucle ----------
  frame(now) {
    if (!this.active) return;
    const dt = Math.min(100, now - this.last); this.last = now;
    this.update(now, dt);
    this.render(now);
    this.raf = requestAnimationFrame(this.frame);
  }
  stepEntity(e, dt) {
    e.t += dt / e.dur;
    if (e.t >= 1) {
      e.x = e.tx; e.y = e.ty; e.px = e.x * T; e.py = e.y * T; e.moving = false; e.t = 0;
      return true;
    }
    e.px = (e.fx + (e.tx - e.fx) * e.t) * T; e.py = (e.fy + (e.ty - e.fy) * e.t) * T;
    return false;
  }
  update(now, dt) {
    const me = this.me;
    if (this.fade) {
      const t = (now - this.fade.t0) / this.fade.dur;
      if (!this.fade.done && t >= 0.5) {
        this.fade.done = true;
        const to = this.fade.to;
        this.load(to.map, to);
        this.opts.onMap?.(this.mapId, this.getPos());
      }
      if (t >= 1) this.fade = null;
    }
    if (me.moving && this.stepEntity(me, dt)) {
      this.opts.onStep?.(me.x, me.y, me.dir, me.dur < STEP_MS);
      this.lastMoveAt = now; this.idleSent = false;
      const warp = this.warps.get(k(me.x, me.y)), trap = this.traps.get(k(me.x, me.y));
      if (warp) this.startWarp(warp);
      else if (trap) { this.held = []; this.path = []; this.pending = null; this.opts.onTrap?.(trap); }
      else if (!this.path.length && this.pending) this.finishPath();
    }
    if (!me.moving && !this.dialog && (!this.blocked() || (this.scripted && !this.fade))) {
      const dir = this.held[this.held.length - 1];
      if (dir) { if (now >= me.turnUntil) this.tryStep(dir); }
      else if (this.path.length) { if (!this.tryStep(this.path.shift())) this.path = []; }
    }
    if (!me.moving && !this.idleSent && now - this.lastMoveAt > 600) {
      this.idleSent = true;
      this.opts.onIdle?.(me.x, me.y, me.dir);
    }
    for (const n of this.npcs) { this.updateNpc(n, now, dt); this.chatter(n, now); }
    for (const r of this.remotes.values()) {
      if (r.moving) { this.stepEntity(r, dt); continue; }
      const s = r.queue.shift();
      if (!s) continue;
      const dist = Math.abs(s.x - r.x) + Math.abs(s.y - r.y);
      r.dir = s.dir;
      if (dist === 1) Object.assign(r, { moving: true, t: 0, fx: r.x, fy: r.y, tx: s.x, ty: s.y, odd: !r.odd, dur: (s.run ? RUN_MS : STEP_MS) * (r.queue.length > 3 ? 0.6 : 1) });
      else if (dist > 1) Object.assign(r, { x: s.x, y: s.y, px: s.x * T, py: s.y * T });
    }
    for (const tr of this.trains) {
      if (!tr.active) {
        if (now < tr.next) continue;
        tr.cv ||= paintTrain(tr.dir).toCanvas();
        tr.active = true; tr.x = tr.dir > 0 ? -tr.cv.width : this.W * T;
        const watcher = this.npcs.filter(n => n.onTrain && !n.busy);
        if (watcher.length) setTimeout(() => { const w = pick(watcher); this.npcSay(w, pick(w.onTrain), 2600); }, 1200);
        this.opts.onTrain?.();
        continue;
      }
      tr.x += tr.dir * tr.speed * dt / 1000;
      if ((tr.dir > 0 && tr.x > this.W * T) || (tr.dir < 0 && tr.x < -tr.cv.width)) { tr.active = false; tr.next = now + tr.every * rand(0.7, 1.3); }
    }
    if (this.drunk >= 2 && now > this.nextHip) { this.nextHip = now + rand(6000, 12000); if (this.me.id) this.say(this.me.id, pick(['¡Hip!', '¡Hip! Perdón.', 'Estoy perfectamente. ¡Hip!'])); }
    for (const [id, b] of this.bubbles) if (now > b.until) this.bubbles.delete(id);
  }

  // ---------- dibujo ----------
  render(now) {
    const { ctx2: ctx, cv, S } = this;
    const vw = cv.width / S, vh = cv.height / S;
    const mw = this.W * T, mh = this.H * T;
    const me = this.me;
    let cx = me.px + T / 2 - vw / 2, cy = me.py + T / 2 - vh / 2;
    cx = mw <= vw ? (mw - vw) / 2 : Math.max(0, Math.min(mw - vw, cx));
    cy = mh <= vh ? (mh - vh) / 2 : Math.max(0, Math.min(mh - vh, cy));
    this.camX = Math.round(cx * S) / S; this.camY = Math.round(cy * S) / S;
    const X = (wx) => Math.round((wx - this.camX) * S), Y = (wy) => Math.round((wy - this.camY) * S);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = this.map.bg || '#2E5E36'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.drawImage(this.ground[Math.floor(now / 650) % 2], X(0), Y(0), mw * S, mh * S);

    const x0 = this.camX - 64, x1 = this.camX + vw + 64, y0 = this.camY - 16, y1 = this.camY + vh + 96;
    const list = [];
    for (const s of this.sprites) if (s.x + s.cv.width >= x0 && s.x <= x1 && s.base >= y0 && s.y <= y1) list.push({ base: s.base, x: s.x, s });
    const ents = [...this.npcs.map(n => ({ e: n, npc: true })), ...[...this.remotes.values()].map(r => ({ e: r })), ...(me.sheet ? [{ e: me, mine: true }] : [])];
    for (const en of ents) list.push({ base: en.e.py + T + 0.5, x: en.e.px, en });
    for (const tr of this.trains) if (tr.active) list.push({ base: (tr.row + 1) * T, x: tr.x, tr });
    list.sort((a, b) => a.base - b.base || a.x - b.x);
    for (const it of list) {
      if (it.s) {
        const bob = it.s.o.kind === 'boat' && Math.sin(now / 450 + it.s.x) > 0 ? 1 : 0;
        ctx.drawImage(it.s.cv, X(it.s.x), Y(it.s.y + bob), it.s.cv.width * S, it.s.cv.height * S);
        if (it.s.led) this.drawLed(it.s, X, Y, now);
      } else if (it.tr) {
        ctx.drawImage(it.tr.cv, X(it.tr.x), Y(it.tr.row * T + 4 - 28), it.tr.cv.width * S, it.tr.cv.height * S);
      } else this.drawAvatar(it.en.e, X, Y, now, it.en.npc);
    }
    for (const s of this.overhead) if (s.x + s.cv.width >= x0 && s.x <= x1) ctx.drawImage(s.cv, X(s.x), Y(s.y), s.cv.width * S, s.cv.height * S);
    // letreros de los edificios y objetos
    ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    const fs = Math.round(7 * this.dpr);
    ctx.font = `${fs}px ${FONT}`;
    for (const b of this.labeled) {
      if (b.x + b.cv.width < x0 || b.x > x1 || b.base < y0 || b.y > y1) continue;
      const o = b.o;
      if (o.labelNear) {
        const dx = me.x - Math.max(o.x, Math.min(o.x + o.w - 1, me.x)), dy = me.y - Math.max(o.y, Math.min(o.y + o.h, me.y));
        if (Math.abs(dx) + Math.abs(dy) > o.labelNear) continue;
      }
      const lx = X(o.x * T + (o.w * T) / 2);
      const ly = o.kind === 'building' ? Y(o.y * T + (o.type === 'arena' ? 37 : o.type === 'station' ? 60 : 13)) : Y(b.y - 3);
      this.tag(o.label, lx, ly, o.color, fs);
    }
    // nombres y bocadillos
    for (const r of this.remotes.values()) {
      const nx = X(r.px + T / 2), ny = Y(r.py + T - AH - 3);
      this.tag(r.nick || '?', nx, ny, r.color, fs, true);
      this.drawBubble(r.id, nx, ny - fs - 8 * this.dpr);
    }
    for (const n of this.npcs) {
      if (this.bubbles.has('npc:' + n.id)) this.drawBubble('npc:' + n.id, X(n.px + T / 2), Y(n.py + T - AH - 2));
      else if (n.mark) this.drawMark(X(n.px + T / 2), Y(n.py + T - AH - 6 + Math.round(Math.sin(now / 180) * 1.5)));
    }
    if (me.sheet) this.drawBubble(me.id, X(me.px + T / 2), Y(me.py + T - AH - 3));
    // fundido al cambiar de mapa
    if (this.fade) {
      const t = Math.min(1, (now - this.fade.t0) / this.fade.dur);
      ctx.fillStyle = `rgba(10,8,16,${(t < 0.5 ? t * 2 : (1 - t) * 2).toFixed(3)})`;
      ctx.fillRect(0, 0, cv.width, cv.height);
    }
    // con unas cuncas de más el mundo se mueve un poco
    if (this.drunk) {
      const d = this.drunk, a = Math.sin(now / 650) * 0.8 * d, sx = Math.sin(now / 410) * 2.5 * d;
      this.cv.style.transform = `rotate(${a.toFixed(2)}deg) translateX(${sx.toFixed(1)}px) scale(${(1 + 0.035 * d).toFixed(3)})`;
      this.cv.style.filter = `blur(${(d * 0.3).toFixed(2)}px) saturate(${(1 + d * 0.15).toFixed(2)})`;
    }
  }
  drawLed(spr, X, Y, now) {
    const L = spr.led, rows = this.opts.ledRows?.(spr.o) || [];
    if (!rows.length) return;
    const ctx = this.ctx2, S = this.S;
    const x0 = X(spr.x + L.x), y0 = Y(spr.y + L.y), w = L.w * S, h = L.h * S;
    ctx.save();
    ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
    const rh = h / rows.length, fs = Math.max(6, Math.floor(rh * 0.6));
    ctx.font = `${fs}px ${FONT}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    rows.forEach((r, i) => {
      const tw = ctx.measureText(r.text).width, total = tw + w, speed = 22 * S;
      const off = ((now / 1000) * speed + i * 97 * S) % total;
      if (r.blink && Math.floor(now / 500) % 2) return;
      ctx.fillStyle = r.color || '#FFB300';
      ctx.fillText(r.text, x0 + w - off, y0 + rh * i + rh / 2 + 1);
    });
    ctx.restore();
  }
  drawAvatar(e, X, Y, now, npc = false) {
    const S = this.S;
    let frame = e.moving && e.t < 0.55 ? (e.odd ? 1 : 2) : 0;
    let ox = 0;
    if (npc && e.bang && !e.busy) { const ph = Math.floor(now / 170) % 6; frame = ph === 1 ? 1 : ph === 3 ? 2 : 0; ox = ph === 1 || ph === 3 ? (ph === 1 ? -1 : 1) : 0; }
    if (npc && e.drunk) ox = Math.round(Math.sin(now / 320 + e.x * 3) * 1.2);
    const row = DIRS.indexOf(e.dir);
    this.ctx2.drawImage(this.shadow, X(e.px + 2), Y(e.py + T - 3), 12 * S, 4 * S);
    if (npc && e.img) {
      // un Paximón suelto por el mapa (jefes y bots de la historia): el sprite de 64 px a 28 px, botando
      const sz = e.big ? 40 : 28, bob = Math.round(Math.abs(Math.sin(now / 260 + e.x)) * -2);
      this.ctx2.drawImage(e.img, X(e.px + T / 2 - sz / 2), Y(e.py + T - sz + 3 + bob), sz * S, sz * S);
      return;
    }
    if (!e.sheet) return;
    this.ctx2.drawImage(e.sheet, frame * AW, (row < 0 ? 0 : row) * AH, AW, AH, X(e.px + ox), Y(e.py + T - AH), AW * S, AH * S);
  }
  // «!» de misión sobre la cabeza de un vecino
  drawMark(x, y) {
    const ctx = this.ctx2, d = this.dpr, w = 12 * d, h = 16 * d;
    ctx.fillStyle = '#FFD23F'; ctx.strokeStyle = '#111111'; ctx.lineWidth = 2 * d;
    this.round(x - w / 2, y - h, w, h, 3 * d); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#111111'; ctx.fillRect(x - 1.5 * d, y - h + 3 * d, 3 * d, 7 * d); ctx.fillRect(x - 1.5 * d, y - 4.5 * d, 3 * d, 2.5 * d);
  }
  tag(text, x, y, color, fs, player = false) {
    const ctx = this.ctx2, d = this.dpr;
    ctx.font = `${fs}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(text).width + 10 * d + (player ? 6 * d : 0), h = fs + 8 * d;
    ctx.fillStyle = player ? 'rgba(20,18,26,.78)' : 'rgba(20,18,26,.66)';
    this.round(x - w / 2, y - h / 2, w, h, 4 * d); ctx.fill();
    if (color) { ctx.fillStyle = color; this.round(x - w / 2, y - h / 2, 4 * d, h, 2 * d); ctx.fill(); }
    ctx.fillStyle = player ? '#FFFFFF' : '#FFE9C2';
    ctx.fillText(text, x + (player ? 3 * d : 2 * d), y + 1);
  }
  drawBubble(id, x, y) {
    const b = this.bubbles.get(id); if (!b) return;
    const ctx = this.ctx2, d = this.dpr, fs = Math.round(8 * d);
    ctx.font = `${fs}px ${FONT}`;
    const lines = [];
    if (b.text) {
      const words = b.text.split(/\s+/); let cur = '';
      for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > 170 * d && cur) { lines.push(cur); cur = w; } else cur = t; }
      if (cur) lines.push(cur);
    }
    const img = b.img ? 48 * d : 0;
    const tw = Math.max(0, ...lines.map(l => ctx.measureText(l).width));
    const w = Math.max(img, tw) + 16 * d;
    const h = img + lines.length * (fs + 5 * d) + 12 * d;
    const bx = x - w / 2, by = y - h - 6 * d;
    ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#111111'; ctx.lineWidth = 2 * d;
    this.round(bx, by, w, h, 8 * d); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 5 * d, by + h - 1); ctx.lineTo(x, by + h + 6 * d); ctx.lineTo(x + 5 * d, by + h - 1); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 5 * d, by + h); ctx.lineTo(x, by + h + 6 * d); ctx.lineTo(x + 5 * d, by + h); ctx.stroke();
    if (b.img) ctx.drawImage(b.img, x - img / 2, by + 6 * d, img, img);
    ctx.fillStyle = '#111111'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    lines.forEach((l, i) => ctx.fillText(l, x, by + 7 * d + img + i * (fs + 5 * d)));
    ctx.textBaseline = 'middle';
  }
  round(x, y, w, h, r) {
    const c = this.ctx2;
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
}
