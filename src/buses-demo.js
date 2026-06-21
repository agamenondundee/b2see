// Realistic demo timetable for Edinburgh Bus Station (St Andrew Square).
//
// Real inter-city operators and routes that depart the bus station, on a
// plausible daily schedule. Generated deterministically per day (stable
// stances/delays) with statuses that evolve in real time, so the Buses tab
// behaves like a live board with zero setup. The live provider (TransportAPI
// via the Worker proxy) replaces this when configured.

import { londonTimeAt, minutesUntil } from './time.js?v=4';
import { STATUS } from './config.js?v=4';

const OPERATORS = {
  SC: 'Scottish Citylink',
  EM: 'Ember',
  MEG: 'Megabus',
  FLX: 'FlixBus',
  NX: 'National Express',
  BB: 'Borders Buses',
  ST: 'Stagecoach',
};

// [hour, minute, operatorCode, destination, service, via]
const TIMETABLE = [
  [6, 0, 'SC', 'Glasgow', '900', 'Buchanan Street'],
  [6, 15, 'EM', 'Dundee', 'E1', 'Halbeath'],
  [6, 30, 'SC', 'Glasgow', '900', 'Buchanan Street'],
  [6, 40, 'ST', 'St Andrews', 'X59', 'Glenrothes'],
  [6, 45, 'SC', 'Aberdeen', 'M90', 'Dundee'],
  [7, 0, 'SC', 'Glasgow', '900', 'Buchanan Street'],
  [7, 10, 'MEG', 'London Victoria', 'M9', 'Newcastle'],
  [7, 15, 'SC', 'Inverness', 'M91', 'Perth'],
  [7, 30, 'SC', 'Glasgow', '900', 'Buchanan Street'],
  [7, 40, 'BB', 'Tweedbank', '51', 'Galashiels'],
  [7, 45, 'FLX', 'Glasgow', 'N532', 'Buchanan Street'],
  [8, 0, 'SC', 'Glasgow', '900', 'Buchanan Street'],
  [8, 5, 'NX', 'London Victoria', '590', 'Milton Keynes'],
  [8, 15, 'EM', 'Dundee', 'E1', 'Halbeath'],
  [8, 30, 'SC', 'Glasgow', '900', 'Buchanan Street'],
  [8, 45, 'SC', 'Aberdeen', 'M90', 'Dundee'],
  [8, 50, 'ST', 'Stirling', 'M9X', 'Falkirk'],
  [9, 0, 'SC', 'Glasgow', '900', 'Buchanan Street'],
  [9, 15, 'BB', 'Peebles', 'X62', 'Penicuik'],
  [9, 30, 'SC', 'Glasgow', '900', 'Buchanan Street'],
  [9, 45, 'MEG', 'Aberdeen', 'M91', 'Dundee'],
  [10, 0, 'SC', 'Glasgow', '900', 'Buchanan Street'],
  [10, 15, 'EM', 'Dundee', 'E1', 'Halbeath'],
  [10, 30, 'SC', 'Glasgow', '900', 'Buchanan Street'],
  [10, 40, 'FLX', 'Newcastle', 'N534', ''],
  [10, 45, 'SC', 'Inverness', 'M91', 'Aviemore'],
  [11, 0, 'SC', 'Glasgow', '900', 'Buchanan Street'],
  [11, 5, 'NX', 'Birmingham', '440', 'Manchester'],
  [11, 30, 'SC', 'Glasgow', '900', 'Buchanan Street'],
  [11, 45, 'ST', 'St Andrews', 'X60', 'Glenrothes'],
  [12, 0, 'SC', 'Glasgow', '900', 'Buchanan Street'],
  [12, 15, 'EM', 'Dundee', 'E1', 'Halbeath'],
  [12, 30, 'SC', 'Aberdeen', 'M90', 'Dundee'],
  [12, 45, 'MEG', 'London Victoria', 'M9', 'Newcastle'],
  [13, 0, 'SC', 'Glasgow', '900', 'Buchanan Street'],
  [13, 30, 'SC', 'Glasgow', '900', 'Buchanan Street'],
  [13, 45, 'BB', 'Carlisle', 'X95', 'Galashiels'],
  [14, 0, 'SC', 'Glasgow', '900', 'Buchanan Street'],
  [14, 15, 'EM', 'Dundee', 'E1', 'Halbeath'],
  [14, 30, 'SC', 'Glasgow', '900', 'Buchanan Street'],
  [14, 45, 'FLX', 'Manchester', 'N536', 'Carlisle'],
  [15, 0, 'SC', 'Glasgow', '900', 'Buchanan Street'],
  [15, 15, 'SC', 'Inverness', 'M91', 'Perth'],
  [15, 30, 'SC', 'Glasgow', '900', 'Buchanan Street'],
  [15, 45, 'SC', 'Aberdeen', 'M90', 'Dundee'],
  [16, 0, 'SC', 'Glasgow', '900', 'Buchanan Street'],
  [16, 30, 'SC', 'Glasgow', '900', 'Buchanan Street'],
  [16, 45, 'NX', 'London Victoria', '590', 'Milton Keynes'],
  [17, 0, 'SC', 'Glasgow', '900', 'Buchanan Street'],
  [17, 15, 'EM', 'Dundee', 'E1', 'Halbeath'],
  [17, 45, 'ST', 'St Andrews', 'X59', 'Glenrothes'],
  [18, 30, 'SC', 'Glasgow', '900', 'Buchanan Street'],
  [19, 0, 'SC', 'Aberdeen', 'M90', 'Dundee'],
  [20, 0, 'SC', 'Glasgow', '900', 'Buchanan Street'],
  [22, 30, 'MEG', 'London Victoria', 'M9', 'Newcastle'],
];

const STANCES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21'];

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

function demoBusStatus(mins, cancelled, delayed) {
  if (cancelled) return STATUS.CANCELLED;
  if (delayed && mins > 2) return STATUS.DELAYED;
  if (mins <= -2) return STATUS.DEPARTED;
  return STATUS.ON_TIME;
}

function buildDay(dayOffset) {
  const dayKey = new Date(londonTimeAt(dayOffset, 12, 0)).toDateString();
  return TIMETABLE.map(([h, m, code, dest, line, via]) => {
    const id = `${dayKey}|${code}${line}|${dest}|${h}:${m}`;
    const rng = mulberry32(hashStr(id));
    const r1 = rng();
    const r2 = rng();
    const r3 = rng();
    const time = londonTimeAt(dayOffset, h, m);

    const cancelled = r2 < 0.03;
    const delayed = !cancelled && r2 < 0.2;
    const delayMin = delayed ? 3 + Math.floor(r3 * 20) : 0;
    const estimated = delayed ? new Date(time.getTime() + delayMin * 60000) : null;

    return {
      id,
      operator: OPERATORS[code] || code,
      operatorCode: code,
      dest,
      via,
      line,
      time,
      estimated,
      stance: STANCES[Math.floor(r1 * STANCES.length)],
      cancelled,
      delayed,
    };
  });
}

export function generateDemoBuses({ pastWindowMin, maxRows }) {
  const all = [...buildDay(0), ...buildDay(1)];
  const now = Date.now();
  const earliest = now - pastWindowMin * 60000;

  return all
    .map((b) => {
      const ref = b.estimated || b.time;
      const status = demoBusStatus(minutesUntil(ref, now), b.cancelled, b.delayed);
      return { ...b, status, stance: status === STATUS.CANCELLED ? null : b.stance };
    })
    .filter((b) => (b.estimated || b.time).getTime() >= earliest)
    .sort((a, b) => a.time - b.time)
    .slice(0, maxRows);
}
