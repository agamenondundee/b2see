// Day/night cycle. A phase in [0,1) is interpolated through keyframed palettes
// (day -> dusk -> night -> dawn -> day) to produce sky, haze, tint and star
// values used by the sky renderer and the world tint overlay.

const STOPS = [
  // phase, skyTop, skyBot, haze(rgba), tint(rgba over world), stars 0..1, sun 0..1
  { p: 0.0, top: "#6db8e8", bot: "#cdeaf6", haze: "rgba(170,210,230,0.45)", tint: "rgba(255,250,230,0.0)", stars: 0, sun: 1 },
  { p: 0.25, top: "#f0a25a", bot: "#ffe0b0", haze: "rgba(245,190,140,0.42)", tint: "rgba(255,150,70,0.14)", stars: 0, sun: 0.5 },
  { p: 0.42, top: "#1a2148", bot: "#46507e", haze: "rgba(60,70,110,0.5)", tint: "rgba(30,40,90,0.32)", stars: 1, sun: 0 },
  { p: 0.6, top: "#0e1430", bot: "#2a3a66", haze: "rgba(40,52,96,0.52)", tint: "rgba(20,30,80,0.38)", stars: 1, sun: 0 },
  { p: 0.8, top: "#5566a4", bot: "#ffc6a6", haze: "rgba(180,170,205,0.42)", tint: "rgba(120,120,200,0.16)", stars: 0.3, sun: 0.4 },
  { p: 1.0, top: "#6db8e8", bot: "#cdeaf6", haze: "rgba(170,210,230,0.45)", tint: "rgba(255,250,230,0.0)", stars: 0, sun: 1 },
];

function lerp(a, b, t) {
  return a + (b - a) * t;
}
function rgba(a, b, t) {
  const pa = a.match(/[\d.]+/g).map(Number);
  const pb = b.match(/[\d.]+/g).map(Number);
  return `rgba(${Math.round(lerp(pa[0], pb[0], t))},${Math.round(lerp(pa[1], pb[1], t))},${Math.round(
    lerp(pa[2], pb[2], t),
  )},${lerp(pa[3] ?? 1, pb[3] ?? 1, t).toFixed(3)})`;
}
function hex(a, b, t) {
  const pa = h2(a);
  const pb = h2(b);
  return `rgb(${Math.round(lerp(pa[0], pb[0], t))},${Math.round(lerp(pa[1], pb[1], t))},${Math.round(
    lerp(pa[2], pb[2], t),
  )})`;
}
function h2(s) {
  const n = parseInt(s.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function atmosphere(phase) {
  const p = ((phase % 1) + 1) % 1;
  let i = 0;
  while (i < STOPS.length - 1 && p > STOPS[i + 1].p) i++;
  const a = STOPS[i];
  const b = STOPS[i + 1];
  const t = (p - a.p) / (b.p - a.p || 1);
  return {
    phase: p,
    skyTop: hex(a.top, b.top, t),
    skyBot: hex(a.bot, b.bot, t),
    haze: rgba(a.haze, b.haze, t),
    tint: rgba(a.tint, b.tint, t),
    stars: lerp(a.stars, b.stars, t),
    sun: lerp(a.sun, b.sun, t),
    night: lerp(a.stars, b.stars, t), // alias: 0 day .. 1 night
  };
}
