// Cloud.ax ISMS, browser based. A single page application with no server. Data is
// held in the browser through store.js. All access checks here are a convenience for
// a single user; the server enforced version is in the backend in the parent folder.

import { CONTROLS } from './data/controls.js?v=52';
import { CLAUSES } from './data/clauses.js?v=52';
import { AIMS_CONTROLS, AIMS_OBJECTIVES, AIMS_CLAUSES } from './data/aims-controls.js?v=52';
import { CERT_CRITERIA } from './data/cert-bodies.js?v=52';
import { LANGUAGES, STRINGS, RTL_LANGS } from './i18n.js?v=52';
import {
  CONFIG, getCollection, setCollection, getSettings, setSettings, audit, ensureSeed,
  resetAll, exportAll, importAll, loadDocumentSet, populateSoaFromDocuments, loadRegisterSet, loadAuditSet, loadCertBodySet, cid, addMonths, nextReference,
  getReadinessHistory, recordReadiness, getSoaSnapshots, addSoaSnapshot,
} from './store.js?v=52';

// Interface language. t(key) returns the string for the current language, falling back
// to English, then to the key itself, so a missing translation never breaks the page.
function lang() { const l = getSettings().lang; return STRINGS[l] ? l : 'en'; }
function t(key) { return (STRINGS[lang()] && STRINGS[lang()][key]) || STRINGS.en[key] || key; }
// Set the document language and text direction for the current interface language, so
// right to left languages such as Arabic lay out correctly and screen readers are right.
function applyLang() {
  const l = lang();
  document.documentElement.lang = l === 'en' ? 'en-GB' : l;
  document.documentElement.dir = RTL_LANGS.includes(l) ? 'rtl' : 'ltr';
}

ensureSeed();
applyTheme();
applyLang();

const app = document.getElementById('app');

