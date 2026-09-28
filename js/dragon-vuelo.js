// =========================================================
// DRAGÓN QUE VUELA
// Cuando la barra de viaje (js/barra-viaje.js) lo llama, un dragón sale por
// abajo a la izquierda y vuela ondulando hasta posarse bajo la placa.
// Al llegar avisa ("dragon-posado") y se desvanece: en su sitio queda el mismo
// dibujo quieto (una <img> dentro de la barra), así que no se nota el cambio.
//
// Avisos (eventos en document):
//   "dragon-llamar"   → recibe { destino: <img>, vuela }: vuela hasta esa imagen y pone vuela = true
//   "dragon-despedir" → se desvanece donde esté
//   "dragon-posado"   → lo envía él al llegar
//
// Idea clave: el dibujo se corta en tiras verticales (de la cola a la cabeza).
// La cabeza avanza por un camino con curvas y cada tira se coloca MÁS ATRÁS
// en ese mismo camino, girada según la curva. El cuerpo nunca cambia de largo:
// solo se desliza por el rastro de la cabeza. Las curvas se quedan "quietas en
// el aire" y el dragón pasa a través de ellas, como una serpiente o un dragón
// oriental (por eso no parece gelatina).
// El cuello se va endureciendo poco a poco hasta la cabeza, como una columna
// vertebral: se dobla suave y la melena no se deforma.
// =========================================================

