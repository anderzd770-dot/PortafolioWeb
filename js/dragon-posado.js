// =========================================================
// DRAGÓN POSADO: despierta al posarse y al pasar el ratón
// Cada vez que el dragón se posa bajo la placa de viaje (de cualquier destino)
// despierta solo: crece, una luz le recorre el cuerpo de la cola a los ojos y
// ahí estalla. Y al pasar el ratón por encima hace lo mismo que la Z-dragón
// del agujero negro:
//  - crece un poco con un rebote (el CSS: .viaje__posado--encima)
//  - una estrella de píxeles blancos sigue al cursor, titila y deja estela
//  - ondas de luz salen del punto al que apuntas y recorren el cromo
//  - al hacer clic: explosión de píxeles, destello en cruz y un pequeño retroceso
//
// Idea clave: todo se pinta en un lienzo encima del dibujo y luego se RECORTA
// con el propio dibujo (destination-in): la luz solo queda donde hay dragón.
// Las chispas del clic se pintan después, sin recortar, para que salgan volando.
// =========================================================

(() => {

// ----- Ajustes (los mismos números que la Z en js/agujero-negro.js) -----
const PIXEL = 3;                 // tamaño de cada píxel de luz, en píxeles de pantalla
const BRAZO_LUZ = 4;             // largo de cada brazo de la cruz, en píxeles de luz
const PARPADEO_LUZ = 0.25;       // cuánto titila (0 = luz fija)
const VIDA_ESTELA_LUZ = 0.3;     // cuánto dura la estela detrás del cursor, en segundos

const ONDAS = 3;                 // cuántas ondas de luz hay del centro al borde
const VELOCIDAD_ONDAS = 0.3;     // vueltas de onda por segundo (la Z: 0.005 por fotograma × 60)
const RADIO_ONDAS = 1.3;         // tamaño de las ondas, en altos de dragón
const DIFUMINAR_ONDAS = 2;       // qué pronto se difumina la onda al alejarse
const INTENSIDAD_ONDAS = 0.3;    // cuánto brillan (0 = nada, 1 = blanco del todo). La Z usa 0.55, pero
                                 // su dibujo es claro; este es oscuro y el blanco resalta mucho más
const SUAVIDAD = 0.12;           // qué rápido sigue el centro de las ondas al ratón (por fotograma)

const CHISPAS_CLIC = 24;           // cuántos píxeles salen volando
const VELOCIDAD_CHISPAS_CLIC = 240; // qué rápido salen (px por segundo)
const VIDA_CHISPAS_CLIC = 0.9;     // cuánto duran (segundos)
const COLORES_CHISPAS = ["#ffffff", "#000000"];
const EMPUJE_DRAGON = 5;           // cuánto retrocede con el golpe, en píxeles
const DURACION_GOLPE_LUZ = 0.6;    // segundos que tarda el anillo de luz del clic en recorrer el dragón

const OPACO = 40;                // desde qué transparencia (0–255) cuenta como "dragón" para el ratón

// Al posarse (cada vez que se activa la barra, sea del destino que sea) el dragón despierta
// solo: crece, una luz le recorre el cuerpo de la cola a los ojos y ahí estalla
const ESPERA_DESPERTAR = 0.2;    // segundos tras posarse (lo que tarda el dibujo en aparecer del todo)
const DURACION_DESPERTAR = 1;    // segundos que tarda la luz en ir de la cola a los ojos
// Por dónde pasa la columna del cuerpo en tu dibujo (img/dragon-vuelo.webp), de la cola a los
// ojos: fracciones del ancho y del alto, marcadas a mano sobre el dibujo
const COLUMNA = [
  [0.06, 0.52], [0.18, 0.6], [0.3, 0.74], [0.42, 0.74], [0.52, 0.66],
  [0.62, 0.72], [0.74, 0.7], [0.84, 0.66], [0.91, 0.59],
];

// ----- Elementos -----
const barra = document.querySelector(".viaje");
const posado = document.querySelector(".viaje__posado");
if (!barra || !posado) return;
const dibujo = posado.querySelector(".viaje__dragon");
const lienzo = posado.querySelector(".viaje__luz");
const pincel = lienzo.getContext("2d");
const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)");

// ----- La forma del dragón (para saber si el ratón toca el dibujo o el hueco entre llamas) -----
let alfa = null; // transparencia de cada píxel del dibujo (null = no se pudo leer)
function leerForma() {
  const copia = document.createElement("canvas");
  copia.width = dibujo.naturalWidth;
  copia.height = dibujo.naturalHeight;
  const c = copia.getContext("2d", { willReadFrequently: true });
  c.drawImage(dibujo, 0, 0);
  // Si abres la página como archivo (file:///), el navegador PROHÍBE leer los píxeles de las
  // imágenes (por seguridad) y getImageData da error. Entonces nos quedamos sin forma
  // y usamos el recuadro del dibujo: funciona igual, solo que también en los huecos
  try {
    alfa = c.getImageData(0, 0, copia.width, copia.height).data;
  } catch {
    alfa = null;
  }
}
if (dibujo.complete && dibujo.naturalWidth) leerForma();
else dibujo.addEventListener("load", leerForma, { once: true });

// ¿El punto (de la pantalla) cae encima del dibujo? Regla de tres: pantalla → píxel del dibujo
function tocaAlDragon(x, y) {
  if (barra.dataset.estado !== "activa") return false;
  const caja = dibujo.getBoundingClientRect();
  if (x < caja.left || x >= caja.right || y < caja.top || y >= caja.bottom) return false;
  if (!alfa) return true; // sin forma: vale todo el recuadro
  const px = Math.floor(((x - caja.left) / caja.width) * dibujo.naturalWidth);
  const py = Math.floor(((y - caja.top) / caja.height) * dibujo.naturalHeight);
  return alfa[(py * dibujo.naturalWidth + px) * 4 + 3] > OPACO;
}

// ----- Estado -----
let dpr = 1;
let margen = 0;            // el lienzo sobresale del dibujo este tanto por cada lado (para las chispas)
const raton = { x: 0, y: 0, luz: 0, encima: false }; // en píxeles CSS del lienzo
const centroOndas = { x: 0, y: 0 };
let faseOndas = 0;
let golpeLuz = 0;          // 1 = recién golpeado, 0 = el anillo del clic ya se apagó
let estela = [];           // { x, y, edad }
let chispas = [];          // { x, y, vx, vy, edad, vida, color }
let destellos = [];        // { x, y, edad, largo }
let corriendo = false;
let anterior = 0;
let ratonDentro = false;   // el ratón de verdad está encima del dibujo
let despertar = -1;        // avance de la luz del despertar: -1 = no está pasando, 0 → 1 = de la cola a los ojos
let temporizadorDespertar = 0;

function medir() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  margen = parseFloat(getComputedStyle(lienzo).getPropertyValue("--margen-luz")) || 40;
  // offsetWidth = tamaño SIN el "scale" de crecer: así el lienzo no cambia al crecer
  lienzo.width = Math.round(lienzo.offsetWidth * dpr);
  lienzo.height = Math.round(lienzo.offsetHeight * dpr);
}

