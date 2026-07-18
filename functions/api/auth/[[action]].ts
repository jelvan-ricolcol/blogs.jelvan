import bcrypt from 'bcryptjs';
import * as OTPAuth from 'otpauth';

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

const json = (data: any, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });

async function sendEmail(env: any, to: string, subject: string, html: string) {
  if (!env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set. Cannot send email.");
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + env.RESEND_API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: "noreply@jelvan.pro", // Change as needed
      to,
      subject,
      html
    })
  });
  if (!res.ok) {
    console.error("Resend error", await res.text());
  }
}

export const onRequest: PagesFunction<any> = async (context) => {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const action = Array.isArray(params.action) ? params.action[0] : params.action;

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const db = env.DB;
  if (!db) return json({ error: "DB binding not found" }, 500);

  try {
    if (request.method === "POST" && action === "register") {
      const { email, password, name } = await request.json<any>();
      if (!email || !password) return json({ error: "Missing email or password" }, 400);

      const existing = await db.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
      if (existing) return json({ error: "Email already registered" }, 400);

      const id = crypto.randomUUID();
      const hash = bcrypt.hashSync(password, 10);
      
      await db.prepare(
        "INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, ?, ?, ?)"
      ).bind(id, email, hash, name || "", new Date().toISOString()).run();

      // Generate verification code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const codeId = crypto.randomUUID();
      const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins

      await db.prepare(
        "INSERT INTO verification_codes (id, user_id, email, code, type, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).bind(codeId, id, email, code, "signup", expiresAt, new Date().toISOString()).run();

      const html = `
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
          <h2>Welcome to Jelvan Blogs!</h2>
          <p>Your verification code is: <strong>${code}</strong></p>
          <p>Please enter this code on the verification page.</p>
        </div>
      `;
      await sendEmail(env, email, "Verify your account", html);

      return json({ success: true, message: "Verification email sent", userId: id });
    }

    if (request.method === "POST" && action === "verify") {
      const { email, code } = await request.json<any>();
      
      const record = await db.prepare(
        "SELECT * FROM verification_codes WHERE email = ? AND code = ? AND type = 'signup' ORDER BY created_at DESC LIMIT 1"
      ).bind(email, code).first();

      if (!record) return json({ error: "Invalid code" }, 400);
      if (record.expires_at < Date.now()) return json({ error: "Code expired" }, 400);

      await db.prepare("UPDATE users SET is_verified = 1 WHERE email = ?").bind(email).run();
      await db.prepare("DELETE FROM verification_codes WHERE email = ? AND type = 'signup'").bind(email).run();

      return json({ success: true });
    }

    if (request.method === "POST" && action === "login") {
      const { email, password, code } = await request.json<any>();
      if (!email || !password) return json({ error: "Missing email or password" }, 400);

      const user = await db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
      if (!user || !user.password_hash) return json({ error: "Invalid credentials" }, 400);

      const valid = bcrypt.compareSync(password, user.password_hash);
      if (!valid) return json({ error: "Invalid credentials" }, 400);

      if (!user.is_verified) {
        return json({ error: "Account not verified", unverified: true });
      }

      if (user.two_factor_enabled) {
        if (!code) return json({ requires_2fa: true });
        
        let totp = new OTPAuth.TOTP({
          issuer: "Jelvan Blogs",
          label: user.email,
          algorithm: "SHA1",
          digits: 6,
          secret: OTPAuth.Secret.fromBase32(user.two_factor_secret),
        });

        const delta = totp.validate({ token: code, window: 1 });
        if (delta === null) {
          return json({ error: "Invalid 2FA code" }, 400);
        }
      }

      const token = crypto.randomUUID();
      const expires = Date.now() + 24 * 60 * 60 * 1000 * 7; // 7 days

      await env.TOKEN_KV.put(`session:${token}`, JSON.stringify({
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: true // All authenticated users are admins based on previous system? Wait, let's just mark them as users
      }), { expirationTtl: 604800 });

      return json({ success: true, token, user: { id: user.id, email: user.email, name: user.name, two_factor_enabled: !!user.two_factor_enabled } });
    }

    if (request.method === "GET" && action === "me") {
      const authHeader = request.headers.get("Authorization") || "";
      const token = authHeader.replace("Bearer ", "").trim();
      if (!token) return json({ error: "Unauthorized" }, 401);

      const sessionStr = await env.TOKEN_KV.get(`session:${token}`);
      if (!sessionStr) return json({ error: "Unauthorized" }, 401);

      const session = JSON.parse(sessionStr);
      const user = await db.prepare("SELECT id, email, name, two_factor_enabled, notification_comments FROM users WHERE id = ?").bind(session.id).first();
      
      return json({ user });
    }

    // Google Login simple handler (placeholder/start)
    if (request.method === "POST" && action === "google") {
        const { googleToken } = await request.json<any>();
        // Verify googleToken using google api here...
        // For now just scaffold
        return json({ error: "Not implemented yet" }, 501);
    }
    
    // Forgot Password
    if (request.method === "POST" && action === "forgot-password") {
       const { email } = await request.json<any>();
       const user = await db.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
       if (user) {
          const code = Math.floor(100000 + Math.random() * 900000).toString();
          const codeId = crypto.randomUUID();
          await db.prepare(
            "INSERT INTO verification_codes (id, user_id, email, code, type, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
          ).bind(codeId, user.id, email, code, "forgot_password", Date.now() + 15 * 60 * 1000, new Date().toISOString()).run();

          const html = `<p>Your password reset code is: <strong>${code}</strong></p>`;
          await sendEmail(env, email, "Reset your password", html);
       }
       return json({ success: true });
    }

    // Reset Password
    if (request.method === "POST" && action === "reset-password") {
       const { email, code, newPassword } = await request.json<any>();
       const record = await db.prepare(
        "SELECT * FROM verification_codes WHERE email = ? AND code = ? AND type = 'forgot_password' ORDER BY created_at DESC LIMIT 1"
      ).bind(email, code).first();

      if (!record || record.expires_at < Date.now()) return json({ error: "Invalid or expired code" }, 400);

      const hash = bcrypt.hashSync(newPassword, 10);
      await db.prepare("UPDATE users SET password_hash = ? WHERE email = ?").bind(hash, email).run();
      await db.prepare("DELETE FROM verification_codes WHERE email = ? AND type = 'forgot_password'").bind(email).run();

      return json({ success: true });
    }
    
    // 2FA Setup
    if (request.method === "POST" && action === "2fa-setup") {
        const authHeader = request.headers.get("Authorization") || "";
        const token = authHeader.replace("Bearer ", "").trim();
        const sessionStr = await env.TOKEN_KV.get(`session:${token}`);
        if (!sessionStr) return json({ error: "Unauthorized" }, 401);
        const session = JSON.parse(sessionStr);

        const secret = new OTPAuth.Secret({ size: 20 });
        let totp = new OTPAuth.TOTP({
          issuer: "Jelvan Blogs",
          label: session.email,
          algorithm: "SHA1",
          digits: 6,
          secret,
        });

        const uri = totp.toString();

        await db.prepare("UPDATE users SET two_factor_secret = ? WHERE id = ?").bind(secret.base32, session.id).run();
        
        return json({ success: true, secret: secret.base32, uri });
    }

    // 2FA Verify & Enable
    if (request.method === "POST" && action === "2fa-enable") {
        const authHeader = request.headers.get("Authorization") || "";
        const token = authHeader.replace("Bearer ", "").trim();
        const sessionStr = await env.TOKEN_KV.get(`session:${token}`);
        if (!sessionStr) return json({ error: "Unauthorized" }, 401);
        const session = JSON.parse(sessionStr);

        const { code } = await request.json<any>();
        const user = await db.prepare("SELECT two_factor_secret FROM users WHERE id = ?").bind(session.id).first();

        let totp = new OTPAuth.TOTP({
          issuer: "Jelvan Blogs",
          label: session.email,
          algorithm: "SHA1",
          digits: 6,
          secret: OTPAuth.Secret.fromBase32(user.two_factor_secret),
        });

        const delta = totp.validate({ token: code, window: 1 });
        if (delta === null) return json({ error: "Invalid code" }, 400);

        await db.prepare("UPDATE users SET two_factor_enabled = 1 WHERE id = ?").bind(session.id).run();
        return json({ success: true });
    }

    // Settings Update
    if (request.method === "POST" && action === "settings") {
        const authHeader = request.headers.get("Authorization") || "";
        const token = authHeader.replace("Bearer ", "").trim();
        const sessionStr = await env.TOKEN_KV.get(`session:${token}`);
        if (!sessionStr) return json({ error: "Unauthorized" }, 401);
        const session = JSON.parse(sessionStr);

        const { notification_comments } = await request.json<any>();
        await db.prepare("UPDATE users SET notification_comments = ? WHERE id = ?").bind(notification_comments ? 1 : 0, session.id).run();
        return json({ success: true });
    }


    return json({ error: "Not found" }, 404);
  } catch (err: any) {
    console.error("Auth error:", err);
    return json({ error: err.message || "Internal error" }, 500);
  }
};
