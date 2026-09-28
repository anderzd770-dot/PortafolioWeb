// =========================================================
// LA CARTA DE ELDEN RING: UN HECHIZO DE ORO
// Al apuntar al planeta de Elden Ring, su carta aparece en el mismo sitio
// que las otras cartas, conjurada con un hechizo de círculos de luz dorada.
// (El dibujo es propio: cinco círculos en cruz, simétricos, sin la línea
// vertical ni los arcos del logo del juego. Solo toma el estilo de la luz de oro.)
//
// Pasos (según "progreso", de 0 = cerrada a 1 = formada):
//   1. La chispa: un punto de luz en el centro con un destello en cruz.
//   2. El círculo mágico: una "pluma" de luz dibuja dos círculos (uno en cada
//      sentido) con puntos de luz entre ellos. No se deforma: solo gira despacio.
//   3. Del centro salen cuatro rayos de luz hacia los lados, arriba y abajo; donde
//      llega cada rayo nace un círculo que crece: dos pequeños
//      a los lados y dos arriba y abajo, cada uno un poco encima del primero.
//   4. Todos los círculos brillan con fuerza y la carta aparece dentro de ellos.
//   5. La luz de dentro de los círculos crece hasta cubrir la carta entera
//      mientras los círculos se apagan: cuando la carta está, ya no se ven.
// Al cerrar pasa lo mismo al revés.
//
// Idea clave: la carta se ve a través de cinco discos (uno por círculo).
// Primero cada disco llena su círculo; luego todos crecen a la vez y,
// como el del centro llega hasta las esquinas, al final cubren la carta entera.
// =========================================================

