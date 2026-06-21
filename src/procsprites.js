// Procedural artwork. Entities are drawn as shaded isometric volumes (houses,
// cars, props) or detailed billboards (characters), anchored at their ground
// point (cx, baseY). No external image files are required; if a real PNG is
// later loaded for a key it is used instead (see drawSprite dispatch).

import { assets } from "./assets.js";
import { roundRect } from "./assets.js";
import { isoBox, isoRoof, isoShadow, wallRect, isoCanopy, shade, mix, LIGHT, AX } from "./isoart.js";

const NOMINAL = {
  player: [40, 56],
  paper: [16, 12],
  "house-sub": [120, 124],
  "house-plain": [120, 124],
  mailbox: [22, 34],
  car: [48, 74],
  cone: [26, 32],
  bundle: [30, 26],
  dog: [40, 28],
  pedestrian: [26, 52],
  reaper: [40, 60],
  ramp: [70, 34],
  tree: [60, 90],
  hedge: [70, 40],
  lamp: [24, 80],
  hydrant: [20, 30],
  flowerbed: [50, 24],
};

export function drawSprite(ctx, key, cx, baseY, scale, opts = {}, frame = 0) {
  const sheet = assets.get(key);
  if (sheet && sheet.loaded && sheet.frameWidth) {
    const [nw, nh] = NOMINAL[key] ?? [sheet.frameWidth, sheet.frameHeight];
    assets.draw(ctx, key, cx, baseY - (nh * scale) / 2, nw * scale, nh * scale, frame);
    return;
  }
  const fn = PAINTERS[key];
  if (fn) fn(ctx, cx, baseY, scale, opts, frame);
}

function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