// ---- helpers ---------------------------------------------------------------

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function role() { return getSettings().role; }
function can(...roles) { return role() === 'Administrator' || roles.includes(role()); }
const ORG_DEFAULTS = { name: 'Cloudax Ltd', scope: 'Cloudax Connect conversational AI platform' };
function getOrg() { return { ...ORG_DEFAULTS, ...(getSettings().org || {}) }; }
function fmtDate(iso) { return iso ? iso.slice(0, 10) : ''; }
function parseHash() {
  const parts = location.hash.replace(/^#\/?/, '').split('/');
  return [parts[0] || 'dashboard', parts[1] || ''];
}
function go(path) { location.hash = '#/' + path; }

function download(filename, text, type = 'text/plain') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
function toCsv(columns, rows) {
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = columns.map((c) => cell(c.label)).join(',');
  const body = rows.map((r) => columns.map((c) => cell(r[c.key])).join(',')).join('\n');
  return head + '\n' + body;
}

// ---- presentation helpers --------------------------------------------------

const ICONS = {
  dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>',
  documents: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h8"/></svg>',
  framework: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 4 5v6c0 5 3.4 8.6 8 11 4.6-2.4 8-6 8-11V5z"/><path d="m9 12 2 2 4-4"/></svg>',
  aims: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="7" width="14" height="12" rx="2"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/><path d="M9 12h.01M15 12h.01M9.5 15.5a3 3 0 0 0 5 0"/></svg>',
  architecture: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="5"/><rect x="14" y="6" width="7" height="5"/><rect x="8" y="16" width="7" height="5"/><path d="M6.5 8v3a2 2 0 0 0 2 2h3M17.5 11v1a2 2 0 0 1-2 2h-4"/></svg>',
  soa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
  registers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>',
  readiness: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4h6a1 1 0 0 1 1 1v1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h1V5a1 1 0 0 1 1-1z"/><path d="m9 13 2 2 4-4"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  audits: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/><circle cx="6.5" cy="7" r="0.5" fill="currentColor"/></svg>',
  certbody: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><path d="M8.5 12.5 7 22l5-3 5 3-1.5-9.5"/></svg>',
  audit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
};

const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
function applyTheme(t) {
  const theme = (t || getSettings().theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0a1326' : '#0000ff');
  return theme;
}
function currentTheme() { return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; }
function toggleTheme() {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  setSettings({ ...getSettings(), theme: next });
  applyTheme(next);
}

const ROUTE_TITLES = {
  dashboard: 'Dashboard', readiness: 'Certification readiness', calendar: 'Compliance calendar', documents: 'Documents', framework: 'Framework', control: 'Control',
  soa: 'Statement of Applicability', aims: 'AI management (42001)', architecture: 'Architecture and data flows', registers: 'Registers', audits: 'Internal audits', certbody: 'Certification body', audit: 'Audit log',
  search: 'Search', settings: 'Settings', report: 'Audit pack', review: 'Management review',
};
// The localised title for a route, falling back to the English route title.
function routeTitle(route) { return (STRINGS[lang()] && STRINGS[lang()]['title.' + route]) || ROUTE_TITLES[route] || STRINGS.en['title.' + route] || 'Dashboard'; }

function pct(n, d) { return d ? Math.round((n / d) * 100) : 0; }

function statusKind(status) {
  return ({
    Published: 'ok', Verified: 'ok', Implemented: 'info', Approved: 'info',
    'In Review': 'warn', 'Under Revision': 'warn', 'In progress': 'warn',
    Draft: 'neutral', 'Not started': 'neutral', Superseded: 'neutral',
    Retired: 'danger',
  })[status] || 'neutral';
}
function pill(text, kind) { return `<span class="pill ${kind || statusKind(text)}">${esc(text)}</span>`; }
function applicablePill(value) {
  return value === true ? pill('Yes', 'ok') : value === false ? pill('No', 'neutral') : pill('Undecided', 'warn');
}

function stackedBar(segments) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const bar = segments.map((s) => (s.value ? `<span class="seg ${s.kind}" style="width:${(s.value / total) * 100}%" title="${esc(s.label)}: ${s.value}"></span>` : '')).join('');
  const legend = segments.map((s) => `<span class="leg"><i class="dot ${s.kind}"></i>${esc(s.label)} <b>${s.value}</b></span>`).join('');
  return `<div class="bar">${bar}</div><div class="legend">${legend}</div>`;
}
// A doughnut chart: each segment is an arc on a single ring, with a value in the centre
// and a legend beside it. Colours come from the semantic solid tokens.
function donut(segments, opts = {}) {
  const total = segments.reduce((a, s) => a + (s.value || 0), 0);
  const size = opts.size || 168; const sw = opts.sw || 24; const r = (size - sw) / 2 - 2; const c = size / 2; const C = 2 * Math.PI * r;
  let acc = 0;
  const arcs = total ? segments.filter((s) => s.value > 0).map((s) => {
    const frac = s.value / total;
    const el = `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="var(--${s.kind || 'neutral'}-solid)" stroke-width="${sw}" stroke-dasharray="${(frac * C).toFixed(2)} ${(C - frac * C).toFixed(2)}" stroke-dashoffset="${(-acc * C).toFixed(2)}" transform="rotate(-90 ${c} ${c})"><title>${esc(s.label)}: ${s.value}</title></circle>`;
    acc += frac; return el;
  }).join('') : `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="var(--line-2)" stroke-width="${sw}"/>`;
  const legend = `<div class="legend">${segments.map((s) => `<span class="leg"><i class="dot ${s.kind || 'neutral'}"></i>${esc(s.label)} <b>${s.value}</b></span>`).join('')}</div>`;
  return `<div class="donut-wrap"><svg class="donut" viewBox="0 0 ${size} ${size}" role="img" aria-label="${esc(opts.aria || 'Doughnut chart')}">${arcs}<text x="${c}" y="${c - 1}" class="donut-c" text-anchor="middle">${esc(opts.center != null ? String(opts.center) : String(total))}</text>${opts.sub ? `<text x="${c}" y="${c + 17}" class="donut-s" text-anchor="middle">${esc(opts.sub)}</text>` : ''}</svg>${legend}</div>`;
}
function metricBar(name, value, total) {
  return `<div class="metric-row"><span class="name">${esc(name)}</span><span class="track"><span style="width:${pct(value, total)}%"></span></span><span class="val">${value}</span></div>`;
}
function mini(n, label, kind) { return `<div class="mini ${kind || ''}"><div class="n">${esc(String(n))}</div><div class="l">${esc(label)}</div></div>`; }
// A simple SVG line chart for a series of { date, score } points on a fixed 0 to 100
// scale, used for the readiness trend. Scales to the width of its container.
function sparkline(points) {
  if (!points || points.length < 2) return '<p class="muted">Not enough history yet to show a trend. It will build as the system is used.</p>';
  const W = 600; const H = 150; const padX = 12; const padTop = 14; const padBot = 26;
  const n = points.length;
  const x = (i) => padX + (i * (W - 2 * padX)) / (n - 1);
  const y = (v) => padTop + (1 - Math.max(0, Math.min(100, v)) / 100) * (H - padTop - padBot);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.score).toFixed(1)}`).join(' ');
  const area = `M${x(0).toFixed(1)},${(H - padBot).toFixed(1)} ` + points.map((p, i) => `L${x(i).toFixed(1)},${y(p.score).toFixed(1)}`).join(' ') + ` L${x(n - 1).toFixed(1)},${(H - padBot).toFixed(1)} Z`;
  const grid = [25, 50, 75, 100].map((v) => `<line x1="${padX}" y1="${y(v).toFixed(1)}" x2="${W - padX}" y2="${y(v).toFixed(1)}" class="spark-grid"/><text x="${padX}" y="${(y(v) - 3).toFixed(1)}" class="spark-y">${v}</text>`).join('');
  const dots = points.map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p.score).toFixed(1)}" r="${i === n - 1 ? 4.5 : 2.5}" class="spark-dot${i === n - 1 ? ' last' : ''}"><title>${esc(p.date)}: ${p.score}%</title></circle>`).join('');
  const last = points[n - 1];
  const labels = `<text x="${x(0).toFixed(1)}" y="${H - 7}" class="spark-x">${esc(points[0].date)}</text><text x="${x(n - 1).toFixed(1)}" y="${H - 7}" text-anchor="end" class="spark-x">${esc(last.date)}</text>`;
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" role="img" aria-label="Certification readiness over time">
    <defs><linearGradient id="sparkfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--brand)" stop-opacity="0.25"/><stop offset="100%" stop-color="var(--brand)" stop-opacity="0"/></linearGradient></defs>
    ${grid}
    <path d="${area}" fill="url(#sparkfill)"/>
    <path d="${line}" class="spark-line"/>
    ${dots}
    <text x="${x(n - 1).toFixed(1)}" y="${(y(last.score) - 9).toFixed(1)}" text-anchor="end" class="spark-val">${last.score}%</text>
    ${labels}
  </svg>`;
}

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// A brief, non blocking confirmation message.
function toast(msg, kind = 'ok') {
  let c = document.getElementById('toasts');
  if (!c) { c = document.createElement('div'); c.id = 'toasts'; c.className = 'toasts'; document.body.appendChild(c); }
  const t = document.createElement('div');
  t.className = 'toast ' + kind;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => { t.style.transition = 'opacity 0.3s ease, transform 0.3s ease'; t.style.opacity = '0'; t.style.transform = 'translateY(10px)'; setTimeout(() => t.remove(), 320); }, 2600);
}

// Count whole number and percentage values up to their target.
function animateCounts(root) {
  if (reducedMotion()) return;
  root.querySelectorAll('.kpi .num').forEach((el) => {
    const m = /^(\d+)(%?)$/.exec(el.textContent.trim());
    if (!m) return;
    const target = Number(m[1]); const suffix = m[2]; const dur = 650; const start = performance.now();
    const step = (now) => { const p = Math.min(1, (now - start) / dur); el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))) + suffix; if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}

// Fill each score ring from zero to its value, counting the number up with it.
function animateRings(root) {
  root.querySelectorAll('.ring').forEach((r) => {
    const vEl = r.querySelector('.v');
    const m = vEl && /^(\d+)(%?)$/.exec(vEl.textContent.trim());
    const target = m ? Number(m[1]) : 0; const suffix = m ? m[2] : '';
    if (reducedMotion() || !m) { r.style.setProperty('--p', target); return; }
    const dur = 900; const start = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - start) / dur); const val = target * (1 - Math.pow(1 - p, 3));
      r.style.setProperty('--p', val.toFixed(1));
      vEl.textContent = Math.round(val) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    r.style.setProperty('--p', '0');
    requestAnimationFrame(step);
  });
}

let searchIndexPromise = null;
function loadSearchIndex() {
  if (!searchIndexPromise) searchIndexPromise = import('./search-index.js?v=52').then((m) => m.SEARCH_INDEX).catch(() => []);
  return searchIndexPromise;
}
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
function snippet(text, i, len) {
  const start = Math.max(0, i - 60); const end = Math.min(text.length, i + len + 90);
  return (start > 0 ? '...' : '') + esc(text.slice(start, i)) + '<mark>' + esc(text.slice(i, i + len)) + '</mark>' + esc(text.slice(i + len, end)) + (end < text.length ? '...' : '');
}

function safeUrl(u) { return /^https?:\/\//i.test(u || '') ? u : '#'; }
function mailto(to, subject, body) { return `mailto:${encodeURIComponent(to || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`; }
// Load an RSS or Atom feed into an element. Cross origin feeds that do not allow the
// browser to read them fall back to a link to the source, which is the expected
// behaviour for a static site with no server.
async function loadFeedInto(el, feed) {
  try {
    const res = await fetch(feed.url, { headers: { Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml' } });
    if (!res.ok) throw new Error('status');
    const xml = new DOMParser().parseFromString(await res.text(), 'text/xml');
    const items = [...xml.querySelectorAll('item, entry')].slice(0, 5).map((it) => ({
      title: (it.querySelector('title')?.textContent || '').trim(),
      link: it.querySelector('link')?.getAttribute('href') || it.querySelector('link')?.textContent || feed.link,
      date: (it.querySelector('pubDate, updated, published')?.textContent || '').trim(),
    })).filter((x) => x.title);
    if (!items.length) throw new Error('empty');
    el.innerHTML = items.map((i) => { const d = new Date(i.date); const ds = Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB'); return `<p class="feed-item"><a href="${esc(safeUrl(i.link))}" target="_blank" rel="noopener">${esc(i.title)}</a>${ds ? ` <span class="muted">${esc(ds)}</span>` : ''}</p>`; }).join('');
  } catch {
    el.innerHTML = `<p class="muted">The live feed could not be read in the browser. <a href="${esc(safeUrl(feed.link))}" target="_blank" rel="noopener">View the latest from ${esc(feed.name)}</a>.</p>`;
  }
}

// ---- register intelligence -------------------------------------------------

function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function riskScore(e) { return num(e.likelihood) * num(e.impact); }
function residualScore(e) { return num(e.residualLikelihood) * num(e.residualImpact); }
function riskLevel(s) {
  if (s >= 15) return { label: 'Critical', kind: 'danger' };
  if (s >= 10) return { label: 'High', kind: 'danger' };
  if (s >= 5) return { label: 'Medium', kind: 'warn' };
  if (s >= 1) return { label: 'Low', kind: 'ok' };
  return { label: 'Not scored', kind: 'neutral' };
}
function riskStatusKind(s) { return /open|new/i.test(s) ? 'warn' : /treat|clos|accept|mitigat|resolv/i.test(s) ? 'ok' : 'neutral'; }
function ncStatusKind(s) { return /clos|resolv|verif|complet/i.test(s) ? 'ok' : /progress/i.test(s) ? 'warn' : 'danger'; }
function auditStatusKind(s) { return /complet|clos/i.test(s) ? 'ok' : /progress/i.test(s) ? 'warn' : 'neutral'; }
function classKind(c) { return ({ Restricted: 'danger', Confidential: 'warn', Internal: 'info', Public: 'neutral' })[c] || 'neutral'; }
function isUkEu(loc) { return /\b(uk|eu|united kingdom|ireland|europe|eea|germany|france|netherlands|frankfurt|dublin)\b/i.test(loc || ''); }
function overdue(iso) { const t = new Date(iso).getTime(); return Number.isFinite(t) && t < Date.now(); }
function dueSoon(iso) { const t = new Date(iso).getTime(); return Number.isFinite(t) && t >= Date.now() && t <= Date.now() + 30 * 86400000; }
function reviewCell(iso) {
  if (!iso) return '<span class="muted">-</span>';
  if (overdue(iso)) return `<span class="overdue-date">${fmtDate(iso)}</span> ${pill('overdue', 'danger')}`;
  if (dueSoon(iso)) return `<span class="soon-date">${fmtDate(iso)}</span> ${pill('soon', 'warn')}`;
  return fmtDate(iso);
}
function isStale(iso) { const t = new Date(iso).getTime(); return Number.isFinite(t) && t < Date.now() - 365 * 86400000; }
function ageCell(iso) {
  if (!iso) return '<span class="muted">-</span>';
  return isStale(iso) ? `${fmtDate(iso)} ${pill('dated', 'warn')}` : fmtDate(iso);
}
const CONTROL_REFS = new Set(CONTROLS.map((c) => c.ref));
function controlChips(s) {
  const refs = (s || '').split(/[,;]/).map((x) => x.trim()).filter(Boolean);
  return refs.length ? refs.map((r) => (CONTROL_REFS.has(r) ? `<a class="chip" href="#/control/${esc(r)}">${esc(r)}</a>` : `<span class="chip">${esc(r)}</span>`)).join('') : '<span class="muted">-</span>';
}
// For a register entry that names Annex A controls, how many of those controls are
// implemented or verified in the Statement of Applicability. Used to show whether a
// risk's treatment is actually in place, not just planned.
function controlCoverage(relatedControls, soaByRef) {
  const refs = String(relatedControls || '').split(/[,;]/).map((x) => x.trim()).filter((r) => CONTROL_REFS.has(r));
  const implemented = refs.filter((r) => { const s = soaByRef[r]; return s && s.applicable === true && ['Implemented', 'Verified'].includes(s.status); }).length;
  return { total: refs.length, implemented };
}

function riskMatrix(rows) {
  const at = (l, i) => rows.filter((r) => num(r.likelihood) === l && num(r.impact) === i).length;
  let h = '<table class="matrix"><thead><tr><th></th>' + [1, 2, 3, 4, 5].map((l) => `<th>L${l}</th>`).join('') + '</tr></thead><tbody>';
  for (let i = 5; i >= 1; i--) {
    h += `<tr><th>I${i}</th>`;
    for (let l = 1; l <= 5; l++) {
      const c = at(l, i); const lv = riskLevel(l * i);
      const sel = riskCell && riskCell.l === l && riskCell.i === i ? ' sel' : '';
      h += `<td class="heat ${lv.kind} ${c ? '' : 'empty'}${sel}" data-l="${l}" data-i="${i}" title="Likelihood ${l}, impact ${i}, score ${l * i}: ${c} risk${c === 1 ? '' : 's'}">${c || '0'}</td>`;
    }
    h += '</tr>';
  }
  return h + '</tbody></table>';
}

// Per register display: the columns shown and how each row is rendered, with an
// optional default sort. Falls back to the raw fields when a register has no entry.
const REG_DISPLAY = {
  risk: {
    columns: [{ key: 'riskId', label: 'Risk ID' }, { key: 'description', label: 'Description' }, { key: 'inherent', label: 'Inherent' }, { key: 'residual', label: 'Residual' }, { key: 'treatment', label: 'Treatment' }, { key: 'controls', label: 'Controls' }, { key: 'owner', label: 'Owner' }, { key: 'status', label: 'Status' }, { key: 'review', label: 'Review' }],
    sort: (a, b) => riskScore(b) - riskScore(a),
    row: (e) => {
      const s = riskScore(e); const lv = riskLevel(s);
      const rs = residualScore(e); const rlv = riskLevel(rs);
      return { riskId: esc(e.riskId), description: esc(e.description),
        inherent: `<b>${s || '-'}</b> ${pill(lv.label, lv.kind)}`,
        residual: rs ? `<b>${rs}</b> ${pill(rlv.label, rlv.kind)}` : '<span class="muted">-</span>',
        treatment: `<span class="chip">${esc(e.treatment || '-')}</span>`, controls: controlChips(e.relatedControls), owner: esc(e.owner), status: pill(e.status || '-', riskStatusKind(e.status)), review: reviewCell(e.reviewDate) };
    },
  },
  asset: {
    columns: [{ key: 'assetId', label: 'Asset ID' }, { key: 'name', label: 'Name' }, { key: 'type', label: 'Type' }, { key: 'owner', label: 'Owner' }, { key: 'classification', label: 'Classification' }, { key: 'status', label: 'Status' }],
    row: (e) => ({ assetId: esc(e.assetId), name: esc(e.name), type: esc(e.type), owner: esc(e.owner), classification: pill(e.classification || '-', classKind(e.classification)), status: esc(e.status) }),
  },
  supplier: {
    columns: [{ key: 'supplierId', label: 'Supplier ID' }, { key: 'name', label: 'Name' }, { key: 'service', label: 'Service' }, { key: 'dataLocation', label: 'Data location' }, { key: 'dpa', label: 'DPA' }, { key: 'review', label: 'Review' }],
    row: (e) => ({ supplierId: esc(e.supplierId), name: esc(e.name), service: esc(e.service), dataLocation: `${esc(e.dataLocation || '-')} ${isUkEu(e.dataLocation) ? pill('UK or EU', 'ok') : pill('check residency', 'danger')}`, dpa: /^y/i.test(e.dpa || '') ? pill('Yes', 'ok') : pill('No', 'danger'), review: reviewCell(e.reviewDate) }),
  },
  nonconformity: {
    columns: [{ key: 'ncId', label: 'NC ID' }, { key: 'source', label: 'Source' }, { key: 'description', label: 'Description' }, { key: 'reference', label: 'Reference' }, { key: 'owner', label: 'Owner' }, { key: 'due', label: 'Due' }, { key: 'status', label: 'Status' }],
    row: (e) => ({ ncId: esc(e.ncId), source: esc(e.source), description: esc(e.description), reference: e.reference ? `<span class="chip">${esc(e.reference)}</span>` : '-', owner: esc(e.owner), due: reviewCell(e.dueDate), status: pill(e.status || '-', ncStatusKind(e.status)) }),
  },
  'management-review': {
    columns: [{ key: 'reviewId', label: 'Review ID' }, { key: 'date', label: 'Date' }, { key: 'attendees', label: 'Attendees' }, { key: 'decisions', label: 'Decisions' }],
    row: (e) => ({ __html: true, reviewId: e.id ? `<a href="#/review/${esc(e.id)}">${esc(e.reviewId)}</a>` : esc(e.reviewId), date: esc(fmtDate(e.date)), attendees: esc(e.attendees), decisions: esc(e.decisions) }),
  },
  competence: {
    columns: [{ key: 'person', label: 'Person' }, { key: 'role', label: 'Role' }, { key: 'training', label: 'Training' }, { key: 'date', label: 'Completed' }],
    row: (e) => ({ person: esc(e.person), role: esc(e.role), training: esc(e.training), date: esc(fmtDate(e.date)) }),
  },
  legal: {
    columns: [{ key: 'requirement', label: 'Requirement' }, { key: 'source', label: 'Source' }, { key: 'owner', label: 'Owner' }, { key: 'review', label: 'Review' }],
    row: (e) => ({ requirement: esc(e.requirement), source: esc(e.source), owner: esc(e.owner), review: reviewCell(e.reviewDate) }),
  },
  evidence: {
    columns: [{ key: 'evidenceId', label: 'Evidence ID' }, { key: 'title', label: 'Title' }, { key: 'type', label: 'Type' }, { key: 'control', label: 'Control' }, { key: 'date', label: 'Date' }, { key: 'owner', label: 'Owner' }, { key: 'location', label: 'Location' }],
    sort: (a, b) => String(b.date || '').localeCompare(String(a.date || '')),
    row: (e) => ({ evidenceId: esc(e.evidenceId), title: esc(e.title), type: `<span class="chip">${esc(e.type || '-')}</span>`, control: controlChips(e.controlRef), date: ageCell(e.date), owner: esc(e.owner), location: esc(e.location) }),
  },
  context: {
    columns: [{ key: 'category', label: 'Category' }, { key: 'item', label: 'Issue or party' }, { key: 'requirements', label: 'Requirements' }, { key: 'climate', label: 'Climate' }],
    row: (e) => ({ category: esc(e.category), item: esc(e.item), requirements: esc(e.requirements), climate: /^y/i.test(e.climate || '') ? pill('Yes', 'info') : pill('No', 'neutral') }),
  },
};

// A dumbbell chart of risk reduction: for each risk a line from its inherent score to
// its residual score, so the effect of treatment is visible at a glance. Sorted by
// inherent score so the largest risks are at the top.
function riskReductionChart(risks) {
  const rows = risks.map((r) => ({ id: r.riskId, inh: riskScore(r), res: residualScore(r) || riskScore(r) })).filter((r) => r.inh > 0).sort((a, b) => b.inh - a.inh);
  if (!rows.length) return '';
  const W = 720; const left = 70; const right = 26; const top = 10; const rh = 26; const H = top + rows.length * rh + 24;
  const plotW = W - left - right; const maxS = 25;
  const x = (v) => left + (Math.max(0, Math.min(maxS, v)) / maxS) * plotW;
  const grid = [0, 5, 10, 15, 20, 25].map((v) => `<line x1="${x(v).toFixed(1)}" y1="${top}" x2="${x(v).toFixed(1)}" y2="${(H - 18).toFixed(1)}" class="rr-grid"/><text x="${x(v).toFixed(1)}" y="${H - 4}" class="rr-axis" text-anchor="middle">${v}</text>`).join('');
  const series = rows.map((r, i) => {
    const y = top + i * rh + rh / 2; const xi = x(r.inh); const xr = x(r.res);
    return `<text x="${left - 8}" y="${(y + 3).toFixed(1)}" class="rr-label" text-anchor="end">${esc(r.id)}</text>
      <line x1="${xr.toFixed(1)}" y1="${y.toFixed(1)}" x2="${xi.toFixed(1)}" y2="${y.toFixed(1)}" class="rr-link"/>
      <circle cx="${xi.toFixed(1)}" cy="${y.toFixed(1)}" r="6" class="rr-inh"><title>${esc(r.id)} inherent ${r.inh}</title></circle>
      <circle cx="${xr.toFixed(1)}" cy="${y.toFixed(1)}" r="6" class="rr-res"><title>${esc(r.id)} residual ${r.res}</title></circle>`;
  }).join('');
  return `<svg class="rr" viewBox="0 0 ${W} ${H}" role="img" aria-label="Risk reduction from inherent to residual score">${grid}${series}</svg>`;
}

// Group suppliers by where they process data, so the data residency picture is clear at
// a glance. Anything outside the UK or EU is shown in a danger column.
function dataResidency(suppliers) {
  const bucket = (loc) => {
    const s = String(loc || '');
    if (!isUkEu(loc)) return 'Outside UK or EU';
    const uk = /\buk\b|united kingdom|britain/i.test(s);
    const eu = /\beu\b|eea|europe|ireland|germany|france|netherlands|spain|frankfurt|dublin/i.test(s);
    if (uk && eu) return 'UK and EU';
    if (uk) return 'UK';
    if (eu) return 'EU';
    return 'UK or EU';
  };
  const order = ['UK', 'EU', 'UK and EU', 'UK or EU', 'Outside UK or EU'];
  const groups = {};
  for (const s of suppliers) { const b = bucket(s.dataLocation); (groups[b] = groups[b] || []).push(s); }
  const cols = order.filter((o) => groups[o]).map((region) => {
    const danger = region === 'Outside UK or EU';
    const items = groups[region].map((s) => `<div class="res-item"><span>${esc(s.name)}</span>${/^y/i.test(s.dpa || '') ? pill('DPA', 'ok') : pill('No DPA', 'danger')}</div>`).join('');
    return `<div class="res-col${danger ? ' danger' : ''}"><div class="res-head">${esc(region)} <span class="badge">${groups[region].length}</span></div>${items}</div>`;
  }).join('');
  return cols ? `<div class="res-grid">${cols}</div>` : '';
}

function regSummary(key, rows) {
  if (key === 'risk') {
    const levels = [['Critical', 'danger'], ['High', 'danger'], ['Medium', 'warn'], ['Low', 'ok']];
    const inhSeg = levels.map(([l, k]) => ({ label: l, value: rows.filter((e) => riskLevel(riskScore(e)).label === l).length, kind: k }));
    const resSeg = levels.map(([l, k]) => ({ label: l, value: rows.filter((e) => riskLevel(residualScore(e)).label === l).length, kind: k }));
    const soaByRef = Object.fromEntries(getCollection('soa').map((s) => [s.ref, s]));
    const withControls = rows.filter((e) => controlCoverage(e.relatedControls, soaByRef).total > 0);
    const fullyCovered = withControls.filter((e) => { const c = controlCoverage(e.relatedControls, soaByRef); return c.implemented === c.total; }).length;
    const noControls = rows.length - withControls.length;
    return `<div class="matrix-wrap"><div><div class="matrix-axis" style="margin-bottom:6px">Inherent risk: likelihood across, impact up</div>${riskMatrix(rows)}</div>
      <div style="min-width:260px;flex:1">
        <div class="muted" style="font-size:12px;margin-bottom:4px">Inherent risk levels</div>${stackedBar(inhSeg)}
        <div class="muted" style="font-size:12px;margin:14px 0 4px">Residual risk levels, after treatment</div>${stackedBar(resSeg)}
      </div></div>
      <div class="mini-cards" style="margin-top:14px">${mini(`${fullyCovered}/${withControls.length}`, 'Risks with all controls implemented', fullyCovered === withControls.length ? 'ok' : 'warn')}${mini(noControls, 'Risks with no control named', noControls ? 'warn' : 'ok')}</div>
      <div class="panel-head" style="margin-top:18px"><h3 style="margin:0">Risk reduction through treatment</h3><span class="legend" style="margin:0"><span class="leg"><i class="dot" style="background:var(--danger-solid)"></i>Inherent</span><span class="leg"><i class="dot" style="background:var(--ok-solid)"></i>Residual</span></span></div>
      ${riskReductionChart(rows)}`;
  }
  if (key === 'supplier') {
    const dpa = rows.filter((r) => /^y/i.test(r.dpa || '')).length;
    const due = rows.filter((r) => overdue(r.reviewDate) || dueSoon(r.reviewDate)).length;
    const offshore = rows.filter((r) => !isUkEu(r.dataLocation)).length;
    return `<div class="mini-cards">${mini(rows.length, 'Suppliers')}${mini(dpa, 'DPA in place', dpa === rows.length ? 'ok' : 'warn')}${mini(rows.length - dpa, 'DPA missing', rows.length - dpa ? 'danger' : 'ok')}${mini(offshore, 'Outside UK or EU', offshore ? 'danger' : 'ok')}${mini(due, 'Reviews due or overdue', due ? 'warn' : 'ok')}</div>
      <div class="panel-head" style="margin-top:16px"><h3 style="margin:0">Data residency</h3><span class="muted">Where each sub-processor processes data</span></div>
      ${dataResidency(rows)}`;
  }
  if (key === 'evidence') {
    const linked = rows.filter((e) => CONTROL_REFS.has(String(e.controlRef || '').trim())).length;
    const stale = rows.filter((e) => isStale(e.date)).length;
    const types = new Set(rows.map((e) => e.type).filter(Boolean)).size;
    return `<div class="mini-cards">${mini(rows.length, 'Evidence items')}${mini(linked, 'Linked to a control', linked === rows.length ? 'ok' : 'warn')}${mini(stale, 'Older than 12 months', stale ? 'warn' : 'ok')}${mini(types, 'Types of evidence')}</div>`;
  }
  if (key === 'nonconformity') {
    const open = rows.filter((r) => /open|new/i.test(r.status)).length;
    const prog = rows.filter((r) => /progress/i.test(r.status)).length;
    const closed = rows.filter((r) => /clos|resolv|verif|complet/i.test(r.status)).length;
    const od = rows.filter((r) => overdue(r.dueDate) && !/clos|resolv|verif|complet/i.test(r.status)).length;
    return `<div class="mini-cards">${mini(rows.length, 'Total')}${mini(open, 'Open', open ? 'danger' : 'ok')}${mini(prog, 'In progress', prog ? 'warn' : 'ok')}${mini(closed, 'Closed', 'ok')}${mini(od, 'Overdue', od ? 'danger' : 'ok')}</div>`;
  }
  if (key === 'asset') {
    const seg = ['Restricted', 'Confidential', 'Internal', 'Public'].map((c) => ({ label: c, value: rows.filter((r) => r.classification === c).length, kind: classKind(c) }));
    const sensitive = rows.filter((r) => r.classification === 'Restricted' || r.classification === 'Confidential').length;
    return `<div class="mini-cards" style="margin-bottom:12px">${mini(rows.length, 'Assets')}${mini(sensitive, 'Confidential or restricted', sensitive ? 'warn' : 'ok')}</div>${stackedBar(seg)}`;
  }
  if (key === 'audit') {
    const complete = rows.filter((r) => /complet/i.test(r.status)).length;
    const planned = rows.filter((r) => /plan|schedul/i.test(r.status)).length;
    const next = rows.filter((r) => /plan|schedul/i.test(r.status)).map((r) => r.date).filter(Boolean).sort()[0];
    return `<div class="mini-cards">${mini(rows.length, 'Audits')}${mini(complete, 'Complete', 'ok')}${mini(planned, 'Planned', planned ? 'warn' : 'ok')}${mini(next ? fmtDate(next) : '-', 'Next planned')}</div>`;
  }
  if (key === 'management-review') {
    const dates = rows.map((r) => r.date).filter(Boolean).sort();
    const last = dates.filter((d) => new Date(d) <= new Date()).pop();
    const next = dates.find((d) => new Date(d) > new Date());
    return `<div class="mini-cards">${mini(rows.length, 'Reviews logged')}${mini(last ? fmtDate(last) : '-', 'Last review')}${mini(next ? fmtDate(next) : '-', 'Next scheduled')}</div>`;
  }
  if (key === 'competence') {
    const last = rows.map((r) => r.date).filter(Boolean).sort().pop();
    return `<div class="mini-cards">${mini(rows.length, 'Training records')}${mini(last ? fmtDate(last) : '-', 'Most recent')}</div>`;
  }
  if (key === 'legal') {
    const due = rows.filter((r) => overdue(r.reviewDate) || dueSoon(r.reviewDate)).length;
    return `<div class="mini-cards">${mini(rows.length, 'Obligations')}${mini(due, 'Reviews due or overdue', due ? 'warn' : 'ok')}</div>`;
  }
  if (key === 'context') {
    const climate = rows.filter((r) => /^y/i.test(r.climate || '')).length;
    const parties = rows.filter((r) => /party/i.test(r.category)).length;
    return `<div class="mini-cards">${mini(rows.length, 'Entries')}${mini(parties, 'Interested parties')}${mini(climate, 'Climate related', climate ? 'info' : '')}</div>`;
  }
  return `<div class="mini-cards">${mini(rows.length, 'Entries')}</div>`;
}

// ---- documents and lifecycle ----------------------------------------------

const TRANSITIONS = {
  submit: { from: ['Draft', 'Under Revision'], to: 'In Review', roles: ['Document Owner', 'ISMS Manager'], label: 'Submit for review' },
  review: { from: ['In Review'], to: 'Approved', roles: ['Reviewer', 'ISMS Manager'], label: 'Complete review' },
  publish: { from: ['Approved'], to: 'Published', roles: ['Approver', 'ISMS Manager'], label: 'Approve and publish' },
  startRevision: { from: ['Published'], to: 'Under Revision', roles: ['Document Owner', 'ISMS Manager'], label: 'Start revision' },
  retire: { from: ['Published', 'Approved', 'Under Revision'], to: 'Retired', roles: ['ISMS Manager'], label: 'Retire' },
};

function bumpVersion(v) {
  const [maj, min] = String(v || '1.0').split('.');
  return `${maj}.${Number(min || 0) + 1}`;
}

function applyTransition(doc, action) {
  const t = TRANSITIONS[action];
  if (!t.from.includes(doc.status)) throw new Error(`Cannot ${action} a document that is ${doc.status}.`);
  if (!can(...t.roles)) throw new Error('Your selected role cannot perform this action.');
  if (action === 'publish' && doc.author && doc.author === getSettings().user && role() !== 'Administrator') {
    throw new Error('The author of a document cannot publish it. Switch to a separate approver role.');
  }
  const active = doc.versions.find((v) => ['Draft', 'In Review', 'Approved'].includes(v.status));
  if (action === 'submit' && active) active.status = 'In Review';
  else if (action === 'review' && active) active.status = 'Approved';
  else if (action === 'publish' && active) {
    const prior = doc.versions.find((v) => v.status === 'Published');
    if (prior) prior.status = 'Superseded';
    active.status = 'Published';
    active.publishedAt = new Date().toISOString();
    doc.currentVersion = active.number;
    doc.lastApprovedAt = active.publishedAt;
    doc.nextReviewDate = addMonths(active.publishedAt, doc.reviewMonths);
  } else if (action === 'startRevision') {
    doc.versions.unshift({ number: bumpVersion(doc.currentVersion || '1.0'), status: 'Draft', changeSummary: '', createdAt: new Date().toISOString(), publishedAt: null });
  }
  doc.status = t.to;
}

// ---- views -----------------------------------------------------------------

function shell(active) {
  const nav = ['dashboard', 'readiness', 'calendar', 'documents', 'framework', 'soa', 'aims', 'architecture', 'registers', 'audits', 'certbody'];
  if (can('ISMS Manager')) nav.push('audit');
  nav.push('search', 'settings');
  const links = nav.map((key) => `<a href="#/${key}" class="${active === key ? 'active' : ''}"><span class="nav-ic">${ICONS[key] || ''}</span>${esc(t('nav.' + key))}</a>`).join('');
  const roleOptions = CONFIG.roles.map((r) => `<option ${r === role() ? 'selected' : ''}>${r}</option>`).join('');
  const langOptions = LANGUAGES.map((l) => `<option value="${l.code}" ${l.code === lang() ? 'selected' : ''}>${esc(l.name)}</option>`).join('');
  app.innerHTML = `
    <aside class="sidebar">
      <h1><img class="logo" src="assets/cloudax-logo-white.png" alt="Cloudax" /></h1>
      <div class="org">${esc(t('chrome.org'))}</div>
      <nav aria-label="Primary">${links}</nav>
      <div class="foot">${esc(t('chrome.footer'))}</div>
    </aside>
    <div class="content">
      <header class="topbar">
        <div class="topbar-left">
          <div class="crumb">Cloudax ISMS <span aria-hidden="true">/</span> <b>${esc(routeTitle(active))}</b></div>
        </div>
        <div class="topbar-actions">
          <button class="topbar-search" id="cmdk-open" aria-label="${esc(t('chrome.search'))}">${ICONS.search}<span>${esc(t('chrome.search'))}</span><span class="sk"><kbd>${IS_MAC ? 'Cmd' : 'Ctrl'}</kbd><kbd>K</kbd></span></button>
          <button class="icon-btn" id="theme-toggle" title="Toggle dark mode" aria-label="Toggle dark mode">${currentTheme() === 'dark' ? ICONS.sun : ICONS.moon}</button>
          <label for="lang" class="sr-only">${esc(t('chrome.language'))}</label>
          <select id="lang" aria-label="${esc(t('chrome.language'))}" title="${esc(t('chrome.language'))}">${langOptions}</select>
          <label for="role">${esc(t('chrome.actingAs'))}</label>
          <select id="role" aria-label="${esc(t('chrome.actingAs'))}">${roleOptions}</select>
        </div>
      </header>
      <main class="main" id="view" tabindex="-1"></main>
    </div>`;
  document.getElementById('role').addEventListener('change', (e) => {
    setSettings({ ...getSettings(), role: e.target.value });
    audit('RoleChanged', 'Settings', `Acting as ${e.target.value}`);
    navigate();
  });
  document.getElementById('lang').addEventListener('change', (e) => {
    setSettings({ ...getSettings(), lang: e.target.value });
    applyLang();
    audit('Updated', 'Settings', `Interface language ${e.target.value}`);
    navigate();
  });
  const ck = document.getElementById('cmdk-open'); if (ck) ck.addEventListener('click', openPalette);
  const tt = document.getElementById('theme-toggle'); if (tt) tt.addEventListener('click', () => { toggleTheme(); navigate(); });
}

function viewEl() { return document.getElementById('view'); }

function renderDashboard() {
  const docs = getCollection('documents');
  const soa = getCollection('soa');
  const now = Date.now();
  const dueWindow = now + CONFIG.reviewDueWithinDays * 86400000;
  const published = docs.filter((d) => d.status === 'Published');
  const withReview = published.filter((d) => d.nextReviewDate);
  const overdueDocs = withReview.filter((d) => new Date(d.nextReviewDate).getTime() < now);
  const dueDocs = withReview.filter((d) => { const t = new Date(d.nextReviewDate).getTime(); return t >= now && t <= dueWindow; });

  const applicable = soa.filter((s) => s.applicable === true).length;
  const excluded = soa.filter((s) => s.applicable === false).length;
  const undecided = soa.length - applicable - excluded;
  const documented = soa.filter((s) => (s.docRefs || []).length > 0).length;
  const implCounts = CONFIG.implementationStatuses.map((st) => ({ label: st, value: soa.filter((s) => s.applicable === true && s.status === st).length, kind: statusKind(st) }));

  const aims = getCollection('aimsSoa');
  const aimsApplicable = aims.filter((s) => s.applicable === true).length;
  const aimsExcluded = aims.filter((s) => s.applicable === false).length;
  const aimsUndecided = aims.length - aimsApplicable - aimsExcluded;
  const aimsImplemented = aims.filter((s) => s.applicable === true && ['Implemented', 'Verified'].includes(s.status)).length;
  const aimsImplCounts = CONFIG.implementationStatuses.map((st) => ({ label: st, value: aims.filter((s) => s.applicable === true && s.status === st).length, kind: statusKind(st) }));

  const bySystem = {};
  for (const d of docs) bySystem[d.system || 'Other'] = (bySystem[d.system || 'Other'] || 0) + 1;
  const statusCounts = CONFIG.statuses.map((st) => ({ st, n: docs.filter((d) => d.status === st).length })).filter((x) => x.n);

  const linkedRefs = new Set(docs.flatMap((d) => d.clauseRefs || []));
  const mandatory = CLAUSES.filter((c) => c.mandatory.length > 0);
  const gaps = mandatory.filter((c) => !linkedRefs.has(c.number));
  const log = getCollection('audit').slice(0, 10);
  const upcoming = withReview.slice().sort((a, b) => new Date(a.nextReviewDate) - new Date(b.nextReviewDate)).slice(0, 8);

  const risks = getCollection('register.risk');
  const riskSeg = [['Critical', 'danger'], ['High', 'danger'], ['Medium', 'warn'], ['Low', 'ok']].map(([l, k]) => ({ label: l, value: risks.filter((e) => riskLevel(riskScore(e)).label === l).length, kind: k }));
  const ncs = getCollection('register.nonconformity');
  const ncOpen = ncs.filter((r) => !/clos|resolv|verif|complet/i.test(r.status)).length;
  const ncOverdue = ncs.filter((r) => overdue(r.dueDate) && !/clos|resolv|verif|complet/i.test(r.status)).length;
  const suppliers = getCollection('register.supplier');
  const supDue = suppliers.filter((r) => overdue(r.reviewDate) || dueSoon(r.reviewDate)).length;
  const supNoDpa = suppliers.filter((r) => !/^y/i.test(r.dpa || '')).length;
  const nextAudit = getCollection('audits').filter((a) => /plan|schedul/i.test(a.status)).map((a) => a.plannedDate).filter(Boolean).sort()[0];
  const lastMr = getCollection('register.management-review').map((r) => r.date).filter(Boolean).sort().filter((d) => new Date(d) <= new Date()).pop();

  const checks = readinessData();
  const readyScore = pct(checks.filter((c) => c.ok).length, checks.length);
  recordReadiness(readyScore);
  const audits = getCollection('audits');
  const openFindings = audits.flatMap((a) => a.findings || []).filter((f) => !/clos/i.test(f.status)).length;
  const settings = getSettings();
  const feeds = (settings.feeds && settings.feeds.length) ? settings.feeds : CONFIG.feeds;

  const attention = [];
  for (const d of overdueDocs) attention.push({ what: `Document review overdue: ${d.ref} ${d.title}`, owner: d.owner, due: fmtDate(d.nextReviewDate) });
  for (const a of audits) for (const f of (a.findings || [])) if (!/clos/i.test(f.status)) attention.push({ what: `Open audit finding (${a.ref}): ${f.description}`, owner: f.owner, due: fmtDate(f.dueDate) });
  for (const r of ncs) if (overdue(r.dueDate) && !/clos|resolv|verif|complet/i.test(r.status)) attention.push({ what: `Overdue corrective action: ${r.description}`, owner: r.owner, due: fmtDate(r.dueDate) });
  for (const r of suppliers) if (overdue(r.reviewDate) || dueSoon(r.reviewDate)) attention.push({ what: `Supplier review due: ${r.name}`, owner: 'Procurement Lead', due: fmtDate(r.reviewDate) });
  const summaryBody = `Cloudax ISMS summary\n\nCertification readiness: ${readyScore}%\nReviews overdue: ${overdueDocs.length}\nOpen audit findings: ${openFindings}\nOpen nonconformities: ${ncOpen}\n\nItems needing attention:\n` + (attention.length ? attention.map((a) => `- ${a.what} (owner: ${a.owner || 'unassigned'}${a.due ? `, due ${a.due}` : ''})`).join('\n') : '- None') + '\n\nSent from the Cloudax ISMS.';

  const kpi = (cls, ic, num, label, sub, href) => {
    const tag = href ? 'a' : 'div';
    return `<${tag} class="kpi ${cls}"${href ? ` href="${href}"` : ''}><div class="kpi-top"><span class="label">${esc(label)}</span><span class="kpi-ic">${ic}</span></div>
      <div class="num">${num}</div>${sub ? `<div class="sub">${esc(sub)}</div>` : ''}</${tag}>`;
  };

  viewEl().innerHTML = `
    <h2>${esc(routeTitle('dashboard'))}</h2>
    <div class="cards">
      ${kpi(readyScore >= 90 ? 'ok' : 'warn', ICONS.readiness, `${readyScore}%`, t('title.readiness'), `${checks.filter((c) => c.ok).length} of ${checks.length} checks met`, '#/readiness')}
      ${kpi('', ICONS.documents, docs.length, t('dash.documents'), `${published.length} published`, '#/documents')}
      ${kpi('ok', ICONS.soa, `${pct(applicable, soa.length)}%`, t('dash.controlsApplicable'), `${applicable} of ${soa.length} Annex A`, '#/soa')}
      ${kpi(aimsApplicable && aimsImplemented === aimsApplicable ? 'ok' : 'warn', ICONS.aims, `${pct(aimsImplemented, aimsApplicable)}%`, t('dash.aiImplemented'), `${aimsImplemented} of ${aimsApplicable} ISO 42001`, '#/aims')}
      ${kpi(overdueDocs.length ? 'danger' : 'ok', ICONS.audit, overdueDocs.length, t('dash.reviewsOverdue'), `${dueDocs.length} due within ${CONFIG.reviewDueWithinDays} days`, '#/documents')}
      ${kpi(openFindings ? 'warn' : 'ok', ICONS.audits, openFindings, t('dash.openFindings'), 'across the programme', '#/audits')}
      ${kpi(gaps.length ? 'warn' : 'ok', ICONS.framework, gaps.length, t('dash.clauseGaps'), `${mandatory.length - gaps.length} of ${mandatory.length} clauses covered`, '#/framework')}
    </div>

    <div class="grid-2">
      <div class="panel">
        <div class="panel-head"><h3>${esc(t('dash.actions'))}</h3>${attention.length ? `<span class="pill warn">${attention.length}</span>` : '<span class="pill ok">clear</span>'}</div>
        ${attention.length ? `<div class="attn">${attention.slice(0, 8).map((a) => `<div class="attn-row"><span>${esc(a.what)}${a.due ? ` <span class="muted">due ${esc(a.due)}</span>` : ''}</span><a class="chip" href="${mailto(settings.notifyEmail, 'Cloudax ISMS: ' + a.what, `Owner: ${a.owner || 'unassigned'}\nDue: ${a.due || 'not set'}\n\nSent from the Cloudax ISMS.`)}">Email</a></div>`).join('')}</div>${attention.length > 8 ? `<p class="muted">and ${attention.length - 8} more.</p>` : ''}` : '<p class="muted">Nothing needs attention. Reviews, audit findings, corrective actions and supplier reviews are up to date.</p>'}
        <div class="toolbar" style="margin-top:12px"><a class="email-btn" href="${mailto(settings.notifyEmail, 'Cloudax ISMS summary', summaryBody)}">Email this summary</a>${settings.notifyEmail ? `<span class="muted">to ${esc(settings.notifyEmail)}</span>` : '<span class="muted">Set a recipient in Settings.</span>'}</div>
      </div>
      <div class="panel">
        <div class="panel-head"><h3>${esc(t('dash.feeds'))}</h3><a href="#/settings">Sources</a></div>
        ${feeds.map((f) => `<div class="feed"><div class="feed-name">${esc(f.label || f.name)}</div><div class="feed-body" data-feed="${esc(f.name)}"><p class="muted"><span class="spinner"></span>Loading the latest...</p></div></div>`).join('')}
      </div>
    </div>

    <div class="grid-2" style="margin-top:18px">
      <div class="panel">
        <div class="panel-head"><h3>${esc(t('dash.annexApplicability'))}</h3><span class="muted">${soa.length} controls</span></div>
        ${stackedBar([
          { label: 'Applicable', value: applicable, kind: 'ok' },
          { label: 'Excluded', value: excluded, kind: 'neutral' },
          { label: 'Undecided', value: undecided, kind: 'warn' },
        ])}
      </div>
      <div class="panel">
        <div class="panel-head"><h3>${esc(t('dash.implementation'))}</h3><span class="muted">${applicable} applicable</span></div>
        ${applicable ? donut(implCounts, { center: pct(soa.filter((s) => s.applicable === true && ['Implemented', 'Verified'].includes(s.status)).length, applicable) + '%', sub: 'done', aria: 'Implementation of applicable controls' }) : '<p class="muted">No controls are marked applicable yet.</p>'}
      </div>
    </div>

    <div class="grid-2" style="margin-top:18px">
      <div class="panel">
        <div class="panel-head"><h3>${esc(t('dash.aiApplicability'))}</h3><a href="#/aims">ISO 42001</a></div>
        ${stackedBar([
          { label: 'Applicable', value: aimsApplicable, kind: 'ok' },
          { label: 'Excluded', value: aimsExcluded, kind: 'neutral' },
          { label: 'Undecided', value: aimsUndecided, kind: 'warn' },
        ])}
      </div>
      <div class="panel">
        <div class="panel-head"><h3>${esc(t('dash.aiImplementation'))}</h3><span class="muted">${aimsApplicable} applicable</span></div>
        ${aimsApplicable ? donut(aimsImplCounts, { center: pct(aimsImplemented, aimsApplicable) + '%', sub: 'done', aria: 'AI control implementation' }) : '<p class="muted">No AI controls are marked applicable yet.</p>'}
      </div>
    </div>

    <div class="grid-2" style="margin-top:18px">
      <div class="panel">
        <div class="panel-head"><h3>${esc(t('dash.docsBySystem'))}</h3><a href="#/documents">Open</a></div>
        ${Object.entries(bySystem).map(([k, v]) => metricBar(k, v, docs.length)).join('') || '<p class="muted">No documents.</p>'}
        <div class="legend" style="margin-top:14px">${statusCounts.map((x) => `<span class="leg">${pill(x.st, statusKind(x.st))} <b>${x.n}</b></span>`).join('')}</div>
      </div>
      <div class="panel">
        <div class="panel-head"><h3>${esc(t('dash.upcomingReviews'))}</h3>${overdueDocs.length ? `<span class="pill danger">${overdueDocs.length} overdue</span>` : '<span class="muted">on track</span>'}</div>
        ${upcoming.length ? table(
          [{ key: 'ref', label: 'Reference' }, { key: 'title', label: 'Title' }, { key: 'due', label: 'Review by' }],
          upcoming.map((d) => ({ __html: true, ref: `<a href="#/documents/${d.id}">${esc(d.ref)}</a>`, title: esc(d.title), due: `${fmtDate(d.nextReviewDate)} ${new Date(d.nextReviewDate).getTime() < now ? pill('overdue', 'danger') : ''}` })),
        ) : '<p class="muted">No published documents carry a review date.</p>'}
      </div>
    </div>

    <div class="grid-2" style="margin-top:18px">
      <div class="panel">
        <div class="panel-head"><h3>${esc(t('dash.riskProfile'))}</h3><a href="#/registers">Open registers</a></div>
        ${risks.length ? stackedBar(riskSeg) : '<p class="muted">No risks recorded.</p>'}
      </div>
      <div class="panel">
        <div class="panel-head"><h3>${esc(t('dash.governance'))}</h3></div>
        <div class="mini-cards">
          ${mini(ncOpen, 'Open nonconformities', ncOpen ? 'warn' : 'ok')}
          ${mini(ncOverdue, 'Overdue actions', ncOverdue ? 'danger' : 'ok')}
          ${mini(supDue, 'Supplier reviews due', supDue ? 'warn' : 'ok')}
          ${mini(supNoDpa, 'Suppliers without DPA', supNoDpa ? 'danger' : 'ok')}
          ${mini(nextAudit ? fmtDate(nextAudit) : '-', 'Next internal audit')}
          ${mini(lastMr ? fmtDate(lastMr) : '-', 'Last management review')}
        </div>
      </div>
    </div>

    <div class="panel" style="margin-top:18px">
      <div class="panel-head"><h3>${esc(t('dash.recentActivity'))}</h3><a href="#/audit">View all</a></div>
      ${table(
        [{ key: 'ts', label: 'When' }, { key: 'actor', label: 'Who' }, { key: 'action', label: 'Action' }, { key: 'detail', label: 'Detail' }],
        log.map((a) => ({ ts: a.ts.slice(0, 16).replace('T', ' '), actor: a.actor, action: `${a.action} ${a.entity}`, detail: a.detail })),
      )}
    </div>`;
  animateCounts(viewEl());
  feeds.forEach((f) => { const el = viewEl().querySelector(`.feed-body[data-feed="${CSS.escape(f.name)}"]`); if (el) loadFeedInto(el, f); });
}

function table(columns, rows) {
  if (!rows.length) return '<p class="muted">No entries.</p>';
  const head = columns.map((c) => `<th>${esc(c.label)}</th>`).join('');
  const body = rows.map((r) => `<tr>${columns.map((c) => `<td>${r.__html ? r[c.key] : esc(r[c.key])}</td>`).join('')}</tr>`).join('');
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

const docFilter = { system: 'All', q: '' };
function renderDocuments() {
  const all = getCollection('documents');
  const systems = ['All', ...Array.from(new Set(all.map((d) => d.system).filter(Boolean)))];
  const createForm = can('Document Owner', 'ISMS Manager') ? `
    <details class="panel"><summary>New document</summary>
      <form id="doc-form">
        <label for="dtitle">Title</label><input id="dtitle" required />
        <div class="row">
          <div style="flex:1"><label for="dtype">Type</label><select id="dtype">${Object.keys(CONFIG.prefixes).map((t) => `<option>${t}</option>`).join('')}</select></div>
          <div style="flex:1"><label for="dclass">Classification</label><select id="dclass">${CONFIG.classifications.map((c) => `<option>${c}</option>`).join('')}</select></div>
        </div>
        <p><button type="submit">Create</button></p>
      </form>
    </details>` : '';
  const filterBar = `<div class="toolbar">
      <label for="docsys">System</label>
      <select id="docsys" aria-label="Filter by system">${systems.map((x) => `<option ${x === docFilter.system ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>
      <input id="docq" placeholder="Filter by reference or title" value="${esc(docFilter.q)}" style="width:260px" aria-label="Filter documents" />
      <span class="badge" id="doc-count"></span>
    </div>`;
  viewEl().innerHTML = `<h2>${esc(routeTitle('documents'))}</h2>${createForm}${filterBar}<div class="panel" id="docs-table"></div>`;
  const columns = [{ key: 'ref', label: 'Reference' }, { key: 'system', label: 'System' }, { key: 'title', label: 'Title' }, { key: 'type', label: 'Type' }, { key: 'classification', label: 'Class' }, { key: 'status', label: 'Status' }, { key: 'version', label: 'Version' }, { key: 'review', label: 'Review by' }];
  const draw = () => {
    const q = docFilter.q.trim().toLowerCase();
    const docs = all.filter((d) =>
      (docFilter.system === 'All' || d.system === docFilter.system) &&
      (!q || (`${d.ref} ${d.title}`).toLowerCase().includes(q)));
    const rows = docs.map((d) => ({
      __html: true,
      ref: `<a href="#/documents/${d.id}">${esc(d.ref)}</a>`,
      system: esc(d.system || '-'),
      title: esc(d.title), type: esc(d.type), classification: esc(d.classification),
      status: pill(d.status), version: esc(d.currentVersion || '-'),
      review: fmtDate(d.nextReviewDate) || '-',
    }));
    document.getElementById('docs-table').innerHTML = table(columns, rows);
    document.getElementById('doc-count').textContent = `${docs.length} of ${all.length}`;
  };
  document.getElementById('docsys').addEventListener('change', (e) => { docFilter.system = e.target.value; draw(); });
  document.getElementById('docq').addEventListener('input', (e) => { docFilter.q = e.target.value; draw(); });
  draw();
  const form = document.getElementById('doc-form');
  if (form) form.addEventListener('submit', (e) => {
    e.preventDefault();
    const type = document.getElementById('dtype').value;
    const doc = {
      id: cid(), ref: nextReference(type), title: document.getElementById('dtitle').value.trim(),
      type, classification: document.getElementById('dclass').value, status: 'Draft',
      owner: getSettings().user, author: getSettings().user, approver: '', reviewMonths: CONFIG.defaultReviewMonths,
      lastApprovedAt: null, nextReviewDate: null, clauseRefs: [], controlRefs: [], currentVersion: null,
      versions: [{ number: '1.0', status: 'Draft', changeSummary: '', createdAt: new Date().toISOString(), publishedAt: null }],
    };
    const docs2 = getCollection('documents');
    docs2.unshift(doc);
    setCollection('documents', docs2);
    audit('Created', 'Document', `${doc.ref} ${doc.title}`);
    go('documents/' + doc.id);
  });
}

function renderDocumentDetail(id) {
  const docs = getCollection('documents');
  const doc = docs.find((d) => d.id === id);
  if (!doc) { viewEl().innerHTML = '<p class="error">Document not found.</p>'; return; }
  const actions = Object.entries(TRANSITIONS)
    .filter(([, t]) => t.from.includes(doc.status) && can(...t.roles))
    .map(([key, t]) => `<button class="secondary" data-act="${key}">${t.label}</button>`).join(' ');
  const allRefs = CONTROLS.map((c) => c.ref);
  const soaByRef = Object.fromEntries(getCollection('soa').map((s) => [s.ref, s]));
  const ctrlByRef = Object.fromEntries(CONTROLS.map((c) => [c.ref, c]));
  const controlsAddressed = (doc.controlRefs || []).length ? `
    <div class="panel">
      <div class="panel-head"><h3>Controls addressed</h3><span class="muted">${doc.controlRefs.length} Annex A controls, applicability from the Statement of Applicability</span></div>
      ${table(
        [{ key: 'ref', label: 'Control' }, { key: 'title', label: 'Title' }, { key: 'app', label: 'Applicable' }, { key: 'impl', label: 'Implementation' }],
        doc.controlRefs.map((ref) => {
          const s = soaByRef[ref];
          return { __html: true, ref: CONTROL_REFS.has(ref) ? `<a href="#/control/${esc(ref)}">${esc(ref)}</a>` : esc(ref), title: esc(ctrlByRef[ref] ? ctrlByRef[ref].title : ''),
            app: s ? applicablePill(s.applicable) : '<span class="muted">-</span>',
            impl: s && s.applicable === true ? pill(s.status, statusKind(s.status)) : '<span class="muted">-</span>' };
        }),
      )}
    </div>` : '';
  const isPdf = /\.pdf$/i.test(doc.file || '');
  const readerPanel = doc.file ? `
    <div class="panel">
      <div class="panel-head"><h3>Document content</h3><a href="${encodeURI(doc.file)}" download>Download original</a></div>
      ${isPdf
        ? `<iframe class="reader-frame" src="${encodeURI(doc.file)}#view=FitH" title="${esc(doc.title)} document"></iframe>`
        : '<div class="reader" id="doc-reader"><div class="skeleton skeleton-line" style="width:55%"></div><div class="skeleton skeleton-line" style="width:92%"></div><div class="skeleton skeleton-line" style="width:84%"></div><div class="skeleton skeleton-line" style="width:96%"></div><div class="skeleton skeleton-line" style="width:68%"></div></div>'}
    </div>` : '';
  viewEl().innerHTML = `
    <h2>${esc(doc.ref)} ${esc(doc.title)}</h2>
    <div class="panel">
      <p>${pill(doc.status)} ${doc.system ? `<span class="badge">${esc(doc.system)}</span>` : ''} <span class="muted">${esc(doc.type)} | ${esc(doc.classification)} | version ${esc(doc.currentVersion || '1.0')} | reviewed every ${doc.reviewMonths} months</span></p>
      <p class="muted">Owner: ${esc(doc.owner) || 'not set'} | Author: ${esc(doc.author) || 'not set'} ${doc.nextReviewDate ? '| Next review: ' + fmtDate(doc.nextReviewDate) : ''}${doc.file ? ' | Source file: ' + esc(doc.file.split('/').pop()) : ''}</p>
      <div class="toolbar">${actions || '<span class="muted">No actions available for your role at this status.</span>'}</div>
    </div>
    ${readerPanel}
    ${controlsAddressed}
    <div class="panel"><h3>Versions</h3>${table(
      [{ key: 'number', label: 'Version' }, { key: 'status', label: 'Status' }, { key: 'change', label: 'Change summary' }, { key: 'published', label: 'Published' }],
      doc.versions.map((v) => ({ __html: true, number: esc(v.number), status: pill(v.status), change: esc(v.changeSummary || '-'), published: esc(fmtDate(v.publishedAt) || '-') })),
    )}</div>
    <div class="panel">
      <h3>Mapping to the framework</h3>
      <label for="clauseRefs">Linked clauses (comma separated, for example 5.2, 6.1.3)</label>
      <input id="clauseRefs" value="${esc((doc.clauseRefs || []).join(', '))}" ${can('Document Owner', 'ISMS Manager') ? '' : 'disabled'} />
      <label for="controlRefs">Linked Annex A controls (comma separated, for example A.5.1, A.8.9)</label>
      <input id="controlRefs" value="${esc((doc.controlRefs || []).join(', '))}" ${can('Document Owner', 'ISMS Manager') ? '' : 'disabled'} />
      ${can('Document Owner', 'ISMS Manager') ? '<p><button data-act="save-links">Save mapping</button></p>' : ''}
      <p class="muted">Known controls: ${allRefs.length}. Use the references exactly as shown in the Framework view.</p>
    </div>`;
  const readerEl = document.getElementById('doc-reader');
  if (readerEl) {
    fetch(`viewer/${encodeURIComponent(doc.ref)}.html`)
      .then((r) => { if (!r.ok) throw new Error('not found'); return r.text(); })
      .then((html) => { readerEl.innerHTML = html; })
      .catch(() => { readerEl.innerHTML = '<p class="muted">A readable preview is not available for this document. Use Download original above to open the source file.</p>'; });
  }
  viewEl().querySelectorAll('[data-act]').forEach((btn) => btn.addEventListener('click', () => {
    const act = btn.dataset.act;
    try {
      if (act === 'save-links') {
        const parse = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);
        doc.clauseRefs = parse(document.getElementById('clauseRefs').value);
        doc.controlRefs = parse(document.getElementById('controlRefs').value);
        audit('Updated', 'Document', `${doc.ref} mapping`);
      } else {
        applyTransition(doc, act);
        audit('StatusChanged', 'Document', `${doc.ref} ${act} to ${doc.status}`);
      }
      const msg = act === 'save-links' ? 'Mapping saved.' : `${doc.ref} is now ${doc.status}.`;
      setCollection('documents', docs);
      renderDocumentDetail(id);
      toast(msg);
    } catch (err) {
      toast(err.message, 'danger');
    }
  }));
}

const fwFilter = { theme: 'All', app: 'All', impl: 'All', q: '' };
function renderFramework() {
  const docs = getCollection('documents');
  const soaByRef = Object.fromEntries(getCollection('soa').map((s) => [s.ref, s]));
  const docById = Object.fromEntries(docs.map((d) => [d.ref, d.id]));
  const linkedClause = new Set(docs.flatMap((d) => d.clauseRefs || []));
  const linkedControl = (ref) => docs.filter((d) => (d.controlRefs || []).includes(ref)).map((d) => d.ref);
  const gaps = CLAUSES.filter((c) => c.mandatory.length > 0 && !linkedClause.has(c.number));
  const chip = (ref) => (docById[ref] ? `<a class="chip" href="#/documents/${docById[ref]}">${esc(ref)}</a>` : `<span class="chip">${esc(ref)}</span>`);
  const themes = ['All', ...Array.from(new Set(CONTROLS.map((c) => c.theme)))];
  const appOf = (s) => (s && s.applicable === true ? 'Applicable' : s && s.applicable === false ? 'Excluded' : 'Undecided');
  const covered = CONTROLS.filter((c) => linkedControl(c.ref).length > 0).length;
  const applicable = getCollection('soa').filter((s) => s.applicable === true).length;
  const sel = (id, opts, cur) => `<select id="${id}" aria-label="${id}">${opts.map((o) => `<option ${o === cur ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
  viewEl().innerHTML = `
    <h2>ISO/IEC 27001:2022 framework</h2>
    <div class="panel"><div class="panel-head"><h3>Coverage gaps</h3>${gaps.length ? `<span class="pill warn">${gaps.length} open</span>` : '<span class="pill ok">none</span>'}</div><p class="muted">Clauses that require documented information but have no linked document.</p>${gaps.length ? table(
      [{ key: 'number', label: 'Clause' }, { key: 'title', label: 'Title' }, { key: 'mandatory', label: 'Mandatory documented information' }],
      gaps.map((g) => ({ number: g.number, title: g.title, mandatory: g.mandatory.join('; ') })),
    ) : '<p>No coverage gaps.</p>'}</div>
    <div class="panel">
      <div class="panel-head"><h3>Annex A controls</h3><span class="muted">${applicable} applicable, ${covered} of ${CONTROLS.length} with a linked document</span></div>
      <div class="toolbar">
        ${sel('fw-theme', themes, fwFilter.theme)}
        ${sel('fw-app', ['All', 'Applicable', 'Excluded', 'Undecided'], fwFilter.app)}
        ${sel('fw-impl', ['All', ...CONFIG.implementationStatuses], fwFilter.impl)}
        <input id="fw-q" placeholder="Filter by reference, title or attribute" value="${esc(fwFilter.q)}" style="width:240px" aria-label="Filter controls" />
        <span class="spacer"></span><span class="badge" id="fw-count"></span>
      </div>
      <div class="table-wrap" id="fw-controls"></div>
    </div>
    <div class="panel"><h3>Management clauses</h3>${table(
      [{ key: 'number', label: 'Clause' }, { key: 'title', label: 'Title' }, { key: 'mandatory', label: 'Mandatory documented information' }],
      CLAUSES.map((c) => ({ number: c.number + (c.climate ? ' (climate)' : ''), title: c.title, mandatory: c.mandatory.join('; ') || '-' })),
    )}</div>`;
  const draw = () => {
    const q = fwFilter.q.trim().toLowerCase();
    const rows = CONTROLS.filter((c) => {
      const s = soaByRef[c.ref];
      if (fwFilter.theme !== 'All' && c.theme !== fwFilter.theme) return false;
      if (fwFilter.app !== 'All' && appOf(s) !== fwFilter.app) return false;
      if (fwFilter.impl !== 'All' && !(s && s.applicable === true && s.status === fwFilter.impl)) return false;
      if (q && !(`${c.ref} ${c.title} ${c.theme} ${(c.types || []).join(' ')} ${(c.properties || []).join(' ')} ${(c.concepts || []).join(' ')}`).toLowerCase().includes(q)) return false;
      return true;
    }).map((c) => {
      const s = soaByRef[c.ref]; const linked = linkedControl(c.ref);
      return { __html: true, ref: `<a href="#/control/${esc(c.ref)}">${esc(c.ref)}</a>`, title: esc(c.title), theme: esc(c.theme), type: (c.types || []).map((t) => `<span class="chip">${esc(t)}</span>`).join('') || '-',
        app: s ? applicablePill(s.applicable) : '<span class="muted">-</span>',
        impl: s && s.applicable === true ? pill(s.status, statusKind(s.status)) : '<span class="muted">-</span>',
        docs: linked.length ? linked.map(chip).join('') : '<span class="muted">none</span>' };
    });
    document.getElementById('fw-controls').innerHTML = table([{ key: 'ref', label: 'Reference' }, { key: 'title', label: 'Title' }, { key: 'theme', label: 'Theme' }, { key: 'type', label: 'Type' }, { key: 'app', label: 'Applicable' }, { key: 'impl', label: 'Implementation' }, { key: 'docs', label: 'Documents' }], rows);
    document.getElementById('fw-count').textContent = `${rows.length} of ${CONTROLS.length}`;
  };
  document.getElementById('fw-theme').addEventListener('change', (e) => { fwFilter.theme = e.target.value; draw(); });
  document.getElementById('fw-app').addEventListener('change', (e) => { fwFilter.app = e.target.value; draw(); });
  document.getElementById('fw-impl').addEventListener('change', (e) => { fwFilter.impl = e.target.value; draw(); });
  document.getElementById('fw-q').addEventListener('input', (e) => { fwFilter.q = e.target.value; draw(); });
  draw();
}

// A single Annex A control in full: its attributes, the applicability decision recorded
// in the Statement of Applicability, the controlled documents that address it and the
// risks it treats. This is the golden thread an auditor follows, in one place.
function renderControlDetail(ref) {
  const c = CONTROLS.find((x) => x.ref === ref);
  if (!c) { viewEl().innerHTML = `<h2>Control not found</h2><div class="panel"><p>No Annex A control has the reference ${esc(ref)}.</p><p><a href="#/framework">Back to the framework</a></p></div>`; return; }
  const s = Object.fromEntries(getCollection('soa').map((x) => [x.ref, x]))[ref];
  const docs = getCollection('documents').filter((d) => (d.controlRefs || []).includes(ref));
  const parse = (v) => String(v || '').split(/[,;]/).map((x) => x.trim()).filter(Boolean);
  const risks = getCollection('register.risk').filter((r) => parse(r.relatedControls).includes(ref));
  const evidence = getCollection('register.evidence').filter((e) => String(e.controlRef || '').trim() === ref);
  const idx = CONTROLS.findIndex((x) => x.ref === ref);
  const prev = idx > 0 ? CONTROLS[idx - 1] : null;
  const next = idx < CONTROLS.length - 1 ? CONTROLS[idx + 1] : null;
  const chips = (arr) => (arr || []).map((a) => `<span class="chip">${esc(a)}</span>`).join('') || '<span class="muted">-</span>';
  const connNodes = [
    ...docs.slice(0, 7).map((d) => ({ label: d.ref, kind: 'system', href: '#/documents/' + d.id })),
    ...risks.slice(0, 5).map((r) => ({ label: r.riskId, kind: 'vault', href: '#/registers' })),
    ...evidence.slice(0, 5).map((e) => ({ label: e.evidenceId, kind: 'store', href: '#/registers' })),
  ];
  viewEl().innerHTML = `
    <p class="muted"><a href="#/framework">Framework</a> <span aria-hidden="true">/</span> ${esc(c.ref)}</p>
    <h2>${esc(c.ref)} ${esc(c.title)}</h2>
    <div class="panel">
      <p>${s ? applicablePill(s.applicable) : '<span class="muted">No decision</span>'} ${s && s.applicable === true ? pill(s.status, statusKind(s.status)) : ''} <span class="badge">${esc(c.theme)}</span></p>
      <table class="spec"><tbody>
        <tr><th>Control type</th><td>${chips(c.types)}</td></tr>
        <tr><th>Security properties</th><td>${chips(c.properties)}</td></tr>
        <tr><th>Cybersecurity concepts</th><td>${chips(c.concepts)}</td></tr>
      </tbody></table>
    </div>
    ${connNodes.length ? `<div class="panel">
      <div class="panel-head"><h3>Connections</h3><span class="muted">${docs.length} document${docs.length === 1 ? '' : 's'}, ${risks.length} risk${risks.length === 1 ? '' : 's'}, ${evidence.length} evidence</span></div>
      <p class="muted">The documents, risks and evidence linked to this control. Select any to open it.</p>
      ${radialGraph(c.ref, connNodes)}
      <div class="legend">
        <span class="leg"><i class="dot" style="background:var(--brand-300)"></i>Document</span>
        <span class="leg"><i class="dot" style="background:var(--warn-solid)"></i>Risk</span>
        <span class="leg"><i class="dot" style="background:var(--ok-solid)"></i>Evidence</span>
      </div>
    </div>` : ''}
    <div class="panel">
      <div class="panel-head"><h3>Applicability decision</h3><a href="#/soa">Edit in the Statement of Applicability</a></div>
      ${s ? `<table class="spec"><tbody>
        <tr><th>Applicable</th><td>${applicablePill(s.applicable)}</td></tr>
        <tr><th>Implementation</th><td>${s.applicable === true ? pill(s.status, statusKind(s.status)) : '<span class="muted">-</span>'}</td></tr>
        <tr><th>Owner</th><td>${esc(s.owner) || '<span class="muted">not set</span>'}</td></tr>
        <tr><th>Justification</th><td>${esc(s.justification) || '<span class="muted">none recorded</span>'}</td></tr>
      </tbody></table>` : '<p class="muted">This control is not yet in the Statement of Applicability.</p>'}
    </div>
    <div class="panel">
      <div class="panel-head"><h3>Documents addressing this control</h3><span class="muted">${docs.length}</span></div>
      ${docs.length ? table(
        [{ key: 'ref', label: 'Reference' }, { key: 'title', label: 'Title' }, { key: 'status', label: 'Status' }, { key: 'review', label: 'Review by' }],
        docs.map((d) => ({ __html: true, ref: `<a href="#/documents/${d.id}">${esc(d.ref)}</a>`, title: esc(d.title), status: pill(d.status), review: esc(fmtDate(d.nextReviewDate) || '-') })),
      ) : '<p class="muted">No controlled document is linked to this control yet.</p>'}
    </div>
    <div class="panel">
      <div class="panel-head"><h3>Risks treated by this control</h3><span class="muted">${risks.length}</span></div>
      ${risks.length ? table(
        [{ key: 'id', label: 'Risk' }, { key: 'desc', label: 'Description' }, { key: 'inh', label: 'Inherent' }, { key: 'res', label: 'Residual' }, { key: 'treat', label: 'Treatment' }, { key: 'owner', label: 'Owner' }],
        risks.map((r) => { const sc = riskScore(r); const lv = riskLevel(sc); const rsc = residualScore(r); const rlv = riskLevel(rsc); return { __html: true, id: `<a href="#/registers">${esc(r.riskId)}</a>`, desc: esc(r.description), inh: `<b>${sc}</b> ${pill(lv.label, lv.kind)}`, res: rsc ? `<b>${rsc}</b> ${pill(rlv.label, rlv.kind)}` : '-', treat: `<span class="chip">${esc(r.treatment || '-')}</span>`, owner: esc(r.owner) }; }),
      ) : '<p class="muted">No risk on the register names this control in its treatment.</p>'}
    </div>
    <div class="panel">
      <div class="panel-head"><h3>Evidence</h3><span class="muted">${evidence.length}</span></div>
      ${evidence.length ? table(
        [{ key: 'id', label: 'Evidence' }, { key: 'title', label: 'Title' }, { key: 'type', label: 'Type' }, { key: 'date', label: 'Date' }, { key: 'owner', label: 'Owner' }, { key: 'location', label: 'Location' }],
        evidence.map((e) => ({ __html: true, id: `<a href="#/registers">${esc(e.evidenceId)}</a>`, title: esc(e.title), type: `<span class="chip">${esc(e.type || '-')}</span>`, date: ageCell(e.date), owner: esc(e.owner), location: esc(e.location) })),
      ) : '<p class="muted">No evidence is recorded against this control yet. Add it in the evidence register.</p>'}
    </div>
    <div class="toolbar">${prev ? `<a class="chip" href="#/control/${esc(prev.ref)}">Previous ${esc(prev.ref)}</a>` : ''}${next ? `<a class="chip" href="#/control/${esc(next.ref)}">Next ${esc(next.ref)}</a>` : ''}<span class="spacer"></span><a class="chip" href="#/framework">All controls</a></div>`;
}

const soaFilter = { theme: 'All', app: 'All', impl: 'All', q: '' };
function renderSoa() {
  const soa = getCollection('soa');
  const byRef = Object.fromEntries(CONTROLS.map((c) => [c.ref, c]));
  const editable = can('ISMS Manager');
  const themes = ['All', ...Array.from(new Set(CONTROLS.map((c) => c.theme)))];
  const appOf = (s) => (s.applicable === true ? 'Applicable' : s.applicable === false ? 'Excluded' : 'Undecided');
  const applicable = soa.filter((s) => s.applicable === true).length;
  const excluded = soa.filter((s) => s.applicable === false).length;
  const undecided = soa.length - applicable - excluded;
  const sel = (id, opts, cur, width) => `<select id="${id}" aria-label="${id}"${width ? ` style="max-width:${width}px"` : ''}>${opts.map((o) => `<option ${o === cur ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
  const appLabel = (a) => (a === true ? 'Applicable' : a === false ? 'Excluded' : 'Undecided');
  const snaps = getSoaSnapshots().slice().sort((a, b) => new Date(b.ts) - new Date(a.ts));
  const latest = snaps[0];
  const changes = latest ? soa.flatMap((s) => {
    const o = latest.state[s.ref];
    if (!o) return [];
    if (appLabel(s.applicable) !== appLabel(o.a)) return [{ ref: s.ref, field: 'Applicability', from: appLabel(o.a), to: appLabel(s.applicable) }];
    if (s.applicable === true && s.status !== o.s) return [{ ref: s.ref, field: 'Status', from: o.s, to: s.status }];
    return [];
  }) : [];
  const changesTable = changes.length ? table(
    [{ key: 'ref', label: 'Control' }, { key: 'field', label: 'Change' }, { key: 'from', label: 'From' }, { key: 'to', label: 'To' }],
    changes.map((c) => ({ __html: true, ref: `<a href="#/control/${esc(c.ref)}">${esc(c.ref)}</a>`, field: esc(c.field), from: `<span class="muted">${esc(c.from)}</span>`, to: `<b>${esc(c.to)}</b>` })),
  ) : '';
  const changesHtml = latest ? `<div class="panel-head" style="margin-top:4px"><h3 style="font-size:13px">Changes since ${esc(fmtDate(latest.ts))}</h3>${changes.length ? `<span class="pill warn">${changes.length}</span>` : '<span class="pill ok">no changes</span>'}</div>${changesTable}` : '';
  const snapsHtml = snaps.length ? table(
    [{ key: 'date', label: 'Date' }, { key: 'by', label: 'By' }, { key: 'note', label: 'Note' }, { key: 'app', label: 'Applicable' }, { key: 'impl', label: 'Implemented' }, { key: 'und', label: 'Undecided' }],
    snaps.map((sn) => ({ date: fmtDate(sn.ts), by: sn.by, note: sn.note || '-', app: String(sn.summary.applicable), impl: String(sn.summary.implemented), und: String(sn.summary.undecided) })),
  ) : '<p class="muted">No snapshots recorded yet.</p>';
  const historyPanel = `
    <div class="panel">
      <div class="panel-head"><h3>Version history</h3><span class="muted">${snaps.length} snapshot${snaps.length === 1 ? '' : 's'}</span></div>
      <p class="muted">Snapshots evidence that the Statement of Applicability is maintained. Take a snapshot after a review to record the position at that point.</p>
      ${changesHtml}
      ${snapsHtml}
    </div>`;
  viewEl().innerHTML = `
    <h2>${esc(routeTitle('soa'))}</h2>
    <div class="panel">
      <div class="panel-head"><h3>Applicability across Annex A</h3><span class="muted">${soa.length} controls</span></div>
      ${stackedBar([
        { label: 'Applicable', value: applicable, kind: 'ok' },
        { label: 'Excluded', value: excluded, kind: 'neutral' },
        { label: 'Undecided', value: undecided, kind: 'warn' },
      ])}
    </div>
    <div class="toolbar">
      ${sel('soa-theme', themes, soaFilter.theme, 160)}
      ${sel('soa-app', ['All', 'Applicable', 'Excluded', 'Undecided'], soaFilter.app, 150)}
      ${sel('soa-impl', ['All', ...CONFIG.implementationStatuses], soaFilter.impl, 160)}
      <input id="soa-q" placeholder="Filter by reference, title, justification or owner" value="${esc(soaFilter.q)}" style="width:240px" aria-label="Filter the Statement of Applicability" />
      <span class="badge" id="soa-count"></span>
      <span class="spacer"></span>
      <button class="secondary" id="soa-csv">${esc(t('btn.export'))}</button>
      <button class="secondary" id="soa-print">${esc(t('btn.print'))}</button>
      ${editable ? '<button class="secondary" id="soa-snapshot">Take snapshot</button>' : ''}
      ${editable ? '<button class="secondary" id="soa-populate">Populate from the document set</button>' : ''}
      ${editable ? `<button id="soa-save">${esc(t('btn.save'))}</button>` : ''}
    </div>
    <div class="panel table-wrap" id="soa-rows"></div>
    ${historyPanel}`;

  const draw = () => {
    const q = soaFilter.q.trim().toLowerCase();
    const list = soa.filter((s) => {
      const c = byRef[s.ref] || {};
      if (soaFilter.theme !== 'All' && c.theme !== soaFilter.theme) return false;
      if (soaFilter.app !== 'All' && appOf(s) !== soaFilter.app) return false;
      if (soaFilter.impl !== 'All' && !(s.applicable === true && s.status === soaFilter.impl)) return false;
      if (q && !(`${s.ref} ${c.title || ''} ${s.justification || ''} ${s.owner || ''}`).toLowerCase().includes(q)) return false;
      return true;
    });
    const cell = (name, value, options, ref) => `<select data-ref="${esc(ref)}" data-field="${name}" ${editable ? '' : 'disabled'}>${options.map((o) => `<option value="${o.v}" ${o.v === value ? 'selected' : ''}>${o.t}</option>`).join('')}</select>`;
    const body = list.map((s) => {
      const c = byRef[s.ref] || {};
      const applicableValue = s.applicable === null ? '' : s.applicable ? 'yes' : 'no';
      return `<tr>
        <td><a href="#/control/${esc(s.ref)}"><b>${esc(s.ref)}</b></a></td>
        <td>${esc(c.title || '')}</td>
        <td>${cell('applicable', applicableValue, [{ v: '', t: 'Undecided' }, { v: 'yes', t: 'Yes' }, { v: 'no', t: 'No' }], s.ref)}</td>
        <td><input data-ref="${esc(s.ref)}" data-field="justification" value="${esc(s.justification)}" ${editable ? '' : 'disabled'} /></td>
        <td>${cell('status', s.status, CONFIG.implementationStatuses.map((x) => ({ v: x, t: x })), s.ref)}</td>
        <td><input data-ref="${esc(s.ref)}" data-field="owner" value="${esc(s.owner)}" style="width:120px" ${editable ? '' : 'disabled'} /></td>
      </tr>`;
    }).join('');
    document.getElementById('soa-rows').innerHTML = `<table><thead><tr><th>Control</th><th>Title</th><th>Applicable</th><th>Justification</th><th>Status</th><th>Owner</th></tr></thead><tbody>${body || '<tr><td colspan="6" class="muted">No controls match the current filter.</td></tr>'}</tbody></table>`;
    document.getElementById('soa-count').textContent = `${list.length} of ${soa.length}`;
    document.querySelectorAll('#soa-rows [data-ref]').forEach((input) => {
      const handler = () => {
        const entry = soa.find((s) => s.ref === input.dataset.ref);
        if (!entry) return;
        const field = input.dataset.field;
        if (field === 'applicable') entry.applicable = input.value === '' ? null : input.value === 'yes';
        else entry[field] = input.value;
      };
      input.addEventListener(input.tagName === 'SELECT' ? 'change' : 'input', handler);
    });
  };
  document.getElementById('soa-theme').addEventListener('change', (e) => { soaFilter.theme = e.target.value; draw(); });
  document.getElementById('soa-app').addEventListener('change', (e) => { soaFilter.app = e.target.value; draw(); });
  document.getElementById('soa-impl').addEventListener('change', (e) => { soaFilter.impl = e.target.value; draw(); });
  document.getElementById('soa-q').addEventListener('input', (e) => { soaFilter.q = e.target.value; draw(); });
  draw();

  document.getElementById('soa-csv').addEventListener('click', () => {
    const cols = [{ key: 'ref', label: 'Control' }, { key: 'title', label: 'Title' }, { key: 'theme', label: 'Theme' }, { key: 'applicable', label: 'Applicable' }, { key: 'justification', label: 'Justification' }, { key: 'status', label: 'Implementation status' }, { key: 'owner', label: 'Owner' }];
    const data = soa.map((s) => ({ ref: s.ref, title: byRef[s.ref] ? byRef[s.ref].title : '', theme: byRef[s.ref] ? byRef[s.ref].theme : '', applicable: s.applicable === null ? 'Undecided' : s.applicable ? 'Yes' : 'No', justification: s.justification, status: s.status, owner: s.owner }));
    download('statement-of-applicability.csv', toCsv(cols, data), 'text/csv');
    audit('Exported', 'SoaEntry', 'Statement of Applicability to CSV');
  });
  document.getElementById('soa-print').addEventListener('click', () => window.print());
  const snapshot = document.getElementById('soa-snapshot');
  if (snapshot) snapshot.addEventListener('click', () => {
    addSoaSnapshot(getSettings().user, '');
    audit('Created', 'SoaSnapshot', 'Statement of Applicability snapshot');
    toast('Snapshot of the Statement of Applicability recorded.');
    renderSoa();
  });
  const populate = document.getElementById('soa-populate');
  if (populate) populate.addEventListener('click', () => {
    const n = populateSoaFromDocuments();
    audit('Updated', 'SoaEntry', `Populated ${n} controls from the document set`);
    toast(`Updated ${n} controls from the document set.`);
    renderSoa();
  });
  const save = document.getElementById('soa-save');
  if (save) save.addEventListener('click', () => {
    for (const s of soa) if (s.applicable !== null && !String(s.justification || '').trim()) { toast(`A justification is required for ${s.ref} once applicability is decided.`, 'danger'); return; }
    setCollection('soa', soa);
    audit('Updated', 'SoaEntry', 'Statement of Applicability');
    renderSoa();
  });
}

const aimsFilter = { obj: 'All', status: 'All', q: '' };
function renderAims() {
  const rows = getCollection('aimsSoa');
  const byRef = Object.fromEntries(AIMS_CONTROLS.map((c) => [c.ref, c]));
  const objName = Object.fromEntries(AIMS_OBJECTIVES.map((o) => [o.ref, o.name]));
  const editable = can('ISMS Manager');
  const applicable = rows.filter((s) => s.applicable === true).length;
  const excluded = rows.filter((s) => s.applicable === false).length;
  const undecided = rows.length - applicable - excluded;
  const implemented = rows.filter((s) => s.applicable === true && (s.status === 'Implemented' || s.status === 'Verified')).length;
  // Signals drawn from elsewhere in the management system, so the AI view is connected
  // to the risks, obligations and competence already recorded rather than standing alone.
  const matches = (coll, re) => getCollection('register.' + coll).filter((e) => re.test(JSON.stringify(e))).length;
  const aiRisks = matches('risk', /\bAI\b|model|prompt|inference/i);
  const aiLegal = matches('legal', /\bAI\b/i);
  const aiTraining = matches('competence', /\bAI\b|42001|responsible/i);
  const objSelOpts = ['All', ...AIMS_OBJECTIVES.map((o) => `${o.ref} ${o.name}`)];
  const sel = (id, opts, cur, width) => `<select id="${id}" aria-label="${id}"${width ? ` style="max-width:${width}px"` : ''}>${opts.map((o) => `<option ${o === cur ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
  viewEl().innerHTML = `
    <h2>AI management system, ISO/IEC 42001:2023</h2>
    <div class="panel"><p class="muted" style="margin:0">The AI management system extends the information security management system to the specific risks of building and operating AI. Personal data is held in the UK or EU only. Annex A below records applicability and implementation for each reference control, in the same way as the Statement of Applicability.</p>
      <div class="mini-cards" style="margin-top:12px">
        ${mini(aiRisks, 'AI related risks on the register', aiRisks ? 'warn' : '')}
        ${mini(aiLegal, 'AI legal and regulatory obligations', '')}
        ${mini(aiTraining, 'AI competence and training records', aiTraining ? 'ok' : '')}
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>Annex A applicability</h3><span class="muted">${applicable} applicable, ${implemented} implemented, ${rows.length} controls</span></div>
      ${stackedBar([
        { label: 'Applicable', value: applicable, kind: 'ok' },
        { label: 'Excluded', value: excluded, kind: 'neutral' },
        { label: 'Undecided', value: undecided, kind: 'warn' },
      ])}
    </div>
    <div class="toolbar">
      ${sel('aims-obj', objSelOpts, aimsFilter.obj, 240)}
      ${sel('aims-status', ['All', 'Applicable', 'Excluded', 'Undecided', ...CONFIG.implementationStatuses], aimsFilter.status, 160)}
      <input id="aims-q" placeholder="Filter by reference or title" value="${esc(aimsFilter.q)}" style="width:220px" aria-label="Filter AI controls" />
      <span class="badge" id="aims-count"></span>
      <span class="spacer"></span>
      <button class="secondary" id="aims-csv">${esc(t('btn.export'))}</button>
      <button class="secondary" id="aims-print">${esc(t('btn.print'))}</button>
      ${editable ? `<button id="aims-save">${esc(t('btn.save'))}</button>` : ''}
    </div>
    <div class="panel table-wrap" id="aims-rows"></div>
    <div class="panel"><h3>Management clauses</h3>${table(
      [{ key: 'number', label: 'Clause' }, { key: 'title', label: 'Title' }],
      AIMS_CLAUSES.map((c) => ({ number: c.number, title: c.title })),
    )}</div>`;

  const draw = () => {
    const q = aimsFilter.q.trim().toLowerCase();
    const list = rows.filter((s) => {
      const c = byRef[s.ref] || {};
      const appLabel = s.applicable === true ? 'Applicable' : s.applicable === false ? 'Excluded' : 'Undecided';
      if (aimsFilter.obj !== 'All' && `${c.objective} ${objName[c.objective]}` !== aimsFilter.obj) return false;
      if (aimsFilter.status !== 'All' && aimsFilter.status !== appLabel && !(s.applicable === true && s.status === aimsFilter.status)) return false;
      if (q && !(`${s.ref} ${c.title || ''}`).toLowerCase().includes(q)) return false;
      return true;
    });
    const sel2 = (name, value, options, ref) => `<select data-ref="${esc(ref)}" data-field="${name}" ${editable ? '' : 'disabled'}>${options.map((o) => `<option value="${o.v}" ${o.v === value ? 'selected' : ''}>${o.t}</option>`).join('')}</select>`;
    const body = list.map((s) => {
      const c = byRef[s.ref] || {};
      const applicableValue = s.applicable === null ? '' : s.applicable ? 'yes' : 'no';
      return `<tr>
        <td><b>${esc(s.ref)}</b></td>
        <td>${esc(c.title || '')}</td>
        <td><span class="chip">${esc(c.objective || '')}</span></td>
        <td>${sel2('applicable', applicableValue, [{ v: '', t: 'Undecided' }, { v: 'yes', t: 'Yes' }, { v: 'no', t: 'No' }], s.ref)}</td>
        <td><input data-ref="${esc(s.ref)}" data-field="justification" value="${esc(s.justification)}" ${editable ? '' : 'disabled'} /></td>
        <td>${sel2('status', s.status, CONFIG.implementationStatuses.map((x) => ({ v: x, t: x })), s.ref)}</td>
        <td><input data-ref="${esc(s.ref)}" data-field="owner" value="${esc(s.owner)}" style="width:120px" ${editable ? '' : 'disabled'} /></td>
      </tr>`;
    }).join('');
    document.getElementById('aims-rows').innerHTML = `<table><thead><tr><th>Control</th><th>Title</th><th>Objective</th><th>Applicable</th><th>Justification</th><th>Status</th><th>Owner</th></tr></thead><tbody>${body || '<tr><td colspan="7" class="muted">No controls match the current filter.</td></tr>'}</tbody></table>`;
    document.getElementById('aims-count').textContent = `${list.length} of ${rows.length}`;
    // Keep the in memory working copy in step with edits, so changes survive filtering.
    document.querySelectorAll('#aims-rows [data-ref]').forEach((input) => {
      const handler = () => {
        const entry = rows.find((s) => s.ref === input.dataset.ref);
        if (!entry) return;
        const field = input.dataset.field;
        if (field === 'applicable') entry.applicable = input.value === '' ? null : input.value === 'yes';
        else entry[field] = input.value;
      };
      input.addEventListener(input.tagName === 'SELECT' ? 'change' : 'input', handler);
    });
  };
  document.getElementById('aims-obj').addEventListener('change', (e) => { aimsFilter.obj = e.target.value; draw(); });
  document.getElementById('aims-status').addEventListener('change', (e) => { aimsFilter.status = e.target.value; draw(); });
  document.getElementById('aims-q').addEventListener('input', (e) => { aimsFilter.q = e.target.value; draw(); });
  draw();

  document.getElementById('aims-csv').addEventListener('click', () => {
    const cols = [{ key: 'ref', label: 'Control' }, { key: 'title', label: 'Title' }, { key: 'objective', label: 'Objective' }, { key: 'applicable', label: 'Applicable' }, { key: 'justification', label: 'Justification' }, { key: 'status', label: 'Implementation status' }, { key: 'owner', label: 'Owner' }];
    const data = rows.map((s) => ({ ref: s.ref, title: byRef[s.ref] ? byRef[s.ref].title : '', objective: byRef[s.ref] ? `${byRef[s.ref].objective} ${objName[byRef[s.ref].objective]}` : '', applicable: s.applicable === null ? 'Undecided' : s.applicable ? 'Yes' : 'No', justification: s.justification, status: s.status, owner: s.owner }));
    download('aims-statement-of-applicability.csv', toCsv(cols, data), 'text/csv');
    audit('Exported', 'AimsSoa', 'AI management Statement of Applicability to CSV');
  });
  document.getElementById('aims-print').addEventListener('click', () => window.print());
  const save = document.getElementById('aims-save');
  if (save) save.addEventListener('click', () => {
    for (const s of rows) if (s.applicable !== null && !String(s.justification).trim()) { toast(`A justification is required for ${s.ref} once applicability is decided.`, 'danger'); return; }
    setCollection('aimsSoa', rows);
    audit('Updated', 'AimsSoa', 'AI management Statement of Applicability');
    toast('AI management Statement of Applicability saved.');
    renderAims();
  });
}

let activeRegister = CONFIG.registers[0].key;
let regFilter = '';
let regEditingId = null;
let riskCell = null;
function renderRegisters() {
  const def = CONFIG.registers.find((r) => r.key === activeRegister);
  const editable = can('ISMS Manager');
  const all = getCollection('register.' + def.key);
  const disp = REG_DISPLAY[def.key];

  const counts = CONFIG.registers.map((r) => ({ key: r.key, label: r.label, n: getCollection('register.' + r.key).length }));
  const chips = counts.map((c) => `<button class="reg-chip ${c.key === def.key ? 'active' : ''}" data-reg="${c.key}">${esc(c.label)} <b>${c.n}</b></button>`).join('');

  const columns = (disp ? disp.columns.slice() : def.fields.map((f) => ({ key: f.name, label: f.label })));
  if (editable) columns.push({ key: '__act', label: '' });

  const editing = regEditingId ? all.find((x) => x.id === regEditingId) : null;
  const fieldInput = (f) => {
    const val = editing ? (editing[f.name] ?? '') : '';
    if (f.type === 'select') return `<select id="f-${f.name}"><option value=""></option>${f.options.map((o) => `<option ${o === val ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
    const t = f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text';
    return `<input id="f-${f.name}" type="${t}" value="${esc(val)}" />`;
  };
  const addForm = editable ? `
    <details class="panel" ${editing ? 'open' : ''}><summary>${editing ? 'Edit entry' : 'Add entry'}</summary>
      <form id="reg-form"><div class="cards">${def.fields.map((f) => `<div><label for="f-${f.name}">${esc(f.label)}</label>${fieldInput(f)}</div>`).join('')}</div>
      <div class="toolbar" style="margin-top:12px"><button type="submit">${editing ? 'Save changes' : 'Save entry'}</button>${editing ? '<button type="button" class="secondary" id="reg-cancel">Cancel</button>' : ''}</div></form>
    </details>` : '';

  viewEl().innerHTML = `<h2>${esc(routeTitle('registers'))}</h2>
    <div class="panel"><div class="panel-head"><h3>All registers</h3><span class="muted">${counts.reduce((a, c) => a + c.n, 0)} entries across ${counts.length} registers</span></div><div class="reg-chips">${chips}</div></div>
    <div class="panel"><div class="panel-head"><h3>${esc(def.label)}</h3><span class="muted">${all.length} ${all.length === 1 ? 'entry' : 'entries'}</span></div>${regSummary(def.key, all)}</div>
    <div class="toolbar">
      <input id="reg-q" placeholder="Filter ${esc(def.label.toLowerCase())}" value="${esc(regFilter)}" style="width:260px" aria-label="Filter register" />
      ${def.key === 'risk' && riskCell ? `<button class="reg-chip active" id="risk-clear">Likelihood ${riskCell.l}, impact ${riskCell.i} (clear)</button>` : ''}
      <span class="spacer"></span>
      <button class="secondary" id="reg-csv">Export this register</button>
      ${editable ? '<button class="secondary" id="reg-load">Load the register set</button>' : ''}
    </div>
    ${addForm}
    <div class="panel table-wrap" id="reg-table"></div>`;

  const draw = () => {
    const q = regFilter.trim().toLowerCase();
    let rows = all.filter((e) => !q || Object.values(e).join(' ').toLowerCase().includes(q));
    if (def.key === 'risk' && riskCell) rows = rows.filter((e) => num(e.likelihood) === riskCell.l && num(e.impact) === riskCell.i);
    if (disp && disp.sort) rows = rows.slice().sort(disp.sort);
    const display = rows.map((e) => {
      const o = disp ? disp.row(e) : Object.fromEntries(def.fields.map((f) => [f.name, esc(e[f.name] ?? '')]));
      o.__html = true;
      if (editable) o.__act = `<div class="row-actions"><button class="secondary btn-sm" data-edit="${e.id}">Edit</button><button class="secondary btn-sm" data-del="${e.id}">Delete</button></div>`;
      return o;
    });
    document.getElementById('reg-table').innerHTML = all.length ? table(columns, display) : '<p class="muted">No entries yet. Use Add entry, or Load the register set for starter content.</p>';
    document.querySelectorAll('#reg-table [data-del]').forEach((b) => b.addEventListener('click', () => {
      if (!confirm('Delete this entry?')) return;
      setCollection('register.' + def.key, getCollection('register.' + def.key).filter((r) => r.id !== b.dataset.del));
      audit('Deleted', def.label, 'Entry removed');
      renderRegisters();
    }));
    document.querySelectorAll('#reg-table [data-edit]').forEach((b) => b.addEventListener('click', () => { regEditingId = b.dataset.edit; renderRegisters(); }));
  };
  draw();

  if (def.key === 'risk') {
    viewEl().querySelectorAll('.matrix .heat:not(.empty)').forEach((c) => c.addEventListener('click', () => {
      const l = Number(c.dataset.l); const i = Number(c.dataset.i);
      riskCell = (riskCell && riskCell.l === l && riskCell.i === i) ? null : { l, i };
      renderRegisters();
    }));
    const rc = document.getElementById('risk-clear');
    if (rc) rc.addEventListener('click', () => { riskCell = null; renderRegisters(); });
  }
  viewEl().querySelectorAll('[data-reg]').forEach((btn) => btn.addEventListener('click', () => { activeRegister = btn.dataset.reg; regFilter = ''; regEditingId = null; riskCell = null; renderRegisters(); }));
  document.getElementById('reg-q').addEventListener('input', (e) => { regFilter = e.target.value; draw(); });
  document.getElementById('reg-csv').addEventListener('click', () => {
    download(def.key + '-register.csv', toCsv(def.fields.map((f) => ({ key: f.name, label: f.label })), all), 'text/csv');
    audit('Exported', def.label, 'to CSV');
  });
  const loadBtn = document.getElementById('reg-load');
  if (loadBtn) loadBtn.addEventListener('click', () => {
    if (!confirm('Load the starter content for every register? This replaces the entries currently held in this browser.')) return;
    const n = loadRegisterSet();
    audit('Imported', 'Register', `Loaded the register set (${n} entries)`);
    regEditingId = null;
    riskCell = null;
    renderRegisters();
    toast(`Loaded ${n} register entries.`);
  });
  const form = document.getElementById('reg-form');
  if (form) form.addEventListener('submit', (e) => {
    e.preventDefault();
    const values = {};
    for (const f of def.fields) values[f.name] = document.getElementById('f-' + f.name).value;
    const list = getCollection('register.' + def.key);
    if (regEditingId) {
      const idx = list.findIndex((x) => x.id === regEditingId);
      if (idx >= 0) list[idx] = { ...list[idx], ...values };
      audit('Updated', def.label, `${values[def.fields[0].name] || 'Entry'} updated`);
      regEditingId = null;
    } else {
      list.unshift({ id: cid(), ...values });
      audit('Created', def.label, 'New entry');
    }
    setCollection('register.' + def.key, list);
    renderRegisters();
  });
  const cancel = document.getElementById('reg-cancel');
  if (cancel) cancel.addEventListener('click', () => { regEditingId = null; renderRegisters(); });
}

function readinessData() {
  const docs = getCollection('documents');
  const soa = getCollection('soa');
  const aims = getCollection('aimsSoa');
  const aimsUndecided = aims.filter((s) => s.applicable === null).length;
  const aimsApplicable = aims.filter((s) => s.applicable === true);
  const aimsImplemented = aimsApplicable.filter((s) => ['Implemented', 'Verified'].includes(s.status)).length;
  const now = Date.now();
  const published = docs.filter((d) => d.status === 'Published');
  const linkedClause = new Set(docs.flatMap((d) => d.clauseRefs || []));
  const mandatory = CLAUSES.filter((c) => c.mandatory.length > 0);
  const clauseGaps = mandatory.filter((c) => !linkedClause.has(c.number));
  const decided = soa.filter((s) => s.applicable !== null);
  const undecided = soa.length - decided.length;
  const unjustified = decided.filter((s) => !(s.justification || '').trim()).length;
  const applicable = soa.filter((s) => s.applicable === true);
  const implemented = applicable.filter((s) => ['Implemented', 'Verified'].includes(s.status)).length;
  const overdueDocs = published.filter((d) => d.nextReviewDate && new Date(d.nextReviewDate).getTime() < now).length;
  const risks = getCollection('register.risk');
  const risksUntreated = risks.filter((r) => !(r.treatment || '').trim() || !(r.owner || '').trim()).length;
  const ncOverdue = getCollection('register.nonconformity').filter((r) => r.dueDate && new Date(r.dueDate).getTime() < now && !/clos|resolv|verif|complet/i.test(r.status)).length;
  const audits = getCollection('audits');
  const auditDone = audits.some((a) => /complet/i.test(a.status));
  const auditPlanned = audits.some((a) => /plan|schedul/i.test(a.status));
  const openFindings = audits.flatMap((a) => a.findings || []).filter((f) => !/clos/i.test(f.status)).length;
  const mrDates = getCollection('register.management-review').map((r) => r.date).filter(Boolean).sort();
  const lastMr = mrDates.filter((d) => new Date(d) <= new Date()).pop();
  const mrCurrent = lastMr && (now - new Date(lastMr).getTime()) < 366 * 86400000;
  const suppliers = getCollection('register.supplier');
  const supNoDpa = suppliers.filter((s) => !/^y/i.test(s.dpa || '')).length;
  const supOverdue = suppliers.filter((s) => s.reviewDate && new Date(s.reviewDate).getTime() < now).length;
  const ctx = getCollection('register.context').length;
  const C = (label, ok, sev, detail, view) => ({ label, ok, sev: ok ? 'ok' : sev, detail, view });
  return [
    C('Mandatory documented information', clauseGaps.length === 0, 'danger', `${mandatory.length - clauseGaps.length} of ${mandatory.length} clauses with required records are covered`, 'framework'),
    C('Statement of Applicability decided', undecided === 0, 'danger', undecided === 0 ? 'All controls have an applicability decision' : `${undecided} controls undecided`, 'soa'),
    C('Applicability justified', unjustified === 0, 'danger', unjustified === 0 ? 'Every decided control has a justification' : `${unjustified} decided controls need a justification`, 'soa'),
    C('Applicable controls implemented', applicable.length > 0 && implemented === applicable.length, 'warn', `${implemented} of ${applicable.length} applicable controls implemented or verified`, 'framework'),
    C('Document reviews current', overdueDocs === 0, 'danger', overdueDocs === 0 ? 'No published document is overdue for review' : `${overdueDocs} documents overdue for review`, 'documents'),
    C('Risk treatment recorded', risks.length > 0 && risksUntreated === 0, 'warn', `${risks.length - risksUntreated} of ${risks.length} risks have an owner and a treatment`, 'registers'),
    C('Corrective actions on track', ncOverdue === 0, 'danger', ncOverdue === 0 ? 'No corrective action is overdue' : `${ncOverdue} corrective actions overdue`, 'registers'),
    C('Internal audit programme', auditDone && auditPlanned, 'warn', `${auditDone ? 'A completed audit is recorded' : 'No completed audit recorded'}; ${auditPlanned ? 'a future audit is planned' : 'no future audit planned'}`, 'audits'),
    C('Audit findings addressed', openFindings === 0, 'warn', openFindings === 0 ? 'All audit findings are closed' : `${openFindings} audit findings open`, 'audits'),
    C('Management review current', !!mrCurrent, 'danger', lastMr ? `Last management review ${fmtDate(lastMr)}` : 'No management review recorded', 'registers'),
    C('Supplier assurance', supNoDpa === 0 && supOverdue === 0, 'warn', `${supNoDpa} without a data processing agreement, ${supOverdue} reviews overdue`, 'registers'),
    C('Context and interested parties', ctx > 0, 'warn', `${ctx} context entries recorded`, 'registers'),
    C('AI management applicability decided', aims.length > 0 && aimsUndecided === 0, 'warn', aimsUndecided === 0 ? 'All ISO 42001 controls have an applicability decision' : `${aimsUndecided} AI controls undecided`, 'aims'),
    C('AI controls implemented', aimsApplicable.length > 0 && aimsImplemented === aimsApplicable.length, 'warn', `${aimsImplemented} of ${aimsApplicable.length} applicable AI controls implemented or verified`, 'aims'),
  ];
}

function trendDelta(value, suffix) {
  const kind = value > 0 ? 'ok' : value < 0 ? 'danger' : 'neutral';
  const arrow = value > 0 ? '↑' : value < 0 ? '↓' : '→';
  return `<span class="pill ${kind}">${arrow} ${value > 0 ? '+' : ''}${value} ${esc(suffix)}</span>`;
}
function renderReadiness() {
  const checks = readinessData();
  const met = checks.filter((c) => c.ok).length;
  const score = pct(met, checks.length);
  const ring = score >= 90 ? 'ok' : score >= 70 ? 'warn' : 'danger';
  const history = recordReadiness(score);
  const first = history[0];
  const prev = history.length > 1 ? history[history.length - 2] : null;
  const sinceStart = first ? score - first.score : 0;
  const sincePrev = prev ? score - prev.score : 0;
  viewEl().innerHTML = `
    <h2>${esc(routeTitle('readiness'))}</h2>
    <div class="panel">
      <div class="readiness-hero">
        <div class="ring ${ring}" style="--p:${score}"><div class="inner"><div class="v">${score}%</div><div class="l">ready</div></div></div>
        <div class="readiness-sum">
          <p><strong>${met} of ${checks.length} readiness checks met</strong> against ISO/IEC 27001:2022 and ISO/IEC 42001:2023.</p>
          <p class="muted">A live view of how close the management system is to certification, drawn from the documents, both Statements of Applicability and the registers. Each check links to where it is managed.</p>
          <div class="toolbar"><button id="audit-pack">${esc(t('btn.generatePack'))}</button></div>
        </div>
      </div>
    </div>
    <div class="panel"><div class="panel-head"><h3>Readiness over time</h3><span>${trendDelta(sinceStart, 'since ' + (first ? first.date : ''))}${prev ? trendDelta(sincePrev, 'since last') : ''}</span></div>
      <p class="muted">Certification readiness is captured each day the system is used. A steady climb is evidence of continual improvement.</p>
      ${sparkline(history)}
    </div>
    <div class="panel"><div class="panel-head"><h3>Readiness checks</h3><span class="muted">${met} met, ${checks.length - met} to address</span></div>
      <div class="checks">${checks.map((c) => `
        <a class="check" href="#/${c.view}">
          <span class="pill ${c.sev}${!c.ok && c.sev === 'danger' ? ' pulse' : ''}">${c.ok ? 'Met' : c.sev === 'danger' ? 'Gap' : 'Action'}</span>
          <span class="check-body"><span class="check-label">${esc(c.label)}</span><span class="check-detail">${esc(c.detail)}</span></span>
        </a>`).join('')}</div>
    </div>`;
  const btn = document.getElementById('audit-pack');
  if (btn) btn.addEventListener('click', () => go('report'));
  animateRings(viewEl());
}

function renderReport() {
  const docs = getCollection('documents');
  const soa = getCollection('soa');
  const aims = getCollection('aimsSoa');
  const aimsByRef = Object.fromEntries(AIMS_CONTROLS.map((c) => [c.ref, c]));
  const aimsObjName = Object.fromEntries(AIMS_OBJECTIVES.map((o) => [o.ref, o.name]));
  const ctrlByRef = Object.fromEntries(CONTROLS.map((c) => [c.ref, c]));
  const checks = readinessData();
  const met = checks.filter((c) => c.ok).length;
  const score = pct(met, checks.length);
  const applicable = soa.filter((s) => s.applicable === true).length;
  const excluded = soa.filter((s) => s.applicable === false).length;
  const undecided = soa.length - applicable - excluded;
  const risks = getCollection('register.risk').slice().sort((a, b) => riskScore(b) - riskScore(a));
  const linkedClause = new Set(docs.flatMap((d) => d.clauseRefs || []));
  const gaps = CLAUSES.filter((c) => c.mandatory.length > 0 && !linkedClause.has(c.number));
  const audits = getCollection('audits');
  const mrs = getCollection('register.management-review');
  const evidence = getCollection('register.evidence').slice().sort((a, b) => String(a.controlRef || '').localeCompare(String(b.controlRef || '')));
  const today = new Date().toISOString().slice(0, 10);
  viewEl().innerHTML = `
    <div class="toolbar"><button class="secondary" id="pack-back">Back</button><button id="print-pack">${esc(t('btn.print'))}</button></div>
    <div class="report">
      <section class="report-section cover">
        <h1>${esc(t('chrome.org'))}</h1>
        <h2>${esc(t('title.report'))}</h2>
        <p class="muted">${esc(getOrg().name)}</p>
        <p class="muted">${esc(t('report.scope'))}: ${esc(getOrg().scope)}</p>
        <p class="muted">ISO/IEC 27001:2022 and ISO/IEC 42001:2023 | ${esc(t('report.generated'))} ${today} | ${esc(t('report.classification'))}</p>
        <div class="ring ${score >= 90 ? 'ok' : score >= 70 ? 'warn' : 'danger'}" style="--p:${score}"><div class="inner"><div class="v">${score}%</div><div class="l">ready</div></div></div>
      </section>
      <section class="report-section break"><h3>Readiness summary</h3>${table(
        [{ key: 'check', label: 'Check' }, { key: 'status', label: 'Status' }, { key: 'detail', label: 'Detail' }],
        checks.map((c) => ({ __html: true, check: esc(c.label), status: pill(c.ok ? 'Met' : c.sev === 'danger' ? 'Gap' : 'Action', c.sev), detail: esc(c.detail) })),
      )}</section>
      <section class="report-section break"><h3>System architecture and data flow</h3>
        <p class="muted">How conversation data moves through the platform, with the UK or EU trust boundary and the external providers.</p>
        ${dataFlowDiagram()}
        <h3 style="margin-top:18px">Management system operating model</h3>
        ${operatingModelDiagram()}
      </section>
      <section class="report-section break"><h3>Statement of Applicability</h3>
        ${stackedBar([{ label: 'Applicable', value: applicable, kind: 'ok' }, { label: 'Excluded', value: excluded, kind: 'neutral' }, { label: 'Undecided', value: undecided, kind: 'warn' }])}
        ${table(
          [{ key: 'ref', label: 'Control' }, { key: 'title', label: 'Title' }, { key: 'app', label: 'Applicable' }, { key: 'status', label: 'Status' }, { key: 'just', label: 'Justification' }],
          soa.map((s) => ({ __html: true, ref: esc(s.ref), title: esc(ctrlByRef[s.ref] ? ctrlByRef[s.ref].title : ''), app: applicablePill(s.applicable), status: s.applicable === true ? pill(s.status, statusKind(s.status)) : '<span class="muted">-</span>', just: esc(s.justification || '') })),
        )}</section>
      <section class="report-section break"><h3>AI management Statement of Applicability</h3>
        <p class="muted">ISO/IEC 42001:2023 Annex A. ${aims.filter((s) => s.applicable === true).length} applicable, ${aims.filter((s) => s.applicable === true && ['Implemented', 'Verified'].includes(s.status)).length} implemented or verified, of ${aims.length} reference controls.</p>
        ${table(
          [{ key: 'ref', label: 'Control' }, { key: 'title', label: 'Title' }, { key: 'obj', label: 'Objective' }, { key: 'app', label: 'Applicable' }, { key: 'status', label: 'Status' }, { key: 'just', label: 'Justification' }],
          aims.map((s) => ({ __html: true, ref: esc(s.ref), title: esc(aimsByRef[s.ref] ? aimsByRef[s.ref].title : ''), obj: esc(aimsByRef[s.ref] ? aimsObjName[aimsByRef[s.ref].objective] : ''), app: applicablePill(s.applicable), status: s.applicable === true ? pill(s.status, statusKind(s.status)) : '<span class="muted">-</span>', just: esc(s.justification || '') })),
        )}</section>
      <section class="report-section break"><h3>Risk summary</h3>
        <div class="matrix-wrap"><div>${riskMatrix(risks)}</div></div>
        ${table(
          [{ key: 'id', label: 'Risk' }, { key: 'desc', label: 'Description' }, { key: 'inh', label: 'Inherent' }, { key: 'res', label: 'Residual' }, { key: 'treat', label: 'Treatment' }, { key: 'ctrls', label: 'Controls' }, { key: 'owner', label: 'Owner' }],
          risks.map((r) => { const sc = riskScore(r); const lv = riskLevel(sc); const rsc = residualScore(r); const rlv = riskLevel(rsc); return { __html: true, id: esc(r.riskId), desc: esc(r.description), inh: `<b>${sc}</b> ${pill(lv.label, lv.kind)}`, res: rsc ? `<b>${rsc}</b> ${pill(rlv.label, rlv.kind)}` : '-', treat: esc(r.treatment), ctrls: esc(r.relatedControls || ''), owner: esc(r.owner) }; }),
        )}</section>
      <section class="report-section break"><h3>Mandatory documented information</h3>${gaps.length ? table([{ key: 'number', label: 'Clause' }, { key: 'title', label: 'Title' }, { key: 'rec', label: 'Required record' }], gaps.map((g) => ({ number: g.number, title: g.title, rec: g.mandatory.join('; ') }))) : '<p>No gaps. Every clause that requires documented information has a linked document.</p>'}</section>
      <section class="report-section break"><h3>Internal audit programme</h3>${table([{ key: 'ref', label: 'Audit' }, { key: 'scope', label: 'Scope' }, { key: 'standard', label: 'Standard' }, { key: 'date', label: 'Date' }, { key: 'auditor', label: 'Auditor' }, { key: 'status', label: 'Status' }, { key: 'findings', label: 'Findings' }], audits.map((a) => ({ ref: a.ref, scope: a.scope, standard: a.standard, date: fmtDate(a.completedDate || a.plannedDate), auditor: a.auditor, status: a.status, findings: String((a.findings || []).length) })))}</section>
      <section class="report-section"><h3>Management review log</h3>${table([{ key: 'reviewId', label: 'Review' }, { key: 'date', label: 'Date' }, { key: 'attendees', label: 'Attendees' }, { key: 'decisions', label: 'Decisions' }], mrs.map((m) => ({ reviewId: m.reviewId, date: fmtDate(m.date), attendees: m.attendees, decisions: m.decisions })))}</section>
      <section class="report-section break"><h3>Controlled document register</h3>${table([{ key: 'ref', label: 'Reference' }, { key: 'title', label: 'Title' }, { key: 'sys', label: 'System' }, { key: 'ver', label: 'Version' }, { key: 'status', label: 'Status' }, { key: 'review', label: 'Review by' }], docs.map((d) => ({ __html: true, ref: esc(d.ref), title: esc(d.title), sys: esc(d.system || ''), ver: esc(d.currentVersion || ''), status: pill(d.status), review: esc(fmtDate(d.nextReviewDate) || '-') })))}</section>
      ${evidence.length ? `<section class="report-section break"><h3>Evidence register</h3><p class="muted">${evidence.length} items of evidence supporting the controls.</p>${table([{ key: 'id', label: 'Evidence' }, { key: 'title', label: 'Title' }, { key: 'type', label: 'Type' }, { key: 'control', label: 'Control' }, { key: 'date', label: 'Date' }, { key: 'owner', label: 'Owner' }, { key: 'location', label: 'Location' }], evidence.map((e) => ({ id: e.evidenceId, title: e.title, type: e.type, control: e.controlRef, date: fmtDate(e.date), owner: e.owner, location: e.location })))}</section>` : ''}
    </div>`;
  const back = document.getElementById('pack-back');
  if (back) back.addEventListener('click', () => go('readiness'));
  const p = document.getElementById('print-pack');
  if (p) p.addEventListener('click', () => window.print());
}

// ---- compliance calendar ---------------------------------------------------

function calendarEvents() {
  const now = Date.now();
  const ev = [];
  const add = (date, type, title, view) => {
    if (!date) return; const t = new Date(date).getTime(); if (Number.isNaN(t)) return;
    ev.push({ date, t, type, title, view, kind: t < now ? 'overdue' : (t <= now + 30 * 86400000 ? 'soon' : 'future') });
  };
  for (const d of getCollection('documents')) if (d.status === 'Published' && d.nextReviewDate) add(d.nextReviewDate, 'Document review', `${d.ref} ${d.title}`, 'documents/' + d.id);
  for (const a of getCollection('audits')) {
    if (!/complet/i.test(a.status) && a.plannedDate) add(a.plannedDate, 'Internal audit', `${a.ref} ${a.scope}`, 'audits/' + a.id);
    for (const f of (a.findings || [])) if (!/clos/i.test(f.status) && f.dueDate) add(f.dueDate, 'Audit finding', `${a.ref}: ${f.description}`, 'audits/' + a.id);
  }
  for (const r of getCollection('register.supplier')) if (r.reviewDate) add(r.reviewDate, 'Supplier review', r.name, 'registers');
  for (const r of getCollection('register.nonconformity')) if (!/clos|resolv|verif|complet/i.test(r.status) && r.dueDate) add(r.dueDate, 'Corrective action', r.description, 'registers');
  for (const r of getCollection('register.legal')) if (r.reviewDate) add(r.reviewDate, 'Legal review', r.requirement, 'registers');
  for (const r of getCollection('register.management-review')) if (r.date && new Date(r.date).getTime() > now) add(r.date, 'Management review', r.reviewId, 'registers');
  for (const s of getCollection('soa')) { /* no per control dates */ void s; }
  return ev.sort((a, b) => a.t - b.t);
}

// A timeline of dated obligations over the next year, in swimlanes by type. Each marker
// is coloured by urgency and links to where the obligation is managed.
function complianceTimeline(events) {
  const now = Date.now(); const span = 365 * 86400000; const t1 = now + span;
  const inRange = events.filter((e) => e.t <= t1);
  if (!inRange.length) return '<p class="muted">No dated obligations in the next year.</p>';
  const types = Array.from(new Set(inRange.map((e) => e.type)));
  const W = 920; const left = 168; const right = 22; const top = 24; const laneH = 32; const H = top + types.length * laneH + 26;
  const plotW = W - left - right;
  const x = (tm) => left + ((Math.max(now, Math.min(t1, tm)) - now) / span) * plotW;
  const months = []; const d0 = new Date(); d0.setDate(1);
  for (let i = 0; i <= 12; i++) { const md = new Date(d0.getFullYear(), d0.getMonth() + i, 1); if (md.getTime() > t1) break; months.push(md); }
  const grid = months.map((md) => { const gx = x(md.getTime()); return `<line x1="${gx.toFixed(1)}" y1="${top - 6}" x2="${gx.toFixed(1)}" y2="${(H - 20).toFixed(1)}" class="tl-grid"/><text x="${gx.toFixed(1)}" y="${H - 6}" class="tl-axis" text-anchor="middle">${md.toLocaleDateString('en-GB', { month: 'short' })}</text>`; }).join('');
  const lanes = types.map((ty, i) => {
    const y = top + i * laneH + laneH / 2;
    const head = `<text x="${left - 10}" y="${(y + 3).toFixed(1)}" class="tl-lane" text-anchor="end">${esc(ty)}</text><line x1="${left}" y1="${y.toFixed(1)}" x2="${(W - right).toFixed(1)}" y2="${y.toFixed(1)}" class="tl-base"/>`;
    const dots = inRange.filter((e) => e.type === ty).map((e) => { const inner = `<circle cx="${x(e.t).toFixed(1)}" cy="${y.toFixed(1)}" r="5.5" class="tl-dot ${e.kind}"><title>${esc(fmtDate(e.date))}: ${esc(e.title)}</title></circle>`; return e.view ? `<a href="#/${e.view}" class="dfd-link">${inner}</a>` : inner; }).join('');
    return head + dots;
  }).join('');
  return `<svg class="tl" viewBox="0 0 ${W} ${H}" role="img" aria-label="Compliance timeline">${grid}${lanes}</svg>`;
}

function renderCalendar() {
  const ev = calendarEvents();
  const now = Date.now();
  const overdue = ev.filter((e) => e.kind === 'overdue');
  const soon = ev.filter((e) => e.kind === 'soon');
  const horizon = now + 365 * 86400000;
  const upcoming = ev.filter((e) => e.t >= now && e.t <= horizon);
  const groups = {};
  for (const e of upcoming) {
    const d = new Date(e.date); const key = d.getFullYear() * 100 + d.getMonth();
    (groups[key] = groups[key] || { label: d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }), items: [] }).items.push(e);
  }
  const monthKeys = Object.keys(groups).sort((a, b) => a - b);
  const statusPill = (k) => pill(k === 'overdue' ? 'Overdue' : k === 'soon' ? 'Due soon' : 'Scheduled', k === 'overdue' ? 'danger' : k === 'soon' ? 'warn' : 'neutral');
  const evRow = (e) => ({ __html: true, date: esc(fmtDate(e.date)), type: `<span class="chip">${esc(e.type)}</span>`, item: e.view ? `<a href="#/${e.view}">${esc(e.title)}</a>` : esc(e.title), status: statusPill(e.kind) });
  const cols = [{ key: 'date', label: 'Date' }, { key: 'type', label: 'Type' }, { key: 'item', label: 'Item' }, { key: 'status', label: 'Status' }];
  viewEl().innerHTML = `<h2>${esc(routeTitle('calendar'))}</h2>
    <div class="panel"><div class="panel-head"><h3>Obligations</h3><span class="muted">${ev.length} dated obligations across the management system</span></div>
      <div class="mini-cards">${mini(overdue.length, 'Overdue', overdue.length ? 'danger' : 'ok')}${mini(soon.length, 'Due within 30 days', soon.length ? 'warn' : 'ok')}${mini(upcoming.length, 'In the next year')}</div>
    </div>
    <div class="panel"><div class="panel-head"><h3>Timeline</h3><span class="legend" style="margin:0"><span class="leg"><i class="dot danger"></i>Overdue</span><span class="leg"><i class="dot warn"></i>Due soon</span><span class="leg"><i class="dot info"></i>Scheduled</span></span></div>
      ${complianceTimeline(ev)}
    </div>
    ${overdue.length ? `<div class="panel"><div class="panel-head"><h3>Overdue</h3><span class="pill danger">${overdue.length}</span></div>${table(cols, overdue.map(evRow))}</div>` : ''}
    ${monthKeys.length ? monthKeys.map((k) => { const items = groups[k].items; const shown = items.slice(0, 25); return `<div class="panel"><div class="panel-head"><h3>${esc(groups[k].label)}</h3><span class="muted">${items.length} item${items.length === 1 ? '' : 's'}</span></div>${table(cols, shown.map(evRow))}${items.length > 25 ? `<p class="muted">and ${items.length - 25} more this month.</p>` : ''}</div>`; }).join('') : '<div class="panel"><p class="muted">No scheduled obligations in the next year.</p></div>'}`;
}

// A management review record structured around clause 9.3. The required inputs are
// assembled live from across the management system at the review date, and the recorded
// outputs and decisions are shown. This serves as the minutes and the evidence pack.
function renderManagementReview(id) {
  const reviews = getCollection('register.management-review');
  const r = reviews.find((x) => x.id === id);
  if (!r) { viewEl().innerHTML = `<h2>Management review not found</h2><div class="panel"><p>No management review with that reference.</p><p><a href="#/registers">Back to the registers</a></p></div>`; return; }
  const date = r.date ? new Date(r.date) : null;
  const held = date && date <= new Date();
  const prev = reviews.filter((x) => x.id !== id && x.date && (!date || new Date(x.date) < date)).sort((a, b) => new Date(b.date) - new Date(a.date));
  const ncs = getCollection('register.nonconformity');
  const ncOpen = ncs.filter((n) => !/clos|resolv|verif|complet/i.test(n.status));
  const ncOverdue = ncOpen.filter((n) => overdue(n.dueDate));
  const audits = getCollection('audits');
  const completedAudits = audits.filter((a) => /complet/i.test(a.status));
  const findings = audits.flatMap((a) => a.findings || []);
  const openFindings = findings.filter((f) => !/clos/i.test(f.status));
  const opportunities = findings.filter((f) => /opportun/i.test(f.type));
  const checks = readinessData(); const ready = pct(checks.filter((c) => c.ok).length, checks.length);
  const risks = getCollection('register.risk');
  const riskSeg = [['Critical', 'danger'], ['High', 'danger'], ['Medium', 'warn'], ['Low', 'ok']].map(([l, k]) => ({ label: l, value: risks.filter((e) => riskLevel(residualScore(e) || riskScore(e)).label === l).length, kind: k }));
  const suppliers = getCollection('register.supplier');
  const supNoDpa = suppliers.filter((s) => !/^y/i.test(s.dpa || '')).length;
  const supOffshore = suppliers.filter((s) => !isUkEu(s.dataLocation)).length;
  const ctx = getCollection('register.context');
  const climate = ctx.filter((c) => /^y/i.test(c.climate || '')).length;
  const section = (letter, title, body) => `<section class="report-section"><h3>${letter}. ${esc(title)}</h3>${body}</section>`;
  viewEl().innerHTML = `
    <p class="muted"><a href="#/registers">Registers</a> <span aria-hidden="true">/</span> ${esc(r.reviewId)}</p>
    <h2>${esc(routeTitle('review'))}: ${esc(r.reviewId)}</h2>
    <div class="toolbar"><button class="secondary" id="mr-print">${esc(t('btn.print'))}</button><span class="spacer"></span><a class="chip" href="#/registers">Back to the register</a></div>
    <div class="report">
      <div class="panel">
        <p>${held ? pill('Held', 'ok') : pill('Scheduled', 'warn')} <span class="muted">${date ? fmtDate(r.date) : 'date not set'}</span></p>
        <table class="spec"><tbody>
          <tr><th>Attendees</th><td>${esc(r.attendees) || '<span class="muted">not recorded</span>'}</td></tr>
          <tr><th>Standard</th><td>ISO/IEC 27001:2022 clause 9.3, ISO/IEC 42001:2023 clause 9.3</td></tr>
        </tbody></table>
        <p class="muted">The required inputs below are assembled from the management system as it stands now. Record the outputs and decisions in the management review register.</p>
      </div>
      ${section('a', 'Status of actions from previous management reviews', prev.length ? table(
        [{ key: 'reviewId', label: 'Review' }, { key: 'date', label: 'Date' }, { key: 'decisions', label: 'Decisions and actions' }],
        prev.map((p) => ({ reviewId: p.reviewId, date: fmtDate(p.date), decisions: p.decisions || '-' })),
      ) : '<p class="muted">This is the first recorded management review.</p>')}
      ${section('b', 'Changes in external and internal issues', `<div class="mini-cards">${mini(ctx.length, 'Context entries')}${mini(ctx.filter((c) => /interested/i.test(c.category)).length, 'Interested parties')}${mini(climate, 'Climate related', climate ? 'info' : '')}</div>`)}
      ${section('c', 'Performance: nonconformities, monitoring, audits and objectives', `<div class="mini-cards">${mini(ncOpen.length, 'Open nonconformities', ncOpen.length ? 'warn' : 'ok')}${mini(ncOverdue.length, 'Overdue actions', ncOverdue.length ? 'danger' : 'ok')}${mini(ready + '%', 'Certification readiness', ready >= 90 ? 'ok' : 'warn')}${mini(completedAudits.length, 'Audits completed', 'ok')}${mini(openFindings.length, 'Open audit findings', openFindings.length ? 'warn' : 'ok')}</div>${openFindings.length ? table([{ key: 'ref', label: 'Reference' }, { key: 'desc', label: 'Finding' }, { key: 'owner', label: 'Owner' }, { key: 'due', label: 'Due' }], openFindings.slice(0, 12).map((f) => ({ ref: f.reference || '-', desc: f.description, owner: f.owner || '-', due: fmtDate(f.dueDate) || '-' }))) : ''}`)}
      ${section('d', 'Feedback from interested parties', `<div class="mini-cards">${mini(suppliers.length, 'Suppliers')}${mini(supNoDpa, 'Without a DPA', supNoDpa ? 'danger' : 'ok')}${mini(supOffshore, 'Outside UK or EU', supOffshore ? 'danger' : 'ok')}</div>`)}
      ${section('e', 'Results of risk assessment and risk treatment', `<p class="muted">Residual risk levels across ${risks.length} risks.</p>${risks.length ? stackedBar(riskSeg) : '<p class="muted">No risks recorded.</p>'}`)}
      ${section('f', 'Opportunities for continual improvement', opportunities.length ? table([{ key: 'ref', label: 'Reference' }, { key: 'desc', label: 'Opportunity' }, { key: 'owner', label: 'Owner' }], opportunities.map((f) => ({ ref: f.reference || '-', desc: f.description, owner: f.owner || '-' }))) : '<p class="muted">No improvement opportunities are currently open from audits.</p>')}
      <section class="report-section"><h3>Outputs: decisions and actions</h3>${r.decisions ? `<p>${esc(r.decisions)}</p>` : '<p class="muted">No decisions recorded yet. Add them to this review in the management review register.</p>'}</section>
    </div>`;
  const p = document.getElementById('mr-print'); if (p) p.addEventListener('click', () => window.print());
}

// ---- internal audits -------------------------------------------------------

function findingPill(f) {
  if (/nonconform/i.test(f.type)) return pill(`${f.severity || 'Minor'} nonconformity`, /major/i.test(f.severity) ? 'danger' : 'warn');
  if (/opportun/i.test(f.type)) return pill('Opportunity', 'info');
  return pill('Observation', 'neutral');
}
// An annual audit schedule drawn as a Gantt style timeline: a month axis for the
// programme year with one row per audit, a marker at its planned date and a bar to its
// completion, coloured by status. Each row links to the audit.
function auditSchedule(audits) {
  const dated = audits.filter((a) => a.plannedDate);
  if (!dated.length) return '<p class="muted">No audits have a planned date yet.</p>';
  const year = new Date(dated.map((a) => a.plannedDate).sort()[0]).getFullYear();
  const yStart = new Date(year, 0, 1).getTime(); const yEnd = new Date(year + 1, 0, 1).getTime(); const span = yEnd - yStart;
  const sorted = dated.slice().sort((a, b) => new Date(a.plannedDate) - new Date(b.plannedDate));
  const W = 920; const left = 116; const right = 24; const top = 28; const rowH = 30; const H = top + sorted.length * rowH + 28;
  const plotW = W - left - right;
  const x = (t) => left + ((Math.max(yStart, Math.min(yEnd, new Date(t).getTime())) - yStart) / span) * plotW;
  const months = Array.from({ length: 12 }, (_, m) => new Date(year, m, 1));
  const grid = months.map((md) => { const gx = x(md.getTime()); return `<line x1="${gx.toFixed(1)}" y1="${top - 8}" x2="${gx.toFixed(1)}" y2="${(H - 22).toFixed(1)}" class="tl-grid"/><text x="${(gx + plotW / 24).toFixed(1)}" y="${H - 6}" class="tl-axis" text-anchor="middle">${md.toLocaleDateString('en-GB', { month: 'short' })}</text>`; }).join('');
  const now = Date.now();
  const todayLine = (now >= yStart && now <= yEnd) ? `<line x1="${x(now).toFixed(1)}" y1="${top - 8}" x2="${x(now).toFixed(1)}" y2="${(H - 22).toFixed(1)}" class="tl-today"><title>Today</title></line>` : '';
  const kindOf = (st) => (/complet/i.test(st) ? 'ok' : /progress/i.test(st) ? 'warn' : 'info');
  const rows = sorted.map((a, i) => {
    const y = top + i * rowH + rowH / 2; const px = x(a.plannedDate); const cx = a.completedDate ? x(a.completedDate) : px;
    const x1 = Math.min(px, cx); const x2 = Math.max(px, cx); const k = kindOf(a.status);
    const bar = (x2 - x1 > 3) ? `<rect x="${x1.toFixed(1)}" y="${(y - 5).toFixed(1)}" width="${(x2 - x1).toFixed(1)}" height="10" rx="5" class="gantt-bar ${k}"/>` : '';
    return `<a href="#/audits/${a.id}" class="dfd-link"><line x1="${left}" y1="${y.toFixed(1)}" x2="${(W - right).toFixed(1)}" y2="${y.toFixed(1)}" class="tl-base"/><text x="${left - 10}" y="${(y + 3).toFixed(1)}" class="tl-lane" text-anchor="end">${esc(a.ref)}</text>${bar}<circle cx="${px.toFixed(1)}" cy="${y.toFixed(1)}" r="6" class="gantt-dot ${k}"><title>${esc(a.ref)} ${esc(a.scope)}, ${esc(a.status)}, planned ${esc(fmtDate(a.plannedDate))}</title></circle></a>`;
  }).join('');
  return `<svg class="tl" viewBox="0 0 ${W} ${H}" role="img" aria-label="Annual audit schedule for ${year}">${grid}${todayLine}${rows}</svg>`;
}

function auditStats(audits) {
  const f = audits.flatMap((a) => a.findings || []);
  return {
    total: audits.length,
    complete: audits.filter((a) => /complet/i.test(a.status)).length,
    planned: audits.filter((a) => /plan|schedul/i.test(a.status)).length,
    open: f.filter((x) => !/clos/i.test(x.status)).length,
    major: f.filter((x) => /nonconform/i.test(x.type) && /major/i.test(x.severity)).length,
    minor: f.filter((x) => /nonconform/i.test(x.type) && /minor/i.test(x.severity)).length,
  };
}

const AUDIT_TRANSITIONS = {
  start: { from: ['Planned'], to: 'In progress', label: 'Start audit' },
  complete: { from: ['In progress'], to: 'Complete', label: 'Complete audit' },
  reopen: { from: ['Complete'], to: 'In progress', label: 'Reopen' },
};
let auditAdding = false;
let auditEditing = false;

function renderInternalAudits() {
  auditAdding = (typeof auditAdding === 'boolean') ? auditAdding : false;
  auditEditing = false;
  const audits = getCollection('audits');
  const editable = can('ISMS Manager');
  const s = auditStats(audits);
  const covered = new Set(audits.flatMap((a) => [...(a.clauseRefs || []), ...(a.controlRefs || [])]));
  const addForm = editable && auditAdding ? `
    <details class="panel" open><summary>Plan an audit</summary>
      <form id="audit-form"><div class="cards">
        <div><label for="a-scope">Scope</label><input id="a-scope" required /></div>
        <div><label for="a-standard">Standard</label><select id="a-standard"><option>ISO/IEC 27001:2022</option><option>ISO/IEC 42001:2023</option></select></div>
        <div><label for="a-planned">Planned date</label><input id="a-planned" type="date" /></div>
        <div><label for="a-auditor">Auditor</label><input id="a-auditor" /></div>
      </div><div class="toolbar" style="margin-top:12px"><button type="submit">Add audit</button><button type="button" class="secondary" id="audit-cancel">Cancel</button></div></form>
    </details>` : '';
  const rows = audits.map((a) => {
    const fc = a.findings || [];
    const open = fc.filter((f) => !/clos/i.test(f.status)).length;
    return { __html: true,
      ref: `<a href="#/audits/${a.id}">${esc(a.ref)}</a>`, scope: esc(a.scope), standard: esc(a.standard || ''),
      planned: esc(fmtDate(a.plannedDate) || '-'), completed: esc(fmtDate(a.completedDate) || '-'),
      auditor: esc(a.auditor || ''), status: pill(a.status || '-', auditStatusKind(a.status)),
      findings: fc.length ? `${fc.length} (${open} open)` : '<span class="muted">none</span>' };
  });
  const allFindings = audits.flatMap((a) => a.findings || []);
  const findingSeg = [
    { label: 'Major nonconformity', value: allFindings.filter((f) => /nonconform/i.test(f.type) && /major/i.test(f.severity)).length, kind: 'danger' },
    { label: 'Minor nonconformity', value: allFindings.filter((f) => /nonconform/i.test(f.type) && /minor/i.test(f.severity)).length, kind: 'warn' },
    { label: 'Observation', value: allFindings.filter((f) => /observ/i.test(f.type)).length, kind: 'neutral' },
    { label: 'Opportunity', value: allFindings.filter((f) => /opportun/i.test(f.type)).length, kind: 'info' },
  ];
  const inProgress = audits.filter((a) => /progress/i.test(a.status)).length;
  const statusSeg = [
    { label: 'Complete', value: s.complete, kind: 'ok' },
    { label: 'In progress', value: inProgress, kind: 'warn' },
    { label: 'Planned', value: s.planned, kind: 'info' },
  ];
  viewEl().innerHTML = `<h2>${esc(routeTitle('audits'))}</h2>
    <div class="panel"><div class="panel-head"><h3>Programme</h3><span class="muted">${covered.size} clauses and controls audited</span></div>
      <div class="mini-cards">${mini(s.total, 'Audits')}${mini(s.complete, 'Complete', 'ok')}${mini(s.planned, 'Planned', s.planned ? 'warn' : 'ok')}${mini(s.open, 'Open findings', s.open ? 'warn' : 'ok')}${mini(s.major, 'Major nonconformities', s.major ? 'danger' : 'ok')}${mini(s.minor, 'Minor nonconformities', s.minor ? 'warn' : 'ok')}</div>
    </div>
    <div class="panel"><div class="panel-head"><h3>Annual audit schedule</h3><span class="legend" style="margin:0"><span class="leg"><i class="dot ok"></i>Complete</span><span class="leg"><i class="dot warn"></i>In progress</span><span class="leg"><i class="dot info"></i>Planned</span></span></div>
      ${auditSchedule(audits)}
    </div>
    <div class="grid-2">
      <div class="panel"><div class="panel-head"><h3>Audit status</h3><span class="muted">${s.total} audits</span></div>${donut(statusSeg, { center: s.total ? pct(s.complete, s.total) + '%' : '0%', sub: 'complete', aria: 'Audit status' })}</div>
      <div class="panel"><div class="panel-head"><h3>Findings by type</h3><span class="muted">${allFindings.length} findings</span></div>${allFindings.length ? stackedBar(findingSeg) : '<p class="muted">No findings recorded.</p>'}</div>
    </div>
    <div class="toolbar">${editable ? '<button id="audit-plan">Plan an audit</button>' : ''}<span class="spacer"></span><button class="secondary" id="audit-csv">Export programme</button></div>
    ${addForm}
    <div class="panel table-wrap">${table(
      [{ key: 'ref', label: 'Reference' }, { key: 'scope', label: 'Scope' }, { key: 'standard', label: 'Standard' }, { key: 'planned', label: 'Planned' }, { key: 'completed', label: 'Completed' }, { key: 'auditor', label: 'Auditor' }, { key: 'status', label: 'Status' }, { key: 'findings', label: 'Findings' }],
      rows,
    )}</div>`;
  const plan = document.getElementById('audit-plan');
  if (plan) plan.addEventListener('click', () => { auditAdding = true; renderInternalAudits(); });
  const cancel = document.getElementById('audit-cancel');
  if (cancel) cancel.addEventListener('click', () => { auditAdding = false; renderInternalAudits(); });
  document.getElementById('audit-csv').addEventListener('click', () => {
    const cols = [{ key: 'ref', label: 'Reference' }, { key: 'scope', label: 'Scope' }, { key: 'standard', label: 'Standard' }, { key: 'planned', label: 'Planned' }, { key: 'completed', label: 'Completed' }, { key: 'auditor', label: 'Auditor' }, { key: 'status', label: 'Status' }, { key: 'findings', label: 'Findings' }];
    download('internal-audits.csv', toCsv(cols, audits.map((a) => ({ ref: a.ref, scope: a.scope, standard: a.standard, planned: fmtDate(a.plannedDate), completed: fmtDate(a.completedDate), auditor: a.auditor, status: a.status, findings: (a.findings || []).length }))), 'text/csv');
    audit('Exported', 'InternalAudit', 'Programme to CSV');
  });
  const form = document.getElementById('audit-form');
  if (form) form.addEventListener('submit', (e) => {
    e.preventDefault();
    const list = getCollection('audits');
    const yr = new Date().getFullYear();
    const n = list.filter((a) => (a.ref || '').includes('IA-' + yr)).length + 1;
    const a = { id: cid(), ref: `IA-${yr}-${String(n).padStart(2, '0')}`, scope: document.getElementById('a-scope').value.trim(), standard: document.getElementById('a-standard').value, plannedDate: document.getElementById('a-planned').value, completedDate: '', auditor: document.getElementById('a-auditor').value.trim(), status: 'Planned', summary: '', clauseRefs: [], controlRefs: [], findings: [] };
    list.unshift(a);
    setCollection('audits', list);
    audit('Created', 'InternalAudit', `${a.ref} planned`);
    auditAdding = false;
    go('audits/' + a.id);
    toast('Audit planned.');
  });
}

function renderAuditDetail(id) {
  const audits = getCollection('audits');
  const a = audits.find((x) => x.id === id);
  if (!a) { viewEl().innerHTML = '<p class="error">Audit not found.</p>'; return; }
  const editable = can('ISMS Manager');
  const coverage = [...(a.clauseRefs || []), ...(a.controlRefs || [])];
  const actions = editable ? Object.entries(AUDIT_TRANSITIONS).filter(([, t]) => t.from.includes(a.status)).map(([k, t]) => `<button class="secondary" data-aud="${k}">${t.label}</button>`).join(' ') : '';
  const cols = [{ key: 'type', label: 'Type' }, { key: 'description', label: 'Description' }, { key: 'reference', label: 'Reference' }, { key: 'owner', label: 'Owner' }, { key: 'due', label: 'Due' }, { key: 'status', label: 'Status' }];
  if (editable) cols.push({ key: 'act', label: '' });
  const findingsRows = (a.findings || []).map((f) => ({ __html: true,
    type: findingPill(f), description: esc(f.description), reference: f.reference ? `<span class="chip">${esc(f.reference)}</span>` : '-', owner: esc(f.owner || ''), due: reviewCell(f.dueDate), status: pill(/clos/i.test(f.status) ? 'Closed' : 'Open', /clos/i.test(f.status) ? 'ok' : 'warn'),
    act: editable ? `<div class="row-actions">${/clos/i.test(f.status) ? `<button class="secondary btn-sm" data-reopen="${f.id}">Reopen</button>` : `<button class="secondary btn-sm" data-close="${f.id}">Close</button>`}<button class="secondary btn-sm" data-fdel="${f.id}">Delete</button></div>` : '' }));
  const editForm = editable && auditEditing ? `
    <details class="panel" open><summary>Edit audit details</summary>
      <form id="audit-edit"><div class="cards">
        <div><label for="e-scope">Scope</label><input id="e-scope" value="${esc(a.scope)}" /></div>
        <div><label for="e-standard">Standard</label><select id="e-standard"><option ${a.standard === 'ISO/IEC 27001:2022' ? 'selected' : ''}>ISO/IEC 27001:2022</option><option ${a.standard === 'ISO/IEC 42001:2023' ? 'selected' : ''}>ISO/IEC 42001:2023</option></select></div>
        <div><label for="e-planned">Planned date</label><input id="e-planned" type="date" value="${esc(a.plannedDate || '')}" /></div>
        <div><label for="e-completed">Completed date</label><input id="e-completed" type="date" value="${esc(a.completedDate || '')}" /></div>
        <div><label for="e-auditor">Auditor</label><input id="e-auditor" value="${esc(a.auditor || '')}" /></div>
      </div>
      <label for="e-clauses">Clauses covered (comma separated)</label><input id="e-clauses" value="${esc((a.clauseRefs || []).join(', '))}" />
      <label for="e-controls">Controls covered (comma separated)</label><input id="e-controls" value="${esc((a.controlRefs || []).join(', '))}" />
      <label for="e-summary">Summary</label><input id="e-summary" value="${esc(a.summary || '')}" />
      <div class="toolbar" style="margin-top:12px"><button type="submit">Save</button><button type="button" class="secondary" id="edit-cancel">Cancel</button></div></form>
    </details>` : '';
  viewEl().innerHTML = `
    <h2>${esc(a.ref)} ${esc(a.scope)}</h2>
    <div class="panel">
      <p>${pill(a.status, auditStatusKind(a.status))} <span class="muted">${esc(a.standard || '')} | Auditor: ${esc(a.auditor) || 'not set'}</span></p>
      <p class="muted">Planned: ${fmtDate(a.plannedDate) || '-'} ${a.completedDate ? '| Completed: ' + fmtDate(a.completedDate) : ''}</p>
      ${a.summary ? `<p>${esc(a.summary)}</p>` : ''}
      ${coverage.length ? `<p class="muted">Coverage: ${coverage.map((r) => `<span class="chip">${esc(r)}</span>`).join('')}</p>` : ''}
      <div class="toolbar">${actions}${editable ? '<button class="secondary" data-aud="edit">Edit details</button>' : ''}<span class="spacer"></span><a href="#/audits">Back to programme</a></div>
    </div>
    ${editForm}
    <div class="panel"><div class="panel-head"><h3>Findings</h3><span class="muted">${(a.findings || []).length} recorded</span></div>
      ${table(cols, findingsRows)}
      ${editable ? `<details class="panel" style="margin-top:12px"><summary>Add finding</summary>
        <form id="finding-form"><div class="cards">
          <div><label for="f-type">Type</label><select id="f-type"><option>Nonconformity</option><option>Observation</option><option>Opportunity for improvement</option></select></div>
          <div><label for="f-sev">Severity</label><select id="f-sev"><option value="">Not applicable</option><option>Minor</option><option>Major</option></select></div>
          <div><label for="f-ref">Reference</label><input id="f-ref" placeholder="A.8.13 or 9.2" /></div>
          <div><label for="f-owner">Owner</label><input id="f-owner" /></div>
          <div><label for="f-due">Due date</label><input id="f-due" type="date" /></div>
        </div><label for="f-desc">Description</label><input id="f-desc" required />
        <div class="toolbar" style="margin-top:12px"><button type="submit">Add finding</button></div></form></details>` : ''}
    </div>`;
  const save = () => setCollection('audits', audits);
  viewEl().querySelectorAll('[data-aud]').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.aud;
    if (k === 'edit') { auditEditing = true; renderAuditDetail(id); return; }
    const t = AUDIT_TRANSITIONS[k];
    if (!t || !t.from.includes(a.status)) return;
    a.status = t.to;
    if (k === 'complete' && !a.completedDate) a.completedDate = new Date().toISOString().slice(0, 10);
    save(); audit('StatusChanged', 'InternalAudit', `${a.ref} ${a.status}`); renderAuditDetail(id); toast(`${a.ref} is now ${a.status}.`);
  }));
  const ec = document.getElementById('edit-cancel');
  if (ec) ec.addEventListener('click', () => { auditEditing = false; renderAuditDetail(id); });
  const ef = document.getElementById('audit-edit');
  if (ef) ef.addEventListener('submit', (e) => {
    e.preventDefault();
    const parse = (v) => v.split(',').map((x) => x.trim()).filter(Boolean);
    a.scope = document.getElementById('e-scope').value.trim();
    a.standard = document.getElementById('e-standard').value;
    a.plannedDate = document.getElementById('e-planned').value;
    a.completedDate = document.getElementById('e-completed').value;
    a.auditor = document.getElementById('e-auditor').value.trim();
    a.clauseRefs = parse(document.getElementById('e-clauses').value);
    a.controlRefs = parse(document.getElementById('e-controls').value);
    a.summary = document.getElementById('e-summary').value.trim();
    save(); audit('Updated', 'InternalAudit', `${a.ref} details`); auditEditing = false; renderAuditDetail(id); toast('Audit updated.');
  });
  const ff = document.getElementById('finding-form');
  if (ff) ff.addEventListener('submit', (e) => {
    e.preventDefault();
    a.findings = a.findings || [];
    a.findings.push({ id: cid(), type: document.getElementById('f-type').value, severity: document.getElementById('f-sev').value, description: document.getElementById('f-desc').value.trim(), reference: document.getElementById('f-ref').value.trim(), owner: document.getElementById('f-owner').value.trim(), dueDate: document.getElementById('f-due').value, status: 'Open' });
    save(); audit('Created', 'AuditFinding', `${a.ref} finding`); renderAuditDetail(id); toast('Finding added.');
  });
  viewEl().querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => { const f = a.findings.find((x) => x.id === b.dataset.close); if (f) { f.status = 'Closed'; save(); renderAuditDetail(id); toast('Finding closed.'); } }));
  viewEl().querySelectorAll('[data-reopen]').forEach((b) => b.addEventListener('click', () => { const f = a.findings.find((x) => x.id === b.dataset.reopen); if (f) { f.status = 'Open'; save(); renderAuditDetail(id); } }));
  viewEl().querySelectorAll('[data-fdel]').forEach((b) => b.addEventListener('click', () => { if (!confirm('Delete this finding?')) return; a.findings = a.findings.filter((x) => x.id !== b.dataset.fdel); save(); renderAuditDetail(id); }));
}

