// =========================================================
// LA CARTA DE ZELDA: UNA MELODÍA QUE ENCIENDE EL VITRAL
// Al apuntar al planeta de Zelda, su carta aparece en el mismo sitio
// que las otras cartas, pero llega con una melodía: la carta es un
// vitral y la música "enciende" el cristal trozo a trozo.
//
// Pasos (según "progreso", de 0 = cerrada a 1 = formada):
//   1. Las notas: destellos de luz verde que "suenan" uno detrás de otro,
//      alternando izquierda y derecha. Cada uno suelta un anillo verde que se expande.
//   2. El vitral: la carta está partida en trozos de cristal irregulares.
//      Cuando un anillo pasa por un trozo, ese trozo se enciende con un
//      brillo verde y su borde destella en oro.
//   3. Los anillos se apagan antes de tocar el borde del lienzo (así nunca
//      se ven cortados), suben unas motas verdes y queda la carta tal cual.
// Al cerrar pasa lo mismo al revés: los cristales se apagan y los anillos vuelven a sus notas.
//
// Idea clave: cada trozo de cristal sabe CUÁNDO lo alcanza el primer anillo
// (tiempo de la nota + distancia ÷ velocidad del anillo). Los trozos se
// encienden en ese orden, así el vitral sigue el ritmo de la melodía.
// =========================================================

