# Barra de viaje — plan de implementación

> **Para agentes:** SUB-SKILL NECESARIA: usar superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para ejecutar este plan tarea a tarea. Los pasos usan casillas (`- [ ]`) para seguir el avance.

**Objetivo:** una placa abajo a la derecha del inicio que aparece al apuntar a un destino (7 planetas + la Z-dragón), a la que vuela el dragón para posarse debajo y activarla; activa, lleva a la página del destino.

**Arquitectura:** `js/barra-viaje.js` es una máquina de 3 estados (`oculta` → `esperando` → `activa`) que solo cambia `data-estado` y `data-tema` en `.viaje` y habla con `js/dragon-vuelo.js` mediante eventos en `document` (`dragon-llamar`, `dragon-despedir`, `dragon-posado`). Todo el aspecto va en CSS: base + placa de Ludwig en `css/barra-viaje.css` y la placa de cada juego al final de su `css/planetas/<juego>.css`.

**Tecnología:** HTML, CSS y JavaScript puros (sin dependencias). Pruebas en el navegador integrado (`mcp__Claude_Browser__*`) con fragmentos de JavaScript: el proyecto no tiene ejecutor de tests.

**Spec:** `docs/superpowers/specs/2026-09-28-barra-de-viaje-design.md`

## Restricciones globales

- Hablar a Ludwig en **español**; código simple y **comentado en español**; sin dependencias.
- Después de cada tarea: explicarle a Ludwig en pocas líneas qué hace el código y por qué, y sugerirle 1–2 cambios que pueda probar él (colores, tiempos, textos).
- **Ediciones en paralelo:** Ludwig y otras sesiones tocan los mismos archivos. Releer cada archivo justo antes de editarlo y usar reemplazos exactos; si un texto no se encuentra, parar y avisar. Nunca reescribir un archivo existente entero.
- **Commits:** `index.html`, `css/inicio.css`, `js/dragon-vuelo.js` y `css/planetas/*.css` tienen trabajo de Ludwig sin guardar. Hacer commit **solo** de archivos nuevos de este plan (`js/barra-viaje.js`, `css/barra-viaje.css`); los demás se quedan sin commit hasta que Ludwig decida. Mensajes terminados en `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Dragón posado = `img/dragon-vuelo.webp`** (627×240, con transparencia): es el mismo dibujo que Ludwig pegó (`stylesrefence/dragon/Dragon17z.png`) y el que ya vuela. Recto y quieto coincide al píxel con el último fotograma del vuelo. No crear otra imagen.
- **El dragón que vuela (3ª versión, de otra sesión) NO se reescribe:** tiras rígidas que siguen el rastro de la cabeza, cuello de rigidez gradual, `EJE` 0.64, `SOLAPE` 2. Prohibido volver a estirar tiras o añadir una ola del cuerpo independiente del avance. Solo se cambia el camino, el avance y los avisos.
- Textos exactos: esperando **"Rumbo a {nombre}"**; activa con página **"{verbo} {nombre}"** (verbo por defecto **"Viajar a"**, Z-dragón **"Conocer a"**); activa sin página **"{nombre} llegará pronto"**.
- Nombres: `ludwig` "Ludwig" (verbo "Conocer a", enlace `sobre-mi/`), `elden-ring` "Elden Ring", `hollow-knight` "Hollow Knight", `wukong` "Black Myth: Wukong", `cyberpunk` "Cyberpunk 2077", `witcher` "The Witcher 3", `zelda` "Zelda: Ocarina of Time", `outer-wilds` "Outer Wilds" (enlace `outer-wilds/`). Las páginas `sobre-mi/` y `outer-wilds/` aún no existen (ya se enlazan hoy desde el menú y el planeta): se crean en el paso 2 del orden de trabajo de CLAUDE.md.
- Tiempos: aparecer ≈ 0,45 s; activarse ≈ 0,9 s (una vez; después brillo quieto, sin bucles); vuelo ≈ 2 s; margen al dejar de apuntar 200 ms; activación sin dragón a los 2 s; cruce lienzo → imagen quieta 0,15 s.
- **Regla de las animaciones:** el estado final de cada placa va en la regla normal; los `@keyframes` solo dicen de dónde viene (`from`/pasos intermedios). Así, con `prefers-reduced-motion` (animaciones quitadas) cada placa se ve completa.
- Legal: ninguna placa usa logos ni arte oficial; la de Elden Ring **sin círculos ni líneas verticales**.
- La placa por encima de los planetas (`z-index: 95`; los planetas van de 10 a 90).

## Puntos a vigilar en la revisión

1. Pasar el ratón rápido por varios planetas mientras el dragón vuela: el dragón sigue su vuelo (no vuelve a empezar), la placa cambia de juego, sin parpadeos. → prueba J (Tarea 2).
2. Salir y volver a entrar al mismo planeta en menos de 200 ms: la placa sigue esperando y el dragón sigue volando. → prueba K (Tarea 2).
3. Cambiar el tamaño de la ventana en pleno vuelo: el dragón sigue llegando justo bajo la placa. → prueba del paso 5 de la Tarea 3.
4. Tocar un planeta con el dedo: el `pointerleave` que llega tras el toque no cancela la espera. → prueba L (Tarea 2).
5. Pulsar o arrastrar sobre la placa no hace girar la órbita. → prueba M (Tarea 2).

## Utilidades de prueba

Servidor: configuración `barra-viaje` de `.claude/launch.json` (Tarea 1). Abrir con `mcp__Claude_Browser__preview_start {name: "barra-viaje"}` y `mcp__Claude_Browser__resize_window {width: 1280, height: 720}` (si el panel está oculto, `innerHeight` es 0 y las cartas miden 0). Si el panel está oculto, los temporizadores pueden no avanzar: pedir a Ludwig que muestre el panel o avanzar a mano.

**Ayudante `P`** — pegar con `javascript_tool` después de cada recarga, antes de las pruebas:

```js
window.P = {
  barra: document.querySelector(".viaje"),
  placa: document.querySelector(".viaje__placa"),
  texto: () => document.querySelector(".viaje__texto").textContent,
  destino: (tema) => document.querySelector(`[data-destino="${tema}"]`),
  entra: (el, tipo = "mouse") => el.dispatchEvent(new PointerEvent("pointerenter", { pointerType: tipo })),
  sale: (el, tipo = "mouse") => el.dispatchEvent(new PointerEvent("pointerleave", { pointerType: tipo })),
  posar: () => document.dispatchEvent(new CustomEvent("dragon-posado")),
  escape: () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })),
  espera: (ms) => new Promise((r) => setTimeout(r, ms)),
};
"listo"
```

**Cola manual de fotogramas `F`** — para la Tarea 3 (con el panel oculto `requestAnimationFrame` no corre). Pegar tras recargar y después de que la página haya cargado:

```js
window.F = { cola: [], reloj: performance.now() };
window.requestAnimationFrame = (f) => { F.cola.push(f); return F.cola.length; };
F.avanzar = (segundos) => {
  for (let i = 0; i < Math.round(segundos * 60); i++) {
    F.reloj += 1000 / 60;
    F.cola.splice(0).forEach((f) => f(F.reloj));
  }
};
"listo"
```

---

### Tarea 1: Servidor de pruebas

**Archivos:**
- Crear: `<scratchpad>/servidor.cjs` (scratchpad = `C:\Users\ander\AppData\Local\Temp\claude\C--Users-ander-Projects-PortafolioWeb\66f2f5a4-2a94-4b4a-805a-a5c7bf7ff902\scratchpad`)
- Modificar: `.claude/launch.json` (añadir una configuración; el archivo está en .gitignore)

**Interfaces:**
- Produce: configuración `barra-viaje` que sirve el proyecto en `/`, el scratchpad en `/_sp/` y guarda `POST /guardar/<nombre>` en `<scratchpad>/out/` (útil para capturas de lienzos).

- [ ] **Paso 1: Crear el servidor**

`<scratchpad>/servidor.cjs`:

```js
const http = require("http"), fs = require("fs"), path = require("path");
const RAIZ = "C:/Users/ander/Projects/PortafolioWeb";
const SCRATCH = "C:/Users/ander/AppData/Local/Temp/claude/C--Users-ander-Projects-PortafolioWeb/66f2f5a4-2a94-4b4a-805a-a5c7bf7ff902/scratchpad";
const SALIDA = path.join(SCRATCH, "out");
fs.mkdirSync(SALIDA, { recursive: true });
const tipos = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml" };
const puerto = Number(process.env.PORT || 5540);
http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (req.method === "POST" && url.startsWith("/guardar/")) {
    const trozos = [];
    req.on("data", (d) => trozos.push(d));
    req.on("end", () => { fs.writeFileSync(path.join(SALIDA, path.basename(url)), Buffer.concat(trozos)); res.end("ok"); });
    return;
  }
  let f = url.startsWith("/_sp/") ? path.join(SCRATCH, url.slice(5)) : path.join(RAIZ, url);
  if (url.endsWith("/")) f = path.join(f, "index.html");
  fs.readFile(f, (e, d) => {
    if (e) { res.statusCode = 404; return res.end("404"); }
    res.setHeader("Content-Type", tipos[path.extname(f)] || "application/octet-stream");
    res.setHeader("Cache-Control", "no-store");
    res.end(d);
  });
}).listen(puerto, () => console.log("servidor en " + puerto));
```

- [ ] **Paso 2: Registrar el servidor en `.claude/launch.json`**

Releer el archivo y añadir al final de `configurations` (tras la entrada `dragon-prueba`, con coma antes):

```json
    {
      "name": "barra-viaje",
      "runtimeExecutable": "node",
      "runtimeArgs": [
        "C:/Users/ander/AppData/Local/Temp/claude/C--Users-ander-Projects-PortafolioWeb/66f2f5a4-2a94-4b4a-805a-a5c7bf7ff902/scratchpad/servidor.cjs"
      ],
      "port": 5540,
      "autoPort": true
    }
```

- [ ] **Paso 3: Comprobar el servidor**

`mcp__Claude_Browser__preview_start {name: "barra-viaje"}`, `resize_window {width: 1280, height: 720}` y `get_page_text`: se ve el inicio (título, pista "Arrastra para girar"). `navigate` a `http://localhost:<puerto>/img/dragon-vuelo.webp`: se ve el dragón con ojos rojos (el que se usará posado). Sin commit (el servidor vive en el scratchpad).

