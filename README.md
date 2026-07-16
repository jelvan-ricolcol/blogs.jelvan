# Blogs.jelvan - Cloudflare Worker backend for R2 and Cache Purge

This branch provides a Cloudflare Worker implementation that:

- Accepts file uploads (multipart/form-data) and stores them in an R2 bucket
- Purges Cloudflare cache (zone-level) for specified files or everything
- Exposes a /health endpoint

Security and secrets

This implementation expects the following GitHub repository secrets (names must match exactly):

- CLOUDFARE_ACCOUNT_ID
- CLOUDFARE_API_TOKEN
- CLOUDFARE_S3_ENDPOINT
- R2_ACCESS_KEY_ID
- R2_SECRET_ACCESS_KEY
- R2_BUCKET
- CLOUDFARE_ZONE_ID
- BACKEND_AUTH_TOKEN

Notes:
- CF API token will be supplied to wrangler via the workflow as CF_API_TOKEN using the value from CLOUDFARE_API_TOKEN.
- Do not commit any secret values to the repo.

Files added

- src/index.ts - Worker implementation
- wrangler.template.toml - Template converted to wrangler.toml in CI using secrets
- .github/workflows/deploy-cloudflare-worker.yml - CI workflow to build and publish
- README.md / Deployment.md - instructions

