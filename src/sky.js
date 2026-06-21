// Parallax sky: a gradient band with a distant horizon silhouette (daytime
// mountains cross-fading to a night city skyline), drifting clouds and stars.
// Uses CC0 background art from assets/sky/ (see assets/CREDITS.md); each image
// is optional — if one fails to load that layer is simply skipped.

import { VIEW } from "./constants.js";

export const HORIZON = 156; // screen y where sky meets the ground

const layers = {};
function load(name, src) {
  const img = new Image();
  img.onload = () => (layers[name] = img);
  img.src = src;
}
load("clouds", "assets/sky/clouds.png");
load("city", "assets/sky/city-night.png");
load("stars", "assets/sky/starfield.png");
load("mountains", "assets/sky/mountains.png");

// Tile an image horizontally with a parallax offset, scaled to a target height,
// with its bottom anchored at `bottomY`.
function parallaxStrip(ctx, img, offset, bottomY, height, alpha) {
  if (!img || alpha <= 0) return;
  const w = img.width * (height / img.height);
  let x = -(((offset % w) + w) % w);
  ctx.globalAlpha = alpha;
  for (; x < VIEW.width; x += w) {
    ctx.drawImage(img, x, bottomY - height, w, height);
  }
  ctx.globalAlpha = 1;
}

export function drawSky(ctx, atmos, scroll, lateral) {
  // Sky gradient band.
  const g = ctx.createLinearGradient(0, 0, 0, HORIZON + 30);
  g.addColorStop(0, atmos.skyTop);
  g.addColorStop(1, atmos.skyBot);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW.width, HORIZON + 30);

  // Stars (night).
  if (atmos.stars > 0.02 && layers.stars) {
    parallaxStrip(ctx, layers.stars, lateral * 0.05, HORIZON + 6, HORIZON + 6, atmos.stars * 0.9);
  }

  // Distant horizon: mountains by day, city skyline by night (cross-faded).
  const dayHorizon = 1 - atmos.night;
  parallaxStrip(ctx, layers.mountains, scroll * 0.04 + lateral * 0.12, HORIZON + 2, 92, dayHorizon);
  parallaxStrip(ctx, layers.city, scroll * 0.05 + lateral * 0.14, HORIZON + 2, 88, atmos.night);

  // Drifting clouds (fade out at night).
  parallaxStrip(ctx, layers.clouds, scroll * 0.06 + lateral * 0.2, HORIZON - 40, 70, dayHorizon * 0.8);

  // Soft haze where the sky meets the ground.
  const h = ctx.createLinearGradient(0, HORIZON - 36, 0, HORIZON + 30);
  h.addColorStop(0, "rgba(0,0,0,0)");
  h.addColorStop(1, atmos.haze);
  ctx.fillStyle = h;
  ctx.fillRect(0, HORIZON - 36, VIEW.width, 66);
}
