/* Tests de las funciones con Supabase y Mercado Pago (fetch simulado). */
const test = require("node:test");
const assert = require("node:assert/strict");
const config = require("../config.js");
const Q = require("../cotizador.js");
const fechas = require("../netlify/functions/fechas.js");
const consulta = require("../netlify/functions/consulta.js");
const crearPago = require("../netlify/functions/crear-pago.js");
const webhook = require("../netlify/functions/mp-webhook.js");
const libFechas = require("../netlify/functions/_lib/fechas.js");

const SB = "https://sb.test";

function conBase() {
  process.env.SUPABASE_URL = SB + "/";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
  process.env.SALON_ID = "aurora";
  process.env.MP_ACCESS_TOKEN = "TEST";
  process.env.URL = "https://aurora.test";
  libFechas.limpiarCache();
}
function sinBase() {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SALON_ID;
  libFechas.limpiarCache();
}

function respuesta(status, datos) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => datos,
    text: async () => (datos === undefined ? "" : JSON.stringify(datos)),
  };
}

/* rutas: [[método, regex de URL, (url, opts, body) => respuesta]] — guarda las llamadas. */
function simularFetch(rutas) {
  const llamadas = [];
  global.fetch = async (url, opts) => {
    opts = opts || {};
    const metodo = opts.method || "GET";
    const body = opts.body ? JSON.parse(opts.body) : undefined;
    llamadas.push({ url, metodo, body, headers: opts.headers || {} });
    for (const [m, re, fn] of rutas) if (m === metodo && re.test(url)) return fn(url, opts, body);
    throw new Error(`fetch no esperado: ${metodo} ${url}`);
  };
  return llamadas;
}

function fechaLibre(dias) {
  const d = new Date();
  d.setDate(d.getDate() + (dias || 40));
  while (Q.esOcupada(config, Q.isoDe(d))) d.setDate(d.getDate() + 1);
  return Q.isoDe(d);
}
const post = (body, extra) => Object.assign({ httpMethod: "POST", headers: { host: "aurora.test" }, body: JSON.stringify(body) }, extra);

/* ══════════ /api/fechas ══════════ */

test("fechas: sin Supabase devuelve listas vacías", async () => {
  sinBase();
  const r = await fechas.handler({ httpMethod: "GET" });
  assert.equal(r.statusCode, 200);
  assert.deepEqual(JSON.parse(r.body), { fechas: [], detalle: [] });
});

test("fechas: lee del salón desde hoy, agrupa por día y cachea 60 s", async () => {
  conBase();
  const llamadas = simularFetch([
    ["GET", /\/rest\/v1\/fechas_ocupadas\?/, () => respuesta(200, [
      { fecha: "2027-03-06", turno: "dia" },
      { fecha: "2027-03-06", turno: "noche" },
      { fecha: "2027-03-13", turno: "todo" },
    ])],
  ]);
  const r = await fechas.handler({ httpMethod: "GET" });
  assert.equal(r.statusCode, 200);
  assert.match(r.headers["Cache-Control"], /max-age=60/);
  const datos = JSON.parse(r.body);
  assert.deepEqual(datos.fechas, ["2027-03-06", "2027-03-13"]);
  assert.equal(datos.detalle.length, 3);

  const u = new URL(llamadas[0].url);
  assert.equal(u.origin + u.pathname, SB + "/rest/v1/fechas_ocupadas");
  assert.equal(u.searchParams.get("salon_id"), "eq.aurora");
  assert.equal(u.searchParams.get("fecha"), "gte." + libFechas.hoyIso());
  assert.equal(llamadas[0].headers.apikey, "service-key");

  await fechas.handler({ httpMethod: "GET" });
  assert.equal(llamadas.length, 1, "la segunda lectura sale del cache");
});

test("fechas: si Supabase falla responde 502 sin cachear", async () => {
  conBase();
  simularFetch([["GET", /fechas_ocupadas/, () => respuesta(500, { message: "caído" })]]);
  const r = await fechas.handler({ httpMethod: "GET" });
  assert.equal(r.statusCode, 502);
  assert.equal(r.headers["Cache-Control"], "no-store");
});

test("fechas: solo GET", async () => {
  const r = await fechas.handler({ httpMethod: "POST" });
  assert.equal(r.statusCode, 405);
});

/* ══════════ /api/consulta ══════════ */

test("consulta: sin Supabase no guarda y no falla", async () => {
  sinBase();
  const r = await consulta.handler(post({ seleccion: { espacio: "salon", personas: 40 } }));
  assert.equal(r.statusCode, 202);
  assert.equal(JSON.parse(r.body).codigo, "sin_base");
});

