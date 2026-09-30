import { ApiClient } from '../api/api.client.js';
import { createBillingAgent } from '../agent/billing.agent.js';
import { createBillingTools } from '../agent/tools/billing.tools.js';
import type { Config } from '../config/env.js';
import { createRunLog, saveRunLog } from '../logging/run-log.js';

export function createBillingJob(config: Config) {
  let running = false;
  return async function run() {
    if (running) {
      console.log('Ejecución omitida: el agente sigue trabajando.');
      return;
    }
    running = true;
    const log = createRunLog(config.DRY_RUN);
    try {
      // El archivo existe antes de enviar acciones: una interrupción deja status running.
      await saveRunLog(config.LOG_DIRECTORY, log);
      const signal = AbortSignal.timeout(config.RUN_TIMEOUT_MS);
      const api = new ApiClient(
        {
          baseUrl: config.API_BASE_URL,
          email: config.API_EMAIL,
          password: config.API_PASSWORD,
          timeoutMs: config.API_TIMEOUT_MS,
        },
        signal,
      );
      const tools = createBillingTools(api, config, log);
      const agent = createBillingAgent(config, tools);
      await agent.invoke(
        {
          messages: [
            {
              role: 'user',
              content: 'Ejecutá el proceso de facturación programado.',
            },
          ],
        },
        {
          signal,
          recursionLimit: config.MAX_INVOICES_PER_RUN * 4 + 12,
        },
      );
      if (!log.documentsListed)
        throw new Error('El agente no consultó documentos.');
      log.status = 'completed';
    } catch {
      log.status = 'failed';
      log.error =
        'La ejecución falló. Revisá la conexión HTTP, las credenciales, cuota de OpenAI y configuración.';
    } finally {
      const processed = new Set(log.events.map((event) => event.documentId));
      log.remainingDocumentIds = log.documents
        .filter(
          (document) =>
            document.type === 'OV' &&
            document.status === 'pending' &&
            !processed.has(document.id),
        )
        .map((document) => document.id);
      if (
        log.status !== 'failed' &&
        (log.remainingDocumentIds.length ||
          log.events.some((event) =>
            ['error', 'uncertain'].includes(event.outcome),
          ))
      ) {
        log.status = 'partial';
      }
      log.finishedAt = new Date().toISOString();
      try {
        const file = await saveRunLog(config.LOG_DIRECTORY, log);
        console.log(
          JSON.stringify({
            runId: log.id,
            status: log.status,
            dryRun: log.dryRun,
            events: log.events,
            logFile: file,
          }),
        );
      } finally {
        running = false;
      }
    }
    return log;
  };
}
