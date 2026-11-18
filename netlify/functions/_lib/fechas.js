/* Fechas ocupadas guardadas en Supabase, con cache en memoria de 60 s
   (por instancia de la función). Las usan /api/fechas y crear-pago. */
const db = require("./supabase.js");

const TTL_MS = 60 * 1000;
let cache = null; // { hasta, datos }

/* Hoy en Argentina como "AAAA-MM-DD" (el servidor corre en UTC). */
function hoyIso(ahora) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ahora || new Date());
}

/* → { fechas: ["2026-12-12", …], detalle: [{ fecha, turno }, …] } */
async function fechasDelSalon(opciones) {
  opciones = opciones || {};
  if (!db.configurado()) return { fechas: [], detalle: [] };
  const ahora = Date.now();
  if (!opciones.sinCache && cache && cache.hasta > ahora) return cache.datos;
  const filas = await db.fechasOcupadas(hoyIso());
  const detalle = filas.map((f) => ({ fecha: String(f.fecha).slice(0, 10), turno: f.turno || "todo" }));
  const fechas = [...new Set(detalle.map((f) => f.fecha))];
  const datos = { fechas, detalle };
  cache = { hasta: ahora + TTL_MS, datos };
  return datos;
}

/* Copia de la config con las fechas de la base sumadas a config.fechasOcupadas. */
function configConFechas(config, fechas) {
  const union = [...new Set([...(config.fechasOcupadas || []), ...(fechas || [])])];
  return Object.assign({}, config, { fechasOcupadas: union });
}

function limpiarCache() {
  cache = null;
}

module.exports = { fechasDelSalon, configConFechas, hoyIso, limpiarCache };
