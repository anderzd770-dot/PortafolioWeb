// =========================================================
// TÍTULO "Anderswelt" DIBUJADO CON CUCHILLAS
// Cada letra no sale de una fuente: está hecha con "cuchillas",
// trazos con forma de hoja que son finos en las puntas y gruesos
// en el medio (estilo cybersigilism). Este archivo convierte la
// lista de trazos de cada letra en formas SVG.
// =========================================================

// Todo va dentro de (() => { ... })() para que sus nombres (LETRAS, SEPARACION...)
// no choquen con los de los otros scripts: cada script tiene su propio "espacio".
(() => {

// ----- Las letras -----
// Cada letra mide 100 de alto (0 = arriba de la "A", 100 = línea de base)
// y lo que se sale por arriba o por abajo son espinas.
// ancho: cuánto sitio ocupa la letra antes de la siguiente.
// Las espinas nacen DENTRO de otro trazo y salen curvándose: así parecen parte de la letra.
// Cada trazo:
//   p:    el camino por el centro del trazo. Los dos primeros números son el
//         punto de inicio; luego van de 6 en 6 (control 1, control 2, punto final),
//         igual que la orden "C" de los <path> de SVG.
//   g:    grosor máximo.
//   pico: dónde está la parte más gruesa (0 = al principio, 1 = al final).
//         Un pico pequeño deja una punta larga y fina al final: una espina.
const LETRAS = {
  A: { ancho: 84, trazos: [
    { p: [-4,122, 8,110, 14,90, 20,70, 28,40, 36,8, 54,-18], g: 17, pico: 0.45 },        // pierna izquierda: sube curvada hasta el cuerno
    { p: [44,4, 56,30, 66,62, 70,86, 72,100, 78,110, 92,112], g: 15, pico: 0.35 },       // pierna derecha: nace dentro de la otra y acaba en un latigazo
    { p: [12,72, 30,60, 54,58, 70,62, 80,64, 88,58, 94,48], g: 8, pico: 0.4 },          // barra que se escapa hacia arriba
    { p: [22,66, 20,54, 14,46, 4,42, -2,40, -8,34, -10,26], g: 7, pico: 0.3 },          // espina curva
  ]},
  n: { ancho: 64, trazos: [
    { p: [0,30, 8,34, 12,40, 13,52, 14,72, 12,92, 6,120], g: 15, pico: 0.35 },
    { p: [12,64, 16,40, 34,30, 46,36, 56,42, 54,62, 53,80, 52,96, 56,108, 68,116], g: 14, pico: 0.45 }, // arco + pierna
    { p: [24,38, 30,32, 36,24, 38,10], g: 6, pico: 0.25 },
  ]},
  d: { ancho: 68, trazos: [
    { p: [52,54, 40,36, 10,38, 8,66, 6,94, 32,108, 50,90], g: 12, pico: 0.5 },           // la panza
    { p: [10,76, 6,86, 0,92, -10,94], g: 6, pico: 0.25 },
    { p: [70,-24, 56,-18, 52,0, 52,24, 52,60, 54,90, 48,120], g: 16, pico: 0.55 },       // el palo, que arriba se curva como un cuerno
    { p: [52,92, 56,104, 62,110, 76,112], g: 7, pico: 0.2 },
  ]},
  e: { ancho: 60, trazos: [
    { p: [6,70, 22,68, 40,66, 50,60, 56,48, 40,34, 24,38, 8,42, 4,62, 8,78, 12,96, 36,108, 62,92], g: 12, pico: 0.5 }, // de un solo trazo
    { p: [30,37, 40,34, 50,28, 58,16], g: 6, pico: 0.25 },
  ]},
  r: { ancho: 52, trazos: [
    { p: [4,32, 10,36, 13,44, 13,56, 13,76, 12,96, 6,120], g: 15, pico: 0.35 },
    { p: [13,70, 14,48, 26,34, 42,34, 50,34, 54,40, 58,46], g: 11, pico: 0.4 },
    { p: [12,98, 8,106, 2,112, -10,112], g: 6, pico: 0.25 },
  ]},
  s: { ancho: 54, trazos: [
    { p: [56,34, 40,26, 8,30, 10,50, 12,66, 46,64, 46,86, 46,108, 14,112, -6,98], g: 15, pico: 0.5 },
    { p: [30,62, 20,66, 12,74, 8,88], g: 6, pico: 0.25 },
  ]},
  w: { ancho: 96, trazos: [
    { p: [-4,26, 4,34, 10,60, 16,82, 20,98, 24,106, 26,110], g: 14, pico: 0.4 },
    { p: [24,112, 30,80, 40,50, 46,14], g: 11, pico: 0.35 },                             // sube hasta la espina del centro
    { p: [44,40, 48,64, 54,88, 62,110], g: 13, pico: 0.5 },
    { p: [20,98, 14,104, 8,106, -2,106], g: 5, pico: 0.25 },
    { p: [62,112, 68,80, 78,50, 98,28, 102,24, 104,18, 100,12], g: 12, pico: 0.35 },   // acaba en un gancho
  ]},
  l: { ancho: 40, trazos: [
    { p: [-2,-20, 10,-30, 20,-18, 20,4, 20,40, 18,74, 12,98, 10,108, 22,116, 40,104], g: 16, pico: 0.4 }, // cuerno + palo + cola
    { p: [18,52, 12,44, 6,40, -2,38], g: 6, pico: 0.25 },
  ]},
  t: { ancho: 60, trazos: [
    { p: [24,-10, 28,20, 28,60, 26,84, 25,100, 32,112, 50,112, 56,112, 60,106, 62,98], g: 16, pico: 0.4 },
    { p: [-6,40, 10,48, 40,46, 62,28], g: 10, pico: 0.5 },
    { p: [27,70, 34,66, 40,60, 44,50], g: 6, pico: 0.25 },
  ]},
};

const TEXTO = "Anderswelt";
const SEPARACION = 4;   // espacio extra entre letras
const GROSOR = 0.98;     // multiplica el grosor de todas las cuchillas (1 = como están en la lista)

// El grosor del metal, igual que la L del centro: copias oscuras apiladas detrás de
// cada letra, cada una un poco más abajo. Más capas o más paso = letras más gruesas.
const CAPAS_CANTO = 4;
const PASO_CANTO = [0.5, 1.3]; // cuánto baja cada copia (x, y), en unidades del dibujo

// ----- Choques con las estrellas -----
// Cuando una estrella del fondo (js/fondo-estrellas.js) entra en una letra, estalla en píxeles.
const CELDA = 4;               // tamaño de los píxeles de la explosión (el cielo usa 3)
const CHISPAS = 24;            // píxeles que salen volando en el choque más fuerte
const VELOCIDAD_CHISPAS = 240; // qué rápido salen (px por segundo)
const VIDA_CHISPAS = 0.9;      // cuánto duran (segundos)
const EMPUJE_LETRA = 5;        // cuánto retrocede la letra con el golpe
const COLORES_CLIC = ["#ffffff", "#000000"]; // chispas del clic: se turnan blanco y negro, como en el dragón

// ----- Estrella que sigue al ratón (o al dedo) -----
// Donde apuntas, las letras brillan con una estrella en cruz de píxeles blancos.
const BRAZO_ESTRELLA = 5;        // largo de cada brazo de la cruz, en píxeles de la rejilla
const PARPADEO = 0.25;           // cuánto titila la estrella (0 = luz fija)
const VIDA_ESTELA = 0.3;         // cuánto dura la estela detrás del cursor, en segundos (0 = sin estela)
const SOLO_EN_LAS_LETRAS = true; // true: la luz solo se ve encima de las letras · false: la estrella entera

// Grosor a lo largo del trazo (t va de 0 a 1): 0 en las puntas y 1 en el pico
function perfil(t, pico) {
  // Los exponentes deciden la forma: más alto = puntas más largas y finas, como agujas
  // (1.1 y 1.8: afiladas como las cuchillas del dragón; antes 0.9 y 1.4)
  // Math.max(0, ...) evita números negativos, que romperían la forma (NaN)
  if (t < pico) return Math.pow(Math.max(0, Math.sin(Math.PI / 2 * t / pico)), 1.1);
  return Math.pow(Math.max(0, Math.cos(Math.PI / 2 * (t - pico) / (1 - pico))), 1.8);
}

// Recorre las curvas del trazo y devuelve muchos puntos seguidos por su centro
function puntosDelCamino(p) {
  const puntos = [];
  const PASOS = 28; // puntos por curva: más = más suave
  for (let i = 2; i + 5 < p.length; i += 6) {
    const x0 = p[i - 2], y0 = p[i - 1];
    const [ax, ay, bx, by, x1, y1] = p.slice(i, i + 6);
    for (let k = (i === 2 ? 0 : 1); k <= PASOS; k++) {
      const u = k / PASOS, v = 1 - u;
      // Fórmula de la curva de Bézier cúbica (la misma que usa SVG)
      puntos.push([
        v * v * v * x0 + 3 * v * v * u * ax + 3 * v * u * u * bx + u * u * u * x1,
        v * v * v * y0 + 3 * v * v * u * ay + 3 * v * u * u * by + u * u * u * y1,
      ]);
    }
  }
  return puntos;
}

// Convierte un trazo en el contorno de una cuchilla: a cada punto del centro
// le sumamos medio grosor hacia cada lado (en perpendicular al camino).
function cuchilla(trazo) {
  const puntos = puntosDelCamino(trazo.p);

  // Distancia recorrida hasta cada punto, para saber en qué parte del trazo estamos
  const recorrido = [0];
  for (let i = 1; i < puntos.length; i++) {
    recorrido.push(recorrido[i - 1] + Math.hypot(puntos[i][0] - puntos[i - 1][0], puntos[i][1] - puntos[i - 1][1]));
  }
  const total = recorrido[recorrido.length - 1];

  const ladoA = [], ladoB = [];
  puntos.forEach(([x, y], i) => {
    // Dirección del camino en este punto y su perpendicular (nx, ny)
    const antes = puntos[Math.max(0, i - 1)], despues = puntos[Math.min(puntos.length - 1, i + 1)];
    const dx = despues[0] - antes[0], dy = despues[1] - antes[1];
    const largo = Math.hypot(dx, dy) || 1;
    const nx = -dy / largo, ny = dx / largo;

    const medio = trazo.g * GROSOR * perfil(recorrido[i] / total, trazo.pico) / 2;
    ladoA.push([x + nx * medio, y + ny * medio]);
    ladoB.push([x - nx * medio, y - ny * medio]);
  });

  // Ida por un lado y vuelta por el otro = contorno cerrado
  let contorno = ladoA.concat(ladoB.reverse());

  // Todas las cuchillas se dibujan girando en el mismo sentido: así, donde dos se
  // cruzan, SVG las suma en vez de abrir un agujero
  let area = 0;
  contorno.forEach((a, i) => {
    const b = contorno[(i + 1) % contorno.length];
    area += a[0] * b[1] - b[0] * a[1];
  });
  if (area < 0) contorno = contorno.reverse();

  return "M" + contorno.map(([x, y]) => x.toFixed(1) + " " + y.toFixed(1)).join("L") + "Z";
}

// ----- Montar el título -----
const titulo = document.querySelector(".titulo");
const dibujo = titulo && titulo.querySelector(".titulo__dibujo");

if (dibujo) {
  const NS = "http://www.w3.org/2000/svg";
  const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)");
  const contenedor = dibujo.querySelector(".titulo__letras");
  const letras = []; // { grupo, brillo, forma, centro } de cada letra, para los choques
  let x = 0;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

  // Crea un <path> con su clase y su forma
  function crearPath(clase, d) {
    const path = document.createElementNS(NS, "path");
    path.setAttribute("class", clase);
    path.setAttribute("d", d);
    return path;
  }

  [...TEXTO].forEach((caracter, n) => {
    const letra = LETRAS[caracter];
    const grupo = document.createElementNS(NS, "g");
    grupo.setAttribute("class", "titulo__letra");
    grupo.style.setProperty("--n", n); // su número, para que aparezcan una tras otra

    let d = "";
    for (const trazo of letra.trazos) {
      // Movemos el trazo a su sitio: sumamos x a las coordenadas horizontales (las pares)
      const movido = { ...trazo, p: trazo.p.map((v, i) => (i % 2 === 0 ? v + x : v)) };
      d += cuchilla(movido);

      // Para ajustar el tamaño del dibujo a lo que ocupan las letras
      for (const [px, py] of puntosDelCamino(movido.p)) {
        minX = Math.min(minX, px); maxX = Math.max(maxX, px);
        minY = Math.min(minY, py); maxY = Math.max(maxY, py);
      }
    }

    // Canto: de la copia más lejana (más oscura) a la más cercana
    for (let capa = CAPAS_CANTO; capa >= 1; capa--) {
      const canto = crearPath("titulo__canto", d);
      canto.style.setProperty("--capa", capa);
      canto.setAttribute("transform", `translate(${PASO_CANTO[0] * capa} ${PASO_CANTO[1] * capa})`);
      grupo.append(canto);
    }
    // Filo de luz: un trazo alrededor de TODAS las cuchillas, pero dibujado DEBAJO del cromo.
    // Así el cromo tapa las líneas de dentro (donde se cruzan las cuchillas) y solo asoma el borde de fuera.
    grupo.append(crearPath("titulo__filo", d));
    grupo.append(crearPath("titulo__base", d));    // la cara de cromo
    const brillo = crearPath("titulo__brillo", d); // capa blanca invisible: se enciende con los golpes
    grupo.append(brillo);

    contenedor.append(grupo);
    // Path2D: la misma forma, pero para que JavaScript pueda preguntar "¿este punto está dentro?"
    letras.push({ grupo, brillo, forma: new Path2D(d), centro: [x + letra.ancho / 2, 60] });
    x += letra.ancho + SEPARACION;
  });

  // El "marco" del dibujo: lo que ocupan las letras más un margen para el canto y el brillo
  const margen = 10;
  dibujo.setAttribute("viewBox",
    `${minX - margen} ${minY - margen} ${maxX - minX + margen * 2} ${maxY - minY + margen * 2}`);

  // Ya está dibujado: el CSS esconde el texto normal y enseña el dibujo
  titulo.classList.add("titulo--dibujado");

  // Si la persona pidió menos movimiento, paramos el cromo que fluye (animación SVG)
  if (sinMovimiento.matches) dibujo.pauseAnimations();

  // ----- ¿Qué letra hay en este punto de la pantalla? -----
  // Un lienzo que nunca se ve, solo para usar isPointInPath ("¿está el punto dentro de la forma?")
  const probador = document.createElement("canvas").getContext("2d");
  let medida = null;

  // Todas las letras juntas en una sola forma: sirve de "molde" para recortar la luz del cursor
  const todasLasLetras = new Path2D();
  letras.forEach((l) => todasLasLetras.addPath(l.forma));

  // Dónde está el dibujo en pantalla. Se mide una vez por fotograma aunque
  // fondo-estrellas.js pregunte por cientos de estrellas.
  function medir() {
    if (!medida) {
      medida = { caja: dibujo.getBoundingClientRect(), matriz: dibujo.getScreenCTM().inverse() };
      requestAnimationFrame(() => { medida = null; });
    }
    return medida;
  }

  // Devuelve la letra que hay en (px, py) de la pantalla, o null
  function letraEn(px, py) {
    const { caja, matriz } = medir();
    // Descarte rápido: si está fuera del rectángulo del título, no hace falta mirar las letras
    if (px < caja.left || px > caja.right || py < caja.top || py > caja.bottom) return null;
    // Pasamos el punto de píxeles de pantalla a las unidades del dibujo
    const p = new DOMPoint(px, py).matrixTransform(matriz);
    return letras.find((l) => probador.isPointInPath(l.forma, p.x, p.y)) || null;
  }

  // ----- La letra reacciona -----
  // brillo: de 0 a 1 · golpe: desde dónde vino (en unidades del dibujo), o null si no empuja
  function reaccionar(letra, brillo, golpe) {
    letra.brillo.animate([{ opacity: brillo }, { opacity: 0 }], { duration: 600, easing: "ease-out" });
    if (!golpe || sinMovimiento.matches) return;
    // Retrocede alejándose del golpe y vuelve con un pequeño rebote
    const dx = letra.centro[0] - golpe.x, dy = letra.centro[1] - golpe.y;
    const largo = Math.hypot(dx, dy) || 1;
    const mover = `translate(${dx / largo * EMPUJE_LETRA}px, ${dy / largo * EMPUJE_LETRA}px)`;
    letra.grupo.animate([{ transform: mover }, { transform: "none" }],
      { duration: 500, easing: "cubic-bezier(0.2, 1.6, 0.4, 1)" });
  }

  // ----- Explosiones de píxeles -----
  const lienzo = titulo.querySelector(".titulo__chispas");
  const ctx = lienzo.getContext("2d");
  let chispas = [];   // píxeles que salen volando
  let destellos = []; // cruces de luz en el punto del choque
  let animando = false;
  let antes = 0;
  let dpr = 1;        // píxeles reales por cada píxel CSS (pantallas retina = 2)

  // La estrella del cursor: x, y en píxeles de la pantalla; luz de 0 (apagada) a 1
  const estrella = { x: 0, y: 0, luz: 0, encima: false };
  let estela = [];    // puntos por donde pasó el cursor: { x, y, edad }

  // El lienzo se ajusta al tamaño del título (por si cambió la ventana) y devuelve dónde está
  function ajustarLienzo() {
    const caja = lienzo.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (lienzo.width !== Math.round(caja.width * dpr) || lienzo.height !== Math.round(caja.height * dpr)) {
      lienzo.width = Math.round(caja.width * dpr);
      lienzo.height = Math.round(caja.height * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return caja;
  }

  // Pone en marcha el bucle de dibujo si estaba parado
  function arrancar() {
    if (animando) return;
    animando = true;
    antes = performance.now();
    requestAnimationFrame(animarChispas);
  }

  // Explosión en el punto (px, py) de la pantalla, con el color de la estrella.
  // fuerza (de 0 a 1): las estrellas pequeñas hacen un chispazo, las grandes una explosión
  // colores: los colores que se turnan las chispas (por defecto, el de la estrella y blanco)
  function explotar(px, py, color, fuerza = 1, colores = [color, "#dff6fa"]) {
    if (sinMovimiento.matches) return;
    const letra = letraEn(px, py);
    // Solo los choques fuertes empujan la letra; los flojos solo la hacen brillar
    const golpe = fuerza > 0.5 ? new DOMPoint(px, py).matrixTransform(medir().matriz) : null;
    if (letra) reaccionar(letra, 0.3 + fuerza * 0.6, golpe);

    const caja = ajustarLienzo();
    const x = px - caja.left, y = py - caja.top; // punto dentro del lienzo
    const cuantas = Math.max(3, Math.round(CHISPAS * fuerza));
    for (let i = 0; i < cuantas; i++) {
      const angulo = Math.random() * Math.PI * 2;
      const velocidad = VELOCIDAD_CHISPAS * (0.4 + fuerza * 0.6) * (0.3 + Math.random() * 0.7);
      chispas.push({
        x, y,
        vx: Math.cos(angulo) * velocidad,
        vy: Math.sin(angulo) * velocidad,
        edad: 0,
        vida: VIDA_CHISPAS * (0.5 + Math.random() * 0.5),
        color: colores[i % colores.length], // se van turnando los colores de la lista
      });
    }
    destellos.push({ x, y, edad: 0, largo: 3 + fuerza * 8 });
    arrancar();
  }

  // Un cuadradito en la rejilla: más luz = más grande (el mismo semitono que las estrellas)
  function pixel(x, y, luz) {
    const tam = Math.max(1, Math.round(CELDA * Math.sqrt(luz))); // sqrt: se encogen al final, no enseguida
    const hueco = (CELDA - tam) / 2;
    ctx.fillRect(Math.floor(x / CELDA) * CELDA + hueco, Math.floor(y / CELDA) * CELDA + hueco, tam, tam);
  }

  // Estrella en cruz, como la de la referencia: un centro gordo y brazos que se apagan
  // hacia las puntas. luz: de 0 a 1 · brazo: largo de cada brazo, en píxeles de la rejilla
  function dibujarEstrella(x, y, luz, brazo) {
    for (let i = -brazo; i <= brazo; i++) {
      const l = luz * Math.pow(1 - Math.abs(i) / (brazo + 1), 1.5);
      pixel(x + i * CELDA, y, l);
      if (i !== 0) pixel(x, y + i * CELDA, l);
    }
    // Las cuatro esquinas del centro, más tenues: engordan el núcleo
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      pixel(x + dx * CELDA, y + dy * CELDA, luz * 0.3);
    }
  }

  // La estrella del cursor y su estela, recortadas con la forma de las letras
  function dibujarLuzDelCursor(ahora, dt) {
    // La luz sube rápido al entrar y baja suave al salir
    const objetivo = estrella.encima ? 1 : 0;
    estrella.luz += (objetivo - estrella.luz) * Math.min(1, dt * (estrella.encima ? 14 : 6));
    if (!estrella.encima && estrella.luz < 0.03) estrella.luz = 0;
    estela = estela.filter((p) => (p.edad += dt) < VIDA_ESTELA);
    if (estrella.luz === 0 && estela.length === 0) return;

    const caja = ajustarLienzo();
    ctx.save();
    if (SOLO_EN_LAS_LETRAS) {
      // Pasamos del sistema del dibujo (el de las letras) a píxeles del lienzo
      // y usamos las letras como molde: lo que se pinte fuera no se ve
      const m = dibujo.getScreenCTM();
      ctx.translate(-caja.left, -caja.top);
      ctx.transform(m.a, m.b, m.c, m.d, m.e, m.f);
      ctx.clip(todasLasLetras);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    ctx.fillStyle = "#ffffff";

    // Estela: crucecitas pequeñas que se apagan donde estuvo el cursor
    for (const p of estela) {
      dibujarEstrella(p.x - caja.left, p.y - caja.top, 0.45 * (1 - p.edad / VIDA_ESTELA), 1);
    }

    // La estrella: titila un poco y sus brazos crecen al encenderse
    const titileo = sinMovimiento.matches ? 1 : 1 - PARPADEO * (0.5 + 0.5 * Math.sin(ahora / 140));
    const brazo = Math.max(1, Math.round(BRAZO_ESTRELLA * estrella.luz));
    dibujarEstrella(estrella.x - caja.left, estrella.y - caja.top, estrella.luz * titileo, brazo);
    ctx.restore();
  }

  function animarChispas(ahora) {
    const dt = Math.min((ahora - antes) / 1000, 0.05); // segundos desde el último fotograma
    antes = ahora;
    ctx.clearRect(0, 0, lienzo.width, lienzo.height);

    dibujarLuzDelCursor(ahora, dt);

    // Chispas: vuelan, frenan poco a poco y se apagan
    const freno = Math.pow(0.05, dt); // pierden el 95% de su velocidad cada segundo
    chispas = chispas.filter((c) => (c.edad += dt) < c.vida);
    for (const c of chispas) {
      c.vx *= freno;
      c.vy *= freno;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      ctx.fillStyle = c.color;
      pixel(c.x, c.y, 1 - c.edad / c.vida);
    }

    // Destellos: una cruz de píxeles que crece y se apaga en 0.3 segundos
    destellos = destellos.filter((d) => (d.edad += dt) < 0.3);
    ctx.fillStyle = "#ffffff";
    for (const d of destellos) {
      const t = d.edad / 0.3;
      const brazo = Math.round(1 + t * d.largo); // largo de los brazos, en píxeles de la rejilla
      for (let i = -brazo; i <= brazo; i++) {
        const luz = (1 - t) * (1 - Math.abs(i) / (brazo + 1));
        pixel(d.x + i * CELDA, d.y, luz);
        if (i !== 0) pixel(d.x, d.y + i * CELDA, luz);
      }
    }

    if (chispas.length > 0 || destellos.length > 0 || estrella.luz > 0 || estela.length > 0) {
      requestAnimationFrame(animarChispas);
    } else {
      animando = false; // no queda nada: el bucle se para y no gasta nada
    }
  }

  // ----- Con el ratón -----
  // Pasar por encima (o deslizar el dedo): una estrella de luz brilla donde apuntas.
  // Clic: salta una chispa donde tocaste.
  function moverEstrella(evento) {
    // Cada vez que el cursor avanza un píxel de la rejilla, deja un punto de estela
    const ultimo = estela[estela.length - 1];
    const seMovio = !ultimo || Math.hypot(evento.clientX - ultimo.x, evento.clientY - ultimo.y) >= CELDA;
    if (estrella.encima && seMovio && VIDA_ESTELA > 0 && !sinMovimiento.matches) {
      estela.push({ x: estrella.x, y: estrella.y, edad: 0 });
    }
    estrella.x = evento.clientX;
    estrella.y = evento.clientY;
    estrella.encima = true;
    arrancar();
  }
  function apagarEstrella() { estrella.encima = false; }

  dibujo.addEventListener("pointermove", moverEstrella);
  dibujo.addEventListener("pointerdown", moverEstrella); // con el dedo no hay "pasar por encima"
  dibujo.addEventListener("pointerleave", apagarEstrella);
  dibujo.addEventListener("pointercancel", apagarEstrella);
  dibujo.addEventListener("click", (evento) => {
    if (letraEn(evento.clientX, evento.clientY)) explotar(evento.clientX, evento.clientY, "#ffffff", 1, COLORES_CLIC);
  });

  // Lo que pueden usar otros scripts (fondo-estrellas.js)
  window.tituloAnderswelt = {
    hayLetra: (px, py) => letraEn(px, py) !== null,
    explotar,
  };
}
})();
