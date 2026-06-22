// The nine core registers. Each is a structured register with list, create, update,
// delete and export, served through one set of routes keyed by register name. Risk
// entries compute their inherent and residual scores and can link to Annex A controls.

import type { FastifyInstance } from 'fastify';
import { prisma } from '../prisma';
import { audit } from '../audit';
import { requireRole, ROLES } from '../auth';
import { toXlsx } from '../exports';
import { score } from '../lifecycle';

interface RegisterDef {
  model: string;
  label: string;
  dateFields: string[];
}

const REGISTERS: Record<string, RegisterDef> = {
  risk: { model: 'riskRegisterEntry', label: 'Risk register', dateFields: ['reviewDate'] },
  asset: { model: 'assetRegisterEntry', label: 'Asset register', dateFields: ['reviewDate'] },
  supplier: { model: 'supplierRegisterEntry', label: 'Supplier and sub-processor register', dateFields: ['reviewDate'] },
  nonconformity: { model: 'nonconformityEntry', label: 'Nonconformity and corrective action register', dateFields: ['dueDate', 'closedDate'] },
  'internal-audit': { model: 'internalAuditEntry', label: 'Internal audit register', dateFields: ['auditDate'] },
  'management-review': { model: 'managementReviewEntry', label: 'Management review log', dateFields: ['reviewDate'] },
  competence: { model: 'competenceTrainingEntry', label: 'Competence and training register', dateFields: ['completedDate'] },
  legal: { model: 'legalRegisterEntry', label: 'Legal and regulatory register', dateFields: ['reviewDate'] },
  context: { model: 'contextRegisterEntry', label: 'Context and interested parties register', dateFields: [] },
};

const viewRoles = [ROLES.READER, ROLES.OWNER, ROLES.REVIEWER, ROLES.APPROVER, ROLES.MANAGER];

// eslint compatibility is not relevant here; the Prisma client is accessed by model
// name, so a typed index is used.
const client = prisma as unknown as Record<string, {
  findMany: (args?: unknown) => Promise<Record<string, unknown>[]>;
  create: (args: unknown) => Promise<Record<string, unknown>>;
  update: (args: unknown) => Promise<Record<string, unknown>>;
  delete: (args: unknown) => Promise<unknown>;
}>;

function coerceDates(def: RegisterDef, body: Record<string, unknown>): Record<string, unknown> {
  const out = { ...body };
  for (const field of def.dateFields) {
    if (typeof out[field] === 'string' && out[field]) out[field] = new Date(out[field] as string);
  }
  delete out.id;
  delete out.controlIds;
  return out;
}

function riskScores(body: Record<string, unknown>): Record<string, unknown> {
  return {
    inherentScore: score(body.likelihood as number, body.impact as number),
    residualScore: score(body.residualLikelihood as number, body.residualImpact as number),
  };
}

export function registerRegisterRoutes(app: FastifyInstance): void {
  app.get('/api/registers/:register', { preHandler: requireRole(...viewRoles) }, async (req, reply) => {
    const { register } = req.params as { register: string };
    const def = REGISTERS[register];
    if (!def) return reply.code(404).send({ error: 'Unknown register.' });
    const include = register === 'risk' ? { controls: { select: { id: true, controlReference: true } } } : undefined;
    return client[def.model].findMany({ orderBy: { createdAt: 'desc' }, include });
  });

  app.post('/api/registers/:register', { preHandler: requireRole(ROLES.MANAGER) }, async (req, reply) => {
    const { register } = req.params as { register: string };
    const def = REGISTERS[register];
    if (!def) return reply.code(404).send({ error: 'Unknown register.' });
    const body = req.body as Record<string, unknown>;
    const data = coerceDates(def, body);
    if (register === 'risk') {
      Object.assign(data, riskScores(body));
      if (Array.isArray(body.controlIds)) data.controls = { connect: (body.controlIds as string[]).map((id) => ({ id })) };
    }
    const created = await client[def.model].create({ data });
    await audit(req, 'Created', def.label, created.id as string, `Created an entry in the ${def.label}`);
    return reply.code(201).send(created);
  });

  app.patch('/api/registers/:register/:id', { preHandler: requireRole(ROLES.MANAGER) }, async (req, reply) => {
    const { register, id } = req.params as { register: string; id: string };
    const def = REGISTERS[register];
    if (!def) return reply.code(404).send({ error: 'Unknown register.' });
    const body = req.body as Record<string, unknown>;
    const data = coerceDates(def, body);
    if (register === 'risk') {
      Object.assign(data, riskScores(body));
      if (Array.isArray(body.controlIds)) data.controls = { set: (body.controlIds as string[]).map((cid) => ({ id: cid })) };
    }
    const updated = await client[def.model].update({ where: { id }, data });
    await audit(req, 'Updated', def.label, id, `Updated an entry in the ${def.label}`);
    return updated;
  });

  app.delete('/api/registers/:register/:id', { preHandler: requireRole(ROLES.MANAGER) }, async (req, reply) => {
    const { register, id } = req.params as { register: string; id: string };
    const def = REGISTERS[register];
    if (!def) return reply.code(404).send({ error: 'Unknown register.' });
    await client[def.model].delete({ where: { id } });
    await audit(req, 'Deleted', def.label, id, `Deleted an entry from the ${def.label}`);
    return { ok: true };
  });

  app.get('/api/registers/:register/export.xlsx', { preHandler: requireRole(...viewRoles) }, async (req, reply) => {
    const { register } = req.params as { register: string };
    const def = REGISTERS[register];
    if (!def) return reply.code(404).send({ error: 'Unknown register.' });
    const rows = await client[def.model].findMany({ orderBy: { createdAt: 'asc' } });
    const keys = new Set<string>();
    for (const row of rows) for (const k of Object.keys(row)) if (!['id', 'createdAt', 'updatedAt'].includes(k)) keys.add(k);
    const columns = [...keys].map((k) => ({ header: k, key: k, width: 24 }));
    const flat = rows.map((r) => {
      const o: Record<string, unknown> = {};
      for (const k of keys) o[k] = r[k] instanceof Date ? (r[k] as Date).toISOString().slice(0, 10) : r[k];
      return o;
    });
    const buffer = await toXlsx(def.label, columns, flat);
    await audit(req, 'Exported', def.label, null, `Exported the ${def.label} to spreadsheet`);
    reply.header('Content-Disposition', `attachment; filename="${register}-register.xlsx"`);
    reply.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return reply.send(buffer);
  });
}
