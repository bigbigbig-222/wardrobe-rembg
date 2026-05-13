/**
 * Cloudflare Pages Function - Real brand logo proxy
 * Route: /api/logo?brand=<name>
 */

const BRAND_SOURCE_CONFIG = {
  uniqlo: { slug: "uniqlo", domain: "uniqlo.com" },
  muji: { slug: "muji", domain: "muji.com" },
  zara: { slug: "zara", domain: "zara.com" },
  "h&m": { slug: "hm", domain: "hm.com" },
  gap: { slug: "gap", domain: "gap.com" },
  "levi's": { slug: "levis", domain: "levi.com" },
  nike: { slug: "nike", domain: "nike.com" },
  adidas: { slug: "adidas", domain: "adidas.com" },
  puma: { slug: "puma", domain: "puma.com" },
  "new balance": { slug: "newbalance", domain: "newbalance.com" },
  converse: { slug: "converse", domain: "converse.com" },
  vans: { slug: "vans", domain: "vans.com" },
  skechers: { slug: "skechers", domain: "skechers.com" },
  anta: { slug: "anta", domain: "antasports.com" },
  "li-ning": { slug: "lining", domain: "lining.com" },
  fila: { slug: "fila", domain: "fila.com" },
  "the north face": { slug: "thenorthface", domain: "thenorthface.com" },
  columbia: { slug: "columbia", domain: "columbia.com" },
  lululemon: { slug: "lululemon", domain: "lululemon.com" },
  "massimo dutti": { slug: "massimodutti", domain: "massimodutti.com" },
  "mont-bell": { slug: "montbell", domain: "montbell.com" },
  "arc'teryx": { slug: "arcteryx", domain: "arcteryx.com" },
  keen: { slug: "keen", domain: "keenfootwear.com" },
  nanamica: { slug: "nanamica", domain: "nanamica.com" },
  patagonia: { slug: "patagonia", domain: "patagonia.com" },
  mammut: { slug: "mammut", domain: "mammut.com" },
  salomon: { slug: "salomon", domain: "salomon.com" },
  merrell: { slug: "merrell", domain: "merrell.com" },
  hoka: { slug: "hoka", domain: "hoka.com" },
  on: { slug: "on", domain: "on.com" },
  "black diamond": { slug: "blackdiamond", domain: "blackdiamondequipment.com" },
  "snow peak": { slug: "snowpeak", domain: "snowpeak.com" },
  deuter: { slug: "deuter", domain: "deuter.com" },
  osprey: { slug: "osprey", domain: "osprey.com" },
  "jack wolfskin": { slug: "jackwolfskin", domain: "jack-wolfskin.com" },
};

function jsonError(message, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

async function fetchFirstAvailable(urls) {
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": "Wardrobe-Logo-Proxy/1.0",
          Accept: "image/svg+xml,image/*;q=0.9,*/*;q=0.8",
        },
      });
      if (response.ok) {
        return response;
      }
    } catch {
      // Continue trying next upstream.
    }
  }
  return null;
}

export async function onRequest(context) {
  const { request } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (request.method !== "GET") {
    return jsonError("Method not allowed", 405);
  }

  const url = new URL(request.url);
  const rawBrand = String(url.searchParams.get("brand") || "").trim().toLowerCase();
  if (!rawBrand) {
    return jsonError("Missing brand parameter", 400);
  }

  const source = BRAND_SOURCE_CONFIG[rawBrand];
  if (!source) {
    return jsonError("Brand not supported", 404);
  }

  const candidates = [];

  if (source.slug) {
    candidates.push(`https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/${source.slug}.svg`);
    candidates.push(`https://fastly.jsdelivr.net/npm/simple-icons@latest/icons/${source.slug}.svg`);
    candidates.push(`https://unpkg.com/simple-icons@latest/icons/${source.slug}.svg`);
  }

  if (source.domain) {
    candidates.push(`https://logo.clearbit.com/${source.domain}`);
  }

  const upstream = await fetchFirstAvailable(candidates);
  if (!upstream) {
    return jsonError("Upstream logo source unavailable", 502);
  }

  const contentType = upstream.headers.get("content-type") || "image/svg+xml";
  const body = await upstream.arrayBuffer();

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=259200",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      Vary: "Accept-Encoding",
    },
  });
}
