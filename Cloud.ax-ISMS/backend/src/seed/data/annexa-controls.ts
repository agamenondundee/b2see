// All 93 Annex A controls of ISO/IEC 27001:2022, grouped by the four themes.
//
// Each control carries its reference, official short title, theme and the 2022
// attributes: control type, information security properties and cybersecurity
// concepts. Titles are the official ISO short titles. Control descriptions and
// guidance are not reproduced here, as that text is in the licensed standard; the
// description field stays empty for the organisation to populate from its own copy.
//
// The attribute values are derived from the published ISO/IEC 27002:2022 attribute
// model and should be validated against the licensed standard before being relied on
// as audit evidence. See docs/configuration-to-confirm.md, item C15.

export type ControlThemeName = 'Organizational' | 'People' | 'Physical' | 'Technological';
export type ControlTypeName = 'Preventive' | 'Detective' | 'Corrective';
export type SecurityPropertyName = 'Confidentiality' | 'Integrity' | 'Availability';
export type CybersecurityConceptName = 'Identify' | 'Protect' | 'Detect' | 'Respond' | 'Recover';

export interface ControlSeed {
  controlReference: string;
  title: string;
  theme: ControlThemeName;
  controlTypes: ControlTypeName[];
  properties: SecurityPropertyName[];
  concepts: CybersecurityConceptName[];
}

const CIA: SecurityPropertyName[] = ['Confidentiality', 'Integrity', 'Availability'];

