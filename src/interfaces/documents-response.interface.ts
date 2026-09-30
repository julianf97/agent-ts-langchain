import type { ApiContext } from './api-context.interface.js';
import type { Document } from './document.interface.js';
import type { Pagination } from './pagination.interface.js';

export interface DocumentsResponse {
  documents: Document[];
  pagination: Pagination;
  context: ApiContext;
}