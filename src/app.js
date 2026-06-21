// Edinburgh Airport live departures — app orchestrator.

import { STORE, DEFAULTS, STATUS } from './config.js';
import { fmtClock, fmtClockSeconds, fmtDate } from './time.js';
import { demoProvider, makeLiveProvider } from './providers.js';

// ---- Settings (persisted in localStorage) --------------------------------

const settings = {
  provider: localStorage.getItem(STORE.provider) || DEFAULTS.provider,
  apiKey: localStorage.getItem(STORE.apiKey) || '',
  refreshMs: Number(localStorage.getItem(STORE.refreshMs) ?? DEFAULTS.refreshMs),
};

const liveProvider = makeLiveProvider(() => settings.apiKey);
const providerFor = (id) => (id === 'live' ? liveProvider : demoProvider);

// ---- Runtime state -------------------------------------------------------

const state = {
  flights: [],
  search: '',
  statusFilter: 'all',
  error: null, // message shown when live failed and we fell back to demo
  loading: false,
};

let refreshTimer = null;

// ---- DOM refs ------------------------------------------------------------

const $ = (id) => document.getElementById(id);
const rowsEl = $('rows');
const messageEl = $('message');
const updatedEl = $('updated');
const providerBadge = $('provider-badge');
const footerNote = $('footer-note');

// Status filter chips: id -> predicate over a flight's status key.
const FILTERS = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'boarding', label: 'Boarding', test: (k) => ['checkin', 'boarding', 'gate', 'closing', 'final'].includes(k) },
  { id: 'delayed', label: 'Delayed', test: (k) => k === 'delayed' },
  { id: 'departed', label: 'Departed', test: (k) => k === 'departed' },
  { id: 'cancelled', label: 'Cancelled', test: (k) => k === 'cancelled' },
];

// ---- Small DOM helper ----------------------------------------------------

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

// ---- Rendering -----------------------------------------------------------

function buildRow(f) {
  const row = el('div', `row status--${f.status.key}`);
  row.setAttribute('role', 'row');

  // Time (+ estimated when delayed)
  const time = el('span', 'col-time');
  const sched = el('span', 'sched', fmtClock(f.time));
  if (f.estimated) sched.classList.add('is-revised');
  time.appendChild(sched);
  if (f.estimated) time.appendChild(el('span', 'est', fmtClock(f.estimated)));
  row.appendChild(time);

  // Destination
  const dest = el('span', 'col-dest');
  dest.appendChild(el('span', 'dest-name', f.dest));
  if (f.destIata) dest.appendChild(el('span', 'dest-iata', f.destIata));
  row.appendChild(dest);

  // Flight + airline
  const flight = el('span', 'col-flight');
  const fno = el('span', 'flight-no', f.flightNo);
  flight.appendChild(fno);
  if (f.codeshare) fno.appendChild(el('span', 'cs-tag', 'codeshare'));
  if (f.airline) flight.appendChild(el('span', 'flight-airline', f.airline));
  row.appendChild(flight);

  // Gate
  row.appendChild(el('span', 'col-gate', f.gate || '—'));

  // Status
  const status = el('span', 'col-status');
  status.appendChild(el('span', `badge badge--${f.status.key}`, f.status.label));
  row.appendChild(status);

  return row;
}

function visibleFlights() {
  const q = state.search.trim().toLowerCase();
  const filter = FILTERS.find((x) => x.id === state.statusFilter) || FILTERS[0];
  return state.flights.filter((f) => {
    if (!filter.test(f.status.key)) return false;
    if (!q) return true;
    return (
      f.flightNo.toLowerCase().includes(q) ||
      f.dest.toLowerCase().includes(q) ||
      f.destIata.toLowerCase().includes(q) ||
      f.airline.toLowerCase().includes(q)
    );
  });
}

function showMessage(text, kind = 'info') {
  messageEl.textContent = text;
  messageEl.className = `message message--${kind}`;
  messageEl.hidden = false;
}

