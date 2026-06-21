// Game entities. Everything lives in screen space: the world scrolls downward
// each frame, so non-player entities simply move down by the current speed and
// are culled once they leave the bottom of the view.

import { assets } from "./assets.js";
import { VIEW, ROAD, LAWN, PLAYER, PAPER } from "./constants.js";

export class Player {
  constructor() {
    this.w = PLAYER.width;
    this.h = PLAYER.height;
    this.x = (ROAD.left + ROAD.right) / 2;
    this.y = PLAYER.startY;
    this.speed = PLAYER.baseSpeed;
    this.targetSpeed = PLAYER.baseSpeed;
    this.papers = PLAYER.startPapers;
    this.lives = PLAYER.startLives;
    this.invuln = 0; // seconds of post-crash invulnerability
    this.facing = "right";
  }

  get hitbox() {
    return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h };
  }

  update(dt, input) {
    // Speed control.
    if (input.held("up")) this.targetSpeed = PLAYER.maxSpeed;
    else if (input.held("down")) this.targetSpeed = PLAYER.minSpeed;
    else this.targetSpeed = PLAYER.baseSpeed;
    const ds = PLAYER.accel * dt;
    this.speed += clamp(this.targetSpeed - this.speed, -ds, ds);

    // Steering.
    let dir = 0;
    if (input.held("left")) dir -= 1;
    if (input.held("right")) dir += 1;
    if (dir < 0) this.facing = "left";
    if (dir > 0) this.facing = "right";
    this.x += dir * PLAYER.steerSpeed * dt;
    const half = this.w / 2;
    this.x = clamp(this.x, ROAD.left + half, ROAD.right - half);

    if (this.invuln > 0) this.invuln -= dt;
  }

  crash() {
    if (this.invuln > 0) return false;
    this.lives -= 1;
    this.papers = Math.max(0, this.papers - 3);
    this.invuln = 1.6;
    return true;
  }

  draw(ctx) {
    // Flash while invulnerable.
    if (this.invuln > 0 && Math.floor(this.invuln * 12) % 2 === 0) return;
    const frame = this.facing === "left" ? 1 : 0;
    assets.draw(ctx, "player", this.x, this.y, this.w, this.h, frame);
  }
}

export class Paper {
  constructor(x, y, side) {
    this.x = x;
    this.y = y;
    this.side = side; // "left" | "right"
    this.w = PAPER.width;
    this.h = PAPER.height;
    this.vx = (side === "left" ? -1 : 1) * PAPER.lateralSpeed;
    this.life = PAPER.flightTime;
    this.maxLife = PAPER.flightTime;
    this.dead = false;
  }

  update(dt, worldSpeed) {
    // Travel laterally toward the lawn while staying level with the scrolling
    // houses (so a paper thrown beside a house arrives at that house).
    this.x += this.vx * dt;
    this.y += worldSpeed * dt;
    this.life -= dt;
    if (this.life <= 0 || this.x < -20 || this.x > VIEW.width + 20) {
      this.dead = true;
    }
  }

  get hitbox() {
    return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h };
  }

  draw(ctx) {
    // A little hop arc for flavour.
    const p = 1 - this.life / this.maxLife;
    const hop = Math.sin(p * Math.PI) * 14;
    assets.draw(ctx, "paper", this.x, this.y - hop, this.w, this.h);
  }
}

export class House {
  constructor(side, screenY, subscriber) {
    this.side = side;
    this.y = screenY;
    this.subscriber = subscriber;
    this.w = 92;
    this.h = 92;
    this.x = side === "left" ? LAWN.leftTargetX - 6 : LAWN.rightTargetX + 6;
    // Mailbox / delivery target sits at the road-facing edge of the lawn.
    this.targetX = side === "left" ? LAWN.leftTargetX + 70 : LAWN.rightTargetX - 70;
    this.delivered = false;
    this.resolved = false; // scored (delivered or smashed) — stops re-triggering
  }

  get target() {
    return { x: this.targetX - 16, y: this.y - 14, w: 32, h: 28 };
  }

  update(dt, worldSpeed) {
    this.y += worldSpeed * dt;
  }

  draw(ctx) {
    assets.draw(
      ctx,
      this.subscriber ? "house-sub" : "house-plain",
      this.x,
      this.y - 30,
      this.w,
      this.h,
    );
    if (this.subscriber && !this.delivered) {
      const t = this.target;
      assets.draw(ctx, "mailbox", t.x + t.w / 2, t.y + t.h / 2, 22, 22);
    }
  }
}

export class Obstacle {
  constructor(kind, x, screenY) {
    this.kind = kind; // "car" | "cone"
    this.x = x;
    this.y = screenY;
    if (kind === "car") {
      this.w = 46;
      this.h = 78;
    } else {
      this.w = 26;
      this.h = 30;
    }
  }

  get hitbox() {
    return {
      x: this.x - this.w / 2 + 4,
      y: this.y - this.h / 2 + 4,
      w: this.w - 8,
      h: this.h - 8,
    };
  }

  update(dt, worldSpeed) {
    this.y += worldSpeed * dt;
  }

  draw(ctx) {
    assets.draw(ctx, this.kind === "car" ? "car" : "cone", this.x, this.y, this.w, this.h);
  }
}

export class Bundle {
  constructor(x, screenY) {
    this.x = x;
    this.y = screenY;
    this.w = 28;
    this.h = 24;
    this.amount = 5;
    this.dead = false;
  }

  get hitbox() {
    return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h };
  }

  update(dt, worldSpeed) {
    this.y += worldSpeed * dt;
  }

  draw(ctx) {
    assets.draw(ctx, "bundle", this.x, this.y, this.w, this.h);
  }
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