// Del ratón en la pantalla a píxeles CSS del lienzo (sin el "scale" de crecer)
function enElLienzo(evento) {
  const caja = lienzo.getBoundingClientRect();
  return [
    ((evento.clientX - caja.left) / caja.width) * lienzo.offsetWidth,
    ((evento.clientY - caja.top) / caja.height) * lienzo.offsetHeight,
  ];
}

// ----- Píxeles de luz (como en la Z) -----
// Un cuadradito en la rejilla: más luz = más grande
function pixelDeLuz(x, y, luz) {
  if (luz < 0.05) return;
  const tam = Math.max(1, Math.round(PIXEL * Math.sqrt(Math.min(1, luz))));
  const hueco = (PIXEL - tam) / 2;
  pincel.fillRect(Math.floor(x / PIXEL) * PIXEL + hueco, Math.floor(y / PIXEL) * PIXEL + hueco, tam, tam);
}

// Estrella en cruz: un centro gordo y brazos que se apagan hacia las puntas
function estrellaDeLuz(x, y, luz, brazo) {
  for (let i = -brazo; i <= brazo; i++) {
    const l = luz * Math.pow(1 - Math.abs(i) / (brazo + 1), 1.5);
    pixelDeLuz(x + i * PIXEL, y, l);
    if (i !== 0) pixelDeLuz(x, y + i * PIXEL, l);
  }
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    pixelDeLuz(x + dx * PIXEL, y + dy * PIXEL, luz * 0.3);
  }
}

