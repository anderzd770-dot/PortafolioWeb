// =========================================================
// LA PLACA DE BLACK MYTH: WUKONG
// Cuando la barra de viaje (js/barra-viaje.js) aparece con el tema "wukong":
//
// 1. APARECE COMO SU CARTA (js/carta-wukong.js): el truco de los clones de
//    Sun Wukong ("Viaje al Oeste", dominio público). Un soplo de luz, unos pelos
//    de oro salen en curva, cada uno se deshace en polvo y la placa se forma a
//    cuadraditos alrededor de cada pelo. Mismos tiempos que la carta.
//
// 2. SE ACTIVA CON EL BASTÓN: cuando el dragón se posa, del centro sale un bastón
//    dorado que se alarga hacia los dos lados (el bastón que crece de la novela).
//    Detrás de él aparece el dibujo nuevo ("Conocer a Wukong"). Al llegar al tope
//    da un golpe: la placa tiembla, sale una onda de oro y saltan chispas.
//    Luego el bastón se encoge y desaparece.
//
// Este archivo no toca la barra: solo MIRA sus atributos (data-tema, data-estado)
// y pinta en su lienzo. Mientras pinta, pone data-wukong-pintando en la barra
// para que el CSS esconda el dibujo de verdad (css/planetas/wukong.css).
// =========================================================

(() => {

// ----- Ajustes de la aparición (¡prueba a cambiarlos!) -----
const DURACION = 1.4;          // segundos que tarda en formarse (igual que DURACION_ABRIR de la carta)
const PELOS = 24;              // pelos que sopla (se reparten en cuadrícula por la placa)
const CURVA = 0.28;            // cuánto se curva el vuelo de cada pelo (0 = vuelan rectos)
const LARGO_PELO = 0.07;       // lo que tarda la cola en seguir a la punta: más alto = pelos más largos
const POLVO = 8;               // motas de polvo en las que se deshace cada pelo
const CELDA = 3;               // tamaño (px) de los cuadraditos con los que se forma la placa
const EXPANDIR = 0.38;         // lo que tarda la placa en crecer alrededor de cada pelo
const ROJOS = 0.2;             // parte de los pelos rojos
const COLOR_ORO = "236, 190, 96";     // el oro (el mismo que la carta)
const COLOR_LUZ = "250, 243, 226";    // el brillo del soplo y de las puntas
const COLOR_ROJO = "196, 58, 40";     // el rojo de la carta
const SEMILLA = 72;            // las 72 transformaciones de Wukong

// ----- Ajustes de la activación (el bastón) -----
const DURACION_CAMBIO = 1.2;   // segundos que dura
const LARGO_BASTON = 0.46;     // hasta dónde se alarga hacia cada lado (fracción del ancho de la placa)
const GROSOR_BASTON = 0.07;    // grosor del bastón (fracción del alto de la placa)
const TEMBLOR = 3;             // píxeles que tiembla la placa con el golpe
const CHISPAS = 24;            // chispas que saltan de las puntas al golpear
const GOLPE = 0.35;            // momento del golpe (fracción de la duración)

// ----- Elementos -----
const barra = document.querySelector(".viaje");
const placa = barra.querySelector(".viaje__placa");
const lienzo = document.createElement("canvas");
lienzo.className = "viaje__clones-wukong";
lienzo.setAttribute("aria-hidden", "true");
barra.querySelector(".viaje__lienzo").append(lienzo);
const ctx = lienzo.getContext("2d");
// Capas invisibles: una para recortar el dibujo y otra para brillos
// que no deben salirse de la forma de la placa
const capa = document.createElement("canvas");
const capaCtx = capa.getContext("2d");
const luces = document.createElement("canvas");
const lucesCtx = luces.getContext("2d");
const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)");

// Los mismos dibujos que pone el CSS
const dibujo = new Image();
dibujo.src = "img/placas/wukong-inicio.webp";
const dibujoActivo = new Image();
dibujoActivo.src = "img/placas/wukong-activa.webp";
const cargada = (img) => img.complete && img.naturalWidth > 0;

// ----- Azar con semilla (mulberry32, el mismo que la carta) -----
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

const frenar = (x) => 1 - Math.pow(1 - x, 2);   // rápido al principio, frena al final
const suave = (x) => x * x * (3 - 2 * x);        // lento al principio y al final
const limitar = (x) => Math.min(1, Math.max(0, x));
const tramo = (p, desde, hasta) => limitar((p - desde) / (hasta - desde)); // 0 → 1 entre dos momentos

// ----- Medidas -----
let ancho = 0, alto = 0;                            // tamaño del lienzo (px CSS)
let placaX = 0, placaY = 0, placaW = 0, placaH = 0; // la placa dentro del lienzo
let cx = 0, cy = 0;                                 // centro de la placa
let pelos = [];
let celdas = [];

function medir() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  ancho = lienzo.clientWidth;
  alto = lienzo.clientHeight;
  for (const c of [lienzo, capa, luces]) {
    c.width = Math.round(ancho * dpr);
    c.height = Math.round(alto * dpr);
  }
  for (const c of [ctx, capaCtx, lucesCtx]) c.setTransform(dpr, 0, 0, dpr, 0, 0);
  placaW = placa.offsetWidth;
  placaH = placa.offsetHeight;
  placaX = (ancho - placaW) / 2; // el lienzo sobresale lo mismo por cada lado (CSS)
  placaY = (alto - placaH) / 2;
  cx = ancho / 2;
  cy = alto / 2;
}

