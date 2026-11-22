// =====================================================================
//  LoEntrego · Bogotá desde el cielo (canvas, sin librerías)
//
//  La superficie del planeta con su curvatura: el horizonte arriba con la
//  atmósfera y, sobre la superficie, nuestras zonas de cobertura (Bogotá,
//  Funza y Soacha) con sus calles y las entregas en movimiento.
//
//  Truco: la zona se "agranda" sobre una esfera para que se vea la
//  curvatura del planeta y, a la vez, se lean las calles.
//  Calles: © colaboradores de OpenStreetMap (ODbL), en Scripts/bogota-calles.json (se descarga aparte).
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
    escala: 80,        // cuánto se agranda la zona sobre la esfera (curvatura vs. detalle)
    mira: [4.66, -74.14],  // punto del mapa al que apunta la cámara
    altura: 0.3,      // altura de la cámara sobre la superficie (radio = 1)
    atras: 0.3,       // cuánto se aleja la cámara hacia atrás de la mira
    rumbo: 20,         // hacia dónde mira (0 = norte)
    picada: 46,        // grados que mira hacia abajo
    ladeo: -16,         // giro de la vista (horizonte inclinado)
    lente: 0.78,       // distancia focal (más = más zoom)
    periodo: 40,       // segundos de un vaivén completo
    entregas: 46,      // entregas simultáneas recorriendo las calles
  };
  const LIMA = '181, 219, 46';
  const C = [4.655, -74.13];                 // centro de la zona de servicio

  // ---------- Zonas de cobertura (mismas coordenadas que el mapa de la web) ----------
  const B = { b5: [4.750, -74.130], b6: [4.725, -74.150], b7: [4.700, -74.180], b8: [4.665, -74.195], b9: [4.630, -74.205], b10: [4.600, -74.200], b11: [4.575, -74.190], b12: [4.545, -74.175] };
  const ZONAS = [
    { nombre: 'Bogotá', color: '181, 219, 46', label: [4.73, -74.07], coords: [[4.795, -74.030], [4.805, -74.065], [4.800, -74.100], [4.780, -74.118], B.b5, B.b6, B.b7, B.b8, B.b9, B.b10, B.b11, B.b12, [4.510, -74.150], [4.480, -74.120], [4.470, -74.090], [4.500, -74.065], [4.550, -74.060], [4.600, -74.045], [4.655, -74.035], [4.725, -74.020]] },
    { nombre: 'Funza', color: '255, 214, 10', label: [4.752, -74.18], coords: [B.b5, B.b6, B.b7, B.b8, [4.655, -74.250], [4.700, -74.262], [4.760, -74.245], [4.768, -74.195], [4.760, -74.160]] },
    { nombre: 'Soacha', color: '45, 212, 240', label: [4.54, -74.262], coords: [B.b8, B.b9, B.b10, B.b11, B.b12, [4.525, -74.200], [4.520, -74.245], [4.555, -74.285], [4.610, -74.280], [4.655, -74.250]] },
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
  // Respaldo, solo si no se pueden descargar las calles reales
  function mallaRespaldo() {
    const tg = 0.1;
    for (let la = 4.47; la <= 4.81; la += 0.0058) corta(Array.from({ length: 140 }, (_, i) => { const lo = -74.30 + i * 0.0021; return [la + (lo + 74.13) * tg * 0.3, lo]; }));
    for (let lo = -74.29; lo <= -74.01; lo += 0.0058) corta(Array.from({ length: 140 }, (_, i) => { const la = 4.46 + i * 0.0026; return [la, lo - (la - 4.65) * tg]; }));
    avenidas = AV.map((a) => dens(a));
    rutasAv = avenidas; rutasCa = calles;
    listo();
  }
  let avenidas = [];
  let OSM = null;

  // Calles reales de OpenStreetMap (reemplazan la malla aproximada)
  const dec = (arr) => arr.map((f) => {
    const o = [];
    let la = 0, lo = 0;
    for (let i = 0; i < f.length; i += 2) {
      if (OSM.delta && i) { la += f[i]; lo += f[i + 1]; } else { la = f[i]; lo = f[i + 1]; }
      o.push([la / 1e4, lo / 1e4]);
    }
    return o;
  });
  const largos = new WeakMap();   // largo de cada vía, se calcula una sola vez
  const calleLen = (pts) => {
    let l = largos.get(pts);
    if (l === undefined) { l = 0; for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); largos.set(pts, l); }
    return l;
  };
  // Caja de las zonas: descarta rápido lo que está lejos antes de la prueba fina
  const enZonaRapido = (p) => p[0] > 4.46 && p[0] < 4.81 && p[1] > -74.29 && p[1] < -74.01 && enZona(p);
  let rutasAv = [], rutasCa = [], rutasPeriferia = [];
  function usarOSM(datos) {
    OSM = datos;
    avenidas = dec(OSM.av);
    calles.length = 0; calles.push(...dec(OSM.ca));
    // para las entregas: tramos con algo de recorrido
    rutasAv = avenidas.filter((p) => calleLen(p) > 0.006);
    rutasCa = calles.filter((p) => calleLen(p) > 0.004);
    // calles de Funza y Soacha: una parte fija de las entregas va allá
    rutasPeriferia = calles.filter((p) => p[0][1] < -74.13 && calleLen(p) > 0.0015 && (pip(p[0], ZONAS[1].coords) || pip(p[0], ZONAS[2].coords)));
    listo();
  }
  // Con las calles listas: se redibuja la capa y, en un rato libre, se arma la red
  function listo() {
    capaLista = false;
    (window.requestIdleCallback || setTimeout)(armarRed);
  }

  // Red de calles: cada vía es una arista y sus extremos son cruces.
  // Las entregas recorren la red de cruce en cruce, como un repartidor.
  const nodoDe = (p) => Math.round(p[0] * 1e4) + ',' + Math.round(p[1] * 1e4);
  const red = new Map();
  const aristas = new Map();
  const conecta = (pts, av) => {
    if (pts.length < 2) return;
    const e = { pts, av, a: nodoDe(pts[0]), b: nodoDe(pts[pts.length - 1]), len: calleLen(pts) };
    aristas.set(pts, e);
    for (const [n, ida] of [[e.a, true], [e.b, false]]) { if (!red.has(n)) red.set(n, []); red.get(n).push({ e, ida }); }
  };
  // La red se arma después del primer cuadro, para no retrasar la aparición
  let redLista = false;
  const armarRed = () => { avenidas.forEach((p) => conecta(p, true)); calles.forEach((p) => conecta(p, false)); redLista = true; };
  const rumbo = (a, b) => Math.atan2(b[0] - a[0], b[1] - a[1]);

  function recorrido(inicio, meta) {
    if (!redLista) return { ruta: rnd() < 0.5 ? inicio : [...inicio].reverse(), largo: calleLen(inicio), av: rutasAv.includes(inicio) };
    let e = aristas.get(inicio), ida = rnd() < 0.5;
    const ruta = [];
    let largo = 0, av = e.av;
    for (let paso = 0; paso < 40; paso++) {
      const pts = ida ? e.pts : [...e.pts].reverse();
      ruta.push(...(ruta.length ? pts.slice(1) : pts));
      largo += e.len;
      if (largo >= meta) break;
      // en el cruce: seguir lo más derecho posible, a veces girar
      const fin = ruta[ruta.length - 1], dir = rumbo(ruta[ruta.length - 2], fin);
      const ops = (red.get(nodoDe(fin)) || []).filter((o) => o.e !== e).map((o) => {
        const q = o.ida ? o.e.pts : [...o.e.pts].reverse();
        let d = Math.abs(rumbo(q[0], q[1]) - dir); if (d > Math.PI) d = 2 * Math.PI - d;
        return { o, d };
      }).filter((x) => x.d < 2.2);
      if (!ops.length) break;
      ops.sort((x, y) => x.d - y.d);
      const x = rnd() < 0.7 || ops.length === 1 ? ops[0] : ops[1 + Math.floor(rnd() * (ops.length - 1))];
      e = x.o.e; ida = x.o.ida; av = av || e.av;
    }
    return { ruta, largo, av };
  }

  function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; }
  const rnd = rng(7);
  function nuevaEntrega(t) {
    const r0 = rnd();
    const usaAv = r0 < 0.35;
    const pool = !usaAv && r0 < 0.6 && rutasPeriferia.length ? rutasPeriferia : usaAv ? rutasAv : rutasCa;
    const { ruta, largo, av } = recorrido(pool[Math.floor(rnd() * pool.length)], 0.025 + rnd() * 0.035);
    const tramo = dens(ruta, 0.0012);
    return { tramo, t0: t + rnd() * 1.5, dur: 1.2 + largo / 0.014, av };
  }
  let entregas = [];
  const pings = [];

  // ---------- Cámara: vista oblicua desde el espacio, como una foto desde la órbita ----------
  //  La zona se agranda sobre una esfera de radio 1. Una cámara en perspectiva
  //  flota sobre ella, mira hacia el horizonte y va un poco ladeada.
  let W = 0, H = 0, DPR = 1, F = 1, CX = 0, CY = 0;
  const capa = document.createElement('canvas');   // superficie, puntos y calles: se dibujan una vez
  let capaLista = false;
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const uni = (a) => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; };
  const suma = (...vs) => vs.reduce((s, [k, v]) => [s[0] + k * v[0], s[1] + k * v[1], s[2] + k * v[2]], [0, 0, 0]);
  const esfera = (la, lo) => { const a = la * rad, b = lo * rad; return [Math.cos(a) * Math.cos(b), Math.cos(a) * Math.sin(b), Math.sin(a)]; };
  const mundo = ([la, lo]) => esfera(C[0] + (la - C[0]) * K.escala, (lo - C[1]) * K.escala);

  let PC, PCd, DV, RV, UV;   // posición de la cámara, su distancia, y sus ejes (adelante, derecha, arriba)
  function camara() {
    const T = mundo(K.mira);                         // punto de la superficie bajo la mira
    const lat = Math.asin(T[2]), lon = Math.atan2(T[1], T[0]);
    const E = [-Math.sin(lon), Math.cos(lon), 0];
    const N = [-Math.sin(lat) * Math.cos(lon), -Math.sin(lat) * Math.sin(lon), Math.cos(lat)];
    const h = K.rumbo * rad, p = K.picada * rad, r = K.ladeo * rad;
    const Fh = suma([Math.cos(h), N], [Math.sin(h), E]);
    PC = suma([1 + K.altura, T], [-K.atras, Fh]);
    PCd = Math.hypot(...PC);
    DV = uni(suma([Math.cos(p), Fh], [-Math.sin(p), T]));
    const R0 = uni(cruz(DV, T)), U0 = cruz(R0, DV);
    RV = suma([Math.cos(r), R0], [Math.sin(r), U0]);
    UV = suma([-Math.sin(r), R0], [Math.cos(r), U0]);
  }
  function verP(P) {                                  // punto 3D -> pantalla
    const v = [P[0] - PC[0], P[1] - PC[1], P[2] - PC[2]];
    const z = dot(v, DV);
    if (z < 0.02) return [0, 0, -1];
    return [CX + F * dot(v, RV) / z, CY - F * dot(v, UV) / z, z];
  }
  function proj(p) {                                  // [lat, lon] -> [x, y, luz]  (luz <= 0: no se ve)
    const P = mundo(p);
    const cara = dot(P, PC) - 1;                      // > 0: del lado que mira la cámara
    if (cara <= 0) return [0, 0, -1];
    const s = verP(P);
    if (s[2] < 0) return s;
    s[2] = Math.min(1, cara / K.altura * 1.4);        // se apaga hacia el horizonte
    return s;
  }
  let ultimo = '';
  function resize() {
    const clave = canvas.clientWidth + 'x' + canvas.clientHeight + '@' + (window.devicePixelRatio || 1);
    if (clave === ultimo) return;    // mismo tamaño: no se vuelve a dibujar la capa
    ultimo = clave;
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;   // tamaño sin la animación de entrada
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    F = Math.max(W, H * 1.1) * K.lente; CX = W * 0.5; CY = H * 0.5;
    camara();
    capaLista = false;
  }
  function linea(pts) {
    ctx.beginPath();
    let pen = false;
    for (const p of pts) {
      const [x, y, z] = proj(p);
      if (z > 0) { pen ? ctx.lineTo(x, y) : ctx.moveTo(x, y); pen = true; } else pen = false;
    }
  }
  // El borde del planeta (horizonte) visto desde la cámara
  function horizonte() {
    const ch = [PC[0] / PCd, PC[1] / PCd, PC[2] / PCd];
    const A = uni(cruz(ch, Math.abs(ch[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0])), B = cruz(ch, A);
    const s = Math.sqrt(1 - 1 / (PCd * PCd)), out = [];
    let mejor = -1, k0 = 0;
    const raw = [];
    for (let k = 0; k < 720; k++) {
      const t = (k / 720) * Math.PI * 2;
      const P = suma([1 / PCd, ch], [s * Math.cos(t), A], [s * Math.sin(t), B]);
      const q = verP(P); raw.push(q);
      if (q[2] < 0 && mejor < 0) { mejor = 0; k0 = k; }
    }
    // tramo continuo delante de la cámara
    for (let i = 0; i < 720; i++) { const q = raw[(k0 + i) % 720]; if (q[2] >= 0) out.push(q); }
    return out;
  }

  // Trama de puntos sobre la superficie (más brillantes dentro de las zonas)
  const puntos = [];
  for (let la = 3.6; la <= 5.7; la += 0.0105) for (let lo = -75.1; lo <= -73.2; lo += 0.0105) {
    const j = ((la * 977 + lo * 131) % 1) * 0.004;
    const p = [la + j, lo - j];
    puntos.push([p, enZonaRapido(p)]);
  }

  // Órbitas: elipses inclinadas como el horizonte. La mitad de atrás pasa
  //  detrás del planeta (solo se ve en el cielo) y la de adelante, por encima.
  const orbitas = [
    { r: 0.9, e: 0.66, giro: 4, vel: 0.022, fase: 1.2 },
    { r: 0.98, e: 0.72, giro: -6, vel: -0.018, fase: 2.0 },
    { r: 1.06, e: 0.68, giro: 9, vel: 0.014, fase: 1.6 },
    { r: 1.16, e: 0.76, giro: -3, vel: -0.012, fase: 1.9 },
  ];
  let HZ = null;   // { centro, ángulo, cielo: Path2D }
  function orbita(o, a) {
    const g = HZ.ang + o.giro * rad, rx = W * 0.62 * o.r, ry = rx * o.e;
    const x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    return [HZ.cx + x * Math.cos(g) - y * Math.sin(g), HZ.cy + x * Math.sin(g) + y * Math.cos(g), Math.sin(a)];
  }
  function dibujaOrbitas(t, frente) {
    if (!HZ) return;
    ctx.save();
    if (!frente) ctx.clip(HZ.cielo, 'evenodd');
    for (const o of orbitas) {
      ctx.beginPath();
      let pen = false;
      for (let k = 0; k <= 240; k++) {
        const [x, y, z] = orbita(o, (k / 240) * Math.PI * 2);
        if ((z >= 0) === frente) { pen ? ctx.lineTo(x, y) : ctx.moveTo(x, y); pen = true; } else pen = false;
      }
      ctx.setLineDash([2, 6]);
      ctx.strokeStyle = frente ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.2)';
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
    ctx.restore();
  }

  const estrellas = Array.from({ length: 90 }, () => [rnd(), rnd() * 0.55, 0.4 + rnd() * 0.9, rnd() * 4]);

  function pintarCapa() {
    capa.width = Math.round(W * DPR); capa.height = Math.round(H * DPR);
    const c = capa.getContext('2d');
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    const linea = (pts) => {
      c.beginPath();
      let pen = false;
      for (const p of pts) { const [x, y, z] = proj(p); if (z > 0) { pen ? c.lineTo(x, y) : c.moveTo(x, y); pen = true; } else pen = false; }
    };
    // Horizonte y superficie
    const hz = horizonte();
    if (hz.length > 2) {
      const a = hz[0], b = hz[hz.length - 1];
      const [mx, my] = proj(K.mira);
      let nx = -(b[1] - a[1]), ny = b[0] - a[0];
      const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
      if ((mx - a[0]) * nx + (my - a[1]) * ny < 0) { nx = -nx; ny = -ny; }
      const lejos = 6 * (W + H);
      const sup = new Path2D();
      hz.forEach(([x, y], i) => (i ? sup.lineTo(x, y) : sup.moveTo(x, y)));
      sup.lineTo(b[0] + nx * lejos, b[1] + ny * lejos); sup.lineTo(a[0] + nx * lejos, a[1] + ny * lejos); sup.closePath();
      // superficie: más clara junto al horizonte (luz rasante), oscura al frente
      let g = c.createLinearGradient(mx - nx * H * 0.6, my - ny * H * 0.6, mx + nx * H * 0.9, my + ny * H * 0.9);
      g.addColorStop(0, '#3A2BB8'); g.addColorStop(0.35, '#2A1F96'); g.addColorStop(1, '#150D52');
      c.fillStyle = g; c.fill(sup);
      const cielo = new Path2D(); cielo.rect(-W, -H, 3 * W, 3 * H); cielo.addPath(sup);
      // dirección del horizonte en la parte visible del lienzo
      const vis = hz.filter(([x, y]) => x > -W * 0.2 && x < W * 1.2 && y > -H && y < 2 * H).sort((p, q) => p[0] - q[0]);
      const L = vis[0] || a, Rr = vis[vis.length - 1] || b;
      const ang = Math.atan2(Rr[1] - L[1], Rr[0] - L[0]);
      let ox = -Math.sin(ang), oy = Math.cos(ang); if ((mx - L[0]) * ox + (my - L[1]) * oy < 0) { ox = -ox; oy = -oy; }
      const midx = (L[0] + Rr[0]) / 2, midy = (L[1] + Rr[1]) / 2;
      HZ = { cx: midx + ox * H * 0.14, cy: midy + oy * H * 0.14, ang, cielo };
      // atmósfera: halo ancho y una línea fina brillante, como la foto desde la órbita
      const arco = new Path2D();
      hz.forEach(([x, y], i) => (i ? arco.lineTo(x, y) : arco.moveTo(x, y)));
      c.save();
      c.translate(-nx * 6, -ny * 6);
      for (const [w, al] of [[46, 0.06], [26, 0.1], [12, 0.18]]) { c.strokeStyle = `rgba(140,125,255,${al})`; c.lineWidth = w; c.stroke(arco); }
      c.restore();
      c.strokeStyle = 'rgba(181,219,46,.35)'; c.lineWidth = 6; c.filter = 'blur(4px)'; c.save(); c.translate(-nx * 3, -ny * 3); c.stroke(arco); c.restore(); c.filter = 'none';
      c.strokeStyle = 'rgba(225,220,255,.9)'; c.lineWidth = 2; c.stroke(arco);
      c.save(); c.clip(sup);
    }

    // Trama de puntos (la "tierra" vista desde arriba)
    for (const [p, dentro] of puntos) {
      const [x, y, z] = proj(p);
      if (z <= 0 || x < -2 || x > W + 2 || y < 0 || y > H + 2) continue;
      c.fillStyle = dentro ? `rgba(220,214,255,${0.18 + z * 0.4})` : `rgba(200,190,255,${0.06 + z * 0.22})`;
      const sz = dentro ? 1.6 : 1.3;
      c.fillRect(x - sz / 2, y - sz / 2, sz, sz);
    }

    // Calles y avenidas
    c.strokeStyle = 'rgba(200,190,255,.14)'; c.lineWidth = 0.6;
    for (const k of calles) { linea(k); c.stroke(); }
    c.strokeStyle = 'rgba(220,214,255,.26)'; c.lineWidth = 1.1;
    for (const a of avenidas) { linea(a); c.stroke(); }
    c.restore();

    capaLista = true;
  }

  // ---------- Fotograma ----------
  function frame(ms) {
    const t = ms / 1000;
    if (!capaLista) pintarCapa();

    ctx.clearRect(0, 0, W, H);
    for (const [x, y, r, d] of estrellas) {
      ctx.fillStyle = `rgba(255,255,255,${0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.3 + d))})`;
      ctx.beginPath(); ctx.arc(x * W, y * H, r, 0, 7); ctx.fill();
    }
    dibujaOrbitas(t, false);
    ctx.drawImage(capa, 0, 0, W, H);

    // Entregas
    while (rutasCa.length && entregas.length < K.entregas) entregas.push(nuevaEntrega(t));
    entregas = entregas.filter((e) => {
      const k = (t - e.t0) / e.dur;
      if (k < 0) return true;
      if (k > 1) { if (k < 1.3 && rnd() < 0.3) pings.push({ p: e.tramo[e.tramo.length - 1], t }); return false; }  // solo 3 de cada 10 llegadas laten
      const n = e.tramo.length - 1, len = Math.min(16, Math.max(4, n * 0.4)), head = k * (n + len), tail = head - len;
      for (let i = Math.max(0, Math.floor(tail)); i < Math.min(n, Math.ceil(head)); i++) {
        const [x1, y1, z1] = proj(e.tramo[i]), [x2, y2, z2] = proj(e.tramo[i + 1]);
        if (z1 <= 0 || z2 <= 0) continue;
        ctx.strokeStyle = `rgba(${LIMA},${Math.max(0, (i - tail) / len)})`;
        ctx.lineWidth = e.av ? 3.2 : 2.4;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      }
      if (head < n) {   // el repartidor: un punto en la punta
        const [x, y, z] = proj(e.tramo[Math.max(0, Math.floor(head))]);
        if (z > 0) { ctx.fillStyle = `rgb(${LIMA})`; ctx.beginPath(); ctx.arc(x, y, e.av ? 2.4 : 2, 0, 7); ctx.fill(); }
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
  // Las calles llegan aparte: el planeta aparece de una vez y las calles se suman al llegar
  fetch('Scripts/bogota-calles.json?v=1')
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((d) => { usarOSM(d); if (reduce) frame(0); })
    .catch(() => { mallaRespaldo(); if (reduce) frame(0); });
})();
