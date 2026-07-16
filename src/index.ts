// Cloudflare Worker for R2 uploads and Cloudflare Cache purge
// Enhanced auth: validates Cloudflare Access JWT (RS256 via JWKS) OR short-lived HS256 JWTs signed with BACKEND_JWT_SECRET

export interface Env {
  R2_BUCKET: R2Bucket;
  CLOUDFARE_S3_ENDPOINT: string;
  CLOUDFARE_API_TOKEN: string;
  CLOUDFARE_ZONE_ID: string;
  BACKEND_JWT_SECRET?: string;
  CF_ACCESS_JWKS_URL?: string;
}

function jsonResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Simple in-memory JWKS cache
let jwksCache: { jwks: any; fetchedAt: number; ttl: number } | null = null;

async function fetchJwks(url: string) {
  const now = Date.now();
  if (jwksCache && now - jwksCache.fetchedAt < jwksCache.ttl) return jwksCache.jwks;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch JWKS');
  const jwks = await res.json();
  jwksCache = { jwks, fetchedAt: now, ttl: 5 * 60 * 1000 }; // 5 minutes
  return jwks;
}

function base64UrlDecode(input: string) {
  // Pad string
  input = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = input.length % 4;
  if (pad === 2) input += '==';
  else if (pad === 3) input += '=';
  else if (pad !== 0) input += '===';
  const str = atob(input);
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
  return bytes.buffer;
}

function utf8ToUint8Array(str: string) {
  return new TextEncoder().encode(str);
}

async function verifyHs256(token: string, secret: string) {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [headerB64, payloadB64, signatureB64] = parts;
  const signingInput = utf8ToUint8Array(`${headerB64}.${payloadB64}`);
  const signature = new Uint8Array(base64UrlDecode(signatureB64));
  const keyData = utf8ToUint8Array(secret);
  const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const verified = await crypto.subtle.verify('HMAC', key, signature, signingInput);
  return verified;
}

async function importJwkToCryptoKey(jwk: any) {
  // Directly import JWK using subtle.importKey
  // Ensure usage matches
  const alg = jwk.alg || 'RS256';
  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
  return key;
}

async function verifyRs256(token: string, jwksUrl: string) {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [headerB64, payloadB64, signatureB64] = parts;
  const headerJson = JSON.parse(new TextDecoder().decode(new Uint8Array(base64UrlDecode(headerB64))));
  const kid = headerJson.kid;
  if (!kid) throw new Error('No kid in token header');

  const jwks = await fetchJwks(jwksUrl);
  const keyEntry = (jwks.keys || []).find((k: any) => k.kid === kid);
  if (!keyEntry) throw new Error('No matching JWK for kid');

  // import JWK and verify
  const cryptoKey = await importJwkToCryptoKey(keyEntry);
  const signingInput = utf8ToUint8Array(`${headerB64}.${payloadB64}`);
  const signature = new Uint8Array(base64UrlDecode(signatureB64));
  const verified = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', cryptoKey, signature, signingInput);
  return verified;
}

async function validateJwtAndClaims(token: string, env: Env) {
  // Parse payload to validate exp claim
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const payload = JSON.parse(new TextDecoder().decode(new Uint8Array(base64UrlDecode(parts[1]))));

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && now > payload.exp) return false;
  if (payload.nbf && now < payload.nbf) return false;

  // Verify signature
  const alg = JSON.parse(new TextDecoder().decode(new Uint8Array(base64UrlDecode(parts[0])))).alg;
  if (alg === 'HS256') {
    if (!env.BACKEND_JWT_SECRET) throw new Error('BACKEND_JWT_SECRET not configured');
    return await verifyHs256(token, env.BACKEND_JWT_SECRET);
  }
  if (alg === 'RS256') {
    if (!env.CF_ACCESS_JWKS_URL) {
      // No JWKS URL configured, cannot verify signature. Reject by default for RS256 when JWKS absent.
      throw new Error('RS256 token received but CF_ACCESS_JWKS_URL is not configured');
    }
    return await verifyRs256(token, env.CF_ACCESS_JWKS_URL);
  }
  // unsupported alg
  throw new Error('Unsupported JWT alg');
}

