// =========================================================
// LA CARTA DE OUTER WILDS: NACE DE UN GLIFO
// Al apuntar al planeta de Outer Wilds, su carta ("XVIII · The Moon")
// aparece en el mismo sitio que las otras cartas, pero se forma a partir
// de un glifo de luz violeta que sale de la mitad de la carta:
//
// Pasos (según "progreso", de 0 = cerrada a 1 = formada):
//   1. En el centro se abre un núcleo oscuro con un aro de luz y salen
//      rayos largos y finos hacia fuera.
//   2. Del núcleo nacen trazos en ángulo (rectos y a 45°) que se ramifican
//      como un laberinto y se extienden por toda la carta.
//   3. Por donde ya ha pasado un trazo, la carta se "enciende": el trazo
//      se ensancha y deja ver el dibujo debajo.
//   4. Al final la carta termina de encenderse desde el centro, el glifo
//      se apaga y queda la carta.
// Al cerrar pasa lo mismo al revés: la carta vuelve a meterse en el glifo.
//
// El glifo NO es una imagen: se inventa con código cada vez que se abre
// (siempre igual, gracias a la semilla), así la animación es original.
//
// Idea clave: cada trazo sabe a qué "distancia de camino" está del centro.
// Un solo número, el frente, avanza con el progreso; los trazos cuya
// distancia es menor que el frente ya están dibujados.
// =========================================================

