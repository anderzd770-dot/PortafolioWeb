// =========================================================
// ÓRBITA DE MUNDOS
// Hace girar los planetas (mundos) alrededor del logo central.
//
// Idea clave: cada planeta está en un ángulo de un círculo.
// Si aplastamos ese círculo en vertical (una elipse) y hacemos
// más pequeños y oscuros los planetas que quedan "detrás",
// parece 3D sin usar ninguna librería.
// =========================================================

// ----- Ajustes (¡prueba a cambiarlos!) -----
const VELOCIDAD = 0.0015;            // giro automático (radianes por fotograma)
const INCLINACION_MOVIL = 0.95;      // en pantallas estrechas la elipse es más redonda (si no, los planetas se amontonan)
const ESCALA_FONDO = 0.6;            // tamaño de los planetas de atrás (1 = igual que los de delante)
const OPACIDAD_FONDO = 0.35;         // opacidad de los planetas de atrás
const SENSIBILIDAD_ARRASTRE = 0.005; // cuánto gira por cada píxel arrastrado
const SENSIBILIDAD_RUEDA = 0.00015;  // cuánto gira con la rueda del ratón
const FRICCION = 0.94;               // frenado tras soltar: 0.9 frena rápido, 0.99 casi no frena

// ----- Elementos de la página -----
const orbita = document.querySelector(".orbita");
const planetas = Array.from(orbita.querySelectorAll(".planeta"));
const menosMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)");

// Inclinación y giro de la órbita: se leen del HTML (data-inclinacion y data-giro).
// Son los mismos que usa el disco del agujero negro, así todo gira en el mismo plano.
const INCLINACION = parseFloat(orbita.dataset.inclinacion);
const GIRO = parseFloat(orbita.dataset.giro);
const COS_GIRO = Math.cos(GIRO);
const SIN_GIRO = Math.sin(GIRO);

// ----- Estado de la animación -----
const SEPARACION = (Math.PI * 2) / planetas.length; // ángulo entre planetas
let rotacion = Math.PI / 2;  // empieza con el primer planeta (Outer Wilds) delante
let velocidadActual = 0;     // giro automático, suavizado para que frene y arranque suave
let inercia = 0;             // giro extra después de arrastrar o usar la rueda
let rotacionObjetivo = null; // si tiene valor, la órbita gira hasta ahí (al usar Tab)
let ratonEncima = false;
let focoDentro = false;
let arrastrando = false;
let xAnterior = 0;
let distanciaArrastre = 0;
let radioX = 0;
let radioY = 0;

// Activamos el "modo órbita" del CSS (sin JS la lista se ve como cuadrícula)
orbita.classList.add("orbita--viva");

// ----- Tamaño de la órbita según la pantalla -----
function calcularRadios() {
  const ancho = orbita.clientWidth;
  const alto = orbita.clientHeight;
  const tamPlaneta = planetas[0].querySelector(".planeta__esfera").offsetWidth;
  const anchoNombre = planetas[0].querySelector(".planeta__nombre").offsetWidth;
  const inclinacion = ancho < 700 ? INCLINACION_MOVIL : INCLINACION;

  // Dejamos margen para que los planetas y sus nombres no se salgan por los lados
  const margen = Math.max(tamPlaneta * 0.8, anchoNombre * 0.45);
  radioX = Math.min(ancho / 2 - margen, 560);
  // Al torcer la elipse, sus extremos suben y bajan: restamos ese extra al alto disponible
  const extraGiro = radioX * Math.abs(SIN_GIRO);
  radioY = Math.min(radioX * inclinacion, alto / 2 - tamPlaneta * 1.1 - extraGiro);

  // Pasamos los radios al CSS para dibujar la línea de la órbita
  orbita.style.setProperty("--radio-x", radioX + "px");
  orbita.style.setProperty("--radio-y", radioY + "px");
  orbita.style.setProperty("--giro", GIRO + "rad");
}

