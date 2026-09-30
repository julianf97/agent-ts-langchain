import 'dotenv/config';
import { login } from './api/auth.js';

async function main(): Promise<void> {
  await login();

  console.log('Login exitoso: conexión con api-agente confirmada.');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
