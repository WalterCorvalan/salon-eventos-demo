/* ══════════════════════════════════════════════════════════════
   POST /api/mp-webhook → aviso de Mercado Pago (notification_url).
   No se confía en el contenido del aviso: solo se toma el id del pago
   y se lo consulta a la API de Mercado Pago con MP_ACCESS_TOKEN.
   - Pago aprobado: seña 'aprobada' + fecha bloqueada en fechas_ocupadas.
   - Otros estados: se actualiza la seña (pendiente/rechazada/devuelta).
   Es idempotente: Mercado Pago puede repetir el mismo aviso.
   Responde 200 a lo que no corresponde procesar y 5xx ante errores
   transitorios, para que Mercado Pago reintente.
   ══════════════════════════════════════════════════════════════ */
const config = require("../../config.js");
const Cotizador = require("../../cotizador.js");
const db = require("./_lib/supabase.js");
const { limpiarCache } = require("./_lib/fechas.js");

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

/* Estado de Mercado Pago → estado de la seña */
function estadoSena(status) {
  if (status === "approved") return "aprobada";
  if (status === "rejected" || status === "cancelled") return "rechazada";
  if (status === "refunded" || status === "charged_back") return "devuelta";
  return "pendiente"; // pending, in_process, authorized, in_mediation
}

/* Saca el id del pago de los dos formatos de aviso (webhooks e IPN). */
function idDePago(event) {
  const q = event.queryStringParameters || {};
  let body = {};
  try {
    body = JSON.parse(event.body || "{}") || {};
  } catch (e) {}
  const tipo = body.type || body.topic || q.type || q.topic;
  if (tipo !== "payment") return null;
  let id = (body.data && body.data.id) || q["data.id"] || q.id;
  if (!id && typeof body.resource === "string") id = body.resource.split("/").pop();
  id = id == null ? "" : String(id);
  return /^\d{1,30}$/.test(id) ? id : null;
}

async function consultarPago(id) {
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
    headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Mercado Pago ${res.status}`);
  return res.json();
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Método no permitido" });

  const pagoId = idDePago(event);
  if (!pagoId) return json(200, { ignorado: "no es un aviso de pago" });
  if (!process.env.MP_ACCESS_TOKEN) return json(503, { error: "Falta MP_ACCESS_TOKEN" });
  if (!db.configurado()) return json(200, { ignorado: "sin base de datos" });

  let pago;
  try {
    pago = await consultarPago(pagoId);
  } catch (e) {
    console.error("mp-webhook:", e.message);
    return json(502, { error: "No pudimos consultar el pago." });
  }
  if (!pago) return json(200, { ignorado: "pago inexistente" });

  const meta = pago.metadata || {};
  const senaId = String(pago.external_reference || meta.sena_id || "");
  if (!UUID.test(senaId)) return json(200, { ignorado: "pago ajeno a la web" });
  if (meta.salon_id && meta.salon_id !== db.salonId()) return json(200, { ignorado: "pago de otro salón" });

  const estado = estadoSena(pago.status);

  try {
    const filas = await db.rest(
      `senas?select=id,estado,monto,seleccion&id=eq.${senaId}&salon_id=eq.${encodeURIComponent(db.salonId())}`
    );
    let sena = filas && filas[0];

    if (sena) {
      // Los avisos pueden llegar desordenados: una seña aprobada solo cambia si se devuelve.
      const nuevo = sena.estado === "aprobada" && estado !== "devuelta" ? "aprobada" : estado;
      await db.rest(`senas?id=eq.${senaId}`, {
        method: "PATCH",
        body: { estado: nuevo, mp_payment_id: pagoId },
        prefer: "return=minimal",
      });
    } else {
      // No quedó guardada al crear el pago: se arma con la metadata que guardamos en MP.
      const seleccion = Cotizador.normalizar(config, meta.seleccion || {});
      if (!seleccion) return json(200, { ignorado: "pago sin selección" });
      sena = { id: senaId, monto: Math.round(Number(meta.sena) || pago.transaction_amount || 0), seleccion };
      await db.insertar("senas", {
        id: senaId,
        salon_id: db.salonId(),
        mp_payment_id: pagoId,
        estado,
        monto: sena.monto,
        seleccion,
      });
    }

    if (estado !== "aprobada") return json(200, { ok: true, estado });

    const pagado = Math.round(Number(pago.transaction_amount) || 0);
    if (pagado < Number(sena.monto)) {
      console.error(`mp-webhook: pago ${pagoId} por ${pagado}, menor a la seña ${sena.monto}; no se bloquea la fecha`);
      return json(200, { ok: true, estado, bloqueada: false });
    }

    const sel = sena.seleccion || {};
    if (!Cotizador.parseFecha(sel.fecha)) return json(200, { ok: true, estado, bloqueada: false });

    await db.bloquearFecha(sel.fecha, sel.turno || "todo", `Seña aprobada · pago MP ${pagoId}`);
    limpiarCache();
    return json(200, { ok: true, estado, bloqueada: true });
  } catch (e) {
    console.error("mp-webhook:", e.message);
    return json(500, { error: "No pudimos registrar el pago." });
  }
};

exports.estadoSena = estadoSena;
exports.idDePago = idDePago;
