interface Env {
  TOKEN_KV: KVNamespace;
  ADMIN_PASSWORD?: string;
  VITE_ADMIN_PASSWORD?: string;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS }
  });

const adminSecret = (env: Env) => env.ADMIN_PASSWORD || env.VITE_ADMIN_PASSWORD || "";

const isAuthorized = (request: Request, env: Env) => {
  const secret = adminSecret(env);
  if (!secret) return false;

  const authHeader = request.headers.get("Authorization")?.trim() || "";
  const token = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : authHeader;

  return token === secret;
};

export const onRequestOptions: PagesFunction<Env> = async () =>
  new Response(null, { headers: CORS_HEADERS });

export const onRequest: PagesFunction<Env> = async (context) => {
  try {
    if (!isAuthorized(context.request, context.env)) {
      return json({ error: "Unauthorized access" }, 401);
    }

    const { request, env, params } = context;
    const url = new URL(request.url);
    const action = Array.isArray(params.action) ? params.action[0] : params.action;

    if (request.method === 'GET' && action === 'status') {
      const jti = url.searchParams.get('jti');
      if (!jti) return json({ error: 'Missing jti' }, 400);
      const recStr = await env.TOKEN_KV.get(`token:${jti}`);
      const rec = recStr ? JSON.parse(recStr) : null;
      return json({ found: !!rec, record: rec || null });
    }

    if (request.method === 'POST' && action === 'store') {
      let body: any;
      try {
        body = await request.json();
      } catch (e) {
        return json({ error: 'Invalid JSON' }, 400);
      }
      const { jti, sub, issued_at, expires_at, meta } = body || {};
      if (!jti || !issued_at) return json({ error: 'Missing jti or issued_at' }, 400);

      const record = { jti, sub: sub || null, issued_at, expires_at: expires_at || null, meta: meta || null, revoked: false };
      
      const options: KVNamespacePutOptions = {};
      if (expires_at) {
        const exp = Math.floor(new Date(expires_at).getTime() / 1000);
        if (!isNaN(exp)) options.expiration = exp;
      }
      
      await env.TOKEN_KV.put(`token:${jti}`, JSON.stringify(record), options);
      return json({ ok: true, record });
    }

    if (request.method === 'POST' && action === 'revoke') {
      let body: any;
      try {
        body = await request.json();
      } catch (e) {
        return json({ error: 'Invalid JSON' }, 400);
      }
      const { jti } = body || {};
      if (!jti) return json({ error: 'Missing jti' }, 400);
      const recStr = await env.TOKEN_KV.get(`token:${jti}`);
      if (!recStr) return json({ error: 'Not found' }, 404);
      
      const rec = JSON.parse(recStr);
      rec.revoked = true;
      
      const options: KVNamespacePutOptions = {};
      if (rec.expires_at) {
        const exp = Math.floor(new Date(rec.expires_at).getTime() / 1000);
        if (!isNaN(exp)) options.expiration = exp;
      }
      
      await env.TOKEN_KV.put(`token:${jti}`, JSON.stringify(rec), options);
      return json({ ok: true, record: rec });
    }

    return json({ error: 'Not found' }, 404);
  } catch (err: any) {
    return json({ error: err.message || "Failed to process token audit" }, 500);
  }
};
