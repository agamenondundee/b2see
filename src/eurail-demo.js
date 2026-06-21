// Realistic demo board for the EU Rail tab.
//
// A plausible pan-European intercity departure board (ICE, TGV, Eurostar,
// Frecciarossa, Railjet, AVE, …). It isn't tied to one station — it's an
// illustrative sample shown when live data (DB transport.rest) is unavailable or
// when Demo is chosen, so the tab always looks alive with zero setup.

import { londonTimeAt, minutesUntil } from './time.js?v=10';
import { STATUS } from './config.js?v=10';

const OPERATORS = {
  DB: 'Deutsche Bahn',
  SNCF: 'SNCF',
  Eurostar: 'Eurostar',
  NS: 'NS',
  SNCB: 'SNCB',
  SBB: 'SBB',
  OBB: 'ÖBB',
  Trenitalia: 'Trenitalia',
  Italo: 'Italo',
  Renfe: 'Renfe',
  CP: 'Comboios de Portugal',
  PKP: 'PKP Intercity',
  CD: 'České dráhy',
  MAV: 'MÁV',
  SJ: 'SJ',
  DSB: 'DSB',
};

// [operatorCode, productPrefix, destination, via]
const SERVICES = [
  ['DB', 'ICE', 'Berlin Hbf', 'Hannover'],
  ['DB', 'ICE', 'München Hbf', 'Nürnberg'],
  ['DB', 'ICE', 'Hamburg Hbf', ''],
  ['DB', 'ICE', 'Frankfurt (Main) Hbf', 'Köln'],
  ['DB', 'ICE', 'Köln Hbf', ''],
  ['DB', 'ICE', 'Amsterdam Centraal', 'Duisburg'],
  ['DB', 'EC', 'Praha hl.n.', 'Dresden'],
  ['DB', 'IC', 'Stuttgart Hbf', ''],
  ['SNCF', 'TGV', 'Paris Gare de Lyon', 'Lyon Part-Dieu'],
  ['SNCF', 'TGV', 'Marseille St-Charles', 'Avignon'],
  ['SNCF', 'TGV', 'Bordeaux St-Jean', ''],
  ['SNCF', 'TGV', 'Strasbourg', ''],
  ['SNCF', 'TGV', 'Lille-Europe', ''],
  ['Eurostar', 'ES', 'Bruxelles-Midi', 'Lille'],
  ['Eurostar', 'ES', 'Amsterdam Centraal', 'Rotterdam'],
  ['Eurostar', 'ES', 'Paris Gare du Nord', ''],
  ['NS', 'IC', 'Amsterdam Centraal', 'Utrecht'],
  ['NS', 'IC', 'Rotterdam Centraal', 'Den Haag'],
  ['SNCB', 'IC', 'Antwerpen-Centraal', 'Mechelen'],
  ['SBB', 'IC', 'Zürich HB', ''],
  ['SBB', 'IC', 'Genève', 'Lausanne'],
  ['SBB', 'EC', 'Milano Centrale', 'Lugano'],
  ['OBB', 'RJ', 'Wien Hbf', 'Linz'],
  ['OBB', 'RJ', 'Salzburg Hbf', ''],
  ['OBB', 'NJ', 'Roma Termini', 'Bologna'],
  ['Trenitalia', 'FR', 'Roma Termini', 'Firenze S. M. Novella'],
  ['Trenitalia', 'FR', 'Napoli Centrale', ''],
  ['Trenitalia', 'FR', 'Torino Porta Nuova', 'Milano Centrale'],
  ['Italo', 'ITA', 'Milano Centrale', 'Bologna'],
  ['Renfe', 'AVE', 'Madrid Atocha', 'Zaragoza'],
  ['Renfe', 'AVE', 'Barcelona Sants', ''],
  ['Renfe', 'AVE', 'Sevilla Santa Justa', 'Córdoba'],
  ['CP', 'AP', 'Lisboa Oriente', 'Coimbra'],
  ['PKP', 'EIP', 'Warszawa Centralna', 'Łódź'],
  ['PKP', 'EIC', 'Kraków Główny', ''],
  ['CD', 'EC', 'Brno hl.n.', 'Pardubice'],
  ['MAV', 'EC', 'Budapest-Keleti', ''],
  ['SJ', 'SJ', 'Göteborg Central', ''],
  ['DSB', 'IC', 'København H', 'Odense'],
  ['DB', 'ICE', 'Wien Hbf', 'München'],
];

const PLATFORMS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14'];

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

function depStatus(mins, cancelled, delayed) {
  if (cancelled) return STATUS.CANCELLED;
  if (delayed && mins > 2) return STATUS.DELAYED;
  if (mins <= -2) return STATUS.DEPARTED;
  return STATUS.ON_TIME;
}
function arrStatus(mins, cancelled, delayed) {
  if (cancelled) return STATUS.CANCELLED;
  if (delayed && mins > 0) return STATUS.DELAYED;
  if (mins <= -3) return STATUS.ARRIVED;
  return STATUS.ON_TIME;
}

// Build a full day's worth of services by looping the pool across 05:05–23:30.
function buildDay(dayOffset) {
  const dayKey = new Date(londonTimeAt(dayOffset, 12, 0)).toDateString();
  const startMin = 5 * 60 + 5;
  const spacing = 16; // minutes between services
  const count = Math.ceil(((23 * 60 + 30) - startMin) / spacing);
  const out = [];
  for (let n = 0; n < count; n++) {
    const [code, prefix, dest, via] = SERVICES[n % SERVICES.length];
    const total = startMin + n * spacing;
    const h = Math.floor(total / 60);
    const m = total % 60;
    const id = `${dayKey}|${code}|${dest}|${h}:${m}`;
    const rng = mulberry32(hashStr(id));
    const r1 = rng();
    const r2 = rng();
    const r3 = rng();
    const num = 100 + Math.floor(r1 * 8900); // service number
    const time = londonTimeAt(dayOffset, h, m);

    const cancelled = r2 < 0.03;
    const delayed = !cancelled && r2 < 0.2;
    const delayMin = delayed ? 3 + Math.floor(r3 * 25) : 0;
    const estimated = delayed ? new Date(time.getTime() + delayMin * 60000) : null;

    out.push({
      id,
      line: `${prefix} ${num}`,
      operator: OPERATORS[code] || code,
      operatorCode: code,
      dest,
      via,
      time,
      estimated,
      platform: PLATFORMS[Math.floor(r3 * PLATFORMS.length)],
      cancelled,
      delayed,
    });
  }
  return out;
}

export function generateEuRail({ pastWindowMin, maxRows }, direction = 'departures') {
  const arrivals = direction === 'arrivals';
  const all = [...buildDay(0), ...buildDay(1)];
  const now = Date.now();
  const earliest = now - pastWindowMin * 60000;

  return all
    .map((t) => {
      const ref = t.estimated || t.time;
      const mins = minutesUntil(ref, now);
      const status = arrivals
        ? arrStatus(mins, t.cancelled, t.delayed)
        : depStatus(mins, t.cancelled, t.delayed);
      return { ...t, status, platform: status === STATUS.CANCELLED ? null : t.platform };
    })
    .filter((t) => (t.estimated || t.time).getTime() >= earliest)
    .sort((a, b) => a.time - b.time)
    .slice(0, maxRows);
}
