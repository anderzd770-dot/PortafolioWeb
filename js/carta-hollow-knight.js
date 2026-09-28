// =========================================================
// LA CARTA DE HOLLOW KNIGHT: SOMBRAS QUE SALEN DEL VACÍO
// Al apuntar al planeta de Hollow Knight, su carta aparece en el
// mismo sitio que las otras cartas. Se forma como las demás: algo sale
// del centro y va creando la carta por partes. Aquí son sombras.
//
// Pasos (según "progreso", de 0 = cerrada a 1 = formada):
//   1. En el centro aparece un núcleo de vacío (una bola negra).
//   2. Del núcleo brotan tentáculos de sombra que ondulan, cada uno
//      hacia una zona distinta de la carta (repartidos en cuadrícula).
//   3. Donde llega cada tentáculo se abre una mancha de tinta con el borde
//      ondulado: el borde es negro y por dentro ya se ve el dibujo de la carta.
//      Las manchas crecen hasta juntarse y completan la carta.
//   4. Al abrirse cada mancha suben unas motas de alma (puntos blancos).
//   5. Los tentáculos se recogen hacia el centro y el núcleo desaparece.
// Al cerrar pasa lo mismo al revés.
//
// Idea clave del estilo: todas las sombras (núcleo, tentáculos y manchas) son negro
// puro y sin borde: al tocarse se funden en una sola sombra, como tinta líquida.
// =========================================================

