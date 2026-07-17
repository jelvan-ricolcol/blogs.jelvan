interface Env {
  DB: D1Database;
  ADMIN_PASSWORD?: string;
  VITE_ADMIN_PASSWORD?: string;
}

type CommentInput = {
  id: string;
  postId: string;
  author: string;
  avatarSeed?: string;
  text: string;
  date?: string;
  isPinned?: boolean;
  isApproved?: boolean;
  isReported?: boolean;
  parentId?: string | null;
  deviceSignature?: string;
};

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

const normalizeComment = (comment: Record<string, any>) => ({
  ...comment,
  isPinned: Boolean(comment.isPinned),
  isApproved: Boolean(comment.isApproved),
  isReported: Boolean(comment.isReported)
});

export const onRequestOptions: PagesFunction<Env> = async () =>
  new Response(null, { headers: CORS_HEADERS });

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const postId = url.searchParams.get("postId");
    const includePending = url.searchParams.get("includePending") === "true";
    const isAdmin = isAuthorized(context.request, context.env);

    const page = Math.max(Number(url.searchParams.get("page") || "1"), 1);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || "20"), 1), 50);
    const offset = (page - 1) * limit;

    const where: string[] = [];
    const bindings: Array<string | number> = [];

    if (postId) {
      where.push("postId = ?");
      bindings.push(postId);
    }
    if (!(includePending && isAdmin)) {
      where.push("isApproved = 1");
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const sql = `SELECT * FROM comments ${whereClause} ORDER BY isPinned DESC, date ASC LIMIT ? OFFSET ?`;
    const countSql = `SELECT COUNT(*) as total FROM comments ${whereClause}`;

    bindings.push(limit, offset);

    const [rows, countRow] = await Promise.all([
      context.env.DB.prepare(sql).bind(...bindings).all<Record<string, any>>(),
      context.env.DB.prepare(countSql).bind(...bindings.slice(0, bindings.length - 2)).first<{ total: number }>()
    ]);

    const comments = (rows.results || []).map(normalizeComment);
    return json({
      comments,
      page,
      limit,
      total: Number(countRow?.total || 0)
    });
  } catch (err: any) {
    return json({ error: err.message || "Failed to fetch comments" }, 500);
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const comment = (await context.request.json()) as CommentInput;
    if (!comment?.id || !comment?.postId || !comment?.author || !comment?.text) {
      return json({ error: "Missing required fields" }, 400);
    }

    await context.env.DB.prepare(`
      INSERT INTO comments (
        id, postId, author, avatarSeed, text, date, isPinned, isApproved, isReported, parentId, deviceSignature
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
      .bind(
        comment.id,
        comment.postId,
        comment.author,
        comment.avatarSeed || "",
        comment.text,
        comment.date || new Date().toISOString(),
        comment.isPinned ? 1 : 0,
        comment.isApproved ? 1 : 0,
        comment.isReported ? 1 : 0,
        comment.parentId ?? null,
        comment.deviceSignature || ""
      )
      .run();

    return json({ success: true });
  } catch (err: any) {
    return json({ error: err.message || "Failed to submit comment" }, 500);
  }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    if (!isAuthorized(context.request, context.env)) {
      return json({ error: "Unauthorized access" }, 401);
    }

    const id = new URL(context.request.url).searchParams.get("id");
    if (!id) {
      return json({ error: "Missing id query parameter" }, 400);
    }

    const updates = (await context.request.json()) as Partial<CommentInput>;
    await context.env.DB.prepare(`
      UPDATE comments
      SET isApproved = ?, isPinned = ?, isReported = ?
      WHERE id = ?
    `)
      .bind(
        updates.isApproved ? 1 : 0,
        updates.isPinned ? 1 : 0,
        updates.isReported ? 1 : 0,
        id
      )
      .run();

    return json({ success: true });
  } catch (err: any) {
    return json({ error: err.message || "Failed to update comment" }, 500);
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  try {
    if (!isAuthorized(context.request, context.env)) {
      return json({ error: "Unauthorized access" }, 401);
    }

    const id = new URL(context.request.url).searchParams.get("id");
    if (!id) {
      return json({ error: "Missing id query parameter" }, 400);
    }

    await context.env.DB.prepare("DELETE FROM comments WHERE id = ?").bind(id).run();
    return json({ success: true });
  } catch (err: any) {
    return json({ error: err.message || "Failed to delete comment" }, 500);
  }
};
