// Marquee de clientes: repite el grupo para que el bucle sea continuo
    (function () {
        const m = document.querySelector('.marquee-track');
        if (!m) return;                      // ← si no existe, no hace nada
        m.innerHTML = m.innerHTML.repeat(6);
    })();

    (function () {
        const cinta = document.getElementById('cinta');
        if (!cinta) return;
        cinta.innerHTML = cinta.innerHTML.repeat(12);
    })();

    // Animación de aparición al hacer scroll
    (function () {
        const elementos = document.querySelectorAll('.reveal');
        const obs = new IntersectionObserver((entradas) => {
            entradas.forEach(e => {
                if (e.isIntersecting) {
                    e.target.classList.add('visible');
                    obs.unobserve(e.target);
                }
            });
        }, { threshold: 0.15 });
        elementos.forEach(el => obs.observe(el));
    })();

    // Contadores animados y chips de ciudades al entrar en pantalla
    (function () {
        const stats = document.getElementById('stats');
        const easeOut = t => 1 - Math.pow(1 - t, 3);

        function contar(el) {
            const destino = parseInt(el.dataset.target, 10);
            const duracion = 2200;
            const inicio = performance.now();
            function paso(ahora) {
                const t = Math.min((ahora - inicio) / duracion, 1);
                el.textContent = Math.round(destino * easeOut(t));
                if (t < 1) requestAnimationFrame(paso);
            }
            requestAnimationFrame(paso);
        }

        const observer = new IntersectionObserver((entradas) => {
            entradas.forEach(e => {
                if (!e.isIntersecting) return;
                stats.classList.add('visible');
                stats.querySelectorAll('.num').forEach(contar);
                observer.disconnect();
            });
        }, { threshold: 0.3 });

        observer.observe(stats);
    })();

    /* ===== Mapa circular de cobertura ===== */
