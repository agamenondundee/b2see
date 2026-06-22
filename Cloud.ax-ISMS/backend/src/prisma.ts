// Single shared Prisma client for the API process.

import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
