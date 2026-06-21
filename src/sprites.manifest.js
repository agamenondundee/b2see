// Sprite manifest — the single place that maps logical sprite keys to art.
//
// To add real artwork later:
//   1. Drop a PNG sprite sheet into /assets (see assets/README.md).
//   2. Set `src` to its path and fill in `frameWidth`/`frameHeight`.
// Until `src` points at a loadable image, the `placeholder` block describes how
// the entity is drawn instead, so nothing is ever invisible.

export const SPRITE_MANIFEST = [
  {
    key: "player",
    src: "assets/player.png", // not present yet -> placeholder used
    frameWidth: 40,
    frameHeight: 56,
    placeholder: { fill: "#ff4d4d", stroke: "#7a0f0f", label: "BOY" },
  },
  {
    key: "paper",
    src: "assets/paper.png",
    frameWidth: 16,
    frameHeight: 10,
    placeholder: { fill: "#f6f1d8", stroke: "#3a3a3a", radius: 2, label: false },
  },
  {
    key: "house-sub",
    src: "assets/house_subscriber.png",
    frameWidth: 96,
    frameHeight: 96,
    placeholder: { fill: "#6ad06a", stroke: "#2f6b2f", label: "SUB" },
  },
  {
    key: "house-plain",
    src: "assets/house_plain.png",
    frameWidth: 96,
    frameHeight: 96,
    placeholder: { fill: "#b6a98f", stroke: "#6b5f48", label: "HOUSE" },
  },
  {
    key: "mailbox",
    src: "assets/mailbox.png",
    frameWidth: 22,
    frameHeight: 22,
    placeholder: { fill: "#ffd23f", stroke: "#8a6d10", radius: 3, label: false },
  },
  {
    key: "car",
    src: "assets/car.png",
    frameWidth: 48,
    frameHeight: 80,
    placeholder: { fill: "#3aa0ff", stroke: "#0f4a7a", label: "CAR" },
  },
  {
    key: "cone",
    src: "assets/cone.png",
    frameWidth: 28,
    frameHeight: 32,
    placeholder: { fill: "#ff8a2a", stroke: "#7a3c0f", label: false },
  },
  {
    key: "bundle",
    src: "assets/bundle.png",
    frameWidth: 28,
    frameHeight: 24,
    placeholder: { fill: "#e8c46a", stroke: "#6b5210", radius: 3, label: "+P" },
  },
  {
    key: "dog",
    src: "assets/dog.png",
    frameWidth: 40,
    frameHeight: 28,
    placeholder: { fill: "#8a5a2b", stroke: "#4a2f12", label: "DOG" },
  },
  {
    key: "pedestrian",
    src: "assets/pedestrian.png",
    frameWidth: 26,
    frameHeight: 52,
    placeholder: { fill: "#3a8d6d", stroke: "#1f4f3a", label: false },
  },
  {
    key: "reaper",
    src: "assets/reaper.png",
    frameWidth: 40,
    frameHeight: 60,
    placeholder: { fill: "#1c1c24", stroke: "#3a0a0a", label: false },
  },
  {
    key: "ramp",
    src: "assets/ramp.png",
    frameWidth: 70,
    frameHeight: 34,
    placeholder: { fill: "#c0863a", stroke: "#6b4a1f", label: false },
  },
];
