// ISO/IEC 27001:2022 framework: browse clauses and Annex A controls, see the
// documents that evidence each, and surface coverage gaps where a clause requires
// documented information but nothing is linked.

import type { FastifyInstance } from 'fastify';
import { prisma } from '../prisma';
import { requireRole, ROLES } from '../auth';

const viewRoles = [ROLES.READER, ROLES.OWNER, ROLES.REVIEWER, ROLES.APPROVER, ROLES.MANAGER];

export function registerFrameworkRoutes(app: FastifyInstance): void {
  app.get('/api/clauses', { preHandler: requireRole(...viewRoles) }, async () =>
    prisma.clause.findMany({
      orderBy: { clauseNumber: 'asc' },
      include: { documents: { select: { id: true, documentId: true, title: true, status: true } } },
    }),
  );

  app.get('/api/controls', { preHandler: requireRole(...viewRoles) }, async (req) => {
    const q = req.query as Record<string, string>;
    const where: Record<string, unknown> = {};
    if (q.theme) where.theme = q.theme;
    if (q.controlType) where.controlTypes = { has: q.controlType };
    if (q.property) where.properties = { has: q.property };
    if (q.concept) where.concepts = { has: q.concept };
    return prisma.annexAControl.findMany({
      where,
      orderBy: { controlReference: 'asc' },
      include: {
        documents: { select: { id: true, documentId: true, title: true, status: true } },
        soaEntry: { select: { applicable: true, implementationStatus: true } },
      },
    });
  });

  // Coverage gaps: clauses that require documented information but have no linked
  // document. This is the indicator an internal audit looks for.
  app.get('/api/framework/coverage-gaps', { preHandler: requireRole(...viewRoles) }, async () => {
    const clauses = await prisma.clause.findMany({
      where: { NOT: { mandatoryDocuments: { equals: [] } } },
      include: { documents: { select: { id: true, status: true } } },
      orderBy: { clauseNumber: 'asc' },
    });
    return clauses
      .filter((c) => c.documents.length === 0)
      .map((c) => ({ clauseNumber: c.clauseNumber, title: c.title, mandatoryDocuments: c.mandatoryDocuments }));
  });
}
