// The world: draws the isometric ground (lawns, road, sidewalks, lane lines)
// and spawns content ahead of the player. Supports two modes — the suburban
// "street" route and the "bmx" bonus course.

import { STREET, COLORS, SPAWN, VIEW } from "./constants.js";
import { project, groundQuad, depthScale } from "./iso.js";
import { drawSprite } from "./procsprites.js";
import { House, Obstacle, Hazard, Bundle, Gate } from "./entities.js";

const SPAWN_AHEAD = 980; // world v ahead of the player where things appear
const CULL_BEHIND = 260;
const CAR_COLORS = ["#2e8be0", "#e05a2e", "#7a3ad9", "#2ea36b", "#d9b03a"];

export class World {
  constructor(mode = "street") {
    this.mode = mode;
    this.houses = [];
    this.obstacles = [];
    this.hazards = [];
    this.bundles = [];
    this.gates = [];
    this.ramps = [];
    this.nextHouseV = 260;
    this.nextObstacleV = 420;
    this.nextGateV = 360;
  }

  update(dt, player) {
    const horizon = player.v + SPAWN_AHEAD;
    const cameraV = player.v - 0;

    for (const o of this.obstacles) o.update(dt);
    for (const h of this.hazards) h.update(dt, player);

    if (this.mode === "street") this.spawnStreet(horizon);
    else this.spawnBmx(horizon);

    this.cull(player.v - CULL_BEHIND);
  }

  spawnStreet(horizon) {
    while (this.nextHouseV < horizon) {
      const v = this.nextHouseV;
      for (const side of ["left", "right"]) {
        this.houses.push(new House(side, v, Math.random() < SPAWN.subscriberChance));
      }
      if (Math.random() < SPAWN.pickupChance) {
        this.bundles.push(new Bundle(rand(STREET.roadLeft + 20, STREET.roadRight - 20), v + 80));
      }
      this.nextHouseV += SPAWN.houseRowGap;
    }
    while (this.nextObstacleV < horizon) {
      this.spawnObstacleOrHazard(this.nextObstacleV);
      this.nextObstacleV += rand(SPAWN.obstacleMinGap, SPAWN.obstacleMaxGap);
    }
  }

  spawnObstacleOrHazard(v) {
    const u = rand(STREET.roadLeft + 24, STREET.roadRight - 24);
    if (Math.random() < SPAWN.hazardChance) {
      const roll = Math.random();
      if (roll < 0.45) {
        // Dog runs in from a lawn.
        const fromLeft = Math.random() < 0.5;
        this.hazards.push(
          new Hazard("dog", fromLeft ? STREET.roadLeft - 30 : STREET.roadRight + 30, v, { vv: -30 }),
        );
      } else if (roll < 0.8) {
        // Pedestrian crosses the road.
        const fromLeft = Math.random() < 0.5;
        this.hazards.push(
          new Hazard("pedestrian", fromLeft ? STREET.roadLeft - 10 : STREET.roadRight + 10, v, {
            vu: fromLeft ? 55 : -55,
          }),
        );
      } else {
        // The Grim Reaper.
        this.hazards.push(new Hazard("reaper", u, v + 200));
      }
    } else {
      const kind = Math.random() < 0.55 ? "car" : "cone";
      const opts =
        kind === "car"
          ? { color: pick(CAR_COLORS), vv: Math.random() < 0.4 ? -40 : 0 }
          : {};
      this.obstacles.push(new Obstacle(kind, u, v, opts));
    }
  }

  spawnBmx(horizon) {
    while (this.nextGateV < horizon) {
      const v = this.nextGateV;
      const u = rand(STREET.roadLeft + 30, STREET.roadRight - 30);
      this.gates.push(new Gate(u, v));
      // A stray cone to dodge between gates.
      if (Math.random() < 0.6) {
        const cu = rand(STREET.roadLeft + 16, STREET.roadRight - 16);
        this.obstacles.push(new Obstacle("cone", cu, v + 110));
      }
      if (Math.random() < 0.5) {
        this.ramps.push({ u: rand(STREET.roadLeft + 30, STREET.roadRight - 30), v: v + 60 });
      }
      this.nextGateV += 240;
    }
  }

  cull(minV) {
    const f = (e) => e.v > minV && !e.dead;
    this.obstacles = this.obstacles.filter(f);
    this.hazards = this.hazards.filter((e) => e.v > minV && e.u > -60 && e.u < STREET.width + 60);
    this.bundles = this.bundles.filter(f);
    this.houses = this.houses.filter((e) => e.v > minV);
    this.gates = this.gates.filter((e) => e.v > minV);
    this.ramps = this.ramps.filter((e) => e.v > minV);
  }

  // ---- Rendering --------------------------------------------------------
  drawGround(ctx, cameraV) {
    const vNear = cameraV - 300;
    const vFar = cameraV + 1200;

    // Base lawn fills the screen.
    ctx.fillStyle = this.mode === "bmx" ? "#caa86a" : COLORS.lawn;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);

    // Alternating lawn/turf bands for a sense of motion.
    const band = 120;
    const start = Math.floor(vNear / band) * band;
    ctx.fillStyle = this.mode === "bmx" ? "#bd9a55" : COLORS.lawnAlt;
    for (let v = start; v < vFar; v += band * 2) {
      groundQuad(
        ctx,
        [
          [0, v],
          [STREET.width, v],
          [STREET.width, v + band],
          [0, v + band],
        ],
        cameraV,
      );
      ctx.fill();
    }

    // Sidewalks.
    ctx.fillStyle = COLORS.sidewalk;
    this.strip(ctx, STREET.roadLeft - 26, STREET.roadLeft, vNear, vFar, cameraV);
    this.strip(ctx, STREET.roadRight, STREET.roadRight + 26, vNear, vFar, cameraV);

    // Road.
    ctx.fillStyle = this.mode === "bmx" ? "#9c7b40" : COLORS.road;
    this.strip(ctx, STREET.roadLeft, STREET.roadRight, vNear, vFar, cameraV);

    // Dashed centre line (street only).
    if (this.mode === "street") {
      ctx.fillStyle = COLORS.roadLine;
      const dash = 60;
      const gap = 60;
      const cyc = dash + gap;
      const s0 = Math.floor(vNear / cyc) * cyc;
      for (let v = s0; v < vFar; v += cyc) {
        this.strip(ctx, STREET.roadMid - 4, STREET.roadMid + 4, v, v + dash, cameraV);
      }
    }
  }

  strip(ctx, uA, uB, vA, vB, cameraV) {
    groundQuad(
      ctx,
      [
        [uA, vA],
        [uB, vA],
        [uB, vB],
        [uA, vB],
      ],
      cameraV,
    );
    ctx.fill();
  }

  // All non-player drawables, sorted far-to-near for correct overlap.
  drawEntities(ctx, cameraV) {
    // Ramps are flat decals — draw them on the ground first.
    for (const r of this.ramps) {
      const p = project(r.u, r.v, cameraV);
      drawSprite(ctx, "ramp", p.x, p.y, depthScale(p.relV));
    }
    const list = [
      ...this.houses,
      ...this.gates,
      ...this.bundles,
      ...this.obstacles,
      ...this.hazards,
    ];
    list.sort((a, b) => b.v - a.v);
    for (const e of list) e.draw(ctx, cameraV);
  }
}

function rand(lo, hi) {
  return lo + Math.random() * (hi - lo);
}
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
