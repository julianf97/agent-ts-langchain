import { tool } from 'langchain';
import { z } from 'zod';
import { ApiError } from '../../api/api.client.js';
import type { ApiClient } from '../../api/api.client.js';
import type { Config } from '../../config/env.js';
import type { RunLog } from '../../logging/run-log.js';

export function createBillingTools(
  api: ApiClient,
  config: Config,
  log: RunLog,
) {
  let listed = false;
  const attempted = new Set<number>();

  const listDocuments = tool(
    async () => {
      if (!listed) {
        log.documents = await api.listDocuments(config.MAX_DOCUMENT_PAGES);
        listed = true;
        log.documentsListed = true;
      }
      // Solo datos necesarios: no se envían nombres ni textos libres al modelo.
      return {
        documents: log.documents,
        maxInvoices: config.MAX_INVOICES_PER_RUN,
      };
    },
    {
      name: 'list_documents',
      description:
        'Lista todos los documentos con id, type y status. Debe ejecutarse antes de facturar.',
      schema: z.object({}),
    },
  );

  const createInvoice = tool(
    async ({ documentId }) => {
      if (!listed) return { error: 'Primero ejecutá list_documents.' };
      const known = log.documents.find(
        (document) => document.id === documentId,
      );
      if (!known || known.type !== 'OV' || known.status !== 'pending') {
        return {
          error:
            'Solo se facturan órdenes OV pendientes presentes en el listado.',
        };
      }
      if (attempted.has(documentId))
        return { error: 'Ese documento ya fue intentado en esta ejecución.' };
      if (attempted.size >= config.MAX_INVOICES_PER_RUN)
        return { error: 'Se alcanzó el límite de esta ejecución.' };
      attempted.add(documentId);
      let issuing = false;
      try {
        const current = await api.getDocument(documentId);
        if (current.id !== documentId) throw new Error('Documento inesperado.');
        if (current.type !== 'OV' || current.status !== 'pending') {
          log.events.push({
            documentId,
            outcome: 'skipped',
            reason: 'El documento ya no es una OV pendiente.',
          });
          return { documentId, outcome: 'skipped' };
        }
        if (config.DRY_RUN) {
          log.events.push({ documentId, outcome: 'simulated' });
          return {
            documentId,
            outcome: 'simulated',
            number: `DEMO-OV-${documentId}`,
          };
        }
        issuing = true;
        const invoice = await api.createInvoice(documentId);
        if (invoice.documentId !== documentId)
          throw new Error('La API devolvió una factura de otro documento.');
        log.events.push({ documentId, outcome: 'created', invoice });
        return { documentId, outcome: 'created', invoice };
      } catch (error) {
        const uncertain =
          issuing && (!(error instanceof ApiError) || error.uncertain);
        const reason =
          error instanceof ApiError
            ? error.message
            : 'Respuesta inesperada de la API.';
        log.events.push({
          documentId,
          outcome: uncertain ? 'uncertain' : 'error',
          reason,
        });
        return {
          documentId,
          outcome: uncertain ? 'uncertain' : 'error',
          reason,
        };
      }
    },
    {
      name: 'create_invoice',
      description:
        'Factura una OV pendiente por documentId, o simula si DRY_RUN está activo. La API determina tipo fiscal e importe.',
      schema: z.object({ documentId: z.number().int().positive() }),
    },
  );

  return [listDocuments, createInvoice] as [
    typeof listDocuments,
    typeof createInvoice,
  ];
}
