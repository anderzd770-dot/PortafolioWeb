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
// Los píxeles no caen al azar: van a las zonas CLARAS del dibujo
// (marco, runas, casco, estrellas). Y justo donde aterrizan, el dibujo
// se enciende cuadradito a cuadradito, como si los píxeles se
// convirtieran en la carta. La onda de encendido va de dentro hacia fuera.
//
// Todo depende de un solo número, "progreso", que va de 0 (cerrada)
// a 1 (formada). Al cerrar, el mismo camino se recorre hacia atrás.
// =========================================================

(() => {

// ----- Ajustes (¡prueba a cambiarlos!) -----
const NUM_PIXELES = 1100;      // píxeles que forman la carta
const DURACION_ABRIR = 1.6;    // segundos que tarda en formarse
const DURACION_CERRAR = 0.55;  // segundos que tarda en volver al agujero
const VUELTAS = 1.2;           // vueltas de la espiral de cada píxel
const REJILLA = 3;             // tamaño de la celda de píxel (igual que el disco)
const CELDA = 4;               // tamaño (px) de los cuadraditos en los que se enciende el dibujo
const DESTELLO = 0.75;         // cuánto brilla en blanco cada cuadradito al encenderse (0 = nada)
const COLOR_PIXEL = "#eceef2"; // blanco plateado, como los puntos del dibujo de la carta
const RADIO_SEMILLA = 18;      // tamaño (px) de la espiral pequeña que aparece primero
const BRAZOS_SEMILLA = 2.5;    // vueltas de esa espiral
const SEMILLA = 0;             // la semilla del azar (cámbiala y la carta se forma con otro dibujo de píxeles)

// ----- El reloj de la animación (fracciones del progreso, de 0 a 1) -----
// Cada píxel sale del centro en "salida" y vuela durante VUELO.
// salida = SALIDA_MIN + SALIDA_DISTANCIA × (lo lejos que está su destino) + un poco de azar
const SALIDA_MIN = 0.06;
const SALIDA_DISTANCIA = 0.42;
const SALIDA_AZAR = 0.05;
const VUELO = 0.34;    // parte de la animación que dura el viaje de cada píxel
const VIDA = 0.1;      // después de aterrizar, lo que tarda en apagarse
const ENCENDER = 0.1;  // lo que tarda cada cuadradito del dibujo en encenderse del todo

// ----- Elementos -----
const portal = document.querySelector(".portal");
const carta = portal.querySelector(".carta");
const cara = carta.querySelector(".carta__cara");
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

// Cuándo llega la onda a un punto que está a "distancia" del centro (0 = centro, 1 = esquina).
// Los píxeles y los cuadraditos usan la MISMA fórmula: por eso cada cuadradito
// se enciende justo cuando le llegan sus píxeles.
const llegada = (distancia, azar) => SALIDA_MIN + SALIDA_DISTANCIA * distancia + SALIDA_AZAR * azar + VUELO;

// Brillo del dibujo (0 = negro, 1 = lo más claro) en un punto de la carta.
// fx, fy = posición como fracción del ancho y del alto (de 0 a 1).
// Sale del mapa BRILLO de abajo (medido una vez en la imagen): no se lee la imagen
// con JavaScript porque, abriendo la página como archivo, el navegador no lo permite.
function brilloEn(fx, fy) {
  const col = Math.min(BRILLO_COLUMNAS - 1, Math.floor(fx * BRILLO_COLUMNAS));
  const fila = Math.min(BRILLO.length - 1, Math.floor(fy * BRILLO.length));
  return parseInt(BRILLO[fila][col], 36) / 35;
}

// ----- Medidas -----
let ancho = 0;      // tamaño del lienzo en píxeles CSS
let alto = 0;
let centroX = 0;    // el centro de la carta (y del agujero) dentro del lienzo
let centroY = 0;
let cartaX = 0;     // esquina de arriba a la izquierda de la carta dentro del lienzo
let cartaY = 0;
let cartaW = 0;
let cartaH = 0;
let pixeles = [];
let celdas = [];

function medir() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  ancho = lienzo.clientWidth;
  alto = lienzo.clientHeight;
  lienzo.width = Math.round(ancho * dpr);
  lienzo.height = Math.round(alto * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  cartaW = carta.offsetWidth;
  cartaH = carta.offsetHeight;
  centroX = ancho / 2;
  centroY = alto / 2;
  cartaX = centroX - cartaW / 2;
  cartaY = centroY - cartaH / 2;
  crearPixeles();
  crearCeldas();
}

// ----- Cada píxel: dónde aterriza y cuándo sale -----
function crearPixeles() {
  const azar = crearAzar(SEMILLA);
  const radioMax = Math.hypot(cartaW, cartaH) / 2;

  // "Ruleta" con el mapa de brillo: cada zona del mapa tiene un trozo de ruleta
  // tan grande como su brillo al cuadrado. Así casi todos los píxeles caen en lo claro.
  const pesos = [];
  let total = 0;
  for (let fila = 0; fila < BRILLO.length; fila++) {
    for (let col = 0; col < BRILLO_COLUMNAS; col++) {
      const b = parseInt(BRILLO[fila][col], 36) / 35;
      total += b * b;
      pesos.push(total); // pesos acumulados: el trozo de cada zona acaba en este número
    }
  }

  pixeles = [];
  for (let i = 0; i < NUM_PIXELES; i++) {
    // Giramos la ruleta y buscamos en qué zona ha caído
    const bola = azar() * total;
    let zona = 0;
    while (pesos[zona] < bola) zona++;
    const col = zona % BRILLO_COLUMNAS;
    const fila = Math.floor(zona / BRILLO_COLUMNAS);

    // Un punto al azar dentro de esa zona, medido desde el centro de la carta
    const fx = (col + azar()) / BRILLO_COLUMNAS;
    const fy = (fila + azar()) / BRILLO.length;
    const x = (fx - 0.5) * cartaW;
    const y = (fy - 0.5) * cartaH;

    // Guardamos el destino en coordenadas polares (distancia y ángulo desde el centro)
    const distancia = Math.hypot(x, y);
    pixeles.push({
      radio: distancia,
      angulo: Math.atan2(y, x),
      salida: llegada(distancia / radioMax, azar()) - VUELO,
      luz: 0.55 + 0.45 * brilloEn(fx, fy), // más grande cuanto más claro es su sitio
    });
  }
}

// ----- Los cuadraditos en los que se enciende el dibujo -----
function crearCeldas() {
  const azar = crearAzar(SEMILLA + 1);
  const radioMax = Math.hypot(cartaW, cartaH) / 2;
  celdas = [];

  for (let y = 0; y < cartaH; y += CELDA) {
    for (let x = 0; x < cartaW; x += CELDA) {
      const w = Math.min(CELDA, cartaW - x);
      const h = Math.min(CELDA, cartaH - y);
      const distancia = Math.hypot(x + w / 2 - cartaW / 2, y + h / 2 - cartaH / 2) / radioMax;
      celdas.push({
        x: cartaX + x,
        y: cartaY + y,
        w,
        h,
        // Empieza a encenderse un poco antes de que lleguen sus píxeles
        inicio: llegada(distancia, azar()) - ENCENDER * 0.4,
        brillo: brilloEn((x + w / 2) / cartaW, (y + h / 2) / cartaH),
      });
    }
  }
}

// ----- Dibujar un momento de la formación (progreso de 0 a 1) -----
function dibujar(progreso) {
  ctx.clearRect(0, 0, ancho, alto);

  // Formada del todo: se ve la <img> de verdad (nítida) y el lienzo queda vacío.
  // El dibujo del lienzo es idéntico, así que el cambio no se nota.
  const formada = progreso >= 1;
  portal.classList.toggle("portal--formada", formada);
  if (formada) return;

  encenderDibujo(progreso);

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
  ctx.globalAlpha = 1;
  ctx.fill(trazado);
}

// El dibujo aparece por cuadraditos: cada uno crece desde su centro (0 → tamaño entero)
// y, mientras crece, brilla en blanco y se va "enfriando" hasta quedar con su color.
function encenderDibujo(progreso) {
  const recorte = new Path2D();
  // El destello blanco va en 3 grupos según su fuerza (más rápido que un color por cuadradito)
  const destellos = [new Path2D(), new Path2D(), new Path2D()];
  let hayDibujo = false;

  for (const c of celdas) {
    const t = limitar((progreso - c.inicio) / ENCENDER);
    if (t <= 0) continue;
    hayDibujo = true;

    if (t >= 1) {
      // Encendido del todo: medio píxel de más por cada lado para que no se vean rayitas entre cuadrados
      recorte.rect(c.x - 0.5, c.y - 0.5, c.w + 1, c.h + 1);
      continue;
    }

    const e = frenar(t);
    const w = c.w * e;
    const h = c.h * e;
    const x = c.x + (c.w - w) / 2;
    const y = c.y + (c.h - h) / 2;
    recorte.rect(x, y, w, h);

    // Solo destellan las zonas claras: en el negro del espacio no hay nada que brillar
    const fuerza = (1 - t) * c.brillo * DESTELLO;
    if (fuerza > 0.08) destellos[Math.min(2, Math.floor(fuerza * 3))].rect(x, y, w, h);
  }

  if (!hayDibujo) return;

  // Pintamos la imagen de la carta, pero solo dentro de los cuadraditos encendidos
  if (cara.complete && cara.naturalWidth) {
    ctx.save();
    ctx.clip(recorte);
    ctx.drawImage(cara, cartaX, cartaY, cartaW, cartaH);
    ctx.restore();
  }

  ctx.fillStyle = COLOR_PIXEL;
  destellos.forEach((trazado, i) => {
    ctx.globalAlpha = (i + 1) / 3;
    ctx.fill(trazado);
  });
  ctx.globalAlpha = 1;
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
  // Entre 0 y 0.05 s: nunca negativo (el primer fotograma puede llegar con una hora
  // un pelín anterior) y nunca un salto grande (si la pestaña estuvo en segundo plano)
  const segundos = Math.min(Math.max((ahora - anterior) / 1000, 0), 0.05);
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

// Esta función la llama agujero-negro.js al apuntar al agujero (abrir) o al salir (cerrar)
window.mostrarCarta = (abrir) => {
  if ((abrir ? 1 : 0) === objetivo) return; // ya iba hacia ahí: nada que hacer
  objetivo = abrir ? 1 : 0;
  portal.classList.toggle("portal--abierto", abrir);

  if (abrir) {
    portal.classList.add("portal--visible");
    if (progreso === 0) medir(); // medimos justo antes de empezar (la carta ya ocupa su sitio)
  }

  // Con "reducir movimiento": sin espiral, aparece o desaparece de golpe
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
};

// Si cambia el tamaño de la ventana con la carta abierta, recolocamos los píxeles
window.addEventListener("resize", () => {
  if (progreso > 0) {
    medir();
    dibujar(progreso);
  }
});

// ----- Mapa de brillo del dibujo -----
// La carta dividida en 38 × 68 zonas; cada letra es el brillo medio de una zona,
// del 0 (negro) a la z (lo más claro), en base 36. Se midió una vez en img/cartas/ludwig.webp.
// Si cambias la imagen de la carta, hay que volver a medirlo.
const BRILLO_COLUMNAS = 38;
const BRILLO = [
  "ibabbda89dbaeddba9ac99bdddacf97adcbaai",
  "a793685a3798897837dg9388a87a7286863979",
  "d8mh699ab9676bda37fe83cec6669aa987hl8d",
  "d3h84c700001010795bc69c000000006b48h3e",
  "e874f3000001130099b9aa01002000002d577e",
  "e58b400000000101127811120195100103a85e",
  "f87b00000101001223bc32110031000000a78c",
  "e6b200010105011335ll422110100020002d6f",
  "c790000000020235dmxxnf6221300000002a8c",
  "b1b0028if000159956mk65bb61100000000b1b",
  "97800315m702642334cc323468211002200979",
  "b5900313fa25111334aa222222831004427b4b",
  "d9b20336j23111122399111111173111ch2b79",
  "a490002512011211238910001411736mi4083b",
  "c9900200200119312389720029114iqd710aba",
  "9380000111145222239a21111215onb840082a",
  "97b00001072n512233cc211111bsj95900096c",
  "b3a0000112bs22345amk422225rob49813hd4a",
  "a690001016fk236gpxvpih833mhbe5babpcb3a",
  "b89006111h9l5heeqpmlqlnkdpcce4ajpf5a59",
  "96a003109c8imdbiegerwujjtjad56qked0949",
  "c5900001i6dlfagbe7fnwyrkpf8b8pbcg20a8b",
  "c6801019iinhbeegcaejmrlrde99i79h61ad2a",
  "b6a0032ijppoeibe8eggfelhc9d437eccofb68",
  "939049liftvghihebekda8pch7dc49isog5918",
  "938022gksvwmnkgahjkc4kj8g7965gqfef0769",
  "c79037hjtsgdlribinf72pjdd967ef6bi60a5b",
  "c7801ckoupeihvnmgnca4bifa88i839h814c89",
  "b5705jmxrg9jiriunlebge7ha5i667eillca4a",
  "c892nmsnlbbejfnxvphkhb5b7f8a48jrjd1a8b",
  "b28hjqrkiadbjiptzsnoea73785b6gbaf7095a",
  "a59aeingh9cbeajnznkhga895368648gg10a79",
  "b684cnkcf7dacbmlsqfcgfeb833a67dgme285a",
  "5691hxndf8bbcdplwmfeemjhc34339jri60b65",
  "9891mvlce8abfomxxnd4oi865784bebba10b7a",
  "8681ocqbea9ejhtzq925kc74656453ah212968",
  "c792j7egebbdeklmb21dda55a54459h68ja97c",
  "9281dd7aefbec65c629id5872257bf8315lb2a",
  "c8a0bbh39fa4212cbf6cdd94475abe9316ga8b",
  "d1a07et52720016sl312l9643h79ea82471919",
  "cb806cuj47002dip921af85538a8hn32100aa9",
  "957016qnf729d53g511fa7a742ed6i32100969",
  "c68012epclh6012d313c3m78563gi632a7284a",
  "d5a012andc30012b2141ck9b8749qd32c02a9a",
  "cb90117kh54000381543ob9e936etm4253193a",
  "a4a0017ng64000451479mbe7269ah885211b79",
  "ba90002e9b40003234heie445547p626k31839",
  "94700114eb5100323caje69424d8qi01qh199a",
  "ca9029129d7300438faheca226g9it1atnbb39",
  "b48012013m94005cea8jec3226gbcc6pvlqe7b",
  "b89001012co746jk99bgc21436fe43eekphe2a",
  "a490000014mkcepe8bfe203946ad3lc8ciec5a",
  "caa0102012gd57ic8ce1015c5453gh9795dc99",
  "a580000011gj56gcc700016b441emga94cdc49",
  "a28028gm4jbg86fd9000125710clsjf6ccaa3a",
  "c6a0413hqj9of8i7421134210bcerraedcaa5b",
  "b8a024llq7a98a3122221110cc7cmnmngc697b",
  "a783fsgm92b60gc53344210aj669bixuk99b7a",
  "b6donecb55j306655433116g75688iswjbfb69",
  "b3dcc5c72cl10342224313f96575bekojrhb3c",
  "b99967872cj3123212422db768499bf7lnea8c",
  "c75a8cdbaafba9ba89a9dccacb9cbbbefda46b",
  "a7875587b00000000000100000000a78458769",
  "d593784920601a0bb8898ba2e306029477294b",
  "e8lh686b30b01a0ab8a5haa4a30b02b676il7e",
  "c2f8377920601h7cba61g9a1h40702a8638f2c",
  "b8846889b01011111156111011010a8886488c",
  "fb9aaec9chidhkdfggddgjhajhfeid9cc9baaf"
];

})();
