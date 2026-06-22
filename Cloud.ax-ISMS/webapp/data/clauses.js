// ISO/IEC 27001:2022 clauses 4 to 10 with subclauses, the mandatory documented
// information each requires, and the Amendment 1:2024 climate change considerations
// in 4.1 and 4.2. Descriptions are short summaries; the normative text is in the
// licensed standard and is not reproduced.

export const CLAUSES = [
  { number: '4', title: 'Context of the organisation', mandatory: [] },
  { number: '4.1', title: 'Understanding the organisation and its context', mandatory: [], climate: true },
  { number: '4.2', title: 'Understanding the needs and expectations of interested parties', mandatory: [], climate: true },
  { number: '4.3', title: 'Determining the scope of the information security management system', mandatory: ['ISMS scope'] },
  { number: '4.4', title: 'Information security management system', mandatory: [] },
  { number: '5', title: 'Leadership', mandatory: [] },
  { number: '5.1', title: 'Leadership and commitment', mandatory: [] },
  { number: '5.2', title: 'Policy', mandatory: ['Information security policy'] },
  { number: '5.3', title: 'Organisational roles, responsibilities and authorities', mandatory: [] },
  { number: '6', title: 'Planning', mandatory: [] },
  { number: '6.1.1', title: 'Actions to address risks and opportunities: general', mandatory: [] },
  { number: '6.1.2', title: 'Information security risk assessment', mandatory: ['Information security risk assessment process'] },
  { number: '6.1.3', title: 'Information security risk treatment', mandatory: ['Information security risk treatment process', 'Statement of Applicability'] },
  { number: '6.2', title: 'Information security objectives and planning to achieve them', mandatory: ['Information security objectives'] },
  { number: '6.3', title: 'Planning of changes', mandatory: [] },
  { number: '7', title: 'Support', mandatory: [] },
  { number: '7.1', title: 'Resources', mandatory: [] },
  { number: '7.2', title: 'Competence', mandatory: ['Evidence of competence'] },
  { number: '7.3', title: 'Awareness', mandatory: [] },
  { number: '7.4', title: 'Communication', mandatory: [] },
  { number: '7.5', title: 'Documented information', mandatory: [] },
  { number: '8', title: 'Operation', mandatory: [] },
  { number: '8.1', title: 'Operational planning and control', mandatory: ['Evidence of operational planning and control'] },
  { number: '8.2', title: 'Information security risk assessment', mandatory: ['Results of information security risk assessments'] },
  { number: '8.3', title: 'Information security risk treatment', mandatory: ['Results of information security risk treatment'] },
  { number: '9', title: 'Performance evaluation', mandatory: [] },
  { number: '9.1', title: 'Monitoring, measurement, analysis and evaluation', mandatory: ['Monitoring and measurement results'] },
  { number: '9.2', title: 'Internal audit', mandatory: ['Internal audit programme', 'Internal audit results'] },
  { number: '9.3', title: 'Management review', mandatory: ['Results of management reviews'] },
  { number: '10', title: 'Improvement', mandatory: [] },
  { number: '10.1', title: 'Continual improvement', mandatory: [] },
  { number: '10.2', title: 'Nonconformity and corrective action', mandatory: ['Nonconformities and corrective action records'] },
];
