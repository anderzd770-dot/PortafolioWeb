// =========================================================
// AGUJERO NEGRO DE PÍXELES
// Dibuja en un <canvas> el disco de materia que gira alrededor
// del agujero negro, con estilo "semitono": muchos cuadraditos
// en una rejilla, más grandes y más claros donde hay más luz.
//
// Idea clave (igual que en orbita.js): cada partícula está en
// un círculo; al aplastarlo en vertical parece un disco visto
// de lado. Las de arriba (detrás) se pintan antes que el
// agujero y las de abajo (delante) después, para taparlo.
//
// Para gastar pocos recursos:
// Además "se traga" las estrellas del fondo que pasan cerca:
// sus píxeles caen en espiral y se unen al disco (ver atrapar).
//
//  - ~7400 cuadraditos, todos del mismo color (se pintan de una vez).
//  - Máximo 30 fotogramas por segundo.
//  - Se pausa si el agujero no se ve en pantalla.
// =========================================================

// Todo va dentro de (() => { ... })() para que sus nombres (animar, ctx...)
// no choquen con los de orbita.js: cada script tiene su propio "espacio".
(() => {

// ----- Ajustes (¡prueba a cambiarlos!) -----
const NUM_PARTICULAS = 7400;   // píxeles del disco (si los haces más pequeños, pon más)
const TAMANO_PIXEL = 0.7;       // tamaño de los píxeles: 1 = grandes, 0.5 = la mitad
const ALCANCE_DISCO = 7;        // hasta dónde llega el disco (en "radios del agujero")
const VELOCIDAD_DISCO = 0.05;  // giro del borde de dentro del disco; hacia fuera, más lento (ver velocidadAngular)
const VELOCIDAD_NUBES = 0.012;  // giro de las nubes brillantes (todas a la vez, sin deformarse)
const PIXELES_ANILLO = 370;     // cuántos píxeles forman el anillo que enmarca el agujero
const IMAGEN_DE_ABAJO = 0.35;   // luz del halo por debajo del agujero (0 = sin halo abajo, 1 = igual que arriba)
// Además del tamaño, la luz de cada píxel del disco cambia su TONO: de oscuro a claro,
// sacados de la paleta del cromo. Puedes poner más o menos tonos.
const TONOS_DISCO = ["#2f3c5c", "#5f7299", "#a9cbe0", "#f2fbff"];
const RADIO_BLANCO = 2;         // el blanco solo aparece a menos de 2 radios del agujero: el centro manda
const RADIO_CLARO = 6;          // y el cian pálido, a menos de 6; más lejos, solo azules
const CURVA_TONOS = 0.6;        // menos de 1 = más píxeles claros (el disco se ve continuo) · 1 = reparto igual
const DIFUMINAR_BORDE = 0.3;    // qué parte del disco se va apagando antes de los planetas (0.1 = de golpe, 0.5 = muy suave)

// La Z-dragón
// Interruptores: con los dos en false el dragón se queda quieto, pegado a la esfera
const DA_VUELTAS = true;        // true: gira alrededor de la esfera junto con los planetas (al arrastrar, con la rueda y solos)
const VUELTA_CON_PLANETAS = 1;  // cuánto gira el dragón por cada grado que giran los planetas (1 = igual, 2 = el doble)
const SIGUE_AL_RATON = false;   // true: el imán (la esfera rueda hacia el ratón y el dragón lo sigue)
const VUELTA_QUIETO = 14;       // quieto, cuántos grados está girado en la esfera (0 = centrado, más = a la derecha)
const CRECER_Z = 1.15;          // tamaño extra del dragón: crece hacia la derecha y hacia abajo (su esquina de arriba a la izquierda no se mueve)
const CRECER_ENCIMA = 1.07;     // con el ratón encima crece un 7% (así se nota que se puede hacer clic)
const CURVATURA = 1;            // cuánto se dobla el dragón sobre la esfera: 1 = la esfera del agujero, más = esfera más pequeña y dragón más deformado
const TROZOS_LETRA = 9;         // la Z se corta en 9×9 trozos para pegarla a la esfera (más = más redonda, pero más pesada)
const SUBIR_LETRA = 17;         // grados que sube el continente hacia el polo norte (con 17 queda justo por encima del disco de delante)
const EMPIEZA_A_DESAPARECER = 0.35; // cuánto de frente mira un trozo cuando empieza a apagarse (1 = justo de frente)
const DESAPARECE_DEL_TODO = 0.15;  // ...y cuando ya no se ve (0 = justo en el borde de la esfera)
const SOMBRA_ESFERA = 0.75;        // cuánto se oscurece lo que se tumba hacia el borde de la esfera (0 = nada; así se nota la curva)

// Imán: el ratón hace rodar la esfera y el dragón se desliza hacia él
const PECHO = [59, 55];         // dónde está el pecho del dragón (en las unidades de su dibujo, viewBox "10 -5 100 100")
const MARGEN_ORBITA = 0.25;     // el imán llega hasta la órbita de los planetas y se suelta en este 25% de más
const TOCA_BORDE = 0.97;        // con el ratón fuera del agujero, la punta llega al 97% del radio (1 = justo en el borde)
const ESCONDER_ARRIBA_DERECHA = 0.85; // arriba a la derecha el dragón se esconde: 0 = nada, 1 = entero detrás
const SUAVIDAD_IMAN = 0.12;     // qué rápido sigue al ratón, sin rebote: 0.05 = lento y suave, 0.3 = casi al instante
const ELASTICIDAD_IMAN = 0.5;   // cuánto se estira al moverse rápido
// Mientras el ratón lo mueve, el dragón se apaga más tarde (si no, su punta no se vería en el borde)
const EMPIEZA_A_DESAPARECER_TOCANDO = 0.3;
const DESAPARECE_DEL_TODO_TOCANDO = 0;

// Las ondas de luz sobre el cromo de la Z (salen del centro y se difuminan al avanzar)
const VELOCIDAD_CROMO = 0.005;  // qué rápido salen las ondas de luz del centro (0.01 = el doble de rápido)
const ONDAS_CROMO = 3;          // cuántas ondas de luz hay del centro al borde del degradado
const RADIO_CROMO = 75;         // tamaño del degradado, en unidades del dibujo (la Z mide 100)
const DIFUMINAR_CROMO = 2;      // qué pronto se difumina la onda al alejarse (1 = poco a poco, 4 = enseguida)
const INTENSIDAD_ONDAS = 0.55;  // cuánto brillan las ondas sobre el dibujo (0 = nada, 1 = blanco del todo)

// La luz del ratón (la misma idea que en el título): una estrella de píxeles que brilla
// donde apuntas, pero solo encima del dragón
const BRAZO_LUZ = 4;            // largo de cada brazo de la cruz, en píxeles de la rejilla
const PARPADEO_LUZ = 0.25;      // cuánto titila (0 = luz fija)
const VIDA_ESTELA_LUZ = 0.3;    // cuánto dura la estela detrás del cursor, en segundos (0 = sin estela)

// Clic en el dragón: una explosión de píxeles como la del título, pero en blanco y negro
const CHISPAS_CLIC = 24;           // cuántos píxeles salen volando
const VELOCIDAD_CHISPAS_CLIC = 240; // qué rápido salen (px por segundo)
const VIDA_CHISPAS_CLIC = 0.9;     // cuánto duran (segundos)
const COLORES_CHISPAS = ["#ffffff", "#000000"]; // se van turnando: uno blanco, uno negro...
const EMPUJE_DRAGON = 5;           // cuánto retrocede el dragón con el golpe, en píxeles (como las letras del título)
const DURACION_GOLPE_LUZ = 0.6;    // segundos que tarda el anillo de luz del clic en recorrer el dragón
const FPS = 30;                 // fotogramas por segundo

// Estrellas atrapadas (fondo-estrellas.js nos las manda cuando pasan cerca)
const DURACION_CAIDA = 2.5;     // segundos que tarda un píxel en llegar al disco
const CAIDA_AL_CENTRO = 0.003;  // cuánto se acerca al horizonte cada fotograma, ya dentro del disco
const COPIAS_POR_PIXEL = 2;     // cada píxel de la estrella se "estira" en varias partículas
const MAX_ATRAPADAS = 800;      // límite de partículas atrapadas a la vez (para no gastar de más)

// ----- Elementos -----
const agujero = document.querySelector(".agujero");
const orbita = agujero.closest(".orbita");
// Dos lienzos: el de atrás (debajo de la Z) y el de delante (encima de la Z)
const lienzo = agujero.querySelector(".agujero__lienzo");
const lienzoDelante = agujero.querySelector(".agujero__lienzo--delante");
const ctx = lienzo.getContext("2d");
const ctxDelante = lienzoDelante.getContext("2d");
const letra = agujero.querySelector(".letra3d__defs"); // tiene la animación del degradado #cromo (el del título)
const zona = agujero.querySelector(".agujero__zona"); // la zona del ratón, encima del agujero
const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)");

// La inclinación y el giro del disco se leen del HTML (data-inclinacion y data-giro),
// los mismos que usa orbita.js: así el disco y los planetas están en el mismo plano
const INCLINACION_DISCO = parseFloat(orbita.dataset.inclinacion);
// Cuántos planetas mide el agujero de diámetro: se lee del CSS (--agujero-planetas en .orbita)
const PLANETAS_POR_AGUJERO = parseFloat(getComputedStyle(orbita).getPropertyValue("--agujero-planetas")) || 1.7;
const GIRO_DISCO = parseFloat(orbita.dataset.giro);
const COS_GIRO = Math.cos(GIRO_DISCO);
const SIN_GIRO = Math.sin(GIRO_DISCO);
agujero.style.setProperty("--giro", GIRO_DISCO + "rad"); // la Z del CSS se inclina igual

// ----- La esfera: el agujero negro como un planeta -----
// El círculo negro es una esfera vista de frente, y su centro es el "centro de gravedad":
// la Z no flota delante, está pegada a la superficie como un continente y gira con ella.
// La esfera gira sobre un eje perpendicular al disco. El disco se ve aplastado al 27%,
// así que ese eje apunta asin(0.27) ≈ 16° hacia nosotros (vemos el polo norte un poco,
// igual que vemos el disco desde arriba).
// El continente está en la latitud 16° norte + SUBIR_LETRA. Con 16° justos quedaría en
// el centro del agujero al pasar por delante, pero la base de la Z pasaría por debajo de los
// píxeles del disco; subiéndola un poco, pasa entera justo por encima de ellos.
const EJE_ESFERA = Math.asin(INCLINACION_DISCO);
const LATITUD = EJE_ESFERA + (SUBIR_LETRA * Math.PI) / 180;
agujero.style.setProperty("--eje-esfera", -EJE_ESFERA + "rad");
const letra3d = agujero.querySelector(".letra3d");

// ----- Pegar la Z a la esfera: la cortamos en trozos, como las piezas de un globo -----
// Un papel plano no se puede pegar a una bola sin arrugarse, pero trocitos pequeños sí:
// cada trozo es plano y el CSS lo coloca en su punto de la esfera, tocándola (tangente).
// Cada trozo lleva una copia del dibujo, que solo enseña su cuadradito (viewBox).
// Sin JS, la Z se ve plana.
const cuerpoLetra = agujero.querySelector(".letra3d__cuerpo");
const capasLetra = [...cuerpoLetra.children];
const formaZ = new Path2D(document.getElementById("forma-z").getAttribute("d"));
const probador = document.createElement("canvas").getContext("2d"); // solo para preguntar "¿esto es Z?"
const CAJA_Z = { x: 10, y: -5, lado: 100 }; // el viewBox de la Z: "10 -5 100 100"
const SOLAPE = 0.006; // los trozos se pisan un poquito para que no se vean rendijas
// El pecho, en anchos de Z desde el centro de la Z (0 = centro)
const PECHO_X = (PECHO[0] - CAJA_Z.x) / CAJA_Z.lado - 0.5;
const PECHO_Y = (PECHO[1] - CAJA_Z.y) / CAJA_Z.lado - 0.5;
const trozos = [];    // guardamos cada trozo y su posición para poder apagarlo al irse atrás

// ¿Hay algo de Z dentro de este cuadrado? Probamos una rejilla de puntos (con 1 unidad
// de margen por el filo de luz del contorno)
function hayLetra(x, y, lado) {
  for (let a = 0; a <= 6; a++) {
    for (let b = 0; b <= 6; b++) {
      if (probador.isPointInPath(formaZ, x - 1 + ((lado + 2) * a) / 6, y - 1 + ((lado + 2) * b) / 6)) return true;
    }
  }
  return false;
}

for (let i = 0; i < TROZOS_LETRA; i++) {
  for (let j = 0; j < TROZOS_LETRA; j++) {
    // El cuadradito del trozo, en fracciones de la Z (0 = izquierda/arriba, 1 = derecha/abajo)
    const inicioX = i / TROZOS_LETRA - SOLAPE;
    const inicioY = j / TROZOS_LETRA - SOLAPE;
    const lado = 1 / TROZOS_LETRA + SOLAPE * 2;
    const caja = [CAJA_Z.x + inicioX * CAJA_Z.lado, CAJA_Z.y + inicioY * CAJA_Z.lado, lado * CAJA_Z.lado, lado * CAJA_Z.lado];
    if (!hayLetra(...caja)) continue; // trozo vacío: no lo creamos (menos trabajo para el navegador)

    const trozo = document.createElement("div");
    trozo.className = "letra3d__trozo";
    trozo.style.left = inicioX * 100 + "%";
    trozo.style.top = inicioY * 100 + "%";
    trozo.style.width = trozo.style.height = lado * 100 + "%";
    // Dónde está su centro respecto al centro de la Z (en anchos de Z): con esto el CSS
    // lleva el trozo al centro de la esfera
    const x = (i + 0.5) / TROZOS_LETRA - 0.5;
    const y = (j + 0.5) / TROZOS_LETRA - 0.5;
    trozo.style.setProperty("--x", x.toFixed(4));
    trozo.style.setProperty("--y", y.toFixed(4));
    // ...y respecto al PECHO del dragón: el pecho es el punto de la esfera que nos mira de frente,
    // y cada trozo se aleja de él sobre la esfera (así el pecho es el "centro" del dragón)
    const sx = x - PECHO_X || 0.0001; // nunca 0 justo: rotate3d necesita un eje
    const sy = y - PECHO_Y;
    trozo.style.setProperty("--sx", sx.toFixed(4));
    trozo.style.setProperty("--sy", sy.toFixed(4));
    trozo.style.setProperty("--distancia", Math.hypot(sx, sy).toFixed(4));
    trozos.push({ elemento: trozo, sx, sy, luz: 1 });
    for (const capa of capasLetra) {
      const copia = capa.cloneNode(true);
      copia.setAttribute("viewBox", caja.join(" "));
      trozo.appendChild(copia);
    }
    cuerpoLetra.appendChild(trozo);
  }
}
capasLetra.forEach((capa) => capa.remove());

agujero.classList.add("agujero--vivo"); // quita el dibujo de respaldo del CSS

// ----- Medidas (se recalculan si cambia el tamaño) -----
let ancho = 0;       // tamaño del lienzo en píxeles CSS (el doble de ancho que de alto)
let alto = 0;
let centroX = 0;
let centroY = 0;
let radioAgujero = 0;
let curvaLetra = 0.92; // radianes de esfera que ocupa la Z de lado a lado
let radioEsfera = 0;   // el radio de la esfera donde está pegado el dragón (en píxeles)
let rejilla = 3;     // tamaño de cada "celda" de píxel
let brillo = null;   // resplandor alrededor del agujero

function medir() {
  // Dibujamos a resolución normal (1x) aunque la pantalla sea "retina": como todo son
  // cuadraditos, el CSS los amplía sin suavizar (image-rendering: pixelated) y se ven nítidos
  // con 4 veces menos píxeles que calcular
  const dpr = 1;
  ancho = agujero.clientWidth;
  alto = agujero.clientHeight;
  centroX = ancho / 2;
  centroY = alto / 2;
  radioAgujero = alto * 0.12;

  // La esfera del dragón: con CURVATURA 1 tiene el radio del círculo negro; con más, es más
  // pequeña y el dragón se dobla más sobre ella (como si la gravedad lo deformara).
  // --curva = cuántos radianes de la esfera ocupa la Z de lado a lado (su ancho dividido entre el radio)
  radioEsfera = radioAgujero / CURVATURA;
  letra3d.style.setProperty("--radio-esfera", radioEsfera.toFixed(1) + "px");
  curvaLetra = letra3d.offsetWidth / radioEsfera;
  letra3d.style.setProperty("--curva", curvaLetra.toFixed(3));
  rejilla = Math.max(2, Math.round((alto / 120) * TAMANO_PIXEL));
  prepararCapas();

  for (const l of [lienzo, lienzoDelante]) {
    l.width = Math.round(ancho * dpr);
    l.height = Math.round(alto * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctxDelante.setTransform(dpr, 0, 0, dpr, 0, 0);

  brillo = ctx.createRadialGradient(centroX, centroY, radioAgujero, centroX, centroY, radioAgujero * 3);
  brillo.addColorStop(0, "rgba(150, 235, 255, 0.14)");
  brillo.addColorStop(1, "rgba(150, 235, 255, 0)");

  medirTabla(); // la tabla de "cuánto rodar" depende de --curva, que acaba de cambiar
  medirPlano(); // dónde va el dibujo plano (antes del zoom, que mide su caja)
  medirZoom();  // y la caja del dragón (para crecer desde su esquina), también
  pixelarDragon(); // y el tamaño de los cuadraditos del dragón (los mismos que los del disco)
}

// ----- El dragón pixelado -----
// Tus dibujos son de semitono, pero en pantalla el dragón mide unos 60 px: sus puntos serían más
// pequeños que un píxel, y además el navegador suaviza la imagen al doblarla en 3D. Así que no
// enseñamos la imagen: el dragón se DIBUJA EN EL LIENZO con los mismos cuadraditos que el disco.
//   1) Leemos tus dos dibujos encogidos a una rejilla de muestras (pixelarDragon, al medir).
//   2) En cada fotograma llevamos cada muestra a la pantalla (aLaPantalla: esfera, giros, tamaño,
//      crecer con el ratón) y la encajamos en la rejilla del disco. En cada celda de la pantalla
//      nos quedamos con la muestra con más luz, y ponemos un cuadradito (dibujarDragon).
// La imagen (y sus trozos en 3D) sigue en el HTML, invisible: sirve si el JavaScript no carga.
const DRAGON_PLANO = false;      // true: tu dibujo exactamente como es (plano) · false: doblado sobre la esfera (efecto curvo)
// El dragón vive DENTRO del círculo negro, por encima del disco de delante. Su centro va en
// (DRAGON_X, DRAGON_Y) y su tamaño se calcula solo: el más grande que cabe sin salir por
// ningún borde, ni siquiera cuando crece con el ratón encima.
const BORDE_Z = 0.88;            // en reposo el dragón llega hasta el 88% del radio (su borde de arriba a la derecha sigue el círculo)
const DENTRO = 0.97;             // creciendo con el ratón nunca pasa del 97% del radio (justo antes del anillo de píxeles)
const SUELO_Z = 0.26;            // el dragón no baja de aquí (en radios, inclinado como el disco): los píxeles del disco no lo tapan
const TAMANO_Z = 1;              // 1 = el más grande que cabe · 0.9 = un 10% más pequeño (nunca más de 1: se saldría)
const DRAGON_X = 0.25;           // dónde va el centro del dragón, en radios del agujero (+ = derecha); si no cabe, encoge
const DRAGON_Y = -0.29;          // (+ = abajo, - = arriba)
const DRAGON_EN_CUADRADITOS = false; // false: se ve tu dibujo tal cual · true: se redibuja con los píxeles del disco
const BRILLO_DRAGON = 1.8;     // tus dibujos son de puntitos: al encogerlos quedan grises; esto les devuelve la luz
const MUESTRAS_POR_CELDA = 2; // muestras por cada píxel del disco (2 = sin huecos aunque la esfera estire el dibujo)
const dibujosDragon = { reposo: null, despierto: null, lado: 0 }; // los datos de color de cada dibujo
const azarDragon = [];        // un número al azar por muestra: decide cuándo cambia al dibujo despierto

function cargarImagen(url) {
  return new Promise((listo, error) => {
    const imagen = new Image();
    imagen.onload = () => listo(imagen);
    imagen.onerror = error;
    imagen.src = url;
  });
}

// Lee un dibujo encogido a lado×lado muestras: [r, g, b, a, r, g, b, a...]
function leerDibujo(imagen, lado) {
  const lienzoMuestras = document.createElement("canvas");
  lienzoMuestras.width = lienzoMuestras.height = lado;
  const c = lienzoMuestras.getContext("2d");
  c.drawImage(imagen, 0, 0, lado, lado); // el navegador hace la media de cada trozo
  return c.getImageData(0, 0, lado, lado).data;
}

async function pixelarDragon() {
  if (!DRAGON_EN_CUADRADITOS) return; // apagado: se ve la imagen de tu dibujo, exactamente como es
  // Cuántas celdas del disco ocupa el dibujo de lado (su caja de 100 unidades, con el tamaño extra)
  const celdas = Math.max(8, Math.round((letra3d.offsetWidth * CRECER_Z) / rejilla));
  const lado = celdas * MUESTRAS_POR_CELDA;
  if (lado === dibujosDragon.lado) return; // ya está hecho para este tamaño
  dibujosDragon.lado = lado;
  let reposo, despierto;
  try {
    [reposo, despierto] = await Promise.all([cargarImagen("img/dragon-z.webp"), cargarImagen("img/dragon-z-encima.webp")]);
  } catch {
    return; // si no cargan, se queda la imagen normal
  }
  if (lado !== dibujosDragon.lado) return; // mientras cargaba cambió el tamaño
  dibujosDragon.reposo = leerDibujo(reposo, lado);
  dibujosDragon.despierto = leerDibujo(despierto, lado);
  while (azarDragon.length < lado * lado) azarDragon.push(Math.random());
  agujero.classList.add("agujero--dragon-pixelado"); // el CSS esconde la imagen: ahora lo pinta el lienzo
  dibujar();
}

// El dragón, cuadradito a cuadradito, en el lienzo "contexto"
function dibujarDragon(contexto) {
  const { reposo, despierto, lado } = dibujosDragon;
  if (!reposo) return;
  const perspectiva = parseFloat(getComputedStyle(letra3d).perspective) || radioAgujero * 8;
  const encima = encimaAhora();
  // Cuánto se ha transformado en el dibujo despierto (0 = reposo, 1 = despierto), según lo que ha crecido
  const cambio = Math.max(0, Math.min(1, (encima - 1) / (CRECER_ENCIMA - 1 || 1)));
  // El retroceso del clic (la animación "translate" de .letra3d)
  const empuje = (getComputedStyle(letra3d).translate || "").split(" ").map(parseFloat);
  const ex = empuje[0] || 0, ey = empuje[1] || 0;
  // Dónde empieza a apagarse al acercarse al borde de la esfera (como los trozos, en apagarTrozos)
  const empieza = EMPIEZA_A_DESAPARECER, desaparece = DESAPARECE_DEL_TODO;

  const celdas = new Map(); // celda de la pantalla -> la muestra con más luz: [luz, r, g, b]
  for (let j = 0; j < lado; j++) {
    for (let i = 0; i < lado; i++) {
      const n = j * lado + i;
      // Disolución de píxeles: cada muestra cambia al dibujo despierto en su propio momento
      const datos = azarDragon[n] < cambio ? despierto : reposo;
      const alfa = datos[n * 4 + 3] / 255;
      if (alfa < 0.12) continue;
      // El centro de la muestra, en unidades del dibujo (viewBox "10 -5 100 100")
      const u = CAJA_Z.x + ((i + 0.5) / lado) * CAJA_Z.lado;
      const v = CAJA_Z.y + ((j + 0.5) / lado) * CAJA_Z.lado;
      const [x, y, z] = aLaPantalla(u, v, perspectiva, encima);
      let luz = (z - desaparece) / (empieza - desaparece);
      luz = Math.max(0, Math.min(1, luz));
      luz = Math.min(1, alfa * BRILLO_DRAGON) * luz * luz * (3 - 2 * luz);
      if (luz < 0.12) continue;
      const clave = Math.floor((x + ex) / rejilla) * 100000 + Math.floor((y + ey) / rejilla);
      const antes = celdas.get(clave);
      if (antes && antes[0] >= luz) continue;
      // Las ondas de luz del cromo: aclaran el color según la distancia al centro de la luz
      const s = Math.hypot(u - centroCromo.x, v - centroCromo.y) / RADIO_CROMO;
      const onda = s < 1 ? luzOndas[Math.round(s * (PARADAS_CROMO - 1))] : 0;
      celdas.set(clave, [luz, datos[n * 4] + (255 - datos[n * 4]) * onda,
        datos[n * 4 + 1] + (255 - datos[n * 4 + 1]) * onda, datos[n * 4 + 2] + (255 - datos[n * 4 + 2]) * onda]);
    }
  }

  // Un trazado por color (redondeado a 16 tonos por canal, para que no haya miles) y a pintar
  const porColor = new Map();
  for (const [clave, [luz, r, g, b]] of celdas) {
    const tono = (c) => Math.min(255, Math.round(c / 16) * 16);
    const cx = Math.floor(clave / 100000) * rejilla, cy = (clave % 100000) * rejilla;
    ponerPixel(trazadoDe(porColor, `rgb(${tono(r)}, ${tono(g)}, ${tono(b)})`), cx + rejilla / 2, cy + rejilla / 2, luz);
  }
  pintarColores(porColor, contexto);
}

// ----- Crear las partículas (una sola vez) -----
// ----- El sistema de rotación -----
// TODO lo que gira alrededor del agujero sigue la misma ley (la de Kepler, como los planetas
// alrededor del Sol): cuanto más lejos, más despacio. "r" en radios del agujero.
// En el borde de dentro del disco (R_INTERIOR) la velocidad es VELOCIDAD_DISCO.
// Las partículas, las estrellas atrapadas y el anillo usan esta función: así nada gira
// "a su aire" y el centro se mueve como un solo remolino.
const R_INTERIOR = 1.35; // el disco empieza a 1.35 radios del centro
function velocidadAngular(r) {
  return VELOCIDAD_DISCO * (R_INTERIOR / r) ** 1.5;
}

// Cada partícula guarda su distancia al centro (r, medida en "radios del agujero"),
// su ángulo y cuánta luz tiene (de 0 a 1).
const particulas = [];
for (let i = 0; i < NUM_PARTICULAS; i++) {
  // Math.random() ** 1.9 junta más partículas cerca del agujero,
  // pero algunas llegan lejos, hasta ALCANCE_DISCO
  const r = R_INTERIOR + (ALCANCE_DISCO - R_INTERIOR) * Math.random() ** 1.9;
  const angulo = Math.random() * Math.PI * 2;
  // "distancia" va de 0 (junto al agujero) a 1 (el borde del disco)
  const distancia = (r - R_INTERIOR) / (ALCANCE_DISCO - R_INTERIOR);
  // Más luz cerca del centro (las "nubes" se calculan en cada fotograma, en dibujar)
  const luz = (1.25 - distancia * 0.95) * (0.6 + Math.random() * 0.5);
  // "borde" = 1 normal, 0 invisible: lo calcula medirBorde() según dónde estén los planetas
  particulas.push({
    r,
    angulo,
    luz,
    borde: 1,
    velocidad: velocidadAngular(r),
    // El tope de tono según la distancia: blanco cerca, azules lejos
    tope: r < RADIO_BLANCO ? TONOS_DISCO.length - 1 : r < RADIO_CLARO ? TONOS_DISCO.length - 2 : TONOS_DISCO.length - 3,
  });
}

// ----- Difuminar el borde del disco antes de llegar a los planetas -----
// El disco y la órbita de los planetas tienen la misma forma (mismo aplastado y mismo giro),
// así que basta con comparar distancias en "radios del agujero": los planetas van a
// radioX / radioAgujero. Los píxeles se apagan poco a poco y desaparecen del todo
// medio planeta antes de la órbita (más un pequeño hueco), así no se montan sobre ellos.
// Solo depende de r, así que se calcula una vez (y otra si cambia el tamaño), no cada fotograma.
let orbitaMedida = 0;
function medirBorde() {
  const radioOrbita = parseFloat(orbita.style.getPropertyValue("--radio-x"));
  if (!radioOrbita || !radioAgujero || radioOrbita === orbitaMedida) return;
  orbitaMedida = radioOrbita;
  const medioPlaneta = radioAgujero / PLANETAS_POR_AGUJERO; // radio del agujero / (planetas que mide) = medio planeta
  const fin = (radioOrbita - medioPlaneta * 1.25) / radioAgujero; // aquí ya no se ve ningún píxel
  const inicio = fin * (1 - DIFUMINAR_BORDE);                    // aquí empiezan a apagarse
  for (const p of particulas) {
    const t = Math.max(0, Math.min(1, (fin - p.r) / (fin - inicio)));
    p.borde = t * t * (3 - 2 * t); // curva suave (smoothstep): sin escalón al empezar ni al acabar
  }
}

// ----- El anillo que enmarca el agujero -----
// Píxeles pegados al borde del agujero que giran todos juntos (sin deformarse),
// a la misma velocidad que el borde de dentro del disco: el disco, el halo y el anillo
// se mueven juntos, sin cruzarse a contramarcha.
// Cada uno tiene su ángulo, su distancia (un poco dentro o fuera del borde) y su luz.
const anillo = [];
for (let i = 0; i < PIXELES_ANILLO; i++) {
  anillo.push({
    angulo: Math.random() * Math.PI * 2,
    r: 0.97 + Math.random() ** 2 * 0.14, // la mayoría justo en el borde
    luz: 0.45 + Math.random() * 0.65,
  });
}
let giroAnillo = 0;

// Las nubes brillantes giran todas juntas, como un bloque: así su forma no se deforma.
// Los píxeles giran a distintas velocidades y simplemente "atraviesan" las nubes.
let giroNubes = 0;

// ----- Estrellas atrapadas -----
// fondo-estrellas.js nos manda los píxeles de una estrella que pasó demasiado cerca.
// Cada píxel cae hasta una órbita del disco, gira con los demás un rato y,
// poco a poco, se acerca al centro hasta cruzar el horizonte (y desaparece).
const atrapadas = [];

// Recibe los píxeles de una estrella: [{ x, y, luz }] en coordenadas de la pantalla
function atrapar(pixeles, color) {
  const caja = lienzo.getBoundingClientRect(); // dónde está el lienzo en la pantalla

  // Distancia al centro (en radios del agujero) de cada píxel, y la del más cercano
  const distancias = pixeles.map((p) =>
    Math.hypot(p.x - caja.left - centroX, p.y - caja.top - centroY) / radioAgujero
  );
  const masCerca = Math.min(...distancias);

  pixeles.forEach((p, i) => {
    for (let copia = 0; copia < COPIAS_POR_PIXEL; copia++) {
      if (atrapadas.length >= MAX_ATRAPADAS) return;

      // Posición dentro del lienzo, con un poco de desorden para que la estrella se "deshilache"
      const x = p.x - caja.left + (Math.random() - 0.5) * rejilla * 2;
      const y = p.y - caja.top + (Math.random() - 0.5) * rejilla * 2;

      // ¿En qué ángulo del disco está? Deshacemos el giro y el aplastado del disco
      const dx = x - centroX;
      const dy = y - centroY;
      const lx = dx * COS_GIRO + dy * SIN_GIRO;
      const ly = (-dx * SIN_GIRO + dy * COS_GIRO) / INCLINACION_DISCO;

      atrapadas.push({
        inicioX: x,
        inicioY: y,
        angulo: Math.atan2(ly, lx),
        r: 1.4 + Math.random() * 1.6, // la órbita del disco a la que va a parar
        // avance: 0 = en su sitio, 1 = ya en el disco. Si empieza en negativo, espera un poco.
        // Los píxeles más lejanos esperan más: así la estrella se estira como un hilo.
        avance: -((distancias[i] - masCerca) * 0.6 + Math.random() * 0.15),
        luz: p.luz,
        color,
      });
    }
  });
}

// Mueve las partículas atrapadas (se llama en cada fotograma desde animar)
function moverAtrapadas(pasos) {
  // Recorremos la lista al revés para poder borrar sin saltarnos ninguna
  for (let i = atrapadas.length - 1; i >= 0; i--) {
    const a = atrapadas[i];
    // Gira como el disco: más rápido cuanto más cerca del centro
    a.angulo += velocidadAngular(a.r) * pasos;

    if (a.avance < 1) {
      a.avance = Math.min(1, a.avance + pasos / (60 * DURACION_CAIDA));
    } else {
      a.r -= CAIDA_AL_CENTRO * pasos;        // ya en el disco: se acerca al horizonte
      if (a.r < 1) atrapadas.splice(i, 1);   // cruzó el horizonte: desaparece
    }
  }
}

// Busca (o crea) el trazado de un color dentro de un Map
function trazadoDe(mapa, color) {
  if (!mapa.has(color)) mapa.set(color, new Path2D());
  return mapa.get(color);
}

// Pinta los trazados de un Map, cada uno con su color (por defecto, en el lienzo de atrás)
function pintarColores(mapa, contexto = ctx) {
  for (const [color, trazado] of mapa) {
    contexto.fillStyle = color;
    contexto.fill(trazado);
  }
}

// ----- El dragón despierta -----
// Al pasar el ratón (o tocar, o llegar con Tab) el dragón brilla más y se le enciende el ojo.
let despertar = 0; // 0 = dormido, 1 = despierto. Cambia poco a poco, nunca de golpe
let vuelta = VUELTA_QUIETO; // en qué punto de la vuelta a la esfera está la Z (en grados)
// Su sitio en la esfera: los calcula doblarSobreElAgujero() para que quede en DRAGON_X, DRAGON_Y
let vueltaQuieta = VUELTA_QUIETO; // grados (la vuelta de su sitio)
let latitudCasa = LATITUD;        // radianes (la latitud de su sitio)
let latitudQuieta = LATITUD;      // radianes: la latitud de AHORA (se mueve al apuntar a un planeta)
let ultimoDespertar = ""; // el último valor que le pasamos al CSS (si no cambia, no lo tocamos)

function estaDespierto() {
  return zona.matches(":hover") || zona.matches(":focus-visible") || agujero.classList.contains("agujero--abierto");
}

// ----- Hacia dónde mira el dragón -----
// El dragón siempre va por la MISMA línea de la esfera (su latitud no cambia): solo cambia su
// "vuelta", que es como la longitud en un globo terráqueo. Y gira con la órbita de los planetas
// (window.rotacionOrbita, que comparte orbita.js): si giran solos, arrastras o usas la rueda,
// él también.
//   · Al cargar, está en su sitio.
//   · Si apuntas a un PLANETA (ratón o Tab), recorre su línea hasta quedar mirando hacia ese
//     planeta, y desde ahí sigue girando con la órbita: como el planeta gira igual, lo sigue
//     mirando, hasta que apuntes a otro.
//   · Si tocas al DRAGÓN (o llegas con Tab al agujero), vuelve a su sitio mientras sigas encima,
//     para que puedas hacer clic.
// Siempre se mueve suave hacia donde le toca (nunca de golpe).
let rotacionInicial = null; // el giro de los planetas al cargar (ahí el dragón está en su sitio)
let atrapado = false;       // true = lo has tocado y sigues sobre el agujero
let planetaElegido = null;  // el número del último planeta al que has apuntado (en el orden del HTML)
let apuntandoPlaneta = false; // true = el ratón (o Tab) está AHORA sobre un planeta: el ojo se enciende

const planetasDeLaOrbita = Array.from(document.querySelectorAll(".orbita .planeta"));
const SEPARACION_PLANETAS = (Math.PI * 2) / (planetasDeLaOrbita.length || 1); // igual que en orbita.js
planetasDeLaOrbita.forEach((planeta, i) => {
  planeta.addEventListener("pointerenter", () => { planetaElegido = i; apuntandoPlaneta = true; });
  planeta.addEventListener("pointerleave", () => { apuntandoPlaneta = false; });
  planeta.addEventListener("focusin", () => { planetaElegido = i; apuntandoPlaneta = true; });
  planeta.addEventListener("focusout", () => { apuntandoPlaneta = false; });
});

function girarLetra(pasos) {
  latitudQuieta = latitudCasa; // su línea: la latitud de su sitio, siempre
  if (!DA_VUELTAS) { vuelta = vueltaQuieta; return; } // quieto, en su sitio
  const sobreElAgujero = zona.matches(":hover") || zona.matches(":focus-visible");
  if (!sobreElAgujero) atrapado = false;
  else if (zona.matches(":focus-visible") ||
           (luzRaton.encima && ctxDelante.isPointInPath(siluetaDelDragon(), luzRaton.x, luzRaton.y))) atrapado = true;

  const rotacion = window.rotacionOrbita;
  if (typeof rotacion !== "number") return; // aún no hay órbita
  if (rotacionInicial === null) rotacionInicial = rotacion;

  let vueltaObjetivo;
  if (atrapado || control > 0.001) {
    vueltaObjetivo = vueltaQuieta; // a su sitio
  } else if (planetaElegido !== null) {
    // Mirar al planeta. En orbita.js el planeta i está en el ángulo "rotacion + i · separación",
    // y el que está justo delante (el más cercano a nosotros) tiene 90°. El dragón mira de
    // frente con la vuelta en 0°, y al subir el ángulo de la órbita su vuelta baja (los dos van
    // hacia la izquierda por delante). Así que para mirar al planeta:
    const anguloPlaneta = rotacion + planetaElegido * SEPARACION_PLANETAS;
    vueltaObjetivo = (Math.PI / 2 - anguloPlaneta) / aRadianes;
  } else {
    // Aún sin planeta: desde su sitio, gira lo mismo que la órbita
    vueltaObjetivo = vueltaQuieta - (rotacion - rotacionInicial) / aRadianes * VUELTA_CON_PLANETAS;
  }
  // La vuelta equivalente más cercana (360° más o menos es el mismo sitio): camino más corto
  vueltaObjetivo += Math.round((vuelta - vueltaObjetivo) / 360) * 360;
  vuelta += (vueltaObjetivo - vuelta) * Math.min(1, 0.1 * pasos);
}

// La latitud del pecho. Girando sola está SUBIR_LETRA grados al norte (para no pasar por
// debajo del disco); cuando el ratón la mueve baja a la latitud "de frente", así el pecho
// queda en el centro del agujero y desde ahí rueda hasta el ratón
function latitudActual() {
  return latitudQuieta - (latitudQuieta - EJE_ESFERA) * control;
}

// Pasa al CSS cómo debe estar la Z.
// --latitud y --vuelta van en el cuerpo, que es el único que las usa: en el CSS son
// "no heredables" (@property), así el navegador no recalcula todos los trozos en cada fotograma
function moverLetra() {
  cuerpoLetra.style.setProperty("--latitud", latitudActual().toFixed(4) + "rad");
  cuerpoLetra.style.setProperty("--vuelta", vuelta.toFixed(2) + "deg");
  // Con el ratón encima del dragón (o con el teclado) crece un poco: el CSS lo anima (.letra3d--encima)
  letra3d.classList.toggle("letra3d--encima", DA_VUELTAS ? atrapado : zona.matches(":hover") || zona.matches(":focus-visible"));
  // Mientras apuntas a un planeta, el ojo rojo se enciende (el dragón lo mira). Al quitar el
  // ratón del planeta se apaga al instante (el dragón sigue mirándolo, pero ya con el ojo apagado)
  letra3d.classList.toggle("letra3d--ojo", DA_VUELTAS && apuntandoPlaneta);
  // --despertar la usa la Z para su brillo de neón
  const valor = despertar.toFixed(3);
  if (valor !== ultimoDespertar) {
    ultimoDespertar = valor;
    letra3d.style.setProperty("--despertar", valor);
  }
  apagarTrozos();
}

// ----- Desaparecer por detrás de la esfera -----
// Hacemos a mano los mismos giros que el CSS, pero solo con una flecha: la que sale del
// centro de la esfera hacia cada trozo. Su "z" dice hacia dónde mira el trozo:
// 1 = justo hacia nosotros, 0 = en el borde de la esfera, negativo = detrás.
// Cuanto más se acerca al borde, más transparente: se va hundiendo en la oscuridad.
const aRadianes = Math.PI / 180;

function girarX(v, angulo) {
  const c = Math.cos(angulo), s = Math.sin(angulo);
  return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c];
}
function girarY(v, angulo) {
  const c = Math.cos(angulo), s = Math.sin(angulo);
  return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c];
}

function girarZ(v, angulo) {
  const c = Math.cos(angulo), s = Math.sin(angulo);
  return [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]];
}

