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
- RATE_LIMIT_UPLOADS — (optional) uploads per window, default 60
- RATE_LIMIT_PURGES — (optional) purges per window, default 10
- RATE_LIMIT_WINDOW_SECONDS — (optional) window seconds, default 60
- PURGE_WHITELIST — (optional) comma-separated allowed hostnames or hostname/path prefixes

How it works

- The GitHub Action reads the template wrangler.template.toml and substitutes CLOUDFARE_ACCOUNT_ID and R2_BUCKET into wrangler.toml at build time. It then runs `wrangler publish` using CF_API_TOKEN set from CLOUDFARE_API_TOKEN.
- The Worker exposes three endpoints:
  - GET /health
  - POST /upload (multipart/form-data, file field name `file`) — requires a valid Cloudflare Access token or a signed HS256 JWT; rate limited per client
  - POST /purge (JSON { files: [urls...] } or { purge_everything: true }) — requires auth and is rate-limited; files must match PURGE_WHITELIST unless purge_everything is true

Authentication

- Preferred: Protect the Worker route with Cloudflare Access and set CF_ACCESS_JWKS_URL secret so the Worker can verify access tokens.
- Fallback: Use HS256 JWTs signed with BACKEND_JWT_SECRET.

Durable Objects & Rate Limiting

- A Durable Object 'RateLimit' is used to track usage counters per client key. Ensure your account supports Durable Objects (Workers Unlimited or paid plan may be required for heavy usage).

