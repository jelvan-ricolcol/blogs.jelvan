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

## 🔄 Step 3: Single Page Application (SPA) Routing (Pre-Configured)

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
