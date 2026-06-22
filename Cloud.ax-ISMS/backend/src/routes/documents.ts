// Document repository: create, read, update and retire documents; manage versions
// (immutable once published); drive the lifecycle and approval workflow; and upload
// and download version files. Access control and audit logging are enforced here.

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../prisma';
import { defaults } from '../config';
import { audit } from '../audit';
import { requireRole, ROLES, hasRole } from '../auth';
import { TRANSITIONS, generateDocumentReference, prefixForType, nextReviewDate } from '../lifecycle';
import { saveDocumentFile, readDocumentFile } from '../storage';

const DOCUMENT_TYPES = Object.keys(defaults.documentTypePrefixes);
const ACTIVE_VERSION_STATES = ['Draft', 'InReview', 'Approved'];

function bumpVersion(current: string): string {
  const [major, minor] = current.split('.');
  return `${major ?? '1'}.${(Number(minor ?? '0') || 0) + 1}`;
}

const detailInclude = {
  owner: { select: { id: true, displayName: true, email: true } },
  approver: { select: { id: true, displayName: true, email: true } },
  author: { select: { id: true, displayName: true, email: true } },
  currentVersion: true,
  versions: { orderBy: { createdAt: 'desc' as const } },
  clauses: { select: { id: true, clauseNumber: true, title: true } },
  controls: { select: { id: true, controlReference: true, title: true } },
  relatedTo: { select: { id: true, documentId: true, title: true } },
};

