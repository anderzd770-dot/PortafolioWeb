// =========================================================
// LA PLACA DE ELDEN RING
// Cuando la barra de viaje (js/barra-viaje.js) aparece con el tema "elden-ring":
//
// 1. APARECE CON EL HECHIZO DE SU CARTA (js/carta-elden-ring.js): una chispa en
//    el centro, una pluma de luz dibuja el círculo mágico y salen rayos hacia los
//    lados; donde llega cada rayo nace un círculo (los de los extremos, justo sobre
//    las calaveras de tu dibujo). La placa aparece dentro de los círculos y la luz
//    crece hasta cubrirla. Mismos tiempos que la carta.
//    Como la placa es alargada, los círculos van en FILA (no en cruz): simétricos,
//    sin línea vertical ni arcos, así no se parece al logo del juego.
//
// 2. SE ACTIVA CON LA QUEMADURA DE LA MUERTE: cuando el dragón se posa, un golpe
//    de fuego rojo sacude la placa. El dibujo viejo se chamusca (se ennegrece),
//    arde a manchas con un borde rojo vivo, suben lenguas de fuego rojo y negro
//    (como el aura de la espada de la carta), escamas de ceniza negra y brasas.
//    Debajo queda "Conocer Death".
//
// Este archivo no toca la barra: solo MIRA sus atributos (data-tema, data-estado)
// y pinta en su lienzo. Mientras pinta, pone data-elden-pintando en la barra
// para que el CSS esconda el dibujo de verdad (css/planetas/elden-ring.css).
// =========================================================

