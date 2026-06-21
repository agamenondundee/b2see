# b2see

A modern, browser-based take on the 1984 arcade classic **Paperboy**, built
with plain HTML5 Canvas and ES modules — no build step, no dependencies.

Ride your route down a scrolling suburban street, deliver papers to your
subscribers' mailboxes, rack up smashed windows on the houses that *didn't*
subscribe, and dodge the traffic.

## Play

The game uses ES modules, so it needs to be served over HTTP (opening the file
directly will be blocked by the browser):

```bash
# from the repo root
python3 -m http.server 8000
# then open http://localhost:8000/
```

## Controls

| Key            | Action               |
| -------------- | -------------------- |
| `←` / `→`      | Steer                |
| `↑` / `↓`      | Pedal faster / brake |
| `Z`            | Throw paper left     |
| `X` / `Space`  | Throw paper right    |
| `Enter`        | Start / restart      |

## Gameplay

- **Deliver** to the glowing mailboxes of **subscriber** houses for points.
- Consecutive deliveries build a **streak** that increases the bonus.
- Hitting a **non-subscriber** house scores classic mischief points.
- Missing a subscriber (it scrolls off-screen) breaks your streak.
- Run over **paper bundles** on the road to refill your supply.
- Crashing into a **car** or **cone** costs a life and some papers. Three
  crashes ends the route.

## Project layout

```
index.html               # shell + start screen
src/
  main.js                # boot + game loop
  game.js                # state machine, scoring, collisions
  world.js               # scrolling street, spawning
  entities.js            # player, paper, house, obstacle, bundle
  assets.js              # sprite loader with placeholder fallback
  sprites.manifest.js    # maps sprite keys -> art (edit to add real sprites)
  input.js               # keyboard input
  hud.js                 # score / lives / popups
  constants.js           # all tuning values
assets/                  # drop real sprite sheets here (see assets/README.md)
```

## Art

The game is fully playable with **placeholder graphics**. To add real artwork,
drop sprite sheets into [`assets/`](assets/) and point the manifest at them —
see [`assets/README.md`](assets/README.md).
