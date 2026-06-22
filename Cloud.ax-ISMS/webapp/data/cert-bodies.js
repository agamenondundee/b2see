// Scoring model for choosing and reviewing an external certification body. Each
// criterion has a weight; each body is scored 1 to 5 against it, and the weighted
// total gives an overall percentage. The seed bodies and scores are illustrative and
// should be set from your own assessment. The loader adds ids.

export const CERT_CRITERIA = [
  { key: 'accreditation', label: 'Accreditation and recognition', weight: 3, note: 'UKAS or equivalent accreditation for the standards in scope' },
  { key: 'scope', label: 'Scope coverage', weight: 3, note: 'Can certify both ISO/IEC 27001 and ISO/IEC 42001' },
  { key: 'competence', label: 'Auditor competence and continuity', weight: 3, note: 'Qualified auditors with continuity across the cycle' },
  { key: 'sector', label: 'Sector and cloud experience', weight: 2, note: 'Experience with cloud and conversational AI providers' },
  { key: 'value', label: 'Fees and value', weight: 2, note: 'Total cost across the three year cycle' },
  { key: 'availability', label: 'Availability and lead time', weight: 2, note: 'Lead time to the stage 1 and stage 2 audits' },
  { key: 'responsiveness', label: 'Responsiveness and support', weight: 1, note: 'Quality of communication and support' },
  { key: 'reputation', label: 'Reputation and references', weight: 2, note: 'Market reputation and client references' },
];

export const CERT_BODY_SEED = [
  {
    name: 'BSI', accreditation: 'UKAS', scopes: ['ISO/IEC 27001', 'ISO/IEC 42001'],
    notes: 'Originator of several standards; strong recognition and AI management experience. Higher fees.',
    scores: { accreditation: 5, scope: 5, competence: 5, sector: 4, value: 2, availability: 3, responsiveness: 4, reputation: 5 },
  },
  {
    name: 'LRQA', accreditation: 'UKAS', scopes: ['ISO/IEC 27001', 'ISO/IEC 42001'],
    notes: 'Broad technology sector experience and good auditor continuity.',
    scores: { accreditation: 5, scope: 4, competence: 4, sector: 4, value: 3, availability: 4, responsiveness: 4, reputation: 4 },
  },
  {
    name: 'NQA', accreditation: 'UKAS', scopes: ['ISO/IEC 27001'],
    notes: 'Competitive fees and good availability; AI management offering still developing.',
    scores: { accreditation: 5, scope: 3, competence: 4, sector: 3, value: 4, availability: 4, responsiveness: 4, reputation: 4 },
  },
  {
    name: 'DNV', accreditation: 'UKAS', scopes: ['ISO/IEC 27001'],
    notes: 'Well regarded; assess scope for ISO/IEC 42001 before selection.',
    scores: { accreditation: 5, scope: 3, competence: 4, sector: 3, value: 3, availability: 3, responsiveness: 3, reputation: 4 },
  },
];
