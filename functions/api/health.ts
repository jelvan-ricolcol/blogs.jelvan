interface Env {
  DB?: D1Database;
  MEDIA_BUCKET?: R2Bucket;
}

type ServiceStatus = { status: "ok" | "error" | "not_configured"; error?: string };

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const services: Record<string, ServiceStatus> = {
    database: { status: "not_configured" },
    mediaBucket: { status: "not_configured" }
  };
  let overall: "healthy" | "degraded" | "unhealthy" = "healthy";

  try {
    if (context.env.DB) {
      try {
        await context.env.DB.prepare("SELECT 1 as ok").first();
        services.database = { status: "ok" };
      } catch (err: any) {
        services.database = { status: "error", error: err.message || "Database check failed" };
        overall = "degraded";
      }
    }

    if (context.env.MEDIA_BUCKET) {
      try {
        await context.env.MEDIA_BUCKET.list({ limit: 1 });
        services.mediaBucket = { status: "ok" };
      } catch (err: any) {
        services.mediaBucket = { status: "error", error: err.message || "R2 check failed" };
        overall = "degraded";
      }
    }

    return new Response(
      JSON.stringify({
        status: overall,
        timestamp: new Date().toISOString(),
        services
      }),
      { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: err.message || "Health check failed",
        services
      }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }
};
