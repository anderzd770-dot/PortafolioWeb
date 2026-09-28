// =========================================================
// LA PLACA DE LUDWIG SE ARMA POR PÍXELES
// Cuando la barra de viaje (js/barra-viaje.js) aparece con el tema "ludwig",
// tu placa se forma igual que tu carta (js/carta.js): de su centro sale una
// espiral de píxeles que caen en las zonas claras del dibujo (marco, letras,
// estrellas), y justo donde aterrizan el dibujo se enciende cuadradito a cuadradito.
//
// Este archivo no toca la barra: solo MIRA sus atributos (data-tema, data-estado)
// y pinta en el lienzo .viaje__pixeles. Mientras pinta, pone data-formando en la
// barra para que el CSS esconda el dibujo de verdad; al terminar lo quita y se ve
// el dibujo real (idéntico), así que el cambio no se nota.
//
// Y cuando el dragón se posa (data-estado = "activa"), saltan chispas de píxel
// desde el dibujo mientras el CSS lo cambia por el de "Conocer a Ludwig".
// =========================================================

(() => {

// ----- Ajustes (¡prueba a cambiarlos!) -----
const NUM_PIXELES = 450;       // píxeles que forman la placa
const DURACION = 1.6;          // segundos que tarda en formarse (igual que la carta: DURACION_ABRIR en js/carta.js)
const VUELTAS = 1.1;           // vueltas de la espiral de cada píxel
const REJILLA = 3;             // tamaño de la celda de píxel (igual que el disco y la carta)
const CELDA = 3;               // tamaño (px) de los cuadraditos en los que se enciende el dibujo
const DESTELLO = 0.75;         // cuánto brilla en blanco cada cuadradito al encenderse (0 = nada)
const COLOR_PIXEL = "#eceef2"; // blanco plateado, como los puntos de tu dibujo
const RADIO_SEMILLA = 12;      // tamaño (px) de la espiral pequeña que aparece primero (como en la carta)
const BRAZOS_SEMILLA = 2.5;    // vueltas de esa espiral
const SEMILLA = 7;             // la semilla del azar (cámbiala y la placa se forma con otro dibujo de píxeles)

// El reloj de la animación (fracciones de 0 a 1): los mismos números que la carta
const SALIDA_MIN = 0.06;
const SALIDA_DISTANCIA = 0.42;
const SALIDA_AZAR = 0.05;
const VUELO = 0.34;    // parte de la animación que dura el viaje de cada píxel
const VIDA = 0.1;      // después de aterrizar, lo que tarda en apagarse
const ENCENDER = 0.1;  // lo que tarda cada cuadradito del dibujo en encenderse del todo

// Las chispas de píxel al activarse (cuando el dragón se posa)
const CHISPAS = 70;                 // cuántas saltan
const CHISPAS_VELOCIDAD = [50, 170]; // px por segundo (la más lenta y la más rápida)
const CHISPAS_VIDA = [0.5, 1.1];    // segundos que dura cada una
const CHISPAS_SALIDA = 0.15;        // segundos durante los que van saliendo (no todas a la vez)
const GRAVEDAD = 160;               // px/s²: cuánto caen
const CHISPAS_ROJAS = 0.2;          // parte de chispas rojas (el resto plateadas)
const COLOR_ROJO = "#e11e28";       // el rojo de los ojos del dragón

// ----- Elementos -----
const barra = document.querySelector(".viaje");
const placa = barra.querySelector(".viaje__placa");
const lienzo = document.createElement("canvas");
lienzo.className = "viaje__pixeles";
lienzo.setAttribute("aria-hidden", "true");
barra.querySelector(".viaje__lienzo").append(lienzo); // el hueco que dejamos para esto
const ctx = lienzo.getContext("2d");
const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)");

// El mismo dibujo que pone el CSS en la placa
const dibujo = new Image();
dibujo.decoding = "async";
dibujo.src = "img/placas/ludwig.webp";

// ----- Azar con semilla (el mismo generador que la carta: siempre la misma serie) -----
function crearAzar(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const frenar = (x) => 1 - Math.pow(1 - x, 3);
const limitar = (x) => Math.min(1, Math.max(0, x));
// Cuándo llega la onda a un punto a "distancia" del centro: píxeles y cuadraditos usan la misma
const llegada = (distancia, azar) => SALIDA_MIN + SALIDA_DISTANCIA * distancia + SALIDA_AZAR * azar + VUELO;

// Brillo del dibujo (0 = transparente u oscuro, 1 = lo más claro) según el mapa BRILLO de abajo
function brilloEn(fx, fy) {
  const col = Math.min(BRILLO_COLUMNAS - 1, Math.floor(fx * BRILLO_COLUMNAS));
  const fila = Math.min(BRILLO.length - 1, Math.floor(fy * BRILLO.length));
  return parseInt(BRILLO[fila][col], 36) / 35;
}

// ----- Medidas -----
let ancho = 0, alto = 0;             // tamaño del lienzo (px CSS)
let placaX = 0, placaY = 0, placaW = 0, placaH = 0; // la placa dentro del lienzo
let pixeles = [];
let celdas = [];

function medir() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  ancho = lienzo.clientWidth;
  alto = lienzo.clientHeight;
  lienzo.width = Math.round(ancho * dpr);
  lienzo.height = Math.round(alto * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // offsetWidth no cuenta el scale() de "activa": medimos la placa sin agrandar
  placaW = placa.offsetWidth;
  placaH = placa.offsetHeight;
  placaX = (ancho - placaW) / 2; // el lienzo sobresale lo mismo por cada lado (css/barra-viaje.css)
  placaY = (alto - placaH) / 2;
  crearPixeles();
  crearCeldas();
}

// ----- Cada píxel: dónde aterriza y cuándo sale -----
// La placa es alargada: la espiral se calcula "estirada" (como si la placa fuera un
// cuadrado) y luego se aplasta a su forma. Así la espiral es un óvalo que no se sale tanto.
// Ruleta con el mapa de brillo: cada zona tiene un trozo tan grande como su brillo al cuadrado.
// Así casi todo cae en lo claro del dibujo. Devuelve un punto (fx, fy de 0 a 1) dentro de la placa
let pesos = null, totalPesos = 0;
function puntoDelDibujo(azar) {
  if (!pesos) { // se prepara la primera vez que hace falta
    pesos = [];
    for (let fila = 0; fila < BRILLO.length; fila++) {
      for (let col = 0; col < BRILLO_COLUMNAS; col++) {
        const b = parseInt(BRILLO[fila][col], 36) / 35;
        totalPesos += b * b;
        pesos.push(totalPesos); // pesos acumulados: el trozo de cada zona acaba en este número
      }
    }
  }
  const bola = azar() * totalPesos;
  let zona = 0;
  while (pesos[zona] < bola) zona++;
  const col = zona % BRILLO_COLUMNAS;
  const fila = Math.floor(zona / BRILLO_COLUMNAS);
  return { fx: (col + azar()) / BRILLO_COLUMNAS, fy: (fila + azar()) / BRILLO.length };
}

function crearPixeles() {
  const azar = crearAzar(SEMILLA);
  pixeles = [];
  for (let i = 0; i < NUM_PIXELES; i++) {
    const { fx, fy } = puntoDelDibujo(azar);
    // Destino en coordenadas "estiradas": −1 a 1 en los dos ejes
    const u = fx * 2 - 1;
    const v = fy * 2 - 1;
    const radio = Math.hypot(u, v);
    pixeles.push({
      radio,
      angulo: Math.atan2(v, u),
      salida: llegada(radio / Math.SQRT2, azar()) - VUELO,
      luz: 0.55 + 0.45 * brilloEn(fx, fy),
    });
  }
}

// ----- Los cuadraditos en los que se enciende el dibujo -----
function crearCeldas() {
  const azar = crearAzar(SEMILLA + 1);
  celdas = [];
  for (let y = 0; y < placaH; y += CELDA) {
    for (let x = 0; x < placaW; x += CELDA) {
      const w = Math.min(CELDA, placaW - x);
      const h = Math.min(CELDA, placaH - y);
      const fx = (x + w / 2) / placaW;
      const fy = (y + h / 2) / placaH;
      const brillo = brilloEn(fx, fy);
      // Distancia "estirada" al centro, la misma medida que usan los píxeles
      const distancia = Math.hypot(fx * 2 - 1, fy * 2 - 1) / Math.SQRT2;
      celdas.push({
        x: placaX + x, y: placaY + y, w, h,
        inicio: llegada(distancia, azar()) - ENCENDER * 0.4, // un poco antes de que lleguen sus píxeles
        brillo,
      });
    }
  }
}

// ----- Dibujar un momento de la formación (progreso de 0 a 1) -----
function dibujar(progreso) {
  ctx.clearRect(0, 0, ancho, alto);
  encenderDibujo(progreso);

  const trazado = new Path2D();
  const centroX = placaX + placaW / 2;
  const centroY = placaY + placaH / 2;
  for (const p of pixeles) {
    const q = limitar((progreso - p.salida) / VUELO); // 0 = en el centro, 1 = aterrizado
    if (q <= 0) continue;
    const apagado = limitar((progreso - p.salida - VUELO) / VIDA);
    if (apagado >= 1) continue;
    // La espiral: el radio crece hasta su destino y el ángulo "se desenrolla"
    const e = frenar(q);
    const r = p.radio * e;
    const a = p.angulo + VUELTAS * Math.PI * 2 * (1 - e);
    // De "estirado" a la forma de la placa
    const x = centroX + Math.cos(a) * r * placaW / 2;
    const y = centroY + Math.sin(a) * r * placaH / 2;
    ponerPixel(trazado, x, y, p.luz * (1 - apagado));
  }

  // La semilla: una espiral pequeña de píxeles que gira en el centro al principio
  // y se apaga cuando la placa ya se está formando (igual que en la carta)
  const semilla = limitar(progreso / 0.12) * (1 - limitar((progreso - 0.35) / 0.25));
  if (semilla > 0) {
    const puntos = 30;
    for (let i = 0; i < puntos; i++) {
      const t = i / puntos;                                        // 0 = centro, 1 = punta de la espiral
      const a = t * BRAZOS_SEMILLA * Math.PI * 2 + progreso * 9;   // gira mientras crece
      const r = t * RADIO_SEMILLA * frenar(semilla);
      ponerPixel(trazado, centroX + Math.cos(a) * r, centroY + Math.sin(a) * r, semilla * (1 - t * 0.5));
    }
  }

  ctx.fillStyle = COLOR_PIXEL;
  ctx.globalAlpha = 1;
  ctx.fill(trazado);
}

// El dibujo aparece por cuadraditos que crecen desde su centro y destellan en blanco
function encenderDibujo(progreso) {
  const recorte = new Path2D();
  const destellos = [new Path2D(), new Path2D(), new Path2D()];
  let hayDibujo = false;

  for (const c of celdas) {
    const t = limitar((progreso - c.inicio) / ENCENDER);
    if (t <= 0) continue;
    hayDibujo = true;
    if (t >= 1) {
      recorte.rect(c.x - 0.5, c.y - 0.5, c.w + 1, c.h + 1); // medio píxel de más: sin rayitas
      continue;
    }
    const e = frenar(t);
    const w = c.w * e;
    const h = c.h * e;
    const x = c.x + (c.w - w) / 2;
    const y = c.y + (c.h - h) / 2;
    recorte.rect(x, y, w, h);
    // Solo destellan las zonas claras: en el aire de alrededor no hay nada que brillar
    const fuerza = (1 - t) * c.brillo * DESTELLO;
    if (fuerza > 0.08) destellos[Math.min(2, Math.floor(fuerza * 3))].rect(x, y, w, h);
  }
  if (!hayDibujo) return;

  ctx.save();
  ctx.clip(recorte);
  ctx.drawImage(dibujo, placaX, placaY, placaW, placaH);
  ctx.restore();

  ctx.fillStyle = COLOR_PIXEL;
  destellos.forEach((trazado, i) => {
    ctx.globalAlpha = (i + 1) / 3;
    ctx.fill(trazado);
  });
  ctx.globalAlpha = 1;
}

// Cuadraditos encajados en una rejilla, más grandes cuanta más luz (como el disco y la carta)
function ponerPixel(trazado, x, y, luz) {
  if (luz < 0.1) return;
  const tam = Math.max(1, Math.round(REJILLA * Math.min(luz, 1)));
  const celdaX = Math.floor(x / REJILLA) * REJILLA;
  const celdaY = Math.floor(y / REJILLA) * REJILLA;
  const hueco = (REJILLA - tam) / 2;
  trazado.rect(celdaX + hueco, celdaY + hueco, tam, tam);
}

// ----- Animación -----
let progreso = 0;
let formando = false;   // ¿se está armando ahora?
let formada = false;    // ¿ya se armó en esta aparición?
let anterior = 0;

function animar(ahora) {
  if (!formando) return; // la pararon mientras tanto
  const segundos = Math.min(Math.max((ahora - anterior) / 1000, 0), 0.05);
  anterior = ahora;
  progreso = Math.min(1, progreso + segundos / DURACION);
  if (progreso < 1) {
    dibujar(progreso);
    requestAnimationFrame(animar);
  } else {
    terminar(); // formada: se ve el dibujo de verdad
  }
}

function empezar() {
  // El dibujo aún no ha cargado: lo intentamos otra vez en cuanto llegue
  if (!dibujo.complete || !dibujo.naturalWidth) {
    dibujo.addEventListener("load", revisar, { once: true });
    return;
  }
  formada = true; // en esta aparición ya no se vuelve a armar
  // Sin movimiento: la placa aparece tal cual (la pinta el CSS)
  if (sinMovimiento.matches) return;
  medir();
  progreso = 0;
  formando = true;
  barra.dataset.formando = "";
  dibujar(0);
  anterior = performance.now();
  requestAnimationFrame(animar);
}

function terminar() {
  formando = false;
  delete barra.dataset.formando;
  ctx.clearRect(0, 0, ancho, alto);
}

// ----- Las chispas de píxel al activarse -----
// Saltan desde el dibujo (las zonas claras) hacia fuera, caen un poco y se apagan.
// Mientras saltan, el CSS cruza el dibujo de "Rumbo" con el de "Conocer".
let chispas = [];
let chispeando = false;
let tiempoChispas = 0;
let anteriorChispas = 0;

function lanzarChispas() {
  if (sinMovimiento.matches) return;
  if (formando) terminar(); // si aún se estaba armando, la placa ya está entera
  medir();
  const azar = Math.random; // cada activación, chispas distintas
  const entre = ([menor, mayor]) => menor + (mayor - menor) * azar();
  chispas = [];
  for (let i = 0; i < CHISPAS; i++) {
    const { fx, fy } = puntoDelDibujo(azar);
    // Hacia fuera desde el centro, medido en la forma "estirada": las de los lados salen de lado
    const angulo = Math.atan2(fy * 2 - 1, fx * 2 - 1) + (azar() - 0.5) * 0.9;
    const velocidad = entre(CHISPAS_VELOCIDAD);
    chispas.push({
      x: placaX + fx * placaW,
      y: placaY + fy * placaH,
      vx: Math.cos(angulo) * velocidad,
      vy: Math.sin(angulo) * velocidad - 40, // un pequeño salto hacia arriba
      nace: azar() * CHISPAS_SALIDA,
      vida: entre(CHISPAS_VIDA),
      roja: azar() < CHISPAS_ROJAS,
    });
  }
  tiempoChispas = 0;
  if (!chispeando) {
    chispeando = true;
    anteriorChispas = performance.now();
    requestAnimationFrame(animarChispas);
  }
}

function animarChispas(ahora) {
  if (!chispeando) return; // las pararon mientras tanto
  const segundos = Math.min(Math.max((ahora - anteriorChispas) / 1000, 0), 0.05);
  anteriorChispas = ahora;
  tiempoChispas += segundos;

  ctx.clearRect(0, 0, ancho, alto);
  const plata = new Path2D();
  const rojo = new Path2D();
  let quedan = 0;
  for (const c of chispas) {
    const t = tiempoChispas - c.nace; // segundos desde que saltó
    if (t < 0) { quedan++; continue; }
    const q = t / c.vida;             // 0 = acaba de saltar, 1 = apagada
    if (q >= 1) continue;
    quedan++;
    const trazado = c.roja ? rojo : plata;
    // Movimiento con gravedad: x = x0 + v·t ; y = y0 + v·t + ½·g·t²
    const x = c.x + c.vx * t;
    const y = c.y + c.vy * t + 0.5 * GRAVEDAD * t * t;
    ponerPixel(trazado, x, y, 1 - q * q); // se encoge al final
    // Una estela corta: dónde estaba un instante antes, más pequeña
    const antes = Math.max(0, t - 0.04);
    ponerPixel(trazado, c.x + c.vx * antes, c.y + c.vy * antes + 0.5 * GRAVEDAD * antes * antes, 0.5 * (1 - q));
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = COLOR_PIXEL;
  ctx.fill(plata);
  ctx.fillStyle = COLOR_ROJO;
  ctx.fill(rojo);

  if (quedan > 0) requestAnimationFrame(animarChispas);
  else pararChispas();
}

function pararChispas() {
  chispeando = false;
  chispas = [];
  ctx.clearRect(0, 0, ancho, alto);
}

// ----- Mirar la barra -----
// MutationObserver avisa cada vez que cambian los atributos de la barra
let chispasLanzadas = false; // ¿ya saltaron en esta aparición?

function revisar() {
  const esLudwig = barra.dataset.tema === "ludwig";
  const estado = barra.dataset.estado;
  if (!esLudwig || estado === "oculta") {
    // Se fue (o cambió a otro juego): se para todo y la próxima vez empieza de nuevo
    if (formando) terminar();
    if (chispeando) pararChispas();
    formada = false;
    chispasLanzadas = false;
    return;
  }
  if (estado === "esperando" && !formada) empezar();
  if (estado === "activa" && !chispasLanzadas) {
    chispasLanzadas = true;
    lanzarChispas();
  }
}

new MutationObserver(revisar).observe(barra, { attributes: true, attributeFilter: ["data-tema", "data-estado"] });

// ----- Mapa de brillo del dibujo -----
// La placa dividida en 48 × 15 zonas; cada letra es el brillo medio de una zona
// (contando la transparencia como negro), del 0 a la z, en base 36.
// Se midió una vez en img/placas/ludwig.webp: si cambias el dibujo, hay que volver a medirlo.
const BRILLO_COLUMNAS = 48;
const BRILLO = [
  "000000000000000000000000000000000000000000000000",
  "000000000000000000000002300000000000000000000000",
  "00010000000000000000000aa00000000000000000001000",
  "001a8eqo73345533bgrsmb9ss9bmushc56653237nqe99100",
  "01erbcbbaadjjgcfdc44585bc58664bbijjhea99dbbbrd10",
  "03cec8d93uor2223a6223m62206x302c321c73f2e28deb40",
  "09bna79e1u9q8ihjcujpq41q932w1bflre7jmnk8309bnba0",
  "1drqk8128zuchkyxjugmn26qq71r1mlljsvsomfk21antpd1",
  "08coa57a8kikofheko8nk2pgn23pnjlilbfljdmh867aob90",
  "03ceg536n82p3d15f2d41ch1i3jd5a4j2268906hf76geb40",
  "00dq7d76b45bf96656a12728846116965787644879e6pd10",
  "001aebnp87ae9ea6afprod9rs9cospfa7chgd968pocea100",
  "00010000000000000010000cc00001000000000000001000",
  "000000000000000000000003300000000000000000000000",
  "000000000000000000000000000000000000000000000000",
];

})();
