# Sistema de diseño

## 01 Identidad
Cálido, festivo, claro, confiable.

## 02 Colores (por tema, variables CSS en `style.css`)
| Token | Claro (quinta) | Oscuro (party hall) | Elegante (casamientos) | Uso |
|---|---|---|---|---|
| `--fondo` | #F7F3EC | #0B0A10 | #FAF7F2 | Fondo de página |
| `--superficie` | #FFFFFF | #15131D | #FFFFFF | Tarjetas |
| `--suave-fondo` | #EFE8DC | #1C1928 | #F1EBE2 | Secciones alternas, íconos |
| `--texto` | #1C1A17 | #F4F1EA | #24201C | Texto principal |
| `--apagado` | #6B645A | #A19BB0 | #776E63 | Texto secundario |
| `--primario` | #1F3D2B | #C9B6FF | #24201C | Selección, precios |
| `--acento` | #C8643B | #E8C27A | #A88452 | Botones principales, palabras destacadas |
| `--tinta` | #161512 | #1C1928 | #24201C | Barra del resumen y pie |
| `--borde` | #E4DCCD | #2A2638 | #E7DED1 | Bordes |
| `--wa` | #25D366 | #25D366 | #25D366 | Botón WhatsApp |
| `--error` | #C2412D | #FF6B81 | #A3352A | Fechas ocupadas, errores |

Un cliente puede pisar `primario` y `acento` con sus colores en `config.js` (`marca.colores`).

## 03 Tipografía
- Títulos: Bricolage Grotesque 700, letras juntas (-0.035em). La palabra destacada va en el mismo tipo pero fina (300) y en `--acento`. Tema elegante: Jost 400 (destacada en cursiva fina).
- **Nada de fuentes con serif** (las de "colita"): Walter las rechaza.
- Texto: Manrope 400–800.
- H1 (hero): clamp(60px, 15vw, 132px) · H2: clamp(38px, 7vw, 64px) · H3: 24–28px
- Sobretítulos: 12px, mayúsculas, espaciado 0.16em, color `--acento`, con línea a la izquierda.
- Montos grandes (total, invitados): en la fuente de títulos, números tabulares.

## 04 Espaciado
Escala de 4px: 4, 8, 12, 16, 20, 28, 36, 48, 72, 104 (secciones: 72px celular, 104px desde tablet).

## 05 Bordes
- Tarjetas: 18px (`--radio`; elegante 6px) · Opciones: 12px · Botones: píldora (elegante: rectos, mayúsculas).

## 06 Componentes
- **Hero:** foto a pantalla completa con degradé abajo, título grande, datos rápidos (capacidad, espacios) y tarjeta de vidrio "Próximo sábado libre" que elige esa fecha en el cotizador.
- **Navegación:** transparente sobre el hero; al bajar se vuelve sólida con desenfoque.
- **Botón primario:** fondo `--acento` con sombra del mismo color.
- **Tarjeta de opción:** ícono en cuadradito `--suave-fondo`; seleccionada: borde doble `--primario`, ícono invertido y tilde.
- **Calendario:** días redondos; finde = punto `--acento`; ocupado = tachado `--error`; elegido = círculo `--primario`.
- **Resumen:** en celular, cápsula flotante oscura (`--tinta`) con el total y botón "Ver detalle", que aparece recién al bajar de la portada (no tapa el hero); en escritorio, columna fija.
- **Pie:** marca grande, y columnas Visitanos / Escribinos / Tu fecha.
- **Galería:** grilla tipo mosaico, primera foto grande, epígrafe sobre degradé.

## 07 Íconos
Dibujos de Lucide (licencia ISC) en `iconos.js`, pintados **a dos tonos**: línea + relleno suave (`.duo`). Siempre van dentro de una "baldosa" con color: en "Por qué elegirnos", baldosa con degradé (alternando `--acento` y `--primario`); en las opciones, baldosa suave de `--acento` que se vuelve degradé `--primario` al elegirla. Nunca íconos de línea sueltos (Walter los ve "de IA"). Las flechas, tildes y +/− quedan solo con línea. En `config.js` se pone el nombre (`"landmark"`, `"trees"`…); si se pone un emoji, se muestra el emoji.

## 07b Fotos
Las fotos de la demo son reales, con licencia libre (CC0 o Unsplash): ver `img/demo/CREDITOS.md`. Cada cliente las reemplaza por las suyas.

## 08 Pantallas
- Celular: < 640px · Tablet: 640–1024px · Escritorio: > 1024px (resumen pasa a columna lateral fija).

## Reglas
- Nunca usar colores fuera de los tokens.
- Primero celular.
- Modo oscuro: es el tema "oscuro", se elige por config, no por el sistema.
