// Data providers. Each exposes async fetchDepartures(opts) -> Flight[] using a
// single normalized shape so the UI never cares where the data came from:
//
//   { id, flightNo, airline, airlineCode, dest, destIata,
//     time: Date, estimated: Date|null, gate: string|null,
//     status: {key,label}, codeshare: boolean }

import { AERODATABOX, HUXLEY, DBREST, STATUS } from './config.js?v=10';
import { fmtLocalApi, parseLondonClock } from './time.js?v=10';
import { generateDemoDepartures } from './demo-data.js?v=10';
import { generateDemoTrains } from './trains-demo.js?v=10';
import { generateDemoBuses } from './buses-demo.js?v=10';
import { generateEuRail } from './eurail-demo.js?v=10';

// ---- Demo provider -------------------------------------------------------

export const demoProvider = {
  id: 'demo',
  label: 'Demo data',
  async fetchDepartures({ pastWindowMin, maxRows, direction, icao }) {
    // Tiny delay so the UI's loading state is exercised like a real fetch.
    await new Promise((r) => setTimeout(r, 150));
    if (icao && icao !== 'EGPH') return []; // demo flights are Edinburgh-only
    return generateDemoDepartures({ pastWindowMin, maxRows }, direction);
  },
};

export const demoTrainProvider = {
  id: 'demo',
  label: 'Demo data',
  async fetchDepartures({ pastWindowMin, maxRows, direction, crs }) {
    await new Promise((r) => setTimeout(r, 150));
    if (crs && crs !== 'EDB') return []; // demo trains are Edinburgh Waverley-only
    return generateDemoTrains({ pastWindowMin, maxRows }, direction);
  },
};

export const demoBusProvider = {
  id: 'demo',
  label: 'Demo data',
  async fetchDepartures({ pastWindowMin, maxRows, direction, home }) {
    await new Promise((r) => setTimeout(r, 150));
    if (home === false) return []; // demo buses are Edinburgh-only
    return generateDemoBuses({ pastWindowMin, maxRows }, direction);
  },
};

export const demoEuRailProvider = {
  id: 'demo',
  label: 'Demo data',
  // EU rail has no single "home" station, so the demo is an illustrative
  // pan-European board shown for any selection (and on live fallback).
  async fetchDepartures({ pastWindowMin, maxRows, direction }) {
    await new Promise((r) => setTimeout(r, 150));
    return generateEuRail({ pastWindowMin, maxRows }, direction);
  },
};

// ---- AeroDataBox (RapidAPI) live provider --------------------------------

// AeroDataBox local times look like "2026-06-21 08:00+01:00" / "...Z".
function parseApiTime(t) {
  if (!t) return null;
  const s = typeof t === 'string' ? t : t.local || t.utc || '';
  if (!s) return null;
  const d = new Date(s.replace(' ', 'T'));
  return isNaN(d.getTime()) ? null : d;
}

function mapLiveStatus(raw) {
  const s = String(raw || '').toLowerCase().replace(/[^a-z]/g, '');
  if (!s) return STATUS.SCHEDULED;
  if (s.includes('cancel')) return STATUS.CANCELLED;
  if (s.includes('divert')) return STATUS.DIVERTED;
  if (s.includes('depart') || s.includes('enroute') || s.includes('airborne') || s.includes('arrived') || s.includes('approach') || s.includes('landed')) {
    return STATUS.DEPARTED;
  }
  if (s.includes('board')) return STATUS.BOARDING;
  if (s.includes('closed') || s.includes('closing')) return STATUS.GATE_CLOSING;
  if (s.includes('finalcall')) return STATUS.FINAL;
  if (s.includes('delay')) return STATUS.DELAYED;
  if (s.includes('checkin')) return STATUS.CHECKIN;
  if (s.includes('gate')) return STATUS.GATE;
  return STATUS.SCHEDULED; // expected / scheduled / ontime / unknown-but-present
}

function mapArrivalStatus(raw) {
  const s = String(raw || '').toLowerCase().replace(/[^a-z]/g, '');
  if (!s) return STATUS.SCHEDULED;
  if (s.includes('cancel')) return STATUS.CANCELLED;
  if (s.includes('divert')) return STATUS.DIVERTED;
  if (s.includes('arrived') || s.includes('landed')) return STATUS.ARRIVED;
  if (s.includes('approach') || s.includes('enroute') || s.includes('airborne') || s.includes('expected')) return STATUS.EXPECTED;
  if (s.includes('delay')) return STATUS.DELAYED;
  return STATUS.SCHEDULED;
}

