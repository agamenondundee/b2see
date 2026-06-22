// Local persistence for the browser based ISMS. All data is held in the browser
// (localStorage). There is no server. Use Settings to export a backup, import it on
// another machine, or reset the data. This suits evaluation and single user use; the
// multi user, server enforced version lives in the backend in the parent folder.

import { CONTROLS } from './data/controls.js?v=9';
import { DOCUMENTS } from './documents-data.js?v=9';
import { REGISTER_SEED } from './data/registers.js?v=9';

const NS = 'cloudax.isms.';
const SEED_VERSION = 5;

export const CONFIG = {
  prefixes: { Policy: 'POL', Procedure: 'PROC', Standard: 'STD', Guideline: 'GUI', Plan: 'PLAN', Register: 'REG', Record: 'REC', Form: 'FORM' },
  classifications: ['Public', 'Internal', 'Confidential', 'Restricted'],
  reviewMonths: [6, 12, 24],
  defaultReviewMonths: 12,
  reviewDueWithinDays: 30,
  roles: ['Administrator', 'ISMS Manager', 'Document Owner', 'Reviewer', 'Approver', 'Reader'],
  statuses: ['Draft', 'In Review', 'Approved', 'Published', 'Under Revision', 'Retired'],
  implementationStatuses: ['Not started', 'In progress', 'Implemented', 'Verified'],
  registers: [
    { key: 'risk', label: 'Risk register', fields: [
      { name: 'riskId', label: 'Risk ID' }, { name: 'description', label: 'Description' },
      { name: 'likelihood', label: 'Likelihood', type: 'number' }, { name: 'impact', label: 'Impact', type: 'number' },
      { name: 'treatment', label: 'Treatment', type: 'select', options: ['Modify', 'Retain', 'Avoid', 'Share'] },
      { name: 'relatedControls', label: 'Related controls' },
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
    { key: 'audit', label: 'Internal audit register', fields: [
      { name: 'auditId', label: 'Audit ID' }, { name: 'scope', label: 'Scope' }, { name: 'date', label: 'Date', type: 'date' },
      { name: 'auditor', label: 'Auditor' }, { name: 'status', label: 'Status' },
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
  return read('settings', { role: 'Administrator', user: 'Local user', seedVersion: 0 });
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
  // Backfill the controls that treat each risk onto existing risk entries, matched by
  // risk identifier, without disturbing any other recorded values.
  if ((s.seedVersion || 0) < 5) {
    const seedControls = Object.fromEntries((REGISTER_SEED.risk || []).map((r) => [r.riskId, r.relatedControls]));
    const risks = read('register.risk', []);
    let touched = false;
    for (const r of risks) { if (!r.relatedControls && seedControls[r.riskId]) { r.relatedControls = seedControls[r.riskId]; touched = true; } }
    if (touched) write('register.risk', risks);
  }
  if (s.seedVersion !== SEED_VERSION) setSettings({ ...s, seedVersion: SEED_VERSION });
}

export function resetAll() {
  for (const k of ['documents', 'soa', 'audit', 'settings']) localStorage.removeItem(NS + k);
  for (const r of CONFIG.registers) localStorage.removeItem(NS + 'register.' + r.key);
  ensureSeed();
}

export function exportAll() {
  const data = { settings: getSettings(), documents: read('documents', []), soa: read('soa', []), audit: read('audit', []), registers: {} };
  for (const r of CONFIG.registers) data.registers[r.key] = read('register.' + r.key, []);
  return data;
}

export function importAll(data) {
  if (data.documents) write('documents', data.documents);
  if (data.soa) write('soa', data.soa);
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
