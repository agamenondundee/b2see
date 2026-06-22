// Loads configuration: the organisation defaults from config/isms.defaults.json and
// environment values from .env. Nothing organisation specific is hard coded here.

import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

export interface IsmsDefaults {
  branding: { organisationName: string; productName: string; primaryColour: string };
  documentTypePrefixes: Record<string, string>;
  classificationScheme: string[];
  defaultClassification: string;
  reviewFrequenciesMonths: number[];
  defaultReviewFrequencyMonths: number;
  reviewDueWithinDays: number;
  roles: string[];
  dataResidency: { allowedRegions: string[] };
  notifications: { email: { enabled: boolean }; teams: { enabled: boolean; webhookUrl: string } };
}

export const defaults: IsmsDefaults = JSON.parse(
  readFileSync(join(here, '../../config/isms.defaults.json'), 'utf8'),
);

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  sessionSecret: process.env.SESSION_SECRET ?? 'development-only-secret-change-me',
  databaseUrl: process.env.DATABASE_URL ?? '',
  oidc: {
    issuerUrl: process.env.OIDC_ISSUER_URL ?? '',
    clientId: process.env.OIDC_CLIENT_ID ?? '',
    clientSecret: process.env.OIDC_CLIENT_SECRET ?? '',
    redirectUri: process.env.OIDC_REDIRECT_URI ?? '',
  },
  storage: {
    endpoint: process.env.STORAGE_ENDPOINT ?? '',
    region: process.env.STORAGE_REGION ?? '',
    bucket: process.env.STORAGE_BUCKET ?? '',
    accessKeyId: process.env.STORAGE_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY ?? '',
  },
  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER ?? '',
    password: process.env.SMTP_PASSWORD ?? '',
    from: process.env.SMTP_FROM ?? 'isms@example.org',
  },
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
};

export const isProduction = env.nodeEnv === 'production';

// Dev login is available only when no OIDC provider is configured and we are not in
// production. Real deployments federate to the identity provider over OIDC.
export const oidcConfigured = Boolean(env.oidc.issuerUrl && env.oidc.clientId);
export const devLoginAllowed = !oidcConfigured && !isProduction;
