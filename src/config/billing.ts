import 'dotenv/config';

const batchSize = Number(process.env.BILLING_BATCH_SIZE ?? '5');

if (!Number.isSafeInteger(batchSize) || batchSize < 1) {
  throw new Error('BILLING_BATCH_SIZE debe ser un entero mayor que 0');
}

export const BILLING_BATCH_SIZE = batchSize;