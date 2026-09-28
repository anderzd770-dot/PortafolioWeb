// =========================================================
// TÍTULO "Anderswelt" HECHO CON TU IMAGEN
// El título es img/titulo-anderswelt.webp (tu diseño de letras de cromo,
// con el fondo negro vuelto transparente). Este archivo la parte en
// 10 letras para que cada una pueda reaccionar por separado: brillar,
// retroceder con los golpes y estallar en píxeles.
// (La versión anterior, con letras dibujadas a mano en vectores,
//  está guardada en js/titulo-cuchillas.js.)
// =========================================================

// Todo va dentro de (() => { ... })() para que sus nombres no choquen
// con los de los otros scripts: cada script tiene su propio "espacio".
(() => {

// ----- La imagen y sus letras -----
const IMAGEN = "img/titulo-anderswelt.webp";
const ANCHO = 1299, ALTO = 524; // tamaño de la imagen en píxeles (igual que el viewBox del SVG)

// Dónde termina una letra y empieza la siguiente. Las letras van inclinadas,
// así que cada corte es una línea inclinada: en la altura y, el corte está en
//   x = corte + INCLINACION * (MEDIO - y)
// (el número de la lista es la x del corte a media altura).
const INCLINACION = 0.25;
const MEDIO = ALTO / 2;
const CORTES = [309, 419, 527, 617, 703, 821, 967, 1057, 1145]; // A|N N|D D|E E|R R|S S|W W|E E|L L|T

// ----- Choques con las estrellas -----
// Cuando una estrella del fondo (js/fondo-estrellas.js) entra en una letra, estalla en píxeles.
const CELDA = 4;               // tamaño de los píxeles de la explosión (el cielo usa 3)
const CHISPAS = 24;            // píxeles que salen volando en el choque más fuerte
const VELOCIDAD_CHISPAS = 240; // qué rápido salen (px por segundo)
const VIDA_CHISPAS = 0.9;      // cuánto duran (segundos)
const EMPUJE_LETRA = 5;        // cuánto retrocede la letra con el golpe, en píxeles de pantalla (como el dragón)
const COLORES_CLIC = ["#ffffff", "#000000"]; // chispas del clic: se turnan blanco y negro, como en el dragón

// ----- Estrella que sigue al ratón (o al dedo) -----
// Donde apuntas, las letras brillan con una estrella en cruz de píxeles blancos.
const BRAZO_ESTRELLA = 5;        // largo de cada brazo de la cruz, en píxeles de la rejilla
const PARPADEO = 0.25;           // cuánto titila la estrella (0 = luz fija)
const VIDA_ESTELA = 0.3;         // cuánto dura la estela detrás del cursor, en segundos (0 = sin estela)
const SOLO_EN_LAS_LETRAS = true; // true: la luz solo se ve encima de las letras · false: la estrella entera
const MARGEN_RATON = 12;         // px de pantalla alrededor del metal que también cuentan como "encima" de la letra
                                 // (más = más fácil de señalar; las estrellas del fondo usan 0: la forma exacta)

// ----- Ondas de luz sobre el cromo (la misma animación que el dragón del centro) -----
// Un punto de luz en el centro del título del que salen anillos hacia fuera, que se difuminan
// al avanzar. Con un clic, un anillo brillante sale del punto del golpe y recorre todo el título.
// Los valores son los de js/agujero-negro.js; solo cambia el tamaño, porque el título es más grande.
const VELOCIDAD_CROMO = 0.005;   // qué rápido salen las ondas del centro (0.01 = el doble de rápido)
const ONDAS_CROMO = 3;           // cuántas ondas hay del centro al borde del degradado
const RADIO_CROMO = 700;         // tamaño del degradado, en píxeles de la imagen (la imagen mide 1299 × 524)
const CENTRO_CROMO = [650, 262]; // de dónde salen las ondas en reposo: el centro del título
const DIFUMINAR_CROMO = 2;       // qué pronto se difumina la onda al alejarse (1 = poco a poco, 4 = enseguida)
const INTENSIDAD_ONDAS = 0.85;   // cuánto brillan (0 = nada, 1 = blanco). El dragón usa 0.55; tu imagen es más clara y necesita más
const DURACION_GOLPE_LUZ = 0.6;  // segundos que tarda el anillo del clic en recorrer el título
const SUAVIDAD_VUELTA = 0.12;    // qué rápido vuelve la luz al centro tras un golpe (como el dragón)
const PARADAS_CROMO = 24;        // cuántas paradas tiene el degradado (más = ondas más suaves)
const FPS_ONDAS = 30;            // las ondas van despacio: a 30 fotogramas se ven igual y gastan la mitad

// x del corte número n a la altura y (n = -1 es el borde izquierdo, CORTES.length el derecho)
function corteEn(n, y) {
  if (n < 0) return -ANCHO;
  if (n >= CORTES.length) return ANCHO * 2;
  return CORTES[n] + INCLINACION * (MEDIO - y);
}

// La zona de la letra n: un cuadrilátero inclinado entre sus dos cortes, de arriba abajo.
// Se estira SOLAPE píxeles a la derecha, por debajo de la letra siguiente: si los bordes de dos
// recortes solo se tocan, el suavizado de cada uno deja pasar un hilo del fondo (una rayita).
const SOLAPE = 1.5;
function zonaDeLetra(n) {
  const puntos = [
    [corteEn(n - 1, 0), 0], [corteEn(n, 0) + SOLAPE, 0],
    [corteEn(n, ALTO) + SOLAPE, ALTO], [corteEn(n - 1, ALTO), ALTO],
  ];
  return puntos.map(([x, y]) => `${x.toFixed(1)},${y}`).join(" ");
}

// ----- Montar el título -----
const titulo = document.querySelector(".titulo");
const dibujo = titulo && titulo.querySelector(".titulo__dibujo");

if (dibujo) {
  const NS = "http://www.w3.org/2000/svg";
  const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)");
  const contenedor = dibujo.querySelector(".titulo__letras");
  const letras = []; // { grupo, brillo, centro } de cada letra, para los choques

  // Crea un elemento SVG con sus atributos
  function crear(etiqueta, atributos) {
    const el = document.createElementNS(NS, etiqueta);
    for (const [nombre, valor] of Object.entries(atributos)) el.setAttribute(nombre, valor);
    return el;
  }

  // La máscara del brillo: la propia imagen. Donde hay metal, el blanco se ve; donde no, no.
  const defs = crear("defs", {});
  const mascara = crear("mask", { id: "titulo-mascara", style: "mask-type: alpha" });
  mascara.append(crear("image", { href: IMAGEN, width: ANCHO, height: ALTO }));
  defs.append(mascara);

  // El molde de las ondas: también la imagen, pero por luminancia (como en el dragón):
  // lo claro deja pasar la luz y lo oscuro la tapa, así brillan sobre el metal claro, como un reflejo
  const mascaraLuz = crear("mask", { id: "titulo-mascara-luz" });
  mascaraLuz.append(crear("image", { href: IMAGEN, width: ANCHO, height: ALTO }));
  defs.append(mascaraLuz);

  // El degradado de las ondas: redondo, blanco, y el JS reescribe la transparencia de cada parada
  const cromo = crear("radialGradient", {
    id: "titulo-cromo", gradientUnits: "userSpaceOnUse",
    cx: CENTRO_CROMO[0], cy: CENTRO_CROMO[1], r: RADIO_CROMO,
  });
  const paradas = [];
  for (let i = 0; i < PARADAS_CROMO; i++) {
    const parada = crear("stop", { offset: (i / (PARADAS_CROMO - 1)).toFixed(3), "stop-color": "#ffffff" });
    cromo.append(parada);
    paradas.push(parada);
  }
  defs.append(cromo);
  contenedor.append(defs);

  for (let n = 0; n <= CORTES.length; n++) {
    // Cada letra = la imagen entera, recortada (clipPath) a la zona de esa letra
    const recorte = crear("clipPath", { id: `titulo-zona-${n}` });
    recorte.append(crear("polygon", { points: zonaDeLetra(n) }));
    defs.append(recorte);

    const grupo = crear("g", { class: "titulo__letra", "clip-path": `url(#titulo-zona-${n})` });
    grupo.style.setProperty("--n", n); // su número, para que aparezcan una tras otra
    grupo.append(crear("image", { href: IMAGEN, width: ANCHO, height: ALTO }));
    // Las ondas de luz encima del metal (van dentro de la letra: se mueven con ella)
    grupo.append(crear("rect", { class: "titulo__ondas", width: ANCHO, height: ALTO, mask: "url(#titulo-mascara-luz)" }));
    // Capa blanca invisible con la forma del metal: se enciende con los golpes
    const brillo = crear("rect", { class: "titulo__brillo", width: ANCHO, height: ALTO, mask: "url(#titulo-mascara)" });
    grupo.append(brillo);

    // Centro de la letra (a media altura, entre sus dos cortes): desde ahí brota y retrocede
    const centro = [(corteEn(n - 1, MEDIO) + corteEn(n, MEDIO)) / 2, MEDIO];
    if (n === 0) centro[0] = (40 + CORTES[0]) / 2;                   // la A empieza cerca de x 40
    if (n === CORTES.length) centro[0] = (CORTES[n - 1] + 1290) / 2; // la T acaba cerca de x 1290
    grupo.style.transformBox = "view-box";
    grupo.style.transformOrigin = `${centro[0]}px ${centro[1]}px`;

    contenedor.append(grupo);
    letras.push({ grupo, brillo, centro });
  }

  // ----- ¿Hay letra en este punto? -----
  // La silueta de las letras viene de js/titulo-silueta.js: por cada fila, los tramos donde hay metal.
  // La "desempaquetamos" una vez en una rejilla de 0 (hueco) y 1 (metal), a media resolución.
  // (No leemos los píxeles de la imagen porque abriendo index.html sin servidor el navegador no deja.)
  const silueta = window.SILUETA_TITULO;
  let metal = null; // Uint8Array: 1 si la celda (x, y) tiene metal
  if (silueta) {
    metal = new Uint8Array(silueta.ancho * silueta.alto);
    silueta.filas.forEach((fila, y) => {
      // Cada tramo son 4 caracteres: inicio y fin, con 2 cifras en base 36 cada uno
      for (let i = 0; i + 3 < fila.length; i += 4) {
        const inicio = parseInt(fila.slice(i, i + 2), 36);
        const fin = parseInt(fila.slice(i + 2, i + 4), 36);
        metal.fill(1, y * silueta.ancho + inicio, y * silueta.ancho + fin);
      }
    });
  }

  // ----- Zona generosa para el ratón -----
  // Para que las letras sean fáciles de señalar, el ratón cuenta como "encima" aunque esté
  // un poco fuera del metal. Calculamos una vez, para cada celda de la rejilla:
  //   distancia: cuántas celdas hay hasta el metal más cercano (0 = es metal)
  //   cercana:   de qué letra es ese metal (así, entre dos letras, gana la más próxima)
  // Se hace con dos barridos (arriba-izquierda → abajo-derecha y al revés): cada celda mira
  // a sus vecinas ya calculadas y se queda con la distancia más corta + el paso hasta ella.
  let distancia = null, cercana = null;
  if (metal) {
    const w = silueta.ancho, h = silueta.alto;
    distancia = new Float32Array(w * h).fill(Infinity);
    cercana = new Int8Array(w * h).fill(-1);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!metal[y * w + x]) continue;
        distancia[y * w + x] = 0;
        // La letra de esta celda: cuántos cortes quedan a su izquierda (en píxeles de la imagen)
        let n = 0;
        while (n < CORTES.length && x * 2 > corteEn(n, y * 2)) n++;
        cercana[y * w + x] = n;
      }
    }
    const DIAGONAL = Math.SQRT2;
    // Vecinas a mirar en cada barrido: [dx, dy, coste del paso]
    const antes = [[-1, 0, 1], [0, -1, 1], [-1, -1, DIAGONAL], [1, -1, DIAGONAL]];
    const despues = [[1, 0, 1], [0, 1, 1], [1, 1, DIAGONAL], [-1, 1, DIAGONAL]];
    const mirar = (x, y, vecinas) => {
      const i = y * w + x;
      for (const [dx, dy, paso] of vecinas) {
        const vx = x + dx, vy = y + dy;
        if (vx < 0 || vx >= w || vy < 0 || vy >= h) continue;
        const d = distancia[vy * w + vx] + paso;
        if (d < distancia[i]) { distancia[i] = d; cercana[i] = cercana[vy * w + vx]; }
      }
    };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) mirar(x, y, antes);
    for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) mirar(x, y, despues);
  }

  // La imagen, en un objeto aparte: la usamos de molde para la luz del ratón
  const imagen = new Image();
  // Si la imagen no carga, volvemos a enseñar el texto normal
  imagen.onerror = () => titulo.classList.remove("titulo--dibujado");
  imagen.src = IMAGEN;

  // Ya está montado: el CSS esconde el texto normal y enseña el dibujo
  titulo.classList.add("titulo--dibujado");

  let medida = null;

  // Dónde está el dibujo en pantalla. Se mide una vez por fotograma aunque
  // fondo-estrellas.js pregunte por cientos de estrellas.
  function medir() {
    if (!medida) {
      medida = { caja: dibujo.getBoundingClientRect(), matriz: dibujo.getScreenCTM().inverse() };
      requestAnimationFrame(() => { medida = null; });
    }
    return medida;
  }

  // Devuelve la letra que hay en (px, py) de la pantalla, o null.
  // margen: cuántos píxeles de pantalla alrededor del metal cuentan también como letra
  // (0 = solo el metal, para los choques con las estrellas; MARGEN_RATON para el ratón)
  function letraEn(px, py, margen = 0) {
    if (!distancia) return null;
    const { caja, matriz } = medir();
    // Descarte rápido: si está fuera del rectángulo del título, no hace falta mirar la silueta
    if (px < caja.left - margen || px > caja.right + margen ||
        py < caja.top - margen || py > caja.bottom + margen) return null;
    // Pasamos el punto de píxeles de pantalla a píxeles de la imagen
    const p = new DOMPoint(px, py).matrixTransform(matriz);
    // La silueta va a media resolución: la celda es el píxel dividido entre 2
    // (si el punto cae un poco fuera de la imagen, usamos la celda del borde más cercana)
    const cx = Math.min(silueta.ancho - 1, Math.max(0, Math.floor(p.x / 2)));
    const cy = Math.min(silueta.alto - 1, Math.max(0, Math.floor(p.y / 2)));
    const celda = cy * silueta.ancho + cx;
    // Distancia al metal en píxeles de pantalla: celdas × 2 (píxeles de imagen) × escala
    const escala = caja.width / ANCHO;
    const fuera = Math.hypot(Math.max(0, -p.x, p.x - ANCHO), Math.max(0, -p.y, p.y - ALTO)) * escala;
    if (distancia[celda] * 2 * escala + fuera > margen) return null; // demasiado lejos del metal
    return letras[cercana[celda]];
  }

  // ----- La letra reacciona -----
  // brillo: de 0 a 1 · golpe: desde dónde vino (en píxeles de la imagen), o null si no empuja
  function reaccionar(letra, brillo, golpe) {
    letra.brillo.animate([{ opacity: brillo }, { opacity: 0 }], { duration: 600, easing: "ease-out" });
    if (!golpe || sinMovimiento.matches) return;
    // Retrocede alejándose del golpe y vuelve con un pequeño rebote
    const dx = letra.centro[0] - golpe.x, dy = letra.centro[1] - golpe.y;
    const largo = Math.hypot(dx, dy) || 1;
    // EMPUJE_LETRA está en píxeles de pantalla (como en el dragón), pero la letra se mueve en
    // píxeles de la imagen, que se ve reducida: dividimos por la escala para que se note igual
    const escala = medir().caja.width / ANCHO;
    const empuje = EMPUJE_LETRA / escala;
    const mover = `translate(${dx / largo * empuje}px, ${dy / largo * empuje}px)`;
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
  // margen: px de pantalla alrededor del metal que cuentan como letra (0 = forma exacta)
  function explotar(px, py, color, fuerza = 1, colores = [color, "#dff6fa"], margen = 0) {
    if (sinMovimiento.matches) return;
    const letra = letraEn(px, py, margen);
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
    ctx.fillStyle = "#ffffff";

    // Estela: crucecitas pequeñas que se apagan donde estuvo el cursor
    for (const p of estela) {
      dibujarEstrella(p.x - caja.left, p.y - caja.top, 0.45 * (1 - p.edad / VIDA_ESTELA), 1);
    }

    // La estrella: titila un poco y sus brazos crecen al encenderse
    const titileo = sinMovimiento.matches ? 1 : 1 - PARPADEO * (0.5 + 0.5 * Math.sin(ahora / 140));
    const brazo = Math.max(1, Math.round(BRAZO_ESTRELLA * estrella.luz));
    dibujarEstrella(estrella.x - caja.left, estrella.y - caja.top, estrella.luz * titileo, brazo);

    if (SOLO_EN_LAS_LETRAS && imagen.complete && imagen.naturalWidth > 0) {
      // Usamos la imagen como molde: "destination-in" deja la luz solo donde la imagen
      // tiene metal (y más tenue donde el metal es medio transparente).
      // Esto funciona porque la luz es lo primero que se pinta en cada fotograma.
      const m = dibujo.getScreenCTM();
      ctx.save();
      ctx.globalCompositeOperation = "destination-in";
      ctx.translate(-caja.left, -caja.top);
      ctx.transform(m.a, m.b, m.c, m.d, m.e, m.f);
      ctx.drawImage(imagen, 0, 0, ANCHO, ALTO);
      ctx.restore();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
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

  // ----- Las ondas de luz (como el cromo del dragón) -----
  // El centro del degradado (cx, cy) es un punto de luz. Cada fotograma reescribimos la
  // transparencia de las paradas un poco "más hacia fuera": así los anillos avanzan.
  let faseCromo = 0; // cuánto han avanzado las ondas (de 0 a 1 y vuelta a empezar)
  const centroCromo = { x: CENTRO_CROMO[0], y: CENTRO_CROMO[1] };
  let golpeLuz = 0;  // el anillo del clic: 1 = recién golpeado, 0 = ya llegó al borde y se apagó

  function pintarCromo(pasos) {
    // 1) Tras un golpe, el centro de la luz vuelve despacio al centro del título
    const trocito = pasos > 0 ? 1 - (1 - SUAVIDAD_VUELTA) ** pasos : 1;
    centroCromo.x += (CENTRO_CROMO[0] - centroCromo.x) * trocito;
    centroCromo.y += (CENTRO_CROMO[1] - centroCromo.y) * trocito;
    cromo.setAttribute("cx", centroCromo.x.toFixed(1));
    cromo.setAttribute("cy", centroCromo.y.toFixed(1));

    // 2) Las ondas avanzan hacia fuera
    faseCromo = (faseCromo + VELOCIDAD_CROMO * pasos) % 1;
    paradas.forEach((parada, i) => {
      const s = i / (PARADAS_CROMO - 1); // 0 = centro, 1 = borde del degradado
      const nucleo = Math.exp(-((s / 0.12) ** 2)); // el punto blanco del centro
      // Una onda: cos() sube y baja ONDAS_CROMO veces del centro al borde. Al crecer la fase,
      // cada cresta está un poco más lejos: la luz "sale" del centro
      const onda = 0.5 + 0.5 * Math.cos(Math.PI * 2 * (s * ONDAS_CROMO - faseCromo));
      // La onda se difumina al avanzar: "nitidez" vale 1 en el centro y 0 en el borde
      const nitidez = (1 - s) ** DIFUMINAR_CROMO;
      let luz = nucleo + (1 - nucleo) * onda * nitidez;
      // El anillo del clic: una banda brillante en la distancia "avance", que crece de 0 a 1
      if (golpeLuz > 0) {
        const avance = 1 - golpeLuz;
        luz += golpeLuz * 1.6 * Math.exp(-(((s - avance) / 0.09) ** 2)) + golpeLuz * nucleo;
      }
      parada.setAttribute("stop-opacity", Math.min(1, luz * INTENSIDAD_ONDAS).toFixed(3));
    });
    golpeLuz = Math.max(0, golpeLuz - pasos / (DURACION_GOLPE_LUZ * 60));
  }
  pintarCromo(0); // las ondas de salida (y las que se quedan quietas si se pide menos movimiento)

  // Clic: la luz salta al punto del golpe (x, y en píxeles de la imagen) y sale un anillo desde ahí
  function golpearLuz(x, y) {
    if (sinMovimiento.matches) return;
    centroCromo.x = x;
    centroCromo.y = y;
    golpeLuz = 1;
  }

  // El bucle de las ondas. Van despacio, así que las pintamos a FPS_ONDAS;
  // solo el anillo del clic, que va rápido, se pinta en todos los fotogramas
  let tiempoCromo = performance.now();
  let ultimoCromo = 0;
  function animarOndas(ahora) {
    requestAnimationFrame(animarOndas);
    if (golpeLuz === 0 && ahora - ultimoCromo < 1000 / FPS_ONDAS - 1) return;
    ultimoCromo = ahora;
    pintarCromo(Math.min((ahora - tiempoCromo) / 16.67, 4)); // pasos = fotogramas de 60 Hz que pasaron
    tiempoCromo = ahora;
  }
  if (!sinMovimiento.matches) requestAnimationFrame(animarOndas);

  // ----- Con el ratón -----
  // Pasar por encima (o deslizar el dedo): una estrella de luz brilla donde apuntas
  // y la letra que tocas sobresale un poco (clase titulo__letra--encima, ver el CSS).
  // Clic: salta una chispa donde tocaste.
  let letraEncima = null;

  // Marca la letra que está bajo el cursor (o ninguna, con null)
  function senalarLetra(letra) {
    if (letra === letraEncima) return;
    if (letraEncima) letraEncima.grupo.classList.remove("titulo__letra--encima");
    if (letra) letra.grupo.classList.add("titulo__letra--encima");
    letraEncima = letra;
    // La mano del cursor solo sobre el metal: así se nota que la letra se puede pulsar
    dibujo.style.cursor = letra ? "pointer" : "";
  }

  function moverEstrella(evento) {
    senalarLetra(letraEn(evento.clientX, evento.clientY, MARGEN_RATON));
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
  function apagarEstrella() {
    estrella.encima = false;
    senalarLetra(null);
  }

  dibujo.addEventListener("pointermove", moverEstrella);
  dibujo.addEventListener("pointerdown", moverEstrella); // con el dedo no hay "pasar por encima"
  dibujo.addEventListener("pointerleave", apagarEstrella);
  dibujo.addEventListener("pointercancel", apagarEstrella);
  dibujo.addEventListener("click", (evento) => {
    if (!letraEn(evento.clientX, evento.clientY, MARGEN_RATON)) return;
    explotar(evento.clientX, evento.clientY, "#ffffff", 1, COLORES_CLIC, MARGEN_RATON);
    // Como el dragón: un anillo de luz sale del punto del clic y recorre el título
    const punto = new DOMPoint(evento.clientX, evento.clientY).matrixTransform(medir().matriz);
    golpearLuz(punto.x, punto.y);
  });

  // Lo que pueden usar otros scripts (fondo-estrellas.js)
  window.tituloAnderswelt = {
    hayLetra: (px, py) => letraEn(px, py) !== null,
    explotar,
  };
}
})();
