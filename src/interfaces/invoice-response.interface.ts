import type { ApiContext } from './api-context.interface.js';

export interface InvoiceResponse {
  id: number;
  number: string;
  documentId: number;
  clientId: number;
  userId: number;
  type: 'A' | 'B' | 'E';
  customerName: string;
  customerTaxId: string;
  customerTaxCondition: string | null;
  customerCountry: string;
  customerAddress: string;
  amount: string;
  status: 'draft' | 'issued' | 'paid' | 'cancelled';
  issuedAt: string | null;
  createdAt: string;
  updatedAt: string;
  context: ApiContext;
}