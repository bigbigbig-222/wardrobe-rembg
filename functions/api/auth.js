import {
  corsHeaders,
  jsonResponse,
  hashPassword,
  createJwt,
  verifyJwt,
  readBearerToken,
  loadUser,
  saveUser,
  ensureValidRegistrationInput,
  normalizeUsername,
} from "./_auth.js";

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

  if (!env.JWT_SECRET) {
    return jsonResponse({ error: "JWT_SECRET 未配置" }, 500);
  }

  try {
    const body = await request.json();
    const action = String(body?.action || "").trim();
    const data = body?.data || {};

    if (action === "register") {
      const { username, password, gistId, githubToken } = ensureValidRegistrationInput(data);
      const exists = await loadUser(env, username);
      if (exists) {
        return jsonResponse({ error: "用户名已存在" }, 409);
      }

      const pwd = await hashPassword(password);
      const now = new Date().toISOString();
      await saveUser(env, username, {
        username,
        passwordHash: pwd.hash,
        passwordSalt: pwd.salt,
        gistId,
        githubToken,
        createdAt: now,
        updatedAt: now,
      });

      const token = await createJwt({ sub: username }, env.JWT_SECRET);
      return jsonResponse({ token, username });
    }

    if (action === "login") {
      const username = normalizeUsername(data?.username);
      const password = String(data?.password || "");
      if (!username || !password) {
        return jsonResponse({ error: "用户名和密码不能为空" }, 400);
      }

      const user = await loadUser(env, username);
      if (!user) {
        return jsonResponse({ error: "用户名或密码错误" }, 401);
      }

      const pwd = await hashPassword(password, user.passwordSalt);
      if (pwd.hash !== user.passwordHash) {
        return jsonResponse({ error: "用户名或密码错误" }, 401);
      }

      const token = await createJwt({ sub: username }, env.JWT_SECRET);
      return jsonResponse({ token, username: user.username });
    }

    if (action === "me") {
      const bearer = readBearerToken(request);
      if (!bearer) {
        return jsonResponse({ error: "未登录" }, 401);
      }
      const payload = await verifyJwt(bearer, env.JWT_SECRET);
      const user = await loadUser(env, payload.sub);
      if (!user) {
        return jsonResponse({ error: "用户不存在" }, 401);
      }
      return jsonResponse({
        username: user.username,
        gistId: user.gistId,
      });
    }

    return jsonResponse({ error: "Invalid action" }, 400);
  } catch (error) {
    return jsonResponse({ error: error.message || "认证失败" }, 500);
  }
}