// Rodar la esfera hacia la dirección "theta" de la pantalla (0 = derecha, π/2 = abajo).
// Es un giro de "alfa" radianes alrededor del eje (-sen θ, cos θ, 0): el que es perpendicular
// a esa dirección. Es lo mismo que hace rotate3d() en el CSS (fórmula de Rodrigues).
function rodar(v, theta, alfa) {
  const ux = -Math.sin(theta), uy = Math.cos(theta);
  const c = Math.cos(alfa), s = Math.sin(alfa);
  const proyeccion = ux * v[0] + uy * v[1];
  return [
    v[0] * c + uy * v[2] * s + ux * proyeccion * (1 - c),
    v[1] * c - ux * v[2] * s + uy * proyeccion * (1 - c),
    v[2] * c + (ux * v[1] - uy * v[0]) * s,
  ];
}

// Un punto de la Z plana (x, y en anchos de Z desde el pecho) pegado a la esfera:
// lo alejamos del frente tantos radianes como su distancia × curva (igual que el CSS de los trozos)
function sobreLaEsfera(x, y) {
  const distancia = Math.hypot(x, y) || 0.0001;
  const angulo = distancia * curvaLetra;
  const lado = Math.sin(angulo) / distancia;
  return [x * lado, y * lado, Math.cos(angulo)];
}

