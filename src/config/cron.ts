import cron from 'node-cron';

export const BILLING_CRON =
  process.env.BILLING_CRON?.trim() || '*/5 * * * *';

export const BILLING_TIMEZONE =
  process.env.BILLING_TIMEZONE?.trim() ||
  'America/Argentina/Buenos_Aires';

if (!cron.validate(BILLING_CRON)) {
  throw new Error('BILLING_CRON debe ser una expresión cron válida.');
}

try {
  new Intl.DateTimeFormat('es-AR', {
    timeZone: BILLING_TIMEZONE,
  }).format();
} catch {
  throw new Error('BILLING_TIMEZONE debe ser una zona horaria válida.');
}