(() => {

// ----- Ajustes (¡prueba a cambiarlos!) -----
const DURACION_ABRIR = 1.4;    // segundos que tarda en formarse
const DURACION_CERRAR = 0.6;   // segundos que tarda en desaparecer
const NOTAS = 5;               // notas que suenan (cada una suelta un anillo)
const CRISTALES = 150;         // trozos de cristal en los que se parte la carta (más o menos)
const DESORDEN = 0.75;         // lo irregulares que son los trozos (0 = cuadrícula perfecta)
const VIAJE_ANILLO = 1.4;      // lo que tarda un anillo en cruzar toda la carta (fracción de la animación)
const MOTAS = 0.15;            // parte de los cristales que sueltan una mota verde al encenderse
const COLOR_VERDE = "110, 230, 150";   // el verde de la melodía
const COLOR_LUZ = "225, 255, 235";     // el centro brillante de las notas
const COLOR_ORO = "240, 200, 90";      // el oro del plomo del vitral
const ESPERA_APUNTAR = 150;    // milisegundos apuntando antes de sacarla (como las otras cartas)
const SEMILLA = 7;             // cámbiala y los cristales y las notas salen distintos

// ----- Elementos -----
const planeta = document.querySelector(".planeta--ocarina");
const boton = planeta?.querySelector(".planeta__enlace");
const portal = document.querySelector(".portal--zelda");
if (!boton || !portal) return;
const carta = portal.querySelector(".carta");
const cara = carta.querySelector(".carta__cara");
const lienzo = portal.querySelector(".portal__lienzo");
const ctx = lienzo.getContext("2d");
// Un segundo lienzo invisible donde se "recorta" la carta con los cristales
const capa = document.createElement("canvas");
const capaCtx = capa.getContext("2d");
const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)");

// ----- Azar con semilla (mulberry32): siempre la misma serie de números -----
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

const frenar = (x) => 1 - Math.pow(1 - x, 2);     // rápido al principio, frena al final
const limitar = (x) => Math.min(1, Math.max(0, x));
const tramo = (p, desde, hasta) => limitar((p - desde) / (hasta - desde)); // 0 → 1 entre dos momentos

// ----- Medidas -----
let ancho = 0;
let alto = 0;
let cx = 0;          // centro de la carta dentro del lienzo
let cy = 0;
let cartaW = 0;
let cartaH = 0;
let notas = [];
let cristales = [];
let viaje = VIAJE_ANILLO;   // el que se usa de verdad (puede acortarse, ver crearMelodia)

function medir() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  ancho = lienzo.clientWidth;
  alto = lienzo.clientHeight;
  lienzo.width = capa.width = Math.round(ancho * dpr);
  lienzo.height = capa.height = Math.round(alto * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  capaCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  cartaW = carta.offsetWidth;
  cartaH = carta.offsetHeight;
  cx = ancho / 2;
  cy = alto / 2;
}

// ----- Recortar un polígono con un semiplano (algoritmo de Sutherland–Hodgman) -----
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

  // 1. Las notas: suenan una detrás de otra, alternando izquierda y derecha,
  //    cada vez un poco más lejos del centro (como una frase que se abre)
  notas = [];
  for (let i = 0; i < NOTAS; i++) {
    const avance = i / Math.max(1, NOTAS - 1);   // 0 la primera nota, 1 la última
    const suena = 0.04 + avance * 0.46 + (azar() - 0.5) * 0.03;
    const lado = i % 2 ? 1 : -1;
    const x = lado * cartaW * (0.04 + avance * 0.3 + azar() * 0.05);
    const y = (azar() - 0.5) * cartaH * 0.4 * avance;  // la primera casi en el centro
    notas.push({ x, y, suena, radioMax: 0 });
  }
  // Hasta dónde puede crecer el anillo de cada nota sin salirse del lienzo:
  // la distancia de la nota al borde más cercano, menos el grosor del halo.
  // (El lienzo es la carta más un margen alrededor: ver .portal__lienzo en inicio.css)
  for (const n of notas) {
    n.radioMax = Math.min(ancho / 2 - Math.abs(n.x), alto / 2 - Math.abs(n.y)) - 4;
  }

  // 2. Los cristales: la carta se divide en casillas, en cada una cae un "centro"
  //    movido al azar, y cada trozo es la zona más cercana a su centro
  //    (una teselación de Voronoi: parecen trozos de vidrio cortados a mano)
  const columnas = Math.max(2, Math.round(Math.sqrt((CRISTALES * cartaW) / cartaH)));
  const filas = Math.max(2, Math.round(CRISTALES / columnas));
  const casillaW = cartaW / columnas;
  const casillaH = cartaH / filas;
  const centros = [];
  for (let fila = 0; fila < filas; fila++) {
    for (let col = 0; col < columnas; col++) {
      centros.push([
        (col + 0.5 + (azar() - 0.5) * DESORDEN) * casillaW - cartaW / 2,
        (fila + 0.5 + (azar() - 0.5) * DESORDEN) * casillaH - cartaH / 2,
      ]);
    }
  }

  const mitadW = cartaW / 2;
  const mitadH = cartaH / 2;
  cristales = [];
  for (let i = 0; i < centros.length; i++) {
    const [ax, ay] = centros[i];
    let forma = [[-mitadW, -mitadH], [mitadW, -mitadH], [mitadW, mitadH], [-mitadW, mitadH]];
    for (let j = 0; j < centros.length && forma.length; j++) {
      if (j === i) continue;
      const [bx, by] = centros[j];
      // Solo miramos vecinos cercanos (los lejanos no recortan nada)
      if (Math.abs(bx - ax) > casillaW * 3 || Math.abs(by - ay) > casillaH * 3) continue;
      // Quedarse con los puntos más cerca de A que de B
      forma = recortar(forma, bx - ax, by - ay, (bx * bx + by * by - ax * ax - ay * ay) / 2);
    }
    if (forma.length < 3) continue;
    cristales.push({
      forma,
      x: ax,
      y: ay,
      mota: azar() < MOTAS ? { dx: (azar() - 0.5) * casillaW * 0.4, sube: cartaH * (0.04 + azar() * 0.05) } : null,
      t: 0,
    });
  }

  // 3. Cuándo se enciende cada cristal: cuando lo alcanza el PRIMER anillo.
  //    Si alguno llegara demasiado tarde, los anillos van un poco más rápido
  //    (así siempre da tiempo a que la carta esté entera antes del final).
  const diagonal = Math.hypot(cartaW, cartaH);
  viaje = VIAJE_ANILLO;
  for (let intento = 0; intento < 12; intento++) {
    let ultimo = 0;
    for (const c of cristales) {
      c.t = Infinity;
      for (const n of notas) {
        c.t = Math.min(c.t, n.suena + (Math.hypot(c.x - n.x, c.y - n.y) / diagonal) * viaje);
      }
      ultimo = Math.max(ultimo, c.t);
    }
    if (ultimo <= 0.84) break;
    viaje *= 0.9;
  }
}

// Dibuja una forma de cristal (sus puntos están medidos desde el centro de la carta)
function trazarCristal(camino, c) {
  camino.moveTo(cx + c.forma[0][0], cy + c.forma[0][1]);
  for (let k = 1; k < c.forma.length; k++) camino.lineTo(cx + c.forma[k][0], cy + c.forma[k][1]);
  camino.closePath();
}

