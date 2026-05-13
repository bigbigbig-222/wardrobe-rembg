/**
 * Cloudflare Worker - GitHub Sync 中间层
 * 
 * 部署步骤：
 * 1. 注册 Cloudflare 账号 (https://dash.cloudflare.com)
 * 2. 创建 Worker (Workers & Pages > Create application > Create a Worker)
 * 3. 复制本文件内容到 Worker 编辑器
 * 4. 修改下方的 GITHUB_TOKEN 和 GIST_ID（填入你自己的）
 * 5. 部署
 * 6. 复制 Worker URL，在网页设置中填入
 * 
 * 获取 GitHub Token 和 Gist ID：
 * - Token: https://github.com/settings/tokens 创建 Personal Access Token (scopes: gist)
 * - Gist ID: 创建私有 Gist 后，URL 中的 ID 部分
 */

// Token 和 Gist ID 通过 Cloudflare Worker 环境变量注入（Settings > Variables and Secrets）
// GITHUB_TOKEN 和 GIST_ID 不再硬编码在代码中
const GITHUB_API = 'https://api.github.com';

/**
 * 处理跨域请求
 */
function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

/**
 * 从 GitHub Gist 拉取数据
 */
async function pullFromGist(token, gistId) {
  try {
    const response = await fetch(`${GITHUB_API}/gists/${gistId}`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Cloudflare-Worker',
      },
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`GitHub API error: ${response.status} - ${errBody}`);
    }

    const gist = await response.json();
    const file = Object.values(gist.files)[0]; // 获取第一个文件
    
    if (!file) {
      return { items: [], favoriteLooks: [] };
    }

    const data = JSON.parse(file.content);
    return data;
  } catch (error) {
    console.error('Pull error:', error);
    throw error;
  }
}

function simpleHash(str) {
  let hash = 0;
  const s = typeof str === 'string' ? str : JSON.stringify(str);
  for (let i = 0; i < s.length; i++) {
    const char = s.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

function calculateItemHash(item) {
  if (!item) return '';
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
  if (!look) return '';
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
      id: String(item.id || ''),
      hash: calculateItemHash(item),
    })),
    itemsHash: simpleHash(
      JSON.stringify((backup.items || []).map((item) => ({ id: item.id, hash: calculateItemHash(item) })))
    ),
    looks: (backup.favoriteLooks || []).map((look) => ({
      id: String(look.id || ''),
      hash: calculateLookHash(look),
    })),
    looksHash: simpleHash(
      JSON.stringify((backup.favoriteLooks || []).map((look) => ({ id: look.id, hash: calculateLookHash(look) })))
    ),
    brandsHash: calculateBrandsHash(backup.config?.brands),
    brandLogosHash: calculateBrandLogosHash(backup.config?.brandLogos),
  };
}

async function pullIndex(token, gistId) {
  const backup = await pullFromGist(token, gistId);
  return buildLightweightIndex(backup);
}

function normalizeBackup(data) {
  const raw = data && typeof data === 'object' ? data : {};
  const config = raw.config && typeof raw.config === 'object' ? raw.config : {};
  return {
    version: Number(raw.version || 1),
    exportedAt: raw.exportedAt || new Date().toISOString(),
    scope: raw.scope || 'full',
    revision: Number(raw.revision || 0),
    items: Array.isArray(raw.items) ? raw.items : [],
    favoriteLooks: Array.isArray(raw.favoriteLooks) ? raw.favoriteLooks : [],
    config: {
      ...(config || {}),
      brands: Array.isArray(config.brands) ? config.brands : [],
      brandLogos: config.brandLogos && typeof config.brandLogos === 'object' ? config.brandLogos : {},
    },
  };
}