// ----- Las ondas del cromo -----
// Un degradado redondo con varias "crestas" de luz. Al avanzar la fase, cada cresta
// está un poco más lejos del centro: la luz "sale" de donde apuntas y se difumina
function pintarOndas() {
  const radio = RADIO_ONDAS * dibujo.offsetHeight;
  const degradado = pincel.createRadialGradient(centroOndas.x, centroOndas.y, 0, centroOndas.x, centroOndas.y, radio);
  const PARADAS = 24;
  for (let i = 0; i < PARADAS; i++) {
    const s = i / (PARADAS - 1); // 0 = centro, 1 = borde
    const nucleo = Math.exp(-((s / 0.12) ** 2));
    const onda = 0.5 + 0.5 * Math.cos(Math.PI * 2 * (s * ONDAS - faseOndas));
    const nitidez = (1 - s) ** DIFUMINAR_ONDAS;
    let luz = nucleo + (1 - nucleo) * onda * nitidez;
    // El anillo del clic: una banda brillante que viaja del centro al borde
    if (golpeLuz > 0) {
      const avance = 1 - golpeLuz;
      luz += golpeLuz * 1.6 * Math.exp(-(((s - avance) / 0.09) ** 2)) + golpeLuz * nucleo;
    }
    const opacidad = Math.min(1, luz * INTENSIDAD_ONDAS) * raton.luz;
    degradado.addColorStop(s, `rgba(255, 255, 255, ${opacidad.toFixed(3)})`);
  }
  pincel.fillStyle = degradado;
  pincel.fillRect(0, 0, lienzo.offsetWidth, lienzo.offsetHeight);
}

