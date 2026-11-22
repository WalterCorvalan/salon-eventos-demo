/* ══════════════════════════════════════════════════════════════
   Worker de Cloudflare: sirve la web estática y atiende
   /api/crear-pago reusando la misma función que en Netlify.
   Variable (secreto) opcional: MP_ACCESS_TOKEN. Sin ella, la web
   muestra "Modo demo" al tocar "Pagar la seña".
   ══════════════════════════════════════════════════════════════ */
import crearPago from "./netlify/functions/crear-pago.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/api/crear-pago") return env.ASSETS.fetch(request);

    // La función de Netlify lee process.env: le pasamos el secreto del Worker.
    if (env.MP_ACCESS_TOKEN) process.env.MP_ACCESS_TOKEN = env.MP_ACCESS_TOKEN;
    else delete process.env.MP_ACCESS_TOKEN;

    const r = await crearPago.handler({
      httpMethod: request.method,
      body: request.method === "POST" ? (await request.text()).slice(0, 20000) : "",
      headers: { origin: request.headers.get("origin") || "", host: url.host },
    });
    return new Response(r.body, { status: r.statusCode, headers: r.headers });
  },
};