function applyDiffPatch(baseData, patch) {
  const next = normalizeBackup(baseData);
  const safePatch = patch && typeof patch === 'object' ? patch : {};

  // 验证修订号（可选的乐观并发控制）
  const baselineRevision = Number(safePatch.baselineRevision || 0);
  if (baselineRevision > 0 && baselineRevision !== next.revision) {
    throw new Error(`Conflict: baseline revision ${baselineRevision} does not match current revision ${next.revision}`);
  }

  const itemPatch = safePatch.items && typeof safePatch.items === 'object' ? safePatch.items : {};
  const lookPatch = safePatch.favoriteLooks && typeof safePatch.favoriteLooks === 'object' ? safePatch.favoriteLooks : {};
  const configPatch = safePatch.config && typeof safePatch.config === 'object' ? safePatch.config : {};
  const brandsPatch = configPatch.brands && typeof configPatch.brands === 'object' ? configPatch.brands : {};
  const logosPatch = configPatch.brandLogos && typeof configPatch.brandLogos === 'object' ? configPatch.brandLogos : {};

  const itemMap = new Map((next.items || []).map((item) => [String(item?.id || ''), item]).filter(([id]) => id));
  (Array.isArray(itemPatch.upsert) ? itemPatch.upsert : []).forEach((item) => {
    const id = String(item?.id || '');
    if (id) {
      itemMap.set(id, item);
    }
  });
  (Array.isArray(itemPatch.deleteIds) ? itemPatch.deleteIds : []).forEach((id) => {
    itemMap.delete(String(id || ''));
  });
  next.items = [...itemMap.values()];

  const lookMap = new Map((next.favoriteLooks || []).map((look) => [String(look?.id || ''), look]).filter(([id]) => id));
  (Array.isArray(lookPatch.upsert) ? lookPatch.upsert : []).forEach((look) => {
    const id = String(look?.id || '');
    if (id) {
      lookMap.set(id, look);
    }
  });
  (Array.isArray(lookPatch.deleteIds) ? lookPatch.deleteIds : []).forEach((id) => {
    lookMap.delete(String(id || ''));
  });
  next.favoriteLooks = [...lookMap.values()];

  const currentBrands = Array.isArray(next.config.brands) ? [...next.config.brands] : [];
  const deleteBrandKeys = new Set((Array.isArray(brandsPatch.deleteValues) ? brandsPatch.deleteValues : []).map((name) => String(name || '').trim().toLowerCase()));
  let mergedBrands = currentBrands.filter((name) => {
    const key = String(name || '').trim().toLowerCase();
    return key && !deleteBrandKeys.has(key);
  });
  (Array.isArray(brandsPatch.upsert) ? brandsPatch.upsert : []).forEach((brand) => {
    const value = String(brand || '').trim();
    if (!value) {
      return;
    }
    const exists = mergedBrands.some((entry) => String(entry || '').trim().toLowerCase() === value.toLowerCase());
    if (!exists) {
      mergedBrands.push(value);
    }
  });
  next.config.brands = mergedBrands;

  const mergedLogos = {
    ...(next.config.brandLogos || {}),
  };
  const upsertLogos = logosPatch.upsert && typeof logosPatch.upsert === 'object' ? logosPatch.upsert : {};
  Object.keys(upsertLogos).forEach((key) => {
    mergedLogos[key] = String(upsertLogos[key] || '');
  });
  (Array.isArray(logosPatch.deleteKeys) ? logosPatch.deleteKeys : []).forEach((key) => {
    delete mergedLogos[String(key || '')];
  });
  next.config.brandLogos = mergedLogos;

  next.exportedAt = new Date().toISOString();
  next.scope = 'full';
  next.revision = (next.revision || 0) + 1;
  return next;
}

/**
 * 推送数据到 GitHub Gist
 */
async function pushToGist(data, token, gistId) {
  try {
    // 先获取当前 Gist，获取其 version
    const getResponse = await fetch(`${GITHUB_API}/gists/${gistId}`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Cloudflare-Worker',
      },
    });

    if (!getResponse.ok) {
      const errBody = await getResponse.text();
      throw new Error(`GitHub API error: ${getResponse.status} - ${errBody}`);
    }

    const updateResponse = await fetch(`${GITHUB_API}/gists/${gistId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Cloudflare-Worker',
      },
      body: JSON.stringify({
        files: {
          'wardrobe-backup.json': {
            content: JSON.stringify(data, null, 2),
          },
        },
        description: `Wardrobe backup - ${new Date().toISOString()}`,
      }),
    });

    if (!updateResponse.ok) {
      throw new Error(`GitHub API error: ${updateResponse.status}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Push error:', error);
    throw error;
  }
}

async function pushDiffToGist(diffPatch, token, gistId) {
  const current = await pullFromGist(token, gistId);
  const next = applyDiffPatch(current, diffPatch);
  return pushToGist(next, token, gistId);
}

/**
 * Cloudflare Worker 事件处理
 */
async function handleRequest(request, env) {
  const corsHeaders = getCorsHeaders();
  
  // 处理 CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  // 只处理 POST 请求
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // 从环境变量获取 Token 和 Gist ID
    const token = env.GITHUB_TOKEN;
    const gistId = env.GIST_ID;

    if (!token || !gistId) {
      return new Response(JSON.stringify({ error: 'Worker env vars GITHUB_TOKEN or GIST_ID not set' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { action, data } = body;

    let result;

    if (action === 'pull') {
      // 从 GitHub 拉取全量数据
      result = await pullFromGist(token, gistId);
    } else if (action === 'pull-index') {
      // 从 GitHub 拉取轻量索引（低带宽）
      result = await pullIndex(token, gistId);
    } else if (action === 'push') {
      // 推送全量数据到 GitHub
      result = await pushToGist(data, token, gistId);
    } else if (action === 'push-diff') {
      // 推送差异补丁到 GitHub（只更新变更项）
      result = await pushDiffToGist(data, token, gistId);
    } else {
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Worker error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
}

export default {
  fetch(request, env, ctx) {
    return handleRequest(request, env);
  },
};
