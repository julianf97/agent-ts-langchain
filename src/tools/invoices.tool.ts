import { tool } from 'langchain';
import { z } from 'zod';
import { createInvoice } from '../api/invoices.js';

export function createCreateInvoiceTool(token: string) {
  return tool(
    async ({ number, documentId }) => {
      const invoice = await createInvoice(token, {
        number,
        documentId,
      });

      return JSON.stringify(invoice);
    },
    {
      name: 'create_invoice',
      description:
        'Crea una factura desde una OV pendiente previamente consultada. ' +
        'Recibe el número único de la nueva factura y el ID de la orden. ' +
        'Para esta demo, usar DEMO-FAC-OV-{documentId} como número. ' +
        'La API calcula tipo, importe y datos del cliente, y marca la orden ' +
        'como invoiced. Cada orden admite una única factura.',
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