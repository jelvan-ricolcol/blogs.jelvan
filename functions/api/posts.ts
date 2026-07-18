interface Env {
  DB: D1Database;
  ADMIN_PASSWORD?: string;
  VITE_ADMIN_PASSWORD?: string;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
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

const normalizePost = (post: Record<string, any>) => {
  let extraData: any = {};
  try {
    extraData = JSON.parse(post.content);
  } catch {
    extraData = { description: post.content };
  }
  
  const mediaStr = post.media || extraData.media;
  let mediaArr = [];
  try {
    mediaArr = typeof mediaStr === 'string' ? JSON.parse(mediaStr) : (mediaStr || []);
  } catch {}

  return {
    ...post,
    ...extraData,
    likes: Number(post.likes || 0),
    views: Number(post.views || 0),
    isPinned: Boolean(post.isPinned),
    media: mediaArr
  };
};

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

    const data = (await context.request.json()) as any;
    if (!data?.id || !data?.title || !data?.category || !data?.date) {
      return json({ error: "Missing required fields" }, 400);
    }

    const contentStr = JSON.stringify(data);

    await context.env.DB.prepare(`
      INSERT OR REPLACE INTO posts (
        id, title, category, content, date, media, likes, views, isPinned, deviceSignature
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
      .bind(
        String(data.id),
        String(data.title),
        String(data.category),
        contentStr,
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

export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    const id = new URL(context.request.url).searchParams.get("id");
    if (!id) return json({ error: "Missing id query parameter" }, 400);

    const updates = (await context.request.json()) as any;
    const isAuth = isAuthorized(context.request, context.env);

    // Allow unauthenticated likes and views updates
    if (updates.action === 'like') {
      await context.env.DB.prepare("UPDATE posts SET likes = likes + 1 WHERE id = ?").bind(String(id)).run();
      return json({ success: true });
    }
    
    if (updates.action === 'view') {
      await context.env.DB.prepare("UPDATE posts SET views = views + 1 WHERE id = ?").bind(String(id)).run();
      return json({ success: true });
    }

    // Require auth for other updates
    if (!isAuth) {
      return json({ error: "Unauthorized access" }, 401);
    }

    // Since we don't have a partial update for JSON in sqlite easily, we just update isPinned
    if (updates.isPinned !== undefined) {
       await context.env.DB.prepare("UPDATE posts SET isPinned = ? WHERE id = ?").bind(updates.isPinned ? 1 : 0, String(id)).run();
    }

    return json({ success: true });
  } catch (err: any) {
    console.error("Error updating post:", err);
    return json({ error: "Failed to update post" }, 500);
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
