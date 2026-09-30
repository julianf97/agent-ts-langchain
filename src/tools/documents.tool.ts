import { tool } from 'langchain';
import { z } from 'zod';
import { listDocuments } from '../api/documents.js';

export function createListDocumentsTool(token: string) {
  return tool(
    async ({ page }) => {
      const response = await listDocuments(token, page);

      return JSON.stringify(response);
    },
    {
      name: 'list_documents',
      description:
        'Consulta una página de documentos comerciales. Devuelve documentos, ' +
        'paginación y contexto con reglas de negocio. Para consultar todas las ' +
        'páginas, usar pagination.totalPages. Solo las OV con status pending ' +
        'pueden generar facturas.',
      schema: z.object({
        page: z
          .number()
          .int()
          .min(1)
          .describe('Número de página a consultar, comenzando por 1.'),
      }),
    },
  );
}