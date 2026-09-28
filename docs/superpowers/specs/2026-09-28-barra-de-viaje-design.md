# Barra de viaje — diseño

Fecha: 2026-09-28 · Rama: `l-magnetica` · Página: inicio (`index.html`)

## Objetivo

Dar a cada destino del inicio (los 7 planetas y la Z-dragón) una forma de **viajar a su página**
que forme parte del mundo del sitio: el dragón que ya vuela por abajo es la llave. Al apuntar a un
destino aparece una barra abajo a la derecha; el dragón vuela hasta ella, se posa debajo y la
**activa**. Solo entonces se puede pulsar.

## Decisiones tomadas con Ludwig

- La barra aparece en los **8 destinos**. Los que aún no tienen página dicen "llegará pronto" y no
  llevan a ninguna parte (hoy ninguna página existe: `outer-wilds/` y `sobre-mi/` están por crear).
- Al llegar, el dragón que vuela (lienzo) se cambia por **una imagen quieta** del dibujo de Ludwig
  con el dragón posado (ojos rojos), colocada bajo la placa.
- Si se apunta a **otro destino con la barra ya activa**, la barra y el dragón posado se van y sale un
  dragón nuevo hacia la barra nueva.
- Texto (opción C): mientras el dragón viene **"Rumbo a X"**; al activarse **"Viajar a X"**.
  - Sin página: al activarse **"X llegará pronto"**.
  - Z-dragón: **"Rumbo a Ludwig"** → **"Conocer a Ludwig"** (enlace a `sobre-mi/`).
- Estilo: **enfoque 1, solo CSS** (`@keyframes`). Más adelante se podrá añadir un lienzo propio a la
  placa de algún juego (enfoque 2) sin rehacer nada: la placa reserva un hueco para ello.

## 1. Forma y lugar

La barra es la **placa del nombre de la carta de tarot**, como si se hubiera desprendido de la carta,
con el dragón posado debajo como pedestal.

```
                                        ┌─────────────────────────┐
                                        │  Rumbo a Hollow Knight  │  ← placa
                                        └─────────────────────────┘
                                      ≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈>●   ← dragón posado (imagen quieta)
 ~~~>  (el dragón entra volando por aquí)
─────────────────────────────────────────────────────────────────────────── pie
```

- Dentro de `.orbita`, abajo a la derecha, alineada con `--margen-lateral`, justo encima del pie.
  El dragón posado ocupa la franja por la que ya vuela el dragón; la placa va encima.
- Placa de unos **15rem × 3rem**; en móvil `min(15rem, 100% − 2 × --margen-lateral)`.
- Dragón posado con el **mismo alto que el que vuela** (`--alto-dragon-vuelo`, 58px) para que el
  cambio de imagen no dé un salto.
- Letra **Grenze** (ya cargada para el título), texto centrado, sin mayúsculas forzadas.
- Capas: la placa por encima de los planetas (recibe el clic); el dragón posado justo debajo.

## 2. Aspecto de cada juego

Reglas comunes:
- **Aparecer** ≈ 0,45 s. Mientras espera, el texto se ve algo apagado.
- **Activarse** ≈ 0,9 s, una sola vez; después un brillo **quieto** (sin bucles).
- `prefers-reduced-motion`: solo fundidos.

| Destino | Placa | Al aparecer | Al activarse |
|---|---|---|---|
| Ludwig (Z) | **Dibujo de Ludwig** (`img/placas/ludwig.webp`, de `stylesrefence/barras/Ludwig1.png`; el texto va en el dibujo) | Se arma por píxeles en espiral como su carta (`js/placa-ludwig.js`, lienzo propio) | Crece ×1,1 + brillo rojo con su forma + reflejo de cromo (2 franjas) recortado al dibujo. De momento la activa usa el mismo dibujo |
| Hollow Knight | Negro de vacío, marco blanco fino | Mancha de tinta que se abre desde el centro | Halo blanco pálido que late una vez y se queda suave |
| The Witcher 3 | Negro rojizo, borde rojo (220,60,40) | Se quema desde el centro con borde naranja | Borde de brasa + resplandor rojo-naranja con 2–3 parpadeos de llama |
| Cyberpunk 2077 | Negro, esquinas cortadas, borde verde neón, sombra magenta | Franjas que saltan de lado (glitch) | Texto separado en rojo/cian + línea de barrido que baja |
| Outer Wilds | Violeta profundo, texto naranja cálido | El borde se dibuja como líneas de glifo | Brillo naranja de hoguera desde abajo |
| Wukong | Tinta negra, filete de oro, sellito rojo | Línea de oro que barre de izquierda a derecha | Destello dorado que se queda como brillo cálido |
| Zelda | Vitral: 3 paneles verdes con plomo dorado | Anillo verde que se abre desde el centro | Paneles que se encienden uno a uno, de verde a oro |
| Elden Ring | Casi negra, hilo de oro fino, rojo profundo | Hilo de oro que se dibuja del centro a los lados | Resplandor dorado que se expande |

