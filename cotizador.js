/* ══════════════════════════════════════════════════════════════
   COTIZADOR — cálculo puro del presupuesto.
   Sin DOM: se usa igual en el navegador (app.js) y en el servidor
   (netlify/functions/crear-pago.js), así el monto a cobrar nunca
   depende de lo que mande el navegador.

   seleccion = {
     espacio: "salon",
     fecha: "2026-12-12" | "",
     turno: "noche",
     personas: 60,
     items: { finger: 1, mozos: 3, barra_libre: 40 }   // id → cantidad
   }
   ══════════════════════════════════════════════════════════════ */
(function (raiz) {
  "use strict";

  function redondear(n) {
    return Math.round(Number(n) || 0);
  }

  function entero(n, min, max) {
    var v = parseInt(n, 10);
    if (!isFinite(v)) v = min;
    return Math.min(max, Math.max(min, v));
  }

  function formatoPesos(n) {
    return "$" + redondear(n).toLocaleString("es-AR");
  }

  /* "2026-12-12" → Date local (sin corrimiento de zona horaria) */
  function parseFecha(iso) {
    if (typeof iso !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
    var p = iso.split("-").map(Number);
    var d = new Date(p[0], p[1] - 1, p[2]);
    if (d.getFullYear() !== p[0] || d.getMonth() !== p[1] - 1 || d.getDate() !== p[2]) return null;
    return d;
  }

  function isoDe(d) {
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var dd = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + dd;
  }

  function fechaMinima(config, hoy) {
    var base = hoy ? new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()) : new Date();
    base.setHours(0, 0, 0, 0);
    base.setDate(base.getDate() + ((config.reglas && config.reglas.diasAnticipacionMin) || 0));
    return base;
  }

  function esOcupada(config, iso) {
    return (config.fechasOcupadas || []).indexOf(iso) !== -1;
  }

  function esFeriado(config, iso) {
    return ((config.reglas && config.reglas.feriados) || []).indexOf(iso) !== -1;
  }

  function esFinde(config, iso) {
    var d = parseFecha(iso);
    if (!d) return false;
    var dias = (config.reglas && config.reglas.diasFinde) || [5, 6, 0];
    return dias.indexOf(d.getDay()) !== -1 || esFeriado(config, iso);
  }

  /* Devuelve "" si la fecha se puede elegir, o el motivo si no. */
  function motivoFechaInvalida(config, iso, hoy) {
    var d = parseFecha(iso);
    if (!d) return "Elegí una fecha válida.";
    if (d < fechaMinima(config, hoy)) return "Esa fecha ya no se puede reservar online.";
    if (esOcupada(config, iso)) return "Esa fecha ya está reservada.";
    return "";
  }

  function buscarEspacio(config, id) {
    var lista = config.espacios || [];
    for (var i = 0; i < lista.length; i++) if (lista[i].id === id) return lista[i];
    return lista[0] || null;
  }

  function buscarTurno(espacio, id) {
    var lista = (espacio && espacio.turnos) || [];
    for (var i = 0; i < lista.length; i++) if (lista[i].id === id) return lista[i];
    return lista[0] || null;
  }

  function itemDisponible(item, espacioId) {
    return !item.espacios || item.espacios.indexOf(espacioId) !== -1;
  }

  /* Todos los ítems disponibles para un espacio, con su categoría. */
  function itemsDelEspacio(config, espacioId) {
    var out = [];
    (config.adicionales || []).forEach(function (cat) {
      (cat.items || []).forEach(function (item) {
        if (itemDisponible(item, espacioId)) out.push({ item: item, categoria: cat });
      });
    });
    return out;
  }

  /* Precio unitario de un ítem según turno (null si no tiene precio numérico). */
  function precioUnitario(item, turnoId) {
    var p = item.precio || { tipo: "incluido" };
    if (p.tipo === "por_turno") {
      var vals = p.valores || {};
      if (turnoId in vals) return redondear(vals[turnoId]);
      var claves = Object.keys(vals);
      return claves.length ? redondear(vals[claves[0]]) : 0;
    }
    if (p.tipo === "incluido" || p.tipo === "consultar") return null;
    return redondear(p.valor);
  }

  /* Cantidad máxima permitida para un ítem con contador. */
  function maximoCantidad(item, personas) {
    var p = item.precio || {};
    if (p.tipo === "por_persona_cantidad") return personas;
    if (p.tipo === "por_cantidad") return p.max || 20;
    return 1;
  }

  function usaContador(item) {
    var t = (item.precio || {}).tipo;
    return t === "por_cantidad" || t === "por_persona_cantidad";
  }

  /* Limpia la selección: espacio y turno válidos, invitados dentro del rango, ítems existentes. */
  function normalizar(config, sel) {
    sel = sel || {};
    var espacio = buscarEspacio(config, sel.espacio);
    if (!espacio) return null;
    var turno = buscarTurno(espacio, sel.turno);
    var personas = entero(sel.personas, espacio.min, espacio.max);
    var items = {};
    var entrada = sel.items || {};
    itemsDelEspacio(config, espacio.id).forEach(function (par) {
      var item = par.item;
      var cant = item.fijo ? 1 : entero(entrada[item.id], 0, maximoCantidad(item, personas));
      if (cant > 0) items[item.id] = cant;
    });
    return {
      espacio: espacio.id,
      fecha: parseFecha(sel.fecha) ? sel.fecha : "",
      turno: turno ? turno.id : "",
      personas: personas,
      items: items,
    };
  }

  function cotizar(config, seleccion) {
    var sel = normalizar(config, seleccion);
    if (!sel) return null;
    var espacio = buscarEspacio(config, sel.espacio);
    var turno = buscarTurno(espacio, sel.turno);
    var reglas = config.reglas || {};
    var finde = sel.fecha ? esFinde(config, sel.fecha) : false;
    var recargo = finde ? (reglas.recargoFindePct || 0) / 100 : 0;
    var lineas = [];

    /* 1) Alquiler del espacio */
    var valorTurno = redondear(turno ? turno.valor : 0);
    var modelo = (espacio.precio && espacio.precio.modelo) || "por_persona";
    var alquiler;
    var detalleAlquiler;
    if (modelo === "fijo") {
      alquiler = redondear(valorTurno * (1 + recargo));
      detalleAlquiler = "alquiler " + (turno ? turno.nombre.toLowerCase() : "");
    } else {
      var pp = redondear(valorTurno * (1 + recargo));
      alquiler = pp * sel.personas;
      detalleAlquiler = sel.personas + " invitados × " + formatoPesos(pp);
    }
    lineas.push({
      id: "alquiler",
      nombre: espacio.nombre + (turno ? " · " + turno.nombre : ""),
      detalle: detalleAlquiler + (finde && recargo ? ", con +" + reglas.recargoFindePct + "% fin de semana" : ""),
      monto: alquiler,
    });

    /* 2) Adicionales */
    itemsDelEspacio(config, espacio.id).forEach(function (par) {
      var item = par.item;
      var cant = sel.items[item.id];
      if (!cant) return;
      var tipo = (item.precio || {}).tipo || "incluido";
      var unit = precioUnitario(item, turno && turno.id);
      var linea = { id: item.id, nombre: item.nombre, detalle: "", monto: 0, categoria: par.categoria.id };
      if (tipo === "incluido") {
        linea.incluido = true;
      } else if (tipo === "consultar") {
        linea.consultar = true;
      } else if (tipo === "por_persona") {
        linea.monto = unit * sel.personas;
        linea.detalle = sel.personas + " × " + formatoPesos(unit);
      } else if (tipo === "por_persona_cantidad") {
        linea.monto = unit * cant;
        linea.detalle = cant + " invitados × " + formatoPesos(unit);
      } else if (tipo === "por_cantidad") {
        var unidad = item.precio.unidad || "unidad";
        linea.monto = unit * cant;
        linea.detalle = cant + " " + unidad + (cant > 1 ? (/[aeiouáéó]$/i.test(unidad) ? "s" : "es") : "") + " × " + formatoPesos(unit);
      } else if (tipo === "por_turno") {
        linea.monto = unit;
        linea.detalle = turno ? turno.nombre.toLowerCase() : "";
      } else {
        linea.monto = unit;
      }
      lineas.push(linea);
    });

    var subtotal = lineas.reduce(function (s, l) {
      return s + l.monto;
    }, 0);

    /* 3) Combos */
    var combos = [];
    (config.combos || []).forEach(function (combo) {
      var todos = combo.items.every(function (id) {
        return sel.items[id];
      });
      if (!todos) return;
      var suma = lineas
        .filter(function (l) {
          return combo.items.indexOf(l.id) !== -1;
        })
        .reduce(function (s, l) {
          return s + l.monto;
        }, 0);
      var descuento = suma - redondear(combo.precio);
      if (descuento > 0) combos.push({ id: combo.id, nombre: combo.nombre, descuento: descuento, precio: redondear(combo.precio) });
    });
    var descuentos = combos.reduce(function (s, c) {
      return s + c.descuento;
    }, 0);

    /* 4) Mínimo */
    var total = subtotal - descuentos;
    var minimoAplicado = false;
    if (reglas.minimoCobro && total < reglas.minimoCobro) {
      total = redondear(reglas.minimoCobro);
      minimoAplicado = true;
    }

    /* 5) Seña y cuotas */
    var pagos = config.pagos || {};
    var pct = pagos.sena && pagos.sena.porcentaje ? pagos.sena.porcentaje : 0;
    var sena = redondear((total * pct) / 100);
    var resto = total - sena;
    var nCuotas = pagos.cuotas || 0;

    return {
      seleccion: sel,
      espacio: espacio,
      turno: turno,
      esFinde: finde,
      esFeriado: sel.fecha ? esFeriado(config, sel.fecha) : false,
      lineas: lineas,
      subtotal: subtotal,
      combos: combos,
      minimoAplicado: minimoAplicado,
      total: total,
      hayConsultar: lineas.some(function (l) {
        return l.consultar;
      }),
      senaPorcentaje: pct,
      sena: sena,
      resto: resto,
      cuotas: nCuotas,
      valorCuota: nCuotas > 0 ? redondear(resto / nCuotas) : 0,
    };
  }

  /* Texto del presupuesto para WhatsApp. */
  function mensajeWhatsApp(config, r) {
    var m = config.marca || {};
    var sel = r.seleccion;
    var t = "¡Hola! Armé mi presupuesto en la web de " + m.nombre + ".\n\n";
    t += "📍 *Espacio:* " + r.espacio.nombre + "\n";
    if (sel.fecha) {
      var p = sel.fecha.split("-");
      t += "🗓️ *Fecha:* " + p[2] + "/" + p[1] + "/" + p[0] + (r.esFinde ? " (fin de semana/feriado)" : "") + "\n";
    } else {
      t += "🗓️ *Fecha:* a definir\n";
    }
    if (r.turno) t += "⏰ *Turno:* " + r.turno.nombre + " (" + r.turno.horario + ")\n";
    t += "👥 *Invitados:* " + sel.personas + "\n\n*Detalle:*\n";
    r.lineas.forEach(function (l) {
      var precio = l.consultar ? "a consultar" : l.incluido ? "incluido" : formatoPesos(l.monto);
      t += "• " + l.nombre + (l.detalle ? " (" + l.detalle + ")" : "") + ": " + precio + "\n";
    });
    r.combos.forEach(function (c) {
      t += "🎁 " + c.nombre + ": -" + formatoPesos(c.descuento) + "\n";
    });
    t += "\n💰 *Total estimado: " + formatoPesos(r.total) + "*";
    if (r.hayConsultar) t += " + ítems a consultar";
    t += "\n";
    if (r.sena > 0) {
      t += "💳 Seña " + r.senaPorcentaje + "%: " + formatoPesos(r.sena);
      if (r.cuotas > 0 && r.resto > 0) t += " + " + r.cuotas + " cuotas de " + formatoPesos(r.valorCuota);
      t += "\n";
    }
    if (m.aliasTransferencia) t += "🏦 Alias para transferir la seña: " + m.aliasTransferencia + "\n";
    t += "\n¿Me confirman disponibilidad? ¡Gracias!";
    return t;
  }

  var api = {
    cotizar: cotizar,
    normalizar: normalizar,
    mensajeWhatsApp: mensajeWhatsApp,
    motivoFechaInvalida: motivoFechaInvalida,
    fechaMinima: fechaMinima,
    esFinde: esFinde,
    esFeriado: esFeriado,
    esOcupada: esOcupada,
    parseFecha: parseFecha,
    isoDe: isoDe,
    formatoPesos: formatoPesos,
    precioUnitario: precioUnitario,
    itemsDelEspacio: itemsDelEspacio,
    maximoCantidad: maximoCantidad,
    usaContador: usaContador,
    buscarEspacio: buscarEspacio,
    buscarTurno: buscarTurno,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else raiz.Cotizador = api;
})(typeof window !== "undefined" ? window : this);
