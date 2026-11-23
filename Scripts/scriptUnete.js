// Cinta infinita: repite el grupo para que nunca se vea el final
(function () {
    var cinta = document.getElementById('cinta');
    if (!cinta) return;
    cinta.innerHTML = cinta.innerHTML.repeat(12);
})();

// Animación de aparición al hacer scroll
(function () {
    var elementos = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
        elementos.forEach(function (el) { el.classList.add('visible'); });
        return;
    }
    var obs = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (e) {
            if (e.isIntersecting) {
                e.target.classList.add('visible');
                obs.unobserve(e.target);
            }
        });
    }, { threshold: 0.15 });
    elementos.forEach(function (el) { obs.observe(el); });
})();

/* ===== Mini mapa de cobertura + tarifa (versión condensada de la landing) ===== */
(function () {
    var el = document.getElementById('mc-mapa');
    if (!el) return;

    var PROVEEDOR = {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        credito: 'Tiles © Esri, HERE, Garmin, © OpenStreetMap contributors'
    };
    var creditoEl = document.getElementById('mc-credito');
    if (creditoEl) creditoEl.textContent = PROVEEDOR.credito;

    // Mismas zonas y tarifas que la landing (edita aquí si cambian)
    var B = {
        b5: [4.750, -74.130], b6: [4.725, -74.150], b7: [4.700, -74.180], b8: [4.665, -74.195],
        b9: [4.630, -74.205], b10: [4.600, -74.200], b11: [4.575, -74.190], b12: [4.545, -74.175]
    };
    var ZONAS = {
        bogota: { nombre: 'Bogotá', color: '#B5DB2E', tarifa: 10000, recargo: 0, coords: [
            [4.795, -74.030], [4.805, -74.065], [4.800, -74.100], [4.780, -74.118],
            B.b5, B.b6, B.b7, B.b8, B.b9, B.b10, B.b11, B.b12,
            [4.510, -74.150], [4.480, -74.120], [4.470, -74.090], [4.500, -74.065],
            [4.550, -74.060], [4.600, -74.045], [4.655, -74.035], [4.725, -74.020] ] },
        funza: { nombre: 'Funza', color: '#D7F25A', tarifa: 10000, recargo: 0, coords: [
            B.b5, B.b6, B.b7, B.b8,
            [4.655, -74.250], [4.700, -74.262], [4.760, -74.245], [4.768, -74.195], [4.760, -74.160] ] },
        soacha: { nombre: 'Soacha', color: '#A99BFF', tarifa: 10000, recargo: 0, coords: [
            B.b8, B.b9, B.b10, B.b11, B.b12,
            [4.525, -74.200], [4.520, -74.245], [4.555, -74.285], [4.610, -74.280], [4.655, -74.250] ] }
    };
    var COLOR_TODAS = '#FFFFFF';

    var chips = document.querySelectorAll('.mc-chip');
    var tarifaEl = document.getElementById('mc-tarifa');
    var valorEl = document.getElementById('mc-valor');
    var etiquetaEl = document.getElementById('mc-etiqueta');
    var notaEl = document.getElementById('mc-nota');
    var recargoEl = document.getElementById('mc-recargo');
    var reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var map, capas = {}, todos, actual = 'todas', iniciado = false;

    function formato(n) { return '$' + Math.round(n).toLocaleString('es-CO'); }

    function actualizarInfo(key) {
        var lista = Object.keys(ZONAS).map(function (k) { return ZONAS[k]; });
        if (key === 'todas') {
            var prom = lista.reduce(function (a, z) { return a + z.tarifa; }, 0) / lista.length;
            etiquetaEl.textContent = 'Tarifa promedio';
            notaEl.textContent = 'COP por entrega';
            tarifaEl.style.setProperty('--zc', COLOR_TODAS);
            valorEl.textContent = formato(prom);
            var hay = lista.some(function (z) { return z.recargo > 0; });
            recargoEl.hidden = !hay;
            if (hay) recargoEl.textContent = 'Algunas zonas tienen recargo: elige una zona.';
        } else {
            var z = ZONAS[key];
            etiquetaEl.textContent = 'Tarifa plana · ' + z.nombre;
            notaEl.textContent = 'COP por entrega';
            tarifaEl.style.setProperty('--zc', z.color);
            valorEl.textContent = formato(z.tarifa);
            recargoEl.hidden = !(z.recargo > 0);
            if (z.recargo > 0) recargoEl.textContent = 'Recargo por zona: +' + formato(z.recargo) + ' COP.';
        }
    }

    function pad() {
        var p = Math.round(el.clientWidth * 0.1);
        return [p, p];
    }

    function iniciar() {
        if (iniciado) return;
        iniciado = true;

        if (typeof L === 'undefined') {
            el.classList.add('sin-mapa');
            el.textContent = 'Mapa no disponible';
            return;
        }

        // Mapa ultra mini: sin interacción directa, así no interfiere con el scroll en el celular
        map = L.map(el, {
            zoomControl: false, attributionControl: false,
            dragging: false, scrollWheelZoom: false, doubleClickZoom: false,
            touchZoom: false, boxZoom: false, keyboard: false,
            zoomSnap: 0.1
        });
        L.tileLayer(PROVEEDOR.url, { maxZoom: 16, maxNativeZoom: 16 }).addTo(map);

        todos = L.latLngBounds([]);
        Object.keys(ZONAS).forEach(function (k) {
            var z = ZONAS[k];
            var poly = L.polygon(z.coords, {
                color: z.color, weight: 1.5, opacity: 1,
                fillColor: z.color, fillOpacity: .3,
                lineJoin: 'round', interactive: false
            }).addTo(map);
            capas[k] = poly;
            todos.extend(poly.getBounds());
        });

        map.fitBounds(todos.pad(0.1), { padding: pad(), animate: false });
        mostrar(actual);
    }

    function mostrar(key) {
        actual = key;

        Object.keys(capas).forEach(function (k) {
            var on = key === 'todas' || key === k;
            capas[k].setStyle({ fillOpacity: on ? (key === 'todas' ? .32 : .5) : .08, opacity: on ? 1 : .25 });
        });

        chips.forEach(function (b) {
            var on = b.dataset.zona === key;
            b.classList.toggle('activo', on);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        actualizarInfo(key);

        if (!map) return;
        var b = key === 'todas' ? todos.pad(0.1) : capas[key].getBounds();
        if (reducir) map.fitBounds(b, { padding: pad(), animate: false });
        else map.flyToBounds(b, { padding: pad(), duration: 1, easeLinearity: .25 });
    }

    chips.forEach(function (b) {
        b.addEventListener('click', function () { mostrar(b.dataset.zona); });
    });

    var t;
    window.addEventListener('resize', function () {
        clearTimeout(t);
        t = setTimeout(function () {
            if (!map) return;
            map.invalidateSize();
            var b = actual === 'todas' ? todos.pad(0.1) : capas[actual].getBounds();
            map.fitBounds(b, { padding: pad(), animate: false });
        }, 150);
    });

    actualizarInfo('todas');
    iniciar();
})();

/* ===== Slider automático: cobertura y tarifa  →  tamaño máximo por paquete ===== */
(function () {
    var s = document.getElementById('mini-slider');
    if (!s) return;
    var slides = s.querySelectorAll('.ms-slide');
    var puntos = s.querySelectorAll('.ms-punto');
    var reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var i = 0, pausado = false, pausaHasta = 0;

    function ir(n) {
        i = (n + slides.length) % slides.length;
        slides.forEach(function (el, k) {
            el.classList.toggle('activo', k === i);
            el.setAttribute('aria-hidden', k === i ? 'false' : 'true');
        });
        puntos.forEach(function (p, k) {
            p.classList.toggle('activo', k === i);
            p.setAttribute('aria-current', k === i ? 'true' : 'false');
        });
    }

    function pausar(ms) { pausaHasta = Date.now() + ms; }

    puntos.forEach(function (p, k) {
        p.addEventListener('click', function () { ir(k); pausar(12000); });
    });

    // No avanza mientras el cursor o el foco están sobre el slider, ni justo después de tocarlo
    s.addEventListener('mouseenter', function () { pausado = true; });
    s.addEventListener('mouseleave', function () { pausado = false; });
    s.addEventListener('focusin', function () { pausado = true; });
    s.addEventListener('focusout', function () { pausado = false; });
    s.addEventListener('pointerdown', function () { pausar(10000); });

    if (!reducir) {
        setInterval(function () {
            if (pausado || document.hidden || Date.now() < pausaHasta) return;
            ir(i + 1);
        }, 6000);
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

// Envío del formulario (misma lógica original, con estado de carga)
(function () {
    var form = document.getElementById('form');
    if (!form) return;
    var boton = form.querySelector('.btn-solicitud');

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        var data = {
            comercio: e.target.comercio.value,
            ubicacion: e.target.ubicacion.value,
            celular: e.target.celular.value,
            pedidosdiarios: e.target.pedidosdiarios.value,
            mensaje: e.target.mensaje.value
        };

        boton.classList.add('cargando');
        boton.disabled = true;

        fetch("https://script.google.com/macros/s/AKfycbxGiK9Voc7DYoIJjTPw2abVXhbxr6St4UTah5njbOj7aBV1STYrBT6k_QYkibeKEDMsqg/exec", {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        })
        .then(function () {
            alert("Recibimos tus datos ✅ Pronto te contactaremos para conversar.");
            form.reset();
        })
        .catch(function (err) {
            console.error(err);
            alert("Error al enviar ❌");
        })
        .finally(function () {
            boton.classList.remove('cargando');
            boton.disabled = false;
        });
    });
})();