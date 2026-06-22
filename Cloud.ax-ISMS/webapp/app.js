// Cloud.ax ISMS, browser based. A single page application with no server. Data is
// held in the browser through store.js. All access checks here are a convenience for
// a single user; the server enforced version is in the backend in the parent folder.

import { CONTROLS } from './data/controls.js';
import { CLAUSES } from './data/clauses.js';
import {
  CONFIG, getCollection, setCollection, getSettings, setSettings, audit, ensureSeed,
  resetAll, exportAll, importAll, cid, addMonths, nextReference,
} from './store.js';

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
  const links = nav.map(([key, label]) => `<a href="#/${key}" class="${active === key ? 'active' : ''}">${label}</a>`).join('');
  const roleOptions = CONFIG.roles.map((r) => `<option ${r === role() ? 'selected' : ''}>${r}</option>`).join('');
  app.innerHTML = `
    <aside class="sidebar">
      <h1>Cloud.ax ISMS</h1>
      <div class="org">Information Security Management System</div>
      <nav aria-label="Primary">${links}</nav>
      <div class="who">
        <label for="role">Acting as</label>
        <select id="role" aria-label="Acting as role">${roleOptions}</select>
        <p class="hint">Single user demonstration. Role checks here are a convenience, not server enforced.</p>
      </div>
    </aside>
    <main class="main" id="view" tabindex="-1"></main>`;
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
  const published = docs.filter((d) => d.status === 'Published' && d.nextReviewDate);
  const overdue = published.filter((d) => new Date(d.nextReviewDate).getTime() < now);
  const due = published.filter((d) => { const t = new Date(d.nextReviewDate).getTime(); return t >= now && t <= dueWindow; });
  const applicable = soa.filter((s) => s.applicable === true).length;
  const excluded = soa.filter((s) => s.applicable === false).length;
  const linkedRefs = new Set(docs.flatMap((d) => d.clauseRefs || []));
  const gaps = CLAUSES.filter((c) => c.mandatory.length > 0 && !linkedRefs.has(c.number));
  const log = getCollection('audit').slice(0, 12);

  viewEl().innerHTML = `
    <h2>Dashboard</h2>
    <div class="cards">
      <div class="card warn"><div class="num">${overdue.length}</div><div class="label">Reviews overdue</div></div>
      <div class="card"><div class="num">${due.length}</div><div class="label">Reviews due soon</div></div>
      <div class="card"><div class="num">${applicable}</div><div class="label">Applicable controls</div></div>
      <div class="card"><div class="num">${excluded}</div><div class="label">Excluded controls</div></div>
      <div class="card warn"><div class="num">${gaps.length}</div><div class="label">Coverage gaps</div></div>
      <div class="card"><div class="num">${docs.length}</div><div class="label">Documents</div></div>
    </div>
    <div class="panel"><h3>Documents overdue for review</h3>${overdue.length ? table(
      [{ key: 'ref', label: 'Reference' }, { key: 'title', label: 'Title' }, { key: 'nextReviewDate', label: 'Review by' }],
      overdue.map((d) => ({ ref: d.ref, title: d.title, nextReviewDate: fmtDate(d.nextReviewDate) })),
    ) : '<p class="muted">None.</p>'}</div>
    <div class="panel"><h3>Recent activity</h3>${table(
      [{ key: 'ts', label: 'When' }, { key: 'actor', label: 'Who' }, { key: 'action', label: 'Action' }, { key: 'detail', label: 'Detail' }],
      log.map((a) => ({ ts: a.ts.slice(0, 16).replace('T', ' '), actor: a.actor, action: `${a.action} ${a.entity}`, detail: a.detail })),
    )}</div>`;
}

