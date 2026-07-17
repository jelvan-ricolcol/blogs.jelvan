interface Env {
  DB: D1Database;
  ADMIN_PASSWORD?: string;
  VITE_ADMIN_PASSWORD?: string;
}

type PostInput = {
  id: string;
  title: string;
  category: string;
  content: string;
  date: string;
  media?: unknown;
  likes?: number;
  views?: number;
  isPinned?: boolean;
  deviceSignature?: string;
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
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

const normalizePost = (post: Record<string, any>) => ({
  ...post,
  likes: Number(post.likes || 0),
  views: Number(post.views || 0),
  isPinned: Boolean(post.isPinned),
  media: (() => {
    try {
      return post.media ? JSON.parse(post.media) : [];
    } catch {
      return [];
    }
  })()
});

export const onRequestOptions: PagesFunction<Env> = async () =>
  new Response(null, { headers: CORS_HEADERS });

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const postId = url.searchParams.get("id");

    if (postId) {
      const post = await context.env.DB.prepare("SELECT * FROM posts WHERE id = ?")
        .bind(String(postId))
        .first<Record<string, any>>();
      if (!post) {
        return json({ error: "Post not found" }, 404);
      }
      return json(normalizePost(post));
    }

    const page = Math.max(Number(url.searchParams.get("page") || "1"), 1);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || "50"), 1), 100);
    const offset = (page - 1) * limit;

    const { results } = await context.env.DB.prepare(
      "SELECT * FROM posts ORDER BY isPinned DESC, date DESC LIMIT ? OFFSET ?"
    ).bind(limit, offset).all<Record<string, any>>();

    return json((results || []).map(normalizePost));
  } catch (err: any) {
    console.error("Error fetching posts:", err);
    return json({ error: "Failed to fetch posts" }, 500);
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    if (!isAuthorized(context.request, context.env)) {
      return json({ error: "Unauthorized access" }, 401);
    }

    const data = (await context.request.json()) as PostInput;
    if (!data?.id || !data?.title || !data?.category || !data?.content || !data?.date) {
      return json({ error: "Missing required fields" }, 400);
    }

    await context.env.DB.prepare(`
      INSERT OR REPLACE INTO posts (
        id, title, category, content, date, media, likes, views, isPinned, deviceSignature
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
      .bind(
        String(data.id),
        String(data.title),
        String(data.category),
        String(data.content),
        String(data.date),
        JSON.stringify(Array.isArray(data.media) ? data.media : []),
        Number(data.likes || 0),
        Number(data.views || 0),
        data.isPinned ? 1 : 0,
        String(data.deviceSignature || "")
      )
      .run();

    return json({ success: true });
  } catch (err: any) {
    console.error("Error saving post:", err);
    return json({ error: "Failed to save post" }, 500);
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  try {
    if (!isAuthorized(context.request, context.env)) {
      return json({ error: "Unauthorized access" }, 401);
    }

    const postId = new URL(context.request.url).searchParams.get("id");
    if (!postId) {
      return json({ error: "Missing id query parameter" }, 400);
    }

    const result = await context.env.DB.prepare("DELETE FROM posts WHERE id = ?")
      .bind(String(postId))
      .run();

    if (!result.success) {
      return json({ error: "Failed to delete post" }, 500);
    }

    return json({ success: true });
  } catch (err: any) {
    console.error("Error deleting post:", err);
    return json({ error: "Failed to delete post" }, 500);
  }
};
