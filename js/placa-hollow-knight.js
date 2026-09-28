// Animación de la placa basada directamente en el dibujo de la carta de Hollow Knight.
// Conserva su núcleo, tentáculos, manchas onduladas, motas y tiempos de formación.
// Solo adaptamos las medidas a una placa horizontal; el reloj sigue siendo el de la carta.
(() => {
  const SOMBRAS = 12;
  const GROSOR = 0.075;
  const ONDULAR = 0.09;
  const MANCHA = 0.5;
  const ONDAS = 5;
  const BORDE = 0.05;
  const MOTAS = 3;
  const COLOR_SOMBRA = "#000";
  const COLOR_ALMA = "#e8e6f0";
  const COLOR_NIEBLA = "232, 230, 240";
  const NIEBLA = 0.16;
  const SEMILLA = 7;
  const barra = document.querySelector(".viaje");
  const hueco = barra?.querySelector(".viaje__lienzo");
  const placa = barra?.querySelector(".viaje__placa");
  if (!hueco || !placa) return;
  const lienzo = document.createElement("canvas");
  lienzo.className = "viaje__sombras-hk";
  lienzo.setAttribute("aria-hidden", "true");
  hueco.append(lienzo);
  const capa = document.createElement("canvas");
  const ctx = lienzo.getContext("2d");
  const capaCtx = capa.getContext("2d");
  if (!ctx || !capaCtx) return;
  const reducir = matchMedia("(prefers-reduced-motion: reduce)");
  const dibujo = new Image();
  dibujo.src = "img/placas/hollow-knight-inicio.webp";
  const dibujoActivo = new Image();
  dibujoActivo.src = "img/placas/hollow-knight-activa.webp";
  // Recortamos solo al dibujar: los PNG originales quedan intactos.
  const RECORTE_INICIO = [0, 0, 640, 206]; // las imágenes WebP ya vienen recortadas: se usan enteras
  const RECORTE_ACTIVA = [0, 0, 640, 207];
  const DURACION_CAMBIO = 1100; // ms que tardan las dos sombras en cruzar y cambiar las palabras
  let cambio = 0;
  let fotogramaCambio = 0;
  let anteriorCambio = 0;
  let progreso = 0;
  let presentada = false;

  function pararCambio() {
    cancelAnimationFrame(fotogramaCambio);
    fotogramaCambio = 0;
  }

  function animarCambio(ahora) {
    const paso = Math.min(Math.max(ahora - anteriorCambio, 0), 50);
    anteriorCambio = ahora;
    cambio = Math.min(1, cambio + paso / DURACION_CAMBIO);
    barra.toggleAttribute("data-hk-activa", cambio === 1);
    if (cambio === 1) fotogramaCambio = 0;
    dibujar(progreso);
    if (cambio < 1) fotogramaCambio = requestAnimationFrame(animarCambio);
    else fotogramaCambio = 0;
  }

  function activarDibujo() {
    if (barra.dataset.estado !== "activa" || progreso < 1 || cambio === 1 || fotogramaCambio) return;
    if (!dibujoActivo.complete || !dibujoActivo.naturalWidth) return;
    if (reducir.matches) {
      cambio = 1;
      barra.dataset.hkActiva = "";
      limpiar();
      return;
    }
    medir();
    anteriorCambio = performance.now();
    fotogramaCambio = requestAnimationFrame(animarCambio);
  }

  // ----- El cambio de palabras: dos sombras delgadas que se cruzan -----
  // Una entra por la izquierda y otra por la derecha, a alturas un poco distintas
  // para cruzarse sin chocar. Detrás de cada una aparece el dibujo nuevo: cuando se
  // cruzan en el centro ya ha cambiado entero, y siguen hasta salir por el otro lado.
  const CAMBIO_GROSOR = 0.05;  // grosor de cada sombra, en altos de placa (¡prueba 0.1!)
  const CAMBIO_LARGO = 0.35;   // largo de cada sombra, en anchos de placa
  const CAMBIO_ALTURA = [0.4, 0.62]; // a qué altura pasa cada una (0 = arriba, 1 = abajo)

  // Dónde está la punta de cada sombra (x en el lienzo) en este momento del cambio
  function puntas() {
    const s = suave(cambio);
    return {
      izquierda: cartaX + cartaW * (-0.05 + 1.1 * s), // va de la izquierda a la derecha
      derecha: cartaX + cartaW * (1.05 - 1.1 * s),    // y esta al revés
    };
  }

  // El borde del dibujo nuevo: una línea vertical que ondula un poco (tinta, no regla)
  function ondaDelFrente(i) {
    return Math.sin(i / 40 * 8 - cambio * 7) * cartaW * 0.012 * Math.sin(cambio * Math.PI);
  }

  function pintarPlaca(destino) {
    destino.drawImage(dibujo, ...RECORTE_INICIO, cartaX, cartaY, cartaW, cartaH);
    if (!dibujoActivo.naturalWidth || cambio === 0) return;
    const { izquierda, derecha } = puntas();

    // Zona ya cambiada: lo que queda detrás de la sombra de la izquierda
    // MÁS lo que queda detrás de la de la derecha
    const zona = new Path2D();
    zona.moveTo(cartaX, cartaY);
    for (let i = 0; i <= 40; i++) zona.lineTo(izquierda + ondaDelFrente(i), cartaY + cartaH * i / 40);
    zona.lineTo(cartaX, cartaY + cartaH);
    zona.closePath();
    // La de la derecha se recorre en el MISMO sentido que la de la izquierda (las dos a
    // favor del reloj): si fueran en sentidos contrarios, donde se solapan se anularían
    zona.moveTo(cartaX + cartaW, cartaY);
    zona.lineTo(cartaX + cartaW, cartaY + cartaH);
    for (let i = 40; i >= 0; i--) zona.lineTo(derecha - ondaDelFrente(i), cartaY + cartaH * i / 40);
    zona.closePath();

    destino.save();
    destino.clip(zona);
    // Borramos el dibujo anterior en esta zona para no superponer las letras.
    destino.clearRect(cartaX, cartaY, cartaW, cartaH);
    destino.drawImage(dibujoActivo, ...RECORTE_ACTIVA, cartaX, cartaY, cartaW, cartaH);
    destino.restore();
    if (cambio >= 1) return;

    // Las dos sombras encima: aparecen al entrar y se afinan hasta desaparecer al salir,
    // así nunca se cortan contra el borde del lienzo
    const fuerza = suave(tramo(cambio, 0, 0.2)) * (1 - suave(tramo(cambio, 0.8, 1)));
    if (fuerza <= 0) return;
    const sombras = new Path2D();
    trazarSombraDelgada(sombras, izquierda, 1, CAMBIO_ALTURA[0], fuerza);
    trazarSombraDelgada(sombras, derecha, -1, CAMBIO_ALTURA[1], fuerza);
    destino.fillStyle = COLOR_SOMBRA;
    destino.fill(sombras);
  }

  // Una sombra delgada: punta afilada delante, se ensancha un poco y la cola se deshace.
  // sentido = 1 → va hacia la derecha; −1 → hacia la izquierda
  function trazarSombraDelgada(camino, puntaX, sentido, altura, fuerza) {
    const largo = cartaW * CAMBIO_LARGO;
    const arriba = [], abajo = [];
    for (let i = 0; i <= 48; i++) {
      const f = i / 48;                      // 0 = cola, 1 = punta
      const x = puntaX - sentido * largo * (1 - f);
      // Ondula como un tentáculo; la onda viaja con el cambio
      const y = cartaY + cartaH * (altura + 0.07 * Math.sin(f * 6 - cambio * 10 * sentido) * Math.sin(Math.PI * f));
      // Grosor: 0 en la cola y en la punta, más ancho cerca de la punta
      const g = cartaH * CAMBIO_GROSOR * Math.sin(Math.PI * Math.pow(f, 0.7)) * fuerza;
      arriba.push([x, y - g]);
      abajo.push([x, y + g]);
    }
    camino.moveTo(...arriba[0]);
    curvaSuave(camino, arriba);
    curvaSuave(camino, abajo.reverse());
    camino.closePath();
  }
  function limpiar() {
    delete barra.dataset.hkFormando;
    barra.style.removeProperty("--hk-texto-opacidad");
    barra.style.removeProperty("--hk-texto-difusion");
    ctx.clearRect(0, 0, ancho, alto);
  }

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

const frenar = (x) => 1 - Math.pow(1 - x, 3);            // rápido al principio, suave al final
const suave = (x) => x * x * (3 - 2 * x);                // suave al principio y al final
const limitar = (x) => Math.min(1, Math.max(0, x));
const tramo = (p, desde, hasta) => limitar((p - desde) / (hasta - desde)); // 0 → 1 entre dos momentos

// ----- Medidas -----
let dpr = 1;
let ancho = 0;
let alto = 0;
let cx = 0;          // centro de la carta dentro del lienzo
let cy = 0;
let cartaX = 0;
let cartaY = 0;
let cartaW = 0;
let cartaH = 0;
let sombras = [];

function medir() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  ancho = lienzo.clientWidth;
  alto = lienzo.clientHeight;
  lienzo.width = capa.width = Math.round(ancho * dpr);
  lienzo.height = capa.height = Math.round(alto * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  capaCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  cartaW = placa.offsetWidth;
  cartaH = placa.offsetHeight;
  cx = ancho / 2;
  cy = alto / 2;
  cartaX = cx - cartaW / 2;
  cartaY = cy - cartaH / 2;
  crearSombras();
}

function crearSombras() {
  const azar = crearAzar(SEMILLA);

  // Dónde llega cada sombra: la carta se divide en casillas y en cada una cae una,
  // movida un poco al azar. Así las manchas cubren TODA la carta, esquinas incluidas.
  const columnas = Math.max(2, Math.round(Math.sqrt((SOMBRAS * cartaW) / cartaH)));
  const filas = Math.ceil(SOMBRAS / columnas);
  const casillaW = cartaW / columnas;
  const casillaH = cartaH / filas;

  sombras = [];
  for (let i = 0; i < columnas * filas; i++) {
    const col = i % columnas;
    const fila = Math.floor(i / columnas);
    const tx = (col + 0.5 + (azar() - 0.5) * 0.4) * casillaW - cartaW / 2;
    const ty = (fila + 0.5 + (azar() - 0.5) * 0.4) * casillaH - cartaH / 2;
    // Lo lejos que está del centro: 0 en el centro, 1 en las esquinas
    const lejos = Math.min(1, Math.hypot(tx / (cartaW / 2), ty / (cartaH / 2)) / Math.SQRT2);
    const nace = 0.06 + azar() * 0.12;
    const llega = nace + 0.16 + lejos * 0.16;   // las que van más lejos tardan más

    const motas = [];
    for (let m = 0; m < MOTAS; m++) {
      motas.push({
        dx: (azar() - 0.5) * casillaW * 0.8,
        dy: (azar() - 0.5) * casillaH * 0.5,
        sube: casillaH * (0.3 + azar() * 0.4),
        tam: 0.8 + azar() * 1.1,
        retraso: azar() * 0.08,
      });
    }

    sombras.push({
      tx,
      ty,
      nace,
      llega,
      // Radio final de la mancha: lo bastante grande para tocar a sus vecinas
      radio: Math.hypot(casillaW, casillaH) * 0.72,
      grosor: 0.75 + azar() * 0.5,
      fase: azar() * Math.PI * 2,     // para que cada una ondule distinto
      giro: azar() * Math.PI * 2,     // hacia dónde miran los lóbulos de su mancha
      motas,
    });
  }
}

// ----- Un punto del camino de un tentáculo -----
// s = 0 → el centro, s = 1 → su sitio en la carta. Ondula a los lados como una
// serpiente (la onda viaja con el tiempo) y no ondula en los extremos.
function puntoDelCamino(t, s, progreso) {
  const x = t.tx * s;
  const y = t.ty * s;
  const largo = Math.hypot(t.tx, t.ty) || 1;
  const nx = -t.ty / largo;  // dirección "de lado" (perpendicular al camino)
  const ny = t.tx / largo;
  // Una onda larga y lenta: el tentáculo se mece en vez de temblar
  const onda = Math.sin(s * Math.PI * 1.6 - progreso * 10 + t.fase) * Math.sin(Math.PI * s) * Math.sqrt(cartaW * cartaH) * ONDULAR;
  return [cx + x + nx * onda, cy + y + ny * onda];
}

// Une una lista de puntos con curvas suaves (pasando por el punto medio de cada par):
// así el contorno no tiene esquinas, parece líquido
function curvaSuave(camino, puntos) {
  for (let i = 1; i < puntos.length - 1; i++) {
    const [x, y] = puntos[i];
    const [x2, y2] = puntos[i + 1];
    camino.quadraticCurveTo(x, y, (x + x2) / 2, (y + y2) / 2);
  }
  const [xf, yf] = puntos[puntos.length - 1];
  camino.lineTo(xf, yf);
}

// ----- Un tentáculo: se ensancha en la raíz para fundirse con el núcleo y acaba en punta -----
// La punta sale hasta su sitio y, cuando la mancha ya ha nacido, vuelve al centro.
function trazarTentaculo(camino, t, progreso) {
  const sale = frenar(tramo(progreso, t.nace, t.llega));
  const vuelve = suave(tramo(progreso, t.llega + 0.04, t.llega + 0.3));
  const punta = sale * (1 - vuelve);
  if (punta <= 0.01) return;

  const pasos = 32;
  const izquierda = [];
  const derecha = [];
  for (let i = 0; i <= pasos; i++) {
    const f = i / pasos;          // 0 = raíz, 1 = punta
    const s = punta * f;
    const [x, y] = puntoDelCamino(t, s, progreso);
    // Dirección del camino en este punto (para saber hacia dónde es "el lado")
    const [x2, y2] = puntoDelCamino(t, s + 0.01, progreso);
    let dx = x2 - x;
    let dy = y2 - y;
    const largo = Math.hypot(dx, dy) || 1;
    dx /= largo;
    dy /= largo;
    // Se afina poco a poco hasta la punta, y cerca de la raíz se abre como un embudo
    const resto = 1 - f;
    const g = (Math.sqrt(cartaW * cartaH) * GROSOR * t.grosor * Math.pow(resto, 0.8) * (1 + 1.4 * Math.pow(resto, 6))) / 2;
    izquierda.push([x - dy * g, y + dx * g]);
    derecha.push([x + dy * g, y - dx * g]);
  }

  // Un lado de ida y el otro de vuelta, los dos con curvas suaves
  camino.moveTo(izquierda[0][0], izquierda[0][1]);
  curvaSuave(camino, izquierda);
  curvaSuave(camino, derecha.reverse());
  camino.closePath();
}

// ----- El núcleo: una gota de sombra que late y cambia de forma -----
function trazarNucleo(camino, radio, progreso) {
  const puntos = 60;
  const borde = [];
  for (let i = 0; i <= puntos; i++) {
    const a = (i / puntos) * Math.PI * 2;
    const onda = 1 + 0.12 * Math.sin(3 * a + progreso * 9) + 0.07 * Math.sin(5 * a - progreso * 13);
    borde.push([cx + Math.cos(a) * radio * onda, cy + Math.sin(a) * radio * onda]);
  }
  camino.moveTo(borde[0][0], borde[0][1]);
  curvaSuave(camino, borde);
  camino.closePath();
}

// ----- El borde de una mancha de tinta: un círculo ondulado que gira -----
function trazarMancha(camino, t, radio, progreso) {
  if (radio <= 0.5) return;
  const x0 = cx + t.tx;
  const y0 = cy + t.ty;
  const puntos = 48;
  for (let i = 0; i <= puntos; i++) {
    const a = (i / puntos) * Math.PI * 2;
    // Dos ondas que giran en sentidos contrarios: el borde parece tinta que se extiende
    const onda = 1 + 0.12 * Math.sin(ONDAS * a + t.giro - progreso * 12) + 0.05 * Math.sin(11 * a - t.giro + progreso * 8);
    const x = x0 + Math.cos(a) * radio * onda;
    const y = y0 + Math.sin(a) * radio * onda;
    if (i === 0) camino.moveTo(x, y);
    else camino.lineTo(x, y);
  }
  camino.closePath();
}

// ----- Dibujar un momento de la formación -----
function dibujar(progreso) {
  ctx.clearRect(0, 0, ancho, alto);

  const formada = progreso >= 1;
  if (formada && (cambio === 0 || cambio === 1) && !fotogramaCambio) { limpiar(); return; }
  barra.dataset.hkFormando = "";
  if (formada) { pintarPlaca(ctx); return; }

  // Cuánto ha crecido cada mancha, y su borde negro (que se estrecha al final
  // para que la carta termine limpia, sin ningún resto de negro)
  const borde = Math.sqrt(cartaW * cartaH) * BORDE * (1 - tramo(progreso, 0.78, 0.96));
  const manchaNegra = new Path2D();
  const manchaCarta = new Path2D();
  for (const t of sombras) {
    // La mancha solo nace DESPUÉS de que la punta llegue a su destino.
    const crece = suave(tramo(progreso, t.llega, t.llega + MANCHA));
    trazarMancha(manchaNegra, t, t.radio * crece, progreso);
    trazarMancha(manchaCarta, t, t.radio * crece - borde, progreso);
  }

  // 0. Una neblina pálida detrás de todo: sin ella, el negro no se vería sobre el fondo
  //    oscuro de la página. Es un degradado ovalado sin bordes (las sombras se recortan
  //    contra ella como siluetas) que se enciende al principio y se apaga al final.
  const niebla = NIEBLA * suave(tramo(progreso, 0, 0.15)) * (1 - suave(tramo(progreso, 0.7, 1)));
  if (niebla > 0) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, cartaH / cartaW); // estirado a lo alto: óvalo con la forma de la carta
    const r = cartaW * 0.62;       // cabe dentro del lienzo: nunca se ve cortado en recto
    const luz = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    luz.addColorStop(0, `rgba(${COLOR_NIEBLA}, ${niebla})`);
    luz.addColorStop(0.6, `rgba(${COLOR_NIEBLA}, ${niebla * 0.5})`);
    luz.addColorStop(1, `rgba(${COLOR_NIEBLA}, 0)`);
    ctx.fillStyle = luz;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();
  }

  // 1. Manchas orgánicas libres: nunca se cortan contra una caja rectangular.
  ctx.save();
  ctx.globalAlpha = 1 - suave(tramo(progreso, 0.65, 0.98));
  ctx.fillStyle = COLOR_SOMBRA;
  ctx.fill(manchaNegra);
  ctx.restore();

  // 2. El dibujo de la carta dentro de las manchas (un poco más pequeñas: se ve el borde negro)
  if (dibujo.complete && dibujo.naturalWidth) {
    capaCtx.clearRect(0, 0, ancho, alto);
    capaCtx.save();
    // El recorte se aplica ANTES de pintar: nada del dibujo aparece fuera
    // de las zonas alcanzadas por las sombras, ni siquiera un fotograma.
    capaCtx.clip(manchaCarta);
    pintarPlaca(capaCtx);
    capaCtx.restore();
    ctx.drawImage(capa, 0, 0, ancho, alto);
  }

  // 3. Tentáculos y núcleo, encima de todo, en negro puro y sin borde:
  //    donde se cruzan no se ve ninguna línea, parecen una sola sombra.
  ctx.fillStyle = COLOR_SOMBRA;
  const tentaculos = new Path2D();
  for (const t of sombras) trazarTentaculo(tentaculos, t, progreso);
  ctx.fill(tentaculos);
  // El núcleo aparece primero y se apaga cuando las sombras ya han vuelto
  const nucleo = suave(tramo(progreso, 0, 0.1)) * (1 - suave(tramo(progreso, 0.6, 0.85)));
  if (nucleo > 0) {
    const gota = new Path2D();
    trazarNucleo(gota, Math.sqrt(cartaW * cartaH) * 0.11 * nucleo, progreso);
    ctx.fill(gota);
  }

  // 4. Motas de alma: suben desde cada mancha al abrirse y se apagan
  ctx.fillStyle = COLOR_ALMA;
  for (const t of sombras) {
    for (const m of t.motas) {
      const q = tramo(progreso, t.llega + m.retraso, t.llega + m.retraso + 0.3);
      if (q <= 0 || q >= 1) continue;
      ctx.globalAlpha = Math.sin(Math.PI * q); // aparece y se apaga
      ctx.beginPath();
      ctx.arc(cx + t.tx + m.dx, cy + t.ty + m.dy - m.sube * frenar(q), m.tam, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const letras = suave(tramo(progreso, 0.52, 0.94));
  barra.style.setProperty("--hk-texto-opacidad", letras);
  barra.style.setProperty("--hk-texto-difusion", `${(1 - letras) * 2}px`);
  ctx.globalAlpha = 1;
}

  function revisar() {
    const visible = barra.dataset.tema === "hollow-knight" && barra.dataset.estado !== "oculta";
    if (!visible) {
      pararCambio(); cambio = 0; delete barra.dataset.hkActiva;
      limpiar(); presentada = false; return;
    }
    if (barra.dataset.estado === "cerrando") pararCambio();
    if (reducir.matches) { pararCambio(); limpiar(); presentada = true; activarDibujo(); return; }
    if (presentada) { activarDibujo(); return; }
    if (!dibujo.complete || !dibujo.naturalWidth) return;
    presentada = true;
    medir();
    barra.dataset.hkFormando = "";
    barra.style.setProperty("--hk-texto-opacidad", "0");
    dibujar(progreso);
  }

  document.addEventListener("carta-abierta", (evento) => {
    if (evento.detail !== "hollow-knight") return;
    // Si se vuelve a apuntar durante el cierre, continuamos desde ese punto.
    revisar();
  });

  document.addEventListener("hk-progreso", (evento) => {
    progreso = evento.detail.progreso;
    if (barra.dataset.tema !== "hollow-knight" || barra.dataset.estado === "oculta") return;
    if (reducir.matches) { limpiar(); activarDibujo(); return; }
    revisar();
    if (presentada) dibujar(progreso);
    activarDibujo();
  });

  new MutationObserver(revisar).observe(barra, {
    attributes: true, attributeFilter: ["data-tema", "data-estado"]
  });
  dibujo.addEventListener("load", revisar);
  dibujoActivo.addEventListener("load", revisar);
  dibujo.addEventListener("error", limpiar); // el texto sigue disponible si falla el dibujo
  reducir.addEventListener("change", revisar);
  new ResizeObserver(() => {
    if (barra.dataset.tema !== "hollow-knight" || barra.dataset.estado === "oculta") return;
    medir();
    if (barra.hasAttribute("data-hk-formando")) dibujar(progreso);
  }).observe(hueco);
  revisar();
})();
