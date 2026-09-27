// =========================================================
// FONDO DE ESTRELLAS DE PÍXELES
// Dibuja en un <canvas> que cubre toda la pantalla un cielo
// de estrellas hechas de píxeles que parpadean y giran.
//
// Mismo estilo "semitono" que el agujero negro: el cielo es una
// rejilla de celdas, y en cada celda se pinta un cuadradito que es
// más grande cuanta más luz tiene. No se usa transparencia.
//
// Idea clave 1 (paralaje): las estrellas están en varias CAPAS.
// Cuando la órbita gira, cada capa se desplaza a los lados, y las
// más cercanas se mueven más que las lejanas. Así hay profundidad.
//
// Idea clave 2 (formas que giran): cada estrella es una pequeña
// lista de píxeles alrededor de su centro. En cada fotograma giramos
// esos puntos (con seno y coseno) y los "encajamos" en la rejilla.
// Giran a saltos de 45°, como los destellos de los juegos retro.
//
// Idea clave 3 (el agujero se las traga): si una estrella entra en la
// zona de atracción, le pasamos sus píxeles a agujero-negro.js, que
// los hace caer al disco. En su lugar nace otra en un sitio al azar.
//
// Idea clave 4 (chocan con el título): si una estrella entra en una
// letra de "Anderswelt", le pedimos a titulo.js que la haga estallar
// en píxeles, y nace otra en su lugar (igual que con el agujero).
//
// Para gastar pocos recursos:
//  - La cantidad de estrellas depende del tamaño de la pantalla.
//  - Todos los píxeles del mismo color se pintan de una sola vez.
//  - Máximo 30 fotogramas por segundo.
//  - Con "reducir movimiento" se dibuja una sola vez, quieto.
// =========================================================

