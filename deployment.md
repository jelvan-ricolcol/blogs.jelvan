# Jelvan® — Timeline & Private Dashboard Deployment Guide

This guide details the steps required to deploy the **Jelvan® Timeline & Private Dashboard** application from a GitHub repository to **Cloudflare Pages**. 

---

## 📂 Project Structure Overview

The codebase is organized as a modern **React 18+** application built with **Vite** and styled with **Tailwind CSS**. It runs fully client-side (Single Page Application) with durable and encrypted browser-level state persistence.

```text
├── .env.example              # Sample environment configuration template
├── .gitignore                # Specified files to prevent committing to git (node_modules, dist, etc.)
├── index.html                # SPA primary entry page
├── metadata.json             # AI Studio Applet configuration
├── package.json              # App dependencies, engines, and NPM build scripts
├── tsconfig.json             # TypeScript compiler settings
├── vite.config.ts            # Vite bundler configuration with Tailwind support
└── src/
    ├── main.tsx              # React mounting root
    ├── App.tsx               # Main app state controller, layout router, and core navigation
    ├── index.css             # Global CSS style declarations & Tailwind theme variables
    ├── types.ts              # Global TypeScript interfaces, schemas, and enums
    ├── data/
    │   └── initialData.ts    # Seed data templates (Milestones, Comments, Visitor Logs)
    └── components/
        ├── TimelineView.tsx  # Dynamic public timeline feed component
        ├── DashboardView.tsx # Protected admin panel and analytics view
        ├── PostFormModal.tsx # Form modal to create/edit timeline events
        └── MediaLightbox.tsx # Interactive lightroom slider for images/videos
```

---

## 🛠️ Prerequisites & Local Configuration

Before deploying, ensure you have the following ready:
1. A **GitHub Account** (Free or Team plan).
2. A **Cloudflare Account** with Cloudflare Pages activated.
3. Node.js (v18.x or v20.x recommended) installed locally for testing.

### Secure Private Password Configuration
Your private admin dashboard relies on a master password. To keep this private, define it using a secure environment variable:
- Locally, create a `.env` file in the project root:
  ```env
  VITE_ADMIN_PASSWORD="YourSuperSecureMasterPasswordHere"
  ```
- *Note:* Do **not** commit this `.env` file to your GitHub repository. It is ignored by `.gitignore` for security.

---

## 🐙 Step 1: Upload Your Code to GitHub

1. **Initialize Git Repository** (if not already done):
   ```bash
   git init
   ```
2. **Add Files & Commit**:
   ```bash
   git add .
   git commit -m "feat: init Jelvan Timeline and Dashboard with Gold-Black Theme"
   ```
