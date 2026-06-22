// User and role administration, available to administrators. Includes the access
// review export of users, roles and last login to support periodic access reviews.

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../prisma';
import { audit } from '../audit';
import { requireRole, ROLES } from '../auth';

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function registerUserRoutes(app: FastifyInstance): void {
  app.get('/api/users', { preHandler: requireRole(ROLES.ADMIN) }, async () =>
    prisma.user.findMany({ orderBy: { displayName: 'asc' }, include: { roles: { select: { name: true } } } }),
  );

  app.get('/api/roles', { preHandler: requireRole(ROLES.ADMIN, ROLES.MANAGER) }, async () =>
    prisma.role.findMany({ orderBy: { name: 'asc' } }),
  );

  const createBody = z.object({ email: z.string().email(), displayName: z.string().min(1), roles: z.array(z.string()) });
  app.post('/api/users', { preHandler: requireRole(ROLES.ADMIN) }, async (req, reply) => {
    const parsed = createBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid user details.' });
    const roles = await prisma.role.findMany({ where: { name: { in: parsed.data.roles } } });
    const user = await prisma.user.create({
      data: { email: parsed.data.email, displayName: parsed.data.displayName, roles: { connect: roles.map((r) => ({ id: r.id })) } },
      include: { roles: { select: { name: true } } },
    });
    await audit(req, 'Created', 'User', user.id, `Created user ${user.email}`);
    return reply.code(201).send(user);
  });

  const rolesBody = z.object({ roles: z.array(z.string()) });
  app.patch('/api/users/:id/roles', { preHandler: requireRole(ROLES.ADMIN) }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = rolesBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid roles.' });
    const roles = await prisma.role.findMany({ where: { name: { in: parsed.data.roles } } });
    const user = await prisma.user.update({
      where: { id },
      data: { roles: { set: roles.map((r) => ({ id: r.id })) } },
      include: { roles: { select: { name: true } } },
    });
    await audit(req, 'PermissionChanged', 'User', id, `Set roles for ${user.email} to ${parsed.data.roles.join(', ')}`);
    return user;
  });

  const statusBody = z.object({ status: z.enum(['Active', 'Disabled']) });
  app.patch('/api/users/:id/status', { preHandler: requireRole(ROLES.ADMIN) }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = statusBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid status.' });
    const user = await prisma.user.update({ where: { id }, data: { status: parsed.data.status } });
    await audit(req, 'PermissionChanged', 'User', id, `Set status for ${user.email} to ${parsed.data.status}`);
    return { ok: true };
  });

  app.get('/api/users/access-review.csv', { preHandler: requireRole(ROLES.ADMIN) }, async (req, reply) => {
    const users = await prisma.user.findMany({ orderBy: { displayName: 'asc' }, include: { roles: { select: { name: true } } } });
    const rows = ['Name,Email,Roles,Status,LastLogin'];
    for (const u of users) {
      rows.push(
        [u.displayName, u.email, u.roles.map((r) => r.name).join('; '), u.status, u.lastLoginAt?.toISOString().slice(0, 10) ?? 'never']
          .map((v) => csvCell(String(v)))
          .join(','),
      );
    }
    await audit(req, 'Exported', 'User', null, 'Exported the access review of users, roles and last login');
    reply.header('Content-Disposition', 'attachment; filename="access-review.csv"');
    reply.type('text/csv');
    return reply.send(rows.join('\n'));
  });
}
