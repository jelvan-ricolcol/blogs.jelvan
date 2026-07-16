if (request.method === 'GET' && pathname === '/status') {
  const jti = url.searchParams.get('jti');
  if (!jti) return new Response(JSON.stringify({ error: 'Missing jti' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  const rec = await this.state.storage.get(jti);
  return new Response(JSON.stringify({ found: !!rec, record: rec || null }), { headers: { 'Content-Type': 'application/json' } });
}

if (request.method === 'POST' && pathname === '/store') {
  let body: any;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  const { jti, sub, issued_at, expires_at, meta } = body || {};
  if (!jti || !issued_at) return new Response(JSON.stringify({ error: 'Missing jti or issued_at' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  const record = { jti, sub: sub || null, issued_at, expires_at: expires_at || null, meta: meta || null, revoked: false };
  await this.state.storage.put(jti, record);
  return new Response(JSON.stringify({ ok: true, record }), { headers: { 'Content-Type': 'application/json' } });
}

if (request.method === 'POST' && pathname === '/revoke') {
  let body: any;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  const { jti } = body || {};
  if (!jti) return new Response(JSON.stringify({ error: 'Missing jti' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  const rec = await this.state.storage.get(jti);
  if (!rec) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  rec.revoked = true;
  await this.state.storage.put(jti, rec);
  return new Response(JSON.stringify({ ok: true, record: rec }), { headers: { 'Content-Type': 'application/json' } });
}

return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