// ---- certification body scorecard ------------------------------------------

function bodyScore(b) {
  let got = 0; let max = 0;
  for (const c of CERT_CRITERIA) { got += Number((b.scores || {})[c.key] || 0) * c.weight; max += 5 * c.weight; }
  return max ? Math.round((got / max) * 100) : 0;
}
function scoreKind(p) { return p >= 80 ? 'ok' : p >= 60 ? 'warn' : 'danger'; }

let cbAdding = false;
function renderCertBodies() {
  const bodies = getCollection('certBodies');
  const editable = can('ISMS Manager');
  const scored = bodies.slice().map((b) => ({ b, p: bodyScore(b) })).sort((x, y) => y.p - x.p);
  const topId = scored.length && scored[0].p > 0 ? scored[0].b.id : null;
  const addForm = editable && cbAdding ? `
    <details class="panel" open><summary>Add a certification body</summary>
      <form id="cb-form"><div class="cards">
        <div><label for="cb-name">Name</label><input id="cb-name" required /></div>
        <div><label for="cb-acc">Accreditation</label><input id="cb-acc" placeholder="UKAS" /></div>
        <div><label for="cb-scopes">Scopes (comma separated)</label><input id="cb-scopes" placeholder="ISO/IEC 27001, ISO/IEC 42001" /></div>
      </div><div class="toolbar" style="margin-top:12px"><button type="submit">Add</button><button type="button" class="secondary" id="cb-cancel">Cancel</button></div></form>
    </details>` : '';
  const cards = scored.map(({ b, p }) => `
    <a class="cb-card" href="#/certbody/${b.id}">
      ${b.id === topId ? '<span class="cb-badge">Recommended</span>' : ''}
      <div class="ring sm ${scoreKind(p)}" style="--p:${p}"><div class="inner"><div class="v">${p}%</div></div></div>
      <div class="cb-meta"><div class="cb-name">${esc(b.name)}</div><div class="muted">${esc(b.accreditation || 'No accreditation')}</div><div>${(b.scopes || []).map((s) => `<span class="chip">${esc(s)}</span>`).join('')}</div></div>
    </a>`).join('');
  const cmpCols = [{ key: 'name', label: 'Body' }].concat(CERT_CRITERIA.map((c) => ({ key: c.key, label: `${c.label} (${c.weight})` }))).concat([{ key: 'total', label: 'Weighted score' }]);
  const cmpRows = scored.map(({ b, p }) => { const o = { __html: true, name: `<a href="#/certbody/${b.id}">${esc(b.name)}</a>` }; for (const c of CERT_CRITERIA) o[c.key] = esc(String((b.scores || {})[c.key] || '-')); o.total = pill(`${p}%`, scoreKind(p)); return o; });
  viewEl().innerHTML = `<h2>${esc(routeTitle('certbody'))}</h2>
    <div class="panel"><div class="panel-head"><h3>Assessment</h3><span class="muted">${bodies.length} bodies, scored against ${CERT_CRITERIA.length} weighted criteria</span></div>
      <p class="muted">A weighted scorecard to choose and review the external certification body. Open a body to score it; the highest weighted score is recommended.</p>
      <div class="cb-cards">${cards || '<p class="muted">No bodies recorded.</p>'}</div>
    </div>
    <div class="toolbar">${editable ? '<button id="cb-add">Add a certification body</button>' : ''}<span class="spacer"></span>${editable ? '<button class="secondary" id="cb-load">Load the sample assessment</button>' : ''}<button class="secondary" id="cb-csv">Export</button></div>
    ${addForm}
    <div class="panel table-wrap"><div class="panel-head"><h3>Comparison</h3><span class="muted">scores 1 to 5, weight in brackets</span></div>${table(cmpCols, cmpRows)}</div>`;
  const add = document.getElementById('cb-add'); if (add) add.addEventListener('click', () => { cbAdding = true; renderCertBodies(); });
  const cancel = document.getElementById('cb-cancel'); if (cancel) cancel.addEventListener('click', () => { cbAdding = false; renderCertBodies(); });
  const load = document.getElementById('cb-load'); if (load) load.addEventListener('click', () => { if (!confirm('Load the sample certification body assessment? This replaces the current bodies.')) return; const n = loadCertBodySet(); audit('Imported', 'CertBody', `Loaded the sample assessment (${n} bodies)`); renderCertBodies(); toast(`Loaded ${n} certification bodies.`); });
  document.getElementById('cb-csv').addEventListener('click', () => {
    const cols = [{ key: 'name', label: 'Body' }, { key: 'acc', label: 'Accreditation' }, { key: 'scopes', label: 'Scopes' }].concat(CERT_CRITERIA.map((c) => ({ key: c.key, label: c.label }))).concat([{ key: 'total', label: 'Weighted score' }]);
    const data = scored.map(({ b, p }) => { const o = { name: b.name, acc: b.accreditation, scopes: (b.scopes || []).join('; ') }; for (const c of CERT_CRITERIA) o[c.key] = (b.scores || {})[c.key] || ''; o.total = `${p}%`; return o; });
    download('certification-bodies.csv', toCsv(cols, data), 'text/csv');
    audit('Exported', 'CertBody', 'Assessment to CSV');
  });
  const form = document.getElementById('cb-form');
  if (form) form.addEventListener('submit', (e) => {
    e.preventDefault();
    const list = getCollection('certBodies');
    const b = { id: cid(), name: document.getElementById('cb-name').value.trim(), accreditation: document.getElementById('cb-acc').value.trim(), scopes: document.getElementById('cb-scopes').value.split(',').map((x) => x.trim()).filter(Boolean), notes: '', scores: {} };
    list.push(b); setCollection('certBodies', list); audit('Created', 'CertBody', b.name); cbAdding = false; go('certbody/' + b.id); toast('Certification body added.');
  });
  animateRings(viewEl());
}