(() => {

// ----- Ajustes (¡prueba a cambiarlos!) -----
const DURACION_ABRIR = 1.4;    // segundos que tarda en formarse
const DURACION_CERRAR = 0.6;   // segundos que tarda en desaparecer
const RADIO_SELLO = 0.34;      // tamaño del círculo grande (fracción del ancho de la carta)
const TAM_LATERAL = 0.5;       // tamaño de los círculos de los lados (fracción del grande)
const TAM_VERTICAL = 0.7;      // tamaño de los círculos de arriba y abajo (fracción del grande)
const SEPARA_LATERAL = 0.95;   // lo lejos del centro que quedan los de los lados (fracción del radio grande)
const SEPARA_VERTICAL = 1.45;  // lo lejos del centro que quedan los de arriba y abajo
const COLA_RAYO = 0.06;         // lo que tarda la cola de cada rayo en seguir a la punta: más alto = rayos más largos
const ABRIR_CIRCULO = 0.14;     // lo que tarda cada círculo de la cruz en crecer cuando llega su rayo
const BRILLO = 1.8;            // cuánto brillan los círculos justo antes de que aparezca la carta
const ESTELA_PLUMA = 0.18;     // largo de la estela brillante de la pluma que dibuja el círculo (fracción de vuelta)
const GIRO_SELLO = 0.8;        // lo que gira el círculo durante el hechizo (radianes)
const PUNTOS = 12;             // puntos de luz entre los dos círculos del centro
const BRASAS = 16;             // chispitas sueltas que saltan de la pluma mientras dibuja
const POLVO = 36;              // motas de polvo mágico que suben flotando
const ROJAS = 0.25;            // parte de las chispitas que son rojas, como las llamas de la carta
const COLOR_ORO = "255, 190, 98";     // el oro del hechizo
const COLOR_LUZ = "255, 238, 200";    // el centro, casi blanco, de las líneas
const COLOR_BRASA = "214, 72, 44";    // el rojo de la carta
const ESPERA_APUNTAR = 150;    // milisegundos apuntando antes de sacarla (como las otras cartas)
const SEMILLA = 17;            // el número de la carta: cámbiala y las chispitas salen distintas

// ----- Elementos -----
const planeta = document.querySelector(".planeta--elden-ring");
const boton = planeta?.querySelector(".planeta__enlace");
const portal = document.querySelector(".portal--elden");
if (!boton || !portal) return;
const carta = portal.querySelector(".carta");
const cara = carta.querySelector(".carta__cara");
const lienzo = portal.querySelector(".portal__lienzo");
const ctx = lienzo.getContext("2d");
// Un segundo lienzo invisible donde se "recorta" la carta con los discos de luz
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
const suave = (x) => x * x * (3 - 2 * x);          // lento al principio y al final
const limitar = (x) => Math.min(1, Math.max(0, x));
const tramo = (p, desde, hasta) => limitar((p - desde) / (hasta - desde)); // 0 → 1 entre dos momentos

// ----- Medidas -----
let ancho = 0;
let alto = 0;
let cx = 0;          // centro de la carta dentro del lienzo
let cy = 0;
let cartaW = 0;
let cartaH = 0;
let anillos = [];    // los dos círculos del centro (los dibuja la pluma)
let cruz = [];       // los cuatro círculos que salen del centro
let puntos = [];     // los puntos de luz entre los dos círculos del centro
let brasas = [];
let polvo = [];

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

// El círculo mágico no se deforma: solo gira (cada anillo en su sentido)
function moverAnillo(anillo, x, y, momento) {
  const g = anillo.sentido * momento * GIRO_SELLO;
  const cos = Math.cos(g);
  const sin = Math.sin(g);
  return [cx + x * cos - y * sin, cy + x * sin + y * cos];
}

// Cuándo pasa la pluma de un círculo por la fracción u de su vuelta
// (la pluma se mueve con frenar(), así que se deshace esa curva)
function momentoPluma(anillo, u) {
  return anillo.desde + (1 - Math.sqrt(1 - u)) * (anillo.hasta - anillo.desde);
}

function crearHechizo() {
  const azar = crearAzar(SEMILLA);
  const r1 = cartaW * RADIO_SELLO;
  const r2 = r1 * 0.78;

  // ----- El círculo mágico: la pluma dibuja el grande (reloj) y luego el pequeño (al revés)
  anillos = [
    { r: r1, sentido: 1, desde: 0.04, hasta: 0.3 },
    { r: r2, sentido: -1, desde: 0.1, hasta: 0.34 },
  ];

  // Puntos de luz entre los dos círculos: se encienden cuando pasa la pluma del grande
  puntos = [];
  for (let i = 0; i < PUNTOS; i++) {
    const u = (i + 0.5) / PUNTOS;
    puntos.push({ a: -Math.PI / 2 + Math.PI * 2 * u, t: momentoPluma(anillos[0], u) });
  }

  // ----- Los cuatro círculos en cruz: dónde está su centro (x, y desde el centro de la carta),
  // su radio, cuándo sale del centro el rayo de luz que lleva hasta ahí (sale)
  // y cuándo llega (llega): en ese momento nace el círculo. Los de los lados van primero.
  cruz = [
    { x: -r1 * SEPARA_LATERAL, y: 0, r: r1 * TAM_LATERAL, sale: 0.3, llega: 0.4 },
    { x: r1 * SEPARA_LATERAL, y: 0, r: r1 * TAM_LATERAL, sale: 0.3, llega: 0.4 },
    { x: 0, y: -r1 * SEPARA_VERTICAL, r: r1 * TAM_VERTICAL, sale: 0.33, llega: 0.45 },
    { x: 0, y: r1 * SEPARA_VERTICAL, r: r1 * TAM_VERTICAL, sale: 0.33, llega: 0.45 },
  ];

  // ----- Brasas: chispitas que saltan de la pluma mientras dibuja los círculos.
  // Salen en espiral: su camino va girando (giro) mientras vuelan.
  brasas = [];
  for (let m = 0; m < BRASAS; m++) {
    const anillo = anillos[azar() < 0.6 ? 0 : 1];
    const u = azar();
    const a = -Math.PI / 2 + anillo.sentido * Math.PI * 2 * u;
    const rapidez = cartaW * (0.15 + azar() * 0.35);
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

  // ----- Polvo mágico: motas repartidas por la carta que suben despacio meciéndose
  polvo = [];
  for (let m = 0; m < POLVO; m++) {
    polvo.push({
      x: (azar() - 0.5) * cartaW,
      y: (azar() - 0.3) * cartaH,
      t0: 0.15 + azar() * 0.4,       // aparece entre 0.15 y 0.55
      vida: 0.25 + azar() * 0.15,    // y se apaga como muy tarde a 0.95, antes de que termine la carta
      tam: 0.8 + azar() * 1.2,
      fase: azar() * 6.3,
      luz: azar() < 0.4,
    });
  }
}

// Dónde está un círculo de la cruz y qué radio tiene ahora: nace en su sitio
// cuando llega su rayo de luz y crece desde su centro
function circuloDeCruz(c, progreso) {
  const s = frenar(tramo(progreso, c.llega, c.llega + ABRIR_CIRCULO));
  return { x: cx + c.x, y: cy + c.y, r: c.r * s, s };
}

// Un rayo de luz: una línea que va de (x0, y0) a (x1, y1), transparente en la cola
// y brillante en la punta (un degradado a lo largo de la línea), en tres pasadas
function rayoDeLuz(x0, y0, x1, y1, fuerza) {
  const pasadas = [
    [6, COLOR_ORO, 0.12],
    [2.4, COLOR_ORO, 0.45],
    [1, COLOR_LUZ, 0.9],
  ];
  for (const [grosor, color, alfa] of pasadas) {
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

// ----- Dibujar los círculos de luz -----
// El ángulo (en el lienzo) de la fracción u de la vuelta de un anillo del centro, ya girado
function anguloAnillo(anillo, u, momento) {
  return -Math.PI / 2 + anillo.sentido * (Math.PI * 2 * u + momento * GIRO_SELLO);
}

// Un círculo de luz son tres pasadas del mismo arco, de ancho y flojo a fino y fuerte:
// un resplandor amplio, un halo dorado y un centro casi blanco.
// Así el borde de la luz se difumina y parece más suave que una línea.
// (x, y, r) = centro y radio; a0 → a1 = trozo del arco; alReves = sentido contrario al reloj
function arcoDeLuz(x, y, r, a0, a1, alReves, fuerza) {
  if (r <= 0 || fuerza <= 0) return;
  const pasadas = [
    [7, COLOR_ORO, 0.08],
    [2.6, COLOR_ORO, 0.3],
    [1, COLOR_LUZ, 0.75],
  ];
  for (const [grosor, color, alfa] of pasadas) {
    ctx.strokeStyle = `rgba(${color}, ${Math.min(1, alfa * fuerza)})`;
    ctx.lineWidth = grosor;
    ctx.beginPath();
    ctx.arc(x, y, r, a0, a1, alReves);
    ctx.stroke();
  }
}

// Un trozo de un anillo del centro, desde la fracción "desde" hasta "hasta" de su vuelta
function anilloDeLuz(anillo, desde, hasta, fuerza, momento) {
  if (hasta <= desde) return;
  arcoDeLuz(cx, cy, anillo.r, anguloAnillo(anillo, desde, momento), anguloAnillo(anillo, hasta, momento),
    anillo.sentido < 0, fuerza);
}

// Un punto de luz redondo que se difumina hacia fuera
function resplandor(x, y, r, fuerza) {
  const luz = ctx.createRadialGradient(x, y, 0, x, y, r);
  luz.addColorStop(0, `rgba(${COLOR_LUZ}, ${fuerza})`);
  luz.addColorStop(0.35, `rgba(${COLOR_ORO}, ${0.5 * fuerza})`);
  luz.addColorStop(1, `rgba(${COLOR_ORO}, 0)`);
  ctx.fillStyle = luz;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

// Recorta lo que se dibuje a partir de aquí al rectángulo de la carta
function recortarACarta(contexto) {
  contexto.beginPath();
  contexto.rect(cx - cartaW / 2, cy - cartaH / 2, cartaW, cartaH);
  contexto.clip();
}

// ----- Dibujar un momento del hechizo -----
function dibujar(progreso) {
  ctx.clearRect(0, 0, ancho, alto);

  const formada = progreso >= 1;
  portal.classList.toggle("portal--formada", formada);
  if (formada) return;

  const [grande, pequeno] = anillos;
  // Cómo brillan los círculos: normal → brillan con fuerza (0.52–0.64) → se apagan
  // mientras aparece la carta (0.68–0.9). Cuando la carta está, ya no se ven.
  const subida = suave(tramo(progreso, 0.52, 0.64)) * (1 - suave(tramo(progreso, 0.64, 0.76)));
  const apagar = 1 - suave(tramo(progreso, 0.68, 0.9));
  const luz = (1 + (BRILLO - 1) * subida) * apagar;

  // 1. La chispa del centro y el aura: resplandores suaves detrás de todo
  const chispa = tramo(progreso, 0, 0.07) * (1 - tramo(progreso, 0.12, 0.42));
  if (chispa > 0) {
    const r = cartaW * 0.3;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgba(${COLOR_LUZ}, ${0.8 * chispa})`);
    g.addColorStop(0.2, `rgba(${COLOR_ORO}, ${0.35 * chispa})`);
    g.addColorStop(1, `rgba(${COLOR_ORO}, 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  // El aura crece con los círculos de la cruz: de redonda a alargada (más alta que ancha)
  const aura = 0.14 * tramo(progreso, 0.04, 0.3) * luz;
  if (aura > 0) {
    const alarga = 1 + 0.6 * frenar(tramo(progreso, 0.45, 0.6));
    const r = grande.r * 1.5;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, alarga);
    const g = ctx.createRadialGradient(0, 0, pequeno.r * 0.6, 0, 0, r);
    g.addColorStop(0, `rgba(${COLOR_ORO}, 0)`);
    g.addColorStop(0.45, `rgba(${COLOR_ORO}, ${Math.min(0.4, aura)})`);
    g.addColorStop(1, `rgba(${COLOR_ORO}, 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();
  }

  // 2. La carta, vista a través de cinco discos: uno por círculo.
  //    llenar: cada disco llena su círculo (la carta aparece DENTRO de los círculos)
  //    crecer: todos crecen a la vez; el del centro llega a las esquinas y cubre la carta.
  const llenar = frenar(tramo(progreso, 0.58, 0.72));
  const crecer = suave(tramo(progreso, 0.68, 0.9));
  const esquina = Math.hypot(cartaW / 2, cartaH / 2) + 2;
  const discos = [];
  if (llenar > 0) {
    discos.push({ x: cx, y: cy, r: grande.r * llenar + (esquina - grande.r) * crecer });
    for (const c of cruz) {
      const { x, y, r } = circuloDeCruz(c, progreso);
      discos.push({ x, y, r: r * llenar + cartaW * 0.5 * crecer });
    }
  }
  capaCtx.clearRect(0, 0, ancho, alto);
  if (discos.length) {
    capaCtx.save();
    recortarACarta(capaCtx); // nada fuera de la carta
    capaCtx.fillStyle = "#fff";
    capaCtx.beginPath();
    for (const d of discos) {
      capaCtx.moveTo(d.x + d.r, d.y);
      capaCtx.arc(d.x, d.y, d.r, 0, Math.PI * 2); // todos en el mismo sentido: se suman sin agujeros
    }
    capaCtx.fill();
    capaCtx.restore();
    if (cara.complete && cara.naturalWidth) {
      capaCtx.globalCompositeOperation = "source-in";
      capaCtx.drawImage(cara, cx - cartaW / 2, cy - cartaH / 2, cartaW, cartaH);
      capaCtx.globalCompositeOperation = "source-over";
    }
    ctx.drawImage(capa, 0, 0, ancho, alto);
  }

  // A partir de aquí todo suma luz ("lighter"): el oro brilla sobre la carta y el fondo.
  // Donde los círculos se cruzan, la luz se suma y brilla más.
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";

  // 3. El borde de los discos mientras crecen: una onda de luz que se apaga al cubrir la carta
  const borde = (1 - crecer) * llenar * 0.5;
  if (borde > 0.01 && crecer > 0) {
    ctx.save();
    recortarACarta(ctx);
    for (const d of discos) arcoDeLuz(d.x, d.y, d.r, 0, Math.PI * 2, false, borde);
    ctx.restore();
  }

  // 4. El círculo del centro: la pluma dibuja cada anillo como un cometa. Lo ya dibujado
  //    brilla suave y, detrás de la pluma, una estela se va apagando poco a poco
  //    (6 trozos, cada uno más brillante cuanto más cerca de la pluma).
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

  // 5. Puntos de luz entre los dos anillos del centro: se encienden al pasar la pluma,
  //    laten despacio y giran con el círculo grande
  const medio = (grande.r + pequeno.r) / 2;
  for (let i = 0; i < puntos.length; i++) {
    const punto = puntos[i];
    const q = frenar(tramo(progreso, punto.t, punto.t + 0.08));
    if (q <= 0 || luz <= 0) continue;
    const late = 0.75 + 0.25 * Math.sin(progreso * 12 + i * 1.7);
    const a = punto.a + grande.sentido * progreso * GIRO_SELLO;
    resplandor(cx + Math.cos(a) * medio, cy + Math.sin(a) * medio, 3.5 * q, Math.min(1, 0.8 * q * late * luz));
  }

  // 6. Los cuatro rayos de luz: salen del centro hacia donde nacerá cada círculo.
  //    La punta va delante y la cola la sigue un poco después (COLA_RAYO): al llegar,
  //    la cola alcanza la punta y el rayo "se mete" en el círculo que nace.
  for (const c of cruz) {
    const punta = frenar(tramo(progreso, c.sale, c.llega));
    const cola = frenar(tramo(progreso, c.sale + COLA_RAYO, c.llega + COLA_RAYO));
    if (punta <= 0 || cola >= 1 || luz <= 0) continue;
    rayoDeLuz(cx + c.x * cola, cy + c.y * cola, cx + c.x * punta, cy + c.y * punta, luz);
    if (punta < 1) resplandor(cx + c.x * punta, cy + c.y * punta, 5, 1);
  }

  // 7. Los cuatro círculos de la cruz: cuando llega su rayo, un destello en su centro
  //    y el círculo crece desde ahí, quedándose un poco encima del grande
  for (const c of cruz) {
    const { x, y, r, s } = circuloDeCruz(c, progreso);
    const destello = tramo(progreso, c.llega, c.llega + 0.1);
    if (destello > 0 && destello < 1) resplandor(x, y, 4 + 12 * (1 - destello), 0.9 * (1 - destello));
    if (s <= 0 || luz <= 0) continue;
    arcoDeLuz(x, y, r, 0, Math.PI * 2, false, (0.4 + 0.3 * s) * luz);
  }

  // 8. El destello del brillo: justo cuando los círculos brillan más, un resplandor
  //    en el centro de cada uno
  if (subida > 0) {
    resplandor(cx, cy, grande.r * 0.9, 0.35 * subida);
    for (const c of cruz) {
      const { x, y, r } = circuloDeCruz(c, progreso);
      resplandor(x, y, r * 0.9, 0.25 * subida);
    }
  }

  // 9. Brasas: salen disparadas de la pluma en espiral, frenan y suben un poco
  for (const b of brasas) {
    const edad = progreso - b.t0;
    const q = edad / b.vida;
    if (q <= 0 || q >= 1) continue;
    const dx = b.vx * edad * (1 - q * 0.5);
    const dy = b.vy * edad * (1 - q * 0.5);
    const g = b.giro * edad; // el camino se va torciendo: espiral
    const x = b.x + dx * Math.cos(g) - dy * Math.sin(g);
    const y = b.y + dx * Math.sin(g) + dy * Math.cos(g) - cartaW * 0.6 * edad * edad;
    ctx.fillStyle = `rgba(${b.rojo ? COLOR_BRASA : COLOR_ORO}, ${1 - q})`;
    ctx.fillRect(x - b.tam / 2, y - b.tam / 2, b.tam, b.tam);
  }

  // 10. Polvo mágico: sube despacio meciéndose de lado a lado, se enciende y se apaga
  for (const m of polvo) {
    const q = (progreso - m.t0) / m.vida;
    if (q <= 0 || q >= 1) continue;
    const x = cx + m.x + Math.sin(q * 5 + m.fase) * cartaW * 0.03;
    const y = cy + m.y - q * cartaH * 0.14;
    ctx.fillStyle = `rgba(${m.luz ? COLOR_LUZ : COLOR_ORO}, ${0.8 * Math.sin(Math.PI * q)})`;
    ctx.fillRect(x - m.tam / 2, y - m.tam / 2, m.tam, m.tam);
  }

  // 11. El destello en cruz de la chispa del centro (líneas finas que se desvanecen en las puntas)
  if (chispa > 0) {
    const largo = cartaW * 0.45 * frenar(chispa);
    const horizontal = ctx.createLinearGradient(cx - largo, 0, cx + largo, 0);
    horizontal.addColorStop(0, `rgba(${COLOR_LUZ}, 0)`);
    horizontal.addColorStop(0.5, `rgba(${COLOR_LUZ}, ${0.9 * chispa})`);
    horizontal.addColorStop(1, `rgba(${COLOR_LUZ}, 0)`);
    ctx.fillStyle = horizontal;
    ctx.fillRect(cx - largo, cy - 0.6, largo * 2, 1.2);
    const corto = largo * 0.6;
    const vertical = ctx.createLinearGradient(0, cy - corto, 0, cy + corto);
    vertical.addColorStop(0, `rgba(${COLOR_LUZ}, 0)`);
    vertical.addColorStop(0.5, `rgba(${COLOR_LUZ}, ${0.9 * chispa})`);
    vertical.addColorStop(1, `rgba(${COLOR_LUZ}, 0)`);
    ctx.fillStyle = vertical;
    ctx.fillRect(cx - 0.6, cy - corto, 1.2, corto * 2);
  }

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

function mostrarCartaElden(abrir) {
  boton.setAttribute("aria-expanded", abrir); // avisa a los lectores de pantalla
  if ((abrir ? 1 : 0) === objetivo) return;
  objetivo = abrir ? 1 : 0;

  if (abrir) {
    portal.classList.add("portal--visible");
    if (progreso === 0) {
      medir();
      crearHechizo();
    }
    // Una carta a la vez (todas salen en el mismo sitio): avisamos a las otras para que se guarden
    document.dispatchEvent(new CustomEvent("carta-abierta", { detail: "elden-ring" }));
  }

  // Con "reducir movimiento": sin hechizo, aparece o desaparece de golpe
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

// ----- Cuándo se abre y se cierra (como las cartas de los otros planetas) -----
// Con ratón: apuntar al planeta la saca y quitar el ratón la guarda.
// En móvil: un toque la saca y otro (o tocar fuera) la guarda.
// Con teclado: Enter o Espacio la sacan y Escape la guarda.
let esperaApuntar = null;
let punteroPulsado = "";

boton.addEventListener("pointerenter", (evento) => {
  if (evento.pointerType !== "mouse") return;
  clearTimeout(esperaApuntar);
  esperaApuntar = setTimeout(() => mostrarCartaElden(true), ESPERA_APUNTAR);
});

boton.addEventListener("pointerleave", (evento) => {
  if (evento.pointerType !== "mouse") return;
  clearTimeout(esperaApuntar);
  mostrarCartaElden(false);
});

boton.addEventListener("pointerdown", (evento) => {
  punteroPulsado = evento.pointerType;
});

boton.addEventListener("click", (evento) => {
  // orbita.js marca el clic como "cancelado" si la persona estaba arrastrando la órbita
  if (evento.defaultPrevented) return;
  const delTeclado = evento.detail === 0;
  if (!delTeclado && punteroPulsado === "mouse") return; // con ratón ya se encarga apuntar
  mostrarCartaElden(objetivo === 0);
});

document.addEventListener("click", (evento) => {
  if (!boton.contains(evento.target)) mostrarCartaElden(false);
});
document.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape") mostrarCartaElden(false);
});

// Si se abre otra carta (la de Ludwig o la de otro planeta), esta se guarda
document.addEventListener("carta-abierta", (evento) => {
  if (evento.detail === "elden-ring") return;
  clearTimeout(esperaApuntar);
  mostrarCartaElden(false);
});

// Si cambia el tamaño de la ventana con la carta abierta, lo recolocamos todo
window.addEventListener("resize", () => {
  if (progreso > 0) {
    medir();
    crearHechizo();
    dibujar(progreso);
  }
});

})();
