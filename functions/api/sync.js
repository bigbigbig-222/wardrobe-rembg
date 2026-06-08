import {
  corsHeaders,
  jsonResponse,
  verifyJwt,
  readBearerToken,
  loadUser,
} from "./_auth.js";

const GITHUB_API = "https://api.github.com";

function simpleHash(str) {
  let hash = 0;
  const s = typeof str === "string" ? str : JSON.stringify(str);
  for (let i = 0; i < s.length; i += 1) {
    const char = s.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash &= hash;
  }
  return Math.abs(hash).toString(16);
}

function calculateItemHash(item) {
  if (!item) {
    return "";
  }
  const stable = {
    name: item.name,
    brand: item.brand,
    size: item.size,
    price: item.price,
    category: item.category,
    season: item.season,
    color: item.color,
    image: item.image,
  };
  return simpleHash(JSON.stringify(stable));
}

function calculateLookHash(look) {
  if (!look) {
    return "";
  }
  const stable = {
    title: look.title,
    top: look.top,
    bottom: look.bottom,
    shoes: look.shoes,
    accessory: look.accessory,
  };
  return simpleHash(JSON.stringify(stable));
}

function calculateBrandsHash(brands) {
  const sorted = Array.isArray(brands) ? [...brands].sort() : [];
  return simpleHash(JSON.stringify(sorted));
}

function calculateBrandLogosHash(logos) {
  const sorted = {};
  const keys = Object.keys(logos || {}).sort();
  keys.forEach((key) => {
    sorted[key] = logos[key];
  });
  return simpleHash(JSON.stringify(sorted));
}

function buildLightweightIndex(backup) {
  return {
    revision: Number(backup.revision || 0),
    items: (backup.items || []).map((item) => ({
      id: String(item.id || ""),
      hash: calculateItemHash(item),
    })),
    itemsHash: simpleHash(
      JSON.stringify((backup.items || []).map((item) => ({ id: item.id, hash: calculateItemHash(item) })))
    ),
    looks: (backup.favoriteLooks || []).map((look) => ({
      id: String(look.id || ""),
      hash: calculateLookHash(look),
    })),
    looksHash: simpleHash(
      JSON.stringify((backup.favoriteLooks || []).map((look) => ({ id: look.id, hash: calculateLookHash(look) })))
    ),
    brandsHash: calculateBrandsHash(backup.config?.brands),
    brandLogosHash: calculateBrandLogosHash(backup.config?.brandLogos),
  };
}

function normalizeBackup(data) {
  const raw = data && typeof data === "object" ? data : {};
  const config = raw.config && typeof raw.config === "object" ? raw.config : {};
  return {
    version: Number(raw.version || 1),
    exportedAt: raw.exportedAt || new Date().toISOString(),
    scope: raw.scope || "full",
    revision: Number(raw.revision || 0),
    items: Array.isArray(raw.items) ? raw.items : [],
    favoriteLooks: Array.isArray(raw.favoriteLooks) ? raw.favoriteLooks : [],
    config: {
      ...(config || {}),
      brands: Array.isArray(config.brands) ? config.brands : [],
      brandLogos: config.brandLogos && typeof config.brandLogos === "object" ? config.brandLogos : {},
    },
  };
}