// ----- Un fotograma -----
function fotograma(ahora) {
  const dt = Math.min(Math.max((ahora - anterior) / 1000, 0), 0.1);
  anterior = ahora;
  const quieto = sinMovimiento.matches;

  // El despertar: una luz que hace de "ratón" y recorre la columna del cuerpo.
  // Si el ratón de verdad llega encima, manda él (el despertar se cancela en moverRaton)
  if (despertar >= 0) {
    despertar = Math.min(1, despertar + dt / DURACION_DESPERTAR);
    const t = despertar * despertar * (3 - 2 * despertar); // arranca y frena suave (smoothstep)
    const [x, y] = puntoDeLaColumna(t);
    moverLuz(x, y);
    if (despertar === 1) {
      // Llegó a los ojos: estalla, y el dragón vuelve a su tamaño con el rebote
      despertar = -1;
      raton.encima = false;
      estallar(x, y);
      posado.classList.remove("viaje__posado--despierto");
    }
  }

  // La luz sube rápido al entrar y baja suave al salir (como la Z)
  raton.luz += ((raton.encima ? 1 : 0) - raton.luz) * Math.min(1, dt * (raton.encima ? 14 : 6));
  if (!raton.encima && raton.luz < 0.03) raton.luz = 0;
  estela = estela.filter((p) => (p.edad += dt) < VIDA_ESTELA_LUZ);
  if (!quieto) faseOndas = (faseOndas + VELOCIDAD_ONDAS * dt) % 1;
  golpeLuz = Math.max(0, golpeLuz - dt / DURACION_GOLPE_LUZ);
  // El centro de las ondas se desliza hacia el ratón, sin rebote
  const trocito = 1 - (1 - SUAVIDAD) ** (dt * 60);
  centroOndas.x += (raton.x - centroOndas.x) * trocito;
  centroOndas.y += (raton.y - centroOndas.y) * trocito;

  pincel.setTransform(dpr, 0, 0, dpr, 0, 0);
  pincel.clearRect(0, 0, lienzo.offsetWidth, lienzo.offsetHeight);

  // 1) La luz sobre el dragón: ondas + estela + estrella
  if (raton.luz > 0 || golpeLuz > 0) {
    pintarOndas();
    pincel.fillStyle = "#ffffff";
    for (const p of estela) estrellaDeLuz(p.x, p.y, 0.45 * (1 - p.edad / VIDA_ESTELA_LUZ), 1);
    const titileo = 1 - PARPADEO_LUZ * (0.5 + 0.5 * Math.sin(ahora / 140));
    const brazo = Math.max(1, Math.round(BRAZO_LUZ * raton.luz));
    estrellaDeLuz(raton.x, raton.y, raton.luz * titileo, brazo);

    // 2) Recortar: solo se queda la luz que cae encima del dibujo
    pincel.globalCompositeOperation = "destination-in";
    pincel.drawImage(dibujo, margen, margen, dibujo.offsetWidth, dibujo.offsetHeight);
    pincel.globalCompositeOperation = "source-over";
  }

  // 3) Chispas del clic (sin recortar): vuelan, frenan y se apagan
  const freno = Math.pow(0.05, dt); // pierden el 95 % de su velocidad cada segundo
  chispas = chispas.filter((c) => (c.edad += dt) < c.vida);
  for (const c of chispas) {
    c.vx *= freno;
    c.vy *= freno;
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    pincel.fillStyle = c.color;
    pixelDeLuz(c.x, c.y, 1 - c.edad / c.vida);
  }
  // Destellos: una cruz de píxeles blancos que crece y se apaga en 0.3 s
  destellos = destellos.filter((d) => (d.edad += dt) < 0.3);
  pincel.fillStyle = "#ffffff";
  for (const d of destellos) {
    const t = d.edad / 0.3;
    const brazo = Math.round(1 + t * d.largo);
    for (let i = -brazo; i <= brazo; i++) {
      const luz = (1 - t) * (1 - Math.abs(i) / (brazo + 1));
      pixelDeLuz(d.x + i * PIXEL, d.y, luz);
      if (i !== 0) pixelDeLuz(d.x, d.y + i * PIXEL, luz);
    }
  }

  // ¿Queda algo que dibujar? Si no, paramos del todo (cero trabajo en reposo)
  if (despertar >= 0 || raton.luz > 0 || estela.length || chispas.length || destellos.length || golpeLuz > 0) {
    requestAnimationFrame(fotograma);
  } else {
    pincel.clearRect(0, 0, lienzo.offsetWidth, lienzo.offsetHeight);
    corriendo = false;
  }
}

function arrancar() {
  if (corriendo) return;
  corriendo = true;
  medir();
  anterior = performance.now();
  requestAnimationFrame(fotograma);
}

// ----- El ratón -----
// La barra deja pasar el ratón (pointer-events: none) para no tapar los planetas.
// Escuchamos en toda la ventana y comprobamos nosotros si toca el dibujo. Solo mientras
// lo toca, el dragón "atrapa" el ratón (pointer-events: auto), para que el clic sea suyo
// La luz va al punto (x, y) del lienzo. La usan el ratón y el despertar
function moverLuz(x, y) {
  // Cada vez que la luz avanza un píxel, deja un punto de estela
  const ultimo = estela[estela.length - 1];
  const seMovio = !ultimo || Math.hypot(x - ultimo.x, y - ultimo.y) >= PIXEL;
  if (raton.encima && seMovio && !sinMovimiento.matches) estela.push({ x: raton.x, y: raton.y, edad: 0 });
  if (!raton.encima) { centroOndas.x = x; centroOndas.y = y; } // al entrar, las ondas nacen ahí
  raton.x = x;
  raton.y = y;
  raton.encima = true;
}

function moverRaton(evento) {
  const toca = tocaAlDragon(evento.clientX, evento.clientY);
  posado.classList.toggle("viaje__posado--encima", toca);
  if (!toca) {
    if (ratonDentro && despertar < 0) raton.encima = false;
    ratonDentro = false;
    return;
  }
  // El ratón de verdad manda: si el despertar estaba pasando, se corta aquí
  if (despertar >= 0) {
    despertar = -1;
    posado.classList.remove("viaje__posado--despierto");
  }
  ratonDentro = true;
  const [x, y] = enElLienzo(evento);
  moverLuz(x, y);
  arrancar();
}

