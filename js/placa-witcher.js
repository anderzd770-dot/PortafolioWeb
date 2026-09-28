// =========================================================
// LA PLACA DE THE WITCHER 3
// Cuando la barra de viaje (js/barra-viaje.js) aparece con el tema "witcher":
//
// 1. APARECE COMO SU CARTA (js/carta-witcher.js): nace del fuego. En el centro
//    prende una hoguera y el frente de fuego se abre en un óvalo con la forma de
//    la placa. Por donde pasa aparece la placa (borde chamuscado, línea de brasa,
//    lenguas de fuego que suben y chispas). Mismos tiempos que la carta.
//
// 2. SE ACTIVA CON UN CORTE DE ESPADA: cuando el dragón se posa, un tajo plateado
//    cruza la placa de izquierda a derecha. La placa vieja se parte en dos por el
//    corte, cada mitad se desliza hacia su lado y se desvanece, y debajo queda el
//    dibujo nuevo ("Conocer The Witcher"). Por el corte corre un brillo rojo y
//    saltan chispas.
//
// Este archivo no toca la barra: solo MIRA sus atributos (data-tema, data-estado)
// y pinta en su lienzo. Mientras pinta, pone data-witcher-pintando en la barra
// para que el CSS esconda el dibujo de verdad (css/planetas/witcher.css).
// =========================================================