function renderCertBodyDetail(id) {
  const bodies = getCollection('certBodies');
  const b = bodies.find((x) => x.id === id);
  if (!b) { viewEl().innerHTML = '<p class="error">Certification body not found.</p>'; return; }
  const editable = can('ISMS Manager');
  const p = bodyScore(b);
  const rows = CERT_CRITERIA.map((c) => {
    const v = Number((b.scores || {})[c.key] || 0);
    const sel = editable ? `<select data-crit="${c.key}">${[0, 1, 2, 3, 4, 5].map((n) => `<option value="${n}" ${n === v ? 'selected' : ''}>${n === 0 ? 'Not scored' : n}</option>`).join('')}</select>` : (v || '-');
    return { __html: true, criterion: `${esc(c.label)}<div class="muted" style="font-size:12px">${esc(c.note)}</div>`, weight: String(c.weight), score: sel };
  });
  viewEl().innerHTML = `
    <h2>${esc(b.name)}</h2>
    <div class="panel"><div class="readiness-hero">
      <div class="ring ${scoreKind(p)}" style="--p:${p}"><div class="inner"><div class="v" id="cb-score">${p}%</div><div class="l">weighted</div></div></div>
      <div class="readiness-sum">
        <p>${pill(b.accreditation || 'No accreditation recorded', b.accreditation ? 'ok' : 'warn')} ${(b.scopes || []).map((s) => `<span class="chip">${esc(s)}</span>`).join('')}</p>
        <p class="muted">${esc(b.notes || '')}</p>
        <div class="toolbar"><a href="#/certbody">Back to assessment</a></div>
      </div>
    </div></div>
    <div class="panel"><div class="panel-head"><h3>Scorecard</h3><span class="muted">score each criterion 1 to 5</span></div>
      ${table([{ key: 'criterion', label: 'Criterion' }, { key: 'weight', label: 'Weight' }, { key: 'score', label: 'Score' }], rows)}
      ${editable ? `<label for="cb-notes" style="margin-top:12px">Notes</label><input id="cb-notes" value="${esc(b.notes || '')}" /><div class="toolbar" style="margin-top:12px"><button id="cb-save">Save scorecard</button></div>` : ''}
    </div>`;
  const preview = () => {
    const tmp = { scores: {} };
    viewEl().querySelectorAll('[data-crit]').forEach((s) => { tmp.scores[s.dataset.crit] = Number(s.value); });
    const np = bodyScore(tmp);
    document.getElementById('cb-score').textContent = np + '%';
    const ring = viewEl().querySelector('.ring');
    ring.className = `ring ${scoreKind(np)}`;
    ring.style.setProperty('--p', np);
  };
  viewEl().querySelectorAll('[data-crit]').forEach((s) => s.addEventListener('change', preview));
  const save = document.getElementById('cb-save');
  if (save) save.addEventListener('click', () => {
    b.scores = {};
    viewEl().querySelectorAll('[data-crit]').forEach((s) => { b.scores[s.dataset.crit] = Number(s.value); });
    b.notes = document.getElementById('cb-notes').value.trim();
    setCollection('certBodies', bodies); audit('Updated', 'CertBody', `${b.name} scorecard`); renderCertBodyDetail(id); toast('Scorecard saved.');
  });
  animateRings(viewEl());
}

