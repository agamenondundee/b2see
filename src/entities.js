// Entities in world space (u = lateral, v = forward). Projection to the screen
// happens at draw time via iso.js, so all gameplay/collision logic stays in
// simple axis-aligned (u, v) space.

import { project, depthScale } from "./iso.js";
import { drawSprite } from "./procsprites.js";
import { STREET, PLAYER, PAPER } from "./constants.js";

export class Player {
  constructor() {
    this.u = STREET.roadMid;
    this.v = 0;
    this.halfU = 16;
    this.halfV = 16;
    this.speed = PLAYER.baseSpeed;
    this.papers = PLAYER.startPapers;
    this.lives = PLAYER.startLives;
    this.invuln = 0;
    this.facing = "right";
    this.anim = 0;
  }

  get box() {
    return { u: this.u, v: this.v, hu: this.halfU, hv: this.halfV };
  }

  update(dt, input, bounds = STREET) {
    if (input.held("up")) this.target = PLAYER.maxSpeed;
    else if (input.held("down")) this.target = PLAYER.minSpeed;
    else this.target = PLAYER.baseSpeed;
    const ds = PLAYER.accel * dt;
    this.speed += clamp(this.target - this.speed, -ds, ds);
    this.v += this.speed * dt;

    let dir = 0;
    if (input.held("left")) dir -= 1;
    if (input.held("right")) dir += 1;
    if (dir < 0) this.facing = "left";
    if (dir > 0) this.facing = "right";
    this.u += dir * PLAYER.steerSpeed * dt;
    this.u = clamp(this.u, bounds.roadLeft + 12, bounds.roadRight - 12);

    this.anim += dt * (this.speed / 40);
    if (this.invuln > 0) this.invuln -= dt;
  }

  crash() {
    if (this.invuln > 0) return false;
    this.lives -= 1;
    this.papers = Math.max(0, this.papers - 3);
    this.invuln = 1.6;
    return true;
  }

  draw(ctx, cameraV) {
    if (this.invuln > 0 && Math.floor(this.invuln * 12) % 2 === 0) return;
    const p = project(this.u, this.v, cameraV);
    const frame = Math.floor(this.anim) % 2;
    drawSprite(ctx, "player", p.x, p.y, depthScale(p.relV), { facing: this.facing }, frame);
  }
}

export class Paper {
  constructor(u, v, side) {
    this.u = u;
    this.v = v;
    this.side = side;
    this.vu = (side === "left" ? -1 : 1) * PAPER.lateralSpeed;
    this.life = PAPER.flightTime;
    this.maxLife = PAPER.flightTime;
    this.dead = false;
  }

  get box() {
    return { u: this.u, v: this.v, hu: 10, hv: 8 };
  }

  update(dt) {
    this.u += this.vu * dt;
    this.life -= dt;
    if (this.life <= 0 || this.u < -20 || this.u > STREET.width + 20) this.dead = true;
  }

  draw(ctx, cameraV) {
    const p = project(this.u, this.v, cameraV);
    const hop = Math.sin((1 - this.life / this.maxLife) * Math.PI) * 16;
    drawSprite(ctx, "paper", p.x, p.y - hop, depthScale(p.relV));
  }
}

export class House {
  constructor(side, v, subscriber) {
    this.side = side;
    this.v = v;
    this.subscriber = subscriber;
    this.u = side === "left" ? STREET.leftHouseU : STREET.rightHouseU;
    this.targetU = side === "left" ? STREET.leftTargetU : STREET.rightTargetU;
    this.delivered = false;
    this.resolved = false;
  }

  get target() {
    return { u: this.targetU, v: this.v, hu: 26, hv: 30 };
  }

