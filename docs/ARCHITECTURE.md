# Arquitectura

## 01 Visión general
Navegador → sitio estático (HTML + CSS + JS, sin build) → funciones serverless de Netlify → API de Mercado Pago y base de datos Supabase (Postgres).

```
navegador ──GET /api/fechas──────► fechas.js ───────► Supabase (fechas_ocupadas)
          ──POST /api/consulta───► consulta.js ─────► Supabase (consultas)
          ──POST /api/crear-pago─► crear-pago.js ───► Mercado Pago (preferencia)
                                                  └─► Supabase (senas 'pendiente', consultas 'sena')
Mercado Pago ──POST /api/mp-webhook─► mp-webhook.js ─► GET /v1/payments/{id} (Mercado Pago)
                                                  └─► Supabase (senas 'aprobada', fechas_ocupadas)
```

La base es **opcional**: sin las variables de Supabase el sitio funciona igual que antes, solo con `config.js`.

## 02 Stack
| Área | Herramienta | Costo |
|---|---|---|
| Frontend | HTML, CSS y JavaScript sin framework ni build | gratis |
| Configuración del cliente | `config.js` (un archivo por cliente) | gratis |
| Lógica de precios | `cotizador.js` (mismo archivo en navegador y servidor) | gratis |
| Pagos | Mercado Pago Checkout Pro vía API REST (sin SDK) | comisión de MP, la paga el cliente |
| Funciones | Netlify Functions (4: `fechas`, `consulta`, `crear-pago`, `mp-webhook`) | gratis dentro del plan gratuito de Netlify (con límite mensual de uso) |
| Base de datos | Supabase plan Free (Postgres + API REST), acceso con `fetch`, sin SDK | USD 0 (500 MB; Supabase pausa los proyectos gratis tras ~1 semana sin actividad: con visitas, `/api/fechas` lo mantiene activo; si se pausa, se reactiva desde el panel) |
| Deploy | Netlify (permite uso comercial gratis) | USD 0 |
| Fotos demo | Ilustraciones SVG propias en `img/demo/` | gratis, sin derechos de terceros |
| Tests | `node --test` (sin dependencias) | gratis |

Un solo proyecto de Supabase puede servir a varios salones: cada fila lleva `salon_id`. Si un cliente crece mucho, se le crea su propio proyecto (Pro: USD 25/mes, se le traslada).

## 03 Estructura de carpetas
```
index.html            esqueleto; todo el contenido sale de config.js
config.js             TODOS los datos del cliente (marca, espacios, precios, fechas, módulos)
cotizador.js          cálculo puro del presupuesto (navegador + Node)
app.js                arma la página y maneja el cotizador
style.css             estilos + 3 temas por variables CSS
img/demo/             imágenes ficticias de la demo (reemplazar por las del cliente)
netlify/functions/
  fechas.js           GET  /api/fechas      fechas ocupadas del salón (cache 60 s)
  consulta.js         POST /api/consulta    guarda cada "Enviar por WhatsApp"
  crear-pago.js       POST /api/crear-pago  seña con Mercado Pago
  mp-webhook.js       POST /api/mp-webhook  aviso de pago de Mercado Pago
  _lib/               supabase.js (fetch a PostgREST) y fechas.js (cache + unión con config)
supabase/migrations/  0001_salon.sql (tablas, índices y RLS)
netlify.toml          redirecciones /api/* → funciones
tests/                tests del cotizador y de las funciones (fetch simulado)
docs/                 PRD, diseño y arquitectura
```

## 04 Base de datos (`supabase/migrations/0001_salon.sql`)
| Tabla | Para qué | Acceso |
|---|---|---|
| `fechas_ocupadas` (salon_id, fecha, turno, motivo, creado_en) — único (salon_id, fecha, turno) | días tomados; `turno = 'todo'` bloquea el día entero | lectura pública; escritura solo service role |
| `consultas` (id, salon_id, seleccion, total, canal `whatsapp`\|`sena`, creado_en) | cada presupuesto enviado | solo service role |
| `senas` (id, salon_id, mp_preference_id, mp_payment_id, estado, monto, seleccion, creado_en) | señas; estado `pendiente`\|`aprobada`\|`rechazada`\|`devuelta` | solo service role |

