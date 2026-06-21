// Sprite system with graceful placeholder fallback.
//
// Real artwork can be dropped into /assets later and referenced from the
// manifest below. Until an image actually loads, every sprite renders as a
// labelled placeholder rectangle, so the game is fully playable with zero art.

import { SPRITE_MANIFEST } from "./sprites.manifest.js";

class SpriteSheet {
  constructor(def) {
    this.key = def.key;
    this.src = def.src;
    this.frameWidth = def.frameWidth ?? null;
    this.frameHeight = def.frameHeight ?? null;
    this.placeholder = def.placeholder ?? {};
    this.image = null;
    this.loaded = false;
  }

  load() {
    if (!this.src) return Promise.resolve(this);
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.image = img;
        this.loaded = true;
        resolve(this);
      };
      img.onerror = () => {
        // Missing art is expected during development; fall back silently.
        resolve(this);
      };
      img.src = this.src;
    });
  }
}

class AssetLoader {
  constructor() {
    this.sheets = new Map();
  }

  async loadAll() {
    const sheets = SPRITE_MANIFEST.map((def) => new SpriteSheet(def));
    sheets.forEach((s) => this.sheets.set(s.key, s));
    await Promise.all(sheets.map((s) => s.load()));
    return this;
  }

  get(key) {
    return this.sheets.get(key) ?? null;
  }

  /**
   * Draw a sprite centered at (x, y) with the given draw size. If the sprite's
   * image is loaded, the requested frame is blitted; otherwise a placeholder is
   * drawn so the entity is always visible.
   */
  draw(ctx, key, x, y, w, h, frame = 0) {
    const sheet = this.sheets.get(key);
    const dx = Math.round(x - w / 2);
    const dy = Math.round(y - h / 2);

    if (sheet && sheet.loaded && sheet.frameWidth) {
      const cols = Math.max(1, Math.floor(sheet.image.width / sheet.frameWidth));
      const sx = (frame % cols) * sheet.frameWidth;
      const sy = Math.floor(frame / cols) * sheet.frameHeight;
      ctx.drawImage(
        sheet.image,
        sx,
        sy,
        sheet.frameWidth,
        sheet.frameHeight,
        dx,
        dy,
        w,
        h,
      );
      return;
    }

    drawPlaceholder(ctx, sheet?.placeholder ?? {}, dx, dy, w, h, key);
  }
}

function drawPlaceholder(ctx, ph, x, y, w, h, key) {
  const fill = ph.fill ?? "#cc44aa";
  const stroke = ph.stroke ?? "rgba(0,0,0,0.4)";
  const radius = ph.radius ?? 4;

  ctx.save();
  ctx.fillStyle = fill;
  roundRect(ctx, x, y, w, h, radius);
  ctx.fill();

  if (ph.stroke !== null) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }

  // A tiny label helps identify entities while there's no art.
  if (ph.label !== false && Math.min(w, h) > 18) {
    ctx.fillStyle = ph.text ?? "rgba(0,0,0,0.65)";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText((ph.label ?? key).slice(0, 8), x + w / 2, y + h / 2);
  }
  ctx.restore();
}

export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export const assets = new AssetLoader();
