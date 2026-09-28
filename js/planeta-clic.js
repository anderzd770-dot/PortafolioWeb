// =========================================================
// CLIC EN UN PLANETA
// Con el ratón encima, cada clic cambia el dibujo por el otro
// (el de apuntado ↔ el normal) sin que el planeta deje de estar
// grande. Al quitar el ratón, vuelve a empezar.
// Y al pulsarlo se "hunde" como un botón, igual que las letras del
// título: retrocede alejándose del punto del clic, se encoge un poco
// y vuelve con un rebote, con un destello de luz.
// El cambio de dibujo lo hace el CSS con la clase .planeta--cambiado
// (css/inicio.css; Outer Wilds, que tiene un solo dibujo, esconde la luna).
// =========================================================

// Todo va entre llaves { }: así los nombres de aquí (REBOTE, DESTELLO…) no chocan
// con los de otros scripts de la página, que comparten el mismo espacio
{
// ----- Ajustes (¡prueba a cambiarlos!) -----
const EMPUJE_PLANETA = 6;      // cuánto retrocede, en píxeles de pantalla
const HUNDIR_PLANETA = 0.93;   // cuánto se encoge al pulsarlo (1 = nada, 0.8 = mucho)
const DURACION_PULSAR = 500;   // milisegundos que tarda en volver a su sitio
const DESTELLO = 1.45;         // brillo del destello (1 = sin destello)
const REBOTE = "cubic-bezier(0.2, 1.6, 0.4, 1)"; // la misma curva que las letras del título

const sinMovimientoPlaneta = window.matchMedia("(prefers-reduced-motion: reduce)");

document.querySelectorAll(".orbita .planeta").forEach((planeta) => {
  const enlace = planeta.querySelector(".planeta__enlace");
  const esfera = planeta.querySelector(".planeta__esfera");
  if (!enlace || !esfera) return;

  let puntero = ""; // con qué se pulsó: "mouse", "touch" o "pen"
  enlace.addEventListener("pointerdown", (evento) => {
    puntero = evento.pointerType;
  });

  enlace.addEventListener("click", (evento) => {
    if (evento.defaultPrevented) return; // orbita.js: venía de arrastrar la órbita
    if (evento.detail === 0) return;     // teclado (Enter o Espacio): hace lo de siempre
    if (puntero !== "mouse") return;     // con el dedo no hay "apuntar": hace lo de siempre (su carta)
    // Outer Wilds es un enlace. Con el ratón, el clic cambia el dibujo;
    // para viajar está la placa que trae el dragón (o Enter con el teclado)
    if (enlace.tagName === "A") evento.preventDefault();

    planeta.classList.toggle("planeta--cambiado");
    pulsar(evento.clientX, evento.clientY);
  });

  // Al quitar el ratón, la próxima vez se verá como siempre
  planeta.addEventListener("pointerleave", () => {
    planeta.classList.remove("planeta--cambiado");
  });

  // El "botón que se hunde". Usa translate y scale sueltos (no transform):
  // transform ya lo usa el crecer al apuntar, y así los dos se suman sin pisarse
  function pulsar(x, y) {
    esfera.animate([{ filter: `brightness(${DESTELLO})` }, { filter: "brightness(1)" }], {
      duration: 400,
      easing: "ease-out",
    });
    if (sinMovimientoPlaneta.matches) return; // con menos movimiento: solo el destello

    // Hacia dónde retrocede: desde el punto del clic hacia fuera, pasando por el centro del planeta
    const caja = esfera.getBoundingClientRect();
    const dx = caja.left + caja.width / 2 - x;
    const dy = caja.top + caja.height / 2 - y;
    const largo = Math.hypot(dx, dy) || 1;
    const mover = `${(dx / largo) * EMPUJE_PLANETA}px ${(dy / largo) * EMPUJE_PLANETA}px`;

    esfera.animate(
      [
        { translate: mover, scale: HUNDIR_PLANETA },
        { translate: "0px 0px", scale: 1 },
      ],
      { duration: DURACION_PULSAR, easing: REBOTE }
    );
  }
});
}