(function () {
    var el = document.getElementById('mapa-cobertura');
    var panel = document.getElementById('cobertura');
    if (!el || !panel) return;

    // Lienzo gris minimalista de Esri (sin relieve ni aspecto de navegación). Carga sin API key y también
    // abriendo la página desde el disco. El estilo de color se ajusta con el filtro de .leaflet-tile-pane en el CSS.
    var PROVEEDOR = {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        credito: 'Tiles © Esri, HERE, Garmin, © OpenStreetMap contributors'
    };
    document.getElementById('mapa-credito').innerHTML = PROVEEDOR.credito;

    // Zonas aproximadas de cobertura: edita las coordenadas [lat, lng] cuando quieras afinarlas.
    // Colores, tarifa plana por entrega (COP) y polígonos aproximados [lat, lng].
    // Las zonas comparten borde (mismos vértices) para que no queden huecos entre ellas.
    var B = {   // borde oeste de Bogotá, compartido con Funza y Soacha
        b5: [4.750, -74.130], b6: [4.725, -74.150], b7: [4.700, -74.180], b8: [4.665, -74.195],
        b9: [4.630, -74.205], b10: [4.600, -74.200], b11: [4.575, -74.190], b12: [4.545, -74.175]
    };
    var ZONAS = {
        bogota: { nombre: 'Bogotá', color: '#B5DB2E', texto: 'Bogotá D.C.', tarifa: 10000, recargo: 0, coords: [
            [4.795, -74.030], [4.805, -74.065], [4.800, -74.100], [4.780, -74.118],
            B.b5, B.b6, B.b7, B.b8, B.b9, B.b10, B.b11, B.b12,
            [4.510, -74.150], [4.480, -74.120], [4.470, -74.090], [4.500, -74.065],
            [4.550, -74.060], [4.600, -74.045], [4.655, -74.035], [4.725, -74.020] ] },
        funza: { nombre: 'Funza', color: '#D7F25A', texto: 'Funza, Cundinamarca', tarifa: 10000, recargo: 0, coords: [
            B.b5, B.b6, B.b7, B.b8,
            [4.655, -74.250], [4.700, -74.262], [4.760, -74.245], [4.768, -74.195], [4.760, -74.160] ] },
        soacha: { nombre: 'Soacha', color: '#A99BFF', texto: 'Soacha, Cundinamarca', tarifa: 10000, recargo: 0, coords: [
            B.b8, B.b9, B.b10, B.b11, B.b12,
            [4.525, -74.200], [4.520, -74.245], [4.555, -74.285], [4.610, -74.280], [4.655, -74.250] ] }
    };
    var COLOR_TODAS = '#FFFFFF';   // color de la tarifa promedio (todas las zonas)

    var botones = document.querySelectorAll('.zona-btn');
    var tarifaEl = document.getElementById('tarifa');
    var valorEl = document.getElementById('tarifa-valor');
    var etiquetaEl = document.getElementById('tarifa-etiqueta');
    var notaEl = document.getElementById('tarifa-nota');
    var detallesEl = document.getElementById('tarifa-detalles');
    var recargoItem = document.getElementById('recargo-item');
    var recargoTxt = document.getElementById('recargo-texto');
    var valorMostrado = null;
    var reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var map, capas = {}, todos, actual = 'todas', iniciado = false;

    function formato(n) { return '$' + Math.round(n).toLocaleString('es-CO'); }

    function animarValor(destino) {
        var desde = valorMostrado === null ? destino : valorMostrado;
        valorMostrado = destino;
        if (reducir || desde === destino) { valorEl.textContent = formato(destino); return; }
        var t0 = null;
        (function paso(t) {
            if (t0 === null) t0 = t;
            var p = Math.min((t - t0) / 450, 1);
            valorEl.textContent = formato(desde + (destino - desde) * p);
            if (p < 1) requestAnimationFrame(paso);
        })(performance.now());
    }

    // Texto de la zona, tarifa y recargos (funciona aunque el mapa no haya cargado)
    function actualizarInfo(key) {
        var lista = Object.keys(ZONAS).map(function (k) { return ZONAS[k]; });
        if (key === 'todas') {
            var prom = lista.reduce(function (a, z) { return a + z.tarifa; }, 0) / lista.length;
            etiquetaEl.textContent = 'Tarifa promedio';
            notaEl.textContent = 'COP por entrega · promedio de todas las zonas';
            tarifaEl.style.setProperty('--zc', COLOR_TODAS);
            detallesEl.style.setProperty('--zc', COLOR_TODAS);
            animarValor(prom);
            var hay = lista.some(function (z) { return z.recargo > 0; });
            recargoItem.hidden = !hay;
            if (hay) recargoTxt.textContent = 'Algunas zonas tienen recargo: elige una zona para ver su valor.';
        } else {
            var z = ZONAS[key];
            etiquetaEl.textContent = 'Tarifa por entrega';
            notaEl.textContent = 'COP por entrega';
            tarifaEl.style.setProperty('--zc', z.color);
            detallesEl.style.setProperty('--zc', z.color);
            animarValor(z.tarifa);
            recargoItem.hidden = !(z.recargo > 0);
            if (z.recargo > 0) recargoTxt.textContent = 'Recargo por zona: +' + formato(z.recargo) + ' COP por entrega.';
        }
    }

    function iniciar() {
        if (iniciado) return;
        iniciado = true;

        if (typeof L === 'undefined') {            // sin conexión / Leaflet no cargó
            el.classList.add('sin-mapa');
            el.textContent = 'Mapa no disponible';
            return;
        }

        map = L.map(el, {
            zoomControl: false, attributionControl: false,
            dragging: true, scrollWheelZoom: false, doubleClickZoom: true,
            touchZoom: true, boxZoom: false, keyboard: false,
            bounceAtZoomLimits: false,
            zoomSnap: 0.1, zoomDelta: 0.5
        });
        L.tileLayer(PROVEEDOR.url, { maxZoom: 16, maxNativeZoom: 16 }).addTo(map);

        todos = L.latLngBounds([]);
        Object.keys(ZONAS).forEach(function (k) {
            var z = ZONAS[k];
            var halo = L.polygon(z.coords, {            // resplandor = zonas aledañas
                color: z.color, weight: 18, opacity: .18, fill: false,
                lineJoin: 'round', interactive: false
            }).addTo(map);
            var poly = L.polygon(z.coords, {
                color: z.color, weight: 2, opacity: 1,
                fillColor: z.color, fillOpacity: .3,
                lineJoin: 'round', interactive: false
            }).addTo(map);
            poly.bindTooltip(z.nombre, { permanent: true, direction: 'center', className: 'zona-etiqueta', interactive: false });
            capas[k] = { poly: poly, halo: halo };
            todos.extend(poly.getBounds());
        });

        map.fitBounds(todos.pad(0.25), { padding: pad(), animate: false });

        // Límites para que al arrastrar no se pierda la zona de cobertura
        map.setMaxBounds(todos.pad(1));
        map.options.maxBoundsViscosity = 1;
        map.setMinZoom(Math.max(map.getZoom() - 1.5, 0));
        map.on('zoomend', estadoZoom);
        estadoZoom();
    }

    function pad() {
        var p = Math.round(el.clientWidth * 0.15);   // margen para que la zona quede dentro del círculo
        return [p, p];
    }

    function mostrar(key) {
        actual = key;

        Object.keys(capas).forEach(function (k) {
            var on = key === 'todas' || key === k;
            capas[k].poly.setStyle({ fillOpacity: on ? (key === 'todas' ? .32 : .5) : .08, opacity: on ? 1 : .25 });
            capas[k].halo.setStyle({ opacity: on ? .2 : .04 });
            var tt = capas[k].poly.getTooltip(), te = tt && tt.getElement();
            if (te) te.classList.toggle('tenue', !on);
        });

        botones.forEach(function (b) {
            var on = b.dataset.zona === key;
            b.classList.toggle('activo', on);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        actualizarInfo(key);

        if (!map) return;
        var b = key === 'todas' ? todos.pad(0.25) : capas[key].poly.getBounds();
        if (reducir) map.fitBounds(b, { padding: pad(), animate: false });
        else map.flyToBounds(b, { padding: pad(), duration: 1.2, easeLinearity: .25 });
    }

    botones.forEach(function (b) {
        b.addEventListener('click', function () { mostrar(b.dataset.zona); });
    });

    // Botones sutiles de zoom (+ / −): acercan o alejan sin cambiar el tamaño del mapa
    var btnMas = document.getElementById('zoom-mas');
    var btnMenos = document.getElementById('zoom-menos');
    function estadoZoom() {
        if (!map || !btnMas || !btnMenos) return;
        btnMas.disabled = map.getZoom() >= map.getMaxZoom() - 0.01;
        btnMenos.disabled = map.getZoom() <= map.getMinZoom() + 0.01;
    }
    if (btnMas) btnMas.addEventListener('click', function () { if (map) map.zoomIn(1); });
    if (btnMenos) btnMenos.addEventListener('click', function () { if (map) map.zoomOut(1); });

    var t;
    window.addEventListener('resize', function () {
        clearTimeout(t);
        t = setTimeout(function () {
            if (!map) return;
            map.invalidateSize();
            var b = actual === 'todas' ? todos.pad(0.25) : capas[actual].poly.getBounds();
            map.fitBounds(b, { padding: pad(), animate: false });
        }, 150);
    });

    actualizarInfo('todas');

    // El mapa solo se carga cuando la sección está por verse (ahorra peticiones de mosaicos)
    if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (es) {
            if (es[0].isIntersecting) { io.disconnect(); iniciar(); }
        }, { rootMargin: '300px' });
        io.observe(panel);
    } else {
        iniciar();
    }
})();

