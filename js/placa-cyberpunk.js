// =========================================================
// LA PLACA DE CYBERPUNK 2077
// Cuando la barra de viaje (js/barra-viaje.js) aparece con el tema "cyberpunk":
//
// 1. APARECE COMO SU CARTA (js/carta-cyberpunk.js): una señal de vídeo que se
//    sintoniza. La placa está cortada en franjas horizontales que se encienden
//    desordenadas, saltan de lado y tienen el rojo y el cian separados hasta que
//    se calman. Líneas de barrido, bloques de datos rotos y dos parpadeos.
//    Mismos tiempos que la carta.
//
// 2. SE ACTIVA CON UN GLITCH FUERTE: cuando el dragón se posa, la señal se rompe
//    del todo. Las franjas enseñan a golpes el dibujo viejo o el nuevo
//    ("Conocer 2077"), saltan lejos, el rojo y el cian se separan mucho, la placa
//    da botes, se tiñe de verde o magenta y salen bloques de datos rotos.
//    Al final todo encaja de golpe con un fogonazo verde.
//
// Este archivo no toca la barra: solo MIRA sus atributos (data-tema, data-estado)
// y pinta en su lienzo. Mientras pinta, pone data-cyber-pintando en la barra
// para que el CSS esconda el dibujo de verdad (css/planetas/cyberpunk.css).
// =========================================================

(() => {

// ----- Ajustes de la aparición (¡prueba a cambiarlos!) -----
const DURACION = 1.3;          // segundos que tarda en formarse (igual que DURACION_ABRIR de la carta)
const ALTO_FRANJA = [0.04, 0.2]; // alto de las franjas (mínimo y máximo, fracción del alto de la placa)
const ASENTAR = 0.32;          // lo que tarda cada franja en calmarse desde que se enciende
const SALTO = 0.022;           // lo lejos que salta una franja de lado (fracción del ancho)
const SEPARACION = 0.01;       // lo separados que empiezan el rojo y el cian (fracción del ancho)
const SALTOS_POR_SEGUNDO = 24; // cada cuánto cambian los saltos (más = más nervioso)
const BLOQUES = 8;             // bloques de "datos rotos"
const LINEAS = 0.16;           // lo oscuras que son las líneas de barrido (0 = sin líneas)
const PARPADEOS = [[0.44, 0.47], [0.68, 0.7]]; // momentos en los que toda la placa parpadea
const VERDE = "125, 255, 90";  // los dos neones (los mismos que la carta)
const MAGENTA = "226, 60, 255";
const SEMILLA = 2077;

// ----- Ajustes de la activación (el glitch fuerte) -----
const DURACION_CAMBIO = 0.9;   // segundos que dura
const ALTO_FRANJA_FUERTE = [0.05, 0.3]; // franjas algo más gruesas que al aparecer
const SALTOS_FUERTES = 30;     // golpes por segundo (más = más nervioso)
const SALTO_FUERTE = 0.06;     // lo lejos que saltan las franjas (fracción del ancho): ~3 veces la aparición
const SEPARACION_FUERTE = 0.03; // lo separados que van el rojo y el cian (fracción del ancho)
const BOTE = 0.15;             // lo que bota la placa entera arriba y abajo (fracción del alto)
const BLOQUES_FUERTES = 6;     // bloques de datos rotos que pueden salir en cada golpe
const LINEAS_FUERTES = 0.3;    // lo oscuras que son las líneas de barrido

// ----- Elementos -----
const barra = document.querySelector(".viaje");
const placa = barra.querySelector(".viaje__placa");
const lienzo = document.createElement("canvas");
lienzo.className = "viaje__senal-cyber";
lienzo.setAttribute("aria-hidden", "true");
barra.querySelector(".viaje__lienzo").append(lienzo);
const ctx = lienzo.getContext("2d");
// Capa para los tintes y el fogonazo del glitch fuerte
const luces = document.createElement("canvas");
const lucesCtx = luces.getContext("2d");
const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)");

// Los mismos dibujos que pone el CSS
const dibujo = new Image();
dibujo.src = "img/placas/cyberpunk-inicio.webp";
const dibujoActivo = new Image();
dibujoActivo.src = "img/placas/cyberpunk-activa.webp";
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

// Un número "al azar" entre -1 y 1 que depende de dos números (franja y momento):
// siempre el mismo para los mismos dos números, así los saltos van a golpes
function ruido(a, b) {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

const suave = (x) => x * x * (3 - 2 * x);
const limitar = (x) => Math.min(1, Math.max(0, x));
const tramo = (p, desde, hasta) => limitar((p - desde) / (hasta - desde)); // 0 → 1 entre dos momentos

// ----- Medidas -----
let ancho = 0, alto = 0, dpr = 1;                   // tamaño del lienzo (px CSS)
let placaX = 0, placaY = 0, placaW = 0, placaH = 0; // la placa dentro del lienzo
let franjas = [];
let bloques = [];
let canalesInicio = null; // los dos dibujos separados en rojo y cian (ver canalesDe)
let canalesActiva = null;

function medir() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
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
  prepararCanales();
}

// Las dos copias de color (como la carta): multiplicar por rojo puro deja solo
// el rojo; por cian, el resto. Sumadas con "lighter" vuelven a dar el dibujo
function prepararCanales() {
  canalesInicio = canalesDe(dibujo);
  canalesActiva = canalesDe(dibujoActivo);
}

function canalesDe(img) {
  const w = Math.max(1, Math.round(placaW * dpr));
  const h = Math.max(1, Math.round(placaH * dpr));
  const copia = (color) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const x = c.getContext("2d");
    x.drawImage(img, 0, 0, w, h);
    x.globalCompositeOperation = "multiply";
    x.fillStyle = color;
    x.fillRect(0, 0, w, h);
    // multiply también pinta lo transparente: le devolvemos la forma del dibujo
    x.globalCompositeOperation = "destination-in";
    x.drawImage(img, 0, 0, w, h);
    return c;
  };
  return { rojo: copia("#ff0000"), cian: copia("#00ffff") };
}

