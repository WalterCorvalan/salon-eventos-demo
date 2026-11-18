# Próximos pasos (base de datos, servidor y variables)

Todo lo que se puede hacer sin cuentas ni servidor ya está hecho. Esto queda para cuando estén creadas las cuentas.

## Prompt listo para pegar en Claude Code (dentro de este repo)

```
Leé AGENTS.md, docs/PRD.md y docs/ARCHITECTURE.md. La plantilla de salones ya funciona con
config.js. Ahora conectá la parte de servidor, sin cambiar el cotizador:

1. Base de datos (Supabase, plan gratis). Creá supabase/migrations/0001_salon.sql con:
   - fechas_ocupadas (salon_id, fecha, turno, motivo, creado_en) con índice único (salon_id, fecha, turno).
   - consultas (id, salon_id, seleccion jsonb, total, canal 'whatsapp'|'sena', creado_en).
   - senas (id, salon_id, mp_preference_id, mp_payment_id, estado, monto, seleccion jsonb, creado_en).
   Activá RLS: lectura pública solo de fechas_ocupadas; el resto solo con service role.
2. netlify/functions/fechas.js: devuelve las fechas ocupadas del salón (cache 60 s). En app.js,
   si existe /api/fechas, sumar esas fechas a config.fechasOcupadas antes de dibujar el calendario.
3. netlify/functions/consulta.js: guarda cada "Enviar por WhatsApp" en consultas (no bloquear
   la apertura de WhatsApp si falla).
4. crear-pago.js: guardar la preferencia en senas con estado 'pendiente' y pasar notification_url.
5. netlify/functions/mp-webhook.js: al recibir un pago aprobado, consultarlo a la API de Mercado
   Pago, marcar la seña 'aprobada' y bloquear la fecha en fechas_ocupadas.
6. Actualizá docs/ARCHITECTURE.md (stack, costos y variables) y agregá tests.

Variables de entorno (Netlify): MP_ACCESS_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SALON_ID.
No uses SDKs nuevos si alcanza con fetch. Abrí un PR.
```

## Lo que hace falta de Walter
- Cuenta de Netlify (gratis) para publicar la demo.
- Proyecto de Supabase (gratis) cuando se quiera guardar consultas y señas.
- Para cada cliente: su token de Mercado Pago.

## Más adelante (módulo pago)
- Bot de WhatsApp + CRM de consultas (+USD 15–25/mes): reutilizar la idea de Las Palmeras
  **sin copiar su código ni sus datos al repo del cliente en vivo**; vive como módulo en este repo.
