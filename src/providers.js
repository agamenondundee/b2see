// Data providers. Each exposes async fetchDepartures(opts) -> Flight[] using a
// single normalized shape so the UI never cares where the data came from:
//
//   { id, flightNo, airline, airlineCode, dest, destIata,
//     time: Date, estimated: Date|null, gate: string|null,
//     status: {key,label}, codeshare: boolean }

import { AERODATABOX, STATUS } from './config.js';
import { fmtLocalApi } from './time.js';
import { generateDemoDepartures } from './demo-data.js';

// ---- Demo provider -------------------------------------------------------

export const demoProvider = {
  id: 'demo',
  label: 'Demo data',
  async fetchDepartures({ pastWindowMin, maxRows }) {
    // Tiny delay so the UI's loading state is exercised like a real fetch.
    await new Promise((r) => setTimeout(r, 150));
    return generateDemoDepartures({ pastWindowMin, maxRows });
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

function normalizeLiveFlight(f, i) {
  const mv = f.movement || f.departure || {};
  const airport = mv.airport || {};
  const time = parseApiTime(mv.scheduledTime) || parseApiTime(mv.scheduledTimeLocal);
  const estimated =
    parseApiTime(mv.revisedTime) || parseApiTime(mv.predictedTime) || parseApiTime(mv.actualTime);

  let status = mapLiveStatus(f.status);
  // Promote to "Delayed" if the airline pushed the time back materially.
  if (time && estimated && status !== STATUS.CANCELLED && status !== STATUS.DEPARTED) {
    if (estimated.getTime() - time.getTime() >= 15 * 60000) status = STATUS.DELAYED;
  }

  const flightNo = String(f.number || f.callSign || '').replace(/\s+/g, '') || '—';
  return {
    id: `${flightNo}|${(time || new Date()).toISOString()}|${i}`,
    flightNo,
    airline: (f.airline && f.airline.name) || '',
    airlineCode: (f.airline && (f.airline.iata || f.airline.icao)) || '',
    dest: airport.name || airport.shortName || airport.municipalityName || airport.iata || 'Unknown',
    destIata: airport.iata || airport.icao || '',
    time,
    estimated: estimated && time && estimated.getTime() !== time.getTime() ? estimated : null,
    gate: mv.gate || null,
    status,
    codeshare: !!(f.codeshareStatus && /codeshare/i.test(f.codeshareStatus)),
  };
}

export function makeLiveProvider(getApiKey, getProxyUrl = () => '') {
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

      const now = Date.now();
      const from = fmtLocalApi(new Date(now - pastWindowMin * 60000));
      const to = fmtLocalApi(new Date(now + 11 * 3600 * 1000)); // <12h window
      const qs = new URLSearchParams({
        direction: 'Departure',
        withLeg: 'false',
        withCancelled: 'true',
        withCodeshared: 'false',
        withCargo: 'false',
        withPrivate: 'false',
        withLocation: 'false',
      });
      const base = proxy || AERODATABOX.base;
      const url = `${base}/flights/airports/icao/EGPH/${from}/${to}?${qs}`;
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
      const list = Array.isArray(data) ? data : data.departures || data.flights || [];
      const earliest = now - pastWindowMin * 60000;

      return list
        .map(normalizeLiveFlight)
        .filter((f) => f.time && (f.estimated || f.time).getTime() >= earliest)
        .sort((a, b) => a.time - b.time)
        .slice(0, maxRows);
    },
  };
}
