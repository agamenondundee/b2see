// Cloud.ax ISMS API server. Registers the plugins, loads the current user for every
// request, and mounts the module routes. All access control is enforced in the route
// handlers; this file only wires them together.

import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { env } from './config';
import { loadCurrentUser, registerAuthRoutes } from './auth';
import { registerDocumentRoutes } from './routes/documents';
import { registerFrameworkRoutes } from './routes/framework';
import { registerSoaRoutes } from './routes/soa';
import { registerRegisterRoutes } from './routes/registers';
import { registerDashboardRoutes } from './routes/dashboard';
import { registerAuditLogRoutes } from './routes/auditlog';
import { registerSearchRoutes } from './routes/search';
import { registerEvidenceRoutes } from './routes/evidence';
import { registerUserRoutes } from './routes/users';
import { registerConfigRoutes } from './routes/config';
import { startReviewScheduler } from './notifications';

const app = Fastify({ logger: true });

await app.register(cookie, { secret: env.sessionSecret });
await app.register(cors, { origin: env.corsOrigin, credentials: true });
await app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } });

// Resolve the current user (if any) before route level access control runs.
app.addHook('preHandler', loadCurrentUser);

app.get('/health', async () => ({ ok: true, service: 'cloud-ax-isms-api' }));

registerAuthRoutes(app);
registerDocumentRoutes(app);
registerFrameworkRoutes(app);
registerSoaRoutes(app);
registerRegisterRoutes(app);
registerDashboardRoutes(app);
registerAuditLogRoutes(app);
registerSearchRoutes(app);
registerEvidenceRoutes(app);
registerUserRoutes(app);
registerConfigRoutes(app);

try {
  await app.listen({ port: env.port, host: '0.0.0.0' });
  startReviewScheduler();
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
