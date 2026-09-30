import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Document, Invoice } from '../api/api.schemas.js';

export interface RunEvent {
  documentId: number;
  outcome: 'created' | 'simulated' | 'skipped' | 'error' | 'uncertain';
  reason?: string;
  invoice?: Invoice;
}

export interface RunLog {
  id: string;
  startedAt: string;
  finishedAt?: string;
  dryRun: boolean;
  status: 'running' | 'completed' | 'partial' | 'failed';
  documentsListed: boolean;
  documents: Document[];
  events: RunEvent[];
  remainingDocumentIds: number[];
  error?: string;
}

export function createRunLog(dryRun: boolean): RunLog {
  return {
    id: randomUUID(),
    startedAt: new Date().toISOString(),
    dryRun,
    status: 'running',
    documentsListed: false,
    documents: [],
    events: [],
    remainingDocumentIds: [],
  };
}

export async function saveRunLog(directory: string, log: RunLog) {
  await mkdir(directory, { recursive: true });
  const file = join(directory, `${log.id}.json`);
  await writeFile(file, `${JSON.stringify(log, null, 2)}\n`, { mode: 0o600 });
  return file;
}
