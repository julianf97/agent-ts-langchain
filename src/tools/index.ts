import { createListDocumentsTool } from './documents.tool.js';
import { createCreateInvoiceTool } from './invoices.tool.js';

export function createAgentTools(token: string) {
  return [
    createListDocumentsTool(token),
    createCreateInvoiceTool(token),
  ];
}