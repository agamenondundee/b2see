# b2see

A modern, browser-based take on the 1984 arcade classic **Paperboy**, built
with plain HTML5 Canvas and ES modules — no build step, no dependencies.

Ride your route down a **isometric** scrolling street, deliver papers to your
subscribers' mailboxes, rack up smashed windows on the houses that *didn't*
subscribe, dodge traffic, dogs, pedestrians and the Grim Reaper — then clear
the **BMX bonus course** at the end of the street.

## Play

The game uses ES modules, so it needs to be served over HTTP (opening the file
directly will be blocked by the browser):

```bash
# from the repo root
python3 -m http.server 8000
# then open http://localhost:8000/
```

On phones/tablets, on-screen touch controls appear automatically.

## Controls

| Key            | Action               |
| -------------- | -------------------- |
| `←` / `→`      | Steer                |
| `↑` / `↓`      | Pedal faster / brake |
| `Z`            | Throw paper left     |
| `X` / `Space`  | Throw paper right    |
| `Enter`        | Start / continue / restart |
| `M`            | Mute / unmute        |

## Gameplay

- **Deliver** to the glowing mailboxes (flag up) of **subscriber** houses —
  red roofs, lit windows — for points.
- Consecutive deliveries build a **streak** that increases the bonus.
- Hitting a **non-subscriber** house scores classic mischief points.
- Missing a subscriber (it scrolls past undelivered) breaks your streak.
- Run over **paper bundles** on the road to refill your supply.
- Dodge **cars**, **cones**, **dogs**, **pedestrians**, and the homing
  **Grim Reaper**. A crash costs a life and some papers; three ends the route.
- Finish the street for a **route bonus**, then ride the **BMX bonus course** —
  thread the cone gates and reach the finish for big points before the route
  loops to the next, tougher street.

## How it works

The world is modelled in 2D ground coordinates (`u` = lateral, `v` = forward),
and an **isometric projection** (`src/iso.js`) maps them to the screen for the
diagonal Paperboy look. All gameplay and collisions stay in clean `(u, v)`
space. Audio is **synthesized at runtime** with the Web Audio API (no sound
files), and the gameplay graphics are drawn **procedurally** — see "Art" below.

Visual features:

- **Isometric volumes** — houses, cars and props are shaded 3D boxes/roofs with
  directional **cast shadows**.
- **Day/night cycle** (`src/atmosphere.js`) — a ~100s loop through day, dusk,
  night and dawn that recolours the sky, haze and a world-wide tint; street
  lamps glow at night.
- **Parallax sky** (`src/sky.js`) — a horizon with distant mountains (day)
  cross-fading to a lit-window city skyline (night), drifting clouds and stars,
  using CC0 art (see `assets/CREDITS.md`).
- **Distance fog**, a **vignette**, **particle effects** (delivery sparkles,
  window shards, pickup sparkles, crash star-bursts, wheel dust) and **screen
  shake**, plus animated tree sway and a leaning, pedalling rider.

## Project layout

```
index.html               # shell + start screen
src/
  main.js                # boot + game loop
  game.js                # state machine, phases, scoring, collisions
  world.js               # isometric ground + spawning (street & BMX)
  iso.js                 # world -> screen isometric projection
  entities.js            # player, paper, house, obstacle, hazard, bundle, gate
  procsprites.js         # procedural artwork for every sprite
  assets.js              # sprite loader (prefers real PNGs if present)
  sprites.manifest.js    # maps sprite keys -> art (edit to add real sprites)
  audio.js               # Web Audio SFX + music
  input.js               # keyboard input
  touch.js               # on-screen mobile controls
  hud.js                 # score / lives / tally / game-over
  constants.js           # all tuning values
assets/                  # drop real sprite sheets here (see assets/README.md)
```

## Art

The **houses** use real **CC0 (public-domain)** isometric building art from
**Kenney's "Isometric Tiles — Buildings"** pack (`assets/buildings/`). The rest
of the gameplay sprites (vehicles, characters, trees and props) are drawn
**procedurally in code** (`src/procsprites.js`, `src/isoart.js`). The renderer
prefers a loaded PNG over the procedural fallback, so any sprite can be replaced
with real art by dropping a sheet into [`assets/`](assets/) and pointing the
manifest at it. See [`assets/README.md`](assets/README.md) and
[`assets/CREDITS.md`](assets/CREDITS.md).

The **sky/horizon** uses a handful of **CC0 (public-domain)** background images
(mountains, city skyline, clouds, stars) in [`assets/sky/`](assets/sky/),
sourced from [prom-game-kit](https://github.com/promdotdev/prom-game-kit). Full
attribution and licensing is in [`assets/CREDITS.md`](assets/CREDITS.md).
