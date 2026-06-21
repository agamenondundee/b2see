# AeroDataBox proxy (Cloudflare Worker)

A tiny Cloudflare Worker that lets the deployed departures board show **live
data without giving every visitor an API key**. It holds one AeroDataBox
RapidAPI key as a server-side **secret**, injects it into upstream requests, and
adds the CORS headers a browser needs.

```
Browser ──GET /flights/...──▶ Worker ──+ X-RapidAPI-Key──▶ AeroDataBox
        ◀──── JSON + CORS ────         ◀──── JSON ────────
```

The Worker only forwards `GET /flights/...` requests (the airport FIDS
endpoints) to `aerodatabox.p.rapidapi.com` — it is not an open relay — and
caches responses at the edge for 30s to spare the free-tier quota.

## Deploy

Prerequisites: a (free) Cloudflare account and an AeroDataBox RapidAPI key.

```bash
npm install -g wrangler          # or: npx wrangler ...
cd proxy
wrangler login                   # opens a browser to authorise
wrangler deploy                  # publishes the Worker, prints its URL
wrangler secret put RAPIDAPI_KEY # paste your X-RapidAPI-Key when prompted
```

`wrangler deploy` prints a URL like
`https://edi-departures-proxy.<your-subdomain>.workers.dev`.

## Point the app at it

In the board: **Settings ⚙ → Live**, paste the Worker URL into **Proxy URL**,
leave the API key blank, **Save**. The browser then calls your Worker (no key
client-side) and the Worker adds the key.

Quick check — this should return `{"ok":true,...,"hasKey":true}`:

```bash
curl https://edi-departures-proxy.<your-subdomain>.workers.dev/health
```

## Lock it down (optional but recommended)

By default the Worker allows any origin (`*`). To restrict it to your site,
set `ALLOWED_ORIGIN` in `wrangler.toml` to your Pages origin (e.g.
`https://agamenondundee.github.io`) and `wrangler deploy` again.

## Notes

- Rotate the key any time with `wrangler secret put RAPIDAPI_KEY` (no redeploy).
- Free Worker tier is ~100k requests/day — far beyond what this board needs.
- The key never reaches the browser; only the Worker can see it.
