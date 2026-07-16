# Deployment and Configuration

This document explains how to configure the repository and deploy the Cloudflare Worker.

Required repository secrets (exact names)

- CLOUDFARE_ACCOUNT_ID — Your Cloudflare account id
- CLOUDFARE_API_TOKEN — An API token with permissions to publish Workers and purge cache (Zone.Cache Purge:Edit for the zone, Workers:Edit, Account.Settings:Read as needed)
- CLOUDFARE_S3_ENDPOINT — Base R2 S3 endpoint (e.g. https://<account-id>.r2.cloudflarestorage.com)
- R2_ACCESS_KEY_ID — R2 access key id (if needed for other tooling)
- R2_SECRET_ACCESS_KEY — R2 secret access key
- R2_BUCKET — The R2 bucket name (namespace) to bind in wrangler
- CLOUDFARE_ZONE_ID — Zone ID used for cache purge
- BACKEND_AUTH_TOKEN — A strong secret to protect the /upload and /purge endpoints

How it works

- The GitHub Action reads the template wrangler.template.toml and substitutes CLOUDFARE_ACCOUNT_ID and R2_BUCKET into wrangler.toml at build time. It then runs `wrangler publish` using CF_API_TOKEN set from CLOUDFARE_API_TOKEN.
- The Worker exposes three endpoints:
  - GET /health
  - POST /upload (multipart/form-data, file field name `file`) — requires x-backend-auth header set to BACKEND_AUTH_TOKEN
  - POST /purge (JSON { files: [urls...] } or { purge_everything: true }) — requires auth

Deploy from branch

Push to the branch `backend/cloudfare-r2` and the workflow will run and publish the Worker to Cloudflare.

Security notes

- Limit CF API token scope to least privilege. For purge and worker publish the token needs appropriate scopes — prefer creating a scoped token rather than Global API Key.
- Rotate secrets regularly.
- Consider adding rate-limiting or authentication/authorization with short-lived tokens for production.

