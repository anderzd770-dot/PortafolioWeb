// =========================================================
// LA CARTA DE CYBERPUNK 2077: UNA SEÑAL QUE SE SINTONIZA
// Al apuntar al planeta de Cyberpunk 2077, su carta ("Night City 2077",
// neón verde y magenta) aparece en el mismo sitio que las otras cartas,
// pero llega como una señal de vídeo que falla un poco:
//
// Pasos (según "progreso", de 0 = cerrada a 1 = formada):
//   1. La carta está cortada en franjas horizontales. Cada franja se
//      enciende en su momento (desordenadas), a veces con un "chispazo"
//      falso un instante antes.
//   2. Mientras se asienta, la franja da pequeños saltos de lado y tiene
//      los colores separados: el canal rojo va a un lado y el cian al otro.
//      Poco a poco los saltos se calman y los colores se juntan.
//   3. Encima hay líneas de barrido (como una pantalla vieja), algún bloque
//      de "datos rotos" verde o magenta y dos parpadeos cortos de toda la carta.
//   4. Al final todo encaja y una línea de neón baja por la carta una vez (CSS).
// Al cerrar pasa lo mismo al revés.
//
// Idea clave: separar colores sin librerías. Guardamos dos copias de la
// carta: una solo con el rojo y otra solo con el verde + azul (cian).
// Pintadas una encima de la otra con "lighter" (sumar luz) vuelven a dar
// la carta original. Si las movemos un poco, aparecen los bordes de color.
// =========================================================