function apagarTrozos() {
  // Mientras el ratón mueve al dragón, se apaga más tarde (para que su punta llegue a verse en el borde)
  const empieza = EMPIEZA_A_DESAPARECER + (EMPIEZA_A_DESAPARECER_TOCANDO - EMPIEZA_A_DESAPARECER) * control;
  const desaparece = DESAPARECE_DEL_TODO + (DESAPARECE_DEL_TODO_TOCANDO - DESAPARECE_DEL_TODO) * control;
  for (const trozo of trozos) {
    // 1) Dónde está el trozo en la esfera (lo que hace el rotate3d del CSS)
    let flecha = sobreLaEsfera(trozo.sx, trozo.sy);
    // 2) Los giros del cuerpo, del último al primero
    flecha = girarX(flecha, latitudActual());                        // --latitud
    flecha = girarY(flecha, vuelta * aRadianes);                     // --vuelta
    flecha = girarX(flecha, -EJE_ESFERA);                            // --eje-esfera
    flecha = girarZ(flecha, GIRO_DISCO);                             // --giro
    flecha = rodar(flecha, rodarTheta, rodarAlfa);                   // --rodar (el imán)
    // 3) De "mirando de frente" a "en el borde": de 1 a 0, con una curva suave
    let luz = (flecha[2] - desaparece) / (empieza - desaparece);
    luz = Math.max(0, Math.min(1, luz));
    luz = luz * luz * (3 - 2 * luz);
    // Sombra de la esfera: lo que mira de frente recibe toda la luz, lo que se tumba hacia el borde menos
    luz *= 1 - SOMBRA_ESFERA * (1 - Math.max(0, flecha[2]));
    // Solo tocamos el estilo si ha cambiado algo (así el navegador trabaja menos)
    if (Math.abs(luz - trozo.luz) > 0.01 || (luz !== trozo.luz && (luz === 0 || luz === 1))) {
      trozo.luz = luz;
      trozo.elemento.style.setProperty("--luz", luz.toFixed(2));
    }
  }
}

