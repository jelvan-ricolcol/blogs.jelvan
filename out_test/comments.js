(() => {
  // functions/api/comments.ts
  var CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };
  var json = (body, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS }
  });
  var adminSecret = (env) => env.ADMIN_PASSWORD || env.VITE_ADMIN_PASSWORD || "";
  var isAuthorized = (request, env) => {
    const secret = adminSecret(env);
    if (!secret) return false;
    const authHeader = request.headers.get("Authorization")?.trim() || "";
    const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : authHeader;
    return token === secret;
  };
  var normalizeComment = (comment) => ({
    ...comment,
    isPinned: Boolean(comment.isPinned),
    isApproved: Boolean(comment.isApproved),
    isReported: Boolean(comment.isReported)
  });
  var onRequestOptions = async () => new Response(null, { headers: CORS_HEADERS });
  var onRequestGet = async (context) => {
    try {
      const url = new URL(context.request.url);
      const postId = url.searchParams.get("postId");
      const includePending = url.searchParams.get("includePending") === "true";
      const isAdmin = isAuthorized(context.request, context.env);
      const page = Math.max(Number(url.searchParams.get("page") || "1"), 1);
      const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || "20"), 1), 50);
      const offset = (page - 1) * limit;
      const where = [];
      const bindings = [];
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
        context.env.DB.prepare(sql).bind(...bindings).all(),
        context.env.DB.prepare(countSql).bind(...bindings.slice(0, bindings.length - 2)).first()
      ]);
      const comments = (rows.results || []).map(normalizeComment);
      return json({
        comments,
        page,
        limit,
        total: Number(countRow?.total || 0)
      });
    } catch (err) {
      console.error("Error fetching comments:", err);
      return json({ error: "Failed to fetch comments" }, 500);
    }
  };
  var onRequestPost = async (context) => {
    try {
      const comment = await context.request.json();
      if (!comment?.id || !comment?.postId || !comment?.author || !comment?.text) {
        return json({ error: "Missing required fields" }, 400);
      }
      const isAdmin = isAuthorized(context.request, context.env);
      const isPinned = isAdmin && comment.isPinned ? 1 : 0;
      const isApproved = isAdmin && comment.isApproved ? 1 : 0;
      const isReported = comment.isReported ? 1 : 0;
      await context.env.DB.prepare(`
      INSERT INTO comments (
        id, postId, author, avatarSeed, text, date, isPinned, isApproved, isReported, parentId, deviceSignature
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
        String(comment.id),
        String(comment.postId),
        String(comment.author),
        String(comment.avatarSeed || ""),
        String(comment.text),
        String(comment.date || (/* @__PURE__ */ new Date()).toISOString()),
        isPinned,
        isApproved,
        isReported,
        comment.parentId ? String(comment.parentId) : null,
        String(comment.deviceSignature || "")
      ).run();
      return json({ success: true });
    } catch (err) {
      console.error("Error submitting comment:", err);
      return json({ error: "Failed to submit comment" }, 500);
    }
  };
  var onRequestPut = async (context) => {
    try {
      if (!isAuthorized(context.request, context.env)) {
        return json({ error: "Unauthorized access" }, 401);
      }
      const id = new URL(context.request.url).searchParams.get("id");
      if (!id) {
        return json({ error: "Missing id query parameter" }, 400);
      }
      const updates = await context.request.json();
      await context.env.DB.prepare(`
      UPDATE comments
      SET isApproved = ?, isPinned = ?, isReported = ?
      WHERE id = ?
    `).bind(
        updates.isApproved ? 1 : 0,
        updates.isPinned ? 1 : 0,
        updates.isReported ? 1 : 0,
        String(id)
      ).run();
      return json({ success: true });
    } catch (err) {
      console.error("Error updating comment:", err);
      return json({ error: "Failed to update comment" }, 500);
    }
  };
  var onRequestDelete = async (context) => {
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
    } catch (err) {
      console.error("Error deleting comment:", err);
      return json({ error: "Failed to delete comment" }, 500);
    }
  };
})();