function table(columns, rows) {
  if (!rows.length) return '<p class="muted">No entries.</p>';
  const head = columns.map((c) => `<th>${esc(c.label)}</th>`).join('');
  const body = rows.map((r) => `<tr>${columns.map((c) => `<td>${r.__html ? r[c.key] : esc(r[c.key])}</td>`).join('')}</tr>`).join('');
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function renderDocuments() {
  const docs = getCollection('documents');
  const rows = docs.map((d) => ({
    __html: true,
    ref: `<a href="#/documents/${d.id}">${esc(d.ref)}</a>`,
    title: esc(d.title), type: esc(d.type), classification: esc(d.classification),
    status: `<span class="badge">${esc(d.status)}</span>`, version: esc(d.currentVersion || '-'),
    review: fmtDate(d.nextReviewDate) || '-',
  }));
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
  viewEl().innerHTML = `<h2>Documents</h2>${createForm}<div class="panel">${table(
    [{ key: 'ref', label: 'Reference' }, { key: 'title', label: 'Title' }, { key: 'type', label: 'Type' }, { key: 'classification', label: 'Class' }, { key: 'status', label: 'Status' }, { key: 'version', label: 'Version' }, { key: 'review', label: 'Review by' }],
    rows,
  )}</div>`;
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
  viewEl().innerHTML = `
    <h2>${esc(doc.ref)} ${esc(doc.title)}</h2>
    <div class="panel">
      <p><span class="badge">${esc(doc.status)}</span> <span class="muted">${esc(doc.type)} | ${esc(doc.classification)} | reviewed every ${doc.reviewMonths} months</span></p>
      <p class="muted">Owner: ${esc(doc.owner)} | Author: ${esc(doc.author)} ${doc.nextReviewDate ? '| Next review: ' + fmtDate(doc.nextReviewDate) : ''}</p>
      <div class="toolbar">${actions || '<span class="muted">No actions available for your role at this status.</span>'}</div>
    </div>
    <div class="panel"><h3>Versions</h3>${table(
      [{ key: 'number', label: 'Version' }, { key: 'status', label: 'Status' }, { key: 'change', label: 'Change summary' }, { key: 'published', label: 'Published' }],
      doc.versions.map((v) => ({ number: v.number, status: v.status, change: v.changeSummary || '-', published: fmtDate(v.publishedAt) || '-' })),
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
      setCollection('documents', docs);
      renderDocumentDetail(id);
    } catch (err) {
      alert(err.message);
    }
  }));
}

function renderFramework() {
  const docs = getCollection('documents');
  const linkedClause = new Set(docs.flatMap((d) => d.clauseRefs || []));
  const linkedControl = (ref) => docs.filter((d) => (d.controlRefs || []).includes(ref)).map((d) => d.ref);
  const gaps = CLAUSES.filter((c) => c.mandatory.length > 0 && !linkedClause.has(c.number));
  const controlsRows = CONTROLS.map((c) => ({ ref: c.ref, title: c.title, theme: c.theme, types: c.types.join(', '), docs: linkedControl(c.ref).join(', ') || 'none' }));
  viewEl().innerHTML = `
    <h2>ISO/IEC 27001:2022 framework</h2>
    <div class="panel"><h3>Coverage gaps</h3><p class="muted">Clauses that require documented information but have no linked document.</p>${gaps.length ? table(
      [{ key: 'number', label: 'Clause' }, { key: 'title', label: 'Title' }, { key: 'mandatory', label: 'Mandatory documented information' }],
      gaps.map((g) => ({ number: g.number, title: g.title, mandatory: g.mandatory.join('; ') })),
    ) : '<p>No coverage gaps.</p>'}</div>
    <div class="panel"><h3>Annex A controls (93)</h3>${table(
      [{ key: 'ref', label: 'Reference' }, { key: 'title', label: 'Title' }, { key: 'theme', label: 'Theme' }, { key: 'types', label: 'Type' }, { key: 'docs', label: 'Documents' }],
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
  viewEl().innerHTML = `
    <h2>Statement of Applicability</h2>
    <div class="toolbar">
      <button class="secondary" id="soa-csv">Export spreadsheet (CSV)</button>
      <button class="secondary" id="soa-print">Print or save as PDF</button>
      <span class="badge">Applicable: ${applicable}</span>
      <span class="badge">Excluded: ${excluded}</span>
      <span class="badge">Undecided: ${soa.length - applicable - excluded}</span>
      ${editable ? '<button id="soa-save">Save changes</button>' : ''}
    </div>
    <div class="panel"><table><thead><tr><th>Control</th><th>Applicable</th><th>Justification</th><th>Status</th><th>Owner</th></tr></thead><tbody>${rows}</tbody></table></div>`;

  document.getElementById('soa-csv').addEventListener('click', () => {
    const cols = [{ key: 'ref', label: 'Control' }, { key: 'title', label: 'Title' }, { key: 'theme', label: 'Theme' }, { key: 'applicable', label: 'Applicable' }, { key: 'justification', label: 'Justification' }, { key: 'status', label: 'Implementation status' }, { key: 'owner', label: 'Owner' }];
    const data = soa.map((s) => ({ ref: s.ref, title: byRef[s.ref] ? byRef[s.ref].title : '', theme: byRef[s.ref] ? byRef[s.ref].theme : '', applicable: s.applicable === null ? 'Undecided' : s.applicable ? 'Yes' : 'No', justification: s.justification, status: s.status, owner: s.owner }));
    download('statement-of-applicability.csv', toCsv(cols, data), 'text/csv');
    audit('Exported', 'SoaEntry', 'Statement of Applicability to CSV');
  });
  document.getElementById('soa-print').addEventListener('click', () => window.print());
  const save = document.getElementById('soa-save');
  if (save) save.addEventListener('click', () => {
    viewEl().querySelectorAll('[data-ref]').forEach((input) => {
      const entry = soa.find((s) => s.ref === input.dataset.ref);
      if (!entry) return;
      const field = input.dataset.field;
      if (field === 'applicable') entry.applicable = input.value === '' ? null : input.value === 'yes';
      else entry[field] = input.value;
    });
    for (const s of soa) if (s.applicable !== null && !s.justification.trim()) { alert(`A justification is required for ${s.ref} once applicability is decided.`); return; }
    setCollection('soa', soa);
    audit('Updated', 'SoaEntry', 'Statement of Applicability');
    renderSoa();
  });
}

let activeRegister = CONFIG.registers[0].key;
function renderRegisters() {
  const def = CONFIG.registers.find((r) => r.key === activeRegister);
  const rows = getCollection('register.' + def.key);
  const editable = can('ISMS Manager');
  const selector = `<select id="reg-select" aria-label="Select register" style="width:300px">${CONFIG.registers.map((r) => `<option value="${r.key}" ${r.key === def.key ? 'selected' : ''}>${r.label}</option>`).join('')}</select>`;
  const addForm = editable ? `
    <details class="panel"><summary>Add entry</summary><form id="reg-form"><div class="cards">${def.fields.map((f) => `
      <div><label for="f-${f.name}">${f.label}</label>${f.type === 'select'
        ? `<select id="f-${f.name}"><option value=""></option>${f.options.map((o) => `<option>${o}</option>`).join('')}</select>`
        : `<input id="f-${f.name}" type="${f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}" />`}</div>`).join('')}</div>
      <button type="submit">Save entry</button></form></details>` : '';
  const cols = def.fields.map((f) => ({ key: f.name, label: f.label }));
  if (editable) cols.push({ key: '__del', label: '' });
  const tableRows = rows.map((r) => {
    const o = { __html: true };
    for (const f of def.fields) o[f.name] = esc(r[f.name] ?? '');
    if (editable) o.__del = `<button class="secondary" data-del="${r.id}">Delete</button>`;
    return o;
  });
  viewEl().innerHTML = `<h2>Registers</h2><div class="toolbar">${selector}<button class="secondary" id="reg-csv">Export</button></div>${addForm}<div class="panel">${table(cols, tableRows)}</div>`;

  document.getElementById('reg-select').addEventListener('change', (e) => { activeRegister = e.target.value; renderRegisters(); });
  document.getElementById('reg-csv').addEventListener('click', () => {
    download(def.key + '-register.csv', toCsv(def.fields.map((f) => ({ key: f.name, label: f.label })), rows), 'text/csv');
    audit('Exported', def.label, 'to CSV');
  });
  const form = document.getElementById('reg-form');
  if (form) form.addEventListener('submit', (e) => {
    e.preventDefault();
    const entry = { id: cid() };
    for (const f of def.fields) entry[f.name] = document.getElementById('f-' + f.name).value;
    rows.unshift(entry);
    setCollection('register.' + def.key, rows);
    audit('Created', def.label, 'New entry');
    renderRegisters();
  });
  viewEl().querySelectorAll('[data-del]').forEach((btn) => btn.addEventListener('click', () => {
    setCollection('register.' + def.key, rows.filter((r) => r.id !== btn.dataset.del));
    audit('Deleted', def.label, 'Entry removed');
    renderRegisters();
  }));
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
        <button class="secondary" id="reset">Reset to seeded data</button>
      </div>
    </div>
    <div class="panel">
      <h3>About</h3>
      <p class="muted">Browser based ISMS for ISO/IEC 27001:2022. For a multi user, server enforced deployment with real
      authentication, an append only audit store and access control, use the backend in the parent folder.</p>
    </div>`;
  document.getElementById('save-name').addEventListener('click', () => {
    setSettings({ ...getSettings(), user: document.getElementById('uname').value.trim() || 'Local user' });
    alert('Saved.');
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
  document.getElementById('import').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { try { importAll(JSON.parse(reader.result)); alert('Imported.'); navigate(); } catch { alert('That file could not be read.'); } };
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
