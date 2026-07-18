var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// api/token/[[action]].ts
var CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};
var json = /* @__PURE__ */ __name((body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json", ...CORS_HEADERS }
}), "json");
var adminSecret = /* @__PURE__ */ __name((env) => env.ADMIN_PASSWORD || env.VITE_ADMIN_PASSWORD || "", "adminSecret");
var isAuthorized = /* @__PURE__ */ __name((request, env) => {
  const secret = adminSecret(env);
  if (!secret) return false;
  const authHeader = request.headers.get("Authorization")?.trim() || "";
  const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : authHeader;
  return token === secret;
}, "isAuthorized");
var onRequestOptions = /* @__PURE__ */ __name(async () => new Response(null, { headers: CORS_HEADERS }), "onRequestOptions");
var onRequest = /* @__PURE__ */ __name(async (context) => {
  try {
    if (!isAuthorized(context.request, context.env)) {
      return json({ error: "Unauthorized access" }, 401);
    }
    const { request, env, params } = context;
    const url = new URL(request.url);
    const action = Array.isArray(params.action) ? params.action[0] : params.action;
    if (request.method === "GET" && action === "status") {
      const jti = url.searchParams.get("jti");
      if (!jti) return json({ error: "Missing jti" }, 400);
      const recStr = await env.TOKEN_KV.get(`token:${jti}`);
      const rec = recStr ? JSON.parse(recStr) : null;
      return json({ found: !!rec, record: rec || null });
    }
    if (request.method === "POST" && action === "store") {
      let body;
      try {
        body = await request.json();
      } catch (e) {
        return json({ error: "Invalid JSON" }, 400);
      }
      const { jti, sub, issued_at, expires_at, meta } = body || {};
      if (!jti || !issued_at) return json({ error: "Missing jti or issued_at" }, 400);
      const record = { jti, sub: sub || null, issued_at, expires_at: expires_at || null, meta: meta || null, revoked: false };
      const options = {};
      if (expires_at) {
        const exp = Math.floor(new Date(expires_at).getTime() / 1e3);
        if (!isNaN(exp)) options.expiration = exp;
      }
      await env.TOKEN_KV.put(`token:${jti}`, JSON.stringify(record), options);
      return json({ ok: true, record });
    }
    if (request.method === "POST" && action === "revoke") {
      let body;
      try {
        body = await request.json();
      } catch (e) {
        return json({ error: "Invalid JSON" }, 400);
      }
      const { jti } = body || {};
      if (!jti) return json({ error: "Missing jti" }, 400);
      const recStr = await env.TOKEN_KV.get(`token:${jti}`);
      if (!recStr) return json({ error: "Not found" }, 404);
      const rec = JSON.parse(recStr);
      rec.revoked = true;
      const options = {};
      if (rec.expires_at) {
        const exp = Math.floor(new Date(rec.expires_at).getTime() / 1e3);
        if (!isNaN(exp)) options.expiration = exp;
      }
      await env.TOKEN_KV.put(`token:${jti}`, JSON.stringify(rec), options);
      return json({ ok: true, record: rec });
    }
    return json({ error: "Not found" }, 404);
  } catch (err) {
    console.error("Error processing token action:", err);
    return json({ error: "Failed to process token audit" }, 500);
  }
}, "onRequest");