function renderAudit() {
  if (!can('ISMS Manager')) { viewEl().innerHTML = '<p class="error">The audit log is available to the ISMS Manager and Administrator roles.</p>'; return; }
  const log = getCollection('audit');
  viewEl().innerHTML = `<h2>Audit log</h2><p class="muted">A record of actions taken in this browser. Append only in the application.</p>
    <div class="toolbar"><button class="secondary" id="audit-csv">Export</button></div>
    <div class="panel">${table(
      [{ key: 'ts', label: 'When' }, { key: 'actor', label: 'Who' }, { key: 'action', label: 'Action' }, { key: 'entity', label: 'Entity' }, { key: 'detail', label: 'Detail' }],
      log.map((a) => ({ ts: a.ts.slice(0, 19).replace('T', ' '), actor: a.actor, action: a.action, entity: a.entity, detail: a.detail })),
    )}</div>`;
  document.getElementById('audit-csv').addEventListener('click', () => {
    download('audit-log.csv', toCsv([{ key: 'ts', label: 'When' }, { key: 'actor', label: 'Who' }, { key: 'action', label: 'Action' }, { key: 'entity', label: 'Entity' }, { key: 'detail', label: 'Detail' }], log), 'text/csv');
  });
}

function renderSearch() {
  viewEl().innerHTML = `<h2>Search</h2>
    <div class="toolbar"><input id="q" placeholder="Search documents, their content, controls and clauses" style="width:380px" aria-label="Search" /></div>
    <div id="results"><p class="muted">Search runs across every document's full content, plus the controls and clauses.</p></div>`;
  const input = document.getElementById('q');
  const docs = getCollection('documents');
  const byRef = Object.fromEntries(docs.map((d) => [d.ref, d]));
  const run = async () => {
    const q = input.value.trim();
    const ql = q.toLowerCase();
    const results = document.getElementById('results');
    if (q.length < 2) { results.innerHTML = '<p class="muted">Search runs across every document’s full content, plus the controls and clauses.</p>'; return; }
    const titleDocs = docs.filter((d) => (d.title + ' ' + d.ref).toLowerCase().includes(ql));
    const titleRefs = new Set(titleDocs.map((d) => d.ref));
    const controls = CONTROLS.filter((c) => (c.title + ' ' + c.ref + ' ' + c.theme).toLowerCase().includes(ql));
    const clauses = CLAUSES.filter((c) => (c.title + ' ' + c.number).toLowerCase().includes(ql));
    const index = await loadSearchIndex();
    const contentHits = [];
    for (const entry of index) {
      if (titleRefs.has(entry.ref)) continue;
      const i = entry.text.toLowerCase().indexOf(ql);
      if (i >= 0) {
        const d = byRef[entry.ref];
        contentHits.push(`<div class="hit"><a href="#/documents/${d ? d.id : ''}">${esc(entry.ref)}</a> ${esc(d ? d.title : '')} ${d && d.system ? `<span class="badge">${esc(d.system)}</span>` : ''}<div class="snippet">${snippet(entry.text, i, q.length)}</div></div>`);
      }
      if (contentHits.length >= 40) break;
    }
    if (input.value.trim() !== q) return;
    results.innerHTML = `
      <div class="panel"><div class="panel-head"><h3>Documents</h3><span class="muted">${titleDocs.length} by title or reference, ${contentHits.length} by content</span></div>
        ${titleDocs.map((d) => `<p><a href="#/documents/${d.id}">${esc(d.ref)}</a> ${esc(d.title)}</p>`).join('')}
        ${contentHits.join('')}
        ${titleDocs.length || contentHits.length ? '' : '<p class="muted">No documents matched.</p>'}</div>
      <div class="panel"><h3>Controls</h3>${controls.map((c) => `<p>${esc(c.ref)} ${esc(c.title)}</p>`).join('') || '<p class="muted">None.</p>'}</div>
      <div class="panel"><h3>Clauses</h3>${clauses.map((c) => `<p>${esc(c.number)} ${esc(c.title)}</p>`).join('') || '<p class="muted">None.</p>'}</div>`;
  };
  input.addEventListener('input', debounce(run, 160));
  input.focus();
}

