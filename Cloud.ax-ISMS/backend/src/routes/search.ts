// Search across document metadata, clauses and Annex A controls. PostgreSQL case
// insensitive matching is used; this can be upgraded to full text search at scale.

import type { FastifyInstance } from 'fastify';
import { prisma } from '../prisma';
import { requireRole, ROLES } from '../auth';

const viewRoles = [ROLES.READER, ROLES.OWNER, ROLES.REVIEWER, ROLES.APPROVER, ROLES.MANAGER];

export function registerSearchRoutes(app: FastifyInstance): void {
  app.get('/api/search', { preHandler: requireRole(...viewRoles) }, async (req) => {
    const q = (req.query as { q?: string }).q?.trim() ?? '';
    if (!q) return { documents: [], controls: [], clauses: [] };
    const like = { contains: q, mode: 'insensitive' as const };
    const [documents, controls, clauses] = await Promise.all([
      prisma.document.findMany({
        where: { OR: [{ title: like }, { documentId: like }] },
        select: { id: true, documentId: true, title: true, status: true },
        take: 25,
      }),
      prisma.annexAControl.findMany({
        where: { OR: [{ title: like }, { controlReference: like }] },
        select: { id: true, controlReference: true, title: true, theme: true },
        take: 25,
      }),
      prisma.clause.findMany({
        where: { OR: [{ title: like }, { clauseNumber: like }] },
        select: { id: true, clauseNumber: true, title: true },
        take: 25,
      }),
    ]);
    return { documents, controls, clauses };
  });
}