// ----- Colocar cada planeta en su sitio -----
function colocarPlanetas() {
  planetas.forEach((planeta, i) => {
    const angulo = rotacion + i * SEPARACION;

    // Posición en la elipse...
    const ex = Math.cos(angulo) * radioX;
    const ey = Math.sin(angulo) * radioY;
    // ...y la torcemos con el mismo giro que el disco del agujero negro
    const x = ex * COS_GIRO - ey * SIN_GIRO;
    const y = ex * SIN_GIRO + ey * COS_GIRO;

    // Profundidad: 1 = delante (abajo en la elipse), -1 = detrás (arriba)
    const profundidad = Math.sin(angulo);
    const cercania = (profundidad + 1) / 2; // lo mismo, pero de 0 a 1

    const escala = ESCALA_FONDO + (1 - ESCALA_FONDO) * cercania;
    planeta.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${escala})`;
    planeta.style.opacity = OPACIDAD_FONDO + (1 - OPACIDAD_FONDO) * cercania;
    // El logo tiene z-index 50: los de atrás quedan por debajo, los de delante por encima
    planeta.style.zIndex = Math.round(10 + cercania * 80);
  });
}

// ----- Bucle de animación (se repite en cada fotograma) -----
let tiempoAnterior = performance.now();

function animar(ahora) {
  // "pasos" corrige la velocidad para que sea igual en pantallas de 60 Hz o 144 Hz
  const pasos = Math.min((ahora - tiempoAnterior) / 16.67, 3);
  tiempoAnterior = ahora;

  // Giro automático: se detiene suavemente si el ratón o el foco están sobre un planeta
  const pausado = ratonEncima || focoDentro || arrastrando || menosMovimiento.matches;
  const velocidadDeseada = pausado ? 0 : VELOCIDAD;
  velocidadActual += (velocidadDeseada - velocidadActual) * 0.05 * pasos;

  if (rotacionObjetivo !== null) {
    // Girar por el camino más corto hasta el planeta enfocado con el teclado
    const diferencia = Math.atan2(
      Math.sin(rotacionObjetivo - rotacion),
      Math.cos(rotacionObjetivo - rotacion)
    );
    rotacion += diferencia * (menosMovimiento.matches ? 1 : 0.1);
  } else if (arrastrando) {
    inercia *= 0.8; // si el dedo se queda quieto, la inercia se va perdiendo
  } else {
    rotacion += (velocidadActual + inercia) * pasos;
    inercia *= Math.pow(FRICCION, pasos);
  }

  colocarPlanetas();
  // Compartimos el giro con fondo-estrellas.js para que el cielo se mueva con la órbita
  window.rotacionOrbita = rotacion;
  requestAnimationFrame(animar);
}

// ----- Pausar al pasar el ratón por encima de un planeta -----
planetas.forEach((planeta) => {
  planeta.addEventListener("pointerenter", (evento) => {
    if (evento.pointerType === "mouse") ratonEncima = true;
  });
  planeta.addEventListener("pointerleave", () => {
    ratonEncima = false;
  });
});

// ----- Teclado: al enfocar un planeta con Tab, lo traemos al frente -----
orbita.addEventListener("focusin", (evento) => {
  focoDentro = true;
  const planeta = evento.target.closest(".planeta");
  if (planeta && evento.target.matches(":focus-visible")) {
    const i = planetas.indexOf(planeta);
    rotacionObjetivo = Math.PI / 2 - i * SEPARACION; // ángulo de "delante"
  }
});

orbita.addEventListener("focusout", () => {
  focoDentro = false;
  rotacionObjetivo = null;
});

// ----- Arrastrar para girar (ratón y dedo) -----
orbita.addEventListener("pointerdown", (evento) => {
  if (evento.button !== 0) return; // solo botón izquierdo
  arrastrando = true;
  xAnterior = evento.clientX;
  distanciaArrastre = 0;
  inercia = 0;
});

window.addEventListener("pointermove", (evento) => {
  if (!arrastrando) return;
  const dx = evento.clientX - xAnterior;
  xAnterior = evento.clientX;
  distanciaArrastre += Math.abs(dx);

  // Arrastrar a la derecha mueve hacia la derecha los planetas de delante
  rotacion -= dx * SENSIBILIDAD_ARRASTRE;
  inercia = -dx * SENSIBILIDAD_ARRASTRE;

  if (distanciaArrastre > 5) orbita.classList.add("orbita--arrastrando");
});

function soltar() {
  if (!arrastrando) return;
  arrastrando = false;
  orbita.classList.remove("orbita--arrastrando");
  if (menosMovimiento.matches) inercia = 0;
}

window.addEventListener("pointerup", soltar);
window.addEventListener("pointercancel", soltar);

// Si la persona arrastró, al soltar no queremos que se abra un enlace
orbita.addEventListener(
  "click",
  (evento) => {
    if (distanciaArrastre > 5) evento.preventDefault();
  },
  true
);

// Evita que el navegador intente "arrastrar" el enlace como si fuera un archivo
orbita.addEventListener("dragstart", (evento) => evento.preventDefault());

// ----- Rueda del ratón -----
orbita.addEventListener(
  "wheel",
  (evento) => {
    evento.preventDefault();
    // Algunos navegadores miden la rueda en líneas en vez de píxeles
    const factor = evento.deltaMode === 1 ? 33 : 1;
    const delta = (evento.deltaY + evento.deltaX) * factor;

    if (menosMovimiento.matches) {
      rotacion += delta * SENSIBILIDAD_RUEDA * 15; // sin inercia
    } else {
      inercia += delta * SENSIBILIDAD_RUEDA;
    }
  },
  { passive: false }
);

// ----- Arrancar -----
window.addEventListener("resize", calcularRadios);
calcularRadios();
colocarPlanetas();
requestAnimationFrame(animar);
