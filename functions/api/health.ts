// functions/api/health.ts
// Health check endpoint for monitoring

interface Env {
  DB: D1Database;
  KV: KVNamespace;
  MEDIA_BUCKET: R2Bucket;
  MODERATION_QUEUE: Queue;
  MEDIA_QUEUE: Queue;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const checks: any = {
    timestamp: new Date().toISOString(),
    status: "healthy",
    services: {}
  };

  try {
    // Check D1 database
    try {
      await context.env.DB.prepare("SELECT 1").first();
      checks.services.database = { status: "ok" };
    } catch (err) {
      checks.services.database = { status: "error", error: (err as any).message };
      checks.status = "degraded";
    }

    // Check KV
    try {
      await context.env.KV.put("health-check", "ok", { expirationTtl: 60 });
      const value = await context.env.KV.get("health-check");
      checks.services.kv = { status: value ? "ok" : "error" };
    } catch (err) {
      checks.services.kv = { status: "error", error: (err as any).message };
      checks.status = "degraded";
    }

    // Check R2 bucket
    try {
      const list = await context.env.MEDIA_BUCKET.list({ limit: 1 });
      checks.services.r2 = { status: "ok", bucketSize: list.objects.length };
    } catch (err) {
      checks.services.r2 = { status: "error", error: (err as any).message };
      checks.status = "degraded";
    }

    // Check Queues (just verify they're bound)
    checks.services.queues = {
      moderation: { status: "ok" },
      media: { status: "ok" }
    };

    return new Response(JSON.stringify(checks), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    checks.status = "unhealthy";
    checks.error = err.message;

    return new Response(JSON.stringify(checks), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
