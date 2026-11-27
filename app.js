/* ══════════════════════════════════════════════════════════════
   APP — arma la página desde config.js y maneja el cotizador.
   No contiene datos de ningún cliente: todo sale de SALON_CONFIG.
   ══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  /* global SALON_CONFIG */
  var C = typeof SALON_CONFIG !== "undefined" ? SALON_CONFIG : window.SALON_CONFIG;
  var Q = window.Cotizador;
  var $ = function (id) {
    return document.getElementById(id);
  };
  var pesos = Q.formatoPesos;
  var ico = window.icono || function (n) { return esc(n); };
  var MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  var DIAS = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];
  var DIAS_LARGOS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function guardar(clave, valor) {
    try {
      localStorage.setItem(clave, valor);
    } catch (e) {}
  }
  function leer(clave) {
    try {
      return localStorage.getItem(clave);
    } catch (e) {
      return null;
    }
  }

  function linkWa(numero, texto) {
    return "https://wa.me/" + encodeURIComponent(numero) + (texto ? "?text=" + encodeURIComponent(texto) : "");
  }

  /* ── Estado ── */
  var espacio0 = C.espacios[0];
  var sel = {
    espacio: espacio0.id,
    fecha: "",
    turno: espacio0.turnos[0].id,
    personas: espacio0.min,
    items: {},
  };
  Q.itemsDelEspacio(C, espacio0.id).forEach(function (p) {
    if (p.item.preseleccionado) sel.items[p.item.id] = 1;
  });
  var hoy = new Date();
  var minFecha = Q.fechaMinima(C, hoy);
  var mesVisible = new Date(minFecha.getFullYear(), minFecha.getMonth(), 1);
  var resultado = null;

  /* ══════════ Tema y marca ══════════ */
  function aplicarTema(tema) {
    var validos = ["claro", "oscuro", "elegante"];
    if (validos.indexOf(tema) === -1) tema = "claro";
    document.documentElement.setAttribute("data-tema", tema);
    var colores = (C.marca && C.marca.colores) || {};
    Object.keys(colores).forEach(function (k) {
      document.documentElement.style.setProperty("--" + k, colores[k]);
    });
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", getComputedStyle(document.documentElement).getPropertyValue("--primario").trim());
    document.querySelectorAll("[data-tema-btn]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-tema-btn") === tema));
    });
  }

  function iniciarMarca() {
    var m = C.marca;
    document.title = m.seo.titulo;
    var setMeta = function (sel, val) {
      var el = document.querySelector(sel);
      if (el) el.setAttribute("content", val);
    };
    setMeta('meta[name="description"]', m.seo.descripcion);
    setMeta('meta[property="og:title"]', m.seo.titulo);
    setMeta('meta[property="og:description"]', m.seo.descripcion);

    $("nav-logo").innerHTML =
      (m.logo ? '<img src="' + esc(m.logo) + '" alt="" class="logo-img">' : '<span class="logo-emoji">' + ico(m.logoEmoji || "sparkles") + "</span>") +
      "<span>" + esc(m.nombre) + "</span>";

    var h = m.hero;
    $("hero-etiqueta").innerHTML = ico("map-pin") + "<span>" + esc(h.etiqueta) + "</span>";
    renderHeroDatos();
    $("hero-titulo").innerHTML = esc(h.titulo) + "<br><em>" + esc(h.tituloDestacado) + "</em>";
    $("hero-texto").textContent = h.texto;
    if (h.imagen) $("hero-fondo").style.backgroundImage = "url('" + h.imagen.replace(/'/g, "%27") + "')";

    $("porque-grid").innerHTML = (m.porQue || [])
      .map(function (p) {
        return '<div class="porque-item"><span class="porque-icono">' + ico(p.icono) + "</span><h3>" + esc(p.titulo) + "</h3><p>" + esc(p.texto) + "</p></div>";
      })
      .join("");

    $("ubicacion-direccion").textContent = m.direccion;
    if (m.mapaQuery) {
      $("mapa").innerHTML =
        '<iframe title="Mapa de ' + esc(m.nombre) + '" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://maps.google.com/maps?q=' +
        encodeURIComponent(m.mapaQuery) + '&z=14&output=embed&hl=es"></iframe>';
    } else {
      $("ubicacion").hidden = true;
    }

    if (m.instagram) {
      var ig = $("galeria-ig");
      ig.hidden = false;
      ig.innerHTML = '<a class="btn btn-secundario" target="_blank" rel="noopener" href="' + esc(m.instagram) + '">Ver más en Instagram</a>';
    }

    $("pie-marca").innerHTML = '<span class="pie-logo">' + esc(m.nombre) + "</span><small>" + esc(m.eslogan) + "</small>";
    var waPie = linkWa(m.whatsapp, "Hola, quiero consultar disponibilidad en " + m.nombre);
    $("pie-datos").innerHTML =
      '<div class="pie-col"><span class="pie-titulo">Visitanos</span><p>' + esc(m.direccion) + "</p></div>" +
      '<div class="pie-col"><span class="pie-titulo">Escribinos</span><a href="' + esc(waPie) + '" target="_blank" rel="noopener">WhatsApp ' + ico("arrow-up-right") + "</a>" +
      (m.instagram ? '<a href="' + esc(m.instagram) + '" target="_blank" rel="noopener">Instagram ' + ico("arrow-up-right") + "</a>" : "") + "</div>" +
      '<div class="pie-col"><span class="pie-titulo">Tu fecha</span><a href="#cotizador">Armá tu presupuesto ' + ico("arrow-right") + "</a></div>";
    $("pie-legal").textContent = "© " + new Date().getFullYear() + " " + m.nombre + " · " + m.ciudad;
    var wa = $("wa-flotante");
    wa.href = linkWa(m.whatsapp, "Hola, quiero consultar disponibilidad en " + m.nombre);
  }

  /* Datos rápidos del hero: capacidad, espacios y próxima fecha libre de fin de semana */
  function renderHeroDatos() {
    var cont = $("hero-datos");
    if (!cont) return;
    var max = C.espacios.reduce(function (m, e) { return Math.max(m, e.max); }, 0);
    var libre = null;
    for (var i = 0; i < 120 && !libre; i++) {
      var f = new Date(minFecha.getFullYear(), minFecha.getMonth(), minFecha.getDate() + i);
      var iso = Q.isoDe(f);
      if (f.getDay() === 6 && !Q.esOcupada(C, iso)) libre = f;
    }
    var datos = [
      ["users", "Hasta " + max, "invitados"],
      ["landmark", C.espacios.length + (C.espacios.length === 1 ? " espacio" : " espacios"), "a elección"],
    ];
    cont.innerHTML =
      datos
        .map(function (d) {
          return '<div class="hero-dato">' + ico(d[0]) + "<div><strong>" + esc(d[1]) + "</strong><span>" + esc(d[2]) + "</span></div></div>";
        })
        .join("") +
      (libre
        ? '<a href="#cotizador" class="hero-libre" data-libre="' + Q.isoDe(libre) + '"><span class="hero-libre-punto"></span><div><span>Próximo sábado libre</span><strong>' +
          DIAS_LARGOS[libre.getDay()] + " " + libre.getDate() + " de " + MESES[libre.getMonth()] + "</strong></div>" + ico("arrow-right") + "</a>"
        : "");
    var a = cont.querySelector("[data-libre]");
    if (a)
      a.addEventListener("click", function () {
        sel.fecha = a.getAttribute("data-libre");
        var f = Q.parseFecha(sel.fecha);
        mesVisible = new Date(f.getFullYear(), f.getMonth(), 1);
        actualizar({ sinEspacios: true });
      });
  }

  function iniciarNav() {
    var nav = document.querySelector(".nav");
    var hero = $("inicio");
    function revisar() {
      nav.classList.toggle("solida", window.scrollY > 40);
      // En celular, la cápsula del total no tapa la portada: aparece al bajar
      document.body.classList.toggle("en-portada", window.scrollY < hero.offsetHeight * 0.55);
    }
    window.addEventListener("scroll", revisar, { passive: true });
    revisar();
  }

  function iniciarDemo() {
    var d = C.demo || {};
    if (!d.activa) return;
    var f = $("demo-franja");
    f.hidden = false;
    var html = '<span class="demo-texto">' + esc(d.texto) + "</span>";
    if (d.mostrarSelectorTema) {
      html +=
        '<span class="demo-temas" role="group" aria-label="Probar estilos">' +
        ["claro", "oscuro", "elegante"]
          .map(function (t) {
            return '<button type="button" data-tema-btn="' + t + '">' + t.charAt(0).toUpperCase() + t.slice(1) + "</button>";
          })
          .join("") +
        "</span>";
    }
    if (d.whatsappVendedor) {
      html += '<a class="demo-cta" target="_blank" rel="noopener" href="' + esc(linkWa(d.whatsappVendedor, "Hola! Vi la demo de la web para salones de eventos y la quiero para mi salón.")) + '">Lo quiero para mi salón</a>';
    }
    f.innerHTML = html;
    f.addEventListener("click", function (e) {
      var b = e.target.closest("[data-tema-btn]");
      if (!b) return;
      var t = b.getAttribute("data-tema-btn");
      guardar("salon-tema", t);
      aplicarTema(t);
    });
  }

  /* ══════════ Galería + modal ══════════ */
  var modalLista = [];
  var modalIdx = 0;

  function abrirModal(lista, idx) {
    modalLista = lista;
    modalIdx = idx;
    mostrarModal();
    $("modal").hidden = false;
    document.body.classList.add("sin-scroll");
    $("modal").querySelector(".modal-cerrar").focus();
  }
  function mostrarModal() {
    var f = modalLista[modalIdx];
    if (!f) return;
    $("modal-img").src = f.src;
    $("modal-img").alt = f.alt || "";
    $("modal-texto").textContent = (f.alt || "") + "  ·  " + (modalIdx + 1) + "/" + modalLista.length;
    var varias = modalLista.length > 1;
    $("modal-prev").hidden = !varias;
    $("modal-next").hidden = !varias;
  }
  function moverModal(d) {
    modalIdx = (modalIdx + d + modalLista.length) % modalLista.length;
    mostrarModal();
  }
  function cerrarModal() {
    $("modal").hidden = true;
    document.body.classList.remove("sin-scroll");
  }

  var filtroActual = "todo";
  function renderGaleria() {
    var g = C.galeria || { categorias: [], fotos: [] };
    $("galeria-filtros").innerHTML = [{ id: "todo", nombre: "Todo" }]
      .concat(g.categorias)
      .map(function (c) {
        return '<button type="button" role="tab" class="filtro' + (c.id === filtroActual ? " activo" : "") + '" aria-selected="' + (c.id === filtroActual) + '" data-filtro="' + esc(c.id) + '">' + esc(c.nombre) + "</button>";
      })
      .join("");
    var fotos = g.fotos.filter(function (f) {
      return filtroActual === "todo" || f.categoria === filtroActual;
    });
    $("galeria-grid").innerHTML = fotos.length
      ? fotos
          .map(function (f, i) {
            return '<button type="button" class="galeria-item' + (i === 0 ? " grande" : "") + '" data-idx="' + i + '"><img loading="lazy" src="' + esc(f.src) + '" alt="' + esc(f.alt) + '"><span class="galeria-pie">' + esc(f.alt) + "</span></button>";
          })
          .join("")
      : '<p class="vacio">Todavía no hay fotos en esta categoría.</p>';
    $("galeria-grid").onclick = function (e) {
      var b = e.target.closest(".galeria-item");
      if (b) abrirModal(fotos, Number(b.getAttribute("data-idx")));
    };
  }

  /* ══════════ Cotizador: pasos ══════════ */
  function espacioActual() {
    return Q.buscarEspacio(C, sel.espacio);
  }

  function renderEspacios() {
    $("grid-espacios").innerHTML = C.espacios
      .map(function (e) {
        var desde = e.turnos.reduce(function (m, t) {
          return Math.min(m, t.valor);
        }, Infinity);
        var precio = (e.precio && e.precio.modelo) === "fijo" ? "Alquiler desde " + pesos(desde) : "Desde " + pesos(desde) + " por invitado";
        return (
          '<button type="button" class="opc' + (e.id === sel.espacio ? " activo" : "") + '" data-espacio="' + esc(e.id) + '" aria-pressed="' + (e.id === sel.espacio) + '">' +
          '<span class="opc-check" aria-hidden="true">' + ico("check") + '</span><span class="opc-icono">' + ico(e.icono) + "</span>" +
          '<span class="opc-nombre">' + esc(e.nombre) + "</span>" +
          '<span class="opc-desc">' + esc(e.descripcion) + "</span>" +
          '<span class="opc-desc">' + e.min + " a " + e.max + " invitados</span>" +
          '<span class="opc-precio">' + precio + "</span></button>"
        );
      })
      .join("");
    var esp = espacioActual();
    var fotos = (esp.fotos || []).map(function (src) {
      return { src: src, alt: esp.nombre };
    });
    $("espacio-fotos").innerHTML = fotos
      .map(function (f, i) {
        return '<button type="button" class="espacio-foto" data-idx="' + i + '" aria-label="Ver foto ' + (i + 1) + " de " + esc(esp.nombre) + '"><img loading="lazy" src="' + esc(f.src) + '" alt=""></button>';
      })
      .join("");
    $("espacio-fotos").onclick = function (e) {
      var b = e.target.closest(".espacio-foto");
      if (b) abrirModal(fotos, Number(b.getAttribute("data-idx")));
    };
  }

  function renderCalendario() {
    var y = mesVisible.getFullYear();
    var m = mesVisible.getMonth();
    var primero = new Date(y, m, 1);
    var diasMes = new Date(y, m + 1, 0).getDate();
    var puedeAtras = new Date(y, m, 1) > new Date(minFecha.getFullYear(), minFecha.getMonth(), 1);
    var html =
      '<div class="cal-cabeza">' +
      '<button type="button" class="cal-nav" data-mes="-1" aria-label="Mes anterior"' + (puedeAtras ? "" : " disabled") + ">" + ico("chevron-left") + "</button>" +
      '<strong aria-live="polite">' + MESES[m].charAt(0).toUpperCase() + MESES[m].slice(1) + " " + y + "</strong>" +
      '<button type="button" class="cal-nav" data-mes="1" aria-label="Mes siguiente">' + ico("chevron-right") + "</button></div>" +
      '<div class="cal-grid" role="grid">' +
      DIAS.map(function (d) {
        return '<span class="cal-dia-nombre">' + d + "</span>";
      }).join("");
    for (var i = 0; i < primero.getDay(); i++) html += "<span></span>";
    for (var d = 1; d <= diasMes; d++) {
      var fecha = new Date(y, m, d);
      var iso = Q.isoDe(fecha);
      var pasada = fecha < minFecha;
      var ocupada = Q.esOcupada(C, iso);
      var finde = Q.esFinde(C, iso);
      var clases = ["cal-dia"];
      if (pasada) clases.push("pasado");
      if (ocupada) clases.push("ocupado");
      if (finde) clases.push("finde");
      if (iso === sel.fecha) clases.push("elegido");
      var etiqueta = d + " de " + MESES[m] + (ocupada ? ", reservado" : pasada ? ", no disponible" : finde ? ", fin de semana o feriado" : "");
      html +=
        '<button type="button" class="' + clases.join(" ") + '" data-fecha="' + iso + '" aria-label="' + etiqueta + '"' +
        (pasada || ocupada ? " disabled" : "") + (iso === sel.fecha ? ' aria-pressed="true"' : "") + ">" + d + "</button>";
    }
    html +=
      '</div><div class="cal-leyenda"><span><i class="ley finde"></i>Fin de semana / feriado (+' + (C.reglas.recargoFindePct || 0) + '%)</span>' +
      '<span><i class="ley ocupado"></i>Reservado</span></div>';
    $("calendario").innerHTML = html;

    var info = $("fecha-info");
    if (sel.fecha) {
      var f = Q.parseFecha(sel.fecha);
      info.innerHTML =
        ico("check") + "<span>Elegiste el <strong>" + DIAS_LARGOS[f.getDay()] + " " + f.getDate() + " de " + MESES[f.getMonth()] + "</strong>" +
        (Q.esFinde(C, sel.fecha) ? (Q.esFeriado(C, sel.fecha) ? " (feriado)" : " (fin de semana)") : "") + ". Está libre.</span>";
      info.className = "fecha-info ok";
    } else {
      info.textContent = "Elegí una fecha libre. Si todavía no la sabés, igual podés armar el presupuesto.";
      info.className = "fecha-info";
    }
  }

  function renderTurnos() {
    var esp = espacioActual();
    var fijo = (esp.precio && esp.precio.modelo) === "fijo";
    var recargo = sel.fecha && Q.esFinde(C, sel.fecha) ? 1 + (C.reglas.recargoFindePct || 0) / 100 : 1;
    $("grid-turnos").innerHTML = esp.turnos
      .map(function (t) {
        var v = Math.round(t.valor * recargo);
        return (
          '<button type="button" class="opc' + (t.id === sel.turno ? " activo" : "") + '" data-turno="' + esc(t.id) + '" aria-pressed="' + (t.id === sel.turno) + '">' +
          '<span class="opc-check" aria-hidden="true">' + ico("check") + '</span><span class="opc-icono">' + ico(t.icono) + "</span>" +
          '<span class="opc-nombre">' + esc(t.nombre) + "</span>" +
          '<span class="opc-desc">' + esc(t.horario) + "</span>" +
          '<span class="opc-precio">' + pesos(v) + (fijo ? " el alquiler" : " por invitado") + "</span></button>"
        );
      })
      .join("");
  }

  function renderPersonas() {
    var esp = espacioActual();
    var s = $("personas-slider");
    s.min = esp.min;
    s.max = esp.max;
    s.value = sel.personas;
    $("personas-num").textContent = sel.personas;
    $("personas-min").textContent = esp.min;
    $("personas-max").textContent = esp.max;
    $("personas-menos").disabled = sel.personas <= esp.min;
    $("personas-mas").disabled = sel.personas >= esp.max;
    var ppm = C.reglas.personasPorMesa || 10;
    $("personas-nota").textContent = sel.personas + " sillas y " + Math.ceil(sel.personas / ppm) + " mesas (de " + ppm + ") incluidas. Este espacio recibe de " + esp.min + " a " + esp.max + " invitados.";
  }

  function etiquetaPrecio(item) {
    var p = item.precio || { tipo: "incluido" };
    var unit = Q.precioUnitario(item, sel.turno);
    switch (p.tipo) {
      case "incluido":
        return "Incluido";
      case "consultar":
        return "A consultar";
      case "por_persona":
        return pesos(unit) + " por invitado · " + pesos(unit * sel.personas);
      case "por_persona_cantidad":
        return pesos(unit) + " por invitado";
      case "por_cantidad":
        return pesos(unit) + " por " + esc(p.unidad || "unidad");
      case "por_turno":
        var t = Q.buscarTurno(espacioActual(), sel.turno);
        return pesos(unit) + (t ? " (" + esc(t.nombre.toLowerCase()) + ")" : "");
      default:
        return pesos(unit);
    }
  }

  function renderAdicionales() {
    var esp = espacioActual();
    var combosActivos = resultado
      ? resultado.combos.map(function (c) {
          return c.id;
        })
      : [];
    var numPaso = 4;
    $("pasos-adicionales").innerHTML = C.adicionales
      .map(function (cat) {
        var items = cat.items.filter(function (it) {
          return !it.espacios || it.espacios.indexOf(esp.id) !== -1;
        });
        if (!items.length) return "";
        var combos = (C.combos || []).filter(function (c) {
          return c.items.some(function (id) {
            return items.some(function (it) {
              return it.id === id;
            });
          });
        });
        var html =
          '<div class="paso"><div class="paso-cabeza"><span class="paso-num">' + numPaso++ + "</span><h3>" + esc(cat.titulo) + "</h3></div>" +
          (cat.nota ? '<p class="nota">' + esc(cat.nota) + "</p>" : "") +
          '<div class="opc-grid">' +
          items
            .map(function (it) {
              var cant = sel.items[it.id] || 0;
              var activo = cant > 0;
              var cont = Q.usaContador(it);
              var max = Q.maximoCantidad(it, sel.personas);
              var enCombo = combos.some(function (c) {
                return combosActivos.indexOf(c.id) !== -1 && c.items.indexOf(it.id) !== -1;
              });
              var sub = "";
              if (cont) {
                var unit = Q.precioUnitario(it, sel.turno);
                sub =
                  '<span class="contador" data-cont="' + esc(it.id) + '">' +
                  '<span class="cont-btn" role="button" tabindex="0" data-delta="-1" aria-label="Quitar uno de ' + esc(it.nombre) + '"' + (cant <= 0 ? ' aria-disabled="true"' : "") + ">−</span>" +
                  '<span class="cont-num">' + cant + "</span>" +
                  '<span class="cont-btn" role="button" tabindex="0" data-delta="1" aria-label="Agregar uno a ' + esc(it.nombre) + '"' + (cant >= max ? ' aria-disabled="true"' : "") + ">+</span></span>" +
                  '<span class="opc-sub">' + (cant ? "Subtotal " + pesos(unit * cant) : (it.precio.tipo === "por_persona_cantidad" ? "Tocá para sumarla a todos" : "Tocá para agregar")) + "</span>";
              }
              return (
                '<div class="opc' + (activo ? " activo" : "") + (enCombo ? " combo" : "") + (it.fijo ? " fijo" : "") + '" role="button" tabindex="0" data-item="' + esc(it.id) + '" aria-pressed="' + activo + '">' +
                '<span class="opc-check" aria-hidden="true">' + ico("check") + '</span><span class="opc-icono">' + ico(it.icono) + "</span>" +
                '<span class="opc-nombre">' + esc(it.nombre) + "</span>" +
                '<span class="opc-desc">' + esc(it.desc) + "</span>" +
                '<span class="opc-precio">' + etiquetaPrecio(it) + "</span>" + sub + "</div>"
              );
            })
            .join("") +
          "</div>" +
          combos
            .map(function (c) {
              var activo = combosActivos.indexOf(c.id) !== -1;
              return '<p class="combo-aviso' + (activo ? " activo" : "") + '">' + ico("gift") + "<span>" + (activo ? "<strong>" + esc(c.nombre) + " aplicado:</strong> te queda en " : esc(c.nombre) + ": llevando los dos pagás ") + pesos(c.precio) + "</span></p>";
            })
            .join("") +
          "</div>";
        return html;
      })
      .join("");
  }

  /* ══════════ Resumen ══════════ */
  function renderResumen() {
    var r = resultado;
    $("resumen-barra-total").textContent = pesos(r.total);
    $("resumen-total").textContent = pesos(r.total) + (r.hayConsultar ? " + a consultar" : "");
    var f = sel.fecha ? Q.parseFecha(sel.fecha) : null;
    $("resumen-sub").textContent =
      r.espacio.nombre + " · " + (f ? f.getDate() + "/" + (f.getMonth() + 1) : "fecha a definir") + " · " + (r.turno ? r.turno.nombre : "") + " · " + sel.personas + " invitados";
    $("resumen-lineas").innerHTML =
      r.lineas
        .map(function (l) {
          var precio = l.consultar ? "A consultar" : l.incluido ? "Incluido" : pesos(l.monto);
          return '<div class="linea"><span>' + esc(l.nombre) + (l.detalle ? "<small>" + esc(l.detalle) + "</small>" : "") + "</span><strong>" + precio + "</strong></div>";
        })
        .join("") +
      r.combos
        .map(function (c) {
          return '<div class="linea descuento"><span>' + esc(c.nombre) + "</span><strong>−" + pesos(c.descuento) + "</strong></div>";
        })
        .join("") +
      (r.minimoAplicado ? '<div class="linea"><span>Mínimo del salón</span><strong>' + pesos(C.reglas.minimoCobro) + "</strong></div>" : "");

    var pagos = "";
    if (r.sena > 0) {
      pagos = '<div class="pago-fila"><span>Seña para reservar (' + r.senaPorcentaje + "%)</span><strong>" + pesos(r.sena) + "</strong></div>";
      if (r.cuotas > 0 && r.resto > 0) pagos += '<div class="pago-fila"><span>Resto en ' + r.cuotas + " cuotas de</span><strong>" + pesos(r.valorCuota) + "</strong></div>";
    }
    $("resumen-pagos").innerHTML = pagos;

    var sena = C.pagos && C.pagos.sena;
    var btn = $("btn-sena");
    if (sena && sena.activa && r.sena > 0) {
      btn.hidden = false;
      btn.disabled = false;
      btn.innerHTML = sel.fecha ? "Señar " + pesos(r.sena) + " con Mercado Pago" : "Elegí la fecha para señar";
      btn.classList.toggle("deshabilitado", !sel.fecha);
    } else {
      btn.hidden = true;
    }
  }

  function aviso(texto, tipo) {
    var a = $("aviso");
    if (!texto) {
      a.hidden = true;
      return;
    }
    a.hidden = false;
    a.className = "aviso " + (tipo || "info");
    a.innerHTML = texto;
  }

  /* ══════════ Recalcular ══════════ */
  function actualizar(opciones) {
    opciones = opciones || {};
    var norm = Q.normalizar(C, sel);
    sel.turno = norm.turno;
    sel.personas = norm.personas;
    sel.items = norm.items;
    resultado = Q.cotizar(C, sel);
    if (!opciones.sinEspacios) renderEspacios();
    if (!opciones.sinCalendario) renderCalendario();
    renderTurnos();
    if (!opciones.sinPersonas) renderPersonas();
    renderAdicionales();
    renderResumen();
    $("personas-num").textContent = sel.personas;
  }

  function cambiarCantidad(id, delta) {
    var par = Q.itemsDelEspacio(C, sel.espacio).filter(function (p) {
      return p.item.id === id;
    })[0];
    if (!par || par.item.fijo) return;
    var max = Q.maximoCantidad(par.item, sel.personas);
    var actual = sel.items[id] || 0;
    sel.items[id] = Math.max(0, Math.min(max, actual + delta));
    actualizar({ sinCalendario: true, sinEspacios: true });
  }

  function tocarItem(id) {
    var par = Q.itemsDelEspacio(C, sel.espacio).filter(function (p) {
      return p.item.id === id;
    })[0];
    if (!par || par.item.fijo) return;
    var it = par.item;
    var actual = sel.items[id] || 0;
    if (Q.usaContador(it)) {
      if (actual > 0) sel.items[id] = 0;
      else if (it.precio.tipo === "por_persona_cantidad") sel.items[id] = sel.personas;
      else sel.items[id] = it.precio.sugerido ? Math.min(Q.maximoCantidad(it, sel.personas), Math.ceil(sel.personas / it.precio.sugerido)) : 1;
    } else {
      sel.items[id] = actual ? 0 : 1;
    }
    actualizar({ sinCalendario: true, sinEspacios: true });
  }

  /* ══════════ Seña con Mercado Pago ══════════ */
  function senar() {
    if (!sel.fecha) {
      aviso("Primero elegí la fecha del evento en el paso 2.", "info");
      $("paso-fecha").scrollIntoView({ behavior: "smooth", block: "start" });
      cerrarResumenMovil();
      return;
    }
    var btn = $("btn-sena");
    var texto = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = "Generando el link de pago…";
    aviso("");
    fetch("/api/crear-pago", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seleccion: sel }),
    })
      .then(function (res) {
        return res
          .json()
          .catch(function () {
            return {};
          })
          .then(function (datos) {
            return { status: res.status, datos: datos };
          });
      })
      .then(function (r) {
        if (r.datos.init_point) {
          window.location.href = r.datos.init_point;
          return;
        }
        if (r.datos.codigo === "sin_token" || r.status === 404) {
          aviso("<strong>Modo demo:</strong> acá se abre Mercado Pago para pagar la seña de " + pesos(resultado.sena) + ". Se activa con la cuenta de Mercado Pago del salón.", "info");
        } else {
          aviso(esc(r.datos.error || "No pudimos generar el pago. Probá de nuevo o escribinos por WhatsApp."), "error");
        }
        btn.disabled = false;
        btn.innerHTML = texto;
      })
      .catch(function () {
        aviso("No hay conexión. Probá de nuevo o mandanos el presupuesto por WhatsApp.", "error");
        btn.disabled = false;
        btn.innerHTML = texto;
      });
  }

  function avisoRegresoPago() {
    var p = new URLSearchParams(location.search).get("pago");
    if (!p) return;
    var textos = {
      approved: ["¡Listo! Recibimos tu seña. Te escribimos por WhatsApp para confirmar todo.", "ok"],
      pending: ["Tu pago quedó pendiente. Cuando Mercado Pago lo acredite te avisamos.", "info"],
      failure: ["El pago no se completó. Podés intentarlo otra vez o escribirnos por WhatsApp.", "error"],
    };
    var t = textos[p];
    if (!t) return;
    aviso(t[0], t[1]);
    abrirResumenMovil();
  }

  /* ══════════ Resumen en celular ══════════ */
  function abrirResumenMovil() {
    $("resumen").classList.add("abierto");
    $("resumen-velo").hidden = false;
    $("resumen-barra").setAttribute("aria-expanded", "true");
    $("resumen-barra-texto").textContent = "Seguir armando";
    $("wa-flotante").classList.add("oculto");
  }
  function cerrarResumenMovil() {
    $("resumen").classList.remove("abierto");
    $("resumen-velo").hidden = true;
    $("resumen-barra").setAttribute("aria-expanded", "false");
    $("resumen-barra-texto").textContent = "Ver detalle";
    $("wa-flotante").classList.remove("oculto");
  }

  /* ══════════ Eventos ══════════ */
  function enlazar() {
    $("grid-espacios").addEventListener("click", function (e) {
      var b = e.target.closest("[data-espacio]");
      if (!b) return;
      var id = b.getAttribute("data-espacio");
      if (id === sel.espacio) return;
      sel.espacio = id;
      var esp = espacioActual();
      if (!Q.buscarTurno(esp, sel.turno) || !esp.turnos.some(function (t) { return t.id === sel.turno; })) sel.turno = esp.turnos[0].id;
      Q.itemsDelEspacio(C, id).forEach(function (p) {
        if (p.item.preseleccionado) sel.items[p.item.id] = 1;
      });
      actualizar();
    });

    $("calendario").addEventListener("click", function (e) {
      var nav = e.target.closest("[data-mes]");
      if (nav) {
        mesVisible = new Date(mesVisible.getFullYear(), mesVisible.getMonth() + Number(nav.getAttribute("data-mes")), 1);
        renderCalendario();
        return;
      }
      var d = e.target.closest("[data-fecha]");
      if (!d || d.disabled) return;
      var iso = d.getAttribute("data-fecha");
      var motivo = Q.motivoFechaInvalida(C, iso, hoy);
      if (motivo) return;
      sel.fecha = sel.fecha === iso ? "" : iso;
      aviso("");
      actualizar({ sinEspacios: true });
    });

    $("grid-turnos").addEventListener("click", function (e) {
      var b = e.target.closest("[data-turno]");
      if (!b) return;
      sel.turno = b.getAttribute("data-turno");
      actualizar({ sinEspacios: true, sinCalendario: true });
    });

    $("personas-slider").addEventListener("input", function (e) {
      sel.personas = Number(e.target.value);
      actualizar({ sinEspacios: true, sinCalendario: true, sinPersonas: true });
      renderPersonasTexto();
    });
    $("personas-menos").addEventListener("click", function () {
      sel.personas--;
      actualizar({ sinEspacios: true, sinCalendario: true });
    });
    $("personas-mas").addEventListener("click", function () {
      sel.personas++;
      actualizar({ sinEspacios: true, sinCalendario: true });
    });

    var adic = $("pasos-adicionales");
    function accionAdicional(e) {
      var btn = e.target.closest("[data-delta]");
      if (btn) {
        e.stopPropagation();
        if (btn.getAttribute("aria-disabled") === "true") return;
        var cont = btn.closest("[data-cont]");
        cambiarCantidad(cont.getAttribute("data-cont"), Number(btn.getAttribute("data-delta")));
        return;
      }
      var card = e.target.closest("[data-item]");
      if (card) tocarItem(card.getAttribute("data-item"));
    }
    adic.addEventListener("click", accionAdicional);
    adic.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      if (!e.target.closest("[data-delta],[data-item]")) return;
      e.preventDefault();
      accionAdicional(e);
    });

    $("galeria-filtros").addEventListener("click", function (e) {
      var b = e.target.closest("[data-filtro]");
      if (!b) return;
      filtroActual = b.getAttribute("data-filtro");
      renderGaleria();
    });

    $("modal").addEventListener("click", function (e) {
      if (e.target.closest("[data-cerrar]")) cerrarModal();
    });
    $("modal-prev").addEventListener("click", function () {
      moverModal(-1);
    });
    $("modal-next").addEventListener("click", function () {
      moverModal(1);
    });
    document.addEventListener("keydown", function (e) {
      if ($("modal").hidden) return;
      if (e.key === "Escape") cerrarModal();
      if (e.key === "ArrowLeft") moverModal(-1);
      if (e.key === "ArrowRight") moverModal(1);
    });

    $("resumen-barra").addEventListener("click", function () {
      $("resumen").classList.contains("abierto") ? cerrarResumenMovil() : abrirResumenMovil();
    });
    // En celular, tocar fuera del resumen abierto lo cierra
    $("resumen-velo").addEventListener("click", cerrarResumenMovil);

    $("btn-wa").addEventListener("click", function () {
      window.open(linkWa(C.marca.whatsapp, Q.mensajeWhatsApp(C, resultado)), "_blank", "noopener");
    });
    $("btn-sena").addEventListener("click", senar);
  }

  function renderPersonasTexto() {
    var esp = espacioActual();
    var ppm = C.reglas.personasPorMesa || 10;
    $("personas-menos").disabled = sel.personas <= esp.min;
    $("personas-mas").disabled = sel.personas >= esp.max;
    $("personas-nota").textContent = sel.personas + " sillas y " + Math.ceil(sel.personas / ppm) + " mesas (de " + ppm + ") incluidas. Este espacio recibe de " + esp.min + " a " + esp.max + " invitados.";
  }

  /* ══════════ Inicio ══════════ */
  var temaUrl = new URLSearchParams(location.search).get("tema");
  aplicarTema(temaUrl || (C.demo && C.demo.activa && leer("salon-tema")) || C.tema);
  iniciarDemo();
  aplicarTema(document.documentElement.getAttribute("data-tema"));
  iniciarMarca();
  iniciarNav();
  renderGaleria();
  enlazar();
  actualizar();
  avisoRegresoPago();
})();