// api/comments.ts
var CORS_HEADERS2 = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};
var json2 = /* @__PURE__ */ __name((body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json", ...CORS_HEADERS2 }
}), "json");
var adminSecret2 = /* @__PURE__ */ __name((env) => env.ADMIN_PASSWORD || env.VITE_ADMIN_PASSWORD || "", "adminSecret");
var isAuthorized2 = /* @__PURE__ */ __name((request, env) => {
  const secret = adminSecret2(env);
  if (!secret) return false;
  const authHeader = request.headers.get("Authorization")?.trim() || "";
  const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : authHeader;
  return token === secret;
}, "isAuthorized");
var normalizeComment = /* @__PURE__ */ __name((comment) => ({
  ...comment,
  isPinned: Boolean(comment.isPinned),
  isApproved: Boolean(comment.isApproved),
  isReported: Boolean(comment.isReported)
}), "normalizeComment");
var onRequestOptions2 = /* @__PURE__ */ __name(async () => new Response(null, { headers: CORS_HEADERS2 }), "onRequestOptions");
var onRequestGet = /* @__PURE__ */ __name(async (context) => {
  try {
    const url = new URL(context.request.url);
    const postId = url.searchParams.get("postId");
    const includePending = url.searchParams.get("includePending") === "true";
    const isAdmin = isAuthorized2(context.request, context.env);
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
    return json2({
      comments,
      page,
      limit,
      total: Number(countRow?.total || 0)
    });
  } catch (err) {
    console.error("Error fetching comments:", err);
    return json2({ error: "Failed to fetch comments" }, 500);
  }
}, "onRequestGet");
var onRequestPost = /* @__PURE__ */ __name(async (context) => {
  try {
    const comment = await context.request.json();
    if (!comment?.id || !comment?.postId || !comment?.author || !comment?.text) {
      return json2({ error: "Missing required fields" }, 400);
    }
    const isAdmin = isAuthorized2(context.request, context.env);
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
    return json2({ success: true });
  } catch (err) {
    console.error("Error submitting comment:", err);
    return json2({ error: "Failed to submit comment" }, 500);
  }
}, "onRequestPost");
var onRequestPut = /* @__PURE__ */ __name(async (context) => {
  try {
    if (!isAuthorized2(context.request, context.env)) {
      return json2({ error: "Unauthorized access" }, 401);
    }
    const id = new URL(context.request.url).searchParams.get("id");
    if (!id) {
      return json2({ error: "Missing id query parameter" }, 400);
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
    return json2({ success: true });
  } catch (err) {
    console.error("Error updating comment:", err);
    return json2({ error: "Failed to update comment" }, 500);
  }
}, "onRequestPut");
var onRequestDelete = /* @__PURE__ */ __name(async (context) => {
  try {
    if (!isAuthorized2(context.request, context.env)) {
      return json2({ error: "Unauthorized access" }, 401);
    }
    const id = new URL(context.request.url).searchParams.get("id");
    if (!id) {
      return json2({ error: "Missing id query parameter" }, 400);
    }
    await context.env.DB.prepare("DELETE FROM comments WHERE id = ?").bind(String(id)).run();
    return json2({ success: true });
  } catch (err) {
    console.error("Error deleting comment:", err);
    return json2({ error: "Failed to delete comment" }, 500);
  }
}, "onRequestDelete");

// api/health.ts
var onRequestGet2 = /* @__PURE__ */ __name(async (context) => {
  const services = {
    database: { status: "not_configured" },
    mediaBucket: { status: "not_configured" }
  };
  let overall = "healthy";
  try {
    if (context.env.DB) {
      try {
        await context.env.DB.prepare("SELECT 1 as ok").first();
        services.database = { status: "ok" };
      } catch (err) {
        console.error("Database health check failed:", err);
        services.database = { status: "error", error: "Database check failed" };
        overall = "degraded";
      }
    }
    if (context.env.MEDIA_BUCKET) {
      try {
        await context.env.MEDIA_BUCKET.list({ limit: 1 });
        services.mediaBucket = { status: "ok" };
      } catch (err) {
        console.error("R2 health check failed:", err);
        services.mediaBucket = { status: "error", error: "R2 check failed" };
        overall = "degraded";
      }
    }
    return new Response(
      JSON.stringify({
        status: overall,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        services
      }),
      { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  } catch (err) {
    console.error("Overall health check failed:", err);
    return new Response(
      JSON.stringify({
        status: "unhealthy",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        error: "Health check failed",
        services
      }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }
}, "onRequestGet");

// api/posts.ts
var CORS_HEADERS3 = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};
var json3 = /* @__PURE__ */ __name((body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json", ...CORS_HEADERS3 }
}), "json");
var adminSecret3 = /* @__PURE__ */ __name((env) => env.ADMIN_PASSWORD || env.VITE_ADMIN_PASSWORD || "", "adminSecret");
var isAuthorized3 = /* @__PURE__ */ __name((request, env) => {
  const secret = adminSecret3(env);
  if (!secret) return false;
  const authHeader = request.headers.get("Authorization")?.trim() || "";
  const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : authHeader;
  return token === secret;
}, "isAuthorized");
var normalizePost = /* @__PURE__ */ __name((post) => ({
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
}), "normalizePost");
var onRequestOptions3 = /* @__PURE__ */ __name(async () => new Response(null, { headers: CORS_HEADERS3 }), "onRequestOptions");
var onRequestGet3 = /* @__PURE__ */ __name(async (context) => {
  try {
    const url = new URL(context.request.url);
    const postId = url.searchParams.get("id");
    if (postId) {
      const post = await context.env.DB.prepare("SELECT * FROM posts WHERE id = ?").bind(String(postId)).first();
      if (!post) {
        return json3({ error: "Post not found" }, 404);
      }
      return json3(normalizePost(post));
    }
    const page = Math.max(Number(url.searchParams.get("page") || "1"), 1);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || "50"), 1), 100);
    const offset = (page - 1) * limit;
    const { results } = await context.env.DB.prepare(
      "SELECT * FROM posts ORDER BY isPinned DESC, date DESC LIMIT ? OFFSET ?"
    ).bind(limit, offset).all();
    return json3((results || []).map(normalizePost));
  } catch (err) {
    console.error("Error fetching posts:", err);
    return json3({ error: "Failed to fetch posts" }, 500);
  }
}, "onRequestGet");
var onRequestPost2 = /* @__PURE__ */ __name(async (context) => {
  try {
    if (!isAuthorized3(context.request, context.env)) {
      return json3({ error: "Unauthorized access" }, 401);
    }
    const data = await context.request.json();
    if (!data?.id || !data?.title || !data?.category || !data?.content || !data?.date) {
      return json3({ error: "Missing required fields" }, 400);
    }
    await context.env.DB.prepare(`
      INSERT OR REPLACE INTO posts (
        id, title, category, content, date, media, likes, views, isPinned, deviceSignature
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
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
    ).run();
    return json3({ success: true });
  } catch (err) {
    console.error("Error saving post:", err);
    return json3({ error: "Failed to save post" }, 500);
  }
}, "onRequestPost");
var onRequestDelete2 = /* @__PURE__ */ __name(async (context) => {
  try {
    if (!isAuthorized3(context.request, context.env)) {
      return json3({ error: "Unauthorized access" }, 401);
    }
    const postId = new URL(context.request.url).searchParams.get("id");
    if (!postId) {
      return json3({ error: "Missing id query parameter" }, 400);
    }
    const result = await context.env.DB.prepare("DELETE FROM posts WHERE id = ?").bind(String(postId)).run();
    if (!result.success) {
      return json3({ error: "Failed to delete post" }, 500);
    }
    return json3({ success: true });
  } catch (err) {
    console.error("Error deleting post:", err);
    return json3({ error: "Failed to delete post" }, 500);
  }
}, "onRequestDelete");

// api/upload.ts
var CORS_HEADERS4 = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};
var ALLOWED_TYPES = /* @__PURE__ */ new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
  "application/pdf"
]);
var MAX_FILE_SIZE = 50 * 1024 * 1024;
var json4 = /* @__PURE__ */ __name((body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json", ...CORS_HEADERS4 }
}), "json");
var adminSecret4 = /* @__PURE__ */ __name((env) => env.ADMIN_PASSWORD || env.VITE_ADMIN_PASSWORD || "", "adminSecret");
var isAuthorized4 = /* @__PURE__ */ __name((request, env) => {
  const secret = adminSecret4(env);
  if (!secret) return false;
  const authHeader = request.headers.get("Authorization")?.trim() || "";
  const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : authHeader;
  return token === secret;
}, "isAuthorized");
var normalizeFileName = /* @__PURE__ */ __name((fileName) => fileName.toLowerCase().replace(/[^a-z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 80), "normalizeFileName");
var toPublicUrl = /* @__PURE__ */ __name((key, env) => {
  const base = (env.PUBLIC_MEDIA_BASE_URL || "https://media.jelvan.pro").replace(/\/+$/, "");
  return `${base}/${key}`;
}, "toPublicUrl");
var onRequestOptions4 = /* @__PURE__ */ __name(async () => new Response(null, { headers: CORS_HEADERS4 }), "onRequestOptions");
var onRequestPost3 = /* @__PURE__ */ __name(async (context) => {
  try {
    if (!isAuthorized4(context.request, context.env)) {
      return json4({ error: "Unauthorized" }, 401);
    }
    const formData = await context.request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return json4({ error: "No file provided" }, 400);
    }
    if (file.size > MAX_FILE_SIZE) {
      return json4({ error: "File too large (max 50MB)" }, 413);
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return json4({ error: "File type not allowed" }, 415);
    }
    const normalized = normalizeFileName(file.name || "file");
    const fileKey = `uploads/${Date.now()}-${crypto.randomUUID()}-${normalized}`;
    await context.env.MEDIA_BUCKET.put(fileKey, file.stream(), {
      httpMetadata: {
        contentType: file.type,
        cacheControl: "public, max-age=31536000"
      }
    });
    return json4({
      success: true,
      key: fileKey,
      url: toPublicUrl(fileKey, context.env)
    });
  } catch (err) {
    console.error("Error uploading file:", err);
    return json4({ error: "Failed to upload file" }, 500);
  }
}, "onRequestPost");
var onRequestGet4 = /* @__PURE__ */ __name(async (context) => {
  try {
    if (!isAuthorized4(context.request, context.env)) {
      return json4({ error: "Unauthorized" }, 401);
    }
    const list = await context.env.MEDIA_BUCKET.list({ prefix: "uploads/" });
    const files = list.objects.map((obj) => ({
      key: obj.key,
      size: obj.size,
      uploadedAt: obj.uploaded,
      url: toPublicUrl(obj.key, context.env)
    }));
    return json4({ success: true, files, total: files.length });
  } catch (err) {
    console.error("Error listing files:", err);
    return json4({ error: "Failed to list files" }, 500);
  }
}, "onRequestGet");
var onRequestDelete3 = /* @__PURE__ */ __name(async (context) => {
  try {
    if (!isAuthorized4(context.request, context.env)) {
      return json4({ error: "Unauthorized" }, 401);
    }
    const key = new URL(context.request.url).searchParams.get("key");
    if (!key || !key.startsWith("uploads/")) {
      return json4({ error: "Invalid key query parameter" }, 400);
    }
    await context.env.MEDIA_BUCKET.delete(key);
    return json4({ success: true });
  } catch (err) {
    console.error("Error deleting file:", err);
    return json4({ error: "Failed to delete file" }, 500);
  }
}, "onRequestDelete");

// ../.wrangler/tmp/pages-wIbIUZ/functionsRoutes-0.7534246127264392.mjs
var routes = [
  {
    routePath: "/api/token/:action*",
    mountPath: "/api/token",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions]
  },
  {
    routePath: "/api/token/:action*",
    mountPath: "/api/token",
    method: "",
    middlewares: [],
    modules: [onRequest]
  },
  {
    routePath: "/api/comments",
    mountPath: "/api",
    method: "DELETE",
    middlewares: [],
    modules: [onRequestDelete]
  },
  {
    routePath: "/api/comments",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet]
  },
  {
    routePath: "/api/comments",
    mountPath: "/api",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions2]
  },
  {
    routePath: "/api/comments",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost]
  },
  {
    routePath: "/api/comments",
    mountPath: "/api",
    method: "PUT",
    middlewares: [],
    modules: [onRequestPut]
  },
  {
    routePath: "/api/health",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet2]
  },
  {
    routePath: "/api/posts",
    mountPath: "/api",
    method: "DELETE",
    middlewares: [],
    modules: [onRequestDelete2]
  },
  {
    routePath: "/api/posts",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet3]
  },
  {
    routePath: "/api/posts",
    mountPath: "/api",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions3]
  },
  {
    routePath: "/api/posts",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost2]
  },
  {
    routePath: "/api/upload",
    mountPath: "/api",
    method: "DELETE",
    middlewares: [],
    modules: [onRequestDelete3]
  },
  {
    routePath: "/api/upload",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet4]
  },
  {
    routePath: "/api/upload",
    mountPath: "/api",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions4]
  },
  {
    routePath: "/api/upload",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost3]
  }
];

// ../../../../.npm/_npx/32026684e21afda6/node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../../../../.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
export {
  pages_template_worker_default as default
};
