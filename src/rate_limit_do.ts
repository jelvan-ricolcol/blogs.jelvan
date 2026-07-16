// Durable Object for rate limiting
export class RateLimit {
  state: DurableObjectState;
  env: any;
  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
  }

  // Expected POST JSON: { action: 'incr', key: string, limit: number, window: number }
  async fetch(request: Request) {
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
    let body: any;
    try {
      body = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const { action, key, limit = 60, window = 60 } = body;
    if (action !== 'incr' || !key) return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

    const now = Date.now();
    const recRaw = (await this.state.storage.get<{"count": number; windowStart: number}>(key)) || null;
    let rec = recRaw;
    if (!rec || now - (rec.windowStart || 0) > window * 1000) {
      rec = { count: 1, windowStart: now };
    } else {
      rec.count = (rec.count || 0) + 1;
    }

    await this.state.storage.put(key, rec);

    const remaining = rec.count > limit ? 0 : Math.max(0, limit - rec.count);
    const reset = Math.floor((rec.windowStart + window * 1000 - now) / 1000);

    const allowed = rec.count <= limit;

    return new Response(JSON.stringify({ allowed, remaining, limit, used: rec.count, reset }), { headers: { 'Content-Type': 'application/json' } });
  }
}
