// ISO/IEC 27001:2022 management system clauses 4 to 10, with subclauses, the
// mandatory documented information each clause requires, and the climate change
// considerations introduced by Amendment 1:2024 in 4.1 and 4.2.
//
// Descriptions are short summaries in plain words. The normative text of the standard
// is not reproduced here, as it is copyright of ISO.

export interface ClauseSeed {
  clauseNumber: string;
  title: string;
  description: string;
  mandatoryDocuments: string[];
  isClimateConsideration?: boolean;
}

export const clauses: ClauseSeed[] = [
  // Clause 4: Context of the organisation
  {
    clauseNumber: '4',
    title: 'Context of the organisation',
    description: 'Understanding the organisation and its context, interested parties, scope and the ISMS itself.',
    mandatoryDocuments: [],
  },
  {
    clauseNumber: '4.1',
    title: 'Understanding the organisation and its context',
    description:
      'Determine the internal and external issues relevant to the ISMS. Amendment 1:2024 requires the organisation to determine whether climate change is a relevant issue.',
    mandatoryDocuments: [],
    isClimateConsideration: true,
  },
  {
    clauseNumber: '4.2',
    title: 'Understanding the needs and expectations of interested parties',
    description:
      'Identify interested parties and their requirements relevant to the ISMS. Amendment 1:2024 notes that relevant interested parties can have requirements related to climate change.',
    mandatoryDocuments: [],
    isClimateConsideration: true,
  },
  {
    clauseNumber: '4.3',
    title: 'Determining the scope of the information security management system',
    description: 'Define and document the boundaries and applicability of the ISMS to establish its scope.',
    mandatoryDocuments: ['ISMS scope'],
  },
  {
    clauseNumber: '4.4',
    title: 'Information security management system',
    description: 'Establish, implement, maintain and continually improve the ISMS.',
    mandatoryDocuments: [],
  },

  // Clause 5: Leadership
  {
    clauseNumber: '5',
    title: 'Leadership',
    description: 'Leadership and commitment, policy, and organisational roles, responsibilities and authorities.',
    mandatoryDocuments: [],
  },
  {
    clauseNumber: '5.1',
    title: 'Leadership and commitment',
    description: 'Top management demonstrates leadership and commitment with respect to the ISMS.',
    mandatoryDocuments: [],
  },
  {
    clauseNumber: '5.2',
    title: 'Policy',
    description: 'Establish an information security policy appropriate to the organisation.',
    mandatoryDocuments: ['Information security policy'],
  },
  {
    clauseNumber: '5.3',
    title: 'Organisational roles, responsibilities and authorities',
    description: 'Assign and communicate responsibilities and authorities for information security.',
    mandatoryDocuments: [],
  },

  // Clause 6: Planning
  {
    clauseNumber: '6',
    title: 'Planning',
    description: 'Actions to address risks and opportunities, objectives, and planning of changes.',
    mandatoryDocuments: [],
  },
  {
    clauseNumber: '6.1.1',
    title: 'Actions to address risks and opportunities: general',
    description: 'Plan actions to address the risks and opportunities determined from the context.',
    mandatoryDocuments: [],
  },
  {
    clauseNumber: '6.1.2',
    title: 'Information security risk assessment',
    description: 'Define and apply an information security risk assessment process.',
    mandatoryDocuments: ['Information security risk assessment process'],
  },
  {
    clauseNumber: '6.1.3',
    title: 'Information security risk treatment',
    description:
      'Define and apply a risk treatment process and produce a Statement of Applicability that justifies inclusions and exclusions of Annex A controls.',
    mandatoryDocuments: ['Information security risk treatment process', 'Statement of Applicability'],
  },
  {
    clauseNumber: '6.2',
    title: 'Information security objectives and planning to achieve them',
    description: 'Establish measurable information security objectives and plan how to achieve them.',
    mandatoryDocuments: ['Information security objectives'],
  },
  {
    clauseNumber: '6.3',
    title: 'Planning of changes',
    description: 'Carry out changes to the ISMS in a planned manner.',
    mandatoryDocuments: [],
  },

  // Clause 7: Support
  {
    clauseNumber: '7',
    title: 'Support',
    description: 'Resources, competence, awareness, communication and documented information.',
    mandatoryDocuments: [],
  },
  {
    clauseNumber: '7.1',
    title: 'Resources',
    description: 'Determine and provide the resources needed for the ISMS.',
    mandatoryDocuments: [],
  },
  {
    clauseNumber: '7.2',
    title: 'Competence',
    description: 'Ensure the competence of persons doing work that affects information security.',
    mandatoryDocuments: ['Evidence of competence'],
  },
  {
    clauseNumber: '7.3',
    title: 'Awareness',
    description: 'Ensure persons are aware of the policy, their contribution and the implications of nonconformity.',
    mandatoryDocuments: [],
  },
  {
    clauseNumber: '7.4',
    title: 'Communication',
    description: 'Determine the internal and external communications relevant to the ISMS.',
    mandatoryDocuments: [],
  },
  {
    clauseNumber: '7.5',
    title: 'Documented information',
    description:
      'Create, update and control the documented information required by the standard and by the ISMS, including identification, format, review, approval and access control.',
    mandatoryDocuments: [],
  },

  // Clause 8: Operation
  {
    clauseNumber: '8',
    title: 'Operation',
    description: 'Operational planning and control, risk assessment and risk treatment in operation.',
    mandatoryDocuments: [],
  },
  {
    clauseNumber: '8.1',
    title: 'Operational planning and control',
    description: 'Plan, implement and control the processes needed to meet requirements and keep evidence of control.',
    mandatoryDocuments: ['Evidence of operational planning and control'],
  },
  {
    clauseNumber: '8.2',
    title: 'Information security risk assessment',
    description: 'Perform risk assessments at planned intervals and on significant change, and retain the results.',
    mandatoryDocuments: ['Results of information security risk assessments'],
  },
  {
    clauseNumber: '8.3',
    title: 'Information security risk treatment',
    description: 'Implement the risk treatment plan and retain the results.',
    mandatoryDocuments: ['Results of information security risk treatment'],
  },

  // Clause 9: Performance evaluation
  {
    clauseNumber: '9',
    title: 'Performance evaluation',
    description: 'Monitoring, measurement, analysis and evaluation, internal audit and management review.',
    mandatoryDocuments: [],
  },
  {
    clauseNumber: '9.1',
    title: 'Monitoring, measurement, analysis and evaluation',
    description: 'Evaluate the information security performance and the effectiveness of the ISMS, and retain evidence.',
    mandatoryDocuments: ['Monitoring and measurement results'],
  },
  {
    clauseNumber: '9.2',
    title: 'Internal audit',
    description: 'Conduct internal audits at planned intervals and retain the programme and results.',
    mandatoryDocuments: ['Internal audit programme', 'Internal audit results'],
  },
  {
    clauseNumber: '9.3',
    title: 'Management review',
    description: 'Top management reviews the ISMS at planned intervals and retains the results.',
    mandatoryDocuments: ['Results of management reviews'],
  },

  // Clause 10: Improvement
  {
    clauseNumber: '10',
    title: 'Improvement',
    description: 'Continual improvement and the handling of nonconformity and corrective action.',
    mandatoryDocuments: [],
  },
  {
    clauseNumber: '10.1',
    title: 'Continual improvement',
    description: 'Continually improve the suitability, adequacy and effectiveness of the ISMS.',
    mandatoryDocuments: [],
  },
  {
    clauseNumber: '10.2',
    title: 'Nonconformity and corrective action',
    description: 'React to nonconformity, take corrective action and retain evidence of the nature and outcome.',
    mandatoryDocuments: ['Nonconformities and corrective action records'],
  },
];
