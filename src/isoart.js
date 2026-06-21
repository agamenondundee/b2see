// Low-level isometric drawing primitives used by the procedural sprites.
//
// Objects are drawn as shaded 3D volumes in screen space using the same axis
// directions as the world projection (iso.js): the lateral (u) and forward (v)
// ground axes plus a straight-up height axis. A single light direction gives
// each face a consistent brightness (top brightest, then the south wall, then
// the east wall), which is what sells the 3D look.

import { ISO } from "./constants.js";

// Screen-space unit vectors for one world unit along each axis.
export const AX = {
  u: { x: ISO.sx, y: ISO.sy }, // +u -> right & down
  v: { x: ISO.vx, y: -ISO.vy }, // +v -> right & up
};

// Face brightness multipliers (relative to a base colour).
export const LIGHT = { top: 1.16, south: 0.92, east: 0.66, west: 0.78, north: 0.74 };

// Project a point given in (u, v, height) offsets (already in pixels) from a
// base screen anchor.
function pt(cx, by, u, v, h) {
  return {
    x: cx + u * AX.u.x + v * AX.v.x,
    y: by + u * AX.u.y + v * AX.v.y - h,
  };
}

function poly(ctx, pts, color) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

// ---- Colour helpers -----------------------------------------------------
export function shade(hex, mul) {
  const { r, g, b } = hexToRgb(hex);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * mul)));
  return `rgb(${c(r)},${c(g)},${c(b)})`;
}
export function mix(a, b, t) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  const c = (x, y) => Math.round(x + (y - x) * t);
  return `rgb(${c(A.r, B.r)},${c(A.g, B.g)},${c(A.b, B.b)})`;
}
function hexToRgb(hex) {
  if (hex[0] === "r") {
    const m = hex.match(/\d+/g);
    return { r: +m[0], g: +m[1], b: +m[2] };
  }
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/(.)/g, "$1$1") : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

// ---- Volumes ------------------------------------------------------------

// Soft contact shadow on the ground.
export function isoShadow(ctx, cx, by, rw, rh = rw * 0.45) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.20)";
  ctx.beginPath();
  ctx.ellipse(cx, by, rw, rh, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// A shaded box. hw/hd are half-extents along u/v; h is height (all pixels).
// Returns the four top-corner screen points for stacking detail on top.
export function isoBox(ctx, cx, by, hw, hd, h, color, opts = {}) {
  const A = pt(cx, by, -hw, -hd, 0);
  const B = pt(cx, by, hw, -hd, 0);
  const C = pt(cx, by, hw, hd, 0);
  const D = pt(cx, by, -hw, hd, 0);
  const At = pt(cx, by, -hw, -hd, h);
  const Bt = pt(cx, by, hw, -hd, h);
  const Ct = pt(cx, by, hw, hd, h);
  const Dt = pt(cx, by, -hw, hd, h);

  // East wall (+u), then south wall (-v, nearer), then top.
  poly(ctx, [B, C, Ct, Bt], opts.east ?? shade(color, LIGHT.east));
  poly(ctx, [A, B, Bt, At], opts.south ?? shade(color, LIGHT.south));
  poly(ctx, [At, Bt, Ct, Dt], opts.top ?? shade(color, LIGHT.top));
  if (opts.outline) {
    ctx.strokeStyle = opts.outline;
    ctx.lineWidth = opts.outlineW ?? 1;
    ctx.stroke();
  }
  return { A, B, C, D, At, Bt, Ct, Dt };
}

// A hip-roof pyramid sitting on a footprint of half-extents hw/hd at height h0,
// rising by rh to a central apex.
export function isoRoof(ctx, cx, by, hw, hd, h0, rh, color) {
  const A = pt(cx, by, -hw, -hd, h0);
  const B = pt(cx, by, hw, -hd, h0);
  const C = pt(cx, by, hw, hd, h0);
  const D = pt(cx, by, -hw, hd, h0);
  const apex = pt(cx, by, 0, 0, h0 + rh);
  poly(ctx, [B, C, apex], shade(color, LIGHT.east)); // east slope
  poly(ctx, [A, B, apex], shade(color, LIGHT.top)); // south slope (sunlit)
  // little eave overhang line
  ctx.strokeStyle = shade(color, 0.5);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(A.x, A.y);
  ctx.lineTo(B.x, B.y);
  ctx.lineTo(C.x, C.y);
  ctx.stroke();
}

// Draw a rectangle decal flat on a wall. wall = "south" | "east".
// pos along the wall (0..1) and up (0..1) with size in pixels.
export function wallRect(ctx, cx, by, hw, hd, wall, along, up, w, h, color) {
  let base, dir;
  if (wall === "south") {
    base = pt(cx, by, -hw, -hd, 0);
    dir = AX.u; // along +u
    var span = hw * 2;
  } else {
    base = pt(cx, by, hw, -hd, 0);
    dir = AX.v;
    var span = hd * 2;
  }
  const a0 = along * span - w / 2;
  const p0 = { x: base.x + dir.x * a0, y: base.y + dir.y * a0 - up };
  const p1 = { x: p0.x + dir.x * w, y: p0.y + dir.y * w };
  const p2 = { x: p1.x, y: p1.y - h };
  const p3 = { x: p0.x, y: p0.y - h };
  poly(ctx, [p0, p1, p2, p3], color);
}

// A directional cast shadow: the footprint smeared toward the light's opposite
// (up-left), giving objects a grounded 3D feel.
export function isoCastShadow(ctx, cx, by, hw, hd, h) {
  const ox = -h * 0.42;
  const oy = -h * 0.28;
  const A = pt(cx + ox, by + oy, -hw, -hd, 0);
  const B = pt(cx + ox, by + oy, hw, -hd, 0);
  const C = pt(cx + ox, by + oy, hw, hd, 0);
  const D = pt(cx + ox, by + oy, -hw, hd, 0);
  ctx.save();
  ctx.globalAlpha = 0.16;
  poly(ctx, [A, B, C, D], "#000");
  ctx.restore();
}

// A vertical post + canopy (trees, lamps) — canopy as a layered blob. `sway`
// shifts the foliage (not the trunk) for a gentle breeze.
export function isoCanopy(ctx, cx, by, trunkH, r, trunkColor, leaf1, leaf2, sway = 0) {
  isoShadow(ctx, cx, by, r * 0.9, r * 0.4);
  ctx.fillStyle = trunkColor;
  ctx.fillRect(cx - r * 0.13, by - trunkH, r * 0.26, trunkH);
  const top = by - trunkH;
  const sx = cx + sway;
  ctx.fillStyle = shade(leaf1, 0.85);
  blob(ctx, sx, top - r * 0.1, r);
  ctx.fillStyle = leaf1;
  blob(ctx, sx - r * 0.28, top - r * 0.25, r * 0.7);
  blob(ctx, sx + r * 0.3, top - r * 0.2, r * 0.66);
  ctx.fillStyle = leaf2;
  blob(ctx, sx - r * 0.1, top - r * 0.5, r * 0.55);
}
function blob(ctx, x, y, r) {
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.92, 0, 0, Math.PI * 2);
  ctx.fill();
}