// Igual que agujero-negro.js: todo dentro de (() => { ... })()
// para que sus nombres no choquen con los de otros scripts.
(() => {

// ----- Ajustes (¡prueba a cambiarlos!) -----
const CELDA = 3; // tamaño de cada celda de la rejilla, en px (el agujero negro usa 3–4)

// Capas del cielo, de la más lejana a la más cercana:
//   densidad = estrellas por cada cuadro de 100×100 px de pantalla
//   radio    = tamaño de la estrella en celdas (0 = un píxel, 1 = cruz de 5, 2 = rombo de 13)
//   luz      = brillo máximo (de 0 a 1)
//   paralaje = cuántos píxeles se mueve la capa por cada radián que gira la órbita
const CAPAS = [
  { densidad: 1.2, radio: 0, luz: 0.8, paralaje: 15 },
  { densidad: 0.4, radio: 1, luz: 1, paralaje: 40 },
  { densidad: 0.08, radio: 2, luz: 1, paralaje: 80 },
];
const NUM_DESTELLOS = 4;        // estrellas grandes con forma de cruz
const LARGO_DESTELLO = 5;       // largo de los brazos de la cruz, en celdas
const PARPADEO = 0.6;           // cuánto parpadean: 0 = nada, 1 = llegan a apagarse
const VELOCIDAD_PARPADEO = 1.2; // más alto = parpadean más rápido
const VELOCIDAD_GIRO = 0.5;     // giro máximo de cada estrella sobre sí misma (radianes por segundo)
const PASO_GIRO = Math.PI / 4;  // giran a saltos de 45° (cambian de + a ×)
// Colores de las estrellas. Repetir un color hace que salga más a menudo.
// Paleta inspirada en Evangelion: morado, verde neón y rojo sobre el blanco frío.
const COLORES = ["#dff6fa", "#dff6fa", "#dff6fa", "#a56bff", "#a6f25b", "#ff5a4a"];
const RADIO_ATRACCION = 3.5;    // si una estrella se acerca a menos de esto (en radios del agujero), cae
const TIEMPO_NACER = 3;         // segundos que tarda en aparecer la estrella nueva que la reemplaza
const FPS = 30;

// ----- Elementos -----
const lienzo = document.querySelector(".fondo-estrellas");
const ctx = lienzo.getContext("2d");
const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)");

let ancho = 0;
let alto = 0;
let estrellas = [];

// Elige un elemento al azar de una lista
function alAzar(lista) {
  return lista[Math.floor(Math.random() * lista.length)];
}

// Número al azar entre -max y +max (para que unas giren a un lado y otras al otro)
function giroAlAzar(max) {
  return (Math.random() * 2 - 1) * max;
}

// ----- Formas de las estrellas -----
// Cada forma es una lista de píxeles { x, y, luz } medidos en celdas
// desde el centro. La luz baja cuanto más lejos está del centro.

// Rombo: todas las celdas a "radio" pasos o menos del centro
function formaRombo(radio) {
  const pixeles = [];
  for (let y = -radio; y <= radio; y++) {
    for (let x = -radio; x <= radio; x++) {
      const pasos = Math.abs(x) + Math.abs(y);
      // El 0.8 hace que los bordes no se apaguen del todo (más bajo = bordes más brillantes)
      if (pasos <= radio) pixeles.push({ x, y, luz: 1 - (pasos / (radio + 1)) * 0.8 });
    }
  }
  return pixeles;
}

// Cruz: cuatro brazos largos que se apagan hacia fuera, más un brillo en las diagonales
function formaCruz(largo) {
  const pixeles = [{ x: 0, y: 0, luz: 1 }];
  // Un punto cada media celda: así, al girar en diagonal, el brazo sigue sin huecos
  for (let i = 0.5; i <= largo; i += 0.5) {
    const luz = 1 - i / (largo + 1);
    pixeles.push({ x: i, y: 0, luz }, { x: -i, y: 0, luz }, { x: 0, y: i, luz }, { x: 0, y: -i, luz });
  }
  for (const [x, y] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    pixeles.push({ x, y, luz: 0.4 });
  }
  return pixeles;
}

// ----- Medir la pantalla y crear las estrellas -----
// Se repite al cambiar el tamaño de la ventana, para que siempre
// haya la misma densidad de estrellas (más en un monitor grande).
function preparar() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  ancho = window.innerWidth;
  alto = window.innerHeight;

  lienzo.width = Math.round(ancho * dpr);
  lienzo.height = Math.round(alto * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const cuadros = (ancho * alto) / (100 * 100); // cuántos cuadros de 100×100 caben

  estrellas = [];
  for (const capa of CAPAS) {
    const forma = formaRombo(capa.radio); // todas las de la capa comparten forma
    const cantidad = Math.round(cuadros * capa.densidad);
    for (let i = 0; i < cantidad; i++) {
      estrellas.push({
        x: Math.random() * ancho,
        y: Math.random() * alto,
        forma,
        paralaje: capa.paralaje,
        luz: capa.luz * (0.6 + Math.random() * 0.4), // no todas igual de brillantes
        color: alAzar(COLORES),
        fase: Math.random() * Math.PI * 2,           // en qué punto del parpadeo empieza
        ritmo: 0.5 + Math.random(),                  // cada una parpadea a su ritmo
        angulo: Math.random() * Math.PI * 2,         // cómo está girada al empezar
        giro: giroAlAzar(VELOCIDAD_GIRO),            // su velocidad de giro
        nacio: -Infinity,                            // "desde siempre": ya se ve entera
      });
    }
  }

  // Los destellos: cruces grandes en la capa más cercana, que giran más despacio
  const cruz = formaCruz(LARGO_DESTELLO);
  for (let i = 0; i < NUM_DESTELLOS; i++) {
    estrellas.push({
      x: Math.random() * ancho,
      y: Math.random() * alto,
      forma: cruz,
      paralaje: CAPAS[CAPAS.length - 1].paralaje,
      luz: 1,
      color: COLORES[0],
      fase: Math.random() * Math.PI * 2,
      ritmo: 0.3 + Math.random() * 0.4,
      angulo: Math.random() * Math.PI * 2,
      giro: giroAlAzar(VELOCIDAD_GIRO * 0.3),
      nacio: -Infinity,
    });
  }
}

// ----- Utilidades de dibujo -----

// Posición horizontal de una estrella según lo que ha girado la órbita.
// El "%" hace que, si se sale por un lado, vuelva a entrar por el otro.
function posicionX(estrella, rotacion) {
  const x = estrella.x + rotacion * estrella.paralaje;
  return ((x % ancho) + ancho) % ancho;
}

// Brillo en este instante: una onda (seno) que sube y baja
function parpadeo(estrella, tiempo) {
  const onda = 0.5 + 0.5 * Math.sin(tiempo * VELOCIDAD_PARPADEO * estrella.ritmo + estrella.fase);
  return 1 - PARPADEO * onda;
}

// Añade el cuadradito de una celda al trazado. Más luz = cuadradito más grande (semitono)
function ponerPixel(trazado, celdaX, celdaY, luz) {
  if (luz < 0.12) return; // muy oscuro: no se dibuja

  const tam = Math.max(1, Math.round(CELDA * Math.min(luz, 1)));
  const hueco = Math.floor((CELDA - tam) / 2); // lo centramos dentro de su celda
  trazado.rect(celdaX * CELDA + hueco, celdaY * CELDA + hueco, tam, tam);
}

// Redondeo simétrico: Math.round(0.5) da 1 pero Math.round(-0.5) da 0, y eso
// tuerce los brazos de un lado. Así, 0.5 → 1 y -0.5 → -1, y la estrella queda simétrica.
function redondear(valor) {
  return Math.sign(valor) * Math.round(Math.abs(valor));
}

// Calcula los píxeles de una estrella en este instante: [{ celdaX, celdaY, luz }]
function pixelesDeEstrella(e, tiempo, rotacion) {
  // Celda donde está el centro de la estrella
  const centroX = Math.round(posicionX(e, rotacion) / CELDA);
  const centroY = Math.round(e.y / CELDA);

  // El giro avanza a saltos de PASO_GIRO (+ → × → +). Con ángulos intermedios los
  // brazos pixelados forman ganchos (un "molinete"), y eso no queremos que aparezca.
  const angulo = Math.round((e.angulo + tiempo * e.giro) / PASO_GIRO) * PASO_GIRO;

  // El seno y el coseno se calculan UNA vez por estrella, no por píxel: así gasta poco
  const cos = Math.cos(angulo);
  const sin = Math.sin(angulo);
  // Las estrellas recién nacidas aparecen poco a poco (de 0 a 1 en TIEMPO_NACER segundos)
  const nacer = Math.min(1, (tiempo - e.nacio) / TIEMPO_NACER);
  const brillo = e.luz * parpadeo(e, tiempo) * nacer;

  return e.forma.map((p) => ({
    // Girar el punto alrededor del centro y redondearlo a la celda más cercana.
    // Al redondear, las formas "saltan" entre + y × en vez de girar suave: eso da el aire de píxel.
    celdaX: centroX + redondear(p.x * cos - p.y * sin),
    celdaY: centroY + redondear(p.x * sin + p.y * cos),
    luz: brillo * p.luz,
  }));
}

// ¿La estrella ACABA de entrar en la zona de atracción del agujero?
// Solo cuenta el momento de cruzar el borde: las que ya estaban dentro al cargar
// la página (o al nacer) no caen de golpe, primero tienen que salir.
function acabaDeEntrar(e, rotacion, agujero) {
  const distancia = Math.hypot(posicionX(e, rotacion) - agujero.x, e.y - agujero.y);
  const dentro = distancia < RADIO_ATRACCION * agujero.radio;
  const antes = e.dentro;
  e.dentro = dentro;
  return dentro && antes === false;
}

// La estrella cae en el agujero: le pasamos sus píxeles (en coordenadas de pantalla)
// y en su lugar nace otra en un sitio al azar, para que el cielo no se vacíe.
function caerEnElAgujero(e, pixeles, tiempo) {
  const visibles = pixeles
    .filter((p) => p.luz >= 0.12)
    .map((p) => ({ x: (p.celdaX + 0.5) * CELDA, y: (p.celdaY + 0.5) * CELDA, luz: p.luz }));
  if (visibles.length > 0) window.agujeroNegro.atrapar(visibles, e.color);

  e.x = Math.random() * ancho;
  e.y = Math.random() * alto;
  e.nacio = tiempo;
  e.dentro = undefined; // si nace dentro de la zona, no cae hasta que salga y vuelva a entrar
  e.enLetra = undefined; // lo mismo con las letras del título
}

// ¿La estrella ACABA de entrar en una letra del título? Igual que con el agujero:
// solo cuenta el momento de cruzar el borde (las que ya estaban dentro no estallan).
function acabaDeChocar(e, rotacion, titulo) {
  const dentro = titulo.hayLetra(posicionX(e, rotacion), e.y);
  const antes = e.enLetra;
  e.enLetra = dentro;
  return dentro && antes === false;
}

// La estrella choca con el título: estalla (lo dibuja titulo.js) y nace otra en otro sitio
function chocarConElTitulo(e, rotacion, titulo, tiempo) {
  // Fuerza según el tamaño: 1 píxel = chispazo, rombo grande o cruz = explosión entera
  const fuerza = Math.min(1, Math.max(0.15, e.forma.length / 13));
  titulo.explotar(posicionX(e, rotacion), e.y, e.color, fuerza);
  e.x = Math.random() * ancho;
  e.y = Math.random() * alto;
  e.nacio = tiempo;
  e.dentro = undefined;
  e.enLetra = undefined;
}

// ----- Dibujar un fotograma -----
function dibujar(tiempo) {
  // orbita.js comparte cuánto ha girado la órbita (si no existe, usamos 0)
  const rotacion = window.rotacionOrbita || 0;
  // agujero-negro.js comparte dónde está el agujero (en otras páginas no hay agujero)
  const agujero = window.agujeroNegro ? window.agujeroNegro.posicion() : null;
  // titulo.js comparte sus letras para los choques (solo existe en el inicio)
  const titulo = window.tituloAnderswelt || null;

  // Un trazado por color: juntamos ahí todos sus píxeles y los pintamos de golpe
  const trazados = new Map();
  for (const e of estrellas) {
    const pixeles = pixelesDeEstrella(e, tiempo, rotacion);

    if (agujero && acabaDeEntrar(e, rotacion, agujero)) {
      caerEnElAgujero(e, pixeles, tiempo);
      continue; // esta ya no se dibuja aquí: ahora la dibuja el agujero
    }

    if (titulo && acabaDeChocar(e, rotacion, titulo)) {
      chocarConElTitulo(e, rotacion, titulo, tiempo);
      continue; // ha estallado: este fotograma ya no se dibuja
    }

    if (!trazados.has(e.color)) trazados.set(e.color, new Path2D());
    const trazado = trazados.get(e.color);
    for (const p of pixeles) ponerPixel(trazado, p.celdaX, p.celdaY, p.luz);
  }

  ctx.clearRect(0, 0, ancho, alto);
  for (const [color, trazado] of trazados) {
    ctx.fillStyle = color;
    ctx.fill(trazado);
  }
}

// ----- Bucle de animación -----
let ultimoDibujo = 0;

function animar(ahora) {
  if (sinMovimiento.matches) return; // se para; arrancar() lo vuelve a poner en marcha
  requestAnimationFrame(animar);

  // Limitamos los fotogramas por segundo para gastar menos
  if (ahora - ultimoDibujo < 1000 / FPS - 1) return;
  ultimoDibujo = ahora;

  dibujar(ahora / 1000); // el tiempo en segundos
}

function arrancar() {
  if (sinMovimiento.matches) {
    dibujar(0); // movimiento reducido: un solo dibujo quieto
  } else {
    requestAnimationFrame(animar);
  }
}

// ----- Puesta en marcha -----
preparar();
arrancar();

// Si cambia el tamaño de la ventana, volvemos a crear las estrellas
window.addEventListener("resize", () => {
  preparar();
  dibujar(performance.now() / 1000);
});

// Si la persona activa o desactiva "reducir movimiento", lo respetamos al momento
sinMovimiento.addEventListener("change", arrancar);
})();