  draw(ctx, cameraV) {
    const hp = project(this.u, this.v, cameraV);
    drawSprite(ctx, this.subscriber ? "house-sub" : "house-plain", hp.x, hp.y, depthScale(hp.relV), {
      delivered: this.delivered,
    });
    const mp = project(this.targetU, this.v, cameraV);
    drawSprite(ctx, "mailbox", mp.x, mp.y, depthScale(mp.relV), {
      subscriber: this.subscriber,
      flagUp: this.subscriber && !this.delivered,
    });
  }
}

export class Obstacle {
  constructor(kind, u, v, opts = {}) {
    this.kind = kind; // car | cone
    this.u = u;
    this.v = v;
    this.vv = opts.vv ?? 0; // forward velocity (cars can roll toward you)
    this.color = opts.color;
    if (kind === "car") {
      this.hu = 19;
      this.hv = 30;
    } else {
      this.hu = 11;
      this.hv = 11;
    }
  }

  get box() {
    return { u: this.u, v: this.v, hu: this.hu, hv: this.hv };
  }

  update(dt) {
    this.v += this.vv * dt;
  }

  draw(ctx, cameraV) {
    const p = project(this.u, this.v, cameraV);
    drawSprite(ctx, this.kind, p.x, p.y, depthScale(p.relV), { color: this.color });
  }
}

// Moving hazards: dog (chases), pedestrian (crosses), reaper (homes in).
export class Hazard {
  constructor(kind, u, v, opts = {}) {
    this.kind = kind;
    this.u = u;
    this.v = v;
    this.vu = opts.vu ?? 0;
    this.vv = opts.vv ?? 0;
    this.anim = 0;
    this.facing = "right";
    this.hu = kind === "dog" ? 16 : 13;
    this.hv = kind === "dog" ? 12 : 13;
    this.spriteKey = kind; // dog | pedestrian | reaper
  }

  get box() {
    return { u: this.u, v: this.v, hu: this.hu, hv: this.hv };
  }

  update(dt, player) {
    this.anim += dt * 6;
    if (this.kind === "dog") {
      // Trot across toward the road, then chase the player's lane briefly.
      const dir = Math.sign(player.u - this.u) || 1;
      this.u += dir * 70 * dt;
      this.v += this.vv * dt;
      this.facing = dir < 0 ? "left" : "right";
    } else if (this.kind === "pedestrian") {
      this.u += this.vu * dt;
    } else if (this.kind === "reaper") {
      // Homes in slowly — unsettling but out-runnable at top speed.
      this.u += Math.sign(player.u - this.u) * 40 * dt;
      this.v -= 50 * dt; // drifts toward the player
    }
  }

  draw(ctx, cameraV) {
    const p = project(this.u, this.v, cameraV);
    const frame = Math.floor(this.anim) % 2;
    drawSprite(ctx, this.spriteKey, p.x, p.y, depthScale(p.relV), { facing: this.facing }, frame);
  }
}

export class Bundle {
  constructor(u, v) {
    this.u = u;
    this.v = v;
    this.hu = 15;
    this.hv = 13;
    this.amount = 5;
    this.dead = false;
  }

  get box() {
    return { u: this.u, v: this.v, hu: this.hu, hv: this.hv };
  }

  draw(ctx, cameraV) {
    const p = project(this.u, this.v, cameraV);
    drawSprite(ctx, "bundle", p.x, p.y, depthScale(p.relV));
  }
}

// A BMX bonus-course gate: ride between the cones to score.
export class Gate {
  constructor(u, v) {
    this.u = u;
    this.v = v;
    this.hu = 11;
    this.hv = 11;
    this.passed = false;
  }

  draw(ctx, cameraV) {
    for (const du of [-46, 46]) {
      const p = project(this.u + du, this.v, cameraV);
      drawSprite(ctx, "cone", p.x, p.y, depthScale(p.relV));
    }
  }
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

// AABB overlap in (u, v) space.
export function hit(a, b) {
  return (
    Math.abs(a.u - b.u) < a.hu + b.hu && Math.abs(a.v - b.v) < a.hv + b.hv
  );
}