/* Botones sutiles de copiar en el footer */
(function () {
    document.querySelectorAll('.btn-copiar').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var texto = btn.dataset.copiar;
            function listo() {
                btn.classList.add('copiado');
                btn.title = 'Copiado';
                setTimeout(function () { btn.classList.remove('copiado'); btn.title = 'Copiar'; }, 1400);
            }
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(texto).then(listo, function () {});
            } else {
                var ta = document.createElement('textarea');
                ta.value = texto; ta.style.position = 'fixed'; ta.style.opacity = '0';
                document.body.appendChild(ta); ta.select();
                try { document.execCommand('copy'); listo(); } catch (e) {}
                document.body.removeChild(ta);
            }
        });
    });
})();

/* Respaldo: si scriptindex.js falla por cualquier error, las secciones con .reveal no deben quedar invisibles */
(function () {
    var items = document.querySelectorAll('.reveal');
    if (!items.length) return;

    function contar(stats) {
        stats.querySelectorAll('.num').forEach(function (n) {
            if (n.textContent.trim() !== '0') return;          // ya lo animó el otro script
            var meta = +n.dataset.target || 0, t0 = null;
            function paso(t) {
                if (t0 === null) t0 = t;
                var p = Math.min((t - t0) / 1400, 1);
                n.textContent = Math.round(meta * (1 - Math.pow(1 - p, 3)));
                if (p < 1) requestAnimationFrame(paso);
            }
            requestAnimationFrame(paso);
        });
    }

    function mostrar(el) {
        el.classList.add('visible');
        if (el.id === 'stats') setTimeout(function () { contar(el); }, 900);
    }

    if (!('IntersectionObserver' in window)) { items.forEach(mostrar); return; }
    var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
            if (e.isIntersecting) { mostrar(e.target); io.unobserve(e.target); }
        });
    }, { threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
})();