// ----- Dibujar un momento de la melodía -----
function dibujar(progreso) {
  ctx.clearRect(0, 0, ancho, alto);

  const formada = progreso >= 1;
  portal.classList.toggle("portal--formada", formada);
  if (formada) return;

  const diagonal = Math.hypot(cartaW, cartaH);
  // Al final todo lo que brilla se apaga, para terminar en la carta tal cual
  const apagar = 1 - tramo(progreso, 0.74, 0.93);

  // 1. El vitral: cada cristal aparece (de transparente a opaco) cuando lo alcanza su anillo.
  //    Se pintan en blanco en la capa invisible y luego "source-in" pone la imagen encima
  //    solo donde hay cristal (como un recortable).
  capaCtx.clearRect(0, 0, ancho, alto);
  capaCtx.fillStyle = "#fff";
  capaCtx.strokeStyle = "#fff";
  capaCtx.lineWidth = 1; // el trazo tapa las rendijas entre cristales vecinos
  const nuevos = [];     // los que acaban de encenderse: llevan brillo
  for (const c of cristales) {
    const f = tramo(progreso, c.t, c.t + 0.07);
    if (f <= 0) continue;
    const camino = new Path2D();
    trazarCristal(camino, c);
    capaCtx.globalAlpha = f;
    capaCtx.fill(camino);
    capaCtx.stroke(camino);
    const brillo = 1 - tramo(progreso, c.t, c.t + 0.14);
    if (brillo > 0) nuevos.push([camino, brillo]);
  }
  capaCtx.globalAlpha = 1;
  if (cara.complete && cara.naturalWidth) {
    capaCtx.globalCompositeOperation = "source-in";
    capaCtx.drawImage(cara, cx - cartaW / 2, cy - cartaH / 2, cartaW, cartaH);
    capaCtx.globalCompositeOperation = "source-over";
  }
  ctx.drawImage(capa, 0, 0, ancho, alto);

  // A partir de aquí todo suma luz ("lighter"): el verde y el oro brillan sobre la carta y el fondo
  ctx.globalCompositeOperation = "lighter";
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // 2. El brillo de los cristales recién encendidos: relleno verde y borde de oro
  for (const [camino, brillo] of nuevos) {
    ctx.globalAlpha = 0.28 * brillo;
    ctx.fillStyle = `rgb(${COLOR_VERDE})`;
    ctx.fill(camino);
    ctx.globalAlpha = 0.9 * brillo;
    ctx.strokeStyle = `rgb(${COLOR_ORO})`;
    ctx.lineWidth = 1.2;
    ctx.stroke(camino);
  }
  ctx.globalAlpha = 1;

  // 3. Los anillos: cada nota, al sonar, suelta un círculo que crece y se apaga.
  //    Detrás va un eco más flojo. Se apaga del todo justo antes de tocar el
  //    borde del lienzo (radioMax), así nunca se ve un anillo cortado.
  for (const n of notas) {
    const edad = progreso - n.suena;
    if (edad <= 0) continue;
    const radio = (edad / viaje) * diagonal;
    const fuerza = (1 - Math.pow(limitar(radio / n.radioMax), 2)) * apagar;
    if (fuerza <= 0) continue;
    for (const [escala, luz] of [[1, 1], [0.82, 0.35]]) {
      const r = radio * escala;
      ctx.beginPath();
      ctx.arc(cx + n.x, cy + n.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${COLOR_VERDE}, ${0.18 * fuerza * luz})`;
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.strokeStyle = `rgba(${COLOR_VERDE}, ${0.75 * fuerza * luz})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }

  // 4. Las notas: un destello de luz que se enciende en su sitio justo antes
  //    de sonar, y al sonar se abre y se apaga
  for (const n of notas) {
    const enciende = tramo(progreso, n.suena - 0.05, n.suena);
    const destello = tramo(progreso, n.suena, n.suena + 0.1);
    if (enciende <= 0 || destello >= 1) continue;
    const x = n.x;
    const y = n.y;
    const r = cartaW * (0.035 * enciende + 0.07 * destello);
    const luz = (destello > 0 ? 1 - destello : enciende) * apagar;
    const halo = ctx.createRadialGradient(cx + x, cy + y, 0, cx + x, cy + y, r);
    halo.addColorStop(0, `rgba(${COLOR_LUZ}, ${luz})`);
    halo.addColorStop(0.3, `rgba(${COLOR_VERDE}, ${0.6 * luz})`);
    halo.addColorStop(1, `rgba(${COLOR_VERDE}, 0)`);
    ctx.fillStyle = halo;
    ctx.fillRect(cx + x - r, cy + y - r, r * 2, r * 2);
  }

  // 5. Las motas: algunos cristales, al encenderse, sueltan una lucecita verde que sube
  ctx.fillStyle = `rgb(${COLOR_VERDE})`;
  for (const c of cristales) {
    if (!c.mota) continue;
    const v = tramo(progreso, c.t, c.t + 0.3);
    if (v <= 0 || v >= 1) continue;
    ctx.globalAlpha = (1 - v) * apagar;
    const x = cx + c.x + c.mota.dx * v;
    const y = cy + c.y - c.mota.sube * frenar(v);
    ctx.fillRect(x - 1, y - 1, 2, 2);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

// ----- Animación (igual que las otras cartas: abrir lento, cerrar rápido) -----
let progreso = 0;
let objetivo = 0;
let anterior = 0;
let animando = false;

function animar(ahora) {
  // Entre 0 y 0.05 s: nunca negativo y nunca un salto grande (pestaña en segundo plano)
  const segundos = Math.min(Math.max((ahora - anterior) / 1000, 0), 0.05);
  anterior = ahora;

  if (objetivo > progreso) progreso = Math.min(objetivo, progreso + segundos / DURACION_ABRIR);
  else progreso = Math.max(objetivo, progreso - segundos / DURACION_CERRAR);

  dibujar(progreso);

  if (progreso !== objetivo) {
    requestAnimationFrame(animar);
  } else {
    animando = false;
    if (progreso === 0) portal.classList.remove("portal--visible");
  }
}

function mostrarCartaZelda(abrir) {
  boton.setAttribute("aria-expanded", abrir); // avisa a los lectores de pantalla
  if ((abrir ? 1 : 0) === objetivo) return;
  objetivo = abrir ? 1 : 0;

  if (abrir) {
    portal.classList.add("portal--visible");
    if (progreso === 0) {
      medir();
      crearMelodia();
    }
    // Una carta a la vez (todas salen en el mismo sitio): avisamos a las otras para que se guarden
    document.dispatchEvent(new CustomEvent("carta-abierta", { detail: "zelda" }));
  }

  // Con "reducir movimiento": sin melodía, aparece o desaparece de golpe
  if (sinMovimiento.matches) {
    progreso = objetivo;
    ctx.clearRect(0, 0, ancho, alto);
    portal.classList.toggle("portal--formada", abrir);
    if (!abrir) portal.classList.remove("portal--visible");
    return;
  }

  if (!animando) {
    animando = true;
    anterior = performance.now();
    requestAnimationFrame(animar);
  }
}

// ----- Cuándo se abre y se cierra (como las otras cartas de planeta) -----
// Con ratón: apuntar al planeta la saca y quitar el ratón la guarda.
// En móvil: un toque la saca y otro (o tocar fuera) la guarda.
// Con teclado: Enter o Espacio la sacan y Escape la guarda.
let esperaApuntar = null;
let punteroPulsado = "";

boton.addEventListener("pointerenter", (evento) => {
  if (evento.pointerType !== "mouse") return;
  clearTimeout(esperaApuntar);
  esperaApuntar = setTimeout(() => mostrarCartaZelda(true), ESPERA_APUNTAR);
});

boton.addEventListener("pointerleave", (evento) => {
  if (evento.pointerType !== "mouse") return;
  clearTimeout(esperaApuntar);
  mostrarCartaZelda(false);
});

boton.addEventListener("pointerdown", (evento) => {
  punteroPulsado = evento.pointerType;
});

boton.addEventListener("click", (evento) => {
  // orbita.js marca el clic como "cancelado" si la persona estaba arrastrando la órbita
  if (evento.defaultPrevented) return;
  const delTeclado = evento.detail === 0;
  if (!delTeclado && punteroPulsado === "mouse") return; // con ratón ya se encarga apuntar
  mostrarCartaZelda(objetivo === 0);
});

document.addEventListener("click", (evento) => {
  if (!boton.contains(evento.target)) mostrarCartaZelda(false);
});
document.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape") mostrarCartaZelda(false);
});

// Si se abre otra carta (la de Ludwig o la de otro planeta), esta se guarda
document.addEventListener("carta-abierta", (evento) => {
  if (evento.detail === "zelda") return;
  clearTimeout(esperaApuntar);
  mostrarCartaZelda(false);
});

// Si cambia el tamaño de la ventana con la carta abierta, lo recolocamos todo
window.addEventListener("resize", () => {
  if (progreso > 0) {
    medir();
    crearMelodia();
    dibujar(progreso);
  }
});

})();
