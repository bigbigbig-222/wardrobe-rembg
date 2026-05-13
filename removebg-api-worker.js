/**
 * Cloudflare Worker - remove.bg API 代理
 * 
 * 用途：安全地调用 remove.bg API（API Key 不暴露在前端）
 * 
 * 部署步骤：
 * 1. 在 Cloudflare Dashboard 创建新 Worker，名称：wardrobe-removebg-api
 * 2. 复制本文件内容到 Worker 编辑器
 * 3. 进入 Settings > Variables and Secrets，添加：
 *    - Secret：REMOVEBG_API_KEY = 你的 remove.bg API Key
 * 4. 部署
 * 
 * 获取 API Key：https://remove.bg/api
 */

const REMOVEBG_API = 'https://api.remove.bg/v1.0/removebg';

function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

async function removeBackground(imageBase64, env) {
  try {
    const apiKey = env.REMOVEBG_API_KEY;
    if (!apiKey) {
      throw new Error('API Key not configured');
    }

    // 构建 multipart/form-data
    const formData = new FormData();
    
    // 从 base64 创建 Blob
    const binaryString = atob(imageBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const imageBlob = new Blob([bytes], { type: 'image/jpeg' });
    
    formData.append('image_file', imageBlob, 'image.jpg');
    formData.append('size', 'auto');
    formData.append('format', 'PNG');
    formData.append('type', 'auto');

    const response = await fetch(REMOVEBG_API, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`remove.bg API error: ${response.status} - ${errorText}`);
    }

    // 获取二进制 PNG 数据
    const pngBuffer = await response.arrayBuffer();
    const base64Png = btoa(String.fromCharCode(...new Uint8Array(pngBuffer)));

    return {
      success: true,
      image: `data:image/png;base64,${base64Png}`,
    };
  } catch (error) {
    console.error('Background removal error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

async function handleRequest(request, env) {
  const corsHeaders = getCorsHeaders();

  // 处理 CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  // 只处理 POST
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { image } = body;

    if (!image) {
      return new Response(JSON.stringify({ error: 'Missing image data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 从 data URL 中提取 base64（如果有）
    let imageBase64 = image;
    if (image.startsWith('data:')) {
      imageBase64 = image.split(',')[1];
    }

    const result = await removeBackground(imageBase64, env);

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Worker error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

export default {
  fetch(request, env, ctx) {
    return handleRequest(request, env);
  },
};
