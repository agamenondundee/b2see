// Central tuning values for the game. Keeping them here makes balancing easy.

export const VIEW = {
  width: 800,
  height: 600,
};

// The drivable road sits in the middle third of the screen; lawns flank it.
export const ROAD = {
  left: 250,
  right: 550,
  get width() {
    return this.right - this.left;
  },
};

// Lawn target zones where houses (and their delivery targets) live.
export const LAWN = {
  leftEdge: 20,
  leftTargetX: 135, // center x of left-side mailboxes
  rightTargetX: 665, // center x of right-side mailboxes
  rightEdge: 780,
};

export const PLAYER = {
  width: 40,
  height: 56,
  minSpeed: 90, // world scroll px/s
  maxSpeed: 340,
  baseSpeed: 170,
  accel: 220,
  steerSpeed: 260,
  startY: 430, // fixed vertical screen position; the world scrolls past
  startPapers: 12,
  startLives: 3,
};

export const PAPER = {
  width: 16,
  height: 10,
  flightTime: 0.55, // seconds until it lands
  lateralSpeed: 360, // px/s thrown toward a lawn
};

export const SCORING = {
  delivery: 250, // paper landed on a subscriber target
  perfectStreak: 100, // bonus per consecutive delivery
  smashWindow: 75, // hitting a non-subscriber house (classic vandalism points)
  pickupPapers: 0,
};

export const SPAWN = {
  // Distance (world px) between successive house rows and obstacle checks.
  houseRowGap: 220,
  obstacleMinGap: 260,
  obstacleMaxGap: 520,
  pickupChance: 0.18, // chance a house row also drops a paper bundle on the road
  subscriberChance: 0.55,
};

export const COLORS = {
  road: "#4a4a55",
  roadLine: "#d8d24a",
  sidewalk: "#9a9aa6",
  lawn: "#3a7d3a",
  lawnAlt: "#347133",
};
