# Planeta del inicio: cómo regenerarlo

La web **no** dibuja el planeta en vivo. Usa dos archivos ya preparados:

| Archivo | Qué es |
|---------|--------|
| `IMG/planeta-oblicuo.png` (1500×1200) y `IMG/planeta-frontal.png` (1600×1000) | Lo fijo: estrellas, superficie, horizonte, calles reales y órbitas. |
| `Scripts/planeta-oblicuo.json` y `Scripts/planeta-frontal.json` | Unas 170 trayectorias por las calles, en píxeles de la imagen, más las órbitas de los satélites. |

`Scripts/planeta.js` pone la imagen de fondo y anima encima las entregas, las
llegadas y los satélites. La vista cambia en vivo al redimensionar la ventana:

- **Hasta 900 px de ancho**: el planeta va solo, debajo del texto. Se usa la vista frontal, a todo el ancho y en formato 8:5.
- **Más de 900 px**: el planeta va al lado del texto. Se usa la vista oblicua, en formato 5:4.

## Regenerar

Sirve para cambiar el ángulo, el encuadre o las calles. Necesita Python 3, Node y Playwright.

1. Prepara el renderizador completo con ganchos:

   ```bash
   python3 gen.py planeta-render.js planeta-gen.js
   ```

2. Sirve esta carpeta. `bogota-calles.txt` tiene que estar en ella:

   ```bash
   python3 -m http.server 8766 --bind 127.0.0.1
   ```

3. Exporta cada variante. Los argumentos son: nombre, ancho, alto, perillas en JSON y centro.

   ```bash
   node exp.js oblicuo 1500 1200 '{}' '0.57,0.5' .
   node exp.js frontal 1600 1000 '{"ladeo":0,"rumbo":0,"giroMapa":0,"picada":42,"altura":0.42,"atras":0.42,"lente":0.84,"mira":[4.62,-74.14]}' '0.5,0.3' .
   ```

4. Comprime los PNG con `pngquant --quality 80-98 --speed 1` (conserva la transparencia: el espacio debe quedar transparente, no negro) y copia los archivos a `IMG/` y `Scripts/`. Vista frontal actual: `"despLat":3.8,"sinOrbitas":true`; oblicua: `{"despLon":-0.3,"despLat":2.6,"giroMapa":-12}`.

Las perillas `despLat` y `despLon` corren solo la ciudad sobre el planeta (la cámara no se mueve). La perilla `giroMapa` gira la ciudad sobre el planeta sin mover la cámara: así cabe acostada en la vista frontal. Las perillas (`escala`, `mira`, `altura`, `atras`, `rumbo`, `picada`, `ladeo`, `lente`)
están documentadas al inicio de `planeta-render.js`.

Calles: © colaboradores de OpenStreetMap (ODbL).
