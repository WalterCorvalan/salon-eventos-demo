/* ══════════════════════════════════════════════════════════════
   Acceso mínimo a Supabase (PostgREST) con fetch, sin SDK.
   Usa la service role key: SOLO se llama desde funciones de Netlify.
   Variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SALON_ID.
   Si falta alguna, configurado() da false y las funciones siguen
   funcionando sin base de datos (como la plantilla original).
   ══════════════════════════════════════════════════════════════ */

function configurado() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SALON_ID);
}

function salonId() {
  return process.env.SALON_ID;
}

/* rest("senas?id=eq.x", { method, body, prefer }) → filas (array) o null */
async function rest(ruta, opciones) {
  opciones = opciones || {};
  const base = process.env.SUPABASE_URL.replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
  if (opciones.prefer) headers.Prefer = opciones.prefer;
  const res = await fetch(`${base}/rest/v1/${ruta}`, {
    method: opciones.method || "GET",
    headers,
    body: opciones.body === undefined ? undefined : JSON.stringify(opciones.body),
  });
  if (!res.ok) {
    let detalle = "";
    try {
      detalle = await res.text();
    } catch (e) {}
    throw new Error(`Supabase ${res.status} en ${ruta.split("?")[0]}: ${detalle.slice(0, 200)}`);
  }
  if (res.status === 204) return null;
  const texto = await res.text();
  return texto ? JSON.parse(texto) : null;
}

function insertar(tabla, filas, prefer) {
  return rest(tabla, { method: "POST", body: filas, prefer: prefer || "return=minimal" });
}

/* Fechas ocupadas desde hoy: [{ fecha: "2026-12-12", turno: "noche" }, …] */
async function fechasOcupadas(desdeIso) {
  const q = `fechas_ocupadas?select=fecha,turno&salon_id=eq.${encodeURIComponent(salonId())}` +
    `&fecha=gte.${encodeURIComponent(desdeIso)}&order=fecha.asc`;
  return (await rest(q)) || [];
}

/* Bloquea (fecha, turno). Si ya estaba bloqueada no hace nada (idempotente). */
function bloquearFecha(fecha, turno, motivo) {
  return rest("fechas_ocupadas?on_conflict=salon_id,fecha,turno", {
    method: "POST",
    body: { salon_id: salonId(), fecha, turno: turno || "todo", motivo: motivo || null },
    prefer: "resolution=ignore-duplicates,return=minimal",
  });
}

module.exports = { configurado, salonId, rest, insertar, fechasOcupadas, bloquearFecha };