export function registerDocumentRoutes(app: FastifyInstance): void {
  // List with filters.
  app.get('/api/documents', { preHandler: requireRole(ROLES.READER, ROLES.OWNER, ROLES.REVIEWER, ROLES.APPROVER, ROLES.MANAGER) }, async (req) => {
    const q = req.query as Record<string, string>;
    const where: Record<string, unknown> = {};
    if (q.type) where.documentType = q.type;
    if (q.status) where.status = q.status;
    if (q.classification) where.classification = q.classification;
    if (q.ownerId) where.ownerId = q.ownerId;
    if (q.clauseId) where.clauses = { some: { id: q.clauseId } };
    if (q.controlId) where.controls = { some: { id: q.controlId } };
    if (q.overdue === 'true') where.nextReviewDate = { lt: new Date() };
    if (q.dueBefore) where.nextReviewDate = { lte: new Date(q.dueBefore) };
    if (q.q) {
      where.OR = [
        { title: { contains: q.q, mode: 'insensitive' } },
        { documentId: { contains: q.q, mode: 'insensitive' } },
      ];
    }
    return prisma.document.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: { owner: { select: { displayName: true } }, currentVersion: { select: { versionNumber: true } } },
    });
  });

  // Detail.
  app.get('/api/documents/:id', { preHandler: requireRole(ROLES.READER, ROLES.OWNER, ROLES.REVIEWER, ROLES.APPROVER, ROLES.MANAGER) }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const doc = await prisma.document.findUnique({ where: { id }, include: detailInclude });
    if (!doc) return reply.code(404).send({ error: 'Document not found.' });
    return doc;
  });

  // Create. The first version (1.0, Draft) is created with the document.
  const createBody = z.object({
    title: z.string().min(1),
    documentType: z.enum(DOCUMENT_TYPES as [string, ...string[]]),
    classification: z.enum(defaults.classificationScheme as [string, ...string[]]),
    documentId: z.string().optional(),
    ownerId: z.string().optional(),
    approverId: z.string().optional(),
    reviewFrequencyMonths: z.number().int().positive().optional(),
    clauseIds: z.array(z.string()).optional(),
    controlIds: z.array(z.string()).optional(),
    relatedIds: z.array(z.string()).optional(),
  });
  app.post('/api/documents', { preHandler: requireRole(ROLES.OWNER, ROLES.MANAGER) }, async (req, reply) => {
    const parsed = createBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid document details.', detail: parsed.error.issues });
    const body = parsed.data;

    let reference = body.documentId;
    if (reference) {
      const prefix = prefixForType(body.documentType);
      if (!reference.startsWith(`${prefix}-`)) {
        return reply.code(400).send({ error: `Reference must begin with ${prefix}- for a ${body.documentType}.` });
      }
    } else {
      reference = await generateDocumentReference(body.documentType);
    }

    const actorId = req.currentUser!.id;
    const doc = await prisma.document.create({
      data: {
        documentId: reference,
        title: body.title,
        documentType: body.documentType as never,
        classification: body.classification,
        status: 'Draft',
        reviewFrequencyMonths: body.reviewFrequencyMonths ?? defaults.defaultReviewFrequencyMonths,
        ownerId: body.ownerId ?? actorId,
        approverId: body.approverId,
        authorId: actorId,
        clauses: body.clauseIds ? { connect: body.clauseIds.map((id) => ({ id })) } : undefined,
        controls: body.controlIds ? { connect: body.controlIds.map((id) => ({ id })) } : undefined,
        relatedTo: body.relatedIds ? { connect: body.relatedIds.map((id) => ({ id })) } : undefined,
        versions: { create: { versionNumber: '1.0', status: 'Draft', authorId: actorId } },
      },
      include: detailInclude,
    });
    await audit(req, 'Created', 'Document', doc.id, `Created ${doc.documentId}: ${doc.title}`);
    return reply.code(201).send(doc);
  });

  // Update metadata and links.
  const updateBody = z.object({
    title: z.string().min(1).optional(),
    classification: z.enum(defaults.classificationScheme as [string, ...string[]]).optional(),
    ownerId: z.string().nullable().optional(),
    approverId: z.string().nullable().optional(),
    reviewFrequencyMonths: z.number().int().positive().optional(),
    clauseIds: z.array(z.string()).optional(),
    controlIds: z.array(z.string()).optional(),
    relatedIds: z.array(z.string()).optional(),
  });
  app.patch('/api/documents/:id', { preHandler: requireRole(ROLES.OWNER, ROLES.MANAGER) }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = updateBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid update.', detail: parsed.error.issues });
    const body = parsed.data;
    const doc = await prisma.document.update({
      where: { id },
      data: {
        title: body.title,
        classification: body.classification,
        ownerId: body.ownerId,
        approverId: body.approverId,
        reviewFrequencyMonths: body.reviewFrequencyMonths,
        clauses: body.clauseIds ? { set: body.clauseIds.map((c) => ({ id: c })) } : undefined,
        controls: body.controlIds ? { set: body.controlIds.map((c) => ({ id: c })) } : undefined,
        relatedTo: body.relatedIds ? { set: body.relatedIds.map((c) => ({ id: c })) } : undefined,
      },
      include: detailInclude,
    });
    await audit(req, 'Updated', 'Document', doc.id, `Updated ${doc.documentId}`);
    return doc;
  });

  // Lifecycle transition.
  const transitionBody = z.object({ action: z.enum(['submit', 'review', 'publish', 'startRevision', 'retire']), comment: z.string().optional() });
  app.post('/api/documents/:id/transition', { preHandler: requireRole(ROLES.OWNER, ROLES.REVIEWER, ROLES.APPROVER, ROLES.MANAGER) }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = transitionBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid transition.' });
    const { action, comment } = parsed.data;
    const transition = TRANSITIONS[action];

    const doc = await prisma.document.findUnique({ where: { id }, include: { versions: true } });
    if (!doc) return reply.code(404).send({ error: 'Document not found.' });
    if (!transition.from.includes(doc.status as never)) {
      return reply.code(409).send({ error: `Cannot ${action} a document that is ${doc.status}.` });
    }
    if (!hasRole(req.currentUser, ...transition.roles)) {
      return reply.code(403).send({ error: 'You do not have permission for this transition.' });
    }
    // Segregation of duties: the author cannot be the sole approver of their own document.
    if (action === 'publish' && doc.authorId === req.currentUser!.id && !req.currentUser!.roles.includes(ROLES.ADMIN)) {
      return reply.code(403).send({ error: 'The author of a document cannot publish it. A separate approver is required.' });
    }

    const active = doc.versions.find((v) => ACTIVE_VERSION_STATES.includes(v.status));

    if (action === 'submit' && active) {
      await prisma.version.update({ where: { id: active.id }, data: { status: 'InReview' } });
    } else if (action === 'review' && active) {
      await prisma.version.update({ where: { id: active.id }, data: { status: 'Approved' } });
    } else if (action === 'publish' && active) {
      if (doc.currentVersionId) {
        await prisma.version.update({ where: { id: doc.currentVersionId }, data: { status: 'Superseded' } });
      }
      const now = new Date();
      await prisma.version.update({
        where: { id: active.id },
        data: { status: 'Published', approverId: req.currentUser!.id, approvedAt: now, publishedAt: now },
      });
      await prisma.document.update({
        where: { id },
        data: { currentVersionId: active.id, lastApprovedAt: now, nextReviewDate: nextReviewDate(now, doc.reviewFrequencyMonths) },
      });
    } else if (action === 'startRevision') {
      const base = doc.currentVersion ? doc.currentVersion.versionNumber : '1.0';
      await prisma.version.create({ data: { documentId: id, versionNumber: bumpVersion(base), status: 'Draft', authorId: req.currentUser!.id } });
    }

    const updated = await prisma.document.update({ where: { id }, data: { status: transition.to as never }, include: detailInclude });
    await audit(req, 'StatusChanged', 'Document', id, `${action} to ${transition.to}${comment ? `: ${comment}` : ''}`);
    return updated;
  });

  // Upload a file to the active (not yet published) version.
  app.post('/api/documents/:id/versions/:versionId/file', { preHandler: requireRole(ROLES.OWNER, ROLES.MANAGER) }, async (req, reply) => {
    const { id, versionId } = req.params as { id: string; versionId: string };
    const file = await (req as unknown as { file: () => Promise<{ filename: string; toBuffer: () => Promise<Buffer> } | undefined> }).file();
    if (!file) return reply.code(400).send({ error: 'No file was provided.' });
    const version = await prisma.version.findUnique({ where: { id: versionId } });
    if (!version || version.documentId !== id) return reply.code(404).send({ error: 'Version not found.' });
    if (version.status === 'Published' || version.status === 'Superseded') {
      return reply.code(409).send({ error: 'Published and superseded versions are immutable.' });
    }
    const key = `${id}/${versionId}/${file.filename}`;
    await saveDocumentFile(key, await file.toBuffer());
    await prisma.version.update({ where: { id: versionId }, data: { fileReference: key, fileName: file.filename } });
    await audit(req, 'FileUploaded', 'Version', versionId, `Uploaded ${file.filename}`);
    return { ok: true, fileName: file.filename };
  });

  // Download any version file, current or historical.
  app.get('/api/documents/:id/versions/:versionId/file', { preHandler: requireRole(ROLES.READER, ROLES.OWNER, ROLES.REVIEWER, ROLES.APPROVER, ROLES.MANAGER) }, async (req, reply) => {
    const { id, versionId } = req.params as { id: string; versionId: string };
    const version = await prisma.version.findUnique({ where: { id: versionId } });
    if (!version || version.documentId !== id || !version.fileReference) {
      return reply.code(404).send({ error: 'No file is stored for this version.' });
    }
    const data = await readDocumentFile(version.fileReference);
    await audit(req, 'Downloaded', 'Version', versionId, `Downloaded ${version.fileName ?? version.fileReference}`);
    reply.header('Content-Disposition', `attachment; filename="${version.fileName ?? 'document'}"`);
    reply.type('application/octet-stream');
    return reply.send(data);
  });
}
