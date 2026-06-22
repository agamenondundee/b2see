// Exposes the non sensitive configuration the user interface needs: document types
// and prefixes, the classification scheme, review frequencies, roles and branding.

import type { FastifyInstance } from 'fastify';
import { defaults } from '../config';
import { requireAuth } from '../auth';

export function registerConfigRoutes(app: FastifyInstance): void {
  app.get('/api/config', { preHandler: requireAuth }, async () => ({
    branding: defaults.branding,
    documentTypes: Object.keys(defaults.documentTypePrefixes),
    documentTypePrefixes: defaults.documentTypePrefixes,
    classificationScheme: defaults.classificationScheme,
    reviewFrequenciesMonths: defaults.reviewFrequenciesMonths,
    defaultReviewFrequencyMonths: defaults.defaultReviewFrequencyMonths,
    roles: defaults.roles,
  }));
}