(() => {

// ----- Ajustes de la aparición (¡prueba a cambiarlos!) -----
const DURACION = 1.8;          // segundos que tarda en formarse (igual que DURACION_ABRIR de la carta)
const LLAMAS = 40;             // lenguas de fuego repartidas por el frente
const ALTURA_LLAMA = 0.35;     // alto de una llama (fracción del alto de la placa)
const ANCHO_LLAMA = 0.13;      // ancho de una llama en su base (fracción del alto de la placa)
const CHISPAS = 36;            // chispas que suben
const IRREGULAR = 0.09;        // lo "mordido" que está el borde del fuego (0 = óvalo perfecto)
const COLOR_BRASA = "255, 150, 50";   // la línea del frente (los mismos colores que la carta)
const COLOR_NUCLEO = "255, 238, 190"; // lo más caliente: casi blanco
const COLOR_LLAMA = "255, 110, 25";
const COLOR_HUMO = "200, 45, 10";     // la punta de la llama, donde se apaga
const SEMILLA = 19;

// ----- Ajustes de la activación (el corte de espada) -----
const DURACION_CAMBIO = 1.0;   // segundos que dura
const INCLINACION = -0.12;     // inclinación del corte (radianes; negativo = sube hacia la derecha)
const TAJO = [0.05, 0.22];     // cuándo empieza y termina de cruzar la espada (fracción de la duración)
const SEPARAR = 0.14;          // lo que se separan las dos mitades (fracción del alto de la placa)
const CHISPAS_CORTE = 26;      // chispas que saltan del corte
const COLOR_ACERO = "225, 232, 240";  // el brillo plateado del tajo
const COLOR_SANGRE = "215, 40, 30";   // el rojo que corre por el corte

// ----- Elementos -----
const barra = document.querySelector(".viaje");
const placa = barra.querySelector(".viaje__placa");
const lienzo = document.createElement("canvas");
lienzo.className = "viaje__fuego-witcher";
lienzo.setAttribute("aria-hidden", "true");
barra.querySelector(".viaje__lienzo").append(lienzo);
const ctx = lienzo.getContext("2d");
// Capa para la línea de brasa: se recorta a la forma del dibujo (nada de fuego en el aire)
const luces = document.createElement("canvas");
const lucesCtx = luces.getContext("2d");
const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)");

// Los mismos dibujos que pone el CSS
const dibujo = new Image();
dibujo.src = "img/placas/witcher-inicio.webp";
const dibujoActivo = new Image();
dibujoActivo.src = "img/placas/witcher-activa.webp";
const cargada = (img) => img.complete && img.naturalWidth > 0;

// ----- Azar con semilla (mulberry32, el mismo que la carta) -----
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

const suave = (x) => x * x * (3 - 2 * x);
const frenar = (x) => 1 - Math.pow(1 - x, 2);
const limitar = (x) => Math.min(1, Math.max(0, x));
const tramo = (p, desde, hasta) => limitar((p - desde) / (hasta - desde)); // 0 → 1 entre dos momentos

// ----- Medidas -----
let ancho = 0, alto = 0;                            // tamaño del lienzo (px CSS)
let placaX = 0, placaY = 0, placaW = 0, placaH = 0; // la placa dentro del lienzo
let cx = 0, cy = 0;                                 // centro de la placa
let llamas = [];
let chispas = [];

function medir() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  ancho = lienzo.clientWidth;
  alto = lienzo.clientHeight;
  for (const c of [lienzo, luces]) {
    c.width = Math.round(ancho * dpr);
    c.height = Math.round(alto * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  lucesCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  placaW = placa.offsetWidth;
  placaH = placa.offsetHeight;
  placaX = (ancho - placaW) / 2; // el lienzo sobresale lo mismo por cada lado (CSS)
  placaY = (alto - placaH) / 2;
  cx = ancho / 2;
  cy = alto / 2;
}

// =========================================================
// 1. LA APARICIÓN: nace del fuego
// =========================================================
function crearFuego() {
  const azar = crearAzar(SEMILLA);
  llamas = [];
  for (let i = 0; i < LLAMAS; i++) {
    llamas.push({
      angulo: ((i + azar() * 0.8) / LLAMAS) * Math.PI * 2,
      alto: 0.6 + azar() * 0.6,
      ancho: 0.7 + azar() * 0.6,
      ritmo: 7 + azar() * 6,
      fase: azar() * Math.PI * 2,
    });
  }
  chispas = [];
  for (let i = 0; i < CHISPAS; i++) {
    chispas.push({
      angulo: azar() * Math.PI * 2,
      nace: 0.08 + azar() * 0.6,
      vida: 0.18 + azar() * 0.14,
      sube: 0.5 + azar() * 0.7,       // lo alto que llega (fracción del alto de la placa)
      deriva: (azar() - 0.5) * 0.5,
      tam: 0.7 + azar() * 1.1,
    });
  }
}

// El frente es un óvalo con la forma de la placa. "radio" va de 0 a 1.55
// (√2 ≈ 1.41 llega a las esquinas; un poco más para que el borde mordido también las tape)
function radioFrente(progreso) {
  const u = tramo(progreso, 0.08, 1);
  return (0.5 * u + 0.5 * suave(u)) * 1.55;
}

// El borde irregular: ondas que se mueven con el reloj, así el borde "arde" y cambia
function radioEn(angulo, radio, t) {
  const onda =
    0.55 * Math.sin(5 * angulo + t * 2.6) +
    0.3 * Math.sin(9 * angulo - t * 4.1 + 1.3) +
    0.15 * Math.sin(17 * angulo + t * 7.3 + 0.4);
  return radio * (1 + IRREGULAR * onda);
}

// Un punto del frente: el ángulo se mide en el óvalo (x por la mitad del ancho, y por la del alto)
function puntoFrente(angulo, radio, t) {
  const r = radioEn(angulo, radio, t);
  return [cx + Math.cos(angulo) * r * (placaW / 2), cy + Math.sin(angulo) * r * (placaH / 2)];
}

function trazarFrente(radio, t) {
  const camino = new Path2D();
  const puntos = 140;
  for (let i = 0; i <= puntos; i++) {
    const [x, y] = puntoFrente((i / puntos) * Math.PI * 2, radio, t);
    if (i === 0) camino.moveTo(x, y);
    else camino.lineTo(x, y);
  }
  camino.closePath();
  return camino;
}

// La parte de la placa con dibujo (sin las puntas de las estrellas), de 0 a 1
const CUERPO = { x0: 0.04, x1: 0.96, y0: 0.2, y1: 0.8 };
const dentroDeLaPlaca = (x, y) =>
  x > placaX + CUERPO.x0 * placaW && x < placaX + CUERPO.x1 * placaW &&
  y > placaY + CUERPO.y0 * placaH && y < placaY + CUERPO.y1 * placaH;

// Una lengua de fuego: forma de gota que sube y se mece
function dibujarLlama(x, y, altoLlama, anchoLlama, vaiven, colorBase, colorPunta) {
  const degradado = ctx.createLinearGradient(x, y, x, y - altoLlama);
  degradado.addColorStop(0, colorBase);
  degradado.addColorStop(1, colorPunta);
  ctx.fillStyle = degradado;
  ctx.beginPath();
  ctx.moveTo(x - anchoLlama / 2, y);
  ctx.quadraticCurveTo(x - anchoLlama / 2, y - altoLlama * 0.55, x + vaiven, y - altoLlama);
  ctx.quadraticCurveTo(x + anchoLlama / 2, y - altoLlama * 0.55, x + anchoLlama / 2, y);
  ctx.quadraticCurveTo(x, y + anchoLlama * 0.35, x - anchoLlama / 2, y);
  ctx.fill();
}

function dibujarFuego(progreso) {
  ctx.clearRect(0, 0, ancho, alto);
  const t = performance.now() / 1000; // reloj para el parpadeo del fuego
  const radio = radioFrente(progreso);
  const fuego = tramo(progreso, 0, 0.1) * (1 - tramo(progreso, 0.86, 1));
  const frente = trazarFrente(radio, t);
  const rectPlaca = new Path2D();
  rectPlaca.rect(placaX, placaY, placaW, placaH);

  // 1. La placa, solo por donde ya pasó el fuego, con el borde chamuscado detrás del frente
  //    (source-atop: el chamuscado solo cae encima del dibujo, no en el aire)
  if (radio > 0) {
    ctx.save();
    ctx.clip(rectPlaca);
    ctx.clip(frente);
    ctx.drawImage(dibujo, placaX, placaY, placaW, placaH);
    ctx.globalCompositeOperation = "source-atop";
    ctx.lineJoin = "round";
    ctx.strokeStyle = `rgba(30, 10, 2, ${0.55 * fuego})`;
    ctx.lineWidth = placaH * 0.35;
    ctx.stroke(frente);
    ctx.strokeStyle = `rgba(8, 3, 1, ${0.9 * fuego})`;
    ctx.lineWidth = placaH * 0.13;
    ctx.stroke(frente);
    ctx.restore();
  }

  // 2. Resplandor del fuego en el centro, alargado como la placa
  if (fuego > 0 && radio > 0) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.translate(cx, cy);
    ctx.scale(placaW / placaH, 1);
    // Que no toque el borde del lienzo ni a lo alto ni a lo ancho (el ancho va estirado)
    const r = Math.min((radio + 0.5) * placaH * 0.5, alto / 2 - 2, (ancho / 2 - 2) * placaH / placaW);
    const luz = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    luz.addColorStop(0, `rgba(${COLOR_LLAMA}, ${0.3 * fuego})`);
    luz.addColorStop(1, `rgba(${COLOR_LLAMA}, 0)`);
    ctx.fillStyle = luz;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();
  }

  if (fuego <= 0) return;
  ctx.globalCompositeOperation = "lighter";

  // 3. La línea de brasa en el frente: se pinta en su capa y se recorta a la forma
  //    del dibujo (destination-in), así solo arde donde hay placa
  lucesCtx.clearRect(0, 0, ancho, alto);
  lucesCtx.strokeStyle = `rgba(${COLOR_BRASA}, ${0.5 * fuego})`;
  lucesCtx.lineWidth = 6;
  lucesCtx.stroke(frente);
  lucesCtx.strokeStyle = `rgba(${COLOR_BRASA}, ${0.9 * fuego})`;
  lucesCtx.lineWidth = 2.5;
  lucesCtx.stroke(frente);
  lucesCtx.strokeStyle = `rgba(${COLOR_NUCLEO}, ${0.95 * fuego})`;
  lucesCtx.lineWidth = 1;
  lucesCtx.stroke(frente);
  lucesCtx.globalCompositeOperation = "destination-in";
  lucesCtx.drawImage(dibujo, placaX, placaY, placaW, placaH);
  lucesCtx.globalCompositeOperation = "source-over";
  ctx.drawImage(luces, 0, 0, ancho, alto);

  // 4. Lenguas de fuego que nacen en el frente y siempre suben
  const hoguera = 0.6 + 0.4 * Math.min(1, radio / 0.3);
  for (const l of llamas) {
    const [x, y] = puntoFrente(l.angulo, radio, t);
    if (!dentroDeLaPlaca(x, y)) continue;
    const parpadeo = 0.55 + 0.45 * Math.sin(t * l.ritmo + l.fase) * Math.sin(t * l.ritmo * 0.37 + l.fase * 2);
    const h = placaH * ALTURA_LLAMA * l.alto * parpadeo * fuego * hoguera;
    const w = placaH * ANCHO_LLAMA * l.ancho * hoguera;
    const vaiven = Math.sin(t * 5 + l.fase) * w * 0.7;
    if (h < 1) continue;
    dibujarLlama(x, y, h, w, vaiven, `rgba(${COLOR_LLAMA}, ${0.75 * fuego})`, `rgba(${COLOR_HUMO}, 0)`);
    dibujarLlama(x, y, h * 0.55, w * 0.5, vaiven * 0.5, `rgba(${COLOR_NUCLEO}, ${0.85 * fuego})`, `rgba(${COLOR_BRASA}, 0)`);
  }

  // 5. Chispas: saltan del frente, suben haciendo eses y se consumen
  ctx.fillStyle = `rgb(${COLOR_NUCLEO})`;
  for (const c of chispas) {
    const q = tramo(progreso, c.nace, c.nace + c.vida);
    if (q <= 0 || q >= 1) continue;
    let [x, y] = puntoFrente(c.angulo, radioFrente(c.nace), t);
    if (!dentroDeLaPlaca(x, y)) continue;
    y -= placaH * c.sube * q;
    x += placaH * (c.deriva * q + 0.06 * Math.sin(q * 9 + c.angulo));
    ctx.globalAlpha = Math.sin(Math.PI * q);
    ctx.beginPath();
    ctx.arc(x, y, c.tam * (1 - q * 0.6), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

// =========================================================
// 2. LA ACTIVACIÓN: el corte de espada
// =========================================================
// El corte es una recta que pasa por el centro de la placa con la inclinación
// INCLINACION. Con ella se hacen dos recortes (clip): "arriba del corte" y
// "abajo del corte". Cada mitad del dibujo viejo se pinta en su recorte y se
// mueve hacia su lado, siguiendo la recta, mientras se desvanece.
let chispasCorte = [];

function prepararCorte() {
  const azar = Math.random; // cada activación, chispas distintas
  chispasCorte = Array.from({ length: CHISPAS_CORTE }, () => ({
    donde: azar(),                                   // en qué punto del corte (0 = izquierda, 1 = derecha)
    lado: azar() < 0.5 ? -1 : 1,                     // saltan hacia arriba o hacia abajo del corte
    rapidez: placaH * (1.5 + azar() * 3),
    abre: (azar() - 0.5) * 1.2,                      // abiertas en abanico
    vida: 0.2 + azar() * 0.25,
    tam: 0.8 + azar() * 1.4,
    roja: azar() < 0.4,
  }));
}

// Un punto de la recta del corte a la distancia "d" del centro (d < 0 = hacia la izquierda)
const puntoCorte = (d) => [cx + Math.cos(INCLINACION) * d, cy + Math.sin(INCLINACION) * d];

// La mitad de arriba (lado = -1) o la de abajo (lado = 1) del corte, bien grande
function mitad(lado) {
  const largo = placaW; // de sobra para cubrir toda la placa
  const [x0, y0] = puntoCorte(-largo);
  const [x1, y1] = puntoCorte(largo);
  const lejos = placaH * 3 * lado;
  const camino = new Path2D();
  camino.moveTo(x0, y0);
  camino.lineTo(x1, y1);
  camino.lineTo(x1, y1 + lejos);
  camino.lineTo(x0, y0 + lejos);
  camino.closePath();
  return camino;
}

function dibujarCorte(segundos) {
  ctx.clearRect(0, 0, ancho, alto);
  const c = limitar(segundos / DURACION_CAMBIO);
  const cortado = c >= TAJO[1];                  // ¿ya cruzó la espada?
  const separa = suave(tramo(c, TAJO[1], 0.8));   // 0 → 1: las mitades se separan y se desvanecen
  // Un pequeño temblor justo al cortar
  const temblor = cortado ? (1 - tramo(c, TAJO[1], TAJO[1] + 0.12)) * Math.sin(segundos * 80) * 1.5 : 0;

  // 1. Antes del corte, el dibujo viejo entero; después, el nuevo debajo y las dos mitades del viejo encima
  if (!cortado) {
    ctx.drawImage(dibujo, placaX, placaY, placaW, placaH);
  } else {
    ctx.drawImage(dibujoActivo, placaX, placaY, placaW, placaH);
    for (const lado of [-1, 1]) {
      // Cada mitad se desliza a lo largo del corte (la de arriba a la izquierda,
      // la de abajo a la derecha) y se aparta un poco de él
      const desliza = lado * placaH * 0.4 * separa;
      const aparta = lado * SEPARAR * placaH * separa;
      const dx = Math.cos(INCLINACION) * desliza - Math.sin(INCLINACION) * aparta;
      const dy = Math.sin(INCLINACION) * desliza + Math.cos(INCLINACION) * aparta + temblor;
      ctx.save();
      ctx.translate(dx, dy);
      ctx.clip(mitad(lado));
      ctx.globalAlpha = 1 - separa;
      ctx.drawImage(dibujo, placaX, placaY, placaW, placaH);
      ctx.restore();
    }
  }

  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  const medioLargo = placaW * 0.56; // el tajo va un poco más allá de los bordes de la placa

  // 2. El tajo: la punta cruza de izquierda a derecha dejando una estela plateada
  const punta = frenar(tramo(c, TAJO[0], TAJO[1]));
  const estela = 1 - tramo(c, TAJO[1], TAJO[1] + 0.25); // la estela se apaga después
  if (punta > 0 && estela > 0) {
    const [xa, ya] = puntoCorte(-medioLargo);
    const [xb, yb] = puntoCorte(-medioLargo + 2 * medioLargo * punta);
    const g = ctx.createLinearGradient(xa, ya, xb, yb);
    g.addColorStop(0, `rgba(${COLOR_ACERO}, 0)`);
    g.addColorStop(0.7, `rgba(${COLOR_ACERO}, ${0.5 * estela})`);
    g.addColorStop(1, `rgba(${COLOR_ACERO}, ${estela})`);
    for (const [grosor, alfa] of [[7, 0.25], [2.5, 0.7], [1, 1]]) {
      ctx.strokeStyle = g;
      ctx.globalAlpha = alfa;
      ctx.lineWidth = grosor;
      ctx.beginPath();
      ctx.moveTo(xa, ya);
      ctx.lineTo(xb, yb);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // Destello en la punta mientras cruza
    if (punta < 1) {
      const r = placaH * 0.35;
      const luz = ctx.createRadialGradient(xb, yb, 0, xb, yb, r);
      luz.addColorStop(0, `rgba(255, 255, 255, 0.95)`);
      luz.addColorStop(1, `rgba(${COLOR_ACERO}, 0)`);
      ctx.fillStyle = luz;
      ctx.fillRect(xb - r, yb - r, r * 2, r * 2);
    }
  }

  // 3. Un brillo rojo corre por el corte justo después del tajo (solo entre las mitades)
  const rojo = tramo(c, TAJO[1], TAJO[1] + 0.05) * (1 - tramo(c, TAJO[1] + 0.05, 0.6));
  if (rojo > 0) {
    const [xa, ya] = puntoCorte(-placaW / 2);
    const [xb, yb] = puntoCorte(placaW / 2);
    ctx.strokeStyle = `rgba(${COLOR_SANGRE}, ${0.8 * rojo})`;
    ctx.lineWidth = 2 + SEPARAR * placaH * separa;
    ctx.beginPath();
    ctx.moveTo(xa, ya);
    ctx.lineTo(xb, yb);
    ctx.stroke();
  }

  // 4. Las chispas: saltan del corte a los dos lados cuando pasa la espada por su punto
  for (const ch of chispasCorte) {
    const nace = (TAJO[0] + (TAJO[1] - TAJO[0]) * ch.donde) * DURACION_CAMBIO;
    const edad = segundos - nace;
    const q = edad / ch.vida;
    if (edad < 0 || q >= 1) continue;
    const [x0, y0] = puntoCorte(-medioLargo + 2 * medioLargo * ch.donde);
    const angulo = INCLINACION + ch.lado * (Math.PI / 2) + ch.abre;
    const x = x0 + Math.cos(angulo) * ch.rapidez * edad;
    const y = y0 + Math.sin(angulo) * ch.rapidez * edad + placaH * 6 * edad * edad;
    ctx.fillStyle = `rgba(${ch.roja ? COLOR_SANGRE : COLOR_ACERO}, ${1 - q})`;
    ctx.fillRect(x - ch.tam / 2, y - ch.tam / 2, ch.tam, ch.tam);
  }
  ctx.globalCompositeOperation = "source-over";
}

// ----- Animación -----
// modo: "" (nada), "fuego" (apareciendo) o "corte" (activándose)
let modo = "";
let tiempo = 0;   // segundos desde que empezó el modo actual
let anterior = 0;

function animar(ahora) {
  if (!modo) return; // la pararon mientras tanto
  tiempo += Math.min(Math.max((ahora - anterior) / 1000, 0), 0.05);
  anterior = ahora;
  if (modo === "fuego") {
    if (tiempo >= DURACION) return terminar(); // formada: se ve el dibujo de verdad
    dibujarFuego(tiempo / DURACION);
  } else {
    if (tiempo >= DURACION_CAMBIO) return terminar();
    dibujarCorte(tiempo);
  }
  requestAnimationFrame(animar);
}

function empezar(nuevoModo) {
  medir();
  if (nuevoModo === "fuego") crearFuego();
  else prepararCorte();
  const yaAnimaba = modo !== "";
  modo = nuevoModo;
  tiempo = 0;
  barra.dataset.witcherPintando = "";
  if (nuevoModo === "fuego") dibujarFuego(0);
  else dibujarCorte(0);
  if (!yaAnimaba) {
    anterior = performance.now();
    requestAnimationFrame(animar);
  }
}

function terminar() {
  modo = "";
  delete barra.dataset.witcherPintando;
  ctx.clearRect(0, 0, ancho, alto);
}

// ----- Mirar la barra -----
let formada = false;   // ¿ya apareció en esta ocasión?
let cambiada = false;  // ¿ya se activó?

function revisar() {
  const esWitcher = barra.dataset.tema === "witcher";
  const estado = barra.dataset.estado;
  if (!esWitcher || estado === "oculta") {
    // Se fue (o cambió a otro juego): se para todo y la próxima vez empieza de nuevo
    if (modo) terminar();
    formada = false;
    cambiada = false;
    return;
  }
  // Sin movimiento, o los dibujos aún sin cargar: el CSS pone el dibujo que toca sin animación
  if (sinMovimiento.matches || !cargada(dibujo) || !cargada(dibujoActivo)) return;
  if (estado === "esperando" && !formada) {
    formada = true;
    empezar("fuego");
  }
  if (estado === "activa" && !cambiada) {
    formada = true;
    cambiada = true;
    empezar("corte"); // si aún se estaba formando, pasa directamente al cambio
  }
}

new MutationObserver(revisar).observe(barra, { attributes: true, attributeFilter: ["data-tema", "data-estado"] });

})();
