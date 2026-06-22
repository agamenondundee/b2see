// Document lifecycle state machine, document reference generation, review date
// calculation and risk scoring. The transition rules and segregation of duties are
// enforced in the routes using these definitions.

import { prisma } from './prisma';
import { defaults } from './config';
import { ROLES } from './auth';

export type DocStatus = 'Draft' | 'InReview' | 'Approved' | 'Published' | 'UnderRevision' | 'Retired';

export interface Transition {
  from: DocStatus[];
  to: DocStatus;
  roles: string[];
}

// Draft to In Review to Approved to Published, then Under Revision back through the
// same path, with the prior published version superseded on publication. A published
// document may be retired.
export const TRANSITIONS: Record<string, Transition> = {
  submit: { from: ['Draft', 'UnderRevision'], to: 'InReview', roles: [ROLES.OWNER, ROLES.MANAGER] },
  review: { from: ['InReview'], to: 'Approved', roles: [ROLES.REVIEWER, ROLES.MANAGER] },
  publish: { from: ['Approved'], to: 'Published', roles: [ROLES.APPROVER, ROLES.MANAGER] },
  startRevision: { from: ['Published'], to: 'UnderRevision', roles: [ROLES.OWNER, ROLES.MANAGER] },
  retire: { from: ['Published', 'Approved', 'UnderRevision'], to: 'Retired', roles: [ROLES.MANAGER] },
};

export function nextReviewDate(approvedAt: Date, frequencyMonths: number): Date {
  const d = new Date(approvedAt);
  d.setMonth(d.getMonth() + frequencyMonths);
  return d;
}

// Generate a document reference from the configured prefix for the type, for example
// POL-0001. A caller may instead supply a reference; the route validates the prefix.
export async function generateDocumentReference(documentType: string): Promise<string> {
  const prefix = defaults.documentTypePrefixes[documentType] ?? documentType.slice(0, 3).toUpperCase();
  const count = await prisma.document.count({ where: { documentId: { startsWith: `${prefix}-` } } });
  return `${prefix}-${String(count + 1).padStart(4, '0')}`;
}

export function prefixForType(documentType: string): string {
  return defaults.documentTypePrefixes[documentType] ?? documentType.slice(0, 3).toUpperCase();
}

export function score(likelihood?: number | null, impact?: number | null): number | null {
  if (typeof likelihood === 'number' && typeof impact === 'number') return likelihood * impact;
  return null;
}