// =========================================================
// 1. LA APARICIÓN: la señal que se sintoniza
// =========================================================
function crearGlitch() {
  const azar = crearAzar(SEMILLA);
  franjas = [];
  let y = 0;
  while (y < placaH) {
    const h = Math.min(placaH - y, placaH * (ALTO_FRANJA[0] + azar() * azar() * (ALTO_FRANJA[1] - ALTO_FRANJA[0])));
    franjas.push({ y, h, enciende: 0.04 + azar() * 0.58, chispazo: azar() < 0.3 });
    y += h;
  }
  bloques = [];
  for (let i = 0; i < BLOQUES; i++) {
    bloques.push({
      nace: 0.08 + azar() * 0.62,
      vida: 0.025 + azar() * 0.04,
      x: azar() * 0.85,
      y: 0.2 + azar() * 0.6, // sobre el cuerpo de la placa
      w: 0.06 + azar() * 0.24,
      h: 0.02 + azar() * 0.04,
      color: azar() < 0.55 ? VERDE : MAGENTA,
    });
  }
}

// Una franja de un dibujo (sus "canales"), movida dx de lado y dy de alto,
// con los colores separados "sep"
function pintarFranja(canales, f, dx, dy, sep) {
  const sy = f.y * dpr;
  const sh = Math.max(1, f.h * dpr);
  ctx.globalCompositeOperation = "source-over";
  ctx.drawImage(canales.rojo, 0, sy, canales.rojo.width, sh, placaX + dx + sep, placaY + f.y + dy, placaW, f.h);
  ctx.globalCompositeOperation = "lighter"; // rojo + cian = los colores de verdad
  ctx.drawImage(canales.cian, 0, sy, canales.cian.width, sh, placaX + dx - sep, placaY + f.y + dy, placaW, f.h);
  ctx.globalCompositeOperation = "source-over";
}