test("consulta: guarda la selección normalizada y el total recalculado", async () => {
  conBase();
  const llamadas = simularFetch([["POST", /\/rest\/v1\/consultas$/, () => respuesta(201)]]);
  const seleccion = { espacio: "salon", fecha: fechaLibre(), turno: "noche", personas: 9999, items: { foto: 1, inventado: 3 }, total: 1 };
  const r = await consulta.handler(post({ seleccion, total: 1 }));
  assert.equal(r.statusCode, 201);
  const fila = llamadas[0].body;
  const esperado = Q.cotizar(config, seleccion);
  assert.equal(fila.salon_id, "aurora");
  assert.equal(fila.canal, "whatsapp");
  assert.equal(fila.total, esperado.total);
  assert.ok(fila.total > 1);
  assert.deepEqual(fila.seleccion, esperado.seleccion);
  assert.equal(fila.seleccion.items.inventado, undefined);
});

test("consulta: si Supabase falla responde 502", async () => {
  conBase();
  simularFetch([["POST", /consultas/, () => respuesta(500, {})]]);
  const r = await consulta.handler(post({ seleccion: { espacio: "salon", personas: 40 } }));
  assert.equal(r.statusCode, 502);
});

test("consulta: rechaza datos inválidos, demasiado grandes o sin POST", async () => {
  conBase();
  assert.equal((await consulta.handler({ httpMethod: "POST", body: "{no" })).statusCode, 400);
  assert.equal((await consulta.handler(post({}))).statusCode, 400);
  assert.equal((await consulta.handler({ httpMethod: "POST", body: "x".repeat(20000) })).statusCode, 413);
  assert.equal((await consulta.handler({ httpMethod: "GET" })).statusCode, 405);
});

/* ══════════ crear-pago con Supabase ══════════ */

function rutasPago(extra) {
  return [
    ["GET", /fechas_ocupadas/, () => respuesta(200, extra && extra.ocupadas ? extra.ocupadas : [])],
    ["POST", /api\.mercadopago\.com\/checkout\/preferences/, () => respuesta(201, { id: "pref-123", init_point: "https://mp.test/pagar" })],
    ["POST", /\/rest\/v1\/senas$/, () => respuesta(extra && extra.falloSenas ? 500 : 201)],
    ["POST", /\/rest\/v1\/consultas$/, () => respuesta(201)],
  ];
}

test("crear-pago: rechaza una fecha bloqueada en la base", async () => {
  conBase();
  const fecha = fechaLibre();
  const llamadas = simularFetch(rutasPago({ ocupadas: [{ fecha, turno: "noche" }] }));
  const r = await crearPago.handler(post({ seleccion: { espacio: "salon", fecha, turno: "dia", personas: 40 } }));
  assert.equal(r.statusCode, 400);
  assert.match(JSON.parse(r.body).error, /reservada/);
  assert.ok(!llamadas.some((l) => /mercadopago/.test(l.url)));
});

test("crear-pago: guarda la seña pendiente, la consulta y pasa notification_url", async () => {
  conBase();
  const llamadas = simularFetch(rutasPago());
  const seleccion = { espacio: "salon", fecha: fechaLibre(), turno: "noche", personas: 40, items: { foto: 1 } };
  const r = await crearPago.handler(post({ seleccion }, { headers: { host: "aurora.test", origin: "https://malo.test" } }));
  assert.equal(r.statusCode, 200);
  const esperado = Q.cotizar(config, seleccion);

  const pref = llamadas.find((l) => /preferences/.test(l.url)).body;
  assert.equal(pref.notification_url, "https://aurora.test/api/mp-webhook?source_news=webhooks");
  assert.match(pref.external_reference, /^[0-9a-f-]{36}$/);
  assert.equal(pref.metadata.sena_id, pref.external_reference);
  assert.equal(pref.metadata.salon_id, "aurora");

  const sena = llamadas.find((l) => /\/senas$/.test(l.url)).body;
  assert.equal(sena.id, pref.external_reference);
  assert.equal(sena.estado, "pendiente");
  assert.equal(sena.mp_preference_id, "pref-123");
  assert.equal(sena.monto, esperado.sena);
  assert.deepEqual(sena.seleccion, esperado.seleccion);

  const cons = llamadas.find((l) => /\/consultas$/.test(l.url)).body;
  assert.equal(cons.canal, "sena");
  assert.equal(cons.total, esperado.total);
});

