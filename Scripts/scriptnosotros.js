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

// Contadores animados de las cifras por año en "Nuestra trayectoria"
(function () {
    const grid = document.getElementById('aniosGrid');
    if (!grid) return;
    const easeOut = t => 1 - Math.pow(1 - t, 3);

    function contar(el) {
        const destino = parseInt(el.dataset.target, 10);
        const duracion = 1800;
        const inicio = performance.now();
        function paso(ahora) {
            const t = Math.min((ahora - inicio) / duracion, 1);
            el.textContent = '+' + Math.round(destino * easeOut(t)).toLocaleString('es-CO');
            if (t < 1) requestAnimationFrame(paso);
        }
        requestAnimationFrame(paso);
    }

    const observer = new IntersectionObserver((entradas) => {
        entradas.forEach(e => {
            if (!e.isIntersecting) return;
            grid.querySelectorAll('.cifra-num').forEach(contar);
            observer.disconnect();
        });
    }, { threshold: 0.2 });

    observer.observe(grid);
})();

// Voltear y expandir la tarjeta de año seleccionada, comprimiendo las demás
(function () {
    const tarjetas = document.querySelectorAll('.año-card');
    if (!tarjetas.length) return;

    function reiniciar() {
        tarjetas.forEach(t => t.classList.remove('expandida', 'comprimida'));
    }

    tarjetas.forEach(card => {
        card.addEventListener('click', () => {
            const yaExpandida = card.classList.contains('expandida');
            reiniciar();
            if (yaExpandida) return; // segundo clic: vuelve todo a la normalidad

            card.classList.add('expandida');
            tarjetas.forEach(t => {
                if (t !== card) t.classList.add('comprimida');
            });
        });
    });
})();

// Botones de copiar del footer (correo, teléfono, ubicación)
(function () {
    document.querySelectorAll('.btn-copiar').forEach(btn => {
        btn.addEventListener('click', async () => {
            const texto = btn.dataset.copiar;
            try { await navigator.clipboard.writeText(texto); } catch (e) { return; }
            btn.classList.add('copiado');
            setTimeout(() => btn.classList.remove('copiado'), 1600);
        });
    });
})();