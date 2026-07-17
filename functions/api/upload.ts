interface Env {
  MEDIA_BUCKET: R2Bucket;
  ADMIN_PASSWORD?: string;
  VITE_ADMIN_PASSWORD?: string;
  PUBLIC_MEDIA_BASE_URL?: string;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
  "application/pdf"
]);

const MAX_FILE_SIZE = 50 * 1024 * 1024;

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

const normalizeFileName = (fileName: string) =>
  fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

const toPublicUrl = (key: string, env: Env) => {
  const base = (env.PUBLIC_MEDIA_BASE_URL || "https://media.jelvan.pro").replace(/\/+$/, "");
  return `${base}/${key}`;
};

export const onRequestOptions: PagesFunction<Env> = async () =>
  new Response(null, { headers: CORS_HEADERS });

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    if (!isAuthorized(context.request, context.env)) {
      return json({ error: "Unauthorized" }, 401);
    }

    const formData = await context.request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return json({ error: "No file provided" }, 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      return json({ error: "File too large (max 50MB)" }, 413);
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return json({ error: "File type not allowed" }, 415);
    }

    const normalized = normalizeFileName(file.name || "file");
    const fileKey = `uploads/${Date.now()}-${crypto.randomUUID()}-${normalized}`;

    await context.env.MEDIA_BUCKET.put(fileKey, file.stream(), {
      httpMetadata: {
        contentType: file.type,
        cacheControl: "public, max-age=31536000"
      }
    });

    return json({
      success: true,
      key: fileKey,
      url: toPublicUrl(fileKey, context.env)
    });
  } catch (err: any) {
    return json({ error: err.message || "Failed to upload file" }, 500);
  }
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    if (!isAuthorized(context.request, context.env)) {
      return json({ error: "Unauthorized" }, 401);
    }

    const list = await context.env.MEDIA_BUCKET.list({ prefix: "uploads/" });
    const files = list.objects.map((obj) => ({
      key: obj.key,
      size: obj.size,
      uploadedAt: obj.uploaded,
      url: toPublicUrl(obj.key, context.env)
    }));

    return json({ success: true, files, total: files.length });
  } catch (err: any) {
    return json({ error: err.message || "Failed to list files" }, 500);
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  try {
    if (!isAuthorized(context.request, context.env)) {
      return json({ error: "Unauthorized" }, 401);
    }

    const key = new URL(context.request.url).searchParams.get("key");
    if (!key || !key.startsWith("uploads/")) {
      return json({ error: "Invalid key query parameter" }, 400);
    }

    await context.env.MEDIA_BUCKET.delete(key);
    return json({ success: true });
  } catch (err: any) {
    return json({ error: err.message || "Failed to delete file" }, 500);
  }
};
