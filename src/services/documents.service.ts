import { listDocuments } from '../api/documents.js';
import type { Document } from '../interfaces/document.interface.js';

export async function getAllDocuments(
  token: string,
): Promise<Document[]> {
  const documents: Document[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const response = await listDocuments(token, page);

    documents.push(...response.documents);
    totalPages = response.pagination.totalPages;
    page++;
  } while (page <= totalPages);

  return documents;
}