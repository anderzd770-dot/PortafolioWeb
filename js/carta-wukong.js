// =========================================================
// LA CARTA DE BLACK MYTH: WUKONG: UNA INVOCACIÓN
// Al apuntar al planeta de Wukong, su carta aparece en el mismo sitio
// que las otras cartas, pero llega como una invocación: el truco de los
// clones de Sun Wukong en la novela "Viaje al Oeste" (de dominio público):
// se arranca unos pelos, los sopla y cada pelo se convierte en un clon.
//
// Pasos (según "progreso", de 0 = cerrada a 1 = formada):
//   1. El soplo: un punto de luz dorada en el centro.
//   2. Los pelos: líneas finas de oro salen disparadas del centro en curva,
//      cada una hacia un punto distinto de la carta (cubren toda la carta).
//   3. Cada pelo, al llegar, se deshace en polvo dorado.
//   4. La carta se forma a cuadraditos (como los píxeles de la carta de Ludwig)
//      que crecen alrededor de cada pelo, con un brillo de oro al nacer.
// Al cerrar pasa lo mismo al revés: la carta se deshace y los pelos vuelven al centro.
//
// Idea clave: cada cuadradito de la carta "pertenece" al pelo más cercano
// y aparece un poco después de que ese pelo llegue (más tarde cuanto más lejos).
// Así la carta crece desde muchos puntos a la vez, como si cada pelo fuera un trozo del clon.
// =========================================================

