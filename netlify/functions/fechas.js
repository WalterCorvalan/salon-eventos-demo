/* ══════════════════════════════════════════════════════════════
   GET /api/fechas → fechas ocupadas del salón guardadas en Supabase.
   Respuesta: { fechas: ["2026-12-12", …], detalle: [{ fecha, turno }] }
   - "fechas" son días: el cotizador bloquea el día entero si cualquier
     turno está tomado (igual que config.fechasOcupadas).
   - Cache de 60 s (en el navegador/CDN y en memoria de la función).
   - Sin Supabase configurado devuelve listas vacías.
   ══════════════════════════════════════════════════════════════ */
const { fechasDelSalon } = require("./_lib/fechas.js");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET" && event.httpMethod !== "HEAD") {
    return { statusCode: 405, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Método no permitido" }) };
  }
  try {
    const datos = await fechasDelSalon();
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60",
        "Netlify-CDN-Cache-Control": "public, max-age=60, stale-while-revalidate=60",
      },
      body: JSON.stringify(datos),
    };
  } catch (e) {
    console.error("fechas:", e.message);
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ error: "No pudimos leer las fechas ocupadas.", fechas: [], detalle: [] }),
    };
  }
};