// ---- architecture and data flows -------------------------------------------

// Greedily wrap a label into lines of at most maxChars, for SVG text that cannot wrap.
function wrapText(text, maxChars) {
  const words = String(text).split(' ');
  const lines = []; let cur = '';
  for (const w of words) {
    if (!cur) cur = w;
    else if ((cur + ' ' + w).length <= maxChars) cur += ' ' + w;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}

// A hub and spoke graph: a central node connected to a ring of related items. Used to
// show, around a control, the documents, risks and evidence linked to it.
function radialGraph(hub, items) {
  const W = 760; const H = 360; const cx = W / 2; const cy = H / 2;
  const n = items.length; const R = Math.min(cx, cy) - 58;
  const placed = items.map((nd, i) => {
    const ang = (-90 + (360 * i) / Math.max(n, 1)) * Math.PI / 180;
    return { ...nd, px: cx + R * Math.cos(ang), py: cy + R * Math.sin(ang), w: 124, h: 38 };
  });
  const edges = placed.map((it) => `<line x1="${cx}" y1="${cy}" x2="${it.px.toFixed(1)}" y2="${it.py.toFixed(1)}" class="dfd-edge"/>`).join('');
  const boxes = placed.map((it) => {
    const lines = wrapText(it.label, 17); const lh = 12; const sy = it.py - ((lines.length - 1) * lh) / 2 + 3.5;
    const txt = lines.map((ln, i) => `<text x="${it.px.toFixed(1)}" y="${(sy + i * lh).toFixed(1)}" class="rg-t" text-anchor="middle">${esc(ln)}</text>`).join('');
    const rect = `<rect x="${(it.px - it.w / 2).toFixed(1)}" y="${(it.py - it.h / 2).toFixed(1)}" width="${it.w}" height="${it.h}" rx="8" class="dfd-node dfd-${it.kind}"/>`;
    return it.href ? `<a href="${it.href}" class="dfd-link">${rect}${txt}</a>` : rect + txt;
  }).join('');
  const hw = 96; const hh = 46;
  const hubBox = `<rect x="${cx - hw / 2}" y="${cy - hh / 2}" width="${hw}" height="${hh}" rx="9" class="rg-hub"/><text x="${cx}" y="${cy + 4}" class="rg-hubt" text-anchor="middle">${esc(hub)}</text>`;
  return `<svg class="dfd" viewBox="0 0 ${W} ${H}" role="img" aria-label="Connections for ${esc(hub)}">${edges}${boxes}${hubBox}</svg>`;
}

// Pick the anchor points on two boxes for a connecting edge, on the sides that face
// each other, so arrows meet the box edge rather than its centre.
function flowAnchors(a, b) {
  const ac = { x: a.x + a.w / 2, y: a.y + a.h / 2 };
  const bc = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
  const dx = bc.x - ac.x; const dy = bc.y - ac.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return [{ x: a.x + (dx > 0 ? a.w : 0), y: ac.y }, { x: b.x + (dx > 0 ? 0 : b.w), y: bc.y }];
  }
  return [{ x: ac.x, y: a.y + (dy > 0 ? a.h : 0) }, { x: bc.x, y: b.y + (dy > 0 ? 0 : b.h) }];
}
// Render a labelled box and arrow diagram as a scalable SVG. Boundary nodes are drawn
// first as dashed containers, then edges, then the boxes on top.
function flowSvg(nodes, edges, w, h, extra = '') {
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const boundaries = nodes.filter((n) => n.kind === 'boundary').map((n) => `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="12" class="dfd-boundary"/><text x="${n.x + 13}" y="${n.y + 20}" class="dfd-blabel">${esc(n.title)}</text>`).join('');
  const edgeSvg = edges.map((e) => {
    const a = byId[e.from]; const b = byId[e.to]; if (!a || !b) return '';
    const [s, t] = flowAnchors(a, b);
    const lbl = e.label ? `<text x="${((s.x + t.x) / 2).toFixed(1)}" y="${((s.y + t.y) / 2 - 4).toFixed(1)}" class="dfd-elabel" text-anchor="middle">${esc(e.label)}</text>` : '';
    return `<line x1="${s.x.toFixed(1)}" y1="${s.y.toFixed(1)}" x2="${t.x.toFixed(1)}" y2="${t.y.toFixed(1)}" class="dfd-edge${e.dashed ? ' dashed' : ''}" marker-end="url(#dfd-arrow)"/>${lbl}`;
  }).join('');
  const boxes = nodes.filter((n) => n.kind !== 'boundary').map((n) => {
    const cx = (n.x + n.w / 2).toFixed(1);
    let textSvg;
    if (n.sub) {
      textSvg = `<text x="${cx}" y="${(n.y + n.h / 2 - 3).toFixed(1)}" class="dfd-title" text-anchor="middle">${esc(n.title)}</text><text x="${cx}" y="${(n.y + n.h / 2 + 13).toFixed(1)}" class="dfd-sub" text-anchor="middle">${esc(n.sub)}</text>`;
    } else {
      const lines = wrapText(n.title, Math.max(8, Math.floor(n.w / 7.4)));
      const lh = 14; const startY = n.y + n.h / 2 - ((lines.length - 1) * lh) / 2 + 4;
      textSvg = lines.map((ln, i) => `<text x="${cx}" y="${(startY + i * lh).toFixed(1)}" class="dfd-title" text-anchor="middle">${esc(ln)}</text>`).join('');
    }
    const rect = `<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="9" class="dfd-node dfd-${n.kind}"/>`;
    return n.href ? `<a href="${n.href}" class="dfd-link">${rect}${textSvg}</a>` : `${rect}${textSvg}`;
  }).join('');
  return `<svg class="dfd" viewBox="0 0 ${w} ${h}" role="img" aria-label="Diagram">
    <defs><marker id="dfd-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="dfd-arrowhead"/></marker></defs>
    ${boundaries}${edgeSvg}${boxes}${extra}</svg>`;
}