// ----- El imán: rodar hacia el ratón -----
// Si el ratón está en la dirección θ (theta) del agujero, la esfera rueda un ángulo α (alfa)
// hacia ese lado y el dragón se desliza por su superficie. El pecho del dragón es su centro:
// sin rodar, el pecho está justo en el centro del agujero.
//
// Cuánto rodar depende de dónde está el ratón (d = distancia al centro, en radios del agujero):
//
//   1) Dentro del agujero (d < 1): el pecho va justo debajo del ratón.
//      Rodar α mueve el pecho a la distancia sen(α) del centro, así que  α = asen(d).
//      (Sin pasarse de αToca: cerca del borde, la punta ya lo toca y el pecho se queda ahí.)
//   2) Fuera, hasta la órbita de los planetas: la punta del dragón toca el borde,
//      y arriba a la derecha además se esconde:
//        α = αToca(θ) + E · w(θ) · (αOculta(θ) − αToca(θ))
//   3) Con el ratón sobre un planeta: el dragón apunta a ese planeta (α = αToca hacia él).
//
//   αToca(θ)   lo que hay que rodar para que la punta del dragón que más sobresale hacia θ
//              llegue al borde (abajo a la derecha, por ejemplo, la punta de abajo)
//   αOculta(θ) lo que hay que rodar para que el dragón entero quede detrás de la esfera
//   w(θ)       max(0, cos(θ − arriba-derecha))¹⁰: 1 arriba a la derecha, 0 lejos de ahí
//   E          ESCONDER_ARRIBA_DERECHA
//
// αToca y αOculta dependen de la forma del dragón, así que no salen de una fórmula:
// los medimos al empezar (medirTabla) probando muchos ángulos, y los guardamos en una tabla.
//
// El dragón no salta al objetivo: cada fotograma recorre un trocito (SUAVIDAD_IMAN) del camino
// que le falta. Así frena al llegar y nunca se pasa de largo (sin rebote).
const ARRIBA_DERECHA = -Math.PI / 4; // en pantalla la "y" crece hacia abajo, por eso es negativo
const DIRECCIONES = 48;               // direcciones de la tabla (una cada 7.5°)
const PASO_ALFA = 2 * aRadianes;      // de 2 en 2 grados...
const MAX_ALFA = 170 * aRadianes;     // ...hasta 170°

// Puntos del dragón (en anchos de Z desde el pecho): una rejilla de 30×30 sobre su forma.
// Solo cuentan los puntos con algo de grosor alrededor: la última parte de cada punta
// es tan fina que no se ve, y queremos que lo que toca el borde se vea tocándolo.
const GROSOR_VISIBLE = 1.5; // mitad del grosor mínimo, en unidades de la Z (que mide 100)
function dentroDelDragon(x, y) {
  return probador.isPointInPath(formaZ, x, y);
}
const puntosDragon = [];
for (let i = 0; i < 30; i++) {
  for (let j = 0; j < 30; j++) {
    const x = CAJA_Z.x + ((i + 0.5) * CAJA_Z.lado) / 30;
    const y = CAJA_Z.y + ((j + 0.5) * CAJA_Z.lado) / 30;
    const g = GROSOR_VISIBLE;
    if (dentroDelDragon(x, y) && dentroDelDragon(x - g, y) && dentroDelDragon(x + g, y) &&
        dentroDelDragon(x, y - g) && dentroDelDragon(x, y + g)) {
      puntosDragon.push([(x - CAJA_Z.x) / CAJA_Z.lado - 0.5 - PECHO_X, (y - CAJA_Z.y) / CAJA_Z.lado - 0.5 - PECHO_Y]);
    }
  }
}

// tabla[i] es la dirección θ = i · 360°/DIRECCIONES, y para cada α (de 2 en 2 grados) guarda:
//   alcance: hasta dónde llega el dragón hacia θ (1 = el borde; solo cuentan los puntos visibles)
//   alto:    la "z" del punto más de frente (menos de 0 = todo el dragón está detrás)
let tabla = [];

function medirTabla() {
  // El dragón como está cuando lo mueve el ratón: pecho de frente, sin rodar.
  // (Con vuelta = 0 y la latitud "de frente", los giros del cuerpo se anulan salvo el --giro.)
  const base = puntosDragon.map(([x, y]) => girarZ(sobreLaEsfera(x, y), GIRO_DISCO));

  tabla = [];
  for (let i = 0; i < DIRECCIONES; i++) {
    const theta = (i / DIRECCIONES) * Math.PI * 2;
    const cos = Math.cos(theta), sin = Math.sin(theta);
    const fila = { alcance: [], alto: [] };
    for (let alfa = 0; alfa <= MAX_ALFA + 0.0001; alfa += PASO_ALFA) {
      let alcance = -1, alto = -1;
      for (const punto of base) {
        const p = rodar(punto, theta, alfa);
        alto = Math.max(alto, p[2]);
        if (p[2] > 0) alcance = Math.max(alcance, p[0] * cos + p[1] * sin);
      }
      fila.alcance.push(alcance);
      fila.alto.push(alto);
    }
    tabla.push(fila);
  }
}

// El primer α de la fila en que se cumple "llega": mira de 2 en 2 grados y afina entre los dos últimos
function primerAlfa(valores, llega, objetivo) {
  for (let n = 0; n < valores.length; n++) {
    if (!llega(valores[n])) continue;
    if (n === 0) return 0;
    const t = (objetivo - valores[n - 1]) / (valores[n] - valores[n - 1] || 1);
    return (n - 1 + Math.max(0, Math.min(1, t))) * PASO_ALFA;
  }
  return MAX_ALFA;
}

// αToca y αOculta hacia θ, sacados de la tabla
function alfasHacia(theta, escala) {
  const toca = TOCA_BORDE / escala;
  function deLaFila(fila) {
    const alfaToca = primerAlfa(fila.alcance, (a) => a >= toca, toca);
    const alfaOculta = primerAlfa(fila.alto, (z) => z < DESAPARECE_DEL_TODO_TOCANDO, DESAPARECE_DEL_TODO_TOCANDO);
    return [alfaToca, Math.max(alfaToca, alfaOculta)];
  }
  // θ cae entre dos filas de la tabla: mezclamos las dos para que no vaya a saltos
  const posicion = ((theta / (Math.PI * 2)) * DIRECCIONES % DIRECCIONES + DIRECCIONES) % DIRECCIONES;
  const i = Math.floor(posicion), f = posicion - i;
  const a = deLaFila(tabla[i]), b = deLaFila(tabla[(i + 1) % DIRECCIONES]);
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
}

// La ecuación: hacia dónde (θ) y cuánto (α) rodar, según dónde esté el ratón.
// Devuelve también "fuerza": 1 = el ratón manda del todo, 0 = ya no le afecta.
function objetivoDelRaton() {
  // Imán apagado: no le afecta el ratón (y ni medimos el lienzo, que obliga al navegador a recalcular)
  if (!SIGUE_AL_RATON) return { theta: 0, alfa: 0, fuerza: 0 };
  const caja = lienzo.getBoundingClientRect();
  const centro = [caja.left + centroX, caja.top + centroY];
  const escala = 1; // (el dragón ya no crece al despertar)

  // 3) Sobre un planeta: apunta a él (a su centro, aunque el ratón esté en su borde)
  if (planetaSenalado) {
    const esfera = planetaSenalado.querySelector(".planeta__esfera").getBoundingClientRect();
    const theta = Math.atan2(esfera.top + esfera.height / 2 - centro[1], esfera.left + esfera.width / 2 - centro[0]);
    return { theta, alfa: alfasHacia(theta, escala)[0], fuerza: 1 };
  }
  if (ratonX === null) return { theta: 0, alfa: 0, fuerza: 0 };

  const dx = ratonX - centro[0];
  const dy = ratonY - centro[1];
  const theta = Math.atan2(dy, dx);
  const d = Math.hypot(dx, dy) / radioAgujero; // distancia en radios del agujero

  // ¿Hasta dónde llega el imán? Hasta la órbita (una elipse torcida con el --giro del disco)
  // más medio planeta. "e" = 1 justo en la órbita, menos dentro, más fuera
  const radioX = parseFloat(orbita.style.getPropertyValue("--radio-x")) || radioAgujero * 3;
  const radioY = parseFloat(orbita.style.getPropertyValue("--radio-y")) || radioAgujero;
  const bajadaFrente = parseFloat(orbita.style.getPropertyValue("--bajada-frente")) || 0;
  const medioPlaneta = radioAgujero / PLANETAS_POR_AGUJERO; // radio del agujero / (planetas que mide) = medio planeta
  const ex = dx * COS_GIRO + dy * SIN_GIRO;   // deshacemos el giro de la elipse
  const ey = -dx * SIN_GIRO + dy * COS_GIRO;
  // Por delante (ey > 0) la órbita baja más (bajadaFrente, de orbita.js): la elipse es más alta ahí
  const e = Math.hypot(ex / (radioX + medioPlaneta), ey / (radioY + (ey > 0 ? bajadaFrente : 0) + medioPlaneta));
  const fuerza = e <= 1 ? 1 : Math.max(0, 1 - (e - 1) / MARGEN_ORBITA);
  if (fuerza === 0) return { theta, alfa: 0, fuerza: 0 };

  const [alfaToca, alfaOculta] = alfasHacia(theta, escala);
  let alfa;
  if (d < 1) {
    // 1) Dentro: el pecho justo debajo del ratón
    alfa = Math.min(Math.asin(Math.min(1, d / escala)), alfaToca);
  } else {
    // 2) Fuera: la punta toca el borde (y arriba a la derecha se esconde).
    // El escondite entra poco a poco al salir del agujero, para no dar un salto en el borde
    const w = Math.max(0, Math.cos(theta - ARRIBA_DERECHA)) ** 10; // más alto = zona de esconderse más estrecha
    const saliendo = Math.min(1, (d - 1) / 0.3);
    alfa = alfaToca + ESCONDER_ARRIBA_DERECHA * w * saliendo * (alfaOculta - alfaToca);
  }
  return { theta, alfa: alfa * fuerza, fuerza };
}

