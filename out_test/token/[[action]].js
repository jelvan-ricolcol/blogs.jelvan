(() => {
  // functions/api/token/[[action]].ts
  var CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };
  var json = (body, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS }
  });
  var adminSecret = (env) => env.ADMIN_PASSWORD || env.VITE_ADMIN_PASSWORD || "";
  var isAuthorized = (request, env) => {
    const secret = adminSecret(env);
    if (!secret) return false;
    const authHeader = request.headers.get("Authorization")?.trim() || "";
    const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : authHeader;
    return token === secret;
  };
  var onRequestOptions = async () => new Response(null, { headers: CORS_HEADERS });
  var onRequest = async (context) => {
    try {
      if (!isAuthorized(context.request, context.env)) {
        return json({ error: "Unauthorized access" }, 401);
      }
      const { request, env, params } = context;
      const url = new URL(request.url);
      const action = Array.isArray(params.action) ? params.action[0] : params.action;
      if (request.method === "GET" && action === "status") {
        const jti = url.searchParams.get("jti");
        if (!jti) return json({ error: "Missing jti" }, 400);
        const recStr = await env.TOKEN_KV.get(`token:${jti}`);
        const rec = recStr ? JSON.parse(recStr) : null;
        return json({ found: !!rec, record: rec || null });
      }
      if (request.method === "POST" && action === "store") {
        let body;
        try {
          body = await request.json();
        } catch (e) {
          return json({ error: "Invalid JSON" }, 400);
        }
        const { jti, sub, issued_at, expires_at, meta } = body || {};
        if (!jti || !issued_at) return json({ error: "Missing jti or issued_at" }, 400);
        const record = { jti, sub: sub || null, issued_at, expires_at: expires_at || null, meta: meta || null, revoked: false };
        const options = {};
        if (expires_at) {
          const exp = Math.floor(new Date(expires_at).getTime() / 1e3);
          if (!isNaN(exp)) options.expiration = exp;
        }
        await env.TOKEN_KV.put(`token:${jti}`, JSON.stringify(record), options);
        return json({ ok: true, record });
      }
      if (request.method === "POST" && action === "revoke") {
        let body;
        try {
          body = await request.json();
        } catch (e) {
          return json({ error: "Invalid JSON" }, 400);
        }
        const { jti } = body || {};
        if (!jti) return json({ error: "Missing jti" }, 400);
        const recStr = await env.TOKEN_KV.get(`token:${jti}`);
        if (!recStr) return json({ error: "Not found" }, 404);
        const rec = JSON.parse(recStr);
        rec.revoked = true;
        const options = {};
        if (rec.expires_at) {
          const exp = Math.floor(new Date(rec.expires_at).getTime() / 1e3);
          if (!isNaN(exp)) options.expiration = exp;
        }
        await env.TOKEN_KV.put(`token:${jti}`, JSON.stringify(rec), options);
        return json({ ok: true, record: rec });
      }
      return json({ error: "Not found" }, 404);
    } catch (err) {
      console.error("Error processing token action:", err);
      return json({ error: "Failed to process token audit" }, 500);
    }
  };
})();
