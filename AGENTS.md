# Instrucciones para agentes

## 01 Propósito
Plantilla genérica para salones y quintas de eventos. Cada cliente es una copia de este repo con su propio `config.js` y sus fotos.

## 02 Antes de empezar
- Leer docs/PRD.md, docs/DESIGN_SYSTEM.md y docs/ARCHITECTURE.md.
- Todo dato de un cliente va en `config.js`. Nunca escribir nombres, precios ni teléfonos en `index.html`, `app.js` o `cotizador.js`.

## 03 Reglas generales
- Construir solo lo que está en el PRD.
- **Quinta Las Palmeras, Pfaffen y Baucan son clientes en vivo: nunca tocar sus repos** (ni ramas ni PRs). Este repo no usa sus fotos ni sus datos.
- Gratis/open source primero: sin servicios pagos ni dependencias nuevas sin aprobación.
- Textos visibles en español (Argentina).
- Sin `alert()`: los avisos van en la página.

## 04 Código
- JavaScript sin build. `cotizador.js` debe seguir funcionando en el navegador y en Node (sin DOM).
- Montos en pesos enteros, redondeados.
- Escapar todo texto que venga de la config antes de meterlo en HTML (`esc()` en app.js).
- Todo responsive, primero celular.

## 05 Seguridad
- El monto a cobrar se calcula en el servidor, nunca se confía en el navegador.
- `MP_ACCESS_TOKEN` solo como variable de entorno.

## 06 Comandos
- Correr local: `npx serve .` (o abrir `index.html`; la seña necesita `netlify dev`).
- Tests: `npm test`
- Deploy: Cloudflare Workers conectado al repo (deploy command `npx wrangler deploy`). Local: `npx wrangler dev`.

## 07 Si hay dudas
- Mirar docs/ y el README ("Alta de un cliente nuevo").
- Preguntar antes de cambios grandes.
