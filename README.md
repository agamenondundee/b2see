# Edinburgh Airport — Live Departures

A clean, mobile-friendly **departures board** for **Edinburgh Airport**
(`EDI` / `EGPH`), built with plain HTML, CSS and ES modules — no build step, no
framework, no dependencies. It deploys as a static site (e.g. GitHub Pages).

It ships with a realistic, auto-updating **demo board** so it works the moment
you open it, and can switch to **real live flights** via the
[AeroDataBox](https://aerodatabox.com/) API once you add a free API key.

## Features

- **FIDS-style board** — time, destination, flight, gate and a colour-coded
  status (Scheduled, Check-in, Boarding, Go to Gate, Gate Closing, Final Call,
  Departed, Delayed, Cancelled). Delays show the revised time.
- **Live, no setup** — demo mode generates a plausible day of real EDI routes
  and airlines, with statuses that progress in real time.
- **Real data when you want it** — AeroDataBox provider for actual departures.
- **Search & filter** — by destination, flight number or airline, plus status
  chips (Boarding / Delayed / Departed / Cancelled).
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

The app talks to a small `Provider` interface (`src/providers.js`) so the UI
doesn't care where flights come from.

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
> browser (CORS) requests. For a shared deployment where you don't want a
> per-user key, put a tiny serverless proxy (e.g. a Cloudflare Worker) in front
> of the API that injects the key server-side, and point the live provider's
> base URL at it.

## Deploy (GitHub Pages)

This repo is a static site. Enable **Settings → Pages → Deploy from branch** and
pick the branch/root. `.nojekyll` is included so the `src/` files are served
as-is. No build step is required.

## Project layout

```
index.html          # app shell: header, toolbar, board, settings modal
src/
  app.js            # orchestrator: state, rendering, refresh, settings, filters
  providers.js      # demo + AeroDataBox (live) data providers, normalized output
  demo-data.js      # curated EDI timetable + deterministic generator
  config.js         # airport, defaults, status buckets, storage keys
  time.js           # Europe/London time helpers & formatting
  styles.css        # FIDS board styling (dark theme, responsive cards)
```

## Notes & limitations

- Live data quality, coverage and rate limits depend on your AeroDataBox plan.
- The free RapidAPI tier is rate-limited; the default auto-refresh is 1 minute.
- All times are displayed in **Edinburgh (Europe/London)** local time.
