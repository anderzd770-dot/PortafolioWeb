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
// 2. SE ACTIVA "DESCIFRÁNDOSE": cuando el dragón se posa, la placa se corta en
//    columnas verticales que ruedan hacia arriba una detrás de otra, de izquierda
//    a derecha (como un código que se descifra). Por abajo entra el dibujo nuevo
//    ("Conocer 2077"); la unión brilla en verde y cada columna, al encajar,
//    destella en magenta.
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

// ----- Ajustes de la activación (el descifrado) -----
const DURACION_CAMBIO = 1.0;   // segundos que dura
const COLUMNAS = 22;           // columnas en las que se corta la placa
const RODAR = 0.25;            // lo que tarda cada columna en rodar (fracción de la duración)
const ESCALONAR = 0.6;         // de la primera a la última columna, cuánto se retrasan (fracción)

// ----- Elementos -----
const barra = document.querySelector(".viaje");
const placa = barra.querySelector(".viaje__placa");
const lienzo = document.createElement("canvas");
lienzo.className = "viaje__senal-cyber";
lienzo.setAttribute("aria-hidden", "true");
barra.querySelector(".viaje__lienzo").append(lienzo);
const ctx = lienzo.getContext("2d");
// Capa para el brillo del descifrado (se recorta a la forma del dibujo)
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
let rojo = null;   // copia del dibujo con solo el canal rojo
let cian = null;   // copia con solo verde y azul

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
  const w = Math.max(1, Math.round(placaW * dpr));
  const h = Math.max(1, Math.round(placaH * dpr));
  const copia = (color) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const x = c.getContext("2d");
    x.drawImage(dibujo, 0, 0, w, h);
    x.globalCompositeOperation = "multiply";
    x.fillStyle = color;
    x.fillRect(0, 0, w, h);
    // multiply también pinta lo transparente: le devolvemos la forma del dibujo
    x.globalCompositeOperation = "destination-in";
    x.drawImage(dibujo, 0, 0, w, h);
    return c;
  };
  rojo = copia("#ff0000");
  cian = copia("#00ffff");
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

// Una franja del dibujo, movida "dx" de lado y con los colores separados "sep"
function pintarFranja(f, dx, sep) {
  const sy = f.y * dpr;
  const sh = Math.max(1, f.h * dpr);
  ctx.globalCompositeOperation = "source-over";
  ctx.drawImage(rojo, 0, sy, rojo.width, sh, placaX + dx + sep, placaY + f.y, placaW, f.h);
  ctx.globalCompositeOperation = "lighter"; // rojo + cian = los colores de verdad
  ctx.drawImage(cian, 0, sy, cian.width, sh, placaX + dx - sep, placaY + f.y, placaW, f.h);
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
    pintarFranja(f, dx, SEPARACION * placaW * nervio);
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
// 2. LA ACTIVACIÓN: el descifrado por columnas
// =========================================================
// Cada columna es una "tira" con el dibujo viejo arriba y el nuevo justo debajo.
// Al rodar, la tira sube un alto de placa entero: el viejo sale por arriba y el
// nuevo entra por abajo. Solo se ve lo que cae dentro del hueco de la placa (clip).
let columnas = [];

function prepararDescifrado() {
  const azar = Math.random; // cada activación, un ritmo algo distinto
  columnas = Array.from({ length: COLUMNAS }, (_, i) => ({
    x: (i / COLUMNAS) * placaW,
    w: placaW / COLUMNAS,
    empieza: (i / Math.max(1, COLUMNAS - 1)) * ESCALONAR + (azar() - 0.5) * 0.06,
  }));
}

function dibujarDescifrado(segundos) {
  ctx.clearRect(0, 0, ancho, alto);
  lucesCtx.clearRect(0, 0, ancho, alto);
  const c = limitar(segundos / DURACION_CAMBIO);
  const escalaX = dibujo.naturalWidth / placaW; // para recortar la columna de la imagen original
  const escalaY = dibujo.naturalHeight / placaH;

  for (const col of columnas) {
    const q = tramo(c, col.empieza, col.empieza + RODAR); // 0 = sin empezar, 1 = ya encajada
    const sube = suave(q) * placaH;                       // lo que ha subido la tira
    const x = placaX + col.x;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, placaY, col.w + 0.5, placaH); // +0.5: sin rendijas entre columnas
    ctx.clip();
    // El trozo de la imagen original que le toca a esta columna
    const sx = col.x * escalaX, sw = (col.w + 0.5) * escalaX;
    if (q < 1) ctx.drawImage(dibujo, sx, 0, sw, placaH * escalaY, x, placaY - sube, col.w + 0.5, placaH);
    if (q > 0) ctx.drawImage(dibujoActivo, sx, 0, sw, placaH * escalaY, x, placaY + placaH - sube, col.w + 0.5, placaH);
    ctx.restore();

    // La unión entre los dos dibujos brilla en verde mientras rueda
    if (q > 0 && q < 1) {
      lucesCtx.fillStyle = `rgba(${VERDE}, 0.9)`;
      lucesCtx.fillRect(x, placaY + placaH - sube - 1, col.w + 0.5, 2);
      lucesCtx.fillStyle = `rgba(${VERDE}, 0.18)`;
      lucesCtx.fillRect(x, placaY, col.w + 0.5, placaH); // la columna que rueda se ilumina un poco
    }
    // Al encajar, un destello magenta que se apaga enseguida
    const destello = 1 - tramo(c, col.empieza + RODAR, col.empieza + RODAR + 0.12);
    if (q >= 1 && destello > 0) {
      lucesCtx.fillStyle = `rgba(${MAGENTA}, ${0.45 * destello})`;
      lucesCtx.fillRect(x, placaY, col.w + 0.5, placaH);
    }
  }

  // El brillo solo donde hay dibujo (destination-in): nada de rectángulos en el aire
  lucesCtx.globalCompositeOperation = "destination-in";
  lucesCtx.drawImage(dibujoActivo, placaX, placaY, placaW, placaH);
  lucesCtx.globalCompositeOperation = "source-over";
  ctx.globalCompositeOperation = "lighter";
  ctx.drawImage(luces, 0, 0, ancho, alto);
  ctx.globalCompositeOperation = "source-over";
}

// ----- Animación -----
// modo: "" (nada), "glitch" (apareciendo) o "descifrado" (activándose)
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
    dibujarDescifrado(tiempo);
  }
  requestAnimationFrame(animar);
}

function empezar(nuevoModo) {
  medir();
  if (nuevoModo === "glitch") crearGlitch();
  else prepararDescifrado();
  const yaAnimaba = modo !== "";
  modo = nuevoModo;
  tiempo = 0;
  barra.dataset.cyberPintando = "";
  if (nuevoModo === "glitch") dibujarGlitch(0);
  else dibujarDescifrado(0);
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
    empezar("descifrado"); // si aún se estaba formando, pasa directamente al cambio
  }
}

new MutationObserver(revisar).observe(barra, { attributes: true, attributeFilter: ["data-tema", "data-estado"] });

})();
