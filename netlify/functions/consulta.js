/* ══════════════════════════════════════════════════════════════
   POST /api/consulta → guarda un "Enviar por WhatsApp" en consultas.
   - Recibe la selección; el total se recalcula acá con cotizador.js.
   - Se guarda la selección normalizada, no lo que mandó el navegador.
   - El navegador no espera esta respuesta: WhatsApp se abre igual.
   ══════════════════════════════════════════════════════════════ */
const config = require("../../config.js");
const Cotizador = require("../../cotizador.js");
const db = require("./_lib/supabase.js");

const MAX_BODY = 10 * 1024;

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Método no permitido" });
  if (!db.configurado()) return json(202, { guardado: false, codigo: "sin_base" });
  if ((event.body || "").length > MAX_BODY) return json(413, { error: "Datos demasiado grandes." });

  let entrada;
  try {
    entrada = JSON.parse(event.body || "{}");
  } catch (e) {
    return json(400, { error: "Datos inválidos." });
  }
  const seleccion = entrada && entrada.seleccion;
  if (!seleccion || typeof seleccion !== "object") return json(400, { error: "Falta la selección." });

  const r = Cotizador.cotizar(config, seleccion);
  if (!r) return json(400, { error: "Selección inválida." });

  try {
    await db.insertar("consultas", { salon_id: db.salonId(), seleccion: r.seleccion, total: r.total, canal: "whatsapp" });
    return json(201, { guardado: true });
  } catch (e) {
    console.error("consulta:", e.message);
    return json(502, { guardado: false, error: "No pudimos guardar la consulta." });
  }
};
