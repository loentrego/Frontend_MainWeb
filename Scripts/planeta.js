// =====================================================================
//  LoEntrego · El planeta enfocado en Bogotá (canvas, sin librerías)
//
//  - Continentes reales (Natural Earth) como trama de puntos + costas.
//  - La esfera gira sola, de un lado a otro alrededor de Colombia, para
//    que Bogotá siempre quede a la vista.
//  - Sobre Bogotá, su red de calles (malla girada, barrios, avenidas y
//    cerros) con cometas lima: el movimiento de las entregas.
//  - Rutas-cometa hacia otras ciudades y 4 órbitas con satélites que pasan
//    por delante y por detrás del planeta.
//  Se pausa fuera de pantalla y respeta "movimiento reducido".
// =====================================================================
(() => {
  'use strict';
  const canvas = document.getElementById('planeta');
  const DATA = window.PLANETA_DATA;
  if (!canvas || !DATA || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');

  // ------------------------------------------------------------------
  //  PERILLAS
  // ------------------------------------------------------------------
  const K = {
    vaiven: 40,          // segundos de un vaivén completo de la esfera
    amplitud: 38,        // grados que gira hacia cada lado desde Bogotá
    inclinacion: 6,      // inclinación de la vista (grados de latitud)
    ciudadGrados: 8,   // tamaño de Bogotá sobre el planeta (exagerado para verse)
    centro: [0.6, 0.6],  // posición del planeta en el lienzo (0–1)
    radio: 0.43,         // radio del planeta relativo al ancho
  };
  const LIMA = '181, 219, 46';
  const BOG = [4.6, -74.1];
  const DEST = [[6.25, -75.56], [3.45, -76.53], [10.4, -75.5], [-0.18, -78.47], [-12.05, -77.04], [10.5, -66.9],
                [-23.55, -46.63], [-34.6, -58.4], [8.98, -79.52], [19.43, -99.13], [25.76, -80.19], [40.42, -3.7]];

  const rad = Math.PI / 180;
  let W = 0, H = 0, DPR = 1, CX = 0, CY = 0, R = 0;
  let lon0 = BOG[1], lat0 = K.inclinacion;
  let sinLat0 = 0, cosLat0 = 1;

  function resize() {
    const r = canvas.getBoundingClientRect();
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    CX = W * K.centro[0]; CY = H * K.centro[1]; R = W * K.radio;
  }

  // Proyección ortográfica: devuelve [x, y, z] (z > 0 = cara visible)
  function proj(lat, lon, alt = 1) {
    const la = lat * rad, lo = (lon - lon0) * rad;
    const cl = Math.cos(la);
    const x = cl * Math.sin(lo);
    const y = cosLat0 * Math.sin(la) - sinLat0 * cl * Math.cos(lo);
    const z = sinLat0 * Math.sin(la) + cosLat0 * cl * Math.cos(lo);
    return [CX + x * R * alt, CY - y * R * alt, z];
  }

  // ---------- Datos ----------
  const dots = [];
  for (let i = 0; i < DATA.dots.length; i += 2) dots.push([DATA.dots[i] / 10, DATA.dots[i + 1] / 10]);
  const coast = DATA.coast.map((a) => { const o = []; for (let i = 0; i < a.length; i += 2) o.push([a[i] / 10, a[i + 1] / 10]); return o; });

  // ---------- Bogotá: red de calles en coordenadas locales (-1..1) ----------
  function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; }
  const rnd = rng(42);
  const streets = [], avenues = [];
  const tilt = -0.14;
  const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
  const hills = (y) => 0.72 + Math.sin(y * 2.4) * 0.08;   // cerros al oriente
  for (let v = -1.3; v < 1.3; v += 0.1 + rnd() * 0.09) {  // carreras
    streets.push([rot(v, -1.3, tilt), rot(v, rnd() < 0.25 ? -1.3 + rnd() * 2.2 : 1.3, tilt)]);
  }
  for (let v = -1.3; v < 1.3; v += 0.09 + rnd() * 0.08) { // calles, cortadas en los cerros
    streets.push([rot(rnd() < 0.2 ? -1.3 + rnd() * 0.9 : -1.3, v, tilt), rot(hills(v), v, tilt)]);
  }
  for (let b = 0; b < 4; b++) {                           // barrios con otra inclinación
    const bx = -0.8 + rnd() * 1.2, by = -0.8 + rnd() * 1.4, a = (rnd() - 0.5) * 1.2, s = 0.25 + rnd() * 0.2;
    for (let k = 0; k <= s; k += 0.045) {
      streets.push([[bx + rot(k, 0, a)[0], by + rot(k, 0, a)[1]], [bx + rot(k, s, a)[0], by + rot(k, s, a)[1]]]);
      streets.push([[bx + rot(0, k, a)[0], by + rot(0, k, a)[1]], [bx + rot(s, k, a)[0], by + rot(s, k, a)[1]]]);
    }
  }
  const poly = (pts) => pts;
  avenues.push(poly(Array.from({ length: 24 }, (_, i) => { const y = -1.2 + i * 0.105; return [hills(y) + 0.04, y]; })));     // Circunvalar
  avenues.push(poly([[-1.1, 1.15], [-0.2, 0.25], [0.35, -0.55], [0.62, -1.2]]));          // NQS
  avenues.push(poly([[-0.75, -1.2], [-0.62, -0.3], [-0.8, 0.4], [-0.55, 1.2]]));          // Boyacá
  avenues.push(poly([[0.35, 0.1], [0.42, -1.2]]));                                        // Autopista Norte
  avenues.push(poly([[-1.1, 0.65], [-0.2, 0.35], [0.5, 0.75]]));                          // Primero de Mayo
  avenues.push(poly([[0.3, -0.15], [-1.2, -0.45]]));                                      // Calle 26
  // Clip a un círculo (la ciudad termina suave)
  const inCity = ([x, y]) => x * x + y * y < 1.05;
  const toLL = ([x, y]) => [BOG[0] - y * K.ciudadGrados, BOG[1] + x * K.ciudadGrados / Math.cos(BOG[0] * rad)];
  const cityStreets = streets
    .map(([a, b]) => Array.from({ length: 9 }, (_, i) => [a[0] + (b[0] - a[0]) * i / 8, a[1] + (b[1] - a[1]) * i / 8]))
    .map((pts) => pts.filter(inCity).map(toLL)).filter((p) => p.length > 1);
  const resample = (pts, n) => {
    const out = [];
    for (let s = 0; s < pts.length - 1; s++) for (let i = 0; i < n; i++) {
      const t = i / n; out.push([pts[s][0] + (pts[s + 1][0] - pts[s][0]) * t, pts[s][1] + (pts[s + 1][1] - pts[s][1]) * t]);
    }
    out.push(pts[pts.length - 1]);
    return out;
  };
  const cityAvenues = avenues.map((p) => resample(p, 10).filter(inCity).map(toLL)).filter((p) => p.length > 1);

  // ---------- Rutas a otras ciudades (gran círculo con altura) ----------
  function greatCircle(a, b, n = 48) {
    const v = (lat, lon) => [Math.cos(lat * rad) * Math.cos(lon * rad), Math.cos(lat * rad) * Math.sin(lon * rad), Math.sin(lat * rad)];
    const A = v(...a), B = v(...b);
    const d = Math.acos(Math.min(1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2]));
    const out = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, s1 = Math.sin((1 - t) * d) / Math.sin(d), s2 = Math.sin(t * d) / Math.sin(d);
      const x = s1 * A[0] + s2 * B[0], y = s1 * A[1] + s2 * B[1], z = s1 * A[2] + s2 * B[2];
      out.push([Math.asin(z) / rad, Math.atan2(y, x) / rad, 1 + Math.sin(t * Math.PI) * Math.min(0.22, d * 0.35)]);
    }
    return out;
  }
  const routes = DEST.map((d, i) => ({ pts: greatCircle(BOG, d), dur: 2.6 + (i % 4) * 0.6, delay: i * 0.55 }));

  // ---------- Órbitas (fijas en el espacio, no giran con la Tierra) ----------
  const orbits = [
    { r: 1.22, inc: 74, node: -18, speed: 0.11, phase: 0 },
    { r: 1.34, inc: 62, node: 34, speed: -0.08, phase: 2 },
    { r: 1.47, inc: 82, node: 72, speed: 0.065, phase: 4 },
    { r: 1.6, inc: 55, node: -58, speed: -0.05, phase: 1 },
  ];
  function orbitPoint(o, a) {
    let x = Math.cos(a) * o.r, y = Math.sin(a) * o.r, z = 0;
    const i = o.inc * rad, n = o.node * rad;
    [y, z] = [y * Math.cos(i), y * Math.sin(i)];           // inclinación
    [x, y] = [x * Math.cos(n) - y * Math.sin(n), x * Math.sin(n) + y * Math.cos(n)]; // nodo
    return [CX + x * R, CY - y * R, z];
  }

  // ---------- Dibujo ----------
  function drawOrbits(t, front) {
    for (const o of orbits) {
      ctx.beginPath();
      let pen = false;
      for (let k = 0; k <= 120; k++) {
        const [x, y, z] = orbitPoint(o, (k / 120) * Math.PI * 2);
        if ((z >= 0) === front) { pen ? ctx.lineTo(x, y) : ctx.moveTo(x, y); pen = true; } else pen = false;
      }
      ctx.setLineDash([2, 6]);
      ctx.strokeStyle = front ? 'rgba(255,255,255,.32)' : 'rgba(255,255,255,.12)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);
      // satélite con estela
      const a = o.phase + t * o.speed * Math.PI * 2;
      const [sx, sy, sz] = orbitPoint(o, a);
      if ((sz >= 0) === front) {
        for (let k = 1; k <= 10; k++) {
          const [px, py] = orbitPoint(o, a - Math.sign(o.speed) * k * 0.022);
          ctx.fillStyle = `rgba(${LIMA},${0.5 * (1 - k / 10)})`;
          ctx.beginPath(); ctx.arc(px, py, 2.2 * (1 - k / 14), 0, 7); ctx.fill();
        }
        ctx.fillStyle = `rgb(${LIMA})`;
        ctx.shadowColor = `rgba(${LIMA},.9)`; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(sx, sy, 3, 0, 7); ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
  }

  function strokeGeo(pts, style, width, dash, alt = 1) {
    ctx.beginPath();
    let pen = false;
    for (const p of pts) {
      const [x, y, z] = proj(p[0], p[1], p[2] || alt);
      if (z > 0.02) { pen ? ctx.lineTo(x, y) : ctx.moveTo(x, y); pen = true; } else pen = false;
    }
    ctx.setLineDash(dash || []);
    ctx.strokeStyle = style; ctx.lineWidth = width; ctx.stroke();
    ctx.setLineDash([]);
  }

  function comet(pts, p, len, width) {
    // p: 0..1 cabeza del cometa a lo largo de pts
    const n = pts.length - 1, head = p * (n + len), tail = head - len;
    for (let i = Math.max(0, Math.floor(tail)); i < Math.min(n, Math.ceil(head)); i++) {
      const a = proj(...pts[i]), b = proj(...pts[i + 1]);
      if (a[2] < 0.02 || b[2] < 0.02) continue;
      const f = (i - tail) / len;
      ctx.strokeStyle = `rgba(${LIMA},${Math.max(0, f)})`;
      ctx.lineWidth = width;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
  }

  function frame(time) {
    const t = time / 1000;
    lon0 = BOG[1] + 4 + Math.sin((t / K.vaiven) * Math.PI * 2) * K.amplitud;
    lat0 = K.inclinacion + Math.sin((t / K.vaiven) * Math.PI * 4) * 3;
    sinLat0 = Math.sin(lat0 * rad); cosLat0 = Math.cos(lat0 * rad);

    ctx.clearRect(0, 0, W, H);
    drawOrbits(t, false);

    // Atmósfera
    let g = ctx.createRadialGradient(CX, CY, R * 0.9, CX, CY, R * 1.18);
    g.addColorStop(0, 'rgba(140,125,255,0)'); g.addColorStop(0.35, 'rgba(140,125,255,.35)'); g.addColorStop(1, 'rgba(140,125,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(CX, CY, R * 1.18, 0, 7); ctx.fill();
    // Esfera
    g = ctx.createRadialGradient(CX - R * 0.35, CY - R * 0.45, R * 0.1, CX, CY, R);
    g.addColorStop(0, '#5A48D6'); g.addColorStop(0.5, '#2B1F9C'); g.addColorStop(1, '#0C0835');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(CX, CY, R, 0, 7); ctx.fill();

    // Retícula
    for (let lo = -180; lo < 180; lo += 20) strokeGeo(Array.from({ length: 45 }, (_, i) => [-88 + i * 4, lo]), 'rgba(255,255,255,.06)', 1);
    for (let la = -60; la <= 60; la += 20) strokeGeo(Array.from({ length: 91 }, (_, i) => [la, -180 + i * 4]), 'rgba(255,255,255,.06)', 1);

    // Tierra: puntos (más brillantes al frente)
    for (const [la, lo] of dots) {
      const [x, y, z] = proj(la, lo);
      if (z <= 0) continue;
      ctx.fillStyle = `rgba(200,190,255,${0.15 + z * 0.55})`;
      ctx.fillRect(x - 1, y - 1, 1.3 + z * 0.9, 1.3 + z * 0.9);
    }
    // Costas
    for (const c of coast) strokeGeo(c, `rgba(${LIMA},.5)`, 1);

    // Bogotá: calles, avenidas y cometas sobre la superficie
    const [bx, by, bz] = proj(...BOG);
    if (bz > 0) {
      g = ctx.createRadialGradient(bx, by, 0, bx, by, R * 0.2);
      g.addColorStop(0, `rgba(${LIMA},.22)`); g.addColorStop(1, `rgba(${LIMA},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, R * 0.2, 0, 7); ctx.fill();
      for (const s of cityStreets) strokeGeo(s, 'rgba(255,255,255,.5)', 0.9, [1.5, 2.5]);
      for (const a of cityAvenues) strokeGeo(a, 'rgba(255,255,255,.8)', 1.6, [4, 3]);
      cityAvenues.forEach((a, i) => comet(a, ((t + i * 0.7) / (2.2 + (i % 3) * 0.5)) % 1, 5, 2.8));
    }

    // Rutas a otras ciudades
    for (const r of routes) {
      strokeGeo(r.pts, `rgba(${LIMA},.16)`, 1, [2, 4]);
      const p = ((t - r.delay) / (r.dur + 1.6)) % 1;
      if (t > r.delay && p * (r.dur + 1.6) < r.dur) comet(r.pts, p * (r.dur + 1.6) / r.dur, 10, 2);
    }

    // Sombra del lado nocturno y borde
    g = ctx.createRadialGradient(CX + R * 0.45, CY + R * 0.55, R * 0.2, CX, CY, R * 1.05);
    g.addColorStop(0, 'rgba(5,3,26,.0)'); g.addColorStop(1, 'rgba(5,3,26,.6)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(CX, CY, R, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(140,125,255,.55)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(CX, CY, R, 0, 7); ctx.stroke();

    // Pulso de Bogotá y etiqueta
    if (bz > 0) {
      for (const off of [0, 1.2]) {
        const k = ((t + off) % 2.4) / 2.4;
        ctx.strokeStyle = `rgba(${LIMA},${0.9 * (1 - k)})`; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(bx, by, 5 + k * 22, 0, 7); ctx.stroke();
      }
      ctx.fillStyle = `rgb(${LIMA})`; ctx.strokeStyle = '#12092E'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(bx, by, 4.5, 0, 7); ctx.fill(); ctx.stroke();
      ctx.globalAlpha = Math.min(1, bz * 2);
      ctx.font = '700 12px Poppins, sans-serif';
      const tw = ctx.measureText('Bogotá').width + 18, lx = bx - tw - 16, ly = by - 34;
      ctx.strokeStyle = `rgba(${LIMA},.7)`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(bx - 4, by - 4); ctx.lineTo(lx + tw, ly + 12); ctx.stroke();
      ctx.fillStyle = `rgb(${LIMA})`;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(lx, ly, tw, 24, 12) : ctx.rect(lx, ly, tw, 24); ctx.fill();
      ctx.fillStyle = '#12092E'; ctx.textAlign = 'center'; ctx.fillText('Bogotá', lx + tw / 2, ly + 16.5);
      ctx.globalAlpha = 1;
    }

    drawOrbits(t, true);
  }

  // ---------- Bucle (pausa fuera de pantalla) ----------
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let visible = true, raf = 0, start = performance.now() - 6000;
  const loop = (now) => { frame(now - start); raf = visible && !document.hidden ? requestAnimationFrame(loop) : 0; };
  const kick = () => { if (!raf && visible && !document.hidden && !reduce) raf = requestAnimationFrame(loop); };
  new ResizeObserver(() => { resize(); if (reduce || !raf) frame(reduce ? 0 : performance.now() - start); }).observe(canvas);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; kick(); }).observe(canvas);
  document.addEventListener('visibilitychange', kick);
  resize();
  if (reduce) frame(0); else kick();
})();
