# Planeta del inicio: cómo regenerarlo

La web **no** dibuja el planeta en vivo. Usa dos archivos ya preparados:

| Archivo | Qué es |
|---------|--------|
| `IMG/planeta-escritorio.webp` (1500×1200) y `IMG/planeta-movil.webp` (1000×1000) | Lo fijo: estrellas, superficie, horizonte, calles reales y órbitas. |
| `Scripts/planeta-escritorio.json` y `Scripts/planeta-movil.json` | Unas 170 trayectorias por las calles, en píxeles de la imagen, más las órbitas de los satélites. |

`Scripts/planeta.js` pone la imagen de fondo y anima encima las entregas, las
llegadas y los satélites. En celular (≤ 900 px) se usa la vista frontal; en
computador, la oblicua.

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
   node exp.js escritorio 1500 1200 '{}' '0.57,0.5' .
   node exp.js movil 1000 1000 '{"ladeo":0,"rumbo":0,"picada":44,"lente":0.6,"mira":[4.625,-74.14]}' '0.5,0.47' .
   ```

4. Convierte los PNG a WebP (calidad 78) y copia los archivos a `IMG/` y `Scripts/`.

Las perillas (`escala`, `mira`, `altura`, `atras`, `rumbo`, `picada`, `ladeo`, `lente`)
están documentadas al inicio de `planeta-render.js`.

Calles: © colaboradores de OpenStreetMap (ODbL).
