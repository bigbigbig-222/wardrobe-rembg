// Real brand logos via same-origin proxy endpoint.
// Client always requests /api/logo to avoid direct external-domain access issues.

const BRAND_LOGO_SOURCES = {
  uniqlo: "/api/logo?brand=uniqlo&v=1",
  muji: "/api/logo?brand=muji&v=1",
  zara: "/api/logo?brand=zara&v=1",
  "h&m": "/api/logo?brand=h%26m&v=1",
  gap: "/api/logo?brand=gap&v=1",
  "levi's": "/api/logo?brand=levi%27s&v=1",
  nike: "/api/logo?brand=nike&v=1",
  adidas: "/api/logo?brand=adidas&v=1",
  puma: "/api/logo?brand=puma&v=1",
  "new balance": "/api/logo?brand=new%20balance&v=1",
  converse: "/api/logo?brand=converse&v=1",
  vans: "/api/logo?brand=vans&v=1",
  skechers: "/api/logo?brand=skechers&v=1",
  anta: "/api/logo?brand=anta&v=1",
  "li-ning": "/api/logo?brand=li-ning&v=1",
  fila: "/api/logo?brand=fila&v=1",
  "the north face": "/api/logo?brand=the%20north%20face&v=1",
  columbia: "/api/logo?brand=columbia&v=1",
  lululemon: "/api/logo?brand=lululemon&v=1",
  "massimo dutti": "/api/logo?brand=massimo%20dutti&v=1",
  "mont-bell": "/api/logo?brand=mont-bell&v=1",
  "arc'teryx": "/api/logo?brand=arc%27teryx&v=1",
  keen: "/api/logo?brand=keen&v=1",
  nanamica: "/api/logo?brand=nanamica&v=1",
  patagonia: "/api/logo?brand=patagonia&v=1",
  mammut: "/api/logo?brand=mammut&v=1",
  salomon: "/api/logo?brand=salomon&v=1",
  merrell: "/api/logo?brand=merrell&v=1",
  hoka: "/api/logo?brand=hoka&v=1",
  on: "/api/logo?brand=on&v=1",
  "black diamond": "/api/logo?brand=black%20diamond&v=1",
  "snow peak": "/api/logo?brand=snow%20peak&v=1",
  deuter: "/api/logo?brand=deuter&v=1",
  osprey: "/api/logo?brand=osprey&v=1",
  "jack wolfskin": "/api/logo?brand=jack%20wolfskin&v=1",
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
