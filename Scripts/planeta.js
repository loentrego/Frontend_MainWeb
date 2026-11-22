// =====================================================================
//  LoEntrego · Bogotá desde el cielo (canvas, sin librerías)
//
//  La superficie del planeta con su curvatura: el horizonte arriba con la
//  atmósfera y, sobre la superficie, nuestras zonas de cobertura (Bogotá,
//  Funza y Soacha) con sus calles y las entregas en movimiento.
//
//  Truco: la zona se "agranda" sobre una esfera para que se vea la
//  curvatura del planeta y, a la vez, se lean las calles.
//  Calles: © colaboradores de OpenStreetMap (ODbL), en Scripts/bogota-calles.js.
//  Si ese archivo no carga, se usa un trazado aproximado de respaldo.
//  Zonas: los mismos polígonos del mapa de cobertura de esta web.
//  Se pausa fuera de pantalla y respeta "movimiento reducido".
// =====================================================================
(() => {
  'use strict';
  const canvas = document.getElementById('planeta');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');

  // ------------------------------------------------------------------
  //  PERILLAS
  // ------------------------------------------------------------------
  const K = {
    escala: 150,       // cuánto se agranda la zona sobre la esfera (curvatura vs. detalle)
    inclinacion: 44,   // grados que se inclina la vista (más = horizonte más cerca)
    periodo: 40,       // segundos de un vaivén completo
    entregas: 70,      // entregas simultáneas por las calles
  };
  const LIMA = '181, 219, 46';
  const C = [4.655, -74.13];                 // centro de la zona de servicio

  // ---------- Zonas de cobertura (mismas coordenadas que el mapa de la web) ----------
  const B = { b5: [4.750, -74.130], b6: [4.725, -74.150], b7: [4.700, -74.180], b8: [4.665, -74.195], b9: [4.630, -74.205], b10: [4.600, -74.200], b11: [4.575, -74.190], b12: [4.545, -74.175] };
  const ZONAS = [
    { nombre: 'Bogotá', color: '181, 219, 46', label: [4.73, -74.07], coords: [[4.795, -74.030], [4.805, -74.065], [4.800, -74.100], [4.780, -74.118], B.b5, B.b6, B.b7, B.b8, B.b9, B.b10, B.b11, B.b12, [4.510, -74.150], [4.480, -74.120], [4.470, -74.090], [4.500, -74.065], [4.550, -74.060], [4.600, -74.045], [4.655, -74.035], [4.725, -74.020]] },
    { nombre: 'Funza', color: '255, 214, 10', label: [4.712, -74.215], coords: [B.b5, B.b6, B.b7, B.b8, [4.655, -74.250], [4.700, -74.262], [4.760, -74.245], [4.768, -74.195], [4.760, -74.160]] },
    { nombre: 'Soacha', color: '45, 212, 240', label: [4.585, -74.245], coords: [B.b8, B.b9, B.b10, B.b11, B.b12, [4.525, -74.200], [4.520, -74.245], [4.555, -74.285], [4.610, -74.280], [4.655, -74.250]] },
  ];
  // Avenidas principales (trazado aproximado)
  const AV = [
    [[4.570, -74.088], [4.613, -74.068], [4.656, -74.056], [4.684, -74.039], [4.750, -74.027], [4.790, -74.026]],
    [[4.560, -74.110], [4.602, -74.083], [4.648, -74.064], [4.704, -74.055], [4.760, -74.045], [4.800, -74.042]],
    [[4.575, -74.150], [4.596, -74.116], [4.645, -74.083], [4.692, -74.062], [4.704, -74.055]],
    [[4.585, -74.135], [4.645, -74.104], [4.690, -74.072], [4.705, -74.058]],
    [[4.560, -74.150], [4.610, -74.140], [4.655, -74.118], [4.700, -74.097], [4.775, -74.062]],
    [[4.600, -74.178], [4.640, -74.160], [4.680, -74.135], [4.740, -74.100]],
    [[4.613, -74.068], [4.655, -74.122], [4.698, -74.146]],
    [[4.667, -74.060], [4.704, -74.112], [4.740, -74.165]],
    [[4.606, -74.082], [4.648, -74.155], [4.688, -74.225], [4.712, -74.255]],
    [[4.612, -74.090], [4.632, -74.160], [4.640, -74.190]],
    [[4.578, -74.100], [4.608, -74.150], [4.622, -74.165]],
    [[4.602, -74.100], [4.582, -74.180], [4.565, -74.240], [4.555, -74.275]],
    [[4.684, -74.054], [4.722, -74.083], [4.745, -74.095]],
    [[4.752, -74.028], [4.760, -74.090]],
  ];

  // ---------- Geometría ----------
  const rad = Math.PI / 180;
  const pip = ([la, lo], poly) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [yi, xi] = poly[i], [yj, xj] = poly[j];
      if ((yi > la) !== (yj > la) && lo < (xj - xi) * (la - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  const enZona = (p) => ZONAS.some((z) => pip(p, z.coords));
  const dens = (pts, step = 0.0025) => {
    const o = [];
    for (let s = 0; s < pts.length - 1; s++) {
      const [a, b] = [pts[s], pts[s + 1]];
      const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
      for (let i = 0; i < n; i++) o.push([a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]);
    }
    o.push(pts[pts.length - 1]);
    return o;
  };

  // Malla de calles (secundarias) dentro de las zonas, levemente girada
  const calles = [];
  const corta = (pts) => {
    let run = [];
    for (const p of pts) { if (enZona(p)) run.push(p); else { if (run.length > 3) calles.push(run); run = []; } }
    if (run.length > 3) calles.push(run);
  };
  const tg = 0.1;
  for (let la = 4.47; la <= 4.81; la += 0.0058) corta(Array.from({ length: 140 }, (_, i) => { const lo = -74.30 + i * 0.0021; return [la + (lo + 74.13) * tg * 0.3, lo]; }));
  for (let lo = -74.29; lo <= -74.01; lo += 0.0058) corta(Array.from({ length: 140 }, (_, i) => { const la = 4.46 + i * 0.0026; return [la, lo - (la - 4.65) * tg]; }));
  let avenidas = AV.map((a) => dens(a));

  // Calles reales de OpenStreetMap (reemplazan la malla aproximada)
  const OSM = window.BOGOTA_CALLES;
  const dec = (arr) => arr.map((f) => { const o = []; for (let i = 0; i < f.length; i += 2) o.push([f[i] / 1e4, f[i + 1] / 1e4]); return o; });
  const calleLen = (pts) => pts.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0);
  let rutasAv = avenidas, rutasCa = calles;
  if (OSM) {
    avenidas = dec(OSM.av);
    calles.length = 0; calles.push(...dec(OSM.ca));
    // para las entregas: tramos con algo de recorrido
    rutasAv = avenidas.filter((p) => calleLen(p) > 0.006);
    rutasCa = calles.filter((p) => calleLen(p) > 0.004);
  }

  // Entregas: tramos de calles o avenidas, en cualquiera de las tres zonas
  function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; }
  const rnd = rng(7);
  function nuevaEntrega(t) {
    const usaAv = rnd() < 0.45;
    const pool = usaAv ? rutasAv : rutasCa;
    let tramo = dens(pool[Math.floor(rnd() * pool.length)], 0.0012);
    if (tramo.length > 60) { const s0 = Math.floor(rnd() * (tramo.length - 60)); tramo = tramo.slice(s0, s0 + 60); }
    if (rnd() < 0.5) tramo = tramo.reverse();
    return { tramo, t0: t + rnd() * 1.5, dur: 1.4 + rnd() * 2 + (usaAv ? 0.8 : 0), av: usaAv };
  }
  let entregas = [];
  const pings = [];

  // ---------- Proyección: la zona agrandada sobre una esfera ----------
  let W = 0, H = 0, DPR = 1, R = 0, CX = 0, CY = 0, lon0 = 0, lat0 = 0, sL = 0, cL = 1;
  const capa = document.createElement('canvas');   // calles, zonas y superficie: se dibujan una vez
  let capaLista = false;
  function resize() {
    const r = canvas.getBoundingClientRect();
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    R = W * 0.92;                     // esfera grande: solo se ve la parte de arriba
    CX = W * 0.5; CY = H * 0.16 + R;  // el horizonte queda cerca del borde superior
    capaLista = false;
  }
  function proj([la, lo]) {
    const lat = C[0] + (la - C[0]) * K.escala, lon = C[1] + (lo - C[1]) * K.escala;
    const a = lat * rad, b = (lon - lon0) * rad, ca = Math.cos(a);
    const x = ca * Math.sin(b);
    const y = cL * Math.sin(a) - sL * ca * Math.cos(b);
    const z = sL * Math.sin(a) + cL * ca * Math.cos(b);
    return [CX + x * R, CY - y * R, z];
  }
  function linea(pts) {
    ctx.beginPath();
    let pen = false;
    for (const p of pts) {
      const [x, y, z] = proj(p);
      if (z > 0) { pen ? ctx.lineTo(x, y) : ctx.moveTo(x, y); pen = true; } else pen = false;
    }
  }

  // Trama de puntos sobre la superficie (más brillantes dentro de las zonas)
  const puntos = [];
  for (let la = 4.0; la <= 5.45; la += 0.0105) for (let lo = -74.95; lo <= -73.35; lo += 0.0105) {
    const j = ((la * 977 + lo * 131) % 1) * 0.004;
    const p = [la + j, lo - j];
    puntos.push([p, enZona(p)]);
  }

  // Órbitas alrededor del planeta (fijas en el espacio)
  const orbitas = [
    { r: 1.06, inc: 14, nodo: 22, vel: 0.022, fase: 1.2 },
    { r: 1.1, inc: 22, nodo: -30, vel: -0.018, fase: 2.0 },
    { r: 1.15, inc: 10, nodo: -8, vel: 0.014, fase: 1.6 },
    { r: 1.21, inc: 28, nodo: 38, vel: -0.012, fase: 1.9 },
  ];
  function orbita(o, a) {
    let x = Math.cos(a) * o.r, y = Math.sin(a) * o.r, z = 0;
    const i = o.inc * rad, n = o.nodo * rad;
    [y, z] = [y * Math.cos(i), y * Math.sin(i)];
    [x, y] = [x * Math.cos(n) - y * Math.sin(n), x * Math.sin(n) + y * Math.cos(n)];
    return [CX + x * R, CY - y * R, z];
  }
  function dibujaOrbitas(t, frente) {
    for (const o of orbitas) {
      ctx.beginPath();
      let pen = false;
      for (let k = 0; k <= 240; k++) {
        const [x, y, z] = orbita(o, (k / 240) * Math.PI * 2);
        if ((z >= 0) === frente && y < H + 20) { pen ? ctx.lineTo(x, y) : ctx.moveTo(x, y); pen = true; } else pen = false;
      }
      ctx.setLineDash([2, 6]);
      ctx.strokeStyle = frente ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.14)';
      ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
      const a = o.fase + t * o.vel * Math.PI * 2;
      const [sx, sy, sz] = orbita(o, a);
      if ((sz >= 0) !== frente) continue;
      for (let k = 1; k <= 12; k++) {
        const [px, py] = orbita(o, a - Math.sign(o.vel) * k * 0.006);
        ctx.fillStyle = `rgba(${LIMA},${0.55 * (1 - k / 12)})`;
        ctx.beginPath(); ctx.arc(px, py, 2.4 * (1 - k / 16), 0, 7); ctx.fill();
      }
      ctx.fillStyle = `rgb(${LIMA})`; ctx.shadowColor = `rgba(${LIMA},.9)`; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(sx, sy, 3.2, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
    }
  }

  const estrellas = Array.from({ length: 70 }, () => [rnd(), rnd() * 0.3, 0.4 + rnd() * 0.9, rnd() * 4]);

  function pintarCapa() {
    capa.width = Math.round(W * DPR); capa.height = Math.round(H * DPR);
    const c = capa.getContext('2d');
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    const linea = (pts) => {
      c.beginPath();
      let pen = false;
      for (const p of pts) { const [x, y, z] = proj(p); if (z > 0) { pen ? c.lineTo(x, y) : c.moveTo(x, y); pen = true; } else pen = false; }
    };
    // Atmósfera
    let g = c.createRadialGradient(CX, CY, R * 0.97, CX, CY, R * 1.09);
    g.addColorStop(0, 'rgba(140,125,255,.55)'); g.addColorStop(0.4, 'rgba(140,125,255,.18)'); g.addColorStop(1, 'rgba(140,125,255,0)');
    c.fillStyle = g; c.beginPath(); c.arc(CX, CY, R * 1.09, 0, 7); c.fill();
    // Superficie
    g = c.createLinearGradient(0, CY - R, 0, H);
    g.addColorStop(0, '#3A2BB8'); g.addColorStop(0.25, '#2A1F96'); g.addColorStop(1, '#170F5C');
    c.fillStyle = g; c.beginPath(); c.arc(CX, CY, R, 0, 7); c.fill();
    c.strokeStyle = 'rgba(200,190,255,.7)'; c.lineWidth = 1.5; c.beginPath(); c.arc(CX, CY, R, Math.PI, 0); c.stroke();

    // Trama de puntos (la "tierra" vista desde arriba)
    for (const [p, dentro] of puntos) {
      const [x, y, z] = proj(p);
      if (z <= 0 || x < -2 || x > W + 2 || y < 0 || y > H + 2) continue;
      c.fillStyle = dentro ? `rgba(220,214,255,${0.18 + z * 0.4})` : `rgba(200,190,255,${0.06 + z * 0.22})`;
      const sz = dentro ? 1.6 : 1.3;
      c.fillRect(x - sz / 2, y - sz / 2, sz, sz);
    }

    // Zonas
    for (const z of ZONAS) {
      linea([...z.coords, z.coords[0]]);
      c.fillStyle = `rgba(${z.color},.07)`; c.fill();
      c.setLineDash([6, 5]); c.strokeStyle = `rgba(${z.color},.75)`; c.lineWidth = 1.6; c.stroke(); c.setLineDash([]);
    }
    // Calles y avenidas
    c.strokeStyle = 'rgba(200,190,255,.14)'; c.lineWidth = 0.6;
    for (const k of calles) { linea(k); c.stroke(); }
    c.strokeStyle = 'rgba(220,214,255,.26)'; c.lineWidth = 1.1;
    for (const a of avenidas) { linea(a); c.stroke(); }

    capaLista = true;
  }

  // ---------- Fotograma ----------
  function frame(ms) {
    const t = ms / 1000;
    lon0 = C[1];
    lat0 = C[0] - K.inclinacion;
    sL = Math.sin(lat0 * rad); cL = Math.cos(lat0 * rad);
    if (!capaLista) pintarCapa();

    ctx.clearRect(0, 0, W, H);
    for (const [x, y, r, d] of estrellas) {
      ctx.fillStyle = `rgba(255,255,255,${0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.3 + d))})`;
      ctx.beginPath(); ctx.arc(x * W, y * H, r, 0, 7); ctx.fill();
    }
    dibujaOrbitas(t, false);
    ctx.drawImage(capa, 0, 0, W, H);

    // Entregas
    while (entregas.length < K.entregas) entregas.push(nuevaEntrega(t));
    entregas = entregas.filter((e) => {
      const k = (t - e.t0) / e.dur;
      if (k < 0) return true;
      if (k > 1) { pings.push({ p: e.tramo[e.tramo.length - 1], t }); return false; }
      const n = e.tramo.length - 1, len = Math.max(3, n * 0.45), head = k * (n + len), tail = head - len;
      for (let i = Math.max(0, Math.floor(tail)); i < Math.min(n, Math.ceil(head)); i++) {
        const [x1, y1, z1] = proj(e.tramo[i]), [x2, y2, z2] = proj(e.tramo[i + 1]);
        if (z1 <= 0 || z2 <= 0) continue;
        ctx.strokeStyle = `rgba(${LIMA},${Math.max(0, (i - tail) / len)})`;
        ctx.lineWidth = e.av ? 3.2 : 2.4;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      }
      return true;
    });
    for (let i = pings.length - 1; i >= 0; i--) {
      const pg = pings[i], k = (t - pg.t) / 1.2;
      if (k > 1) { pings.splice(i, 1); continue; }
      const [x, y, z] = proj(pg.p);
      if (z <= 0) continue;
      ctx.strokeStyle = `rgba(${LIMA},${0.9 * (1 - k)})`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, 3 + k * 14, 0, 7); ctx.stroke();
      ctx.fillStyle = `rgba(${LIMA},${1 - k})`; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 7); ctx.fill();
    }

    // Nombres de las zonas
    const fs = Math.max(11, Math.min(14, W / 44));
    ctx.font = `700 ${fs}px Poppins, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const z of ZONAS) {
      const [x, y, zz] = proj(z.label);
      if (zz <= 0) continue;
      const w = ctx.measureText(z.nombre).width + 20, h = fs + 12;
      ctx.fillStyle = `rgba(${z.color},.95)`;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - w / 2, y - h / 2, w, h, h / 2) : ctx.rect(x - w / 2, y - h / 2, w, h); ctx.fill();
      ctx.fillStyle = '#12092E'; ctx.fillText(z.nombre, x, y + 0.5);
    }
    ctx.textBaseline = 'alphabetic';
    dibujaOrbitas(t, true);
  }

  // ---------- Bucle ----------
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let visible = true, raf = 0;
  const start = performance.now();
  const loop = (now) => { frame(now - start); raf = visible && !document.hidden ? requestAnimationFrame(loop) : 0; };
  const kick = () => { if (!raf && visible && !document.hidden && !reduce) raf = requestAnimationFrame(loop); };
  new ResizeObserver(() => { resize(); if (reduce) frame(0); }).observe(canvas);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; kick(); }).observe(canvas);
  document.addEventListener('visibilitychange', kick);
  resize();
  if (reduce) frame(0); else kick();
})();
