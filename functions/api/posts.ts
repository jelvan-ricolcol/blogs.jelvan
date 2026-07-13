// functions/api/posts.ts
interface Env {
  DB: D1Database;
}

// GET /api/posts - Viewable Worldwide
export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const { results } = await context.env.DB.prepare(
      "SELECT * FROM posts ORDER BY isPinned DESC, date DESC"
    ).all();

    // Map database SQLite fields back to JSON objects (like media array)
    const formattedPosts = results.map((post: any) => ({
      ...post,
      isPinned: Boolean(post.isPinned),
      media: post.media ? JSON.parse(post.media) : []
    }));

    return new Response(JSON.stringify(formattedPosts), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

// POST /api/posts - Create or edit post (Admin Authenticated)
export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const data: any = await context.request.json();
    const authHeader = context.request.headers.get("Authorization");

    // Simple header-based admin verification matching dashboard variable
    if (!authHeader || authHeader !== context.env.VITE_ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: "Unauthorized access" }), { status: 401 });
    }

    // Insert or Replace into SQLite (D1)
    await context.env.DB.prepare(`
      INSERT OR REPLACE INTO posts (id, title, category, content, date, media, likes, views, isPinned, deviceSignature)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.id,
      data.title,
      data.category,
      data.content,
      data.date,
      JSON.stringify(data.media || []),
      data.likes || 0,
      data.views || 0,
      data.isPinned ? 1 : 0,
      data.deviceSignature || ""
    ).run();

    return new Response(JSON.stringify({ success: true, post: data }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