---

### Tarea 2: La barra (HTML, CSS base con la placa de Ludwig, estados en JS)

**Archivos:**
- Modificar: `index.html` (8 destinos, `<link>`, marcado de `.viaje`, `<script>`)
- Modificar: `css/inicio.css` (`--alto-dragon-vuelo` pasa de `.dragon-vuelo` a `.orbita`)
- Crear: `css/barra-viaje.css`
- Crear: `js/barra-viaje.js`

**Interfaces:**
- Consume: `img/dragon-vuelo.webp` (627×240) como imagen del dragón posado; servidor `barra-viaje` (Tarea 1).
- Produce:
  - HTML: `.viaje[data-estado][data-tema]` > `a.viaje__placa` (> `span.viaje__lienzo`, `span.viaje__texto`), `img.viaje__dragon`, `p.viaje__aviso.solo-lector`.
  - Destinos: `[data-destino][data-nombre]` con `data-enlace` y `data-verbo` opcionales, en `.planeta__enlace` y `.agujero__zona`.
  - Eventos: emite `dragon-llamar` con `detail = { destino: HTMLImageElement /* .viaje__dragon */, vuela: false }` (quien vuele pone `vuela = true` de forma síncrona) y `dragon-despedir` (sin detail); escucha `dragon-posado`.
  - CSS: variables `--placa-fondo`, `--placa-borde`, `--placa-texto`, `--placa-sombra`, `--placa-brillo` en `.viaje__placa`; `--alto-dragon-vuelo` en `.orbita`.

- [ ] **Paso 1: Escribir la prueba que falla**

Recargar la página (`navigate` a `http://localhost:<puerto>/`), `resize_window 1280×720`, pegar el ayudante `P` y ejecutar:

```js
(async () => {
  const r = {};
  const hk = P.destino("hollow-knight"), ow = P.destino("outer-wilds"), z = P.destino("ludwig");
  let llamadas = 0, ultimoPedido = null;
  document.addEventListener("dragon-llamar", (e) => { llamadas++; ultimoPedido = e.detail; });

  // A. Apuntar: esperando
  P.entra(hk);
  r.A = [P.barra.dataset.estado, P.barra.dataset.tema, P.texto(), P.placa.hasAttribute("href")].join("|");
  // I. El pedido al dragón apunta a la imagen quieta
  r.I = ultimoPedido && ultimoPedido.destino === document.querySelector(".viaje__dragon");
  // B. Se posa: activa sin página
  P.posar();
  r.B = [P.barra.dataset.estado, P.texto(), P.placa.hasAttribute("href")].join("|");
  // C. Dejar de apuntar con la placa activa: se queda
  P.sale(hk); await P.espera(300);
  r.C = P.barra.dataset.estado;
  // D. Otro destino con página
  P.entra(ow); P.posar();
  r.D = [P.barra.dataset.tema, P.texto(), P.placa.getAttribute("href")].join("|");
  // E. Escape: oculta
  P.escape();
  r.E = P.barra.dataset.estado;
  // F. La Z-dragón
  P.entra(z); P.posar();
  r.F = [P.texto(), P.placa.getAttribute("href")].join("|");
  P.escape();
  // G. Dejar de apuntar antes de que llegue: se va
  P.entra(hk); P.sale(hk); await P.espera(300);
  r.G = P.barra.dataset.estado;
  // J. Cambiar de planeta mientras vuela: no se llama a otro dragón
  llamadas = 0;
  P.entra(hk); P.sale(hk); P.entra(P.destino("wukong"));
  r.J = [llamadas, P.barra.dataset.tema, P.texto()].join("|");
  P.posar(); P.entra(P.destino("elden-ring"));   // con la placa activa sí sale otro
  r.J2 = llamadas;
  P.escape();
  // K. Salir y volver al mismo antes de 200 ms
  P.entra(hk); P.sale(hk); await P.espera(80); P.entra(hk); await P.espera(300);
  r.K = P.barra.dataset.estado;
  P.escape();
  // L. Toque con el dedo: el pointerleave del toque no cancela
  P.entra(hk, "touch"); P.sale(hk, "touch"); await P.espera(300);
  r.L = P.barra.dataset.estado;
  P.escape();
  // M. Pulsar la placa no llega a la órbita (no la arrastra)
  let llegaALaOrbita = false;
  const orbita = document.querySelector(".orbita");
  const oir = () => { llegaALaOrbita = true; };
  orbita.addEventListener("pointerdown", oir);
  P.placa.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0 }));
  orbita.removeEventListener("pointerdown", oir);
  r.M = llegaALaOrbita;
  // H. Sin dragón que conteste, se activa sola a los 2 s
  P.entra(hk); await P.espera(2200);
  r.H = P.barra.dataset.estado;
  P.escape();
  return r;
})()
```

- [ ] **Paso 2: Ejecutarla y ver que falla**

Esperado: error `Cannot read properties of null (reading 'dataset')` (`.viaje` no existe todavía).

- [ ] **Paso 3: Datos en los 8 destinos (`index.html`)**

Releer `index.html`. Reemplazos exactos (cada texto aparece una sola vez):

| Texto actual | Nuevo |
|---|---|
| `aria-expanded="false" aria-controls="presentacion"></button>` | `aria-expanded="false" aria-controls="presentacion"`<br>`                data-destino="ludwig" data-nombre="Ludwig" data-verbo="Conocer a" data-enlace="sobre-mi/"></button>` |
| `aria-controls="carta-elden-ring">` | `aria-controls="carta-elden-ring" data-destino="elden-ring" data-nombre="Elden Ring">` |
| `aria-controls="carta-hollow-knight">` | `aria-controls="carta-hollow-knight" data-destino="hollow-knight" data-nombre="Hollow Knight">` |
| `aria-controls="carta-wukong">` | `aria-controls="carta-wukong" data-destino="wukong" data-nombre="Black Myth: Wukong">` |
| `aria-controls="carta-cyberpunk">` | `aria-controls="carta-cyberpunk" data-destino="cyberpunk" data-nombre="Cyberpunk 2077">` |
| `aria-controls="carta-witcher">` | `aria-controls="carta-witcher" data-destino="witcher" data-nombre="The Witcher 3">` |
| `aria-controls="carta-zelda">` | `aria-controls="carta-zelda" data-destino="zelda" data-nombre="Zelda: Ocarina of Time">` |
| `<a class="planeta__enlace" href="outer-wilds/">` | `<a class="planeta__enlace" href="outer-wilds/" data-destino="outer-wilds" data-nombre="Outer Wilds" data-enlace="outer-wilds/">` |

Encima del bloque de la Z (antes de `<button class="agujero__zona"`) no hace falta comentario nuevo; sí añadir este comentario una vez, justo antes de `<nav class="orbita__mundos"`:

```html
      <!-- Cada destino lleva sus datos para la barra de viaje (js/barra-viaje.js):
           data-destino = su tema, data-nombre = cómo se escribe, data-enlace = su página
           (sin data-enlace = "llegará pronto"), data-verbo = "Viajar a" si no se dice otro -->
```

- [ ] **Paso 4: Marcado de la barra, hoja de estilos y script (`index.html`)**

Tras `<link rel="stylesheet" href="css/inicio.css">` añadir:

```html
  <link rel="stylesheet" href="css/barra-viaje.css"> <!-- la placa de viaje (cada juego la viste en su archivo) -->
```

Tras `<canvas class="dragon-vuelo" aria-hidden="true"></canvas>` añadir:

```html

      <!-- Barra de viaje (js/barra-viaje.js, css/barra-viaje.css): la "placa del nombre" de la carta.
           Aparece al apuntar a un destino; el dragón vuela hasta aquí, se posa debajo y la activa.
           data-tema = el destino que la viste (cada juego en css/planetas/<juego>.css) -->
      <div class="viaje" data-estado="oculta">
        <a class="viaje__placa" aria-disabled="true">
          <span class="viaje__lienzo" aria-hidden="true"></span> <!-- hueco para un lienzo propio más adelante -->
          <span class="viaje__texto"></span>
        </a>
        <!-- Tu dibujo del dragón, quieto: es el mismo que vuela, así que al posarse no se nota el cambio -->
        <img class="viaje__dragon" src="img/dragon-vuelo.webp" alt="" width="627" height="240" decoding="async" fetchpriority="low">
        <!-- Lo que dice la placa, para lectores de pantalla -->
        <p class="viaje__aviso solo-lector" aria-live="polite"></p>
      </div>
```

Tras `<script src="js/dragon-vuelo.js" defer></script>` añadir:

```html
  <script src="js/barra-viaje.js" defer></script>
```

- [ ] **Paso 5: Mover `--alto-dragon-vuelo` a `.orbita` (`css/inicio.css`)**

Releer `css/inicio.css`. Reemplazar:

```css
/* Una franja pegada al fondo de la órbita, justo encima del pie.
   El JS lee --alto-dragon-vuelo: cámbialo aquí para hacerlo más grande o más pequeño
   (58px = el mismo alto que la Z-dragón del logo de arriba a la izquierda) */
.dragon-vuelo {
  --alto-dragon-vuelo: 58px;

  position: absolute;
```

por:

```css
/* Una franja pegada al fondo de la órbita, justo encima del pie.
   Su tamaño sale de --alto-dragon-vuelo (en .orbita) */
.dragon-vuelo {
  position: absolute;
```

Y reemplazar:

```css
  --tam-agujero: calc(var(--tam-planeta) * var(--agujero-planetas));
```

por:

```css
  --tam-agujero: calc(var(--tam-planeta) * var(--agujero-planetas));
  /* Alto del dragón que vuela (js/dragon-vuelo.js) y del posado bajo la barra de viaje.
     58px = el mismo alto que la Z-dragón del logo de arriba a la izquierda */
  --alto-dragon-vuelo: 58px;
```

- [ ] **Paso 6: Crear `css/barra-viaje.css`**

