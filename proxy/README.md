# Departures proxy (Cloudflare Worker)

A tiny Cloudflare Worker that lets the deployed board show **live data without
giving every visitor an API key**. It holds upstream credentials as server-side
**secrets**, injects them into requests, and adds the CORS headers a browser
needs. Three routes:

```
Browser ──GET /flights/…──▶ Worker ──+ X-RapidAPI-Key──────▶ AeroDataBox        (flights)
Browser ──GET /bus/…─────▶ Worker ──+ app_id & app_key────▶ TransportAPI        (buses)
Browser ──GET /eurail/…──▶ Worker ──(keyless)─────────────▶ DB transport.rest   (EU rail)
        ◀──── JSON + CORS ──         ◀──── JSON ────────────
```

It only forwards `GET /flights/…`, `GET /bus/…` and `GET /eurail/…` — it is not an
open relay — and edge-caches responses (30s; 60s for EU rail) to spare the
upstream quotas. (Trains don't use this proxy; their National Rail/Darwin feed
via Huxley is already CORS-enabled.)

**EU rail** needs **no secret** — Deutsche Bahn's transport.rest upstream is
keyless. Proxying it just gives the browser reliable CORS and a shared edge cache,
which matters because DB's public instance is heavily rate-limited. So the proxy
is worth deploying for EU rail alone, even with no flight/bus credentials.

## Deploy

Prerequisites: a (free) Cloudflare account, plus credentials for whichever feeds
you want live:

- **Flights:** an AeroDataBox RapidAPI key (`X-RapidAPI-Key`).
- **Buses:** a TransportAPI `app_id` + `app_key` (free signup at
  [developer.transportapi.com](https://developer.transportapi.com/)).

```bash
npm install -g wrangler          # or: npx wrangler ...
cd proxy
wrangler login                   # opens a browser to authorise
wrangler deploy                  # publishes the Worker, prints its URL

# Set only the secrets for the feeds you want live:
wrangler secret put RAPIDAPI_KEY          # flights
wrangler secret put TRANSPORTAPI_APP_ID   # buses
wrangler secret put TRANSPORTAPI_APP_KEY  # buses
```

`wrangler deploy` prints a URL like
`https://edi-departures-proxy.<your-subdomain>.workers.dev`.

## Point the app at it

In the board: **Settings ⚙**, paste the Worker URL into **Proxy URL**.

- **Flights:** choose **Live** (leave the API key blank — the Worker adds it).
- **Buses:** choose **Live** and set the **Bus stop ATCO code** for the stance you
  want (find it via [TransportAPI](https://developer.transportapi.com/docs)).
- **EU rail:** already live by default — with the Proxy URL set it automatically
  routes through the Worker (CORS-safe + cached). No secret or extra setup needed.

Quick check — should report which feeds have credentials:

```bash
curl https://edi-departures-proxy.<your-subdomain>.workers.dev/health
# {"ok":true,"service":"edi-departures-proxy","flights":true,"buses":true,"eurail":true}
```

## Lock it down (optional but recommended)

By default the Worker allows any origin (`*`). To restrict it to your site, set
`ALLOWED_ORIGIN` in `wrangler.toml` to your Pages origin (e.g.
`https://agamenondundee.github.io`) and `wrangler deploy` again.

## Notes

- Rotate any secret with `wrangler secret put <NAME>` (no redeploy needed).
- Free Worker tier is ~100k requests/day — far beyond what this board needs.
- Credentials never reach the browser; only the Worker can see them.
- TransportAPI's own free tier is rate-limited, so keep auto-refresh modest.
