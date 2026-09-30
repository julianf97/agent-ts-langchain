import cron from 'node-cron';
import { loadConfig } from './config/env.js';
import { createBillingJob } from './jobs/billing.job.js';

async function main() {
  const config = loadConfig();
  const run = createBillingJob(config);
  if (process.argv.includes('--once')) {
    const log = await run();
    if (log?.status === 'failed' || log?.status === 'partial')
      process.exitCode = 1;
    return;
  }
  const task = cron.schedule(
    config.CRON_EXPRESSION,
    async () => {
      try {
        await run();
      } catch {
        console.error('No se pudo guardar el registro de ejecución.');
      }
    },
    { timezone: config.CRON_TIMEZONE, noOverlap: true },
  );
  console.log(
    `Agente iniciado. Cron: ${config.CRON_EXPRESSION}. Simulación: ${config.DRY_RUN}.`,
  );
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => {
      void task.stop();
      // Permite terminar la ejecución en curso; no inicia nuevas.
      console.log('Cron detenido.');
    });
  }
}

main().catch(() => {
  console.error(
    'No se pudo iniciar el agente. Revisá .env y el directorio de logs.',
  );
  process.exitCode = 1;
});
