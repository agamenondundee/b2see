# Edinburgh — Live Departures (Flights, Trains, Buses & EU Rail)

A clean, mobile-friendly **departures board** for **Edinburgh Airport**
(`EDI` / `EGPH`), **Edinburgh's railway stations** (Waverley & co.) and
**Edinburgh Bus Station** (St Andrew Square) — plus pickers spanning major UK &
European airports, all GB rail stations, major UK bus stations and major European
train stations. Built with plain HTML, CSS and ES modules — no build step, no
framework, no dependencies. It deploys as a static site (e.g. GitHub Pages).

Four tabs: **🛫 Flights**, **🚆 Trains**, **🚌 Buses** and **🚊 EU Rail**. All
ship with a realistic, auto-updating **demo board** so they work the moment you
open them. Flights use [AeroDataBox](https://aerodatabox.com/) (free key); trains
show **real live data with no key** via National Rail's Darwin feed; buses use
[TransportAPI](https://www.transportapi.com/) through the Worker proxy; EU rail
uses **keyless** [Transitous](https://transitous.org/) (MOTIS).

## Features

- **Four boards in one** — switch between airport flights, GB rail, UK coach/bus
  and European rail.
- **FIDS-style board** — time, destination, flight/operator, gate/platform/stance
  and a colour-coded status (Scheduled, Boarding, Gate Closing, Departed,
  Delayed, Cancelled; On time for trains/buses). Delays show the revised time.
- **Brand emblems** — real airline/operator logos (airlines via the avs.io CDN,
  rail/bus via Clearbit) with an instant colour-coded monogram fallback, so it
  always looks right even offline.
- **Go-to-gate cue** — a flight's gate number lights up while it's boarding.
  (AeroDataBox rarely publishes gates, so unpublished ones are filled with an
  *indicative* number, shown muted.)
- **Aircraft type** — each flight shows its equipment (e.g. Airbus A320neo,
  Boeing 787-9): the real type from AeroDataBox where published, and a realistic
  per-airline type in demo (widebodies long-haul, turboprops to the isles).
- **Major UK & European airports** — pick from ~680 airports (Edinburgh,
  Heathrow, CDG, Schiphol, Frankfurt, …); the header follows your choice.
- **All GB rail stations & major UK bus stations** — ~2,600 National Rail
  stations and ~30 bus/coach stations (Buchanan, Victoria Coach Station,
  Digbeth, …) in the pickers.
- **Major European train stations** — ~200 hubs across 24 countries (Paris,
  Berlin, Amsterdam, Milano, Madrid, Wien, Praha, …) with **keyless** live data
  via Transitous (the community MOTIS service).
- **Departures or Arrivals** — a toggle on every board. Real arrivals for flights
  (AeroDataBox) and trains (Darwin); buses fall back to demo arrivals.
- **Live, no setup** — demo mode generates a plausible day of real routes
  (airlines / train & coach operators), with statuses that progress in real time.
- **Real data** — AeroDataBox for flights; National Rail (Darwin via Huxley) for
  trains; TransportAPI for buses. Airport & station pickers.
- **Search & filter** — by destination, flight/operator/service, aircraft, plus status chips.
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
pick **any of the ~2,600 National Rail (GB) stations** (King's Cross, Paddington,
Manchester, Cardiff, Glasgow, Inverness, …) from the station picker in
**Settings ⚙**. The full list lives in [`src/stations.js`](src/stations.js).

- **No setup:** the trains tab is live out of the box — no signup, no key.
- **Reliability:** the public Huxley2 instance is best-effort. For a dependable
  deployment, [self-host Huxley2](https://github.com/jpsingleton/Huxley2) (a free
  Darwin token + a small app) and set its URL in **Settings ⚙ → Trains data URL**.
- If trains are unreachable, the board falls back to demo data with a notice.

## Buses (major UK bus & coach stations)

The **🚌 Buses** tab covers **~30 major UK bus & coach stations** — Edinburgh,
Glasgow Buchanan, London Victoria Coach Station, Birmingham Digbeth, Manchester,
Leeds, Newcastle, Aberdeen, Dundee, Inverness and more — picked from the station
list in **Settings ⚙**. The default is **Edinburgh Bus Station** (St Andrew
Square), the city's inter-city coach hub (Scottish Citylink, Megabus, FlixBus,
National Express, Ember, Borders Buses, Stagecoach…). The full list lives in
[`src/busstations.js`](src/busstations.js).

Unlike trains, there's no free keyless live feed here, so live buses use
**[TransportAPI](https://www.transportapi.com/) through the Worker proxy** (the
TransportAPI `app_id`/`app_key` stay server-side). To enable it:

1. Deploy the [`proxy/`](proxy/) Worker with `TRANSPORTAPI_APP_ID` and
   `TRANSPORTAPI_APP_KEY` secrets (see [`proxy/README.md`](proxy/README.md)).
2. In **Settings ⚙**, set the **Proxy URL**, choose **Buses → Live** and pick a
   station. Many big stations have a built-in ATCO code; for the rest (or to
   target an exact stance) paste an **ATCO code override**.

> **ATCO codes are per-stance.** TransportAPI is per-stop, but a bus station has
> many numbered stances, so the built-in code is a best-effort representative
> one. For a specific stance, find its ATCO on
> [bustimes.org](https://bustimes.org) and set it as the override.

Until live is set up, the Buses tab shows realistic **demo** data (its default,
Edinburgh-only), and it falls back to demo if the proxy/TransportAPI is
unreachable.

## EU Rail (major European train stations)

The **🚊 EU Rail** tab shows live departures/arrivals for **~200 major European
train stations across 24 countries** — Paris, Berlin, Amsterdam, Bruxelles,
Milano, Roma, Madrid, Barcelona, Zürich, Wien, Praha, München, Köln, Lisboa,
Warszawa, Stockholm and more — picked in **Settings ⚙**. The default is **Paris
Gare du Nord**. The full list lives in [`src/eustations.js`](src/eustations.js).
GB stations aren't repeated here — they're in the **🚆 Trains** tab.

Live data comes from **[Transitous](https://transitous.org/)**, a community-run
service built on **[MOTIS](https://github.com/motis-project/motis)** that
aggregates public-transport schedules (GTFS / GTFS-RT) from across Europe. It's
**keyless and CORS-enabled**, so — like trains — EU Rail is **live out of the box
with no key and no self-hosting**. Each station is resolved to a MOTIS stop via the
geocoder (biased by the station's coordinates), then the board reads its next
departures/arrivals; only rail services are shown.

- **No setup, no rate-limit hassle:** the EU Rail tab is live by default — no
  signup, no key, no Deutsche Bahn rate limits.
- **Coverage:** depends on the GTFS feeds Transitous has imported (broad and
  growing across Europe); some regions may be more complete than others.
- **Reliability:** if Transitous is briefly unreachable, the board shows a
  **sample** and keeps retrying. Optionally route it through the [`proxy/`](proxy/)
  Worker (set **Proxy URL** in **Settings ⚙**) to add a shared **edge cache**
  (gentler on the community service); the EU-rail route is keyless, so no secret is
  needed — redeploy the Worker if you added it before this route existed.
- **Your own instance (optional):** run your own
  [MOTIS](https://github.com/motis-project/motis) and set its base URL in
  **Settings ⚙ → EU rail data URL** (this overrides the proxy).

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
  eurail-demo.js    # sample European intercity board + generator
  airports.js       # ~680 major UK & European airports (name + IATA + ICAO)
  stations.js       # all ~2,600 GB National Rail stations (name + CRS code)
  busstations.js    # ~30 major UK bus & coach stations (name + ATCO code)
  eustations.js     # ~200 major European train stations (name + country + lat/lon)
  config.js         # airport/stations/bus & EU station, defaults, status, storage keys
  time.js           # Europe/London time helpers & formatting
  styles.css        # FIDS board styling (dark theme, tabs, responsive cards)
proxy/              # optional Cloudflare Worker: live data with no per-user key
  worker.js         # CORS + injects creds for AeroDataBox (flights) & TransportAPI (buses)
                    # (trains via Huxley & EU rail via Transitous are keyless — no proxy)
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
- EU rail data comes from the public Transitous (MOTIS) service (keyless,
  community-run); coverage depends on the GTFS feeds it has imported. Route it
  through the Worker proxy for a shared cache, or run your own MOTIS.
- Demo data is **Edinburgh-only** for flights/trains/buses: for other airports or
  stations, switch to **Live** — the demo board stays empty rather than show the
  wrong place's services. (EU Rail's demo is an illustrative pan-European sample.)
- All times are displayed in **Edinburgh (Europe/London)** local time — including
  EU rail, so a Berlin 08:00 (CET) departure shows as 07:00 in summer (BST).