function dataFlowDiagram() {
  const nodes = [
    { id: 'region', kind: 'boundary', x: 196, y: 36, w: 470, h: 470, title: 'UK / EU region, AWS eu-west-1' },
    { id: 'customer', kind: 'actor', x: 18, y: 118, w: 132, h: 56, title: 'Customer', sub: 'Conversation data' },
    { id: 'admin', kind: 'actor', x: 18, y: 320, w: 132, h: 56, title: 'Administrator', sub: 'Console access' },
    { id: 'webapp', kind: 'system', x: 232, y: 118, w: 150, h: 56, title: 'Web app', sub: 'TLS in transit' },
    { id: 'gateway', kind: 'system', x: 232, y: 228, w: 150, h: 56, title: 'API gateway', sub: 'AuthN and AuthZ' },
    { id: 'inference', kind: 'system', x: 232, y: 338, w: 150, h: 56, title: 'AI inference', sub: 'Prompt handling' },
    { id: 'vault', kind: 'vault', x: 470, y: 118, w: 174, h: 56, title: 'Secrets and key vault', sub: 'Restricted' },
    { id: 'datastore', kind: 'store', x: 470, y: 228, w: 174, h: 56, title: 'Conversation store', sub: 'PostgreSQL, Confidential' },
    { id: 'storage', kind: 'store', x: 470, y: 338, w: 174, h: 56, title: 'Object storage', sub: 'Transcripts, Confidential' },
    { id: 'model', kind: 'external', x: 706, y: 96, w: 178, h: 54, title: 'Model provider', sub: 'EU endpoint' },
    { id: 'sso', kind: 'external', x: 706, y: 188, w: 178, h: 54, title: 'SSO and identity', sub: 'Okta, EU' },
    { id: 'obs', kind: 'external', x: 706, y: 280, w: 178, h: 54, title: 'Observability', sub: 'Datadog, EU' },
    { id: 'msg', kind: 'external', x: 706, y: 372, w: 178, h: 54, title: 'Messaging gateway', sub: 'Twilio, EU and UK' },
  ];
  const edges = [
    { from: 'customer', to: 'webapp', label: 'HTTPS' },
    { from: 'admin', to: 'gateway', label: 'HTTPS' },
    { from: 'webapp', to: 'gateway' },
    { from: 'gateway', to: 'inference' },
    { from: 'gateway', to: 'sso', label: 'OIDC', dashed: true },
    { from: 'gateway', to: 'vault', dashed: true },
    { from: 'inference', to: 'model', label: 'prompt / response', dashed: true },
    { from: 'inference', to: 'datastore', label: 'store' },
    { from: 'datastore', to: 'storage', label: 'transcripts' },
    { from: 'inference', to: 'obs', label: 'logs', dashed: true },
    { from: 'gateway', to: 'msg', label: 'notify', dashed: true },
  ];
  return flowSvg(nodes, edges, 900, 520);
}