async function requireAuth(req: Request, env: Env) {
  // Priority: Cloudflare Access header Cf-Access-Jwt-Assertion
  const accessJwt = req.headers.get('Cf-Access-Jwt-Assertion') || req.headers.get('cf-access-jwt-assertion');
  if (accessJwt) {
    try {
      if (env.CF_ACCESS_JWKS_URL) {
        const ok = await validateJwtAndClaims(accessJwt, env);
        return ok;
      }
      // No JWKS URL configured: rely on Cloudflare Access enforcement (header is only set when Access is enforced)
      // Still validate exp/nbf claims without signature
      const parts = accessJwt.split('.');
      if (parts.length !== 3) return false;
      const payload = JSON.parse(new TextDecoder().decode(new Uint8Array(base64UrlDecode(parts[1]))));
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && now > payload.exp) return false;
      if (payload.nbf && now < payload.nbf) return false;
      return true;
    } catch (e) {
      console.error('Access JWT validation failed', String(e));
      return false;
    }
  }

  // Fallback: Authorization: Bearer <JWT>
  const auth = req.headers.get('authorization') || '';
  const bearer = auth.replace(/^Bearer\s+/i, '');
  if (bearer) {
    try {
      const ok = await validateJwtAndClaims(bearer, env);
      return ok;
    } catch (e) {
      console.error('Bearer JWT validation failed', String(e));
      return false;
    }
  }

  return false;
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === '/health' && request.method === 'GET') {
      return jsonResponse({ ok: true, timestamp: Date.now() });
    }

    // Upload endpoint
    if (url.pathname === '/upload' && request.method === 'POST') {
      const authorized = await requireAuth(request, env);
      if (!authorized) return new Response('Unauthorized', { status: 401 });

      const contentType = request.headers.get('content-type') || '';
      if (!contentType.includes('multipart/form-data') && !contentType.includes('form-data')) {
        return jsonResponse({ error: 'Content-Type must be multipart/form-data with a file field named "file"' }, 400);
      }

      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      if (!file) return jsonResponse({ error: 'Missing file field' }, 400);

      const filename = (file as File).name || 'upload.bin';
      const key = `uploads/${Date.now()}-${crypto.randomUUID()}-${filename}`;

      const arrayBuffer = await (file as File).arrayBuffer();

      try {
        await env.R2_BUCKET.put(key, arrayBuffer, {
          httpMetadata: { contentType: (file as File).type || 'application/octet-stream' },
        });

        const baseEndpoint = (env.CLOUDFARE_S3_ENDPOINT || '').replace(/\/$/, '');
        const publicUrl = baseEndpoint ? `${baseEndpoint}/${key}` : null;

        return jsonResponse({ key, url: publicUrl });
      } catch (err) {
        return jsonResponse({ error: 'Upload failed', details: String(err) }, 500);
      }
    }

    // Purge cache endpoint
    if (url.pathname === '/purge' && request.method === 'POST') {
      const authorized = await requireAuth(request, env);
      if (!authorized) return new Response('Unauthorized', { status: 401 });

      if (!env.CLOUDFARE_API_TOKEN) return jsonResponse({ error: 'CLOUDFARE_API_TOKEN not configured' }, 500);
      if (!env.CLOUDFARE_ZONE_ID) return jsonResponse({ error: 'CLOUDFARE_ZONE_ID not configured' }, 500);

      let body: any;
      try {
        body = await request.json();
      } catch (e) {
        return jsonResponse({ error: 'Invalid JSON' }, 400);
      }

      const purgeEverything = !!body.purge_everything;
      const files = Array.isArray(body.files) ? body.files : undefined;

      const purgeUrl = `https://api.cloudflare.com/client/v4/zones/${env.CLOUDFARE_ZONE_ID}/purge_cache`;
      const payload = purgeEverything ? { purge_everything: true } : { files };

      if (!purgeEverything && (!files || files.length === 0)) {
        return jsonResponse({ error: 'Provide files array or set purge_everything to true' }, 400);
      }

      try {
        const resp = await fetch(purgeUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env.CLOUDFARE_API_TOKEN}`,
          },
          body: JSON.stringify(payload),
        });

        const result = await resp.json();
        if (!resp.ok || !result.success) {
          return jsonResponse({ error: 'Cloudflare purge failed', details: result }, 500);
        }
        return jsonResponse({ success: true, result });
      } catch (err) {
        return jsonResponse({ error: 'Purge request failed', details: String(err) }, 500);
      }
    }

    return new Response('Not found', { status: 404 });
  },
};
