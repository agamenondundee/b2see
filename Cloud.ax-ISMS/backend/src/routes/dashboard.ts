// Compliance dashboard aggregation: documents due and overdue for review, Statement
// of Applicability implementation status, open and overdue nonconformities, risk
// treatment status, coverage gaps and a recent activity feed.

import type { FastifyInstance } from 'fastify';
import { prisma } from '../prisma';
import { defaults } from '../config';
import { requireRole, ROLES } from '../auth';

const viewRoles = [ROLES.READER, ROLES.OWNER, ROLES.REVIEWER, ROLES.APPROVER, ROLES.MANAGER];

export function registerDashboardRoutes(app: FastifyInstance): void {
  app.get('/api/dashboard', { preHandler: requireRole(...viewRoles) }, async () => {
    const now = new Date();
    const dueWindow = new Date(now.getTime() + defaults.reviewDueWithinDays * 24 * 60 * 60 * 1000);

    const [documentsDue, documentsOverdue, soaEntries, nonconformities, risks, clausesWithMandatory, recentActivity] =
      await Promise.all([
        prisma.document.findMany({
          where: { status: 'Published', nextReviewDate: { gte: now, lte: dueWindow } },
          select: { id: true, documentId: true, title: true, nextReviewDate: true },
          orderBy: { nextReviewDate: 'asc' },
        }),
        prisma.document.findMany({
          where: { status: 'Published', nextReviewDate: { lt: now } },
          select: { id: true, documentId: true, title: true, nextReviewDate: true },
          orderBy: { nextReviewDate: 'asc' },
        }),
        prisma.soaEntry.findMany({ select: { applicable: true, implementationStatus: true } }),
        prisma.nonconformityEntry.findMany({ select: { id: true, status: true, dueDate: true } }),
        prisma.riskRegisterEntry.findMany({ select: { status: true, treatmentOption: true } }),
        prisma.clause.findMany({ where: { NOT: { mandatoryDocuments: { equals: [] } } }, include: { documents: { select: { id: true } } } }),
        prisma.auditLogEntry.findMany({ orderBy: { createdAt: 'desc' }, take: 12 }),
      ]);

    const soaByStatus: Record<string, number> = { NotStarted: 0, InProgress: 0, Implemented: 0, Verified: 0 };
    let applicable = 0;
    let excluded = 0;
    for (const e of soaEntries) {
      soaByStatus[e.implementationStatus] = (soaByStatus[e.implementationStatus] ?? 0) + 1;
      if (e.applicable === true) applicable += 1;
      if (e.applicable === false) excluded += 1;
    }

    const openNonconformities = nonconformities.filter((n) => n.status !== 'Closed');
    const overdueNonconformities = openNonconformities.filter((n) => n.dueDate && n.dueDate < now);

    const riskByStatus: Record<string, number> = {};
    for (const r of risks) riskByStatus[r.status] = (riskByStatus[r.status] ?? 0) + 1;

    const coverageGaps = clausesWithMandatory.filter((c) => c.documents.length === 0).length;

    return {
      reviews: { due: documentsDue, overdue: documentsOverdue },
      soa: { applicable, excluded, byStatus: soaByStatus },
      nonconformities: { open: openNonconformities.length, overdue: overdueNonconformities.length },
      risks: { total: risks.length, byStatus: riskByStatus },
      coverageGaps,
      recentActivity,
    };
  });
}
