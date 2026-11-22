# Salón Eventos · plantilla para salones y quintas

Web lista para cualquier salón de fiestas, quinta o party hall, con **cotizador en vivo**, **calendario de fechas ocupadas**, envío del presupuesto por **WhatsApp** y **seña con Mercado Pago**. La demo usa un salón ficticio, "Salón Aurora".

- Todo lo del cliente está en **`config.js`** (marca, espacios, precios, adicionales, combos, fechas ocupadas, seña).
- Sin build y sin dependencias: HTML + CSS + JS. Se publica gratis en Cloudflare Workers (o Netlify).
- 3 estilos: `claro` (quinta), `oscuro` (party hall), `elegante` (casamientos). En la demo se cambian desde la franja de arriba o con `?tema=oscuro`.

## Probar en la compu

```bash
npx serve .          # abre http://localhost:3000
npm test             # 20 tests del cotizador y del cobro de la seña
```
La seña necesita la función de Netlify: `npx netlify dev`. Sin `MP_ACCESS_TOKEN` la página muestra "Modo demo" en lugar de abrir Mercado Pago.

## Publicar en Cloudflare (lo que se usa hoy)
Demo en vivo: Worker `salon-eventos` (https://salon-eventos.waltercorvalan505.workers.dev), creado el 22/11/2026 y publicado desde la rama `claude/project-thread-cr2y6z` hasta que se fusione el PR #1 (después, cambiar la rama de producción a `master`).

1. Cloudflare → *Workers & Pages* → *Create application* → *Import a repository* → elegir este repo.
2. Project name: `salon-eventos`. Build command: vacío. Deploy command: `npx wrangler deploy` (lee `wrangler.jsonc`).
3. (Opcional) *Settings → Variables and Secrets*: `MP_ACCESS_TOKEN` (Secret) = token de Mercado Pago **del salón**. Sin él, la seña muestra "Modo demo".
4. `worker.js` sirve la web y atiende `/api/crear-pago` con la misma función de Netlify. `.assetsignore` deja afuera docs, tests y archivos internos.

## Publicar en Netlify (alternativa)
1. Netlify → *Add new site* → *Import from Git* → elegir este repo.
2. Build command: vacío. Publish directory: `.` (ya está en `netlify.toml`).
3. (Opcional) *Site settings → Environment variables*: `MP_ACCESS_TOKEN` = token de producción de Mercado Pago **del salón**.

## Alta de un cliente nuevo (checklist)

1. **Copiar el repo**: nuevo repo privado `salon-<cliente>` a partir de este (no tocar este, es la demo).
2. **`config.js`**:
   - [ ] `demo.activa: false`
   - [ ] `marca`: nombre, eslogan, ciudad, dirección, `mapaQuery`, Instagram, **WhatsApp** (formato `549` + característica + número), alias de transferencia, textos del hero, "por qué elegirnos", SEO.
   - [ ] `tema` y, si quiere sus colores, `marca.colores` (`{ primario: "#...", acento: "#..." }`).
   - [ ] `espacios`: uno por cada lugar que alquila, con mínimo/máximo, modelo (`por_persona` o `fijo`) y turnos con horario y precio.
   - [ ] `reglas`: días de fin de semana, % de recargo, feriados del año, mínimo a cobrar, anticipación mínima.
   - [ ] `adicionales`: catering, barra, música/personal, extras. Tipos de precio explicados arriba del archivo.
   - [ ] `combos` y `fechasOcupadas`.
   - [ ] `pagos.sena` (porcentaje) y `pagos.cuotas`.
3. **Fotos**: subir a `img/` (JPG o WebP de menos de 300 KB, horizontales) y apuntarlas en `marca.hero.imagen`, `espacios[].fotos` y `galeria.fotos`. Borrar `img/demo/`.
4. **Logo** (opcional): `img/logo.png` y `marca.logo: "img/logo.png"`.
5. `npm test` (el último test revisa que la config sea coherente).
6. **Netlify**: crear el sitio, cargar `MP_ACCESS_TOKEN` del salón y conectar su dominio.
7. **Probar**: armar un presupuesto, enviarlo por WhatsApp, y hacer una seña de prueba.
8. Registrar en el panel: abono mensual, fecha de alta, dominio y vencimiento.

## Mantenimiento
- Nueva fecha reservada → agregarla en `fechasOcupadas` y hacer push (Netlify publica solo).
- Cambio de precios → editar `config.js`.

## Estructura
Ver `docs/ARCHITECTURE.md`. Brief del producto en `docs/PRD.md` y diseño en `docs/DESIGN_SYSTEM.md`.

## Qué falta (después)
Ver [`docs/PROXIMOS-PASOS.md`](docs/PROXIMOS-PASOS.md): fechas ocupadas desde una base de datos, registro de señas y bot + CRM.