(() => {

// ----- Ajustes de la aparición (¡prueba a cambiarlos!) -----
const DURACION = 1.4;          // segundos que tarda en formarse (igual que DURACION_ABRIR de la carta)
const RADIO_SELLO = 0.4;       // tamaño del círculo del centro (fracción del alto de la placa)
const COLA_RAYO = 0.06;        // lo que tarda la cola de cada rayo en seguir a la punta
const ABRIR_CIRCULO = 0.14;    // lo que tarda cada círculo de la fila en crecer cuando llega su rayo
const BRILLO = 1.8;            // cuánto brillan los círculos justo antes de que aparezca la placa
const ESTELA_PLUMA = 0.18;     // largo de la estela de la pluma (fracción de vuelta)
const GIRO_SELLO = 0.8;        // lo que gira el círculo del centro durante el hechizo (radianes)
const PUNTOS = 10;             // puntos de luz entre los dos anillos del centro
const BRASAS = 14;             // chispitas que saltan de la pluma
const POLVO = 30;              // motas de polvo mágico que suben
const ROJAS = 0.25;            // parte de las chispitas rojas
const COLOR_ORO = "255, 190, 98";     // el oro del hechizo (el mismo que la carta)
const COLOR_LUZ = "255, 238, 200";    // el centro, casi blanco, de las líneas
const COLOR_BRASA = "214, 72, 44";    // el rojo de la carta y de la placa
const SEMILLA = 17;

// Los círculos de la fila: x desde el centro (fracción del ancho), radio (fracción del alto)
// y cuándo sale y llega su rayo. Los de fuera caen sobre las calaveras del dibujo
const FILA = [
  { x: -0.25, r: 0.26, sale: 0.3, llega: 0.4 },
  { x: 0.25, r: 0.26, sale: 0.3, llega: 0.4 },
  { x: -0.42, r: 0.21, sale: 0.33, llega: 0.47 },
  { x: 0.42, r: 0.21, sale: 0.33, llega: 0.47 },
];

// ----- Ajustes de la activación (la quemadura de la muerte) -----
const DURACION_CAMBIO = 1.5;   // segundos que dura
const DESHACER = 0.62;         // parte del tiempo que tarda el dibujo viejo en quemarse
const CELDA = 3;               // tamaño (px) de los trocitos en los que se quema
const MANCHAS = 7;             // tamaño de las manchas (en celdas): más = manchas más grandes
const BORDE = 0.09;            // grosor del borde en llamas (en "tiempo" de quemarse)
const CHAMUSCAR = 0.3;         // lo que se ennegrece el dibujo por delante del fuego (en "tiempo")
const LENGUAS = 32;            // lenguas de fuego que suben de la quemadura
const CENIZA = 0.3;            // parte de los trocitos que sueltan ceniza negra o una brasa
const CENIZA_SUBE = 1.3;       // cuánto sube la ceniza (en altos de placa)
const TEMBLOR = 2;             // píxeles que tiembla la placa mientras arde
const COLOR_MUERTE = "226, 66, 42";    // el rojo de las llamas de la espada de la carta
const COLOR_SANGRE = "120, 14, 8";     // rojo oscuro, casi negro
const COLOR_NEGRO = "14, 7, 5";        // el negro de la carta (un poco cálido)

// La parte de la placa con dibujo (sin las puntas de las estrellas), de 0 a 1
const CUERPO = { x0: 0.036, x1: 0.964, y0: 0.2, y1: 0.77 };

// ----- Elementos -----
const barra = document.querySelector(".viaje");
const placa = barra.querySelector(".viaje__placa");
const lienzo = document.createElement("canvas");
lienzo.className = "viaje__hechizo-elden";
lienzo.setAttribute("aria-hidden", "true");
barra.querySelector(".viaje__lienzo").append(lienzo);
const ctx = lienzo.getContext("2d");
// Capas invisibles: una para recortar el dibujo y otra para el brillo del borde
const capa = document.createElement("canvas");
const capaCtx = capa.getContext("2d");
const luces = document.createElement("canvas");
const lucesCtx = luces.getContext("2d");
const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)");

// Los mismos dibujos que pone el CSS
const dibujo = new Image();
dibujo.src = "img/placas/elden-ring-inicio.webp";
const dibujoActivo = new Image();
dibujoActivo.src = "img/placas/elden-ring-activa.webp";
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
let anillos = [];
let fila = [];
let puntos = [];
let brasas = [];
let polvo = [];

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

// =========================================================
// 1. LA APARICIÓN: el hechizo de la carta
// =========================================================

// El círculo del centro no se deforma: solo gira (cada anillo en su sentido)
function moverAnillo(anillo, x, y, momento) {
  const g = anillo.sentido * momento * GIRO_SELLO;
  return [cx + x * Math.cos(g) - y * Math.sin(g), cy + x * Math.sin(g) + y * Math.cos(g)];
}

// Cuándo pasa la pluma por la fracción u de la vuelta (la pluma se mueve con frenar())
function momentoPluma(anillo, u) {
  return anillo.desde + (1 - Math.sqrt(1 - u)) * (anillo.hasta - anillo.desde);
}

function crearHechizo() {
  const azar = crearAzar(SEMILLA);
  const r1 = placaH * RADIO_SELLO;
  anillos = [
    { r: r1, sentido: 1, desde: 0.04, hasta: 0.3 },
    { r: r1 * 0.78, sentido: -1, desde: 0.1, hasta: 0.34 },
  ];

  puntos = [];
  for (let i = 0; i < PUNTOS; i++) {
    const u = (i + 0.5) / PUNTOS;
    puntos.push({ a: -Math.PI / 2 + Math.PI * 2 * u, t: momentoPluma(anillos[0], u) });
  }

  fila = FILA.map((c) => ({ x: c.x * placaW, y: 0, r: c.r * placaH, sale: c.sale, llega: c.llega }));

  brasas = [];
  for (let m = 0; m < BRASAS; m++) {
    const anillo = anillos[azar() < 0.6 ? 0 : 1];
    const u = azar();
    const a = -Math.PI / 2 + anillo.sentido * Math.PI * 2 * u;
    const rapidez = placaH * (0.5 + azar() * 1.1);
    const t0 = momentoPluma(anillo, u);
    const [x, y] = moverAnillo(anillo, Math.cos(a) * anillo.r, Math.sin(a) * anillo.r, t0);
    brasas.push({
      t0, x, y,
      vx: Math.cos(a) * rapidez,
      vy: Math.sin(a) * rapidez,
      vida: 0.2 + azar() * 0.16,
      tam: 1 + azar() * 1.2,
      rojo: azar() < ROJAS,
      giro: (azar() < 0.5 ? -1 : 1) * (3 + azar() * 4),
    });
  }

  polvo = [];
  for (let m = 0; m < POLVO; m++) {
    polvo.push({
      x: (azar() - 0.5) * placaW,
      y: (azar() - 0.3) * placaH,
      t0: 0.15 + azar() * 0.4,
      vida: 0.25 + azar() * 0.15,
      tam: 0.8 + azar() * 1.2,
      fase: azar() * 6.3,
      luz: azar() < 0.4,
    });
  }
}

function circuloDeFila(c, progreso) {
  const s = frenar(tramo(progreso, c.llega, c.llega + ABRIR_CIRCULO));
  return { x: cx + c.x, y: cy + c.y, r: c.r * s, s };
}

// Un rayo de luz: transparente en la cola y brillante en la punta, en tres pasadas
function rayoDeLuz(x0, y0, x1, y1, fuerza) {
  for (const [grosor, color, alfa] of [[6, COLOR_ORO, 0.12], [2.4, COLOR_ORO, 0.45], [1, COLOR_LUZ, 0.9]]) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, `rgba(${color}, 0)`);
    g.addColorStop(1, `rgba(${color}, ${Math.min(1, alfa * fuerza)})`);
    ctx.strokeStyle = g;
    ctx.lineWidth = grosor;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
}

