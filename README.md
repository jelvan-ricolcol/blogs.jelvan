# Blogs.jelvan - Cloudflare Worker backend for R2 and Cache Purge

This branch provides a Cloudflare Worker implementation that:

- Accepts file uploads (multipart/form-data) and stores them in an R2 bucket
- Purges Cloudflare cache (zone-level) for specified files or everything
- Exposes a /health endpoint
- Supports authentication by Cloudflare Access JWTs (preferred) and fallback short-lived HS256 JWTs signed with BACKEND_JWT_SECRET

Security and secrets

This implementation expects the following GitHub repository secrets (names must match exactly):

- CLOUDFARE_ACCOUNT_ID
- CLOUDFARE_API_TOKEN
- CLOUDFARE_S3_ENDPOINT
- R2_ACCESS_KEY_ID
- R2_SECRET_ACCESS_KEY
- R2_BUCKET
- CLOUDFARE_ZONE_ID
- BACKEND_JWT_SECRET
- CF_ACCESS_JWKS_URL (optional, recommended for verifying Cloudflare Access tokens)

Notes:
- If CF_ACCESS_JWKS_URL is provided, the Worker will verify the signature of Cf-Access-Jwt-Assertion using the remote JWKS and reject tokens that don't verify. If not provided, the Worker will still validate exp/nbf claims but will trust Cloudflare Access enforcement to prevent forgery. For production, add CF_ACCESS_JWKS_URL secret.
- Do not commit any secret values to the repo.
