// =====================================================================
//  LoEntrego · Del planeta a Bogotá (canvas, sin librerías)
//
//  Ciclo: el globo gira → la cámara se acerca a Bogotá → se ven sus
//  avenidas reales, la malla de calles y nuestras zonas de cobertura
//  (Bogotá, Funza, Soacha) con las entregas en movimiento → se aleja.
//
//  Continentes: Natural Earth (dominio público) vía world-atlas.
//  Avenidas: trazado aproximado de las vías principales de Bogotá.
//  Zonas: los mismos polígonos del mapa de cobertura de esta web.
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
    tGlobo: 4.5,        // segundos mostrando el planeta
    tZoom: 3.2,         // segundos que tarda en acercarse (y en alejarse)
    tCiudad: 18,        // segundos sobre Bogotá
    zoomMax: 330,       // cuánto se acerca (más = más cerca)
    centroGlobo: [0.6, 0.6],
    radio: 0.43,
  };
  const LIMA = '181, 219, 46';
  const FOCO = [4.655, -74.115];          // centro de la vista de ciudad
  const BOG = [4.65, -74.08];
  const DEST = [[6.25, -75.56], [3.45, -76.53], [10.4, -75.5], [-0.18, -78.47], [-12.05, -77.04], [10.5, -66.9], [-23.55, -46.63]];

  // Zonas de cobertura (mismas coordenadas que el mapa de la web)
  const B = { b5: [4.750, -74.130], b6: [4.725, -74.150], b7: [4.700, -74.180], b8: [4.665, -74.195], b9: [4.630, -74.205], b10: [4.600, -74.200], b11: [4.575, -74.190], b12: [4.545, -74.175] };
  const ZONAS = [
    { nombre: 'Bogotá', color: '181, 219, 46', label: [4.775, -74.075], coords: [[4.795, -74.030], [4.805, -74.065], [4.800, -74.100], [4.780, -74.118], B.b5, B.b6, B.b7, B.b8, B.b9, B.b10, B.b11, B.b12, [4.510, -74.150], [4.480, -74.120], [4.470, -74.090], [4.500, -74.065], [4.550, -74.060], [4.600, -74.045], [4.655, -74.035], [4.725, -74.020]] },
    { nombre: 'Funza', color: '255, 214, 10', label: [4.712, -74.215], coords: [B.b5, B.b6, B.b7, B.b8, [4.655, -74.250], [4.700, -74.262], [4.760, -74.245], [4.768, -74.195], [4.760, -74.160]] },
    { nombre: 'Soacha', color: '45, 212, 240', label: [4.585, -74.24], coords: [B.b8, B.b9, B.b10, B.b11, B.b12, [4.525, -74.200], [4.520, -74.245], [4.555, -74.285], [4.610, -74.280], [4.655, -74.250]] },
  ];

  // Avenidas principales (trazado aproximado, [lat, lon])
  const AV = [
    { n: 'Carrera 7', p: [[4.570, -74.088], [4.598, -74.073], [4.613, -74.068], [4.636, -74.064], [4.656, -74.056], [4.684, -74.039], [4.716, -74.032], [4.750, -74.027], [4.790, -74.026]] },
    { n: 'Av. Caracas', p: [[4.560, -74.110], [4.580, -74.098], [4.602, -74.083], [4.622, -74.072], [4.648, -74.064], [4.680, -74.058], [4.704, -74.055]] },
    { n: 'Autopista Norte', p: [[4.704, -74.055], [4.735, -74.049], [4.760, -74.045], [4.800, -74.042]] },
    { n: 'NQS', p: [[4.575, -74.150], [4.596, -74.116], [4.620, -74.094], [4.645, -74.083], [4.672, -74.072], [4.692, -74.062], [4.704, -74.055]] },
    { n: 'Av. 68', p: [[4.585, -74.135], [4.618, -74.120], [4.645, -74.104], [4.668, -74.088], [4.690, -74.072], [4.705, -74.058]] },
    { n: 'Av. Boyacá', p: [[4.560, -74.150], [4.610, -74.140], [4.655, -74.118], [4.700, -74.097], [4.740, -74.078], [4.775, -74.062]] },
    { n: 'Av. Ciudad de Cali', p: [[4.600, -74.178], [4.640, -74.160], [4.680, -74.135], [4.715, -74.112], [4.740, -74.100]] },
    { n: 'Calle 26', p: [[4.613, -74.068], [4.630, -74.092], [4.655, -74.122], [4.680, -74.140], [4.698, -74.146]] },
    { n: 'Calle 80', p: [[4.667, -74.060], [4.685, -74.087], [4.704, -74.112], [4.725, -74.140], [4.740, -74.165]] },
    { n: 'Calle 13', p: [[4.606, -74.082], [4.625, -74.118], [4.648, -74.155], [4.668, -74.190], [4.688, -74.225]] },
    { n: 'Av. Américas', p: [[4.612, -74.090], [4.625, -74.125], [4.632, -74.160], [4.640, -74.190]] },
    { n: 'Primero de Mayo', p: [[4.578, -74.100], [4.592, -74.128], [4.608, -74.150], [4.622, -74.165]] },
    { n: 'Autopista Sur', p: [[4.602, -74.100], [4.592, -74.140], [4.582, -74.180], [4.574, -74.215], [4.565, -74.240]] },
    { n: 'Av. Suba', p: [[4.684, -74.054], [4.700, -74.070], [4.722, -74.083], [4.745, -74.095]] },
    { n: 'Calle 170', p: [[4.752, -74.028], [4.756, -74.058], [4.760, -74.090]] },
    { n: 'Circunvalar', p: [[4.585, -74.068], [4.608, -74.058], [4.636, -74.052], [4.662, -74.046]] },
  ];
  const ETIQUETAS = ['Av. Caracas', 'Calle 26', 'NQS', 'Autopista Norte', 'Av. Boyacá', 'Calle 80', 'Carrera 7', 'Autopista Sur'];

  const rad = Math.PI / 180;
  let W = 0, H = 0, DPR = 1, CX = 0, CY = 0, R = 0, R0 = 0;
  let lon0 = BOG[1], lat0 = 6, sinLat0 = 0, cosLat0 = 1;

  function resize() {
    const r = canvas.getBoundingClientRect();
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    R0 = W * K.radio;
  }

  function proj(lat, lon, alt = 1) {
    const la = lat * rad, lo = (lon - lon0) * rad, cl = Math.cos(la);
    const x = cl * Math.sin(lo);
    const y = cosLat0 * Math.sin(la) - sinLat0 * cl * Math.cos(lo);
    const z = sinLat0 * Math.sin(la) + cosLat0 * cl * Math.cos(lo);
    return [CX + x * R * alt, CY - y * R * alt, z];
  }

  // ---------- Datos del mundo ----------
  const dots = [];
  for (let i = 0; i < DATA.dots.length; i += 2) dots.push([DATA.dots[i] / 10, DATA.dots[i + 1] / 10]);
  const coast = DATA.coast.map((a) => { const o = []; for (let i = 0; i < a.length; i += 2) o.push([a[i] / 10, a[i + 1] / 10]); return o; });

  // ---------- Malla de calles dentro de las zonas ----------
  const pip = ([la, lo], poly) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [yi, xi] = poly[i], [yj, xj] = poly[j];
      if ((yi > la) !== (yj > la) && lo < (xj - xi) * (la - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  const inZona = (p) => ZONAS.some((z) => pip(p, z.coords));
  const grid = [];
  const pushRuns = (pts) => { let run = []; for (const p of pts) { if (inZona(p)) run.push(p); else { if (run.length > 1) grid.push(run); run = []; } } if (run.length > 1) grid.push(run); };
  const tiltG = 0.12; // la malla de Bogotá va levemente girada
  for (let la = 4.46; la <= 4.82; la += 0.0062) pushRuns(Array.from({ length: 70 }, (_, i) => { const lo = -74.30 + i * 0.0042; return [la + (lo + 74.1) * tiltG * 0.35, lo]; }));
  for (let lo = -74.30; lo <= -74.0; lo += 0.0062) pushRuns(Array.from({ length: 70 }, (_, i) => { const la = 4.46 + i * 0.0053; return [la, lo - (la - 4.65) * tiltG]; }));

  // Densifica las avenidas para que la curvatura y los cometas se vean suaves
  const dens = (pts, n = 8) => { const o = []; for (let s = 0; s < pts.length - 1; s++) for (let i = 0; i < n; i++) { const t = i / n; o.push([pts[s][0] + (pts[s + 1][0] - pts[s][0]) * t, pts[s][1] + (pts[s + 1][1] - pts[s][1]) * t]); } o.push(pts[pts.length - 1]); return o; };
  AV.forEach((a) => { a.d = dens(a.p); });

  // Rutas globales (gran círculo)
  function greatCircle(a, b, n = 48) {
    const v = (lat, lon) => [Math.cos(lat * rad) * Math.cos(lon * rad), Math.cos(lat * rad) * Math.sin(lon * rad), Math.sin(lat * rad)];
    const A = v(...a), Bv = v(...b);
    const d = Math.acos(Math.min(1, A[0] * Bv[0] + A[1] * Bv[1] + A[2] * Bv[2]));
    return Array.from({ length: n + 1 }, (_, i) => {
      const t = i / n, s1 = Math.sin((1 - t) * d) / Math.sin(d), s2 = Math.sin(t * d) / Math.sin(d);
      const x = s1 * A[0] + s2 * Bv[0], y = s1 * A[1] + s2 * Bv[1], z = s1 * A[2] + s2 * Bv[2];
      return [Math.asin(z) / rad, Math.atan2(y, x) / rad, 1 + Math.sin(t * Math.PI) * Math.min(0.2, d * 0.35)];
    });
  }
  const routes = DEST.map((d, i) => ({ pts: greatCircle(BOG, d), dur: 2.4 + (i % 3) * 0.5, delay: i * 0.5 }));

  // Órbitas fijas en el espacio
  const orbits = [
    { r: 1.22, inc: 74, node: -18, speed: 0.11, phase: 0 },
    { r: 1.34, inc: 62, node: 34, speed: -0.08, phase: 2 },
    { r: 1.47, inc: 82, node: 72, speed: 0.065, phase: 4 },
    { r: 1.6, inc: 55, node: -58, speed: -0.05, phase: 1 },
  ];
  function orbitPoint(o, a) {
    let x = Math.cos(a) * o.r, y = Math.sin(a) * o.r, z = 0;
    const i = o.inc * rad, n = o.node * rad;
    [y, z] = [y * Math.cos(i), y * Math.sin(i)];
    [x, y] = [x * Math.cos(n) - y * Math.sin(n), x * Math.sin(n) + y * Math.cos(n)];
    return [CX + x * R, CY - y * R, z];
  }

  // ---------- Ayudas de dibujo ----------
  function path(pts, alt = 1) {
    ctx.beginPath();
    let pen = false;
    for (const p of pts) {
      const [x, y, z] = proj(p[0], p[1], p[2] || alt);
      if (z > 0.02) { pen ? ctx.lineTo(x, y) : ctx.moveTo(x, y); pen = true; } else pen = false;
    }
  }
  function stroke(pts, style, width, dash) { path(pts); ctx.setLineDash(dash || []); ctx.strokeStyle = style; ctx.lineWidth = width; ctx.stroke(); ctx.setLineDash([]); }
  function comet(pts, p, len, width, color = LIMA, alpha = 1) {
    const n = pts.length - 1, head = p * (n + len), tail = head - len;
    for (let i = Math.max(0, Math.floor(tail)); i < Math.min(n, Math.ceil(head)); i++) {
      const a = proj(...pts[i]), b = proj(...pts[i + 1]);
      if (a[2] < 0.02 || b[2] < 0.02) continue;
      ctx.strokeStyle = `rgba(${color},${Math.max(0, (i - tail) / len) * alpha})`;
      ctx.lineWidth = width;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    return head >= n ? pts[n] : null;
  }
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const lerp = (a, b, k) => a + (b - a) * k;

  function drawOrbits(t, front, alpha) {
    if (alpha <= 0.01) return;
    for (const o of orbits) {
      ctx.beginPath();
      let pen = false;
      for (let k = 0; k <= 120; k++) {
        const [x, y, z] = orbitPoint(o, (k / 120) * Math.PI * 2);
        if ((z >= 0) === front) { pen ? ctx.lineTo(x, y) : ctx.moveTo(x, y); pen = true; } else pen = false;
      }
      ctx.setLineDash([2, 6]);
      ctx.strokeStyle = `rgba(255,255,255,${(front ? 0.32 : 0.12) * alpha})`;
      ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
      const a = o.phase + t * o.speed * Math.PI * 2;
      const [sx, sy, sz] = orbitPoint(o, a);
      if ((sz >= 0) === front) {
        for (let k = 1; k <= 10; k++) {
          const [px, py] = orbitPoint(o, a - Math.sign(o.speed) * k * 0.022);
          ctx.fillStyle = `rgba(${LIMA},${0.5 * (1 - k / 10) * alpha})`;
          ctx.beginPath(); ctx.arc(px, py, 2.2 * (1 - k / 14), 0, 7); ctx.fill();
        }
        ctx.fillStyle = `rgba(${LIMA},${alpha})`; ctx.shadowColor = `rgba(${LIMA},.9)`; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(sx, sy, 3, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
      }
    }
  }

  function pill(text, x, y, bg, fg, alpha, size = 12) {
    ctx.globalAlpha = alpha;
    ctx.font = `700 ${size}px Poppins, sans-serif`;
    const w = ctx.measureText(text).width + 18, h = size + 12;
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - w / 2, y - h / 2, w, h, h / 2) : ctx.rect(x - w / 2, y - h / 2, w, h); ctx.fill();
    ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y + 0.5);
    ctx.textBaseline = 'alphabetic'; ctx.globalAlpha = 1;
  }

  // ---------- Fotograma ----------
  const pings = [];
  function frame(time) {
    const t = time / 1000;
    const ciclo = K.tGlobo + K.tZoom + K.tCiudad + K.tZoom;
    const c = t % ciclo;
    // z: 0 = planeta, 1 = Bogotá
    let z = 0;
    if (c < K.tGlobo) z = 0;
    else if (c < K.tGlobo + K.tZoom) z = ease((c - K.tGlobo) / K.tZoom);
    else if (c < K.tGlobo + K.tZoom + K.tCiudad) z = 1;
    else z = 1 - ease((c - K.tGlobo - K.tZoom - K.tCiudad) / K.tZoom);

    // Cámara
    const spin = Math.sin((t / 24) * Math.PI * 2) * 30;
    const drift = Math.sin(t / 7) * 0.006;
    // Zoom hacia un punto: el centro se acerca a Bogotá al ritmo del zoom,
    // así la ciudad no se sale del cuadro mientras la cámara baja.
    const f = (Math.pow(K.zoomMax, -z) - 1 / K.zoomMax) / (1 - 1 / K.zoomMax);
    lon0 = FOCO[1] + drift + (BOG[1] + 4 + spin - FOCO[1]) * f;
    lat0 = FOCO[0] + drift * 0.6 + (6 - FOCO[0]) * f;
    sinLat0 = Math.sin(lat0 * rad); cosLat0 = Math.cos(lat0 * rad);
    R = R0 * Math.pow(K.zoomMax, z);
    CX = W * lerp(K.centroGlobo[0], 0.5, z);
    CY = H * lerp(K.centroGlobo[1], 0.5, z);
    const sm = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
    const globo = 1 - sm(0.55, 0.92, z);   // el planeta se ve durante casi todo el acercamiento
    const ciudad = sm(0.35, 0.8, z);       // la ciudad aparece mientras llegamos

    ctx.clearRect(0, 0, W, H);
    drawOrbits(t, false, globo);

    // Atmósfera y esfera
    if (globo > 0) {
      const g = ctx.createRadialGradient(CX, CY, R * 0.9, CX, CY, R * 1.18);
      g.addColorStop(0, 'rgba(140,125,255,0)'); g.addColorStop(0.35, `rgba(140,125,255,${0.35 * globo})`); g.addColorStop(1, 'rgba(140,125,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(CX, CY, R * 1.18, 0, 7); ctx.fill();
    }
    const gs = ctx.createRadialGradient(CX - R * 0.35, CY - R * 0.45, R * 0.1, CX, CY, R);
    gs.addColorStop(0, '#5A48D6'); gs.addColorStop(0.5, '#2B1F9C'); gs.addColorStop(1, '#0C0835');
    ctx.fillStyle = gs;
    if (R > W * 4) { ctx.fillStyle = '#211873'; ctx.fillRect(0, 0, W, H); } else { ctx.beginPath(); ctx.arc(CX, CY, R, 0, 7); ctx.fill(); }

    if (globo > 0) {
      ctx.globalAlpha = globo;
      for (let lo = -180; lo < 180; lo += 20) stroke(Array.from({ length: 45 }, (_, i) => [-88 + i * 4, lo]), 'rgba(255,255,255,.06)', 1);
      for (let la = -60; la <= 60; la += 20) stroke(Array.from({ length: 91 }, (_, i) => [la, -180 + i * 4]), 'rgba(255,255,255,.06)', 1);
      for (const [la, lo] of dots) {
        const [x, y, zz] = proj(la, lo);
        if (zz <= 0 || x < -4 || y < -4 || x > W + 4 || y > H + 4) continue;
        ctx.fillStyle = `rgba(200,190,255,${0.15 + zz * 0.55})`;
        ctx.fillRect(x - 1, y - 1, 1.3 + zz * 0.9, 1.3 + zz * 0.9);
      }
      for (const cl of coast) stroke(cl, `rgba(${LIMA},.5)`, 1);
      for (const r of routes) {
        stroke(r.pts, `rgba(${LIMA},.16)`, 1, [2, 4]);
        const p = ((t - r.delay) / (r.dur + 1.6)) % 1;
        if (t > r.delay && p * (r.dur + 1.6) < r.dur) comet(r.pts, p * (r.dur + 1.6) / r.dur, 10, 2);
      }
      ctx.globalAlpha = 1;
    }

    // ---------- Bogotá ----------
    if (ciudad > 0) {
      ctx.globalAlpha = ciudad;
      // Zonas de cobertura
      for (const zn of ZONAS) {
        path([...zn.coords, zn.coords[0]]);
        ctx.fillStyle = `rgba(${zn.color},.08)`; ctx.fill();
        ctx.strokeStyle = `rgba(${zn.color},.7)`; ctx.lineWidth = 1.6; ctx.setLineDash([6, 5]); ctx.stroke(); ctx.setLineDash([]);
      }
      // Malla de calles
      for (const g of grid) stroke(g, 'rgba(255,255,255,.2)', 0.8);
      // Avenidas
      for (const a of AV) stroke(a.d, 'rgba(255,255,255,.5)', 2);
      // Entregas: cometas por las avenidas y un punto que late al llegar
      AV.forEach((a, i) => {
        const dur = 2.6 + (i % 4) * 0.7, per = dur + 1.4 + (i % 3) * 0.6;
        const k = ((t + i * 0.83) % per) / dur;
        if (k <= 1) {
          const fwd = i % 2 === 0;
          const end = comet(fwd ? a.d : [...a.d].reverse(), k, 9, 3);
          if (end && !a.pinged) { pings.push({ p: end, t }); a.pinged = true; }
        } else a.pinged = false;
      });
      for (let i = pings.length - 1; i >= 0; i--) {
        const pg = pings[i], k = (t - pg.t) / 1.4;
        if (k > 1) { pings.splice(i, 1); continue; }
        const [x, y] = proj(...pg.p);
        ctx.strokeStyle = `rgba(${LIMA},${1 - k})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, 4 + k * 22, 0, 7); ctx.stroke();
        ctx.fillStyle = `rgba(${LIMA},${1 - k})`; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;
      // Nombres de zonas y avenidas
      const fs = Math.max(10, Math.min(13, W / 48));
      const nombres = sm(0.93, 1, z); // los nombres aparecen cuando la ciudad ya se ve grande
      for (const zn of ZONAS) { const [x, y] = proj(...zn.label); pill(zn.nombre, x, y, `rgba(${zn.color},.95)`, '#12092E', nombres, fs + 1); }
      for (const a of AV) {
        if (!ETIQUETAS.includes(a.n)) continue;
        const m = a.d[Math.floor(a.d.length * 0.55)];
        const [x, y] = proj(...m);
        pill(a.n, x, y, 'rgba(18,12,82,.85)', '#fff', nombres * 0.9, fs - 2);
      }
    }

    // Sombra, borde, pulso de Bogotá (solo en modo planeta)
    if (globo > 0) {
      const g = ctx.createRadialGradient(CX + R * 0.45, CY + R * 0.55, R * 0.2, CX, CY, R * 1.05);
      g.addColorStop(0, 'rgba(5,3,26,0)'); g.addColorStop(1, `rgba(5,3,26,${0.6 * globo})`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(CX, CY, R, 0, 7); ctx.fill();
      ctx.strokeStyle = `rgba(140,125,255,${0.55 * globo})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(CX, CY, R, 0, 7); ctx.stroke();
      const [bx, by, bz] = proj(...BOG);
      if (bz > 0) {
        for (const off of [0, 1.2]) {
          const k = ((t + off) % 2.4) / 2.4;
          ctx.strokeStyle = `rgba(${LIMA},${0.9 * (1 - k) * globo})`; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(bx, by, 5 + k * 22, 0, 7); ctx.stroke();
        }
        ctx.fillStyle = `rgba(${LIMA},${globo})`; ctx.beginPath(); ctx.arc(bx, by, 4.5, 0, 7); ctx.fill();
        pill('Bogotá', bx - 44, by - 26, `rgb(${LIMA})`, '#12092E', globo * Math.min(1, bz * 2));
      }
    }
    drawOrbits(t, true, globo);

    // Viñeta en modo ciudad para que el borde del mapa se funda
    if (ciudad > 0) {
      const v = ctx.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.72);
      v.addColorStop(0, 'rgba(18,12,82,0)'); v.addColorStop(1, `rgba(18,12,82,${0.9 * ciudad})`);
      ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    }
  }

  // ---------- Bucle ----------
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let visible = true, raf = 0;
  const start = performance.now() - 1500;
  const loop = (now) => { frame(now - start); raf = visible && !document.hidden ? requestAnimationFrame(loop) : 0; };
  const kick = () => { if (!raf && visible && !document.hidden && !reduce) raf = requestAnimationFrame(loop); };
  // En movimiento reducido se muestra Bogotá quieta
  const still = () => frame((K.tGlobo + K.tZoom + 2) * 1000);
  new ResizeObserver(() => { resize(); if (reduce) still(); }).observe(canvas);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; kick(); }).observe(canvas);
  document.addEventListener('visibilitychange', kick);
  resize();
  if (reduce) still(); else kick();
})();