function soltarRaton() {
  ratonDentro = false;
  if (despertar < 0) raton.encima = false;
  posado.classList.remove("viaje__posado--encima");
}

// Un punto de la columna del cuerpo: t = 0 en la cola, t = 1 en los ojos.
// Medimos lo largo de cada tramo para que la luz vaya a la misma velocidad en todos
function puntoDeLaColumna(t) {
  const w = dibujo.offsetWidth, h = dibujo.offsetHeight;
  const puntos = COLUMNA.map(([fx, fy]) => [margen + fx * w, margen + fy * h]);
  const tramos = [];
  let total = 0;
  for (let i = 1; i < puntos.length; i++) {
    const largo = Math.hypot(puntos[i][0] - puntos[i - 1][0], puntos[i][1] - puntos[i - 1][1]);
    tramos.push(largo);
    total += largo;
  }
  let falta = t * total; // cuánto camino queda por recorrer desde la cola
  for (let i = 0; i < tramos.length; i++) {
    if (falta <= tramos[i] || i === tramos.length - 1) {
      const f = Math.min(1, falta / tramos[i]);
      const [a, b] = [puntos[i], puntos[i + 1]];
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
    }
    falta -= tramos[i];
  }
}

// Despierta al posarse: crece (CSS) y la luz sale de la cola
function empezarDespertar() {
  if (barra.dataset.estado !== "activa" || ratonDentro || sinMovimiento.matches) return;
  despertar = 0;
  estela = [];
  raton.encima = false; // así las ondas nacen en la cola
  posado.classList.add("viaje__posado--despierto");
  arrancar();
}

// Estallido de píxeles en (x, y): chispas, destello en cruz y anillo de luz
function estallar(x, y) {
  for (let i = 0; i < CHISPAS_CLIC; i++) {
    const angulo = Math.random() * Math.PI * 2;
    const velocidad = VELOCIDAD_CHISPAS_CLIC * (0.3 + Math.random() * 0.7);
    chispas.push({
      x, y,
      vx: Math.cos(angulo) * velocidad,
      vy: Math.sin(angulo) * velocidad,
      edad: 0,
      vida: VIDA_CHISPAS_CLIC * (0.5 + Math.random() * 0.5),
      color: COLORES_CHISPAS[i % COLORES_CHISPAS.length],
    });
  }
  destellos.push({ x, y, edad: 0, largo: 8 });
  golpeLuz = 1;
  arrancar();
}

// Clic en el dragón: estallido donde haces clic y un pequeño retroceso
function golpear(evento) {
  if (sinMovimiento.matches || !tocaAlDragon(evento.clientX, evento.clientY)) return;
  const [x, y] = enElLienzo(evento);
  estallar(x, y);
  // Retrocede alejándose del golpe. "translate" (y no "transform") para no pisar el "scale" de crecer
  const dx = margen + dibujo.offsetWidth / 2 - x;
  const dy = margen + dibujo.offsetHeight / 2 - y;
  const largo = Math.hypot(dx, dy) || 1;
  posado.animate(
    [{ translate: `${(dx / largo) * EMPUJE_DRAGON}px ${(dy / largo) * EMPUJE_DRAGON}px` }, { translate: "0 0" }],
    { duration: 500, easing: "cubic-bezier(0.2, 1.6, 0.4, 1)" }
  );
}

window.addEventListener("pointermove", moverRaton, { passive: true });
window.addEventListener("pointerdown", moverRaton, { passive: true }); // con el dedo no hay "pasar por encima"
document.documentElement.addEventListener("pointerleave", soltarRaton);
posado.addEventListener("click", golpear);

// Cada vez que la barra se activa (el dragón se acaba de posar), despierta.
// Si deja de estar activa (se va el dragón), se apaga todo
new MutationObserver(() => {
  clearTimeout(temporizadorDespertar);
  if (barra.dataset.estado === "activa") {
    temporizadorDespertar = setTimeout(empezarDespertar, ESPERA_DESPERTAR * 1000);
  } else {
    despertar = -1;
    posado.classList.remove("viaje__posado--despierto");
    soltarRaton();
  }
}).observe(barra, { attributes: true, attributeFilter: ["data-estado"] });

})();
