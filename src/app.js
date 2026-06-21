// Edinburgh live departures — tabbed orchestrator (Flights + Trains).

import { STORE, DEFAULTS, TRAIN_DEFAULTS, BUS_DEFAULTS, BUS_STATION, STATIONS } from './config.js?v=1';
import { fmtClockSeconds, fmtClock, fmtDate } from './time.js?v=1';
import {
  demoProvider,
  makeLiveProvider,
  demoTrainProvider,
  makeTrainProvider,
  demoBusProvider,
  makeBusProvider,
} from './providers.js?v=1';

// ---- Settings (persisted) ------------------------------------------------

const settings = {
  flightProvider: localStorage.getItem(STORE.provider) || DEFAULTS.provider,
  apiKey: localStorage.getItem(STORE.apiKey) || '',
  proxyUrl: localStorage.getItem(STORE.proxyUrl) || '',
  trainProvider: localStorage.getItem(STORE.trainProvider) || TRAIN_DEFAULTS.provider,
  trainStation: localStorage.getItem(STORE.trainStation) || TRAIN_DEFAULTS.station,
  trainBase: localStorage.getItem(STORE.trainBase) || '',
  busProvider: localStorage.getItem(STORE.busProvider) || BUS_DEFAULTS.provider,
  busAtco: localStorage.getItem(STORE.busAtco) || BUS_DEFAULTS.atco,
  refreshMs: Number(localStorage.getItem(STORE.refreshMs) ?? DEFAULTS.refreshMs),
};

const liveFlight = makeLiveProvider(() => settings.apiKey, () => settings.proxyUrl);
const liveTrain = makeTrainProvider(() => settings.trainBase, () => settings.trainStation);
const liveBus = makeBusProvider(() => settings.proxyUrl, () => settings.busAtco);

const stationName = (crs) => (STATIONS.find((s) => s.crs === crs) || {}).name || crs;

// ---- DOM helpers ---------------------------------------------------------

const $ = (id) => document.getElementById(id);
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

const rowsEl = $('rows');
const messageEl = $('message');
const updatedEl = $('updated');
const providerBadge = $('provider-badge');
const footerNote = $('footer-note');
const searchEl = $('search');
const filtersEl = $('filters');
const boardEl = $('board');
const tabsEl = $('tabs');
const headCols = ['col-time', 'col-dest', 'col-flight', 'col-gate', 'col-status'].map(
  (c) => boardEl.querySelector('.board-head .' + c),
);

// ---- Row builders --------------------------------------------------------

function timeCell(item) {
  const time = el('span', 'col-time');
  const sched = el('span', 'sched', fmtClock(item.time));
  if (item.estimated) sched.classList.add('is-revised');
  time.appendChild(sched);
  if (item.estimated) time.appendChild(el('span', 'est', fmtClock(item.estimated)));
  return time;
}

function buildFlightRow(f) {
  const row = el('div', `row status--${f.status.key}`);
  row.setAttribute('role', 'row');
  row.appendChild(timeCell(f));

  const dest = el('span', 'col-dest');
  dest.appendChild(el('span', 'dest-name', f.dest));
  if (f.destIata) dest.appendChild(el('span', 'dest-iata', f.destIata));
  row.appendChild(dest);

  const flight = el('span', 'col-flight');
  const fno = el('span', 'flight-no', f.flightNo);
  if (f.codeshare) fno.appendChild(el('span', 'cs-tag', 'codeshare'));
  flight.appendChild(fno);
  if (f.airline) flight.appendChild(el('span', 'flight-airline', f.airline));
  row.appendChild(flight);

  row.appendChild(el('span', 'col-gate', f.gate || '—'));

  const status = el('span', 'col-status');
  status.appendChild(el('span', `badge badge--${f.status.key}`, f.status.label));
  row.appendChild(status);
  return row;
}

function buildTrainRow(t) {
  const row = el('div', `row status--${t.status.key}`);
  row.setAttribute('role', 'row');
  row.appendChild(timeCell(t));

  const dest = el('span', 'col-dest');
  dest.appendChild(el('span', 'dest-name', t.dest));
  if (t.via) dest.appendChild(el('span', 'dest-iata', `via ${t.via}`));
  row.appendChild(dest);

  const op = el('span', 'col-flight');
  op.appendChild(el('span', 'op-name', t.operator));
  row.appendChild(op);

  row.appendChild(el('span', 'col-gate', t.platform || '—'));

  const status = el('span', 'col-status');
  status.appendChild(el('span', `badge badge--${t.status.key}`, t.status.label));
  row.appendChild(status);
  return row;
}

