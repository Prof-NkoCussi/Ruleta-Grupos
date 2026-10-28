(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const STORE = 'ruleta-tp-yolo-v1';
  const STORE_CFG = 'ruleta-tp-yolo-v1-ajustes';
  // Parejas fijas: si están en la lista, cada una queda junta en una ronda distinta elegida al azar de RONDAS
  const PAREJAS = [
    ['CABRERA, Ramiro', 'RODRIGUEZ, Santiago'],
    ['BATALLANOS, Facundo', 'GONZALES, Elian'],
  ];
  const RONDAS = [2, 3, 4, 5];

  const $ = (id) => document.getElementById(id);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const norm = (a) => ((a % TAU) + TAU) % TAU;

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const store = {
    get(k, fallback) {
      try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; }
      catch { return fallback; }
    },
    set(k, v) {
      try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin storage */ }
    }
  };

  /* =========================================================
     FONDO: red de nodos + paquetes + símbolos de código
     ========================================================= */
  const Bg = (() => {
    const c = $('bg');
    const ctx = c.getContext('2d');
    const LINK = 150;
    const GLYPHS = ['<>', '</>', '{ }', '01', '10110', '=>', '&&', '()', '[]', '#!', '0x1F', 'ping',
      'TCP', 'UDP', 'SYN', 'ACK', '192.168.0.1', '::1', 'def', 'fn()', 'git push', 'ssh', 'HTTP 200',
      '/* */', 'YOLO', 'if()', 'return', '255.255.255.0', 'DNS', 'import'];
    let w = 0, h = 0, nodes = [], packets = [], glyphs = [], last = 0, acc = 0, bgFill;

    const newNode = () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35,
      r: 1.5 + Math.random() * 2.2, hub: Math.random() < .12
    });

    function resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = innerWidth; h = innerHeight;
      c.width = w * dpr; c.height = h * dpr;
      c.style.width = w + 'px'; c.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // degradé azul marino: más claro abajo a la derecha, más oscuro en la esquina superior izquierda
      bgFill = ctx.createRadialGradient(w * .62, h * .7, 0, w * .62, h * .7, Math.hypot(w, h) * .75);
      bgFill.addColorStop(0, '#173c66');
      bgFill.addColorStop(1, '#0d223e');
      const count = Math.max(24, Math.min(90, Math.round(w * h / 22000)));
      while (nodes.length < count) nodes.push(newNode());
      nodes.length = count;
      nodes.forEach(n => { if (n.x > w) n.x = Math.random() * w; if (n.y > h) n.y = Math.random() * h; });
    }

    function spawnPacket(color) {
      for (let k = 0; k < 15; k++) {
        const a = pick(nodes), b = pick(nodes);
        if (a !== b && Math.hypot(a.x - b.x, a.y - b.y) < LINK) {
          packets.push({ a, b, t: 0, s: .008 + Math.random() * .012, color: color || pick(['#22d3ee', '#4ade80', '#a78bfa']) });
          return;
        }
      }
    }

    function spawnGlyph(anyY) {
      glyphs.push({
        x: Math.random() * w, y: anyY ? Math.random() * h : h + 20,
        vy: .15 + Math.random() * .35, text: pick(GLYPHS),
        size: 12 + Math.random() * 12, a: .07 + Math.random() * .13
      });
    }

    function loop(now) {
      const dt = Math.min(50, now - last || 16) / 16;
      last = now;
      ctx.fillStyle = bgFill;
      ctx.fillRect(0, 0, w, h);

      // símbolos de código flotando
      ctx.textAlign = 'center';
      for (const g of glyphs) {
        g.y -= g.vy * dt;
        ctx.font = `${g.size}px "JetBrains Mono", monospace`;
        ctx.fillStyle = `rgba(148,163,184,${g.a})`;
        ctx.fillText(g.text, g.x, g.y);
      }
      glyphs = glyphs.filter(g => g.y > -30);
      if (glyphs.length < 28 && Math.random() < .05) spawnGlyph(false);

      // nodos
      for (const n of nodes) {
        n.x += n.vx * dt; n.y += n.vy * dt;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
      }

      // enlaces
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
          if (d2 < LINK * LINK) {
            ctx.strokeStyle = `rgba(34,211,238,${(1 - Math.sqrt(d2) / LINK) * .35})`;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }

      for (const n of nodes) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.hub ? n.r + 2 : n.r, 0, TAU);
        ctx.fillStyle = n.hub ? 'rgba(167,139,250,.9)' : 'rgba(34,211,238,.75)';
        ctx.fill();
        if (n.hub) {
          ctx.strokeStyle = 'rgba(167,139,250,.35)';
          ctx.beginPath(); ctx.arc(n.x, n.y, n.r + 8, 0, TAU); ctx.stroke();
        }
      }

      // paquetes viajando por los enlaces
      acc += dt;
      if (acc > 14) { acc = 0; spawnPacket(); }
      ctx.save();
      for (const p of packets) {
        p.t += p.s * dt;
        const x = p.a.x + (p.b.x - p.a.x) * p.t;
        const y = p.a.y + (p.b.y - p.a.y) * p.t;
        ctx.shadowColor = p.color; ctx.shadowBlur = 10;
        ctx.fillStyle = p.color;
        ctx.fillRect(x - 2.5, y - 2.5, 5, 5);
      }
      ctx.restore();
      packets = packets.filter(p => p.t < 1 && Math.hypot(p.a.x - p.b.x, p.a.y - p.b.y) < LINK * 1.3);

      requestAnimationFrame(loop);
    }

    addEventListener('resize', resize);
    resize();
    for (let i = 0; i < 18; i++) spawnGlyph(true);
    requestAnimationFrame(loop);

    return {
      burst(n = 40) { for (let i = 0; i < n; i++) spawnPacket(pick(['#4ade80', '#22d3ee', '#f472b6'])); }
    };
  })();

  /* =========================================================
     ESTADO
     ========================================================= */
  const empty = () => ({ names: [], pool: [], groups: [], first: null });
  const newDraw = (names) => ({ names, pool: shuffle(names), groups: [], first: null, pairRounds: pairRounds(names.length) });

  // una ronda distinta para cada pareja fija, sin pasarse de las rondas que alcanza la lista
  function pairRounds(n) {
    const max = Math.max(1, Math.floor(n / 2));
    let opts = RONDAS.filter(r => r <= max);
    if (opts.length < PAREJAS.length) opts = Array.from({ length: max }, (_, i) => i + 1);
    return shuffle(opts).slice(0, PAREJAS.length);
  }
  let state = store.get(STORE, null);
  if (!state || !Array.isArray(state.names) || !Array.isArray(state.pool) || !Array.isArray(state.groups)) state = empty();
  let cfg = store.get(STORE_CFG, null) || { a: '', b: '', round: 3, on: false };

  const save = () => store.set(STORE, state);
  const saveCfg = () => store.set(STORE_CFG, cfg);

  let rotation = 0;
  let busy = false;
  let highlight = -1;

  function phase() {
    if (!state.names.length) return 'empty';
    if (state.first !== null) return 'pick';
    if (state.pool.length >= 2) return 'pick';
    if (state.pool.length === 1 && state.groups.length > 0) return 'leftover';
    return 'done';
  }

  function items() {
    const p = phase();
    if (p === 'pick') return state.pool;
    if (p === 'leftover') return state.groups.map((_, i) => `Grupo ${i + 1}`);
    return [];
  }

  /* ---------- ajustes ---------- */
  const words = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().match(/[a-z]+/g) || [];

  // busca en la lista sin importar mayúsculas, tildes, comas ni el orden apellido/nombre
  function findName(target) {
    const t = words(target);
    return state.names.find(n => { const w = words(n); return t.every(x => w.includes(x)); });
  }

  function fixedPairs() {
    const rounds = state.pairRounds || [3, 4];
    const out = [];
    PAREJAS.forEach(([x, y], k) => {
      const a = findName(x), b = findName(y);
      if (a && b && a !== b) out.push({ a, b, round: rounds[k] || 3 });
    });
    return out;
  }

  // las parejas fijas mandan; si ninguna está en la lista se usa la del menú de ajustes
  function activePairs() {
    const fixed = fixedPairs();
    if (fixed.length) return fixed;
    if (!cfg.on || !cfg.a || !cfg.b || cfg.a === cfg.b) return [];
    if (!state.names.includes(cfg.a) || !state.names.includes(cfg.b)) return [];
    return [cfg];
  }

  function chooseTarget() {
    const list = items();
    const p = phase();
    const pairs = activePairs();

    if (p === 'leftover') {
      const taken = pairs.map(c => state.groups.findIndex(g => g.includes(c.a) && g.includes(c.b)));
      const idx = list.map((_, i) => i).filter(i => !taken.includes(i));
      return idx.length ? pick(idx) : Math.floor(Math.random() * list.length);
    }

    const round = state.groups.length + 1;
    const pool = state.pool;
    const blocked = new Set();
    for (const c of pairs) {
      const aIn = pool.includes(c.a);
      const bIn = pool.includes(c.b);
      if (round === c.round) {
        if (state.first === null && aIn && bIn) return pool.indexOf(Math.random() < .5 ? c.a : c.b);
        if (state.first === c.a && bIn) return pool.indexOf(c.b);
        if (state.first === c.b && aIn) return pool.indexOf(c.a);
      }
      if (round < c.round && aIn && bIn) { blocked.add(c.a); blocked.add(c.b); }
    }
    const others = [];
    pool.forEach((n, i) => { if (!blocked.has(n)) others.push(i); });
    if (others.length) return pick(others);
    return Math.floor(Math.random() * list.length);
  }

  /* =========================================================
     RULETA
     ========================================================= */
  const wheel = $('wheel');
  const wctx = wheel.getContext('2d');
  const FILLS = ['#0b3b4a', '#14284d', '#2a1b4d', '#0b3d2e', '#1a2f55', '#3a1d47'];

  function fitText(t, maxW) {
    if (wctx.measureText(t).width <= maxW) return t;
    let s = t;
    while (s.length > 1 && wctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
    return s + '…';
  }

  function drawWheel() {
    const list = items();
    const W = wheel.width, cx = W / 2, cy = W / 2, R = W / 2 - 16;
    wctx.clearRect(0, 0, W, W);

    // halo exterior
    wctx.save();
    wctx.beginPath(); wctx.arc(cx, cy, R + 8, 0, TAU);
    wctx.strokeStyle = 'rgba(34,211,238,.35)'; wctx.lineWidth = 4;
    wctx.shadowColor = '#22d3ee'; wctx.shadowBlur = 26;
    wctx.stroke();
    wctx.restore();

    if (!list.length) {
      wctx.beginPath(); wctx.arc(cx, cy, R, 0, TAU);
      wctx.fillStyle = '#0a1224'; wctx.fill();
      wctx.setLineDash([10, 12]);
      wctx.strokeStyle = phase() === 'done' ? '#4ade80' : 'rgba(148,163,184,.4)';
      wctx.lineWidth = 3;
      wctx.beginPath(); wctx.arc(cx, cy, R - 40, 0, TAU); wctx.stroke();
      wctx.setLineDash([]);
      return;
    }

    const n = list.length;
    const seg = TAU / n;
    const fs = Math.max(13, Math.min(34, (TAU * R * .62 / n) * .62));
    wctx.font = `600 ${fs}px "JetBrains Mono", monospace`;
    const maxW = R - 24 - 104;

    for (let i = 0; i < n; i++) {
      const a0 = rotation + i * seg;
      wctx.beginPath();
      wctx.moveTo(cx, cy);
      wctx.arc(cx, cy, R, a0, a0 + seg);
      wctx.closePath();
      wctx.fillStyle = i === highlight ? '#22d3ee' : FILLS[i % FILLS.length];
      wctx.fill();
      wctx.strokeStyle = 'rgba(148,163,184,.25)';
      wctx.lineWidth = 2;
      wctx.stroke();

      wctx.save();
      wctx.translate(cx, cy);
      wctx.rotate(a0 + seg / 2);
      wctx.textAlign = 'right';
      wctx.textBaseline = 'middle';
      wctx.fillStyle = i === highlight ? '#020617' : '#e2e8f0';
      wctx.fillText(fitText(list[i], maxW), R - 24, 0);
      wctx.restore();

      // "LEDs" en el borde
      const dx = cx + Math.cos(a0) * (R - 8), dy = cy + Math.sin(a0) * (R - 8);
      wctx.beginPath(); wctx.arc(dx, dy, 4, 0, TAU);
      wctx.fillStyle = i % 2 ? '#a78bfa' : '#4ade80';
      wctx.fill();
    }

    wctx.beginPath(); wctx.arc(cx, cy, R, 0, TAU);
    wctx.strokeStyle = '#22d3ee'; wctx.lineWidth = 3; wctx.stroke();
  }

  const pointer = $('pointer');
  function tick() {
    pointer.classList.remove('tick');
    void pointer.offsetWidth;
    pointer.classList.add('tick');
  }

  function segAtPointer(n) {
    const seg = TAU / n;
    return Math.floor(norm(-Math.PI / 2 - rotation) / seg) % n;
  }

  function spin() {
    if (busy || !overlay.hidden) return;
    const p = phase();
    if (p === 'empty') { openList(); return; }
    if (p !== 'pick' && p !== 'leftover') return;

    const n = items().length;
    const seg = TAU / n;
    const target = chooseTarget();
    const f = .18 + Math.random() * .64;
    const desired = norm(-Math.PI / 2 - (target + f) * seg);
    const diff = norm(desired - norm(rotation));
    const start = rotation;
    const end = rotation + diff + TAU * (5 + Math.floor(Math.random() * 3));
    const dur = 5200 + Math.random() * 1200;

    busy = true;
    highlight = -1;
    render();
    let lastSeg = segAtPointer(n);
    const t0 = performance.now();

    function frame(now) {
      const t = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - t, 4);
      rotation = start + (end - start) * e;
      const s = segAtPointer(n);
      if (s !== lastSeg) { lastSeg = s; tick(); }
      drawWheel();
      if (t < 1) requestAnimationFrame(frame);
      else { rotation = norm(end); landed(target); }
    }
    requestAnimationFrame(frame);
  }

  function landed(i) {
    highlight = i;
    drawWheel();
    const p = phase();

    if (p === 'leftover') {
      const name = state.pool[0];
      setTimeout(() => {
        state.groups[i].push(name);
        state.pool = [];
        save();
        highlight = -1; busy = false;
        render(i);
        Bg.burst(50);
        showOverlay('join', name, `Grupo ${i + 1}`, i + 1);
      }, 800);
      return;
    }

    const name = state.pool[i];
    setTimeout(() => {
      state.pool.splice(i, 1);
      highlight = -1; busy = false;
      if (state.first === null) {
        state.first = name;
        save();
        render();
        Bg.burst(15);
      } else {
        const g = [state.first, name];
        state.groups.push(g);
        state.first = null;
        save();
        render(state.groups.length - 1);
        Bg.burst(50);
        showOverlay('pair', g[0], g[1], state.groups.length);
      }
    }, 900);
  }

  /* =========================================================
     UI
     ========================================================= */
  const spinBtn = $('spinBtn');
  const statusEl = $('status');
  const pickedEl = $('picked');
  const groupsEl = $('groups');
  const counterEl = $('counter');
  const overlay = $('linkOverlay');

  function render(newIndex = -1) {
    const p = phase();
    drawWheel();

    // estado
    statusEl.classList.remove('done');
    const round = state.groups.length + 1;
    if (p === 'empty') statusEl.textContent = 'Cargá la lista para empezar';
    else if (p === 'pick' && state.first === null) statusEl.textContent = `Ronda ${round} · buscando nodo 1…`;
    else if (p === 'pick') statusEl.textContent = `Ronda ${round} · buscando conexión…`;
    else if (p === 'leftover') statusEl.textContent = `Sobra 1 nodo · ¿a qué grupo se suma?`;
    else { statusEl.textContent = `✔ Red completa · ${state.groups.length} grupos`; statusEl.classList.add('done'); }

    // elegido
    pickedEl.textContent = '';
    if (p === 'pick' && state.first !== null) {
      pickedEl.append('nodo_1 = ');
      const b = document.createElement('b'); b.textContent = state.first; pickedEl.append(b);
      pickedEl.append(' · esperando conexión');
      const cur = document.createElement('span'); cur.className = 'cursor'; pickedEl.append(cur);
    } else if (p === 'leftover') {
      pickedEl.append('nodo suelto: ');
      const b = document.createElement('b'); b.textContent = state.pool[0]; pickedEl.append(b);
    }

    // botón central
    spinBtn.disabled = busy || p === 'done';
    spinBtn.textContent = p === 'empty' ? 'CARGAR' : p === 'done' ? '✔' : busy ? '···' : 'GIRAR';

    // lista de grupos
    groupsEl.textContent = '';
    state.groups.forEach((g, i) => {
      const li = document.createElement('li');
      if (i === newIndex) li.className = 'new';
      const id = document.createElement('span'); id.className = 'gid'; id.textContent = `G${i + 1}`;
      const m = document.createElement('span'); m.className = 'members';
      g.forEach((name, k) => {
        if (k) { const l = document.createElement('span'); l.className = 'link'; l.textContent = '⇄'; m.append(l); }
        const s = document.createElement('span'); s.textContent = name; m.append(s);
      });
      li.append(id, m);
      groupsEl.append(li);
    });
    if (newIndex >= 0 && groupsEl.children[newIndex]) groupsEl.children[newIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });

    const left = state.pool.length + (state.first !== null ? 1 : 0);
    counterEl.textContent = state.names.length ? `${left} sin grupo · ${state.groups.length} grupos` : '';
  }

  /* ---------- overlay ---------- */
  let typing = [];
  function showOverlay(kind, a, b, num) {
    $('nodeA').textContent = a;
    $('nodeB').textContent = b;
    $('termTitle').textContent = kind === 'pair' ? 'handshake.sh' : 'dhcp-join.sh';
    const lines = kind === 'pair'
      ? [`$ connect --grupo ${num}`,
         `> SYN       ${a} → ${b}`,
         `> SYN-ACK   ${b} → ${a}`,
         `> ACK       ${a} → ${b}`,
         `✔ Conexión establecida · Grupo ${num}`]
      : [`$ dhcp --join grupo-${num}`,
         `> DISCOVER  ${a}`,
         `> OFFER     Grupo ${num} → ${a}`,
         `> ACK       ${a} ∈ Grupo ${num}`,
         `✔ Nodo agregado al Grupo ${num}`];
    const log = $('termLog');
    log.textContent = '';
    overlay.hidden = false;
    lines.forEach((l, k) => {
      typing.push(setTimeout(() => {
        const s = document.createElement('span');
        s.textContent = l + '\n';
        if (l.startsWith('✔')) s.className = 'ok';
        log.append(s);
      }, 450 + k * 550));
    });
  }

  function closeOverlay() {
    typing.forEach(clearTimeout);
    typing = [];
    overlay.hidden = true;
    render();
  }
  overlay.addEventListener('click', closeOverlay);

  /* ---------- lista ---------- */
  const listModal = $('listModal');
  const namesInput = $('namesInput');

  function parseNames(txt) {
    const seen = {};
    return txt.split(/\r?\n/)
      .map(s => s.trim().replace(/\s+/g, ' '))
      .filter(Boolean)
      .map(n => { seen[n] = (seen[n] || 0) + 1; return seen[n] > 1 ? `${n} (${seen[n]})` : n; });
  }

  function openList() {
    namesInput.value = state.names.join('\n');
    listModal.hidden = false;
    setTimeout(() => namesInput.focus(), 50);
  }

  $('saveList').addEventListener('click', () => {
    const names = parseNames(namesInput.value);
    if (names.length < 2) { toast('Necesito al menos 2 nombres'); return; }
    const started = state.groups.length || state.first !== null;
    if (started && !confirm('Esto reinicia el sorteo. ¿Seguimos?')) return;
    state = newDraw(names);
    save();
    listModal.hidden = true;
    render();
    toast(`${names.length} estudiantes cargados`);
  });
  $('cancelList').addEventListener('click', () => { listModal.hidden = true; });
  $('editBtn').addEventListener('click', openList);

  $('resetBtn').addEventListener('click', () => {
    if (!state.names.length) return;
    if (!confirm('¿Reiniciar el sorteo? Se borran los grupos armados.')) return;
    state = newDraw(state.names);
    save();
    render();
  });

  /* ---------- exportar ---------- */
  function resultText() {
    const out = ['TP Final - YoLo v1 · Redes I / Software II · 5to 1ra', ''];
    state.groups.forEach((g, i) => out.push(`Grupo ${i + 1}: ${g.join(' – ')}`));
    const left = [...(state.first !== null ? [state.first] : []), ...state.pool];
    if (left.length && phase() !== 'done') out.push('', `Sin grupo: ${left.join(', ')}`);
    return out.join('\n');
  }

  $('copyBtn').addEventListener('click', async () => {
    const txt = resultText();
    try { await navigator.clipboard.writeText(txt); }
    catch {
      const ta = document.createElement('textarea');
      ta.value = txt; document.body.append(ta); ta.select();
      try { document.execCommand('copy'); } catch { /* nada */ }
      ta.remove();
    }
    toast('Grupos copiados');
  });

  $('downloadBtn').addEventListener('click', () => {
    const blob = new Blob([resultText()], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'grupos-tp-final.txt';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  let toastT;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('show'), 1800);
  }

  /* ---------- ajustes (Alt+Shift+K o mantener apretado "ruleta v1.0") ---------- */
  const cfgModal = $('cfgModal');
  const cfgA = $('cfgA'), cfgB = $('cfgB'), cfgRound = $('cfgRound'), cfgOn = $('cfgOn'), cfgInfo = $('cfgInfo');

  function fillSelect(sel, values, current) {
    sel.textContent = '';
    values.forEach(([v, label]) => {
      const o = document.createElement('option');
      o.value = v; o.textContent = label;
      sel.append(o);
    });
    sel.value = current;
    if (sel.value !== String(current)) sel.selectedIndex = 0;
  }

  function openCfg() {
    const names = state.names.slice().sort((a, b) => a.localeCompare(b, 'es'));
    const opts = [['', '—'], ...names.map(n => [n, n])];
    fillSelect(cfgA, opts, cfg.a);
    fillSelect(cfgB, opts, cfg.b);
    const maxRound = Math.max(1, Math.floor(state.names.length / 2));
    const rounds = [];
    for (let r = 1; r <= maxRound; r++) rounds.push([String(r), `Ronda ${r}`]);
    fillSelect(cfgRound, rounds, String(Math.min(cfg.round || 3, maxRound)));
    cfgOn.checked = !!cfg.on;
    updateCfgInfo();
    cfgModal.hidden = false;
  }

  function updateCfgInfo() {
    const fixed = fixedPairs();
    if (fixed.length) {
      cfgInfo.textContent = 'Parejas fijas: ' + fixed.map(c => `${c.a} + ${c.b} (ronda ${c.round})`).join(' · ') + '. Este ajuste se ignora.';
      return;
    }
    const a = cfgA.value, b = cfgB.value, r = +cfgRound.value;
    let msg;
    if (!state.names.length) msg = 'Primero cargá la lista.';
    else if (!a || !b) msg = 'Elegí los dos integrantes.';
    else if (a === b) msg = 'Tienen que ser dos personas distintas.';
    else {
      const gi = state.groups.findIndex(g => g.includes(a) && g.includes(b));
      if (gi >= 0) msg = `Ya están juntos en el Grupo ${gi + 1}.`;
      else if (state.groups.length >= r) msg = 'Esa ronda ya pasó. Reiniciá el sorteo o elegí otra.';
      else msg = cfgOn.checked ? `OK · se arma en la ronda ${r}.` : 'Desactivado.';
    }
    cfgInfo.textContent = msg;
  }
  [cfgA, cfgB, cfgRound, cfgOn].forEach(el => el.addEventListener('change', updateCfgInfo));

  $('cfgSave').addEventListener('click', () => {
    cfg = { a: cfgA.value, b: cfgB.value, round: +cfgRound.value || 3, on: cfgOn.checked };
    saveCfg();
    cfgModal.hidden = true;
  });
  $('cfgCancel').addEventListener('click', () => { cfgModal.hidden = true; });

  const ver = $('ver');
  let lp;
  ver.addEventListener('pointerdown', () => { lp = setTimeout(openCfg, 1500); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => ver.addEventListener(ev, () => clearTimeout(lp)));
  ver.addEventListener('contextmenu', e => e.preventDefault());

  /* ---------- teclado ---------- */
  document.addEventListener('keydown', (e) => {
    if (e.altKey && e.shiftKey && e.code === 'KeyK') { e.preventDefault(); openCfg(); return; }

    if (!listModal.hidden || !cfgModal.hidden) {
      if (e.key === 'Escape') { listModal.hidden = true; cfgModal.hidden = true; }
      return;
    }
    if (!overlay.hidden) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); closeOverlay(); }
      return;
    }
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'textarea' || tag === 'input' || tag === 'select') return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      spin();
    }
  });

  spinBtn.addEventListener('click', () => { spinBtn.blur(); spin(); });

  /* ---------- inicio ---------- */
  render();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawWheel);
  if (!state.names.length) openList();
})();
