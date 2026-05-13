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
      // 从 GitHub 拉取数据
      result = await pullFromGist(token, gistId);
    } else if (action === 'push') {
      // 推送数据到 GitHub
      result = await pushToGist(data, token, gistId);
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
