import { tool } from 'langchain';
import { z } from 'zod';
import { createInvoice } from '../api/invoices.js';
import { BILLING_BATCH_SIZE } from '../config/billing.js';

export function createCreateInvoiceTool(token: string) {
  const attemptedDocumentIds = new Set<number>();
  let stopped = false;

  return tool(
    async ({ number, documentId }) => {
      if (stopped) {
        return JSON.stringify({
          success: false,
          message: 'El lote se detuvo por un error. No intentes más creaciones.',
        });
      }

      if (attemptedDocumentIds.has(documentId)) {
        return JSON.stringify({
          success: false,
          documentId,
          message: 'Esta orden ya se intentó procesar en esta ejecución.',
        });
      }

      if (attemptedDocumentIds.size >= BILLING_BATCH_SIZE) {
        return JSON.stringify({
          success: false,
          message: 'Se alcanzó el máximo del lote. Finalizá la ejecución.',
        });
      }

      // Reservamos el lugar antes de enviar la solicitud.
      attemptedDocumentIds.add(documentId);

      try {
        const invoice = await createInvoice(token, {
          number,
          documentId,
        });

        return JSON.stringify({
          success: true,
          invoice,
          remaining: BILLING_BATCH_SIZE - attemptedDocumentIds.size,
        });
      } catch (error: unknown) {
        stopped = true;

        return JSON.stringify({
          success: false,
          documentId,
          message: error instanceof Error ? error.message : String(error),
          instruction: 'Informá el error y terminá sin reintentar.',
        });
      }
    },
    {
      name: 'create_invoice',
      description:
        'Crea una factura desde una OV pendiente previamente consultada. ' +
        'Recibe el número único de la nueva factura y el ID de la orden. ' +
        'Para esta demo, usar DEMO-FAC-OV-{documentId} como número. ' +
        'La API calcula tipo, importe y datos del cliente, y marca la orden ' +
        'como invoiced. Cada orden admite una única factura. ' +
        'Ejecutá las creaciones una por una, esperando cada resultado. ' +
        'Si success es true, remaining indica cuántas órdenes más pueden ' +
        'intentarse. Si remaining es 0 o la creación falla, terminá.',
      schema: z.object({
        number: z
          .string()
          .trim()
          .min(1)
          .max(255)
          .describe('Número único de factura, por ejemplo DEMO-FAC-OV-156.'),
        documentId: z
          .number()
          .int()
          .positive()
          .describe('ID de una orden consultada con type OV y status pending.'),
      }),
    },
  );
}