function render() {
  const list = visibleFlights();
  rowsEl.replaceChildren(...list.map(buildRow));

  if (list.length === 0) {
    showMessage(
      state.flights.length === 0 ? 'No departures to show right now.' : 'No flights match your filters.',
      'info',
    );
  } else {
    messageEl.hidden = true;
  }

  // Provider + footer status
  const live = settings.provider === 'live';
  providerBadge.textContent = live ? 'live' : 'demo';
  providerBadge.classList.toggle('is-live', live);

  if (state.error) {
    footerNote.textContent = `⚠ Live data unavailable: ${state.error} Showing demo data.`;
    footerNote.classList.add('is-warn');
  } else {
    footerNote.classList.remove('is-warn');
    footerNote.textContent = live
      ? 'Live flights via AeroDataBox.'
      : 'Showing demo data — add an API key in Settings ⚙ for live flights.';
  }
}

// ---- Data refresh --------------------------------------------------------

async function refresh() {
  if (state.loading) return;
  state.loading = true;
  updatedEl.textContent = 'updating…';
  const opts = { pastWindowMin: DEFAULTS.pastWindowMin, maxRows: DEFAULTS.maxRows };

  try {
    state.flights = await providerFor(settings.provider).fetchDepartures(opts);
    state.error = null;
  } catch (err) {
    if (settings.provider === 'live') {
      // Graceful demo fallback so the board is never empty.
      try {
        state.flights = await demoProvider.fetchDepartures(opts);
        state.error = err.message;
      } catch {
        state.loading = false;
        showMessage(err.message, 'error');
        updatedEl.textContent = '';
        return;
      }
    } else {
      state.loading = false;
      showMessage(err.message, 'error');
      updatedEl.textContent = '';
      return;
    }
  }

  state.loading = false;
  updatedEl.textContent = `updated ${fmtClockSeconds(new Date())}`;
  render();
}

function scheduleAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  if (settings.refreshMs > 0) refreshTimer = setInterval(refresh, settings.refreshMs);
}

// ---- Header clock --------------------------------------------------------

function tickClock() {
  const now = new Date();
  $('clock-time').textContent = fmtClockSeconds(now);
  $('clock-date').textContent = fmtDate(now);
}

// ---- Filters UI ----------------------------------------------------------

function buildFilters() {
  const wrap = $('filters');
  wrap.replaceChildren(
    ...FILTERS.map((f) => {
      const b = el('button', 'chip', f.label);
      b.dataset.id = f.id;
      b.setAttribute('aria-pressed', String(f.id === state.statusFilter));
      if (f.id === state.statusFilter) b.classList.add('is-active');
      b.addEventListener('click', () => {
        state.statusFilter = f.id;
        for (const c of wrap.children) {
          const active = c.dataset.id === f.id;
          c.classList.toggle('is-active', active);
          c.setAttribute('aria-pressed', String(active));
        }
        render();
      });
      return b;
    }),
  );
}

// ---- Settings modal ------------------------------------------------------

const modal = $('settings');

function openSettings() {
  for (const r of document.querySelectorAll('input[name="provider"]')) {
    r.checked = r.value === settings.provider;
  }
  $('api-key').value = settings.apiKey;
  $('refresh').value = String(settings.refreshMs);
  modal.hidden = false;
}

function closeSettings() {
  modal.hidden = true;
}

function saveSettings() {
  const provider = document.querySelector('input[name="provider"]:checked')?.value || 'demo';
  settings.provider = provider;
  settings.apiKey = $('api-key').value.trim();
  settings.refreshMs = Number($('refresh').value);

  localStorage.setItem(STORE.provider, settings.provider);
  localStorage.setItem(STORE.apiKey, settings.apiKey);
  localStorage.setItem(STORE.refreshMs, String(settings.refreshMs));

  closeSettings();
  scheduleAutoRefresh();
  refresh();
}

// ---- Wire up -------------------------------------------------------------

function init() {
  buildFilters();
  tickClock();
  setInterval(tickClock, 1000);

  $('search').addEventListener('input', (e) => {
    state.search = e.target.value;
    render();
  });
  $('refresh-btn').addEventListener('click', refresh);
  $('settings-btn').addEventListener('click', openSettings);
  $('settings-close').addEventListener('click', closeSettings);
  $('settings-cancel').addEventListener('click', closeSettings);
  $('settings-save').addEventListener('click', saveSettings);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeSettings();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) closeSettings();
  });

  // Refresh when returning to the tab if data may be stale.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refresh();
  });

  refresh();
  scheduleAutoRefresh();
}

init();
