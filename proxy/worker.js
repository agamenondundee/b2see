// Cloudflare Worker — keyless proxy for the Edinburgh departures board.
//
// Holds upstream API credentials as server-side secrets and adds CORS, so the
// static board can show live data with no per-user key. Routes:
//
//   /flights/*   -> AeroDataBox (RapidAPI)        — needs RAPIDAPI_KEY
//   /bus/*       -> TransportAPI                   — needs TRANSPORTAPI_APP_ID + _APP_KEY
//   /eurail/*    -> v6.db.transport.rest (DB)      — keyless; proxied for CORS + caching
//
// Trains don't go through here (their Huxley/Darwin feed is already CORS-enabled).
// EU rail's upstream is keyless too, but proxying it adds reliable CORS and an
// edge cache shared across visitors — important because the public DB instance is
// heavily rate-limited. Deploy: see proxy/README.md.

const AERO_UPSTREAM = 'https://aerodatabox.p.rapidapi.com';
const AERO_HOST = 'aerodatabox.p.rapidapi.com';
const TAPI_UPSTREAM = 'https://transportapi.com/v3/uk';
const DBREST_UPSTREAM = 'https://v6.db.transport.rest';
const EDGE_CACHE_SECONDS = 30; // spare the free-tier quotas across visitors
const EURAIL_CACHE_SECONDS = 60; // DB's free instance is rate-limited — cache harder

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin, env.ALLOWED_ORIGIN || '*');

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405, cors);

    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/' || path === '/health') {
      return json(
        {
          ok: true,
          service: 'edi-departures-proxy',
          flights: !!env.RAPIDAPI_KEY,
          buses: !!(env.TRANSPORTAPI_APP_ID && env.TRANSPORTAPI_APP_KEY),
          eurail: true, // keyless upstream — always available
        },
        200,
        cors,
      );
    }

    let target;
    let upstreamHeaders;
    let cacheTtl = EDGE_CACHE_SECONDS;

    if (path.startsWith('/flights/')) {
      if (!env.RAPIDAPI_KEY) return json({ error: 'Proxy missing RAPIDAPI_KEY secret.' }, 500, cors);
      target = AERO_UPSTREAM + path + url.search;
      upstreamHeaders = { 'X-RapidAPI-Key': env.RAPIDAPI_KEY, 'X-RapidAPI-Host': AERO_HOST, Accept: 'application/json' };
    } else if (path.startsWith('/bus/')) {
      if (!env.TRANSPORTAPI_APP_ID || !env.TRANSPORTAPI_APP_KEY) {
        return json({ error: 'Proxy missing TRANSPORTAPI_APP_ID / TRANSPORTAPI_APP_KEY secrets.' }, 500, cors);
      }
      const t = new URL(TAPI_UPSTREAM + path + url.search);
      t.searchParams.set('app_id', env.TRANSPORTAPI_APP_ID);
      t.searchParams.set('app_key', env.TRANSPORTAPI_APP_KEY);
      target = t.toString();
      upstreamHeaders = { Accept: 'application/json' };
    } else if (path.startsWith('/eurail/')) {
      // Keyless DB upstream; strip the /eurail prefix and pass the rest through.
      target = DBREST_UPSTREAM + path.slice('/eurail'.length) + url.search;
      upstreamHeaders = { Accept: 'application/json', 'User-Agent': 'edi-departures-board (github pages)' };
      cacheTtl = EURAIL_CACHE_SECONDS;
    } else {
      return json({ error: 'Not found' }, 404, cors);
    }

    let upstream;
    try {
      upstream = await fetch(target, {
        headers: upstreamHeaders,
        cf: { cacheTtl, cacheEverything: true },
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
        'Cache-Control': `public, max-age=${cacheTtl}`,
      },
    });
  },
};

function corsHeaders(origin, allowed) {
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