export const annexAControls: ControlSeed[] = [
  // A.5 Organizational controls (37)
  { controlReference: 'A.5.1', title: 'Policies for information security', theme: 'Organizational', controlTypes: ['Preventive'], properties: CIA, concepts: ['Identify', 'Protect'] },
  { controlReference: 'A.5.2', title: 'Information security roles and responsibilities', theme: 'Organizational', controlTypes: ['Preventive'], properties: CIA, concepts: ['Identify', 'Protect'] },
  { controlReference: 'A.5.3', title: 'Segregation of duties', theme: 'Organizational', controlTypes: ['Preventive'], properties: CIA, concepts: ['Protect'] },
  { controlReference: 'A.5.4', title: 'Management responsibilities', theme: 'Organizational', controlTypes: ['Preventive'], properties: CIA, concepts: ['Identify'] },
  { controlReference: 'A.5.5', title: 'Contact with authorities', theme: 'Organizational', controlTypes: ['Preventive', 'Corrective'], properties: CIA, concepts: ['Identify', 'Protect', 'Respond', 'Recover'] },
  { controlReference: 'A.5.6', title: 'Contact with special interest groups', theme: 'Organizational', controlTypes: ['Preventive', 'Corrective'], properties: CIA, concepts: ['Protect', 'Respond'] },
  { controlReference: 'A.5.7', title: 'Threat intelligence', theme: 'Organizational', controlTypes: ['Preventive', 'Detective', 'Corrective'], properties: CIA, concepts: ['Identify', 'Detect', 'Respond'] },
  { controlReference: 'A.5.8', title: 'Information security in project management', theme: 'Organizational', controlTypes: ['Preventive'], properties: CIA, concepts: ['Identify', 'Protect'] },
  { controlReference: 'A.5.9', title: 'Inventory of information and other associated assets', theme: 'Organizational', controlTypes: ['Preventive'], properties: CIA, concepts: ['Identify'] },
  { controlReference: 'A.5.10', title: 'Acceptable use of information and other associated assets', theme: 'Organizational', controlTypes: ['Preventive'], properties: CIA, concepts: ['Protect'] },
  { controlReference: 'A.5.11', title: 'Return of assets', theme: 'Organizational', controlTypes: ['Preventive'], properties: CIA, concepts: ['Protect'] },
  { controlReference: 'A.5.12', title: 'Classification of information', theme: 'Organizational', controlTypes: ['Preventive'], properties: CIA, concepts: ['Identify', 'Protect'] },
  { controlReference: 'A.5.13', title: 'Labelling of information', theme: 'Organizational', controlTypes: ['Preventive'], properties: CIA, concepts: ['Protect'] },
  { controlReference: 'A.5.14', title: 'Information transfer', theme: 'Organizational', controlTypes: ['Preventive'], properties: CIA, concepts: ['Protect'] },
  { controlReference: 'A.5.15', title: 'Access control', theme: 'Organizational', controlTypes: ['Preventive'], properties: CIA, concepts: ['Protect'] },
  { controlReference: 'A.5.16', title: 'Identity management', theme: 'Organizational', controlTypes: ['Preventive'], properties: CIA, concepts: ['Protect'] },
  { controlReference: 'A.5.17', title: 'Authentication information', theme: 'Organizational', controlTypes: ['Preventive'], properties: CIA, concepts: ['Protect'] },
  { controlReference: 'A.5.18', title: 'Access rights', theme: 'Organizational', controlTypes: ['Preventive'], properties: CIA, concepts: ['Protect'] },
  { controlReference: 'A.5.19', title: 'Information security in supplier relationships', theme: 'Organizational', controlTypes: ['Preventive'], properties: CIA, concepts: ['Identify', 'Protect'] },
  { controlReference: 'A.5.20', title: 'Addressing information security within supplier agreements', theme: 'Organizational', controlTypes: ['Preventive'], properties: CIA, concepts: ['Identify', 'Protect'] },
  { controlReference: 'A.5.21', title: 'Managing information security in the ICT supply chain', theme: 'Organizational', controlTypes: ['Preventive'], properties: CIA, concepts: ['Identify', 'Protect'] },
  { controlReference: 'A.5.22', title: 'Monitoring, review and change management of supplier services', theme: 'Organizational', controlTypes: ['Preventive', 'Detective'], properties: CIA, concepts: ['Identify', 'Protect', 'Detect'] },
  { controlReference: 'A.5.23', title: 'Information security for use of cloud services', theme: 'Organizational', controlTypes: ['Preventive'], properties: CIA, concepts: ['Protect'] },
  { controlReference: 'A.5.24', title: 'Information security incident management planning and preparation', theme: 'Organizational', controlTypes: ['Corrective'], properties: CIA, concepts: ['Identify', 'Protect', 'Respond', 'Recover'] },
  { controlReference: 'A.5.25', title: 'Assessment and decision on information security events', theme: 'Organizational', controlTypes: ['Detective'], properties: CIA, concepts: ['Detect', 'Respond'] },
  { controlReference: 'A.5.26', title: 'Response to information security incidents', theme: 'Organizational', controlTypes: ['Corrective'], properties: CIA, concepts: ['Respond', 'Recover'] },
  { controlReference: 'A.5.27', title: 'Learning from information security incidents', theme: 'Organizational', controlTypes: ['Preventive'], properties: CIA, concepts: ['Identify', 'Protect'] },
  { controlReference: 'A.5.28', title: 'Collection of evidence', theme: 'Organizational', controlTypes: ['Corrective'], properties: CIA, concepts: ['Detect', 'Respond'] },
  { controlReference: 'A.5.29', title: 'Information security during disruption', theme: 'Organizational', controlTypes: ['Preventive', 'Corrective'], properties: CIA, concepts: ['Protect', 'Respond'] },
  { controlReference: 'A.5.30', title: 'ICT readiness for business continuity', theme: 'Organizational', controlTypes: ['Corrective'], properties: ['Availability'], concepts: ['Respond', 'Recover'] },
  { controlReference: 'A.5.31', title: 'Legal, statutory, regulatory and contractual requirements', theme: 'Organizational', controlTypes: ['Preventive'], properties: CIA, concepts: ['Identify'] },
  { controlReference: 'A.5.32', title: 'Intellectual property rights', theme: 'Organizational', controlTypes: ['Preventive'], properties: CIA, concepts: ['Identify'] },
  { controlReference: 'A.5.33', title: 'Protection of records', theme: 'Organizational', controlTypes: ['Preventive'], properties: CIA, concepts: ['Identify', 'Protect'] },
  { controlReference: 'A.5.34', title: 'Privacy and protection of personal identifiable information (PII)', theme: 'Organizational', controlTypes: ['Preventive'], properties: CIA, concepts: ['Identify', 'Protect'] },
  { controlReference: 'A.5.35', title: 'Independent review of information security', theme: 'Organizational', controlTypes: ['Preventive', 'Corrective'], properties: CIA, concepts: ['Identify', 'Protect'] },
  { controlReference: 'A.5.36', title: 'Compliance with policies, rules and standards for information security', theme: 'Organizational', controlTypes: ['Preventive', 'Corrective'], properties: CIA, concepts: ['Identify', 'Protect'] },
  { controlReference: 'A.5.37', title: 'Documented operating procedures', theme: 'Organizational', controlTypes: ['Preventive', 'Corrective'], properties: CIA, concepts: ['Identify', 'Protect'] },

  // A.6 People controls (8)
  { controlReference: 'A.6.1', title: 'Screening', theme: 'People', controlTypes: ['Preventive'], properties: CIA, concepts: ['Identify', 'Protect'] },
  { controlReference: 'A.6.2', title: 'Terms and conditions of employment', theme: 'People', controlTypes: ['Preventive'], properties: CIA, concepts: ['Protect'] },
  { controlReference: 'A.6.3', title: 'Information security awareness, education and training', theme: 'People', controlTypes: ['Preventive'], properties: CIA, concepts: ['Protect'] },
  { controlReference: 'A.6.4', title: 'Disciplinary process', theme: 'People', controlTypes: ['Preventive', 'Corrective'], properties: CIA, concepts: ['Protect', 'Respond'] },
  { controlReference: 'A.6.5', title: 'Responsibilities after termination or change of employment', theme: 'People', controlTypes: ['Preventive'], properties: CIA, concepts: ['Protect'] },
  { controlReference: 'A.6.6', title: 'Confidentiality or non-disclosure agreements', theme: 'People', controlTypes: ['Preventive'], properties: CIA, concepts: ['Protect'] },
  { controlReference: 'A.6.7', title: 'Remote working', theme: 'People', controlTypes: ['Preventive'], properties: CIA, concepts: ['Protect'] },
  { controlReference: 'A.6.8', title: 'Information security event reporting', theme: 'People', controlTypes: ['Detective'], properties: CIA, concepts: ['Detect'] },

  // A.7 Physical controls (14)
  { controlReference: 'A.7.1', title: 'Physical security perimeters', theme: 'Physical', controlTypes: ['Preventive'], properties: CIA, concepts: ['Protect'] },
  { controlReference: 'A.7.2', title: 'Physical entry', theme: 'Physical', controlTypes: ['Preventive'], properties: CIA, concepts: ['Protect'] },
  { controlReference: 'A.7.3', title: 'Securing offices, rooms and facilities', theme: 'Physical', controlTypes: ['Preventive'], properties: CIA, concepts: ['Protect'] },
  { controlReference: 'A.7.4', title: 'Physical security monitoring', theme: 'Physical', controlTypes: ['Preventive', 'Detective'], properties: CIA, concepts: ['Protect', 'Detect'] },
  { controlReference: 'A.7.5', title: 'Protecting against physical and environmental threats', theme: 'Physical', controlTypes: ['Preventive'], properties: CIA, concepts: ['Protect'] },
  { controlReference: 'A.7.6', title: 'Working in secure areas', theme: 'Physical', controlTypes: ['Preventive'], properties: CIA, concepts: ['Protect'] },
  { controlReference: 'A.7.7', title: 'Clear desk and clear screen', theme: 'Physical', controlTypes: ['Preventive'], properties: CIA, concepts: ['Protect'] },
  { controlReference: 'A.7.8', title: 'Equipment siting and protection', theme: 'Physical', controlTypes: ['Preventive'], properties: CIA, concepts: ['Protect'] },
  { controlReference: 'A.7.9', title: 'Security of assets off-premises', theme: 'Physical', controlTypes: ['Preventive'], properties: CIA, concepts: ['Protect'] },
  { controlReference: 'A.7.10', title: 'Storage media', theme: 'Physical', controlTypes: ['Preventive'], properties: CIA, concepts: ['Protect'] },
  { controlReference: 'A.7.11', title: 'Supporting utilities', theme: 'Physical', controlTypes: ['Preventive', 'Detective'], properties: ['Integrity', 'Availability'], concepts: ['Protect', 'Detect'] },
  { controlReference: 'A.7.12', title: 'Cabling security', theme: 'Physical', controlTypes: ['Preventive'], properties: ['Confidentiality', 'Availability'], concepts: ['Protect'] },
  { controlReference: 'A.7.13', title: 'Equipment maintenance', theme: 'Physical', controlTypes: ['Preventive', 'Detective'], properties: CIA, concepts: ['Protect'] },
  { controlReference: 'A.7.14', title: 'Secure disposal or re-use of equipment', theme: 'Physical', controlTypes: ['Preventive'], properties: ['Confidentiality'], concepts: ['Protect'] },

  // A.8 Technological controls (34)
  { controlReference: 'A.8.1', title: 'User endpoint devices', theme: 'Technological', controlTypes: ['Preventive'], properties: CIA, concepts: ['Protect'] },
  { controlReference: 'A.8.2', title: 'Privileged access rights', theme: 'Technological', controlTypes: ['Preventive'], properties: CIA, concepts: ['Protect'] },
  { controlReference: 'A.8.3', title: 'Information access restriction', theme: 'Technological', controlTypes: ['Preventive'], properties: CIA, concepts: ['Protect'] },
  { controlReference: 'A.8.4', title: 'Access to source code', theme: 'Technological', controlTypes: ['Preventive'], properties: CIA, concepts: ['Protect'] },
  { controlReference: 'A.8.5', title: 'Secure authentication', theme: 'Technological', controlTypes: ['Preventive'], properties: CIA, concepts: ['Protect'] },
  { controlReference: 'A.8.6', title: 'Capacity management', theme: 'Technological', controlTypes: ['Preventive', 'Detective'], properties: ['Integrity', 'Availability'], concepts: ['Identify', 'Protect', 'Detect'] },
  { controlReference: 'A.8.7', title: 'Protection against malware', theme: 'Technological', controlTypes: ['Preventive', 'Detective', 'Corrective'], properties: CIA, concepts: ['Protect', 'Detect'] },
  { controlReference: 'A.8.8', title: 'Management of technical vulnerabilities', theme: 'Technological', controlTypes: ['Preventive'], properties: CIA, concepts: ['Identify', 'Protect'] },
  { controlReference: 'A.8.9', title: 'Configuration management', theme: 'Technological', controlTypes: ['Preventive'], properties: CIA, concepts: ['Protect'] },
  { controlReference: 'A.8.10', title: 'Information deletion', theme: 'Technological', controlTypes: ['Preventive'], properties: ['Confidentiality'], concepts: ['Protect'] },
  { controlReference: 'A.8.11', title: 'Data masking', theme: 'Technological', controlTypes: ['Preventive'], properties: ['Confidentiality'], concepts: ['Protect'] },
  { controlReference: 'A.8.12', title: 'Data leakage prevention', theme: 'Technological', controlTypes: ['Preventive', 'Detective'], properties: ['Confidentiality'], concepts: ['Protect', 'Detect'] },
  { controlReference: 'A.8.13', title: 'Information backup', theme: 'Technological', controlTypes: ['Corrective'], properties: ['Integrity', 'Availability'], concepts: ['Recover'] },
  { controlReference: 'A.8.14', title: 'Redundancy of information processing facilities', theme: 'Technological', controlTypes: ['Preventive'], properties: ['Availability'], concepts: ['Protect'] },
  { controlReference: 'A.8.15', title: 'Logging', theme: 'Technological', controlTypes: ['Detective'], properties: CIA, concepts: ['Protect', 'Detect'] },
  { controlReference: 'A.8.16', title: 'Monitoring activities', theme: 'Technological', controlTypes: ['Detective', 'Corrective'], properties: CIA, concepts: ['Detect', 'Respond'] },
  { controlReference: 'A.8.17', title: 'Clock synchronization', theme: 'Technological', controlTypes: ['Detective'], properties: CIA, concepts: ['Protect', 'Detect'] },
  { controlReference: 'A.8.18', title: 'Use of privileged utility programs', theme: 'Technological', controlTypes: ['Preventive'], properties: CIA, concepts: ['Protect'] },
  { controlReference: 'A.8.19', title: 'Installation of software on operational systems', theme: 'Technological', controlTypes: ['Preventive'], properties: CIA, concepts: ['Protect'] },
  { controlReference: 'A.8.20', title: 'Networks security', theme: 'Technological', controlTypes: ['Preventive', 'Detective'], properties: CIA, concepts: ['Protect', 'Detect'] },
  { controlReference: 'A.8.21', title: 'Security of network services', theme: 'Technological', controlTypes: ['Preventive', 'Detective'], properties: CIA, concepts: ['Protect', 'Detect'] },
  { controlReference: 'A.8.22', title: 'Segregation of networks', theme: 'Technological', controlTypes: ['Preventive'], properties: CIA, concepts: ['Protect'] },
  { controlReference: 'A.8.23', title: 'Web filtering', theme: 'Technological', controlTypes: ['Preventive'], properties: CIA, concepts: ['Protect'] },
  { controlReference: 'A.8.24', title: 'Use of cryptography', theme: 'Technological', controlTypes: ['Preventive'], properties: CIA, concepts: ['Protect'] },
  { controlReference: 'A.8.25', title: 'Secure development life cycle', theme: 'Technological', controlTypes: ['Preventive'], properties: CIA, concepts: ['Protect'] },
  { controlReference: 'A.8.26', title: 'Application security requirements', theme: 'Technological', controlTypes: ['Preventive'], properties: CIA, concepts: ['Identify', 'Protect'] },
  { controlReference: 'A.8.27', title: 'Secure system architecture and engineering principles', theme: 'Technological', controlTypes: ['Preventive'], properties: CIA, concepts: ['Protect'] },
  { controlReference: 'A.8.28', title: 'Secure coding', theme: 'Technological', controlTypes: ['Preventive'], properties: CIA, concepts: ['Protect'] },
  { controlReference: 'A.8.29', title: 'Security testing in development and acceptance', theme: 'Technological', controlTypes: ['Preventive'], properties: CIA, concepts: ['Identify', 'Protect'] },
  { controlReference: 'A.8.30', title: 'Outsourced development', theme: 'Technological', controlTypes: ['Preventive', 'Detective'], properties: CIA, concepts: ['Identify', 'Protect', 'Detect'] },
  { controlReference: 'A.8.31', title: 'Separation of development, test and production environments', theme: 'Technological', controlTypes: ['Preventive'], properties: CIA, concepts: ['Protect'] },
  { controlReference: 'A.8.32', title: 'Change management', theme: 'Technological', controlTypes: ['Preventive'], properties: CIA, concepts: ['Protect'] },
  { controlReference: 'A.8.33', title: 'Test information', theme: 'Technological', controlTypes: ['Preventive'], properties: ['Confidentiality'], concepts: ['Protect'] },
  { controlReference: 'A.8.34', title: 'Protection of information systems during audit testing', theme: 'Technological', controlTypes: ['Preventive'], properties: CIA, concepts: ['Protect'] },
];