function anguloAnillo(anillo, u, momento) {
  return -Math.PI / 2 + anillo.sentido * (Math.PI * 2 * u + momento * GIRO_SELLO);
}

// Un círculo de luz: tres pasadas del mismo arco (resplandor, halo dorado, centro claro)
function arcoDeLuz(x, y, r, a0, a1, alReves, fuerza) {
  if (r <= 0 || fuerza <= 0) return;
  for (const [grosor, color, alfa] of [[7, COLOR_ORO, 0.08], [2.6, COLOR_ORO, 0.3], [1, COLOR_LUZ, 0.75]]) {
    ctx.strokeStyle = `rgba(${color}, ${Math.min(1, alfa * fuerza)})`;
    ctx.lineWidth = grosor;
    ctx.beginPath();
    ctx.arc(x, y, r, a0, a1, alReves);
    ctx.stroke();
  }
}

function anilloDeLuz(anillo, desde, hasta, fuerza, momento) {
  if (hasta <= desde) return;
  arcoDeLuz(cx, cy, anillo.r, anguloAnillo(anillo, desde, momento), anguloAnillo(anillo, hasta, momento),
    anillo.sentido < 0, fuerza);
}

// Un punto de luz redondo que se difumina hacia fuera
function resplandor(x, y, r, fuerza) {
  if (r <= 0 || fuerza <= 0) return;
  const luz = ctx.createRadialGradient(x, y, 0, x, y, r);
  luz.addColorStop(0, `rgba(${COLOR_LUZ}, ${fuerza})`);
  luz.addColorStop(0.35, `rgba(${COLOR_ORO}, ${0.5 * fuerza})`);
  luz.addColorStop(1, `rgba(${COLOR_ORO}, 0)`);
  ctx.fillStyle = luz;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

function recortarAPlaca(contexto) {
  contexto.beginPath();
  contexto.rect(placaX, placaY, placaW, placaH);
  contexto.clip();
}

function dibujarHechizo(progreso) {
  ctx.clearRect(0, 0, ancho, alto);
  const [grande, pequeno] = anillos;
  const subida = suave(tramo(progreso, 0.52, 0.64)) * (1 - suave(tramo(progreso, 0.64, 0.76)));
  const apagar = 1 - suave(tramo(progreso, 0.68, 0.9));
  const luz = (1 + (BRILLO - 1) * subida) * apagar;

  // 1. La chispa del centro y el aura (alargada a lo ancho, como la placa)
  const chispa = tramo(progreso, 0, 0.07) * (1 - tramo(progreso, 0.12, 0.42));
  if (chispa > 0) resplandor(cx, cy, placaH * 0.8, 0.8 * chispa);
  const aura = 0.14 * tramo(progreso, 0.04, 0.3) * luz;
  if (aura > 0) {
    const alarga = 1 + 3 * frenar(tramo(progreso, 0.4, 0.6));
    const r = grande.r * 1.5;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(alarga, 1);
    const g = ctx.createRadialGradient(0, 0, pequeno.r * 0.6, 0, 0, r);
    g.addColorStop(0, `rgba(${COLOR_ORO}, 0)`);
    g.addColorStop(0.45, `rgba(${COLOR_ORO}, ${Math.min(0.4, aura)})`);
    g.addColorStop(1, `rgba(${COLOR_ORO}, 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();
  }

  // 2. La placa, vista a través de cinco discos (uno por círculo) que luego crecen
  //    hasta cubrirla entera (el del centro llega a las esquinas)
  const llenar = frenar(tramo(progreso, 0.58, 0.72));
  const crecer = suave(tramo(progreso, 0.68, 0.9));
  const esquina = Math.hypot(placaW / 2, placaH / 2) + 2;
  const discos = [];
  if (llenar > 0) {
    discos.push({ x: cx, y: cy, r: grande.r * llenar + (esquina - grande.r) * crecer });
    for (const c of fila) {
      const { x, y, r } = circuloDeFila(c, progreso);
      discos.push({ x, y, r: r * llenar + placaW * 0.2 * crecer });
    }
  }
  if (discos.length) {
    capaCtx.clearRect(0, 0, ancho, alto);
    capaCtx.save();
    recortarAPlaca(capaCtx);
    capaCtx.fillStyle = "#fff";
    capaCtx.beginPath();
    for (const d of discos) {
      capaCtx.moveTo(d.x + d.r, d.y);
      capaCtx.arc(d.x, d.y, d.r, 0, Math.PI * 2); // todos en el mismo sentido: se suman sin agujeros
    }
    capaCtx.fill();
    capaCtx.restore();
    capaCtx.globalCompositeOperation = "source-in";
    capaCtx.drawImage(dibujo, placaX, placaY, placaW, placaH);
    capaCtx.globalCompositeOperation = "source-over";
    ctx.drawImage(capa, 0, 0, ancho, alto);
  }

  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";

  // 3. El borde de los discos mientras crecen
  const borde = (1 - crecer) * llenar * 0.5;
  if (borde > 0.01 && crecer > 0) {
    ctx.save();
    recortarAPlaca(ctx);
    for (const d of discos) arcoDeLuz(d.x, d.y, d.r, 0, Math.PI * 2, false, borde);
    ctx.restore();
  }

  // 4. El círculo del centro: la pluma lo dibuja como un cometa con estela
  for (const anillo of anillos) {
    const h = frenar(tramo(progreso, anillo.desde, anillo.hasta));
    if (h <= 0 || luz <= 0) continue;
    anilloDeLuz(anillo, 0, h, 0.7 * luz, progreso);
    if (h < 1) {
      for (let k = 0; k < 6; k++) {
        const desde = Math.max(0, h - (ESTELA_PLUMA * (6 - k)) / 6);
        const hasta = Math.max(0, h - (ESTELA_PLUMA * (5 - k)) / 6);
        anilloDeLuz(anillo, desde, hasta, 0.12 + k * 0.08, progreso);
      }
      const a = anguloAnillo(anillo, h, progreso);
      resplandor(cx + Math.cos(a) * anillo.r, cy + Math.sin(a) * anillo.r, 7, 1);
    }
  }

  // 5. Puntos de luz entre los dos anillos del centro
  const medio = (grande.r + pequeno.r) / 2;
  puntos.forEach((punto, i) => {
    const q = frenar(tramo(progreso, punto.t, punto.t + 0.08));
    if (q <= 0 || luz <= 0) return;
    const late = 0.75 + 0.25 * Math.sin(progreso * 12 + i * 1.7);
    const a = punto.a + grande.sentido * progreso * GIRO_SELLO;
    resplandor(cx + Math.cos(a) * medio, cy + Math.sin(a) * medio, 3 * q, Math.min(1, 0.8 * q * late * luz));
  });

  // 6. Los rayos de luz hacia los lados (la cola alcanza a la punta al llegar)
  for (const c of fila) {
    const punta = frenar(tramo(progreso, c.sale, c.llega));
    const cola = frenar(tramo(progreso, c.sale + COLA_RAYO, c.llega + COLA_RAYO));
    if (punta <= 0 || cola >= 1 || luz <= 0) continue;
    rayoDeLuz(cx + c.x * cola, cy, cx + c.x * punta, cy, luz);
    if (punta < 1) resplandor(cx + c.x * punta, cy, 5, 1);
  }

  // 7. Los círculos de la fila: destello al llegar su rayo y crecen en su sitio
  for (const c of fila) {
    const { x, y, r, s } = circuloDeFila(c, progreso);
    const destello = tramo(progreso, c.llega, c.llega + 0.1);
    if (destello > 0 && destello < 1) resplandor(x, y, 4 + 12 * (1 - destello), 0.9 * (1 - destello));
    if (s <= 0 || luz <= 0) continue;
    arcoDeLuz(x, y, r, 0, Math.PI * 2, false, (0.4 + 0.3 * s) * luz);
  }

  // 8. El momento de más brillo: un resplandor dentro de cada círculo
  if (subida > 0) {
    resplandor(cx, cy, grande.r * 0.9, 0.35 * subida);
    for (const c of fila) {
      const { x, y, r } = circuloDeFila(c, progreso);
      resplandor(x, y, r * 0.9, 0.25 * subida);
    }
  }

  // 9. Brasas: salen de la pluma en espiral
  for (const b of brasas) {
    const edad = progreso - b.t0;
    const q = edad / b.vida;
    if (q <= 0 || q >= 1) continue;
    const dx = b.vx * edad * (1 - q * 0.5);
    const dy = b.vy * edad * (1 - q * 0.5);
    const g = b.giro * edad;
    const x = b.x + dx * Math.cos(g) - dy * Math.sin(g);
    const y = b.y + dx * Math.sin(g) + dy * Math.cos(g) - placaH * 2 * edad * edad;
    ctx.fillStyle = `rgba(${b.rojo ? COLOR_BRASA : COLOR_ORO}, ${1 - q})`;
    ctx.fillRect(x - b.tam / 2, y - b.tam / 2, b.tam, b.tam);
  }

  // 10. Polvo mágico que sube meciéndose
  for (const m of polvo) {
    const q = (progreso - m.t0) / m.vida;
    if (q <= 0 || q >= 1) continue;
    const x = cx + m.x + Math.sin(q * 5 + m.fase) * placaH * 0.06;
    const y = cy + m.y - q * placaH * 0.5;
    ctx.fillStyle = `rgba(${m.luz ? COLOR_LUZ : COLOR_ORO}, ${0.8 * Math.sin(Math.PI * q)})`;
    ctx.fillRect(x - m.tam / 2, y - m.tam / 2, m.tam, m.tam);
  }

  // 11. El destello en cruz de la chispa (más largo a lo ancho)
  if (chispa > 0) {
    const largo = placaW * 0.3 * frenar(chispa);
    const horizontal = ctx.createLinearGradient(cx - largo, 0, cx + largo, 0);
    horizontal.addColorStop(0, `rgba(${COLOR_LUZ}, 0)`);
    horizontal.addColorStop(0.5, `rgba(${COLOR_LUZ}, ${0.9 * chispa})`);
    horizontal.addColorStop(1, `rgba(${COLOR_LUZ}, 0)`);
    ctx.fillStyle = horizontal;
    ctx.fillRect(cx - largo, cy - 0.6, largo * 2, 1.2);
    const corto = placaH * 0.5 * frenar(chispa);
    const vertical = ctx.createLinearGradient(0, cy - corto, 0, cy + corto);
    vertical.addColorStop(0, `rgba(${COLOR_LUZ}, 0)`);
    vertical.addColorStop(0.5, `rgba(${COLOR_LUZ}, ${0.9 * chispa})`);
    vertical.addColorStop(1, `rgba(${COLOR_LUZ}, 0)`);
    ctx.fillStyle = vertical;
    ctx.fillRect(cx - 0.6, cy - corto, 1.2, corto * 2);
  }

  ctx.globalCompositeOperation = "source-over";
}

// =========================================================
// 2. LA ACTIVACIÓN: la quemadura de la muerte
// =========================================================
// Idea clave: cada trocito (celda) tiene un "umbral" entre 0 y 1. Un número, el
// avance, sube de 0 a 1: las celdas con umbral menor que el avance ya se quemaron
// (se ve el dibujo nuevo). Justo por encima está el borde en llamas, y un poco más
// allá la zona chamuscada, que se va ennegreciendo antes de que llegue el fuego.
// Los umbrales salen de un "ruido suave" (valores al azar en una rejilla gruesa,
// mezclados entre vecinos): así se quema a manchas y no a puntitos sueltos.
let celdas = [];
let cenizas = [];
let lenguas = [];

function prepararCeniza() {
  const azar = Math.random; // cada activación, manchas distintas
  const columnas = Math.ceil(placaW / CELDA);
  const filas = Math.ceil(placaH / CELDA);
  // Rejilla gruesa de valores al azar (una cada MANCHAS celdas)
  const gruesaW = Math.ceil(columnas / MANCHAS) + 2;
  const gruesaH = Math.ceil(filas / MANCHAS) + 2;
  const gruesa = Array.from({ length: gruesaW * gruesaH }, () => azar());
  const valor = (i, j) => gruesa[j * gruesaW + i];
  function ruido(col, fila) {
    const gx = col / MANCHAS, gy = fila / MANCHAS;
    const i = Math.floor(gx), j = Math.floor(gy);
    const fx = suave(gx - i), fy = suave(gy - j);
    const arriba = valor(i, j) + (valor(i + 1, j) - valor(i, j)) * fx;
    const abajo = valor(i, j + 1) + (valor(i + 1, j + 1) - valor(i, j + 1)) * fx;
    return arriba + (abajo - arriba) * fy;
  }

  celdas = [];
  cenizas = [];
  const enElCuerpo = []; // celdas del cuerpo de la placa: de ellas salen las lenguas de fuego
  for (let fila = 0; fila < filas; fila++) {
    for (let col = 0; col < columnas; col++) {
      const umbral = 0.9 * ruido(col, fila) + 0.1 * azar();
      const x = placaX + col * CELDA;
      const y = placaY + fila * CELDA;
      const celda = { x, y, umbral };
      celdas.push(celda);
      // Solo sueltan ceniza las celdas del cuerpo de la placa (no el aire de alrededor)
      const fx = (col + 0.5) / columnas, fy = (fila + 0.5) / filas;
      if (!(fx > CUERPO.x0 && fx < CUERPO.x1 && fy > CUERPO.y0 && fy < CUERPO.y1)) continue;
      enElCuerpo.push(celda);
      if (azar() < CENIZA) {
        const negra = azar() < 0.65; // casi todo escamas negras; el resto, brasas rojas
        cenizas.push({
          celda,
          vida: 0.45 + azar() * 0.35,                          // segundos
          sube: placaH * CENIZA_SUBE * (0.5 + azar() * 0.5),
          viento: placaH * (0.1 + azar() * 0.4),               // se la lleva un poco a la derecha
          fase: azar() * 6.3,
          tam: negra ? 1.5 + azar() * 2.5 : 1 + azar() * 1.2,  // las escamas, más grandes
          negra,
        });
      }
    }
  }
  // Los umbrales van de 0 a 1 de verdad (el ruido nunca llega del todo a los extremos)
  let menor = Infinity, mayor = -Infinity;
  for (const c of celdas) { menor = Math.min(menor, c.umbral); mayor = Math.max(mayor, c.umbral); }
  for (const c of celdas) c.umbral = (c.umbral - menor) / (mayor - menor || 1);

  // Las lenguas de fuego: cada una sale de una celda del cuerpo cuando esa celda arde
  lenguas = Array.from({ length: LENGUAS }, () => ({
    celda: enElCuerpo[Math.floor(azar() * enElCuerpo.length)],
    vida: 0.3 + azar() * 0.25,
    alto: placaH * (0.7 + azar() * 0.9),
    ancho: 3 + azar() * 4,
    fase: azar() * 6.3,
    ondas: 1.5 + azar() * 1.5,
  }));
}

// Pinta en la capa de luces un dibujo teñido de un color y lo suma al lienzo
function tenirRojo(img, dx, dy, fuerza) {
  if (fuerza <= 0) return;
  lucesCtx.clearRect(0, 0, ancho, alto);
  lucesCtx.drawImage(img, placaX + dx, placaY + dy, placaW, placaH);
  lucesCtx.globalCompositeOperation = "source-in"; // el rojo solo donde hay dibujo
  lucesCtx.fillStyle = `rgb(${COLOR_MUERTE})`;
  lucesCtx.fillRect(0, 0, ancho, alto);
  lucesCtx.globalCompositeOperation = "source-over";
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = fuerza;
  ctx.drawImage(luces, 0, 0, ancho, alto);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

// Una lengua de fuego: sube desde (x, y) ondulando, ancha abajo y en punta arriba.
// Dos pasadas: el rojo de fuera (luz, "lighter") y un corazón negro dentro, como el aura de la espada
function trazarLengua(l, x, y, q) {
  // Crece y luego se encoge; nunca más alta que el hueco hasta el borde de arriba del lienzo
  const alto = Math.min(l.alto, y - 6) * Math.sin(Math.PI * Math.min(1, q * 1.3));
  if (alto < 2) return;
  const puntos = [];
  for (let i = 0; i <= 12; i++) {
    const f = i / 12; // 0 = base, 1 = punta
    const vaiven = Math.sin(f * Math.PI * l.ondas - q * 9 + l.fase) * placaH * 0.12 * f;
    puntos.push([x + vaiven, y - alto * f, l.ancho * (1 - f) * (1 - q * 0.5)]);
  }
  const trazar = (escala) => {
    const camino = new Path2D();
    camino.moveTo(puntos[0][0] - puntos[0][2] * escala, puntos[0][1]);
    for (const [px, py, g] of puntos) camino.lineTo(px - g * escala, py);
    for (let i = puntos.length - 1; i >= 0; i--) camino.lineTo(puntos[i][0] + puntos[i][2] * escala, puntos[i][1]);
    camino.closePath();
    return camino;
  };
  const degradado = ctx.createLinearGradient(x, y, x, y - alto);
  degradado.addColorStop(0, `rgba(${COLOR_MUERTE}, ${1 - q * 0.8})`);
  degradado.addColorStop(0.6, `rgba(${COLOR_MUERTE}, ${0.65 * (1 - q)})`);
  degradado.addColorStop(1, `rgba(${COLOR_SANGRE}, 0)`);
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = degradado;
  ctx.fill(trazar(1));
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = `rgba(${COLOR_NEGRO}, ${0.7 * (1 - q)})`;
  ctx.fill(trazar(0.35));
}

function dibujarCeniza(segundos) {
  ctx.clearRect(0, 0, ancho, alto);
  const tiempoQuemar = DURACION_CAMBIO * DESHACER;
  const q = limitar(segundos / tiempoQuemar);
  // El avance recorre de -BORDE a 1: al final ya no queda ni el borde
  const avance = -BORDE + (1 + BORDE) * suave(q);
  // Tiembla mientras arde, más fuerte en medio de la quemadura
  const fuerza = Math.sin(Math.PI * q);
  const dx = Math.sin(segundos * 73) * TEMBLOR * fuerza;
  const dy = Math.cos(segundos * 57) * TEMBLOR * 0.6 * fuerza;

  // 1. El dibujo nuevo debajo, entero
  ctx.drawImage(dibujoActivo, placaX + dx, placaY + dy, placaW, placaH);

  // 2. Encima, el viejo, solo en las celdas que aún no se han quemado. Las que están
  //    en la zona chamuscada se ennegrecen (más cuanto más cerca del fuego), en 3 tonos
  const quedan = new Path2D();
  const chamusco = [new Path2D(), new Path2D(), new Path2D()];
  const vivo = new Path2D();   // el borde pegado al avance: rojo vivo
  const oscuro = new Path2D(); // detrás: rojo oscuro
  for (const c of celdas) {
    if (c.umbral <= avance) continue;
    quedan.rect(c.x + dx, c.y + dy, CELDA, CELDA);
    const d = c.umbral - avance; // lo lejos que está del fuego
    if (d < BORDE * 0.45) vivo.rect(c.x + dx, c.y + dy, CELDA, CELDA);
    else if (d < BORDE) oscuro.rect(c.x + dx, c.y + dy, CELDA, CELDA);
    const negro = 1 - (d - BORDE * 0.45) / CHAMUSCAR; // 1 junto al fuego, 0 lejos
    if (negro > 0) chamusco[Math.min(2, Math.floor(negro * 3))].rect(c.x + dx, c.y + dy, CELDA, CELDA);
  }
  capaCtx.clearRect(0, 0, ancho, alto);
  capaCtx.fillStyle = "#fff";
  capaCtx.fill(quedan);
  capaCtx.globalCompositeOperation = "source-in";
  capaCtx.drawImage(dibujo, placaX + dx, placaY + dy, placaW, placaH);
  // source-atop: el negro solo cae encima del dibujo, nunca en el aire
  capaCtx.globalCompositeOperation = "source-atop";
  chamusco.forEach((zona, i) => {
    capaCtx.fillStyle = `rgba(${COLOR_NEGRO}, ${0.45 + i * 0.25})`;
    capaCtx.fill(zona);
  });
  capaCtx.globalCompositeOperation = "source-over";
  ctx.drawImage(capa, 0, 0, ancho, alto);

  // 3. El borde en llamas: rojo vivo pegado al fuego y rojo oscuro detrás,
  //    solo donde el dibujo viejo tiene algo (destination-in: nada ardiendo en el aire)
  lucesCtx.clearRect(0, 0, ancho, alto);
  lucesCtx.fillStyle = `rgba(${COLOR_SANGRE}, 0.9)`;
  lucesCtx.fill(oscuro);
  lucesCtx.fillStyle = `rgba(${COLOR_MUERTE}, 1)`;
  lucesCtx.fill(vivo);
  lucesCtx.globalCompositeOperation = "destination-in";
  lucesCtx.drawImage(dibujo, placaX + dx, placaY + dy, placaW, placaH);
  lucesCtx.globalCompositeOperation = "source-over";
  ctx.globalCompositeOperation = "lighter";
  ctx.drawImage(luces, 0, 0, ancho, alto);
  ctx.globalCompositeOperation = "source-over";

  // 4. El golpe del principio: la placa entera se enciende en rojo un instante
  tenirRojo(dibujo, dx, dy, 0.7 * (1 - tramo(segundos, 0.03, 0.25)) * tramo(segundos, 0, 0.03));

  // 5. Las lenguas de fuego: salen de su celda cuando arde y suben ondulando
  for (const l of lenguas) {
    const nace = momentoDeAvance(l.celda.umbral) * tiempoQuemar;
    const vida = Math.min(l.vida, DURACION_CAMBIO - nace - 0.02);
    const edad = (segundos - nace) / vida;
    if (edad <= 0 || edad >= 1) continue;
    trazarLengua(l, l.celda.x + CELDA / 2 + dx, l.celda.y + CELDA / 2 + dy, edad);
  }

  // 6. La ceniza: escamas negras que suben girando y brasas rojas que se apagan
  for (const m of cenizas) {
    const nace = momentoDeAvance(m.celda.umbral) * tiempoQuemar;
    const vida = Math.min(m.vida, DURACION_CAMBIO - nace - 0.02); // que se apague antes del final
    const e = (segundos - nace) / vida;
    if (e <= 0 || e >= 1) continue;
    const x = m.celda.x + m.viento * frenar(e) + Math.sin(e * 6 + m.fase) * placaH * 0.05;
    const y = m.celda.y - m.sube * frenar(e);
    // Aparece de golpe, se apaga poco a poco y se desvanece antes de tocar el borde de arriba
    const alfa = (1 - e) * Math.min(1, e * 8) * limitar((y - 4) / 24);
    if (m.negra) {
      // Una escama: un cuadrito que se aplasta al girar (su alto cambia con un seno)
      const giro = Math.abs(Math.sin(e * 10 + m.fase));
      ctx.fillStyle = `rgba(${COLOR_NEGRO}, ${alfa})`;
      ctx.fillRect(x - m.tam / 2, y - (m.tam * giro) / 2, m.tam, Math.max(0.6, m.tam * giro));
    } else {
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = `rgba(${COLOR_MUERTE}, ${alfa})`;
      ctx.fillRect(x - m.tam / 2, y - m.tam / 2, m.tam, m.tam);
      ctx.globalCompositeOperation = "source-over";
    }
  }
}

// El momento (de 0 a 1 del tiempo de deshacerse) en que el avance pasa por un umbral.
// El avance sube con suave(), así que buscamos al revés con unos pocos pasos (búsqueda binaria)
function momentoDeAvance(umbral) {
  let bajo = 0, arriba = 1;
  for (let i = 0; i < 14; i++) {
    const medio = (bajo + arriba) / 2;
    if (-BORDE + (1 + BORDE) * suave(medio) < umbral) bajo = medio;
    else arriba = medio;
  }
  return bajo;
}

// ----- Animación -----
// modo: "" (nada), "hechizo" (apareciendo) o "ceniza" (activándose)
let modo = "";
let tiempo = 0;   // segundos desde que empezó el modo actual
let anterior = 0;

function animar(ahora) {
  if (!modo) return; // la pararon mientras tanto
  tiempo += Math.min(Math.max((ahora - anterior) / 1000, 0), 0.05);
  anterior = ahora;
  if (modo === "hechizo") {
    if (tiempo >= DURACION) return terminar(); // formada: se ve el dibujo de verdad
    dibujarHechizo(tiempo / DURACION);
  } else {
    if (tiempo >= DURACION_CAMBIO) return terminar();
    dibujarCeniza(tiempo);
  }
  requestAnimationFrame(animar);
}

function empezar(nuevoModo) {
  medir();
  if (nuevoModo === "hechizo") crearHechizo();
  else prepararCeniza();
  const yaAnimaba = modo !== "";
  modo = nuevoModo;
  tiempo = 0;
  barra.dataset.eldenPintando = "";
  if (nuevoModo === "hechizo") dibujarHechizo(0);
  else dibujarCeniza(0);
  if (!yaAnimaba) {
    anterior = performance.now();
    requestAnimationFrame(animar);
  }
}

function terminar() {
  modo = "";
  delete barra.dataset.eldenPintando;
  ctx.clearRect(0, 0, ancho, alto);
}

// ----- Mirar la barra -----
let formada = false;   // ¿ya apareció en esta ocasión?
let cambiada = false;  // ¿ya se activó?

function revisar() {
  const esElden = barra.dataset.tema === "elden-ring";
  const estado = barra.dataset.estado;
  if (!esElden || estado === "oculta") {
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
    empezar("hechizo");
  }
  if (estado === "activa" && !cambiada) {
    formada = true;
    cambiada = true;
    empezar("ceniza"); // si aún se estaba formando, pasa directamente al cambio
  }
}

new MutationObserver(revisar).observe(barra, { attributes: true, attributeFilter: ["data-tema", "data-estado"] });

})();
