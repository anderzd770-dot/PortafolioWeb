// Placa de Hollow Knight: la tinta revela el marco como en su carta.
// Solo observa la barra compartida; no cambia los destinos ni el vuelo.
(() => {
  const DURACION = 1400; // milisegundos: prueba 1900 para ver mejor las sombras
  const COLOR_ALMA = "#e8e6f0";
  const barra = document.querySelector(".viaje");
  const hueco = barra?.querySelector(".viaje__lienzo");
  if (!hueco) return;

  const lienzo = document.createElement("canvas");
  lienzo.className = "viaje__sombras-hk";
  lienzo.setAttribute("aria-hidden", "true");
  hueco.append(lienzo);
  const ctx = lienzo.getContext("2d");
  if (!ctx) return;
  const reducir = matchMedia("(prefers-reduced-motion: reduce)");
  const dibujo = new Image();
  dibujo.src = "img/placas/hollow-knight.svg";
  let fotograma = 0;
  let inicio = 0;
  let presentada = false;
  let ancho = 0;
  let alto = 0;
  const limitar = n => Math.min(1, Math.max(0, n));
  // Dos filas de manchas. Las posiciones fijas evitan saltos al redimensionar.
  const manchas = Array.from({ length: 12 }, (_, i) => ({
    x: 0.1 + (i % 6) * 0.16,
    y: i < 6 ? 0.32 : 0.68,
    fase: i * 1.7,
    demora: Math.abs((i % 6) - 2.5) * 0.055
  }));

  function limpiar() {
    cancelAnimationFrame(fotograma);
    fotograma = 0;
    delete barra.dataset.hkFormando;
    barra.style.removeProperty("--hk-revelado");
    ctx.clearRect(0, 0, ancho, alto);
  }

  function medir() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    ancho = lienzo.clientWidth;
    alto = lienzo.clientHeight;
    lienzo.width = Math.round(ancho * dpr);
    lienzo.height = Math.round(alto * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function animar(ahora) {
    const p = limitar((ahora - inicio) / DURACION);
    ctx.clearRect(0, 0, ancho, alto);
    if (p === 1) { limpiar(); return; }
    const cx = ancho / 2, cy = alto / 2;
    const recorte = new Path2D();
    const desvanecer = 1 - limitar((p - 0.72) / 0.28);
    // Niebla tenue: permite distinguir las sombras negras del cielo.
    const niebla = ctx.createRadialGradient(cx, cy, 0, cx, cy, ancho * 0.48);
    niebla.addColorStop(0, "rgba(232,230,240,0.17)");
    niebla.addColorStop(1, "rgba(232,230,240,0)");
    ctx.globalAlpha = Math.sin(p * Math.PI);
    ctx.fillStyle = niebla;
    ctx.fillRect(0, 0, ancho, alto);
    ctx.globalAlpha = 1;

    for (const m of manchas) {
      const t = limitar((p - m.demora) / 0.65);
      if (!t) continue;
      const x = ancho * m.x, y = alto * m.y;
      const avance = 1 - Math.pow(1 - limitar(t * 2), 3);
      const puntaX = cx + (x - cx) * avance;
      const puntaY = cy + (y - cy) * avance;
      const onda = Math.sin(p * 9 + m.fase) * alto * 0.19;
      ctx.globalAlpha = desvanecer;
      ctx.strokeStyle = "#000";
      ctx.lineWidth = (1 - t * 0.65) * alto * 0.09;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.bezierCurveTo(cx, cy + onda, puntaX, puntaY - onda, puntaX, puntaY);
      ctx.stroke();
      // Contorno ondulado de cada gota: juntas revelan todo el marco.
      const radio = limitar((t - 0.2) / 0.8) * ancho * 0.24;
      for (let j = 0; j <= 48; j++) {
        const a = j / 48 * Math.PI * 2;
        const r = radio * (1 + 0.12 * Math.sin(a * 5 + m.fase));
        const px = x + Math.cos(a) * r;
        const py = y + Math.sin(a) * r;
        if (j === 0) recorte.moveTo(px, py); else recorte.lineTo(px, py);
      }
      recorte.closePath();
      // Motas de alma que ascienden y se apagan; nunca quedan bucles activos.
      for (let j = 0; j < 2; j++) {
        ctx.globalAlpha = Math.sin(t * Math.PI) * desvanecer * 0.8;
        ctx.fillStyle = COLOR_ALMA;
        ctx.beginPath();
        ctx.ellipse(x + Math.sin(m.fase + j) * 10, y - t * alto * 0.45 + j * 9, 1.2, 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.clip(recorte);
    // El lienzo tiene un margen del 15% alrededor de la placa.
    ctx.drawImage(dibujo, ancho * 15 / 130, alto * 15 / 130, ancho / 1.3, alto / 1.3);
    ctx.restore();
    barra.style.setProperty("--hk-revelado", `${50 * (1 - limitar((p - 0.25) / 0.6))}%`);
    fotograma = requestAnimationFrame(animar);
  }

  function revisar() {
    const visible = barra.dataset.tema === "hollow-knight" && barra.dataset.estado !== "oculta";
    if (!visible) { limpiar(); presentada = false; return; }
    if (reducir.matches) { limpiar(); presentada = true; return; }
    if (presentada || !dibujo.complete || !dibujo.naturalWidth) return;
    presentada = true;
    medir();
    barra.dataset.hkFormando = "";
    barra.style.setProperty("--hk-revelado", "50%");
    inicio = performance.now();
    fotograma = requestAnimationFrame(animar);
  }

  new MutationObserver(revisar).observe(barra, {
    attributes: true, attributeFilter: ["data-tema", "data-estado"]
  });
  dibujo.addEventListener("load", revisar);
  dibujo.addEventListener("error", limpiar); // el texto sigue disponible si falla el dibujo
  reducir.addEventListener("change", revisar);
  new ResizeObserver(() => { if (fotograma) medir(); }).observe(hueco);
  revisar();
})();