Legal: la placa de Elden Ring **no lleva círculos ni líneas verticales** (parecido con su logo).
Ninguna placa usa logos, personajes ni arte oficial.

## 3. Funcionamiento

### Quién hace qué
- **`js/barra-viaje.js` (nuevo)** manda: escucha a los 8 destinos (`pointerenter`/`focus`,
  `pointerleave`/`blur`), lleva el estado de la barra y da órdenes al dragón.
- **`js/dragon-vuelo.js`** deja de escuchar a los planetas y obedece dos eventos en `document`:
  - `dragon-llamar` (`detail`: punto de aterrizaje) → vuela de abajo-izquierda a ese punto en 7 s (pedido de Ludwig), frenando suave al final
    (`DURACION_VUELO`); las curvas del camino se aplanan y el último largo de dragón es recto,
    para que llegue tumbado. Se conserva la 3ª versión del dragón (tiras rígidas que siguen el
    rastro de la cabeza, cuello de rigidez gradual): sin ola del cuerpo.
  - `dragon-despedir` → se desvanece.
  - Al llegar emite **`dragon-posado`**. Entonces el lienzo se funde (0,15 s) con la imagen quieta
    (`img/dragon-vuelo.webp`, el mismo dibujo), ya colocada bajo la placa: no se nota el cambio.
- **Datos en el HTML** de cada destino: `data-destino="hollow-knight" data-nombre="Hollow Knight"` y,
  si tiene página, `data-enlace="outer-wilds/"`. Crear un mundo nuevo = añadir su `data-enlace`.

### Estados
```
 oculta ──apuntas X──▶ esperando ("Rumbo a X") ──dragon-posado──▶ activa ("Viajar a X")
   ▲                       │                                          │
   └── dejas X antes ◀─────┘                                          │
   └────────────── apuntas otro destino Y (sale un dragón nuevo) ◀────┘  (o Escape)
```
- **Esperando**: no se puede pulsar. Si se deja de apuntar (margen de 0,2 s, como el dragón) se
  van barra y dragón. Si se apunta a otro destino, el dragón **sigue volando** y solo la placa
  cambia de juego (con su animación de aparecer).
- **Activa**: se queda aunque se deje de apuntar. Con página = enlace; sin página = texto sin enlace.
  Se cierra con Escape o al apuntar a otro destino (entonces sale un dragón nuevo desde la izquierda).
- El texto se anuncia a lectores de pantalla con `aria-live="polite"`.

### Teclado
Si la barra está activa y se pulsa **Tab en su destino**, el foco salta a la barra; desde la barra,
Tab va al destino siguiente y Shift+Tab vuelve al suyo. Con ratón no cambia nada.

### Archivos
- Nuevos: `js/barra-viaje.js`, `css/barra-viaje.css` (base + placa de Ludwig).
- Cambiados: `index.html` (datos en los 8 destinos, marcado de la barra, `<link>` y `<script>`),
  `js/dragon-vuelo.js`, y al final de cada `css/planetas/<juego>.css` su placa.
- Imagen del dragón posado: el dibujo que pegó Ludwig es `stylesrefence/dragon/Dragon17z.png`, el mismo
  que ya usa el dragón que vuela (`img/dragon-vuelo.webp`, 627×240, con transparencia). Se usa ese archivo:
  no hace falta convertir otra imagen.

## 4. Casos raros y pruebas

### Casos raros
- Dibujo del dragón sin cargar o `prefers-reduced-motion`: sin vuelo; la barra se activa sola a los 2 s.
- Táctil: tocar un planeta abre carta + barra + dragón; la espera no se cancela (no hay "quitar el
  ratón"): el dragón llega y la barra se activa.
- Cambio de tamaño de ventana: se recalcula el punto de aterrizaje; dragón y barra se recolocan.
- Rendimiento: con el dragón posado no corre ningún `requestAnimationFrame`; el brillo es CSS quieto.
- La carta de cada destino sigue funcionando igual (se abre al apuntar); la barra es independiente.

### Pruebas (navegador integrado, 1280×720 y 375 px)
1. Los 8 destinos: captura de la placa esperando y activa; comparar con su carta.
2. Estados: dejar de apuntar antes de que llegue (se va todo); cambiar de destino mientras vuela
   (sigue volando); cambiar con la barra activa (sale un dragón nuevo); Escape.
3. Teclado: Tab destino → barra → destino siguiente; Shift+Tab.
4. `prefers-reduced-motion`: sin dragón, activación automática.
5. Consola sin errores. Con el panel oculto, avanzar la animación con una cola manual de
   `requestAnimationFrame` (reloj ≥ `performance.now()`).
