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

const normalizeComment = (comment: Record<string, any>) => {
  let extraData: any = {};
  try {
    extraData = JSON.parse(comment.text);
  } catch {
    extraData = { content: comment.text };
  }

  const isApproved = Boolean(comment.isApproved);
  const isPinned = Boolean(comment.isPinned);
  const isReported = Boolean(comment.isReported);

  let status = extraData.status;
  if (isApproved) {
    status = 'approved';
  } else if (status === 'approved') {
    status = 'hidden';
  }

  return {
    ...comment,
    ...extraData,
    authorName: extraData.authorName || comment.author,
    authorAvatar: extraData.authorAvatar || comment.avatarSeed,
    timestamp: extraData.timestamp || comment.date,
    likes: Number(extraData.likes || 0),
    isPinned,
    isApproved,
    isReported,
    status
  };
};

export const onRequestOptions: PagesFunction<Env> = async () =>
  new Response(null, { headers: CORS_HEADERS });

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const postId = url.searchParams.get("postId");
    const includePending = url.searchParams.get("includePending") === "true";
    const isAdmin = isAuthorized(context.request, context.env);

    const page = Math.max(Number(url.searchParams.get("page") || "1"), 1);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || "100"), 1), 200);
    const offset = (page - 1) * limit;

    const where: string[] = [];
    const bindings: Array<string | number> = [];

    if (postId) {
      where.push("postId = ?");
      bindings.push(String(postId));
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
    console.error("Error fetching comments:", err);
    return json({ error: "Failed to fetch comments" }, 500);
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const comment = (await context.request.json()) as any;
    if (!comment?.id || !comment?.postId || (!comment?.author && !comment?.authorName) || (!comment?.text && !comment?.content)) {
      return json({ error: "Missing required fields" }, 400);
    }

    const isAdmin = isAuthorized(context.request, context.env);
    
    const isPinned = isAdmin && comment.isPinned ? 1 : 0;
    const isApproved = (isAdmin && comment.isApproved) ? 1 : (comment.status === 'approved' ? 1 : 0);
    const isReported = comment.isReported ? 1 : 0;

    const textStr = JSON.stringify(comment);

    await context.env.DB.prepare(`
      INSERT INTO comments (
        id, postId, author, avatarSeed, text, date, isPinned, isApproved, isReported, parentId, deviceSignature
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
      .bind(
        String(comment.id),
        String(comment.postId),
        String(comment.authorName || comment.author),
        String(comment.authorAvatar || comment.avatarSeed || ""),
        textStr,
        String(comment.timestamp || comment.date || new Date().toISOString()),
        isPinned,
        isApproved,
        isReported,
        comment.parentId ? String(comment.parentId) : null,
        String(comment.deviceSignature || "")
      )
      .run();

    return json({ success: true });
  } catch (err: any) {
    console.error("Error submitting comment:", err);
    return json({ error: "Failed to submit comment" }, 500);
  }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    const id = new URL(context.request.url).searchParams.get("id");
    if (!id) return json({ error: "Missing id query parameter" }, 400);

    const updates = (await context.request.json()) as any;
    const isAuth = isAuthorized(context.request, context.env);

    if (updates.action === 'like') {
      // Likes are stored inside the JSON text field, which is tricky to update via SQL directly.
      // But we can fetch, parse, update, and save.
      const commentRow = await context.env.DB.prepare("SELECT text FROM comments WHERE id = ?").bind(String(id)).first<{text: string}>();
      if (commentRow) {
        let parsed: any = {};
        try { parsed = JSON.parse(commentRow.text); } catch { parsed = { content: commentRow.text }; }
        parsed.likes = (parsed.likes || 0) + 1;
        await context.env.DB.prepare("UPDATE comments SET text = ? WHERE id = ?").bind(JSON.stringify(parsed), String(id)).run();
      }
      return json({ success: true });
    }

    if (updates.action === 'report') {
      await context.env.DB.prepare("UPDATE comments SET isReported = 1 WHERE id = ?").bind(String(id)).run();
      return json({ success: true });
    }

    if (!isAuth) {
      return json({ error: "Unauthorized access" }, 401);
    }

    let query = "UPDATE comments SET ";
    const sets = [];
    const binds = [];
    if (updates.isApproved !== undefined) {
      sets.push("isApproved = ?");
      binds.push(updates.isApproved ? 1 : 0);
    }
    if (updates.isPinned !== undefined) {
      sets.push("isPinned = ?");
      binds.push(updates.isPinned ? 1 : 0);
    }
    if (updates.isReported !== undefined) {
      sets.push("isReported = ?");
      binds.push(updates.isReported ? 1 : 0);
    }

    if (sets.length > 0) {
      query += sets.join(", ") + " WHERE id = ?";
      binds.push(String(id));
      await context.env.DB.prepare(query).bind(...binds).run();
    }

    return json({ success: true });
  } catch (err: any) {
    console.error("Error updating comment:", err);
    return json({ error: "Failed to update comment" }, 500);
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

    await context.env.DB.prepare("DELETE FROM comments WHERE id = ?").bind(String(id)).run();
    return json({ success: true });
  } catch (err: any) {
    console.error("Error deleting comment:", err);
    return json({ error: "Failed to delete comment" }, 500);
  }
};