3. **Create a Private GitHub Repository**:
   - Go to [GitHub](https://github.com) and create a new repository.
   - We highly recommend making this repository **Private** to protect personal milestones and structural logs.
4. **Link Local Repository to GitHub & Push**:
   ```bash
   git remote add origin https://github.com/your-username/your-repo-name.git
   git branch -M main
   git push -u origin main
   ```

---

## ☁️ Step 2: Deploy to Cloudflare Pages

Cloudflare Pages provides a serverless, global hosting platform that builds your application directly from your GitHub repository whenever you push changes.

### 1. Connect GitHub to Cloudflare
1. Log in to your [Cloudflare Dashboard](https://dash.cloudflare.com).
2. On the left sidebar, navigate to **Workers & Pages**.
3. Click the **Create** button and select the **Pages** tab.
4. Click **Connect to Git**.
5. Log in to your GitHub account and authorize Cloudflare to access your newly created repository.

### 2. Configure Build Settings
Once the repository is linked, select your project repository and fill in the following exact build parameters:

| Configuration Field | Target Value | Description |
| :--- | :--- | :--- |
| **Project Name** | `jelvan-timeline` | Defines your default subdomain (e.g., `jelvan-timeline.pages.dev`) |
| **Production Branch** | `main` | Cloudflare will trigger builds on push to this branch |
| **Framework Preset** | `Vite` | Auto-configures standard Vite parameters |
| **Build Command** | `npm run build` | Compiles your TypeScript code and bundles assets |
| **Build Output Directory** | `dist` | Target folder compiled by Vite containing static assets |

### 3. Add Environment Variables (CRITICAL)
To lock and protect your **Private Dashboard**:
1. Scroll down to the **Environment variables (advanced)** section in Cloudflare Pages.
2. Click **Add variable** and enter:
   - **Variable name:** `VITE_ADMIN_PASSWORD`
   - **Value:** `YourSecureMasterPassword` (the secret password you will use to log into your dashboard)
3. Ensure this variable is active for both the **Production** and **Preview** environments.

### 4. Deploy!
1. Click **Save and Deploy**.
2. Cloudflare will provision a secure container, download your repository, install dependencies, inject the secure password, and build the static SPA.
3. Within 1-2 minutes, you will receive a public `.pages.dev` URL where your site is live!

---

## ⚡ Cloudflare Architecture: Pages, Workers, D1, & R2

By default, **Jelvan Blogs** is built as an offline-first Single Page Application with dynamic views, local analytics, content moderation, and browser-level vault backups. 

To make your timeline, posts, comments, notifications, and settings **viewable worldwide** and synchronized across all visitors instantly, you must upgrade the application to a **Centralized Cloud Backend**. 

Rather than deploying a separate independent server container, the most elegant and cost-effective approach is using **Cloudflare Pages** combined with **Pages Functions** (under the hood powered by Cloudflare Workers), backed by **Cloudflare D1** (Serverless SQL Database) and **Cloudflare R2** (Serverless Object Storage).

---

### 📂 Full-Stack Repository Directory Map
For a global multi-user synchronized setup, your repository structure will expand to include a `/functions/` directory for serverless routes:
```text
├── .env.example              # Secret key template (VITE_ADMIN_PASSWORD)
├── index.html                # App entry point
├── package.json              # App compilation scripts
├── public/
│   └── _redirects            # SPA router fallback (/* -> /index.html 200)
├── schema.sql                # D1 SQL Schema blueprint (Created by you)
├── wrangler.toml             # Local Cloudflare config (Created by you)
├── functions/                # Serverless Backend (Built-in Pages Functions)
│   └── api/
│       ├── posts.ts          # CRUD endpoint for timeline posts
│       ├── comments.ts       # CRUD endpoint for post comments
│       └── upload.ts         # Media upload proxy to R2 bucket
└── src/
    └── App.tsx               # Frontend UI fetching from /api/*
```

---

### 1. Database Blueprint: Cloudflare D1 Schema (`schema.sql`)
Create a file called `schema.sql` at the root of your project to design tables matching the application's types (`posts`, `comments`, `notifications`, `banned_words`):

```sql
-- schema.sql

-- 1. Timeline Posts Table
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  date TEXT NOT NULL,
  media TEXT,          -- JSON string array: ["url1", "url2"]
  likes INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  isPinned INTEGER DEFAULT 0, -- 0 = false, 1 = true
  deviceSignature TEXT
);

-- 2. Comments Table
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  postId TEXT NOT NULL,
  author TEXT NOT NULL,
  avatarSeed TEXT NOT NULL,
  text TEXT NOT NULL,
  date TEXT NOT NULL,
  isPinned INTEGER DEFAULT 0,
  isApproved INTEGER DEFAULT 0, -- Moderation check (0 = pending/hidden, 1 = approved)
  isReported INTEGER DEFAULT 0,
  parentId TEXT, -- For nested comment replies
  deviceSignature TEXT
);

-- 3. Banned Moderation Words Table
CREATE TABLE IF NOT EXISTS banned_words (
  word TEXT PRIMARY KEY
);

-- 4. System Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- 'success' | 'warning' | 'info' | 'comment'
  date TEXT NOT NULL,
  isRead INTEGER DEFAULT 0
);

-- Seed initial records (Optional)
INSERT OR IGNORE INTO banned_words (word) VALUES ('spam'), ('scam'), ('offensive');
```

---

### 2. Built-in Backend: Pages Functions (Workers API Routes)
Cloudflare compiles files inside `/functions/` automatically into serverless Worker routes. Create these key backend scripts to bridge your UI with D1 and R2:

#### A. Post Management API (`/functions/api/posts.ts`)
Handles getting posts (read worldwide) and updating them (requiring admin authentication).

```typescript
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
```

#### B. Comment System API (`/functions/api/comments.ts`)
Saves visitor feedback globally and supports real-time administrative pins or deletes.

```typescript
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
```

#### C. Media Upload Proxy (`/functions/api/upload.ts`)
Saves files directly into Cloudflare's global edge object store (**R2**), bypassing base64 local storage limitations.

```typescript
// functions/api/upload.ts
interface Env {
  MEDIA_BUCKET: R2Bucket;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const authHeader = context.request.headers.get("Authorization");
    if (!authHeader || authHeader !== context.env.VITE_ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const formData = await context.request.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), { status: 400 });
    }

    const fileExtension = file.name.split(".").pop();
    const uniqueKey = `uploads/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;

    // Upload to R2 Bucket
    await context.env.MEDIA_BUCKET.put(uniqueKey, file.stream(), {
      httpMetadata: { contentType: file.type }
    });

    // Replace this with your custom domain or R2 public access URL if configured
    const fileUrl = `https://media.jelvan.pro/${uniqueKey}`;

    return new Response(JSON.stringify({ success: true, url: fileUrl }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
```

---

### 3. Activating Cloud Databases on Cloudflare (Required Actions)

Follow this exact action list to configure bindings and deploy successfully:

#### Step 1: Create resources in Cloudflare Dashboard
1. Log in to your **Cloudflare Dashboard** and select your account.
2. Under the **Workers & Pages** sidebar category, select **D1**.
3. Click **Create database** -> Choose **D1** -> Name it `jelvan-blogs-db`. Click Create.
4. Copy the unique **Database ID** displayed in your database overview page.
5. Under **Workers & Pages**, select **R2**.
6. Click **Create bucket**, name it `jelvan-blogs-media`, and select your target region. Click Create.

#### Step 2: Establish wrangler.toml configuration (For Local Development)
To test serverless functions and databases on your laptop, create a `wrangler.toml` file at the root:
```toml
# wrangler.toml
name = "jelvan-blogs"
pages_build_output_dir = "dist"

[[d1_databases]]
binding = "DB"
database_name = "jelvan-blogs-db"
database_id = "PASTE_YOUR_COPIED_D1_DATABASE_ID_HERE"

[[r2_buckets]]
binding = "MEDIA_BUCKET"
bucket_name = "jelvan-blogs-media"
```

#### Step 3: Run the Schema Migration (Cloud Sync)
Initialize your remote cloud SQL tables on Cloudflare using wrangler in your terminal:
```bash
# 1. Install Wrangler CLI locally (if not already installed)
npm install wrangler --save-dev

# 2. Run schema.sql against your online Cloudflare D1 database
npx wrangler d1 execute jelvan-blogs-db --remote --file=./schema.sql
```

#### Step 4: Map Bindings in the Pages Dashboard UI (Crucial for Live Production)
Wrangler only governs local testing; live production relies on UI Dashboard bindings:
1. Open your **Cloudflare Pages** project panel -> Go to the **Settings** tab.
2. Select **Functions** from the left-hand navigation list.
3. Scroll down to **D1 database bindings**:
   * Click **Add binding**.
   * Set **Variable name** as `DB`.
   * Set **D1 database** as your created `jelvan-blogs-db`.
4. Scroll down further to **R2 bucket bindings**:
   * Click **Add binding**.
   * Set **Variable name** as `MEDIA_BUCKET`.
   * Set **R2 bucket** as your created `jelvan-blogs-media`.
5. Under **Environment variables (advanced)**, add:
   * **Variable name:** `VITE_ADMIN_PASSWORD`
   * **Value:** `YourMasterSecretPassword`
6. Click **Save** to lock these integrations.

#### Step 5: Run a local development test
Run the frontend Vite compiler and serverless backend local simulator simultaneously:
```bash
npx wrangler pages dev dist --binding DB=jelvan-blogs-db --binding MEDIA_BUCKET=jelvan-blogs-media
```
Your dynamic local environment will boot up on `http://localhost:8788`, executing SQL queries and API requests exactly as they will run in live production!

---

## 🔄 Step 4: Single Page Application (SPA) Routing (Pre-Configured)

Since this app uses dynamic client-side view switching, direct loading of sub-paths or manual refreshing on a deep URL could return a `404 Not Found` on hosting providers.

To prevent this, a `_redirects` file has been pre-configured inside the `public/` directory with the following rule:
```text
/*    /index.html   200
```
Vite automatically bundles this file into the root of your `dist` build. Cloudflare Pages detects it natively, forwarding all nested paths back to `index.html` for clean, seamless client-side SPA routing on reload.

---

## 🔒 Security & local Vault backups
- **Local Persistence:** All posts, comments, notifications, and analytics are safely stored and compiled into the browser's `localStorage` engine. This ensures the owner retains absolute ownership over their data.
- **Admin Backup System:** Under the **Private Dashboard > Local Backup** panel, you can download a full backup file `jelvan-timeline-backup.json` at any point.
- **Durable Recovery:** If you change browsers or devices, log in using your password on the new device, open the settings, and upload the `jelvan-timeline-backup.json` file to restore all metrics, activity logs, and timelines instantly.

---
*Crafted with precision for Jelvan® — Elegance, Security, and Speed.*

