## Token Issuer

Added a small Node/Express token issuer under tools/token-issuer. It signs HS256 JWTs using BACKEND_JWT_SECRET and protects the mint endpoint with ISSUER_API_KEY.

Secrets to add (GitHub Actions / environment):
- BACKEND_JWT_SECRET
- ISSUER_API_KEY

Usage: see tools/token-issuer/README.md
