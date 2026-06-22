// Cloud.ax ISMS, browser based. A single page application with no server. Data is
// held in the browser through store.js. All access checks here are a convenience for
// a single user; the server enforced version is in the backend in the parent folder.

import { CONTROLS } from './data/controls.js?v=7';
import { CLAUSES } from './data/clauses.js?v=7';
import {
  CONFIG, getCollection, setCollection, getSettings, setSettings, audit, ensureSeed,
  resetAll, exportAll, importAll, loadDocumentSet, populateSoaFromDocuments, loadRegisterSet, cid, addMonths, nextReference,
} from './store.js?v=7';

ensureSeed();

const app = document.getElementById('app');

// ---- helpers ---------------------------------------------------------------

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function role() { return getSettings().role; }
function can(...roles) { return role() === 'Administrator' || roles.includes(role()); }
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
  soa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
  registers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>',
  audit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
};

const ROUTE_TITLES = {
  dashboard: 'Dashboard', documents: 'Documents', framework: 'Framework',
  soa: 'Statement of Applicability', registers: 'Registers', audit: 'Audit log',
  search: 'Search', settings: 'Settings',
};

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
function metricBar(name, value, total) {
  return `<div class="metric-row"><span class="name">${esc(name)}</span><span class="track"><span style="width:${pct(value, total)}%"></span></span><span class="val">${value}</span></div>`;
}
function mini(n, label, kind) { return `<div class="mini ${kind || ''}"><div class="n">${esc(String(n))}</div><div class="l">${esc(label)}</div></div>`; }

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

// ---- register intelligence -------------------------------------------------

function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function riskScore(e) { return num(e.likelihood) * num(e.impact); }
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
    columns: [{ key: 'riskId', label: 'Risk ID' }, { key: 'description', label: 'Description' }, { key: 'l', label: 'L' }, { key: 'i', label: 'I' }, { key: 'score', label: 'Score' }, { key: 'level', label: 'Level' }, { key: 'treatment', label: 'Treatment' }, { key: 'owner', label: 'Owner' }, { key: 'status', label: 'Status' }, { key: 'review', label: 'Review' }],
    sort: (a, b) => riskScore(b) - riskScore(a),
    row: (e) => { const s = riskScore(e); const lv = riskLevel(s); return { riskId: esc(e.riskId), description: esc(e.description), l: esc(num(e.likelihood) || '-'), i: esc(num(e.impact) || '-'), score: `<b>${s || '-'}</b>`, level: pill(lv.label, lv.kind), treatment: `<span class="chip">${esc(e.treatment || '-')}</span>`, owner: esc(e.owner), status: pill(e.status || '-', riskStatusKind(e.status)), review: reviewCell(e.reviewDate) }; },
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
  audit: {
    columns: [{ key: 'auditId', label: 'Audit ID' }, { key: 'scope', label: 'Scope' }, { key: 'date', label: 'Date' }, { key: 'auditor', label: 'Auditor' }, { key: 'status', label: 'Status' }],
    row: (e) => ({ auditId: esc(e.auditId), scope: esc(e.scope), date: esc(fmtDate(e.date)), auditor: esc(e.auditor), status: pill(e.status || '-', auditStatusKind(e.status)) }),
  },
  'management-review': {
    columns: [{ key: 'reviewId', label: 'Review ID' }, { key: 'date', label: 'Date' }, { key: 'attendees', label: 'Attendees' }, { key: 'decisions', label: 'Decisions' }],
    row: (e) => ({ reviewId: esc(e.reviewId), date: esc(fmtDate(e.date)), attendees: esc(e.attendees), decisions: esc(e.decisions) }),
  },
  competence: {
    columns: [{ key: 'person', label: 'Person' }, { key: 'role', label: 'Role' }, { key: 'training', label: 'Training' }, { key: 'date', label: 'Completed' }],
    row: (e) => ({ person: esc(e.person), role: esc(e.role), training: esc(e.training), date: esc(fmtDate(e.date)) }),
  },
  legal: {
    columns: [{ key: 'requirement', label: 'Requirement' }, { key: 'source', label: 'Source' }, { key: 'owner', label: 'Owner' }, { key: 'review', label: 'Review' }],
    row: (e) => ({ requirement: esc(e.requirement), source: esc(e.source), owner: esc(e.owner), review: reviewCell(e.reviewDate) }),
  },
  context: {
    columns: [{ key: 'category', label: 'Category' }, { key: 'item', label: 'Issue or party' }, { key: 'requirements', label: 'Requirements' }, { key: 'climate', label: 'Climate' }],
    row: (e) => ({ category: esc(e.category), item: esc(e.item), requirements: esc(e.requirements), climate: /^y/i.test(e.climate || '') ? pill('Yes', 'info') : pill('No', 'neutral') }),
  },
};