function dibujarGlitch(progreso) {
  ctx.clearRect(0, 0, ancho, alto);
  const paso = Math.floor(progreso * DURACION * SALTOS_POR_SEGUNDO); // el "golpe" actual
  const parpadeo = PARPADEOS.some(([desde, hasta]) => progreso > desde && progreso < hasta);
  ctx.globalAlpha = parpadeo ? 0.35 : 1;

  const encendidas = new Path2D(); // dónde hay placa (para las líneas de barrido)
  franjas.forEach((f, i) => {
    const q = tramo(progreso, f.enciende, f.enciende + ASENTAR); // 0 = recién encendida, 1 = quieta
    const enChispazo = f.chispazo && progreso > f.enciende - 0.08 && progreso < f.enciende - 0.05;
    if (q <= 0 && !enChispazo) return;
    const nervio = enChispazo ? 1 : Math.pow(1 - q, 2);
    const r = ruido(i + 1, paso);
    const dx = (Math.abs(r) > 0.55 ? r : 0) * SALTO * placaW * nervio; // solo salta en algunos golpes
    pintarFranja(canalesInicio, f, dx, 0, SEPARACION * placaW * nervio);
    encendidas.rect(placaX, placaY + f.y, placaW, f.h);
  });

  // Líneas de barrido: una línea oscura cada 3 px, solo encima de la placa
  const oscuridad = LINEAS * (1 - tramo(progreso, 0.7, 0.98));
  if (oscuridad > 0) {
    ctx.save();
    ctx.clip(encendidas);
    ctx.globalCompositeOperation = "source-atop"; // solo donde ya hay dibujo, no en el aire
    ctx.fillStyle = `rgba(0, 0, 0, ${oscuridad})`;
    for (let y = placaY; y < placaY + placaH; y += 3) ctx.fillRect(placaX - 8, y, placaW + 16, 1);
    ctx.restore();
  }

  // Bloques de "datos rotos": rectángulos de neón que aparecen un instante
  ctx.globalCompositeOperation = "lighter";
  for (const b of bloques) {
    if (progreso < b.nace || progreso > b.nace + b.vida) continue;
    ctx.fillStyle = `rgba(${b.color}, 0.55)`;
    ctx.fillRect(placaX + b.x * placaW, placaY + b.y * placaH, b.w * placaW, Math.max(1, b.h * placaH));
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
}

// =========================================================
// 2. LA ACTIVACIÓN: el glitch fuerte
// =========================================================
// La misma idea que la aparición, pero rota del todo. En cada "golpe", cada franja
// elige al azar si enseña el dibujo viejo o el nuevo; la probabilidad del nuevo
// ("nuevo") sube de 0 a 1, así que al final todas enseñan "Conocer 2077".
// "nervio" dice lo rota que está la señal: sube de golpe, se queda y se calma al final.
let franjasFuertes = [];

function prepararGlitchFuerte() {
  const azar = Math.random; // cada activación, franjas distintas
  franjasFuertes = [];
  let y = 0;
  while (y < placaH) {
    const h = Math.min(placaH - y, placaH * (ALTO_FRANJA_FUERTE[0] + azar() * azar() * (ALTO_FRANJA_FUERTE[1] - ALTO_FRANJA_FUERTE[0])));
    franjasFuertes.push({ y, h });
    y += h;
  }
}

// Pinta un dibujo en la capa de luces teñido de un color y lo suma a la placa
function tenir(img, dy, color, fuerza) {
  lucesCtx.clearRect(0, 0, ancho, alto);
  lucesCtx.drawImage(img, placaX, placaY + dy, placaW, placaH);
  lucesCtx.globalCompositeOperation = "source-in"; // el color solo donde hay dibujo
  lucesCtx.fillStyle = `rgb(${color})`;
  lucesCtx.fillRect(0, 0, ancho, alto);
  lucesCtx.globalCompositeOperation = "source-over";
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = fuerza;
  ctx.drawImage(luces, 0, 0, ancho, alto);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

function dibujarGlitchFuerte(segundos) {
  ctx.clearRect(0, 0, ancho, alto);
  const c = limitar(segundos / DURACION_CAMBIO);
  const nervio = tramo(c, 0, 0.06) * (1 - suave(tramo(c, 0.7, 0.92)));
  const nuevo = suave(tramo(c, 0.12, 0.7));
  const paso = Math.floor(segundos * SALTOS_FUERTES); // el "golpe" actual

  // La placa entera bota arriba o abajo en algunos golpes
  const bote = ruido(97, paso);
  const dy = (Math.abs(bote) > 0.6 ? bote : 0) * BOTE * placaH * nervio;

  // 1. Las franjas: viejo o nuevo al azar, saltos grandes y colores muy separados
  franjasFuertes.forEach((f, i) => {
    const eleccion = (ruido(i + 11, paso) + 1) / 2; // de 0 a 1
    const canales = eleccion < nuevo ? canalesActiva : canalesInicio;
    const r = ruido(i + 1, paso + 500);
    const desgarro = Math.abs(r) > 0.8 ? 2.5 : 1; // algunas se desgarran muchísimo
    const dx = r * SALTO_FUERTE * placaW * desgarro * nervio;
    const sep = SEPARACION_FUERTE * placaW * nervio * (0.5 + 0.5 * Math.abs(ruido(i + 3, paso)));
    pintarFranja(canales, f, dx, dy, sep);
  });

  // 2. Líneas de barrido más marcadas (source-atop: solo encima de lo ya pintado)
  if (nervio > 0) {
    ctx.save();
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = `rgba(0, 0, 0, ${LINEAS_FUERTES * nervio})`;
    for (let y = placaY - placaH; y < placaY + 2 * placaH; y += 3) ctx.fillRect(placaX - placaW * 0.3, y, placaW * 1.6, 1);
    ctx.restore();
  }

  // 3. En algunos golpes, la placa entera se tiñe de verde o magenta
  const tinte = ruido(53, paso);
  if (Math.abs(tinte) > 0.7 && nervio > 0.3) {
    tenir(nuevo > 0.5 ? dibujoActivo : dibujo, dy, tinte > 0 ? VERDE : MAGENTA, 0.55 * nervio);
  }

  // 4. Bloques de datos rotos: en cada golpe salen unos cuantos en sitios distintos
  ctx.globalCompositeOperation = "lighter";
  for (let b = 0; b < BLOQUES_FUERTES && nervio > 0; b++) {
    if (ruido(b + 200, paso) < 0.1) continue; // no salen todos en cada golpe
    const azar = (n) => (ruido(b + n, paso) + 1) / 2; // de 0 a 1
    ctx.fillStyle = `rgba(${b % 2 ? VERDE : MAGENTA}, ${0.6 * nervio})`;
    ctx.fillRect(
      placaX + azar(300) * placaW * 0.9,
      placaY + (0.1 + azar(400) * 0.8) * placaH + dy,
      (0.05 + azar(500) * 0.25) * placaW,
      Math.max(1, (0.03 + azar(600) * 0.08) * placaH)
    );
  }
  ctx.globalCompositeOperation = "source-over";

  // 5. El fogonazo verde cuando todo encaja
  const fogonazo = tramo(c, 0.7, 0.76) * (1 - tramo(c, 0.76, 1));
  if (fogonazo > 0) tenir(dibujoActivo, 0, VERDE, 0.7 * fogonazo);
}

// ----- Animación -----
// modo: "" (nada), "glitch" (apareciendo) o "fuerte" (activándose)
let modo = "";
let tiempo = 0;   // segundos desde que empezó el modo actual
let anterior = 0;

function animar(ahora) {
  if (!modo) return; // la pararon mientras tanto
  tiempo += Math.min(Math.max((ahora - anterior) / 1000, 0), 0.05);
  anterior = ahora;
  if (modo === "glitch") {
    if (tiempo >= DURACION) return terminar(); // formada: se ve el dibujo de verdad
    dibujarGlitch(tiempo / DURACION);
  } else {
    if (tiempo >= DURACION_CAMBIO) return terminar();
    dibujarGlitchFuerte(tiempo);
  }
  requestAnimationFrame(animar);
}

function empezar(nuevoModo) {
  medir();
  if (nuevoModo === "glitch") crearGlitch();
  else prepararGlitchFuerte();
  const yaAnimaba = modo !== "";
  modo = nuevoModo;
  tiempo = 0;
  barra.dataset.cyberPintando = "";
  if (nuevoModo === "glitch") dibujarGlitch(0);
  else dibujarGlitchFuerte(0);
  if (!yaAnimaba) {
    anterior = performance.now();
    requestAnimationFrame(animar);
  }
}

function terminar() {
  modo = "";
  delete barra.dataset.cyberPintando;
  ctx.clearRect(0, 0, ancho, alto);
}

// ----- Mirar la barra -----
let formada = false;   // ¿ya apareció en esta ocasión?
let cambiada = false;  // ¿ya se activó?

function revisar() {
  const esCyberpunk = barra.dataset.tema === "cyberpunk";
  const estado = barra.dataset.estado;
  if (!esCyberpunk || estado === "oculta") {
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
    empezar("glitch");
  }
  if (estado === "activa" && !cambiada) {
    formada = true;
    cambiada = true;
    empezar("fuerte"); // si aún se estaba formando, pasa directamente al cambio
  }
}

new MutationObserver(revisar).observe(barra, { attributes: true, attributeFilter: ["data-tema", "data-estado"] });

})();
