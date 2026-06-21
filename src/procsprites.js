// Procedural artwork. Every entity is drawn here as an upright "billboard"
// sprite anchored at its ground point (baseY = where it touches the ground,
// cx = horizontal centre). These give the game real-looking graphics with no
// external image files. If a real PNG is later loaded for a key it is used
// instead (see drawSprite dispatch + assets.js).

import { assets } from "./assets.js";
import { roundRect } from "./assets.js";

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
};

// Single entry point used by every entity's draw(). Prefers a loaded image,
// otherwise dispatches to the procedural painter below.
export function drawSprite(ctx, key, cx, baseY, scale, opts = {}, frame = 0) {
  const sheet = assets.get(key);
  if (sheet && sheet.loaded && sheet.frameWidth) {
    const [nw, nh] = NOMINAL[key] ?? [sheet.frameWidth, sheet.frameHeight];
    const w = nw * scale;
    const h = nh * scale;
    assets.draw(ctx, key, cx, baseY - h / 2, w, h, frame);
    return;
  }
  const fn = PAINTERS[key];
  if (fn) fn(ctx, cx, baseY, scale, opts, frame);
}

function shadow(ctx, cx, baseY, w) {
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(cx, baseY, w * 0.55, w * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
}

function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

// ---- Player: BMX rider --------------------------------------------------
function paintPlayer(ctx, cx, baseY, scale, opts, frame) {
  const s = scale;
  shadow(ctx, cx, baseY, 34 * s);
  ctx.save();
  ctx.translate(cx, baseY);
  if (opts.facing === "left") ctx.scale(-1, 1);
  ctx.scale(s, s);

  const spin = frame % 2 === 0 ? 0 : Math.PI / 4;
  // Wheels.
  for (const wx of [-13, 13]) {
    ctx.strokeStyle = "#1a1a1f";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(wx, -9, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "#cfcfd6";
    ctx.lineWidth = 1;
    for (let a = 0; a < 4; a++) {
      const ang = spin + (a * Math.PI) / 2;
      ctx.beginPath();
      ctx.moveTo(wx, -9);
      ctx.lineTo(wx + Math.cos(ang) * 7, -9 + Math.sin(ang) * 7);
      ctx.stroke();
    }
  }
  // Frame.
  ctx.strokeStyle = "#d92b2b";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-13, -9);
  ctx.lineTo(2, -9);
  ctx.lineTo(-2, -22);
  ctx.lineTo(-13, -9);
  ctx.moveTo(2, -9);
  ctx.lineTo(13, -9);
  ctx.lineTo(9, -24); // handlebar stem
  ctx.stroke();
  // Rider legs.
  ctx.strokeStyle = "#2b59d9";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-2, -22);
  ctx.lineTo(0, -12);
  ctx.moveTo(-2, -22);
  ctx.lineTo(-5, -11);
  ctx.stroke();
  // Torso (jersey).
  ctx.strokeStyle = "#ffd23f";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(-2, -22);
  ctx.lineTo(4, -36);
  ctx.stroke();
  // Arm to handlebar.
  ctx.strokeStyle = "#e0a070";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(4, -34);
  ctx.lineTo(9, -24);
  ctx.stroke();
  // Head + helmet.
  ctx.fillStyle = "#e0a070";
  ctx.beginPath();
  ctx.arc(5, -40, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#d92b2b";
  ctx.beginPath();
  ctx.arc(5, -42, 5.5, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ---- Paper --------------------------------------------------------------
function paintPaper(ctx, cx, cy, scale) {
  const s = scale;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(0.3);
  rect(ctx, -8 * s, -6 * s, 16 * s, 12 * s, "#f4efda");
  ctx.strokeStyle = "#b34a2b";
  ctx.lineWidth = Math.max(1, 2 * s);
  ctx.beginPath();
  ctx.moveTo(-8 * s, 0);
  ctx.lineTo(8 * s, 0);
  ctx.stroke();
  ctx.restore();
}

// ---- Houses -------------------------------------------------------------
function paintHouse(ctx, cx, baseY, scale, opts) {
  const sub = opts.subscriber;
  const s = scale;
  const w = 100 * s;
  const h = 78 * s;
  const x = cx - w / 2;
  const y = baseY - h;
  shadow(ctx, cx, baseY, w * 0.6);

  // Body.
  rect(ctx, x, y, w, h, sub ? "#e8d6a8" : "#c9bfae");
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);

  // Roof.
  ctx.fillStyle = sub ? "#c0392b" : "#7a6f5f";
  ctx.beginPath();
  ctx.moveTo(x - 6 * s, y);
  ctx.lineTo(cx, y - 34 * s);
  ctx.lineTo(x + w + 6 * s, y);
  ctx.closePath();
  ctx.fill();

  // Door.
  const dw = 22 * s;
  rect(ctx, cx - dw / 2, baseY - 40 * s, dw, 40 * s, sub ? "#5a3a1a" : "#4a4036");
  // Windows — lit for subscribers.
  const lit = sub ? "#ffe9a8" : "#9fb0b8";
  for (const wx of [x + 16 * s, x + w - 16 * s - 18 * s]) {
    rect(ctx, wx, y + 16 * s, 18 * s, 18 * s, lit);
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.strokeRect(wx, y + 16 * s, 18 * s, 18 * s);
  }
  if (opts.delivered) {
    // A delivered paper on the porch.
    paintPaper(ctx, cx + dw, baseY - 4 * s, s * 0.9);
  }
}

// ---- Mailbox ------------------------------------------------------------
function paintMailbox(ctx, cx, baseY, scale, opts) {
  const s = scale;
  shadow(ctx, cx, baseY, 14 * s);
  rect(ctx, cx - 1.5 * s, baseY - 24 * s, 3 * s, 24 * s, "#6b5236"); // post
  ctx.fillStyle = opts.subscriber ? "#ffd23f" : "#9a9aa6";
  roundRect(ctx, cx - 9 * s, baseY - 34 * s, 18 * s, 12 * s, 4 * s);
  ctx.fill();
  // Flag (up when a subscriber still needs delivery).
  ctx.fillStyle = "#d92b2b";
  if (opts.flagUp) rect(ctx, cx + 8 * s, baseY - 34 * s, 4 * s, 8 * s, "#d92b2b");
  else rect(ctx, cx + 8 * s, baseY - 28 * s, 4 * s, 8 * s, "#7a1414");
}

// ---- Car ----------------------------------------------------------------
function paintCar(ctx, cx, baseY, scale, opts) {
  const s = scale;
  const w = 42 * s;
  const h = 64 * s;
  const x = cx - w / 2;
  const y = baseY - h;
  shadow(ctx, cx, baseY, w * 0.7);
  // Wheels.
  rect(ctx, x - 3 * s, y + 12 * s, 5 * s, 16 * s, "#15151a");
  rect(ctx, x + w - 2 * s, y + 12 * s, 5 * s, 16 * s, "#15151a");
  rect(ctx, x - 3 * s, y + h - 26 * s, 5 * s, 16 * s, "#15151a");
  rect(ctx, x + w - 2 * s, y + h - 26 * s, 5 * s, 16 * s, "#15151a");
  // Body.
  ctx.fillStyle = opts.color ?? "#2e8be0";
  roundRect(ctx, x, y, w, h, 9 * s);
  ctx.fill();
  // Roof / cabin.
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  roundRect(ctx, x + 5 * s, y + 16 * s, w - 10 * s, h - 32 * s, 6 * s);
  ctx.fill();
  // Windshield + lights.
  rect(ctx, x + 7 * s, y + 6 * s, w - 14 * s, 9 * s, "#bfe6ff");
  rect(ctx, x + 4 * s, y + 2 * s, 7 * s, 4 * s, "#fff3b0");
  rect(ctx, x + w - 11 * s, y + 2 * s, 7 * s, 4 * s, "#fff3b0");
}

// ---- Cone ---------------------------------------------------------------
function paintCone(ctx, cx, baseY, scale) {
  const s = scale;
  shadow(ctx, cx, baseY, 14 * s);
  ctx.fillStyle = "#ff7a1a";
  ctx.beginPath();
  ctx.moveTo(cx, baseY - 30 * s);
  ctx.lineTo(cx + 11 * s, baseY);
  ctx.lineTo(cx - 11 * s, baseY);
  ctx.closePath();
  ctx.fill();
  rect(ctx, cx - 8 * s, baseY - 16 * s, 16 * s, 5 * s, "#f4f4f8");
  rect(ctx, cx - 13 * s, baseY - 4 * s, 26 * s, 4 * s, "#d85f10");
}

// ---- Paper bundle -------------------------------------------------------
function paintBundle(ctx, cx, baseY, scale) {
  const s = scale;
  shadow(ctx, cx, baseY, 16 * s);
  rect(ctx, cx - 14 * s, baseY - 18 * s, 28 * s, 16 * s, "#e8c46a");
  rect(ctx, cx - 14 * s, baseY - 22 * s, 28 * s, 6 * s, "#f4efda");
  ctx.strokeStyle = "#8a1f1f";
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.moveTo(cx, baseY - 24 * s);
  ctx.lineTo(cx, baseY - 2 * s);
  ctx.stroke();
}

// ---- Dog (hazard) -------------------------------------------------------
function paintDog(ctx, cx, baseY, scale, opts, frame) {
  const s = scale;
  shadow(ctx, cx, baseY, 18 * s);
  ctx.save();
  ctx.translate(cx, baseY);
  if (opts.facing === "left") ctx.scale(-1, 1);
  ctx.fillStyle = "#8a5a2b";
  roundRect(ctx, -14 * s, -16 * s, 26 * s, 11 * s, 5 * s); // body
  ctx.fill();
  ctx.beginPath();
  ctx.arc(13 * s, -16 * s, 6 * s, 0, Math.PI * 2); // head
  ctx.fill();
  rect(ctx, 15 * s, -22 * s, 4 * s, 4 * s, "#6b4420"); // ear
  // Legs (animate).
  const sw = frame % 2 === 0 ? 3 * s : -3 * s;
  ctx.strokeStyle = "#6b4420";
  ctx.lineWidth = 3 * s;
  for (const lx of [-10 * s, 8 * s]) {
    ctx.beginPath();
    ctx.moveTo(lx, -6 * s);
    ctx.lineTo(lx + sw, 0);
    ctx.stroke();
  }
  ctx.restore();
}

// ---- Pedestrian (hazard) ------------------------------------------------
function paintPedestrian(ctx, cx, baseY, scale, opts, frame) {
  const s = scale;
  shadow(ctx, cx, baseY, 14 * s);
  ctx.save();
  ctx.translate(cx, baseY);
  // Legs.
  const sw = frame % 2 === 0 ? 4 * s : -4 * s;
  ctx.strokeStyle = "#34343f";
  ctx.lineWidth = 4 * s;
  ctx.beginPath();
  ctx.moveTo(0, -20 * s);
  ctx.lineTo(sw, 0);
  ctx.moveTo(0, -20 * s);
  ctx.lineTo(-sw, 0);
  ctx.stroke();
  // Body.
  ctx.strokeStyle = opts.color ?? "#3a8d6d";
  ctx.lineWidth = 8 * s;
  ctx.beginPath();
  ctx.moveTo(0, -20 * s);
  ctx.lineTo(0, -38 * s);
  ctx.stroke();
  // Head.
  ctx.fillStyle = "#e0a070";
  ctx.beginPath();
  ctx.arc(0, -44 * s, 6 * s, 0, Math.PI * 2);
  ctx.fill();
}

// ---- Grim Reaper (hazard) ----------------------------------------------
function paintReaper(ctx, cx, baseY, scale, opts, frame) {
  const s = scale;
  shadow(ctx, cx, baseY, 18 * s);
  // Cloak.
  ctx.fillStyle = "#1c1c24";
  ctx.beginPath();
  ctx.moveTo(cx, baseY - 56 * s);
  ctx.lineTo(cx + 16 * s, baseY);
  ctx.lineTo(cx - 16 * s, baseY);
  ctx.closePath();
  ctx.fill();
  // Hood opening + glowing eyes.
  ctx.fillStyle = "#3a0a0a";
  ctx.beginPath();
  ctx.arc(cx, baseY - 46 * s, 8 * s, 0, Math.PI * 2);
  ctx.fill();
  const glow = frame % 2 === 0 ? "#ff3b3b" : "#ff8888";
  ctx.fillStyle = glow;
  ctx.fillRect(cx - 4 * s, baseY - 48 * s, 3 * s, 3 * s);
  ctx.fillRect(cx + 1 * s, baseY - 48 * s, 3 * s, 3 * s);
  // Scythe.
  ctx.strokeStyle = "#7a5a2a";
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.moveTo(cx + 14 * s, baseY - 56 * s);
  ctx.lineTo(cx + 14 * s, baseY - 6 * s);
  ctx.stroke();
  ctx.strokeStyle = "#dcdce4";
  ctx.lineWidth = 3 * s;
  ctx.beginPath();
  ctx.arc(cx + 10 * s, baseY - 54 * s, 8 * s, -0.4, 1.4);
  ctx.stroke();
}

// ---- BMX ramp -----------------------------------------------------------
function paintRamp(ctx, cx, baseY, scale) {
  const s = scale;
  const w = 64 * s;
  shadow(ctx, cx, baseY, w * 0.6);
  ctx.fillStyle = "#c0863a";
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, baseY);
  ctx.lineTo(cx + w / 2, baseY);
  ctx.lineTo(cx + w / 2, baseY - 26 * s);
  ctx.quadraticCurveTo(cx, baseY - 8 * s, cx - w / 2, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#e8d24a";
  for (let i = -1; i <= 1; i++) rect(ctx, cx + i * 16 * s, baseY - 14 * s, 8 * s, 4 * s, "#e8d24a");
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
};
