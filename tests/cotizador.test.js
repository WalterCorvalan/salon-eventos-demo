const test = require("node:test");
const assert = require("node:assert/strict");
const config = require("../config.js");
const Q = require("../cotizador.js");

const base = { espacio: "salon", fecha: "", turno: "dia", personas: 50, items: {} };
const sel = (extra) => Object.assign({}, base, extra, { items: Object.assign({}, extra && extra.items) });

test("alquiler por persona en día de semana", () => {
  const r = Q.cotizar(config, sel({ fecha: "2026-12-02" })); // miércoles
  assert.equal(r.esFinde, false);
  assert.equal(r.lineas[0].monto, 12000 * 50);
  assert.equal(r.total, 600000 + 0); // metegol incluido
});

test("recargo de fin de semana (+10%) solo sobre el alquiler", () => {
  const r = Q.cotizar(config, sel({ fecha: "2026-12-05", items: { foto: 1 } })); // sábado
  assert.equal(r.esFinde, true);
  assert.equal(r.lineas[0].monto, 13200 * 50);
  assert.equal(r.total, 13200 * 50 + 400000);
});

test("los feriados cuentan como fin de semana", () => {
  assert.equal(Q.esFinde(config, "2026-12-08"), true); // martes feriado
  assert.equal(Q.esFeriado(config, "2026-12-08"), true);
});

test("alquiler fijo no depende de los invitados", () => {
  const a = Q.cotizar(config, sel({ espacio: "terraza", turno: "tarde", personas: 10, fecha: "2026-12-02" }));
  const b = Q.cotizar(config, sel({ espacio: "terraza", turno: "tarde", personas: 30, fecha: "2026-12-02" }));
  assert.equal(a.lineas[0].monto, 250000);
  assert.equal(b.lineas[0].monto, 250000);
});

test("invitados se ajustan al mínimo y máximo del espacio", () => {
  assert.equal(Q.cotizar(config, sel({ personas: 5 })).seleccion.personas, 30);
  assert.equal(Q.cotizar(config, sel({ personas: 999 })).seleccion.personas, 80);
});

test("turno inexistente cae en el primero del espacio", () => {
  const r = Q.cotizar(config, sel({ espacio: "terraza", turno: "dia" }));
  assert.equal(r.turno.id, "tarde");
});

test("tipos de precio: por persona, por cantidad, por persona con contador, por turno", () => {
  const r = Q.cotizar(config, sel({ turno: "noche", items: { finger: 1, mozos: 3, barra_libre: 20, dj: 1 } }));
  const monto = (id) => r.lineas.find((l) => l.id === id).monto;
  assert.equal(monto("finger"), 9000 * 50);
  assert.equal(monto("mozos"), 60000 * 3);
  assert.equal(monto("barra_libre"), 14000 * 20);
  assert.equal(monto("dj"), 550000);
});

test("contadores no superan su máximo", () => {
  const r = Q.cotizar(config, sel({ items: { mozos: 50, barra_libre: 500 } }));
  assert.equal(r.seleccion.items.mozos, 10);
  assert.equal(r.seleccion.items.barra_libre, 50);
});

test("ítems limitados a un espacio no se cobran en otro", () => {
  const r = Q.cotizar(config, sel({ espacio: "salon", items: { asado: 1, inflable: 1 } }));
  assert.equal(r.lineas.some((l) => l.id === "asado" || l.id === "inflable"), false);
  const p = Q.cotizar(config, sel({ espacio: "parque", personas: 60, items: { asado: 1 } }));
  assert.equal(p.lineas.find((l) => l.id === "asado").monto, 22000 * 60);
});

test("a consultar no suma al total y se marca", () => {
  const r = Q.cotizar(config, sel({ items: { mesa_dulce: 1 } }));
  assert.equal(r.hayConsultar, true);
  assert.equal(r.total, 12000 * 50);
});

test("combo DJ + Fotógrafo cobra el precio especial", () => {
  const r = Q.cotizar(config, sel({ turno: "noche", items: { dj: 1, foto: 1 } }));
  assert.equal(r.combos.length, 1);
  assert.equal(r.combos[0].descuento, 550000 + 400000 - 800000);
  assert.equal(r.total, 16000 * 50 + 800000);
});

test("seña y cuotas", () => {
  const r = Q.cotizar(config, sel({ fecha: "2026-12-02" }));
  assert.equal(r.sena, Math.round(600000 * 0.2));
  assert.equal(r.valorCuota, Math.round((600000 - r.sena) / 3));
});

test("mínimo de cobro", () => {
  const c = JSON.parse(JSON.stringify(config));
  c.reglas.minimoCobro = 2000000;
  const r = Q.cotizar(c, sel({}));
  assert.equal(r.total, 2000000);
  assert.equal(r.minimoAplicado, true);
});

test("fechas: ocupadas, pasadas e inválidas", () => {
  const hoy = new Date(2026, 10, 18);
  assert.equal(Q.motivoFechaInvalida(config, "2026-11-28", hoy), "Esa fecha ya está reservada.");
  assert.match(Q.motivoFechaInvalida(config, "2026-11-19", hoy), /ya no se puede/); // < 2 días de anticipación
  assert.match(Q.motivoFechaInvalida(config, "2026-02-30", hoy), /válida/);
  assert.equal(Q.motivoFechaInvalida(config, "2026-12-02", hoy), "");
});

test("mensaje de WhatsApp incluye total, fecha y alias", () => {
  const r = Q.cotizar(config, sel({ fecha: "2026-12-02", items: { foto: 1 } }));
  const m = Q.mensajeWhatsApp(config, r);
  assert.match(m, /02\/12\/2026/);
  assert.match(m, /Fotógrafo/);
  assert.match(m, new RegExp(config.marca.aliasTransferencia));
  assert.match(m, /Total estimado/);
});

test("la config de la demo es coherente", () => {
  const ids = new Set();
  config.espacios.forEach((e) => {
    assert.ok(e.min <= e.max, e.id);
    assert.ok(e.turnos.length > 0, e.id);
  });
  config.adicionales.forEach((c) =>
    c.items.forEach((i) => {
      assert.ok(!ids.has(i.id), "id repetido " + i.id);
      ids.add(i.id);
      (i.espacios || []).forEach((e) => assert.ok(config.espacios.some((x) => x.id === e), "espacio inexistente " + e));
    })
  );
  config.combos.forEach((c) => c.items.forEach((id) => assert.ok(ids.has(id), "combo con ítem inexistente " + id)));
});