const iman = { x: 0, y: 0 }; // el giro actual como flecha: dirección θ y largo α
let rodarTheta = 0;  // hacia dónde rueda la esfera ahora (lo usan apagarTrozos y el CSS)
let rodarAlfa = 0;   // cuánto rueda
let control = 0;     // 0 = el dragón gira solo, 1 = lo mueve el ratón
let ratonX = null;   // null = el ratón no está en la página
let ratonY = null;
let planetaSenalado = null; // el planeta que tiene el ratón encima (o null)
let imanQuieto = true;

// Solo ratón o lápiz: en móvil el dedo arrastra la órbita, no queremos mover la Z
document.addEventListener("pointermove", (evento) => {
  if (evento.pointerType === "touch") return;
  ratonX = evento.clientX;
  ratonY = evento.clientY;
  planetaSenalado = evento.target.closest?.(".planeta") || null;
});
document.documentElement.addEventListener("mouseleave", () => {
  ratonX = null;
  planetaSenalado = null;
});

function moverIman(pasos) {
  // 1) ¿Adónde quiere ir? Lo guardamos como una flecha: dirección θ y largo α
  const objetivo = objetivoDelRaton();
  const objetivoX = Math.cos(objetivo.theta) * objetivo.alfa;
  const objetivoY = Math.sin(objetivo.theta) * objetivo.alfa;

  // Si ya está en reposo y nadie tira de él, no hacemos nada (ahorra trabajo)
  const quieto = Math.abs(iman.x) + Math.abs(iman.y) < 0.001 && control < 0.001;
  if (quieto && objetivo.fuerza === 0) {
    if (!imanQuieto) {
      iman.x = iman.y = control = 0;
      ponerIman(0, 0);
    }
    imanQuieto = true;
    return;
  }
  imanQuieto = false;

  // 2) Recorre un trocito de lo que le falta (sin rebote: frena al acercarse y nunca se pasa).
  // "pasos" lo ajusta para que vaya igual en pantallas de 60 Hz o 144 Hz
  const trocito = 1 - (1 - SUAVIDAD_IMAN) ** pasos;
  const antesX = iman.x, antesY = iman.y;
  iman.x += (objetivoX - iman.x) * trocito;
  iman.y += (objetivoY - iman.y) * trocito;
  control += (objetivo.fuerza - control) * trocito;

  // 3) Se estira en la dirección en que se mueve (más cuanto más rápido)
  const vx = (iman.x - antesX) / (pasos || 1), vy = (iman.y - antesY) / (pasos || 1);
  const estira = Math.min(Math.hypot(vx, vy) * 4, 0.35) * ELASTICIDAD_IMAN;
  ponerIman(estira, (Math.atan2(vy, vx) * 180) / Math.PI);
}

// Pasa el imán al CSS (cada variable, en el elemento que la usa: ver moverLetra)
function ponerIman(estira, angulo) {
  rodarAlfa = Math.hypot(iman.x, iman.y);
  if (rodarAlfa > 0.0001) rodarTheta = Math.atan2(iman.y, iman.x);
  cuerpoLetra.style.setProperty("--rodar-eje-x", (-Math.sin(rodarTheta)).toFixed(4));
  cuerpoLetra.style.setProperty("--rodar-eje-y", Math.cos(rodarTheta).toFixed(4));
  cuerpoLetra.style.setProperty("--rodar", rodarAlfa.toFixed(4) + "rad");
  letra3d.style.setProperty("--iman-estira", estira.toFixed(3));
  letra3d.style.setProperty("--iman-angulo", angulo.toFixed(1) + "deg");
}

// ----- El cromo: el blanco sale de donde apunta el ratón -----
// Encima del dibujo hay un degradado redondo (#cromo-z) de blanco medio transparente: un punto
// de luz en el centro y anillos que salen hacia fuera. Dos cosas lo mueven:
//   1) El centro (cx, cy) va al punto del dragón que apunta al ratón (con el imán apagado, el pecho).
//   2) Cada fotograma reescribimos la transparencia un poco "más hacia fuera": así los anillos avanzan.
const cromoZ = document.getElementById("cromo-z");
const PARADAS_CROMO = 24; // cuántas paradas tiene el degradado (más = ondas más suaves)
let faseCromo = 0;        // cuánto han avanzado las ondas (de 0 a 1 y vuelta a empezar)
const centroCromo = { x: PECHO[0], y: PECHO[1] };

// Cambiamos los colores de reposo del HTML por nuestras paradas
const paradasCromo = [];
cromoZ.replaceChildren();
for (let i = 0; i < PARADAS_CROMO; i++) {
  const parada = document.createElementNS("http://www.w3.org/2000/svg", "stop");
  parada.setAttribute("offset", (i / (PARADAS_CROMO - 1)).toFixed(3));
  parada.setAttribute("stop-color", "#ffffff"); // siempre blanco: lo que cambia es cuánto se ve
  cromoZ.appendChild(parada);
  paradasCromo.push(parada);
}
cromoZ.setAttribute("r", RADIO_CROMO);

// El punto del dragón (en unidades de su dibujo) que queda debajo del ratón.
// Sin rodar, el pecho está en el centro del agujero. Rodar α lo aleja del centro, así que el punto
// que se ve a la distancia d del centro (el ratón, o el borde si está fuera) es el que estaba
// a  asen(d) − α  radianes del pecho, en la dirección θ.
function puntoQueApunta() {
  if (control < 0.001) return PECHO;
  let d = 1; // sobre un planeta o fuera del agujero: el borde
  if (!planetaSenalado && ratonX !== null) {
    const caja = lienzo.getBoundingClientRect();
    d = Math.min(1, Math.hypot(ratonX - caja.left - centroX, ratonY - caja.top - centroY) / radioAgujero);
  }
  const beta = Math.max(0, Math.asin(d) - rodarAlfa);
  // De radianes de esfera a unidades del dibujo; la dirección en el dibujo es θ sin el --giro del disco
  const largo = (beta / curvaLetra) * CAJA_Z.lado * control;
  const angulo = rodarTheta - GIRO_DISCO;
  return [PECHO[0] + Math.cos(angulo) * largo, PECHO[1] + Math.sin(angulo) * largo];
}

// Clic: un anillo de luz que sale del punto del golpe y recorre todo el dragón.
// golpeLuz va de 1 (recién golpeado) a 0 (el anillo ya llegó al borde y se apagó)
let golpeLuz = 0;
const luzOndas = new Array(PARADAS_CROMO).fill(0); // la luz de las ondas a cada distancia del centro

function pintarCromo(pasos) {
  // 1) El centro se desliza hacia el punto que apunta al ratón (igual de suave que el imán)
  const objetivo = puntoQueApunta();
  const trocito = pasos > 0 ? 1 - (1 - SUAVIDAD_IMAN) ** pasos : 1;
  centroCromo.x += (objetivo[0] - centroCromo.x) * trocito;
  centroCromo.y += (objetivo[1] - centroCromo.y) * trocito;
  cromoZ.setAttribute("cx", centroCromo.x.toFixed(2));
  cromoZ.setAttribute("cy", centroCromo.y.toFixed(2));

  // 2) Las ondas avanzan hacia fuera
  faseCromo = (faseCromo + VELOCIDAD_CROMO * pasos) % 1;
  paradasCromo.forEach((parada, i) => {
    const s = i / (PARADAS_CROMO - 1); // 0 = centro, 1 = borde del degradado
    const nucleo = Math.exp(-((s / 0.12) ** 2)); // el punto blanco del centro
    // Una onda: cos() sube y baja ONDAS_CROMO veces del centro al borde. Al crecer la fase,
    // cada cresta está un poco más lejos: la luz "sale" del centro
    const onda = 0.5 + 0.5 * Math.cos(Math.PI * 2 * (s * ONDAS_CROMO - faseCromo));
    // La onda se difumina al avanzar: "nitidez" vale 1 en el centro y 0 en el borde,
    // así el anillo se va apagando hasta deshacerse en el metal
    const nitidez = (1 - s) ** DIFUMINAR_CROMO;
    let luz = nucleo + (1 - nucleo) * onda * nitidez;
    // El anillo del clic: una banda brillante en la distancia "avance", que crece de 0 a 1
    if (golpeLuz > 0) {
      const avance = 1 - golpeLuz;
      luz += golpeLuz * 1.6 * Math.exp(-(((s - avance) / 0.09) ** 2)) + golpeLuz * nucleo;
    }
    parada.setAttribute("stop-opacity", Math.min(1, luz * INTENSIDAD_ONDAS).toFixed(3));
    luzOndas[i] = Math.min(1, luz * INTENSIDAD_ONDAS); // la misma luz, para el dragón de píxeles
  });
  golpeLuz = Math.max(0, golpeLuz - pasos / (DURACION_GOLPE_LUZ * 60));
}
pintarCromo(0); // los colores de salida (y los que se quedan si se pide menos movimiento)

// ----- La luz del ratón: una estrella de píxeles sobre el dragón -----
// Como en el título: al pasar el ratón por encima brilla una cruz de píxeles blancos donde
// apuntas, con una estela corta, y solo se ve encima del dragón (fuera de él no se pinta).
// Se dibuja en el lienzo de delante, así los píxeles de la luz son los mismos que los del disco.
//
// Para recortarla con la forma del dragón necesitamos su silueta EN LA PANTALLA. El dragón está
// doblado sobre la esfera, así que llevamos cada punto de su contorno a la esfera y lo giramos
// igual que el CSS (como en apagarTrozos), y al final aplicamos la perspectiva:
// lo que está más cerca de nosotros (z) se ve un poco más grande.
const luzRaton = { x: 0, y: 0, luz: 0, encima: false };
let estelaLuz = [];            // puntos por donde pasó el cursor: { x, y, edad }
let tiempoLuz = performance.now();

// El contorno del dragón como listas de puntos: "M x yL x y...Z" → [[x, y], [x, y], ...]
const contornosZ = document.getElementById("forma-z").getAttribute("d")
  .split("Z").filter((trozo) => trozo.trim() !== "")
  .map((trozo) => trozo.replace("M", "").split("L").map((punto) => punto.trim().split(" ").map(Number)));

// Un punto del dibujo (u, v en unidades del viewBox) → píxeles del lienzo, sin el tamaño extra.
// Con DRAGON_PLANO el dibujo no se dobla: está plano, movido "plano.x, plano.y" para quedar donde
// quedaba doblado sobre la esfera (arriba a la derecha)
const plano = { x: 0, y: 0 };

function aLaPantallaSinZoom(u, v, perspectiva) {
  if (!DRAGON_PLANO) return aLaEsfera(u, v, perspectiva);
  const lado = letra3d.offsetWidth;
  return [
    centroX + plano.x + ((u - CAJA_Z.x) / CAJA_Z.lado - 0.5) * lado,
    centroY + plano.y + ((v - CAJA_Z.y) / CAJA_Z.lado - 0.5) * lado,
    1, // mira de frente: nunca se apaga
  ];
}

// Dónde colocar el dibujo plano: en el mismo sitio que tendría doblado sobre la esfera
// (mismo centro en horizontal, misma base en vertical)
function medirPlano() {
  agujero.classList.toggle("agujero--plano", DRAGON_PLANO);
  if (!DRAGON_PLANO) return;
  // El dibujo plano empieza centrado en el agujero; dónde va y cuánto mide lo decide
  // encajarEnElCirculo (con las escalas de medirZoom)
  plano.x = plano.y = 0;
  letra3d.style.setProperty("--plano-x", plano.x.toFixed(2) + "px");
  letra3d.style.setProperty("--plano-y", plano.y.toFixed(2) + "px");
}

// Un punto del dibujo doblado sobre la esfera (girado como el CSS de .letra3d__cuerpo)
function aLaEsfera(u, v, perspectiva) {
  let p = sobreLaEsfera((u - PECHO[0]) / CAJA_Z.lado, (v - PECHO[1]) / CAJA_Z.lado);
  p = girarX(p, latitudActual());
  p = girarY(p, vuelta * aRadianes);
  p = girarX(p, -EJE_ESFERA);
  p = girarZ(p, GIRO_DISCO);
  p = rodar(p, rodarTheta, rodarAlfa);
  const cerca = perspectiva / (perspectiva - p[2] * radioEsfera); // la perspectiva del CSS
  // El tercer número es la z: 1 = mirando de frente, 0 = en el borde de la esfera
  return [centroX + p[0] * radioEsfera * cerca, centroY + p[1] * radioEsfera * cerca, p[2]];
}

