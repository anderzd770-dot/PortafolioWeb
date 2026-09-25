// =========================================================
// LA CARTA QUE SE FORMA DESDE UN AGUJERO
// Al apuntar al agujero negro, la carta aparece arriba a la izquierda:
// nace una espiral pequeña de píxeles en su centro y de ella salen
// cientos de píxeles que "construyen" la carta de dentro hacia fuera.
//
// Idea clave: es el agujero negro al revés (un "agujero blanco").
// En el disco los píxeles caen hacia el centro; aquí salen de él.
// Por eso la espiral gira en sentido contrario al disco.
//
// Todo depende de un solo número, "progreso", que va de 0 (cerrada)
// a 1 (formada). Al cerrar, el mismo camino se recorre hacia atrás.
// =========================================================

(() => {

// ----- Ajustes (¡prueba a cambiarlos!) -----
const NUM_PIXELES = 900;       // píxeles que forman la carta
const DURACION_ABRIR = 1.4;    // segundos que tarda en formarse
const DURACION_CERRAR = 0.5;   // segundos que tarda en volver al agujero
const VUELTAS = 1.2;           // vueltas de la espiral de cada píxel
const EN_BORDE = 0.55;         // parte de los píxeles que aterriza en el borde (el resto, dentro)
const REJILLA = 3;             // tamaño de la celda de píxel (igual que el disco)
const COLOR_PIXEL = "#dff6fa"; // el mismo blanco con toque cian del disco
const RADIO_SEMILLA = 18;      // tamaño (px) de la espiral pequeña que aparece primero
const BRAZOS_SEMILLA = 2.5;    // vueltas de esa espiral
const SEMILLA = 0;             // la semilla del azar: 0, como el número de la carta

// ----- Elementos -----
const portal = document.querySelector(".portal");
const carta = portal.querySelector(".carta");
const lienzo = portal.querySelector(".portal__lienzo");
const ctx = lienzo.getContext("2d");
const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)");

// ----- Azar con semilla -----
// Math.random() da números distintos cada vez. Este generador (mulberry32)
// da SIEMPRE la misma serie para la misma semilla: la carta se forma igual cada vez.
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

// Curva de suavizado: arranca rápido y frena al final (como la de la carta en CSS)
const frenar = (x) => 1 - Math.pow(1 - x, 3);
const limitar = (x) => Math.min(1, Math.max(0, x));

// ----- Medidas -----
let ancho = 0;      // tamaño del lienzo en píxeles CSS
let alto = 0;
let centroX = 0;    // el centro de la carta (y del agujero) dentro del lienzo
let centroY = 0;
let radioMax = 0;   // distancia del centro a una esquina de la carta
let pixeles = [];

function medir() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  ancho = lienzo.clientWidth;
  alto = lienzo.clientHeight;
  lienzo.width = Math.round(ancho * dpr);
  lienzo.height = Math.round(alto * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const mitadW = carta.offsetWidth / 2;
  const mitadH = carta.offsetHeight / 2;
  centroX = ancho / 2;
  centroY = alto / 2;
  radioMax = Math.hypot(mitadW, mitadH);
  crearPixeles(mitadW, mitadH);
}

// ----- Cada píxel: dónde aterriza y cuándo sale -----
function crearPixeles(mitadW, mitadH) {
  const azar = crearAzar(SEMILLA);
  pixeles = [];

  for (let i = 0; i < NUM_PIXELES; i++) {
    let x, y;
    if (azar() < EN_BORDE) {
      // En el borde: elegimos un punto del contorno del rectángulo
      // (a veces el borde exterior y a veces la línea interior del marco)
      const hueco = azar() < 0.7 ? 0 : 8;
      const w = mitadW - hueco;
      const h = mitadH - hueco;
      const recorrido = azar() * (w + h) * 4; // un punto cualquiera del perímetro
      if (recorrido < w * 2) { x = -w + recorrido; y = -h; }
      else if (recorrido < w * 2 + h * 2) { x = w; y = -h + (recorrido - w * 2); }
      else if (recorrido < w * 4 + h * 2) { x = w - (recorrido - w * 2 - h * 2); y = h; }
      else { x = -w; y = h - (recorrido - w * 4 - h * 2); }
    } else {
      // Dentro: un punto al azar de la cara de la carta
      x = (azar() * 2 - 1) * (mitadW - 12);
      y = (azar() * 2 - 1) * (mitadH - 12);
    }

    // Guardamos el destino en coordenadas polares (distancia y ángulo desde el centro)
    const distancia = Math.hypot(x, y);
    pixeles.push({
      radio: distancia,
      angulo: Math.atan2(y, x),
      // Los de cerca del centro salen antes: la carta se forma de dentro hacia fuera
      salida: 0.12 + 0.38 * (distancia / radioMax) + azar() * 0.06,
      luz: 0.6 + azar() * 0.4,
    });
  }
}

// ----- Dibujar un momento de la formación (progreso de 0 a 1) -----
const VUELO = 0.42; // parte de la animación que dura el viaje de cada píxel
const VIDA = 0.14;  // después de aterrizar, lo que tarda en apagarse

function dibujar(progreso) {
  ctx.clearRect(0, 0, ancho, alto);
  const trazado = new Path2D();

  for (const p of pixeles) {
    const q = limitar((progreso - p.salida) / VUELO); // 0 = en el centro, 1 = aterrizado
    if (q <= 0) continue;
    const apagado = limitar((progreso - p.salida - VUELO) / VIDA);
    if (apagado >= 1) continue;

    // La espiral: el radio crece hasta su destino y el ángulo "se desenrolla"
    // (va hacia atrás, al revés que el disco del agujero negro)
    const e = frenar(q);
    const r = p.radio * e;
    const a = p.angulo + VUELTAS * Math.PI * 2 * (1 - e);
    const luz = p.luz * (1 - apagado); // al apagarse, el cuadradito se encoge
    ponerPixel(trazado, centroX + Math.cos(a) * r, centroY + Math.sin(a) * r, luz);
  }

  // La semilla: una espiral pequeña de píxeles que gira en el centro al principio
  // y se apaga cuando la carta ya se está formando
  const semilla = limitar(progreso / 0.12) * (1 - limitar((progreso - 0.35) / 0.25));
  if (semilla > 0) {
    const puntos = 36;
    for (let i = 0; i < puntos; i++) {
      const t = i / puntos;                            // 0 = centro, 1 = punta de la espiral
      const a = t * BRAZOS_SEMILLA * Math.PI * 2 + progreso * 9; // gira mientras crece
      const r = t * RADIO_SEMILLA * frenar(semilla);
      ponerPixel(trazado, centroX + Math.cos(a) * r, centroY + Math.sin(a) * r, semilla * (1 - t * 0.5));
    }
  }

  ctx.fillStyle = COLOR_PIXEL;
  ctx.fill(trazado);

  // La carta de verdad aparece poco a poco (se funde) mientras los píxeles aterrizan
  const revelado = frenar(limitar((progreso - 0.3) / 0.5));
  carta.style.opacity = revelado >= 1 ? "" : revelado.toFixed(3);
}

// Igual que en el disco: cuadraditos encajados en una rejilla, más grandes cuanta más luz
function ponerPixel(trazado, x, y, luz) {
  if (luz < 0.1) return;
  const tam = Math.max(1, Math.round(REJILLA * Math.min(luz, 1)));
  const celdaX = Math.floor(x / REJILLA) * REJILLA;
  const celdaY = Math.floor(y / REJILLA) * REJILLA;
  const hueco = (REJILLA - tam) / 2;
  trazado.rect(celdaX + hueco, celdaY + hueco, tam, tam);
}

// ----- Animación -----
let progreso = 0; // 0 = cerrada, 1 = formada
let objetivo = 0; // hacia dónde va
let anterior = 0;
let animando = false;

function animar(ahora) {
  const segundos = Math.min((ahora - anterior) / 1000, 0.05);
  anterior = ahora;

  // Abrir es lento y cerrar rápido: por eso cada sentido tiene su duración
  if (objetivo > progreso) progreso = Math.min(objetivo, progreso + segundos / DURACION_ABRIR);
  else progreso = Math.max(objetivo, progreso - segundos / DURACION_CERRAR);

  dibujar(progreso);

  if (progreso !== objetivo) {
    requestAnimationFrame(animar);
  } else {
    animando = false;
    if (progreso === 0) portal.classList.remove("portal--visible"); // ya volvió al agujero
  }
}

// Esta función la llama agujero-negro.js al hacer clic en el agujero
window.mostrarCarta = (abrir) => {
  if ((abrir ? 1 : 0) === objetivo) return; // ya iba hacia ahí: nada que hacer
  objetivo = abrir ? 1 : 0;
  portal.classList.toggle("portal--abierto", abrir); // el contenido aparece o se esconde (CSS)

  if (abrir) {
    portal.classList.add("portal--visible");
    if (progreso === 0) medir(); // medimos justo antes de empezar (la carta ya ocupa su sitio)
  }

  // Con "reducir movimiento": sin espiral, aparece o desaparece de golpe
  if (sinMovimiento.matches) {
    progreso = objetivo;
    ctx.clearRect(0, 0, ancho, alto);
    carta.style.opacity = "";
    if (!abrir) portal.classList.remove("portal--visible");
    return;
  }

  if (!animando) {
    animando = true;
    anterior = performance.now();
    requestAnimationFrame(animar);
  }
};

// Si cambia el tamaño de la ventana con la carta abierta, recolocamos los píxeles
window.addEventListener("resize", () => {
  if (progreso > 0) {
    medir();
    dibujar(progreso);
  }
});

})();
