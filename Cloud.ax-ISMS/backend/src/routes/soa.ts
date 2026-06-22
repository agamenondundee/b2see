// Statement of Applicability: one row per Annex A control, with applicability,
// justification, implementation status, owner and the documents and risks that
// implement and are treated by the control. Includes summary counts and export to
// spreadsheet and PDF.

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../prisma';
import { audit } from '../audit';
import { requireRole, ROLES } from '../auth';
import { toXlsx, toPdf } from '../exports';

const viewRoles = [ROLES.READER, ROLES.OWNER, ROLES.REVIEWER, ROLES.APPROVER, ROLES.MANAGER];

const soaInclude = {
  control: true,
  documents: { select: { id: true, documentId: true, title: true } },
  risks: { select: { id: true, riskId: true, description: true } },
};

export function registerSoaRoutes(app: FastifyInstance): void {
  app.get('/api/soa', { preHandler: requireRole(...viewRoles) }, async () => {
    const entries = await prisma.soaEntry.findMany({ include: soaInclude, orderBy: { control: { controlReference: 'asc' } } });
    const applicable = entries.filter((e) => e.applicable === true).length;
    const excluded = entries.filter((e) => e.applicable === false).length;
    const undecided = entries.filter((e) => e.applicable === null).length;
    const byStatus: Record<string, number> = { NotStarted: 0, InProgress: 0, Implemented: 0, Verified: 0 };
    for (const e of entries) byStatus[e.implementationStatus] = (byStatus[e.implementationStatus] ?? 0) + 1;
    return { entries, summary: { applicable, excluded, undecided, byStatus } };
  });

  const updateBody = z.object({
    applicable: z.boolean().nullable().optional(),
    justification: z.string().optional(),
    implementationStatus: z.enum(['NotStarted', 'InProgress', 'Implemented', 'Verified']).optional(),
    controlOwner: z.string().optional(),
    documentIds: z.array(z.string()).optional(),
    riskIds: z.array(z.string()).optional(),
    lastReviewedAt: z.string().optional(),
  });
  app.patch('/api/soa/:id', { preHandler: requireRole(ROLES.MANAGER) }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = updateBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid Statement of Applicability update.' });
    const body = parsed.data;
    // Justification is mandatory once applicability is decided, for inclusion or exclusion.
    if (body.applicable !== undefined && body.applicable !== null) {
      const justification = body.justification ?? (await prisma.soaEntry.findUnique({ where: { id } }))?.justification ?? '';
      if (!justification.trim()) return reply.code(400).send({ error: 'A justification is required for both inclusion and exclusion.' });
    }
    const entry = await prisma.soaEntry.update({
      where: { id },
      data: {
        applicable: body.applicable,
        justification: body.justification,
        implementationStatus: body.implementationStatus,
        controlOwner: body.controlOwner,
        lastReviewedAt: body.lastReviewedAt ? new Date(body.lastReviewedAt) : undefined,
        documents: body.documentIds ? { set: body.documentIds.map((d) => ({ id: d })) } : undefined,
        risks: body.riskIds ? { set: body.riskIds.map((r) => ({ id: r })) } : undefined,
      },
      include: soaInclude,
    });
    await audit(req, 'Updated', 'SoaEntry', id, `Updated Statement of Applicability for ${entry.control.controlReference}`);
    return entry;
  });

  app.get('/api/soa/export.xlsx', { preHandler: requireRole(...viewRoles) }, async (req, reply) => {
    const entries = await prisma.soaEntry.findMany({ include: soaInclude, orderBy: { control: { controlReference: 'asc' } } });
    const rows = entries.map((e) => ({
      control: e.control.controlReference,
      title: e.control.title,
      theme: e.control.theme,
      applicable: e.applicable === null ? 'Undecided' : e.applicable ? 'Yes' : 'No',
      justification: e.justification,
      implementationStatus: e.implementationStatus,
      controlOwner: e.controlOwner,
      documents: e.documents.map((d) => d.documentId).join(', '),
      risks: e.risks.map((r) => r.riskId).join(', '),
      lastReviewed: e.lastReviewedAt ? e.lastReviewedAt.toISOString().slice(0, 10) : '',
    }));
    const buffer = await toXlsx('Statement of Applicability', [
      { header: 'Control', key: 'control', width: 10 },
      { header: 'Title', key: 'title', width: 40 },
      { header: 'Theme', key: 'theme', width: 16 },
      { header: 'Applicable', key: 'applicable', width: 12 },
      { header: 'Justification', key: 'justification', width: 50 },
      { header: 'Implementation status', key: 'implementationStatus', width: 20 },
      { header: 'Control owner', key: 'controlOwner', width: 20 },
      { header: 'Linked documents', key: 'documents', width: 30 },
      { header: 'Linked risks', key: 'risks', width: 20 },
      { header: 'Last reviewed', key: 'lastReviewed', width: 14 },
    ], rows);
    await audit(req, 'Exported', 'SoaEntry', null, 'Exported the Statement of Applicability to spreadsheet');
    reply.header('Content-Disposition', 'attachment; filename="statement-of-applicability.xlsx"');
    reply.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return reply.send(buffer);
  });

  app.get('/api/soa/export.pdf', { preHandler: requireRole(...viewRoles) }, async (req, reply) => {
    const entries = await prisma.soaEntry.findMany({ include: soaInclude, orderBy: { control: { controlReference: 'asc' } } });
    const lines = entries.map((e) => {
      const applicable = e.applicable === null ? 'Undecided' : e.applicable ? 'Applicable' : 'Excluded';
      return `${e.control.controlReference}  ${e.control.title}  [${applicable}, ${e.implementationStatus}]`;
    });
    const buffer = await toPdf('Statement of Applicability', [{ lines }]);
    await audit(req, 'Exported', 'SoaEntry', null, 'Exported the Statement of Applicability to PDF');
    reply.header('Content-Disposition', 'attachment; filename="statement-of-applicability.pdf"');
    reply.type('application/pdf');
    return reply.send(buffer);
  });
}