test("crear-pago: si no se puede guardar la seña, igual devuelve el link de pago", async () => {
  conBase();
  simularFetch(rutasPago({ falloSenas: true }));
  const r = await crearPago.handler(post({ seleccion: { espacio: "salon", fecha: fechaLibre(), turno: "noche", personas: 40 } }));
  assert.equal(r.statusCode, 200);
  assert.equal(JSON.parse(r.body).init_point, "https://mp.test/pagar");
});

test("crear-pago: sin Supabase funciona como antes (sin tocar la base)", async () => {
  sinBase();
  process.env.MP_ACCESS_TOKEN = "TEST";
  const llamadas = simularFetch(rutasPago());
  const r = await crearPago.handler(post({ seleccion: { espacio: "salon", fecha: fechaLibre(), turno: "noche", personas: 40 } }));
  assert.equal(r.statusCode, 200);
  assert.deepEqual(llamadas.map((l) => new URL(l.url).host), ["api.mercadopago.com"]);
});

/* ══════════ mp-webhook ══════════ */

const SENA_ID = "3f2b8c1e-5a4d-4e6f-9a7b-1c2d3e4f5a6b";

function pagoMp(extra) {
  return Object.assign(
    { id: 987, status: "approved", transaction_amount: 200000, external_reference: SENA_ID, metadata: { sena_id: SENA_ID, salon_id: "aurora" } },
    extra
  );
}

function rutasWebhook(op) {
  op = op || {};
  return [
    ["GET", /api\.mercadopago\.com\/v1\/payments\/987$/, () => (op.mpError ? respuesta(500, {}) : respuesta(200, op.pago || pagoMp()))],
    ["GET", /\/rest\/v1\/senas\?/, () => respuesta(200, op.filas || [
      { id: SENA_ID, estado: op.estadoPrevio || "pendiente", monto: 200000, seleccion: { espacio: "salon", fecha: "2027-03-20", turno: "noche", personas: 40, items: {} } },
    ])],
    ["PATCH", /\/rest\/v1\/senas\?/, () => respuesta(204)],
    ["POST", /\/rest\/v1\/senas$/, () => respuesta(201)],
    ["POST", /\/rest\/v1\/fechas_ocupadas\?on_conflict=salon_id,fecha,turno$/, () => respuesta(201)],
  ];
}
const aviso = { type: "payment", action: "payment.updated", data: { id: "987" } };

test("webhook: pago aprobado → consulta MP, marca la seña aprobada y bloquea la fecha", async () => {
  conBase();
  const llamadas = simularFetch(rutasWebhook());
  const r = await webhook.handler(post(aviso));
  assert.equal(r.statusCode, 200);
  assert.deepEqual(JSON.parse(r.body), { ok: true, estado: "aprobada", bloqueada: true });

  const mp = llamadas.find((l) => /payments\/987/.test(l.url));
  assert.equal(mp.headers.Authorization, "Bearer TEST");

  const get = new URL(llamadas.find((l) => l.metodo === "GET" && /senas/.test(l.url)).url);
  assert.equal(get.searchParams.get("id"), "eq." + SENA_ID);
  assert.equal(get.searchParams.get("salon_id"), "eq.aurora");

  const patch = llamadas.find((l) => l.metodo === "PATCH");
  assert.deepEqual(patch.body, { estado: "aprobada", mp_payment_id: "987" });

  const bloqueo = llamadas.find((l) => /fechas_ocupadas/.test(l.url));
  assert.equal(bloqueo.body.salon_id, "aurora");
  assert.equal(bloqueo.body.fecha, "2027-03-20");
  assert.equal(bloqueo.body.turno, "noche");
  assert.match(bloqueo.headers.Prefer, /ignore-duplicates/);
});

test("webhook: acepta el formato IPN (?topic=payment&id=…)", async () => {
  conBase();
  simularFetch(rutasWebhook());
  const r = await webhook.handler({ httpMethod: "POST", queryStringParameters: { topic: "payment", id: "987" }, body: "" });
  assert.equal(JSON.parse(r.body).bloqueada, true);
});

test("webhook: no confía en el aviso, si MP dice 'pendiente' no bloquea", async () => {
  conBase();
  const llamadas = simularFetch(rutasWebhook({ pago: pagoMp({ status: "in_process" }) }));
  const r = await webhook.handler(post({ type: "payment", data: { id: "987" }, status: "approved" }));
  assert.equal(JSON.parse(r.body).estado, "pendiente");
  assert.ok(!llamadas.some((l) => /fechas_ocupadas/.test(l.url)));
});