```css
/* =========================================================
   BARRA DE VIAJE (js/barra-viaje.js)
   La "placa del nombre" de la carta de tarot, abajo a la derecha de la órbita,
   con tu dragón posado debajo como pedestal.
   - data-estado: oculta → esperando ("Rumbo a…") → activa ("Viajar a…")
   - data-tema: el destino. Aquí va la base y la placa de Ludwig;
     la de cada juego va al final de css/planetas/<juego>.css
   Cada placa cambia unas variables (--placa-…) y pone dos animaciones:
   una al aparecer (esperando) y otra al activarse (activa).
   REGLA: el aspecto final va en la regla normal y los @keyframes solo dicen
   de dónde viene. Así, sin animaciones (reducir movimiento), se ve completa.
   ========================================================= */

.viaje {
  position: absolute;
  right: var(--margen-lateral);
  bottom: 0.5rem;
  z-index: 95; /* los planetas van de 10 a 90 (orbita.js): la placa va encima para recibir el clic */
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem; /* hueco entre la placa y el lomo del dragón */
  width: min(15rem, 100% - 2 * var(--margen-lateral));
  pointer-events: none; /* solo la placa activa con página recibe el ratón */
}

.viaje[data-estado="oculta"] {
  visibility: hidden;
}

/* ----- La placa ----- */
.viaje__placa {
  /* Lo que cambia cada juego */
  --placa-fondo: #16161e;
  --placa-borde: rgba(255, 255, 255, 0.35);
  --placa-texto: var(--color-texto);
  --placa-sombra: 0 0 #0000;                 /* sombra fija propia (p. ej. la magenta de Cyberpunk) */
  --placa-brillo: rgba(255, 255, 255, 0.3);  /* el brillo que se queda al activarse */

  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  min-height: 3rem;
  padding: 0.45rem 1rem;
  border: 1px solid var(--placa-borde);
  border-radius: 3px;
  background: var(--placa-fondo);
  box-shadow: var(--placa-sombra);
  color: var(--placa-texto);
  font-family: "Grenze", Georgia, serif;
  font-size: 1.15rem;
  font-weight: 600;
  line-height: 1.15;
  text-align: center;
  text-decoration: none;
  overflow: hidden; /* los efectos de dentro no se salen de la placa */
  transition: box-shadow 0.6s ease;
}

.viaje[data-estado="activa"] .viaje__placa {
  box-shadow: var(--placa-sombra), 0 0 1.4rem var(--placa-brillo);
}

/* Solo se puede pulsar cuando está activa y tiene página */
.viaje[data-estado="activa"] .viaje__placa[href] {
  pointer-events: auto;
  cursor: pointer;
}

.viaje__placa:focus-visible {
  outline: 2px solid var(--placa-texto);
  outline-offset: 3px;
}

/* Capas de dentro, de atrás a delante: textura (::before), lienzo propio, texto, efecto (::after) */
.viaje__placa::before,
.viaje__placa::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.viaje__lienzo {
  position: absolute;
  inset: 0;
  pointer-events: none; /* hueco para un lienzo propio si algún juego lo necesita más adelante */
}

.viaje__texto {
  position: relative;
  z-index: 1;
  transition: opacity 0.3s ease;
}

.viaje__placa::after {
  z-index: 2;
}

/* Mientras el dragón viene, el texto está algo apagado: aún no se puede pulsar */
.viaje[data-estado="esperando"] .viaje__texto {
  opacity: 0.6;
}

/* ----- El dragón posado (tu dibujo quieto) ----- */
.viaje__dragon {
  display: block;
  width: auto;
  max-width: none; /* global.css pone max-width: 100% a las imágenes */
  height: var(--alto-dragon-vuelo);
  opacity: 0;
  transition: opacity 0.15s linear; /* igual que FUNDIDO_POSARSE en js/dragon-vuelo.js */
}

.viaje[data-estado="activa"] .viaje__dragon {
  opacity: 1;
}

/* ----- Placa de Ludwig (la Z-dragón): cromo gris, como el casco de tu carta ----- */
.viaje[data-tema="ludwig"] .viaje__placa {
  --placa-fondo: linear-gradient(180deg, #eceef2 0%, #a4a8b1 46%, #5f636c 54%, #c3c6cd 100%);
  --placa-borde: #2b2d33;
  --placa-texto: #1b1c21;
  --placa-brillo: rgba(225, 30, 40, 0.5); /* el rojo de los ojos del dragón */
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.6); /* letras grabadas en el metal */
}

/* Trama de puntos, como el semitono de tus dibujos */
.viaje[data-tema="ludwig"] .viaje__placa::before {
  background: radial-gradient(circle, rgba(0, 0, 0, 0.16) 0.8px, transparent 1.2px) 0 0 / 4px 4px;
}

/* Aparecer: se forma a saltos desde el centro, como los píxeles */
.viaje[data-tema="ludwig"][data-estado="esperando"] .viaje__placa {
  animation: ludwig-placa-aparece 0.45s steps(6, end) both;
}

@keyframes ludwig-placa-aparece {
  from { clip-path: inset(38% 46% 38% 46%); }
  to   { clip-path: inset(0); }
}

/* Activarse: el borde se pone rojo y un reflejo cruza el cromo */
.viaje[data-tema="ludwig"][data-estado="activa"] .viaje__placa {
  --placa-borde: #b3121c;
}

.viaje[data-tema="ludwig"] .viaje__placa::after {
  background: linear-gradient(105deg, transparent 35%, rgba(255, 255, 255, 0.9) 50%, transparent 65%);
  transform: translateX(-110%);
}

.viaje[data-tema="ludwig"][data-estado="activa"] .viaje__placa::after {
  animation: ludwig-reflejo 0.9s ease-in-out both;
}

@keyframes ludwig-reflejo {
  to { transform: translateX(110%); }
}

/* ----- Con "reducir movimiento": sin animaciones, solo el cambio de estado ----- */
@media (prefers-reduced-motion: reduce) {
  .viaje__placa,
  .viaje__placa::before,
  .viaje__placa::after,
  .viaje__texto {
    animation: none !important;
  }
}
```

- [ ] **Paso 7: Crear `js/barra-viaje.js`**

```js
// =========================================================
// BARRA DE VIAJE
// La "placa del nombre" de la carta, abajo a la derecha.
// 1. Apuntas a un destino (un planeta o la Z) → la placa aparece ("Rumbo a X")
//    y llama al dragón (js/dragon-vuelo.js) para que vuele hasta ella.
// 2. El dragón llega y se posa debajo → la placa se ACTIVA ("Viajar a X"):
//    ya se puede pulsar y se queda aunque dejes de apuntar.
// 3. Si dejas de apuntar antes de que llegue, se van la placa y el dragón.
// Este archivo solo cambia data-estado y data-tema: el aspecto de cada
// juego está en CSS (css/barra-viaje.css y css/planetas/<juego>.css).
// =========================================================

// Todo va dentro de (() => { ... })() para que sus variables no choquen con las de otros archivos
(() => {

// ----- Ajustes (¡prueba a cambiarlos!) -----
const MARGEN_SALIDA = 200;      // ms de espera al dejar de apuntar (para saltar entre planetas sin parpadeo)
const ESPERA_SIN_DRAGON = 2000; // ms: si el dragón no puede volar, la placa se activa sola

// ----- Elementos de la página -----
const barra = document.querySelector(".viaje");
const placa = barra.querySelector(".viaje__placa");
const texto = barra.querySelector(".viaje__texto");
const aviso = barra.querySelector(".viaje__aviso");
const dragonPosado = barra.querySelector(".viaje__dragon");
// Los destinos llevan sus datos en el HTML: data-destino, data-nombre, data-enlace y data-verbo
const destinos = [...document.querySelectorAll(".agujero__zona[data-destino], .planeta__enlace[data-destino]")];

// ----- Estado -----
let estado = "oculta";   // "oculta" | "esperando" | "activa"
let actual = null;       // el botón del destino elegido
let temporizadorSalida = 0;
let temporizadorReserva = 0;
let ignorarFoco = false; // al devolver el foco con Escape, que la placa no vuelva a abrirse

function ponerEstado(nuevo) {
  estado = nuevo;
  barra.dataset.estado = nuevo;
}

// Escribe el texto de la placa y lo anuncia a los lectores de pantalla
function escribir(frase) {
  texto.textContent = frase;
  aviso.textContent = frase;
}

function quitarEnlace() {
  placa.removeAttribute("href");
  placa.setAttribute("aria-disabled", "true");
}

// ----- Los tres momentos -----
function esperar(boton) {
  actual = boton;
  barra.dataset.tema = boton.dataset.destino; // cambia el aspecto (y su animación de aparecer empieza)
  quitarEnlace();                              // aún no se puede pulsar
  escribir(`Rumbo a ${boton.dataset.nombre}`);
  ponerEstado("esperando");
}

function llamarDragon() {
  clearTimeout(temporizadorReserva);
  // El dragón mira dónde está su imagen quieta para saber adónde volar.
  // Si puede volar, pone vuela = true; si no (reducir movimiento, o aún sin cargar),
  // activamos la placa nosotros tras una espera
  const pedido = { destino: dragonPosado, vuela: false };
  document.dispatchEvent(new CustomEvent("dragon-llamar", { detail: pedido }));
  if (!pedido.vuela) temporizadorReserva = setTimeout(activar, ESPERA_SIN_DRAGON);
}

function activar() {
  if (estado !== "esperando") return; // llegó tarde: ya no hay nada que activar
  clearTimeout(temporizadorReserva);
  const { nombre, enlace, verbo = "Viajar a" } = actual.dataset;
  if (enlace) {
    placa.href = enlace;
    placa.removeAttribute("aria-disabled");
    escribir(`${verbo} ${nombre}`);
  } else {
    escribir(`${nombre} llegará pronto`);
  }
  ponerEstado("activa");
}

function ocultar() {
  clearTimeout(temporizadorSalida);
  clearTimeout(temporizadorReserva);
  document.dispatchEvent(new CustomEvent("dragon-despedir"));
  quitarEnlace();
  aviso.textContent = "";
  ponerEstado("oculta");
  actual = null;
}

// ----- Apuntar y dejar de apuntar -----
function apuntar(evento) {
  if (ignorarFoco) return;
  const boton = evento.currentTarget;
  clearTimeout(temporizadorSalida);
  if (boton === actual) return;            // el mismo destino: todo sigue igual
  const volando = estado === "esperando";  // el dragón ya viene hacia la placa
  esperar(boton);
  // Si el dragón ya vuela, sigue su vuelo: solo cambia la placa.
  // Si no (estaba oculta, o la anterior ya estaba activa), sale un dragón nuevo
  if (!volando) llamarDragon();
}

function dejar(evento) {
  if (evento.pointerType === "touch") return; // con el dedo no hay "quitar el ratón": el dragón llega igual
  if (evento.currentTarget !== actual || estado !== "esperando") return; // activa: se queda
  clearTimeout(temporizadorSalida);
  temporizadorSalida = setTimeout(ocultar, MARGEN_SALIDA);
}

for (const boton of destinos) {
  boton.addEventListener("pointerenter", apuntar);
  boton.addEventListener("focus", apuntar);
  boton.addEventListener("pointerleave", dejar);
  boton.addEventListener("blur", dejar);
}

// El dragón avisa cuando se ha posado bajo la placa
document.addEventListener("dragon-posado", activar);

// Escape guarda la placa. Si el foco estaba en ella, vuelve a su destino (sin reabrirla)
document.addEventListener("keydown", (evento) => {
  if (evento.key !== "Escape" || estado === "oculta") return;
  const volverA = document.activeElement === placa ? actual : null;
  ocultar();
  if (volverA) {
    ignorarFoco = true;
    volverA.focus();
    ignorarFoco = false;
  }
});

// La barra está dentro de la órbita: que pulsarla no empiece a arrastrar los planetas (orbita.js)
barra.addEventListener("pointerdown", (evento) => evento.stopPropagation());

})();
```

