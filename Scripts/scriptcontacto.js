/* ===== Mapa de ubicación (mismo estilo que el mapa del inicio) ===== */
(function () {
    var el = document.getElementById('mapa-ubicacion');
    if (!el) return;

    // Lienzo gris de Esri (el mismo del mapa de la página de inicio). Carga sin clave y también abriendo
    // la página desde el disco. Se cambió desde tile.openstreetmap.org porque ese servidor bloquea
    // ("Access blocked") las páginas sin sitio web de origen o con uso comercial.
    // La atribución es obligatoria: no la quites.
    var PROVEEDOR = {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        credito: 'Tiles © Esri, HERE, Garmin, © OpenStreetMap contributors'
    };
    var PUNTO = [4.625678, -74.131404];   // ubicación de LoEntrego: ajusta [lat, lng] si cambia
    var ZOOM = 15;
    document.getElementById('ub-credito').textContent = PROVEEDOR.credito;

    var btnMas = document.getElementById('ub-mas');
    var btnMenos = document.getElementById('ub-menos');
    var map, iniciado = false;

    function estadoZoom() {
        btnMas.disabled = map.getZoom() >= map.getMaxZoom() - 0.01;
        btnMenos.disabled = map.getZoom() <= map.getMinZoom() + 0.01;
    }

    function iniciar() {
        if (iniciado) return;
        iniciado = true;

        if (typeof L === 'undefined') {
            el.classList.add('sin-mapa');
            el.textContent = 'Mapa no disponible';
            return;
        }

        map = L.map(el, {
            zoomControl: false, attributionControl: false,
            dragging: true, scrollWheelZoom: false, doubleClickZoom: true,
            touchZoom: true, boxZoom: false, keyboard: false,
            zoomSnap: 0.1, zoomDelta: 0.5, minZoom: 11, maxZoom: 17
        }).setView(PUNTO, ZOOM);

        L.tileLayer(PROVEEDOR.url, { maxZoom: 17, maxNativeZoom: 16 }).addTo(map);

        L.marker(PUNTO, {
            icon: L.divIcon({ className: 'punto-ubicacion', html: '<span></span>', iconSize: [22, 22], iconAnchor: [11, 11] }),
            interactive: false, keyboard: false
        }).addTo(map);

        map.setMaxBounds(L.latLngBounds([[4.30, -74.45], [4.95, -73.80]]));
        map.options.maxBoundsViscosity = 1;
        map.on('zoomend', estadoZoom);
        estadoZoom();
    }

    btnMas.addEventListener('click', function () { if (map) map.zoomIn(1); });
    btnMenos.addEventListener('click', function () { if (map) map.zoomOut(1); });

    // Solo se carga cuando está por verse (ahorra peticiones de mosaicos)
    if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (es) {
            if (es[0].isIntersecting) { io.disconnect(); iniciar(); }
        }, { rootMargin: '300px' });
        io.observe(el);
    } else {
        iniciar();
    }
})();

/* Aparición al hacer scroll */
(function () {
    var items = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) { items.forEach(function (e) { e.classList.add('visible'); }); return; }
    var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    items.forEach(function (e) { io.observe(e); });
})();

/* Botones sutiles de copiar */
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