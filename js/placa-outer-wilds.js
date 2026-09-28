// =========================================================
// LA PLACA DE OUTER WILDS
// Cuando la barra de viaje (js/barra-viaje.js) aparece con el tema "outer-wilds":
//
// 1. APARECE COMO SU CARTA (js/carta-outer-wilds.js): del centro de la placa
//    se abre un núcleo con rayos y crece un glifo de trazos rectos y a 45°.
//    Por donde pasa un trazo, la placa se enciende; al final se enciende entera
//    desde el centro y el glifo se apaga. Mismos tiempos que la carta.
//
// 2. SE ACTIVA COMO LA LUNA CUÁNTICA ("XVIII · The Moon"): cuando el dragón
//    se posa, alrededor de la placa aparecen copias fantasma que saltan de sitio
//    a golpes (está "en varios sitios a la vez"). Cada copia cambia de "Rumbo" a
//    "Conocer" en su propio momento, y al final todas caen sobre la placa
//    (el "colapso") con un anillo de luz violeta.
//
// Este archivo no toca la barra: solo MIRA sus atributos (data-tema, data-estado)
// y pinta en su lienzo. Mientras pinta, pone data-ow-pintando en la barra para
// que el CSS esconda el dibujo de verdad (css/planetas/outer-wilds.css).
// =========================================================