function buildBusRow(b) {
  const row = el('div', `row status--${b.status.key}`);
  row.setAttribute('role', 'row');
  row.appendChild(timeCell(b));

  const dest = el('span', 'col-dest');
  dest.appendChild(el('span', 'dest-name', b.dest));
  if (b.via) dest.appendChild(el('span', 'dest-iata', `via ${b.via}`));
  row.appendChild(dest);

  const svc = el('span', 'col-flight');
  const line = el('span', 'flight-no', b.line || '—');
  svc.appendChild(line);
  if (b.operator) svc.appendChild(el('span', 'flight-airline', b.operator));
  row.appendChild(svc);

  row.appendChild(el('span', 'col-gate', b.stance || '—'));

  const status = el('span', 'col-status');
  status.appendChild(el('span', `badge badge--${b.status.key}`, b.status.label));
  row.appendChild(status);
  return row;
}

// ---- Feed definitions ----------------------------------------------------

const FLIGHT_FILTERS = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'boarding', label: 'Boarding', test: (k) => ['checkin', 'boarding', 'gate', 'closing', 'final'].includes(k) },
  { id: 'delayed', label: 'Delayed', test: (k) => k === 'delayed' },
  { id: 'departed', label: 'Departed', test: (k) => k === 'departed' },
  { id: 'cancelled', label: 'Cancelled', test: (k) => k === 'cancelled' },
];
const TRAIN_FILTERS = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'ontime', label: 'On time', test: (k) => k === 'ontime' },
  { id: 'delayed', label: 'Delayed', test: (k) => k === 'delayed' },
  { id: 'departed', label: 'Departed', test: (k) => k === 'departed' },
  { id: 'cancelled', label: 'Cancelled', test: (k) => k === 'cancelled' },
];
const BUS_FILTERS = TRAIN_FILTERS;

const FEEDS = {
  flights: {
    columns: ['Time', 'Destination', 'Flight', 'Gate', 'Status'],
    searchPlaceholder: 'Search destination, flight or airline…',
    providers: { demo: demoProvider, live: liveFlight },
    providerId: () => settings.flightProvider,
    opts: () => ({ pastWindowMin: DEFAULTS.pastWindowMin, maxRows: DEFAULTS.maxRows }),
    buildRow: buildFlightRow,
    filters: FLIGHT_FILTERS,
    match: (f, q) =>
      f.flightNo.toLowerCase().includes(q) ||
      f.dest.toLowerCase().includes(q) ||
      f.destIata.toLowerCase().includes(q) ||
      f.airline.toLowerCase().includes(q),
    note: (live, err) =>
      err
        ? `⚠ Live flights unavailable: ${err} Showing demo data.`
        : live
          ? 'Live flights via AeroDataBox.'
          : 'Showing demo flights — add an API key in Settings ⚙ for live data.',
  },
  trains: {
    columns: ['Time', 'Destination', 'Operator', 'Plat', 'Status'],
    searchPlaceholder: 'Search destination, operator or platform…',
    providers: { demo: demoTrainProvider, live: liveTrain },
    providerId: () => settings.trainProvider,
    opts: () => ({ pastWindowMin: TRAIN_DEFAULTS.pastWindowMin, maxRows: TRAIN_DEFAULTS.maxRows }),
    buildRow: buildTrainRow,
    filters: TRAIN_FILTERS,
    match: (t, q) =>
      t.dest.toLowerCase().includes(q) ||
      t.operator.toLowerCase().includes(q) ||
      (t.platform || '').toLowerCase().includes(q) ||
      (t.via || '').toLowerCase().includes(q),
    note: (live, err) =>
      err
        ? `⚠ Live trains unavailable for ${stationName(settings.trainStation)}: ${err} Showing demo data.`
        : live
          ? `Live departures from ${stationName(settings.trainStation)} (National Rail).`
          : `Showing demo trains for ${stationName(settings.trainStation)}.`,
  },
  buses: {
    columns: ['Time', 'Destination', 'Service', 'Stance', 'Status'],
    searchPlaceholder: 'Search destination, service or operator…',
    providers: { demo: demoBusProvider, live: liveBus },
    providerId: () => settings.busProvider,
    opts: () => ({ pastWindowMin: BUS_DEFAULTS.pastWindowMin, maxRows: BUS_DEFAULTS.maxRows }),
    buildRow: buildBusRow,
    filters: BUS_FILTERS,
    match: (b, q) =>
      b.dest.toLowerCase().includes(q) ||
      b.operator.toLowerCase().includes(q) ||
      (b.line || '').toLowerCase().includes(q) ||
      (b.stance || '').toLowerCase().includes(q),
    note: (live, err) =>
      err
        ? `⚠ Live buses unavailable: ${err} Showing demo data.`
        : live
          ? `Live departures from ${BUS_STATION.name} (TransportAPI).`
          : `Showing demo buses for ${BUS_STATION.name} (${BUS_STATION.area}).`,
  },
};

