# Portafolio de mundos de videojuegos — Ludwig

## Sobre mí y el objetivo
- Me llamo Anderson, pero prefiero que me llamen **Ludwig**. Respóndeme siempre en **español**.
- Estoy aprendiendo desarrollo web con ayuda de IA. Tengo nociones de programación, pero todavía estoy aprendiendo los lenguajes.
- Este sitio es mi **portafolio** para aplicar a universidades en Alemania (creación de videojuegos). Tengo que poder explicarlo en una entrevista.

## Cómo quiero que trabajes conmigo
- Construye **una sección a la vez**, no el sitio entero de golpe.
- Después de cada cambio, explícame brevemente qué hace el código y por qué (conceptos clave, no línea por línea).
- Sugiéreme pequeñas modificaciones que pueda intentar yo mismo (colores, velocidades, textos).
- Código simple y comentado en español. Nada de dependencias innecesarias.

## Concepto del sitio
Un **hub** (mi portafolio) con varios **mundos**: cada videojuego tiene su propia página con una identidad visual inspirada en él.
- El **inicio** tiene MI estilo propio, no el de ningún juego.
- Cada mundo recrea la **atmósfera** del juego con animaciones y diseño **originales** (partículas, fondos, transiciones), más mis capturas y clips.

### Estructura
```
/                 → Inicio: presentación + selector de mundos
/outer-wilds/     → Primer mundo
/<juego>/         → Un mundo por juego, cada uno SEPARADO
/sobre-mi/        → Quién soy, objetivo de estudiar en Alemania, contacto
/destiny/         → (futuro) mi propio videojuego
```

### Carpetas
```
index.html
css/global.css        ← estilos compartidos (menú, pie, tipografía base)
js/global.js
<juego>/index.html
<juego>/style.css     ← estilos propios del mundo
<juego>/media/        ← capturas y clips (comprimidos)
sobre-mi/index.html
```

### Plantilla de cada mundo
1. Portada inmersiva con animación original.
2. "Por qué me importa este juego" (texto mío).
3. Galería de capturas/clips con **aviso de spoilers**.
4. Análisis de diseño (mecánicas, narrativa, ambiente).
5. Pie con el aviso legal del estudio + botón para volver al hub.

## Tecnología
- HTML, CSS y JavaScript puros al principio.
- Animaciones: CSS para lo básico; **GSAP** para scroll y transiciones; **Three.js** más adelante si algún mundo lo pide.
- Hosting: GitHub Pages o Netlify.
- Posible migración a **Astro** cuando haya 3–4 mundos (no antes).
- Rendimiento: imágenes en WebP, clips cortos en WebM/MP4 comprimidos, carga diferida (`loading="lazy"`).
- Diseño responsive (debe verse bien en móvil) y accesible (respetar `prefers-reduced-motion`).

## Reglas legales (IMPORTANTE)
- Sitio **100% gratis**: sin anuncios, sin registros, sin pedir email, sin donaciones, sin promocionar nada de pago.
- **No** usar logos oficiales de forma que parezca un sitio oficial. No recrear logos, personajes ni arte oficial: las animaciones deben ser originales.
- Capturas y clips: **grabados por mí**. No usar archivos extraídos del juego.
- **Música**: evitar bandas sonoras como música de fondo. Clips sin audio o silenciados por defecto.
- Cada juego **en su propia página**, sin mezclar marcas de distintos estudios en la misma página o imagen. Antes de crear un mundo nuevo, revisar la política de fan content de ese estudio.

### Outer Wilds (Mobius Digital Fan Content Policy, versión del 19 de mayo de 2022)
Permite capturas y videos de gameplay en contenido de fans gratuito y no oficial. Incluir este aviso en el pie de la página de Outer Wilds:

> This work is unofficial Fan Content created under permission from the Mobius Digital Fan Content Policy. It includes materials which are the property of Mobius Digital and it is neither approved nor endorsed by Mobius Digital.

Marcar spoilers siempre (el estudio lo pide expresamente).

## Orden de trabajo
1. Página de inicio con selector de mundos.
2. Mundo de Outer Wilds completo.
3. Publicar en GitHub Pages / Netlify.
4. Añadir un mundo nuevo a la vez.
5. Más adelante: mundo de Destiny (mi propio juego).
