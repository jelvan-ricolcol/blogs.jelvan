# Cloudflare API Authorization Documentation

To authorize requests to the Cloudflare API, you typically use an API token or API key. Cloudflare strongly recommends using API tokens with only the scopes and permissions needed for your specific use case. Here’s a summary of the authorization process and best practices.

## Base URL

The base URL for all API requests is:
```text
https://api.cloudflare.com/client/v4/
```

## Authorization Methods

### 1. API Token (Recommended)
- Create an API Token in the Cloudflare dashboard with only the required permissions.
- Use it in API requests as an HTTP Authorization header:
  ```http
  Authorization: ******
  ```
- Example with `curl`:
  ```bash
  curl "https://api.cloudflare.com/client/v4/zones/$ZONE_ID" \
       --header "Authorization: ******"
  ```

### 2. Global API Key (Legacy)
- Use your account email and Global API Key, though it's less secure than tokens.
- Not recommended for production applications due to wide permissions.
- Required Headers:
  ```http
  X-Auth-Email: <YOUR_EMAIL>
  X-Auth-Key: <YOUR_GLOBAL_API_KEY>
  ```

### 3. OAuth Clients
- Cloudflare also supports OAuth clients for advanced integrations.

## Best Practices and Security

- **Never expose or commit your API key or token to public repositories.**
- Use environment variables to store your token securely.
- Rotate tokens regularly and audit their usage in the Cloudflare dashboard.

## Reference Documentation

- [Cloudflare: How to Make API Calls](https://developers.cloudflare.com/fundamentals/api/how-to/make-api-calls/)
- [Cloudflare API Tokens Dashboard](https://dash.cloudflare.com/profile/api-tokens)
- [Cloudflare API Reference](https://developers.cloudflare.com/api/)
