// Append only audit trail. Every create, edit, status change, download, export,
// permission change and login is recorded. There is no update or delete path for log
// entries anywhere in the API. In production the database role used by the
// application is granted insert and select only on the audit_log_entry table, so
// entries cannot be altered or removed. See docs/architecture.md.

import type { FastifyRequest } from 'fastify';
import { prisma } from './prisma';

export interface AuditInput {
  actorId?: string | null;
  actorLabel?: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary?: string;
  sourceIp?: string | null;
}

export async function writeAudit(input: AuditInput): Promise<void> {
  await prisma.auditLogEntry.create({
    data: {
      actorId: input.actorId ?? null,
      actorLabel: input.actorLabel ?? '',
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      summary: input.summary ?? '',
      sourceIp: input.sourceIp ?? null,
    },
  });
}

// Convenience that takes the actor and source IP from the request.
export async function audit(
  req: FastifyRequest,
  action: string,
  entityType: string,
  entityId?: string | null,
  summary = '',
): Promise<void> {
  const user = req.currentUser;
  await writeAudit({
    actorId: user?.id ?? null,
    actorLabel: user ? `${user.displayName} (${user.email})` : 'anonymous',
    action,
    entityType,
    entityId: entityId ?? null,
    summary,
    sourceIp: req.ip,
  });
}
