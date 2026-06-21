// The scrolling neighbourhood: draws the road/lawns and spawns houses,
// obstacles and paper bundles as the player rides forward.

import { VIEW, ROAD, LAWN, COLORS, SPAWN } from "./constants.js";
import { House, Obstacle, Bundle } from "./entities.js";

const SPAWN_Y = -120; // entities appear just above the screen

export class World {
  constructor() {
    this.houses = [];
    this.obstacles = [];
    this.bundles = [];
    this.scroll = 0; // total distance travelled, for background animation
    this.sinceHouseRow = SPAWN.houseRowGap; // spawn one immediately
    this.toNextObstacle = SPAWN.obstacleMinGap;
  }

  update(dt, speed) {
    const dy = speed * dt;
    this.scroll += dy;

    for (const list of [this.houses, this.obstacles, this.bundles]) {
      for (const e of list) e.update(dt, speed);
    }

    this.spawn(dy);
    this.cull();
  }

  spawn(dy) {
    this.sinceHouseRow += dy;
    if (this.sinceHouseRow >= SPAWN.houseRowGap) {
      this.sinceHouseRow -= SPAWN.houseRowGap;
      this.spawnHouseRow();
    }

    this.toNextObstacle -= dy;
    if (this.toNextObstacle <= 0) {
      this.spawnObstacle();
      this.toNextObstacle = rand(SPAWN.obstacleMinGap, SPAWN.obstacleMaxGap);
    }
  }

  spawnHouseRow() {
    for (const side of ["left", "right"]) {
      const subscriber = Math.random() < SPAWN.subscriberChance;
      this.houses.push(new House(side, SPAWN_Y, subscriber));
    }
    if (Math.random() < SPAWN.pickupChance) {
      const x = rand(ROAD.left + 30, ROAD.right - 30);
      this.bundles.push(new Bundle(x, SPAWN_Y));
    }
  }

  spawnObstacle() {
    const kind = Math.random() < 0.55 ? "car" : "cone";
    const margin = kind === "car" ? 30 : 20;
    const x = rand(ROAD.left + margin, ROAD.right - margin);
    this.obstacles.push(new Obstacle(kind, x, SPAWN_Y));
  }

  cull() {
    const off = VIEW.height + 160;
    this.obstacles = this.obstacles.filter((e) => e.y < off);
    this.bundles = this.bundles.filter((e) => e.y < off && !e.dead);
    // Houses are filtered by the game loop after it scores missed subscribers.
    this.houses = this.houses.filter((e) => e.y < off);
  }

  draw(ctx) {
    // Lawns (full background already painted by canvas bg, add alternating bands).
    ctx.fillStyle = COLORS.lawn;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);

    const band = 64;
    const offset = this.scroll % (band * 2);
    ctx.fillStyle = COLORS.lawnAlt;
    for (let y = -band * 2 + offset; y < VIEW.height; y += band * 2) {
      ctx.fillRect(0, y, VIEW.width, band);
    }

    // Sidewalks frame the road.
    ctx.fillStyle = COLORS.sidewalk;
    ctx.fillRect(ROAD.left - 18, 0, 18, VIEW.height);
    ctx.fillRect(ROAD.right, 0, 18, VIEW.height);

    // Road.
    ctx.fillStyle = COLORS.road;
    ctx.fillRect(ROAD.left, 0, ROAD.width, VIEW.height);

    // Dashed centre line, scrolling with the world.
    ctx.fillStyle = COLORS.roadLine;
    const dash = 34;
    const gap = 30;
    const cycle = dash + gap;
    const lineOffset = this.scroll % cycle;
    const cx = (ROAD.left + ROAD.right) / 2 - 3;
    for (let y = -cycle + lineOffset; y < VIEW.height; y += cycle) {
      ctx.fillRect(cx, y, 6, dash);
    }
  }
}

function rand(lo, hi) {
  return lo + Math.random() * (hi - lo);
}
