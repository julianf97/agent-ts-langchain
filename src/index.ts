import 'dotenv/config';
import cron from 'node-cron';
import {
  BILLING_CRON,
  BILLING_TIMEZONE,
} from './config/cron.js';
import { runBillingJob } from './jobs/billing.job.js';

cron.schedule(
  BILLING_CRON,
  async () => {
    console.log(
      `[${new Date().toISOString()}] Iniciando lote de facturación...`,
    );

    try {
      await runBillingJob();

      console.log(
        `[${new Date().toISOString()}] Ejecución finalizada.`,
      );
    } catch (error: unknown) {
      console.error(
        `[${new Date().toISOString()}] Error en la ejecución:`,
        error instanceof Error ? error.message : error,
      );
    }
  },
  {
    timezone: BILLING_TIMEZONE,
    noOverlap: true,
  },
);

console.log('Agente de facturación programado.');
console.log(`Cron: ${BILLING_CRON}`);
console.log(`Zona horaria: ${BILLING_TIMEZONE}`);
console.log('Esperando la próxima ejecución. Para detenerlo, usá Ctrl+C.');