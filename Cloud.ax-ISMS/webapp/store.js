// Local persistence for the browser based ISMS. All data is held in the browser
// (localStorage). There is no server. Use Settings to export a backup, import it on
// another machine, or reset the data. This suits evaluation and single user use; the
// multi user, server enforced version lives in the backend in the parent folder.

import { CONTROLS } from './data/controls.js?v=21';
import { AIMS_CONTROLS, AIMS_SOA_SEED } from './data/aims-controls.js?v=21';
import { DOCUMENTS } from './documents-data.js?v=21';
import { REGISTER_SEED } from './data/registers.js?v=21';
import { AUDIT_SEED } from './data/audits.js?v=21';
import { CERT_BODY_SEED } from './data/cert-bodies.js?v=21';

const NS = 'cloudax.isms.';
const SEED_VERSION = 10;

export const CONFIG = {
  prefixes: { Policy: 'POL', Procedure: 'PROC', Standard: 'STD', Guideline: 'GUI', Plan: 'PLAN', Register: 'REG', Record: 'REC', Form: 'FORM' },
  classifications: ['Public', 'Internal', 'Confidential', 'Restricted'],
  reviewMonths: [6, 12, 24],
  defaultReviewMonths: 12,
  reviewDueWithinDays: 30,
  roles: ['Administrator', 'ISMS Manager', 'Document Owner', 'Reviewer', 'Approver', 'Reader'],
  statuses: ['Draft', 'In Review', 'Approved', 'Published', 'Under Revision', 'Retired'],
  implementationStatuses: ['Not started', 'In progress', 'Implemented', 'Verified'],
  feeds: [
    { name: 'ICO', label: 'Information Commissioner', url: 'https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/rss/', link: 'https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/' },
    { name: 'BSI', label: 'BSI standards and insights', url: 'https://www.bsigroup.com/en-GB/rss/', link: 'https://www.bsigroup.com/en-GB/insights-and-media/insights/' },
  ],
  registers: [
    { key: 'risk', label: 'Risk register', fields: [
      { name: 'riskId', label: 'Risk ID' }, { name: 'description', label: 'Description' },
      { name: 'likelihood', label: 'Likelihood', type: 'number' }, { name: 'impact', label: 'Impact', type: 'number' },
      { name: 'treatment', label: 'Treatment', type: 'select', options: ['Modify', 'Retain', 'Avoid', 'Share'] },
      { name: 'relatedControls', label: 'Related controls' },
      { name: 'residualLikelihood', label: 'Residual likelihood', type: 'number' }, { name: 'residualImpact', label: 'Residual impact', type: 'number' },
      { name: 'owner', label: 'Owner' }, { name: 'status', label: 'Status' }, { name: 'reviewDate', label: 'Review date', type: 'date' },
    ] },
    { key: 'asset', label: 'Asset register', fields: [
      { name: 'assetId', label: 'Asset ID' }, { name: 'name', label: 'Name' }, { name: 'type', label: 'Type' },
      { name: 'owner', label: 'Owner' }, { name: 'classification', label: 'Classification' }, { name: 'status', label: 'Status' },
    ] },
    { key: 'supplier', label: 'Supplier and sub-processor register', fields: [
      { name: 'supplierId', label: 'Supplier ID' }, { name: 'name', label: 'Name' }, { name: 'service', label: 'Service' },
      { name: 'dataLocation', label: 'Data location' }, { name: 'dpa', label: 'DPA in place', type: 'select', options: ['Yes', 'No'] }, { name: 'reviewDate', label: 'Review date', type: 'date' },
    ] },
    { key: 'nonconformity', label: 'Nonconformity and corrective action', fields: [
      { name: 'ncId', label: 'NC ID' }, { name: 'source', label: 'Source' }, { name: 'description', label: 'Description' },
      { name: 'reference', label: 'Clause or control' }, { name: 'owner', label: 'Owner' }, { name: 'dueDate', label: 'Due date', type: 'date' }, { name: 'status', label: 'Status' },
    ] },
    { key: 'management-review', label: 'Management review log', fields: [
      { name: 'reviewId', label: 'Review ID' }, { name: 'date', label: 'Date', type: 'date' }, { name: 'attendees', label: 'Attendees' }, { name: 'decisions', label: 'Decisions' },
    ] },
    { key: 'competence', label: 'Competence and training', fields: [
      { name: 'person', label: 'Person' }, { name: 'role', label: 'Role' }, { name: 'training', label: 'Training' }, { name: 'date', label: 'Completed', type: 'date' },
    ] },
    { key: 'legal', label: 'Legal and regulatory register', fields: [
      { name: 'requirement', label: 'Requirement' }, { name: 'source', label: 'Source' }, { name: 'owner', label: 'Owner' }, { name: 'reviewDate', label: 'Review date', type: 'date' },
    ] },
    { key: 'context', label: 'Context and interested parties', fields: [
      { name: 'category', label: 'Category' }, { name: 'item', label: 'Issue or party' }, { name: 'requirements', label: 'Requirements' },
      { name: 'climate', label: 'Climate related', type: 'select', options: ['Yes', 'No'] },
    ] },
  ],
};

