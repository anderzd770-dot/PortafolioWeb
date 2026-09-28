// =========================================================
// LA CARTA DE THE WITCHER 3: NACE DEL FUEGO
// Al apuntar al planeta de The Witcher 3, su carta ("XIX · The Sun",
// grabado en oro sobre negro) aparece en el mismo sitio que la carta
// de Ludwig y la de Hollow Knight, pero esta sale de entre las llamas:
//
// Pasos (según "progreso", de 0 = cerrada a 1 = formada):
//   1. En el centro de la carta prende una hoguera pequeña.
//   2. El fuego se extiende en círculo hacia fuera. Por donde pasa
//      aparece la carta, como papel que se quema al revés: detrás del
//      frente queda un borde chamuscado y en el frente hay una línea
//      de brasa con lenguas de fuego que suben.
//   3. Cuando el fuego llega a las esquinas se apaga y quedan unas
//      chispas que suben y se consumen.
// Al cerrar pasa lo mismo al revés: el fuego vuelve al centro y se apaga.
//
// Idea clave: el frente del fuego es UN camino (un círculo con el
// borde irregular). Se usa tres veces: para recortar la carta (clip),
// para el borde chamuscado y para la línea de brasa.
// =========================================================

(() => {

// ----- Ajustes (¡prueba a cambiarlos!) -----
const DURACION_ABRIR = 1.8;    // segundos que tarda en formarse
const DURACION_CERRAR = 0.7;   // segundos que tarda en apagarse
const LLAMAS = 56;             // lenguas de fuego repartidas por el frente
const ALTURA_LLAMA = 0.15;     // alto de una llama (fracción del ancho de la carta)
const ANCHO_LLAMA = 0.055;     // ancho de una llama en su base
const CHISPAS = 44;            // chispas que suben
const IRREGULAR = 0.09;        // lo "mordido" que está el borde del fuego (0 = círculo perfecto)
const COLOR_BRASA = "255, 150, 50";   // la línea del frente (rojo, verde, azul)
const COLOR_NUCLEO = "255, 238, 190"; // lo más caliente: casi blanco
const COLOR_LLAMA = "255, 110, 25";
const COLOR_HUMO = "200, 45, 10";     // la punta de la llama, donde se apaga
const ESPERA_APUNTAR = 150;    // milisegundos apuntando antes de sacarla (como las otras cartas)
const SEMILLA = 19;            // XIX: cámbiala y las llamas y chispas salen distintas

// ----- Elementos -----
const planeta = document.querySelector(".planeta--witcher");
const boton = planeta?.querySelector(".planeta__enlace");
const portal = document.querySelector(".portal--witcher");
if (!boton || !portal) return;
const carta = portal.querySelector(".carta");
const cara = carta.querySelector(".carta__cara");
const lienzo = portal.querySelector(".portal__lienzo");
const ctx = lienzo.getContext("2d");
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
let llamas = [];
let chispas = [];

function medir() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  ancho = lienzo.clientWidth;
  alto = lienzo.clientHeight;
  lienzo.width = Math.round(ancho * dpr);
  lienzo.height = Math.round(alto * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  cartaW = carta.offsetWidth;
  cartaH = carta.offsetHeight;
  cx = ancho / 2;
  cy = alto / 2;
  cartaX = cx - cartaW / 2;
  cartaY = cy - cartaH / 2;
  radioCarta = Math.hypot(cartaW, cartaH) / 2;
}

function crearFuego() {
  const azar = crearAzar(SEMILLA);
  llamas = [];
  for (let i = 0; i < LLAMAS; i++) {
    llamas.push({
      angulo: ((i + azar() * 0.8) / LLAMAS) * Math.PI * 2, // dónde está en el frente
      alto: 0.6 + azar() * 0.6,
      ancho: 0.7 + azar() * 0.6,
      ritmo: 7 + azar() * 6,          // lo rápido que parpadea
      fase: azar() * Math.PI * 2,
    });
  }
  chispas = [];
  for (let i = 0; i < CHISPAS; i++) {
    chispas.push({
      angulo: azar() * Math.PI * 2,
      nace: 0.08 + azar() * 0.6,      // en qué momento salta del frente
      vida: 0.18 + azar() * 0.14,     // cuánto dura (en unidades de progreso)
      sube: 0.25 + azar() * 0.35,     // lo alto que llega (fracción del ancho de la carta)
      deriva: (azar() - 0.5) * 0.25,  // se va un poco hacia un lado
      tam: 0.7 + azar() * 1.1,
    });
  }
}

// ----- El frente del fuego -----
// Radio medio del frente: empieza en 0 y termina un poco más allá de las esquinas
// (1.1 × radioCarta: aunque el borde esté "mordido", al final tapa toda la carta).
// Ritmo: mitad constante y mitad suave → arranca despacio (la hoguera),
// pero no frena tanto al final, así las esquinas arden hasta el último momento.
function radioFrente(progreso) {
  const u = tramo(progreso, 0.08, 1);
  return (0.5 * u + 0.5 * suave(u)) * radioCarta * 1.1;
}

// Lo lejos que llega el frente en una dirección: un círculo con el borde
// irregular. Las ondas se mueven con el reloj, así el borde "arde" y cambia.
function radioEn(angulo, radio, t) {
  const onda =
    0.55 * Math.sin(5 * angulo + t * 2.6) +
    0.3 * Math.sin(9 * angulo - t * 4.1 + 1.3) +
    0.15 * Math.sin(17 * angulo + t * 7.3 + 0.4);
  return radio * (1 + IRREGULAR * onda);
}

function trazarFrente(radio, t) {
  const camino = new Path2D();
  const puntos = 120;
  for (let i = 0; i <= puntos; i++) {
    const a = (i / puntos) * Math.PI * 2;
    const r = radioEn(a, radio, t);
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) camino.moveTo(x, y);
    else camino.lineTo(x, y);
  }
  camino.closePath();
  return camino;
}

// ¿Este punto está encima de la carta? (el fuego solo arde sobre ella)
const dentroDeLaCarta = (x, y) =>
  x > cartaX + 1 && x < cartaX + cartaW - 1 && y > cartaY + 1 && y < cartaY + cartaH - 1;

// ----- Una lengua de fuego: forma de gota que sube y se mece -----
function dibujarLlama(x, y, alto, ancho, vaiven, colorBase, colorPunta) {
  const degradado = ctx.createLinearGradient(x, y, x, y - alto);
  degradado.addColorStop(0, colorBase);
  degradado.addColorStop(1, colorPunta);
  ctx.fillStyle = degradado;
  ctx.beginPath();
  ctx.moveTo(x - ancho / 2, y);
  ctx.quadraticCurveTo(x - ancho / 2, y - alto * 0.55, x + vaiven, y - alto); // lado izquierdo hasta la punta
  ctx.quadraticCurveTo(x + ancho / 2, y - alto * 0.55, x + ancho / 2, y);     // y baja por el derecho
  ctx.quadraticCurveTo(x, y + ancho * 0.35, x - ancho / 2, y);                // base redondeada
  ctx.fill();
}

// ----- Dibujar un momento de la formación -----
function dibujar(progreso) {
  ctx.clearRect(0, 0, ancho, alto);

  const formada = progreso >= 1;
  portal.classList.toggle("portal--formada", formada);
  if (formada) return;

  const t = performance.now() / 1000;     // reloj para el parpadeo del fuego
  const radio = radioFrente(progreso);
  // Fuerza del fuego: prende al principio y se apaga al llegar a las esquinas
  const fuego = tramo(progreso, 0, 0.1) * (1 - tramo(progreso, 0.86, 1));
  const frente = trazarFrente(radio, t);
  const rectCarta = new Path2D();
  rectCarta.rect(cartaX, cartaY, cartaW, cartaH);

  // 1. Resplandor del fuego en el centro (luz que se suma a lo que hay debajo)
  const resplandor = Math.min(radio + cartaW * 0.3, cx - 2);
  if (fuego > 0 && resplandor > 0) {
    ctx.globalCompositeOperation = "lighter";
    const luz = ctx.createRadialGradient(cx, cy, 0, cx, cy, resplandor);
    luz.addColorStop(0, `rgba(${COLOR_LLAMA}, ${0.35 * fuego})`);
    luz.addColorStop(1, `rgba(${COLOR_LLAMA}, 0)`);
    ctx.fillStyle = luz;
    ctx.fillRect(cx - resplandor, cy - resplandor, resplandor * 2, resplandor * 2);
    ctx.globalCompositeOperation = "source-over";
  }

  // 2. La carta, solo por donde ya ha pasado el fuego (recorte: carta ∩ frente)
  if (radio > 0 && cara.complete && cara.naturalWidth) {
    ctx.save();
    ctx.clip(rectCarta);
    ctx.clip(frente);
    ctx.drawImage(cara, cartaX, cartaY, cartaW, cartaH);

    // 3. Borde chamuscado: una franja oscura justo detrás del frente
    //    (la línea se pinta a los dos lados del camino, pero el recorte deja solo la de dentro).
    //    Se aclara cuando el fuego se apaga, así al final no queda ninguna esquina quemada.
    ctx.lineJoin = "round";
    ctx.strokeStyle = `rgba(30, 10, 2, ${0.55 * fuego})`;
    ctx.lineWidth = cartaW * 0.16;
    ctx.stroke(frente);
    ctx.strokeStyle = `rgba(8, 3, 1, ${0.9 * fuego})`;
    ctx.lineWidth = cartaW * 0.06;
    ctx.stroke(frente);
    ctx.restore();
  }

  if (fuego <= 0) return;

  // A partir de aquí todo es luz: "lighter" suma colores, como el fuego de verdad
  ctx.globalCompositeOperation = "lighter";

  // 4. La línea de brasa en el frente (solo encima de la carta)
  ctx.save();
  ctx.clip(rectCarta);
  ctx.shadowColor = `rgba(${COLOR_LLAMA}, 0.9)`;
  ctx.shadowBlur = 12;
  ctx.strokeStyle = `rgba(${COLOR_BRASA}, ${0.9 * fuego})`;
  ctx.lineWidth = 3.5;
  ctx.stroke(frente);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = `rgba(${COLOR_NUCLEO}, ${0.95 * fuego})`;
  ctx.lineWidth = 1.2;
  ctx.stroke(frente);
  ctx.restore();

  // 5. Lenguas de fuego: nacen en el frente y siempre suben (el fuego sube, no sale hacia fuera)
  //    Al principio, con el frente tan pequeño, se juntan todas: parece una hoguera.
  const hoguera = 0.6 + 0.4 * Math.min(1, radio / (cartaW * 0.15));
  for (const l of llamas) {
    const r = radioEn(l.angulo, radio, t);
    const x = cx + Math.cos(l.angulo) * r;
    const y = cy + Math.sin(l.angulo) * r;
    if (!dentroDeLaCarta(x, y)) continue;

    const parpadeo = 0.55 + 0.45 * Math.sin(t * l.ritmo + l.fase) * Math.sin(t * l.ritmo * 0.37 + l.fase * 2);
    const h = cartaW * ALTURA_LLAMA * l.alto * parpadeo * fuego * hoguera;
    const w = cartaW * ANCHO_LLAMA * l.ancho * hoguera;
    const vaiven = Math.sin(t * 5 + l.fase) * w * 0.7;
    if (h < 1) continue;
    // Llama de fuera (naranja) y de dentro (casi blanca, más pequeña)
    dibujarLlama(x, y, h, w, vaiven, `rgba(${COLOR_LLAMA}, ${0.75 * fuego})`, `rgba(${COLOR_HUMO}, 0)`);
    dibujarLlama(x, y, h * 0.55, w * 0.5, vaiven * 0.5, `rgba(${COLOR_NUCLEO}, ${0.85 * fuego})`, `rgba(${COLOR_BRASA}, 0)`);
  }

  // 6. Chispas: saltan del frente, suben haciendo eses y se consumen
  ctx.shadowColor = `rgba(${COLOR_LLAMA}, 1)`;
  ctx.shadowBlur = 6;
  ctx.fillStyle = `rgb(${COLOR_NUCLEO})`;
  for (const c of chispas) {
    const q = tramo(progreso, c.nace, c.nace + c.vida);
    if (q <= 0 || q >= 1) continue;
    // Salen del punto del frente donde estaba el fuego cuando nacieron
    const r = radioEn(c.angulo, radioFrente(c.nace), t);
    let x = cx + Math.cos(c.angulo) * r;
    let y = cy + Math.sin(c.angulo) * r;
    if (!dentroDeLaCarta(x, y)) continue;
    y -= cartaW * c.sube * q;
    x += cartaW * (c.deriva * q + 0.03 * Math.sin(q * 9 + c.angulo));
    // Aparece, brilla y se apaga; y se desvanece antes de tocar el borde del lienzo
    ctx.globalAlpha = Math.sin(Math.PI * q) * limitar((y - 4) / 24);
    ctx.beginPath();
    ctx.arc(x, y, c.tam * (1 - q * 0.6), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.globalCompositeOperation = "source-over";
}

// ----- Animación (igual que las otras cartas: abrir lento, cerrar rápido) -----
let progreso = 0;
let objetivo = 0;
let anterior = 0;
let animando = false;

function animar(ahora) {
  // Entre 0 y 0.05 s: nunca negativo (el primer fotograma puede llegar con una hora
  // un pelín anterior) y nunca un salto grande (si la pestaña estuvo en segundo plano)
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

function mostrarCartaWitcher(abrir) {
  boton.setAttribute("aria-expanded", abrir); // avisa a los lectores de pantalla
  if ((abrir ? 1 : 0) === objetivo) return;
  objetivo = abrir ? 1 : 0;

  if (abrir) {
    portal.classList.add("portal--visible");
    if (progreso === 0) {
      medir();
      crearFuego();
    }
    // Una carta a la vez (todas salen en el mismo sitio): avisamos a las otras para que se guarden
    document.dispatchEvent(new CustomEvent("carta-abierta", { detail: "witcher" }));
  }

  // Con "reducir movimiento": sin fuego, aparece o desaparece de golpe
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

// ----- Cuándo se abre y se cierra (como la carta de Hollow Knight) -----
// Con ratón: apuntar al planeta la saca y quitar el ratón la guarda.
// En móvil: un toque la saca y otro (o tocar fuera) la guarda.
// Con teclado: Enter o Espacio la sacan y Escape la guarda.
let esperaApuntar = null;
let punteroPulsado = "";

boton.addEventListener("pointerenter", (evento) => {
  if (evento.pointerType !== "mouse") return;
  clearTimeout(esperaApuntar);
  esperaApuntar = setTimeout(() => mostrarCartaWitcher(true), ESPERA_APUNTAR);
});

boton.addEventListener("pointerleave", (evento) => {
  if (evento.pointerType !== "mouse") return;
  clearTimeout(esperaApuntar);
  mostrarCartaWitcher(false);
});

boton.addEventListener("pointerdown", (evento) => {
  punteroPulsado = evento.pointerType;
});

boton.addEventListener("click", (evento) => {
  // orbita.js marca el clic como "cancelado" si la persona estaba arrastrando la órbita
  if (evento.defaultPrevented) return;
  const delTeclado = evento.detail === 0;
  if (!delTeclado && punteroPulsado === "mouse") return; // con ratón ya se encarga apuntar
  mostrarCartaWitcher(objetivo === 0);
});

document.addEventListener("click", (evento) => {
  if (!boton.contains(evento.target)) mostrarCartaWitcher(false);
});
document.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape") mostrarCartaWitcher(false);
});

// Si se abre otra carta (la de Ludwig o la de otro planeta), esta se guarda
document.addEventListener("carta-abierta", (evento) => {
  if (evento.detail === "witcher") return;
  clearTimeout(esperaApuntar);
  mostrarCartaWitcher(false);
});

// Si cambia el tamaño de la ventana con la carta abierta, lo recolocamos todo
window.addEventListener("resize", () => {
  if (progreso > 0) {
    medir();
    dibujar(progreso);
  }
});

})();
