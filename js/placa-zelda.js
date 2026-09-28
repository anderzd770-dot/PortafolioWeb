// =========================================================
// LA PLACA DE ZELDA
// Cuando la barra de viaje (js/barra-viaje.js) aparece con el tema "zelda":
//
// 1. APARECE COMO SU CARTA (js/carta-zelda.js): la placa es un vitral partido
//    en trozos de cristal. Suenan unas notas de luz verde, cada una suelta un
//    anillo, y cada cristal se enciende cuando le llega el primer anillo.
//    Mismos tiempos que la carta.
//
// 2. SE ACTIVA CON UNA LUCECITA: cuando el dragón se posa, una luz cruza la
//    placa de izquierda a derecha haciendo ondas y dejando chispitas. Cada
//    cristal por el que pasa cambia al dibujo nuevo ("Conocer The Hero")
//    con un destello de oro.
//
// Este archivo no toca la barra: solo MIRA sus atributos (data-tema, data-estado)
// y pinta en su lienzo. Mientras pinta, pone data-zelda-pintando en la barra
// para que el CSS esconda el dibujo de verdad (css/planetas/zelda.css).
// =========================================================

(() => {

// ----- Ajustes de la aparición (¡prueba a cambiarlos!) -----
const DURACION = 1.4;          // segundos que tarda en formarse (igual que DURACION_ABRIR de la carta)
const NOTAS = 5;               // notas que suenan (cada una suelta un anillo)
const CRISTALES = 70;          // trozos de cristal en los que se parte la placa (más o menos)
const DESORDEN = 0.75;         // lo irregulares que son los trozos (0 = cuadrícula perfecta)
const VIAJE_ANILLO = 1.4;      // lo que tarda un anillo en cruzar toda la placa (fracción de la animación)
const TAMANO_ONDA = 0.5;       // hasta dónde crece cada anillo antes de apagarse (fracción del alto de la placa)
const MOTAS = 0.15;            // parte de los cristales que sueltan una mota verde al encenderse
const COLOR_VERDE = "110, 230, 150";   // el verde de la melodía (el mismo que la carta)
const COLOR_LUZ = "225, 255, 235";     // el centro brillante de las notas y de la lucecita
const COLOR_ORO = "240, 200, 90";      // el oro del plomo del vitral
const SEMILLA = 7;             // cámbiala y los cristales y las notas salen distintos

// ----- Ajustes de la activación (la lucecita) -----
const DURACION_CAMBIO = 1.2;   // segundos que dura
const ONDAS = 1.5;             // cuántas ondas hace la luz al cruzar
const ALTURA_ONDA = 0.3;       // lo alto de las ondas (fracción del alto de la placa)
const TAMANO_LUZ = 0.16;       // tamaño de la luz (fracción del alto de la placa)
const CHISPITAS = 40;          // chispitas que deja detrás

// ----- Elementos -----
const barra = document.querySelector(".viaje");
const placa = barra.querySelector(".viaje__placa");
const lienzo = document.createElement("canvas");
lienzo.className = "viaje__vitral-zelda";
lienzo.setAttribute("aria-hidden", "true");
barra.querySelector(".viaje__lienzo").append(lienzo);
const ctx = lienzo.getContext("2d");
// Dos capas invisibles: una para recortar el dibujo con los cristales
// y otra para el brillo (que tampoco debe salirse de la forma de la placa)
const capa = document.createElement("canvas");
const capaCtx = capa.getContext("2d");
const luces = document.createElement("canvas");
const lucesCtx = luces.getContext("2d");
const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)");

// Los mismos dibujos que pone el CSS
const dibujo = new Image();
dibujo.src = "img/placas/zelda-inicio.webp";
const dibujoActivo = new Image();
dibujoActivo.src = "img/placas/zelda-activa.webp";
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

const suave = (x) => x * x * (3 - 2 * x);        // lento al principio y al final
const frenar = (x) => 1 - Math.pow(1 - x, 2);    // rápido al principio, frena al final
const limitar = (x) => Math.min(1, Math.max(0, x));
const tramo = (p, desde, hasta) => limitar((p - desde) / (hasta - desde)); // 0 → 1 entre dos momentos

// ----- Medidas -----
let ancho = 0, alto = 0;                            // tamaño del lienzo (px CSS)
let placaX = 0, placaY = 0, placaW = 0, placaH = 0; // la placa dentro del lienzo
let cx = 0, cy = 0;                                 // centro de la placa
let notas = [];
let cristales = [];
let viaje = VIAJE_ANILLO;

function medir() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  ancho = lienzo.clientWidth;
  alto = lienzo.clientHeight;
  for (const c of [lienzo, capa, luces]) {
    c.width = Math.round(ancho * dpr);
    c.height = Math.round(alto * dpr);
  }
  for (const c of [ctx, capaCtx, lucesCtx]) c.setTransform(dpr, 0, 0, dpr, 0, 0);
  placaW = placa.offsetWidth;
  placaH = placa.offsetHeight;
  placaX = (ancho - placaW) / 2; // el lienzo sobresale lo mismo por cada lado (CSS)
  placaY = (alto - placaH) / 2;
  cx = ancho / 2;
  cy = alto / 2;
}

