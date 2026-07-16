// Cloudflare Worker for R2 uploads and Cloudflare Cache purge

export interface Env {
  R2_BUCKET: R2Bucket;
  CLOUDFARE_S3_ENDPOINT: string;
  CLOUDFARE_API_TOKEN: string;
  CLOUDFARE_ZONE_ID: string;
  BACKEND_AUTH_TOKEN: string;
}

function jsonResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === '/health' && request.method === 'GET') {
      return jsonResponse({ ok: true, timestamp: Date.now() });
    }

    // Require auth for admin endpoints
    const requireAuth = (req: Request) => {
      const provided = req.headers.get('x-backend-auth') || req.headers.get('authorization')?.replace(/^Bearer\s+/, '') || '';
      if (!env.BACKEND_AUTH_TOKEN) return false;
      return provided === env.BACKEND_AUTH_TOKEN;
    };

    // Upload endpoint
    if (url.pathname === '/upload' && request.method === 'POST') {
      if (!requireAuth(request)) return new Response('Unauthorized', { status: 401 });

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

        // Construct public URL using provided S3 endpoint secret. The endpoint should be the base endpoint without a trailing slash.
        // Example endpoint: https://<account-id>.r2.cloudflarestorage.com
        const baseEndpoint = (env.CLOUDFARE_S3_ENDPOINT || '').replace(/\/$/, '');
        const publicUrl = baseEndpoint ? `${baseEndpoint}/${key}` : null;

        return jsonResponse({ key, url: publicUrl });
      } catch (err) {
        return jsonResponse({ error: 'Upload failed', details: String(err) }, 500);
      }
    }

    // Purge cache endpoint
    if (url.pathname === '/purge' && request.method === 'POST') {
      if (!requireAuth(request)) return new Response('Unauthorized', { status: 401 });

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