// AeroDataBox rarely publishes gates on the free tier, so fill a stable,
// plausible "indicative" gate (flagged) when the feed doesn't provide one.
const GATE_POOL = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '15', '16', '18', '20', '21', '24', '26'];
function indicativeGate(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return GATE_POOL[Math.abs(h) % GATE_POOL.length];
}

function normalizeLiveFlight(f, i, arrivals) {
  const mv = f.movement || f.departure || f.arrival || {};
  const airport = mv.airport || {};
  const time = parseApiTime(mv.scheduledTime) || parseApiTime(mv.scheduledTimeLocal);
  const estimated =
    parseApiTime(mv.revisedTime) || parseApiTime(mv.predictedTime) || parseApiTime(mv.actualTime);

  let status = arrivals ? mapArrivalStatus(f.status) : mapLiveStatus(f.status);
  // Promote to "Delayed" if the time was pushed back materially.
  if (time && estimated && status !== STATUS.CANCELLED && status !== STATUS.DEPARTED && status !== STATUS.ARRIVED) {
    if (estimated.getTime() - time.getTime() >= 15 * 60000) status = STATUS.DELAYED;
  }

  const flightNo = String(f.number || f.callSign || '').replace(/\s+/g, '') || '—';
  const realGate = mv.gate || f.gate || null;
  return {
    id: `${flightNo}|${(time || new Date()).toISOString()}|${i}`,
    flightNo,
    airline: (f.airline && f.airline.name) || '',
    airlineCode: (f.airline && (f.airline.iata || f.airline.icao)) || '',
    // For arrivals this counterpart airport is the ORIGIN; for departures the destination.
    dest: airport.name || airport.shortName || airport.municipalityName || airport.iata || 'Unknown',
    destIata: airport.iata || airport.icao || '',
    aircraft: (f.aircraft && f.aircraft.model) || '', // published equipment, when available
    aircraftReg: (f.aircraft && f.aircraft.reg) || '',
    time,
    estimated: estimated && time && estimated.getTime() !== time.getTime() ? estimated : null,
    // Indicative gates only make sense for departures.
    gate: realGate || (arrivals ? null : indicativeGate(flightNo)),
    gateIndicative: !realGate && !arrivals,
    status,
    codeshare: !!(f.codeshareStatus && /codeshare/i.test(f.codeshareStatus)),
  };
}

export function makeLiveProvider(getApiKey, getProxyUrl = () => '', getIcao = () => 'EGPH', getDirection = () => 'departures') {
  return {
    id: 'live',
    label: 'Live (AeroDataBox)',
    async fetchDepartures({ pastWindowMin, maxRows }) {
      const key = (getApiKey() || '').trim();
      const proxy = (getProxyUrl() || '').trim().replace(/\/+$/, '');
      // With a proxy the key lives server-side; without one we need a client key.
      if (!proxy && !key) {
        const err = new Error('Add an AeroDataBox key (or a proxy URL) in Settings to see live data.');
        err.code = 'NO_KEY';
        throw err;
      }

      const arrivals = getDirection() === 'arrivals';
      const now = Date.now();
      const from = fmtLocalApi(new Date(now - pastWindowMin * 60000));
      const to = fmtLocalApi(new Date(now + 11 * 3600 * 1000)); // <12h window
      const qs = new URLSearchParams({
        direction: arrivals ? 'Arrival' : 'Departure',
        withLeg: 'false',
        withCancelled: 'true',
        withCodeshared: 'false',
        withCargo: 'false',
        withPrivate: 'false',
        withLocation: 'false',
      });
      const base = proxy || AERODATABOX.base;
      const icao = (getIcao() || 'EGPH').trim().toUpperCase();
      const url = `${base}/flights/airports/icao/${icao}/${from}/${to}?${qs}`;
      // Direct calls need the RapidAPI headers; the proxy injects the key itself.
      const headers = proxy ? {} : { 'X-RapidAPI-Key': key, 'X-RapidAPI-Host': AERODATABOX.host };

      let res;
      try {
        res = await fetch(url, { headers });
      } catch (e) {
        throw new Error(
          proxy
            ? 'Could not reach the proxy. Check the Proxy URL in Settings.'
            : 'Could not reach AeroDataBox (network/CORS). Check your connection.',
        );
      }

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error('API key rejected (401/403). Check the key and that you are subscribed to AeroDataBox on RapidAPI.');
        }
        if (res.status === 429) throw new Error('Rate limit reached on the free tier. Try again in a bit.');
        throw new Error(`Live data error (HTTP ${res.status}).`);
      }

      const data = await res.json();
      const list = Array.isArray(data) ? data : data.arrivals || data.departures || data.flights || [];
      const earliest = now - pastWindowMin * 60000;

      return list
        .map((f, i) => normalizeLiveFlight(f, i, arrivals))
        .filter((f) => f.time && (f.estimated || f.time).getTime() >= earliest)
        .sort((a, b) => a.time - b.time)
        .slice(0, maxRows);
    },
  };
}

