// Reference control objectives and controls of ISO/IEC 42001:2023 Annex A, the AI
// management system standard. Titles are the official ISO short titles. The control
// guidance is in the licensed standard and is not reproduced. Each control is grouped
// under its top level objective (A.2 to A.10). This supports a Statement of
// Applicability for the AI management system alongside the ISO/IEC 27001 one.

export const AIMS_OBJECTIVES = [
  { ref: 'A.2', name: 'Policies related to AI' },
  { ref: 'A.3', name: 'Internal organisation' },
  { ref: 'A.4', name: 'Resources for AI systems' },
  { ref: 'A.5', name: 'Assessing impacts of AI systems' },
  { ref: 'A.6', name: 'AI system life cycle' },
  { ref: 'A.7', name: 'Data for AI systems' },
  { ref: 'A.8', name: 'Information for interested parties of AI systems' },
  { ref: 'A.9', name: 'Use of AI systems' },
  { ref: 'A.10', name: 'Third party and customer relationships' },
];

export const AIMS_CONTROLS = [
  { ref: 'A.2.2', objective: 'A.2', title: 'AI policy' },
  { ref: 'A.2.3', objective: 'A.2', title: 'Alignment with other organisational policies' },
  { ref: 'A.2.4', objective: 'A.2', title: 'Review of the AI policy' },

  { ref: 'A.3.2', objective: 'A.3', title: 'AI roles and responsibilities' },
  { ref: 'A.3.3', objective: 'A.3', title: 'Reporting of concerns' },

  { ref: 'A.4.2', objective: 'A.4', title: 'Resource documentation' },
  { ref: 'A.4.3', objective: 'A.4', title: 'Data resources' },
  { ref: 'A.4.4', objective: 'A.4', title: 'Tooling resources' },
  { ref: 'A.4.5', objective: 'A.4', title: 'System and computing resources' },
  { ref: 'A.4.6', objective: 'A.4', title: 'Human resources' },

  { ref: 'A.5.2', objective: 'A.5', title: 'AI system impact assessment process' },
  { ref: 'A.5.3', objective: 'A.5', title: 'Documentation of AI system impact assessments' },
  { ref: 'A.5.4', objective: 'A.5', title: 'Assessing AI system impact on individuals or groups of individuals' },
  { ref: 'A.5.5', objective: 'A.5', title: 'Assessing societal impacts of AI systems' },

  { ref: 'A.6.1.2', objective: 'A.6', title: 'Objectives for responsible development of AI systems' },
  { ref: 'A.6.1.3', objective: 'A.6', title: 'Processes for responsible AI system design and development' },
  { ref: 'A.6.2.2', objective: 'A.6', title: 'AI system requirements and specification' },
  { ref: 'A.6.2.3', objective: 'A.6', title: 'Documentation of AI system design and development' },
  { ref: 'A.6.2.4', objective: 'A.6', title: 'AI system verification and validation' },
  { ref: 'A.6.2.5', objective: 'A.6', title: 'AI system deployment' },
  { ref: 'A.6.2.6', objective: 'A.6', title: 'AI system operation and monitoring' },
  { ref: 'A.6.2.7', objective: 'A.6', title: 'AI system technical documentation' },
  { ref: 'A.6.2.8', objective: 'A.6', title: 'AI system recording of event logs' },

  { ref: 'A.7.2', objective: 'A.7', title: 'Data for development and enhancement of AI systems' },
  { ref: 'A.7.3', objective: 'A.7', title: 'Acquisition of data' },
  { ref: 'A.7.4', objective: 'A.7', title: 'Quality of data for AI systems' },
  { ref: 'A.7.5', objective: 'A.7', title: 'Data provenance' },
  { ref: 'A.7.6', objective: 'A.7', title: 'Data preparation' },

  { ref: 'A.8.2', objective: 'A.8', title: 'System documentation and information for users' },
  { ref: 'A.8.3', objective: 'A.8', title: 'External reporting' },
  { ref: 'A.8.4', objective: 'A.8', title: 'Communication of incidents' },
  { ref: 'A.8.5', objective: 'A.8', title: 'Information for interested parties' },

  { ref: 'A.9.2', objective: 'A.9', title: 'Processes for responsible use of AI systems' },
  { ref: 'A.9.3', objective: 'A.9', title: 'Objectives for responsible use of AI systems' },
  { ref: 'A.9.4', objective: 'A.9', title: 'Intended use of the AI system' },

  { ref: 'A.10.2', objective: 'A.10', title: 'Allocating responsibilities' },
  { ref: 'A.10.3', objective: 'A.10', title: 'Suppliers' },
  { ref: 'A.10.4', objective: 'A.10', title: 'Customers' },
];

// The management system clauses of ISO/IEC 42001:2023 (clauses 4 to 10), which mirror
// the high level structure shared with ISO/IEC 27001.
export const AIMS_CLAUSES = [
  { number: '4', title: 'Context of the organisation' },
  { number: '5', title: 'Leadership' },
  { number: '6', title: 'Planning' },
  { number: '7', title: 'Support' },
  { number: '8', title: 'Operation' },
  { number: '9', title: 'Performance evaluation' },
  { number: '10', title: 'Improvement' },
];
