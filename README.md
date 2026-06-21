# Edinburgh — Live Departures (Flights, Trains & Buses)

A clean, mobile-friendly **departures board** for **Edinburgh Airport**
(`EDI` / `EGPH`), **Edinburgh's railway stations** (Waverley & co.) and
**Edinburgh Bus Station** (St Andrew Square), built with plain HTML, CSS and ES
modules — no build step, no framework, no dependencies. It deploys as a static
site (e.g. GitHub Pages).

Three tabs: **🛫 Flights**, **🚆 Trains** and **🚌 Buses**. All ship with a
realistic, auto-updating **demo board** so they work the moment you open them.
Flights use [AeroDataBox](https://aerodatabox.com/) (free key); trains show
**real live data with no key** via National Rail's Darwin feed; buses use
[TransportAPI](https://www.transportapi.com/) through the Worker proxy.

## Features

- **Three boards in one** — switch between airport flights, rail and coach/bus.
- **FIDS-style board** — time, destination, flight/operator, gate/platform/stance
  and a colour-coded status (Scheduled, Boarding, Gate Closing, Departed,
  Delayed, Cancelled; On time for trains/buses). Delays show the revised time.
- **Brand emblems** — real airline/operator logos (airlines via the avs.io CDN,
  rail/bus via Clearbit) with an instant colour-coded monogram fallback, so it
  always looks right even offline.
- **Go-to-gate cue** — a flight's gate number lights up while it's boarding.
- **Live, no setup** — demo mode generates a plausible day of real routes
  (airlines / train & coach operators), with statuses that progress in real time.
- **Real data** — AeroDataBox for flights; National Rail (Darwin via Huxley) for
  trains; TransportAPI for buses. Station picker for trains.
- **Search & filter** — by destination, flight/operator/service, plus status chips.
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
pick **any of the ~360 Scottish railway stations** (Glasgow, Aberdeen, Inverness,
Thurso, Mallaig, …) from the station picker in **Settings ⚙**. The full list lives
in [`src/stations.js`](src/stations.js).

- **No setup:** the trains tab is live out of the box — no signup, no key.
- **Reliability:** the public Huxley2 instance is best-effort. For a dependable
  deployment, [self-host Huxley2](https://github.com/jpsingleton/Huxley2) (a free
  Darwin token + a small app) and set its URL in **Settings ⚙ → Trains data URL**.
- If trains are unreachable, the board falls back to demo data with a notice.

## Buses (Edinburgh Bus Station)

The **🚌 Buses** tab covers **Edinburgh Bus Station** (St Andrew Square) — the
city's inter-city coach hub (Scottish Citylink, Megabus, FlixBus, National
Express, Ember, Borders Buses, Stagecoach…).

Unlike trains, there's no free keyless live feed here, so live buses use
**[TransportAPI](https://www.transportapi.com/) through the Worker proxy** (the
TransportAPI `app_id`/`app_key` stay server-side). To enable it:

1. Deploy the [`proxy/`](proxy/) Worker with `TRANSPORTAPI_APP_ID` and
   `TRANSPORTAPI_APP_KEY` secrets (see [`proxy/README.md`](proxy/README.md)).
2. In **Settings ⚙**, set the **Proxy URL**, choose **Buses → Live**, and enter
   the **Bus stop ATCO code** for the stance you want.

Until that's set up, the Buses tab shows realistic **demo** data (its default),
and it falls back to demo if the proxy/TransportAPI is unreachable.

## Deploy (GitHub Pages)

This repo is a static site. Enable **Settings → Pages → Deploy from branch** and
pick the branch/root. `.nojekyll` is included so the `src/` files are served
as-is. No build step is required.

## Project layout

```
index.html          # app shell: header, toolbar, board, settings modal
src/
  app.js            # tabbed orchestrator: feeds, rendering, refresh, settings
  providers.js      # demo + live providers (AeroDataBox, Huxley, TransportAPI)
  demo-data.js      # curated EDI flight timetable + deterministic generator
  trains-demo.js    # curated Edinburgh Waverley train timetable + generator
  buses-demo.js     # curated Edinburgh Bus Station coach timetable + generator
  stations.js       # all ~360 Scottish railway stations (name + CRS code)
  config.js         # airport/stations/bus station, defaults, status, storage keys
  time.js           # Europe/London time helpers & formatting
  styles.css        # FIDS board styling (dark theme, tabs, responsive cards)
proxy/              # optional Cloudflare Worker: live data with no per-user key
  worker.js         # CORS + injects creds for AeroDataBox (flights) & TransportAPI (buses)
  wrangler.toml     # Worker config
  README.md         # deploy steps
scripts/
  bump-cache-version.py  # version-tags module imports for cache-busting on deploy
```

## Updating / cache-busting

GitHub Pages caches the `src/*.js` modules in the browser (~10 min), so after a
deploy an old script can linger. To force fresh loads, the module imports are
tagged with a `?v=N` query. After changing anything under `src/`, bump it:

```bash
python3 scripts/bump-cache-version.py 2   # use the next number, then commit
```

## Notes & limitations

- Flight data quality, coverage and rate limits depend on your AeroDataBox plan.
- The free RapidAPI tier is rate-limited; the default auto-refresh is 1 minute.
- Train data comes from National Rail's Darwin feed via a public Huxley2 proxy
  (best-effort uptime); self-host Huxley2 for reliability.
- All times are displayed in **Edinburgh (Europe/London)** local time.