// Todo va dentro de (() => { ... })() para que sus variables (ancho, alto...)
// no choquen con las de los otros archivos que usan los mismos nombres
(() => {

// ----- Ajustes (¡prueba a cambiarlos!) -----
// El tamaño se cambia en css/inicio.css (--alto-dragon-vuelo, en .orbita)
const DURACION_VUELO = 7;       // segundos que tarda en llegar a la placa
const TIRAS = 60;               // en cuántas tiras se corta el dibujo (más = curva más suave)

// Las curvas del camino (son las que hacen ondular el cuerpo)
const CURVA_ALTO = 0.2;         // altura de las curvas, en altos de dragón
const CURVA_LARGO = 1.3;        // largo de una curva, en largos de dragón (1.3 = el cuerpo dibuja casi una "S")
const CURVA_LENTA = 0.35;       // una segunda curva, larga y suave, para que el vuelo no se repita igual

// El cuello: desde aquí (0.5 = la mitad del dibujo) el cuerpo se va poniendo rígido poco a
// poco hasta la cabeza. Así se dobla suave, sin un "codo" entre el cuerpo y la cabeza
const CUELLO_EMPIEZA = 0.5;
const RIGIDEZ_CABEZA = 0.8;     // 1 = la cabeza no se dobla nada · 0 = se dobla como el resto del cuerpo

// En el dibujo, la columna del cuerpo va al 64 % del alto (arriba sobresale la melena).
// Las tiras giran alrededor de esa línea, no del centro de la imagen
const EJE = 0.64;

const FUNDIDO_ENTRADA = 0.3;    // segundos en aparecer
const FUNDIDO_SALIDA = 0.4;     // segundos en desvanecerse
const FUNDIDO_POSARSE = 0.15;   // al llegar se cruza con la imagen quieta (igual que su transición en css/barra-viaje.css)
const SOLAPE = 2;               // píxeles que cada tira se mete debajo de sus vecinas (tapa las rendijas en las curvas)

// ----- Elementos de la página -----
const lienzoDragon = document.querySelector(".dragon-vuelo");
const pincelDragon = lienzoDragon.getContext("2d");
const menosMovimientoDragon = window.matchMedia("(prefers-reduced-motion: reduce)");

// El dibujo se carga cuando la página ya se ve, para no retrasar la entrada
const dibujoDragon = new Image();
dibujoDragon.decoding = "async";
window.addEventListener("load", () => { dibujoDragon.src = "img/dragon-vuelo.webp"; }, { once: true });

// ----- Estado -----
let ancho = 0, alto = 0, dpr = 1;  // tamaño del lienzo en píxeles de pantalla
let altoDragon = 0, largoDragon = 0;
let dragonEscalado = null;          // el dibujo ya reducido a su tamaño final (más rápido y nítido)
let camino = [];                    // puntos del camino: { x, y, largo acumulado }
let fase = 0, faseLenta = 0;        // dónde empiezan las curvas (cambian en cada cruce)
let posicion = 0;                   // cuánto camino ha recorrido la cabeza (en píxeles)
let objetivo = null;                // la imagen quieta bajo la placa: allí se posa
let vuelo = 0;                      // 0 = sale, 1 = posado
let posado = false;
let opacidad = 0;
let activo = false;                 // ¿debe verse?
let corriendo = false;              // ¿está en marcha la animación?
let anterior = 0;

// ----- Tamaños -----
function medir() {
  const caja = lienzoDragon.getBoundingClientRect();
  dpr = Math.min(window.devicePixelRatio || 1, 2); // más de 2 no se nota y cuesta más
  ancho = caja.width;
  alto = caja.height;
  lienzoDragon.width = Math.round(ancho * dpr);
  lienzoDragon.height = Math.round(alto * dpr);

  altoDragon = parseFloat(getComputedStyle(lienzoDragon).getPropertyValue("--alto-dragon-vuelo")) || 58;
  largoDragon = altoDragon * dibujoDragon.naturalWidth / dibujoDragon.naturalHeight;

  // Reducimos el dibujo UNA vez aquí. Si lo reducimos en cada fotograma desde el grande,
  // el navegador trabaja más y los bordes salen "dentados"
  dragonEscalado = document.createElement("canvas");
  dragonEscalado.width = Math.round(largoDragon * dpr);
  dragonEscalado.height = Math.round(altoDragon * dpr);
  const pincel = dragonEscalado.getContext("2d");
  pincel.imageSmoothingQuality = "high";
  pincel.drawImage(dibujoDragon, 0, 0, dragonEscalado.width, dragonEscalado.height);
}

// ----- El camino -----
// Sale abajo a la izquierda (fuera de la pantalla) y acaba bajo la placa: la cabeza en el
// borde derecho de la imagen quieta. Las curvas se van aplanando y el último largo de
// dragón es RECTO, para que llegue tumbado como en el dibujo. Guardamos puntos cada 2 px
// con el largo recorrido hasta cada uno, para poder decir "dame el punto a X píxeles".
function construirCamino() {
  camino = [];
  const lienzo = lienzoDragon.getBoundingClientRect();
  const caja = objetivo.getBoundingClientRect();
  const cabezaX = caja.right - lienzo.left;
  const ejeFinal = caja.top - lienzo.top + EJE * altoDragon; // la columna del cuerpo a la altura de la imagen
  const colaX = cabezaX - largoDragon;                        // aquí empieza el tramo recto
  const inicio = -largoDragon - 20;
  const largoCurva = largoDragon * CURVA_LARGO;
  const altura = CURVA_ALTO * altoDragon;
  // La línea de salida: lo bastante alta para que ni la curva más baja toque el pie
  const ejeInicio = alto - (1 - EJE) * altoDragon - altura * (1 + CURVA_LENTA) - 3;
  let recorrido = 0;
  const anadir = (x, y) => {
    const previo = camino[camino.length - 1];
    if (previo) recorrido += Math.hypot(x - previo.x, y - previo.y);
    camino.push({ x, y, largo: recorrido });
  };
  for (let x = inicio; x < cabezaX; x += 2) {
    const avance = Math.min(1, (x - inicio) / Math.max(1, colaX - inicio)); // 0 al salir, 1 en el tramo recto
    const suave = avance * avance * (3 - 2 * avance); // arranca y llega sin tirones (smoothstep)
    const curvas = (1 - suave) * altura * (                                  // se aplanan al llegar
      Math.sin((x / largoCurva) * Math.PI * 2 + fase) +
      CURVA_LENTA * Math.sin((x / (largoCurva * 2.7)) * Math.PI * 2 + faseLenta));
    anadir(x, ejeInicio + (ejeFinal - ejeInicio) * suave + curvas);
  }
  anadir(cabezaX, ejeFinal); // el último punto, exacto
}

// Punto del camino a "distancia" píxeles del principio, y hacia dónde apunta la curva ahí
function puntoEn(distancia) {
  const total = camino[camino.length - 1].largo;
  distancia = Math.max(0, Math.min(total, distancia));
  // Búsqueda binaria: partimos la lista por la mitad hasta encontrar el tramo
  let bajo = 0, altoI = camino.length - 1;
  while (altoI - bajo > 1) {
    const medio = (bajo + altoI) >> 1;
    if (camino[medio].largo < distancia) bajo = medio; else altoI = medio;
  }
  const a = camino[bajo], b = camino[altoI];
  const t = (distancia - a.largo) / ((b.largo - a.largo) || 1);
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    angulo: Math.atan2(b.y - a.y, b.x - a.x),
  };
}

function nuevoVuelo() {
  fase = Math.random() * Math.PI * 2; // cada vuelo se curva distinto
  faseLenta = Math.random() * Math.PI * 2;
  construirCamino();
  vuelo = 0;
  posado = false;
  opacidad = 0;
  posicion = largoDragon; // la cabeza empieza donde el cuerpo entero cabe (aún fuera de la pantalla)
}

// Dónde va la cabeza según el vuelo (0 → 1): sin(vuelo · 90°) va a velocidad casi
// constante y frena suave al final, para posarse sin frenazo.
// Con vuelo = 1 todo el cuerpo está en el tramo recto, justo encima de la imagen quieta
function colocarCabeza() {
  const total = camino[camino.length - 1].largo;
  posicion = largoDragon + (total - largoDragon) * Math.sin(vuelo * Math.PI / 2);
}

// ----- Dibujar -----
function dibujar() {
  pincelDragon.setTransform(1, 0, 0, 1, 0, 0);
  pincelDragon.clearRect(0, 0, lienzoDragon.width, lienzoDragon.height);
  pincelDragon.globalAlpha = opacidad;

  const tiraPantalla = largoDragon / TIRAS;         // ancho de una tira en pantalla
  const tiraDibujo = dragonEscalado.width / TIRAS;  // ancho de una tira en el dibujo
  const solapeDibujo = SOLAPE * dpr;

  // Hacia dónde mira la cabeza: la dirección MEDIA del camino en toda la parte delantera
  // (sumamos flechas de largo 1 y miramos hacia dónde apunta la suma). Es una dirección
  // suave: no da tirones aunque el camino se curve
  let sumaX = 0, sumaY = 0;
  for (let k = 0; k <= 6; k++) {
    const a = puntoEn(posicion - largoDragon * (1 - CUELLO_EMPIEZA) * (k / 6)).angulo;
    sumaX += Math.cos(a);
    sumaY += Math.sin(a);
  }
  const anguloCabeza = Math.atan2(sumaY, sumaX);

  // El cuello se construye como una cadena: cada tira empieza donde acabó la anterior
  const primeraCuello = Math.round(TIRAS * CUELLO_EMPIEZA);
  const inicioCuello = puntoEn(posicion - largoDragon * (1 - CUELLO_EMPIEZA));
  let cadenaX = inicioCuello.x, cadenaY = inicioCuello.y;

  // De la cola (tira 0, izquierda del dibujo) a la cabeza: la cabeza queda encima
  for (let j = 0; j < TIRAS; j++) {
    const centro = (j + 0.5) * tiraPantalla; // centro de la tira, medido desde la punta de la cola
    const p = puntoEn(posicion - (largoDragon - centro)); // dónde estaría sobre el camino
    let x, y, angulo;
    if (j < primeraCuello) {
      // Cuerpo: sobre el camino, tantos píxeles por detrás de la cabeza como le toque
      x = p.x; y = p.y; angulo = p.angulo;
    } else {
      // Cuello y cabeza: el ángulo pasa poco a poco del camino al de la cabeza.
      // "suave" va de 0 (inicio del cuello) a 1 (punta de la cabeza) con forma de S
      // (smoothstep): empieza y termina sin cambios bruscos
      const t = (j + 0.5 - primeraCuello) / (TIRAS - primeraCuello);
      const suave = t * t * (3 - 2 * t);
      // Diferencia de ángulos entre -π y π (para no dar la vuelta larga)
      const diferencia = Math.atan2(Math.sin(anguloCabeza - p.angulo), Math.cos(anguloCabeza - p.angulo));
      angulo = p.angulo + diferencia * suave * RIGIDEZ_CABEZA;
      // Avanzamos media tira hasta el centro, dibujamos, y otra media hasta el final
      x = cadenaX + Math.cos(angulo) * tiraPantalla / 2;
      y = cadenaY + Math.sin(angulo) * tiraPantalla / 2;
      cadenaX = x + Math.cos(angulo) * tiraPantalla / 2;
      cadenaY = y + Math.sin(angulo) * tiraPantalla / 2;
    }
    const cos = Math.cos(angulo), sen = Math.sin(angulo);
    // Mover al centro de la tira y girar (todo multiplicado por dpr para la pantalla)
    pincelDragon.setTransform(cos * dpr, sen * dpr, -sen * dpr, cos * dpr, x * dpr, y * dpr);

    // Cada tira coge un poquito de sus vecinas (SOLAPE) para que no se vean rendijas al girar
    const origenX = Math.max(0, j * tiraDibujo - solapeDibujo);
    const origenFin = Math.min(dragonEscalado.width, (j + 1) * tiraDibujo + solapeDibujo);
    pincelDragon.drawImage(
      dragonEscalado,
      origenX, 0, origenFin - origenX, dragonEscalado.height,
      origenX / dpr - centro, -EJE * altoDragon, (origenFin - origenX) / dpr, altoDragon
    );
  }
}

// ----- La animación -----
function fotograma(ahora) {
  // Segundos desde el fotograma anterior: nunca negativo (el primero puede llegar con una hora
  // un pelín anterior al clic) y como mucho 0.05 (si la pestaña se durmió, no da un salto)
  const dt = Math.min(Math.max((ahora - anterior) / 1000, 0), 0.05);
  anterior = ahora;

  // Avanza el vuelo. Al llegar avisa a la barra (solo si nadie lo ha despedido por el camino)
  if (!posado) {
    vuelo = Math.min(1, vuelo + dt / DURACION_VUELO);
    colocarCabeza();
    if (vuelo === 1) {
      posado = true;
      if (activo) {
        activo = false; // se desvanece rápido mientras aparece la imagen quieta
        document.dispatchEvent(new CustomEvent("dragon-posado"));
      }
    }
  }

  // La opacidad va hacia 1 mientras vuela y hacia 0 al posarse o si lo despiden
  if (activo) opacidad = Math.min(1, opacidad + dt / FUNDIDO_ENTRADA);
  else opacidad = Math.max(0, opacidad - dt / (posado ? FUNDIDO_POSARSE : FUNDIDO_SALIDA));

  dibujar();

  if (activo || opacidad > 0) requestAnimationFrame(fotograma);
  else corriendo = false; // invisible: paramos del todo (cero trabajo en reposo)
}

// ----- Los avisos de la barra de viaje -----
document.addEventListener("dragon-llamar", (evento) => {
  if (menosMovimientoDragon.matches) return;                        // sin vuelo: la barra se activa sola
  if (!dibujoDragon.complete || !dibujoDragon.naturalWidth) return; // aún no ha cargado
  evento.detail.vuela = true;
  objetivo = evento.detail.destino;
  if (!dragonEscalado) medir();
  nuevoVuelo(); // siempre desde la izquierda: la barra solo llama cuando hace falta un dragón nuevo
  activo = true;
  if (!corriendo) {
    corriendo = true;
    anterior = performance.now();
    requestAnimationFrame(fotograma);
  }
});

document.addEventListener("dragon-despedir", () => { activo = false; });

window.addEventListener("resize", () => {
  if (!dragonEscalado || !objetivo) return;
  medir();
  construirCamino(); // "vuelo" va de 0 a 1: sigue por el mismo punto del camino nuevo
  colocarCabeza();
});

})();
