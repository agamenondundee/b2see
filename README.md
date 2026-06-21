# Edinburgh — Live Departures (Flights & Trains)

A clean, mobile-friendly **departures board** for **Edinburgh Airport**
(`EDI` / `EGPH`) and **Edinburgh's railway stations** (Waverley & co.), built
with plain HTML, CSS and ES modules — no build step, no framework, no
dependencies. It deploys as a static site (e.g. GitHub Pages).

Two tabs: **🛫 Flights** and **🚆 Trains**. Both ship with a realistic,
auto-updating **demo board** so they work the moment you open them. Flights
switch to real data via the [AeroDataBox](https://aerodatabox.com/) API (free
key); trains show **real live data with no key** via National Rail's Darwin feed.

## Features

- **Two boards in one** — switch between airport flights and rail departures.
- **FIDS-style board** — time, destination, flight/operator, gate/platform and a
  colour-coded status (Scheduled, Boarding, Gate Closing, Departed, Delayed,
  Cancelled; On time for trains). Delays show the revised time.
- **Live, no setup** — demo mode generates a plausible day of real routes
  (airlines / train operators), with statuses that progress in real time.
- **Real data** — AeroDataBox for flights; National Rail (Darwin via Huxley) for
  trains, with a station picker (Waverley, Haymarket, Edinburgh Gateway, …).
- **Search & filter** — by destination, flight/operator, etc., plus status chips.
- **Auto-refresh** (30s–5min, or off) and a manual refresh.
- **Edinburgh local time** everywhere, regardless of where you're viewing from.
- **Responsive** — a wide board on desktop, tidy cards on phones.

## Run locally

It uses ES modules, so serve it over HTTP (don't open the file directly):

```bash
# from the repo root
python3 -m http.server 8000
# then open http://localhost:8000/
```

## Data sources

Each tab talks to a small `Provider` interface (`src/providers.js`) so the UI
doesn't care where the data comes from. (Flights sources below; trains are
covered in [Trains](#trains-edinburgh-waverley--co).)

### Demo (default)

Zero configuration. `src/demo-data.js` holds a curated daily timetable of real
airlines and destinations EDI serves (easyJet, Ryanair, Jet2, British Airways,
KLM, Emirates, United, Loganair, …). The schedule is deterministic per day, but
gates/delays/statuses evolve with the clock so it behaves like a live board.

### Live (AeroDataBox)

Real departures via AeroDataBox on RapidAPI. To enable it:

1. Subscribe (free **Basic** tier) to
   [AeroDataBox on RapidAPI](https://rapidapi.com/aedbx-aedbx/api/aerodatabox).
2. Copy your `X-RapidAPI-Key`.
3. In the app, open **Settings ⚙**, choose **Live**, paste the key, **Save**.

The key is stored **only in your browser** (`localStorage`) — it is never
committed or uploaded. If a live request fails (bad key, rate limit, network),
the board falls back to demo data and shows a notice, so it's never blank.

> **Why a key?** This is a purely static site with no backend, so the browser
> calls the flight API directly. AeroDataBox's RapidAPI gateway supports
> browser (CORS) requests.

### No per-user key (Cloudflare Worker proxy)

For a shared deployment where you don't want every visitor to need their own
key, deploy the small **Cloudflare Worker** in [`proxy/`](proxy/). It holds one
key as a server-side secret, injects it into upstream requests and adds CORS.
Then in **Settings ⚙** paste the Worker URL into **Proxy URL** and leave the key
blank — the browser calls your Worker and never sees the key. See
[`proxy/README.md`](proxy/README.md) for the (short) deploy steps.

## Trains (Edinburgh Waverley & co.)

The **🚆 Trains** tab shows live rail departures from National Rail's official
**Darwin** feed, via [Huxley2](https://github.com/jpsingleton/Huxley2) — a
CORS-enabled JSON proxy that works directly from the browser **with no API key**.
By default it uses the public Huxley2 instance and **Edinburgh Waverley** (`EDB`);
pick another station (Haymarket, Edinburgh Gateway, Edinburgh Park) in
**Settings ⚙**.

- **No setup:** the trains tab is live out of the box — no signup, no key.
- **Reliability:** the public Huxley2 instance is best-effort. For a dependable
  deployment, [self-host Huxley2](https://github.com/jpsingleton/Huxley2) (a free
  Darwin token + a small app) and set its URL in **Settings ⚙ → Trains data URL**.
- If trains are unreachable, the board falls back to demo data with a notice.

## Deploy (GitHub Pages)

This repo is a static site. Enable **Settings → Pages → Deploy from branch** and
pick the branch/root. `.nojekyll` is included so the `src/` files are served
as-is. No build step is required.

## Project layout

```
index.html          # app shell: header, toolbar, board, settings modal
src/
  app.js            # tabbed orchestrator: feeds, rendering, refresh, settings
  providers.js      # demo + live providers (AeroDataBox flights, Huxley trains)
  demo-data.js      # curated EDI flight timetable + deterministic generator
  trains-demo.js    # curated Edinburgh Waverley train timetable + generator
  config.js         # airport/stations, defaults, status buckets, storage keys
  time.js           # Europe/London time helpers & formatting
  styles.css        # FIDS board styling (dark theme, tabs, responsive cards)
proxy/              # optional Cloudflare Worker: live data with no per-user key
  worker.js         # CORS + injects the RapidAPI key server-side
  wrangler.toml     # Worker config
  README.md         # deploy steps
```

## Notes & limitations

- Flight data quality, coverage and rate limits depend on your AeroDataBox plan.
- The free RapidAPI tier is rate-limited; the default auto-refresh is 1 minute.
- Train data comes from National Rail's Darwin feed via a public Huxley2 proxy
  (best-effort uptime); self-host Huxley2 for reliability.
- All times are displayed in **Edinburgh (Europe/London)** local time.