- [ ] **Paso 8: Ejecutar la prueba del paso 1 y ver que pasa**

Recargar, pegar `P`, ejecutar la prueba. Esperado:

```js
{
  A: "esperando|hollow-knight|Rumbo a Hollow Knight|false",
  I: true,
  B: "activa|Hollow Knight llegará pronto|false",
  C: "activa",
  D: "outer-wilds|Viajar a Outer Wilds|outer-wilds/",
  E: "oculta",
  F: "Conocer a Ludwig|sobre-mi/",
  G: "oculta",
  J: "1|wukong|Rumbo a Black Myth: Wukong",
  J2: 2,
  K: "esperando",
  L: "esperando",
  M: false,
  H: "activa"
}
```

(En esta tarea `js/dragon-vuelo.js` aún no contesta a `dragon-llamar`, por eso H se activa sola: es el camino "sin dragón".) `read_console_messages {onlyErrors: true}`: sin errores.

- [ ] **Paso 9: Captura de la placa de Ludwig**

```js
P.entra(P.destino("ludwig")); P.posar(); "ok"
```

Esperar 1 s, `computer {action: "zoom", region: [<zona abajo a la derecha>]}`: placa de cromo con "Conocer a Ludwig", borde rojo, dragón posado debajo, por encima de los planetas.

- [ ] **Paso 10: Commit (solo archivos nuevos)**

```bash
git add css/barra-viaje.css js/barra-viaje.js
git commit -m "Barra de viaje: placa con estados y placa de Ludwig

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarea 3: El dragón vuela hasta la placa (`js/dragon-vuelo.js`)

**Archivos:**
- Modificar (reemplazos exactos, tras releer): `js/dragon-vuelo.js`

**Interfaces:**
- Consume: `dragon-llamar` con `detail = { destino: HTMLImageElement, vuela: boolean }`; `dragon-despedir`; `--alto-dragon-vuelo` (heredada de `.orbita`).
- Produce: `dragon-posado` (sin detail), una vez por vuelo, solo si nadie lo despidió por el camino. Pone `detail.vuela = true` de forma síncrona cuando acepta volar.

- [ ] **Paso 1: Escribir la prueba que falla**

Recargar, esperar a que cargue (el dibujo se pide en `load`), `resize_window 1280×720`, pegar `P` y luego `F`, y ejecutar:

```js
(() => {
  const r = {};
  let posado = 0, pedido = null;
  document.addEventListener("dragon-posado", () => posado++);
  document.addEventListener("dragon-llamar", (e) => { pedido = e.detail; });
  F.reloj = performance.now();
  P.entra(P.destino("hollow-knight"));
  r.vuela = pedido.vuela;
  F.avanzar(1.0);
  // Punto 3 de "vigilar": cambiar el tamaño en pleno vuelo
  window.dispatchEvent(new Event("resize"));
  F.avanzar(0.9);
  r.antes = posado;
  // Justo antes de posarse, el dragón está donde acaba la imagen quieta
  const lienzo = document.querySelector(".dragon-vuelo");
  const caja = document.querySelector(".viaje__dragon").getBoundingClientRect();
  const l = lienzo.getBoundingClientRect(), dpr = lienzo.width / l.width;
  const x = (caja.right - 25 - l.left) * dpr, y = (caja.top - l.top) * dpr;
  const zona = lienzo.getContext("2d").getImageData(x, y, 20 * dpr, caja.height * dpr).data;
  let opacos = 0;
  for (let i = 3; i < zona.length; i += 4) if (zona[i] > 40) opacos++;
  r.cabezaEnSuSitio = opacos > 50;
  F.avanzar(0.2);
  r.despues = posado;
  r.estado = P.barra.dataset.estado;
  F.avanzar(0.3);
  r.paradoAlFinal = F.cola.length === 0;
  P.escape();
  // Despedido por el camino: no avisa de posado
  posado = 0;
  F.reloj = performance.now();
  P.entra(P.destino("witcher"));
  F.avanzar(0.5);
  P.sale(P.destino("witcher"));
  // el margen de 200 ms es un setTimeout: lo saltamos despidiéndolo ya
  document.dispatchEvent(new CustomEvent("dragon-despedir"));
  F.avanzar(2.5);
  r.despedidoNoAvisa = posado === 0;
  P.escape();
  return r;
})()
```

- [ ] **Paso 2: Ejecutarla y ver que falla**

Esperado: `vuela: false` (el dragón actual no escucha `dragon-llamar`), `antes: 0, despues: 0, estado: "esperando"`.

- [ ] **Paso 3: Cambiar `js/dragon-vuelo.js` con reemplazos exactos**

Releer el archivo justo antes. Es la 3ª versión (tiras rígidas que siguen el rastro, cuello de rigidez gradual): **`dibujar()` y `puntoEn()` no se tocan.** Si algún texto de abajo no se encuentra (Ludwig u otra sesión lo cambió), parar y avisar. Si Ludwig cambió algún número de ajustes, conservar el suyo.

**3a. Cabecera.** Reemplazar:

```js
// Al apuntar a un planeta o a la Z-dragón del centro, un dragón cruza
// la parte de abajo de la órbita, de izquierda a derecha, ondulando.
// Al dejar de apuntar se desvanece.
```

por:

```js
// Cuando la barra de viaje (js/barra-viaje.js) lo llama, un dragón sale por
// abajo a la izquierda y vuela ondulando hasta posarse bajo la placa.
// Al llegar avisa ("dragon-posado") y se desvanece: en su sitio queda el mismo
// dibujo quieto (una <img> dentro de la barra), así que no se nota el cambio.
//
// Avisos (eventos en document):
//   "dragon-llamar"   → recibe { destino: <img>, vuela }: vuela hasta esa imagen y pone vuela = true
//   "dragon-despedir" → se desvanece donde esté
//   "dragon-posado"   → lo envía él al llegar
```

**3b. Duración.** Reemplazar:

```js
// El tamaño se cambia en css/inicio.css (--alto-dragon-vuelo)
const DURACION_CRUCE = 7;       // segundos que tarda en cruzar la pantalla
```

por:

```js
// El tamaño se cambia en css/inicio.css (--alto-dragon-vuelo, en .orbita)
const DURACION_VUELO = 2;       // segundos que tarda en llegar a la placa
```

**3c. Quitar la subida** (el camino ahora acaba en la placa). Borrar la línea:

```js
const SUBIDA = 0.35;            // cuánto sube de izquierda a derecha, en altos de dragón
```

**3d. Fundido al posarse.** Reemplazar:

```js
const MARGEN_SALTO = 200;       // milisegundos de espera al saltar de un planeta a otro (para que no parpadee)
```

por:

```js
const FUNDIDO_POSARSE = 0.15;   // al llegar se cruza con la imagen quieta (igual que su transición en css/barra-viaje.css)
```

**3e. Ya no escucha a los planetas** (lo hace la barra). Borrar la línea:

```js
const disparadores = document.querySelectorAll(".planeta__enlace, .agujero__zona");
```

**3f. Estado.** Reemplazar:

```js
let posicion = 0;                   // cuánto camino ha recorrido la cabeza (en píxeles)
let opacidad = 0;
let activo = false;                 // ¿hay algo apuntado?
let unaVuelta = false;              // en pantallas táctiles no hay "quitar el ratón": un solo cruce
let corriendo = false;              // ¿está en marcha la animación?
let anterior = 0;
let temporizador = 0;
```

por:

```js
let posicion = 0;                   // cuánto camino ha recorrido la cabeza (en píxeles)
let objetivo = null;                // la imagen quieta bajo la placa: allí se posa
let vuelo = 0;                      // 0 = sale, 1 = posado
let posado = false;
let opacidad = 0;
let activo = false;                 // ¿debe verse?
let corriendo = false;              // ¿está en marcha la animación?
let anterior = 0;
```

**3g. El camino.** Reemplazar el comentario y la función entera, desde `// ----- El camino -----` hasta la `}` que cierra `construirCamino()` (el texto actual empieza con `// Curvas que suben poco a poco: empieza abajo a la izquierda (fuera de la pantalla)` y acaba con `camino.push({ x, y, largo: recorrido });\n  }\n}`), por:

