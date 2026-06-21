// Time helpers. The board always shows Edinburgh (Europe/London) wall-clock
// time regardless of where the viewer is, so all formatting is pinned to that
// zone. Flights carry absolute Date instants; display/format happens here.

import { AIRPORT } from './config.js?v=3';

// Milliseconds between UTC and Europe/London at a given instant (handles DST).
export function londonOffsetMs(instant = Date.now()) {
  const d = new Date(instant);
  const asLondon = new Date(d.toLocaleString('en-US', { timeZone: AIRPORT.timeZone }));
  const asUtc = new Date(d.toLocaleString('en-US', { timeZone: 'UTC' }));
  return asLondon.getTime() - asUtc.getTime();
}

// Absolute Date for an Edinburgh wall-clock time, `dayOffset` days from today.
export function londonTimeAt(dayOffset, hour, minute) {
  const off = londonOffsetMs();
  const london = new Date(Date.now() + off);
  const wallAsUtc = Date.UTC(
    london.getUTCFullYear(),
    london.getUTCMonth(),
    london.getUTCDate() + dayOffset,
    hour,
    minute,
    0,
  );
  return new Date(wallAsUtc - off);
}

// "HH:MM" in Edinburgh local time.
export function fmtClock(date) {
  if (!date) return '--:--';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: AIRPORT.timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

// "HH:MM:SS" — for the live header clock.
export function fmtClockSeconds(date) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: AIRPORT.timeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

// "Sun 21 Jun" in Edinburgh local time.
export function fmtDate(date) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: AIRPORT.timeZone,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(date);
}

// "yyyy-MM-ddTHH:mm" in Edinburgh local time — the format AeroDataBox expects.
export function fmtLocalApi(date) {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: AIRPORT.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (t) => p.find((x) => x.type === t).value;
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

export function minutesUntil(date, from = Date.now()) {
  return Math.round((date.getTime() - from) / 60000);
}

// Turn a Darwin/Huxley "HH:MM" wall-clock string into an absolute Date, picking
// today or tomorrow — whichever puts it in a sensible window around now (so a
// 00:20 service seen at 23:50 resolves to tomorrow).
export function parseLondonClock(hhmm, from = Date.now()) {
  const m = /^(\d{1,2}):(\d{2})$/.exec((hhmm || '').trim());
  if (!m) return null;
  const h = +m[1];
  const min = +m[2];
  let d = londonTimeAt(0, h, min);
  if (d.getTime() < from - 6 * 3600 * 1000) d = londonTimeAt(1, h, min);
  return d;
}