RLS activo en las tres. La `SUPABASE_SERVICE_ROLE_KEY` saltea RLS y **solo** vive en las funciones de Netlify, nunca en el navegador.

Bloquear una fecha a mano: en el editor de tablas de Supabase, agregar una fila en `fechas_ocupadas` (o seguir usando `fechasOcupadas` en `config.js`; se suman las dos).

## 05 Flujo de datos
1. La página carga `config.js`, `cotizador.js` y `app.js`; `app.js` dibuja todo desde la config.
2. Enseguida pide `/api/fechas` y suma esas fechas a `config.fechasOcupadas`; vuelve a dibujar el calendario (si la fecha elegida quedó ocupada, la limpia y avisa). Si la función no existe o falla, sigue con `config.js`.
   - El cotizador bloquea **días**: si cualquier turno de un día está tomado, el día entero aparece ocupado (igual que `config.fechasOcupadas`). La respuesta trae también `detalle` con el turno, para usarlo más adelante.
3. El cliente elige espacio, fecha, turno, invitados y adicionales; `cotizar(config, seleccion)` devuelve líneas y total.
4. "Enviar por WhatsApp" abre `wa.me` y, sin esperar, manda la selección a `/api/consulta`, que recalcula el total y la guarda en `consultas`. Si falla, WhatsApp ya se abrió igual.
5. "Señar" manda la **selección** (no el monto) a `/api/crear-pago`; la función suma las fechas de la base, recalcula con el mismo `cotizador.js` y `config.js`, valida fecha y cantidades, y crea la preferencia de Mercado Pago por el % de seña con:
   - `external_reference` = id de la seña (UUID), `notification_url` = `${URL}/api/mp-webhook` (URL propia del sitio que define Netlify).
   - Guarda la seña como `pendiente` y la consulta con canal `sena`. Si la base falla, el pago sigue igual.
6. Mercado Pago devuelve al sitio con `?pago=approved|pending|failure` y se muestra el aviso.
7. Mercado Pago avisa a `/api/mp-webhook`. La función **no confía en el aviso**: toma el id y consulta el pago a `api.mercadopago.com/v1/payments/{id}`. Si está aprobado (y el monto cubre la seña), marca la seña `aprobada` y bloquea (fecha, turno) en `fechas_ocupadas`. Es idempotente (avisos repetidos o desordenados no rompen nada) y responde 5xx ante errores transitorios para que Mercado Pago reintente.

## 06 Crecimiento
- Bot de WhatsApp + CRM: módulo aparte (`modulos.bot`), se suma después; puede leer `consultas`.
- Ocupación por turno en el calendario (hoy por día): requiere cambiar el cotizador.
- No agregar herramientas ni servicios sin actualizar este archivo (y su costo).

## 07 Variables de entorno (Netlify → Site settings → Environment variables)
| Variable | Obligatoria | Qué es |
|---|---|---|
| `MP_ACCESS_TOKEN` | para la seña | token de producción de Mercado Pago del salón. Sin él, la seña queda desactivada y la página lo avisa. |
| `SUPABASE_URL` | para la base | `https://<proyecto>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | para la base | clave *service_role* del proyecto (Settings → API). **Secreta.** |
| `SALON_ID` | para la base | identificador corto del salón, ej. `aurora`; separa los datos de cada cliente. |
| `URL` | automática | la define Netlify; se usa para el `notification_url`. |

Sin las tres de Supabase, `/api/fechas` devuelve listas vacías, `/api/consulta` no guarda nada y el webhook ignora los avisos.

## 08 Puesta en marcha de la base (una vez por proyecto de Supabase)
1. Crear el proyecto en supabase.com (plan Free).
2. SQL Editor → pegar y correr `supabase/migrations/0001_salon.sql` (o `supabase db push` con la CLI).
3. Cargar en Netlify `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y `SALON_ID`.
4. Hacer una seña de prueba y revisar que aparezca en `senas` y, aprobada, en `fechas_ocupadas`.
