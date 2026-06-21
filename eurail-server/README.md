# Your own EU Rail data URL (self-hosted db-rest)

The **🚊 EU Rail** tab gets live data from **Deutsche Bahn** via
[`db-rest`](https://github.com/derhuerst/db-rest). The *public* instance
([`v6.db.transport.rest`](https://v6.db.transport.rest/)) is the default, but DB
retired the old free API, so it now runs on a **heavily rate-limited** backend and
is often flaky from the browser.

There is **no alternative public instance** — the fix is to run **your own**. It's
a [keyless](https://github.com/derhuerst/db-rest) Docker image, **CORS-enabled**
out of the box, so the board can call it directly. Deploy it once, then paste its
URL into **Settings ⚙ → EU rail data URL**.

The image: **`docker.io/derhuerst/db-rest:6`** (listens on `PORT`, default `3000`;
no API key; Redis optional).

---

## Option A — Render (free, ~2 minutes)

The quickest way to a public HTTPS URL.

1. Sign in at [render.com](https://render.com) → **New** → **Web Service**.
2. Choose **“Deploy an existing image”** and enter the image URL:
   `docker.io/derhuerst/db-rest:6`
3. Instance type **Free**, region **Frankfurt** (closest to DB).
4. Add an environment variable `PORT` = `3000`. Create the service.
5. When it's live you'll have a URL like
   **`https://eurail-db-rest.onrender.com`** — copy it.

*(Prefer Infrastructure-as-Code? Copy [`render.yaml`](render.yaml) to the repo root
and use **New → Blueprint** instead.)*

> Render's free tier sleeps after ~15 min idle, so the **first** EU-rail load after
> a pause is slow (~30–60 s) while it wakes — it then works normally. The board
> shows the sample board and auto-retries until it's up.

## Option B — Fly.io (free-ish, stays warmer)

```bash
fly launch --image docker.io/derhuerst/db-rest:6 --name eurail-db-rest \
  --region fra --copy-config --now
```

Gives **`https://eurail-db-rest.fly.dev`**. Config: [`fly.toml`](fly.toml).

## Option C — Docker (your own VPS / home server)

```bash
docker run -d --restart unless-stopped -p 3000:3000 docker.io/derhuerst/db-rest:6
```

Put it behind HTTPS (Caddy/Traefik/Nginx) at e.g. `https://db.example.com`. It
**must** be HTTPS — the board is served over HTTPS, so a plain-`http://` URL is
blocked as mixed content.

---

## Point the board at it

**Settings ⚙ → EU rail data URL** → paste your instance's base URL, e.g.
`https://eurail-db-rest.onrender.com` → **Save**. (No trailing path — the board
appends `/stops/{id}/departures` itself.) This **overrides** the Proxy URL for EU
rail.

Quick check (should return JSON with a `departures` array — `8011160` is Berlin Hbf):

```bash
curl "https://eurail-db-rest.onrender.com/stops/8011160/departures?duration=30"
```

## Notes

- **Keyless:** db-rest uses DB's public endpoints — no token needed.
- **Caching (optional):** set `REDIS_URL` to enable db-rest's server-side cache;
  gentler on DB and faster. Not required.
- **Rate limits / fair use:** DB's new backend is rate-limited even per-IP. Keep the
  board's auto-refresh modest (1 min is fine), and consider the cache above.
- **Lighter alternative:** if you'd rather not host db-rest, the repo's
  [Cloudflare Worker](../proxy/) proxies and **edge-caches** the public instance —
  set **Proxy URL** in Settings and EU rail routes through it automatically. It
  doesn't give you a separate rate budget (it still hits the public instance), but
  the shared cache reduces how often you hit the limit.
