// Realistic demo timetable for Edinburgh Airport (EDI).
//
// Real airlines and destinations that EDI actually serves, on a plausible daily
// schedule. The board is generated deterministically per calendar day (stable
// gates/delays), but statuses evolve in real time so it behaves like a live
// board with zero configuration. Switch to the live AeroDataBox provider in
// Settings for real data.

import { londonTimeAt, minutesUntil } from './time.js?v=4';
import { STATUS } from './config.js?v=4';

const AIRLINES = {
  U2: 'easyJet',
  FR: 'Ryanair',
  LS: 'Jet2',
  BA: 'British Airways',
  KL: 'KLM',
  LH: 'Lufthansa',
  AF: 'Air France',
  EI: 'Aer Lingus',
  EK: 'Emirates',
  QR: 'Qatar Airways',
  UA: 'United Airlines',
  B6: 'JetBlue',
  DL: 'Delta Air Lines',
  LM: 'Loganair',
  W6: 'Wizz Air',
  BY: 'TUI Airways',
  SK: 'SAS',
  LX: 'Swiss',
  FI: 'Icelandair',
  OG: 'Play',
  VY: 'Vueling',
  TP: 'TAP Air Portugal',
  EW: 'Eurowings',
  AY: 'Finnair',
  DY: 'Norwegian',
  AC: 'Air Canada',
  WS: 'WestJet',
};

// [hour, minute, airlineCode, flightNumber, destination, iata]
const TIMETABLE = [
  [6, 0, 'BA', '1447', 'London Heathrow', 'LHR'],
  [6, 5, 'KL', '1278', 'Amsterdam', 'AMS'],
  [6, 10, 'U2', '6201', 'London Gatwick', 'LGW'],
  [6, 15, 'FR', '812', 'Dublin', 'DUB'],
  [6, 25, 'LS', '821', 'Alicante', 'ALC'],
  [6, 35, 'AF', '1487', 'Paris Charles de Gaulle', 'CDG'],
  [6, 40, 'LH', '971', 'Frankfurt', 'FRA'],
  [6, 45, 'U2', '6021', 'Bristol', 'BRS'],
  [6, 55, 'LX', '465', 'Zurich', 'ZRH'],
  [7, 0, 'BA', '1431', 'London Heathrow', 'LHR'],
  [7, 10, 'EI', '3251', 'Dublin', 'DUB'],
  [7, 15, 'LM', '262', 'Kirkwall', 'KOI'],
  [7, 20, 'U2', '883', 'Belfast', 'BFS'],
  [7, 30, 'LH', '7', 'Munich', 'MUC'],
  [7, 40, 'B6', '1602', 'Boston', 'BOS'],
  [7, 45, 'FR', '6543', 'Krakow', 'KRK'],
  [7, 55, 'BA', '8702', 'London City', 'LCY'],
  [8, 5, 'KL', '1280', 'Amsterdam', 'AMS'],
  [8, 15, 'U2', '6023', 'London Luton', 'LTN'],
  [8, 25, 'SK', '4760', 'Copenhagen', 'CPH'],
  [8, 35, 'LS', '301', 'Malaga', 'AGP'],
  [8, 45, 'UA', '163', 'New York Newark', 'EWR'],
  [8, 55, 'DY', '1545', 'Oslo', 'OSL'],
  [9, 5, 'BA', '1437', 'London Heathrow', 'LHR'],
  [9, 15, 'AY', '1342', 'Helsinki', 'HEL'],
  [9, 30, 'DL', '209', 'New York JFK', 'JFK'],
  [9, 40, 'QR', '28', 'Doha', 'DOH'],
  [9, 50, 'VY', '8911', 'Barcelona', 'BCN'],
  [10, 0, 'AC', '895', 'Toronto', 'YYZ'],
  [10, 15, 'FR', '2145', 'Faro', 'FAO'],
  [10, 30, 'TP', '1303', 'Lisbon', 'LIS'],
  [10, 45, 'EW', '9319', 'Dusseldorf', 'DUS'],
  [11, 0, 'BA', '1441', 'London Heathrow', 'LHR'],
  [11, 20, 'U2', '6205', 'London Gatwick', 'LGW'],
  [11, 40, 'LM', '672', 'Sumburgh', 'LSI'],
  [12, 5, 'KL', '1282', 'Amsterdam', 'AMS'],
  [12, 30, 'LS', '561', 'Tenerife', 'TFS'],
  [12, 55, 'FI', '442', 'Reykjavik', 'KEF'],
  [13, 15, 'W6', '5403', 'Warsaw', 'WAW'],
  [13, 40, 'BA', '1449', 'London Heathrow', 'LHR'],
  [14, 10, 'U2', '6033', 'Geneva', 'GVA'],
  [14, 25, 'EK', '24', 'Dubai', 'DXB'],
  [14, 50, 'FR', '34', 'Dublin', 'DUB'],
  [15, 20, 'AF', '1687', 'Paris Charles de Gaulle', 'CDG'],
  [15, 45, 'OG', '751', 'Reykjavik', 'KEF'],
  [16, 10, 'KL', '1284', 'Amsterdam', 'AMS'],
  [16, 40, 'BA', '1453', 'London Heathrow', 'LHR'],
  [17, 0, 'B6', '44', 'New York JFK', 'JFK'],
  [17, 25, 'LH', '973', 'Frankfurt', 'FRA'],
  [17, 55, 'LS', '739', 'Palma', 'PMI'],
  [18, 20, 'U2', '6207', 'London Gatwick', 'LGW'],
  [18, 50, 'EI', '3259', 'Dublin', 'DUB'],
  [19, 15, 'BA', '1459', 'London Heathrow', 'LHR'],
  [19, 45, 'KL', '1286', 'Amsterdam', 'AMS'],
  [20, 10, 'FR', '7821', 'Gdansk', 'GDN'],
  [20, 40, 'LS', '983', 'Antalya', 'AYT'],
  [21, 10, 'U2', '6209', 'London Gatwick', 'LGW'],
  [21, 35, 'BY', '5642', 'Lanzarote', 'ACE'],
];

