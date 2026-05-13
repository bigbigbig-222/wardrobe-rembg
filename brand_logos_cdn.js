// Local static brand logo package.
// All logos are served from project assets to avoid external CDN/network issues.

const BRAND_LOGO_SOURCES = {
  uniqlo: "/assets/brand-logos/uniqlo.svg",
  muji: "/assets/brand-logos/muji.svg",
  zara: "/assets/brand-logos/zara.svg",
  "h&m": "/assets/brand-logos/h-m.svg",
  gap: "/assets/brand-logos/gap.svg",
  "levi's": "/assets/brand-logos/levi-s.svg",
  nike: "/assets/brand-logos/nike.svg",
  adidas: "/assets/brand-logos/adidas.svg",
  puma: "/assets/brand-logos/puma.svg",
  "new balance": "/assets/brand-logos/new-balance.svg",
  converse: "/assets/brand-logos/converse.svg",
  vans: "/assets/brand-logos/vans.svg",
  skechers: "/assets/brand-logos/skechers.svg",
  anta: "/assets/brand-logos/anta.svg",
  "li-ning": "/assets/brand-logos/li-ning.svg",
  fila: "/assets/brand-logos/fila.svg",
  "the north face": "/assets/brand-logos/the-north-face.svg",
  columbia: "/assets/brand-logos/columbia.svg",
  lululemon: "/assets/brand-logos/lululemon.svg",
  "massimo dutti": "/assets/brand-logos/massimo-dutti.svg",
  "mont-bell": "/assets/brand-logos/mont-bell.svg",
  "arc'teryx": "/assets/brand-logos/arc-teryx.svg",
  keen: "/assets/brand-logos/keen.svg",
  nanamica: "/assets/brand-logos/nanamica.svg",
  patagonia: "/assets/brand-logos/patagonia.svg",
  mammut: "/assets/brand-logos/mammut.svg",
  salomon: "/assets/brand-logos/salomon.svg",
  merrell: "/assets/brand-logos/merrell.svg",
  hoka: "/assets/brand-logos/hoka.svg",
  on: "/assets/brand-logos/on.svg",
  "black diamond": "/assets/brand-logos/black-diamond.svg",
  "snow peak": "/assets/brand-logos/snow-peak.svg",
  deuter: "/assets/brand-logos/deuter.svg",
  osprey: "/assets/brand-logos/osprey.svg",
  "jack wolfskin": "/assets/brand-logos/jack-wolfskin.svg",
};

// Create logo mapping indexed by normalized brand names (same as normalizeBrandName)
const PRESET_BRAND_LOGOS_CDN = {};

function buildPresetBrandLogosMapping() {
  // Match the normalization in app.js: trim and lowercase
  for (const [brandName, logoUrl] of Object.entries(BRAND_LOGO_SOURCES)) {
    const normalized = String(brandName || "").trim().toLowerCase();
    PRESET_BRAND_LOGOS_CDN[normalized] = logoUrl;
  }
}

// Initialize on load
buildPresetBrandLogosMapping();
