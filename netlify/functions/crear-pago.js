/* ══════════════════════════════════════════════════════════════
   Crea el link de pago de la SEÑA en Mercado Pago (Checkout Pro).
   - Recibe la selección del cotizador, NO el monto.
   - Recalcula el total con el mismo cotizador.js y config.js.
   - Sin dependencias: usa la API REST de Mercado Pago con fetch.
   Variable de entorno: MP_ACCESS_TOKEN (sin ella responde "sin_token").
   ══════════════════════════════════════════════════════════════ */
const config = require("../../config.js");
const Cotizador = require("../../cotizador.js");

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Método no permitido" });

  const sena = config.pagos && config.pagos.sena;
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

  const motivo = Cotizador.motivoFechaInvalida(config, seleccion.fecha, new Date());
  if (motivo) return json(400, { error: motivo });

  const r = Cotizador.cotizar(config, seleccion);
  if (!r || r.sena <= 0) return json(400, { error: "El presupuesto no tiene monto para señar." });

  const [a, m, d] = r.seleccion.fecha.split("-");
  const descripcion = `Seña ${r.senaPorcentaje}% · ${config.marca.nombre} · ${r.espacio.nombre} · ${d}/${m}/${a} · ${r.turno ? r.turno.nombre : ""} · ${r.seleccion.personas} invitados`;

  const origen = event.headers.origin || `https://${event.headers.host}`;
  const volver = (estado) => `${origen}/?pago=${estado}#cotizador`;

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
        external_reference: `${r.seleccion.espacio}|${r.seleccion.fecha}|${r.seleccion.turno}|${r.seleccion.personas}`,
        metadata: { seleccion: r.seleccion, total: r.total, sena: r.sena },
      }),
    });
    const datos = await res.json();
    if (!res.ok || !datos.init_point) return json(502, { error: "Mercado Pago no respondió bien. Probá de nuevo." });
    return json(200, { init_point: datos.init_point, sena: r.sena, total: r.total });
  } catch (e) {
    return json(502, { error: "No pudimos conectar con Mercado Pago." });
  }
};
