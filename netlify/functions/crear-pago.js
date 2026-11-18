/* ══════════════════════════════════════════════════════════════
   Crea el link de pago de la SEÑA en Mercado Pago (Checkout Pro).
   - Recibe la selección del cotizador, NO el monto.
   - Recalcula el total con el mismo cotizador.js y config.js.
   - Sin dependencias: usa la API REST de Mercado Pago con fetch.
   - Con Supabase configurado: también rechaza fechas bloqueadas en la
     base, guarda la seña como 'pendiente' (su id viaja como
     external_reference) y registra la consulta con canal 'sena'.
   Variables: MP_ACCESS_TOKEN (sin ella responde "sin_token");
   opcionales SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SALON_ID.
   ══════════════════════════════════════════════════════════════ */
const crypto = require("node:crypto");
const configBase = require("../../config.js");
const Cotizador = require("../../cotizador.js");
const db = require("./_lib/supabase.js");
const { fechasDelSalon, configConFechas } = require("./_lib/fechas.js");

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Método no permitido" });

  const sena = configBase.pagos && configBase.pagos.sena;
  if (!sena || !sena.activa) return json(400, { error: "La seña online no está activa." });
  if (!process.env.MP_ACCESS_TOKEN) return json(503, { codigo: "sin_token", error: "Pago online todavía no configurado." });

  let entrada;
  try {
    entrada = JSON.parse(event.body || "{}");
  } catch (e) {
    return json(400, { error: "Datos inválidos." });
  }
  const seleccion = entrada && entrada.seleccion;
  if (!seleccion || typeof seleccion !== "object") return json(400, { error: "Falta la selección." });

  // Sumar las fechas bloqueadas en la base (señas aprobadas, bloqueos manuales).
  // Si la base no responde se sigue con las de config.js: no se corta la venta.
  let config = configBase;
  if (db.configurado()) {
    try {
      config = configConFechas(configBase, (await fechasDelSalon({ sinCache: true })).fechas);
    } catch (e) {
      console.error("crear-pago: no se pudieron leer las fechas:", e.message);
    }
  }

  const motivo = Cotizador.motivoFechaInvalida(config, seleccion.fecha, new Date());
  if (motivo) return json(400, { error: motivo });

  const r = Cotizador.cotizar(config, seleccion);
  if (!r || r.sena <= 0) return json(400, { error: "El presupuesto no tiene monto para señar." });

  const [a, m, d] = r.seleccion.fecha.split("-");
  const descripcion = `Seña ${r.senaPorcentaje}% · ${config.marca.nombre} · ${r.espacio.nombre} · ${d}/${m}/${a} · ${r.turno ? r.turno.nombre : ""} · ${r.seleccion.personas} invitados`;

  const origen = event.headers.origin || `https://${event.headers.host}`;
  const volver = (estado) => `${origen}/?pago=${estado}#cotizador`;
  // El aviso de pago va siempre a la URL propia del sitio (Netlify define URL),
  // nunca a un Origin que podría mandar cualquiera.
  const sitio = (process.env.URL || origen).replace(/\/+$/, "");
  const notificationUrl = /^https:\/\//.test(sitio) ? `${sitio}/api/mp-webhook?source_news=webhooks` : undefined;
  const senaId = crypto.randomUUID();

  try {
    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [{ title: descripcion.slice(0, 250), quantity: 1, unit_price: r.sena, currency_id: "ARS" }],
        back_urls: { success: volver("approved"), pending: volver("pending"), failure: volver("failure") },
        auto_return: "approved",
        external_reference: senaId,
        notification_url: notificationUrl,
        metadata: { sena_id: senaId, salon_id: db.salonId() || null, seleccion: r.seleccion, total: r.total, sena: r.sena },
      }),
    });
    const datos = await res.json();
    if (!res.ok || !datos.init_point) return json(502, { error: "Mercado Pago no respondió bien. Probá de nuevo." });

    if (db.configurado()) {
      // Si falla el guardado, el pago sigue: el webhook crea la seña con la metadata de MP.
      const guardados = await Promise.allSettled([
        db.insertar("senas", {
          id: senaId,
          salon_id: db.salonId(),
          mp_preference_id: datos.id ? String(datos.id) : null,
          estado: "pendiente",
          monto: r.sena,
          seleccion: r.seleccion,
        }),
        db.insertar("consultas", { salon_id: db.salonId(), seleccion: r.seleccion, total: r.total, canal: "sena" }),
      ]);
      guardados.forEach((g) => g.status === "rejected" && console.error("crear-pago:", g.reason && g.reason.message));
    }
    return json(200, { init_point: datos.init_point, sena: r.sena, total: r.total });
  } catch (e) {
    return json(502, { error: "No pudimos conectar con Mercado Pago." });
  }
};