// ----- El tamaño extra y el crecer con el ratón encima -----
// Dos escalas, que hace el CSS de .letra3d con las variables que ponemos aquí:
//   1) --z-crecer y --z-x/--z-y: el tamaño y el sitio que calcula encajarEnElCirculo
//      (punto → escala · punto + desplazamiento)
//   2) --z-encima (1 o CRECER_ENCIMA) desde el centro del dragón, con una transición con rebote
// Todo se mide respecto al centro del agujero, que es el centro de .letra3d
const zoom = { crecer: 1, x: 0, y: 0, centroX: 0, centroY: 0 };

function medirZoom() {
  // La caja del dragón en la pantalla (sin zoom), a partir de su contorno
  const perspectiva = parseFloat(getComputedStyle(letra3d).perspective) || radioAgujero * 8;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const contorno of contornosZ) {
    for (const [u, v] of contorno) {
      const [x, y] = aLaPantallaSinZoom(u, v, perspectiva);
      minX = Math.min(minX, x - centroX); maxX = Math.max(maxX, x - centroX);
      minY = Math.min(minY, y - centroY); maxY = Math.max(maxY, y - centroY);
    }
  }
  // Doblado: el dragón vive en la superficie de la esfera del agujero (doblarSobreElAgujero).
  // Plano: se escala y se mueve en 2D (encajarEnElCirculo). Los dos ponen zoom.crecer, x, y y el centro
  if (DRAGON_PLANO) encajarEnElCirculo(perspectiva, (minX + maxX) / 2, (minY + maxY) / 2);
  else doblarSobreElAgujero(perspectiva);
  letra3d.style.setProperty("--z-crecer", zoom.crecer);
  letra3d.style.setProperty("--z-encima-max", CRECER_ENCIMA);
  letra3d.style.setProperty("--z-x", zoom.x.toFixed(2) + "px");
  letra3d.style.setProperty("--z-y", zoom.y.toFixed(2) + "px");
  letra3d.style.setProperty("--z-centro-x", zoom.centroX.toFixed(2) + "px");
  letra3d.style.setProperty("--z-centro-y", zoom.centroY.toFixed(2) + "px");
}

// El dragón plano, encajado DENTRO del círculo negro y por encima del disco de delante.
// Cada punto del contorno acaba en: destino + k · d
//   (d = el punto respecto al centro del dibujo; k = escala total; destino = dónde va su centro)
// Para un destino, buscamos el k más grande que cumple, en TODOS los puntos:
//   1) |destino + k·d| ≤ radioLibre  → no sale del círculo (ecuación de 2º grado en k)
//   2) su altura, medida inclinada como el disco, ≤ el suelo → el disco no lo tapa (1er grado)
function escalaQueCabe(puntos, destinoX, destinoY, radioLibre, suelo) {
  // "Hacia abajo" inclinado como el disco (el disco está girado GIRO_DISCO)
  const abajoX = -SIN_GIRO;
  const abajoY = COS_GIRO;
  const alturaDestino = destinoX * abajoX + destinoY * abajoY;
  if (alturaDestino >= suelo) return 0;
  const c = destinoX * destinoX + destinoY * destinoY - radioLibre * radioLibre;
  if (c >= 0) return 0; // el centro ya está fuera del círculo
  let k = Infinity;
  for (const [dx, dy] of puntos) {
    const a = dx * dx + dy * dy;
    if (a < 1e-6) continue;
    const b = destinoX * dx + destinoY * dy;
    k = Math.min(k, (-b + Math.sqrt(b * b - a * c)) / a);
    const bajada = dx * abajoX + dy * abajoY;
    if (bajada > 0) k = Math.min(k, (suelo - alturaDestino) / bajada);
  }
  return k;
}

function encajarEnElCirculo(perspectiva, centroDibujoX, centroDibujoY) {
  // El contorno respecto al centro del dibujo (en píxeles)
  const puntos = [];
  for (const contorno of contornosZ) {
    for (const [u, v] of contorno) {
      const [x, y] = aLaPantallaSinZoom(u, v, perspectiva);
      puntos.push([x - centroX - centroDibujoX, y - centroY - centroDibujoY]);
    }
  }
  // Su centro va donde dicen DRAGON_X y DRAGON_Y; medimos la escala más grande que cabe ahí
  const destinoX = DRAGON_X * radioAgujero;
  const destinoY = DRAGON_Y * radioAgujero;
  // El rebote de cubic-bezier(0.2, 1.4, 0.4, 1) se pasa un ~6% del camino
  const encimaMaxima = 1 + (CRECER_ENCIMA - 1) * 1.06;
  // Dos condiciones, y manda la más estricta:
  //   · en reposo llega hasta BORDE_Z (la línea que sigue el borde del círculo)
  //   · creciendo con el ratón (y el retroceso del clic) no pasa de DENTRO ni baja del suelo
  const enReposo = escalaQueCabe(puntos, destinoX, destinoY, BORDE_Z * radioAgujero, Infinity);
  const creciendo = escalaQueCabe(puntos, destinoX, destinoY,
    DENTRO * radioAgujero - EMPUJE_DRAGON, SUELO_Z * radioAgujero - EMPUJE_DRAGON) / encimaMaxima;
  zoom.crecer = Math.min(enReposo, creciendo) * Math.min(1, TAMANO_Z);
  zoom.x = destinoX - zoom.crecer * centroDibujoX;
  zoom.y = destinoY - zoom.crecer * centroDibujoY;
  // Con el ratón encima crece desde su centro (así no se sale por ningún lado)
  zoom.centroX = destinoX;
  zoom.centroY = destinoY;
}

// ----- El dragón en la superficie del agujero -----
// Imaginamos que el círculo negro es una ESFERA (de radio ESFERA_Z) y que el dragón es una
// calcomanía pegada en ella. Así, cuanto más cerca del borde, más se "tumba" y se encoge,
// como un dibujo en un globo terráqueo que se va hacia el lado de atrás.
// Tres cosas deciden cómo se ve, y las buscamos con el ordenador:
//   · curva: cuánta esfera tapa el dragón (en radianes) → su tamaño
//   · latitud y vuelta: en qué punto de la esfera está → su sitio
// Queremos: el centro de su caja en (DRAGON_X, DRAGON_Y) y lo más grande que cabe
// (hasta BORDE_Z en reposo, y sin salirse al crecer con el ratón encima).
const ESFERA_Z = 1; // radio de la esfera, en radios del agujero (1 = el círculo negro entero)

function doblarSobreElAgujero(perspectiva) {
  const destinoX = DRAGON_X * radioAgujero;
  const destinoY = DRAGON_Y * radioAgujero;
  const encimaMaxima = 1 + (CRECER_ENCIMA - 1) * 1.06; // el rebote se pasa un ~6%
  radioEsfera = ESFERA_Z * radioAgujero;

  // El contorno sobre la esfera, con una curva, latitud y vuelta de prueba (respecto al centro del agujero)
  function contornoCon(curva, latitud, vueltaGrados) {
    curvaLetra = curva;
    latitudQuieta = latitud;
    vuelta = vueltaGrados;
    const puntos = [];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const contorno of contornosZ) {
      for (const [u, v] of contorno) {
        const [x, y] = aLaEsfera(u, v, perspectiva);
        const px = x - centroX, py = y - centroY;
        puntos.push([px, py]);
        minX = Math.min(minX, px); maxX = Math.max(maxX, px);
        minY = Math.min(minY, py); maxY = Math.max(maxY, py);
      }
    }
    return { puntos, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
  }

  // Para una curva, buscamos la latitud y la vuelta que llevan el centro de su caja al destino
  // (método de Newton: probamos, vemos cuánto nos pasamos y corregimos, varias veces)
  function colocar(curva) {
    let latitud = latitudCasa, vu = vueltaQuieta;
    const paso = 0.01; // radianes (o grados ×57) para medir hacia dónde se mueve
    for (let vez = 0; vez < 8; vez++) {
      const a = contornoCon(curva, latitud, vu);
      const fx = a.cx - destinoX, fy = a.cy - destinoY;
      if (Math.hypot(fx, fy) < 0.2) break; // ya está (a menos de 0.2 px)
      const b = contornoCon(curva, latitud + paso, vu); // si sube la latitud...
      const c = contornoCon(curva, latitud, vu + paso / aRadianes); // si gira la vuelta...
      const j11 = (b.cx - a.cx) / paso, j21 = (b.cy - a.cy) / paso;
      const j12 = (c.cx - a.cx) / paso, j22 = (c.cy - a.cy) / paso;
      const det = j11 * j22 - j12 * j21;
      if (Math.abs(det) < 1e-6) break;
      // Resolver el sistema 2×2 y no dar pasos enormes
      const dLat = Math.max(-0.3, Math.min(0.3, (-fx * j22 + fy * j12) / det));
      const dVu = Math.max(-0.3, Math.min(0.3, (-fy * j11 + fx * j21) / det));
      latitud += dLat;
      vu += dVu / aRadianes;
    }
    const final = contornoCon(curva, latitud, vu);
    // ¿Cabe? En reposo hasta BORDE_Z; creciendo con el ratón (desde su centro), hasta DENTRO y el suelo
    const abajoX = -SIN_GIRO, abajoY = COS_GIRO;
    const radioLibre = DENTRO * radioAgujero - EMPUJE_DRAGON;
    const suelo = SUELO_Z * radioAgujero - EMPUJE_DRAGON;
    let cabe = true;
    for (const [px, py] of final.puntos) {
      const ex = final.cx + encimaMaxima * (px - final.cx);
      const ey = final.cy + encimaMaxima * (py - final.cy);
      if (Math.hypot(px, py) > BORDE_Z * radioAgujero ||
          Math.hypot(ex, ey) > radioLibre ||
          ex * abajoX + ey * abajoY > suelo) { cabe = false; break; }
    }
    return { latitud, vu, cabe, cx: final.cx, cy: final.cy };
  }

  // La curva más grande que cabe (búsqueda binaria: probar la mitad, y quedarse con la mitad buena)
  let pequena = 0.2, grande = 2.2;
  let mejor = colocar(pequena);
  for (let vez = 0; vez < 16; vez++) {
    const medio = (pequena + grande) / 2;
    const prueba = colocar(medio);
    if (prueba.cabe) { pequena = medio; mejor = prueba; } else grande = medio;
  }
  const curva = pequena * Math.min(1, TAMANO_Z);
  if (curva !== pequena) mejor = colocar(curva);
  contornoCon(curva, mejor.latitud, mejor.vu); // deja puestos los valores buenos
  vueltaQuieta = mejor.vu;
  latitudCasa = latitudQuieta = mejor.latitud;

  // Al CSS: el ancho de la Z es la curva × el radio (así el dibujo no se escala en 2D y se ve nítido)
  letra3d.style.width = (curva * radioEsfera).toFixed(2) + "px";
  letra3d.style.setProperty("--radio-esfera", radioEsfera.toFixed(1) + "px");
  letra3d.style.setProperty("--curva", curva.toFixed(4));
  zoom.crecer = 1;
  zoom.x = zoom.y = 0;
  // Con el ratón encima crece desde el centro de su caja
  zoom.centroX = mejor.cx;
  zoom.centroY = mejor.cy;
}

// Cuánto ha crecido ahora por el ratón (el CSS lo anima: leemos el valor de este momento)
function encimaAhora() {
  return parseFloat(getComputedStyle(letra3d).getPropertyValue("--z-encima")) || 1;
}

// Un punto del dibujo → píxeles del lienzo, con las dos escalas (igual que el CSS)
function aLaPantalla(u, v, perspectiva, encima = encimaAhora()) {
  const [x, y, z] = aLaPantallaSinZoom(u, v, perspectiva);
  const qx = zoom.x + zoom.crecer * (x - centroX);
  const qy = zoom.y + zoom.crecer * (y - centroY);
  return [
    centroX + zoom.centroX + encima * (qx - zoom.centroX),
    centroY + zoom.centroY + encima * (qy - zoom.centroY),
    z,
  ];
}

// La silueta del dragón en la pantalla, como un molde para recortar.
// Son más de 1000 puntos: la guardamos y solo la volvemos a calcular si el dragón se ha movido
// (o ha cambiado el tamaño). Con el dragón quieto se calcula una sola vez.
let siluetaGuardada = null;
let estadoSilueta = "";

function siluetaDelDragon() {
  const encima = encimaAhora();
  const estado = [plano.x, plano.y, latitudActual(), vuelta, rodarTheta, rodarAlfa, radioEsfera, curvaLetra, centroX, centroY, zoom.crecer, zoom.x, zoom.y, encima].join();
  if (estado === estadoSilueta) return siluetaGuardada;
  estadoSilueta = estado;
  const perspectiva = parseFloat(getComputedStyle(letra3d).perspective) || radioAgujero * 8;
  const silueta = new Path2D();
  for (const contorno of contornosZ) {
    contorno.forEach(([u, v], i) => {
      const [x, y] = aLaPantalla(u, v, perspectiva, encima);
      if (i === 0) silueta.moveTo(x, y);
      else silueta.lineTo(x, y);
    });
    silueta.closePath();
  }
  siluetaGuardada = silueta;
  return silueta;
}

// Un cuadradito de luz en la rejilla del disco: más luz = más grande
function pixelDeLuz(x, y, luz) {
  if (luz < 0.05) return;
  const tam = Math.max(1, Math.round(rejilla * Math.sqrt(Math.min(1, luz))));
  const hueco = (rejilla - tam) / 2;
  ctxDelante.fillRect(Math.floor(x / rejilla) * rejilla + hueco, Math.floor(y / rejilla) * rejilla + hueco, tam, tam);
}