function applyDiffPatch(baseData, patch) {
  const next = normalizeBackup(baseData);
  const safePatch = patch && typeof patch === "object" ? patch : {};

  const baselineRevision = Number(safePatch.baselineRevision || 0);
  if (baselineRevision > 0 && baselineRevision !== next.revision) {
    throw new Error(`Conflict: baseline revision ${baselineRevision} does not match current revision ${next.revision}`);
  }

  const itemPatch = safePatch.items && typeof safePatch.items === "object" ? safePatch.items : {};
  const lookPatch = safePatch.favoriteLooks && typeof safePatch.favoriteLooks === "object" ? safePatch.favoriteLooks : {};
  const configPatch = safePatch.config && typeof safePatch.config === "object" ? safePatch.config : {};
  const brandsPatch = configPatch.brands && typeof configPatch.brands === "object" ? configPatch.brands : {};
  const logosPatch = configPatch.brandLogos && typeof configPatch.brandLogos === "object" ? configPatch.brandLogos : {};

  const itemMap = new Map((next.items || []).map((item) => [String(item?.id || ""), item]).filter(([id]) => id));
  (Array.isArray(itemPatch.upsert) ? itemPatch.upsert : []).forEach((item) => {
    const id = String(item?.id || "");
    if (id) {
      itemMap.set(id, item);
    }
  });
  (Array.isArray(itemPatch.deleteIds) ? itemPatch.deleteIds : []).forEach((id) => {
    itemMap.delete(String(id || ""));
  });
  next.items = [...itemMap.values()];

  const lookMap = new Map((next.favoriteLooks || []).map((look) => [String(look?.id || ""), look]).filter(([id]) => id));
  (Array.isArray(lookPatch.upsert) ? lookPatch.upsert : []).forEach((look) => {
    const id = String(look?.id || "");
    if (id) {
      lookMap.set(id, look);
    }
  });
  (Array.isArray(lookPatch.deleteIds) ? lookPatch.deleteIds : []).forEach((id) => {
    lookMap.delete(String(id || ""));
  });
  next.favoriteLooks = [...lookMap.values()];

  const currentBrands = Array.isArray(next.config.brands) ? [...next.config.brands] : [];
  const deleteBrandKeys = new Set((Array.isArray(brandsPatch.deleteValues) ? brandsPatch.deleteValues : []).map((name) => String(name || "").trim().toLowerCase()));
  let mergedBrands = currentBrands.filter((name) => {
    const key = String(name || "").trim().toLowerCase();
    return key && !deleteBrandKeys.has(key);
  });
  (Array.isArray(brandsPatch.upsert) ? brandsPatch.upsert : []).forEach((brand) => {
    const value = String(brand || "").trim();
    if (!value) {
      return;
    }
    const exists = mergedBrands.some((entry) => String(entry || "").trim().toLowerCase() === value.toLowerCase());
    if (!exists) {
      mergedBrands.push(value);
    }
  });
  next.config.brands = mergedBrands;

  const mergedLogos = {
    ...(next.config.brandLogos || {}),
  };
  const upsertLogos = logosPatch.upsert && typeof logosPatch.upsert === "object" ? logosPatch.upsert : {};
  Object.keys(upsertLogos).forEach((key) => {
    mergedLogos[key] = String(upsertLogos[key] || "");
  });
  (Array.isArray(logosPatch.deleteKeys) ? logosPatch.deleteKeys : []).forEach((key) => {
    delete mergedLogos[String(key || "")];
  });
  next.config.brandLogos = mergedLogos;

  next.exportedAt = new Date().toISOString();
  next.scope = "full";
  next.revision = (next.revision || 0) + 1;
  return next;
}

async function pullFromGist(githubToken, gistId) {
  const response = await fetch(`${GITHUB_API}/gists/${gistId}`, {
    headers: {
      Authorization: `token ${githubToken}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "Wardrobe-Pages-Function",
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`GitHub API error: ${response.status} - ${errorBody}`);
  }

  const gist = await response.json();
  const file = gist?.files ? Object.values(gist.files)[0] : null;
  if (!file || !file.content) {
    return { items: [], favoriteLooks: [], config: { brands: [], brandLogos: {} }, revision: 0 };
  }

  return JSON.parse(file.content);
}

async function pushToGist(data, githubToken, gistId) {
  const updateResponse = await fetch(`${GITHUB_API}/gists/${gistId}`, {
    method: "PATCH",
    headers: {
      Authorization: `token ${githubToken}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
      "User-Agent": "Wardrobe-Pages-Function",
    },
    body: JSON.stringify({
      files: {
        "wardrobe-backup.json": {
          content: JSON.stringify(data, null, 2),
        },
      },
      description: `Wardrobe backup - ${new Date().toISOString()}`,
    }),
  });

  if (!updateResponse.ok) {
    const errBody = await updateResponse.text();
    throw new Error(`GitHub API error: ${updateResponse.status} - ${errBody}`);
  }

  return { success: true };
}

async function resolveAuthedUser(request, env) {
  if (!env.JWT_SECRET) {
    throw new Error("JWT_SECRET 未配置");
  }
  const token = readBearerToken(request);
  if (!token) {
    return null;
  }
  const payload = await verifyJwt(token, env.JWT_SECRET);
  const user = await loadUser(env, payload.sub);
  if (!user) {
    return null;
  }
  return user;
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const user = await resolveAuthedUser(request, env);
    if (!user?.githubToken || !user?.gistId) {
      return jsonResponse({ error: "未登录或同步配置缺失" }, 401);
    }

    const body = await request.json();
    const action = String(body?.action || "");
    const data = body?.data;

    if (action === "pull") {
      const result = await pullFromGist(user.githubToken, user.gistId);
      return jsonResponse(result);
    }

    if (action === "pull-index") {
      const backup = await pullFromGist(user.githubToken, user.gistId);
      const result = buildLightweightIndex(normalizeBackup(backup));
      return jsonResponse(result);
    }

    if (action === "push") {
      const result = await pushToGist(data, user.githubToken, user.gistId);
      return jsonResponse(result);
    }

    if (action === "push-diff") {
      const current = await pullFromGist(user.githubToken, user.gistId);
      const next = applyDiffPatch(current, data || {});
      const result = await pushToGist(next, user.githubToken, user.gistId);
      return jsonResponse(result);
    }

    return jsonResponse({ error: "Invalid action" }, 400);
  } catch (error) {
    return jsonResponse({ error: error.message || "同步失败" }, 500);
  }
}
