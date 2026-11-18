const test = require("node:test");
const assert = require("node:assert/strict");
const { handler } = require("../netlify/functions/crear-pago.js");
const config = require("../config.js");
const Q = require("../cotizador.js");

function fechaLibre() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  while (Q.esOcupada(config, Q.isoDe(d))) d.setDate(d.getDate() + 1);
  return Q.isoDe(d);
}
const evento = (body) => ({ httpMethod: "POST", headers: { host: "demo.test" }, body: JSON.stringify(body) });

test("sin token responde sin_token", async () => {
  delete process.env.MP_ACCESS_TOKEN;
  const r = await handler(evento({ seleccion: { espacio: "salon", fecha: fechaLibre(), personas: 40 } }));
  assert.equal(r.statusCode, 503);
  assert.equal(JSON.parse(r.body).codigo, "sin_token");
});

test("rechaza fecha ocupada", async () => {
  process.env.MP_ACCESS_TOKEN = "TEST";
  const r = await handler(evento({ seleccion: { espacio: "salon", fecha: config.fechasOcupadas.at(-1), personas: 40 } }));
  assert.equal(r.statusCode, 400);
});

test("cobra la seña recalculada en el servidor, ignorando montos del navegador", async () => {
  process.env.MP_ACCESS_TOKEN = "TEST";
  let enviado;
  global.fetch = async (url, opts) => {
    enviado = JSON.parse(opts.body);
    return { ok: true, json: async () => ({ init_point: "https://mp.test/pagar" }) };
  };
  const seleccion = { espacio: "salon", fecha: fechaLibre(), turno: "noche", personas: 40, items: { foto: 1 }, total: 1 };
  const r = await handler(evento({ seleccion, total: 1, sena: 1 }));
  assert.equal(r.statusCode, 200);
  const esperado = Q.cotizar(config, seleccion).sena;
  assert.equal(enviado.items[0].unit_price, esperado);
  assert.ok(esperado > 1000);
  assert.match(enviado.back_urls.success, /pago=approved/);
});

test("solo acepta POST", async () => {
  const r = await handler({ httpMethod: "GET", headers: {} });
  assert.equal(r.statusCode, 405);
});
