import type { CreateInvoiceRequest } from '../interfaces/create-invoice-request.interface.js';
import type { InvoiceResponse } from '../interfaces/invoice-response.interface.js';
import { validateApiBaseUrl } from '../validators/api-config.validator.js';
import { validateHttpResponse } from '../validators/http-response.validator.js';

export async function createInvoice(
  token: string,
  payload: CreateInvoiceRequest,
): Promise<InvoiceResponse> {
  const baseUrl = process.env.API_BASE_URL;

  validateApiBaseUrl(baseUrl);

  const response = await fetch(`${baseUrl}/invoices`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  validateHttpResponse(response, 'No se pudo crear la factura');

  const data: InvoiceResponse = await response.json();

  return data;
}