import type { DocumentsResponse } from '../interfaces/documents-response.interface.js';
import { validateApiBaseUrl } from '../validators/api-config.validator.js';
import { validateHttpResponse } from '../validators/http-response.validator.js';

export async function listDocuments(
  token: string,
  page: number = 1,
): Promise<DocumentsResponse> {
  const baseUrl = process.env.API_BASE_URL;

  validateApiBaseUrl(baseUrl);

  const response = await fetch(
    `${baseUrl}/documents?page=${page}&limit=100`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  validateHttpResponse(response, 'No se pudieron consultar documentos');

  const data: DocumentsResponse = await response.json();

  return data;
}