(() => {

// ----- Ajustes de la aparición (¡prueba a cambiarlos!) -----
const DURACION = 1.9;          // segundos que tarda en formarse (igual que DURACION_ABRIR de la carta)
const RAICES = 14;             // trazos que salen del núcleo
const PASO = 0.1;              // largo de cada tramo del glifo (fracción del alto de la placa)
const RAMIFICAR = 0.22;        // probabilidad de que un trazo se divida en cada tramo
const MAX_TRAMOS = 900;        // límite de tramos (más = glifo más denso)
const RAYOS = 12;              // rayos largos que salen del centro
const ANCHO_ENCENDIDO = 0.24;  // lo ancho que llega a ser un trazo encendido (fracción del alto de la placa)
const NUCLEO_GLIFO = 0.3;      // parte del camino que forma el glifo del centro (no se apaga hasta el final)
const ESTELA = 0.22;           // lo que tarda un trazo en apagarse detrás del frente (fracción del camino)
const RADIO_NUCLEO = 0.12;     // tamaño del núcleo oscuro (fracción del alto de la placa)
const COLOR_GLIFO = "150, 150, 255";  // violeta de la luz, el mismo que la carta
const COLOR_BRILLO = "225, 225, 255"; // el centro de cada trazo, casi blanco
const SEMILLA = 18;            // XVIII: cámbiala y el glifo sale distinto

// ----- Ajustes de la activación (la luna cuántica) -----
const DURACION_CAMBIO = 0.9;   // segundos que dura
const FANTASMAS = 2;           // copias fantasma que saltan alrededor de la placa
const LUZ_FANTASMA = 0.5;      // lo que se ven (0 = nada, 1 = como la placa)
const SEPARAR_X = 0.05;        // cuánto se alejan a los lados (fracción del ancho)
const SEPARAR_Y = 0.1;         // y arriba/abajo (fracción del alto)
const SALTO = 0.07;            // segundos entre salto y salto de las copias
const COLOR_ANILLO = "170, 160, 255"; // el anillo del colapso

// La parte de la placa donde crece el glifo: el cuerpo del marco, sin las estrellas
// de los lados (medido en img/placas/outer-wilds-inicio.webp, de 0 a 1)
const CUERPO = { x0: 0.04, x1: 0.96, y0: 0.22, y1: 0.8 };

// ----- Elementos -----
const barra = document.querySelector(".viaje");
const placa = barra.querySelector(".viaje__placa");
const lienzo = document.createElement("canvas");
lienzo.className = "viaje__glifo-ow";
lienzo.setAttribute("aria-hidden", "true");
barra.querySelector(".viaje__lienzo").append(lienzo);
const ctx = lienzo.getContext("2d");
// Capa aparte donde se prepara "la placa, solo por donde ya pasó el glifo"
const capa = document.createElement("canvas");
const cctx = capa.getContext("2d");
const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)");

// Los mismos dibujos que pone el CSS
const dibujo = new Image();
dibujo.src = "img/placas/outer-wilds-inicio.webp";
const dibujoActivo = new Image();
dibujoActivo.src = "img/placas/outer-wilds-activa.webp";
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

const suave = (x) => x * x * (3 - 2 * x);                // lento al principio y al final
const frenar = (x) => 1 - Math.pow(1 - x, 2);            // rápido al principio, frena al final
const limitar = (x) => Math.min(1, Math.max(0, x));
const tramo = (p, desde, hasta) => limitar((p - desde) / (hasta - desde)); // 0 → 1 entre dos momentos

// ----- Medidas -----
let ancho = 0, alto = 0;                            // tamaño del lienzo (px CSS)
let placaX = 0, placaY = 0, placaW = 0, placaH = 0; // la placa dentro del lienzo
let cx = 0, cy = 0;                                 // centro de la placa
let tramos = [];
let rayos = [];
let distanciaMax = 0;

function medir() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  ancho = lienzo.clientWidth;
  alto = lienzo.clientHeight;
  lienzo.width = capa.width = Math.round(ancho * dpr);
  lienzo.height = capa.height = Math.round(alto * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  placaW = placa.offsetWidth;
  placaH = placa.offsetHeight;
  placaX = (ancho - placaW) / 2; // el lienzo sobresale lo mismo por cada lado (CSS)
  placaY = (alto - placaH) / 2;
  cx = ancho / 2;
  cy = alto / 2;
}

// ----- Inventar el glifo (como en la carta, pero en una placa alargada) -----
const DIRECCIONES = Array.from({ length: 8 }, (_, k) => (k * Math.PI) / 4); // cada 45°
const octante = (angulo) => ((Math.round(angulo / (Math.PI / 4)) % 8) + 8) % 8;
const dentro = (x, y) =>
  x > placaX + CUERPO.x0 * placaW && x < placaX + CUERPO.x1 * placaW &&
  y > placaY + CUERPO.y0 * placaH && y < placaY + CUERPO.y1 * placaH;

function crearGlifo() {
  const azar = crearAzar(SEMILLA);
  const paso = PASO * placaH;
  const radioNucleo = RADIO_NUCLEO * placaH;
  tramos = [];
  distanciaMax = 0;

  const puntas = [];
  for (let i = 0; i < RAICES; i++) {
    const angulo = ((i + azar() * 0.6) / RAICES) * Math.PI * 2;
    puntas.push({ x: cx + Math.cos(angulo) * radioNucleo, y: cy + Math.sin(angulo) * radioNucleo, dir: octante(angulo), d: radioNucleo });
  }

  // Crecen por turnos (primero las puntas cercanas): el glifo se extiende parejo
  while (puntas.length && tramos.length < MAX_TRAMOS) {
    const p = puntas.shift();
    const largo = paso * (0.6 + azar() * 0.8);
    let dir = p.dir;
    let x = p.x + Math.cos(DIRECCIONES[dir]) * largo;
    let y = p.y + Math.sin(DIRECCIONES[dir]) * largo;
    // La placa es mucho más ancha que alta: si el trazo choca arriba o abajo,
    // en vez de morir gira hacia su lado y sigue por el borde (así llega a los extremos)
    if (!dentro(x, y)) {
      dir = p.x < cx ? 4 : 0; // 4 = izquierda, 0 = derecha
      x = p.x + Math.cos(DIRECCIONES[dir]) * largo;
      y = p.y;
      if (!dentro(x, y)) continue; // llegó al extremo: el trazo termina
    }

    tramos.push({ x0: p.x, y0: p.y, x1: x, y1: y, d0: p.d, d1: p.d + largo });
    distanciaMax = Math.max(distanciaMax, p.d + largo);

    // ¿Hacia dónde sigue? Casi siempre recto; a veces gira 45° hacia fuera del centro
    const haciaFuera = octante(Math.atan2(y - cy, x - cx));
    const suerte = azar();
    if (suerte > 0.55 && suerte < 0.8) dir = haciaFuera;
    else if (suerte >= 0.8) dir = (dir + (azar() < 0.5 ? 1 : 7)) % 8;
    const vuelta = Math.min((dir - haciaFuera + 8) % 8, (haciaFuera - dir + 8) % 8);
    if (vuelta > 2) dir = haciaFuera; // nunca vuelve hacia el centro

    if (azar() > 0.015) puntas.push({ x, y, dir, d: p.d + largo }); // a veces se corta: huecos

    // Se divide: una rama nueva sale en ángulo recto (o a 45°) hacia un lado
    if (azar() < RAMIFICAR) {
      const giro = azar() < 0.6 ? 2 : 1;
      const nueva = (dir + (azar() < 0.5 ? giro : 8 - giro)) % 8;
      const vueltaNueva = Math.min((nueva - haciaFuera + 8) % 8, (haciaFuera - nueva + 8) % 8);
      if (vueltaNueva <= 2) puntas.push({ x, y, dir: nueva, d: p.d + largo });
    }
  }

  // Rayos largos: su largo sigue un óvalo con la forma de la placa (más largos a los lados)
  rayos = [];
  for (let i = 0; i < RAYOS; i++) {
    const angulo = ((i + azar() * 0.7) / RAYOS) * Math.PI * 2;
    const c = Math.cos(angulo), s = Math.sin(angulo);
    const ovalo = 1 / Math.hypot(c / (placaW / 2), s / (placaH / 2)); // radio del óvalo en esa dirección
    const hastaBorde = Math.min( // que el rayo no se corte contra el borde del lienzo
      Math.abs(c) > 0.001 ? (cx - 4) / Math.abs(c) : Infinity,
      Math.abs(s) > 0.001 ? (cy - 4) / Math.abs(s) : Infinity
    );
    rayos.push({
      angulo,
      largo: Math.min(hastaBorde, ovalo * (0.8 + azar() * 0.7)),
      nace: azar() * 0.08,
      grosor: 0.8 + azar() * 0.9,
    });
  }
}

// ----- Dibujar un momento de la aparición (lo mismo que la carta) -----
function dibujarGlifo(progreso) {
  ctx.clearRect(0, 0, ancho, alto);

  const u = tramo(progreso, 0.1, 0.8);
  const frente = distanciaMax * (0.6 * u + 0.4 * suave(u));
  const apagarGlifo = 1 - tramo(progreso, 0.74, 0.98); // la luz del glifo se va al final
  const nucleo = tramo(progreso, 0, 0.1) * apagarGlifo;
  const radioNucleo = RADIO_NUCLEO * placaH;

  // 1. El núcleo oscuro con su aro de luz
  if (nucleo > 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, radioNucleo * nucleo, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(4, 3, 12, 0.95)";
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = `rgba(${COLOR_GLIFO}, ${0.9 * nucleo})`;
    ctx.stroke();
  }

  // 2. La placa, solo por donde ya pasó el glifo: en la capa pintamos los trazos
  //    encendidos (anchos) y luego, con "source-in", el dibujo encima
  if (frente > 0) {
    cctx.clearRect(0, 0, ancho, alto);
    cctx.lineCap = "round";
    cctx.strokeStyle = "#fff";
    const grupos = Array.from({ length: 6 }, () => new Path2D()); // por grosor: menos "stroke"
    const anchoMax = ANCHO_ENCENDIDO * placaH;
    for (const t of tramos) {
      if (t.d1 > frente) continue;
      const g = limitar((frente - t.d1) / (distanciaMax * 0.25)); // 0 = recién encendido, 1 = del todo
      if (g <= 0) continue;
      const grupo = Math.min(5, Math.floor(g * 6));
      grupos[grupo].moveTo(t.x0, t.y0);
      grupos[grupo].lineTo(t.x1, t.y1);
    }
    grupos.forEach((camino, i) => {
      cctx.lineWidth = anchoMax * ((i + 1) / 6);
      cctx.stroke(camino);
    });
    // Al final se enciende entera desde el centro: un óvalo con la forma de la placa
    // (1.45 × la mitad de cada lado llega hasta las esquinas)
    const relleno = 1.45 * suave(tramo(progreso, 0.6, 0.96));
    if (relleno > 0) {
      cctx.beginPath();
      cctx.ellipse(cx, cy, (placaW / 2) * relleno, (placaH / 2) * relleno, 0, 0, Math.PI * 2);
      cctx.fillStyle = "#fff";
      cctx.fill();
    }
    cctx.globalCompositeOperation = "source-in";
    cctx.drawImage(dibujo, placaX, placaY, placaW, placaH);
    cctx.globalCompositeOperation = "source-over";
    ctx.drawImage(capa, 0, 0, ancho, alto);
  }

  if (apagarGlifo <= 0) return;

  // A partir de aquí todo es luz: "lighter" suma colores
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";

  // 3. Rayos finos que salen del núcleo
  for (const r of rayos) {
    const q = frenar(tramo(progreso, r.nace, r.nace + 0.22));
    if (q <= 0) continue;
    const x = cx + Math.cos(r.angulo) * r.largo * q;
    const y = cy + Math.sin(r.angulo) * r.largo * q;
    const degradado = ctx.createLinearGradient(cx, cy, x, y);
    degradado.addColorStop(0, `rgba(${COLOR_BRILLO}, ${0.9 * apagarGlifo})`);
    degradado.addColorStop(0.5, `rgba(${COLOR_GLIFO}, ${0.6 * apagarGlifo})`);
    degradado.addColorStop(1, `rgba(${COLOR_GLIFO}, 0)`);
    ctx.strokeStyle = degradado;
    ctx.lineWidth = r.grosor;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  // 4. Los trazos hasta donde llega el frente: brillan al llegar y se apagan detrás,
  //    salvo el glifo del centro, que queda como un sello hasta el final
  const grupos = Array.from({ length: 4 }, () => new Path2D());
  const centroDelGlifo = distanciaMax * NUCLEO_GLIFO;
  for (const t of tramos) {
    if (t.d0 >= frente) continue;
    const q = Math.min(1, (frente - t.d0) / (t.d1 - t.d0));
    const luz = t.d1 < centroDelGlifo ? 1 : 1 - limitar((frente - t.d1) / (distanciaMax * ESTELA));
    if (luz <= 0) continue;
    const grupo = Math.min(3, Math.floor(luz * 4));
    grupos[grupo].moveTo(t.x0, t.y0);
    grupos[grupo].lineTo(t.x0 + (t.x1 - t.x0) * q, t.y0 + (t.y1 - t.y0) * q);
  }
  grupos.forEach((lineas, i) => {
    const luz = ((i + 1) / 4) * apagarGlifo;
    ctx.strokeStyle = `rgba(${COLOR_GLIFO}, ${0.35 * luz})`; // resplandor ancho y tenue
    ctx.lineWidth = 4;
    ctx.stroke(lineas);
    ctx.strokeStyle = `rgba(${COLOR_BRILLO}, ${0.8 * luz})`; // línea fina y brillante
    ctx.lineWidth = 1.2;
    ctx.stroke(lineas);
  });

  ctx.globalCompositeOperation = "source-over";
}

// ----- Dibujar un momento de la activación (la luna cuántica) -----
let fantasmas = []; // cada fantasma: cuándo cambia de dibujo y su propia serie de saltos
const CAMBIA_PLACA = 0.45; // la placa de verdad cambia justo entre los fantasmas

function prepararCopias() {
  const semilla = Math.floor(Math.random() * 1e6); // cada activación salta distinto
  // Uno cambia antes que la placa (0.25) y otro después (0.6); si hay más, repartidos entre medias
  fantasmas = Array.from({ length: FANTASMAS }, (_, i) => ({
    cambia: 0.25 + (0.35 * i) / Math.max(1, FANTASMAS - 1),
    semilla: semilla + i * 7919,
  }));
}

function dibujarCambio(segundos) {
  ctx.clearRect(0, 0, ancho, alto);
  const c = limitar(segundos / DURACION_CAMBIO); // 0 → 1

  // Cuánto se separan las copias: se abren rápido, se quedan y colapsan de golpe en 0.6 → 0.8
  const separacion = frenar(tramo(c, 0, 0.18)) * (1 - suave(tramo(c, 0.6, 0.8)));
  // Saltan a golpes (no se deslizan): la posición solo cambia cada SALTO segundos
  const saltoActual = Math.floor(segundos / SALTO);

  // La placa de verdad se queda quieta y se lee siempre
  ctx.drawImage(c >= CAMBIA_PLACA ? dibujoActivo : dibujo, placaX, placaY, placaW, placaH);

  // Los fantasmas se suman encima con "lighter" (luz sobre luz) y se desvanecen al colapsar
  if (separacion > 0) {
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = LUZ_FANTASMA * separacion;
    for (const fantasma of fantasmas) {
      const azar = crearAzar(fantasma.semilla + saltoActual * 131);
      const dx = (azar() * 2 - 1) * SEPARAR_X * placaW * separacion;
      const dy = (azar() * 2 - 1) * SEPARAR_Y * placaH * separacion;
      const img = c >= fantasma.cambia ? dibujoActivo : dibujo;
      ctx.drawImage(img, placaX + dx, placaY + dy, placaW, placaH);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  // El colapso: un destello sobre la placa y un anillo violeta que se abre desde el centro
  const colapso = tramo(c, 0.72, 1);
  if (colapso > 0 && colapso < 1) {
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.45 * (1 - colapso) * tramo(c, 0.72, 0.8);
    ctx.drawImage(dibujoActivo, placaX, placaY, placaW, placaH); // la placa brilla un instante
    ctx.globalAlpha = 1;
    const r = 0.3 + 1.1 * frenar(colapso); // de 0.3 a 1.4 veces la mitad de la placa
    const luz = 1 - colapso;
    ctx.beginPath();
    ctx.ellipse(cx, cy, (placaW / 2) * r, (placaH / 2) * r, 0, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${COLOR_ANILLO}, ${0.35 * luz})`;
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.strokeStyle = `rgba(${COLOR_BRILLO}, ${0.8 * luz})`;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
  }
}

// ----- Animación -----
// modo: "" (nada), "glifo" (apareciendo) o "cambio" (activándose)
let modo = "";
let tiempo = 0;   // segundos desde que empezó el modo actual
let anterior = 0;

function animar(ahora) {
  if (!modo) return; // la pararon mientras tanto
  tiempo += Math.min(Math.max((ahora - anterior) / 1000, 0), 0.05);
  anterior = ahora;
  if (modo === "glifo") {
    if (tiempo >= DURACION) return terminar(); // formada: se ve el dibujo de verdad
    dibujarGlifo(tiempo / DURACION);
  } else {
    if (tiempo >= DURACION_CAMBIO) return terminar();
    dibujarCambio(tiempo);
  }
  requestAnimationFrame(animar);
}

function empezar(nuevoModo) {
  medir();
  if (nuevoModo === "glifo") crearGlifo();
  else prepararCopias();
  const yaAnimaba = modo !== "";
  modo = nuevoModo;
  tiempo = 0;
  barra.dataset.owPintando = "";
  if (nuevoModo === "glifo") dibujarGlifo(0);
  else dibujarCambio(0);
  if (!yaAnimaba) {
    anterior = performance.now();
    requestAnimationFrame(animar);
  }
}

function terminar() {
  modo = "";
  delete barra.dataset.owPintando;
  ctx.clearRect(0, 0, ancho, alto);
}

// ----- Mirar la barra -----
// MutationObserver avisa cada vez que cambian los atributos de la barra
let formada = false;   // ¿ya apareció en esta ocasión?
let cambiada = false;  // ¿ya se activó?

function revisar() {
  const esOuterWilds = barra.dataset.tema === "outer-wilds";
  const estado = barra.dataset.estado;
  if (!esOuterWilds || estado === "oculta") {
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
    empezar("glifo");
  }
  if (estado === "activa" && !cambiada) {
    formada = true;
    cambiada = true;
    empezar("cambio"); // si aún se estaba formando, pasa directamente al cambio
  }
}

new MutationObserver(revisar).observe(barra, { attributes: true, attributeFilter: ["data-tema", "data-estado"] });

})();
