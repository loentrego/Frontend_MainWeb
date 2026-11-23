// =====================================================================
//  LoEntrego · Bogotá desde el cielo (versión liviana)
//
//  Lo fijo (superficie, horizonte, calles reales y órbitas) es una imagen
//  ya dibujada. Hay dos vistas y se cambia en vivo al redimensionar:
//    · oblicua (IMG/planeta-oblicuo.webp): cuando el planeta va al lado del texto.
//    · frontal (IMG/planeta-frontal.webp): cuando va solo, a todo el ancho.
//  Encima solo se animan las entregas, siguiendo trayectorias ya calculadas
//  sobre las calles (Scripts/planeta-*.json), las llegadas y los satélites.
//  Así el navegador no descarga ni procesa las calles.
//
//  Para regenerar la imagen y las trayectorias: herramientas/planeta/LEEME.md
//  Calles: © colaboradores de OpenStreetMap (ODbL).
// =====================================================================
(() => {
  'use strict';
  const canvas = document.getElementById('planeta');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  const LIMA = '181, 219, 46';
  const ENTREGAS = 40;                                    // entregas a la vez
  // ¿El planeta va al lado del texto o solo? Se mira la disposición real en pantalla.
  const texto = document.querySelector('.hero-texto');
  const alLado = () => {
    if (!texto) return !matchMedia('(max-width: 900px)').matches;
    const a = canvas.getBoundingClientRect(), b = texto.getBoundingClientRect();
    return a.top < b.bottom - 20 && a.bottom > b.top + 20 && a.left > b.left + 40;   // comparten altura y va a la derecha
  };
  const base = canvas.dataset.base || '';
  canvas.style.backgroundSize = '100% 100%';
  let variante = '';

  let D = null, rutas = [], orbitas = [];
  let W = 0, H = 0, DPR = 1, sx = 1, sy = 1;
  function medir() {
    W = canvas.clientWidth; H = canvas.clientHeight;
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (D) { sx = W / D.w; sy = H / D.h; }
  }

  // ---------- Entregas ----------
  let semilla = 7;
  const rnd = () => ((semilla = (semilla * 16807) % 2147483647) - 1) / 2147483646;
  let entregas = [];
  const pings = [];
  const nueva = (t) => ({ r: rutas[Math.floor(rnd() * rutas.length)], t0: t + rnd() * 1.5, reves: rnd() < 0.5 });

  function dibujarEntrega(e, t) {
    const pts = e.r.p, n = pts.length - 1;
    const k = (t - e.t0) / e.r.d;
    if (k < 0) return true;
    if (k > 1) { if (k < 1.3 && rnd() < 0.3) pings.push({ p: e.reves ? pts[0] : pts[n], t }); return false; }
    const len = Math.min(16, Math.max(4, n * 0.4)), head = k * (n + len), tail = head - len;
    const en = (f) => {            // posición continua sobre la trayectoria
      if (e.reves) f = n - f;
      const i = Math.min(n - 1, Math.max(0, Math.floor(f))), u = Math.min(1, Math.max(0, f - i));
      const a = pts[i], b = pts[i + 1] || a;
      return [(a[0] + (b[0] - a[0]) * u) * sx, (a[1] + (b[1] - a[1]) * u) * sy];
    };
    const h = Math.min(n, head), t0 = Math.max(0, tail);
    if (h <= t0) return true;
    ctx.lineWidth = e.r.a ? 3 : 2.3;
    let prev = en(t0), pf = t0;
    for (let f = Math.floor(t0) + 1; ; f++) {
      const ff = Math.min(f, h), cur = en(ff);
      ctx.strokeStyle = `rgba(${LIMA},${Math.min(1, Math.max(0, ((pf + ff) / 2 - tail) / len)).toFixed(3)})`;
      ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(cur[0], cur[1]); ctx.stroke();
      prev = cur; pf = ff;
      if (ff >= h) break;
    }
    if (head < n) { const [x, y] = en(head); ctx.fillStyle = `rgb(${LIMA})`; ctx.beginPath(); ctx.arc(x, y, e.r.a ? 2.3 : 1.9, 0, 7); ctx.fill(); }
    return true;
  }

  // ---------- Satélites ----------
  function dibujarSatelites(t) {
    for (const o of orbitas) {
      const N = o.p.length, pos = ((o.fase / (Math.PI * 2)) * N + t * o.vel * N) % N;
      const en = (f) => { f = ((f % N) + N) % N; const i = Math.floor(f), u = f - i, a = o.p[i], b = o.p[(i + 1) % N]; return a[2] && b[2] ? [(a[0] + (b[0] - a[0]) * u) * sx, (a[1] + (b[1] - a[1]) * u) * sy] : null; };
      const cab = en(pos);
      if (!cab) continue;
      for (let k = 1; k <= 12; k++) {
        const q = en(pos - Math.sign(o.vel) * k * 0.23);
        if (!q) break;
        const r = 2.4 * (1 - k / 16);
        ctx.fillStyle = `rgba(${LIMA},${(0.55 * (1 - k / 12)).toFixed(3)})`;
        ctx.fillRect(q[0] - r, q[1] - r, r * 2, r * 2);
      }
      ctx.fillStyle = `rgba(${LIMA},.25)`; ctx.beginPath(); ctx.arc(cab[0], cab[1], 7, 0, 7); ctx.fill();
      ctx.fillStyle = `rgb(${LIMA})`; ctx.beginPath(); ctx.arc(cab[0], cab[1], 3.2, 0, 7); ctx.fill();
    }
  }

  function cuadro(ms) {
    const t = ms / 1000;
    ctx.clearRect(0, 0, W, H);
    if (!rutas.length) return;
    dibujarSatelites(t);
    ctx.lineCap = 'round';
    while (entregas.length < ENTREGAS) entregas.push(nueva(t));
    entregas = entregas.filter((e) => dibujarEntrega(e, t));
    for (let i = pings.length - 1; i >= 0; i--) {
      const pg = pings[i], k = (t - pg.t) / 1.2;
      if (k > 1) { pings.splice(i, 1); continue; }
      const x = pg.p[0] * sx, y = pg.p[1] * sy;
      ctx.strokeStyle = `rgba(${LIMA},${(0.9 * (1 - k)).toFixed(3)})`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, 3 + k * 14, 0, 7); ctx.stroke();
      ctx.fillStyle = `rgba(${LIMA},${(1 - k).toFixed(3)})`; ctx.beginPath(); ctx.arc(x, y, 2.4, 0, 7); ctx.fill();
    }
  }

  // ---------- Bucle (se pausa fuera de pantalla) ----------
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let visible = true, raf = 0;
  const inicio = performance.now();
  const loop = (now) => { cuadro(now - inicio); raf = visible && !document.hidden ? requestAnimationFrame(loop) : 0; };
  const kick = () => { if (!raf && visible && !document.hidden && !reduce && rutas.length) raf = requestAnimationFrame(loop); };
  new ResizeObserver(() => { medir(); if (reduce) cuadro(4000); }).observe(canvas);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; kick(); }).observe(canvas);
  document.addEventListener('visibilitychange', kick);
  medir();

  // trayectorias: diferencias con el punto anterior -> píxeles de la imagen
  const deshacer = (arr) => { const o = []; let x = 0, y = 0; for (let i = 0; i < arr.length; i += 2) { x += arr[i]; y += arr[i + 1]; o.push([x, y]); } return o; };
  const cache = {};
  function cargarVariante() {
    const v = canvas.dataset.vista || (alLado() ? 'oblicuo' : 'frontal');   // data-vista fuerza una vista
    if (v === variante) return;
    variante = v;
    canvas.style.backgroundImage = `url(${base}IMG/planeta-${v}.webp?v=2)`;
    entregas = []; pings.length = 0;
    const usar = (d) => {
      if (variante !== v) return;
      D = d; rutas = d.rutasListas; orbitas = d.orbitasListas;
      medir();
      if (reduce) cuadro(4000); else kick();
    };
    if (cache[v]) { usar(cache[v]); return; }
    rutas = [];
    fetch(`${base}Scripts/planeta-${v}.json?v=3`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        d.rutasListas = d.rutas.map((r) => ({ a: r.a, d: r.d, p: deshacer(r.p) }));
        d.orbitasListas = d.orbitas.map((o) => { const p = []; for (let i = 0; i < o.p.length; i += 3) p.push([o.p[i], o.p[i + 1], o.p[i + 2]]); return { vel: o.vel, fase: o.fase, p }; });
        cache[v] = d; usar(d);
      })
      .catch(() => { /* sin trayectorias: queda la imagen fija */ });
  }
  new ResizeObserver(() => requestAnimationFrame(cargarVariante)).observe(document.querySelector('.hero') || canvas);
  window.addEventListener('resize', () => requestAnimationFrame(cargarVariante));
  cargarVariante();
})();