// Suma a la placa lo que haya en la capa de luces, pero solo donde el dibujo
// tiene algo (destination-in): así el oro no flota en el aire alrededor del marco
function pintarLuces(recorte) {
  lucesCtx.globalCompositeOperation = "destination-in";
  lucesCtx.drawImage(recorte, placaX, placaY, placaW, placaH);
  lucesCtx.globalCompositeOperation = "source-over";
  ctx.globalCompositeOperation = "lighter";
  ctx.drawImage(luces, 0, 0, ancho, alto);
  ctx.globalCompositeOperation = "source-over";
}

// =========================================================
// 1. LA APARICIÓN: los pelos que se vuelven clon
// =========================================================
function crearInvocacion() {
  const azar = crearAzar(SEMILLA);
  // Dónde cae cada pelo: una casilla de la placa para cada uno (así llegan a toda la placa)
  const columnas = Math.max(2, Math.round(Math.sqrt((PELOS * placaW) / placaH)));
  const filas = Math.ceil(PELOS / columnas);
  const casillaW = placaW / columnas;
  const casillaH = placaH / filas;
  const espacio = Math.sqrt(casillaW * casillaH); // distancia típica entre pelos

  pelos = [];
  for (let i = 0; i < columnas * filas; i++) {
    const col = i % columnas;
    const fila = Math.floor(i / columnas);
    const tx = (col + 0.5 + (fila % 2 ? 0.2 : -0.2) + (azar() - 0.5) * 0.5) * casillaW - placaW / 2;
    const ty = (fila + 0.5 + (azar() - 0.5) * 0.5) * casillaH - placaH / 2;
    const lejos = Math.min(1, Math.hypot(tx / (placaW / 2), ty / (placaH / 2)) / Math.SQRT2);
    const sx = (azar() - 0.5) * placaH * 0.15;
    const sy = (azar() - 0.5) * placaH * 0.15;
    const largo = Math.hypot(tx - sx, ty - sy);
    const empuje = CURVA * (0.6 + azar() * 0.8) * (azar() < 0.85 ? 1 : -1);
    const kx = (sx + tx) / 2 - ((ty - sy) / (largo || 1)) * largo * empuje;
    const ky = (sy + ty) / 2 + ((tx - sx) / (largo || 1)) * largo * empuje;
    const nace = 0.07 + azar() * 0.12;
    const llega = nace + 0.14 + lejos * 0.14;
    const polvo = [];
    for (let m = 0; m < POLVO; m++) {
      polvo.push({ a: azar() * Math.PI * 2, d: espacio * (0.15 + azar() * 0.55), tam: 1 + azar() * 1.2 });
    }
    pelos.push({ sx, sy, kx, ky, tx, ty, nace, llega, polvo, rojo: azar() < ROJOS });
  }

  // Los cuadraditos de la placa: cada uno pertenece al pelo más cercano
  celdas = [];
  const cols = Math.ceil(placaW / CELDA);
  const rows = Math.ceil(placaH / CELDA);
  for (let fila = 0; fila < rows; fila++) {
    for (let col = 0; col < cols; col++) {
      const x = -placaW / 2 + col * CELDA;
      const y = -placaH / 2 + fila * CELDA;
      let cercano = pelos[0];
      let d = Infinity;
      for (const pelo of pelos) {
        const dd = Math.hypot(x + CELDA / 2 - pelo.tx, y + CELDA / 2 - pelo.ty);
        if (dd < d) { d = dd; cercano = pelo; }
      }
      celdas.push({ x, y, t: cercano.llega + Math.min(1, d / (espacio * 0.8)) * EXPANDIR + azar() * 0.02 });
    }
  }
}

