import type { DocumentsResponse } from '../interfaces/documents-response.interface.js';

export async function listDocuments(
  token: string,
  page: number = 1,
): Promise<DocumentsResponse> {
  const baseUrl = process.env.API_BASE_URL;

  if (!baseUrl) {
    throw new Error('Falta configurar API_BASE_URL en .env');
  }

  const response = await fetch(
    `${baseUrl}/documents?page=${page}&limit=100`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `No se pudieron consultar documentos: HTTP ${response.status}`,
    );
  }

  const data: DocumentsResponse = await response.json();

  return data;
}