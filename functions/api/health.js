export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response(null, { status: 405 });
  }

  const checks = {
    secret_key: !!env.ANTHROPIC_API_KEY,
    secret_hash: !!env.IP_HASH_SECRET,
    binding_kv: !!env.RATE_LIMIT,
  };

  const ok = checks.secret_key && checks.secret_hash && checks.binding_kv;

  const body = {
    status: ok ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    commit: (env.CF_PAGES_COMMIT_SHA || 'local').slice(0, 7),
  };

  return new Response(JSON.stringify(body), {
    status: ok ? 200 : 503,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Robots-Tag': 'noindex',
    },
  });
}