// Un punto del vuelo de un pelo (curva de Bézier: del soplo a su sitio)
function puntoDelVuelo(pelo, t) {
  const u = 1 - t;
  return [
    cx + u * u * pelo.sx + 2 * u * t * pelo.kx + t * t * pelo.tx,
    cy + u * u * pelo.sy + 2 * u * t * pelo.ky + t * t * pelo.ty,
  ];
}

function dibujarInvocacion(progreso) {
  ctx.clearRect(0, 0, ancho, alto);

  // 1. El soplo: un punto de luz en el centro
  const soplo = tramo(progreso, 0, 0.08) * (1 - tramo(progreso, 0.14, 0.4));
  if (soplo > 0) {
    const r = placaH * 0.7;
    const luz = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    luz.addColorStop(0, `rgba(${COLOR_LUZ}, ${soplo})`);
    luz.addColorStop(0.25, `rgba(${COLOR_ORO}, ${0.5 * soplo})`);
    luz.addColorStop(1, `rgba(${COLOR_ORO}, 0)`);
    ctx.fillStyle = luz;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }

  // 2. La placa, cuadradito a cuadradito (cada uno crece desde su centro)
  const forma = new Path2D();
  const brillo = new Path2D(); // los recién nacidos llevan un brillo de oro
  for (const c of celdas) {
    const f = tramo(progreso, c.t, c.t + 0.06);
    if (f <= 0) continue;
    const lado = f >= 1 ? CELDA + 0.6 : CELDA * f; // enteros se solapan un poco: sin rayas
    forma.rect(cx + c.x + (CELDA - lado) / 2, cy + c.y + (CELDA - lado) / 2, lado, lado);
    if (progreso < c.t + 0.12) brillo.rect(cx + c.x, cy + c.y, CELDA, CELDA);
  }
  capaCtx.clearRect(0, 0, ancho, alto);
  capaCtx.fillStyle = "#fff";
  capaCtx.fill(forma);
  capaCtx.globalCompositeOperation = "source-in";
  capaCtx.drawImage(dibujo, placaX, placaY, placaW, placaH);
  capaCtx.globalCompositeOperation = "source-over";
  ctx.drawImage(capa, 0, 0, ancho, alto);

  lucesCtx.clearRect(0, 0, ancho, alto);
  lucesCtx.fillStyle = `rgba(${COLOR_ORO}, 0.45)`;
  lucesCtx.fill(brillo);
  pintarLuces(dibujo);

  // 3. Los pelos: la punta vuela por la curva y la cola la sigue
  ctx.globalCompositeOperation = "lighter";
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
    ctx.strokeStyle = `rgba(${color}, 0.25)`;
    ctx.lineWidth = 3.2;
    ctx.stroke(camino);
    ctx.strokeStyle = `rgba(${color}, 0.95)`;
    ctx.lineWidth = 1.1;
    ctx.stroke(camino);
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

// =========================================================
// 2. LA ACTIVACIÓN: el bastón que crece
// =========================================================
// Idea clave: el dibujo nuevo se ve dentro de un óvalo que crece con el bastón
// (el bastón lo va "abriendo"). Al llegar al tope el óvalo ya cubre toda la placa.
let chispas = [];

function prepararBaston() {
  const azar = Math.random; // cada activación, chispas distintas
  chispas = Array.from({ length: CHISPAS }, (_, i) => {
    const lado = i % 2 ? 1 : -1;                        // mitad de cada punta
    const angulo = (lado > 0 ? 0 : Math.PI) + (azar() - 0.5) * 2.2; // hacia fuera, abiertas en abanico
    const rapidez = placaH * (1.5 + azar() * 2.5);
    return {
      lado,
      vx: Math.cos(angulo) * rapidez,
      vy: Math.sin(angulo) * rapidez - placaH * 0.8,   // saltan un poco hacia arriba
      vida: 0.3 + azar() * 0.3,
      tam: 1 + azar() * 1.5,
      roja: azar() < 0.3,
    };
  });
}

// El bastón: una barra de oro con los extremos rojos, de cx − largo a cx + largo
function pintarBaston(largo, fuerza) {
  if (largo <= 1 || fuerza <= 0) return;
  const grosor = GROSOR_BASTON * placaH;
  const x0 = cx - largo, y0 = cy - grosor / 2;
  ctx.globalAlpha = fuerza;
  // Resplandor alrededor
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = `rgba(${COLOR_ORO}, 0.25)`;
  ctx.fillRect(x0 - 3, y0 - 3, largo * 2 + 6, grosor + 6);
  ctx.globalCompositeOperation = "source-over";
  // La barra, con luz arriba y sombra abajo (parece redonda)
  const g = ctx.createLinearGradient(0, y0, 0, y0 + grosor);
  g.addColorStop(0, `rgb(${COLOR_LUZ})`);
  g.addColorStop(0.4, `rgb(${COLOR_ORO})`);
  g.addColorStop(1, "rgb(150, 100, 40)");
  ctx.fillStyle = g;
  ctx.fillRect(x0, y0, largo * 2, grosor);
  // Las bandas rojas cerca de cada extremo
  const banda = Math.min(largo * 0.12, placaH * 0.12);
  ctx.fillStyle = `rgb(${COLOR_ROJO})`;
  ctx.fillRect(x0 + banda * 0.4, y0, banda, grosor);
  ctx.fillRect(cx + largo - banda * 1.4, y0, banda, grosor);
  ctx.globalAlpha = 1;
}

function dibujarBaston(segundos) {
  ctx.clearRect(0, 0, ancho, alto);
  const c = limitar(segundos / DURACION_CAMBIO);
  const tope = LARGO_BASTON * placaW;
  const crece = frenar(tramo(c, 0.05, GOLPE));             // el bastón se alarga
  const encoge = suave(tramo(c, GOLPE + 0.1, GOLPE + 0.27));  // y justo después del golpe se recoge (deja leer el texto)
  const largo = tope * crece * (1 - encoge);

  // El temblor del golpe: se apaga enseguida
  const sacudida = 1 - tramo(c, GOLPE, GOLPE + 0.18);
  const tiembla = c >= GOLPE && sacudida > 0;
  const dx = tiembla ? Math.sin(segundos * 90) * TEMBLOR * sacudida : 0;
  const dy = tiembla ? Math.cos(segundos * 70) * TEMBLOR * 0.6 * sacudida : 0;

  // 1. La placa vieja y, dentro del óvalo que abre el bastón, la nueva
  ctx.drawImage(dibujo, placaX + dx, placaY + dy, placaW, placaH);
  const rx = tope * crece * 1.35;
  const ry = rx * (placaH / placaW) * 1.6;
  if (rx > 0) {
    capaCtx.clearRect(0, 0, ancho, alto);
    capaCtx.beginPath();
    capaCtx.ellipse(cx + dx, cy + dy, rx, ry, 0, 0, Math.PI * 2);
    capaCtx.fillStyle = "#fff";
    capaCtx.fill();
    capaCtx.globalCompositeOperation = "source-in";
    capaCtx.drawImage(dibujoActivo, placaX + dx, placaY + dy, placaW, placaH);
    capaCtx.globalCompositeOperation = "source-over";
    ctx.drawImage(capa, 0, 0, ancho, alto);

    // El borde del óvalo brilla en oro mientras se abre (solo sobre el dibujo)
    const borde = 1 - tramo(c, GOLPE, GOLPE + 0.1);
    if (borde > 0) {
      lucesCtx.clearRect(0, 0, ancho, alto);
      lucesCtx.beginPath();
      lucesCtx.ellipse(cx + dx, cy + dy, rx, ry, 0, 0, Math.PI * 2);
      lucesCtx.strokeStyle = `rgba(${COLOR_ORO}, ${0.9 * borde})`;
      lucesCtx.lineWidth = 3;
      lucesCtx.stroke();
      pintarLuces(dibujoActivo);
    }
  }

  // 2. El golpe: un destello de oro sobre toda la placa y una onda que se abre
  const destello = tramo(c, GOLPE, GOLPE + 0.03) * (1 - tramo(c, GOLPE + 0.03, GOLPE + 0.25));
  if (destello > 0) {
    lucesCtx.clearRect(0, 0, ancho, alto);
    lucesCtx.fillStyle = `rgba(${COLOR_ORO}, ${0.35 * destello})`;
    lucesCtx.fillRect(0, 0, ancho, alto);
    pintarLuces(dibujoActivo);
  }
  const onda = tramo(c, GOLPE, GOLPE + 0.35);
  if (onda > 0 && onda < 1) {
    const r = frenar(onda);
    ctx.globalCompositeOperation = "lighter";
    ctx.beginPath();
    ctx.ellipse(cx, cy, tope * (1 + 0.25 * r), placaH * (0.3 + 0.6 * r), 0, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${COLOR_ORO}, ${0.5 * (1 - onda)})`;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
  }

  // 3. El bastón (encima de todo) y un brillo que corre por él mientras crece
  pintarBaston(largo, 1 - tramo(c, GOLPE + 0.2, GOLPE + 0.29));
  if (crece < 1) {
    ctx.globalCompositeOperation = "lighter";
    for (const lado of [-1, 1]) {
      const x = cx + lado * largo;
      const r = placaH * 0.35;
      const luz = ctx.createRadialGradient(x, cy, 0, x, cy, r);
      luz.addColorStop(0, `rgba(${COLOR_LUZ}, 0.9)`);
      luz.addColorStop(1, `rgba(${COLOR_ORO}, 0)`);
      ctx.fillStyle = luz;
      ctx.fillRect(x - r, cy - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = "source-over";
  }

  // 4. Las chispas: saltan de las dos puntas con el golpe y caen
  ctx.globalCompositeOperation = "lighter";
  const edad = segundos - GOLPE * DURACION_CAMBIO;
  if (edad > 0) {
    for (const ch of chispas) {
      const q = edad / ch.vida;
      if (q >= 1) continue;
      const x = cx + ch.lado * tope + ch.vx * edad;
      const y = cy + ch.vy * edad + 0.5 * placaH * 12 * edad * edad; // gravedad
      ctx.fillStyle = `rgba(${ch.roja ? COLOR_ROJO : COLOR_ORO}, ${1 - q})`;
      ctx.fillRect(x - ch.tam / 2, y - ch.tam / 2, ch.tam, ch.tam);
    }
  }
  ctx.globalCompositeOperation = "source-over";
}

// ----- Animación -----
// modo: "" (nada), "invocacion" (apareciendo) o "baston" (activándose)
let modo = "";
let tiempo = 0;   // segundos desde que empezó el modo actual
let anterior = 0;

function animar(ahora) {
  if (!modo) return; // la pararon mientras tanto
  tiempo += Math.min(Math.max((ahora - anterior) / 1000, 0), 0.05);
  anterior = ahora;
  if (modo === "invocacion") {
    if (tiempo >= DURACION) return terminar(); // formada: se ve el dibujo de verdad
    dibujarInvocacion(tiempo / DURACION);
  } else {
    if (tiempo >= DURACION_CAMBIO) return terminar();
    dibujarBaston(tiempo);
  }
  requestAnimationFrame(animar);
}

function empezar(nuevoModo) {
  medir();
  if (nuevoModo === "invocacion") crearInvocacion();
  else prepararBaston();
  const yaAnimaba = modo !== "";
  modo = nuevoModo;
  tiempo = 0;
  barra.dataset.wukongPintando = "";
  if (nuevoModo === "invocacion") dibujarInvocacion(0);
  else dibujarBaston(0);
  if (!yaAnimaba) {
    anterior = performance.now();
    requestAnimationFrame(animar);
  }
}

function terminar() {
  modo = "";
  delete barra.dataset.wukongPintando;
  ctx.clearRect(0, 0, ancho, alto);
}

// ----- Mirar la barra -----
let formada = false;   // ¿ya apareció en esta ocasión?
let cambiada = false;  // ¿ya se activó?

function revisar() {
  const esWukong = barra.dataset.tema === "wukong";
  const estado = barra.dataset.estado;
  if (!esWukong || estado === "oculta") {
    // Se fue (o cambió a otro juego): se para todo y la próxima vez empieza de nuevo
    if (modo) terminar();
    formada = false;
    cambiada = false;
    return;
  }
  // Sin movimiento, o los dibujos aún sin cargar: el CSS pone el dibujo que toca sin animación
  if (sinMovimiento.matches || !cargada(dibujo) || !cargada(dibujoActivo)) return;
  if (estado === "esperando" && !formada) {
    formada = true;
    empezar("invocacion");
  }
  if (estado === "activa" && !cambiada) {
    formada = true;
    cambiada = true;
    empezar("baston"); // si aún se estaba formando, pasa directamente al cambio
  }
}

new MutationObserver(revisar).observe(barra, { attributes: true, attributeFilter: ["data-tema", "data-estado"] });

})();
