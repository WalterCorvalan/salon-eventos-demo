/* ══════════════════════════════════════════════════════════════
   CONFIGURACIÓN DEL SALÓN
   Este es el ÚNICO archivo que se edita para un cliente nuevo.
   (Ver README → "Alta de un cliente nuevo")

   Tipos de precio de un adicional (campo "precio"):
     { tipo: "incluido" }                          sin cargo
     { tipo: "consultar" }                         figura en el presupuesto como "a consultar"
     { tipo: "fijo", valor: 80000 }                monto único
     { tipo: "por_persona", valor: 800 }           valor × invitados
     { tipo: "por_cantidad", valor: 70000,
       unidad: "mozo", max: 10, sugerido: 20 }     contador (sugerido = 1 cada N invitados)
     { tipo: "por_turno", valores: { dia: 550000, noche: 650000 } }
     { tipo: "por_persona_cantidad", valor: 25000 } contador de personas (ej. barra para N invitados)
   ══════════════════════════════════════════════════════════════ */

const SALON_CONFIG = {
  /* ── Franja de demo ── poner activa: false para un cliente real */
  demo: {
    activa: true,
    texto: "Demo · tu marca acá",
    // A dónde llega el "Lo quiero para mi salón" (número de quien vende la plantilla)
    whatsappVendedor: "5493856865979",
    mostrarSelectorTema: true,
  },

  marca: {
    nombre: "Salón Aurora",
    nombreCorto: "Aurora",
    eslogan: "Eventos que se recuerdan",
    logoEmoji: "sparkles", // nombre de ícono (ver iconos.js) o un emoji; o logo: "img/logo.png"
    logo: "",
    ciudad: "Tu ciudad",
    direccion: "Av. Siempreviva 742, Tu ciudad",
    mapaQuery: "Buenos Aires, Argentina", // texto que se busca en Google Maps ("" para ocultar el mapa)
    instagram: "", // URL completa, "" para ocultar
    whatsapp: "5493856865979", // con código de país, sin + ni espacios
    aliasTransferencia: "SALON.AURORA.DEMO",
    seo: {
      titulo: "Salón Aurora — Salón y parque para eventos",
      descripcion:
        "Cumpleaños, 15, casamientos y eventos de empresa. Armá tu presupuesto online en 1 minuto y envialo por WhatsApp.",
    },
    hero: {
      etiqueta: "Tu ciudad",
      titulo: "Tu fiesta,",
      tituloDestacado: "a tu medida",
      texto:
        "Salón climatizado y parque con pileta para cumpleaños, 15, casamientos y eventos de empresa. Armá tu presupuesto en un minuto y mandalo por WhatsApp.",
      imagen: "img/demo/hero.webp",
    },
    porQue: [
      { icono: "trees", titulo: "Parque y pileta", texto: "Espacio verde para el día" },
      { icono: "music", titulo: "Pista y luces", texto: "Sonido e iluminación propios" },
      { icono: "utensils", titulo: "Catering a elección", texto: "Del finger food al menú formal" },
      { icono: "heart-handshake", titulo: "Atención personal", texto: "Te acompañamos en todo" },
    ],
    // Pisar colores del tema (opcional): { primario: "#2F6B3F", acento: "#E07A2E" }
    colores: {},
  },

  /* claro | oscuro | elegante */
  tema: "claro",

  /* ── Reglas de precio ── */
  reglas: {
    // 0 = domingo … 6 = sábado. Viernes, sábado y domingo llevan recargo.
    diasFinde: [5, 6, 0],
    recargoFindePct: 10,
    feriados: ["2026-12-08", "2026-12-25", "2027-01-01", "2027-02-15", "2027-02-16", "2027-03-24"],
    minimoCobro: 0, // si el total da menos, se cobra este mínimo
    personasPorMesa: 10,
    diasAnticipacionMin: 2, // no se puede elegir una fecha antes de hoy + N días
  },

  /* ── Espacios (N) ──
     precio.modelo: "por_persona" (valor del turno × invitados) o "fijo" (alquiler del turno) */
  espacios: [
    {
      id: "salon",
      icono: "landmark",
      nombre: "Salón principal",
      descripcion: "Salón climatizado con pista, barra y luces",
      min: 30,
      max: 80,
      precio: { modelo: "por_persona" },
      turnos: [
        { id: "dia", icono: "sun", nombre: "De día", horario: "12:00 a 18:00 hs", valor: 12000 },
        { id: "noche", icono: "moon", nombre: "De noche", horario: "21:00 a 04:00 hs", valor: 16000 },
      ],
      fotos: ["img/demo/salon.webp", "img/demo/pista.webp", "img/demo/mesa.webp"],
    },
    {
      id: "parque",
      icono: "trees",
      nombre: "Parque con pileta",
      descripcion: "Parque, pileta y quincho con parrilla",
      min: 40,
      max: 150,
      precio: { modelo: "por_persona" },
      turnos: [
        { id: "dia", icono: "sun", nombre: "De día", horario: "11:00 a 19:00 hs", valor: 15000 },
        { id: "noche", icono: "moon", nombre: "De noche", horario: "21:00 a 05:00 hs", valor: 20000 },
      ],
      fotos: ["img/demo/parque.webp", "img/demo/pileta.webp", "img/demo/quincho.webp"],
    },
    {
      id: "terraza",
      icono: "wine",
      nombre: "Terraza (alquiler fijo)",
      descripcion: "Ideal para reuniones chicas y after office",
      min: 10,
      max: 35,
      precio: { modelo: "fijo" },
      turnos: [
        { id: "tarde", icono: "sunset", nombre: "Tarde", horario: "15:00 a 20:00 hs", valor: 250000 },
        { id: "noche", icono: "moon", nombre: "Noche", horario: "21:00 a 02:00 hs", valor: 320000 },
      ],
      fotos: ["img/demo/terraza.webp", "img/demo/barra.webp"],
    },
  ],

  /* ── Adicionales por categoría ──
     "espacios": ["parque"] limita el ítem a esos espacios. "preseleccionado": true lo marca de entrada. */
  adicionales: [
    {
      id: "catering",
      titulo: "Catering y comida",
      icono: "utensils",
      items: [
        { id: "finger", icono: "croissant", nombre: "Finger food", desc: "Recepción con 8 bocados por persona", precio: { tipo: "por_persona", valor: 9000 } },
        { id: "menu_formal", icono: "utensils-crossed", nombre: "Menú formal", desc: "Entrada, plato principal y postre", precio: { tipo: "por_persona", valor: 18000 } },
        { id: "pizza", icono: "pizza", nombre: "Pizza party", desc: "Pizzas libres durante 2 horas", precio: { tipo: "por_persona", valor: 11000 } },
        { id: "asado", icono: "beef", nombre: "Asado completo", desc: "Con parrillero incluido", precio: { tipo: "por_persona", valor: 22000 }, espacios: ["parque"] },
        { id: "mesa_dulce", icono: "cake-slice", nombre: "Mesa dulce", desc: "Para hasta 40 personas", precio: { tipo: "consultar" } },
      ],
    },
    {
      id: "barra",
      titulo: "Barra de bebidas",
      icono: "martini",
      nota: "Elegí para cuántos invitados (los chicos pueden ir sin alcohol).",
      items: [
        { id: "barra_libre", icono: "martini", nombre: "Barra libre con alcohol", desc: "Tragos clásicos, 5 horas", precio: { tipo: "por_persona_cantidad", valor: 14000 } },
        { id: "barra_soft", icono: "cup-soda", nombre: "Barra sin alcohol", desc: "Gaseosas, agua y jugos", precio: { tipo: "por_persona_cantidad", valor: 5000 } },
        { id: "copas", icono: "wine", nombre: "Copas de vidrio", desc: "En lugar de vasos (para todos)", precio: { tipo: "por_persona", valor: 800 } },
      ],
    },
    {
      id: "musica",
      titulo: "Música y personal",
      icono: "headphones",
      items: [
        { id: "dj", icono: "headphones", nombre: "DJ con sonido", desc: "Precio según turno", precio: { tipo: "por_turno", valores: { dia: 450000, tarde: 380000, noche: 550000 } } },
        { id: "foto", icono: "camera", nombre: "Fotógrafo", desc: "Cobertura completa + fotos digitales", precio: { tipo: "fijo", valor: 400000 } },
        { id: "mozos", icono: "concierge-bell", nombre: "Mozos", desc: "Sugerido: 1 cada 20 invitados", precio: { tipo: "por_cantidad", valor: 60000, unidad: "mozo", max: 10, sugerido: 20 } },
        { id: "seguridad", icono: "shield-check", nombre: "Seguridad en puerta", desc: "Por persona de seguridad", precio: { tipo: "por_cantidad", valor: 55000, unidad: "guardia", max: 4 } },
      ],
    },
    {
      id: "extras",
      titulo: "Juegos y extras",
      icono: "party-popper",
      items: [
        { id: "metegol", icono: "gamepad-2", nombre: "Metegol y ping pong", desc: "Siempre incluido", precio: { tipo: "incluido" }, preseleccionado: true, fijo: true },
        { id: "inflable", icono: "castle", nombre: "Castillo inflable", desc: "Para los más chicos", precio: { tipo: "fijo", valor: 90000 }, espacios: ["parque"] },
        { id: "cabina", icono: "aperture", nombre: "Cabina de fotos", desc: "Fotos impresas al instante", precio: { tipo: "fijo", valor: 180000 } },
        { id: "chispas", icono: "flame", nombre: "Chispas frías", desc: "Por máquina", precio: { tipo: "por_cantidad", valor: 45000, unidad: "máquina", max: 4 } },
        { id: "torta", icono: "cake", nombre: "Torta del evento", desc: "Personalizada", precio: { tipo: "consultar" } },
      ],
    },
  ],

  /* ── Combos: si se eligen todos los ítems, se cobra "precio" en lugar de la suma ── */
  combos: [{ id: "dj_foto", nombre: "Combo DJ + Fotógrafo", items: ["dj", "foto"], precio: 800000 }],

  /* ── Fechas ocupadas (AAAA-MM-DD). Más adelante: desde Google Sheets o el panel. ── */
  fechasOcupadas: ["2026-11-28", "2026-12-05", "2026-12-12", "2026-12-19", "2026-12-20", "2026-12-31", "2027-01-09"],

  /* ── Galería ── categorías para los filtros y fotos */
  galeria: {
    categorias: [
      { id: "salon", nombre: "Salón" },
      { id: "parque", nombre: "Parque" },
      { id: "comida", nombre: "Comida" },
    ],
    fotos: [
      { src: "img/demo/hero.webp", categoria: "parque", alt: "El parque iluminado de noche" },
      { src: "img/demo/salon.webp", categoria: "salon", alt: "Salón principal armado para casamiento" },
      { src: "img/demo/pista.webp", categoria: "salon", alt: "DJ y pista con luces" },
      { src: "img/demo/pileta.webp", categoria: "parque", alt: "Pileta del parque al atardecer" },
      { src: "img/demo/mesa.webp", categoria: "comida", alt: "Mesa servida a la luz de las velas" },
      { src: "img/demo/barra.webp", categoria: "comida", alt: "Barra de tragos" },
      { src: "img/demo/terraza.webp", categoria: "salon", alt: "Terraza cerrada para reuniones" },
      { src: "img/demo/quincho.webp", categoria: "comida", alt: "Menú formal servido en mesa" },
      { src: "img/demo/torta.webp", categoria: "comida", alt: "La torta del cumpleaños" },
      { src: "img/demo/parque.webp", categoria: "parque", alt: "Atardecer entre palmeras" },
    ],
  },

  /* ── Pagos ── */
  pagos: {
    sena: { activa: true, porcentaje: 20 }, // necesita MP_ACCESS_TOKEN en Netlify
    cuotas: 3, // el resto en N cuotas (informativo, 0 para ocultar)
  },
};

if (typeof module !== "undefined" && module.exports) module.exports = SALON_CONFIG;
