// Cloudflare Worker — AeroDataBox proxy for the Edinburgh departures board.
//
// Why: the board is a static site, so calling AeroDataBox directly means every
// visitor needs their own RapidAPI key. This Worker holds ONE key server-side
// (as a secret) and adds CORS, so the deployed board can show live data with no
// per-user key. Point the app's "Proxy URL" setting at this Worker.
//
// Deploy: see proxy/README.md (wrangler deploy + `wrangler secret put RAPIDAPI_KEY`).

const UPSTREAM = 'https://aerodatabox.p.rapidapi.com';
const UPSTREAM_HOST = 'aerodatabox.p.rapidapi.com';
const EDGE_CACHE_SECONDS = 30; // spare the free-tier quota across visitors

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin, env.ALLOWED_ORIGIN || '*');

    // CORS preflight.
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== 'GET') {
      return json({ error: 'Method not allowed' }, 405, cors);
    }

    const url = new URL(request.url);

    // Health check.
    if (url.pathname === '/' || url.pathname === '/health') {
      return json({ ok: true, service: 'edi-departures-proxy', hasKey: !!env.RAPIDAPI_KEY }, 200, cors);
    }

    // Only proxy the flights/airport (FIDS) endpoints — never an open relay.
    if (!url.pathname.startsWith('/flights/')) {
      return json({ error: 'Not found' }, 404, cors);
    }
    if (!env.RAPIDAPI_KEY) {
      return json({ error: 'Proxy is missing the RAPIDAPI_KEY secret.' }, 500, cors);
    }

    const target = UPSTREAM + url.pathname + url.search;

    let upstream;
    try {
      upstream = await fetch(target, {
        headers: {
          'X-RapidAPI-Key': env.RAPIDAPI_KEY,
          'X-RapidAPI-Host': UPSTREAM_HOST,
          Accept: 'application/json',
        },
        cf: { cacheTtl: EDGE_CACHE_SECONDS, cacheEverything: true },
      });
    } catch {
      return json({ error: 'Upstream request failed.' }, 502, cors);
    }

    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: {
        ...cors,
        'Content-Type': upstream.headers.get('Content-Type') || 'application/json',
        'Cache-Control': `public, max-age=${EDGE_CACHE_SECONDS}`,
      },
    });
  },
};

function corsHeaders(origin, allowed) {
  // allowed === '*' -> open; otherwise echo the origin only when it matches.
  const allowOrigin = allowed === '*' ? '*' : origin === allowed ? origin : allowed;
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