```js
// ----- El camino -----
// Sale abajo a la izquierda (fuera de la pantalla) y acaba bajo la placa: la cabeza en el
// borde derecho de la imagen quieta. Las curvas se van aplanando y el último largo de
// dragón es RECTO, para que llegue tumbado como en el dibujo. Guardamos puntos cada 2 px
// con el largo recorrido hasta cada uno, para poder decir "dame el punto a X píxeles".
function construirCamino() {
  camino = [];
  const lienzo = lienzoDragon.getBoundingClientRect();
  const caja = objetivo.getBoundingClientRect();
  const cabezaX = caja.right - lienzo.left;
  const ejeFinal = caja.top - lienzo.top + EJE * altoDragon; // la columna del cuerpo a la altura de la imagen
  const colaX = cabezaX - largoDragon;                        // aquí empieza el tramo recto
  const inicio = -largoDragon - 20;
  const largoCurva = largoDragon * CURVA_LARGO;
  const altura = CURVA_ALTO * altoDragon;
  // La línea de salida: lo bastante alta para que ni la curva más baja toque el pie
  const ejeInicio = alto - (1 - EJE) * altoDragon - altura * (1 + CURVA_LENTA) - 3;
  let recorrido = 0;
  const anadir = (x, y) => {
    const previo = camino[camino.length - 1];
    if (previo) recorrido += Math.hypot(x - previo.x, y - previo.y);
    camino.push({ x, y, largo: recorrido });
  };
  for (let x = inicio; x < cabezaX; x += 2) {
    const avance = Math.min(1, (x - inicio) / Math.max(1, colaX - inicio)); // 0 al salir, 1 en el tramo recto
    const suave = avance * avance * (3 - 2 * avance); // arranca y llega sin tirones (smoothstep)
    const curvas = (1 - suave) * altura * (                                  // se aplanan al llegar
      Math.sin((x / largoCurva) * Math.PI * 2 + fase) +
      CURVA_LENTA * Math.sin((x / (largoCurva * 2.7)) * Math.PI * 2 + faseLenta));
    anadir(x, ejeInicio + (ejeFinal - ejeInicio) * suave + curvas);
  }
  anadir(cabezaX, ejeFinal); // el último punto, exacto
}
```

**3h. Empezar un vuelo y colocar la cabeza.** Reemplazar:

```js
function nuevaVuelta() {
  fase = Math.random() * Math.PI * 2; // cada cruce se curva distinto
  faseLenta = Math.random() * Math.PI * 2;
  construirCamino();
  posicion = largoDragon; // la cabeza empieza donde el cuerpo entero cabe (aún fuera de la pantalla)
}
```

por:

```js
function nuevoVuelo() {
  fase = Math.random() * Math.PI * 2; // cada vuelo se curva distinto
  faseLenta = Math.random() * Math.PI * 2;
  construirCamino();
  vuelo = 0;
  posado = false;
  opacidad = 0;
  posicion = largoDragon; // la cabeza empieza donde el cuerpo entero cabe (aún fuera de la pantalla)
}

// Dónde va la cabeza según el vuelo (0 → 1): llega frenando, 1 − (1 − vuelo)³.
// Con vuelo = 1 todo el cuerpo está en el tramo recto, justo encima de la imagen quieta
function colocarCabeza() {
  const total = camino[camino.length - 1].largo;
  posicion = largoDragon + (total - largoDragon) * (1 - Math.pow(1 - vuelo, 3));
}
```

**3i. El avance en cada fotograma.** En `fotograma()`, reemplazar:

```js
  // La opacidad va hacia 1 si hay algo apuntado y hacia 0 si no
  if (activo) opacidad = Math.min(1, opacidad + dt / FUNDIDO_ENTRADA);
  else opacidad = Math.max(0, opacidad - dt / FUNDIDO_SALIDA);

  const total = camino[camino.length - 1].largo;
  posicion += ((total - largoDragon) / DURACION_CRUCE) * dt;

  // Ha salido por la derecha: si sigues apuntando, vuelve a entrar por la izquierda
  if (posicion >= total) {
    if (activo && !unaVuelta) nuevaVuelta();
    else { activo = false; opacidad = 0; }
  }
```

por:

```js
  // Avanza el vuelo. Al llegar avisa a la barra (solo si nadie lo ha despedido por el camino)
  if (!posado) {
    vuelo = Math.min(1, vuelo + dt / DURACION_VUELO);
    colocarCabeza();
    if (vuelo === 1) {
      posado = true;
      if (activo) {
        activo = false; // se desvanece rápido mientras aparece la imagen quieta
        document.dispatchEvent(new CustomEvent("dragon-posado"));
      }
    }
  }

  // La opacidad va hacia 1 mientras vuela y hacia 0 al posarse o si lo despiden
  if (activo) opacidad = Math.min(1, opacidad + dt / FUNDIDO_ENTRADA);
  else opacidad = Math.max(0, opacidad - dt / (posado ? FUNDIDO_POSARSE : FUNDIDO_SALIDA));
```

**3j. Los avisos.** Reemplazar todo el bloque desde `// ----- Aparecer y desaparecer -----` hasta el final del bucle `for (const elemento of disparadores) { … }` (incluido) por:

```js
// ----- Los avisos de la barra de viaje -----
document.addEventListener("dragon-llamar", (evento) => {
  if (menosMovimientoDragon.matches) return;                        // sin vuelo: la barra se activa sola
  if (!dibujoDragon.complete || !dibujoDragon.naturalWidth) return; // aún no ha cargado
  evento.detail.vuela = true;
  objetivo = evento.detail.destino;
  if (!dragonEscalado) medir();
  nuevoVuelo(); // siempre desde la izquierda: la barra solo llama cuando hace falta un dragón nuevo
  activo = true;
  if (!corriendo) {
    corriendo = true;
    anterior = performance.now();
    requestAnimationFrame(fotograma);
  }
});

document.addEventListener("dragon-despedir", () => { activo = false; });
```

**3k. Cambio de tamaño.** Reemplazar:

```js
window.addEventListener("resize", () => {
  if (!dragonEscalado) return;
  const avance = camino.length ? posicion / camino[camino.length - 1].largo : 0;
  medir();
  construirCamino();
  posicion = avance * camino[camino.length - 1].largo; // sigue por el mismo sitio del cruce
});
```

por:

```js
window.addEventListener("resize", () => {
  if (!dragonEscalado || !objetivo) return;
  medir();
  construirCamino(); // "vuelo" va de 0 a 1: sigue por el mismo punto del camino nuevo
  colocarCabeza();
});
```

**3l. Comprobar que no quedan restos:** `Grep` en `js/dragon-vuelo.js` de `DURACION_CRUCE|SUBIDA|MARGEN_SALTO|disparadores|unaVuelta|temporizador|nuevaVuelta` → 0 resultados.

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

Recargar, esperar la carga, pegar `P` y `F`, ejecutar la prueba del paso 1. Esperado:

```js
{ vuela: true, antes: 0, cabezaEnSuSitio: true, despues: 1, estado: "activa", paradoAlFinal: true, despedidoNoAvisa: true }
```

Volver a ejecutar la prueba de la Tarea 2 (paso 1): todo igual salvo que **H** ahora pasa porque el dragón vuela y se posa. Si el panel está oculto, rAF no corre y H queda en `"esperando"`: en ese caso, comprobar H en la Tarea 12 con el panel visible. Consola sin errores.

- [ ] **Paso 5: Ver el vuelo**

Con el panel visible (sin `F`: recargar), pasar el ratón de verdad por un planeta con `computer {action: "hover"}` y hacer 3 capturas (0,5 s, 1,5 s, 2,3 s): sale abajo a la izquierda, ondula, llega recto bajo la placa y se cambia por la imagen quieta sin salto visible de posición. Con el panel oculto: usar `F`, avanzar 0,5/1,5/1,95 s y copiar el lienzo con `toDataURL` a una `<img>` encima de la página para la captura.

- [ ] **Paso 6: Sin commit**

`js/dragon-vuelo.js` tiene trabajo sin guardar de Ludwig: no hacer commit (ver Restricciones globales).

---

### Tarea 4: Teclado — Tab entre el destino y su placa

**Archivos:**
- Modificar: `js/barra-viaje.js` (añadir un bloque antes del último `})();`)

**Interfaces:**
- Consume: `estado`, `actual`, `placa`, `destinos` (Tarea 2).
- Produce: nada nuevo para otras tareas.

- [ ] **Paso 1: Escribir la prueba que falla**

Recargar, pegar `P`, ejecutar:

```js
(() => {
  const r = {};
  const z = P.destino("ludwig"), er = P.destino("elden-ring");
  const tab = (shift = false) => document.activeElement.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Tab", shiftKey: shift, bubbles: true, cancelable: true }));
  z.focus(); z.dispatchEvent(new FocusEvent("focus")); // por si el panel no tiene el foco de la ventana
  P.posar();
  tab();
  r.aLaPlaca = document.activeElement === P.placa;
  tab(true);
  r.volvioAZ = document.activeElement === z && P.barra.dataset.estado === "activa";
  tab();
  tab();
  document.activeElement.dispatchEvent(new FocusEvent("focus")); // por si el panel no tiene el foco de la ventana
  r.alSiguiente = document.activeElement === er && P.barra.dataset.tema === "elden-ring";
  P.escape();
  // Escape con el foco en la placa: vuelve a su destino y no se reabre
  z.focus(); z.dispatchEvent(new FocusEvent("focus")); P.posar(); tab();
  P.escape();
  r.escapeDevuelveFoco = document.activeElement === z && P.barra.dataset.estado === "oculta";
  // Sin página: Tab no salta a la placa
  const hk = P.destino("hollow-knight");
  hk.focus(); hk.dispatchEvent(new FocusEvent("focus")); P.posar();
  const ev = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
  hk.dispatchEvent(ev);
  r.sinPaginaNoSalta = !ev.defaultPrevented;
  P.escape();
  return r;
})()
```

- [ ] **Paso 2: Ejecutarla y ver que falla**

Esperado: `aLaPlaca: false` (Tab aún no salta), `escapeDevuelveFoco: false`.

- [ ] **Paso 3: Añadir el bloque de teclado en `js/barra-viaje.js`**

Releer el archivo. Justo antes de la última línea `})();` añadir:

```js
// ----- Teclado -----
// Con Tab, al salir de un planeta se pasa al siguiente, y eso cambiaría la placa antes de llegar
// a ella. Por eso: si la placa está activa y tiene página, Tab en su destino salta a la placa;
// desde la placa, Tab va al destino siguiente y Shift+Tab vuelve al suyo
document.addEventListener("keydown", (evento) => {
  if (evento.key !== "Tab" || estado !== "activa" || !placa.hasAttribute("href")) return;
  if (!evento.shiftKey && document.activeElement === actual) {
    evento.preventDefault();
    placa.focus();
  } else if (document.activeElement === placa) {
    const siguiente = evento.shiftKey ? actual : destinos[destinos.indexOf(actual) + 1];
    if (!siguiente) return; // era el último destino: Tab sigue su camino normal
    evento.preventDefault();
    siguiente.focus();
  }
});
```

