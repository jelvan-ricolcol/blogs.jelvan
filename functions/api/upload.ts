// functions/api/upload.ts
interface Env {
  MEDIA_BUCKET: R2Bucket;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const authHeader = context.request.headers.get("Authorization");
    if (!authHeader || authHeader !== context.env.VITE_ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const formData = await context.request.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), { status: 400 });
    }

    const fileExtension = file.name.split(".").pop();
    const uniqueKey = `uploads/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;

    // Upload to R2 Bucket
    await context.env.MEDIA_BUCKET.put(uniqueKey, file.stream(), {
      httpMetadata: { contentType: file.type }
    });

    // Replace this with your custom domain or R2 public access URL if configured
    const fileUrl = `https://media.jelvan.pro/${uniqueKey}`;

    return new Response(JSON.stringify({ success: true, url: fileUrl }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
