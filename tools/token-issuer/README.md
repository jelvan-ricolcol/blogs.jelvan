Token Issuer

This lightweight Node/Express service issues short-lived HS256 JWTs signed with BACKEND_JWT_SECRET. It is intended to run on a secure machine (CI/CD agent, admin server) and not exposed publicly without network-level protection (VPN, Cloudflare Access, IP allowlist).

Configuration (environment variables)
- BACKEND_JWT_SECRET (required): HS256 signing secret. Use the same secret as configured for the Worker (BACKEND_JWT_SECRET GitHub secret).
- ISSUER_API_KEY (required): a strong API key used to protect the /mint endpoint. Keep it secret (GitHub secret or environment variable in CI).
- PORT (optional): port to listen on (default 3000)

Usage
1) Install dependencies
   cd tools/token-issuer
   npm ci

2) Run locally (for admin use only)
   BACKEND_JWT_SECRET="$(openssl rand -base64 48)" ISSUER_API_KEY="$(openssl rand -hex 32)" npm start

3) Mint a token (example using curl)
   curl -X POST http://localhost:3000/mint \
     -H "Authorization: Bearer <ISSUER_API_KEY>" \
     -H "Content-Type: application/json" \
     -d '{"sub":"ci-agent","expires_in":300,"scope":"upload:purge"}'

Security recommendations
- Run this service in a trusted, private environment (not publicly open without Access protection).
- Protect the endpoint with Cloudflare Access (or IP allowlist) if you must expose it.
- Store ISSUER_API_KEY and BACKEND_JWT_SECRET as GitHub Actions secrets if used in CI workflows.
- Rotate BACKEND_JWT_SECRET and ISSUER_API_KEY regularly.
