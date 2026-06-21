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
  provider: 'edi.provider', // 'demo' | 'live'
  refreshMs: 'edi.refreshMs',
};

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

// Canonical, display-ready flight status buckets used throughout the UI.
// Each maps to a CSS modifier class (status--<key>).
export const STATUS = {
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