- [ ] **Paso 4: Ejecutar la prueba y ver que pasa**

Esperado: `{ aLaPlaca: true, volvioAZ: true, alSiguiente: true, escapeDevuelveFoco: true, sinPaginaNoSalta: true }`. Repetir la prueba de la Tarea 2: sigue igual. Consola sin errores.

- [ ] **Paso 5: Commit**

```bash
git add js/barra-viaje.js
git commit -m "Barra de viaje: Tab del destino a su placa y vuelta

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Prueba común de las placas (Tareas 5–11)

Cada tarea de placa usa esta prueba con su `tema` y sus dos nombres de animación. Pegar `P` y ejecutar (cambiando los tres valores de la primera línea):

```js
(async () => {
  const [tema, animAparece, animActiva] = ["TEMA", "ANIM_APARECE", "ANIM_ACTIVA"];
  const nombres = (el) => {
    const lista = [el, "::before", "::after"].map((p) => p === el
      ? getComputedStyle(el).animationName
      : getComputedStyle(el, p).animationName);
    lista.push(getComputedStyle(document.querySelector(".viaje__texto")).animationName);
    return lista.join(",");
  };
  P.entra(P.destino(tema));
  const aparece = nombres(P.placa);
  await P.espera(600);
  const fondo = getComputedStyle(P.placa).backgroundImage !== "none" || getComputedStyle(P.placa).backgroundColor !== "rgb(22, 22, 30)";
  P.posar();
  const activa = nombres(P.placa);
  const r = { tema: P.barra.dataset.tema, apareceOk: aparece.includes(animAparece), activaOk: activa.includes(animActiva), fondoPropio: fondo };
  P.escape();
  return r;
})()
```

Esperado tras implementar: `{ tema, apareceOk: true, activaOk: true, fondoPropio: true }`. Antes de implementar: `apareceOk: false, activaOk: false` (se ve la placa por defecto).

**Capturas de cada placa:** `P.entra(P.destino(tema))`; a los 0,2 s `computer {action: "zoom"}` de la esquina (aparece a medias); `P.posar()`; a los 0,35 s otra (activándose) y a los 1,2 s otra (activa quieta). Con el panel oculto, congelar con `document.getAnimations().forEach(a => { a.pause(); a.currentTime = <ms>; })`. Comparar con la carta del juego (`img/cartas/<juego>.webp`).

**Sin animaciones:** inyectar `<style id="sin-anim">.viaje__placa,.viaje__placa::before,.viaje__placa::after,.viaje__texto{animation:none!important}</style>`, repetir `entra` + captura y `posar` + captura: la placa debe verse **completa** en los dos estados. Quitar el estilo después.

Las placas van **al final** de su `css/planetas/<juego>.css`, tras releer el archivo. Sin commit (esos archivos tienen trabajo sin guardar de Ludwig).

---

### Tarea 5: Placa de Hollow Knight

**Archivos:** Modificar `css/planetas/hollow-knight.css` (añadir al final).

**Interfaces:** Consume las variables `--placa-*` y la estructura de `.viaje` (Tarea 2). Animaciones: `hk-placa-aparece`, `hk-placa-alma`.

- [ ] **Paso 1:** Ejecutar la prueba común con `["hollow-knight", "hk-placa-aparece", "hk-placa-alma"]`. Esperado: `apareceOk: false, activaOk: false`.
- [ ] **Paso 2: Añadir al final de `css/planetas/hollow-knight.css`:**

```css

/* =========================================================
   PLACA DE VIAJE DE HOLLOW KNIGHT (js/barra-viaje.js)
   Negro de vacío con marco blanco fino, como la carta "Ø Void"
   ========================================================= */
.viaje[data-tema="hollow-knight"] .viaje__placa {
  --placa-fondo: #050507;
  --placa-borde: rgba(232, 230, 240, 0.85);
  --placa-texto: #eeedf3;
  --placa-brillo: rgba(232, 230, 240, 0.28); /* el alma: blanco pálido */
}

/* Segundo marco, más fino, por dentro */
.viaje[data-tema="hollow-knight"] .viaje__placa::before {
  inset: 3px;
  border: 1px solid rgba(232, 230, 240, 0.35);
}

/* Aparecer: una mancha de tinta que se abre desde el centro */
.viaje[data-tema="hollow-knight"][data-estado="esperando"] .viaje__placa {
  animation: hk-placa-aparece 0.45s cubic-bezier(0.2, 0.7, 0.3, 1) both;
}

@keyframes hk-placa-aparece {
  from { clip-path: ellipse(0% 0% at 50% 50%); }
  60%  { clip-path: ellipse(45% 90% at 50% 50%); }
  to   { clip-path: ellipse(80% 160% at 50% 50%); }
}

/* Activarse: el halo de alma late una vez y se queda suave */
.viaje[data-tema="hollow-knight"][data-estado="activa"] .viaje__placa {
  animation: hk-placa-alma 0.9s ease-out;
}

@keyframes hk-placa-alma {
  from { box-shadow: 0 0 0 rgba(232, 230, 240, 0); }
  35%  { box-shadow: 0 0 2.6rem rgba(232, 230, 240, 0.6); }
}
```

- [ ] **Paso 3:** Recargar, pegar `P`, repetir la prueba común. Esperado: `{ tema: "hollow-knight", apareceOk: true, activaOk: true, fondoPropio: true }`.
- [ ] **Paso 4:** Capturas (aparece, activándose, activa) y prueba sin animaciones; comparar con `img/cartas/hollow-knight.webp`.

---

### Tarea 6: Placa de The Witcher 3

**Archivos:** Modificar `css/planetas/witcher.css` (añadir al final).

**Interfaces:** Animaciones `witcher-placa-aparece`, `witcher-placa-llama`. Variable registrada `--quemado` (`@property`, `<length>`, hereda).

- [ ] **Paso 1:** Prueba común con `["witcher", "witcher-placa-aparece", "witcher-placa-llama"]`. Esperado: falla.
- [ ] **Paso 2: Añadir al final de `css/planetas/witcher.css`:**

```css

/* =========================================================
   PLACA DE VIAJE DE THE WITCHER 3 (js/barra-viaje.js)
   Negro rojizo con borde rojo, como el bosque rojo de su carta
   ========================================================= */

/* Radio de lo ya quemado. Registrada para que el navegador sepa animarla */
@property --quemado {
  syntax: "<length>";
  inherits: true;
  initial-value: 0px;
}