// ---- Player: BMX rider --------------------------------------------------
function paintPlayer(ctx, cx, baseY, scale, opts, frame) {
  const s = scale;
  isoShadow(ctx, cx, baseY, 22 * s, 8 * s);
  ctx.save();
  ctx.translate(cx, baseY);
  if (opts.facing === "left") ctx.scale(-1, 1);
  ctx.scale(s, s);
  const spin = frame % 2 === 0 ? 0 : Math.PI / 4;

  for (const wx of [-14, 14]) {
    ctx.fillStyle = "#15151a";
    ctx.beginPath();
    ctx.arc(wx, -9, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2a2a32";
    ctx.beginPath();
    ctx.arc(wx, -9, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#cfcfd6";
    ctx.lineWidth = 1;
    for (let a = 0; a < 4; a++) {
      const ang = spin + (a * Math.PI) / 2;
      ctx.beginPath();
      ctx.moveTo(wx, -9);
      ctx.lineTo(wx + Math.cos(ang) * 8, -9 + Math.sin(ang) * 8);
      ctx.stroke();
    }
  }
  // Frame.
  ctx.strokeStyle = "#e23b3b";
  ctx.lineCap = "round";
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(-14, -9);
  ctx.lineTo(2, -9);
  ctx.lineTo(-2, -23);
  ctx.lineTo(-14, -9);
  ctx.moveTo(2, -9);
  ctx.lineTo(14, -9);
  ctx.lineTo(10, -25);
  ctx.stroke();
  // Legs.
  ctx.strokeStyle = "#2b59d9";
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(-2, -23);
  ctx.lineTo(1, -11);
  ctx.moveTo(-2, -23);
  ctx.lineTo(-6, -10);
  ctx.stroke();
  // Torso.
  ctx.strokeStyle = "#ffd23f";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(-2, -23);
  ctx.lineTo(5, -38);
  ctx.stroke();
  // Shoulder bag of papers.
  ctx.fillStyle = "#8a5a2b";
  ctx.beginPath();
  ctx.ellipse(-6, -28, 5, 7, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // Arm.
  ctx.strokeStyle = "#e0a070";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(5, -36);
  ctx.lineTo(10, -25);
  ctx.stroke();
  // Head + helmet.
  ctx.fillStyle = "#e8b080";
  ctx.beginPath();
  ctx.arc(6, -42, 5.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e23b3b";
  ctx.beginPath();
  ctx.arc(6, -44, 6, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.fillRect(9, -44, 3, 2);
  ctx.restore();
}

// ---- Paper --------------------------------------------------------------
function paintPaper(ctx, cx, cy, scale) {
  const s = scale;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(0.3);
  ctx.fillStyle = "#efe7cf";
  roundRect(ctx, -8 * s, -6 * s, 16 * s, 12 * s, 2 * s);
  ctx.fill();
  ctx.fillStyle = "#cfc6ad";
  ctx.fillRect(-8 * s, -1 * s, 16 * s, 2 * s);
  ctx.strokeStyle = "#b34a2b";
  ctx.lineWidth = Math.max(1, 2 * s);
  ctx.beginPath();
  ctx.moveTo(0, -6 * s);
  ctx.lineTo(0, 6 * s);
  ctx.stroke();
  ctx.restore();
}

// ---- Houses (isometric volumes) -----------------------------------------
const SUB_PALETTE = [
  { wall: "#e8d6a8", roof: "#c0392b" },
  { wall: "#d9ead0", roof: "#2f7d5a" },
  { wall: "#f0e0c0", roof: "#1f6fb0" },
];
const PLAIN_PALETTE = [
  { wall: "#c9bfae", roof: "#6f6557" },
  { wall: "#b9c2c8", roof: "#5a6168" },
  { wall: "#cabfb2", roof: "#7a6a58" },
];

function paintHouse(ctx, cx, baseY, scale, opts) {
  const sub = opts.subscriber;
  const pal = (sub ? SUB_PALETTE : PLAIN_PALETTE)[(opts.variant ?? 0) % 3];
  const s = scale;
  const hw = 38 * s;
  const hd = 30 * s;
  const wallH = 42 * s;

  isoShadow(ctx, cx, baseY, hw * 1.5, hw * 0.7);
  const box = isoBox(ctx, cx, baseY, hw, hd, wallH, pal.wall);

  // Door on the south wall.
  wallRect(ctx, cx, baseY, hw, hd, "south", 0.5, 0, 14 * s, 26 * s, shade(pal.roof, 0.7));
  // Windows (lit gold for subscribers, cool glass otherwise).
  const glass = sub ? "#ffe9a0" : "#9fb9c4";
  for (const along of [0.2, 0.8]) {
    wallRect(ctx, cx, baseY, hw, hd, "south", along, 22 * s, 12 * s, 12 * s, shade(glass, 0.9));
    wallRect(ctx, cx, baseY, hw, hd, "south", along, 24 * s, 9 * s, 9 * s, glass);
  }
  // A window on the east wall too.
  wallRect(ctx, cx, baseY, hw, hd, "east", 0.5, 22 * s, 11 * s, 11 * s, shade(glass, 0.78));

  // Roof + chimney.
  isoRoof(ctx, cx, baseY, hw + 3 * s, hd + 3 * s, wallH, 26 * s, pal.roof);
  isoBox(ctx, cx - hw * 0.4, baseY, 4 * s, 4 * s, wallH + 20 * s, shade(pal.roof, 0.6));

  if (opts.delivered) paintPaper(ctx, box.A.x + 12 * s, box.A.y - 3 * s, s * 0.85);
}

// ---- Mailbox ------------------------------------------------------------
function paintMailbox(ctx, cx, baseY, scale, opts) {
  const s = scale;
  isoShadow(ctx, cx, baseY, 9 * s, 4 * s);
  ctx.fillStyle = "#5a4632";
  ctx.fillRect(cx - 1.6 * s, baseY - 22 * s, 3.2 * s, 22 * s);
  const color = opts.subscriber ? "#ffd23f" : "#b8b8c2";
  isoBox(ctx, cx, baseY - 22 * s, 8 * s, 5 * s, 9 * s, color);
  // Flag.
  ctx.fillStyle = opts.flagUp ? "#e23b3b" : "#7a1414";
  const fy = opts.flagUp ? baseY - 32 * s : baseY - 26 * s;
  ctx.fillRect(cx + 7 * s, fy, 4 * s, 7 * s);
}

// ---- Car (isometric volume) ---------------------------------------------
function paintCar(ctx, cx, baseY, scale, opts) {
  const s = scale;
  const color = opts.color ?? "#2e8be0";
  const hw = 16 * s;
  const hd = 30 * s;
  isoShadow(ctx, cx, baseY, hw * 1.5, hw * 0.7);
  // Wheels.
  ctx.fillStyle = "#15151a";
  for (const [du, dv] of [[-hw, -hd * 0.6], [hw, -hd * 0.6], [-hw, hd * 0.6], [hw, hd * 0.6]]) {
    ctx.beginPath();
    ctx.ellipse(cx + du * AX.u.x + dv * AX.v.x, baseY + du * AX.u.y + dv * AX.v.y, 5 * s, 3.4 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Lower body + cabin.
  isoBox(ctx, cx, baseY - 3 * s, hw, hd, 11 * s, color);
  isoBox(ctx, cx, baseY - 14 * s, hw * 0.82, hd * 0.62, 10 * s, shade(color, 1.05), {
    top: mix(color, "#ffffff", 0.25),
  });
  // Windshield + lights on south face.
  wallRect(ctx, cx, baseY - 14 * s, hw * 0.82, hd * 0.62, "south", 0.5, 2 * s, 16 * s, 7 * s, "#bfe6ff");
  wallRect(ctx, cx, baseY - 3 * s, hw, hd, "south", 0.22, 1 * s, 5 * s, 3 * s, "#fff3b0");
  wallRect(ctx, cx, baseY - 3 * s, hw, hd, "south", 0.78, 1 * s, 5 * s, 3 * s, "#fff3b0");
}

// ---- Cone ---------------------------------------------------------------
function paintCone(ctx, cx, baseY, scale) {
  const s = scale;
  isoShadow(ctx, cx, baseY, 11 * s, 5 * s);
  ctx.fillStyle = "#d85f10";
  ctx.beginPath();
  ctx.ellipse(cx, baseY, 11 * s, 4.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ff7a1a";
  ctx.beginPath();
  ctx.moveTo(cx, baseY - 30 * s);
  ctx.lineTo(cx + 9 * s, baseY);
  ctx.lineTo(cx - 9 * s, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#f4f4f8";
  ctx.beginPath();
  ctx.moveTo(cx - 6 * s, baseY - 12 * s);
  ctx.lineTo(cx + 6 * s, baseY - 12 * s);
  ctx.lineTo(cx + 5 * s, baseY - 17 * s);
  ctx.lineTo(cx - 5 * s, baseY - 17 * s);
  ctx.closePath();
  ctx.fill();
}

// ---- Paper bundle -------------------------------------------------------
function paintBundle(ctx, cx, baseY, scale) {
  const s = scale;
  isoShadow(ctx, cx, baseY, 14 * s, 6 * s);
  isoBox(ctx, cx, baseY, 13 * s, 9 * s, 13 * s, "#e8c46a", { top: "#f4efda" });
  ctx.strokeStyle = "#8a1f1f";
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.moveTo(cx - 10 * s, baseY - 6 * s);
  ctx.lineTo(cx + 10 * s, baseY - 8 * s);
  ctx.stroke();
}

// ---- Dog ----------------------------------------------------------------
function paintDog(ctx, cx, baseY, scale, opts, frame) {
  const s = scale;
  isoShadow(ctx, cx, baseY, 16 * s, 6 * s);
  ctx.save();
  ctx.translate(cx, baseY);
  if (opts.facing === "left") ctx.scale(-1, 1);
  ctx.fillStyle = "#8a5a2b";
  roundRect(ctx, -15 * s, -18 * s, 28 * s, 12 * s, 6 * s);
  ctx.fill();
  ctx.fillStyle = "#9a6a36";
  ctx.beginPath();
  ctx.arc(14 * s, -18 * s, 7 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#6b4420";
  ctx.beginPath();
  ctx.moveTo(16 * s, -25 * s);
  ctx.lineTo(20 * s, -22 * s);
  ctx.lineTo(15 * s, -20 * s);
  ctx.fill();
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(17 * s, -19 * s, 2 * s, 2 * s);
  const sw = frame % 2 === 0 ? 3 * s : -3 * s;
  ctx.strokeStyle = "#6b4420";
  ctx.lineWidth = 3 * s;
  ctx.lineCap = "round";
  for (const lx of [-11 * s, 9 * s]) {
    ctx.beginPath();
    ctx.moveTo(lx, -7 * s);
    ctx.lineTo(lx + sw, 0);
    ctx.stroke();
  }
  ctx.restore();
}

// ---- Pedestrian ---------------------------------------------------------
function paintPedestrian(ctx, cx, baseY, scale, opts, frame) {
  const s = scale;
  isoShadow(ctx, cx, baseY, 11 * s, 5 * s);
  ctx.save();
  ctx.translate(cx, baseY);
  const sw = frame % 2 === 0 ? 4 * s : -4 * s;
  ctx.strokeStyle = "#34343f";
  ctx.lineWidth = 4.5 * s;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, -20 * s);
  ctx.lineTo(sw, 0);
  ctx.moveTo(0, -20 * s);
  ctx.lineTo(-sw, 0);
  ctx.stroke();
  ctx.strokeStyle = opts.color ?? "#3a8d6d";
  ctx.lineWidth = 9 * s;
  ctx.beginPath();
  ctx.moveTo(0, -20 * s);
  ctx.lineTo(0, -38 * s);
  ctx.stroke();
  ctx.fillStyle = "#e8b080";
  ctx.beginPath();
  ctx.arc(0, -44 * s, 6 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#34343f";
  ctx.beginPath();
  ctx.arc(0, -47 * s, 6.4 * s, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ---- Grim Reaper --------------------------------------------------------
function paintReaper(ctx, cx, baseY, scale, opts, frame) {
  const s = scale;
  isoShadow(ctx, cx, baseY, 16 * s, 6 * s);
  const sway = Math.sin(frame * 1.5) * 1.5 * s;
  ctx.fillStyle = "#15151c";
  ctx.beginPath();
  ctx.moveTo(cx + sway, baseY - 58 * s);
  ctx.quadraticCurveTo(cx - 20 * s, baseY - 20 * s, cx - 15 * s, baseY);
  ctx.lineTo(cx + 15 * s, baseY);
  ctx.quadraticCurveTo(cx + 20 * s, baseY - 20 * s, cx + sway, baseY - 58 * s);
  ctx.fill();
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(cx + sway, baseY - 47 * s, 8 * s, 0, Math.PI * 2);
  ctx.fill();
  const glow = frame % 2 === 0 ? "#ff3b3b" : "#ff9090";
  ctx.fillStyle = glow;
  ctx.shadowColor = glow;
  ctx.shadowBlur = 6 * s;
  ctx.fillRect(cx + sway - 4 * s, baseY - 49 * s, 3 * s, 3 * s);
  ctx.fillRect(cx + sway + 1 * s, baseY - 49 * s, 3 * s, 3 * s);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#7a5a2a";
  ctx.lineWidth = 2.5 * s;
  ctx.beginPath();
  ctx.moveTo(cx + 15 * s, baseY - 58 * s);
  ctx.lineTo(cx + 15 * s, baseY - 4 * s);
  ctx.stroke();
  ctx.strokeStyle = "#dcdce4";
  ctx.lineWidth = 3.5 * s;
  ctx.beginPath();
  ctx.arc(cx + 11 * s, baseY - 56 * s, 9 * s, -0.4, 1.5);
  ctx.stroke();
}

// ---- BMX ramp -----------------------------------------------------------
function paintRamp(ctx, cx, baseY, scale) {
  const s = scale;
  const hw = 26 * s;
  isoShadow(ctx, cx, baseY, hw * 1.3, hw * 0.6);
  // Wedge: a box with a sloped top toward -v.
  const back = isoBox(ctx, cx, baseY, hw, 16 * s, 20 * s, "#b8742e");
  // Slope face (south) as a triangle highlight.
  ctx.fillStyle = "#d89240";
  ctx.beginPath();
  ctx.moveTo(back.A.x, back.A.y);
  ctx.lineTo(back.Bt.x, back.Bt.y);
  ctx.lineTo(back.At.x, back.At.y);
  ctx.fill();
  for (let i = -1; i <= 1; i++) {
    ctx.fillStyle = "#ffd23f";
    ctx.fillRect(cx + i * 13 * s - 3 * s, baseY - 16 * s, 6 * s, 4 * s);
  }
}

// ---- Trees / hedges / lamps / hydrants / flowerbeds ----------------------
function paintTree(ctx, cx, baseY, scale, opts) {
  const s = scale;
  const r = (opts.r ?? 20) * s;
  isoCanopy(ctx, cx, baseY, 26 * s, r, "#5a3a1e", "#2f7d3a", "#48a35a");
}
function paintHedge(ctx, cx, baseY, scale, opts) {
  const s = scale;
  const len = (opts.len ?? 30) * s;
  isoShadow(ctx, cx, baseY, len * 1.1, len * 0.5);
  isoBox(ctx, cx, baseY, len, 8 * s, 16 * s, "#3c7a32", {
    top: "#56a046",
    south: "#469a3a",
  });
  // speckle highlights
  ctx.fillStyle = "rgba(120,200,110,0.5)";
  for (let i = 0; i < 6; i++) {
    ctx.fillRect(cx - len + i * (len / 3) * 0.9, baseY - 14 * s - (i % 2) * 3 * s, 3 * s, 3 * s);
  }
}
function paintLamp(ctx, cx, baseY, scale) {
  const s = scale;
  isoShadow(ctx, cx, baseY, 6 * s, 3 * s);
  ctx.fillStyle = "#3a3a44";
  ctx.fillRect(cx - 1.6 * s, baseY - 60 * s, 3.2 * s, 60 * s);
  ctx.fillRect(cx - 8 * s, baseY - 60 * s, 16 * s, 3 * s);
  ctx.fillStyle = "#fff3b0";
  ctx.shadowColor = "#ffe27a";
  ctx.shadowBlur = 8 * s;
  ctx.beginPath();
  ctx.arc(cx - 8 * s, baseY - 56 * s, 4 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}
function paintHydrant(ctx, cx, baseY, scale) {
  const s = scale;
  isoShadow(ctx, cx, baseY, 7 * s, 3 * s);
  isoBox(ctx, cx, baseY, 5 * s, 4 * s, 16 * s, "#d23b2b");
  ctx.fillStyle = "#9a1f14";
  ctx.beginPath();
  ctx.arc(cx, baseY - 18 * s, 5 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e8e8ee";
  ctx.fillRect(cx - 7 * s, baseY - 11 * s, 3 * s, 3 * s);
  ctx.fillRect(cx + 4 * s, baseY - 11 * s, 3 * s, 3 * s);
}
function paintFlowerbed(ctx, cx, baseY, scale) {
  const s = scale;
  isoBox(ctx, cx, baseY, 22 * s, 9 * s, 4 * s, "#6b4a2a", { top: "#3a6b2f" });
  const cols = ["#ff5a7a", "#ffd23f", "#7ab0ff", "#ff9a3f"];
  for (let i = 0; i < 8; i++) {
    const u = (-18 + (i % 4) * 12) * s;
    const v = (i < 4 ? -3 : 3) * s;
    const x = cx + u * AX.u.x + v * AX.v.x;
    const y = baseY + u * AX.u.y + v * AX.v.y - 5 * s;
    ctx.fillStyle = cols[i % 4];
    ctx.beginPath();
    ctx.arc(x, y, 2.4 * s, 0, Math.PI * 2);
    ctx.fill();
  }
}

const PAINTERS = {
  player: paintPlayer,
  paper: (ctx, cx, baseY, s) => paintPaper(ctx, cx, baseY - 6 * s, s),
  "house-sub": (c, x, y, s, o) => paintHouse(c, x, y, s, { ...o, subscriber: true }),
  "house-plain": (c, x, y, s, o) => paintHouse(c, x, y, s, { ...o, subscriber: false }),
  mailbox: paintMailbox,
  car: paintCar,
  cone: paintCone,
  bundle: paintBundle,
  dog: paintDog,
  pedestrian: paintPedestrian,
  reaper: paintReaper,
  ramp: paintRamp,
  tree: paintTree,
  hedge: paintHedge,
  lamp: paintLamp,
  hydrant: paintHydrant,
  flowerbed: paintFlowerbed,
};