(() => {

// ----- Ajustes (¡prueba a cambiarlos!) -----
const DURACION_ABRIR = 1.9;    // segundos que tarda en formarse
const DURACION_CERRAR = 0.7;   // segundos que tarda en volver al glifo
const RAICES = 16;             // trazos que salen del núcleo
const PASO = 0.045;            // largo de cada tramo del laberinto (fracción del ancho de la carta)
const RAMIFICAR = 0.2;         // probabilidad de que un trazo se divida en cada tramo
const MAX_TRAMOS = 1600;       // límite de tramos (más = laberinto más denso)
const RAYOS = 12;              // rayos largos que salen del centro
const ANCHO_ENCENDIDO = 0.1;   // lo ancho que llega a ser un trazo encendido (fracción del ancho de la carta)
const NUCLEO_GLIFO = 0.3;      // parte del camino que forma el glifo del centro (no se apaga hasta el final)
const ESTELA = 0.22;           // lo que tarda un trazo en apagarse detrás del frente (fracción del camino)
const RADIO_NUCLEO = 0.06;     // tamaño del núcleo oscuro (fracción del ancho de la carta)
const COLOR_GLIFO = "150, 150, 255";  // violeta de la luz (rojo, verde, azul)
const COLOR_BRILLO = "225, 225, 255"; // el centro de cada trazo, casi blanco
const ESPERA_APUNTAR = 150;    // milisegundos apuntando antes de sacarla (como las otras cartas)
const SEMILLA = 18;            // XVIII: cámbiala y el glifo sale distinto

// ----- Elementos -----
const planeta = document.querySelector(".planeta--outer-wilds");
const enlace = planeta?.querySelector(".planeta__enlace");
const portal = document.querySelector(".portal--ow");
if (!enlace || !portal) return;
const carta = portal.querySelector(".carta");
const cara = carta.querySelector(".carta__cara");
const lienzo = portal.querySelector(".portal__lienzo");
const ctx = lienzo.getContext("2d");
// Capa aparte donde se prepara "la carta, solo por donde ya pasó el glifo"
const capa = document.createElement("canvas");
const cctx = capa.getContext("2d");
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

const suave = (x) => x * x * (3 - 2 * x);                // lento al principio y al final
const frenar = (x) => 1 - Math.pow(1 - x, 2);            // rápido al principio, frena al final
const limitar = (x) => Math.min(1, Math.max(0, x));
const tramo = (p, desde, hasta) => limitar((p - desde) / (hasta - desde)); // 0 → 1 entre dos momentos

// ----- Medidas -----
let ancho = 0;
let alto = 0;
let cx = 0;          // centro de la carta dentro del lienzo
let cy = 0;
let cartaX = 0;
let cartaY = 0;
let cartaW = 0;
let cartaH = 0;
let radioCarta = 0;  // del centro a una esquina de la carta
let tramos = [];     // los trocitos de línea del laberinto
let rayos = [];
let distanciaMax = 0;

function medir() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  ancho = lienzo.clientWidth;
  alto = lienzo.clientHeight;
  lienzo.width = capa.width = Math.round(ancho * dpr);
  lienzo.height = capa.height = Math.round(alto * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  cartaW = carta.offsetWidth;
  cartaH = carta.offsetHeight;
  cx = ancho / 2;
  cy = alto / 2;
  cartaX = cx - cartaW / 2;
  cartaY = cy - cartaH / 2;
  radioCarta = Math.hypot(cartaW, cartaH) / 2;
}

// ----- Inventar el glifo -----
// Las 8 direcciones posibles: derecha, diagonal, abajo... (cada 45°)
const DIRECCIONES = Array.from({ length: 8 }, (_, k) => (k * Math.PI) / 4);
const octante = (angulo) => ((Math.round(angulo / (Math.PI / 4)) % 8) + 8) % 8;
const dentroDeLaCarta = (x, y) => x > cartaX && x < cartaX + cartaW && y > cartaY && y < cartaY + cartaH;

function crearGlifo() {
  const azar = crearAzar(SEMILLA);
  const paso = PASO * cartaW;
  const radioNucleo = RADIO_NUCLEO * cartaW;
  tramos = [];
  distanciaMax = 0;

  // Cada punta del laberinto que aún crece: dónde está, hacia dónde va
  // y cuánto camino lleva desde el centro
  const puntas = [];
  for (let i = 0; i < RAICES; i++) {
    const angulo = ((i + azar() * 0.6) / RAICES) * Math.PI * 2;
    puntas.push({
      x: cx + Math.cos(angulo) * radioNucleo,
      y: cy + Math.sin(angulo) * radioNucleo,
      dir: octante(angulo),
      d: radioNucleo,
    });
  }

  // Crecen por turnos (primero todas las puntas cercanas): así el laberinto
  // se extiende parejo en todas direcciones
  while (puntas.length && tramos.length < MAX_TRAMOS) {
    const p = puntas.shift();
    const largo = paso * (0.6 + azar() * 0.8);
    const a = DIRECCIONES[p.dir];
    const x = p.x + Math.cos(a) * largo;
    const y = p.y + Math.sin(a) * largo;
    if (!dentroDeLaCarta(x, y)) continue; // al llegar al borde de la carta, el trazo termina

    tramos.push({ x0: p.x, y0: p.y, x1: x, y1: y, d0: p.d, d1: p.d + largo });
    distanciaMax = Math.max(distanciaMax, p.d + largo);

    // ¿Hacia dónde sigue? Casi siempre recto; a veces gira 45° hacia fuera del centro
    const haciaFuera = octante(Math.atan2(y - cy, x - cx));
    let dir = p.dir;
    const suerte = azar();
    if (suerte > 0.55 && suerte < 0.8) dir = haciaFuera;
    else if (suerte >= 0.8) dir = (p.dir + (azar() < 0.5 ? 1 : 7)) % 8;
    // Nunca vuelve hacia el centro (más de 90° en contra de "hacia fuera")
    const vuelta = Math.min((dir - haciaFuera + 8) % 8, (haciaFuera - dir + 8) % 8);
    if (vuelta > 2) dir = haciaFuera;

    if (azar() > 0.015) puntas.push({ x, y, dir, d: p.d + largo }); // a veces se corta: huecos del laberinto

    // Se divide: una rama nueva sale en ángulo recto (o a 45°) hacia un lado
    if (azar() < RAMIFICAR) {
      const giro = azar() < 0.6 ? 2 : 1;
      const lado = azar() < 0.5 ? giro : 8 - giro;
      const nueva = (dir + lado) % 8;
      const vueltaNueva = Math.min((nueva - haciaFuera + 8) % 8, (haciaFuera - nueva + 8) % 8);
      if (vueltaNueva <= 2) puntas.push({ x, y, dir: nueva, d: p.d + largo });
    }
  }

  // Rayos largos: unos llegan casi al borde del lienzo y otros se quedan cortos
  rayos = [];
  for (let i = 0; i < RAYOS; i++) {
    const angulo = ((i + azar() * 0.7) / RAYOS) * Math.PI * 2;
    // Distancia hasta el borde del lienzo en esa dirección (para que el rayo no se corte)
    const hastaBorde = Math.min(
      Math.abs(Math.cos(angulo)) > 0.001 ? (cx - 4) / Math.abs(Math.cos(angulo)) : Infinity,
      Math.abs(Math.sin(angulo)) > 0.001 ? (cy - 4) / Math.abs(Math.sin(angulo)) : Infinity
    );
    rayos.push({
      angulo,
      largo: Math.min(hastaBorde, radioCarta * (0.55 + azar() * 0.6)),
      nace: azar() * 0.08,
      grosor: 0.8 + azar() * 0.9,
    });
  }
}

// ----- Dibujar un momento de la formación -----
function dibujar(progreso) {
  ctx.clearRect(0, 0, ancho, alto);

  const formada = progreso >= 1;
  portal.classList.toggle("portal--formada", formada);
  if (formada) return;

  // El frente del glifo: empieza cuando ya se ha abierto el núcleo
  // Ritmo del frente: mitad constante y mitad suave, repartido entre 0.1 y 0.8
  const u = tramo(progreso, 0.1, 0.8);
  const frente = distanciaMax * (0.6 * u + 0.4 * suave(u));
  const apagarGlifo = 1 - tramo(progreso, 0.74, 0.98); // la luz del glifo se va al final
  const nucleo = tramo(progreso, 0, 0.1) * apagarGlifo;
  const radioNucleo = RADIO_NUCLEO * cartaW;

  // 1. El núcleo oscuro con su aro de luz (debajo de la carta)
  if (nucleo > 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, radioNucleo * nucleo, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(4, 3, 12, 0.95)";
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = `rgba(${COLOR_GLIFO}, ${0.9 * nucleo})`;
    ctx.stroke();
  }

  // 2. La carta, solo por donde ya pasó el glifo.
  //    En la capa: primero pintamos los trazos encendidos (anchos) y luego,
  //    con "source-in", la imagen: solo queda la imagen donde había trazo.
  if (cara.complete && cara.naturalWidth && frente > 0) {
    cctx.clearRect(0, 0, ancho, alto);
    cctx.lineCap = "round";
    cctx.strokeStyle = "#fff";
    // Agrupamos los trazos por grosor (6 grupos): muchos menos "stroke" que uno por trazo
    const grupos = Array.from({ length: 6 }, () => new Path2D());
    const anchoMax = ANCHO_ENCENDIDO * cartaW;
    for (const t of tramos) {
      if (t.d1 > frente) continue;
      const g = limitar((frente - t.d1) / (distanciaMax * 0.25)); // 0 = recién encendido, 1 = del todo
      if (g <= 0) continue;
      const grupo = Math.min(5, Math.floor(g * 6));
      grupos[grupo].moveTo(t.x0, t.y0);
      grupos[grupo].lineTo(t.x1, t.y1);
    }
    grupos.forEach((camino, i) => {
      cctx.lineWidth = anchoMax * ((i + 1) / 6);
      cctx.stroke(camino);
    });
    // Al final, la carta termina de encenderse desde el centro (tapa los huecos del laberinto)
    const relleno = radioCarta * 1.05 * suave(tramo(progreso, 0.6, 0.96));
    if (relleno > 0) {
      cctx.beginPath();
      cctx.arc(cx, cy, relleno, 0, Math.PI * 2);
      cctx.fillStyle = "#fff";
      cctx.fill();
    }
    cctx.globalCompositeOperation = "source-in";
    cctx.drawImage(cara, cartaX, cartaY, cartaW, cartaH);
    cctx.globalCompositeOperation = "source-over";
    ctx.drawImage(capa, 0, 0, ancho, alto);
  }

  if (apagarGlifo <= 0) return;

  // A partir de aquí todo es luz: "lighter" suma colores
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";

  // 3. Rayos: líneas finas que salen del núcleo, más brillantes cerca del centro
  for (const r of rayos) {
    const q = frenar(tramo(progreso, r.nace, r.nace + 0.22));
    if (q <= 0) continue;
    const largo = r.largo * q;
    const x = cx + Math.cos(r.angulo) * largo;
    const y = cy + Math.sin(r.angulo) * largo;
    const degradado = ctx.createLinearGradient(cx, cy, x, y);
    degradado.addColorStop(0, `rgba(${COLOR_BRILLO}, ${0.9 * apagarGlifo})`);
    degradado.addColorStop(0.5, `rgba(${COLOR_GLIFO}, ${0.6 * apagarGlifo})`);
    degradado.addColorStop(1, `rgba(${COLOR_GLIFO}, 0)`);
    ctx.strokeStyle = degradado;
    ctx.lineWidth = r.grosor;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  // 4. El laberinto de trazos hasta donde llega el frente (el último tramo, a medias).
  //    Es una ONDA: cada trazo brilla al llegar el frente y se apaga detrás de él,
  //    así se ve la carta que va quedando. El glifo del centro (el primer NUCLEO_GLIFO
  //    del camino) no se apaga: queda como un sello hasta el final.
  //    Los trazos van en 4 grupos según su brillo (menos "stroke" que uno por trazo).
  const grupos = Array.from({ length: 4 }, () => new Path2D());
  const centroDelGlifo = distanciaMax * NUCLEO_GLIFO;
  for (const t of tramos) {
    if (t.d0 >= frente) continue;
    const q = Math.min(1, (frente - t.d0) / (t.d1 - t.d0));
    const luz = t.d1 < centroDelGlifo ? 1 : 1 - limitar((frente - t.d1) / (distanciaMax * ESTELA));
    if (luz <= 0) continue;
    const grupo = Math.min(3, Math.floor(luz * 4));
    grupos[grupo].moveTo(t.x0, t.y0);
    grupos[grupo].lineTo(t.x0 + (t.x1 - t.x0) * q, t.y0 + (t.y1 - t.y0) * q);
  }
  // Dos pasadas por grupo: una ancha y tenue (el resplandor) y una fina y brillante
  grupos.forEach((lineas, i) => {
    const luz = ((i + 1) / 4) * apagarGlifo;
    ctx.strokeStyle = `rgba(${COLOR_GLIFO}, ${0.35 * luz})`;
    ctx.lineWidth = 4;
    ctx.stroke(lineas);
    ctx.strokeStyle = `rgba(${COLOR_BRILLO}, ${0.8 * luz})`;
    ctx.lineWidth = 1.2;
    ctx.stroke(lineas);
  });

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

function mostrarCartaOuterWilds(abrir) {
  if ((abrir ? 1 : 0) === objetivo) return;
  objetivo = abrir ? 1 : 0;

  if (abrir) {
    portal.classList.add("portal--visible");
    if (progreso === 0) {
      medir();
      crearGlifo();
    }
    // Una carta a la vez (todas salen en el mismo sitio): avisamos a las otras para que se guarden
    document.dispatchEvent(new CustomEvent("carta-abierta", { detail: "outer-wilds" }));
  }

  // Con "reducir movimiento": sin glifo, aparece o desaparece de golpe
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

// ----- Cuándo se abre y se cierra -----
// Outer Wilds es el único planeta con página propia: sigue siendo un enlace
// (un clic entra en el mundo). La carta es un adelanto:
// - Con ratón: apuntar al planeta la saca y quitar el ratón la guarda.
// - Con teclado: al llegar al enlace con Tab aparece y al salir se guarda.
// - En móvil no sale: un toque ya entra en el mundo.
let esperaApuntar = null;

enlace.addEventListener("pointerenter", (evento) => {
  if (evento.pointerType !== "mouse") return;
  clearTimeout(esperaApuntar);
  esperaApuntar = setTimeout(() => mostrarCartaOuterWilds(true), ESPERA_APUNTAR);
});

enlace.addEventListener("pointerleave", (evento) => {
  if (evento.pointerType !== "mouse") return;
  clearTimeout(esperaApuntar);
  mostrarCartaOuterWilds(false);
});

enlace.addEventListener("focus", () => {
  if (enlace.matches(":focus-visible")) mostrarCartaOuterWilds(true); // solo con teclado
});
enlace.addEventListener("blur", () => mostrarCartaOuterWilds(false));
document.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape") mostrarCartaOuterWilds(false);
});

// Si se abre otra carta (la de Ludwig o la de otro planeta), esta se guarda
document.addEventListener("carta-abierta", (evento) => {
  if (evento.detail === "outer-wilds") return;
  clearTimeout(esperaApuntar);
  mostrarCartaOuterWilds(false);
});

// Si cambia el tamaño de la ventana con la carta abierta, lo recolocamos todo
window.addEventListener("resize", () => {
  if (progreso > 0) {
    medir();
    crearGlifo();
    dibujar(progreso);
  }
});

})();
