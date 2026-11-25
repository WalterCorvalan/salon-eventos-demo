# Arquitectura

## 01 Visión general
Navegador → sitio estático (HTML + CSS + JS, sin build) → función serverless `crear-pago` → API de Mercado Pago.

## 02 Stack
| Área | Herramienta | Costo |
|---|---|---|
| Frontend | HTML, CSS y JavaScript sin framework ni build | gratis |
| Configuración del cliente | `config.js` (un archivo por cliente) | gratis |
| Lógica de precios | `cotizador.js` (mismo archivo en navegador y servidor) | gratis |
| Pagos | Mercado Pago Checkout Pro vía API REST (sin SDK) | comisión de MP, la paga el cliente |
| Funciones | `worker.js` en Cloudflare Workers (reusa la función de Netlify) | gratis (100.000 pedidos/día) |
| Deploy | Cloudflare Workers (uso comercial gratis); Netlify queda como alternativa | USD 0 |
| Fotos demo | Fotos de ambiente generadas por código (WebP) en `img/demo/` | gratis, sin derechos de terceros |
| Íconos | Lucide (ISC) copiados en `iconos.js` | gratis, sin dependencias |
| Tests | `node --test` (sin dependencias) | gratis |

## 03 Estructura de carpetas
```
index.html            esqueleto; todo el contenido sale de config.js
config.js             TODOS los datos del cliente (marca, espacios, precios, fechas, módulos)
cotizador.js          cálculo puro del presupuesto (navegador + Node)
app.js                arma la página y maneja el cotizador
style.css             estilos + 3 temas por variables CSS
img/demo/             imágenes ficticias de la demo (reemplazar por las del cliente)
netlify/functions/    crear-pago.js (seña con Mercado Pago)
netlify.toml          redirección /api/crear-pago → función (si se usa Netlify)
worker.js             Worker de Cloudflare: web estática + /api/crear-pago
wrangler.jsonc        configuración de Cloudflare
.assetsignore         lo que NO se publica (docs, tests, archivos internos)
tests/                tests del cotizador
docs/                 PRD, diseño y arquitectura
```

## 04 Flujo de datos
1. La página carga `config.js`, `cotizador.js` y `app.js`; `app.js` dibuja todo desde la config.
2. El cliente elige espacio, fecha, turno, invitados y adicionales; `cotizar(config, seleccion)` devuelve líneas y total.
3. "Enviar por WhatsApp" abre `wa.me` con el presupuesto en texto.
4. "Señar" manda la **selección** (no el monto) a `/api/crear-pago`; la función recalcula con el mismo `cotizador.js` y `config.js`, valida fecha y cantidades, y crea la preferencia de Mercado Pago por el % de seña.
5. Mercado Pago devuelve al sitio con `?pago=approved|pending|failure` y se muestra el aviso.

## 05 Crecimiento
- Bot de WhatsApp + CRM: módulo aparte (`modulos.bot`), se suma después.
- Fechas ocupadas desde Google Sheets o el panel: reemplazar `fechasOcupadas` por un fetch.
- No agregar herramientas ni servicios sin actualizar este archivo (y su costo).

## 06 Variables de entorno
- `MP_ACCESS_TOKEN`: token de producción de Mercado Pago del salón. Sin él, la seña queda desactivada y la página lo avisa.
