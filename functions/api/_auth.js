const encoder = new TextEncoder();

export function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(),
      "Content-Type": "application/json",
    },
  });
}

export function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidUsername(username) {
  return /^[a-zA-Z0-9_-]{3,30}$/.test(username);
}

function base64UrlEncode(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(str) {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function hashPassword(password, saltBase64 = null) {
  const pwd = String(password || "");
  if (pwd.length < 6) {
    throw new Error("密码至少6位");
  }

  const salt = saltBase64
    ? base64UrlDecode(saltBase64)
    : crypto.getRandomValues(new Uint8Array(16));

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(pwd),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 120000,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );

  return {
    hash: base64UrlEncode(new Uint8Array(bits)),
    salt: base64UrlEncode(salt),
  };
}

export async function createJwt(payload, secret, expiresInSeconds = 7 * 24 * 60 * 60) {
  const now = Math.floor(Date.now() / 1000);
  const body = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const headerPart = base64UrlEncode(encoder.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const payloadPart = base64UrlEncode(encoder.encode(JSON.stringify(body)));
  const signingInput = `${headerPart}.${payloadPart}`;

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(signingInput));
  const signaturePart = base64UrlEncode(new Uint8Array(signature));
  return `${signingInput}.${signaturePart}`;
}

export async function verifyJwt(token, secret) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) {
    throw new Error("Token 格式无效");
  }

  const [headerPart, payloadPart, signaturePart] = parts;
  const signingInput = `${headerPart}.${payloadPart}`;

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const expected = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(signingInput));
  const expectedPart = base64UrlEncode(new Uint8Array(expected));

  if (!timingSafeEqual(expectedPart, signaturePart)) {
    throw new Error("Token 签名无效");
  }

  const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadPart)));
  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp < now) {
    throw new Error("Token 已过期");
  }

  return payload;
}

export function readBearerToken(request) {
  const auth = String(request.headers.get("Authorization") || "").trim();
  if (!auth.startsWith("Bearer ")) {
    return "";
  }
  return auth.slice("Bearer ".length).trim();
}

export async function loadUser(env, username) {
  const normalized = normalizeUsername(username);
  if (!normalized || !isValidUsername(normalized)) {
    return null;
  }
  if (!env.USERS_KV) {
    throw new Error("USERS_KV 未配置");
  }
  return env.USERS_KV.get(`user:${normalized}`, "json");
}

export async function saveUser(env, username, userRecord) {
  const normalized = normalizeUsername(username);
  if (!normalized || !isValidUsername(normalized)) {
    throw new Error("用户名格式无效");
  }
  if (!env.USERS_KV) {
    throw new Error("USERS_KV 未配置");
  }
  await env.USERS_KV.put(`user:${normalized}`, JSON.stringify(userRecord));
}

export function ensureValidRegistrationInput(data) {
  const username = normalizeUsername(data?.username);
  const password = String(data?.password || "");
  const gistId = String(data?.gistId || "").trim();
  const githubToken = String(data?.githubToken || "").trim();

  if (!isValidUsername(username)) {
    throw new Error("用户名需为3-30位字母/数字/下划线/短横线");
  }
  if (password.length < 6) {
    throw new Error("密码至少6位");
  }
  if (!gistId) {
    throw new Error("缺少 Gist ID");
  }
  if (!githubToken) {
    throw new Error("缺少 GitHub Token");
  }

  return { username, password, gistId, githubToken };
}
