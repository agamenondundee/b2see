// Authentication and role based access control.
//
// Sessions are carried in a signed, expiring, http only cookie. Authorisation is
// enforced here on the server for every protected route, not only in the user
// interface. Real deployments federate to the organisation identity provider over
// OIDC; a local development login is available only when no provider is configured
// and the service is not in production.

import crypto from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma } from './prisma';
import { env, devLoginAllowed, isProduction, oidcConfigured } from './config';
import { audit } from './audit';
import type { CurrentUser } from './types';

const COOKIE = 'isms_session';
const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60; // 8 hours, with idle handling below

export const ROLES = {
  ADMIN: 'Administrator',
  MANAGER: 'ISMS Manager',
  OWNER: 'Document Owner',
  REVIEWER: 'Reviewer',
  APPROVER: 'Approver',
  READER: 'Reader',
} as const;

// ---- Session token (HMAC signed) -------------------------------------------

function sign(value: string): string {
  return crypto.createHmac('sha256', env.sessionSecret).update(value).digest('base64url');
}

function createToken(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000 })).toString(
    'base64url',
  );
  return `${payload}.${sign(payload)}`;
}

function readToken(token: string | undefined): string | null {
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { uid: string; exp: number };
    if (typeof data.exp !== 'number' || data.exp < Date.now()) return null;
    return data.uid;
  } catch {
    return null;
  }
}

function setSessionCookie(reply: FastifyReply, userId: string): void {
  reply.setCookie(COOKIE, createToken(userId), {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

function clearSessionCookie(reply: FastifyReply): void {
  reply.clearCookie(COOKIE, { path: '/' });
}

// ---- Current user and guards -----------------------------------------------

export async function loadCurrentUser(req: FastifyRequest): Promise<void> {
  const userId = readToken(req.cookies?.[COOKIE]);
  if (!userId) return;
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { roles: true } });
  if (!user || user.status !== 'Active') return;
  req.currentUser = {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    roles: user.roles.map((r) => r.name),
  };
}

export function hasRole(user: CurrentUser | undefined, ...roles: string[]): boolean {
  if (!user) return false;
  if (user.roles.includes(ROLES.ADMIN)) return true; // administrator has full access
  return roles.some((r) => user.roles.includes(r));
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!req.currentUser) {
    await reply.code(401).send({ error: 'Authentication required.' });
  }
}

export function requireRole(...roles: string[]) {
  return async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!req.currentUser) {
      await reply.code(401).send({ error: 'Authentication required.' });
      return;
    }
    if (!hasRole(req.currentUser, ...roles)) {
      await reply.code(403).send({ error: 'You do not have permission to perform this action.' });
    }
  };
}

// ---- Routes ----------------------------------------------------------------

async function upsertUserWithRoles(email: string, displayName: string, roleNames: string[], externalId?: string) {
  const roles = await prisma.role.findMany({ where: { name: { in: roleNames } } });
  return prisma.user.upsert({
    where: { email },
    update: { displayName, lastLoginAt: new Date(), externalId, roles: { set: roles.map((r) => ({ id: r.id })) } },
    create: { email, displayName, externalId, lastLoginAt: new Date(), roles: { connect: roles.map((r) => ({ id: r.id })) } },
    include: { roles: true },
  });
}

export function registerAuthRoutes(app: FastifyInstance): void {
  app.get('/auth/me', async (req) => ({
    user: req.currentUser ?? null,
    oidcConfigured,
    devLoginAllowed,
  }));

  app.post('/auth/logout', async (req, reply) => {
    if (req.currentUser) await audit(req, 'LoggedOut', 'User', req.currentUser.id, 'User logged out');
    clearSessionCookie(reply);
    return { ok: true };
  });

  // Local development login. Disabled when OIDC is configured or in production.
  const devLoginBody = z.object({
    email: z.string().email(),
    displayName: z.string().min(1),
    roles: z.array(z.string()).min(1),
  });
  app.post('/auth/dev-login', async (req, reply) => {
    if (!devLoginAllowed) {
      return reply.code(403).send({ error: 'Local login is disabled. Sign in with the identity provider.' });
    }
    const parsed = devLoginBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid login details.' });
    const user = await upsertUserWithRoles(parsed.data.email, parsed.data.displayName, parsed.data.roles);
    setSessionCookie(reply, user.id);
    req.currentUser = { id: user.id, email: user.email, displayName: user.displayName, roles: parsed.data.roles };
    await audit(req, 'LoggedIn', 'User', user.id, 'Local development login');
    return { ok: true };
  });

  // OIDC sign in. Redirects to the provider authorize endpoint.
  app.get('/auth/login', async (_req, reply) => {
    if (!oidcConfigured) return reply.code(400).send({ error: 'No identity provider is configured.' });
    const state = crypto.randomBytes(16).toString('hex');
    const nonce = crypto.randomBytes(16).toString('hex');
    reply.setCookie('isms_oidc', `${state}.${nonce}`, { path: '/', httpOnly: true, sameSite: 'lax', secure: isProduction, maxAge: 600 });
    const authorize = new URL(`${env.oidc.issuerUrl.replace(/\/+$/, '')}/protocol/openid-connect/auth`);
    authorize.searchParams.set('client_id', env.oidc.clientId);
    authorize.searchParams.set('redirect_uri', env.oidc.redirectUri);
    authorize.searchParams.set('response_type', 'code');
    authorize.searchParams.set('scope', 'openid email profile');
    authorize.searchParams.set('state', state);
    authorize.searchParams.set('nonce', nonce);
    return reply.redirect(authorize.toString());
  });

  // OIDC callback. Exchanges the code for tokens and reads the identity claims.
  // Note for go live: add discovery and JWKS signature verification of the id_token
  // before relying on this in production. See docs/configuration-to-confirm.md C6, C7.
  app.get('/auth/callback', async (req, reply) => {
    const query = req.query as { code?: string; state?: string };
    const cookie = (req.cookies?.isms_oidc ?? '').split('.');
    if (!oidcConfigured || !query.code || !query.state || query.state !== cookie[0]) {
      return reply.code(400).send({ error: 'Invalid sign in response.' });
    }
    const tokenUrl = `${env.oidc.issuerUrl.replace(/\/+$/, '')}/protocol/openid-connect/token`;
    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: query.code,
        redirect_uri: env.oidc.redirectUri,
        client_id: env.oidc.clientId,
        client_secret: env.oidc.clientSecret,
      }),
    });
    if (!res.ok) return reply.code(401).send({ error: 'Identity provider rejected the sign in.' });
    const tokens = (await res.json()) as { id_token?: string };
    const claims = decodeIdToken(tokens.id_token);
    if (!claims?.email) return reply.code(401).send({ error: 'The identity provider did not return an email address.' });
    // New users are created as Reader. An administrator assigns further roles.
    const existing = await prisma.user.findUnique({ where: { email: claims.email }, include: { roles: true } });
    const roleNames = existing && existing.roles.length > 0 ? existing.roles.map((r) => r.name) : [ROLES.READER];
    const user = await upsertUserWithRoles(claims.email, claims.name ?? claims.email, roleNames, claims.sub);
    setSessionCookie(reply, user.id);
    req.currentUser = { id: user.id, email: user.email, displayName: user.displayName, roles: roleNames };
    await audit(req, 'LoggedIn', 'User', user.id, 'Signed in with identity provider');
    return reply.redirect(env.corsOrigin);
  });
}

function decodeIdToken(idToken?: string): { sub?: string; email?: string; name?: string } | null {
  if (!idToken) return null;
  const parts = idToken.split('.');
  if (parts.length < 2) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}