function read(key, fallback) {
  try {
    const v = localStorage.getItem(NS + key);
    return v === null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
}
function write(key, value) {
  localStorage.setItem(NS + key, JSON.stringify(value));
}

export function cid() {
  return 'x' + Math.random().toString(36).slice(2, 10);
}

export function getCollection(name, fallback = []) {
  return read(name, fallback);
}
export function setCollection(name, value) {
  write(name, value);
}

export function getSettings() {
  return read('settings', { role: 'Administrator', user: 'Local user', seedVersion: 0, notifyEmail: '' });
}
export function setSettings(value) {
  write('settings', value);
}

export function audit(action, entity, detail = '') {
  const s = getSettings();
  const log = read('audit', []);
  log.unshift({ id: cid(), ts: new Date().toISOString(), actor: `${s.user} (${s.role})`, action, entity, detail });
  write('audit', log.slice(0, 3000));
}

// Convert a record from the imported controlled document set (documents-data.js) into
// the shape the application uses. The source file is retained so it can be opened from
// the document detail. The single version carries the stated version number and status.
function toDocumentShape(r) {
  const published = r.status === 'Published';
  const reviewMonths = CONFIG.defaultReviewMonths;
  const version = r.version || '1.0';
  const approvedAt = published && r.nextReviewDate ? addMonths(r.nextReviewDate, -reviewMonths) : null;
  return {
    id: cid(),
    ref: r.ref,
    title: r.title,
    system: r.system || 'ISMS',
    type: r.type,
    classification: r.classification,
    status: r.status,
    owner: r.owner || '',
    author: r.owner || '',
    approver: '',
    reviewMonths,
    lastApprovedAt: approvedAt,
    nextReviewDate: published ? (r.nextReviewDate || null) : null,
    clauseRefs: r.clauseRefs || [],
    controlRefs: r.controlRefs || [],
    currentVersion: version,
    file: r.file || '',
    versions: [{
      number: version,
      status: published ? 'Published' : 'Retired',
      changeSummary: 'Imported from the Cloudax controlled document set.',
      createdAt: approvedAt || new Date().toISOString(),
      publishedAt: published ? approvedAt : null,
    }],
  };
}

// Replace the documents held in the browser with a fresh copy of the controlled set.
export function loadDocumentSet() {
  const docs = DOCUMENTS.map(toDocumentShape);
  write('documents', docs);
  return docs.length;
}

// Fill the internal audit programme with its starter content, with ids assigned.
export function loadAuditSet() {
  const a = AUDIT_SEED.map((x) => ({ id: cid(), ...x, findings: (x.findings || []).map((f) => ({ id: cid(), ...f })) }));
  write('audits', a);
  return a.length;
}

// Fill the certification body assessment with its starter content.
export function loadCertBodySet() {
  const b = CERT_BODY_SEED.map((x) => ({ id: cid(), ...x }));
  write('certBodies', b);
  return b.length;
}

// Fill every register with its starter content. Replaces what is held in the browser.
export function loadRegisterSet() {
  let n = 0;
  for (const r of CONFIG.registers) {
    const seed = REGISTER_SEED[r.key] || [];
    write('register.' + r.key, seed.map((e) => ({ id: cid(), ...e })));
    n += seed.length;
  }
  return n;
}

// Populate the Statement of Applicability from the controlled document set. For each
// Annex A control addressed by a published document, the control is marked applicable,
// the documents are recorded against it, the owner is taken from the lead document and
// the implementation status is set to Implemented. Decisions already recorded in the
// browser are preserved: only blank fields are filled.
export function populateSoaFromDocuments() {
  const published = read('documents', []).filter((d) => d.status === 'Published');
  const byControl = {};
  for (const d of published) {
    for (const ref of d.controlRefs || []) (byControl[ref] = byControl[ref] || []).push(d);
  }
  const soa = read('soa', []);
  let changed = 0;
  for (const entry of soa) {
    const hits = byControl[entry.ref];
    if (!hits || !hits.length) continue;
    const refs = Array.from(new Set(hits.map((d) => d.ref)));
    entry.docRefs = Array.from(new Set([...(entry.docRefs || []), ...refs]));
    if (entry.applicable === null) entry.applicable = true;
    if (!entry.owner) entry.owner = hits[0].owner || '';
    if (entry.status === 'Not started') entry.status = 'Implemented';
    if (!(entry.justification || '').trim()) {
      entry.justification = `Applicable. Addressed by the controlled documents ${refs.join(', ')}. Confirm during review.`;
    }
    changed += 1;
  }
  write('soa', soa);
  return changed;
}

export function ensureSeed() {
  const s = getSettings();
  if (!read('soa', null)) {
    write('soa', CONTROLS.map((c) => ({ ref: c.ref, applicable: null, justification: '', status: 'Not started', owner: '', docRefs: [] })));
  }
  if (read('documents', null) === null) write('documents', []);
  if (!read('audit', null)) write('audit', []);
  // Seed the AI management system Statement of Applicability from the ISO/IEC 42001
  // Annex A controls with their starter decisions. Created once and never overwritten,
  // so recorded decisions stay. Refs missing from the seed default to undecided.
  if (!read('aimsSoa', null)) {
    const seedByRef = Object.fromEntries(AIMS_SOA_SEED.map((e) => [e.ref, e]));
    write('aimsSoa', AIMS_CONTROLS.map((c) => seedByRef[c.ref] ? { ...seedByRef[c.ref] } : { ref: c.ref, applicable: null, justification: '', status: 'Not started', owner: '' }));
  }
  // One time import of the controlled document set. This runs on a new install and when
  // the seed version is raised, but it never overwrites documents already created here.
  if ((s.seedVersion || 0) < 2 && read('documents', []).length === 0) {
    write('documents', DOCUMENTS.map(toDocumentShape));
  }
  // Populate the Statement of Applicability from the controlled documents, so the
  // controls they address are marked applicable and linked. Runs once when the seed
  // version is raised; it fills only blanks and does not overwrite recorded decisions.
  if ((s.seedVersion || 0) < 3) populateSoaFromDocuments();
  // Fill the registers with their starter content, but only those still empty, so a
  // register a user has cleared or edited is left as it is.
  if ((s.seedVersion || 0) < 4) {
    for (const r of CONFIG.registers) {
      const seed = REGISTER_SEED[r.key] || [];
      if (seed.length && read('register.' + r.key, []).length === 0) {
        write('register.' + r.key, seed.map((e) => ({ id: cid(), ...e })));
      }
    }
  }
  // Seed the internal audit programme once.
  if ((s.seedVersion || 0) < 6 && read('audits', null) === null) {
    write('audits', AUDIT_SEED.map((a) => ({ id: cid(), ...a, findings: (a.findings || []).map((f) => ({ id: cid(), ...f })) })));
  }
  // Seed the certification body assessment once.
  if ((s.seedVersion || 0) < 7 && read('certBodies', null) === null) {
    write('certBodies', CERT_BODY_SEED.map((b) => ({ id: cid(), ...b })));
  }
  // Backfill the controls that treat each risk onto existing risk entries, matched by
  // risk identifier, without disturbing any other recorded values.
  if ((s.seedVersion || 0) < 5) {
    const seedControls = Object.fromEntries((REGISTER_SEED.risk || []).map((r) => [r.riskId, r.relatedControls]));
    const risks = read('register.risk', []);
    let touched = false;
    for (const r of risks) { if (!r.relatedControls && seedControls[r.riskId]) { r.relatedControls = seedControls[r.riskId]; touched = true; } }
    if (touched) write('register.risk', risks);
  }
  // Backfill the residual likelihood and impact onto existing risks, from the seed
  // where the risk identifier matches, otherwise defaulting to the inherent values.
  if ((s.seedVersion || 0) < 8) {
    const seedRes = Object.fromEntries((REGISTER_SEED.risk || []).map((r) => [r.riskId, r]));
    const risks = read('register.risk', []);
    let touched = false;
    for (const r of risks) {
      if (r.residualLikelihood == null || r.residualLikelihood === '') {
        const sr = seedRes[r.riskId];
        r.residualLikelihood = sr ? sr.residualLikelihood : r.likelihood;
        r.residualImpact = sr ? sr.residualImpact : r.impact;
        touched = true;
      }
    }
    if (touched) write('register.risk', risks);
  }
  // Backfill starter decisions onto an AI management Statement of Applicability that is
  // still pristine, matched by control reference. Only undecided controls with no
  // justification are filled, so any recorded decision is left untouched.
  if ((s.seedVersion || 0) < 10) {
    const seedByRef = Object.fromEntries(AIMS_SOA_SEED.map((e) => [e.ref, e]));
    const aims = read('aimsSoa', []);
    let touched = false;
    for (const e of aims) {
      if (e.applicable == null && !String(e.justification || '').trim() && seedByRef[e.ref]) {
        Object.assign(e, seedByRef[e.ref]); touched = true;
      }
    }
    if (touched) write('aimsSoa', aims);
  }
  if (s.seedVersion !== SEED_VERSION) setSettings({ ...s, seedVersion: SEED_VERSION });
}

export function resetAll() {
  for (const k of ['documents', 'soa', 'aimsSoa', 'audit', 'audits', 'certBodies', 'settings']) localStorage.removeItem(NS + k);
  for (const r of CONFIG.registers) localStorage.removeItem(NS + 'register.' + r.key);
  ensureSeed();
}

export function exportAll() {
  const data = { settings: getSettings(), documents: read('documents', []), soa: read('soa', []), aimsSoa: read('aimsSoa', []), audit: read('audit', []), registers: {} };
  for (const r of CONFIG.registers) data.registers[r.key] = read('register.' + r.key, []);
  return data;
}

export function importAll(data) {
  if (data.documents) write('documents', data.documents);
  if (data.soa) write('soa', data.soa);
  if (data.aimsSoa) write('aimsSoa', data.aimsSoa);
  if (data.audit) write('audit', data.audit);
  if (data.settings) write('settings', data.settings);
  if (data.registers) for (const k of Object.keys(data.registers)) write('register.' + k, data.registers[k]);
}

export function addMonths(dateIso, months) {
  const d = new Date(dateIso);
  d.setMonth(d.getMonth() + Number(months || 0));
  return d.toISOString();
}

export function nextReference(type) {
  const prefix = CONFIG.prefixes[type] || 'DOC';
  const docs = read('documents', []);
  const n = docs.filter((d) => (d.ref || '').startsWith(prefix + '-')).length + 1;
  return `${prefix}-${String(n).padStart(4, '0')}`;
}
