// =========================================================
// BARRA DE VIAJE
// La "placa del nombre" de la carta, abajo a la derecha.
// 1. Apuntas a un destino (un planeta o la Z) → la placa aparece ("Rumbo a X")
//    y llama al dragón (js/dragon-vuelo.js) para que vuele hasta ella.
// 2. El dragón llega y se posa debajo → la placa se ACTIVA ("Viajar a X"):
//    ya se puede pulsar y se queda aunque dejes de apuntar.
// 3. Si dejas de apuntar antes de que llegue, se van la placa y el dragón.
// Este archivo solo cambia data-estado y data-tema: el aspecto de cada
// juego está en CSS (css/barra-viaje.css y css/planetas/<juego>.css).
// =========================================================

// Todo va dentro de (() => { ... })() para que sus variables no choquen con las de otros archivos
(() => {

// ----- Ajustes (¡prueba a cambiarlos!) -----
const MARGEN_SALIDA = 200;      // ms de espera al dejar de apuntar (para saltar entre planetas sin parpadeo)
const ESPERA_SIN_DRAGON = 2000; // ms: si el dragón no puede volar, la placa se activa sola

// ----- Elementos de la página -----
const barra = document.querySelector(".viaje");
const placa = barra.querySelector(".viaje__placa");
const texto = barra.querySelector(".viaje__texto");
const aviso = barra.querySelector(".viaje__aviso");
const dragonPosado = barra.querySelector(".viaje__dragon");
// Los destinos llevan sus datos en el HTML: data-destino, data-nombre, data-enlace y data-verbo
const destinos = [...document.querySelectorAll(".agujero__zona[data-destino], .planeta__enlace[data-destino]")];

// ----- Estado -----
let estado = "oculta";   // "oculta" | "esperando" | "activa"
let actual = null;       // el botón del destino elegido
let temporizadorSalida = 0;
let temporizadorReserva = 0;
let ignorarFoco = false; // al devolver el foco con Escape, que la placa no vuelva a abrirse

function ponerEstado(nuevo) {
  estado = nuevo;
  barra.dataset.estado = nuevo;
}

// Escribe el texto de la placa y lo anuncia a los lectores de pantalla
function escribir(frase) {
  texto.textContent = frase;
  aviso.textContent = frase;
}

function quitarEnlace() {
  placa.removeAttribute("href");
  placa.setAttribute("aria-disabled", "true");
}

// ----- Los tres momentos -----
function esperar(boton) {
  actual = boton;
  barra.dataset.tema = boton.dataset.destino; // cambia el aspecto (y su animación de aparecer empieza)
  quitarEnlace();                              // aún no se puede pulsar
  escribir(`Rumbo a ${boton.dataset.nombre}`);
  ponerEstado("esperando");
}

function llamarDragon() {
  clearTimeout(temporizadorReserva);
  // El dragón mira dónde está su imagen quieta para saber adónde volar.
  // Si puede volar, pone vuela = true; si no (reducir movimiento, o aún sin cargar),
  // activamos la placa nosotros tras una espera
  const pedido = { destino: dragonPosado, vuela: false };
  document.dispatchEvent(new CustomEvent("dragon-llamar", { detail: pedido }));
  if (!pedido.vuela) temporizadorReserva = setTimeout(activar, ESPERA_SIN_DRAGON);
}

function activar() {
  if (estado !== "esperando") return; // llegó tarde: ya no hay nada que activar
  clearTimeout(temporizadorReserva);
  const { nombre, enlace, verbo = "Viajar a" } = actual.dataset;
  if (enlace) {
    placa.href = enlace;
    placa.removeAttribute("aria-disabled");
    escribir(`${verbo} ${nombre}`);
  } else {
    escribir(`${nombre} llegará pronto`);
  }
  ponerEstado("activa");
}

function ocultar() {
  clearTimeout(temporizadorSalida);
  clearTimeout(temporizadorReserva);
  document.dispatchEvent(new CustomEvent("dragon-despedir"));
  quitarEnlace();
  aviso.textContent = "";
  ponerEstado("oculta");
  actual = null;
}

// ----- Apuntar y dejar de apuntar -----
function apuntar(evento) {
  if (ignorarFoco) return;
  const boton = evento.currentTarget;
  clearTimeout(temporizadorSalida);
  if (boton === actual) return;            // el mismo destino: todo sigue igual
  const volando = estado === "esperando";  // el dragón ya viene hacia la placa
  esperar(boton);
  // Si el dragón ya vuela, sigue su vuelo: solo cambia la placa.
  // Si no (estaba oculta, o la anterior ya estaba activa), sale un dragón nuevo
  if (!volando) llamarDragon();
}

function dejar(evento) {
  if (evento.pointerType === "touch") return; // con el dedo no hay "quitar el ratón": el dragón llega igual
  if (evento.currentTarget !== actual || estado !== "esperando") return; // activa: se queda
  clearTimeout(temporizadorSalida);
  temporizadorSalida = setTimeout(ocultar, MARGEN_SALIDA);
}

for (const boton of destinos) {
  boton.addEventListener("pointerenter", apuntar);
  boton.addEventListener("focus", apuntar);
  boton.addEventListener("pointerleave", dejar);
  boton.addEventListener("blur", dejar);
}

// El dragón avisa cuando se ha posado bajo la placa
document.addEventListener("dragon-posado", activar);

// Escape guarda la placa. Si el foco estaba en ella, vuelve a su destino (sin reabrirla)
document.addEventListener("keydown", (evento) => {
  if (evento.key !== "Escape" || estado === "oculta") return;
  const volverA = document.activeElement === placa ? actual : null;
  ocultar();
  if (volverA) {
    ignorarFoco = true;
    volverA.focus();
    ignorarFoco = false;
  }
});

// La barra está dentro de la órbita: que pulsarla no empiece a arrastrar los planetas (orbita.js)
barra.addEventListener("pointerdown", (evento) => evento.stopPropagation());

})();