function regSummary(key, rows) {
  if (key === 'risk') {
    const lv = (e) => riskLevel(riskScore(e)).label;
    const seg = [['Critical', 'danger'], ['High', 'danger'], ['Medium', 'warn'], ['Low', 'ok']].map(([l, k]) => ({ label: l, value: rows.filter((e) => lv(e) === l).length, kind: k }));
    return `<div class="matrix-wrap"><div><div class="matrix-axis" style="margin-bottom:6px">Likelihood across, impact up</div>${riskMatrix(rows)}</div><div style="min-width:260px;flex:1">${stackedBar(seg)}</div></div>`;
  }
  if (key === 'supplier') {
    const dpa = rows.filter((r) => /^y/i.test(r.dpa || '')).length;
    const due = rows.filter((r) => overdue(r.reviewDate) || dueSoon(r.reviewDate)).length;
    const offshore = rows.filter((r) => !isUkEu(r.dataLocation)).length;
    return `<div class="mini-cards">${mini(rows.length, 'Suppliers')}${mini(dpa, 'DPA in place', dpa === rows.length ? 'ok' : 'warn')}${mini(rows.length - dpa, 'DPA missing', rows.length - dpa ? 'danger' : 'ok')}${mini(offshore, 'Outside UK or EU', offshore ? 'danger' : 'ok')}${mini(due, 'Reviews due or overdue', due ? 'warn' : 'ok')}</div>`;
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
  const nav = [
    ['dashboard', 'Dashboard'], ['documents', 'Documents'], ['framework', 'Framework'],
    ['soa', 'Statement of Applicability'], ['registers', 'Registers'],
  ];
  if (can('ISMS Manager')) nav.push(['audit', 'Audit log']);
  nav.push(['search', 'Search'], ['settings', 'Settings']);
  const links = nav.map(([key, label]) => `<a href="#/${key}" class="${active === key ? 'active' : ''}"><span class="nav-ic">${ICONS[key] || ''}</span>${label}</a>`).join('');
  const roleOptions = CONFIG.roles.map((r) => `<option ${r === role() ? 'selected' : ''}>${r}</option>`).join('');
  app.innerHTML = `
    <aside class="sidebar">
      <h1><img class="logo" src="assets/cloudax-logo-white.png" alt="Cloudax" /></h1>
      <div class="org">Information Security Management System</div>
      <nav aria-label="Primary">${links}</nav>
      <div class="foot">ISO/IEC 27001:2022 and ISO/IEC 42001:2023. Data is held in this browser only; role checks here are a convenience, not server enforced.</div>
    </aside>
    <div class="content">
      <header class="topbar">
        <div class="crumb">Cloudax ISMS <span aria-hidden="true">/</span> <b>${esc(ROUTE_TITLES[active] || 'Dashboard')}</b></div>
        <div class="topbar-actions">
          <label for="role">Acting as</label>
          <select id="role" aria-label="Acting as role">${roleOptions}</select>
        </div>
      </header>
      <main class="main" id="view" tabindex="-1"></main>
    </div>`;
  document.getElementById('role').addEventListener('change', (e) => {
    setSettings({ ...getSettings(), role: e.target.value });
    audit('RoleChanged', 'Settings', `Acting as ${e.target.value}`);
    navigate();
  });
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
  const nextAudit = getCollection('register.audit').filter((r) => /plan|schedul/i.test(r.status)).map((r) => r.date).filter(Boolean).sort()[0];
  const lastMr = getCollection('register.management-review').map((r) => r.date).filter(Boolean).sort().filter((d) => new Date(d) <= new Date()).pop();

  const kpi = (cls, ic, num, label, sub) => `
    <div class="kpi ${cls}"><div class="kpi-top"><span class="label">${esc(label)}</span><span class="kpi-ic">${ic}</span></div>
      <div class="num">${num}</div>${sub ? `<div class="sub">${esc(sub)}</div>` : ''}</div>`;

  viewEl().innerHTML = `
    <h2>Dashboard</h2>
    <div class="cards">
      ${kpi('', ICONS.documents, docs.length, 'Controlled documents', `${published.length} published`)}
      ${kpi('ok', ICONS.soa, `${pct(applicable, soa.length)}%`, 'Controls applicable', `${applicable} of ${soa.length} Annex A`)}
      ${kpi('', ICONS.framework, `${pct(documented, soa.length)}%`, 'Controls documented', `${documented} have a linked document`)}
      ${kpi(overdueDocs.length ? 'danger' : 'ok', ICONS.audit, overdueDocs.length, 'Reviews overdue', `${dueDocs.length} due within ${CONFIG.reviewDueWithinDays} days`)}
      ${kpi(gaps.length ? 'warn' : 'ok', ICONS.framework, gaps.length, 'Clause coverage gaps', `${mandatory.length - gaps.length} of ${mandatory.length} clauses covered`)}
    </div>

    <div class="grid-2">
      <div class="panel">
        <div class="panel-head"><h3>Annex A control applicability</h3><span class="muted">${soa.length} controls</span></div>
        ${stackedBar([
          { label: 'Applicable', value: applicable, kind: 'ok' },
          { label: 'Excluded', value: excluded, kind: 'neutral' },
          { label: 'Undecided', value: undecided, kind: 'warn' },
        ])}
      </div>
      <div class="panel">
        <div class="panel-head"><h3>Implementation of applicable controls</h3><span class="muted">${applicable} applicable</span></div>
        ${applicable ? stackedBar(implCounts) : '<p class="muted">No controls are marked applicable yet.</p>'}
      </div>
    </div>

    <div class="grid-2" style="margin-top:18px">
      <div class="panel">
        <div class="panel-head"><h3>Documents by system</h3><a href="#/documents">Open</a></div>
        ${Object.entries(bySystem).map(([k, v]) => metricBar(k, v, docs.length)).join('') || '<p class="muted">No documents.</p>'}
        <div class="legend" style="margin-top:14px">${statusCounts.map((x) => `<span class="leg">${pill(x.st, statusKind(x.st))} <b>${x.n}</b></span>`).join('')}</div>
      </div>
      <div class="panel">
        <div class="panel-head"><h3>Upcoming reviews</h3>${overdueDocs.length ? `<span class="pill danger">${overdueDocs.length} overdue</span>` : '<span class="muted">on track</span>'}</div>
        ${upcoming.length ? table(
          [{ key: 'ref', label: 'Reference' }, { key: 'title', label: 'Title' }, { key: 'due', label: 'Review by' }],
          upcoming.map((d) => ({ __html: true, ref: `<a href="#/documents/${d.id}">${esc(d.ref)}</a>`, title: esc(d.title), due: `${fmtDate(d.nextReviewDate)} ${new Date(d.nextReviewDate).getTime() < now ? pill('overdue', 'danger') : ''}` })),
        ) : '<p class="muted">No published documents carry a review date.</p>'}
      </div>
    </div>

    <div class="grid-2" style="margin-top:18px">
      <div class="panel">
        <div class="panel-head"><h3>Risk profile</h3><a href="#/registers">Open registers</a></div>
        ${risks.length ? stackedBar(riskSeg) : '<p class="muted">No risks recorded.</p>'}
      </div>
      <div class="panel">
        <div class="panel-head"><h3>Governance and obligations</h3></div>
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
      <div class="panel-head"><h3>Recent activity</h3><a href="#/audit">View all</a></div>
      ${table(
        [{ key: 'ts', label: 'When' }, { key: 'actor', label: 'Who' }, { key: 'action', label: 'Action' }, { key: 'detail', label: 'Detail' }],
        log.map((a) => ({ ts: a.ts.slice(0, 16).replace('T', ' '), actor: a.actor, action: `${a.action} ${a.entity}`, detail: a.detail })),
      )}
    </div>`;
  animateCounts(viewEl());
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
  viewEl().innerHTML = `<h2>Documents</h2>${createForm}${filterBar}<div class="panel" id="docs-table"></div>`;
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
          return { __html: true, ref: esc(ref), title: esc(ctrlByRef[ref] ? ctrlByRef[ref].title : ''),
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

function renderFramework() {
  const docs = getCollection('documents');
  const soaByRef = Object.fromEntries(getCollection('soa').map((s) => [s.ref, s]));
  const docById = Object.fromEntries(docs.map((d) => [d.ref, d.id]));
  const linkedClause = new Set(docs.flatMap((d) => d.clauseRefs || []));
  const linkedControl = (ref) => docs.filter((d) => (d.controlRefs || []).includes(ref)).map((d) => d.ref);
  const gaps = CLAUSES.filter((c) => c.mandatory.length > 0 && !linkedClause.has(c.number));
  const chip = (ref) => (docById[ref] ? `<a class="chip" href="#/documents/${docById[ref]}">${esc(ref)}</a>` : `<span class="chip">${esc(ref)}</span>`);
  const controlsRows = CONTROLS.map((c) => {
    const s = soaByRef[c.ref];
    const linked = linkedControl(c.ref);
    return { __html: true, ref: esc(c.ref), title: esc(c.title), theme: esc(c.theme),
      app: s ? applicablePill(s.applicable) : '<span class="muted">-</span>',
      impl: s && s.applicable === true ? pill(s.status, statusKind(s.status)) : '<span class="muted">-</span>',
      docs: linked.length ? linked.map(chip).join('') : '<span class="muted">none</span>' };
  });
  const covered = CONTROLS.filter((c) => linkedControl(c.ref).length > 0).length;
  const applicable = getCollection('soa').filter((s) => s.applicable === true).length;
  viewEl().innerHTML = `
    <h2>ISO/IEC 27001:2022 framework</h2>
    <div class="panel"><div class="panel-head"><h3>Coverage gaps</h3>${gaps.length ? `<span class="pill warn">${gaps.length} open</span>` : '<span class="pill ok">none</span>'}</div><p class="muted">Clauses that require documented information but have no linked document.</p>${gaps.length ? table(
      [{ key: 'number', label: 'Clause' }, { key: 'title', label: 'Title' }, { key: 'mandatory', label: 'Mandatory documented information' }],
      gaps.map((g) => ({ number: g.number, title: g.title, mandatory: g.mandatory.join('; ') })),
    ) : '<p>No coverage gaps.</p>'}</div>
    <div class="panel"><div class="panel-head"><h3>Annex A controls (93)</h3><span class="muted">${applicable} applicable | ${covered} of ${CONTROLS.length} with a linked document</span></div>${table(
      [{ key: 'ref', label: 'Reference' }, { key: 'title', label: 'Title' }, { key: 'theme', label: 'Theme' }, { key: 'app', label: 'Applicable' }, { key: 'impl', label: 'Implementation' }, { key: 'docs', label: 'Documents' }],
      controlsRows,
    )}</div>
    <div class="panel"><h3>Management clauses</h3>${table(
      [{ key: 'number', label: 'Clause' }, { key: 'title', label: 'Title' }, { key: 'mandatory', label: 'Mandatory documented information' }],
      CLAUSES.map((c) => ({ number: c.number + (c.climate ? ' (climate)' : ''), title: c.title, mandatory: c.mandatory.join('; ') || '-' })),
    )}</div>`;
}

function renderSoa() {
  const soa = getCollection('soa');
  const byRef = Object.fromEntries(CONTROLS.map((c) => [c.ref, c]));
  const editable = can('ISMS Manager');
  const rows = soa.map((s) => {
    const applicable = s.applicable === null ? '' : s.applicable ? 'yes' : 'no';
    const sel = (name, value, options) => `<select data-ref="${s.ref}" data-field="${name}" ${editable ? '' : 'disabled'}>${options.map((o) => `<option value="${o.v}" ${o.v === value ? 'selected' : ''}>${o.t}</option>`).join('')}</select>`;
    return `<tr>
      <td title="${esc(byRef[s.ref] ? byRef[s.ref].title : '')}">${esc(s.ref)}</td>
      <td>${sel('applicable', applicable, [{ v: '', t: 'Undecided' }, { v: 'yes', t: 'Yes' }, { v: 'no', t: 'No' }])}</td>
      <td><input data-ref="${s.ref}" data-field="justification" value="${esc(s.justification)}" ${editable ? '' : 'disabled'} /></td>
      <td>${sel('status', s.status, CONFIG.implementationStatuses.map((x) => ({ v: x, t: x })))}</td>
      <td><input data-ref="${s.ref}" data-field="owner" value="${esc(s.owner)}" style="width:120px" ${editable ? '' : 'disabled'} /></td>
    </tr>`;
  }).join('');
  const applicable = soa.filter((s) => s.applicable === true).length;
  const excluded = soa.filter((s) => s.applicable === false).length;
  const undecided = soa.length - applicable - excluded;
  viewEl().innerHTML = `
    <h2>Statement of Applicability</h2>
    <div class="panel">
      <div class="panel-head"><h3>Applicability across Annex A</h3><span class="muted">${soa.length} controls</span></div>
      ${stackedBar([
        { label: 'Applicable', value: applicable, kind: 'ok' },
        { label: 'Excluded', value: excluded, kind: 'neutral' },
        { label: 'Undecided', value: undecided, kind: 'warn' },
      ])}
    </div>
    <div class="toolbar">
      <button class="secondary" id="soa-csv">Export spreadsheet (CSV)</button>
      <button class="secondary" id="soa-print">Print or save as PDF</button>
      ${editable ? '<button class="secondary" id="soa-populate">Populate from the document set</button>' : ''}
      <span class="spacer"></span>
      ${editable ? '<button id="soa-save">Save changes</button>' : ''}
    </div>
    <div class="panel table-wrap"><table><thead><tr><th>Control</th><th>Applicable</th><th>Justification</th><th>Status</th><th>Owner</th></tr></thead><tbody>${rows}</tbody></table></div>`;

  document.getElementById('soa-csv').addEventListener('click', () => {
    const cols = [{ key: 'ref', label: 'Control' }, { key: 'title', label: 'Title' }, { key: 'theme', label: 'Theme' }, { key: 'applicable', label: 'Applicable' }, { key: 'justification', label: 'Justification' }, { key: 'status', label: 'Implementation status' }, { key: 'owner', label: 'Owner' }];
    const data = soa.map((s) => ({ ref: s.ref, title: byRef[s.ref] ? byRef[s.ref].title : '', theme: byRef[s.ref] ? byRef[s.ref].theme : '', applicable: s.applicable === null ? 'Undecided' : s.applicable ? 'Yes' : 'No', justification: s.justification, status: s.status, owner: s.owner }));
    download('statement-of-applicability.csv', toCsv(cols, data), 'text/csv');
    audit('Exported', 'SoaEntry', 'Statement of Applicability to CSV');
  });
  document.getElementById('soa-print').addEventListener('click', () => window.print());
  const populate = document.getElementById('soa-populate');
  if (populate) populate.addEventListener('click', () => {
    const n = populateSoaFromDocuments();
    audit('Updated', 'SoaEntry', `Populated ${n} controls from the document set`);
    toast(`Updated ${n} controls from the document set.`);
    renderSoa();
  });
  const save = document.getElementById('soa-save');
  if (save) save.addEventListener('click', () => {
    viewEl().querySelectorAll('[data-ref]').forEach((input) => {
      const entry = soa.find((s) => s.ref === input.dataset.ref);
      if (!entry) return;
      const field = input.dataset.field;
      if (field === 'applicable') entry.applicable = input.value === '' ? null : input.value === 'yes';
      else entry[field] = input.value;
    });
    for (const s of soa) if (s.applicable !== null && !s.justification.trim()) { toast(`A justification is required for ${s.ref} once applicability is decided.`, 'danger'); return; }
    setCollection('soa', soa);
    audit('Updated', 'SoaEntry', 'Statement of Applicability');
    renderSoa();
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

  viewEl().innerHTML = `<h2>Registers</h2>
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
  viewEl().innerHTML = `<h2>Search</h2><div class="toolbar"><input id="q" placeholder="Search documents, clauses and controls" style="width:320px" /></div><div id="results"></div>`;
  const input = document.getElementById('q');
  const run = () => {
    const q = input.value.trim().toLowerCase();
    const results = document.getElementById('results');
    if (!q) { results.innerHTML = ''; return; }
    const docs = getCollection('documents').filter((d) => (d.title + ' ' + d.ref).toLowerCase().includes(q));
    const controls = CONTROLS.filter((c) => (c.title + ' ' + c.ref).toLowerCase().includes(q));
    const clauses = CLAUSES.filter((c) => (c.title + ' ' + c.number).toLowerCase().includes(q));
    results.innerHTML = `
      <div class="panel"><h3>Documents</h3>${docs.length ? docs.map((d) => `<p><a href="#/documents/${d.id}">${esc(d.ref)}</a> ${esc(d.title)}</p>`).join('') : '<p class="muted">None.</p>'}</div>
      <div class="panel"><h3>Controls</h3>${controls.map((c) => `<p>${esc(c.ref)} ${esc(c.title)}</p>`).join('') || '<p class="muted">None.</p>'}</div>
      <div class="panel"><h3>Clauses</h3>${clauses.map((c) => `<p>${esc(c.number)} ${esc(c.title)}</p>`).join('') || '<p class="muted">None.</p>'}</div>`;
  };
  input.addEventListener('input', run);
}

function renderSettings() {
  const s = getSettings();
  viewEl().innerHTML = `
    <h2>Settings</h2>
    <div class="panel">
      <h3>Your name</h3>
      <label for="uname">Used as the author and owner on documents you create, and in the audit log.</label>
      <input id="uname" value="${esc(s.user)}" style="max-width:320px" />
      <p><button id="save-name">Save</button></p>
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
  document.getElementById('save-name').addEventListener('click', () => {
    setSettings({ ...getSettings(), user: document.getElementById('uname').value.trim() || 'Local user' });
    toast('Your name has been saved.');
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

// ---- routing ---------------------------------------------------------------

function navigate() {
  const [route, param] = parseHash();
  shell(route);
  const views = {
    dashboard: renderDashboard, documents: () => (param ? renderDocumentDetail(param) : renderDocuments()),
    framework: renderFramework, soa: renderSoa, registers: renderRegisters, audit: renderAudit,
    search: renderSearch, settings: renderSettings,
  };
  (views[route] || renderDashboard)();
  viewEl().focus();
}

window.addEventListener('hashchange', navigate);
if (!location.hash) location.hash = '#/dashboard';
navigate();
