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
const VELOCIDAD_SIN_AGUJERO = 0.0015; // giro automático si no hay agujero negro (radianes por fotograma)
const INCLINACION_MOVIL = 0.95;      // en pantallas estrechas la elipse es más redonda (si no, los planetas se amontonan)
const ESCALA_FONDO = 0.6;            // tamaño de los planetas de atrás (1 = igual que los de delante)
const BRILLO_FONDO = 0.35;           // brillo de los planetas de atrás (1 = normal, 0 = negro). Se oscurecen
                                     // en vez de volverse transparentes: así siempre tapan las estrellas del fondo
const SENSIBILIDAD_ARRASTRE = 0.005; // cuánto gira por cada píxel arrastrado
const SENSIBILIDAD_RUEDA = 0.00015;  // cuánto gira con la rueda del ratón
const FRICCION = 0.94;               // frenado tras soltar: 0.9 frena rápido, 0.99 casi no frena
const FRENAR = 0.05;                 // qué rápido se para al apuntar a un planeta (suave, para que no dé un tirón)
const ARRANCAR = 0.3;                // qué rápido vuelve a girar al dejar de apuntar o de arrastrar (casi al instante)
const DESPEJE_FRENTE = 0.5;          // hueco entre el agujero y el planeta de delante, en tamaños de planeta (0 = rozándolo)

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
let rotacion = Math.PI / 2;  // empieza con el primer planeta de la lista (Elden Ring) delante
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
let bajadaFrente = 0; // cuánto más abajo va la órbita por delante del agujero (en píxeles)

// Activamos el "modo órbita" del CSS (sin JS la lista se ve como cuadrícula)
orbita.classList.add("orbita--viva");

// ----- Tamaño de la órbita según la pantalla -----
// ----- El agujero, en el centro de la pantalla -----
// La órbita va debajo del título, así que su centro (el agujero) quedaba más abajo que el
// centro de la pantalla. Aquí la subimos con un margen negativo: la órbita crece hacia arriba
// (por detrás del título) hasta que su centro coincide con el centro de la pantalla.
// Cómo reacciona al margen depende del alto de la página (puede crecer, o solo desplazarse si
// manda su alto mínimo), así que probamos, medimos cuánto se movió y corregimos (hasta 3 veces,
// como quien ajusta un cuadro en la pared). Solo sube, nunca baja.
function centroDeLaOrbita() {
  const caja = orbita.getBoundingClientRect();
  return caja.top + window.scrollY + caja.height / 2; // medido desde arriba de la página
}

function centrarOrbita() {
  orbita.style.marginTop = ""; // volvemos al margen del CSS para medir desde cero
  const sobra = centroDeLaOrbita() - window.innerHeight / 2; // cuánto está por debajo del centro
  if (sobra <= 1) return;
  let margen = parseFloat(getComputedStyle(orbita).marginTop);
  let error = sobra;     // píxeles que aún le faltan por subir
  let respuesta = 1;     // cuánto sube el centro por cada píxel de margen (se mide al probar)
  for (let intento = 0; intento < 3 && error > 0.5; intento++) {
    const antes = centroDeLaOrbita();
    margen -= error / respuesta;
    orbita.style.marginTop = margen + "px";
    const movido = antes - centroDeLaOrbita();
    if (movido > 0) respuesta = movido / (error / respuesta);
    error = centroDeLaOrbita() - window.innerHeight / 2;
  }
}

function calcularRadios() {
  centrarOrbita(); // primero la colocamos: su alto cambia al subirla
  const ancho = orbita.clientWidth;
  const alto = orbita.clientHeight;
  const tamPlaneta = planetas[0].querySelector(".planeta__esfera").offsetWidth;
  const inclinacion = ancho < 700 ? INCLINACION_MOVIL : INCLINACION;

  // Dejamos margen para que los planetas no se salgan por los lados.
  // Los dibujos miden unas 2.1 veces el círculo (la mitad = 1.05): 1.1 deja un poco de aire
  const margen = tamPlaneta * 1.1;
  radioX = Math.min(ancho / 2 - margen, 560);
  // Al torcer la elipse, sus extremos suben y bajan: restamos ese extra al alto disponible
  const extraGiro = radioX * Math.abs(SIN_GIRO);
  radioY = Math.min(radioX * inclinacion, alto / 2 - tamPlaneta * 1.1 - extraGiro);

  // Por delante, la órbita baja un poco más para que los planetas no tapen el agujero.
  // El agujero mide --agujero-planetas planetas de diámetro (radio = la mitad) y su anillo de
  // píxeles llega a 1.11 radios:
  // queremos el borde de arriba del planeta DESPEJE_FRENTE planetas por debajo de ese anillo.
  // Sin pasarnos del alto disponible (dejando sitio al nombre del planeta)
  const planetasPorAgujero = parseFloat(getComputedStyle(orbita).getPropertyValue("--agujero-planetas")) || 1.7;
  const frenteDeseado = tamPlaneta * (planetasPorAgujero / 2) * 1.11 + tamPlaneta * (0.5 + DESPEJE_FRENTE);
  const frenteMaximo = alto / 2 - tamPlaneta * 1.1;
  bajadaFrente = Math.max(0, Math.min(frenteDeseado, frenteMaximo) - radioY);

  // Pasamos los radios al CSS (los usa agujero-negro.js para saber dónde están los planetas)
  orbita.style.setProperty("--radio-x", radioX + "px");
  orbita.style.setProperty("--radio-y", radioY + "px");
  orbita.style.setProperty("--bajada-frente", bajadaFrente + "px");
  orbita.style.setProperty("--giro", GIRO + "rad");
}

