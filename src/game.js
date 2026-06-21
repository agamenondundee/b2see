// Core game state machine. Phases: MENU -> STREET -> TALLY -> BMX -> TALLY ->
// (next) STREET ... and OVER when lives run out.

import { PLAYER, SCORING, ROUTE, STREET } from "./constants.js";
import { input } from "./input.js";
import { audio } from "./audio.js";
import { effects } from "./effects.js";
import { project } from "./iso.js";
import { World } from "./world.js";
import { Player, Paper, hit } from "./entities.js";
import { drawHud, drawFloatingText, drawTally, drawGameOver, drawVignette } from "./hud.js";

export const Phase = {
  MENU: "menu",
  STREET: "street",
  TALLY: "tally",
  BMX: "bmx",
  OVER: "over",
};

export class Game {
  constructor(ctx) {
    this.ctx = ctx;
    this.phase = Phase.MENU;
    this.onPhaseChange = null;
    this.score = 0;
    this.player = new Player();
    this.world = new World();
    this.papers = [];
    this.popups = [];
  }

  get cameraV() {
    return this.player.v - PLAYER.relV;
  }

  setPhase(p) {
    this.phase = p;
    this.onPhaseChange?.(p);
  }

  newGame() {
    this.score = 0;
    this.deliveries = 0;
    this.streetNumber = 1;
    this.beginSegment("street", PLAYER.startLives);
    audio.startMusic();
  }

  beginSegment(mode, lives) {
    this.mode = mode;
    this.player = new Player();
    this.player.lives = lives;
    if (mode === "bmx") this.player.papers = 0;
    this.world = new World(mode);
    this.papers = [];
    this.popups = [];
    this.gatesPassed = 0;
    this.streak = 0;
    this.setPhase(mode === "bmx" ? Phase.BMX : Phase.STREET);
  }

  update(dt) {
    if (this.phase === Phase.TALLY && input.consume("confirm")) {
      if (this.tally.next === "bmx") this.beginSegment("bmx", this.player.lives);
      else {
        this.streetNumber++;
        this.beginSegment("street", this.player.lives);
      }
      return;
    }
    if (this.phase === Phase.OVER && input.consume("confirm")) {
      this.newGame();
      return;
    }
    if (this.phase !== Phase.STREET && this.phase !== Phase.BMX) return;

    this.player.update(dt, input, STREET);
    this.world.update(dt, this.player);
    this.updatePapers(dt);
    if (this.phase === Phase.STREET) {
      this.handleThrows();
      this.handleDeliveries();
      this.scoreMissedSubscribers();
    } else {
      this.handleGates();
    }
    this.handleCollisions();
    this.handlePickups();
    this.updatePopups(dt);
    this.emitTrail(dt);
    effects.update(dt);
    this.checkSegmentEnd();
  }

  // Screen position of a world point, for spawning effects.
  screenAt(u, v) {
    return project(u, v, this.cameraV);
  }

  emitTrail(dt) {
    const p = this.player;
    if (p.speed > PLAYER.baseSpeed * 1.05 && Math.random() < p.speed / 600) {
      const sp = this.screenAt(p.u, p.v);
      effects.dust(sp.x, sp.y + 4);
    }
  }

  handleThrows() {
    const p = this.player;
    const left = input.consume("throwLeft");
    const right = left ? false : input.consume("throwRight");
    if (!left && !right) return;
    if (p.papers <= 0) {
      this.addPopup(p.u, p.v, "EMPTY!", "#ff6b6b");
      return;
    }
    const side = left ? "left" : "right";
    p.facing = side;
    p.papers -= 1;
    this.papers.push(new Paper(p.u, p.v, side));
    audio.throw();
  }

  updatePapers(dt) {
    for (const paper of this.papers) paper.update(dt);
    this.papers = this.papers.filter((p) => !p.dead);
  }

  handleDeliveries() {
    for (const paper of this.papers) {
      if (paper.dead) continue;
      for (const house of this.world.houses) {
        if (house.resolved || house.side !== paper.side) continue;
        if (!hit(paper.box, house.target)) continue;
        paper.dead = true;
        house.resolved = true;
        if (house.subscriber) {
          house.delivered = true;
          this.streak += 1;
          this.deliveries += 1;
          const points = SCORING.delivery + (this.streak - 1) * SCORING.perfectStreak;
          this.score += points;
          this.addPopup(house.targetU, house.v, `+${points}`, "#6ee06e");
          const sp = this.screenAt(house.targetU, house.v);
          effects.sparkle(sp.x, sp.y - 20, ["#6ee06e", "#b6ff9e", "#ffffff"]);
          audio.deliver();
        } else {
          this.score += SCORING.smashWindow;
          this.addPopup(house.targetU, house.v, `+${SCORING.smashWindow}`, "#ffd23f");
          const sp = this.screenAt(house.u, house.v);
          effects.shards(sp.x, sp.y - 40, ["#bfe6ff", "#ffffff", "#9fb9c4"]);
          audio.smash();
        }
        break;
      }
    }
  }

