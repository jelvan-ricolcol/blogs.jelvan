// functions/api/comments.ts
// Comment management with moderation queue integration

interface Env {
  DB: D1Database;
  KV: KVNamespace;
  MODERATION_QUEUE: Queue;
  VITE_ADMIN_PASSWORD: string;
}

// GET /api/comments - Fetch approved comments with pagination
export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const postId = url.searchParams.get("postId");
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = 20;
    const offset = (page - 1) * limit;

    const cacheKey = postId
      ? `comments:${postId}:${page}`
      : `comments:all:${page}`;

    // Check KV cache first
    const cached = await context.env.KV.get(cacheKey);
    if (cached) {
      return new Response(cached, {
        headers: {
          "Content-Type": "application/json",
          "X-Cache": "HIT"
        }
      });
    }

    let query = "SELECT * FROM comments WHERE isApproved = 1";
    const bindings: any[] = [];

    if (postId) {
      query += " AND postId = ?";
      bindings.push(postId);
    }

    query += " ORDER BY isPinned DESC, date ASC LIMIT ? OFFSET ?";
    bindings.push(limit, offset);

    const { results } = await context.env.DB.prepare(query)
      .bind(...bindings)
      .all();

    const comments = results.map((c: any) => ({
      ...c,
      isPinned: Boolean(c.isPinned),
      isApproved: Boolean(c.isApproved),
      isReported: Boolean(c.isReported)
    }));

    const response = JSON.stringify({
      comments,
      page,
      limit,
      total: results.length
    });

    // Cache for 2 minutes
    await context.env.KV.put(cacheKey, response, { expirationTtl: 120 });

    return new Response(response, {
      headers: {
        "Content-Type": "application/json",
        "X-Cache": "MISS"
      }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

// POST /api/comments - Submit comment for moderation
export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const comment: any = await context.request.json();

    // Validate required fields
    if (!comment.id || !comment.postId || !comment.author || !comment.text) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Insert comment with isApproved = 0 (pending moderation)
    await context.env.DB.prepare(`
      INSERT INTO comments (id, postId, author, avatarSeed, text, date, isPinned, isApproved, isReported, parentId, deviceSignature)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
      .bind(
        comment.id,
        comment.postId,
        comment.author,
        comment.avatarSeed || "",
        comment.text,
        comment.date || new Date().toISOString(),
        0,
        0, // Pending approval
        0,
        comment.parentId || null,
        comment.deviceSignature || ""
      )
      .run();

    // Queue for moderation
    await context.env.MODERATION_QUEUE.send({
      type: "comment_pending",
      commentId: comment.id,
      postId: comment.postId,
      author: comment.author,
      text: comment.text,
      timestamp: new Date().toISOString()
    });

    // Invalidate cache
    await context.env.KV.delete(`comments:${comment.postId}:1`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Comment submitted for moderation",
        comment: {
          ...comment,
          isApproved: false
        }
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

// PUT /api/comments/:id - Admin approve/reject/pin comment
export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    const authHeader = context.request.headers.get("Authorization");
    const adminPassword = context.env.VITE_ADMIN_PASSWORD;

    if (!authHeader || authHeader !== `Bearer ${adminPassword}`) {
      return new Response(
        JSON.stringify({ error: "Unauthorized access" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const commentId = context.params.id as string;
    const data: any = await context.request.json();

    await context.env.DB.prepare(`
      UPDATE comments
      SET isApproved = ?, isPinned = ?
      WHERE id = ?
    `)
      .bind(
        data.isApproved ? 1 : 0,
        data.isPinned ? 1 : 0,
        commentId
      )
      .run();

    // Invalidate cache
    await context.env.KV.delete(`comments:all:1`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

// DELETE /api/comments/:id - Admin delete comment
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  try {
    const authHeader = context.request.headers.get("Authorization");
    const adminPassword = context.env.VITE_ADMIN_PASSWORD;

    if (!authHeader || authHeader !== `Bearer ${adminPassword}`) {
      return new Response(
        JSON.stringify({ error: "Unauthorized access" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const commentId = context.params.id as string;

    await context.env.DB.prepare(
      "DELETE FROM comments WHERE id = ?"
    ).bind(commentId).run();

    // Invalidate cache
    await context.env.KV.delete(`comments:all:1`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