(() => {

// ----- Ajustes (¡prueba a cambiarlos!) -----
const DURACION_ABRIR = 1.4;    // segundos que tarda en formarse
const DURACION_CERRAR = 0.6;   // segundos que tarda en desaparecer
const PELOS = 36;              // pelos que sopla, más o menos (se reparten en cuadrícula por la carta)
const CURVA = 0.28;            // cuánto se curva el vuelo de cada pelo (0 = vuelan rectos)
const LARGO_PELO = 0.07;       // lo que tarda la cola en seguir a la punta: más alto = pelos más largos
const POLVO = 12;              // motas de polvo dorado en las que se deshace cada pelo
const CELDA = 5;               // tamaño (px) de los cuadraditos con los que se forma la carta
const EXPANDIR = 0.38;         // lo que tarda la carta en crecer alrededor de cada pelo (fracción de la animación)
const ROJOS = 0.2;             // parte de los pelos que son rojos en vez de dorados (0 = todos de oro)
const COLOR_ORO = "236, 190, 96";     // el oro del marco de la carta
const COLOR_LUZ = "250, 243, 226";    // el brillo del soplo y de la punta de los pelos
const COLOR_ROJO = "196, 58, 40";     // el rojo de la carta
const ESPERA_APUNTAR = 150;    // milisegundos apuntando antes de sacarla (como las otras cartas)
const SEMILLA = 72;            // las 72 transformaciones de Wukong: cámbiala y los pelos salen distintos

// ----- Elementos -----
const planeta = document.querySelector(".planeta--wukong");
const boton = planeta?.querySelector(".planeta__enlace");
const portal = document.querySelector(".portal--wukong");
if (!boton || !portal) return;
const carta = portal.querySelector(".carta");
const cara = carta.querySelector(".carta__cara");
const lienzo = portal.querySelector(".portal__lienzo");
const ctx = lienzo.getContext("2d");
// Un segundo lienzo invisible donde se "recorta" la carta con los cuadraditos
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

const frenar = (x) => 1 - Math.pow(1 - x, 2);     // rápido al principio, frena al final
const limitar = (x) => Math.min(1, Math.max(0, x));
const tramo = (p, desde, hasta) => limitar((p - desde) / (hasta - desde)); // 0 → 1 entre dos momentos

// ----- Medidas -----
let ancho = 0;
let alto = 0;
let cx = 0;          // centro de la carta dentro del lienzo
let cy = 0;
let cartaW = 0;
let cartaH = 0;
let pelos = [];
let celdas = [];

function medir() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
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
}

function crearInvocacion() {
  const azar = crearAzar(SEMILLA);

  // Dónde cae cada pelo: la carta se divide en casillas y en cada una cae un pelo,
  // movido un poco al azar. Así llegan a TODA la carta, esquinas incluidas.
  const columnas = Math.max(2, Math.round(Math.sqrt((PELOS * cartaW) / cartaH)));
  const filas = Math.ceil(PELOS / columnas);
  const casillaW = cartaW / columnas;
  const casillaH = cartaH / filas;
  const espacio = Math.sqrt(casillaW * casillaH); // distancia típica entre pelos

  pelos = [];
  for (let i = 0; i < columnas * filas; i++) {
    const col = i % columnas;
    const fila = Math.floor(i / columnas);
    // Posición final (desde el centro de la carta); filas desplazadas como ladrillos
    const tx = (col + 0.5 + (fila % 2 ? 0.2 : -0.2) + (azar() - 0.5) * 0.5) * casillaW - cartaW / 2;
    const ty = (fila + 0.5 + (azar() - 0.5) * 0.5) * casillaH - cartaH / 2;
    // Lo lejos que está del centro: 0 en el centro, 1 en las esquinas
    const lejos = Math.min(1, Math.hypot(tx / (cartaW / 2), ty / (cartaH / 2)) / Math.SQRT2);

    // Salen casi del mismo punto (el soplo), con un poco de separación
    const sx = (azar() - 0.5) * cartaW * 0.05;
    const sy = (azar() - 0.5) * cartaW * 0.05;
    // Punto de control de la curva: la mitad del camino, empujada a un lado.
    // Casi todos se curvan hacia el mismo lado, como si el soplo los hiciera girar.
    const largo = Math.hypot(tx - sx, ty - sy);
    const lado = azar() < 0.85 ? 1 : -1;
    const empuje = CURVA * (0.6 + azar() * 0.8) * lado;
    const kx = (sx + tx) / 2 - ((ty - sy) / (largo || 1)) * largo * empuje;
    const ky = (sy + ty) / 2 + ((tx - sx) / (largo || 1)) * largo * empuje;

    const nace = 0.07 + azar() * 0.12;
    const llega = nace + 0.14 + lejos * 0.14; // los que van más lejos tardan más

    // El polvo en el que se deshace: motas que salen hacia todos lados
    const polvo = [];
    for (let m = 0; m < POLVO; m++) {
      polvo.push({
        a: azar() * Math.PI * 2,
        d: espacio * (0.15 + azar() * 0.55),
        tam: 1 + azar() * 1.2,
      });
    }

    pelos.push({ sx, sy, kx, ky, tx, ty, nace, llega, polvo, rojo: azar() < ROJOS });
  }

  // Los cuadraditos de la carta: cada uno pertenece al pelo más cercano
  celdas = [];
  const cols = Math.ceil(cartaW / CELDA);
  const rows = Math.ceil(cartaH / CELDA);
  for (let fila = 0; fila < rows; fila++) {
    for (let col = 0; col < cols; col++) {
      const x = -cartaW / 2 + col * CELDA;   // esquina de arriba a la izquierda (desde el centro)
      const y = -cartaH / 2 + fila * CELDA;
      let cercano = pelos[0];
      let d = Infinity;
      for (const pelo of pelos) {
        const dd = Math.hypot(x + CELDA / 2 - pelo.tx, y + CELDA / 2 - pelo.ty);
        if (dd < d) {
          d = dd;
          cercano = pelo;
        }
      }
      celdas.push({ x, y, d, pelo: cercano });
    }
  }
  // Cuándo aparece cada cuadradito: cuando llega su pelo, más tarde cuanto más lejos esté
  // (medido en "espacios entre pelos": así casi toda la carta tarda EXPANDIR en llenarse)
  for (const c of celdas) {
    c.t = c.pelo.llega + Math.min(1, c.d / (espacio * 0.8)) * EXPANDIR + azar() * 0.02;
  }
}

// Un punto del vuelo de un pelo (curva de Bézier: del soplo a su sitio, pasando cerca del control)
function puntoDelVuelo(pelo, t) {
  const u = 1 - t;
  return [
    cx + u * u * pelo.sx + 2 * u * t * pelo.kx + t * t * pelo.tx,
    cy + u * u * pelo.sy + 2 * u * t * pelo.ky + t * t * pelo.ty,
  ];
}

// ----- Dibujar un momento de la invocación -----
function dibujar(progreso) {
  ctx.clearRect(0, 0, ancho, alto);

  const formada = progreso >= 1;
  portal.classList.toggle("portal--formada", formada);
  if (formada) return;

  // 1. El soplo: un punto de luz que se enciende y se apaga cuando salen los pelos
  const soplo = tramo(progreso, 0, 0.08) * (1 - tramo(progreso, 0.14, 0.4));
  if (soplo > 0) {
    const r = cartaW * 0.22;
    const luz = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    luz.addColorStop(0, `rgba(${COLOR_LUZ}, ${soplo})`);
    luz.addColorStop(0.25, `rgba(${COLOR_ORO}, ${0.5 * soplo})`);
    luz.addColorStop(1, `rgba(${COLOR_ORO}, 0)`);
    ctx.fillStyle = luz;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }

  // 2. La carta, cuadradito a cuadradito. Cada uno crece desde su centro.
  //    Se dibujan en blanco en la capa invisible y luego "source-in" pinta la imagen
  //    solo donde hay cuadraditos (como un recortable).
  const forma = new Path2D();
  const nuevas = [];   // los que acaban de nacer: llevan un brillo de oro
  for (const c of celdas) {
    const f = tramo(progreso, c.t, c.t + 0.06);
    if (f <= 0) continue;
    // Enteros se solapan un poco (0.6 px) para que no se vean rayas entre ellos
    const lado = f >= 1 ? CELDA + 0.6 : CELDA * f;
    forma.rect(cx + c.x + (CELDA - lado) / 2, cy + c.y + (CELDA - lado) / 2, lado, lado);
    const brillo = 1 - tramo(progreso, c.t, c.t + 0.12);
    if (brillo > 0) nuevas.push(c, brillo);
  }
  capaCtx.clearRect(0, 0, ancho, alto);
  capaCtx.fillStyle = "#fff";
  capaCtx.fill(forma);
  if (cara.complete && cara.naturalWidth) {
    capaCtx.globalCompositeOperation = "source-in";
    capaCtx.drawImage(cara, cx - cartaW / 2, cy - cartaH / 2, cartaW, cartaH);
    capaCtx.globalCompositeOperation = "source-over";
  }
  ctx.drawImage(capa, 0, 0, ancho, alto);

  // A partir de aquí todo suma luz ("lighter"): el oro brilla sobre la carta y el fondo
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = `rgb(${COLOR_ORO})`;
  for (let i = 0; i < nuevas.length; i += 2) {
    const c = nuevas[i];
    ctx.globalAlpha = 0.55 * nuevas[i + 1];
    ctx.fillRect(cx + c.x, cy + c.y, CELDA, CELDA);
  }
  ctx.globalAlpha = 1;

  // 3. Los pelos: la punta vuela por la curva y la cola la sigue un poco después.
  //    Cuando la cola alcanza la punta, el pelo ha desaparecido.
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const pelo of pelos) {
    const punta = tramo(progreso, pelo.nace, pelo.llega);
    const cola = tramo(progreso, pelo.nace + LARGO_PELO, pelo.llega + LARGO_PELO);
    if (punta <= 0 || cola >= 1) continue;
    const desde = frenar(cola);
    const hasta = frenar(punta);
    const camino = new Path2D();
    for (let k = 0; k <= 10; k++) {
      const [x, y] = puntoDelVuelo(pelo, desde + ((hasta - desde) * k) / 10);
      if (k === 0) camino.moveTo(x, y);
      else camino.lineTo(x, y);
    }
    const color = pelo.rojo ? COLOR_ROJO : COLOR_ORO;
    // Dos trazos: uno ancho y flojo (el halo) y uno fino y fuerte (el pelo)
    ctx.strokeStyle = `rgba(${color}, 0.25)`;
    ctx.lineWidth = 3.2;
    ctx.stroke(camino);
    ctx.strokeStyle = `rgba(${color}, 0.95)`;
    ctx.lineWidth = 1.1;
    ctx.stroke(camino);
    // La punta brilla mientras vuela
    if (punta < 1) {
      const [x, y] = puntoDelVuelo(pelo, hasta);
      ctx.fillStyle = `rgba(${COLOR_LUZ}, 0.9)`;
      ctx.fillRect(x - 1, y - 1, 2, 2);
    }
  }

  // 4. El polvo: al llegar, cada pelo se deshace en motas que se abren y se apagan
  for (const pelo of pelos) {
    const v = tramo(progreso, pelo.llega, pelo.llega + 0.22);
    if (v <= 0 || v >= 1) continue;
    ctx.fillStyle = `rgb(${pelo.rojo ? COLOR_ROJO : COLOR_ORO})`;
    ctx.globalAlpha = 1 - v;
    const abre = frenar(v);
    for (const m of pelo.polvo) {
      const x = cx + pelo.tx + Math.cos(m.a) * m.d * abre;
      const y = cy + pelo.ty + Math.sin(m.a) * m.d * abre;
      ctx.fillRect(x - m.tam / 2, y - m.tam / 2, m.tam, m.tam);
    }
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
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

function mostrarCartaWukong(abrir) {
  boton.setAttribute("aria-expanded", abrir); // avisa a los lectores de pantalla
  if ((abrir ? 1 : 0) === objetivo) return;
  objetivo = abrir ? 1 : 0;

  if (abrir) {
    portal.classList.add("portal--visible");
    if (progreso === 0) {
      medir();
      crearInvocacion();
    }
    // Una carta a la vez (todas salen en el mismo sitio): avisamos a las otras para que se guarden
    document.dispatchEvent(new CustomEvent("carta-abierta", { detail: "wukong" }));
  }

  // Con "reducir movimiento": sin pelos, aparece o desaparece de golpe
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

// ----- Cuándo se abre y se cierra (como las cartas de Hollow Knight, The Witcher y Cyberpunk) -----
// Con ratón: apuntar al planeta la saca y quitar el ratón la guarda.
// En móvil: un toque la saca y otro (o tocar fuera) la guarda.
// Con teclado: Enter o Espacio la sacan y Escape la guarda.
let esperaApuntar = null;
let punteroPulsado = "";

boton.addEventListener("pointerenter", (evento) => {
  if (evento.pointerType !== "mouse") return;
  clearTimeout(esperaApuntar);
  esperaApuntar = setTimeout(() => mostrarCartaWukong(true), ESPERA_APUNTAR);
});

boton.addEventListener("pointerleave", (evento) => {
  if (evento.pointerType !== "mouse") return;
  clearTimeout(esperaApuntar);
  mostrarCartaWukong(false);
});

boton.addEventListener("pointerdown", (evento) => {
  punteroPulsado = evento.pointerType;
});

boton.addEventListener("click", (evento) => {
  // orbita.js marca el clic como "cancelado" si la persona estaba arrastrando la órbita
  if (evento.defaultPrevented) return;
  const delTeclado = evento.detail === 0;
  if (!delTeclado && punteroPulsado === "mouse") return; // con ratón ya se encarga apuntar
  mostrarCartaWukong(objetivo === 0);
});

document.addEventListener("click", (evento) => {
  if (!boton.contains(evento.target)) mostrarCartaWukong(false);
});
document.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape") mostrarCartaWukong(false);
});

// Si se abre otra carta (la de Ludwig o la de otro planeta), esta se guarda
document.addEventListener("carta-abierta", (evento) => {
  if (evento.detail === "wukong") return;
  clearTimeout(esperaApuntar);
  mostrarCartaWukong(false);
});

// Si cambia el tamaño de la ventana con la carta abierta, lo recolocamos todo
window.addEventListener("resize", () => {
  if (progreso > 0) {
    medir();
    crearInvocacion();
    dibujar(progreso);
  }
});

})();
