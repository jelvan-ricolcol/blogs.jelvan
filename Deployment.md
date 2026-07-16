# Deployment and Configuration

This document explains how to configure the repository and deploy the Cloudflare Worker.

Required repository secrets (exact names)

- CLOUDFARE_ACCOUNT_ID — Your Cloudflare account id
- CLOUDFARE_API_TOKEN — An API token with permissions to publish Workers and purge cache (Zone.Cache Purge:Edit for the zone, Workers:Edit)
- CLOUDFARE_S3_ENDPOINT — Base R2 S3 endpoint (e.g. https://<account-id>.r2.cloudflarestorage.com)
- R2_ACCESS_KEY_ID — R2 access key id (if needed for other tooling)
- R2_SECRET_ACCESS_KEY — R2 secret access key
- R2_BUCKET — The R2 bucket name (namespace) to bind in wrangler
- CLOUDFARE_ZONE_ID — Zone ID used for cache purge
- BACKEND_JWT_SECRET — HS256 secret used to verify fallback JWTs (short-lived)
- CF_ACCESS_JWKS_URL — (optional but recommended) JWKS URL for validating Cloudflare Access tokens

How it works

- The GitHub Action reads the template wrangler.template.toml and substitutes CLOUDFARE_ACCOUNT_ID and R2_BUCKET into wrangler.toml at build time. It then runs `wrangler publish` using CF_API_TOKEN set from CLOUDFARE_API_TOKEN.
- The Worker exposes three endpoints:
  - GET /health
  - POST /upload (multipart/form-data, file field name `file`) — requires a valid Cloudflare Access token or a signed HS256 JWT
  - POST /purge (JSON { files: [urls...] } or { purge_everything: true }) — requires auth

Authentication

Preferred: Protect the Worker route with Cloudflare Access and set CF_ACCESS_JWKS_URL secret so the Worker can verify access tokens. This prevents header forgery.

Fallback: Use HS256 JWTs signed with BACKEND_JWT_SECRET. Generate short-lived tokens server-side and store the secret securely as a GitHub repo secret.

How to add the secrets

Via GitHub UI:
1. Go to your repository -> Settings -> Secrets and variables -> Actions -> New repository secret
2. Add each secret with the exact name listed above.

Via gh CLI:
- gh secret set BACKEND_JWT_SECRET --body "<your-secret>"
- gh secret set CF_ACCESS_JWKS_URL --body "https://<your-team>.cloudflareaccess.com/cdn-cgi/access/certs"

Local dev / testing
- Install deps: npm ci
- Build: npm run build
- Render wrangler.toml locally:
  sed "s/__CLOUDFARE_ACCOUNT_ID__/your-account-id/g; s/__R2_BUCKET_NAME__/your-r2-bucket/g" wrangler.template.toml > wrangler.toml
- Run locally:
  npx wrangler dev --local

