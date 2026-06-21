// Central tuning values. The world is modelled in 2D ground coordinates:
//   u = lateral position across the street (0 = far-left lawn edge)
//   v = forward distance travelled along the route (increases into the screen)
// An isometric projection (see iso.js) maps (u, v) to the screen, giving the
// diagonal Paperboy look. Gameplay/collisions stay in clean (u, v) space.

export const VIEW = {
  width: 800,
  height: 600,
};

// Lateral layout of the street, in world units.
export const STREET = {
  width: 600,
  roadLeft: 225,
  roadRight: 375,
  get roadMid() {
    return (this.roadLeft + this.roadRight) / 2;
  },
  leftTargetU: 140, // mailbox / house target lane, left side
  rightTargetU: 460, // right side
  leftHouseU: 95,
  rightHouseU: 505,
};

// Isometric projection parameters. Tuned so the route runs diagonally up-right.
export const ISO = {
  originX: 250,
  originY: 430,
  uMid: 300, // world u that maps to originX
  sx: 0.66, // screen-x per lateral unit
  sy: 0.33, // screen-y per lateral unit (2:1 iso)
  vx: 0.34, // screen-x per forward unit
  vy: 0.52, // screen-y per forward unit (negated: forward goes up)
  depthShrink: 0.00018, // mild far-shrink for depth readability
};

export const PLAYER = {
  w: 38,
  h: 54,
  relV: 150, // how far ahead of the camera the player sits
  minSpeed: 110,
  maxSpeed: 380,
  baseSpeed: 200,
  accel: 260,
  steerSpeed: 230, // lateral world units / s
  startPapers: 12,
  startLives: 3,
};

export const PAPER = {
  w: 16,
  h: 12,
  flightTime: 0.5,
  lateralSpeed: 420, // world u/s toward a lawn
};

export const SCORING = {
  delivery: 250,
  perfectStreak: 100,
  smashWindow: 75,
  dogDodge: 0,
  routeBonus: 1000, // for finishing a street
  bmxGate: 150,
  bmxFinish: 2000,
};

export const SPAWN = {
  houseRowGap: 240, // world v between house rows
  obstacleMinGap: 220,
  obstacleMaxGap: 460,
  hazardChance: 0.5, // chance an obstacle slot is a moving hazard
  pickupChance: 0.2,
  subscriberChance: 0.55,
};

// A street is this many world units long before the tally + BMX bonus.
export const ROUTE = {
  length: 4200,
  bmxLength: 3000,
};

export const COLORS = {
  road: "#55555f",
  roadEdge: "#3c3c45",
  roadLine: "#e8d24a",
  sidewalk: "#a7a7b2",
  lawn: "#3f8a3f",
  lawnAlt: "#388038",
  sky: "#8fd0e8",
};