(() => {

// ----- Ajustes (¡prueba a cambiarlos!) -----
const DURACION_ABRIR = 1.3;    // segundos que tarda en formarse
const DURACION_CERRAR = 0.5;   // segundos que tarda en apagarse
const ALTO_FRANJA = [0.015, 0.1]; // alto de las franjas (mínimo y máximo, fracción del alto de la carta)
const ASENTAR = 0.32;          // lo que tarda cada franja en calmarse desde que se enciende
const SALTO = 0.022;           // lo lejos que salta una franja de lado (fracción del ancho)
const SEPARACION = 0.01;       // lo separados que empiezan el rojo y el cian (fracción del ancho)
const SALTOS_POR_SEGUNDO = 24; // cada cuánto cambian los saltos (más = más nervioso)
const BLOQUES = 8;             // bloques de "datos rotos"
const LINEAS = 0.16;           // lo oscuras que son las líneas de barrido (0 = sin líneas)
const PARPADEOS = [[0.44, 0.47], [0.68, 0.7]]; // momentos en los que toda la carta parpadea
const VERDE = "125, 255, 90";  // los dos neones de la carta (rojo, verde, azul)
const MAGENTA = "226, 60, 255";
const ESPERA_APUNTAR = 150;    // milisegundos apuntando antes de sacarla (como las otras cartas)
const SEMILLA = 2077;          // cámbiala y las franjas y bloques salen distintos

// ----- Elementos -----
const planeta = document.querySelector(".planeta--cyberpunk");
const boton = planeta?.querySelector(".planeta__enlace");
const portal = document.querySelector(".portal--cyberpunk");
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

// Un número "al azar" entre -1 y 1 que depende de dos números (franja y momento):
// para los mismos dos números sale siempre el mismo. Así los saltos son a golpes,
// no un temblor continuo.
function ruido(a, b) {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

const limitar = (x) => Math.min(1, Math.max(0, x));
const tramo = (p, desde, hasta) => limitar((p - desde) / (hasta - desde)); // 0 → 1 entre dos momentos

// ----- Medidas -----
let ancho = 0;
let alto = 0;
let dpr = 1;
let cartaX = 0;
let cartaY = 0;
let cartaW = 0;
let cartaH = 0;
let franjas = [];
let bloques = [];
let rojo = null;   // copia de la carta con solo el canal rojo
let cian = null;   // copia con solo verde y azul

function medir() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  ancho = lienzo.clientWidth;
  alto = lienzo.clientHeight;
  lienzo.width = Math.round(ancho * dpr);
  lienzo.height = Math.round(alto * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  cartaW = carta.offsetWidth;
  cartaH = carta.offsetHeight;
  cartaX = (ancho - cartaW) / 2;
  cartaY = (alto - cartaH) / 2;
  prepararCanales();
}

// Las dos copias de color: dibujamos la carta y la "multiplicamos" por un color.
// Multiplicar por rojo puro (255, 0, 0) deja solo el rojo; por cian (0, 255, 255), el resto.
function prepararCanales() {
  rojo = cian = null;
  if (!cara.complete || !cara.naturalWidth) return;
  const w = Math.max(1, Math.round(cartaW * dpr));
  const h = Math.max(1, Math.round(cartaH * dpr));
  const copia = (color) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const x = c.getContext("2d");
    x.drawImage(cara, 0, 0, w, h);
    x.globalCompositeOperation = "multiply";
    x.fillStyle = color;
    x.fillRect(0, 0, w, h);
    return c;
  };
  rojo = copia("#ff0000");
  cian = copia("#00ffff");
}

function crearGlitch() {
  const azar = crearAzar(SEMILLA);

  // Franjas de alto variado (muchas finas y alguna gruesa) hasta cubrir la carta
  franjas = [];
  let y = 0;
  while (y < cartaH) {
    const h = Math.min(cartaH - y, cartaH * (ALTO_FRANJA[0] + azar() * azar() * (ALTO_FRANJA[1] - ALTO_FRANJA[0])));
    franjas.push({
      y,
      h,
      enciende: 0.04 + azar() * 0.58, // cuándo se enciende de verdad
      chispazo: azar() < 0.3,         // ¿aparece un instante antes, de mentira?
    });
    y += h;
  }

  bloques = [];
  for (let i = 0; i < BLOQUES; i++) {
    bloques.push({
      nace: 0.08 + azar() * 0.62,
      vida: 0.025 + azar() * 0.04,
      x: azar() * 0.85,
      y: azar(),
      w: 0.06 + azar() * 0.24,
      h: 0.005 + azar() * 0.015,
      color: azar() < 0.55 ? VERDE : MAGENTA,
    });
  }
}

// Una franja de la carta, movida "dx" de lado y con los colores separados "sep"
function pintarFranja(f, dx, sep) {
  const sy = f.y * dpr;
  const sh = Math.max(1, f.h * dpr);
  if (!rojo) {
    // Si la imagen aún no ha cargado del todo, la pintamos sin separar colores
    if (!cara.complete || !cara.naturalWidth) return;
    const k = cara.naturalHeight / cartaH;
    ctx.drawImage(cara, 0, f.y * k, cara.naturalWidth, f.h * k, cartaX + dx, cartaY + f.y, cartaW, f.h);
    return;
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.drawImage(rojo, 0, sy, rojo.width, sh, cartaX + dx + sep, cartaY + f.y, cartaW, f.h);
  ctx.globalCompositeOperation = "lighter"; // rojo + cian = los colores de verdad
  ctx.drawImage(cian, 0, sy, cian.width, sh, cartaX + dx - sep, cartaY + f.y, cartaW, f.h);
  ctx.globalCompositeOperation = "source-over";
}

// ----- Dibujar un momento de la formación -----
function dibujar(progreso) {
  ctx.clearRect(0, 0, ancho, alto);

  const formada = progreso >= 1;
  portal.classList.toggle("portal--formada", formada);
  if (formada) return;

  const paso = Math.floor((progreso * DURACION_ABRIR) * SALTOS_POR_SEGUNDO); // el "golpe" actual
  const parpadeo = PARPADEOS.some(([desde, hasta]) => progreso > desde && progreso < hasta);
  ctx.globalAlpha = parpadeo ? 0.35 : 1;

  const encendidas = new Path2D(); // dónde hay carta (para las líneas de barrido)

  franjas.forEach((f, i) => {
    const q = tramo(progreso, f.enciende, f.enciende + ASENTAR); // 0 = recién encendida, 1 = quieta
    const enChispazo = f.chispazo && progreso > f.enciende - 0.08 && progreso < f.enciende - 0.05;
    if (q <= 0 && !enChispazo) return;

    const nervio = enChispazo ? 1 : Math.pow(1 - q, 2); // lo "rota" que está todavía
    // Solo salta en algunos golpes: entre salto y salto se queda quieta
    const r = ruido(i + 1, paso);
    const dx = (Math.abs(r) > 0.55 ? r : 0) * SALTO * cartaW * nervio;
    const sep = SEPARACION * cartaW * nervio;
    pintarFranja(f, dx, sep);
    encendidas.rect(cartaX, cartaY + f.y, cartaW, f.h);
  });

  // Líneas de barrido: una línea oscura cada 3 px, solo encima de la carta,
  // y se van apagando al final
  const oscuridad = LINEAS * (1 - tramo(progreso, 0.7, 0.98));
  if (oscuridad > 0) {
    ctx.save();
    ctx.clip(encendidas);
    ctx.fillStyle = `rgba(0, 0, 0, ${oscuridad})`;
    for (let y = cartaY; y < cartaY + cartaH; y += 3) ctx.fillRect(cartaX - 8, y, cartaW + 16, 1);
    ctx.restore();
  }

  // Bloques de "datos rotos": rectángulos de neón que aparecen un instante
  ctx.globalCompositeOperation = "lighter";
  for (const b of bloques) {
    if (progreso < b.nace || progreso > b.nace + b.vida) continue;
    ctx.fillStyle = `rgba(${b.color}, 0.55)`;
    ctx.fillRect(cartaX + b.x * cartaW, cartaY + b.y * cartaH, b.w * cartaW, Math.max(1, b.h * cartaH));
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
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

function mostrarCartaCyberpunk(abrir) {
  boton.setAttribute("aria-expanded", abrir); // avisa a los lectores de pantalla
  if ((abrir ? 1 : 0) === objetivo) return;
  objetivo = abrir ? 1 : 0;

  if (abrir) {
    portal.classList.add("portal--visible");
    if (progreso === 0) {
      medir();
      crearGlitch();
    }
    // Una carta a la vez (todas salen en el mismo sitio): avisamos a las otras para que se guarden
    document.dispatchEvent(new CustomEvent("carta-abierta", { detail: "cyberpunk" }));
  }

  // Con "reducir movimiento": sin glitch, aparece o desaparece de golpe
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

// Si la imagen termina de cargar con la carta ya abierta, preparamos los colores
cara.addEventListener("load", () => {
  if (progreso > 0) prepararCanales();
});

// ----- Cuándo se abre y se cierra (como las cartas de Hollow Knight y The Witcher) -----
// Con ratón: apuntar al planeta la saca y quitar el ratón la guarda.
// En móvil: un toque la saca y otro (o tocar fuera) la guarda.
// Con teclado: Enter o Espacio la sacan y Escape la guarda.
let esperaApuntar = null;
let punteroPulsado = "";

boton.addEventListener("pointerenter", (evento) => {
  if (evento.pointerType !== "mouse") return;
  clearTimeout(esperaApuntar);
  esperaApuntar = setTimeout(() => mostrarCartaCyberpunk(true), ESPERA_APUNTAR);
});

boton.addEventListener("pointerleave", (evento) => {
  if (evento.pointerType !== "mouse") return;
  clearTimeout(esperaApuntar);
  mostrarCartaCyberpunk(false);
});

boton.addEventListener("pointerdown", (evento) => {
  punteroPulsado = evento.pointerType;
});

boton.addEventListener("click", (evento) => {
  // orbita.js marca el clic como "cancelado" si la persona estaba arrastrando la órbita
  if (evento.defaultPrevented) return;
  const delTeclado = evento.detail === 0;
  if (!delTeclado && punteroPulsado === "mouse") return; // con ratón ya se encarga apuntar
  mostrarCartaCyberpunk(objetivo === 0);
});

document.addEventListener("click", (evento) => {
  if (!boton.contains(evento.target)) mostrarCartaCyberpunk(false);
});
document.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape") mostrarCartaCyberpunk(false);
});

// Si se abre otra carta (la de Ludwig o la de otro planeta), esta se guarda
document.addEventListener("carta-abierta", (evento) => {
  if (evento.detail === "cyberpunk") return;
  clearTimeout(esperaApuntar);
  mostrarCartaCyberpunk(false);
});

// Si cambia el tamaño de la ventana con la carta abierta, lo recolocamos todo
window.addEventListener("resize", () => {
  if (progreso > 0) {
    medir();
    crearGlitch();
    dibujar(progreso);
  }
});

})();
