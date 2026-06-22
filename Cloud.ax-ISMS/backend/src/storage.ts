// Document file storage. Files are held in object storage, with only metadata and a
// reference in the database. For production this uses S3 compatible object storage in
// a UK or EU region (env.storage). For local development, files are stored on the
// filesystem under ./data/storage so the application is runnable without cloud
// credentials. Replace the local branch with the S3 client at deployment time.

import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { env } from './config';

const LOCAL_ROOT = join(process.cwd(), 'data', 'storage');

export function storageConfigured(): boolean {
  return Boolean(env.storage.bucket && env.storage.endpoint);
}

export async function saveDocumentFile(key: string, data: Buffer): Promise<void> {
  const path = join(LOCAL_ROOT, key);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, data);
}

export async function readDocumentFile(key: string): Promise<Buffer> {
  const path = join(LOCAL_ROOT, key);
  return readFile(path);
}
