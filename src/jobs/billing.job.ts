import { login } from '../api/auth.js';
import { createBillingAgent } from '../agents/billing.agent.js';
import { BILLING_BATCH_SIZE } from '../config/billing.js';

export async function runBillingJob(): Promise<void> {
  const token = await login();
  const agent = createBillingAgent(token);

  const result = await agent.invoke(
    {
      messages: [
        {
          role: 'user',
          content:
            `Consultá los documentos y creá ${BILLING_BATCH_SIZE} facturas ` +
            'desde OV pendientes diferentes. Completá el lote automáticamente, ' +
            'sin pedirme confirmación. Si no hay suficientes órdenes elegibles ' +
            'o una creación falla, informá el motivo y la cantidad creada.',
        },
      ],
    },
    {
      recursionLimit: 20 + BILLING_BATCH_SIZE * 4,
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