import 'dotenv/config';
import { login } from './api/auth.js';
import { createBillingAgent } from './agents/billing.agent.js';

async function main(): Promise<void> {
  const token = await login();
  const agent = createBillingAgent(token);

  const result = await agent.invoke(
    {
      messages: [
        {
          role: 'user',
          content:
            'Consultá los documentos y facturá como máximo una OV pendiente.',
        },
      ],
    },
    {
      recursionLimit: 20,
    },
  );

  for (const message of result.messages) {
    if ('tool_calls' in message) {
      console.dir(message.tool_calls, { depth: null });
    }
  }

  console.log('Resultado del agente:');
  console.dir(result.messages.at(-1)?.content, { depth: null });
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});