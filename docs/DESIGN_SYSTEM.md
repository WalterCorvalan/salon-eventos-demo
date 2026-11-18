# Sistema de diseño

## 01 Identidad
Cálido, festivo, claro, confiable.

## 02 Colores (por tema, variables CSS en `style.css`)
| Token | Claro (quinta) | Oscuro (party hall) | Elegante (casamientos) | Uso |
|---|---|---|---|---|
| `--fondo` | #FFFDF8 | #0E0B16 | #FBF8F3 | Fondo de página |
| `--superficie` | #FFFFFF | #1A1526 | #FFFFFF | Tarjetas |
| `--suave-fondo` | #F2EBDC | #241D35 | #F1ECE4 | Secciones alternas |
| `--texto` | #1F2A22 | #F3F0FA | #2A2622 | Texto principal |
| `--apagado` | #5B6A5F | #A79FBF | #6E665D | Texto secundario |
| `--primario` | #2F6B3F | #B14BFF | #2A2622 | Títulos, selección |
| `--acento` | #E07A2E | #2DE2C8 | #B08D57 | Botones principales |
| `--borde` | #E4DCC8 | #352C4A | #E6DED2 | Bordes |
| `--wa` | #25D366 | #25D366 | #25D366 | Botón WhatsApp |
| `--error` | #D64545 | #FF5C7A | #B3261E | Fechas ocupadas, errores |

Un cliente puede pisar `primario` y `acento` con sus colores en `config.js` (`marca.colores`).

## 03 Tipografía
- Títulos: Fraunces (Google Fonts), tema elegante usa Cormorant Garamond.
- Texto: Inter.
- H1: clamp(32px, 6vw, 56px) Bold · H2: clamp(24px, 4vw, 36px) Semibold · H3: 18px Semibold
- Texto: 16px · Nota: 14px

## 04 Espaciado
Escala de 8px: 4, 8, 16, 24, 32, 48, 64.

## 05 Bordes
- Inputs y chips: 8px · Tarjetas: 12px · Botones: 999px (píldora) · Modal: 16px

## 06 Componentes
- **Botón primario:** fondo `--acento`, texto blanco (tema oscuro: texto `#0E0B16`).
- **Botón WhatsApp:** fondo `--wa`, texto blanco, ícono WhatsApp.
- **Tarjeta de opción:** borde 2px `--borde`; seleccionada: borde `--primario` y tilde.
- **Contador:** botones − / + de 36px, número al centro.
- **Calendario:** grilla 7 columnas; ocupado = tachado en `--error`; seleccionado = `--primario`.
- **Resumen flotante:** barra fija abajo con total; se expande con el detalle.

## 07 Íconos
Emojis (cero dependencias) + SVG de WhatsApp e Instagram.

## 08 Pantallas
- Celular: < 640px · Tablet: 640–1024px · Escritorio: > 1024px (resumen pasa a columna lateral fija).

## Reglas
- Nunca usar colores fuera de los tokens.
- Primero celular.
- Modo oscuro: es el tema "oscuro", se elige por config, no por el sistema.
