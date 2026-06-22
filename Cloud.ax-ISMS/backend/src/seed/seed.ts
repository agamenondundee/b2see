// Loads the reference data into the database: roles from configuration, the ISO/IEC
// 27001:2022 clauses, all 93 Annex A controls, and a starter Statement of
// Applicability with one row per control for the organisation to complete.
//
// Idempotent: every record is upserted by its natural key, so the seed can be run
// again safely after a schema or data update.

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { clauses } from './data/clauses';
import { annexAControls } from './data/annexa-controls';

const prisma = new PrismaClient();
const here = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(join(here, '../../../config/isms.defaults.json'), 'utf8'));

async function main(): Promise<void> {
  for (const name of config.roles as string[]) {
    await prisma.role.upsert({ where: { name }, update: {}, create: { name } });
  }

  for (const c of clauses) {
    const data = {
      title: c.title,
      description: c.description,
      mandatoryDocuments: c.mandatoryDocuments,
      isClimateConsideration: c.isClimateConsideration ?? false,
    };
    await prisma.clause.upsert({
      where: { clauseNumber: c.clauseNumber },
      update: data,
      create: { clauseNumber: c.clauseNumber, ...data },
    });
  }

  for (const ctrl of annexAControls) {
    const data = {
      title: ctrl.title,
      theme: ctrl.theme,
      controlTypes: ctrl.controlTypes,
      properties: ctrl.properties,
      concepts: ctrl.concepts,
    };
    const control = await prisma.annexAControl.upsert({
      where: { controlReference: ctrl.controlReference },
      update: data,
      create: { controlReference: ctrl.controlReference, ...data },
    });
    // Starter SoA row: applicability and justification left for the organisation.
    await prisma.soaEntry.upsert({
      where: { controlId: control.id },
      update: {},
      create: { controlId: control.id },
    });
  }

  const [roles, clauseCount, controlCount, soaCount] = await Promise.all([
    prisma.role.count(),
    prisma.clause.count(),
    prisma.annexAControl.count(),
    prisma.soaEntry.count(),
  ]);
  console.log(
    `Seed complete. Roles: ${roles}, clauses: ${clauseCount}, controls: ${controlCount}, Statement of Applicability rows: ${soaCount}.`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