// ---- Trains: Huxley2 (National Rail Darwin) live provider -----------------

function mapTrainStatus(etd, isCancelled) {
  const e = (etd || '').trim();
  if (isCancelled || /cancel/i.test(e)) return STATUS.CANCELLED;
  if (/^\d{1,2}:\d{2}$/.test(e)) return STATUS.DELAYED; // an explicit later time
  if (/delay/i.test(e)) return STATUS.DELAYED;
  return STATUS.ON_TIME; // "On time", "Starts here", "No report", etc.
}

function normalizeTrain(s, i, arrivals) {
  // Arrivals carry sta/eta + origin; departures carry std/etd + destination.
  const schedStr = arrivals ? s.sta : s.std;
  const expStr = arrivals ? s.eta : s.etd;
  const time = parseLondonClock(schedStr) || parseLondonClock(expStr);
  const status = mapTrainStatus(expStr, s.isCancelled);
  const est = status === STATUS.DELAYED ? parseLondonClock(expStr) : null;
  const d = ((arrivals ? s.origin : s.destination) || [])[0] || {};
  return {
    id: s.serviceID || `${schedStr}|${d.locationName || ''}|${i}`,
    operator: s.operator || '',
    operatorCode: s.operatorCode || '',
    dest: d.locationName || 'Unknown',
    via: (d.via || '').replace(/^via\s+/i, ''),
    time,
    estimated: est && time && est.getTime() !== time.getTime() ? est : null,
    platform: s.platform || null,
    status,
    cancelled: status === STATUS.CANCELLED,
  };
}

export function makeTrainProvider(getBase, getStation, getDirection = () => 'departures') {
  return {
    id: 'live',
    label: 'Live (National Rail)',
    async fetchDepartures({ maxRows }) {
      const base = (getBase() || HUXLEY.base).trim().replace(/\/+$/, '');
      const crs = (getStation() || 'EDB').trim().toUpperCase();
      const arrivals = getDirection() === 'arrivals';
      const url = `${base}/${arrivals ? 'arrivals' : 'departures'}/${crs}/${Math.min(maxRows, 50)}`;

      let res;
      try {
        res = await fetch(url, { headers: { Accept: 'application/json' } });
      } catch {
        throw new Error('Could not reach the trains service (network/CORS). Check the Huxley URL in Settings.');
      }
      if (!res.ok) throw new Error(`Trains data error (HTTP ${res.status}).`);

      const data = await res.json();
      const list = data.trainServices || [];
      return list
        .map((s, i) => normalizeTrain(s, i, arrivals))
        .filter((t) => t.time)
        .sort((a, b) => a.time - b.time)
        .slice(0, maxRows);
    },
  };
}

// ---- Buses: TransportAPI via the Worker proxy ----------------------------

function normalizeBus(d, i) {
  const time =
    parseLondonClock(d.aimed_departure_time) ||
    parseLondonClock(d.best_departure_estimate) ||
    parseLondonClock(d.expected_departure_time);
  const exp = (d.expected_departure_time || '').trim();

  let status = STATUS.ON_TIME;
  let estimated = null;
  if (/cancel/i.test(exp) || d.cancelled) {
    status = STATUS.CANCELLED;
  } else if (/^\d{1,2}:\d{2}$/.test(exp)) {
    const e = parseLondonClock(exp);
    if (time && e && e.getTime() - time.getTime() >= 60000) {
      status = STATUS.DELAYED;
      estimated = e;
    }
  }

  return {
    id: `${d.line || ''}|${d.aimed_departure_time || ''}|${i}`,
    operator: d.operator_name || d.operator || '',
    operatorCode: d.operator || '',
    dest: d.destination_name || d.direction || 'Unknown',
    via: '',
    line: d.line_name || d.line || '',
    time,
    estimated,
    stance: d.stand || d.bay || null,
    status,
    cancelled: status === STATUS.CANCELLED,
  };
}

