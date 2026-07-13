// functions/api/comments.ts
interface Env {
  DB: D1Database;
}

// GET /api/comments
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { results } = await context.env.DB.prepare("SELECT * FROM comments ORDER BY date ASC").all();
  const comments = results.map((c: any) => ({
    ...c,
    isPinned: Boolean(c.isPinned),
    isApproved: Boolean(c.isApproved),
    isReported: Boolean(c.isReported)
  }));
  return new Response(JSON.stringify(comments), { headers: { "Content-Type": "application/json" } });
};

// POST /api/comments - Submit comment or reply
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const comment: any = await context.request.json();
  
  await context.env.DB.prepare(`
    INSERT INTO comments (id, postId, author, avatarSeed, text, date, isPinned, isApproved, isReported, parentId, deviceSignature)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    comment.id,
    comment.postId,
    comment.author,
    comment.avatarSeed,
    comment.text,
    comment.date,
    comment.isPinned ? 1 : 0,
    comment.isApproved ? 1 : 0, // Admin dashboard config will decide auto-approval rules
    0,
    comment.parentId || null,
    comment.deviceSignature || ""
  ).run();

  return new Response(JSON.stringify({ success: true, comment }), { headers: { "Content-Type": "application/json" } });
};