// Estrella en cruz: un centro gordo y brazos que se apagan hacia las puntas
function estrellaDeLuz(x, y, luz, brazo) {
  for (let i = -brazo; i <= brazo; i++) {
    const l = luz * Math.pow(1 - Math.abs(i) / (brazo + 1), 1.5);
    pixelDeLuz(x + i * rejilla, y, l);
    if (i !== 0) pixelDeLuz(x, y + i * rejilla, l);
  }
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    pixelDeLuz(x + dx * rejilla, y + dy * rejilla, luz * 0.3);
  }
}

function dibujarLuzDelRaton(ahora) {
  const dt = Math.min((ahora - tiempoLuz) / 1000, 0.1); // segundos desde el último dibujo
  tiempoLuz = ahora;
  // La luz sube rápido al entrar y baja suave al salir
  luzRaton.luz += ((luzRaton.encima ? 1 : 0) - luzRaton.luz) * Math.min(1, dt * (luzRaton.encima ? 14 : 6));
  if (!luzRaton.encima && luzRaton.luz < 0.03) luzRaton.luz = 0;
  estelaLuz = estelaLuz.filter((p) => (p.edad += dt) < VIDA_ESTELA_LUZ);
  if (luzRaton.luz === 0 && estelaLuz.length === 0) return;

  ctxDelante.save();
  ctxDelante.clip(siluetaDelDragon()); // lo que se pinte fuera del dragón no se ve
  ctxDelante.fillStyle = "#ffffff";
  for (const p of estelaLuz) estrellaDeLuz(p.x, p.y, 0.45 * (1 - p.edad / VIDA_ESTELA_LUZ), 1);
  const titileo = 1 - PARPADEO_LUZ * (0.5 + 0.5 * Math.sin(ahora / 140));
  const brazo = Math.max(1, Math.round(BRAZO_LUZ * luzRaton.luz));
  estrellaDeLuz(luzRaton.x, luzRaton.y, luzRaton.luz * titileo, brazo);
  ctxDelante.restore();
}

// Dónde está el ratón en el lienzo de delante, en sus píxeles. Si el lienzo se ve estirado
// (su tamaño en pantalla no es el mismo que su tamaño interno), lo corregimos con una regla de tres
function enElLienzo(evento) {
  const caja = lienzoDelante.getBoundingClientRect();
  return [
    ((evento.clientX - caja.left) * lienzoDelante.width) / caja.width,
    ((evento.clientY - caja.top) * lienzoDelante.height) / caja.height,
  ];
}

// El ratón sobre la zona del agujero (la que despierta al dragón)
function moverLuz(evento) {
  const [x, y] = enElLienzo(evento);
  // Cada vez que el cursor avanza un píxel de la rejilla, deja un punto de estela
  const ultimo = estelaLuz[estelaLuz.length - 1];
  const seMovio = !ultimo || Math.hypot(x - ultimo.x, y - ultimo.y) >= rejilla;
  if (luzRaton.encima && seMovio && VIDA_ESTELA_LUZ > 0) estelaLuz.push({ x: luzRaton.x, y: luzRaton.y, edad: 0 });
  luzRaton.x = x;
  luzRaton.y = y;
  luzRaton.encima = true;
}
function apagarLuz() { luzRaton.encima = false; }

// ----- Clic en el dragón: explosión de píxeles -----
// Igual que en el título: píxeles que salen volando desde donde hiciste clic y frenan poco a poco,
// y una cruz de luz que crece y se apaga en ese punto
let chispasClic = [];   // { x, y, vx, vy, edad, vida, color }
let destellosClic = []; // { x, y, edad, largo }
let tiempoChispas = performance.now();

// El punto del dibujo (en unidades del viewBox) que se ve en (x, y) del lienzo:
// buscamos el punto del contorno del dragón que queda más cerca en la pantalla
function puntoDelDibujo(x, y) {
  const perspectiva = parseFloat(getComputedStyle(letra3d).perspective) || radioAgujero * 8;
  const encima = encimaAhora();
  let mejor = PECHO, distancia = Infinity;
  for (const contorno of contornosZ) {
    for (const [u, v] of contorno) {
      const [px, py] = aLaPantalla(u, v, perspectiva, encima);
      const d = Math.hypot(px - x, py - y);
      if (d < distancia) { distancia = d; mejor = [u, v]; }
    }
  }
  return mejor;
}

// El dragón reacciona al golpe, como las letras del título:
// 1) un anillo de luz sale del punto del clic y lo recorre entero
// 2) retrocede alejándose del golpe y vuelve con un pequeño rebote
function reaccionarDragon(x, y) {
  const [u, v] = puntoDelDibujo(x, y);
  centroCromo.x = u; // el centro de la luz salta al punto del golpe
  centroCromo.y = v; // (y luego vuelve despacio al pecho)
  golpeLuz = 1;

  const perspectiva = parseFloat(getComputedStyle(letra3d).perspective) || radioAgujero * 8;
  const [cx, cy] = aLaPantalla(PECHO[0], PECHO[1], perspectiva); // el centro del dragón
  const dx = cx - x, dy = cy - y;
  const largo = Math.hypot(dx, dy) || 1;
  // "translate" (y no "transform") para no pisar el transform del CSS: los dos se suman
  letra3d.animate(
    [{ translate: `${(dx / largo) * EMPUJE_DRAGON}px ${(dy / largo) * EMPUJE_DRAGON}px` }, { translate: "0 0" }],
    { duration: 500, easing: "cubic-bezier(0.2, 1.6, 0.4, 1)" }
  );
}

function explotarDragon(x, y) {
  reaccionarDragon(x, y);
  for (let i = 0; i < CHISPAS_CLIC; i++) {
    const angulo = Math.random() * Math.PI * 2;
    const velocidad = VELOCIDAD_CHISPAS_CLIC * (0.3 + Math.random() * 0.7);
    chispasClic.push({
      x, y,
      vx: Math.cos(angulo) * velocidad,
      vy: Math.sin(angulo) * velocidad,
      edad: 0,
      vida: VIDA_CHISPAS_CLIC * (0.5 + Math.random() * 0.5),
      color: COLORES_CHISPAS[i % COLORES_CHISPAS.length],
    });
  }
  destellosClic.push({ x, y, edad: 0, largo: 8 });
}

function dibujarChispas(ahora) {
  const dt = Math.min((ahora - tiempoChispas) / 1000, 0.1);
  tiempoChispas = ahora;

  // Chispas: vuelan, frenan (pierden el 95% de su velocidad cada segundo) y se apagan
  const freno = Math.pow(0.05, dt);
  chispasClic = chispasClic.filter((c) => (c.edad += dt) < c.vida);
  for (const c of chispasClic) {
    c.vx *= freno;
    c.vy *= freno;
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    ctxDelante.fillStyle = c.color;
    pixelDeLuz(c.x, c.y, 1 - c.edad / c.vida);
  }

  // Destellos: una cruz de píxeles blancos que crece y se apaga en 0.3 segundos
  destellosClic = destellosClic.filter((d) => (d.edad += dt) < 0.3);
  ctxDelante.fillStyle = "#ffffff";
  for (const d of destellosClic) {
    const t = d.edad / 0.3;
    const brazo = Math.round(1 + t * d.largo);
    for (let i = -brazo; i <= brazo; i++) {
      const luz = (1 - t) * (1 - Math.abs(i) / (brazo + 1));
      pixelDeLuz(d.x + i * rejilla, d.y, luz);
      if (i !== 0) pixelDeLuz(d.x, d.y + i * rejilla, luz);
    }
  }
}

// Solo explota si el clic cae encima del dragón (como en el título, que solo explota en las letras)
zona.addEventListener("click", (evento) => {
  if (evento.detail === 0 || sinMovimiento.matches) return; // teclado o "reducir movimiento": sin explosión
  const [x, y] = enElLienzo(evento);
  if (ctxDelante.isPointInPath(siluetaDelDragon(), x, y)) explotarDragon(x, y);
});
zona.addEventListener("pointermove", moverLuz);
zona.addEventListener("pointerdown", moverLuz); // con el dedo no hay "pasar por encima"
zona.addEventListener("pointerleave", apagarLuz);
zona.addEventListener("pointercancel", apagarLuz);

// ----- Dibujar un fotograma -----
function dibujar() {
  const coseno = COS_GIRO;
  const seno = SIN_GIRO;
  const radio2 = radioAgujero * radioAgujero; // para saber si un punto cae dentro del agujero

  // 1) El disco y el halo, sumados en las capas (cada celda se pinta UNA vez al final)
  medirBorde(); // no hace nada si la órbita no ha cambiado de tamaño
  for (const p of particulas) {
    if (p.borde === 0) continue; // ya pasado el borde: ni se calcula
    const cos = Math.cos(p.angulo);
    const sin = Math.sin(p.angulo);

    // ¿Está el píxel dentro de una nube? Se mide con el ángulo relativo a las nubes
    const nubes = 0.55 + 0.45 * Math.sin((p.angulo - giroNubes) * 3 + p.r * 3);

    // Efecto Doppler: el lado que viene hacia nosotros (izquierda) brilla más.
    // Solo cambia el TAMAÑO de los cuadraditos; el tono sale de "claridad" (sin Doppler),
    // así el lado derecho no se oscurece hasta desaparecer y el disco fluye entero
    const claridad = Math.min(1, p.luz * nubes) * p.borde;
    const luz = claridad * (1 - 0.35 * cos);

    // El disco aplastado y torcido. La mitad de atrás (sin < 0) va detrás del agujero:
    // lo que cae dentro del círculo negro no se ve, así que ni se suma
    const lx = cos * p.r;
    const ly = sin * p.r * INCLINACION_DISCO;
    const x = centroX + (lx * coseno - ly * seno) * radioAgujero;
    const y = centroY + (lx * seno + ly * coseno) * radioAgujero;
    if (sin >= 0) sumarLuz(capaDelante, x, y, luz, claridad, p.tope);
    else if ((x - centroX) ** 2 + (y - centroY) ** 2 > radio2) sumarLuz(capaDetras, x, y, luz, claridad, p.tope);

    // El "halo": la gravedad dobla la luz de la parte de dentro del disco y la vemos como
    // un anillo alrededor del agujero (lo que se ve en Interstellar). Cada píxel del halo es
    // la imagen de una partícula y gira con ella. La parte de atrás del disco se ve ARRIBA,
    // entera; la de delante deja una imagen más débil ABAJO (IMAGEN_DE_ABAJO).
    // Van a la misma capa que el disco de su lado: donde se cruzan, su luz se suma
    if (p.r < 2.2) {
      const rh = (1.06 + (p.r - R_INTERIOR) * 0.7) * radioAgujero;
      const hx = centroX + cos * rh;
      const hy = centroY + sin * rh;
      if (sin < 0) sumarLuz(capaDetras, hx, hy, luz, claridad, TONOS_DISCO.length - 1);
      else sumarLuz(capaDelante, hx, hy, luz * IMAGEN_DE_ABAJO, claridad * IMAGEN_DE_ABAJO, TONOS_DISCO.length - 1);
    }
  }

  // 2) El anillo de píxeles (la "esfera de fotones"): en la capa de atrás, encima del borde negro
  for (const p of anillo) {
    const a = p.angulo + giroAnillo;
    // Tres zonas más brillantes que dan vueltas: así se nota que el anillo gira
    // (al despertar el dragón, el anillo brilla más)
    const luz = p.luz * (0.6 + 0.4 * Math.sin(a * 3 - giroAnillo * 2)) * (1 + despertar * 0.6);
    sumarLuz(capaDetras, centroX + Math.cos(a) * p.r * radioAgujero, centroY + Math.sin(a) * p.r * radioAgujero, luz, luz, TONOS_DISCO.length - 1);
  }

  // 3) Las estrellas atrapadas (tienen su propio color): un trazado por color
  const atrapadasDetras = new Map();
  const atrapadasDelante = new Map();
  for (const a of atrapadas) {
    const cos = Math.cos(a.angulo);
    const sin = Math.sin(a.angulo);

    // Su sitio en el disco (igual que las partículas normales)
    const lx = cos * a.r;
    const ly = sin * a.r * INCLINACION_DISCO;
    const discoX = centroX + (lx * coseno - ly * seno) * radioAgujero;
    const discoY = centroY + (lx * seno + ly * coseno) * radioAgujero;

    // Mezcla entre donde estaba la estrella y su sitio en el disco.
    // "t * t" empieza lento y acelera: cae cada vez más rápido, como con la gravedad.
    const t = Math.max(0, a.avance);
    const caida = t * t;
    const x = a.inicioX + (discoX - a.inicioX) * caida;
    const y = a.inicioY + (discoY - a.inicioY) * caida;

    // Se calienta al caer (brilla más) y se apaga justo antes de cruzar el horizonte
    const luz = (a.luz + (1 - a.luz) * caida) * Math.min(1, (a.r - 1) / 0.3);

    // Mientras cae viene "de detrás"; ya en el disco, depende de su lado
    const mapa = t < 1 || sin < 0 ? atrapadasDetras : atrapadasDelante;
    ponerPixel(trazadoDe(mapa, a.color), x, y, luz);
  }

  // 4) Pintar, de atrás hacia delante
  ctx.clearRect(0, 0, ancho, alto);
  ctx.fillStyle = brillo; // resplandor suave
  ctx.fillRect(0, 0, ancho, alto);
  pintarColores(atrapadasDetras); // caen desde detrás: el agujero las tapa

  // El agujero: un círculo negro, sin borde dibujado
  ctx.beginPath();
  ctx.arc(centroX, centroY, radioAgujero, 0, Math.PI * 2);
  ctx.fillStyle = "#000";
  ctx.fill();


  pintarCapa(capaDetras, ctx); // disco de atrás + halo de arriba + anillo, ya mezclados

  // El dragón (encima del agujero y debajo del disco de delante)
  dibujarDragon(ctx);

  // La mitad de delante va en el lienzo que está encima de la Z
  ctxDelante.clearRect(0, 0, ancho, alto);
  pintarCapa(capaDelante, ctxDelante); // disco de delante + halo de abajo
  pintarColores(atrapadasDelante, ctxDelante);

  // Y encima de todo, la luz del ratón sobre el dragón y las explosiones de los clics
  dibujarLuzDelRaton(performance.now());
  dibujarChispas(performance.now());
}