// ---- Runtime state -------------------------------------------------------

const mkState = () => ({ rows: [], search: '', filter: 'all', error: null, loading: false, loaded: false, updated: null });
const state = { flights: mkState(), trains: mkState(), buses: mkState() };
let activeTab = localStorage.getItem(STORE.tab) || 'flights';
let refreshTimer = null;

// ---- Rendering -----------------------------------------------------------

function showMessage(text, kind = 'info') {
  messageEl.textContent = text;
  messageEl.className = `message message--${kind}`;
  messageEl.hidden = false;
}

function render() {
  const feed = FEEDS[activeTab];
  const st = state[activeTab];

  feed.columns.forEach((label, i) => { if (headCols[i]) headCols[i].textContent = label; });
  boardEl.classList.remove('feed-flights', 'feed-trains', 'feed-buses');
  boardEl.classList.add('feed-' + activeTab);

  const q = st.search.trim().toLowerCase();
  const filt = feed.filters.find((f) => f.id === st.filter) || feed.filters[0];
  const list = st.rows.filter((r) => filt.test(r.status.key) && (!q || feed.match(r, q)));
  rowsEl.replaceChildren(...list.map(feed.buildRow));

  if (list.length === 0) {
    showMessage(st.rows.length === 0 ? 'No departures to show right now.' : 'No services match your filters.', 'info');
  } else {
    messageEl.hidden = true;
  }

  const live = feed.providerId() === 'live';
  providerBadge.textContent = live ? 'live' : 'demo';
  providerBadge.classList.toggle('is-live', live);
  footerNote.classList.toggle('is-warn', !!st.error);
  footerNote.textContent = feed.note(live, st.error);
  updatedEl.textContent = st.loading ? 'updating…' : st.updated ? `updated ${fmtClockSeconds(st.updated)}` : '';
}

// ---- Data refresh --------------------------------------------------------

async function refresh(feedId = activeTab) {
  const feed = FEEDS[feedId];
  const st = state[feedId];
  if (st.loading) return;
  st.loading = true;
  if (feedId === activeTab) updatedEl.textContent = 'updating…';

  const pid = feed.providerId();
  try {
    st.rows = await feed.providers[pid].fetchDepartures(feed.opts());
    st.error = null;
  } catch (err) {
    if (pid === 'live') {
      try {
        st.rows = await feed.providers.demo.fetchDepartures(feed.opts());
        st.error = err.message;
      } catch {
        st.loading = false;
        st.loaded = true;
        if (feedId === activeTab) {
          showMessage(err.message, 'error');
          updatedEl.textContent = '';
        }
        return;
      }
    } else {
      st.loading = false;
      st.loaded = true;
      if (feedId === activeTab) {
        showMessage(err.message, 'error');
        updatedEl.textContent = '';
      }
      return;
    }
  }

  st.loading = false;
  st.loaded = true;
  st.updated = new Date();
  if (feedId === activeTab) render();
}

function scheduleAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  if (settings.refreshMs > 0) refreshTimer = setInterval(() => refresh(activeTab), settings.refreshMs);
}

// ---- Tabs & filters ------------------------------------------------------

function buildFilters() {
  const feed = FEEDS[activeTab];
  const st = state[activeTab];
  filtersEl.replaceChildren(
    ...feed.filters.map((f) => {
      const b = el('button', 'chip', f.label);
      b.dataset.id = f.id;
      const active = f.id === st.filter;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-pressed', String(active));
      b.addEventListener('click', () => {
        st.filter = f.id;
        for (const c of filtersEl.children) {
          const on = c.dataset.id === f.id;
          c.classList.toggle('is-active', on);
          c.setAttribute('aria-pressed', String(on));
        }
        render();
      });
      return b;
    }),
  );
}

function setActiveTabButton() {
  for (const b of tabsEl.children) {
    const on = b.dataset.tab === activeTab;
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-selected', String(on));
  }
}

