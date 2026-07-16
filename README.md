Security and Rate Limiting

This update adds a Durable Object-based rate limiter and a purge URL whitelist to prevent abuse.

New repository secrets (exact names)

- RATE_LIMIT_UPLOADS — integer, max uploads per window per client (default 60)
- RATE_LIMIT_PURGES — integer, max purge requests per window per client (default 10)
- RATE_LIMIT_WINDOW_SECONDS — integer, window length in seconds (default 60)
- PURGE_WHITELIST — comma-separated list of allowed hostnames or hostname/path prefixes for purge (e.g. example.com, assets.example.com/uploads/)

Behavior

- Rate limiting is implemented with a Durable Object (class RateLimit). Each client is identified by JWT subject if available (sub claim) or by IP address (cf-connecting-ip). The DO stores counters per key and enforces limits.
- Purge requests are validated against PURGE_WHITELIST. If no whitelist is configured, purge will be denied unless purge_everything is true and the caller is authorized (use with caution).

Operational notes

- Durable Objects add cost and latency; choose sensible defaults for RATE_LIMIT_* values.
- Ensure PURGE_WHITELIST contains only trusted hostnames and prefixes to avoid accidental mass purges.
