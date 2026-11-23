"""Prepara gen/planeta-gen.js: copia de planeta.js con ganchos para exportar la capa fija y las trayectorias."""
import sys
src = open(sys.argv[1]).read()
out = sys.argv[2]

def rep(a, b):
    global src
    assert a in src, 'NO: ' + a[:80]
    src = src.replace(a, b, 1)

# perillas sobrescribibles desde la página del generador
rep("  const K = {", "  const K = Object.assign({")
i = src.index("  };", src.index("Object.assign({"))
src = src[:i] + "  }, window.__K || {});" + src[i + 4:]
# sin bucle de animación: el generador pinta la capa a mano
rep("  if (reduce) frame(0); else kick();", "  /* generador: sin animación */")
# exponer lo necesario
i = src.rindex("})();")
src = src[:i] + """  window.__gen = {
    pintarCapa, proj, dens, orbita, orbitas, recorrido, calleLen,
    get capa() { return capa; }, get W() { return W; }, get H() { return H; }, get DPR() { return DPR; },
    get HZ() { return HZ; }, get redLista() { return redLista; }, get capaLista() { return capaLista; },
    get rutasAv() { return rutasAv; }, get rutasCa() { return rutasCa; }, get rutasPeriferia() { return rutasPeriferia; },
    rnd,
  };
""" + src[i:]
open(out, 'w').write(src)
print('ok')
