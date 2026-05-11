// 真实品牌Logo - 使用Wikimedia Commons和官方品牌资源
// 这些URL都是公开可用的，支持跨域请求
// 一旦加载后会被浏览器和Service Worker缓存

const BRAND_LOGO_SOURCES = {
  // 零售和时尚
  uniqlo: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Uniqlo_logo.svg/1200px-Uniqlo_logo.svg.png",
  muji: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Muji_logo.svg/1200px-Muji_logo.svg.png",
  zara: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Zara_logo.svg/1200px-Zara_logo.svg.png",
  "h&m": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/H%26M-Logo.svg/1200px-H%26M-Logo.svg.png",
  gap: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Gap_logo.svg/1200px-Gap_logo.svg.png",
  "levi's": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Levi_Strauss_%26_Co._logo.svg/1200px-Levi_Strauss_%26_Co._logo.svg.png",
  
  // 运动品牌
  nike: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Nike_logo.svg/1200px-Nike_logo.svg.png",
  adidas: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Adidas_logo.svg/1200px-Adidas_logo.svg.png",
  puma: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Puma_logo.svg/1200px-Puma_logo.svg.png",
  "new balance": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/New_Balance_logo.svg/1200px-New_Balance_logo.svg.png",
  converse: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Converse_logo.svg/1200px-Converse_logo.svg.png",
  vans: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Vans_logo.svg/1200px-Vans_logo.svg.png",
  skechers: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Skechers_logo.svg/1200px-Skechers_logo.svg.png",
  anta: "https://upload.wikimedia.org/wikipedia/commons/3/3f/Anta_Sports_logo.png",
  "li-ning": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Li-Ning_logo.svg/1200px-Li-Ning_logo.svg.png",
  fila: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Fila_logo.svg/1200px-Fila_logo.svg.png",
  
  // 户外品牌
  "the north face": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/The_North_Face_logo.svg/1200px-The_North_Face_logo.svg.png",
  columbia: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Columbia_Sportswear_logo.svg/1200px-Columbia_Sportswear_logo.svg.png",
  lululemon: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Lululemon_athletica_logo.svg/1200px-Lululemon_athletica_logo.svg.png",
  "massimo dutti": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Massimo_Dutti_logo.svg/1200px-Massimo_Dutti_logo.svg.png",
  "mont-bell": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Montbell_logo.svg/1200px-Montbell_logo.svg.png",
  "arc'teryx": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Arc%27teryx_logo.svg/1200px-Arc%27teryx_logo.svg.png",
  keen: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Keen_footwear_logo.svg/1200px-Keen_footwear_logo.svg.png",
  nanamica: "https://upload.wikimedia.org/wikipedia/commons/8/8a/Nanamica_Logo.jpg",
  patagonia: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Patagonia_logo.svg/1200px-Patagonia_logo.svg.png",
  mammut: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Mammut_logo.svg/1200px-Mammut_logo.svg.png",
  salomon: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Salomon_logo.svg/1200px-Salomon_logo.svg.png",
  merrell: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Merrell_logo.svg/1200px-Merrell_logo.svg.png",
  hoka: "https://upload.wikimedia.org/wikipedia/commons/c/c9/HOKA_logo.png",
  on: "https://upload.wikimedia.org/wikipedia/commons/1/1e/ON_logo.png",
  "black diamond": "https://upload.wikimedia.org/wikipedia/commons/f/f7/Black_Diamond_logo.png",
  "snow peak": "https://upload.wikimedia.org/wikipedia/commons/1/10/Snow_Peak_logo.jpg",
  deuter: "https://upload.wikimedia.org/wikipedia/commons/1/12/Deuter_logo.svg",
  osprey: "https://upload.wikimedia.org/wikipedia/commons/3/37/Osprey_Packs_logo.jpg",
  "jack wolfskin": "https://upload.wikimedia.org/wikipedia/commons/e/eb/Jack_Wolfskin_logo.png",
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