  scoreMissedSubscribers() {
    for (const house of this.world.houses) {
      if (house.v < this.player.v - 60 && house.subscriber && !house.resolved) {
        house.resolved = true;
        this.streak = 0;
      }
    }
  }

  handleGates() {
    for (const gate of this.world.gates) {
      if (!gate.passed && this.player.v > gate.v) {
        gate.passed = true;
        if (Math.abs(this.player.u - gate.u) < 40) {
          this.gatesPassed++;
          this.score += SCORING.bmxGate;
          this.addPopup(gate.u, gate.v, `+${SCORING.bmxGate}`, "#6ee06e");
          const sp = this.screenAt(gate.u, gate.v);
          effects.sparkle(sp.x, sp.y - 16, ["#6ee06e", "#ffd23f", "#ffffff"]);
          audio.gate();
        }
      }
    }
  }

  handleCollisions() {
    const p = this.player;
    const solids = [...this.world.obstacles, ...this.world.hazards];
    for (const ob of solids) {
      if (hit(p.box, ob.box) && p.crash()) {
        this.streak = 0;
        this.addPopup(p.u, p.v, "CRASH!", "#ff6b6b");
        const sp = this.screenAt(p.u, p.v);
        effects.stars(sp.x, sp.y - 24);
        audio.crash();
        if (p.lives <= 0) this.gameOver();
        break;
      }
    }
  }

  handlePickups() {
    const p = this.player;
    for (const b of this.world.bundles) {
      if (!b.dead && hit(p.box, b.box)) {
        b.dead = true;
        p.papers += b.amount;
        this.addPopup(b.u, b.v, `+${b.amount} papers`, "#e8c46a");
        const sp = this.screenAt(b.u, b.v);
        effects.sparkle(sp.x, sp.y - 10, ["#ffd23f", "#e8c46a", "#ffffff"]);
        audio.pickup();
      }
    }
  }

  checkSegmentEnd() {
    if (this.phase === Phase.STREET && this.player.v >= ROUTE.length) {
      const bonus = SCORING.routeBonus;
      this.score += bonus;
      audio.fanfare();
      this.tally = {
        title: `STREET ${this.streetNumber} COMPLETE`,
        lines: [
          `Papers delivered: ${this.deliveries}`,
          `Route bonus: ${bonus}`,
          `Total score: ${this.score}`,
        ],
        prompt: "Next up: BMX bonus course",
        next: "bmx",
      };
      this.setPhase(Phase.TALLY);
    } else if (this.phase === Phase.BMX && this.player.v >= ROUTE.bmxLength) {
      const bonus = SCORING.bmxFinish;
      this.score += bonus;
      audio.fanfare();
      this.tally = {
        title: "BMX COURSE CLEARED",
        lines: [
          `Gates: ${this.gatesPassed} (+${this.gatesPassed * SCORING.bmxGate})`,
          `Finish bonus: ${bonus}`,
          `Total score: ${this.score}`,
        ],
        prompt: "Back on the route!",
        next: "street",
      };
      this.setPhase(Phase.TALLY);
    }
  }

  gameOver() {
    audio.stopMusic();
    this.tally = null;
    this.setPhase(Phase.OVER);
  }

  addPopup(u, v, text, color) {
    this.popups.push({ u, v, text, color, life: 1.0, maxLife: 1.0 });
  }

  updatePopups(dt) {
    for (const pop of this.popups) pop.life -= dt;
    this.popups = this.popups.filter((p) => p.life > 0);
  }

  get hudState() {
    return {
      score: this.score,
      papers: this.player.papers,
      lives: this.player.lives,
      streak: this.streak ?? 0,
      mode: this.mode,
      progress:
        this.mode === "bmx"
          ? this.player.v / ROUTE.bmxLength
          : this.player.v / ROUTE.length,
      deliveries: this.deliveries ?? 0,
      gates: this.gatesPassed ?? 0,
    };
  }

  draw() {
    const ctx = this.ctx;
    const cam = this.cameraV;

    // World layer is offset by the screen-shake.
    const sh = effects.shakeOffset();
    ctx.save();
    ctx.translate(Math.round(sh.x), Math.round(sh.y));
    this.world.drawGround(ctx, cam);
    this.world.drawEntities(ctx, cam);
    for (const paper of this.papers) paper.draw(ctx, cam);
    this.player.draw(ctx, cam);
    drawFloatingText(ctx, this.popups, cam);
    effects.draw(ctx);
    ctx.restore();

    // Damage flash.
    if (effects.flash > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.4, effects.flash);
      ctx.fillStyle = effects.flashColor;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.restore();
    }

    drawVignette(ctx);

    if (this.phase !== Phase.MENU) drawHud(ctx, this.hudState);
    if (this.phase === Phase.TALLY) drawTally(ctx, this.tally);
    if (this.phase === Phase.OVER) drawGameOver(ctx, this.hudState);
  }
}