export function makeBusProvider(getBase, getAtco, getDirection = () => 'departures') {
  return {
    id: 'live',
    label: 'Live (TransportAPI)',
    async fetchDepartures({ maxRows }) {
      if (getDirection() === 'arrivals') {
        // TransportAPI has no per-stop arrivals feed — fall back to demo.
        const e = new Error('Live bus arrivals aren’t available for this stop.');
        e.code = 'NO_ARRIVALS';
        throw e;
      }
      const base = (getBase() || '').trim().replace(/\/+$/, '');
      if (!base) {
        const e = new Error('Buses need the Worker proxy — set a Proxy URL in Settings.');
        e.code = 'NO_PROXY';
        throw e;
      }
      const atco = (getAtco() || '').trim();
      if (!atco) {
        const e = new Error('Set the bus-station ATCO code in Settings to see live buses.');
        e.code = 'NO_ATCO';
        throw e;
      }

      const url = `${base}/bus/stop/${encodeURIComponent(atco)}/live.json?group=no&nextbuses=yes`;
      let res;
      try {
        res = await fetch(url, { headers: { Accept: 'application/json' } });
      } catch {
        throw new Error('Could not reach the bus proxy. Check the Proxy URL in Settings.');
      }
      if (!res.ok) throw new Error(`Bus data error (HTTP ${res.status}).`);

      const data = await res.json();
      const list = (data.departures && (data.departures.all || data.departures.bus)) || [];
      return list
        .map(normalizeBus)
        .filter((b) => b.time)
        .sort((a, b) => a.time - b.time)
        .slice(0, maxRows);
    },
  };
}

// ---- EU Rail: Deutsche Bahn HAFAS via transport.rest ---------------------

// DB transport.rest returns ISO 8601 instants with a zone offset, so the native
// Date parser yields the correct absolute time (rendered in Edinburgh time, like
// the rest of the board).
function parseIso(s) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function normalizeEuRail(d, i, arrivals) {
  const planned = parseIso(d.plannedWhen) || parseIso(d.when);
  const actual = parseIso(d.when) || planned;
  const cancelled = d.cancelled === true;
  const delaySec = typeof d.delay === 'number' ? d.delay : 0;

  let status;
  if (cancelled) status = STATUS.CANCELLED;
  else if (delaySec >= 300) status = STATUS.DELAYED;
  else if (actual && actual.getTime() < Date.now() - 60000) status = arrivals ? STATUS.ARRIVED : STATUS.DEPARTED;
  else status = STATUS.ON_TIME;

  const line = d.line || {};
  // Arrivals carry provenance/origin; departures carry direction/destination.
  const place = arrivals
    ? d.provenance || (d.origin && d.origin.name)
    : d.direction || (d.destination && d.destination.name);
  const estimated =
    actual && planned && actual.getTime() !== planned.getTime() ? actual : null;

  return {
    id: d.tripId || `${line.name || ''}|${d.plannedWhen || d.when || ''}|${i}`,
    line: line.name || line.productName || '',
    operator: (line.operator && line.operator.name) || line.productName || '',
    operatorCode: line.productName || '',
    dest: place || 'Unknown',
    via: '',
    time: planned,
    estimated: status === STATUS.CANCELLED ? null : estimated,
    platform: d.platform || d.plannedPlatform || null,
    status,
    cancelled,
  };
}

export function makeEuRailProvider(getBase, getStation, getDirection = () => 'departures') {
  return {
    id: 'live',
    label: 'Live (Deutsche Bahn)',
    async fetchDepartures({ pastWindowMin, maxRows }) {
      const base = (getBase() || DBREST.base).trim().replace(/\/+$/, '');
      const id = (getStation() || '').trim();
      if (!id) {
        const e = new Error('Pick a European station in Settings to see live trains.');
        e.code = 'NO_STATION';
        throw e;
      }
      const arrivals = getDirection() === 'arrivals';
      const qs = new URLSearchParams({
        duration: '180',
        results: String(Math.min(maxRows * 2, 80)),
        linesOfStops: 'false',
        remarks: 'false',
        language: 'en',
      });
      const url = `${base}/stops/${encodeURIComponent(id)}/${arrivals ? 'arrivals' : 'departures'}?${qs}`;

      let res;
      try {
        res = await fetch(url, { headers: { Accept: 'application/json' } });
      } catch {
        throw new Error('Could not reach the EU rail service (network/CORS). Check the data URL in Settings.');
      }
      if (!res.ok) throw new Error(`EU rail data error (HTTP ${res.status}).`);

      const data = await res.json();
      const list = Array.isArray(data) ? data : data.departures || data.arrivals || [];
      const earliest = Date.now() - pastWindowMin * 60000;
      return list
        .map((s, i) => normalizeEuRail(s, i, arrivals))
        .filter((t) => t.time && (t.estimated || t.time).getTime() >= earliest)
        .sort((a, b) => a.time - b.time)
        .slice(0, maxRows);
    },
  };
}
