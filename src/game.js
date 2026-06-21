// Core game state machine: orchestrates the player, world and scoring.

import { VIEW, SCORING } from "./constants.js";
import { input } from "./input.js";
import { World } from "./world.js";
import { Player, Paper, aabb } from "./entities.js";
import { drawHud, drawFloatingText, drawGameOver } from "./hud.js";

export const GameState = { MENU: "menu", PLAYING: "playing", OVER: "over" };

export class Game {
  constructor(ctx) {
    this.ctx = ctx;
    this.state = GameState.MENU;
    this.onStateChange = null;
    this.reset();
  }

  reset() {
    this.world = new World();
    this.player = new Player();
    this.papers = [];
    this.popups = [];
    this.score = 0;
    this.deliveries = 0;
    this.streak = 0;
  }

  start() {
    this.reset();
    this.setState(GameState.PLAYING);
  }

  setState(s) {
    this.state = s;
    this.onStateChange?.(s);
  }

  update(dt) {
    // Restart from the game-over screen.
    if (this.state === GameState.OVER && input.consume("up")) {
      this.start();
      return;
    }
    if (this.state !== GameState.PLAYING) return;

    const p = this.player;
    p.update(dt, input);
    const speed = p.speed;

    this.world.update(dt, speed);
    this.handleThrows();
    this.updatePapers(dt, speed);
    this.handleDeliveries();
    this.handleCollisions();
    this.handlePickups();
    this.scoreMissedSubscribers();
    this.updatePopups(dt);
  }

  handleThrows() {
    const p = this.player;
    // Throw at most one paper per frame; if both keys land together the second
    // stays queued for the next frame rather than being wasted.
    const throwLeft = input.consume("throwLeft");
    const throwRight = throwLeft ? false : input.consume("throwRight");
    if (!throwLeft && !throwRight) return;
    if (p.papers <= 0) {
      this.addPopup(p.x, p.y - 40, "EMPTY!", "#ff6b6b");
      return;
    }
    const side = throwLeft ? "left" : "right";
    p.facing = side;
    p.papers -= 1;
    this.papers.push(new Paper(p.x, p.y - 10, side));
  }

  updatePapers(dt, speed) {
    for (const paper of this.papers) paper.update(dt, speed);
    this.papers = this.papers.filter((p) => !p.dead);
  }

  handleDeliveries() {
    for (const paper of this.papers) {
      if (paper.dead) continue;
      for (const house of this.world.houses) {
        if (house.resolved || house.side !== paper.side) continue;
        if (!aabb(paper.hitbox, house.target)) continue;

        paper.dead = true;
        house.resolved = true;
        if (house.subscriber) {
          house.delivered = true;
          this.streak += 1;
          this.deliveries += 1;
          const bonus = (this.streak - 1) * SCORING.perfectStreak;
          const points = SCORING.delivery + bonus;
          this.score += points;
          this.addPopup(house.targetX, house.y - 20, `+${points}`, "#6ee06e");
        } else {
          // Smashing a non-subscriber's window — classic mischief points.
          this.score += SCORING.smashWindow;
          this.addPopup(house.targetX, house.y - 20, `+${SCORING.smashWindow}`, "#ffd23f");
        }
        break;
      }
    }
  }

  handleCollisions() {
    const p = this.player;
    for (const ob of this.world.obstacles) {
      if (aabb(p.hitbox, ob.hitbox) && p.crash()) {
        this.streak = 0;
        this.addPopup(p.x, p.y - 40, "CRASH!", "#ff6b6b");
        if (p.lives <= 0) this.setState(GameState.OVER);
        break;
      }
    }
  }

  handlePickups() {
    const p = this.player;
    for (const bundle of this.world.bundles) {
      if (bundle.dead) continue;
      if (aabb(p.hitbox, bundle.hitbox)) {
        bundle.dead = true;
        p.papers += bundle.amount;
        this.addPopup(bundle.x, bundle.y - 20, `+${bundle.amount} papers`, "#e8c46a");
      }
    }
  }

  // A subscriber house that scrolls off the bottom undelivered breaks the streak.
  scoreMissedSubscribers() {
    for (const house of this.world.houses) {
      if (house.y > VIEW.height + 80 && house.subscriber && !house.resolved) {
        house.resolved = true;
        this.streak = 0;
      }
    }
  }

  addPopup(x, y, text, color) {
    this.popups.push({ x, y, text, color, life: 0.9, maxLife: 0.9 });
  }

  updatePopups(dt) {
    for (const pop of this.popups) {
      pop.life -= dt;
      pop.y -= 30 * dt;
    }
    this.popups = this.popups.filter((p) => p.life > 0);
  }

  get hudState() {
    return {
      score: this.score,
      papers: this.player.papers,
      lives: this.player.lives,
      streak: this.streak,
      deliveries: this.deliveries,
    };
  }

  draw() {
    const ctx = this.ctx;
    this.world.draw(ctx);

    // Draw far-to-near so nearer entities overlap correctly.
    const drawables = [
      ...this.world.houses,
      ...this.world.bundles,
      ...this.world.obstacles,
      ...this.papers,
    ].sort((a, b) => a.y - b.y);
    for (const d of drawables) d.draw(ctx);

    this.player.draw(ctx);
    drawFloatingText(ctx, this.popups);
    drawHud(ctx, this.hudState);

    if (this.state === GameState.OVER) drawGameOver(ctx, this.hudState);
  }
}
