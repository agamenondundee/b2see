// Seed content for the nine ISMS registers. The entries describe a conversational AI
// cloud platform (Cloudax) running an ISO/IEC 27001 and ISO/IEC 42001 management
// system, with data held in the UK or EU only. Each entry matches the fields defined
// for its register in store.js (CONFIG.registers); the loader adds an id. This is
// starting content for evaluation and should be reviewed and adjusted for real use.

export const REGISTER_SEED = {
  risk: [
    { riskId: 'RISK-001', description: 'Exposure of customer conversation data through a misconfigured storage bucket', likelihood: 3, impact: 5, treatment: 'Modify', relatedControls: 'A.5.23, A.8.9, A.8.12', residualLikelihood: 2, residualImpact: 4, owner: 'Information Security Lead', status: 'Open', reviewDate: '2026-09-30' },
    { riskId: 'RISK-002', description: 'Account takeover of the administration console through credential stuffing', likelihood: 3, impact: 4, treatment: 'Modify', relatedControls: 'A.5.15, A.5.17, A.8.5', residualLikelihood: 2, residualImpact: 3, owner: 'Head of Engineering', status: 'Treated', reviewDate: '2026-09-30' },
    { riskId: 'RISK-003', description: 'Prolonged service outage caused by a single hosting region dependency', likelihood: 2, impact: 4, treatment: 'Modify', relatedControls: 'A.5.29, A.5.30, A.8.14', residualLikelihood: 1, residualImpact: 4, owner: 'Head of Platform', status: 'Open', reviewDate: '2026-10-31' },
    { riskId: 'RISK-004', description: 'Personal data processed outside the UK or EU by a sub-processor', likelihood: 2, impact: 5, treatment: 'Avoid', relatedControls: 'A.5.19, A.5.20, A.5.34', residualLikelihood: 1, residualImpact: 5, owner: 'Data Protection Officer', status: 'Open', reviewDate: '2026-08-31' },
    { riskId: 'RISK-005', description: 'Prompt injection causing the assistant to disclose sensitive information', likelihood: 3, impact: 4, treatment: 'Modify', relatedControls: 'A.8.26, A.8.28', residualLikelihood: 2, residualImpact: 3, owner: 'AI Governance Lead', status: 'Open', reviewDate: '2026-09-15' },
    { riskId: 'RISK-006', description: 'Failure or withdrawal of the primary model provider', likelihood: 2, impact: 4, treatment: 'Share', relatedControls: 'A.5.19, A.5.21, A.5.22', residualLikelihood: 1, residualImpact: 3, owner: 'Procurement Lead', status: 'Open', reviewDate: '2026-11-30' },
    { riskId: 'RISK-007', description: 'Insider misuse of production access to customer data', likelihood: 2, impact: 4, treatment: 'Modify', relatedControls: 'A.5.18, A.8.2, A.8.15', residualLikelihood: 1, residualImpact: 3, owner: 'Information Security Lead', status: 'Treated', reviewDate: '2026-10-31' },
    { riskId: 'RISK-008', description: 'Ransomware affecting corporate endpoints and shared drives', likelihood: 2, impact: 4, treatment: 'Modify', relatedControls: 'A.8.7, A.8.13, A.6.3', residualLikelihood: 1, residualImpact: 3, owner: 'IT Manager', status: 'Open', reviewDate: '2026-09-30' },
  ],
  asset: [
    { assetId: 'AST-001', name: 'Customer conversation datastore (PostgreSQL)', type: 'Information', owner: 'Head of Platform', classification: 'Confidential', status: 'In use' },
    { assetId: 'AST-002', name: 'Production Kubernetes cluster, eu-west', type: 'Infrastructure', owner: 'Head of Platform', classification: 'Confidential', status: 'In use' },
    { assetId: 'AST-003', name: 'Object storage for transcripts, eu-west-1', type: 'Information', owner: 'Head of Platform', classification: 'Confidential', status: 'In use' },
    { assetId: 'AST-004', name: 'Conversational AI inference service', type: 'Software', owner: 'Head of Engineering', classification: 'Confidential', status: 'In use' },
    { assetId: 'AST-005', name: 'Single sign-on identity provider', type: 'Service', owner: 'IT Manager', classification: 'Restricted', status: 'In use' },
    { assetId: 'AST-006', name: 'Source code repository', type: 'Information', owner: 'Head of Engineering', classification: 'Confidential', status: 'In use' },
    { assetId: 'AST-007', name: 'Corporate laptop fleet, UK', type: 'Hardware', owner: 'IT Manager', classification: 'Internal', status: 'In use' },
    { assetId: 'AST-008', name: 'Secrets manager and key vault', type: 'Service', owner: 'Information Security Lead', classification: 'Restricted', status: 'In use' },
    { assetId: 'AST-009', name: 'Customer support platform', type: 'Service', owner: 'Head of Customer', classification: 'Confidential', status: 'In use' },
  ],
  supplier: [
    { supplierId: 'SUP-001', name: 'Amazon Web Services', service: 'Cloud hosting and storage', dataLocation: 'EU (eu-west-1, Ireland)', dpa: 'Yes', reviewDate: '2027-01-31' },
    { supplierId: 'SUP-002', name: 'Primary model provider, EU endpoint', service: 'Large language model inference', dataLocation: 'EU', dpa: 'Yes', reviewDate: '2026-12-31' },
    { supplierId: 'SUP-003', name: 'Twilio', service: 'Messaging gateway', dataLocation: 'EU and UK', dpa: 'Yes', reviewDate: '2026-12-31' },
    { supplierId: 'SUP-004', name: 'Datadog', service: 'Observability and logging', dataLocation: 'EU', dpa: 'Yes', reviewDate: '2027-02-28' },
    { supplierId: 'SUP-005', name: 'Okta', service: 'Identity and access management', dataLocation: 'EU', dpa: 'Yes', reviewDate: '2027-01-31' },
    { supplierId: 'SUP-006', name: 'Stripe', service: 'Payment processing', dataLocation: 'EU and UK', dpa: 'Yes', reviewDate: '2027-03-31' },
    { supplierId: 'SUP-007', name: 'GitHub', service: 'Source code hosting', dataLocation: 'EU and UK', dpa: 'Yes', reviewDate: '2027-02-28' },
  ],
  nonconformity: [
    { ncId: 'NC-001', source: 'Internal audit', description: 'Access reviews for the production console were not evidenced for the first quarter', reference: 'A.5.18', owner: 'Information Security Lead', dueDate: '2026-08-15', status: 'Open' },
    { ncId: 'NC-002', source: 'Management review', description: 'Two suppliers lacked a current data processing agreement', reference: 'A.5.19', owner: 'Procurement Lead', dueDate: '2026-07-31', status: 'In progress' },
    { ncId: 'NC-003', source: 'Incident', description: 'Backup restoration test was not performed within the defined interval', reference: 'A.8.13', owner: 'Head of Platform', dueDate: '2026-08-31', status: 'Open' },
    { ncId: 'NC-004', source: 'Internal audit', description: 'Starter and leaver records were incomplete for three contractors', reference: 'A.6.5', owner: 'IT Manager', dueDate: '2026-09-15', status: 'Open' },
    { ncId: 'NC-005', source: 'AIMS audit', description: 'An AI system impact assessment was not recorded for a new feature', reference: 'ISO 42001 clause 8.4', owner: 'AI Governance Lead', dueDate: '2026-08-31', status: 'In progress' },
  ],
  'management-review': [
    { reviewId: 'MR-2026-Q1', date: '2026-02-20', attendees: 'Chief Executive, Information Security Lead, Head of Engineering, Data Protection Officer', decisions: 'Approved the revised risk treatment plan and the 2026 internal audit programme.' },
    { reviewId: 'MR-2026-Q2', date: '2026-05-22', attendees: 'Chief Executive, Information Security Lead, Head of Platform, AI Governance Lead', decisions: 'Agreed additional investment in regional failover and approved the AIMS scope.' },
    { reviewId: 'MR-2026-Q3', date: '2026-08-21', attendees: 'Scheduled', decisions: 'Planned agenda: review of nonconformities, supplier performance and security objectives.' },
  ],
  competence: [
    { person: 'A. Okafor', role: 'Information Security Lead', training: 'ISO/IEC 27001 Lead Implementer', date: '2026-01-18' },
    { person: 'R. Lindqvist', role: 'Data Protection Officer', training: 'UK GDPR practitioner refresher', date: '2026-02-10' },
    { person: 'M. Bianchi', role: 'AI Governance Lead', training: 'ISO/IEC 42001 foundations', date: '2026-03-05' },
    { person: 'All staff', role: 'Organisation wide', training: 'Annual security awareness training', date: '2026-04-30' },
    { person: 'Engineering team', role: 'Engineering', training: 'Secure development and the OWASP top ten', date: '2026-05-14' },
    { person: 'All staff', role: 'Organisation wide', training: 'Responsible AI and acceptable use', date: '2026-05-28' },
  ],
  legal: [
    { requirement: 'UK GDPR', source: 'Retained Regulation (EU) 2016/679', owner: 'Data Protection Officer', reviewDate: '2027-01-31' },
    { requirement: 'Data Protection Act 2018', source: 'UK statute', owner: 'Data Protection Officer', reviewDate: '2027-01-31' },
    { requirement: 'Privacy and Electronic Communications Regulations', source: 'PECR 2003', owner: 'Data Protection Officer', reviewDate: '2026-12-31' },
    { requirement: 'EU General Data Protection Regulation', source: 'Regulation (EU) 2016/679', owner: 'Data Protection Officer', reviewDate: '2027-01-31' },
    { requirement: 'EU AI Act', source: 'Regulation (EU) 2024/1689', owner: 'AI Governance Lead', reviewDate: '2026-12-31' },
    { requirement: 'Network and Information Systems Regulations', source: 'NIS Regulations 2018', owner: 'Information Security Lead', reviewDate: '2027-02-28' },
    { requirement: 'Computer Misuse Act 1990', source: 'UK statute', owner: 'Information Security Lead', reviewDate: '2027-02-28' },
  ],
  context: [
    { category: 'Internal issue', item: 'Rapid product growth and frequent AI feature delivery', requirements: 'Security must scale without slowing delivery', climate: 'No' },
    { category: 'External issue', item: 'Evolving AI regulation in the UK and EU', requirements: 'Maintain compliance with the EU AI Act and UK guidance', climate: 'No' },
    { category: 'External issue', item: 'Climate related disruption to hosting regions', requirements: 'Resilience and regional failover for hosting', climate: 'Yes' },
    { category: 'Interested party', item: 'Customers', requirements: 'Confidentiality, availability and lawful processing of conversation data', climate: 'No' },
    { category: 'Interested party', item: 'Regulators, including the ICO', requirements: 'Lawful processing and breach notification within the statutory time', climate: 'No' },
    { category: 'Interested party', item: 'Employees', requirements: 'Clear security responsibilities and training', climate: 'No' },
    { category: 'Interested party', item: 'Investors', requirements: 'Sound governance and maintained certification', climate: 'No' },
    { category: 'Interested party', item: 'Suppliers and sub-processors', requirements: 'Clear security and data processing requirements', climate: 'No' },
  ],
};
