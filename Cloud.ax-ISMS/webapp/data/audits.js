// Internal audit programme for the ISMS and AIMS. Each audit records its scope, the
// standard and the clauses or Annex A controls it covered, who performed it, and the
// findings raised (nonconformities, observations and opportunities). This is starter
// content for evaluation and should be reviewed for real use. The loader adds ids.

export const AUDIT_SEED = [
  {
    ref: 'IA-2026-01', scope: 'ISMS management system, clauses 4 to 7', standard: 'ISO/IEC 27001:2022',
    plannedDate: '2026-03-12', completedDate: '2026-03-12', auditor: 'Internal audit team', status: 'Complete',
    summary: 'Context, leadership, planning and support reviewed. The management system is established and operating, with two improvement points raised.',
    clauseRefs: ['4.1', '4.2', '4.3', '5.2', '6.1.2', '6.1.3', '7.2'], controlRefs: [],
    findings: [
      { type: 'Nonconformity', severity: 'Minor', description: 'Access reviews for the production console were not evidenced for the first quarter.', reference: 'A.5.18', owner: 'Information Security Lead', dueDate: '2026-08-15', status: 'Open' },
      { type: 'Observation', severity: '', description: 'The information security objectives could be expressed more measurably.', reference: '6.2', owner: 'Information Security Lead', dueDate: '', status: 'Open' },
    ],
  },
  {
    ref: 'IA-2026-02', scope: 'Annex A organisational and people controls', standard: 'ISO/IEC 27001:2022',
    plannedDate: '2026-04-20', completedDate: '2026-04-23', auditor: 'External auditor', status: 'Complete',
    summary: 'Sampled organisational and people controls. Largely effective; supplier agreements and joiner records need attention.',
    clauseRefs: [], controlRefs: ['A.5.1', 'A.5.15', 'A.5.18', 'A.5.19', 'A.6.1', 'A.6.3'],
    findings: [
      { type: 'Nonconformity', severity: 'Minor', description: 'Two suppliers lacked a current data processing agreement.', reference: 'A.5.19', owner: 'Procurement Lead', dueDate: '2026-07-31', status: 'Open' },
      { type: 'Opportunity for improvement', severity: '', description: 'Consider automating starter and leaver access provisioning.', reference: 'A.5.18', owner: 'IT Manager', dueDate: '', status: 'Open' },
    ],
  },
  {
    ref: 'IA-2026-03', scope: 'Annex A technological and physical controls', standard: 'ISO/IEC 27001:2022',
    plannedDate: '2026-06-01', completedDate: '2026-06-04', auditor: 'Internal audit team', status: 'Complete',
    summary: 'Technological controls sampled across the platform. Backup testing and logging consistency raised.',
    clauseRefs: [], controlRefs: ['A.8.7', 'A.8.9', 'A.8.13', 'A.8.15', 'A.8.24'],
    findings: [
      { type: 'Nonconformity', severity: 'Minor', description: 'Backup restoration test was not performed within the defined interval.', reference: 'A.8.13', owner: 'Head of Platform', dueDate: '2026-08-31', status: 'Open' },
      { type: 'Observation', severity: '', description: 'Logging retention settings vary across services and could be standardised.', reference: 'A.8.15', owner: 'Head of Platform', dueDate: '', status: 'Open' },
    ],
  },
  {
    ref: 'IA-2026-04', scope: 'AIMS management system and Annex A of ISO 42001', standard: 'ISO/IEC 42001:2023',
    plannedDate: '2026-07-16', completedDate: '', auditor: 'Internal audit team', status: 'Planned',
    summary: '', clauseRefs: ['4', '5', '6', '7', '8', '9'], controlRefs: [], findings: [],
  },
  {
    ref: 'IA-2026-05', scope: 'Supplier management and data residency', standard: 'ISO/IEC 27001:2022',
    plannedDate: '2026-09-10', completedDate: '', auditor: 'Internal audit team', status: 'Planned',
    summary: '', clauseRefs: [], controlRefs: ['A.5.19', 'A.5.20', 'A.5.21', 'A.5.22'], findings: [],
  },
  {
    ref: 'IA-2026-06', scope: 'Incident management and business continuity', standard: 'ISO/IEC 27001:2022',
    plannedDate: '2026-10-15', completedDate: '', auditor: 'Internal audit team', status: 'Planned',
    summary: '', clauseRefs: [], controlRefs: ['A.5.24', 'A.5.25', 'A.5.26', 'A.5.29', 'A.5.30', 'A.8.14'], findings: [],
  },
  {
    ref: 'IA-2026-07', scope: 'Management review inputs and corrective action follow up', standard: 'ISO/IEC 27001:2022',
    plannedDate: '2026-11-19', completedDate: '', auditor: 'Internal audit team', status: 'Planned',
    summary: '', clauseRefs: ['9.1', '9.3', '10.1', '10.2'], controlRefs: [], findings: [],
  },
];