// ----- Capas de luz: cada celda de la rejilla se pinta UNA sola vez -----
// Antes cada partícula ponía su cuadradito, y donde se cruzaban el disco, el halo y el anillo
// se veían cuadraditos montados unos encima de otros. Ahora cada partícula SUMA su luz a su
// celda, y al final se pinta un cuadradito por celda con la luz total: las partículas que
// coinciden se funden en un píxel más grande y más claro, como gotas de agua que se juntan.
// Para no repasar todas las celdas en cada fotograma, cada capa apunta cuáles ha usado.
let columnas = 0;
let filas = 0;
let capaDetras = null;
let capaDelante = null;

function crearCapa(celdas) {
  return {
    luz: new Float32Array(celdas),      // decide el tamaño del cuadradito
    claridad: new Float32Array(celdas), // decide su tono
    tope: new Uint8Array(celdas),       // el tono más claro permitido en esa celda
    usadas: new Int32Array(celdas),     // qué celdas se han tocado en este fotograma...
    cuantas: 0,                         // ...y cuántas
  };
}

// Se llama al medir: una capa por lienzo, del tamaño de la rejilla
function prepararCapas() {
  columnas = Math.ceil(ancho / rejilla);
  filas = Math.ceil(alto / rejilla);
  capaDetras = crearCapa(columnas * filas);
  capaDelante = crearCapa(columnas * filas);
}

// Suma la luz de un punto a su celda. Se mezcla como la luz de verdad ("pantalla"):
// 1 - (1 - a)·(1 - b). Dos luces débiles juntas brillan más, pero nunca pasan de 1
function sumarLuz(capa, x, y, luz, claridad, tope) {
  if (luz <= 0.02) return; // tan débil que no aporta nada
  const cx = Math.floor(x / rejilla);
  const cy = Math.floor(y / rejilla);
  if (cx < 0 || cy < 0 || cx >= columnas || cy >= filas) return;
  const i = cy * columnas + cx;
  if (capa.luz[i] === 0) capa.usadas[capa.cuantas++] = i; // primera vez en este fotograma
  capa.luz[i] = 1 - (1 - capa.luz[i]) * (1 - Math.min(1, luz));
  capa.claridad[i] = 1 - (1 - capa.claridad[i]) * (1 - Math.min(1, claridad));
  if (tope > capa.tope[i]) capa.tope[i] = tope;
}

// Pinta una capa: un cuadradito por celda usada (semitono: más luz = más grande y más claro)
// y la deja limpia para el siguiente fotograma
function pintarCapa(capa, contexto) {
  const trazados = TONOS_DISCO.map(() => new Path2D()); // uno por tono: se pintan de golpe
  for (let k = 0; k < capa.cuantas; k++) {
    const i = capa.usadas[k];
    const luz = capa.luz[i];
    if (luz >= 0.12) { // muy oscuro: no se dibuja
      const nivel = Math.min(capa.tope[i], Math.floor(capa.claridad[i] ** CURVA_TONOS * TONOS_DISCO.length));
      const tam = Math.max(1, Math.round(rejilla * luz));
      const hueco = (rejilla - tam) / 2;
      trazados[Math.min(nivel, TONOS_DISCO.length - 1)].rect((i % columnas) * rejilla + hueco, Math.floor(i / columnas) * rejilla + hueco, tam, tam);
    }
    capa.luz[i] = 0;
    capa.claridad[i] = 0;
    capa.tope[i] = 0;
  }
  capa.cuantas = 0;
  trazados.forEach((trazado, nivel) => {
    contexto.fillStyle = TONOS_DISCO[nivel];
    contexto.fill(trazado);
  });
}

// Añade un cuadradito al trazado, "encajado" en la rejilla (esto da el aspecto de píxeles).
// Semitono: más luz = cuadradito más grande. Lo usan las estrellas atrapadas (cada una
// con su color) y el dragón pixelado
function ponerPixel(trazado, x, y, luz) {
  if (luz < 0.12) return; // muy oscuro: no se dibuja

  const tam = Math.max(1, Math.round(rejilla * Math.min(luz, 1)));
  const celdaX = Math.floor(x / rejilla) * rejilla;
  const celdaY = Math.floor(y / rejilla) * rejilla;
  const hueco = (rejilla - tam) / 2;
  trazado.rect(celdaX + hueco, celdaY + hueco, tam, tam);
}

// ----- Bucle de animación -----
let enPantalla = true;
let ultimoDibujo = 0;
let tiempoAnterior = performance.now();
let tiempoIman = performance.now();
let tiempoCromo = performance.now();
let bucleActivo = false;

function animar(ahora) {
  if (!enPantalla || sinMovimiento.matches) {
    bucleActivo = false;
    return; // se para del todo; se reanuda con arrancar()
  }
  requestAnimationFrame(animar);

  // El imán y la vuelta de la Z van a todos los fotogramas (a 30 se notarían a saltos)
  const pasosLetra = Math.min((ahora - tiempoIman) / 16.67, 4);
  tiempoIman = ahora;
  moverIman(pasosLetra);
  despertar += ((estaDespierto() ? 1 : 0) - despertar) * Math.min(1, 0.12 * pasosLetra);
  girarLetra(pasosLetra);
  moverLetra();

  // Las ondas del cromo van muy despacio: a FPS (30) se ven igual que a 60, y cada cambio obliga
  // al navegador a repintar todos los trozos del dragón. Solo cuando algo va rápido (el anillo
  // del clic, o el centro de la luz siguiendo al ratón) las movemos en todos los fotogramas
  const tocaDibujar = ahora - ultimoDibujo >= 1000 / FPS - 1;
  if (tocaDibujar || golpeLuz > 0 || control > 0.001) {
    pintarCromo(Math.min((ahora - tiempoCromo) / 16.67, 4));
    tiempoCromo = ahora;
  }

  // El dibujo del disco, en cambio, lo limitamos para gastar menos
  if (!tocaDibujar) return;
  ultimoDibujo = ahora;

  // "pasos" = cuántos fotogramas de 60 Hz han pasado (igual que en orbita.js)
  const pasos = Math.min((ahora - tiempoAnterior) / 16.67, 4);
  tiempoAnterior = ahora;

  for (const p of particulas) p.angulo += p.velocidad * pasos;
  giroNubes += VELOCIDAD_NUBES * pasos;
  giroAnillo += velocidadAngular(R_INTERIOR) * pasos;
  moverAtrapadas(pasos);

  dibujar();
}

function arrancar() {
  if (sinMovimiento.matches) {
    dibujar(); // movimiento reducido: un solo dibujo quieto
    letra.pauseAnimations(); // detiene el degradado #cromo (el cromo gris de la Z se queda quieto solo)
    return;
  }
  letra.unpauseAnimations();
  if (!bucleActivo && enPantalla) {
    bucleActivo = true;
    tiempoAnterior = performance.now();
    tiempoIman = tiempoAnterior;
    tiempoCromo = tiempoAnterior;
    requestAnimationFrame(animar);
  }
}

// ----- Lo que el agujero comparte con otros scripts (lo usa fondo-estrellas.js) -----
window.agujeroNegro = {
  // Centro y radio del agujero en la pantalla, en este momento
  posicion() {
    const caja = lienzo.getBoundingClientRect();
    return { x: caja.left + centroX, y: caja.top + centroY, radio: radioAgujero };
  },
  // A qué velocidad gira algo que está a "distancia" píxeles del centro (radianes por
  // fotograma de 60 Hz), con la misma ley que el disco. La usa orbita.js para los planetas
  velocidadA(distancia) {
    return radioAgujero ? velocidadAngular(distancia / radioAgujero) : 0;
  },
  atrapar,
};

// ----- Puesta en marcha -----
medir();
dibujar();
arrancar();

// Si cambia el tamaño de la ventana, recalculamos y redibujamos
new ResizeObserver(() => {
  medir();
  dibujar();
}).observe(agujero);

// Si el agujero sale de la pantalla (al bajar), pausamos la animación
new IntersectionObserver(([entrada]) => {
  enPantalla = entrada.isIntersecting;
  arrancar();
}).observe(agujero);

// Si la persona activa o desactiva "reducir movimiento", lo respetamos al momento
sinMovimiento.addEventListener("change", arrancar);

// ----- Presentación: la carta aparece al apuntar al agujero -----
// Con ratón: basta con apuntar; al quitar el ratón vuelve al agujero.
// En móvil no se puede "apuntar", así que un toque la saca y otro la guarda.
// Con teclado: Enter la saca y Escape la guarda.
const ESPERA_APUNTAR = 150; // milisegundos apuntando antes de sacarla (así no salta al pasar de largo)
let xPulsado = 0;
let punteroPulsado = "";
let esperaApuntar = null;

function mostrarPresentacion(abrir) {
  agujero.classList.toggle("agujero--abierto", abrir);
  zona.setAttribute("aria-expanded", abrir); // avisa a los lectores de pantalla
  window.mostrarCarta?.(abrir); // la carta se forma o vuelve al agujero (js/carta.js)
  // Una carta a la vez (todas salen en el mismo sitio): avisamos a las de los planetas para que se guarden
  if (abrir) document.dispatchEvent(new CustomEvent("carta-abierta", { detail: "ludwig" }));
}

// Y al revés: si se abre la carta de un planeta, la de Ludwig se guarda
document.addEventListener("carta-abierta", (evento) => {
  if (evento.detail === "ludwig") return;
  clearTimeout(esperaApuntar);
  esperaApuntar = null;
  if (agujero.classList.contains("agujero--abierto")) mostrarPresentacion(false);
});

// ¿Está el punto (x, y) dentro del círculo de la zona? Lo medimos con geometría
// porque cuando un planeta pasa por delante, el navegador cree que el ratón "salió"
function dentroDeLaZona(x, y) {
  const caja = zona.getBoundingClientRect();
  const radio = caja.width / 2;
  return Math.hypot(x - (caja.left + radio), y - (caja.top + radio)) <= radio;
}

// Apuntar con el ratón: la saca (tras una pequeña espera)
zona.addEventListener("pointerenter", (evento) => {
  if (evento.pointerType !== "mouse") return;
  clearTimeout(esperaApuntar);
  esperaApuntar = setTimeout(() => {
    esperaApuntar = null;
    mostrarPresentacion(true);
  }, ESPERA_APUNTAR);
});

// Dejar de apuntar: la guarda (solo si el ratón salió de verdad del círculo)
window.addEventListener("pointermove", (evento) => {
  if (evento.pointerType !== "mouse") return;
  // Sin carta abierta ni a punto de abrirse no hay nada que guardar: ni medimos la zona
  // (medirla obliga al navegador a calcular la página, y esto pasa en cada movimiento del ratón)
  const abierta = agujero.classList.contains("agujero--abierto");
  if (!abierta && esperaApuntar === null) return;
  if (dentroDeLaZona(evento.clientX, evento.clientY)) return;
  clearTimeout(esperaApuntar);
  esperaApuntar = null;
  if (abierta) mostrarPresentacion(false);
});

zona.addEventListener("pointerdown", (evento) => {
  xPulsado = evento.clientX;
  punteroPulsado = evento.pointerType;
});

zona.addEventListener("click", (evento) => {
  const delTeclado = evento.detail === 0; // evento.detail es 0 cuando el clic viene del teclado
  if (!delTeclado) {
    // Con ratón ya se encarga "apuntar": el clic no hace nada
    if (punteroPulsado === "mouse") return;
    // Si la persona estaba arrastrando la órbita, no es un toque: no hacemos nada
    if (Math.abs(evento.clientX - xPulsado) > 5) return;
  }
  mostrarPresentacion(!agujero.classList.contains("agujero--abierto"));
});

// Se cierra al tocar fuera o al pulsar Escape
document.addEventListener("click", (evento) => {
  if (!zona.contains(evento.target)) mostrarPresentacion(false);
});
document.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape") mostrarPresentacion(false);
});

// Con "reducir movimiento" no hay bucle de animación: despertamos al dragón al momento
function despertarSinAnimacion() {
  if (!sinMovimiento.matches) return;
  despertar = estaDespierto() ? 1 : 0;
  moverLetra();
}
for (const tipo of ["pointerenter", "pointerleave", "focus", "blur"]) {
  zona.addEventListener(tipo, despertarSinAnimacion);
}
document.addEventListener("click", despertarSinAnimacion);
moverLetra();
})();
