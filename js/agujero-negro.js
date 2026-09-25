// =========================================================
// AGUJERO NEGRO DE PÍXELES
// Dibuja en un <canvas> el disco de materia que gira alrededor
// del agujero negro, con estilo "semitono": muchos cuadraditos
// en una rejilla, más grandes donde hay más luz.
//
// Idea clave (igual que en orbita.js): cada partícula está en
// un círculo; al aplastarlo en vertical parece un disco visto
// de lado. Las de arriba (detrás) se pintan antes que el
// agujero y las de abajo (delante) después, para taparlo.
//
// Para gastar pocos recursos:
// Además "se traga" las estrellas del fondo que pasan cerca:
// sus píxeles caen en espiral y se unen al disco (ver atrapar).
//
//  - ~7400 cuadraditos, todos del mismo color (se pintan de una vez).
//  - Máximo 30 fotogramas por segundo.
//  - Se pausa si el agujero no se ve en pantalla.
// =========================================================

// Todo va dentro de (() => { ... })() para que sus nombres (animar, ctx...)
// no choquen con los de orbita.js: cada script tiene su propio "espacio".
(() => {

// ----- Ajustes (¡prueba a cambiarlos!) -----
const NUM_PARTICULAS = 7400;   // píxeles del disco (si los haces más pequeños, pon más)
const TAMANO_PIXEL = 0.7;       // tamaño de los píxeles: 1 = grandes, 0.5 = la mitad
const ALCANCE_DISCO = 7;        // hasta dónde llega el disco (en "radios del agujero")
const VELOCIDAD_DISCO = 0.05;  // giro del disco (las de dentro giran más rápido)
const VELOCIDAD_NUBES = 0.012;  // giro de las nubes brillantes (todas a la vez, sin deformarse)
const VELOCIDAD_ANILLO = 0.03;  // giro del anillo de píxeles que enmarca el agujero
const PIXELES_ANILLO = 370;     // cuántos píxeles forman ese anillo
const COLOR_PIXEL = "#dff6fa";  // blanco con un toque de cian

// La L-dragón
const BALANCEO_GRADOS = 20;     // cuánto se balancea de lado a lado mientras duerme
const DURACION_BALANCEO = 7;    // segundos que tarda en ir y volver
const FPS = 30;                 // fotogramas por segundo

// Estrellas atrapadas (fondo-estrellas.js nos las manda cuando pasan cerca)
const DURACION_CAIDA = 2.5;     // segundos que tarda un píxel en llegar al disco
const CAIDA_AL_CENTRO = 0.003;  // cuánto se acerca al horizonte cada fotograma, ya dentro del disco
const COPIAS_POR_PIXEL = 2;     // cada píxel de la estrella se "estira" en varias partículas
const MAX_ATRAPADAS = 800;      // límite de partículas atrapadas a la vez (para no gastar de más)

// ----- Elementos -----
const agujero = document.querySelector(".agujero");
const orbita = agujero.closest(".orbita");
// Dos lienzos: el de atrás (debajo de la L) y el de delante (encima de la L)
const lienzo = agujero.querySelector(".agujero__lienzo");
const lienzoDelante = agujero.querySelector(".agujero__lienzo--delante");
const ctx = lienzo.getContext("2d");
const ctxDelante = lienzoDelante.getContext("2d");
const letra = agujero.querySelector(".letra3d__frente");
const zona = agujero.querySelector(".agujero__zona"); // la zona del ratón, encima del agujero
const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)");

// La inclinación y el giro del disco se leen del HTML (data-inclinacion y data-giro),
// los mismos que usa orbita.js: así el disco y los planetas están en el mismo plano
const INCLINACION_DISCO = parseFloat(orbita.dataset.inclinacion);
const GIRO_DISCO = parseFloat(orbita.dataset.giro);
const COS_GIRO = Math.cos(GIRO_DISCO);
const SIN_GIRO = Math.sin(GIRO_DISCO);
agujero.style.setProperty("--giro", GIRO_DISCO + "rad"); // la L del CSS se inclina igual

agujero.classList.add("agujero--vivo"); // quita el dibujo de respaldo del CSS

// ----- Medidas (se recalculan si cambia el tamaño) -----
let ancho = 0;       // tamaño del lienzo en píxeles CSS (el doble de ancho que de alto)
let alto = 0;
let centroX = 0;
let centroY = 0;
let radioAgujero = 0;
let rejilla = 3;     // tamaño de cada "celda" de píxel
let brillo = null;   // resplandor alrededor del agujero

function medir() {
  // Dibujamos a resolución normal (1x) aunque la pantalla sea "retina": como todo son
  // cuadraditos, el CSS los amplía sin suavizar (image-rendering: pixelated) y se ven nítidos
  // con 4 veces menos píxeles que calcular
  const dpr = 1;
  ancho = agujero.clientWidth;
  alto = agujero.clientHeight;
  centroX = ancho / 2;
  centroY = alto / 2;
  radioAgujero = alto * 0.12;
  rejilla = Math.max(2, Math.round((alto / 120) * TAMANO_PIXEL));

  for (const l of [lienzo, lienzoDelante]) {
    l.width = Math.round(ancho * dpr);
    l.height = Math.round(alto * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctxDelante.setTransform(dpr, 0, 0, dpr, 0, 0);

  brillo = ctx.createRadialGradient(centroX, centroY, radioAgujero, centroX, centroY, radioAgujero * 3);
  brillo.addColorStop(0, "rgba(150, 235, 255, 0.14)");
  brillo.addColorStop(1, "rgba(150, 235, 255, 0)");
}

// ----- Crear las partículas (una sola vez) -----
// Cada partícula guarda su distancia al centro (r, medida en "radios del agujero"),
// su ángulo y cuánta luz tiene (de 0 a 1).
const particulas = [];
for (let i = 0; i < NUM_PARTICULAS; i++) {
  // Math.random() ** 1.9 junta más partículas cerca del agujero,
  // pero algunas llegan lejos, hasta ALCANCE_DISCO
  const r = 1.35 + (ALCANCE_DISCO - 1.35) * Math.random() ** 1.9;
  const angulo = Math.random() * Math.PI * 2;
  // "distancia" va de 0 (junto al agujero) a 1 (el borde del disco)
  const distancia = (r - 1.35) / (ALCANCE_DISCO - 1.35);
  // Más luz cerca del centro (las "nubes" se calculan en cada fotograma, en dibujar)
  const luz = (1.25 - distancia * 0.95) * (0.6 + Math.random() * 0.5);
  particulas.push({ r, angulo, luz, velocidad: VELOCIDAD_DISCO * (1.35 / r) ** 1.5 });
}

// ----- El anillo que enmarca el agujero -----
// Píxeles pegados al borde del agujero que giran todos juntos (sin deformarse).
// Cada uno tiene su ángulo, su distancia (un poco dentro o fuera del borde) y su luz.
const anillo = [];
for (let i = 0; i < PIXELES_ANILLO; i++) {
  anillo.push({
    angulo: Math.random() * Math.PI * 2,
    r: 0.97 + Math.random() ** 2 * 0.14, // la mayoría justo en el borde
    luz: 0.45 + Math.random() * 0.65,
  });
}
let giroAnillo = 0;

// Las nubes brillantes giran todas juntas, como un bloque: así su forma no se deforma.
// Los píxeles giran a distintas velocidades y simplemente "atraviesan" las nubes.
let giroNubes = 0;

// ----- Estrellas atrapadas -----
// fondo-estrellas.js nos manda los píxeles de una estrella que pasó demasiado cerca.
// Cada píxel cae hasta una órbita del disco, gira con los demás un rato y,
// poco a poco, se acerca al centro hasta cruzar el horizonte (y desaparece).
const atrapadas = [];

// Recibe los píxeles de una estrella: [{ x, y, luz }] en coordenadas de la pantalla
function atrapar(pixeles, color) {
  const caja = lienzo.getBoundingClientRect(); // dónde está el lienzo en la pantalla

  // Distancia al centro (en radios del agujero) de cada píxel, y la del más cercano
  const distancias = pixeles.map((p) =>
    Math.hypot(p.x - caja.left - centroX, p.y - caja.top - centroY) / radioAgujero
  );
  const masCerca = Math.min(...distancias);

  pixeles.forEach((p, i) => {
    for (let copia = 0; copia < COPIAS_POR_PIXEL; copia++) {
      if (atrapadas.length >= MAX_ATRAPADAS) return;

      // Posición dentro del lienzo, con un poco de desorden para que la estrella se "deshilache"
      const x = p.x - caja.left + (Math.random() - 0.5) * rejilla * 2;
      const y = p.y - caja.top + (Math.random() - 0.5) * rejilla * 2;

      // ¿En qué ángulo del disco está? Deshacemos el giro y el aplastado del disco
      const dx = x - centroX;
      const dy = y - centroY;
      const lx = dx * COS_GIRO + dy * SIN_GIRO;
      const ly = (-dx * SIN_GIRO + dy * COS_GIRO) / INCLINACION_DISCO;

      atrapadas.push({
        inicioX: x,
        inicioY: y,
        angulo: Math.atan2(ly, lx),
        r: 1.4 + Math.random() * 1.6, // la órbita del disco a la que va a parar
        // avance: 0 = en su sitio, 1 = ya en el disco. Si empieza en negativo, espera un poco.
        // Los píxeles más lejanos esperan más: así la estrella se estira como un hilo.
        avance: -((distancias[i] - masCerca) * 0.6 + Math.random() * 0.15),
        luz: p.luz,
        color,
      });
    }
  });
}

// Mueve las partículas atrapadas (se llama en cada fotograma desde animar)
function moverAtrapadas(pasos) {
  // Recorremos la lista al revés para poder borrar sin saltarnos ninguna
  for (let i = atrapadas.length - 1; i >= 0; i--) {
    const a = atrapadas[i];
    // Gira como el disco: más rápido cuanto más cerca del centro
    a.angulo += VELOCIDAD_DISCO * (1.35 / a.r) ** 1.5 * pasos;

    if (a.avance < 1) {
      a.avance = Math.min(1, a.avance + pasos / (60 * DURACION_CAIDA));
    } else {
      a.r -= CAIDA_AL_CENTRO * pasos;        // ya en el disco: se acerca al horizonte
      if (a.r < 1) atrapadas.splice(i, 1);   // cruzó el horizonte: desaparece
    }
  }
}

// Busca (o crea) el trazado de un color dentro de un Map
function trazadoDe(mapa, color) {
  if (!mapa.has(color)) mapa.set(color, new Path2D());
  return mapa.get(color);
}

// Pinta los trazados de un Map, cada uno con su color (por defecto, en el lienzo de atrás)
function pintarColores(mapa, contexto = ctx) {
  for (const [color, trazado] of mapa) {
    contexto.fillStyle = color;
    contexto.fill(trazado);
  }
}

// ----- El dragón despierta -----
// Al pasar el ratón (o tocar, o llegar con Tab) el dragón deja de balancearse, te mira
// y se le enciende el ojo.
let despertar = 0; // 0 = dormido, 1 = despierto. Cambia poco a poco, nunca de golpe
let tiempo = 0;    // segundos de animación (para el balanceo)

function estaDespierto() {
  return zona.matches(":hover") || zona.matches(":focus-visible") || agujero.classList.contains("agujero--abierto");
}

// Pasa al CSS cómo debe estar la L. Al despertar, el balanceo se apaga: (1 - despertar)
function moverLetra() {
  const balanceo = Math.sin((tiempo / DURACION_BALANCEO) * Math.PI * 2) * BALANCEO_GRADOS * (1 - despertar);
  agujero.style.setProperty("--balanceo", balanceo.toFixed(2) + "deg");
  agujero.style.setProperty("--despertar", despertar.toFixed(3));
}

// ----- Dibujar un fotograma -----
function dibujar() {
  const coseno = COS_GIRO;
  const seno = SIN_GIRO;

  // Guardamos los cuadraditos en tres "trazados" para pintarlos de golpe
  const detras = new Path2D();
  const halo = new Path2D();
  const delante = new Path2D();

  for (const p of particulas) {
    const cos = Math.cos(p.angulo);
    const sin = Math.sin(p.angulo);

    // ¿Está el píxel dentro de una nube? Se mide con el ángulo relativo a las nubes
    const nubes = 0.55 + 0.45 * Math.sin((p.angulo - giroNubes) * 3 + p.r * 3);

    // Efecto Doppler: el lado que viene hacia nosotros (izquierda) brilla más
    const luz = Math.min(1, p.luz * nubes) * (1 - 0.35 * cos);

    // 1) El disco aplastado y torcido
    const lx = cos * p.r;
    const ly = sin * p.r * INCLINACION_DISCO;
    const x = centroX + (lx * coseno - ly * seno) * radioAgujero;
    const y = centroY + (lx * seno + ly * coseno) * radioAgujero;
    ponerPixel(sin < 0 ? detras : delante, x, y, luz);

    // 2) El "halo": la gravedad dobla la luz de la parte de dentro del disco
    //    y la vemos como un anillo alrededor del agujero (lo que se ve en Interstellar)
    if (p.r < 2.2) {
      const rh = (1.06 + (p.r - 1.35) * 0.70) * radioAgujero;
      ponerPixel(halo, centroX + cos * rh, centroY + sin * rh, luz);
    }
  }

  // 3) Las estrellas atrapadas: un trazado por color, detrás y delante del agujero
  const atrapadasDetras = new Map();
  const atrapadasDelante = new Map();
  for (const a of atrapadas) {
    const cos = Math.cos(a.angulo);
    const sin = Math.sin(a.angulo);

    // Su sitio en el disco (igual que las partículas normales)
    const lx = cos * a.r;
    const ly = sin * a.r * INCLINACION_DISCO;
    const discoX = centroX + (lx * coseno - ly * seno) * radioAgujero;
    const discoY = centroY + (lx * seno + ly * coseno) * radioAgujero;

    // Mezcla entre donde estaba la estrella y su sitio en el disco.
    // "t * t" empieza lento y acelera: cae cada vez más rápido, como con la gravedad.
    const t = Math.max(0, a.avance);
    const caida = t * t;
    const x = a.inicioX + (discoX - a.inicioX) * caida;
    const y = a.inicioY + (discoY - a.inicioY) * caida;

    // Se calienta al caer (brilla más) y se apaga justo antes de cruzar el horizonte
    const luz = (a.luz + (1 - a.luz) * caida) * Math.min(1, (a.r - 1) / 0.3);

    // Mientras cae viene "de detrás"; ya en el disco, depende de su lado
    const mapa = t < 1 || sin < 0 ? atrapadasDetras : atrapadasDelante;
    ponerPixel(trazadoDe(mapa, a.color), x, y, luz);
  }

  ctx.clearRect(0, 0, ancho, alto);

  // Resplandor suave
  ctx.fillStyle = brillo;
  ctx.fillRect(0, 0, ancho, alto);

  pintar(detras);
  pintarColores(atrapadasDetras);
  pintar(halo);

  // El agujero: un círculo negro, sin borde dibujado
  ctx.beginPath();
  ctx.arc(centroX, centroY, radioAgujero, 0, Math.PI * 2);
  ctx.fillStyle = "#000";
  ctx.fill();

  // Su marco: el anillo de píxeles (la "esfera de fotones"), encima del borde negro
  const marco = new Path2D();
  for (const p of anillo) {
    const a = p.angulo + giroAnillo;
    // Tres zonas más brillantes que dan vueltas: así se nota que el anillo gira
    // (al despertar el dragón, el anillo brilla más)
    const luz = p.luz * (0.6 + 0.4 * Math.sin(a * 3 - giroAnillo * 2)) * (1 + despertar * 0.6);
    ponerPixel(marco, centroX + Math.cos(a) * p.r * radioAgujero, centroY + Math.sin(a) * p.r * radioAgujero, luz);
  }
  pintar(marco);

  // La mitad de delante va en el lienzo que está encima de la L
  ctxDelante.clearRect(0, 0, ancho, alto);
  pintar(delante, ctxDelante);
  pintarColores(atrapadasDelante, ctxDelante);
}

// Añade un cuadradito al trazado, "encajado" en la rejilla (esto da el aspecto de píxeles)
function ponerPixel(trazado, x, y, luz) {
  if (luz < 0.12) return; // muy oscuro: no se dibuja

  const tam = Math.max(1, Math.round(rejilla * Math.min(luz, 1)));
  const celdaX = Math.floor(x / rejilla) * rejilla;
  const celdaY = Math.floor(y / rejilla) * rejilla;
  const hueco = (rejilla - tam) / 2;
  trazado.rect(celdaX + hueco, celdaY + hueco, tam, tam);
}

// Pinta todos los cuadraditos de un trazado de una sola vez (por defecto, en el lienzo de atrás)
function pintar(trazado, contexto = ctx) {
  contexto.fillStyle = COLOR_PIXEL;
  contexto.fill(trazado);
}

// ----- Bucle de animación -----
let enPantalla = true;
let ultimoDibujo = 0;
let tiempoAnterior = performance.now();
let bucleActivo = false;

function animar(ahora) {
  if (!enPantalla || sinMovimiento.matches) {
    bucleActivo = false;
    return; // se para del todo; se reanuda con arrancar()
  }
  requestAnimationFrame(animar);

  // Limitamos los fotogramas por segundo para gastar menos
  if (ahora - ultimoDibujo < 1000 / FPS - 1) return;
  ultimoDibujo = ahora;

  // "pasos" = cuántos fotogramas de 60 Hz han pasado (igual que en orbita.js)
  const pasos = Math.min((ahora - tiempoAnterior) / 16.67, 4);
  tiempoAnterior = ahora;

  for (const p of particulas) p.angulo += p.velocidad * pasos;
  giroNubes += VELOCIDAD_NUBES * pasos;
  giroAnillo += VELOCIDAD_ANILLO * pasos;
  moverAtrapadas(pasos);

  tiempo += pasos / 60;
  despertar += ((estaDespierto() ? 1 : 0) - despertar) * Math.min(1, 0.12 * pasos);
  moverLetra();

  dibujar();
}

function arrancar() {
  if (sinMovimiento.matches) {
    dibujar(); // movimiento reducido: un solo dibujo quieto
    letra.pauseAnimations(); // detiene el degradado de la L
    return;
  }
  letra.unpauseAnimations();
  if (!bucleActivo && enPantalla) {
    bucleActivo = true;
    tiempoAnterior = performance.now();
    requestAnimationFrame(animar);
  }
}

// ----- Lo que el agujero comparte con otros scripts (lo usa fondo-estrellas.js) -----
window.agujeroNegro = {
  // Centro y radio del agujero en la pantalla, en este momento
  posicion() {
    const caja = lienzo.getBoundingClientRect();
    return { x: caja.left + centroX, y: caja.top + centroY, radio: radioAgujero };
  },
  atrapar,
};

// ----- Puesta en marcha -----
medir();
dibujar();
arrancar();

// Si cambia el tamaño de la ventana, recalculamos y redibujamos
new ResizeObserver(() => {
  medir();
  dibujar();
}).observe(agujero);

// Si el agujero sale de la pantalla (al bajar), pausamos la animación
new IntersectionObserver(([entrada]) => {
  enPantalla = entrada.isIntersecting;
  arrancar();
}).observe(agujero);

// Si la persona activa o desactiva "reducir movimiento", lo respetamos al momento
sinMovimiento.addEventListener("change", arrancar);

// ----- Presentación: la carta aparece al apuntar al agujero -----
// Con ratón: basta con apuntar; al quitar el ratón vuelve al agujero.
// En móvil no se puede "apuntar", así que un toque la saca y otro la guarda.
// Con teclado: Enter la saca y Escape la guarda.
const ESPERA_APUNTAR = 150; // milisegundos apuntando antes de sacarla (así no salta al pasar de largo)
let xPulsado = 0;
let punteroPulsado = "";
let esperaApuntar = null;

function mostrarPresentacion(abrir) {
  agujero.classList.toggle("agujero--abierto", abrir);
  zona.setAttribute("aria-expanded", abrir); // avisa a los lectores de pantalla
  window.mostrarCarta?.(abrir); // la carta se forma o vuelve al agujero (js/carta.js)
}

// ¿Está el punto (x, y) dentro del círculo de la zona? Lo medimos con geometría
// porque cuando un planeta pasa por delante, el navegador cree que el ratón "salió"
function dentroDeLaZona(x, y) {
  const caja = zona.getBoundingClientRect();
  const radio = caja.width / 2;
  return Math.hypot(x - (caja.left + radio), y - (caja.top + radio)) <= radio;
}

// Apuntar con el ratón: la saca (tras una pequeña espera)
zona.addEventListener("pointerenter", (evento) => {
  if (evento.pointerType !== "mouse") return;
  clearTimeout(esperaApuntar);
  esperaApuntar = setTimeout(() => mostrarPresentacion(true), ESPERA_APUNTAR);
});

// Dejar de apuntar: la guarda (solo si el ratón salió de verdad del círculo)
window.addEventListener("pointermove", (evento) => {
  if (evento.pointerType !== "mouse" || dentroDeLaZona(evento.clientX, evento.clientY)) return;
  clearTimeout(esperaApuntar);
  if (agujero.classList.contains("agujero--abierto")) mostrarPresentacion(false);
});

zona.addEventListener("pointerdown", (evento) => {
  xPulsado = evento.clientX;
  punteroPulsado = evento.pointerType;
});

zona.addEventListener("click", (evento) => {
  const delTeclado = evento.detail === 0; // evento.detail es 0 cuando el clic viene del teclado
  if (!delTeclado) {
    // Con ratón ya se encarga "apuntar": el clic no hace nada
    if (punteroPulsado === "mouse") return;
    // Si la persona estaba arrastrando la órbita, no es un toque: no hacemos nada
    if (Math.abs(evento.clientX - xPulsado) > 5) return;
  }
  mostrarPresentacion(!agujero.classList.contains("agujero--abierto"));
});

// Se cierra al tocar fuera o al pulsar Escape
document.addEventListener("click", (evento) => {
  if (!zona.contains(evento.target)) mostrarPresentacion(false);
});
document.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape") mostrarPresentacion(false);
});

// Con "reducir movimiento" no hay bucle de animación: despertamos al dragón al momento
function despertarSinAnimacion() {
  if (!sinMovimiento.matches) return;
  despertar = estaDespierto() ? 1 : 0;
  moverLetra();
}
for (const tipo of ["pointerenter", "pointerleave", "focus", "blur"]) {
  zona.addEventListener(tipo, despertarSinAnimacion);
}
document.addEventListener("click", despertarSinAnimacion);
moverLetra();
})();