.viaje[data-tema="witcher"] .viaje__placa {
  --placa-fondo: radial-gradient(ellipse at 50% 130%, #4a120b 0%, #1a0806 65%);
  --placa-borde: rgb(220, 60, 40);
  --placa-texto: #f4dcc6;
  --placa-brillo: rgba(255, 110, 40, 0.45);
  --quemado: 9rem; /* 9rem cubre la placa entera: así se ve completa sin animación */
}

/* Aparecer: se quema desde el centro. El recorte crece y un borde naranja va delante */
.viaje[data-tema="witcher"][data-estado="esperando"] .viaje__placa {
  clip-path: circle(var(--quemado) at 50% 50%);
  animation: witcher-placa-aparece 0.45s ease-in both;
}

.viaje[data-tema="witcher"][data-estado="esperando"] .viaje__placa::after {
  background: radial-gradient(circle at 50% 50%,
    transparent calc(var(--quemado) - 0.5rem),
    rgba(255, 160, 60, 0.95) calc(var(--quemado) - 0.1rem),
    transparent var(--quemado));
}

@keyframes witcher-placa-aparece {
  from { --quemado: 0px; }
}

/* Activarse: brasas por abajo, borde más vivo y 2–3 parpadeos de llama */
.viaje[data-tema="witcher"] .viaje__placa::before {
  background: linear-gradient(to top, rgba(255, 90, 30, 0.4), transparent 65%);
  opacity: 0;
  transition: opacity 0.6s ease;
}

.viaje[data-tema="witcher"][data-estado="activa"] .viaje__placa::before {
  opacity: 1;
}

.viaje[data-tema="witcher"][data-estado="activa"] .viaje__placa {
  --placa-borde: rgb(255, 120, 60);
  animation: witcher-placa-llama 0.9s ease-in-out;
}

@keyframes witcher-placa-llama {
  0%  { box-shadow: 0 0 0.6rem rgba(255, 110, 40, 0.3); }
  20% { box-shadow: 0 0 2.2rem rgba(255, 130, 50, 0.75); }
  35% { box-shadow: 0 0 1rem rgba(255, 90, 30, 0.35); }
  55% { box-shadow: 0 0 2rem rgba(255, 130, 50, 0.65); }
  70% { box-shadow: 0 0 1.1rem rgba(255, 90, 30, 0.4); }
  85% { box-shadow: 0 0 1.8rem rgba(255, 120, 45, 0.55); }
}
```

- [ ] **Paso 3:** Prueba común. Esperado: pasa.
- [ ] **Paso 4:** Capturas y prueba sin animaciones (en "esperando" sin animación, `--quemado` = 9rem: la placa entera, sin anillo visible); comparar con `img/cartas/witcher.webp`.

---

### Tarea 7: Placa de Cyberpunk 2077

**Archivos:** Modificar `css/planetas/cyberpunk.css` (añadir al final).

**Interfaces:** Animaciones `cyber-placa-aparece`, `cyber-texto-rgb` (en `.viaje__texto`), `cyber-barrido` (en `::after`).

- [ ] **Paso 1:** Prueba común con `["cyberpunk", "cyber-placa-aparece", "cyber-texto-rgb"]`. Esperado: falla.
- [ ] **Paso 2: Añadir al final de `css/planetas/cyberpunk.css`:**

```css

/* =========================================================
   PLACA DE VIAJE DE CYBERPUNK 2077 (js/barra-viaje.js)
   Negro con borde verde neón, sombra magenta y esquinas cortadas
   ========================================================= */
.viaje[data-tema="cyberpunk"] .viaje__placa {
  --placa-fondo: #07070c;
  --placa-borde: #37ff8b;
  --placa-texto: #d8ffe8;
  --placa-sombra: 4px 4px 0 rgba(255, 0, 160, 0.55);
  --placa-brillo: rgba(55, 255, 139, 0.4);
  border-radius: 10px;
  corner-shape: bevel; /* esquinas cortadas donde el navegador lo entienda; si no, redondeadas */
}

/* Aparecer: franjas que saltan de lado (a golpes: steps) */
.viaje[data-tema="cyberpunk"][data-estado="esperando"] .viaje__placa {
  animation: cyber-placa-aparece 0.45s steps(1, end) both;
}

@keyframes cyber-placa-aparece {
  0%   { clip-path: inset(45% 0 45% 0); transform: translateX(-6px); }
  20%  { clip-path: inset(10% 0 60% 0); transform: translateX(5px); }
  40%  { clip-path: inset(50% 0 5% 0);  transform: translateX(-3px); }
  60%  { clip-path: inset(0 0 30% 0);   transform: translateX(2px); }
  80%  { clip-path: inset(20% 0 0 0);   transform: translateX(-1px); }
  100% { clip-path: inset(0);           transform: none; }
}

/* Activarse: el texto se separa en rojo y cian, y una línea de barrido baja */
.viaje[data-tema="cyberpunk"][data-estado="activa"] .viaje__texto {
  animation: cyber-texto-rgb 0.9s steps(1, end);
}

@keyframes cyber-texto-rgb {
  0%  { text-shadow: -3px 0 rgba(255, 40, 80, 0.9), 3px 0 rgba(0, 240, 255, 0.9); transform: translateX(2px); }
  25% { text-shadow: 2px 0 rgba(255, 40, 80, 0.9), -2px 0 rgba(0, 240, 255, 0.9); transform: translateX(-2px); }
  50% { text-shadow: -1px 0 rgba(255, 40, 80, 0.8), 1px 0 rgba(0, 240, 255, 0.8); transform: translateX(1px); }
  75% { text-shadow: none; transform: none; }
}

.viaje[data-tema="cyberpunk"] .viaje__placa::after {
  inset: 0 0 auto 0;
  height: 35%;
  background: linear-gradient(to bottom, transparent, rgba(55, 255, 139, 0.7) 50%, transparent);
  transform: translateY(-110%); /* escondida arriba */
}

.viaje[data-tema="cyberpunk"][data-estado="activa"] .viaje__placa::after {
  animation: cyber-barrido 0.9s ease-in both;
}

@keyframes cyber-barrido {
  to { transform: translateY(300%); }
}
```

- [ ] **Paso 3:** Prueba común. Esperado: pasa.
- [ ] **Paso 4:** Capturas y prueba sin animaciones; comparar con `img/cartas/cyberpunk.webp`. Anotar si el navegador integrado muestra las esquinas cortadas (`CSS.supports("corner-shape: bevel")`).

---

### Tarea 8: Placa de Outer Wilds

**Archivos:** Modificar `css/planetas/outer-wilds.css` (añadir al final).

**Interfaces:** Animaciones `ow-placa-glifo` (en `::before`), `ow-placa-aparece` (placa), `ow-hoguera` (en `::after`).

- [ ] **Paso 1:** Prueba común con `["outer-wilds", "ow-placa-glifo", "ow-hoguera"]`. Esperado: falla.
- [ ] **Paso 2: Añadir al final de `css/planetas/outer-wilds.css`:**

```css

/* =========================================================
   PLACA DE VIAJE DE OUTER WILDS (js/barra-viaje.js)
   Violeta profundo con texto naranja cálido, como la carta "The Moon"
   ========================================================= */
.viaje[data-tema="outer-wilds"] .viaje__placa {
  --placa-fondo: linear-gradient(180deg, #24143b 0%, #140b24 100%);
  --placa-borde: transparent; /* el borde lo dibuja ::before, como las líneas de un glifo */
  --placa-texto: #ffb065;
  --placa-brillo: rgba(255, 150, 60, 0.4);
}

/* El borde: 4 líneas que se dibujan una tras otra, dando la vuelta */
.viaje[data-tema="outer-wilds"] .viaje__placa::before {
  --linea: linear-gradient(#ffb065, #ffb065);
  background:
    var(--linea) left top / 100% 1px no-repeat,     /* arriba, de izquierda a derecha */
    var(--linea) right top / 1px 100% no-repeat,    /* derecha, hacia abajo */
    var(--linea) right bottom / 100% 1px no-repeat, /* abajo, de derecha a izquierda */
    var(--linea) left bottom / 1px 100% no-repeat;  /* izquierda, hacia arriba */
  opacity: 0.75;
}

/* Aparecer: la placa se funde y el glifo del borde se traza */
.viaje[data-tema="outer-wilds"][data-estado="esperando"] .viaje__placa {
  animation: ow-placa-aparece 0.3s ease-out both;
}

@keyframes ow-placa-aparece {
  from { opacity: 0; }
}

.viaje[data-tema="outer-wilds"][data-estado="esperando"] .viaje__placa::before {
  animation: ow-placa-glifo 0.5s linear both;
}

@keyframes ow-placa-glifo {
  from { background-size: 0% 1px, 1px 0%, 0% 1px, 1px 0%; }
  40%  { background-size: 100% 1px, 1px 0%, 0% 1px, 1px 0%; }
  55%  { background-size: 100% 1px, 1px 100%, 0% 1px, 1px 0%; }
  90%  { background-size: 100% 1px, 1px 100%, 100% 1px, 1px 0%; }
}

/* Activarse: brillo naranja de hoguera que sube desde abajo */
.viaje[data-tema="outer-wilds"] .viaje__placa::after {
  background: radial-gradient(ellipse at 50% 140%, rgba(255, 140, 50, 0.55), transparent 70%);
  mix-blend-mode: screen;
  opacity: 0;
}

.viaje[data-tema="outer-wilds"][data-estado="activa"] .viaje__placa::after {
  opacity: 1;
  animation: ow-hoguera 0.9s ease-out;
}

@keyframes ow-hoguera {
  from { opacity: 0; transform: translateY(40%); }
  50%  { opacity: 1; }
}
```

- [ ] **Paso 3:** Prueba común. Esperado: pasa.
- [ ] **Paso 4:** Capturas y prueba sin animaciones; comparar con `img/cartas/outer-wilds.webp`.

---

### Tarea 9: Placa de Black Myth: Wukong

**Archivos:** Modificar `css/planetas/wukong.css` (añadir al final).

**Interfaces:** Animaciones `wukong-placa-aparece` (placa), `wukong-linea` (en `::after`), `wukong-placa-oro` (placa, activa).

- [ ] **Paso 1:** Prueba común con `["wukong", "wukong-placa-aparece", "wukong-placa-oro"]`. Esperado: falla.
- [ ] **Paso 2: Añadir al final de `css/planetas/wukong.css`:**

```css

/* =========================================================
   PLACA DE VIAJE DE BLACK MYTH: WUKONG (js/barra-viaje.js)
   Tinta negra con filete de oro y un sellito rojo
   ========================================================= */
.viaje[data-tema="wukong"] .viaje__placa {
  --placa-fondo:
    linear-gradient(#b3261e, #b3261e) 0.75rem 50% / 0.55rem 0.55rem no-repeat, /* el sellito rojo */
    linear-gradient(180deg, #161210 0%, #0b0908 100%);
  --placa-borde: #c9a14a;
  --placa-texto: #f1dfb8;
  --placa-brillo: rgba(233, 190, 100, 0.45);
}

/* Filete de oro fino por dentro */
.viaje[data-tema="wukong"] .viaje__placa::before {
  inset: 3px;
  border: 1px solid rgba(201, 161, 74, 0.4);
}

/* Aparecer: una línea de oro barre de izquierda a derecha y deja la placa detrás */
.viaje[data-tema="wukong"][data-estado="esperando"] .viaje__placa {
  animation: wukong-placa-aparece 0.45s ease-out both;
}

@keyframes wukong-placa-aparece {
  from { clip-path: inset(0 100% 0 0); }
  to   { clip-path: inset(0 0 0 0); }
}

.viaje[data-tema="wukong"] .viaje__placa::after {
  inset: 0 auto 0 0;
  width: 3px;
  background: #ffd678;
  box-shadow: 0 0 8px rgba(255, 214, 120, 0.9);
  opacity: 0; /* solo se ve mientras barre */
}

.viaje[data-tema="wukong"][data-estado="esperando"] .viaje__placa::after {
  animation: wukong-linea 0.45s ease-out;
}

@keyframes wukong-linea {
  from { left: 0; opacity: 1; }
  90%  { opacity: 1; }
  to   { left: 100%; opacity: 0; }
}

/* Activarse: destello dorado que se queda como brillo cálido */
.viaje[data-tema="wukong"][data-estado="activa"] .viaje__placa {
  animation: wukong-placa-oro 0.9s ease-out;
}

@keyframes wukong-placa-oro {
  30% { box-shadow: 0 0 2.4rem rgba(255, 210, 110, 0.85); border-color: #ffe29a; }
}
```

- [ ] **Paso 3:** Prueba común. Esperado: pasa.
- [ ] **Paso 4:** Capturas y prueba sin animaciones; comparar con `img/cartas/wukong.webp`.

---

### Tarea 10: Placa de Zelda: Ocarina of Time

**Archivos:** Modificar `css/planetas/zelda.css` (añadir al final).

**Interfaces:** Animaciones `zelda-placa-aparece` (placa), `zelda-vitral` (en `::after`).

- [ ] **Paso 1:** Prueba común con `["zelda", "zelda-placa-aparece", "zelda-vitral"]`. Esperado: falla.
- [ ] **Paso 2: Añadir al final de `css/planetas/zelda.css`:**

```css

/* =========================================================
   PLACA DE VIAJE DE ZELDA (js/barra-viaje.js)
   Un vitral de 3 paneles verdes con plomo dorado, como la carta "The Hero"
   ========================================================= */
.viaje[data-tema="zelda"] .viaje__placa {
  --placa-fondo: linear-gradient(90deg, #1f5e3b 0 33.33%, #174b2f 33.33% 66.66%, #1f5e3b 66.66%);
  --placa-borde: #c8a24a;
  --placa-texto: #f2f7e6;
  --placa-brillo: rgba(232, 200, 100, 0.4);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
}

/* El plomo dorado entre los paneles */
.viaje[data-tema="zelda"] .viaje__placa::before {
  background:
    linear-gradient(#c8a24a, #c8a24a) 33.33% 0 / 2px 100% no-repeat,
    linear-gradient(#c8a24a, #c8a24a) 66.66% 0 / 2px 100% no-repeat;
}

/* Aparecer: un anillo verde que se abre desde el centro */
.viaje[data-tema="zelda"][data-estado="esperando"] .viaje__placa {
  animation: zelda-placa-aparece 0.45s ease-out both;
}

@keyframes zelda-placa-aparece {
  from { clip-path: circle(0% at 50% 50%); }
  to   { clip-path: circle(75% at 50% 50%); }
}

/* Activarse: los paneles se encienden uno a uno, de verde a oro, y se quedan así */
.viaje[data-tema="zelda"] .viaje__placa::after {
  --oro: linear-gradient(rgba(240, 205, 105, 0.38), rgba(240, 205, 105, 0.38));
  background:
    var(--oro) 0 100% / 33.4% 0% no-repeat,
    var(--oro) 50% 100% / 33.4% 0% no-repeat,
    var(--oro) 100% 100% / 33.4% 0% no-repeat;
  mix-blend-mode: screen;
}

.viaje[data-tema="zelda"][data-estado="activa"] .viaje__placa::after {
  background-size: 33.4% 100%, 33.4% 100%, 33.4% 100%;
  animation: zelda-vitral 0.9s ease-out;
}

@keyframes zelda-vitral {
  from { background-size: 33.4% 0%, 33.4% 0%, 33.4% 0%; }
  33%  { background-size: 33.4% 100%, 33.4% 0%, 33.4% 0%; }
  66%  { background-size: 33.4% 100%, 33.4% 100%, 33.4% 0%; }
}
```

- [ ] **Paso 3:** Prueba común. Esperado: pasa.
- [ ] **Paso 4:** Capturas y prueba sin animaciones (activa sin animación: los 3 paneles dorados); comparar con `img/cartas/zelda.webp`.

---

### Tarea 11: Placa de Elden Ring

**Archivos:** Modificar `css/planetas/elden-ring.css` (añadir al final).

**Interfaces:** Animaciones `elden-placa-aparece` (placa), `elden-hilo` (en `::before`), `elden-placa-oro` (placa, activa), `elden-resplandor` (en `::after`).

- [ ] **Paso 1:** Prueba común con `["elden-ring", "elden-hilo", "elden-placa-oro"]`. Esperado: falla.
- [ ] **Paso 2: Añadir al final de `css/planetas/elden-ring.css`:**

```css

/* =========================================================
   PLACA DE VIAJE DE ELDEN RING (js/barra-viaje.js)
   Casi negra, con hilo de oro fino y un fondo de rojo profundo.
   OJO (legal): sin círculos ni líneas verticales, para no acercarse a su logo.
   Por eso el hilo solo va arriba y abajo
   ========================================================= */
.viaje[data-tema="elden-ring"] .viaje__placa {
  --placa-fondo:
    radial-gradient(ellipse at 50% 120%, rgba(120, 20, 15, 0.45), transparent 70%),
    linear-gradient(180deg, #16110b 0%, #0b0907 100%);
  --placa-borde: transparent;
  --placa-texto: #ecd9a8;
  --placa-brillo: rgba(232, 190, 110, 0.45);
}

/* Los hilos de oro, arriba y abajo, más brillantes en el centro */
.viaje[data-tema="elden-ring"] .viaje__placa::before {
  --hilo: linear-gradient(90deg, transparent, #d9b36a 20%, #f3dca0 50%, #d9b36a 80%, transparent);
  background:
    var(--hilo) 50% 0 / 100% 1px no-repeat,
    var(--hilo) 50% 100% / 100% 1px no-repeat;
}

/* Aparecer: la placa se funde y los hilos se dibujan del centro a los lados */
.viaje[data-tema="elden-ring"][data-estado="esperando"] .viaje__placa {
  animation: elden-placa-aparece 0.45s ease-out both;
}

@keyframes elden-placa-aparece {
  from { opacity: 0; }
}

.viaje[data-tema="elden-ring"][data-estado="esperando"] .viaje__placa::before {
  animation: elden-hilo 0.45s ease-out both;
}

@keyframes elden-hilo {
  from { background-size: 0% 1px, 0% 1px; }
}

/* Activarse: un resplandor dorado que se expande desde el centro */
.viaje[data-tema="elden-ring"][data-estado="activa"] .viaje__placa {
  animation: elden-placa-oro 0.9s ease-out;
}

@keyframes elden-placa-oro {
  40% { box-shadow: 0 0 2.8rem rgba(255, 210, 120, 0.75); }
}

.viaje[data-tema="elden-ring"] .viaje__placa::after {
  background: radial-gradient(ellipse at 50% 50%, rgba(255, 220, 140, 0.55), transparent 60%);
  mix-blend-mode: screen;
  opacity: 0;
}

.viaje[data-tema="elden-ring"][data-estado="activa"] .viaje__placa::after {
  animation: elden-resplandor 0.9s ease-out;
}

@keyframes elden-resplandor {
  from { opacity: 0; transform: scale(0.3); }
  40%  { opacity: 1; }
  to   { opacity: 0; transform: scale(1.6); }
}
```

- [ ] **Paso 3:** Prueba común. Esperado: pasa.
- [ ] **Paso 4:** Capturas y prueba sin animaciones; comparar con `img/cartas/elden-ring.webp`. Revisar en la captura que no aparece nada con forma de círculo o línea vertical.

---

### Tarea 12: Repaso final (móvil, reducir movimiento, todo junto) y memoria

**Archivos:**
- Crear: `C:\Users\ander\.claude\projects\C--Users-ander-Projects-PortafolioWeb\memory\barra-viaje.md`
- Modificar: `C:\Users\ander\.claude\projects\C--Users-ander-Projects-PortafolioWeb\memory\MEMORY.md`, `...\memory\dragon-vuelo.md` (el dragón ya no cruza: vuela a la placa)

- [ ] **Paso 1: Prueba de reducir movimiento (existe la regla)**

```js
[...document.styleSheets].flatMap((h) => { try { return [...h.cssRules]; } catch { return []; } })
  .some((r) => r.media && r.media.mediaText.includes("prefers-reduced-motion") && r.cssText.includes(".viaje__placa"))
```

Esperado: `true`. El camino "sin vuelo" (activación a los 2 s) ya está cubierto por la prueba H de la Tarea 2.

- [ ] **Paso 2: Las 8 placas juntas**

Con el panel visible, repetir la prueba de la Tarea 2 (con H esperando al dragón de verdad: `"activa"`) y la de la Tarea 4. Luego una captura por destino activo (8) en una sola tanda: para cada tema, `P.entra`, `P.posar`, esperar 1,2 s, `zoom` a la esquina, `P.escape`.

- [ ] **Paso 3: Móvil**

`resize_window {preset: "mobile"}`, recargar, pegar `P`: `P.entra(P.destino("zelda"), "touch"); P.sale(P.destino("zelda"), "touch")`, esperar 2,5 s y captura: la placa cabe en el ancho (sin scroll horizontal: `document.documentElement.scrollWidth <= innerWidth`), texto en 1–2 líneas, dragón posado debajo y activa. Volver con `resize_window {preset: "desktop"}`.

- [ ] **Paso 4: Consola y rendimiento**

`read_console_messages {onlyErrors: true}`: vacío. Con la placa activa y el dragón posado: `document.getAnimations().filter(a => a.playState === "running").length` → 0 al cabo de 1,5 s (brillo quieto, sin bucles).

- [ ] **Paso 5: Memoria**

Crear `memory/barra-viaje.md`:

```markdown
---
name: barra-viaje
description: Placa de viaje abajo a la derecha del inicio: aparece al apuntar a un destino, el dragón vuela a ella, se posa y la activa; 8 estilos CSS
metadata:
  type: project
---

2026-09-28: barra de viaje (spec docs/superpowers/specs/2026-09-28-barra-de-viaje-design.md, plan docs/superpowers/plans/2026-09-28-barra-de-viaje.md). Es la "placa del nombre" de la carta. js/barra-viaje.js = estados oculta → esperando ("Rumbo a X") → activa ("Viajar a X" / Z "Conocer a Ludwig" / sin página "X llegará pronto"); solo cambia data-estado y data-tema en .viaje. Habla con js/dragon-vuelo.js por eventos: dragon-llamar {destino: img, vuela}, dragon-despedir, dragon-posado. El dragón ya NO cruza la pantalla: vuela ~2 s hasta la img quieta .viaje__dragon (= img/dragon-vuelo.webp, el mismo dibujo, Dragon17z.png) y se cruza con ella (0,15 s); el camino acaba en un tramo recto de un largo de dragón y las curvas se aplanan al llegar (sin ola del cuerpo: la 3ª versión del dragón se conserva). Activa = se queda al dejar de apuntar; otro destino = sale un dragón nuevo; Escape la guarda. Datos en el HTML: data-destino/nombre/enlace/verbo en los 8 destinos. Estilo: base + Ludwig en css/barra-viaje.css, cada juego al final de su css/planetas/<juego>.css; regla: estado final en la regla, @keyframes solo "from". Hueco .viaje__lienzo para un lienzo propio (enfoque 2) si Ludwig lo pide. --alto-dragon-vuelo ahora vive en .orbita.

Relacionado: [[dragon-vuelo]], [[cartas]], [[planetas-svg]], [[ediciones-en-paralelo]].
```

Añadir a `MEMORY.md`: `- [Barra de viaje](barra-viaje.md) — placa abajo a la derecha que el dragón activa al posarse; 8 estilos CSS; eventos dragon-llamar/despedir/posado`. En `dragon-vuelo.md` añadir una línea al final: `2026-09-28: ya no cruza al apuntar: lo llama la barra de viaje y vuela a posarse bajo la placa. Ver [[barra-viaje]].`

- [ ] **Paso 6: Resumen para Ludwig**

Explicarle en pocas líneas: estados y eventos (por qué el JS solo cambia atributos y el CSS hace el resto), cómo el camino del dragón acaba recto, y sugerirle cambios para probar: `DURACION_VUELO` en `js/dragon-vuelo.js`, `--placa-brillo` de un juego, el texto "llegará pronto". Preguntarle si quiere hacer commit de `index.html`, `css/inicio.css`, `js/dragon-vuelo.js` y `css/planetas/*.css` (tienen también trabajo suyo pendiente).
