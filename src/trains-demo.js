// Realistic demo timetable for Edinburgh Waverley (EDB).
//
// Real operators and destinations Waverley actually serves, on a plausible daily
// schedule. Generated deterministically per day (stable platforms/delays) but
// statuses evolve in real time, so the Trains tab behaves like a live board with
// zero setup. The live provider (Huxley/Darwin) replaces this when reachable.

import { londonTimeAt, minutesUntil } from './time.js?v=6';
import { STATUS } from './config.js?v=6';

const OPERATORS = {
  SR: 'ScotRail',
  GR: 'LNER',
  XC: 'CrossCountry',
  VT: 'Avanti West Coast',
  TP: 'TransPennine Express',
  LD: 'Lumo',
  CS: 'Caledonian Sleeper',
};

// [hour, minute, operatorCode, destination, via]
const TIMETABLE = [
  [5, 41, 'SR', 'Glasgow Queen Street', ''],
  [6, 0, 'SR', 'Glasgow Queen Street', ''],
  [6, 13, 'SR', 'Dunblane', 'Stirling'],
  [6, 15, 'SR', 'Glasgow Queen Street', ''],
  [6, 22, 'SR', 'North Berwick', ''],
  [6, 30, 'SR', 'Glasgow Queen Street', ''],
  [6, 38, 'SR', 'Cardenden', 'Kirkcaldy'],
  [6, 45, 'SR', 'Glasgow Queen Street', ''],
  [6, 48, 'SR', 'Tweedbank', 'Galashiels'],
  [6, 52, 'GR', 'London Kings Cross', 'Newcastle'],
  [7, 0, 'SR', 'Glasgow Queen Street', ''],
  [7, 5, 'XC', 'Plymouth', 'Birmingham New Street'],
  [7, 13, 'SR', 'Perth', ''],
  [7, 15, 'SR', 'Glasgow Queen Street', ''],
  [7, 18, 'SR', 'Bathgate', ''],
  [7, 22, 'SR', 'Glenrothes with Thornton', 'Kirkcaldy'],
  [7, 30, 'SR', 'Glasgow Central', 'Shotts'],
  [7, 33, 'TP', 'Manchester Airport', 'Newcastle'],
  [7, 40, 'LD', 'London Kings Cross', 'Morpeth'],
  [7, 45, 'SR', 'Glasgow Queen Street', ''],
  [7, 48, 'SR', 'Aberdeen', 'Dundee'],
  [8, 0, 'GR', 'London Kings Cross', 'York'],
  [8, 6, 'SR', 'North Berwick', ''],
  [8, 13, 'SR', 'Inverness', 'Perth'],
  [8, 15, 'SR', 'Glasgow Queen Street', ''],
  [8, 30, 'SR', 'Glasgow Queen Street', ''],
  [8, 33, 'XC', 'Newcastle', ''],
  [8, 45, 'SR', 'Glasgow Queen Street', ''],
  [8, 48, 'VT', 'London Euston', 'Carlisle'],
  [9, 0, 'SR', 'Glasgow Queen Street', ''],
  [9, 8, 'SR', 'Dunblane', 'Stirling'],
  [9, 14, 'GR', 'London Kings Cross', 'Newcastle'],
  [9, 22, 'SR', 'Cowdenbeath', ''],
  [9, 30, 'SR', 'Glasgow Central', 'Carstairs'],
  [9, 33, 'TP', 'Liverpool Lime Street', 'Manchester'],
  [9, 48, 'SR', 'Aberdeen', 'Leuchars'],
  [10, 0, 'SR', 'Glasgow Queen Street', ''],
  [10, 13, 'SR', 'Tweedbank', 'Galashiels'],
  [10, 30, 'XC', 'Birmingham New Street', 'York'],
  [10, 40, 'LD', 'London Kings Cross', ''],
  [11, 0, 'SR', 'Glasgow Queen Street', ''],
  [11, 14, 'GR', 'London Kings Cross', 'Newcastle'],
  [11, 30, 'SR', 'Glasgow Queen Street', ''],
  [12, 13, 'SR', 'Inverness', 'Aviemore'],
  [12, 30, 'SR', 'Glasgow Central', 'Shotts'],
  [13, 0, 'SR', 'Glasgow Queen Street', ''],
  [13, 33, 'TP', 'Manchester Airport', 'York'],
  [14, 14, 'GR', 'London Kings Cross', 'Newcastle'],
  [15, 30, 'SR', 'Aberdeen', 'Dundee'],
  [16, 0, 'SR', 'Glasgow Queen Street', ''],
  [16, 48, 'XC', 'Plymouth', 'Birmingham New Street'],
  [17, 14, 'GR', 'London Kings Cross', 'Newcastle'],
  [17, 40, 'LD', 'London Kings Cross', ''],
  [18, 30, 'SR', 'Glasgow Queen Street', ''],
  [19, 48, 'SR', 'Inverness', 'Perth'],
  [21, 0, 'SR', 'Glasgow Queen Street', ''],
  [23, 40, 'CS', 'London Euston', 'Carstairs'],
];

const PLATFORMS = ['2', '4', '7', '8', '9', '10', '11', '12', '14', '17', '18', '19', '20'];

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function demoTrainStatus(mins, cancelled, delayed) {
  if (cancelled) return STATUS.CANCELLED;
  if (delayed && mins > 2) return STATUS.DELAYED;
  if (mins <= -2) return STATUS.DEPARTED;
  return STATUS.ON_TIME;
}

function arrTrainStatus(mins, cancelled, delayed) {
  if (cancelled) return STATUS.CANCELLED;
  if (delayed && mins > 0) return STATUS.DELAYED;
  if (mins <= -3) return STATUS.ARRIVED;
  return STATUS.ON_TIME;
}

function buildDay(dayOffset) {
  const dayKey = new Date(londonTimeAt(dayOffset, 12, 0)).toDateString();
  return TIMETABLE.map(([h, m, code, dest, via]) => {
    const id = `${dayKey}|${code}|${dest}|${h}:${m}`;
    const rng = mulberry32(hashStr(id));
    const r1 = rng();
    const r2 = rng();
    const r3 = rng();
    const time = londonTimeAt(dayOffset, h, m);

    const cancelled = r2 < 0.03;
    const delayed = !cancelled && r2 < 0.18;
    const delayMin = delayed ? 2 + Math.floor(r3 * 18) : 0;
    const estimated = delayed ? new Date(time.getTime() + delayMin * 60000) : null;

    return {
      id,
      operator: OPERATORS[code] || code,
      operatorCode: code,
      dest,
      via,
      time,
      estimated,
      platform: PLATFORMS[Math.floor(r1 * PLATFORMS.length)],
      cancelled,
      delayed,
    };
  });
}

export function generateDemoTrains({ pastWindowMin, maxRows }, direction = 'departures') {
  const arrivals = direction === 'arrivals';
  const all = [...buildDay(0), ...buildDay(1)];
  const now = Date.now();
  const earliest = now - pastWindowMin * 60000;

  return all
    .map((t) => {
      const ref = t.estimated || t.time;
      const mins = minutesUntil(ref, now);
      const status = arrivals
        ? arrTrainStatus(mins, t.cancelled, t.delayed)
        : demoTrainStatus(mins, t.cancelled, t.delayed);
      return { ...t, status, platform: status === STATUS.CANCELLED ? null : t.platform };
    })
    .filter((t) => (t.estimated || t.time).getTime() >= earliest)
    .sort((a, b) => a.time - b.time)
    .slice(0, maxRows);
}
