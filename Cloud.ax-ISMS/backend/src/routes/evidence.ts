// Evidence pack generation. For a chosen clause, control, theme or the whole ISMS,
// produces a zip archive of the relevant current document versions plus a manifest
// listing each item, its version, owner and approval date. This is the priority
// feature for surveillance and recertification audits.

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../prisma';
import { audit } from '../audit';
import { requireRole, ROLES } from '../auth';
import { buildZip, toPdf, type ZipEntry } from '../exports';
import { readDocumentFile } from '../storage';

const viewRoles = [ROLES.READER, ROLES.OWNER, ROLES.REVIEWER, ROLES.APPROVER, ROLES.MANAGER];

const documentSelect = {
  id: true,
  documentId: true,
  title: true,
  lastApprovedAt: true,
  owner: { select: { displayName: true } },
  currentVersion: { select: { versionNumber: true, fileReference: true, fileName: true, publishedAt: true } },
};

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function registerEvidenceRoutes(app: FastifyInstance): void {
  const body = z.object({
    scopeType: z.enum(['clause', 'control', 'theme', 'all']),
    scopeId: z.string().optional(),
  });

  app.post('/api/evidence-pack', { preHandler: requireRole(...viewRoles) }, async (req, reply) => {
    const parsed = body.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid evidence pack request.' });
    const { scopeType, scopeId } = parsed.data;

    let documents: Array<Record<string, unknown>> = [];
    let scopeLabel = 'Whole ISMS';
    if (scopeType === 'clause' && scopeId) {
      const clause = await prisma.clause.findUnique({ where: { id: scopeId }, include: { documents: { select: documentSelect } } });
      documents = clause?.documents ?? [];
      scopeLabel = clause ? `Clause ${clause.clauseNumber} ${clause.title}` : 'Clause';
    } else if (scopeType === 'control' && scopeId) {
      const control = await prisma.annexAControl.findUnique({ where: { id: scopeId }, include: { documents: { select: documentSelect } } });
      documents = control?.documents ?? [];
      scopeLabel = control ? `Control ${control.controlReference} ${control.title}` : 'Control';
    } else if (scopeType === 'theme' && scopeId) {
      const controls = await prisma.annexAControl.findMany({ where: { theme: scopeId as never }, include: { documents: { select: documentSelect } } });
      const seen = new Map<string, Record<string, unknown>>();
      for (const c of controls) for (const d of c.documents) seen.set(d.id as string, d);
      documents = [...seen.values()];
      scopeLabel = `Theme ${scopeId}`;
    } else {
      documents = await prisma.document.findMany({ where: { status: 'Published' }, select: documentSelect });
    }

    const entries: ZipEntry[] = [];
    const manifestRows: string[] = ['Reference,Title,Version,Owner,Approved,File'];
    const manifestLines: string[] = [];
    for (const d of documents) {
      const current = d.currentVersion as { versionNumber?: string; fileReference?: string; fileName?: string; publishedAt?: Date } | null;
      const owner = (d.owner as { displayName?: string } | null)?.displayName ?? '';
      const approved = (current?.publishedAt ?? (d.lastApprovedAt as Date | null))?.toISOString().slice(0, 10) ?? '';
      const version = current?.versionNumber ?? 'unpublished';
      let fileEntry = 'none';
      if (current?.fileReference) {
        try {
          const data = await readDocumentFile(current.fileReference);
          const name = `documents/${d.documentId}-v${version}-${current.fileName ?? 'document'}`;
          entries.push({ name, data });
          fileEntry = name;
        } catch {
          fileEntry = 'file missing';
        }
      }
      manifestRows.push([d.documentId, d.title, version, owner, approved, fileEntry].map((v) => csvCell(String(v))).join(','));
      manifestLines.push(`${d.documentId}  ${d.title as string}  v${version}  owner ${owner}  approved ${approved}`);
    }

    entries.unshift({ name: 'manifest.csv', data: Buffer.from(manifestRows.join('\n'), 'utf8') });
    const manifestPdf = await toPdf('Evidence pack manifest', [
      { lines: [`Scope: ${scopeLabel}`, `Generated: ${new Date().toISOString().slice(0, 10)}`, `Items: ${documents.length}`] },
      { heading: 'Documents', lines: manifestLines.length ? manifestLines : ['No documents are linked to this scope yet.'] },
    ]);
    entries.unshift({ name: 'manifest.pdf', data: manifestPdf });

    const zip = await buildZip(entries);
    await audit(req, 'Exported', 'EvidencePack', scopeId ?? null, `Generated an evidence pack for ${scopeLabel} (${documents.length} documents)`);
    reply.header('Content-Disposition', 'attachment; filename="evidence-pack.zip"');
    reply.type('application/zip');
    return reply.send(zip);
  });
}