(() => {

// ----- Ajustes (¡prueba a cambiarlos!) -----
const DURACION_ABRIR = 1.4;    // segundos que tarda en formarse
const DURACION_CERRAR = 0.6;   // segundos que tarda en deshacerse
const SOMBRAS = 12;            // tentáculos de sombra (cada uno crea una parte de la carta)
const GROSOR = 0.075;          // grosor de un tentáculo en su raíz (fracción del ancho de la carta)
const ONDULAR = 0.09;          // cuánto ondulan los tentáculos (fracción del ancho de la carta)
const MANCHA = 0.5;            // lo que tarda cada mancha en crecer (fracción de la animación)
const ONDAS = 5;               // "lóbulos" del borde de cada mancha
const BORDE = 0.05;            // grosor del borde negro de las manchas (fracción del ancho de la carta)
const MOTAS = 3;               // motas de alma que suben de cada mancha
const COLOR_SOMBRA = "#000";
const COLOR_ALMA = "#e8e6f0";
const COLOR_NIEBLA = "232, 230, 240"; // color de la neblina de detrás (rojo, verde, azul)
const NIEBLA = 0.16;           // luz pálida detrás de las sombras para que se vean sobre el fondo oscuro (0 = nada)
const ESPERA_APUNTAR = 150;    // milisegundos apuntando antes de sacarla (como las otras cartas)
const SEMILLA = 7;             // cámbiala y las sombras salen hacia otros sitios

// ----- Elementos -----
const planeta = document.querySelector(".planeta--hollow-knight");
const boton = planeta?.querySelector(".planeta__enlace");
const portal = document.querySelector(".portal--hk");
if (!boton || !portal) return;
const carta = portal.querySelector(".carta");
const cara = carta.querySelector(".carta__cara");
const lienzo = portal.querySelector(".portal__lienzo");
const ctx = lienzo.getContext("2d");
// Un segundo lienzo invisible donde se preparan las manchas antes de pasarlas al de verdad
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

const frenar = (x) => 1 - Math.pow(1 - x, 3);            // rápido al principio, suave al final
const suave = (x) => x * x * (3 - 2 * x);                // suave al principio y al final
const limitar = (x) => Math.min(1, Math.max(0, x));
const tramo = (p, desde, hasta) => limitar((p - desde) / (hasta - desde)); // 0 → 1 entre dos momentos

// ----- Medidas -----
let dpr = 1;
let ancho = 0;
let alto = 0;
let cx = 0;          // centro de la carta dentro del lienzo
let cy = 0;
let cartaX = 0;
let cartaY = 0;
let cartaW = 0;
let cartaH = 0;
let sombras = [];

function medir() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
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
  cartaX = cx - cartaW / 2;
  cartaY = cy - cartaH / 2;
  crearSombras();
}

function crearSombras() {
  const azar = crearAzar(SEMILLA);

  // Dónde llega cada sombra: la carta se divide en casillas y en cada una cae una,
  // movida un poco al azar. Así las manchas cubren TODA la carta, esquinas incluidas.
  const columnas = Math.max(2, Math.round(Math.sqrt((SOMBRAS * cartaW) / cartaH)));
  const filas = Math.ceil(SOMBRAS / columnas);
  const casillaW = cartaW / columnas;
  const casillaH = cartaH / filas;

  sombras = [];
  for (let i = 0; i < columnas * filas; i++) {
    const col = i % columnas;
    const fila = Math.floor(i / columnas);
    const tx = (col + 0.5 + (azar() - 0.5) * 0.4) * casillaW - cartaW / 2;
    const ty = (fila + 0.5 + (azar() - 0.5) * 0.4) * casillaH - cartaH / 2;
    // Lo lejos que está del centro: 0 en el centro, 1 en las esquinas
    const lejos = Math.min(1, Math.hypot(tx / (cartaW / 2), ty / (cartaH / 2)) / Math.SQRT2);
    const nace = 0.06 + azar() * 0.12;
    const llega = nace + 0.16 + lejos * 0.16;   // las que van más lejos tardan más

    const motas = [];
    for (let m = 0; m < MOTAS; m++) {
      motas.push({
        dx: (azar() - 0.5) * casillaW * 0.8,
        dy: (azar() - 0.5) * casillaH * 0.5,
        sube: casillaH * (0.3 + azar() * 0.4),
        tam: 0.8 + azar() * 1.1,
        retraso: azar() * 0.08,
      });
    }

    sombras.push({
      tx,
      ty,
      nace,
      llega,
      // Radio final de la mancha: lo bastante grande para tocar a sus vecinas
      radio: Math.hypot(casillaW, casillaH) * 0.72,
      grosor: 0.75 + azar() * 0.5,
      fase: azar() * Math.PI * 2,     // para que cada una ondule distinto
      giro: azar() * Math.PI * 2,     // hacia dónde miran los lóbulos de su mancha
      motas,
    });
  }
}

// ----- Un punto del camino de un tentáculo -----
// s = 0 → el centro, s = 1 → su sitio en la carta. Ondula a los lados como una
// serpiente (la onda viaja con el tiempo) y no ondula en los extremos.
function puntoDelCamino(t, s, progreso) {
  const x = t.tx * s;
  const y = t.ty * s;
  const largo = Math.hypot(t.tx, t.ty) || 1;
  const nx = -t.ty / largo;  // dirección "de lado" (perpendicular al camino)
  const ny = t.tx / largo;
  // Una onda larga y lenta: el tentáculo se mece en vez de temblar
  const onda = Math.sin(s * Math.PI * 1.6 - progreso * 10 + t.fase) * Math.sin(Math.PI * s) * cartaW * ONDULAR;
  return [cx + x + nx * onda, cy + y + ny * onda];
}

// Une una lista de puntos con curvas suaves (pasando por el punto medio de cada par):
// así el contorno no tiene esquinas, parece líquido
function curvaSuave(camino, puntos) {
  for (let i = 1; i < puntos.length - 1; i++) {
    const [x, y] = puntos[i];
    const [x2, y2] = puntos[i + 1];
    camino.quadraticCurveTo(x, y, (x + x2) / 2, (y + y2) / 2);
  }
  const [xf, yf] = puntos[puntos.length - 1];
  camino.lineTo(xf, yf);
}

// ----- Un tentáculo: se ensancha en la raíz para fundirse con el núcleo y acaba en punta -----
// La punta sale hasta su sitio y, cuando la mancha ya ha nacido, vuelve al centro.
function trazarTentaculo(camino, t, progreso) {
  const sale = frenar(tramo(progreso, t.nace, t.llega));
  const vuelve = suave(tramo(progreso, t.llega + 0.04, t.llega + 0.3));
  const punta = sale * (1 - vuelve);
  if (punta <= 0.01) return;

  const pasos = 32;
  const izquierda = [];
  const derecha = [];
  for (let i = 0; i <= pasos; i++) {
    const f = i / pasos;          // 0 = raíz, 1 = punta
    const s = punta * f;
    const [x, y] = puntoDelCamino(t, s, progreso);
    // Dirección del camino en este punto (para saber hacia dónde es "el lado")
    const [x2, y2] = puntoDelCamino(t, s + 0.01, progreso);
    let dx = x2 - x;
    let dy = y2 - y;
    const largo = Math.hypot(dx, dy) || 1;
    dx /= largo;
    dy /= largo;
    // Se afina poco a poco hasta la punta, y cerca de la raíz se abre como un embudo
    const resto = 1 - f;
    const g = (cartaW * GROSOR * t.grosor * Math.pow(resto, 0.8) * (1 + 1.4 * Math.pow(resto, 6))) / 2;
    izquierda.push([x - dy * g, y + dx * g]);
    derecha.push([x + dy * g, y - dx * g]);
  }

  // Un lado de ida y el otro de vuelta, los dos con curvas suaves
  camino.moveTo(izquierda[0][0], izquierda[0][1]);
  curvaSuave(camino, izquierda);
  curvaSuave(camino, derecha.reverse());
  camino.closePath();
}

// ----- El núcleo: una gota de sombra que late y cambia de forma -----
function trazarNucleo(camino, radio, progreso) {
  const puntos = 60;
  const borde = [];
  for (let i = 0; i <= puntos; i++) {
    const a = (i / puntos) * Math.PI * 2;
    const onda = 1 + 0.12 * Math.sin(3 * a + progreso * 9) + 0.07 * Math.sin(5 * a - progreso * 13);
    borde.push([cx + Math.cos(a) * radio * onda, cy + Math.sin(a) * radio * onda]);
  }
  camino.moveTo(borde[0][0], borde[0][1]);
  curvaSuave(camino, borde);
  camino.closePath();
}

// ----- El borde de una mancha de tinta: un círculo ondulado que gira -----
function trazarMancha(camino, t, radio, progreso) {
  if (radio <= 0.5) return;
  const x0 = cx + t.tx;
  const y0 = cy + t.ty;
  const puntos = 48;
  for (let i = 0; i <= puntos; i++) {
    const a = (i / puntos) * Math.PI * 2;
    // Dos ondas que giran en sentidos contrarios: el borde parece tinta que se extiende
    const onda = 1 + 0.12 * Math.sin(ONDAS * a + t.giro - progreso * 12) + 0.05 * Math.sin(11 * a - t.giro + progreso * 8);
    const x = x0 + Math.cos(a) * radio * onda;
    const y = y0 + Math.sin(a) * radio * onda;
    if (i === 0) camino.moveTo(x, y);
    else camino.lineTo(x, y);
  }
  camino.closePath();
}

// ----- Dibujar un momento de la formación -----
function dibujar(progreso) {
  ctx.clearRect(0, 0, ancho, alto);

  const formada = progreso >= 1;
  portal.classList.toggle("portal--formada", formada);
  if (formada) return;

  // Cuánto ha crecido cada mancha, y su borde negro (que se estrecha al final
  // para que la carta termine limpia, sin ningún resto de negro)
  const borde = cartaW * BORDE * (1 - tramo(progreso, 0.78, 0.96));
  const manchaNegra = new Path2D();
  const manchaCarta = new Path2D();
  for (const t of sombras) {
    const crece = suave(tramo(progreso, t.llega - 0.03, t.llega + MANCHA)); // crece a ritmo parejo, como tinta
    trazarMancha(manchaNegra, t, t.radio * crece, progreso);
    trazarMancha(manchaCarta, t, t.radio * crece - borde, progreso);
  }

  // 0. Una neblina pálida detrás de todo: sin ella, el negro no se vería sobre el fondo
  //    oscuro de la página. Es un degradado ovalado sin bordes (las sombras se recortan
  //    contra ella como siluetas) que se enciende al principio y se apaga al final.
  const niebla = NIEBLA * suave(tramo(progreso, 0, 0.15)) * (1 - suave(tramo(progreso, 0.7, 1)));
  if (niebla > 0) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, cartaH / cartaW); // estirado a lo alto: óvalo con la forma de la carta
    const r = cartaW * 0.62;       // cabe dentro del lienzo: nunca se ve cortado en recto
    const luz = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    luz.addColorStop(0, `rgba(${COLOR_NIEBLA}, ${niebla})`);
    luz.addColorStop(0.6, `rgba(${COLOR_NIEBLA}, ${niebla * 0.5})`);
    luz.addColorStop(1, `rgba(${COLOR_NIEBLA}, 0)`);
    ctx.fillStyle = luz;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();
  }

  // 1. Las manchas negras, recortadas a la forma de la carta
  ctx.save();
  ctx.beginPath();
  ctx.rect(cartaX, cartaY, cartaW, cartaH);
  ctx.clip();
  ctx.fillStyle = COLOR_SOMBRA;
  ctx.fill(manchaNegra);
  ctx.restore();

  // 2. El dibujo de la carta dentro de las manchas (un poco más pequeñas: se ve el borde negro)
  if (cara.complete && cara.naturalWidth) {
    capaCtx.clearRect(0, 0, ancho, alto);
    capaCtx.fillStyle = "#fff";
    capaCtx.fill(manchaCarta);
    capaCtx.globalCompositeOperation = "source-in"; // la imagen solo donde hay mancha
    capaCtx.drawImage(cara, cartaX, cartaY, cartaW, cartaH);
    capaCtx.globalCompositeOperation = "source-over";
    ctx.drawImage(capa, 0, 0, ancho, alto);
  }

  // 3. Tentáculos y núcleo, encima de todo, en negro puro y sin borde:
  //    donde se cruzan no se ve ninguna línea, parecen una sola sombra.
  ctx.fillStyle = COLOR_SOMBRA;
  const tentaculos = new Path2D();
  for (const t of sombras) trazarTentaculo(tentaculos, t, progreso);
  ctx.fill(tentaculos);
  // El núcleo aparece primero y se apaga cuando las sombras ya han vuelto
  const nucleo = suave(tramo(progreso, 0, 0.1)) * (1 - suave(tramo(progreso, 0.6, 0.85)));
  if (nucleo > 0) {
    const gota = new Path2D();
    trazarNucleo(gota, cartaW * 0.11 * nucleo, progreso);
    ctx.fill(gota);
  }

  // 4. Motas de alma: suben desde cada mancha al abrirse y se apagan
  ctx.fillStyle = COLOR_ALMA;
  for (const t of sombras) {
    for (const m of t.motas) {
      const q = tramo(progreso, t.llega + m.retraso, t.llega + m.retraso + 0.3);
      if (q <= 0 || q >= 1) continue;
      ctx.globalAlpha = Math.sin(Math.PI * q); // aparece y se apaga
      ctx.beginPath();
      ctx.arc(cx + t.tx + m.dx, cy + t.ty + m.dy - m.sube * frenar(q), m.tam, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
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
  // La placa comparte este reloj: sombras y letras avanzan junto a la carta.
  document.dispatchEvent(new CustomEvent("hk-progreso", {
    detail: { progreso, abriendo: objetivo === 1 }
  }));

  if (progreso !== objetivo) {
    requestAnimationFrame(animar);
  } else {
    animando = false;
    if (progreso === 0) portal.classList.remove("portal--visible");
  }
}

function mostrarCartaHK(abrir) {
  clearTimeout(esperaApuntar); // una espera de foco no debe reabrirla después de cancelar
  boton.setAttribute("aria-expanded", abrir); // avisa a los lectores de pantalla
  if ((abrir ? 1 : 0) === objetivo) return;
  objetivo = abrir ? 1 : 0;

  if (abrir) {
    portal.classList.add("portal--visible");
    if (progreso === 0) medir();
    // Una carta a la vez (todas salen en el mismo sitio): avisamos a las otras para que se guarden
    document.dispatchEvent(new CustomEvent("carta-abierta", { detail: "hollow-knight" }));
  }

  // Con "reducir movimiento": sin sombras, aparece o desaparece de golpe
  if (sinMovimiento.matches) {
    progreso = objetivo;
    ctx.clearRect(0, 0, ancho, alto);
    portal.classList.toggle("portal--formada", abrir);
    if (!abrir) portal.classList.remove("portal--visible");
    document.dispatchEvent(new CustomEvent("hk-progreso", {
      detail: { progreso, abriendo: abrir }
    }));
    return;
  }

  if (!animando) {
    animando = true;
    anterior = performance.now();
    requestAnimationFrame(animar);
  }
}

// ----- Cuándo se abre y se cierra (como la carta del agujero) -----
// Con ratón: apuntar al planeta la saca y quitar el ratón la guarda.
// En móvil: un toque la saca y otro (o tocar fuera) la guarda.
// Con teclado: Enter o Espacio la sacan y Escape la guarda.
let esperaApuntar = null;
let punteroPulsado = "";

// Con Tab también se muestran juntas; no obliga a pulsar Enter para ver el destino.
boton.addEventListener("focus", () => {
  clearTimeout(esperaApuntar);
  esperaApuntar = setTimeout(() => mostrarCartaHK(true), ESPERA_APUNTAR);
});
boton.addEventListener("blur", () => {
  clearTimeout(esperaApuntar);
  mostrarCartaHK(false);
});

boton.addEventListener("pointerenter", (evento) => {
  if (evento.pointerType !== "mouse") return;
  clearTimeout(esperaApuntar);
  esperaApuntar = setTimeout(() => mostrarCartaHK(true), ESPERA_APUNTAR);
});

boton.addEventListener("pointerleave", (evento) => {
  if (evento.pointerType !== "mouse") return;
  clearTimeout(esperaApuntar);
  mostrarCartaHK(false);
});

boton.addEventListener("pointerdown", (evento) => {
  punteroPulsado = evento.pointerType;
});

boton.addEventListener("click", (evento) => {
  // orbita.js marca el clic como "cancelado" si la persona estaba arrastrando la órbita
  if (evento.defaultPrevented) return;
  const delTeclado = evento.detail === 0;
  if (!delTeclado && punteroPulsado === "mouse") return; // con ratón ya se encarga apuntar
  mostrarCartaHK(objetivo === 0);
});

document.addEventListener("click", (evento) => {
  if (!boton.contains(evento.target)) mostrarCartaHK(false);
});
document.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape") mostrarCartaHK(false);
});

// Si se abre otra carta (la de Ludwig o la de otro planeta), esta se guarda
document.addEventListener("carta-abierta", (evento) => {
  if (evento.detail === "hollow-knight") return;
  clearTimeout(esperaApuntar);
  mostrarCartaHK(false);
});

// Si cambia el tamaño de la ventana con la carta abierta, lo recolocamos todo
window.addEventListener("resize", () => {
  if (progreso > 0) {
    medir();
    dibujar(progreso);
  }
});

})();
