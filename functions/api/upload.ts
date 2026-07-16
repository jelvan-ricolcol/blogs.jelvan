// functions/api/upload.ts
// Media upload handler for R2 bucket storage

interface Env {
  MEDIA_BUCKET: R2Bucket;
  KV: KVNamespace;
  VITE_ADMIN_PASSWORD: string;
}

// OPTIONS handler for CORS preflight
export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
};

// POST handler - Upload file to R2
export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const authHeader = context.request.headers.get("Authorization");
    const adminPassword = context.env.VITE_ADMIN_PASSWORD;

    // Verify admin authentication
    if (!authHeader || authHeader !== `Bearer ${adminPassword}`) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const formData = await context.request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate file size (max 50MB)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return new Response(
        JSON.stringify({ error: "File too large (max 50MB)" }),
        { status: 413, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "video/mp4",
      "video/webm",
      "application/pdf"
    ];

    if (!allowedTypes.includes(file.type)) {
      return new Response(
        JSON.stringify({ error: "File type not allowed" }),
        { status: 415, headers: { "Content-Type": "application/json" } }
      );
    }

    // Generate unique filename
    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    const uniqueKey = `uploads/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;

    // Upload to R2 Bucket
    await context.env.MEDIA_BUCKET.put(uniqueKey, file.stream(), {
      httpMetadata: {
        contentType: file.type,
        cacheControl: "public, max-age=31536000"
      },
      customMetadata: {
        uploadedBy: "jelvan-admin",
        uploadedAt: new Date().toISOString()
      }
    });

    // Generate public URL
    const fileUrl = `https://media.jelvan.pro/${uniqueKey}`;

    // Store metadata in KV for tracking
    const metadata = {
      key: uniqueKey,
      url: fileUrl,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      uploadedAt: new Date().toISOString()
    };

    await context.env.KV.put(
      `upload:${uniqueKey}`,
      JSON.stringify(metadata),
      { expirationTtl: 86400 * 30 }
    );

    return new Response(
      JSON.stringify({
        success: true,
        url: fileUrl,
        key: uniqueKey,
        metadata
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

// GET handler - List uploaded files
export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const authHeader = context.request.headers.get("Authorization");
    const adminPassword = context.env.VITE_ADMIN_PASSWORD;

    if (!authHeader || authHeader !== `Bearer ${adminPassword}`) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const list = await context.env.MEDIA_BUCKET.list({ prefix: "uploads/" });

    const files = list.objects.map((obj) => ({
      key: obj.key,
      size: obj.size,
      uploadedAt: obj.uploaded,
      url: `https://media.jelvan.pro/${obj.key}`
    }));

    return new Response(
      JSON.stringify({
        success: true,
        files,
        total: files.length
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

// DELETE handler - Delete uploaded file
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  try {
    const authHeader = context.request.headers.get("Authorization");
    const adminPassword = context.env.VITE_ADMIN_PASSWORD;

    if (!authHeader || authHeader !== `Bearer ${adminPassword}`) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const fileKey = context.params.key as string;

    if (!fileKey || !fileKey.startsWith("uploads/")) {
      return new Response(
        JSON.stringify({ error: "Invalid file key" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    await context.env.MEDIA_BUCKET.delete(fileKey);
    await context.env.KV.delete(`upload:${fileKey}`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