// ----- Recortar un polígono con un semiplano (Sutherland–Hodgman, como la carta) -----
// Se queda con la parte donde  x·a + y·b <= c
function recortar(poligono, a, b, c) {
  const salida = [];
  for (let i = 0; i < poligono.length; i++) {
    const p = poligono[i];
    const q = poligono[(i + 1) % poligono.length];
    const dp = p[0] * a + p[1] * b - c;
    const dq = q[0] * a + q[1] * b - c;
    if (dp <= 0) salida.push(p);
    if ((dp < 0 && dq > 0) || (dp > 0 && dq < 0)) {
      const t = dp / (dp - dq);
      salida.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  }
  return salida;
}

function crearMelodia() {
  const azar = crearAzar(SEMILLA);

  // 1. Las notas: alternan izquierda y derecha, cada vez más lejos del centro.
  //    La placa es alargada: se reparten sobre todo a lo ancho
  notas = [];
  for (let i = 0; i < NOTAS; i++) {
    const avance = i / Math.max(1, NOTAS - 1);
    const suena = 0.04 + avance * 0.46 + (azar() - 0.5) * 0.03;
    const lado = i % 2 ? 1 : -1;
    const x = lado * placaW * (0.03 + avance * 0.33 + azar() * 0.04);
    const y = (azar() - 0.5) * placaH * 0.4 * avance;
    // Hasta dónde crece su anillo: TAMANO_ONDA, y nunca hasta tocar el borde del lienzo
    const radioMax = Math.min(TAMANO_ONDA * placaH, ancho / 2 - Math.abs(x) - 4, alto / 2 - Math.abs(y) - 4);
    notas.push({ x, y, suena, radioMax });
  }

  // 2. Los cristales: una teselación de Voronoi sobre la placa (como la carta)
  const columnas = Math.max(2, Math.round(Math.sqrt((CRISTALES * placaW) / placaH)));
  const filas = Math.max(2, Math.round(CRISTALES / columnas));
  const casillaW = placaW / columnas;
  const casillaH = placaH / filas;
  const centros = [];
  for (let fila = 0; fila < filas; fila++) {
    for (let col = 0; col < columnas; col++) {
      centros.push([
        (col + 0.5 + (azar() - 0.5) * DESORDEN) * casillaW - placaW / 2,
        (fila + 0.5 + (azar() - 0.5) * DESORDEN) * casillaH - placaH / 2,
      ]);
    }
  }
  const mitadW = placaW / 2;
  const mitadH = placaH / 2;
  cristales = [];
  for (let i = 0; i < centros.length; i++) {
    const [ax, ay] = centros[i];
    let forma = [[-mitadW, -mitadH], [mitadW, -mitadH], [mitadW, mitadH], [-mitadW, mitadH]];
    for (let j = 0; j < centros.length && forma.length; j++) {
      if (j === i) continue;
      const [bx, by] = centros[j];
      if (Math.abs(bx - ax) > casillaW * 3 || Math.abs(by - ay) > casillaH * 3) continue; // solo vecinos
      forma = recortar(forma, bx - ax, by - ay, (bx * bx + by * by - ax * ax - ay * ay) / 2);
    }
    if (forma.length < 3) continue;
    const camino = new Path2D();
    camino.moveTo(cx + forma[0][0], cy + forma[0][1]);
    for (let k = 1; k < forma.length; k++) camino.lineTo(cx + forma[k][0], cy + forma[k][1]);
    camino.closePath();
    cristales.push({
      camino,
      x: ax,
      y: ay,
      mota: azar() < MOTAS ? { dx: (azar() - 0.5) * casillaW * 0.4, sube: placaH * (0.15 + azar() * 0.2) } : null,
      t: 0,          // cuándo lo enciende la melodía
      cambio: null,  // cuándo lo cambió la lucecita (en segundos)
    });
  }

  // 3. Cuándo se enciende cada cristal: cuando lo alcanza el PRIMER anillo
  //    (si alguno llega tarde, los anillos van un poco más rápido)
  const diagonal = Math.hypot(placaW, placaH);
  viaje = VIAJE_ANILLO;
  for (let intento = 0; intento < 12; intento++) {
    let ultimo = 0;
    for (const c of cristales) {
      c.t = Infinity;
      for (const n of notas) c.t = Math.min(c.t, n.suena + (Math.hypot(c.x - n.x, c.y - n.y) / diagonal) * viaje);
      ultimo = Math.max(ultimo, c.t);
    }
    if (ultimo <= 0.84) break;
    viaje *= 0.9;
  }
}

// El brillo se prepara en su capa y se recorta a la forma de la placa (destination-in):
// así el oro de los cristales no se ve flotando fuera del marco
function pintarLuces(recorte) {
  lucesCtx.globalCompositeOperation = "destination-in";
  lucesCtx.drawImage(recorte, placaX, placaY, placaW, placaH);
  lucesCtx.globalCompositeOperation = "source-over";
  ctx.globalCompositeOperation = "lighter";
  ctx.drawImage(luces, 0, 0, ancho, alto);
  ctx.globalCompositeOperation = "source-over";
}

function brilloCristal(camino, brillo) {
  lucesCtx.globalAlpha = 0.28 * brillo;
  lucesCtx.fillStyle = `rgb(${COLOR_VERDE})`;
  lucesCtx.fill(camino);
  lucesCtx.globalAlpha = 0.9 * brillo;
  lucesCtx.strokeStyle = `rgb(${COLOR_ORO})`;
  lucesCtx.lineWidth = 1.2;
  lucesCtx.stroke(camino);
  lucesCtx.globalAlpha = 1;
}

// ----- Dibujar un momento de la melodía (lo mismo que la carta) -----
function dibujarMelodia(progreso) {
  ctx.clearRect(0, 0, ancho, alto);
  const diagonal = Math.hypot(placaW, placaH);
  const apagar = 1 - tramo(progreso, 0.74, 0.93); // al final todo lo que brilla se apaga

  // 1. El vitral: cada cristal aparece cuando lo alcanza su anillo
  capaCtx.clearRect(0, 0, ancho, alto);
  lucesCtx.clearRect(0, 0, ancho, alto);
  capaCtx.fillStyle = capaCtx.strokeStyle = "#fff";
  capaCtx.lineWidth = 1; // el trazo tapa las rendijas entre cristales vecinos
  for (const c of cristales) {
    const f = tramo(progreso, c.t, c.t + 0.07);
    if (f <= 0) continue;
    capaCtx.globalAlpha = f;
    capaCtx.fill(c.camino);
    capaCtx.stroke(c.camino);
    const brillo = 1 - tramo(progreso, c.t, c.t + 0.14);
    if (brillo > 0) brilloCristal(c.camino, brillo);
  }
  capaCtx.globalAlpha = 1;
  capaCtx.globalCompositeOperation = "source-in";
  capaCtx.drawImage(dibujo, placaX, placaY, placaW, placaH);
  capaCtx.globalCompositeOperation = "source-over";
  ctx.drawImage(capa, 0, 0, ancho, alto);

  // 2. El brillo verde y oro de los cristales recién encendidos
  pintarLuces(dibujo);

  ctx.globalCompositeOperation = "lighter";

  // 3. Los anillos (y su eco), que se apagan antes de tocar el borde del lienzo
  for (const n of notas) {
    const edad = progreso - n.suena;
    if (edad <= 0) continue;
    const radio = (edad / viaje) * diagonal;
    const fuerza = (1 - Math.pow(limitar(radio / n.radioMax), 2)) * apagar;
    if (fuerza <= 0) continue;
    for (const [escala, luz] of [[1, 1], [0.82, 0.35]]) {
      ctx.beginPath();
      ctx.arc(cx + n.x, cy + n.y, radio * escala, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${COLOR_VERDE}, ${0.18 * fuerza * luz})`;
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.strokeStyle = `rgba(${COLOR_VERDE}, ${0.75 * fuerza * luz})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }

  // 4. Las notas: un destello que se enciende justo antes de sonar y se abre al sonar
  for (const n of notas) {
    const enciende = tramo(progreso, n.suena - 0.05, n.suena);
    const destello = tramo(progreso, n.suena, n.suena + 0.1);
    if (enciende <= 0 || destello >= 1) continue;
    const r = placaH * (0.12 * enciende + 0.24 * destello);
    const luz = (destello > 0 ? 1 - destello : enciende) * apagar;
    halo(cx + n.x, cy + n.y, r, luz);
  }

  // 5. Las motas verdes que suben de algunos cristales
  ctx.fillStyle = `rgb(${COLOR_VERDE})`;
  for (const c of cristales) {
    if (!c.mota) continue;
    const v = tramo(progreso, c.t, c.t + 0.3);
    if (v <= 0 || v >= 1) continue;
    ctx.globalAlpha = (1 - v) * apagar;
    ctx.fillRect(cx + c.x + c.mota.dx * v - 1, cy + c.y - c.mota.sube * frenar(v) - 1, 2, 2);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

// Un punto de luz: centro casi blanco y halo verde que se desvanece
function halo(x, y, r, luz) {
  if (r <= 0 || luz <= 0) return;
  const degradado = ctx.createRadialGradient(x, y, 0, x, y, r);
  degradado.addColorStop(0, `rgba(${COLOR_LUZ}, ${luz})`);
  degradado.addColorStop(0.3, `rgba(${COLOR_VERDE}, ${0.6 * luz})`);
  degradado.addColorStop(1, `rgba(${COLOR_VERDE}, 0)`);
  ctx.fillStyle = degradado;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

// ----- La activación: la lucecita que cruza la placa -----
let chispitas = [];

function prepararLucecita() {
  const azar = Math.random; // cada activación, chispitas distintas
  chispitas = Array.from({ length: CHISPITAS }, () => ({
    nace: azar() * 0.85,                    // en qué momento del viaje la suelta la luz
    dx: (azar() - 0.5) * placaH * 0.2,
    dy: (azar() - 0.5) * placaH * 0.2,
    cae: placaH * (0.1 + azar() * 0.25),    // cuánto baja mientras se apaga
    vida: 0.25 + azar() * 0.2,              // segundos que dura
    tam: 1.5 + azar() * 2,
    oro: azar() < 0.5,
  }));
  for (const c of cristales) c.cambio = null;
}

// Dónde está la luz en un momento del viaje (u de 0 a 1): entra por la izquierda
// de la placa, cruza haciendo ondas y sale por la derecha
function posicionLuz(u) {
  return {
    x: placaX + placaW * (-0.08 + 1.16 * u),
    y: cy + Math.sin(u * Math.PI * 2 * ONDAS) * placaH * ALTURA_ONDA,
  };
}

function dibujarCambio(segundos) {
  ctx.clearRect(0, 0, ancho, alto);
  const c = limitar(segundos / DURACION_CAMBIO);
  const u = suave(tramo(c, 0, 0.85)); // el viaje de la luz
  const luz = posicionLuz(u);

  // 1. La placa vieja entera, y encima, por cristales, la nueva:
  //    un cristal cambia cuando la luz pasa por encima de su centro
  ctx.drawImage(dibujo, placaX, placaY, placaW, placaH);
  capaCtx.clearRect(0, 0, ancho, alto);
  lucesCtx.clearRect(0, 0, ancho, alto);
  capaCtx.fillStyle = capaCtx.strokeStyle = "#fff";
  capaCtx.lineWidth = 1;
  for (const cristal of cristales) {
    if (cristal.cambio === null && luz.x >= cx + cristal.x) cristal.cambio = segundos;
    if (cristal.cambio === null) continue;
    const f = tramo(segundos, cristal.cambio, cristal.cambio + 0.1);
    capaCtx.globalAlpha = f;
    capaCtx.fill(cristal.camino);
    capaCtx.stroke(cristal.camino);
    const brillo = 1 - tramo(segundos, cristal.cambio, cristal.cambio + 0.25);
    if (brillo > 0) brilloCristal(cristal.camino, brillo);
  }
  capaCtx.globalAlpha = 1;
  capaCtx.globalCompositeOperation = "source-in";
  capaCtx.drawImage(dibujoActivo, placaX, placaY, placaW, placaH);
  capaCtx.globalCompositeOperation = "source-over";
  ctx.drawImage(capa, 0, 0, ancho, alto);
  pintarLuces(dibujoActivo);

  // 2. Las chispitas: estrellitas de 4 puntas que caen un poco y se apagan
  ctx.globalCompositeOperation = "lighter";
  const tiempoViaje = DURACION_CAMBIO * 0.85;
  for (const ch of chispitas) {
    const edad = segundos - ch.nace * tiempoViaje;
    if (edad < 0 || edad > ch.vida) continue;
    const q = edad / ch.vida;
    const origen = posicionLuz(suave(ch.nace)); // donde estaba la luz cuando la soltó
    const x = origen.x + ch.dx;
    const y = origen.y + ch.dy + ch.cae * frenar(q);
    const r = ch.tam * (1 - q) * 2;
    ctx.strokeStyle = `rgba(${ch.oro ? COLOR_ORO : COLOR_LUZ}, ${1 - q})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - r, y); ctx.lineTo(x + r, y);
    ctx.moveTo(x, y - r); ctx.lineTo(x, y + r);
    ctx.stroke();
  }

  // 3. La luz: entra y sale suave, y late un poco
  const visible = tramo(c, 0, 0.08) * (1 - tramo(c, 0.8, 0.95));
  const latido = 1 + 0.15 * Math.sin(segundos * 30);
  halo(luz.x, luz.y, placaH * TAMANO_LUZ * 2.2 * latido, 0.35 * visible); // resplandor ancho
  halo(luz.x, luz.y, placaH * TAMANO_LUZ * latido, visible);              // la luz
  ctx.globalCompositeOperation = "source-over";
}

// ----- Animación -----
// modo: "" (nada), "melodia" (apareciendo) o "cambio" (activándose)
let modo = "";
let tiempo = 0;   // segundos desde que empezó el modo actual
let anterior = 0;

function animar(ahora) {
  if (!modo) return; // la pararon mientras tanto
  tiempo += Math.min(Math.max((ahora - anterior) / 1000, 0), 0.05);
  anterior = ahora;
  if (modo === "melodia") {
    if (tiempo >= DURACION) return terminar(); // formada: se ve el dibujo de verdad
    dibujarMelodia(tiempo / DURACION);
  } else {
    if (tiempo >= DURACION_CAMBIO) return terminar();
    dibujarCambio(tiempo);
  }
  requestAnimationFrame(animar);
}

function empezar(nuevoModo) {
  medir();
  crearMelodia(); // los cristales también los usa la lucecita
  if (nuevoModo === "cambio") prepararLucecita();
  const yaAnimaba = modo !== "";
  modo = nuevoModo;
  tiempo = 0;
  barra.dataset.zeldaPintando = "";
  if (nuevoModo === "melodia") dibujarMelodia(0);
  else dibujarCambio(0);
  if (!yaAnimaba) {
    anterior = performance.now();
    requestAnimationFrame(animar);
  }
}

function terminar() {
  modo = "";
  delete barra.dataset.zeldaPintando;
  ctx.clearRect(0, 0, ancho, alto);
}

// ----- Mirar la barra -----
let formada = false;   // ¿ya apareció en esta ocasión?
let cambiada = false;  // ¿ya se activó?

function revisar() {
  const esZelda = barra.dataset.tema === "zelda";
  const estado = barra.dataset.estado;
  if (!esZelda || estado === "oculta") {
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
    empezar("melodia");
  }
  if (estado === "activa" && !cambiada) {
    formada = true;
    cambiada = true;
    empezar("cambio"); // si aún se estaba formando, pasa directamente al cambio
  }
}

new MutationObserver(revisar).observe(barra, { attributes: true, attributeFilter: ["data-tema", "data-estado"] });

})();
