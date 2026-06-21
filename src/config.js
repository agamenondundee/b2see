// Central configuration for the Edinburgh Airport departures board.

export const AIRPORT = {
  name: 'Edinburgh Airport',
  iata: 'EDI',
  icao: 'EGPH',
  timeZone: 'Europe/London',
};

// localStorage keys.
export const STORE = {
  apiKey: 'edi.rapidapi.key',
  proxyUrl: 'edi.proxyUrl', // optional Cloudflare Worker proxy (key stays server-side)
  provider: 'edi.provider', // flights: 'demo' | 'live'
  trainProvider: 'edi.trainProvider', // trains: 'demo' | 'live'
  trainStation: 'edi.trainStation', // CRS code
  trainBase: 'edi.trainBase', // Huxley base URL
  busProvider: 'edi.busProvider', // buses: 'demo' | 'live'
  busAtco: 'edi.busAtco', // TransportAPI ATCO code for the bus station
  flightAirport: 'edi.flightAirport', // selected airport ICAO
  tab: 'edi.tab', // active tab: 'flights' | 'trains' | 'buses'
  direction: 'edi.direction', // 'departures' | 'arrivals'
  refreshMs: 'edi.refreshMs',
};

// Major UK & European airports for the flights board (see airports.js). The
// ICAO drives the AeroDataBox lookup. Default is Edinburgh (EGPH).
export { AIRPORTS } from './airports.js?v=6';
export const FLIGHT_DEFAULTS = { airport: 'EGPH' };

export const DEFAULTS = {
  provider: 'demo',
  refreshMs: 60_000, // auto-refresh once a minute
  maxRows: 40,
  // Show flights from this many minutes in the past (recently departed) onward.
  pastWindowMin: 40,
};

// AeroDataBox (RapidAPI) settings.
export const AERODATABOX = {
  host: 'aerodatabox.p.rapidapi.com',
  base: 'https://aerodatabox.p.rapidapi.com',
};

// Trains: National Rail Darwin via a Huxley2 JSON proxy (CORS-enabled, keyless).
export const HUXLEY = {
  // Public demo instance — no key needed (best-effort uptime). Override in
  // Settings to point at your own self-hosted Huxley2 for reliability.
  base: 'https://huxley2.azurewebsites.net',
};

// All Scottish railway stations for the trains board (CRS codes). Default is
// Edinburgh Waverley (EDB); see TRAIN_DEFAULTS.
export { STATIONS } from './stations.js?v=6';

export const TRAIN_DEFAULTS = {
  provider: 'live', // live needs no key, so default the trains tab to real data
  station: 'EDB',
  maxRows: 30,
  pastWindowMin: 15,
};

// Buses: Edinburgh Bus Station (St Andrew Square). Live data is TransportAPI,
// reached only through the Worker proxy (creds stay server-side), so the tab
// defaults to demo until the proxy is configured.
export const BUS_STATION = { name: 'Edinburgh Bus Station', area: 'St Andrew Square' };
export const BUS_DEFAULTS = {
  provider: 'demo',
  atco: '',
  maxRows: 30,
  pastWindowMin: 15,
};

// Canonical, display-ready flight status buckets used throughout the UI.
// Each maps to a CSS modifier class (status--<key>).
export const STATUS = {
  ON_TIME: { key: 'ontime', label: 'On time' },
  EXPECTED: { key: 'checkin', label: 'Expected' }, // arrivals (reuses cyan style)
  ARRIVED: { key: 'departed', label: 'Arrived' }, // arrivals (reuses dim style)
  SCHEDULED: { key: 'scheduled', label: 'Scheduled' },
  CHECKIN: { key: 'checkin', label: 'Check-in' },
  BOARDING: { key: 'boarding', label: 'Boarding' },
  GATE: { key: 'gate', label: 'Go to Gate' },
  FINAL: { key: 'final', label: 'Final Call' },
  GATE_CLOSING: { key: 'closing', label: 'Gate Closing' },
  DEPARTED: { key: 'departed', label: 'Departed' },
  DELAYED: { key: 'delayed', label: 'Delayed' },
  CANCELLED: { key: 'cancelled', label: 'Cancelled' },
  DIVERTED: { key: 'diverted', label: 'Diverted' },
  UNKNOWN: { key: 'unknown', label: '—' },
};