// ----- Velocidad de la órbita: la marca la gravedad del agujero -----
// El agujero negro es el centro de gravedad: lo que está cerca gira rápido y lo que está
// lejos, despacio (ley de Kepler). Los planetas giran a la velocidad que tendría un píxel
// del disco a su distancia (radioX), así se mueven como la parte de fuera del disco.
// Todos van a la misma distancia (la misma elipse), así que todos giran igual de rápido.
// Para cambiar la velocidad de todo el sistema a la vez: VELOCIDAD_DISCO en agujero-negro.js
function velocidadDeOrbita() {
  const velocidad = window.agujeroNegro ? window.agujeroNegro.velocidadA(radioX) : 0;
  return velocidad || VELOCIDAD_SIN_AGUJERO;
}

// ----- Colocar cada planeta en su sitio -----
function colocarPlanetas() {
  planetas.forEach((planeta, i) => {
    const angulo = rotacion + i * SEPARACION;

    // Posición en la elipse... (seno positivo = mitad de delante)
    const seno = Math.sin(angulo);
    const ex = Math.cos(angulo) * radioX;
    // ...y por delante bajamos un poco más. Con seno² la bajada es 0 en los lados y crece suave
    // hasta el frente: la órbita no hace "esquinas", solo se estira hacia abajo por delante
    const ey = seno * radioY + Math.max(0, seno) ** 2 * bajadaFrente;
    // ...y la torcemos con el mismo giro que el disco del agujero negro
    const x = ex * COS_GIRO - ey * SIN_GIRO;
    const y = ex * SIN_GIRO + ey * COS_GIRO;

    // Profundidad: 1 = delante (abajo en la elipse), -1 = detrás (arriba)
    const profundidad = seno;
    const cercania = (profundidad + 1) / 2; // lo mismo, pero de 0 a 1

    const escala = ESCALA_FONDO + (1 - ESCALA_FONDO) * cercania;
    planeta.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${escala})`;
    // Los de atrás, más oscuros (no transparentes: si no, se verían las estrellas a través)
    planeta.style.filter = `brightness(${(BRILLO_FONDO + (1 - BRILLO_FONDO) * cercania).toFixed(3)})`;
    // El logo tiene z-index 50: los de atrás quedan por debajo, los de delante por encima
    planeta.style.zIndex = Math.round(10 + cercania * 80);
  });
}

// ----- Bucle de animación (se repite en cada fotograma) -----
let tiempoAnterior = performance.now();
let rotacionColocada = null; // el giro con el que colocamos los planetas la última vez

function animar(ahora) {
  // "pasos" corrige la velocidad para que sea igual en pantallas de 60 Hz o 144 Hz
  const pasos = Math.min((ahora - tiempoAnterior) / 16.67, 3);
  tiempoAnterior = ahora;

  // Giro automático: se detiene suavemente si el ratón o el foco están sobre un planeta
  const pausado = ratonEncima || focoDentro || arrastrando || menosMovimiento.matches;
  const velocidadDeseada = pausado ? 0 : velocidadDeOrbita();
  // Para despacio, pero arranca enseguida: al soltar o dejar de apuntar, sigue girando ya
  const rapidez = pausado ? FRENAR : ARRANCAR;
  velocidadActual += (velocidadDeseada - velocidadActual) * Math.min(1, rapidez * pasos);

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

  // Casi parada: la dejamos quieta del todo (si no, se movería una millonésima cada fotograma)
  if (pausado && Math.abs(velocidadActual) < 1e-7) velocidadActual = 0;
  if (Math.abs(inercia) < 1e-7) inercia = 0;

  // Solo movemos los planetas si la órbita ha girado: quieta (por ejemplo, con el ratón
  // sobre un planeta mientras se forma su carta) el navegador no tiene nada que recalcular
  if (rotacion !== rotacionColocada) {
    colocarPlanetas();
    rotacionColocada = rotacion;
  }
  // Compartimos el giro con fondo-estrellas.js para que el cielo se mueva con la órbita
  window.rotacionOrbita = rotacion;
  requestAnimationFrame(animar);
}

// ----- Pausar al pasar el ratón por encima de un planeta -----
planetas.forEach((planeta) => {
  planeta.addEventListener("pointerenter", (evento) => {
    // Mientras se arrastra, los planetas pasan por debajo del ratón: eso no es "apuntar"
    if (evento.pointerType === "mouse" && !arrastrando) ratonEncima = true;
  });
  planeta.addEventListener("pointerleave", () => {
    ratonEncima = false;
  });
});

// ----- Teclado: al enfocar un planeta con Tab, lo traemos al frente -----
orbita.addEventListener("focusin", (evento) => {
  // Solo pausamos con el foco del TECLADO (:focus-visible). Al hacer clic con el ratón en un
  // planeta el navegador también le da el foco, y si pausáramos, la órbita se quedaría
  // parada hasta hacer clic en otra parte
  focoDentro = evento.target.matches(":focus-visible");
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
  // Si ha girado la órbita, al soltar sigue girando aunque el ratón haya quedado sobre un planeta
  if (distanciaArrastre > 5) ratonEncima = false;
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
window.addEventListener("resize", () => {
  calcularRadios();
  rotacionColocada = null; // con los radios nuevos hay que volver a colocarlos aunque no giren
});
calcularRadios();
colocarPlanetas();
// Cuando termina de cargar (fuentes e imágenes), el título puede cambiar de alto: recolocamos
window.addEventListener("load", () => {
  calcularRadios();
  rotacionColocada = null;
});
requestAnimationFrame(animar);
