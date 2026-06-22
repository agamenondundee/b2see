// Read only, filterable view of the append only audit trail, available to authorised
// roles. There is no route anywhere that updates or deletes a log entry.

import type { FastifyInstance } from 'fastify';
import { prisma } from '../prisma';
import { requireRole, ROLES } from '../auth';

export function registerAuditLogRoutes(app: FastifyInstance): void {
  app.get('/api/audit', { preHandler: requireRole(ROLES.MANAGER) }, async (req) => {
    const q = req.query as Record<string, string>;
    const where: Record<string, unknown> = {};
    if (q.entityType) where.entityType = q.entityType;
    if (q.actorId) where.actorId = q.actorId;
    if (q.action) where.action = q.action;
    if (q.from || q.to) {
      where.createdAt = {};
      if (q.from) (where.createdAt as Record<string, Date>).gte = new Date(q.from);
      if (q.to) (where.createdAt as Record<string, Date>).lte = new Date(q.to);
    }
    if (q.q) {
      where.OR = [
        { summary: { contains: q.q, mode: 'insensitive' } },
        { actorLabel: { contains: q.q, mode: 'insensitive' } },
      ];
    }
    const take = Math.min(Number(q.take ?? 200), 1000);
    return prisma.auditLogEntry.findMany({ where, orderBy: { createdAt: 'desc' }, take });
  });
}