function incidentFlowDiagram() {
  const top = ['detect', 'triage', 'contain', 'recover', 'assess', 'review'];
  const titles = { detect: 'Detect and report', triage: 'Triage and classify', contain: 'Contain', recover: 'Eradicate and recover', assess: 'Personal data breach?', review: 'Post incident review' };
  const kinds = { detect: 'system', triage: 'system', contain: 'system', recover: 'system', assess: 'vault', review: 'store' };
  const w = 132; const step = 148; const x0 = 18; const y = 60; const h = 66;
  const nodes = top.map((id, i) => ({ id, kind: kinds[id], x: x0 + i * step, y, w, h, title: titles[id] }));
  nodes.push({ id: 'notify', kind: 'alert', x: x0 + 4 * step, y: 214, w, h: 72, title: 'Notify the ICO within 72 hours' });
  const edges = [
    { from: 'detect', to: 'triage' }, { from: 'triage', to: 'contain' }, { from: 'contain', to: 'recover' }, { from: 'recover', to: 'assess' },
    { from: 'assess', to: 'review' }, { from: 'assess', to: 'notify', label: 'breach' }, { from: 'notify', to: 'review' },
  ];
  return flowSvg(nodes, edges, 960, 320);
}

function documentLifecycleDiagram() {
  const nodes = [
    { id: 'draft', kind: 'external', x: 30, y: 150, w: 124, h: 54, title: 'Draft' },
    { id: 'review', kind: 'vault', x: 196, y: 150, w: 124, h: 54, title: 'In review' },
    { id: 'approved', kind: 'system', x: 362, y: 150, w: 124, h: 54, title: 'Approved' },
    { id: 'published', kind: 'store', x: 528, y: 150, w: 124, h: 54, title: 'Published' },
    { id: 'retired', kind: 'external', x: 712, y: 150, w: 124, h: 54, title: 'Retired' },
    { id: 'revision', kind: 'vault', x: 528, y: 40, w: 124, h: 54, title: 'Under revision' },
  ];
  const edges = [
    { from: 'draft', to: 'review', label: 'submit' }, { from: 'review', to: 'approved', label: 'approve' },
    { from: 'approved', to: 'published', label: 'publish' }, { from: 'published', to: 'retired', label: 'retire' },
    { from: 'published', to: 'revision', label: 'revise' }, { from: 'revision', to: 'review', label: 'resubmit', dashed: true },
  ];
  return flowSvg(nodes, edges, 880, 240);
}

function operatingModelDiagram() {
  const stages = [
    ['context', 'Context', 'registers', 'plan'], ['risk', 'Risk assessment', 'registers', 'plan'], ['treat', 'Risk treatment', 'framework', 'plan'],
    ['soa', 'Statement of Applicability', 'soa', 'do'], ['docs', 'Documents and evidence', 'documents', 'do'],
    ['audit', 'Internal audit', 'audits', 'check'], ['review', 'Management review', 'registers', 'check'],
    ['improve', 'Improvement', 'registers', 'act'],
  ];
  const n = stages.length; const w = 100; const gap = 8; const total = n * w + (n - 1) * gap; const x0 = (920 - total) / 2; const y = 78; const h = 66;
  const nodes = stages.map(([id, title, href, band], i) => ({ id, kind: `om ${band}`, x: x0 + i * (w + gap), y, w, h, title, href: '#/' + href }));
  const edges = stages.slice(1).map((s, i) => ({ from: stages[i][0], to: s[0] }));
  // Plan, Do, Check, Act band labels above their stage groups.
  const bandLabel = (label, from, to) => { const a = nodes[from]; const b = nodes[to]; const cx = (a.x + b.x + b.w) / 2; return `<text x="${cx.toFixed(1)}" y="42" class="om-band" text-anchor="middle">${label}</text>`; };
  const bands = bandLabel('PLAN', 0, 2) + bandLabel('DO', 3, 4) + bandLabel('CHECK', 5, 6) + bandLabel('ACT', 7, 7);
  // Loop back from Improvement to Context to show the cycle.
  const last = nodes[n - 1]; const first = nodes[0];
  const loop = `<path d="M${(last.x + last.w / 2).toFixed(1)},${last.y + last.h} C${last.x + last.w / 2},${last.y + last.h + 70} ${first.x + first.w / 2},${first.y + first.h + 70} ${(first.x + first.w / 2).toFixed(1)},${first.y + first.h}" class="dfd-edge dashed" marker-end="url(#dfd-arrow)"/><text x="460" y="${last.y + last.h + 64}" class="dfd-elabel" text-anchor="middle">Continual improvement</text>`;
  return flowSvg(nodes, edges, 920, 250, bands + loop);
}

function controlMosaic() {
  const soaByRef = Object.fromEntries(getCollection('soa').map((s) => [s.ref, s]));
  const themes = Array.from(new Set(CONTROLS.map((c) => c.theme)));
  const cls = (s) => {
    if (!s || s.applicable === null) return 'undecided';
    if (s.applicable === false) return 'excluded';
    return ({ Verified: 'verified', Implemented: 'implemented', 'In progress': 'progress', 'Not started': 'notstarted' })[s.status] || 'notstarted';
  };
  return themes.map((th) => {
    const cs = CONTROLS.filter((c) => c.theme === th);
    const cells = cs.map((c) => `<a class="mosaic-cell ${cls(soaByRef[c.ref])}" href="#/control/${esc(c.ref)}" title="${esc(c.ref)} ${esc(c.title)}" aria-label="${esc(c.ref)}"></a>`).join('');
    return `<div class="mosaic-group"><div class="mosaic-th">${esc(th)} <span class="muted">${cs.length}</span></div><div class="mosaic-grid">${cells}</div></div>`;
  }).join('');
}

function renderArchitecture() {
  const suppliers = getCollection('register.supplier');
  const ukeu = suppliers.filter((s) => isUkEu(s.dataLocation)).length;
  const assets = getCollection('register.asset');
  const soa = getCollection('soa');
  const applicable = soa.filter((s) => s.applicable === true).length;
  const implemented = soa.filter((s) => s.applicable === true && ['Implemented', 'Verified'].includes(s.status)).length;
  const legend = (cls, label) => `<span class="leg"><i class="mosaic-cell ${cls}" style="width:14px;height:14px"></i>${esc(label)}</span>`;
  viewEl().innerHTML = `
    <h2>${esc(routeTitle('architecture'))}</h2>
    <div class="panel">
      <div class="panel-head"><h3>System data flow</h3><span class="muted">${assets.length} assets, ${suppliers.length} suppliers, ${ukeu} in the UK or EU</span></div>
      <p class="muted">How conversation data moves through the Cloudax platform. Personal data stays within the UK or EU region. Dashed lines are control or supporting flows. Boxes link to where they are managed.</p>
      ${dataFlowDiagram()}
      <div class="legend" style="margin-top:10px">
        <span class="leg"><i class="dot" style="background:var(--brand)"></i>Actor</span>
        <span class="leg"><i class="dot" style="background:var(--brand-300)"></i>System component</span>
        <span class="leg"><i class="dot" style="background:var(--ok-solid)"></i>Data store</span>
        <span class="leg"><i class="dot" style="background:var(--warn-solid)"></i>Secrets</span>
        <span class="leg"><i class="dot" style="background:var(--neutral-solid)"></i>External provider</span>
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>Management system operating model</h3><span class="muted">Plan, do, check, act</span></div>
      <p class="muted">The golden thread of the management system, from understanding the context through to continual improvement. Each stage links to where it is run.</p>
      ${operatingModelDiagram()}
    </div>
    <div class="grid-2">
      <div class="panel">
        <div class="panel-head"><h3>Incident and breach response</h3></div>
        <p class="muted">From detection to lessons learned, with the assessment of whether personal data is affected and notification of the ICO within seventy two hours.</p>
        ${incidentFlowDiagram()}
      </div>
      <div class="panel">
        <div class="panel-head"><h3>Document control lifecycle</h3></div>
        <p class="muted">The states a controlled document moves through, from draft to retirement, including the revision loop after publication.</p>
        ${documentLifecycleDiagram()}
      </div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>Annex A control status</h3><span class="muted">${applicable} applicable, ${implemented} implemented or verified</span></div>
      <p class="muted">Every Annex A control, grouped by theme and coloured by implementation status. Select any control to open it.</p>
      ${controlMosaic()}
      <div class="legend" style="margin-top:12px">
        ${legend('verified', 'Verified')}${legend('implemented', 'Implemented')}${legend('progress', 'In progress')}${legend('notstarted', 'Not started')}${legend('excluded', 'Excluded')}${legend('undecided', 'Undecided')}
      </div>
    </div>`;
}

function renderSettings() {
  const s = getSettings();
  viewEl().innerHTML = `
    <h2>${esc(routeTitle('settings'))}</h2>
    <div class="panel">
      <h3>Organisation profile</h3>
      <label for="org-name">Organisation name</label>
      <input id="org-name" value="${esc(getOrg().name)}" style="max-width:440px" />
      <label for="org-scope">Certification scope</label>
      <input id="org-scope" value="${esc(getOrg().scope)}" style="max-width:560px" />
      <p><button id="save-org">Save</button></p>
      <p class="muted">Shown on the audit pack cover and used as the scope statement of the management system.</p>
    </div>
    <div class="panel">
      <h3>${esc(t('settings.language'))}</h3>
      <label for="set-lang">${esc(t('settings.languageNote'))}</label>
      <select id="set-lang" style="max-width:260px">${LANGUAGES.map((l) => `<option value="${l.code}" ${l.code === lang() ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}</select>
    </div>
    <div class="panel">
      <h3>Your name</h3>
      <label for="uname">Used as the author and owner on documents you create, and in the audit log.</label>
      <input id="uname" value="${esc(s.user)}" style="max-width:320px" />
      <p><button id="save-name">Save</button></p>
    </div>
    <div class="panel">
      <h3>Notifications and feeds</h3>
      <label for="notify">Recipient for emailed summaries and notifications</label>
      <input id="notify" type="email" value="${esc(s.notifyEmail || '')}" placeholder="isms@cloudax.example" style="max-width:320px" />
      <p class="muted">Emails are composed in your mail client through the Actions and notifications panel on the dashboard. Automated sending requires the server based deployment.</p>
      <label for="feed-ico">ICO feed URL</label>
      <input id="feed-ico" value="${esc((s.feeds && s.feeds[0] && s.feeds[0].url) || CONFIG.feeds[0].url)}" />
      <label for="feed-bsi">BSI feed URL</label>
      <input id="feed-bsi" value="${esc((s.feeds && s.feeds[1] && s.feeds[1].url) || CONFIG.feeds[1].url)}" />
      <p><button id="save-notify">Save</button></p>
      <p class="muted">Feeds are read in the browser; a source that does not allow cross origin reads falls back to a link to its news page.</p>
    </div>
    <div class="panel">
      <h3>Evidence pack</h3>
      <label for="scope">Annex A control reference (for example A.8.9)</label>
      <input id="scope" placeholder="A.8.9" style="max-width:200px" />
      <p><button class="secondary" id="evidence">Download manifest</button></p>
      <p class="muted">Lists the published documents linked to that control, with version and approval date.</p>
    </div>
    <div class="panel">
      <h3>Data</h3>
      <p class="muted">All data is stored in this browser only. Export a backup to keep it or move it to another machine.</p>
      <div class="toolbar">
        <button class="secondary" id="export">Export all data (JSON)</button>
        <label class="secondary" style="display:inline-flex;align-items:center;gap:6px;border:1px solid var(--brand);border-radius:8px;padding:8px 12px;cursor:pointer">Import backup<input id="import" type="file" accept="application/json" style="display:none" /></label>
        <button class="secondary" id="loadset">Load the Cloud.ax document set</button>
        <button class="secondary" id="reset">Reset to seeded data</button>
      </div>
      <p class="muted">The Cloud.ax document set is the controlled ISMS and AIMS library imported with this application. Loading it replaces the documents currently held in this browser.</p>
    </div>
    <div class="panel">
      <h3>About</h3>
      <p class="muted">Browser based ISMS for ISO/IEC 27001:2022. For a multi user, server enforced deployment with real
      authentication, an append only audit store and access control, use the backend in the parent folder.</p>
    </div>`;
  document.getElementById('save-org').addEventListener('click', () => {
    const org = { name: document.getElementById('org-name').value.trim() || ORG_DEFAULTS.name, scope: document.getElementById('org-scope').value.trim() || ORG_DEFAULTS.scope };
    setSettings({ ...getSettings(), org });
    audit('Updated', 'Settings', 'Organisation profile');
    toast('Organisation profile saved.');
  });
  const setLang = document.getElementById('set-lang');
  if (setLang) setLang.addEventListener('change', (e) => {
    setSettings({ ...getSettings(), lang: e.target.value });
    applyLang();
    audit('Updated', 'Settings', `Interface language ${e.target.value}`);
    navigate();
  });
  document.getElementById('save-name').addEventListener('click', () => {
    setSettings({ ...getSettings(), user: document.getElementById('uname').value.trim() || 'Local user' });
    toast('Your name has been saved.');
  });
  document.getElementById('save-notify').addEventListener('click', () => {
    const cur = getSettings();
    const feeds = (cur.feeds && cur.feeds.length ? cur.feeds : CONFIG.feeds).map((f) => ({ ...f }));
    feeds[0] = { ...feeds[0], url: document.getElementById('feed-ico').value.trim() || feeds[0].url };
    feeds[1] = { ...feeds[1], url: document.getElementById('feed-bsi').value.trim() || feeds[1].url };
    setSettings({ ...cur, notifyEmail: document.getElementById('notify').value.trim(), feeds });
    toast('Notification settings saved.');
  });
  document.getElementById('evidence').addEventListener('click', () => {
    const ref = document.getElementById('scope').value.trim();
    const docs = getCollection('documents').filter((d) => (d.controlRefs || []).includes(ref) && d.status === 'Published');
    const cols = [{ key: 'ref', label: 'Reference' }, { key: 'title', label: 'Title' }, { key: 'version', label: 'Version' }, { key: 'owner', label: 'Owner' }, { key: 'approved', label: 'Approved' }];
    const rows = docs.map((d) => ({ ref: d.ref, title: d.title, version: d.currentVersion || '', owner: d.owner, approved: fmtDate(d.lastApprovedAt) }));
    download(`evidence-${ref || 'all'}.csv`, toCsv(cols, rows), 'text/csv');
    audit('Exported', 'EvidencePack', `Manifest for ${ref || 'all'} (${docs.length} documents)`);
  });
  document.getElementById('export').addEventListener('click', () => download('cloud-ax-isms-backup.json', JSON.stringify(exportAll(), null, 2), 'application/json'));
  document.getElementById('loadset').addEventListener('click', () => {
    if (!confirm('Load the Cloud.ax controlled document set? This replaces the documents currently held in this browser.')) return;
    const n = loadDocumentSet();
    audit('Imported', 'Document', `Loaded the Cloud.ax document set (${n} documents)`);
    toast(`Loaded ${n} documents.`);
    navigate();
  });
  document.getElementById('import').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { try { importAll(JSON.parse(reader.result)); navigate(); toast('Backup imported.'); } catch { toast('That file could not be read.', 'danger'); } };
    reader.readAsText(file);
  });
  document.getElementById('reset').addEventListener('click', () => { if (confirm('Reset all data in this browser to the seeded starting point?')) { resetAll(); navigate(); } });
}

// ---- command palette -------------------------------------------------------

function paletteItems() {
  const items = [];
  const navs = [['dashboard', 'Dashboard'], ['readiness', 'Certification readiness'], ['calendar', 'Compliance calendar'], ['documents', 'Documents'], ['framework', 'Framework'], ['soa', 'Statement of Applicability'], ['aims', 'AI management (42001)'], ['architecture', 'Architecture and data flows'], ['registers', 'Registers'], ['audits', 'Internal audits'], ['certbody', 'Certification body'], ['search', 'Search'], ['settings', 'Settings']];
  for (const [k, l] of navs) items.push({ group: 'Go to', label: l, icon: ICONS[k] || '', run: () => go(k) });
  items.push({ group: 'Actions', label: 'Generate audit pack', icon: ICONS.readiness, run: () => go('report') });
  items.push({ group: 'Actions', label: `Switch to ${currentTheme() === 'dark' ? 'light' : 'dark'} mode`, icon: currentTheme() === 'dark' ? ICONS.sun : ICONS.moon, run: () => { toggleTheme(); navigate(); } });
  items.push({ group: 'Actions', label: 'Print this page', icon: ICONS.documents, run: () => window.print() });
  for (const d of getCollection('documents')) items.push({ group: 'Documents', label: `${d.ref} ${d.title}`, meta: d.system, icon: ICONS.documents, run: () => go('documents/' + d.id) });
  for (const a of getCollection('audits')) items.push({ group: 'Internal audits', label: `${a.ref} ${a.scope}`, meta: a.status, icon: ICONS.audits, run: () => go('audits/' + a.id) });
  for (const c of CONTROLS) items.push({ group: 'Controls', label: `${c.ref} ${c.title}`, meta: c.theme, icon: ICONS.framework, run: () => go('control/' + c.ref) });
  for (const c of AIMS_CONTROLS) items.push({ group: 'AI controls', label: `${c.ref} ${c.title}`, meta: 'ISO 42001', icon: ICONS.aims, run: () => go('aims') });
  for (const c of CLAUSES) items.push({ group: 'Clauses', label: `${c.number} ${c.title}`, icon: ICONS.soa, run: () => go('framework') });
  return items;
}

let paletteEl = null;
function openPalette() {
  if (paletteEl) return;
  const all = paletteItems();
  paletteEl = document.createElement('div');
  paletteEl.className = 'cmdk-overlay';
  paletteEl.innerHTML = '<div class="cmdk" role="dialog" aria-modal="true" aria-label="Command palette"><input class="cmdk-input" placeholder="Search documents, controls, clauses, or jump to a section" aria-label="Command palette" autocomplete="off" spellcheck="false" /><div class="cmdk-list" id="cmdk-list"></div></div>';
  document.body.appendChild(paletteEl);
  const input = paletteEl.querySelector('.cmdk-input');
  const list = paletteEl.querySelector('#cmdk-list');
  let filtered = [];
  let active = 0;
  const markActive = () => { list.querySelectorAll('.cmdk-item').forEach((el) => el.classList.toggle('active', Number(el.dataset.i) === active)); const a = list.querySelector('.cmdk-item.active'); if (a) a.scrollIntoView({ block: 'nearest' }); };
  const choose = (i) => { const it = filtered[i]; if (!it) return; closePalette(); it.run(); };
  const render = () => {
    const q = input.value.trim().toLowerCase();
    const terms = q ? q.split(/\s+/) : [];
    let pool = q ? all.filter((it) => { const t = (it.group + ' ' + it.label).toLowerCase(); return terms.every((w) => t.includes(w)); }) : all.filter((it) => it.group === 'Go to' || it.group === 'Actions');
    const caps = {};
    filtered = pool.filter((it) => { caps[it.group] = (caps[it.group] || 0) + 1; return caps[it.group] <= (q ? 8 : 20); });
    if (active >= filtered.length) active = Math.max(0, filtered.length - 1);
    if (!filtered.length) { list.innerHTML = '<div class="cmdk-empty">No matches.</div>'; return; }
    let html = ''; let lastGroup = null; let i = -1;
    for (const it of filtered) {
      if (it.group !== lastGroup) { html += `<div class="cmdk-group">${esc(it.group)}</div>`; lastGroup = it.group; }
      i++;
      html += `<div class="cmdk-item ${i === active ? 'active' : ''}" data-i="${i}"><span class="ic">${it.icon || ''}</span><span class="lab">${esc(it.label)}</span>${it.meta ? `<span class="meta">${esc(it.meta)}</span>` : ''}</div>`;
    }
    list.innerHTML = html;
    list.querySelectorAll('.cmdk-item').forEach((el) => {
      el.addEventListener('mousemove', () => { if (active !== Number(el.dataset.i)) { active = Number(el.dataset.i); markActive(); } });
      el.addEventListener('click', () => choose(Number(el.dataset.i)));
    });
  };
  input.addEventListener('input', () => { active = 0; render(); });
  paletteEl.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); closePalette(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(active + 1, filtered.length - 1); markActive(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(active - 1, 0); markActive(); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(active); }
  });
  paletteEl.addEventListener('mousedown', (e) => { if (e.target === paletteEl) closePalette(); });
  render();
  input.focus();
}
function closePalette() { if (paletteEl) { paletteEl.remove(); paletteEl = null; } }

// Keyboard shortcuts: a help overlay on "?" and a "g then key" navigation that mirrors
// the sidebar, so the whole application can be driven without the mouse.
const NAV_KEYS = [
  ['d', 'Dashboard', 'dashboard'], ['r', 'Readiness', 'readiness'], ['c', 'Calendar', 'calendar'],
  ['m', 'Documents', 'documents'], ['f', 'Framework', 'framework'], ['s', 'Statement of Applicability', 'soa'],
  ['a', 'AI management', 'aims'], ['g', 'Registers', 'registers'], ['i', 'Internal audits', 'audits'],
  ['b', 'Certification body', 'certbody'], ['l', 'Audit log', 'audit'], [',', 'Settings', 'settings'],
];
const NAV_KEY_MAP = Object.fromEntries(NAV_KEYS.map(([k, , route]) => [k, route]));

let shortcutsEl = null;
function openShortcuts() {
  if (shortcutsEl) return;
  closePalette();
  const kbd = (s) => s.split('+').map((x) => `<kbd>${esc(x)}</kbd>`).join('');
  const general = [
    [`${IS_MAC ? 'Cmd' : 'Ctrl'}+K`, 'Open the command palette'],
    ['/', 'Search and jump to'],
    ['?', 'Show this help'],
    ['Esc', 'Close a dialog'],
    [`${IS_MAC ? 'Cmd' : 'Ctrl'}+P`, 'Print or save as PDF'],
  ];
  const genRows = general.map(([k, label]) => `<div class="sc-row">${kbd(k)}<span class="sc-label">${esc(label)}</span></div>`).join('');
  const navRows = NAV_KEYS.map(([k, label]) => `<div class="sc-row">${kbd('g')}<span class="sc-then">then</span>${kbd(k)}<span class="sc-label">${esc(label)}</span></div>`).join('');
  shortcutsEl = document.createElement('div');
  shortcutsEl.className = 'cmdk-overlay';
  shortcutsEl.innerHTML = `<div class="cmdk sc" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
    <div class="sc-head"><h3 style="margin:0">Keyboard shortcuts</h3><button class="icon-btn" id="sc-close" aria-label="Close">&times;</button></div>
    <div class="sc-body"><div><div class="sc-group">General</div>${genRows}</div><div><div class="sc-group">Go to</div>${navRows}</div></div></div>`;
  document.body.appendChild(shortcutsEl);
  shortcutsEl.addEventListener('mousedown', (e) => { if (e.target === shortcutsEl) closeShortcuts(); });
  document.getElementById('sc-close').addEventListener('click', closeShortcuts);
}
function closeShortcuts() { if (shortcutsEl) { shortcutsEl.remove(); shortcutsEl = null; } }

let gArmed = 0;
window.addEventListener('keydown', (e) => {
  if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) { e.preventDefault(); if (paletteEl) closePalette(); else openPalette(); return; }
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const t = document.activeElement;
  if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
  if (paletteEl) return;
  if (e.key === 'Escape' && shortcutsEl) { e.preventDefault(); closeShortcuts(); return; }
  if (e.key === '/') { e.preventDefault(); closeShortcuts(); openPalette(); return; }
  if (e.key === '?') { e.preventDefault(); if (shortcutsEl) closeShortcuts(); else openShortcuts(); return; }
  if (gArmed && Date.now() - gArmed < 1200 && NAV_KEY_MAP[e.key]) { e.preventDefault(); gArmed = 0; closeShortcuts(); go(NAV_KEY_MAP[e.key]); return; }
  gArmed = e.key === 'g' ? Date.now() : 0;
});

// ---- routing ---------------------------------------------------------------

function navigate() {
  const [route, param] = parseHash();
  shell(route);
  const views = {
    dashboard: renderDashboard, readiness: renderReadiness, calendar: renderCalendar, documents: () => (param ? renderDocumentDetail(param) : renderDocuments()),
    framework: renderFramework, control: () => (param ? renderControlDetail(param) : renderFramework()), soa: renderSoa, aims: renderAims, architecture: renderArchitecture, registers: renderRegisters,
    audits: () => (param ? renderAuditDetail(param) : renderInternalAudits()),
    certbody: () => (param ? renderCertBodyDetail(param) : renderCertBodies()), audit: renderAudit,
    search: renderSearch, settings: renderSettings, report: renderReport,
    review: () => (param ? renderManagementReview(param) : renderRegisters()),
  };
  (views[route] || renderDashboard)();
  viewEl().focus();
}

window.addEventListener('hashchange', navigate);
if (!location.hash) location.hash = '#/dashboard';
navigate();
