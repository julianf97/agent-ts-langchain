import 'dotenv/config';
import cron from 'node-cron';
import { z } from 'zod';

const positiveInteger = (fallback: number, maximum: number) =>
  z.coerce.number().int().positive().max(maximum).default(fallback);

const environmentSchema = z.object({
  OPENAI_API_KEY: z.string().trim().min(1),
  OPENAI_MODEL: z.string().trim().min(1).default('gpt-4.1-mini'),
  API_BASE_URL: z.url().refine((value) => {
    const url = new URL(value);
    return (
      ['http:', 'https:'].includes(url.protocol) &&
      !url.username &&
      !url.password
    );
  }, 'Usá una URL HTTP sin credenciales.'),
  API_EMAIL: z.email(),
  API_PASSWORD: z.string().min(1),
  API_TIMEOUT_MS: positiveInteger(15_000, 120_000),
  CRON_EXPRESSION: z.string().default('*/1 * * * *').refine(cron.validate),
  CRON_TIMEZONE: z
    .string()
    .default('America/Argentina/Buenos_Aires')
    .refine((value) => {
      try {
        new Intl.DateTimeFormat('es-AR', { timeZone: value });
        return true;
      } catch {
        return false;
      }
    }, 'Zona horaria inválida.'),
  DRY_RUN: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  MAX_INVOICES_PER_RUN: positiveInteger(10, 25),
  MAX_DOCUMENT_PAGES: positiveInteger(10, 100),
  RUN_TIMEOUT_MS: positiveInteger(180_000, 600_000),
  LOG_DIRECTORY: z.string().min(1).default('logs'),
});

export function loadConfig(environment: NodeJS.ProcessEnv = process.env) {
  const result = environmentSchema.safeParse(environment);
  if (!result.success) {
    const fields = result.error.issues.map((issue) => issue.path.join('.'));
    throw new Error(
      `Revisá estas variables de .env: ${[...new Set(fields)].join(', ')}.`,
    );
  }
  return result.data;
}

export type Config = ReturnType<typeof loadConfig>;