const GATES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '15', '16', '18', '20', '21', '24', '26'];

// Tiny deterministic PRNG so a given day always yields the same gates/delays.
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

// Derive an evolving status from how long until departure (demo only).
function demoStatus(mins, rng, cancelled, delayed) {
  if (cancelled) return STATUS.CANCELLED;
  if (delayed && mins > 5) return STATUS.DELAYED;
  if (mins > 75) return STATUS.SCHEDULED;
  if (mins > 45) return rng > 0.5 ? STATUS.CHECKIN : STATUS.SCHEDULED;
  if (mins > 25) return STATUS.BOARDING;
  if (mins > 12) return STATUS.GATE;
  if (mins > 3) return STATUS.GATE_CLOSING;
  if (mins > -3) return STATUS.FINAL;
  return STATUS.DEPARTED;
}

// Build one day's worth of flights as absolute instants.
function buildDay(dayOffset) {
  const dayKey = new Date(londonTimeAt(dayOffset, 12, 0)).toDateString();
  return TIMETABLE.map(([h, m, code, no, dest, iata]) => {
    const id = `${dayKey}|${code}${no}|${h}:${m}`;
    const rng = mulberry32(hashStr(id));
    const r1 = rng();
    const r2 = rng();
    const r3 = rng();
    // Jitter the published time by a couple of minutes for daily variety.
    const jitter = Math.round((r1 - 0.5) * 6);
    const time = londonTimeAt(dayOffset, h, m + jitter);

    const cancelled = r2 < 0.04; // ~4% cancelled
    const delayed = !cancelled && r2 < 0.22; // ~18% delayed
    const delayMin = delayed ? 15 + Math.floor(r3 * 70) : 0;
    const estimated = delayed ? new Date(time.getTime() + delayMin * 60000) : null;

    return {
      id,
      flightNo: `${code}${no}`,
      airline: AIRLINES[code] || code,
      airlineCode: code,
      dest,
      destIata: iata,
      time,
      estimated,
      gate: GATES[Math.floor(r3 * GATES.length)],
      cancelled,
      delayed,
      _rng: r1,
    };
  });
}

// Public: a live-feeling list of upcoming departures for the demo provider.
export function generateDemoDepartures({ pastWindowMin, maxRows }) {
  const all = [...buildDay(0), ...buildDay(1)];
  const now = Date.now();
  const earliest = now - pastWindowMin * 60000;

  return all
    .map((f) => {
      const ref = f.estimated || f.time;
      const status = demoStatus(minutesUntil(ref, now), f._rng, f.cancelled, f.delayed);
      // Cancelled flights keep their published gate hidden.
      return { ...f, status, gate: status === STATUS.CANCELLED ? null : f.gate };
    })
    .filter((f) => (f.estimated || f.time).getTime() >= earliest)
    .sort((a, b) => a.time - b.time)
    .slice(0, maxRows);
}