test("webhook: rechazado marca 'rechazada', pero no pisa una seña ya aprobada", async () => {
  conBase();
  let llamadas = simularFetch(rutasWebhook({ pago: pagoMp({ status: "rejected" }) }));
  await webhook.handler(post(aviso));
  assert.equal(llamadas.find((l) => l.metodo === "PATCH").body.estado, "rechazada");

  llamadas = simularFetch(rutasWebhook({ pago: pagoMp({ status: "rejected" }), estadoPrevio: "aprobada" }));
  await webhook.handler(post(aviso));
  assert.equal(llamadas.find((l) => l.metodo === "PATCH").body.estado, "aprobada");
});

test("webhook: si la seña no estaba guardada la crea con la metadata de MP", async () => {
  conBase();
  const fecha = fechaLibre();
  const pago = pagoMp({ metadata: { sena_id: SENA_ID, salon_id: "aurora", sena: 150000, seleccion: { espacio: "salon", fecha, turno: "dia", personas: 50 } }, transaction_amount: 150000 });
  const llamadas = simularFetch(rutasWebhook({ pago, filas: [] }));
  const r = await webhook.handler(post(aviso));
  assert.equal(JSON.parse(r.body).bloqueada, true);
  const alta = llamadas.find((l) => l.metodo === "POST" && /\/senas$/.test(l.url)).body;
  assert.equal(alta.id, SENA_ID);
  assert.equal(alta.estado, "aprobada");
  assert.equal(alta.monto, 150000);
  assert.equal(alta.seleccion.fecha, fecha);
  assert.equal(llamadas.find((l) => /fechas_ocupadas/.test(l.url)).body.turno, "dia");
});

test("webhook: si se pagó menos que la seña no bloquea la fecha", async () => {
  conBase();
  const llamadas = simularFetch(rutasWebhook({ pago: pagoMp({ transaction_amount: 10 }) }));
  const r = await webhook.handler(post(aviso));
  assert.equal(JSON.parse(r.body).bloqueada, false);
  assert.ok(!llamadas.some((l) => /fechas_ocupadas/.test(l.url)));
});

test("webhook: ignora avisos que no son pagos, pagos ajenos y de otro salón", async () => {
  conBase();
  let llamadas = simularFetch([]);
  let r = await webhook.handler(post({ type: "merchant_order", data: { id: "1" } }));
  assert.equal(r.statusCode, 200);
  assert.equal(llamadas.length, 0);

  r = await webhook.handler(post({ type: "payment", data: { id: "../senas" } }));
  assert.equal(r.statusCode, 200);
  assert.equal(llamadas.length, 0);

  llamadas = simularFetch(rutasWebhook({ pago: pagoMp({ external_reference: "venta-local", metadata: {} }) }));
  r = await webhook.handler(post(aviso));
  assert.match(JSON.parse(r.body).ignorado, /ajeno/);
  assert.equal(llamadas.length, 1);

  simularFetch(rutasWebhook({ pago: pagoMp({ metadata: { sena_id: SENA_ID, salon_id: "otro" } }) }));
  r = await webhook.handler(post(aviso));
  assert.match(JSON.parse(r.body).ignorado, /otro salón/);
});

test("webhook: errores transitorios devuelven 5xx para que MP reintente", async () => {
  conBase();
  simularFetch(rutasWebhook({ mpError: true }));
  assert.equal((await webhook.handler(post(aviso))).statusCode, 502);

  const rutas = rutasWebhook();
  rutas[1] = ["GET", /\/rest\/v1\/senas\?/, () => respuesta(500, {})];
  simularFetch(rutas);
  assert.equal((await webhook.handler(post(aviso))).statusCode, 500);
});

test("webhook: estados de Mercado Pago → estados de la seña", () => {
  assert.equal(webhook.estadoSena("approved"), "aprobada");
  assert.equal(webhook.estadoSena("rejected"), "rechazada");
  assert.equal(webhook.estadoSena("cancelled"), "rechazada");
  assert.equal(webhook.estadoSena("refunded"), "devuelta");
  assert.equal(webhook.estadoSena("charged_back"), "devuelta");
  assert.equal(webhook.estadoSena("in_process"), "pendiente");
});

test("helper: configConFechas suma sin duplicar ni tocar la config original", () => {
  const antes = config.fechasOcupadas.slice();
  const c = libFechas.configConFechas(config, [antes[0], "2030-01-05"]);
  assert.equal(c.fechasOcupadas.length, antes.length + 1);
  assert.deepEqual(config.fechasOcupadas, antes);
  assert.equal(Q.motivoFechaInvalida(c, "2030-01-05", new Date()), "Esa fecha ya está reservada.");
});