function switchTab(tabId) {
  if (tabId === activeTab || !FEEDS[tabId]) return;
  activeTab = tabId;
  localStorage.setItem(STORE.tab, tabId);
  setActiveTabButton();
  searchEl.value = state[tabId].search;
  searchEl.placeholder = FEEDS[tabId].searchPlaceholder;
  buildFilters();
  render();

  const st = state[tabId];
  const stale = st.updated && settings.refreshMs > 0 && Date.now() - st.updated.getTime() > settings.refreshMs;
  if (!st.loaded || stale) refresh(tabId);
}

// ---- Header clock --------------------------------------------------------

function tickClock() {
  const now = new Date();
  $('clock-time').textContent = fmtClockSeconds(now);
  $('clock-date').textContent = fmtDate(now);
}

// ---- Settings modal ------------------------------------------------------

const modal = $('settings');

function fillStationSelect() {
  const sel = $('train-station');
  sel.replaceChildren(
    ...STATIONS.map((s) => {
      const o = el('option', null, `${s.name} (${s.crs})`);
      o.value = s.crs;
      return o;
    }),
  );
}

function openSettings() {
  for (const r of document.querySelectorAll('input[name="provider"]')) r.checked = r.value === settings.flightProvider;
  for (const r of document.querySelectorAll('input[name="trainProvider"]')) r.checked = r.value === settings.trainProvider;
  for (const r of document.querySelectorAll('input[name="busProvider"]')) r.checked = r.value === settings.busProvider;
  $('api-key').value = settings.apiKey;
  $('proxy-url').value = settings.proxyUrl;
  $('train-station').value = settings.trainStation;
  $('train-base').value = settings.trainBase;
  $('bus-atco').value = settings.busAtco;
  $('refresh').value = String(settings.refreshMs);
  modal.hidden = false;
}

const closeSettings = () => { modal.hidden = true; };

function saveSettings() {
  settings.flightProvider = document.querySelector('input[name="provider"]:checked')?.value || 'demo';
  settings.trainProvider = document.querySelector('input[name="trainProvider"]:checked')?.value || 'live';
  settings.busProvider = document.querySelector('input[name="busProvider"]:checked')?.value || 'demo';
  settings.apiKey = $('api-key').value.trim();
  settings.proxyUrl = $('proxy-url').value.trim().replace(/\/+$/, '');
  settings.trainStation = $('train-station').value;
  settings.trainBase = $('train-base').value.trim().replace(/\/+$/, '');
  settings.busAtco = $('bus-atco').value.trim();
  settings.refreshMs = Number($('refresh').value);

  localStorage.setItem(STORE.provider, settings.flightProvider);
  localStorage.setItem(STORE.trainProvider, settings.trainProvider);
  localStorage.setItem(STORE.busProvider, settings.busProvider);
  localStorage.setItem(STORE.apiKey, settings.apiKey);
  localStorage.setItem(STORE.proxyUrl, settings.proxyUrl);
  localStorage.setItem(STORE.trainStation, settings.trainStation);
  localStorage.setItem(STORE.trainBase, settings.trainBase);
  localStorage.setItem(STORE.busAtco, settings.busAtco);
  localStorage.setItem(STORE.refreshMs, String(settings.refreshMs));

  closeSettings();
  // Settings may have changed providers/station for any feed — reload all.
  state.flights.loaded = false;
  state.trains.loaded = false;
  state.buses.loaded = false;
  scheduleAutoRefresh();
  refresh(activeTab);
}

// ---- Wire up -------------------------------------------------------------

function init() {
  fillStationSelect();
  setActiveTabButton();
  searchEl.value = state[activeTab].search;
  searchEl.placeholder = FEEDS[activeTab].searchPlaceholder;
  buildFilters();
  tickClock();
  setInterval(tickClock, 1000);

  for (const b of tabsEl.children) b.addEventListener('click', () => switchTab(b.dataset.tab));
  searchEl.addEventListener('input', (e) => {
    state[activeTab].search = e.target.value;
    render();
  });
  $('refresh-btn').addEventListener('click', () => refresh(activeTab));
  $('settings-btn').addEventListener('click', openSettings);
  $('settings-close').addEventListener('click', closeSettings);
  $('settings-cancel').addEventListener('click', closeSettings);
  $('settings-save').addEventListener('click', saveSettings);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeSettings(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) closeSettings(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(activeTab); });

  render();
  refresh(activeTab);
  scheduleAutoRefresh();
}

init();
